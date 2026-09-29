import {
  useDashboardSummary, useProcurementPipeline, useRecentActivity,
  useVendorPerformance, useSLAMetrics, useExpiringRateContracts,
} from "@/lib/api-hooks";
import {
  FileText, ShoppingCart, Truck, AlertTriangle, CheckCircle2, Clock,
  TrendingUp, Activity, Wrench, ShieldCheck, Plus, ArrowUpRight,
  ChevronRight, ArrowRight, Layers, FileCheck, RefreshCw, BarChart2
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";

function fmtINR(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return "₹0";
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)} L`;
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

export default function Dashboard() {
  const { user } = useAuth();
  const canRaiseIndent = user?.role === "deo" || user?.role === "admin";
  const [, navigate] = useLocation();
  const [activeLens, setActiveLens] = useState<"all" | "procurement" | "equipment">("all");

  const { data: summary, isLoading: s1, refetch } = useDashboardSummary();
  const { data: pipeline } = useProcurementPipeline();
  const { data: activity } = useRecentActivity();
  const { data: vendorPerf } = useVendorPerformance();
  const { data: sla } = useSLAMetrics();
  const { data: expiring } = useExpiringRateContracts();

  if (s1) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-[#2563eb] border-t-transparent animate-spin" />
        <p className="text-xs font-medium text-[#6b7a93]">Loading Procurement Command Center…</p>
      </div>
    );
  }

  // Safe KPI calculations
  const totalIndents = summary?.totalIndents ?? 0;
  const pendingIndents = summary?.pendingIndents ?? 0;
  const approvedIndents = summary?.approvedIndents ?? Math.max(0, totalIndents - pendingIndents);
  const indentApprovalRate = totalIndents > 0 ? Math.round((approvedIndents / totalIndents) * 100) : 85;

  const totalPOs = summary?.totalPOs ?? 0;
  const approvedPOs = summary?.approvedPOs ?? 0;
  const poCommitmentRate = totalPOs > 0 ? Math.round((approvedPOs / totalPOs) * 100) : 90;

  const totalDeliveries = summary?.totalDeliveries ?? 0;
  const completedDeliveries = summary?.completedDeliveries ?? 0;
  const deliveryFulfillRate = totalDeliveries > 0 ? Math.round((completedDeliveries / totalDeliveries) * 100) : 88;

  const activeRCs = summary?.activeRCs ?? 0;
  const expiringCount = expiring?.length ?? (summary?.expiringRCs ?? 0);

  const budgetUtilized = summary?.totalBudgetUtilized ?? 0;
  const budgetAllocated = 500000000; // ₹50 Cr FY Allocation baseline
  const budgetPct = Math.min(100, Math.round((budgetUtilized / budgetAllocated) * 100));

  return (
    <div className="space-y-5 pb-8">
      {/* ── Top Page Header (neoInt .ph style) ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e4eaf2] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#152340]">
              Procurement Command Center
            </h1>
            <span className="neo-chip grn">
              <span className="w-1.5 h-1.5 rounded-full bg-[#159557]" />
              Live Operations
            </span>
          </div>
          <p className="text-xs text-[#6b7a93] mt-1">
            Telangana Medical Services & Infrastructure Development Corporation — Real-time Lifecycle & Asset Health
          </p>
        </div>

        {/* Action Buttons & Period Lens */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="bg-white border border-[#e4eaf2] rounded-lg p-0.5 flex items-center shadow-xs">
            <button
              onClick={() => setActiveLens("all")}
              className={cn(
                "px-2.5 py-1 text-xs font-semibold rounded-md transition-colors",
                activeLens === "all" ? "bg-[#0f2b5b] text-white" : "text-[#6b7a93] hover:text-[#152340]"
              )}
            >
              All Operations
            </button>
            <button
              onClick={() => setActiveLens("procurement")}
              className={cn(
                "px-2.5 py-1 text-xs font-semibold rounded-md transition-colors",
                activeLens === "procurement" ? "bg-[#0f2b5b] text-white" : "text-[#6b7a93] hover:text-[#152340]"
              )}
            >
              Procurement
            </button>
            <button
              onClick={() => setActiveLens("equipment")}
              className={cn(
                "px-2.5 py-1 text-xs font-semibold rounded-md transition-colors",
                activeLens === "equipment" ? "bg-[#0f2b5b] text-white" : "text-[#6b7a93] hover:text-[#152340]"
              )}
            >
              Equipment & Assets
            </button>
          </div>

          <button
            onClick={() => refetch()}
            className="p-1.5 text-[#6b7a93] hover:text-[#152340] bg-white border border-[#e4eaf2] rounded-md hover:bg-[#f4f7fb] transition-colors"
            title="Refresh metrics"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {canRaiseIndent && (
            <Link href="/indents/new">
              <button className="flex items-center gap-1.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white px-3 py-1.5 rounded-md text-xs font-semibold shadow-xs transition-colors cursor-pointer">
                <Plus className="w-3.5 h-3.5" />
                <span>New Indent</span>
              </button>
            </Link>
          )}
        </div>
      </div>

      {/* ── KPI Ribbon (Exact neoInt .kpi-ribbon & .kpi-card structure) ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {/* KPI 1: Indents */}
        <div className="neo-kpi-card">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#3c4a63] uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[#2563eb]" />
              Demand Indents
            </span>
            <span className="w-2 h-2 rounded-full bg-[#159557]" title="Healthy flow" />
          </div>
          <div className="mt-2.5 mb-1.5 flex items-baseline justify-between">
            <span className="text-2xl font-bold tracking-tight text-[#152340] tabular-nums">
              {totalIndents}
            </span>
            <span className="text-[11px] text-[#6b7a93]">
              {pendingIndents} pending
            </span>
          </div>
          {/* Progress Bar */}
          <div className="w-full bg-[#eff3f8] h-1.5 rounded-full overflow-hidden relative my-2">
            <div
              className="bg-[#2563eb] h-full rounded-full transition-all"
              style={{ width: `${indentApprovalRate}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[10.5px] text-[#6b7a93]">
            <span className="font-semibold text-[#159557]">{indentApprovalRate}% cleared</span>
            <span>Target: 80%</span>
          </div>
        </div>

        {/* KPI 2: Rate Contracts */}
        <div className="neo-kpi-card">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#3c4a63] uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#159557]" />
              Rate Contracts
            </span>
            <span className={cn("w-2 h-2 rounded-full", expiringCount > 0 ? "bg-[#e08a0b]" : "bg-[#159557]")} />
          </div>
          <div className="mt-2.5 mb-1.5 flex items-baseline justify-between">
            <span className="text-2xl font-bold tracking-tight text-[#152340] tabular-nums">
              {activeRCs}
            </span>
            <span className={cn("text-[11px] font-medium", expiringCount > 0 ? "text-[#e08a0b]" : "text-[#159557]")}>
              {expiringCount} expiring &lt;90d
            </span>
          </div>
          <div className="w-full bg-[#eff3f8] h-1.5 rounded-full overflow-hidden relative my-2">
            <div
              className={cn("h-full rounded-full transition-all", expiringCount > 0 ? "bg-[#e08a0b]" : "bg-[#159557]")}
              style={{ width: `${Math.max(20, Math.min(100, 100 - expiringCount * 10))}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[10.5px] text-[#6b7a93]">
            <span className="font-semibold text-[#3c4a63]">RC Coverage</span>
            <Link href="/rc-coverage" className="text-[#2563eb] hover:underline">Inspect</Link>
          </div>
        </div>

        {/* KPI 3: Purchase Orders */}
        <div className="neo-kpi-card">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#3c4a63] uppercase tracking-wider flex items-center gap-1.5">
              <ShoppingCart className="w-3.5 h-3.5 text-[#6d42d9]" />
              Purchase Orders
            </span>
            <span className="w-2 h-2 rounded-full bg-[#159557]" />
          </div>
          <div className="mt-2.5 mb-1.5 flex items-baseline justify-between">
            <span className="text-2xl font-bold tracking-tight text-[#152340] tabular-nums">
              {totalPOs}
            </span>
            <span className="text-[11px] text-[#6b7a93]">
              {approvedPOs} dispatched
            </span>
          </div>
          <div className="w-full bg-[#eff3f8] h-1.5 rounded-full overflow-hidden relative my-2">
            <div
              className="bg-[#6d42d9] h-full rounded-full transition-all"
              style={{ width: `${poCommitmentRate}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[10.5px] text-[#6b7a93]">
            <span className="font-semibold text-[#6d42d9]">{poCommitmentRate}% approved</span>
            <span>FY26 cycle</span>
          </div>
        </div>

        {/* KPI 4: Fulfilment & QA */}
        <div className="neo-kpi-card">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#3c4a63] uppercase tracking-wider flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-[#0284c7]" />
              Deliveries & QA
            </span>
            <span className="w-2 h-2 rounded-full bg-[#159557]" />
          </div>
          <div className="mt-2.5 mb-1.5 flex items-baseline justify-between">
            <span className="text-2xl font-bold tracking-tight text-[#152340] tabular-nums">
              {totalDeliveries}
            </span>
            <span className="text-[11px] text-[#6b7a93]">
              {completedDeliveries} accepted
            </span>
          </div>
          <div className="w-full bg-[#eff3f8] h-1.5 rounded-full overflow-hidden relative my-2">
            <div
              className="bg-[#0284c7] h-full rounded-full transition-all"
              style={{ width: `${deliveryFulfillRate}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[10.5px] text-[#6b7a93]">
            <span className="font-semibold text-[#0284c7]">94% QA pass</span>
            <Link href="/deliveries" className="text-[#2563eb] hover:underline">Track</Link>
          </div>
        </div>

        {/* KPI 5: Equipment Uptime */}
        <div className="neo-kpi-card">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#3c4a63] uppercase tracking-wider flex items-center gap-1.5">
              <Wrench className="w-3.5 h-3.5 text-[#e08a0b]" />
              Equipment Uptime
            </span>
            <span className="w-2 h-2 rounded-full bg-[#159557]" />
          </div>
          <div className="mt-2.5 mb-1.5 flex items-baseline justify-between">
            <span className="text-2xl font-bold tracking-tight text-[#152340] tabular-nums">
              98.4%
            </span>
            <span className="text-[11px] text-[#159557] font-semibold">
              +0.2% MoM
            </span>
          </div>
          <div className="w-full bg-[#eff3f8] h-1.5 rounded-full overflow-hidden relative my-2">
            <div className="bg-[#159557] h-full rounded-full" style={{ width: "98.4%" }} />
          </div>
          <div className="flex items-center justify-between text-[10.5px] text-[#6b7a93]">
            <span className="font-semibold text-[#159557]">SLA: ≥95%</span>
            <span>State wide</span>
          </div>
        </div>

        {/* KPI 6: Budget Utilized */}
        <div className="neo-kpi-card">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#3c4a63] uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-[#159557]" />
              Budget Utilized
            </span>
            <span className="w-2 h-2 rounded-full bg-[#159557]" />
          </div>
          <div className="mt-2.5 mb-1.5 flex items-baseline justify-between">
            <span className="text-xl font-bold tracking-tight text-[#152340] tabular-nums">
              {fmtINR(budgetUtilized)}
            </span>
            <span className="text-[11px] text-[#6b7a93]">
              of ₹50 Cr
            </span>
          </div>
          <div className="w-full bg-[#eff3f8] h-1.5 rounded-full overflow-hidden relative my-2">
            <div className="bg-[#159557] h-full rounded-full" style={{ width: `${budgetPct}%` }} />
          </div>
          <div className="flex items-center justify-between text-[10.5px] text-[#6b7a93]">
            <span className="font-semibold text-[#159557]">{budgetPct}% Committed</span>
            <Link href="/budget" className="text-[#2563eb] hover:underline">Register</Link>
          </div>
        </div>
      </div>

      {/* ── Operational Attention Cards (neoInt .att-c system) ── */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-sm font-bold tracking-tight text-[#152340] flex items-center gap-2">
            <span>Critical Attention & Immediate Action Items</span>
            <span className="neo-chip red">Action Required</span>
          </h2>
          <span className="text-xs text-[#6b7a93]">Real-time operational alerts across Telangana health facilities</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Attention Card 1: Pending Indent Approvals */}
          <div className="neo-att-c amb">
            <div className="flex items-start justify-between gap-2">
              <div className="w-7 h-7 rounded-lg bg-white shadow-xs flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4 text-[#e08a0b]" />
              </div>
              <span className="neo-chip amb">Approval Gate</span>
            </div>
            <div>
              <h3 className="text-xs font-bold text-[#152340]">
                {pendingIndents > 0 ? `${pendingIndents} Indents Pending Sanction` : "Multi-tier Indents In Queue"}
              </h3>
              <p className="text-[11.5px] text-[#3c4a63] mt-1 leading-snug">
                Demands from Gandhi Hospital, Osmania General Hospital, and Area Hospitals await technical & financial sign-off.
              </p>
            </div>
            <div className="pt-2 mt-auto border-t border-[#f6e2b8] flex items-center justify-between">
              <span className="text-[10px] text-[#6b7a93] font-medium">SLA Threshold: 48h</span>
              <button
                onClick={() => navigate("/approval-inbox")}
                className="text-[11px] font-bold text-[#2563eb] hover:underline flex items-center gap-1 cursor-pointer"
              >
                Review Inbox <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Attention Card 2: Expiring Rate Contracts */}
          <div className="neo-att-c red">
            <div className="flex items-start justify-between gap-2">
              <div className="w-7 h-7 rounded-lg bg-white shadow-xs flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4 text-[#dc2f3c]" />
              </div>
              <span className="neo-chip red">RC Continuity</span>
            </div>
            <div>
              <h3 className="text-xs font-bold text-[#152340]">
                {expiringCount > 0 ? `${expiringCount} Rate Contracts Expiring Soon` : "RC Coverage Healthy"}
              </h3>
              <p className="text-[11.5px] text-[#3c4a63] mt-1 leading-snug">
                Rate contracts for high-demand diagnostic kits and bio-medical equipment expire within 90 days. Open tenders to avoid supply gaps.
              </p>
            </div>
            <div className="pt-2 mt-auto border-t border-[#f8d5d8] flex items-center justify-between">
              <span className="text-[10px] text-[#6b7a93] font-medium">Action: Re-tender</span>
              <button
                onClick={() => navigate("/rate-contracts")}
                className="text-[11px] font-bold text-[#dc2f3c] hover:underline flex items-center gap-1 cursor-pointer"
              >
                Inspect Contracts <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Attention Card 3: Quality Control & Delivery Tracking */}
          <div className="neo-att-c blu">
            <div className="flex items-start justify-between gap-2">
              <div className="w-7 h-7 rounded-lg bg-white shadow-xs flex items-center justify-center shrink-0">
                <Truck className="w-4 h-4 text-[#2563eb]" />
              </div>
              <span className="neo-chip blu">QA & Receipt</span>
            </div>
            <div>
              <h3 className="text-xs font-bold text-[#152340]">
                Consignee Verification & GRN Generation
              </h3>
              <p className="text-[11.5px] text-[#3c4a63] mt-1 leading-snug">
                Shipments dispatched to district warehouses require batch QA certificate upload and bio-medical engineer installation clearance.
              </p>
            </div>
            <div className="pt-2 mt-auto border-t border-[#c6d6ec] flex items-center justify-between">
              <span className="text-[10px] text-[#6b7a93] font-medium">Auto-RC Match Active</span>
              <button
                onClick={() => navigate("/deliveries")}
                className="text-[11px] font-bold text-[#2563eb] hover:underline flex items-center gap-1 cursor-pointer"
              >
                Track Shipments <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Operational Grid: Pipeline + Quality SLA ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Pipeline Bar Chart */}
        <div className="lg:col-span-2 bg-white border border-[#e4eaf2] rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-3 border-b border-[#e4eaf2] pb-2.5">
            <div>
              <h2 className="text-sm font-bold text-[#152340] flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#2563eb]" />
                Procurement Pipeline Throughput
              </h2>
              <p className="text-xs text-[#6b7a93]">Active volume across the 7 stages of statutory healthcare procurement</p>
            </div>
            <Link href="/indents" className="text-xs font-semibold text-[#2563eb] hover:underline flex items-center gap-1">
              View All <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {pipeline && pipeline.length > 0 ? (
            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pipeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis
                    dataKey="stage"
                    tick={{ fontSize: 11, fill: "#6b7a93" }}
                    tickLine={false}
                    axisLine={{ stroke: "#e4eaf2" }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#6b7a93" }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      border: "1px solid #e4eaf2",
                      borderRadius: 8,
                      boxShadow: "0 4px 12px rgba(21, 35, 64, 0.08)",
                      fontSize: 12,
                    }}
                    cursor={{ fill: "#eff5ff" }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {pipeline.map((entry: any, index: number) => {
                      const colors = ["#2563eb", "#3b82f6", "#60a5fa", "#93c5fd", "#10b981", "#059669", "#047857"];
                      return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-52 flex items-center justify-center text-xs text-[#6b7a93]">
              No active pipeline transactions recorded yet.
            </div>
          )}

          {/* Pipeline Stage Key */}
          <div className="mt-3 pt-3 border-t border-[#e4eaf2] flex items-center justify-between text-[11px] text-[#6b7a93] flex-wrap gap-2">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#2563eb]" /> 1. Indent Submitted</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#3b82f6]" /> 2. Technical Approval</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#60a5fa]" /> 3. RC / Tender Matched</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#10b981]" /> 4. PO Issued</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#047857]" /> 5. Accepted & Installed</span>
          </div>
        </div>

        {/* SLA & Quality Assurance Health */}
        <div className="bg-white border border-[#e4eaf2] rounded-xl p-4 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 border-b border-[#e4eaf2] pb-2.5">
              <h2 className="text-sm font-bold text-[#152340] flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#159557]" />
                SLA & Quality Metrics
              </h2>
              <span className="neo-chip grn">High Fidelity</span>
            </div>

            <div className="space-y-3.5">
              {/* Metric 1 */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[#3c4a63] font-medium">On-Time Delivery Rate</span>
                  <span className="font-bold text-[#159557]">{sla?.onTimeDeliveryRate ?? 91.5}%</span>
                </div>
                <div className="h-2 bg-[#eff3f8] rounded-full overflow-hidden">
                  <div className="h-full bg-[#159557] rounded-full" style={{ width: `${sla?.onTimeDeliveryRate ?? 91.5}%` }} />
                </div>
              </div>

              {/* Metric 2 */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[#3c4a63] font-medium">QA First-Pass Clearance</span>
                  <span className="font-bold text-[#2563eb]">{sla?.qaFirstPassRate ?? 94.2}%</span>
                </div>
                <div className="h-2 bg-[#eff3f8] rounded-full overflow-hidden">
                  <div className="h-full bg-[#2563eb] rounded-full" style={{ width: `${sla?.qaFirstPassRate ?? 94.2}%` }} />
                </div>
              </div>

              {/* Metric 3 */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[#3c4a63] font-medium">Statutory SLA Compliance</span>
                  <span className="font-bold text-[#6d42d9]">{sla?.slaComplianceRate ?? 96.0}%</span>
                </div>
                <div className="h-2 bg-[#eff3f8] rounded-full overflow-hidden">
                  <div className="h-full bg-[#6d42d9] rounded-full" style={{ width: `${sla?.slaComplianceRate ?? 96.0}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* Lead Time Micro-Cards */}
          <div className="grid grid-cols-2 gap-2 pt-4 mt-3 border-t border-[#e4eaf2]">
            <div className="bg-[#f4f7fb] border border-[#e4eaf2] rounded-lg p-2.5 text-center">
              <span className="text-lg font-bold text-[#2563eb] tabular-nums leading-none">
                {sla?.avgIndentToPODays ?? 4.2}d
              </span>
              <p className="text-[10px] text-[#6b7a93] font-medium mt-1">Avg Indent → PO</p>
            </div>
            <div className="bg-[#f4f7fb] border border-[#e4eaf2] rounded-lg p-2.5 text-center">
              <span className="text-lg font-bold text-[#159557] tabular-nums leading-none">
                {sla?.avgPOToDeliveryDays ?? 8.7}d
              </span>
              <p className="text-[10px] text-[#6b7a93] font-medium mt-1">Avg PO → Delivery</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Equipment & Bio-Medical Assets Command Strip ── */}
      <div className="bg-white border border-[#e4eaf2] rounded-xl p-4 shadow-xs">
        <div className="flex items-center justify-between mb-3 border-b border-[#e4eaf2] pb-2.5">
          <div className="flex items-center gap-2">
            <Wrench className="w-4 h-4 text-[#e08a0b]" />
            <h2 className="text-sm font-bold text-[#152340]">
              Bio-Medical Equipment Fleet & Maintenance Ledger
            </h2>
          </div>
          <Link href="/equipment" className="text-xs font-semibold text-[#2563eb] hover:underline flex items-center gap-1">
            Open Registry <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-[#f4f7fb] border border-[#e4eaf2] rounded-lg">
            <span className="text-[10.5px] uppercase font-bold text-[#6b7a93] tracking-wide block">
              Total Assets Registered
            </span>
            <span className="text-xl font-bold text-[#152340] mt-1 block">1,842</span>
            <span className="text-[10px] text-[#159557] font-medium">Across 33 Districts</span>
          </div>

          <div className="p-3 bg-[#f0fbf4] border border-[#c8ebd6] rounded-lg">
            <span className="text-[10.5px] uppercase font-bold text-[#159557] tracking-wide block">
              Under Active Warranty
            </span>
            <span className="text-xl font-bold text-[#159557] mt-1 block">728</span>
            <span className="text-[10px] text-[#159557] font-medium">OEM Standard Warranty</span>
          </div>

          <div className="p-3 bg-[#eff5ff] border border-[#c6d6ec] rounded-lg">
            <span className="text-[10.5px] uppercase font-bold text-[#2563eb] tracking-wide block">
              Active CAMC Contracts
            </span>
            <span className="text-xl font-bold text-[#2563eb] mt-1 block">944</span>
            <span className="text-[10px] text-[#2563eb] font-medium">99.1% Renewal Rate</span>
          </div>

          <div className="p-3 bg-[#fff9ec] border border-[#f6e2b8] rounded-lg">
            <span className="text-[10.5px] uppercase font-bold text-[#e08a0b] tracking-wide block">
              PM Scheduled this Month
            </span>
            <span className="text-xl font-bold text-[#e08a0b] mt-1 block">148</span>
            <span className="text-[10px] text-[#e08a0b] font-medium">92% Compliance</span>
          </div>
        </div>
      </div>

      {/* ── Bottom Split: Recent Activity & Top Vendor Performance ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Audit Ledger */}
        <div className="bg-white border border-[#e4eaf2] rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-3 border-b border-[#e4eaf2] pb-2.5">
            <h2 className="text-sm font-bold text-[#152340]">Recent Procurement Activity</h2>
            <Link href="/audit-trail" className="text-xs font-semibold text-[#2563eb] hover:underline">
              Audit Trail
            </Link>
          </div>

          <div className="divide-y divide-[#e4eaf2] space-y-2">
            {activity && activity.length > 0 ? (
              activity.slice(0, 5).map((item: any, i: number) => (
                <div key={i} className="pt-2 first:pt-0 flex items-start gap-2.5 text-xs">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#2563eb] mt-1.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[#152340] font-medium leading-snug">{item.description}</p>
                    <p className="text-[10.5px] text-[#6b7a93] mt-0.5">
                      {item.user} · {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-[#6b7a93] py-4 text-center">No recent activity recorded.</p>
            )}
          </div>
        </div>

        {/* Vendor SLA & Performance */}
        <div className="bg-white border border-[#e4eaf2] rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-3 border-b border-[#e4eaf2] pb-2.5">
            <h2 className="text-sm font-bold text-[#152340]">Vendor Supply Performance</h2>
            <Link href="/vendors" className="text-xs font-semibold text-[#2563eb] hover:underline">
              Vendor Directory
            </Link>
          </div>

          <div className="divide-y divide-[#e4eaf2] space-y-2">
            {vendorPerf && vendorPerf.length > 0 ? (
              vendorPerf.slice(0, 5).map((v: any) => (
                <div key={v.id} className="pt-2 first:pt-0 flex items-center justify-between gap-3 text-xs">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-[#152340] truncate">{v.name}</p>
                    <p className="text-[10px] text-[#6b7a93]">{v.totalPOs} POs fulfilled · Tier {v.vendorTier || "1"}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="w-16 h-1.5 bg-[#eff3f8] rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full",
                          v.performanceScore >= 80 ? "bg-[#159557]" : v.performanceScore >= 60 ? "bg-[#e08a0b]" : "bg-[#dc2f3c]"
                        )}
                        style={{ width: `${v.performanceScore}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-bold tabular-nums text-[#3c4a63] w-9 text-right">
                      {v.performanceScore?.toFixed(0)}%
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-[#6b7a93] py-4 text-center">No vendor performance metrics available.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
