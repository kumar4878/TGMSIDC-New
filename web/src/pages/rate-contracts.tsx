import { useState, useMemo } from "react";
import { Link, useLocation } from "wouter";
import {
  useListRateContracts, getListRateContractsQueryKey,
  useGetExpiringRateContracts, getGetExpiringRateContractsQueryKey,
} from "@/lib/api-hooks";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Plus, Search, Eye, AlertTriangle, ShieldCheck, Calendar,
  Building2, Filter, ArrowRight, FileCheck, CheckCircle2, Clock
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const STATUS_FILTERS = [
  { value: "all", label: "All Statuses" },
  { value: "active", label: "Active" },
  { value: "expired", label: "Expired" },
  { value: "closed", label: "Closed" },
  { value: "renewed", label: "Renewed" },
];

export default function RateContracts() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [, navigate] = useLocation();

  const activeFilter = statusFilter !== "all" ? statusFilter : undefined;
  const { data: contracts = [], isLoading } = useListRateContracts(
    activeFilter ? { status: activeFilter } : {},
    { query: { queryKey: getListRateContractsQueryKey(activeFilter ? { status: activeFilter } : {}) } }
  );
  const { data: expiring = [] } = useGetExpiringRateContracts({ query: { queryKey: getGetExpiringRateContractsQueryKey() } });

  const filtered = useMemo(() => {
    return contracts.filter((c) => {
      return (
        !search ||
        c.contractNumber.toLowerCase().includes(search.toLowerCase()) ||
        c.equipmentName.toLowerCase().includes(search.toLowerCase()) ||
        c.vendorName.toLowerCase().includes(search.toLowerCase())
      );
    });
  }, [contracts, search]);

  const stats = useMemo(() => {
    return {
      total: contracts.length,
      active: contracts.filter((c) => c.status === "active").length,
      expiring: expiring.length,
      expired: contracts.filter((c) => c.status === "expired").length,
    };
  }, [contracts, expiring]);

  function getExpiryBadge(endDate: string) {
    const days = differenceInDays(new Date(endDate), new Date());
    if (days < 0) return <span className="neo-chip red">Expired</span>;
    if (days <= 30) return <span className="neo-chip red">{days}d left</span>;
    if (days <= 90) return <span className="neo-chip amb">{days}d left</span>;
    return <span className="neo-chip grn">{days}d left</span>;
  }

  return (
    <div className="space-y-4">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#e4eaf2] pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#152340]">
              Rate Contracts (RC)
            </h1>
            <span className="neo-chip grn">Fixed-Price Master Agreements</span>
          </div>
          <p className="text-xs text-[#6b7a93] mt-0.5">
            Pre-negotiated statutory pricing and OEM supply terms governing institutional healthcare equipment orders
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/rate-contracts/new">
            <button className="flex items-center gap-1.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white px-3.5 py-1.5 rounded-md text-xs font-semibold shadow-xs transition-colors cursor-pointer">
              <Plus className="w-3.5 h-3.5" />
              <span>New Contract</span>
            </button>
          </Link>
        </div>
      </div>

      {/* ── Summary Ribbon ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="neo-kpi-card">
          <span className="text-[10px] font-bold text-[#6b7a93] uppercase tracking-wider block">
            Total Agreements
          </span>
          <span className="text-2xl font-bold text-[#152340] tabular-nums mt-1 block">
            {stats.total}
          </span>
          <span className="text-[10.5px] text-[#6b7a93] mt-1 block">Master rate schedules</span>
        </div>

        <div className="neo-kpi-card">
          <span className="text-[10px] font-bold text-[#159557] uppercase tracking-wider block">
            Active Rate Contracts
          </span>
          <span className="text-2xl font-bold text-[#159557] tabular-nums mt-1 block">
            {stats.active}
          </span>
          <span className="text-[10.5px] text-[#159557] font-semibold mt-1 block">Ready for auto-tagging</span>
        </div>

        <div className="neo-kpi-card">
          <span className="text-[10px] font-bold text-[#e08a0b] uppercase tracking-wider block">
            Expiring in 90 Days
          </span>
          <span className="text-2xl font-bold text-[#e08a0b] tabular-nums mt-1 block">
            {stats.expiring}
          </span>
          <span className="text-[10.5px] text-[#e08a0b] font-semibold mt-1 block">Requires re-tendering</span>
        </div>

        <div className="neo-kpi-card">
          <span className="text-[10px] font-bold text-[#dc2f3c] uppercase tracking-wider block">
            Expired Contracts
          </span>
          <span className="text-2xl font-bold text-[#dc2f3c] tabular-nums mt-1 block">
            {stats.expired}
          </span>
          <span className="text-[10.5px] text-[#6b7a93] mt-1 block">Historical references</span>
        </div>
      </div>

      {/* ── Expiring RC Attention Callout ── */}
      {expiring.length > 0 && (
        <div className="neo-att-c amb">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white shadow-xs flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4 text-[#e08a0b]" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#152340]">
                  {expiring.length} Rate Contract{expiring.length > 1 ? "s" : ""} approaching validity expiration (BR-09)
                </p>
                <p className="text-[11px] text-[#3c4a63]">
                  Initiate new tenders or extend validity before expiry to prevent supply chain disruption for district hospitals.
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate("/tenders/workbench")}
              className="px-3 py-1.5 bg-[#0f2b5b] hover:bg-[#0a2149] text-white text-xs font-semibold rounded-md flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
            >
              <span>Open Tender Workbench</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ── Table Card ── */}
      <div className="bg-white border border-[#e4eaf2] rounded-xl shadow-xs overflow-hidden">
        {/* Filter Bar */}
        <div className="p-3 border-b border-[#e4eaf2] bg-[#f8fafc] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#93a2b8] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by contract number, equipment, vendor..."
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
              Showing <span className="font-bold text-[#152340]">{filtered.length}</span> of {contracts.length}
            </span>
          </div>
        </div>

        {/* Table Body */}
        {isLoading ? (
          <div className="py-16 text-center">
            <div className="w-6 h-6 border-2 border-[#2563eb] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs text-[#6b7a93]">Loading rate contracts…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <FileCheck className="w-8 h-8 text-[#93a2b8] mx-auto mb-2" />
            <p className="text-xs font-semibold text-[#152340]">No rate contracts found</p>
            <p className="text-[11px] text-[#6b7a93] mt-0.5">Try adjusting your search criteria or register a contract.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#e4eaf2] bg-[#f8fafc] text-[#6b7a93] font-bold uppercase tracking-wider text-[10.5px]">
                  <th className="py-2.5 px-3">Contract No.</th>
                  <th className="py-2.5 px-3">Equipment / Supply</th>
                  <th className="py-2.5 px-3">Approved Vendor</th>
                  <th className="py-2.5 px-3">Base Unit Price</th>
                  <th className="py-2.5 px-3">GST Rate</th>
                  <th className="py-2.5 px-3">Validity End Date</th>
                  <th className="py-2.5 px-3">Days Remaining</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eff3f8]">
                {filtered.map((c) => {
                  return (
                    <tr
                      key={c.id}
                      onClick={() => navigate(`/rate-contracts/${c.id}`)}
                      className="hover:bg-[#eff5ff] cursor-pointer transition-colors group"
                    >
                      {/* Contract Number */}
                      <td className="py-2.5 px-3">
                        <span className="font-mono font-bold text-[#2563eb] text-[11.5px] group-hover:underline">
                          {c.contractNumber}
                        </span>
                      </td>

                      {/* Equipment */}
                      <td className="py-2.5 px-3">
                        <span className="font-medium text-[#152340] truncate max-w-[210px] block">
                          {c.equipmentName}
                        </span>
                      </td>

                      {/* Vendor */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-[#6b7a93] shrink-0" />
                          <span className="font-medium text-[#3c4a63] truncate max-w-[190px]">
                            {c.vendorName}
                          </span>
                        </div>
                      </td>

                      {/* Unit Price */}
                      <td className="py-2.5 px-3 tabular-nums font-bold text-[#152340]">
                        ₹{c.unitPrice.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                      </td>

                      {/* GST */}
                      <td className="py-2.5 px-3 text-[#6b7a93] font-medium">
                        {c.taxPercent ?? 12}%
                      </td>

                      {/* End Date */}
                      <td className="py-2.5 px-3 text-[#6b7a93] text-[11px] whitespace-nowrap">
                        {format(new Date(c.validityEndDate || c.endDate), "dd MMM yyyy")}
                      </td>

                      {/* Days Remaining */}
                      <td className="py-2.5 px-3">
                        {getExpiryBadge(c.validityEndDate || c.endDate)}
                      </td>

                      {/* Status */}
                      <td className="py-2.5 px-3">
                        <StatusBadge status={c.status} />
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <Link href={`/rate-contracts/${c.id}`}>
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
