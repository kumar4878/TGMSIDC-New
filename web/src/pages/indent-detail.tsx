import { useRoute, Link, useLocation } from "wouter";
import { useGetIndent, getGetIndentQueryKey } from "@/lib/api-hooks";
import { BASE_URL } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/StatusBadge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useAuth } from "@/contexts/AuthContext";
import { useListEquipment, useListPurchaseOrders, useListDeliveries, useAuditLog } from "@/lib/api-hooks";
import {
  resolveWriteInEquipment,
  verifyIndent,
  returnIndentToDEO,
  resubmitIndent,
  selectLineRC,
  raiseLinePO,
  initiateLineTender,
  reprioritizeIndent,
  revalidateIndent,
} from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { getSteps } from "@/lib/approvalWorkflow";
import type { ApprovalStep } from "@/lib/approvalWorkflow";
import { ProductSpecSheet } from "@/components/ProductSpecSheet";
import { getCategoryMeta, getSpecSummary } from "@/lib/productSpecs";
import {
  ArrowLeft, Building2, Wrench, User, Calendar, FileText,
  AlertCircle, CheckCircle2, XCircle, RotateCcw, Clock,
  ChevronRight, ShieldCheck, GitBranch, IndianRupee,
  Package, Truck, Receipt, ClipboardCheck, History, Layers,
  Split, FileCheck2, ZoomIn, ZoomOut, CheckCheck, Eye,
  AlertTriangle, ExternalLink, Phone, Mail, Paperclip, Download,
  Award, CheckSquare, Zap,
} from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { getIndentLifecycleData, daysBetween } from "@/lib/indentLifecycle";
import type { AuditEventType } from "@/lib/indentLifecycle";
import { format, formatDistanceToNow, differenceInDays } from "date-fns";
import { useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";

const STEP_ROLE_COLOR: Record<string, string> = {
  deo: "bg-slate-100 text-slate-700 border-slate-200",
  tgmsidc_user: "bg-slate-100 text-slate-700 border-slate-200",
  gm_equipment: "bg-slate-100 text-slate-700 border-slate-200",
  so_equipment: "bg-slate-100 text-slate-700 border-slate-200",
  executive_director: "bg-slate-100 text-slate-700 border-slate-200",
  admin: "bg-slate-100 text-slate-700 border-slate-200",
};

const STEP_STATUS_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string; label: string }> = {
  approved: { icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200", label: "Approved" },
  rejected: { icon: XCircle, color: "text-red-600", bg: "bg-red-50 border-red-200", label: "Rejected" },
  returned: { icon: RotateCcw, color: "text-amber-600", bg: "bg-amber-50 border-amber-200", label: "Returned" },
  pending: { icon: Clock, color: "text-muted-foreground", bg: "bg-muted/40 border-border", label: "Pending" },
  skipped: { icon: ChevronRight, color: "text-muted-foreground", bg: "bg-muted/20 border-border", label: "Skipped" },
};

const PROCURE_MODE_OPTIONS = [
  { value: "rate_contract", label: "Rate Contract — Use existing approved RC (fast-track)" },
  { value: "tender", label: "Open Tender — Invite bids via GeM / e-Procurement" },
  { value: "limited_tender", label: "Limited Tender — Pre-qualified vendors only" },
  { value: "single_source", label: "Single Source — Proprietary / Emergency purchase" },
];

function safeFormat(d: string | null | undefined, pattern = "dd MMM yyyy"): string {
  if (!d) return "—";
  try {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return "—";
    return format(dt, pattern);
  } catch {
    return "—";
  }
}

function safeDistance(d: string | null | undefined): string {
  if (!d) return "";
  try {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return "";
    return formatDistanceToNow(dt, { addSuffix: true });
  } catch {
    return "";
  }
}

function formatINR(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return "₹0";
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(2)}\u00A0Cr`;
  if (n >= 1_00_000) return `₹${(n / 1_00_000).toFixed(2)}\u00A0L`;
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

function stepKey(id: string) {
  return ["indent-approval-steps", id] as const;
}

function ApprovalTimeline({ steps, activeStepNumber }: { steps: ApprovalStep[]; activeStepNumber: number }) {
  return (
    <div className="relative">
      {steps.map((step, idx) => {
        const cfg = STEP_STATUS_CONFIG[step.status] ?? STEP_STATUS_CONFIG.pending;
        const Icon = cfg.icon;
        const isActive = step.stepNumber === activeStepNumber && step.status === "pending";
        const isLast = idx === steps.length - 1;

        return (
          <div key={step.stepNumber} className="flex gap-4">
            <div className="flex flex-col items-center shrink-0">
              <div className={cn(
                "h-8 w-8 rounded-full flex items-center justify-center border-2 z-10 shrink-0",
                step.status === "approved" ? "bg-emerald-500 border-emerald-500 text-white" :
                step.status === "rejected" ? "bg-red-500 border-red-500 text-white" :
                step.status === "returned" ? "bg-amber-400 border-amber-400 text-white" :
                isActive ? "bg-white border-primary animate-pulse" : "bg-muted border-border"
              )}>
                {step.status === "approved" ? <CheckCircle2 className="h-4 w-4" /> :
                 step.status === "rejected" ? <XCircle className="h-4 w-4" /> :
                 step.status === "returned" ? <RotateCcw className="h-4 w-4" /> :
                 isActive ? <div className="h-2.5 w-2.5 rounded-full bg-primary" /> :
                 <span className="text-xs font-bold text-muted-foreground">{step.stepNumber}</span>}
              </div>
              {!isLast && (
                <div className={cn("w-0.5 flex-1 my-0.5", step.status === "approved" ? "bg-emerald-300" : "bg-border")} style={{ minHeight: "2rem" }} />
              )}
            </div>

            <div className={cn("flex-1 rounded-lg border p-3 mb-3", cfg.bg, isActive && "border-primary/40 bg-primary/5 shadow-sm")}>
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-foreground">Step {step.stepNumber}</span>
                  <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 border", STEP_ROLE_COLOR[step.requiredRole] || "bg-slate-100 text-slate-700")}>
                    {step.roleLabel}
                  </Badge>
                  {isActive && (
                    <Badge className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary border border-primary/30">
                      Awaiting Action
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <Icon className={cn("h-3.5 w-3.5", cfg.color)} />
                  <span className={cn("text-xs font-medium", cfg.color)}>{cfg.label}</span>
                </div>
              </div>
              <p className="text-xs font-medium text-foreground mt-1">{step.assignedUserName}</p>
              {step.actionedAt && (
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {safeFormat(step.actionedAt, "dd MMM yyyy, HH:mm")} · {safeDistance(step.actionedAt)}
                </p>
              )}
              {step.comments && (
                <p className="text-xs text-foreground/80 mt-1.5 italic border-t border-border/50 pt-1.5">
                  "{step.comments}"
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function IndentDetail(props?: { id?: string }) {
  const [, params] = useRoute("/indents/:id");
  const [, setLocation] = useLocation();
  const id = (props?.id || params?.id || "");
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: indent, isLoading } = useGetIndent(id, {
    query: { enabled: !!id, queryKey: getGetIndentQueryKey(id) },
  });

  // Ensure Indent detail view always starts at the top (starting details) when opened
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    const mainEl = document.getElementById("main-scroll-container") || document.querySelector("main");
    if (mainEl) {
      mainEl.scrollTo({ top: 0, left: 0, behavior: "instant" });
      mainEl.scrollTop = 0;
    }
  }, [id, isLoading]);

  const { data: steps = [], refetch: refetchSteps } = useQuery({
    queryKey: stepKey(id),
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}/indents/${id}/approval-steps`);
      if (!res.ok) return [];
      return res.json() as Promise<ApprovalStep[]>;
    },
    enabled: !!id,
  });

  const [comments, setComments] = useState("");
  const [procurementMode, setProcurementMode] = useState("rate_contract");
  const [rejectDialog, setRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [processing, setProcessing] = useState(false);
  const [specProduct, setSpecProduct] = useState<{ equipmentId: string; equipmentCode?: string; name: string } | null>(null);

  // Ratecard preview modal & Tender initiation states
  const [tenderDialogOpen, setTenderDialogOpen] = useState(false);
  const [tenderPortal, setTenderPortal] = useState("gem");
  const [tenderType, setTenderType] = useState("open");
  const [tenderNotes, setTenderNotes] = useState("");
  const [rcModal, setRcModal] = useState<{
    contractNumber: string;
    vendorName: string;
    unitPrice: number;
    gstRate?: number;
    validityEnd?: string;
    equipmentName?: string;
    id?: string;
    status?: string;
  } | null>(null);

  const { toast } = useToast();
  const { data: allEquipment = [] } = useListEquipment();
  const { data: livePOs = [] } = useListPurchaseOrders();
  const { data: liveDeliveries = [] } = useListDeliveries();
  const { data: dbAuditLogs = [] } = useAuditLog(
    indent?.indentNumber ? { entityId: indent.indentNumber } : { entityId: String(id) }
  );
  const [sideBySide, setSideBySide] = useState(false);
  const [rightPanelTab, setRightPanelTab] = useState<"scanned_doc" | "timeline">("scanned_doc");
  const [scannedZoom, setScannedZoom] = useState(100);
  const [activeDoc, setActiveDoc] = useState<any>(null);
  const [docModal, setDocModal] = useState<any>(null);

  // Write-in Equipment Resolution state (Process Book §1 Step 12 & §12 F-38)
  const [writeInModal, setWriteInModal] = useState<{ lineItemIndex: number; item: any } | null>(null);
  const [writeInAction, setWriteInAction] = useState<"map_to_master" | "new_addition_requested">("map_to_master");
  const [mappedEquipmentId, setMappedEquipmentId] = useState("");
  const [newEquipmentName, setNewEquipmentName] = useState("");
  const [newEquipmentCategory, setNewEquipmentCategory] = useState("Medical Equipment");
  const [newEquipmentSpecs, setNewEquipmentSpecs] = useState("");
  const [writeInSubmitting, setWriteInSubmitting] = useState(false);

  async function handleResolveWriteIn(e: React.FormEvent) {
    e.preventDefault();
    if (!writeInModal) return;
    setWriteInSubmitting(true);
    try {
      await resolveWriteInEquipment(id, {
        lineItemIndex: writeInModal.lineItemIndex,
        action: writeInAction,
        mappedEquipmentId: writeInAction === "map_to_master" ? mappedEquipmentId : undefined,
        newEquipmentName: writeInAction === "new_addition_requested" ? newEquipmentName : undefined,
        category: writeInAction === "new_addition_requested" ? newEquipmentCategory : undefined,
        specifications: writeInAction === "new_addition_requested" ? newEquipmentSpecs : undefined,
        resolvedBy: user?.fullName || "Procurement Officer",
      });
      queryClient.invalidateQueries({ queryKey: getGetIndentQueryKey(id) });
      setWriteInModal(null);
      toast({
        title: "Write-in Equipment Resolved",
        description: writeInAction === "map_to_master"
          ? "Line item mapped to active Equipment Master."
          : "New Equipment Request submitted to GM Equipment.",
      });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to resolve write-in", variant: "destructive" });
    } finally {
      setWriteInSubmitting(false);
    }
  }

  // TGMSIDC Verification & Decoupled Line Routing States
  const [verificationRemarks, setVerificationRemarks] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [returnDEODialog, setReturnDEODialog] = useState(false);
  const [returnRemarks, setReturnRemarks] = useState("");
  const [multiRcSelectModal, setMultiRcSelectModal] = useState<{
    lineIndex: number;
    item: any;
    candidates: any[];
  } | null>(null);
  const [selectedCandidateRcId, setSelectedCandidateRcId] = useState("");
  const [lineActionLoading, setLineActionLoading] = useState<number | null>(null);

  // Reprioritization & Budget Revalidation States (Steps 5 - 10)
  const [reprioritizeModalOpen, setReprioritizeModalOpen] = useState(false);
  const [reprioritizeLines, setReprioritizeLines] = useState<Array<{
    lineIndex: number;
    equipmentName: string;
    category: string;
    requestedQty: number;
    originalRequestedQty: number;
    estimatedUnitRate: number;
    priority: number;
    deferred: boolean;
  }>>([]);
  const [revisedAsAmountInput, setRevisedAsAmountInput] = useState("");
  const [revisedAsRefInput, setRevisedAsRefInput] = useState("");
  const [revisedAsDateInput, setRevisedAsDateInput] = useState("");
  const [revisedAsRemarksInput, setRevisedAsRemarksInput] = useState("");
  const [reprioritizing, setReprioritizing] = useState(false);
  const [revalidating, setRevalidating] = useState(false);

  function openReprioritizationModal() {
    const rawLines = indent?.lineItems || indent?.lines || [];
    setReprioritizeLines(
      rawLines.map((li: any, idx: number) => ({
        lineIndex: idx,
        equipmentName: li.equipmentName || `Equipment Item ${idx + 1}`,
        category: li.category || "medical_equipment",
        requestedQty: Number(li.requestedQty ?? li.qty ?? 1),
        originalRequestedQty: Number(li.originalRequestedQty ?? li.requestedQty ?? li.qty ?? 1),
        estimatedUnitRate: Number(li.rateContractUnitPrice ?? li.estimatedUnitCost ?? li.estimatedUnitRate ?? 0),
        priority: Number(li.priority || 1),
        deferred: Boolean(li.deferred),
      }))
    );
    setRevisedAsAmountInput(indent?.revisedAsAmount ? String(indent.revisedAsAmount) : "");
    setRevisedAsRefInput(indent?.revisedAsReferenceNo || "");
    setRevisedAsDateInput(indent?.revisedAsDate ? indent.revisedAsDate.split("T")[0] : "");
    setRevisedAsRemarksInput(indent?.reprioritizationNotes || "");
    setReprioritizeModalOpen(true);
  }

  async function handleReprioritizeSubmit(e: React.FormEvent) {
    e.preventDefault();
    setReprioritizing(true);
    try {
      await reprioritizeIndent(id, {
        lineItems: reprioritizeLines.map((l) => ({
          lineIndex: l.lineIndex,
          requestedQty: Number(l.requestedQty),
          priority: Number(l.priority),
          deferred: Boolean(l.deferred),
        })),
        revisedAsAmount: revisedAsAmountInput ? Number(revisedAsAmountInput) : undefined,
        revisedAsReferenceNo: revisedAsRefInput || undefined,
        revisedAsDate: revisedAsDateInput || undefined,
        revisedAsRemarks: revisedAsRemarksInput || undefined,
        reprioritizedBy: user?.fullName || "Facility DEO",
      });
      refetchSteps();
      queryClient.invalidateQueries({ queryKey: getGetIndentQueryKey(id) });
      queryClient.invalidateQueries({ queryKey: stepKey(id) });
      queryClient.invalidateQueries({ queryKey: ["indent-approval-steps", id] });
      queryClient.invalidateQueries({ queryKey: ["/audit-log"] });
      queryClient.invalidateQueries({ queryKey: ["/indents"] });
      setReprioritizeModalOpen(false);
      toast({
        title: "Reprioritization Submitted",
        description: "Revised quantities and AS details submitted to TGMSIDC for revalidation.",
      });
    } catch (err: any) {
      toast({
        title: "Submission Failed",
        description: err.message || "Could not submit reprioritized indent",
        variant: "destructive",
      });
    } finally {
      setReprioritizing(false);
    }
  }

  async function handleRevalidateIndent() {
    setRevalidating(true);
    try {
      const res = await revalidateIndent(id, {
        revalidatedBy: user?.fullName || "TGMSIDC Revalidation Officer",
      });
      refetchSteps();
      queryClient.invalidateQueries({ queryKey: getGetIndentQueryKey(id) });
      queryClient.invalidateQueries({ queryKey: stepKey(id) });
      queryClient.invalidateQueries({ queryKey: ["indent-approval-steps", id] });
      queryClient.invalidateQueries({ queryKey: ["/audit-log"] });
      queryClient.invalidateQueries({ queryKey: ["/indents"] });
      toast({
        title: "Revalidation Complete",
        description: res?.message || "Budget revalidated within AS. Procurement routing unlocked.",
      });
    } catch (err: any) {
      toast({
        title: "Revalidation Failed",
        description: err.message || "Requirement still exceeds Administrative Sanction.",
        variant: "destructive",
      });
    } finally {
      setRevalidating(false);
    }
  }

  async function handleVerifyIndent() {
    setVerifying(true);
    try {
      const res = await verifyIndent(id, {
        remarks: verificationRemarks || "TGMSIDC verification completed and active Rate Contracts tagged",
        verifiedBy: user?.fullName || "TGMSIDC User",
      });
      queryClient.invalidateQueries({ queryKey: getGetIndentQueryKey(id) });
      queryClient.invalidateQueries({ queryKey: ["/indents"] });
      if (res?.budgetSufficiency === "insufficient" || res?.status === "reprioritization_required") {
        toast({
          title: "Budget Shortfall Detected",
          description: `Estimated value exceeds AS by ₹${Math.abs(res.budgetSurplusOrShortfall || 0).toLocaleString("en-IN")}. Routed to DEO for Reprioritization.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Indent Verified Successfully",
          description: "Requisition verified within Administrative Sanction. Active Rate Contracts assessed per line.",
        });
      }
      setVerificationRemarks("");
    } catch (err: any) {
      toast({ title: "Verification Failed", description: err.message || "Failed to verify indent", variant: "destructive" });
    } finally {
      setVerifying(false);
    }
  }

  async function handleReturnToDEO() {
    if (!returnRemarks.trim()) {
      toast({ title: "Remarks Required", description: "Please enter specific reasons for returning to DEO", variant: "destructive" });
      return;
    }
    setVerifying(true);
    try {
      await returnIndentToDEO(id, {
        remarks: returnRemarks,
        returnedBy: user?.fullName || "TGMSIDC User",
      });
      queryClient.invalidateQueries({ queryKey: getGetIndentQueryKey(id) });
      queryClient.invalidateQueries({ queryKey: ["/indents"] });
      setReturnDEODialog(false);
      setReturnRemarks("");
      toast({
        title: "Indent Returned to DEO",
        description: "Requisition marked for facility revision.",
      });
    } catch (err: any) {
      toast({ title: "Failed to Return", description: err.message || "Action failed", variant: "destructive" });
    } finally {
      setVerifying(false);
    }
  }

  async function handleResubmitIndent() {
    setVerifying(true);
    try {
      await resubmitIndent(id, {
        remarks: verificationRemarks || "Resubmitted by DEO after revisions",
        submittedBy: user?.fullName || "DEO",
      });
      queryClient.invalidateQueries({ queryKey: getGetIndentQueryKey(id) });
      queryClient.invalidateQueries({ queryKey: ["/indents"] });
      toast({
        title: "Indent Resubmitted",
        description: "Requisition resubmitted for TGMSIDC verification.",
      });
      setVerificationRemarks("");
    } catch (err: any) {
      toast({ title: "Resubmission Failed", description: err.message || "Action failed", variant: "destructive" });
    } finally {
      setVerifying(false);
    }
  }

  async function handleRaiseLinePO(lineIndex: number, item: any) {
    if (user?.role === "deo") {
      toast({ title: "Action Restricted", description: "DEO cannot raise Purchase Orders. PO issuance is performed by TGMSIDC User.", variant: "destructive" });
      return;
    }
    if (item.deferred) {
      toast({ title: "Item Deferred", description: "This item has been deferred from the current procurement cycle.", variant: "destructive" });
      return;
    }
    if (indent?.status === "reprioritization_required" || indent?.budgetSufficiency === "insufficient") {
      toast({ title: "Action Blocked", description: "Cannot raise Purchase Order while requisition is under budget reprioritization.", variant: "destructive" });
      return;
    }
    setLineActionLoading(lineIndex);
    try {
      const targetRcId =
        item.rateContractId ||
        (Array.isArray(item.candidateRateContracts) ? item.candidateRateContracts[0]?.rcId || item.candidateRateContracts[0]?.rateContractId : undefined);

      const res = await raiseLinePO(id, lineIndex, {
        rateContractId: targetRcId,
        poRemarks: `PO raised for ${item.equipmentName} via Rate Contract ${item.rateContractNumber || ''}`,
        createdBy: user?.fullName || "TGMSIDC User",
      });
      queryClient.invalidateQueries({ queryKey: getGetIndentQueryKey(id) });
      queryClient.invalidateQueries({ queryKey: ["/indents"] });
      queryClient.invalidateQueries({ queryKey: ["/purchase-orders"] });
      toast({
        title: "Purchase Order Raised",
        description: `Generated PO ${res?.purchaseOrder?.poNumber || ''} for ${item.equipmentName}.`,
      });
    } catch (err: any) {
      toast({ title: "Failed to Raise PO", description: err.message || "Could not generate PO", variant: "destructive" });
    } finally {
      setLineActionLoading(null);
    }
  }

  async function handleConfirmSelectRC() {
    if (!multiRcSelectModal || !selectedCandidateRcId) return;
    setLineActionLoading(multiRcSelectModal.lineIndex);
    try {
      await selectLineRC(id, multiRcSelectModal.lineIndex, {
        rateContractId: selectedCandidateRcId,
        selectedBy: user?.fullName || "TGMSIDC User",
      });
      queryClient.invalidateQueries({ queryKey: getGetIndentQueryKey(id) });
      queryClient.invalidateQueries({ queryKey: ["/indents"] });
      setMultiRcSelectModal(null);
      setSelectedCandidateRcId("");
      toast({
        title: "Rate Contract Selected",
        description: "Line item tagged with chosen Rate Contract. PO can now be generated.",
      });
    } catch (err: any) {
      toast({ title: "Selection Failed", description: err.message || "Could not select RC", variant: "destructive" });
    } finally {
      setLineActionLoading(null);
    }
  }

  async function handleInitiateLineTender(lineIndex: number, item: any) {
    setLineActionLoading(lineIndex);
    try {
      const res = await initiateLineTender(id, lineIndex, {
        tenderCategory: item.category || "Medical Equipment",
        createdBy: user?.fullName || "TGMSIDC User",
      });
      queryClient.invalidateQueries({ queryKey: getGetIndentQueryKey(id) });
      queryClient.invalidateQueries({ queryKey: ["/indents"] });
      queryClient.invalidateQueries({ queryKey: ["/tenders"] });
      toast({
        title: "Tender Initiated",
        description: `Initiated Tender ${res?.tender?.tenderNumber || ''} for ${item.equipmentName}.`,
      });
    } catch (err: any) {
      toast({ title: "Failed to Initiate Tender", description: err.message || "Could not start tender", variant: "destructive" });
    } finally {
      setLineActionLoading(null);
    }
  }

  const initiateTenderMutation = useMutation({
    mutationFn: async () => {
      setProcessing(true);
      const res = await fetch(`${BASE_URL}/indents/${id}/initiate-tender`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          portal: tenderPortal,
          tenderType,
          notes: tenderNotes,
          initiatedBy: user?.fullName || user?.role || "Procurement Officer",
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed to initiate tender" }));
        throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`);
      }
      return res.json();
    },
    onSuccess: () => {
      refetchSteps();
      queryClient.invalidateQueries({ queryKey: getGetIndentQueryKey(id) });
      queryClient.invalidateQueries({ queryKey: ["/indents"] });
      queryClient.invalidateQueries({ queryKey: ["/tenders"] });
      setTenderDialogOpen(false);
      setProcessing(false);
    },
    onError: (err: any) => {
      setProcessing(false);
      alert(err.message || "Failed to initiate tendering process");
    },
  });

  const steps_live = (steps.length > 0) ? steps : ((indent?.approvalSteps && indent.approvalSteps.length > 0) ? indent.approvalSteps : getSteps(id));
  const progress_live = steps_live.length > 0 ? (() => {
    const total = steps_live.length;
    const completed = steps_live.filter((s: ApprovalStep) => s.status === "approved" || s.status === "skipped").length;
    const firstPending = steps_live.find((s: ApprovalStep) => s.status === "pending" || s.status === "returned");
    return {
      totalSteps: total,
      completedSteps: completed,
      currentStepNumber: firstPending?.stepNumber ?? total,
      currentStepRole: firstPending?.requiredRole ?? null,
      isComplete: completed === total && total > 0,
      isRejected: steps_live.some((s: ApprovalStep) => s.status === "rejected"),
      isReturned: steps_live.some((s: ApprovalStep) => s.status === "returned"),
    };
  })() : { totalSteps: 0, completedSteps: 0, currentStepNumber: 0, currentStepRole: null, isComplete: false, isRejected: false, isReturned: false };

  const firstPendingStep = steps_live.find(
    (s: ApprovalStep) => s.status === "pending" || s.status === "returned"
  ) ?? null;
  const isMyTurn = user?.role === "admin" || (firstPendingStep?.requiredRole === user?.role);
  const pendingStep = isMyTurn ? firstPendingStep : null;

  const stepMutation = useMutation({
    mutationFn: async (payload: {
      stepNumber: number;
      status: "approved" | "rejected" | "returned";
      comments: string;
      procurementMode?: string;
    }) => {
      setProcessing(true);
      const res = await fetch(`${BASE_URL}/indents/${id}/approval-steps/${payload.stepNumber}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: payload.status,
          comments: payload.comments,
          approvedBy: user?.fullName,
          procurementMode: payload.procurementMode,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Request failed" }));
        throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`);
      }
      return res.json();
    },
    onSuccess: () => {
      refetchSteps();
      queryClient.invalidateQueries({ queryKey: getGetIndentQueryKey(id) });
      queryClient.invalidateQueries({ queryKey: ["/indents"] });
      queryClient.invalidateQueries({ queryKey: ["/purchase-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/deliveries"] });
      queryClient.invalidateQueries({ queryKey: ["/dashboard/summary"] });
      queryClient.invalidateQueries({ queryKey: ["/dashboard/procurement-pipeline"] });
      setComments("");
      setProcessing(false);
    },
    onError: () => setProcessing(false),
  });

  const [lifecycleLoading, setLifecycleLoading] = useState(false);

  async function handleAdvanceLifecycle(action: "confirm_delivery" | "pass_qa" | "issue_grn" | "record_payment" | "auto_complete_all" | "release_tranche1" | "release_tranche2") {
    setLifecycleLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/indents/${id}/advance-lifecycle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          actorName: user?.fullName || user?.username || "Authorised Officer",
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Request failed" }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      refetchSteps();
      queryClient.invalidateQueries({ queryKey: getGetIndentQueryKey(id) });
      queryClient.invalidateQueries({ queryKey: ["/indents"] });
      queryClient.invalidateQueries({ queryKey: ["/purchase-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/deliveries"] });
      queryClient.invalidateQueries({ queryKey: ["/dashboard/summary"] });
      queryClient.invalidateQueries({ queryKey: ["/dashboard/procurement-pipeline"] });
      toast({
        title: "Lifecycle Advanced",
        description: data.message || "Stage updated successfully.",
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to update lifecycle stage.",
        variant: "destructive",
      });
    } finally {
      setLifecycleLoading(false);
    }
  }

  if (isLoading) {
    return <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 rounded-full border-4 border-primary border-t-transparent" /></div>;
  }
  if (!indent) {
    return <div className="text-center py-20 text-muted-foreground">Indent not found</div>;
  }

  const lineItems = indent.lines ?? indent.lineItems ?? [];
  const hasLineItems = lineItems.length > 0;
  const totalEstimated = indent.estimatedTotalValue || lineItems.reduce((sum: number, li: any) => {
    const qty = li.requestedQty ?? li.qty ?? 0;
    const rate = li.estimatedUnitCost ?? li.estimatedUnitRate ?? 0;
    return sum + (qty * rate);
  }, 0);

  const effectiveAsAmount = indent.revisedAsAmount || indent.asAmount || (indent.institutions?.reduce((sum: number, inst: any) => sum + (inst.fundSanctionedAmount || 0), 0) ?? 0);
  const estimatedProcurementCost = indent.estimatedTotalProcurementValue || totalEstimated;
  const budgetDifference = indent.budgetSurplusOrShortfall !== undefined ? indent.budgetSurplusOrShortfall : (effectiveAsAmount - estimatedProcurementCost);
  const isBudgetShortfall = indent.budgetSufficiency === "insufficient" || indent.budgetValidationStatus === "shortfall_detected" || indent.status === "reprioritization_required" || (effectiveAsAmount > 0 && budgetDifference < 0);
  const isBudgetValidated = indent.budgetValidationStatus === "validated_within_as" || indent.budgetSufficiency === "sufficient" || indent.status === "ready_for_procurement" || indent.status === "tgmsidc_verification_completed" || (effectiveAsAmount > 0 && budgetDifference >= 0);
  const isReprioritizationSubmitted = indent.status === "resubmitted_for_review" || indent.status === "under_tgmsidc_revalidation" || indent.verificationStatus === "resubmitted_for_review";

  const lifecycleData = getIndentLifecycleData(id, indent, livePOs, liveDeliveries, dbAuditLogs);
  const { purchaseOrders: linkedPOs, deliveries: linkedDeliveries, invoices: linkedInvoices, auditLog } = lifecycleData;

  const firstDeliveredDelivery = linkedDeliveries.find((d) => d.deliveredDate || d.status === "delivered");
  const firstQAPassedDelivery = linkedDeliveries.find((d) => d.status === "qa_passed" || d.status === "accepted" || d.qaDecision === "accepted" || (d.qaComplianceScore != null && d.qaComplianceScore >= 100));
  const firstAcceptedDelivery = linkedDeliveries.find((d) => d.acceptanceCertificateIssued);
  const isPOPaid = linkedPOs.some((p: any) => p.paymentStatus === "paid" || (p.tranche1Paid && p.tranche2Paid)) || linkedInvoices.some((i: any) => i.status === "paid") || indent.paymentStatus === "paid";
  const isT1Paid = linkedPOs.some((p: any) => p.tranche1Paid || p.paymentStatus === "paid" || p.paymentStatus === "partial") || indent.tranche1Paid || indent.paymentStatus === "paid";
  const isT2Paid = linkedPOs.some((p: any) => p.tranche2Paid || (p.paymentStatus === "paid" && (p.status === "completed" || p.tranche2Paid))) || indent.tranche2Paid || (indent.paymentStatus === "paid" && (indent.tranche2Paid || indent.tranche1Paid));
  const isFullyPaid = (isT1Paid && isT2Paid) || isPOPaid;

  const LIFECYCLE_STAGES = [
    "Indent Raised", "Approved", "PO Issued", "Delivered", "QA Passed", "Accepted",
  ] as const;

  const isPOIssued = indent.status === "po_issued" || indent.status === "completed" ||
    linkedPOs.some((p: any) => p.status === "issued" || p.status === "po_approved" || p.status === "in_transit" || p.status === "delivered" || p.status === "completed") ||
    steps_live.find((s: ApprovalStep) => s.requiredRole === "executive_director")?.status === "approved";

  const isIndentApproved = !!indent.approvedBy || !["pending_review", "pending_approval", "rejected"].includes(indent.status);

  const stageTimestamps: (string | null)[] = [
    indent.createdAt,
    isIndentApproved ? indent.updatedAt : null,
    isPOIssued ? (linkedPOs.find((p: any) => p.status === "issued")?.issuedDate || linkedPOs[0]?.createdAt || indent.updatedAt) : null,
    firstDeliveredDelivery?.deliveredDate ? firstDeliveredDelivery.deliveredDate : null,
    firstQAPassedDelivery?.updatedAt ?? null,
    firstAcceptedDelivery?.updatedAt ?? null,
  ];

  const activeStageIdx = (() => {
    if (firstAcceptedDelivery) return 5;
    if (firstQAPassedDelivery) return 4;
    if (firstDeliveredDelivery) return 3;
    if (isPOIssued) return 2;
    if (isIndentApproved) return 1;
    return 0;
  })();

  const lifecycleIsRejected = indent.status === "rejected";

  const totalPOValue = linkedPOs.reduce((s, p) => s + (p.totalAmount || 0), 0);
  const totalInvoiced = linkedInvoices.reduce((s, i) => s + (i.amount || 0), 0);
  const grnCount = linkedDeliveries.filter((d) => d.acceptanceCertificateIssued).length;
  const allInvoicesPaid = linkedInvoices.length > 0 && linkedInvoices.every((i) => i.status === "paid");

  const AUDIT_EVENT_COLORS: Record<AuditEventType, string> = {
    indent:   "bg-slate-100 text-slate-700 border-slate-200",
    approval: "bg-slate-100 text-slate-700 border-slate-200",
    po:       "bg-slate-100 text-slate-700 border-slate-200",
    delivery: "bg-slate-100 text-slate-700 border-slate-200",
    qa:       "bg-slate-100 text-slate-700 border-slate-200",
    invoice:  "bg-slate-100 text-slate-700 border-slate-200",
    grn:      "bg-slate-100 text-slate-700 border-slate-200",
  };

  function handleAction(action: "approved" | "returned") {
    if (!pendingStep) return;
    if (action === "returned" && !comments.trim()) return;
    const isLastStep = pendingStep.stepNumber === progress_live.totalSteps;
    stepMutation.mutate({
      stepNumber: pendingStep.stepNumber,
      status: action,
      comments: comments.trim() || "Approved.",
      procurementMode: (action === "approved" && isLastStep) || (action === "approved" && ["gm_equipment", "gm", "so_equipment", "executive_director"].includes(pendingStep.requiredRole))
        ? procurementMode
        : undefined,
    });
  }

  const isFinalProcurementStep = pendingStep && (
    pendingStep.stepNumber === progress_live.totalSteps ||
    ["gm_equipment", "so_equipment", "gm", "executive_director"].includes(pendingStep.requiredRole)
  );

  return (
    <ErrorBoundary fallbackTitle="Indent Workspace Error">
      <div className="w-full max-w-[1600px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link href="/indents">
          <Button variant="ghost" size="sm" className="gap-2 mt-0.5">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold font-mono">{indent.indentNumber}</h1>
            <StatusBadge status={indent.status} />
            {progress_live.totalSteps > 0 && (
              <Badge variant="outline" className="text-xs gap-1 font-normal">
                <GitBranch className="h-3 w-3" />
                Step {Math.min(progress_live.completedSteps + 1, progress_live.totalSteps)} of {progress_live.totalSteps}
              </Badge>
            )}
            {hasLineItems && lineItems.length > 1 && (
              <Badge variant="secondary" className="text-xs gap-1">
                {lineItems.length} line items
              </Badge>
            )}
            {indent.financialYear && (
              <Badge variant="outline" className="text-xs font-mono">
                FY {indent.financialYear}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Procurement Indent · {indent.facilityName} {indent.hodName ? `(${indent.hodName})` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant={sideBySide ? "default" : "outline"}
            size="sm"
            className={cn("gap-1.5 text-xs shadow-xs", sideBySide ? "bg-slate-900 hover:bg-slate-800 text-white" : "")}
            onClick={() => {
              const next = !sideBySide;
              setSideBySide(next);
              if (next) setRightPanelTab("scanned_doc");
            }}
          >
            <Split className="h-3.5 w-3.5" />
            <span>{sideBySide ? "Exit Side-by-Side Review" : "Side-by-Side Scanned Doc Review"}</span>
          </Button>
        </div>
      </div>

      {/* Procurement Status Banner */}
      <Card>
        <CardContent className="pt-4 pb-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5" /> Procurement Lifecycle
            </p>
            {lifecycleIsRejected && (
              <Badge variant="outline" className="text-xs border-red-300 text-red-600 bg-red-50">Rejected</Badge>
            )}
          </div>
          <div className="flex items-start">
            {LIFECYCLE_STAGES.map((stage, i) => {
              const done = !lifecycleIsRejected && i <= activeStageIdx;
              const active = !lifecycleIsRejected && i === activeStageIdx;
              const ts = stageTimestamps[i];
              const prevTs = i > 0 ? stageTimestamps[i - 1] : null;
              const days = done && i > 0 ? daysBetween(prevTs, ts) : null;
              return (
                <div key={stage} className="flex items-start flex-1 last:flex-none min-w-0">
                  <div className="flex flex-col items-center min-w-0 shrink-0">
                    <div className={cn(
                      "h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors shrink-0",
                      lifecycleIsRejected && i > 0
                        ? "bg-muted border-border text-muted-foreground"
                        : done
                        ? "bg-primary border-primary text-white"
                        : "bg-muted border-border text-muted-foreground"
                    )}>
                      {done && !lifecycleIsRejected ? "✓" : i + 1}
                    </div>
                    <span className={cn(
                      "text-[11px] mt-1 text-center leading-tight px-0.5",
                      done ? "text-foreground font-medium" : "text-muted-foreground"
                    )}>
                      {stage}
                    </span>
                    {ts && done && (
                      <span className="text-[10px] text-muted-foreground mt-0.5 text-center">
                        {safeFormat(ts, "dd MMM yy")}
                      </span>
                    )}
                    {active && !ts && (
                      <span className="text-[10px] text-primary mt-0.5 font-medium">Active</span>
                    )}
                  </div>
                  {i < LIFECYCLE_STAGES.length - 1 && (
                    <div className="flex flex-col items-center flex-1 pt-3 px-0.5">
                      <div className={cn(
                        "h-0.5 w-full transition-colors",
                        done && !lifecycleIsRejected ? "bg-primary" : "bg-muted"
                      )} />
                      {days !== null && days >= 0 && (
                        <span className="text-[10px] text-muted-foreground mt-0.5 tabular-nums">{days}d</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Rejection notice */}
      {indent.status === "rejected" && indent.rejectionReason && (
        <div className="flex gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-800">Indent Rejected</p>
            <p className="text-sm text-red-700 mt-0.5">{indent.rejectionReason}</p>
          </div>
        </div>
      )}

      {/* ── Administrative Sanction (AS) vs. Estimated Cost Validation Card ── */}
      <Card className="border border-slate-200 bg-white shadow-xs mb-3">
        <CardHeader className="py-3 px-4 border-b border-slate-100 flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-2">
            <IndianRupee className="h-4 w-4 text-slate-700" />
            <CardTitle className="text-sm font-semibold text-slate-900">
              Administrative Sanction (AS) vs. Estimated Cost Assessment
            </CardTitle>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "text-[11px] font-medium border px-2 py-0.5",
              isBudgetShortfall
                ? "bg-amber-50 text-amber-900 border-amber-200"
                : isBudgetValidated
                ? "bg-emerald-50 text-emerald-900 border-emerald-200"
                : "bg-slate-50 text-slate-700 border-slate-200"
            )}
          >
            {isBudgetShortfall
              ? "Budget Shortfall (Reprioritization Required)"
              : isBudgetValidated
              ? "AS Sufficient (Ready for Procurement)"
              : "Pending Scrutiny"}
          </Badge>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* 1. AS Amount - Low contrast soft sky tint */}
            <div className="p-3.5 rounded-lg border border-sky-200/70 bg-sky-50/50">
              <span className="text-[11px] font-semibold text-sky-800 uppercase tracking-wide">
                Administrative Sanction (AS)
              </span>
              <p className="text-base font-bold text-sky-950 mt-0.5">
                {formatINR(effectiveAsAmount)}
              </p>
              <div className="text-[10px] text-sky-700/80 mt-1 space-y-0.5">
                <p>Order Ref: <strong className="text-sky-900">{indent.revisedAsReferenceNo || indent.asReferenceNo || indent.indentRefNumber || "Sanction Order Ref"}</strong></p>
                {indent.revisedAsAmount && (
                  <p className="text-sky-800">Revised AS: ₹{Number(indent.revisedAsAmount).toLocaleString("en-IN")}</p>
                )}
              </div>
            </div>

            {/* 2. Total Estimated Cost - Low contrast soft indigo tint */}
            <div className="p-3.5 rounded-lg border border-indigo-200/70 bg-indigo-50/40">
              <span className="text-[11px] font-semibold text-indigo-800 uppercase tracking-wide">
                Total Estimated Procurement Value
              </span>
              <p className="text-base font-bold text-indigo-950 mt-0.5">
                {formatINR(estimatedProcurementCost)}
              </p>
              <p className="text-[10px] text-indigo-700/80 mt-1">
                Computed from {lineItems.length} line item{lineItems.length !== 1 ? "s" : ""}
              </p>
            </div>

            {/* 3. Surplus / Shortfall - Low contrast soft emerald/amber tint */}
            <div className={cn(
              "p-3.5 rounded-lg border",
              budgetDifference < 0
                ? "border-amber-200/80 bg-amber-50/50"
                : "border-emerald-200/80 bg-emerald-50/50"
            )}>
              <span className={cn(
                "text-[11px] font-semibold uppercase tracking-wide",
                budgetDifference < 0 ? "text-amber-800" : "text-emerald-800"
              )}>
                Surplus (+) / Shortfall (-)
              </span>
              <p className={cn(
                "text-base font-bold mt-0.5",
                budgetDifference < 0 ? "text-amber-950" : "text-emerald-950"
              )}>
                {budgetDifference < 0 ? `- ₹${Math.abs(budgetDifference).toLocaleString("en-IN")}` : `+ ₹${budgetDifference.toLocaleString("en-IN")}`}
              </p>
              <p className={cn(
                "text-[10px] mt-1",
                budgetDifference < 0 ? "text-amber-700/90" : "text-emerald-700/90"
              )}>
                {budgetDifference < 0
                  ? "Shortfall: Estimated value exceeds sanctioned budget."
                  : "Surplus: Requirement is within sanctioned budget."}
              </p>
            </div>
          </div>

          {/* Action Trigger Banners */}
          {/* A. If Budget Shortfall Detected */}
          {isBudgetShortfall && (
            <div className="border border-slate-300 rounded-lg p-3 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-900">
                  {isReprioritizationSubmitted ? (
                    <>
                      <Clock className="h-4 w-4 text-slate-700" />
                      Reprioritization Submitted &mdash; Under TGMSIDC Review
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-4 w-4 text-slate-700" />
                      Budget Shortfall: Action Required by Facility DEO
                    </>
                  )}
                </div>
                <p className="text-xs text-slate-600">
                  {isReprioritizationSubmitted
                    ? `Revised requirement (Est. Cost ₹${estimatedProcurementCost.toLocaleString("en-IN")}, AS ₹${effectiveAsAmount.toLocaleString("en-IN")}) has been submitted by DEO and is currently locked pending TGMSIDC revalidation.`
                    : `Total estimated value exceeds Administrative Sanction by ₹${Math.abs(budgetDifference).toLocaleString("en-IN")}. Adjust item quantities, defer non-critical items, or provide Revised AS details to proceed.`}
                </p>
              </div>
              <Button
                size="sm"
                className={cn(
                  "text-xs shrink-0 transition-colors",
                  isReprioritizationSubmitted
                    ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed hover:bg-slate-100"
                    : "bg-slate-900 hover:bg-slate-800 text-white"
                )}
                onClick={openReprioritizationModal}
                disabled={isReprioritizationSubmitted || (user?.role !== "deo" && user?.role !== "admin")}
                title={isReprioritizationSubmitted ? "Reprioritization submitted. Awaiting TGMSIDC revalidation." : undefined}
              >
                {isReprioritizationSubmitted ? "Reprioritization Submitted (Awaiting Review)" : "Reprioritize Requisition →"}
              </Button>
            </div>
          )}

          {/* B. If Resubmitted for TGMSIDC Revalidation */}
          {(indent.status === "resubmitted_for_review" || indent.status === "under_tgmsidc_revalidation") && (
            <div className="border border-slate-300 rounded-lg p-3 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-900">
                  <CheckCircle2 className="h-4 w-4 text-slate-700" />
                  Reprioritized Requisition Submitted &mdash; TGMSIDC Revalidation Due
                </div>
                <p className="text-xs text-slate-600">
                  Facility DEO has submitted revised item quantities and/or updated Administrative Sanction. Verify that revised procurement cost fits within available AS.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {(user?.role === "tgmsidc_user" || user?.role === "admin") ? (
                  <>
                    <Button
                      size="sm"
                      className="text-xs shrink-0 shadow-xs"
                      onClick={handleRevalidateIndent}
                      disabled={revalidating}
                    >
                      {revalidating ? "Revalidating..." : "Complete Revalidation & Unlock Procurement"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-slate-300 text-slate-700 bg-white hover:bg-slate-50 text-xs shrink-0"
                      onClick={() => setReturnDEODialog(true)}
                      disabled={revalidating}
                    >
                      Return to DEO
                    </Button>
                  </>
                ) : (
                  <Badge variant="outline" className="border-slate-300 text-slate-700 bg-white text-xs px-2.5 py-1">
                    Awaiting TGMSIDC Revalidation
                  </Badge>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>


      {/* ── TGMSIDC Verification Workflow Banner ── */}
      {(indent.verificationStatus === "pending" || indent.verificationStatus === "under_verification" || indent.verificationStatus === "draft" || indent.status === "pending_tgmsidc_verification" || indent.status === "pending_review" || indent.status === "draft") && (
        <Card className="border border-slate-200 bg-white shadow-xs mb-3">
          <CardContent className="p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="h-5 w-5 text-slate-700 shrink-0" />
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">TGMSIDC Requisition Scrutiny &amp; RC Assessment</h3>
                  <p className="text-xs text-slate-600">
                    Verify hospital requirements, evaluate line item active Rate Contracts, and validate estimated cost against Administrative Sanction.
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="bg-slate-50 text-slate-800 border-slate-300 shrink-0 w-fit">
                Pending Scrutiny
              </Badge>
            </div>

            <div className="space-y-1.5 pt-1">
              <Label className="text-xs font-semibold text-slate-700">Scrutiny Remarks / Observations</Label>
              <Input
                placeholder="Enter scrutiny notes regarding budget head, facility quota, and technical compliance..."
                value={verificationRemarks}
                onChange={(e) => setVerificationRemarks(e.target.value)}
                className="text-xs h-9 bg-white"
              />
            </div>

            <div className="flex gap-2 flex-wrap pt-1">
              <Button
                size="sm"
                className="gap-1.5 text-xs shadow-xs"
                onClick={handleVerifyIndent}
                disabled={verifying}
              >
                <CheckCircle2 className="h-4 w-4" />
                {verifying ? "Scrutinizing & Assessing Budget..." : "Complete Scrutiny & Budget Validation"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-slate-300 text-slate-700 bg-white hover:bg-slate-50 gap-1.5 text-xs"
                onClick={() => setReturnDEODialog(true)}
                disabled={verifying}
              >
                <RotateCcw className="h-4 w-4" />
                Return to DEO
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Return to DEO notification & Resubmission */}
      {(
        indent.status === "returned_to_deo_for_correction" ||
        indent.status === "returned_to_deo" ||
        indent.verificationStatus === "returned_to_deo_for_correction" ||
        indent.verificationStatus === "returned_to_deo" ||
        (indent.status === "returned" && indent.returnComments)
      ) && (
        <Card className="border border-amber-200 bg-amber-50 shadow-xs mb-3">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start gap-3">
              <RotateCcw className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
              <div className="space-y-1 flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-900">Indent Returned to Facility DEO — Reprioritization / Revised AS Required</h3>
                  <Badge variant="outline" className="bg-amber-100 text-amber-900 border-amber-300">
                    DEO Action Required
                  </Badge>
                </div>
                <p className="text-xs text-slate-700 font-medium">
                  Remarks from TGMSIDC: <em className="text-slate-800">{indent.returnComments || indent.verificationRemarks || "Please review equipment specifications and budget allocation."}</em>
                </p>
                {(user?.role === "deo" || user?.role === "admin") && (
                  <p className="text-xs text-amber-800 mt-1">
                    Review the item-wise estimated cost, adjust quantities or defer non-critical items to fit within the Administrative Sanction, then resubmit or use the Reprioritize option below.
                  </p>
                )}
              </div>
            </div>
            {(user?.role === "deo" || user?.role === "admin") && (
              <div className="flex items-center gap-2 pt-1">
                <Input
                  placeholder="DEO resubmission comments..."
                  value={verificationRemarks}
                  onChange={(e) => setVerificationRemarks(e.target.value)}
                  className="text-xs h-9 bg-white max-w-md"
                />
                <Button
                  size="sm"
                  className="text-xs gap-1.5 shadow-xs"
                  onClick={handleResubmitIndent}
                  disabled={verifying}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Resubmit to TGMSIDC
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Verification completed status notice */}
      {(indent.verificationStatus === "completed" || indent.status === "verification_completed" || indent.status === "in_procurement" || indent.status === "ready_for_procurement") &&
       indent.status !== "returned_to_deo_for_correction" &&
       indent.status !== "returned_to_deo" &&
       indent.verificationStatus !== "returned_to_deo_for_correction" && (
        <div className="bg-white border border-slate-200 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs mb-3">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-5 w-5 text-slate-700 shrink-0" />
            <div>
              <span className="text-xs font-bold text-slate-900">TGMSIDC Scrutiny &amp; Budget Validation Completed</span>
              <p className="text-[11px] text-slate-600">
                Verified by <strong>{indent.verifiedBy || "TGMSIDC User"}</strong>
                {indent.verifiedAt ? ` on ${safeFormat(indent.verifiedAt)}` : ""}
                {indent.verificationRemarks ? ` · "${indent.verificationRemarks}"` : ""}
              </p>
            </div>
          </div>
          <Badge variant="outline" className="border-slate-300 text-slate-800 bg-slate-50 text-[11px] shrink-0 w-fit">
            Ready for Procurement
          </Badge>
        </div>
      )}

      {/* ── Procurement Routing & Statutory Assessment Banner (Steps 11A & 11B) ── */}
      {indent.tenderId || indent.status === "tender_initiated" ? (
        <Card className="border border-slate-200 bg-white shadow-xs mb-3">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700 shrink-0 mt-0.5">
                  <GitBranch className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900">
                      Open Tendering Workflow Initiated (Rule BR-02)
                    </h3>
                    <Badge variant="outline" className="border-slate-200 text-slate-700 bg-slate-50 text-[10px]">
                      Tender #{indent.tenderNumber || "TND-2026"}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Requisition routed to competitive e-Procurement / GeM bidding because active Rate Contract was not available or expired for line items.
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-xs">
                    <span className="text-slate-500">Portal: <strong className="text-slate-800 uppercase">{indent.tenderPortal || "GeM"}</strong></span>
                    <span className="text-slate-500">Status: <strong className="text-slate-800 capitalize">{indent.tenderStatus || "Invited"}</strong></span>
                    <span className="text-slate-500">Stage: <strong className="text-slate-800">Stage {indent.tenderCurrentStageNumber || 1} of 10</strong></span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Link href={indent.tenderId ? `/tenders/${indent.tenderId}` : "/tenders"}>
                  <Button size="sm" className="text-xs gap-1.5 shadow-xs">
                    Open Tender Details →
                  </Button>
                </Link>
                <Link href="/tenders/workbench">
                  <Button size="sm" variant="outline" className="text-xs border-slate-200">
                    Tender Workbench
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : user?.role !== "deo" && (indent.hasFullRCCoverage || indent.procurementMode === "rate_contract") && !indent.tenderRequired ? (
        <Card className="border border-slate-200 bg-white shadow-xs mb-3">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700 shrink-0 mt-0.5">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900">
                      Covered Under Active Rate Contract (Direct PO Route)
                    </h3>
                    <Badge variant="outline" className="border-slate-200 text-slate-700 bg-slate-50 text-[10px]">
                      RC Available
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    {indent.rateContractNumber
                      ? `Requisitioned equipment is covered under approved Rate Contract ${indent.rateContractNumber} (${indent.rateContractVendor || "Empanelled Vendor"}). Direct Purchase Order can be issued immediately upon approval without tendering.`
                      : "Requisitioned equipment is covered under approved Rate Contract. Direct Purchase Order can be issued immediately upon approval without tendering."}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {indent.rateContractId && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-slate-300 text-slate-700 hover:bg-slate-50 text-xs gap-1.5 shadow-xs"
                    onClick={() => setRcModal({
                      contractNumber: indent.rateContractNumber || "RC Agreement",
                      vendorName: indent.rateContractVendor || "Empanelled Vendor",
                      unitPrice: indent.rateContractUnitPrice || 0,
                      validityEnd: indent.rateContractValidityEnd ?? undefined,
                      equipmentName: indent.equipmentName ?? undefined,
                      id: indent.rateContractId ?? undefined,
                      status: indent.rateContractStatus || "active",
                    })}
                  >
                    View Rate Card
                  </Button>
                )}
                {indent.rateContractId && (
                  <Link href={`/rate-contracts/${indent.rateContractId}`}>
                    <Button size="sm" className="text-xs gap-1.5 shadow-xs">
                      Master Contract →
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : indent.tenderRequired || !indent.hasFullRCCoverage ? (
        <Card className="border border-slate-200 bg-white shadow-xs mb-3">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700 shrink-0 mt-0.5">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900">
                      Active Rate Contract Not Available for All Items
                    </h3>
                    <Badge variant="outline" className="border-slate-200 text-slate-700 bg-slate-50 text-[10px]">
                      Tender Required
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    {indent.missingRCItems?.length
                      ? `${indent.missingRCItems.join(", ")} does not possess an active Rate Contract.`
                      : "One or more line items in this requisition lack a valid Rate Contract."}
                    {" Under healthcare procurement guidelines, items without active Rate Contracts must proceed via Open Tendering (GeM / e-Procurement)."}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  onClick={() => setTenderDialogOpen(true)}
                  className="text-xs gap-1.5 shadow-xs"
                >
                  <GitBranch className="w-3.5 h-3.5" />
                  <span>Initiate Tendering Process</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className={cn("grid gap-6", sideBySide ? "grid-cols-1 xl:grid-cols-12" : "grid-cols-1 lg:grid-cols-3")}>
        {/* Left: details */}
        <div className={cn("space-y-4", sideBySide ? "xl:col-span-7" : "lg:col-span-2")}>

          {/* Top info rows: Facility & Indent Details, Procurement Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="h-4.5 w-4.5 text-primary" />
                  Indent &amp; Facility Details
                </CardTitle>
                <Badge variant="outline" className="text-[10px] font-mono">
                  {indent.indentType?.toUpperCase() || "LETTER"}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-2.5">
                <InfoRow icon={Building2} label="Requesting Facility" value={indent.facilityName} />
                <InfoRow icon={User} label="Head of Department / Superintendent" value={indent.superintendentName || indent.hodName || "Medical Superintendent"} />
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/50">
                  <InfoRow icon={User} label="Contact Person" value={indent.contactPerson || "Dr. K. Srinivas Rao"} />
                  <InfoRow icon={Phone} label="Contact Phone" value={indent.contactPhone || "040-27505566"} />
                </div>
                {indent.contactEmail && (
                  <InfoRow icon={Mail} label="Contact Email" value={indent.contactEmail} />
                )}
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/50">
                  <InfoRow icon={Calendar} label="Submitted Date" value={safeFormat(indent.indentDate || indent.createdAt, "dd MMM yyyy, HH:mm")} />
                  <InfoRow icon={User} label="Digitised By" value={indent.digitisedBy} />
                </div>
                <div className="flex items-start gap-3 pt-1 border-t border-border/50">
                  <IndianRupee className="h-4 w-4 text-slate-700 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Total Estimated Value</p>
                    <p className="text-sm font-bold text-slate-900 mt-0.5">{formatINR(totalEstimated)}</p>
                  </div>
                </div>
                {!hasLineItems && (
                  <>
                    <div className="flex items-center justify-between">
                      <InfoRow icon={Wrench} label="Equipment" value={indent.equipmentName || "Medical Equipment"} />
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1 border-slate-300 text-slate-700 hover:bg-slate-50"
                        onClick={() => setSpecProduct({
                          equipmentId: String(indent.equipmentId || indent.equipmentName),
                          name: indent.equipmentName || "Medical Equipment",
                        })}
                      >
                        <Wrench className="h-3 w-3" />
                        View Specs
                      </Button>
                    </div>
                    <InfoRow icon={FileText} label="Quantity" value={String(indent.quantity || 1)} />
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4.5 w-4.5 text-primary" />
                  Procurement &amp; Financial Details
                </CardTitle>
                <Badge variant="outline" className="text-[10px] font-mono">
                  FY {indent.financialYear || "2026-27"}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-2.5">
                <InfoRow
                  icon={FileText}
                  label="Procurement Pathway"
                  value={indent.procurementMode ? (PROCURE_MODE_OPTIONS.find(o => o.value === indent.procurementMode)?.label.split(" — ")[0] ?? indent.procurementMode) : "Pending technical review & GM approval"}
                />
                {indent.indentRefNumber && (
                  <InfoRow icon={FileText} label="Sanction G.O. / Proceeding Ref" value={indent.indentRefNumber} />
                )}
                {indent.approvedBy && <InfoRow icon={ShieldCheck} label="Final Approved By" value={indent.approvedBy} />}
                {indent.fundingSourceName && <InfoRow icon={Building2} label="Funding Source" value={indent.fundingSourceName} />}
                {indent.programmeName && <InfoRow icon={FileText} label="Programme" value={indent.programmeName} />}
                {indent.accountHeadName && <InfoRow icon={IndianRupee} label="Account Head" value={indent.accountHeadName} />}
                {indent.rateContractId && (
                  <div className="pt-1 border-t border-border/50">
                    <p className="text-xs text-muted-foreground">Linked Rate Contract</p>
                    <div className="flex items-center gap-2 mt-1">
                      {user?.role === "deo" ? (
                        <span className="text-xs font-semibold text-slate-800 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200 select-none">
                          {indent.rateContractNumber || "RC Active"}
                        </span>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => setRcModal({
                              contractNumber: indent.rateContractNumber || "RC Agreement",
                              vendorName: indent.rateContractVendor || "Empanelled Vendor",
                              unitPrice: indent.rateContractUnitPrice || 0,
                              validityEnd: indent.rateContractValidityEnd ?? undefined,
                              equipmentName: indent.equipmentName ?? undefined,
                              id: indent.rateContractId ?? undefined,
                              status: indent.rateContractStatus || "active",
                            })}
                            className="text-xs font-semibold text-slate-800 hover:underline flex items-center gap-1 cursor-pointer bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200"
                          >
                            {indent.rateContractNumber || "View Ratecard"}
                            <ExternalLink className="h-3 w-3" />
                          </button>
                          <Link href={`/rate-contracts/${indent.rateContractId}`}>
                            <span className="text-[11px] text-slate-600 hover:text-slate-900 underline">
                              (Full Master Agreement →)
                            </span>
                          </Link>
                        </>
                      )}
                    </div>
                  </div>
                )}
                {indent.tenderId && (
                  <div className="pt-1 border-t border-border/50">
                    <p className="text-xs text-muted-foreground">Linked Open Tender</p>
                    <Link href={`/tenders/${indent.tenderId}`}>
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-800 hover:underline mt-1 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200">
                        {indent.tenderNumber || "View Tender"} →
                      </span>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Key Signatories & Attached Reference Documents row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Key Signatory Details Card */}
            <Card className="border-border">
              <CardHeader className="pb-2.5 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Award className="h-4 w-4 text-slate-700" />
                  Key Signatory Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5 pt-1">
                {(indent.signatories && indent.signatories.length > 0 ? indent.signatories : [
                  { name: indent.superintendentName || indent.hodName || "Dr. M. Raja Rao", designation: "Medical Superintendent / Civil Surgeon", date: safeFormat(indent.indentDate || indent.createdAt), status: "Verified & Signed" },
                  { name: "Er. K. Ramesh", designation: "Biomedical Engineer (Facility)", date: safeFormat(indent.indentDate || indent.createdAt), status: "Verified & Signed" },
                  { name: indent.digitisedBy || "DEO Initiator", designation: "Data Entry Operator / Consignee", date: safeFormat(indent.createdAt), status: "Digitised & Submitted" },
                ]).map((sig: any, sIdx: number) => (
                  <div key={sIdx} className="p-2.5 bg-muted/20 border border-border/60 rounded-xl space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-slate-700 shrink-0" />
                        {sig.name || `Signatory ${sIdx + 1}`}
                      </p>
                    </div>
                    <p className="text-[11px] text-muted-foreground font-medium">{sig.designation || "Authorised Officer"}</p>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground pt-0.5">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      <span>Date: <strong className="text-foreground">{safeFormat(sig.date || indent.indentDate || indent.createdAt)}</strong></span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Attached Reference Documents Card */}
            <Card className="border-border">
              <CardHeader className="pb-2.5 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Paperclip className="h-4 w-4 text-blue-600" />
                  Attached Reference Documents
                </CardTitle>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 text-[11px] gap-1 px-2 border-blue-200 text-blue-700 hover:bg-blue-50"
                  onClick={() => {
                    setActiveDoc(indent.scannedCopyDataUrl ? {
                      name: indent.scannedCopyFilename || "Scanned_Indent_Sanction.pdf",
                      dataUrl: indent.scannedCopyDataUrl,
                      type: "Facility Sanction Copy & Indent Form"
                    } : null);
                    const next = !sideBySide;
                    setSideBySide(next);
                    if (next) setRightPanelTab("scanned_doc");
                  }}
                >
                  <Eye className="h-3 w-3" />
                  {sideBySide ? "Hide Split View" : "View Scanned Copy"}
                </Button>
              </CardHeader>
              <CardContent className="space-y-2 pt-1">
                {(() => {
                  const docList: any[] = [];
                  if (indent.attachments && indent.attachments.length > 0) {
                    docList.push(...indent.attachments);
                  }
                  if (indent.scannedCopyDataUrl || indent.scannedCopyFilename) {
                    const alreadyExists = docList.some((d: any) =>
                      d.name === indent.scannedCopyFilename || (d.dataUrl && d.dataUrl === indent.scannedCopyDataUrl)
                    );
                    if (!alreadyExists) {
                      docList.unshift({
                        name: indent.scannedCopyFilename || "Scanned_Physical_Indent.pdf",
                        size: indent.scannedCopyDataUrl ? `${(indent.scannedCopyDataUrl.length * 0.75 / (1024 * 1024)).toFixed(1)} MB` : "Scanned Copy",
                        type: "Facility Sanction Order & Requisition Copy",
                        dataUrl: indent.scannedCopyDataUrl,
                        date: safeFormat(indent.createdAt),
                        status: "Verified",
                      });
                    }
                  }

                  if (docList.length === 0) {
                    return (
                      <p className="text-xs text-muted-foreground text-center py-4">No documents attached with this requisition.</p>
                    );
                  }

                  return docList.map((doc: any, dIdx: number) => {
                    const docWithUrl = {
                      ...doc,
                      dataUrl: doc.dataUrl || (doc.name === indent.scannedCopyFilename ? indent.scannedCopyDataUrl : undefined)
                    };
                    return (
                      <div key={dIdx} className="flex items-center justify-between p-2.5 rounded-xl border border-border/60 bg-muted/15 hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="h-8 w-8 rounded-lg bg-red-50 border border-red-200 flex items-center justify-center shrink-0">
                            <FileText className="h-4 w-4 text-red-600" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-foreground truncate max-w-[220px]" title={docWithUrl.name}>{docWithUrl.name}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{docWithUrl.type || "Document"} · {docWithUrl.size || "Document"}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-[11px] text-primary hover:bg-primary/10 gap-1 px-2"
                            onClick={() => {
                              setActiveDoc(docWithUrl);
                              setSideBySide(true);
                              setRightPanelTab("scanned_doc");
                            }}
                          >
                            <Eye className="h-3 w-3" /> View
                          </Button>
                          {docWithUrl.dataUrl && (
                            <a href={docWithUrl.dataUrl} download={docWithUrl.name} target="_blank" rel="noreferrer">
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-500 hover:text-slate-900" title="Download">
                                <Download className="h-3 w-3" />
                              </Button>
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  });
                })()}
              </CardContent>
            </Card>
          </div>

          {/* ── Requested Products / Line Items ── */}
          {hasLineItems ? (
            <Card className="border border-[#e4eaf2] rounded-xl shadow-xs overflow-hidden bg-white">
              <CardHeader className="py-3 px-4 border-b border-[#e4eaf2] bg-[#f8fafc] flex flex-row items-center justify-between space-y-0">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-slate-700" />
                  <CardTitle className="text-sm font-bold text-[#152340]">Requested Products / Equipment Schedule</CardTitle>
                </div>
                <span className="neo-chip gry text-[10px] font-semibold">
                  {lineItems.length} line item{lineItems.length !== 1 ? "s" : ""}
                </span>
              </CardHeader>
              <CardContent className="p-0">
                {(() => {
                  const groups: Record<string, { vendorName: string; lineIndices: number[]; rcs: string[] }> = {};
                  lineItems.forEach((li: any, idx: number) => {
                    const vendor = li.rateContractVendor || (li.candidateRateContracts?.[0]?.vendorName);
                    const rcNum = li.rateContractNumber || (li.candidateRateContracts?.[0]?.contractNumber);
                    if (vendor) {
                      const vKey = vendor.toLowerCase().trim();
                      if (!groups[vKey]) {
                        groups[vKey] = { vendorName: vendor, lineIndices: [], rcs: [] };
                      }
                      groups[vKey].lineIndices.push(idx);
                      if (rcNum && !groups[vKey].rcs.includes(rcNum)) {
                        groups[vKey].rcs.push(rcNum);
                      }
                    }
                  });
                  const multiGroups = Object.values(groups).filter(g => g.lineIndices.length > 1);
                  if (multiGroups.length === 0) return null;

                  return (
                    <div className="p-3 border-b border-[#e4eaf2] bg-emerald-50/50 space-y-2">
                      {multiGroups.map((grp, gIdx) => {
                        const allDrafted = grp.lineIndices.every(i => lineItems[i]?.lineStatus === "po_drafted" || lineItems[i]?.poId);
                        return (
                          <div key={gIdx} className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-emerald-950">
                            <div className="flex items-start gap-2">
                              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                              <div>
                                <span className="font-bold">Same Vendor Identified — {grp.vendorName} ({grp.lineIndices.length} Items): </span>
                                <span className="text-emerald-800">
                                  Based on tagged Rate Contracts ({grp.rcs.join(", ")}), these items can be consolidated into a single combined Purchase Order.
                                </span>
                              </div>
                            </div>
                            {user?.role !== "deo" && !allDrafted && (
                              <Button
                                size="sm"
                                className="h-7 text-xs bg-emerald-700 hover:bg-emerald-800 text-white font-semibold gap-1.5 shadow-xs shrink-0 cursor-pointer"
                                onClick={() => {
                                  const firstIdx = grp.lineIndices[0];
                                  const firstLi = lineItems[firstIdx];
                                  const targetRcId = firstLi.rateContractId || firstLi.candidateRateContracts?.[0]?.rcId || "";
                                  setLocation(`/purchase-orders/new?indentId=${indent.id || (indent as any)._id}&lineIndex=${firstIdx}&equipmentId=${firstLi.equipmentId || ''}&rcId=${targetRcId}&sameVendor=true`);
                                }}
                              >
                                <FileText className="h-3.5 w-3.5" />
                                Raise Consolidated PO ({grp.lineIndices.length} Items)
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[#e4eaf2] bg-[#f8fafc] text-[#6b7a93] font-bold uppercase tracking-wider text-[10.5px]">
                        <th className="py-2.5 px-3 text-center w-10 shrink-0">#</th>
                        <th className="py-2.5 px-3 text-left whitespace-nowrap min-w-[130px]">Category</th>
                        <th className="py-2.5 px-3 text-left min-w-[220px]">Product / Equipment</th>
                        <th className="py-2.5 px-3 text-left min-w-[170px] max-w-[240px]">Specifications</th>
                        <th className="py-2.5 px-3 text-center whitespace-nowrap w-16">Req Qty</th>
                        {lineItems.some((li: any) => li.approvedQty !== undefined) && (
                          <th className="py-2.5 px-3 text-center whitespace-nowrap w-20">App Qty</th>
                        )}
                        <th className="py-2.5 px-3 text-center whitespace-nowrap w-14">Unit</th>
                        <th className="py-2.5 px-3 text-right whitespace-nowrap min-w-[110px]">Est. Unit Rate</th>
                        <th className="py-2.5 px-3 text-right whitespace-nowrap min-w-[110px]">Est. Total</th>
                        <th className="py-2.5 px-3 text-left whitespace-nowrap min-w-[180px]">RC Tag / Routing</th>
                        <th className="py-2.5 px-3 text-center whitespace-nowrap min-w-[110px]">Technical Specs</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#eff3f8]">
                      {lineItems.map((li: any, idx: number) => {
                        const catMeta = getCategoryMeta(li.category || "medical_equipment");
                        const CatIcon = catMeta.icon;
                        const qty = li.requestedQty ?? li.qty ?? 1;
                        const rate = li.estimatedUnitCost ?? li.estimatedUnitRate ?? 0;
                        const unit = li.unitOfMeasure ?? li.unit ?? "No.";
                        const specText = li.specifications || li.justification || getSpecSummary(li.equipmentId) || "As per technical specification";
                        return (
                          <tr key={`${li.equipmentId || idx}-${idx}`} className="hover:bg-[#eff5ff] transition-colors">
                            {/* Sl. No. */}
                            <td className="py-3 px-3 text-center text-xs text-muted-foreground font-mono align-middle">
                              {idx + 1}
                            </td>

                            {/* Category */}
                            <td className="py-3 px-3 whitespace-nowrap align-middle">
                              <span className={cn(
                                "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border",
                                catMeta.bgColor, catMeta.color, catMeta.borderColor
                              )}>
                                <CatIcon className="h-3 w-3 shrink-0" />
                                {catMeta.label}
                              </span>
                            </td>

                            {/* Product Name */}
                            <td className="py-3 px-3 min-w-[220px] align-middle">
                              <button
                                type="button"
                                className="text-left font-semibold text-xs sm:text-[13px] text-slate-900 hover:underline underline-offset-2 transition-colors block leading-snug"
                                onClick={() => setSpecProduct({ equipmentId: String(li.equipmentId), name: li.equipmentName })}
                              >
                                {li.equipmentName}
                              </button>
                              {li.isWriteIn || li.writeInResolution === "pending" ? (
                                <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                                  <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-900 border-amber-300 font-medium">
                                    Write-in: Unverified
                                  </Badge>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-5 text-[10px] px-1.5 border-amber-400 text-amber-900 hover:bg-amber-100"
                                    onClick={() => {
                                      setWriteInModal({ lineItemIndex: idx, item: li });
                                      setNewEquipmentName(li.equipmentName);
                                      setNewEquipmentCategory(li.category || "Medical Equipment");
                                      setNewEquipmentSpecs(li.specifications || "");
                                    }}
                                  >
                                    Resolve Write-in
                                  </Button>
                                </div>
                              ) : li.writeInResolution === "mapped_to_master" ? (
                                <div className="mt-1">
                                  <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-800 border-blue-200">
                                    ✓ Mapped to Master
                                  </Badge>
                                </div>
                              ) : li.writeInResolution === "new_addition_requested" ? (
                                <div className="mt-1">
                                  <Badge variant="outline" className="text-[10px] bg-violet-50 text-violet-800 border-violet-200">
                                    Addition Requested to GM
                                  </Badge>
                                </div>
                              ) : null}
                            </td>

                            {/* Specifications */}
                            <td className="py-3 px-3 min-w-[170px] max-w-[240px] align-middle">
                              <p className="text-xs text-[#4b5563] leading-relaxed line-clamp-2" title={specText}>
                                {specText}
                              </p>
                            </td>

                            {/* Qty & Priority */}
                            <td className="py-3 px-3 text-center whitespace-nowrap tabular-nums text-xs sm:text-sm align-middle">
                              <div className="flex flex-col items-center gap-0.5">
                                <span className={cn("font-bold", li.deferred ? "line-through text-slate-400" : "text-slate-900")}>
                                  {qty}
                                </span>
                                {li.originalRequestedQty && li.originalRequestedQty !== qty && (
                                  <span className="text-[10px] text-slate-500 font-normal">
                                    (Orig: {li.originalRequestedQty})
                                  </span>
                                )}
                                <div className="flex items-center gap-1 mt-0.5">
                                  <Badge variant="outline" className="text-[9px] px-1 py-0 border-slate-200 bg-slate-50 text-slate-700">
                                    P{li.priority || 1}
                                  </Badge>
                                  {li.deferred && (
                                    <Badge variant="outline" className="text-[9px] px-1 py-0 border-slate-300 bg-slate-100 text-slate-600">
                                      Deferred
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* App Qty */}
                            {lineItems.some((l: any) => l.approvedQty !== undefined) && (
                              <td className="py-3 px-3 text-center whitespace-nowrap font-bold text-slate-800 tabular-nums text-xs sm:text-sm align-middle">
                                {li.approvedQty !== undefined ? (
                                  <div className="flex flex-col items-center">
                                    <span>{li.approvedQty}</span>
                                    {li.approvedQty < qty && (
                                      <Badge variant="outline" className="mt-1 text-[9px] bg-slate-50 text-slate-700 border-slate-200 px-1 py-0 h-4" title={li.partialReason || "Partial approval"}>
                                        Partial
                                      </Badge>
                                    )}
                                  </div>
                                ) : "—"}
                              </td>
                            )}

                            {/* Unit */}
                            <td className="py-3 px-3 text-center whitespace-nowrap text-xs text-muted-foreground align-middle">
                              {unit}
                            </td>

                            {/* Est. Unit Rate */}
                            <td className="py-3 px-3 text-right whitespace-nowrap tabular-nums text-xs font-medium text-slate-700 align-middle">
                              ₹{rate.toLocaleString("en-IN")}
                            </td>

                            {/* Est. Total */}
                            <td className="py-3 px-3 text-right whitespace-nowrap tabular-nums font-bold text-xs sm:text-sm text-slate-900 align-middle">
                              {li.deferred ? (
                                <span className="text-slate-400 font-normal text-xs">Deferred (₹0)</span>
                              ) : (
                                formatINR((li.approvedQty ?? qty) * rate)
                              )}
                            </td>

                            {/* RC Tag / Decoupled Line Routing */}
                            <td className="py-3 px-3 whitespace-nowrap align-middle">
                              {li.deferred ? (
                                <div className="flex flex-col items-start gap-0.5">
                                  <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-200 text-[10px]">
                                    Deferred from Procurement
                                  </Badge>
                                  <span className="text-[10px] text-slate-500">
                                    Excluded from current PO cycle
                                  </span>
                                </div>
                              ) : li.lineStatus === "po_raised" || li.lineStatus === "po_drafted" || li.poNumber ? (() => {
                                const matchedPo = linkedPOs.find((p: any) =>
                                  (li.poNumber && p.poNumber === li.poNumber) ||
                                  (li.poId && String(p.id) === String(li.poId))
                                ) || (linkedPOs.length === 1 ? linkedPOs[0] : null);

                                const poVal = matchedPo?.totalAmount || li.estimatedTotalCost || ((li.approvedQty ?? qty) * rate);
                                const t1Amt = matchedPo?.tranche1Amount ?? li.tranche1Amount ?? Math.round(poVal * 0.9);
                                const t2Amt = matchedPo?.tranche2Amount ?? li.tranche2Amount ?? (poVal - t1Amt);

                                const isT1 = Boolean(
                                  matchedPo?.tranche1Paid ||
                                  li.tranche1Paid ||
                                  (matchedPo?.paymentStatus === "paid" && matchedPo?.tranche2Paid !== true) ||
                                  (matchedPo?.paymentStatus === "paid" && matchedPo?.tranche1Paid === undefined) ||
                                  matchedPo?.paymentStatus === "partial" ||
                                  li.paymentStatus === "paid" ||
                                  li.paymentStatus === "partial"
                                );
                                const isT2 = Boolean(
                                  matchedPo?.tranche2Paid ||
                                  li.tranche2Paid ||
                                  (matchedPo?.paymentStatus === "paid" && (matchedPo?.tranche1Paid || matchedPo?.status === "completed" || matchedPo?.tranche2Paid !== false)) ||
                                  (li.paymentStatus === "paid" && (li.tranche1Paid || li.tranche2Paid !== false))
                                );

                                const pct = (isT1 && isT2) ? 100 : (isT1 ? 90 : (isT2 ? 10 : 0));
                                const t1Ref = matchedPo?.tranche1Reference || li.tranche1Reference || (isT1 ? (matchedPo?.paymentReference || `PAY-90-${li.poNumber || matchedPo?.poNumber}`) : "");
                                const t2Ref = matchedPo?.tranche2Reference || li.tranche2Reference || (isT2 ? (matchedPo?.paymentReference || `PAY-10-${li.poNumber || matchedPo?.poNumber}`) : "");
                                const paidTotal = (isT1 ? t1Amt : 0) + (isT2 ? t2Amt : 0);

                                return (
                                  <div className="flex flex-col items-start gap-1 max-w-[280px]">
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300">
                                      <CheckCheck className="h-3 w-3 text-emerald-700 shrink-0" />
                                      {li.lineStatus === "po_drafted" ? "Draft PO: " : "PO Raised: "} {li.poNumber || matchedPo?.poNumber}
                                    </span>
                                    <Link href={li.poId || li.purchaseOrderId || matchedPo?.id ? `/purchase-orders/${li.poId || li.purchaseOrderId || matchedPo?.id}` : `/purchase-orders`}>
                                      <span className="text-[10.5px] text-slate-700 hover:underline cursor-pointer flex items-center gap-1 font-medium">
                                        View PO Details <ExternalLink className="h-2.5 w-2.5" />
                                      </span>
                                    </Link>

                                    {/* Statutory 2-Tranche Payment Division */}
                                    {(matchedPo || li.paymentStatus || isT1 || isT2) && (
                                      <div className="mt-1 pt-1.5 border-t border-slate-200/90 w-full space-y-1">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          {pct === 100 ? (
                                            <Badge variant="outline" className="bg-emerald-100 text-emerald-900 border-emerald-300 text-[10px] font-bold gap-1 py-0 px-1.5">
                                              <CheckCircle2 className="h-2.5 w-2.5 text-emerald-700" />
                                              100% Paid (90% + 10%)
                                            </Badge>
                                          ) : pct === 90 ? (
                                            <Badge variant="outline" className="bg-blue-50 text-blue-900 border-blue-300 text-[10px] font-bold gap-1 py-0 px-1.5">
                                              <Clock className="h-2.5 w-2.5 text-blue-700" />
                                              90% Paid (Tranche 1)
                                            </Badge>
                                          ) : pct === 10 ? (
                                            <Badge variant="outline" className="bg-amber-50 text-amber-900 border-amber-300 text-[10px] font-bold gap-1 py-0 px-1.5">
                                              10% Paid (Tranche 2)
                                            </Badge>
                                          ) : (
                                            <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-300 text-[10px] py-0 px-1.5">
                                              Payment Pending
                                            </Badge>
                                          )}
                                          <span className="text-[10px] font-mono font-semibold text-slate-700">
                                            ₹{paidTotal.toLocaleString("en-IN")}
                                          </span>
                                        </div>

                                        <div className="space-y-0.5 text-[9.5px]">
                                          <div className="flex items-center justify-between gap-1 text-slate-600 bg-slate-50/90 px-1.5 py-0.5 rounded border border-slate-200/70">
                                            <span className="font-medium text-slate-700">Tranche 1 (90%):</span>
                                            <span className={cn("font-bold truncate max-w-[160px]", isT1 ? "text-emerald-700" : "text-amber-700")} title={t1Ref ? `Ref: ${t1Ref}` : undefined}>
                                              ₹{t1Amt.toLocaleString("en-IN")} · {isT1 ? (t1Ref ? `Paid (${t1Ref})` : "Released") : "Pending"}
                                            </span>
                                          </div>
                                          <div className="flex items-center justify-between gap-1 text-slate-600 bg-slate-50/90 px-1.5 py-0.5 rounded border border-slate-200/70">
                                            <span className="font-medium text-slate-700">Tranche 2 (10%):</span>
                                            <span className={cn("font-bold truncate max-w-[160px]", isT2 ? "text-emerald-700" : "text-slate-500")} title={t2Ref ? `Ref: ${t2Ref}` : undefined}>
                                              ₹{t2Amt.toLocaleString("en-IN")} · {isT2 ? (t2Ref ? `Paid (${t2Ref})` : "Released") : "Retained (QPC)"}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })() : li.lineStatus === "tender_initiated" || li.tenderNumber ? (
                                <div className="flex flex-col items-start gap-1">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-800 border border-slate-300">
                                    <Layers className="h-3 w-3 text-slate-700 shrink-0" />
                                    Tender #{li.tenderNumber}
                                  </span>
                                  <Link href={li.tenderId ? `/tenders/${li.tenderId}` : `/tenders`}>
                                    <span className="text-[10.5px] text-slate-700 hover:underline cursor-pointer flex items-center gap-1 font-medium">
                                      View Tender <ExternalLink className="h-2.5 w-2.5" />
                                    </span>
                                  </Link>
                                </div>
                              ) : li.lineStatus === "multiple_rcs_found" || (!li.rateContractId && Array.isArray(li.candidateRateContracts) && li.candidateRateContracts.length > 1) ? (
                                <div className="flex flex-col items-start gap-1.5">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-800 border border-slate-300">
                                    <AlertCircle className="h-3 w-3 text-slate-600 shrink-0" />
                                    {Array.isArray(li.candidateRateContracts) ? li.candidateRateContracts.length : 2} RCs Eligible
                                  </span>
                                  {user?.role === "deo" ? (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      disabled
                                      className="h-6 text-[11px] px-2 border-slate-200 text-slate-400 bg-slate-50 gap-1 font-normal cursor-not-allowed shadow-none"
                                      title="Non-editable for DEO. Rate Contract selection is handled by TGMSIDC User."
                                    >
                                      Select RC
                                    </Button>
                                  ) : (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-6 text-[11px] px-2 border-slate-300 text-slate-800 bg-white hover:bg-slate-50 gap-1 font-semibold shadow-xs"
                                      onClick={() => setMultiRcSelectModal({ lineIndex: idx, item: li, candidates: Array.isArray(li.candidateRateContracts) ? li.candidateRateContracts : [] })}
                                      disabled={lineActionLoading === idx}
                                    >
                                      Select RC
                                    </Button>
                                  )}
                                </div>
                              ) : li.lineStatus === "matched_active_rc" || (li.rateContractId && !li.poNumber) ? (
                                <div className="flex flex-col items-start gap-1">
                                  {user?.role === "deo" ? (
                                    <div className="text-left inline-block select-none cursor-default" title="Tagged Rate Contract (View Only for DEO)">
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                                        <CheckCircle2 className="h-3 w-3 text-slate-700 shrink-0" />
                                        {li.rateContractNumber || "RC Active"}
                                      </span>
                                      <span className="text-[10px] text-muted-foreground block mt-0.5 max-w-[170px] truncate">
                                        ₹{(li.rateContractUnitPrice || 0).toLocaleString("en-IN")} · {li.rateContractVendor}
                                      </span>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => setRcModal({
                                        contractNumber: li.rateContractNumber,
                                        vendorName: li.rateContractVendor,
                                        unitPrice: li.rateContractUnitPrice,
                                        validityEnd: li.rateContractValidityEnd,
                                        equipmentName: li.equipmentName,
                                        id: li.rateContractId,
                                        status: "active",
                                      })}
                                      className="text-left group/rc inline-block cursor-pointer"
                                      title="Click to view Ratecard details"
                                    >
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-800 border border-slate-200 group-hover/rc:bg-slate-200 transition-colors">
                                        <CheckCircle2 className="h-3 w-3 text-slate-700 shrink-0" />
                                        {li.rateContractNumber || "RC Active"}
                                      </span>
                                      <span className="text-[10px] text-muted-foreground block mt-0.5 max-w-[170px] truncate">
                                        ₹{(li.rateContractUnitPrice || 0).toLocaleString("en-IN")} · {li.rateContractVendor}
                                      </span>
                                    </button>
                                  )}

                                  {user?.role === "deo" ? (
                                    <Button
                                      size="sm"
                                      disabled
                                      className="h-6 text-[11px] px-2 bg-slate-100 text-slate-400 border border-slate-200 gap-1 mt-0.5 shadow-none font-normal cursor-not-allowed"
                                      title="Non-editable for DEO. Purchase Order drafting is handled by TGMSIDC User."
                                    >
                                      <FileText className="h-3 w-3 text-slate-400" />
                                      Draft PO
                                    </Button>
                                  ) : (
                                    <Button
                                      size="sm"
                                      className="h-6 text-[11px] px-2.5 gap-1.5 mt-0.5 shadow-xs font-semibold disabled:opacity-50 cursor-pointer"
                                      onClick={() => {
                                        const targetRcId =
                                          (Array.isArray(li.candidateRateContracts) && li.candidateRateContracts.length > 0 ? (
                                            li.candidateRateContracts.find((c: any) => c.unitPrice === (li.estimatedUnitCost || li.rateContractUnitPrice))?.rcId ||
                                            li.candidateRateContracts[0]?.rcId ||
                                            li.candidateRateContracts[0]?.rateContractId
                                          ) : undefined) ||
                                          li.rateContractId ||
                                          indent.rateContractId || "";
                                        setLocation(`/purchase-orders/new?indentId=${indent.id || (indent as any)._id}&lineIndex=${idx}&equipmentId=${li.equipmentId || ''}&rcId=${targetRcId}`);
                                      }}
                                      disabled={lineActionLoading === idx || indent.status === "reprioritization_required" || indent.budgetSufficiency === "insufficient"}
                                      title={indent.status === "reprioritization_required" ? "Reprioritization required before drafting PO" : "Click to review RC details & Draft PO"}
                                    >
                                      <FileText className="h-3 w-3 text-emerald-400" />
                                      Draft PO
                                    </Button>
                                  )}
                                </div>
                              ) : (indent.verificationStatus === "completed" || indent.status === "verification_completed" || indent.status === "in_procurement" || indent.status === "ready_for_procurement") ? (
                                <div className="flex flex-col items-start gap-1">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                                    <AlertCircle className="h-3 w-3 text-slate-600 shrink-0" />
                                    No Active RC
                                  </span>
                                  {user?.role === "deo" ? (
                                    <Button
                                      size="sm"
                                      disabled
                                      className="h-6 text-[11px] px-2 bg-slate-100 text-slate-400 border border-slate-200 gap-1 mt-0.5 shadow-none font-normal cursor-not-allowed"
                                      title="Non-editable for DEO. Tender initiation is handled by TGMSIDC User."
                                    >
                                      <Layers className="h-3 w-3 text-slate-400" />
                                      Initiate Tender
                                    </Button>
                                  ) : (
                                    <Button
                                      size="sm"
                                      className="h-6 text-[11px] px-2 gap-1 mt-0.5 shadow-xs font-semibold"
                                      onClick={() => handleInitiateLineTender(idx, li)}
                                      disabled={lineActionLoading === idx}
                                    >
                                      <Layers className="h-3 w-3" />
                                      {lineActionLoading === idx ? "Initiating..." : "Initiate Tender"}
                                    </Button>
                                  )}
                                </div>
                              ) : (
                                <div className="flex flex-col items-start gap-0.5">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                                    <Clock className="h-3 w-3 text-slate-500 shrink-0" />
                                    Pending Verification
                                  </span>
                                  <span className="text-[10px] text-muted-foreground">
                                    RC evaluated upon verification
                                  </span>
                                </div>
                              )}
                            </td>

                            {/* Technical Specs */}
                            <td className="py-3 px-3 text-center whitespace-nowrap min-w-[110px] align-middle">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs gap-1 border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
                                onClick={() => setSpecProduct({
                                  equipmentId: String(li.equipmentCode || li.equipmentId || li.equipmentName),
                                  equipmentCode: li.equipmentCode,
                                  name: li.equipmentName,
                                })}
                              >
                                <Wrench className="h-3 w-3" />
                                Specs
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-[#e4eaf2] bg-[#f8fafc]">
                        <td colSpan={7} className="py-3.5 px-4 text-right font-bold text-xs uppercase tracking-wider text-[#6b7a93] whitespace-nowrap">
                          Total Estimated Value
                        </td>
                        <td className="py-3.5 px-3 text-right font-bold text-sm text-[#152340] tabular-nums whitespace-nowrap">
                          {formatINR(totalEstimated)}
                        </td>
                        <td colSpan={2} className="py-3.5 px-3" />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Technical Requirements</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{indent.technicalRequirements || "—"}</p>
              </CardContent>
            </Card>
          )}

          {/* Action Panel */}
          {pendingStep && (
            <Card className="border-primary/40 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base text-primary">
                    Action Required: {pendingStep.roleLabel || "Approval Action"}
                  </CardTitle>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Step {pendingStep.stepNumber} of {progress_live.totalSteps} · Assigned to {pendingStep.assignedUserName}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {isFinalProcurementStep && pendingStep.status !== "returned" && (
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Procurement Mode *</Label>
                    <Select value={procurementMode} onValueChange={setProcurementMode}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PROCURE_MODE_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Draft PO Scrutiny Console for Approvers (GM / SO / ED) */}
                {linkedPOs.filter((p: any) => p.status === "draft" || p.status === "pending_approval").length > 0 && (
                  <div className="rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-slate-50 p-3.5 space-y-2.5 shadow-2xs">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-blue-700 shrink-0" />
                        <span className="text-xs font-bold text-blue-950 uppercase tracking-wide">
                          Draft Purchase Order Awaiting Scrutiny
                        </span>
                      </div>
                      <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-800 border-amber-300 font-medium">
                        Draft PO Stage · Pending ED Sanction
                      </Badge>
                    </div>

                    {linkedPOs.filter((p: any) => p.status === "draft" || p.status === "pending_approval").map((p: any) => (
                      <div key={p.id} className="rounded-lg border border-blue-200/80 bg-white p-3 space-y-2">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs text-blue-900">{p.poNumber}</span>
                            {p.rcNumber && (
                              <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-700 border-purple-200">
                                RC #{p.rcNumber}
                              </Badge>
                            )}
                          </div>
                          <Link href={`/purchase-orders/${p.id}`} target="_blank">
                            <Button size="sm" variant="ghost" className="h-6 text-[11px] px-2 text-blue-700 hover:text-blue-900 hover:bg-blue-50 gap-1 font-semibold">
                              <Eye className="h-3 w-3" /> View Draft PO Details <ExternalLink className="h-2.5 w-2.5 ml-0.5" />
                            </Button>
                          </Link>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                          <div>
                            <span className="text-[10px] text-muted-foreground block font-medium uppercase">Equipment</span>
                            <span className="font-semibold text-slate-800 truncate block" title={p.equipmentName}>{p.equipmentName || "Medical Equipment"}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-muted-foreground block font-medium uppercase">Quantity</span>
                            <span className="font-semibold text-slate-800 tabular-nums">{p.quantity || 1} No.</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-muted-foreground block font-medium uppercase">Landed Rate</span>
                            <span className="font-semibold text-slate-800 tabular-nums">₹{(p.unitPriceInclTax || p.unitPrice * 1.12 || 0).toLocaleString("en-IN")}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-muted-foreground block font-medium uppercase">Total PO Value</span>
                            <span className="font-bold text-emerald-700 tabular-nums">₹{(p.totalAmount || 0).toLocaleString("en-IN")}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px] text-slate-600">
                          <div>
                            <span className="text-muted-foreground">Vendor: </span>
                            <span className="font-semibold text-slate-800">{p.vendorName || "Empanelled Vendor"}</span>
                          </div>
                          {p.deliveryAddress && (
                            <div className="max-w-[280px] truncate text-right text-muted-foreground">
                              Consignee: <span className="text-slate-700 font-medium">{p.deliveryAddress.split(",")[0]}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}

                    <div className="text-[11px] text-slate-600 bg-blue-100/40 rounded-md p-2 border border-blue-200/60 leading-relaxed">
                      {pendingStep.requiredRole === "gm_equipment" ? (
                        <><strong>GM Equipment Scrutiny:</strong> Verify technical specifications, Rate Contract pricing compliance (₹4,00,000 unit), and empanelled vendor allocation. Your approval endorses this drafted PO for administrative concurrence.</>
                      ) : pendingStep.requiredRole === "so_equipment" ? (
                        <><strong>SO Equipment Concurrence:</strong> Confirm hospital consignee allocation and administrative alignment. Forwarding endorses this PO for final sanction.</>
                      ) : pendingStep.requiredRole === "executive_director" ? (
                        <><strong>Executive Director Final Sanction:</strong> Approving this indent accords final statutory authorization and will <strong>automatically transition the drafted PO to &apos;PO Issued&apos;</strong> to the vendor.</>
                      ) : (
                        <><strong>Workflow Notice:</strong> This PO was drafted by TGMSIDC User. Approving this indent endorses the PO. Final issuance occurs upon Executive Director (ED) sanction.</>
                      )}
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">
                    {pendingStep.status === "returned" ? "Resubmission Notes" : "Comments / Observations"}
                    <span className="text-red-500 ml-0.5">*</span>
                    <span className="text-muted-foreground font-normal ml-1">(required for Return / Reject)</span>
                  </Label>
                  <Textarea
                    placeholder="Enter approval remarks, technical review findings, or return rationale..."
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    rows={3}
                    className="resize-none"
                  />
                </div>

                <div className="flex gap-2 flex-wrap pt-1">
                  <Button
                    className="bg-emerald-600 hover:bg-emerald-700 gap-2 text-white"
                    onClick={() => handleAction("approved")}
                    disabled={processing}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {processing ? "Processing..." : "Approve"}
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-2 border-amber-300 text-amber-700 hover:bg-amber-50 disabled:opacity-40"
                    onClick={() => handleAction("returned")}
                    disabled={processing || !comments.trim()}
                    title={!comments.trim() ? "Enter a revision reason before returning" : undefined}
                  >
                    <RotateCcw className="h-4 w-4" />
                    Return to DEO
                  </Button>
                  <Button
                    variant="destructive"
                    className="gap-2"
                    onClick={() => setRejectDialog(true)}
                    disabled={processing}
                  >
                    <XCircle className="h-4 w-4" />
                    Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Approval timeline and Scanned Doc viewer */}
        <div className={cn("space-y-3", sideBySide ? "xl:col-span-5" : "")}>
          {sideBySide ? (
            <div className="space-y-3">
              {/* Tab switcher for Right Column */}
              <div className="flex items-center justify-between bg-muted/40 p-1 rounded-xl border border-border">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setRightPanelTab("scanned_doc")}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                      rightPanelTab === "scanned_doc"
                        ? "bg-white text-foreground shadow-xs border border-border"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <FileText className="h-3.5 w-3.5 text-[#186812]" />
                    <span>Scanned Requisition Copy</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRightPanelTab("timeline")}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                      rightPanelTab === "timeline"
                        ? "bg-white text-foreground shadow-xs border border-border"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Clock className="h-3.5 w-3.5 text-blue-600" />
                    <span>Approval Timeline ({progress_live.completedSteps}/{progress_live.totalSteps})</span>
                  </button>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  onClick={() => setSideBySide(false)}
                  title="Close Side-by-Side Review"
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>

              {rightPanelTab === "scanned_doc" ? (
                <ScannedIndentViewer
                  indent={indent}
                  activeDoc={activeDoc}
                  zoom={scannedZoom}
                  onZoomIn={() => setScannedZoom(z => Math.min(z + 25, 200))}
                  onZoomOut={() => setScannedZoom(z => Math.max(z - 25, 50))}
                  onClose={() => setSideBySide(false)}
                  onOpenModal={(doc) => setDocModal(doc)}
                />
              ) : (
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Approval Timeline</CardTitle>
                      <span className="text-xs text-muted-foreground">
                        {progress_live.completedSteps}/{progress_live.totalSteps} steps
                      </span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full mt-2 overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-500"
                        style={{ width: `${progress_live.totalSteps > 0 ? (progress_live.completedSteps / progress_live.totalSteps) * 100 : 0}%` }}
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="pt-1">
                    {steps_live.length > 0 ? (
                      <ApprovalTimeline steps={steps_live} activeStepNumber={progress_live.currentStepNumber} />
                    ) : (
                      <p className="text-xs text-muted-foreground text-center py-4">No approval steps registered</p>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <Card className="sticky top-4">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Approval Timeline</CardTitle>
                  <span className="text-xs text-muted-foreground">
                    {progress_live.completedSteps}/{progress_live.totalSteps} steps
                  </span>
                </div>
                <div className="h-1.5 bg-muted rounded-full mt-2 overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-500"
                    style={{ width: `${progress_live.totalSteps > 0 ? (progress_live.completedSteps / progress_live.totalSteps) * 100 : 0}%` }}
                  />
                </div>
              </CardHeader>
              <CardContent className="pt-1">
                {steps_live.length > 0 ? (
                  <ApprovalTimeline steps={steps_live} activeStepNumber={progress_live.currentStepNumber} />
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-4">No approval steps registered</p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* ── End-to-End Procurement Lifecycle Progression Hub ── */}
      {(indent.approvedBy || indent.status === "po_issued" || indent.status === "completed" || linkedPOs.length > 0) ? (
        <Card className="border-border shadow-xs bg-gradient-to-r from-slate-50/70 via-white to-slate-50/70">
          <CardContent className="p-4 sm:p-5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="h-6 px-2.5 rounded-md bg-[#186812]/10 text-[#186812] text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5 fill-[#186812]/20" /> Procurement Lifecycle Hub
                  </span>
                  <span className="text-xs text-muted-foreground font-mono">
                    {linkedPOs.length > 0 ? linkedPOs[0].poNumber : "PO Auto-Generated on Approval"}
                    {linkedDeliveries.length > 0 ? ` · ${linkedDeliveries[0].deliveryTrackingId}` : ""}
                  </span>
                </div>
                <h3 className="text-base font-bold text-foreground">
                  Statutory Healthcare Procurement Milestone Automation
                </h3>
                <p className="text-xs text-muted-foreground">
                  Seamless progression across Indent Approval &rarr; PO Issuance &rarr; Delivery Consignment &rarr; Technical QA &rarr; GRN (Annexure 6) &rarr; Payment.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* 1. Perform QA */}
                {(firstDeliveredDelivery && !firstQAPassedDelivery) && (
                  <Button
                    size="sm"
                    disabled={lifecycleLoading}
                    onClick={() => handleAdvanceLifecycle("pass_qa")}
                    className="bg-amber-600 hover:bg-amber-700 text-white text-xs gap-1.5 shadow-xs"
                  >
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>Perform QA Inspection (100% Pass)</span>
                  </Button>
                )}

                {/* 2. Issue GRN & Annexure 6 */}
                {(firstQAPassedDelivery && !firstAcceptedDelivery) && (
                  <Button
                    size="sm"
                    disabled={lifecycleLoading}
                    onClick={() => handleAdvanceLifecycle("issue_grn")}
                    className="text-xs gap-1.5 shadow-xs"
                  >
                    <ClipboardCheck className="h-3.5 w-3.5" />
                    <span>Issue GRN &amp; Annexure 6 Certificate</span>
                  </Button>
                )}

                {/* 3. Release Payment Actions (Statutory 2-Tranche Division) */}
                {(firstAcceptedDelivery && !isT1Paid) && (
                  <Button
                    size="sm"
                    disabled={lifecycleLoading}
                    onClick={() => handleAdvanceLifecycle("release_tranche1")}
                    className="text-xs gap-1.5 shadow-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <Receipt className="h-3.5 w-3.5" />
                    <span>Release Tranche 1 (90% Supply Payment)</span>
                  </Button>
                )}

                {(firstAcceptedDelivery && isT1Paid && !isT2Paid) && (
                  <Button
                    size="sm"
                    disabled={lifecycleLoading}
                    onClick={() => handleAdvanceLifecycle("release_tranche2")}
                    className="text-xs gap-1.5 shadow-xs bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    <Receipt className="h-3.5 w-3.5" />
                    <span>Release Tranche 2 (10% Retention Post-QPC)</span>
                  </Button>
                )}

                {firstAcceptedDelivery && isFullyPaid && (
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-300 py-1.5 px-3 text-xs font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>Full Procurement Lifecycle Completed · 100% Paid (90% + 10%)</span>
                  </Badge>
                )}
              </div>
            </div>

            {/* Stepper Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mt-4 pt-3 border-t border-border/60">
              {[
                { title: "1. Indent Approved", done: !!indent.approvedBy || !["pending_review", "pending_approval", "rejected"].includes(indent.status), active: indent.status === "pending_approval" },
                {
                  title: linkedPOs.some((p: any) => p.status === "draft") && !linkedPOs.some((p: any) => p.status === "issued" || p.status === "po_approved") ? "2. PO Drafted" : "2. PO Issued",
                  done: linkedPOs.some((p: any) => p.status === "issued" || p.status === "po_approved" || p.status === "approved" || p.status === "delivered" || p.status === "in_transit") || indent.status === "po_issued" || indent.status === "completed" || isPOIssued,
                  active: false
                },
                { title: "3. Dispatched & In Transit", done: linkedDeliveries.length > 0, active: linkedDeliveries.length > 0 && !firstDeliveredDelivery },
                { title: "4. Delivered at Site", done: !!firstDeliveredDelivery, active: !!firstDeliveredDelivery && !firstQAPassedDelivery },
                { title: "5. QA Inspected (100%)", done: !!firstQAPassedDelivery, active: !!firstQAPassedDelivery && !firstAcceptedDelivery },
                {
                  title: isFullyPaid
                    ? "6. GRN & 100% Paid"
                    : isT1Paid
                    ? "6. GRN & 90% Paid (10% Retained)"
                    : "6. GRN & Paid",
                  done: !!firstAcceptedDelivery && isFullyPaid,
                  active: !!firstAcceptedDelivery && !isFullyPaid
                },
              ].map((st, sIdx) => (
                <div
                  key={sIdx}
                  className={cn(
                    "p-2 rounded-lg border text-center transition-all",
                    st.done
                      ? "bg-emerald-50/80 border-emerald-200 text-emerald-800 font-medium"
                      : st.active
                      ? "bg-blue-50/80 border-blue-300 text-blue-900 font-semibold ring-1 ring-blue-300"
                      : "bg-muted/30 border-border/50 text-muted-foreground"
                  )}
                >
                  <p className="text-[10px] font-bold uppercase tracking-wider">{st.done ? "✓ Complete" : st.active ? "● In Progress" : "○ Pending"}</p>
                  <p className="text-xs font-semibold mt-0.5 truncate">{st.title}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Related Documents */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
          <FileText className="h-3.5 w-3.5" /> Related Documents &amp; Lifecycle
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">

          {/* 1. Rate Contract (RC) Details card */}
          <Card className="border-border shadow-xs">
            <CardContent className="pt-4 pb-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0">
                    <FileCheck2 className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">RC Details</p>
                    <p className="text-[11px] text-muted-foreground">
                      {indent.rateContractId ? "Active Agreement" : "Procurement Mode"}
                    </p>
                  </div>
                </div>
                {indent.rateContractId ? (
                  <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                    Linked
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-600 border-slate-200">
                    {indent.procurementMode === "tender" ? "Tender" : "Pending"}
                  </Badge>
                )}
              </div>

              {indent.rateContractId ? (
                <div className="space-y-1.5 pt-1">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-semibold">Contract Number</p>
                    <p className="text-xs font-mono font-bold text-foreground">{indent.rateContractNumber || "RC-2526-0001"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-semibold">Empanelled OEM / Vendor</p>
                    <p className="text-xs font-medium text-foreground truncate">{indent.rateContractVendor || "Empanelled Vendor"}</p>
                  </div>
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-border/50">
                    <span className="text-muted-foreground text-[11px]">Approved Unit Rate</span>
                    <span className="font-semibold">{formatINR(indent.rateContractUnitPrice || (totalEstimated / (indent.quantity || 1)))}</span>
                  </div>
                  {user?.role !== "deo" && (
                    <button
                      type="button"
                      onClick={() => setRcModal({
                        contractNumber: indent.rateContractNumber || "RC Agreement",
                        vendorName: indent.rateContractVendor || "Empanelled Vendor",
                        unitPrice: indent.rateContractUnitPrice || 0,
                        validityEnd: indent.rateContractValidityEnd ?? undefined,
                        equipmentName: indent.equipmentName ?? undefined,
                        id: indent.rateContractId ?? undefined,
                        status: indent.rateContractStatus || "active",
                      })}
                      className="w-full text-center text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:underline pt-1 block cursor-pointer"
                    >
                      View Ratecard Preview →
                    </button>
                  )}
                </div>
              ) : indent.tenderId ? (
                <div className="space-y-1.5 pt-1">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-semibold">Tender Reference</p>
                    <p className="text-xs font-mono font-bold text-purple-700">{indent.tenderNumber || "TND-2025-0001"}</p>
                  </div>
                  <p className="text-[11px] text-muted-foreground">Routed to Open Tendering under Rule BR-02</p>
                  <Link href={`/tenders/${indent.tenderId}`}>
                    <span className="text-[11px] text-purple-600 hover:underline font-semibold block pt-1 cursor-pointer">
                      Open Tender Dashboard →
                    </span>
                  </Link>
                </div>
              ) : (
                <div className="py-2">
                  <p className="text-xs text-muted-foreground italic">No Rate Contract linked yet.</p>
                  <p className="text-[11px] text-muted-foreground mt-1">RC validation occurs on GM/SO approval.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 2. Purchase Orders card */}
          <Card className="border-border shadow-xs">
            <CardContent className="pt-4 pb-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
                    <Package className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">Purchase Orders</p>
                    <p className="text-[11px] text-muted-foreground">{linkedPOs.length} PO{linkedPOs.length !== 1 ? "s" : ""}</p>
                  </div>
                </div>
                {linkedPOs.length > 0 && (
                  <Badge variant="outline" className={cn("text-[10px]", linkedPOs[0].status === "draft" ? "bg-amber-50 text-amber-800 border-amber-300" : "bg-emerald-50 text-emerald-700 border-emerald-200")}>
                    {linkedPOs[0].status === "draft" ? "Draft PO" : (linkedPOs[0].status === "issued" ? "Issued" : (linkedPOs[0].status || "Issued"))}
                  </Badge>
                )}
              </div>
              {linkedPOs.length === 0 ? (
                <div className="py-2">
                  <p className="text-xs text-muted-foreground italic">No POs issued yet</p>
                  <p className="text-[11px] text-muted-foreground mt-1">PO can be generated once indent is sanctioned.</p>
                </div>
              ) : (
                <div className="space-y-1.5 pt-1">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-semibold">Total PO Value</p>
                    <p className="text-sm font-bold text-emerald-700 tabular-nums">{formatINR(totalPOValue)}</p>
                  </div>
                  <div className="space-y-1.5">
                    {linkedPOs.map((po) => {
                      const pTot = po.totalAmount || 0;
                      const pT1 = po.tranche1Amount || Math.round(pTot * 0.9);
                      const pT2 = po.tranche2Amount || (pTot - pT1);
                      const pIsT1 = Boolean(po.tranche1Paid || po.paymentStatus === "paid" || po.paymentStatus === "partial");
                      const pIsT2 = Boolean(po.tranche2Paid || (po.paymentStatus === "paid" && (po.status === "completed" || po.tranche2Paid)));
                      const pPaidPct = (pIsT1 && pIsT2) ? 100 : (pIsT1 ? 90 : (pIsT2 ? 10 : 0));

                      return (
                        <Link key={po.id} href={`/purchase-orders/${po.id}`}>
                          <div className={cn("p-2 border rounded-md transition-colors cursor-pointer space-y-1", po.status === "draft" ? "bg-amber-50/70 border-amber-200/80 hover:bg-amber-100/70" : "bg-emerald-50/70 border-emerald-200/80 hover:bg-emerald-100/70")}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <span className={cn("text-[11px] font-mono font-bold", po.status === "draft" ? "text-amber-900" : "text-emerald-800")}>{po.poNumber || "PO"}</span>
                                {po.status === "draft" && <Badge variant="outline" className="text-[9px] px-1 py-0 bg-white text-amber-700 border-amber-200">Draft</Badge>}
                              </div>
                              <span className={cn("text-[10px] font-semibold", po.status === "draft" ? "text-amber-800" : "text-emerald-700")}>{formatINR(po.totalAmount)}</span>
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-slate-600 border-t border-emerald-200/60 pt-1">
                              <span className="text-muted-foreground">Payment:</span>
                              <span className={cn("font-semibold text-[10px]", pPaidPct === 100 ? "text-emerald-700" : (pPaidPct === 90 ? "text-blue-700" : "text-slate-500"))}>
                                {pPaidPct === 100 ? "100% Paid (90%+10%)" : pPaidPct === 90 ? "90% Paid (Tranche 1)" : "Pending"}
                              </span>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                  <Link href={linkedPOs.length > 0 ? `/purchase-orders/${linkedPOs[0].id}` : "/purchase-orders"}>
                    <span className="text-[11px] text-emerald-700 hover:underline font-semibold block pt-1 cursor-pointer">
                      View Purchase Order →
                    </span>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 3. Deliveries & QA card */}
          <Card className="border-border shadow-xs">
            <CardContent className="pt-4 pb-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-sky-50 border border-sky-200 flex items-center justify-center shrink-0">
                    <Truck className="h-4 w-4 text-sky-600" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">Deliveries &amp; QA</p>
                    <p className="text-[11px] text-muted-foreground">{linkedDeliveries.length} consignment{linkedDeliveries.length !== 1 ? "s" : ""}</p>
                  </div>
                </div>
                {linkedDeliveries.length > 0 && (
                  <Badge variant="outline" className="text-[10px] bg-sky-50 text-sky-700 border-sky-200">
                    {linkedDeliveries[0].status === "accepted" ? "QA Passed" : (linkedDeliveries[0].status || "In Transit")}
                  </Badge>
                )}
              </div>
              {linkedDeliveries.length === 0 ? (
                <div className="py-2">
                  <p className="text-xs text-muted-foreground italic">No shipments recorded</p>
                  <p className="text-[11px] text-muted-foreground mt-1">Vendor dispatches will appear here.</p>
                </div>
              ) : (
                <div className="space-y-1.5 pt-1">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-semibold">Latest Consignment</p>
                    <p className="text-xs font-mono font-bold text-sky-900 truncate">
                      {linkedDeliveries[0].deliveryTrackingId || linkedDeliveries[0].qrCode || "DEL-0001"}
                    </p>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>Delivered Qty:</span>
                    <span className="font-semibold text-foreground">{linkedDeliveries[0].quantity} units</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>QA Score:</span>
                    <span className="font-semibold text-emerald-700">100% Compliant</span>
                  </div>
                  <Link href={`/deliveries/${linkedDeliveries[0].id}`}>
                    <span className="text-[11px] text-sky-700 hover:underline font-semibold block pt-1 cursor-pointer">
                      Track Consignment &amp; QA →
                    </span>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 4. GRN / Installation card */}
          <Card className="border-border shadow-xs">
            <CardContent className="pt-4 pb-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center shrink-0">
                    <ClipboardCheck className="h-4 w-4 text-teal-600" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">GRN / Installation</p>
                    <p className="text-[11px] text-muted-foreground">Annexure 6 Certificate</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px] bg-teal-50 text-teal-700 border-teal-200">
                  {grnCount > 0 ? "Commissioned" : "Scheduled"}
                </Badge>
              </div>
              <div className="space-y-1.5 pt-1">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase font-semibold">Installation Status</p>
                  <p className="text-xs font-semibold text-foreground">
                    {grnCount > 0 ? "Accepted & Operational" : "Site Preparation & Testing"}
                  </p>
                </div>
                <div className="text-[11px] text-muted-foreground space-y-0.5">
                  <p>Certified: {indent.superintendentName || indent.hodName || "Medical Superintendent"}</p>
                  <p>Warranty: 24 Months OEM + CMC</p>
                </div>
                <Link href="/grn">
                  <span className="text-[11px] text-teal-700 hover:underline font-semibold block pt-1 cursor-pointer">
                    Open GRN Register →
                  </span>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* 5. Invoices & Payments card */}
          {(() => {
            const hasPoPayment = linkedPOs.some((p: any) => p.paymentStatus === "paid" || p.tranche1Paid || p.paymentStatus === "partial") || indent.paymentStatus === "paid" || (indent.totalPaidAmount && indent.totalPaidAmount > 0);
            const primPO = linkedPOs[0];
            const pTot = linkedPOs.reduce((s: number, p: any) => s + (p.totalAmount || 0), 0) || indent.estimatedTotalProcurementValue || indent.estimatedTotalValue || 0;
            const t1 = primPO?.tranche1Amount ?? indent.tranche1Amount ?? Math.round(pTot * 0.9);
            const t2 = primPO?.tranche2Amount ?? indent.tranche2Amount ?? (pTot - t1);
            const isT1 = Boolean(primPO?.tranche1Paid || indent.tranche1Paid || (primPO?.paymentStatus === "paid" && primPO?.tranche2Paid !== true) || (primPO?.paymentStatus === "paid" && primPO?.tranche1Paid === undefined) || primPO?.paymentStatus === "partial" || indent.paymentStatus === "paid" || indent.paymentStatus === "partial");
            const isT2 = Boolean(primPO?.tranche2Paid || indent.tranche2Paid || (primPO?.paymentStatus === "paid" && (primPO?.tranche1Paid || primPO?.status === "completed" || primPO?.tranche2Paid !== false)) || (indent.paymentStatus === "paid" && (indent.tranche2Paid || indent.tranche1Paid)));
            const pct = (isT1 && isT2) ? 100 : (isT1 ? 90 : (isT2 ? 10 : 0));
            const paidAmt = (isT1 ? t1 : 0) + (isT2 ? t2 : 0);

            return (
              <Card className="border-border shadow-xs">
                <CardContent className="pt-4 pb-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center shrink-0">
                        <Receipt className="h-4 w-4 text-indigo-600" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-foreground">Invoices &amp; Payments</p>
                        <p className="text-[11px] text-muted-foreground">
                          {hasPoPayment ? `${linkedPOs.length || 1} PO · 2-Tranche Model` : `${linkedInvoices.length} invoice${linkedInvoices.length !== 1 ? "s" : ""}`}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px] bg-indigo-50 text-indigo-700 border-indigo-200">
                      {pct === 100 || allInvoicesPaid ? "100% Cleared" : (pct === 90 ? "90% Released" : (linkedInvoices.length > 0 ? "In Process" : "Pending"))}
                    </Badge>
                  </div>
                  {(!hasPoPayment && linkedInvoices.length === 0) ? (
                    <div className="py-2">
                      <p className="text-xs text-muted-foreground italic">No invoices submitted</p>
                      <p className="text-[11px] text-muted-foreground mt-1">Bills raised post delivery appear here.</p>
                    </div>
                  ) : (
                    <div className="space-y-1.5 pt-1">
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase font-semibold">Total Paid / Released</p>
                        <p className="text-sm font-bold text-indigo-800 tabular-nums">
                          {formatINR(hasPoPayment ? paidAmt : (totalInvoiced || totalPOValue))}
                        </p>
                      </div>
                      <div className="text-[11px] text-muted-foreground space-y-0.5">
                        {hasPoPayment ? (
                          <>
                            <p className="truncate text-slate-700 font-medium">{`Ref: PAY-90-${primPO?.poNumber || indent.poNumber || 'PO'}`}</p>
                            <p className="text-emerald-700 font-semibold">
                              Tranche 1 (90%): {isT1 ? "Released" : "Pending"} · Tranche 2 (10%): {isT2 ? "Released" : "Pending"}
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="truncate">Inv: {linkedInvoices[0]?.invoiceNumber}</p>
                            <p className="text-emerald-700 font-medium">Payment: {linkedInvoices[0]?.status === "paid" ? "Treasury Tranche Paid" : "Verified by Finance"}</p>
                          </>
                        )}
                      </div>
                      <Link href="/payments">
                        <span className="text-[11px] text-indigo-700 hover:underline font-semibold block pt-1 cursor-pointer">
                          Open Statutory Payments →
                        </span>
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })()}

        </div>
      </div>


      {/* Audit Log */}
      <Accordion type="single" collapsible className="border rounded-lg bg-card">
        <AccordionItem value="audit-log" className="border-b-0">
          <AccordionTrigger className="px-4 text-sm font-semibold hover:no-underline">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-muted-foreground" />
              Audit Log &amp; Workflow History
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">
                {auditLog.length} event{auditLog.length !== 1 ? "s" : ""}
              </Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4">
            {auditLog.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2 italic">No workflow history events recorded.</p>
            ) : (
              <div className="relative">
                {auditLog.map((entry, idx) => (
                  <div key={entry.id} className="flex gap-3 pb-4 last:pb-0">
                    <div className="flex flex-col items-center shrink-0">
                      <div className="h-2 w-2 rounded-full bg-muted-foreground/40 mt-1.5 shrink-0" />
                      {idx < auditLog.length - 1 && (
                        <div className="w-px flex-1 bg-border mt-1" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 pb-0">
                      <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                        <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 border", AUDIT_EVENT_COLORS[entry.eventType])}>
                          {entry.eventType.replace("_", " ")}
                        </Badge>
                        <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                          {safeFormat(entry.timestamp, "dd MMM yyyy, HH:mm")}
                        </span>
                      </div>
                      <p className="text-xs text-foreground leading-snug">{entry.event}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {entry.actor} · <span className="italic">{entry.role}</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Spec sheet slide-over */}
      <Sheet open={!!specProduct} onOpenChange={(open) => { if (!open) setSpecProduct(null); }}>
        <SheetContent className="sm:max-w-[600px] p-0 flex flex-col">
          <SheetHeader className="px-6 py-4 border-b shrink-0">
            <SheetTitle className="text-base pr-8">{specProduct?.name}</SheetTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Technical Specification Sheet</p>
          </SheetHeader>
          <ScrollArea className="flex-1">
            <div className="px-6 py-4">
              {specProduct && (
                <ProductSpecSheet
                  equipmentId={Number(specProduct.equipmentId) || 1}
                  equipmentName={specProduct.name}
                />
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Ratecard Quick View Dialog */}
      <Dialog open={!!rcModal} onOpenChange={(open) => { if (!open) setRcModal(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-between pr-6">
              <DialogTitle className="text-base font-bold text-[#152340]">
                Rate Contract Master Agreement
              </DialogTitle>
              {rcModal?.status === "expired" ? (
                <span className="neo-chip red text-[10px]">Expired</span>
              ) : (
                <span className="neo-chip grn text-[10px]">Active</span>
              )}
            </div>
          </DialogHeader>

          {rcModal && (
            <div className="space-y-3.5 py-2">
              {rcModal.status === "expired" && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-800 leading-relaxed">
                    This Rate Contract validity has expired. Per Procurement Rule BR-02, no Purchase Orders can be drawn against an expired rate card. This equipment must be procured via Open Tendering (GeM / e-Procurement).
                  </p>
                </div>
              )}

              <div className="bg-[#f8fafc] border border-[#e4eaf2] rounded-lg p-3 space-y-2 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-[#eff3f8]">
                  <span className="text-[#6b7a93]">Contract Number</span>
                  <span className="font-mono font-bold text-[#152340]">{rcModal.contractNumber}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-[#eff3f8]">
                  <span className="text-[#6b7a93]">Equipment / Product</span>
                  <span className="font-semibold text-[#152340]">{rcModal.equipmentName || "Medical Equipment"}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-[#eff3f8]">
                  <span className="text-[#6b7a93]">Empanelled OEM / Vendor</span>
                  <span className="font-semibold text-[#152340]">{rcModal.vendorName}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-[#eff3f8]">
                  <span className="text-[#6b7a93]">Approved Base Unit Price</span>
                  <span className="font-bold text-[#152340] tabular-nums">₹{(rcModal.unitPrice ?? 0).toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-[#eff3f8]">
                  <span className="text-[#6b7a93]">Landed Rate (+12% GST)</span>
                  <span className="font-bold text-[#159557] tabular-nums text-sm">
                    ₹{Math.round((rcModal.unitPrice ?? 0) * 1.12).toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-[#6b7a93]">Validity Period</span>
                  <span className={cn("font-medium", rcModal.status === "expired" ? "text-red-600" : "text-[#152340]")}>
                    Valid till {safeFormat(rcModal.validityEnd)}
                  </span>
                </div>
              </div>

              <DialogFooter className="gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setRcModal(null)} className="text-xs">
                  Close
                </Button>
                {rcModal.status === "expired" ? (
                  <Button
                    size="sm"
                    onClick={() => {
                      setRcModal(null);
                      setTenderDialogOpen(true);
                    }}
                    className="text-xs gap-1.5"
                  >
                    <GitBranch className="w-3.5 h-3.5" />
                    Initiate Tendering Process
                  </Button>
                ) : rcModal.id ? (
                  <Link href={`/rate-contracts/${rcModal.id}`}>
                    <Button size="sm" className="text-xs gap-1.5">
                      Open Full Agreement <ExternalLink className="w-3 h-3" />
                    </Button>
                  </Link>
                ) : null}
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Initiate Tendering Process Dialog */}
      <Dialog open={tenderDialogOpen} onOpenChange={setTenderDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#152340] flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-[#186812]" />
              Initiate Tendering Process (Rule BR-02)
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-lg text-xs text-blue-900 leading-relaxed">
              This action routes Indent <strong className="font-mono">{indent.indentNumber}</strong> ({indent.facilityName}) to the competitive bidding workflow. The requisition status will become <span className="font-semibold text-purple-700">Tender Initiated</span>, and a new Tender enquiry will be generated under Stage 1 (Tender Formulation &amp; NIT).
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#152340]">E-Procurement Platform *</Label>
              <Select value={tenderPortal} onValueChange={setTenderPortal}>
                <SelectTrigger className="text-xs h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gem" className="text-xs">
                    GeM — Government e-Marketplace (National Portal)
                  </SelectItem>
                  <SelectItem value="e-procurement" className="text-xs">
                    Telangana e-Procurement Portal (State Government)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#152340]">Tender Bidding Type *</Label>
              <Select value={tenderType} onValueChange={setTenderType}>
                <SelectTrigger className="text-xs h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open" className="text-xs">
                    Open Competitive Bidding (Two-Cover System)
                  </SelectItem>
                  <SelectItem value="limited" className="text-xs">
                    Limited Tender (Pre-qualified / Empanelled Vendors)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#152340]">Tender Formulation Remarks / NIT Scope</Label>
              <Textarea
                value={tenderNotes}
                onChange={(e) => setTenderNotes(e.target.value)}
                placeholder={`Initiated for ${indent.facilityName} due to uncontracted/expired items: ${indent.missingRCItems?.join(", ") || "Requisition Line Items"}.`}
                rows={3}
                className="text-xs resize-none"
              />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setTenderDialogOpen(false)} className="text-xs">
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => initiateTenderMutation.mutate()}
                disabled={processing}
                className="text-xs gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {processing ? "Initiating Tender…" : "Confirm & Initiate Tender"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Write-in Equipment Resolution Dialog (Process Book §1 Step 12 & §12 F-38) */}
      <Dialog open={!!writeInModal} onOpenChange={(open) => { if (!open) setWriteInModal(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#152340] flex items-center gap-2">
              <CheckCheck className="h-4 w-4 text-[#186812]" />
              Resolve Write-in Equipment
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleResolveWriteIn} className="space-y-4 py-2">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900">
              <p className="font-semibold">Unverified Item: {writeInModal?.item?.equipmentName}</p>
              <p className="text-[11px] text-amber-800 mt-0.5">
                Facility entered a write-in item that was not auto-matched to the official Equipment Master. Choose Option A to map to an existing item or Option B to route a new equipment addition request to GM Equipment.
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-[#152340]">Resolution Pathway *</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setWriteInAction("map_to_master")}
                  className={cn(
                    "p-3 rounded-lg border text-left transition-all",
                    writeInAction === "map_to_master"
                      ? "border-[#186812] bg-[#186812]/5 ring-1 ring-[#186812]"
                      : "border-border hover:bg-muted/50"
                  )}
                >
                  <p className="text-xs font-bold text-[#152340]">Option A</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Map to Active Equipment Master</p>
                </button>
                <button
                  type="button"
                  onClick={() => setWriteInAction("new_addition_requested")}
                  className={cn(
                    "p-3 rounded-lg border text-left transition-all",
                    writeInAction === "new_addition_requested"
                      ? "border-[#186812] bg-[#186812]/5 ring-1 ring-[#186812]"
                      : "border-border hover:bg-muted/50"
                  )}
                >
                  <p className="text-xs font-bold text-[#152340]">Option B</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Request Addition to Master (GM)</p>
                </button>
              </div>
            </div>

            {writeInAction === "map_to_master" ? (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#152340]">Select Official Equipment Master Item *</Label>
                <Select value={mappedEquipmentId} onValueChange={setMappedEquipmentId}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Choose matching equipment from catalog…" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {allEquipment.map((eq: any) => (
                      <SelectItem key={eq.id} value={String(eq.id)} className="text-xs">
                        {eq.name} ({eq.category || "Medical Equipment"}) — Model: {eq.modelNumber || "Std"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground">
                  The line item will be updated to point to this catalog item and re-evaluated against active Rate Contracts.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-[#152340]">Proposed Equipment Name *</Label>
                  <Input
                    className="text-xs"
                    value={newEquipmentName}
                    onChange={(e) => setNewEquipmentName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-[#152340]">Equipment Category</Label>
                  <Select value={newEquipmentCategory} onValueChange={setNewEquipmentCategory}>
                    <SelectTrigger className="text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Medical Equipment" className="text-xs">Medical Equipment</SelectItem>
                      <SelectItem value="Diagnostic Equipment" className="text-xs">Diagnostic Equipment</SelectItem>
                      <SelectItem value="Surgical Instruments" className="text-xs">Surgical Instruments</SelectItem>
                      <SelectItem value="Hospital Furniture" className="text-xs">Hospital Furniture</SelectItem>
                      <SelectItem value="Life Support Equipment" className="text-xs">Life Support Equipment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-[#152340]">Detailed Technical Specifications / Justification</Label>
                  <Textarea
                    className="text-xs resize-none"
                    rows={3}
                    value={newEquipmentSpecs}
                    onChange={(e) => setNewEquipmentSpecs(e.target.value)}
                    placeholder="Enter clinical specs, power requirements, and regulatory justification for GM review…"
                  />
                </div>
              </div>
            )}

            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setWriteInModal(null)} className="text-xs">
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={writeInSubmitting || (writeInAction === "map_to_master" && !mappedEquipmentId) || (writeInAction === "new_addition_requested" && !newEquipmentName.trim())}
                className="text-xs gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {writeInSubmitting ? "Submitting…" : writeInAction === "map_to_master" ? "Confirm & Map to Master" : "Submit Request to GM"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialog} onOpenChange={setRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Indent — {indent.indentNumber}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
              <p className="font-medium">{indent.equipmentName || "Indent"}</p>
              <p className="text-xs mt-0.5">{indent.facilityName}</p>
            </div>
            <div className="space-y-1.5">
              <Label>Rejection Reason *</Label>
              <Textarea
                placeholder="Provide a clear statutory reason for rejection…"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog(false)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={!rejectReason.trim() || processing}
              onClick={() => {
                if (!pendingStep) return;
                stepMutation.mutate({
                  stepNumber: pendingStep.stepNumber,
                  status: "rejected",
                  comments: rejectReason.trim(),
                });
                setRejectDialog(false);
                setRejectReason("");
              }}
            >
              <XCircle className="h-4 w-4 mr-1.5" />
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Return Indent to DEO Dialog */}
      <Dialog open={returnDEODialog} onOpenChange={setReturnDEODialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-amber-900 flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-amber-600" />
              Return Indent to Facility DEO
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-xs text-muted-foreground">
              Please specify clear, actionable instructions on what needs revision (e.g. quantity reduction, specification correction, or budget head discrepancy).
            </p>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Revision Reason / Instructions *</Label>
              <Textarea
                placeholder="Enter mandatory revision remarks for the facility Data Entry Operator..."
                value={returnRemarks}
                onChange={(e) => setReturnRemarks(e.target.value)}
                rows={3}
                className="text-xs resize-none"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setReturnDEODialog(false); setReturnRemarks(""); }}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs gap-1.5 shadow-xs"
              onClick={handleReturnToDEO}
              disabled={verifying || !returnRemarks.trim()}
            >
              <RotateCcw className="h-4 w-4" />
              {verifying ? "Returning..." : "Confirm Return to DEO"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Select Rate Contract from Candidates Modal */}
      <Dialog open={!!multiRcSelectModal} onOpenChange={(open) => { if (!open) setMultiRcSelectModal(null); }}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              Select Active Rate Contract for Line Item
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs">
              <p className="font-semibold text-slate-900">Equipment: {multiRcSelectModal?.item?.equipmentName}</p>
              <p className="text-muted-foreground mt-0.5">
                Requested Quantity: {multiRcSelectModal?.item?.requestedQty ?? multiRcSelectModal?.item?.qty ?? 1} Units
              </p>
            </div>

            <p className="text-xs font-medium text-slate-700">
              Multiple eligible Rate Contracts were found. Select the approved vendor and contract to tag:
            </p>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {(multiRcSelectModal?.candidates || []).map((cand: any) => {
                const isSelected = selectedCandidateRcId === (cand._id || cand.id);
                return (
                  <div
                    key={cand._id || cand.id}
                    onClick={() => setSelectedCandidateRcId(cand._id || cand.id)}
                    className={cn(
                      "p-3 rounded-lg border text-xs cursor-pointer transition-all flex items-center justify-between",
                      isSelected
                        ? "border-emerald-500 bg-emerald-50/70 shadow-xs"
                        : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                    )}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{cand.rateContractNumber || cand.contractNumber}</span>
                        <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold">
                          Active
                        </Badge>
                      </div>
                      <p className="text-slate-600 font-medium">Vendor: {cand.vendorName || "Empanelled Supplier"}</p>
                      <p className="text-slate-500 text-[11px]">
                        Validity: until {safeFormat(cand.validityEndDate || cand.validityEnd)}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-emerald-700">
                        ₹{(cand.unitPrice || cand.unitRate || 0).toLocaleString("en-IN")}
                      </span>
                      <span className="text-[10px] text-muted-foreground block">per unit (excl. GST)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <DialogFooter className="gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setMultiRcSelectModal(null); setSelectedCandidateRcId(""); }}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 shadow-xs"
              onClick={handleConfirmSelectRC}
              disabled={!selectedCandidateRcId}
            >
              <CheckCircle2 className="h-4 w-4" />
              Confirm & Tag Rate Contract
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Product Technical Specifications Slide-Over Sheet */}
      <Sheet open={!!specProduct} onOpenChange={(open) => { if (!open) setSpecProduct(null); }}>
        <SheetContent className="sm:max-w-[700px] p-0 flex flex-col">
          <SheetHeader className="px-6 py-4 border-b shrink-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <SheetTitle className="text-base leading-snug pr-8">{specProduct?.name}</SheetTitle>
                {specProduct && (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-mono text-xs font-bold text-primary">{specProduct.equipmentCode || specProduct.equipmentId}</span>
                    <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                      Standard Technical Specification
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          </SheetHeader>
          <ScrollArea className="flex-1">
            <div className="px-6 py-4">
              {specProduct && (
                <ProductSpecSheet
                  equipmentId={specProduct.equipmentId}
                  equipmentCode={specProduct.equipmentCode}
                  equipmentName={specProduct.name}
                  editable={false}
                />
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* ── Document Fullscreen Preview Modal ── */}
      <Dialog open={!!docModal} onOpenChange={(open) => !open && setDocModal(null)}>
        <DialogContent className="max-w-5xl max-h-[92vh] flex flex-col p-6">
          <DialogHeader className="flex flex-row items-center justify-between pb-3 border-b pr-6">
            <div className="flex items-center gap-2.5 min-w-0">
              <FileText className="h-5 w-5 text-blue-600 shrink-0" />
              <div className="min-w-0">
                <DialogTitle className="text-base font-bold truncate max-w-md">{docModal?.name}</DialogTitle>
                <p className="text-xs text-muted-foreground">{docModal?.type || "Reference Document"} {docModal?.size ? `· ${docModal.size}` : ""}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {docModal?.dataUrl && (
                <a href={docModal.dataUrl} download={docModal.name} target="_blank" rel="noreferrer">
                  <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs">
                    <Download className="h-3.5 w-3.5" /> Download
                  </Button>
                </a>
              )}
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-auto p-3 bg-slate-100 rounded-xl flex items-center justify-center min-h-[500px]">
            {docModal?.dataUrl?.startsWith("data:image/") || /\.(jpg|jpeg|png|webp|gif)$/i.test(docModal?.name || "") ? (
              <img
                src={docModal.dataUrl}
                alt={docModal.name}
                className="max-h-[75vh] max-w-full object-contain rounded-lg shadow-sm"
              />
            ) : docModal?.dataUrl?.startsWith("data:application/pdf") || /\.pdf$/i.test(docModal?.name || "") ? (
              <object
                data={docModal.dataUrl}
                type="application/pdf"
                className="w-full h-[75vh] rounded-lg border-0 bg-white shadow-sm"
              >
                <iframe
                  src={docModal.dataUrl}
                  title={docModal.name}
                  className="w-full h-[75vh] rounded-lg border-0 bg-white shadow-sm"
                />
              </object>
            ) : (
              <div className="text-center p-8 bg-white rounded-2xl shadow-sm border max-w-md">
                <FileText className="h-16 w-16 text-blue-500/50 mx-auto mb-3" />
                <p className="text-base font-bold text-slate-800">{docModal?.name}</p>
                <p className="text-xs text-muted-foreground mt-1 mb-4">Click below to download and view this document.</p>
                {docModal?.dataUrl && (
                  <a href={docModal.dataUrl} download={docModal.name}>
                    <Button className="gap-2 shadow-sm">
                      <Download className="h-4 w-4" /> Download Document
                    </Button>
                  </a>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── DEO Reprioritization & Revised AS Modal ── */}
      <Dialog open={reprioritizeModalOpen} onOpenChange={setReprioritizeModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Reprioritize Equipment Requisition &amp; Submit Revised AS
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              Review line items, adjust quantities, set priority order (P1 = Critical, P2 = Essential, P3 = Desirable), defer non-critical items, or provide Revised Administrative Sanction Order details.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleReprioritizeSubmit} className="space-y-4 pt-1">
            {/* Line items reprioritization table */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="p-2 text-center w-8">#</th>
                    <th className="p-2 text-left">Equipment</th>
                    <th className="p-2 text-center w-20">Orig Qty</th>
                    <th className="p-2 text-center w-24">Revised Qty</th>
                    <th className="p-2 text-center w-28">Priority</th>
                    <th className="p-2 text-center w-20">Defer?</th>
                    <th className="p-2 text-right w-24">Est. Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reprioritizeLines.map((line, idx) => {
                    const lineTotal = line.deferred ? 0 : Number(line.requestedQty || 0) * (line.estimatedUnitRate || 0);
                    return (
                      <tr key={idx} className={cn("hover:bg-slate-50/50", line.deferred && "opacity-60 bg-slate-50/30")}>
                        <td className="p-2 text-center font-mono text-slate-400">{idx + 1}</td>
                        <td className="p-2">
                          <p className="font-semibold text-slate-900">{line.equipmentName}</p>
                          <p className="text-[10px] text-slate-500">₹{(line.estimatedUnitRate || 0).toLocaleString("en-IN")} / unit</p>
                        </td>
                        <td className="p-2 text-center font-mono text-slate-600">{line.originalRequestedQty}</td>
                        <td className="p-2 text-center">
                          <Input
                            type="number"
                            min="0"
                            disabled={line.deferred}
                            value={line.requestedQty}
                            onChange={(e) => {
                              const val = Math.max(0, parseInt(e.target.value) || 0);
                              setReprioritizeLines((prev) =>
                                prev.map((item, i) => (i === idx ? { ...item, requestedQty: val } : item))
                              );
                            }}
                            className="h-7 text-xs text-center w-20 mx-auto"
                          />
                        </td>
                        <td className="p-2 text-center">
                          <Select
                            value={String(line.priority || 1)}
                            onValueChange={(v) => {
                              setReprioritizeLines((prev) =>
                                prev.map((item, i) => (i === idx ? { ...item, priority: parseInt(v) } : item))
                              );
                            }}
                          >
                            <SelectTrigger className="h-7 text-[11px] w-24 mx-auto">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">P1 - Critical</SelectItem>
                              <SelectItem value="2">P2 - Essential</SelectItem>
                              <SelectItem value="3">P3 - Desirable</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-2 text-center">
                          <input
                            type="checkbox"
                            checked={line.deferred}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setReprioritizeLines((prev) =>
                                prev.map((item, i) => (i === idx ? { ...item, deferred: checked } : item))
                              );
                            }}
                            className="h-4 w-4 rounded border-slate-300 text-slate-900 cursor-pointer"
                          />
                        </td>
                        <td className="p-2 text-right font-mono font-medium text-slate-800">
                          {line.deferred ? <span className="text-slate-400">Deferred</span> : `₹${lineTotal.toLocaleString("en-IN")}`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Revised AS Section */}
            <div className="p-3 border border-slate-200 rounded-lg bg-slate-50/50 space-y-2.5">
              <span className="text-xs font-semibold text-slate-900">
                Optional: Revised Administrative Sanction (AS) Details
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                <div>
                  <Label className="text-[11px] text-slate-600">Revised AS Amount (₹)</Label>
                  <Input
                    type="number"
                    placeholder="Enter revised AS amount"
                    value={revisedAsAmountInput}
                    onChange={(e) => setRevisedAsAmountInput(e.target.value)}
                    className="h-8 text-xs mt-1"
                  />
                </div>
                <div>
                  <Label className="text-[11px] text-slate-600">Revised AS Order / G.O. Ref</Label>
                  <Input
                    placeholder="e.g. G.O. Rt. No. 204"
                    value={revisedAsRefInput}
                    onChange={(e) => setRevisedAsRefInput(e.target.value)}
                    className="h-8 text-xs mt-1"
                  />
                </div>
                <div>
                  <Label className="text-[11px] text-slate-600">Revised AS Date</Label>
                  <Input
                    type="date"
                    value={revisedAsDateInput}
                    onChange={(e) => setRevisedAsDateInput(e.target.value)}
                    className="h-8 text-xs mt-1"
                  />
                </div>
              </div>
              <div>
                <Label className="text-[11px] text-slate-600">Reprioritization Notes / Justification</Label>
                <Input
                  placeholder="Justification for quantity adjustments, deferrals, or revised AS order..."
                  value={revisedAsRemarksInput}
                  onChange={(e) => setRevisedAsRemarksInput(e.target.value)}
                  className="h-8 text-xs mt-1"
                />
              </div>
            </div>

            {/* Dynamic Real-time Calculation Summary */}
            {(() => {
              const projectedCost = reprioritizeLines.reduce((sum, item) => {
                if (item.deferred) return sum;
                return sum + (Number(item.requestedQty || 0) * (item.estimatedUnitRate || 0));
              }, 0);
              const targetAs = revisedAsAmountInput ? Number(revisedAsAmountInput) : effectiveAsAmount;
              const projectedDiff = targetAs - projectedCost;

              return (
                <div className="p-3 border border-slate-200 rounded-lg bg-slate-50 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-500">Projected Procurement Cost: </span>
                    <strong className="text-slate-900 font-mono">₹{projectedCost.toLocaleString("en-IN")}</strong>
                    <span className="text-slate-400 mx-2">|</span>
                    <span className="text-slate-500">Available AS: </span>
                    <strong className="text-slate-900 font-mono">₹{targetAs.toLocaleString("en-IN")}</strong>
                  </div>
                  <div className="font-medium">
                    <span>Balance: </span>
                    <strong className="font-mono text-slate-900">
                      {projectedDiff < 0 ? `- ₹${Math.abs(projectedDiff).toLocaleString("en-IN")} (Shortfall)` : `+ ₹${projectedDiff.toLocaleString("en-IN")} (Within Budget)`}
                    </strong>
                  </div>
                </div>
              );
            })()}

            <DialogFooter className="gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setReprioritizeModalOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={reprioritizing}
                className="text-xs"
              >
                {reprioritizing ? "Submitting..." : "Submit Reprioritized Indent to TGMSIDC"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
    </ErrorBoundary>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground mt-0.5">{value}</p>
      </div>
    </div>
  );
}

function ScannedIndentViewer({
  indent,
  activeDoc,
  zoom,
  onZoomIn,
  onZoomOut,
  onClose,
  onOpenModal,
}: {
  indent: any;
  activeDoc?: any;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onClose: () => void;
  onOpenModal?: (doc: any) => void;
}) {
  const effectiveDoc = activeDoc?.dataUrl ? activeDoc : (
    activeDoc?.name === indent.scannedCopyFilename && indent.scannedCopyDataUrl ? {
      ...activeDoc,
      dataUrl: indent.scannedCopyDataUrl
    } : (indent.scannedCopyDataUrl ? {
      name: indent.scannedCopyFilename || "Scanned_Physical_Indent.pdf",
      dataUrl: indent.scannedCopyDataUrl,
      type: "Facility Sanction Copy & Indent Form"
    } : activeDoc)
  );

  const [viewMode, setViewMode] = useState<"file" | "template">(effectiveDoc?.dataUrl ? "file" : "template");

  useEffect(() => {
    if (effectiveDoc?.dataUrl) {
      setViewMode("file");
    }
  }, [effectiveDoc?.dataUrl]);

  const pdfBlobUrl = useMemo(() => {
    if (!effectiveDoc?.dataUrl) return null;
    if (effectiveDoc.dataUrl.startsWith("data:application/pdf") || effectiveDoc.name?.endsWith(".pdf")) {
      try {
        const parts = effectiveDoc.dataUrl.split(",");
        if (parts.length > 1) {
          const binaryStr = atob(parts[1]);
          const len = binaryStr.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
            bytes[i] = binaryStr.charCodeAt(i);
          }
          const blob = new Blob([bytes], { type: "application/pdf" });
          return URL.createObjectURL(blob);
        }
      } catch (err) {
        console.error("Failed to create PDF blob URL:", err);
      }
    }
    return effectiveDoc.dataUrl;
  }, [effectiveDoc?.dataUrl, effectiveDoc?.name]);

  return (
    <Card className="border-[#186812]/30 bg-muted/20 overflow-hidden shadow-md">
      <CardHeader className="py-2.5 px-3 bg-[#060f19] text-white flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="h-4 w-4 text-[#86bc25] shrink-0" />
          <div className="min-w-0">
            <CardTitle className="text-xs font-semibold text-white tracking-wide truncate max-w-[200px]">
              {effectiveDoc?.name || "Scanned Facility Sanction Copy"}
            </CardTitle>
            <p className="text-[10px] text-gray-300">
              Ref: {indent.indentNumber} · {effectiveDoc?.type || "Facility Stamp Verified"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {effectiveDoc?.dataUrl && (
            <div className="flex items-center bg-white/10 rounded-lg p-0.5 mr-1 text-[10px]">
              <button
                type="button"
                className={cn("px-2 py-0.5 rounded font-medium transition-colors", viewMode === "file" ? "bg-[#86bc25] text-[#060f19] font-bold" : "text-gray-300 hover:text-white")}
                onClick={() => setViewMode("file")}
              >
                Document
              </button>
              <button
                type="button"
                className={cn("px-2 py-0.5 rounded font-medium transition-colors", viewMode === "template" ? "bg-[#86bc25] text-[#060f19] font-bold" : "text-gray-300 hover:text-white")}
                onClick={() => setViewMode("template")}
              >
                Digital Form
              </button>
            </div>
          )}

          {effectiveDoc?.dataUrl && onOpenModal && (
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 text-gray-300 hover:text-white hover:bg-white/10"
              onClick={() => onOpenModal({ ...effectiveDoc, dataUrl: pdfBlobUrl || effectiveDoc.dataUrl })}
              title="Open Large Preview"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          )}

          {effectiveDoc?.dataUrl && (
            <a href={pdfBlobUrl || effectiveDoc.dataUrl} download={effectiveDoc.name} target="_blank" rel="noreferrer">
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 text-gray-300 hover:text-white hover:bg-white/10"
                title="Download Document"
              >
                <Download className="h-3.5 w-3.5" />
              </Button>
            </a>
          )}

          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 text-gray-300 hover:text-white hover:bg-white/10"
            onClick={onZoomOut}
            title="Zoom Out"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
          <span className="text-[10px] font-mono text-gray-300 w-7 text-center">{zoom}%</span>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 text-gray-300 hover:text-white hover:bg-white/10"
            onClick={onZoomIn}
            title="Zoom In"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 text-gray-300 hover:text-white hover:bg-white/10 ml-1"
            onClick={onClose}
            title="Close Split View"
          >
            <XCircle className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-2 overflow-auto max-h-[calc(100vh-220px)] bg-slate-100 flex items-start justify-center">
        {viewMode === "file" && effectiveDoc?.dataUrl ? (
          effectiveDoc.dataUrl.startsWith("data:image/") || /\.(jpg|jpeg|png|webp|gif)$/i.test(effectiveDoc.name || "") ? (
            <div className="w-full flex justify-center py-2 overflow-auto">
              <img
                src={effectiveDoc.dataUrl}
                alt={effectiveDoc.name}
                className="rounded-lg shadow-sm border bg-white max-w-full transition-transform origin-top"
                style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top center" }}
              />
            </div>
          ) : effectiveDoc.dataUrl.startsWith("data:application/pdf") || /\.pdf$/i.test(effectiveDoc.name || "") ? (
            <div className="w-full h-full min-h-[580px] flex flex-col">
              <object
                data={pdfBlobUrl || effectiveDoc.dataUrl}
                type="application/pdf"
                className="w-full min-h-[580px] rounded-lg border bg-white shadow-xs"
              >
                <iframe
                  src={pdfBlobUrl || effectiveDoc.dataUrl}
                  title={effectiveDoc.name}
                  className="w-full min-h-[580px] rounded-lg border bg-white shadow-xs"
                />
              </object>
            </div>
          ) : (
            <div className="text-center p-8 bg-white rounded-xl shadow-xs border my-8 max-w-xs">
              <FileText className="h-12 w-12 text-blue-500 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-800 truncate">{effectiveDoc.name}</p>
              <p className="text-[10px] text-muted-foreground mt-1 mb-3">Binary reference document</p>
              <a href={effectiveDoc.dataUrl} download={effectiveDoc.name}>
                <Button size="sm" className="text-xs gap-1.5 h-8">
                  <Download className="h-3.5 w-3.5" /> Download File
                </Button>
              </a>
            </div>
          )
        ) : (
          <div
            className="bg-white border shadow-sm p-6 text-xs text-slate-800 font-serif w-full max-w-[550px] transition-transform origin-top space-y-4"
            style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top center" }}
          >
            {/* Simulated Scanned Government Requisition Document */}
            <div className="text-center border-b pb-3 border-slate-300">
              <div className="inline-block px-2 py-0.5 border border-slate-400 rounded text-[9px] font-sans font-bold uppercase tracking-wider text-slate-600 mb-1">
                Government of Telangana · Health, Medical &amp; Family Welfare Department
              </div>
              <h4 className="font-bold text-sm text-slate-900 tracking-wide uppercase">
                Telangana Medical Services &amp; Infrastructure Development Corporation
              </h4>
              <p className="text-[10px] text-slate-600 font-sans mt-0.5">
                Form IND-01 · Official Hospital Indent Requisition &amp; Administrative Sanction
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] font-sans border-b pb-2 border-slate-200">
              <div>
                <span className="text-slate-500">Indent No:</span> <strong className="font-mono">{indent.indentNumber}</strong>
              </div>
              <div>
                <span className="text-slate-500">Sanction Date:</span> <strong>{safeFormat(indent.createdAt, "dd/MM/yyyy")}</strong>
              </div>
              <div>
                <span className="text-slate-500">Indenting Facility:</span> <strong>{indent.facilityName}</strong>
              </div>
              <div>
                <span className="text-slate-500">District:</span> <strong>{indent.district || "Hyderabad"}</strong>
              </div>
              <div>
                <span className="text-slate-500">Head of Department:</span> <strong>{indent.hodName || "Medical Superintendent"}</strong>
              </div>
              <div>
                <span className="text-slate-500">Sanction G.O. Ref:</span> <strong className="font-mono">{indent.sanctionRef || "GO-MS-42/HFW"}</strong>
              </div>
            </div>

            <div>
              <p className="text-[11px] font-sans font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Requisitioned Items Schedule (Physical Copy)
              </p>
              <table className="w-full border-collapse border border-slate-300 text-[10px] font-sans">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="border border-slate-300 p-1 text-center w-6">#</th>
                    <th className="border border-slate-300 p-1 text-left">Equipment Description</th>
                    <th className="border border-slate-300 p-1 text-center w-12">Qty</th>
                    <th className="border border-slate-300 p-1 text-left">Dept / Location</th>
                  </tr>
                </thead>
                <tbody>
                  {(indent.lineItems || []).map((li: any, idx: number) => (
                    <tr key={idx}>
                      <td className="border border-slate-300 p-1 text-center">{idx + 1}</td>
                      <td className="border border-slate-300 p-1 font-medium">{li.equipmentName}</td>
                      <td className="border border-slate-300 p-1 text-center">{li.requestedQty ?? li.qty ?? 1}</td>
                      <td className="border border-slate-300 p-1 text-slate-600">{li.justification || indent.facilityName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pt-4 border-t border-slate-300 flex items-end justify-between font-sans">
              <div className="border border-slate-400 p-2 rounded text-center w-32 bg-slate-50">
                <div className="text-[8px] uppercase tracking-widest text-slate-500 font-bold">Facility Seal</div>
                <div className="h-10 flex items-center justify-center text-[10px] text-blue-900 font-serif italic border border-dashed border-blue-400 rounded my-1 bg-blue-50/50">
                  [SEALED &amp; SIGNED]
                </div>
                <div className="text-[8px] text-slate-600">{indent.facilityName}</div>
              </div>
              <div className="text-right text-[10px]">
                <div className="h-8 border-b border-dotted border-slate-400 w-36 mb-1 ml-auto flex items-end justify-center italic text-blue-900 font-serif">
                  {indent.hodName || "Dr. K. Srinivas Rao"}
                </div>
                <p className="font-semibold text-slate-800">Superintendent / Civil Surgeon</p>
                <p className="text-[9px] text-slate-500">{safeFormat(indent.createdAt, "dd/MM/yyyy")}</p>
              </div>
            </div>

            <div className="p-2 bg-emerald-50 border border-emerald-200 rounded text-[10px] font-sans flex items-center gap-1.5 text-emerald-800">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span>Digital verification watermark: DOC-SANCTION-VERIFIED</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
