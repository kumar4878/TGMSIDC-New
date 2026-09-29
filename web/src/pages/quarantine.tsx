import { useState } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import {
  AlertTriangle, Package, Search, Clock, ShieldCheck, ChevronRight,
  XCircle, CheckCircle2, FlaskConical, BarChart3,
} from "lucide-react";
import { mockQuarantineLots } from "@/mocks/data";
import type { QuarantineLot } from "@/mocks/data";

const STATUS_CFG: Record<string, { label: string; cls: string; color: string }> = {
  received:         { label: "Received",          cls: "bg-slate-100  text-slate-700  border-slate-200",  color: "#94a3b8" },
  under_quarantine: { label: "Under Quarantine",  cls: "bg-blue-100   text-blue-700   border-blue-200",   color: "#3b82f6" },
  sample_pending:   { label: "Sample Pending",    cls: "bg-amber-100  text-amber-700  border-amber-200",  color: "#f59e0b" },
  sample_collected: { label: "Sample Collected",  cls: "bg-indigo-100 text-indigo-700 border-indigo-200", color: "#6366f1" },
  sent_for_testing: { label: "Sent for Testing",  cls: "bg-violet-100 text-violet-700 border-violet-200", color: "#7c3aed" },
  result_awaited:   { label: "Result Awaited",    cls: "bg-orange-100 text-orange-700 border-orange-200", color: "#ea580c" },
  approved:         { label: "Approved",          cls: "bg-emerald-100 text-emerald-700 border-emerald-200", color: "#10b981" },
  rejected:         { label: "Rejected",          cls: "bg-red-100    text-red-700    border-red-200",    color: "#ef4444" },
  released:         { label: "Released",          cls: "bg-green-100  text-green-700  border-green-200",  color: "#22c55e" },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

const PIPELINE_STAGES = [
  "received", "under_quarantine", "sample_pending", "sample_collected",
  "sent_for_testing", "result_awaited", "approved", "rejected", "released",
];

const pipelineData = PIPELINE_STAGES.map(stage => ({
  stage: STATUS_CFG[stage]?.label ?? stage,
  count: mockQuarantineLots.filter(l => l.status === stage).length,
  color: STATUS_CFG[stage]?.color ?? "#94a3b8",
}));

const completedLots = mockQuarantineLots.filter(l => l.status === "approved" || l.status === "rejected");
const avgCycleTime = completedLots.length
  ? Math.round(
      completedLots.reduce((s, l) => {
        if (!l.labResultDate) return s + l.agingDays;
        const diff = (new Date(l.labResultDate).getTime() - new Date(l.receivedDate).getTime()) / 86400000;
        return s + diff;
      }, 0) / completedLots.length,
    )
  : 0;

const vendorStats = Object.values(
  mockQuarantineLots.reduce<Record<number, { vendorName: string; total: number; rejected: number; approved: number }>>((acc, l) => {
    if (!acc[l.vendorId]) acc[l.vendorId] = { vendorName: l.vendorName, total: 0, rejected: 0, approved: 0 };
    acc[l.vendorId].total++;
    if (l.status === "rejected") acc[l.vendorId].rejected++;
    if (l.status === "approved") acc[l.vendorId].approved++;
    return acc;
  }, {}),
).sort((a, b) => b.rejected - a.rejected);

export default function Quarantine() {
  const [search, setSearch]   = useState("");
  const [statusF, setStatusF] = useState("all");

  const filtered = mockQuarantineLots.filter((l: QuarantineLot) => {
    const q = search.toLowerCase();
    const matchQ = !q
      || l.lotNumber.toLowerCase().includes(q)
      || l.itemName.toLowerCase().includes(q)
      || l.warehouseName.toLowerCase().includes(q)
      || l.vendorName.toLowerCase().includes(q);
    return matchQ && (statusF === "all" || l.status === statusF);
  });

  const totalInProgress  = mockQuarantineLots.filter(l => !["approved","rejected","released"].includes(l.status)).length;
  const slaBreachedCount = mockQuarantineLots.filter(l => l.slaBreached).length;
  const approvedCount    = mockQuarantineLots.filter(l => l.status === "approved").length;
  const rejectedCount    = mockQuarantineLots.filter(l => l.status === "rejected").length;
  const totalQty         = mockQuarantineLots.reduce((s, l) => s + l.quantity, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Quarantine Management</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Track QC pipeline for all incoming stock — sample collection, testing and release / rejection
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-5 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-4 pb-4">
            <FlaskConical className="h-4 w-4 text-blue-500 mb-1" />
            <p className="text-xs text-muted-foreground uppercase tracking-wide">In Progress</p>
            <p className="text-3xl font-bold text-blue-600 mt-0.5">{totalInProgress}</p>
            <p className="text-xs text-muted-foreground mt-0.5">lots under QC</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-slate-400">
          <CardContent className="pt-4 pb-4">
            <Package className="h-4 w-4 text-slate-400 mb-1" />
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Qty Held</p>
            <p className="text-3xl font-bold text-slate-700 mt-0.5">{totalQty.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-0.5">units in quarantine</p>
          </CardContent>
        </Card>
        <Card className={`border-l-4 ${slaBreachedCount > 0 ? "border-l-red-500" : "border-l-emerald-500"}`}>
          <CardContent className="pt-4 pb-4">
            <Clock className={`h-4 w-4 mb-1 ${slaBreachedCount > 0 ? "text-red-500" : "text-emerald-500"}`} />
            <p className="text-xs text-muted-foreground uppercase tracking-wide">SLA Breached</p>
            <p className={`text-3xl font-bold mt-0.5 ${slaBreachedCount > 0 ? "text-red-600" : "text-emerald-600"}`}>
              {slaBreachedCount}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Avg cycle: {avgCycleTime}d (SLA 21d)</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="pt-4 pb-4">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 mb-1" />
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Approved</p>
            <p className="text-3xl font-bold text-emerald-600 mt-0.5">{approvedCount}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {mockQuarantineLots.length > 0 ? Math.round((approvedCount / mockQuarantineLots.length) * 100) : 0}% pass rate
            </p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="pt-4 pb-4">
            <XCircle className="h-4 w-4 text-red-500 mb-1" />
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Rejected</p>
            <p className="text-3xl font-bold text-red-600 mt-0.5">{rejectedCount}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {mockQuarantineLots.length > 0 ? Math.round((rejectedCount / mockQuarantineLots.length) * 100) : 0}% rejection rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Avg Cycle Time vs SLA */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            Avg Quarantine Cycle Time vs SLA Benchmark
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div className="shrink-0">
              <span className={`text-4xl font-black ${avgCycleTime > 21 ? "text-red-600" : avgCycleTime > 14 ? "text-amber-600" : "text-emerald-600"}`}>
                {avgCycleTime}
              </span>
              <span className="text-base text-muted-foreground ml-1">days avg</span>
              <p className="text-xs text-muted-foreground mt-0.5">SLA target: 21 days (from receipt to release)</p>
            </div>
            <div className="flex-1">
              <div className="relative h-4 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-4 rounded-full transition-all ${avgCycleTime > 21 ? "bg-red-500" : avgCycleTime > 14 ? "bg-amber-400" : "bg-emerald-500"}`}
                  style={{ width: `${Math.min((avgCycleTime / 30) * 100, 100)}%` }}
                />
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-red-700 z-10"
                  style={{ left: `${(21 / 30) * 100}%` }}
                  title="SLA: 21 days"
                />
              </div>
              <div className="relative mt-1 text-xs text-muted-foreground">
                <span>0d</span>
                <span
                  className="absolute text-red-600 font-semibold"
                  style={{ left: `${(21 / 30) * 100}%`, transform: "translateX(-50%)" }}
                >
                  ← SLA 21d
                </span>
                <span className="float-right">30d</span>
              </div>
            </div>
            <div className="shrink-0 text-right">
              <p className={`text-sm font-bold ${avgCycleTime <= 21 ? "text-emerald-600" : "text-red-600"}`}>
                {avgCycleTime <= 21 ? `${21 - avgCycleTime}d under SLA` : `${avgCycleTime - 21}d over SLA`}
              </p>
              <p className="text-xs text-muted-foreground">Based on {completedLots.length} completed lots</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pipeline funnel + Vendor analysis side by side */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              QC Pipeline Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={pipelineData}
                  layout="vertical"
                  margin={{ top: 0, right: 24, left: 8, bottom: 0 }}
                >
                  <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="stage" tick={{ fontSize: 10 }} width={100} />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 6 }} />
                  <Bar dataKey="count" name="Lots" radius={[0, 4, 4, 0]}>
                    {pipelineData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-muted-foreground text-center mt-1">Active lots by QC stage</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
              Vendor QC Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>Vendor</TableHead>
                  <TableHead className="text-right">Total Lots</TableHead>
                  <TableHead className="text-right text-emerald-700">Approved</TableHead>
                  <TableHead className="text-right text-red-600">Rejected</TableHead>
                  <TableHead className="text-right">Reject Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendorStats.map((v, i) => (
                  <TableRow key={i} className={v.rejected > 0 ? "bg-red-50/30" : ""}>
                    <TableCell className="text-sm font-medium leading-snug py-2.5">{v.vendorName}</TableCell>
                    <TableCell className="text-right text-sm">{v.total}</TableCell>
                    <TableCell className="text-right text-sm text-emerald-700 font-medium">{v.approved}</TableCell>
                    <TableCell className="text-right text-sm text-red-600 font-medium">{v.rejected}</TableCell>
                    <TableCell className="text-right">
                      <span className={`text-xs font-semibold ${v.rejected > 0 ? "text-red-600" : "text-emerald-600"}`}>
                        {v.total > 0 ? Math.round((v.rejected / v.total) * 100) : 0}%
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* SLA breach alert */}
      {slaBreachedCount > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-700 text-sm">
            <strong>{slaBreachedCount} lot{slaBreachedCount > 1 ? "s" : ""} have breached the 21-day QC SLA.</strong>{" "}
            Follow up with the testing laboratory immediately.
          </AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search lot, item, vendor or warehouse…"
            className="pl-8 h-8 text-sm"
          />
        </div>
        <Select value={statusF} onValueChange={setStatusF}>
          <SelectTrigger className="h-8 w-52 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.entries(STATUS_CFG).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Worklist */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-muted-foreground" />
            QC Worklist
            <span className="text-muted-foreground font-normal text-xs ml-1">
              {filtered.length} lot{filtered.length !== 1 ? "s" : ""}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead>Lot No.</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Warehouse</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead>Received</TableHead>
                <TableHead>Ageing</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>SLA</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-10 text-muted-foreground">
                    <Package className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    No lots match the selected filters
                  </TableCell>
                </TableRow>
              )}
              {filtered.map(l => {
                const sc = STATUS_CFG[l.status] ?? STATUS_CFG.received;
                const agePct = Math.min(Math.round((l.agingDays / l.slaDays) * 100), 100);
                const ageColor = l.slaBreached ? "bg-red-500" : l.agingDays > l.slaDays * 0.7 ? "bg-amber-400" : "bg-blue-400";
                return (
                  <TableRow key={l.id} className={`hover:bg-muted/20 ${l.slaBreached ? "bg-red-50/40" : ""}`}>
                    <TableCell className="font-mono text-sm">{l.lotNumber}</TableCell>
                    <TableCell>
                      <p className="text-sm font-medium leading-snug">{l.itemName}</p>
                      <p className="text-xs text-muted-foreground font-mono">{l.itemCode}</p>
                    </TableCell>
                    <TableCell className="text-sm">{l.vendorName}</TableCell>
                    <TableCell>
                      <p className="text-sm leading-snug">{l.warehouseName}</p>
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium">
                      {l.quantity.toLocaleString()} <span className="text-xs text-muted-foreground font-normal">{l.unit}</span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(l.receivedDate)}</TableCell>
                    <TableCell className="w-28">
                      <div className="flex items-center gap-1.5">
                        <div className="flex-1 h-1.5 rounded-full bg-slate-100">
                          <div className={`h-1.5 rounded-full ${ageColor}`} style={{ width: `${agePct}%` }} />
                        </div>
                        <span className="text-xs tabular-nums font-medium w-10 text-right shrink-0">
                          {l.agingDays}d
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-xs border ${sc.cls}`}>{sc.label}</Badge>
                    </TableCell>
                    <TableCell>
                      {l.slaBreached
                        ? <Badge className="bg-red-100 text-red-700 border-red-200 text-xs border">Breached</Badge>
                        : <span className="text-xs text-emerald-600">Within SLA</span>}
                    </TableCell>
                    <TableCell>
                      <Link href={`/quarantine/${l.id}`}>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
