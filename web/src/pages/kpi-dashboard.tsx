import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  BarChart, Bar, LineChart, Line, ComposedChart, XAxis, YAxis,
  ResponsiveContainer, Tooltip, CartesianGrid, Cell, PieChart, Pie, Legend,
} from "recharts";
import {
  TrendingUp, TrendingDown, Minus, CheckCircle2, AlertTriangle, XCircle,
  Activity, ShieldCheck, Lightbulb, ThumbsUp, Target, BarChart3,
} from "lucide-react";
import { mockKPIs, mockProcurementKPIs, mockPendingByStage, mockBudgetByProgramme, mockVendorPerformance } from "@/mocks/data";
import type { KPIMetric } from "@/mocks/data";


const PERIODS = ["FY 2025-26", "Q4 (Jan–Mar 2026)", "Last 30 Days"] as const;
type Period = typeof PERIODS[number];

const RAG_BADGE: Record<string, { cls: string; icon: React.ElementType; label: string }> = {
  green: { cls: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: CheckCircle2, label: "On Target" },
  amber: { cls: "bg-amber-100 text-amber-700 border-amber-200",       icon: AlertTriangle, label: "Watch"     },
  red:   { cls: "bg-red-100 text-red-700 border-red-200",             icon: XCircle,       label: "Action"    },
};

const SCORE_MAP: Record<string, number> = { green: 100, amber: 50, red: 0 };

function ScoreRing({ score, color }: { score: number; color: string }) {
  const r = 52;
  const circumference = 2 * Math.PI * r;
  const dashOffset = circumference - (score / 100) * circumference;
  const stroke = color === "emerald" ? "#10b981" : color === "amber" ? "#f59e0b" : "#ef4444";
  const fill   = color === "emerald" ? "#065f46" : color === "amber" ? "#92400e" : "#991b1b";
  return (
    <svg width="130" height="130" viewBox="0 0 130 130" className="shrink-0">
      <circle cx="65" cy="65" r={r} fill="none" stroke="#e2e8f0" strokeWidth="12" />
      <circle
        cx="65" cy="65" r={r} fill="none"
        stroke={stroke} strokeWidth="12"
        strokeDasharray={circumference} strokeDashoffset={dashOffset}
        strokeLinecap="round" transform="rotate(-90 65 65)"
      />
      <text x="65" y="62" textAnchor="middle" fontSize="26" fontWeight="900" fill={fill}>{score}</text>
      <text x="65" y="78" textAnchor="middle" fontSize="11" fill="#94a3b8">/100</text>
    </svg>
  );
}

function HalfGauge({ value, max, target, unit, label, reverse = true }: { value: number; max: number; target: number; unit: string; label: string; reverse?: boolean }) {
  const pct = Math.min(Math.max((value / max) * 100, 0), 100);
  const isGood = reverse ? value <= target : value >= target;
  const stroke = isGood ? "#10b981" : value <= target * 1.3 ? "#f59e0b" : "#ef4444";
  const r = 60;
  const circ = Math.PI * r; // half circle circumference
  const strokeDashoffset = circ - (pct / 100) * circ;

  return (
    <div className="flex flex-col items-center">
      <svg width="160" height="95" viewBox="0 0 160 95">
        <path
          d="M 15 85 A 65 65 0 0 1 145 85"
          fill="none"
          stroke="#f1f5f9"
          strokeWidth="14"
          strokeLinecap="round"
        />
        <path
          d="M 15 85 A 65 65 0 0 1 145 85"
          fill="none"
          stroke={stroke}
          strokeWidth="14"
          strokeDasharray={circ}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
        />
        <text x="80" y="70" textAnchor="middle" fontSize="20" fontWeight="bold" fill="#0f172a">
          {value}{unit}
        </text>
        <text x="80" y="86" textAnchor="middle" fontSize="10" fill="#64748b">
          Target: {reverse ? "≤" : "≥"}{target}{unit}
        </text>
      </svg>
      <span className="text-xs font-semibold text-slate-700 mt-1">{label}</span>
      <span className={`text-[11px] font-bold ${isGood ? "text-emerald-600" : "text-amber-600"}`}>
        {isGood ? "Within Target SLA" : "Exceeds SLA Target"}
      </span>
    </div>
  );
}

function TrendIcon({ trend }: { trend: "up" | "down" | "stable" }) {
  if (trend === "up")   return <TrendingUp   className="h-3.5 w-3.5 text-emerald-600" />;
  if (trend === "down") return <TrendingDown className="h-3.5 w-3.5 text-red-500"     />;
  return                       <Minus        className="h-3.5 w-3.5 text-slate-400"   />;
}

function SparkChart({ kpi }: { kpi: KPIMetric }) {
  const barColor = kpi.status === "green" ? "#10b981" : kpi.status === "amber" ? "#f59e0b" : "#ef4444";
  const lineColor = kpi.trend === "up"
    ? (kpi.direction === "lower_is_better" ? "#ef4444" : "#10b981")
    : kpi.trend === "down"
    ? (kpi.direction === "lower_is_better" ? "#10b981" : "#ef4444")
    : "#94a3b8";
  return (
    <ResponsiveContainer width="100%" height={44}>
      <ComposedChart data={kpi.historicalValues} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
        <Bar dataKey="value" fill={barColor} opacity={0.35} radius={[2, 2, 0, 0]} />
        <Line
          type="monotone"
          dataKey="value"
          stroke={lineColor}
          strokeWidth={1.5}
          dot={false}
        />
        <Tooltip
          contentStyle={{ fontSize: 10, borderRadius: 6, padding: "2px 6px" }}
          labelStyle={{ display: "none" }}
          formatter={(v: number) => [`${v}${kpi.unit}`, ""]}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

function deltaPct(current: number, prior: number): string {
  if (!prior) return "—";
  const d = ((current - prior) / prior) * 100;
  return `${d >= 0 ? "+" : ""}${d.toFixed(1)}%`;
}

/* ─── Procurement KPI View Component (Process Book §13) ─────────────────────── */
function ProcurementKPIView({ period }: { period: Period }) {
  const compositeScoreProc = Math.round(
    mockProcurementKPIs.reduce((s, k) => s + SCORE_MAP[k.status], 0) / mockProcurementKPIs.length
  );
  const scoreColorProc = compositeScoreProc >= 80 ? "emerald" : compositeScoreProc >= 55 ? "amber" : "red";
  const scoreLabelProc = compositeScoreProc >= 80 ? "Healthy Procurement" : compositeScoreProc >= 55 ? "Moderate Backlog" : "Critical Delay";

  const greenCount = mockProcurementKPIs.filter(k => k.status === "green").length;
  const amberCount = mockProcurementKPIs.filter(k => k.status === "amber").length;
  const redCount   = mockProcurementKPIs.filter(k => k.status === "red").length;

  const kpi1 = mockProcurementKPIs.find(k => k.id === "indent_to_po_cycle")!;
  const kpi2 = mockProcurementKPIs.find(k => k.id === "po_to_delivery_cycle")!;

  return (
    <div className="space-y-6">
      {/* Hero Banner for Procurement */}
      <Card className="border-2 border-slate-200 bg-gradient-to-r from-blue-50/50 via-white to-emerald-50/40">
        <CardContent className="py-5">
          <div className="flex items-center justify-between gap-6 flex-wrap">
            <div className="flex items-center gap-5">
              <ScoreRing score={compositeScoreProc} color={scoreColorProc} />
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                  Procurement Governance Health (12 KPIs · §13)
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={`border text-sm px-3 py-0.5 bg-${scoreColorProc}-100 text-${scoreColorProc}-700 border-${scoreColorProc}-200`}>
                    {scoreLabelProc}
                  </Badge>
                  <span className="text-xs text-muted-foreground">Period: {period}</span>
                </div>
                <p className="text-xs text-slate-600 mt-1.5 max-w-md">
                  Real-time statutory tracking against Process Book §13 benchmarks for TGMSIDC Equipment Wing.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              {[
                { label: "On Target", count: greenCount, color: "emerald", icon: CheckCircle2, textCls: "text-emerald-700 bg-emerald-100" },
                { label: "Watch Alert", count: amberCount, color: "amber", icon: AlertTriangle, textCls: "text-amber-700 bg-amber-100" },
                { label: "Breached SLA", count: redCount, color: "rose", icon: XCircle, textCls: "text-rose-700 bg-rose-100" },
              ].map(({ label, count, icon: Icon, textCls }) => (
                <div key={label} className="text-center bg-white px-4 py-3 rounded-xl border shadow-sm min-w-[90px]">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center mx-auto mb-1 ${textCls}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <p className="text-2xl font-black text-slate-800">{count}</p>
                  <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Featured Section: KPI-1 and KPI-2 Cycle Time Gauges + Trend lines */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* KPI-1 Gauge & Trend */}
        <Card className="border border-border/80 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Target className="h-4 w-4 text-blue-600" />
                KPI-1: Avg Indent-to-PO Cycle Time
              </CardTitle>
              <Badge className="bg-emerald-100 text-emerald-800 border-0 text-[10px]">
                Target ≤15 working days
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <HalfGauge value={kpi1.currentValue} max={30} target={15} unit="d" label="Current Indent-to-PO" reverse={true} />
              <div className="flex-1 space-y-1 text-xs">
                <div className="flex justify-between border-b pb-1">
                  <span className="text-muted-foreground">Current Average:</span>
                  <span className="font-bold text-emerald-600">{kpi1.currentValue} working days</span>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span className="text-muted-foreground">Statutory Target:</span>
                  <span className="font-medium">≤ 15.0 days</span>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span className="text-muted-foreground">6-Month Trend:</span>
                  <span className="font-medium text-emerald-600">Decreased by 31.8%</span>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="text-muted-foreground">Fastest Phase:</span>
                  <span className="font-medium text-slate-700">RC Indent to PO (5.2d)</span>
                </div>
              </div>
            </div>
            <div className="h-28 w-full pt-1">
              <p className="text-[10px] uppercase font-semibold text-muted-foreground mb-1">Historical Trend (Working Days)</p>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={kpi1.historicalValues} margin={{ top: 2, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="period" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} domain={[10, 22]} />
                  <Tooltip />
                  <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* KPI-2 Gauge & Trend */}
        <Card className="border border-border/80 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Target className="h-4 w-4 text-emerald-600" />
                KPI-2: Avg PO-to-Delivery Cycle Time
              </CardTitle>
              <Badge className="bg-emerald-100 text-emerald-800 border-0 text-[10px]">
                Target ≤RC supply period (30d)
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <HalfGauge value={kpi2.currentValue} max={60} target={30} unit="d" label="Current PO-to-Delivery" reverse={true} />
              <div className="flex-1 space-y-1 text-xs">
                <div className="flex justify-between border-b pb-1">
                  <span className="text-muted-foreground">Current Average:</span>
                  <span className="font-bold text-emerald-600">{kpi2.currentValue} days</span>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span className="text-muted-foreground">Contractual Target:</span>
                  <span className="font-medium">≤ 30.0 days (RC Term)</span>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span className="text-muted-foreground">Lead Time Status:</span>
                  <span className="font-medium text-emerald-600">8.6 days buffer</span>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="text-muted-foreground">Fastest Supplier:</span>
                  <span className="font-medium text-slate-700">M/s Green Apple (18d)</span>
                </div>
              </div>
            </div>
            <div className="h-28 w-full pt-1">
              <p className="text-[10px] uppercase font-semibold text-muted-foreground mb-1">Historical Lead Time Trend (Days)</p>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={kpi2.historicalValues} margin={{ top: 2, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="period" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} domain={[18, 32]} />
                  <Tooltip />
                  <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* KPI-8 and KPI-7 Visual Sections: Stage-wise Pendency & Budget Utilisation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* KPI-8: Stage-wise Pending Actions */}
        <Card className="border border-border/80 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                KPI-8: Pending Actions by Procurement Stage
              </CardTitle>
              <Badge variant="outline" className="text-xs">
                Total: 8 Active Items
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-3">
              Distribution of indents and orders currently awaiting action at various pipeline stages.
            </p>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mockPendingByStage} layout="vertical" margin={{ top: 5, right: 20, left: 100, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="stage" tick={{ fontSize: 9 }} width={100} />
                  <Tooltip />
                  <Bar dataKey="count" name="Items Pending" radius={[0, 4, 4, 0]}>
                    {mockPendingByStage.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* KPI-7: Budget Utilisation per Programme */}
        <Card className="border border-border/80 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-emerald-600" />
                KPI-7: Budget Utilisation by Programme (§13 R-7)
              </CardTitle>
              <Badge className="bg-emerald-100 text-emerald-800 border-0 text-[10px]">
                Overall 78.4%
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-3">
              Fund Sanctioned vs. Committed vs. Disbursed per healthcare programme (₹ Lakhs).
            </p>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={mockBudgetByProgramme.map(b => ({
                    programme: b.programme.replace(" Modernisation", "").replace(" Upgradation", "").replace(" Accreditation", ""),
                    Sanctioned: Math.round(b.sanctioned / 100000),
                    Committed: Math.round(b.committed / 100000),
                    Spent: Math.round(b.spent / 100000),
                  }))}
                  margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="programme" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="Sanctioned" fill="#cbd5e1" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Committed" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Spent" fill="#10b981" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 12 Procurement KPI Cards Grid */}
      <div>
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3">
          All 12 Procurement KPI Cards (Process Book §13)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {mockProcurementKPIs.map(kpi => {
            const rag = RAG_BADGE[kpi.status];
            const RagIcon = rag.icon;
            const borderCls = kpi.status === "green"
              ? "border-l-emerald-500"
              : kpi.status === "amber"
              ? "border-l-amber-500"
              : "border-l-red-500";
            const valueCls = kpi.status === "green"
              ? "text-emerald-700"
              : kpi.status === "amber"
              ? "text-amber-700"
              : "text-red-700";
            const prior = kpi.historicalValues[kpi.historicalValues.length - 2]?.value;
            const delta = prior !== undefined ? deltaPct(kpi.currentValue, prior) : "—";
            const deltaGood = kpi.direction === "lower_is_better"
              ? kpi.currentValue <= (prior ?? kpi.currentValue)
              : kpi.currentValue >= (prior ?? kpi.currentValue);

            return (
              <Card key={kpi.id} className={`border-l-4 ${borderCls} shadow-sm`}>
                <CardHeader className="pb-1 pt-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-sm leading-tight font-bold">{kpi.name}</CardTitle>
                      <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{kpi.description}</p>
                    </div>
                    <Badge className={`text-[10px] border shrink-0 ${rag.cls}`}>
                      <RagIcon className="h-3 w-3 mr-1" />{rag.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pb-3">
                  <div className="flex items-end justify-between mb-1">
                    <div>
                      <span className={`text-2xl font-black ${valueCls}`}>{kpi.currentValue}</span>
                      <span className="text-xs font-semibold text-muted-foreground ml-1">{kpi.unit}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs">
                      <TrendIcon trend={kpi.trend} />
                      <span className={`font-semibold ${deltaGood ? "text-emerald-600" : "text-red-500"}`}>
                        {delta}
                      </span>
                      <span className="text-muted-foreground text-[10px]">vs prior</span>
                    </div>
                  </div>
                  <SparkChart kpi={kpi} />
                  <div className="mt-2 grid grid-cols-3 gap-1 text-center">
                    <div className="text-[10px]">
                      <div className="w-full h-0.5 bg-emerald-500 rounded mb-0.5" />
                      <span className="text-muted-foreground">
                        {kpi.direction === "lower_is_better" ? `≤${kpi.thresholdGreen}` : `≥${kpi.thresholdGreen}`}{kpi.unit}
                      </span>
                    </div>
                    <div className="text-[10px]">
                      <div className="w-full h-0.5 bg-amber-500 rounded mb-0.5" />
                      <span className="text-muted-foreground">
                        {kpi.direction === "lower_is_better" ? `≤${kpi.thresholdAmber}` : `≥${kpi.thresholdAmber}`}{kpi.unit}
                      </span>
                    </div>
                    <div className="text-[10px]">
                      <div className="w-full h-0.5 bg-red-500 rounded mb-0.5" />
                      <span className="text-muted-foreground">
                        {kpi.direction === "lower_is_better" ? `>${kpi.thresholdAmber}` : `<${kpi.thresholdAmber}`}{kpi.unit}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* KPI-10: Vendor Scorecard Overview */}
      <Card className="border border-border/80 shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              KPI-10: Empanelled Vendor Performance Scorecard (§13 R-3/KPI-10)
            </CardTitle>
            <Badge variant="outline" className="text-xs">
              Statutory Benchmark: ≥80/100
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="text-xs">Vendor Name</TableHead>
                  <TableHead className="text-right text-xs">Total Orders</TableHead>
                  <TableHead className="text-right text-xs">On-Time (40%)</TableHead>
                  <TableHead className="text-right text-xs">QA Pass (35%)</TableHead>
                  <TableHead className="text-right text-xs">Lead Time</TableHead>
                  <TableHead className="text-right text-xs">Performance Score (KPI-10)</TableHead>
                  <TableHead className="text-center text-xs">Rating Grade</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs">
                {mockVendorPerformance.map(v => {
                  const onTimeRate = Math.round((v.onTimeDeliveries / v.totalOrders) * 100);
                  const isTop = v.performanceScore >= 90;
                  const isGood = v.performanceScore >= 80;
                  return (
                    <TableRow key={v.vendorId} className="hover:bg-muted/20">
                      <TableCell className="font-semibold text-slate-800">{v.vendorName}</TableCell>
                      <TableCell className="text-right font-medium">{v.totalOrders}</TableCell>
                      <TableCell className="text-right font-semibold text-blue-700">{onTimeRate}%</TableCell>
                      <TableCell className="text-right font-semibold text-emerald-700">{v.qaPassRate}%</TableCell>
                      <TableCell className="text-right font-mono">{v.avgLeadTimeDays} days</TableCell>
                      <TableCell className="text-right font-bold font-mono text-sm">
                        <span className={v.performanceScore >= 80 ? "text-emerald-700" : "text-amber-700"}>
                          {v.performanceScore}/100
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={`text-[10px] border-0 ${isTop ? "bg-emerald-100 text-emerald-800" : isGood ? "bg-blue-100 text-blue-800" : "bg-amber-100 text-amber-800"}`}>
                          {isTop ? "★ Class A (Preferred)" : isGood ? "Class B (Compliant)" : "Class C (Watch)"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Full 12-KPI Scorecard Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            12 Procurement KPIs Statutory Scorecard
            <span className="text-xs text-muted-foreground font-normal ml-1">· Process Book §13 Standard</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead>Procurement KPI</TableHead>
                <TableHead className="text-right">Current</TableHead>
                <TableHead className="text-right">vs Prior Period</TableHead>
                <TableHead className="text-right">Target</TableHead>
                <TableHead className="text-right">Watch</TableHead>
                <TableHead className="text-right">Alert</TableHead>
                <TableHead>Trend</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockProcurementKPIs.map(kpi => {
                const rag = RAG_BADGE[kpi.status];
                const RagIcon = rag.icon;
                const prior = kpi.historicalValues[kpi.historicalValues.length - 2]?.value;
                const delta = prior !== undefined ? deltaPct(kpi.currentValue, prior) : "—";
                const deltaGood = prior !== undefined
                  ? (kpi.direction === "lower_is_better"
                      ? kpi.currentValue <= prior
                      : kpi.currentValue >= prior)
                  : true;
                const valueCls = kpi.status === "green"
                  ? "text-emerald-700"
                  : kpi.status === "amber"
                  ? "text-amber-700"
                  : "text-red-700";
                return (
                  <TableRow key={kpi.id} className="hover:bg-muted/20">
                    <TableCell>
                      <p className="text-sm font-semibold">{kpi.name}</p>
                      <p className="text-xs text-muted-foreground">{kpi.description}</p>
                    </TableCell>
                    <TableCell className={`text-right font-bold text-sm ${valueCls}`}>
                      {kpi.currentValue}{kpi.unit}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={`text-xs font-semibold ${deltaGood ? "text-emerald-600" : "text-red-500"}`}>
                        {delta}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-xs text-emerald-700 font-semibold">
                      {kpi.direction === "lower_is_better" ? `≤${kpi.thresholdGreen}` : `≥${kpi.thresholdGreen}`}{kpi.unit}
                    </TableCell>
                    <TableCell className="text-right text-xs text-amber-700">
                      {kpi.direction === "lower_is_better" ? `≤${kpi.thresholdAmber}` : `≥${kpi.thresholdAmber}`}{kpi.unit}
                    </TableCell>
                    <TableCell className="text-right text-xs text-red-700">
                      {kpi.direction === "lower_is_better" ? `>${kpi.thresholdAmber}` : `<${kpi.thresholdAmber}`}{kpi.unit}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <TrendIcon trend={kpi.trend} />
                        <span className="text-xs text-muted-foreground capitalize">{kpi.trend}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-xs border ${rag.cls}`}>
                        <RagIcon className="h-3 w-3 mr-1" />{rag.label}
                      </Badge>
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


/* ─── Supply Chain KPI View Component ───────────────────────────────────────── */
function SupplyChainKPIView({ period }: { period: Period }) {
  const compositeScore = Math.round(
    mockKPIs.reduce((s, k) => s + SCORE_MAP[k.status], 0) / mockKPIs.length,
  );
  const scoreColor = compositeScore >= 80 ? "emerald" : compositeScore >= 55 ? "amber" : "red";
  const scoreLabel = compositeScore >= 80 ? "Good" : compositeScore >= 55 ? "Needs Attention" : "Critical";

  const greenCount = mockKPIs.filter(k => k.status === "green").length;
  const amberCount = mockKPIs.filter(k => k.status === "amber").length;
  const redCount   = mockKPIs.filter(k => k.status === "red").length;

  const insights: { type: "issue" | "win"; title: string; detail: string; kpiId: string }[] = [
    {
      type:   "issue",
      title:  "Stock-Out Rate rising",
      detail: "8.3% — above 5% target and trending up. Gandhi Hospital and Sangareddy need immediate replenishment.",
      kpiId:  "stock_out_rate",
    },
    {
      type:   "issue",
      title:  "FEFO compliance below threshold",
      detail: "78.5% vs ≥90% target. Older batches are being skipped in issue, risking near-expiry wastage.",
      kpiId:  "fefo_compliance",
    },
    {
      type:   "issue",
      title:  "Near-Expiry stock trending up",
      detail: "12.7% of total stock approaching expiry. 6-month trend shows consistent increase — redistribute immediately.",
      kpiId:  "near_expiry_pct",
    },
    {
      type:   "win",
      title:  "Forecast Accuracy above target",
      detail: "87.3% — exceeds 85% target and still improving. Enables more reliable indent planning.",
      kpiId:  "forecast_accuracy",
    },
    {
      type:   "win",
      title:  "Redistribution TAT well within SLA",
      detail: "4.2 days vs ≤5d target. Cross-facility transfers being processed efficiently.",
      kpiId:  "redistribution_tat",
    },
    {
      type:   "win",
      title:  "Overstock rate declining",
      detail: "Down from 25% to 21.4% over 4 months — redistribution programme is working.",
      kpiId:  "overstock_rate",
    },
  ];

  const issues = insights.filter(i => i.type === "issue");
  const wins   = insights.filter(i => i.type === "win");

  return (
    <div className="space-y-6">
      {/* Composite health score hero */}
      <Card className={`border-2 border-${scoreColor}-200 bg-gradient-to-r from-${scoreColor}-50 to-background`}>
        <CardContent className="py-5">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4">
              <ScoreRing score={compositeScore} color={scoreColor} />
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                  Composite Health Score
                </p>
                <Badge className={`mt-1 border bg-${scoreColor}-100 text-${scoreColor}-700 border-${scoreColor}-200 text-sm px-3`}>
                  {scoreLabel}
                </Badge>
                <p className="text-xs text-muted-foreground mt-1.5">
                  Weighted average across {mockKPIs.length} KPIs · Period: {period}
                </p>
              </div>
            </div>
            <div className="flex-1 h-px bg-border mx-2" />
            <div className="flex gap-6">
              {[
                { label: "On Target", count: greenCount, color: "emerald", icon: CheckCircle2 },
                { label: "Watch",     count: amberCount, color: "amber",   icon: AlertTriangle },
                { label: "Action",    count: redCount,   color: "red",     icon: XCircle },
              ].map(({ label, count, color, icon: Icon }) => (
                <div key={label} className="text-center">
                  <div className={`h-10 w-10 rounded-full bg-${color}-100 flex items-center justify-center mx-auto mb-1`}>
                    <Icon className={`h-5 w-5 text-${color}-600`} />
                  </div>
                  <p className={`text-2xl font-bold text-${color}-600`}>{count}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Executive Insights */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="border-red-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Issues Requiring Attention
              <Badge className="bg-red-100 text-red-700 border-red-200 text-xs border">{issues.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {issues.map((ins, i) => (
              <div key={i} className="flex items-start gap-2.5 rounded-md bg-red-50 border border-red-100 p-2.5">
                <XCircle className="h-3.5 w-3.5 text-red-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-red-800">{ins.title}</p>
                  <p className="text-xs text-red-700/80 mt-0.5 leading-snug">{ins.detail}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-emerald-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-emerald-700">
              <ThumbsUp className="h-4 w-4 text-emerald-500" />
              Positive Trends
              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs border">{wins.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {wins.map((ins, i) => (
              <div key={i} className="flex items-start gap-2.5 rounded-md bg-emerald-50 border border-emerald-100 p-2.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-emerald-800">{ins.title}</p>
                  <p className="text-xs text-emerald-700/80 mt-0.5 leading-snug">{ins.detail}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {mockKPIs.map(kpi => {
          const rag    = RAG_BADGE[kpi.status];
          const RagIcon = rag.icon;
          const borderCls = kpi.status === "green"
            ? "border-l-emerald-500"
            : kpi.status === "amber"
            ? "border-l-amber-500"
            : "border-l-red-500";
          const valueCls = kpi.status === "green"
            ? "text-emerald-700"
            : kpi.status === "amber"
            ? "text-amber-700"
            : "text-red-700";
          const prior = kpi.historicalValues[kpi.historicalValues.length - 2]?.value;
          const delta = prior !== undefined ? deltaPct(kpi.currentValue, prior) : "—";
          const deltaGood = kpi.direction === "lower_is_better"
            ? kpi.currentValue <= (prior ?? kpi.currentValue)
            : kpi.currentValue >= (prior ?? kpi.currentValue);
          return (
            <Card key={kpi.id} className={`border-l-4 ${borderCls}`}>
              <CardHeader className="pb-1 pt-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-sm leading-tight">{kpi.name}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{kpi.description}</p>
                  </div>
                  <Badge className={`text-xs border shrink-0 ${rag.cls}`}>
                    <RagIcon className="h-3 w-3 mr-1" />{rag.label}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pb-3">
                <div className="flex items-end justify-between mb-1">
                  <div>
                    <span className={`text-2xl font-bold ${valueCls}`}>{kpi.currentValue}</span>
                    <span className="text-sm text-muted-foreground ml-1">{kpi.unit}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs">
                    <TrendIcon trend={kpi.trend} />
                    <span className={`font-medium ${deltaGood ? "text-emerald-600" : "text-red-500"}`}>
                      {delta}
                    </span>
                    <span className="text-muted-foreground">vs prior</span>
                  </div>
                </div>
                <SparkChart kpi={kpi} />
                <div className="mt-2 grid grid-cols-3 gap-1 text-center">
                  <div className="text-xs">
                    <div className="w-full h-0.5 bg-emerald-500 rounded mb-0.5" />
                    <span className="text-muted-foreground">
                      {kpi.direction === "lower_is_better" ? `<${kpi.thresholdGreen}` : `>${kpi.thresholdGreen}`}{kpi.unit}
                    </span>
                  </div>
                  <div className="text-xs">
                    <div className="w-full h-0.5 bg-amber-500 rounded mb-0.5" />
                    <span className="text-muted-foreground">
                      {kpi.direction === "lower_is_better" ? `<${kpi.thresholdAmber}` : `>${kpi.thresholdAmber}`}{kpi.unit}
                    </span>
                  </div>
                  <div className="text-xs">
                    <div className="w-full h-0.5 bg-red-500 rounded mb-0.5" />
                    <span className="text-muted-foreground">
                      {kpi.direction === "lower_is_better" ? `>${kpi.thresholdRed}` : `<${kpi.thresholdRed}`}{kpi.unit}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Scorecard table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            Supply Chain KPI Scorecard
            <span className="text-xs text-muted-foreground font-normal ml-1">· {period}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead>KPI</TableHead>
                <TableHead className="text-right">Current</TableHead>
                <TableHead className="text-right">vs Prior Period</TableHead>
                <TableHead className="text-right">Target</TableHead>
                <TableHead className="text-right">Watch</TableHead>
                <TableHead className="text-right">Alert</TableHead>
                <TableHead>Trend</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockKPIs.map(kpi => {
                const rag      = RAG_BADGE[kpi.status];
                const RagIcon  = rag.icon;
                const prior    = kpi.historicalValues[kpi.historicalValues.length - 2]?.value;
                const delta    = prior !== undefined ? deltaPct(kpi.currentValue, prior) : "—";
                const deltaGood = prior !== undefined
                  ? (kpi.direction === "lower_is_better"
                      ? kpi.currentValue <= prior
                      : kpi.currentValue >= prior)
                  : true;
                const valueCls = kpi.status === "green"
                  ? "text-emerald-700"
                  : kpi.status === "amber"
                  ? "text-amber-700"
                  : "text-red-700";
                return (
                  <TableRow key={kpi.id} className="hover:bg-muted/20">
                    <TableCell>
                      <p className="text-sm font-medium">{kpi.name}</p>
                      <p className="text-xs text-muted-foreground">{kpi.description}</p>
                    </TableCell>
                    <TableCell className={`text-right font-bold ${valueCls}`}>
                      {kpi.currentValue}{kpi.unit}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={`text-xs font-semibold ${deltaGood ? "text-emerald-600" : "text-red-500"}`}>
                        {delta}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-xs text-emerald-700">
                      {kpi.direction === "lower_is_better" ? `<${kpi.thresholdGreen}` : `>${kpi.thresholdGreen}`}{kpi.unit}
                    </TableCell>
                    <TableCell className="text-right text-xs text-amber-700">
                      {kpi.direction === "lower_is_better" ? `<${kpi.thresholdAmber}` : `>${kpi.thresholdAmber}`}{kpi.unit}
                    </TableCell>
                    <TableCell className="text-right text-xs text-red-700">
                      {kpi.direction === "lower_is_better" ? `>${kpi.thresholdRed}` : `<${kpi.thresholdRed}`}{kpi.unit}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <TrendIcon trend={kpi.trend} />
                        <span className="text-xs text-muted-foreground capitalize">{kpi.trend}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-xs border ${rag.cls}`}>
                        <RagIcon className="h-3 w-3 mr-1" />{rag.label}
                      </Badge>
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

export default function KPIDashboard() {
  const [period, setPeriod] = useState<Period>("FY 2025-26");
  const [domain, setDomain] = useState<"procurement" | "supply_chain">("procurement");

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Enterprise KPI Dashboard</h1>
            <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">
              Process Book §13 Suite
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Real-time executive performance monitoring and governance metrics for TGMSIDC
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Domain Tab Switcher */}
          <div className="flex bg-slate-100 rounded-lg p-1 border gap-1">
            <button
              onClick={() => setDomain("procurement")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                domain === "procurement"
                  ? "bg-white text-primary shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Target className="h-3.5 w-3.5 text-primary" />
              12 Procurement KPIs (§13)
            </button>
            <button
              onClick={() => setDomain("supply_chain")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                domain === "supply_chain"
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Activity className="h-3.5 w-3.5 text-slate-600" />
              Supply Chain &amp; Warehouse
            </button>
          </div>

          {/* Period selector */}
          <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1 border">
            {PERIODS.map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  period === p
                    ? "bg-background shadow text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Domain Render */}
      {domain === "procurement" ? (
        <ProcurementKPIView period={period} />
      ) : (
        <SupplyChainKPIView period={period} />
      )}
    </div>
  );
}

