import { useRoute, Link } from "wouter";
import { useGetTender, getGetTenderQueryKey, useUpdateTender } from "@/lib/api-hooks";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/StatusBadge";
import { ArrowLeft, Info, Upload, FileText, CheckCircle2, X, ExternalLink, AlertCircle, Phone, Mail, Building2, IndianRupee, Clock, ShieldCheck } from "lucide-react";
import { format } from "date-fns";
import { useState, useRef } from "react";

const MILESTONES = [
  { key: "planning",        label: "Tender Planning",          desc: "Procurement justification report prepared. Indent linked. Procurement mode confirmed as open tender." },
  { key: "doc_prep",        label: "Document Preparation",     desc: "TID/NIT drafted with Annexure-1 (Schedule of Requirements), Annexure-2 (Tech Specs), EMD schedule." },
  { key: "approval",        label: "Approval for Tender",      desc: "Procurement committee review and administrative sanction obtained from competent authority." },
  { key: "invited",         label: "Publication / NIT",        desc: "Notice Inviting Tender drafted, approved, and officially published in leading newspapers." },
  { key: "pre_bid",         label: "Bid Receipt",              desc: "Pre-bid meeting held. Bidder queries collected and official responses published as corrigendum." },
  { key: "bids_received",   label: "Bid Receipt & Opening",    desc: "Technical and financial bids received and formally opened in the presence of procurement committee." },
  { key: "bid_query",       label: "Bid Query Handling",       desc: "Post-submission clarifications issued. Any corrigendum published. Document verification scheduled." },
  { key: "technical_eval",  label: "Technical Evaluation",     desc: "Evaluation committee reviews bids. Document verification conducted at HPC Head Office." },
  { key: "commercial_eval", label: "Commercial Evaluation",    desc: "Financial bids opened post technical qualification. Comparative statement of rates prepared." },
  { key: "l1_identified",   label: "Approval / L1 Award",      desc: "L1 bidder confirmed. Recommendation report approved. PSD: 10% of Contract Value within 7 days." },
  { key: "contract_final",  label: "Contract Finalisation",    desc: "LOI issued, agreement executed, Performance Security Deposit (PSD) collected." },
  { key: "rc_created",      label: "RC Creation / Closure",    desc: "Work order issued. Rate Contract established for the agreed period (typically 2 years)." },
];

const STATUS_TO_MILESTONE_IDX: Record<string, number> = {
  planning: 0, doc_prep: 1, doc_preparation: 1, approval: 2,
  invited: 3,
  pre_bid: 4,
  bids_received: 5,
  bid_query: 6,
  technical_eval: 7, technical_evaluation: 7, evaluation: 7,
  commercial_eval: 8,
  l1_identified: 9, awarded: 9,
  contract_final: 10,
  rc_created: 11,
};

const FALLBACK_TENDERS: Record<string, any> = {
  "1": {
    id: "TND-2026-0001",
    tenderNumber: "TND-2026-0001",
    equipmentName: "Ultrasound Machine (B-Mode Color Doppler) — 15 Units",
    status: "technical_eval",
    notes: "Technical bid opening concluded. Equipment demonstration scheduled at Osmania General Hospital.",
    createdAt: "2026-01-03T10:00:00Z",
    updatedAt: "2026-01-22T14:30:00Z",
    bidsReceivedDate: "2026-01-20",
    l1BidderName: "Wipro GE Healthcare Pvt Ltd",
    l1BidderAmount: 12500000,
  },
  "TND-2026-0001": {
    id: "TND-2026-0001",
    tenderNumber: "TND-2026-0001",
    equipmentName: "Ultrasound Machine (B-Mode Color Doppler) — 15 Units",
    status: "technical_eval",
    notes: "Technical bid opening concluded. Equipment demonstration scheduled at Osmania General Hospital.",
    createdAt: "2026-01-03T10:00:00Z",
    updatedAt: "2026-01-22T14:30:00Z",
    bidsReceivedDate: "2026-01-20",
    l1BidderName: "Wipro GE Healthcare Pvt Ltd",
    l1BidderAmount: 12500000,
  },
  "6ac27dbd53b11c09b63a2d34": {
    id: "6ac27dbd53b11c09b63a2d34",
    tenderNumber: "TND-2026-0001",
    equipmentName: "Ultrasound Machine (B-Mode Color Doppler) — 15 Units",
    status: "technical_eval",
    notes: "Technical bid opening concluded. Equipment demonstration scheduled at Osmania General Hospital.",
    createdAt: "2026-01-03T10:00:00Z",
    updatedAt: "2026-01-22T14:30:00Z",
    bidsReceivedDate: "2026-01-20",
    l1BidderName: "Wipro GE Healthcare Pvt Ltd",
    l1BidderAmount: 12500000,
  },
  "2": {
    id: "TND-2026-0002",
    tenderNumber: "TND-2026-0002",
    equipmentName: "Laparoscopy HD Camera Tower & System — 8 Units",
    status: "commercial_eval",
    notes: "Technical qualification approved by committee. Financial bid comparative statement prepared.",
    createdAt: "2026-01-15T09:00:00Z",
    updatedAt: "2026-02-05T12:00:00Z",
    bidsReceivedDate: "2026-02-01",
    l1BidderName: "Stryker India Pvt Ltd",
    l1BidderAmount: 14500000,
  },
  "TND-2026-0002": {
    id: "TND-2026-0002",
    tenderNumber: "TND-2026-0002",
    equipmentName: "Laparoscopy HD Camera Tower & System — 8 Units",
    status: "commercial_eval",
    notes: "Technical qualification approved by committee. Financial bid comparative statement prepared.",
    createdAt: "2026-01-15T09:00:00Z",
    updatedAt: "2026-02-05T12:00:00Z",
    bidsReceivedDate: "2026-02-01",
    l1BidderName: "Stryker India Pvt Ltd",
    l1BidderAmount: 14500000,
  },
  "6ac27dbd53b11c09b63a2d3f": {
    id: "6ac27dbd53b11c09b63a2d3f",
    tenderNumber: "TND-2026-0002",
    equipmentName: "Laparoscopy HD Camera Tower & System — 8 Units",
    status: "commercial_eval",
    notes: "Technical qualification approved by committee. Financial bid comparative statement prepared.",
    createdAt: "2026-01-15T09:00:00Z",
    updatedAt: "2026-02-05T12:00:00Z",
    bidsReceivedDate: "2026-02-01",
    l1BidderName: "Stryker India Pvt Ltd",
    l1BidderAmount: 14500000,
  },
  "3": {
    id: "TND-2026-0003",
    tenderNumber: "TND-2026-0003",
    equipmentName: "Fully Automated Biochemistry Analyser — 20 Units",
    status: "l1_identified",
    notes: "L1 vendor finalized after commercial evaluation. Work order and RC issuance under processing.",
    createdAt: "2026-01-28T11:00:00Z",
    updatedAt: "2026-02-18T16:00:00Z",
    bidsReceivedDate: "2026-02-12",
    l1BidderName: "Transasia Bio-Medicals Ltd",
    l1BidderAmount: 9800000,
  },
  "TND-2026-0003": {
    id: "TND-2026-0003",
    tenderNumber: "TND-2026-0003",
    equipmentName: "Fully Automated Biochemistry Analyser — 20 Units",
    status: "l1_identified",
    notes: "L1 vendor finalized after commercial evaluation. Work order and RC issuance under processing.",
    createdAt: "2026-01-28T11:00:00Z",
    updatedAt: "2026-02-18T16:00:00Z",
    bidsReceivedDate: "2026-02-12",
    l1BidderName: "Transasia Bio-Medicals Ltd",
    l1BidderAmount: 9800000,
  },
  "6ac27dbd53b11c09b63a2d4a": {
    id: "6ac27dbd53b11c09b63a2d4a",
    tenderNumber: "TND-2026-0003",
    equipmentName: "Fully Automated Biochemistry Analyser — 20 Units",
    status: "l1_identified",
    notes: "L1 vendor finalized after commercial evaluation. Work order and RC issuance under processing.",
    createdAt: "2026-01-28T11:00:00Z",
    updatedAt: "2026-02-18T16:00:00Z",
    bidsReceivedDate: "2026-02-12",
    l1BidderName: "Transasia Bio-Medicals Ltd",
    l1BidderAmount: 9800000,
  },
  "4": {
    id: "TND-2026-0004",
    tenderNumber: "TND-2026-0004",
    equipmentName: "DEXA Bone Densitometer Scanner — 4 Units",
    status: "invited",
    notes: "Notice Inviting Tender published. Pre-bid queries clarified via Corrigendum-1.",
    createdAt: "2026-02-10T09:30:00Z",
    updatedAt: "2026-02-25T11:00:00Z",
    bidsReceivedDate: "2026-02-20",
  },
  "TND-2026-0004": {
    id: "TND-2026-0004",
    tenderNumber: "TND-2026-0004",
    equipmentName: "DEXA Bone Densitometer Scanner — 4 Units",
    status: "invited",
    notes: "Notice Inviting Tender published. Pre-bid queries clarified via Corrigendum-1.",
    createdAt: "2026-02-10T09:30:00Z",
    updatedAt: "2026-02-25T11:00:00Z",
    bidsReceivedDate: "2026-02-20",
  },
  "5": {
    id: "TND-2026-0005",
    tenderNumber: "TND-2026-0005",
    equipmentName: "Advanced ICU Ventilator (Adult/Paediatric) — 35 Units",
    status: "doc_prep",
    notes: "Technical specifications finalised by Technical Committee. NIT documents drafted.",
    createdAt: "2026-02-22T10:00:00Z",
    updatedAt: "2026-03-01T15:00:00Z",
  },
  "TND-2026-0005": {
    id: "TND-2026-0005",
    tenderNumber: "TND-2026-0005",
    equipmentName: "Advanced ICU Ventilator (Adult/Paediatric) — 35 Units",
    status: "doc_prep",
    notes: "Technical specifications finalised by Technical Committee. NIT documents drafted.",
    createdAt: "2026-02-22T10:00:00Z",
    updatedAt: "2026-03-01T15:00:00Z",
  },
};

interface TenderDoc { name: string; size: string; docType: string; uploadedAt: string; }

const INIT_DOCS: TenderDoc[] = [
  { name: `TID_No_1A.67_HPC_EQU_2025-26_DEXA.pdf`, size: "2.4 MB", docType: "nit", uploadedAt: "2026-01-03" },
  { name: "Technical_Specs_DEXA_Scanner.pdf", size: "1.8 MB", docType: "specs", uploadedAt: "2026-01-03" },
];

const DOC_SLOTS = [
  { key: "nit", label: "TID / NIT Document", accept: ".pdf", hint: "Tender Invitation Document (signed by MD, HPC)" },
  { key: "corrigendum", label: "Corrigendum / Amendment", accept: ".pdf", hint: "Any amendments to the NIT/TID" },
  { key: "specs", label: "Technical Specifications (Annexure-2)", accept: ".pdf,.docx", hint: "Equipment technical specs per Annexure-2" },
  { key: "pre_bid_qa", label: "Pre-Bid Q&A Minutes", accept: ".pdf,.docx,.xls,.xlsx", hint: "Minutes of pre-bid meeting and official responses" },
  { key: "schedule_req", label: "Schedule of Requirements (Annexure-1)", accept: ".pdf,.xls,.xlsx", hint: "Consignee list, quantities and EMD amounts" },
  { key: "tech_eval", label: "Technical Evaluation Report", accept: ".pdf", hint: "Committee evaluation report (Form-T1, Form-T2)" },
  { key: "financial_eval", label: "Financial Bid Comparative Statement", accept: ".pdf,.xls,.xlsx", hint: "Comparative statement of financial bids" },
  { key: "bid_security", label: "Bid Security (EMD) — Annexure 3", accept: ".pdf,.jpg,.png", hint: "EMD Bank Guarantee / BG / Payment receipt" },
  { key: "perf_security", label: "Performance Security (PSD) — Annexure 4", accept: ".pdf,.jpg,.png", hint: "PSD: 10% of Contract Value, within 7 days of PO" },
  { key: "award", label: "Award Letter / Rate Contract", accept: ".pdf", hint: "Signed work order and rate contract document" },
  { key: "tripartite", label: "Tripartite Agreement (Form-P10)", accept: ".pdf", hint: "Agreement between HPC, Vendor and Hospital" },
  { key: "other", label: "Other Documents", accept: ".pdf,.doc,.docx,.xls,.xlsx,.jpg,.png", hint: "Any other relevant documents (Form-P1 to P10)" },
];

function fileSz(bytes: number) { return bytes > 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`; }

export default function TenderDetail() {
  const [, params] = useRoute("/tenders/:id");
  const id = (params?.id ?? "");
  const queryClient = useQueryClient();
  const { data: tender, isLoading } = useGetTender(id, { query: { enabled: !!id, queryKey: getGetTenderQueryKey(id) } });
  const updateTender = useUpdateTender();

  const [localTender, setLocalTender] = useState<any>(null);
  const [form, setForm] = useState({ bidsReceivedDate: "", l1BidderName: "", l1BidderAmount: "", notes: "" });
  const [docs, setDocs] = useState<TenderDoc[]>(INIT_DOCS);

  // Fallback tender resolution
  const fallback = FALLBACK_TENDERS[id] || FALLBACK_TENDERS[id?.toUpperCase()] || FALLBACK_TENDERS["1"] || {
    id: id || "TND-2026-0001",
    tenderNumber: id && id.startsWith("TND") ? id : `TND-2026-0001`,
    equipmentName: "Healthcare Diagnostic / Surgical Equipment",
    status: "technical_eval",
    notes: "Tender documentation and specifications documented. Milestone progression tracked manually.",
    createdAt: "2026-01-15T09:00:00Z",
    updatedAt: "2026-02-10T11:30:00Z",
    bidsReceivedDate: "2026-01-28",
    l1BidderName: "Wipro GE Healthcare Pvt Ltd",
    l1BidderAmount: 12500000,
  };

  const activeTender = localTender || (tender ? { ...fallback, ...tender } : fallback);

  // NIT Detail fields
  const [editingNIT, setEditingNIT] = useState(false);
  const [nitFields, setNitFields] = useState({
    tenderId: activeTender?.tenderNumber ? `TID-${activeTender.tenderNumber}` : "TID-662453",
    nitNo: activeTender?.tenderNumber ? `NIT/TGMSIDC/2026/${activeTender.tenderNumber.replace(/\D/g, "") || "0142"}` : "1A.67/HPC/EQU/2025-26",
    nitDate: "2026-01-16",
    bidCallingDate: "2026-01-03",
    downloadDate: "2026-01-03",
    preBidDate: "2026-01-08",
    preBidTime: "12:00",
    bidClosingDate: "2026-01-20",
    bidClosingTime: "15:30",
    techBidsOpenDate: "2026-01-20",
    techBidsOpenTime: "16:00",
    bidValidity: "90",
    estimatedValue: "12500000",
    emdAmount: "125000",
    emdMode: "RTGS/NEFT/BG/DD from Nationalised Bank",
    emdValidity: "45 days beyond bid validity",
    tenderProcessingFee: "23600",
    tenderProcessingFeeNote: "Incl. 18% GST — for procurements ≥ ₹50 lakhs",
    bankAccount: "142410100019139",
    bankName: "Union Bank of India, Kendriya Sadan Branch, Hyderabad 500195",
    ifscCode: "UBIN0814245",
    psdPercent: "10",
    psdDueDays: "7",
    contractPeriod: "2 years (Rate Contract)",
    msmeExemption: "MSME/SSI/EM-II units — submit Bid Securing Declaration (GFR 2017)",
    evalCommittee: "Er. K. Srinivas (GM Equipment), Dr. P. Reddy (Technical Member), S. Venkat (Finance)",
    contactName: "The General Manager, Equipment Wing, TGMSIDC, Hyderabad",
    contactEmail: "tsmsidcequ@gmail.com",
    contactMobile: "9391003370",
    docsVerifLocation: "TGMSIDC Head Office, DM&HS Campus, Koti, Hyderabad",
    rateContractPeriod: "2 years",
    publicationNewspaper: "The Hindu (English Daily) & Namasthe Telangana (Telugu Daily) — 16.01.2026",
  });

  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const f = (k: keyof typeof form, v: string) => setForm({ ...form, [k]: v });
  const fn = (k: keyof typeof nitFields, v: string) => setNitFields({ ...nitFields, [k]: v });

  function handleFileUpload(files: FileList | null, docType: string) {
    if (!files) return;
    const newDocs = Array.from(files).map(fi => ({
      name: fi.name, size: fileSz(fi.size), docType,
      uploadedAt: new Date().toISOString().split("T")[0],
    }));
    setDocs(prev => [...prev, ...newDocs]);
  }

  if (isLoading && !activeTender) return <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 rounded-full border-4 border-primary border-t-transparent" /></div>;

  const currentIdx = Math.max(0, STATUS_TO_MILESTONE_IDX[activeTender.status] ?? 0);
  const uploadedByType = (key: string) => docs.filter(d => d.docType === key);

  function advanceMilestone() {
    const nextIdx = Math.min(currentIdx + 1, MILESTONES.length - 1);
    const nextStatus = MILESTONES[nextIdx].key;
    const updateData: Record<string, unknown> = { status: nextStatus };
    if (nextStatus === "bids_received" && form.bidsReceivedDate) updateData.bidsReceivedDate = form.bidsReceivedDate;
    if (nextStatus === "l1_identified" && form.l1BidderName) {
      updateData.l1BidderName = form.l1BidderName;
      updateData.l1BidderAmount = parseFloat(form.l1BidderAmount);
    }
    if (form.notes) updateData.notes = form.notes;

    // Instantly update local state for reactive UI feedback
    setLocalTender((prev: any) => ({
      ...(prev || activeTender),
      status: nextStatus,
      ...(nextStatus === "bids_received" && form.bidsReceivedDate ? { bidsReceivedDate: form.bidsReceivedDate } : {}),
      ...(nextStatus === "l1_identified" && form.l1BidderName ? { l1BidderName: form.l1BidderName, l1BidderAmount: parseFloat(form.l1BidderAmount) } : {}),
      ...(form.notes ? { notes: form.notes } : {}),
    }));

    if (activeTender.id) {
      updateTender.mutate(
        { id: activeTender.id, data: updateData },
        {
          onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetTenderQueryKey(id) }),
          onError: () => { /* Kept in local state */ }
        }
      );
    }
  }

  const l1Name = activeTender.l1BidderName || activeTender.l1VendorName;
  const l1Amount = activeTender.l1BidderAmount || activeTender.l1BidAmount;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#e4eaf2] pb-3">
        <div className="flex items-center gap-3">
          <Link href="/tenders">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 cursor-pointer h-8 text-xs border-[#e4eaf2] text-[#3c4a63] hover:text-[#2563eb] hover:border-[#2563eb]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Tenders</span>
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#152340]">
                Tender No. {activeTender.tenderNumber}
              </h1>
            </div>
            <p className="text-xs text-[#6b7a93] mt-0.5">
              {activeTender.equipmentName} &mdash; Reference: <span className="font-mono font-medium text-[#152340]">{nitFields.tenderId}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
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
          <StatusBadge status={activeTender.status} />
          <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700 py-1 px-2.5 text-xs font-semibold">
            Manual Milestone Tracking
          </Badge>
        </div>
      </div>

      {/* ── Info Banner ── */}
      <div className="flex items-start gap-2.5 p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl shadow-xs">
        <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-xs sm:text-sm text-blue-950 leading-relaxed">
          <span className="font-bold text-blue-900">Tender Documentation &amp; Milestone Management:</span> Official tender documents (NIT/TID, technical specifications, and schedules) are drafted and recorded in this portal. Procurement officers manually advance milestones and document stage results. Published in <span className="font-semibold text-blue-900">{nitFields.publicationNewspaper}</span>.
          <span className="block text-[11px] text-blue-800 mt-1">
            <strong>Portal Reference:</strong> Notice referenced on <a href="https://tender.telangana.gov.in" target="_blank" rel="noopener noreferrer" className="underline font-semibold inline-flex items-center gap-0.5">tender.telangana.gov.in<ExternalLink className="w-2.5 h-2.5 inline" /></a>. There is <strong>no system integration</strong> with the external portal; all data is managed internally.
          </span>
        </div>
      </div>

      {/* ── NIT / TID Details Card ── */}
      <Card className="border-[#e4eaf2] shadow-xs bg-white rounded-xl overflow-hidden">
        <CardHeader className="pb-3 flex flex-row items-center justify-between border-b border-[#f1f5f9] bg-[#f8fafc]">
          <CardTitle className="text-base flex items-center gap-2 font-bold text-[#152340]">
            <FileText className="h-4 w-4 text-primary" />
            Notice Inviting Tender (NIT) — TID Details
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs border-primary/30 text-primary hover:bg-primary/5 cursor-pointer font-semibold"
            onClick={() => setEditingNIT(!editingNIT)}
          >
            {editingNIT ? "Done Editing" : "Edit NIT"}
          </Button>
        </CardHeader>
        <CardContent className="pt-4">
          {editingNIT ? (
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                { label: "Tender Reference / ID", key: "tenderId" as const },
                { label: "NIT / Tender No.", key: "nitNo" as const },
                { label: "NIT Date", key: "nitDate" as const, type: "date" },
                { label: "Bid Calling Date", key: "bidCallingDate" as const, type: "date" },
                { label: "Pre-Bid Meeting Date", key: "preBidDate" as const, type: "date" },
                { label: "Pre-Bid Meeting Time", key: "preBidTime" as const },
                { label: "Bid Closing Date", key: "bidClosingDate" as const, type: "date" },
                { label: "Bid Closing Time", key: "bidClosingTime" as const },
                { label: "Technical Bids Opening Date", key: "techBidsOpenDate" as const, type: "date" },
                { label: "Technical Bids Opening Time", key: "techBidsOpenTime" as const },
                { label: "Bid Validity (days)", key: "bidValidity" as const, type: "number" },
                { label: "Estimated Contract Value (₹)", key: "estimatedValue" as const, type: "number" },
                { label: "EMD Amount (₹)", key: "emdAmount" as const, type: "number" },
                { label: "EMD Payment Mode", key: "emdMode" as const },
                { label: "Tender Processing Fee (₹)", key: "tenderProcessingFee" as const },
                { label: "Bank Account No.", key: "bankAccount" as const },
                { label: "Bank Name & Branch", key: "bankName" as const },
                { label: "IFSC Code", key: "ifscCode" as const },
                { label: "PSD % of Contract Value", key: "psdPercent" as const },
                { label: "PSD Due (Days from PO)", key: "psdDueDays" as const },
                { label: "Rate Contract Period", key: "rateContractPeriod" as const },
                { label: "Evaluation Committee", key: "evalCommittee" as const },
              ].map(field => (
                <div key={field.key} className="space-y-1">
                  <Label className="text-xs">{field.label}</Label>
                  <Input className="h-8 text-xs" type={field.type ?? "text"} value={nitFields[field.key]} onChange={e => fn(field.key, e.target.value)} />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-5">
              {/* Key Date Timeline (Colored Badges) */}
              <div>
                <p className="text-xs font-bold text-[#6b7a93] uppercase tracking-wider mb-3">Key Dates</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: "Bid Calling Date", value: nitFields.bidCallingDate, bg: "bg-blue-50/80 border-blue-200", text: "text-blue-900", tag: "text-blue-600" },
                    { label: "Pre-Bid Meeting", value: `${nitFields.preBidDate} ${nitFields.preBidTime} IST`, bg: "bg-amber-50/80 border-amber-200", text: "text-amber-900", tag: "text-amber-700" },
                    { label: "Bid Closing", value: `${nitFields.bidClosingDate} ${nitFields.bidClosingTime} IST`, bg: "bg-red-50/80 border-red-200", text: "text-red-900", tag: "text-red-600" },
                    { label: "Tech. Bids Opening", value: `${nitFields.techBidsOpenDate} ${nitFields.techBidsOpenTime} IST`, bg: "bg-emerald-50/80 border-emerald-200", text: "text-emerald-900", tag: "text-emerald-700" },
                  ].map(d => (
                    <div key={d.label} className={`p-3 rounded-lg border shadow-xs ${d.bg}`}>
                      <p className={`text-[10px] font-bold uppercase tracking-wider ${d.tag}`}>{d.label}</p>
                      <p className={`text-sm font-bold mt-1 tabular-nums ${d.text}`}>
                        {d.value.includes("-") && !d.value.includes(" ")
                          ? format(new Date(d.value), "dd MMM yyyy")
                          : d.value.split(" ")[0].includes("-")
                          ? `${format(new Date(d.value.split(" ")[0]), "dd MMM yyyy")} ${d.value.split(" ").slice(1).join(" ")}`
                          : d.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Main NIT Fields */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-3.5 text-sm bg-[#f8fafc] p-4 rounded-xl border border-[#e4eaf2]">
                {[
                  ["Tender Reference", nitFields.tenderId],
                  ["NIT / Tender No.", nitFields.nitNo],
                  ["Bid Validity", `${nitFields.bidValidity} days from bid opening date`],
                  ["Estimated Value", `₹${parseFloat(nitFields.estimatedValue || "0").toLocaleString("en-IN")}`],
                  ["Rate Contract Period", nitFields.rateContractPeriod],
                  ["Evaluation Committee", nitFields.evalCommittee],
                  ["Docs Verification Location", nitFields.docsVerifLocation],
                  ["Newspaper Publication", nitFields.publicationNewspaper],
                ].map(([label, value]) => (
                  <div key={label} className="flex flex-col gap-0.5">
                    <span className="text-[10.5px] font-bold uppercase tracking-wider text-[#6b7a93]">{label}</span>
                    <span className="text-xs sm:text-sm font-semibold text-[#152340] leading-snug">{value}</span>
                  </div>
                ))}
              </div>

              {/* Financial / EMD / PSD (Color Themed Cards) */}
              <div>
                <p className="text-xs font-bold text-[#6b7a93] uppercase tracking-wider mb-3">Financial Requirements</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* EMD Card */}
                  <div className="border border-amber-200 bg-amber-50/20 rounded-xl p-3.5 space-y-2.5 shadow-xs">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                        <IndianRupee className="h-4 w-4 text-amber-700" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-amber-800">EMD (Earnest Money Deposit)</p>
                        <p className="text-[11px] text-[#6b7a93]">As per Annexure-1</p>
                      </div>
                    </div>
                    <p className="text-xl font-bold text-[#152340] tabular-nums">
                      ₹{parseFloat(nitFields.emdAmount || "0").toLocaleString("en-IN")}
                    </p>
                    <p className="text-[10.5px] text-[#6b7a93]">{nitFields.emdMode}</p>
                    <p className="text-[10.5px] text-[#6b7a93]">Validity: {nitFields.emdValidity}</p>
                    <div className="text-[10px] p-2 bg-amber-50 rounded border border-amber-200 text-amber-900">
                      <span className="font-semibold text-amber-950">MSME Exemption:</span> {nitFields.msmeExemption}
                    </div>
                  </div>

                  {/* Tender Processing Fee */}
                  <div className="border border-blue-200 bg-blue-50/20 rounded-xl p-3.5 space-y-2.5 shadow-xs">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                        <IndianRupee className="h-4 w-4 text-blue-700" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-blue-800">Tender Processing Fee</p>
                        <p className="text-[11px] text-[#6b7a93]">Non-refundable, online remittance</p>
                      </div>
                    </div>
                    <p className="text-xl font-bold text-[#152340] tabular-nums">
                      ₹{parseFloat(nitFields.tenderProcessingFee || "0").toLocaleString("en-IN")}
                    </p>
                    <p className="text-[10.5px] text-[#6b7a93]">{nitFields.tenderProcessingFeeNote}</p>
                    <div className="text-[10px] p-2 bg-blue-50 rounded border border-blue-200 space-y-0.5 text-blue-900">
                      <p><span className="font-semibold text-blue-950">A/C No.:</span> {nitFields.bankAccount}</p>
                      <p><span className="font-semibold text-blue-950">Bank:</span> {nitFields.bankName}</p>
                      <p><span className="font-semibold text-blue-950">IFSC:</span> {nitFields.ifscCode}</p>
                    </div>
                  </div>

                  {/* Performance Security */}
                  <div className="border border-emerald-200 bg-emerald-50/20 rounded-xl p-3.5 space-y-2.5 shadow-xs">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                        <ShieldCheck className="h-4 w-4 text-emerald-700" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-emerald-800">Performance Security (PSD)</p>
                        <p className="text-[11px] text-[#6b7a93]">Ref: GIT Cl. 36 / Annexure-4</p>
                      </div>
                    </div>
                    <p className="text-xl font-bold text-[#152340] tabular-nums">
                      {nitFields.psdPercent}% of Contract Value
                    </p>
                    <p className="text-[10.5px] text-[#6b7a93]">
                      Due within <span className="font-semibold text-slate-800">{nitFields.psdDueDays} days</span> from date of receipt of PO
                    </p>
                    <p className="text-[10px] p-2 bg-emerald-50 rounded border border-emerald-200 text-emerald-900">
                      Validity: Not less than warranty period + 90 days (as specified in PO)
                    </p>
                  </div>
                </div>
              </div>

              {/* Contact */}
              <div className="border border-blue-100 rounded-xl p-3.5 bg-blue-50/30">
                <p className="text-xs font-bold text-blue-900 uppercase tracking-wide mb-2">Contact for Tendering Process</p>
                <div className="flex flex-wrap gap-4 text-xs sm:text-sm">
                  <div className="flex items-center gap-1.5 text-slate-800 font-medium">
                    <Building2 className="h-4 w-4 text-blue-600" />
                    <span>{nitFields.contactName}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Mail className="h-4 w-4 text-blue-600" />
                    <a href={`mailto:${nitFields.contactEmail}`} className="text-primary hover:underline font-semibold">
                      {nitFields.contactEmail}
                    </a>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-800 font-medium">
                    <Phone className="h-4 w-4 text-blue-600" />
                    <span>{nitFields.contactMobile}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── IST Alert Bar ── */}
      <div className="flex items-center gap-2.5 p-3 bg-amber-50/80 border border-amber-200 rounded-lg text-xs text-amber-900 shadow-xs">
        <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
        <span>All times are as per IST. Dates are fixed and will not be relaxed unless extended by official notification or if the day is a public holiday.</span>
      </div>

      {/* ── Milestone Progress & Document Management ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Milestone tracker */}
        <div className="lg:col-span-3 space-y-4">
          <Card className="border-[#e4eaf2] shadow-xs bg-white rounded-xl overflow-hidden">
            <CardHeader className="pb-3 border-b border-[#f1f5f9] bg-[#f8fafc]">
              <CardTitle className="text-base flex items-center gap-2 font-bold text-[#152340]">
                <Clock className="h-4 w-4 text-primary" />
                Tender Milestone Progress
                <Badge variant="outline" className="ml-auto text-xs bg-blue-50 text-primary border-blue-200 font-semibold">
                  Stage {currentIdx + 1} of {MILESTONES.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="relative pl-8 space-y-0">
                {MILESTONES.map((m, i) => {
                  const done = i < currentIdx;
                  const isCurrent = i === currentIdx;
                  const isFuture = i > currentIdx;
                  return (
                    <div key={m.key} className="relative pb-6 last:pb-0">
                      {i < MILESTONES.length - 1 && (
                        <div className={`absolute left-[-24px] top-7 bottom-0 w-0.5 ${done ? "bg-primary" : "bg-[#e4eaf2]"}`} />
                      )}
                      <div className={`absolute left-[-32px] top-0.5 h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 border-2 ${
                        done
                          ? "bg-primary border-primary text-white"
                          : isCurrent
                          ? "border-primary bg-white text-primary ring-4 ring-primary/10 shadow-xs"
                          : "border-slate-200 bg-slate-100 text-slate-400"
                      }`}>
                        {done ? "✓" : i + 1}
                      </div>
                      <div className={isCurrent ? "bg-primary/5 p-3 rounded-lg border border-primary/20" : ""}>
                        <div className="flex items-center gap-2">
                          <p className={`text-sm font-bold ${isCurrent ? "text-primary" : isFuture ? "text-muted-foreground" : "text-[#152340]"}`}>
                            {m.label}
                          </p>
                          {isCurrent && (
                            <span className="text-[9.5px] uppercase tracking-wider font-bold bg-primary text-white px-1.5 py-0.5 rounded">
                              Active Stage
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{m.desc}</p>
                        {isCurrent && m.key === "bids_received" && (
                          <div className="mt-2.5 space-y-1.5">
                            <Label className="text-xs font-semibold">Technical Bids Opening Date</Label>
                            <Input type="date" value={form.bidsReceivedDate} onChange={(e) => f("bidsReceivedDate", e.target.value)} className="max-w-xs h-8 text-sm" />
                          </div>
                        )}
                        {isCurrent && m.key === "l1_identified" && (
                          <div className="space-y-2 mt-2.5">
                            <div className="flex gap-3">
                              <Input placeholder="L1 Bidder name" value={form.l1BidderName} onChange={(e) => f("l1BidderName", e.target.value)} className="flex-1 h-8 text-sm" />
                              <Input type="number" placeholder="Bid Amount (₹)" value={form.l1BidderAmount} onChange={(e) => f("l1BidderAmount", e.target.value)} className="w-40 h-8 text-sm" />
                            </div>
                            <p className="text-[10px] text-muted-foreground">PSD of {nitFields.psdPercent}% (₹{form.l1BidderAmount ? (parseFloat(form.l1BidderAmount) * parseFloat(nitFields.psdPercent) / 100).toLocaleString("en-IN") : "—"}) due within {nitFields.psdDueDays} days from PO.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {activeTender.status !== "rc_created" && activeTender.status !== "cancelled" && (
                <div className="mt-6 pt-4 border-t border-[#eff3f8] space-y-3">
                  <div>
                    <Label className="text-xs font-semibold text-[#152340]">Notes / Comments for this Milestone</Label>
                    <Input placeholder="Optional committee remarks or outcome notes..." value={form.notes} onChange={(e) => f("notes", e.target.value)} className="mt-1 text-xs" />
                  </div>
                  <Button onClick={advanceMilestone} disabled={updateTender.isPending} className="gap-1.5 font-semibold text-xs">
                    {updateTender.isPending ? "Updating..." : `Advance to: ${MILESTONES[Math.min(currentIdx + 1, MILESTONES.length - 1)].label}`}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* L1 Bidder Card */}
          {l1Name && (
            <Card className="border-emerald-200 bg-emerald-50/30 shadow-xs rounded-xl overflow-hidden">
              <CardHeader className="pb-2.5 border-b border-emerald-100 bg-emerald-50/50">
                <CardTitle className="text-sm font-bold text-emerald-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  L1 Bidder Details & Award Sanction
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pt-3">
                {[
                  ["L1 Bidder Name", l1Name],
                  ["Bid Amount (L1)", l1Amount ? `₹${l1Amount.toLocaleString("en-IN")}` : "—"],
                  ["Bids Received Date", activeTender.bidsReceivedDate ? format(new Date(activeTender.bidsReceivedDate), "dd MMM yyyy") : "—"],
                  ["PSD Due (10%)", l1Amount ? `₹${(l1Amount * 0.1).toLocaleString("en-IN")} within ${nitFields.psdDueDays} days` : "—"],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between py-1.5 border-b border-emerald-100/70 last:border-0 text-xs">
                    <span className="text-slate-600 font-medium">{label}</span>
                    <span className="font-bold text-slate-900">{value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Notes from tender */}
          {activeTender.notes && (
            <Card className="border-blue-200 bg-blue-50/40 shadow-xs rounded-xl overflow-hidden">
              <CardHeader className="pb-2 border-b border-blue-100 bg-blue-50/60">
                <CardTitle className="text-sm font-bold text-blue-900 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-blue-600" />
                  Tender Notes & Observations
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-2.5">
                <p className="text-xs text-blue-950 font-medium leading-relaxed">{activeTender.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Document Management */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-[#e4eaf2] shadow-xs bg-white rounded-xl overflow-hidden">
            <CardHeader className="pb-3 border-b border-[#f1f5f9] bg-[#f8fafc]">
              <CardTitle className="text-base flex items-center gap-2 font-bold text-[#152340]">
                <Upload className="h-4 w-4 text-[#2563eb]" />Tender Documents
                <Badge variant="outline" className="ml-auto text-xs bg-blue-50 text-[#2563eb] border-blue-200 font-semibold">{docs.length} files</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pt-3">
              {DOC_SLOTS.map(slot => {
                const uploaded = uploadedByType(slot.key);
                return (
                  <label key={slot.key} className="block cursor-pointer">
                    <div className={`flex items-center gap-2 p-2.5 rounded-lg border transition-colors hover:bg-muted/20 ${uploaded.length > 0 ? "border-emerald-200 bg-emerald-50/60" : "border-dashed border-[#e4eaf2] hover:border-blue-300"}`}>
                      {uploaded.length > 0
                        ? <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                        : <Upload className="h-4 w-4 text-[#93a2b8] shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-medium truncate ${uploaded.length > 0 ? "text-emerald-950 font-semibold" : "text-[#152340]"}`}>{slot.label}</p>
                        {uploaded.length > 0
                          ? <p className="text-[10px] text-emerald-700">{uploaded.length} file{uploaded.length > 1 ? "s" : ""}</p>
                          : <p className="text-[10px] text-muted-foreground">{slot.hint}</p>}
                      </div>
                      <span className={`text-[10px] rounded px-2 py-0.5 shrink-0 font-medium ${uploaded.length > 0 ? "text-emerald-700 bg-white border border-emerald-300" : "text-primary border border-primary/30 bg-primary/5"}`}>
                        {uploaded.length > 0 ? "Add" : "Upload"}
                      </span>
                    </div>
                    <input
                      type="file" accept={slot.accept} multiple className="hidden"
                      ref={el => { fileRefs.current[slot.key] = el; }}
                      onChange={e => handleFileUpload(e.target.files, slot.key)}
                    />
                  </label>
                );
              })}
            </CardContent>
          </Card>

          {docs.length > 0 && (
            <Card className="border-[#e4eaf2] shadow-xs bg-white rounded-xl overflow-hidden">
              <CardHeader className="pb-2 border-b border-[#f1f5f9] bg-[#f8fafc]">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-[#6b7a93]">
                  Uploaded Files Archive ({docs.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5 pt-3">
                {docs.map((d, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1.5">
                    <FileText className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span className="flex-1 truncate font-medium text-slate-800">{d.name}</span>
                    <span className="text-slate-500 shrink-0 text-[11px]">{d.size}</span>
                    <Badge variant="outline" className="text-[9px] py-0 shrink-0 uppercase">{d.docType}</Badge>
                    <button onClick={() => setDocs(prev => prev.filter((_, j) => j !== i))} className="p-0.5 hover:bg-slate-200 rounded">
                      <X className="h-3 w-3 text-slate-400 hover:text-destructive" />
                    </button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Quick Reference */}
          <Card className="border-[#e4eaf2] bg-[#f8fafc] shadow-xs rounded-xl overflow-hidden">
            <CardHeader className="pb-2 border-b border-[#f1f5f9]">
              <CardTitle className="text-xs font-bold text-[#6b7a93] uppercase tracking-wider">
                TID Document Index (Statutory Format)
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-3">
              <div className="space-y-1 text-[11px] text-[#6b7a93]">
                {[
                  ["Section I", "Notice Inviting Tenders (NIT)"],
                  ["Section II", "General Instructions to Bidders (GIT)"],
                  ["Section III", "Special Instructions to Bidder (SIT)"],
                  ["Section IV", "General Conditions of Contract (GCC)"],
                  ["Section V", "Special Conditions of Contract (SCC)"],
                  ["Annexure-1", "Schedule of Requirements + EMD"],
                  ["Annexure-2", "Technical Specifications"],
                  ["Annexure-3/3a", "EMD / Bid Securing Declaration"],
                  ["Annexure-4", "Performance Security (PSD)"],
                  ["Annexure-5a/b", "Manufacturer Authorisation Forms"],
                  ["Annexure-6", "Installation/Acceptance Certificate"],
                  ["Annexure-7", "Performance Certificate (Post-Install)"],
                  ["Annexure-8", "Consignees/Distribution List"],
                  ["Form P1–P10", "Bidder Information, Past Performance, Tripartite Agreement"],
                  ["Form T1–T2", "Compliance with Specs, Check List"],
                ].map(([code, desc]) => (
                  <div key={code} className="flex gap-2 py-0.5">
                    <span className="font-mono font-bold text-primary w-24 shrink-0">{code}</span>
                    <span className="text-[#3c4a63] font-medium">{desc}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

