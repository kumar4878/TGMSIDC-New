import { useRoute, Link } from "wouter";
import { useGetDelivery, getGetDeliveryQueryKey, useUpdateDelivery, useAcceptDelivery } from "@/lib/api-hooks";
import { recordQAInspection, logDeliveryDiscrepancy } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { ArrowLeft, AlertCircle, CheckCircle2, QrCode, XCircle, ShieldCheck, Camera, FileCheck, Printer, Clock, AlertTriangle } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface InspectionItem {
  id: string;
  name: string;
  category: string;
  result: "pass" | "fail" | "pending";
  remarks: string;
}

const DEFAULT_CHECKLIST: InspectionItem[] = [
  { id: "1", name: "Physical Condition & Protective Packaging", category: "Physical", result: "pass", remarks: "Packaging intact, no dent/scratch" },
  { id: "2", name: "Power & Electrical Safety Compliance", category: "Safety", result: "pass", remarks: "Earthing and stabilizer verified" },
  { id: "3", name: "Technical Specifications Verification", category: "Technical", result: "pass", remarks: "Model and serial match RC specs" },
  { id: "4", name: "Operational & Clinical Load Demo", category: "Performance", result: "pass", remarks: "Tested under simulated load" },
  { id: "5", name: "Calibration & Accuracy Certification", category: "Quality", result: "pass", remarks: "Traceable NABL calibration verified" },
  { id: "6", name: "User Manuals, Accessories & Warranty", category: "Documentation", result: "pass", remarks: "Operating manual & warranty card delivered" },
];

export default function DeliveryDetail() {
  const { user } = useAuth();
  const isVendor = user?.role === "vendor";
  const isConsignee = user?.role === "consignee" || user?.role === "admin" || user?.role === "gm_equipment";

  const [, params] = useRoute("/deliveries/:id");
  const id = (params?.id ?? "");
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: delivery, isLoading } = useGetDelivery(id, { query: { enabled: !!id, queryKey: getGetDeliveryQueryKey(id) } });
  const updateDelivery = useUpdateDelivery();
  const acceptDelivery = useAcceptDelivery();

  const [deliveredDate, setDeliveredDate] = useState("");

  // Inspection Checklist state
  const [checklist, setChecklist] = useState<InspectionItem[]>(DEFAULT_CHECKLIST);
  const [committeeName, setCommitteeName] = useState("Hospital Biomedical & Technical QA Committee");
  const [qaDecision, setQaDecision] = useState<"accepted" | "conditional" | "rejected">("accepted");
  const [qaNotes, setQaNotes] = useState("");
  const [qaSubmitting, setQaSubmitting] = useState(false);

  // Discrepancy Logging state (Process Book §8 Step 7)
  const [discrepancyModal, setDiscrepancyModal] = useState(false);
  const [discrepancyForm, setDiscrepancyForm] = useState({
    type: "damaged",
    quantity: 1,
    description: "",
    actionRequired: "replacement",
    photoUrl: "https://photos.healthportal.gov.in/evidence-consignee-damages.jpg",
  });
  const [discSubmitting, setDiscSubmitting] = useState(false);

  // Certificate Modal state
  const [certModal, setCertModal] = useState(false);

  if (isLoading) return <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 rounded-full border-4 border-primary border-t-transparent" /></div>;
  if (!delivery) return <div className="text-center py-20 text-muted-foreground">Delivery not found</div>;

  const rawDel = delivery as any;
  const passCount = checklist.filter(c => c.result === "pass").length;
  const computedScore = Math.round((passCount / checklist.length) * 100);
  const qaScore100 = (rawDel.qaComplianceScore != null && rawDel.qaComplianceScore >= 100) || rawDel.qaDecision === "accepted";
  const docsOk = rawDel.documentsUploaded || rawDel.deliveryCertUploaded;
  const canAccept = qaScore100 && docsOk && delivery.status !== "accepted";

  function updateChecklistResult(itemId: string, result: "pass" | "fail" | "pending") {
    setChecklist(prev => prev.map(item => item.id === itemId ? { ...item, result } : item));
  }

  function handleMarkDelivered() {
    updateDelivery.mutate({ id, data: { status: "delivered", deliveredDate: deliveredDate || new Date().toISOString() } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetDeliveryQueryKey(id) });
        toast({ title: "Marked Delivered", description: "Consignment status updated to delivered at hospital site." });
      }
    });
  }

  async function handleQAInspectionSubmit(e: React.FormEvent) {
    e.preventDefault();
    setQaSubmitting(true);
    try {
      await recordQAInspection(id, {
        qaDecision,
        qaComplianceScore: computedScore,
        qaNotes: qaNotes || `QA inspection performed by ${committeeName}. Score: ${computedScore}%`,
        inspectionItems: checklist.map(c => ({ parameterName: c.name, result: c.result, remarks: c.remarks })),
        committeeName,
        rectificationDueDate: new Date(Date.now() + 15 * 86400000).toISOString(),
      });
      queryClient.invalidateQueries({ queryKey: getGetDeliveryQueryKey(id) });
      toast({
        title: "QA Inspection Recorded",
        description: `Decision: ${qaDecision.toUpperCase()} (Score: ${computedScore}%)`,
      });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to record QA", variant: "destructive" });
    } finally {
      setQaSubmitting(false);
    }
  }

  async function handleLogDiscrepancy(e: React.FormEvent) {
    e.preventDefault();
    if (!discrepancyForm.description.trim()) return;
    setDiscSubmitting(true);
    try {
      await logDeliveryDiscrepancy(id, discrepancyForm);
      queryClient.invalidateQueries({ queryKey: getGetDeliveryQueryKey(id) });
      setDiscrepancyModal(false);
      toast({
        title: "Discrepancy Logged",
        description: "Vendor notified to rectify/replace equipment per Process Book §8.",
      });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to log discrepancy", variant: "destructive" });
    } finally {
      setDiscSubmitting(false);
    }
  }

  function handleDocuments() {
    updateDelivery.mutate({ id, data: { documentsUploaded: true } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetDeliveryQueryKey(id) });
        toast({ title: "Documents Verified", description: "Test, calibration, and warranty documentation verified." });
      }
    });
  }

  function handleAccept() {
    acceptDelivery.mutate(id, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetDeliveryQueryKey(id) });
        toast({ title: "Equipment Accepted", description: "Official Acceptance Certificate issued and warranty activated." });
      }
    });
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <Link href="/deliveries">
          <Button variant="ghost" size="sm" className="gap-2"><ArrowLeft className="h-4 w-4" />Back</Button>
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold font-mono tracking-tight">{rawDel.deliveryTrackingId || delivery.qrCode}</h1>
            <Badge variant="outline" className="text-xs bg-slate-100 text-slate-700">
              PO #{delivery.poNumber}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Consignment to {delivery.facilityName} · Item: {delivery.equipmentName} (Qty: {delivery.quantity})
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <StatusBadge status={delivery.status} />
          {delivery.status === "accepted" && (
            <Button size="sm" className="bg-[#186812] hover:bg-[#124e0d] text-white gap-1.5" onClick={() => setCertModal(true)}>
              <Printer className="h-3.5 w-3.5" /> View Acceptance Certificate
            </Button>
          )}
        </div>
      </div>

      {/* Decision / Alert Ribbons */}
      {rawDel.qaDecision === "conditional" && (
        <div className="flex gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-900">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-semibold text-amber-950">Conditional Acceptance Issued (Process Book §9 Step 7)</p>
            <p>Non-critical deviations noted. Vendor is granted a statutory <strong>15-day rectification SLA</strong>. Final Acceptance Certificate will be released after vendor completes rectification.</p>
            {rawDel.discrepancyNotes && <p className="font-mono text-amber-800">{rawDel.discrepancyNotes}</p>}
          </div>
        </div>
      )}

      {rawDel.qaDecision === "rejected" && (
        <div className="flex gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-red-900">
          <XCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          <div className="text-xs">
            <p className="font-semibold text-red-950">Consignment Rejected</p>
            <p className="mt-0.5">Equipment failed critical specification tests. Vendor has been issued a Rejection Notice and must supply replacements.</p>
            {rawDel.rejectionReason && <p className="mt-1 font-mono text-red-800 font-medium">{rawDel.rejectionReason}</p>}
          </div>
        </div>
      )}

      {delivery.status === "accepted" && (
        <div className="flex gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="text-xs">
            <p className="font-semibold text-emerald-950">Acceptance Certificate Issued &amp; Equipment Commissioned</p>
            <p className="mt-0.5">Equipment passed 100% QA criteria. 1-Year Comprehensive Warranty activated.</p>
          </div>
        </div>
      )}

      {/* Consignment & DCC Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border border-border/80 shadow-sm">
          <CardHeader className="pb-3 bg-muted/20 border-b">
            <CardTitle className="text-sm font-semibold">Consignment Logistics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5 pt-4">
            <DR label="Purchase Order Ref" value={delivery.poNumber} />
            <DR label="Equipment Name" value={delivery.equipmentName} />
            <DR label="Contracted Vendor" value={delivery.vendorName} />
            <DR label="Destination Facility" value={delivery.facilityName} />
            <DR label="Dispatched Quantity" value={`${delivery.quantity} Units`} />
            <DR label="Challan Number" value={rawDel.challanNumber || "DC-2025-091"} />
            <DR label="Transporter / Vehicle" value={`${rawDel.transporterName || "SafeExpress"} (${rawDel.transporterVehicle || "TS-09-UB-8891"})`} />
            <DR label="Dispatch Date" value={delivery.dispatchDate ? format(new Date(delivery.dispatchDate), "dd MMM yyyy") : "—"} />
            <DR label="Delivered Date" value={delivery.deliveredDate ? format(new Date(delivery.deliveredDate), "dd MMM yyyy") : "Pending Site Receipt"} />
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-sm">
          <CardHeader className="pb-3 bg-muted/20 border-b flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">Quality &amp; DCC Compliance</CardTitle>
            {isConsignee && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs border-amber-300 text-amber-800"
                onClick={() => setDiscrepancyModal(true)}
              >
                <Camera className="h-3 w-3 mr-1" /> Log Discrepancy
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-2.5 pt-4">
            <DR label="QA Compliance Score" value={rawDel.qaComplianceScore != null ? `${rawDel.qaComplianceScore}%` : `${computedScore}% (In Evaluation)`} />
            <DR label="QA Decision" value={rawDel.qaDecision ? rawDel.qaDecision.toUpperCase() : "PENDING INSPECTION"} />
            <DR label="DCC Uploaded (7-Day SLA)" value={rawDel.deliveryCertUploaded ? "Yes — Verified" : "Pending Vendor Upload"} />
            <DR label="DCC Signed Date" value={rawDel.deliveryCertDate ? format(new Date(rawDel.deliveryCertDate), "dd MMM yyyy") : "—"} />
            <DR label="Mandatory Docs Verified" value={docsOk ? "Verified" : "Pending Upload"} />
            <DR label="Acceptance Certificate" value={rawDel.acceptanceCertificateIssued ? "Issued" : "Pending Final Sign-off"} />
            <DR label="Warranty Coverage" value={rawDel.warrantyEndDate ? `Active until ${format(new Date(rawDel.warrantyEndDate), "dd MMM yyyy")}` : "12 Months (Starts on Acceptance)"} />
          </CardContent>
        </Card>
      </div>

      {/* Auto-Generated QA Inspection Checklist (Process Book §9 Step 4 & §12 F-18) */}
      <Card className="border border-border/80 shadow-sm">
        <CardHeader className="pb-3 bg-muted/20 border-b flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" /> Auto-Generated QA Inspection Checklist (Process Book §9)
            </CardTitle>
            <CardDescription className="text-xs">
              Pre-populated technical parameters based on Equipment Master specifications. Every item must be evaluated.
            </CardDescription>
          </div>
          <Badge className={computedScore === 100 ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}>
            Compliance Score: {computedScore}%
          </Badge>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/40 border-b text-muted-foreground uppercase font-semibold">
                <tr>
                  <th className="p-3 text-left">#</th>
                  <th className="p-3 text-left">Inspection Parameter</th>
                  <th className="p-3 text-left">Category</th>
                  <th className="p-3 text-center">Result</th>
                  <th className="p-3 text-left">Remarks &amp; Observations</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {checklist.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-muted/30">
                    <td className="p-3 font-mono">{idx + 1}</td>
                    <td className="p-3 font-medium text-foreground">{item.name}</td>
                    <td className="p-3 text-muted-foreground uppercase">{item.category}</td>
                    <td className="p-3 text-center">
                      {isConsignee ? (
                        <div className="inline-flex rounded-md border p-0.5 bg-muted/40">
                          <button
                            type="button"
                            className={cn("px-2 py-0.5 rounded text-[10px] font-semibold transition-colors", item.result === "pass" ? "bg-emerald-600 text-white shadow-xs" : "text-muted-foreground")}
                            onClick={() => updateChecklistResult(item.id, "pass")}
                          >
                            Pass
                          </button>
                          <button
                            type="button"
                            className={cn("px-2 py-0.5 rounded text-[10px] font-semibold transition-colors", item.result === "fail" ? "bg-red-600 text-white shadow-xs" : "text-muted-foreground")}
                            onClick={() => updateChecklistResult(item.id, "fail")}
                          >
                            Fail
                          </button>
                        </div>
                      ) : (
                        <Badge variant="outline" className={cn("text-[10px] font-semibold uppercase", item.result === "pass" ? "border-emerald-500 text-emerald-700 bg-emerald-50" : "border-red-500 text-red-700 bg-red-50")}>
                          {item.result}
                        </Badge>
                      )}
                    </td>
                    <td className="p-3 text-muted-foreground font-mono">{item.remarks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* QA Submission Action Bar */}
          {delivery.status !== "accepted" && (
            isConsignee ? (
              <form onSubmit={handleQAInspectionSubmit} className="p-4 border-t bg-muted/20 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-xs font-semibold">QA Committee Determination</Label>
                    <Select
                      value={qaDecision}
                      onValueChange={(v: any) => setQaDecision(v)}
                    >
                      <SelectTrigger className="mt-1.5 h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="accepted">Accepted (100% Meets Specifications)</SelectItem>
                        <SelectItem value="conditional">Conditional Acceptance (15-Day Rectification SLA)</SelectItem>
                        <SelectItem value="rejected">Rejected (Critical Defect / Spec Mismatch)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold">Inspection Committee Sign-off</Label>
                    <Input
                      value={committeeName}
                      onChange={(e) => setCommitteeName(e.target.value)}
                      className="mt-1.5 h-9 text-xs"
                      required
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-semibold">Committee Notes &amp; Rectification Notice</Label>
                    <Input
                      placeholder="Mandatory if conditional or rejected..."
                      value={qaNotes}
                      onChange={(e) => setQaNotes(e.target.value)}
                      className="mt-1.5 h-9 text-xs"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <p className="text-[11px] text-muted-foreground">
                    Per Process Book §9, Conditional Acceptance triggers a formal 15-calendar-day vendor rectification notice.
                  </p>
                  <Button type="submit" disabled={qaSubmitting} className="bg-[#186812] hover:bg-[#124e0d] text-white text-xs">
                    {qaSubmitting ? "Submitting..." : "Submit Formal QA Decision"}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="p-4 border-t bg-slate-50 border-slate-200 text-slate-700 flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-[#2563eb] shrink-0" />
                <div className="text-xs">
                  <p className="font-semibold text-slate-900">Hospital Joint QA Inspection Committee Authority</p>
                  <p className="text-slate-500 mt-0.5">
                    Formal technical inspection, safety scoring, and QA determination are strictly recorded by the Consignee Hospital Joint Committee under Process Book §9.
                  </p>
                </div>
              </div>
            )
          )}
        </CardContent>
      </Card>

      {/* Discrepancies History */}
      {rawDel.discrepancies && rawDel.discrepancies.length > 0 && (
        <Card className="border border-border/80 shadow-sm">
          <CardHeader className="pb-3 bg-muted/20 border-b">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600" /> Logged Discrepancies ({rawDel.discrepancies.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-xs">
              <thead className="bg-muted/40 border-b text-muted-foreground uppercase">
                <tr>
                  <th className="p-3 text-left">Type</th>
                  <th className="p-3 text-left">Description &amp; Photographic Evidence</th>
                  <th className="p-3 text-center">Affected Qty</th>
                  <th className="p-3 text-left">Action Required</th>
                  <th className="p-3 text-center">Resolution Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rawDel.discrepancies.map((d: any, idx: number) => (
                  <tr key={idx} className="hover:bg-muted/30">
                    <td className="p-3 font-semibold uppercase text-amber-800">{d.type}</td>
                    <td className="p-3 text-foreground">{d.description}</td>
                    <td className="p-3 text-center font-bold font-mono">{d.quantity}</td>
                    <td className="p-3 uppercase text-muted-foreground">{d.actionRequired}</td>
                    <td className="p-3 text-center">
                      <Badge variant="outline" className="text-[10px] uppercase">
                        {d.resolutionStatus}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Actions Toolbar */}
      {delivery.status !== "accepted" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 1. Mark Site Receipt */}
          {(delivery.status === "dispatched" || delivery.status === "in_transit" || delivery.status === "expected") && (
            <Card className="border border-border/80 shadow-sm">
              <CardHeader className="pb-3 bg-muted/20 border-b">
                <CardTitle className="text-xs font-semibold">1. Mark Hospital Receipt</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-3">
                <div>
                  <Label className="text-[11px]">Physical Receipt Date</Label>
                  <Input type="date" value={deliveredDate} onChange={(e) => setDeliveredDate(e.target.value)} className="mt-1 h-9 text-xs" />
                </div>
                <Button size="sm" onClick={handleMarkDelivered} disabled={updateDelivery.isPending} className="w-full bg-slate-800 hover:bg-slate-700 text-white text-xs">
                  {updateDelivery.isPending ? "Saving..." : "Confirm Site Delivery"}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* 2. Documents Upload confirmation */}
          <Card className="border border-border/80 shadow-sm">
            <CardHeader className="pb-3 bg-muted/20 border-b">
              <CardTitle className="text-xs font-semibold">2. Mandatory Certificates Check</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-3">
              <div className="space-y-1.5 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className={cn("h-3.5 w-3.5", docsOk ? "text-emerald-600" : "text-slate-400")} />
                  <span>Calibration &amp; Test Certificate</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className={cn("h-3.5 w-3.5", rawDel.deliveryCertUploaded ? "text-emerald-600" : "text-slate-400")} />
                  <span>Signed Delivery Completion Certificate (DCC)</span>
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={handleDocuments} disabled={updateDelivery.isPending} className="w-full text-xs">
                {docsOk ? "Documentation Verified" : "Verify Documentation"}
              </Button>
            </CardContent>
          </Card>

          {/* 3. Final Commissioning & Acceptance */}
          <Card className={cn("border border-border/80 shadow-sm", !canAccept && "opacity-70")}>
            <CardHeader className="pb-3 bg-muted/20 border-b">
              <CardTitle className="text-xs font-semibold">3. Issue Acceptance Certificate</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-3">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs">
                  {qaScore100 ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> : <XCircle className="h-3.5 w-3.5 text-red-500" />}
                  <span>QA 100% Compliant</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs">
                  {docsOk ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> : <XCircle className="h-3.5 w-3.5 text-red-500" />}
                  <span>Documents &amp; DCC Verified</span>
                </div>
              </div>
              {isConsignee ? (
                <Button
                  size="sm"
                  className="w-full bg-[#186812] hover:bg-[#124e0d] text-white text-xs"
                  disabled={!canAccept || acceptDelivery.isPending}
                  onClick={handleAccept}
                >
                  {acceptDelivery.isPending ? "Issuing..." : "Issue Final Acceptance"}
                </Button>
              ) : (
                <p className="text-[11px] text-muted-foreground italic pt-1 text-center">
                  Consignee &amp; Procurement Signoff Authority
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Discrepancy Logging Modal (Process Book §8 Step 7) */}
      <Dialog open={discrepancyModal} onOpenChange={setDiscrepancyModal}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleLogDiscrepancy}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5 text-amber-600" /> Log Consignee Discrepancy (with Photos)
              </DialogTitle>
              <DialogDescription className="text-xs">
                Record damaged items, shortages, or specification deviations with photo evidence per Process Book §8.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Discrepancy Classification</Label>
                  <Select
                    value={discrepancyForm.type}
                    onValueChange={(v) => setDiscrepancyForm(f => ({ ...f, type: v }))}
                  >
                    <SelectTrigger className="text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="damaged">Damaged in Transit</SelectItem>
                      <SelectItem value="short_delivery">Shortage / Missing Units</SelectItem>
                      <SelectItem value="wrong_item">Specification Mismatch</SelectItem>
                      <SelectItem value="other">Accessories Incomplete</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Affected Quantity</Label>
                  <Input
                    type="number"
                    min="1"
                    value={discrepancyForm.quantity}
                    onChange={(e) => setDiscrepancyForm(f => ({ ...f, quantity: Number(e.target.value) || 1 }))}
                    className="h-9 text-xs"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Action Required from Vendor</Label>
                <Select
                  value={discrepancyForm.actionRequired}
                  onValueChange={(v) => setDiscrepancyForm(f => ({ ...f, actionRequired: v }))}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="replacement">Immediate Equipment Replacement</SelectItem>
                    <SelectItem value="re_delivery">Re-dispatch Missing Shortage Units</SelectItem>
                    <SelectItem value="credit_note">Rectify On-site within 15 Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Photographic Evidence URL / File Link *</Label>
                <Input
                  value={discrepancyForm.photoUrl}
                  onChange={(e) => setDiscrepancyForm(f => ({ ...f, photoUrl: e.target.value }))}
                  placeholder="https://evidence.healthportal.gov.in/photo-01.jpg"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Discrepancy Description &amp; Damage Details *</Label>
                <Textarea
                  value={discrepancyForm.description}
                  onChange={(e) => setDiscrepancyForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Specify broken parts, packaging tear, or missing serial numbers..."
                  rows={3}
                  required
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDiscrepancyModal(false)}>Cancel</Button>
              <Button type="submit" disabled={discSubmitting} className="bg-amber-600 hover:bg-amber-700 text-white">
                {discSubmitting ? "Logging..." : "Submit Discrepancy Notice"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Official Acceptance Certificate Dialog */}
      <Dialog open={certModal} onOpenChange={setCertModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-emerald-700" />
              Telangana Medical Services &amp; Infrastructure Development Corporation
            </DialogTitle>
            <DialogDescription className="text-xs">
              Official Statutory Equipment Acceptance &amp; Commissioning Certificate (Form QA-09)
            </DialogDescription>
          </DialogHeader>

          <div className="p-6 border rounded-xl bg-slate-50 space-y-4 text-xs font-mono">
            <div className="text-center border-b pb-3">
              <p className="font-bold text-sm text-foreground uppercase">Certificate of Equipment Acceptance &amp; Clinical Handover</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Reference: CERT-{rawDel.deliveryTrackingId}-2026</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-muted-foreground">PO Number:</p>
                <p className="font-bold text-foreground">{delivery.poNumber}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Consignment ID:</p>
                <p className="font-bold text-foreground">{rawDel.deliveryTrackingId}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Equipment Supplied:</p>
                <p className="font-bold text-foreground">{delivery.equipmentName}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Supplying Vendor:</p>
                <p className="font-bold text-foreground">{delivery.vendorName}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Receiving Hospital:</p>
                <p className="font-bold text-foreground">{delivery.facilityName}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Accepted Quantity:</p>
                <p className="font-bold text-foreground">{delivery.quantity} Units</p>
              </div>
            </div>

            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded text-emerald-900 space-y-1">
              <p className="font-bold">QA Committee Certification:</p>
              <p>This is to certify that the medical equipment specified above has been physically inspected, tested under simulated load, and calibrated. The equipment conforms 100% to approved technical specifications and has been commissioned into active clinical service.</p>
              <p className="mt-2 text-[10px]">Warranty Start Date: {format(new Date(), "dd-MMM-yyyy")} · Valid for: 12 Months</p>
            </div>

            <div className="flex justify-between items-end pt-4 border-t text-[11px]">
              <div>
                <p className="font-bold">Biomedical Engineer</p>
                <p className="text-muted-foreground">Quality &amp; Inspection Wing</p>
              </div>
              <div className="text-right">
                <p className="font-bold">Medical Superintendent</p>
                <p className="text-muted-foreground">{delivery.facilityName}</p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCertModal(false)}>Close</Button>
            <Button className="bg-[#186812] hover:bg-[#124e0d] text-white gap-1.5" onClick={() => window.print()}>
              <Printer className="h-4 w-4" /> Print Official Certificate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DR({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between py-1 border-b border-muted/50 last:border-0 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground font-mono">{value || "—"}</span>
    </div>
  );
}
