import { useState, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { useListIndents, useListRateContracts } from "@/lib/api-hooks";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Plus, Search, Eye, ChevronRight, Layers, FileText, IndianRupee,
  Building2, Calendar, Filter, Clock, CheckCircle2,
  XCircle, Package, Inbox, AlertTriangle, ArrowRight
} from "lucide-react";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const STATUS_FILTERS = [
  { value: "all", label: "All Statuses" },
  { value: "pending_review", label: "Pending Review" },
  { value: "pending_approval", label: "Pending Approval" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "linked_to_rc", label: "Linked to RC" },
  { value: "tender_initiated", label: "Tender Initiated" },
  { value: "po_issued", label: "PO Issued" },
];

function StepsBadge({ approvalSteps, indentStatus }: { approvalSteps?: any[]; indentStatus: string }) {
  const steps = approvalSteps ?? [];
  const totalSteps = steps.length;
  if (totalSteps === 0) return null;
  const completedSteps = steps.filter((s: any) => s.status === "approved" || s.status === "skipped").length;
  const isComplete = completedSteps === totalSteps || !["pending_approval", "pending_review"].includes(indentStatus);
  const isRejected = steps.some((s: any) => s.status === "rejected") || indentStatus === "rejected";

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex gap-1">
        {Array.from({ length: totalSteps }).map((_, i) => {
          const done = i < completedSteps;
          const active = i === completedSteps && !isComplete && !isRejected;
          return (
            <div
              key={i}
              className={cn(
                "h-1.5 rounded-full transition-all",
                done ? "w-3 bg-[#159557]" :
                isRejected ? "w-3 bg-[#dc2f3c]" :
                active ? "w-3 bg-[#2563eb] animate-pulse" :
                "w-2 bg-[#e4eaf2]"
              )}
            />
          );
        })}
      </div>
      <span className={cn(
        "text-[10px] font-bold tabular-nums",
        isRejected ? "text-[#dc2f3c]" : isComplete ? "text-[#159557]" : "text-[#6b7a93]"
      )}>
        {isRejected ? "Rejected" : `${completedSteps}/${totalSteps}`}
      </span>
    </div>
  );
}

const formatINR = (n: number) => {
  if (n === 0) return "—";
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)} L`;
  return `₹${n.toLocaleString("en-IN")}`;
};

export default function Indents() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const canRaiseIndent = user?.role === "deo" || user?.role === "admin";

  const { data: indents = [], isLoading } = useListIndents({});
  const { data: rateContracts } = useListRateContracts({ status: "active" });

  const rcEquipmentIds = useMemo(() => {
    const set = new Set<string>();
    for (const rc of (rateContracts ?? [])) set.add(rc.equipmentId);
    return set;
  }, [rateContracts]);

  const myPendingIds = useMemo(() => {
    const role = user?.role ?? "";
    if (!role) return new Set<string>();
    const pending = new Set<string>();
    for (const indent of indents) {
      const steps = indent.approvalSteps ?? [];
      const firstPending = steps.find((s: any) => s.status === "pending" || s.status === "returned");
      if (firstPending && (firstPending.requiredRole === role || role === "admin")) {
        pending.add(indent.id);
      }
    }
    return pending;
  }, [indents, user?.role]);

  const filtered = useMemo(() => {
    return indents.filter((i) => {
      const matchesSearch =
        !search ||
        i.indentNumber.toLowerCase().includes(search.toLowerCase()) ||
        i.facilityName.toLowerCase().includes(search.toLowerCase()) ||
        (i.equipmentName ?? "").toLowerCase().includes(search.toLowerCase());
      if (!matchesSearch) return false;
      if (statusFilter === "all") return true;
      return i.status === statusFilter;
    });
  }, [indents, search, statusFilter]);

  const stats = useMemo(() => {
    return {
      total: indents.length,
      pending: indents.filter(i => ["pending_review", "pending_approval"].includes(i.status)).length,
      approved: indents.filter(i => ["approved", "linked_to_rc", "tender_initiated", "po_issued"].includes(i.status)).length,
      rejected: indents.filter(i => i.status === "rejected").length,
      totalValue: indents.reduce((s, i) => s + (i.estimatedTotalValue ?? 0), 0),
    };
  }, [indents]);

  return (
    <div className="space-y-4">
      {/* ── Page Header (neoInt Style) ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#e4eaf2] pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#152340]">
              Procurement Indents
            </h1>
            <span className="neo-chip blu">Requisitions Ledger</span>
          </div>
          <p className="text-xs text-[#6b7a93] mt-0.5">
            Digitised demand indents and institutional procurement workflows across Telangana health facilities
          </p>
        </div>

        {canRaiseIndent && (
          <div className="flex items-center gap-2">
            <Link href="/indents/new">
              <button className="flex items-center gap-1.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white px-3.5 py-1.5 rounded-md text-xs font-semibold shadow-xs transition-colors cursor-pointer">
                <Plus className="w-3.5 h-3.5" />
                <span>Raise Indent</span>
              </button>
            </Link>
          </div>
        )}
      </div>

      {/* ── Summary Ribbon ── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="neo-kpi-card">
          <span className="text-[10px] font-bold text-[#6b7a93] uppercase tracking-wider block">
            Total Indents
          </span>
          <span className="text-2xl font-bold text-[#152340] tabular-nums mt-1 block">
            {stats.total}
          </span>
          <span className="text-[10.5px] text-[#6b7a93] mt-1 block">All registered facilities</span>
        </div>

        <div className="neo-kpi-card">
          <span className="text-[10px] font-bold text-[#e08a0b] uppercase tracking-wider block">
            Pending Sanction
          </span>
          <span className="text-2xl font-bold text-[#e08a0b] tabular-nums mt-1 block">
            {stats.pending}
          </span>
          <span className="text-[10.5px] text-[#6b7a93] mt-1 block">Awaiting sign-off</span>
        </div>

        <div className="neo-kpi-card">
          <span className="text-[10px] font-bold text-[#159557] uppercase tracking-wider block">
            Approved & Linked
          </span>
          <span className="text-2xl font-bold text-[#159557] tabular-nums mt-1 block">
            {stats.approved}
          </span>
          <span className="text-[10.5px] text-[#159557] font-semibold mt-1 block">
            {stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0}% clearance
          </span>
        </div>

        <div className="neo-kpi-card">
          <span className="text-[10px] font-bold text-[#dc2f3c] uppercase tracking-wider block">
            Returned / Rejected
          </span>
          <span className="text-2xl font-bold text-[#dc2f3c] tabular-nums mt-1 block">
            {stats.rejected}
          </span>
          <span className="text-[10.5px] text-[#6b7a93] mt-1 block">Requires revision</span>
        </div>

        <div className="neo-kpi-card">
          <span className="text-[10px] font-bold text-[#2563eb] uppercase tracking-wider block">
            Total Value
          </span>
          <span className="text-xl font-bold text-[#2563eb] tabular-nums mt-1 block">
            {formatINR(stats.totalValue)}
          </span>
          <span className="text-[10.5px] text-[#6b7a93] mt-1 block">Cumulative demand</span>
        </div>
      </div>

      {/* ── Approver Priority Callout ── */}
      {myPendingIds.size > 0 && (
        <div className="neo-att-c amb">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white shadow-xs flex items-center justify-center shrink-0">
                <Inbox className="w-4 h-4 text-[#e08a0b]" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#152340]">
                  You have {myPendingIds.size} indent{myPendingIds.size > 1 ? "s" : ""} requiring your sanction
                </p>
                <p className="text-[11px] text-[#3c4a63]">
                  Action required under your role as <span className="font-semibold">{user?.roleLabel}</span>.
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate("/approval-inbox")}
              className="px-3 py-1.5 bg-[#0f2b5b] hover:bg-[#0a2149] text-white text-xs font-semibold rounded-md flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
            >
              <span>Review in Approval Inbox</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ── Table Card ── */}
      <div className="bg-white border border-[#e4eaf2] rounded-xl shadow-xs overflow-hidden">
        {/* Filter bar */}
        <div className="p-3 border-b border-[#e4eaf2] bg-[#f8fafc] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#93a2b8] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Filter by indent number, facility, equipment..."
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
              Showing <span className="font-bold text-[#152340]">{filtered.length}</span> of {indents.length}
            </span>
          </div>
        </div>

        {/* Table Contents */}
        {isLoading ? (
          <div className="py-16 text-center">
            <div className="w-6 h-6 border-2 border-[#2563eb] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs text-[#6b7a93]">Loading procurement indents…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <FileText className="w-8 h-8 text-[#93a2b8] mx-auto mb-2" />
            <p className="text-xs font-semibold text-[#152340]">No indents match your filter criteria</p>
            <p className="text-[11px] text-[#6b7a93] mt-0.5">Try clearing the search or changing status filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#e4eaf2] bg-[#f8fafc] text-[#6b7a93] font-bold uppercase tracking-wider text-[10.5px]">
                  <th className="py-2.5 px-3">Indent No.</th>
                  <th className="py-2.5 px-3">Facility / Consignee</th>
                  <th className="py-2.5 px-3">Equipment / Supply</th>
                  <th className="py-2.5 px-3 text-center">Qty</th>
                  <th className="py-2.5 px-3">Estimated Value</th>
                  <th className="py-2.5 px-3 text-center">RC Tag</th>
                  <th className="py-2.5 px-3">Approval Gate</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eff3f8]">
                {filtered.map((indent) => {
                  const myTurn = myPendingIds.has(indent.id);
                  const hasRC = indent.rateContractId ||
                    (indent.lineItems ?? []).some((li: any) => rcEquipmentIds.has(li.equipmentId)) ||
                    rcEquipmentIds.has(indent.equipmentId ?? "");

                  return (
                    <tr
                      key={indent.id}
                      onClick={() => navigate(`/indents/${indent.id}`)}
                      className={cn(
                        "hover:bg-[#eff5ff] cursor-pointer transition-colors group",
                        myTurn && "bg-[#fff9ec]/60 hover:bg-[#fff9ec]"
                      )}
                    >
                      {/* Indent Number */}
                      <td className="py-2.5 px-3">
                        <span className="font-mono font-bold text-[#2563eb] text-[11.5px] group-hover:underline">
                          {indent.indentNumber}
                        </span>
                      </td>

                      {/* Facility */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-[#6b7a93] shrink-0" />
                          <span className="font-medium text-[#152340] truncate max-w-[190px]">
                            {indent.facilityName}
                          </span>
                        </div>
                      </td>

                      {/* Equipment */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-[#152340] truncate max-w-[210px]">
                            {indent.equipmentName || "Multi-Item Requisition"}
                          </span>
                          {myTurn && (
                            <span className="neo-chip amb text-[9px] py-0 px-1.5">
                              Your Action
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Quantity */}
                      <td className="py-2.5 px-3 text-center tabular-nums font-semibold text-[#152340]">
                        {indent.quantity}
                      </td>

                      {/* Value */}
                      <td className="py-2.5 px-3 tabular-nums font-bold text-[#152340]">
                        {formatINR(indent.estimatedTotalValue ?? 0)}
                      </td>

                      {/* Rate Contract Tag */}
                      <td className="py-2.5 px-3 text-center">
                        {indent.tenderId || indent.status === "tender_initiated" ? (
                          <span className="neo-chip pur text-[10px]">Tender Initiated</span>
                        ) : indent.hasFullRCCoverage && indent.rateContractId ? (
                          <span className="neo-chip grn text-[10px]">Tagged</span>
                        ) : indent.hasFullRCCoverage ? (
                          <span className="neo-chip blu text-[10px]">RC Available</span>
                        ) : indent.hasPartialRCCoverage ? (
                          <span className="neo-chip amb text-[10px]">Tender Req (Partial RC)</span>
                        ) : (
                          <span className="neo-chip gry text-[10px]">Tender Req</span>
                        )}
                      </td>

                      {/* Approval Timeline */}
                      <td className="py-2.5 px-3">
                        <StepsBadge approvalSteps={indent.approvalSteps} indentStatus={indent.status} />
                      </td>

                      {/* Status Badge */}
                      <td className="py-2.5 px-3">
                        <StatusBadge status={indent.status} />
                      </td>

                      {/* Date */}
                      <td className="py-2.5 px-3 text-[#6b7a93] text-[11px] whitespace-nowrap">
                        {format(new Date(indent.createdAt), "dd MMM yyyy")}
                      </td>

                      {/* Action */}
                      <td className="py-2.5 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => navigate(`/indents/${indent.id}`)}
                            className={cn(
                              "px-2.5 py-1 rounded text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer",
                              myTurn
                                ? "bg-[#2563eb] text-white hover:bg-[#1d4ed8]"
                                : "bg-white border border-[#e4eaf2] text-[#3c4a63] hover:border-[#2563eb] hover:text-[#2563eb]"
                            )}
                          >
                            <Eye className="w-3 h-3" />
                            <span>{myTurn ? "Review" : "View"}</span>
                          </button>
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
