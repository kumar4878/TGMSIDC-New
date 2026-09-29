import { useState } from "react";
import { useListInstitutions, getListInstitutionsQueryKey, useCreateInstitution } from "@/lib/api-hooks";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Search, Building2 } from "lucide-react";

const TYPES = [
  { value: "Specialty Hospital", label: "Specialty Hospital" },
  { value: "GGH", label: "GGH (Government General Hospital)" },
  { value: "GMC", label: "GMC (Government Medical College)" },
  { value: "Hospital", label: "Hospital" },
  { value: "Teaching Hospital", label: "Teaching Hospital" },
  { value: "District Hospital", label: "District Hospital" },
  { value: "Area Hospital", label: "Area Hospital" },
  { value: "medical_college", label: "Medical College" },
  { value: "phc", label: "Primary Health Centre (PHC)" },
  { value: "chc", label: "Community Health Centre (CHC)" },
];

const DISTRICTS = [
  "Hyderabad", "Rangareddy", "Medchal", "Sangareddy", "Nalgonda", "Warangal",
  "Karimnagar", "Nizamabad", "Khammam", "Mahabubnagar", "Adilabad", "Suryapet",
  "Narayanpet", "Nagarkurnool", "Vikarabad", "Hanumakonda", "Siddipet", "Medak"
];

export default function Institutions() {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "dme">("all");
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ name: "", type: "Hospital", district: "", address: "", superintendentName: "", contactEmail: "" });
  const queryClient = useQueryClient();
  const { data: institutions, isLoading } = useListInstitutions({ query: { queryKey: getListInstitutionsQueryKey() } });
  const createInstitution = useCreateInstitution();
  const f = (k: keyof typeof form, v: string) => setForm({ ...form, [k]: v });

  const dmeCount = (institutions ?? []).filter(i =>
    Boolean(i.dmeInstitutionId || i.institutionCode?.startsWith("DME-") || i.hodName?.toLowerCase().includes("medical education"))
  ).length;

  const filtered = (institutions ?? []).filter((i) => {
    const isDme = Boolean(i.dmeInstitutionId || i.institutionCode?.startsWith("DME-") || i.hodName?.toLowerCase().includes("medical education"));
    if (filterType === "dme" && !isDme) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      i.name?.toLowerCase().includes(q) ||
      i.district?.toLowerCase().includes(q) ||
      i.institutionCode?.toLowerCase().includes(q) ||
      (i.dmeInstitutionId && i.dmeInstitutionId.toLowerCase().includes(q)) ||
      (i.facilityType && i.facilityType.toLowerCase().includes(q))
    );
  });

  function typeLabel(t: string) { return TYPES.find((x) => x.value === t)?.label ?? t; }

  function handleCreate() {
    createInstitution.mutate({ data: form }, {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListInstitutionsQueryKey() }); setAddOpen(false); setForm({ name: "", type: "Hospital", district: "", address: "", superintendentName: "", contactEmail: "" }); }
    });
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Hospital Master</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Official registry of DME hospitals, medical colleges, and healthcare facilities</p>
        </div>
        <Button size="sm" className="gap-2" onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" />Add Hospital</Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={filterType === "all" ? "default" : "outline"}
            onClick={() => setFilterType("all")}
            className="text-xs h-8"
          >
            All Hospitals ({institutions?.length ?? 0})
          </Button>
          <Button
            size="sm"
            variant={filterType === "dme" ? "default" : "outline"}
            onClick={() => setFilterType("dme")}
            className="text-xs h-8 gap-1.5"
          >
            <span className="h-2 w-2 rounded-full bg-blue-500 inline-block" />
            DME Master ({dmeCount})
          </Button>
        </div>
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name, DME ID, code, or district..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-8 text-sm" />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12"><div className="animate-spin h-6 w-6 rounded-full border-4 border-primary border-t-transparent" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">ID / Code</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Institution Name</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">District</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Superintendent / Principal</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Contact</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">No institutions match the filter criteria</td></tr>
                  ) : filtered.map((i) => {
                    const isDme = Boolean(i.dmeInstitutionId || i.institutionCode?.startsWith("DME-") || i.hodName?.toLowerCase().includes("medical education"));
                    return (
                      <tr key={i.id} className="border-b hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs">
                          <span className="font-bold text-primary">{i.dmeInstitutionId ?? i.institutionCode}</span>
                          {isDme && (
                            <span className="ml-1.5 px-1.5 py-0.5 text-[10px] font-semibold bg-blue-100 text-blue-700 rounded">
                              DME
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-medium">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                            {i.name}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-block px-2 py-0.5 rounded text-xs bg-slate-100 font-medium text-slate-700">
                            {typeLabel(i.facilityType || i.type)}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-700">{i.district}</td>
                        <td className="px-4 py-3 text-muted-foreground">{i.superintendentName || i.contactPerson || "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{i.contactPhone || i.contactEmail || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Institution</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div><Label>Institution Name *</Label><Input value={form.name} onChange={(e) => f("name", e.target.value)} className="mt-1.5" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type *</Label>
                <Select value={form.type} onValueChange={(v) => f("type", v)}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>{TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>District *</Label>
                <Select value={form.district} onValueChange={(v) => f("district", v)}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>{DISTRICTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Address *</Label><Textarea value={form.address} onChange={(e) => f("address", e.target.value)} rows={2} className="mt-1.5" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Superintendent</Label><Input value={form.superintendentName} onChange={(e) => f("superintendentName", e.target.value)} className="mt-1.5" /></div>
              <div><Label>Contact Email</Label><Input type="email" value={form.contactEmail} onChange={(e) => f("contactEmail", e.target.value)} className="mt-1.5" /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createInstitution.isPending || !form.name || !form.district || !form.address}>
              {createInstitution.isPending ? "Adding..." : "Add Institution"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
