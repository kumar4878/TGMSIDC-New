import { useState, useRef } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { Search, Plus, Eye, CheckCircle2, XCircle, AlertTriangle, FileText, Upload, X } from "lucide-react";
import { format } from "date-fns";

interface DocAttachment { name: string; size: string; docType: string; }

interface Invoice {
  id: number;
  invoiceNumber: string;
  poNumber: string;
  poId: number;
  grnNumber: string;
  vendorName: string;
  equipmentName: string;
  invoiceDate: string;
  invoiceAmount: number;
  poAmount: number;
  grnQty: number;
  poQty: number;
  matchStatus: "pending" | "matched" | "mismatch" | "exception";
  matchNotes: string;
  invoiceUploaded: boolean;
  challanUploaded: boolean;
  installCertUploaded: boolean;
  attachments: DocAttachment[];
  submittedBy: string;
  submittedAt: string;
  status: "submitted" | "under_review" | "approved" | "rejected";
}

const INIT_INVOICES: Invoice[] = [
  {
    id: 1,
    invoiceNumber: "SSA/INV/2025-26/0011",
    poNumber: "441A/591/HPC/EQU/2025-26",
    poId: 1,
    grnNumber: "GRN/HPC/2026/001",
    vendorName: "M/s. Sri Srinivasa Agencies",
    equipmentName: "Surgical Diathermy / Cautery Machine (Sigma+)",
    invoiceDate: "2026-03-16",
    invoiceAmount: 556125,
    poAmount: 582750,
    grnQty: 45,
    poQty: 45,
    matchStatus: "matched",
    matchNotes: "3-way match complete: PO qty=45, GRN qty=45 (SSA/0506/25-26), Invoice ₹5,56,125 matches RC unit price ₹12,358.33 × 45. HSN 90189099, GST 5%.",
    invoiceUploaded: true,
    challanUploaded: true,
    installCertUploaded: true,
    attachments: [
      { name: "SSA_INV_2025-26_0011.pdf", size: "1.2 MB", docType: "invoice" },
      { name: "delivery_challan_SSA_0506.pdf", size: "0.7 MB", docType: "challan" },
      { name: "annexure6_GGH_Sangareddy.pdf", size: "1.1 MB", docType: "installation_cert" },
    ],
    submittedBy: "Rajesh Kumar",
    submittedAt: "2026-03-16T11:00:00Z",
    status: "approved",
  },
  {
    id: 2,
    invoiceNumber: "GAMS/01533/22-23",
    poNumber: "216/418/HPC/EQU/Vemulawada/2022-23",
    poId: 2,
    grnNumber: "GRN/HPC/2022/002",
    vendorName: "M/s. Green Apple Medical Systems",
    equipmentName: "Mammogram Compatible CR System (Fuji Film)",
    invoiceDate: "2022-11-02",
    invoiceAmount: 682500,
    poAmount: 682500,
    grnQty: 1,
    poQty: 1,
    matchStatus: "matched",
    matchNotes: "3-way match complete: PO qty=1, GRN qty=1 (GAMS/01650/22-23), Invoice ₹6,82,500 matches PO value. Annexure 6 signed 21-Nov-2022.",
    invoiceUploaded: true,
    challanUploaded: true,
    installCertUploaded: true,
    attachments: [
      { name: "GAMS_01533_22-23.pdf", size: "1.0 MB", docType: "invoice" },
      { name: "delivery_challan_GAMS_01650.pdf", size: "0.6 MB", docType: "challan" },
      { name: "annexure6_Area_Hospital_Vemulawada.pdf", size: "0.9 MB", docType: "installation_cert" },
    ],
    submittedBy: "Rajesh Kumar",
    submittedAt: "2022-11-02T10:00:00Z",
    status: "approved",
  },
  {
    id: 3,
    invoiceNumber: "INV/NMI/2026/0112",
    poNumber: "IND/HPC/EQU/WDH/PO/2026/003",
    poId: 3,
    grnNumber: "—",
    vendorName: "Nidek Medical India Pvt Ltd",
    equipmentName: "Fully Automated Biochemistry Analyser",
    invoiceDate: "2026-04-28",
    invoiceAmount: 1344000,
    poAmount: 1344000,
    grnQty: 0,
    poQty: 1,
    matchStatus: "mismatch",
    matchNotes: "GRN not yet recorded — goods not received at Warangal District Hospital. Invoice submitted prematurely. Cannot process payment until GRN and QA clearance.",
    invoiceUploaded: true,
    challanUploaded: false,
    installCertUploaded: false,
    attachments: [
      { name: "INV_NMI_2026_0112.pdf", size: "1.4 MB", docType: "invoice" },
    ],
    submittedBy: "Rajesh Kumar",
    submittedAt: "2026-04-28T09:00:00Z",
    status: "under_review",
  },
];

const MATCH_STYLE: Record<string, string> = {
  pending: "bg-gray-100 text-gray-600 border-gray-200",
  matched: "bg-emerald-100 text-emerald-700 border-emerald-200",
  mismatch: "bg-red-100 text-red-700 border-red-200",
  exception: "bg-amber-100 text-amber-700 border-amber-200",
};
const STATUS_STYLE: Record<string, string> = {
  submitted: "bg-blue-100 text-blue-700 border-blue-200",
  under_review: "bg-amber-100 text-amber-700 border-amber-200",
  approved: "bg-emerald-100 text-emerald-700 border-emerald-200",
  rejected: "bg-red-100 text-red-700 border-red-200",
};

function fmt(n: number) { return `₹${n.toLocaleString("en-IN")}`; }
function fileSize(bytes: number) { return bytes > 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`; }

const DOC_SLOTS = [
  { key: "invoice", label: "Invoice PDF *", accept: ".pdf", hint: "Original vendor invoice" },
  { key: "challan", label: "Delivery Challan", accept: ".pdf,.jpg,.png", hint: "Signed delivery receipt" },
  { key: "installation_cert", label: "Installation Certificate", accept: ".pdf,.jpg,.png", hint: "Signed by biomedical engineer" },
  { key: "warranty", label: "Warranty Card / Document", accept: ".pdf,.jpg,.png", hint: "Equipment warranty details" },
];

export default function Invoices() {
  const { can } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>(INIT_INVOICES);
  const [search, setSearch] = useState("");
  const [detail, setDetail] = useState<Invoice | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({
    invoiceNo: "", invoiceDate: "", amount: "",
    poNumber: "441A/591/HPC/EQU/2025-26", grnNumber: "GRN/HPC/2026/001", notes: ""
  });
  const [attachments, setAttachments] = useState<DocAttachment[]>([]);

  const filtered = invoices.filter(i =>
    !search ||
    i.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
    i.poNumber.toLowerCase().includes(search.toLowerCase()) ||
    i.vendorName.toLowerCase().includes(search.toLowerCase())
  );

  function approve(id: number) { setInvoices(is => is.map(i => i.id === id ? { ...i, status: "approved" as const } : i)); }
  function reject(id: number) { setInvoices(is => is.map(i => i.id === id ? { ...i, status: "rejected" as const } : i)); }

  function handleFileUpload(files: FileList | null, docType: string) {
    if (!files) return;
    setAttachments(prev => [...prev, ...Array.from(files).map(f => ({ name: f.name, size: fileSize(f.size), docType }))]);
  }

  function handleAdd() {
    const hasInvoice = attachments.some(a => a.docType === "invoice");
    const newInv: Invoice = {
      id: invoices.length + 1,
      invoiceNumber: form.invoiceNo,
      poNumber: form.poNumber,
      poId: form.poNumber === "441A/591/HPC/EQU/2025-26" ? 1 : form.poNumber === "216/418/HPC/EQU/Vemulawada/2022-23" ? 2 : 3,
      grnNumber: form.grnNumber,
      vendorName: form.poNumber === "441A/591/HPC/EQU/2025-26" ? "M/s. Sri Srinivasa Agencies" : form.poNumber === "216/418/HPC/EQU/Vemulawada/2022-23" ? "M/s. Green Apple Medical Systems" : "Nidek Medical India Pvt Ltd",
      equipmentName: form.poNumber === "441A/591/HPC/EQU/2025-26" ? "Surgical Diathermy / Cautery Machine (Sigma+)" : form.poNumber === "216/418/HPC/EQU/Vemulawada/2022-23" ? "Mammogram Compatible CR System (Fuji Film)" : "Fully Automated Biochemistry Analyser",
      invoiceDate: form.invoiceDate,
      invoiceAmount: parseFloat(form.amount) || 0,
      poAmount: form.poNumber === "441A/591/HPC/EQU/2025-26" ? 582750 : form.poNumber === "216/418/HPC/EQU/Vemulawada/2022-23" ? 682500 : 1344000,
      grnQty: 0,
      poQty: form.poNumber === "441A/591/HPC/EQU/2025-26" ? 45 : 1,
      matchStatus: "pending",
      matchNotes: "3-way match pending verification",
      invoiceUploaded: hasInvoice,
      challanUploaded: attachments.some(a => a.docType === "challan"),
      installCertUploaded: attachments.some(a => a.docType === "installation_cert"),
      attachments,
      submittedBy: "Rajesh Kumar",
      submittedAt: new Date().toISOString(),
      status: "submitted",
    };
    setInvoices(prev => [newInv, ...prev]);
    setAddOpen(false);
    setAttachments([]);
    setForm({ invoiceNo: "", invoiceDate: "", amount: "", poNumber: "441A/591/HPC/EQU/2025-26", grnNumber: "GRN/HPC/2026/001", notes: "" });
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Invoice Management</h1>
          <p className="text-sm text-muted-foreground mt-0.5">3-Way Match (PO × GRN × Invoice) and approval workflow</p>
        </div>
        {can("invoice.submit") && (
          <Button size="sm" className="gap-2" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" />Submit Invoice
          </Button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-3"><FileText className="h-5 w-5 text-blue-600" /><div><p className="text-lg font-bold">{invoices.length}</p><p className="text-xs text-muted-foreground">Total Invoices</p></div></CardContent></Card>
        <Card className="border-emerald-200 bg-emerald-50/40"><CardContent className="p-4 flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-emerald-600" /><div><p className="text-lg font-bold text-emerald-700">{invoices.filter(i => i.matchStatus === "matched").length}</p><p className="text-xs text-muted-foreground">3-Way Matched</p></div></CardContent></Card>
        <Card className="border-red-200 bg-red-50/40"><CardContent className="p-4 flex items-center gap-3"><AlertTriangle className="h-5 w-5 text-red-600" /><div><p className="text-lg font-bold text-red-700">{invoices.filter(i => i.matchStatus === "mismatch").length}</p><p className="text-xs text-muted-foreground">Mismatches</p></div></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search invoice, PO, vendor..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  {["Invoice No.", "PO / GRN", "Vendor", "Equipment", "Invoice Amt", "PO Amt", "3-Way Match", "Docs", "Status", ""].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(inv => (
                  <tr key={inv.id} className="border-b hover:bg-muted/20">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-primary">{inv.invoiceNumber}</td>
                    <td className="px-4 py-3">
                      <Link href={`/purchase-orders/${inv.poId}`}><span className="text-primary hover:underline text-xs block">{inv.poNumber}</span></Link>
                      <span className="text-xs text-muted-foreground">{inv.grnNumber}</span>
                    </td>
                    <td className="px-4 py-3 text-xs">{inv.vendorName}</td>
                    <td className="px-4 py-3 max-w-[140px] truncate text-xs">{inv.equipmentName}</td>
                    <td className="px-4 py-3 font-semibold text-sm">{fmt(inv.invoiceAmount)}</td>
                    <td className="px-4 py-3 text-muted-foreground text-sm">{fmt(inv.poAmount)}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={`text-xs border ${MATCH_STYLE[inv.matchStatus]}`}>
                        {inv.matchStatus === "matched" ? <CheckCircle2 className="h-3 w-3 mr-1 inline" /> : inv.matchStatus === "mismatch" ? <XCircle className="h-3 w-3 mr-1 inline" /> : null}
                        {inv.matchStatus.replace("_", " ")}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 flex-wrap">
                        {([["Inv", inv.invoiceUploaded], ["GRN", inv.challanUploaded], ["Cert", inv.installCertUploaded]] as [string, boolean][]).map(([l, done]) => (
                          <span key={l} className={`text-[10px] px-1.5 py-0.5 rounded border ${done ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-muted-foreground/20 text-muted-foreground"}`}>{l}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={`text-xs border ${STATUS_STYLE[inv.status]}`}>{inv.status.replace("_", " ")}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setDetail(inv)}><Eye className="h-3.5 w-3.5" /></Button>
                        {can("invoice.review") && inv.status === "under_review" && inv.matchStatus === "matched" && (
                          <Button size="sm" className="h-7 bg-emerald-600 hover:bg-emerald-700 px-2 text-xs" onClick={() => approve(inv.id)}>Approve</Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && <div className="text-center py-12 text-muted-foreground">No invoices found</div>}
          </div>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!detail} onOpenChange={() => setDetail(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {detail && (
            <>
              <DialogHeader><DialogTitle>Invoice — {detail.invoiceNumber}</DialogTitle></DialogHeader>
              <div className="space-y-4 py-2 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  {([
                    ["Vendor", detail.vendorName], ["Equipment", detail.equipmentName],
                    ["PO Ref", detail.poNumber], ["GRN Ref", detail.grnNumber],
                    ["Invoice Date", format(new Date(detail.invoiceDate), "dd MMM yyyy")],
                    ["Submitted", format(new Date(detail.submittedAt), "dd MMM yyyy HH:mm")],
                    ["Submitted By", detail.submittedBy], ["Status", detail.status.replace("_", " ")],
                  ] as [string, string][]).map(([l, v]) => (
                    <div key={l}><p className="text-xs text-muted-foreground">{l}</p><p className="font-medium capitalize">{v}</p></div>
                  ))}
                </div>

                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead><tr className="bg-muted/60"><th className="text-left px-3 py-2">Parameter</th><th className="text-right px-3 py-2">PO</th><th className="text-right px-3 py-2">GRN</th><th className="text-right px-3 py-2">Invoice</th><th className="text-center px-3 py-2">Match?</th></tr></thead>
                    <tbody>
                      <tr className="border-t"><td className="px-3 py-2">Quantity</td><td className="text-right px-3 py-2">{detail.poQty}</td><td className="text-right px-3 py-2">{detail.grnQty || "—"}</td><td className="text-right px-3 py-2">{detail.poQty}</td><td className="text-center px-3 py-2">{detail.grnQty === detail.poQty ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 mx-auto" /> : <XCircle className="h-3.5 w-3.5 text-red-600 mx-auto" />}</td></tr>
                      <tr className="border-t"><td className="px-3 py-2">Amount</td><td className="text-right px-3 py-2">{fmt(detail.poAmount)}</td><td className="text-right px-3 py-2">—</td><td className="text-right px-3 py-2">{fmt(detail.invoiceAmount)}</td><td className="text-center px-3 py-2">{detail.poAmount === detail.invoiceAmount ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 mx-auto" /> : <XCircle className="h-3.5 w-3.5 text-red-600 mx-auto" />}</td></tr>
                    </tbody>
                  </table>
                </div>

                {detail.matchNotes && (
                  <div className={`p-3 rounded-lg border text-xs ${detail.matchStatus === "matched" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-amber-50 border-amber-200 text-amber-800"}`}>
                    <p className="font-semibold mb-0.5">Match Result</p>
                    <p>{detail.matchNotes}</p>
                  </div>
                )}

                {detail.attachments.length > 0 && (
                  <div className="border-t pt-3">
                    <p className="text-xs font-semibold text-muted-foreground mb-2">Attached Documents ({detail.attachments.length})</p>
                    <div className="space-y-1.5">
                      {detail.attachments.map((a, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs bg-muted/30 rounded px-2 py-1.5">
                          <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="flex-1 truncate">{a.name}</span>
                          <span className="text-muted-foreground">{a.size}</span>
                          <Badge variant="outline" className="text-[9px] py-0">{a.docType.replace("_", " ")}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  {can("invoice.review") && detail.status === "under_review" && detail.matchStatus === "matched" && (
                    <Button className="bg-emerald-600 hover:bg-emerald-700 gap-1.5" onClick={() => { approve(detail.id); setDetail({ ...detail, status: "approved" }); }}>
                      <CheckCircle2 className="h-4 w-4" />Approve for Payment
                    </Button>
                  )}
                  {can("invoice.review") && detail.status === "under_review" && (
                    <Button variant="destructive" className="gap-1.5" onClick={() => { reject(detail.id); setDetail({ ...detail, status: "rejected" }); }}>
                      <XCircle className="h-4 w-4" />Reject
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Submit Invoice Dialog */}
      <Dialog open={addOpen} onOpenChange={v => { setAddOpen(v); if (!v) setAttachments([]); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Submit Vendor Invoice</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Purchase Order *</Label>
              <Select value={form.poNumber} onValueChange={v => setForm({ ...form, poNumber: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="441A/591/HPC/EQU/2025-26">441A/591/HPC/EQU/2025-26 — Surgical Diathermy (Sri Srinivasa)</SelectItem>
                  <SelectItem value="216/418/HPC/EQU/Vemulawada/2022-23">216/418/HPC/EQU/Vemulawada/2022-23 — Mammogram CR (Green Apple)</SelectItem>
                  <SelectItem value="IND/HPC/EQU/WDH/PO/2026/003">IND/HPC/EQU/WDH/PO/2026/003 — Biochemistry Analyser (Nidek)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>GRN Reference</Label>
              <Select value={form.grnNumber} onValueChange={v => setForm({ ...form, grnNumber: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="GRN/HPC/2026/001">GRN/HPC/2026/001 — Surgical Diathermy (Verified)</SelectItem>
                  <SelectItem value="GRN/HPC/2022/002">GRN/HPC/2022/002 — Mammogram CR (Accepted)</SelectItem>
                  <SelectItem value="GRN/HPC/2026/003">GRN/HPC/2026/003 — Biochemistry Analyser (Pending)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Invoice Number *</Label>
                <Input value={form.invoiceNo} onChange={e => setForm({ ...form, invoiceNo: e.target.value })} placeholder="INV/..." />
              </div>
              <div className="space-y-1.5">
                <Label>Invoice Date *</Label>
                <Input type="date" value={form.invoiceDate} onChange={e => setForm({ ...form, invoiceDate: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Invoice Amount (₹) *</Label>
              <Input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="e.g. 1904000" />
              {form.amount && <p className="text-xs text-muted-foreground">{fmt(parseFloat(form.amount) || 0)}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Any notes about this invoice..." />
            </div>

            {/* Document uploads */}
            <div className="border-t pt-3">
              <p className="text-sm font-semibold mb-3 flex items-center gap-2"><Upload className="h-4 w-4" />Attach Documents</p>
              <div className="space-y-2">
                {DOC_SLOTS.map(slot => {
                  const uploaded = attachments.filter(a => a.docType === slot.key);
                  return (
                    <label key={slot.key} className="block cursor-pointer">
                      <div className={`flex items-center gap-3 p-2.5 rounded-lg border transition-colors ${uploaded.length > 0 ? "border-emerald-200 bg-emerald-50" : "border-dashed border-muted-foreground/30 hover:bg-muted/20"}`}>
                        {uploaded.length > 0 ? <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" /> : <Upload className="h-4 w-4 text-muted-foreground shrink-0" />}
                        <div className="flex-1">
                          <p className="text-xs font-medium">{slot.label}</p>
                          <p className="text-[10px] text-muted-foreground">{slot.hint}</p>
                          {uploaded.length > 0 && <p className="text-[10px] text-emerald-700">{uploaded.map(d => d.name).join(", ")}</p>}
                        </div>
                        <span className="text-xs text-primary border border-primary/30 rounded px-2 py-0.5">{uploaded.length > 0 ? "Change" : "Browse"}</span>
                      </div>
                      <input type="file" accept={slot.accept} className="hidden" onChange={e => handleFileUpload(e.target.files, slot.key)} />
                    </label>
                  );
                })}
              </div>
            </div>

            {attachments.length > 0 && (
              <div className="space-y-1">
                {attachments.map((a, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs bg-muted/30 rounded px-2 py-1.5">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="flex-1 truncate">{a.name}</span>
                    <span className="text-muted-foreground">{a.size}</span>
                    <button onClick={() => setAttachments(p => p.filter((_, j) => j !== i))}><X className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAddOpen(false); setAttachments([]); }}>Cancel</Button>
            <Button onClick={handleAdd} disabled={!form.invoiceNo || !form.invoiceDate || !form.amount}>Submit Invoice</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
