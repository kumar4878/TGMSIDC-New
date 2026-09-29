import { useRoute, Link, useLocation } from "wouter";
import { useGetRateContract, getGetRateContractQueryKey, useUpdateRateContract } from "@/lib/api-hooks";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import {
  ArrowLeft, AlertTriangle, ShieldCheck, Building2, Calendar,
  FileText, IndianRupee, Clock, CheckCircle2, AlertCircle,
  ExternalLink, Layers, RefreshCw, Send, Plus, Wrench
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useState } from "react";
import { ProductSpecSheet } from "@/components/ProductSpecSheet";
import { cn } from "@/lib/utils";

function safeFormat(d: string | null | undefined, pattern = "dd MMM yyyy"): string {
  if (!d) return "—";
  try {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return "—";
    return format(dt, pattern);
  } catch {
    return "—";
  }
}

function safeDaysToExpiry(d: string | null | undefined): number | null {
  if (!d) return null;
  try {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return null;
    return differenceInDays(dt, new Date());
  } catch {
    return null;
  }
}

export default function RateContractDetail() {
  const [, params] = useRoute("/rate-contracts/:id");
  const id = (params?.id ?? "");
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { data: rc, isLoading, error } = useGetRateContract(id, {
    query: {
      enabled: !!id,
      queryKey: getGetRateContractQueryKey(id),
      retry: 1,
    }
  });
  const updateRC = useUpdateRateContract();
  const [closeOpen, setCloseOpen] = useState(false);
  const [renewOpen, setRenewOpen] = useState(false);
  const [newEndDate, setNewEndDate] = useState("");

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-8 h-8 rounded-full border-3 border-[#2563eb] border-t-transparent animate-spin mb-3" />
        <p className="text-xs font-medium text-[#6b7a93]">Loading Rate Contract Agreement…</p>
      </div>
    );
  }

  if (error || !rc) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4">
        <div className="bg-white border border-[#e4eaf2] rounded-xl p-8 text-center shadow-xs">
          <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-200">
            <AlertCircle className="w-6 h-6 text-amber-600" />
          </div>
          <h2 className="text-lg font-bold text-[#152340]">Rate Contract Record Not Found</h2>
          <p className="text-xs text-[#6b7a93] mt-1.5 max-w-md mx-auto">
            The requested contract identifier <span className="font-mono font-semibold text-[#152340]">{id}</span> does not exist or has been archived.
          </p>
          <div className="flex items-center justify-center gap-3 mt-6">
            <Link href="/rate-contracts">
              <Button variant="outline" size="sm" className="text-xs gap-1.5 border-[#e4eaf2]">
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Rate Contracts
              </Button>
            </Link>
            <Link href="/indents">
              <Button size="sm" className="text-xs gap-1.5 bg-[#2563eb] hover:bg-[#1d4ed8]">
                View All Indents
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const daysToExpiry = safeDaysToExpiry(rc.endDate);
  const isExpired = rc.status === "expired" || (daysToExpiry !== null && daysToExpiry < 0);
  const isExpiring = !isExpired && daysToExpiry !== null && daysToExpiry <= 60 && daysToExpiry >= 0;

  function handleClose() {
    updateRC.mutate({ id, data: { status: "closed" } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetRateContractQueryKey(id) });
        setCloseOpen(false);
      }
    });
  }

  function handleRenew() {
    if (!newEndDate) return;
    updateRC.mutate({ id, data: { status: "renewed", endDate: newEndDate } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetRateContractQueryKey(id) });
        setRenewOpen(false);
      }
    });
  }

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      {/* ── Breadcrumb & Header (neoInt Style) ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#e4eaf2] pb-3">
        <div className="flex items-center gap-3">
          <Link href="/rate-contracts">
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-[#6b7a93] hover:text-[#152340] px-2">
              <ArrowLeft className="h-3.5 w-3.5" /> Rate Contracts
            </Button>
          </Link>
          <div className="h-4 w-px bg-[#e4eaf2]" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-[#152340]">
                {rc.contractNumber}
              </h1>
              <StatusBadge status={rc.status} />
              {rc.financialYear && (
                <span className="neo-chip blu text-[10px]">FY {rc.financialYear}</span>
              )}
            </div>
            <p className="text-xs text-[#6b7a93] mt-0.5">
              Master Rate Contract Schedule · {rc.equipmentName} · {rc.vendorName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isExpired && (
            <Link href={`/tenders?equipment=${encodeURIComponent(rc.equipmentName)}`}>
              <Button size="sm" className="bg-[#186812] hover:bg-[#124e0d] text-white text-xs gap-1.5 shadow-xs">
                <Plus className="w-3.5 h-3.5" />
                <span>Initiate Replacement Tender</span>
              </Button>
            </Link>
          )}
          {rc.status === "active" && (
            <Link href={`/purchase-orders/new?rcId=${rc.id}`}>
              <Button size="sm" className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs gap-1.5 shadow-xs">
                <Send className="w-3.5 h-3.5" />
                <span>Create Purchase Order</span>
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* ── Status Banner for Expired / Expiring RCs ── */}
      {isExpired && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-xs font-bold text-red-900">
              Statutory Notice: Rate Contract Expired on {safeFormat(rc.endDate)}
            </h3>
            <p className="text-xs text-red-700 mt-0.5 leading-relaxed">
              This master agreement has concluded its validity period. Per TGMSIDC Procurement Rule BR-02, no new Purchase Orders can be drawn against an expired rate card. All incoming requisitions for <span className="font-semibold">{rc.equipmentName}</span> must be routed to open tendering (GeM / e-Procurement).
            </p>
          </div>
          <Link href={`/tenders?equipment=${encodeURIComponent(rc.equipmentName)}`}>
            <Button size="sm" variant="outline" className="text-xs border-red-300 text-red-700 hover:bg-red-100 shrink-0">
              Open Tender Flow
            </Button>
          </Link>
        </div>
      )}

      {isExpiring && (
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-xs font-bold text-amber-900">
              Rate Contract Validity Expiring in {daysToExpiry} Days ({safeFormat(rc.endDate)})
            </h3>
            <p className="text-xs text-amber-700 mt-0.5">
              Consider initiating extension approval via Board Finance Committee (BFC) or issuing fresh tender enquiry.
            </p>
          </div>
          <Button size="sm" onClick={() => setRenewOpen(true)} className="bg-amber-600 hover:bg-amber-700 text-white text-xs shrink-0">
            Renew Contract
          </Button>
        </div>
      )}

      {/* ── KPI Ribbon ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="neo-kpi-card">
          <span className="text-[10px] font-bold text-[#6b7a93] uppercase tracking-wider block">
            Approved Unit Price
          </span>
          <span className="text-xl font-bold text-[#152340] tabular-nums mt-1 block">
            ₹{(rc.unitPrice ?? 0).toLocaleString("en-IN")}
          </span>
          <span className="text-[10.5px] text-[#6b7a93] mt-0.5 block">
            Excl. GST ({rc.gstRate ?? 12}%)
          </span>
        </div>

        <div className="neo-kpi-card">
          <span className="text-[10px] font-bold text-[#6b7a93] uppercase tracking-wider block">
            Landed Unit Rate
          </span>
          <span className="text-xl font-bold text-[#159557] tabular-nums mt-1 block">
            ₹{((rc.unitPrice ?? 0) * (1 + (rc.gstRate ?? 12) / 100)).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
          </span>
          <span className="text-[10.5px] text-[#159557] font-semibold mt-0.5 block">
            Inclusive of {rc.gstRate ?? 12}% GST
          </span>
        </div>

        <div className="neo-kpi-card">
          <span className="text-[10px] font-bold text-[#6b7a93] uppercase tracking-wider block">
            Validity Period
          </span>
          <span className="text-xs font-bold text-[#152340] mt-1 block">
            {safeFormat(rc.startDate)} → {safeFormat(rc.endDate)}
          </span>
          <span className="text-[10.5px] mt-0.5 block font-semibold">
            {isExpired ? (
              <span className="text-[#dc2f3c]">Expired {Math.abs(daysToExpiry ?? 0)} days ago</span>
            ) : (
              <span className="text-[#159557]">{daysToExpiry} days remaining</span>
            )}
          </span>
        </div>

        <div className="neo-kpi-card">
          <span className="text-[10px] font-bold text-[#6b7a93] uppercase tracking-wider block">
            Max Order Ceiling
          </span>
          <span className="text-xl font-bold text-[#152340] tabular-nums mt-1 block">
            {rc.maxOrderQty ? `${rc.maxOrderQty} Units` : "Unlimited"}
          </span>
          <span className="text-[10.5px] text-[#6b7a93] mt-0.5 block">
            Warranty: {rc.warrantyMonths ? `${Math.round(rc.warrantyMonths / 12)} Yrs` : "3 Yrs"}
          </span>
        </div>
      </div>

      {/* ── Main Details Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left: Product & Vendor Details */}
        <Card className="border-[#e4eaf2] shadow-xs">
          <CardHeader className="pb-2.5 pt-3.5 px-4 border-b border-[#eff3f8]">
            <CardTitle className="text-xs font-bold text-[#152340] uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[#2563eb]" />
              Master Agreement &amp; Vendor
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-4">
            <DetailRow label="Contract Number" value={rc.contractNumber} mono />
            <DetailRow label="Equipment / Product" value={rc.equipmentName} bold />
            <DetailRow label="Category" value={rc.equipmentCategory || "Medical Equipment"} />
            <DetailRow label="OEM / Empanelled Vendor" value={rc.vendorName} bold />
            <DetailRow label="L1 Vendor Name" value={rc.l1VendorName || rc.vendorName} />
            {rc.l2VendorName && <DetailRow label="L2 Vendor" value={rc.l2VendorName} />}
            <DetailRow label="Tender Reference" value={rc.tenderRef || "Open Tender Ref #2024"} />
            <DetailRow label="BFC Approval Reference" value={rc.bfcApprovalRef || "BFC/TGMSIDC/APPROVED"} mono />
            <DetailRow label="Award Date" value={safeFormat(rc.awardDate || rc.startDate)} />
          </CardContent>
        </Card>

        {/* Right: Commercial & Service Terms */}
        <Card className="border-[#e4eaf2] shadow-xs">
          <CardHeader className="pb-2.5 pt-3.5 px-4 border-b border-[#eff3f8]">
            <CardTitle className="text-xs font-bold text-[#152340] uppercase tracking-wider flex items-center gap-1.5">
              <IndianRupee className="w-3.5 h-3.5 text-[#159557]" />
              Pricing, Warranty &amp; Maintenance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-4">
            <DetailRow label="Statutory Base Price" value={`₹${(rc.unitPrice ?? 0).toLocaleString("en-IN")}`} bold />
            <DetailRow label="Applicable GST" value={`${rc.gstRate ?? 12}%`} />
            <DetailRow
              label="All-Inclusive Landed Unit Price"
              value={`₹${((rc.unitPrice ?? 0) * (1 + (rc.gstRate ?? 12) / 100)).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`}
              bold
              highlight
            />
            <DetailRow
              label="Comprehensive Warranty"
              value={rc.warrantyMonths ? `${Math.round(rc.warrantyMonths / 12)} Years (${rc.warrantyMonths} Months)` : rc.warrantyYears ? `${rc.warrantyYears} Years` : "3 Years"}
            />
            <DetailRow
              label="CAMC Post-Warranty"
              value={rc.camcRatePerYear != null ? `₹${rc.camcRatePerYear.toLocaleString("en-IN")}/year (${rc.camcPeriodYears || 5} Years)` : rc.cmcCharges != null ? `₹${rc.cmcCharges.toLocaleString("en-IN")}/year` : "As per standard BFC rate schedule"}
            />
            <DetailRow label="Delivery Timelines" value={`${rc.supplyPeriodDays ?? 45} calendar days from PO date`} />
            <DetailRow label="Total POs Drawn to Date" value={`${rc.totalPOsIssued ?? 0} Purchase Orders`} />
            <DetailRow label="Total Qty Dispatched" value={`${rc.totalQtyOrdered ?? 0} Units`} />
          </CardContent>
        </Card>
      </div>

      {/* ── Technical Specifications Section ── */}
      <Card className="border-[#e4eaf2] shadow-xs">
        <CardHeader className="pb-2.5 pt-3.5 px-4 border-b border-[#eff3f8] flex flex-row items-center justify-between">
          <CardTitle className="text-xs font-bold text-[#152340] uppercase tracking-wider flex items-center gap-1.5">
            <Wrench className="w-3.5 h-3.5 text-[#2563eb]" />
            Standard Technical Specifications ({rc.equipmentName})
          </CardTitle>
          <span className="text-[11px] text-muted-foreground">Standardized TGMSIDC Equipment Master Specs</span>
        </CardHeader>
        <CardContent className="p-4">
          <ProductSpecSheet
            equipmentId={rc.equipmentId || rc.equipmentName}
            equipmentName={rc.equipmentName}
            editable={false}
          />
        </CardContent>
      </Card>

      {/* ── Contract Administration Controls ── */}
      {rc.status === "active" && (
        <Card className="border-[#e4eaf2] shadow-xs">
          <CardHeader className="pb-2.5 pt-3.5 px-4 border-b border-[#eff3f8]">
            <CardTitle className="text-xs font-bold text-[#152340] uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#159557]" />
              Contract Administration Controls
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={() => setRenewOpen(true)} className="bg-[#186812] hover:bg-[#124e0d] text-white text-xs gap-1.5">
                <RefreshCw className="w-3.5 h-3.5" /> Renew / Extend Contract Validity
              </Button>
              <Button variant="outline" onClick={() => setCloseOpen(true)} className="text-xs border-[#e4eaf2] text-[#dc2f3c] hover:bg-red-50">
                Close / Terminate Master Agreement
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Close Dialog */}
      <Dialog open={closeOpen} onOpenChange={setCloseOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-[#152340]">Close Rate Contract</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-[#6b7a93] py-2 leading-relaxed">
            Are you sure you want to close Rate Contract <span className="font-mono font-semibold text-[#152340]">{rc.contractNumber}</span>? No subsequent Purchase Orders can be issued against this agreement once closed.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setCloseOpen(false)} className="text-xs">
              Cancel
            </Button>
            <Button variant="destructive" size="sm" onClick={handleClose} disabled={updateRC.isPending} className="text-xs">
              {updateRC.isPending ? "Closing..." : "Confirm Closure"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Renew Dialog */}
      <Dialog open={renewOpen} onOpenChange={setRenewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-[#152340]">Renew Rate Contract Schedule</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <p className="text-xs text-[#6b7a93]">
              Select the approved revised validity end date as authorized under BFC proceedings:
            </p>
            <input
              type="date"
              value={newEndDate}
              onChange={(e) => setNewEndDate(e.target.value)}
              className="w-full border border-[#e4eaf2] rounded-md px-3 py-2 text-xs focus:outline-none focus:border-[#2563eb]"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setRenewOpen(false)} className="text-xs">
              Cancel
            </Button>
            <Button size="sm" onClick={handleRenew} disabled={updateRC.isPending || !newEndDate} className="bg-[#186812] hover:bg-[#124e0d] text-white text-xs">
              {updateRC.isPending ? "Renewing..." : "Apply Extension"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DetailRow({
  label,
  value,
  bold,
  mono,
  highlight,
}: {
  label: string;
  value: string;
  bold?: boolean;
  mono?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-[#eff3f8] last:border-0">
      <span className="text-xs text-[#6b7a93]">{label}</span>
      <span
        className={cn(
          "text-xs text-[#152340] text-right",
          bold && "font-semibold",
          mono && "font-mono font-medium",
          highlight && "text-[#159557] font-bold text-sm"
        )}
      >
        {value}
      </span>
    </div>
  );
}
