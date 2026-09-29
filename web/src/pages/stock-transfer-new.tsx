import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, ArrowRightLeft, AlertTriangle, AlertCircle, CheckCircle2 } from "lucide-react";
import { mockInstitutions, mockEquipment, mockStockPositions } from "@/mocks/data";

export default function StockTransferNew() {
  const [, navigate] = useLocation();
  const [form, setForm] = useState({
    sourceId: "",
    destinationId: "",
    itemId: "",
    batchNumber: "",
    expiryDate: "",
    quantity: "",
    unit: "Box/1000",
    priority: "normal",
    remarks: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const selectedItem = form.itemId ? mockEquipment.find(e => String(e.id) === form.itemId) : null;
  const stockPos = form.sourceId && form.itemId
    ? mockStockPositions.find(p => String(p.facilityId) === form.sourceId && String(p.itemId) === form.itemId)
    : null;

  const sourceFacility = form.sourceId ? mockInstitutions.find(i => String(i.id) === form.sourceId) : null;
  const destFacility = form.destinationId ? mockInstitutions.find(i => String(i.id) === form.destinationId) : null;

  const maxQty = stockPos?.usableStock ?? 0;
  const requestedQty = parseInt(form.quantity) || 0;
  const qtyExceedsStock = requestedQty > maxQty;

  const isValid = form.sourceId && form.destinationId && form.sourceId !== form.destinationId
    && form.itemId && form.batchNumber && form.expiryDate && form.quantity && !qtyExceedsStock;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;
    setSubmitted(true);
    setTimeout(() => navigate("/stock-transfers"), 1500);
  }

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto mt-20 text-center space-y-4">
        <div className="h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
          <CheckCircle2 className="h-8 w-8 text-emerald-600" />
        </div>
        <h2 className="text-xl font-bold">Transfer Request Submitted</h2>
        <p className="text-muted-foreground text-sm">The transfer has been queued for Deputy Director approval.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/stock-transfers">
          <Button variant="ghost" size="sm" className="gap-2"><ArrowLeft className="h-4 w-4" />Back</Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">New Stock Transfer Request</h1>
          <p className="text-sm text-muted-foreground">Create an inter-facility stock redistribution request</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Source & Destination */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><ArrowRightLeft className="h-4 w-4" />Transfer Route</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Source Facility *</Label>
                <Select value={form.sourceId} onValueChange={v => setForm({ ...form, sourceId: v, itemId: "" })}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select source…" /></SelectTrigger>
                  <SelectContent>
                    {mockInstitutions.map(i => <SelectItem key={i.id} value={String(i.id)}>{i.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Destination Facility *</Label>
                <Select value={form.destinationId} onValueChange={v => setForm({ ...form, destinationId: v })}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select destination…" /></SelectTrigger>
                  <SelectContent>
                    {mockInstitutions.filter(i => String(i.id) !== form.sourceId).map(i => (
                      <SelectItem key={i.id} value={String(i.id)}>{i.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {sourceFacility && destFacility && (
              <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200 text-sm">
                <span className="font-medium text-blue-700">{sourceFacility.name}</span>
                <ArrowRightLeft className="h-4 w-4 text-blue-500 shrink-0" />
                <span className="font-medium text-blue-700">{destFacility.name}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Item */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Item Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Item *</Label>
              <Select value={form.itemId} onValueChange={v => setForm({ ...form, itemId: v, unit: mockEquipment.find(e => String(e.id) === v)?.category === "pharmacy" ? "Box/1000" : "No." })}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select item…" /></SelectTrigger>
                <SelectContent>
                  {mockEquipment.map(e => <SelectItem key={e.id} value={String(e.id)}>{e.name} ({e.equipmentCode})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Stock Snapshot */}
            {stockPos && (
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Usable Stock", value: `${stockPos.usableStock} ${stockPos.unit}`, warn: stockPos.usableStock < 20 },
                  { label: "Near-Expiry Stock", value: `${stockPos.nearExpiryStock} ${stockPos.unit}`, warn: stockPos.nearExpiryStock > 0 },
                  { label: "Stock Cover", value: `${stockPos.stockCoverDays}d`, warn: stockPos.stockCoverDays > 90 },
                ].map(item => (
                  <div key={item.label} className={`p-3 rounded-lg border text-sm ${item.warn ? "bg-amber-50 border-amber-200" : "bg-muted/30 border-border"}`}>
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className="font-bold mt-0.5">{item.value}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Batch Number *</Label>
                <Input value={form.batchNumber} onChange={e => setForm({ ...form, batchNumber: e.target.value })} className="mt-1.5" placeholder="e.g. PCT/2025/A040" />
              </div>
              <div>
                <Label>Expiry Date *</Label>
                <Input type="date" value={form.expiryDate} onChange={e => setForm({ ...form, expiryDate: e.target.value })} className="mt-1.5" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Quantity *</Label>
                <Input type="number" min="1" max={maxQty || undefined} value={form.quantity}
                  onChange={e => setForm({ ...form, quantity: e.target.value })} className="mt-1.5" placeholder="Enter quantity" />
                {qtyExceedsStock && (
                  <p className="text-xs text-red-600 mt-1">Exceeds usable stock ({maxQty} {stockPos?.unit})</p>
                )}
                {stockPos && !qtyExceedsStock && form.quantity && (
                  <p className="text-xs text-muted-foreground mt-1">Max available: {maxQty} {stockPos.unit}</p>
                )}
              </div>
              <div>
                <Label>Unit</Label>
                <Select value={form.unit} onValueChange={v => setForm({ ...form, unit: v })}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["No.", "Box/1000", "Box", "Kg", "Litre", "Set"].map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Priority & Remarks */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Priority & Remarks</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Priority *</Label>
              <div className="flex gap-2 mt-2">
                {(["normal", "urgent", "critical"] as const).map(p => (
                  <button key={p} type="button"
                    onClick={() => setForm({ ...form, priority: p })}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                      form.priority === p
                        ? p === "critical" ? "bg-red-100 text-red-700 border-red-300"
                          : p === "urgent" ? "bg-amber-100 text-amber-700 border-amber-300"
                          : "bg-slate-200 text-slate-700 border-slate-300"
                        : "bg-background text-muted-foreground border-border hover:border-foreground/30"
                    }`}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>Justification / Remarks *</Label>
              <Textarea value={form.remarks} onChange={e => setForm({ ...form, remarks: e.target.value })}
                rows={3} className="mt-1.5 resize-none" placeholder="Explain the reason for transfer, stock situation, urgency, etc." />
            </div>
          </CardContent>
        </Card>

        {!isValid && form.sourceId && form.destinationId && form.itemId && (
          <Alert className="border-amber-200 bg-amber-50">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-700 text-sm">Fill in all required fields before submitting.</AlertDescription>
          </Alert>
        )}

        <div className="flex gap-3 pb-6">
          <Button type="submit" disabled={!isValid} className="gap-2"><ArrowRightLeft className="h-4 w-4" />Submit for Approval</Button>
          <Link href="/stock-transfers"><Button type="button" variant="outline">Cancel</Button></Link>
        </div>
      </form>
    </div>
  );
}
