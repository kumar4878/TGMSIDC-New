import { useState } from "react";
import { Link, useRoute } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, CheckCircle2, Truck, PackageCheck, XCircle, Clock } from "lucide-react";
import { mockStockTransfers } from "@/mocks/data";
import type { StockTransfer } from "@/mocks/data";

const STEPS = [
  { key: "draft",            label: "Draft",            icon: Clock },
  { key: "pending_approval", label: "Pending Approval", icon: Clock },
  { key: "approved",         label: "Approved",         icon: CheckCircle2 },
  { key: "dispatched",       label: "In Transit",       icon: Truck },
  { key: "received",         label: "Received",         icon: PackageCheck },
  { key: "closed",           label: "Closed",           icon: CheckCircle2 },
];

const STATUS_IDX: Record<string, number> = {
  draft: 0, pending_approval: 1, approved: 2, dispatched: 3, received: 4, closed: 5, rejected: -1,
};

const PRIORITY_BADGE: Record<string, string> = {
  critical: "bg-red-100 text-red-700 border-red-200",
  urgent: "bg-amber-100 text-amber-700 border-amber-200",
  normal: "bg-slate-100 text-slate-700 border-slate-200",
};

function formatDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function StockTransferDetail() {
  const [, params] = useRoute("/stock-transfers/:id");
  const id = (params?.id ?? "");
  const transfer = mockStockTransfers.find((t: StockTransfer) => String(t.id) === id);
  const [remarks, setRemarks] = useState("");
  const [actionDone, setActionDone] = useState(false);

  if (!transfer) return (
    <div className="text-center py-20 text-muted-foreground">
      <p>Transfer not found.</p>
      <Link href="/stock-transfers"><Button variant="link">Back to Stock Transfers</Button></Link>
    </div>
  );

  const currentIdx = STATUS_IDX[transfer.status] ?? 0;

  const nextAction = transfer.status === "pending_approval" ? { label: "Approve Transfer", color: "bg-emerald-600 hover:bg-emerald-700" }
    : transfer.status === "approved" ? { label: "Confirm Dispatch", color: "bg-blue-600 hover:bg-blue-700" }
    : transfer.status === "dispatched" ? { label: "Confirm Receipt", color: "bg-emerald-600 hover:bg-emerald-700" }
    : transfer.status === "received" ? { label: "Close Transfer", color: "bg-slate-600 hover:bg-slate-700" }
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/stock-transfers">
          <Button variant="ghost" size="sm" className="gap-2"><ArrowLeft className="h-4 w-4" />Back</Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{transfer.transferNumber}</h1>
            <Badge className={`text-xs border ${PRIORITY_BADGE[transfer.priority]}`}>
              {transfer.priority.charAt(0).toUpperCase() + transfer.priority.slice(1)}
            </Badge>
            {transfer.status === "rejected" && (
              <Badge className="text-xs border bg-red-100 text-red-700 border-red-200">Rejected</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {transfer.sourceName} → {transfer.destinationName}
          </p>
        </div>
      </div>

      {/* Status Tracker */}
      {transfer.status !== "rejected" && (
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center">
              {STEPS.map((step, idx) => {
                const done = idx < currentIdx;
                const active = idx === currentIdx;
                const Icon = step.icon;
                return (
                  <div key={step.key} className="flex items-center flex-1 last:flex-none">
                    <div className="flex flex-col items-center gap-1">
                      <div className={`h-9 w-9 rounded-full flex items-center justify-center border-2 transition-colors ${
                        done ? "bg-emerald-600 border-emerald-600 text-white"
                          : active ? "bg-primary border-primary text-white"
                          : "bg-background border-border text-muted-foreground"
                      }`}>
                        {done ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                      </div>
                      <span className={`text-xs font-medium whitespace-nowrap ${active ? "text-primary" : done ? "text-emerald-700" : "text-muted-foreground"}`}>
                        {step.label}
                      </span>
                    </div>
                    {idx < STEPS.length - 1 && (
                      <div className={`flex-1 h-0.5 mx-1 mb-4 ${idx < currentIdx ? "bg-emerald-500" : "bg-border"}`} />
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-3 gap-4">
        {/* Transfer Details */}
        <div className="col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Item Details</CardTitle></CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                {[
                  { label: "Item", value: transfer.itemName },
                  { label: "Item Code", value: <span className="font-mono text-primary">{transfer.itemCode}</span> },
                  { label: "Batch Number", value: <span className="font-mono">{transfer.batchNumber}</span> },
                  { label: "Expiry Date", value: transfer.expiryDate },
                  { label: "Quantity", value: `${transfer.quantity} ${transfer.unit}` },
                  { label: "Priority", value: <Badge className={`text-xs border ${PRIORITY_BADGE[transfer.priority]}`}>{transfer.priority.charAt(0).toUpperCase() + transfer.priority.slice(1)}</Badge> },
                ].map(item => (
                  <div key={item.label}>
                    <dt className="text-muted-foreground text-xs">{item.label}</dt>
                    <dd className="font-medium mt-0.5">{item.value}</dd>
                  </div>
                ))}
              </dl>
              <Separator className="my-3" />
              <dl className="text-sm space-y-1">
                <dt className="text-xs text-muted-foreground">Justification / Remarks</dt>
                <dd className="text-sm mt-0.5">{transfer.remarks}</dd>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Timeline</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              {[
                { label: "Transfer Initiated", value: transfer.createdAt, by: transfer.initiatedBy },
                { label: "Approved", value: transfer.approvedAt, by: transfer.approvedBy },
                { label: "Dispatched", value: transfer.dispatchedAt, by: undefined },
                { label: "Received at Destination", value: transfer.receivedAt, by: undefined },
              ].filter(i => i.value).map(item => (
                <div key={item.label} className="flex items-start gap-3">
                  <div className="h-2 w-2 rounded-full bg-primary mt-1.5 shrink-0" />
                  <div>
                    <p className="font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(item.value)} {item.by ? `· ${item.by}` : ""}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Action Panel */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Route</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Source</p>
                <p className="font-medium">{transfer.sourceName}</p>
              </div>
              <div className="text-center text-muted-foreground text-xs">↓ Transfer</div>
              <div>
                <p className="text-xs text-muted-foreground">Destination</p>
                <p className="font-medium">{transfer.destinationName}</p>
              </div>
            </CardContent>
          </Card>

          {nextAction && !actionDone && (
            <Card className="border-primary/30 bg-primary/5">
              <CardHeader className="pb-3"><CardTitle className="text-base">Action Required</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs">Remarks / Notes</Label>
                  <Textarea value={remarks} onChange={e => setRemarks(e.target.value)} rows={3} className="mt-1 resize-none text-sm" placeholder="Add remarks (optional)" />
                </div>
                <Button className={`w-full gap-2 text-white ${nextAction.color}`} onClick={() => setActionDone(true)}>
                  <CheckCircle2 className="h-4 w-4" /> {nextAction.label}
                </Button>
                {transfer.status === "pending_approval" && (
                  <Button variant="outline" className="w-full gap-2 text-red-600 border-red-200 hover:bg-red-50" onClick={() => setActionDone(true)}>
                    <XCircle className="h-4 w-4" /> Reject Transfer
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {actionDone && (
            <Card className="border-emerald-200 bg-emerald-50">
              <CardContent className="pt-4 text-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto mb-2" />
                <p className="font-medium text-emerald-700">Action recorded</p>
                <p className="text-xs text-muted-foreground mt-1">Status will update on next refresh</p>
              </CardContent>
            </Card>
          )}

          {(transfer.status === "closed" || transfer.status === "received") && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="pt-4 text-center">
                <PackageCheck className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <p className="font-medium text-green-700">Transfer {transfer.status === "closed" ? "Closed" : "Received"}</p>
                <p className="text-xs text-muted-foreground mt-1">Stock balances updated at both locations</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

