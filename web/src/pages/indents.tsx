import { useState, useMemo, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useListIndents, useListRateContracts, useListInstitutions } from "@/lib/api-hooks";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Plus, Search, Eye, ChevronRight, ChevronLeft, Layers, FileText, IndianRupee,
  Building2, Calendar, Filter, Clock, CheckCircle2,
  XCircle, Package, Inbox, AlertTriangle, ArrowRight
} from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
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
  const totalSteps = 5; // Canonical 5-gate workflow: DEO -> TGMSIDC User -> GM Equipment -> SO Equipment -> ED

  const isRejected = indentStatus === "rejected" || steps.some((s: any) => s.status === "rejected");

  // These statuses mean the workflow has been interrupted / sent back — NOT complete
  const INCOMPLETE_STATUSES = new Set([
    "draft", "pending_review", "pending_approval",
    "reprioritization_required", "pending_deo_reprioritization",
    "returned_to_deo_for_correction", "returned",
    "resubmitted_for_review", "under_tgmsidc_revalidation",
    "under_scrutiny", "rc_assessment_in_progress",
    "cost_assessment_completed", "as_validation_in_progress",
    "ready_for_procurement",
  ]);

  // A workflow is only "complete" (5/5) when all 5 approval steps have been actioned (approved/skipped)
  const allStepsActioned = steps.length >= 5 && steps.every((s: any) => s.status === "approved" || s.status === "skipped");
  const isComplete = !isRejected && !INCOMPLETE_STATUSES.has(indentStatus) && allStepsActioned;

  const rawCompleted = steps.filter((s: any) => s.status === "approved" || s.status === "skipped").length;
  const completedSteps = isComplete ? 5 : Math.min(4, rawCompleted); // cap at 4 until truly complete

  // Determine which step has a "returned" marker
  const returnedStepIdx = steps.findIndex((s: any) => s.status === "returned");
  const hasReturnedStep = returnedStepIdx >= 0;

  return (
    <div className="flex items-center justify-center gap-1.5">
      <div className="flex gap-0.5 items-center">
        {Array.from({ length: totalSteps }).map((_, i) => {
          const done = i < completedSteps;
          const isThisStepRejected = isRejected && i === completedSteps;
          const isThisStepReturned = hasReturnedStep && i === returnedStepIdx;
          const active = !isComplete && !isRejected && !hasReturnedStep && i === completedSteps;
          return (
            <div
              key={i}
              className={cn(
                "h-1.5 rounded-full transition-all",
                done ? "w-2.5 bg-slate-500" :
                isThisStepRejected ? "w-2.5 bg-rose-400" :
                isThisStepReturned ? "w-2.5 bg-amber-400" :
                isRejected || hasReturnedStep ? "w-1.5 bg-slate-200" :
                active ? "w-2.5 bg-blue-500" :
                "w-1.5 bg-slate-200"
              )}
            />
          );
        })}
      </div>
      <span className={cn(
        "text-[10px] font-medium tabular-nums",
        isRejected ? "text-rose-600 font-semibold" :
        hasReturnedStep ? "text-amber-600 font-semibold" :
        "text-slate-600"
      )}>
        {isRejected ? "Rejected" : hasReturnedStep ? "Returned" : `${completedSteps}/${totalSteps}`}
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
  const [facilityFilter, setFacilityFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const canRaiseIndent = user?.role === "deo" || user?.role === "admin";

  const { data: indents = [], isLoading } = useListIndents({});
  const { data: rateContracts } = useListRateContracts({ status: "active" });
  const { data: institutions = [] } = useListInstitutions();

  const facilityOptions = useMemo(() => {
    const set = new Set<string>();
    indents.forEach((i) => {
      if (i.facilityName) set.add(i.facilityName.trim());
    });
    (institutions ?? []).forEach((inst) => {
      if (inst.name) set.add(inst.name.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [indents, institutions]);

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
      if (statusFilter !== "all" && i.status !== statusFilter) return false;
      if (facilityFilter !== "all" && (i.facilityName ?? "").trim() !== facilityFilter) return false;
      return true;
    });
  }, [indents, search, statusFilter, facilityFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  // Reset page when any filter criteria changes
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, facilityFilter, pageSize]);

  const paginatedIndents = useMemo(() => {
    const startIndex = (page - 1) * pageSize;
    return filtered.slice(startIndex, startIndex + pageSize);
  }, [filtered, page, pageSize]);

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
            <span className="neo-chip gry">Requisitions Ledger</span>
          </div>
          <p className="text-xs text-[#6b7a93] mt-0.5">
            Digitised demand indents and institutional procurement workflows across Telangana health facilities
          </p>
        </div>

        {canRaiseIndent && (
          <div className="flex items-center gap-2">
            <Link href="/indents/new">
              <Button size="sm" className="gap-1.5 cursor-pointer">
                <Plus className="w-3.5 h-3.5" />
                <span>Raise Indent</span>
              </Button>
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
            <Button
              size="sm"
              onClick={() => navigate("/approval-inbox")}
              className="gap-1.5 text-xs font-semibold cursor-pointer shrink-0"
            >
              <span>Review in Approval Inbox</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
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

          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-3.5 h-3.5 text-[#6b7a93] shrink-0" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36 sm:w-44 h-[32px] text-xs bg-white border-[#e4eaf2] rounded-md">
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

            <Select value={facilityFilter} onValueChange={setFacilityFilter}>
              <SelectTrigger className="w-44 sm:w-52 h-[32px] text-xs bg-white border-[#e4eaf2] rounded-md text-[#152340]">
                <SelectValue placeholder="All facilities" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                <SelectItem value="all" className="text-xs">
                  All facilities
                </SelectItem>
                {facilityOptions.map((f) => (
                  <SelectItem key={f} value={f} className="text-xs">
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <span className="text-xs font-medium text-[#6b7a93] ml-1 whitespace-nowrap">
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
          <div className="w-full overflow-hidden">
            <table className="w-full table-fixed text-left text-xs border-collapse">
              <colgroup>
                <col className="w-[10%]" />
                <col className="w-[15%]" />
                <col className="w-[15%]" />
                <col className="w-[4%]" />
                <col className="w-[9%]" />
                <col className="w-[8%]" />
                <col className="w-[8%]" />
                <col className="w-[12%]" />
                <col className="w-[10%]" />
                <col className="w-[9%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-[#e4eaf2] bg-[#f8fafc] text-[#6b7a93] font-bold uppercase tracking-wider text-[10.5px]">
                  <th className="py-2.5 px-2.5 text-left">Indent No.</th>
                  <th className="py-2.5 px-2.5 text-left">Facility / Consignee</th>
                  <th className="py-2.5 px-2.5 text-left">Equipment / Supply</th>
                  <th className="py-2.5 px-2 text-center">Qty</th>
                  <th className="py-2.5 px-2.5 text-right">Estimated Value</th>
                  <th className="py-2.5 px-2 text-center">RC Tag</th>
                  <th className="py-2.5 px-2 text-center">Approval Gate</th>
                  <th className="py-2.5 px-2.5 text-left">Status</th>
                  <th className="py-2.5 px-2 text-center">Date</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eff3f8]">
                {paginatedIndents.map((indent) => {
                  const myTurn = myPendingIds.has(indent.id);

                  return (
                    <tr
                      key={indent.id}
                      onClick={() => navigate(`/indents/${indent.id}`)}
                      className="hover:bg-[#eff5ff] cursor-pointer transition-colors group"
                    >
                      {/* Indent Number */}
                      <td className="py-2.5 px-2.5 truncate align-middle">
                        <span className="font-mono font-bold text-[#2563eb] text-[11.5px] group-hover:underline truncate block" title={indent.indentNumber}>
                          {indent.indentNumber}
                        </span>
                      </td>

                      {/* Facility */}
                      <td className="py-2.5 px-2.5 align-middle">
                        <div className="flex items-center gap-1.5 min-w-0" title={indent.facilityName}>
                          <Building2 className="w-3.5 h-3.5 text-[#6b7a93] shrink-0" />
                          <span className="font-medium text-[#152340] truncate block">
                            {indent.facilityName}
                          </span>
                        </div>
                      </td>

                      {/* Equipment */}
                      <td className="py-2.5 px-2.5 align-middle">
                        <div className="flex items-center gap-1.5 min-w-0" title={indent.equipmentName || "Multi-Item Requisition"}>
                          <span className="font-medium text-[#152340] truncate block flex-1">
                            {indent.equipmentName || "Multi-Item Requisition"}
                          </span>
                          {myTurn && (
                            <span className="text-[9px] font-semibold px-1 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                              Action
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Quantity */}
                      <td className="py-2.5 px-2 text-center tabular-nums font-semibold text-[#152340] align-middle">
                        {indent.quantity}
                      </td>

                      {/* Value */}
                      <td className="py-2.5 px-2.5 text-right tabular-nums font-bold text-[#152340] align-middle whitespace-nowrap">
                        {formatINR(indent.estimatedTotalValue ?? 0)}
                      </td>

                      {/* Rate Contract Tag */}
                      <td className="py-2.5 px-2 text-center align-middle">
                        {indent.tenderId || indent.status === "tender_initiated" ? (
                          <span className="neo-chip gry text-[10px]">Tender Route</span>
                        ) : indent.hasFullRCCoverage && indent.rateContractId ? (
                          <span className="neo-chip gry text-[10px]">RC Tagged</span>
                        ) : indent.hasFullRCCoverage ? (
                          <span className="neo-chip gry text-[10px]">RC Available</span>
                        ) : indent.hasPartialRCCoverage ? (
                          <span className="neo-chip gry text-[10px]">Partial RC</span>
                        ) : (
                          <span className="neo-chip gry text-[10px]">Tender Req</span>
                        )}
                      </td>

                      {/* Approval Timeline */}
                      <td className="py-2.5 px-2 text-center align-middle">
                        <StepsBadge approvalSteps={indent.approvalSteps} indentStatus={indent.status} />
                      </td>

                      {/* Status Badge */}
                      <td className="py-2.5 px-2.5 text-left align-middle min-w-0">
                        <StatusBadge status={indent.status} className="max-w-full truncate" />
                      </td>

                      {/* Date */}
                      <td className="py-2.5 px-2 text-center text-[#6b7a93] text-[11px] whitespace-nowrap align-middle">
                        {format(new Date(indent.createdAt), "dd MMM yyyy")}
                      </td>

                      {/* Action */}
                      <td className="py-2.5 px-3 text-right align-middle" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end">
                          <button
                            onClick={() => navigate(`/indents/${indent.id}`)}
                            className={cn(
                              "px-2.5 py-1 rounded text-xs font-semibold transition-colors inline-flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0",
                              myTurn
                                ? "bg-[#eff5ff] text-[#1e40af] border border-[#bfdbfe] hover:bg-[#dbeafe]"
                                : "bg-white border border-[#e2e8f0] text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                            )}
                          >
                            <Eye className="w-3.5 h-3.5 shrink-0" />
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

        {/* Pagination Bar */}
        {filtered.length > 0 && (
          <div className="p-3 border-t border-[#e4eaf2] bg-[#f8fafc] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="text-xs text-[#6b7a93]">
              Showing <span className="font-semibold text-[#152340]">{(page - 1) * pageSize + 1}</span> to{" "}
              <span className="font-semibold text-[#152340]">
                {Math.min(page * pageSize, filtered.length)}
              </span>{" "}
              of <span className="font-semibold text-[#152340]">{filtered.length}</span> indents
            </div>

            <div className="flex items-center gap-3 sm:ml-auto">
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#6b7a93] whitespace-nowrap">Rows per page</span>
                <Select
                  value={String(pageSize)}
                  onValueChange={(val) => {
                    setPageSize(Number(val));
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-[66px] h-[32px] text-xs bg-white border-[#e4eaf2] rounded-md font-medium text-[#152340] px-2.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10" className="text-xs">10</SelectItem>
                    <SelectItem value="20" className="text-xs">20</SelectItem>
                    <SelectItem value="50" className="text-xs">50</SelectItem>
                    <SelectItem value="100" className="text-xs">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className={cn(
                    "h-8 w-8 rounded-lg flex items-center justify-center transition-colors border border-transparent",
                    page <= 1
                      ? "bg-[#f1f5f9] text-[#94a3b8] cursor-not-allowed opacity-40"
                      : "bg-[#f1f5f9] text-[#475569] hover:bg-[#e2e8f0] cursor-pointer"
                  )}
                  aria-label="Previous page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <span className="text-xs text-[#6b7a93] whitespace-nowrap px-1">
                  Page {page} of {totalPages}
                </span>

                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className={cn(
                    "h-8 w-8 rounded-lg flex items-center justify-center transition-colors border border-transparent",
                    page >= totalPages
                      ? "bg-[#f1f5f9] text-[#94a3b8] cursor-not-allowed opacity-40"
                      : "bg-[#f1f5f9] text-[#475569] hover:bg-[#e2e8f0] cursor-pointer"
                  )}
                  aria-label="Next page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
