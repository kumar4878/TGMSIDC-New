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
  { key: "invited",         label: "Publication / NIT",        desc: "Notice Inviting Tender published on e-procurement portal and in two leading newspapers." },
  { key: "pre_bid",         label: "Bid Receipt",              desc: "Pre-bid meeting held. Bidder queries collected and official responses published as corrigendum." },
  { key: "bids_received",   label: "Bid Receipt & Opening",    desc: "Technical and financial bids collected on e-procurement portal and formally opened." },
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
  technical_eval: 7, technical_evaluation: 7,
  commercial_eval: 8,
  l1_identified: 9, awarded: 9,
  contract_final: 10,
  rc_created: 11,
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

  const [form, setForm] = useState({ bidsReceivedDate: "", l1BidderName: "", l1BidderAmount: "", notes: "" });
  const [docs, setDocs] = useState<TenderDoc[]>(INIT_DOCS);

  // NIT Detail fields
  const [editingNIT, setEditingNIT] = useState(false);
  const [nitFields, setNitFields] = useState({
    tenderId: "662453",
    nitNo: "1A.67/HPC/EQU/2025-26",
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
    contactName: "The General Manager, Equipment Wing, HPC, Hyderabad",
    contactEmail: "tsmsidcequ@gmail.com",
    contactMobile: "9391003370",
    eprocPortal: "https://eprocurement.gov.in",
    docsVerifLocation: "HPC Head Office, DM&HS Campus, Koti, Hyderabad",
    rateContractPeriod: "2 years",
    publicationNewspaper: "The Hindu (English Daily) & Velugu (Telugu Daily) — 16.04.2025",
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

  if (isLoading) return <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 rounded-full border-4 border-primary border-t-transparent" /></div>;
  if (!tender) return <div className="text-center py-20 text-muted-foreground">Tender not found</div>;

  const currentIdx = Math.max(0, STATUS_TO_MILESTONE_IDX[tender.status] ?? 0);
  const uploadedByType = (key: string) => docs.filter(d => d.docType === key);

  function advanceMilestone() {
    const nextIdx = Math.min(currentIdx + 1, MILESTONES.length - 1);
    const nextStatus = MILESTONES[nextIdx].key;
    const updateData: Record<string, unknown> = { status: nextStatus };
    if (nextStatus === "bids_received" && form.bidsReceivedDate) updateData.bidsReceivedDate = form.bidsReceivedDate;
    if (nextStatus === "l1_identified" && form.l1BidderName) { updateData.l1BidderName = form.l1BidderName; updateData.l1BidderAmount = parseFloat(form.l1BidderAmount); }
    if (form.notes) updateData.notes = form.notes;
    updateTender.mutate({ id, data: updateData }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetTenderQueryKey(id) }) });
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/tenders"><Button variant="ghost" size="sm" className="gap-2"><ArrowLeft className="h-4 w-4" />Back to Tenders</Button></Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Tender No. {tender.tenderNumber}</h1>
          <p className="text-sm text-muted-foreground">{tender.equipmentName} &mdash; Tender ID: {nitFields.tenderId}</p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={tender.status} />
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => window.open(nitFields.eprocPortal, "_blank")}>
            <ExternalLink className="h-3.5 w-3.5" />e-Procurement Portal
          </Button>
        </div>
      </div>

      {/* Info Banner */}
      <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <span className="font-semibold">e-Procurement:</span> External tendering is conducted on {" "}
          <a href={nitFields.eprocPortal} target="_blank" rel="noreferrer" className="underline font-medium">{nitFields.eprocPortal}</a>.
          Update milestones and upload documents here as they are completed.
          Published in <span className="font-medium">{nitFields.publicationNewspaper}</span>.
        </div>
      </div>

      {/* ── NIT / TID Details ─────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Notice Inviting Tender (NIT) — TID Details
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => setEditingNIT(!editingNIT)}>
            {editingNIT ? "Done Editing" : "Edit NIT"}
          </Button>
        </CardHeader>
        <CardContent>
          {editingNIT ? (
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                { label: "Tender ID (e-Procurement)", key: "tenderId" as const },
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
              {/* Key Date Timeline */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Key Dates</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: "Bid Calling Date", value: nitFields.bidCallingDate, color: "bg-blue-50 border-blue-200" },
                    { label: "Pre-Bid Meeting", value: `${nitFields.preBidDate} ${nitFields.preBidTime} IST`, color: "bg-amber-50 border-amber-200" },
                    { label: "Bid Closing", value: `${nitFields.bidClosingDate} ${nitFields.bidClosingTime} IST`, color: "bg-red-50 border-red-200" },
                    { label: "Tech. Bids Opening", value: `${nitFields.techBidsOpenDate} ${nitFields.techBidsOpenTime} IST`, color: "bg-emerald-50 border-emerald-200" },
                  ].map(d => (
                    <div key={d.label} className={`p-3 rounded-lg border ${d.color}`}>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase">{d.label}</p>
                      <p className="text-sm font-bold mt-1">
                        {d.value.includes("-") && !d.value.includes(" ") ? format(new Date(d.value), "dd MMM yyyy") : d.value.split(" ")[0].includes("-") ? `${format(new Date(d.value.split(" ")[0]), "dd MMM yyyy")} ${d.value.split(" ").slice(1).join(" ")}` : d.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Main NIT Fields */}
              <div className="grid grid-cols-3 gap-x-8 gap-y-3 text-sm">
                {[
                  ["Tender ID", nitFields.tenderId],
                  ["NIT / Tender No.", nitFields.nitNo],
                  ["Bid Validity", `${nitFields.bidValidity} days from bid opening date`],
                  ["Estimated Value", `₹${parseFloat(nitFields.estimatedValue || "0").toLocaleString("en-IN")}`],
                  ["Rate Contract Period", nitFields.rateContractPeriod],
                  ["Evaluation Committee", nitFields.evalCommittee],
                  ["Docs Verification Location", nitFields.docsVerifLocation],
                  ["Newspaper Publication", nitFields.publicationNewspaper],
                ].map(([label, value]) => (
                  <div key={label} className="flex flex-col gap-0.5">
                    <span className="text-xs text-muted-foreground">{label}</span>
                    <span className="text-sm font-medium">{value}</span>
                  </div>
                ))}
              </div>

              {/* Financial / EMD / PSD */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Financial Requirements</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* EMD Card */}
                  <div className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center"><IndianRupee className="h-4 w-4 text-amber-700" /></div>
                      <div>
                        <p className="text-xs font-semibold text-amber-700">EMD (Earnest Money Deposit)</p>
                        <p className="text-xs text-muted-foreground">As per Annexure-1</p>
                      </div>
                    </div>
                    <p className="text-lg font-bold">₹{parseFloat(nitFields.emdAmount || "0").toLocaleString("en-IN")}</p>
                    <p className="text-[10px] text-muted-foreground">{nitFields.emdMode}</p>
                    <p className="text-[10px] text-muted-foreground">Validity: {nitFields.emdValidity}</p>
                    <div className="text-[10px] p-2 bg-amber-50 rounded border border-amber-100">
                      <span className="font-semibold">MSME Exemption:</span> {nitFields.msmeExemption}
                    </div>
                  </div>

                  {/* Tender Processing Fee */}
                  <div className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center"><IndianRupee className="h-4 w-4 text-blue-700" /></div>
                      <div>
                        <p className="text-xs font-semibold text-blue-700">Tender Processing Fee</p>
                        <p className="text-xs text-muted-foreground">Non-refundable, online remittance</p>
                      </div>
                    </div>
                    <p className="text-lg font-bold">₹{parseFloat(nitFields.tenderProcessingFee || "0").toLocaleString("en-IN")}</p>
                    <p className="text-[10px] text-muted-foreground">{nitFields.tenderProcessingFeeNote}</p>
                    <div className="text-[10px] p-2 bg-blue-50 rounded border border-blue-100 space-y-0.5">
                      <p><span className="font-semibold">A/C No.:</span> {nitFields.bankAccount}</p>
                      <p><span className="font-semibold">Bank:</span> {nitFields.bankName}</p>
                      <p><span className="font-semibold">IFSC:</span> {nitFields.ifscCode}</p>
                    </div>
                  </div>

                  {/* Performance Security */}
                  <div className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center"><ShieldCheck className="h-4 w-4 text-emerald-700" /></div>
                      <div>
                        <p className="text-xs font-semibold text-emerald-700">Performance Security (PSD)</p>
                        <p className="text-xs text-muted-foreground">Ref: GIT Cl. 36 / Annexure-4</p>
                      </div>
                    </div>
                    <p className="text-lg font-bold">{nitFields.psdPercent}% of Contract Value</p>
                    <p className="text-[10px] text-muted-foreground">Due within <span className="font-semibold">{nitFields.psdDueDays} days</span> from date of receipt of PO</p>
                    <p className="text-[10px] p-2 bg-emerald-50 rounded border border-emerald-100">Validity: Not less than warranty period + 90 days (as specified in PO)</p>
                  </div>
                </div>
              </div>

              {/* Contact */}
              <div className="border rounded-lg p-3 bg-muted/20">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Contact for Tendering Process</p>
                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-1.5"><Building2 className="h-4 w-4 text-muted-foreground" /><span>{nitFields.contactName}</span></div>
                  <div className="flex items-center gap-1.5"><Mail className="h-4 w-4 text-muted-foreground" /><a href={`mailto:${nitFields.contactEmail}`} className="text-primary hover:underline">{nitFields.contactEmail}</a></div>
                  <div className="flex items-center gap-1.5"><Phone className="h-4 w-4 text-muted-foreground" /><span>{nitFields.contactMobile}</span></div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
        <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
        <span>All times are as per IST. Dates are fixed and will not be relaxed unless extended by official notification or if the day is a public holiday.</span>
      </div>

      <div className="grid grid-cols-5 gap-6">
        {/* Milestone tracker */}
        <div className="col-span-3 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />Tender Milestone Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative pl-8 space-y-0">
                {MILESTONES.map((m, i) => {
                  const done = i < currentIdx;
                  const isCurrent = i === currentIdx;
                  const isFuture = i > currentIdx;
                  return (
                    <div key={m.key} className="relative pb-6 last:pb-0">
                      {i < MILESTONES.length - 1 && (
                        <div className={`absolute left-[-24px] top-7 bottom-0 w-0.5 ${done ? "bg-primary" : "bg-muted"}`} />
                      )}
                      <div className={`absolute left-[-32px] top-0.5 h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 border-2 ${done ? "bg-primary border-primary text-white" : isCurrent ? "border-primary bg-white text-primary" : "border-muted bg-muted/30 text-muted-foreground"}`}>
                        {done ? "✓" : i + 1}
                      </div>
                      <div>
                        <p className={`text-sm font-semibold ${isFuture ? "text-muted-foreground" : "text-foreground"}`}>{m.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{m.desc}</p>
                        {isCurrent && m.key === "bids_received" && (
                          <div className="mt-2 space-y-1.5">
                            <Label className="text-xs">Technical Bids Opening Date</Label>
                            <Input type="date" value={form.bidsReceivedDate} onChange={(e) => f("bidsReceivedDate", e.target.value)} className="max-w-xs h-8 text-sm" />
                          </div>
                        )}
                        {isCurrent && m.key === "l1_identified" && (
                          <div className="space-y-2 mt-2">
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

              {tender.status !== "rc_created" && tender.status !== "cancelled" && (
                <div className="mt-6 pt-4 border-t space-y-3">
                  <div>
                    <Label className="text-sm">Notes / Comments</Label>
                    <Input placeholder="Optional notes for this milestone update..." value={form.notes} onChange={(e) => f("notes", e.target.value)} className="mt-1.5" />
                  </div>
                  <Button onClick={advanceMilestone} disabled={updateTender.isPending}>
                    {updateTender.isPending ? "Updating..." : `Advance to: ${MILESTONES[Math.min(currentIdx + 1, MILESTONES.length - 1)].label}`}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* L1 Bidder Card */}
          {tender.l1BidderName && (
            <Card className="border-emerald-200">
              <CardHeader className="pb-3"><CardTitle className="text-base">L1 Bidder Details</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {[
                  ["L1 Bidder", tender.l1BidderName],
                  ["Bid Amount (L1)", `₹${tender.l1BidderAmount?.toLocaleString("en-IN") ?? "—"}`],
                  ["Bids Received Date", tender.bidsReceivedDate ? format(new Date(tender.bidsReceivedDate), "dd MMM yyyy") : "—"],
                  ["PSD Due (10%)", tender.l1BidderAmount ? `₹${(tender.l1BidderAmount * 0.1).toLocaleString("en-IN")} within ${nitFields.psdDueDays} days` : "—"],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between py-1.5 border-b border-muted last:border-0">
                    <span className="text-sm text-muted-foreground">{label}</span>
                    <span className="text-sm font-semibold">{value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Notes from tender */}
          {tender.notes && (
            <Card className="border-blue-200 bg-blue-50/30">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-blue-800">Tender Notes</CardTitle></CardHeader>
              <CardContent>
                <p className="text-xs text-blue-900 leading-relaxed">{tender.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Document Management */}
        <div className="col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Upload className="h-4 w-4" />Tender Documents
                <Badge variant="outline" className="ml-auto text-xs">{docs.length} files</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {DOC_SLOTS.map(slot => {
                const uploaded = uploadedByType(slot.key);
                return (
                  <label key={slot.key} className="block cursor-pointer">
                    <div className={`flex items-center gap-2 p-2.5 rounded-lg border transition-colors hover:bg-muted/20 ${uploaded.length > 0 ? "border-emerald-200 bg-emerald-50" : "border-dashed border-muted-foreground/30"}`}>
                      {uploaded.length > 0
                        ? <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                        : <Upload className="h-4 w-4 text-muted-foreground shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{slot.label}</p>
                        {uploaded.length > 0
                          ? <p className="text-[10px] text-emerald-700">{uploaded.length} file{uploaded.length > 1 ? "s" : ""}</p>
                          : <p className="text-[10px] text-muted-foreground">{slot.hint}</p>}
                      </div>
                      <span className="text-[10px] text-primary border border-primary/30 rounded px-1.5 py-0.5 shrink-0">
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
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Uploaded Files ({docs.length})</CardTitle></CardHeader>
              <CardContent className="space-y-1.5">
                {docs.map((d, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs bg-muted/30 rounded px-2 py-1.5">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="flex-1 truncate">{d.name}</span>
                    <span className="text-muted-foreground shrink-0">{d.size}</span>
                    <Badge variant="outline" className="text-[9px] py-0 shrink-0">{d.docType}</Badge>
                    <button onClick={() => setDocs(prev => prev.filter((_, j) => j !== i))}>
                      <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                    </button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Quick Reference */}
          <Card className="border-muted bg-muted/10">
            <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground uppercase tracking-wide">TID Document Index</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-1 text-[10px] text-muted-foreground">
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
                  <div key={code} className="flex gap-2">
                    <span className="font-mono font-semibold w-24 shrink-0">{code}</span>
                    <span>{desc}</span>
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

