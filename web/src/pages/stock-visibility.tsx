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
  Activity, AlertTriangle, TrendingDown, TrendingUp, Package, Search,
  ChevronRight, ShieldCheck, Layers, IndianRupee, Info, Plus,
} from "lucide-react";
import { mockStockPositions, mockStockBatches } from "@/mocks/data";
import type { FacilityStockPosition } from "@/mocks/data";
import { useAuth } from "@/contexts/AuthContext";

const RISK_LABEL: Record<string, { label: string; cls: string }> = {
  normal:                 { label: "Normal",              cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  warning:                { label: "Watch",               cls: "bg-amber-100 text-amber-700 border-amber-200" },
  high_risk:              { label: "High Risk",           cls: "bg-red-100 text-red-700 border-red-200" },
  justification_required: { label: "Justification Req.",  cls: "bg-purple-100 text-purple-700 border-purple-200" },
};

const RISK_SCORE: Record<string, number> = {
  normal: 100, warning: 60, high_risk: 0, justification_required: 40,
};

function rupee(n: number): string {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  return `₹${n.toLocaleString("en-IN")}`;
}

function CoverBar({ days }: { days: number }) {
  const capped = Math.min(days, 180);
  const pct = Math.round((capped / 180) * 100);
  const color = days === 0
    ? "bg-red-500"
    : days < 30  ? "bg-red-400"
    : days < 60  ? "bg-amber-400"
    : days > 120 ? "bg-purple-400"
    : "bg-emerald-500";
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="flex-1 h-1.5 rounded-full bg-slate-100">
        <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-medium tabular-nums w-16 text-right shrink-0">
        {days === 999 ? "∞" : `${days}d`}
      </span>
    </div>
  );
}

const healthScore = Math.round(
  mockStockPositions.reduce((s, p) => s + RISK_SCORE[p.riskLevel], 0) / mockStockPositions.length,
);
const healthColor = healthScore >= 80 ? "emerald" : healthScore >= 55 ? "amber" : "red";
const healthLabel = healthScore >= 80 ? "Good" : healthScore >= 55 ? "Needs Attention" : "Critical";

const nearExpiryValue = mockStockBatches
  .filter(b => b.status === "near_expiry")
  .reduce((s, b) => s + b.quantity * b.unitPrice, 0);
const stockOutRisk = mockStockPositions
  .filter(p => p.stockOnHand === 0)
  .reduce((s, p) => s + p.avgMonthlyConsumption * p.unitPrice, 0);
const totalAtRisk = nearExpiryValue + stockOutRisk;

const ALL_CATS = ["all", "imaging", "icu", "operation_theatre", "laboratory"];
const CAT_LABEL: Record<string, string> = {
  all: "All Equipment", imaging: "Imaging Systems", icu: "ICU & Critical Care", operation_theatre: "Operation Theatre", laboratory: "Biomedical Laboratory",
};

const KPI_DELTAS = {
  health:   { label: "-3 pts vs last mo.",  good: false },
  stockout: { label: "+1 vs last mo.",      good: false },
  overstock:{ label: "-1 vs last mo.",      good: true  },
  transit:  { label: "+25 units vs last mo.",good: true  },
  atRisk:   { label: "+₹3.2K vs last mo.", good: false },
};

function DeltaBadge({ info }: { info: { label: string; good: boolean } }) {
  return (
    <p className={`text-xs font-medium mt-1 ${info.good ? "text-emerald-600" : "text-red-500"}`}>
      {info.good ? "▲ " : "▼ "}{info.label}
    </p>
  );
}

const facilities = ["all", ...Array.from(new Set(mockStockPositions.map(p => p.facilityName)))];
const districts  = ["all", ...Array.from(new Set(mockStockPositions.map(p => p.district)))];
const needsAttention = mockStockPositions.filter(
  p => p.riskLevel === "high_risk" || p.riskLevel === "warning",
);

export default function StockVisibility() {
  const { user } = useAuth();
  const canRaiseIndent = user?.role === "deo" || user?.role === "admin";
  const [search, setSearch]       = useState("");
  const [cat, setCat]             = useState("all");
  const [facilityF, setFacilityF] = useState("all");
  const [districtF, setDistrictF] = useState("all");
  const [riskF, setRiskF]         = useState("all");

  const filtered = mockStockPositions.filter((p: FacilityStockPosition) => {
    const q = search.toLowerCase();
    const matchQ = !q
      || p.itemName.toLowerCase().includes(q)
      || p.facilityName.toLowerCase().includes(q)
      || p.itemCode.toLowerCase().includes(q);
    return matchQ
      && (cat === "all"       || p.category    === cat)
      && (facilityF === "all" || p.facilityName === facilityF)
      && (districtF === "all" || p.district     === districtF)
      && (riskF === "all"     || p.riskLevel    === riskF);
  });

  const stockOutCount  = mockStockPositions.filter(p => p.stockOnHand === 0).length;
  const overstockCount = mockStockPositions.filter(p => p.riskLevel === "justification_required").length;
  const inTransitQty   = mockStockPositions.reduce((s, p) => s + p.stockInTransit, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Stock Visibility</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Network-wide inventory position — FEFO compliance, cover days and redistribution triggers
          </p>
        </div>
        {canRaiseIndent && (
          <Link href="/indents/new">
            <Button className="gap-2"><Plus className="h-4 w-4" /> Raise Indent</Button>
          </Link>
        )}
      </div>

      {/* Hero row */}
      <div className="grid grid-cols-5 gap-4">
        <Card className={`border-2 border-${healthColor}-300 bg-${healthColor}-50`}>
          <CardContent className="pt-4 pb-4 text-center">
            <ShieldCheck className={`h-7 w-7 mx-auto mb-1 text-${healthColor}-600`} />
            <p className={`text-4xl font-black text-${healthColor}-700`}>{healthScore}</p>
            <p className={`text-xs font-semibold text-${healthColor}-600 mt-0.5`}>/ 100</p>
            <p className="text-xs text-muted-foreground mt-1">Network Health Score</p>
            <Badge className={`mt-2 text-xs border bg-${healthColor}-100 text-${healthColor}-700 border-${healthColor}-200`}>
              {healthLabel}
            </Badge>
            <DeltaBadge info={KPI_DELTAS.health} />
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardContent className="pt-4 pb-4">
            <TrendingDown className="h-4 w-4 text-red-500 mb-1" />
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Stock-Outs</p>
            <p className="text-3xl font-bold text-red-600 mt-0.5">{stockOutCount}</p>
            <p className="text-xs text-muted-foreground mt-0.5">item-facility positions</p>
            <p className="text-xs text-red-600 font-medium mt-1">Monthly impact: {rupee(stockOutRisk)}</p>
            <DeltaBadge info={KPI_DELTAS.stockout} />
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="pt-4 pb-4">
            <TrendingUp className="h-4 w-4 text-purple-500 mb-1" />
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Overstock</p>
            <p className="text-3xl font-bold text-purple-600 mt-0.5">{overstockCount}</p>
            <p className="text-xs text-muted-foreground mt-0.5">&gt;90 day cover</p>
            <p className="text-xs text-muted-foreground mt-1">Justification required</p>
            <DeltaBadge info={KPI_DELTAS.overstock} />
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-4 pb-4">
            <Activity className="h-4 w-4 text-blue-500 mb-1" />
            <p className="text-xs text-muted-foreground uppercase tracking-wide">In Transit</p>
            <p className="text-3xl font-bold text-blue-600 mt-0.5">{inTransitQty}</p>
            <p className="text-xs text-muted-foreground mt-0.5">units en route</p>
            <p className="text-xs text-muted-foreground mt-1">
              {new Set(mockStockPositions.filter(p => p.stockInTransit > 0).map(p => p.facilityName)).size} facilities
            </p>
            <DeltaBadge info={KPI_DELTAS.transit} />
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="pt-4 pb-4">
            <IndianRupee className="h-4 w-4 text-amber-500 mb-1" />
            <p className="text-xs text-muted-foreground uppercase tracking-wide">₹ At Risk</p>
            <p className="text-2xl font-bold text-amber-600 mt-0.5">{rupee(totalAtRisk)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Near-expiry + stock-out</p>
            <p className="text-xs text-muted-foreground mt-1">{rupee(nearExpiryValue)} near-expiry</p>
            <DeltaBadge info={KPI_DELTAS.atRisk} />
          </CardContent>
        </Card>
      </div>

      {/* Stock-out alert */}
      {stockOutCount > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-700 text-sm">
            <strong>Stock-out alert: </strong>
            {mockStockPositions
              .filter(p => p.stockOnHand === 0)
              .map(p => `${p.facilityName} — ${p.itemName}`)
              .join(" · ")}
          </AlertDescription>
        </Alert>
      )}

      {/* Needs Attention panel */}
      {needsAttention.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/40">
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <Info className="h-4 w-4 text-amber-500" />
              Needs Attention
              <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs border">
                {needsAttention.length} positions
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 pb-3">
            <div className="grid grid-cols-2 gap-2">
              {needsAttention.map((p, i) => (
                <div key={i} className="flex items-start gap-2 rounded-md bg-white/60 border border-amber-100 p-2.5">
                  <div className={`mt-1 h-2 w-2 rounded-full shrink-0 ${p.riskLevel === "high_risk" ? "bg-red-500" : "bg-amber-400"}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold leading-snug truncate">{p.facilityName}</p>
                    <p className="text-xs text-muted-foreground truncate">{p.itemName}</p>
                    <div className="mt-1.5">
                      <CoverBar days={p.stockCoverDays} />
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      {canRaiseIndent && p.suggestedIndentQty > 0 && (
                        <Link href="/indents/new">
                          <Button size="sm" variant="outline" className="h-6 text-xs gap-1 px-2 border-blue-200 text-blue-700 hover:bg-blue-50">
                            <Plus className="h-3 w-3" />Indent {p.suggestedIndentQty} {p.unit}
                          </Button>
                        </Link>
                      )}
                      {p.riskLevel === "justification_required" && (
                        <Link href="/stock-transfers/new">
                          <Button size="sm" variant="ghost" className="h-6 text-xs px-2 text-amber-700 hover:bg-amber-50">
                            Redistribute →
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Category tabs + filters */}
      <div className="space-y-3">
        <div className="flex gap-1">
          {ALL_CATS.map(c => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                cat === c
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {CAT_LABEL[c]}
              {c !== "all" && (
                <span className="ml-1 opacity-60">
                  ({mockStockPositions.filter(p => p.category === c).length})
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search items or facilities…"
              className="pl-8 h-8 w-60 text-sm"
            />
          </div>
          <Select value={districtF} onValueChange={setDistrictF}>
            <SelectTrigger className="h-8 w-44 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {districts.map(d => (
                <SelectItem key={d} value={d}>{d === "all" ? "All Districts" : d}</SelectItem>
              ))}
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
          <Select value={riskF} onValueChange={setRiskF}>
            <SelectTrigger className="h-8 w-48 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Risk Levels</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="warning">Watch</SelectItem>
              <SelectItem value="high_risk">High Risk</SelectItem>
              <SelectItem value="justification_required">Justification Req.</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stock positions table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Layers className="h-4 w-4 text-muted-foreground" />
            Stock Positions
            <span className="text-muted-foreground font-normal text-xs ml-1">
              {filtered.length} of {mockStockPositions.length} positions
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead>Facility / District</TableHead>
                <TableHead>Item</TableHead>
                <TableHead className="text-right">On Hand</TableHead>
                <TableHead className="text-right">Usable</TableHead>
                <TableHead className="text-right">Blocked</TableHead>
                <TableHead className="text-right">In Transit</TableHead>
                <TableHead className="text-right">Near Expiry</TableHead>
                <TableHead className="w-40">Cover Days</TableHead>
                <TableHead>Risk</TableHead>
                <TableHead className="text-right">Suggested Qty</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-12 text-muted-foreground">
                    <Package className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    No positions match the selected filters
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((p, i) => {
                const rl = RISK_LABEL[p.riskLevel];
                return (
                  <TableRow
                    key={i}
                    className={`hover:bg-muted/20 ${
                      p.riskLevel === "high_risk"
                        ? "bg-red-50/40"
                        : p.riskLevel === "justification_required"
                        ? "bg-purple-50/30"
                        : ""
                    }`}
                  >
                    <TableCell>
                      <p className="text-sm font-medium leading-snug">{p.facilityName}</p>
                      <p className="text-xs text-muted-foreground">{p.district}</p>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm font-medium leading-snug">{p.itemName}</p>
                      <p className="text-xs text-muted-foreground font-mono">{p.itemCode}</p>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-sm">
                      {p.stockOnHand}
                      <span className="text-xs text-muted-foreground font-normal ml-1">{p.unit}</span>
                    </TableCell>
                    <TableCell className="text-right text-sm text-emerald-700">{p.usableStock}</TableCell>
                    <TableCell className="text-right text-sm text-slate-500">
                      {p.blockedStock ? p.blockedStock : <span className="text-muted-foreground/40">—</span>}
                    </TableCell>
                    <TableCell className="text-right text-sm text-blue-600">
                      {p.stockInTransit ? p.stockInTransit : <span className="text-muted-foreground/40">—</span>}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {p.nearExpiryStock > 0
                        ? <span className="text-amber-600 font-medium">{p.nearExpiryStock}</span>
                        : <span className="text-muted-foreground/40">—</span>}
                    </TableCell>
                    <TableCell className="w-40">
                      <CoverBar days={p.stockCoverDays} />
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-xs border ${rl.cls}`}>{rl.label}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {canRaiseIndent && p.suggestedIndentQty > 0 ? (
                        <Link href="/indents/new">
                          <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
                            <Plus className="h-3 w-3" />
                            {p.suggestedIndentQty} {p.unit}
                          </Button>
                        </Link>
                      ) : (
                        <span className="text-muted-foreground/40 text-xs">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex items-center gap-5 text-xs text-muted-foreground pb-2">
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-8 rounded bg-emerald-500" />
          60–120 d (healthy)
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-8 rounded bg-amber-400" />
          30–60 d (watch)
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-8 rounded bg-red-500" />
          0–30 d / stock-out
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-8 rounded bg-purple-400" />
          &gt;120 d (overstock)
        </div>
      </div>
    </div>
  );
}
