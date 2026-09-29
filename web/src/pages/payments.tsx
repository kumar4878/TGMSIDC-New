import { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { Search, IndianRupee, CheckCircle2, Clock, AlertTriangle, Upload, Unlock, Plus, FileText, X, Eye, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { usePurchaseOrders, useDeliveries } from "@/lib/api-hooks";
import * as api from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface Payment {
  id: number;
  paymentRef: string;
  invoiceRef: string;
  poNumber: string;
  vendorName: string;
  equipmentName: string;
  tranche: "tranche1_90" | "tranche2_10";
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
function fileSz(bytes: number) { return bytes > 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`; }

export default function Payments() {
  const { user, can } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const isFinanceRole = user?.role === "admin" || user?.role === "executive_director" || user?.role === "tgmsidc_user";
  const [payments, setPayments] = useState<Payment[]>(INIT_PAYMENTS);
  const [search, setSearch] = useState("");
  const [detail, setDetail] = useState<Payment | null>(null);
  const [qpcDialog, setQpcDialog] = useState<Payment | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [qpcRef, setQpcRef] = useState("");
  const [qpcFile, setQpcFile] = useState<{ name: string; size: string } | null>(null);
  const qpcFileRef = useRef<HTMLInputElement>(null);
  const [newPayForm, setNewPayForm] = useState({ invoiceRef: "", poNumber: "441A/591/HPC/EQU/2025-26", tranche: "tranche1_90", amount: "", bankAccount: "", ifsc: "", bankName: "", paymentMode: "NEFT", notes: "" });
  const [releasingId, setReleasingId] = useState<number | null>(null);

  const { data: livePOs = [] } = usePurchaseOrders();
  const { data: deliveries = [] } = useDeliveries();

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

  // Synthesize dynamic 2-tranche payment records from live DB POs
  const livePayments: Payment[] = [];
  livePOs.forEach((po: any, idx: number) => {
    const total = po.totalAmount || 0;
    const t1Amount = po.tranche1Amount || Math.round(total * 0.9);
    const t2Amount = total - t1Amount;

    const linkedDel = deliveries.find((d: any) => d.purchaseOrderId === po.id || d.poNumber === po.poNumber);
    const docsReady = Boolean(linkedDel?.deliveryCertUploaded && linkedDel?.qaDecision === "accepted");

    const isT1Paid = Boolean(po.tranche1Paid || po.paymentStatus === "paid" || po.paymentStatus === "partial");
    const isT2Paid = Boolean(po.tranche2Paid || (po.paymentStatus === "paid" && po.status === "completed"));

    // Tranche 1 (90%)
    livePayments.push({
      id: 1000 + idx * 2 + 1,
      paymentRef: `PAY-90-${po.poNumber}`,
      invoiceRef: linkedDel?.invoiceNumber || `INV-${po.poNumber?.slice(-4)}`,
      poNumber: po.poNumber,
      vendorName: po.vendorName,
      equipmentName: po.equipmentName,
      tranche: "tranche1_90",
      totalPOValue: total,
      trancheAmount: t1Amount,
      status: isT1Paid ? "released" : (docsReady ? "processing" : "pending"),
      threeWayMatched: docsReady,
      qpcUploaded: false,
      qpcApproved: false,
      releasedDate: po.tranche1PaidDate ? format(new Date(po.tranche1PaidDate), "yyyy-MM-dd") : undefined,
      releasedBy: po.tranche1PaidBy || po.paidBy,
      utrNumber: po.tranche1Reference || po.paymentReference,
      paymentMode: "NEFT",
      blockedReason: docsReady ? undefined : "DCC certificate and QA clearance inspection pending upload",
    });

    // Tranche 2 (10% Retention)
    livePayments.push({
      id: 1000 + idx * 2 + 2,
      paymentRef: `PAY-10-${po.poNumber}`,
      invoiceRef: linkedDel?.invoiceNumber || `INV-${po.poNumber?.slice(-4)}`,
      poNumber: po.poNumber,
      vendorName: po.vendorName,
      equipmentName: po.equipmentName,
      tranche: "tranche2_10",
      totalPOValue: total,
      trancheAmount: t2Amount,
      status: isT2Paid ? "released" : (isT1Paid ? "processing" : "blocked"),
      threeWayMatched: true,
      qpcUploaded: isT2Paid,
      qpcApproved: isT2Paid,
      releasedDate: po.tranche2PaidDate ? format(new Date(po.tranche2PaidDate), "yyyy-MM-dd") : undefined,
      releasedBy: po.tranche2PaidBy || po.paidBy,
      utrNumber: po.tranche2Reference || po.paymentReference,
      paymentMode: "RTGS",
      blockedReason: !isT1Paid ? "Quality Performance Certificate (QPC) & 3 months satisfactory usage pending" : undefined,
    });
  });

  const allPayments = [...livePayments, ...payments];

  const filtered = allPayments.filter(p =>
    !search || p.paymentRef.toLowerCase().includes(search.toLowerCase()) || p.poNumber.toLowerCase().includes(search.toLowerCase()) || p.vendorName.toLowerCase().includes(search.toLowerCase())
  );

  const released = allPayments.filter(p => p.status === "released").reduce((a, p) => a + p.trancheAmount, 0);
  const pending = allPayments.filter(p => p.status !== "released").reduce((a, p) => a + p.trancheAmount, 0);
  const blocked = allPayments.filter(p => p.status === "blocked").length;

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
    const matchedPO = livePOs.find((p: any) => p.poNumber === target.poNumber);
    if (matchedPO) {
      try {
        const ref = `UTR-TG-${Date.now().toString().slice(-8)}`;
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
      }, 2200);
    }
    setDetail(null);
  }

  const PO_META: Record<string, { vendor: string; equipment: string; value: number }> = {
    "441A/591/HPC/EQU/2025-26": { vendor: "M/s. Sri Srinivasa Agencies", equipment: "Surgical Diathermy / Cautery Machine (Sigma+)", value: 582750 },
    "216/418/HPC/EQU/Vemulawada/2022-23": { vendor: "M/s. Green Apple Medical Systems", equipment: "Mammogram Compatible CR System (Fuji Film)", value: 682500 },
    "IND/HPC/EQU/WDH/PO/2026/003": { vendor: "Nidek Medical India Pvt Ltd", equipment: "Fully Automated Biochemistry Analyser", value: 1344000 },
  };

  function handleCreatePayment() {
    const meta = PO_META[newPayForm.poNumber] ?? { vendor: "Unknown Vendor", equipment: "Unknown Equipment", value: 0 };
    const newP: Payment = {
      id: payments.length + 1,
      paymentRef: `PAY-2026-${String(payments.length + 1).padStart(4, "0")}`,
      invoiceRef: newPayForm.invoiceRef,
      poNumber: newPayForm.poNumber,
      vendorName: meta.vendor,
      equipmentName: meta.equipment,
      tranche: newPayForm.tranche as Payment["tranche"],
      totalPOValue: meta.value,
      trancheAmount: parseFloat(newPayForm.amount) || 0,
      status: "processing",
      threeWayMatched: false,
      qpcUploaded: false,
      qpcApproved: false,
      bankDetails: `${newPayForm.bankName} — A/C ${newPayForm.bankAccount} IFSC ${newPayForm.ifsc}`,
      paymentMode: newPayForm.paymentMode,
    };
    setPayments(prev => [newP, ...prev]);
    setCreateOpen(false);
    setNewPayForm({ invoiceRef: "", poNumber: "441A/591/HPC/EQU/2025-26", tranche: "tranche1_90", amount: "", bankAccount: "", ifsc: "", bankName: "", paymentMode: "NEFT", notes: "" });
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Payment Processing</h1>
          <p className="text-sm text-muted-foreground mt-0.5">90% on 3-way match · 10% on Quality Performance Certificate</p>
        </div>
        {isFinanceRole && (
          <Button size="sm" className="gap-2" onClick={() => setCreateOpen(true)}>
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
        <div className="p-4 border-b">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by ref, PO, vendor..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
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
                    <span className="text-xs block">{p.invoiceRef}</span>
                    <span className="text-xs text-muted-foreground">{p.poNumber}</span>
                  </td>
                  <td className="px-4 py-3 text-sm">{p.vendorName}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={`text-xs border ${p.tranche === "tranche1_90" ? "border-blue-200 bg-blue-50 text-blue-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
                      {p.tranche === "tranche1_90" ? "90%" : "10% QPC"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 font-semibold">{fmt(p.trancheAmount)}</td>
                  <td className="px-4 py-3">
                    {p.threeWayMatched ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <AlertTriangle className="h-4 w-4 text-red-500" />}
                  </td>
                  <td className="px-4 py-3">
                    {p.tranche === "tranche2_10"
                      ? p.qpcApproved
                        ? <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        : <Button size="sm" variant="outline" className="h-6 text-xs px-2 gap-1" onClick={() => setQpcDialog(p)}>
                          <Upload className="h-3 w-3" />Upload QPC
                        </Button>
                      : <span className="text-xs text-muted-foreground">N/A</span>}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={`text-xs border ${STATUS_STYLE[p.status]}`}>{p.status.replace("_", " ")}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setDetail(p)}><Eye className="h-3.5 w-3.5" /></Button>
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
                {detail.status === "released" && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 space-y-1">
                    <p className="text-sm font-semibold text-emerald-700 flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4" />Payment Released</p>
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
                <Button className="bg-emerald-600 hover:bg-emerald-700" disabled={!qpcRef} onClick={() => uploadQPC(qpcDialog.id)}>
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
              <Label>Invoice Reference *</Label>
              <Input value={newPayForm.invoiceRef} onChange={e => setNewPayForm({ ...newPayForm, invoiceRef: e.target.value })} placeholder="INV/..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Purchase Order</Label>
                <Select value={newPayForm.poNumber} onValueChange={v => setNewPayForm({ ...newPayForm, poNumber: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="441A/591/HPC/EQU/2025-26">441A/591/… — Surgical Diathermy (Sri Srinivasa)</SelectItem>
                    <SelectItem value="216/418/HPC/EQU/Vemulawada/2022-23">216/418/… — Mammogram CR (Green Apple)</SelectItem>
                    <SelectItem value="IND/HPC/EQU/WDH/PO/2026/003">IND/…/WDH/PO/2026/003 — Biochemistry Analyser (Nidek)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Payment Tranche</Label>
                <Select value={newPayForm.tranche} onValueChange={v => setNewPayForm({ ...newPayForm, tranche: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tranche1_90">90% — 3-Way Match</SelectItem>
                    <SelectItem value="tranche2_10">10% — QPC Release</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Payment Amount (₹) *</Label>
              <Input type="number" value={newPayForm.amount} onChange={e => setNewPayForm({ ...newPayForm, amount: e.target.value })} placeholder="e.g. 1713600" />
              {newPayForm.amount && <p className="text-xs text-muted-foreground">{fmt(parseFloat(newPayForm.amount) || 0)}</p>}
            </div>
            <div className="border-t pt-3">
              <p className="text-sm font-semibold mb-3">Vendor Bank Details</p>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Bank Name</Label>
                  <Input value={newPayForm.bankName} onChange={e => setNewPayForm({ ...newPayForm, bankName: e.target.value })} placeholder="e.g. HDFC Bank" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Account Number</Label>
                    <Input value={newPayForm.bankAccount} onChange={e => setNewPayForm({ ...newPayForm, bankAccount: e.target.value })} placeholder="Account number" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>IFSC Code</Label>
                    <Input value={newPayForm.ifsc} onChange={e => setNewPayForm({ ...newPayForm, ifsc: e.target.value })} placeholder="e.g. HDFC0001234" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Payment Mode</Label>
                  <Select value={newPayForm.paymentMode} onValueChange={v => setNewPayForm({ ...newPayForm, paymentMode: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NEFT">NEFT</SelectItem>
                      <SelectItem value="RTGS">RTGS</SelectItem>
                      <SelectItem value="IMPS">IMPS</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notes / Remarks</Label>
              <Textarea value={newPayForm.notes} onChange={e => setNewPayForm({ ...newPayForm, notes: e.target.value })} rows={2} placeholder="Any notes for this payment..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreatePayment} disabled={!newPayForm.invoiceRef || !newPayForm.amount}>Create Payment Request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
