import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuditLog } from "@/lib/api-hooks";
import { ShieldAlert, Search, RefreshCw, FileText, ShoppingCart, Truck, Gavel, CheckCircle2, Clock, User } from "lucide-react";
import { format } from "date-fns";

const ACTION_COLOR: Record<string, string> = {
  create: "bg-blue-100 text-blue-700 border-blue-200",
  approve: "bg-emerald-100 text-emerald-700 border-emerald-200",
  reject: "bg-red-100 text-red-700 border-red-200",
  return: "bg-amber-100 text-amber-700 border-amber-200",
  update: "bg-purple-100 text-purple-700 border-purple-200",
  dispatch: "bg-teal-100 text-teal-700 border-teal-200",
  accept: "bg-green-100 text-green-700 border-green-200",
};

export default function AuditTrail() {
  const [search, setSearch] = useState("");
  const [entityFilter, setEntityFilter] = useState("all");

  const { data: logs = [], isLoading, refetch } = useAuditLog(
    entityFilter !== "all" ? { entityType: entityFilter } : undefined
  );

  const filtered = logs.filter((log: any) =>
    !search ||
    log.entityId?.toLowerCase().includes(search.toLowerCase()) ||
    log.userName?.toLowerCase().includes(search.toLowerCase()) ||
    log.action?.toLowerCase().includes(search.toLowerCase()) ||
    log.field?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-slate-800" />
            <h1 className="text-2xl font-bold text-foreground">Statutory Audit Trail</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Immutable system audit log capturing all document transitions, field edits, and user actions
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh Log
        </Button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by ID, User, Action..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
        <Select value={entityFilter} onValueChange={setEntityFilter}>
          <SelectTrigger className="w-48 h-9 text-xs">
            <SelectValue placeholder="All Entity Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Entity Types</SelectItem>
            <SelectItem value="indent">Indents</SelectItem>
            <SelectItem value="purchase_order">Purchase Orders</SelectItem>
            <SelectItem value="rate_contract">Rate Contracts</SelectItem>
            <SelectItem value="tender">Tenders</SelectItem>
            <SelectItem value="delivery">Deliveries &amp; QA</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span>Audit Event Journal ({filtered.length} records)</span>
            <span className="text-xs font-normal text-muted-foreground">Certified compliance audit trail</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b text-xs text-muted-foreground uppercase font-semibold">
                <tr>
                  <th className="p-3 text-left">Timestamp (IST)</th>
                  <th className="p-3 text-left">Entity</th>
                  <th className="p-3 text-left">Entity ID</th>
                  <th className="p-3 text-left">Action</th>
                  <th className="p-3 text-left">Field / Change Details</th>
                  <th className="p-3 text-left">Action By</th>
                  <th className="p-3 text-left">Role Designation</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground text-sm">
                      {isLoading ? "Loading audit events..." : "No audit events recorded for the selected criteria."}
                    </td>
                  </tr>
                ) : (
                  filtered.map((log: any, idx: number) => {
                    const actionKey = String(log.action || "").toLowerCase();
                    const color = ACTION_COLOR[actionKey] || "bg-slate-100 text-slate-700";
                    return (
                      <tr key={log._id || idx} className="hover:bg-slate-50/60">
                        <td className="p-3 font-mono text-xs text-muted-foreground whitespace-nowrap">
                          {log.timestamp ? format(new Date(log.timestamp), "dd-MMM-yyyy HH:mm:ss") : "—"}
                        </td>
                        <td className="p-3">
                          <Badge variant="outline" className="text-xs uppercase bg-slate-50">
                            {log.entityType?.replace("_", " ")}
                          </Badge>
                        </td>
                        <td className="p-3 font-mono text-xs font-semibold text-primary">{log.entityId}</td>
                        <td className="p-3">
                          <Badge variant="outline" className={`text-xs capitalize ${color}`}>
                            {log.action}
                          </Badge>
                        </td>
                        <td className="p-3 text-xs">
                          {log.field ? (
                            <div>
                              <span className="font-semibold text-slate-700">{log.field}: </span>
                              <span className="line-through text-red-600 mr-1">{log.beforeValue}</span>
                              <span className="text-emerald-700 font-medium">→ {log.afterValue}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="p-3 font-medium text-foreground">{log.userName}</td>
                        <td className="p-3 text-xs text-muted-foreground">{log.userRole?.toUpperCase()}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
