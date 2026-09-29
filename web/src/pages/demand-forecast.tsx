import { useState } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  Legend, ReferenceLine,
} from "recharts";
import {
  TrendingUp, TrendingDown, Minus, AlertCircle, BarChart3, Save,
  ChevronRight, Package, Target, IndianRupee, ArrowLeft,
} from "lucide-react";
import { mockForecasts, mockStockPositions } from "@/mocks/data";
import { useAuth } from "@/contexts/AuthContext";

const METHODS = [
  { value: "wma",    label: "Weighted Moving Average" },
  { value: "ma3",    label: "Moving Average (3-month)" },
  { value: "trend",  label: "Trend-Based Estimate" },
  { value: "manual", label: "Manual Override" },
];

function rupee(n: number): string {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  return `₹${n.toLocaleString("en-IN")}`;
}

const UNIT_PRICES: Record<string, number> = { "EQP-0009": 180, "EQP-0012": 350, "EQP-0002": 320000 };

const accuracyColor = (acc: number) =>
  acc >= 90 ? "text-emerald-600" : acc >= 75 ? "text-amber-600" : "text-red-600";
const accuracyBadge = (acc: number) =>
  acc >= 90
    ? "bg-emerald-100 text-emerald-700 border-emerald-200"
    : acc >= 75
    ? "bg-amber-100 text-amber-700 border-amber-200"
    : "bg-red-100 text-red-700 border-red-200";

export default function DemandForecast() {
  const { user } = useAuth();
  const canRaiseIndent = user?.role === "deo" || user?.role === "admin";
  const [drillItemId, setDrillItemId] = useState<string | null>(null);
  const [method, setMethod]           = useState("wma");
  const [override, setOverride]       = useState<Record<string, string>>({});
  const [saved, setSaved]             = useState(false);

  const forecast = drillItemId
    ? (mockForecasts.find(f => String(f.itemId) === drillItemId) ?? mockForecasts[0])
    : null;

  const histActuals  = forecast ? forecast.monthly.filter(m => m.actual !== null) : [];
  const avgActual    = histActuals.length
    ? histActuals.reduce((s, m) => s + (m.actual ?? 0), 0) / histActuals.length
    : 0;
  const lastActual   = histActuals[histActuals.length - 1]?.actual ?? 0;
  const secondLast   = histActuals[histActuals.length - 2]?.actual ?? 0;
  const trendPct     = secondLast ? Math.round(((lastActual - secondLast) / secondLast) * 100) : 0;
  const futurePeriods = forecast ? forecast.monthly.filter(m => m.actual === null) : [];
  const totalForecast = futurePeriods.reduce((s, m) => {
    const ov = override[m.period];
    return s + (ov ? parseFloat(ov) : m.forecast);
  }, 0);

  const chartData = forecast
    ? forecast.monthly.map(m => ({
        period:   m.period,
        Actual:   m.actual,
        Forecast: m.forecast,
        Adjusted: override[m.period] ? parseFloat(override[m.period]) : m.adjusted,
      }))
    : [];

  const portfolioData = mockForecasts.map(f => {
    const hist      = f.monthly.filter(m => m.actual !== null);
    const avgCons   = hist.length ? Math.round(hist.reduce((s, m) => s + (m.actual ?? 0), 0) / hist.length) : 0;
    const future3   = f.monthly.filter(m => m.actual === null).slice(0, 3);
    const forecastQ = future3.reduce((s, m) => s + m.forecast, 0);
    const positions = mockStockPositions.filter(p => p.itemId === f.itemId);
    const sugQty    = positions.reduce((s, p) => s + p.suggestedIndentQty, 0);
    const unitPrice = UNIT_PRICES[f.itemCode] ?? 0;
    const last = hist[hist.length - 1]?.actual ?? 0;
    const prev = hist[hist.length - 2]?.actual ?? 0;
    const trend = last > prev * 1.05 ? "up" : last < prev * 0.95 ? "down" : "stable";
    const totalUsable  = positions.reduce((s, p) => s + p.usableStock, 0);
    const totalMonthly = positions.reduce((s, p) => s + p.avgMonthlyConsumption, 0);
    const stockCoverDays = totalMonthly > 0 ? Math.round((totalUsable / totalMonthly) * 30) : 999;
    const action = stockCoverDays < 30 || sugQty > 0
      ? "Order Now"
      : stockCoverDays < 90 ? "Monitor" : "Sufficient";
    const idealOrderDate = (() => {
      if (stockCoverDays <= 30) return "Immediate";
      const d = new Date();
      d.setDate(d.getDate() + Math.max(0, stockCoverDays - 30));
      return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    })();
    return { ...f, avgCons, forecastQ, sugQty, unitPrice, trend, stockCoverDays, action, idealOrderDate };
  });

  const totalSugValue = portfolioData.reduce((s, f) => s + f.sugQty * f.unitPrice, 0);

  if (forecast) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="gap-1" onClick={() => { setDrillItemId(null); setOverride({}); setSaved(false); }}>
            <ArrowLeft className="h-4 w-4" /> Back to Portfolio
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{forecast.itemName}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {forecast.itemCode} · {forecast.unit} · {forecast.forecastMethod}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Avg Monthly Consumption", value: Math.round(avgActual), unit: forecast.unit, color: "blue",  Icon: BarChart3 },
            { label: "Latest vs Prior Month",   value: `${trendPct >= 0 ? "+" : ""}${trendPct}%`, unit: "", color: trendPct > 5 ? "amber" : trendPct < -5 ? "emerald" : "slate", Icon: trendPct >= 0 ? TrendingUp : TrendingDown },
            { label: "3-Month Forecast Total",  value: totalForecast.toFixed(0), unit: forecast.unit, color: "indigo", Icon: BarChart3 },
            { label: "Forecast Accuracy",       value: `${forecast.forecastAccuracy}%`, unit: "", color: forecast.forecastAccuracy >= 90 ? "emerald" : "amber", Icon: Target },
          ].map(kpi => (
            <Card key={kpi.label} className={`border-l-4 border-l-${kpi.color}-500`}>
              <CardContent className="pt-3 pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground leading-tight">{kpi.label}</p>
                    <p className={`text-xl font-bold text-${kpi.color}-700 mt-0.5`}>{kpi.value}</p>
                    {kpi.unit && <p className="text-xs text-muted-foreground">{kpi.unit}</p>}
                  </div>
                  <kpi.Icon className={`h-5 w-5 text-${kpi.color}-400`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                Historical Consumption vs Forecast — {forecast.itemName}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Select value={method} onValueChange={setMethod}>
                  <SelectTrigger className="h-8 w-52 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {METHODS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200 text-xs border">
                  {forecast.forecastMethod}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <ReferenceLine
                    x="Jun 2026"
                    stroke="#94a3b8"
                    strokeDasharray="4 2"
                    label={{ value: "Today", position: "insideTopRight", fontSize: 10, fill: "#94a3b8" }}
                  />
                  <Bar dataKey="Actual"   fill="#3b82f6" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Forecast" fill="#c7d2fe" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Adjusted" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Blue = Actual · Light indigo = System Forecast · Amber = Adjusted Override · Dashed = today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                Manual Override — Forecast Periods
              </CardTitle>
              {saved && <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs border">Overrides saved</Badge>}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 mb-4">
              {futurePeriods.map(m => (
                <div key={m.period}>
                  <Label className="text-xs">
                    {m.period} <span className="text-muted-foreground">(System: {m.forecast})</span>
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    value={override[m.period] ?? ""}
                    onChange={e => setOverride(prev => ({ ...prev, [m.period]: e.target.value }))}
                    placeholder={String(m.adjusted ?? m.forecast)}
                    className="mt-1 h-8 text-sm"
                  />
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <Button className="gap-2" onClick={() => setSaved(true)}>
                <Save className="h-4 w-4" /> Save Overrides
              </Button>
              <Button variant="outline" onClick={() => { setOverride({}); setSaved(false); }}>
                Reset to System Forecast
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Overrides feed into indent suggestions. Provide justification to DD before finalising.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Demand Forecasting</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Review historical consumption, forecast accuracy and generate procurement recommendations
        </p>
      </div>

      {/* Portfolio KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-4 pb-4">
            <BarChart3 className="h-4 w-4 text-blue-500 mb-1" />
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Items Tracked</p>
            <p className="text-3xl font-bold text-blue-600 mt-0.5">{mockForecasts.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">with active forecasts</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="pt-4 pb-4">
            <Target className="h-4 w-4 text-emerald-500 mb-1" />
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Avg Accuracy</p>
            <p className="text-3xl font-bold text-emerald-600 mt-0.5">
              {Math.round(mockForecasts.reduce((s, f) => s + f.forecastAccuracy, 0) / mockForecasts.length)}%
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">weighted avg MAPE</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="pt-4 pb-4">
            <Package className="h-4 w-4 text-amber-500 mb-1" />
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Items Needing Indent</p>
            <p className="text-3xl font-bold text-amber-600 mt-0.5">
              {portfolioData.filter(f => f.sugQty > 0).length}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">suggested qty &gt; 0</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-indigo-500">
          <CardContent className="pt-4 pb-4">
            <IndianRupee className="h-4 w-4 text-indigo-500 mb-1" />
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Est. Indent Value</p>
            <p className="text-2xl font-bold text-indigo-600 mt-0.5">{rupee(totalSugValue)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">based on suggested qty</p>
          </CardContent>
        </Card>
      </div>

      {/* Portfolio table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            Forecast Portfolio
            <span className="text-xs text-muted-foreground font-normal ml-1">— click a row to drill into chart</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead>Item</TableHead>
                <TableHead className="text-right">Avg Monthly</TableHead>
                <TableHead className="text-right">3M Forecast</TableHead>
                <TableHead>Accuracy</TableHead>
                <TableHead className="text-right">Stock Cover</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Trend</TableHead>
                <TableHead>Method</TableHead>
                <TableHead className="text-right">Suggested Indent</TableHead>
                <TableHead className="text-right">Est. Value</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {portfolioData.map(f => (
                <TableRow
                  key={f.itemId}
                  className="hover:bg-muted/30 cursor-pointer"
                  onClick={() => setDrillItemId(String(f.itemId))}
                >
                  <TableCell>
                    <p className="text-sm font-medium leading-snug">{f.itemName}</p>
                    <p className="text-xs text-muted-foreground font-mono">{f.itemCode}</p>
                  </TableCell>
                  <TableCell className="text-right text-sm font-medium">
                    {f.avgCons} <span className="text-xs text-muted-foreground font-normal">{f.unit}</span>
                  </TableCell>
                  <TableCell className="text-right text-sm font-medium">
                    {f.forecastQ} <span className="text-xs text-muted-foreground font-normal">{f.unit}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 rounded-full bg-slate-100">
                        <div
                          className={`h-1.5 rounded-full ${f.forecastAccuracy >= 90 ? "bg-emerald-500" : f.forecastAccuracy >= 75 ? "bg-amber-400" : "bg-red-500"}`}
                          style={{ width: `${f.forecastAccuracy}%` }}
                        />
                      </div>
                      <span className={`text-xs font-semibold ${accuracyColor(f.forecastAccuracy)}`}>
                        {f.forecastAccuracy}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={`text-xs font-semibold tabular-nums ${f.stockCoverDays === 999 ? "text-slate-400" : f.stockCoverDays < 30 ? "text-red-600" : f.stockCoverDays < 90 ? "text-amber-600" : "text-emerald-600"}`}>
                      {f.stockCoverDays === 999 ? "∞" : `${f.stockCoverDays}d`}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge className={`text-xs border ${f.action === "Order Now" ? "bg-red-100 text-red-700 border-red-200" : f.action === "Monitor" ? "bg-amber-100 text-amber-700 border-amber-200" : "bg-emerald-100 text-emerald-700 border-emerald-200"}`}>
                      {f.action}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      {f.trend === "up"
                        ? <TrendingUp className="h-3.5 w-3.5 text-amber-500" />
                        : f.trend === "down"
                        ? <TrendingDown className="h-3.5 w-3.5 text-emerald-500" />
                        : <Minus className="h-3.5 w-3.5 text-slate-400" />}
                      <span className="capitalize">{f.trend}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground">{f.forecastMethod}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    {f.sugQty > 0
                      ? <span className="text-sm font-semibold text-blue-700">{f.sugQty} {f.unit}</span>
                      : <span className="text-xs text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-right text-sm font-medium text-indigo-700">
                    {f.sugQty > 0 && f.unitPrice > 0 ? rupee(f.sugQty * f.unitPrice) : "—"}
                  </TableCell>
                  <TableCell>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Procurement recommendation */}
      <Card className="border-blue-200 bg-blue-50/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Target className="h-4 w-4 text-blue-500" />
            Procurement Recommendations
            <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs border">
              Based on current forecast + stock positions
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-blue-50">
                <TableHead>Item</TableHead>
                <TableHead className="text-right">Suggested Indent Qty</TableHead>
                <TableHead className="text-right">Est. Value</TableHead>
                <TableHead className="text-right">Stock Cover</TableHead>
                <TableHead>Ideal Order Date</TableHead>
                <TableHead>Basis</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {portfolioData.filter(f => f.sugQty > 0).map(f => (
                <TableRow key={f.itemId} className="bg-transparent">
                  <TableCell>
                    <p className="text-sm font-medium">{f.itemName}</p>
                    <p className="text-xs text-muted-foreground font-mono">{f.itemCode}</p>
                  </TableCell>
                  <TableCell className="text-right font-bold text-blue-700 text-sm">
                    {f.sugQty} {f.unit}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-indigo-700 text-sm">
                    {f.unitPrice > 0 ? rupee(f.sugQty * f.unitPrice) : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={`text-xs font-semibold ${f.stockCoverDays === 999 ? "text-slate-400" : f.stockCoverDays < 30 ? "text-red-600" : "text-amber-600"}`}>
                      {f.stockCoverDays === 999 ? "∞" : `${f.stockCoverDays}d`}
                    </span>
                  </TableCell>
                  <TableCell className={`text-xs font-semibold ${f.idealOrderDate === "Immediate" ? "text-red-600" : "text-slate-700"}`}>
                    {f.idealOrderDate}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    Network avg cover &lt; 60d; {f.forecastAccuracy}% forecast accuracy
                  </TableCell>
                  <TableCell>
                    {canRaiseIndent ? (
                      <Link href="/indents/new">
                        <Button size="sm" className="h-7 text-xs gap-1">
                          Raise Indent
                        </Button>
                      </Link>
                    ) : (
                      <span className="text-xs text-muted-foreground/40">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="text-xs text-muted-foreground mt-3 px-1">
            Suggested quantities are the sum of facility-level indent recommendations. Final quantities must be approved by the Deputy Director.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
