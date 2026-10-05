import React, { useState } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { usePurchaseOrders, useDeliveries, useVendors } from "@/lib/api-hooks";
import * as api from "@/lib/api";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  Truck, ShoppingCart, CheckCircle2, Clock, Upload, ShieldCheck, AlertCircle, Lock,
  FileText, IndianRupee, ArrowRight, Building2, Eye, MessageSquare, AlertTriangle, ShieldAlert,
  FileCheck, BarChart3, Award, TrendingUp, TrendingDown, Minus, Star, Loader2,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend,
} from "recharts";

/* ─── R-11: Vendor PO Summary Report ─────────────────────────────────────── */
function VendorPOSummaryReport() {
  const { data: rows = [] } = useQuery({
    queryKey: ["/reports/vendor-po-summary"],
    queryFn: () => api.getVendorPOSummaryReport(),
  });

  const totalValue = rows.reduce((s: number, r: any) => s + r.totalValue, 0);
  const ackRate = rows.length > 0 ? Math.round((rows.filter((r: any) => r.ackStatus === "acknowledged").length / rows.length) * 100) : 0;
  const onTimeDel = rows.filter((r: any) => r.poStatus === "delivered" && r.actualDelivery <= r.expectedDelivery).length;
  const pendingCount = rows.filter((r: any) => r.poStatus !== "delivered" && r.poStatus !== "cancelled").length;

  const STATUS_STYLE: Record<string, string> = {
    delivered: "bg-emerald-100 text-emerald-700",
    pending_dispatch: "bg-amber-100 text-amber-700",
    active: "bg-blue-100 text-blue-700",
    cancelled: "bg-slate-100 text-slate-600",
  };
  const PAY_STYLE: Record<string, string> = {
    paid: "bg-emerald-100 text-emerald-700",
    partial: "bg-amber-100 text-amber-700",
    pending: "bg-slate-100 text-slate-600",
  };

  return (
    <div className="space-y-5">
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
        <strong>R-11: Vendor PO Summary Report</strong> — Self-service view of all POs allocated to your firm with acknowledgement, dispatch, fulfilment, and payment status.
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Total POs</p>
          <p className="text-3xl font-bold mt-1 text-blue-600">{rows.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">₹{(totalValue / 100000).toFixed(2)} L total value</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Ack Rate</p>
          <p className={`text-3xl font-bold mt-1 ${ackRate >= 95 ? "text-emerald-600" : ackRate >= 80 ? "text-amber-600" : "text-red-600"}`}>{ackRate}%</p>
          <p className="text-xs text-muted-foreground mt-0.5">Target ≥95%</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">On-time Deliveries</p>
          <p className="text-3xl font-bold mt-1 text-emerald-600">{onTimeDel}</p>
          <p className="text-xs text-muted-foreground mt-0.5">of {rows.filter((r: any) => r.poStatus === "delivered").length} delivered</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Pending Dispatch</p>
          <p className="text-3xl font-bold mt-1 text-amber-600">{pendingCount}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Require action</p>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader className="pb-2 bg-muted/20 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Purchase Order Register — Vendor Self-View (R-11)
            </CardTitle>
            <Badge variant="outline" className="text-xs">Rule: Acknowledge within 7 calendar days</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/30 border-b">
                <tr>
                  {["PO Number","PO Date","Equipment","Qty","PO Value (₹)","Consignee","7-Day Ack","Ack Date","Expected Delivery","Actual Delivery","PO Status","Payment","Cert Uploaded","Fulfilment %"].map(h => (
                    <th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((r: any) => (
                  <tr key={r.id} className="hover:bg-muted/20">
                    <td className="px-3 py-2.5 font-mono font-semibold text-primary whitespace-nowrap">{r.poNumber}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">{new Date(r.poDate).toLocaleDateString("en-IN")}</td>
                    <td className="px-3 py-2.5 font-medium max-w-[180px]">{r.equipmentName}</td>
                    <td className="px-3 py-2.5 text-right font-bold">{r.quantity}</td>
                    <td className="px-3 py-2.5 text-right font-mono font-semibold">₹{r.totalValue.toLocaleString("en-IN")}</td>
                    <td className="px-3 py-2.5 text-muted-foreground max-w-[140px]">{r.consignee}</td>
                    <td className="px-3 py-2.5">
                      <Badge className={`text-[10px] border-0 ${r.ackStatus === "acknowledged" ? "bg-emerald-100 text-emerald-700" : r.ackStatus === "overdue" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                        {r.ackStatus === "acknowledged" ? "✓ Acknowledged" : r.ackStatus === "overdue" ? "⚠ Overdue" : "Pending"}
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">{r.ackDate ? new Date(r.ackDate).toLocaleDateString("en-IN") : "—"}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">{new Date(r.expectedDelivery).toLocaleDateString("en-IN")}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">{r.actualDelivery ? new Date(r.actualDelivery).toLocaleDateString("en-IN") : "—"}</td>
                    <td className="px-3 py-2.5">
                      <Badge className={`text-[10px] border-0 ${STATUS_STYLE[r.poStatus] ?? "bg-slate-100 text-slate-600"}`}>
                        {r.poStatus.replace("_", " ")}
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge className={`text-[10px] border-0 ${PAY_STYLE[r.paymentStatus] ?? ""}`}>
                        {r.paymentStatus}
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {r.certUploaded ? <span className="text-emerald-700 font-semibold">✓ Yes</span> : <span className="text-amber-700">Pending</span>}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <div className="flex items-center gap-1.5">
                        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${r.fulfillmentPct}%` }} />
                        </div>
                        <span className="font-semibold tabular-nums">{r.fulfillmentPct}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr><td colSpan={14} className="px-3 py-8 text-center text-muted-foreground">No PO records found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ─── R-12: Vendor Delivery & Certificate Status Report ───────────────────── */
function VendorCertStatusReport() {
  const { data: rows = [] } = useQuery({
    queryKey: ["/reports/vendor-cert-status"],
    queryFn: () => api.getVendorCertStatusReport(),
  });

  const delivered = rows.filter((r: any) => r.actualDelivery).length;
  const onTime = rows.filter((r: any) => r.isOnTime).length;
  const onTimeRate = delivered > 0 ? Math.round((onTime / delivered) * 100) : 0;
  const certUploaded = rows.filter((r: any) => r.certUploaded).length;
  const certCompliance = delivered > 0 ? Math.round((certUploaded / delivered) * 100) : 0;
  const certOverdue = rows.filter((r: any) => r.certOverdue).length;

  const QA_STYLE: Record<string, string> = {
    accepted: "bg-emerald-100 text-emerald-700",
    conditional: "bg-amber-100 text-amber-700",
    rejected: "bg-red-100 text-red-700",
    pending: "bg-slate-100 text-slate-600",
  };

  return (
    <div className="space-y-5">
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
        <strong>R-12: Vendor Delivery &amp; Certificate Status Report</strong> — Track delivery timelines, QA inspection outcomes, and DCC certificate upload compliance for all your consignments.
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Consignments</p>
          <p className="text-3xl font-bold mt-1 text-blue-600">{rows.length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">On-Time Delivery Rate</p>
          <p className={`text-3xl font-bold mt-1 ${onTimeRate >= 85 ? "text-emerald-600" : onTimeRate >= 70 ? "text-amber-600" : "text-red-600"}`}>{delivered > 0 ? `${onTimeRate}%` : "—"}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Target ≥85%</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">DCC Upload Compliance</p>
          <p className={`text-3xl font-bold mt-1 ${certCompliance >= 90 ? "text-emerald-600" : certCompliance >= 75 ? "text-amber-600" : "text-red-600"}`}>{delivered > 0 ? `${certCompliance}%` : "—"}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Target ≥90% · within 7 working days</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">DCC Overdue</p>
          <p className={`text-3xl font-bold mt-1 ${certOverdue === 0 ? "text-emerald-600" : "text-red-600"}`}>{certOverdue}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Immediate action required</p>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader className="pb-2 bg-muted/20 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Delivery &amp; DCC Compliance Register (R-12)
            </CardTitle>
            <Badge variant="outline" className="text-xs">SLA: DCC upload within 7 working days of delivery</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/30 border-b">
                <tr>
                  {["Tracking ID","PO Number","Equipment","Consignee","Dispatch Date","Expected Delivery","Actual Delivery","On-Time?","Delay (Days)","QA Decision","Cert Uploaded","Cert Date","Cert Deadline","Status"].map(h => (
                    <th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((r: any) => (
                  <tr key={r.id} className="hover:bg-muted/20">
                    <td className="px-3 py-2.5 font-mono font-semibold text-primary">{r.deliveryTrackingId}</td>
                    <td className="px-3 py-2.5 font-mono text-muted-foreground">{r.poNumber}</td>
                    <td className="px-3 py-2.5 font-medium max-w-[160px]">{r.equipmentName}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{r.consignee}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">{r.dispatchDate ? new Date(r.dispatchDate).toLocaleDateString("en-IN") : "—"}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">{new Date(r.expectedDelivery).toLocaleDateString("en-IN")}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">{r.actualDelivery ? new Date(r.actualDelivery).toLocaleDateString("en-IN") : "—"}</td>
                    <td className="px-3 py-2.5 text-center">
                      {!r.actualDelivery ? <span className="text-slate-500">—</span> :
                        r.isOnTime ? <span className="text-emerald-700 font-semibold">✓ Yes</span> :
                        <span className="text-red-600 font-semibold">✗ Late</span>}
                    </td>
                    <td className="px-3 py-2.5 text-right font-bold">
                      {r.delayDays > 0 ? <span className="text-red-600">+{r.delayDays}d LD</span> : r.actualDelivery ? <span className="text-emerald-700">On Time</span> : <span className="text-slate-400">Pending</span>}
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge className={`text-[10px] border-0 ${QA_STYLE[r.qaDecision] ?? ""}`}>
                        {r.qaDecision.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {r.certUploaded ? <span className="text-emerald-700 font-semibold">✓ Uploaded</span> :
                        r.certOverdue ? <span className="text-red-600 font-bold">⚠ Overdue</span> :
                        <span className="text-amber-700">Pending</span>}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">{r.certDate ? new Date(r.certDate).toLocaleDateString("en-IN") : "—"}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">{r.certUploadDeadline ? new Date(r.certUploadDeadline).toLocaleDateString("en-IN") : "—"}</td>
                    <td className="px-3 py-2.5">
                      {r.certOverdue ? (
                        <Badge className="text-[10px] border-0 bg-red-100 text-red-700">DCC Overdue ({r.certOverdueDays}d)</Badge>
                      ) : r.certUploaded ? (
                        <Badge className="text-[10px] border-0 bg-emerald-100 text-emerald-700">Complete</Badge>
                      ) : r.actualDelivery ? (
                        <Badge className="text-[10px] border-0 bg-amber-100 text-amber-700">DCC Pending</Badge>
                      ) : (
                        <Badge className="text-[10px] border-0 bg-slate-100 text-slate-600">Awaiting Delivery</Badge>
                      )}
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr><td colSpan={14} className="px-3 py-8 text-center text-muted-foreground">No delivery records found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ─── R-13: Vendor Performance Self-View Report ───────────────────────────── */
function VendorSelfViewReport({ currentVendor }: { currentVendor: any }) {
  const { data: rows = [] } = useQuery({
    queryKey: ["/reports/vendor-self-score"],
    queryFn: () => api.getVendorSelfScoreReport(),
  });

  const activeRows = rows.filter((r: any) => r.totalPOs > 0 || r.totalDeliveries > 0);
  const latestRow = activeRows[activeRows.length - 1] as any;
  const overallScoreLatest = latestRow?.overallScore ?? 0;
  const weightedScore = currentVendor?.performanceScore ?? overallScoreLatest;

  const scoreColor = (s: number) => s >= 80 ? "text-emerald-600" : s >= 65 ? "text-amber-600" : "text-red-600";
  const scoreBg = (s: number) => s >= 80 ? "bg-emerald-50 border-emerald-200" : s >= 65 ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200";

  const scoreChartData = rows.map((r: any) => ({
    period: r.period,
    Score: r.overallScore > 0 ? r.overallScore : null,
    "On-Time %": r.onTimePct > 0 || r.totalDeliveries > 0 ? r.onTimePct : null,
    "QA Pass %": r.qaFirstPassPct > 0 || r.totalDeliveries > 0 ? r.qaFirstPassPct : null,
  }));

  return (
    <div className="space-y-5">
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
        <strong>R-13: Vendor Performance Self-View Report</strong> — Monthly period-wise procurement scorecard. Weighted formula: On-time Delivery 40% + QA First-Pass 35% + Compliance 25%. Target: ≥80/100.
      </div>

      {/* Score Summary Banner */}
      <div className={`flex items-center justify-between gap-6 p-5 rounded-xl border ${scoreBg(weightedScore)}`}>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Overall Vendor Performance Score (KPI-10)</p>
          <p className={`text-5xl font-black ${scoreColor(weightedScore)}`}>{weightedScore}<span className="text-xl font-semibold text-muted-foreground">/100</span></p>
          <p className="text-xs text-muted-foreground mt-1">
            {weightedScore >= 80 ? "✓ Meeting target (≥80)" : "⚠ Below target — improvement required"}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-6 text-center">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase font-semibold">On-time Delivery</p>
            <p className={`text-2xl font-bold mt-0.5 ${scoreColor(currentVendor?.onTimeDeliveryRate ?? 0)}`}>{currentVendor?.onTimeDeliveryRate ?? "—"}%</p>
            <p className="text-[10px] text-muted-foreground">Weight: 40%</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase font-semibold">QA First-Pass</p>
            <p className={`text-2xl font-bold mt-0.5 ${scoreColor(currentVendor?.qaPassRate ?? 0)}`}>{currentVendor?.qaPassRate ?? "—"}%</p>
            <p className="text-[10px] text-muted-foreground">Weight: 35%</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase font-semibold">Compliance</p>
            <p className={`text-2xl font-bold mt-0.5 ${scoreColor(88)}`}>88%</p>
            <p className="text-[10px] text-muted-foreground">Weight: 25%</p>
          </div>
        </div>
      </div>

      {/* Score Trend Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            6-Month Performance Trend (R-13)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={scoreChartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="period" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
              <Tooltip />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="Score" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} connectNulls={false} />
              <Line type="monotone" dataKey="On-Time %" stroke="#3b82f6" strokeWidth={1.5} dot={{ r: 2 }} strokeDasharray="4 2" connectNulls={false} />
              <Line type="monotone" dataKey="QA Pass %" stroke="#8b5cf6" strokeWidth={1.5} dot={{ r: 2 }} strokeDasharray="4 2" connectNulls={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Period Scorecard Table */}
      <Card>
        <CardHeader className="pb-2 bg-muted/20 border-b">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Period-wise Detailed Scorecard
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/30 border-b">
                <tr>
                  {["Period","Total POs","Deliveries","On-Time","Late","On-Time %","Avg Delay","QA First-Pass","QA Conditional","QA Rejected","QA Pass %","Discrepancies","Avg Rectif. Days","DCC On-Time","DCC Overdue","Score /100"].map(h => (
                    <th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((r: any) => (
                  <tr key={r.period} className="hover:bg-muted/20">
                    <td className="px-3 py-2.5 font-semibold">{r.period}</td>
                    <td className="px-3 py-2.5 text-right font-bold">{r.totalPOs}</td>
                    <td className="px-3 py-2.5 text-right font-bold">{r.totalDeliveries}</td>
                    <td className="px-3 py-2.5 text-right text-emerald-700 font-semibold">{r.onTimeCount}</td>
                    <td className="px-3 py-2.5 text-right text-red-600 font-semibold">{r.lateCount}</td>
                    <td className="px-3 py-2.5 text-right font-bold">
                      {r.totalDeliveries > 0 ? <span className={scoreColor(r.onTimePct)}>{r.onTimePct}%</span> : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-right">{r.avgDelayDays > 0 ? `${r.avgDelayDays}d` : "—"}</td>
                    <td className="px-3 py-2.5 text-right text-emerald-700">{r.qaFirstPassCount}</td>
                    <td className="px-3 py-2.5 text-right text-amber-700">{r.qaConditionalCount}</td>
                    <td className="px-3 py-2.5 text-right text-red-600">{r.qaRejectedCount}</td>
                    <td className="px-3 py-2.5 text-right font-bold">
                      {r.totalDeliveries > 0 ? <span className={scoreColor(r.qaFirstPassPct)}>{r.qaFirstPassPct}%</span> : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-right">{r.discrepancyCount}</td>
                    <td className="px-3 py-2.5 text-right">{r.avgRectificationDays > 0 ? `${r.avgRectificationDays}d` : "—"}</td>
                    <td className="px-3 py-2.5 text-right text-emerald-700">{r.dccUploadedOnTime}</td>
                    <td className="px-3 py-2.5 text-right text-red-600">{r.dccOverdueCount}</td>
                    <td className="px-3 py-2.5 text-right">
                      {r.overallScore > 0 ? (
                        <span className={`font-bold text-sm ${scoreColor(r.overallScore)}`}>{r.overallScore}</span>
                      ) : <span className="text-muted-foreground">—</span>}
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


export default function VendorPortal() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: pos = [], isLoading: posLoading } = usePurchaseOrders();
  const { data: deliveries = [], isLoading: delLoading } = useDeliveries();
  const { data: vendors = [] } = useVendors();

  // Vendor Resolution: if vendor user, match by user profile, else allow selection
  const isVendorUser = user?.role === "vendor";
  const matchedVendorUser = vendors.find((v: any) =>
    (user?.vendorId && (String(v.id) === String(user.vendorId) || String(v._id) === String(user.vendorId))) ||
    (user?.vendorCode && v.vendorCode === user.vendorCode) ||
    (user?.vendorName && v.name?.toLowerCase() === user.vendorName.toLowerCase()) ||
    (user?.facilityName && v.name?.toLowerCase().includes(user.facilityName.toLowerCase())) ||
    (user?.email && v.contactEmail?.toLowerCase() === user.email.toLowerCase()) ||
    (user?.username && user.username.toLowerCase().includes("philips") && v.name?.toLowerCase().includes("philips")) ||
    (user?.username && (user.username.toLowerCase().includes("bpl") || user.username.toLowerCase() === "vendor") && (v.name?.toLowerCase().includes("bpl") || v.vendorCode === "VND-0001")) ||
    (user?.fullName && v.contactPerson && v.contactPerson.toLowerCase() === user.fullName.toLowerCase())
  );

  const [selectedVendorId, setSelectedVendorId] = useState<string>("all");

  const activeVendor = isVendorUser
    ? (matchedVendorUser || vendors[0])
    : (selectedVendorId !== "all" ? vendors.find((v: any) => String(v.id) === String(selectedVendorId) || String(v._id) === String(selectedVendorId)) : null);

  const currentVendor = activeVendor || vendors[0];

  const vendorPOs = pos.filter((p: any) => {
    if (activeVendor) {
      const vId = activeVendor.id || activeVendor._id;
      return (
        (vId && String(p.vendorId) === String(vId)) ||
        (activeVendor.name && p.vendorName && p.vendorName.toLowerCase() === activeVendor.name.toLowerCase()) ||
        (activeVendor.vendorCode && p.vendorCode && p.vendorCode.toLowerCase() === activeVendor.vendorCode.toLowerCase())
      );
    }
    return true;
  });

  const vendorDeliveries = deliveries.filter((d: any) => {
    if (activeVendor) {
      const vId = activeVendor.id || activeVendor._id;
      return (
        (vId && String(d.vendorId) === String(vId)) ||
        (activeVendor.name && d.vendorName && d.vendorName.toLowerCase() === activeVendor.name.toLowerCase()) ||
        (d.purchaseOrderId && vendorPOs.some((p: any) => String(p.id) === String(d.purchaseOrderId) || String(p._id) === String(d.purchaseOrderId)))
      );
    }
    return true;
  });

  const [activeTab, setActiveTab] = useState("pos");

  // User permission for payment release (admin, internal procurement, and demo vendor testing)
  const canReleasePayment =
    user?.role === "admin" ||
    user?.role === "tgmsidc_user" ||
    user?.role === "executive_director" ||
    isVendorUser;

  // Modals state
  const [ackModal, setAckModal] = useState<any | null>(null);
  const [ackRemarks, setAckRemarks] = useState("Committed to deliver equipment within statutory 45 days supply timeline.");
  const [dispatchModal, setDispatchModal] = useState<any | null>(null);
  const [dccModal, setDccModal] = useState<any | null>(null);
  const [grievanceModal, setGrievanceModal] = useState(false);

  // New Modals for Full Lifecycle Flow
  const [qaModal, setQaModal] = useState<any | null>(null);
  const [qaForm, setQaForm] = useState({
    inspectorName: "Er. K. Suresh",
    committeeName: "Institutional Biomedical Technical Committee",
    qaDecision: "accepted" as "accepted" | "conditional" | "rejected",
    qaComplianceScore: 100,
    qaNotes: "Consignment physically verified, tested against specification sheet, electrical safety certified, and user training completed satisfactorily.",
    rectificationDueDate: "",
  });
  const [qaSubmitting, setQaSubmitting] = useState(false);

  const [docModal, setDocModal] = useState<any | null>(null);
  const [docForm, setDocForm] = useState({
    docType: "dcc" as "dcc" | "installation" | "qa" | "invoice",
    filename: "Signed_DCC_Certificate.pdf",
    officerName: "Dr. K. Srinivas",
    notes: "Original signed document verified against statutory procurement checklist.",
  });
  const [docSubmitting, setDocSubmitting] = useState(false);

  const [payModal, setPayModal] = useState<{ po: any; tranche: "tranche1_90" | "tranche2_10" } | null>(null);
  const [payForm, setPayForm] = useState({
    paymentReference: "",
    paymentDate: new Date().toISOString().split("T")[0],
    paidBy: user?.fullName || "Finance & Accounts Wing",
    remarks: "",
  });
  const [paySubmitting, setPaySubmitting] = useState(false);

  const [expectedDispatchDate, setExpectedDispatchDate] = useState("");
  const [dispatchForm, setDispatchForm] = useState({
    transporterName: "",
    transporterVehicle: "",
    lrGrNumber: "",
    challanNumber: "",
    invoiceNumber: "",
    dispatchedQty: 0,
    serialNumbers: "",
  });

  // DCC Upload Form (Process Book §8 Step 9)
  const [dccForm, setDccForm] = useState({
    filename: "Signed_Stamped_DCC.pdf",
    officerName: "Dr. K. Srinivas",
    officerDesignation: "Medical Superintendent",
    certificateDate: new Date().toISOString().split("T")[0],
    comments: "Original DCC signed and stamped by consignee receiving officer at hospital site.",
  });
  const [dccSubmitting, setDccSubmitting] = useState(false);

  // Vendor Grievances list (Process Book §12 F-26)
  const [grievances, setGrievances] = useState([
    {
      id: "GRV-001",
      poNumber: "PO-2526-0002",
      category: "Site Readiness",
      subject: "ICU site electrical connection pending at Nizamabad DH",
      status: "under_review",
      createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
      response: "Biomedical engineer dispatched to coordinate electrical supply.",
    }
  ]);
  const [newGrievance, setNewGrievance] = useState({
    poNumber: "",
    category: "Site Readiness",
    subject: "",
    description: "",
  });
  const [ackSubmitting, setAckSubmitting] = useState(false);
  const [dispatchSubmitting, setDispatchSubmitting] = useState(false);

  async function handleAcknowledge() {
    if (!ackModal) return;
    setAckSubmitting(true);
    try {
      await api.acknowledgePurchaseOrder(ackModal.id, {
        expectedDispatchDate: expectedDispatchDate ? new Date(expectedDispatchDate) : undefined,
        remarks: ackRemarks || `Committed dispatch by ${expectedDispatchDate || "standard supply timeline"}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/purchase-orders"] });
      setAckModal(null);
      toast({ title: "PO Acknowledged", description: "Your dispatch timeline has been recorded and transmitted to Procurement Division." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to acknowledge PO", variant: "destructive" });
    } finally {
      setAckSubmitting(false);
    }
  }

  async function handleDispatch() {
    if (!dispatchModal) return;
    setDispatchSubmitting(true);
    try {
      await api.createDelivery({
        purchaseOrderId: dispatchModal.id,
        vendorId: dispatchModal.vendorId,
        facilityId: dispatchModal.consignees?.[0]?.institutionId || dispatchModal.indentId,
        quantity: dispatchForm.dispatchedQty || dispatchModal.quantity,
        transporterName: dispatchForm.transporterName || "VRL Logistics Express",
        transporterVehicle: dispatchForm.transporterVehicle || "TS 09 UB 5678",
        lrGrNumber: dispatchForm.lrGrNumber || `LR-TS-${Date.now().toString().slice(-6)}`,
        challanNumber: dispatchForm.challanNumber || `DC/${dispatchModal.poNumber?.slice(-4) || "001"}/${Date.now().toString().slice(-4)}`,
        invoiceNumber: dispatchForm.invoiceNumber || `INV/2025-26/${Date.now().toString().slice(-4)}`,
        serialNumbers: dispatchForm.serialNumbers ? dispatchForm.serialNumbers.split(",").map(s => s.trim()) : [],
        dispatchDate: new Date(),
        status: "dispatched",
      });
      queryClient.invalidateQueries({ queryKey: ["/deliveries"] });
      queryClient.invalidateQueries({ queryKey: ["/purchase-orders"] });
      setDispatchModal(null);
      toast({ title: "Consignment Dispatched", description: "Dispatch details transmitted to hospital consignee and Procurement Division." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to record dispatch", variant: "destructive" });
    } finally {
      setDispatchSubmitting(false);
    }
  }

  async function handleUploadDCC(e: React.FormEvent) {
    e.preventDefault();
    if (!dccModal) return;
    setDccSubmitting(true);
    try {
      await api.uploadDCC(dccModal.id, dccForm);
      queryClient.invalidateQueries({ queryKey: ["/deliveries"] });
      queryClient.invalidateQueries({ queryKey: ["/purchase-orders"] });
      setDccModal(null);
      toast({
        title: "DCC Certificate Uploaded",
        description: `Delivery Completion Certificate verified for ${dccModal.deliveryTrackingId}.`,
      });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to upload DCC", variant: "destructive" });
    } finally {
      setDccSubmitting(false);
    }
  }

  async function handleRecordQA(e: React.FormEvent) {
    e.preventDefault();
    if (!qaModal) return;
    setQaSubmitting(true);
    try {
      await api.recordQAInspection(qaModal.id, qaForm);
      queryClient.invalidateQueries({ queryKey: ["/deliveries"] });
      queryClient.invalidateQueries({ queryKey: ["/purchase-orders"] });
      setQaModal(null);
      toast({
        title: "QA Inspection Completed",
        description: `Consignment inspection marked as ${qaForm.qaDecision.toUpperCase()}.`,
      });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to record QA inspection", variant: "destructive" });
    } finally {
      setQaSubmitting(false);
    }
  }

  async function handleUploadDoc(e: React.FormEvent) {
    e.preventDefault();
    if (!docModal) return;
    setDocSubmitting(true);
    try {
      await api.uploadDeliveryDocs(docModal.id, docForm);
      queryClient.invalidateQueries({ queryKey: ["/deliveries"] });
      queryClient.invalidateQueries({ queryKey: ["/purchase-orders"] });
      setDocModal(null);
      toast({
        title: "Document Uploaded",
        description: `[${docForm.docType.toUpperCase()}] uploaded and verified for ${docModal.deliveryTrackingId}.`,
      });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to upload document", variant: "destructive" });
    } finally {
      setDocSubmitting(false);
    }
  }

  async function handleReleasePayment(e: React.FormEvent) {
    e.preventDefault();
    if (!payModal) return;
    setPaySubmitting(true);
    try {
      await api.releasePOPayment(payModal.po.id, {
        tranche: payModal.tranche,
        paymentReference: payForm.paymentReference || `UTR-${Date.now().toString().slice(-8)}`,
        paymentDate: payForm.paymentDate,
        paidBy: payForm.paidBy,
        remarks: payForm.remarks,
      });
      queryClient.invalidateQueries({ queryKey: ["/purchase-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/deliveries"] });
      setPayModal(null);
      toast({
        title: "Payment Released Successfully",
        description: payModal.tranche === "tranche1_90"
          ? `90% Payment released for ${payModal.po.poNumber} against verified documents.`
          : `Final 10% retention released for ${payModal.po.poNumber} post 3-months hospital usage.`,
      });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to release payment", variant: "destructive" });
    } finally {
      setPaySubmitting(false);
    }
  }

  async function handleConfirmReceipt(d: any) {
    try {
      await api.updateDelivery(d.id, {
        status: "delivered",
        deliveredDate: new Date(),
        receivedBy: user?.fullName || "Consignee Medical Superintendent",
      });
      queryClient.invalidateQueries({ queryKey: ["/deliveries"] });
      queryClient.invalidateQueries({ queryKey: ["/purchase-orders"] });
      toast({
        title: "Consignment Received",
        description: `Consignment ${d.deliveryTrackingId} confirmed delivered at hospital. QA inspection can now proceed.`,
      });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to confirm receipt", variant: "destructive" });
    }
  }

  function handleCreateGrievance(e: React.FormEvent) {
    e.preventDefault();
    if (!newGrievance.subject.trim()) return;
    const ticket = {
      id: `GRV-${String(grievances.length + 1).padStart(3, "0")}`,
      poNumber: newGrievance.poNumber || "General Inquiry",
      category: newGrievance.category,
      subject: newGrievance.subject,
      status: "open",
      createdAt: new Date().toISOString(),
      response: "Awaiting Procurement Officer response (SLA: 3 working days)",
    };
    setGrievances([ticket, ...grievances]);
    setGrievanceModal(false);
    setNewGrievance({ poNumber: "", category: "Site Readiness", subject: "", description: "" });
    toast({ title: "Ticket Submitted", description: `Query ${ticket.id} registered under 3-day SLA response policy.` });
  }

  const formatINR = (n: number) => `₹${(n || 0).toLocaleString("en-IN")}`;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* ── Page Header (neoInt Style) ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#e4eaf2] pb-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#152340]">
              Vendor Procurement &amp; Dispatch Desk
            </h1>
            <span className="neo-chip grn">Empanelled Supplier</span>
            <span className="neo-chip blu">{currentVendor?.vendorCode || "VND-0001"}</span>
          </div>
          <p className="text-xs text-[#6b7a93] mt-0.5">
            Empanelled Supplier: <span className="font-semibold text-[#152340]">{currentVendor?.name || "Empanelled Vendor"}</span>
            {" · "}Tier: <span className="font-semibold text-[#2563eb]">{currentVendor?.vendorTier || "L1 (Approved)"}</span>
          </p>
        </div>

        {/* Switch Vendor View for Admin / Internal Users */}
        {!isVendorUser && (
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <span className="text-[11px] font-bold text-[#6b7a93] uppercase tracking-wider whitespace-nowrap">Switch Vendor:</span>
            <Select value={selectedVendorId} onValueChange={setSelectedVendorId}>
              <SelectTrigger className="w-[280px] h-[32px] text-xs bg-white border-[#e4eaf2] rounded-md shadow-xs">
                <SelectValue placeholder="All Empanelled Vendors" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Empanelled Vendors ({vendors.length})</SelectItem>
                {vendors.map((v: any) => (
                  <SelectItem key={v.id || v._id} value={v.id || v._id}>
                    {v.name} ({v.vendorCode || "VND"})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* ── KPI Ribbon ── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="neo-kpi-card">
          <span className="text-[10px] font-bold text-[#6b7a93] uppercase tracking-wider block">
            Allocated POs
          </span>
          <span className="text-2xl font-bold text-[#152340] tabular-nums mt-1 block">
            {vendorPOs.length}
          </span>
          <span className="text-[10.5px] text-[#6b7a93] mt-1 block">
            {vendorPOs.filter((p: any) => !p.vendorAcknowledged).length} Ack Pending
          </span>
        </div>

        <div className="neo-kpi-card">
          <span className="text-[10px] font-bold text-[#2563eb] uppercase tracking-wider block">
            Consignments
          </span>
          <span className="text-2xl font-bold text-[#2563eb] tabular-nums mt-1 block">
            {vendorDeliveries.length}
          </span>
          <span className="text-[10.5px] text-[#2563eb] font-semibold mt-1 block">
            {vendorDeliveries.filter((d: any) => d.status === "dispatched").length} In-Transit
          </span>
        </div>

        <div className="neo-kpi-card">
          <span className="text-[10px] font-bold text-[#159557] uppercase tracking-wider block">
            On-Time Supply Rate
          </span>
          <span className="text-2xl font-bold text-[#159557] tabular-nums mt-1 block">
            {currentVendor?.onTimeDeliveryRate || 92}%
          </span>
          <span className="text-[10.5px] text-[#159557] font-semibold mt-1 block">Target ≥85%</span>
        </div>

        <div className="neo-kpi-card">
          <span className="text-[10px] font-bold text-[#0284c7] uppercase tracking-wider block">
            QA First-Pass Rate
          </span>
          <span className="text-2xl font-bold text-[#0284c7] tabular-nums mt-1 block">
            {currentVendor?.qaPassRate || 95}%
          </span>
          <span className="text-[10.5px] text-[#0284c7] font-semibold mt-1 block">High compliance</span>
        </div>

        <div className="neo-kpi-card">
          <span className="text-[10px] font-bold text-[#6d42d9] uppercase tracking-wider block">
            Obligation Value
          </span>
          <span className="text-xl font-bold text-[#6d42d9] tabular-nums mt-1 block">
            {formatINR(vendorPOs.reduce((acc: number, p: any) => acc + (p.totalAmount || 0), 0))}
          </span>
          <span className="text-[10.5px] text-[#6b7a93] mt-1 block">Total Contract Value</span>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-white border border-[#e4eaf2] p-1 rounded-lg h-auto flex flex-wrap gap-1 shadow-xs">
          <TabsTrigger value="pos" className="gap-2 text-xs font-semibold data-[state=active]:bg-[#186812] data-[state=active]:text-white">
            <ShoppingCart className="h-4 w-4" /> Allocated Purchase Orders ({vendorPOs.length})
          </TabsTrigger>
          <TabsTrigger value="deliveries" className="gap-2 text-xs font-semibold data-[state=active]:bg-[#186812] data-[state=active]:text-white">
            <Truck className="h-4 w-4" /> Consignments &amp; DCC Compliance ({vendorDeliveries.length})
          </TabsTrigger>
          <TabsTrigger value="payments" className="gap-2 text-xs font-semibold data-[state=active]:bg-[#186812] data-[state=active]:text-white">
            <IndianRupee className="h-4 w-4" /> Statutory Payments (90% &amp; 10% Tranches)
          </TabsTrigger>
          <TabsTrigger value="grievances" className="gap-2 text-xs font-semibold data-[state=active]:bg-[#186812] data-[state=active]:text-white">
            <MessageSquare className="h-4 w-4" /> Clarifications &amp; Grievances ({grievances.length})
          </TabsTrigger>
          <TabsTrigger value="r11_po_summary" className="gap-2 text-xs font-semibold data-[state=active]:bg-[#186812] data-[state=active]:text-white">
            <FileText className="h-4 w-4" /> R-11: PO Summary Report
          </TabsTrigger>
          <TabsTrigger value="r12_cert_status" className="gap-2 text-xs font-semibold data-[state=active]:bg-[#186812] data-[state=active]:text-white">
            <FileCheck className="h-4 w-4" /> R-12: Delivery &amp; Certificate Status
          </TabsTrigger>
          <TabsTrigger value="r13_self_view" className="gap-2 text-xs font-semibold data-[state=active]:bg-[#186812] data-[state=active]:text-white">
            <Award className="h-4 w-4" /> R-13: Performance Self-View
          </TabsTrigger>
        </TabsList>

        {/* POs Tab */}
        <TabsContent value="pos" className="space-y-4">
          <div className="bg-white border border-[#e4eaf2] rounded-xl shadow-xs overflow-hidden">
            <div className="p-3 border-b border-[#e4eaf2] bg-[#f8fafc] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-[#152340]">Active Purchase Orders</h3>
                <p className="text-xs text-[#6b7a93]">Mandatory sequence: Vendor must acknowledge PO within 7 days before dispatch can be initiated</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#f8fafc] border-b border-[#e4eaf2] text-[11px] font-bold text-[#6b7a93] uppercase tracking-wider">
                  <tr>
                    <th className="p-3 text-left">PO Number</th>
                    <th className="p-3 text-left">PO Date</th>
                    <th className="p-3 text-left">Equipment</th>
                    <th className="p-3 text-center">Ordered Qty</th>
                    <th className="p-3 text-right">PO Total Value</th>
                    <th className="p-3 text-left">Consignee Hospital</th>
                    <th className="p-3 text-center">Ack Status</th>
                    <th className="p-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e4eaf2]">
                  {vendorPOs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-[#6b7a93] text-sm">
                        No active purchase orders found.
                      </td>
                    </tr>
                  ) : (
                    vendorPOs.map((po: any) => {
                      const poDt = po.poDate ? new Date(po.poDate) : new Date(po.createdAt);
                      const daysOld = differenceInDays(new Date(), poDt);
                      const ackOverdue = !po.vendorAcknowledged && daysOld > 7;
                      const linkedDelivery = deliveries.find((d: any) => d.purchaseOrderId === po.id || d.poNumber === po.poNumber);
                      const isDeliveredOrDone = linkedDelivery?.status === "delivered" || linkedDelivery?.status === "accepted" || po.status === "delivered" || po.status === "completed";

                      return (
                        <tr key={po.id} className="hover:bg-[#f8fafc]/80 transition-colors">
                          <td className="p-3 font-mono text-xs font-bold text-[#2563eb]">{po.poNumber}</td>
                          <td className="p-3 text-xs text-[#6b7a93] whitespace-nowrap">
                            {format(poDt, "dd-MMM-yyyy")}
                          </td>
                          <td className="p-3 font-medium text-[#152340]">{po.equipmentName}</td>
                          <td className="p-3 text-center font-bold font-mono text-[#152340]">{po.quantity}</td>
                          <td className="p-3 text-right font-mono font-semibold text-[#152340]">
                            {formatINR(po.totalAmount)}
                          </td>
                          <td className="p-3 text-xs text-[#6b7a93]">
                            {po.deliveryAddress || po.consignees?.[0]?.institutionName || "State Hospital"}
                          </td>
                          <td className="p-3 text-center">
                            {po.vendorAcknowledged ? (
                              <div className="flex flex-col items-center gap-0.5">
                                <Badge className="bg-emerald-100 text-emerald-800 border-0 text-[10px] gap-1">
                                  <CheckCircle2 className="h-3 w-3" /> Acknowledged
                                </Badge>
                                {po.vendorExpectedDispatchDate && (
                                  <span className="text-[10px] text-[#6b7a93]">
                                    Dispatch: {format(new Date(po.vendorExpectedDispatchDate), "dd-MMM-yyyy")}
                                  </span>
                                )}
                              </div>
                            ) : ackOverdue ? (
                              <Badge className="bg-red-100 text-red-800 border-0 text-[10px] gap-1">
                                <AlertTriangle className="h-3 w-3" /> Overdue (&gt;7d)
                              </Badge>
                            ) : (
                              <Badge className="bg-amber-100 text-amber-800 border-0 text-[10px] gap-1">
                                <Clock className="h-3 w-3" /> Ack Pending ({7 - daysOld}d)
                              </Badge>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1.5 flex-wrap">
                              {!po.vendorAcknowledged ? (
                                <Button
                                  size="sm"
                                  className="h-7 text-xs font-medium shadow-xs"
                                  onClick={() => {
                                    setAckModal(po);
                                    const d = new Date();
                                    d.setDate(d.getDate() + 30);
                                    setExpectedDispatchDate(d.toISOString().split("T")[0]);
                                    setAckRemarks("Stock reserved at warehouse. Dispatch within stipulated SLA.");
                                  }}
                                >
                                  Acknowledge PO
                                </Button>
                              ) : isDeliveredOrDone ? (
                                <div className="flex items-center gap-1.5">
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Delivered
                                  </span>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs border-[#e4eaf2] text-[#152340] hover:bg-[#f8fafc]"
                                    onClick={() => setActiveTab("deliveries")}
                                  >
                                    View Consignment
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  size="sm"
                                  variant={linkedDelivery ? "outline" : "default"}
                                  className="h-7 text-xs gap-1"
                                  onClick={() => {
                                    const dcNo = `DC/${po.poNumber?.slice(-4) || "001"}/${Math.floor(1000 + Math.random() * 9000)}`;
                                    const invNo = `INV/${format(new Date(), "yyyy")}-${(Number(format(new Date(), "yy")) + 1)}/${Math.floor(100 + Math.random() * 900)}`;
                                    const lrNo = `LR-TS-${Math.floor(100000 + Math.random() * 900000)}`;
                                    const serials = Array.from({ length: po.quantity || 1 }, (_, i) => `${po.equipmentId || "EQ"}-${Math.floor(10000 + Math.random() * 90000)}-0${i + 1}`).join(", ");
                                    setDispatchModal(po);
                                    setDispatchForm({
                                      dispatchedQty: po.quantity || 1,
                                      challanNumber: dcNo,
                                      invoiceNumber: invNo,
                                      lrGrNumber: lrNo,
                                      transporterName: "Safechem Express Logistics",
                                      transporterVehicle: "TS 09 UB 5678",
                                      serialNumbers: serials,
                                    });
                                  }}
                                >
                                  <Truck className="h-3 w-3" />
                                  {linkedDelivery ? "Additional Dispatch" : "Initiate Delivery"}
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* Deliveries & DCC Compliance Tab */}
        <TabsContent value="deliveries" className="space-y-4">
          <div className="bg-white border border-[#e4eaf2] rounded-xl shadow-xs overflow-hidden">
            <div className="p-3 border-b border-[#e4eaf2] bg-[#f8fafc] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#152340] flex items-center gap-2">
                  <FileCheck className="h-4 w-4 text-emerald-700" /> Consignments, QA Inspection &amp; Document Compliance
                </h3>
                <p className="text-xs text-[#6b7a93]">
                  Track consignment dispatch, conduct technical QA checks, and upload DCC, Installation, and QA certificates required for 90% payment clearance.
                </p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#f8fafc] border-b border-[#e4eaf2] text-[11px] font-bold text-[#6b7a93] uppercase tracking-wider">
                  <tr>
                    <th className="p-3 text-left">Tracking ID</th>
                    <th className="p-3 text-left">PO Reference</th>
                    <th className="p-3 text-left">Equipment</th>
                    <th className="p-3 text-center">Qty</th>
                    <th className="p-3 text-left">Consignee Hospital</th>
                    <th className="p-3 text-center">QA Status</th>
                    <th className="p-3 text-center">Documents Status</th>
                    <th className="p-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e4eaf2]">
                  {vendorDeliveries.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-[#6b7a93] text-sm">
                        No delivery consignments registered yet. Click &quot;Initiate Delivery&quot; on an acknowledged PO.
                      </td>
                    </tr>
                  ) : (
                    vendorDeliveries.map((d: any) => {
                      const delDate = d.deliveredDate ? new Date(d.deliveredDate) : null;
                      const daysSinceDel = delDate ? differenceInDays(new Date(), delDate) : 0;
                      const isDelivered = d.status === "delivered" || d.status === "accepted";
                      const dccOverdue = isDelivered && !d.deliveryCertUploaded && daysSinceDel > 7;

                      return (
                        <React.Fragment key={d.id}>
                          <tr className="hover:bg-[#f8fafc]/80 transition-colors">
                            <td className="p-3 font-mono text-xs font-bold text-[#2563eb]">{d.deliveryTrackingId}</td>
                            <td className="p-3 font-mono text-xs text-[#6b7a93]">{d.poNumber}</td>
                            <td className="p-3 font-medium text-[#152340]">{d.equipmentName}</td>
                            <td className="p-3 text-center font-bold font-mono text-[#152340]">{d.quantity}</td>
                            <td className="p-3 text-xs text-[#6b7a93]">{d.facilityName}</td>
                            <td className="p-3 text-center">
                              {d.qaDecision === "accepted" ? (
                                <Badge className="bg-emerald-100 text-emerald-800 border-0 text-[10px]">✓ QA Passed</Badge>
                              ) : d.qaDecision === "conditional" ? (
                                <Badge className="bg-amber-100 text-amber-800 border-0 text-[10px]">⚠ Conditional</Badge>
                              ) : d.qaDecision === "rejected" ? (
                                <Badge className="bg-red-100 text-red-800 border-0 text-[10px]">✗ QA Rejected</Badge>
                              ) : (
                                <Badge className="bg-slate-100 text-slate-700 border-0 text-[10px]">Pending Inspection</Badge>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center gap-1 text-[11px]">
                                {d.deliveryCertUploaded ? (
                                  <Badge className="bg-emerald-100 text-emerald-800 border-0 text-[10px]">✓ DCC</Badge>
                                ) : (
                                  <Badge className="bg-amber-50 text-amber-700 border border-amber-200 text-[10px]">DCC Pending</Badge>
                                )}
                                {d.installationStatus === "complete" ? (
                                  <Badge className="bg-emerald-100 text-emerald-800 border-0 text-[10px]">✓ Installed</Badge>
                                ) : (
                                  <Badge className="bg-slate-100 text-slate-600 border-0 text-[10px]">Install Pending</Badge>
                                )}
                              </div>
                            </td>
                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                {d.status === "dispatched" && (
                                  <Button
                                    size="sm"
                                    className="h-7 text-xs gap-1 shadow-xs font-medium"
                                    onClick={() => handleConfirmReceipt(d)}
                                  >
                                    <CheckCircle2 className="h-3 w-3" /> Confirm Receipt
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={!d.deliveryCertUploaded}
                                  title={!d.deliveryCertUploaded ? "DCC upload required before QA routing" : ""}
                                  className={`h-7 text-xs gap-1 border-blue-300 text-blue-800 hover:bg-blue-50 ${!d.deliveryCertUploaded ? "opacity-50 cursor-not-allowed" : ""}`}
                                  onClick={() => {
                                    setQaModal(d);
                                    setQaForm({
                                      inspectorName: "Er. K. Suresh",
                                      committeeName: "Institutional Biomedical Technical Committee",
                                      qaDecision: "accepted",
                                      qaComplianceScore: 100,
                                      qaNotes: "Consignment physically verified, tested against specification sheet, electrical safety certified, and user training completed satisfactorily.",
                                      rectificationDueDate: "",
                                    });
                                  }}
                                >
                                  {!d.deliveryCertUploaded ? (
                                    <Lock className="h-3 w-3 text-slate-500" />
                                  ) : (
                                    <ShieldCheck className="h-3 w-3 text-blue-600" />
                                  )}
                                  {d.qaDecision === "accepted" ? "QA Passed" : "Conduct QA"}
                                </Button>
                                <Button
                                  size="sm"
                                  variant={d.deliveryCertUploaded ? "outline" : "default"}
                                  className="h-7 text-xs gap-1.5 font-medium"
                                  onClick={() => {
                                    setDocModal(d);
                                    setDocForm({
                                      docType: "dcc",
                                      filename: `DCC_Signed_${d.deliveryTrackingId}.pdf`,
                                      officerName: "Dr. K. Srinivas",
                                      notes: "DCC signed and stamped by Medical Superintendent at hospital site.",
                                    });
                                  }}
                                >
                                  <Upload className="h-3 w-3" /> {d.deliveryCertUploaded ? "Add Document" : "Upload Docs"}
                                </Button>
                                {d.qaDecision === "accepted" && d.deliveryCertUploaded && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 text-xs text-[#2563eb] hover:bg-blue-50 font-medium"
                                    onClick={() => setActiveTab("payments")}
                                  >
                                    Release Payment →
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                          {!d.deliveryCertUploaded && isDelivered && (
                            <tr>
                              <td colSpan={8} className="p-2 pt-0">
                                {dccOverdue ? (
                                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-900 flex items-center gap-2">
                                    <ShieldAlert className="h-4 w-4 shrink-0" />
                                    <span>DCC Upload Overdue — Escalation initiated</span>
                                  </div>
                                ) : (
                                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                      <AlertTriangle className="h-4 w-4 shrink-0" />
                                      <span>⚠️ Delivery Completion Certificate Required — Hospital Medical Superintendent must sign and stamp the DCC. Vendor must upload within 7 working days of delivery.</span>
                                    </div>
                                    <div className="font-bold whitespace-nowrap">
                                      {Math.max(0, 7 - daysSinceDel)} days remaining
                                    </div>
                                  </div>
                                )}
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* Statutory 2-Tranche Payments Tab */}
        <TabsContent value="payments" className="space-y-4">
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-950 space-y-1.5 shadow-xs">
            <div className="font-bold flex items-center gap-2 text-sm text-emerald-900">
              <ShieldCheck className="h-5 w-5 text-emerald-700" />
              Statutory Two-Tranche Payment Release Mandate (90% + 10%)
            </div>
            <p className="text-slate-700 leading-relaxed">
              <strong>Tranche 1 (90% Release):</strong> Released upon physical delivery at hospital consignee, technical QA clearance, and verification of all statutory documentation (Delivery Challan, DCC signed by Medical Superintendent, Installation Certificate, and Commercial Tax Invoice).
            </p>
            <p className="text-slate-700 leading-relaxed">
              <strong>Tranche 2 (10% Retention Release):</strong> Held as performance security retention, released post <strong>3 months</strong> of satisfactory hospital clinical usage following QPC (Quality &amp; Performance Certificate) verification.
            </p>
          </div>

          <div className="bg-white border border-[#e4eaf2] rounded-xl shadow-xs overflow-hidden">
            <div className="p-3 border-b border-[#e4eaf2] bg-[#f8fafc] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#152340]">Purchase Order Payment Register (Reporting Status)</h3>
                <p className="text-xs text-[#6b7a93]">Statutory manual disbursement tracking: Paid / Not-Paid against verified physical DCC and QA compliance</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#f8fafc] border-b border-[#e4eaf2] text-[11px] font-bold text-[#6b7a93] uppercase tracking-wider">
                  <tr>
                    <th className="p-3 text-left">PO Reference</th>
                    <th className="p-3 text-left">Contracted Vendor</th>
                    <th className="p-3 text-left">Equipment</th>
                    <th className="p-3 text-right">PO Total Value</th>
                    <th className="p-3 text-center">Fulfilment Status</th>
                    <th className="p-3 text-center">Payment Status</th>
                    <th className="p-3 text-left">Bank UTR / Date</th>
                    <th className="p-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e4eaf2]">
                  {vendorPOs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-[#6b7a93] text-sm">
                        No purchase orders available for payment tracking.
                      </td>
                    </tr>
                  ) : (
                    vendorPOs.map((po: any) => {
                      const total = po.totalAmount || 0;
                      const isPaid = po.paymentStatus === "paid";

                      return (
                        <tr key={po.id} className="hover:bg-[#f8fafc]/80 transition-colors">
                          <td className="p-3 font-mono text-xs font-bold text-[#2563eb] whitespace-nowrap">
                            {po.poNumber}
                          </td>
                          <td className="p-3 text-xs text-[#6b7a93] max-w-[160px]">
                            {po.vendorName}
                          </td>
                          <td className="p-3 font-medium text-xs text-[#152340] max-w-[180px]">
                            {po.equipmentName} (Qty: {po.quantity})
                          </td>
                          <td className="p-3 text-right font-mono font-semibold text-[#152340] whitespace-nowrap">
                            {formatINR(total)}
                          </td>
                          <td className="p-3 text-center">
                            <Badge variant="outline" className="text-[10px] uppercase font-semibold">
                              {po.fulfilmentStatus || po.status || "ordered"}
                            </Badge>
                          </td>
                          <td className="p-3 text-center">
                            {isPaid ? (
                              <Badge className="bg-emerald-100 text-emerald-800 border-0 text-[10px] gap-1">
                                <CheckCircle2 className="h-3 w-3" /> Paid
                              </Badge>
                            ) : (
                              <Badge className="bg-amber-100 text-amber-800 border-0 text-[10px] gap-1">
                                <Clock className="h-3 w-3" /> Not Paid
                              </Badge>
                            )}
                          </td>
                          <td className="p-3 text-xs">
                            {po.paymentReference ? (
                              <div className="font-mono text-[11px]">
                                <span className="font-semibold text-foreground">{po.paymentReference}</span>
                                {po.paymentDate && <span className="block text-muted-foreground">{format(new Date(po.paymentDate), "dd MMM yyyy")}</span>}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-[11px] italic">Pending Clearance</span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1.5 flex-wrap">
                              <Link href={`/purchase-orders/${po.id || po._id}`}>
                                <Button size="sm" variant="ghost" className="h-7 text-xs gap-1">
                                  <Eye className="h-3.5 w-3.5" /> View PO
                                </Button>
                              </Link>
                              {canReleasePayment && !isPaid && (
                                <Button
                                  size="sm"
                                  className="h-7 text-xs shadow-xs font-medium"
                                  onClick={async () => {
                                    try {
                                      await api.updatePOPaymentStatus(po.id || po._id, {
                                        paymentStatus: "paid",
                                        paymentReference: `UTR-TGMSIDC-${Math.floor(10000000 + Math.random() * 90000000)}`,
                                        paymentDate: new Date().toISOString(),
                                        paidBy: user?.fullName || "Accounts Wing",
                                        remarks: `Statutory payment recorded for ${po.poNumber}.`,
                                      });
                                      queryClient.invalidateQueries({ queryKey: ["/purchase-orders"] });
                                      toast({ title: "Payment Recorded", description: `PO ${po.poNumber} marked as Paid.` });
                                    } catch (err: any) {
                                      toast({ title: "Error", description: err.message || "Failed to update payment", variant: "destructive" });
                                    }
                                  }}
                                >
                                  Record Paid
                                </Button>
                              )}
                              {canReleasePayment && isPaid && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs border-amber-300 text-amber-800 hover:bg-amber-50"
                                  onClick={async () => {
                                    try {
                                      await api.updatePOPaymentStatus(po.id || po._id, {
                                        paymentStatus: "not_paid",
                                        paidBy: user?.fullName || "Accounts Wing",
                                        remarks: `Payment status reset for ${po.poNumber}.`,
                                      });
                                      queryClient.invalidateQueries({ queryKey: ["/purchase-orders"] });
                                      toast({ title: "Payment Reset", description: `PO ${po.poNumber} marked as Not Paid.` });
                                    } catch (err: any) {
                                      toast({ title: "Error", description: err.message || "Failed to reset payment", variant: "destructive" });
                                    }
                                  }}
                                >
                                  Mark Not Paid
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* Vendor Clarifications & Grievances Tab (Process Book §12 F-26) */}
        <TabsContent value="grievances" className="space-y-4">
          <div className="bg-white border border-[#e4eaf2] rounded-xl shadow-xs overflow-hidden">
            <div className="p-3 border-b border-[#e4eaf2] bg-[#f8fafc] flex flex-row items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#152340] flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-[#2563eb]" /> Vendor Clarifications &amp; Grievances Desk
                </h3>
                <p className="text-xs text-[#6b7a93]">
                  Raise technical, location, or delivery timeline queries. Procurement responds within 3 statutory working days.
                </p>
              </div>
              <Button
                size="sm"
                className="text-xs gap-1.5 shadow-xs font-medium"
                onClick={() => setGrievanceModal(true)}
              >
                + Raise New Clarification
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#f8fafc] border-b border-[#e4eaf2] text-[11px] font-bold text-[#6b7a93] uppercase tracking-wider">
                  <tr>
                    <th className="p-3 text-left">Ticket ID</th>
                    <th className="p-3 text-left">PO Reference</th>
                    <th className="p-3 text-left">Category</th>
                    <th className="p-3 text-left">Subject &amp; Query</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-left">Official Response</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e4eaf2] text-xs">
                  {grievances.map((g) => (
                    <tr key={g.id} className="hover:bg-[#f8fafc]/80 transition-colors">
                      <td className="p-3 font-mono font-bold text-[#2563eb]">{g.id}</td>
                      <td className="p-3 font-mono text-[#6b7a93]">{g.poNumber}</td>
                      <td className="p-3 font-medium uppercase text-[#152340]">{g.category}</td>
                      <td className="p-3 font-semibold text-[#152340] max-w-xs">{g.subject}</td>
                      <td className="p-3 text-center">
                        <Badge variant="outline" className="text-[10px] uppercase border-[#e4eaf2]">
                          {g.status.replace("_", " ")}
                        </Badge>
                      </td>
                      <td className="p-3 text-[#6b7a93] italic max-w-xs">{g.response}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* R-11: Vendor PO Summary Report (Process Book §13 R-11) */}
        <TabsContent value="r11_po_summary" className="space-y-4">
          <VendorPOSummaryReport />
        </TabsContent>

        {/* R-12: Vendor Delivery & Certificate Status Report (Process Book §13 R-12) */}
        <TabsContent value="r12_cert_status" className="space-y-4">
          <VendorCertStatusReport />
        </TabsContent>

        {/* R-13: Vendor Performance Self-View Report (Process Book §13 R-13) */}
        <TabsContent value="r13_self_view" className="space-y-4">
          <VendorSelfViewReport currentVendor={currentVendor} />
        </TabsContent>

      </Tabs>

      {/* ── Hidden placeholder (remove bogus Tabs) ──────────────────────── */}

      {/* Upload DCC Dialog (Process Book §8 Step 9) */}
      {dccModal && (
        <Dialog open={true} onOpenChange={() => setDccModal(null)}>
          <DialogContent className="max-w-md">
            <form onSubmit={handleUploadDCC}>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileCheck className="h-5 w-5 text-emerald-700" />
                  Upload Delivery Completion Certificate (DCC)
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Physical DCC signed and stamped by the Medical Superintendent / HoD for Consignment #{dccModal.deliveryTrackingId}.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4 text-xs">
                <div className="p-3 bg-muted/40 rounded-lg space-y-1">
                  <div><span className="font-semibold">Consignee:</span> {dccModal.facilityName}</div>
                  <div><span className="font-semibold">Equipment:</span> {dccModal.equipmentName} (Qty: {dccModal.quantity})</div>
                  <div><span className="font-semibold">PO Number:</span> {dccModal.poNumber}</div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Signed Scanned Copy File (PDF/PNG up to 30MB) *</Label>
                  <Input
                    value={dccForm.filename}
                    onChange={(e) => setDccForm(f => ({ ...f, filename: e.target.value }))}
                    placeholder="e.g. DCC_Signed_GandhiHospital.pdf"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Signing Officer Name</Label>
                    <Input
                      value={dccForm.officerName}
                      onChange={(e) => setDccForm(f => ({ ...f, officerName: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Officer Designation</Label>
                    <Input
                      value={dccForm.officerDesignation}
                      onChange={(e) => setDccForm(f => ({ ...f, officerDesignation: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Certificate Signing Date</Label>
                  <Input
                    type="date"
                    value={dccForm.certificateDate}
                    onChange={(e) => setDccForm(f => ({ ...f, certificateDate: e.target.value }))}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Remarks</Label>
                  <Textarea
                    value={dccForm.comments}
                    onChange={(e) => setDccForm(f => ({ ...f, comments: e.target.value }))}
                    rows={2}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDccModal(null)}>Cancel</Button>
                <Button type="submit" disabled={dccSubmitting}>
                  {dccSubmitting ? "Uploading..." : "Submit & Verify DCC"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Raise Grievance Dialog */}
      <Dialog open={grievanceModal} onOpenChange={setGrievanceModal}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleCreateGrievance}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" /> Raise Clarification / Grievance
              </DialogTitle>
              <DialogDescription className="text-xs">
                Submit queries regarding PO terms, delivery locations, or site clearance. (3-day SLA response).
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4 text-xs">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">PO Reference</Label>
                <Select
                  value={newGrievance.poNumber}
                  onValueChange={(v) => setNewGrievance(g => ({ ...g, poNumber: v }))}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Select relevant PO..." />
                  </SelectTrigger>
                  <SelectContent>
                    {vendorPOs.map(p => (
                      <SelectItem key={p.id} value={p.poNumber}>
                        {p.poNumber} — {p.equipmentName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Query Category</Label>
                <Select
                  value={newGrievance.category}
                  onValueChange={(v) => setNewGrievance(g => ({ ...g, category: v }))}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Site Readiness">Site Readiness / Electrical Setup</SelectItem>
                    <SelectItem value="Delivery Extension">Delivery Timeline Extension Request</SelectItem>
                    <SelectItem value="Technical Specs">Technical Specs / Accessory Clarification</SelectItem>
                    <SelectItem value="Other">Other Statutory Inquiry</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Subject *</Label>
                <Input
                  value={newGrievance.subject}
                  onChange={(e) => setNewGrievance(g => ({ ...g, subject: e.target.value }))}
                  placeholder="Summary of clarification..."
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Detailed Description</Label>
                <Textarea
                  value={newGrievance.description}
                  onChange={(e) => setNewGrievance(g => ({ ...g, description: e.target.value }))}
                  rows={3}
                  placeholder="Provide complete context..."
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setGrievanceModal(false)}>Cancel</Button>
              <Button type="submit">
                Submit Ticket
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Acknowledge Dialog */}
      {ackModal && (
        <Dialog open={true} onOpenChange={() => setAckModal(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Acknowledge Purchase Order: {ackModal.poNumber}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="p-3 bg-muted/30 rounded-lg text-xs space-y-1">
                <div><span className="font-semibold">Item:</span> {ackModal.equipmentName}</div>
                <div><span className="font-semibold">Quantity:</span> {ackModal.quantity} units</div>
                <div><span className="font-semibold">Total Value:</span> {formatINR(ackModal.totalAmount)}</div>
                <div><span className="font-semibold">Delivery Location:</span> {ackModal.deliveryAddress}</div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Committed Expected Dispatch Date *</Label>
                <Input
                  type="date"
                  value={expectedDispatchDate}
                  onChange={e => setExpectedDispatchDate(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Supplier Acknowledgement Remarks</Label>
                <Textarea
                  value={ackRemarks}
                  onChange={e => setAckRemarks(e.target.value)}
                  placeholder="e.g. Stock allocated at warehouse, dispatch committed within SLA."
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" disabled={ackSubmitting} onClick={() => setAckModal(null)}>Cancel</Button>
              <Button onClick={handleAcknowledge} disabled={ackSubmitting}>
                {ackSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                {ackSubmitting ? "Recording Acknowledgement (2–3s)..." : "Submit Acknowledgement"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Dispatch Dialog */}
      {dispatchModal && (
        <Dialog open={true} onOpenChange={() => setDispatchModal(null)}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Consignment Dispatch — {dispatchModal.poNumber}</DialogTitle>
              <DialogDescription className="text-xs">
                Transmit dispatch and transporter consignment details to hospital consignee and Procurement Division.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Dispatched Quantity</Label>
                  <Input
                    type="number"
                    value={dispatchForm.dispatchedQty}
                    onChange={e => setDispatchForm({ ...dispatchForm, dispatchedQty: Number(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Delivery Challan No.</Label>
                  <Input
                    placeholder="e.g. DC/BPL/2025/089"
                    value={dispatchForm.challanNumber}
                    onChange={e => setDispatchForm({ ...dispatchForm, challanNumber: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Tax Invoice Number</Label>
                  <Input
                    placeholder="e.g. INV/2025-26/102"
                    value={dispatchForm.invoiceNumber}
                    onChange={e => setDispatchForm({ ...dispatchForm, invoiceNumber: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>LR / GR / Consignment No.</Label>
                  <Input
                    placeholder="e.g. LR-7890123"
                    value={dispatchForm.lrGrNumber}
                    onChange={e => setDispatchForm({ ...dispatchForm, lrGrNumber: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Transporter Name / Courier</Label>
                  <Input
                    placeholder="e.g. Blue Dart / DTDC"
                    value={dispatchForm.transporterName}
                    onChange={e => setDispatchForm({ ...dispatchForm, transporterName: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Vehicle Registration No.</Label>
                  <Input
                    placeholder="e.g. TS 09 UB 5678"
                    value={dispatchForm.transporterVehicle}
                    onChange={e => setDispatchForm({ ...dispatchForm, transporterVehicle: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Serial Numbers (comma-separated)</Label>
                <Input
                  placeholder="e.g. BPL-101, BPL-102, BPL-103"
                  value={dispatchForm.serialNumbers}
                  onChange={e => setDispatchForm({ ...dispatchForm, serialNumbers: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" disabled={dispatchSubmitting} onClick={() => setDispatchModal(null)}>Cancel</Button>
              <Button onClick={handleDispatch} disabled={dispatchSubmitting}>
                {dispatchSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                {dispatchSubmitting ? "Transmitting Dispatch to DB (2–3s)..." : "Confirm & Transmit Dispatch"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* QA Inspection Dialog */}
      {qaModal && (
        <Dialog open={true} onOpenChange={() => setQaModal(null)}>
          <DialogContent className="max-w-md">
            <form onSubmit={handleRecordQA}>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-blue-700" />
                  Conduct Technical QA Inspection
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Biomedical inspection &amp; specification compliance certification for Consignment #{qaModal.deliveryTrackingId}.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-3 text-xs">
                <div className="p-3 bg-muted/40 rounded-lg space-y-1">
                  <div><span className="font-semibold">Consignee:</span> {qaModal.facilityName}</div>
                  <div><span className="font-semibold">Equipment:</span> {qaModal.equipmentName} (Qty: {qaModal.quantity})</div>
                  <div><span className="font-semibold">PO Number:</span> {qaModal.poNumber}</div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">QA Decision *</Label>
                    <Select
                      value={qaForm.qaDecision}
                      onValueChange={(v: any) => setQaForm(f => ({ ...f, qaDecision: v }))}
                    >
                      <SelectTrigger className="text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="accepted">Accepted (Full Clearance)</SelectItem>
                        <SelectItem value="conditional">Conditional (15d Rectification)</SelectItem>
                        <SelectItem value="rejected">Rejected (Non-Compliant)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Compliance Score (%)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={qaForm.qaComplianceScore}
                      onChange={e => setQaForm(f => ({ ...f, qaComplianceScore: Number(e.target.value) || 0 }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Inspecting Engineer</Label>
                    <Input
                      value={qaForm.inspectorName}
                      onChange={e => setQaForm(f => ({ ...f, inspectorName: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Committee / Hospital</Label>
                    <Input
                      value={qaForm.committeeName}
                      onChange={e => setQaForm(f => ({ ...f, committeeName: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border rounded-lg space-y-1.5">
                  <p className="font-semibold text-slate-900">Mandatory QA Checklist:</p>
                  <div className="space-y-1 text-slate-700">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" defaultChecked className="rounded border-slate-300" />
                      <span>Packaging &amp; physical transit integrity verified</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" defaultChecked className="rounded border-slate-300" />
                      <span>Technical parameters comply with tender specs</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" defaultChecked className="rounded border-slate-300" />
                      <span>Electrical safety &amp; calibration certificates verified</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" defaultChecked className="rounded border-slate-300" />
                      <span>Operational demo and staff training completed</span>
                    </label>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Inspection Remarks</Label>
                  <Textarea
                    value={qaForm.qaNotes}
                    onChange={e => setQaForm(f => ({ ...f, qaNotes: e.target.value }))}
                    rows={2}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" disabled={qaSubmitting} onClick={() => setQaModal(null)}>Cancel</Button>
                <Button type="submit" disabled={qaSubmitting}>
                  {qaSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                  {qaSubmitting ? "Recording QA Inspection (2–3s)..." : "Certify QA Decision"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Statutory Document Upload Dialog */}
      {docModal && (
        <Dialog open={true} onOpenChange={() => setDocModal(null)}>
          <DialogContent className="max-w-md">
            <form onSubmit={handleUploadDoc}>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5 text-emerald-700" />
                  Upload &amp; Verify Required Document
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Statutory document verification for Consignment #{docModal.deliveryTrackingId} (PO #{docModal.poNumber}).
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-3 text-xs">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Document Type *</Label>
                  <Select
                    value={docForm.docType}
                    onValueChange={(v: any) => {
                      const names: Record<string, string> = {
                        dcc: `Signed_DCC_${docModal.deliveryTrackingId}.pdf`,
                        installation: `Installation_Report_${docModal.deliveryTrackingId}.pdf`,
                        qa: `QA_Inspection_Clearance_${docModal.deliveryTrackingId}.pdf`,
                        invoice: `Tax_Invoice_${docModal.deliveryTrackingId}.pdf`,
                      };
                      setDocForm(f => ({ ...f, docType: v, filename: names[v] || f.filename }));
                    }}
                  >
                    <SelectTrigger className="text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dcc">Delivery Completion Certificate (DCC/CRC)</SelectItem>
                      <SelectItem value="installation">Installation &amp; Commissioning Certificate</SelectItem>
                      <SelectItem value="qa">Technical QA &amp; Inspection Clearance</SelectItem>
                      <SelectItem value="invoice">Commercial Tax Invoice</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">File Name (Scanned PDF/PNG) *</Label>
                  <Input
                    value={docForm.filename}
                    onChange={e => setDocForm(f => ({ ...f, filename: e.target.value }))}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Authorized Officer Name / Designee</Label>
                  <Input
                    value={docForm.officerName}
                    onChange={e => setDocForm(f => ({ ...f, officerName: e.target.value }))}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Verification Remarks</Label>
                  <Textarea
                    value={docForm.notes}
                    onChange={e => setDocForm(f => ({ ...f, notes: e.target.value }))}
                    rows={2}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" disabled={docSubmitting} onClick={() => setDocModal(null)}>Cancel</Button>
                <Button type="submit" disabled={docSubmitting}>
                  {docSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                  {docSubmitting ? "Uploading Document (2–3s)..." : "Confirm & Verify Document"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
