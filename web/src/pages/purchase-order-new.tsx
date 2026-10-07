import { useState, useMemo, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useCreatePurchaseOrder, useListIndents, useListRateContracts, useGetRateContract, useListInstitutions, useListVendors, type Indent, type RateContract } from "@/lib/api-hooks";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, CheckCircle2, Package, ShoppingCart, IndianRupee, Layers,
  ShieldCheck, Users, Building2, Split, FileText, Phone, Mail, MapPin, Tag,
  AlertCircle, ExternalLink, Send, Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface OrderItemRow {
  equipmentId: string;
  equipmentName: string;
  rateContractId: string;
  rcNumber?: string;
  vendorId?: string;
  vendorName?: string;
  unitPrice: number;
  gstRate: number;
  qty: number;
  selected: boolean;
  indentLineIndex?: number;
  category?: string;
  department?: string;
  specifications?: string;
  isSameVendor?: boolean;
  candidateRCs?: Array<{
    id: string;
    contractNumber: string;
    vendorId: string;
    vendorName: string;
    unitPrice: number;
    gstRate?: number;
  }>;
}

function safeFormatDate(dateVal: any, pattern = "dd MMM yyyy"): string {
  if (!dateVal) return "—";
  try {
    const dt = dateVal instanceof Date ? dateVal : new Date(dateVal);
    if (isNaN(dt.getTime())) return "—";
    return format(dt, pattern);
  } catch {
    return "—";
  }
}

export default function PurchaseOrderNew() {
  const { user } = useAuth();
  const isRaisePoAllowed = user?.role === "admin" || user?.role === "tgmsidc_user" || user?.role === "gm_equipment" || (user?.role as string) === "gm";
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const { data: allIndents = [] } = useListIndents({});
  const { data: rcs = [] } = useListRateContracts({ status: "active" });
  const { data: institutions = [] } = useListInstitutions({});
  const { data: vendors = [] } = useListVendors({});
  const createPO = useCreatePurchaseOrder();

  // Extract query params (for "Draft PO from Indent" and "Create PO from RC" flows)
  const searchParams = new URLSearchParams(window.location.search);
  const rcIdFromParam = searchParams.get("rcId") || "";
  const indentIdFromParam = searchParams.get("indentId") || "";
  const lineIndexFromParam = searchParams.get("lineIndex");

  // Filter indents ready for PO: linked_to_rc, approved, ready_for_procurement, in_procurement
  const eligibleIndents = useMemo(() => {
    return allIndents.filter(i =>
      ["linked_to_rc", "approved", "tender_initiated", "in_procurement", "ready_for_procurement", "verification_completed"].includes(i.status) ||
      String(i.id) === indentIdFromParam || String((i as any)._id) === indentIdFromParam
    );
  }, [allIndents, indentIdFromParam]);

  const [selectedIndentId, setSelectedIndentId] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState(() => {
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 45);
    return defaultDate.toISOString().split("T")[0];
  });
  const [submitting, setSubmitting] = useState(false);

  const [orderItems, setOrderItems] = useState<OrderItemRow[]>([]);
  const [identifiedVendorId, setIdentifiedVendorId] = useState("");
  const [identifiedVendorName, setIdentifiedVendorName] = useState("");

  // Performance Security (PS) & Bank Guarantee states (Process Book §5 Step 13)
  const [psRequired, setPsRequired] = useState(true);
  const [psPercent, setPsPercent] = useState<number>(5);
  const [bgDueDate, setBgDueDate] = useState(() => {
    const bgTarget = new Date();
    bgTarget.setDate(bgTarget.getDate() + 30);
    return bgTarget.toISOString().split("T")[0];
  });

  // Multi-Vendor Allocation state (Process Book §5 Step 10 & §12 F-15)
  const [allocationMode, setAllocationMode] = useState<"single" | "split_60_40" | "split_70_30">("single");
  const [secondaryVendorId, setSecondaryVendorId] = useState("");

  // Consignee allocation state
  const [selectedFacilityId, setSelectedFacilityId] = useState("");

  // Ensure page always starts at top on mount or param change
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [indentIdFromParam, rcIdFromParam]);

  // Auto-populate from RC ONLY IF no indentId is specified (Create PO directly from RC view)
  useEffect(() => {
    if (!rcIdFromParam || indentIdFromParam || !rcs.length) return;
    const matchedRc = rcs.find(r => r.id === rcIdFromParam);
    if (!matchedRc) return;
    // Pre-populate one order item from the matched RC
    setIdentifiedVendorId(matchedRc.vendorId ? String(matchedRc.vendorId) : "");
    setIdentifiedVendorName(matchedRc.vendorName || "");
    setOrderItems([{
      equipmentId: matchedRc.equipmentId || "",
      equipmentName: matchedRc.equipmentName,
      rateContractId: matchedRc.id,
      rcNumber: matchedRc.contractNumber,
      vendorId: matchedRc.vendorId ? String(matchedRc.vendorId) : undefined,
      vendorName: matchedRc.vendorName,
      unitPrice: matchedRc.unitPrice,
      gstRate: matchedRc.gstRate ?? 12,
      qty: 1,
      selected: true,
      isSameVendor: true,
    }]);
    if (!deliveryAddress) {
      setDeliveryAddress("TGMSIDC Central Biomedical Warehouse, Sultan Bazar, Hyderabad, Telangana - 500095");
    }
  }, [rcIdFromParam, indentIdFromParam, rcs]);

  // When indent changes, populate line items & defaults
  function handleIndentSelect(indentId: string, targetLineIndex?: number, targetRcId?: string) {
    setSelectedIndentId(indentId);
    const indent = allIndents.find(i => String(i.id) === indentId || String((i as any)._id) === indentId || i.indentNumber === indentId);
    if (!indent) return;

    if (!deliveryAddress || deliveryAddress.includes("Central Biomedical Warehouse")) {
      setDeliveryAddress(indent.facilityName ? `${indent.facilityName}, Telangana` : "Medical Facility, Telangana");
    }
    if (indent.facilityId) {
      setSelectedFacilityId(String(indent.facilityId));
    }

    // Build selectable items from indent
    const items: OrderItemRow[] = [];
    if (indent.lineItems && indent.lineItems.length > 0) {
      // First, compute matched RC for each item
      const resolvedList = indent.lineItems.map((li, idx) => {
        const eqId = li.equipmentId || indent.equipmentId;

        // Accurate RC matching priority:
        // 1. Specified targetRcId from query for targetLineIndex
        // 2. li.rateContractId
        // 3. li.candidateRateContracts
        // 4. RC whose unitPrice matches
        // 5. Any RC for this equipment
        const useTargetRc = (targetLineIndex !== undefined && idx === targetLineIndex && targetRcId) ? targetRcId : undefined;
        const candidateRcIds = (li.candidateRateContracts || []).map((c: any) => String(c.rcId || c.rateContractId));

        const matchingRc =
          (useTargetRc && rcs.find(r => r.id === useTargetRc)) ||
          (li.rateContractId && rcs.find(r => r.id === li.rateContractId)) ||
          (candidateRcIds.length > 0 && rcs.find(r => candidateRcIds.includes(String(r.id)))) ||
          (li.estimatedUnitCost && rcs.find(r =>
            (r.equipmentId === eqId || r.equipmentName.toLowerCase() === (li.equipmentName || "").toLowerCase()) &&
            (r.unitPrice === li.estimatedUnitCost || Math.round(r.unitPrice * (1 + (r.gstRate ?? 12) / 100)) === li.estimatedUnitCost)
          )) ||
          (li.rateContractUnitPrice && rcs.find(r =>
            (r.equipmentId === eqId || r.equipmentName.toLowerCase() === (li.equipmentName || "").toLowerCase()) &&
            r.unitPrice === li.rateContractUnitPrice
          )) ||
          rcs.find(r => r.equipmentId === eqId || r.equipmentName.toLowerCase() === (li.equipmentName || "").toLowerCase()) ||
          rcs[0];

        const eligibleRcs = rcs.filter(r =>
          (eqId && r.equipmentId === eqId) ||
          r.equipmentName.toLowerCase().trim() === (li.equipmentName || "").toLowerCase().trim() ||
          candidateRcIds.includes(String(r.id))
        );

        const resolvedUnitPrice = matchingRc
          ? matchingRc.unitPrice
          : (li.rateContractUnitPrice || li.estimatedUnitCost || 100000);
        const resolvedGstRate = matchingRc ? (matchingRc.gstRate ?? 12) : 12;

        return {
          li,
          idx,
          matchingRc,
          eligibleRcs,
          resolvedUnitPrice,
          resolvedGstRate,
        };
      });

      // Target vendor determination:
      // If targetLineIndex is specified, find its vendor. Otherwise find first with RC.
      const primaryTarget = (targetLineIndex !== undefined && resolvedList[targetLineIndex])
        ? resolvedList[targetLineIndex]
        : resolvedList.find(r => r.matchingRc) || resolvedList[0];

      const primeVendorId = primaryTarget?.matchingRc?.vendorId ? String(primaryTarget.matchingRc.vendorId) : "";
      const primeVendorName = primaryTarget?.matchingRc?.vendorName || "";

      setIdentifiedVendorId(primeVendorId);
      setIdentifiedVendorName(primeVendorName);

      resolvedList.forEach(({ li, idx, matchingRc, eligibleRcs, resolvedUnitPrice, resolvedGstRate }) => {
        const itemVendorId = matchingRc?.vendorId ? String(matchingRc.vendorId) : "";
        const itemVendorName = matchingRc?.vendorName || "";

        // Check if item shares the same vendor based on tagged Rate Contract
        const isSameVendor = Boolean(
          primeVendorId && (itemVendorId === primeVendorId || (itemVendorName && primeVendorName && itemVendorName.toLowerCase().trim() === primeVendorName.toLowerCase().trim()))
        );

        // Pre-select target line or items sharing the same vendor!
        const shouldSelect = (targetLineIndex !== undefined)
          ? (idx === targetLineIndex || isSameVendor)
          : isSameVendor || idx === 0;

        items.push({
          equipmentId: li.equipmentId || matchingRc?.equipmentId || "",
          equipmentName: li.equipmentName || matchingRc?.equipmentName || "Medical Equipment",
          rateContractId: matchingRc ? matchingRc.id : (li.rateContractId || indent.rateContractId || ""),
          rcNumber: matchingRc?.contractNumber || li.rateContractNumber || "",
          vendorId: itemVendorId,
          vendorName: itemVendorName,
          unitPrice: resolvedUnitPrice,
          gstRate: resolvedGstRate,
          qty: li.requestedQty || li.quantity || 1,
          selected: shouldSelect,
          indentLineIndex: idx,
          category: li.category,
          department: li.department,
          specifications: li.specifications,
          isSameVendor,
          candidateRCs: eligibleRcs.map(r => ({
            id: r.id,
            contractNumber: r.contractNumber,
            vendorId: String(r.vendorId),
            vendorName: r.vendorName,
            unitPrice: r.unitPrice,
            gstRate: r.gstRate ?? 12,
          })),
        });
      });
    } else {
      const eqId = indent.equipmentId;
      const matchingRc =
        (targetRcId && rcs.find(r => r.id === targetRcId)) ||
        rcs.find(r => r.equipmentId === eqId || r.equipmentName.toLowerCase() === (indent.equipmentName || "").toLowerCase()) ||
        (indent.rateContractId ? rcs.find(r => r.id === indent.rateContractId) : rcs[0]);

      if (matchingRc) {
        setIdentifiedVendorId(String(matchingRc.vendorId));
        setIdentifiedVendorName(matchingRc.vendorName);
      }

      items.push({
        equipmentId: indent.equipmentId || matchingRc?.equipmentId || "",
        equipmentName: indent.equipmentName || matchingRc?.equipmentName || "Medical Equipment",
        rateContractId: matchingRc ? matchingRc.id : (indent.rateContractId || ""),
        rcNumber: matchingRc?.contractNumber || "",
        vendorId: matchingRc?.vendorId ? String(matchingRc.vendorId) : undefined,
        vendorName: matchingRc?.vendorName,
        unitPrice: matchingRc ? matchingRc.unitPrice : (indent.estimatedTotalValue || 100000),
        gstRate: matchingRc ? (matchingRc.gstRate ?? 12) : 12,
        qty: indent.quantity || 1,
        selected: true,
        isSameVendor: true,
      });
    }

    setOrderItems(items);
  }

  // Pre-populate when coming from Indent "Draft PO"
  useEffect(() => {
    if (!indentIdFromParam || !allIndents.length) return;
    const matched = allIndents.find(i => String(i.id) === indentIdFromParam || String((i as any)._id) === indentIdFromParam || i.indentNumber === indentIdFromParam);
    if (matched) {
      handleIndentSelect(String(matched.id || (matched as any)._id), lineIndexFromParam !== null ? Number(lineIndexFromParam) : undefined, rcIdFromParam);
    }
  }, [indentIdFromParam, allIndents.length, lineIndexFromParam, rcIdFromParam, rcs.length]);

  function toggleItem(index: number) {
    setOrderItems(prev => prev.map((item, i) => i === index ? { ...item, selected: !item.selected } : item));
  }

  function updateItemQty(index: number, qty: number) {
    setOrderItems(prev => prev.map((item, i) => i === index ? { ...item, qty: Math.max(1, qty) } : item));
  }

  function updateItemRC(index: number, rcId: string) {
    const rc = rcs.find(r => r.id === rcId);
    setOrderItems(prev => prev.map((item, i) => {
      if (i !== index) return item;
      const primeVid = identifiedVendorId;
      const primeVnm = identifiedVendorName.toLowerCase().trim();
      const rcVid = rc ? String(rc.vendorId) : "";
      const rcVnm = rc?.vendorName ? rc.vendorName.toLowerCase().trim() : "";
      const isSame = Boolean((primeVid && rcVid === primeVid) || (primeVnm && rcVnm && primeVnm === rcVnm));
      return {
        ...item,
        rateContractId: rcId,
        rcNumber: rc ? rc.contractNumber : item.rcNumber,
        vendorId: rcVid || item.vendorId,
        vendorName: rc?.vendorName || item.vendorName,
        unitPrice: rc ? rc.unitPrice : item.unitPrice,
        gstRate: rc ? (rc.gstRate ?? 12) : item.gstRate,
        isSameVendor: isSame,
      };
    }));
  }

  function selectAllSameVendor(select: boolean) {
    setOrderItems(prev => prev.map(item => item.isSameVendor ? { ...item, selected: select } : item));
  }

  const selectedItems = orderItems.filter(i => i.selected && i.rateContractId);
  const totalCost = selectedItems.reduce((sum, item) => {
    const subtotal = item.unitPrice * item.qty;
    const gst = (subtotal * item.gstRate) / 100;
    return sum + subtotal + gst;
  }, 0);

  // Performance Security amount
  const psAmount = psRequired ? Math.round((totalCost * psPercent) / 100) : 0;

  // Split quantities calculation
  const totalQty = selectedItems.reduce((sum, i) => sum + i.qty, 0);
  const isSplit = allocationMode !== "single";
  const l1Ratio = allocationMode === "split_70_30" ? 0.7 : allocationMode === "split_60_40" ? 0.6 : 1.0;
  const l1Qty = Math.ceil(totalQty * l1Ratio);
  const l2Qty = isSplit ? totalQty - l1Qty : 0;

  const isValid = (selectedIndentId || rcIdFromParam) && selectedItems.length > 0 && deliveryAddress && expectedDeliveryDate && (!isSplit || secondaryVendorId);

  const primaryItem = selectedItems[0];
  const selectedRc = rcs.find(r => r.id === primaryItem?.rateContractId) || (rcIdFromParam ? rcs.find(r => r.id === rcIdFromParam) : null);
  const selectedVendor = vendors.find(v => String(v.id) === String(selectedRc?.vendorId)) || vendors.find(v => v.name === selectedRc?.vendorName);
  const selectedIndent = allIndents.find(i => String(i.id) === selectedIndentId || String((i as any)._id) === selectedIndentId || i.indentNumber === selectedIndentId);
  const selectedLineIndex = lineIndexFromParam !== null ? Number(lineIndexFromParam) : (orderItems.findIndex(i => i.selected) >= 0 ? orderItems.findIndex(i => i.selected) : 0);
  const selectedLineItem = selectedIndent?.lineItems?.[selectedLineIndex];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid || submitting || createPO.isPending) return;
    setSubmitting(true);

    try {
      const rc = rcs.find(r => r.id === primaryItem?.rateContractId) || selectedRc;

      // Build consignees array
      const matchedFacility = institutions.find(inst => String(inst.id) === selectedFacilityId);
      const consignees = [
        {
          institutionId: matchedFacility?.id || selectedFacilityId || primaryItem.equipmentId,
          institutionName: matchedFacility?.name || deliveryAddress.split(",")[0] || "Designated Hospital",
          district: matchedFacility?.district || "Telangana",
          address: deliveryAddress,
          quantity: isSplit ? l1Qty : totalQty,
          deliveryStatus: "pending",
        }
      ];

      const itemsPayload = selectedItems.map(item => ({
        equipmentId: item.equipmentId,
        equipmentName: item.equipmentName,
        rateContractId: item.rateContractId,
        rcNumber: item.rcNumber || rcs.find(r => r.id === item.rateContractId)?.contractNumber || "",
        quantity: isSplit ? Math.ceil(item.qty * l1Ratio) : item.qty,
        unitPrice: item.unitPrice,
        gstRate: item.gstRate,
        gstAmount: Math.round((item.unitPrice * (isSplit ? Math.ceil(item.qty * l1Ratio) : item.qty) * item.gstRate) / 100),
        unitPriceInclTax: Math.round(item.unitPrice * (1 + item.gstRate / 100)),
        totalAmount: Math.round(item.unitPrice * (isSplit ? Math.ceil(item.qty * l1Ratio) : item.qty) * (1 + item.gstRate / 100)),
        indentLineItemIndex: item.indentLineIndex,
        specifications: item.specifications || "",
        category: item.category || "Medical Equipment",
        department: item.department || "General",
      }));

      // Primary L1 Purchase Order
      const res = await createPO.mutateAsync({
        data: {
          indentId: selectedIndentId || undefined,
          lineIndex: selectedItems.length === 1 ? selectedItems[0].indentLineIndex : undefined,
          rateContractId: primaryItem.rateContractId || rcIdFromParam,
          vendorId: rc?.vendorId,
          vendorName: rc?.vendorName || selectedVendor?.name,
          equipmentId: primaryItem.equipmentId,
          equipmentName: selectedItems.map(i => i.equipmentName).join(" + "),
          items: itemsPayload,
          quantity: isSplit ? l1Qty : totalQty,
          totalAmount: isSplit ? Math.round(totalCost * l1Ratio) : totalCost,
          deliveryAddress,
          expectedDeliveryDate,
          financialYear: "2026-27",
          psRequired,
          psPercent,
          psAmount: isSplit ? Math.round((psAmount * l1Ratio)) : psAmount,
          bgDueDate,
          vendorTier: "L1",
          allocationRatio: isSplit ? `${Math.round(l1Ratio * 100)}% (L1 BFC Allocation)` : "100%",
          consignees,
          status: "draft",
          approvalStatus: "draft",
        }
      });

      // If split, create secondary L2 PO
      if (isSplit && l2Qty > 0 && secondaryVendorId) {
        const l2Vendor = vendors.find(v => String(v.id) === secondaryVendorId);
        const l2ItemsPayload = selectedItems.map(item => ({
          equipmentId: item.equipmentId,
          equipmentName: item.equipmentName,
          rateContractId: item.rateContractId,
          rcNumber: item.rcNumber || rcs.find(r => r.id === item.rateContractId)?.contractNumber || "",
          quantity: Math.max(1, item.qty - Math.ceil(item.qty * l1Ratio)),
          unitPrice: item.unitPrice,
          gstRate: item.gstRate,
          gstAmount: Math.round((item.unitPrice * Math.max(1, item.qty - Math.ceil(item.qty * l1Ratio)) * item.gstRate) / 100),
          unitPriceInclTax: Math.round(item.unitPrice * (1 + item.gstRate / 100)),
          totalAmount: Math.round(item.unitPrice * Math.max(1, item.qty - Math.ceil(item.qty * l1Ratio)) * (1 + item.gstRate / 100)),
          indentLineItemIndex: item.indentLineIndex,
          specifications: item.specifications || "",
          category: item.category || "Medical Equipment",
          department: item.department || "General",
        }));

        await createPO.mutateAsync({
          data: {
            indentId: selectedIndentId || undefined,
            lineIndex: selectedItems.length === 1 ? selectedItems[0].indentLineIndex : undefined,
            rateContractId: primaryItem.rateContractId,
            vendorId: secondaryVendorId,
            vendorName: l2Vendor?.name || "Secondary Vendor",
            equipmentId: primaryItem.equipmentId,
            equipmentName: selectedItems.map(i => i.equipmentName).join(" + "),
            items: l2ItemsPayload,
            quantity: l2Qty,
            totalAmount: Math.round(totalCost * (1 - l1Ratio)),
            deliveryAddress,
            expectedDeliveryDate,
            financialYear: "2026-27",
            psRequired,
            psPercent,
            psAmount: Math.round(psAmount * (1 - l1Ratio)),
            bgDueDate,
            vendorTier: "L2",
            allocationRatio: `${Math.round((1 - l1Ratio) * 100)}% (L2 BFC Allocation)`,
            consignees: [
              {
                institutionId: matchedFacility?.id || selectedFacilityId || primaryItem.equipmentId,
                institutionName: matchedFacility?.name || deliveryAddress.split(",")[0] || "Designated Hospital",
                district: matchedFacility?.district || "Telangana",
                address: deliveryAddress,
                quantity: l2Qty,
                deliveryStatus: "pending",
              }
            ],
            status: "draft",
            approvalStatus: "draft",
          }
        });
      }

      toast({
        title: "Draft PO Created & Tagged to Indent",
        description: `Draft PO ${res.poNumber || "PO"} created with ${selectedItems.length} equipment item(s) for ${rc?.vendorName || selectedVendor?.name || "empanelled vendor"}.`,
      });

      navigate(`/purchase-orders/${res.id}?fromDraft=true`);
    } catch (err: any) {
      toast({
        title: "Failed to create Purchase Order",
        description: err.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (!isRaisePoAllowed) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Access Restricted</h2>
        <p className="text-sm text-slate-600 max-w-md mx-auto">
          Only authorized roles (<strong>TGMSIDC User</strong>, <strong>General Manager (GM)</strong>, and <strong>Administrator</strong>) are permitted to draft or raise Purchase Orders.
        </p>
        <Link href="/purchase-orders">
          <Button variant="outline" className="mt-2">Back to Purchase Orders</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-3">
        <Link href="/purchase-orders">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Purchase Orders &gt; Raise PO</h1>
            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-xs">
              Review &amp; Draft PO
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Review Rate Contract terms, item technical schedule, and associated empanelled vendor details to generate a Draft Purchase Order
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* RC-based flow banner */}
        {rcIdFromParam && (
          <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0" />
            <div>
              <p className="text-xs font-bold text-blue-900">Creating PO from Rate Contract</p>
              <p className="text-[11px] text-blue-700 mt-0.5">
                Equipment and pricing have been pre-filled from the selected Rate Contract. Provide delivery details to proceed.
              </p>
            </div>
          </div>
        )}

        {/* 1. Indent & Facility Selection */}
        <Card className="border border-border/80 shadow-sm">
          <CardHeader className="pb-3 bg-muted/20 border-b">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              1. Indent Requisition &amp; Consignee Destination
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div>
              <Label className="text-xs font-semibold">Approved Indent {rcIdFromParam ? "(Optional — auto-linked from RC)" : "*"}</Label>
              <Select value={selectedIndentId} onValueChange={handleIndentSelect}>
                <SelectTrigger className="mt-1.5 h-10 text-sm">
                  <SelectValue placeholder={rcIdFromParam ? "Select an indent (optional)..." : "Select an approved requisition..."} />
                </SelectTrigger>
                <SelectContent>
                  {eligibleIndents.map((i) => (
                    <SelectItem key={i.id} value={String(i.id)}>
                      {i.indentNumber} — {i.facilityName} ({i.equipmentName}) [Status: {i.status}]
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-semibold">Receiving Consignee Institution</Label>
                <Select value={selectedFacilityId} onValueChange={setSelectedFacilityId}>
                  <SelectTrigger className="mt-1.5 h-10 text-sm">
                    <SelectValue placeholder="Select receiving hospital..." />
                  </SelectTrigger>
                  <SelectContent>
                    {institutions.map((inst) => (
                      <SelectItem key={inst.id} value={String(inst.id)}>
                        {inst.name} ({inst.district})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold">Expected Delivery Date (SLA) *</Label>
                <Input
                  type="date"
                  value={expectedDeliveryDate}
                  onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                  className="mt-1.5 h-10 text-sm"
                  required
                />
                <p className="text-[11px] text-muted-foreground mt-1">Default 45 calendar days supply period per Rate Contract.</p>
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold">Full Delivery Address &amp; Contact *</Label>
              <Textarea
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                rows={2}
                className="mt-1.5 text-sm"
                placeholder="Institutional delivery location, department, contact person, and mobile number..."
                required
              />
            </div>
          </CardContent>
        </Card>

        {/* 2. Item & Rate Contract Selection */}
        {(selectedIndentId || (rcIdFromParam && orderItems.length > 0)) && (
          <Card className="border border-border/80 shadow-sm">
            <CardHeader className="pb-3 bg-muted/20 border-b flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4 text-emerald-600" />
                  2. Equipment &amp; Rate Contract Line Items ({selectedItems.length} selected)
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                  Items sharing the same Rate Contract empanelled vendor can be updated and consolidated into this single PO.
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-xs font-mono">
                {orderItems.length} {rcIdFromParam && !selectedIndentId ? "from Rate Contract" : "Available in Indent"}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              {/* Same Vendor Identification Banner */}
              {identifiedVendorName && orderItems.filter(i => i.isSameVendor).length > 1 && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-emerald-950 shadow-2xs">
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-sm text-emerald-900 flex items-center gap-2">
                        Same Empanelled Vendor Identified — {identifiedVendorName}
                        <Badge className="bg-emerald-600 text-white text-[10px]">
                          {orderItems.filter(i => i.isSameVendor).length} Items Eligible
                        </Badge>
                      </p>
                      <p className="text-emerald-800 text-xs mt-0.5">
                        Based on the Rate Contracts tagged to <strong>{identifiedVendorName}</strong>, multiple items in Indent <strong>#{selectedIndent?.indentNumber || "Requisition"}</strong> share this supplier. You can update quantities, select RCs, and add both items into this single Purchase Order.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs border-emerald-400 bg-white text-emerald-800 hover:bg-emerald-100 cursor-pointer"
                      onClick={() => selectAllSameVendor(true)}
                    >
                      Select All ({orderItems.filter(i => i.isSameVendor).length})
                    </Button>
                  </div>
                </div>
              )}

              <div className="border rounded-xl overflow-hidden divide-y">
                {orderItems.map((item, idx) => {
                  const subtotal = item.unitPrice * item.qty;
                  const gst = (subtotal * item.gstRate) / 100;
                  const total = subtotal + gst;
                  const disabledCheckbox = !item.isSameVendor && selectedItems.length > 0;
                  return (
                    <div key={idx} className={`p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-colors ${item.selected ? "bg-emerald-50/40" : "bg-muted/20"}`}>
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={item.selected}
                          onCheckedChange={() => toggleItem(idx)}
                          disabled={disabledCheckbox}
                          id={`item-${idx}`}
                        />
                        <div>
                          <Label htmlFor={`item-${idx}`} className={`text-sm font-bold flex items-center gap-2 ${disabledCheckbox ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}>
                            {item.equipmentName}
                            {item.selected && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />}
                          </Label>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="text-xs text-muted-foreground font-mono">
                              Unit Price: ₹{item.unitPrice.toLocaleString("en-IN")} + {item.gstRate}% GST
                            </span>
                            {item.vendorName && (
                              <Badge variant="outline" className={`text-[10px] ${item.isSameVendor ? "bg-emerald-50 text-emerald-800 border-emerald-300 font-medium" : "bg-amber-50 text-amber-800 border-amber-300"}`}>
                                {item.isSameVendor ? `✓ Same Vendor (${item.vendorName})` : `Different Vendor (${item.vendorName})`}
                              </Badge>
                            )}
                            {item.rcNumber && (
                              <Badge variant="outline" className="text-[10px] font-mono text-slate-700 bg-slate-50">
                                {item.rcNumber}
                              </Badge>
                            )}
                            {item.category && (
                              <span className="text-[11px] text-muted-foreground">
                                · {item.category}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                        <div className="w-24">
                          <Label className="text-[10px] text-muted-foreground uppercase">Order Qty</Label>
                          <Input
                            type="number"
                            min="1"
                            value={item.qty}
                            onChange={(e) => updateItemQty(idx, parseInt(e.target.value) || 1)}
                            disabled={!item.selected}
                            className="h-9 mt-1 font-mono font-bold"
                          />
                        </div>

                        <div className="w-64">
                          <Label className="text-[10px] text-muted-foreground uppercase">Rate Contract</Label>
                          <Select
                            value={item.rateContractId}
                            onValueChange={(val) => updateItemRC(idx, val)}
                            disabled={!item.selected}
                          >
                            <SelectTrigger className="h-9 mt-1 text-xs truncate">
                              <SelectValue placeholder="Select RC..." />
                            </SelectTrigger>
                            <SelectContent>
                              {rcs
                                .slice()
                                .sort((a, b) => {
                                  const aMatches = (a.equipmentId && a.equipmentId === item.equipmentId) || a.equipmentName.toLowerCase() === item.equipmentName.toLowerCase();
                                  const bMatches = (b.equipmentId && b.equipmentId === item.equipmentId) || b.equipmentName.toLowerCase() === item.equipmentName.toLowerCase();
                                  if (aMatches && !bMatches) return -1;
                                  if (!aMatches && bMatches) return 1;
                                  return 0;
                                })
                                .map((rc) => {
                                  const matchesEq = (rc.equipmentId && rc.equipmentId === item.equipmentId) || rc.equipmentName.toLowerCase() === item.equipmentName.toLowerCase();
                                  const matchesVendor = identifiedVendorId && (String(rc.vendorId) === String(identifiedVendorId) || rc.vendorName === identifiedVendorName);
                                  return (
                                    <SelectItem key={rc.id} value={String(rc.id)} className="text-xs">
                                      {rc.contractNumber} — ₹{rc.unitPrice.toLocaleString("en-IN")} + {rc.gstRate ?? 12}% GST ({rc.vendorName}){matchesVendor ? " ★ Same Vendor" : matchesEq ? " ★" : ""}
                                    </SelectItem>
                                  );
                                })}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="text-right min-w-[110px]">
                          <span className="text-[10px] text-muted-foreground uppercase block">Landed Value</span>
                          <span className="text-sm font-bold font-mono text-foreground">
                            ₹{Math.round(total).toLocaleString("en-IN")}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 3. Performance Security (PS) & Bank Guarantee (Process Book §5 Step 13-14) */}
        {(selectedIndentId || (rcIdFromParam && orderItems.length > 0)) && (
          <Card className="border border-border/80 shadow-sm">
            <CardHeader className="pb-3 bg-muted/20 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  3. Performance Security (PS) &amp; Bank Guarantee (BG) Mandate
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="ps-toggle"
                    checked={psRequired}
                    onCheckedChange={(c) => setPsRequired(!!c)}
                  />
                  <Label htmlFor="ps-toggle" className="text-xs font-semibold cursor-pointer">
                    Performance Security Required
                  </Label>
                </div>
              </div>
            </CardHeader>
            {psRequired && (
              <CardContent className="space-y-4 pt-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-xs font-semibold">PS Percentage</Label>
                    <Select
                      value={String(psPercent)}
                      onValueChange={(v) => setPsPercent(Number(v))}
                    >
                      <SelectTrigger className="mt-1.5 h-10 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5% (Standard Equipment Contract)</SelectItem>
                        <SelectItem value="10">10% (High Value / Critical Lifesaving)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">Calculated PS Security Amount</Label>
                    <div className="h-10 mt-1.5 rounded-md border bg-muted/30 px-3 flex items-center font-mono font-bold text-emerald-800 text-sm">
                      ₹{psAmount.toLocaleString("en-IN")}
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">BG Submission Deadline (30 Days)</Label>
                    <Input
                      type="date"
                      value={bgDueDate}
                      onChange={(e) => setBgDueDate(e.target.value)}
                      className="mt-1.5 h-10 text-sm"
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  The empanelled supplier must submit a Bank Guarantee equal to {psPercent}% of the order value before equipment dispatch.
                </p>
              </CardContent>
            )}
          </Card>
        )}

        {/* 4. Multi-Vendor PO Allocation */}
        {(selectedIndentId || (rcIdFromParam && orderItems.length > 0)) && (
          <Card className="border border-border/80 shadow-sm">
            <CardHeader className="pb-3 bg-muted/20 border-b">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Split className="h-4 w-4 text-primary" />
                4. Statutory Multi-Vendor Allocation (BFC Approved Ratio)
              </CardTitle>
              <CardDescription className="text-xs">
                When BFC approves split supply across L1 and L2 vendors, the system issues separate POs proportionally.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-semibold">Allocation Ratio Mode</Label>
                  <Select
                    value={allocationMode}
                    onValueChange={(v: any) => setAllocationMode(v)}
                  >
                    <SelectTrigger className="mt-1.5 h-10 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">Single Vendor (100% to Primary L1 Vendor)</SelectItem>
                      <SelectItem value="split_60_40">Multi-Vendor Split — 60% L1 : 40% L2 (Standard BFC Rule)</SelectItem>
                      <SelectItem value="split_70_30">Multi-Vendor Split — 70% L1 : 30% L2 (Alternative Ratio)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {isSplit && (
                  <div>
                    <Label className="text-xs font-semibold">Secondary Empanelled Vendor (L2) *</Label>
                    <Select
                      value={secondaryVendorId}
                      onValueChange={setSecondaryVendorId}
                    >
                      <SelectTrigger className="mt-1.5 h-10 text-sm">
                        <SelectValue placeholder="Select L2 empanelled vendor..." />
                      </SelectTrigger>
                      <SelectContent>
                        {vendors.map((v) => (
                          <SelectItem key={v.id} value={String(v.id)}>
                            {v.name} ({v.vendorCode || "Empanelled"}) — Tier {v.vendorTier || "L2"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Split Distribution Preview */}
              {isSplit && (
                <div className="p-4 rounded-xl border bg-blue-50/50 space-y-2">
                  <p className="text-xs font-bold text-blue-900 uppercase tracking-wide">
                    Multi-Vendor Split PO Generation Preview:
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="bg-white p-3 rounded-lg border border-blue-200">
                      <p className="font-semibold text-foreground">Purchase Order #1 — Primary (L1)</p>
                      <p className="text-muted-foreground mt-0.5">Allocation: {Math.round(l1Ratio * 100)}%</p>
                      <p className="font-bold text-primary text-sm mt-1">Quantity: {l1Qty} Units</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-blue-200">
                      <p className="font-semibold text-foreground">Purchase Order #2 — Secondary (L2)</p>
                      <p className="text-muted-foreground mt-0.5">Allocation: {Math.round((1 - l1Ratio) * 100)}%</p>
                      <p className="font-bold text-blue-700 text-sm mt-1">Quantity: {l2Qty} Units</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── 4. Rate Contract, Equipment Item & Associated Vendor Scrutiny Review Panel ── */}
        {(selectedRc || primaryItem) && (
          <Card className="border border-slate-300 shadow-sm bg-white overflow-hidden">
            <CardHeader className="bg-slate-900 text-white p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-400" />
                    <CardTitle className="text-sm font-bold text-white tracking-wide">
                      Rate Contract &amp; Associated Vendor Statutory Scrutiny
                    </CardTitle>
                    <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-400/30 text-[10px]">
                      FR-RPT-RC-001 Verified
                    </Badge>
                  </div>
                  <CardDescription className="text-xs text-slate-300">
                    Mandatory TGMSIDC scrutiny of contracted rates, item technical schedule, and empanelled supplier before drafting PO.
                  </CardDescription>
                </div>
                <div className="text-xs text-slate-300 sm:text-right font-mono">
                  {selectedRc?.contractNumber ? `Contract #${selectedRc.contractNumber}` : "Direct Rate Contract"}
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4 space-y-4 bg-slate-50/50">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Panel 1: Rate Contract Details */}
                <div className="bg-white border border-slate-200 rounded-lg p-3.5 space-y-2 shadow-2xs">
                  <div className="flex items-center justify-between border-b pb-1.5 border-slate-100">
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5 text-blue-600" /> Rate Contract
                    </span>
                    <Badge variant="outline" className="text-[9px] bg-emerald-50 text-emerald-800 border-emerald-200">
                      Active
                    </Badge>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Contract Number:</span>
                      <span className="font-mono font-bold text-slate-900">{selectedRc?.contractNumber || "RC-2627-0001"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Contracted Unit Rate:</span>
                      <span className="font-semibold text-slate-900">₹{(selectedRc?.unitPrice || primaryItem?.unitPrice || 0).toLocaleString("en-IN")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Applicable GST:</span>
                      <span className="font-semibold text-slate-900">{selectedRc?.gstRate ?? 12}% (₹{Math.round(((selectedRc?.unitPrice || primaryItem?.unitPrice || 0) * (selectedRc?.gstRate ?? 12)) / 100).toLocaleString("en-IN")})</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Landed Rate (Incl. Tax):</span>
                      <span className="font-bold text-emerald-700">₹{Math.round((selectedRc?.unitPrice || primaryItem?.unitPrice || 0) * (1 + (selectedRc?.gstRate ?? 12) / 100)).toLocaleString("en-IN")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Validity Window:</span>
                      <span className="text-slate-700 text-[11px]">
                        {selectedRc?.startDate ? safeFormatDate(selectedRc.startDate, "dd MMM yyyy") : "01 Apr 2026"} to {selectedRc?.endDate ? safeFormatDate(selectedRc.endDate, "dd MMM yyyy") : "31 Mar 2028"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Tender Reference:</span>
                      <span className="font-mono text-slate-700">{selectedRc?.tenderNumber || selectedRc?.tenderRef || "TND-2026-27-001"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Supply SLA:</span>
                      <span className="font-medium text-slate-700">{selectedRc?.supplyPeriodDays || 45} Calendar Days</span>
                    </div>
                  </div>
                </div>

                {/* Panel 2: Equipment Item & Hospital Requisition */}
                <div className="bg-white border border-slate-200 rounded-lg p-3.5 space-y-2 shadow-2xs">
                  <div className="flex items-center justify-between border-b pb-1.5 border-slate-100">
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Package className="h-3.5 w-3.5 text-emerald-600" /> Item &amp; Consignee
                    </span>
                    <Badge variant="outline" className="text-[9px] bg-slate-100 text-slate-700">
                      Requisition #{selectedIndent?.indentNumber || "Requisition"}
                    </Badge>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div>
                      <span className="text-slate-500 block text-[10px]">Equipment Name:</span>
                      <span className="font-bold text-slate-900 block truncate">{primaryItem?.equipmentName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Category &amp; Dept:</span>
                      <span className="font-medium text-slate-700">{selectedLineItem?.category || "Medical Equipment"} · {selectedLineItem?.department || "General"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Requested Quantity:</span>
                      <span className="font-bold text-slate-900">{primaryItem?.qty} Units</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Consignee Hospital:</span>
                      <span className="font-semibold text-slate-900 truncate max-w-[150px]" title={selectedIndent?.facilityName || deliveryAddress}>
                        {selectedIndent?.facilityName || deliveryAddress.split(",")[0] || "Telangana Hospital"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">District:</span>
                      <span className="text-slate-700">{selectedIndent?.institutions?.[0]?.district || "Telangana"}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Technical Specifications:</span>
                      <p className="text-[11px] text-slate-600 line-clamp-2 mt-0.5" title={selectedLineItem?.specifications || selectedIndent?.technicalRequirements}>
                        {selectedLineItem?.specifications || selectedIndent?.technicalRequirements || "Conforming strictly to TGMSIDC technical parameters and clinical schedule."}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Panel 3: Associated Vendor Profile */}
                <div className="bg-white border border-slate-200 rounded-lg p-3.5 space-y-2 shadow-2xs">
                  <div className="flex items-center justify-between border-b pb-1.5 border-slate-100">
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5 text-purple-600" /> Associated Vendor
                    </span>
                    <Badge variant="outline" className="text-[9px] bg-purple-50 text-purple-700 border-purple-200">
                      Empanelled Supplier
                    </Badge>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div>
                      <span className="text-slate-500 block text-[10px]">Vendor / OEM:</span>
                      <span className="font-bold text-slate-900 block truncate">{selectedVendor?.name || selectedRc?.vendorName || "Empanelled Vendor"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Vendor Code:</span>
                      <span className="font-mono text-slate-700">{selectedVendor?.vendorCode || `VND-TGMSIDC-00${selectedVendor?.id || "1"}`}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Contact Person:</span>
                      <span className="font-medium text-slate-800">{selectedVendor?.contactPerson || "Manager - Sales & Dispatch"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Phone:</span>
                      <span className="text-slate-700">{selectedVendor?.contactPhone || "+91-9849012345"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Email:</span>
                      <span className="text-slate-700 truncate max-w-[150px]">{selectedVendor?.contactEmail || "sales@empanelled.gov.in"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">GSTIN:</span>
                      <span className="font-mono font-medium text-slate-800">{selectedVendor?.gstin || "36AAACB1234F1Z5"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Registered City:</span>
                      <span className="text-slate-700">{selectedVendor?.address?.split(",")?.slice(-2)?.join(", ") || "Hyderabad, Telangana"}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Multi-Item Breakdown Table when > 1 item is selected */}
              {selectedItems.length > 1 && (
                <div className="bg-white border border-slate-200 rounded-lg p-3.5 space-y-2.5 shadow-2xs">
                  <div className="flex items-center justify-between border-b pb-2 border-slate-100">
                    <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5 text-emerald-600" />
                      Consolidated Purchase Order Line Items Schedule ({selectedItems.length} Items)
                    </span>
                    <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-800 border-emerald-300">
                      Empanelled Vendor: {selectedVendor?.name || selectedRc?.vendorName || identifiedVendorName}
                    </Badge>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 text-slate-600 border-b">
                        <tr>
                          <th className="py-2 px-2.5 text-left font-semibold">#</th>
                          <th className="py-2 px-2.5 text-left font-semibold">Equipment Item</th>
                          <th className="py-2 px-2.5 text-left font-semibold">Rate Contract</th>
                          <th className="py-2 px-2.5 text-center font-semibold">Qty</th>
                          <th className="py-2 px-2.5 text-right font-semibold">Contracted Rate</th>
                          <th className="py-2 px-2.5 text-right font-semibold">GST %</th>
                          <th className="py-2 px-2.5 text-right font-semibold">Landed Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {selectedItems.map((it, iIdx) => {
                          const subtotal = it.unitPrice * it.qty;
                          const gst = (subtotal * it.gstRate) / 100;
                          const landed = subtotal + gst;
                          const itRc = rcs.find(r => r.id === it.rateContractId);
                          return (
                            <tr key={iIdx} className="hover:bg-slate-50/60">
                              <td className="py-2.5 px-2.5 text-slate-500 font-mono">{iIdx + 1}</td>
                              <td className="py-2.5 px-2.5 font-bold text-slate-900">{it.equipmentName}</td>
                              <td className="py-2.5 px-2.5 font-mono text-slate-700">{it.rcNumber || itRc?.contractNumber || "RC Active"}</td>
                              <td className="py-2.5 px-2.5 text-center font-bold font-mono">{it.qty}</td>
                              <td className="py-2.5 px-2.5 text-right font-mono">₹{it.unitPrice.toLocaleString("en-IN")}</td>
                              <td className="py-2.5 px-2.5 text-right">{it.gstRate}%</td>
                              <td className="py-2.5 px-2.5 text-right font-mono font-bold text-emerald-700">₹{Math.round(landed).toLocaleString("en-IN")}</td>
                            </tr>
                          );
                        })}
                        <tr className="bg-emerald-50/40 font-bold border-t">
                          <td colSpan={3} className="py-2.5 px-2.5 text-slate-900">Total Consolidated Procurement Value</td>
                          <td className="py-2.5 px-2.5 text-center font-mono text-slate-900">{totalQty} Units</td>
                          <td colSpan={2}></td>
                          <td className="py-2.5 px-2.5 text-right font-mono text-emerald-800 text-sm">₹{Math.round(totalCost).toLocaleString("en-IN")}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Statutory Review Affirmation */}
              <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-lg p-3 text-xs text-emerald-900 flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-bold text-emerald-950">TGMSIDC Scrutiny Affirmation</p>
                  <p className="text-[11px] text-emerald-800 leading-relaxed">
                    By clicking <strong>Draft PO</strong>, you confirm that Rate Contract #{selectedRc?.contractNumber || "RC-001"} has been verified, pricing and item specifications match requisition standards, and the order will be prepared as a Draft Purchase Order tagged to Indent #{selectedIndent?.indentNumber || "Requisition"} for GM review.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 5. Order Summary & Submit Toolbar */}
        {(selectedIndentId || (rcIdFromParam && orderItems.length > 0)) && (
          <Card className="border border-border/80 shadow-md bg-muted/20">
            <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Total Landed Procurement Value (Incl. Taxes)
                </p>
                <div className="flex items-baseline gap-3">
                  <p className="text-3xl font-black text-emerald-800 font-mono">
                    ₹{Math.round(totalCost).toLocaleString("en-IN")}
                  </p>
                  {psRequired && (
                    <Badge variant="outline" className="text-xs font-mono bg-emerald-50 text-emerald-700 border-emerald-300">
                      + ₹{psAmount.toLocaleString("en-IN")} PS Bank Guarantee ({psPercent}%)
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {isSplit ? `2 Separate POs will be drafted (${l1Qty} L1 + ${l2Qty} L2 units)` : `Draft PO will be tagged to Indent #${selectedIndent?.indentNumber || ""}`}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Link href="/purchase-orders">
                  <Button type="button" variant="outline">Cancel</Button>
                </Link>
                <Button
                  type="submit"
                  disabled={submitting || createPO.isPending || !isValid}
                  className="shadow-md font-semibold px-6 gap-2 cursor-pointer"
                >
                  {submitting || createPO.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileText className="h-4 w-4" />
                  )}
                  {submitting || createPO.isPending ? "Drafting PO..." : isSplit ? "Draft Split Purchase Orders" : "Draft PO"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </form>
    </div>
  );
}
