import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { Search, Plus, IndianRupee, TrendingUp, AlertTriangle, CheckCircle2, Info } from "lucide-react";

interface BudgetHead {
  id: number;
  code: string;
  directorate: string;
  scheme: string;
  fy: string;
  allocated: number;
  committed: number;
  utilized: number;
  status: "active" | "exhausted" | "suspended";
}

const INITIAL_BUDGETS: BudgetHead[] = [
  { id: 1, code: "BH-2526-001", directorate: "DME", scheme: "CMRF Equipment Procurement", fy: "2025-26", allocated: 50000000, committed: 19040000, utilized: 13440000, status: "active" },
  { id: 2, code: "BH-2526-002", directorate: "TVVP", scheme: "Mission Bhagiratha Health Equipment", fy: "2025-26", allocated: 30000000, committed: 5000000, utilized: 2000000, status: "active" },
  { id: 3, code: "BH-2526-003", directorate: "CHFW", scheme: "PHC Upgradation", fy: "2025-26", allocated: 15000000, committed: 15000000, utilized: 14500000, status: "exhausted" },
  { id: 4, code: "BH-2526-004", directorate: "Specialty Hospitals", scheme: "AIIMS-Pattern Equipment", fy: "2025-26", allocated: 80000000, committed: 12000000, utilized: 8000000, status: "active" },
];

function fmt(n: number) {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)} L`;
  return `₹${n.toLocaleString("en-IN")}`;
}

export default function Budget() {
  const { can } = useAuth();
  const [budgets, setBudgets] = useState<BudgetHead[]>(INITIAL_BUDGETS);
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ directorate: "DME", scheme: "", fy: "2025-26", allocated: "" });

  const filtered = budgets.filter(b =>
    !search || b.code.toLowerCase().includes(search.toLowerCase()) ||
    b.directorate.toLowerCase().includes(search.toLowerCase()) ||
    b.scheme.toLowerCase().includes(search.toLowerCase())
  );

  const totals = budgets.reduce((a, b) => ({
    allocated: a.allocated + b.allocated,
    committed: a.committed + b.committed,
    utilized: a.utilized + b.utilized,
  }), { allocated: 0, committed: 0, utilized: 0 });

  const totalAvailable = totals.allocated - totals.committed;
  const totalUnspent = totals.allocated - totals.utilized;

  function handleAdd() {
    const alloc = parseFloat(form.allocated) || 0;
    const newItem: BudgetHead = {
      id: budgets.length + 1,
      code: `BH-2526-${String(budgets.length + 1).padStart(3, "0")}`,
      directorate: form.directorate,
      scheme: form.scheme,
      fy: form.fy,
      allocated: alloc,
      committed: 0,
      utilized: 0,
      status: "active",
    };
    setBudgets([...budgets, newItem]);
    setAddOpen(false);
    setForm({ directorate: "DME", scheme: "", fy: "2025-26", allocated: "" });
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Budget Register</h1>
          <p className="text-sm text-muted-foreground mt-0.5">FY-wise allocation, commitments and utilization tracking</p>
        </div>
        {can("budget.manage") && (
          <Button size="sm" className="gap-2" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" />Add Budget Head
          </Button>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
        <Info className="h-4 w-4 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <span className="font-semibold">Budget Definitions: </span>
          <span><strong>Committed</strong> = Sanctioned in POs / Tenders (encumbrance). </span>
          <span><strong>Utilized</strong> = Actual payments made. </span>
          <span><strong>Available</strong> = Allocated − Committed (uncommitted balance). </span>
          <span><strong>Unspent</strong> = Allocated − Utilized (cash not yet released).</span>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <KpiCard label="Total Allocated" value={fmt(totals.allocated)} icon={IndianRupee} color="text-primary" />
        <KpiCard label="Committed (POs)" value={fmt(totals.committed)} icon={TrendingUp} color="text-amber-600" accent="amber" />
        <KpiCard label="Utilized (Paid)" value={fmt(totals.utilized)} icon={CheckCircle2} color="text-emerald-600" accent="emerald" />
        <KpiCard label="Available Balance" value={fmt(totalAvailable)} icon={IndianRupee} color="text-blue-600" accent="blue" />
        <KpiCard label="Unspent (Cash)" value={fmt(totalUnspent)} icon={IndianRupee} color="text-violet-600" accent="violet" />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by code, directorate, scheme..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  {["Code", "Directorate", "Scheme", "FY", "Allocated", "Committed", "Utilized", "Available\n(Alloc−Committed)", "Unspent\n(Alloc−Utilized)", "Status"].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-muted-foreground px-3 py-3 whitespace-pre-line leading-tight">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(b => {
                  const available = b.allocated - b.committed;
                  const unspent = b.allocated - b.utilized;
                  const commitPct = Math.min(Math.round((b.committed / b.allocated) * 100), 100);
                  const utilPct = Math.min(Math.round((b.utilized / b.allocated) * 100), 100);
                  return (
                    <tr key={b.id} className="border-b hover:bg-muted/20 transition-colors">
                      <td className="px-3 py-3 font-mono text-xs font-semibold text-primary">{b.code}</td>
                      <td className="px-3 py-3 font-medium text-xs">{b.directorate}</td>
                      <td className="px-3 py-3 text-muted-foreground text-xs max-w-[160px] truncate" title={b.scheme}>{b.scheme}</td>
                      <td className="px-3 py-3 text-xs">{b.fy}</td>
                      <td className="px-3 py-3 font-semibold text-xs">{fmt(b.allocated)}</td>
                      <td className="px-3 py-3">
                        <div className="space-y-1">
                          <span className="text-amber-700 font-medium text-xs">{fmt(b.committed)}</span>
                          <Progress value={commitPct} className="h-1.5 w-16" />
                          <span className="text-[10px] text-muted-foreground">{commitPct}%</span>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="space-y-1">
                          <span className="text-emerald-700 font-medium text-xs">{fmt(b.utilized)}</span>
                          <Progress value={utilPct} className="h-1.5 w-16" />
                          <span className="text-[10px] text-muted-foreground">{utilPct}%</span>
                        </div>
                      </td>
                      <td className={`px-3 py-3 font-semibold text-xs ${available < 0 ? "text-red-600" : available === 0 ? "text-amber-600" : "text-blue-700"}`}>
                        {fmt(available)}
                        {available < 0 && <span className="block text-[10px] font-normal text-red-500">Overcommitted</span>}
                        {available === 0 && <span className="block text-[10px] font-normal text-amber-500">Fully committed</span>}
                      </td>
                      <td className={`px-3 py-3 font-semibold text-xs ${unspent < 0 ? "text-red-600" : "text-violet-700"}`}>
                        {fmt(unspent)}
                      </td>
                      <td className="px-3 py-3">
                        <StatusChip status={b.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {/* Totals footer */}
              <tfoot>
                <tr className="border-t-2 bg-muted/30">
                  <td colSpan={4} className="px-3 py-3 text-xs font-bold text-foreground">TOTAL ({filtered.length} heads)</td>
                  <td className="px-3 py-3 text-xs font-bold">{fmt(filtered.reduce((a, b) => a + b.allocated, 0))}</td>
                  <td className="px-3 py-3 text-xs font-bold text-amber-700">{fmt(filtered.reduce((a, b) => a + b.committed, 0))}</td>
                  <td className="px-3 py-3 text-xs font-bold text-emerald-700">{fmt(filtered.reduce((a, b) => a + b.utilized, 0))}</td>
                  <td className="px-3 py-3 text-xs font-bold text-blue-700">
                    {fmt(filtered.reduce((a, b) => a + (b.allocated - b.committed), 0))}
                  </td>
                  <td className="px-3 py-3 text-xs font-bold text-violet-700">
                    {fmt(filtered.reduce((a, b) => a + (b.allocated - b.utilized), 0))}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
            {filtered.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">No budget heads found</div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Budget Commitment Log */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Commitment Register
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                {["PO / Tender Ref", "Budget Head", "Equipment", "Committed Amount", "Utilized (Paid)", "Balance (Comm−Util)", "Date", "Type"].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { ref: "441A/591/HPC/EQU/2025-26", bh: "BH-2526-003", eq: "Surgical Diathermy / Cautery Machine", committed: 582750, utilized: 524475, date: "16 Mar 2026", type: "PO Commitment (Partial Paid)" },
                { ref: "216/418/HPC/EQU/Vemulawada/2022-23", bh: "BH-2223-002", eq: "Mammogram Compatible CR System", committed: 682500, utilized: 682500, date: "02 Nov 2022", type: "PO Commitment (Paid)" },
                { ref: "IND/HPC/EQU/WDH/PO/2026/003", bh: "BH-2526-001", eq: "Fully Automated Biochemistry Analyser", committed: 1344000, utilized: 0, date: "28 Apr 2026", type: "PO Commitment" },
                { ref: "1A.67/HPC/EQU/2025-26", bh: "BH-2526-004", eq: "DEXA Scanner", committed: 4500000, utilized: 0, date: "03 Jan 2026", type: "Tender Estimate" },
              ].map((row, i) => (
                <tr key={i} className="border-b hover:bg-muted/20">
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-primary">{row.ref}</td>
                  <td className="px-4 py-3 text-xs">{row.bh}</td>
                  <td className="px-4 py-3 text-xs">{row.eq}</td>
                  <td className="px-4 py-3 font-semibold text-xs text-amber-700">{fmt(row.committed)}</td>
                  <td className="px-4 py-3 font-semibold text-xs text-emerald-700">{fmt(row.utilized)}</td>
                  <td className="px-4 py-3 font-semibold text-xs text-blue-700">{fmt(row.committed - row.utilized)}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{row.date}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="text-xs">{row.type}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 bg-muted/30">
                <td colSpan={3} className="px-4 py-3 text-xs font-bold">Total Commitments</td>
                <td className="px-4 py-3 text-xs font-bold text-amber-700">{fmt(19040000 + 13440000 + 5000000)}</td>
                <td className="px-4 py-3 text-xs font-bold text-emerald-700">{fmt(13440000)}</td>
                <td className="px-4 py-3 text-xs font-bold text-blue-700">{fmt(19040000 + 5000000)}</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </CardContent>
      </Card>

      {/* Add Budget Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Budget Head</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Directorate</Label>
                <Select value={form.directorate} onValueChange={v => setForm({ ...form, directorate: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["DME", "TVVP", "CHFW", "Specialty Hospitals", "HPC"].map(d => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Financial Year</Label>
                <Select value={form.fy} onValueChange={v => setForm({ ...form, fy: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2025-26">2025-26</SelectItem>
                    <SelectItem value="2026-27">2026-27</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Scheme / Budget Head Name *</Label>
              <Input value={form.scheme} onChange={e => setForm({ ...form, scheme: e.target.value })} placeholder="e.g. CMRF Equipment Procurement" />
            </div>
            <div className="space-y-1.5">
              <Label>Allocated Amount (₹) *</Label>
              <Input type="number" value={form.allocated} onChange={e => setForm({ ...form, allocated: e.target.value })} placeholder="e.g. 50000000" />
              {form.allocated && <p className="text-xs text-muted-foreground">{fmt(parseFloat(form.allocated) || 0)}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={!form.scheme || !form.allocated}>Add Budget Head</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function KpiCard({ label, value, icon: Icon, color, accent }: { label: string; value: string; icon: React.ElementType; color: string; accent?: string }) {
  const accentClasses: Record<string, string> = {
    amber: "border-amber-200 bg-amber-50/40",
    emerald: "border-emerald-200 bg-emerald-50/40",
    blue: "border-blue-200 bg-blue-50/40",
    violet: "border-violet-200 bg-violet-50/40",
  };
  return (
    <Card className={accent ? accentClasses[accent] ?? "" : ""}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-muted"><Icon className={`h-4 w-4 ${color}`} /></div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide leading-tight">{label}</p>
            <p className={`text-base font-bold ${color}`}>{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusChip({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: "bg-emerald-100 text-emerald-700 border-emerald-200",
    exhausted: "bg-red-100 text-red-700 border-red-200",
    suspended: "bg-gray-100 text-gray-600 border-gray-200",
  };
  return <Badge variant="outline" className={`text-xs ${map[status] ?? ""}`}>{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>;
}
