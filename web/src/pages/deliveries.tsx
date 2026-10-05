import { useState, useRef } from "react";
import { Link } from "wouter";
import { useListDeliveries, getListDeliveriesQueryKey, useListPurchaseOrders, useCreateDelivery, type Delivery } from "@/lib/api-hooks";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/StatusBadge";
import { useToast } from "@/hooks/use-toast";
import {
  Search, Eye, QrCode, Plus, Upload, FileText, X,
  CheckCircle2, Truck, Package, AlertTriangle, Building2, Stamp,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

interface DocAttachment { name: string; size: string; docType: string; }

function fileSize(bytes: number): string {
  if (bytes > 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

const DOC_TYPES = [
  { key: "delivery_note", label: "Delivery Note / Challan (DC)", accept: ".pdf,.jpg,.png", hint: "Original Delivery Note from vendor e.g. SSA/0506/25-26" },
  { key: "invoice_copy", label: "Vendor Invoice Copy", accept: ".pdf", hint: "GST Invoice with HSN/SAC codes" },
  { key: "packing_list", label: "Packing List", accept: ".pdf,.xls,.xlsx", hint: "Item-wise packing list with serial/batch nos." },
  { key: "test_cert", label: "Test / Calibration Certificates", accept: ".pdf", hint: "Factory test reports and calibration certs" },
  { key: "warranty", label: "Warranty Card / Document", accept: ".pdf,.jpg,.png", hint: "Warranty card from manufacturer" },
  { key: "manufacturer_auth", label: "Manufacturer Authorisation (Annexure-5)", accept: ".pdf", hint: "Manufacturer authorisation as per TID Annexure-5a/5b" },
  { key: "photos", label: "Unboxing / Arrival Photos", accept: ".jpg,.jpeg,.png,.zip", hint: "Photos of equipment at time of delivery" },
];

export default function Deliveries() {
  const { user, can } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [logOpen, setLogOpen] = useState(false);
  const [detailDelivery, setDetailDelivery] = useState<Delivery | null>(null);

  const initialForm = {
    purchaseOrderId: "",
    quantity: "",
    deliveryNoteNo: "",
    deliveryNoteDate: new Date().toISOString().split("T")[0],
    buyersOrderNo: "",
    buyersOrderDate: "",
    dispatchDocNo: "",
    dispatchedThrough: "",
    destination: "",
    termsOfDelivery: "FOR Destination (Hospital Premises)",
    vehicleNumber: "",
    dispatchDate: new Date().toISOString().split("T")[0],
    hsnSacCode: "90189099",
    gstRate: "5",
    taxAmount: "NIL",
    receivedInGoodCondition: true,
    dispatchNotes: "",
    serialBatchNos: "",
    vendorGstin: "",
    consigneeAddress: "",
    buyerBillToAddress: "The Managing Director, HPC, Hyderabad, 2nd Floor, DM&HS Compound, Sultanbazar, Koti, HYDERABAD - 500095, GSTIN/UIN: 36AADAT9639G1Z2",
  };

  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [docs, setDocs] = useState<DocAttachment[]>([]);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const activeFilter = statusFilter !== "all" ? statusFilter : undefined;
  const { data: deliveries, isLoading } = useListDeliveries(
    activeFilter ? { status: activeFilter } : {},
    { query: { queryKey: getListDeliveriesQueryKey(activeFilter ? { status: activeFilter } : {}) } }
  );
  const { data: purchaseOrders } = useListPurchaseOrders({}, { query: { queryKey: ["purchase-orders"] } });
  const createDelivery = useCreateDelivery();

  const filtered = (deliveries ?? []).filter((d) =>
    !search ||
    d.qrCode?.toLowerCase().includes(search.toLowerCase()) ||
    d.poNumber?.toLowerCase().includes(search.toLowerCase()) ||
    d.facilityName?.toLowerCase().includes(search.toLowerCase()) ||
    d.equipmentName?.toLowerCase().includes(search.toLowerCase())
  );

  function handleFileUpload(files: FileList | null, docType: string) {
    if (!files) return;
    const newDocs: DocAttachment[] = Array.from(files).map(f => ({ name: f.name, size: fileSize(f.size), docType }));
    setDocs(prev => [...prev, ...newDocs]);
  }

  function handlePOSelect(poId: string) {
    const selectedPO = (purchaseOrders ?? []).find(
      p => String(p.id) === poId || String((p as any)._id) === poId || p.poNumber === poId
    );

    setForm(prev => ({
      ...prev,
      purchaseOrderId: poId,
      quantity: selectedPO?.quantity ? String(selectedPO.quantity) : (prev.quantity || "1"),
      buyersOrderNo: selectedPO?.poNumber || prev.buyersOrderNo,
      buyersOrderDate: selectedPO?.poDate ? String(selectedPO.poDate).split("T")[0] : (selectedPO?.createdAt ? String(selectedPO.createdAt).split("T")[0] : prev.buyersOrderDate),
      destination: selectedPO?.deliveryAddress || selectedPO?.consignees?.[0]?.institutionName || selectedPO?.facilityName || prev.destination,
      consigneeAddress: selectedPO?.deliveryAddress || selectedPO?.consignees?.[0]?.address || prev.consigneeAddress,
      vendorGstin: selectedPO?.vendorGstin || prev.vendorGstin,
      dispatchDate: prev.dispatchDate || new Date().toISOString().split("T")[0],
      deliveryNoteDate: prev.deliveryNoteDate || new Date().toISOString().split("T")[0],
    }));

    setErrors(prev => {
      const updated = { ...prev };
      delete updated.purchaseOrderId;
      if (selectedPO?.quantity) delete updated.quantity;
      if (selectedPO?.deliveryAddress || selectedPO?.facilityName) delete updated.destination;
      return updated;
    });
  }

  function validateForm() {
    const errs: Record<string, string> = {};

    if (!form.purchaseOrderId) {
      errs.purchaseOrderId = "Please select a Purchase Order";
    }
    if (!form.deliveryNoteNo.trim()) {
      errs.deliveryNoteNo = "Delivery Note / Challan No. is required";
    }
    if (!form.deliveryNoteDate) {
      errs.deliveryNoteDate = "Delivery Note Date is required";
    }
    if (!form.dispatchDate) {
      errs.dispatchDate = "Dispatch Date is required";
    }
    if (!form.quantity || isNaN(Number(form.quantity)) || Number(form.quantity) <= 0) {
      errs.quantity = "Valid dispatch quantity (> 0) is required";
    }
    if (!form.destination.trim()) {
      errs.destination = "Destination / Consignee Hospital is required";
    }
    if (!form.dispatchedThrough.trim()) {
      errs.dispatchedThrough = "Dispatched Through (carrier/transporter) is required";
    }
    if (!form.vehicleNumber.trim()) {
      errs.vehicleNumber = "Vehicle or Tracking Number is required";
    }

    return errs;
  }

  function handleCreate() {
    const formErrors = validateForm();
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      toast({
        title: "Mandatory Fields Missing",
        description: "Please fill in all mandatory fields marked with an asterisk (*) to log delivery.",
        variant: "destructive",
      });
      return;
    }

    const selectedPO = (purchaseOrders ?? []).find(
      (po) => String(po.id) === form.purchaseOrderId || String((po as any)._id) === form.purchaseOrderId || po.poNumber === form.purchaseOrderId
    );

    const payload = {
      purchaseOrderId: form.purchaseOrderId,
      poNumber: form.buyersOrderNo || selectedPO?.poNumber || "",
      buyersOrderNo: form.buyersOrderNo || selectedPO?.poNumber || "",
      buyersOrderDate: form.buyersOrderDate || undefined,
      deliveryNoteNo: form.deliveryNoteNo.trim(),
      challanNumber: form.deliveryNoteNo.trim(),
      deliveryNoteDate: form.deliveryNoteDate || undefined,
      dispatchDocNo: form.dispatchDocNo.trim(),
      lrGrNumber: form.dispatchDocNo.trim(),
      dispatchedThrough: form.dispatchedThrough.trim(),
      transporterName: form.dispatchedThrough.trim(),
      vehicleNumber: form.vehicleNumber.trim(),
      transporterVehicle: form.vehicleNumber.trim(),
      destination: form.destination.trim(),
      facilityName: form.destination.trim() || selectedPO?.deliveryAddress || "Consignee Hospital",
      termsOfDelivery: form.termsOfDelivery.trim(),
      dispatchDate: form.dispatchDate ? new Date(form.dispatchDate) : new Date(),
      quantity: Number(form.quantity),
      orderedQty: selectedPO?.quantity ? Number(selectedPO.quantity) : Number(form.quantity),
      hsnSacCode: form.hsnSacCode.trim(),
      gstRate: form.gstRate,
      receivedInGoodCondition: form.receivedInGoodCondition,
      condition: form.receivedInGoodCondition ? "good" : "damaged",
      dispatchNotes: form.dispatchNotes.trim(),
      serialBatchNos: form.serialBatchNos.trim(),
      serialNumbers: form.serialBatchNos ? form.serialBatchNos.split(/[\n,;]+/).map((s) => s.trim()).filter(Boolean) : [],
      vendorGstin: form.vendorGstin.trim(),
      consigneeAddress: form.consigneeAddress.trim(),
      buyerBillToAddress: form.buyerBillToAddress.trim(),
      documentsUploaded: docs.length > 0,
      docs: docs,
      status: "dispatched",
    };

    createDelivery.mutate(
      { data: payload },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListDeliveriesQueryKey({}) });
          queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
          queryClient.invalidateQueries({ queryKey: ["/indents"] });
          toast({
            title: "Delivery Logged Successfully",
            description: `Delivery Note #${form.deliveryNoteNo} logged. Shipment is marked as Dispatched.`,
          });
          setLogOpen(false);
          resetForm();
          setDocs([]);
          setErrors({});
        },
        onError: (err: any) => {
          toast({
            title: "Failed to Log Delivery",
            description: err?.message || "An error occurred while logging delivery.",
            variant: "destructive",
          });
        },
      }
    );
  }

  function resetForm() {
    setForm(initialForm);
    setErrors({});
  }

  function qaColor(score: number | null | undefined) {
    if (score == null) return "text-muted-foreground";
    if (score >= 100) return "text-emerald-600 font-semibold";
    if (score >= 80) return "text-amber-600 font-semibold";
    return "text-red-600 font-semibold";
  }

  const pendingQA = (deliveries ?? []).filter(d => d.status === "qa_pending").length;
  const qaPassed = (deliveries ?? []).filter(d => d.status === "qa_passed" || d.status === "accepted").length;

  return (
    <div className="space-y-4">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#e4eaf2] pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#152340]">
              Deliveries & Quality Assurance
            </h1>
            <span className="neo-chip gry">Consignment Verification</span>
          </div>
          <p className="text-xs text-[#6b7a93] mt-0.5">
            Track consignments from dispatch through consignee receipt, batch testing, and acceptance certification
          </p>
        </div>
        {(user?.role === "vendor" || user?.role === "admin" || can("delivery.dispatch")) && (
          <Button
            size="sm"
            onClick={() => setLogOpen(true)}
            className="gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Log Delivery Dispatch</span>
          </Button>
        )}
      </div>

      {/* ── KPI Ribbon ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="neo-kpi-card">
          <span className="text-[10px] font-bold text-[#6b7a93] uppercase tracking-wider block">
            Total Shipments
          </span>
          <span className="text-2xl font-bold text-[#152340] tabular-nums mt-1 block">
            {(deliveries ?? []).length}
          </span>
          <span className="text-[10.5px] text-[#6b7a93] mt-1 block">All registered dispatches</span>
        </div>

        <div className="neo-kpi-card">
          <span className="text-[10px] font-bold text-[#e08a0b] uppercase tracking-wider block">
            QA Pending
          </span>
          <span className="text-2xl font-bold text-[#e08a0b] tabular-nums mt-1 block">
            {pendingQA}
          </span>
          <span className="text-[10.5px] text-[#e08a0b] font-semibold mt-1 block">Awaiting inspection</span>
        </div>

        <div className="neo-kpi-card">
          <span className="text-[10px] font-bold text-[#159557] uppercase tracking-wider block">
            QA Passed & Accepted
          </span>
          <span className="text-2xl font-bold text-[#159557] tabular-nums mt-1 block">
            {qaPassed}
          </span>
          <span className="text-[10.5px] text-[#159557] font-semibold mt-1 block">Ready for commissioning</span>
        </div>

        <div className="neo-kpi-card">
          <span className="text-[10px] font-bold text-[#2563eb] uppercase tracking-wider block">
            Acceptance Cert Issued
          </span>
          <span className="text-2xl font-bold text-[#2563eb] tabular-nums mt-1 block">
            {(deliveries ?? []).filter(d => d.acceptanceCertificateIssued).length}
          </span>
          <span className="text-[10.5px] text-[#2563eb] font-semibold mt-1 block">Statutory sign-off</span>
        </div>
      </div>

      {/* ── Table Card ── */}
      <div className="bg-white border border-[#e4eaf2] rounded-xl shadow-xs overflow-hidden">
        <div className="p-3 border-b border-[#e4eaf2] bg-[#f8fafc] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#93a2b8] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by Delivery Note, PO, facility, equipment..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-[32px] bg-white border border-[#e4eaf2] rounded-md text-xs text-[#152340] placeholder:text-[#93a2b8] pl-9 pr-3 focus:outline-none focus:border-[#2563eb]"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-44 h-[32px] text-xs bg-white border-[#e4eaf2] rounded-md">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="dispatched">Dispatched</SelectItem>
                <SelectItem value="in_transit">In Transit</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="qa_pending">QA Pending</SelectItem>
                <SelectItem value="qa_passed">QA Passed</SelectItem>
                <SelectItem value="qa_failed">QA Failed</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
              </SelectContent>
            </Select>

            <span className="text-xs font-medium text-[#6b7a93] ml-2">
              Showing <span className="font-bold text-[#152340]">{filtered.length}</span> of {(deliveries ?? []).length}
            </span>
          </div>
        </div>

        <div className="p-0">
          {isLoading ? (
            <div className="py-16 text-center">
              <div className="w-6 h-6 border-2 border-[#2563eb] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs text-[#6b7a93]">Loading deliveries…</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#e4eaf2] bg-[#f8fafc] text-[#6b7a93] font-bold uppercase tracking-wider text-[10.5px]">
                    <th className="py-2.5 px-3">Delivery Note No.</th>
                    <th className="py-2.5 px-3">PO (Buyer's Order) No.</th>
                    <th className="py-2.5 px-3">Equipment</th>
                    <th className="py-2.5 px-3">Consignee (Facility)</th>
                    <th className="py-2.5 px-3 text-center">Qty</th>
                    <th className="py-2.5 px-3">Dispatch Date</th>
                    <th className="py-2.5 px-3">QA Score</th>
                    <th className="py-2.5 px-3 text-center">Docs</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={10} className="px-4 py-12 text-center text-muted-foreground">No deliveries found</td></tr>
                  ) : filtered.map((d) => (
                    <tr key={d.id} className="border-b hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => setDetailDelivery(d as typeof detailDelivery)}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <QrCode className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="font-mono text-xs font-semibold text-amber-700">{d.qrCode}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-primary">{d.poNumber}</td>
                      <td className="px-4 py-3 text-xs max-w-[150px] truncate">{d.equipmentName}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{d.facilityName}</td>
                      <td className="px-4 py-3 text-xs font-semibold">{d.quantity} Nos.</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{d.dispatchDate ? format(new Date(d.dispatchDate), "dd MMM yyyy") : "—"}</td>
                      <td className={cn("px-4 py-3 text-xs", qaColor(d.qaComplianceScore))}>{d.qaComplianceScore != null ? `${d.qaComplianceScore}%` : "—"}</td>
                      <td className="px-4 py-3">
                        <span className={cn("text-xs font-medium", d.documentsUploaded ? "text-emerald-600" : "text-amber-600")}>
                          {d.documentsUploaded ? "✓ Uploaded" : "Pending"}
                        </span>
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={d.status} /></td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <Link href={`/deliveries/${d.id}`}>
                          <Button variant="ghost" size="icon" className="h-8 w-8"><Eye className="h-3.5 w-3.5" /></Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Delivery Detail Quick View */}
      <Dialog open={!!detailDelivery} onOpenChange={() => setDetailDelivery(null)}>
        <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto">
          {detailDelivery && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5 text-primary" />
                  Delivery Note: {detailDelivery.qrCode}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2 text-sm">
                {/* Delivery Note Header (mirrors real doc format) */}
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-muted/40 px-4 py-2 border-b flex items-center justify-between">
                    <span className="font-bold text-sm">DELIVERY NOTE</span>
                    <span className="text-xs text-muted-foreground">(Original for Consignee)</span>
                  </div>
                  <div className="p-3 grid grid-cols-2 gap-3 text-xs">
                    <div className="space-y-2">
                      <div>
                        <p className="text-muted-foreground">Delivery Note No.</p>
                        <p className="font-bold text-amber-700 font-mono">{detailDelivery.qrCode}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Buyer's Order No. (PO)</p>
                        <p className="font-semibold font-mono text-primary">{detailDelivery.poNumber}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Dispatched Through</p>
                        <p className="font-medium">{detailDelivery.qrCode?.includes("SSA") ? "Self / Company Vehicle" : "Company Vehicle"}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <p className="text-muted-foreground">Delivery Date</p>
                        <p className="font-semibold">{detailDelivery.deliveredDate ? format(new Date(detailDelivery.deliveredDate), "dd-MMM-yyyy") : "—"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Dispatch Date</p>
                        <p className="font-medium">{detailDelivery.dispatchDate ? format(new Date(detailDelivery.dispatchDate), "dd-MMM-yyyy") : "—"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Qty (Total Nos.)</p>
                        <p className="font-bold">{detailDelivery.quantity} Nos.</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Consignee & Buyer */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="border rounded-lg p-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Building2 className="h-3.5 w-3.5 text-blue-600" />
                      <p className="text-xs font-semibold text-blue-700">Consignee (Ship to)</p>
                    </div>
                    <p className="text-xs font-semibold">The Medical Superintendent</p>
                    <p className="text-xs text-muted-foreground">{detailDelivery.facilityName}</p>
                    <p className="text-xs text-muted-foreground">State</p>
                  </div>
                  <div className="border rounded-lg p-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Building2 className="h-3.5 w-3.5 text-emerald-600" />
                      <p className="text-xs font-semibold text-emerald-700">Buyer (Bill to)</p>
                    </div>
                    <p className="text-xs font-semibold">The Managing Director, HPC, Hyderabad</p>
                    <p className="text-xs text-muted-foreground">2nd Floor, DM&HS Compound, Sultanbazar, Koti</p>
                    <p className="text-xs text-muted-foreground">HYDERABAD - 500095</p>
                    <p className="text-xs font-mono text-muted-foreground">GSTIN: 36AADAT9639G1Z2</p>
                  </div>
                </div>

                {/* Vendor */}
                <div className="border rounded-lg p-3">
                  <p className="text-xs font-semibold mb-1 text-purple-700">Vendor (Supplier)</p>
                  <p className="text-xs font-semibold">{detailDelivery.vendorName}</p>
                </div>

                {/* QA Notes */}
                {detailDelivery.qaNotes && (
                  <div className="border rounded-lg p-3 bg-muted/20">
                    <p className="text-xs font-semibold mb-1.5">QA Notes / Inspection Details</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{detailDelivery.qaNotes}</p>
                  </div>
                )}

                {/* Received in Good Condition */}
                <div className={cn("border rounded-lg p-3 flex items-center gap-3", detailDelivery.qaComplianceScore === 100 ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50")}>
                  {detailDelivery.qaComplianceScore === 100
                    ? <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                    : <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />}
                  <div>
                    <p className="text-xs font-semibold">
                      {detailDelivery.qaComplianceScore === 100 ? "Recd. in Good Condition" : "Condition: Requires Attention"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">QA Score: {detailDelivery.qaComplianceScore != null ? `${detailDelivery.qaComplianceScore}%` : "Pending"}</p>
                  </div>
                </div>

                {/* Status */}
                <div className="flex items-center justify-between">
                  <StatusBadge status={detailDelivery.status} />
                  {detailDelivery.acceptanceCertificateIssued && (
                    <Badge className="bg-blue-600 text-white text-xs">Acceptance Certificate Issued</Badge>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Log Delivery Dialog — Delivery Note format */}
      <Dialog open={logOpen} onOpenChange={v => { setLogOpen(v); if (!v) { setDocs([]); resetForm(); } }}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
              <Truck className="h-5 w-5 text-primary" />Log Delivery &amp; Dispatch — Delivery Note Details
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">

            {/* Section: PO & Delivery Note */}
            <div className="border rounded-lg p-4 space-y-3 bg-white">
              <div className="flex items-center justify-between border-b pb-2">
                <p className="text-xs font-semibold text-slate-900 uppercase tracking-wide">1. Purchase Order &amp; Delivery Note</p>
                <span className="text-[11px] text-muted-foreground"><span className="text-destructive">*</span> indicates mandatory field</span>
              </div>

              <div className="space-y-1.5">
                <Label className={cn(errors.purchaseOrderId && "text-destructive font-semibold")}>
                  Purchase Order <span className="text-destructive">*</span>
                </Label>
                <Select value={form.purchaseOrderId} onValueChange={handlePOSelect}>
                  <SelectTrigger className={cn("bg-white", errors.purchaseOrderId && "border-destructive focus-visible:ring-destructive")}>
                    <SelectValue placeholder="Select a Purchase Order..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(purchaseOrders ?? []).map(po => (
                      <SelectItem key={po.id} value={String(po.id)}>
                        {po.poNumber} — {po.equipmentName} ({po.quantity} Nos.)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.purchaseOrderId && (
                  <p className="text-[11px] text-destructive font-medium mt-1">{errors.purchaseOrderId}</p>
                )}
              </div>

              {/* Selected PO Preview Card */}
              {(() => {
                const selPO = (purchaseOrders ?? []).find(
                  p => String(p.id) === form.purchaseOrderId || String((p as any)._id) === form.purchaseOrderId || p.poNumber === form.purchaseOrderId
                );
                if (!selPO) return null;
                return (
                  <div className="p-3 rounded-lg bg-sky-50/70 border border-sky-200/80 text-xs text-sky-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="space-y-0.5">
                      <p className="font-bold text-slate-900">{selPO.equipmentName}</p>
                      <p className="text-[11px] text-slate-600">
                        PO #{selPO.poNumber} · Total Ordered: <strong className="text-slate-900">{selPO.quantity} Nos.</strong>
                      </p>
                    </div>
                    <div className="text-left sm:text-right space-y-0.5">
                      <Badge variant="outline" className="bg-white border-sky-300 text-sky-900 text-[10.5px]">
                        Vendor: {selPO.vendorName || "Empanelled Vendor"}
                      </Badge>
                      {selPO.deliveryAddress && (
                        <p className="text-[10.5px] text-slate-500 truncate max-w-[260px]" title={selPO.deliveryAddress}>
                          Consignee: {selPO.deliveryAddress}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })()}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className={cn(errors.deliveryNoteNo && "text-destructive font-semibold")}>
                    Delivery Note / Challan No. <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={form.deliveryNoteNo}
                    onChange={e => {
                      setForm({ ...form, deliveryNoteNo: e.target.value });
                      if (errors.deliveryNoteNo) setErrors(prev => { const n = { ...prev }; delete n.deliveryNoteNo; return n; });
                    }}
                    placeholder="e.g. SSA/0506/25-26"
                    className={cn(errors.deliveryNoteNo && "border-destructive focus-visible:ring-destructive")}
                  />
                  {errors.deliveryNoteNo && (
                    <p className="text-[11px] text-destructive font-medium mt-1">{errors.deliveryNoteNo}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className={cn(errors.deliveryNoteDate && "text-destructive font-semibold")}>
                    Delivery Note Date <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    type="date"
                    value={form.deliveryNoteDate}
                    onChange={e => {
                      setForm({ ...form, deliveryNoteDate: e.target.value });
                      if (errors.deliveryNoteDate) setErrors(prev => { const n = { ...prev }; delete n.deliveryNoteDate; return n; });
                    }}
                    className={cn(errors.deliveryNoteDate && "border-destructive focus-visible:ring-destructive")}
                  />
                  {errors.deliveryNoteDate && (
                    <p className="text-[11px] text-destructive font-medium mt-1">{errors.deliveryNoteDate}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className={cn(errors.quantity && "text-destructive font-semibold")}>
                    Dispatch Quantity (Nos.) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    type="number"
                    min="1"
                    value={form.quantity}
                    onChange={e => {
                      setForm({ ...form, quantity: e.target.value });
                      if (errors.quantity) setErrors(prev => { const n = { ...prev }; delete n.quantity; return n; });
                    }}
                    placeholder="e.g. 5"
                    className={cn(errors.quantity && "border-destructive focus-visible:ring-destructive")}
                  />
                  {errors.quantity && (
                    <p className="text-[11px] text-destructive font-medium mt-1">{errors.quantity}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>Buyer's Order No. (PO Ref.)</Label>
                  <Input value={form.buyersOrderNo} onChange={e => setForm({ ...form, buyersOrderNo: e.target.value })} placeholder="e.g. 441A/591/HPC/EQU/2025-26" />
                </div>
                <div className="space-y-1.5">
                  <Label>Buyer's Order Date</Label>
                  <Input type="date" value={form.buyersOrderDate} onChange={e => setForm({ ...form, buyersOrderDate: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className={cn(errors.dispatchDate && "text-destructive font-semibold")}>
                    Dispatch Date <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    type="date"
                    value={form.dispatchDate}
                    onChange={e => {
                      setForm({ ...form, dispatchDate: e.target.value });
                      if (errors.dispatchDate) setErrors(prev => { const n = { ...prev }; delete n.dispatchDate; return n; });
                    }}
                    className={cn(errors.dispatchDate && "border-destructive focus-visible:ring-destructive")}
                  />
                  {errors.dispatchDate && (
                    <p className="text-[11px] text-destructive font-medium mt-1">{errors.dispatchDate}</p>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Dispatch Document / Consignment (LR / GR) Ref.</Label>
                <Input value={form.dispatchDocNo} onChange={e => setForm({ ...form, dispatchDocNo: e.target.value })} placeholder="e.g. LR-4920492 / Airway Bill No." />
              </div>
            </div>

            {/* Section: Consignee & Buyer */}
            <div className="border rounded-lg p-4 space-y-3 bg-white">
              <p className="text-xs font-semibold text-slate-900 uppercase tracking-wide border-b pb-2">2. Consignee &amp; Buyer Details</p>
              <div className="space-y-1.5">
                <Label className={cn(errors.destination && "text-destructive font-semibold")}>
                  Destination / Hospital Institution <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={form.destination}
                  onChange={e => {
                    setForm({ ...form, destination: e.target.value });
                    if (errors.destination) setErrors(prev => { const n = { ...prev }; delete n.destination; return n; });
                  }}
                  placeholder="e.g. Gandhi Hospital, Musheerabad / RIMS Adilabad"
                  className={cn(errors.destination && "border-destructive focus-visible:ring-destructive")}
                />
                {errors.destination && (
                  <p className="text-[11px] text-destructive font-medium mt-1">{errors.destination}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Consignee Physical Address (Ship to)</Label>
                <Textarea value={form.consigneeAddress} onChange={e => setForm({ ...form, consigneeAddress: e.target.value })} rows={2}
                  placeholder="The Medical Superintendent, GGH, Sangareddy, Sangareddy - 502001, Medak Dist." />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Buyer (Bill to) — HPC</Label>
                  <Textarea value={form.buyerBillToAddress} onChange={e => setForm({ ...form, buyerBillToAddress: e.target.value })} rows={2} className="text-xs" />
                </div>
                <div className="space-y-1.5">
                  <Label>Vendor GSTIN</Label>
                  <Input value={form.vendorGstin} onChange={e => setForm({ ...form, vendorGstin: e.target.value })} placeholder="e.g. 36ACWFS9933Q1ZO" />
                </div>
              </div>
            </div>

            {/* Section: Transport */}
            <div className="border rounded-lg p-4 space-y-3 bg-white">
              <p className="text-xs font-semibold text-slate-900 uppercase tracking-wide border-b pb-2">3. Dispatch &amp; Logistics Details</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className={cn(errors.dispatchedThrough && "text-destructive font-semibold")}>
                    Dispatched Through (Carrier / Mode) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={form.dispatchedThrough}
                    onChange={e => {
                      setForm({ ...form, dispatchedThrough: e.target.value });
                      if (errors.dispatchedThrough) setErrors(prev => { const n = { ...prev }; delete n.dispatchedThrough; return n; });
                    }}
                    placeholder="e.g. Dedicated Logistics / VRL Logistics / Blue Dart"
                    className={cn(errors.dispatchedThrough && "border-destructive focus-visible:ring-destructive")}
                  />
                  {errors.dispatchedThrough && (
                    <p className="text-[11px] text-destructive font-medium mt-1">{errors.dispatchedThrough}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className={cn(errors.vehicleNumber && "text-destructive font-semibold")}>
                    Vehicle / Tracking No. <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={form.vehicleNumber}
                    onChange={e => {
                      setForm({ ...form, vehicleNumber: e.target.value });
                      if (errors.vehicleNumber) setErrors(prev => { const n = { ...prev }; delete n.vehicleNumber; return n; });
                    }}
                    placeholder="e.g. TS-09-UB-4819 / TRK-983214"
                    className={cn(errors.vehicleNumber && "border-destructive focus-visible:ring-destructive")}
                  />
                  {errors.vehicleNumber && (
                    <p className="text-[11px] text-destructive font-medium mt-1">{errors.vehicleNumber}</p>
                  )}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Terms of Delivery</Label>
                <Input value={form.termsOfDelivery} onChange={e => setForm({ ...form, termsOfDelivery: e.target.value })} placeholder="e.g. FOR Destination (Hospital Premises)" />
              </div>
            </div>

            {/* Section: Item Details */}
            <div className="border rounded-lg p-4 space-y-3 bg-white">
              <p className="text-xs font-semibold text-slate-900 uppercase tracking-wide border-b pb-2">4. Item &amp; Serial Number Specifications</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>HSN / SAC Code</Label>
                  <Input value={form.hsnSacCode} onChange={e => setForm({ ...form, hsnSacCode: e.target.value })} placeholder="e.g. 90189099" />
                </div>
                <div className="space-y-1.5">
                  <Label>GST Rate (%)</Label>
                  <Select value={form.gstRate} onValueChange={v => setForm({ ...form, gstRate: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">0% — Exempt</SelectItem>
                      <SelectItem value="5">5% — Medical Equipment</SelectItem>
                      <SelectItem value="12">12% — Standard</SelectItem>
                      <SelectItem value="18">18% — Standard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Tax Amount</Label>
                  <Input value={form.taxAmount} onChange={e => setForm({ ...form, taxAmount: e.target.value })} placeholder="NIL (if exempt)" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Serial / Batch Numbers (comma or newline separated)</Label>
                <Textarea
                  value={form.serialBatchNos}
                  onChange={e => setForm({ ...form, serialBatchNos: e.target.value })}
                  rows={2}
                  placeholder="e.g. SN-ECG-2026-001, SN-ECG-2026-002, SN-ECG-2026-003"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Dispatch Notes / Special Handling Instructions</Label>
                <Textarea value={form.dispatchNotes} onChange={e => setForm({ ...form, dispatchNotes: e.target.value })} rows={2} placeholder="Fragile medical apparatus, store at temperature controlled environment..." />
              </div>
            </div>

            {/* Good Condition Checkbox */}
            <div className="flex items-center gap-3 p-3 rounded-lg border border-emerald-200 bg-emerald-50">
              <input
                type="checkbox"
                id="good_cond"
                checked={form.receivedInGoodCondition}
                onChange={e => setForm({ ...form, receivedInGoodCondition: e.target.checked })}
                className="h-4 w-4 accent-emerald-600 cursor-pointer"
              />
              <label htmlFor="good_cond" className="text-xs font-semibold text-emerald-900 cursor-pointer">
                Consignment dispatched in undamaged condition with tamper-evident seals intact
              </label>
            </div>

            {/* Document uploads */}
            <div className="border rounded-lg p-4 space-y-3 bg-white">
              <p className="text-xs font-semibold text-slate-900 uppercase tracking-wide border-b pb-2 flex items-center gap-2">
                <Upload className="h-4 w-4 text-slate-700" />5. Upload Dispatch Documents &amp; Challan Copies
              </p>
              <div className="grid grid-cols-1 gap-2">
                {DOC_TYPES.map(dt => {
                  const uploaded = docs.filter(d => d.docType === dt.key);
                  return (
                    <label key={dt.key} className="block cursor-pointer">
                      <div className={`flex items-center gap-3 p-2.5 rounded-lg border transition-colors hover:bg-muted/30 ${uploaded.length > 0 ? "border-emerald-200 bg-emerald-50" : "border-dashed border-muted-foreground/30"}`}>
                        {uploaded.length > 0
                          ? <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                          : <Upload className="h-4 w-4 text-muted-foreground shrink-0" />}
                        <div className="flex-1">
                          <p className="text-xs font-medium">{dt.label}</p>
                          <p className="text-[10px] text-muted-foreground">{dt.hint}</p>
                          {uploaded.length > 0 && <p className="text-[10px] text-emerald-700 font-semibold">{uploaded.map(d => d.name).join(", ")}</p>}
                        </div>
                        <span className="text-xs text-primary border border-primary/30 rounded px-2 py-0.5">
                          {uploaded.length > 0 ? "Change" : "Browse"}
                        </span>
                      </div>
                      <input
                        type="file" accept={dt.accept} className="hidden"
                        ref={el => { fileRefs.current[dt.key] = el; }}
                        onChange={e => handleFileUpload(e.target.files, dt.key)}
                      />
                    </label>
                  );
                })}
              </div>
            </div>

            {docs.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">Attached files ({docs.length})</p>
                {docs.map((d, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs bg-muted/30 rounded px-2 py-1.5">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="flex-1 truncate">{d.name}</span>
                    <span className="text-muted-foreground">{d.size}</span>
                    <button onClick={() => setDocs(prev => prev.filter((_, j) => j !== i))}>
                      <X className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t">
            <Button variant="outline" onClick={() => { setLogOpen(false); setDocs([]); resetForm(); }}>Cancel</Button>
            <Button
              onClick={handleCreate}
              disabled={createDelivery.isPending}
              className="font-semibold text-xs shadow-xs"
            >
              {createDelivery.isPending ? "Logging Delivery..." : "Log Delivery Dispatch"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
