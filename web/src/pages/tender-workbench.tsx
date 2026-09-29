import { useState } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ExternalLink, RefreshCw, CheckCircle2, Clock, AlertTriangle, Info, Activity, Search, Eye, Gavel } from "lucide-react";
import { format } from "date-fns";

interface EProcTender {
  id: number;
  tgmsidcRef: string;
  eprocTenderId: string | null;
  tenderNoticeNo: string | null;
  equipmentName: string;
  internalStatus: string;
  eprocStatus: string | null;
  tenderInvitedDate: string;
  bidOpenDate: string | null;
  bidCloseDate: string | null;
  techBidOpenDate: string | null;
  priceBidOpenDate: string | null;
  awardedVendor: string | null;
  awardedAmount: number | null;
  portalUrl: string | null;
  lastSynced: string | null;
  syncStatus: "synced" | "pending" | "error" | "not_linked";
  participationCount: number | null;
  corrigendumCount: number;
  notes: string;
}

const INIT_TENDERS: EProcTender[] = [
  {
    id: 1,
    tgmsidcRef: "TND-2025-0001",
    eprocTenderId: "TG/HPC/2025-26/ET/0142",
    tenderNoticeNo: "NIT/HPC/2025/0142",
    equipmentName: "Ultrasound Machine (B-Mode) — 3 Units",
    internalStatus: "Bids Received",
    eprocStatus: "Bid Submission Closed",
    tenderInvitedDate: "2025-10-01",
    bidOpenDate: "2025-10-05",
    bidCloseDate: "2025-11-10",
    techBidOpenDate: "2025-11-12",
    priceBidOpenDate: null,
    awardedVendor: null,
    awardedAmount: null,
    portalUrl: "https://tender.telangana.gov.in/nicgep/app",
    lastSynced: "2026-04-08T04:30:00Z",
    syncStatus: "synced",
    participationCount: 4,
    corrigendumCount: 1,
    notes: "Technical evaluation in progress. Financial bid NOT yet opened — confidentiality maintained.",
  },
];

const EPOC_STATUS_FLOW = [
  "Draft (Internal)",
  "Approved for Publishing",
  "Published on eProc",
  "Bid Submission Open",
  "Bid Submission Closed",
  "Technical Bid Opened",
  "Technical Evaluation In Progress",
  "Technical Evaluation Completed",
  "Financial Bid Opened",
  "L1 Identified / Award Under Approval",
  "Award Published",
];

const SYNC_STYLE: Record<string, string> = {
  synced: "bg-emerald-100 text-emerald-700 border-emerald-200",
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  error: "bg-red-100 text-red-700 border-red-200",
  not_linked: "bg-gray-100 text-gray-600 border-gray-200",
};

function fmt(n: number) { return `₹${n.toLocaleString("en-IN")}`; }

export default function TenderWorkbench() {
  const [tenders, setTenders] = useState<EProcTender[]>(INIT_TENDERS);
  const [search, setSearch] = useState("");
  const [detail, setDetail] = useState<EProcTender | null>(null);
  const [syncLoading, setSyncLoading] = useState<number | null>(null);
  const [linkDialog, setLinkDialog] = useState<EProcTender | null>(null);
  const [linkForm, setLinkForm] = useState({ eprocId: "", noticeNo: "", portalUrl: "" });

  const filtered = tenders.filter(t =>
    !search ||
    t.tgmsidcRef.toLowerCase().includes(search.toLowerCase()) ||
    t.equipmentName.toLowerCase().includes(search.toLowerCase()) ||
    (t.eprocTenderId?.toLowerCase().includes(search.toLowerCase()) ?? false)
  );

  function simulateSync(id: number) {
    setSyncLoading(id);
    setTimeout(() => {
      setTenders(ts => ts.map(t => t.id === id ? {
        ...t,
        lastSynced: new Date().toISOString(),
        syncStatus: "synced",
        eprocStatus: "Technical Evaluation In Progress",
        internalStatus: "Technical Evaluation In Progress",
      } : t));
      setSyncLoading(null);
    }, 1500);
  }

  function handleLink() {
    setTenders(ts => ts.map(t => t.id === linkDialog!.id ? {
      ...t,
      eprocTenderId: linkForm.eprocId,
      tenderNoticeNo: linkForm.noticeNo,
      portalUrl: linkForm.portalUrl,
      syncStatus: "pending",
      lastSynced: null,
    } : t));
    setLinkDialog(null);
    setLinkForm({ eprocId: "", noticeNo: "", portalUrl: "" });
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Tender Workbench</h1>
        <p className="text-sm text-muted-foreground mt-0.5">eProcurement integration — State eProcurement Portal sync</p>
      </div>

      {/* Integration Banner */}
      <Card className="border-blue-200 bg-blue-50/40">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-blue-800">eProcurement Integration</p>
              <p className="text-xs text-blue-700 mt-0.5">Tendering is executed on the Government eProcurement portal. This workbench syncs tender IDs, dates, bid counts and status milestones. Financial bid data is withheld until technical evaluation is complete per portal confidentiality rules.</p>
              <div className="flex gap-3 mt-2">
                <a href="https://tender.telangana.gov.in" target="_blank" rel="noreferrer">
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-blue-300 text-blue-700 hover:bg-blue-100">
                    <ExternalLink className="h-3 w-3" />Open eProcurement Portal
                  </Button>
                </a>
                <Badge variant="outline" className="text-xs border-emerald-300 bg-emerald-50 text-emerald-700 self-center">
                  <Activity className="h-3 w-3 mr-1" />API: Dummy Integration Active
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-3"><Gavel className="h-5 w-5 text-primary" /><div><p className="text-2xl font-bold">{tenders.length}</p><p className="text-xs text-muted-foreground">Total Tenders</p></div></CardContent></Card>
        <Card className="border-emerald-200 bg-emerald-50/40"><CardContent className="p-4 flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-emerald-600" /><div><p className="text-2xl font-bold text-emerald-700">{tenders.filter(t => t.syncStatus === "synced").length}</p><p className="text-xs text-muted-foreground">Synced</p></div></CardContent></Card>
        <Card className="border-amber-200 bg-amber-50/40"><CardContent className="p-4 flex items-center gap-3"><Clock className="h-5 w-5 text-amber-600" /><div><p className="text-2xl font-bold text-amber-700">{tenders.filter(t => t.syncStatus === "pending").length}</p><p className="text-xs text-muted-foreground">Sync Pending</p></div></CardContent></Card>
        <Card className="border-red-200 bg-red-50/40"><CardContent className="p-4 flex items-center gap-3"><AlertTriangle className="h-5 w-5 text-red-600" /><div><p className="text-2xl font-bold text-red-700">{tenders.filter(t => t.syncStatus === "error").length}</p><p className="text-xs text-muted-foreground">Sync Error</p></div></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search tender, equipment, eProc ID..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  {["HPC Ref", "eProc Tender ID", "Equipment", "Status (eProc)", "Bids", "Last Sync", "Sync Status", "Actions"].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(t => (
                  <tr key={t.id} className="border-b hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <Link href={`/tenders/${t.id}`}><span className="font-mono text-xs font-semibold text-primary hover:underline">{t.tgmsidcRef}</span></Link>
                    </td>
                    <td className="px-4 py-3">
                      {t.eprocTenderId
                        ? <div><span className="font-mono text-xs">{t.eprocTenderId}</span><br /><span className="text-xs text-muted-foreground">{t.tenderNoticeNo}</span></div>
                        : <Button size="sm" variant="outline" className="h-6 text-xs px-2" onClick={() => setLinkDialog(t)}>Link eProc ID</Button>}
                    </td>
                    <td className="px-4 py-3 max-w-[180px] truncate">{t.equipmentName}</td>
                    <td className="px-4 py-3">
                      <div>
                        <span className="text-xs font-medium">{t.eprocStatus ?? "Not linked"}</span>
                        {t.eprocStatus?.includes("Financial") === false && t.eprocStatus !== null && (
                          <Badge variant="outline" className="ml-2 text-[9px] border-blue-200 bg-blue-50 text-blue-700 px-1">Bid confidential</Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">{t.participationCount != null ? t.participationCount : "—"}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {t.lastSynced ? format(new Date(t.lastSynced), "dd MMM HH:mm") : "Never"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={`text-xs border ${SYNC_STYLE[t.syncStatus]}`}>{t.syncStatus.replace("_", " ")}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setDetail(t)}><Eye className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => simulateSync(t.id)} disabled={syncLoading === t.id || !t.eprocTenderId}>
                          <RefreshCw className={`h-3.5 w-3.5 ${syncLoading === t.id ? "animate-spin" : ""}`} />
                        </Button>
                        {t.portalUrl && (
                          <a href={t.portalUrl} target="_blank" rel="noreferrer">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0"><ExternalLink className="h-3.5 w-3.5" /></Button>
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && <div className="text-center py-12 text-muted-foreground">No tenders found</div>}
          </div>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!detail} onOpenChange={() => setDetail(null)}>
        <DialogContent className="max-w-2xl">
          {detail && (
            <>
              <DialogHeader><DialogTitle>Tender Detail — {detail.tgmsidcRef}</DialogTitle></DialogHeader>
              <Tabs defaultValue="status">
                <TabsList><TabsTrigger value="status">Status Timeline</TabsTrigger><TabsTrigger value="dates">Key Dates</TabsTrigger><TabsTrigger value="audit">Sync Log</TabsTrigger></TabsList>
                <TabsContent value="status" className="space-y-3 pt-3">
                  {EPOC_STATUS_FLOW.map((s, i) => {
                    const currentIdx = EPOC_STATUS_FLOW.indexOf(detail.eprocStatus ?? "");
                    const done = i <= currentIdx;
                    const isCurrent = i === currentIdx;
                    return (
                      <div key={s} className={`flex items-center gap-3 p-2.5 rounded-lg ${isCurrent ? "bg-primary/5 border border-primary/20" : ""}`}>
                        <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs shrink-0 ${done ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>
                          {done ? "✓" : i + 1}
                        </div>
                        <span className={`text-sm ${done ? "font-medium" : "text-muted-foreground"}`}>{s}</span>
                        {s.includes("Financial") && (
                          <Badge variant="outline" className="text-[9px] ml-auto border-red-200 bg-red-50 text-red-700">Confidential until unlocked</Badge>
                        )}
                      </div>
                    );
                  })}
                </TabsContent>
                <TabsContent value="dates" className="pt-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {[
                      ["Notice No.", detail.tenderNoticeNo ?? "—"],
                      ["eProc ID", detail.eprocTenderId ?? "—"],
                      ["Invited Date", detail.tenderInvitedDate],
                      ["Bid Open", detail.bidOpenDate ?? "—"],
                      ["Bid Close", detail.bidCloseDate ?? "—"],
                      ["Tech Bid Open", detail.techBidOpenDate ?? "—"],
                      ["Price Bid Open", detail.priceBidOpenDate ?? "Pending"],
                      ["Participation", detail.participationCount != null ? `${detail.participationCount} bidders` : "—"],
                      ["Corrigenda", String(detail.corrigendumCount)],
                    ].map(([l, v]) => (
                      <div key={l}><p className="text-xs text-muted-foreground">{l}</p><p className="font-medium">{v}</p></div>
                    ))}
                  </div>
                  {detail.notes && (
                    <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                      <p className="font-semibold mb-1">Notes</p>
                      <p>{detail.notes}</p>
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="audit" className="pt-3">
                  <div className="space-y-2">
                    {[
                      { time: "08 Apr 2026 04:30", event: "Sync completed successfully", status: "success" },
                      { time: "07 Apr 2026 04:30", event: "Status updated: Bid Submission Closed → Technical Evaluation In Progress", status: "success" },
                      { time: "10 Nov 2025 11:15", event: "Status updated: Bid Submission Open → Bid Submission Closed", status: "success" },
                      { time: "05 Oct 2025 09:00", event: "Tender linked to eProc ID TG/HPC/2025-26/ET/0142", status: "info" },
                      { time: "01 Oct 2025 08:30", event: "Tender published on eProcurement portal", status: "success" },
                    ].map((log, i) => (
                      <div key={i} className="flex gap-3 text-xs">
                        <span className="text-muted-foreground shrink-0 w-36">{log.time}</span>
                        <span className={log.status === "success" ? "text-emerald-700" : "text-blue-700"}>{log.event}</span>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Link eProc ID Dialog */}
      <Dialog open={!!linkDialog} onOpenChange={() => setLinkDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Link to eProcurement Tender</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2 text-sm">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
              Enter the Tender ID and Notice Number assigned by the eProcurement portal. The system will begin syncing status and milestone updates.
            </div>
            <div className="space-y-1.5">
              <Label>eProcurement Tender ID</Label>
              <Input value={linkForm.eprocId} onChange={e => setLinkForm({ ...linkForm, eprocId: e.target.value })} placeholder="TG/HPC/2025-26/ET/..." />
            </div>
            <div className="space-y-1.5">
              <Label>Tender Notice No.</Label>
              <Input value={linkForm.noticeNo} onChange={e => setLinkForm({ ...linkForm, noticeNo: e.target.value })} placeholder="NIT/HPC/2025/..." />
            </div>
            <div className="space-y-1.5">
              <Label>Portal URL</Label>
              <Input value={linkForm.portalUrl} onChange={e => setLinkForm({ ...linkForm, portalUrl: e.target.value })} placeholder="https://tender.telangana.gov.in/..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkDialog(null)}>Cancel</Button>
            <Button onClick={handleLink} disabled={!linkForm.eprocId}>Link & Start Sync</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
