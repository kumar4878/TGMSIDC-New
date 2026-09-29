import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { Settings, Users, IndianRupee, Edit, CheckCircle2, AlertTriangle, ShieldCheck, Plus, Trash2 } from "lucide-react";

interface ApprovalLevel {
  id: number;
  level: number;
  role: string;
  roleLabel: string;
  minAmount: number;
  maxAmount: number | null;
  required: boolean;
  slaHours: number;
  escalationHours: number;
}

interface ApprovalWorkflow {
  id: string;
  name: string;
  description: string;
  entityType: "indent" | "purchase_order" | "tender" | "invoice" | "payment";
  levels: ApprovalLevel[];
}

const INIT_WORKFLOWS: ApprovalWorkflow[] = [
  {
    id: "indent_approval",
    name: "Indent Approval Workflow",
    description: "End-to-end statutory approval chain for procurement indents raised by HoD/institutions per V9 Process Book",
    entityType: "indent",
    levels: [
      { id: 1, level: 1, role: "deo", roleLabel: "DEO (Initiator)", minAmount: 0, maxAmount: null, required: true, slaHours: 24, escalationHours: 48 },
      { id: 2, level: 2, role: "tgmsidc_user", roleLabel: "TGMSIDC User (Verification)", minAmount: 0, maxAmount: null, required: true, slaHours: 48, escalationHours: 72 },
      { id: 3, level: 3, role: "gm_equipment", roleLabel: "GM Equipment (Technical Review)", minAmount: 0, maxAmount: null, required: true, slaHours: 72, escalationHours: 96 },
      { id: 4, level: 4, role: "so_equipment", roleLabel: "SO Equipment (Administrative Sanction)", minAmount: 0, maxAmount: null, required: true, slaHours: 48, escalationHours: 72 },
      { id: 5, level: 5, role: "executive_director", roleLabel: "Executive Director (High Value ≥ ₹5L)", minAmount: 500000, maxAmount: null, required: true, slaHours: 48, escalationHours: 96 },
    ],
  },
  {
    id: "po_approval",
    name: "Purchase Order Approval",
    description: "Sanction and release hierarchy for rate contract purchase orders",
    entityType: "purchase_order",
    levels: [
      { id: 6, level: 1, role: "tgmsidc_user", roleLabel: "TGMSIDC User (Drafting & Validation)", minAmount: 0, maxAmount: null, required: true, slaHours: 24, escalationHours: 48 },
      { id: 7, level: 2, role: "so_equipment", roleLabel: "SO Equipment (Sanction Order)", minAmount: 0, maxAmount: 2500000, required: true, slaHours: 48, escalationHours: 72 },
      { id: 8, level: 3, role: "executive_director", roleLabel: "Executive Director (> ₹25L Sanctions)", minAmount: 2500000, maxAmount: null, required: true, slaHours: 72, escalationHours: 120 },
    ],
  },
  {
    id: "tender_approval",
    name: "Tender / BFC Committee Review",
    description: "Technical committee evaluation and Board of Finance Committee (BFC) approvals",
    entityType: "tender",
    levels: [
      { id: 9, level: 1, role: "gm_equipment", roleLabel: "GM Equipment (Tech Committee Convener)", minAmount: 0, maxAmount: null, required: true, slaHours: 72, escalationHours: 120 },
      { id: 10, level: 2, role: "executive_director", roleLabel: "Executive Director / BFC Chair", minAmount: 0, maxAmount: null, required: true, slaHours: 72, escalationHours: 144 },
    ],
  },
  {
    id: "payment_approval",
    name: "QA Acceptance & Payment Release",
    description: "Inspection committee verification and invoice clearance",
    entityType: "payment",
    levels: [
      { id: 11, level: 1, role: "consignee", roleLabel: "Consignee / Facility Store Officer (Receipt)", minAmount: 0, maxAmount: null, required: true, slaHours: 48, escalationHours: 72 },
      { id: 12, level: 2, role: "tgmsidc_user", roleLabel: "Biomedical Engineer (QA Committee Chair)", minAmount: 0, maxAmount: null, required: true, slaHours: 72, escalationHours: 96 },
      { id: 13, level: 3, role: "so_equipment", roleLabel: "SO Equipment (Final Acceptance Certificate)", minAmount: 0, maxAmount: null, required: true, slaHours: 48, escalationHours: 96 },
    ],
  },
];

const ROLE_OPTIONS = [
  { value: "deo", label: "Data Entry Operator (DEO)" },
  { value: "tgmsidc_user", label: "TGMSIDC User / Biomedical Engineer" },
  { value: "gm_equipment", label: "GM Equipment" },
  { value: "so_equipment", label: "SO Equipment" },
  { value: "executive_director", label: "Executive Director" },
  { value: "admin", label: "System Administrator" },
  { value: "consignee", label: "Consignee / Store Keeper" },
];

const ENTITY_BADGE: Record<string, string> = {
  indent: "bg-blue-100 text-blue-700 border-blue-200",
  purchase_order: "bg-emerald-100 text-emerald-700 border-emerald-200",
  tender: "bg-violet-100 text-violet-700 border-violet-200",
  invoice: "bg-amber-100 text-amber-700 border-amber-200",
  payment: "bg-red-100 text-red-700 border-red-200",
};

function fmt(n: number) { return n >= 100000 ? `₹${(n / 100000).toFixed(n % 100000 === 0 ? 0 : 1)}L` : `₹${n.toLocaleString("en-IN")}`; }

export default function ApprovalHierarchy() {
  const { user } = useAuth();
  const [workflows, setWorkflows] = useState<ApprovalWorkflow[]>(INIT_WORKFLOWS);
  const [editingWorkflow, setEditingWorkflow] = useState<ApprovalWorkflow | null>(null);
  const [editLevel, setEditLevel] = useState<ApprovalLevel | null>(null);
  const [saved, setSaved] = useState(false);

  const canEdit = user?.role === "gm_equipment" || user?.role === "so_equipment" || user?.role === "executive_director" || user?.role === "admin";

  function handleSaveLevel() {
    if (!editLevel || !editingWorkflow) return;
    setEditingWorkflow(wf => {
      if (!wf) return wf;
      const levels = editLevel.id < 0
        ? [...wf.levels, { ...editLevel, id: Date.now() }]
        : wf.levels.map(l => l.id === editLevel.id ? editLevel : l);
      return { ...wf, levels };
    });
    setEditLevel(null);
  }

  function handleDeleteLevel(levelId: number) {
    if (!editingWorkflow) return;
    setEditingWorkflow(wf => {
      if (!wf) return wf;
      return { ...wf, levels: wf.levels.filter(l => l.id !== levelId) };
    });
  }

  function handleSaveWorkflow() {
    if (!editingWorkflow) return;
    setWorkflows(prev => prev.map(w => w.id === editingWorkflow.id ? editingWorkflow : w));
    setEditingWorkflow(null);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="h-6 w-6 text-primary" />
            Approval Hierarchy &amp; Delegation of Powers
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Configure multi-tier statutory approval paths, financial delegation thresholds, and SLA escalation rules
          </p>
        </div>
        {saved && (
          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 gap-1.5 py-1 px-3">
            <CheckCircle2 className="h-3.5 w-3.5" /> Changes Saved
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6">
        {workflows.map(wf => (
          <Card key={wf.id} className="border-border">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <div className="flex items-center gap-2.5">
                  <CardTitle className="text-base">{wf.name}</CardTitle>
                  <Badge variant="outline" className={ENTITY_BADGE[wf.entityType]}>
                    {wf.entityType.replace("_", " ").toUpperCase()}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{wf.description}</p>
              </div>
              {canEdit && (
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setEditingWorkflow({ ...wf, levels: [...wf.levels] })}>
                  <Edit className="h-3.5 w-3.5" /> Configure Levels
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                {wf.levels.map((lvl, idx) => (
                  <div key={lvl.id} className="flex items-center gap-2 shrink-0">
                    <div className="border rounded-lg p-3 bg-muted/20 min-w-48 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-muted-foreground">Step {lvl.level}</span>
                        {lvl.required ? (
                          <Badge variant="outline" className="text-[10px] bg-red-50 text-red-700 border-red-200">Mandatory</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] bg-gray-50 text-gray-600">Conditional</Badge>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-foreground leading-tight">{lvl.roleLabel}</p>
                      <div className="text-xs text-muted-foreground space-y-0.5">
                        <div className="flex items-center gap-1">
                          <IndianRupee className="h-3 w-3 shrink-0" />
                          <span>{lvl.minAmount === 0 && !lvl.maxAmount ? "All amounts" : `${fmt(lvl.minAmount)}${lvl.maxAmount ? ` – ${fmt(lvl.maxAmount)}` : "+"}`}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <ShieldCheck className="h-3 w-3 shrink-0" />
                          <span>SLA: {lvl.slaHours}h · Escalation: {lvl.escalationHours}h</span>
                        </div>
                      </div>
                    </div>
                    {idx < wf.levels.length - 1 && (
                      <div className="h-0.5 w-6 bg-border shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Workflow Dialog */}
      {editingWorkflow && (
        <Dialog open={true} onOpenChange={() => setEditingWorkflow(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Configure Approval Chain — {editingWorkflow.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="flex justify-between items-center">
                <p className="text-xs text-muted-foreground">Define the sequence of authorities required to approve this transaction.</p>
                <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => setEditLevel({
                  id: -1,
                  level: editingWorkflow.levels.length + 1,
                  role: "tgmsidc_user",
                  roleLabel: "TGMSIDC User",
                  minAmount: 0,
                  maxAmount: null,
                  required: true,
                  slaHours: 48,
                  escalationHours: 72,
                })}>
                  <Plus className="h-3 w-3" /> Add Step
                </Button>
              </div>

              <div className="space-y-2">
                {editingWorkflow.levels.map((lvl) => (
                  <div key={lvl.id} className="flex items-center justify-between p-3 border rounded-lg bg-card">
                    <div className="flex items-center gap-3">
                      <span className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                        {lvl.level}
                      </span>
                      <div>
                        <p className="text-sm font-semibold">{lvl.roleLabel}</p>
                        <p className="text-xs text-muted-foreground">
                          {lvl.minAmount === 0 && !lvl.maxAmount ? "All amounts" : `${fmt(lvl.minAmount)}${lvl.maxAmount ? ` – ${fmt(lvl.maxAmount)}` : "+"}`}
                          {" · "}SLA {lvl.slaHours}h
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Button size="sm" variant="ghost" onClick={() => setEditLevel({ ...lvl })}>
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700" onClick={() => handleDeleteLevel(lvl.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingWorkflow(null)}>Cancel</Button>
              <Button onClick={handleSaveWorkflow}>Save Workflow Chain</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Level Dialog */}
      {editLevel && (
        <Dialog open={true} onOpenChange={() => setEditLevel(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editLevel.id < 0 ? "Add Step" : `Edit Step ${editLevel.level}`}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Select value={editLevel.role} onValueChange={v => {
                  const opt = ROLE_OPTIONS.find(r => r.value === v);
                  setEditLevel({ ...editLevel, role: v, roleLabel: opt?.label ?? v });
                }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map(r => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Min Amount (₹)</Label>
                  <Input type="number" value={editLevel.minAmount} onChange={e => setEditLevel({ ...editLevel, minAmount: Number(e.target.value) || 0 })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Max Amount (₹, blank = no cap)</Label>
                  <Input type="number" value={editLevel.maxAmount ?? ""} onChange={e => setEditLevel({ ...editLevel, maxAmount: e.target.value ? Number(e.target.value) : null })} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>SLA Target (Hours)</Label>
                  <Input type="number" value={editLevel.slaHours} onChange={e => setEditLevel({ ...editLevel, slaHours: Number(e.target.value) || 24 })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Auto-Escalate (Hours)</Label>
                  <Input type="number" value={editLevel.escalationHours} onChange={e => setEditLevel({ ...editLevel, escalationHours: Number(e.target.value) || 48 })} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditLevel(null)}>Cancel</Button>
              <Button onClick={handleSaveLevel}>Apply</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
