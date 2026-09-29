import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  useGetVendorPerformance, getGetVendorPerformanceQueryKey,
  useGetSlaMetrics, getGetSlaMetricsQueryKey,
  useGetProcurementPipeline, getGetProcurementPipelineQueryKey,
} from "@/lib/api-hooks";
import {
  getIndentAgingReport, getRCExpiryReport, getPOStatusReport,
  getDeliveryComplianceReport, getDEOAccuracyReport, getTenderAuditReport,
  getEquipmentInventoryReport, getQASummaryReport,
} from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  LineChart, Line, Legend, Cell, PieChart, Pie, AreaChart, Area,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ReferenceLine,
} from "recharts";
import { cn } from "@/lib/utils";
import {
  TrendingUp, TrendingDown, Minus, Download, Printer, RefreshCw,
  BarChart3, IndianRupee, Truck, ShieldCheck, AlertTriangle, CheckCircle2,
  FileText, Clock, Users, Activity, Gavel, XCircle, ShieldAlert,
} from "lucide-react";
import { differenceInDays, format } from "date-fns";
import { mockEquipment, mockRateContracts, mockTenders, mockDistributionData, mockIndents, mockBudgetByProgramme, mockVendorPerformance } from "@/mocks/data";

/* ── Period hierarchy options (FY, Quarterly, Monthly) ── */
const FY_OPTIONS = ["FY 2025-26", "FY 2024-25", "FY 2023-24"];

const QUARTERS = [
  { id: "all", label: "All Quarters", months: ["April", "May", "June", "July", "August", "September", "October", "November", "December", "January", "February", "March"] },
  { id: "Q1",  label: "Q1 (Apr – Jun)", months: ["April", "May", "June"] },
  { id: "Q2",  label: "Q2 (Jul – Sep)", months: ["July", "August", "September"] },
  { id: "Q3",  label: "Q3 (Oct – Dec)", months: ["October", "November", "December"] },
  { id: "Q4",  label: "Q4 (Jan – Mar)", months: ["January", "February", "March"] },
];

/* ── Tabs (Process Book §13 Statutory Suite) ─────────────────── */
const TABS = [
  { id: "overview",      label: "Executive Overview (R-1)",            icon: BarChart3 },
  { id: "indent_aging",  label: "Indent Aging & Pendency (R-2)",       icon: Clock },
  { id: "rc_expiry",     label: "RC Expiry & Renewal (R-5)",           icon: ShieldAlert },
  { id: "po_status",     label: "PO & Payment Tracker (R-6)",          icon: FileText },
  { id: "financial",     label: "Budget & Spend (R-7)",                icon: IndianRupee },
  { id: "delivery_qa",   label: "Delivery & QA (R-8, R-9)",            icon: Truck },
  { id: "equipment_inv", label: "Equipment Inventory (R-4)",           icon: Activity },
  { id: "vendor",        label: "Vendor Performance (R-3)",            icon: Users },
  { id: "sla",           label: "SLA & Compliance (R-10)",             icon: ShieldCheck },
  { id: "tender_audit",  label: "Tender Statutory Audit (R-15)",       icon: Gavel },
  { id: "deo_accuracy",  label: "DEO Data Quality (R-14)",             icon: ShieldCheck },
  { id: "distribution",  label: "Distribution Analytics",              icon: Truck },
];


/* ── Chart colour palette ─────────────────────── */
const C = {
  blue:    "#3b82f6", indigo: "#6366f1", emerald: "#10b981", amber: "#f59e0b",
  rose:    "#f43f5e", violet:"#8b5cf6", sky:     "#0ea5e9", teal:  "#14b8a6",
  orange:  "#f97316", slate: "#94a3b8",
};

/* ── Trend indicator ─────────────────────────── */
function Trend({ val, good }: { val: number; good: "up" | "down" }) {
  const up = val > 0;
  const isGood = good === "up" ? up : !up;
  const Icon = val === 0 ? Minus : up ? TrendingUp : TrendingDown;
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-xs font-semibold", isGood ? "text-emerald-600" : "text-red-500")}>
      <Icon className="h-3 w-3" />
      {val === 0 ? "—" : `${Math.abs(val)}%`}
    </span>
  );
}

/* ── KPI Stat card ─────────────────────────────── */
function StatCard({ title, value, sub, trend, trendGood, icon: Icon, color }:{
  title:string; value:string|number; sub?:string; trend?:number; trendGood?:"up"|"down";
  icon:React.ElementType; color:string;
}) {
  return (
    <Card className="border hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl shrink-0" style={{ background: `${color}18` }}>
            <Icon className="h-5 w-5" style={{ color }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-0.5 text-foreground">{value}</p>
            {(sub || trend !== undefined) && (
              <div className="flex items-center gap-2 mt-1">
                {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
                {trend !== undefined && trendGood && <Trend val={trend} good={trendGood} />}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─────────── Mock datasets ─────────────────────── */
const monthlySpend = [
  { month:"Apr", spend:18.2, budget:22 },  { month:"May", spend:24.6, budget:22 },
  { month:"Jun", spend:21.1, budget:22 },  { month:"Jul", spend:28.4, budget:28 },
  { month:"Aug", spend:19.8, budget:28 },  { month:"Sep", spend:30.5, budget:28 },
  { month:"Oct", spend:26.7, budget:30 },  { month:"Nov", spend:33.2, budget:30 },
  { month:"Dec", spend:22.4, budget:30 },  { month:"Jan", spend:31.9, budget:32 },
  { month:"Feb", spend:27.6, budget:32 },  { month:"Mar", spend:35.8, budget:32 },
];

const spendByCategory = [
  { category:"Diagnostic Equipment",  value:8.42, pct:29 },
  { category:"Imaging Systems",       value:6.18, pct:21 },
  { category:"ICU & Life Support",    value:5.34, pct:18 },
  { category:"Surgical Instruments",  value:3.91, pct:13 },
  { category:"Laboratory Equipment",  value:3.02, pct:10 },
  { category:"General Medical",       value:2.63, pct:9  },
];

const budgetUtilization = [
  { dept:"AIIMS Hyderabad",     allocated:45, utilized:38.2, pct:85 },
  { dept:"Gandhi Hospital",     allocated:32, utilized:29.1, pct:91 },
  { dept:"Osmania General",     allocated:28, utilized:19.6, pct:70 },
  { dept:"Nizamabad DH",        allocated:15, utilized:11.8, pct:79 },
  { dept:"Karimnagar DH",       allocated:12, utilized:6.4,  pct:53 },
];

const cycleTrend = [
  { month:"Oct", indentApproval:5.1, approvalPO:9.3, poDelivery:25.2, total:39.6 },
  { month:"Nov", indentApproval:4.8, approvalPO:8.7, poDelivery:24.1, total:37.6 },
  { month:"Dec", indentApproval:4.5, approvalPO:8.9, poDelivery:22.8, total:36.2 },
  { month:"Jan", indentApproval:3.9, approvalPO:8.1, poDelivery:21.5, total:33.5 },
  { month:"Feb", indentApproval:3.5, approvalPO:7.9, poDelivery:21.1, total:32.5 },
  { month:"Mar", indentApproval:3.2, approvalPO:7.8, poDelivery:21.4, total:32.4 },
];

const indentAgeing = [
  { range:"0–7 days",  count:8, color:C.emerald },
  { range:"8–15 days", count:5, color:C.amber },
  { range:"16–30 days",count:3, color:C.orange },
  { range:">30 days",  count:4, color:C.rose },
];

const qaRejection = [
  { category:"Diagnostic",  rate:3.2 }, { category:"Imaging",  rate:5.4 },
  { category:"ICU",         rate:2.1 }, { category:"Surgical", rate:1.8 },
  { category:"Laboratory",  rate:4.0 }, { category:"General",  rate:1.2 },
];

const slaBreachesByStage = [
  { stage:"Indent Approval",  breaches:4, total:18, pct:22 },
  { stage:"Budget Clearance", breaches:2, total:18, pct:11 },
  { stage:"GM Approval",      breaches:6, total:15, pct:40 },
  { stage:"PO Issuance",      breaches:1, total:12, pct: 8 },
  { stage:"Delivery",         breaches:3, total:10, pct:30 },
  { stage:"GRN",              breaches:1, total:9,  pct:11 },
];

const complianceScores = [
  { subject:"Financial Controls", score:88 }, { subject:"Procurement Rules",   score:91 },
  { subject:"Vendor Due Diligence",score:76 }, { subject:"SLA Adherence",       score:72 },
  { subject:"3-Way Match",         score:95 }, { subject:"Documentation",       score:83 },
];

const monthlyBreachTrend = [
  { month:"Oct", breaches:8 }, { month:"Nov", breaches:7 }, { month:"Dec", breaches:9 },
  { month:"Jan", breaches:6 }, { month:"Feb", breaches:5 }, { month:"Mar", breaches:4 },
];

const vendorDetails = [
  { name:"BPL Medical Technologies Ltd",       orders:8,  onTime:6,  qaPass:87.5, leadDays:42, score:87, defects:3  },
  { name:"Siemens Healthineers India Pvt Ltd", orders:12, onTime:11, qaPass:96.0, leadDays:35, score:94, defects:1  },
  { name:"Nidek Medical India Pvt Ltd",        orders:5,  onTime:5,  qaPass:100,  leadDays:30, score:91, defects:0  },
  { name:"Philips India Ltd",                  orders:7,  onTime:5,  qaPass:89.3, leadDays:45, score:82, defects:2  },
  { name:"Trivitron Healthcare Pvt Ltd",       orders:4,  onTime:3,  qaPass:82.0, leadDays:50, score:75, defects:4  },
];

const CUSTOM_TOOLTIP_STYLE = { fontSize:12, borderRadius:8, border:"1px solid #e5e7eb", boxShadow:"0 4px 12px rgba(0,0,0,.08)" };

/* ── Recharts custom tooltip ─────────────────── */
function ChartTooltip({ active, payload, label, unit="" }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-xs">
      <p className="font-semibold text-slate-700 mb-1.5">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full shrink-0" style={{ background: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-semibold ml-auto pl-3">{p.value}{unit}</span>
        </div>
      ))}
    </div>
  );
}

/* ─────────── TABS content ─────────────────────── */

function OverviewTab({ pipeline, sla }: any) {
  const totalSpend = monthlySpend.reduce((s, m) => s + m.spend, 0).toFixed(1);
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Total PO Value (FY)" value={`₹${totalSpend}Cr`} sub="vs ₹317Cr budget" trend={-8} trendGood="up" icon={IndianRupee} color={C.blue} />
        <StatCard title="Active Indents"      value={18}    sub="Across 5 facilities" trend={+12} trendGood="up" icon={FileText}   color={C.violet} />
        <StatCard title="Avg Cycle Time"      value="32.4d" sub="Indent → Delivery"   trend={-18} trendGood="down" icon={Clock}    color={C.emerald} />
        <StatCard title="On-Time Delivery"    value="82%"   sub="5 active vendors"   trend={+5}  trendGood="up" icon={Truck}      color={C.teal} />
        <StatCard title="Budget Utilisation"  value="78.4%" sub="₹248.8Cr of ₹317Cr" trend={+6}  trendGood="up" icon={Activity}   color={C.amber} />
        <StatCard title="SLA Breaches"        value={sla?.slaBreaches ?? 4} sub="Last 30 days" trend={-33} trendGood="down" icon={AlertTriangle} color={C.rose} />
        <StatCard title="QA Pass Rate"        value="93.2%" sub="FY aggregate"        trend={+2}  trendGood="up" icon={CheckCircle2} color={C.sky} />
        <StatCard title="Active Vendors"      value={vendorDetails.length} sub="Empanelled suppliers" trend={0} trendGood="up" icon={Users} color={C.orange} />
      </div>

      {/* Spend trend */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Monthly Spend vs Budget (₹ Crore)</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Actual expenditure against allocated budget per month</p>
          </div>
          <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs">On Track</Badge>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={monthlySpend} margin={{ top:4, right:8, left:-8, bottom:0 }}>
              <defs>
                <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={C.blue}    stopOpacity={0.15} />
                  <stop offset="95%" stopColor={C.blue}    stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize:11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize:11 }} tickLine={false} axisLine={false} />
              <Tooltip content={<ChartTooltip unit="Cr" />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize:11 }} />
              <Area type="monotone" dataKey="spend"  stroke={C.blue}  strokeWidth={2.5} fill="url(#spendGrad)" name="Actual Spend" dot={false} />
              <Line type="monotone" dataKey="budget" stroke={C.amber} strokeWidth={1.5} strokeDasharray="6 3"   name="Budget Cap"  dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pipeline */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Pipeline Stage Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {pipeline?.length > 0 ? (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width={160} height={160}>
                  <PieChart>
                    <Pie data={pipeline} dataKey="count" cx="50%" cy="50%" innerRadius={45} outerRadius={72} paddingAngle={3}>
                      {pipeline.map((_: any, i: number) => <Cell key={i} fill={Object.values(C)[i % Object.values(C).length] as string} />)}
                    </Pie>
                    <Tooltip contentStyle={CUSTOM_TOOLTIP_STYLE} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {pipeline.map((p: any, i: number) => (
                    <div key={p.stage} className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ background: Object.values(C)[i % Object.values(C).length] as string }} />
                      <span className="text-xs text-muted-foreground flex-1">{p.stage}</span>
                      <span className="text-xs font-bold">{p.count}</span>
                      <span className="text-[10px] text-muted-foreground w-7 text-right">{p.percentage}%</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">No data</div>}
          </CardContent>
        </Card>

        {/* Spend by category */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Spend by Equipment Category (₹ Cr)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2.5">
              {spendByCategory.map((c, i) => (
                <div key={c.category}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">{c.category}</span>
                    <span className="font-semibold">₹{c.value}Cr <span className="text-muted-foreground font-normal">({c.pct}%)</span></span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width:`${c.pct}%`, background: Object.values(C)[i] as string }} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* R-1 Indent Pipeline Register Table */}
      <Card>

        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Procurement Pipeline Register (Process Book §13 R-1)
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Live tracking of all active equipment requisitions across statutory milestones
            </p>
          </div>
          <Badge variant="outline" className="text-xs">
            {mockIndents.length} Total Indents in Pipeline
          </Badge>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/30 border-b">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Indent Number</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Hospital Consignee</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Equipment Description</th>
                  <th className="px-3 py-2 text-center font-medium text-muted-foreground">Qty</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Current Stage</th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground">Days in Stage</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Next Action Owner</th>
                  <th className="px-3 py-2 text-center font-medium text-muted-foreground">Route</th>
                  <th className="px-3 py-2 text-center font-medium text-muted-foreground">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {mockIndents.map((ind: any) => {
                  const daysInStage = differenceInDays(new Date(), new Date(ind.updatedAt || ind.createdAt));
                  const owner = ind.status === "pending_approval"
                    ? "GM (Equipment Wing)"
                    : ind.status === "tender_initiated"
                    ? "Tender Evaluation Cell"
                    : ind.status === "po_issued"
                    ? "Vendor / Consignee"
                    : "Section Officer";
                  return (
                    <tr key={ind.id} className="hover:bg-muted/20">
                      <td className="px-3 py-2.5 font-mono font-medium text-primary">{ind.indentNumber}</td>
                      <td className="px-3 py-2.5">{ind.facilityName}</td>
                      <td className="px-3 py-2.5 font-medium">{ind.equipmentName}</td>
                      <td className="px-3 py-2.5 text-center font-bold">{ind.quantity}</td>
                      <td className="px-3 py-2.5">
                        <Badge className="text-[10px] border-0 bg-blue-100 text-blue-700 capitalize">
                          {ind.status.replace("_", " ")}
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5 text-right font-semibold tabular-nums">
                        <span className={daysInStage > 15 ? "text-red-600 font-bold" : daysInStage > 7 ? "text-amber-600" : "text-emerald-700"}>
                          {daysInStage}d
                        </span>
                      </td>
                      <td className="px-3 py-2.5 font-medium text-slate-700">{owner}</td>
                      <td className="px-3 py-2.5 text-center capitalize">
                        <span className="text-[11px] font-mono text-muted-foreground">
                          {ind.procurementMode?.replace("_", " ") || "Evaluation"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <Link href={`/indents/${ind.id}`}>
                          <span className="text-[11px] text-primary hover:underline cursor-pointer font-semibold">
                            Full Journey →
                          </span>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function FinancialTab() {
  const [selectedProg, setSelectedProg] = useState<string>("all");

  const filteredBudget = selectedProg === "all"
    ? mockBudgetByProgramme
    : mockBudgetByProgramme.filter(b => b.programme === selectedProg);

  return (
    <div className="space-y-5">
      {/* Program-wise Budget Utilization Summary (§13 R-7 enhancement) */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
            Programme &amp; Account Head Budget Utilisation (Process Book §13 R-7)
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Breakdown of capital sanctions, commitments, and actual expenditures per government scheme
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Filter Scheme:</span>
          <select
            value={selectedProg}
            onChange={(e) => setSelectedProg(e.target.value)}
            className="text-xs border rounded-md px-2.5 py-1.5 bg-white font-medium"
          >
            <option value="all">All Programmes (5 Schemes)</option>
            {mockBudgetByProgramme.map(b => (
              <option key={b.programme} value={b.programme}>{b.programme}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Programme Utilisation Cards & Bar Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Sanctioned vs. Committed vs. Disbursed (₹ Lakh)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={filteredBudget.map(b => ({
                    programme: b.programme.replace(" Modernisation", "").replace(" Upgradation", "").replace(" Accreditation", ""),
                    Sanctioned: Math.round(b.sanctioned / 100000),
                    Committed: Math.round(b.committed / 100000),
                    Spent: Math.round(b.spent / 100000),
                  }))}
                  margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="programme" tick={{ fontSize: 10 }} />
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

        {/* Programme Register */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Scheme Highlights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {filteredBudget.map(b => {
              const utilRate = Math.round((b.spent / b.sanctioned) * 100);
              return (
                <div key={b.programme} className="border-b pb-2 last:border-0">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-800">{b.programme}</span>
                    <span className={utilRate >= 75 ? "text-emerald-700" : "text-amber-700"}>{utilRate}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1">
                    <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${utilRate}%` }} />
                  </div>
                  <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
                    <span>Sanction: ₹{(b.sanctioned / 100000).toFixed(1)}L</span>
                    <span>Spent: ₹{(b.spent / 100000).toFixed(1)}L</span>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Budget utilization by institution table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Budget Utilization by Institution &amp; Account Head (₹ Lakh)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b">
                {["Institution","Account Head","Allocated (₹L)","Utilized (₹L)","Remaining (₹L)","Utilization %","Status"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {budgetUtilization.map((b, i) => {
                const rem = (b.allocated - b.utilized).toFixed(1);
                const over = b.pct > 90;
                const accountHead = i % 2 === 0 ? "2210-01-110-00-04 (Machinery & Equip)" : "2210-01-001-00-02 (Capital Outlay)";
                return (
                  <tr key={i} className="border-b hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3 font-medium">{b.dept}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{accountHead}</td>
                    <td className="px-4 py-3 text-right">₹{b.allocated}L</td>
                    <td className="px-4 py-3 text-right font-semibold">₹{b.utilized}L</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">₹{rem}L</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width:`${b.pct}%`, background: b.pct > 90 ? C.rose : b.pct > 75 ? C.amber : C.emerald }} />
                        </div>
                        <span className={cn("text-xs font-bold w-9 text-right", over ? "text-rose-600" : "text-foreground")}>{b.pct}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={cn("text-[10px] border-0", b.pct > 90 ? "bg-rose-100 text-rose-700" : b.pct < 60 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700")}>
                        {b.pct > 90 ? "Critical" : b.pct < 60 ? "Under-utilised" : "Healthy"}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 font-semibold">
                <td className="px-4 py-3">Total</td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">Consolidated Heads</td>
                <td className="px-4 py-3 text-right">₹{budgetUtilization.reduce((s,b)=>s+b.allocated,0)}L</td>
                <td className="px-4 py-3 text-right">₹{budgetUtilization.reduce((s,b)=>s+b.utilized,0).toFixed(1)}L</td>
                <td className="px-4 py-3 text-right text-muted-foreground">₹{(budgetUtilization.reduce((s,b)=>s+b.allocated,0) - budgetUtilization.reduce((s,b)=>s+b.utilized,0)).toFixed(1)}L</td>
                <td className="px-4 py-3 text-sm font-bold text-blue-600">78.4%</td>
                <td className="px-4 py-3"><Badge className="bg-blue-100 text-blue-700 border-0 text-[10px]">On Track</Badge></td>
              </tr>
            </tfoot>
          </table>
        </CardContent>
      </Card>


      {/* Monthly spend + category breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Monthly Expenditure Trend (₹ Crore)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={monthlySpend} margin={{ top:4, right:8, left:-8, bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize:11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize:11 }} tickLine={false} axisLine={false} />
                <Tooltip content={<ChartTooltip unit="Cr" />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize:11 }} />
                <Bar dataKey="spend"  fill={C.blue}  radius={[4,4,0,0]} name="Actual Spend" />
                <Bar dataKey="budget" fill={C.slate} radius={[4,4,0,0]} name="Budget"       opacity={0.4} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Spend Mix</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={spendByCategory} dataKey="value" nameKey="category" cx="50%" cy="50%" outerRadius={70} paddingAngle={2} label={false}>
                  {spendByCategory.map((_, i) => <Cell key={i} fill={Object.values(C)[i] as string} />)}
                </Pie>
                <Tooltip contentStyle={CUSTOM_TOOLTIP_STYLE} formatter={(v:any) => [`₹${v}Cr`, ""]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1.5 mt-2">
              {spendByCategory.map((c, i) => (
                <div key={c.category} className="flex items-center gap-2 text-xs">
                  <div className="h-2 w-2 rounded-full shrink-0" style={{ background: Object.values(C)[i] as string }} />
                  <span className="text-muted-foreground flex-1 truncate">{c.category}</span>
                  <span className="font-semibold">{c.pct}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ProcurementTab() {
  return (
    <div className="space-y-5">
      {/* Cycle time trend */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Procurement Cycle Time Trend (Days)</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">6-month trend across all three cycle stages</p>
            </div>
            <div className="flex gap-3 text-xs text-right shrink-0">
              <div><p className="text-lg font-bold text-emerald-600">-18%</p><p className="text-muted-foreground">improvement</p></div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={cycleTrend} margin={{ top:4, right:8, left:-8, bottom:0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize:11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize:11 }} tickLine={false} axisLine={false} />
              <Tooltip content={<ChartTooltip unit="d" />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize:11 }} />
              <Line type="monotone" dataKey="indentApproval" stroke={C.blue}    strokeWidth={2.5} dot={{ r:4 }} name="Indent → Approval" />
              <Line type="monotone" dataKey="approvalPO"     stroke={C.amber}   strokeWidth={2.5} dot={{ r:4 }} name="Approval → PO" />
              <Line type="monotone" dataKey="poDelivery"     stroke={C.emerald} strokeWidth={2.5} dot={{ r:4 }} name="PO → Delivery" />
              <Line type="monotone" dataKey="total"          stroke={C.violet}  strokeWidth={1.5} dot={false} strokeDasharray="5 3" name="Total Cycle" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Indent ageing */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Indent Ageing Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={indentAgeing} layout="vertical" margin={{ top:4, right:16, left:16, bottom:0 }}>
                <XAxis type="number" tick={{ fontSize:10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <YAxis dataKey="range" type="category" tick={{ fontSize:11 }} tickLine={false} axisLine={false} width={72} />
                <Tooltip contentStyle={CUSTOM_TOOLTIP_STYLE} formatter={(v:any) => [v, "Indents"]} />
                <Bar dataKey="count" radius={[0,4,4,0]} name="Indents">
                  {indentAgeing.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-3 p-3 rounded-lg bg-rose-50 border border-rose-100 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
              <p className="text-xs text-rose-700 font-medium">4 indents aged &gt;30 days — requires immediate GM attention</p>
            </div>
          </CardContent>
        </Card>

        {/* QA rejection rate by category */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">QA Rejection Rate by Category (%)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={qaRejection} margin={{ top:4, right:8, left:-16, bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="category" tick={{ fontSize:10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize:10 }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={CUSTOM_TOOLTIP_STYLE} formatter={(v:any) => [`${v}%`, "Rejection Rate"]} />
                <Bar dataKey="rate" radius={[4,4,0,0]} name="QA Rejection %">
                  {qaRejection.map((d, i) => <Cell key={i} fill={d.rate > 4 ? C.rose : d.rate > 2.5 ? C.amber : C.emerald} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-3 flex gap-3 text-xs">
              {[["bg-emerald-400","≤2.5% — Good"],["bg-amber-400","2.5–4% — Watch"],["bg-rose-400",">4% — Critical"]].map(([bg,l]) => (
                <div key={l} className="flex items-center gap-1.5"><div className={`h-2.5 w-2.5 rounded-full ${bg}`} /><span className="text-muted-foreground">{l}</span></div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function VendorTab() {
  const [vendorFilter, setVendorFilter] = useState("all");

  const filteredVendors = vendorFilter === "all"
    ? vendorDetails
    : vendorDetails.filter(v => v.name.toLowerCase().includes(vendorFilter.toLowerCase()));

  const vendorScoreData = filteredVendors.map(v => {
    const onTimeScore = Math.round((v.onTime / v.orders) * 40);
    const qaScore = Math.round((v.qaPass / 100) * 35);
    const compScore = Math.max(15, v.score - onTimeScore - qaScore);
    return {
      name: v.name.split(" ")[0],
      fullName: v.name,
      onTime: onTimeScore,
      qa: qaScore,
      compliance: compScore,
      total: v.score,
    };
  });

  const avgLeadDays = Math.round(filteredVendors.reduce((s, v) => s + v.leadDays, 0) / (filteredVendors.length || 1));
  const classACount = filteredVendors.filter(v => v.score >= 90).length;

  return (
    <div className="space-y-5">
      {/* Header and Filter */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
            Vendor Statutory Performance &amp; Contractual Compliance (Process Book §13 R-3)
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Composite evaluation: On-time Delivery (40%) + QA Acceptance (35%) + Contractual Compliance (25%)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Filter Supplier:</span>
          <select
            value={vendorFilter}
            onChange={e => setVendorFilter(e.target.value)}
            className="text-xs border rounded-md px-2.5 py-1.5 bg-white font-medium"
          >
            <option value="all">All Empanelled Vendors ({vendorDetails.length})</option>
            {vendorDetails.map(v => (
              <option key={v.name} value={v.name}>{v.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Empanelled Vendors" value={filteredVendors.length} sub="Active rate agreements" icon={Users} color={C.blue} />
        <StatCard title="Class A (Star Rating)" value={classACount} sub="Score ≥ 90/100" icon={ShieldCheck} color={C.emerald} />
        <StatCard title="Avg Delivery Lead-Time" value={`${avgLeadDays} Days`} sub="Target: ≤ 30 Days" icon={Clock} color={C.amber} />
        <StatCard title="Overall Compliance" value="94.2%" sub="PS & Warranty adherence" icon={CheckCircle2} color={C.sky} />
      </div>

      {/* Graphical Representation: Score Breakdown & Lead-Time */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Statutory Weighted Score Breakdown (Process Book §13 R-3)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={vendorScoreData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(val: any, name: any) => [`${val} pts`, name]} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="onTime" name="On-Time (Max 40)" stackId="a" fill={C.emerald} />
                  <Bar dataKey="qa" name="QA Pass (Max 35)" stackId="a" fill={C.blue} />
                  <Bar dataKey="compliance" name="Compliance (Max 25)" stackId="a" fill={C.indigo} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
          <div className="pb-3 text-center text-xs text-muted-foreground border-t pt-2">
            Weighted composite formula: 0.40(OnTime) + 0.35(QA) + 0.25(Contractual)
          </div>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Average Lead Days vs 30-Day Statutory Delivery SLA
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={vendorDetails.map(v => ({ name: v.name.split(" ")[0], days: v.leadDays }))} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 60]} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(val: any) => [`${val} Days`, "Lead Time"]} />
                  <ReferenceLine y={30} stroke="#ef4444" strokeDasharray="3 3" label={{ value: "30d SLA", fill: "#ef4444", fontSize: 10, position: "top" }} />
                  <Bar dataKey="days" name="Lead Days" radius={[4, 4, 0, 0]}>
                    {vendorDetails.map((v, i) => (
                      <Cell key={i} fill={v.leadDays <= 35 ? C.emerald : v.leadDays <= 45 ? C.amber : C.rose} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
          <div className="pb-3 text-center text-xs text-muted-foreground border-t pt-2">
            Process Book §9 SLA: Consignee site delivery within 30 calendar days of PO
          </div>
        </Card>
      </div>

      {/* Scorecard table with Contractual Compliance Sub-Scores */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Empanelled Supplier Performance Register (§13 R-3)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b">
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Vendor Name</th>
                  <th className="px-3 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Orders</th>
                  <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">On-Time (40%)</th>
                  <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">QA Pass (35%)</th>
                  <th className="px-3 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Lead Days</th>
                  <th className="px-3 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">PS Deposit</th>
                  <th className="px-3 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">CAMC Setup</th>
                  <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Weighted Score</th>
                  <th className="px-3 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Statutory Grade</th>
                </tr>
              </thead>
              <tbody>
                {filteredVendors.sort((a,b) => b.score - a.score).map((v, i) => {
                  const pct = Math.round((v.onTime / v.orders) * 100);
                  const psSubmitted = v.score >= 80;
                  const camcReady = v.score >= 85;
                  const rating = v.score >= 90 ? { label:"Class A (Excellent)", cls:"bg-emerald-100 text-emerald-700" }
                               : v.score >= 80 ? { label:"Class B (Good)",      cls:"bg-blue-100 text-blue-700" }
                               : v.score >= 70 ? { label:"Class C (Average)",   cls:"bg-amber-100 text-amber-700" }
                               :                 { label:"Class D (Action)",    cls:"bg-rose-100 text-rose-700" };
                  return (
                    <tr key={i} className="border-b hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3 font-semibold text-sm text-foreground">{v.name}</td>
                      <td className="px-3 py-3 text-center font-mono">{v.orders}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold">{v.onTime}/{v.orders}</span>
                          <span className={cn("text-[10px] font-bold", pct >= 90 ? "text-emerald-600" : pct >= 75 ? "text-amber-600" : "text-rose-600")}>({pct}%)</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <div className="w-14 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width:`${v.qaPass}%`, background: v.qaPass >= 90 ? C.emerald : v.qaPass >= 80 ? C.amber : C.rose }} />
                          </div>
                          <span className="text-xs font-semibold">{v.qaPass.toFixed(0)}%</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center font-mono">{v.leadDays}d</td>
                      <td className="px-3 py-3 text-center">
                        <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-semibold", psSubmitted ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200")}>
                          {psSubmitted ? "✓ Verified" : "Pending"}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-semibold", camcReady ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-700 border border-amber-200")}>
                          {camcReady ? "Active" : "Under Prep"}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width:`${v.score}%`, background: v.score >= 90 ? C.emerald : v.score >= 80 ? C.blue : v.score >= 70 ? C.amber : C.rose }} />
                          </div>
                          <span className="text-xs font-bold w-8">{v.score}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <Badge className={cn("text-[10px] border-0", rating.cls)}>{rating.label}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Vendor radar + lead time chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Top Vendor — Performance Radar</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <RadarChart data={complianceScores.map(c => ({ ...c, vendorA:88, vendorB:75, vendorC:91 }))}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize:10, fill:"#64748b" }} />
                <PolarRadiusAxis angle={90} domain={[0,100]} tick={{ fontSize:9 }} tickCount={4} />
                <Radar name="Siemens" dataKey="vendorB" stroke={C.blue}    fill={C.blue}    fillOpacity={0.15} strokeWidth={2} />
                <Radar name="Nidek"   dataKey="vendorC" stroke={C.emerald} fill={C.emerald} fillOpacity={0.15} strokeWidth={2} />
                <Radar name="BPL"     dataKey="vendorA" stroke={C.amber}   fill={C.amber}   fillOpacity={0.10} strokeWidth={2} />
                <Tooltip contentStyle={CUSTOM_TOOLTIP_STYLE} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize:11 }} />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Vendor Lead Time Comparison (Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={vendorDetails.map(v => ({ name:v.name.split(" ")[0], days:v.leadDays, score:v.score }))} margin={{ top:4, right:8, left:-8, bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize:10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize:10 }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={CUSTOM_TOOLTIP_STYLE} />
                <Bar dataKey="days" name="Avg Lead Days" radius={[4,4,0,0]}>
                  {vendorDetails.map((v, i) => <Cell key={i} fill={v.leadDays <= 35 ? C.emerald : v.leadDays <= 45 ? C.amber : C.rose} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SlaTab({ sla }: any) {
  const overallCompliance = Math.round(complianceScores.reduce((s,c) => s + c.score, 0) / complianceScores.length);
  return (
    <div className="space-y-5">
      {/* Compliance score headline with Live Statutory Indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-xs gap-1.5 py-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Live Statutory SLA Tracking (Process Book §13 R-10)
          </Badge>
          <span className="text-xs text-muted-foreground">Target Compliance: ≥95% across all 6 stages</span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Overall SLA Compliance" value={`${overallCompliance}%`} sub="6 control areas" trend={+4}  trendGood="up"   icon={ShieldCheck}    color={C.emerald} />
        <StatCard title="SLA Breaches (FY)" value={sla?.slaBreaches ?? 4}  sub="vs 14 last FY"  trend={-71} trendGood="down" icon={AlertTriangle}   color={C.rose} />
        <StatCard title="On-Time Closure"   value={`${sla?.onTrackCount ?? 23}`} sub="of 27 items"  trend={+10} trendGood="up"  icon={CheckCircle2}   color={C.blue} />
        <StatCard title="Active Escalations" value={3}                       sub="Pending action" trend={-25} trendGood="down" icon={Activity}        color={C.amber} />
      </div>

      {/* Graphical Representation: Stage Turnaround Time vs SLA Benchmark */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Stage-wise Turnaround Time (Days) vs Statutory SLA Benchmark (§13 R-10)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[
                  { stage: "Indent Receipt", target: 2.0, actual: 1.4 },
                  { stage: "Scrutiny & Sanction", target: 3.0, actual: 3.2 },
                  { stage: "RC Link / Tender", target: 5.0, actual: 4.1 },
                  { stage: "PO Issuance", target: 3.0, actual: 2.8 },
                  { stage: "Vendor 7-Day Ack", target: 7.0, actual: 8.1 },
                  { stage: "Delivery & DCC", target: 7.0, actual: 6.4 },
                ]}
                margin={{ top: 10, right: 10, left: -10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="stage" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(val: any, name: any) => [`${val} Days`, name]} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="target" name="SLA Benchmark (Days)" fill="#94a3b8" radius={[4, 4, 0, 0]} opacity={0.6} />
                <Bar dataKey="actual" name="Actual Turnaround (Days)" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
        <div className="pb-3 text-center text-xs text-muted-foreground border-t pt-2">
          Performance standard: Actual TAT must not exceed statutory SLA limit in any stage
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* SLA breach by stage with Avg Processing & Max Pending Item columns */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              SLA Breach &amp; Turnaround by Stage (§13 R-10)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b">
                    <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Procurement Stage</th>
                    <th className="px-2 py-2.5 text-right font-medium text-muted-foreground">Target</th>
                    <th className="px-2 py-2.5 text-right font-medium text-muted-foreground">Avg TAT</th>
                    <th className="px-2 py-2.5 text-center font-medium text-muted-foreground">Breaches</th>
                    <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Max Pending Item</th>
                    <th className="px-2 py-2.5 text-center font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {[
                    { stage: "Indent Receipt & Digitize", target: "2d", avg: "1.4d", breaches: 0, maxPending: "IND-2026-007 (1.8d)", status: "healthy" },
                    { stage: "Scrutiny & Sanction", target: "3d", avg: "3.2d", breaches: 2, maxPending: "IND-2026-004 (4.5d)", status: "risk" },
                    { stage: "RC Linkage / Tender Init", target: "5d", avg: "4.1d", breaches: 1, maxPending: "TID-662453 (6.2d)", status: "healthy" },
                    { stage: "PO Formulation & Issue", target: "3d", avg: "2.8d", breaches: 0, maxPending: "PO-2026-003 (2.9d)", status: "healthy" },
                    { stage: "Vendor Ack Window", target: "7d", avg: "8.1d", breaches: 2, maxPending: "PO-2026-003 (8.0d)", status: "critical" },
                    { stage: "Delivery & DCC Upload", target: "7d", avg: "6.4d", breaches: 1, maxPending: "SSA-0506 (7.2d)", status: "healthy" },
                  ].map((s, i) => (
                    <tr key={i} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-3 py-2.5 font-medium">{s.stage}</td>
                      <td className="px-2 py-2.5 text-right text-muted-foreground">{s.target}</td>
                      <td className="px-2 py-2.5 text-right font-bold tabular-nums">{s.avg}</td>
                      <td className="px-2 py-2.5 text-center">
                        <span className={cn("font-bold px-1.5 py-0.5 rounded text-[10px]", s.breaches > 1 ? "bg-red-100 text-red-700" : s.breaches === 1 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700")}>
                          {s.breaches}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[10px] text-slate-600 truncate max-w-[130px]">{s.maxPending}</td>
                      <td className="px-2 py-2.5 text-center">
                        <Badge className={cn("text-[10px] border-0", s.status === "critical" ? "bg-rose-100 text-rose-700" : s.status === "risk" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700")}>
                          {s.status === "critical" ? "Breached" : s.status === "risk" ? "Watch" : "Compliant"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>


        {/* Breach trend */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">SLA Breach Trend (Last 6 Months)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={monthlyBreachTrend} margin={{ top:4, right:8, left:-16, bottom:0 }}>
                <defs>
                  <linearGradient id="breachGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={C.rose} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={C.rose} stopOpacity={0}   />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize:11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize:11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="breaches" stroke={C.rose} strokeWidth={2.5} fill="url(#breachGrad)" name="SLA Breaches" dot={{ r:4, fill:C.rose }} />
              </AreaChart>
            </ResponsiveContainer>
            <div className="mt-3 p-3 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-emerald-600 shrink-0" />
              <p className="text-xs text-emerald-700 font-medium">Breaches down 50% over 6 months — positive trend maintained</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Compliance radar */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Procurement Compliance Framework Score</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col md:flex-row items-center gap-6">
          <ResponsiveContainer width={280} height={240}>
            <RadarChart data={complianceScores}>
              <PolarGrid stroke="#e2e8f0" />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize:10, fill:"#64748b" }} />
              <PolarRadiusAxis angle={90} domain={[0,100]} tick={{ fontSize:9 }} tickCount={5} />
              <Radar name="Score" dataKey="score" stroke={C.blue} fill={C.blue} fillOpacity={0.18} strokeWidth={2} />
              <Tooltip contentStyle={CUSTOM_TOOLTIP_STYLE} formatter={(v:any) => [`${v}%`, "Score"]} />
            </RadarChart>
          </ResponsiveContainer>
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {complianceScores.map(c => (
              <div key={c.subject} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{c.subject}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width:`${c.score}%`, background: c.score >= 90 ? C.emerald : c.score >= 75 ? C.blue : c.score >= 60 ? C.amber : C.rose }} />
                    </div>
                  </div>
                </div>
                <span className={cn("text-sm font-bold shrink-0", c.score >= 90 ? "text-emerald-600" : c.score >= 75 ? "text-blue-600" : c.score >= 60 ? "text-amber-600" : "text-rose-600")}>
                  {c.score}%
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ─────────── RC Coverage Tab ──────────────────── */
function RCCoverageTab() {
  const today = new Date();

  const rows = mockEquipment.map((eq) => {
    const itemRCs = mockRateContracts.filter((rc) => rc.equipmentId === eq.id);
    const activeRC = itemRCs.find((rc) => rc.status === "active" && new Date(rc.endDate) > today);
    const expiredRC = itemRCs
      .filter((rc) => new Date(rc.endDate) <= today)
      .sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime())[0];
    const activeTender = mockTenders.find((t) => {
      const first = eq.name.toLowerCase().split(" ")[0];
      return t.equipmentName.toLowerCase().includes(first) && t.status !== "rc_created" && t.status !== "awarded";
    });

    let status: "active_rc" | "expiring_soon" | "expired" | "tender_in_progress" | "no_coverage";
    let daysLeft: number | null = null;
    let rcNum: string | null = null;
    let expiry: string | null = null;

    if (activeRC) {
      daysLeft = differenceInDays(new Date(activeRC.endDate), today);
      status = daysLeft <= 180 ? "expiring_soon" : "active_rc";
      rcNum = activeRC.contractNumber;
      expiry = activeRC.endDate;
    } else if (activeTender) {
      status = "tender_in_progress";
    } else if (expiredRC) {
      status = "expired";
      rcNum = expiredRC.contractNumber;
      expiry = expiredRC.endDate;
      daysLeft = differenceInDays(new Date(expiredRC.endDate), today);
    } else {
      status = "no_coverage";
    }
    return { eq, status, rcNum, expiry, daysLeft };
  });

  const counts = {
    active:   rows.filter(r => r.status === "active_rc").length,
    expiring: rows.filter(r => r.status === "expiring_soon").length,
    expired:  rows.filter(r => r.status === "expired").length,
    tender:   rows.filter(r => r.status === "tender_in_progress").length,
    none:     rows.filter(r => r.status === "no_coverage").length,
  };

  const expiryBuckets = [
    { label: "≤ 30 days", count: rows.filter(r => r.daysLeft != null && r.daysLeft >= 0 && r.daysLeft <= 30).length, color: C.rose },
    { label: "31–90 days", count: rows.filter(r => r.daysLeft != null && r.daysLeft > 30 && r.daysLeft <= 90).length, color: C.orange },
    { label: "91–180 days", count: rows.filter(r => r.daysLeft != null && r.daysLeft > 90 && r.daysLeft <= 180).length, color: C.amber },
    { label: "> 180 days", count: rows.filter(r => r.daysLeft != null && r.daysLeft > 180).length, color: C.emerald },
  ];

  const STATUS_STYLE: Record<string, string> = {
    active_rc: "text-emerald-700 bg-emerald-50",
    expiring_soon: "text-amber-700 bg-amber-50",
    expired: "text-red-700 bg-red-50",
    tender_in_progress: "text-blue-700 bg-blue-50",
    no_coverage: "text-slate-500 bg-slate-50",
  };
  const STATUS_LABEL: Record<string, string> = {
    active_rc: "Active RC", expiring_soon: "Expiring Soon", expired: "Expired",
    tender_in_progress: "Tender in Progress", no_coverage: "No Coverage",
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: "Active RC", val: counts.active, color: C.emerald },
          { label: "Expiring ≤180d", val: counts.expiring, color: C.amber },
          { label: "Expired", val: counts.expired, color: C.rose },
          { label: "Tender in Progress", val: counts.tender, color: C.blue },
          { label: "No Coverage", val: counts.none, color: C.slate },
        ].map(k => (
          <Card key={k.label}>
            <CardContent className="p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{k.label}</p>
              <p className="text-3xl font-bold mt-1" style={{ color: k.color }}>{k.val}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">Coverage Status Distribution</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={[
                  { name: "Active RC", value: counts.active, fill: C.emerald },
                  { name: "Expiring Soon", value: counts.expiring, fill: C.amber },
                  { name: "Expired", value: counts.expired, fill: C.rose },
                  { name: "Tender in Progress", value: counts.tender, fill: C.blue },
                  { name: "No Coverage", value: counts.none, fill: C.slate },
                ]} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Expiry Forecast (Active RCs)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={expiryBuckets} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" name="RCs">
                  {expiryBuckets.map((b) => <Cell key={b.label} fill={b.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Item-wise RC Coverage (RPT-01 / RPT-03)</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Item Code</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Item Name</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">RC Status</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">RC Number</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Expiry Date</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Days Remaining</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ eq, status, rcNum, expiry, daysLeft }) => (
                  <tr key={eq.id} className="border-b hover:bg-muted/20">
                    <td className="px-4 py-2.5 font-mono text-xs text-primary">{eq.equipmentCode}</td>
                    <td className="px-4 py-2.5 font-medium text-sm">{eq.name}</td>
                    <td className="px-4 py-2.5">
                      <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", STATUS_STYLE[status])}>
                        {STATUS_LABEL[status]}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs">{rcNum ?? "—"}</td>
                    <td className="px-4 py-2.5 text-sm">
                      {expiry ? format(new Date(expiry), "dd MMM yyyy") : "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      {daysLeft != null ? (
                        <span className={cn("font-semibold tabular-nums text-sm",
                          daysLeft < 0 ? "text-red-600" : daysLeft <= 90 ? "text-amber-600" : "text-emerald-600"
                        )}>
                          {daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d`}
                        </span>
                      ) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ─────────── Tender Tracker Tab ────────────────── */
function TenderTrackerTab() {
  const today = new Date();

  const STATUS_IDX: Record<string, number> = {
    planning: 0, doc_prep: 1, approval: 2, invited: 3, pre_bid: 4, bids_received: 5,
    bid_query: 6, technical_eval: 7, technical_evaluation: 7, commercial_eval: 8,
    l1_identified: 9, awarded: 9, contract_final: 10, rc_created: 11,
  };
  const STAGE_LABELS = [
    "Planning","Doc Prep","Approval","Publication","Pre-Bid","Bid Receipt",
    "Query Handling","Tech Eval","Comm. Eval","L1 Award","Contract Final","RC Created",
  ];

  const tenderRows = mockTenders.map((t) => {
    const stageIdx = STATUS_IDX[t.status] ?? 0;
    const totalDays = t.createdAt ? differenceInDays(today, new Date(t.createdAt)) : null;
    const lastUpdateDays = t.updatedAt ? differenceInDays(today, new Date(t.updatedAt)) : null;
    const isDelayed = totalDays != null && totalDays > 180;
    return { t, stageIdx, totalDays, lastUpdateDays, isDelayed };
  });

  const tendersByStage = STAGE_LABELS.map((label, i) => ({
    stage: label,
    count: tenderRows.filter(r => r.stageIdx === i).length,
  }));

  const delayed = tenderRows.filter(r => r.isDelayed).length;
  const inProgress = tenderRows.filter(r => r.stageIdx < 11).length;
  const completed = tenderRows.filter(r => r.stageIdx >= 11).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Total Tenders</p>
          <p className="text-3xl font-bold mt-1 text-blue-600">{tenderRows.length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">In Progress</p>
          <p className="text-3xl font-bold mt-1 text-amber-600">{inProgress}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Delayed (&gt;180d)</p>
          <p className="text-3xl font-bold mt-1 text-red-600">{delayed}</p>
        </CardContent></Card>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">Tenders by Stage (12-Stage BRD)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={tendersByStage} layout="vertical" margin={{ left: 80, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                <YAxis dataKey="stage" type="category" tick={{ fontSize: 9 }} width={80} />
                <Tooltip />
                <Bar dataKey="count" name="Tenders" fill={C.blue} radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Tender Ageing (RPT-05)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={[
                { bucket: "0–30d",   count: tenderRows.filter(r => r.totalDays != null && r.totalDays <= 30).length },
                { bucket: "31–90d",  count: tenderRows.filter(r => r.totalDays != null && r.totalDays > 30 && r.totalDays <= 90).length },
                { bucket: "91–180d", count: tenderRows.filter(r => r.totalDays != null && r.totalDays > 90 && r.totalDays <= 180).length },
                { bucket: ">180d",   count: tenderRows.filter(r => r.totalDays != null && r.totalDays > 180).length },
              ]} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="bucket" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" name="Tenders" fill={C.indigo} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Tender Progress Register (RPT-04 / RPT-05)</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tender No.</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Equipment</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Current Stage</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Stage Progress</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Total Ageing</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Last Activity</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {tenderRows.map(({ t, stageIdx, totalDays, lastUpdateDays, isDelayed }) => (
                  <tr key={t.id} className={cn("border-b hover:bg-muted/20", isDelayed && "bg-red-50/40")}>
                    <td className="px-4 py-2.5 font-mono text-xs text-primary">{t.tenderNumber}</td>
                    <td className="px-4 py-2.5 font-medium">{t.equipmentName}</td>
                    <td className="px-4 py-2.5">
                      <span className="text-xs font-medium">{STAGE_LABELS[stageIdx]}</span>
                      <span className="text-[10px] text-muted-foreground ml-1">({stageIdx + 1}/12)</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex gap-0.5">
                        {STAGE_LABELS.map((_, i) => (
                          <div key={i} className={cn("h-1.5 w-2.5 rounded-sm", i <= stageIdx ? "bg-primary" : "bg-muted")} />
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      {totalDays != null ? (
                        <span className={cn("font-semibold tabular-nums text-xs", isDelayed ? "text-red-600" : totalDays > 90 ? "text-amber-600" : "text-foreground")}>
                          {totalDays}d {isDelayed ? "⚠ Delayed" : ""}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">
                      {lastUpdateDays != null ? `${lastUpdateDays}d ago` : "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium",
                        stageIdx >= 11 ? "bg-emerald-50 text-emerald-700" :
                        isDelayed ? "bg-red-50 text-red-700" : "bg-blue-50 text-blue-700"
                      )}>
                        {stageIdx >= 11 ? "Completed" : isDelayed ? "Delayed" : "Active"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ─────────── Main page ─────────────────────────── */
/* ─────────── Distribution Analytics Tab ────────── */
function DistributionTab() {
  const [itemFilter, setItemFilter] = useState("all");
  const items = [...new Set(mockDistributionData.map(d => d.itemName))];
  const filtered = itemFilter === "all" ? mockDistributionData : mockDistributionData.filter(d => d.itemName === itemFilter);

  const totalProcured = filtered.reduce((s, d) => s + d.procured, 0);
  const totalDistributed = filtered.reduce((s, d) => s + d.distributed, 0);
  const totalExpired = filtered.reduce((s, d) => s + d.expired, 0);
  const totalWasted = filtered.reduce((s, d) => s + d.wasted, 0);
  const wasteRate = totalProcured > 0 ? ((totalExpired + totalWasted) / totalProcured * 100).toFixed(1) : "0";
  const utilRate = totalProcured > 0 ? (totalDistributed / totalProcured * 100).toFixed(1) : "0";

  const chartData = [...new Map(filtered.map(d => [d.facilityName, d])).values()].map(d => ({
    name: d.facilityName.split(",")[0].replace("Govt. General Hospital", "GGH"),
    Distributed: d.distributed,
    "Near-Expiry": d.nearExpiry,
    Expired: d.expired,
  }));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Total Procured" value={totalProcured.toLocaleString()} sub={filtered[0]?.unit ?? ""} trend={0} icon={FileText} color={C.blue} />
        <StatCard title="Total Distributed" value={totalDistributed.toLocaleString()} sub="To facilities" trend={+3} trendGood="up" icon={Truck} color={C.emerald} />
        <StatCard title="Distribution Rate" value={`${utilRate}%`} sub="vs procured" trend={+2} trendGood="up" icon={CheckCircle2} color={C.sky} />
        <StatCard title="Expiry / Wastage Rate" value={`${wasteRate}%`} sub="of total procured" trend={-1} trendGood="down" icon={AlertTriangle} color={C.rose} />
      </div>

      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">Filter by item:</span>
        <div className="flex gap-1.5">
          <button onClick={() => setItemFilter("all")} className={cn("px-3 py-1 rounded-full text-xs font-medium border", itemFilter === "all" ? "bg-primary text-white border-primary" : "border-border text-muted-foreground hover:border-foreground/30")}>All Items</button>
          {items.map(item => (
            <button key={item} onClick={() => setItemFilter(item)} className={cn("px-3 py-1 rounded-full text-xs font-medium border", itemFilter === item ? "bg-primary text-white border-primary" : "border-border text-muted-foreground hover:border-foreground/30")}>
              {item.split("(")[0].trim()}
            </button>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Facility-wise Distribution — {itemFilter === "all" ? "All Items" : itemFilter}</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip content={<ChartTooltip />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Distributed" fill={C.emerald} radius={[3, 3, 0, 0]} />
              <Bar dataKey="Near-Expiry" fill={C.amber} radius={[3, 3, 0, 0]} />
              <Bar dataKey="Expired" fill={C.rose} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Facility Distribution Register</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/30 text-xs text-muted-foreground">
                {["Facility", "District", "Item", "Procured", "Received", "Distributed", "Stock On Hand", "Near-Expiry", "Expired", "Wasted", "Waste %"].map(h => (
                  <th key={h} className="text-left px-4 py-2 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((d, i) => {
                const wasteP = d.procured > 0 ? ((d.expired + d.wasted) / d.procured * 100).toFixed(1) : "0";
                const wasteNum = parseFloat(wasteP);
                return (
                  <tr key={i} className="border-t hover:bg-muted/20">
                    <td className="px-4 py-2.5 font-medium text-xs">{d.facilityName}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{d.district}</td>
                    <td className="px-4 py-2.5 text-xs">{d.itemName.split("(")[0].trim()}</td>
                    {[d.procured, d.received, d.distributed, d.stockOnHand, d.nearExpiry, d.expired, d.wasted].map((v, vi) => (
                      <td key={vi} className="px-4 py-2.5 text-right text-xs font-medium">{v}</td>
                    ))}
                    <td className={cn("px-4 py-2.5 text-right text-xs font-bold", wasteNum > 5 ? "text-red-600" : wasteNum > 2 ? "text-amber-600" : "text-emerald-700")}>
                      {wasteP}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function IndentAgingTab() {
  const { data: agingData = [] } = useQuery({
    queryKey: ["/reports/indent-aging"],
    queryFn: getIndentAgingReport,
  });

  const greenCount = agingData.filter((i: any) => i.ageDays <= 2).length;
  const amberCount = agingData.filter((i: any) => i.ageDays > 2 && i.ageDays <= 7).length;
  const redCount = agingData.filter((i: any) => i.ageDays > 7).length;
  const avgDays = agingData.length > 0 ? (agingData.reduce((s: number, i: any) => s + i.ageDays, 0) / agingData.length).toFixed(1) : "0";

  const chartData = [
    { bucket: "<= 2 Days (SLA Target)", count: greenCount, fill: "#10b981" },
    { bucket: "3 - 7 Days (Amber Warning)", count: amberCount, fill: "#f59e0b" },
    { bucket: "> 7 Days (Critical Pendency)", count: redCount, fill: "#ef4444" },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Pending Requisitions" value={agingData.length} sub="Under active review" icon={Clock} color={C.blue} />
        <StatCard title="Within SLA (<=2 Days)" value={greenCount} sub="Compliant processing" icon={CheckCircle2} color={C.emerald} />
        <StatCard title="Amber Alert (3-7 Days)" value={amberCount} sub="Requires expediting" icon={AlertTriangle} color={C.amber} />
        <StatCard title="SLA Breach (>7 Days)" value={redCount} sub="Immediate GM escalation" icon={XCircle} color={C.rose} />
      </div>

      {/* R-2 Graphical Representations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Statutory Aging Buckets (Process Book §13 R-2)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="bucket" tick={{ fontSize: 10 }} interval={0} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
          <div className="pb-3 text-center text-xs text-muted-foreground border-t pt-2">
            Average Processing Wait: <strong className="text-foreground">{avgDays} Days</strong> · SLA Benchmark: ≤2 Days
          </div>
        </Card>

        {/* Facility-wise Aging Distribution Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Facility-wise Pending Requisitions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    { name: "OGH", withinSla: 4, warning: 1, critical: 0 },
                    { name: "Gandhi", withinSla: 3, warning: 2, critical: 1 },
                    { name: "Sangareddy", withinSla: 2, warning: 1, critical: 1 },
                    { name: "Vemulawada", withinSla: 3, warning: 0, critical: 0 },
                    { name: "Warangal", withinSla: 2, warning: 1, critical: 0 },
                  ]}
                  margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="withinSla" name="Within SLA (≤2d)" fill="#10b981" stackId="a" />
                  <Bar dataKey="warning" name="Warning (3-7d)" fill="#f59e0b" stackId="a" />
                  <Bar dataKey="critical" name="Breached (>7d)" fill="#ef4444" stackId="a" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
          <div className="pb-3 text-center text-xs text-muted-foreground border-t pt-2">
            Highest pendency at <strong>Gandhi Hospital</strong> &amp; <strong>GGH Sangareddy</strong>
          </div>
        </Card>
      </div>

      {/* R-2 Active Indent Pendency Register */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Active Indent Pendency Register (Process Book §13 R-2)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-[360px]">
            <table className="w-full text-xs">
              <thead className="bg-muted/30 sticky top-0">
                <tr className="border-b">
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Indent Number</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Indenting Facility</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground">Age (Days)</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">SLA Compliance</th>
                  <th className="px-3 py-2 text-center font-medium text-muted-foreground">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {agingData.map((ind: any) => {
                  const isRed = ind.ageDays > 7;
                  const isAmber = ind.ageDays > 2 && ind.ageDays <= 7;
                  return (
                    <tr key={ind.id} className="hover:bg-muted/20">
                      <td className="px-3 py-2.5 font-mono font-medium">{ind.indentNumber}</td>
                      <td className="px-3 py-2.5">{ind.facilityName}</td>
                      <td className="px-3 py-2.5 capitalize">{ind.status.replace("_", " ")}</td>
                      <td className="px-3 py-2.5 text-right font-bold tabular-nums">{ind.ageDays}d</td>
                      <td className="px-3 py-2.5">
                        <Badge className={cn("text-[10px] border-0", isRed ? "bg-rose-100 text-rose-700" : isAmber ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700")}>
                          {isRed ? "Critical Escalation" : isAmber ? "Warning" : "Within 2d SLA"}
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <Link href={`/indents/${ind.id}`}>
                          <span className="text-[11px] text-primary hover:underline cursor-pointer">Review →</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
                {agingData.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-6 text-muted-foreground">No pending indents found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function RCExpiryTab() {
  const { data: rcData = [] } = useQuery({
    queryKey: ["/reports/rc-expiry"],
    queryFn: getRCExpiryReport,
  });

  const critical = rcData.filter((r: any) => r.daysToExpiry <= 30);
  const warning = rcData.filter((r: any) => r.daysToExpiry > 30 && r.daysToExpiry <= 60);
  const attention = rcData.filter((r: any) => r.daysToExpiry > 60 && r.daysToExpiry <= 90);
  const safe = rcData.filter((r: any) => r.daysToExpiry > 90);

  const horizonData = [
    { horizon: "<30 Days (Critical)", contracts: critical.length, valueLakhs: 145, fill: "#ef4444" },
    { horizon: "30-60 Days (Warning)", contracts: warning.length, valueLakhs: 88, fill: "#f59e0b" },
    { horizon: "60-90 Days (Attention)", contracts: attention.length, valueLakhs: 210, fill: "#3b82f6" },
    { horizon: ">90 Days (Healthy)", contracts: safe.length, valueLakhs: 580, fill: "#10b981" },
  ];

  const categoryCoverageData = [
    { name: "Radiology & Imaging", value: 38, count: 5, fill: "#3b82f6" },
    { name: "ICU & Critical Care", value: 27, count: 4, fill: "#10b981" },
    { name: "Surgical Theatre", value: 20, count: 3, fill: "#8b5cf6" },
    { name: "Pathology & Lab", value: 15, count: 2, fill: "#f59e0b" },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Critical (<30 Days)" value={critical.length} sub="Immediate Re-tendering Required" icon={ShieldAlert} color={C.rose} />
        <StatCard title="Warning (30-60 Days)" value={warning.length} sub="Prepare Tender Scope" icon={AlertTriangle} color={C.amber} />
        <StatCard title="Attention (60-90 Days)" value={attention.length} sub="Track Consumption" icon={Clock} color={C.blue} />
        <StatCard title="Healthy (>90 Days)" value={safe.length} sub="Stable Rate Coverage" icon={CheckCircle2} color={C.emerald} />
      </div>

      {/* Graphical representations for R-5 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Expiry Horizon BarChart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Rate Contract Expiry Horizon (Process Book §13 R-5)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={horizonData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="horizon" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="contracts" name="Contracts" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                    {horizonData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
          <div className="pb-3 text-center text-xs text-muted-foreground border-t pt-2">
            Total active agreement volume governed: <strong>₹1,023 Lakhs</strong>
          </div>
        </Card>

        {/* RC Coverage by Equipment Category Donut Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Active Rate Contract Coverage by Equipment Category
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row items-center gap-4">
            <div className="h-52 w-52 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryCoverageData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                  >
                    {categoryCoverageData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val: any) => [`${val}%`, "Share"]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-2 text-xs">
              {categoryCoverageData.map((cat) => (
                <div key={cat.name} className="flex items-center justify-between border-b pb-1.5 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.fill }} />
                    <span className="text-slate-700 font-medium">{cat.name}</span>
                  </div>
                  <span className="font-bold text-slate-800">{cat.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
          <div className="pb-3 text-center text-xs text-muted-foreground border-t pt-2">
            Coverage benchmark: ≥80% targeted for critical hospital categories
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Rate Contract Expiry &amp; Statutory Renewal Status (Process Book §13 R-5)
            </CardTitle>
            <Badge variant="outline" className="text-xs">
              Rule BR-02: Retender before expiration
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/30">
                <tr className="border-b">
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Contract Number</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Equipment Item</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Empanelled Vendor</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Expiry Date</th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground">Days Remaining</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Statutory Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rcData.map((rc: any) => {
                  const isCrit = rc.daysToExpiry <= 30;
                  const isWarn = rc.daysToExpiry > 30 && rc.daysToExpiry <= 60;
                  return (
                    <tr key={rc.id} className="hover:bg-muted/20">
                      <td className="px-3 py-2.5 font-mono font-medium">{rc.contractNumber}</td>
                      <td className="px-3 py-2.5 font-medium text-foreground">{rc.equipmentName}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">{rc.vendorName}</td>
                      <td className="px-3 py-2.5">{new Date(rc.endDate).toLocaleDateString("en-IN")}</td>
                      <td className="px-3 py-2.5 text-right font-bold tabular-nums">
                        <span className={cn(isCrit ? "text-rose-600 font-extrabold" : isWarn ? "text-amber-600" : "text-emerald-700")}>
                          {rc.daysToExpiry} days
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        {isCrit ? (
                          <span className="inline-flex items-center gap-1 text-[10px] bg-red-100 text-red-800 px-2 py-0.5 rounded font-bold">
                            <ShieldAlert className="h-3 w-3" /> Initiate Open Tender
                          </span>
                        ) : isWarn ? (
                          <span className="inline-flex items-center gap-1 text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-medium">
                            Draft NIT Scope
                          </span>
                        ) : (
                          <span className="text-[10px] text-emerald-700 font-medium">Valid Agreement</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function POStatusTab() {
  const { data: poData = [] } = useQuery({
    queryKey: ["/reports/po-status"],
    queryFn: getPOStatusReport,
  });

  const totalValue = poData.reduce((s: number, p: any) => s + (p.totalAmount || 0), 0);
  const paidCount = poData.filter((p: any) => p.paymentStatus === "paid").length;
  const partialCount = poData.filter((p: any) => p.paymentStatus === "partial").length;
  const unpaidCount = poData.filter((p: any) => !p.paymentStatus || p.paymentStatus === "unpaid" || p.paymentStatus === "not_paid").length;

  const poStatusChartData = [
    { status: "PO Issued", count: 3, valueLakhs: 88, fill: "#3b82f6" },
    { status: "Dispatched", count: 2, valueLakhs: 46, fill: "#f59e0b" },
    { status: "Delivered", count: 3, valueLakhs: 92, fill: "#10b981" },
    { status: "Settled", count: 2, valueLakhs: 64, fill: "#8b5cf6" },
  ];

  const paymentBreakdownData = [
    { name: "Full Payment (UTR Logged)", value: 55, amountLakhs: 145, fill: "#10b981" },
    { name: "Milestone Partial Paid", value: 25, amountLakhs: 66, fill: "#f59e0b" },
    { name: "Pending Invoice Verification", value: 12, amountLakhs: 32, fill: "#3b82f6" },
    { name: "Awaiting Consignee DCC", value: 8, amountLakhs: 21, fill: "#ef4444" },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Total POs Issued" value={poData.length} sub={`Value: ₹${(totalValue / 100000).toFixed(2)} L`} icon={FileText} color={C.blue} />
        <StatCard title="Recorded Paid (UTR)" value={paidCount} sub="Manual settlement logged" icon={CheckCircle2} color={C.emerald} />
        <StatCard title="Partially Paid" value={partialCount} sub="Interim milestones logged" icon={Clock} color={C.amber} />
        <StatCard title="Unpaid / Pending" value={unpaidCount} sub="Scope boundary status" icon={AlertTriangle} color={C.rose} />
      </div>

      {/* Graphical representations for R-6 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* PO Status Breakdown Multi-BarChart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Purchase Order Lifecycle Stages &amp; Volume (₹ Lakhs)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={poStatusChartData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="status" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="valueLakhs" name="PO Value (₹ Lakhs)" radius={[4, 4, 0, 0]}>
                    {poStatusChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
          <div className="pb-3 text-center text-xs text-muted-foreground border-t pt-2">
            Commitment status: <strong>₹{(totalValue / 100000).toFixed(2)} Lakhs</strong> across 3 Active Orders
          </div>
        </Card>

        {/* Payment Settlement Status Donut Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Payment Settlement &amp; Invoice Status Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row items-center gap-4">
            <div className="h-52 w-52 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentBreakdownData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                  >
                    {paymentBreakdownData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val: any) => [`${val}%`, "Share"]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-2 text-xs">
              {paymentBreakdownData.map((item) => (
                <div key={item.name} className="flex items-center justify-between border-b pb-1.5 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: item.fill }} />
                    <span className="text-slate-700 font-medium truncate max-w-[140px]">{item.name}</span>
                  </div>
                  <span className="font-bold text-slate-800">{item.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
          <div className="pb-3 text-center text-xs text-muted-foreground border-t pt-2">
            Process Book §0 Standard: Treasury UTR tracking verified
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Purchase Order Milestones &amp; Payment Status (Process Book §13 R-6)
            </CardTitle>
            <Badge variant="outline" className="text-xs bg-slate-100">
              Process Book §0: Manual Paid / Not-Paid Tracking
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/30">
                <tr className="border-b">
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">PO Number</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Vendor Name</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Equipment</th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground">Qty</th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground">Amount (₹)</th>
                  <th className="px-3 py-2 text-center font-medium text-muted-foreground">7-Day Ack</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">PO Status</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Payment Status</th>
                  <th className="px-3 py-2 text-center font-medium text-muted-foreground">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {poData.map((po: any) => {
                  const isPaid = po.paymentStatus === "paid";
                  const isPart = po.paymentStatus === "partial";
                  return (
                    <tr key={po.id} className="hover:bg-muted/20">
                      <td className="px-3 py-2.5 font-mono font-medium">{po.poNumber}</td>
                      <td className="px-3 py-2.5">{po.vendorName}</td>
                      <td className="px-3 py-2.5 font-medium">{po.equipmentName}</td>
                      <td className="px-3 py-2.5 text-right font-semibold">{po.quantity}</td>
                      <td className="px-3 py-2.5 text-right font-semibold tabular-nums">₹{po.totalAmount?.toLocaleString("en-IN")}</td>
                      <td className="px-3 py-2.5 text-center">
                        {po.vendorAcknowledged ? (
                          <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">✓ Ack</span>
                        ) : (
                          <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">Pending</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 capitalize">{po.status?.replace("_", " ")}</td>
                      <td className="px-3 py-2.5">
                        <Badge className={cn("text-[10px] border-0", isPaid ? "bg-emerald-100 text-emerald-700" : isPart ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-700")}>
                          {isPaid ? "Paid (UTR)" : isPart ? "Partial Paid" : "Unpaid / Pending"}
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <Link href={`/purchase-orders/${po.id}`}>
                          <span className="text-[11px] text-primary hover:underline cursor-pointer">Open PO →</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


function DeliveryQATab() {
  const { data: complianceData = [] } = useQuery({
    queryKey: ["/reports/delivery-compliance"],
    queryFn: getDeliveryComplianceReport,
  });
  const { data: qaSummary = { totalConsignments: 0, acceptedCount: 0, conditionalCount: 0, rejectedCount: 0, firstPassRate: 0, recentInspections: [] } } = useQuery({
    queryKey: ["/reports/qa-summary"],
    queryFn: getQASummaryReport,
  });

  const onTimeCount = complianceData.filter((d: any) => d.isOnTime).length;
  const onTimeRate = complianceData.length > 0 ? Math.round((onTimeCount / complianceData.length) * 100) : 0;

  const leadTimeData = [
    { id: "SSA-0501", facility: "Gandhi Hosp", days: 22, fill: "#10b981" },
    { id: "SSA-0502", facility: "Osmania Gen", days: 28, fill: "#10b981" },
    { id: "SSA-0503", facility: "RIMS Adilabad", days: 34, fill: "#ef4444" },
    { id: "SSA-0504", facility: "MGM Warangal", days: 19, fill: "#10b981" },
    { id: "SSA-0505", facility: "NIMS Hyd", days: 26, fill: "#10b981" },
    { id: "SSA-0506", facility: "GGH Nizamabad", days: 36, fill: "#ef4444" },
  ];

  const qaOutcomeData = [
    { name: "Accepted (DCC Issued)", value: qaSummary.acceptedCount || 18, fill: "#10b981" },
    { name: "Conditional (15d SLA)", value: qaSummary.conditionalCount || 3, fill: "#f59e0b" },
    { name: "Rejected / Defective", value: qaSummary.rejectedCount || 1, fill: "#ef4444" },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Total Shipments" value={complianceData.length} sub="Hospital Consignments" icon={Truck} color={C.blue} />
        <StatCard title="On-Time Delivery" value={`${onTimeRate}%`} sub={`${onTimeCount} on time`} icon={Clock} color={C.emerald} />
        <StatCard title="QA First-Pass Rate" value={`${qaSummary.firstPassRate}%`} sub={`${qaSummary.acceptedCount} passed on first inspect`} icon={ShieldCheck} color={C.sky} />
        <StatCard title="Conditional Rectifications" value={qaSummary.conditionalCount} sub="15-Day Vendor SLA Notice" icon={AlertTriangle} color={C.amber} />
      </div>

      {/* Graphical Representations for R-8 and R-9 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Consignment Lead-Time vs 30-Day SLA */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Consignment Lead-Time vs 30-Day Statutory SLA (Process Book §13 R-8)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={leadTimeData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="facility" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 45]} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(val: any) => [`${val} Days`, "Lead Time"]} />
                  <ReferenceLine y={30} stroke="#ef4444" strokeDasharray="3 3" label={{ value: "30-Day SLA Limit", fill: "#ef4444", fontSize: 10, position: "top" }} />
                  <Bar dataKey="days" name="Lead Time (Days)" radius={[4, 4, 0, 0]}>
                    {leadTimeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
          <div className="pb-3 text-center text-xs text-muted-foreground border-t pt-2">
            Liquidated Damages (LD) applied automatically for deliveries exceeding 30 calendar days
          </div>
        </Card>

        {/* Consignee QA Inspection Decisions */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Consignee QA &amp; Acceptance Outcomes (Process Book §13 R-9)
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row items-center gap-4">
            <div className="h-52 w-52 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={qaOutcomeData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                  >
                    {qaOutcomeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val: any) => [`${val} Consignments`, "Count"]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-2 text-xs">
              {qaOutcomeData.map((item) => (
                <div key={item.name} className="flex items-center justify-between border-b pb-1.5 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: item.fill }} />
                    <span className="text-slate-700 font-medium truncate max-w-[150px]">{item.name}</span>
                  </div>
                  <span className="font-bold text-slate-800">{item.value}</span>
                </div>
              ))}
              <div className="pt-2 text-muted-foreground text-[11px]">
                First-Pass Rate: <strong className="text-emerald-700">{qaSummary.firstPassRate}%</strong> (Target: ≥90%)
              </div>
            </div>
          </CardContent>
          <div className="pb-3 text-center text-xs text-muted-foreground border-t pt-2">
            Process Book §10: 15-day rectification window triggered on conditional acceptance
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Compliance Table with Discrepancy & Resolution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Delivery Compliance &amp; Lead-Time (Process Book §13 R-8)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto max-h-[380px]">
              <table className="w-full text-xs">
                <thead className="bg-muted/30 sticky top-0">
                  <tr className="border-b">
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Consignment</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Facility</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Vendor</th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground">Delay (d)</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Discrepancy / QA Issue</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {complianceData.map((d: any, idx: number) => {
                    const discrepancy = d.delayDays > 0
                      ? `Delayed by ${d.delayDays}d · LD applicable`
                      : idx === 1
                      ? "Minor accessory carton seal damaged"
                      : "None · Full package intact";
                    return (
                      <tr key={d.id} className="hover:bg-muted/20">
                        <td className="px-3 py-2 font-mono font-medium text-primary">{d.deliveryTrackingId}</td>
                        <td className="px-3 py-2">{d.facilityName}</td>
                        <td className="px-3 py-2 text-muted-foreground">{d.vendorName}</td>
                        <td className="px-3 py-2 text-right font-bold">
                          {d.delayDays > 0 ? (
                            <span className="text-rose-600">+{d.delayDays}d LD</span>
                          ) : (
                            <span className="text-emerald-700">On Time</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-[11px] text-slate-600 max-w-[140px] truncate" title={discrepancy}>
                          {discrepancy}
                        </td>
                        <td className="px-3 py-2 capitalize">
                          <Badge className="text-[10px] border-0 bg-slate-100 text-slate-700">
                            {d.status}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* QA Inspection Log with Issues Found & Resolution Time */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Consignee QA &amp; Acceptance Summary (Process Book §13 R-9)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto max-h-[380px]">
              <table className="w-full text-xs">
                <thead className="bg-muted/30 sticky top-0">
                  <tr className="border-b">
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Equipment</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Facility</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">QA Decision</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Defect / Issues Found</th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground">TAT</th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(qaSummary.recentInspections || []).map((q: any, qIdx: number) => {
                    const defectNote = q.qaDecision === "conditional"
                      ? "Earthing cable specification mismatch; 15d notice"
                      : q.qaDecision === "rejected"
                      ? "Broken display panel on unpack"
                      : "Nil · All test protocols verified";
                    const rectifDays = q.qaDecision === "accepted" ? "0d" : q.qaDecision === "conditional" ? "6d" : "14d";
                    return (
                      <tr key={q.id || qIdx} className="hover:bg-muted/20">
                        <td className="px-3 py-2 font-medium">{q.equipmentName}</td>
                        <td className="px-3 py-2 text-muted-foreground">{q.facilityName}</td>
                        <td className="px-3 py-2">
                          <Badge className={cn("text-[10px] border-0", q.qaDecision === "accepted" ? "bg-emerald-100 text-emerald-700" : q.qaDecision === "conditional" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700")}>
                            {q.qaDecision?.toUpperCase()}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-[11px] text-slate-600 max-w-[130px] truncate" title={defectNote}>
                          {defectNote}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-[11px]">{rectifDays}</td>
                        <td className="px-3 py-2 text-right font-bold">{q.qaComplianceScore ? `${q.qaComplianceScore}%` : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function EquipmentInventoryTab() {
  const [filterCat, setFilterCat] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const { data: invData = [] } = useQuery({
    queryKey: ["/reports/equipment-inventory"],
    queryFn: getEquipmentInventoryReport,
  });

  const totalInstalled = invData.length;
  const underWarranty = invData.filter((i: any) => i.warrantyActive).length;

  const filteredInv = invData.filter((i: any) => {
    if (filterStatus === "warranty" && !i.warrantyActive) return false;
    if (filterStatus === "expired" && i.warrantyActive) return false;
    return true;
  });

  const facilityDeploymentData = [
    { facility: "Gandhi Hosp", units: 28, valueLakhs: 340 },
    { facility: "Osmania Gen", units: 24, valueLakhs: 295 },
    { facility: "NIMS Hyd", units: 22, valueLakhs: 410 },
    { facility: "MGM Warangal", units: 18, valueLakhs: 180 },
    { facility: "RIMS Adilabad", units: 14, valueLakhs: 135 },
    { facility: "GGH Nizamabad", units: 12, valueLakhs: 98 },
  ];

  const warrantyCamcData = [
    { name: "Active OEM Warranty", value: underWarranty || 85, fill: "#10b981" },
    { name: "Under Active CAMC", value: 24, fill: "#3b82f6" },
    { name: "Warranty Expiring (<60d)", value: 6, fill: "#f59e0b" },
    { name: "CAMC Renewal Due", value: 3, fill: "#ef4444" },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Commissioned Units" value={totalInstalled} sub="Across Telangana Facilities" icon={Activity} color={C.blue} />
        <StatCard title="Active Warranty" value={underWarranty} sub="Covered under OEM Guarantee" icon={ShieldCheck} color={C.emerald} />
        <StatCard title="Warranty Expiring" value={totalInstalled - underWarranty} sub="Transition to CAMC" icon={Clock} color={C.amber} />
        <StatCard title="Operational Status" value="100%" sub="Zero downtime reported" icon={CheckCircle2} color={C.sky} />
      </div>

      {/* Graphical Representations for R-4 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Equipment Deployed by Major Facility */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Equipment Deployed by Major Health Facility (Process Book §13 R-4)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={facilityDeploymentData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="facility" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(val: any, name: any) => [name === "units" ? `${val} Units` : `₹${val} Lakhs`, name === "units" ? "Deployed Units" : "Asset Value"]} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="units" name="Deployed Units" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="valueLakhs" name="Asset Value (₹L)" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
          <div className="pb-3 text-center text-xs text-muted-foreground border-t pt-2">
            Asset register spans 33 Telangana health districts and primary/secondary centres
          </div>
        </Card>

        {/* Warranty & CAMC Status Breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Warranty &amp; Post-Warranty CAMC Coverage Status
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row items-center gap-4">
            <div className="h-52 w-52 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={warrantyCamcData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                  >
                    {warrantyCamcData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val: any) => [`${val} Units`, "Share"]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-2 text-xs">
              {warrantyCamcData.map((cat: any) => (
                <div key={cat.name} className="flex items-center justify-between border-b pb-1.5 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.fill }} />
                    <span className="text-slate-700 font-medium truncate max-w-[140px]">{cat.name}</span>
                  </div>
                  <span className="font-bold text-slate-800">{cat.value}</span>
                </div>
              ))}
              <div className="pt-2 text-muted-foreground text-[11px]">
                Statutory standard: 100% equipment covered under OEM Warranty or CAMC
              </div>
            </div>
          </CardContent>
          <div className="pb-3 text-center text-xs text-muted-foreground border-t pt-2">
            Process Book §12: Automatic transition to 5-year Comprehensive AMC
          </div>
        </Card>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center justify-between gap-4 flex-wrap bg-slate-50 p-3 rounded-lg border">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-700">Filter Inventory:</span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-xs border rounded-md px-2.5 py-1.5 bg-white"
          >
            <option value="all">All Warranty Statuses</option>
            <option value="warranty">Active OEM Warranty Only</option>
            <option value="expired">Warranty Expired (CAMC Due)</option>
          </select>
        </div>
        <Badge variant="outline" className="text-xs">
          Showing {filteredInv.length} of {totalInstalled} Deployed Units
        </Badge>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Equipment Master Catalog &amp; Hospital Deployed Inventory (Process Book §13 R-4)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/30">
                <tr className="border-b">
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Asset Tag / Serial No.</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Equipment Description</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Hospital Facility</th>
                  <th className="px-3 py-2 text-center font-medium text-muted-foreground">Qty</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Commissioned</th>
                  <th className="px-3 py-2 text-center font-medium text-muted-foreground">Age</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Warranty Status</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Warranty Expiry</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">CAMC Post-Warranty</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredInv.map((inv: any, i: number) => {
                  const delDate = new Date(inv.deliveredDate);
                  const ageMonths = Math.max(1, Math.round(differenceInDays(new Date(), delDate) / 30.4));
                  const ageDisplay = ageMonths >= 12 ? `${(ageMonths / 12).toFixed(1)} yrs` : `${ageMonths} mos`;
                  const warrantyExpiryDate = new Date(delDate.getTime() + (inv.warrantyActive ? 3 : 1) * 365 * 86400000);
                  const serialNo = `SN-${inv.deliveryTrackingId.replace(/[^a-zA-Z0-9]/g, "").slice(-6)}-${i+1}`;

                  return (
                    <tr key={inv.id || i} className="hover:bg-muted/20">
                      <td className="px-3 py-2.5 font-mono font-medium text-primary">
                        <div>{inv.deliveryTrackingId}</div>
                        <div className="text-[10px] text-muted-foreground">{serialNo}</div>
                      </td>
                      <td className="px-3 py-2.5 font-semibold text-foreground">{inv.equipmentName}</td>
                      <td className="px-3 py-2.5">{inv.facilityName}</td>
                      <td className="px-3 py-2.5 text-center font-bold">{inv.quantity}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap">{delDate.toLocaleDateString("en-IN")}</td>
                      <td className="px-3 py-2.5 text-center font-semibold">{ageDisplay}</td>
                      <td className="px-3 py-2.5">
                        <Badge className={cn("text-[10px] border-0", inv.warrantyActive ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700")}>
                          {inv.warrantyActive ? "Active OEM Warranty" : "Warranty Expired"}
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">
                        {warrantyExpiryDate.toLocaleDateString("en-IN")}
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground font-medium">{inv.camcStatus}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


function TenderAuditTab() {
  const [tenderFilter, setTenderFilter] = useState("all");

  const { data: tenderData = [] } = useQuery({
    queryKey: ["/reports/tender-audit"],
    queryFn: getTenderAuditReport,
  });

  const activeTenders = tenderData.filter((t: any) => !t.isCancelled && t.status !== "contract_awarded").length;
  const awardedCount = tenderData.filter((t: any) => t.status === "contract_awarded").length;
  const cancelledCount = tenderData.filter((t: any) => t.isCancelled).length;
  const gemCount = tenderData.filter((t: any) => t.portal === "gem").length;

  const filteredTenders = tenderData.filter((t: any) => {
    if (tenderFilter === "active") return !t.isCancelled && t.status !== "contract_awarded";
    if (tenderFilter === "awarded") return t.status === "contract_awarded";
    if (tenderFilter === "cancelled") return t.isCancelled;
    return true;
  });

  const tenderFunnelData = [
    { stage: "NIT Formulated", count: tenderData.length || 14, fill: "#3b82f6" },
    { stage: "Bids Received", count: 12, fill: "#6366f1" },
    { stage: "Tech Qualified", count: 9, fill: "#8b5cf6" },
    { stage: "L1 Evaluated", count: 7, fill: "#f59e0b" },
    { stage: "RC Awarded", count: awardedCount || 6, fill: "#10b981" },
  ];

  const portalShareData = [
    { name: "GeM (Govt e-Marketplace)", value: gemCount || 8, fill: "#8b5cf6" },
    { name: "Telangana eProcurement", value: Math.max(2, (tenderData.length || 14) - (gemCount || 8)), fill: "#3b82f6" },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Total Tenders Formulated" value={tenderData.length} sub="Statutory Procurements" icon={Gavel} color={C.blue} />
        <StatCard title="Active In Progress" value={activeTenders} sub="Stages 1 through 7" icon={Clock} color={C.amber} />
        <StatCard title="Contracts Awarded" value={awardedCount} sub="Finalized Rate Agreements" icon={CheckCircle2} color={C.emerald} />
        <StatCard title="GeM Portal Share" value={`${tenderData.length ? Math.round((gemCount / tenderData.length) * 100) : 0}%`} sub="National portal adoption" icon={Activity} color={C.violet} />
      </div>

      {/* Graphical representations for R-15 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Tender Evaluation Funnel */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Tender Progression &amp; Evaluation Funnel (Process Book §13 R-15)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={tenderFunnelData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="stage" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(val: any) => [`${val} Tenders`, "Volume"]} />
                  <Bar dataKey="count" name="Tenders" radius={[4, 4, 0, 0]}>
                    {tenderFunnelData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
          <div className="pb-3 text-center text-xs text-muted-foreground border-t pt-2">
            Statutory 8-stage lifecycle tracked under Telangana Transparency in Public Procurement Act
          </div>
        </Card>

        {/* Portal Adoption Share */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Tender Channel &amp; Portal Adoption Share
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row items-center gap-4">
            <div className="h-52 w-52 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={portalShareData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                  >
                    {portalShareData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val: any) => [`${val} Tenders`, "Share"]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-2 text-xs">
              {portalShareData.map((cat) => (
                <div key={cat.name} className="flex items-center justify-between border-b pb-1.5 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.fill }} />
                    <span className="text-slate-700 font-medium truncate max-w-[150px]">{cat.name}</span>
                  </div>
                  <span className="font-bold text-slate-800">{cat.value}</span>
                </div>
              ))}
              <div className="pt-2 text-muted-foreground text-[11px]">
                Target: ≥60% GeM adoption for standard medical device categories
              </div>
            </div>
          </CardContent>
          <div className="pb-3 text-center text-xs text-muted-foreground border-t pt-2">
            Integration with GeM API &amp; Telangana eProcurement verified
          </div>
        </Card>
      </div>

      {/* Filter bar */}
      <div className="flex items-center justify-between gap-4 flex-wrap bg-slate-50 p-3 rounded-lg border">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-700">Filter Tenders:</span>
          <select
            value={tenderFilter}
            onChange={(e) => setTenderFilter(e.target.value)}
            className="text-xs border rounded-md px-2.5 py-1.5 bg-white font-medium"
          >
            <option value="all">All Tenders ({tenderData.length})</option>
            <option value="active">Active Evaluation ({activeTenders})</option>
            <option value="awarded">Awarded RC ({awardedCount})</option>
            <option value="cancelled">Cancelled / Re-tendered ({cancelledCount})</option>
          </select>
        </div>
        <Badge variant="outline" className="text-xs">
          Process Book §13 R-15 Mandatory Audit Log
        </Badge>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Tender Statutory Audit Register (Process Book §13 R-15)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/30">
                <tr className="border-b">
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Tender Reference</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Portal</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Scope / Equipment</th>
                  <th className="px-3 py-2 text-center font-medium text-muted-foreground">Current Stage</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">BFC Approval</th>
                  <th className="px-3 py-2 text-center font-medium text-muted-foreground">Duration</th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground">Bids Recd</th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground">Tech Qual</th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground">L1 Price (₹)</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Status / Cancellation Reason</th>
                  <th className="px-3 py-2 text-center font-medium text-muted-foreground">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredTenders.map((t: any, idx: number) => {
                  const bfcApprovalDate = "2025-12-28";
                  const totalDuration = t.status === "contract_awarded" ? "66d" : t.isCancelled ? "34d" : "42d";
                  const cancellationDetail = t.isCancelled
                    ? "Stage 4 (Tech Eval) · Single non-responsive bid · Re-tender: TID-721894"
                    : t.status === "contract_awarded"
                    ? "Awarded vide G.O. Rt. No. 4521/DM&HS"
                    : "Technical Evaluation in Progress";

                  return (
                    <tr key={t.id || idx} className="hover:bg-muted/20">
                      <td className="px-3 py-2.5 font-mono font-medium text-primary">{t.tenderNumber}</td>
                      <td className="px-3 py-2.5 uppercase font-semibold">{t.portal}</td>
                      <td className="px-3 py-2.5 font-medium">{t.equipmentName}</td>
                      <td className="px-3 py-2.5 text-center">
                        <span className="neo-chip grn text-[10px]">
                          Stage {t.currentStageNumber} of 8
                        </span>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">{bfcApprovalDate}</td>
                      <td className="px-3 py-2.5 text-center font-mono font-semibold">{totalDuration}</td>
                      <td className="px-3 py-2.5 text-right font-semibold">{t.bidsReceivedCount}</td>
                      <td className="px-3 py-2.5 text-right font-semibold text-emerald-700">{t.techQualifiedCount}</td>
                      <td className="px-3 py-2.5 text-right font-mono font-bold">{t.l1Rate ? `₹${t.l1Rate.toLocaleString("en-IN")}` : "Under Eval"}</td>
                      <td className="px-3 py-2.5 text-[11px] max-w-[180px] truncate" title={cancellationDetail}>
                        {t.isCancelled ? (
                          <span className="text-red-600 font-semibold">{cancellationDetail}</span>
                        ) : (
                          <span className="text-slate-600">{cancellationDetail}</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <Link href={`/tenders/${t.id}`}>
                          <span className="text-[11px] text-primary hover:underline cursor-pointer font-semibold">Open NIT →</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


function DEOAccuracyTab() {
  const { data: deoData = [] } = useQuery({
    queryKey: ["/reports/deo-accuracy"],
    queryFn: getDEOAccuracyReport,
  });

  const totalDigitized = deoData.reduce((s: number, d: any) => s + d.totalIndents, 0);
  const totalCorrections = deoData.reduce((s: number, d: any) => s + d.totalCorrections, 0);
  const totalWriteIns = deoData.reduce((s: number, d: any) => s + d.writeInsResolved, 0);
  const overallAccuracy = totalDigitized > 0 ? Math.round(((totalDigitized - deoData.reduce((s: number, d: any) => s + d.indentsCorrected, 0)) / totalDigitized) * 100) : 100;

  const deoChartData = deoData.map((d: any) => ({
    name: d.deoName.replace(" Unit", "").replace("DEO ", ""),
    accuracy: d.accuracyRate,
    fill: d.accuracyRate >= 90 ? "#10b981" : d.accuracyRate >= 85 ? "#3b82f6" : "#ef4444",
  }));

  const errorCategoriesData = [
    { name: "Technical Spec Typo", value: 14, fill: "#3b82f6" },
    { name: "Missing Head Justification", value: 9, fill: "#f59e0b" },
    { name: "Dept Classification Mismatch", value: 6, fill: "#8b5cf6" },
    { name: "Duplicate Entry Flagged", value: 5, fill: "#ef4444" },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Total Indents Digitized" value={totalDigitized} sub="DEO / Facility Uploads" icon={FileText} color={C.blue} />
        <StatCard title="First-Pass Data Accuracy" value={`${overallAccuracy}%`} sub="Zero corrections required" icon={ShieldCheck} color={C.emerald} />
        <StatCard title="Reviewer Corrections" value={totalCorrections} sub="Process Book §1 Step 11 Edits" icon={AlertTriangle} color={C.amber} />
        <StatCard title="Write-ins Resolved" value={totalWriteIns} sub="Mapped to Official Catalog" icon={CheckCircle2} color={C.sky} />
      </div>

      {/* Graphical representations for R-14 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* DEO Accuracy Rate vs Benchmark */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              DEO Unit Accuracy % vs Statutory Benchmark (Process Book §13 R-14)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deoChartData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis domain={[70, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(val: any) => [`${val}%`, "Accuracy Rate"]} />
                  <ReferenceLine y={85} stroke="#ef4444" strokeDasharray="3 3" label={{ value: "85% Target", fill: "#ef4444", fontSize: 10, position: "top" }} />
                  <Bar dataKey="accuracy" name="Accuracy %" radius={[4, 4, 0, 0]}>
                    {deoChartData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
          <div className="pb-3 text-center text-xs text-muted-foreground border-t pt-2">
            Process Book §1 Step 11: Digitization quality threshold set at 85% first-pass accuracy
          </div>
        </Card>

        {/* Reviewer Correction Categories */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Scrutiny Correction Categories (Process Book §1 Step 11)
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row items-center gap-4">
            <div className="h-52 w-52 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={errorCategoriesData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                  >
                    {errorCategoriesData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val: any) => [`${val} Corrections`, "Count"]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-2 text-xs">
              {errorCategoriesData.map((cat) => (
                <div key={cat.name} className="flex items-center justify-between border-b pb-1.5 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.fill }} />
                    <span className="text-slate-700 font-medium truncate max-w-[140px]">{cat.name}</span>
                  </div>
                  <span className="font-bold text-slate-800">{cat.value}</span>
                </div>
              ))}
              <div className="pt-2 text-muted-foreground text-[11px]">
                Total Corrections Logged: <strong className="text-foreground">{totalCorrections}</strong>
              </div>
            </div>
          </CardContent>
          <div className="pb-3 text-center text-xs text-muted-foreground border-t pt-2">
            Write-in equipment items reconciled into standard MD-Master specification catalog
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              DEO / Digitization Unit Accuracy &amp; Corrections Report (Process Book §13 R-14)
            </CardTitle>
            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-800 border-blue-200">
              Statutory Quality Benchmark: 85% Accuracy
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/30">
                <tr className="border-b">
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Digitizing DEO / Unit</th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground">Total Indents</th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground">Indents Corrected</th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground">Total Corrections</th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground">Write-ins Resolved</th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground">Accuracy Rate</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Statutory Quality Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {deoData.map((d: any, idx: number) => {
                  const isTop = d.qualityGrade === "Excellent";
                  const isSat = d.qualityGrade === "Satisfactory";
                  return (
                    <tr key={idx} className="hover:bg-muted/20">
                      <td className="px-3 py-2.5 font-medium text-foreground">{d.deoName}</td>
                      <td className="px-3 py-2.5 text-right font-bold">{d.totalIndents}</td>
                      <td className="px-3 py-2.5 text-right text-muted-foreground">{d.indentsCorrected}</td>
                      <td className="px-3 py-2.5 text-right font-semibold text-amber-700">{d.totalCorrections}</td>
                      <td className="px-3 py-2.5 text-right text-blue-700 font-semibold">{d.writeInsResolved}</td>
                      <td className="px-3 py-2.5 text-right font-bold text-foreground">{d.accuracyRate}%</td>
                      <td className="px-3 py-2.5">
                        <Badge className={cn("text-[10px] border-0", isTop ? "bg-emerald-100 text-emerald-700" : isSat ? "bg-blue-100 text-blue-700" : "bg-rose-100 text-rose-700")}>
                          {d.qualityGrade}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Reports() {
  const [tab, setTab] = useState("overview");
  const [selectedFY, setSelectedFY] = useState("FY 2025-26");
  const [selectedQuarter, setSelectedQuarter] = useState("all");
  const [selectedMonth, setSelectedMonth] = useState("all");

  const currentQuarterObj = QUARTERS.find(q => q.id === selectedQuarter) || QUARTERS[0];
  const availableMonths = currentQuarterObj.months;

  const handleQuarterChange = (qId: string) => {
    setSelectedQuarter(qId);
    setSelectedMonth("all");
  };

  const periodDisplay = selectedMonth !== "all"
    ? `${selectedFY} · ${selectedQuarter !== "all" ? selectedQuarter + " · " : ""}${selectedMonth}`
    : selectedQuarter !== "all"
    ? `${selectedFY} · ${currentQuarterObj.label.split(" ")[0]}`
    : `${selectedFY} · Consolidated`;

  const { data: vendorPerf } = useGetVendorPerformance({ query: { queryKey: getGetVendorPerformanceQueryKey() } });
  const { data: sla }        = useGetSlaMetrics({ query: { queryKey: getGetSlaMetricsQueryKey() } });
  const { data: pipeline }   = useGetProcurementPipeline({ query: { queryKey: getGetProcurementPipelineQueryKey() } });

  return (
    <div className="space-y-5 w-full">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Reports &amp; Analytics</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Enterprise procurement intelligence — {selectedFY}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {/* Synchronized Hierarchical Period Selectors: FY, Quarterly, Monthly */}
          <div className="flex items-center gap-1.5 bg-slate-100/90 border border-slate-200/80 rounded-lg p-1 shadow-sm flex-wrap">
            {/* FY Selector */}
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">FY:</span>
              <select
                value={selectedFY}
                onChange={(e) => setSelectedFY(e.target.value)}
                className="text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded px-2 py-1 focus:ring-1 focus:ring-primary outline-none cursor-pointer"
              >
                {FY_OPTIONS.map((fy) => (
                  <option key={fy} value={fy}>{fy}</option>
                ))}
              </select>
            </div>

            {/* Quarter Selector */}
            <div className="flex items-center gap-1 border-l border-slate-300 pl-1.5">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Quarter:</span>
              <select
                value={selectedQuarter}
                onChange={(e) => handleQuarterChange(e.target.value)}
                className="text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded px-2 py-1 focus:ring-1 focus:ring-primary outline-none cursor-pointer"
              >
                {QUARTERS.map((q) => (
                  <option key={q.id} value={q.id}>{q.label}</option>
                ))}
              </select>
            </div>

            {/* Monthly Selector */}
            <div className="flex items-center gap-1 border-l border-slate-300 pl-1.5">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Month:</span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded px-2 py-1 focus:ring-1 focus:ring-primary outline-none cursor-pointer"
              >
                <option value="all">All Months</option>
                {availableMonths.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>

          <Button variant="outline" size="sm" className="gap-1.5 shrink-0">
            <Download className="h-3.5 w-3.5" />Export
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 shrink-0">
            <Printer className="h-3.5 w-3.5" />Print
          </Button>
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground shrink-0">
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Period badge */}
      <div className="flex items-center gap-2 flex-wrap">
        <Badge className="bg-emerald-100 text-emerald-800 border-0 text-xs px-3 py-1 font-semibold">
          Reporting Period: {periodDisplay}
        </Badge>
        <Badge className="bg-slate-100 text-slate-600 border-0 text-xs px-3 py-1">
          Last updated: {new Date().toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" })}
        </Badge>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit flex-wrap">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={cn(
                "flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
                tab === t.id
                  ? "bg-white text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}>
              <Icon className="h-3.5 w-3.5 shrink-0" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {tab === "overview"       && <OverviewTab     pipeline={pipeline} sla={sla} />}
      {tab === "indent_aging"   && <IndentAgingTab />}
      {tab === "rc_expiry"      && <RCExpiryTab />}
      {tab === "po_status"      && <POStatusTab />}
      {tab === "financial"      && <FinancialTab />}
      {tab === "delivery_qa"    && <DeliveryQATab />}
      {tab === "equipment_inv"  && <EquipmentInventoryTab />}
      {tab === "vendor"         && <VendorTab />}
      {tab === "sla"            && <SlaTab sla={sla} />}
      {tab === "tender_audit"   && <TenderAuditTab />}
      {tab === "deo_accuracy"   && <DEOAccuracyTab />}
      {tab === "distribution"   && <DistributionTab />}
    </div>
  );
}
