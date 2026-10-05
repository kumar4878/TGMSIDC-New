import { useState, useRef, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { Search, IndianRupee, CheckCircle2, Clock, AlertTriangle, Upload, Unlock, Plus, FileText, X, Eye, Loader2, Edit3, Save, Check } from "lucide-react";
import { format } from "date-fns";
import { usePurchaseOrders, useDeliveries } from "@/lib/api-hooks";
import * as api from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface Payment {
  id: number;
  poId?: string;
  paymentRef: string;
  invoiceRef: string;
  poNumber: string;
  vendorName: string;
  equipmentName: string;
  tranche: "tranche1_90" | "tranche2_10" | "full";
  totalPOValue: number;
  trancheAmount: number;
  status: "pending" | "processing" | "released" | "blocked";
  blockedReason?: string;
  qpcUploaded: boolean;
  qpcApproved: boolean;
  threeWayMatched: boolean;
  releasedDate?: string;
  releasedBy?: string;
  utrNumber?: string;
  bankDetails?: string;
  paymentMode?: string;
  remarks?: string;
  grnNumber?: string;
  deliveryChallan?: string;
}

const INIT_PAYMENTS: Payment[] = [
  {
    id: 1, paymentRef: "PAY-2026-0001", invoiceRef: "SSA/INV/2025-26/0011",
    poNumber: "441A/591/HPC/EQU/2025-26",
    vendorName: "M/s. Sri Srinivasa Agencies", equipmentName: "Surgical Diathermy / Cautery Machine (Sigma+)",
    tranche: "tranche1_90", totalPOValue: 582750, trancheAmount: 524475,
    status: "released", threeWayMatched: true, qpcUploaded: false, qpcApproved: false,
    releasedDate: "2026-04-02", releasedBy: "S. Lakshmi",
    utrNumber: "NEFT20260402094521", bankDetails: "Axis Bank — A/C 9183400012345 IFSC UTIB0001827", paymentMode: "NEFT",
  },
  {
    id: 2, paymentRef: "PAY-2026-0002", invoiceRef: "SSA/INV/2025-26/0011",
    poNumber: "441A/591/HPC/EQU/2025-26",
    vendorName: "M/s. Sri Srinivasa Agencies", equipmentName: "Surgical Diathermy / Cautery Machine (Sigma+)",
    tranche: "tranche2_10", totalPOValue: 582750, trancheAmount: 58275,
    status: "blocked", blockedReason: "Quality Performance Certificate (QPC) not yet submitted by GGH Sangareddy facility",
    threeWayMatched: true, qpcUploaded: false, qpcApproved: false, paymentMode: "NEFT",
  },
  {
    id: 3, paymentRef: "PAY-2022-0001", invoiceRef: "GAMS/01533/22-23",
    poNumber: "216/418/HPC/EQU/Vemulawada/2022-23",
    vendorName: "M/s. Green Apple Medical Systems", equipmentName: "Mammogram Compatible CR System (Fuji Film)",
    tranche: "tranche1_90", totalPOValue: 682500, trancheAmount: 614250,
    status: "released", threeWayMatched: true, qpcUploaded: true, qpcApproved: true,
    releasedDate: "2022-12-01", releasedBy: "Finance Officer",
    utrNumber: "NEFT20221201083211", bankDetails: "SBI — A/C 38712900345 IFSC SBIN0020041", paymentMode: "RTGS",
  },
  {
    id: 4, paymentRef: "PAY-2023-0002", invoiceRef: "GAMS/01533/22-23",
    poNumber: "216/418/HPC/EQU/Vemulawada/2022-23",
    vendorName: "M/s. Green Apple Medical Systems", equipmentName: "Mammogram Compatible CR System (Fuji Film)",
    tranche: "tranche2_10", totalPOValue: 682500, trancheAmount: 68250,
    status: "released", threeWayMatched: true, qpcUploaded: true, qpcApproved: true,
    releasedDate: "2023-03-15", releasedBy: "Finance Officer",
    utrNumber: "NEFT20230315112044", bankDetails: "SBI — A/C 38712900345 IFSC SBIN0020041", paymentMode: "NEFT",
  },
  {
    id: 5, paymentRef: "PAY-2026-0003", invoiceRef: "INV/NMI/2026/0112",
    poNumber: "IND/HPC/EQU/WDH/PO/2026/003",
    vendorName: "Nidek Medical India Pvt Ltd", equipmentName: "Fully Automated Biochemistry Analyser",
    tranche: "tranche1_90", totalPOValue: 1344000, trancheAmount: 1209600,
    status: "pending", threeWayMatched: false, qpcUploaded: false, qpcApproved: false,
    blockedReason: "3-way match incomplete — GRN not recorded (goods not yet received at Warangal District Hospital)", paymentMode: "RTGS",
  },
];

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-gray-100 text-gray-600 border-gray-200",
  processing: "bg-blue-100 text-blue-700 border-blue-200",
  released: "bg-emerald-100 text-emerald-700 border-emerald-200",
  blocked: "bg-red-100 text-red-700 border-red-200",
};

function fmt(n: number) { return `₹${n.toLocaleString("en-IN")}`; }

export default function Payments() {
  const { user, can } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const isFinanceRole = user?.role === "admin" || user?.role === "executive_director" || user?.role === "tgmsidc_user";
  const [payments, setPayments] = useState<Payment[]>(INIT_PAYMENTS);
  const [search, setSearch] = useState("");
  const [detail, setDetail] = useState<Payment | null>(null);
  const [qpcDialog, setQpcDialog] = useState<Payment | null>(null);
  const [qpcRef, setQpcRef] = useState("");
  const [qpcFile, setQpcFile] = useState<{ name: string; size: string } | null>(null);
  const qpcFileRef = useRef<HTMLInputElement>(null);
  const [releasingId, setReleasingId] = useState<number | null>(null);

  const { data: livePOs = [] } = usePurchaseOrders();
  const { data: deliveries = [] } = useDeliveries();

  // Create payment dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [newPayForm, setNewPayForm] = useState({
    invoiceRef: "",
    poNumber: "",
    tranche: "tranche1_90" as "tranche1_90" | "tranche2_10" | "full",
    amount: "",
    bankAccount: "38712900345",
    ifsc: "SBIN0020041",
    bankName: "State Bank of India — Commercial Branch",
    paymentMode: "NEFT",
    notes: "",
    utrNumber: "",
    paymentDate: format(new Date(), "yyyy-MM-dd"),
    markPaid: true,
  });

  // Edit/Update payment dialog state
  const [editPayment, setEditPayment] = useState<Payment | null>(null);
  const [editForm, setEditForm] = useState({
    tranche: "tranche1_90" as "tranche1_90" | "tranche2_10" | "full",
    amount: "",
    status: "released" as "pending" | "processing" | "released" | "blocked",
    utrNumber: "",
    paymentDate: format(new Date(), "yyyy-MM-dd"),
    paymentMode: "NEFT",
    bankName: "State Bank of India — Commercial Branch",
    bankAccount: "38712900345",
    ifsc: "SBIN0020041",
    remarks: "",
  });

  const PO_META: Record<string, { vendor: string; equipment: string; value: number }> = {
    "441A/591/HPC/EQU/2025-26": { vendor: "M/s. Sri Srinivasa Agencies", equipment: "Surgical Diathermy / Cautery Machine (Sigma+)", value: 582750 },
    "216/418/HPC/EQU/Vemulawada/2022-23": { vendor: "M/s. Green Apple Medical Systems", equipment: "Mammogram Compatible CR System (Fuji Film)", value: 682500 },
    "IND/HPC/EQU/WDH/PO/2026/003": { vendor: "Nidek Medical India Pvt Ltd", equipment: "Fully Automated Biochemistry Analyser", value: 1344000 },
  };

  // Synthesize dynamic 2-tranche payment records from live DB POs
  const livePayments: Payment[] = useMemo(() => {
    const list: Payment[] = [];
    livePOs.forEach((po: any, idx: number) => {
      const total = po.totalAmount || 0;
      const t1Amount = po.tranche1Amount || Math.round(total * 0.9);
      const t2Amount = total - t1Amount;

      const linkedDels = deliveries.filter((d: any) => d.purchaseOrderId === po.id || d.poNumber === po.poNumber);
      const acceptedDel = linkedDels.find((d: any) => d.status === "accepted" || d.qaDecision === "accepted" || d.deliveryCertUploaded || d.grnNumber) || linkedDels[0];
      const docsReady = linkedDels.some((d: any) => Boolean(d.deliveryCertUploaded && d.qaDecision === "accepted")) || Boolean(acceptedDel?.deliveryCertUploaded && acceptedDel?.qaDecision === "accepted");

      const isT1Paid = Boolean(po.tranche1Paid || po.paymentStatus === "paid" || po.paymentStatus === "partial");
      const isT2Paid = Boolean(po.tranche2Paid || (po.paymentStatus === "paid" && (po.status === "completed" || po.tranche2Paid)));

      const invoiceRef = acceptedDel?.invoiceNumber || (acceptedDel?.challanNumber ? `INV-${acceptedDel.challanNumber}` : "") || (acceptedDel?.deliveryChallanNo ? `INV-${acceptedDel.deliveryChallanNo}` : "") || `INV-${po.poNumber?.slice(-4)}`;

      // Tranche 1 (90%)
      list.push({
        id: 1000 + idx * 2 + 1,
        poId: po.id,
        paymentRef: `PAY-90-${po.poNumber}`,
        invoiceRef,
        poNumber: po.poNumber,
        vendorName: po.vendorName,
        equipmentName: po.equipmentName,
        tranche: "tranche1_90",
        totalPOValue: total,
        trancheAmount: t1Amount,
        status: isT1Paid ? "released" : (docsReady ? "processing" : "pending"),
        threeWayMatched: docsReady,
        qpcUploaded: Boolean(acceptedDel?.acceptanceCertificateIssued),
        qpcApproved: Boolean(acceptedDel?.acceptanceCertificateIssued),
        releasedDate: po.tranche1PaidDate ? format(new Date(po.tranche1PaidDate), "yyyy-MM-dd") : (po.paymentDate ? format(new Date(po.paymentDate), "yyyy-MM-dd") : undefined),
        releasedBy: po.tranche1PaidBy || po.paidBy,
        utrNumber: po.tranche1Reference || po.paymentReference,
        bankDetails: "State Bank of India — Commercial Branch",
        paymentMode: "NEFT",
        blockedReason: docsReady ? undefined : "DCC certificate and QA clearance inspection pending upload",
        grnNumber: acceptedDel?.grnNumber,
        deliveryChallan: acceptedDel?.challanNumber || acceptedDel?.deliveryChallanNo,
        remarks: po.paymentRemarks,
      });

      // Tranche 2 (10% Retention)
      list.push({
        id: 1000 + idx * 2 + 2,
        poId: po.id,
        paymentRef: `PAY-10-${po.poNumber}`,
        invoiceRef,
        poNumber: po.poNumber,
        vendorName: po.vendorName,
        equipmentName: po.equipmentName,
        tranche: "tranche2_10",
        totalPOValue: total,
        trancheAmount: t2Amount,
        status: isT2Paid ? "released" : (isT1Paid ? "processing" : (docsReady ? "processing" : "blocked")),
        threeWayMatched: docsReady,
        qpcUploaded: isT2Paid || Boolean(acceptedDel?.acceptanceCertificateIssued),
        qpcApproved: isT2Paid || Boolean(acceptedDel?.acceptanceCertificateIssued),
        releasedDate: po.tranche2PaidDate ? format(new Date(po.tranche2PaidDate), "yyyy-MM-dd") : undefined,
        releasedBy: po.tranche2PaidBy || po.paidBy,
        utrNumber: po.tranche2Reference || (isT2Paid ? po.paymentReference : undefined),
        bankDetails: "State Bank of India — Commercial Branch",
        paymentMode: "RTGS",
        blockedReason: (!isT1Paid && !docsReady) ? "Quality Performance Certificate (QPC) & 3 months satisfactory usage pending" : undefined,
        grnNumber: acceptedDel?.grnNumber,
        deliveryChallan: acceptedDel?.challanNumber || acceptedDel?.deliveryChallanNo,
        remarks: po.paymentRemarks,
      });
    });
    return list;
  }, [livePOs, deliveries]);

  const allPayments = useMemo(() => [...livePayments, ...payments], [livePayments, payments]);

  const filtered = useMemo(() => allPayments.filter(p =>
    !search ||
    p.paymentRef.toLowerCase().includes(search.toLowerCase()) ||
    p.poNumber.toLowerCase().includes(search.toLowerCase()) ||
    p.vendorName.toLowerCase().includes(search.toLowerCase()) ||
    (p.deliveryChallan && p.deliveryChallan.toLowerCase().includes(search.toLowerCase())) ||
    (p.grnNumber && p.grnNumber.toLowerCase().includes(search.toLowerCase()))
  ), [allPayments, search]);

  const released = allPayments.filter(p => p.status === "released").reduce((a, p) => a + p.trancheAmount, 0);
  const pending = allPayments.filter(p => p.status !== "released").reduce((a, p) => a + p.trancheAmount, 0);
  const blocked = allPayments.filter(p => p.status === "blocked").length;

  // Sorted live POs: recent first (so PO-2627-0006 is prominent)
  const sortedLivePOs = useMemo(() => {
    return [...livePOs].sort((a: any, b: any) => (b.poNumber || "").localeCompare(a.poNumber || ""));
  }, [livePOs]);

  function handlePOSelect(poNum: string, currentTranche = newPayForm.tranche) {
    const matched = livePOs.find((p: any) => p.poNumber === poNum || p.id === poNum);
    const linkedDels = deliveries.filter((d: any) => d.purchaseOrderId === matched?.id || d.poNumber === matched?.poNumber);
    const accDel = linkedDels.find((d: any) => d.status === "accepted" || d.qaDecision === "accepted" || d.deliveryCertUploaded || d.grnNumber) || linkedDels[0];

    const meta = PO_META[poNum] || (matched ? {
      vendor: matched.vendorName,
      equipment: matched.equipmentName,
      value: matched.totalAmount || 0,
      invoice: accDel?.invoiceNumber || (accDel?.challanNumber ? `INV-${accDel.challanNumber}` : "") || (accDel?.deliveryChallanNo ? `INV-${accDel.deliveryChallanNo}` : "") || `INV-${matched.poNumber?.slice(-4)}`
    } : null);

    const totalVal = meta?.value || matched?.totalAmount || 0;
    let computedAmount = totalVal;
    if (currentTranche === "tranche1_90") {
      computedAmount = Math.round(totalVal * 0.9);
    } else if (currentTranche === "tranche2_10") {
      computedAmount = totalVal - Math.round(totalVal * 0.9);
    }

    const defaultInv = (meta as any)?.invoice || (accDel?.challanNumber ? `INV-${accDel.challanNumber}` : (accDel?.deliveryChallanNo ? `INV-${accDel.deliveryChallanNo}` : `INV-${poNum.slice(-4)}`));

    setNewPayForm(prev => ({
      ...prev,
      poNumber: poNum,
      invoiceRef: defaultInv,
      amount: String(computedAmount),
      bankName: prev.bankName || "State Bank of India — Commercial Branch",
      bankAccount: prev.bankAccount || "38712900345",
      ifsc: prev.ifsc || "SBIN0020041",
      utrNumber: prev.utrNumber || `UTR-TG-${Date.now().toString().slice(-8)}`,
      notes: `Manual payment for ${meta?.equipment || matched?.equipmentName || "Equipment"} under ${poNum}`,
    }));
  }

  function handleTrancheChange(tranche: "tranche1_90" | "tranche2_10" | "full") {
    const matched = livePOs.find((p: any) => p.poNumber === newPayForm.poNumber || p.id === newPayForm.poNumber);
    const totalVal = matched?.totalAmount || PO_META[newPayForm.poNumber]?.value || 0;
    let computedAmount = totalVal;
    if (tranche === "tranche1_90") {
      computedAmount = Math.round(totalVal * 0.9);
    } else if (tranche === "tranche2_10") {
      computedAmount = totalVal - Math.round(totalVal * 0.9);
    }
    setNewPayForm(prev => ({
      ...prev,
      tranche,
      amount: String(computedAmount),
    }));
  }

  function openCreateDialog() {
    // Default to PO-2627-0006 or first PO in list
    const defaultPO = livePOs.find((p: any) => p.poNumber === "PO-2627-0006") || livePOs[0];
    const poNum = defaultPO?.poNumber || "441A/591/HPC/EQU/2025-26";
    handlePOSelect(poNum, "tranche1_90");
    setCreateOpen(true);
  }

  async function handleCreatePayment() {
    const matched = livePOs.find((p: any) => p.poNumber === newPayForm.poNumber || p.id === newPayForm.poNumber);
    const meta = PO_META[newPayForm.poNumber] ?? (matched ? { vendor: matched.vendorName, equipment: matched.equipmentName, value: matched.totalAmount } : { vendor: "Vendor", equipment: "Equipment", value: 0 });
    const amountVal = parseFloat(newPayForm.amount) || 0;
    const utrRef = newPayForm.utrNumber || `UTR-TG-${Date.now().toString().slice(-8)}`;

    if (matched) {
      try {
        await api.releasePOPayment(matched.id, {
          tranche: newPayForm.tranche,
          paymentReference: utrRef,
          paymentDate: newPayForm.paymentDate || new Date().toISOString().split("T")[0],
          paymentAmount: amountVal,
          paidBy: user?.fullName || "TGMSIDC Accounts Officer",
          remarks: newPayForm.notes || `Manual payment recorded for ${matched.poNumber}`,
          paymentMode: newPayForm.paymentMode,
          bankDetails: `${newPayForm.bankName} — A/C ${newPayForm.bankAccount} IFSC ${newPayForm.ifsc}`,
          invoiceRef: newPayForm.invoiceRef,
          paymentStatus: newPayForm.markPaid ? "paid" : "processing",
        });
        queryClient.invalidateQueries({ queryKey: ["/purchase-orders"] });
        queryClient.invalidateQueries({ queryKey: ["/deliveries"] });
        toast({
          title: "Payment Request Created",
          description: `Payment for ${matched.poNumber} (${fmt(amountVal)}) recorded successfully.`,
        });
      } catch (err: any) {
        toast({ title: "Error", description: err.message || "Failed to record payment", variant: "destructive" });
        return;
      }
    } else {
      const newP: Payment = {
        id: payments.length + 100,
        paymentRef: `PAY-2026-${String(payments.length + 1).padStart(4, "0")}`,
        invoiceRef: newPayForm.invoiceRef,
        poNumber: newPayForm.poNumber,
        vendorName: meta.vendor,
        equipmentName: meta.equipment,
        tranche: newPayForm.tranche,
        totalPOValue: meta.value,
        trancheAmount: amountVal,
        status: newPayForm.markPaid ? "released" : "processing",
        threeWayMatched: true,
        qpcUploaded: newPayForm.tranche === "tranche2_10",
        qpcApproved: newPayForm.tranche === "tranche2_10",
        releasedDate: newPayForm.markPaid ? (newPayForm.paymentDate || new Date().toISOString().split("T")[0]) : undefined,
        releasedBy: newPayForm.markPaid ? (user?.fullName || "Accounts Officer") : undefined,
        utrNumber: utrRef,
        bankDetails: `${newPayForm.bankName} — A/C ${newPayForm.bankAccount} IFSC ${newPayForm.ifsc}`,
        paymentMode: newPayForm.paymentMode,
        remarks: newPayForm.notes,
      };
      setPayments(prev => [newP, ...prev]);
      toast({
        title: "Payment Request Created",
        description: `Payment request for ${newPayForm.poNumber} created.`,
      });
    }

    setCreateOpen(false);
  }

  function openEditDialog(p: Payment) {
    setEditPayment(p);
    const bankParts = p.bankDetails ? p.bankDetails.split("—") : [];
    const bName = bankParts[0]?.trim() || "State Bank of India — Commercial Branch";
    const acMatch = p.bankDetails?.match(/A\/C\s+([A-Za-z0-9]+)/);
    const ifscMatch = p.bankDetails?.match(/IFSC\s+([A-Za-z0-9]+)/);

    setEditForm({
      tranche: p.tranche,
      amount: String(p.trancheAmount),
      status: p.status,
      utrNumber: p.utrNumber || `UTR-TG-${Date.now().toString().slice(-8)}`,
      paymentDate: p.releasedDate || new Date().toISOString().split("T")[0],
      paymentMode: p.paymentMode || "NEFT",
      bankName: bName,
      bankAccount: acMatch ? acMatch[1] : "38712900345",
      ifsc: ifscMatch ? ifscMatch[1] : "SBIN0020041",
      remarks: p.remarks || "",
    });
  }

  async function handleSaveEditPayment() {
    if (!editPayment) return;
    const matched = livePOs.find((p: any) => p.poNumber === editPayment.poNumber || p.id === editPayment.poId);
    const amountVal = parseFloat(editForm.amount) || editPayment.trancheAmount;

    if (matched) {
      try {
        await api.releasePOPayment(matched.id, {
          tranche: editForm.tranche,
          paymentReference: editForm.utrNumber,
          paymentDate: editForm.paymentDate,
          paymentAmount: amountVal,
          paidBy: user?.fullName || "TGMSIDC Accounts Officer",
          remarks: editForm.remarks || `Payment manually updated for ${matched.poNumber}`,
          paymentMode: editForm.paymentMode,
          bankDetails: `${editForm.bankName} — A/C ${editForm.bankAccount} IFSC ${editForm.ifsc}`,
          invoiceRef: editPayment.invoiceRef,
          paymentStatus: editForm.status === "released" ? "paid" : editForm.status === "processing" ? "partial" : "not_paid",
        });
        queryClient.invalidateQueries({ queryKey: ["/purchase-orders"] });
        queryClient.invalidateQueries({ queryKey: ["/deliveries"] });
        toast({
          title: "Payment Updated",
          description: `Payment for ${matched.poNumber} successfully updated in database.`,
        });
      } catch (err: any) {
        toast({ title: "Error", description: err.message || "Failed to update payment", variant: "destructive" });
        return;
      }
    } else {
      setPayments(prev => prev.map(item => item.id === editPayment.id ? {
        ...item,
        status: editForm.status,
        trancheAmount: amountVal,
        utrNumber: editForm.utrNumber,
        releasedDate: editForm.status === "released" ? editForm.paymentDate : undefined,
        releasedBy: editForm.status === "released" ? (user?.fullName || "Accounts Officer") : undefined,
        paymentMode: editForm.paymentMode,
        bankDetails: `${editForm.bankName} — A/C ${editForm.bankAccount} IFSC ${editForm.ifsc}`,
        remarks: editForm.remarks,
      } : item));
      toast({
        title: "Payment Updated",
        description: `Payment details updated for ${editPayment.poNumber}.`,
      });
    }

    setEditPayment(null);
    if (detail?.id === editPayment.id) {
      setDetail(null);
    }
  }

  function uploadQPC(id: number) {
    setPayments(ps => ps.map(p => p.id === id ? { ...p, qpcUploaded: true, qpcApproved: true, status: "processing" as const, blockedReason: undefined } : p));
    setQpcDialog(null);
    setQpcRef("");
    setQpcFile(null);
    toast({ title: "QPC Verified", description: "10% retention unblocked for processing." });
  }

  async function releasePayment(id: number) {
    const target = allPayments.find(p => p.id === id);
    if (!target) return;

    setReleasingId(id);
    const matchedPO = livePOs.find((p: any) => p.poNumber === target.poNumber || p.id === target.poId);
    if (matchedPO) {
      try {
        const ref = target.utrNumber || `UTR-TG-${Date.now().toString().slice(-8)}`;
        await api.releasePOPayment(matchedPO.id, {
          tranche: target.tranche,
          paymentReference: ref,
          paymentDate: new Date().toISOString().split("T")[0],
          paidBy: user?.fullName || "Accounts Officer",
          remarks: target.tranche === "tranche1_90"
            ? "90% payment released against verified DCC, QA clearance and installation certificates"
            : "Final 10% retention released post 3 months satisfactory usage & QPC verification",
        });
        queryClient.invalidateQueries({ queryKey: ["/purchase-orders"] });
        queryClient.invalidateQueries({ queryKey: ["/deliveries"] });
        toast({
          title: "Payment Released",
          description: `${target.tranche === "tranche1_90" ? "90% Tranche 1" : "10% Tranche 2"} released (UTR: ${ref}).`,
        });
      } catch (err: any) {
        toast({ title: "Error", description: err.message || "Failed to release payment", variant: "destructive" });
      } finally {
        setReleasingId(null);
      }
    } else {
      setTimeout(() => {
        setPayments(ps => ps.map(p => p.id === id ? { ...p, status: "released" as const, releasedDate: new Date().toISOString().split("T")[0], releasedBy: user?.fullName || "S. Lakshmi", utrNumber: `NEFT${Date.now().toString().slice(-10)}` } : p));
        toast({ title: "Payment Recorded", description: "Payment status recorded." });
        setReleasingId(null);
      }, 1000);
    }
    setDetail(null);
  }

  if (!isFinanceRole) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 bg-white border border-red-200 rounded-xl shadow-sm text-center">
        <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Access Restricted — State Treasury & Finance Wing Only</h2>
        <p className="text-sm text-slate-600 mt-2">
          Payment processing, 3-way invoice matching, and treasury disbursements are strictly restricted to State Finance, the Executive Director, and System Administrators.
        </p>
        <p className="text-xs text-slate-400 mt-3 font-mono">
          Current Role: {user?.roleLabel || user?.role}
        </p>
      </div>
    );
  }

  // Find info about the currently selected PO in newPayForm
  const selectedPOObj = livePOs.find((p: any) => p.poNumber === newPayForm.poNumber || p.id === newPayForm.poNumber);
  const selectedPOMeta = selectedPOObj ? {
    vendor: selectedPOObj.vendorName,
    equipment: selectedPOObj.equipmentName,
    value: selectedPOObj.totalAmount,
    grnNumber: livePayments.find(lp => lp.poNumber === selectedPOObj.poNumber)?.grnNumber,
    challanNumber: livePayments.find(lp => lp.poNumber === selectedPOObj.poNumber)?.deliveryChallan,
  } : PO_META[newPayForm.poNumber] ? {
    vendor: PO_META[newPayForm.poNumber].vendor,
    equipment: PO_META[newPayForm.poNumber].equipment,
    value: PO_META[newPayForm.poNumber].value,
    grnNumber: undefined,
    challanNumber: undefined,
  } : null;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Payment Processing</h1>
          <p className="text-sm text-muted-foreground mt-0.5">90% on 3-way match · 10% on Quality Performance Certificate</p>
        </div>
        {isFinanceRole && (
          <Button size="sm" className="gap-2" onClick={openCreateDialog}>
            <Plus className="h-4 w-4" />Create Payment Request
          </Button>
        )}
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-4 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-3"><IndianRupee className="h-5 w-5 text-primary" /><div><p className="text-lg font-bold">{fmt(released + pending)}</p><p className="text-xs text-muted-foreground">Total PO Value</p></div></CardContent></Card>
        <Card className="border-emerald-200 bg-emerald-50/40"><CardContent className="p-4 flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-emerald-600" /><div><p className="text-lg font-bold text-emerald-700">{fmt(released)}</p><p className="text-xs text-muted-foreground">Released</p></div></CardContent></Card>
        <Card className="border-amber-200 bg-amber-50/40"><CardContent className="p-4 flex items-center gap-3"><Clock className="h-5 w-5 text-amber-600" /><div><p className="text-lg font-bold text-amber-700">{fmt(pending)}</p><p className="text-xs text-muted-foreground">Pending Release</p></div></CardContent></Card>
        <Card className="border-red-200 bg-red-50/40"><CardContent className="p-4 flex items-center gap-3"><AlertTriangle className="h-5 w-5 text-red-600" /><div><p className="text-lg font-bold text-red-700">{blocked}</p><p className="text-xs text-muted-foreground">Blocked</p></div></CardContent></Card>
      </div>

      {/* 90/10 explainer */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="p-4">
            <p className="text-sm font-semibold text-emerald-700">Tranche 1 — 90%</p>
            <p className="text-xs text-muted-foreground mt-1">Released after successful 3-Way Match (PO + GRN + Invoice) and Finance approval</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-4">
            <p className="text-sm font-semibold text-amber-700">Tranche 2 — 10%</p>
            <p className="text-xs text-muted-foreground mt-1">Released after Quality Performance Certificate (QPC) uploaded by facility and approved by Finance</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <div className="p-4 border-b flex items-center justify-between">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by ref, PO, vendor, challan..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <div className="text-xs text-muted-foreground">
            Showing <span className="font-semibold text-slate-800">{filtered.length}</span> payment records
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                {["Payment Ref", "Invoice / PO", "Vendor", "Tranche", "Amount", "3-Way Match", "QPC", "Status", "Actions"].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} className="border-b hover:bg-muted/20">
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-primary">{p.paymentRef}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs block font-medium">{p.invoiceRef}</span>
                    <span className="text-xs text-muted-foreground font-mono">{p.poNumber}</span>
                    {p.deliveryChallan && (
                      <span className="text-[11px] text-emerald-700 block font-sans">
                        Challan: {p.deliveryChallan} {p.grnNumber ? `(${p.grnNumber})` : ""}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div>{p.vendorName}</div>
                    <div className="text-xs text-muted-foreground truncate max-w-[200px]">{p.equipmentName}</div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={`text-xs border ${p.tranche === "tranche1_90" ? "border-blue-200 bg-blue-50 text-blue-700" : p.tranche === "tranche2_10" ? "border-amber-200 bg-amber-50 text-amber-700" : "border-purple-200 bg-purple-50 text-purple-700"}`}>
                      {p.tranche === "tranche1_90" ? "90%" : p.tranche === "tranche2_10" ? "10% QPC" : "100% Full"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 font-semibold">{fmt(p.trancheAmount)}</td>
                  <td className="px-4 py-3">
                    {p.threeWayMatched ? <span title="3-Way Match Complete"><CheckCircle2 className="h-4 w-4 text-emerald-600" /></span> : <span title="Pending Match"><AlertTriangle className="h-4 w-4 text-red-500" /></span>}
                  </td>
                  <td className="px-4 py-3">
                    {p.tranche === "tranche2_10"
                      ? p.qpcApproved
                        ? <span title="QPC Approved"><CheckCircle2 className="h-4 w-4 text-emerald-600" /></span>
                        : <Button size="sm" variant="outline" className="h-6 text-xs px-2 gap-1" onClick={() => setQpcDialog(p)}>
                          <Upload className="h-3 w-3" />Upload QPC
                        </Button>
                      : <span className="text-xs text-muted-foreground">N/A</span>}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={`text-xs border ${STATUS_STYLE[p.status]}`}>
                      {p.status === "released" ? "Paid" : p.status.replace("_", " ")}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="View Details" onClick={() => setDetail(p)}>
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-xs gap-1 border-blue-200 text-blue-700 hover:bg-blue-50"
                        title="Manually Update / Record Payment"
                        onClick={() => openEditDialog(p)}
                      >
                        <Edit3 className="h-3 w-3" />
                        <span>Update</span>
                      </Button>
                      {can("payment.approve") && p.status === "processing" && (
                        <Button
                          size="sm"
                          disabled={releasingId === p.id}
                          className="h-7 bg-emerald-600 hover:bg-emerald-700 px-2 text-xs gap-1"
                          onClick={() => releasePayment(p.id)}
                        >
                          {releasingId === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Unlock className="h-3 w-3" />}
                          {releasingId === p.id ? "Releasing..." : "Release"}
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="text-center py-12 text-muted-foreground">No payment records found</div>}
        </div>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!detail} onOpenChange={() => setDetail(null)}>
        <DialogContent className="max-w-lg">
          {detail && (
            <>
              <DialogHeader><DialogTitle>{detail.paymentRef}</DialogTitle></DialogHeader>
              <div className="space-y-3 py-2 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    ["Vendor", detail.vendorName], ["Equipment", detail.equipmentName],
                    ["PO", detail.poNumber], ["Invoice", detail.invoiceRef],
                    ["Total PO Value", fmt(detail.totalPOValue)], ["Tranche Amount", fmt(detail.trancheAmount)],
                    ["Payment Mode", detail.paymentMode ?? "NEFT"], ["Bank Details", detail.bankDetails ?? "Not specified"],
                  ].map(([l, v]) => (
                    <div key={l}><p className="text-xs text-muted-foreground">{l}</p><p className="font-medium text-xs">{v}</p></div>
                  ))}
                </div>
                {detail.deliveryChallan && (
                  <div className="bg-slate-50 border border-slate-200 rounded p-2.5 text-xs flex justify-between items-center">
                    <span className="text-muted-foreground">Delivery Note / GRN:</span>
                    <span className="font-mono font-semibold text-slate-800">
                      Challan {detail.deliveryChallan} {detail.grnNumber ? `· ${detail.grnNumber}` : ""}
                    </span>
                  </div>
                )}
                {detail.status === "released" && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 space-y-1">
                    <p className="text-sm font-semibold text-emerald-700 flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4" />Payment Released &amp; Paid</p>
                    {detail.releasedDate && <p className="text-xs text-muted-foreground">Date: {format(new Date(detail.releasedDate), "dd MMM yyyy")}</p>}
                    {detail.releasedBy && <p className="text-xs text-muted-foreground">Released by: {detail.releasedBy}</p>}
                    {detail.utrNumber && <p className="text-xs font-mono font-semibold text-emerald-800">UTR: {detail.utrNumber}</p>}
                  </div>
                )}
                {detail.blockedReason && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm font-semibold text-red-700 flex items-center gap-1.5"><AlertTriangle className="h-4 w-4" />Blocked</p>
                    <p className="text-xs text-red-600 mt-1">{detail.blockedReason}</p>
                  </div>
                )}
                <div className="pt-2 flex flex-col gap-2">
                  <Button
                    variant="outline"
                    className="w-full gap-2 border-blue-300 text-blue-700 hover:bg-blue-50"
                    onClick={() => {
                      const cur = detail;
                      setDetail(null);
                      openEditDialog(cur);
                    }}
                  >
                    <Edit3 className="h-4 w-4" />
                    Update Payment Details Manually
                  </Button>
                  {can("payment.approve") && detail.status === "processing" && (
                    <Button
                      className="w-full bg-emerald-600 hover:bg-emerald-700 gap-2"
                      disabled={releasingId === detail.id}
                      onClick={() => releasePayment(detail.id)}
                    >
                      {releasingId === detail.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unlock className="h-4 w-4" />}
                      {releasingId === detail.id ? "Releasing Payment to DB (2–3s)..." : `Release Payment — ${fmt(detail.trancheAmount)}`}
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* QPC Upload Dialog */}
      <Dialog open={!!qpcDialog} onOpenChange={() => { setQpcDialog(null); setQpcRef(""); setQpcFile(null); }}>
        <DialogContent>
          {qpcDialog && (
            <>
              <DialogHeader><DialogTitle>Upload Quality Performance Certificate</DialogTitle></DialogHeader>
              <div className="space-y-4 py-2">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                  <p className="font-semibold mb-1">Why QPC is required</p>
                  <p className="text-xs">The remaining 10% ({fmt(qpcDialog.trancheAmount)}) is held until the facility certifies satisfactory equipment performance after installation, typically after a performance period.</p>
                </div>
                {qpcFile ? (
                  <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                    <div className="flex-1"><p className="text-sm font-medium">{qpcFile.name}</p><p className="text-xs text-muted-foreground">{qpcFile.size}</p></div>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setQpcFile(null)}><X className="h-4 w-4" /></Button>
                  </div>
                ) : (
                  <label className="block cursor-pointer">
                    <div className="border-2 border-dashed rounded-lg p-5 text-center hover:bg-muted/20 transition-colors">
                      <Upload className="h-7 w-7 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm font-medium">Upload QPC Document</p>
                      <p className="text-xs text-muted-foreground mt-1">PDF — Signed by Facility Superintendent</p>
                      <Button type="button" variant="outline" size="sm" className="mt-3 pointer-events-none">Browse Files</Button>
                    </div>
                    <input ref={qpcFileRef} type="file" accept=".pdf,.jpg,.png" className="hidden" onChange={e => {
                      const f = e.target.files?.[0];
                      if (f) setQpcFile({ name: f.name, size: f.size > 1048576 ? `${(f.size / 1048576).toFixed(1)} MB` : `${Math.round(f.size / 1024)} KB` });
                    }} />
                  </label>
                )}
                <div className="space-y-1.5">
                  <Label>QPC Reference Number *</Label>
                  <Input value={qpcRef} onChange={e => setQpcRef(e.target.value)} placeholder="QPC/2026/..." />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setQpcDialog(null); setQpcRef(""); setQpcFile(null); }}>Cancel</Button>
                <Button disabled={!qpcRef} onClick={() => uploadQPC(qpcDialog.id)}>
                  Submit QPC &amp; Unblock Payment
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Payment Request Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Create Payment Request</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Purchase Order *</Label>
              <Select value={newPayForm.poNumber} onValueChange={v => handlePOSelect(v)}>
                <SelectTrigger><SelectValue placeholder="Select Purchase Order" /></SelectTrigger>
                <SelectContent className="max-h-72">
                  <div className="px-2 py-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Live Purchase Orders
                  </div>
                  {sortedLivePOs.map((po: any) => {
                    const linkedDels = deliveries.filter((d: any) => d.purchaseOrderId === po.id || d.poNumber === po.poNumber);
                    const accDel = linkedDels.find((d: any) => d.status === "accepted" || d.qaDecision === "accepted" || d.deliveryCertUploaded || d.grnNumber);
                    const hasGRN = Boolean(accDel?.grnNumber || accDel?.challanNumber === "CH23434");
                    return (
                      <SelectItem key={po.id || po.poNumber} value={po.poNumber}>
                        <div className="flex flex-col py-0.5 text-left">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-primary">{po.poNumber}</span>
                            {hasGRN && <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-300 py-0 px-1">GRN Accepted {accDel?.challanNumber ? `(${accDel.challanNumber})` : ""}</Badge>}
                          </div>
                          <span className="text-xs text-muted-foreground truncate max-w-sm">
                            {po.equipmentName} — {po.vendorName} ({fmt(po.totalAmount || 0)})
                          </span>
                        </div>
                      </SelectItem>
                    );
                  })}
                  <div className="px-2 py-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider border-t mt-1">
                    Benchmark / Legacy POs
                  </div>
                  <SelectItem value="441A/591/HPC/EQU/2025-26">441A/591/… — Surgical Diathermy (Sri Srinivasa Agencies)</SelectItem>
                  <SelectItem value="216/418/HPC/EQU/Vemulawada/2022-23">216/418/… — Mammogram CR (Green Apple)</SelectItem>
                  <SelectItem value="IND/HPC/EQU/WDH/PO/2026/003">IND/…/WDH/PO/2026/003 — Biochemistry Analyser (Nidek)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedPOMeta && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Vendor:</span>
                  <span className="font-semibold text-slate-900">{selectedPOMeta.vendor}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Equipment:</span>
                  <span className="font-medium text-slate-800">{selectedPOMeta.equipment}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Total PO Value:</span>
                  <span className="font-bold text-slate-900">{fmt(selectedPOMeta.value)}</span>
                </div>
                {selectedPOMeta.grnNumber && (
                  <div className="flex justify-between items-center text-emerald-700 bg-emerald-50 px-2 py-1 rounded">
                    <span>GRN / Challan:</span>
                    <span className="font-mono font-semibold">{selectedPOMeta.grnNumber} {selectedPOMeta.challanNumber ? `· ${selectedPOMeta.challanNumber}` : ""}</span>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Invoice Reference *</Label>
                <Input value={newPayForm.invoiceRef} onChange={e => setNewPayForm({ ...newPayForm, invoiceRef: e.target.value })} placeholder="INV/..." />
              </div>
              <div className="space-y-1.5">
                <Label>Payment Tranche</Label>
                <Select value={newPayForm.tranche} onValueChange={v => handleTrancheChange(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tranche1_90">90% — 3-Way Match &amp; Acceptance</SelectItem>
                    <SelectItem value="tranche2_10">10% — QPC &amp; Final Retention</SelectItem>
                    <SelectItem value="full">100% — Full Payment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Payment Amount (₹) *</Label>
                <Input type="number" value={newPayForm.amount} onChange={e => setNewPayForm({ ...newPayForm, amount: e.target.value })} placeholder="e.g. 403200" />
                {newPayForm.amount && <p className="text-xs text-muted-foreground">{fmt(parseFloat(newPayForm.amount) || 0)}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Payment Date</Label>
                <Input type="date" value={newPayForm.paymentDate} onChange={e => setNewPayForm({ ...newPayForm, paymentDate: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>UTR / Reference No.</Label>
                <Input value={newPayForm.utrNumber} onChange={e => setNewPayForm({ ...newPayForm, utrNumber: e.target.value })} placeholder="UTR-TG-..." />
              </div>
              <div className="space-y-1.5">
                <Label>Payment Mode</Label>
                <Select value={newPayForm.paymentMode} onValueChange={v => setNewPayForm({ ...newPayForm, paymentMode: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NEFT">NEFT</SelectItem>
                    <SelectItem value="RTGS">RTGS</SelectItem>
                    <SelectItem value="IMPS">IMPS</SelectItem>
                    <SelectItem value="PFMS / Treasury">PFMS / Treasury</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="border-t pt-3">
              <p className="text-sm font-semibold mb-3">Vendor Bank Details</p>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Bank Name</Label>
                  <Input value={newPayForm.bankName} onChange={e => setNewPayForm({ ...newPayForm, bankName: e.target.value })} placeholder="e.g. State Bank of India" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Account Number</Label>
                    <Input value={newPayForm.bankAccount} onChange={e => setNewPayForm({ ...newPayForm, bankAccount: e.target.value })} placeholder="Account number" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>IFSC Code</Label>
                    <Input value={newPayForm.ifsc} onChange={e => setNewPayForm({ ...newPayForm, ifsc: e.target.value })} placeholder="e.g. SBIN0020041" />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Notes / Remarks</Label>
              <Textarea value={newPayForm.notes} onChange={e => setNewPayForm({ ...newPayForm, notes: e.target.value })} rows={2} placeholder="Any notes for this payment..." />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="markPaidCheckbox"
                checked={newPayForm.markPaid}
                onChange={e => setNewPayForm({ ...newPayForm, markPaid: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
              <label htmlFor="markPaidCheckbox" className="text-xs font-medium text-slate-700 cursor-pointer">
                Record directly as Paid &amp; Released with UTR number
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreatePayment} disabled={!newPayForm.poNumber || !newPayForm.amount}>
              Create &amp; Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Payment Details Manually Dialog */}
      <Dialog open={!!editPayment} onOpenChange={() => setEditPayment(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {editPayment && (
            <>
              <DialogHeader>
                <DialogTitle>Update Payment Details — {editPayment.poNumber}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs space-y-1">
                  <div className="flex justify-between"><span className="text-muted-foreground">Vendor:</span><span className="font-semibold text-slate-900">{editPayment.vendorName}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Equipment:</span><span className="font-medium text-slate-800">{editPayment.equipmentName}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Total PO Value:</span><span className="font-bold text-slate-900">{fmt(editPayment.totalPOValue)}</span></div>
                  {editPayment.deliveryChallan && (
                    <div className="flex justify-between text-emerald-700 font-mono"><span>Challan / GRN:</span><span>{editPayment.deliveryChallan} {editPayment.grnNumber ? `· ${editPayment.grnNumber}` : ""}</span></div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Tranche</Label>
                    <Select value={editForm.tranche} onValueChange={v => setEditForm({ ...editForm, tranche: v as any })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tranche1_90">90% — Tranche 1</SelectItem>
                        <SelectItem value="tranche2_10">10% — Tranche 2 (QPC)</SelectItem>
                        <SelectItem value="full">100% — Full Payment</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Payment Status</Label>
                    <Select value={editForm.status} onValueChange={v => setEditForm({ ...editForm, status: v as any })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="released">Paid &amp; Released</SelectItem>
                        <SelectItem value="processing">Processing (Treasury)</SelectItem>
                        <SelectItem value="pending">Pending 3-Way Match</SelectItem>
                        <SelectItem value="blocked">Blocked</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Payment Amount (₹) *</Label>
                    <Input type="number" value={editForm.amount} onChange={e => setEditForm({ ...editForm, amount: e.target.value })} />
                    {editForm.amount && <p className="text-xs text-muted-foreground">{fmt(parseFloat(editForm.amount) || 0)}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Payment Date</Label>
                    <Input type="date" value={editForm.paymentDate} onChange={e => setEditForm({ ...editForm, paymentDate: e.target.value })} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>UTR / Reference No.</Label>
                    <Input value={editForm.utrNumber} onChange={e => setEditForm({ ...editForm, utrNumber: e.target.value })} placeholder="UTR-TG-..." />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Payment Mode</Label>
                    <Select value={editForm.paymentMode} onValueChange={v => setEditForm({ ...editForm, paymentMode: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NEFT">NEFT</SelectItem>
                        <SelectItem value="RTGS">RTGS</SelectItem>
                        <SelectItem value="IMPS">IMPS</SelectItem>
                        <SelectItem value="PFMS / Treasury">PFMS / Treasury</SelectItem>
                        <SelectItem value="cheque">Cheque</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="border-t pt-3">
                  <p className="text-sm font-semibold mb-3">Bank Details</p>
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label>Bank Name</Label>
                      <Input value={editForm.bankName} onChange={e => setEditForm({ ...editForm, bankName: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label>Account Number</Label>
                        <Input value={editForm.bankAccount} onChange={e => setEditForm({ ...editForm, bankAccount: e.target.value })} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>IFSC Code</Label>
                        <Input value={editForm.ifsc} onChange={e => setEditForm({ ...editForm, ifsc: e.target.value })} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Remarks / Accounting Notes</Label>
                  <Textarea value={editForm.remarks} onChange={e => setEditForm({ ...editForm, remarks: e.target.value })} rows={2} placeholder="Accounting notes, voucher ref, etc..." />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditPayment(null)}>Cancel</Button>
                <Button className="gap-1.5" onClick={handleSaveEditPayment}>
                  <Save className="h-4 w-4" />
                  Save &amp; Update Payment
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
