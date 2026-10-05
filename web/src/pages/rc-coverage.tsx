import { useState, useMemo } from "react";
import { differenceInDays, format, addYears, addDays } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle, CheckCircle2, Clock, XCircle, Gavel,
  Search, ShieldAlert, Eye, Plus, RefreshCw, Loader2, Filter, Wrench
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useListRateContracts, useListEquipment, useListTenders, useListVendors,
  useCreateRateContract, useCreateTender,
  getListRateContractsQueryKey, getListTendersQueryKey,
  type RateContract,
} from "@/lib/api-hooks";
import { Link } from "wouter";

type CoverageStatus = "active_rc" | "expiring_soon" | "expired" | "tender_in_progress" | "no_coverage";

interface ItemCoverage {
  equipmentId: string | number;
  equipmentCode: string;
  equipmentName: string;
  category: string;
  status: CoverageStatus;
  rcNumber?: string;
  rcId?: string | number;
  rcExpiry?: string;
  daysRemaining?: number;
  vendorName?: string;
  vendorId?: string | number;
  tenderNumber?: string;
  tenderStatus?: string;
}

const STATUS_META: Record<CoverageStatus, {
  label: string; color: string; bg: string; border: string; icon: React.ElementType;
}> = {
  active_rc:          { label: "Active RC",           color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200", icon: CheckCircle2 },
  expiring_soon:      { label: "RC Expiring Soon",    color: "text-amber-700",   bg: "bg-amber-50",   border: "border-amber-200",   icon: Clock },
  expired:            { label: "RC Expired",          color: "text-red-700",     bg: "bg-red-50",     border: "border-red-200",     icon: XCircle },
  tender_in_progress: { label: "Tender in Progress",  color: "text-blue-700",    bg: "bg-blue-50",    border: "border-blue-200",    icon: Gavel },
  no_coverage:        { label: "RC Not Available",    color: "text-slate-600",   bg: "bg-slate-50",   border: "border-slate-200",   icon: ShieldAlert },
};

const KPI_FILTERS: Array<{ key: string; label: string; color: string }> = [
  { key: "all",               label: "Total Items",        color: "#6366f1" },
  { key: "active_rc",         label: "Active RC",          color: "#10b981" },
  { key: "expiring_soon",     label: "RC Expiring Soon",   color: "#f59e0b" },
  { key: "expired",           label: "RC Expired",         color: "#ef4444" },
  { key: "tender_in_progress",label: "Tender in Progress", color: "#3b82f6" },
  { key: "no_coverage",       label: "No Coverage",        color: "#94a3b8" },
];

function computeCoverage(
  equipmentList: any[],
  rateContracts: any[],
  tenders: any[],
): ItemCoverage[] {
  const today = new Date();
  return equipmentList.map((eq: any) => {
    const itemRCs = rateContracts.filter((rc: any) => String(rc.equipmentId) === String(eq.id));
    const activeRC = itemRCs.find((rc) => rc.status === "active" && new Date(rc.endDate) > today);
    const latestExpiredRC = itemRCs
      .filter((rc) => new Date(rc.endDate) <= today)
      .sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime())[0];

    const activeTender = tenders.find((t) => {
      const firstWord = eq.name.toLowerCase().split(" ")[0];
      return (
        t.equipmentName.toLowerCase().includes(firstWord) &&
        t.status !== "rc_created" &&
        t.status !== "awarded"
      );
    });

    if (activeRC) {
      const daysRemaining = differenceInDays(new Date(activeRC.endDate), today);
      return {
        equipmentId: eq.id, equipmentCode: eq.equipmentCode,
        equipmentName: eq.name, category: eq.category,
        status: daysRemaining <= 180 ? "expiring_soon" : "active_rc",
        rcId: activeRC.id, rcNumber: activeRC.contractNumber,
        rcExpiry: activeRC.endDate, daysRemaining,
        vendorName: activeRC.vendorName, vendorId: activeRC.vendorId,
      };
    }
    if (activeTender) {
      return {
        equipmentId: eq.id, equipmentCode: eq.equipmentCode,
        equipmentName: eq.name, category: eq.category,
        status: "tender_in_progress",
        tenderNumber: activeTender.tenderNumber, tenderStatus: activeTender.status,
      };
    }
    if (latestExpiredRC) {
      return {
        equipmentId: eq.id, equipmentCode: eq.equipmentCode,
        equipmentName: eq.name, category: eq.category,
        status: "expired",
        rcId: latestExpiredRC.id, rcNumber: latestExpiredRC.contractNumber,
        rcExpiry: latestExpiredRC.endDate,
        daysRemaining: differenceInDays(new Date(latestExpiredRC.endDate), today),
        vendorName: latestExpiredRC.vendorName, vendorId: latestExpiredRC.vendorId,
      };
    }
    return {
      equipmentId: eq.id, equipmentCode: eq.equipmentCode,
      equipmentName: eq.name, category: eq.category,
      status: "no_coverage",
    };
  });
}

type DrawerState =
  | { type: "renewRC";        coverage: ItemCoverage; sourceRC: RateContract }
  | { type: "newRC";          coverage: ItemCoverage }
  | { type: "initiateTender"; coverage: ItemCoverage }
  | null;

const EMPTY_RC_FORM = {
  equipmentId: "", vendorId: "", unitPrice: "",
  gstRate: "12", warrantyYears: "1",
  cmcCharges: "0", cmcStartYear: "2",
  startDate: "", endDate: "",
  camcApplicable: false,
  camcPeriodYears: "1",
  camcRatePerYear: "0",
};

function RCForm({
  form,
  setForm,
  vendors,
  equipment,
  lockedEquipmentId,
}: {
  form: typeof EMPTY_RC_FORM;
  setForm: (f: typeof EMPTY_RC_FORM) => void;
  vendors: { id: string | number; name: string }[];
  equipment: { id: string | number; name: string }[];
  lockedEquipmentId?: string;
}) {
  function f(k: keyof typeof EMPTY_RC_FORM, v: any) { setForm({ ...form, [k]: v }); }
  return (
    <div className="grid grid-cols-2 gap-4 py-2">
      <div className="col-span-2">
        <Label>Equipment *</Label>
        <Select value={form.equipmentId} onValueChange={(v) => f("equipmentId", v)} disabled={!!lockedEquipmentId}>
          <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select equipment…" /></SelectTrigger>
          <SelectContent>{equipment.map((e) => <SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="col-span-2">
        <Label>L1 Vendor / Bidder *</Label>
        <Select value={form.vendorId} onValueChange={(v) => f("vendorId", v)}>
          <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select vendor…" /></SelectTrigger>
          <SelectContent>{vendors.map((v) => <SelectItem key={v.id} value={String(v.id)}>{v.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div>
        <Label>Unit Price (₹) *</Label>
        <Input type="number" min="0" value={form.unitPrice} onChange={(e) => f("unitPrice", e.target.value)} placeholder="0.00" className="mt-1.5" />
      </div>
      <div>
        <Label>GST Rate (%) *</Label>
        <Select value={form.gstRate} onValueChange={(v) => f("gstRate", v)}>
          <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="5">5%</SelectItem>
            <SelectItem value="12">12%</SelectItem>
            <SelectItem value="18">18%</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Warranty (Years)</Label>
        <Input type="number" min="0" value={form.warrantyYears} onChange={(e) => f("warrantyYears", e.target.value)} className="mt-1.5" />
      </div>
      <div>
        <Label>CMC Start Year</Label>
        <Input type="number" min="1" value={form.cmcStartYear} onChange={(e) => f("cmcStartYear", e.target.value)} className="mt-1.5" />
      </div>
      <div className="col-span-2">
        <Label>CMC Annual Charges (₹)</Label>
        <Input type="number" min="0" value={form.cmcCharges} onChange={(e) => f("cmcCharges", e.target.value)} placeholder="0" className="mt-1.5" />
      </div>
      <div>
        <Label>Start Date *</Label>
        <Input type="date" value={form.startDate} onChange={(e) => f("startDate", e.target.value)} className="mt-1.5" />
      </div>
      <div>
        <Label>End Date *</Label>
        <Input type="date" value={form.endDate} onChange={(e) => f("endDate", e.target.value)} className="mt-1.5" />
      </div>

      <div className="col-span-2 pt-4 mt-2 border-t">
        <div className="flex items-center gap-2 mb-4">
          <Wrench className="h-4 w-4 text-slate-500" />
          <h3 className="font-semibold text-[#152340]">CAMC Details</h3>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center justify-between col-span-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div>
              <Label className="text-sm font-semibold">CAMC Applicable?</Label>
              <p className="text-xs text-muted-foreground">Comprehensive Annual Maintenance Contract</p>
            </div>
            <Switch 
              checked={form.camcApplicable as boolean} 
              onCheckedChange={(c) => f("camcApplicable", c)} 
            />
          </div>
          {form.camcApplicable && (
            <>
              <div>
                <Label>CAMC Period (Years) *</Label>
                <Input type="number" min="1" max="5" value={form.camcPeriodYears} onChange={(e) => f("camcPeriodYears", e.target.value)} className="mt-1.5" />
              </div>
              <div>
                <Label>CAMC Rate (₹/year) *</Label>
                <Input type="number" min="0" value={form.camcRatePerYear} onChange={(e) => f("camcRatePerYear", e.target.value)} placeholder="0.00" className="mt-1.5" />
              </div>
              <div className="col-span-2">
                <Label>Calculated CAMC Start Date</Label>
                <Input 
                  type="date" 
                  value={form.startDate && form.warrantyYears ? format(addDays(addYears(new Date(form.startDate), parseInt(form.warrantyYears || "0")), 1), 'yyyy-MM-dd') : ""}
                  readOnly 
                  className="mt-1.5 bg-muted/50 cursor-not-allowed" 
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function RCCoverage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [drawer, setDrawer] = useState<DrawerState>(null);
  const [rcForm, setRcForm] = useState(EMPTY_RC_FORM);
  const [tenderForm, setTenderForm] = useState({ tenderInvitedDate: "", notes: "" });

  const queryClient = useQueryClient();

  const { data: equipmentData = [], isLoading: eqLoading } = useListEquipment();
  const { data: rcData = [], isLoading: rcLoading } = useListRateContracts();
  const { data: tenderData = [], isLoading: tenderLoading } = useListTenders();
  const { data: vendors = [] } = useListVendors();

  const createRC = useCreateRateContract();
  const createTender = useCreateTender();

  const isLoading = eqLoading || rcLoading || tenderLoading;

  const coverage = useMemo(
    () => computeCoverage(equipmentData, rcData, tenderData),
    [equipmentData, rcData, tenderData],
  );

  const counts = useMemo(() => ({
    all:               coverage.length,
    active_rc:         coverage.filter((c) => c.status === "active_rc").length,
    expiring_soon:     coverage.filter((c) => c.status === "expiring_soon").length,
    expired:           coverage.filter((c) => c.status === "expired").length,
    tender_in_progress:coverage.filter((c) => c.status === "tender_in_progress").length,
    no_coverage:       coverage.filter((c) => c.status === "no_coverage").length,
  }), [coverage]);

  const filtered = coverage.filter((c) => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      c.equipmentName.toLowerCase().includes(q) ||
      c.equipmentCode.toLowerCase().includes(q) ||
      (c.rcNumber ?? "").toLowerCase().includes(q) ||
      (c.vendorName ?? "").toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const expiredCount    = counts.expired;
  const expiringCount   = counts.expiring_soon;
  const noCoverageCount = counts.no_coverage;

  function openRenewRC(c: ItemCoverage) {
    const sourceRC = rcData.find((r) => r.contractNumber === c.rcNumber);
    if (!sourceRC) return;
    setRcForm({
      equipmentId: String(c.equipmentId),
      vendorId: String(sourceRC.vendorId),
      unitPrice: String(sourceRC.unitPrice),
      gstRate: String(sourceRC.gstRate),
      warrantyYears: String(sourceRC.warrantyYears ?? 1),
      cmcCharges: String(sourceRC.cmcCharges ?? 0),
      cmcStartYear: String(sourceRC.cmcStartYear ?? 2),
      startDate: "",
      endDate: "",
      camcApplicable: sourceRC.camcApplicable ?? false,
      camcPeriodYears: String(sourceRC.camcPeriodYears ?? 1),
      camcRatePerYear: String(sourceRC.camcRatePerYear ?? 0),
    });
    setDrawer({ type: "renewRC", coverage: c, sourceRC });
  }

  function openNewRC(c: ItemCoverage) {
    setRcForm({ ...EMPTY_RC_FORM, equipmentId: String(c.equipmentId) });
    setDrawer({ type: "newRC", coverage: c });
  }

  function openInitiateTender(c: ItemCoverage) {
    setTenderForm({ tenderInvitedDate: "", notes: "" });
    setDrawer({ type: "initiateTender", coverage: c });
  }

  function closeDrawer() { setDrawer(null); }

  function invalidateCoverage() {
    queryClient.invalidateQueries({ queryKey: getListRateContractsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getListTendersQueryKey() });
  }

  const rcFormValid = rcForm.equipmentId && rcForm.vendorId && rcForm.unitPrice && rcForm.startDate && rcForm.endDate;

  function submitRC(e: React.FormEvent) {
    e.preventDefault();
    createRC.mutate({
      data: {
        equipmentId: rcForm.equipmentId,
        vendorId: rcForm.vendorId,
        unitPrice: parseFloat(rcForm.unitPrice),
        gstRate: parseFloat(rcForm.gstRate),
        warrantyYears: parseInt(rcForm.warrantyYears),
        cmcCharges: parseFloat(rcForm.cmcCharges || "0"),
        cmcStartYear: parseInt(rcForm.cmcStartYear),
        startDate: rcForm.startDate,
        endDate: rcForm.endDate,
        camcApplicable: rcForm.camcApplicable,
        camcPeriodYears: parseInt(rcForm.camcPeriodYears || "0"),
        camcRatePerYear: parseFloat(rcForm.camcRatePerYear || "0"),
      }
    }, {
      onSuccess: () => {
        invalidateCoverage();
        closeDrawer();
      }
    });
  }

  function submitTender(e: React.FormEvent) {
    e.preventDefault();
    if (!drawer || drawer.type !== "initiateTender") return;
    createTender.mutate({
      data: {
        indentId: 0,
        tenderInvitedDate: tenderForm.tenderInvitedDate,
        notes: tenderForm.notes || undefined,
      }
    }, {
      onSuccess: () => {
        invalidateCoverage();
        closeDrawer();
      }
    });
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header — matches rate-contracts.tsx style */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#152340]">RC Coverage Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Item-wise Rate Contract coverage status across all tracked products
          </p>
        </div>
      </div>

      {/* KPI Summary Ribbon — neo-kpi-card style matching rate-contracts.tsx */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {KPI_FILTERS.map((kpi) => {
          const count = counts[kpi.key as keyof typeof counts];
          const active = statusFilter === kpi.key;
          return (
            <div
              key={kpi.key}
              onClick={() => setStatusFilter(active ? "all" : kpi.key)}
              className={cn(
                "neo-kpi-card cursor-pointer transition-all",
                active ? "ring-2 shadow-md" : "hover:shadow-md"
              )}
              style={active ? { outline: `2px solid ${kpi.color}`, outlineOffset: '2px' } : {}}
            >
              <span className="text-[10px] font-bold uppercase tracking-wider block" style={{ color: active ? kpi.color : "#6b7a93" }}>
                {kpi.label}
              </span>
              <span className="text-2xl font-bold tabular-nums mt-1 block" style={{ color: kpi.color }}>
                {count}
              </span>
              <span className="text-[10.5px] text-[#6b7a93] mt-1 block">
                {active ? "Click to clear" : "Click to filter"}
              </span>
            </div>
          );
        })}
      </div>

      {/* Alert banners */}
      {expiredCount > 0 && (
        <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <XCircle className="h-4 w-4 text-red-600 shrink-0" />
          <p className="text-sm text-red-800 font-medium">
            {expiredCount} item{expiredCount > 1 ? "s" : ""} with <strong>expired</strong> RCs — immediate renewal or tendering action required
          </p>
          <Button size="sm" variant="outline" className="ml-auto h-7 text-xs border-red-300 text-red-700" onClick={() => setStatusFilter("expired")}>
            View
          </Button>
        </div>
      )}
      {expiringCount > 0 && (
        <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800 font-medium">
            {expiringCount} RC{expiringCount > 1 ? "s" : ""} expiring within <strong>180 days</strong> — initiate renewal or new tender now
          </p>
          <Button size="sm" variant="outline" className="ml-auto h-7 text-xs border-amber-300 text-amber-700" onClick={() => setStatusFilter("expiring_soon")}>
            Review
          </Button>
        </div>
      )}
      {noCoverageCount > 0 && (
        <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
          <ShieldAlert className="h-4 w-4 text-slate-500 shrink-0" />
          <p className="text-sm text-slate-700 font-medium">
            {noCoverageCount} item{noCoverageCount > 1 ? "s" : ""} with no RC and no active tender
          </p>
          <Button size="sm" variant="outline" className="ml-auto h-7 text-xs" onClick={() => setStatusFilter("no_coverage")}>
            View
          </Button>
        </div>
      )}

      {/* Table Card — styled identically to rate-contracts.tsx */}
      <div className="bg-white border border-[#e4eaf2] rounded-xl shadow-xs overflow-hidden">
        {/* Filter Bar */}
        <div className="p-3 border-b border-[#e4eaf2] bg-[#f8fafc] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#93a2b8] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by name, code, RC no., or vendor…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-[32px] bg-white border border-[#e4eaf2] rounded-md text-xs text-[#152340] placeholder:text-[#93a2b8] pl-9 pr-3 focus:outline-none focus:border-[#2563eb]"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-[#6b7a93]" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-56 h-[32px] text-xs bg-white border-[#e4eaf2] rounded-md">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All Statuses</SelectItem>
                <SelectItem value="active_rc" className="text-xs">Active RC</SelectItem>
                <SelectItem value="expiring_soon" className="text-xs">RC Expiring Soon (≤ 180 days)</SelectItem>
                <SelectItem value="expired" className="text-xs">RC Expired</SelectItem>
                <SelectItem value="tender_in_progress" className="text-xs">Tender in Progress</SelectItem>
                <SelectItem value="no_coverage" className="text-xs">No Coverage</SelectItem>
              </SelectContent>
            </Select>

            <span className="text-xs font-medium text-[#6b7a93] ml-2">
              Showing <span className="font-bold text-[#152340]">{filtered.length}</span> of {coverage.length} items
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#e4eaf2] bg-[#f8fafc] text-[#6b7a93] font-bold uppercase tracking-wider text-[10.5px]">
                <th className="py-2.5 px-3">Item Code</th>
                <th className="py-2.5 px-3">Item / Product Name</th>
                <th className="py-2.5 px-3">RC Status</th>
                <th className="py-2.5 px-3">RC / Tender No.</th>
                <th className="py-2.5 px-3">Expiry Date</th>
                <th className="py-2.5 px-3">Days Remaining</th>
                <th className="py-2.5 px-3">Vendor / Tender Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eff3f8]">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-16 text-center text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                      Loading coverage data…
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-16 text-center text-muted-foreground">
                      No items match the current filter.
                    </td>
                  </tr>
                ) : (
                  filtered.map((c) => {
                    const meta = STATUS_META[c.status];
                    const Icon = meta.icon;
                    return (
                      <tr key={c.equipmentId} className="hover:bg-[#eff5ff] border-b border-[#eff3f8] transition-colors">
                        <td className="py-2.5 px-3 font-mono text-xs font-bold text-[#2563eb]">{c.equipmentCode}</td>
                        <td className="py-2.5 px-3">
                          <p className="font-semibold text-[#152340]">{c.equipmentName}</p>
                          <p className="text-[11px] text-[#6b7a93] capitalize mt-0.5">
                            {c.category.replace(/_/g, " ")}
                          </p>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={cn(
                            "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border",
                            meta.bg, meta.color, meta.border
                          )}>
                            <Icon className="h-3 w-3" />
                            {meta.label}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-xs font-medium text-[#152340]">
                          {c.rcNumber ?? c.tenderNumber ?? (
                            <span className="text-[#93a2b8]">—</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-xs text-[#3c4a63]">
                          {c.rcExpiry
                            ? format(new Date(c.rcExpiry), "dd MMM yyyy")
                            : <span className="text-[#93a2b8]">—</span>}
                        </td>
                        <td className="py-2.5 px-3">
                          {c.daysRemaining != null ? (
                            <span className={cn(
                              "font-semibold tabular-nums text-xs",
                              c.daysRemaining < 0 ? "text-[#dc2f3c] font-bold" :
                              c.daysRemaining <= 90 ? "text-[#e08a0b] font-bold" :
                              c.daysRemaining <= 180 ? "text-amber-500" : "text-[#159557]"
                            )}>
                              {c.daysRemaining < 0
                                ? `${Math.abs(c.daysRemaining)}d overdue`
                                : `${c.daysRemaining}d`}
                            </span>
                          ) : <span className="text-[#93a2b8]">—</span>}
                        </td>
                        <td className="py-2.5 px-3 text-xs text-[#3c4a63] max-w-[200px] truncate">
                          {c.vendorName
                            ?? (c.tenderStatus ? c.tenderStatus.replace(/_/g, " ") : "—")}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <ActionCell coverage={c} onRenewRC={openRenewRC} onNewRC={openNewRC} onInitiateTender={openInitiateTender} />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Business Rules legend */}
      <div className="p-4 bg-slate-50 border rounded-lg text-xs text-slate-600 space-y-1">
        <p className="font-semibold text-slate-700 mb-2">Coverage Classification Rules</p>
        <p><span className="text-emerald-600 font-medium">Active RC</span> — Valid RC exists with endDate &gt; today and endDate &gt; 180 days away</p>
        <p><span className="text-amber-600 font-medium">RC Expiring Soon</span> — Active RC but expiry within <strong>180 days</strong> (BR-09: minimum 6-month advance alert)</p>
        <p><span className="text-red-600 font-medium">RC Expired</span> — All RCs for this item have passed their end date</p>
        <p><span className="text-blue-600 font-medium">Tender in Progress</span> — No active RC but a tender is underway for this item</p>
        <p><span className="text-slate-500 font-medium">RC Not Available</span> — No RC and no tender exists for this item</p>
      </div>

      {/* ── Renew RC / New RC Drawer ── */}
      <Sheet open={drawer?.type === "renewRC" || drawer?.type === "newRC"} onOpenChange={(open) => !open && closeDrawer()}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader className="mb-4">
            <SheetTitle>
              {drawer?.type === "renewRC" ? "Renew Rate Contract" : "New Rate Contract"}
            </SheetTitle>
            <SheetDescription>
              {drawer?.type === "renewRC"
                ? `Creating a renewed RC for ${drawer?.coverage.equipmentName}. The previous RC (${drawer?.coverage.rcNumber}) will be superseded.`
                : `Creating a new Rate Contract for ${drawer?.type === "newRC" ? drawer?.coverage.equipmentName : ""}.`}
            </SheetDescription>
          </SheetHeader>

          {drawer?.type === "renewRC" && drawer.sourceRC && (
            <div className="mb-6">
              <Card className="border-[#e4eaf2] shadow-sm">
                <CardHeader className="py-3 px-4 bg-[#f8fafc] border-b border-[#e4eaf2]">
                  <div className="flex items-center gap-2">
                    <Wrench className="h-4 w-4 text-[#6b7a93]" />
                    <h4 className="font-semibold text-[#152340] text-sm">Previous RC CAMC Details</h4>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-medium text-[#3c4a63]">CAMC Applicable</span>
                    {drawer.sourceRC.camcApplicable ? (
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">Yes</Badge>
                    ) : (
                      <Badge className="bg-slate-50 text-slate-700 border-slate-200">No</Badge>
                    )}
                  </div>
                  {drawer.sourceRC.camcApplicable && (
                    <div className="grid grid-cols-2 gap-4 pt-3 border-t border-[#e4eaf2]">
                      <div>
                        <p className="text-xs text-[#6b7a93] mb-1">Period</p>
                        <p className="text-sm font-medium text-[#152340]">{drawer.sourceRC.camcPeriodYears} years</p>
                      </div>
                      <div>
                        <p className="text-xs text-[#6b7a93] mb-1">Annual Rate</p>
                        <p className="text-sm font-medium text-[#152340]">₹{drawer.sourceRC.camcRatePerYear?.toLocaleString()}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-xs text-[#6b7a93] mb-1">Start Date</p>
                        <p className="text-sm font-medium text-[#152340]">
                          {drawer.sourceRC.camcStartDate ? format(new Date(drawer.sourceRC.camcStartDate), 'dd MMM yyyy') : '—'}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          <form onSubmit={submitRC} className="space-y-1">
            {(drawer?.type === "renewRC" || drawer?.type === "newRC") && (
              <RCForm
                form={rcForm}
                setForm={setRcForm}
                vendors={vendors}
                equipment={equipmentData}
                lockedEquipmentId={String(drawer.coverage.equipmentId)}
              />
            )}
            <SheetFooter className="pt-4">
              <Button type="button" variant="outline" onClick={closeDrawer}>Cancel</Button>
              <Button
                type="submit"
                disabled={createRC.isPending || !rcFormValid}
              >
                {createRC.isPending
                  ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving…</>
                  : drawer?.type === "renewRC" ? <><RefreshCw className="h-4 w-4 mr-2" />Renew RC</> : <><Plus className="h-4 w-4 mr-2" />Create RC</>}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      {/* ── Initiate Tender Drawer ── */}
      <Sheet open={drawer?.type === "initiateTender"} onOpenChange={(open) => !open && closeDrawer()}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="mb-4">
            <SheetTitle>Initiate Tender</SheetTitle>
            <SheetDescription>
              {drawer?.type === "initiateTender" && (
                <>Starting a new tender for <strong>{drawer.coverage.equipmentName}</strong>.</>
              )}
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={submitTender} className="space-y-4">
            {drawer?.type === "initiateTender" && (
              <>
                <div>
                  <Label>Equipment</Label>
                  <Input value={drawer.coverage.equipmentName} readOnly className="mt-1.5 bg-muted/50 cursor-not-allowed" />
                </div>
                <div>
                  <Label>Tender Invited Date *</Label>
                  <Input
                    type="date"
                    value={tenderForm.tenderInvitedDate}
                    onChange={(e) => setTenderForm({ ...tenderForm, tenderInvitedDate: e.target.value })}
                    className="mt-1.5"
                    required
                  />
                </div>
                <div>
                  <Label>Notes</Label>
                  <textarea
                    value={tenderForm.notes}
                    onChange={(e) => setTenderForm({ ...tenderForm, notes: e.target.value })}
                    placeholder="Publication details, EMD amount, bid validity…"
                    rows={4}
                    className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                  />
                </div>
              </>
            )}
            <SheetFooter className="pt-2">
              <Button type="button" variant="outline" onClick={closeDrawer}>Cancel</Button>
              <Button
                type="submit"
                disabled={createTender.isPending || !tenderForm.tenderInvitedDate}
              >
                {createTender.isPending
                  ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving…</>
                  : <><Gavel className="h-4 w-4 mr-2" />Initiate Tender</>}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function ActionCell({
  coverage: c,
  onRenewRC,
  onNewRC,
  onInitiateTender,
}: {
  coverage: ItemCoverage;
  onRenewRC: (c: ItemCoverage) => void;
  onNewRC: (c: ItemCoverage) => void;
  onInitiateTender: (c: ItemCoverage) => void;
}) {
  if (c.status === "active_rc") {
    return (
      <Link href="/rate-contracts">
        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
          <Eye className="h-3 w-3" />View RC
        </Button>
      </Link>
    );
  }

  if (c.status === "expiring_soon" || c.status === "expired") {
    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1 border-amber-300 text-amber-700 hover:bg-amber-50"
          onClick={() => onRenewRC(c)}
        >
          <RefreshCw className="h-3 w-3" />Renew RC
        </Button>
        <Link href="/rate-contracts">
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
            <Eye className="h-3 w-3" />View
          </Button>
        </Link>
      </div>
    );
  }

  if (c.status === "tender_in_progress") {
    return (
      <Link href="/tenders">
        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
          <Eye className="h-3 w-3" />View Tender
        </Button>
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <Button
        variant="outline"
        size="sm"
        className="h-7 text-xs gap-1 text-primary border-primary/30"
        onClick={() => onNewRC(c)}
      >
        <Plus className="h-3 w-3" />New RC
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="h-7 text-xs gap-1 text-blue-700 border-blue-300 hover:bg-blue-50"
        onClick={() => onInitiateTender(c)}
      >
        <Gavel className="h-3 w-3" />Initiate Tender
      </Button>
    </div>
  );
}
