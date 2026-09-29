import { useRoute, Link } from "wouter";
import { useGetPurchaseOrder, getGetPurchaseOrderQueryKey, useApprovePurchaseOrder, useCancelPurchaseOrder, useListDeliveries, getListDeliveriesQueryKey } from "@/lib/api-hooks";
import { updatePOPaymentStatus, amendPurchaseOrder, submitPOForApproval, gmReviewPO, soDecisionPO, releasePOPayment, acknowledgePurchaseOrder, createDelivery } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, IndianRupee, ShieldCheck, CreditCard, CheckCircle2, Clock, AlertTriangle, FileText, Building2, History, RotateCcw, Wrench, Truck, Upload, Loader2 } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { useState } from "react";
import { ProductSpecSheet } from "@/components/ProductSpecSheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export default function PurchaseOrderDetail() {
  const [, params] = useRoute("/purchase-orders/:id");
  const id = (params?.id ?? "");
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const role = user?.role || "tgmsidc_user";
  
  const { data: po, isLoading } = useGetPurchaseOrder(id, { query: { enabled: !!id, queryKey: getGetPurchaseOrderQueryKey(id) } });
  const { data: deliveries } = useListDeliveries({ poId: id }, { query: { enabled: !!id, queryKey: getListDeliveriesQueryKey({ poId: id }) } });
  const approvePO = useApprovePurchaseOrder();
  const cancelPO = useCancelPurchaseOrder();

  // Modals
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [reviewAction, setReviewAction] = useState<string | null>(null);
  const [reviewComments, setReviewComments] = useState("");
  const [isReviewing, setIsReviewing] = useState(false);

  // Acknowledgement & Dispatch Modals
  const [ackOpen, setAckOpen] = useState(false);
  const [ackExpectedDispatchDate, setAckExpectedDispatchDate] = useState("");
  const [ackRemarks, setAckRemarks] = useState("Committed to deliver equipment within 45 days supply timeline.");
  const [ackSubmitting, setAckSubmitting] = useState(false);

  const [dispatchOpen, setDispatchOpen] = useState(false);
  const [dispatchForm, setDispatchForm] = useState({
    quantity: 1,
    challanNumber: "",
    invoiceNumber: "",
    lrGrNumber: "",
    transporterName: "Safechem Express Logistics",
    transporterVehicle: "TS 09 UB 5678",
    serialNumbers: "",
  });
  const [dispatchSubmitting, setDispatchSubmitting] = useState(false);

  // Statutory 2-Tranche Release Modal (90% + 10%)
  const [payTrancheModal, setPayTrancheModal] = useState<{ tranche: "tranche1_90" | "tranche2_10" } | null>(null);
  const [payTrancheForm, setPayTrancheForm] = useState({
    reference: "",
    date: new Date().toISOString().split("T")[0],
    paidBy: user?.fullName || "Accounts Officer",
    remarks: "",
  });
  const [payTrancheSubmitting, setPayTrancheSubmitting] = useState(false);

  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    paymentStatus: "paid",
    paymentReference: "",
    paymentDate: new Date().toISOString().split("T")[0],
    paymentAmount: 0,
    paidBy: "Accounts Officer",
    paymentRemarks: "",
  });
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);

  const [amendOpen, setAmendOpen] = useState(false);
  const [amendForm, setAmendForm] = useState({
    amendmentType: "quantity_adjustment",
    description: "",
    previousValue: "",
    newValue: "",
    requestedBy: "Procurement Division",
  });
  const [amendSubmitting, setAmendSubmitting] = useState(false);

  if (isLoading) return <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 rounded-full border-4 border-primary border-t-transparent" /></div>;
  if (!po) return <div className="text-center py-20 text-muted-foreground">PO not found</div>;

  const rawPO = po as any;

  function handleApprove() {
    approvePO.mutate(id, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetPurchaseOrderQueryKey(id) });
        toast({ title: "PO Approved", description: `Purchase Order ${po.poNumber} has been approved.` });
      }
    });
  }

  function handleCancel() {
    if (!cancelReason.trim()) return;
    cancelPO.mutate({ id, data: { cancellationReason: cancelReason, cancelledBy: "Procurement Officer" } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetPurchaseOrderQueryKey(id) });
        setCancelOpen(false);
        setCancelReason("");
        toast({ title: "PO Cancelled", description: "Purchase order has been cancelled." });
      }
    });
  }

  async function handleRecordPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!paymentForm.paymentReference.trim()) {
      toast({ title: "UTR / Reference Required", description: "Please enter a valid payment transaction or UTR number.", variant: "destructive" });
      return;
    }
    setPaymentSubmitting(true);
    try {
      await updatePOPaymentStatus(id, {
        paymentStatus: paymentForm.paymentStatus,
        paymentReference: paymentForm.paymentReference,
        paymentDate: paymentForm.paymentDate,
        paymentAmount: Number(paymentForm.paymentAmount || po.totalAmount),
        paidBy: paymentForm.paidBy,
        paymentRemarks: paymentForm.paymentRemarks,
      });
      queryClient.invalidateQueries({ queryKey: getGetPurchaseOrderQueryKey(id) });
      setPaymentOpen(false);
      toast({ title: "Payment Status Updated", description: `PO marked as ${paymentForm.paymentStatus.toUpperCase()} (Ref: ${paymentForm.paymentReference})` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to update payment status", variant: "destructive" });
    } finally {
      setPaymentSubmitting(false);
    }
  }

  async function handleAmendPO(e: React.FormEvent) {
    e.preventDefault();
    if (!amendForm.description.trim()) {
      toast({ title: "Reason Required", description: "Please provide justification for this statutory amendment.", variant: "destructive" });
      return;
    }
    setAmendSubmitting(true);
    try {
      await amendPurchaseOrder(id, amendForm);
      queryClient.invalidateQueries({ queryKey: getGetPurchaseOrderQueryKey(id) });
      setAmendOpen(false);
      setAmendForm({
        amendmentType: "quantity_adjustment",
        description: "",
        previousValue: "",
        newValue: "",
        requestedBy: "Procurement Division",
      });
      toast({ title: "PO Amended", description: `Statutory version incremented to v${(rawPO.version || 1) + 1}` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to amend PO", variant: "destructive" });
    } finally {
      setAmendSubmitting(false);
    }
  }

  async function handleReviewSubmit() {
    if (!reviewAction) return;
    if ((reviewAction.includes("return") || reviewAction.includes("reject")) && !reviewComments.trim()) {
      toast({ title: "Required", description: "Comments are required for this action.", variant: "destructive" });
      return;
    }
    setIsReviewing(true);
    try {
      if (reviewAction.startsWith("so_")) {
        const actionMap: Record<string, string> = {
          so_approve: "approved",
          so_return: "returned",
          so_reject: "rejected",
        };
        await soDecisionPO(id, {
          action: actionMap[reviewAction],
          comments: reviewComments,
          approvedBy: user?.username || "SO Equipment"
        });
      } else {
        await gmReviewPO(id, {
          action: reviewAction,
          comments: reviewComments,
          reviewedBy: user?.username || "GM Equipment"
        });
      }
      queryClient.invalidateQueries({ queryKey: getGetPurchaseOrderQueryKey(id) });
      setReviewAction(null);
      setReviewComments("");
      toast({ title: "Success", description: "PO approval status updated." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to update PO status", variant: "destructive" });
    } finally {
      setIsReviewing(false);
    }
  }

  async function handleAcknowledgePO() {
    setAckSubmitting(true);
    try {
      await acknowledgePurchaseOrder(id, {
        expectedDispatchDate: ackExpectedDispatchDate ? new Date(ackExpectedDispatchDate) : undefined,
        remarks: ackRemarks,
      });
      queryClient.invalidateQueries({ queryKey: getGetPurchaseOrderQueryKey(id) });
      setAckOpen(false);
      toast({ title: "PO Acknowledged", description: "Supplier dispatch timeline recorded successfully." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to acknowledge PO", variant: "destructive" });
    } finally {
      setAckSubmitting(false);
    }
  }

  async function handleCreateDispatch(e: React.FormEvent) {
    e.preventDefault();
    setDispatchSubmitting(true);
    try {
      await createDelivery({
        purchaseOrderId: po?.id || id,
        vendorId: rawPO.vendorId,
        facilityId: rawPO.consignees?.[0]?.institutionId || rawPO.indentId,
        quantity: dispatchForm.quantity || po?.quantity || 1,
        transporterName: dispatchForm.transporterName,
        transporterVehicle: dispatchForm.transporterVehicle,
        lrGrNumber: dispatchForm.lrGrNumber,
        challanNumber: dispatchForm.challanNumber,
        invoiceNumber: dispatchForm.invoiceNumber,
        serialNumbers: dispatchForm.serialNumbers ? dispatchForm.serialNumbers.split(",").map((s: string) => s.trim()) : [],
        dispatchDate: new Date(),
        status: "dispatched",
      });
      queryClient.invalidateQueries({ queryKey: getGetPurchaseOrderQueryKey(id) });
      queryClient.invalidateQueries({ queryKey: getListDeliveriesQueryKey({ poId: id }) });
      setDispatchOpen(false);
      toast({ title: "Consignment Dispatched", description: "Delivery dispatch record created and transmitted." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to create consignment dispatch", variant: "destructive" });
    } finally {
      setDispatchSubmitting(false);
    }
  }

  async function handleReleaseTranchePayment(e: React.FormEvent) {
    e.preventDefault();
    if (!payTrancheModal) return;
    setPayTrancheSubmitting(true);
    try {
      await releasePOPayment(id, {
        tranche: payTrancheModal.tranche,
        paymentReference: payTrancheForm.reference || `UTR-TG-${Date.now().toString().slice(-8)}`,
        paymentDate: payTrancheForm.date,
        paidBy: payTrancheForm.paidBy,
        remarks: payTrancheForm.remarks,
      });
      queryClient.invalidateQueries({ queryKey: getGetPurchaseOrderQueryKey(id) });
      queryClient.invalidateQueries({ queryKey: getListDeliveriesQueryKey({ poId: id }) });
      setPayTrancheModal(null);
      toast({
        title: "Statutory Payment Released",
        description: payTrancheModal.tranche === "tranche1_90"
          ? "90% payment released against verified DCC, QA clearance & installation documents."
          : "Final 10% retention released post 3 months satisfactory usage & QPC verification.",
      });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to release payment", variant: "destructive" });
    } finally {
      setPayTrancheSubmitting(false);
    }
  }

  // Vendor ack SLA check (7 days)
  const poDate = po.poDate ? new Date(po.poDate) : new Date(po.createdAt);
  const daysSincePO = differenceInDays(new Date(), poDate);
  const ackOverdue = !rawPO.vendorAcknowledged && daysSincePO > 7;

  const totalAmount = po?.totalAmount || 0;
  const t1Amount = rawPO.tranche1Amount || Math.round(totalAmount * 0.9);
  const t2Amount = totalAmount - t1Amount;
  const isT1Paid = rawPO.tranche1Paid || rawPO.paymentStatus === "paid" || rawPO.paymentStatus === "partial";
  const isT2Paid = rawPO.tranche2Paid || (rawPO.paymentStatus === "paid" && rawPO.status === "completed");

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <Link href="/purchase-orders">
          <Button variant="ghost" size="sm" className="gap-2"><ArrowLeft className="h-4 w-4" />Back</Button>
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold font-mono tracking-tight">{po.poNumber}</h1>
            <Badge variant="outline" className="text-xs bg-slate-100 text-slate-700 font-mono">
              Version v{rawPO.version || 1}
            </Badge>
            {rawPO.vendorTier && (
              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                Tier {rawPO.vendorTier} ({rawPO.allocationRatio || "100%"})
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Issued on {format(poDate, "dd MMM yyyy")} · Indent #{rawPO.indentNumber || "Requisition"} · RC #{rawPO.rcNumber || "Contract"}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <StatusBadge status={po.status} />
        </div>
      </div>

      {/* Scope Boundary Mandate Callout (Process Book §0) */}
      <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-4 text-xs text-emerald-900 flex items-start gap-3">
        <CreditCard className="h-5 w-5 text-emerald-700 shrink-0 mt-0.5" />
        <div className="flex-1">
          <span className="font-semibold text-emerald-950">Statutory Scope Boundary Rule (Process Book §0): </span>
          Payment disbursement, invoice matching, and treasury transfers are processed outside the platform via IFMIS/Treasury.
          Accounts records a manual <strong>Paid / Not-Paid</strong> status and reference number (UTR / Cheque No) against this PO for official fulfillment records.
        </div>
        <Button
          size="sm"
          className="bg-[#186812] hover:bg-[#124e0d] text-white shrink-0 shadow-sm"
          onClick={() => {
            setPaymentForm({
              paymentStatus: rawPO.paymentStatus === "paid" ? "paid" : "paid",
              paymentReference: rawPO.paymentReference || "",
              paymentDate: rawPO.paymentDate ? new Date(rawPO.paymentDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
              paymentAmount: rawPO.paymentAmount || po.totalAmount,
              paidBy: rawPO.paidBy || "Accounts Officer",
              paymentRemarks: rawPO.paymentRemarks || "",
            });
            setPaymentOpen(true);
          }}
        >
          <CreditCard className="h-3.5 w-3.5 mr-1.5" /> Record Payment Status
        </Button>
      </div>

      {/* Approval Banner */}
      {po.approvalStatus && po.approvalStatus !== "approved" && po.approvalStatus !== "not_applicable" && (
        <div className={`rounded-lg border p-4 text-sm flex flex-col gap-2 ${
          po.approvalStatus === "pending" ? "border-amber-200 bg-amber-50 text-amber-900" :
          po.approvalStatus === "proposed_approve" ? "border-blue-200 bg-blue-50 text-blue-900" :
          (po.approvalStatus === "proposed_reject" || po.approvalStatus === "returned" || po.approvalStatus === "rejected") ? "border-red-200 bg-red-50 text-red-900" :
          "border-slate-200 bg-slate-50 text-slate-900"
        }`}>
          <div className="font-semibold flex items-center gap-2">
            {po.approvalStatus === "pending" && <Clock className="h-5 w-5" />}
            {po.approvalStatus === "proposed_approve" && <ShieldCheck className="h-5 w-5" />}
            {(po.approvalStatus === "returned" || po.approvalStatus === "proposed_reject" || po.approvalStatus === "rejected") && <AlertTriangle className="h-5 w-5" />}
            Approval Status: {po.approvalStatus.replace("_", " ").toUpperCase()}
          </div>
          {po.returnComments && (
            <div className="text-xs bg-white/50 p-2 rounded mt-1">
              <strong>Comments:</strong> {po.returnComments}
            </div>
          )}
        </div>
      )}
      {po.approvalStatus === "approved" && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm flex items-center gap-2 text-emerald-900">
          <CheckCircle2 className="h-5 w-5" />
          <span className="font-semibold">PO Approved</span>
        </div>
      )}

      {/* Approval Actions Card */}
      {((role === "admin" || role === "tgmsidc_user" || role === "gm_equipment" || role === "so_equipment") && (po.status === "draft" || po.status === "pending_approval" || po.status === "returned")) && (
        <Card className="border border-border/80 shadow-sm border-l-4 border-l-blue-500">
          <CardHeader className="pb-3 bg-muted/20 border-b">
            <CardTitle className="text-sm font-semibold">Approval Workflow Actions</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 flex flex-wrap gap-3">
            {/* Submit for Approval (DEO / Admin / Draft) */}
            {(po.status === "draft" || po.approvalStatus === "returned") && (
              <Button onClick={async () => {
                await submitPOForApproval(id, { submittedBy: user?.username || "User" });
                queryClient.invalidateQueries({ queryKey: getGetPurchaseOrderQueryKey(id) });
              }} className="bg-primary text-white">
                Submit for Approval
              </Button>
            )}

            {/* GM Review Actions */}
            {(role === "gm_equipment" || role === "admin") && po.approvalStatus === "pending" && (
              <>
                <Button onClick={() => setReviewAction("recommend_approve")} variant="outline" className="text-blue-700 border-blue-300 hover:bg-blue-50">
                  Recommend Approve
                </Button>
                <Button onClick={() => setReviewAction("return")} variant="outline" className="text-amber-700 border-amber-300 hover:bg-amber-50">
                  Return for Modification
                </Button>
                <Button onClick={() => setReviewAction("recommend_reject")} variant="outline" className="text-red-700 border-red-300 hover:bg-red-50">
                  Recommend Reject
                </Button>
              </>
            )}

            {/* SO Decision Actions */}
            {(role === "so_equipment" || role === "admin") && (po.approvalStatus === "proposed_approve" || po.approvalStatus === "proposed_reject" || po.approvalStatus === "pending") && (
              <>
                <Button onClick={() => setReviewAction("so_approve")} className="bg-[#186812] hover:bg-[#124e0d] text-white">
                  Approve PO
                </Button>
                <Button onClick={() => setReviewAction("so_return")} variant="outline" className="text-amber-700 border-amber-300 hover:bg-amber-50">
                  Return
                </Button>
                <Button onClick={() => setReviewAction("so_reject")} variant="destructive">
                  Reject PO
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Order & Delivery Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Order Details */}
        <Card className="border border-border/80 shadow-sm">
          <CardHeader className="pb-3 bg-muted/20 border-b">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" /> Purchase Order Specifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5 pt-4">
            <DR label="Equipment Name" value={po.equipmentName} />
            <DR label="Contracted Vendor" value={po.vendorName} />
            <DR label="Ordered Quantity" value={`${po.quantity ?? 1} Units`} />
            <DR label="Unit Landed Price" value={po.unitPrice != null ? `₹${po.unitPrice.toLocaleString("en-IN")}` : "—"} />
            <DR label="GST Tax Slab" value={`${po.gstRate ?? 12}%`} />
            <DR label="Total Order Value" value={po.totalAmount != null ? `₹${po.totalAmount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}` : "—"} />
            <DR label="Order Date" value={format(poDate, "dd MMM yyyy")} />
            <DR label="Allocated Ratio" value={rawPO.allocationRatio || "100% (Single Vendor)"} />
          </CardContent>
        </Card>

        {/* Delivery & Vendor Acknowledgement */}
        <Card className="border border-border/80 shadow-sm">
          <CardHeader className="pb-3 bg-muted/20 border-b">
            <CardTitle className="text-sm font-semibold flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" /> Delivery &amp; Fulfillment
              </span>
              {/* Vendor Ack SLA */}
              {rawPO.vendorAcknowledged ? (
                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Acknowledged {rawPO.vendorAckDate ? format(new Date(rawPO.vendorAckDate), "dd MMM") : ""}
                </Badge>
              ) : ackOverdue ? (
                <Badge className="bg-red-100 text-red-800 border-red-300 text-[10px] gap-1">
                  <AlertTriangle className="h-3 w-3" /> SLA Breached (&gt;7d)
                </Badge>
              ) : (
                <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px] gap-1">
                  <Clock className="h-3 w-3" /> Ack Pending ({7 - daysSincePO}d left)
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5 pt-4">
            <DR label="Delivery Destination" value={po.deliveryAddress || "Consignee Hospital"} />
            <DR label="Contracted Supply Period" value={`${rawPO.supplyPeriodDays || 45} Calendar Days`} />
            <DR label="Expected Delivery Date" value={po.expectedDeliveryDate ? format(new Date(po.expectedDeliveryDate), "dd MMM yyyy") : "Not set"} />
            <DR label="Actual Delivery Date" value={po.actualDeliveryDate ? format(new Date(po.actualDeliveryDate), "dd MMM yyyy") : "Pending Dispatch"} />
            <DR label="Vendor Dispatch Commitment" value={rawPO.vendorExpectedDispatchDate ? format(new Date(rawPO.vendorExpectedDispatchDate), "dd MMM yyyy") : "Pending Confirmation"} />
            {po.cancellationReason && <DR label="Cancellation Reason" value={po.cancellationReason} />}

            {/* Lifecycle Action Buttons */}
            <div className="pt-3 border-t mt-3 flex flex-col gap-2">
              {!rawPO.vendorAcknowledged && (
                role === "vendor" ? (
                  <Button
                    size="sm"
                    className="w-full bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs shadow-sm"
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() + 30);
                      setAckExpectedDispatchDate(d.toISOString().split("T")[0]);
                      setAckRemarks("Stock allocated. Dispatch committed within SLA.");
                      setAckOpen(true);
                    }}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Acknowledge Purchase Order
                  </Button>
                ) : (
                  <div className="p-3 bg-amber-50/90 border border-amber-200 rounded-lg text-xs space-y-1">
                    <div className="flex items-center gap-1.5 font-semibold text-amber-900">
                      <Clock className="h-4 w-4 text-amber-600 shrink-0" /> Awaiting Empanelled Vendor Acknowledgment
                    </div>
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                      Official PO has been issued to <span className="font-semibold text-amber-950">{po.vendorName}</span>. Statutory acceptance &amp; dispatch commitment can only be confirmed by the empanelled vendor.
                    </p>
                  </div>
                )
              )}
              {rawPO.vendorAcknowledged && po.status !== "delivered" && po.status !== "completed" && (
                role === "vendor" || role === "admin" ? (
                  <Button
                    size="sm"
                    className="w-full bg-[#186812] hover:bg-[#124e0d] text-white font-medium text-xs shadow-sm"
                    onClick={() => {
                      const dcNo = `DC/${po.poNumber?.slice(-4) || "001"}/${Math.floor(1000 + Math.random() * 9000)}`;
                      const invNo = `INV/${format(new Date(), "yyyy")}-${(Number(format(new Date(), "yy")) + 1)}/${Math.floor(100 + Math.random() * 900)}`;
                      const lrNo = `LR-TS-${Math.floor(100000 + Math.random() * 900000)}`;
                      const serials = Array.from({ length: po.quantity || 1 }, (_, i) => `${po.equipmentId || "EQ"}-${Math.floor(10000 + Math.random() * 90000)}-0${i + 1}`).join(", ");
                      setDispatchForm({
                        quantity: po.quantity || 1,
                        challanNumber: dcNo,
                        invoiceNumber: invNo,
                        lrGrNumber: lrNo,
                        transporterName: "Safechem Express Logistics",
                        transporterVehicle: "TS 09 UB 5678",
                        serialNumbers: serials,
                      });
                      setDispatchOpen(true);
                    }}
                  >
                    <Truck className="h-3.5 w-3.5 mr-1.5" /> Initiate Delivery / Record Dispatch
                  </Button>
                ) : (
                  <div className="p-3 bg-blue-50/90 border border-blue-200 rounded-lg text-xs space-y-1">
                    <div className="flex items-center gap-1.5 font-semibold text-blue-900">
                      <Truck className="h-4 w-4 text-blue-600 shrink-0" /> PO Acknowledged — Consignment in Progress
                    </div>
                    <p className="text-[11px] text-blue-800 leading-relaxed">
                      Empanelled vendor has acknowledged the PO. Consignment dispatch and DC/LR will be logged by <span className="font-semibold text-blue-950">{po.vendorName}</span>.
                    </p>
                  </div>
                )
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Equipment Technical Specifications */}
      <Card className="border border-border/80 shadow-sm">
        <CardHeader className="pb-3 bg-muted/20 border-b flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Wrench className="h-4 w-4 text-primary" /> Technical Specifications ({po.equipmentName})
          </CardTitle>
          <span className="text-xs text-muted-foreground">Standardized Equipment Master Specs</span>
        </CardHeader>
        <CardContent className="p-4">
          <ProductSpecSheet
            equipmentId={po.equipmentId || po.equipmentName}
            equipmentName={po.equipmentName}
            editable={false}
          />
        </CardContent>
      </Card>

      {/* Scope Boundary Payment Status & Performance Security Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Statutory 2-Tranche Payment Card (90% + 10%) */}
        <Card className="border border-border/80 shadow-sm border-l-4 border-l-emerald-600">
          <CardHeader className="pb-3 bg-muted/20 border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <IndianRupee className="h-4 w-4 text-emerald-700" /> Statutory 2-Tranche Payment Release (§8 &amp; §10)
              </CardTitle>
              <Badge className={
                isT1Paid && isT2Paid ? "bg-emerald-100 text-emerald-800 border-emerald-300" :
                isT1Paid ? "bg-blue-100 text-blue-800 border-blue-300" :
                "bg-slate-100 text-slate-700 border-slate-300"
              }>
                {isT1Paid && isT2Paid ? "FULLY PAID" : isT1Paid ? "90% PAID (TRANCHE 1)" : "PAYMENT PENDING"}
              </Badge>
            </div>
            <CardDescription className="text-[11px] mt-1 text-slate-600">
              90% on delivery &amp; verified docs; 10% held as retention released post 3 months satisfactory hospital usage.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-4 text-xs">
            {/* Tranche 1 (90%) */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900">Tranche 1 (90% Release)</span>
                  <p className="text-[11px] text-muted-foreground">Released upon delivery, QA clearance &amp; all verified docs</p>
                </div>
                <span className="font-mono font-bold text-sm text-foreground">₹{t1Amount.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200">
                <span className="text-muted-foreground">Status:</span>
                {isT1Paid ? (
                  <Badge className="bg-emerald-100 text-emerald-800 border-0 text-[10px] gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Released {rawPO.tranche1PaidDate ? format(new Date(rawPO.tranche1PaidDate), "dd MMM") : ""}
                  </Badge>
                ) : (
                  <Badge className="bg-amber-100 text-amber-800 border-0 text-[10px]">
                    Pending Verification
                  </Badge>
                )}
              </div>
              {rawPO.tranche1Reference && (
                <div className="text-[10px] text-slate-500 font-mono">
                  UTR: {rawPO.tranche1Reference} · By: {rawPO.tranche1PaidBy || "Accounts Division"}
                </div>
              )}
              {(role === "admin" || role === "tgmsidc_user" || role === "executive_director") && !isT1Paid && (
                <Button
                  size="sm"
                  className="w-full bg-[#186812] hover:bg-[#124e0d] text-white text-xs mt-1"
                  onClick={() => {
                    setPayTrancheModal({ tranche: "tranche1_90" });
                    setPayTrancheForm({
                      reference: `UTR-TG90-${Math.floor(10000000 + Math.random() * 90000000)}`,
                      date: new Date().toISOString().split("T")[0],
                      paidBy: user?.fullName || "Accounts Officer",
                      remarks: `90% payment released against verified DCC, QA clearance & installation documents for ${po.poNumber}.`,
                    });
                  }}
                >
                  <IndianRupee className="h-3.5 w-3.5 mr-1" /> Release 90% (Tranche 1)
                </Button>
              )}
            </div>

            {/* Tranche 2 (10% Retention) */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900">Tranche 2 (10% Retention)</span>
                  <p className="text-[11px] text-muted-foreground">Released post 3 months satisfactory usage &amp; QPC verification</p>
                </div>
                <span className="font-mono font-bold text-sm text-foreground">₹{t2Amount.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200">
                <span className="text-muted-foreground">Status:</span>
                {isT2Paid ? (
                  <Badge className="bg-emerald-100 text-emerald-800 border-0 text-[10px] gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Retention Released {rawPO.tranche2PaidDate ? format(new Date(rawPO.tranche2PaidDate), "dd MMM") : ""}
                  </Badge>
                ) : isT1Paid ? (
                  <Badge className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px]">
                    3-Month Usage Period
                  </Badge>
                ) : (
                  <Badge className="bg-slate-100 text-slate-600 border-0 text-[10px]">
                    Awaiting Tranche 1
                  </Badge>
                )}
              </div>
              {rawPO.tranche2Reference && (
                <div className="text-[10px] text-slate-500 font-mono">
                  UTR: {rawPO.tranche2Reference} · By: {rawPO.tranche2PaidBy || "Accounts Division"}
                </div>
              )}
              {(role === "admin" || role === "tgmsidc_user" || role === "executive_director") && isT1Paid && !isT2Paid && (
                <Button
                  size="sm"
                  className="w-full bg-blue-700 hover:bg-blue-800 text-white text-xs mt-1"
                  onClick={() => {
                    setPayTrancheModal({ tranche: "tranche2_10" });
                    setPayTrancheForm({
                      reference: `UTR-TG10-${Math.floor(10000000 + Math.random() * 90000000)}`,
                      date: new Date().toISOString().split("T")[0],
                      paidBy: user?.fullName || "Accounts Officer",
                      remarks: `Final 10% retention released post 3 months satisfactory hospital usage & QPC verification for ${po.poNumber}.`,
                    });
                  }}
                >
                  <IndianRupee className="h-3.5 w-3.5 mr-1" /> Release 10% (Tranche 2 - Post 3 Months)
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Performance Security & Bank Guarantee Card */}
        <Card className="border border-border/80 shadow-sm">
          <CardHeader className="pb-3 bg-muted/20 border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" /> Performance Security &amp; BG
              </CardTitle>
              <Badge variant="outline" className="text-xs">
                {rawPO.psRequired ? `${rawPO.psPercent || 5}% Required` : "Not Required"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2.5 pt-4">
            <DR label="Performance Security" value={rawPO.psRequired ? `Mandatory (${rawPO.psPercent || 5}%)` : "Exempted"} />
            <DR label="PS Security Amount" value={rawPO.psAmount ? `₹${Number(rawPO.psAmount).toLocaleString("en-IN")}` : `₹${Math.round((po.totalAmount || 0) * 0.05).toLocaleString("en-IN")}`} />
            <DR label="BG Submission Deadline" value={rawPO.bgDueDate ? format(new Date(rawPO.bgDueDate), "dd MMM yyyy") : "Within 30 Days of PO Issue"} />
            <DR label="BG Reference Number" value={rawPO.bgReferenceNo || "Pending Vendor Submission"} />
            <DR label="BG Verification Status" value={rawPO.bgStatus ? rawPO.bgStatus.toUpperCase() : "PENDING"} />
          </CardContent>
        </Card>
      </div>

      {/* Consignee Distribution Mapping */}
      {rawPO.consignees && rawPO.consignees.length > 0 && (
        <Card className="border border-border/80 shadow-sm">
          <CardHeader className="pb-3 bg-muted/20 border-b">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" /> Consignee Hospital Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-b text-xs text-muted-foreground uppercase">
                <tr>
                  <th className="px-4 py-2.5 text-left font-medium">Institution / Facility</th>
                  <th className="px-4 py-2.5 text-left font-medium">District</th>
                  <th className="px-4 py-2.5 text-center font-medium">Allocated Qty</th>
                  <th className="px-4 py-2.5 text-left font-medium">Delivery Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rawPO.consignees.map((c: any, idx: number) => (
                  <tr key={idx} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium text-foreground">{c.institutionName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.district || "Telangana"}</td>
                    <td className="px-4 py-3 text-center font-bold font-mono">{c.quantity}</td>
                    <td className="px-4 py-3"><StatusBadge status={c.deliveryStatus || "pending"} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Linked Consignments & Deliveries */}
      {deliveries && deliveries.length > 0 && (
        <Card className="border border-border/80 shadow-sm">
          <CardHeader className="pb-3 bg-muted/20 border-b">
            <CardTitle className="text-sm font-semibold">Active Consignments ({deliveries.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-xs text-muted-foreground uppercase">
                  <th className="px-4 py-3 text-left font-medium">Tracking QR</th>
                  <th className="px-4 py-3 text-left font-medium">Consignee Facility</th>
                  <th className="px-4 py-3 text-center font-medium">Quantity</th>
                  <th className="px-4 py-3 text-center font-medium">Delivery Status</th>
                  <th className="px-4 py-3 text-center font-medium">QA Score</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {deliveries.map((d) => (
                  <tr key={d.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <Link href={`/deliveries/${d.id}`}>
                        <span className="font-mono text-xs font-semibold text-primary hover:underline">{d.qrCode}</span>
                      </Link>
                    </td>
                    <td className="px-4 py-3">{d.facilityName}</td>
                    <td className="px-4 py-3 text-center font-mono font-bold">{d.quantity}</td>
                    <td className="px-4 py-3 text-center"><StatusBadge status={d.status} /></td>
                    <td className="px-4 py-3 text-center font-mono">{d.qaComplianceScore != null ? `${d.qaComplianceScore}%` : "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/deliveries/${d.id}`}>
                        <Button variant="outline" size="sm" className="h-7 text-xs">View Inspection</Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Statutory Amendments History */}
      {rawPO.amendments && rawPO.amendments.length > 0 && (
        <Card className="border border-border/80 shadow-sm">
          <CardHeader className="pb-3 bg-muted/20 border-b">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <History className="h-4 w-4 text-muted-foreground" /> Statutory Amendment Log ({rawPO.amendments.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-xs">
              <thead className="bg-muted/30 border-b text-muted-foreground uppercase">
                <tr>
                  <th className="px-4 py-2.5 text-left">Amendment Ref</th>
                  <th className="px-4 py-2.5 text-left">Type</th>
                  <th className="px-4 py-2.5 text-left">Justification</th>
                  <th className="px-4 py-2.5 text-left">Authorized By</th>
                  <th className="px-4 py-2.5 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rawPO.amendments.map((a: any, idx: number) => (
                  <tr key={idx} className="hover:bg-muted/20">
                    <td className="px-4 py-2.5 font-mono font-semibold text-primary">{a.amendmentRef}</td>
                    <td className="px-4 py-2.5 uppercase font-medium">{a.amendmentType?.replace("_", " ")}</td>
                    <td className="px-4 py-2.5">{a.description}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{a.requestedBy || "Procurement Officer"}</td>
                    <td className="px-4 py-2.5 text-right text-muted-foreground">{a.requestedDate ? format(new Date(a.requestedDate), "dd MMM yyyy") : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Action Toolbar */}
      <Card className="border border-border/80 shadow-sm">
        <CardHeader className="pb-3 bg-muted/20 border-b">
          <CardTitle className="text-sm font-semibold">Statutory Actions</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-center gap-3">
            {po.status === "approved" && (
              <>
                <Link href="/deliveries">
                  <Button variant="outline" className="gap-2">
                    <Building2 className="h-4 w-4" /> Create Delivery Record
                  </Button>
                </Link>
                <Button variant="outline" className="gap-2" onClick={() => setAmendOpen(true)}>
                  <RotateCcw className="h-4 w-4" /> Request PO Amendment (v{(rawPO.version || 1) + 1})
                </Button>
              </>
            )}

            {(role === "admin" || role === "tgmsidc_user" || role === "executive_director" || role === "so_equipment") && (
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => {
                  setPaymentForm({
                    paymentStatus: rawPO.paymentStatus || "paid",
                    paymentReference: rawPO.paymentReference || "",
                    paymentDate: rawPO.paymentDate ? new Date(rawPO.paymentDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
                    paymentAmount: rawPO.paymentAmount || po.totalAmount,
                    paidBy: rawPO.paidBy || "Accounts Officer",
                    paymentRemarks: rawPO.paymentRemarks || "",
                  });
                  setPaymentOpen(true);
                }}
              >
                <CreditCard className="h-4 w-4 text-emerald-700" /> Record Payment Status
              </Button>
            )}

            {po.status !== "cancelled" && (role === "admin" || role === "gm_equipment") && (
              <Button variant="destructive" onClick={() => setCancelOpen(true)} className="ml-auto">
                Cancel PO
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Record Payment Dialog (Scope Boundary) */}
      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleRecordPayment}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-emerald-700" /> Record Manual Payment Status
              </DialogTitle>
              <DialogDescription className="text-xs">
                Per Process Book §0, disbursement occurs via Treasury. Enter the transaction UTR number and date for official records.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Payment Status</Label>
                <Select
                  value={paymentForm.paymentStatus}
                  onValueChange={(v) => setPaymentForm(f => ({ ...f, paymentStatus: v }))}
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paid">Paid (Full Disbursement)</SelectItem>
                    <SelectItem value="partial">Partially Paid (Stage Payment)</SelectItem>
                    <SelectItem value="not_paid">Not Paid (Pending Clearance)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Payment Reference / UTR No *</Label>
                <Input
                  placeholder="e.g. UTR-2026-HDFC-991823 or CHQ-00219"
                  value={paymentForm.paymentReference}
                  onChange={(e) => setPaymentForm(f => ({ ...f, paymentReference: e.target.value }))}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Payment Date</Label>
                  <Input
                    type="date"
                    value={paymentForm.paymentDate}
                    onChange={(e) => setPaymentForm(f => ({ ...f, paymentDate: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Disbursed Amount (₹)</Label>
                  <Input
                    type="number"
                    value={paymentForm.paymentAmount || po.totalAmount}
                    onChange={(e) => setPaymentForm(f => ({ ...f, paymentAmount: Number(e.target.value) }))}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Paying Authority / Officer</Label>
                <Input
                  value={paymentForm.paidBy}
                  onChange={(e) => setPaymentForm(f => ({ ...f, paidBy: e.target.value }))}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Remarks / Voucher Ref</Label>
                <Textarea
                  placeholder="Additional treasury remarks, voucher numbers, or deduction details..."
                  value={paymentForm.paymentRemarks}
                  onChange={(e) => setPaymentForm(f => ({ ...f, paymentRemarks: e.target.value }))}
                  rows={2}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPaymentOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={paymentSubmitting} className="bg-[#186812] hover:bg-[#124e0d] text-white">
                {paymentSubmitting ? "Recording..." : "Save Payment Record"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* PO Amendment Dialog */}
      <Dialog open={amendOpen} onOpenChange={setAmendOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleAmendPO}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <RotateCcw className="h-5 w-5 text-primary" /> Request PO Amendment (v{(rawPO.version || 1) + 1})
              </DialogTitle>
              <DialogDescription className="text-xs">
                Record a formal statutory amendment to this purchase order per Process Book §7.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Amendment Type</Label>
                <Select
                  value={amendForm.amendmentType}
                  onValueChange={(v) => setAmendForm(f => ({ ...f, amendmentType: v }))}
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quantity_adjustment">Quantity Adjustment</SelectItem>
                    <SelectItem value="delivery_date_extension">Delivery Date Extension</SelectItem>
                    <SelectItem value="consignee_reallocation">Consignee Reallocation</SelectItem>
                    <SelectItem value="specification_revision">Specification Revision</SelectItem>
                    <SelectItem value="other">Other Statutory Revision</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Amendment Justification / Statutory Order *</Label>
                <Textarea
                  placeholder="Cite the competent authority approval or BFC resolution justifying this amendment..."
                  value={amendForm.description}
                  onChange={(e) => setAmendForm(f => ({ ...f, description: e.target.value }))}
                  required
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Previous Value</Label>
                  <Input
                    placeholder="e.g. Qty: 10 units"
                    value={amendForm.previousValue}
                    onChange={(e) => setAmendForm(f => ({ ...f, previousValue: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">New Value</Label>
                  <Input
                    placeholder="e.g. Qty: 12 units"
                    value={amendForm.newValue}
                    onChange={(e) => setAmendForm(f => ({ ...f, newValue: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAmendOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={amendSubmitting} className="bg-primary text-white">
                {amendSubmitting ? "Amending..." : "Create Amendment Snapshot"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Review Dialog */}
      <Dialog open={!!reviewAction} onOpenChange={(open) => !open && setReviewAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewAction === "recommend_approve" ? "Recommend Approval" :
               reviewAction === "recommend_reject" ? "Recommend Rejection" :
               reviewAction === "return" ? "Return for Modification" :
               reviewAction === "so_approve" ? "Approve Purchase Order" :
               reviewAction === "so_return" ? "Return Purchase Order" :
               reviewAction === "so_reject" ? "Reject Purchase Order" : "Action"}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label>Comments (Optional for Approve, Required for Return/Reject)</Label>
            <Textarea
              className="mt-2"
              placeholder="Enter your remarks here..."
              value={reviewComments}
              onChange={(e) => setReviewComments(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewAction(null)}>Cancel</Button>
            <Button onClick={handleReviewSubmit} className="bg-primary text-white" disabled={isReviewing}>
              Confirm Action
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Cancel Purchase Order</DialogTitle></DialogHeader>
          <div className="py-2">
            <Textarea
              placeholder="Reason for cancellation (required for statutory audit trail)..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelOpen(false)}>Back</Button>
            <Button variant="destructive" onClick={handleCancel} disabled={cancelPO.isPending || !cancelReason.trim()}>
              {cancelPO.isPending ? "Cancelling..." : "Confirm Cancellation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Acknowledge PO Dialog */}
      <Dialog open={ackOpen} onOpenChange={setAckOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Acknowledge Purchase Order: {po.poNumber}</DialogTitle>
            <DialogDescription className="text-xs">
              Commit expected supply dispatch timeline in compliance with 7-day SLA.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="p-3 bg-muted/40 rounded-lg text-xs space-y-1">
              <div><span className="font-semibold">Equipment:</span> {po.equipmentName}</div>
              <div><span className="font-semibold">Quantity:</span> {po.quantity} units</div>
              <div><span className="font-semibold">Total Value:</span> ₹{(po.totalAmount || 0).toLocaleString("en-IN")}</div>
              <div><span className="font-semibold">Consignee:</span> {po.deliveryAddress || "Consignee Hospital"}</div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Committed Expected Dispatch Date *</Label>
              <Input
                type="date"
                value={ackExpectedDispatchDate}
                onChange={e => setAckExpectedDispatchDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Supplier Acknowledgement Remarks</Label>
              <Textarea
                value={ackRemarks}
                onChange={e => setAckRemarks(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={ackSubmitting} onClick={() => setAckOpen(false)}>Cancel</Button>
            <Button onClick={handleAcknowledgePO} disabled={ackSubmitting} className="bg-[#186812] hover:bg-[#124e0d] text-white">
              {ackSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
              {ackSubmitting ? "Recording Acknowledgement (2–3s)..." : "Submit Acknowledgement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dispatch Dialog */}
      <Dialog open={dispatchOpen} onOpenChange={setDispatchOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <form onSubmit={handleCreateDispatch}>
            <DialogHeader>
              <DialogTitle>Create Consignment Dispatch — {po.poNumber}</DialogTitle>
              <DialogDescription className="text-xs">
                Transmit dispatch and transporter consignment details to hospital consignee and Procurement Division.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Dispatched Quantity</Label>
                  <Input
                    type="number"
                    value={dispatchForm.quantity}
                    onChange={e => setDispatchForm({ ...dispatchForm, quantity: Number(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Delivery Challan No.</Label>
                  <Input
                    placeholder="e.g. DC/2025/089"
                    value={dispatchForm.challanNumber}
                    onChange={e => setDispatchForm({ ...dispatchForm, challanNumber: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Tax Invoice Number</Label>
                  <Input
                    placeholder="e.g. INV/2025-26/102"
                    value={dispatchForm.invoiceNumber}
                    onChange={e => setDispatchForm({ ...dispatchForm, invoiceNumber: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">LR / GR / Consignment No.</Label>
                  <Input
                    placeholder="e.g. LR-7890123"
                    value={dispatchForm.lrGrNumber}
                    onChange={e => setDispatchForm({ ...dispatchForm, lrGrNumber: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Transporter Name</Label>
                  <Input
                    value={dispatchForm.transporterName}
                    onChange={e => setDispatchForm({ ...dispatchForm, transporterName: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Vehicle Registration No.</Label>
                  <Input
                    value={dispatchForm.transporterVehicle}
                    onChange={e => setDispatchForm({ ...dispatchForm, transporterVehicle: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Serial Numbers (comma-separated)</Label>
                <Input
                  value={dispatchForm.serialNumbers}
                  onChange={e => setDispatchForm({ ...dispatchForm, serialNumbers: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" disabled={dispatchSubmitting} onClick={() => setDispatchOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={dispatchSubmitting} className="bg-[#186812] hover:bg-[#124e0d] text-white">
                {dispatchSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                {dispatchSubmitting ? "Transmitting Dispatch to DB (2–3s)..." : "Confirm & Transmit Dispatch"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Statutory 2-Tranche Payment Release Dialog */}
      {payTrancheModal && (
        <Dialog open={true} onOpenChange={() => setPayTrancheModal(null)}>
          <DialogContent className="max-w-md">
            <form onSubmit={handleReleaseTranchePayment}>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <IndianRupee className="h-5 w-5 text-emerald-700" />
                  {payTrancheModal.tranche === "tranche1_90" ? "Release 90% Payment (Tranche 1)" : "Release 10% Retention (Tranche 2)"}
                </DialogTitle>
                <DialogDescription className="text-xs">
                  {payTrancheModal.tranche === "tranche1_90"
                    ? "Release 90% of total order value upon verified delivery, QA clearance, and statutory documents."
                    : "Release final 10% retention upon completion of 3 months satisfactory clinical hospital usage."}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-3 text-xs">
                <div className="p-3 bg-muted/40 rounded-lg space-y-1">
                  <div><span className="font-semibold">PO Number:</span> {po.poNumber}</div>
                  <div><span className="font-semibold">Vendor:</span> {po.vendorName}</div>
                  <div><span className="font-semibold">Total PO Value:</span> ₹{(po.totalAmount || 0).toLocaleString("en-IN")}</div>
                  <div className="pt-1 border-t text-sm font-bold text-emerald-800">
                    Release Amount: ₹{payTrancheModal.tranche === "tranche1_90"
                      ? Math.round((po.totalAmount || 0) * 0.9).toLocaleString("en-IN")
                      : ((po.totalAmount || 0) - Math.round((po.totalAmount || 0) * 0.9)).toLocaleString("en-IN")}
                    <span className="text-xs font-normal text-slate-500 ml-1.5">
                      ({payTrancheModal.tranche === "tranche1_90" ? "90% of Total" : "10% Retention"})
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Treasury / Bank UTR Reference Number *</Label>
                  <Input
                    value={payTrancheForm.reference}
                    onChange={e => setPayTrancheForm(f => ({ ...f, reference: e.target.value }))}
                    placeholder="e.g. UTR-SBIN-12345678"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Disbursement Date</Label>
                    <Input
                      type="date"
                      value={payTrancheForm.date}
                      onChange={e => setPayTrancheForm(f => ({ ...f, date: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Authorizing Officer</Label>
                    <Input
                      value={payTrancheForm.paidBy}
                      onChange={e => setPayTrancheForm(f => ({ ...f, paidBy: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Statutory Accounting Remarks</Label>
                  <Textarea
                    value={payTrancheForm.remarks}
                    onChange={e => setPayTrancheForm(f => ({ ...f, remarks: e.target.value }))}
                    rows={2}
                    required
                  />
                </div>

                <div className="p-2.5 bg-emerald-50/70 border border-emerald-200 rounded text-emerald-950 text-[11px]">
                  {payTrancheModal.tranche === "tranche1_90" ? (
                    <span>✓ Certified that DCC, QA Inspection, and Tax Invoices have been verified. 10% will be held as 3-month usage retention.</span>
                  ) : (
                    <span>✓ Certified that 3 months of satisfactory hospital usage have elapsed and QPC has been verified by the facility.</span>
                  )}
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" disabled={payTrancheSubmitting} onClick={() => setPayTrancheModal(null)}>Cancel</Button>
                <Button
                  type="submit"
                  disabled={payTrancheSubmitting}
                  className={payTrancheModal.tranche === "tranche1_90" ? "bg-[#186812] hover:bg-[#124e0d] text-white" : "bg-blue-700 hover:bg-blue-800 text-white"}
                >
                  {payTrancheSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                  {payTrancheSubmitting ? "Releasing Payment to DB (2–3s)..." : `Confirm & Release ${payTrancheModal.tranche === "tranche1_90" ? "90% (T1)" : "10% Retention (T2)"}`}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function DR({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start py-1 border-b border-muted/50 last:border-0">
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      <span className="text-xs font-medium text-foreground text-right ml-4 font-mono">{value}</span>
    </div>
  );
}
