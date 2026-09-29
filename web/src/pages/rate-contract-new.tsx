import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useCreateRateContract, useListVendors, useListEquipment } from "@/lib/api-hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";

export default function RateContractNew() {
  const [, navigate] = useLocation();
  const { data: vendors } = useListVendors();
  const { data: equipment } = useListEquipment();
  const createRC = useCreateRateContract();

  const [form, setForm] = useState({
    equipmentId: "", vendorId: "", unitPrice: "",
    gstRate: "12", warrantyYears: "1",
    cmcCharges: "", cmcStartYear: "2",
    startDate: "", endDate: "",
  });

  function f(k: keyof typeof form, v: string) { setForm({ ...form, [k]: v }); }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createRC.mutate({
      data: {
        equipmentId: form.equipmentId,
        vendorId: form.vendorId,
        unitPrice: parseFloat(form.unitPrice),
        gstRate: parseFloat(form.gstRate),
        warrantyYears: parseInt(form.warrantyYears),
        cmcCharges: parseFloat(form.cmcCharges || "0"),
        cmcStartYear: parseInt(form.cmcStartYear),
        startDate: form.startDate,
        endDate: form.endDate,
      }
    }, { onSuccess: (rc) => navigate(`/rate-contracts/${rc.id}`) });
  }

  const valid = form.equipmentId && form.vendorId && form.unitPrice && form.startDate && form.endDate;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/rate-contracts"><Button variant="ghost" size="sm" className="gap-2"><ArrowLeft className="h-4 w-4" />Back</Button></Link>
        <div>
          <h1 className="text-2xl font-bold">New Rate Contract</h1>
          <p className="text-sm text-muted-foreground">Create a new approved rate contract for equipment procurement</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Contract Details</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Equipment *</Label>
                <Select value={form.equipmentId} onValueChange={(v) => f("equipmentId", v)}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select equipment..." /></SelectTrigger>
                  <SelectContent>{(equipment ?? []).map((e) => <SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label>L1 Vendor / Bidder *</Label>
                <Select value={form.vendorId} onValueChange={(v) => f("vendorId", v)}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select vendor..." /></SelectTrigger>
                  <SelectContent>{(vendors ?? []).map((v) => <SelectItem key={v.id} value={String(v.id)}>{v.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Unit Price (₹) *</Label>
                <Input type="number" min="0" value={form.unitPrice} onChange={(e) => f("unitPrice", e.target.value)} placeholder="0.00" className="mt-1.5" />
              </div>
              <div>
                <Label>GST Rate (%) *</Label>
                <Select value={form.gstRate} onValueChange={(v) => f("gstRate", v)}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5%</SelectItem>
                    <SelectItem value="12">12%</SelectItem>
                    <SelectItem value="18">18%</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Warranty (Years)</Label>
                <Input type="number" min="0" value={form.warrantyYears} onChange={(e) => f("warrantyYears", e.target.value)} className="mt-1.5" />
              </div>
              <div>
                <Label>CMC Start Year</Label>
                <Input type="number" min="1" value={form.cmcStartYear} onChange={(e) => f("cmcStartYear", e.target.value)} className="mt-1.5" />
              </div>
              <div className="col-span-2">
                <Label>CMC Annual Charges (₹)</Label>
                <Input type="number" min="0" value={form.cmcCharges} onChange={(e) => f("cmcCharges", e.target.value)} placeholder="Annual CMC charges after warranty" className="mt-1.5" />
              </div>
              <div>
                <Label>Start Date *</Label>
                <Input type="date" value={form.startDate} onChange={(e) => f("startDate", e.target.value)} className="mt-1.5" />
              </div>
              <div>
                <Label>End Date *</Label>
                <Input type="date" value={form.endDate} onChange={(e) => f("endDate", e.target.value)} className="mt-1.5" />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={createRC.isPending || !valid}>{createRC.isPending ? "Creating..." : "Create Rate Contract"}</Button>
              <Link href="/rate-contracts"><Button type="button" variant="outline">Cancel</Button></Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
