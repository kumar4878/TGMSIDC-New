import { useState } from "react";
import { Link, useRoute } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, CheckCircle2, XCircle, FlaskConical, FileText, AlertTriangle } from "lucide-react";
import { mockQuarantineLots } from "@/mocks/data";
import type { QuarantineLot } from "@/mocks/data";

const ALL_STAGES: { key: QuarantineLot["status"]; label: string }[] = [
  { key: "received",         label: "Received" },
  { key: "under_quarantine", label: "Under Quarantine" },
  { key: "sample_pending",   label: "Sample Pending" },
  { key: "sample_collected", label: "Sample Collected" },
  { key: "sent_for_testing", label: "Sent for Testing" },
  { key: "result_awaited",   label: "Result Awaited" },
  { key: "approved",         label: "Approved" },
  { key: "released",         label: "Released" },
];

const STAGE_IDX: Record<string, number> = Object.fromEntries(ALL_STAGES.map((s, i) => [s.key, i]));

const STATUS_META: Record<string, { label: string; className: string }> = {
  received:          { label: "Received",         className: "bg-slate-100 text-slate-700 border-slate-200" },
  under_quarantine:  { label: "Under Quarantine", className: "bg-indigo-100 text-indigo-700 border-indigo-200" },
  sample_pending:    { label: "Sample Pending",   className: "bg-amber-100 text-amber-700 border-amber-200" },
  sample_collected:  { label: "Sample Collected", className: "bg-blue-100 text-blue-700 border-blue-200" },
  sent_for_testing:  { label: "Sent for Testing", className: "bg-purple-100 text-purple-700 border-purple-200" },
  result_awaited:    { label: "Result Awaited",   className: "bg-orange-100 text-orange-700 border-orange-200" },
  approved:          { label: "Approved",         className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  rejected:          { label: "Rejected",         className: "bg-red-100 text-red-700 border-red-200" },
  released:          { label: "Released",         className: "bg-green-100 text-green-700 border-green-200" },
};

function formatDate(s?: string) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default function QuarantineDetail() {
  const [, params] = useRoute("/quarantine/:id");
  const id = (params?.id ?? "");
  const lot = mockQuarantineLots.find((l: QuarantineLot) => String(l.id) === id);
  const [remarks, setRemarks] = useState("");
  const [actionDone, setActionDone] = useState(false);

  if (!lot) return (
    <div className="text-center py-20 text-muted-foreground">
      <p>Quarantine lot not found.</p>
      <Link href="/quarantine"><Button variant="link">Back to Quarantine</Button></Link>
    </div>
  );

  const currentIdx = lot.status === "rejected" ? -1 : (STAGE_IDX[lot.status] ?? 0);
  const sm = STATUS_META[lot.status] ?? STATUS_META.received;

  const nextAction = lot.status === "sample_pending" ? "Record Sample Collection"
    : lot.status === "sample_collected" ? "Mark Sent for Testing"
    : lot.status === "sent_for_testing" ? "Record Result Awaited"
    : lot.status === "result_awaited" ? null
    : lot.status === "approved" ? "Release Stock to Inventory"
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/quarantine">
          <Button variant="ghost" size="sm" className="gap-2"><ArrowLeft className="h-4 w-4" />Back</Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{lot.lotNumber}</h1>
            <Badge className={`text-xs border ${sm.className}`}>{sm.label}</Badge>
            {lot.slaBreached && <Badge className="text-xs bg-red-100 text-red-700 border-red-200">SLA Breached</Badge>}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">{lot.itemName} · {lot.warehouseName}</p>
        </div>
      </div>

      {lot.slaBreached && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          This lot has been in quarantine for <strong>{lot.agingDays} days</strong>, exceeding the SLA of {lot.slaDays} days. Urgent QC action required.
        </div>
      )}

      {/* 9-Stage Tracker */}
      {lot.status !== "rejected" && (
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start">
              {ALL_STAGES.map((stage, idx) => {
                const done = idx < currentIdx;
                const active = idx === currentIdx;
                return (
                  <div key={stage.key} className="flex items-center flex-1 last:flex-none">
                    <div className="flex flex-col items-center gap-1 min-w-0">
                      <div className={`h-7 w-7 rounded-full flex items-center justify-center border-2 text-xs font-bold transition-colors ${
                        done ? "bg-emerald-600 border-emerald-600 text-white"
                          : active ? "bg-primary border-primary text-white"
                          : "bg-background border-border text-muted-foreground"
                      }`}>
                        {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : <span>{idx + 1}</span>}
                      </div>
                      <span className={`text-[10px] font-medium text-center leading-tight px-0.5 ${active ? "text-primary" : done ? "text-emerald-700" : "text-muted-foreground"}`}>
                        {stage.label}
                      </span>
                    </div>
                    {idx < ALL_STAGES.length - 1 && (
                      <div className={`flex-1 h-0.5 mx-0.5 mb-4 ${idx < currentIdx ? "bg-emerald-500" : "bg-border"}`} />
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 space-y-4">
          {/* Receipt & Batch Details */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Receipt & Batch Details</CardTitle></CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                {[
                  { label: "Item", value: lot.itemName },
                  { label: "Item Code", value: <span className="font-mono text-primary">{lot.itemCode}</span> },
                  { label: "Batch Number", value: <span className="font-mono">{lot.batchNumber}</span> },
                  { label: "Expiry Date", value: lot.expiryDate },
                  { label: "Quantity", value: `${lot.quantity} ${lot.unit}` },
                  { label: "Received Date", value: formatDate(lot.receivedDate) },
                  { label: "Warehouse", value: lot.warehouseName },
                  { label: "Ageing", value: <span className={lot.slaBreached ? "text-red-600 font-bold" : ""}>{lot.agingDays} days</span> },
                ].map(item => (
                  <div key={item.label}>
                    <dt className="text-xs text-muted-foreground">{item.label}</dt>
                    <dd className="font-medium mt-0.5">{item.value}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>

          {/* QC Details */}
          {(lot.sampleCollectionDate || lot.testingReference || lot.labResultDate) && (
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><FlaskConical className="h-4 w-4" />Sample & Lab Details</CardTitle></CardHeader>
              <CardContent>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                  {[
                    { label: "Sample Collection Date", value: formatDate(lot.sampleCollectionDate) },
                    { label: "Testing Reference", value: lot.testingReference ? <span className="font-mono">{lot.testingReference}</span> : "—" },
                    { label: "Laboratory", value: lot.labName ?? "—" },
                    { label: "Lab Result Date", value: formatDate(lot.labResultDate) },
                  ].map(item => (
                    <div key={item.label}>
                      <dt className="text-xs text-muted-foreground">{item.label}</dt>
                      <dd className="font-medium mt-0.5">{item.value}</dd>
                    </div>
                  ))}
                </dl>
                {lot.releaseRejectionRemarks && (
                  <>
                    <Separator className="my-3" />
                    <div>
                      <dt className="text-xs text-muted-foreground">Release/Rejection Remarks</dt>
                      <dd className="text-sm mt-0.5">{lot.releaseRejectionRemarks}</dd>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Status History */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Status History</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {lot.statusHistory.map((h, i) => {
                const hm = STATUS_META[h.status];
                return (
                  <div key={i} className="flex items-start gap-3 text-sm">
                    <div className="h-2 w-2 rounded-full bg-primary mt-1.5 shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge className={`text-xs border ${hm?.className ?? ""}`}>{hm?.label ?? h.status}</Badge>
                        <span className="text-xs text-muted-foreground">{formatDate(h.date)} · {h.user}</span>
                      </div>
                      {h.remarks && <p className="text-xs text-muted-foreground mt-1">{h.remarks}</p>}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Right Panel */}
        <div className="space-y-4">
          {/* Documents */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" />Documents</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {lot.documents.length === 0 && <p className="text-xs text-muted-foreground">No documents attached.</p>}
              {lot.documents.map((doc, i) => (
                <div key={i} className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg border border-border text-xs">
                  <FileText className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                  <span className="truncate">{doc}</span>
                </div>
              ))}
              <Button variant="outline" size="sm" className="w-full mt-1 text-xs">Upload Document</Button>
            </CardContent>
          </Card>

          {/* Action */}
          {nextAction && !actionDone && (
            <Card className="border-primary/30 bg-primary/5">
              <CardHeader className="pb-3"><CardTitle className="text-base">Record Action</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs">Remarks</Label>
                  <Textarea value={remarks} onChange={e => setRemarks(e.target.value)} rows={3} className="mt-1 resize-none text-sm" placeholder="Add notes or observations…" />
                </div>
                <Button className="w-full gap-2" onClick={() => setActionDone(true)}>
                  <CheckCircle2 className="h-4 w-4" /> {nextAction}
                </Button>
              </CardContent>
            </Card>
          )}

          {lot.status === "result_awaited" && !actionDone && (
            <Card className="border-primary/30 bg-primary/5">
              <CardHeader className="pb-3"><CardTitle className="text-base">Record QC Decision</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs">QC Remarks *</Label>
                  <Textarea value={remarks} onChange={e => setRemarks(e.target.value)} rows={3} className="mt-1 resize-none text-sm" placeholder="Lab result summary, conformance statement…" />
                </div>
                <Button className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setActionDone(true)}>
                  <CheckCircle2 className="h-4 w-4" /> Approve for Release
                </Button>
                <Button variant="outline" className="w-full gap-2 text-red-600 border-red-200 hover:bg-red-50" onClick={() => setActionDone(true)}>
                  <XCircle className="h-4 w-4" /> Reject Lot
                </Button>
              </CardContent>
            </Card>
          )}

          {actionDone && (
            <Card className="border-emerald-200 bg-emerald-50">
              <CardContent className="pt-4 text-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto mb-2" />
                <p className="font-medium text-emerald-700">Action recorded</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

