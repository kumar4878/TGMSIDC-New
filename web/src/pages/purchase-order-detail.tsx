import { useRoute, Link } from "wouter";
import {
  useGetPurchaseOrder,
  getGetPurchaseOrderQueryKey,
  useApprovePurchaseOrder,
  useCancelPurchaseOrder,
  useListDeliveries,
  getListDeliveriesQueryKey,
  useGetRateContract,
  useGetIndent,
} from "@/lib/api-hooks";
import {
  updatePOPaymentStatus,
  amendPurchaseOrder,
  issuePO,
  checkPOClosureEligibility,
  closePO,
  releasePOPayment,
  acknowledgePurchaseOrder,
  createDelivery,
  submitPOForApproval,
  gmReviewPO,
  updatePurchaseOrder,
} from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/StatusBadge";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, IndianRupee, ShieldCheck, CreditCard, CheckCircle2, Clock,
  AlertTriangle, FileText, Building2, History, RotateCcw, Wrench, Truck,
  Upload, Loader2, CheckCheck, Lock, ExternalLink, Send, Package, Pencil, Save
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { useState, useEffect } from "react";
import { ProductSpecSheet } from "@/components/ProductSpecSheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

function safeFormatDate(dateVal: any, pattern = "dd MMM yyyy"): string {
  if (!dateVal) return "—";
  try {
    const dt = dateVal instanceof Date ? dateVal : new Date(dateVal);
    if (isNaN(dt.getTime())) return "—";
    return format(dt, pattern);
  } catch {
    return "—";
  }
}

export default function PurchaseOrderDetail(props?: { id?: string }) {
  const [, params] = useRoute("/purchase-orders/:id");
  const id = (props?.id || params?.id || "");
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const role = user?.role || "tgmsidc_user";

  const { data: po, isLoading } = useGetPurchaseOrder(id, { query: { enabled: !!id, queryKey: getGetPurchaseOrderQueryKey(id) } });
  const rawPO = (po ?? {}) as any;
  const { data: deliveries } = useListDeliveries({ poId: id }, { query: { enabled: !!id, queryKey: getListDeliveriesQueryKey({ poId: id }) } });
  const { data: linkedRc } = useGetRateContract(po?.rateContractId || "", { query: { enabled: !!po?.rateContractId } });
  const { data: linkedIndent } = useGetIndent(po?.indentId || "", { query: { enabled: !!po?.indentId } });
  const approvePO = useApprovePurchaseOrder();
  const cancelPO = useCancelPurchaseOrder();

  // Ensure PO detail view always starts at the top (starting details) when opened
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    const mainEl = document.getElementById("main-scroll-container") || document.querySelector("main");
    if (mainEl) {
      mainEl.scrollTo({ top: 0, left: 0, behavior: "instant" });
      mainEl.scrollTop = 0;
    }
  }, [id, isLoading]);

  const [submitNextLevelLoading, setSubmitNextLevelLoading] = useState(false);
  const [gmReviewLoading, setGmReviewLoading] = useState(false);
  const [gmRemarks, setGmRemarks] = useState("Reviewed both Rate Contract and Purchase Order details. Pricing, item specifications, and hospital consignee verified. Approved for official procurement.");

  // Modals
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

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

  // Issue PO Dialog & State
  const [issuePODialog, setIssuePODialog] = useState(false);
  const [issuePORemarks, setIssuePORemarks] = useState("Official purchase order issued to empanelled vendor.");
  const [issuingPO, setIssuingPO] = useState(false);

  // Edit PO Items State (for Draft PO)
  const [editItemsOpen, setEditItemsOpen] = useState(false);
  const [editItemsList, setEditItemsList] = useState<any[]>([]);
  const [savingItems, setSavingItems] = useState(false);
  const [activeSpecItemIndex, setActiveSpecItemIndex] = useState(0);

  // PO Closure Checklist & State
  const [closureCheckResult, setClosureCheckResult] = useState<any>(null);
  const [checkingClosure, setCheckingClosure] = useState(false);
  const [closePODialog, setClosePODialog] = useState(false);
  const [closureRemarks, setClosureRemarks] = useState("All 7 statutory closure conditions met and verified.");
  const [closingPO, setClosingPO] = useState(false);

  async function handleIssuePO() {
    setIssuingPO(true);
    try {
      await issuePO(id, {
        remarks: issuePORemarks,
        issuedBy: user?.fullName || "TGMSIDC User",
      });
      queryClient.invalidateQueries({ queryKey: getGetPurchaseOrderQueryKey(id) });
      setIssuePODialog(false);
      toast({ title: "Purchase Order Issued", description: "PO transmitted to vendor. Awaiting 7-day acknowledgement SLA." });
    } catch (err: any) {
      toast({ title: "Failed to Issue PO", description: err.message, variant: "destructive" });
    } finally {
      setIssuingPO(false);
    }
  }

  async function handleCheckClosureEligibility() {
    setCheckingClosure(true);
    try {
      const res = await checkPOClosureEligibility(id);
      setClosureCheckResult(res);
      toast({
        title: res.eligible ? "Eligible for PO Closure" : "Closure Criteria Pending",
        description: res.eligible ? "All 7 statutory conditions satisfied." : `${res.reasons?.length || 0} criteria pending.`,
      });
    } catch (err: any) {
      toast({ title: "Check Failed", description: err.message, variant: "destructive" });
    } finally {
      setCheckingClosure(false);
    }
  }

  async function handleClosePO() {
    setClosingPO(true);
    try {
      await closePO(id, {
        remarks: closureRemarks,
        officerName: user?.fullName || "TGMSIDC Officer",
      });
      queryClient.invalidateQueries({ queryKey: getGetPurchaseOrderQueryKey(id) });
      setClosePODialog(false);
      toast({ title: "Purchase Order Closed", description: "PO marked as closed and archived." });
    } catch (err: any) {
      toast({ title: "Closure Failed", description: err.message, variant: "destructive" });
    } finally {
      setClosingPO(false);
    }
  }

  if (isLoading) return <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 rounded-full border-4 border-primary border-t-transparent" /></div>;
  if (!po) return <div className="text-center py-20 text-muted-foreground">PO not found</div>;

  async function handleApproveForNextLevel() {
    try {
      setSubmitNextLevelLoading(true);
      await submitPOForApproval(id, {
        submittedBy: user?.fullName || "TGMSIDC User",
        remarks: "Validated against Rate Contract and submitted for GM Equipment scrutiny.",
      });
      queryClient.invalidateQueries({ queryKey: getGetPurchaseOrderQueryKey(id) });
      queryClient.invalidateQueries({ queryKey: ["/purchase-orders"] });
      toast({
        title: "Submitted for Next Level",
        description: `Purchase Order ${po.poNumber} forwarded to General Manager (Equipment) for scrutiny & approval.`,
      });
    } catch (err: any) {
      toast({
        title: "Submission Failed",
        description: err.message || "Failed to forward PO for approval",
        variant: "destructive",
      });
    } finally {
      setSubmitNextLevelLoading(false);
    }
  }

  async function handleGMDecision(action: "approve" | "return" | "reject") {
    if ((action === "return" || action === "reject") && !gmRemarks.trim()) {
      toast({
        title: "Remarks Required",
        description: "Please provide mandatory remarks explaining the return/rejection reason.",
        variant: "destructive",
      });
      return;
    }
    try {
      setGmReviewLoading(true);
      await gmReviewPO(id, {
        action,
        comments: gmRemarks,
        reviewedBy: user?.fullName || "GM Equipment",
      });
      queryClient.invalidateQueries({ queryKey: getGetPurchaseOrderQueryKey(id) });
      queryClient.invalidateQueries({ queryKey: ["/purchase-orders"] });
      toast({
        title: action === "approve" ? "PO Approved by GM Equipment" : action === "return" ? "PO Returned" : "PO Rejected",
        description: action === "approve"
          ? `Purchase Order ${po.poNumber} approved by GM Equipment. Official PO is now authorized for vendor issuance.`
          : `Purchase Order ${po.poNumber} has been ${action}ed with remarks.`,
      });
    } catch (err: any) {
      toast({
        title: "Action Failed",
        description: err.message || "Could not complete GM review action",
        variant: "destructive",
      });
    } finally {
      setGmReviewLoading(false);
    }
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
        paymentStatus: paymentForm.paymentStatus as "paid" | "not_paid",
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
  const poDateRaw = po?.poDate ? new Date(po.poDate) : (po?.createdAt ? new Date(po.createdAt) : new Date());
  const poDate = isNaN(poDateRaw.getTime()) ? new Date() : poDateRaw;
  const daysSincePO = !isNaN(poDate.getTime()) ? differenceInDays(new Date(), poDate) : 0;
  const ackOverdue = !rawPO?.vendorAcknowledged && daysSincePO > 7;

  const totalAmount = po?.totalAmount || 0;
  const t1Amount = rawPO.tranche1Amount || Math.round(totalAmount * 0.9);
  const t2Amount = totalAmount - t1Amount;
  const isT1Paid = rawPO.tranche1Paid || rawPO.paymentStatus === "paid" || rawPO.paymentStatus === "partial";
  const isT2Paid = rawPO.tranche2Paid || (rawPO.paymentStatus === "paid" && rawPO.status === "completed");

  const poItems = (po?.items && po.items.length > 0)
    ? po.items
    : [{
        equipmentId: po?.equipmentId,
        equipmentName: po?.equipmentName || "Medical Equipment",
        rateContractId: po?.rateContractId,
        rcNumber: rawPO.rcNumber,
        quantity: po?.quantity || 1,
        unitPrice: po?.unitPrice || 0,
        gstRate: po?.gstRate || 12,
        gstAmount: Math.round(((po?.unitPrice || 0) * (po?.quantity || 1) * (po?.gstRate || 12)) / 100),
        unitPriceInclTax: Math.round((po?.unitPrice || 0) * (1 + (po?.gstRate || 12) / 100)),
        totalAmount: po?.totalAmount || 0,
        specifications: rawPO.specifications || "",
      }];

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
              <Badge variant="outline" className="text-xs bg-slate-50 text-slate-700 border-slate-200">
                Tier {rawPO.vendorTier} ({rawPO.allocationRatio || "100%"})
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Issued on {safeFormatDate(poDate, "dd MMM yyyy")} · Indent #{rawPO.indentNumber || "Requisition"} · RC #{rawPO.rcNumber || "Contract"}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <StatusBadge status={rawPO.approvalStatus === "pending_gm_approval" ? "pending_approval" : po.status} />
          {(rawPO.approvalStatus === "pending_gm_approval" || po.status === "pending_approval") && (
            <Button
              size="sm"
              onClick={() => handleGMDecision("approve")}
              disabled={gmReviewLoading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 shadow-xs cursor-pointer"
            >
              {gmReviewLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              Approve PO (GM)
            </Button>
          )}
          {(po.status === "approved" || po.status === "po_approved") && (
            <Button
              size="sm"
              onClick={() => setIssuePODialog(true)}
              className="text-xs gap-1.5 shadow-xs cursor-pointer"
            >
              <Send className="h-3.5 w-3.5" />
              Issue PO to Vendor
            </Button>
          )}
        </div>
      </div>

      {/* Scope Boundary Mandate Callout (Process Book §0) */}
      <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 text-xs text-slate-800 flex items-start gap-3 shadow-xs">
        <CreditCard className="h-5 w-5 text-slate-600 shrink-0 mt-0.5" />
        <div className="flex-1">
          <span className="font-semibold text-slate-900">Scope Boundary Mandate: </span>
          Payment disbursement, invoice matching, and treasury transfers are processed outside the platform via IFMIS/Treasury.
          Accounts records a manual <strong>Paid / Not-Paid</strong> status and reference number (UTR / Cheque No) against this PO for official fulfillment records.
        </div>
        <Button
          size="sm"
          variant="outline"
          className="border-slate-300 text-slate-800 hover:bg-slate-100 shrink-0 shadow-xs"
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

      {/* ── Draft PO Workflow Banner (Integrated with Indent Approval Workflow) ── */}
      {(po.status === "draft" || rawPO.approvalStatus === "draft") && rawPO.approvalStatus !== "pending_gm_approval" && po.status !== "approved" && (
        <Card className="border border-blue-200 bg-blue-50/50 shadow-xs">
          <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <FileText className="h-4 w-4 text-blue-600" />
                <span className="font-semibold text-xs text-slate-900">
                  Draft Purchase Order Linked to Indent #{rawPO.indentNumber || linkedIndent?.indentNumber || "Requisition"}
                </span>
                <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-800 border-amber-300">
                  Draft PO Stage
                </Badge>
                {rawPO.rcNumber && (
                  <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-700 border-purple-200">
                    RC #{rawPO.rcNumber}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                This Purchase Order has been drafted and tagged to Indent #{rawPO.indentNumber || linkedIndent?.indentNumber}. It is undergoing administrative review and scrutiny by <strong>GM (Equipment)</strong> and <strong>SO (Equipment)</strong> within the Indent Approval Workflow. Once the <strong>Executive Director (ED)</strong> accords final sanction to the Indent, this Purchase Order will automatically transition to <strong>PO Issued</strong>.
              </p>
            </div>
            {(rawPO.indentId || rawPO.indentNumber) && (
              <Link href={`/indents/${rawPO.indentId || rawPO.indentNumber}`}>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs gap-1.5 shrink-0 bg-white border-blue-300 text-blue-800 hover:bg-blue-50 cursor-pointer shadow-xs"
                >
                  <ExternalLink className="h-3.5 w-3.5 text-blue-600" />
                  View Indent Approval Workflow
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── GM Equipment Review & Approval Console (Dual RC & PO Scrutiny) ── */}
      {(rawPO.approvalStatus === "pending_gm_approval" || po.status === "pending_approval") && (
        <Card className="border-2 border-indigo-200 bg-gradient-to-r from-indigo-50/60 via-purple-50/40 to-slate-50 shadow-sm">
          <CardHeader className="pb-3 border-b border-indigo-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-indigo-700 shrink-0" />
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900">
                    GM Equipment Scrutiny &amp; Statutory Approval Console
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-600">
                    Process Book Step 5: Dual scrutiny of Rate Contract validity and Purchase Order allocation before procurement authorization.
                  </CardDescription>
                </div>
              </div>
              <Badge className="bg-amber-100 text-amber-800 border-amber-300 self-start sm:self-auto text-xs">
                Awaiting GM Approval
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            {/* Dual Panel Comparison */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Panel 1: Rate Contract Scrutiny */}
              <div className="p-3.5 bg-white rounded-lg border border-indigo-100 shadow-2xs space-y-2.5">
                <div className="flex items-center justify-between border-b pb-2">
                  <div className="flex items-center gap-1.5">
                    <FileText className="h-4 w-4 text-indigo-600" />
                    <span className="font-semibold text-xs text-slate-900">1. Rate Contract (RC) Verification</span>
                  </div>
                  <Badge variant="outline" className="text-[10px] bg-indigo-50 text-indigo-700 border-indigo-200 font-mono">
                    {rawPO.rcNumber || linkedRc?.rcNumber || "RC-VERIFIED"}
                  </Badge>
                </div>
                <div className="space-y-1.5 text-xs text-slate-700">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Contract Reference:</span>
                    <span className="font-medium font-mono">{rawPO.rcNumber || linkedRc?.rcNumber || "RC-2024-EQ-001"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Tender Reference:</span>
                    <span className="font-medium font-mono text-right">{linkedRc?.tenderRef || "TGMSIDC/MED-EQ/2024-25"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Empanelled Vendor:</span>
                    <span className="font-semibold text-slate-900">{po.vendorName || linkedRc?.vendorName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Contracted Unit Rate:</span>
                    <span className="font-mono font-medium">₹{(linkedRc?.unitPrice || Math.round(po.totalAmount / (po.quantity || 1) / 1.12)).toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">GST &amp; Landed Price:</span>
                    <span className="font-mono font-medium">{linkedRc?.gstPercent || 12}% GST (₹{(linkedRc?.landedPrice || Math.round(po.totalAmount / (po.quantity || 1))).toLocaleString("en-IN")}/unit)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Validity &amp; SLA:</span>
                    <span className="font-medium text-emerald-700">Valid Contract · 45 Days Supply SLA</span>
                  </div>
                </div>
              </div>

              {/* Panel 2: Purchase Order & Consignee Scrutiny */}
              <div className="p-3.5 bg-white rounded-lg border border-purple-100 shadow-2xs space-y-2.5">
                <div className="flex items-center justify-between border-b pb-2">
                  <div className="flex items-center gap-1.5">
                    <Building2 className="h-4 w-4 text-purple-600" />
                    <span className="font-semibold text-xs text-slate-900">2. Purchase Order &amp; Allocation</span>
                  </div>
                  <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-700 border-purple-200 font-mono">
                    {po.poNumber}
                  </Badge>
                </div>
                <div className="space-y-1.5 text-xs text-slate-700">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Source Indent:</span>
                    <span className="font-medium font-mono">Indent #{rawPO.indentNumber || linkedIndent?.indentNumber || "Requisition"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">{poItems.length > 1 ? "Consolidated Items:" : "Equipment Item:"}</span>
                    <span className="font-semibold text-slate-900 text-right">
                      {poItems.length > 1
                        ? `${poItems.length} Items (${poItems.map(i => i.equipmentName).join(", ")})`
                        : (po.equipmentName || rawPO.itemDescription || "Medical Equipment")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Allocated Quantity:</span>
                    <span className="font-mono font-bold text-slate-900">{po.quantity || 1} Total Unit(s)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Consignee Facility:</span>
                    <span className="font-medium text-right text-slate-800">{rawPO.consignees?.[0]?.institutionName || linkedIndent?.consigneeFacility || "Gandhi Hospital"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Total Sanction Amount:</span>
                    <span className="font-bold font-mono text-emerald-700">₹{(po.totalAmount || 0).toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Warranty &amp; CAMC:</span>
                    <span className="font-medium text-blue-700">3-Yr Warranty + 5-Yr CAMC Committed</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Scrutiny Checklist */}
            <div className="p-3 bg-slate-50/80 rounded-lg border border-slate-200 text-xs space-y-1.5">
              <span className="font-semibold text-slate-900 block">GM Scrutiny Checklist &amp; Concurrence:</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span>Rate Contract rate ceiling and validity confirmed</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span>Technical specs match Indent sanction order</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span>Consignee institution site readiness noted</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span>Budget head and financial concurrence valid</span>
                </div>
              </div>
            </div>

            {/* GM Remarks & Action Buttons */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-800">General Manager (Equipment) Remarks / Scrutiny Order</Label>
              <Textarea
                value={gmRemarks}
                onChange={(e) => setGmRemarks(e.target.value)}
                rows={2}
                placeholder="Enter GM scrutiny observations and approval order..."
                className="text-xs bg-white"
              />
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 pt-1 border-t border-indigo-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleGMDecision("return")}
                disabled={gmReviewLoading}
                className="border-amber-300 text-amber-800 hover:bg-amber-50 text-xs gap-1.5"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Return for Clarification
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleGMDecision("reject")}
                disabled={gmReviewLoading}
                className="border-rose-300 text-rose-800 hover:bg-rose-50 text-xs gap-1.5"
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                Reject PO
              </Button>
              <Button
                size="sm"
                onClick={() => handleGMDecision("approve")}
                disabled={gmReviewLoading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 shadow-sm"
              >
                {gmReviewLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                Approve PO &amp; Authorize Issuance
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Approved PO Ready for Vendor Transmission ── */}
      {(po.status === "approved" || po.status === "po_approved") && (
        <Card className="border border-emerald-200 bg-emerald-50/40 shadow-xs">
          <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span className="font-semibold text-xs text-slate-900">Purchase Order Approved by GM Equipment — Ready for Transmission</span>
                <Badge variant="outline" className="text-[10px] bg-emerald-100 text-emerald-800 border-emerald-300">
                  GM Approved
                </Badge>
              </div>
              <p className="text-xs text-slate-600">
                Statutory dual scrutiny of Rate Contract and Purchase Order completed. Transmit this Purchase Order to <strong>{po.vendorName}</strong> to initiate supplier fulfilment and 7-day acknowledgement SLA.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => setIssuePODialog(true)}
              className="text-xs gap-1.5 shadow-xs shrink-0 cursor-pointer"
            >
              <Send className="h-3.5 w-3.5" />
              Issue PO to Vendor (Transmit)
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Fulfilment Status & Delivery Statistics Bar */}
      <Card className="border border-border/80 shadow-sm">
        <CardHeader className="pb-3 bg-muted/20 border-b flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Truck className="h-4 w-4 text-primary" /> Delivery &amp; Fulfilment Statistics
          </CardTitle>
          <Badge className={
            rawPO.fulfilmentStatus === "completely_fulfilled" ? "bg-emerald-100 text-emerald-800 border-emerald-300" :
            rawPO.fulfilmentStatus === "completely_fulfilled_dcc_pending" ? "bg-blue-100 text-blue-800 border-blue-300" :
            rawPO.fulfilmentStatus === "partially_fulfilled" ? "bg-amber-100 text-amber-800 border-amber-300" :
            rawPO.fulfilmentStatus === "excess_delivery_review" ? "bg-red-100 text-red-800 border-red-300" :
            "bg-slate-100 text-slate-700 border-slate-300"
          }>
            {rawPO.fulfilmentStatus === "completely_fulfilled" ? "100% COMPLETELY FULFILLED" :
             rawPO.fulfilmentStatus === "completely_fulfilled_dcc_pending" ? "ACCEPTED — DCC VERIFICATION PENDING" :
             rawPO.fulfilmentStatus === "partially_fulfilled" ? "PARTIALLY FULFILLED" :
             rawPO.fulfilmentStatus === "excess_delivery_review" ? "EXCESS DELIVERY REVIEW" :
             "NOT FULFILLED"}
          </Badge>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-center">
            <div className="p-3 bg-slate-50 border rounded-lg">
              <span className="text-[10.5px] text-muted-foreground block uppercase font-medium">Ordered Qty</span>
              <span className="text-base font-bold font-mono text-slate-900">{po.quantity ?? 1}</span>
            </div>
            <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-lg">
              <span className="text-[10.5px] text-emerald-800 block uppercase font-medium">Accepted Qty</span>
              <span className="text-base font-bold font-mono text-emerald-700">{rawPO.cumulativeAcceptedQuantity ?? 0}</span>
            </div>
            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg">
              <span className="text-[10.5px] text-amber-800 block uppercase font-medium">Returned Qty</span>
              <span className="text-base font-bold font-mono text-amber-700">{rawPO.cumulativeReturnedQuantity ?? 0}</span>
            </div>
            <div className="p-3 bg-red-50/70 border border-red-200 rounded-lg">
              <span className="text-[10.5px] text-red-800 block uppercase font-medium">Rejected Qty</span>
              <span className="text-base font-bold font-mono text-red-700">{rawPO.cumulativeRejectedQuantity ?? 0}</span>
            </div>
            <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg">
              <span className="text-[10.5px] text-blue-800 block uppercase font-medium">Fulfilled Net</span>
              <span className="text-base font-bold font-mono text-blue-700">{rawPO.fulfilledQuantity ?? 0}</span>
            </div>
            <div className="p-3 bg-slate-50 border rounded-lg">
              <span className="text-[10.5px] text-muted-foreground block uppercase font-medium">Balance Qty</span>
              <span className="text-base font-bold font-mono text-slate-900">{rawPO.balanceQuantity ?? po.quantity ?? 1}</span>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground mt-2 italic text-center">
            Fulfilled Quantity = Cumulative Accepted Receipt Qty ({rawPO.cumulativeAcceptedQuantity ?? 0}) - Returned ({rawPO.cumulativeReturnedQuantity ?? 0}) - Rejected ({rawPO.cumulativeRejectedQuantity ?? 0})
          </p>
        </CardContent>
      </Card>

      {/* PO Closure Status / Eligibility Panel (Section I Steps 71-73) */}
      <Card className="border border-slate-200 shadow-xs">
        <CardHeader className="pb-3 bg-muted/20 border-b flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Lock className="h-4 w-4 text-slate-700" /> Purchase Order Closure &amp; Contract Completion
          </CardTitle>
          <Badge variant="outline" className={po.status === "po_closed" ? "bg-slate-100 text-slate-900 border-slate-300 font-semibold" : "bg-slate-50 text-slate-700 border-slate-200"}>
            {po.status === "po_closed" ? "PO CLOSED & ARCHIVED" : "CLOSURE PENDING"}
          </Badge>
        </CardHeader>
        <CardContent className="pt-4 space-y-3 text-xs">
          {po.status === "po_closed" ? (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 space-y-1">
              <div className="flex items-center gap-2 font-semibold">
                <CheckCheck className="h-4 w-4 text-slate-700" /> This Purchase Order has been officially closed.
              </div>
              <p className="text-slate-600 text-[11px]">
                Closed by <strong>{rawPO.closedBy || "TGMSIDC Authority"}</strong> on {rawPO.closedAt ? safeFormatDate(rawPO.closedAt, "dd MMM yyyy, hh:mm a") : "—"}.
                {rawPO.closureRemarks ? ` Remarks: "${rawPO.closureRemarks}"` : ""}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-slate-600 leading-relaxed">
                A Purchase Order qualifies for official closure once all hospital deliveries are completely fulfilled, DCC physical certificates are verified, QA inspection is accepted, serialized equipment assets are registered with active warranty, and manual payment status is recorded.
              </p>
              <div className="flex gap-2 flex-wrap items-center">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCheckClosureEligibility}
                  disabled={checkingClosure}
                  className="text-xs gap-1.5 border-slate-300"
                >
                  <ShieldCheck className="h-3.5 w-3.5 text-slate-700" />
                  {checkingClosure ? "Checking Criteria..." : "Check Closure Eligibility (7-Point Audit)"}
                </Button>
                <Button
                  size="sm"
                  className="text-xs gap-1.5 shadow-xs"
                  onClick={() => setClosePODialog(true)}
                >
                  <Lock className="h-3.5 w-3.5" />
                  Close Purchase Order
                </Button>
              </div>
              {closureCheckResult && (
                <div className="p-3 bg-slate-50 border rounded-lg space-y-2 mt-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">
                      Closure Eligibility Audit: {closureCheckResult.eligible ? "ELIGIBLE" : "PENDING CRITERIA"}
                    </span>
                    <Badge variant="outline" className={closureCheckResult.eligible ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}>
                      {closureCheckResult.eligible ? "All Criteria Satisfied" : `${closureCheckResult.reasons?.length || 0} Pending Items`}
                    </Badge>
                  </div>
                  {closureCheckResult.reasons && closureCheckResult.reasons.length > 0 && (
                    <ul className="list-disc list-inside text-[11px] text-amber-800 space-y-0.5">
                      {closureCheckResult.reasons.map((r: string, i: number) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Consolidated Equipment & Line Items Schedule */}
      <Card className="border border-border/80 shadow-sm overflow-hidden">
        <CardHeader className="pb-3 bg-muted/20 border-b flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Package className="h-4 w-4 text-emerald-600" />
              Consolidated Equipment &amp; Line Items Schedule
              <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-800 border-emerald-300 font-mono">
                {poItems.length} {poItems.length === 1 ? "Item" : "Consolidated Items"}
              </Badge>
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              Empanelled Vendor: <strong className="text-slate-800">{po.vendorName}</strong> · Indent #{rawPO.indentNumber || linkedIndent?.indentNumber || "Requisition"}
            </CardDescription>
          </div>
          {(po.status === "draft" || rawPO.approvalStatus === "draft") && (
            <Button
              size="sm"
              variant="outline"
              className="text-xs gap-1.5 border-emerald-300 text-emerald-800 hover:bg-emerald-50 cursor-pointer"
              onClick={() => {
                setEditItemsList(poItems.map(it => ({ ...it })));
                setEditItemsOpen(true);
              }}
            >
              <Pencil className="h-3.5 w-3.5" />
              Update Items &amp; Quantities
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {poItems.length > 1 && (
            <div className="p-3 bg-emerald-50/70 border-b border-emerald-200 text-xs text-emerald-950 flex items-center gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>
                <strong>Shared Empanelled Vendor Identified:</strong> Multiple items from Indent #{rawPO.indentNumber || linkedIndent?.indentNumber || "Requisition"} share vendor <strong>{po.vendorName}</strong> based on their tagged Rate Contracts and have been consolidated into this single Purchase Order.
              </span>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/40 border-b text-muted-foreground uppercase">
                <tr>
                  <th className="px-4 py-2.5 text-center font-semibold w-12">#</th>
                  <th className="px-4 py-2.5 text-left font-semibold">Equipment Item Description</th>
                  <th className="px-4 py-2.5 text-left font-semibold">Rate Contract Ref</th>
                  <th className="px-4 py-2.5 text-center font-semibold">Qty</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Unit Base Rate</th>
                  <th className="px-4 py-2.5 text-center font-semibold">GST Slab</th>
                  <th className="px-4 py-2.5 text-right font-semibold">GST Amount</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Landed Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {poItems.map((item: any, idx: number) => {
                  const qty = item.quantity || 1;
                  const unitPrice = item.unitPrice || 0;
                  const gstRate = item.gstRate != null ? item.gstRate : 12;
                  const baseSubtotal = unitPrice * qty;
                  const gstAmt = item.gstAmount != null ? item.gstAmount : Math.round((baseSubtotal * gstRate) / 100);
                  const landedSubtotal = item.totalAmount != null ? item.totalAmount : baseSubtotal + gstAmt;

                  return (
                    <tr key={idx} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 text-center font-mono text-muted-foreground">{idx + 1}</td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900 text-xs">{item.equipmentName}</div>
                        {(item.category || item.department) && (
                          <div className="text-[11px] text-muted-foreground mt-0.5">
                            {item.department ? `${item.department} · ` : ""}{item.category || "Medical Equipment"}
                          </div>
                        )}
                        {item.specifications && (
                          <div className="text-[10px] text-slate-500 mt-0.5 line-clamp-1 italic">
                            {item.specifications}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {item.rateContractId ? (
                          <Link href={`/rate-contracts/${item.rateContractId}`}>
                            <Badge variant="outline" className="font-mono text-[10px] bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 cursor-pointer">
                              {item.rcNumber || "RC-LINKED"}
                            </Badge>
                          </Link>
                        ) : (
                          <span className="font-mono text-muted-foreground">{item.rcNumber || "—"}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center font-mono font-bold text-slate-900">{qty} Unit{qty > 1 ? "s" : ""}</td>
                      <td className="px-4 py-3 text-right font-mono">₹{unitPrice.toLocaleString("en-IN")}</td>
                      <td className="px-4 py-3 text-center font-mono">{gstRate}%</td>
                      <td className="px-4 py-3 text-right font-mono text-slate-600">₹{gstAmt.toLocaleString("en-IN")}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-emerald-700">₹{landedSubtotal.toLocaleString("en-IN")}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-50/90 border-t font-semibold">
                <tr>
                  <td colSpan={3} className="px-4 py-3 text-right text-slate-700">Consolidated Grand Totals:</td>
                  <td className="px-4 py-3 text-center font-mono font-bold text-slate-900">
                    {poItems.reduce((acc: number, it: any) => acc + (it.quantity || 1), 0)} Units
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-slate-700">
                    ₹{poItems.reduce((acc: number, it: any) => acc + ((it.unitPrice || 0) * (it.quantity || 1)), 0).toLocaleString("en-IN")}
                  </td>
                  <td className="px-4 py-3"></td>
                  <td className="px-4 py-3 text-right font-mono text-slate-700">
                    ₹{poItems.reduce((acc: number, it: any) => {
                      const qty = it.quantity || 1;
                      const gstRate = it.gstRate != null ? it.gstRate : 12;
                      return acc + (it.gstAmount != null ? it.gstAmount : Math.round(((it.unitPrice || 0) * qty * gstRate) / 100));
                    }, 0).toLocaleString("en-IN")}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-emerald-800 text-sm">
                    ₹{(po.totalAmount || 0).toLocaleString("en-IN")}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

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
            <DR label="Order Date" value={safeFormatDate(poDate, "dd MMM yyyy")} />
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
                  <CheckCircle2 className="h-3 w-3" /> Acknowledged {rawPO.vendorAckDate ? safeFormatDate(rawPO.vendorAckDate, "dd MMM") : ""}
                </Badge>
              ) : ackOverdue ? (
                <Badge className="bg-red-100 text-red-800 border-red-300 text-[10px] gap-1">
                  <AlertTriangle className="h-3 w-3" /> SLA Breached (&gt;7d)
                </Badge>
              ) : (
                <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px] gap-1">
                  <Clock className="h-3 w-3" /> Ack Pending ({Math.max(0, 7 - (daysSincePO || 0))}d left)
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5 pt-4">
            <DR label="Delivery Destination" value={po.deliveryAddress || "Consignee Hospital"} />
            <DR label="Contracted Supply Period" value={`${rawPO.supplyPeriodDays || 45} Calendar Days`} />
            <DR label="Expected Delivery Date" value={po.expectedDeliveryDate ? safeFormatDate(po.expectedDeliveryDate, "dd MMM yyyy") : "Not set"} />
            <DR label="Actual Delivery Date" value={po.actualDeliveryDate ? safeFormatDate(po.actualDeliveryDate, "dd MMM yyyy") : "Pending Dispatch"} />
            <DR label="Vendor Dispatch Commitment" value={rawPO.vendorExpectedDispatchDate ? safeFormatDate(rawPO.vendorExpectedDispatchDate, "dd MMM yyyy") : "Pending Confirmation"} />
            {po.cancellationReason && <DR label="Cancellation Reason" value={po.cancellationReason} />}

            {/* Lifecycle Action Buttons */}
            <div className="pt-3 border-t mt-3 flex flex-col gap-2">
              {!rawPO.vendorAcknowledged && (
                role === "vendor" ? (
                  <Button
                    size="sm"
                    className="w-full bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs shadow-sm"
                    onClick={() => {
                      const expDispatchDate = new Date();
                      expDispatchDate.setDate(expDispatchDate.getDate() + 30);
                      setAckExpectedDispatchDate(expDispatchDate.toISOString().split("T")[0]);
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
                    className="w-full text-xs shadow-sm"
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
            <Wrench className="h-4 w-4 text-primary" /> Technical Specifications ({poItems[activeSpecItemIndex]?.equipmentName || po.equipmentName})
          </CardTitle>
          <span className="text-xs text-muted-foreground">Standardized Equipment Master Specs</span>
        </CardHeader>
        {poItems.length > 1 && (
          <div className="px-4 py-2.5 flex items-center gap-2 border-b bg-muted/10 overflow-x-auto">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase shrink-0">Select Equipment:</span>
            {poItems.map((item: any, idx: number) => (
              <Button
                key={idx}
                type="button"
                variant={activeSpecItemIndex === idx ? "default" : "outline"}
                size="sm"
                className="text-xs h-7 gap-1.5 cursor-pointer shrink-0"
                onClick={() => setActiveSpecItemIndex(idx)}
              >
                <Package className="h-3 w-3" />
                {item.equipmentName}
              </Button>
            ))}
          </div>
        )}
        <CardContent className="p-4">
          <ProductSpecSheet
            equipmentId={poItems[activeSpecItemIndex]?.equipmentId || poItems[activeSpecItemIndex]?.equipmentName || po.equipmentId || po.equipmentName}
            equipmentName={poItems[activeSpecItemIndex]?.equipmentName || po.equipmentName}
            editable={false}
          />
        </CardContent>
      </Card>

      {/* Scope Boundary Payment Status & Performance Security Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Reporting-Only PO Payment Register Card (Scope-Aligned) */}
        <Card className="border border-slate-200 shadow-xs">
          <CardHeader className="pb-3 bg-muted/20 border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-slate-700" /> Payment Register (Reporting-Only)
              </CardTitle>
              <Badge variant="outline" className={
                rawPO.paymentStatus === "paid"
                  ? "bg-slate-100 text-slate-900 border-slate-300 font-semibold"
                  : "bg-slate-50 text-slate-700 border-slate-200 font-semibold"
              }>
                {rawPO.paymentStatus === "paid" ? "PAID" : "NOT PAID"}
              </Badge>
            </div>
            <CardDescription className="text-[11px] mt-1 text-slate-600">
              Disbursements occur outside TGMSIDC through IFMIS/Treasury. Accounts officer manually records payment clearance.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-4 text-xs">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700">Payment Status:</span>
                <span className="font-bold text-slate-900 uppercase">{rawPO.paymentStatus || "NOT PAID"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">UTR / Transaction Ref:</span>
                <span className="font-mono font-medium text-slate-800">{rawPO.paymentReference || "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Payment Date:</span>
                <span className="text-slate-800">{rawPO.paymentDate ? safeFormatDate(rawPO.paymentDate, "dd MMM yyyy") : "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Recorded By:</span>
                <span className="text-slate-800">{rawPO.paidBy || "—"}</span>
              </div>
              {rawPO.paymentRemarks && (
                <div className="pt-1 border-t text-[11px] text-slate-600">
                  Remarks: {rawPO.paymentRemarks}
                </div>
              )}
            </div>

            <Button
              size="sm"
              className="w-full text-xs shadow-xs"
              onClick={() => {
                setPaymentForm({
                  paymentStatus: rawPO.paymentStatus === "paid" ? "paid" : "paid",
                  paymentReference: rawPO.paymentReference || "",
                  paymentDate: rawPO.paymentDate ? new Date(rawPO.paymentDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
                  paymentAmount: rawPO.paymentAmount || po.totalAmount,
                  paidBy: rawPO.paidBy || user?.fullName || "Accounts Officer",
                  paymentRemarks: rawPO.paymentRemarks || "",
                });
                setPaymentOpen(true);
              }}
            >
              <CreditCard className="h-3.5 w-3.5 mr-1.5" />
              Update Payment Status (Paid / Not Paid)
            </Button>
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
            <DR label="BG Submission Deadline" value={rawPO.bgDueDate ? safeFormatDate(rawPO.bgDueDate, "dd MMM yyyy") : "Within 30 Days of PO Issue"} />
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
                {deliveries.map((deliv) => (
                  <tr key={deliv.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <Link href={`/deliveries/${deliv.id}`}>
                        <span className="font-mono text-xs font-semibold text-primary hover:underline">{deliv.qrCode}</span>
                      </Link>
                    </td>
                    <td className="px-4 py-3">{deliv.facilityName}</td>
                    <td className="px-4 py-3 text-center font-mono font-bold">{deliv.quantity}</td>
                    <td className="px-4 py-3 text-center"><StatusBadge status={deliv.status} /></td>
                    <td className="px-4 py-3 text-center font-mono">{deliv.qaComplianceScore != null ? `${deliv.qaComplianceScore}%` : "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/deliveries/${deliv.id}`}>
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
                    <td className="px-4 py-2.5 text-right text-muted-foreground">{a.requestedDate ? safeFormatDate(a.requestedDate, "dd MMM yyyy") : "—"}</td>
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

      {/* Edit PO Items Dialog (When in Draft) */}
      <Dialog open={editItemsOpen} onOpenChange={setEditItemsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-emerald-700" />
              Update Equipment Line Items &amp; Quantities
            </DialogTitle>
            <DialogDescription className="text-xs">
              Modify line item quantities within this Draft Purchase Order. Landed totals and GST will be recalculated automatically.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3 max-h-[60vh] overflow-y-auto">
            {editItemsList.map((item, idx) => {
              const qty = item.quantity || 1;
              const sub = (item.unitPrice || 0) * qty;
              const gst = Math.round((sub * (item.gstRate ?? 12)) / 100);
              const land = sub + gst;

              return (
                <div key={idx} className="p-3.5 border rounded-lg bg-slate-50/60 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-semibold text-xs text-slate-900 block">{item.equipmentName}</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        {item.rcNumber && (
                          <Badge variant="outline" className="text-[10px] font-mono bg-purple-50 text-purple-700 border-purple-200">
                            {item.rcNumber}
                          </Badge>
                        )}
                        <span className="text-[11px] text-muted-foreground font-mono">
                          Unit: ₹{(item.unitPrice || 0).toLocaleString("en-IN")} + {item.gstRate ?? 12}% GST
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-muted-foreground uppercase block">Landed Value</span>
                      <span className="text-xs font-mono font-bold text-emerald-700">₹{land.toLocaleString("en-IN")}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="w-32">
                      <Label className="text-[10px] text-muted-foreground uppercase">Order Quantity</Label>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity || 1}
                        onChange={(e) => {
                          const val = Math.max(1, parseInt(e.target.value) || 1);
                          setEditItemsList(prev => prev.map((it, i) => i === idx ? {
                            ...it,
                            quantity: val,
                            gstAmount: Math.round(((it.unitPrice || 0) * val * (it.gstRate ?? 12)) / 100),
                            totalAmount: ((it.unitPrice || 0) * val) + Math.round(((it.unitPrice || 0) * val * (it.gstRate ?? 12)) / 100),
                          } : it));
                        }}
                        className="h-8 text-xs font-mono font-bold mt-1 bg-white"
                      />
                    </div>
                    <div className="text-xs text-slate-600 pt-3">
                      Subtotal: <span className="font-mono font-semibold">₹{sub.toLocaleString("en-IN")}</span> + GST ({item.gstRate ?? 12}%): <span className="font-mono font-semibold">₹{gst.toLocaleString("en-IN")}</span>
                    </div>
                  </div>
                </div>
              );
            })}

            <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-lg flex items-center justify-between text-xs">
              <span className="font-bold text-emerald-950">Updated Purchase Order Total:</span>
              <span className="text-sm font-bold font-mono text-emerald-800">
                ₹{editItemsList.reduce((acc, it) => {
                  const sub = (it.unitPrice || 0) * (it.quantity || 1);
                  const gst = Math.round((sub * (it.gstRate ?? 12)) / 100);
                  return acc + sub + gst;
                }, 0).toLocaleString("en-IN")}
              </span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setEditItemsOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={savingItems}
              onClick={async () => {
                setSavingItems(true);
                try {
                  await updatePurchaseOrder(id, { items: editItemsList });
                  queryClient.invalidateQueries({ queryKey: getGetPurchaseOrderQueryKey(id) });
                  queryClient.invalidateQueries({ queryKey: ["/purchase-orders"] });
                  setEditItemsOpen(false);
                  toast({
                    title: "Purchase Order Updated",
                    description: "Line item quantities and totals have been successfully updated.",
                  });
                } catch (err: any) {
                  toast({
                    title: "Update Failed",
                    description: err.message || "Failed to update line items",
                    variant: "destructive",
                  });
                } finally {
                  setSavingItems(false);
                }
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
            >
              {savingItems ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Save Updated Items
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record Payment Dialog (Scope Boundary) */}
      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleRecordPayment}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-emerald-700" /> Record Manual Payment Status
              </DialogTitle>
              <DialogDescription className="text-xs">
                Disbursement occurs externally via Treasury/PFMS. Enter the transaction UTR number and date for official records.
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
              <Button type="submit" disabled={paymentSubmitting}>
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
                Record a formal statutory amendment to this purchase order.
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
              <Button type="submit" disabled={amendSubmitting}>
                {amendSubmitting ? "Amending..." : "Create Amendment Snapshot"}
              </Button>
            </DialogFooter>
          </form>
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
            <Button onClick={handleAcknowledgePO} disabled={ackSubmitting}>
              {ackSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
              {ackSubmitting ? "Recording Acknowledgement..." : "Submit Acknowledgement"}
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
              <Button type="submit" disabled={dispatchSubmitting}>
                {dispatchSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                {dispatchSubmitting ? "Transmitting Dispatch to DB..." : "Confirm & Transmit Dispatch"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>



      {/* Issue PO to Vendor Dialog */}
      <Dialog open={issuePODialog} onOpenChange={setIssuePODialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Send className="h-5 w-5 text-emerald-600" />
              Issue Purchase Order to Empanelled Vendor
            </DialogTitle>
            <DialogDescription className="text-xs">
              This officially transmits the sanctioned PO to <strong>{po.vendorName}</strong>. The vendor will have 7 days to acknowledge supply commitments.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Issuance Remarks / Instructions to Vendor</Label>
              <Textarea
                placeholder="Enter transmission instructions, dispatch timeline expectations, or delivery guidelines..."
                value={issuePORemarks}
                onChange={(e) => setIssuePORemarks(e.target.value)}
                rows={3}
                className="text-xs resize-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIssuePODialog(false)}
              disabled={issuingPO}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleIssuePO}
              disabled={issuingPO}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 shadow-xs"
            >
              {issuingPO ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Send className="h-3.5 w-3.5" />}
              {issuingPO ? "Transmitting..." : "Confirm & Issue PO"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Official PO Closure Dialog */}
      <Dialog open={closePODialog} onOpenChange={setClosePODialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Lock className="h-5 w-5 text-emerald-700" />
              Officially Close Purchase Order
            </DialogTitle>
            <DialogDescription className="text-xs">
              Closing this PO confirms full delivery fulfilment, physical DCC verification, QA acceptance, asset registration with warranty, and payment status update.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Final Closure Observations / Archival Remarks</Label>
              <Textarea
                placeholder="Enter archival remarks or audit observations..."
                value={closureRemarks}
                onChange={(e) => setClosureRemarks(e.target.value)}
                rows={3}
                className="text-xs resize-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setClosePODialog(false)}
              disabled={closingPO}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleClosePO}
              disabled={closingPO}
              className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs gap-1.5 shadow-xs"
            >
              {closingPO ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Lock className="h-3.5 w-3.5" />}
              {closingPO ? "Closing PO..." : "Confirm Official PO Closure"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
