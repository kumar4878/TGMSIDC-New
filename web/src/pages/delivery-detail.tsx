import { useRoute, Link } from "wouter";
import { useGetDelivery, getGetDeliveryQueryKey, useUpdateDelivery, useAcceptDelivery } from "@/lib/api-hooks";
import { recordQAInspection, logDeliveryDiscrepancy, resolveDeliveryDiscrepancy, recordDeliveryReceipt, uploadDCC, verifyDCC, recordQAReinspection, registerEquipmentAssets } from "@/lib/api";
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
import { ArrowLeft, AlertCircle, CheckCircle2, QrCode, XCircle, ShieldCheck, Camera, FileCheck, Printer, Clock, AlertTriangle, FileUp, Tag, RotateCcw, PackageCheck } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { useState, useEffect } from "react";
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

  // Discrepancy Resolution state (Step 30: Vendor / Hospital Consignee)
  const [resolveDiscModal, setResolveDiscModal] = useState<{ index: number; discrepancy: any } | null>(null);
  const [resolveNotes, setResolveNotes] = useState("");
  const [resolvedBy, setResolvedBy] = useState(user?.fullName || "Hospital Consignee Store Officer");
  const [isResolvingDisc, setIsResolvingDisc] = useState(false);

  // Certificate Modal state
  const [certModal, setCertModal] = useState(false);

  // DCC Verification state
  const [dccVerifyModal, setDccVerifyModal] = useState(false);
  const [dccOfficerName, setDccOfficerName] = useState("Consignee Verification Officer");
  const [dccRemarks, setDccRemarks] = useState("Physically verified against consignee copy of challan and packing list");
  const [isVerifyingDcc, setIsVerifyingDcc] = useState(false);

  // DCC Upload state
  const [dccUploadModal, setDccUploadModal] = useState(false);
  const [dccFilename, setDccFilename] = useState("Signed_Stamped_DCC.pdf");
  const [dccSignerName, setDccSignerName] = useState("Medical Superintendent");
  const [dccSignerDesig, setDccSignerDesig] = useState("Head of Institution");
  const [isUploadingDcc, setIsUploadingDcc] = useState(false);

  // Receipt Recording state (Detailed Breakdown: Received, Accepted, Damaged, Shortage, Rejected, Returned)
  const [receiptModal, setReceiptModal] = useState(false);
  const [receiptForm, setReceiptForm] = useState({
    receivedQty: 1,
    acceptedQty: 1,
    damagedQty: 0,
    shortageQty: 0,
    rejectedQty: 0,
    returnedQty: 0,
    receivedBy: "Hospital Store In-charge",
    condition: "good",
    serialNumbersStr: "",
    remarks: "",
  });
  const [isRecordingReceipt, setIsRecordingReceipt] = useState(false);

  // QA Reinspection state
  const [reinspectModal, setReinspectModal] = useState(false);
  const [reinspectDecision, setReinspectDecision] = useState<"accepted" | "rejected">("accepted");
  const [reinspectScore, setReinspectScore] = useState(100);
  const [reinspectOfficer, setReinspectOfficer] = useState("QA Re-inspection Committee");
  const [reinspectNotes, setReinspectNotes] = useState("Rectification verified and found compliant with tender specifications.");
  const [isReinspecting, setIsReinspecting] = useState(false);

  // Equipment Asset Registration state
  const [assetModal, setAssetModal] = useState(false);
  const [assetDept, setAssetDept] = useState("Biomedical Engineering / ICU");
  const [assetLocation, setAssetLocation] = useState("Main Block, 2nd Floor, Room 204");
  const [assetMake, setAssetMake] = useState("");
  const [assetModel, setAssetModel] = useState("");
  const [assetSerials, setAssetSerials] = useState("");
  const [isRegisteringAsset, setIsRegisteringAsset] = useState(false);

  useEffect(() => {
    if (delivery) {
      const r = delivery as any;
      setReceiptForm({
        receivedQty: r.receivedQty ?? delivery.quantity ?? 1,
        acceptedQty: r.acceptedQty ?? delivery.quantity ?? 1,
        damagedQty: r.damagedQty ?? 0,
        shortageQty: r.shortageQty ?? 0,
        rejectedQty: r.rejectedQty ?? 0,
        returnedQty: r.returnedQty ?? 0,
        receivedBy: r.receivedBy || "Hospital Store In-charge",
        condition: r.condition || "good",
        serialNumbersStr: (r.serialNumbers || []).join(", "),
        remarks: "",
      });
      if (r.facilityName) {
        setAssetLocation(`${r.facilityName} - Biomedical Wing`);
      }
    }
  }, [delivery]);

  if (isLoading) return <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 rounded-full border-4 border-primary border-t-transparent" /></div>;
  if (!delivery) return <div className="text-center py-20 text-muted-foreground">Delivery not found</div>;

  const rawDel = delivery as any;
  const passCount = checklist.filter(c => c.result === "pass").length;
  const computedScore = Math.round((passCount / checklist.length) * 100);
  const qaScore100 = (rawDel.qaComplianceScore != null && rawDel.qaComplianceScore >= 100) || rawDel.qaDecision === "accepted";
  const docsOk = rawDel.documentsUploaded || rawDel.deliveryCertUploaded;
  const canAccept = qaScore100 && docsOk && delivery.status !== "accepted";

  const delDate = delivery.deliveredDate ? new Date(delivery.deliveredDate) : null;
  const daysSinceDel = delDate ? differenceInDays(new Date(), delDate) : 0;
  const isDelivered = delivery.status === "delivered" || delivery.status === "accepted";
  const dccOverdue = isDelivered && !rawDel.deliveryCertUploaded && daysSinceDel > 7;
  const dccStatusText = rawDel.deliveryCertUploaded ? "Uploaded ✅" : dccOverdue ? "Overdue ❌" : "Pending ⏳";


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

  async function handleVerifyDCC(e: React.FormEvent) {
    e.preventDefault();
    setIsVerifyingDcc(true);
    try {
      await verifyDCC(id, { officerName: dccOfficerName, remarks: dccRemarks });
      queryClient.invalidateQueries({ queryKey: getGetDeliveryQueryKey(id) });
      setDccVerifyModal(false);
      toast({ title: "DCC Verified", description: "Delivery Completion Certificate verified and approved." });
    } catch (err: any) {
      toast({ title: "Verification Failed", description: err.message || "Failed to verify DCC", variant: "destructive" });
    } finally {
      setIsVerifyingDcc(false);
    }
  }

  async function handleUploadDCC(e: React.FormEvent) {
    e.preventDefault();
    setIsUploadingDcc(true);
    try {
      await uploadDCC(id, {
        filename: dccFilename,
        officerName: dccSignerName,
        officerDesignation: dccSignerDesig,
        certificateDate: new Date().toISOString(),
      });
      queryClient.invalidateQueries({ queryKey: getGetDeliveryQueryKey(id) });
      setDccUploadModal(false);
      toast({ title: "DCC Uploaded", description: "Delivery Completion Certificate uploaded successfully." });
    } catch (err: any) {
      toast({ title: "Upload Failed", description: err.message || "Failed to upload DCC", variant: "destructive" });
    } finally {
      setIsUploadingDcc(false);
    }
  }

  async function handleRecordReceipt(e: React.FormEvent) {
    e.preventDefault();
    setIsRecordingReceipt(true);
    try {
      const serials = receiptForm.serialNumbersStr.split(",").map(s => s.trim()).filter(Boolean);
      await recordDeliveryReceipt(id, {
        receivedQty: Number(receiptForm.receivedQty),
        acceptedQty: Number(receiptForm.acceptedQty),
        damagedQty: Number(receiptForm.damagedQty),
        shortageQty: Number(receiptForm.shortageQty),
        rejectedQty: Number(receiptForm.rejectedQty),
        returnedQty: Number(receiptForm.returnedQty),
        receivedBy: receiptForm.receivedBy,
        condition: receiptForm.condition,
        remarks: receiptForm.remarks,
        serialNumbers: serials.length > 0 ? serials : undefined,
      });
      queryClient.invalidateQueries({ queryKey: getGetDeliveryQueryKey(id) });
      setReceiptModal(false);
      toast({ title: "Physical Receipt Recorded", description: "Consignment receipt breakdown updated." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to record receipt", variant: "destructive" });
    } finally {
      setIsRecordingReceipt(false);
    }
  }

  async function handleResolveDiscrepancy(e: React.FormEvent) {
    e.preventDefault();
    if (!resolveDiscModal) return;
    setIsResolvingDisc(true);
    try {
      await resolveDeliveryDiscrepancy(id, {
        discrepancyIndex: resolveDiscModal.index,
        resolutionNotes: resolveNotes || "Vendor supplied replacement/rectification verified on-site by consignee.",
        resolvedBy: resolvedBy || user?.fullName || "Hospital Consignee Store Officer",
      });
      queryClient.invalidateQueries({ queryKey: getGetDeliveryQueryKey(id) });
      toast({
        title: "Discrepancy Resolved (Step 30)",
        description: "Delivery discrepancy marked as resolved and consignment quantities updated.",
      });
      setResolveDiscModal(null);
      setResolveNotes("");
    } catch (err: any) {
      toast({
        title: "Resolution Failed",
        description: err.message || "Could not resolve discrepancy",
        variant: "destructive",
      });
    } finally {
      setIsResolvingDisc(false);
    }
  }

  async function handleQAReinspection(e: React.FormEvent) {
    e.preventDefault();
    setIsReinspecting(true);
    try {
      await recordQAReinspection(id, {
        qaDecision: reinspectDecision,
        qaComplianceScore: reinspectScore,
        qaNotes: reinspectNotes,
        reinspectedBy: reinspectOfficer,
      });
      queryClient.invalidateQueries({ queryKey: getGetDeliveryQueryKey(id) });
      setReinspectModal(false);
      toast({ title: "Re-inspection Recorded", description: `Decision: ${reinspectDecision.toUpperCase()}` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to record re-inspection", variant: "destructive" });
    } finally {
      setIsReinspecting(false);
    }
  }

  async function handleRegisterEquipment(e: React.FormEvent) {
    e.preventDefault();
    setIsRegisteringAsset(true);
    try {
      const serials = assetSerials.split(",").map(s => s.trim()).filter(Boolean);
      await registerEquipmentAssets(id, {
        department: assetDept,
        locationDetails: assetLocation,
        make: assetMake || undefined,
        model: assetModel || undefined,
        serialNumbers: serials.length > 0 ? serials : undefined,
        registeredBy: user?.fullName || "Biomedical Engineer",
      });
      queryClient.invalidateQueries({ queryKey: getGetDeliveryQueryKey(id) });
      setAssetModal(false);
      toast({ title: "Assets Registered", description: "Equipment inventory assets tagged with unique AST IDs." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to register equipment", variant: "destructive" });
    } finally {
      setIsRegisteringAsset(false);
    }
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
        description: "Vendor notified to rectify/replace equipment.",
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
            <Button size="sm" className="gap-1.5" onClick={() => setCertModal(true)}>
              <Printer className="h-3.5 w-3.5" /> View Acceptance Certificate
            </Button>
          )}
        </div>
      </div>

      {/* Decision / Alert Ribbons */}
      {rawDel.qaDecision === "conditional" && (
        <div className="flex items-center justify-between gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-900">
          <div className="flex gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-semibold text-amber-950">Conditional Acceptance Issued (15-Day Rectification SLA)</p>
              <p>Non-critical deviations noted. Vendor has been served rectification notice. Final Acceptance Certificate is withheld pending re-inspection.</p>
              {rawDel.discrepancyNotes && <p className="font-mono text-amber-800">{rawDel.discrepancyNotes}</p>}
            </div>
          </div>
          {isConsignee && (
            <Button size="sm" onClick={() => setReinspectModal(true)} className="bg-amber-700 hover:bg-amber-800 text-white shrink-0 text-xs gap-1.5">
              <RotateCcw className="h-3.5 w-3.5" /> Conduct QA Re-inspection
            </Button>
          )}
        </div>
      )}

      {rawDel.isReinspection && (
        <div className="flex gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-900">
          <ShieldCheck className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-xs">
            <p className="font-semibold text-blue-950">QA Re-inspection Conducted (Attempt #{rawDel.reinspectionCount || 1})</p>
            <p className="mt-0.5">Decision: <strong className="uppercase">{rawDel.reinspectionDecision || rawDel.qaDecision}</strong> · Compliance Score: {rawDel.qaComplianceScore}%</p>
            {rawDel.qaNotes && <p className="text-blue-800 font-mono mt-0.5">{rawDel.qaNotes}</p>}
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

      {/* Physical Consignment Receipt Breakdown — Process Book §8 Step 53-55 */}
      <Card className="border border-border/80 shadow-sm">
        <CardHeader className="pb-3 bg-muted/20 border-b flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <PackageCheck className="h-4 w-4 text-primary" /> Physical Consignment Receipt Breakdown
            </CardTitle>
            <CardDescription className="text-xs">
              Physical inventory verification logged at consignee hospital site upon truck unloading
            </CardDescription>
          </div>
          {isConsignee && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs border-primary/40 text-primary hover:bg-primary/5"
              onClick={() => setReceiptModal(true)}
            >
              Record / Update Physical Receipt
            </Button>
          )}
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3 text-center">
            <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/50">
              <p className="text-[10px] text-slate-500 uppercase font-semibold">Dispatched</p>
              <p className="text-base font-bold font-mono text-slate-900 mt-0.5">{delivery.quantity}</p>
            </div>
            <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/50">
              <p className="text-[10px] text-slate-500 uppercase font-semibold">Received</p>
              <p className="text-base font-bold font-mono text-slate-900 mt-0.5">{rawDel.receivedQty ?? delivery.quantity}</p>
            </div>
            <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/50">
              <p className="text-[10px] text-slate-500 uppercase font-semibold">Accepted</p>
              <p className="text-base font-bold font-mono text-slate-900 mt-0.5">{rawDel.acceptedQty ?? (delivery.status === "accepted" ? delivery.quantity : 0)}</p>
            </div>
            <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/50">
              <p className="text-[10px] text-slate-500 uppercase font-semibold">Damaged</p>
              <p className="text-base font-bold font-mono text-slate-900 mt-0.5">{rawDel.damagedQty ?? 0}</p>
            </div>
            <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/50">
              <p className="text-[10px] text-slate-500 uppercase font-semibold">Shortage</p>
              <p className="text-base font-bold font-mono text-slate-900 mt-0.5">{rawDel.shortageQty ?? 0}</p>
            </div>
            <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/50">
              <p className="text-[10px] text-slate-500 uppercase font-semibold">Rejected</p>
              <p className="text-base font-bold font-mono text-slate-900 mt-0.5">{rawDel.rejectedQty ?? 0}</p>
            </div>
            <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/50">
              <p className="text-[10px] text-slate-500 uppercase font-semibold">Returned</p>
              <p className="text-base font-bold font-mono text-slate-900 mt-0.5">{rawDel.returnedQty ?? 0}</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between text-xs text-muted-foreground pt-2 border-t">
            <span>Received By: <strong className="text-foreground">{rawDel.receivedBy || "Consignee Store Officer"}</strong></span>
            <span>Condition: <strong className="text-foreground capitalize">{rawDel.condition || "pending_inspection"}</strong></span>
            <span>Site Receipt Date: <strong className="text-foreground">{delivery.deliveredDate ? format(new Date(delivery.deliveredDate), "dd MMM yyyy") : "Pending"}</strong></span>
          </div>
        </CardContent>
      </Card>

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
            <div className="flex items-center gap-2">
              {!rawDel.deliveryCertUploaded && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs border-blue-300 text-blue-800"
                  onClick={() => setDccUploadModal(true)}
                >
                  <FileUp className="h-3 w-3 mr-1" /> Upload DCC
                </Button>
              )}
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
            </div>
          </CardHeader>
          <CardContent className="space-y-2.5 pt-4">
            <DR label="QA Compliance Score" value={rawDel.qaComplianceScore != null ? `${rawDel.qaComplianceScore}%` : `${computedScore}% (In Evaluation)`} />
            <DR label="QA Decision" value={rawDel.qaDecision ? rawDel.qaDecision.toUpperCase() : "PENDING INSPECTION"} />
            
            <div className="py-2.5 px-3 bg-slate-50 border rounded-lg space-y-2 mt-2 mb-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground font-semibold">DCC Upload Status:</span>
                <span className="font-bold">{dccStatusText}</span>
              </div>
              {rawDel.deliveryCertUploaded && rawDel.deliveryCertDate && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Uploaded File:</span>
                  <span className="font-mono">{rawDel.deliveryCertFilename || "DCC_Signed.pdf"} ({format(new Date(rawDel.deliveryCertDate), "dd MMM yyyy")})</span>
                </div>
              )}
              {!rawDel.deliveryCertUploaded && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">SLA Countdown:</span>
                  <span className={`font-bold ${dccOverdue ? "text-red-600" : "text-amber-600"}`}>
                    {dccOverdue ? "Overdue" : `${Math.max(0, 7 - daysSinceDel)} days remaining`}
                  </span>
                </div>
              )}

              {/* Physical DCC Verification (Steps 56-57) */}
              <div className="pt-2 border-t flex items-center justify-between text-xs">
                <div>
                  <span className="text-muted-foreground font-semibold">DCC Verification: </span>
                  {rawDel.dccVerified ? (
                    <Badge variant="outline" className="ml-1 bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold text-[10px]">
                      Verified by {rawDel.dccVerifiedBy || "Consignee Officer"}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="ml-1 bg-amber-50 text-amber-800 border-amber-300 text-[10px]">
                      Pending Physical Verification
                    </Badge>
                  )}
                </div>
                {!rawDel.dccVerified && rawDel.deliveryCertUploaded && isConsignee && (
                  <Button
                    size="sm"
                    className="h-6 text-[10px] bg-emerald-700 hover:bg-emerald-800 text-white"
                    onClick={() => setDccVerifyModal(true)}
                  >
                    Verify DCC
                  </Button>
                )}
              </div>
            </div>

            <DR label="Mandatory Docs Verified" value={docsOk ? "Verified" : "Pending Upload"} />
            <DR label="Acceptance Certificate" value={rawDel.acceptanceCertificateIssued ? "Issued" : "Pending Final Sign-off"} />
            <DR label="Warranty Coverage" value={rawDel.warrantyEndDate ? `Active until ${format(new Date(rawDel.warrantyEndDate), "dd MMM yyyy")}` : "12 Months (Starts on Acceptance)"} />
          </CardContent>
        </Card>
      </div>

      {/* Auto-Generated QA Inspection Checklist */}
      <Card className="border border-border/80 shadow-sm">
        <CardHeader className="pb-3 bg-muted/20 border-b flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" /> Auto-Generated QA Inspection Checklist
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
                    Conditional Acceptance triggers a formal 15-calendar-day vendor rectification notice.
                  </p>
                  <Button type="submit" disabled={qaSubmitting} size="sm">
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
                    Formal technical inspection, safety scoring, and QA determination are strictly recorded by the Consignee Hospital Joint Committee.
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
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rawDel.discrepancies.map((d: any, idx: number) => (
                  <tr key={idx} className="hover:bg-muted/30">
                    <td className="p-3 font-semibold uppercase text-slate-800">{d.type}</td>
                    <td className="p-3 text-foreground">{d.description}</td>
                    <td className="p-3 text-center font-bold font-mono">{d.quantity}</td>
                    <td className="p-3 uppercase text-muted-foreground">{d.actionRequired}</td>
                    <td className="p-3 text-center">
                      <Badge variant="outline" className="text-[10px] uppercase">
                        {d.resolutionStatus}
                      </Badge>
                    </td>
                    <td className="p-3 text-right">
                      {d.resolutionStatus !== "resolved" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 text-[10px] px-2 border-slate-300 text-slate-800 bg-white hover:bg-slate-50"
                          onClick={() => {
                            setResolveDiscModal({ index: idx, discrepancy: d });
                            setResolveNotes("Replacement units / balance supply verified and accepted on site.");
                          }}
                        >
                          Resolve (Step 30)
                        </Button>
                      ) : (
                        <span className="text-[10px] text-slate-500 font-mono">Resolved</span>
                      )}
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
                <Button size="sm" onClick={handleMarkDelivered} disabled={updateDelivery.isPending} className="w-full text-xs">
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
                  className="w-full text-xs"
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

      {/* Hospital Equipment Asset Registration & Warranty Activation (Process Book Steps 68-70) */}
      {(delivery.status === "accepted" || rawDel.qaDecision === "accepted") && (
        <Card className="border border-emerald-200 bg-emerald-50/30 shadow-sm">
          <CardHeader className="pb-3 bg-emerald-100/40 border-b border-emerald-200 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-emerald-700" />
              <div>
                <CardTitle className="text-sm font-semibold text-emerald-950">
                  Hospital Equipment Asset Registration (TGMSIDC Digital Inventory)
                </CardTitle>
                <CardDescription className="text-xs text-emerald-800">
                  Statutory registration of physical serialized medical equipment in the TGMSIDC Equipment Master with unique asset barcode tags
                </CardDescription>
              </div>
            </div>
            {rawDel.equipmentRegistered ? (
              <Badge className="bg-emerald-700 text-white font-semibold text-xs">
                Asset Registered ✅
              </Badge>
            ) : (
              <Button
                size="sm"
                className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs gap-1.5"
                onClick={() => setAssetModal(true)}
              >
                <Tag className="h-3.5 w-3.5" /> Register Equipment Assets
              </Button>
            )}
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            {rawDel.equipmentRegistered ? (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-xs font-semibold text-emerald-900">Assigned Asset Tags:</span>
                  {(rawDel.registeredAssetTags && rawDel.registeredAssetTags.length > 0) ? (
                    rawDel.registeredAssetTags.map((tag: string) => (
                      <Badge key={tag} variant="outline" className="font-mono bg-white text-emerald-800 border-emerald-300 font-bold px-2 py-0.5 text-xs shadow-2xs">
                        {tag}
                      </Badge>
                    ))
                  ) : (
                    <Badge variant="outline" className="font-mono bg-white text-emerald-800 border-emerald-300 font-bold px-2 py-0.5 text-xs">
                      AST-2026-REGISTERED
                    </Badge>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs bg-white p-3 rounded-lg border border-emerald-200">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Serial Numbers</span>
                    <span className="font-mono font-medium">{rawDel.serialNumbers?.join(", ") || "Recorded in Master"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Installation &amp; Commissioning</span>
                    <span className="font-medium text-emerald-800">Completed &amp; Active Clinical Service</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Warranty Coverage</span>
                    <span className="font-medium text-emerald-800">
                      {rawDel.warrantyEndDate ? `Active until ${format(new Date(rawDel.warrantyEndDate), "dd MMM yyyy")}` : "12 Months Comprehensive"}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-4 p-3 bg-white rounded-lg border border-emerald-200 text-xs">
                <div>
                  <p className="font-semibold text-emerald-950">Equipment Acceptance Finalized</p>
                  <p className="text-muted-foreground mt-0.5">
                    Click "Register Equipment Assets" to assign TGMSIDC tracking identifiers (AST-2026-XXXXX), record hospital department / ward placement, and formally register warranty coverage in the central database.
                  </p>
                </div>
                <Button
                  size="sm"
                  className="bg-emerald-700 hover:bg-emerald-800 text-white shrink-0 text-xs gap-1.5"
                  onClick={() => setAssetModal(true)}
                >
                  <Tag className="h-3.5 w-3.5" /> Register Now
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
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
                Record damaged items, shortages, or specification deviations with photo evidence.
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
              <Button type="submit" disabled={discSubmitting}>
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
            <Button className="gap-1.5" onClick={() => window.print()}>
              <Printer className="h-4 w-4" /> Print Official Certificate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DCC Physical Verification Dialog (Steps 56-57) */}
      <Dialog open={dccVerifyModal} onOpenChange={setDccVerifyModal}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleVerifyDCC}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-emerald-600" />
                Physical DCC Verification &amp; Clearance
              </DialogTitle>
              <DialogDescription className="text-xs">
                Verify the Delivery Completion Certificate against physically verified hospital stock challan.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4 text-xs">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Verifying Consignee Officer *</Label>
                <Input
                  value={dccOfficerName}
                  onChange={(e) => setDccOfficerName(e.target.value)}
                  placeholder="e.g. Dr. K. Ramesh, Store In-charge"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Verification Remarks / Stamped Seal Ref *</Label>
                <Textarea
                  value={dccRemarks}
                  onChange={(e) => setDccRemarks(e.target.value)}
                  placeholder="e.g. Verified physically against consignment seal, serial numbers match invoice..."
                  rows={3}
                  required
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDccVerifyModal(false)}>Cancel</Button>
              <Button type="submit" disabled={isVerifyingDcc}>
                {isVerifyingDcc ? "Verifying..." : "Confirm DCC Verification"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DCC Upload Dialog */}
      <Dialog open={dccUploadModal} onOpenChange={setDccUploadModal}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleUploadDCC}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileUp className="h-5 w-5 text-blue-600" />
                Upload Delivery Completion Certificate (DCC)
              </DialogTitle>
              <DialogDescription className="text-xs">
                Upload signed &amp; stamped DCC copy received from the consignee hospital (7-day SLA).
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4 text-xs">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">DCC Scanned File Name *</Label>
                <Input
                  value={dccFilename}
                  onChange={(e) => setDccFilename(e.target.value)}
                  placeholder="DCC_Hospital_Stamped.pdf"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Signatory Officer *</Label>
                  <Input
                    value={dccSignerName}
                    onChange={(e) => setDccSignerName(e.target.value)}
                    placeholder="Dr. S. Reddy"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Designation *</Label>
                  <Input
                    value={dccSignerDesig}
                    onChange={(e) => setDccSignerDesig(e.target.value)}
                    placeholder="Medical Superintendent"
                    required
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDccUploadModal(false)}>Cancel</Button>
              <Button type="submit" disabled={isUploadingDcc}>
                {isUploadingDcc ? "Uploading..." : "Upload DCC"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Physical Consignment Receipt Breakdown Dialog (Steps 53-55) */}
      <Dialog open={receiptModal} onOpenChange={setReceiptModal}>
        <DialogContent className="max-w-lg">
          <form onSubmit={handleRecordReceipt}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <PackageCheck className="h-5 w-5 text-primary" />
                Record Hospital Physical Consignment Receipt
              </DialogTitle>
              <DialogDescription className="text-xs">
                Log exact quantities received, accepted, damaged, missing, or rejected at site.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3 text-xs max-h-[70vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Physical Received Qty *</Label>
                  <Input
                    type="number"
                    min="0"
                    value={receiptForm.receivedQty}
                    onChange={(e) => setReceiptForm(f => ({ ...f, receivedQty: Number(e.target.value) || 0 }))}
                    className="h-8 text-xs font-mono"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Accepted Qty *</Label>
                  <Input
                    type="number"
                    min="0"
                    value={receiptForm.acceptedQty}
                    onChange={(e) => setReceiptForm(f => ({ ...f, acceptedQty: Number(e.target.value) || 0 }))}
                    className="h-8 text-xs font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div className="space-y-1">
                  <Label className="text-[11px] font-medium text-amber-700">Damaged Qty</Label>
                  <Input
                    type="number"
                    min="0"
                    value={receiptForm.damagedQty}
                    onChange={(e) => setReceiptForm(f => ({ ...f, damagedQty: Number(e.target.value) || 0 }))}
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-medium text-purple-700">Shortage Qty</Label>
                  <Input
                    type="number"
                    min="0"
                    value={receiptForm.shortageQty}
                    onChange={(e) => setReceiptForm(f => ({ ...f, shortageQty: Number(e.target.value) || 0 }))}
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-medium text-red-700">Rejected Qty</Label>
                  <Input
                    type="number"
                    min="0"
                    value={receiptForm.rejectedQty}
                    onChange={(e) => setReceiptForm(f => ({ ...f, rejectedQty: Number(e.target.value) || 0 }))}
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-medium text-orange-700">Returned Qty</Label>
                  <Input
                    type="number"
                    min="0"
                    value={receiptForm.returnedQty}
                    onChange={(e) => setReceiptForm(f => ({ ...f, returnedQty: Number(e.target.value) || 0 }))}
                    className="h-8 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Received By (Store Officer) *</Label>
                  <Input
                    value={receiptForm.receivedBy}
                    onChange={(e) => setReceiptForm(f => ({ ...f, receivedBy: e.target.value }))}
                    className="h-8 text-xs"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Packaging Condition</Label>
                  <Select
                    value={receiptForm.condition}
                    onValueChange={(v) => setReceiptForm(f => ({ ...f, condition: v }))}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="good">Intact / Good Condition</SelectItem>
                      <SelectItem value="damaged">Outer Packaging Damaged</SelectItem>
                      <SelectItem value="shortage">Partial Shortage</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Equipment Serial Numbers (Comma-separated)</Label>
                <Input
                  value={receiptForm.serialNumbersStr}
                  onChange={(e) => setReceiptForm(f => ({ ...f, serialNumbersStr: e.target.value }))}
                  placeholder="e.g. SN-88019-1, SN-88019-2"
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Inspection Remarks</Label>
                <Textarea
                  value={receiptForm.remarks}
                  onChange={(e) => setReceiptForm(f => ({ ...f, remarks: e.target.value }))}
                  placeholder="Observations on seals, packaging, transport..."
                  rows={2}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setReceiptModal(false)}>Cancel</Button>
              <Button type="submit" disabled={isRecordingReceipt}>
                {isRecordingReceipt ? "Saving..." : "Save Physical Receipt"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* QA Re-inspection Dialog (Steps 64-67) */}
      <Dialog open={reinspectModal} onOpenChange={setReinspectModal}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleQAReinspection}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <RotateCcw className="h-5 w-5 text-amber-700" />
                QA Re-inspection Following Vendor Rectification
              </DialogTitle>
              <DialogDescription className="text-xs">
                Assess whether the vendor has rectified previously observed defects within the 15-day SLA.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Re-inspection Determination *</Label>
                  <Select
                    value={reinspectDecision}
                    onValueChange={(v: any) => setReinspectDecision(v)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="accepted">Accepted (Rectified 100%)</SelectItem>
                      <SelectItem value="rejected">Rejected (Failed Rectification)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Compliance Score (%) *</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={reinspectScore}
                    onChange={(e) => setReinspectScore(Number(e.target.value) || 0)}
                    className="h-8 text-xs font-mono"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Re-inspecting Committee / Officer *</Label>
                <Input
                  value={reinspectOfficer}
                  onChange={(e) => setReinspectOfficer(e.target.value)}
                  className="h-8 text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Re-inspection Findings &amp; Rectification Report *</Label>
                <Textarea
                  value={reinspectNotes}
                  onChange={(e) => setReinspectNotes(e.target.value)}
                  placeholder="Detail parts replaced, tests rerun, calibration validated..."
                  rows={3}
                  required
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setReinspectModal(false)}>Cancel</Button>
              <Button type="submit" disabled={isReinspecting} className={reinspectDecision === "accepted" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-red-600 hover:bg-red-700 text-white"}>
                {isReinspecting ? "Submitting..." : `Submit Re-inspection: ${reinspectDecision.toUpperCase()}`}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Equipment Asset Registration Dialog (Steps 68-70) */}
      <Dialog open={assetModal} onOpenChange={setAssetModal}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleRegisterEquipment}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5 text-emerald-700" />
                Register Equipment Assets &amp; Issue Asset Tags
              </DialogTitle>
              <DialogDescription className="text-xs">
                Creates AST-2026-XXXXX asset records in the TGMSIDC Equipment Master and hospital inventory.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4 text-xs">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Hospital Department / Ward *</Label>
                <Input
                  value={assetDept}
                  onChange={(e) => setAssetDept(e.target.value)}
                  placeholder="e.g. ICU / Radiology / OT Block"
                  className="h-8 text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Location / Room Number *</Label>
                <Input
                  value={assetLocation}
                  onChange={(e) => setAssetLocation(e.target.value)}
                  placeholder="e.g. Ground Floor, Trauma Care Unit 3"
                  className="h-8 text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Make / Manufacturer</Label>
                  <Input
                    value={assetMake}
                    onChange={(e) => setAssetMake(e.target.value)}
                    placeholder={delivery.vendorName || "OEM"}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Model Name / Number</Label>
                  <Input
                    value={assetModel}
                    onChange={(e) => setAssetModel(e.target.value)}
                    placeholder="e.g. Elite-Pro 500"
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Serial Numbers (Comma-separated)</Label>
                <Input
                  value={assetSerials}
                  onChange={(e) => setAssetSerials(e.target.value)}
                  placeholder="Leave empty for auto-generated SN"
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAssetModal(false)}>Cancel</Button>
              <Button type="submit" disabled={isRegisteringAsset}>
                {isRegisteringAsset ? "Registering..." : "Register Assets & Activate Warranty"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Resolve Discrepancy Modal (Step 30: Vendor / Hospital Consignee) ── */}
      <Dialog open={!!resolveDiscModal} onOpenChange={(open) => { if (!open) setResolveDiscModal(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Resolve Delivery Discrepancy (Step 30)
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              Record rectification, replacement of damaged units, or delivery of shortage balance as verified by the hospital consignee.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleResolveDiscrepancy} className="space-y-3 py-2">
            <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-900 uppercase">
                  Discrepancy Type: {resolveDiscModal?.discrepancy?.type}
                </span>
                <span className="font-mono font-bold text-slate-700">
                  Qty: {resolveDiscModal?.discrepancy?.quantity}
                </span>
              </div>
              <p className="text-slate-600">{resolveDiscModal?.discrepancy?.description}</p>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Verified By *</Label>
              <Input
                value={resolvedBy}
                onChange={(e) => setResolvedBy(e.target.value)}
                placeholder="Consignee Store Officer / Joint Committee"
                className="h-8 text-xs"
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Resolution &amp; Verification Remarks *</Label>
              <Textarea
                value={resolveNotes}
                onChange={(e) => setResolveNotes(e.target.value)}
                placeholder="e.g. Vendor supplied replacement units with serial numbers verified on-site by consignee."
                rows={3}
                className="text-xs resize-none"
                required
              />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setResolveDiscModal(null)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isResolvingDisc}
                className="text-xs"
              >
                {isResolvingDisc ? "Resolving..." : "Confirm Discrepancy Resolved (Step 30)"}
              </Button>
            </DialogFooter>
          </form>
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
