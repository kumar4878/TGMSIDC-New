import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useLocation, Link } from "wouter";
import {
  useCreateIndent, useListInstitutions, useListEquipment, useListIndents,
  type CreateIndentBody, type Equipment,
} from "@/lib/api-hooks";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Upload, FileText, X, Plus, CheckCircle2,
  ChevronDown, ChevronUp, IndianRupee, AlertCircle, Package, ChevronsUpDown, Check,
  PackageCheck, Save, Send, Printer, Download, Clock, User, Building2, CalendarDays,
  FileCheck, History, Shield, Sparkles, Paperclip, ListChecks,
  ChevronRight, Hash, Layers, Eye, Trash2, Copy, Info, CircleDot, AlertTriangle,
  Zap, Activity, Wrench, RefreshCw, ExternalLink, Loader2,
} from "lucide-react";
import { getProductSpecs } from "@/lib/productSpecs";
import { ProductSpecSheet } from "@/components/ProductSpecSheet";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

/* ─────────────────────── HELPERS ─────────────────────── */

export interface UploadedDoc {
  name: string;
  size: string;
  type: string;
  dataUrl?: string;
}

/** Get specs for an equipment object */
function getSpecsForEquipment(eq: Equipment | undefined) {
  if (!eq) return null;
  return getProductSpecs(eq.equipmentCode || eq.name || eq.id);
}

/** Get realistic estimated unit benchmark rate for equipment */
function getRealisticRate(eq: Equipment | undefined): number {
  if (!eq) return 0;
  if (eq.estimatedUnitCost && eq.estimatedUnitCost > 0) return eq.estimatedUnitCost;
  const spec = getSpecsForEquipment(eq);
  return spec?.estimatedUnitRate || 0;
}

interface LineItemDraft {
  localId: string;
  equipmentId: string;
  qty: string;
  unit: string;
  unitPrice: string;
  gstRate: string;
  justification: string;
  specOpen: boolean;
  searchOpen: boolean;
}

let _counter = 0;
const newLineItem = (): LineItemDraft => ({
  localId: `li-${++_counter}`,
  equipmentId: "",
  qty: "1",
  unit: "No.",
  unitPrice: "",
  gstRate: "12",
  justification: "",
  specOpen: false,
  searchOpen: false,
});

const UNIT_OPTIONS = ["No.", "Lot", "Set", "Box", "Kg", "Litre", "Sq.m", "Running m"];

// Unique category colours
const CAT_COLORS: Record<string, { text: string; bg: string; border: string }> = {
  "Radiology":          { text: "text-blue-700",   bg: "bg-blue-50",   border: "border-blue-300" },
  "Laboratory":         { text: "text-emerald-700",bg: "bg-emerald-50",border: "border-emerald-300" },
  "Patient Monitoring": { text: "text-violet-700", bg: "bg-violet-50", border: "border-violet-300" },
  "Critical Care":      { text: "text-red-700",    bg: "bg-red-50",    border: "border-red-300" },
  "Emergency":          { text: "text-amber-700",  bg: "bg-amber-50",  border: "border-amber-300" },
  "CSSD":               { text: "text-teal-700",   bg: "bg-teal-50",   border: "border-teal-300" },
  "OT Equipment":       { text: "text-indigo-700", bg: "bg-indigo-50", border: "border-indigo-300" },
};
const defaultCatColor = { text: "text-slate-700", bg: "bg-slate-50", border: "border-slate-300" };
function catColor(cat: string) { return CAT_COLORS[cat] ?? defaultCatColor; }

const WORKFLOW_STEPS = [
  { key: "draft", label: "Draft", icon: FileText },
  { key: "submitted", label: "Submitted", icon: Send },
  { key: "under_review", label: "Under Review", icon: Eye },
  { key: "approved", label: "Approved", icon: CheckCircle2 },
  { key: "po_issued", label: "PO Issued", icon: FileCheck },
  { key: "delivered", label: "Delivered", icon: PackageCheck },
  { key: "completed", label: "Completed", icon: Shield },
];

const formatINR = (n: number) =>
  n === 0 ? "₹0" :
  n >= 1_00_00_000 ? `₹${(n / 1_00_00_000).toFixed(2)} Cr` :
  n >= 1_00_000 ? `₹${(n / 1_00_000).toFixed(2)} L` :
  `₹${n.toLocaleString("en-IN")}`;

const formatINRFull = (n: number) =>
  `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/* ═══════════════════════ COMPONENT ═══════════════════════ */

export default function IndentNew() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: institutions } = useListInstitutions();
  const { data: equipment } = useListEquipment();
  const { data: indents } = useListIndents();
  const createIndent = useCreateIndent();
  const scanRef = useRef<HTMLInputElement>(null);
  const attachRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState("general");
  const [sidebarTab, setSidebarTab] = useState("activity");
  const [catFilter, setCatFilter] = useState("All");
  const [isSavingDraft, setIsSavingDraft] = useState(false);

  // Build unique categories from actual equipment data
  const eqCategories = useMemo(() => {
    const cats = [...new Set((equipment ?? []).map(e => e.category))].sort();
    return ["All", ...cats];
  }, [equipment]);

  const [form, setForm] = useState({
    facilityId: "",
    urgency: "routine",
    budgetHead: "",
    digitisedBy: "DEO User",
    remarks: "",
    indentType: "letter",
    indentRefNumber: "",
    indentDate: new Date().toISOString().split("T")[0],
    financialYear: "2025-26",
    accountHeadName: "",
    programmeName: "",
    fundingSourceName: "",
    fundSanctionedAmount: "",
    fundSanctionDate: "",
    fundDepositedAmount: "",
    chequeUtrNo: "",
    fundDepositDate: "",
    contactPerson: "",
    contactPhone: "",
    isEmergency: false,
  });

  const [lineItems, setLineItems] = useState<LineItemDraft[]>([newLineItem()]);
  const [scanFile, setScanFile] = useState<UploadedDoc | null>(null);
  const [attachments, setAttachments] = useState<UploadedDoc[]>([]);
  const [viewingDoc, setViewingDoc] = useState<UploadedDoc | null>(null);
  const [isDraggingScan, setIsDraggingScan] = useState(false);
  const [isDraggingAttach, setIsDraggingAttach] = useState(false);
  const todayStr = new Date().toISOString().split("T")[0];
  const [signatories, setSignatories] = useState([
    { name: "", designation: "Superintendent / Medical Officer", date: todayStr },
    { name: "", designation: "Biomedical Engineer", date: todayStr },
  ]);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [createdIndentId, setCreatedIndentId] = useState<string | null>(null);

  // Auto-populate digitisedBy for logged in user, and facility ONLY if user has a non-generic designated hospital (not DEO)
  useEffect(() => {
    if (user) {
      setForm(prev => {
        let facId = prev.facilityId;
        // DEO is generic and can select any hospital freely from the dropdown
        if (!facId && user.facilityId && user.role !== "deo") {
          const match = (institutions ?? []).find(i =>
            String(i.id) === String(user.facilityId) ||
            i.dmeInstitutionId === String(user.facilityId) ||
            i.institutionCode === String(user.facilityId) ||
            (user.facilityName && i.name.toLowerCase() === user.facilityName.toLowerCase())
          );
          facId = match ? String(match.id) : String(user.facilityId);
        }
        return {
          ...prev,
          facilityId: facId,
          digitisedBy: user.fullName || "DEO User",
        };
      });
    }
  }, [user, institutions]);

  /* helpers: find equipment by id */
  const findEq = useCallback((id: string) => (equipment ?? []).find(e => e.id === id), [equipment]);

  /* File handlers with Base64 Data URL for real preview and verification */
  function processScanFile(file: File) {
    const size = file.size > 1024 * 1024 ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` : `${Math.round(file.size / 1024)} KB`;
    const reader = new FileReader();
    reader.onload = () => {
      setScanFile({
        name: file.name,
        size,
        type: file.type || (file.name.endsWith(".pdf") ? "application/pdf" : "image/jpeg"),
        dataUrl: reader.result as string,
      });
      toast({ title: "📄 Scan Copy Uploaded", description: `${file.name} is ready for preview.` });
    };
    reader.readAsDataURL(file);
  }

  function handleScanUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      processScanFile(file);
    }
    e.target.value = "";
  }

  function processAttachmentFiles(files: File[]) {
    if (!files.length) return;
    files.forEach(file => {
      const size = file.size > 1024 * 1024 ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` : `${Math.round(file.size / 1024)} KB`;
      const reader = new FileReader();
      reader.onload = () => {
        setAttachments(prev => [
          ...prev,
          {
            name: file.name,
            size,
            type: file.type || "Reference Document",
            dataUrl: reader.result as string,
          }
        ]);
      };
      reader.readAsDataURL(file);
    });
    toast({ title: "📎 Document Added", description: `${files.length} supporting document(s) uploaded.` });
  }

  function handleAttachment(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) {
      processAttachmentFiles(files);
    }
    e.target.value = "";
  }

  /* Signatories */
  function addSignatory() { setSignatories(p => [...p, { name: "", designation: "", date: todayStr }]); }
  function updateSignatory(i: number, field: string, val: string) { setSignatories(p => p.map((s, idx) => idx === i ? { ...s, [field]: val } : s)); }
  function removeSignatory(i: number) { setSignatories(p => p.filter((_, idx) => idx !== i)); }

  /* Line item CRUD */
  function updateItem(localId: string, patch: Partial<LineItemDraft>) {
    setLineItems(prev => prev.map(li => {
      if (li.localId !== localId) return li;
      const updated = { ...li, ...patch };
      // Auto-fill price & GST when equipment selected with realistic benchmark rate
      if (patch.equipmentId && patch.equipmentId !== li.equipmentId) {
        const eq = findEq(patch.equipmentId);
        if (eq) {
          const rate = getRealisticRate(eq);
          updated.unitPrice = rate > 0 ? String(rate) : (updated.unitPrice || "0");
          updated.gstRate = String(eq.gstRate ?? 12);
          if (!updated.unit) updated.unit = "No.";
        }
      }
      return updated;
    }));
  }
  function removeItem(id: string) { setLineItems(prev => prev.filter(li => li.localId !== id)); }
  function addItem() { setLineItems(prev => [...prev, newLineItem()]); }
  function duplicateItem(id: string) {
    const src = lineItems.find(li => li.localId === id);
    if (src) setLineItems(prev => [...prev, { ...src, localId: `li-${++_counter}`, searchOpen: false, specOpen: false }]);
  }

  const [multiSelectOpen, setMultiSelectOpen] = useState(false);
  const [selectedMultiEqIds, setSelectedMultiEqIds] = useState<string[]>([]);
  const [multiSearchFilter, setMultiSearchFilter] = useState("");
  const [multiCategoryFilter, setMultiCategoryFilter] = useState("All");

  function toggleMultiEq(eqId: string) {
    setSelectedMultiEqIds(prev =>
      prev.includes(eqId) ? prev.filter(id => id !== eqId) : [...prev, eqId]
    );
  }

  function addBulkEquipment() {
    if (selectedMultiEqIds.length === 0) return;
    const newItems: LineItemDraft[] = selectedMultiEqIds.map(id => {
      const eq = findEq(id);
      const item = newLineItem();
      item.equipmentId = id;
      const rate = getRealisticRate(eq);
      if (rate > 0) item.unitPrice = String(rate);
      if (eq?.gstRate) item.gstRate = String(eq.gstRate);
      item.unit = "No.";
      return item;
    });

    setLineItems(prev => {
      if (prev.length === 1 && !prev[0].equipmentId) {
        return newItems;
      }
      return [...prev, ...newItems];
    });

    setSelectedMultiEqIds([]);
    setMultiSelectOpen(false);
    toast({
      title: "✅ Products Added",
      description: `Added ${newItems.length} equipment items with benchmark pricing.`,
    });
  }

  /* Price calculations */
  function getUnitPrice(li: LineItemDraft): number { return parseFloat(li.unitPrice) || 0; }
  function getGstRate(li: LineItemDraft): number { return parseFloat(li.gstRate) || 0; }
  function getSubtotal(li: LineItemDraft): number { return getUnitPrice(li) * (parseInt(li.qty) || 0); }
  function getGstAmt(li: LineItemDraft): number { return (getSubtotal(li) * getGstRate(li)) / 100; }
  function getTotal(li: LineItemDraft): number { return getSubtotal(li) + getGstAmt(li); }

  const completeItems = lineItems.filter(li => li.equipmentId && (parseInt(li.qty) || 0) > 0);
  const grandSubtotal = completeItems.reduce((s, li) => s + getSubtotal(li), 0);
  const grandGst = completeItems.reduce((s, li) => s + getGstAmt(li), 0);
  const grandTotal = grandSubtotal + grandGst;
  const isValid = form.facilityId && completeItems.length > 0;

  const selectedFacility = useMemo(() =>
    (institutions ?? []).find(i => String(i.id) === form.facilityId), [institutions, form.facilityId]);

  const duplicateIndents = useMemo(() => {
    if (!form.facilityId || completeItems.length === 0 || !indents) return [];
    const duplicates = [];
    for (const item of completeItems) {
      if (!item.equipmentId) continue;
      const found = indents.find(i => 
        String(i.facilityId) === form.facilityId &&
        i.financialYear === form.financialYear &&
        i.lineItems?.some(li => li.equipmentId === item.equipmentId)
      );
      if (found) {
        const eq = findEq(item.equipmentId);
        if (eq) duplicates.push({ eqName: eq.name, indentNumber: found.indentNumber || found.id });
      }
    }
    return Array.from(new Map(duplicates.map(d => [d.eqName, d])).values());
  }, [form.facilityId, form.financialYear, completeItems, indents, findEq]);

  /* Realistic draft save handler (2 to 3 seconds simulation) */
  function handleSaveDraft() {
    setIsSavingDraft(true);
    setTimeout(() => {
      setIsSavingDraft(false);
      toast({
        title: "📝 Draft Saved",
        description: "Your procurement indent draft has been successfully recorded.",
      });
    }, 2200);
  }

  /* Submit */
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.facilityId) {
      toast({
        title: "Facility Required",
        description: "Please select a requesting facility before submitting the indent.",
        variant: "destructive",
      });
      setActiveTab("general");
      return;
    }
    if (completeItems.length === 0) {
      toast({
        title: "Equipment Line Item Required",
        description: "Please add at least one equipment item with valid quantity in the 'Line Items & Equipment' tab.",
        variant: "destructive",
      });
      setActiveTab("items");
      return;
    }

    const firstItem = completeItems[0];
    const body: CreateIndentBody = {
      facilityId: form.facilityId,
      equipmentId: firstItem.equipmentId,
      estimatedValue: grandTotal,
      quantity: completeItems.reduce((s, li) => s + (parseInt(li.qty) || 0), 0),
      technicalRequirements: completeItems.map(li => {
        const eq = findEq(li.equipmentId);
        return `${eq?.name ?? "?"} × ${li.qty} ${li.unit}: ${li.justification || eq?.specifications || "As per spec."}`;
      }).join("\n"),
      digitisedBy: form.digitisedBy || user?.fullName || user?.username || "Data Entry Operator",
      createdByUserId: user?.id,
      budgetHead: form.budgetHead || undefined,
      urgency: form.urgency,
      remarks: form.remarks || undefined,
      indentType: form.indentType,
      indentRefNumber: form.indentRefNumber || undefined,
      indentDate: form.indentDate ? new Date(form.indentDate).toISOString() : undefined,
      financialYear: form.financialYear || undefined,
      accountHeadName: form.accountHeadName || undefined,
      programmeName: form.programmeName || undefined,
      fundingSourceName: form.fundingSourceName || undefined,
      fundSanctionedAmount: form.fundSanctionedAmount ? Number(form.fundSanctionedAmount) : undefined,
      fundSanctionDate: form.fundSanctionDate ? new Date(form.fundSanctionDate).toISOString() : undefined,
      fundDepositedAmount: form.fundDepositedAmount ? Number(form.fundDepositedAmount) : undefined,
      chequeUtrNo: form.chequeUtrNo || undefined,
      fundDepositDate: form.fundDepositDate ? new Date(form.fundDepositDate).toISOString() : undefined,
      contactPerson: form.contactPerson || selectedFacility?.contactPerson || undefined,
      contactPhone: form.contactPhone || selectedFacility?.contactPhone || undefined,
      signatories: signatories.filter(s => s.name.trim()),
      attachments: attachments.map(a => ({
        name: a.name,
        size: a.size,
        type: a.type || "Reference Document",
        dataUrl: a.dataUrl,
        uploadDate: new Date().toISOString(),
      })),
      scannedCopyFilename: scanFile?.name || undefined,
      scannedCopyDataUrl: scanFile?.dataUrl || undefined,
      lineItems: completeItems.map(li => {
        const eq = findEq(li.equipmentId);
        return {
          category: eq?.category ?? "Medical Equipment",
          equipmentId: li.equipmentId,
          equipmentName: eq?.name ?? "",
          qty: parseInt(li.qty) || 1,
          requestedQty: parseInt(li.qty) || 1,
          unit: li.unit || "No.",
          unitOfMeasure: li.unit || "No.",
          estimatedUnitRate: getUnitPrice(li),
          estimatedUnitCost: getUnitPrice(li),
          justification: li.justification || "As per technical specification.",
          specifications: li.justification || eq?.specifications || "As per technical specification.",
        };
      }),
    };
    createIndent.mutate({ data: body }, {
      onSuccess: (indent) => {
        queryClient.invalidateQueries({ queryKey: ["/indents"] });
        setCreatedIndentId(indent.id);
        setShowSuccessDialog(true);
      },
      onError: (err: any) => {
        toast({
          title: "Indent Submission Failed",
          description: err?.message || "An error occurred while saving the indent to the database. Please check all fields.",
          variant: "destructive",
        });
      },
    });
  }

  const currentDate = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  /* ═══════════════════════════ RENDER ═══════════════════════════ */
  return (
    <div className="flex gap-0 h-[calc(100dvh-65px)] -m-4 sm:-m-6">
      {/* ══════════ MAIN PANEL ══════════ */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* ── STICKY HEADER ── */}
        <div className="sticky top-0 z-30 bg-gradient-to-b from-white via-white to-white/95 border-b shadow-[0_1px_6px_rgba(0,0,0,0.06)]">
          {/* Breadcrumb */}
          <div className="px-6 pt-3 pb-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Link href="/"><span className="hover:text-primary cursor-pointer transition-colors">Home</span></Link>
            <ChevronRight className="h-3 w-3 opacity-40" />
            <Link href="/indents"><span className="hover:text-primary cursor-pointer transition-colors">Indents</span></Link>
            <ChevronRight className="h-3 w-3 opacity-40" />
            <span className="text-foreground font-semibold">New Indent</span>
          </div>

          {/* Title Row */}
          <div className="px-6 pb-2.5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <Link href="/indents">
                  <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl shrink-0 mt-0.5 shadow-sm">
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                </Link>
                <div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <h1 className="text-lg font-bold text-foreground tracking-tight">Create New Procurement Indent</h1>
                    <Badge className="bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 shadow-sm">Draft</Badge>
                    {form.isEmergency && (
                      <Badge className="bg-gradient-to-r from-red-500 to-red-600 text-white border-0 text-[10px] uppercase tracking-wider px-2.5 py-0.5">
                        <AlertTriangle className="h-3 w-3 mr-1" />Emergency
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" />{currentDate}</span>
                    <span className="flex items-center gap-1"><User className="h-3 w-3" />{form.digitisedBy}</span>
                    <span className="flex items-center gap-1"><Hash className="h-3 w-3" />FY {form.financialYear}</span>
                    {selectedFacility && <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{selectedFacility.name}</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8 rounded-lg shadow-sm" disabled={isSavingDraft || createIndent.isPending} onClick={handleSaveDraft}>
                  {isSavingDraft ? <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" /> : <Save className="h-3.5 w-3.5" />}
                  {isSavingDraft ? "Saving Draft…" : "Save Draft"}
                </Button>
                <Button size="sm" className="gap-1.5 text-xs h-8 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-md shadow-blue-200/50" disabled={createIndent.isPending || isSavingDraft} onClick={handleSubmit as any}>
                  {createIndent.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  {createIndent.isPending ? "Submitting to DB…" : "Submit for Approval"}
                </Button>
                <Separator orientation="vertical" className="h-5 mx-1" />
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg"><Printer className="h-3.5 w-3.5" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg"><Download className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          </div>

          {/* Workflow Timeline */}
          <div className="px-6 pb-3 overflow-x-auto">
            <div className="flex items-center gap-0 min-w-max">
              {WORKFLOW_STEPS.map((step, i) => {
                const Icon = step.icon;
                const isActive = i === 0;
                return (
                  <div key={step.key} className="flex items-center">
                    <div className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all",
                      isActive
                        ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white border-blue-600 shadow-md shadow-blue-200/60"
                        : "bg-gray-50 text-gray-400 border-gray-200"
                    )}>
                      <Icon className="h-3.5 w-3.5" />
                      {step.label}
                    </div>
                    {i < WORKFLOW_STEPS.length - 1 && <div className="w-8 h-[2px] mx-0.5 bg-gray-200" />}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── SCROLLABLE FORM ── */}
        <div className="flex-1 overflow-y-auto">
          <form onSubmit={handleSubmit} className="p-6 space-y-5 max-w-[1200px]">

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="bg-white border rounded-xl p-1 h-auto w-full justify-start gap-1 shadow-sm">
                {[
                  { val: "general", label: "General Information", icon: FileText, count: 0 },
                  { val: "items", label: "Line Items & Equipment", icon: Package, count: completeItems.length },
                  { val: "documents", label: "Documents", icon: Paperclip, count: (scanFile ? 1 : 0) + attachments.length },
                  { val: "workflow", label: "Workflow History", icon: History, count: 0 },
                ].map(tab => (
                  <TabsTrigger
                    key={tab.val}
                    value={tab.val}
                    className="gap-2 text-xs font-semibold data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-50 data-[state=active]:to-indigo-50 data-[state=active]:text-blue-700 data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-blue-200 rounded-lg px-4 py-2.5 transition-all"
                  >
                    <tab.icon className="h-3.5 w-3.5" />
                    {tab.label}
                    {tab.count > 0 && (
                      <span className="ml-1 h-5 min-w-[20px] flex items-center justify-center text-[10px] font-bold rounded-full bg-blue-600 text-white px-1.5">{tab.count}</span>
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>

              {/* ═══ TAB 1: GENERAL ═══ */}
              <TabsContent value="general" className="mt-5 space-y-5 animate-in fade-in-50 duration-300">
                {/* Facility & Urgency */}
                <Card className="shadow-md border-0 rounded-2xl bg-gradient-to-br from-white to-blue-50/20 ring-1 ring-black/[0.04]">
                  <CardHeader className="pb-3 px-6 pt-5">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-200/50">
                        <Building2 className="h-4.5 w-4.5 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-sm font-bold">Requesting Facility & Urgency</CardTitle>
                        <p className="text-[11px] text-muted-foreground mt-0.5">Select the institution and set urgency level</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="px-6 pb-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
                      {/* Column 1: Requesting Facility */}
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block h-5 leading-5">
                          Requesting Facility <span className="text-red-500">*</span>
                        </Label>
                        <Select value={form.facilityId} onValueChange={v => setForm({ ...form, facilityId: v })}>
                          <SelectTrigger className="h-11 rounded-xl border-border/70 shadow-sm bg-white hover:border-slate-400 transition-colors">
                            <SelectValue placeholder="Select facility…" />
                          </SelectTrigger>
                          <SelectContent className="max-h-72">
                            {(institutions ?? []).map(inst => (
                              <SelectItem key={inst.id} value={String(inst.id)}>
                                {inst.name} — {inst.district}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Column 2: Urgency Level */}
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block h-5 leading-5">
                          Urgency Level <span className="text-red-500">*</span>
                        </Label>
                        <Select value={form.urgency} onValueChange={v => setForm({ ...form, urgency: v })}>
                          <SelectTrigger className="h-11 rounded-xl border-border/70 shadow-sm bg-white hover:border-slate-400 transition-colors">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="routine">🟢 Routine — Planned procurement</SelectItem>
                            <SelectItem value="essential">🟡 Essential — Required within 2 weeks</SelectItem>
                            <SelectItem value="critical">🔴 Critical — Immediate patient safety risk</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Column 3: Emergency Procurement */}
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block h-5 leading-5">
                          Priority Classification
                        </Label>
                        <div
                          className="h-11 px-3.5 rounded-xl border border-border/70 bg-white shadow-sm flex items-center justify-between cursor-pointer hover:border-slate-400 transition-colors"
                          onClick={() => setForm(f => ({ ...f, isEmergency: !f.isEmergency }))}
                        >
                          <div className="flex flex-col justify-center min-w-0 pr-2">
                            <span className="text-xs font-semibold text-slate-800 leading-tight flex items-center gap-1.5">
                              Emergency Procurement
                              {form.isEmergency && (
                                <Badge className="bg-red-500 text-white text-[9px] px-1.5 py-0 h-4 uppercase tracking-wide">
                                  Fast-Track
                                </Badge>
                              )}
                            </span>
                            <span className="text-[10px] text-muted-foreground leading-tight truncate">
                              Bypasses standard timelines
                            </span>
                          </div>
                          <Switch
                            checked={form.isEmergency}
                            onCheckedChange={v => setForm({ ...form, isEmergency: v })}
                            onClick={e => e.stopPropagation()}
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Indent Details */}
                <Card className="shadow-md border-0 rounded-2xl ring-1 ring-black/[0.04]">
                  <CardHeader className="pb-3 px-6 pt-5">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-200/50">
                        <FileText className="h-4.5 w-4.5 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-sm font-bold">Indent Details</CardTitle>
                        <p className="text-[11px] text-muted-foreground mt-0.5">Reference, financial and budget information</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="px-6 pb-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                      {[
                        { label: "Indent Reference No.", val: form.indentRefNumber, key: "indentRefNumber", ph: "e.g. IND/2025/001" },
                        { label: "Budget Head / Code", val: form.budgetHead, key: "budgetHead", ph: "e.g. BH-2526-001" },
                        { label: "Account Head", val: form.accountHeadName, key: "accountHeadName", ph: "Select or type account head" },
                        { label: "Programme Name", val: form.programmeName, key: "programmeName", ph: "e.g. NHM, NVBDCP" },
                        { label: "Funding Source", val: form.fundingSourceName, key: "fundingSourceName", ph: "e.g. State Budget, Central" },
                        { label: "Digitised By", val: form.digitisedBy, key: "digitisedBy", ph: "Data Entry Operator" },
                        { label: "Contact Person", val: form.contactPerson, key: "contactPerson", ph: "Primary contact name" },
                        { label: "Contact Phone", val: form.contactPhone, key: "contactPhone", ph: "+91 XXXXX XXXXX" },
                      ].map(f => (
                        <div key={f.key} className="space-y-2">
                          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{f.label}</Label>
                          <Input value={f.val} onChange={e => setForm({ ...form, [f.key]: e.target.value })} placeholder={f.ph} className="h-10 rounded-xl shadow-sm" />
                        </div>
                      ))}
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Financial Year</Label>
                        <Select value={form.financialYear} onValueChange={v => setForm({ ...form, financialYear: v })}>
                          <SelectTrigger className="h-10 rounded-xl shadow-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="2024-25">2024-25</SelectItem>
                            <SelectItem value="2025-26">2025-26</SelectItem>
                            <SelectItem value="2026-27">2026-27</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="mt-4 space-y-2">
                      <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Remarks / Special Instructions</Label>
                      <Textarea value={form.remarks} onChange={e => setForm({ ...form, remarks: e.target.value })} rows={2} className="resize-none rounded-xl shadow-sm" placeholder="Any special conditions, delivery constraints…" />
                    </div>
                  </CardContent>
                </Card>

                {/* Signatories */}
                <Card className="shadow-md border-0 rounded-2xl ring-1 ring-black/[0.04]">
                  <CardHeader className="pb-3 px-6 pt-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-200/50">
                          <User className="h-4.5 w-4.5 text-white" />
                        </div>
                        <div>
                          <CardTitle className="text-sm font-bold">Key Signature Holders</CardTitle>
                          <p className="text-[11px] text-muted-foreground mt-0.5">Signatories from the physical indent document</p>
                        </div>
                      </div>
                      <Button type="button" variant="outline" size="sm" className="gap-1.5 h-8 text-xs rounded-lg" onClick={addSignatory}>
                        <Plus className="h-3 w-3" />Add Signatory
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="px-6 pb-5 space-y-2.5">
                    {signatories.map((sig, idx) => (
                      <div key={idx} className="grid grid-cols-12 gap-3 items-end">
                        <div className="col-span-4 space-y-1">
                          <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Name</Label>
                          <Input value={sig.name} onChange={e => updateSignatory(idx, "name", e.target.value)} placeholder={`Signatory ${idx + 1}`} className="h-9 text-sm rounded-lg" />
                        </div>
                        <div className="col-span-4 space-y-1">
                          <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Designation</Label>
                          <Input value={sig.designation} onChange={e => updateSignatory(idx, "designation", e.target.value)} className="h-9 text-sm rounded-lg" />
                        </div>
                        <div className="col-span-3 space-y-1">
                          <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Date</Label>
                          <Input type="date" value={sig.date} onChange={e => updateSignatory(idx, "date", e.target.value)} className="h-9 text-sm rounded-lg" />
                        </div>
                        <div className="col-span-1 flex justify-center pb-0.5">
                          {signatories.length > 1 && (
                            <Button type="button" variant="ghost" size="sm" className="h-9 w-9 p-0 text-muted-foreground hover:text-destructive rounded-lg" onClick={() => removeSignatory(idx)}>
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ═══ TAB 2: LINE ITEMS ═══ */}
              <TabsContent value="items" className="mt-5 space-y-5 animate-in fade-in-50 duration-300">
                {/* Alert */}
                {completeItems.length === 0 && (
                  <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl text-sm text-amber-800 shadow-sm">
                    <AlertCircle className="h-5 w-5 shrink-0" />
                    <div>
                      <p className="font-semibold">No line items added yet</p>
                      <p className="text-xs text-amber-700 mt-0.5">Select a product category, choose equipment, set quantity and verify the price to add a line item.</p>
                    </div>
                  </div>
                )}

                {/* Line items list */}
                {lineItems.map((li, idx) => {
                  const selectedEq = findEq(li.equipmentId);
                  const cc = selectedEq ? catColor(selectedEq.category) : defaultCatColor;
                  const specs = getSpecsForEquipment(selectedEq);
                  const unitPrice = getUnitPrice(li);
                  const qty = parseInt(li.qty) || 0;
                  const gstRate = getGstRate(li);
                  const subtotal = getSubtotal(li);
                  const gstAmt = getGstAmt(li);
                  const total = getTotal(li);

                  // Filter equipment by selected category
                  const filteredEquipment = catFilter === "All"
                    ? (equipment ?? [])
                    : (equipment ?? []).filter(e => e.category === catFilter);

                  return (
                    <Card key={li.localId} className={cn(
                      "shadow-lg border-0 rounded-2xl ring-1 ring-black/[0.04] overflow-hidden transition-all",
                      selectedEq ? "border-l-4" : "",
                      selectedEq ? cc.border : ""
                    )}>
                      {/* Colored top strip */}
                      <div className={cn("h-1.5", selectedEq ? `bg-gradient-to-r ${
                        selectedEq.category === "Radiology" ? "from-blue-400 to-blue-600" :
                        selectedEq.category === "Laboratory" ? "from-emerald-400 to-emerald-600" :
                        selectedEq.category === "Critical Care" ? "from-red-400 to-red-600" :
                        selectedEq.category === "OT Equipment" ? "from-indigo-400 to-indigo-600" :
                        selectedEq.category === "Patient Monitoring" ? "from-violet-400 to-violet-600" :
                        selectedEq.category === "Emergency" ? "from-amber-400 to-amber-600" :
                        selectedEq.category === "CSSD" ? "from-teal-400 to-teal-600" :
                        "from-gray-400 to-gray-600"
                      }` : "bg-gradient-to-r from-gray-200 to-gray-300")} />

                      <CardHeader className="pb-2 px-6 pt-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shadow-sm", selectedEq ? cc.bg : "bg-gray-100")}>
                              <span className="text-sm font-bold text-muted-foreground">#{idx + 1}</span>
                            </div>
                            <div>
                              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Line Item {idx + 1}</span>
                              {selectedEq && <p className="text-sm font-semibold text-foreground">{selectedEq.name}</p>}
                              {selectedEq && <p className="text-[11px] text-muted-foreground">{selectedEq.category} · {selectedEq.equipmentCode} · HSN {selectedEq.hsnCode}</p>}
                            </div>
                            {total > 0 && (
                              <Badge className="ml-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white border-0 text-xs font-bold px-3 py-1 shadow-sm">
                                {formatINR(total)}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-foreground" onClick={() => duplicateItem(li.localId)} title="Duplicate">
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                            {lineItems.length > 1 && (
                              <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-destructive" onClick={() => removeItem(li.localId)} title="Remove">
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="px-6 pb-6 space-y-4">
                        {/* Category chips */}
                        <div>
                          <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 block">Filter by Category</Label>
                          <div className="flex flex-wrap gap-1.5">
                            {eqCategories.map(cat => {
                              const isActive = catFilter === cat;
                              const c = cat === "All" ? defaultCatColor : catColor(cat);
                              return (
                                <button key={cat} type="button" onClick={() => setCatFilter(cat)} className={cn(
                                  "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all",
                                  isActive ? `${c.bg} ${c.text} ${c.border} shadow-md ring-1 ring-black/5` : "bg-white text-muted-foreground border-gray-200 hover:border-gray-400 hover:shadow-sm"
                                )}>
                                  {cat === "All" ? <Layers className="h-3 w-3" /> : <Wrench className="h-3 w-3" />}
                                  {cat}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Product + Qty + Unit + Price + GST */}
                        <div className="grid grid-cols-12 gap-4">
                          <div className="col-span-12 lg:col-span-5 space-y-2">
                            <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Select Product <span className="text-red-500">*</span></Label>
                            <Popover open={li.searchOpen} onOpenChange={open => updateItem(li.localId, { searchOpen: open })}>
                              <PopoverTrigger asChild>
                                <Button type="button" variant="outline" role="combobox" className={cn(
                                  "w-full justify-between h-10 font-normal text-sm rounded-xl shadow-sm",
                                  !li.equipmentId && "text-muted-foreground"
                                )}>
                                  <span className="truncate">{selectedEq?.name ?? "Search equipment…"}</span>
                                  <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-[480px] p-0" align="start">
                                <Command>
                                  <CommandInput placeholder="Type product name or code…" className="h-10" />
                                  <CommandList className="max-h-[320px]">
                                    <CommandEmpty>
                                      <div className="flex flex-col items-center gap-2 py-6 text-center">
                                        <Package className="h-6 w-6 opacity-30" />
                                        <p className="text-sm text-muted-foreground">No matching equipment found.</p>
                                      </div>
                                    </CommandEmpty>
                                    <CommandGroup heading={`${catFilter} — ${filteredEquipment.length} products`}>
                                      {filteredEquipment.map(eq => {
                                        const isSelected = li.equipmentId === eq.id;
                                        const eqSpecs = getSpecsForEquipment(eq);
                                        const c = catColor(eq.category);
                                        return (
                                          <CommandItem
                                            key={eq.id}
                                            value={`${eq.name} ${eq.equipmentCode} ${eq.category}`}
                                            onSelect={() => updateItem(li.localId, { equipmentId: eq.id, searchOpen: false, specOpen: true })}
                                            className="flex items-start gap-3 py-3 px-3"
                                          >
                                            <Check className={cn("h-4 w-4 mt-0.5 shrink-0", isSelected ? "opacity-100 text-blue-600" : "opacity-0")} />
                                            <div className="flex-1 min-w-0">
                                              <div className="flex items-center gap-2">
                                                <p className="text-sm font-semibold">{eq.name}</p>
                                              </div>
                                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-md", c.bg, c.text)}>{eq.category}</span>
                                                <span className="font-mono text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">{eq.equipmentCode}</span>
                                                <span className="text-[11px] font-semibold text-emerald-700">{formatINR(eq.estimatedUnitCost ?? 0)}/unit</span>
                                                <span className="text-[10px] text-muted-foreground">GST {eq.gstRate}%</span>
                                              </div>
                                              {eq.specifications && (
                                                <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1">{eq.specifications}</p>
                                              )}
                                            </div>
                                          </CommandItem>
                                        );
                                      })}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                          </div>

                          <div className="col-span-4 lg:col-span-2 space-y-2">
                            <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Quantity <span className="text-red-500">*</span></Label>
                            <Input type="number" min="1" value={li.qty} onChange={e => updateItem(li.localId, { qty: e.target.value })} className="h-10 rounded-xl shadow-sm tabular-nums text-center text-base font-semibold" />
                          </div>

                          <div className="col-span-4 lg:col-span-1 space-y-2">
                            <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Unit</Label>
                            <Select value={li.unit} onValueChange={v => updateItem(li.localId, { unit: v })}>
                              <SelectTrigger className="h-10 rounded-xl shadow-sm"><SelectValue /></SelectTrigger>
                              <SelectContent>{UNIT_OPTIONS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                            </Select>
                          </div>

                          <div className="col-span-6 lg:col-span-2 space-y-2">
                            <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Unit Price (₹)</Label>
                            <div className="relative">
                              <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                              <Input type="number" min="0" value={li.unitPrice} onChange={e => updateItem(li.localId, { unitPrice: e.target.value })} className="h-10 pl-9 rounded-xl shadow-sm tabular-nums font-semibold" />
                            </div>
                          </div>

                          <div className="col-span-6 lg:col-span-2 space-y-2">
                            <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">GST Rate</Label>
                            <Select value={li.gstRate} onValueChange={v => updateItem(li.localId, { gstRate: v })}>
                              <SelectTrigger className="h-10 rounded-xl shadow-sm font-semibold"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="0">0%</SelectItem>
                                <SelectItem value="5">5%</SelectItem>
                                <SelectItem value="12">12%</SelectItem>
                                <SelectItem value="18">18%</SelectItem>
                                <SelectItem value="28">28%</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Price Breakdown Card */}
                        {li.equipmentId && qty > 0 && unitPrice > 0 && (
                          <div className="bg-gradient-to-r from-slate-50 via-white to-blue-50/40 rounded-2xl p-5 border shadow-sm ring-1 ring-black/[0.03]">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div className="text-center p-3 bg-white rounded-xl shadow-sm">
                                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Unit Price</p>
                                <p className="text-base font-bold text-foreground tabular-nums mt-1">{formatINRFull(unitPrice)}</p>
                              </div>
                              <div className="text-center p-3 bg-white rounded-xl shadow-sm">
                                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Subtotal ({qty} × {li.unit})</p>
                                <p className="text-base font-bold text-foreground tabular-nums mt-1">{formatINRFull(subtotal)}</p>
                              </div>
                              <div className="text-center p-3 bg-white rounded-xl shadow-sm">
                                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">GST @ {gstRate}%</p>
                                <p className="text-base font-bold text-amber-700 tabular-nums mt-1">{formatINRFull(gstAmt)}</p>
                              </div>
                              <div className="text-center p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-sm border border-blue-200">
                                <p className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">Line Total</p>
                                <p className="text-lg font-extrabold text-blue-700 tabular-nums mt-1">{formatINR(total)}</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Justification */}
                        <div className="space-y-2">
                          <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Justification / Remarks</Label>
                          <Textarea value={li.justification} onChange={e => updateItem(li.localId, { justification: e.target.value })} rows={2} className="resize-none text-sm rounded-xl shadow-sm" placeholder="Why this product is needed, current equipment status…" />
                        </div>

                        {/* Equipment Specifications — INLINE */}
                        {li.equipmentId && selectedEq && (
                          <div className="space-y-2">
                            <button
                              type="button"
                              className={cn(
                                "flex items-center gap-2 text-xs font-bold w-full px-4 py-3 rounded-xl border transition-all",
                                li.specOpen
                                  ? `${cc.bg} ${cc.text} ${cc.border} shadow-md`
                                  : "bg-white text-muted-foreground border-gray-200 hover:border-gray-400 hover:shadow-sm"
                              )}
                              onClick={() => updateItem(li.localId, { specOpen: !li.specOpen })}
                            >
                              {li.specOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              <Wrench className="h-4 w-4" />
                              {li.specOpen ? "Hide" : "View"} Equipment Specifications & Technical Details
                              {!li.specOpen && specs && (
                                <span className="ml-auto text-muted-foreground font-normal flex items-center gap-1 text-[11px]">
                                  <Info className="h-3 w-3" />
                                  {Object.keys(specs.performance).length} specs · {specs.accessories.length} accessories · {specs.warranty.years}yr warranty
                                </span>
                              )}
                            </button>

                            {li.specOpen && (
                              <div className="border rounded-2xl overflow-hidden shadow-md bg-white">
                                {/* Full spec sheet */}
                                {specs && (
                                  <div className="p-4">
                                    <ProductSpecSheet
                                      equipmentId={selectedEq.id}
                                      equipmentCode={selectedEq.equipmentCode}
                                      equipmentName={selectedEq.name}
                                    />
                                  </div>
                                )}
                                {!specs && (
                                  <div className="p-5 text-center text-muted-foreground">
                                    <Wrench className="h-8 w-8 mx-auto mb-2 opacity-30" />
                                    <p className="text-sm">No detailed specifications available for this product.</p>
                                    <p className="text-xs mt-1">Basic info: {selectedEq.specifications}</p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}

                {/* Add item buttons */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 gap-2 border-dashed border-2 h-12 text-muted-foreground hover:text-foreground rounded-2xl hover:bg-blue-50/50 hover:border-blue-300 transition-all"
                    onClick={addItem}
                  >
                    <Plus className="h-4 w-4" /> Add Single Line Item
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="gap-2 h-12 px-6 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 hover:from-blue-100 hover:to-indigo-100 border border-blue-200 shadow-sm"
                    onClick={() => setMultiSelectOpen(true)}
                  >
                    <Layers className="h-4 w-4 text-blue-600" /> Quick Multi-Select Equipment ({equipment?.length ?? 0} available)
                  </Button>
                </div>

                {/* Bulk Equipment Selection Dialog */}
                <Dialog open={multiSelectOpen} onOpenChange={setMultiSelectOpen}>
                  <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-6">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <Layers className="h-5 w-5 text-blue-600" />
                        Select Multiple Equipment to Add
                      </DialogTitle>
                      <p className="text-xs text-muted-foreground">
                        Select multiple medical products to add all of them to your indent in one click with official benchmark rates.
                      </p>
                    </DialogHeader>

                    {/* Search & Filter Bar */}
                    <div className="space-y-2.5 my-1">
                      <Input
                        placeholder="Search equipment by name, code, or department…"
                        value={multiSearchFilter}
                        onChange={(e) => setMultiSearchFilter(e.target.value)}
                        className="h-10"
                      />

                      {/* Category Chips inside Dialog */}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                          {eqCategories.map(cat => {
                            const isActive = multiCategoryFilter === cat;
                            return (
                              <button
                                key={cat}
                                type="button"
                                onClick={() => setMultiCategoryFilter(cat)}
                                className={cn(
                                  "px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all border",
                                  isActive
                                    ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                                )}
                              >
                                {cat}
                              </button>
                            );
                          })}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-blue-700 hover:bg-blue-50"
                            onClick={() => {
                              const matchingIds = (equipment ?? [])
                                .filter(e => {
                                  const matchesCat = multiCategoryFilter === "All" || e.category === multiCategoryFilter;
                                  const matchesSearch = !multiSearchFilter ||
                                    e.name.toLowerCase().includes(multiSearchFilter.toLowerCase()) ||
                                    e.equipmentCode.toLowerCase().includes(multiSearchFilter.toLowerCase());
                                  return matchesCat && matchesSearch;
                                })
                                .map(e => e.id);
                              setSelectedMultiEqIds(prev => Array.from(new Set([...prev, ...matchingIds])));
                            }}
                          >
                            Select All Filtered
                          </Button>
                          {selectedMultiEqIds.length > 0 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-muted-foreground hover:text-destructive"
                              onClick={() => setSelectedMultiEqIds([])}
                            >
                              Clear
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto border rounded-xl p-1.5 my-2 max-h-[46vh] space-y-1">
                      {(equipment ?? [])
                        .filter(e => {
                          const matchesCat = multiCategoryFilter === "All" || e.category === multiCategoryFilter;
                          const matchesSearch = !multiSearchFilter ||
                            e.name.toLowerCase().includes(multiSearchFilter.toLowerCase()) ||
                            e.equipmentCode.toLowerCase().includes(multiSearchFilter.toLowerCase()) ||
                            e.category.toLowerCase().includes(multiSearchFilter.toLowerCase());
                          return matchesCat && matchesSearch;
                        })
                        .map(eq => {
                          const isChecked = selectedMultiEqIds.includes(eq.id);
                          const rate = getRealisticRate(eq);
                          const alreadyInIndent = lineItems.some(li => li.equipmentId === eq.id);
                          return (
                            <div
                              key={eq.id}
                              onClick={() => toggleMultiEq(eq.id)}
                              className={cn(
                                "flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border",
                                isChecked
                                  ? "bg-blue-50/90 border-blue-300 shadow-xs"
                                  : "bg-white border-transparent hover:bg-slate-50 hover:border-slate-200"
                              )}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <Checkbox
                                  checked={isChecked}
                                  className="pointer-events-none shrink-0"
                                  id={`multi-${eq.id}`}
                                />
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <p className="text-sm font-semibold text-foreground truncate">{eq.name}</p>
                                    {alreadyInIndent && (
                                      <span className="text-[10px] font-medium bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded">In Indent</span>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    <span className="font-semibold text-slate-700">{eq.category}</span> · <span className="font-mono text-blue-600 font-semibold">{eq.equipmentCode}</span> · HSN {eq.hsnCode || "9018"} · GST {eq.gstRate || 12}%
                                  </p>
                                </div>
                              </div>
                              <div className="text-right shrink-0 ml-3">
                                <span className="text-xs font-bold text-emerald-700 block">
                                  {rate > 0 ? formatINR(rate) : "—"}
                                </span>
                                <span className="text-[10px] text-muted-foreground">Standard Est. Rate</span>
                              </div>
                            </div>
                          );
                        })}
                    </div>

                    <DialogFooter className="flex items-center justify-between mt-2 pt-3 border-t">
                      <div className="text-xs">
                        <span className="font-semibold text-foreground">{selectedMultiEqIds.length}</span> item(s) selected
                        {selectedMultiEqIds.length > 0 && (
                          <span className="text-muted-foreground ml-2">
                            (Total Est: <strong className="text-emerald-700">{formatINR(selectedMultiEqIds.reduce((sum, id) => sum + getRealisticRate(findEq(id)), 0))}</strong>)
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button type="button" variant="outline" onClick={() => setMultiSelectOpen(false)}>
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          disabled={selectedMultiEqIds.length === 0}
                          className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                          onClick={addBulkEquipment}
                        >
                          Add {selectedMultiEqIds.length} Item(s) to Indent
                        </Button>
                      </div>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {/* Grand Total */}
                {completeItems.length > 0 && (
                  <Card className="shadow-xl border-0 rounded-2xl bg-gradient-to-br from-white via-blue-50/20 to-indigo-50/30 ring-1 ring-blue-200/50">
                    <CardContent className="p-6">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
                        <IndianRupee className="h-4 w-4 text-blue-600" /> Estimated Cost Summary
                      </p>
                      <div className="space-y-2 mb-4">
                        {completeItems.map((li, idx) => {
                          const eq = findEq(li.equipmentId);
                          return (
                            <div key={li.localId} className="flex items-center justify-between text-sm py-2 px-4 rounded-xl bg-white/60 hover:bg-white shadow-sm transition-colors">
                              <div className="flex items-center gap-3">
                                <span className="h-6 w-6 rounded-lg bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-700">{idx + 1}</span>
                                <span className="font-medium">{eq?.name ?? "—"}</span>
                                <Badge variant="outline" className="text-[10px] h-5">{li.qty} {li.unit}</Badge>
                                <span className="text-[10px] text-muted-foreground">GST {li.gstRate}%</span>
                              </div>
                              <span className="font-bold tabular-nums">{formatINRFull(getTotal(li))}</span>
                            </div>
                          );
                        })}
                      </div>
                      <Separator className="my-3" />
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Subtotal (excl. tax)</span>
                          <span className="font-semibold tabular-nums">{formatINRFull(grandSubtotal)}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Total GST</span>
                          <span className="font-semibold tabular-nums text-amber-700">{formatINRFull(grandGst)}</span>
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between pt-1">
                          <span className="font-extrabold text-base">Grand Total (incl. tax)</span>
                          <span className="font-extrabold text-2xl tabular-nums bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">{formatINR(grandTotal)}</span>
                        </div>
                      </div>
                      {grandTotal >= 5_00_000 && (
                        <div className="mt-4 flex items-start gap-3 text-xs text-amber-800 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl px-4 py-3">
                          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
                          <span>Value ≥ ₹5L — <strong>Director-level sanction required.</strong> An Additional Director approval step will be added to the workflow.</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* ═══ TAB 3: DOCUMENTS ═══ */}
              <TabsContent value="documents" className="mt-5 space-y-5 animate-in fade-in-50 duration-300">
                <Card className="shadow-md border-0 rounded-2xl bg-gradient-to-br from-white to-blue-50/20 ring-1 ring-black/[0.04]">
                  <CardHeader className="pb-3 px-6 pt-5">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-200/50">
                        <Upload className="h-4.5 w-4.5 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-sm font-bold">Scan Copy of Physical Indent</CardTitle>
                        <p className="text-[11px] text-muted-foreground mt-0.5">Upload the signed physical indent with all key signatories</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="px-6 pb-6">
                    {scanFile ? (
                      <div className="flex items-center justify-between p-4 bg-emerald-50/80 rounded-2xl border border-emerald-200 shadow-xs gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                            <FileText className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-emerald-950 truncate max-w-[280px] sm:max-w-md">{scanFile.name}</p>
                              <Badge className="bg-emerald-600 text-white text-[10px] font-semibold">Attached &amp; Verified</Badge>
                            </div>
                            <p className="text-xs text-emerald-700 mt-0.5">{scanFile.size} · Physical Indent Scanned Copy</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            type="button"
                            variant="default"
                            size="sm"
                            className="h-8 gap-1.5 bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
                            onClick={() => setViewingDoc(scanFile)}
                          >
                            <Eye className="h-3.5 w-3.5" /> View / Open Scan
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1 text-slate-700 border-slate-300"
                            onClick={() => scanRef.current?.click()}
                          >
                            <RefreshCw className="h-3.5 w-3.5" /> Replace
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-slate-400 hover:text-destructive"
                            onClick={() => setScanFile(null)}
                            title="Remove file"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div
                        className={cn(
                          "border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all",
                          isDraggingScan ? "border-blue-500 bg-blue-50/50" : "border-blue-300/60 hover:bg-blue-50/30 hover:border-blue-400"
                        )}
                        onClick={() => scanRef.current?.click()}
                        onDragOver={(e) => { e.preventDefault(); setIsDraggingScan(true); }}
                        onDragLeave={() => setIsDraggingScan(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setIsDraggingScan(false);
                          if (e.dataTransfer.files?.[0]) processScanFile(e.dataTransfer.files[0]);
                        }}
                      >
                        <Upload className="h-10 w-10 text-blue-400 mx-auto mb-2" />
                        <p className="text-sm font-semibold text-blue-800">Click to upload physical scanned indent or drag and drop</p>
                        <p className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG — Signed &amp; Stamped Document (Max 15MB)</p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="mt-3.5 rounded-lg border-blue-200 text-blue-700 hover:bg-blue-50"
                          onClick={(e) => { e.stopPropagation(); scanRef.current?.click(); }}
                        >
                          <Upload className="h-3.5 w-3.5 mr-1.5" /> Browse File
                        </Button>
                      </div>
                    )}
                    <input ref={scanRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleScanUpload} />
                  </CardContent>
                </Card>

                <Card className="shadow-md border-0 rounded-2xl ring-1 ring-black/[0.04]">
                  <CardHeader className="pb-3 px-6 pt-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-200/50">
                          <Paperclip className="h-4.5 w-4.5 text-white" />
                        </div>
                        <div>
                          <CardTitle className="text-sm font-bold">Supporting Documents</CardTitle>
                          <p className="text-[11px] text-muted-foreground mt-0.5">Justification notes, budget sanctions, technical spec sheets</p>
                        </div>
                      </div>
                      {attachments.length > 0 && (
                        <Badge variant="outline" className="bg-violet-50 text-violet-700 border-violet-200">
                          {attachments.length} Document{attachments.length !== 1 ? "s" : ""} Uploaded
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="px-6 pb-6 space-y-3">
                    {/* List of uploaded supporting documents */}
                    {attachments.map((att, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-violet-50/40 rounded-xl border border-violet-100 hover:shadow-xs transition-all gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-8 w-8 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center shrink-0">
                            <FileText className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <span className="text-sm font-semibold text-slate-900 block truncate max-w-[260px] sm:max-w-md">{att.name}</span>
                            <span className="text-xs text-muted-foreground">{att.size} · {att.type}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs text-blue-700 border-blue-200 hover:bg-blue-50 gap-1 px-2.5"
                            onClick={() => setViewingDoc(att)}
                          >
                            <Eye className="h-3 w-3" /> View
                          </Button>
                          {att.dataUrl && (
                            <a href={att.dataUrl} download={att.name} target="_blank" rel="noreferrer">
                              <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-500 hover:text-slate-800" title="Download">
                                <Download className="h-3.5 w-3.5" />
                              </Button>
                            </a>
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-slate-400 hover:text-destructive"
                            onClick={() => setAttachments(p => p.filter((_, j) => j !== i))}
                            title="Remove"
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}

                    {/* Interactive Dropzone for Supporting Documents */}
                    <div
                      className={cn(
                        "border-2 border-dashed rounded-2xl p-7 text-center cursor-pointer transition-all",
                        isDraggingAttach ? "border-violet-500 bg-violet-50/50" : "border-violet-200 hover:border-violet-400 hover:bg-violet-50/20"
                      )}
                      onClick={() => attachRef.current?.click()}
                      onDragOver={(e) => { e.preventDefault(); setIsDraggingAttach(true); }}
                      onDragLeave={() => setIsDraggingAttach(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDraggingAttach(false);
                        if (e.dataTransfer.files?.length) {
                          processAttachmentFiles(Array.from(e.dataTransfer.files));
                        }
                      }}
                    >
                      <Paperclip className="h-9 w-9 text-violet-400 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-violet-950">Click to upload supporting documents or drag and drop</p>
                      <p className="text-xs text-muted-foreground mt-1">PDF, Word (DOC/DOCX), Images (PNG/JPG) — Multiple files supported</p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-3 rounded-lg border-violet-200 text-violet-700 hover:bg-violet-50"
                        onClick={(e) => { e.stopPropagation(); attachRef.current?.click(); }}
                      >
                        <Upload className="h-3.5 w-3.5 mr-1.5" /> Browse Supporting Files
                      </Button>
                      <input
                        ref={attachRef}
                        type="file"
                        multiple
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        className="hidden"
                        onChange={handleAttachment}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ═══ TAB 4: WORKFLOW ═══ */}
              <TabsContent value="workflow" className="mt-5 animate-in fade-in-50 duration-300">
                <Card className="shadow-md border-0 rounded-2xl ring-1 ring-black/[0.04]">
                  <CardHeader className="pb-3 px-6 pt-5">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg shadow-indigo-200/50">
                        <History className="h-4.5 w-4.5 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-sm font-bold">Workflow History & Audit Trail</CardTitle>
                        <p className="text-[11px] text-muted-foreground mt-0.5">Approval steps and activity log for this indent</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="px-6 pb-6">
                    {[
                      { label: "Draft Created", desc: `${currentDate} · ${form.digitisedBy}`, detail: "Indent form is being filled.", active: true },
                      { label: "Submit for Review", desc: "Pending", detail: "", active: false },
                      { label: "Procurement Review", desc: "Pending", detail: "", active: false },
                      { label: "GM Equipment Approval", desc: "Pending", detail: "", active: false },
                      { label: "SO Equipment Final Sign-off", desc: "Pending", detail: "", active: false },
                    ].map((step, i) => (
                      <div key={i} className="flex items-start gap-4 py-4">
                        <div className="flex flex-col items-center">
                          <div className={cn(
                            "h-9 w-9 rounded-full flex items-center justify-center border-2",
                            step.active ? "bg-blue-100 border-blue-600" : "bg-gray-100 border-gray-300"
                          )}>
                            {step.active ? <CircleDot className="h-4 w-4 text-blue-600" /> : <Clock className="h-4 w-4 text-gray-400" />}
                          </div>
                          {i < 4 && <div className="w-[2px] h-8 bg-gray-200 mt-1" />}
                        </div>
                        <div className={cn(!step.active && "opacity-40")}>
                          <p className="text-sm font-semibold">{step.label}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{step.desc}</p>
                          {step.detail && <p className="text-xs text-muted-foreground mt-1">{step.detail}</p>}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Bottom action bar */}
            <div className="flex items-center gap-3 pt-4 pb-8 border-t">
              <Button type="submit" disabled={createIndent.isPending || isSavingDraft} className="gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-200/50 rounded-xl h-11 px-6">
                {createIndent.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {createIndent.isPending ? "Saving Indent to Database…" : `Submit Indent${completeItems.length > 1 ? ` (${completeItems.length} items)` : ""}`}
              </Button>
              <Button type="button" variant="outline" className="gap-2 rounded-xl h-11" disabled={isSavingDraft || createIndent.isPending} onClick={handleSaveDraft}>
                {isSavingDraft ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : <Save className="h-4 w-4" />}
                {isSavingDraft ? "Saving Draft…" : "Save Draft"}
              </Button>
              <Link href="/indents"><Button type="button" variant="ghost" className="rounded-xl h-11">Cancel</Button></Link>
              {!isValid && (
                <p className="text-xs text-muted-foreground ml-3 flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                  {!form.facilityId ? "Select a requesting facility to continue" : "Add at least one complete line item"}
                </p>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* ══════════ RIGHT SIDEBAR ══════════ */}
      <div className="hidden lg:flex border-l bg-gradient-to-b from-white to-slate-50/50 w-[280px] shrink-0 flex-col overflow-hidden">
        <div className="border-b px-4 py-3 shrink-0">
          <div className="flex items-center gap-1.5">
            {[
              { key: "activity", label: "Activity", icon: Activity },
              { key: "ai", label: "AI Insights", icon: Sparkles },
            ].map(tab => (
              <button key={tab.key} onClick={() => setSidebarTab(tab.key)} className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all",
                sidebarTab === tab.key ? "bg-blue-50 text-blue-700 shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}>
                <tab.icon className="h-3.5 w-3.5" />{tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {sidebarTab === "activity" && (<>
            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-3 text-center border border-blue-200/50">
                <p className="text-2xl font-extrabold text-blue-700 tabular-nums">{completeItems.length}</p>
                <p className="text-[10px] text-blue-600 font-semibold">Line Items</p>
              </div>
              <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-3 text-center border border-emerald-200/50">
                <p className="text-lg font-extrabold text-emerald-700 tabular-nums">{formatINR(grandTotal)}</p>
                <p className="text-[10px] text-emerald-600 font-semibold">Total Value</p>
              </div>
            </div>

            {/* Checklist */}
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <ListChecks className="h-3.5 w-3.5" /> Submission Checklist
              </p>
              <div className="space-y-2">
                {[
                  { label: "Facility selected", ok: !!form.facilityId },
                  { label: "At least 1 line item", ok: completeItems.length > 0 },
                  { label: "All items have price", ok: completeItems.length > 0 && completeItems.every(li => getUnitPrice(li) > 0) },
                  { label: "Scanned copy uploaded", ok: !!scanFile },
                  { label: "Signatories filled", ok: signatories.some(s => s.name) },
                ].map(c => (
                  <div key={c.label} className="flex items-center gap-2.5 py-1.5">
                    {c.ok ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" /> : <div className="h-4 w-4 rounded-full border-2 border-gray-300 shrink-0" />}
                    <span className={cn("text-xs font-medium", c.ok ? "text-foreground" : "text-muted-foreground")}>{c.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Recent Activity</p>
              <div className="flex items-start gap-3">
                <div className="h-7 w-7 rounded-lg bg-blue-100 flex items-center justify-center shrink-0 mt-0.5"><FileText className="h-3.5 w-3.5 text-blue-600" /></div>
                <div><p className="text-xs font-semibold">Draft created</p><p className="text-[11px] text-muted-foreground">{currentDate} · Just now</p></div>
              </div>
            </div>
          </>)}

          {sidebarTab === "ai" && (
            <div className="bg-gradient-to-br from-violet-50 via-blue-50 to-indigo-50 rounded-2xl p-5 border border-violet-200/40 shadow-sm">
              <div className="flex items-center gap-2 mb-3"><Sparkles className="h-4 w-4 text-violet-600" /><span className="text-xs font-bold text-violet-700">AI Insights</span></div>
              {completeItems.length > 0 ? (
                <div className="space-y-3 text-xs">
                  <div className="bg-white/70 rounded-xl p-3 border border-violet-100">
                    <p className="font-semibold text-violet-800">📋 Approval Route</p>
                    <p className="text-muted-foreground mt-1">{grandTotal >= 5_00_000 ? "Director-level sign-off required (value ≥ ₹5L)." : "Standard GM Equipment approval route."}</p>
                  </div>
                  <div className="bg-white/70 rounded-xl p-3 border border-violet-100">
                    <p className="font-semibold text-violet-800">⏱ Processing Time</p>
                    <p className="text-muted-foreground mt-1">{form.urgency === "critical" ? "2–3 business days (fast-track)." : form.urgency === "essential" ? "5–7 business days." : "10–15 business days."}</p>
                  </div>
                  {completeItems.some(li => { const eq = findEq(li.equipmentId); const sp = eq ? getSpecsForEquipment(eq) : null; return sp?.regulatory.aerbClearance; }) && (
                    <div className="bg-white/70 rounded-xl p-3 border border-orange-200">
                      <p className="font-semibold text-orange-800">⚡ AERB Clearance</p>
                      <p className="text-muted-foreground mt-1">One or more items require AERB Type Approval certification.</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Add line items to see AI-powered insights.</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ══════════ REALISTIC SAVING / SUBMISSION OVERLAY (2-3s) ══════════ */}
      {createIndent.isPending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center border border-slate-100 flex flex-col items-center">
            <div className="h-16 w-16 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mb-4 shadow-sm">
              <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
            </div>
            <h3 className="text-base font-bold text-slate-800">Saving Indent to Database</h3>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              Validating specifications, checking rate contract coverage, and initiating statutory approval workflow...
            </p>
            <div className="mt-4 flex items-center gap-2 text-[11px] font-medium text-blue-600 bg-blue-50/70 px-3 py-1.5 rounded-full">
              <span className="h-2 w-2 rounded-full bg-blue-600 animate-ping" />
              Processing transaction (approx. 2–3s)
            </div>
          </div>
        </div>
      )}

      {/* ══════════ SUCCESS DIALOG ══════════ */}
      {showSuccessDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full mx-4 p-10 text-center animate-in fade-in zoom-in-95 duration-300">
            <div className="h-20 w-20 rounded-full bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-emerald-200/60">
              <CheckCircle2 className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-xl font-extrabold">Indent Created Successfully!</h2>
            <p className="text-sm text-muted-foreground mt-3 leading-relaxed">Your procurement indent has been saved. You can review the details and submit for approval.</p>
            <div className="flex gap-3 mt-8 justify-center">
              <Button className="gap-2 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl h-11 px-6 shadow-md" onClick={() => { setShowSuccessDialog(false); if (createdIndentId) navigate(`/indents/${createdIndentId}`); }}>
                <Eye className="h-4 w-4" /> View Indent
              </Button>
              <Link href="/indents">
                <Button variant="outline" className="gap-2 rounded-xl h-11" onClick={() => setShowSuccessDialog(false)}>
                  <Layers className="h-4 w-4" /> Back to List
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
      {/* ══════════ DOCUMENT PREVIEW DIALOG ══════════ */}
      <Dialog open={!!viewingDoc} onOpenChange={(open) => !open && setViewingDoc(null)}>
        <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-6">
          <DialogHeader className="flex flex-row items-center justify-between pb-3 border-b pr-6">
            <div className="flex items-center gap-2.5 min-w-0">
              <FileText className="h-5 w-5 text-blue-600 shrink-0" />
              <div className="min-w-0">
                <DialogTitle className="text-base font-bold truncate max-w-md">{viewingDoc?.name}</DialogTitle>
                <p className="text-xs text-muted-foreground">{viewingDoc?.size} · {viewingDoc?.type}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {viewingDoc?.dataUrl && (
                <a href={viewingDoc.dataUrl} download={viewingDoc.name} target="_blank" rel="noreferrer">
                  <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs">
                    <Download className="h-3.5 w-3.5" /> Download File
                  </Button>
                </a>
              )}
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-auto p-3 bg-slate-100 rounded-xl flex items-center justify-center min-h-[460px]">
            {viewingDoc?.dataUrl?.startsWith("data:image/") || /\.(jpg|jpeg|png|webp|gif)$/i.test(viewingDoc?.name || "") ? (
              <img
                src={viewingDoc?.dataUrl}
                alt={viewingDoc?.name || "Document preview"}
                className="max-h-[72vh] max-w-full object-contain rounded-lg shadow-sm"
              />
            ) : viewingDoc?.dataUrl?.startsWith("data:application/pdf") || /\.pdf$/i.test(viewingDoc?.name || "") ? (
              <iframe
                src={viewingDoc?.dataUrl}
                title={viewingDoc?.name || "Document PDF"}
                className="w-full h-[72vh] rounded-lg border-0 bg-white shadow-sm"
              />
            ) : (
              <div className="text-center p-8 bg-white rounded-2xl shadow-sm border max-w-md">
                <FileText className="h-16 w-16 text-blue-500/50 mx-auto mb-3" />
                <p className="text-base font-bold text-slate-800">{viewingDoc?.name}</p>
                <p className="text-xs text-muted-foreground mt-1 mb-4">Binary reference document preview ready.</p>
                {viewingDoc?.dataUrl && (
                  <a href={viewingDoc.dataUrl} download={viewingDoc.name}>
                    <Button className="gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
                      <Download className="h-4 w-4" /> Download / Open Document
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
