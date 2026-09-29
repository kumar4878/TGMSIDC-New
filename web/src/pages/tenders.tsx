import { useState, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { useListTenders, getListTendersQueryKey } from "@/lib/api-hooks";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Search, Eye, Gavel, Layers, Calendar, CheckCircle2,
  Clock, ArrowRight, Building2, Filter, AlertCircle,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";

const MILESTONE_KEYS = [
  "planning", "doc_prep", "approval", "invited", "pre_bid", "bids_received",
  "bid_query", "technical_eval", "commercial_eval", "l1_identified", "contract_final", "rc_created",
];

const STATUS_IDX: Record<string, number> = {
  planning: 0, doc_prep: 1, doc_preparation: 1, approval: 2,
  invited: 3, pre_bid: 4, bids_received: 5, bid_query: 6,
  technical_eval: 7, technical_evaluation: 7,
  commercial_eval: 8, l1_identified: 9, awarded: 9,
  contract_final: 10, rc_created: 11,
};

function milestoneProgress(status: string) {
  return (STATUS_IDX[status] ?? -1) + 1;
}

export default function Tenders() {
  const [search, setSearch] = useState("");
  const [, navigate] = useLocation();
  const { data: tenders = [], isLoading } = useListTenders({ query: { queryKey: getListTendersQueryKey() } });

  const filtered = useMemo(() => {
    return tenders.filter((t) =>
      !search ||
      t.tenderNumber.toLowerCase().includes(search.toLowerCase()) ||
      t.equipmentName.toLowerCase().includes(search.toLowerCase()) ||
      (t.l1BidderName ?? "").toLowerCase().includes(search.toLowerCase())
    );
  }, [tenders, search]);

  const stats = useMemo(() => {
    return {
      total: tenders.length,
      evaluating: tenders.filter((t) => ["bids_received", "technical_eval", "commercial_eval"].includes(t.status)).length,
      l1Awarded: tenders.filter((t) => ["l1_identified", "contract_final", "rc_created", "awarded"].includes(t.status)).length,
      invited: tenders.filter((t) => ["invited", "pre_bid"].includes(t.status)).length,
    };
  }, [tenders]);

  return (
    <div className="space-y-4">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#e4eaf2] pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#152340]">
              Tenders & Competitive Bidding
            </h1>
            <span className="neo-chip vio">GeM / e-Procurement</span>
          </div>
          <p className="text-xs text-[#6b7a93] mt-0.5">
            Transparent milestone tracking across the 12 statutory stages of healthcare equipment tenders
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/tenders/workbench">
            <button className="flex items-center gap-1.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white px-3.5 py-1.5 rounded-md text-xs font-semibold shadow-xs transition-colors cursor-pointer">
              <Layers className="w-3.5 h-3.5" />
              <span>Tender Workbench</span>
            </button>
          </Link>
        </div>
      </div>

      {/* ── KPI Ribbon ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="neo-kpi-card">
          <span className="text-[10px] font-bold text-[#6b7a93] uppercase tracking-wider block">
            Total Tenders
          </span>
          <span className="text-2xl font-bold text-[#152340] tabular-nums mt-1 block">
            {stats.total}
          </span>
          <span className="text-[10.5px] text-[#6b7a93] mt-1 block">Active RFPs</span>
        </div>

        <div className="neo-kpi-card">
          <span className="text-[10px] font-bold text-[#2563eb] uppercase tracking-wider block">
            Bids Invited / Open
          </span>
          <span className="text-2xl font-bold text-[#2563eb] tabular-nums mt-1 block">
            {stats.invited}
          </span>
          <span className="text-[10.5px] text-[#2563eb] font-semibold mt-1 block">Receiving bids</span>
        </div>

        <div className="neo-kpi-card">
          <span className="text-[10px] font-bold text-[#e08a0b] uppercase tracking-wider block">
            In Evaluation
          </span>
          <span className="text-2xl font-bold text-[#e08a0b] tabular-nums mt-1 block">
            {stats.evaluating}
          </span>
          <span className="text-[10.5px] text-[#e08a0b] font-semibold mt-1 block">Tech & Commercial</span>
        </div>

        <div className="neo-kpi-card">
          <span className="text-[10px] font-bold text-[#159557] uppercase tracking-wider block">
            L1 Awarded / RC Formed
          </span>
          <span className="text-2xl font-bold text-[#159557] tabular-nums mt-1 block">
            {stats.l1Awarded}
          </span>
          <span className="text-[10.5px] text-[#159557] font-semibold mt-1 block">Successful conclusion</span>
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
                placeholder="Search by tender number, equipment, L1 bidder..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-[32px] bg-white border border-[#e4eaf2] rounded-md text-xs text-[#152340] placeholder:text-[#93a2b8] pl-9 pr-3 focus:outline-none focus:border-[#2563eb]"
              />
            </div>
          </div>

          <span className="text-xs font-medium text-[#6b7a93]">
            Showing <span className="font-bold text-[#152340]">{filtered.length}</span> of {tenders.length}
          </span>
        </div>

        {/* Table Body */}
        {isLoading ? (
          <div className="py-16 text-center">
            <div className="w-6 h-6 border-2 border-[#2563eb] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs text-[#6b7a93]">Loading tenders…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Gavel className="w-8 h-8 text-[#93a2b8] mx-auto mb-2" />
            <p className="text-xs font-semibold text-[#152340]">No tenders match your filter criteria</p>
            <p className="text-[11px] text-[#6b7a93] mt-0.5">Try changing the search query.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#e4eaf2] bg-[#f8fafc] text-[#6b7a93] font-bold uppercase tracking-wider text-[10.5px]">
                  <th className="py-2.5 px-3">Tender No.</th>
                  <th className="py-2.5 px-3">Equipment / Item Description</th>
                  <th className="py-2.5 px-3">Initiated Date</th>
                  <th className="py-2.5 px-3 text-center">Ageing</th>
                  <th className="py-2.5 px-3">Awarded L1 Bidder</th>
                  <th className="py-2.5 px-3">L1 Value</th>
                  <th className="py-2.5 px-3">Milestone Progress (12 Steps)</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eff3f8]">
                {filtered.map((t) => {
                  const days = t.createdAt ? differenceInDays(new Date(), new Date(t.createdAt)) : 0;
                  const progress = milestoneProgress(t.status);

                  return (
                    <tr
                      key={t.id}
                      onClick={() => navigate(`/tenders/${t.id}`)}
                      className="hover:bg-[#eff5ff] cursor-pointer transition-colors group"
                    >
                      {/* Tender Number */}
                      <td className="py-2.5 px-3">
                        <span className="font-mono font-bold text-[#2563eb] text-[11.5px] group-hover:underline">
                          {t.tenderNumber}
                        </span>
                      </td>

                      {/* Equipment */}
                      <td className="py-2.5 px-3">
                        <span className="font-medium text-[#152340] truncate max-w-[210px] block">
                          {t.equipmentName}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="py-2.5 px-3 text-[#6b7a93] text-[11px] whitespace-nowrap">
                        {t.createdAt ? format(new Date(t.createdAt), "dd MMM yyyy") : "—"}
                      </td>

                      {/* Ageing */}
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={cn(
                            "tabular-nums font-bold text-[11px]",
                            days > 180 ? "text-[#dc2f3c]" : days > 90 ? "text-[#e08a0b]" : "text-[#159557]"
                          )}
                        >
                          {days}d
                        </span>
                      </td>

                      {/* L1 Bidder */}
                      <td className="py-2.5 px-3">
                        {t.l1BidderName ? (
                          <span className="font-medium text-[#152340] truncate max-w-[170px] block">
                            {t.l1BidderName}
                          </span>
                        ) : (
                          <span className="text-[#93a2b8] italic">Evaluation pending</span>
                        )}
                      </td>

                      {/* L1 Amount */}
                      <td className="py-2.5 px-3 tabular-nums font-bold text-[#152340]">
                        {t.l1BidderAmount != null ? `₹${t.l1BidderAmount.toLocaleString("en-IN")}` : "—"}
                      </td>

                      {/* Milestone Progress */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <div className="flex gap-0.5">
                            {MILESTONE_KEYS.map((m, i) => (
                              <div
                                key={m}
                                title={`Stage ${i + 1}: ${m.replace(/_/g, " ")}`}
                                className={cn(
                                  "h-1.5 w-2 rounded-xs",
                                  i < progress ? "bg-[#2563eb]" : "bg-[#e4eaf2]"
                                )}
                              />
                            ))}
                          </div>
                          <span className="text-[10px] font-bold text-[#6b7a93] tabular-nums">
                            {progress}/12
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-2.5 px-3">
                        <StatusBadge status={t.status} />
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <Link href={`/tenders/${t.id}`}>
                            <button className="px-2 py-1 bg-white border border-[#e4eaf2] text-[#3c4a63] hover:border-[#2563eb] hover:text-[#2563eb] rounded text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer">
                              <Eye className="w-3 h-3" />
                              <span>View</span>
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
