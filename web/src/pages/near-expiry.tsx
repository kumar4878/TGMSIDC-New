import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import {
  AlertTriangle, Package, Search, Clock, TrendingUp, IndianRupee,
  CheckCircle2, BarChart3,
} from "lucide-react";
import { mockStockBatches, nearExpiryTrend } from "@/mocks/data";
import type { StockBatch } from "@/mocks/data";

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  near_expiry: { label: "Near Expiry", cls: "bg-amber-100 text-amber-700 border-amber-200" },
  expired:     { label: "Expired",     cls: "bg-red-100   text-red-700   border-red-200"   },
  available:   { label: "Available",   cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  quarantine:  { label: "Quarantine",  cls: "bg-blue-100  text-blue-700  border-blue-200"  },
  blocked:     { label: "Blocked",     cls: "bg-slate-100 text-slate-700 border-slate-200" },
};

const ACTION_CLS: Record<string, string> = {
  "Priority Issue / Redistribute": "text-red-600 font-semibold",
  "Priority Issue":                "text-amber-600 font-semibold",
  "Redistribute to CHC Pitlam":    "text-amber-600 font-semibold",
  "Dispose / Return to Vendor":    "text-slate-500 line-through",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function daysUntilExpiry(iso: string) {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
}

function rupee(n: number): string {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  return `₹${n.toLocaleString("en-IN")}`;
}

const THRESHOLDS = [
  { value: "30",  label: "≤ 30 days" },
  { value: "60",  label: "≤ 60 days" },
  { value: "90",  label: "≤ 90 days" },
  { value: "180", label: "≤ 180 days" },
];

export default function NearExpiry() {
  const [search, setSearch]       = useState("");
  const [threshold, setThreshold] = useState("90");
  const [statusF, setStatusF]     = useState("all");
  const [facilityF, setFacilityF] = useState("all");

  const threshDays = parseInt(threshold, 10);
  const today      = new Date();

  const alertBatches: StockBatch[] = mockStockBatches.filter(b => {
    const days = Math.ceil((new Date(b.expiryDate).getTime() - today.getTime()) / 86400000);
    return (b.status === "near_expiry" || b.status === "expired") && days <= threshDays;
  });

  const filtered = alertBatches.filter(b => {
    const q = search.toLowerCase();
    const matchQ = !q || b.itemName.toLowerCase().includes(q) || b.batchNumber.toLowerCase().includes(q) || b.facilityName.toLowerCase().includes(q);
    return matchQ
      && (statusF   === "all" || b.status       === statusF)
      && (facilityF === "all" || b.facilityName === facilityF);
  });

  const expiredBatches  = alertBatches.filter(b => b.status === "expired");
  const critBatches     = alertBatches.filter(b => {
    const d = daysUntilExpiry(b.expiryDate);
    return d > 0 && d <= 30;
  });
  const warnBatches     = alertBatches.filter(b => {
    const d = daysUntilExpiry(b.expiryDate);
    return d > 30 && d <= threshDays;
  });
  const fefoViolations  = alertBatches.filter(b => b.fefoDeviation).length;
  const atRiskValue     = alertBatches.filter(b => b.status !== "expired").reduce((s, b) => s + b.quantity * b.unitPrice, 0);

  const facilities = ["all", ...Array.from(new Set(mockStockBatches.map(b => b.facilityName)))];

  const catBreakdown = [
    { cat: "Pharmacy",    key: "pharmacy"    },
    { cat: "Consumables", key: "consumables" },
    { cat: "Equipment",   key: "equipment"   },
  ].map(({ cat, key }) => {
    const items = alertBatches.filter(b => b.category === key);
    return {
      cat,
      count: items.length,
      value: items.reduce((s, b) => s + b.quantity * b.unitPrice, 0),
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Near-Expiry Tracker</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Monitor batches approaching expiry, enforce FEFO issue and prevent wastage
          </p>
        </div>
        <Select value={threshold} onValueChange={setThreshold}>
          <SelectTrigger className="h-9 w-40 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            {THRESHOLDS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-5 gap-4">
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="pt-4 pb-4">
            <IndianRupee className="h-4 w-4 text-amber-500 mb-1" />
            <p className="text-xs text-muted-foreground uppercase tracking-wide">₹ Value at Risk</p>
            <p className="text-2xl font-bold text-amber-600 mt-0.5">{rupee(atRiskValue)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">within threshold</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-600">
          <CardContent className="pt-4 pb-4">
            <AlertTriangle className="h-4 w-4 text-red-600 mb-1" />
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Expired Batches</p>
            <p className="text-3xl font-bold text-red-600 mt-0.5">{expiredBatches.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Awaiting disposal</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-400">
          <CardContent className="pt-4 pb-4">
            <Clock className="h-4 w-4 text-red-400 mb-1" />
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Critical (≤30d)</p>
            <p className="text-3xl font-bold text-red-500 mt-0.5">{critBatches.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">batches expiring soon</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-400">
          <CardContent className="pt-4 pb-4">
            <TrendingUp className="h-4 w-4 text-amber-500 mb-1" />
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Warning (&gt;30d)</p>
            <p className="text-3xl font-bold text-amber-600 mt-0.5">{warnBatches.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">within threshold</p>
          </CardContent>
        </Card>
        <Card className={`border-l-4 ${fefoViolations > 0 ? "border-l-red-500" : "border-l-emerald-500"}`}>
          <CardContent className="pt-4 pb-4">
            <CheckCircle2 className={`h-4 w-4 mb-1 ${fefoViolations > 0 ? "text-red-500" : "text-emerald-500"}`} />
            <p className="text-xs text-muted-foreground uppercase tracking-wide">FEFO Violations</p>
            <p className={`text-3xl font-bold mt-0.5 ${fefoViolations > 0 ? "text-red-600" : "text-emerald-600"}`}>
              {fefoViolations}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Deviations detected</p>
          </CardContent>
        </Card>
      </div>

      {/* Category breakdown + Trend chart side by side */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              Category Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {catBreakdown.map(({ cat, count, value }) => (
              <div key={cat}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-medium">{cat}</span>
                  <span className="text-xs text-muted-foreground">
                    {count} batch{count !== 1 ? "es" : ""}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 rounded-full bg-slate-100">
                    <div
                      className="h-2 rounded-full bg-amber-400"
                      style={{ width: `${alertBatches.length ? Math.round((count / alertBatches.length) * 100) : 0}%` }}
                    />
                  </div>
                  <span className="text-xs text-amber-700 font-medium w-20 text-right">{rupee(value)}</span>
                </div>
              </div>
            ))}
            <div className="pt-2 border-t">
              <div className="flex justify-between text-xs font-semibold">
                <span>Total at Risk</span>
                <span className="text-amber-700">{rupee(atRiskValue)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              6-Month Near-Expiry Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={nearExpiryTrend} margin={{ top: 4, right: 12, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                  <Area
                    type="monotone"
                    dataKey="critical"
                    name="Critical (≤30d)"
                    stackId="1"
                    stroke="#ef4444"
                    fill="#fee2e2"
                  />
                  <Area
                    type="monotone"
                    dataKey="warning"
                    name="Warning (31–90d)"
                    stackId="1"
                    stroke="#f59e0b"
                    fill="#fef3c7"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-muted-foreground mt-1 text-center">
              Near-expiry batch count is trending upward — action required
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Urgency timeline strip */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: "Expire in ≤ 7 days",  days: 7,  cls: "bg-red-600",   light: "bg-red-50 border-red-200" },
          { label: "Expire in ≤ 14 days", days: 14, cls: "bg-red-400",   light: "bg-red-50 border-red-100" },
          { label: "Expire in ≤ 30 days", days: 30, cls: "bg-amber-500", light: "bg-amber-50 border-amber-200" },
          { label: "Expire in ≤ 60 days", days: 60, cls: "bg-amber-400", light: "bg-amber-50 border-amber-100" },
          { label: "Expire in ≤ 90 days", days: 90, cls: "bg-amber-300", light: "bg-amber-50 border-amber-50" },
        ].map(({ label, days, cls, light }) => {
          const count = mockStockBatches.filter(b => {
            const d = daysUntilExpiry(b.expiryDate);
            return (b.status === "near_expiry") && d > 0 && d <= days;
          }).length;
          return (
            <div key={days} className={`rounded-lg border p-3 ${light}`}>
              <div className={`h-1 w-8 rounded ${cls} mb-2`} />
              <p className="text-xl font-bold">{count}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </div>
          );
        })}
      </div>

      {/* Alerts */}
      {expiredBatches.length > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-700 text-sm">
            <strong>{expiredBatches.length} expired batch{expiredBatches.length > 1 ? "es" : ""}:</strong>{" "}
            {expiredBatches.map(b => `${b.batchNumber} at ${b.facilityName}`).join(" · ")} — immediate disposal/return required.
          </AlertDescription>
        </Alert>
      )}
      {fefoViolations > 0 && (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-700 text-sm">
            <strong>{fefoViolations} FEFO deviation{fefoViolations > 1 ? "s" : ""} detected.</strong>{" "}
            Older batches are not being issued first. Coordinate with facility stores officer.
          </AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search item, batch or facility…"
            className="pl-8 h-8 text-sm"
          />
        </div>
        <Select value={statusF} onValueChange={setStatusF}>
          <SelectTrigger className="h-8 w-40 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="near_expiry">Near Expiry</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
          </SelectContent>
        </Select>
        <Select value={facilityF} onValueChange={setFacilityF}>
          <SelectTrigger className="h-8 w-56 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            {facilities.map(f => (
              <SelectItem key={f} value={f}>{f === "all" ? "All Facilities" : f}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Batch table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Expiry Worklist
            <span className="text-muted-foreground font-normal text-xs ml-1">
              {filtered.length} batch{filtered.length !== 1 ? "es" : ""}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead>Batch No.</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Facility</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Batch Value</TableHead>
                <TableHead>Expiry Date</TableHead>
                <TableHead>Days Left</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>FEFO</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-10 text-muted-foreground">
                    <Package className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    No batches within this threshold
                  </TableCell>
                </TableRow>
              )}
              {filtered
                .slice()
                .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime())
                .map(b => {
                  const daysLeft = daysUntilExpiry(b.expiryDate);
                  const sc = STATUS_CFG[b.status] ?? STATUS_CFG.available;
                  const daysColor = daysLeft <= 0 ? "text-red-600 font-bold" : daysLeft <= 30 ? "text-red-500 font-semibold" : daysLeft <= 60 ? "text-amber-600" : "text-slate-600";
                  return (
                    <TableRow key={b.id} className={`hover:bg-muted/20 ${daysLeft <= 0 ? "bg-red-50/50" : daysLeft <= 30 ? "bg-amber-50/30" : ""}`}>
                      <TableCell className="font-mono text-sm">{b.batchNumber}</TableCell>
                      <TableCell>
                        <p className="text-sm font-medium leading-snug">{b.itemName}</p>
                        <p className="text-xs text-muted-foreground font-mono">{b.itemCode}</p>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">{b.facilityName}</p>
                        <p className="text-xs text-muted-foreground">{b.district}</p>
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium">
                        {b.quantity} <span className="text-xs text-muted-foreground font-normal">{b.unit}</span>
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">₹{b.unitPrice.toLocaleString("en-IN")}</TableCell>
                      <TableCell className="text-right text-sm font-medium text-amber-700">
                        ₹{(b.quantity * b.unitPrice).toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell className="text-sm">{formatDate(b.expiryDate)}</TableCell>
                      <TableCell>
                        <span className={`text-sm tabular-nums ${daysColor}`}>
                          {daysLeft <= 0 ? "EXPIRED" : `${daysLeft}d`}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-xs border ${sc.cls}`}>{sc.label}</Badge>
                      </TableCell>
                      <TableCell>
                        {b.fefoDeviation
                          ? <Badge className="bg-red-100 text-red-700 border-red-200 text-xs border">⚠ Deviation</Badge>
                          : <span className="text-xs text-emerald-600">✓ OK</span>}
                      </TableCell>
                      <TableCell>
                        {b.recommendedAction
                          ? <span className={`text-xs ${ACTION_CLS[b.recommendedAction] ?? "text-muted-foreground"}`}>
                              {b.recommendedAction}
                            </span>
                          : <span className="text-xs text-muted-foreground">—</span>}
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
