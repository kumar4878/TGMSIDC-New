import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle2, Package, Wrench, BarChart3, ShieldCheck,
  Clock, FileText, ChevronDown, ChevronUp, Pencil, Save, X, Plus, Trash2,
} from "lucide-react";
import type { ProductTechSpecs } from "@/lib/productSpecs";
import { getProductSpecs, updateProductSpecs, getCategoryMeta } from "@/lib/productSpecs";
import { cn } from "@/lib/utils";

interface SectionProps {
  title: string;
  icon: React.ElementType;
  iconColor?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function Section({ title, icon: Icon, iconColor = "text-primary", children, defaultOpen = true }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border rounded-lg overflow-hidden bg-card">
      <button
        type="button"
        className="w-full flex items-center justify-between px-4 py-2.5 bg-muted/40 hover:bg-muted/70 transition-colors text-left"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-2">
          <Icon className={cn("h-4 w-4", iconColor)} />
          <span className="text-sm font-semibold">{title}</span>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>
      {open && <div className="px-4 py-3">{children}</div>}
    </div>
  );
}

function SpecGrid({ fields }: { fields: Array<{ label: string; value: string | boolean | undefined | null }> }) {
  const visible = fields.filter((f) => f.value !== undefined && f.value !== null && f.value !== "");
  if (visible.length === 0) return <p className="text-xs text-muted-foreground italic py-1">No data available.</p>;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
      {visible.map(({ label, value }) => (
        <div key={label}>
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">{label}</p>
          <p className="text-sm text-foreground mt-0.5 leading-snug font-normal">
            {typeof value === "boolean" ? (value ? "Yes" : "No") : String(value)}
          </p>
        </div>
      ))}
    </div>
  );
}

export interface ProductSpecSheetProps {
  equipmentId: number | string;
  equipmentCode?: string;
  equipmentName: string;
  compact?: boolean;
  editable?: boolean;
}

export function ProductSpecSheet({ equipmentId, equipmentCode, equipmentName, compact = false, editable = false }: ProductSpecSheetProps) {
  const currentSpecs = getProductSpecs(equipmentCode || equipmentId || equipmentName);
  const [specs, setSpecs] = useState<ProductTechSpecs | null>(currentSpecs);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<ProductTechSpecs | null>(null);

  // Sync state if prop changes
  if (specs?.equipmentCode !== currentSpecs?.equipmentCode && !editing && currentSpecs) {
    setSpecs(currentSpecs);
  }

  if (!specs) {
    return (
      <div className="text-center py-8 text-muted-foreground bg-muted/20 rounded-lg border border-dashed p-6">
        <Wrench className="h-8 w-8 mx-auto mb-2 opacity-40 text-primary" />
        <p className="text-sm font-medium">Standard specifications for {equipmentName || "this equipment"} are being indexed.</p>
        <p className="text-xs mt-1 text-muted-foreground">Contact the Biomedical Engineering Cell for custom parameters.</p>
      </div>
    );
  }

  function startEdit() {
    if (!specs) return;
    const initial: ProductTechSpecs = {
      ...specs,
      general: specs.general || {},
      technical: specs.technical || {},
      performance: specs.performance || {},
      regulatory: specs.regulatory || {},
      accessories: specs.accessories || [],
      warranty: specs.warranty || { years: 3, cmcStartYear: 4, cmcAnnualRate: 0 },
      documentation: specs.documentation || [],
    };
    setDraft(JSON.parse(JSON.stringify(initial)));
    setEditing(true);
  }

  function cancelEdit() {
    setDraft(null);
    setEditing(false);
  }

  function saveEdit() {
    if (!draft) return;
    updateProductSpecs(equipmentId, draft);
    setSpecs({ ...draft });
    setEditing(false);
    setDraft(null);
  }

  function patchGeneral(field: string, value: string) {
    if (!draft) return;
    setDraft({ ...draft, general: { ...(draft.general || {}), [field]: value } });
  }

  function patchTechnical(field: string, value: string) {
    if (!draft) return;
    setDraft({ ...draft, technical: { ...(draft.technical || {}), [field]: value } });
  }

  function patchWarranty(field: string, value: string) {
    if (!draft) return;
    const num = parseFloat(value) || 0;
    setDraft({ ...draft, warranty: { ...(draft.warranty || { years: 3, cmcStartYear: 4, cmcAnnualRate: 0 }), [field]: num } });
  }

  function patchPerformanceKey(oldKey: string, newKey: string) {
    if (!draft) return;
    const entries = Object.entries(draft.performance || {});
    const idx = entries.findIndex(([k]) => k === oldKey);
    if (idx === -1) return;
    entries[idx] = [newKey, entries[idx][1]];
    setDraft({ ...draft, performance: Object.fromEntries(entries) });
  }

  function patchPerformanceValue(key: string, value: string) {
    if (!draft) return;
    setDraft({ ...draft, performance: { ...(draft.performance || {}), [key]: value } });
  }

  function addPerformanceRow() {
    if (!draft) return;
    const key = `New Parameter ${Object.keys(draft.performance || {}).length + 1}`;
    setDraft({ ...draft, performance: { ...(draft.performance || {}), [key]: "" } });
  }

  function deletePerformanceRow(key: string) {
    if (!draft) return;
    const { [key]: _, ...rest } = draft.performance || {};
    setDraft({ ...draft, performance: rest });
  }

  function patchRegulatoryBool(field: keyof ProductTechSpecs["regulatory"], checked: boolean) {
    if (!draft) return;
    setDraft({ ...draft, regulatory: { ...(draft.regulatory || {}), [field]: checked } });
  }

  function patchRegulatoryStr(field: keyof ProductTechSpecs["regulatory"], value: string) {
    if (!draft) return;
    setDraft({ ...draft, regulatory: { ...(draft.regulatory || {}), [field]: value } });
  }

  function patchAccessory(idx: number, value: string) {
    if (!draft) return;
    const next = [...(draft.accessories || [])];
    next[idx] = value;
    setDraft({ ...draft, accessories: next });
  }

  function addAccessory() {
    if (!draft) return;
    setDraft({ ...draft, accessories: [...(draft.accessories || []), ""] });
  }

  function deleteAccessory(idx: number) {
    if (!draft) return;
    setDraft({ ...draft, accessories: (draft.accessories || []).filter((_, i) => i !== idx) });
  }

  function patchDoc(idx: number, value: string) {
    if (!draft) return;
    const next = [...(draft.documentation || [])];
    next[idx] = value;
    setDraft({ ...draft, documentation: next });
  }

  function addDoc() {
    if (!draft) return;
    setDraft({ ...draft, documentation: [...(draft.documentation || []), ""] });
  }

  function deleteDoc(idx: number) {
    if (!draft) return;
    setDraft({ ...draft, documentation: (draft.documentation || []).filter((_, i) => i !== idx) });
  }

  const current = editing && draft ? draft : specs;

  const formatINR = (n?: number) => {
    if (!n) return "—";
    return n >= 1_00_000 ? `₹${(n / 1_00_000).toFixed(2)} L` : `₹${n.toLocaleString("en-IN")}`;
  };

  const catMeta = getCategoryMeta(current.productCategory || "");
  const categoryLabel = catMeta?.label || (current.productCategory || "Biomedical").replace(/_/g, " ");

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
              {current.equipmentCode || equipmentCode}
            </span>
            <p className="font-semibold text-sm text-foreground">{equipmentName || current.standardName}</p>
          </div>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <Badge variant="secondary" className="text-[10px] capitalize">
              {categoryLabel}
            </Badge>
            {current.typicalDepartment && (
              <Badge variant="outline" className="text-[10px] border-slate-300 text-slate-700 bg-slate-50">
                {current.typicalDepartment}
              </Badge>
            )}
            {current.estimatedUnitRate ? (
              <Badge variant="outline" className="text-[10px] text-emerald-700 border-emerald-300 bg-emerald-50">
                Est. {formatINR(current.estimatedUnitRate)} / unit
              </Badge>
            ) : null}
            {current.regulatory?.ceMark && (
              <Badge variant="outline" className="text-[10px] border-blue-300 text-blue-700 bg-blue-50/50">
                CE Mark
              </Badge>
            )}
            {current.regulatory?.aerbClearance && (
              <Badge variant="outline" className="text-[10px] border-orange-300 text-orange-700 bg-orange-50/50">
                AERB Clearance Req.
              </Badge>
            )}
            {current.regulatory?.bisIsiMark && (
              <Badge variant="outline" className="text-[10px] border-purple-300 text-purple-700 bg-purple-50/50">
                BIS: {current.regulatory.bisIsiMark}
              </Badge>
            )}
          </div>
        </div>
        {editable && !editing && (
          <Button variant="outline" size="sm" className="gap-1.5 shrink-0 h-8 text-xs" onClick={startEdit}>
            <Pencil className="h-3.5 w-3.5" />Edit Specs
          </Button>
        )}
        {editing && (
          <div className="flex gap-2 shrink-0">
            <Button size="sm" className="gap-1.5 h-8 text-xs" onClick={saveEdit}>
              <Save className="h-3.5 w-3.5" />Save
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs" onClick={cancelEdit}>
              <X className="h-3.5 w-3.5" />Cancel
            </Button>
          </div>
        )}
      </div>

      <Separator />

      {/* ── General ── */}
      <Section title="General Specifications" icon={FileText} defaultOpen={!compact}>
        {editing && draft ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(["make", "model", "countryOfOrigin", "hsnCode", "standardReference"] as const).map((field) => (
              <div key={field}>
                <Label className="text-xs">{field === "hsnCode" ? "HSN/SAC Code" : field.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase())}</Label>
                <Input value={draft.general?.[field] ?? ""} onChange={(e) => patchGeneral(field, e.target.value)} className="mt-1 h-8 text-sm" />
              </div>
            ))}
          </div>
        ) : (
          <SpecGrid fields={[
            { label: "Make / Recommended Brands", value: current.general?.make },
            { label: "Model / Benchmark Reference", value: current.general?.model },
            { label: "Country of Origin", value: current.general?.countryOfOrigin },
            { label: "HSN / SAC Code", value: current.general?.hsnCode },
            { label: "Standard Reference", value: current.general?.standardReference },
          ]} />
        )}
      </Section>

      {/* ── Technical Parameters ── */}
      <Section title="Technical Parameters" icon={Wrench} iconColor="text-violet-600" defaultOpen={!compact}>
        {editing && draft ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(["powerSupply", "powerConsumption", "dimensions", "weight", "operatingTemp", "humidity"] as const).map((field) => (
              <div key={field}>
                <Label className="text-xs">{field.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase())}</Label>
                <Input value={draft.technical?.[field] ?? ""} onChange={(e) => patchTechnical(field, e.target.value)} className="mt-1 h-8 text-sm" />
              </div>
            ))}
          </div>
        ) : (
          <SpecGrid fields={[
            { label: "Power Supply", value: current.technical?.powerSupply },
            { label: "Power Consumption", value: current.technical?.powerConsumption },
            { label: "Dimensions", value: current.technical?.dimensions },
            { label: "Weight", value: current.technical?.weight },
            { label: "Operating Temperature", value: current.technical?.operatingTemp },
            { label: "Humidity Range", value: current.technical?.humidity },
            ...Object.entries(current.technical?.additionalFields ?? {}).map(([k, v]) => ({ label: k, value: v })),
          ]} />
        )}
      </Section>

      {/* ── Performance ── */}
      <Section title="Performance Specifications" icon={BarChart3} iconColor="text-emerald-600" defaultOpen>
        {editing && draft ? (
          <div className="space-y-2">
            {Object.entries(draft.performance || {}).map(([key, value]) => (
              <div key={key} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-5">
                  <Input
                    value={key}
                    onChange={(e) => patchPerformanceKey(key, e.target.value)}
                    className="h-8 text-xs font-medium"
                    placeholder="Parameter name"
                  />
                </div>
                <div className="col-span-6">
                  <Input
                    value={value}
                    onChange={(e) => patchPerformanceValue(key, e.target.value)}
                    className="h-8 text-sm"
                    placeholder="Value"
                  />
                </div>
                <div className="col-span-1">
                  <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive" onClick={() => deletePerformanceRow(key)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" className="mt-1 gap-1.5 text-xs" onClick={addPerformanceRow}>
              <Plus className="h-3 w-3" />Add Parameter
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
            {Object.entries(current.performance || {}).map(([key, value]) => (
              <div key={key} className="py-1 border-b border-muted/50 last:border-0">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">{key}</p>
                <p className="text-sm text-foreground mt-0.5 leading-snug">{value}</p>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* ── Regulatory & Compliance ── */}
      <Section title="Regulatory & Quality Compliance" icon={ShieldCheck} iconColor="text-amber-600" defaultOpen={!compact}>
        {editing && draft ? (
          <div className="space-y-3">
            {/* Boolean fields */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(["ceMark", "aerbClearance", "pcpndtCompliance"] as const).map((field) => {
                const labels: Record<string, string> = {
                  ceMark: "CE Mark Certified",
                  aerbClearance: "AERB Clearance Required",
                  pcpndtCompliance: "PCPNDT Act Compliance",
                };
                return (
                  <div key={field} className="flex items-center gap-2">
                    <Checkbox
                      id={`reg-${field}`}
                      checked={!!draft.regulatory?.[field]}
                      onCheckedChange={(checked) => patchRegulatoryBool(field, !!checked)}
                    />
                    <Label htmlFor={`reg-${field}`} className="text-xs cursor-pointer">{labels[field]}</Label>
                  </div>
                );
              })}
            </div>
            {/* String fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(["bisIsiMark", "iecStandard", "iso"] as const).map((field) => {
                const labels: Record<string, string> = {
                  bisIsiMark: "BIS / ISI Mark",
                  iecStandard: "IEC Standard",
                  iso: "ISO Certification",
                };
                return (
                  <div key={field}>
                    <Label className="text-xs">{labels[field]}</Label>
                    <Input
                      value={(draft.regulatory?.[field] as string | undefined) ?? ""}
                      onChange={(e) => patchRegulatoryStr(field, e.target.value)}
                      className="mt-1 h-8 text-sm"
                      placeholder={`e.g. ${field === "iecStandard" ? "IEC 60601-1" : field === "iso" ? "ISO 13485" : "BIS IS 7620"}`}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <SpecGrid fields={[
            { label: "CE Mark Certification", value: current.regulatory?.ceMark },
            { label: "BIS / ISI Mark", value: current.regulatory?.bisIsiMark },
            { label: "IEC Standard", value: current.regulatory?.iecStandard },
            { label: "ISO Certification", value: current.regulatory?.iso },
            { label: "AERB Clearance Required", value: current.regulatory?.aerbClearance },
            { label: "PCPNDT Act Compliance", value: current.regulatory?.pcpndtCompliance },
          ]} />
        )}
      </Section>

      {/* ── Accessories & Consumables ── */}
      {!compact && (
        <Section title="Standard Accessories & Scope of Supply" icon={Package} iconColor="text-orange-600" defaultOpen={false}>
          {editing && draft ? (
            <div className="space-y-2">
              {(draft.accessories || []).map((acc, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <Input
                    value={acc}
                    onChange={(e) => patchAccessory(i, e.target.value)}
                    className="h-8 text-sm flex-1"
                    placeholder="Accessory description"
                  />
                  <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive shrink-0" onClick={() => deleteAccessory(i)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" className="mt-1 gap-1.5 text-xs" onClick={addAccessory}>
                <Plus className="h-3 w-3" />Add Accessory
              </Button>
            </div>
          ) : (
            (current.accessories || []).length === 0 ? (
              <p className="text-xs text-muted-foreground">Standard accessories included as per manufacturer package.</p>
            ) : (
              <ul className="space-y-1.5">
                {(current.accessories || []).map((acc, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
                    <span>{acc}</span>
                  </li>
                ))}
              </ul>
            )
          )}
        </Section>
      )}

      {/* ── Warranty & CMC ── */}
      <Section title="Warranty & Comprehensive AMC (CMC)" icon={Clock} iconColor="text-blue-600" defaultOpen={!compact}>
        {editing && draft ? (
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Warranty (Years)</Label>
              <Input type="number" value={draft.warranty?.years ?? 3} onChange={(e) => patchWarranty("years", e.target.value)} className="mt-1 h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs">CMC Start (Year)</Label>
              <Input type="number" value={draft.warranty?.cmcStartYear ?? 4} onChange={(e) => patchWarranty("cmcStartYear", e.target.value)} className="mt-1 h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs">CMC Rate (₹/yr)</Label>
              <Input type="number" value={draft.warranty?.cmcAnnualRate ?? 0} onChange={(e) => patchWarranty("cmcAnnualRate", e.target.value)} className="mt-1 h-8 text-sm" />
            </div>
          </div>
        ) : (
          <SpecGrid fields={[
            { label: "Warranty Period", value: current.warranty ? `${current.warranty.years} Years Comprehensive Warranty from commissioning` : "3 Years Comprehensive" },
            { label: "CMC Commences", value: current.warranty ? `Year ${current.warranty.cmcStartYear} onwards for 5–7 years` : "Year 4 onwards" },
            { label: "CMC Rate (Annual Reference)", value: current.warranty?.cmcAnnualRate ? `₹${current.warranty.cmcAnnualRate.toLocaleString("en-IN")} per year` : "As per tender terms" },
          ]} />
        )}
      </Section>

      {/* ── Documentation Required ── */}
      {!compact && (
        <Section title="Required Technical Documentation" icon={FileText} defaultOpen={false}>
          {editing && draft ? (
            <div className="space-y-2">
              {(draft.documentation || []).map((doc, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <Input
                    value={doc}
                    onChange={(e) => patchDoc(i, e.target.value)}
                    className="h-8 text-sm flex-1"
                    placeholder="Document name / description"
                  />
                  <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive shrink-0" onClick={() => deleteDoc(i)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" className="mt-1 gap-1.5 text-xs" onClick={addDoc}>
                <Plus className="h-3 w-3" />Add Document
              </Button>
            </div>
          ) : (
            (current.documentation || []).length === 0 ? (
              <p className="text-xs text-muted-foreground">Standard compliance documentation required.</p>
            ) : (
              <ul className="space-y-1.5">
                {(current.documentation || []).map((doc, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs">
                    <FileText className="h-3.5 w-3.5 text-blue-500 mt-0.5 shrink-0" />
                    <span>{doc}</span>
                  </li>
                ))}
              </ul>
            )
          )}
        </Section>
      )}
    </div>
  );
}
