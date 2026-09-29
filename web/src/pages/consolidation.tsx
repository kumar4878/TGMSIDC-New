import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Layers, CheckCircle2, AlertTriangle, Merge, Info, Search } from "lucide-react";

interface IndentRow {
  id: number;
  indentNumber: string;
  facility: string;
  equipment: string;
  qty: number;
  criticality: "Critical" | "Essential" | "Routine";
  age: number;
  selected: boolean;
}

const INIT_INDENTS: IndentRow[] = [
  { id: 1, indentNumber: "IND-2025-0002", facility: "Gandhi Hospital", equipment: "ICU Ventilator", qty: 5, criticality: "Critical", age: 27, selected: false },
  { id: 2, indentNumber: "IND-2025-0005", facility: "Gandhi Hospital", equipment: "Digital X-Ray Machine", qty: 1, criticality: "Essential", age: 23, selected: false },
  { id: 3, indentNumber: "IND-2025-0006", facility: "Nizamabad District Hospital", equipment: "ICU Ventilator", qty: 4, criticality: "Critical", age: 15, selected: false },
  { id: 4, indentNumber: "IND-2025-0007", facility: "Osmania General Hospital", equipment: "Ultrasound Machine (B-Mode)", qty: 3, criticality: "Essential", age: 53, selected: false },
  { id: 5, indentNumber: "IND-2025-0008", facility: "Warangal District Hospital", equipment: "Ultrasound Machine (B-Mode)", qty: 2, criticality: "Routine", age: 22, selected: false },
  { id: 6, indentNumber: "IND-2025-0009", facility: "Karimnagar District Hospital", equipment: "ICU Ventilator", qty: 6, criticality: "Critical", age: 10, selected: false },
];

interface ConsolidatedGroup {
  id: number;
  groupRef: string;
  equipment: string;
  totalQty: number;
  indents: string[];
  facilities: string[];
  createdAt: string;
  status: "draft" | "approved" | "po_issued";
}

const INIT_CONSOLIDATED: ConsolidatedGroup[] = [
  { id: 1, groupRef: "CONS-2025-0001", equipment: "Digital X-Ray Machine", totalQty: 2, indents: ["IND-2025-0001"], facilities: ["Osmania General Hospital"], createdAt: "2026-04-01T09:00:00Z", status: "po_issued" },
];

const CRIT_STYLE: Record<string, string> = {
  Critical: "bg-red-100 text-red-700 border-red-200",
  Essential: "bg-amber-100 text-amber-700 border-amber-200",
  Routine: "bg-gray-100 text-gray-600 border-gray-200",
};

const CONS_STATUS_STYLE: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600 border-gray-200",
  approved: "bg-blue-100 text-blue-700 border-blue-200",
  po_issued: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

export default function Consolidation() {
  const [indents, setIndents] = useState<IndentRow[]>(INIT_INDENTS);
  const [consolidated, setConsolidated] = useState<ConsolidatedGroup[]>(INIT_CONSOLIDATED);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selected = indents.filter(i => i.selected);
  const canConsolidate = selected.length >= 2 && new Set(selected.map(i => i.equipment)).size === 1;

  function toggle(id: number) {
    setIndents(prev => prev.map(i => i.id === id ? { ...i, selected: !i.selected } : i));
  }

  function selectAll() {
    setIndents(prev => prev.map(i => ({ ...i, selected: true })));
  }

  function clearAll() {
    setIndents(prev => prev.map(i => ({ ...i, selected: false })));
  }

  function handleConsolidate() {
    if (!canConsolidate) return;
    const eq = selected[0].equipment;
    const group: ConsolidatedGroup = {
      id: consolidated.length + 1,
      groupRef: `CONS-2025-${String(consolidated.length + 1).padStart(4, "0")}`,
      equipment: eq,
      totalQty: selected.reduce((a, i) => a + i.qty, 0),
      indents: selected.map(i => i.indentNumber),
      facilities: [...new Set(selected.map(i => i.facility))],
      createdAt: new Date().toISOString(),
      status: "draft",
    };
    setConsolidated([group, ...consolidated]);
    // Remove consolidated indents from pending list
    const selectedIds = new Set(selected.map(i => i.id));
    setIndents(prev => prev.filter(i => !selectedIds.has(i.id)));
    setPreviewOpen(false);
  }

  // Sort: Critical first, then by age descending
  const sorted = [...indents]
    .filter(i => !search || i.indentNumber.toLowerCase().includes(search.toLowerCase()) || i.equipment.toLowerCase().includes(search.toLowerCase()) || i.facility.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const prio: Record<string, number> = { Critical: 0, Essential: 1, Routine: 2 };
      if (prio[a.criticality] !== prio[b.criticality]) return prio[a.criticality] - prio[b.criticality];
      return b.age - a.age;
    });

  // Group by equipment for visual hint
  const equipmentGroups = Object.entries(
    indents.reduce((acc, i) => { acc[i.equipment] = (acc[i.equipment] ?? 0) + 1; return acc; }, {} as Record<string, number>)
  ).filter(([, count]) => count >= 2);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Demand Consolidation</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Aggregate same-equipment indents across facilities for bulk procurement savings</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Layers className="h-5 w-5 text-primary" />
            <div><p className="text-2xl font-bold">{indents.length}</p><p className="text-xs text-muted-foreground">Pending Indents</p></div>
          </CardContent>
        </Card>
        <Card className="border-emerald-200 bg-emerald-50/40">
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <div><p className="text-2xl font-bold text-emerald-700">{consolidated.length}</p><p className="text-xs text-muted-foreground">Consolidated Groups</p></div>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50/40">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <div><p className="text-2xl font-bold text-red-700">{indents.filter(i => i.criticality === "Critical").length}</p><p className="text-xs text-muted-foreground">Critical Priority</p></div>
          </CardContent>
        </Card>
      </div>

      {/* Consolidation opportunity hints */}
      {equipmentGroups.length > 0 && (
        <div className="flex items-start gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-800">
          <Info className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600" />
          <div>
            <span className="font-semibold">Consolidation opportunities: </span>
            {equipmentGroups.map(([eq, count]) => `${eq} (${count} indents)`).join(" · ")}
            <span className="text-emerald-700"> — Select same-equipment rows to consolidate.</span>
          </div>
        </div>
      )}

      {/* Action bar */}
      {selected.length > 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">{selected.length} indent{selected.length > 1 ? "s" : ""} selected — Total qty: {selected.reduce((a, i) => a + i.qty, 0)}</p>
              {!canConsolidate && selected.length >= 2 && (
                <p className="text-xs text-amber-600 mt-0.5">Selected indents must be for the same equipment to consolidate</p>
              )}
              {canConsolidate && (
                <p className="text-xs text-emerald-700 mt-0.5">Ready to consolidate — {selected[0].equipment}</p>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={clearAll}>Clear All</Button>
              <Button size="sm" className="gap-1.5" disabled={!canConsolidate} onClick={() => setPreviewOpen(true)}>
                <Merge className="h-4 w-4" />Consolidate Selected
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-base">Pending Indents — Priority Queue</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input placeholder="Filter..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 w-44 text-sm" />
              </div>
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={selectAll}>Select All</Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Click any row to select / deselect for consolidation</p>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-4 py-3 w-8 text-center text-xs text-muted-foreground">#</th>
                {["Indent No.", "Equipment", "Facility", "Qty", "Criticality", "Age (days)"].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">All indents have been consolidated</td></tr>
              )}
              {sorted.map((i, idx) => (
                <tr
                  key={i.id}
                  className={`border-b cursor-pointer select-none transition-colors ${i.selected ? "bg-primary/8 border-primary/20 hover:bg-primary/12" : "hover:bg-muted/30"}`}
                  onClick={() => toggle(i.id)}
                >
                  <td className="px-4 py-3 text-center">
                    <div className={`h-5 w-5 rounded border-2 mx-auto flex items-center justify-center transition-colors ${i.selected ? "bg-primary border-primary" : "border-muted-foreground/30 bg-background"}`}>
                      {i.selected && <CheckCircle2 className="h-3 w-3 text-white" />}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-primary">{i.indentNumber}</td>
                  <td className="px-4 py-3 font-medium">{i.equipment}</td>
                  <td className="px-4 py-3 text-muted-foreground text-sm">{i.facility}</td>
                  <td className="px-4 py-3 font-semibold">{i.qty}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={`text-xs border ${CRIT_STYLE[i.criticality]}`}>{i.criticality}</Badge>
                  </td>
                  <td className={`px-4 py-3 font-semibold text-sm ${i.age > 45 ? "text-red-600" : i.age > 30 ? "text-amber-600" : "text-foreground"}`}>
                    {i.age}d {i.age > 45 && "⚠"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Consolidated Groups */}
      {consolidated.length > 0 && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Consolidated Demand Groups</CardTitle></CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  {["Group Ref", "Equipment", "Total Qty", "Source Indents", "Facilities", "Status", "Date"].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {consolidated.map(g => (
                  <tr key={g.id} className="border-b hover:bg-muted/20">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-primary">{g.groupRef}</td>
                    <td className="px-4 py-3 font-medium">{g.equipment}</td>
                    <td className="px-4 py-3 font-bold text-primary text-lg">{g.totalQty}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 flex-wrap">
                        {g.indents.map(n => <Badge key={n} variant="outline" className="text-xs">{n}</Badge>)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs max-w-[160px]">{g.facilities.join(", ")}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={`text-xs border ${CONS_STATUS_STYLE[g.status]}`}>{g.status.replace("_", " ")}</Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(g.createdAt).toLocaleDateString("en-IN")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Preview & Confirm Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Consolidation Preview</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
              <p className="text-sm font-semibold text-emerald-800 mb-3">Consolidated Demand Sheet</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between border-b border-emerald-100 pb-1.5">
                  <span className="text-muted-foreground">Equipment</span>
                  <span className="font-semibold">{selected[0]?.equipment}</span>
                </div>
                <div className="flex justify-between border-b border-emerald-100 pb-1.5">
                  <span className="text-muted-foreground">Total Consolidated Qty</span>
                  <span className="font-bold text-emerald-700 text-lg">{selected.reduce((a, i) => a + i.qty, 0)}</span>
                </div>
                <div className="flex justify-between border-b border-emerald-100 pb-1.5">
                  <span className="text-muted-foreground">Source Indents</span>
                  <span className="font-semibold">{selected.length} indents</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Facilities</span>
                  <span className="font-semibold">{[...new Set(selected.map(i => i.facility))].length} facilities</span>
                </div>
              </div>
            </div>
            <div className="space-y-1">
              {selected.map(i => (
                <div key={i.id} className="flex items-center justify-between text-sm py-2 px-3 rounded-lg bg-muted/30 border border-muted">
                  <span className="font-mono text-xs text-primary font-semibold">{i.indentNumber}</span>
                  <span className="text-muted-foreground text-xs truncate mx-2">{i.facility}</span>
                  <Badge variant="outline" className={`text-xs border shrink-0 ${CRIT_STYLE[i.criticality]}`}>{i.criticality}</Badge>
                  <span className="font-semibold ml-2">Qty: {i.qty}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Consolidated indents will be removed from the pending queue and a new demand group will be created for bulk procurement.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>Cancel</Button>
            <Button onClick={handleConsolidate} className="gap-1.5 bg-primary">
              <Merge className="h-4 w-4" />Confirm Consolidation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
