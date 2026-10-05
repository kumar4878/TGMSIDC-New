import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  useDistricts, useFundingSources, useProgrammes, useAccountHeads, useTaxSlabs,
  useInstitutions, useListRateContracts,
} from "@/lib/api-hooks";
import {
  MapPin, Landmark, FolderKanban, Receipt, Percent, Building2,
  Search, Shield, CheckCircle2, FileCheck, FileText
} from "lucide-react";

export default function MasterData() {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("districts");

  const { data: districts = [] } = useDistricts();
  const { data: fundingSources = [] } = useFundingSources();
  const { data: programmes = [] } = useProgrammes();
  const { data: accountHeads = [] } = useAccountHeads();
  const { data: taxSlabs = [] } = useTaxSlabs();
  const { data: institutions = [] } = useInstitutions();
  const { data: rcs = [] } = useListRateContracts();

  // Strictly official hospital master dataset
  const hospitals = institutions.filter((i: any) =>
    Boolean(i.dmeInstitutionId || i.institutionCode?.startsWith("DME-") || i.hodName?.toLowerCase().includes("medical education"))
  ).length > 0
    ? institutions.filter((i: any) =>
        Boolean(i.dmeInstitutionId || i.institutionCode?.startsWith("DME-") || i.hodName?.toLowerCase().includes("medical education"))
      )
    : institutions;

  const filter = (arr: any[], keys: string[]) =>
    arr.filter(item =>
      !search || keys.some(k => String(item[k] ?? "").toLowerCase().includes(search.toLowerCase()))
    );

  const formatINR = (n: number) =>
    n >= 10000000
      ? `₹${(n / 10000000).toFixed(2)} Cr`
      : n >= 100000
      ? `₹${(n / 100000).toFixed(2)} L`
      : `₹${(n || 0).toLocaleString("en-IN")}`;

  const tcTemplates = [
    { id: "TC-001", poType: "RC-Based Equipment PO", clauseCount: 18, lockedClauses: 12, editableClauses: 6, version: "v2.1", effectiveDate: "2026-04-01", status: "Active" },
    { id: "TC-002", poType: "GeM Direct Purchase", clauseCount: 14, lockedClauses: 10, editableClauses: 4, version: "v1.3", effectiveDate: "2026-04-01", status: "Active" },
    { id: "TC-003", poType: "Local Purchase (< ₹25K)", clauseCount: 8, lockedClauses: 6, editableClauses: 2, version: "v1.0", effectiveDate: "2025-10-15", status: "Active" },
    { id: "TC-004", poType: "CAMC / AMC Service Contract", clauseCount: 22, lockedClauses: 16, editableClauses: 6, version: "v1.1", effectiveDate: "2026-04-01", status: "Active" },
  ];

  const authorities = [
    { id: "AUTH-001", name: "SO Equipment", designation: "Section Officer", department: "Equipment Wing", approvalLevel: "Level 3", thresholdAmount: 5000000, canApproveIndents: true, canApprovePOs: true, canApproveRCs: true },
    { id: "AUTH-002", name: "GM Equipment", designation: "General Manager", department: "Equipment Wing", approvalLevel: "Level 2", thresholdAmount: 20000000, canApproveIndents: true, canApprovePOs: true, canApproveRCs: true },
    { id: "AUTH-003", name: "Executive Director", designation: "ED", department: "TGMSIDC", approvalLevel: "Level 1", thresholdAmount: 100000000, canApproveIndents: true, canApprovePOs: true, canApproveRCs: true },
    { id: "AUTH-004", name: "Managing Director", designation: "MD", department: "TGMSIDC", approvalLevel: "Escalation", thresholdAmount: null, canApproveIndents: false, canApprovePOs: false, canApproveRCs: false },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-slate-800" />
            <h1 className="text-2xl font-bold text-foreground">Statutory Master Data</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Government of Telangana — Equipment Procurement Master Registries
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1.5 py-1 px-3">
            <CheckCircle2 className="h-3.5 w-3.5" /> 9 Statutory Master Registries Synchronised
          </Badge>
        </div>
      </div>

      {/* Search & Tabs */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search within active master..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-slate-100 p-1 flex flex-wrap h-auto gap-1">
          <TabsTrigger value="districts" className="gap-1.5 text-xs">
            <MapPin className="h-3.5 w-3.5" /> Districts ({districts.length})
          </TabsTrigger>
          <TabsTrigger value="hospitals" className="gap-1.5 text-xs font-semibold text-blue-700 bg-blue-50/70 border border-blue-200/50">
            <Building2 className="h-3.5 w-3.5 text-blue-600" /> Hospital Master ({hospitals.length})
          </TabsTrigger>
          <TabsTrigger value="funding" className="gap-1.5 text-xs">
            <Landmark className="h-3.5 w-3.5" /> Funding Sources ({fundingSources.length})
          </TabsTrigger>
          <TabsTrigger value="programmes" className="gap-1.5 text-xs">
            <FolderKanban className="h-3.5 w-3.5" /> Programmes ({programmes.length})
          </TabsTrigger>
          <TabsTrigger value="account-heads" className="gap-1.5 text-xs">
            <Receipt className="h-3.5 w-3.5" /> Account Heads ({accountHeads.length})
          </TabsTrigger>
          <TabsTrigger value="tax-slabs" className="gap-1.5 text-xs">
            <Percent className="h-3.5 w-3.5" /> GST / Tax Slabs ({taxSlabs.length})
          </TabsTrigger>
          <TabsTrigger value="rate-contracts" className="gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50/70 border border-emerald-200/50">
            <FileCheck className="h-3.5 w-3.5 text-emerald-600" /> Rate Contracts ({rcs.length})
          </TabsTrigger>
          <TabsTrigger value="tc-templates" className="gap-1.5 text-xs">
            <FileText className="h-3.5 w-3.5" /> T&C Templates (4)
          </TabsTrigger>
          <TabsTrigger value="authorities" className="gap-1.5 text-xs">
            <Shield className="h-3.5 w-3.5" /> Authority Master (4)
          </TabsTrigger>
        </TabsList>

        {/* 1. Districts */}
        <TabsContent value="districts">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span>Telangana Districts Registry</span>
                <span className="text-xs font-normal text-muted-foreground">Standard 33-district administrative division</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b text-xs text-muted-foreground uppercase font-semibold">
                    <tr>
                      <th className="p-3 text-left">Code</th>
                      <th className="p-3 text-left">District Name</th>
                      <th className="p-3 text-left">State</th>
                      <th className="p-3 text-left">Region</th>
                      <th className="p-3 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filter(districts, ["name", "code", "region"]).map((d: any) => (
                      <tr key={d.code} className="hover:bg-slate-50/60">
                        <td className="p-3 font-mono text-xs font-semibold text-primary">{d.code}</td>
                        <td className="p-3 font-medium text-foreground">{d.name}</td>
                        <td className="p-3 text-muted-foreground">{d.state}</td>
                        <td className="p-3">
                          <Badge variant="outline" className="text-xs bg-slate-50">{d.region}</Badge>
                        </td>
                        <td className="p-3">
                          <Badge className="bg-emerald-100 text-emerald-700 border-0 text-[10px]">Active</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 2. Hospital Master */}
        <TabsContent value="hospitals">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-blue-600" />
                    Hospital Master (Official DME Registry)
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Official registry of tertiary medical colleges, teaching hospitals, and specialty centers under DME Telangana
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    Total: {hospitals.length} Hospitals
                  </Badge>
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                    GGH: {hospitals.filter((x: any) => x.facilityType === "GGH" || x.type === "GGH").length}
                  </Badge>
                  <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                    GMC: {hospitals.filter((x: any) => x.facilityType === "GMC" || x.type === "GMC").length}
                  </Badge>
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                    Specialty: {hospitals.filter((x: any) => (x.facilityType || x.type)?.includes("Specialty")).length}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b text-xs text-muted-foreground uppercase font-semibold">
                    <tr>
                      <th className="p-3 text-left">DME_Institution_ID</th>
                      <th className="p-3 text-left">Hospital_Name</th>
                      <th className="p-3 text-left">Hospital_Type</th>
                      <th className="p-3 text-left">District</th>
                      <th className="p-3 text-left">Superintendent / Principal</th>
                      <th className="p-3 text-left">Contact / Email</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filter(hospitals, ["name", "institutionCode", "dmeInstitutionId", "district", "facilityType", "type"]).map((i: any) => {
                      const type = i.facilityType || i.type || "Hospital";
                      const typeBadgeColor =
                        type === "GGH"
                          ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                          : type === "GMC"
                          ? "bg-purple-100 text-purple-800 border-purple-200"
                          : type.includes("Specialty")
                          ? "bg-amber-100 text-amber-800 border-amber-200"
                          : "bg-blue-100 text-blue-800 border-blue-200";

                      return (
                        <tr key={i.id || i.institutionCode} className="hover:bg-slate-50/60 transition-colors">
                          <td className="p-3 font-mono text-xs font-bold text-blue-600">
                            {i.dmeInstitutionId || i.institutionCode}
                          </td>
                          <td className="p-3 font-medium text-foreground">
                            <div className="flex items-center gap-2">
                              <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                              {i.name}
                            </div>
                          </td>
                          <td className="p-3">
                            <Badge variant="outline" className={`text-xs font-semibold ${typeBadgeColor}`}>
                              {type}
                            </Badge>
                          </td>
                          <td className="p-3 font-medium text-slate-700">
                            <div className="flex items-center gap-1.5">
                              <MapPin className="h-3 w-3 text-muted-foreground" />
                              {i.district}
                            </div>
                          </td>
                          <td className="p-3 text-xs text-muted-foreground">
                            {i.superintendentName || i.contactPerson || "—"}
                          </td>
                          <td className="p-3 text-xs font-mono text-muted-foreground">
                            {i.contactPhone || i.contactEmail || "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 3. Funding Sources */}
        <TabsContent value="funding">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Funding Sources Registry</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b text-xs text-muted-foreground uppercase font-semibold">
                    <tr>
                      <th className="p-3 text-left">Code</th>
                      <th className="p-3 text-left">Funding Agency / Source</th>
                      <th className="p-3 text-left">Type</th>
                      <th className="p-3 text-right">FY 26-27 Budget Allocation</th>
                      <th className="p-3 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filter(fundingSources, ["name", "code", "type"]).map((f: any) => (
                      <tr key={f.code} className="hover:bg-slate-50/60">
                        <td className="p-3 font-mono text-xs font-semibold text-primary">{f.code}</td>
                        <td className="p-3 font-medium text-foreground">{f.name}</td>
                        <td className="p-3">
                          <Badge variant="outline" className="text-xs bg-slate-50 capitalize">{f.type}</Badge>
                        </td>
                        <td className="p-3 text-right font-mono font-semibold text-foreground">
                          {formatINR(f.totalSanctionedAmount || f.budgetAllocation || 0)}
                        </td>
                        <td className="p-3">
                          <Badge className="bg-emerald-100 text-emerald-700 border-0 text-[10px]">Active</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 4. Programmes */}
        <TabsContent value="programmes">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Healthcare Programmes &amp; Schemes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b text-xs text-muted-foreground uppercase font-semibold">
                    <tr>
                      <th className="p-3 text-left">Code</th>
                      <th className="p-3 text-left">Programme Name</th>
                      <th className="p-3 text-left">Nodal Agency</th>
                      <th className="p-3 text-left">Financial Year</th>
                      <th className="p-3 text-right">Sanctioned Outlay</th>
                      <th className="p-3 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filter(programmes, ["name", "code", "nodalAgency"]).map((p: any) => (
                      <tr key={p.code} className="hover:bg-slate-50/60">
                        <td className="p-3 font-mono text-xs font-semibold text-primary">{p.code}</td>
                        <td className="p-3 font-medium text-foreground">{p.name}</td>
                        <td className="p-3 text-muted-foreground">{p.nodalAgency}</td>
                        <td className="p-3 font-mono text-xs">{p.financialYear}</td>
                        <td className="p-3 text-right font-mono font-semibold text-foreground">
                          {formatINR(p.budgetAllocated || p.sanctionedOutlay || 0)}
                        </td>
                        <td className="p-3">
                          <Badge className="bg-emerald-100 text-emerald-700 border-0 text-[10px]">Active</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 5. Account Heads */}
        <TabsContent value="account-heads">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Treasury Account Heads (HoA)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b text-xs text-muted-foreground uppercase font-semibold">
                    <tr>
                      <th className="p-3 text-left">Major Head</th>
                      <th className="p-3 text-left">Description</th>
                      <th className="p-3 text-left">Sub-Major</th>
                      <th className="p-3 text-left">Minor Head</th>
                      <th className="p-3 text-left">Detailed Head</th>
                      <th className="p-3 text-right">Budget Assigned</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filter(accountHeads, ["majorHead", "description", "headOfAccount"]).map((a: any) => (
                      <tr key={a.majorHead || a.headOfAccount} className="hover:bg-slate-50/60">
                        <td className="p-3 font-mono text-xs font-bold text-primary">{a.majorHead || a.headOfAccount}</td>
                        <td className="p-3 font-medium text-foreground">{a.description}</td>
                        <td className="p-3 font-mono text-xs text-muted-foreground">{a.subMajorHead || "01"}</td>
                        <td className="p-3 font-mono text-xs text-muted-foreground">{a.minorHead || "110"}</td>
                        <td className="p-3 font-mono text-xs text-muted-foreground">{a.detailedHead || "510"}</td>
                        <td className="p-3 text-right font-mono font-semibold text-foreground">
                          {formatINR(a.budgetAssigned || a.allocatedBudget || 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 6. GST & Tax Slabs */}
        <TabsContent value="tax-slabs">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">GST Rate Slabs for Medical Equipment &amp; Consumables</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b text-xs text-muted-foreground uppercase font-semibold">
                    <tr>
                      <th className="p-3 text-left">HSN/SAC Code</th>
                      <th className="p-3 text-left">Goods / Services Description</th>
                      <th className="p-3 text-center">CGST %</th>
                      <th className="p-3 text-center">SGST %</th>
                      <th className="p-3 text-center">IGST %</th>
                      <th className="p-3 text-left">Effective Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filter(taxSlabs, ["hsnCode", "description"]).map((t: any) => (
                      <tr key={t.hsnCode} className="hover:bg-slate-50/60">
                        <td className="p-3 font-mono text-xs font-bold text-primary">{t.hsnCode}</td>
                        <td className="p-3 font-medium text-foreground">{t.description}</td>
                        <td className="p-3 text-center font-mono text-xs">{t.cgstPercent}%</td>
                        <td className="p-3 text-center font-mono text-xs">{t.sgstPercent}%</td>
                        <td className="p-3 text-center font-mono text-xs font-semibold text-blue-600">{t.igstPercent}%</td>
                        <td className="p-3 text-xs text-muted-foreground">01-Apr-2023</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 7. Rate Contracts Master */}
        <TabsContent value="rate-contracts">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span>Active Rate Contracts Master Registry</span>
                <span className="text-xs font-normal text-muted-foreground">Synchronized contracted benchmark rates &amp; validity schedules</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b text-xs text-muted-foreground uppercase font-semibold">
                    <tr>
                      <th className="p-3 text-left">Contract No.</th>
                      <th className="p-3 text-left">Equipment Name</th>
                      <th className="p-3 text-left">Category</th>
                      <th className="p-3 text-left">Approved Vendor</th>
                      <th className="p-3 text-right">RC Unit Rate (₹)</th>
                      <th className="p-3 text-center">GST %</th>
                      <th className="p-3 text-right">Landed Rate (₹)</th>
                      <th className="p-3 text-left">Validity Period</th>
                      <th className="p-3 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filter(rcs, ["contractNumber", "equipmentName", "vendorName", "equipmentCategory"]).map((r: any) => {
                      const isActive = r.status === "active";
                      return (
                        <tr key={r.id || r.contractNumber} className="hover:bg-slate-50/60">
                          <td className="p-3 font-mono text-xs font-bold text-primary">{r.contractNumber}</td>
                          <td className="p-3 font-semibold text-foreground">{r.equipmentName}</td>
                          <td className="p-3 text-xs text-muted-foreground">{r.equipmentCategory || "Medical Equipment"}</td>
                          <td className="p-3 text-xs font-medium text-slate-700">{r.vendorName}</td>
                          <td className="p-3 text-right font-mono font-bold text-emerald-700">
                            ₹{(r.unitPrice || 0).toLocaleString("en-IN")}
                          </td>
                          <td className="p-3 text-center font-mono text-xs">{r.gstRate || 12}%</td>
                          <td className="p-3 text-right font-mono font-bold text-foreground">
                            ₹{(r.unitPriceInclTax || Math.round((r.unitPrice || 0) * (1 + (r.gstRate || 12) / 100))).toLocaleString("en-IN")}
                          </td>
                          <td className="p-3 text-xs text-muted-foreground">
                            {r.startDate ? new Date(r.startDate).toLocaleDateString("en-IN", { month: "short", year: "numeric" }) : "—"} to {r.endDate ? new Date(r.endDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                          </td>
                          <td className="p-3">
                            <Badge variant={isActive ? "default" : "outline"} className={isActive ? "bg-emerald-600 text-white" : "text-red-700 border-red-300 bg-red-50"}>
                              {isActive ? "Active" : "Expired"}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 8. T&C Templates Master */}
        <TabsContent value="tc-templates">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span>Terms &amp; Conditions Templates Registry</span>
                <span className="text-xs font-normal text-muted-foreground">Standardized PO and Contract Clauses</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b text-xs text-muted-foreground uppercase font-semibold">
                    <tr>
                      <th className="p-3 text-left">Template ID</th>
                      <th className="p-3 text-left">PO Type</th>
                      <th className="p-3 text-center">Total Clauses</th>
                      <th className="p-3 text-center">Locked (🔒)</th>
                      <th className="p-3 text-center">Editable (✏️)</th>
                      <th className="p-3 text-left">Version</th>
                      <th className="p-3 text-left">Effective Date</th>
                      <th className="p-3 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filter(tcTemplates, ["id", "poType"]).map((tc: any) => (
                      <tr key={tc.id} className="hover:bg-slate-50/60">
                        <td className="p-3 font-mono text-xs font-bold text-primary">{tc.id}</td>
                        <td className="p-3 font-medium text-foreground">{tc.poType}</td>
                        <td className="p-3 text-center font-mono font-medium">{tc.clauseCount}</td>
                        <td className="p-3 text-center font-mono text-slate-500">{tc.lockedClauses}</td>
                        <td className="p-3 text-center font-mono text-slate-500">{tc.editableClauses}</td>
                        <td className="p-3 text-xs text-muted-foreground font-mono">{tc.version}</td>
                        <td className="p-3 text-xs text-muted-foreground">{new Date(tc.effectiveDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</td>
                        <td className="p-3">
                          <Badge className="bg-emerald-100 text-emerald-700 border-0 text-[10px]">
                            {tc.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 9. Authority Master */}
        <TabsContent value="authorities">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span>Delegation of Financial Powers (DoFP) Authority Master</span>
                <span className="text-xs font-normal text-muted-foreground">Approval hierarchy &amp; thresholds</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b text-xs text-muted-foreground uppercase font-semibold">
                    <tr>
                      <th className="p-3 text-left">Authority ID</th>
                      <th className="p-3 text-left">Name</th>
                      <th className="p-3 text-left">Designation</th>
                      <th className="p-3 text-left">Department</th>
                      <th className="p-3 text-left">Approval Level</th>
                      <th className="p-3 text-right">Threshold (₹)</th>
                      <th className="p-3 text-center">Indent Appr.</th>
                      <th className="p-3 text-center">PO Appr.</th>
                      <th className="p-3 text-center">RC Appr.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filter(authorities, ["id", "name", "designation", "department"]).map((a: any) => (
                      <tr key={a.id} className="hover:bg-slate-50/60">
                        <td className="p-3 font-mono text-xs font-bold text-primary">{a.id}</td>
                        <td className="p-3 font-medium text-foreground">{a.name}</td>
                        <td className="p-3 text-xs text-muted-foreground">{a.designation}</td>
                        <td className="p-3 text-xs text-muted-foreground">{a.department}</td>
                        <td className="p-3">
                          <Badge variant="outline" className="text-[10px] bg-slate-50">{a.approvalLevel}</Badge>
                        </td>
                        <td className="p-3 text-right font-mono font-semibold text-foreground">
                          {a.thresholdAmount === null ? "Unlimited" : formatINR(a.thresholdAmount)}
                        </td>
                        <td className="p-3 text-center text-xs">
                          {a.canApproveIndents ? <span className="text-emerald-600 font-bold">✓</span> : <span className="text-red-500 font-bold">✗</span>}
                        </td>
                        <td className="p-3 text-center text-xs">
                          {a.canApprovePOs ? <span className="text-emerald-600 font-bold">✓</span> : <span className="text-red-500 font-bold">✗</span>}
                        </td>
                        <td className="p-3 text-center text-xs">
                          {a.canApproveRCs ? <span className="text-emerald-600 font-bold">✓</span> : <span className="text-red-500 font-bold">✗</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
