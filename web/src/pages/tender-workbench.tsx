import { useState, useMemo } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useListTenders, useUpdateTender, getListTendersQueryKey } from "@/lib/api-hooks";
import { useQueryClient } from "@tanstack/react-query";
import {
  Gavel,
  FileText,
  CheckCircle2,
  Clock,
  Search,
  Eye,
  Edit3,
  Info,
  Calendar,
  Layers,
  IndianRupee,
  ShieldCheck,
  Check,
  ExternalLink,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export interface WorkbenchTender {
  id: string;
  tgmsidcRef: string;
  tenderNoticeNo: string;
  equipmentName: string;
  category: string;
  currentStage: string;
  stageKey: string;
  tenderInvitedDate: string;
  bidCloseDate: string;
  participationCount: number | null;
  estimatedValue: number;
  awardedVendor: string | null;
  awardedAmount: number | null;
  documentationCount: number;
  notes: string;
  lastUpdated: string;
}

const STATUTORY_STAGES = [
  { key: "doc_prep", label: "Document Preparation (NIT / TID)" },
  { key: "approval", label: "Approval for Tender" },
  { key: "invited", label: "Notice Inviting Tender (NIT)" },
  { key: "pre_bid", label: "Bid Submission Open" },
  { key: "bids_received", label: "Bid Receipt & Opening" },
  { key: "technical_eval", label: "Technical Evaluation In Progress" },
  { key: "commercial_eval", label: "Commercial Evaluation / Financial Bid Opened" },
  { key: "l1_identified", label: "L1 Identified / Award Approved" },
  { key: "contract_final", label: "Contract Finalisation / LOI Issued" },
  { key: "rc_created", label: "Rate Contract (RC) Created" },
];

const SEED_WORKBENCH_TENDERS: WorkbenchTender[] = [
  {
    id: "6ac27dbd53b11c09b63a2d34",
    tgmsidcRef: "TND-2026-0001",
    tenderNoticeNo: "NIT/TGMSIDC/2026/0142",
    equipmentName: "Ultrasound Machine (B-Mode Color Doppler) — 15 Units",
    category: "Diagnostic Imaging",
    currentStage: "Technical Evaluation In Progress",
    stageKey: "technical_eval",
    tenderInvitedDate: "2026-01-03",
    bidCloseDate: "2026-01-20",
    participationCount: 4,
    estimatedValue: 18000000,
    awardedVendor: null,
    awardedAmount: null,
    documentationCount: 4,
    notes: "Technical bid opening concluded. Equipment demonstration and clinical verification scheduled at Osmania General Hospital.",
    lastUpdated: "2026-01-22T14:30:00Z",
  },
  {
    id: "6ac27dbd53b11c09b63a2d3f",
    tgmsidcRef: "TND-2026-0002",
    tenderNoticeNo: "NIT/TGMSIDC/2026/0158",
    equipmentName: "Laparoscopy HD Camera Tower & System — 8 Units",
    category: "Surgical Equipment",
    currentStage: "Commercial Evaluation / Financial Bid Opened",
    stageKey: "commercial_eval",
    tenderInvitedDate: "2026-01-15",
    bidCloseDate: "2026-02-01",
    participationCount: 3,
    estimatedValue: 16000000,
    awardedVendor: "Stryker India Pvt Ltd",
    awardedAmount: 14500000,
    documentationCount: 5,
    notes: "Technical qualification approved by procurement committee. Financial bid comparative statement prepared.",
    lastUpdated: "2026-02-05T12:00:00Z",
  },
  {
    id: "6ac27dbd53b11c09b63a2d4a",
    tgmsidcRef: "TND-2026-0003",
    tenderNoticeNo: "NIT/TGMSIDC/2026/0175",
    equipmentName: "Fully Automated Biochemistry Analyser — 20 Units",
    category: "Laboratory Diagnostics",
    currentStage: "L1 Identified / Award Approved",
    stageKey: "l1_identified",
    tenderInvitedDate: "2026-01-28",
    bidCloseDate: "2026-02-12",
    participationCount: 5,
    estimatedValue: 11000000,
    awardedVendor: "Transasia Bio-Medicals Ltd",
    awardedAmount: 9800000,
    documentationCount: 6,
    notes: "L1 rates approved by ED (Procurement). Letter of Intent (LOI) under processing.",
    lastUpdated: "2026-02-18T16:00:00Z",
  },
  {
    id: "TND-2026-0004",
    tgmsidcRef: "TND-2026-0004",
    tenderNoticeNo: "1A.67/HPC/EQU/2025-26",
    equipmentName: "DEXA Bone Densitometer Scanner — 4 Units",
    category: "Diagnostic Imaging",
    currentStage: "Bid Submission Open",
    stageKey: "pre_bid",
    tenderInvitedDate: "2026-02-10",
    bidCloseDate: "2026-02-25",
    participationCount: 2,
    estimatedValue: 12500000,
    awardedVendor: null,
    awardedAmount: null,
    documentationCount: 3,
    notes: "Pre-bid queries clarified via Corrigendum-1. Bid submissions in progress.",
    lastUpdated: "2026-02-15T11:00:00Z",
  },
  {
    id: "TND-2026-0005",
    tgmsidcRef: "TND-2026-0005",
    tenderNoticeNo: "NIT/TGMSIDC/2026/0210",
    equipmentName: "Advanced ICU Ventilator (Adult/Paediatric) — 35 Units",
    category: "Critical Care",
    currentStage: "Document Preparation (NIT / TID)",
    stageKey: "doc_prep",
    tenderInvitedDate: "2026-02-22",
    bidCloseDate: "2026-03-15",
    participationCount: null,
    estimatedValue: 32000000,
    awardedVendor: null,
    awardedAmount: null,
    documentationCount: 2,
    notes: "Technical specifications finalised by Technical Committee. Schedule of requirements drafted.",
    lastUpdated: "2026-02-24T09:30:00Z",
  },
];

function fmt(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

export default function TenderWorkbench() {
  const queryClient = useQueryClient();
  const { data: serverTenders = [] } = useListTenders({
    query: { queryKey: getListTendersQueryKey() },
  });
  const updateTender = useUpdateTender();

  const [tenders, setTenders] = useState<WorkbenchTender[]>(SEED_WORKBENCH_TENDERS);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [detailModal, setDetailModal] = useState<WorkbenchTender | null>(null);

  // Manual Update Modal state
  const [editModal, setEditModal] = useState<WorkbenchTender | null>(null);
  const [editForm, setEditForm] = useState({
    stageKey: "doc_prep",
    currentStage: "Document Preparation (NIT / TID)",
    participationCount: "",
    awardedVendor: "",
    awardedAmount: "",
    bidCloseDate: "",
    notes: "",
  });

  // Keep server tenders synchronized if available
  useMemo(() => {
    if (serverTenders.length > 0) {
      setTenders((current) => {
        const merged = [...current];
        serverTenders.forEach((st) => {
          const idx = merged.findIndex(
            (m) => m.tgmsidcRef === st.tenderNumber || m.id === st.id
          );
          const stageObj = STATUTORY_STAGES.find((s) => s.key === st.status || (st.status === "evaluation" && s.key === "technical_eval"));
          const stageLabel = stageObj?.label ?? (st.status === "evaluation" ? "Technical Evaluation In Progress" : st.status.replace(/_/g, " ").toUpperCase());
          if (idx !== -1) {
            merged[idx] = {
              ...merged[idx],
              id: st.id,
              tgmsidcRef: st.tenderNumber,
              equipmentName: st.equipmentName || merged[idx].equipmentName,
              stageKey: st.status === "evaluation" ? "technical_eval" : st.status,
              currentStage: stageLabel,
              awardedVendor: st.l1BidderName ?? merged[idx].awardedVendor,
              awardedAmount: st.l1BidderAmount ?? merged[idx].awardedAmount,
              notes: st.notes || merged[idx].notes,
            };
          }
        });
        return merged;
      });
    }
  }, [serverTenders]);

  const filtered = useMemo(() => {
    return tenders.filter((t) => {
      const matchesSearch =
        !search ||
        t.tgmsidcRef.toLowerCase().includes(search.toLowerCase()) ||
        t.equipmentName.toLowerCase().includes(search.toLowerCase()) ||
        t.tenderNoticeNo.toLowerCase().includes(search.toLowerCase()) ||
        (t.awardedVendor?.toLowerCase().includes(search.toLowerCase()) ?? false);

      const matchesStage =
        stageFilter === "all" ||
        (stageFilter === "eval" &&
          ["technical_eval", "commercial_eval", "bids_received", "evaluation"].includes(t.stageKey)) ||
        (stageFilter === "awarded" &&
          ["l1_identified", "contract_final", "rc_created"].includes(t.stageKey)) ||
        (stageFilter === "open" && ["invited", "pre_bid"].includes(t.stageKey)) ||
        (stageFilter === "prep" && ["doc_prep", "approval"].includes(t.stageKey));

      return matchesSearch && matchesStage;
    });
  }, [tenders, search, stageFilter]);

  const stats = useMemo(() => {
    return {
      total: tenders.length,
      evaluating: tenders.filter((t) =>
        ["technical_eval", "commercial_eval", "bids_received", "evaluation"].includes(t.stageKey)
      ).length,
      awarded: tenders.filter((t) =>
        ["l1_identified", "contract_final", "rc_created"].includes(t.stageKey)
      ).length,
      open: tenders.filter((t) => ["invited", "pre_bid"].includes(t.stageKey)).length,
    };
  }, [tenders]);

  function openEditModal(t: WorkbenchTender) {
    setEditModal(t);
    setEditForm({
      stageKey: t.stageKey,
      currentStage: t.currentStage,
      participationCount: t.participationCount != null ? String(t.participationCount) : "",
      awardedVendor: t.awardedVendor || "",
      awardedAmount: t.awardedAmount != null ? String(t.awardedAmount) : "",
      bidCloseDate: t.bidCloseDate || "",
      notes: t.notes || "",
    });
  }

  function handleSaveStatus() {
    if (!editModal) return;

    const updatedStageObj = STATUTORY_STAGES.find((s) => s.key === editForm.stageKey);
    const updatedStageName = updatedStageObj ? updatedStageObj.label : editForm.currentStage;

    const updatedParticipation = editForm.participationCount
      ? parseInt(editForm.participationCount, 10)
      : null;
    const updatedAmount = editForm.awardedAmount ? parseFloat(editForm.awardedAmount) : null;

    setTenders((ts) =>
      ts.map((t) =>
        t.id === editModal.id || t.tgmsidcRef === editModal.tgmsidcRef
          ? {
              ...t,
              stageKey: editForm.stageKey,
              currentStage: updatedStageName,
              participationCount: updatedParticipation,
              awardedVendor: editForm.awardedVendor.trim() || null,
              awardedAmount: updatedAmount,
              bidCloseDate: editForm.bidCloseDate || t.bidCloseDate,
              notes: editForm.notes || t.notes,
              lastUpdated: new Date().toISOString(),
            }
          : t
      )
    );

    // Call backend API if tender is in DB
    if (editModal.id && editModal.id.length === 24) {
      updateTender.mutate(
        {
          id: editModal.id,
          data: {
            status: editForm.stageKey,
            ...(editForm.awardedVendor ? { l1BidderName: editForm.awardedVendor } : {}),
            ...(updatedAmount ? { l1BidderAmount: updatedAmount } : {}),
            notes: editForm.notes,
          },
        },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListTendersQueryKey() });
          },
        }
      );
    }

    setEditModal(null);
  }

  function getStageBadgeColor(stageKey: string) {
    if (["l1_identified", "contract_final", "rc_created"].includes(stageKey)) {
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    }
    if (["technical_eval", "commercial_eval", "evaluation"].includes(stageKey)) {
      return "bg-amber-50 text-amber-700 border-amber-200";
    }
    if (["invited", "pre_bid", "bids_received"].includes(stageKey)) {
      return "bg-blue-50 text-blue-700 border-blue-200";
    }
    return "bg-slate-100 text-slate-700 border-slate-200";
  }

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#e4eaf2] pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#152340]">
              Tender Workbench
            </h1>
            <Badge variant="outline" className="border-slate-300 bg-white text-slate-700 font-semibold text-xs">
              Manual Milestone & Documentation Tracking
            </Badge>
          </div>
          <p className="text-xs text-[#6b7a93] mt-0.5">
            Manage tender documentation, record statutory milestones, and manually track procurement progression
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <a
            href="https://tender.telangana.gov.in"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-blue-700 hover:border-blue-300 transition-colors cursor-pointer shadow-xs"
            title="Opens Telangana State eProcurement Portal in a new tab (External Reference Only — No Application Integration)"
          >
            <ExternalLink className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span>Telangana eProcurement Portal</span>
            <span className="text-[10px] text-slate-500 font-normal hidden sm:inline">(External Ref)</span>
          </a>
          <Link href="/tenders">
            <Button size="sm" variant="outline" className="gap-1.5 cursor-pointer">
              <Layers className="w-3.5 h-3.5" />
              <span>All Tenders View</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* ── Notice Banner (Documentation & Manual Scope) ── */}
      <Card className="border-slate-200 bg-slate-50/70 shadow-xs">
        <CardContent className="p-3.5">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-slate-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Tender Documentation & Manual Status Management
                </p>
                <span className="text-[11px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-medium">
                  Internal Workflow
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                This workbench serves as the central documentation registry for competitive equipment tenders. Procurement officers initiate and archive notice documents (NIT/TID, Annexure-1 Schedule of Requirements, Technical Specs), and manually update evaluation progress and bid milestone statuses as committees conclude evaluations.
              </p>
              <p className="text-[11px] text-slate-500 mt-1.5 border-t border-slate-200/80 pt-1.5 flex items-center gap-1.5">
                <span className="font-semibold text-slate-700">e-Procurement Reference:</span>
                <span>Tenders are formally published on the <a href="https://tender.telangana.gov.in" target="_blank" rel="noopener noreferrer" className="text-blue-600 font-medium underline inline-flex items-center gap-0.5">Telangana eProcurement Portal (tender.telangana.gov.in)<ExternalLink className="w-2.5 h-2.5 inline" /></a>. Please note that there is <strong>no direct system integration</strong>; all documentation and stage transitions in TGMSIDC are handled manually.</span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── KPI Ribbon ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="neo-kpi-card">
          <span className="text-[10px] font-bold text-[#6b7a93] uppercase tracking-wider block">
            Total Tenders
          </span>
          <span className="text-2xl font-bold text-[#152340] tabular-nums mt-1 block">
            {stats.total}
          </span>
          <span className="text-[10.5px] text-[#6b7a93] mt-1 block">Under procurement wing</span>
        </div>

        <div className="neo-kpi-card">
          <span className="text-[10px] font-bold text-[#e08a0b] uppercase tracking-wider block">
            In Evaluation
          </span>
          <span className="text-2xl font-bold text-[#e08a0b] tabular-nums mt-1 block">
            {stats.evaluating}
          </span>
          <span className="text-[10.5px] text-[#e08a0b] font-semibold mt-1 block">
            Technical / Commercial review
          </span>
        </div>

        <div className="neo-kpi-card">
          <span className="text-[10px] font-bold text-[#2563eb] uppercase tracking-wider block">
            Bids Invited / Open
          </span>
          <span className="text-2xl font-bold text-[#2563eb] tabular-nums mt-1 block">
            {stats.open}
          </span>
          <span className="text-[10.5px] text-[#2563eb] font-semibold mt-1 block">
            Receiving submissions
          </span>
        </div>

        <div className="neo-kpi-card">
          <span className="text-[10px] font-bold text-[#159557] uppercase tracking-wider block">
            L1 Awarded / Finalized
          </span>
          <span className="text-2xl font-bold text-[#159557] tabular-nums mt-1 block">
            {stats.awarded}
          </span>
          <span className="text-[10.5px] text-[#159557] font-semibold mt-1 block">
            Successful award
          </span>
        </div>
      </div>

      {/* ── Table Card ── */}
      <div className="bg-white border border-[#e4eaf2] rounded-xl shadow-xs overflow-hidden">
        {/* Filter Bar */}
        <div className="p-3 border-b border-[#e4eaf2] bg-[#f8fafc] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#93a2b8] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search tender ref, notice no, equipment, vendor..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-[32px] bg-white border border-[#e4eaf2] rounded-md text-xs text-[#152340] placeholder:text-[#93a2b8] pl-9 pr-3 focus:outline-none focus:border-[#2563eb]"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-[#6b7a93] font-medium">Stage:</span>
              <Select value={stageFilter} onValueChange={setStageFilter}>
                <SelectTrigger className="h-[32px] text-xs bg-white border-[#e4eaf2] w-48">
                  <SelectValue placeholder="All Stages" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">All Stages</SelectItem>
                  <SelectItem value="prep" className="text-xs">Document Preparation</SelectItem>
                  <SelectItem value="open" className="text-xs">Bids Invited / Open</SelectItem>
                  <SelectItem value="eval" className="text-xs">In Evaluation</SelectItem>
                  <SelectItem value="awarded" className="text-xs">L1 Awarded</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <span className="text-xs font-medium text-[#6b7a93]">
              Showing <span className="font-bold text-[#152340]">{filtered.length}</span> of {tenders.length}
            </span>
          </div>
        </div>

        {/* Table Body */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#e4eaf2] bg-[#f8fafc] text-[#6b7a93] font-bold uppercase tracking-wider text-[10.5px]">
                <th className="py-2.5 px-3">Tender Ref</th>
                <th className="py-2.5 px-3">Notice No.</th>
                <th className="py-2.5 px-3">Equipment / Item Description</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Current Stage</th>
                <th className="py-2.5 px-3 text-center">Bids Recd</th>
                <th className="py-2.5 px-3">Closing Date</th>
                <th className="py-2.5 px-3">Awarded L1 Bidder / Value</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eff3f8]">
              {filtered.map((t) => (
                <tr
                  key={t.tgmsidcRef}
                  className="hover:bg-[#eff5ff] transition-colors group"
                >
                  {/* Tender Ref */}
                  <td className="py-2.5 px-3">
                    <Link href={`/tenders/${t.id}`}>
                      <span className="font-mono font-bold text-[#2563eb] text-[11.5px] hover:underline cursor-pointer">
                        {t.tgmsidcRef}
                      </span>
                    </Link>
                  </td>

                  {/* Notice No */}
                  <td className="py-2.5 px-3">
                    <span className="font-mono text-[11px] text-[#3c4a63]">
                      {t.tenderNoticeNo}
                    </span>
                  </td>

                  {/* Equipment */}
                  <td className="py-2.5 px-3">
                    <span className="font-medium text-[#152340] truncate max-w-[210px] block" title={t.equipmentName}>
                      {t.equipmentName}
                    </span>
                  </td>

                  {/* Category */}
                  <td className="py-2.5 px-3 text-[#6b7a93] text-[11px] whitespace-nowrap">
                    {t.category}
                  </td>

                  {/* Current Stage */}
                  <td className="py-2.5 px-3">
                    <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-full border", getStageBadgeColor(t.stageKey))}>
                      {t.currentStage}
                    </span>
                  </td>

                  {/* Bids Count */}
                  <td className="py-2.5 px-3 text-center">
                    {t.participationCount != null ? (
                      <span className="font-semibold text-[#152340] tabular-nums">
                        {t.participationCount} Bidders
                      </span>
                    ) : (
                      <span className="text-[#93a2b8]">—</span>
                    )}
                  </td>

                  {/* Closing Date */}
                  <td className="py-2.5 px-3 text-[#6b7a93] text-[11px] whitespace-nowrap">
                    {t.bidCloseDate ? format(new Date(t.bidCloseDate), "dd MMM yyyy") : "—"}
                  </td>

                  {/* Awarded L1 */}
                  <td className="py-2.5 px-3">
                    {t.awardedVendor ? (
                      <div>
                        <span className="font-semibold text-[#152340] truncate max-w-[150px] block text-[11px]">
                          {t.awardedVendor}
                        </span>
                        {t.awardedAmount != null && (
                          <span className="text-[10.5px] text-[#159557] font-semibold tabular-nums">
                            {fmt(t.awardedAmount)}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-[#93a2b8] text-[11px] italic">Evaluation pending</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="py-2.5 px-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Link href={`/tenders/${t.id}`}>
                        <button
                          title="Open Tender Full Detail"
                          className="px-2 py-1 bg-white border border-[#e4eaf2] text-[#3c4a63] hover:border-[#2563eb] hover:text-[#2563eb] rounded text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Eye className="w-3 h-3" />
                          <span>View</span>
                        </button>
                      </Link>

                      <button
                        onClick={() => openEditModal(t)}
                        title="Manually Update Status & Notes"
                        className="px-2 py-1 bg-[#f0f7ff] border border-[#bae0ff] text-[#0066cc] hover:bg-[#e6f4ff] rounded text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Update</span>
                      </button>

                      <button
                        onClick={() => setDetailModal(t)}
                        title="Milestone Timeline Summary"
                        className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                      >
                        <Clock className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div className="text-center py-12 text-[#6b7a93]">
              <Gavel className="w-8 h-8 text-[#93a2b8] mx-auto mb-2" />
              <p className="text-xs font-semibold text-[#152340]">No tenders found</p>
              <p className="text-[11px] text-[#6b7a93] mt-0.5">Try refining your search terms or filter.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Manual Status Update Dialog ── */}
      <Dialog open={!!editModal} onOpenChange={() => setEditModal(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-primary" />
              Update Tender Stage & Status — {editModal?.tgmsidcRef}
            </DialogTitle>
          </DialogHeader>

          {editModal && (
            <div className="space-y-3.5 py-1 text-sm">
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700">
                <span className="font-semibold text-slate-900">{editModal.equipmentName}</span>
                <p className="text-[11px] text-slate-500 mt-0.5">Notice No: {editModal.tenderNoticeNo}</p>
              </div>

              {/* Stage Dropdown */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Current Procurement Stage</Label>
                <Select
                  value={editForm.stageKey}
                  onValueChange={(val) => {
                    const st = STATUTORY_STAGES.find((s) => s.key === val);
                    setEditForm({
                      ...editForm,
                      stageKey: val,
                      currentStage: st?.label ?? val,
                    });
                  }}
                >
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue placeholder="Select procurement stage" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUTORY_STAGES.map((s, idx) => (
                      <SelectItem key={s.key} value={s.key} className="text-xs">
                        {idx + 1}. {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Bids Count & Closing Date */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Bids Received Count</Label>
                  <Input
                    type="number"
                    value={editForm.participationCount}
                    onChange={(e) => setEditForm({ ...editForm, participationCount: e.target.value })}
                    placeholder="e.g. 4"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Bid Closing / Key Date</Label>
                  <Input
                    type="date"
                    value={editForm.bidCloseDate}
                    onChange={(e) => setEditForm({ ...editForm, bidCloseDate: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              {/* L1 Vendor & Amount */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">L1 Awarded Vendor (if finalized)</Label>
                  <Input
                    value={editForm.awardedVendor}
                    onChange={(e) => setEditForm({ ...editForm, awardedVendor: e.target.value })}
                    placeholder="Vendor / Agency Name"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">L1 Bid Amount (₹)</Label>
                  <Input
                    type="number"
                    value={editForm.awardedAmount}
                    onChange={(e) => setEditForm({ ...editForm, awardedAmount: e.target.value })}
                    placeholder="Amount in Rupees"
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              {/* Remarks / Officer Notes */}
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Status Remarks / Meeting Notes</Label>
                <Textarea
                  rows={3}
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  placeholder="Record evaluation outcome, committee decisions, or corrigendum details..."
                  className="text-xs resize-none"
                />
              </div>
            </div>
          )}

          <DialogFooter className="mt-2">
            <Button variant="outline" size="sm" onClick={() => setEditModal(null)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveStatus} className="gap-1.5">
              <Check className="w-3.5 h-3.5" />
              <span>Save Status Update</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Detail / Milestone Summary Dialog ── */}
      <Dialog open={!!detailModal} onOpenChange={() => setDetailModal(null)}>
        <DialogContent className="max-w-2xl">
          {detailModal && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between text-base">
                  <span>Tender Detail — {detailModal.tgmsidcRef}</span>
                  <Badge variant="outline" className={cn("text-xs", getStageBadgeColor(detailModal.stageKey))}>
                    {detailModal.currentStage}
                  </Badge>
                </DialogTitle>
              </DialogHeader>

              <Tabs defaultValue="milestones" className="mt-2">
                <TabsList className="grid grid-cols-2">
                  <TabsTrigger value="milestones">Statutory Milestone Progress</TabsTrigger>
                  <TabsTrigger value="details">Tender Key Info</TabsTrigger>
                </TabsList>

                <TabsContent value="milestones" className="space-y-2 pt-3">
                  <div className="space-y-1.5">
                    {STATUTORY_STAGES.map((st, i) => {
                      const currentIdx = STATUTORY_STAGES.findIndex((s) => s.key === detailModal.stageKey);
                      const isDone = i < currentIdx;
                      const isCurrent = i === currentIdx;

                      return (
                        <div
                          key={st.key}
                          className={cn(
                            "flex items-center gap-3 p-2 rounded-lg text-xs",
                            isCurrent
                              ? "bg-primary/10 border border-primary/20 font-bold text-primary"
                              : isDone
                              ? "bg-slate-50 text-slate-700"
                              : "text-slate-400 opacity-70"
                          )}
                        >
                          <div
                            className={cn(
                              "h-5 w-5 rounded-full flex items-center justify-center text-[10px] shrink-0 font-bold",
                              isDone
                                ? "bg-emerald-600 text-white"
                                : isCurrent
                                ? "bg-primary text-white"
                                : "bg-slate-200 text-slate-500"
                            )}
                          >
                            {isDone ? "✓" : i + 1}
                          </div>
                          <span className="flex-1">{st.label}</span>
                          {isCurrent && (
                            <span className="text-[10px] uppercase tracking-wider font-bold bg-primary text-white px-1.5 py-0.5 rounded">
                              Active Stage
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </TabsContent>

                <TabsContent value="details" className="pt-3">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    {[
                      ["Notice No.", detailModal.tenderNoticeNo],
                      ["Equipment", detailModal.equipmentName],
                      ["Category", detailModal.category],
                      ["Estimated Value", fmt(detailModal.estimatedValue)],
                      ["Invited Date", detailModal.tenderInvitedDate ? format(new Date(detailModal.tenderInvitedDate), "dd MMM yyyy") : "—"],
                      ["Closing Date", detailModal.bidCloseDate ? format(new Date(detailModal.bidCloseDate), "dd MMM yyyy") : "—"],
                      ["Bids Received", detailModal.participationCount != null ? `${detailModal.participationCount} Bidders` : "Pending"],
                      ["Awarded Vendor", detailModal.awardedVendor ?? "Under Evaluation"],
                      ["Awarded Amount", detailModal.awardedAmount != null ? fmt(detailModal.awardedAmount) : "—"],
                      ["Archived Documents", `${detailModal.documentationCount} Files`],
                    ].map(([label, val]) => (
                      <div key={label} className="p-2 rounded bg-slate-50 border border-slate-100">
                        <span className="text-[10px] text-slate-500 block uppercase font-medium">{label}</span>
                        <span className="font-semibold text-slate-800 text-xs mt-0.5 block">{val}</span>
                      </div>
                    ))}
                  </div>

                  {detailModal.notes && (
                    <div className="mt-3 p-3 bg-amber-50/70 border border-amber-200 rounded-lg text-xs text-amber-900">
                      <p className="font-bold text-[11px] mb-1">Recorded Notes / Committee Observations</p>
                      <p className="leading-relaxed">{detailModal.notes}</p>
                    </div>
                  )}

                  <div className="mt-4 flex justify-end">
                    <Link href={`/tenders/${detailModal.id}`}>
                      <Button size="sm" className="gap-1.5">
                        <FileText className="w-3.5 h-3.5" />
                        <span>Open Complete Tender Documentation Page</span>
                      </Button>
                    </Link>
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
