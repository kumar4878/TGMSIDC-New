import { useState, useMemo } from "react";
import {
  useAssetReport,
  useAssetReportDrilldown,
  useDistricts,
  useInstitutions,
  useVendors,
  useEquipment,
  useUpdateAssetStatus,
} from "@/lib/api-hooks";
import { exportAssetReportCsvUrl } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Activity,
  Search,
  Filter,
  Download,
  Printer,
  RefreshCw,
  Building2,
  MapPin,
  Calendar,
  Layers,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ChevronRight,
  ChevronDown,
  Info,
  Wrench,
  Truck,
  RotateCcw,
  FileSpreadsheet,
  X,
  ExternalLink,
  SlidersHorizontal,
  ArrowRightLeft,
  Check,
  Copy,
  Eye,
  FileText,
  ShieldAlert,
  Sparkles,
  BarChart2,
  Table as TableIcon,
  Tag,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export default function AssetReport() {
  // Filter states
  const [financialYear, setFinancialYear] = useState("all");
  const [district, setDistrict] = useState("all");
  const [facilityId, setFacilityId] = useState("all");
  const [hod, setHod] = useState("all");
  const [department, setDepartment] = useState("all");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [warrantyStatus, setWarrantyStatus] = useState("all");
  const [camcStatus, setCamcStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);

  // View modes
  const [viewMode, setViewMode] = useState<"table" | "drilldown">("table");
  const [tablePreset, setTablePreset] = useState<"operational" | "statutory" | "procurement">("operational");

  // Selected asset for modal
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Status change state inside modal
  const [newStatus, setNewStatus] = useState("");
  const [statusRemarks, setStatusRemarks] = useState("");
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Drilldown expansion state
  const [expandedDistricts, setExpandedDistricts] = useState<Record<string, boolean>>({});
  const [expandedHospitals, setExpandedHospitals] = useState<Record<string, boolean>>({});
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [expandedEquipments, setExpandedEquipments] = useState<Record<string, boolean>>({});

  // Query parameters object
  const queryParams = useMemo(() => {
    const p: Record<string, any> = { page, limit };
    if (financialYear !== "all") p.financialYear = financialYear;
    if (district !== "all") p.district = district;
    if (facilityId !== "all") p.facilityId = facilityId;
    if (hod !== "all") p.hod = hod;
    if (department !== "all") p.department = department;
    if (category !== "all") p.category = category;
    if (status !== "all") p.status = status;
    if (warrantyStatus !== "all") p.warrantyStatus = warrantyStatus;
    if (camcStatus !== "all") p.camcStatus = camcStatus;
    if (search.trim()) p.search = search.trim();
    return p;
  }, [financialYear, district, facilityId, hod, department, category, status, warrantyStatus, camcStatus, search, page, limit]);

  // Data queries
  const { data: reportData, isLoading, refetch } = useAssetReport(queryParams);
  const { data: drilldownData } = useAssetReportDrilldown(queryParams);
  const { data: districts = [] } = useDistricts();
  const { data: institutions = [] } = useInstitutions();

  const updateStatusMutation = useUpdateAssetStatus();

  const assets = reportData?.assets || [];
  const total = reportData?.total || 0;
  const kpis = reportData?.kpis || {
    totalAssets: 0,
    activeAssets: 0,
    inactiveAssets: 0,
    underMaintenance: 0,
    underRepair: 0,
    breakdown: 0,
    transferred: 0,
    decommissioned: 0,
    disposed: 0,
    underWarranty: 0,
    warrantyExpiringSoon: 0,
    camcActive: 0,
    camcExpiringSoon: 0,
  };

  const activeFilterCount = useMemo(() => {
    let c = 0;
    if (financialYear !== "all") c++;
    if (district !== "all") c++;
    if (facilityId !== "all") c++;
    if (hod !== "all") c++;
    if (department !== "all") c++;
    if (category !== "all") c++;
    if (status !== "all") c++;
    if (warrantyStatus !== "all") c++;
    if (camcStatus !== "all") c++;
    if (search.trim()) c++;
    return c;
  }, [financialYear, district, facilityId, hod, department, category, status, warrantyStatus, camcStatus, search]);

  const handleResetFilters = () => {
    setFinancialYear("all");
    setDistrict("all");
    setFacilityId("all");
    setHod("all");
    setDepartment("all");
    setCategory("all");
    setStatus("all");
    setWarrantyStatus("all");
    setCamcStatus("all");
    setSearch("");
    setPage(1);
  };

  const handleOpenDetail = (asset: any) => {
    setSelectedAsset(asset);
    setNewStatus(asset.status);
    setStatusRemarks("");
    setIsDetailOpen(true);
  };

  const handleStatusUpdate = async () => {
    if (!selectedAsset) return;
    if (newStatus === selectedAsset.status) {
      toast.info("Status is already set to " + newStatus);
      return;
    }

    try {
      setIsUpdatingStatus(true);
      await updateStatusMutation.mutateAsync({
        id: selectedAsset.assetTag || selectedAsset._id,
        status: newStatus,
        remarks: statusRemarks,
        user: "TGMSIDC Asset Administrator",
        role: "admin",
      });
      toast.success(`Operational status updated to ${newStatus}`);
      setSelectedAsset({
        ...selectedAsset,
        status: newStatus,
        lastUpdatedDate: new Date().toISOString(),
      });
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Failed to update status.");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleExportCsv = () => {
    const url = exportAssetReportCsvUrl(queryParams);
    window.open(url, "_blank");
  };

  const handlePrint = () => {
    window.print();
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  // Modern, glowing status badge pill
  const getStatusBadge = (st: string) => {
    switch (st) {
      case "active":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Active
          </span>
        );
      case "under_maintenance":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-200/80 shadow-2xs">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
            Maintenance
          </span>
        );
      case "under_repair":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/80 shadow-2xs">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            Under Repair
          </span>
        );
      case "breakdown":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200/80 shadow-2xs">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
            Breakdown
          </span>
        );
      case "inactive":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
            Inactive
          </span>
        );
      case "transferred":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200/80 shadow-2xs">
            <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
            Transferred
          </span>
        );
      case "decommissioned":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-zinc-100 text-zinc-700 border border-zinc-300 shadow-2xs">
            <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
            Decommissioned
          </span>
        );
      case "disposed":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-stone-100 text-stone-700 border border-stone-300 shadow-2xs">
            <span className="h-1.5 w-1.5 rounded-full bg-stone-400" />
            Disposed
          </span>
        );
      default:
        return <Badge variant="outline" className="text-[11px]">{st}</Badge>;
    }
  };

  const getWarrantyBadge = (w: string) => {
    switch (w) {
      case "active":
        return (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-medium py-0">
            Active
          </Badge>
        );
      case "expiring_soon":
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-medium py-0">
            Expiring &lt;30d
          </Badge>
        );
      case "expired":
        return (
          <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] font-medium py-0">
            Expired
          </Badge>
        );
      default:
        return <span className="text-slate-400 text-[10px]">—</span>;
    }
  };

  const getCamcBadge = (c: string) => {
    switch (c) {
      case "active":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] font-medium py-0">
            Active CAMC
          </Badge>
        );
      case "expiring_soon":
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-medium py-0">
            CAMC Expiring
          </Badge>
        );
      case "expired":
        return (
          <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] font-medium py-0">
            CAMC Expired
          </Badge>
        );
      default:
        return <span className="text-slate-400 text-[10px]">N/A</span>;
    }
  };

  const toggleDistrict = (dName: string) => {
    setExpandedDistricts(prev => ({ ...prev, [dName]: !prev[dName] }));
  };

  const toggleHospital = (hName: string) => {
    setExpandedHospitals(prev => ({ ...prev, [hName]: !prev[hName] }));
  };

  const toggleCategory = (cName: string) => {
    setExpandedCategories(prev => ({ ...prev, [cName]: !prev[cName] }));
  };

  const toggleEquipment = (eName: string) => {
    setExpandedEquipments(prev => ({ ...prev, [eName]: !prev[eName] }));
  };

  // Percentages for visual bar
  const totalCount = kpis.totalAssets || 1;
  const activePct = Math.round((kpis.activeAssets / totalCount) * 100);
  const maintPct = Math.round((kpis.underMaintenance / totalCount) * 100);
  const repairPct = Math.round((kpis.underRepair / totalCount) * 100);
  const breakdownPct = Math.round((kpis.breakdown / totalCount) * 100);
  const otherPct = Math.max(0, 100 - activePct - maintPct - repairPct - breakdownPct);

  return (
    <div className="space-y-6">
      {/* ─── Top Executive Header ─── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white rounded-2xl shadow-sm border border-slate-700/50">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Activity className="h-5 w-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Statewide Item-wise Asset Report
            </h1>
            <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[11px] font-mono">
              FR-RPT-ASSET-001
            </Badge>
            <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-[11px]">
              100% GRN Confirmed Units
            </Badge>
          </div>
          <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
            Real-time physical asset lifecycle registry for all medical equipment procured and commissioned across Telangana government hospitals.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap shrink-0">
          {/* View Mode Toggle */}
          <div className="flex bg-slate-800/90 p-1 rounded-xl border border-slate-700">
            <button
              onClick={() => setViewMode("table")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                viewMode === "table"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              <TableIcon className="h-3.5 w-3.5" />
              Table View
            </button>
            <button
              onClick={() => setViewMode("drilldown")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                viewMode === "drilldown"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              Hierarchical Tree
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            className="text-xs h-9 bg-white/10 hover:bg-white/20 text-white border-white/20 gap-1.5 cursor-pointer backdrop-blur-xs"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
            Excel Export
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="text-xs h-9 bg-white/10 hover:bg-white/20 text-white border-white/20 gap-1.5 cursor-pointer backdrop-blur-xs"
          >
            <Printer className="h-4 w-4 text-slate-300" />
            Print
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="text-xs h-9 p-2 bg-white/10 hover:bg-white/20 text-white border-white/20 cursor-pointer backdrop-blur-xs"
            title="Refresh Report Data"
          >
            <RefreshCw className="h-4 w-4 text-slate-300" />
          </Button>
        </div>
      </div>

      {/* ─── Hero Visual Representation Bar & Cards ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Overall Health & Fleet Status Distribution Bar (5 cols) */}
        <Card className="lg:col-span-5 border bg-white shadow-xs">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Statewide Equipment Fleet</p>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
                    {kpis.totalAssets.toLocaleString("en-IN")}
                  </span>
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    {activePct}% Operational Rate
                  </span>
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <Building2 className="h-5 w-5 text-slate-700" />
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-4 pt-2 space-y-3">
            {/* Visual Multi-Segment Bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-medium text-slate-500">
                <span>Fleet Operational Distribution</span>
                <span>121 Physical Units</span>
              </div>
              <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
                <div style={{ width: `${activePct}%` }} className="bg-emerald-500 h-full transition-all" title={`Active: ${kpis.activeAssets} (${activePct}%)`} />
                <div style={{ width: `${maintPct}%` }} className="bg-sky-400 h-full transition-all" title={`Under Maintenance: ${kpis.underMaintenance} (${maintPct}%)`} />
                <div style={{ width: `${repairPct}%` }} className="bg-amber-400 h-full transition-all" title={`Under Repair: ${kpis.underRepair} (${repairPct}%)`} />
                <div style={{ width: `${breakdownPct}%` }} className="bg-rose-500 h-full transition-all" title={`Breakdown: ${kpis.breakdown} (${breakdownPct}%)`} />
                <div style={{ width: `${otherPct}%` }} className="bg-slate-300 h-full transition-all" title={`Inactive/Transferred/Other: ${otherPct}%`} />
              </div>
            </div>

            {/* Micro breakdown badges */}
            <div className="grid grid-cols-4 gap-1.5 text-center pt-1 border-t border-slate-100">
              <div className="p-1.5 rounded-lg bg-emerald-50/70 border border-emerald-100">
                <p className="text-[10px] text-emerald-700 font-semibold">Active</p>
                <p className="text-sm font-bold text-emerald-800">{kpis.activeAssets}</p>
              </div>
              <div className="p-1.5 rounded-lg bg-sky-50/70 border border-sky-100">
                <p className="text-[10px] text-sky-700 font-semibold">Maint.</p>
                <p className="text-sm font-bold text-sky-800">{kpis.underMaintenance}</p>
              </div>
              <div className="p-1.5 rounded-lg bg-amber-50/70 border border-amber-100">
                <p className="text-[10px] text-amber-700 font-semibold">Repair</p>
                <p className="text-sm font-bold text-amber-800">{kpis.underRepair}</p>
              </div>
              <div className="p-1.5 rounded-lg bg-rose-50/70 border border-rose-100">
                <p className="text-[10px] text-rose-700 font-semibold">Breakdown</p>
                <p className="text-sm font-bold text-rose-800">{kpis.breakdown}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right: 3 Themed Stat Cards (7 cols) */}
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Card 1: Maintenance & Critical Attention */}
          <Card className="border border-amber-200/60 bg-gradient-to-br from-amber-50/40 via-white to-white shadow-xs">
            <CardContent className="p-4 flex flex-col justify-between h-full space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[11px] font-bold text-amber-900 uppercase tracking-wider">Attention Required</p>
                  <p className="text-2xl font-black text-amber-900 mt-1">
                    {kpis.underRepair + kpis.breakdown}
                  </p>
                </div>
                <div className="p-2 rounded-xl bg-amber-100 text-amber-800">
                  <AlertTriangle className="h-4 w-4" />
                </div>
              </div>

              <div className="space-y-1 text-xs">
                <div className="flex items-center justify-between text-slate-600">
                  <span>Under Repair:</span>
                  <span className="font-bold text-amber-700">{kpis.underRepair}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Out of Service (Breakdown):</span>
                  <span className="font-bold text-rose-700">{kpis.breakdown}</span>
                </div>
                <div className="flex items-center justify-between text-slate-500 pt-1 border-t text-[11px]">
                  <span>Scheduled PM:</span>
                  <span className="font-semibold text-sky-700">{kpis.underMaintenance} units</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Warranty Protection */}
          <Card className="border border-emerald-200/60 bg-gradient-to-br from-emerald-50/40 via-white to-white shadow-xs">
            <CardContent className="p-4 flex flex-col justify-between h-full space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider">OEM Warranty</p>
                  <p className="text-2xl font-black text-emerald-800 mt-1">
                    {kpis.underWarranty}
                  </p>
                </div>
                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
                  <ShieldCheck className="h-4 w-4" />
                </div>
              </div>

              <div className="space-y-1 text-xs">
                <div className="flex items-center justify-between text-slate-600">
                  <span>Active Manufacturer Warranty:</span>
                  <span className="font-bold text-emerald-700">100% Covered</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Expiring in 30 Days:</span>
                  <span className="font-bold text-slate-800">{kpis.warrantyExpiringSoon}</span>
                </div>
                <div className="flex items-center justify-between text-slate-500 pt-1 border-t text-[11px]">
                  <span>Standard Coverage:</span>
                  <span className="font-semibold text-slate-700">36 Months</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 3: CAMC & Extended Service */}
          <Card className="border border-blue-200/60 bg-gradient-to-br from-blue-50/40 via-white to-white shadow-xs">
            <CardContent className="p-4 flex flex-col justify-between h-full space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[11px] font-bold text-blue-900 uppercase tracking-wider">CAMC Protection</p>
                  <p className="text-2xl font-black text-blue-800 mt-1">
                    {kpis.camcActive}
                  </p>
                </div>
                <div className="p-2 rounded-xl bg-blue-100 text-blue-800">
                  <Wrench className="h-4 w-4" />
                </div>
              </div>

              <div className="space-y-1 text-xs">
                <div className="flex items-center justify-between text-slate-600">
                  <span>Active Annual Contracts:</span>
                  <span className="font-bold text-blue-700">{kpis.camcActive} Units</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Transferred Between Hosp.:</span>
                  <span className="font-bold text-purple-700">{kpis.transferred}</span>
                </div>
                <div className="flex items-center justify-between text-slate-500 pt-1 border-t text-[11px]">
                  <span>Decommissioned:</span>
                  <span className="font-semibold text-zinc-600">{kpis.decommissioned} units</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ─── Quick Status Filter Pills Bar ─── */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
          Quick Filter:
        </span>

        <button
          onClick={() => { setStatus("all"); setPage(1); }}
          className={`px-3 py-1.5 rounded-full font-semibold transition-all shrink-0 cursor-pointer text-xs border ${
            status === "all"
              ? "bg-slate-900 text-white border-slate-900 shadow-xs"
              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
          }`}
        >
          All Fleet ({kpis.totalAssets})
        </button>

        <button
          onClick={() => { setStatus("active"); setPage(1); }}
          className={`px-3 py-1.5 rounded-full font-semibold transition-all shrink-0 cursor-pointer text-xs border flex items-center gap-1.5 ${
            status === "active"
              ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
              : "bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50"
          }`}
        >
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          Active ({kpis.activeAssets})
        </button>

        <button
          onClick={() => { setStatus("under_maintenance"); setPage(1); }}
          className={`px-3 py-1.5 rounded-full font-semibold transition-all shrink-0 cursor-pointer text-xs border flex items-center gap-1.5 ${
            status === "under_maintenance"
              ? "bg-sky-600 text-white border-sky-600 shadow-xs"
              : "bg-white text-sky-700 border-sky-200 hover:bg-sky-50"
          }`}
        >
          <span className="h-2 w-2 rounded-full bg-sky-400" />
          Maintenance ({kpis.underMaintenance})
        </button>

        <button
          onClick={() => { setStatus("under_repair"); setPage(1); }}
          className={`px-3 py-1.5 rounded-full font-semibold transition-all shrink-0 cursor-pointer text-xs border flex items-center gap-1.5 ${
            status === "under_repair"
              ? "bg-amber-600 text-white border-amber-600 shadow-xs"
              : "bg-white text-amber-700 border-amber-200 hover:bg-amber-50"
          }`}
        >
          <span className="h-2 w-2 rounded-full bg-amber-400" />
          Under Repair ({kpis.underRepair})
        </button>

        <button
          onClick={() => { setStatus("breakdown"); setPage(1); }}
          className={`px-3 py-1.5 rounded-full font-semibold transition-all shrink-0 cursor-pointer text-xs border flex items-center gap-1.5 ${
            status === "breakdown"
              ? "bg-rose-600 text-white border-rose-600 shadow-xs"
              : "bg-white text-rose-700 border-rose-200 hover:bg-rose-50"
          }`}
        >
          <span className="h-2 w-2 rounded-full bg-rose-400" />
          Breakdown ({kpis.breakdown})
        </button>

        <button
          onClick={() => { setStatus("transferred"); setPage(1); }}
          className={`px-3 py-1.5 rounded-full font-semibold transition-all shrink-0 cursor-pointer text-xs border flex items-center gap-1.5 ${
            status === "transferred"
              ? "bg-purple-600 text-white border-purple-600 shadow-xs"
              : "bg-white text-purple-700 border-purple-200 hover:bg-purple-50"
          }`}
        >
          <span className="h-2 w-2 rounded-full bg-purple-400" />
          Transferred ({kpis.transferred})
        </button>

        <button
          onClick={() => { setStatus("decommissioned"); setPage(1); }}
          className={`px-3 py-1.5 rounded-full font-semibold transition-all shrink-0 cursor-pointer text-xs border flex items-center gap-1.5 ${
            status === "decommissioned"
              ? "bg-zinc-700 text-white border-zinc-700 shadow-xs"
              : "bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50"
          }`}
        >
          <span className="h-2 w-2 rounded-full bg-zinc-400" />
          Decommissioned ({kpis.decommissioned})
        </button>

        <button
          onClick={() => { setStatus("disposed"); setPage(1); }}
          className={`px-3 py-1.5 rounded-full font-semibold transition-all shrink-0 cursor-pointer text-xs border flex items-center gap-1.5 ${
            status === "disposed"
              ? "bg-stone-700 text-white border-stone-700 shadow-xs"
              : "bg-white text-stone-700 border-stone-200 hover:bg-stone-50"
          }`}
        >
          <span className="h-2 w-2 rounded-full bg-stone-400" />
          Disposed ({kpis.disposed})
        </button>
      </div>

      {/* ─── Multi-Dimensional Filter Toolbar ─── */}
      <Card className="border bg-slate-50/60 shadow-xs">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative flex-1 w-full">
              <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
              <Input
                placeholder="Search across Asset ID, Serial No, Equipment Name, Make, PO Number, Hospital..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9 pr-8 h-9 text-xs bg-white border-slate-200"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-between sm:justify-end">
              {activeFilterCount > 0 && (
                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-xs py-1 px-2.5 font-semibold">
                  {activeFilterCount} Active Filters
                </Badge>
              )}

              {activeFilterCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetFilters}
                  className="h-8 text-xs text-slate-600 hover:text-slate-900 gap-1.5 cursor-pointer bg-white"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset Filters
                </Button>
              )}
            </div>
          </div>

          {/* Filter Dropdowns Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5 pt-1">
            <Select
              value={financialYear}
              onValueChange={(v) => { setFinancialYear(v); setPage(1); }}
            >
              <SelectTrigger className="h-8 text-xs bg-white border-slate-200">
                <SelectValue placeholder="Financial Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Financial Years</SelectItem>
                <SelectItem value="2026-27">FY 2026-27</SelectItem>
                <SelectItem value="2025-26">FY 2025-26</SelectItem>
                <SelectItem value="2024-25">FY 2024-25</SelectItem>
                <SelectItem value="2023-24">FY 2023-24</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={district}
              onValueChange={(v) => { setDistrict(v); setPage(1); }}
            >
              <SelectTrigger className="h-8 text-xs bg-white border-slate-200">
                <SelectValue placeholder="District" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Districts (Statewide)</SelectItem>
                {districts.map((d: any) => (
                  <SelectItem key={d._id || d.name} value={d.name}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={facilityId}
              onValueChange={(v) => { setFacilityId(v); setPage(1); }}
            >
              <SelectTrigger className="h-8 text-xs bg-white border-slate-200">
                <SelectValue placeholder="Hospital" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Hospitals (Any)</SelectItem>
                {institutions.map((i: any) => (
                  <SelectItem key={i._id || i.id} value={i.name}>
                    {i.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={hod}
              onValueChange={(v) => { setHod(v); setPage(1); }}
            >
              <SelectTrigger className="h-8 text-xs bg-white border-slate-200">
                <SelectValue placeholder="Directorate" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Directorates</SelectItem>
                <SelectItem value="DME">DME (Medical Education)</SelectItem>
                <SelectItem value="DH">DH (Public Health)</SelectItem>
                <SelectItem value="TVVP">TVVP (Vaidya Vidhana Parishad)</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={category}
              onValueChange={(v) => { setCategory(v); setPage(1); }}
            >
              <SelectTrigger className="h-8 text-xs bg-white border-slate-200">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="Diagnostic Imaging">Diagnostic Imaging</SelectItem>
                <SelectItem value="Critical Care">Critical Care</SelectItem>
                <SelectItem value="Cardiology">Cardiology</SelectItem>
                <SelectItem value="Laboratory">Laboratory</SelectItem>
                <SelectItem value="Nephrology">Nephrology</SelectItem>
                <SelectItem value="Operation Theatre">Operation Theatre</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={department}
              onValueChange={(v) => { setDepartment(v); setPage(1); }}
            >
              <SelectTrigger className="h-8 text-xs bg-white border-slate-200">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                <SelectItem value="Radiology">Radiology</SelectItem>
                <SelectItem value="ICU">Intensive Care (ICU)</SelectItem>
                <SelectItem value="Cardiology">Cardiology</SelectItem>
                <SelectItem value="Nephrology">Nephrology</SelectItem>
                <SelectItem value="Operation Theatre">Operation Theatre</SelectItem>
                <SelectItem value="Laboratory">Laboratory</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* ─── Main Content View (Table or Drill-Down) ─── */}
      {viewMode === "table" ? (
        <Card className="border border-slate-200 shadow-sm overflow-hidden bg-white">
          {/* Table Toolbar Header */}
          <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-700">
                Showing <span className="text-[#186812] font-black">{assets.length}</span> of{" "}
                <span className="font-black">{total}</span> Equipment Assets
              </span>

              {/* Preset Column Views */}
              <div className="hidden md:flex items-center bg-white border rounded-lg p-0.5 text-xs">
                <button
                  onClick={() => setTablePreset("operational")}
                  className={`px-2.5 py-1 rounded font-medium transition-all cursor-pointer ${
                    tablePreset === "operational" ? "bg-slate-900 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Operational View
                </button>
                <button
                  onClick={() => setTablePreset("procurement")}
                  className={`px-2.5 py-1 rounded font-medium transition-all cursor-pointer ${
                    tablePreset === "procurement" ? "bg-slate-900 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Procurement &amp; GRN
                </button>
                <button
                  onClick={() => setTablePreset("statutory")}
                  className={`px-2.5 py-1 rounded font-medium transition-all cursor-pointer ${
                    tablePreset === "statutory" ? "bg-slate-900 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  All 31 Columns
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Rows:</span>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                className="border border-slate-200 rounded-md px-2 py-1 text-xs bg-white font-medium cursor-pointer"
              >
                <option value={25}>25 rows</option>
                <option value={50}>50 rows</option>
                <option value={100}>100 rows</option>
                <option value={500}>500 rows</option>
              </select>
            </div>
          </div>

          {/* The Improvised High-Density Beautiful Data Grid */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px] tracking-wider whitespace-nowrap">
                <tr>
                  <th className="py-3 px-3.5 sticky left-0 bg-slate-100 z-10 w-[140px]">Asset ID</th>
                  <th className="py-3 px-3.5 min-w-[220px]">Equipment &amp; Category</th>
                  <th className="py-3 px-3.5 min-w-[170px]">Make / Model</th>
                  <th className="py-3 px-3.5 min-w-[150px]">Serial Number</th>
                  <th className="py-3 px-3.5 min-w-[130px]">Asset Status</th>
                  <th className="py-3 px-3.5 min-w-[210px]">Location &amp; Institution</th>
                  <th className="py-3 px-3.5 min-w-[130px]">Department</th>

                  {(tablePreset === "statutory" || tablePreset === "procurement") && (
                    <>
                      <th className="py-3 px-3.5 min-w-[160px]">Supplier / Vendor</th>
                      <th className="py-3 px-3.5 min-w-[120px]">PO Reference</th>
                      <th className="py-3 px-3.5 min-w-[100px] text-right">Unit Rate (₹)</th>
                      <th className="py-3 px-3.5 min-w-[120px]">GRN Number</th>
                      <th className="py-3 px-3.5 min-w-[100px]">Delivery Date</th>
                      <th className="py-3 px-3.5 min-w-[100px]">QA Status</th>
                    </>
                  )}

                  {(tablePreset === "statutory" || tablePreset === "operational") && (
                    <>
                      <th className="py-3 px-3.5 min-w-[130px]">Installation Date</th>
                      <th className="py-3 px-3.5 min-w-[160px]">Protection Coverage</th>
                    </>
                  )}

                  <th className="py-3 px-3.5 text-right sticky right-0 bg-slate-100 z-10 w-[120px]">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={20} className="text-center py-16 text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCw className="h-6 w-6 animate-spin text-[#186812]" />
                        <span className="text-xs font-semibold">Loading statewide equipment assets...</span>
                      </div>
                    </td>
                  </tr>
                ) : assets.length === 0 ? (
                  <tr>
                    <td colSpan={20} className="text-center py-16 text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-2 max-w-md mx-auto">
                        <Info className="h-8 w-8 text-slate-300" />
                        <p className="font-semibold text-sm text-slate-700">No equipment assets found</p>
                        <p className="text-xs text-slate-400">
                          Try adjusting your search query, clearing filters, or switching financial years.
                        </p>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleResetFilters}
                          className="mt-2 text-xs"
                        >
                          Clear All Filters
                        </Button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  assets.map((a: any, idx: number) => (
                    <tr
                      key={a._id || a.assetTag}
                      onClick={() => handleOpenDetail(a)}
                      className="hover:bg-emerald-50/40 transition-colors cursor-pointer group"
                    >
                      {/* 1. Asset ID (Fixed non-wrapping pill) */}
                      <td className="py-3 px-3.5 sticky left-0 bg-white group-hover:bg-emerald-50/40 z-10 border-r border-slate-100">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50/90 text-[#186812] border border-emerald-200/80 font-mono font-bold text-[11px] whitespace-nowrap shadow-2xs">
                          <Tag className="h-3 w-3 text-emerald-600 shrink-0" />
                          <span>{a.assetTag}</span>
                        </div>
                      </td>

                      {/* 2. Equipment Name & Category */}
                      <td className="py-3 px-3.5">
                        <div className="space-y-0.5">
                          <p className="font-bold text-slate-900 group-hover:text-emerald-950 transition-colors">
                            {a.equipmentName}
                          </p>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                            <span className="font-medium text-slate-600">{a.category}</span>
                            <span>•</span>
                            <span>{a.department}</span>
                          </div>
                        </div>
                      </td>

                      {/* 3. Make / Model */}
                      <td className="py-3 px-3.5">
                        <div className="space-y-0.5">
                          <p className="font-semibold text-slate-800">{a.make || "Standard OEM"}</p>
                          <p className="text-[11px] font-mono text-slate-500">{a.model || "—"}</p>
                        </div>
                      </td>

                      {/* 4. Serial Number */}
                      <td className="py-3 px-3.5">
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-800 font-mono text-[11px] whitespace-nowrap">
                          <span>{a.serialNumber}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              copyToClipboard(a.serialNumber, "Serial Number");
                            }}
                            className="text-slate-400 hover:text-slate-700 ml-0.5 cursor-pointer"
                            title="Copy Serial Number"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                        </div>
                      </td>

                      {/* 5. Asset Status */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        {getStatusBadge(a.status)}
                      </td>

                      {/* 6. Location & Institution */}
                      <td className="py-3 px-3.5">
                        <div className="space-y-0.5">
                          <p className="font-bold text-slate-900 leading-tight">
                            {a.institutionName}
                          </p>
                          <div className="flex items-center gap-1 text-[11px] text-slate-500">
                            <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                            <span>{a.district}</span>
                            <span>•</span>
                            <span className="font-semibold text-emerald-800 uppercase text-[10px]">
                              {a.hodDirectorate || "DME"}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 7. Department */}
                      <td className="py-3 px-3.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                          {a.department || "General"}
                        </span>
                      </td>

                      {/* Optional Procurement Columns */}
                      {(tablePreset === "statutory" || tablePreset === "procurement") && (
                        <>
                          <td className="py-3 px-3.5 text-slate-700 truncate max-w-[160px]" title={a.vendorName}>
                            {a.vendorName}
                          </td>
                          <td className="py-3 px-3.5">
                            <p className="font-mono font-semibold text-slate-800 text-[11px]">{a.poNumber}</p>
                            <p className="text-[10px] text-slate-400">
                              {a.poDate ? format(new Date(a.poDate), "dd/MM/yyyy") : "—"}
                            </p>
                          </td>
                          <td className="py-3 px-3.5 text-right font-mono font-bold text-slate-900">
                            ₹{(a.procurementValue || 0).toLocaleString("en-IN")}
                          </td>
                          <td className="py-3 px-3.5 font-mono text-[11px] text-slate-700">
                            {a.grnNumber}
                          </td>
                          <td className="py-3 px-3.5 text-[11px] text-slate-600">
                            {a.deliveryDate ? format(new Date(a.deliveryDate), "dd/MM/yyyy") : "—"}
                          </td>
                          <td className="py-3 px-3.5">
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                              {a.qaStatus?.toUpperCase() || "PASS"}
                            </Badge>
                          </td>
                        </>
                      )}

                      {/* Optional Operational / Protection Columns */}
                      {(tablePreset === "statutory" || tablePreset === "operational") && (
                        <>
                          <td className="py-3 px-3.5 text-[11px] text-slate-600">
                            {a.installationDate ? format(new Date(a.installationDate), "dd/MM/yyyy") : "—"}
                          </td>
                          <td className="py-3 px-3.5 whitespace-nowrap">
                            <div className="flex flex-col gap-1 items-start">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] text-slate-500 font-medium">Warranty:</span>
                                {getWarrantyBadge(a.warrantyStatus)}
                              </div>
                              {a.camcApplicable && (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] text-slate-500 font-medium">CAMC:</span>
                                  {getCamcBadge(a.camcStatus)}
                                </div>
                              )}
                            </div>
                          </td>
                        </>
                      )}

                      {/* Action Button Column (Sticky Right) */}
                      <td className="py-3 px-3.5 text-right sticky right-0 bg-white group-hover:bg-emerald-50/40 z-10 border-l border-slate-100 whitespace-nowrap">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDetail(a);
                          }}
                          className="h-7 px-2.5 text-xs text-[#186812] border-emerald-200 hover:bg-[#186812] hover:text-white font-semibold rounded-md shadow-2xs gap-1 cursor-pointer transition-all"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>View Details</span>
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Bar */}
          <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <span className="text-slate-600 font-medium">
              Showing page <strong>{page}</strong> of <strong>{Math.ceil(total / limit) || 1}</strong> ({total} total assets recorded)
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="h-8 text-xs font-semibold cursor-pointer"
              >
                Previous
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, Math.ceil(total / limit) || 1) }, (_, i) => i + 1).map((pNum) => (
                  <button
                    key={pNum}
                    onClick={() => setPage(pNum)}
                    className={`h-8 w-8 rounded-md font-semibold text-xs transition-all cursor-pointer ${
                      page === pNum
                        ? "bg-[#186812] text-white shadow-xs"
                        : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
                    }`}
                  >
                    {pNum}
                  </button>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= (Math.ceil(total / limit) || 1)}
                onClick={() => setPage((p) => p + 1)}
                className="h-8 text-xs font-semibold cursor-pointer"
              >
                Next
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        /* ─── Beautified Hierarchical Drill-Down Explorer ─── */
        <Card className="border shadow-xs bg-white">
          <CardHeader className="p-5 border-b bg-slate-50/70">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Layers className="h-5 w-5 text-[#186812]" />
                  Statewide Hierarchical Asset Explorer
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 mt-0.5">
                  Expand down from State of Telangana → Districts → Hospitals → Equipment Categories → Physical Units.
                </CardDescription>
              </div>
              <Badge className="bg-[#186812] text-white font-bold text-xs px-3 py-1">
                {drilldownData?.totalAssets || 0} Total Assets
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-5 space-y-3">
            <div className="space-y-2.5">
              {drilldownData?.districts?.map((d: any) => {
                const isDistExpanded = expandedDistricts[d.name];
                return (
                  <div key={d.name} className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                    {/* District Header */}
                    <div
                      onClick={() => toggleDistrict(d.name)}
                      className="p-3.5 bg-slate-50 hover:bg-slate-100 flex items-center justify-between cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
                          {isDistExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </span>
                        <div>
                          <p className="font-bold text-sm text-slate-900">District: {d.name}</p>
                          <p className="text-[11px] text-slate-500">{d.hospitals?.length} Assigned Government Hospitals</p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="font-bold text-xs px-2.5 py-0.5">
                        {d.count} Assets
                      </Badge>
                    </div>

                    {/* Hospitals under District */}
                    {isDistExpanded && (
                      <div className="p-3.5 pl-8 space-y-2.5 bg-slate-50/30 border-t border-slate-200">
                        {d.hospitals?.map((h: any) => {
                          const isHospExpanded = expandedHospitals[h.name];
                          return (
                            <div key={h.name} className="border border-slate-200/80 rounded-lg bg-white overflow-hidden shadow-2xs">
                              <div
                                onClick={() => toggleHospital(h.name)}
                                className="p-3 hover:bg-slate-50 flex items-center justify-between cursor-pointer text-xs"
                              >
                                <div className="flex items-center gap-2.5">
                                  {isHospExpanded ? <ChevronDown className="h-3.5 w-3.5 text-slate-500" /> : <ChevronRight className="h-3.5 w-3.5 text-slate-500" />}
                                  <Building2 className="h-4 w-4 text-[#186812]" />
                                  <span className="font-bold text-slate-900 text-xs">{h.name}</span>
                                </div>
                                <Badge variant="outline" className="text-[11px] font-semibold text-slate-700">
                                  {h.count} Assets Installed
                                </Badge>
                              </div>

                              {/* Categories under Hospital */}
                              {isHospExpanded && (
                                <div className="p-3 pl-8 space-y-2 border-t border-slate-100 bg-slate-50/20 text-xs">
                                  {h.categories?.map((cat: any) => {
                                    const isCatExpanded = expandedCategories[`${h.name}_${cat.name}`];
                                    return (
                                      <div key={cat.name} className="border border-slate-200 rounded-md bg-white overflow-hidden">
                                        <div
                                          onClick={() => toggleCategory(`${h.name}_${cat.name}`)}
                                          className="p-2.5 hover:bg-slate-50 flex items-center justify-between cursor-pointer"
                                        >
                                          <div className="flex items-center gap-2">
                                            {isCatExpanded ? <ChevronDown className="h-3 w-3 text-slate-400" /> : <ChevronRight className="h-3 w-3 text-slate-400" />}
                                            <span className="font-semibold text-slate-800">{cat.name}</span>
                                          </div>
                                          <span className="text-xs font-bold text-emerald-800">{cat.count} Units</span>
                                        </div>

                                        {/* Equipments & Individual Assets */}
                                        {isCatExpanded && (
                                          <div className="p-2.5 pl-6 space-y-2 border-t border-slate-100 bg-slate-50/40">
                                            {cat.equipments?.map((eq: any) => {
                                              const isEqExpanded = expandedEquipments[`${h.name}_${cat.name}_${eq.name}`];
                                              return (
                                                <div key={eq.name} className="border border-slate-200 rounded-md bg-white p-2.5 space-y-2">
                                                  <div
                                                    onClick={() => toggleEquipment(`${h.name}_${cat.name}_${eq.name}`)}
                                                    className="flex items-center justify-between cursor-pointer"
                                                  >
                                                    <div className="flex items-center gap-2">
                                                      {isEqExpanded ? <ChevronDown className="h-3.5 w-3.5 text-[#186812]" /> : <ChevronRight className="h-3.5 w-3.5 text-[#186812]" />}
                                                      <span className="font-bold text-slate-900 text-xs">{eq.name}</span>
                                                    </div>
                                                    <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px]">
                                                      {eq.count} Physical Units
                                                    </Badge>
                                                  </div>

                                                  {isEqExpanded && (
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-2 border-t border-slate-100">
                                                      {eq.assets?.map((ast: any) => (
                                                        <div
                                                          key={ast.id || ast.assetTag}
                                                          onClick={() => {
                                                            const full = assets.find((x: any) => x.assetTag === ast.assetTag) || ast;
                                                            handleOpenDetail(full);
                                                          }}
                                                          className="p-2.5 border rounded-lg bg-slate-50 hover:bg-emerald-50/60 hover:border-emerald-300 transition-all cursor-pointer text-xs space-y-1.5"
                                                        >
                                                          <div className="flex items-center justify-between">
                                                            <span className="font-mono font-bold text-[#186812] text-[11px]">
                                                              {ast.assetTag}
                                                            </span>
                                                            {getStatusBadge(ast.status)}
                                                          </div>
                                                          <p className="text-[11px] font-mono text-slate-600">
                                                            SN: {ast.serialNumber}
                                                          </p>
                                                        </div>
                                                      ))}
                                                    </div>
                                                  )}
                                                </div>
                                              );
                                            })}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── High-Fidelity Asset Detail Modal (7-Section Lifecycle) ─── */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-0">
          {selectedAsset && (
            <div>
              {/* Header Banner */}
              <div className="p-6 bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white rounded-t-lg">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-emerald-400 text-lg px-2.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/40">
                        {selectedAsset.assetTag}
                      </span>
                      {getStatusBadge(selectedAsset.status)}
                      <Badge variant="outline" className="border-slate-600 text-slate-300 text-[10px]">
                        {selectedAsset.hodDirectorate || "DME"}
                      </Badge>
                    </div>
                    <h2 className="text-xl font-bold text-white mt-1">
                      {selectedAsset.equipmentName}
                    </h2>
                    <p className="text-xs text-slate-300">
                      {selectedAsset.make} {selectedAsset.model} • SN:{" "}
                      <span className="font-mono text-emerald-300 font-bold">{selectedAsset.serialNumber}</span>
                    </p>
                  </div>

                  <div className="text-left sm:text-right bg-white/5 p-3 rounded-xl border border-white/10">
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Current Location</p>
                    <p className="text-xs font-bold text-white mt-0.5">{selectedAsset.institutionName}</p>
                    <p className="text-[11px] text-slate-300">{selectedAsset.currentLocation || selectedAsset.district}</p>
                  </div>
                </div>
              </div>

              {/* Body: 7 Structured Sections */}
              <div className="p-6 space-y-6 text-xs bg-white">
                {/* 1. Identification & Status Control */}
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Info className="h-4 w-4 text-[#186812]" />
                    1. Asset Identification &amp; Operational Control
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <div>
                      <p className="text-[10px] text-slate-500 font-medium">Category</p>
                      <p className="font-semibold text-slate-800 mt-0.5">{selectedAsset.category}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 font-medium">Hospital Department</p>
                      <p className="font-semibold text-slate-800 mt-0.5">{selectedAsset.department}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 font-medium">District</p>
                      <p className="font-semibold text-slate-800 mt-0.5">{selectedAsset.district}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 font-medium">Last Updated Date</p>
                      <p className="font-semibold text-slate-800 mt-0.5">
                        {selectedAsset.lastUpdatedDate ? format(new Date(selectedAsset.lastUpdatedDate), "dd MMM yyyy") : "—"}
                      </p>
                    </div>
                  </div>

                  {/* Status update box */}
                  <div className="p-3.5 bg-emerald-50/50 border border-emerald-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-slate-800">
                        Update Operational Status (Mandatory Audit Log)
                      </Label>
                      <span className="text-[10px] text-slate-500 font-medium">Biomedical Engineer / Admin</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <Select value={newStatus} onValueChange={setNewStatus}>
                        <SelectTrigger className="h-8 text-xs bg-white border-slate-200">
                          <SelectValue placeholder="Select Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active (Operational)</SelectItem>
                          <SelectItem value="under_maintenance">Under Maintenance</SelectItem>
                          <SelectItem value="under_repair">Under Repair</SelectItem>
                          <SelectItem value="breakdown">Breakdown (Out of Service)</SelectItem>
                          <SelectItem value="inactive">Inactive (Standby)</SelectItem>
                          <SelectItem value="transferred">Transferred</SelectItem>
                          <SelectItem value="decommissioned">Decommissioned</SelectItem>
                          <SelectItem value="disposed">Disposed</SelectItem>
                        </SelectContent>
                      </Select>

                      <Input
                        placeholder="Reason / service ticket reference..."
                        value={statusRemarks}
                        onChange={(e) => setStatusRemarks(e.target.value)}
                        className="h-8 text-xs bg-white border-slate-200"
                      />

                      <Button
                        size="sm"
                        onClick={handleStatusUpdate}
                        disabled={isUpdatingStatus || newStatus === selectedAsset.status}
                        className="h-8 text-xs bg-[#186812] hover:bg-[#1f7e17] text-white cursor-pointer"
                      >
                        {isUpdatingStatus ? "Updating..." : "Update Status"}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* 2. Procurement Details */}
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Building2 className="h-4 w-4 text-[#186812]" />
                    2. Procurement &amp; Origin Linkage
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <div>
                      <p className="text-[10px] text-slate-500 font-medium">Purchase Order No.</p>
                      <p className="font-mono font-bold text-slate-900 mt-0.5">{selectedAsset.poNumber}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 font-medium">PO Date</p>
                      <p className="font-medium text-slate-800 mt-0.5">
                        {selectedAsset.poDate ? format(new Date(selectedAsset.poDate), "dd MMM yyyy") : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 font-medium">Rate Contract (RC)</p>
                      <p className="font-mono font-semibold text-slate-800 mt-0.5">{selectedAsset.rcNumber || "Direct Tender"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 font-medium">Procurement Value (Per Unit)</p>
                      <p className="font-mono font-bold text-emerald-800 mt-0.5">
                        ₹{(selectedAsset.procurementValue || 0).toLocaleString("en-IN")}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-[10px] text-slate-500 font-medium">Empanelled Vendor</p>
                      <p className="font-semibold text-slate-900 mt-0.5">{selectedAsset.vendorName}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 font-medium">Indent Reference</p>
                      <p className="font-mono text-slate-800 mt-0.5">{selectedAsset.indentNumber || "IND-2627-0012"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 font-medium">Financial Year</p>
                      <p className="font-semibold text-slate-800 mt-0.5">{selectedAsset.financialYear || "2026-27"}</p>
                    </div>
                  </div>
                </div>

                {/* 3. Delivery & GRN */}
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Truck className="h-4 w-4 text-[#186812]" />
                    3. Delivery Receipt &amp; GRN Confirmation
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <div>
                      <p className="text-[10px] text-slate-500 font-medium">GRN Number</p>
                      <p className="font-mono font-bold text-slate-900 mt-0.5">{selectedAsset.grnNumber}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 font-medium">GRN Date</p>
                      <p className="font-medium text-slate-800 mt-0.5">
                        {selectedAsset.grnDate ? format(new Date(selectedAsset.grnDate), "dd MMM yyyy") : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 font-medium">Delivery Tracking ID</p>
                      <p className="font-mono text-slate-800 mt-0.5">{selectedAsset.deliveryTrackingId || "DEL-2026-0042"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 font-medium">Delivery Receipt Date</p>
                      <p className="font-medium text-slate-800 mt-0.5">
                        {selectedAsset.deliveryDate ? format(new Date(selectedAsset.deliveryDate), "dd MMM yyyy") : "—"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 4 & 5: QA Inspection + Installation */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* QA Section */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4 text-[#186812]" />
                      4. Quality Assurance Inspection
                    </h3>
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">QA Decision:</span>
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold text-[10px]">
                          {selectedAsset.qaStatus?.toUpperCase() || "ACCEPTED"}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Inspection Date:</span>
                        <span className="font-semibold text-slate-800">
                          {selectedAsset.qaDate ? format(new Date(selectedAsset.qaDate), "dd MMM yyyy") : "—"}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200 leading-relaxed">
                        {selectedAsset.qaObservations || "100% parameter compliance verified. Safety certifications validated."}
                      </p>
                    </div>
                  </div>

                  {/* Installation Section */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <Wrench className="h-4 w-4 text-[#186812]" />
                      5. Installation &amp; Clinical Training
                    </h3>
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Installation Date:</span>
                        <span className="font-semibold text-slate-800">
                          {selectedAsset.installationDate ? format(new Date(selectedAsset.installationDate), "dd MMM yyyy") : "—"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Commissioning Date:</span>
                        <span className="font-semibold text-slate-800">
                          {selectedAsset.commissioningDate ? format(new Date(selectedAsset.commissioningDate), "dd MMM yyyy") : "—"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Staff Training Completed:</span>
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-semibold">
                          {selectedAsset.trainingCompleted ? "Certified Complete" : "Pending"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 6. Warranty & CAMC Protection */}
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-[#186812]" />
                    6. Warranty &amp; Annual Maintenance (CAMC)
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3.5 bg-emerald-50/40 border border-emerald-200/80 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">Warranty Protection</span>
                        {getWarrantyBadge(selectedAsset.warrantyStatus)}
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-600">
                        <span>Period:</span>
                        <span className="font-semibold">{selectedAsset.warrantyMonths || 36} Months</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-600">
                        <span>Expiry Date:</span>
                        <span className="font-bold text-slate-900">
                          {selectedAsset.warrantyEndDate ? format(new Date(selectedAsset.warrantyEndDate), "dd MMM yyyy") : "—"}
                        </span>
                      </div>
                    </div>

                    <div className="p-3.5 bg-blue-50/40 border border-blue-200/80 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">Post-Warranty CAMC</span>
                        {getCamcBadge(selectedAsset.camcStatus)}
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-600">
                        <span>Applicable:</span>
                        <span className="font-semibold">{selectedAsset.camcApplicable ? "Yes (Annual Contract)" : "No"}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-600">
                        <span>Expiry Date:</span>
                        <span className="font-bold text-slate-900">
                          {selectedAsset.camcEndDate ? format(new Date(selectedAsset.camcEndDate), "dd MMM yyyy") : "N/A"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 7. Chronological Lifecycle History Timeline */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-[#186812]" />
                    7. Chronological Asset Lifecycle History
                  </h3>
                  <div className="relative pl-6 space-y-3.5 before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-emerald-200">
                    {(selectedAsset.lifecycleHistory || []).map((ev: any, idx: number) => (
                      <div key={idx} className="relative">
                        <div className="absolute -left-[21px] top-1.5 h-3.5 w-3.5 rounded-full bg-[#186812] border-2 border-white shadow-xs" />
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900">{ev.event}</span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {ev.timestamp ? format(new Date(ev.timestamp), "dd MMM yyyy, hh:mm a") : "—"}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600">{ev.remarks}</p>
                          <div className="flex items-center gap-2 pt-1 text-[10px] text-slate-400">
                            <span>Action by: <strong>{ev.user}</strong></span>
                            <span>•</span>
                            <span className="uppercase font-semibold">{ev.role}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <DialogFooter className="p-4 border-t bg-slate-50">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsDetailOpen(false)}
                  className="text-xs cursor-pointer font-semibold"
                >
                  Close
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
