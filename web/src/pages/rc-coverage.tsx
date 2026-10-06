import { useState, useMemo, useEffect } from "react";
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
  Search, ShieldAlert, Eye, Plus, RefreshCw, Loader2, Filter, Wrench,
  Building2, ChevronLeft, ChevronRight, ArrowRight, FileCheck
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useListRateContracts, useListEquipment, useListTenders, useListVendors,
  useCreateRateContract, useCreateTender,
  getListRateContractsQueryKey, getListTendersQueryKey,
  type RateContract,
} from "@/lib/api-hooks";
import { Link, useLocation } from "wouter";

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
  unitPrice?: number;
  gstRate?: number;
}

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
        equipmentId: eq.id,
        equipmentCode: eq.equipmentCode,
        equipmentName: eq.name,
        category: eq.category,
        status: daysRemaining <= 180 ? "expiring_soon" : "active_rc",
        rcId: activeRC.id,
        rcNumber: activeRC.contractNumber,
        rcExpiry: activeRC.endDate,
        daysRemaining,
        vendorName: activeRC.vendorName,
        vendorId: activeRC.vendorId,
        unitPrice: activeRC.unitPrice,
        gstRate: activeRC.taxPercent ?? activeRC.gstRate,
      };
    }
    if (activeTender) {
      return {
        equipmentId: eq.id,
        equipmentCode: eq.equipmentCode,
        equipmentName: eq.name,
        category: eq.category,
        status: "tender_in_progress",
        tenderNumber: activeTender.tenderNumber,
        tenderStatus: activeTender.status,
        unitPrice: eq.estimatedUnitCost,
        gstRate: eq.gstRate,
      };
    }
    if (latestExpiredRC) {
      return {
        equipmentId: eq.id,
        equipmentCode: eq.equipmentCode,
        equipmentName: eq.name,
        category: eq.category,
        status: "expired",
        rcId: latestExpiredRC.id,
        rcNumber: latestExpiredRC.contractNumber,
        rcExpiry: latestExpiredRC.endDate,
        daysRemaining: differenceInDays(new Date(latestExpiredRC.endDate), today),
        vendorName: latestExpiredRC.vendorName,
        vendorId: latestExpiredRC.vendorId,
        unitPrice: latestExpiredRC.unitPrice,
        gstRate: latestExpiredRC.taxPercent ?? latestExpiredRC.gstRate,
      };
    }
    return {
      equipmentId: eq.id,
      equipmentCode: eq.equipmentCode,
      equipmentName: eq.name,
      category: eq.category,
      status: "no_coverage",
      unitPrice: eq.estimatedUnitCost,
      gstRate: eq.gstRate,
    };
  });
}

type DrawerState =
  | { type: "renewRC"; coverage: ItemCoverage; sourceRC: RateContract }
  | { type: "newRC"; coverage: ItemCoverage }
  | { type: "initiateTender"; coverage: ItemCoverage }
  | null;

const EMPTY_RC_FORM = {
  equipmentId: "",
  vendorId: "",
  unitPrice: "",
  gstRate: "12",
  warrantyYears: "1",
  cmcCharges: "0",
  cmcStartYear: "2",
  startDate: "",
  endDate: "",
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
  function f(k: keyof typeof EMPTY_RC_FORM, v: any) {
    setForm({ ...form, [k]: v });
  }

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
  const [equipmentFilter, setEquipmentFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [, navigate] = useLocation();

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

  const equipmentOptions = useMemo(() => {
    return [...equipmentData]
      .filter((eq: any) => eq.name)
      .sort((a: any, b: any) => (a.name || "").localeCompare(b.name || ""));
  }, [equipmentData]);

  const counts = useMemo(() => ({
    all:                coverage.length,
    active_rc:          coverage.filter((c) => c.status === "active_rc").length,
    expiring_soon:      coverage.filter((c) => c.status === "expiring_soon").length,
    expired:            coverage.filter((c) => c.status === "expired").length,
    tender_in_progress: coverage.filter((c) => c.status === "tender_in_progress").length,
    no_coverage:        coverage.filter((c) => c.status === "no_coverage").length,
  }), [coverage]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return coverage.filter((c) => {
      const matchSearch =
        !q ||
        c.equipmentName.toLowerCase().includes(q) ||
        c.equipmentCode.toLowerCase().includes(q) ||
        (c.rcNumber ?? "").toLowerCase().includes(q) ||
        (c.vendorName ?? "").toLowerCase().includes(q) ||
        (c.tenderNumber ?? "").toLowerCase().includes(q);
      const matchStatus = statusFilter === "all" || c.status === statusFilter;
      const matchEquipment = equipmentFilter === "all" || String(c.equipmentId) === equipmentFilter;
      return matchSearch && matchStatus && matchEquipment;
    });
  }, [coverage, search, statusFilter, equipmentFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  // Reset page when search or any filter changes
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, equipmentFilter, pageSize]);

  const paginatedItems = useMemo(() => {
    const startIndex = (page - 1) * pageSize;
    return filtered.slice(startIndex, startIndex + pageSize);
  }, [filtered, page, pageSize]);

  function getExpiryBadge(daysRemaining?: number) {
    if (daysRemaining === undefined || daysRemaining === null) {
      return <span className="text-[#93a2b8] font-mono text-[11px]">—</span>;
    }
    if (daysRemaining < 0) return <span className="neo-chip red">{Math.abs(daysRemaining)}d overdue</span>;
    if (daysRemaining <= 30) return <span className="neo-chip red">{daysRemaining}d left</span>;
    if (daysRemaining <= 90) return <span className="neo-chip amb">{daysRemaining}d left</span>;
    if (daysRemaining <= 180) return <span className="neo-chip amb">{daysRemaining}d left</span>;
    return <span className="neo-chip grn">{daysRemaining}d left</span>;
  }

  function getCoverageBadge(status: CoverageStatus) {
    switch (status) {
      case "active_rc":
        return (
          <span className="neo-chip grn inline-flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>Active RC</span>
          </span>
        );
      case "expiring_soon":
        return (
          <span className="neo-chip amb inline-flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>Expiring Soon</span>
          </span>
        );
      case "expired":
        return (
          <span className="neo-chip red inline-flex items-center gap-1">
            <XCircle className="w-3 h-3" />
            <span>Expired</span>
          </span>
        );
      case "tender_in_progress":
        return (
          <span className="neo-chip blu inline-flex items-center gap-1">
            <Gavel className="w-3 h-3" />
            <span>Tender Active</span>
          </span>
        );
      case "no_coverage":
        return (
          <span className="neo-chip gry inline-flex items-center gap-1">
            <ShieldAlert className="w-3 h-3" />
            <span>No Coverage</span>
          </span>
        );
    }
  }

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

  function closeDrawer() {
    setDrawer(null);
  }

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
    <div className="space-y-4">
      {/* ── Page Header (neoInt Style aligned with Rate Contracts) ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#e4eaf2] pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#152340]">
              Rate Contract Coverage
            </h1>
            <span className="neo-chip gry">Statutory Coverage Ledger</span>
          </div>
          <p className="text-xs text-[#6b7a93] mt-0.5">
            Item-wise Rate Contract mapping, validity tracking, and statutory price protections across medical equipment catalog
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/rate-contracts">
            <Button size="sm" variant="outline" className="gap-1.5 cursor-pointer text-xs">
              <FileCheck className="w-3.5 h-3.5 text-[#2563eb]" />
              <span>Rate Contracts</span>
            </Button>
          </Link>
          <Link href="/rate-contracts/new">
            <Button size="sm" className="gap-1.5 cursor-pointer text-xs">
              <Plus className="w-3.5 h-3.5" />
              <span>New Contract</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* ── Summary Ribbon (neo-kpi-card aligned with Rate Contracts) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div
          onClick={() => { setStatusFilter("all"); setPage(1); }}
          className={cn(
            "neo-kpi-card cursor-pointer transition-all",
            statusFilter === "all" ? "ring-2 ring-[#2563eb] shadow-xs" : "hover:shadow-xs"
          )}
        >
          <span className="text-[10px] font-bold text-[#6b7a93] uppercase tracking-wider block">
            Total Equipment
          </span>
          <span className="text-2xl font-bold text-[#152340] tabular-nums mt-1 block">
            {counts.all}
          </span>
          <span className="text-[10.5px] text-[#6b7a93] mt-1 block">Tracked catalog items</span>
        </div>

        <div
          onClick={() => { setStatusFilter(statusFilter === "active_rc" ? "all" : "active_rc"); setPage(1); }}
          className={cn(
            "neo-kpi-card cursor-pointer transition-all",
            statusFilter === "active_rc" ? "ring-2 ring-[#159557] shadow-xs" : "hover:shadow-xs"
          )}
        >
          <span className="text-[10px] font-bold text-[#159557] uppercase tracking-wider block">
            Active RC Covered
          </span>
          <span className="text-2xl font-bold text-[#159557] tabular-nums mt-1 block">
            {counts.active_rc}
          </span>
          <span className="text-[10.5px] text-[#159557] font-semibold mt-1 block">
            {counts.all > 0 ? Math.round((counts.active_rc / counts.all) * 100) : 0}% coverage
          </span>
        </div>

        <div
          onClick={() => { setStatusFilter(statusFilter === "expiring_soon" ? "all" : "expiring_soon"); setPage(1); }}
          className={cn(
            "neo-kpi-card cursor-pointer transition-all",
            statusFilter === "expiring_soon" ? "ring-2 ring-[#e08a0b] shadow-xs" : "hover:shadow-xs"
          )}
        >
          <span className="text-[10px] font-bold text-[#e08a0b] uppercase tracking-wider block">
            Expiring in 180d
          </span>
          <span className="text-2xl font-bold text-[#e08a0b] tabular-nums mt-1 block">
            {counts.expiring_soon}
          </span>
          <span className="text-[10.5px] text-[#e08a0b] font-semibold mt-1 block">BR-09 advance alert</span>
        </div>

        <div
          onClick={() => { setStatusFilter(statusFilter === "expired" ? "all" : "expired"); setPage(1); }}
          className={cn(
            "neo-kpi-card cursor-pointer transition-all",
            statusFilter === "expired" ? "ring-2 ring-[#dc2f3c] shadow-xs" : "hover:shadow-xs"
          )}
        >
          <span className="text-[10px] font-bold text-[#dc2f3c] uppercase tracking-wider block">
            Expired RCs
          </span>
          <span className="text-2xl font-bold text-[#dc2f3c] tabular-nums mt-1 block">
            {counts.expired}
          </span>
          <span className="text-[10.5px] text-[#dc2f3c] font-semibold mt-1 block">Requires re-tendering</span>
        </div>

        <div
          onClick={() => { setStatusFilter(statusFilter === "tender_in_progress" ? "all" : "tender_in_progress"); setPage(1); }}
          className={cn(
            "neo-kpi-card cursor-pointer transition-all",
            statusFilter === "tender_in_progress" ? "ring-2 ring-[#2563eb] shadow-xs" : "hover:shadow-xs"
          )}
        >
          <span className="text-[10px] font-bold text-[#2563eb] uppercase tracking-wider block">
            Tender Active
          </span>
          <span className="text-2xl font-bold text-[#2563eb] tabular-nums mt-1 block">
            {counts.tender_in_progress}
          </span>
          <span className="text-[10.5px] text-[#2563eb] mt-1 block">Procurement underway</span>
        </div>

        <div
          onClick={() => { setStatusFilter(statusFilter === "no_coverage" ? "all" : "no_coverage"); setPage(1); }}
          className={cn(
            "neo-kpi-card cursor-pointer transition-all",
            statusFilter === "no_coverage" ? "ring-2 ring-[#64748b] shadow-xs" : "hover:shadow-xs"
          )}
        >
          <span className="text-[10px] font-bold text-[#64748b] uppercase tracking-wider block">
            RC Not Available
          </span>
          <span className="text-2xl font-bold text-[#64748b] tabular-nums mt-1 block">
            {counts.no_coverage}
          </span>
          <span className="text-[10.5px] text-[#6b7a93] mt-1 block">Open tender route</span>
        </div>
      </div>

      {/* ── Expiring / Expired RC Attention Callouts (neo-att-c style) ── */}
      {(counts.expiring_soon > 0 || counts.expired > 0) && (
        <div className="neo-att-c amb">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white shadow-xs flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4 text-[#e08a0b]" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#152340]">
                  {counts.expiring_soon + counts.expired} Equipment line{counts.expiring_soon + counts.expired > 1 ? "s" : ""} require contract renewal or fresh tender publication (BR-09)
                </p>
                <p className="text-[11px] text-[#3c4a63]">
                  {counts.expired > 0 ? `${counts.expired} RCs have expired and ` : ""}{counts.expiring_soon} RCs expire within statutory 180-day window. Initiate tender actions to maintain uninterrupted hospital supply.
                </p>
              </div>
            </div>
            <Link href="/tenders/workbench">
              <button className="px-3 py-1.5 bg-[#0f2b5b] hover:bg-[#0a2149] text-white text-xs font-semibold rounded-md flex items-center gap-1.5 transition-colors cursor-pointer shrink-0">
                <span>Open Tender Workbench</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </Link>
          </div>
        </div>
      )}

      {/* ── Table Card ── */}
      <div className="bg-white border border-[#e4eaf2] rounded-xl shadow-xs overflow-hidden">
        {/* Filter Bar with Search, Status Filter & Equipment Filter */}
        <div className="p-3 border-b border-[#e4eaf2] bg-[#f8fafc] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#93a2b8] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by equipment, code, RC no., vendor..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-[32px] bg-white border border-[#e4eaf2] rounded-md text-xs text-[#152340] placeholder:text-[#93a2b8] pl-9 pr-3 focus:outline-none focus:border-[#2563eb]"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-3.5 h-3.5 text-[#6b7a93] shrink-0" />
            
            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); setPage(1); }}>
              <SelectTrigger className="w-36 sm:w-44 h-[32px] text-xs bg-white border-[#e4eaf2] rounded-md">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All Statuses</SelectItem>
                <SelectItem value="active_rc" className="text-xs">Active RC</SelectItem>
                <SelectItem value="expiring_soon" className="text-xs">RC Expiring Soon (≤ 180d)</SelectItem>
                <SelectItem value="expired" className="text-xs">RC Expired</SelectItem>
                <SelectItem value="tender_in_progress" className="text-xs">Tender in Progress</SelectItem>
                <SelectItem value="no_coverage" className="text-xs">No Coverage</SelectItem>
              </SelectContent>
            </Select>

            {/* Equipment Filter */}
            <Select value={equipmentFilter} onValueChange={(val) => { setEquipmentFilter(val); setPage(1); }}>
              <SelectTrigger className="w-44 sm:w-56 h-[32px] text-xs bg-white border-[#e4eaf2] rounded-md text-[#152340]">
                <SelectValue placeholder="All Equipment" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                <SelectItem value="all" className="text-xs">All Equipment</SelectItem>
                {equipmentOptions.map((eq: any) => (
                  <SelectItem key={eq.id} value={String(eq.id)} className="text-xs">
                    {eq.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <span className="text-xs font-medium text-[#6b7a93] ml-1 whitespace-nowrap">
              Showing <span className="font-bold text-[#152340]">{filtered.length}</span> of {coverage.length}
            </span>
          </div>
        </div>

        {/* Table Body */}
        {isLoading ? (
          <div className="py-16 text-center">
            <div className="w-6 h-6 border-2 border-[#2563eb] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs text-[#6b7a93]">Loading rate contract coverage…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <FileCheck className="w-8 h-8 text-[#93a2b8] mx-auto mb-2" />
            <p className="text-xs font-semibold text-[#152340]">No equipment coverage matches your filter criteria</p>
            <p className="text-[11px] text-[#6b7a93] mt-0.5">Try clearing the search or changing status/equipment filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#e4eaf2] bg-[#f8fafc] text-[#6b7a93] font-bold uppercase tracking-wider text-[10.5px]">
                  <th className="py-2.5 px-3">Item Code</th>
                  <th className="py-2.5 px-3">Equipment / Supply</th>
                  <th className="py-2.5 px-3">Active RC / Tender</th>
                  <th className="py-2.5 px-3">Empanelled Vendor</th>
                  <th className="py-2.5 px-3">Base Unit Price</th>
                  <th className="py-2.5 px-3">Validity End</th>
                  <th className="py-2.5 px-3">Days Remaining</th>
                  <th className="py-2.5 px-3">Coverage Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eff3f8]">
                {paginatedItems.map((c) => {
                  return (
                    <tr
                      key={c.equipmentId}
                      className="hover:bg-[#eff5ff] cursor-pointer transition-colors group"
                      onClick={() => {
                        if (c.rcId) {
                          navigate(`/rate-contracts/${c.rcId}`);
                        }
                      }}
                    >
                      {/* Item Code */}
                      <td className="py-2.5 px-3 align-middle">
                        <span className="font-mono font-bold text-[#2563eb] text-[11.5px] group-hover:underline">
                          {c.equipmentCode}
                        </span>
                      </td>

                      {/* Equipment / Supply */}
                      <td className="py-2.5 px-3 align-middle">
                        <span className="font-medium text-[#152340] truncate max-w-[210px] block" title={c.equipmentName}>
                          {c.equipmentName}
                        </span>
                        <span className="text-[10px] text-[#6b7a93] capitalize block truncate max-w-[210px]">
                          {c.category?.replace(/_/g, " ")}
                        </span>
                      </td>

                      {/* Active RC / Tender */}
                      <td className="py-2.5 px-3 align-middle" onClick={(e) => e.stopPropagation()}>
                        {c.rcNumber ? (
                          <Link href={c.rcId ? `/rate-contracts/${c.rcId}` : `/rate-contracts`}>
                            <span className="font-mono font-bold text-[#2563eb] text-[11px] hover:underline cursor-pointer block truncate max-w-[150px]">
                              {c.rcNumber}
                            </span>
                          </Link>
                        ) : c.tenderNumber ? (
                          <Link href="/tenders">
                            <span className="font-mono text-[#0284c7] text-[11px] font-semibold hover:underline cursor-pointer block truncate max-w-[150px]">
                              {c.tenderNumber}
                            </span>
                          </Link>
                        ) : (
                          <span className="text-[#93a2b8] font-mono text-[11px]">—</span>
                        )}
                      </td>

                      {/* Empanelled Vendor */}
                      <td className="py-2.5 px-3 align-middle">
                        {c.vendorName ? (
                          <div className="flex items-center gap-1.5" title={c.vendorName}>
                            <Building2 className="w-3.5 h-3.5 text-[#6b7a93] shrink-0" />
                            <span className="font-medium text-[#3c4a63] truncate max-w-[180px]">
                              {c.vendorName}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[#93a2b8]">—</span>
                        )}
                      </td>

                      {/* Base Unit Price */}
                      <td className="py-2.5 px-3 tabular-nums font-bold text-[#152340] align-middle whitespace-nowrap">
                        {c.unitPrice ? `₹${c.unitPrice.toLocaleString("en-IN", { maximumFractionDigits: 0 })}` : "—"}
                      </td>

                      {/* Validity End */}
                      <td className="py-2.5 px-3 text-[#6b7a93] text-[11px] whitespace-nowrap align-middle">
                        {c.rcExpiry ? format(new Date(c.rcExpiry), "dd MMM yyyy") : "—"}
                      </td>

                      {/* Days Remaining */}
                      <td className="py-2.5 px-3 align-middle whitespace-nowrap">
                        {getExpiryBadge(c.daysRemaining)}
                      </td>

                      {/* Coverage Status */}
                      <td className="py-2.5 px-3 align-middle whitespace-nowrap">
                        {getCoverageBadge(c.status)}
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3 text-right align-middle" onClick={(e) => e.stopPropagation()}>
                        <ActionCell
                          coverage={c}
                          onRenewRC={openRenewRC}
                          onNewRC={openNewRC}
                          onInitiateTender={openInitiateTender}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Bottom-Right Pagination Bar ── */}
        {filtered.length > 0 && (
          <div className="p-3 border-t border-[#e4eaf2] bg-[#f8fafc] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="text-xs text-[#6b7a93]">
              Showing <span className="font-semibold text-[#152340]">{(page - 1) * pageSize + 1}</span> to{" "}
              <span className="font-semibold text-[#152340]">
                {Math.min(page * pageSize, filtered.length)}
              </span>{" "}
              of <span className="font-semibold text-[#152340]">{filtered.length}</span> items
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

      {/* ── Business Rules Classification Legend (neoInt style) ── */}
      <div className="bg-white border border-[#e4eaf2] rounded-xl p-4 shadow-xs">
        <p className="text-xs font-bold text-[#152340] uppercase tracking-wider mb-2.5 flex items-center gap-2">
          <ShieldAlert className="w-3.5 h-3.5 text-[#2563eb]" />
          Statutory RC Coverage Governance Rules (BR-09)
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs text-[#6b7a93]">
          <div className="flex items-start gap-2">
            <span className="neo-chip grn text-[10px] shrink-0 mt-0.5">Active RC</span>
            <span>Valid master agreement in force with &gt; 180 days validity remaining.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="neo-chip amb text-[10px] shrink-0 mt-0.5">Expiring Soon</span>
            <span>Active RC expiring within <strong>180 days</strong>. Advance renewal triggered.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="neo-chip red text-[10px] shrink-0 mt-0.5">Expired</span>
            <span>Contract period elapsed. Indents for this equipment require open tendering.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="neo-chip blu text-[10px] shrink-0 mt-0.5">Tender Active</span>
            <span>Procurement tender currently active in bidding or technical evaluation.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="neo-chip gry text-[10px] shrink-0 mt-0.5">No Coverage</span>
            <span>No valid RC or tender registered. Multi-facility indent aggregation recommended.</span>
          </div>
        </div>
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
      <div className="flex items-center justify-end gap-1.5">
        <Link href={c.rcId ? `/rate-contracts/${c.rcId}` : `/rate-contracts`}>
          <button className="px-2 py-1 bg-white border border-[#e4eaf2] text-[#3c4a63] hover:border-[#2563eb] hover:text-[#2563eb] rounded text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer">
            <Eye className="w-3 h-3" />
            <span>View RC</span>
          </button>
        </Link>
      </div>
    );
  }

  if (c.status === "expiring_soon" || c.status === "expired") {
    return (
      <div className="flex items-center justify-end gap-1.5 flex-wrap">
        <button
          onClick={() => onRenewRC(c)}
          className="px-2 py-1 bg-[#eff5ff] border border-[#bfdbfe] text-[#1e40af] hover:bg-[#dbeafe] rounded text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3 h-3" />
          <span>Renew RC</span>
        </button>
        {c.rcId && (
          <Link href={`/rate-contracts/${c.rcId}`}>
            <button className="px-2 py-1 bg-white border border-[#e4eaf2] text-[#3c4a63] hover:border-[#2563eb] hover:text-[#2563eb] rounded text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer">
              <Eye className="w-3 h-3" />
              <span>View</span>
            </button>
          </Link>
        )}
      </div>
    );
  }

  if (c.status === "tender_in_progress") {
    return (
      <div className="flex items-center justify-end gap-1.5">
        <Link href="/tenders">
          <button className="px-2 py-1 bg-white border border-[#e4eaf2] text-[#3c4a63] hover:border-[#2563eb] hover:text-[#2563eb] rounded text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer">
            <Eye className="w-3 h-3" />
            <span>View Tender</span>
          </button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-end gap-1.5 flex-wrap">
      <button
        onClick={() => onNewRC(c)}
        className="px-2 py-1 bg-[#eff5ff] border border-[#bfdbfe] text-[#1e40af] hover:bg-[#dbeafe] rounded text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
      >
        <Plus className="w-3 h-3" />
        <span>New RC</span>
      </button>
      <button
        onClick={() => onInitiateTender(c)}
        className="px-2 py-1 bg-white border border-[#e4eaf2] text-[#3c4a63] hover:border-[#2563eb] hover:text-[#2563eb] rounded text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
      >
        <Gavel className="w-3 h-3" />
        <span>Tender</span>
      </button>
    </div>
  );
}
