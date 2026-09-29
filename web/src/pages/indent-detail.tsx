import { useRoute, Link } from "wouter";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useListEquipment, useListPurchaseOrders, useListDeliveries } from "@/lib/api-hooks";
import { resolveWriteInEquipment } from "@/lib/api";
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
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

const STEP_ROLE_COLOR: Record<string, string> = {
  deo: "bg-blue-100 text-blue-700 border-blue-200",
  tgmsidc_user: "bg-violet-100 text-violet-700 border-violet-200",
  gm_equipment: "bg-emerald-100 text-emerald-700 border-emerald-200",
  so_equipment: "bg-cyan-100 text-cyan-700 border-cyan-200",
  executive_director: "bg-amber-100 text-amber-700 border-amber-200",
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
  if (n >= 1_00_000) return `₹${(n / 1_00_000).toFixed(2)} L`;
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

export default function IndentDetail() {
  const [, params] = useRoute("/indents/:id");
  const id = (params?.id ?? "");
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: indent, isLoading } = useGetIndent(id, {
    query: { enabled: !!id, queryKey: getGetIndentQueryKey(id) },
  });

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
        resolvedBy: user?.fullName || "TGMSIDC User",
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

  async function handleAdvanceLifecycle(action: "confirm_delivery" | "pass_qa" | "issue_grn" | "record_payment" | "auto_complete_all") {
    setLifecycleLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/indents/${id}/advance-lifecycle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          actorName: user?.fullName || user?.username || "Authorised Officer, TGMSIDC",
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

  const lineItems = indent.lineItems ?? [];
  const hasLineItems = lineItems.length > 0;
  const totalEstimated = indent.estimatedTotalValue || lineItems.reduce((sum: number, li: any) => {
    const qty = li.requestedQty ?? li.qty ?? 0;
    const rate = li.estimatedUnitCost ?? li.estimatedUnitRate ?? 0;
    return sum + (qty * rate);
  }, 0);

  const lifecycleData = getIndentLifecycleData(id, indent, livePOs, liveDeliveries);
  const { purchaseOrders: linkedPOs, deliveries: linkedDeliveries, invoices: linkedInvoices, auditLog } = lifecycleData;

  const firstDeliveredDelivery = linkedDeliveries.find((d) => d.deliveredDate || d.status === "delivered");
  const firstQAPassedDelivery = linkedDeliveries.find((d) => d.status === "qa_passed" || d.status === "accepted" || d.qaDecision === "accepted" || (d.qaComplianceScore != null && d.qaComplianceScore >= 100));
  const firstAcceptedDelivery = linkedDeliveries.find((d) => d.acceptanceCertificateIssued);
  const isPOPaid = linkedPOs.some((p: any) => p.paymentStatus === "paid") || linkedInvoices.some((i: any) => i.status === "paid");

  const LIFECYCLE_STAGES = [
    "Indent Raised", "Approved", "PO Issued", "Delivered", "QA Passed", "Accepted",
  ] as const;

  const stageTimestamps: (string | null)[] = [
    indent.createdAt,
    (indent.approvedBy || !["pending_review", "pending_approval", "rejected"].includes(indent.status)) ? indent.updatedAt : null,
    linkedPOs.length > 0 ? linkedPOs[0].createdAt : null,
    firstDeliveredDelivery?.deliveredDate ? firstDeliveredDelivery.deliveredDate : null,
    firstQAPassedDelivery?.updatedAt ?? null,
    firstAcceptedDelivery?.updatedAt ?? null,
  ];

  const activeStageIdx = (() => {
    if (firstAcceptedDelivery) return 5;
    if (firstQAPassedDelivery) return 4;
    if (firstDeliveredDelivery) return 3;
    if (linkedPOs.length > 0) return 2;
    if (indent.approvedBy || !["pending_review", "pending_approval", "rejected"].includes(indent.status)) return 1;
    return 0;
  })();

  const lifecycleIsRejected = indent.status === "rejected";

  const totalPOValue = linkedPOs.reduce((s, p) => s + (p.totalAmount || 0), 0);
  const totalInvoiced = linkedInvoices.reduce((s, i) => s + (i.amount || 0), 0);
  const grnCount = linkedDeliveries.filter((d) => d.acceptanceCertificateIssued).length;
  const allInvoicesPaid = linkedInvoices.length > 0 && linkedInvoices.every((i) => i.status === "paid");

  const AUDIT_EVENT_COLORS: Record<AuditEventType, string> = {
    indent:   "bg-blue-100 text-blue-700 border-blue-200",
    approval: "bg-violet-100 text-violet-700 border-violet-200",
    po:       "bg-emerald-100 text-emerald-700 border-emerald-200",
    delivery: "bg-sky-100 text-sky-700 border-sky-200",
    qa:       "bg-amber-100 text-amber-700 border-amber-200",
    invoice:  "bg-indigo-100 text-indigo-700 border-indigo-200",
    grn:      "bg-teal-100 text-teal-700 border-teal-200",
  };

  function handleAction(action: "approved" | "returned") {
    if (!pendingStep) return;
    if (action === "returned" && !comments.trim()) return;
    const isLastStep = pendingStep.stepNumber === progress_live.totalSteps;
    stepMutation.mutate({
      stepNumber: pendingStep.stepNumber,
      status: action,
      comments: comments.trim() || "Approved.",
      procurementMode: (action === "approved" && isLastStep) || (action === "approved" && ["gm_equipment", "gm"].includes(pendingStep.requiredRole))
        ? procurementMode
        : undefined,
    });
  }

  const isFinalProcurementStep = pendingStep && (
    pendingStep.stepNumber === progress_live.totalSteps ||
    ["gm_equipment", "so_equipment", "gm"].includes(pendingStep.requiredRole)
  );

  return (
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
            className={cn("gap-1.5 text-xs shadow-xs", sideBySide ? "bg-[#186812] hover:bg-[#124e0d] text-white" : "")}
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

      {/* Return notice */}
      {indent.status === "returned" && indent.returnComments && (
        <div className="flex gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <RotateCcw className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Returned for Revision</p>
            <p className="text-sm text-amber-700 mt-0.5">{indent.returnComments}</p>
          </div>
        </div>
      )}

      {/* ── Procurement Routing & Statutory Assessment Banner ── */}
      {indent.tenderId || indent.status === "tender_initiated" ? (
        <Card className="border-[#5c2d91]/30 bg-purple-50/40 shadow-xs">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#5c2d91]/10 flex items-center justify-center text-[#5c2d91] shrink-0 mt-0.5">
                  <GitBranch className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-[#152340]">
                      Open Tendering Workflow Initiated (Statutory Rule BR-02)
                    </h3>
                    <span className="neo-chip pur text-[10px]">Tender #{indent.tenderNumber || "TND-2026"}</span>
                  </div>
                  <p className="text-xs text-[#6b7a93] mt-1 leading-relaxed">
                    Requisition routed to competitive e-Procurement / GeM bidding because active Rate Contract was not available or expired for line items.
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-xs">
                    <span className="text-[#6b7a93]">Portal: <strong className="text-[#152340] uppercase">{indent.tenderPortal || "GeM"}</strong></span>
                    <span className="text-[#6b7a93]">Status: <strong className="text-[#159557] capitalize">{indent.tenderStatus || "Invited"}</strong></span>
                    <span className="text-[#6b7a93]">Stage: <strong className="text-[#2563eb]">Stage {indent.tenderCurrentStageNumber || 1} of 10</strong></span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Link href={indent.tenderId ? `/tenders/${indent.tenderId}` : "/tenders"}>
                  <Button size="sm" className="bg-[#5c2d91] hover:bg-[#472270] text-white text-xs gap-1.5 shadow-xs">
                    Open Tender Details →
                  </Button>
                </Link>
                <Link href="/tenders/workbench">
                  <Button size="sm" variant="outline" className="text-xs border-[#e4eaf2]">
                    Tender Workbench
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : indent.tenderRequired || !indent.hasFullRCCoverage ? (
        <Card className="border-amber-200 bg-amber-50/60 shadow-xs">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 shrink-0 mt-0.5">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-amber-950">
                      Active Rate Contract Not Available for All Items (TGMSIDC Rule BR-02)
                    </h3>
                    <span className="neo-chip amb text-[10px]">Tender Required</span>
                  </div>
                  <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                    {indent.missingRCItems?.length
                      ? `${indent.missingRCItems.join(", ")} does not possess an active Rate Contract (e.g. Autoclave RC-2425-0012 has expired).`
                      : "One or more line items in this requisition lack a valid Rate Contract."}
                    {" Under statutory healthcare procurement guidelines, items without active Rate Contracts must proceed via Open Tendering (GeM / e-Procurement)."}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  onClick={() => setTenderDialogOpen(true)}
                  className="bg-[#186812] hover:bg-[#124e0d] text-white text-xs gap-1.5 shadow-xs"
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
                  <IndianRupee className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Total Estimated Value</p>
                    <p className="text-sm font-bold text-emerald-700 mt-0.5">{formatINR(totalEstimated)}</p>
                  </div>
                </div>
                {!hasLineItems && (
                  <>
                    <div className="flex items-center justify-between">
                      <InfoRow icon={Wrench} label="Equipment" value={indent.equipmentName || "Medical Equipment"} />
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1 border-primary/30 text-primary hover:bg-primary hover:text-white"
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
                  FY {indent.financialYear || "2025-26"}
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
                        className="text-xs font-semibold text-[#2563eb] hover:underline flex items-center gap-1 cursor-pointer bg-blue-50 px-2.5 py-1.5 rounded-lg border border-blue-200"
                      >
                        {indent.rateContractNumber || "View Ratecard"}
                        <ExternalLink className="h-3 w-3" />
                      </button>
                      <Link href={`/rate-contracts/${indent.rateContractId}`}>
                        <span className="text-[11px] text-[#6b7a93] hover:text-[#152340] underline">
                          (Full Master Agreement →)
                        </span>
                      </Link>
                    </div>
                  </div>
                )}
                {indent.tenderId && (
                  <div className="pt-1 border-t border-border/50">
                    <p className="text-xs text-muted-foreground">Linked Open Tender</p>
                    <Link href={`/tenders/${indent.tenderId}`}>
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5c2d91] hover:underline mt-1 bg-purple-50 px-2.5 py-1.5 rounded-lg border border-purple-200">
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
                  <Award className="h-4 w-4 text-emerald-600" />
                  Key Signatory Details
                </CardTitle>
                <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 font-medium">
                  Verified Authority
                </Badge>
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
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        {sig.name || `Signatory ${sIdx + 1}`}
                      </p>
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                        {sig.status || "Signed"}
                      </span>
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
                {(indent.attachments && indent.attachments.length > 0 ? indent.attachments : [
                  { name: indent.scannedCopyFilename || `Official_Sanction_${indent.indentNumber.replace(/[\/\\:]/g, '_')}.pdf`, size: "1.4 MB", type: "Facility Sanction Copy & Indent Form", date: safeFormat(indent.createdAt), status: "Verified" },
                  { name: "Technical_Specifications_Compliance.pdf", size: "840 KB", type: "Technical Specifications & Justification", date: safeFormat(indent.createdAt), status: "Verified" },
                  { name: "Administrative_Sanction_GO.pdf", size: "620 KB", type: "Govt Order (G.O. Ms.) Sanction Ref", date: safeFormat(indent.createdAt), status: "Verified" },
                ]).map((doc: any, dIdx: number) => (
                  <div key={dIdx} className="flex items-center justify-between p-2.5 rounded-xl border border-border/60 bg-muted/15 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="h-8 w-8 rounded-lg bg-red-50 border border-red-200 flex items-center justify-center shrink-0">
                        <FileText className="h-4 w-4 text-red-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate max-w-[220px]" title={doc.name}>{doc.name}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{doc.type || "Document"} · {doc.size || "1 MB"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-[11px] text-primary hover:bg-primary/10 gap-1 px-2"
                        onClick={() => {
                          setActiveDoc(doc);
                          setSideBySide(true);
                          setRightPanelTab("scanned_doc");
                        }}
                      >
                        <Eye className="h-3 w-3" /> View
                      </Button>
                      {doc.dataUrl && (
                        <a href={doc.dataUrl} download={doc.name} target="_blank" rel="noreferrer">
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-500 hover:text-slate-900" title="Download">
                            <Download className="h-3 w-3" />
                          </Button>
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* ── Requested Products / Line Items ── */}
          {hasLineItems ? (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Requested Products / Equipment Schedule</CardTitle>
                  <span className="text-xs text-muted-foreground">{lineItems.length} line item{lineItems.length !== 1 ? "s" : ""}</span>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="px-3 py-2.5 text-left font-medium text-muted-foreground text-xs w-8">#</th>
                        <th className="px-3 py-2.5 text-left font-medium text-muted-foreground text-xs">Category</th>
                        <th className="px-3 py-2.5 text-left font-medium text-muted-foreground text-xs">Product</th>
                        <th className="px-3 py-2.5 text-left font-medium text-muted-foreground text-xs">Specifications</th>
                        <th className="px-3 py-2.5 text-right font-medium text-muted-foreground text-xs">Qty</th>
                        <th className="px-3 py-2.5 text-left font-medium text-muted-foreground text-xs">Unit</th>
                        <th className="px-3 py-2.5 text-right font-medium text-muted-foreground text-xs">Est. Unit Rate</th>
                        <th className="px-3 py-2.5 text-right font-medium text-muted-foreground text-xs">Est. Total</th>
                        <th className="px-3 py-2.5 text-left font-medium text-muted-foreground text-xs">RC Tag / Routing</th>
                        <th className="px-3 py-2.5 text-center font-medium text-muted-foreground text-xs">Technical Specs</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lineItems.map((li: any, idx: number) => {
                        const catMeta = getCategoryMeta(li.category || "medical_equipment");
                        const CatIcon = catMeta.icon;
                        const qty = li.requestedQty ?? li.qty ?? 1;
                        const rate = li.estimatedUnitCost ?? li.estimatedUnitRate ?? 0;
                        const unit = li.unitOfMeasure ?? li.unit ?? "No.";
                        const specText = li.specifications || li.justification || getSpecSummary(li.equipmentId) || "As per technical specification";
                        return (
                          <tr key={`${li.equipmentId || idx}-${idx}`} className="border-b last:border-b-0 hover:bg-muted/20 transition-colors">
                            <td className="px-3 py-3 text-xs text-muted-foreground">{idx + 1}</td>
                            <td className="px-3 py-3">
                              <span className={cn(
                                "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium border",
                                catMeta.bgColor, catMeta.color, catMeta.borderColor
                              )}>
                                <CatIcon className="h-2.5 w-2.5" />
                                {catMeta.label}
                              </span>
                            </td>
                            <td className="px-3 py-3">
                              <button
                                type="button"
                                className="text-left font-medium text-primary hover:underline underline-offset-2 transition-colors"
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
                            <td className="px-3 py-3 max-w-[180px]">
                              <p className="text-xs text-foreground/80 line-clamp-2">{specText}</p>
                            </td>
                            <td className="px-3 py-3 text-right font-semibold tabular-nums">{qty}</td>
                            <td className="px-3 py-3 text-xs text-muted-foreground">{unit}</td>
                            <td className="px-3 py-3 text-right tabular-nums text-sm">₹{rate.toLocaleString("en-IN")}</td>
                            <td className="px-3 py-3 text-right font-semibold tabular-nums text-sm">{formatINR(qty * rate)}</td>
                            <td className="px-3 py-3">
                              {li.rcStatus === "active" ? (
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
                                  title="Click to view Ratecard preview"
                                >
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10.5px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 group-hover/rc:bg-emerald-100 transition-colors">
                                    <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                    {li.rateContractNumber || "RC Active"}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground block mt-0.5 truncate max-w-[150px]">
                                    ₹{(li.rateContractUnitPrice || 0).toLocaleString("en-IN")} · {li.rateContractVendor}
                                  </span>
                                </button>
                              ) : li.rcStatus === "expired" ? (
                                <button
                                  type="button"
                                  onClick={() => setRcModal({
                                    contractNumber: li.rateContractNumber,
                                    vendorName: li.rateContractVendor,
                                    unitPrice: li.rateContractUnitPrice,
                                    validityEnd: li.rateContractValidityEnd,
                                    equipmentName: li.equipmentName,
                                    id: li.rateContractId,
                                    status: "expired",
                                  })}
                                  className="text-left group/rc inline-block cursor-pointer"
                                  title="Click to view expired Ratecard details"
                                >
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10.5px] font-semibold bg-red-50 text-red-700 border border-red-200 group-hover/rc:bg-red-100 transition-colors">
                                    <AlertTriangle className="h-3 w-3 text-red-600" />
                                    Expired: {li.rateContractNumber}
                                  </span>
                                  <span className="text-[10px] text-[#dc2f3c] font-semibold block mt-0.5">
                                    Tender Required (BR-02)
                                  </span>
                                </button>
                              ) : (
                                <div>
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10.5px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                                    <AlertCircle className="h-3 w-3 text-amber-600" />
                                    No Active RC
                                  </span>
                                  <span className="text-[10px] text-amber-700 font-semibold block mt-0.5">
                                    Tender Required
                                  </span>
                                </div>
                              )}
                            </td>
                            <td className="px-3 py-3 text-center">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs gap-1 border-primary/30 text-primary hover:bg-primary hover:text-white"
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
                      <tr className="border-t bg-muted/20">
                        <td colSpan={7} className="px-3 py-2.5 text-right font-semibold text-sm">Total Estimated Value</td>
                        <td className="px-3 py-2.5 text-right font-bold text-base tabular-nums">{formatINR(totalEstimated)}</td>
                        <td className="px-3 py-2.5" />
                        <td className="px-3 py-2.5" />
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
                    {processing ? "Processing..." : `Approve & Forward (Step ${pendingStep.stepNumber})`}
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-2 border-amber-300 text-amber-700 hover:bg-amber-50 disabled:opacity-40"
                    onClick={() => handleAction("returned")}
                    disabled={processing || !comments.trim()}
                    title={!comments.trim() ? "Enter a revision reason before returning" : undefined}
                  >
                    <RotateCcw className="h-4 w-4" />
                    Return to DEO for Revision
                  </Button>
                  <Button
                    variant="destructive"
                    className="gap-2"
                    onClick={() => setRejectDialog(true)}
                    disabled={processing}
                  >
                    <XCircle className="h-4 w-4" />
                    Reject Indent
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
                {/* 1. Confirm Delivery */}
                {(!firstDeliveredDelivery && (indent.status === "po_issued" || linkedPOs.length > 0)) && (
                  <Button
                    size="sm"
                    disabled={lifecycleLoading}
                    onClick={() => handleAdvanceLifecycle("confirm_delivery")}
                    className="bg-sky-600 hover:bg-sky-700 text-white text-xs gap-1.5 shadow-xs"
                  >
                    <Truck className="h-3.5 w-3.5" />
                    <span>Confirm Hospital Delivery</span>
                  </Button>
                )}

                {/* 2. Perform QA */}
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

                {/* 3. Issue GRN & Annexure 6 */}
                {(firstQAPassedDelivery && !firstAcceptedDelivery) && (
                  <Button
                    size="sm"
                    disabled={lifecycleLoading}
                    onClick={() => handleAdvanceLifecycle("issue_grn")}
                    className="bg-[#186812] hover:bg-[#124e0d] text-white text-xs gap-1.5 shadow-xs"
                  >
                    <ClipboardCheck className="h-3.5 w-3.5" />
                    <span>Issue GRN &amp; Annexure 6 Certificate</span>
                  </Button>
                )}

                {/* 4. Release Payment */}
                {(firstAcceptedDelivery && !isPOPaid) && (
                  <Button
                    size="sm"
                    disabled={lifecycleLoading}
                    onClick={() => handleAdvanceLifecycle("record_payment")}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1.5 shadow-xs"
                  >
                    <Receipt className="h-3.5 w-3.5" />
                    <span>Release Payment (Accounts)</span>
                  </Button>
                )}

                {/* 1-Click Fast-Track Button */}
                {(!firstAcceptedDelivery || !isPOPaid) && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={lifecycleLoading}
                    onClick={() => handleAdvanceLifecycle("auto_complete_all")}
                    className="border-amber-500/50 text-amber-900 bg-amber-50/50 hover:bg-amber-100/50 text-xs gap-1.5 shadow-xs font-semibold cursor-pointer"
                    title="Simulate all remaining procurement steps through to Commissioning & Payment"
                  >
                    <Zap className="h-3.5 w-3.5 text-amber-600 fill-amber-500" />
                    <span>Fast-Track Full Flow (1-Click)</span>
                  </Button>
                )}

                {firstAcceptedDelivery && isPOPaid && (
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-300 py-1.5 px-3 text-xs font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>Full Procurement Lifecycle Completed</span>
                  </Badge>
                )}
              </div>
            </div>

            {/* Stepper Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mt-4 pt-3 border-t border-border/60">
              {[
                { title: "1. Indent Approved", done: !!indent.approvedBy || !["pending_review", "pending_approval", "rejected"].includes(indent.status), active: indent.status === "pending_approval" },
                { title: "2. PO Issued", done: linkedPOs.length > 0 || indent.status === "po_issued" || indent.status === "completed", active: !linkedPOs.length && indent.status === "po_issued" },
                { title: "3. Dispatched & In Transit", done: linkedDeliveries.length > 0, active: linkedDeliveries.length > 0 && !firstDeliveredDelivery },
                { title: "4. Delivered at Site", done: !!firstDeliveredDelivery, active: !!firstDeliveredDelivery && !firstQAPassedDelivery },
                { title: "5. QA Inspected (100%)", done: !!firstQAPassedDelivery, active: !!firstQAPassedDelivery && !firstAcceptedDelivery },
                { title: "6. GRN & Paid", done: !!firstAcceptedDelivery && isPOPaid, active: !!firstAcceptedDelivery && !isPOPaid },
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
                  <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                    {linkedPOs[0].status || "Issued"}
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
                  <div className="space-y-1">
                    {linkedPOs.map((po) => (
                      <Link key={po.id} href={`/purchase-orders/${po.id}`}>
                        <div className="p-1.5 bg-emerald-50/70 border border-emerald-200/80 rounded-md hover:bg-emerald-100/70 transition-colors cursor-pointer flex items-center justify-between">
                          <span className="text-[11px] font-mono font-bold text-emerald-800">{po.poNumber || "PO"}</span>
                          <span className="text-[10px] text-emerald-700 font-semibold">{formatINR(po.totalAmount)}</span>
                        </div>
                      </Link>
                    ))}
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
          <Card className="border-border shadow-xs">
            <CardContent className="pt-4 pb-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center shrink-0">
                    <Receipt className="h-4 w-4 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">Invoices &amp; Payments</p>
                    <p className="text-[11px] text-muted-foreground">{linkedInvoices.length} invoice{linkedInvoices.length !== 1 ? "s" : ""}</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px] bg-indigo-50 text-indigo-700 border-indigo-200">
                  {allInvoicesPaid ? "100% Cleared" : (linkedInvoices.length > 0 ? "In Process" : "Pending")}
                </Badge>
              </div>
              {linkedInvoices.length === 0 ? (
                <div className="py-2">
                  <p className="text-xs text-muted-foreground italic">No invoices submitted</p>
                  <p className="text-[11px] text-muted-foreground mt-1">Bills raised post delivery appear here.</p>
                </div>
              ) : (
                <div className="space-y-1.5 pt-1">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-semibold">Total Invoiced Amount</p>
                    <p className="text-sm font-bold text-indigo-800 tabular-nums">{formatINR(totalInvoiced || totalPOValue)}</p>
                  </div>
                  <div className="text-[11px] text-muted-foreground space-y-0.5">
                    <p className="truncate">Inv: {linkedInvoices[0].invoiceNumber}</p>
                    <p className="text-emerald-700 font-medium">Payment: {linkedInvoices[0].status === "paid" ? "Treasury Tranche Paid" : "Verified by Finance"}</p>
                  </div>
                  <Link href="/invoices">
                    <span className="text-[11px] text-indigo-700 hover:underline font-semibold block pt-1 cursor-pointer">
                      Open Invoices &amp; Ledger →
                    </span>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </div>

      {/* TGMSIDC Reviewer Data Edit Audit Trail (Process Book §1 Step 11) */}
      {indent.editAuditTrail && indent.editAuditTrail.length > 0 && (
        <Card className="border-blue-200 bg-blue-50/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-base flex items-center gap-2 text-blue-950">
                <FileCheck2 className="h-4 w-4 text-blue-600" />
                TGMSIDC Reviewer Data Correction Audit Trail
              </CardTitle>
              <Badge variant="outline" className="text-xs bg-blue-100 text-blue-800 border-blue-300">
                Process Book §1 Step 11 — Blue Highlighted Corrections
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Statutory verification corrections made by TGMSIDC Reviewers are tracked with original facility values preserved and verified values highlighted.
            </p>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-blue-200 bg-blue-100/50">
                    <th className="px-3 py-2 text-left font-semibold text-blue-950">Timestamp &amp; Reviewer</th>
                    <th className="px-3 py-2 text-left font-semibold text-blue-950">Field Corrected</th>
                    <th className="px-3 py-2 text-left font-semibold text-blue-950">Facility Submitted Value</th>
                    <th className="px-3 py-2 text-left font-semibold text-blue-950">TGMSIDC Verified Value</th>
                    <th className="px-3 py-2 text-left font-semibold text-blue-950">Regulatory / Technical Justification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-100">
                  {indent.editAuditTrail.map((edit: any, idx: number) => (
                    <tr key={idx} className="hover:bg-blue-50/50 transition-colors">
                      <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">
                        <div className="font-medium text-foreground">{edit.editedBy || "TGMSIDC Officer"}</div>
                        <div className="text-[10px]">{safeFormat(edit.editedAt, "dd MMM yyyy, HH:mm")}</div>
                      </td>
                      <td className="px-3 py-2.5 font-mono font-medium text-foreground">{edit.field}</td>
                      <td className="px-3 py-2.5 line-through text-muted-foreground">
                        {String(edit.originalValue ?? "—")}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="inline-block bg-blue-100 text-blue-900 border border-blue-300 font-semibold px-2 py-0.5 rounded shadow-2xs">
                          {String(edit.correctedValue ?? "—")}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-foreground/80">{edit.reason || "Corrected as per statutory equipment master / sanction rules"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

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
                    This Rate Contract validity has expired. Per TGMSIDC Rule BR-02, no Purchase Orders can be drawn against an expired rate card. This equipment must be procured via Open Tendering (GeM / e-Procurement).
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
                    className="bg-[#186812] hover:bg-[#124e0d] text-white text-xs gap-1.5"
                  >
                    <GitBranch className="w-3.5 h-3.5" />
                    Initiate Tendering Process
                  </Button>
                ) : rcModal.id ? (
                  <Link href={`/rate-contracts/${rcModal.id}`}>
                    <Button size="sm" className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs gap-1.5">
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
                className="bg-[#186812] hover:bg-[#124e0d] text-white text-xs gap-1.5"
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
              Resolve Write-in Equipment (Process Book §1 Step 12)
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
                className="bg-[#186812] hover:bg-[#124e0d] text-white text-xs gap-1.5"
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
              <iframe
                src={docModal.dataUrl}
                title={docModal.name}
                className="w-full h-[75vh] rounded-lg border-0 bg-white shadow-sm"
              />
            ) : (
              <div className="text-center p-8 bg-white rounded-2xl shadow-sm border max-w-md">
                <FileText className="h-16 w-16 text-blue-500/50 mx-auto mb-3" />
                <p className="text-base font-bold text-slate-800">{docModal?.name}</p>
                <p className="text-xs text-muted-foreground mt-1 mb-4">Click below to download and view this document.</p>
                {docModal?.dataUrl && (
                  <a href={docModal.dataUrl} download={docModal.name}>
                    <Button className="gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
                      <Download className="h-4 w-4" /> Download Document
                    </Button>
                  </a>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
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
  const effectiveDoc = activeDoc || (indent.scannedCopyDataUrl ? {
    name: indent.scannedCopyFilename || "Scanned_Physical_Indent.pdf",
    dataUrl: indent.scannedCopyDataUrl,
    type: "Facility Sanction Copy & Indent Form"
  } : null);

  const [viewMode, setViewMode] = useState<"file" | "template">(effectiveDoc?.dataUrl ? "file" : "template");

  useEffect(() => {
    if (effectiveDoc?.dataUrl) {
      setViewMode("file");
    }
  }, [effectiveDoc?.dataUrl]);

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
              onClick={() => onOpenModal(effectiveDoc)}
              title="Open Large Preview"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          )}

          {effectiveDoc?.dataUrl && (
            <a href={effectiveDoc.dataUrl} download={effectiveDoc.name} target="_blank" rel="noreferrer">
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
              <iframe
                src={effectiveDoc.dataUrl}
                title={effectiveDoc.name}
                className="w-full min-h-[580px] rounded-lg border bg-white shadow-xs"
              />
            </div>
          ) : (
            <div className="text-center p-8 bg-white rounded-xl shadow-xs border my-8 max-w-xs">
              <FileText className="h-12 w-12 text-blue-500 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-800 truncate">{effectiveDoc.name}</p>
              <p className="text-[10px] text-muted-foreground mt-1 mb-3">Binary reference document</p>
              <a href={effectiveDoc.dataUrl} download={effectiveDoc.name}>
                <Button size="sm" className="bg-blue-600 text-white text-xs gap-1.5 h-8">
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
                Form TGMSIDC-IND-01 · Official Hospital Indent Requisition &amp; Administrative Sanction
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
              <span>Digital verification watermark: TGMSIDC-DOC-SANCTION-VERIFIED</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
