import { useState } from "react";
import { useListEquipment, getListEquipmentQueryKey, useCreateEquipment, useListRateContracts, useListTenders } from "@/lib/api-hooks";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Plus, Search, CheckCircle2, ChevronRight, IndianRupee, Clock, XCircle, ShieldAlert, Gavel,
} from "lucide-react";
import type { Equipment } from "@/lib/api-hooks";
import { ProductSpecSheet } from "@/components/ProductSpecSheet";
import {
  PRODUCT_CATEGORIES, getProductCategory, getProductSpecs, getCategoryMeta,
} from "@/lib/productSpecs";
import { cn } from "@/lib/utils";
import { differenceInDays } from "date-fns";

type RCStatus = "active_rc" | "expiring_soon" | "expired" | "tender_in_progress" | "no_coverage";

function getRCStatus(
  equipmentId: number | string,
  equipmentName: string,
  rateContracts: any[] = [],
  tenders: any[] = [],
): { status: RCStatus; daysLeft?: number; rc?: any } {
  const today = new Date();
  const itemRCs = rateContracts.filter((rc) => 
    String(rc.equipmentId) === String(equipmentId) ||
    (rc.equipmentName && rc.equipmentName.toLowerCase() === equipmentName.toLowerCase())
  );
  const activeRC = itemRCs.find((rc) => rc.status === "active" && new Date(rc.endDate) > today);
  const expiredRC = itemRCs.some((rc) => new Date(rc.endDate) <= today);
  const activeTender = tenders.find((t) => {
    const first = equipmentName.toLowerCase().split(" ")[0];
    return t.equipmentName.toLowerCase().includes(first) && t.status !== "rc_created" && t.status !== "awarded";
  });

  if (activeRC) {
    const daysLeft = differenceInDays(new Date(activeRC.endDate), today);
    return { status: daysLeft <= 180 ? "expiring_soon" : "active_rc", daysLeft, rc: activeRC };
  }
  if (activeTender) return { status: "tender_in_progress" };
  if (expiredRC)    return { status: "expired" };
  return { status: "no_coverage" };
}

const RC_STATUS_META: Record<RCStatus, { label: string; icon: React.ElementType; cls: string }> = {
  active_rc:          { label: "Active RC",         icon: CheckCircle2, cls: "text-emerald-600 bg-emerald-50" },
  expiring_soon:      { label: "Expiring",           icon: Clock,        cls: "text-amber-600 bg-amber-50" },
  expired:            { label: "Expired",            icon: XCircle,      cls: "text-red-600 bg-red-50" },
  tender_in_progress: { label: "Tender",             icon: Gavel,        cls: "text-blue-600 bg-blue-50" },
  no_coverage:        { label: "No RC",              icon: ShieldAlert,  cls: "text-slate-500 bg-slate-50" },
};

const SUBCATEGORY_LABELS: Record<string, string> = {
  imaging: "Imaging",
  icu: "ICU / Critical Care",
  laboratory: "Laboratory",
  operation_theatre: "Operation Theatre",
  general: "General",
};

const GST_OPTIONS = ["5", "12", "18"];

export default function Equipment() {
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [selectedEq, setSelectedEq] = useState<Equipment | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({
    name: "", category: "imaging", specifications: "", gstRate: "12",
  });

  const queryClient = useQueryClient();
  const { data: equipment = [], isLoading } = useListEquipment({ query: { queryKey: getListEquipmentQueryKey() } });
  const { data: liveRCs = [] } = useListRateContracts();
  const { data: liveTenders = [] } = useListTenders();
  const createEquipment = useCreateEquipment();
  const f = (k: keyof typeof form, v: string) => setForm({ ...form, [k]: v });

  const filtered = equipment.filter((e) =>
    (!search ||
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      (e.commonName && e.commonName.toLowerCase().includes(search.toLowerCase())) ||
      e.equipmentCode.toLowerCase().includes(search.toLowerCase()) ||
      (e.department && e.department.toLowerCase().includes(search.toLowerCase()))
    ) &&
    (catFilter === "all" || getProductCategory(e.equipmentCode || e.id) === catFilter)
  );

  function handleCreate() {
    createEquipment.mutate(
      { data: { ...form, gstRate: parseFloat(form.gstRate) } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListEquipmentQueryKey() });
          setAddOpen(false);
          setForm({ name: "", category: "imaging", specifications: "", gstRate: "12" });
        },
      }
    );
  }

  const formatINR = (n: number) =>
    n >= 10_000_000
      ? `₹${(n / 10_000_000).toFixed(2)} Cr`
      : n >= 1_00_000
      ? `₹${(n / 1_00_000).toFixed(2)} L`
      : `₹${n.toLocaleString("en-IN")}`;

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Equipment Master</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Standardised biomedical equipment library with official technical specifications and procurement guidelines
          </p>
        </div>
        <Button size="sm" className="gap-2" onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" /> Add Product
        </Button>
      </div>

      {/* Category filter chips */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setCatFilter("all")}
          className={cn(
            "px-3 py-1.5 rounded-full text-sm font-medium border transition-colors",
            catFilter === "all"
              ? "bg-primary text-white border-primary"
              : "bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
          )}
        >
          All Products
          <span className="ml-1.5 text-[11px] opacity-70">({equipment.length})</span>
        </button>
        {PRODUCT_CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const count = equipment.filter((e) => getProductCategory(e.equipmentCode || e.id) === cat.value).length;
          return (
            <button
              key={cat.value}
              type="button"
              onClick={() => setCatFilter(cat.value)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors",
                catFilter === cat.value
                  ? `${cat.bgColor} ${cat.color} ${cat.borderColor}`
                  : "bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {cat.label}
              <span className="text-[11px] opacity-70">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Search bar */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, common name, code, dept…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Equipment table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin h-6 w-6 rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Equipment_Master_ID</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Standard_Equipment_Name</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Common_Name</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Equipment_Category</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Typical_Department</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Est. Unit Rate</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">GST %</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">RC Coverage</th>
                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">Technical Specs</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-16 text-center text-muted-foreground">
                        No products found matching filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((e) => {
                      const specs = getProductSpecs(e.equipmentCode || e.id);
                      const catMeta = getCategoryMeta(specs?.productCategory || e.category);
                      const CatIcon = catMeta.icon;
                      const commonName = e.commonName || specs?.commonName || e.name;
                      const dept = e.department || specs?.typicalDepartment || "General";
                      const estRate = specs?.estimatedUnitRate || e.estimatedUnitCost || 0;
                      const rcInfo = getRCStatus(e.id, e.name, liveRCs, liveTenders);
                      const activeRC = rcInfo.rc;
                      const displayRate = activeRC ? activeRC.unitPrice : estRate;
                      return (
                        <tr
                          key={e.id}
                          className="border-b hover:bg-muted/30 transition-colors cursor-pointer group"
                          onClick={() => setSelectedEq(e)}
                        >
                          <td className="px-4 py-3 font-mono text-xs font-bold text-primary">{e.equipmentCode}</td>
                          <td className="px-4 py-3">
                            <p className="font-semibold text-foreground group-hover:text-primary transition-colors">{e.name}</p>
                            {specs?.general.make && (
                              <p className="text-[11px] text-muted-foreground mt-0.5">{specs.general.make.split("/")[0].trim()}</p>
                            )}
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-700">{commonName}</td>
                          <td className="px-4 py-3">
                            <span className={cn(
                              "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border",
                              catMeta.bgColor, catMeta.color, catMeta.borderColor
                            )}>
                              <CatIcon className="h-3 w-3" />
                              {e.category || catMeta.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            <span className="px-2 py-0.5 bg-muted text-muted-foreground text-xs rounded-full">
                              {dept}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {displayRate > 0 ? (
                              <div className="flex flex-col">
                                <span className="inline-flex items-center gap-0.5 font-semibold text-foreground">
                                  <IndianRupee className="h-3 w-3" />
                                  {formatINR(displayRate).replace("₹", "")}
                                </span>
                                {activeRC && (
                                  <span className="text-[10px] text-emerald-600 font-semibold">Active RC Rate</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 font-semibold">{e.gstRate}%</td>
                          <td className="px-4 py-3" onClick={(ev) => ev.stopPropagation()}>
                            {(() => {
                              const { status, daysLeft } = rcInfo;
                              const m = RC_STATUS_META[status];
                              const Icon = m.icon;
                              return (
                                <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium", m.cls)}>
                                  <Icon className="h-3 w-3 shrink-0" />
                                  {m.label}
                                  {daysLeft != null && status === "expiring_soon" && (
                                    <span className="opacity-70 ml-0.5">{daysLeft}d</span>
                                  )}
                                </span>
                              );
                            })()}
                          </td>
                          <td className="px-4 py-3 text-center" onClick={(ev) => { ev.stopPropagation(); setSelectedEq(e); }}>
                            <Button variant="outline" size="sm" className="h-7 text-xs gap-1 border-primary/30 text-primary hover:bg-primary hover:text-white">
                              View Specs
                              <ChevronRight className="h-3 w-3" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Spec sheet slide-over */}
      <Sheet open={!!selectedEq} onOpenChange={(open) => { if (!open) setSelectedEq(null); }}>
        <SheetContent className="sm:max-w-[680px] p-0 flex flex-col">
          <SheetHeader className="px-6 py-4 border-b shrink-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <SheetTitle className="text-base leading-snug pr-8">{selectedEq?.name}</SheetTitle>
                {selectedEq && (
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="font-mono text-xs font-bold text-primary">{selectedEq.equipmentCode}</span>
                    <Separator orientation="vertical" className="h-3" />
                    <span className="text-xs text-muted-foreground font-medium">{selectedEq.commonName || selectedEq.name}</span>
                    <Separator orientation="vertical" className="h-3" />
                    {(() => {
                      const catMeta = getCategoryMeta(getProductCategory(selectedEq.equipmentCode || selectedEq.id));
                      const CatIcon = catMeta.icon;
                      return (
                        <span className={cn(
                          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border",
                          catMeta.bgColor, catMeta.color, catMeta.borderColor
                        )}>
                          <CatIcon className="h-3 w-3" />
                          {selectedEq.category || catMeta.label}
                        </span>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>
          </SheetHeader>
          <ScrollArea className="flex-1">
            <div className="px-6 py-4">
              {selectedEq && (
                <ProductSpecSheet
                  equipmentId={selectedEq.id}
                  equipmentCode={selectedEq.equipmentCode}
                  equipmentName={selectedEq.name}
                  editable
                />
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Add product dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Product to Master</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Product Name *</Label>
              <Input value={form.name} onChange={(e) => f("name", e.target.value)} className="mt-1.5" placeholder="e.g. Portable Pulse Oximeter" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Sub-type / Category *</Label>
                <Select value={form.category} onValueChange={(v) => f("category", v)}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="imaging">Imaging</SelectItem>
                    <SelectItem value="icu">ICU / Critical Care</SelectItem>
                    <SelectItem value="laboratory">Laboratory</SelectItem>
                    <SelectItem value="operation_theatre">Operation Theatre</SelectItem>
                    <SelectItem value="general">General</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>GST Rate *</Label>
                <Select value={form.gstRate} onValueChange={(v) => f("gstRate", v)}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {GST_OPTIONS.map((r) => (
                      <SelectItem key={r} value={r}>{r}%</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Specifications *</Label>
              <Textarea
                value={form.specifications}
                onChange={(e) => f("specifications", e.target.value)}
                rows={3}
                className="mt-1.5"
                placeholder="Core technical specification summary…"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button
              onClick={handleCreate}
              disabled={createEquipment.isPending || !form.name || !form.specifications}
            >
              {createEquipment.isPending ? "Adding…" : "Add Product"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
