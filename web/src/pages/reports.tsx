import { useState, useMemo } from "react";
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
  Search, ChevronLeft, ChevronRight, FileSpreadsheet, Eye, Filter, X,
} from "lucide-react";
import { differenceInDays, format } from "date-fns";
import { mockEquipment, mockRateContracts, mockTenders, mockDistributionData, mockIndents, mockBudgetByProgramme, mockVendorPerformance } from "@/mocks/data";
import AssetReport from "./asset-report";

/* ── Period hierarchy options (FY, Quarterly, Monthly) ── */
const FY_OPTIONS = ["FY 2026-27", "FY 2025-26", "FY 2024-25"];

const QUARTERS = [
  { id: "all", label: "All Quarters", months: ["April", "May", "June", "July", "August", "September", "October", "November", "December", "January", "February", "March"] },
  { id: "Q1",  label: "Q1 (Apr – Jun)", months: ["April", "May", "June"] },
  { id: "Q2",  label: "Q2 (Jul – Sep)", months: ["July", "August", "September"] },
  { id: "Q3",  label: "Q3 (Oct – Dec)", months: ["October", "November", "December"] },
  { id: "Q4",  label: "Q4 (Jan – Mar)", months: ["January", "February", "March"] },
];

/* ── Tabs (Process Book Suite) ─────────────────── */
const TABS = [
  { id: "overview",      label: "Executive Overview",                  icon: BarChart3 },
  { id: "indent_aging",  label: "Indent Aging & Pendency",             icon: Clock },
  { id: "rc_expiry",     label: "RC Expiry & Renewal",                 icon: ShieldAlert },
  { id: "po_status",     label: "PO & Payment Tracker",                icon: FileText },
  { id: "financial",     label: "Budget & Spend",                      icon: IndianRupee },
  { id: "delivery_qa",   label: "Delivery & QA Compliance",            icon: Truck },
  { id: "equipment_inv", label: "Equipment Status / Inventory",        icon: Activity },
  { id: "vendor",        label: "Vendor Performance",                  icon: Users },
  { id: "sla",           label: "SLA & Compliance",                    icon: ShieldCheck },
  { id: "tender_audit",  label: "Tender Statutory Audit",              icon: Gavel },
  { id: "deo_accuracy",  label: "DEO Data Quality",                    icon: ShieldCheck },
  { id: "distribution",  label: "Distribution Analytics",              icon: Truck },
  { id: "asset_report",  label: "Asset Report",                        icon: Activity },
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
    <Card className="bg-white border border-[#e4eaf2] shadow-xs hover:shadow-md transition-shadow">
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
              Procurement Pipeline Register
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
            Programme &amp; Account Head Budget Utilisation
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
            Vendor Statutory Performance &amp; Contractual Compliance
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
              Statutory Weighted Score Breakdown
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
            SLA Benchmark: Consignee site delivery within 30 calendar days of PO
          </div>
        </Card>
      </div>

      {/* Scorecard table with Contractual Compliance Sub-Scores */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Empanelled Supplier Performance Register
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
            Live Statutory SLA Tracking
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
            Stage-wise Turnaround Time (Days) vs Statutory SLA Benchmark
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
              SLA Breach &amp; Turnaround by Stage
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
              Statutory Aging Buckets
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
            Active Indent Pendency Register
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
              Rate Contract Expiry Horizon
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
              Rate Contract Expiry &amp; Statutory Renewal Status
            </CardTitle>
            <Badge variant="outline" className="text-xs">
              Retender before expiration
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
            Treasury UTR tracking verified
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Purchase Order Milestones &amp; Payment Status
            </CardTitle>
            <Badge variant="outline" className="text-xs bg-slate-100">
              Manual Paid / Not-Paid Tracking
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
  const [delStatusFilter, setDelStatusFilter] = useState("all");

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
  const delayedCount = complianceData.length - onTimeCount;

  const filteredCompliance = complianceData.filter((d: any) => {
    if (delStatusFilter === "ontime") return d.isOnTime;
    if (delStatusFilter === "delayed") return !d.isOnTime;
    return true;
  });

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
        <StatCard
          title="On-Time Delivery"
          value={`${onTimeRate}%`}
          sub={`${onTimeCount} on time · ${delayedCount} delayed (LD Applied)`}
          icon={Clock}
          color={onTimeRate >= 85 ? C.emerald : onTimeRate >= 70 ? C.amber : C.rose}
        />
        <StatCard title="QA First-Pass Rate" value={`${qaSummary.firstPassRate}%`} sub={`${qaSummary.acceptedCount} passed on first inspect`} icon={ShieldCheck} color={C.sky} />
        <StatCard title="Conditional Rectifications" value={qaSummary.conditionalCount} sub="15-Day Vendor SLA Notice" icon={AlertTriangle} color={C.amber} />
      </div>

      {/* Graphical Representations for Delivery & QA */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Consignment Lead-Time vs 30-Day SLA */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Consignment Lead-Time vs 30-Day Statutory SLA
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
              Consignee QA &amp; Acceptance Outcomes
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
            15-day rectification window triggered on conditional acceptance
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Compliance Table with Discrepancy & Resolution */}
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Delivery Compliance &amp; Lead-Time
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Consignments tracked for 30-day SLA compliance and liquidated damages
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <select
                value={delStatusFilter}
                onChange={(e) => setDelStatusFilter(e.target.value)}
                className="text-xs bg-white border border-[#e4eaf2] rounded px-2 py-1 text-[#152340] cursor-pointer"
              >
                <option value="all">All Deliveries ({complianceData.length})</option>
                <option value="ontime">On-Time Only ({onTimeCount})</option>
                <option value="delayed">Delayed / LD Due ({delayedCount})</option>
              </select>
            </div>
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
                  {filteredCompliance.map((d: any) => {
                    const discrepancy = d.delayDays > 0
                      ? `Delayed by ${d.delayDays}d · LD ${(d.delayDays >= 14 ? "1.0%" : "0.5%")} applied`
                      : d.deliveryTrackingId === "DEL-00002"
                      ? "Minor accessory carton seal damaged"
                      : "None · Full package intact";
                    return (
                      <tr key={d.id} className="hover:bg-muted/20">
                        <td className="px-3 py-2 font-mono font-medium text-primary">
                          <div>{d.deliveryTrackingId}</div>
                          {d.poNumber && <div className="text-[10px] text-muted-foreground">{d.poNumber}</div>}
                        </td>
                        <td className="px-3 py-2 font-medium text-[#152340]">{d.facilityName}</td>
                        <td className="px-3 py-2 text-muted-foreground">{d.vendorName}</td>
                        <td className="px-3 py-2 text-right font-bold">
                          {d.delayDays > 0 ? (
                            <span className="neo-chip red">+{d.delayDays}d LD</span>
                          ) : (
                            <span className="neo-chip grn">On Time</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-[11px] text-slate-600 max-w-[150px] truncate" title={discrepancy}>
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
              Consignee QA &amp; Acceptance Summary
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
  const [filterDistrict, setFilterDistrict] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterWarranty, setFilterWarranty] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedAsset, setSelectedAsset] = useState<any | null>(null);

  const { data: invData = [], isLoading } = useQuery({
    queryKey: ["/reports/equipment-inventory"],
    queryFn: getEquipmentInventoryReport,
  });

  // Extract unique categories and districts for dropdowns
  const categories = useMemo(() => {
    const set = new Set<string>();
    invData.forEach((i: any) => { if (i.category) set.add(i.category); });
    return Array.from(set).sort();
  }, [invData]);

  const districts = useMemo(() => {
    const set = new Set<string>();
    invData.forEach((i: any) => { if (i.district) set.add(i.district); });
    return Array.from(set).sort();
  }, [invData]);

  // Comprehensive filter logic
  const filteredInv = useMemo(() => {
    return invData.filter((i: any) => {
      if (filterCat !== "all" && i.category !== filterCat) return false;
      if (filterDistrict !== "all" && i.district !== filterDistrict) return false;
      if (filterStatus !== "all" && i.currentStatus !== filterStatus) return false;
      if (filterWarranty === "warranty" && !i.warrantyActive) return false;
      if (filterWarranty === "camc" && !i.camcStatus?.toLowerCase()?.includes("camc")) return false;
      if (filterWarranty === "expired" && (i.warrantyActive || i.camcStatus?.toLowerCase()?.includes("active camc"))) return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        const matches =
          (i.equipmentName?.toLowerCase() || "").includes(q) ||
          (i.serialNumber?.toLowerCase() || "").includes(q) ||
          (i.assetTag?.toLowerCase() || "").includes(q) ||
          (i.poNumber?.toLowerCase() || "").includes(q) ||
          (i.vendorName?.toLowerCase() || "").includes(q) ||
          (i.institutionName?.toLowerCase() || "").includes(q) ||
          (i.district?.toLowerCase() || "").includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [invData, filterCat, filterDistrict, filterStatus, filterWarranty, search]);

  // Dynamic KPI Stats
  const totalAssets = invData.length;
  const activeAssets = invData.filter((i: any) => i.currentStatus === "Active / Operational" || i.rawStatus === "active").length;
  const underRepair = invData.filter((i: any) => i.currentStatus === "Under Repair" || ["under_repair", "under_maintenance", "breakdown"].includes(i.rawStatus)).length;
  const decommissioned = invData.filter((i: any) => i.currentStatus === "Decommissioned" || ["decommissioned", "disposed"].includes(i.rawStatus)).length;
  const underWarranty = invData.filter((i: any) => i.warrantyActive).length;
  const underCamc = invData.filter((i: any) => i.camcStatus?.includes("Active CAMC")).length;

  const activePct = totalAssets > 0 ? ((activeAssets / totalAssets) * 100).toFixed(1) : "0";
  const repairPct = totalAssets > 0 ? ((underRepair / totalAssets) * 100).toFixed(1) : "0";

  // Pagination logic
  const totalPages = Math.max(1, Math.ceil(filteredInv.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredInv.slice(start, start + pageSize);
  }, [filteredInv, currentPage, pageSize]);

  // Chart data: Top Institutions
  const institutionDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    invData.forEach((i: any) => {
      const name = i.institutionName?.replace("Government Medical College", "GMC")?.replace("District Hospital", "DH") || "Other";
      counts[name] = (counts[name] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([facility, units]) => ({ facility: facility.slice(0, 18), units }))
      .sort((a, b) => b.units - a.units)
      .slice(0, 6);
  }, [invData]);

  // Chart data: Status breakdown
  const statusBreakdownData = [
    { name: "Active / Operational", value: activeAssets || 1, fill: "#10b981" },
    { name: "Under Repair", value: underRepair || 0, fill: "#f59e0b" },
    { name: "Decommissioned", value: decommissioned || 0, fill: "#ef4444" },
    { name: "Standby / Other", value: Math.max(0, totalAssets - activeAssets - underRepair - decommissioned), fill: "#64748b" },
  ];

  // CSV Export function
  const handleExportCSV = () => {
    const headers = [
      "Equipment Name",
      "Serial No.",
      "PO Ref",
      "Vendor",
      "Institution / Facility",
      "District",
      "Delivery Date",
      "Installation Date",
      "Warranty Expiry",
      "CAMC Status",
      "Current Status",
      "Equipment Age",
    ];
    const csvRows = [headers.join(",")];
    filteredInv.forEach((r: any) => {
      const row = [
        `"${(r.equipmentName || "").replace(/"/g, '""')}"`,
        `"${(r.serialNumber || r.assetTag || "").replace(/"/g, '""')}"`,
        `"${(r.poNumber || "").replace(/"/g, '""')}"`,
        `"${(r.vendorName || "").replace(/"/g, '""')}"`,
        `"${(r.institutionName || "").replace(/"/g, '""')}"`,
        `"${(r.district || "").replace(/"/g, '""')}"`,
        `"${r.deliveryDate ? format(new Date(r.deliveryDate), "dd/MM/yyyy") : ""}"`,
        `"${r.installationDate ? format(new Date(r.installationDate), "dd/MM/yyyy") : ""}"`,
        `"${r.warrantyEndDate ? format(new Date(r.warrantyEndDate), "dd/MM/yyyy") : ""}"`,
        `"${(r.camcStatus || "").replace(/"/g, '""')}"`,
        `"${(r.currentStatus || "").replace(/"/g, '""')}"`,
        `"${(r.equipmentAge || "").replace(/"/g, '""')}"`,
      ];
      csvRows.push(row.join(","));
    });
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `TGMSIDC_Equipment_Inventory_Report_${format(new Date(), "yyyyMMdd")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5">
      {/* ── Summary KPI Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
        <StatCard
          title="Total Deployed Units"
          value={totalAssets}
          sub="33 Telangana Health Districts"
          icon={Activity}
          color={C.blue}
        />
        <StatCard
          title="Active & Operational"
          value={`${activeAssets}`}
          sub={`${activePct}% of total fleet`}
          icon={CheckCircle2}
          color={C.emerald}
        />
        <StatCard
          title="Under Repair / Maint."
          value={underRepair}
          sub={`${repairPct}% require service`}
          icon={AlertTriangle}
          color={C.amber}
        />
        <StatCard
          title="Decommissioned"
          value={decommissioned}
          sub="Condemned / Replaced"
          icon={XCircle}
          color={C.slate}
        />
        <StatCard
          title="Active Warranty / CAMC"
          value={`${underWarranty}`}
          sub={`${underCamc} on active CAMC`}
          icon={ShieldCheck}
          color={C.indigo}
        />
      </div>

      {/* ── Graphical Charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Facility Deployment Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Equipment Deployed by Major Health Facility
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={institutionDistribution} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="facility" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(val: any) => [`${val} Units`, "Deployed Units"]} />
                  <Bar dataKey="units" name="Deployed Units" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
          <div className="pb-3 text-center text-xs text-muted-foreground border-t pt-2">
            Asset register spans teaching hospitals, district headquarters, and TVVP facilities
          </div>
        </Card>

        {/* Operational Status Breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Equipment Operational &amp; Service Status
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row items-center gap-4">
            <div className="h-52 w-52 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusBreakdownData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                  >
                    {statusBreakdownData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val: any) => [`${val} Units`, "Share"]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-2 text-xs">
              {statusBreakdownData.map((cat: any) => (
                <div key={cat.name} className="flex items-center justify-between border-b pb-1.5 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.fill }} />
                    <span className="text-slate-700 font-medium truncate max-w-[140px]">{cat.name}</span>
                  </div>
                  <span className="font-bold text-slate-800">{cat.value}</span>
                </div>
              ))}
              <div className="pt-2 text-muted-foreground text-[11px]">
                Statutory requirement: Operational uptime ≥ 95% under warranty &amp; CAMC SLA
              </div>
            </div>
          </CardContent>
          <div className="pb-3 text-center text-xs text-muted-foreground border-t pt-2">
            Automated escalation triggered when equipment exceeds 72h downtime
          </div>
        </Card>
      </div>

      {/* ── Multi-Filter Toolbar & Table Card ── */}
      <Card className="border border-[#e4eaf2] shadow-xs">
        <CardHeader className="p-3.5 border-b border-[#e4eaf2] bg-white">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-sm font-bold text-[#152340] uppercase tracking-wider">
                Equipment Status / Inventory Report
              </CardTitle>
              <p className="text-xs text-[#6b7a93] mt-0.5">
                Complete inventory of procured equipment with location, lifecycle data, and warranty/CAMC coverage (§3.2.3)
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
                className="gap-1.5 text-xs bg-white border-[#e4eaf2] text-[#3c4a63] hover:text-[#2563eb] hover:border-[#2563eb] cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Export Excel / CSV</span>
              </Button>
              <Badge variant="outline" className="text-xs bg-white text-[#152340] border-[#e4eaf2]">
                Showing {filteredInv.length} of {totalAssets} Assets
              </Badge>
            </div>
          </div>

          {/* Filter Controls Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5 pt-3">
            {/* Search Input */}
            <div className="relative md:col-span-1">
              <Search className="w-3.5 h-3.5 text-[#93a2b8] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search equipment, serial, PO..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="w-full h-8 bg-white border border-[#e4eaf2] rounded-md text-xs text-[#152340] placeholder:text-[#93a2b8] pl-8 pr-2.5 focus:outline-none focus:border-[#2563eb]"
              />
            </div>

            {/* Category Filter */}
            <div>
              <select
                value={filterCat}
                onChange={(e) => { setFilterCat(e.target.value); setPage(1); }}
                className="w-full h-8 bg-white border border-[#e4eaf2] rounded-md text-xs text-[#152340] px-2.5 focus:outline-none focus:border-[#2563eb] cursor-pointer"
              >
                <option value="all">All Categories ({categories.length})</option>
                {categories.map((c: string) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* District Filter */}
            <div>
              <select
                value={filterDistrict}
                onChange={(e) => { setFilterDistrict(e.target.value); setPage(1); }}
                className="w-full h-8 bg-white border border-[#e4eaf2] rounded-md text-xs text-[#152340] px-2.5 focus:outline-none focus:border-[#2563eb] cursor-pointer"
              >
                <option value="all">All Districts ({districts.length})</option>
                {districts.map((d: string) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            {/* Current Status Filter */}
            <div>
              <select
                value={filterStatus}
                onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
                className="w-full h-8 bg-white border border-[#e4eaf2] rounded-md text-xs text-[#152340] px-2.5 focus:outline-none focus:border-[#2563eb] cursor-pointer"
              >
                <option value="all">All Current Statuses</option>
                <option value="Active / Operational">Active / Operational</option>
                <option value="Under Repair">Under Repair</option>
                <option value="Decommissioned">Decommissioned</option>
                <option value="Standby / Inactive">Standby / Inactive</option>
              </select>
            </div>

            {/* Warranty / CAMC Status Filter */}
            <div>
              <select
                value={filterWarranty}
                onChange={(e) => { setFilterWarranty(e.target.value); setPage(1); }}
                className="w-full h-8 bg-white border border-[#e4eaf2] rounded-md text-xs text-[#152340] px-2.5 focus:outline-none focus:border-[#2563eb] cursor-pointer"
              >
                <option value="all">All Warranty / CAMC</option>
                <option value="warranty">Active OEM Warranty Only</option>
                <option value="camc">Under Active CAMC</option>
                <option value="expired">Warranty Expired / Due</option>
              </select>
            </div>
          </div>
        </CardHeader>

        {/* ── Table Card Body ── */}
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-16 text-center">
              <div className="w-6 h-6 border-2 border-[#2563eb] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs text-[#6b7a93]">Loading equipment assets…</p>
            </div>
          ) : filteredInv.length === 0 ? (
            <div className="py-16 text-center">
              <Activity className="w-8 h-8 text-[#93a2b8] mx-auto mb-2" />
              <p className="text-xs font-semibold text-[#152340]">No equipment matches your filter criteria</p>
              <p className="text-[11px] text-[#6b7a93] mt-0.5">Try resetting or broadening your search parameters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#e4eaf2] bg-[#f8fafc] text-[#6b7a93] font-bold uppercase tracking-wider text-[10.5px]">
                    <th className="py-2.5 px-3">Equipment Name</th>
                    <th className="py-2.5 px-3">Serial No.</th>
                    <th className="py-2.5 px-3">PO Ref</th>
                    <th className="py-2.5 px-3">Vendor</th>
                    <th className="py-2.5 px-3">Institution / Facility</th>
                    <th className="py-2.5 px-3">District</th>
                    <th className="py-2.5 px-3">Delivery Date</th>
                    <th className="py-2.5 px-3">Installation Date</th>
                    <th className="py-2.5 px-3">Warranty Expiry</th>
                    <th className="py-2.5 px-3">CAMC Status</th>
                    <th className="py-2.5 px-3">Current Status</th>
                    <th className="py-2.5 px-3 text-center">Equipment Age</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eff3f8]">
                  {paginatedData.map((inv: any, idx: number) => {
                    const delDate = inv.deliveryDate ? new Date(inv.deliveryDate) : null;
                    const instDate = inv.installationDate ? new Date(inv.installationDate) : null;
                    const warDate = inv.warrantyEndDate ? new Date(inv.warrantyEndDate) : null;

                    const isRepair = inv.currentStatus === "Under Repair";
                    const isDecom = inv.currentStatus === "Decommissioned";
                    const isActive = inv.currentStatus === "Active / Operational";

                    return (
                      <tr
                        key={inv.id || idx}
                        onClick={() => setSelectedAsset(inv)}
                        className="hover:bg-[#eff5ff] cursor-pointer transition-colors"
                      >
                        {/* 1. Equipment Name */}
                        <td className="py-2.5 px-3 font-semibold text-[#152340]">
                          <div className="truncate max-w-[200px]" title={inv.equipmentName}>
                            {inv.equipmentName}
                          </div>
                          <span className="text-[10px] text-[#6b7a93] font-normal block truncate max-w-[200px]">
                            {inv.category}
                          </span>
                        </td>

                        {/* 2. Serial No. */}
                        <td className="py-2.5 px-3 font-mono text-[11px] text-[#2563eb] whitespace-nowrap">
                          <span className="font-bold">{inv.serialNumber || inv.assetTag}</span>
                          {inv.assetTag && inv.assetTag !== inv.serialNumber && (
                            <span className="text-[10px] text-[#6b7a93] block">{inv.assetTag}</span>
                          )}
                        </td>

                        {/* 3. PO Ref */}
                        <td className="py-2.5 px-3 font-mono text-[11.5px] font-semibold text-[#152340] whitespace-nowrap">
                          {inv.poNumber || "PO-TGMSIDC-RC"}
                        </td>

                        {/* 4. Vendor */}
                        <td className="py-2.5 px-3 text-[#3c4a63]">
                          <span className="truncate max-w-[150px] block" title={inv.vendorName}>
                            {inv.vendorName}
                          </span>
                        </td>

                        {/* 5. Institution */}
                        <td className="py-2.5 px-3 text-[#152340] font-medium">
                          <span className="truncate max-w-[170px] block" title={inv.institutionName}>
                            {inv.institutionName}
                          </span>
                        </td>

                        {/* 6. District */}
                        <td className="py-2.5 px-3 text-[#3c4a63] whitespace-nowrap">
                          {inv.district || "Hyderabad"}
                        </td>

                        {/* 7. Delivery Date */}
                        <td className="py-2.5 px-3 text-[#6b7a93] text-[11px] whitespace-nowrap">
                          {delDate ? format(delDate, "dd MMM yyyy") : "—"}
                        </td>

                        {/* 8. Installation Date */}
                        <td className="py-2.5 px-3 text-[#6b7a93] text-[11px] whitespace-nowrap">
                          {instDate ? format(instDate, "dd MMM yyyy") : "—"}
                        </td>

                        {/* 9. Warranty Expiry */}
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className={cn(
                            "text-[11px]",
                            inv.warrantyActive ? "text-emerald-700 font-medium" : "text-amber-700 font-medium"
                          )}>
                            {warDate ? format(warDate, "dd MMM yyyy") : "—"}
                          </span>
                        </td>

                        {/* 10. CAMC Status */}
                        <td className="py-2.5 px-3 text-[#475569]">
                          <span className="text-[10.5px] px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 truncate max-w-[140px] inline-block" title={inv.camcStatus}>
                            {inv.camcStatus || "Under OEM Guarantee"}
                          </span>
                        </td>

                        {/* 11. Current Status */}
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className={cn(
                            "neo-chip",
                            isActive ? "grn" : isRepair ? "amb" : isDecom ? "red" : "gry"
                          )}>
                            <span className={cn(
                              "w-1.5 h-1.5 rounded-full shrink-0",
                              isActive ? "bg-emerald-600" : isRepair ? "bg-amber-600" : isDecom ? "bg-rose-600" : "bg-slate-400"
                            )} />
                            <span>{inv.currentStatus}</span>
                          </span>
                        </td>

                        {/* 12. Equipment Age */}
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <span className="inline-block px-2 py-0.5 bg-slate-100 border border-slate-200 text-[#152340] font-semibold text-[11px] rounded">
                            {inv.equipmentAge || "—"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Bottom Right Pagination Controls ── */}
          <div className="p-3 border-t border-[#e4eaf2] bg-[#f8fafc] flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs">
            <div className="flex items-center gap-2 text-[#6b7a93]">
              <span>Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                className="bg-white border border-[#e4eaf2] rounded px-2 py-1 text-xs text-[#152340] focus:outline-none focus:border-[#2563eb] cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
              <span className="hidden sm:inline">
                Showing {filteredInv.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredInv.length)} of {filteredInv.length} assets
              </span>
            </div>

            <div className="flex items-center gap-1.5 ml-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="h-7 px-2 text-xs border-[#e4eaf2] cursor-pointer disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-3.5 h-3.5 mr-0.5" />
                <span>Prev</span>
              </Button>
              <span className="text-xs font-semibold px-2 text-[#152340]">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="h-7 px-2 text-xs border-[#e4eaf2] cursor-pointer disabled:cursor-not-allowed"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Asset Quick Details Dialog ── */}
      {selectedAsset && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={() => setSelectedAsset(null)}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-lg w-full p-5 space-y-4 border border-slate-200 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 block">
                  Asset Details · {selectedAsset.assetTag}
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-0.5">
                  {selectedAsset.equipmentName}
                </h3>
              </div>
              <button
                onClick={() => setSelectedAsset(null)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold px-2 py-0.5 rounded cursor-pointer"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 bg-slate-50 rounded border">
                <span className="text-[10px] text-muted-foreground uppercase font-bold block">Serial Number</span>
                <span className="font-mono font-semibold text-slate-800">{selectedAsset.serialNumber || selectedAsset.assetTag}</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded border">
                <span className="text-[10px] text-muted-foreground uppercase font-bold block">PO Reference</span>
                <span className="font-mono font-semibold text-slate-800">{selectedAsset.poNumber}</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded border">
                <span className="text-[10px] text-muted-foreground uppercase font-bold block">Empanelled Vendor</span>
                <span className="font-medium text-slate-800">{selectedAsset.vendorName}</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded border">
                <span className="text-[10px] text-muted-foreground uppercase font-bold block">Hospital / Institution</span>
                <span className="font-medium text-slate-800">{selectedAsset.institutionName}</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded border">
                <span className="text-[10px] text-muted-foreground uppercase font-bold block">District</span>
                <span className="font-medium text-slate-800">{selectedAsset.district}</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded border">
                <span className="text-[10px] text-muted-foreground uppercase font-bold block">Equipment Age</span>
                <span className="font-bold text-slate-800">{selectedAsset.equipmentAge}</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded border">
                <span className="text-[10px] text-muted-foreground uppercase font-bold block">Delivery Date</span>
                <span className="font-medium text-slate-800">
                  {selectedAsset.deliveryDate ? format(new Date(selectedAsset.deliveryDate), "dd MMM yyyy") : "—"}
                </span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded border">
                <span className="text-[10px] text-muted-foreground uppercase font-bold block">Installation Date</span>
                <span className="font-medium text-slate-800">
                  {selectedAsset.installationDate ? format(new Date(selectedAsset.installationDate), "dd MMM yyyy") : "—"}
                </span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded border">
                <span className="text-[10px] text-muted-foreground uppercase font-bold block">Warranty Expiry</span>
                <span className="font-medium text-emerald-700">
                  {selectedAsset.warrantyEndDate ? format(new Date(selectedAsset.warrantyEndDate), "dd MMM yyyy") : "—"}
                </span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded border">
                <span className="text-[10px] text-muted-foreground uppercase font-bold block">CAMC Status</span>
                <span className="font-medium text-slate-800">{selectedAsset.camcStatus}</span>
              </div>
            </div>

            <div className="flex items-center justify-between border-t pt-3">
              <span className="text-xs text-slate-500">
                Current Status: <strong className="text-slate-800">{selectedAsset.currentStatus}</strong>
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedAsset(null)}
                className="h-8 text-xs cursor-pointer"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TenderAuditTab() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [portalFilter, setPortalFilter] = useState("all");
  const [fyFilter, setFyFilter] = useState("all");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [selectedTender, setSelectedTender] = useState<any | null>(null);

  const { data: tenderData = [] } = useQuery({
    queryKey: ["/reports/tender-audit"],
    queryFn: getTenderAuditReport,
  });

  const totalCount = tenderData.length;
  const activeCount = tenderData.filter((t: any) => t.status === "Active").length;
  const approvedCount = tenderData.filter((t: any) => t.status === "Approved").length;
  const cancelledCount = tenderData.filter((t: any) => t.status === "Cancelled").length;
  const avgDuration = totalCount > 0
    ? Math.round(tenderData.reduce((s: number, t: any) => s + (t.durationDays || 0), 0) / totalCount)
    : 0;

  // Multi-Filter logic
  const filteredTenders = tenderData.filter((t: any) => {
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = (t.equipmentName || "").toLowerCase().includes(q);
      const matchCat = (t.equipmentCategory || "").toLowerCase().includes(q);
      const matchNum = (t.tenderNumber || "").toLowerCase().includes(q);
      const matchRc = (t.rcRef || "").toLowerCase().includes(q);
      const matchRe = (t.reTenderRef || "").toLowerCase().includes(q);
      if (!matchName && !matchCat && !matchNum && !matchRc && !matchRe) return false;
    }
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    if (typeFilter !== "all" && t.tenderType !== typeFilter) return false;
    if (portalFilter !== "all" && t.portal !== portalFilter) return false;
    if (fyFilter !== "all" && t.financialYear !== fyFilter) return false;
    return true;
  });

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredTenders.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const pagedTenders = filteredTenders.slice(startIndex, startIndex + pageSize);

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setTypeFilter("all");
    setPortalFilter("all");
    setFyFilter("all");
    setPage(1);
  };

  const exportCSV = () => {
    const headers = [
      "Equipment Name",
      "Equipment Category",
      "Tender Ref No",
      "Tender Date",
      "Tender Type",
      "Current Stage",
      "Status",
      "Stage of Cancellation",
      "Reason for Cancellation",
      "Re-tender Ref",
      "BFC Approval Date",
      "RC Ref",
      "Total Tender Duration (days)",
    ];
    const rows = filteredTenders.map(t => [
      t.equipmentName || "",
      t.equipmentCategory || "",
      t.tenderNumber || "",
      t.tenderDate || "",
      t.tenderType || "",
      t.currentStage || "",
      t.status || "",
      t.cancellationStage || "—",
      t.cancellationReason || "—",
      t.reTenderRef || "—",
      t.bfcApprovalDate || "—",
      t.rcRef || "—",
      t.durationDays ?? "",
    ]);
    const csvContent = [
      headers.map(h => `"${h.replace(/"/g, '""')}"`).join(","),
      ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")),
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Tender_Statutory_Audit_Report_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const tenderFunnelData = [
    { stage: "Stage 1: NIT Published", count: totalCount || 14, fill: "#3b82f6" },
    { stage: "Stage 2: Pre-bid Queries", count: Math.max(1, totalCount - 1), fill: "#6366f1" },
    { stage: "Stage 4: Evaluation", count: Math.max(1, totalCount - cancelledCount - 1), fill: "#8b5cf6" },
    { stage: "Stage 7: Financial / BFC", count: Math.max(1, activeCount + approvedCount), fill: "#f59e0b" },
    { stage: "Stage 10: RC Finalized", count: approvedCount || 5, fill: "#10b981" },
  ];

  const portalShareData = [
    { name: "Telangana e-Procurement", value: tenderData.filter((t: any) => t.portal !== "GeM").length || 10, fill: "#3b82f6" },
    { name: "GeM (Govt e-Marketplace)", value: tenderData.filter((t: any) => t.portal === "GeM").length || 4, fill: "#8b5cf6" },
  ];

  return (
    <div className="space-y-5">
      {/* ── KPI Summary Cards (All White Backgrounds) ── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        <StatCard title="Total Tenders" value={totalCount} sub="Statutory Procurements" icon={Gavel} color={C.blue} />
        <StatCard title="Active In Progress" value={activeCount} sub="Under Statutory Stages" icon={Clock} color={C.amber} />
        <StatCard title="Contracts Awarded" value={approvedCount} sub="RCs Created & Finalized" icon={CheckCircle2} color={C.emerald} />
        <StatCard title="Cancelled / Re-tendered" value={cancelledCount} sub="Justified with Audit Reason" icon={XCircle} color={C.rose} />
        <StatCard title="Avg Duration" value={`${avgDuration}d`} sub="Tender Date to Finality" icon={Activity} color={C.violet} />
      </div>

      {/* ── Graphical Visualizations (White Backgrounds) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Tender Progression Funnel */}
        <Card className="bg-white border border-[#e4eaf2] shadow-xs">
          <CardHeader className="pb-2 border-b border-[#e4eaf2]/60">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Tender Progression &amp; Statutory Milestone Funnel
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
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
            <div className="pt-2 text-center text-xs text-muted-foreground border-t border-[#e4eaf2]/60 mt-2">
              Statutory 10-stage lifecycle governed under Telangana Transparency in Public Procurement Act
            </div>
          </CardContent>
        </Card>

        {/* Portal Adoption Share */}
        <Card className="bg-white border border-[#e4eaf2] shadow-xs">
          <CardHeader className="pb-2 border-b border-[#e4eaf2]/60">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Portal Channel Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 flex flex-col sm:flex-row items-center gap-4">
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
            <div className="flex-1 space-y-2.5 text-xs w-full">
              {portalShareData.map((cat) => (
                <div key={cat.name} className="flex items-center justify-between border-b border-[#e4eaf2]/60 pb-1.5 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.fill }} />
                    <span className="text-slate-700 font-medium truncate max-w-[170px]">{cat.name}</span>
                  </div>
                  <span className="font-bold text-slate-800">{cat.value} Tenders</span>
                </div>
              ))}
              <div className="pt-2 text-muted-foreground text-[11px]">
                Procurement portal reference: Telangana e-Procurement Portal &amp; GeM (Govt e-Marketplace)
              </div>
            </div>
          </CardContent>
          <div className="pb-3 text-center text-xs text-muted-foreground border-t border-[#e4eaf2]/60 pt-2">
            Reference link enabled for state tender notifications (no automated third-party sync)
          </div>
        </Card>
      </div>

      {/* ── Multi-Filter Toolbar (White Background) ── */}
      <div className="p-3.5 bg-white border border-[#e4eaf2] rounded-xl shadow-xs space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-1 min-w-[240px]">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search equipment, category, tender ref..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="w-full text-xs bg-white border border-[#e4eaf2] rounded-lg pl-8 pr-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary text-slate-800"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="text-xs bg-white border border-[#e4eaf2] rounded-lg px-2.5 py-1.5 font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              <option value="all">Status: All ({totalCount})</option>
              <option value="Active">Active ({activeCount})</option>
              <option value="Approved">Approved / RC ({approvedCount})</option>
              <option value="Cancelled">Cancelled ({cancelledCount})</option>
            </select>

            {/* Tender Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
              className="text-xs bg-white border border-[#e4eaf2] rounded-lg px-2.5 py-1.5 font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              <option value="all">Type: All Types</option>
              <option value="Open">Open Tender</option>
              <option value="Limited">Limited Tender</option>
              <option value="GeM">GeM Tender</option>
            </select>

            {/* Portal Filter */}
            <select
              value={portalFilter}
              onChange={(e) => { setPortalFilter(e.target.value); setPage(1); }}
              className="text-xs bg-white border border-[#e4eaf2] rounded-lg px-2.5 py-1.5 font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              <option value="all">Portal: All Channels</option>
              <option value="Telangana e-Procurement">Telangana e-Procurement</option>
              <option value="GeM">GeM</option>
            </select>

            {/* Financial Year Filter */}
            <select
              value={fyFilter}
              onChange={(e) => { setFyFilter(e.target.value); setPage(1); }}
              className="text-xs bg-white border border-[#e4eaf2] rounded-lg px-2.5 py-1.5 font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              <option value="all">FY: All Years</option>
              <option value="2026-27">FY 2026-27</option>
              <option value="2025-26">FY 2025-26</option>
              <option value="2024-25">FY 2024-25</option>
            </select>

            {(search || statusFilter !== "all" || typeFilter !== "all" || portalFilter !== "all" || fyFilter !== "all") && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs h-8 text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5 mr-1" /> Reset
              </Button>
            )}

            <Button variant="outline" size="sm" onClick={exportCSV} className="text-xs h-8 gap-1.5 bg-white border-[#e4eaf2]">
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" /> Export CSV (13 Columns)
            </Button>
          </div>
        </div>
      </div>

      {/* ── 13-Column Statutory Audit Register Table Card (White Background) ── */}
      <Card className="bg-white border border-[#e4eaf2] shadow-xs overflow-hidden">
        <CardHeader className="p-3.5 border-b border-[#e4eaf2] bg-white flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-bold text-[#152340] uppercase tracking-wider">
              Tender Statutory Audit Report (§3.2.7)
            </CardTitle>
            <p className="text-xs text-[#6b7a93] mt-0.5">
              13 statutory audit columns covering equipment details, statutory stages, cancellation justifications, BFC approval, and Rate Contract linkages
            </p>
          </div>
          <Badge variant="outline" className="text-xs bg-white border-[#e4eaf2]">
            {filteredTenders.length} Records
          </Badge>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-[#f8fafc] border-b border-[#e4eaf2]">
                <tr>
                  <th className="px-3 py-2.5 text-left font-semibold text-[#152340] whitespace-nowrap">#</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-[#152340] whitespace-nowrap">1. Equipment Name</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-[#152340] whitespace-nowrap">2. Equipment Category</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-[#152340] whitespace-nowrap">3. Tender Ref No</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-[#152340] whitespace-nowrap">4. Tender Date</th>
                  <th className="px-3 py-2.5 text-center font-semibold text-[#152340] whitespace-nowrap">5. Tender Type</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-[#152340] whitespace-nowrap">6. Current Stage</th>
                  <th className="px-3 py-2.5 text-center font-semibold text-[#152340] whitespace-nowrap">7. Status</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-[#152340] whitespace-nowrap">8. Stage of Cancellation</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-[#152340] whitespace-nowrap min-w-[200px]">9. Reason for Cancellation</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-[#152340] whitespace-nowrap">10. Re-tender Ref</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-[#152340] whitespace-nowrap">11. BFC Approval Date</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-[#152340] whitespace-nowrap">12. RC Ref</th>
                  <th className="px-3 py-2.5 text-center font-semibold text-[#152340] whitespace-nowrap">13. Duration (days)</th>
                  <th className="px-3 py-2.5 text-center font-semibold text-[#152340] whitespace-nowrap sticky right-0 bg-[#f8fafc]">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e4eaf2]">
                {pagedTenders.length === 0 ? (
                  <tr>
                    <td colSpan={15} className="py-8 text-center text-muted-foreground text-xs">
                      No tenders found matching the selected filters.
                    </td>
                  </tr>
                ) : (
                  pagedTenders.map((t: any, idx: number) => {
                    const rowNumber = startIndex + idx + 1;
                    return (
                      <tr
                        key={t.id || t.tenderNumber}
                        onClick={() => setSelectedTender(t)}
                        className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                      >
                        <td className="px-3 py-2.5 text-muted-foreground font-mono">{rowNumber}</td>
                        {/* 1. Equipment Name */}
                        <td className="px-3 py-2.5 font-medium text-slate-900 max-w-[220px]">
                          <div className="truncate font-semibold" title={t.equipmentName}>
                            {t.equipmentName}
                          </div>
                        </td>
                        {/* 2. Equipment Category */}
                        <td className="px-3 py-2.5 text-slate-700 whitespace-nowrap">
                          {t.equipmentCategory}
                        </td>
                        {/* 3. Tender Ref No */}
                        <td className="px-3 py-2.5 font-mono font-medium text-primary whitespace-nowrap">
                          {t.tenderNumber}
                        </td>
                        {/* 4. Tender Date */}
                        <td className="px-3 py-2.5 text-slate-600 font-mono whitespace-nowrap">
                          {t.tenderDate || "—"}
                        </td>
                        {/* 5. Tender Type */}
                        <td className="px-3 py-2.5 text-center whitespace-nowrap">
                          <span className={cn(
                            "px-2 py-0.5 rounded text-[10.5px] font-semibold border",
                            t.tenderType === "Open" ? "bg-blue-50 text-blue-700 border-blue-200" :
                            t.tenderType === "GeM" ? "bg-violet-50 text-violet-700 border-violet-200" :
                            "bg-slate-100 text-slate-700 border-slate-200"
                          )}>
                            {t.tenderType}
                          </span>
                        </td>
                        {/* 6. Current Stage */}
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <span className="text-[11px] font-medium text-slate-800">
                            {t.currentStage}
                          </span>
                        </td>
                        {/* 7. Status */}
                        <td className="px-3 py-2.5 text-center whitespace-nowrap">
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-[10.5px] font-bold border",
                            t.status === "Approved" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                            t.status === "Cancelled" ? "bg-red-50 text-red-700 border-red-200" :
                            "bg-blue-50 text-blue-700 border-blue-200"
                          )}>
                            {t.status}
                          </span>
                        </td>
                        {/* 8. Stage of Cancellation */}
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          {t.isCancelled && t.cancellationStage ? (
                            <span className="text-red-700 font-semibold">{t.cancellationStage}</span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        {/* 9. Reason for Cancellation */}
                        <td className="px-3 py-2.5 text-[11px] max-w-[240px]">
                          {t.isCancelled && t.cancellationReason ? (
                            <span className="text-red-600 font-medium line-clamp-2" title={t.cancellationReason}>
                              {t.cancellationReason}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        {/* 10. Re-tender Ref */}
                        <td className="px-3 py-2.5 font-mono text-[11px] whitespace-nowrap">
                          {t.reTenderRef ? (
                            <span className="text-primary font-semibold">{t.reTenderRef}</span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        {/* 11. BFC Approval Date */}
                        <td className="px-3 py-2.5 text-slate-700 font-mono whitespace-nowrap">
                          {t.bfcApprovalDate || "—"}
                        </td>
                        {/* 12. RC Ref */}
                        <td className="px-3 py-2.5 font-mono text-[11px] whitespace-nowrap">
                          {t.rcRef ? (
                            <span className="text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                              {t.rcRef}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        {/* 13. Total Duration (days) */}
                        <td className="px-3 py-2.5 text-center font-mono font-bold text-slate-800 whitespace-nowrap">
                          {t.durationDays !== undefined ? `${t.durationDays}d` : "—"}
                        </td>
                        {/* 14. Action */}
                        <td className="px-3 py-2.5 text-center whitespace-nowrap sticky right-0 bg-white">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); setSelectedTender(t); }}
                            className="h-7 px-2 text-xs text-primary hover:text-primary font-medium gap-1"
                          >
                            <Eye className="h-3 w-3" /> Audit
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* ── Table Footer & Pagination (Bottom Right) ── */}
          <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-3 border-t border-[#e4eaf2] bg-white gap-3">
            <div className="text-xs text-muted-foreground">
              Showing <span className="font-semibold text-slate-800">{filteredTenders.length === 0 ? 0 : startIndex + 1}</span> to{" "}
              <span className="font-semibold text-slate-800">{Math.min(startIndex + pageSize, filteredTenders.length)}</span> of{" "}
              <span className="font-semibold text-slate-800">{filteredTenders.length}</span> tenders
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="h-8 px-2.5 text-xs bg-white border-[#e4eaf2] gap-1"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Previous
              </Button>
              <span className="text-xs font-medium text-slate-700 px-2">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="h-8 px-2.5 text-xs bg-white border-[#e4eaf2] gap-1"
              >
                Next <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Audit Trail Modal Dialog ── */}
      {selectedTender && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl border border-[#e4eaf2] shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in-50 duration-150">
            {/* Modal Header */}
            <div className="p-4 border-b border-[#e4eaf2] flex items-center justify-between bg-white">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900">{selectedTender.tenderNumber}</h3>
                  <Badge variant="outline" className={cn(
                    "text-xs font-bold",
                    selectedTender.status === "Approved" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                    selectedTender.status === "Cancelled" ? "bg-red-50 text-red-700 border-red-200" :
                    "bg-blue-50 text-blue-700 border-blue-200"
                  )}>
                    {selectedTender.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground font-mono">{selectedTender.financialYear}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {selectedTender.equipmentName} · {selectedTender.equipmentCategory}
                </p>
              </div>
              <button
                onClick={() => setSelectedTender(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 overflow-y-auto space-y-4 text-xs">
              {/* 4 Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-2.5 bg-white rounded-lg border border-[#e4eaf2]">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Tender Date</p>
                  <p className="font-semibold text-slate-800 mt-0.5">{selectedTender.tenderDate || "—"}</p>
                </div>
                <div className="p-2.5 bg-white rounded-lg border border-[#e4eaf2]">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Tender Type</p>
                  <p className="font-semibold text-slate-800 mt-0.5">{selectedTender.tenderType} ({selectedTender.portal})</p>
                </div>
                <div className="p-2.5 bg-white rounded-lg border border-[#e4eaf2]">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Current Stage</p>
                  <p className="font-semibold text-slate-800 mt-0.5">{selectedTender.currentStage}</p>
                </div>
                <div className="p-2.5 bg-white rounded-lg border border-[#e4eaf2]">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Total Duration</p>
                  <p className="font-semibold text-slate-800 mt-0.5">{selectedTender.durationDays} Days</p>
                </div>
              </div>

              {/* Cancellation Detail Box */}
              {selectedTender.isCancelled && (
                <div className="p-3 bg-red-50/60 border border-red-200 rounded-lg space-y-1.5">
                  <div className="flex items-center gap-1.5 text-red-800 font-bold">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    Statutory Cancellation Audit Information
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    <div>
                      <span className="text-muted-foreground font-medium">Cancellation Stage: </span>
                      <span className="font-bold text-red-700">{selectedTender.cancellationStage}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground font-medium">Re-tender Ref: </span>
                      <span className="font-mono font-bold text-slate-800">{selectedTender.reTenderRef || "Pending NIT"}</span>
                    </div>
                  </div>
                  <div className="pt-1">
                    <span className="text-muted-foreground font-medium">Reason for Cancellation: </span>
                    <p className="text-red-900 font-medium mt-0.5">{selectedTender.cancellationReason}</p>
                  </div>
                </div>
              )}

              {/* Rate Contract & BFC Approval Box */}
              {selectedTender.status === "Approved" && (
                <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-lg space-y-1.5">
                  <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Board Finance Committee (BFC) &amp; Rate Contract Details
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs pt-1">
                    <div>
                      <span className="text-muted-foreground font-medium">BFC Approval Date: </span>
                      <span className="font-mono font-bold text-emerald-800">{selectedTender.bfcApprovalDate || "Recorded"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground font-medium">Rate Contract Ref: </span>
                      <span className="font-mono font-bold text-primary">{selectedTender.rcRef}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground font-medium">L1 Awarded Price: </span>
                      <span className="font-mono font-bold text-slate-800">
                        {selectedTender.l1BidAmount ? `₹${selectedTender.l1BidAmount.toLocaleString("en-IN")}` : "As per RC"}
                      </span>
                    </div>
                  </div>
                  {selectedTender.l1VendorName && (
                    <div className="pt-1 text-slate-700">
                      <span className="text-muted-foreground font-medium">L1 Vendor: </span>
                      <span className="font-semibold">{selectedTender.l1VendorName}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Statutory 10-Stage Lifecycle Audit Trail */}
              <div className="border border-[#e4eaf2] rounded-lg p-3 bg-white space-y-2">
                <h4 className="font-bold text-slate-800 uppercase text-[11px] tracking-wider">
                  Statutory 10-Stage Lifecycle Audit Register
                </h4>
                <div className="space-y-1.5">
                  {[
                    { num: 1, name: "Tender Opened / NIT Formulated", desc: "NIT published on Telangana e-Procurement / GeM portal" },
                    { num: 2, name: "Pre-bid Queries & Clarifications", desc: "Prospective bidders technical queries and committee clarifications" },
                    { num: 3, name: "Amendments & Corrigendum", desc: "Corrigendum published on public portal if specifications modified" },
                    { num: 4, name: "Bid Evaluation (Technical)", desc: "Scrutiny of commercial eligibility, EMD, and technical responsiveness" },
                    { num: 5, name: "Demo & Technical Evaluation", desc: "Physical equipment demonstration and NABL calibration testing" },
                    { num: 6, name: "Technical Committee Approval", desc: "Recommendation of qualified vendors to Board Finance Committee" },
                    { num: 7, name: "Financial Bid & BFC Prep", desc: "Financial bid decryption and preparation of comparative statement" },
                    { num: 8, name: "BFC Meeting", desc: "Board Finance Committee agenda presentation and deliberation" },
                    { num: 9, name: "BFC Decision & Sanction", desc: "Executive Director approval and sanction of negotiated L1 rates" },
                    { num: 10, name: "RC Header Entry & Issuance", desc: "Rate Contract finalized, signed with vendor, and active in system" },
                  ].map((stg) => {
                    const isDone = selectedTender.status === "Approved" || selectedTender.currentStageNumber > stg.num;
                    const isCurrent = selectedTender.status === "Active" && selectedTender.currentStageNumber === stg.num;
                    const isCancelledAtThisStage = selectedTender.isCancelled && selectedTender.cancellationStage?.includes(`Stage ${stg.num}`);

                    return (
                      <div
                        key={stg.num}
                        className={cn(
                          "flex items-center justify-between p-2 rounded border text-xs",
                          isCancelledAtThisStage ? "bg-red-50/80 border-red-200" :
                          isDone ? "bg-emerald-50/40 border-emerald-200" :
                          isCurrent ? "bg-blue-50/60 border-blue-200 font-semibold" :
                          "bg-white border-[#e4eaf2] text-muted-foreground"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px]",
                            isCancelledAtThisStage ? "bg-red-600 text-white" :
                            isDone ? "bg-emerald-600 text-white" :
                            isCurrent ? "bg-blue-600 text-white" :
                            "bg-slate-200 text-slate-600"
                          )}>
                            {stg.num}
                          </span>
                          <div>
                            <p className="font-semibold text-slate-800">{stg.name}</p>
                            <p className="text-[10px] text-muted-foreground">{stg.desc}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className={cn(
                          "text-[10px] font-semibold",
                          isCancelledAtThisStage ? "bg-red-100 text-red-700 border-red-300" :
                          isDone ? "bg-emerald-100 text-emerald-800 border-emerald-300" :
                          isCurrent ? "bg-blue-100 text-blue-800 border-blue-300" :
                          "bg-slate-100 text-slate-600 border-slate-200"
                        )}>
                          {isCancelledAtThisStage ? "Cancelled Here" : isDone ? "Completed" : isCurrent ? "Current Stage" : "Pending"}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-[#e4eaf2] bg-white flex items-center justify-between">
              <Link href={`/tenders/${selectedTender.id}`}>
                <Button variant="default" size="sm" className="text-xs gap-1.5">
                  Open Tender Workbench →
                </Button>
              </Link>
              <Button variant="outline" size="sm" onClick={() => setSelectedTender(null)} className="text-xs bg-white border-[#e4eaf2]">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
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
        <StatCard title="Reviewer Corrections" value={totalCorrections} sub="Scrutiny Edits" icon={AlertTriangle} color={C.amber} />
        <StatCard title="Write-ins Resolved" value={totalWriteIns} sub="Mapped to Official Catalog" icon={CheckCircle2} color={C.sky} />
      </div>

      {/* Graphical representations for R-14 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* DEO Accuracy Rate vs Benchmark */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              DEO Unit Accuracy % vs Statutory Benchmark
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
            Digitization quality threshold set at 85% first-pass accuracy
          </div>
        </Card>

        {/* Reviewer Correction Categories */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Scrutiny Correction Categories
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
              DEO / Digitization Unit Accuracy &amp; Corrections Report
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
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">DEO Name</th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground">Total Indents Entered</th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground">Fields Corrected by TGMSIDC</th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground">Correction Rate %</th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground">Write-Ins Resolved</th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground">Accuracy Score</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Quality Grade</th>
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
                      <td className="px-3 py-2.5 text-right font-semibold text-amber-700">{d.totalCorrections}</td>
                      <td className="px-3 py-2.5 text-right text-muted-foreground">{((d.totalCorrections / d.totalIndents) * 100).toFixed(1)}%</td>
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
  const [tab, setTab] = useState(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search).get("tab");
      if (p) return p;
    }
    return "overview";
  });
  const [selectedFY, setSelectedFY] = useState("FY 2026-27");
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
      {tab === "asset_report"   && <AssetReport />}
    </div>
  );
}
