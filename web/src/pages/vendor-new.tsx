import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useCreateVendor } from "@/lib/api-hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft } from "lucide-react";

export default function VendorNew() {
  const [, navigate] = useLocation();
  const createVendor = useCreateVendor();
  const [form, setForm] = useState({ name: "", contactEmail: "", contactPhone: "", address: "", gstNumber: "" });
  const f = (k: keyof typeof form, v: string) => setForm({ ...form, [k]: v });
  const valid = form.name && form.contactEmail && form.contactPhone && form.address && form.gstNumber;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createVendor.mutate({ data: form }, { onSuccess: (v) => navigate(`/vendors/${v.id}`) });
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/vendors"><Button variant="ghost" size="sm" className="gap-2"><ArrowLeft className="h-4 w-4" />Back</Button></Link>
        <div>
          <h1 className="text-2xl font-bold">Register Vendor</h1>
          <p className="text-sm text-muted-foreground">Add a new supplier to the vendor master</p>
        </div>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Vendor Details</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><Label>Company Name *</Label><Input value={form.name} onChange={(e) => f("name", e.target.value)} className="mt-1.5" /></div>
            <div><Label>Contact Email *</Label><Input type="email" value={form.contactEmail} onChange={(e) => f("contactEmail", e.target.value)} className="mt-1.5" /></div>
            <div><Label>Contact Phone *</Label><Input value={form.contactPhone} onChange={(e) => f("contactPhone", e.target.value)} className="mt-1.5" /></div>
            <div><Label>Registered Address *</Label><Textarea value={form.address} onChange={(e) => f("address", e.target.value)} rows={2} className="mt-1.5" /></div>
            <div><Label>GST Number *</Label><Input value={form.gstNumber} onChange={(e) => f("gstNumber", e.target.value)} className="mt-1.5 font-mono" placeholder="e.g. 36AABCT1332L1ZH" /></div>
            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={createVendor.isPending || !valid}>{createVendor.isPending ? "Registering..." : "Register Vendor"}</Button>
              <Link href="/vendors"><Button type="button" variant="outline">Cancel</Button></Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
