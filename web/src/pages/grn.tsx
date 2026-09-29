import { useState, useRef } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import {
  Search, Plus, Eye, Package, CheckCircle2, Upload,
  ClipboardList, FileText, X, Printer, AlertTriangle, Building2,
} from "lucide-react";
import { format } from "date-fns";

interface UploadedDoc { name: string; size: string; type: string; }

interface EquipmentItem {
  slNo: number;
  name: string;
  qty: number;
  make: string;
  model: string;
  serialNo: string;
  warrantyFrom: string;
  warrantyTo: string;
  hsnSac: string;
  gstRate: number;
  batchNos: string;
}

interface InstallationCertificate {
  hospitalName: string;
  department: string;
  supplierName: string;
  poNo: string;
  poDate: string;
  invoiceNo: string;
  invoiceDate: string;
  dcNo: string;
  dcDate: string;
  installationDate: string;
  equipmentItems: EquipmentItem[];
  remarks: string;
  headOfDeptSignature: string;
  doctorName: string;
  doctorDesignation: string;
  doctorDepartment: string;
  doctorMobile: string;
  serviceEngineerName: string;
  serviceEngineerDesignation: string;
  serviceEngineerMobile: string;
  serviceCentreAddress: string;
  medSupCertifiedDate: string;
  certifiedBy: string;
}

interface GRNRecord {
  id: number;
  grnNumber: string;
  deliveryNoteNo: string;
  poNumber: string;
  poId: number;
  vendorName: string;
  vendorGstin: string;
  facilityName: string;
  equipmentName: string;
  orderedQty: number;
  receivedQty: number;
  damagedQty: number;
  challanNo: string;
  dispatchDocNo: string;
  dispatchedThrough: string;
  receivedDate: string;
  condition: "good" | "partial" | "damaged";
  receivedInGoodCondition: boolean;
  discrepancyNotes: string;
  challanUploaded: boolean;
  photosUploaded: boolean;
  installationRequired: boolean;
  installationStatus: "not_started" | "in_progress" | "completed";
  installationDate: string | null;
  installationCertUploaded: boolean;
  annexure6: InstallationCertificate | null;
  uploadedDocs: UploadedDoc[];
  createdBy: string;
  status: "draft" | "submitted" | "verified";
}

const INIT_ANNEXURE6_ITEM: EquipmentItem = {
  slNo: 1, name: "", qty: 1, make: "", model: "", serialNo: "",
  warrantyFrom: "", warrantyTo: "", hsnSac: "90189099", gstRate: 5, batchNos: "",
};

const INIT_CERT: InstallationCertificate = {
  hospitalName: "", department: "", supplierName: "", poNo: "", poDate: "",
  invoiceNo: "", invoiceDate: "", dcNo: "", dcDate: "", installationDate: "",
  equipmentItems: [{ ...INIT_ANNEXURE6_ITEM }],
  remarks: "Installed, Trained and machine working satisfactory",
  headOfDeptSignature: "", doctorName: "", doctorDesignation: "", doctorDepartment: "", doctorMobile: "",
  serviceEngineerName: "", serviceEngineerDesignation: "Service Engineer", serviceEngineerMobile: "", serviceCentreAddress: "",
  medSupCertifiedDate: "", certifiedBy: "",
};

const INIT_GRNS: GRNRecord[] = [
  {
    id: 1,
    grnNumber: "GRN/HPC/2026/001",
    deliveryNoteNo: "SSA/0506/25-26",
    poNumber: "441A/591/HPC/EQU/2025-26",
    poId: 1,
    vendorName: "M/s. Sri Srinivasa Agencies",
    vendorGstin: "36ACWFS9933Q1ZO",
    facilityName: "Govt. General Hospital, Sangareddy",
    equipmentName: "Surgical Diathermy / Cautery Machine (Sigma+) — 3 Nos. with 15-item accessories",
    orderedQty: 45,
    receivedQty: 45,
    damagedQty: 0,
    challanNo: "SSA/0506/25-26",
    dispatchDocNo: "SSA/DISP/0506/25-26",
    dispatchedThrough: "Self / Company Vehicle",
    receivedDate: "2026-03-14",
    condition: "good",
    receivedInGoodCondition: true,
    discrepancyNotes: "",
    challanUploaded: true,
    photosUploaded: true,
    installationRequired: true,
    installationStatus: "completed",
    installationDate: "2026-03-25",
    installationCertUploaded: true,
    annexure6: {
      hospitalName: "Govt. General Hospital, Sangareddy",
      department: "Operation Theatre",
      supplierName: "M/s. Sri Srinivasa Agencies",
      poNo: "441A/591/HPC/EQU/2025-26",
      poDate: "2026-01-11",
      invoiceNo: "SSA/INV/0506/25-26",
      invoiceDate: "2026-03-12",
      dcNo: "SSA/0506/25-26",
      dcDate: "2026-03-14",
      installationDate: "2026-03-25",
      equipmentItems: [
        { slNo: 1, name: "Surgical Diathermy / Cautery Machine", qty: 3, make: "Xcellance Medicaltechnologies Pvt Ltd", model: "Sigma+", serialNo: "SP426A04AL, SP426A05L, SP426A05Q", warrantyFrom: "2026-03-25", warrantyTo: "2028-03-24", hsnSac: "90189099", gstRate: 5, batchNos: "Batch: SP426A04AL / SP426A05L / SP426A05Q" },
        { slNo: 2, name: "Cord for Mains Supply, STD (C020)", qty: 3, make: "Xcellance", model: "C020", serialNo: "—", warrantyFrom: "2026-03-25", warrantyTo: "2028-03-24", hsnSac: "90189099", gstRate: 5, batchNos: "" },
        { slNo: 3, name: "Footswitch, Single Paddle (B029)", qty: 3, make: "Xcellance", model: "B029", serialNo: "—", warrantyFrom: "2026-03-25", warrantyTo: "2028-03-24", hsnSac: "90189099", gstRate: 5, batchNos: "" },
      ],
      remarks: "Installed, Trained and machine working satisfactory",
      headOfDeptSignature: "Verified",
      doctorName: "Dr. S. Narayana",
      doctorDesignation: "Civil Surgeon",
      doctorDepartment: "Operation Theatre",
      doctorMobile: "9848011234",
      serviceEngineerName: "R. Kumar",
      serviceEngineerDesignation: "Service Engineer",
      serviceEngineerMobile: "9391003370",
      serviceCentreAddress: "M/s. Sri Srinivasa Agencies, Sanathnagar, Hyderabad",
      medSupCertifiedDate: "2026-03-26",
      certifiedBy: "Medical Superintendent, GGH Sangareddy",
    },
    uploadedDocs: [
      { name: "delivery_note_SSA_0506_25-26.pdf", size: "1.2 MB", type: "delivery_note" },
      { name: "inspection_photos_GGH_Sangareddy.zip", size: "8.4 MB", type: "photos" },
      { name: "Annexure6_InstallationCert_GGH.pdf", size: "0.8 MB", type: "annexure6" },
    ],
    createdBy: "T. Ramaiah (Biomedical Engineer)",
    status: "verified",
  },
  {
    id: 2,
    grnNumber: "GRN/HPC/2022/002",
    deliveryNoteNo: "GAMS/01650/22-23",
    poNumber: "216/418/HPC/EQU/Vemulawada/2022-23",
    poId: 2,
    vendorName: "M/s. Green Apple Medical Systems",
    vendorGstin: "36AADAG1234B1Z3",
    facilityName: "Area Hospital, Vemulawada",
    equipmentName: "Mammogram Compatible CR System — Fuji Film PCR Prima TM with DRY PIX Edge",
    orderedQty: 1,
    receivedQty: 1,
    damagedQty: 0,
    challanNo: "GAMS/01650/22-23",
    dispatchDocNo: "GAMS/DISP/1650/22-23",
    dispatchedThrough: "Company Vehicle",
    receivedDate: "2022-11-02",
    condition: "good",
    receivedInGoodCondition: true,
    discrepancyNotes: "",
    challanUploaded: true,
    photosUploaded: true,
    installationRequired: true,
    installationStatus: "completed",
    installationDate: "2022-11-21",
    installationCertUploaded: true,
    annexure6: {
      hospitalName: "AH, Vemulawada",
      department: "X-Ray",
      supplierName: "M/s. GREEN APPLE MEDICAL SYSTEMS",
      poNo: "216/418/TSMSIDC/EQU/Vemulawada/2022-23",
      poDate: "2022-10-15",
      invoiceNo: "GAMS/01533/22-23",
      invoiceDate: "2022-11-02",
      dcNo: "GAMS/01650/22-23",
      dcDate: "2022-11-02",
      installationDate: "2022-11-21",
      equipmentItems: [
        { slNo: 8, name: "Mammogram Compatible Computed Radiography", qty: 1, make: "Fuji Film", model: "PCR Prima TM with DRY PIX Edge", serialNo: "265F0021, 26130938", warrantyFrom: "2022-11-21", warrantyTo: "2025-11-30", hsnSac: "90221900", gstRate: 5, batchNos: "" },
      ],
      remarks: "Installed, Trained and machine working satisfactory",
      headOfDeptSignature: "KSICC/Y.",
      doctorName: "K. SANTHOSH CHARI",
      doctorDesignation: "C.A.S",
      doctorDepartment: "Paediatrics",
      doctorMobile: "7674060055",
      serviceEngineerName: "D. Anil",
      serviceEngineerDesignation: "Service Engineer",
      serviceEngineerMobile: "7995313331",
      serviceCentreAddress: "Green Apple Medical Systems, Santhnagar, Hyd.",
      medSupCertifiedDate: "2022-11-21",
      certifiedBy: "Medical Superintendent / Director, AH Vemulawada 505 302, Rajanna Sircilla Dist.",
    },
    uploadedDocs: [
      { name: "DC_GAMS_01650_22-23.pdf", size: "0.9 MB", type: "delivery_note" },
      { name: "Annexure6_InstCert_AH_Vemulawada.pdf", size: "1.1 MB", type: "annexure6" },
    ],
    createdBy: "Dr. R. Prasad",
    status: "verified",
  },
  {
    id: 3,
    grnNumber: "GRN/HPC/2026/003",
    deliveryNoteNo: "",
    poNumber: "IND/HPC/EQU/WDH/PO/2026/003",
    poId: 3,
    vendorName: "Nidek Medical India Pvt Ltd",
    vendorGstin: "29AABCN2345E1Z8",
    facilityName: "Warangal District Hospital",
    equipmentName: "Fully Automated Biochemistry Analyser",
    orderedQty: 1,
    receivedQty: 0,
    damagedQty: 0,
    challanNo: "",
    dispatchDocNo: "",
    dispatchedThrough: "",
    receivedDate: "",
    condition: "good",
    receivedInGoodCondition: false,
    discrepancyNotes: "",
    challanUploaded: false,
    photosUploaded: false,
    installationRequired: true,
    installationStatus: "not_started",
    installationDate: null,
    installationCertUploaded: false,
    annexure6: null,
    uploadedDocs: [],
    createdBy: "Dr. R. Prasad",
    status: "draft",
  },
];

const CONDITION_STYLE: Record<string, string> = {
  good: "bg-emerald-100 text-emerald-700 border-emerald-200",
  partial: "bg-amber-100 text-amber-700 border-amber-200",
  damaged: "bg-red-100 text-red-700 border-red-200",
};
const STATUS_STYLE: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600 border-gray-200",
  submitted: "bg-blue-100 text-blue-700 border-blue-200",
  verified: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

function fileSize(bytes: number): string {
  if (bytes > 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

function AnnexureView({ cert }: { cert: InstallationCertificate }) {
  return (
    <div className="space-y-4 text-sm">
      <div className="text-center pb-2 border-b">
        <p className="font-bold text-base">Annexure 6</p>
        <p className="font-semibold">Installation / Acceptance Certificate</p>
      </div>

      {/* Basic Info Table */}
      <div className="border rounded overflow-hidden text-xs">
        <table className="w-full">
          <tbody>
            <tr className="border-b">
              <td className="bg-muted/40 px-3 py-2 font-semibold w-8">1</td>
              <td className="bg-muted/40 px-3 py-2 font-semibold w-28">Hospital name:</td>
              <td className="px-3 py-2">{cert.hospitalName || "—"}</td>
              <td className="bg-muted/40 px-3 py-2 font-semibold w-8">5</td>
              <td className="bg-muted/40 px-3 py-2 font-semibold w-28">Invoice No/Date:</td>
              <td className="px-3 py-2">{cert.invoiceNo || "—"}{cert.invoiceDate ? ` / ${format(new Date(cert.invoiceDate), "dd.MM.yyyy")}` : ""}</td>
            </tr>
            <tr className="border-b">
              <td className="bg-muted/40 px-3 py-2 font-semibold">2</td>
              <td className="bg-muted/40 px-3 py-2 font-semibold">Department Name:</td>
              <td className="px-3 py-2">{cert.department || "—"}</td>
              <td className="bg-muted/40 px-3 py-2 font-semibold">6</td>
              <td className="bg-muted/40 px-3 py-2 font-semibold">DC No/Date:</td>
              <td className="px-3 py-2">{cert.dcNo || "—"}{cert.dcDate ? ` / ${format(new Date(cert.dcDate), "dd.MM.yyyy")}` : ""}</td>
            </tr>
            <tr className="border-b">
              <td className="bg-muted/40 px-3 py-2 font-semibold">3</td>
              <td className="bg-muted/40 px-3 py-2 font-semibold">Supplier Name:</td>
              <td className="px-3 py-2">{cert.supplierName || "—"}</td>
              <td className="bg-muted/40 px-3 py-2 font-semibold">7</td>
              <td className="bg-muted/40 px-3 py-2 font-semibold">Installation Date:</td>
              <td className="px-3 py-2 font-semibold text-primary">{cert.installationDate ? format(new Date(cert.installationDate), "dd.MM.yyyy") : "—"}</td>
            </tr>
            <tr>
              <td className="bg-muted/40 px-3 py-2 font-semibold">4</td>
              <td className="bg-muted/40 px-3 py-2 font-semibold">Po. No/Date:</td>
              <td className="px-3 py-2" colSpan={4}>{cert.poNo || "—"}{cert.poDate ? ` / ${format(new Date(cert.poDate), "dd.MM.yyyy")}` : ""}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Equipment Table */}
      <div className="border rounded overflow-hidden text-xs">
        <table className="w-full">
          <thead>
            <tr className="bg-muted/40 border-b">
              <th className="px-2 py-2 text-left font-semibold w-8">Sl. No.</th>
              <th className="px-2 py-2 text-left font-semibold">Name of Equipment</th>
              <th className="px-2 py-2 text-left font-semibold w-10">Qty</th>
              <th className="px-2 py-2 text-left font-semibold">Make</th>
              <th className="px-2 py-2 text-left font-semibold">Model</th>
              <th className="px-2 py-2 text-left font-semibold">Serial No.</th>
              <th className="px-2 py-2 text-center font-semibold" colSpan={2}>Warranty date</th>
            </tr>
            <tr className="bg-muted/20 border-b">
              <th colSpan={6}></th>
              <th className="px-2 py-1 text-center font-semibold border-l">From</th>
              <th className="px-2 py-1 text-center font-semibold border-l">To</th>
            </tr>
          </thead>
          <tbody>
            {cert.equipmentItems.map((item) => (
              <tr key={item.slNo} className="border-b last:border-0">
                <td className="px-2 py-2 text-center">{item.slNo}</td>
                <td className="px-2 py-2">
                  <div>{item.name}</div>
                  {item.batchNos && <div className="text-muted-foreground text-[10px]">{item.batchNos}</div>}
                  <div className="text-muted-foreground text-[10px]">HSN/SAC: {item.hsnSac} | GST: {item.gstRate}%</div>
                </td>
                <td className="px-2 py-2 text-center">{item.qty} Nos</td>
                <td className="px-2 py-2">{item.make}</td>
                <td className="px-2 py-2">{item.model}</td>
                <td className="px-2 py-2 font-mono text-[10px]">{item.serialNo}</td>
                <td className="px-2 py-2 text-center border-l">{item.warrantyFrom ? format(new Date(item.warrantyFrom), "dd/MM/yyyy") : "—"}</td>
                <td className="px-2 py-2 text-center border-l">{item.warrantyTo ? format(new Date(item.warrantyTo), "dd/MM/yyyy") : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Remarks */}
      <div className="border rounded p-3 text-xs">
        <p className="font-semibold mb-1">9. Remarks:</p>
        <p className="italic">{cert.remarks || "—"}</p>
      </div>

      {/* Signatures */}
      <div className="border rounded overflow-hidden text-xs">
        <table className="w-full">
          <tbody>
            <tr className="border-b">
              <td className="bg-muted/40 px-3 py-2 font-semibold w-8">10</td>
              <td className="bg-muted/40 px-3 py-2 font-semibold w-40">Signature of Head of Dept.</td>
              <td className="px-3 py-2 italic">{cert.headOfDeptSignature || "—"}</td>
              <td className="bg-muted/40 px-3 py-2 font-semibold w-8">15</td>
              <td className="bg-muted/40 px-3 py-2 font-semibold w-36">Signature of Service Engineer:</td>
              <td className="px-3 py-2 italic">{cert.serviceEngineerName ? `Sd/- ${cert.serviceEngineerName}` : "—"}</td>
            </tr>
            <tr className="border-b">
              <td className="bg-muted/40 px-3 py-2 font-semibold">11</td>
              <td className="bg-muted/40 px-3 py-2 font-semibold">Doctor Name:</td>
              <td className="px-3 py-2 font-semibold">{cert.doctorName || "—"}</td>
              <td className="bg-muted/40 px-3 py-2 font-semibold">16</td>
              <td className="bg-muted/40 px-3 py-2 font-semibold">Service Engineer Name:</td>
              <td className="px-3 py-2 font-semibold">{cert.serviceEngineerName || "—"}</td>
            </tr>
            <tr className="border-b">
              <td className="bg-muted/40 px-3 py-2 font-semibold">12</td>
              <td className="bg-muted/40 px-3 py-2 font-semibold">Designation:</td>
              <td className="px-3 py-2">{cert.doctorDesignation || "—"}</td>
              <td className="bg-muted/40 px-3 py-2 font-semibold">17</td>
              <td className="bg-muted/40 px-3 py-2 font-semibold">Designation:</td>
              <td className="px-3 py-2">{cert.serviceEngineerDesignation || "—"}</td>
            </tr>
            <tr className="border-b">
              <td className="bg-muted/40 px-3 py-2 font-semibold">13</td>
              <td className="bg-muted/40 px-3 py-2 font-semibold">Department:</td>
              <td className="px-3 py-2">{cert.doctorDepartment || "—"}</td>
              <td className="bg-muted/40 px-3 py-2 font-semibold">18</td>
              <td className="bg-muted/40 px-3 py-2 font-semibold">Mobile No.:</td>
              <td className="px-3 py-2">{cert.serviceEngineerMobile || "—"}</td>
            </tr>
            <tr>
              <td className="bg-muted/40 px-3 py-2 font-semibold">14</td>
              <td className="bg-muted/40 px-3 py-2 font-semibold">Mobile No:</td>
              <td className="px-3 py-2">{cert.doctorMobile || "—"}</td>
              <td className="bg-muted/40 px-3 py-2 font-semibold">19</td>
              <td className="bg-muted/40 px-3 py-2 font-semibold">Service centre address:</td>
              <td className="px-3 py-2 text-[10px]">{cert.serviceCentreAddress || "—"}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Medical Superintendent Certification */}
      <div className="border rounded p-3 text-xs space-y-1">
        <p className="font-semibold">Certified by the Medical Superintendent / Director / Principal:</p>
        <div className="flex gap-8 pt-2">
          <div>
            <p className="text-muted-foreground">Date and office seal:</p>
            <p className="font-medium mt-1">{cert.medSupCertifiedDate ? format(new Date(cert.medSupCertifiedDate), "dd.MM.yyyy") : "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Certified by:</p>
            <p className="font-medium mt-1">{cert.certifiedBy || "—"}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function AnnexureForm({ cert, onChange }: { cert: InstallationCertificate; onChange: (c: InstallationCertificate) => void }) {
  function set(key: keyof InstallationCertificate, value: string) {
    onChange({ ...cert, [key]: value });
  }
  function setItem(idx: number, key: keyof EquipmentItem, value: string | number) {
    const items = cert.equipmentItems.map((it, i) => i === idx ? { ...it, [key]: value } : it);
    onChange({ ...cert, equipmentItems: items });
  }
  function addItem() {
    const nextSl = cert.equipmentItems.length + 1;
    onChange({ ...cert, equipmentItems: [...cert.equipmentItems, { ...INIT_ANNEXURE6_ITEM, slNo: nextSl }] });
  }
  function removeItem(idx: number) {
    onChange({ ...cert, equipmentItems: cert.equipmentItems.filter((_, i) => i !== idx) });
  }

  return (
    <div className="space-y-4 text-sm">
      <div className="text-center pb-2 border-b">
        <p className="font-bold text-sm text-primary">Annexure 6 — Installation/Acceptance Certificate</p>
        <p className="text-xs text-muted-foreground">Fill all fields as per actual document</p>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="space-y-1"><Label className="text-xs">1. Hospital Name *</Label><Input className="h-8 text-xs" value={cert.hospitalName} onChange={e => set("hospitalName", e.target.value)} placeholder="GGH, Sangareddy" /></div>
        <div className="space-y-1"><Label className="text-xs">5. Invoice No / Date</Label><div className="flex gap-1"><Input className="h-8 text-xs" value={cert.invoiceNo} onChange={e => set("invoiceNo", e.target.value)} placeholder="INV/..." /><Input type="date" className="h-8 text-xs" value={cert.invoiceDate} onChange={e => set("invoiceDate", e.target.value)} /></div></div>
        <div className="space-y-1"><Label className="text-xs">2. Department Name *</Label><Input className="h-8 text-xs" value={cert.department} onChange={e => set("department", e.target.value)} placeholder="e.g. X-Ray, OT, Paediatrics" /></div>
        <div className="space-y-1"><Label className="text-xs">6. DC No / Date</Label><div className="flex gap-1"><Input className="h-8 text-xs" value={cert.dcNo} onChange={e => set("dcNo", e.target.value)} placeholder="DC/..." /><Input type="date" className="h-8 text-xs" value={cert.dcDate} onChange={e => set("dcDate", e.target.value)} /></div></div>
        <div className="space-y-1"><Label className="text-xs">3. Supplier Name *</Label><Input className="h-8 text-xs" value={cert.supplierName} onChange={e => set("supplierName", e.target.value)} placeholder="M/s. Vendor Name" /></div>
        <div className="space-y-1"><Label className="text-xs">7. Installation Date *</Label><Input type="date" className="h-8 text-xs" value={cert.installationDate} onChange={e => set("installationDate", e.target.value)} /></div>
        <div className="space-y-1 col-span-2"><Label className="text-xs">4. PO No / Date *</Label><div className="flex gap-1"><Input className="h-8 text-xs flex-1" value={cert.poNo} onChange={e => set("poNo", e.target.value)} placeholder="441A/591/HPC/EQU/2025-26" /><Input type="date" className="h-8 text-xs w-40" value={cert.poDate} onChange={e => set("poDate", e.target.value)} /></div></div>
      </div>

      {/* Equipment Items */}
      <div className="border rounded p-3 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold">Equipment Details (Sl. No. wise)</p>
          <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={addItem}><Plus className="h-3 w-3 mr-1" />Add Item</Button>
        </div>
        {cert.equipmentItems.map((item, idx) => (
          <div key={idx} className="border rounded p-2.5 space-y-2 bg-muted/20">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium">Sl. No. {item.slNo}</p>
              {cert.equipmentItems.length > 1 && <button onClick={() => removeItem(idx)} className="text-muted-foreground hover:text-destructive"><X className="h-3.5 w-3.5" /></button>}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1 col-span-2"><Label className="text-[10px]">Name of Equipment *</Label><Input className="h-7 text-xs" value={item.name} onChange={e => setItem(idx, "name", e.target.value)} placeholder="Equipment name" /></div>
              <div className="space-y-1"><Label className="text-[10px]">Qty (Nos) *</Label><Input type="number" className="h-7 text-xs" value={item.qty} onChange={e => setItem(idx, "qty", parseInt(e.target.value) || 1)} min={1} /></div>
              <div className="space-y-1"><Label className="text-[10px]">Make *</Label><Input className="h-7 text-xs" value={item.make} onChange={e => setItem(idx, "make", e.target.value)} placeholder="Manufacturer" /></div>
              <div className="space-y-1"><Label className="text-[10px]">Model *</Label><Input className="h-7 text-xs" value={item.model} onChange={e => setItem(idx, "model", e.target.value)} placeholder="Model name/number" /></div>
              <div className="space-y-1"><Label className="text-[10px]">Serial No. *</Label><Input className="h-7 text-xs" value={item.serialNo} onChange={e => setItem(idx, "serialNo", e.target.value)} placeholder="Serial/Batch No." /></div>
              <div className="space-y-1"><Label className="text-[10px]">HSN/SAC Code</Label><Input className="h-7 text-xs" value={item.hsnSac} onChange={e => setItem(idx, "hsnSac", e.target.value)} placeholder="e.g. 90189099" /></div>
              <div className="space-y-1"><Label className="text-[10px]">GST Rate (%)</Label><Input type="number" className="h-7 text-xs" value={item.gstRate} onChange={e => setItem(idx, "gstRate", parseFloat(e.target.value) || 0)} /></div>
              <div className="space-y-1"><Label className="text-[10px]">Warranty From *</Label><Input type="date" className="h-7 text-xs" value={item.warrantyFrom} onChange={e => setItem(idx, "warrantyFrom", e.target.value)} /></div>
              <div className="space-y-1"><Label className="text-[10px]">Warranty To *</Label><Input type="date" className="h-7 text-xs" value={item.warrantyTo} onChange={e => setItem(idx, "warrantyTo", e.target.value)} /></div>
            </div>
          </div>
        ))}
      </div>

      {/* Remarks */}
      <div className="space-y-1">
        <Label className="text-xs">9. Remarks</Label>
        <Textarea className="text-xs" rows={2} value={cert.remarks} onChange={e => set("remarks", e.target.value)} placeholder="Installed, Trained and machine working satisfactory" />
      </div>

      {/* Head of Dept */}
      <div className="border rounded p-3 space-y-2">
        <p className="text-xs font-semibold text-blue-700">Head of Department (Fields 10–14)</p>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1"><Label className="text-[10px]">10. Signature (Name)</Label><Input className="h-7 text-xs" value={cert.headOfDeptSignature} onChange={e => set("headOfDeptSignature", e.target.value)} placeholder="Initials / Sd/-" /></div>
          <div className="space-y-1"><Label className="text-[10px]">11. Doctor Name *</Label><Input className="h-7 text-xs" value={cert.doctorName} onChange={e => set("doctorName", e.target.value)} placeholder="Dr. Full Name" /></div>
          <div className="space-y-1"><Label className="text-[10px]">12. Designation</Label><Input className="h-7 text-xs" value={cert.doctorDesignation} onChange={e => set("doctorDesignation", e.target.value)} placeholder="e.g. Civil Surgeon" /></div>
          <div className="space-y-1"><Label className="text-[10px]">13. Department</Label><Input className="h-7 text-xs" value={cert.doctorDepartment} onChange={e => set("doctorDepartment", e.target.value)} placeholder="e.g. Paediatrics" /></div>
          <div className="space-y-1 col-span-2"><Label className="text-[10px]">14. Mobile No.</Label><Input className="h-7 text-xs" value={cert.doctorMobile} onChange={e => set("doctorMobile", e.target.value)} placeholder="10-digit mobile" /></div>
        </div>
      </div>

      {/* Service Engineer */}
      <div className="border rounded p-3 space-y-2">
        <p className="text-xs font-semibold text-emerald-700">Service Engineer (Fields 15–19)</p>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1"><Label className="text-[10px]">16. Service Engineer Name *</Label><Input className="h-7 text-xs" value={cert.serviceEngineerName} onChange={e => set("serviceEngineerName", e.target.value)} placeholder="Full name" /></div>
          <div className="space-y-1"><Label className="text-[10px]">17. Designation</Label><Input className="h-7 text-xs" value={cert.serviceEngineerDesignation} onChange={e => set("serviceEngineerDesignation", e.target.value)} placeholder="Service Engineer" /></div>
          <div className="space-y-1"><Label className="text-[10px]">18. Mobile No. *</Label><Input className="h-7 text-xs" value={cert.serviceEngineerMobile} onChange={e => set("serviceEngineerMobile", e.target.value)} placeholder="10-digit mobile" /></div>
          <div className="space-y-1"><Label className="text-[10px]">19. Service Centre Address</Label><Input className="h-7 text-xs" value={cert.serviceCentreAddress} onChange={e => set("serviceCentreAddress", e.target.value)} placeholder="Address" /></div>
        </div>
      </div>

      {/* Medical Superintendent */}
      <div className="border rounded p-3 space-y-2">
        <p className="text-xs font-semibold text-purple-700">Certified by Medical Superintendent / Director / Principal</p>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1"><Label className="text-[10px]">Date and Office Seal *</Label><Input type="date" className="h-7 text-xs" value={cert.medSupCertifiedDate} onChange={e => set("medSupCertifiedDate", e.target.value)} /></div>
          <div className="space-y-1"><Label className="text-[10px]">Certified By</Label><Input className="h-7 text-xs" value={cert.certifiedBy} onChange={e => set("certifiedBy", e.target.value)} placeholder="Medical Superintendent, Hospital Name" /></div>
        </div>
      </div>
    </div>
  );
}

interface DocUploadBoxProps {
  label: string; tag: string; fileRef: React.RefObject<HTMLInputElement | null>;
  accept: string; onUpload: (files: FileList | null) => void;
  docs: UploadedDoc[]; multiple?: boolean;
}
function DocUploadBox({ label, fileRef, accept, onUpload, docs, multiple }: DocUploadBoxProps) {
  return (
    <div className={`p-3 rounded-lg border ${docs.length > 0 ? "border-emerald-200 bg-emerald-50" : "border-dashed border-muted-foreground/30 bg-muted/10"}`}>
      <p className="text-xs font-semibold mb-1.5">{label}</p>
      {docs.map((d, i) => (
        <div key={i} className="text-[10px] text-emerald-700 truncate">{d.name}</div>
      ))}
      <label className="block mt-1.5 cursor-pointer">
        <div className="flex items-center gap-1.5 text-xs text-primary border border-primary/30 rounded px-2 py-1 hover:bg-primary/5 w-fit">
          <Upload className="h-3 w-3" />{docs.length > 0 ? "Change" : "Browse"}
        </div>
        <input ref={fileRef} type="file" accept={accept} multiple={multiple} className="hidden" onChange={e => onUpload(e.target.files)} />
      </label>
    </div>
  );
}

export default function GRN() {
  const { can } = useAuth();
  const [grns, setGrns] = useState<GRNRecord[]>(INIT_GRNS);
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState<GRNRecord | null>(null);
  const [annexureOpen, setAnnexureOpen] = useState(false);
  const [editingAnnexure, setEditingAnnexure] = useState(false);
  const [annexureForm, setAnnexureForm] = useState<InstallationCertificate>({ ...INIT_CERT });

  const [form, setForm] = useState({
    poNumber: "441A/591/HPC/EQU/2025-26",
    deliveryNoteNo: "",
    dispatchDocNo: "",
    dispatchedThrough: "",
    challanNo: "",
    receivedQty: "",
    receivedDate: "",
    condition: "good",
    receivedInGoodCondition: true,
    discrepancyNotes: "",
  });
  const [formDocs, setFormDocs] = useState<UploadedDoc[]>([]);
  const challanRef = useRef<HTMLInputElement>(null);
  const photosRef = useRef<HTMLInputElement>(null);
  const otherRef = useRef<HTMLInputElement>(null);

  const detailFileRefs = {
    delivery_note: useRef<HTMLInputElement>(null),
    photos: useRef<HTMLInputElement>(null),
    annexure6: useRef<HTMLInputElement>(null),
    qa: useRef<HTMLInputElement>(null),
  };

  const filtered = grns.filter(g =>
    !search || g.grnNumber.toLowerCase().includes(search.toLowerCase()) ||
    g.poNumber.toLowerCase().includes(search.toLowerCase()) ||
    g.facilityName.toLowerCase().includes(search.toLowerCase()) ||
    g.deliveryNoteNo.toLowerCase().includes(search.toLowerCase())
  );

  function handleFileAdd(files: FileList | null, tag: string) {
    if (!files) return;
    const newDocs: UploadedDoc[] = Array.from(files).map(f => ({ name: f.name, size: fileSize(f.size), type: tag }));
    setFormDocs(prev => [...prev, ...newDocs]);
  }

  const PO_MAP: Record<string, { vendor: string; facility: string; equipment: string; orderedQty: number }> = {
    "441A/591/HPC/EQU/2025-26": { vendor: "M/s. Sri Srinivasa Agencies", facility: "Govt. General Hospital, Sangareddy", equipment: "Surgical Diathermy / Cautery Machine (Sigma+)", orderedQty: 45 },
    "216/418/HPC/EQU/Vemulawada/2022-23": { vendor: "M/s. Green Apple Medical Systems", facility: "Area Hospital, Vemulawada", equipment: "Mammogram Compatible CR System (Fuji Film)", orderedQty: 1 },
    "IND/HPC/EQU/WDH/PO/2026/003": { vendor: "Nidek Medical India Pvt Ltd", facility: "Warangal District Hospital", equipment: "Fully Automated Biochemistry Analyser", orderedQty: 1 },
  };

  function handleCreate() {
    const meta = PO_MAP[form.poNumber] ?? { vendor: "—", facility: "—", equipment: "—", orderedQty: 0 };
    const newGrn: GRNRecord = {
      id: grns.length + 1,
      grnNumber: `GRN/HPC/2026/${String(grns.length + 1).padStart(3, "0")}`,
      deliveryNoteNo: form.deliveryNoteNo,
      poNumber: form.poNumber,
      poId: form.poNumber === "441A/591/HPC/EQU/2025-26" ? 1 : form.poNumber === "216/418/HPC/EQU/Vemulawada/2022-23" ? 2 : 3,
      vendorName: meta.vendor,
      vendorGstin: "—",
      facilityName: meta.facility,
      equipmentName: meta.equipment,
      orderedQty: meta.orderedQty,
      receivedQty: parseInt(form.receivedQty) || 0,
      damagedQty: 0,
      challanNo: form.challanNo || form.deliveryNoteNo,
      dispatchDocNo: form.dispatchDocNo,
      dispatchedThrough: form.dispatchedThrough,
      receivedDate: form.receivedDate,
      condition: form.condition as GRNRecord["condition"],
      receivedInGoodCondition: form.receivedInGoodCondition,
      discrepancyNotes: form.discrepancyNotes,
      challanUploaded: formDocs.some(d => d.type === "delivery_note"),
      photosUploaded: formDocs.some(d => d.type === "photos"),
      installationRequired: true,
      installationStatus: "not_started",
      installationDate: null,
      installationCertUploaded: false,
      annexure6: null,
      uploadedDocs: formDocs,
      createdBy: "Biomedical Engineer",
      status: "submitted",
    };
    setGrns(prev => [...prev, newGrn]);
    setAddOpen(false);
    setFormDocs([]);
    setForm({ poNumber: "441A/591/HPC/EQU/2025-26", deliveryNoteNo: "", dispatchDocNo: "", dispatchedThrough: "", challanNo: "", receivedQty: "", receivedDate: "", condition: "good", receivedInGoodCondition: true, discrepancyNotes: "" });
  }

  function openAnnexure(grn: GRNRecord) {
    setDetailOpen(grn);
    if (grn.annexure6) {
      setAnnexureForm(grn.annexure6);
      setEditingAnnexure(false);
    } else {
      setAnnexureForm({ ...INIT_CERT, hospitalName: grn.facilityName, supplierName: grn.vendorName, poNo: grn.poNumber, dcNo: grn.deliveryNoteNo });
      setEditingAnnexure(true);
    }
    setAnnexureOpen(true);
  }

  function saveAnnexure() {
    if (!detailOpen) return;
    setGrns(gs => gs.map(g => g.id === detailOpen.id
      ? { ...g, annexure6: annexureForm, installationStatus: "completed" as const, installationDate: annexureForm.installationDate || new Date().toISOString().split("T")[0], installationCertUploaded: true }
      : g
    ));
    setAnnexureOpen(false);
    setEditingAnnexure(false);
  }

  function uploadDetailDoc(id: number, files: FileList | null, docType: string, flags: Partial<{ challanUploaded: boolean; photosUploaded: boolean; installationCertUploaded: boolean }>) {
    if (!files || files.length === 0) return;
    const newDocs: UploadedDoc[] = Array.from(files).map(f => ({ name: f.name, size: fileSize(f.size), type: docType }));
    setGrns(gs => gs.map(g => g.id === id ? { ...g, ...flags, uploadedDocs: [...g.uploadedDocs, ...newDocs] } : g));
    setDetailOpen(prev => prev ? { ...prev, ...flags, uploadedDocs: [...prev.uploadedDocs, ...newDocs] } : prev);
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Goods Receipt Notes (GRN)</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Record delivery receipt, inspection and issue Annexure 6 Installation/Acceptance Certificate</p>
        </div>
        {can("grn.create") && (
          <Button size="sm" className="gap-2" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" />New GRN
          </Button>
        )}
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total GRNs", value: grns.length, color: "text-primary" },
          { label: "Verified", value: grns.filter(g => g.status === "verified").length, color: "text-emerald-600" },
          { label: "Installation Pending", value: grns.filter(g => g.installationStatus === "not_started").length, color: "text-amber-600" },
          { label: "Annexure 6 Issued", value: grns.filter(g => g.annexure6 !== null).length, color: "text-blue-600" },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search GRN, PO, delivery note, facility..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  {["GRN No.", "Delivery Note No.", "PO No.", "Equipment", "Facility", "Recd/Ordered", "Condition", "Installation", "Annexure 6", "Status", ""].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-muted-foreground px-3 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(g => (
                  <tr key={g.id} className="border-b hover:bg-muted/20">
                    <td className="px-3 py-3 font-mono text-xs font-semibold text-primary whitespace-nowrap">{g.grnNumber}</td>
                    <td className="px-3 py-3 font-mono text-xs text-amber-700">{g.deliveryNoteNo || "—"}</td>
                    <td className="px-3 py-3">
                      <Link href={`/purchase-orders/${g.poId}`}>
                        <span className="text-primary hover:underline text-xs font-mono">{g.poNumber}</span>
                      </Link>
                    </td>
                    <td className="px-3 py-3 max-w-[140px] truncate text-xs">{g.equipmentName}</td>
                    <td className="px-3 py-3 text-muted-foreground text-xs whitespace-nowrap">{g.facilityName}</td>
                    <td className="px-3 py-3 font-semibold text-xs">{g.receivedQty} / {g.orderedQty}</td>
                    <td className="px-3 py-3">
                      <Badge variant="outline" className={`text-xs border ${CONDITION_STYLE[g.condition]}`}>{g.condition}</Badge>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${g.installationStatus === "completed" ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-gray-100 text-gray-600 border-gray-200"}`}>
                        {g.installationStatus === "completed" ? "Done" : "Pending"}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      {g.annexure6 ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200">Issued</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Pending</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <Badge variant="outline" className={`text-xs border ${STATUS_STYLE[g.status]}`}>{g.status}</Badge>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setDetailOpen(g)}><Eye className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={() => openAnnexure(g)}>
                          <ClipboardList className="h-3.5 w-3.5 mr-1" />Cert
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && <div className="text-center py-12 text-muted-foreground">No GRN records found</div>}
          </div>
        </CardContent>
      </Card>

      {/* New GRN Dialog */}
      <Dialog open={addOpen} onOpenChange={v => { setAddOpen(v); if (!v) setFormDocs([]); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Create Goods Receipt Note</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Purchase Order *</Label>
              <Select value={form.poNumber} onValueChange={v => setForm({ ...form, poNumber: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="441A/591/HPC/EQU/2025-26">441A/591/HPC/EQU/2025-26 — Surgical Diathermy (Sri Srinivasa Agencies)</SelectItem>
                  <SelectItem value="216/418/HPC/EQU/Vemulawada/2022-23">216/418/HPC/EQU/Vemulawada/2022-23 — Mammogram CR (Green Apple Medical)</SelectItem>
                  <SelectItem value="IND/HPC/EQU/WDH/PO/2026/003">IND/HPC/EQU/WDH/PO/2026/003 — Biochemistry Analyser (Nidek Medical)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Delivery Note No. (Vendor DC) *</Label>
                <Input value={form.deliveryNoteNo} onChange={e => setForm({ ...form, deliveryNoteNo: e.target.value })} placeholder="SSA/0506/25-26" />
              </div>
              <div className="space-y-1.5">
                <Label>Dispatch Doc No.</Label>
                <Input value={form.dispatchDocNo} onChange={e => setForm({ ...form, dispatchDocNo: e.target.value })} placeholder="Dispatch document reference" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Dispatched Through</Label>
                <Input value={form.dispatchedThrough} onChange={e => setForm({ ...form, dispatchedThrough: e.target.value })} placeholder="Transport / courier name" />
              </div>
              <div className="space-y-1.5">
                <Label>Date of Receipt *</Label>
                <Input type="date" value={form.receivedDate} onChange={e => setForm({ ...form, receivedDate: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Quantity Received (Nos.) *</Label>
                <Input type="number" value={form.receivedQty} onChange={e => setForm({ ...form, receivedQty: e.target.value })} min={0} />
              </div>
              <div className="space-y-1.5">
                <Label>Condition on Arrival</Label>
                <Select value={form.condition} onValueChange={v => setForm({ ...form, condition: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="good">Good — No damage observed</SelectItem>
                    <SelectItem value="partial">Partial — Minor issues / short shipment</SelectItem>
                    <SelectItem value="damaged">Damaged — Major damage observed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg border border-emerald-200 bg-emerald-50">
              <input
                type="checkbox"
                id="recv_good"
                checked={form.receivedInGoodCondition}
                onChange={e => setForm({ ...form, receivedInGoodCondition: e.target.checked })}
                className="h-4 w-4 accent-emerald-600"
              />
              <label htmlFor="recv_good" className="text-sm font-medium text-emerald-800">
                Recd. in Good Condition (Facility Store stamp confirmation)
              </label>
            </div>

            {form.condition !== "good" && (
              <div className="space-y-1.5">
                <Label>Discrepancy / Damage Notes</Label>
                <Textarea value={form.discrepancyNotes} onChange={e => setForm({ ...form, discrepancyNotes: e.target.value })} rows={2} placeholder="Describe the issue in detail..." />
              </div>
            )}

            <div className="border-t pt-4">
              <p className="text-sm font-semibold mb-3 flex items-center gap-2"><Upload className="h-4 w-4" />Attach Documents</p>
              <div className="grid grid-cols-3 gap-3">
                <DocUploadBox label="Delivery Note / Challan *" tag="delivery_note" fileRef={challanRef} accept=".pdf,.jpg,.png" onUpload={files => handleFileAdd(files, "delivery_note")} docs={formDocs.filter(d => d.type === "delivery_note")} />
                <DocUploadBox label="Inspection Photos" tag="photos" fileRef={photosRef} accept=".jpg,.jpeg,.png,.zip" onUpload={files => handleFileAdd(files, "photos")} docs={formDocs.filter(d => d.type === "photos")} multiple />
                <DocUploadBox label="Other Documents" tag="other" fileRef={otherRef} accept=".pdf,.doc,.docx,.jpg,.png" onUpload={files => handleFileAdd(files, "other")} docs={formDocs.filter(d => d.type === "other")} multiple />
              </div>
            </div>

            <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 flex items-start gap-2">
              <ClipboardList className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
              <p className="text-xs text-blue-800">After submitting the GRN, use the <strong>Cert</strong> button to fill and issue the Annexure 6 Installation/Acceptance Certificate once installation is complete.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAddOpen(false); setFormDocs([]); }}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!form.deliveryNoteNo || !form.receivedQty || !form.receivedDate}>Submit GRN</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* GRN Detail Dialog */}
      <Dialog open={!!detailOpen && !annexureOpen} onOpenChange={() => setDetailOpen(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {detailOpen && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-primary" />{detailOpen.grnNumber}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-5 py-2">
                {/* Key Info */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {([
                    ["PO Number", detailOpen.poNumber],
                    ["Delivery Note No.", detailOpen.deliveryNoteNo || "—"],
                    ["Dispatch Doc No.", detailOpen.dispatchDocNo || "—"],
                    ["Dispatched Through", detailOpen.dispatchedThrough || "—"],
                    ["Vendor", detailOpen.vendorName],
                    ["Vendor GSTIN", detailOpen.vendorGstin],
                    ["Facility", detailOpen.facilityName],
                    ["Equipment", detailOpen.equipmentName],
                    ["Ordered Qty", `${detailOpen.orderedQty} Nos.`],
                    ["Received Qty", `${detailOpen.receivedQty} Nos.`],
                    ["Received Date", detailOpen.receivedDate ? format(new Date(detailOpen.receivedDate), "dd MMM yyyy") : "—"],
                    ["Recd. in Good Condition", detailOpen.receivedInGoodCondition ? "Yes ✓" : "No — See notes"],
                  ] as [string, string][]).map(([label, value]) => (
                    <div key={label} className="flex flex-col gap-0.5">
                      <span className="text-xs text-muted-foreground">{label}</span>
                      <span className="font-medium text-sm">{value}</span>
                    </div>
                  ))}
                </div>

                {/* Document Uploads */}
                <div className="border-t pt-4">
                  <p className="text-sm font-semibold mb-3 flex items-center gap-2"><Upload className="h-4 w-4" />Document Uploads</p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "Delivery Note / Challan", key: "delivery_note" as const, done: detailOpen.challanUploaded, accept: ".pdf,.jpg,.png", hint: "Vendor delivery challan / DC copy" },
                      { label: "Inspection Photos", key: "photos" as const, done: detailOpen.photosUploaded, accept: ".jpg,.jpeg,.png,.zip", hint: "Photos of equipment on arrival" },
                      { label: "Annexure 6 (Signed)", key: "annexure6" as const, done: detailOpen.installationCertUploaded, accept: ".pdf,.jpg,.png", hint: "Signed Installation/Acceptance Certificate" },
                      { label: "QA Compliance Report", key: "qa" as const, done: false, accept: ".pdf", hint: "Biomedical engineer QA checklist" },
                    ].map(doc => (
                      <div key={doc.key} className={`p-3 rounded-lg border ${doc.done ? "border-emerald-200 bg-emerald-50" : "border-dashed border-muted-foreground/30 bg-muted/10"}`}>
                        <div className="flex items-start justify-between mb-1.5">
                          <div>
                            <p className="text-xs font-semibold">{doc.label}</p>
                            <p className="text-[10px] text-muted-foreground">{doc.hint}</p>
                          </div>
                          {doc.done && <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />}
                        </div>
                        {doc.done ? (
                          <p className="text-[10px] text-emerald-700 font-medium">Uploaded</p>
                        ) : (
                          <label className="block cursor-pointer">
                            <div className="flex items-center gap-1.5 mt-1 text-xs text-primary border border-primary/30 rounded px-2 py-1 hover:bg-primary/5 w-fit">
                              <Upload className="h-3 w-3" />Upload File
                            </div>
                            <input
                              type="file" accept={doc.accept} className="hidden"
                              ref={detailFileRefs[doc.key]}
                              onChange={e => {
                                const f = {
                                  challanUploaded: doc.key === "delivery_note" || detailOpen.challanUploaded,
                                  photosUploaded: doc.key === "photos" || detailOpen.photosUploaded,
                                  installationCertUploaded: doc.key === "annexure6" || detailOpen.installationCertUploaded,
                                };
                                uploadDetailDoc(detailOpen.id, e.target.files, doc.key, f);
                              }}
                            />
                          </label>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Uploaded docs list */}
                {detailOpen.uploadedDocs.length > 0 && (
                  <div className="border-t pt-3">
                    <p className="text-xs font-semibold text-muted-foreground mb-2">Attached Files ({detailOpen.uploadedDocs.length})</p>
                    <div className="space-y-1">
                      {detailOpen.uploadedDocs.map((d, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs bg-muted/30 rounded px-2 py-1.5">
                          <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="flex-1 truncate">{d.name}</span>
                          <span className="text-muted-foreground">{d.size}</span>
                          <Badge variant="outline" className="text-[9px] py-0">{d.type}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Annexure 6 quick status */}
                <div className="border-t pt-4 flex items-center gap-3">
                  <Building2 className="h-5 w-5 text-blue-600" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold">Annexure 6 — Installation/Acceptance Certificate</p>
                    <p className="text-xs text-muted-foreground">{detailOpen.annexure6 ? `Issued — Installation: ${detailOpen.installationDate ? format(new Date(detailOpen.installationDate), "dd MMM yyyy") : ""}` : "Not yet issued"}</p>
                  </div>
                  <Button size="sm" variant={detailOpen.annexure6 ? "outline" : "default"} onClick={() => openAnnexure(detailOpen)}>
                    {detailOpen.annexure6 ? "View / Edit Cert" : "Issue Certificate"}
                  </Button>
                </div>

                {detailOpen.discrepancyNotes && (
                  <div className="border-t pt-4 flex gap-2 text-sm">
                    <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-amber-700">Discrepancy Notes</p>
                      <p className="text-muted-foreground text-xs mt-0.5">{detailOpen.discrepancyNotes}</p>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Annexure 6 Dialog */}
      <Dialog open={annexureOpen} onOpenChange={v => { if (!v) { setAnnexureOpen(false); setEditingAnnexure(false); } }}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-blue-600" />
              Annexure 6 — Installation/Acceptance Certificate
              {detailOpen && <span className="text-sm font-normal text-muted-foreground ml-2">{detailOpen.grnNumber}</span>}
            </DialogTitle>
          </DialogHeader>
          <div className="py-2">
            {editingAnnexure ? (
              <AnnexureForm cert={annexureForm} onChange={setAnnexureForm} />
            ) : (
              <AnnexureView cert={annexureForm} />
            )}
          </div>
          <DialogFooter className="gap-2">
            {!editingAnnexure && (
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => window.print()}>
                <Printer className="h-4 w-4" />Print
              </Button>
            )}
            <Button variant="outline" onClick={() => setEditingAnnexure(!editingAnnexure)}>
              {editingAnnexure ? "Preview" : "Edit Certificate"}
            </Button>
            {editingAnnexure && (
              <Button onClick={saveAnnexure} className="bg-blue-600 hover:bg-blue-700">
                Save & Issue Certificate
              </Button>
            )}
            <Button variant="outline" onClick={() => { setAnnexureOpen(false); setEditingAnnexure(false); }}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
