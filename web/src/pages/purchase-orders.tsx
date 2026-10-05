import { useState, useMemo } from "react";
import { Link, useLocation } from "wouter";
import {
  useListPurchaseOrders, getListPurchaseOrdersQueryKey,
  useApprovePurchaseOrder,
} from "@/lib/api-hooks";
import { useQueryClient } from "@tanstack/react-query";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Plus, Search, Eye, Check, ShoppingCart, Truck, CheckCircle2,
  Calendar, Building2, Filter, AlertCircle, ArrowRight, IndianRupee,
} from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

import { useAuth } from "@/contexts/AuthContext";

function fmtINR(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return "₹0";
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)} L`;
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

const STATUS_FILTERS = [
  { value: "all", label: "All Statuses" },
  { value: "draft", label: "Draft POs" },
  { value: "pending_approval", label: "Pending GM Review" },
  { value: "approved", label: "Approved" },
  { value: "dispatched", label: "Dispatched" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

export default function PurchaseOrders() {
  const { user } = useAuth();
  const isRaisePoAllowed = user?.role === "admin" || user?.role === "tgmsidc_user" || user?.role === "gm_equipment" || (user?.role as string) === "gm";
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  const activeFilter = statusFilter !== "all" ? statusFilter : undefined;
  const { data: pos = [], isLoading } = useListPurchaseOrders(
    activeFilter ? { status: activeFilter } : {},
    { query: { queryKey: getListPurchaseOrdersQueryKey(activeFilter ? { status: activeFilter } : {}) } }
  );
  const approvePO = useApprovePurchaseOrder();

  const filtered = useMemo(() => {
    return pos.filter((p) => {
      const matches =
        !search ||
        p.poNumber.toLowerCase().includes(search.toLowerCase()) ||
        p.vendorName.toLowerCase().includes(search.toLowerCase()) ||
        p.equipmentName.toLowerCase().includes(search.toLowerCase());
      return matches;
    });
  }, [pos, search]);

  const stats = useMemo(() => {
    return {
      total: pos.length,
      draft: pos.filter((p) => p.status === "draft" && (p as any).approvalStatus !== "pending_gm_approval").length,
      pendingGm: pos.filter((p) => p.status === "pending_approval" || (p as any).approvalStatus === "pending_gm_approval").length,
      approved: pos.filter((p) => p.status === "approved" || p.status === "po_approved").length,
      dispatched: pos.filter((p) => p.status === "dispatched").length,
      delivered: pos.filter((p) => p.status === "delivered").length,
      totalValue: pos.reduce((s, p) => s + (p.totalAmount ?? 0), 0),
    };
  }, [pos]);

  function handleApprove(id: string) {
    approvePO.mutate(id, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListPurchaseOrdersQueryKey() }),
    });
  }

  return (
    <div className="space-y-4">
      {/* ── Page Header (neoInt Style) ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#e4eaf2] pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#152340]">
              Purchase Orders
            </h1>
            <span className="neo-chip gry">Statutory Contracts</span>
          </div>
          <p className="text-xs text-[#6b7a93] mt-0.5">
            Issued supply orders, vendor commitments, and dispatch milestones for healthcare equipment & consumables
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isRaisePoAllowed ? (
            <Link href="/purchase-orders/new">
              <Button size="sm" className="gap-1.5 cursor-pointer">
                <Plus className="w-3.5 h-3.5" />
                <span>Raise PO</span>
              </Button>
            </Link>
          ) : (
            <button
              disabled
              title="Only TGMSIDC User, General Manager (GM), and Admin are authorized to raise Purchase Orders"
              className="flex items-center gap-1.5 bg-slate-200 text-slate-400 px-3.5 py-1.5 rounded-md text-xs font-semibold cursor-not-allowed opacity-60"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Raise PO</span>
            </button>
          )}
        </div>
      </div>

      {/* ── KPI Ribbon ── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="neo-kpi-card">
          <span className="text-[10px] font-bold text-[#6b7a93] uppercase tracking-wider block">
            Total Orders
          </span>
          <span className="text-2xl font-bold text-[#152340] tabular-nums mt-1 block">
            {stats.total}
          </span>
          <span className="text-[10.5px] text-[#6b7a93] mt-1 block">FY 2025–26 ledger</span>
        </div>

        <div className="neo-kpi-card">
          <span className="text-[10px] font-bold text-[#e08a0b] uppercase tracking-wider block">
            Draft POs
          </span>
          <span className="text-2xl font-bold text-[#e08a0b] tabular-nums mt-1 block">
            {stats.draft}
          </span>
          <span className="text-[10.5px] text-[#6b7a93] mt-1 block">In Indent Approval</span>
        </div>

        <div className="neo-kpi-card">
          <span className="text-[10px] font-bold text-[#d97706] uppercase tracking-wider block">
            Pending GM Review
          </span>
          <span className="text-2xl font-bold text-[#d97706] tabular-nums mt-1 block">
            {stats.pendingGm}
          </span>
          <span className="text-[10.5px] text-[#d97706] font-semibold mt-1 block">RC & PO Scrutiny</span>
        </div>

        <div className="neo-kpi-card">
          <span className="text-[10px] font-bold text-[#2563eb] uppercase tracking-wider block">
            In-Transit / Dispatched
          </span>
          <span className="text-2xl font-bold text-[#2563eb] tabular-nums mt-1 block">
            {stats.dispatched}
          </span>
          <span className="text-[10.5px] text-[#2563eb] font-semibold mt-1 block">Tracking active</span>
        </div>

        <div className="neo-kpi-card">
          <span className="text-[10px] font-bold text-[#159557] uppercase tracking-wider block">
            Delivered & Accepted
          </span>
          <span className="text-2xl font-bold text-[#159557] tabular-nums mt-1 block">
            {stats.delivered}
          </span>
          <span className="text-[10.5px] text-[#159557] font-semibold mt-1 block">GRN generated</span>
        </div>

        <div className="neo-kpi-card">
          <span className="text-[10px] font-bold text-[#6d42d9] uppercase tracking-wider block">
            Commitment Value
          </span>
          <span className="text-xl font-bold text-[#6d42d9] tabular-nums mt-1 block">
            {fmtINR(stats.totalValue)}
          </span>
          <span className="text-[10.5px] text-[#6b7a93] mt-1 block">Total PO obligations</span>
        </div>
      </div>

      {/* ── Table Card ── */}
      <div className="bg-white border border-[#e4eaf2] rounded-xl shadow-xs overflow-hidden">
        {/* Filter Bar */}
        <div className="p-3 border-b border-[#e4eaf2] bg-[#f8fafc] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#93a2b8] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by PO number, vendor, equipment..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-[32px] bg-white border border-[#e4eaf2] rounded-md text-xs text-[#152340] placeholder:text-[#93a2b8] pl-9 pr-3 focus:outline-none focus:border-[#2563eb]"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-[#6b7a93]" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-44 h-[32px] text-xs bg-white border-[#e4eaf2] rounded-md">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_FILTERS.map((s) => (
                  <SelectItem key={s.value} value={s.value} className="text-xs">
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <span className="text-xs font-medium text-[#6b7a93] ml-2">
              Showing <span className="font-bold text-[#152340]">{filtered.length}</span> of {pos.length}
            </span>
          </div>
        </div>

        {/* Table Body */}
        {isLoading ? (
          <div className="py-16 text-center">
            <div className="w-6 h-6 border-2 border-[#2563eb] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs text-[#6b7a93]">Loading purchase orders…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <ShoppingCart className="w-8 h-8 text-[#93a2b8] mx-auto mb-2" />
            <p className="text-xs font-semibold text-[#152340]">No purchase orders found</p>
            <p className="text-[11px] text-[#6b7a93] mt-0.5">Try adjusting your search criteria or create a new PO.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#e4eaf2] bg-[#f8fafc] text-[#6b7a93] font-bold uppercase tracking-wider text-[10.5px]">
                  <th className="py-2.5 px-3">PO Number</th>
                  <th className="py-2.5 px-3">Equipment / Supply</th>
                  <th className="py-2.5 px-3">Awarded Vendor</th>
                  <th className="py-2.5 px-3 text-center">Qty</th>
                  <th className="py-2.5 px-3">Total Amount (incl. GST)</th>
                  <th className="py-2.5 px-3">Delivery SLA</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eff3f8]">
                {filtered.map((po) => {
                  return (
                    <tr
                      key={po.id}
                      onClick={() => navigate(`/purchase-orders/${po.id}`)}
                      className="hover:bg-[#eff5ff] cursor-pointer transition-colors group"
                    >
                      {/* PO Number */}
                      <td className="py-2.5 px-3">
                        <span className="font-mono font-bold text-[#2563eb] text-[11.5px] group-hover:underline">
                          {po.poNumber}
                        </span>
                      </td>

                      {/* Equipment */}
                      <td className="py-2.5 px-3">
                        <span className="font-medium text-[#152340] truncate max-w-[210px] block">
                          {po.equipmentName}
                        </span>
                      </td>

                      {/* Vendor */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-[#6b7a93] shrink-0" />
                          <span className="font-medium text-[#3c4a63] truncate max-w-[190px]">
                            {po.vendorName}
                          </span>
                        </div>
                      </td>

                      {/* Quantity */}
                      <td className="py-2.5 px-3 text-center tabular-nums font-semibold text-[#152340]">
                        {po.quantity}
                      </td>

                      {/* Total Amount */}
                      <td className="py-2.5 px-3 tabular-nums font-bold text-[#152340]">
                        ₹{po.totalAmount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                      </td>

                      {/* Delivery Date */}
                      <td className="py-2.5 px-3 text-[#6b7a93] text-[11px] whitespace-nowrap">
                        {po.expectedDeliveryDate ? format(new Date(po.expectedDeliveryDate), "dd MMM yyyy") : "—"}
                      </td>

                      {/* Status Badge */}
                      <td className="py-2.5 px-3">
                        {(po as any).approvalStatus === "pending_gm_approval" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-amber-50 text-amber-800 border border-amber-300">
                            Pending GM
                          </span>
                        ) : (
                          <StatusBadge status={po.status} />
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <Link href={`/purchase-orders/${po.id}`}>
                            <button className="px-2.5 py-1 bg-white border border-[#e4eaf2] text-[#3c4a63] hover:border-[#2563eb] hover:text-[#2563eb] rounded text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs">
                              <Eye className="w-3 h-3" />
                              <span>{(po as any).approvalStatus === "pending_gm_approval" ? "Review & Approve" : "View"}</span>
                            </button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
