import { useState } from "react";
import { Link } from "wouter";
import { useListIndents } from "@/lib/api-hooks";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { getSteps, ApprovalStep } from "@/lib/approvalWorkflow";
import type { Indent } from "@/lib/api-hooks";
import { BASE_URL } from "@/lib/api";
import {
  Clock, FileText, CheckCircle2, XCircle, AlertTriangle,
  Eye, Inbox, RotateCcw, GitBranch, Building2, Wrench,
  ShieldCheck, User, Loader2,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ProductSpecSheet } from "@/components/ProductSpecSheet";
import { format, formatDistanceToNow, differenceInHours } from "date-fns";
import { cn } from "@/lib/utils";

/** Unit price lookup for estimated value display — mirrors the handler's fallback map.
 *  RC prices are used when the equipment has an active rate contract. */
const EQUIPMENT_UNIT_PRICE: Record<number, number> = {
  1: 850000,   // Digital X-Ray Machine (DR System)
  2: 320000,   // ICU Ventilator
  3: 1200000,  // Fully Automated Biochemistry Analyser
  4: 650000,   // Ultrasound Machine (Colour Doppler)
  5: 950000,   // DEXA Scanner
  6: 185000,   // Surgical Diathermy / Cautery Machine
  7: 650000,   // Mammogram Compatible CR System
  8: 120000,   // Patient Monitor (Multi-Parameter)
};

function estimatedValue(equipmentId: number | string | null | undefined, quantity: number): number {
  return (EQUIPMENT_UNIT_PRICE[Number(equipmentId)] ?? 200000) * quantity;
}

function formatINR(value: number): string {
  if (value >= 1_00_00_000) return `₹${(value / 1_00_00_000).toFixed(2)} Cr`;
  if (value >= 1_00_000) return `₹${(value / 1_00_000).toFixed(2)} L`;
  return `₹${value.toLocaleString("en-IN")}`;
}

const ROLE_STEP_LABEL: Record<string, string> = {
  tgmsidc_user: "Data Verification",
  gm_equipment: "GM Review & Recommendation",
  so_equipment: "SO Equipment Approval",
  executive_director: "Executive Director Sanction",
  admin: "Administrator Review",
  biomedical_engineer: "Technical Review",
  gm: "GM Approval",
  director: "Administrative Sanction",
};

const SLA_HOURS: Record<string, number> = {
  tgmsidc_user: 48,
  gm_equipment: 72,
  so_equipment: 48,
  executive_director: 48,
  admin: 24,
  biomedical_engineer: 48,
  gm: 72,
  director: 48,
};

const PROCURE_MODE_OPTIONS = [
  { value: "rate_contract", label: "Rate Contract — Use existing approved RC" },
  { value: "tender", label: "Open Tender — Invite bids via GeM / e-Procurement" },
  { value: "limited_tender", label: "Limited Tender — Pre-qualified vendors only" },
  { value: "single_source", label: "Single Source — Proprietary / Emergency" },
];

interface InboxItem {
  indent: Indent;
  step: ApprovalStep;
  slaDeadline: Date;
  isBreach: boolean;
}

export default function ApprovalInbox() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: allIndents = [] } = useListIndents({});

  if (!user) return null;

  const pendingItems: InboxItem[] = allIndents.flatMap((indent) => {
    const steps = (indent.approvalSteps && indent.approvalSteps.length > 0) ? indent.approvalSteps : getSteps(indent.id);
    const activeStep = steps.find(
      (s: ApprovalStep) => s.status === "pending" || s.status === "returned"
    );
    if (!activeStep) return [];

    // Ensure we are the *currently active* step by checking if all prior steps are completed
    const priorSteps = steps.filter((s: ApprovalStep) => s.stepNumber < activeStep.stepNumber);
    const canAct = priorSteps.every((s: ApprovalStep) => s.status === "approved" || s.status === "skipped");
    if (!canAct) return [];

    // Admin can act on any step, or role matches requiredRole
    const isAuthorized = user.role === "admin" || activeStep.requiredRole === user.role;
    if (!isAuthorized) return [];

    const step = activeStep;
    const submittedAt = new Date(indent.createdAt);
    const slaRole = user.role === "admin" ? (step.requiredRole || "admin") : user.role;
    const slaDeadline = new Date(submittedAt.getTime() + (SLA_HOURS[slaRole] ?? 48) * 60 * 60 * 1000);
    return [{ indent, step, slaDeadline, isBreach: new Date() > slaDeadline }];
  });

  // Completed items for the current role
  const completedItems = allIndents.flatMap((indent) => {
    const steps = (indent.approvalSteps && indent.approvalSteps.length > 0) ? indent.approvalSteps : getSteps(indent.id);
    const step = steps.find(
      (s: ApprovalStep) => (user.role === "admin" || s.requiredRole === user.role) && (s.status === "approved" || s.status === "rejected" || s.status === "returned")
    );
    if (!step || step.status === "returned") return [];
    
    // Check if this indent is ALSO in pending items for this role (e.g. it was returned and is back to them)
    const isCurrentlyPending = pendingItems.some(pi => pi.indent.id === indent.id);
    if (isCurrentlyPending) return [];

    const submittedAt = new Date(indent.createdAt);
    const slaRole = user.role === "admin" ? (step.requiredRole || "admin") : user.role;
    const slaDeadline = new Date(submittedAt.getTime() + (SLA_HOURS[slaRole] ?? 48) * 60 * 60 * 1000);
    return [{ indent, step, slaDeadline, isBreach: false }];
  });

  const [tab, setTab] = useState("pending");
  const [actionDialog, setActionDialog] = useState<{ item: InboxItem; action: "approve" | "return" | "reject" } | null>(null);
  const [comments, setComments] = useState("");
  const [procurementMode, setProcurementMode] = useState("rate_contract");
  const [processing, setProcessing] = useState(false);
  const [specProduct, setSpecProduct] = useState<{ equipmentId: string; equipmentCode?: string; name: string } | null>(null);

  const actionMutation = useMutation({
    mutationFn: async (payload: {
      indentId: number | string;
      stepNumber: number;
      status: "approved" | "returned" | "rejected";
      comments: string;
      procurementMode?: string;
    }) => {
      setProcessing(true);
      const res = await fetch(`${BASE_URL}/indents/${payload.indentId}/approval-steps/${payload.stepNumber}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: payload.status,
          comments: payload.comments,
          approvedBy: user.fullName,
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
      setProcessing(false);
      setActionDialog(null);
      setComments("");
      queryClient.invalidateQueries({ queryKey: ["/indents"] });
      queryClient.invalidateQueries({ queryKey: ["/dashboard/summary"] });
      queryClient.invalidateQueries({ queryKey: ["/dashboard/procurement-pipeline"] });
    },
    onError: () => setProcessing(false),
  });

  function submitAction() {
    if (!actionDialog) return;
    const { item, action } = actionDialog;
    const steps = (item.indent.approvalSteps && item.indent.approvalSteps.length > 0) ? item.indent.approvalSteps : getSteps(item.indent.id);
    const totalSteps = steps.length;
    const isLastStep = item.step.stepNumber === totalSteps;
    const needsMode = action === "approve" && (
      (item.step.requiredRole === "gm" && totalSteps === 3) ||
      (item.step.requiredRole === "so_equipment" && isLastStep) ||
      (item.step.requiredRole === "director" && isLastStep)
    );

    actionMutation.mutate({
      indentId: item.indent.id,
      stepNumber: item.step.stepNumber,
      status: action === "approve" ? "approved" : action === "return" ? "returned" : "rejected",
      comments: comments.trim() || (action === "approve" ? "Approved." : action === "return" ? "Returned for revision." : "Rejected."),
      procurementMode: needsMode ? procurementMode : undefined,
    });
  }

  const pendingCount = pendingItems.length;
  const breachedCount = pendingItems.filter((i) => i.isBreach).length;
  const completedCount = completedItems.length;

  const roleLabel = ROLE_STEP_LABEL[user.role] ?? user.roleLabel;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Approval Inbox</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Logged in as <span className="font-semibold text-foreground">{user.fullName}</span>
          {" · "}{user.designation}
        </p>
        {!["tgmsidc_user", "gm_equipment", "so_equipment", "executive_director", "admin", "gm", "biomedical_engineer", "director"].includes(user.role) && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2 mt-2 inline-block">
            Your role ({user.roleLabel}) does not have approval steps. Indent review/approval steps are assigned to Procurement Officers, GM Equipment, SO Equipment, and Executive Director.
          </p>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-white border border-[#e4eaf2] shadow-xs">
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className={cn("h-5 w-5", breachedCount > 0 ? "text-red-600" : "text-amber-600")} />
            <div>
              <p className={cn("text-2xl font-bold", breachedCount > 0 ? "text-red-700" : "text-amber-700")}>{pendingCount}</p>
              <p className="text-xs text-muted-foreground">Pending — {roleLabel}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border border-[#e4eaf2] shadow-xs">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <div>
              <p className="text-2xl font-bold text-red-700">{breachedCount}</p>
              <p className="text-xs text-muted-foreground">SLA Breached</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border border-[#e4eaf2] shadow-xs">
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <div>
              <p className="text-2xl font-bold text-emerald-700">{completedCount}</p>
              <p className="text-xs text-muted-foreground">Actioned</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="pending">
            Pending
            {pendingCount > 0 && (
              <Badge className="ml-1.5 h-4 min-w-4 text-[10px] px-1 bg-primary/80">{pendingCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="completed">Actioned ({completedCount})</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4 space-y-3">
          {pendingItems.length === 0 && (
            <Card>
              <CardContent className="py-16 text-center">
                <Inbox className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground font-medium">No pending actions</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {["gm", "biomedical_engineer", "director"].includes(user.role)
                    ? "You're all caught up! Check back when new indents are submitted."
                    : `Switch to a role with approval permissions to see inbox items.`}
                </p>
              </CardContent>
            </Card>
          )}
          {pendingItems
            .sort((a, b) => (a.isBreach ? -1 : 1) - (b.isBreach ? -1 : 1))
            .map((item) => (
              <InboxCard
                key={item.indent.id}
                item={item}
                onApprove={() => { setActionDialog({ item, action: "approve" }); setComments(""); }}
                onReturn={() => { setActionDialog({ item, action: "return" }); setComments(""); }}
                onReject={() => { setActionDialog({ item, action: "reject" }); setComments(""); }}
                onViewSpecs={(ind) => setSpecProduct({
                  equipmentId: String(ind.equipmentId || ind.equipmentName || "equipment"),
                  equipmentCode: (ind as any).equipmentCode,
                  name: ind.equipmentName || "Medical Equipment",
                })}
              />
            ))}
        </TabsContent>

        <TabsContent value="completed" className="mt-4 space-y-3">
          {completedItems.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No completed actions yet.</p>
              </CardContent>
            </Card>
          )}
          {completedItems.map((item) => (
            <InboxCard
              key={item.indent.id}
              item={item}
              completed
              onViewSpecs={(ind) => setSpecProduct({
                equipmentId: String(ind.equipmentId || ind.equipmentName || "equipment"),
                equipmentCode: (ind as any).equipmentCode,
                name: ind.equipmentName || "Medical Equipment",
              })}
            />
          ))}
        </TabsContent>
      </Tabs>

      {/* Action Dialog */}
      <Dialog open={!!actionDialog} onOpenChange={() => { setActionDialog(null); setComments(""); }}>
        <DialogContent className="max-w-lg">
          {actionDialog && (() => {
            const { item, action } = actionDialog;
            const steps = (item.indent.approvalSteps && item.indent.approvalSteps.length > 0) ? item.indent.approvalSteps : getSteps(item.indent.id);
            const totalSteps = steps.length;
            const isLastStep = item.step.stepNumber === totalSteps;
            const needsMode = action === "approve" && (
              (item.step.requiredRole === "gm" && totalSteps === 3) ||
              (item.step.requiredRole === "so_equipment" && isLastStep) ||
              (item.step.requiredRole === "director" && isLastStep)
            );
            const isReject = action === "reject";
            const isReturn = action === "return";
            const isApprove = action === "approve";

            return (
              <>
                <DialogHeader>
                  <DialogTitle className={cn(
                    isApprove ? "text-emerald-700" :
                      isReturn ? "text-amber-700" :
                        "text-red-700"
                  )}>
                    {isApprove ? "Approve Indent" : isReturn ? "Return for Revision" : "Reject Indent"}
                    {" — "}{item.indent.indentNumber}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  {/* Indent summary */}
                  <div className={cn(
                    "rounded-lg border p-3 text-sm",
                    isApprove ? "bg-emerald-50 border-emerald-200" :
                      isReturn ? "bg-amber-50 border-amber-200" :
                        "bg-red-50 border-red-200"
                  )}>
                    <p className="font-semibold">{item.indent.equipmentName} × {item.indent.quantity}</p>
                    <p className="text-xs mt-0.5 opacity-80">{item.indent.facilityName}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs opacity-70">
                      <span>Ref: {item.indent.indentNumber}</span>
                      <span>Digitised by {item.indent.digitisedBy}</span>
                    </div>
                  </div>

                  {/* Equipment Technical Specifications Bar */}
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                    <div className="flex items-center gap-2">
                      <Wrench className="h-3.5 w-3.5 text-blue-600" />
                      <span className="font-semibold text-foreground">Standard Technical Specifications</span>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      className="h-7 text-xs gap-1 bg-[#eff5ff] hover:bg-[#dbeafe] text-[#2563eb] border border-[#c6d6ec] font-semibold"
                      onClick={() => setSpecProduct({
                        equipmentId: String(item.indent.equipmentId || item.indent.equipmentName || "equipment"),
                        equipmentCode: (item.indent as any).equipmentCode,
                        name: item.indent.equipmentName || "Medical Equipment",
                      })}
                    >
                      <Eye className="h-3 w-3" />
                      Inspect Tech Specs
                    </Button>
                  </div>

                  {/* Procurement mode — only for final approvals */}
                  {needsMode && (
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
                      {isApprove ? "Comments / Rationale" : isReturn ? "Revision Required *" : "Rejection Reason *"}
                    </Label>
                    <Textarea
                      placeholder={
                        isApprove ? "Observations, conditions, approval notes..."
                          : isReturn ? "Specify what needs to be corrected or clarified..."
                            : "Provide a specific reason for rejection..."
                      }
                      value={comments}
                      onChange={(e) => setComments(e.target.value)}
                      rows={3}
                      className="resize-none"
                    />
                    {(isReject || isReturn) && !comments.trim() && (
                      <p className="text-xs text-red-600">Required for {isReject ? "rejection" : "return"}.</p>
                    )}
                  </div>

                  {processing && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-center gap-2.5 animate-pulse">
                      <Loader2 className="h-4 w-4 text-blue-600 animate-spin shrink-0" />
                      <span>Applying electronic signature & saving approval to database (approx. 2–3s)...</span>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" disabled={processing} onClick={() => { setActionDialog(null); setComments(""); }}>Cancel</Button>
                  <Button
                    className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-semibold"
                    disabled={processing || ((isReject || isReturn) && !comments.trim())}
                    onClick={submitAction}
                  >
                    {processing ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> :
                      isApprove ? <CheckCircle2 className="h-4 w-4 mr-1.5" /> :
                        isReturn ? <RotateCcw className="h-4 w-4 mr-1.5" /> :
                          <XCircle className="h-4 w-4 mr-1.5" />}
                    {processing ? "Saving Approval to DB..." :
                      isApprove ? (item.step.requiredRole === "director" ? "Accord Sanction" : item.step.requiredRole === "biomedical_engineer" ? "Recommend Approval" : "Approve") :
                        isReturn ? "Return for Revision" : "Confirm Rejection"}
                  </Button>
                </DialogFooter>
              </>
            );
          })()}
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
                      Standard Technical Specification per Equipment Master
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
    </div>
  );
}

function InboxCard({ item, onApprove, onReturn, onReject, onViewSpecs, completed }: {
  item: InboxItem;
  onApprove?: () => void;
  onReturn?: () => void;
  onReject?: () => void;
  onViewSpecs?: (indent: Indent) => void;
  completed?: boolean;
}) {
  const { indent, step, isBreach } = item;
  const steps = (indent.approvalSteps && indent.approvalSteps.length > 0) ? indent.approvalSteps : getSteps(indent.id);
  const totalSteps = steps.length;
  const slaHours = SLA_HOURS[step.requiredRole] ?? 72;
  const submittedAt = new Date(indent.createdAt);
  const slaDeadline = new Date(submittedAt.getTime() + slaHours * 60 * 60 * 1000);
  const hoursLeft = differenceInHours(slaDeadline, new Date());

  return (
    <Card className={cn(
      "transition-all",
      isBreach && !completed ? "border-red-200 bg-red-50/20" : "",
      completed ? "opacity-80" : ""
    )}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className={cn(
            "p-2.5 rounded-lg shrink-0 mt-0.5",
            step.status === "approved" ? "bg-emerald-100" :
              step.status === "rejected" ? "bg-red-100" :
                step.status === "returned" ? "bg-amber-100" :
                  "bg-primary/10"
          )}>
            <ShieldCheck className={cn(
              "h-4 w-4",
              step.status === "approved" ? "text-emerald-600" :
                step.status === "rejected" ? "text-red-600" :
                  step.status === "returned" ? "text-amber-600" :
                    "text-primary"
            )} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-semibold text-primary">{indent.indentNumber}</span>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-blue-200 text-blue-700">
                Step {step.stepNumber}/{totalSteps}
              </Badge>
              {isBreach && !completed && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-red-300 bg-red-100 text-red-700">
                  <AlertTriangle className="h-2.5 w-2.5 mr-1" />SLA Breached
                </Badge>
              )}
              {completed && (
                <Badge variant="outline" className={cn(
                  "text-[10px] px-1.5 py-0 border",
                  step.status === "approved" ? "border-emerald-300 bg-emerald-100 text-emerald-700" : "border-red-300 bg-red-100 text-red-700"
                )}>
                  {step.status === "approved" ? <CheckCircle2 className="h-2.5 w-2.5 mr-1 inline" /> : <XCircle className="h-2.5 w-2.5 mr-1 inline" />}
                  {step.status.charAt(0).toUpperCase() + step.status.slice(1)}
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <p className="text-sm font-medium">{indent.equipmentName} × {indent.quantity}</p>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-semibold">
                Est. {formatINR(estimatedValue(indent.equipmentId, indent.quantity))}
              </Badge>
              {estimatedValue(indent.equipmentId, indent.quantity) >= 500_000 && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-violet-300 text-violet-700">
                  High Value
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                {indent.facilityName}
              </span>
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {indent.digitisedBy}
              </span>
              <span className="flex items-center gap-1" title={`Submitted: ${format(new Date(indent.createdAt), "dd MMM yyyy, HH:mm")}`}>
                <Clock className="h-3 w-3" />
                Submitted: {format(new Date((indent as any).indentDate || indent.createdAt), "dd MMM yyyy")}
              </span>
              {!completed && (
                <span className={cn("flex items-center gap-1 font-medium", isBreach ? "text-red-600" : hoursLeft < 24 ? "text-amber-600" : "text-muted-foreground")}>
                  <Clock className="h-3 w-3" />
                  {isBreach
                    ? `Overdue by ${Math.abs(hoursLeft)}h`
                    : `SLA: ${hoursLeft}h remaining`}
                </span>
              )}
              {completed && step.actionedAt && (
                <span>{formatDistanceToNow(new Date(step.actionedAt), { addSuffix: true })}</span>
              )}
            </div>

            {/* Approval steps progress dots */}
            <div className="flex gap-1 mt-2">
              {steps.map((s: ApprovalStep) => (
                <div
                  key={s.stepNumber}
                  className={cn(
                    "h-1.5 w-6 rounded-full",
                    s.status === "approved" ? "bg-emerald-500" :
                      s.status === "rejected" ? "bg-red-500" :
                        s.status === "returned" ? "bg-amber-400" :
                          s.stepNumber === step.stepNumber ? "bg-primary animate-pulse" :
                            "bg-muted"
                  )}
                  title={`Step ${s.stepNumber}: ${s.roleLabel} — ${s.status}`}
                />
              ))}
            </div>

            {step.status === "returned" && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 mt-2">
                ↩ Returned: {step.comments}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0 mt-1 flex-wrap justify-end">
            <Link href={`/indents/${indent.id}`}>
              <Button variant="outline" size="sm" className="gap-1 h-8 text-xs border-[#e4eaf2] bg-white text-[#3c4a63] hover:bg-[#f4f7fb] font-medium shadow-2xs">
                <Eye className="h-3.5 w-3.5 text-[#6b7a93]" />View
              </Button>
            </Link>
            <Button
              size="sm"
              className="gap-1 h-8 text-xs bg-[#eff5ff] hover:bg-[#dbeafe] text-[#2563eb] border border-[#c6d6ec] shadow-2xs font-semibold cursor-pointer"
              onClick={() => onViewSpecs?.(indent)}
            >
              <Wrench className="h-3.5 w-3.5 text-[#2563eb]" />Specs
            </Button>
            {!completed && (
              <>
                <Button
                  size="sm"
                  className="gap-1 h-8 text-xs bg-[#f0fbf4] hover:bg-[#dcfce7] text-[#159557] border border-[#c8ebd6] shadow-2xs font-semibold cursor-pointer"
                  onClick={onApprove}
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#159557]" />Approve
                </Button>
                <Button
                  size="sm"
                  className="gap-1 h-8 text-xs bg-[#f5f1fe] hover:bg-[#ede9fe] text-[#6d42d9] border border-[#d8c8f8] shadow-2xs font-semibold cursor-pointer"
                  onClick={onReturn}
                >
                  <RotateCcw className="h-3.5 w-3.5 text-[#6d42d9]" />Return
                </Button>
                <Button
                  size="sm"
                  className="gap-1 h-8 text-xs bg-[#fef2f3] hover:bg-[#fee2e2] text-[#dc2f3c] border border-[#f8d5d8] shadow-2xs font-semibold cursor-pointer"
                  onClick={onReject}
                >
                  <XCircle className="h-3.5 w-3.5 text-[#dc2f3c]" />Reject
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
