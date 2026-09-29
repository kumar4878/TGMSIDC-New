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
  ArrowRightLeft, AlertTriangle, TrendingDown, TrendingUp, Clock, Plus,
  Search, Package, ChevronRight, Lightbulb, IndianRupee, Timer,
} from "lucide-react";
import { mockStockTransfers, mockStockPositions } from "@/mocks/data";
import type { StockTransfer } from "@/mocks/data";

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  draft:            { label: "Draft",            className: "bg-slate-100 text-slate-700 border-slate-200" },
  pending_approval: { label: "Pending Approval", className: "bg-amber-100 text-amber-700 border-amber-200" },
  approved:         { label: "Approved",         className: "bg-blue-100 text-blue-700 border-blue-200" },
  dispatched:       { label: "In Transit",       className: "bg-indigo-100 text-indigo-700 border-indigo-200" },
  received:         { label: "Received",         className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  closed:           { label: "Closed",           className: "bg-green-100 text-green-700 border-green-200" },
  rejected:         { label: "Rejected",         className: "bg-red-100 text-red-700 border-red-200" },
};

const PRIORITY_BADGE: Record<string, string> = {
  critical: "bg-red-100 text-red-700 border-red-200",
  urgent:   "bg-amber-100 text-amber-700 border-amber-200",
  normal:   "bg-slate-100 text-slate-700 border-slate-200",
};

const URGENCY_BG: Record<string, string> = {
  critical: "bg-red-50 border-red-200",
  urgent:   "bg-amber-50 border-amber-200",
  normal:   "bg-slate-50 border-slate-200",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function rupee(n: number): string {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  return `₹${n.toLocaleString("en-IN")}`;
}

const UNIT_PRICES: Record<string, number> = {
  "EQP-0009": 180,
  "EQP-0012": 350,
  "EQP-0008": 85000,
  "EQP-0002": 320000,
};

const surplusLocations = [...new Set(
  mockStockPositions.filter(p => p.riskLevel === "justification_required").map(p => p.facilityName),
)];
const shortageLocations = [...new Set(
  mockStockPositions.filter(p => p.riskLevel === "high_risk").map(p => p.facilityName),
)];

const surplusDistricts = Object.entries(
  mockStockPositions
    .filter(p => p.riskLevel === "justification_required")
    .reduce<Record<string, number>>((acc, p) => { acc[p.district] = (acc[p.district] ?? 0) + 1; return acc; }, {}),
).sort((a, b) => b[1] - a[1]);

const shortageDistricts = Object.entries(
  mockStockPositions
    .filter(p => p.riskLevel === "high_risk")
    .reduce<Record<string, number>>((acc, p) => { acc[p.district] = (acc[p.district] ?? 0) + 1; return acc; }, {}),
).sort((a, b) => b[1] - a[1]);
const pendingApproval = mockStockTransfers.filter(t => t.status === "pending_approval").length;
const inTransit       = mockStockTransfers.filter(t => t.status === "dispatched").length;

const redistributedValue = mockStockTransfers
  .filter(t => ["dispatched", "received", "closed"].includes(t.status))
  .reduce((s, t) => s + t.quantity * (UNIT_PRICES[t.itemCode] ?? 0), 0);

const completedWithDates = mockStockTransfers.filter(
  t => (t.status === "received" || t.status === "closed") && t.approvedAt && t.receivedAt,
);
const avgFulfillmentDays = completedWithDates.length
  ? Math.round(
      completedWithDates.reduce((s, t) => {
        const diff = (new Date(t.receivedAt!).getTime() - new Date(t.approvedAt!).getTime()) / 86400000;
        return s + diff;
      }, 0) / completedWithDates.length,
    )
  : 0;

const recommendations = [
  {
    from: "Osmania General Hospital",
    to: "Govt. General Hospital, Sangareddy",
    item: "Paracetamol 500mg Tablets IP",
    qty: 100,
    unit: "Box/1000",
    priority: "critical" as const,
    reason: "Sangareddy at stock-out; OGH at 113d cover with near-expiry batch — prioritise FEFO issue",
    risk: "Risk if unactioned: Sangareddy will remain at zero stock; patient medication disruption within 24 hrs",
    value: 100 * 180,
  },
  {
    from: "Nizam's Institute of Medical Sciences",
    to: "CHC Pitlam, Kamareddy",
    item: "Paracetamol 500mg Tablets IP",
    qty: 30,
    unit: "Box/1000",
    priority: "urgent" as const,
    reason: "CHC at 20d cover; NIMS at 162d cover with near-expiry batch PCT/2025/B055",
    risk: "Risk if unactioned: CHC stock-out within 3 weeks; NIMS batch may expire before issue",
    value: 30 * 180,
  },
  {
    from: "Govt. General Hospital, Sangareddy",
    to: "Gandhi Hospital",
    item: "Sterile Surgical Gloves (Box/100)",
    qty: 120,
    unit: "Box",
    priority: "critical" as const,
    reason: "Gandhi critically low (3d cover); Sangareddy overstock at 380d — highest priority",
    risk: "Risk if unactioned: Gandhi OT procedures at risk within 3 days; ₹42K in overstock may expire",
    value: 120 * 350,
  },
];

export default function StockTransfers() {
  const [search, setSearch]           = useState("");
  const [statusFilter, setStatusFilter]   = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  const filtered = mockStockTransfers.filter((t: StockTransfer) => {
    const q = search.toLowerCase();
    const matchSearch = !q
      || t.transferNumber.toLowerCase().includes(q)
      || t.itemName.toLowerCase().includes(q)
      || t.sourceName.toLowerCase().includes(q)
      || t.destinationName.toLowerCase().includes(q);
    return matchSearch
      && (statusFilter   === "all" || t.status   === statusFilter)
      && (priorityFilter === "all" || t.priority === priorityFilter);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Stock Redistribution</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Identify surplus &amp; shortage locations and manage inter-facility transfers
          </p>
        </div>
        <Link href="/stock-transfers/new">
          <Button className="gap-2"><Plus className="h-4 w-4" /> New Transfer</Button>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-5 gap-4">
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="pt-4 pb-4">
            <TrendingUp className="h-4 w-4 text-amber-500 mb-1" />
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Surplus Locations</p>
            <p className="text-3xl font-bold text-amber-600 mt-0.5">{surplusLocations.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">&gt;90 day stock cover</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="pt-4 pb-4">
            <TrendingDown className="h-4 w-4 text-red-500 mb-1" />
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Shortage Locations</p>
            <p className="text-3xl font-bold text-red-600 mt-0.5">{shortageLocations.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Stock-out / &lt;7d cover</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-indigo-500">
          <CardContent className="pt-4 pb-4">
            <Clock className="h-4 w-4 text-indigo-500 mb-1" />
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Pending Approval</p>
            <p className="text-3xl font-bold text-indigo-600 mt-0.5">{pendingApproval}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Awaiting DD approval</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-4 pb-4">
            <ArrowRightLeft className="h-4 w-4 text-blue-500 mb-1" />
            <p className="text-xs text-muted-foreground uppercase tracking-wide">In Transit</p>
            <p className="text-3xl font-bold text-blue-600 mt-0.5">{inTransit}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Dispatched, en route</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="pt-4 pb-4">
            <IndianRupee className="h-4 w-4 text-emerald-500 mb-1" />
            <p className="text-xs text-muted-foreground uppercase tracking-wide">₹ Redistributed</p>
            <p className="text-2xl font-bold text-emerald-600 mt-0.5">{rupee(redistributedValue)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              FY 2025-26 · avg {avgFulfillmentDays}d fulfillment
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alert */}
      {shortageLocations.length > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-700 text-sm">
            <strong>Stock-out alert:</strong> {shortageLocations.join(", ")} — immediate redistribution required.
          </AlertDescription>
        </Alert>
      )}

      {/* Redistribution overview */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Timer className="h-4 w-4 text-muted-foreground" />
              Fulfillment Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-xs text-muted-foreground">Avg approval → receipt</span>
                <span className={`text-xs font-bold ${avgFulfillmentDays <= 5 ? "text-emerald-600" : "text-amber-600"}`}>
                  {avgFulfillmentDays}d
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-100">
                <div
                  className={`h-1.5 rounded-full ${avgFulfillmentDays <= 5 ? "bg-emerald-500" : "bg-amber-400"}`}
                  style={{ width: `${Math.min((avgFulfillmentDays / 10) * 100, 100)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">Target: ≤ 5 days</p>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-xs text-muted-foreground">Success rate</span>
                <span className="text-xs font-bold text-emerald-600">
                  {mockStockTransfers.length > 0
                    ? Math.round(mockStockTransfers.filter(t => t.status !== "rejected").length / mockStockTransfers.length * 100)
                    : 0}%
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-100">
                <div
                  className="h-1.5 rounded-full bg-emerald-500"
                  style={{
                    width: `${mockStockTransfers.length > 0
                      ? Math.round(mockStockTransfers.filter(t => t.status !== "rejected").length / mockStockTransfers.length * 100)
                      : 0}%`,
                  }}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground border-t pt-2">
              Based on {completedWithDates.length} completed transfer{completedWithDates.length !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>

        <Card className="col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
              District Surplus / Shortage Matrix
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/30">
                  <th className="text-left px-4 py-2 font-semibold text-amber-700 w-1/2">Surplus Districts (overstock)</th>
                  <th className="text-left px-4 py-2 font-semibold text-red-700 w-1/2">Shortage Districts (stock-out / ≤7d)</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: Math.max(surplusDistricts.length, shortageDistricts.length) }).map((_, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-4 py-2">
                      {surplusDistricts[i] ? (
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <TrendingUp className="h-3 w-3 text-amber-500 shrink-0" />
                            {surplusDistricts[i][0]}
                          </span>
                          <span className="bg-amber-100 text-amber-700 rounded-full px-2 py-0.5 font-semibold">
                            {surplusDistricts[i][1]} item{surplusDistricts[i][1] !== 1 ? "s" : ""}
                          </span>
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-2">
                      {shortageDistricts[i] ? (
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <TrendingDown className="h-3 w-3 text-red-500 shrink-0" />
                            {shortageDistricts[i][0]}
                          </span>
                          <span className="bg-red-100 text-red-700 rounded-full px-2 py-0.5 font-semibold">
                            {shortageDistricts[i][1]} item{shortageDistricts[i][1] !== 1 ? "s" : ""}
                          </span>
                        </div>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      {/* Recommendations */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-amber-500" />
            System Recommendations
            <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs border">
              {recommendations.length} recommendations
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 pt-0">
          {recommendations.map((r, i) => (
            <div key={i} className={`rounded-lg border p-3 ${URGENCY_BG[r.priority]}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <Badge className={`text-xs border ${PRIORITY_BADGE[r.priority]}`}>
                      {r.priority.charAt(0).toUpperCase() + r.priority.slice(1)}
                    </Badge>
                    <span className="text-sm font-semibold">{r.item}</span>
                    <span className="text-sm font-bold">{r.qty} {r.unit}</span>
                    <span className="text-xs text-muted-foreground">({rupee(r.value)})</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-600 mb-1">
                    <span className="font-medium">{r.from}</span>
                    <ChevronRight className="h-3 w-3 text-muted-foreground" />
                    <span className="font-semibold">{r.to}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{r.reason}</p>
                  <p className="text-xs text-red-700 font-medium mt-1 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3 shrink-0" />{r.risk}
                  </p>
                </div>
                <Link href="/stock-transfers/new">
                  <Button size="sm" variant="outline" className="h-7 text-xs shrink-0">
                    Create Transfer
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Transfer Register */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
              Transfer Register
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search transfers…"
                  className="pl-8 h-8 w-56 text-sm"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-8 w-44 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending_approval">Pending Approval</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="dispatched">In Transit</SelectItem>
                  <SelectItem value="received">Received</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="h-8 w-32 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead>Transfer No.</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Source → Destination</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">
                    <Package className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    No transfers found
                  </TableCell>
                </TableRow>
              )}
              {filtered.map(t => {
                const sb  = STATUS_BADGE[t.status] ?? STATUS_BADGE.draft;
                const val = t.quantity * (UNIT_PRICES[t.itemCode] ?? 0);
                return (
                  <TableRow key={t.id} className="hover:bg-muted/30">
                    <TableCell>
                      <Link href={`/stock-transfers/${t.id}`}>
                        <span className="text-primary font-mono text-sm hover:underline cursor-pointer">
                          {t.transferNumber}
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">{t.itemName}</div>
                      <div className="text-xs text-muted-foreground font-mono">{t.itemCode}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs">
                        <span className="text-slate-600">{t.sourceName}</span>
                        <span className="mx-1 text-muted-foreground">→</span>
                        <span className="text-slate-800 font-medium">{t.destinationName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium text-sm">
                      {t.quantity} <span className="text-xs text-muted-foreground">{t.unit}</span>
                    </TableCell>
                    <TableCell className="text-right text-sm text-slate-600">
                      {val ? rupee(val) : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-xs border ${PRIORITY_BADGE[t.priority]}`}>
                        {t.priority.charAt(0).toUpperCase() + t.priority.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-xs border ${sb.className}`}>{sb.label}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(t.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Link href={`/stock-transfers/${t.id}`}>
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
