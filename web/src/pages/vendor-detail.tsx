import { useRoute, Link } from "wouter";
import { useGetVendor, getGetVendorQueryKey, useGetVendorPerformance, getGetVendorPerformanceQueryKey } from "@/lib/api-hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { ArrowLeft, Star, Mail, Phone, MapPin, FileText } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function VendorDetail() {
  const [, params] = useRoute("/vendors/:id");
  const id = (params?.id ?? "");
  const { data: vendor, isLoading } = useGetVendor(id, { query: { enabled: !!id, queryKey: getGetVendorQueryKey(id) } });
  const { data: allPerf } = useGetVendorPerformance({ query: { queryKey: getGetVendorPerformanceQueryKey() } });

  if (isLoading) return <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 rounded-full border-4 border-primary border-t-transparent" /></div>;
  if (!vendor) return <div className="text-center py-20 text-muted-foreground">Vendor not found</div>;

  const perf = allPerf?.find((p) => p.vendorId === vendor.id);
  const score = vendor.performanceScore ?? perf?.performanceScore;
  const scoreColor = score == null ? "text-muted-foreground" : score >= 80 ? "text-emerald-600" : score >= 60 ? "text-amber-600" : "text-red-600";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/vendors"><Button variant="ghost" size="sm" className="gap-2"><ArrowLeft className="h-4 w-4" />Back</Button></Link>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{vendor.name}</h1>
            {vendor.isL1Bidder && <div className="flex items-center gap-1 px-2 py-0.5 bg-amber-100 rounded-full"><Star className="h-3.5 w-3.5 text-amber-600 fill-current" /><span className="text-xs font-semibold text-amber-700">L1 Bidder</span></div>}
          </div>
          <p className="text-sm text-muted-foreground font-mono">{vendor.vendorCode}</p>
        </div>
        <div className="ml-auto"><StatusBadge status={vendor.status} /></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Contact Information</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3"><Mail className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" /><div><p className="text-xs text-muted-foreground">Email</p><p className="text-sm">{vendor.contactEmail}</p></div></div>
            <div className="flex items-start gap-3"><Phone className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" /><div><p className="text-xs text-muted-foreground">Phone</p><p className="text-sm">{vendor.contactPhone}</p></div></div>
            <div className="flex items-start gap-3"><MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" /><div><p className="text-xs text-muted-foreground">Address</p><p className="text-sm">{vendor.address}</p></div></div>
            <div className="flex items-start gap-3"><FileText className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" /><div><p className="text-xs text-muted-foreground">GST Number</p><p className="text-sm font-mono">{vendor.gstNumber}</p></div></div>
            <div><p className="text-xs text-muted-foreground">Registered Since</p><p className="text-sm">{vendor.createdAt ? format(new Date(vendor.createdAt), "dd MMMM yyyy") : "—"}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Performance Metrics</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center py-4">
              <p className={cn("text-5xl font-bold", scoreColor)}>{score != null ? `${score.toFixed(0)}%` : "—"}</p>
              <p className="text-sm text-muted-foreground mt-1">Overall Performance Score</p>
            </div>
            {perf && (
              <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                <div className="text-center"><p className="text-xl font-bold text-foreground">{perf.totalOrders}</p><p className="text-xs text-muted-foreground">Total Orders</p></div>
                <div className="text-center"><p className="text-xl font-bold text-emerald-600">{perf.onTimeDeliveries}</p><p className="text-xs text-muted-foreground">On-Time Deliveries</p></div>
                <div className="text-center"><p className="text-xl font-bold text-foreground">{perf.qaPassRate.toFixed(0)}%</p><p className="text-xs text-muted-foreground">QA Pass Rate</p></div>
                <div className="text-center"><p className="text-xl font-bold text-foreground">{perf.avgLeadTimeDays}d</p><p className="text-xs text-muted-foreground">Avg Lead Time</p></div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

