import { useState, useMemo } from "react";
import { useLocation, Link } from "wouter";
import { useCreatePurchaseOrder, useListIndents, useListRateContracts, useListInstitutions, useListVendors, type Indent, type RateContract } from "@/lib/api-hooks";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CheckCircle2, Package, ShoppingCart, IndianRupee, Layers, ShieldCheck, Users, Building2, Split } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface OrderItemRow {
  equipmentId: string;
  equipmentName: string;
  rateContractId: string;
  unitPrice: number;
  gstRate: number;
  qty: number;
  selected: boolean;
}

export default function PurchaseOrderNew() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { data: allIndents = [] } = useListIndents({});
  const { data: rcs = [] } = useListRateContracts({ status: "active" });
  const { data: institutions = [] } = useListInstitutions({});
  const { data: vendors = [] } = useListVendors({});
  const createPO = useCreatePurchaseOrder();

  // Filter indents ready for PO: linked_to_rc or approved
  const eligibleIndents = useMemo(() => {
    return allIndents.filter(i => ["linked_to_rc", "approved", "tender_initiated"].includes(i.status));
  }, [allIndents]);

  const [selectedIndentId, setSelectedIndentId] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 45);
    return d.toISOString().split("T")[0];
  });

  const [orderItems, setOrderItems] = useState<OrderItemRow[]>([]);

  // Performance Security (PS) & Bank Guarantee states (Process Book §5 Step 13)
  const [psRequired, setPsRequired] = useState(true);
  const [psPercent, setPsPercent] = useState<number>(5);
  const [bgDueDate, setBgDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split("T")[0];
  });

  // Multi-Vendor Allocation state (Process Book §5 Step 10 & §12 F-15)
  const [allocationMode, setAllocationMode] = useState<"single" | "split_60_40" | "split_70_30">("single");
  const [secondaryVendorId, setSecondaryVendorId] = useState("");

  // Consignee allocation state
  const [selectedFacilityId, setSelectedFacilityId] = useState("");

  // When indent changes, populate line items & defaults
  function handleIndentSelect(indentId: string) {
    setSelectedIndentId(indentId);
    const indent = allIndents.find(i => String(i.id) === indentId);
    if (!indent) return;

    if (!deliveryAddress) {
      setDeliveryAddress(indent.facilityName ? `${indent.facilityName}, Telangana` : "Medical Facility, Telangana");
    }
    if (indent.facilityId) {
      setSelectedFacilityId(String(indent.facilityId));
    }

    // Build selectable items from indent
    const items: OrderItemRow[] = [];
    if (indent.lineItems && indent.lineItems.length > 0) {
      for (const li of indent.lineItems) {
        const eqId = li.equipmentId || indent.equipmentId;
        const matchingRc = rcs.find(r => r.equipmentId === eqId || r.equipmentName.toLowerCase() === (li.equipmentName || "").toLowerCase()) || rcs[0];
        items.push({
          equipmentId: eqId || matchingRc?.equipmentId || "",
          equipmentName: li.equipmentName || matchingRc?.equipmentName || "Medical Equipment",
          rateContractId: matchingRc ? matchingRc.id : (indent.rateContractId || ""),
          unitPrice: matchingRc ? matchingRc.unitPrice : (li.estimatedUnitCost || 100000),
          gstRate: matchingRc ? matchingRc.gstRate : 12,
          qty: li.requestedQty || li.quantity || 1,
          selected: true,
        });
      }
    } else {
      const matchingRc = rcs.find(r => r.equipmentId === indent.equipmentId) || (indent.rateContractId ? rcs.find(r => r.id === indent.rateContractId) : rcs[0]);
      items.push({
        equipmentId: indent.equipmentId || matchingRc?.equipmentId || "",
        equipmentName: indent.equipmentName || matchingRc?.equipmentName || "Medical Equipment",
        rateContractId: matchingRc ? matchingRc.id : (indent.rateContractId || ""),
        unitPrice: matchingRc ? matchingRc.unitPrice : (indent.estimatedTotalValue || 100000),
        gstRate: matchingRc ? matchingRc.gstRate : 12,
        qty: indent.quantity || 1,
        selected: true,
      });
    }

    setOrderItems(items);
  }

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
      return {
        ...item,
        rateContractId: rcId,
        unitPrice: rc ? rc.unitPrice : item.unitPrice,
        gstRate: rc ? rc.gstRate : item.gstRate,
      };
    }));
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

  const isValid = selectedIndentId && selectedItems.length > 0 && deliveryAddress && expectedDeliveryDate && (!isSplit || secondaryVendorId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;

    try {
      const primaryItem = selectedItems[0];
      const rc = rcs.find(r => r.id === primaryItem.rateContractId);

      // Build consignees array
      const matchedFacility = institutions.find(inst => String(inst.id) === selectedFacilityId);
      const consignees = [
        {
          institutionId: matchedFacility?.id || selectedFacilityId || primaryItem.equipmentId,
          institutionName: matchedFacility?.name || deliveryAddress.split(",")[0] || "Designated Hospital",
          district: matchedFacility?.district || "Telangana",
          address: deliveryAddress,
          quantity: isSplit ? l1Qty : primaryItem.qty,
          deliveryStatus: "pending",
        }
      ];

      // Primary L1 Purchase Order
      const res = await createPO.mutateAsync({
        data: {
          indentId: selectedIndentId,
          rateContractId: primaryItem.rateContractId,
          vendorId: rc?.vendorId,
          equipmentId: primaryItem.equipmentId,
          quantity: isSplit ? l1Qty : primaryItem.qty,
          deliveryAddress,
          expectedDeliveryDate,
          psRequired,
          psPercent,
          psAmount: isSplit ? Math.round((psAmount * l1Ratio)) : psAmount,
          bgDueDate,
          vendorTier: "L1",
          allocationRatio: isSplit ? `${Math.round(l1Ratio * 100)}% (L1 BFC Allocation)` : "100%",
          consignees,
        }
      });

      // If split, create secondary L2 PO
      if (isSplit && l2Qty > 0 && secondaryVendorId) {
        const l2Vendor = vendors.find(v => String(v.id) === secondaryVendorId);
        await createPO.mutateAsync({
          data: {
            indentId: selectedIndentId,
            rateContractId: primaryItem.rateContractId,
            vendorId: secondaryVendorId,
            equipmentId: primaryItem.equipmentId,
            quantity: l2Qty,
            deliveryAddress,
            expectedDeliveryDate,
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
          }
        });
      }

      toast({
        title: isSplit ? "Multi-Vendor POs Released" : "Purchase Order Issued",
        description: isSplit
          ? `Created L1 PO (${l1Qty} units) and L2 PO (${l2Qty} units) under BFC statutory split.`
          : `Order ${res.poNumber || "PO"} created successfully. Performance Security: ₹${psAmount.toLocaleString("en-IN")}.`,
      });

      navigate(`/purchase-orders/${res.id}`);
    } catch (err: any) {
      toast({
        title: "Failed to create Purchase Order",
        description: err.message || "An unexpected error occurred",
        variant: "destructive",
      });
    }
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
          <h1 className="text-2xl font-bold tracking-tight">Issue Official Purchase Order</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Generate statutory purchase orders from approved indents with multi-vendor allocation and performance security
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
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
              <Label className="text-xs font-semibold">Approved Indent *</Label>
              <Select value={selectedIndentId} onValueChange={handleIndentSelect}>
                <SelectTrigger className="mt-1.5 h-10 text-sm">
                  <SelectValue placeholder="Select an approved requisition..." />
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
        {selectedIndentId && (
          <Card className="border border-border/80 shadow-sm">
            <CardHeader className="pb-3 bg-muted/20 border-b flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-emerald-600" />
                2. Equipment &amp; Rate Contract Line Items ({selectedItems.length} selected)
              </CardTitle>
              <Badge variant="outline" className="text-xs font-mono">
                {orderItems.length} Available in Indent
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="border rounded-xl overflow-hidden divide-y">
                {orderItems.map((item, idx) => {
                  const subtotal = item.unitPrice * item.qty;
                  const gst = (subtotal * item.gstRate) / 100;
                  const total = subtotal + gst;
                  return (
                    <div key={idx} className={`p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-colors ${item.selected ? "bg-emerald-50/40" : "bg-muted/20"}`}>
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={item.selected}
                          onCheckedChange={() => toggleItem(idx)}
                          id={`item-${idx}`}
                        />
                        <div>
                          <Label htmlFor={`item-${idx}`} className="text-sm font-bold cursor-pointer flex items-center gap-2">
                            {item.equipmentName}
                            {item.selected && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />}
                          </Label>
                          <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                            Unit Price: ₹{item.unitPrice.toLocaleString("en-IN")} + {item.gstRate}% GST
                          </p>
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
                              {rcs.map((rc) => (
                                <SelectItem key={rc.id} value={String(rc.id)} className="text-xs">
                                  {rc.contractNumber} — ₹{rc.unitPrice.toLocaleString("en-IN")} ({rc.vendorName})
                                </SelectItem>
                              ))}
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
        {selectedIndentId && (
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
                  Under Process Book §5 Step 13, the empanelled supplier must submit a Bank Guarantee equal to {psPercent}% of the order value before equipment dispatch.
                </p>
              </CardContent>
            )}
          </Card>
        )}

        {/* 4. Multi-Vendor PO Allocation (Process Book §5 Step 10 & §12 F-15) */}
        {selectedIndentId && (
          <Card className="border border-border/80 shadow-sm">
            <CardHeader className="pb-3 bg-muted/20 border-b">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Split className="h-4 w-4 text-primary" />
                4. Statutory Multi-Vendor Allocation (BFC Approved Ratio)
              </CardTitle>
              <CardDescription className="text-xs">
                Per Process Book §5 Step 10, when BFC approves split supply across L1 and L2 vendors, the system issues separate POs proportionally.
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

        {/* 5. Order Summary & Submit Toolbar */}
        {selectedIndentId && (
          <Card className="border border-border/80 shadow-md bg-muted/20">
            <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Total Landed Procurement Value (Incl. Taxes &amp; PS)
                </p>
                <div className="flex items-baseline gap-3">
                  <p className="text-3xl font-black text-emerald-800 font-mono">
                    ₹{Math.round(totalCost).toLocaleString("en-IN")}
                  </p>
                  {psRequired && (
                    <Badge variant="outline" className="text-xs font-mono bg-emerald-50 text-emerald-700 border-emerald-300">
                      + ₹{psAmount.toLocaleString("en-IN")} PS Bank Guarantee
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {isSplit ? `2 Separate POs will be generated (${l1Qty} L1 + ${l2Qty} L2 units)` : `1 PO will be issued for ${totalQty} units`}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Link href="/purchase-orders">
                  <Button type="button" variant="outline">Cancel</Button>
                </Link>
                <Button
                  type="submit"
                  disabled={createPO.isPending || !isValid}
                  className="bg-[#186812] hover:bg-[#124e0d] text-white shadow-md font-semibold px-6"
                >
                  {createPO.isPending ? "Generating Order..." : isSplit ? "Release Split Purchase Orders" : "Issue Purchase Order"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </form>
    </div>
  );
}
