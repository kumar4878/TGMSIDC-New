import { useState } from "react";
import { Link } from "wouter";
import { useListVendors, getListVendorsQueryKey } from "@/lib/api-hooks";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/StatusBadge";
import { Plus, Search, Eye, Star } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Vendors() {
  const [search, setSearch] = useState("");
  const { data: vendors, isLoading } = useListVendors({ query: { queryKey: getListVendorsQueryKey() } });

  const filtered = (vendors ?? []).filter((v) =>
    !search || v.name.toLowerCase().includes(search.toLowerCase()) || v.vendorCode.toLowerCase().includes(search.toLowerCase())
  );

  function scoreColor(score: number | null | undefined) {
    if (score == null) return "text-muted-foreground";
    if (score >= 80) return "text-emerald-600";
    if (score >= 60) return "text-amber-600";
    return "text-red-600";
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Vendor Master</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Registered suppliers and their performance records</p>
        </div>
        <Link href="/vendors/new">
          <Button size="sm" className="gap-2"><Plus className="h-4 w-4" />Register Vendor</Button>
        </Link>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search vendors..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12"><div className="animate-spin h-6 w-6 rounded-full border-4 border-primary border-t-transparent" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Vendor Code</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Contact Email</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">GST No.</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">L1 Bidder</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Performance</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">No vendors registered</td></tr>
                  ) : filtered.map((v) => (
                    <tr key={v.id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs font-medium text-primary">{v.vendorCode}</td>
                      <td className="px-4 py-3 font-medium">{v.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{v.contactEmail}</td>
                      <td className="px-4 py-3 font-mono text-xs">{v.gstNumber}</td>
                      <td className="px-4 py-3">
                        {v.isL1Bidder && <div className="flex items-center gap-1 text-amber-600"><Star className="h-3.5 w-3.5 fill-current" /><span className="text-xs font-medium">L1</span></div>}
                      </td>
                      <td className={cn("px-4 py-3 font-semibold", scoreColor(v.performanceScore))}>
                        {v.performanceScore != null ? `${v.performanceScore.toFixed(0)}%` : "—"}
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={v.status} /></td>
                      <td className="px-4 py-3">
                        <Link href={`/vendors/${v.id}`}>
                          <Button variant="ghost" size="icon" className="h-8 w-8"><Eye className="h-3.5 w-3.5" /></Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
