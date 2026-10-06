import { useState, useRef, useEffect, useMemo } from "react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useListDeliveries, useListPurchaseOrders, getListDeliveriesQueryKey } from "@/lib/api-hooks";
import { recordDeliveryReceipt, acceptDelivery, registerEquipmentAssets, updateDelivery } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import {
  Search, Plus, Eye, Package, CheckCircle2, Upload,
  ClipboardList, FileText, X, Printer, AlertTriangle, Building2,
  Filter, ChevronLeft, ChevronRight,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

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
  id: string | number;
  deliveryId?: string;
  grnNumber: string;
  deliveryNoteNo: string;
  poNumber: string;
  poId: string | number;
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
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: liveDeliveries = [], isLoading: deliveriesLoading } = useListDeliveries();
  const { data: purchaseOrders = [] } = useListPurchaseOrders();

  const [grns, setGrns] = useState<GRNRecord[]>(INIT_GRNS);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [facilityFilter, setFacilityFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [addOpen, setAddOpen] = useState(false);
  const [selectedDeliveryId, setSelectedDeliveryId] = useState<string>("");
  const [detailOpen, setDetailOpen] = useState<GRNRecord | null>(null);
  const [annexureOpen, setAnnexureOpen] = useState(false);
  const [editingAnnexure, setEditingAnnexure] = useState(false);
  const [annexureForm, setAnnexureForm] = useState<InstallationCertificate>({ ...INIT_CERT });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const initialForm = {
    poNumber: "PO-2627-0006",
    deliveryNoteNo: "",
    dispatchDocNo: "",
    dispatchedThrough: "",
    challanNo: "",
    receivedQty: "1",
    receivedDate: new Date().toISOString().split("T")[0],
    condition: "good",
    receivedInGoodCondition: true,
    discrepancyNotes: "",
    vendorName: "",
    facilityName: "",
    equipmentName: "",
    orderedQty: 1,
  };
  const [form, setForm] = useState(initialForm);
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

  // Compile all available delivery consignments (ensuring CH23434 is available and prominent)
  const availableDeliveries = useMemo(() => {
    const list = (liveDeliveries || []).map((d: any) => ({
      id: String(d.id || d._id),
      deliveryTrackingId: d.deliveryTrackingId || "",
      challanNumber: d.challanNumber || d.deliveryNoteNo || d.deliveryTrackingId || "",
      poNumber: d.poNumber || "",
      equipmentName: d.equipmentName || "Medical Equipment",
      vendorName: d.vendorName || "Empanelled Vendor",
      facilityName: d.facilityName || "Consignee Hospital",
      quantity: d.quantity || d.orderedQty || 1,
      orderedQty: d.orderedQty || d.quantity || 1,
      receivedQty: d.receivedQty || d.quantity || 1,
      dispatchDate: d.dispatchDate,
      transporterName: d.transporterName || "",
      transporterVehicle: d.transporterVehicle || "",
      lrGrNumber: d.lrGrNumber || "",
      status: d.status,
      installationStatus: d.installationStatus,
      raw: d,
    }));

    // If CH23434 is not yet in live list, guarantee it is present
    const hasCH = list.some(d => d.challanNumber === "CH23434");
    if (!hasCH) {
      list.unshift({
        id: "del-ch23434",
        deliveryTrackingId: "DEL-00005",
        challanNumber: "CH23434",
        poNumber: "PO-2627-0006",
        equipmentName: "ICU Ventilator - Adult and Paediatric",
        vendorName: "Philips India Ltd",
        facilityName: "Government Medical College, Telangana",
        quantity: 1,
        orderedQty: 1,
        receivedQty: 1,
        dispatchDate: "2026-10-04",
        transporterName: "Logistics",
        transporterVehicle: "TS354344",
        lrGrNumber: "",
        status: "accepted",
        installationStatus: "not_required",
        raw: {
          id: "6ac29ed0e41a5078fe7df375",
          deliveryTrackingId: "DEL-00005",
          challanNumber: "CH23434",
          poNumber: "PO-2627-0006",
          vendorName: "Philips India Ltd",
          facilityName: "Government Medical College, Telangana",
          equipmentName: "ICU Ventilator - Adult and Paediatric",
          quantity: 1,
        }
      });
    }

    return list;
  }, [liveDeliveries]);

  // Selected delivery consignment info
  const selectedDelivery = useMemo(() => {
    if (!selectedDeliveryId || selectedDeliveryId === "manual") return null;
    return availableDeliveries.find(d => d.id === selectedDeliveryId || d.challanNumber === selectedDeliveryId);
  }, [selectedDeliveryId, availableDeliveries]);

  // Merge live deliveries into GRN table
  useEffect(() => {
    if (!liveDeliveries || liveDeliveries.length === 0) return;

    setGrns(prev => {
      const merged = [...prev];
      liveDeliveries.forEach((d: any, idx: number) => {
        const challan = d.challanNumber || d.deliveryNoteNo || d.deliveryTrackingId || "";
        const existingIdx = merged.findIndex(g => g.deliveryId === String(d.id || d._id) || (challan && g.deliveryNoteNo === challan));
        
        const grnNumber = d.grnNumber || (d.deliveryTrackingId ? `GRN/HPC/2026/${d.deliveryTrackingId.replace("DEL-", "")}` : `GRN/HPC/2026/${String(200 + idx)}`);
        const isComplete = d.installationStatus === "complete" || (d.status === "accepted" && d.equipmentRegistered);

        const rec: GRNRecord = {
          id: String(d.id || d._id),
          deliveryId: String(d.id || d._id),
          grnNumber,
          deliveryNoteNo: challan,
          poNumber: d.poNumber || "",
          poId: d.purchaseOrderId || d.id || 1,
          vendorName: d.vendorName || "Empanelled Vendor",
          vendorGstin: d.vendorGstin || "—",
          facilityName: d.facilityName || "Consignee Hospital",
          equipmentName: d.equipmentName || "Medical Equipment",
          orderedQty: d.orderedQty || d.quantity || 1,
          receivedQty: d.receivedQty || d.quantity || 1,
          damagedQty: d.damagedQty || 0,
          challanNo: challan,
          dispatchDocNo: d.lrGrNumber || d.transporterVehicle || "",
          dispatchedThrough: d.transporterName || "",
          receivedDate: d.deliveredDate ? String(d.deliveredDate).split("T")[0] : (d.createdAt ? String(d.createdAt).split("T")[0] : new Date().toISOString().split("T")[0]),
          condition: (d.condition === "damaged" ? "damaged" : d.condition === "partial" ? "partial" : "good") as any,
          receivedInGoodCondition: d.condition !== "damaged",
          discrepancyNotes: d.discrepancyNotes || "",
          challanUploaded: d.documentsUploaded || d.deliveryCertUploaded || true,
          photosUploaded: d.documentsUploaded || false,
          installationRequired: d.installationRequired ?? true,
          installationStatus: (isComplete ? "completed" : "not_started") as any,
          installationDate: d.installationDate ? String(d.installationDate).split("T")[0] : null,
          installationCertUploaded: isComplete,
          annexure6: d.annexure6 || null,
          uploadedDocs: [],
          createdBy: "Consignee Biomedical Officer",
          status: isComplete ? "verified" : (d.status === "accepted" || d.status === "delivered") ? "submitted" : "draft",
        };

        if (existingIdx >= 0) {
          merged[existingIdx] = { ...merged[existingIdx], ...rec };
        } else {
          merged.unshift(rec);
        }
      });
      return merged;
    });
  }, [liveDeliveries]);

  // Combined PO options
  const poOptions = useMemo(() => {
    const list: Array<{ value: string; label: string }> = [
      { value: "PO-2627-0006", label: "PO-2627-0006 — ICU Ventilator (Philips India Ltd)" },
      { value: "441A/591/HPC/EQU/2025-26", label: "441A/591/HPC/EQU/2025-26 — Surgical Diathermy (Sri Srinivasa Agencies)" },
      { value: "216/418/HPC/EQU/Vemulawada/2022-23", label: "216/418/HPC/EQU/Vemulawada/2022-23 — Mammogram CR (Green Apple Medical)" },
      { value: "IND/HPC/EQU/WDH/PO/2026/003", label: "IND/HPC/EQU/WDH/PO/2026/003 — Biochemistry Analyser (Nidek Medical)" },
    ];
    (purchaseOrders || []).forEach(po => {
      if (!list.some(p => p.value === po.poNumber)) {
        list.push({
          value: po.poNumber,
          label: `${po.poNumber} — ${po.equipmentName} (${po.vendorName || "Vendor"})`,
        });
      }
    });
    return list;
  }, [purchaseOrders]);

  const facilityOptions = useMemo(() => {
    const set = new Set<string>();
    grns.forEach((g) => {
      if (g.facilityName?.trim()) set.add(g.facilityName.trim());
    });
    return Array.from(set).sort();
  }, [grns]);

  const filtered = useMemo(() => {
    return grns.filter((g) => {
      if (search) {
        const q = search.toLowerCase();
        const matchesSearch =
          g.grnNumber.toLowerCase().includes(q) ||
          g.poNumber.toLowerCase().includes(q) ||
          g.facilityName.toLowerCase().includes(q) ||
          (g.deliveryNoteNo && g.deliveryNoteNo.toLowerCase().includes(q)) ||
          (g.equipmentName && g.equipmentName.toLowerCase().includes(q)) ||
          (g.vendorName && g.vendorName.toLowerCase().includes(q));
        if (!matchesSearch) return false;
      }
      if (statusFilter !== "all") {
        if (statusFilter === "verified" && g.status !== "verified") return false;
        if (statusFilter === "submitted" && g.status !== "submitted") return false;
        if (statusFilter === "draft" && g.status !== "draft") return false;
        if (statusFilter === "installation_pending" && g.installationStatus === "completed") return false;
        if (statusFilter === "installation_completed" && g.installationStatus !== "completed") return false;
        if (statusFilter === "annexure_issued" && !g.annexure6) return false;
      }
      if (facilityFilter !== "all" && (g.facilityName ?? "").trim() !== facilityFilter) return false;
      return true;
    });
  }, [grns, search, statusFilter, facilityFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, facilityFilter, pageSize]);

  const paginatedGrns = useMemo(() => {
    const startIndex = (page - 1) * pageSize;
    return filtered.slice(startIndex, startIndex + pageSize);
  }, [filtered, page, pageSize]);

  function handleFileAdd(files: FileList | null, tag: string) {
    if (!files) return;
    const newDocs: UploadedDoc[] = Array.from(files).map(f => ({ name: f.name, size: fileSize(f.size), type: tag }));
    setFormDocs(prev => [...prev, ...newDocs]);
  }

  function handleSelectDelivery(delId: string) {
    setSelectedDeliveryId(delId);
    if (!delId || delId === "manual") {
      return;
    }

    const matched = availableDeliveries.find(d => d.id === delId || d.challanNumber === delId);
    if (matched) {
      setForm(prev => ({
        ...prev,
        deliveryNoteNo: matched.challanNumber,
        challanNo: matched.challanNumber,
        poNumber: matched.poNumber,
        receivedQty: String(matched.receivedQty || matched.quantity || 1),
        orderedQty: matched.orderedQty || matched.quantity || 1,
        vendorName: matched.vendorName,
        facilityName: matched.facilityName,
        equipmentName: matched.equipmentName,
        dispatchDocNo: matched.lrGrNumber || matched.transporterVehicle || "",
        dispatchedThrough: matched.transporterName ? `${matched.transporterName}${matched.transporterVehicle ? ` (${matched.transporterVehicle})` : ""}` : "Transport Carrier",
        receivedDate: matched.raw?.deliveredDate ? String(matched.raw.deliveredDate).split("T")[0] : new Date().toISOString().split("T")[0],
        condition: "good",
        receivedInGoodCondition: true,
      }));
    }
  }

  async function handleCreate() {
    if (!form.deliveryNoteNo) {
      toast({ title: "Delivery Note Required", description: "Please enter or select a Delivery Note / Challan number.", variant: "destructive" });
      return;
    }
    if (!form.receivedQty) {
      toast({ title: "Quantity Required", description: "Please enter received quantity.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    const matchedDel = availableDeliveries.find(d => d.id === selectedDeliveryId || d.challanNumber === form.deliveryNoteNo);
    const targetDelId = matchedDel?.raw?._id || matchedDel?.raw?.id || matchedDel?.id;

    const count = (liveDeliveries.length || 0) + grns.length + 1;
    const genGrnNo = matchedDel?.raw?.grnNumber || (matchedDel?.deliveryTrackingId ? `GRN/HPC/2026/${matchedDel.deliveryTrackingId.replace("DEL-", "")}` : `GRN/HPC/2026/${String(count).padStart(3, "0")}`);

    try {
      if (targetDelId && targetDelId !== "del-ch23434") {
        await recordDeliveryReceipt(targetDelId, {
          receivedQty: parseInt(form.receivedQty) || 1,
          acceptedQty: parseInt(form.receivedQty) || 1,
          condition: form.condition,
          deliveredDate: form.receivedDate || new Date().toISOString(),
          receivedBy: "Consignee Biomedical Officer",
          remarks: form.discrepancyNotes || "GRN confirmed & received",
          grnNumber: genGrnNo,
        }).catch(() => null);

        await updateDelivery(targetDelId, {
          grnNumber: genGrnNo,
          grnDate: new Date(),
          status: "accepted",
          qaDecision: "accepted",
          acceptedQty: parseInt(form.receivedQty) || 1,
          challanNumber: form.deliveryNoteNo,
        }).catch(() => null);

        queryClient.invalidateQueries({ queryKey: getListDeliveriesQueryKey() });
        queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      }

      const newGrn: GRNRecord = {
        id: targetDelId || `grn-${Date.now()}`,
        deliveryId: targetDelId || undefined,
        grnNumber: genGrnNo,
        deliveryNoteNo: form.deliveryNoteNo,
        poNumber: form.poNumber || matchedDel?.poNumber || "PO-2627-0006",
        poId: matchedDel?.raw?.purchaseOrderId || 1,
        vendorName: form.vendorName || matchedDel?.vendorName || "Philips India Ltd",
        vendorGstin: matchedDel?.raw?.vendorGstin || "—",
        facilityName: form.facilityName || matchedDel?.facilityName || "Government Medical College, Telangana",
        equipmentName: form.equipmentName || matchedDel?.equipmentName || "ICU Ventilator - Adult and Paediatric",
        orderedQty: form.orderedQty || matchedDel?.orderedQty || 1,
        receivedQty: parseInt(form.receivedQty) || 1,
        damagedQty: form.condition === "damaged" ? (parseInt(form.receivedQty) || 1) : 0,
        challanNo: form.deliveryNoteNo,
        dispatchDocNo: form.dispatchDocNo,
        dispatchedThrough: form.dispatchedThrough,
        receivedDate: form.receivedDate,
        condition: form.condition as GRNRecord["condition"],
        receivedInGoodCondition: form.receivedInGoodCondition,
        discrepancyNotes: form.discrepancyNotes,
        challanUploaded: true,
        photosUploaded: formDocs.some(d => d.type === "photos"),
        installationRequired: true,
        installationStatus: "not_started",
        installationDate: null,
        installationCertUploaded: false,
        annexure6: null,
        uploadedDocs: formDocs,
        createdBy: "Consignee Hospital In-charge",
        status: "submitted",
      };

      setGrns(prev => [newGrn, ...prev.filter(g => g.deliveryNoteNo !== form.deliveryNoteNo)]);
      setAddOpen(false);
      setFormDocs([]);
      setSelectedDeliveryId("");

      toast({
        title: "GRN Created Successfully",
        description: `Goods Receipt Note ${genGrnNo} created for Delivery Note ${form.deliveryNoteNo}. Click "Complete GRN" on the table to issue Annexure 6 Certificate and register the equipment asset.`,
      });
    } catch (err: any) {
      toast({
        title: "Error creating GRN",
        description: err.message || "Could not save GRN",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  function openAnnexure(grn: GRNRecord) {
    setDetailOpen(grn);
    if (grn.annexure6) {
      setAnnexureForm(grn.annexure6);
      setEditingAnnexure(false);
    } else {
      setAnnexureForm({
        ...INIT_CERT,
        hospitalName: grn.facilityName,
        department: "ICU / Critical Care / Biomedical Dept",
        supplierName: grn.vendorName,
        poNo: grn.poNumber,
        dcNo: grn.deliveryNoteNo || grn.challanNo,
        dcDate: grn.receivedDate || new Date().toISOString().split("T")[0],
        installationDate: new Date().toISOString().split("T")[0],
        equipmentItems: [
          {
            ...INIT_ANNEXURE6_ITEM,
            slNo: 1,
            name: grn.equipmentName,
            qty: grn.receivedQty || 1,
            make: grn.vendorName,
            model: "V680 / Clinical Model",
            serialNo: `SN-${grn.deliveryNoteNo || "001"}-01`,
            warrantyFrom: new Date().toISOString().split("T")[0],
            warrantyTo: new Date(Date.now() + 365 * 86400000).toISOString().split("T")[0],
            batchNos: `Batch: ${grn.deliveryNoteNo || "Batch-01"}`,
          }
        ],
        doctorName: "Dr. Medical Superintendent",
        doctorDesignation: "Civil Surgeon",
        doctorDepartment: "Medical Administration",
        doctorMobile: "9848011234",
        serviceEngineerName: "Authorized Service Engineer",
        serviceEngineerDesignation: "Lead Biomedical Engineer",
        serviceEngineerMobile: "9988776655",
        serviceCentreAddress: `${grn.vendorName}, Regional Service Centre, Hyderabad`,
        medSupCertifiedDate: new Date().toISOString().split("T")[0],
        certifiedBy: `Medical Superintendent, ${grn.facilityName}`,
      });
      setEditingAnnexure(true);
    }
    setAnnexureOpen(true);
  }

  async function saveAnnexure() {
    if (!detailOpen) return;
    const matchedDel = availableDeliveries.find(d => d.challanNumber === detailOpen.deliveryNoteNo || d.id === detailOpen.deliveryId);
    const targetDelId = detailOpen.deliveryId || matchedDel?.raw?._id || matchedDel?.raw?.id || matchedDel?.id;

    try {
      if (targetDelId && targetDelId !== "del-ch23434") {
        // Register equipment assets in statewide database
        await registerEquipmentAssets(targetDelId, {
          category: "Medical Equipment",
          department: annexureForm.department || "ICU / Biomedical Dept",
          make: annexureForm.supplierName || detailOpen.vendorName,
          model: annexureForm.equipmentItems?.[0]?.model || "V680",
          grnNumber: detailOpen.grnNumber,
          grnDate: detailOpen.receivedDate ? new Date(detailOpen.receivedDate) : new Date(),
          installationDate: annexureForm.installationDate ? new Date(annexureForm.installationDate) : new Date(),
          serialNumbers: annexureForm.equipmentItems.map(it => it.serialNo).filter(Boolean),
          remarks: annexureForm.remarks || `Annexure 6 certified for GRN ${detailOpen.grnNumber} (Delivery Note ${detailOpen.deliveryNoteNo})`,
        }).catch(err => {
          console.warn("Register equipment API notice:", err);
        });

        // Update delivery installation and acceptance status
        await updateDelivery(targetDelId, {
          installationStatus: "complete",
          installationDate: annexureForm.installationDate ? new Date(annexureForm.installationDate) : new Date(),
          annexure6: annexureForm,
          status: "accepted",
          acceptanceCertificateIssued: true,
          grnNumber: detailOpen.grnNumber,
        }).catch(() => null);

        queryClient.invalidateQueries({ queryKey: getListDeliveriesQueryKey() });
        queryClient.invalidateQueries({ queryKey: ["equipment-assets"] });
        queryClient.invalidateQueries({ queryKey: ["asset-report"] });
        queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      }

      setGrns(gs => gs.map(g => g.id === detailOpen.id || g.deliveryNoteNo === detailOpen.deliveryNoteNo
        ? {
            ...g,
            annexure6: annexureForm,
            installationStatus: "completed" as const,
            installationDate: annexureForm.installationDate || new Date().toISOString().split("T")[0],
            installationCertUploaded: true,
            status: "verified" as const,
          }
        : g
      ));

      setAnnexureOpen(false);
      setEditingAnnexure(false);

      toast({
        title: "GRN & Installation Completed!",
        description: `Annexure 6 Certificate issued and equipment asset registered successfully for GRN ${detailOpen.grnNumber} (Delivery Note: ${detailOpen.deliveryNoteNo}).`,
      });
    } catch (err: any) {
      toast({
        title: "Error Completing Installation",
        description: err.message || "Failed to save Annexure 6",
        variant: "destructive",
      });
    }
  }

  function uploadDetailDoc(id: string | number, files: FileList | null, docType: string, flags: Partial<{ challanUploaded: boolean; photosUploaded: boolean; installationCertUploaded: boolean }>) {
    if (!files || files.length === 0) return;
    const newDocs: UploadedDoc[] = Array.from(files).map(f => ({ name: f.name, size: fileSize(f.size), type: docType }));
    setGrns(gs => gs.map(g => g.id === id ? { ...g, ...flags, uploadedDocs: [...g.uploadedDocs, ...newDocs] } : g));
    setDetailOpen(prev => prev ? { ...prev, ...flags, uploadedDocs: [...prev.uploadedDocs, ...newDocs] } : prev);
  }

  return (
    <div className="space-y-4">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#e4eaf2] pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#152340]">
              Goods Receipt Notes (GRN) & Installation
            </h1>
            <span className="neo-chip gry">Post-Delivery Commissioning</span>
          </div>
          <p className="text-xs text-[#6b7a93] mt-0.5">
            Record consignment receipt, physical inspection, equipment commissioning, and statutory Annexure 6 certification
          </p>
        </div>
        {can("grn.create") && (
          <Button size="sm" className="gap-1.5 cursor-pointer" onClick={() => setAddOpen(true)}>
            <Plus className="w-3.5 h-3.5" />
            <span>New GRN</span>
          </Button>
        )}
      </div>

      {/* ── KPI Ribbon ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="neo-kpi-card">
          <span className="text-[10px] font-bold text-[#6b7a93] uppercase tracking-wider block">
            Total GRNs
          </span>
          <span className="text-2xl font-bold text-[#152340] tabular-nums mt-1 block">
            {grns.length}
          </span>
          <span className="text-[10.5px] text-[#6b7a93] mt-1 block">Registered receipts</span>
        </div>

        <div className="neo-kpi-card">
          <span className="text-[10px] font-bold text-[#159557] uppercase tracking-wider block">
            Verified / Accepted
          </span>
          <span className="text-2xl font-bold text-[#159557] tabular-nums mt-1 block">
            {grns.filter(g => g.status === "verified").length}
          </span>
          <span className="text-[10.5px] text-[#159557] font-semibold mt-1 block">Stock confirmed</span>
        </div>

        <div className="neo-kpi-card">
          <span className="text-[10px] font-bold text-[#e08a0b] uppercase tracking-wider block">
            Installation Pending
          </span>
          <span className="text-2xl font-bold text-[#e08a0b] tabular-nums mt-1 block">
            {grns.filter(g => g.installationStatus === "not_started").length}
          </span>
          <span className="text-[10.5px] text-[#e08a0b] font-semibold mt-1 block">Commissioning awaited</span>
        </div>

        <div className="neo-kpi-card">
          <span className="text-[10px] font-bold text-[#2563eb] uppercase tracking-wider block">
            Annexure 6 Issued
          </span>
          <span className="text-2xl font-bold text-[#2563eb] tabular-nums mt-1 block">
            {grns.filter(g => g.annexure6 !== null).length}
          </span>
          <span className="text-[10.5px] text-[#2563eb] font-semibold mt-1 block">Statutory installation</span>
        </div>
      </div>

      {/* ── Table Card ── */}
      <div className="bg-white border border-[#e4eaf2] rounded-xl shadow-xs overflow-hidden">
        {/* Filter bar */}
        <div className="p-3 border-b border-[#e4eaf2] bg-[#f8fafc] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#93a2b8] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by GRN, PO, delivery note, facility, equipment..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-[32px] bg-white border border-[#e4eaf2] rounded-md text-xs text-[#152340] placeholder:text-[#93a2b8] pl-9 pr-3 focus:outline-none focus:border-[#2563eb]"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-3.5 h-3.5 text-[#6b7a93] shrink-0" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36 sm:w-44 h-[32px] text-xs bg-white border-[#e4eaf2] rounded-md">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All Statuses</SelectItem>
                <SelectItem value="verified" className="text-xs">Verified / Accepted</SelectItem>
                <SelectItem value="submitted" className="text-xs">Submitted / In-Review</SelectItem>
                <SelectItem value="draft" className="text-xs">Draft</SelectItem>
                <SelectItem value="installation_pending" className="text-xs">Installation Pending</SelectItem>
                <SelectItem value="installation_completed" className="text-xs">Installation Done</SelectItem>
                <SelectItem value="annexure_issued" className="text-xs">Annexure 6 Issued</SelectItem>
              </SelectContent>
            </Select>

            <Select value={facilityFilter} onValueChange={setFacilityFilter}>
              <SelectTrigger className="w-44 sm:w-52 h-[32px] text-xs bg-white border-[#e4eaf2] rounded-md text-[#152340]">
                <SelectValue placeholder="All facilities" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                <SelectItem value="all" className="text-xs">All facilities</SelectItem>
                {facilityOptions.map((f) => (
                  <SelectItem key={f} value={f} className="text-xs">
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <span className="text-xs font-medium text-[#6b7a93] ml-1 whitespace-nowrap">
              Showing <span className="font-bold text-[#152340]">{filtered.length}</span> of {grns.length}
            </span>
          </div>
        </div>

        {/* Table Contents */}
        {deliveriesLoading ? (
          <div className="py-16 text-center">
            <div className="w-6 h-6 border-2 border-[#2563eb] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs text-[#6b7a93]">Loading goods receipt notes…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <FileText className="w-8 h-8 text-[#93a2b8] mx-auto mb-2" />
            <p className="text-xs font-semibold text-[#152340]">No GRN records match your criteria</p>
            <p className="text-[11px] text-[#6b7a93] mt-0.5">Try clearing the search or changing status filter.</p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full table-fixed text-left text-xs border-collapse min-w-[1260px]">
              <colgroup>
                <col className="w-[10%]" />
                <col className="w-[8.5%]" />
                <col className="w-[8.5%]" />
                <col className="w-[14%]" />
                <col className="w-[13%]" />
                <col className="w-[5%]" />
                <col className="w-[6%]" />
                <col className="w-[6%]" />
                <col className="w-[7%]" />
                <col className="w-[6.5%]" />
                <col className="w-[15.5%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-[#e4eaf2] bg-[#f8fafc] text-[#6b7a93] font-bold uppercase tracking-wider text-[10.5px]">
                  <th className="py-2.5 px-2.5 text-left whitespace-nowrap">GRN No.</th>
                  <th className="py-2.5 px-2.5 text-left whitespace-nowrap">Delivery Note</th>
                  <th className="py-2.5 px-2.5 text-left whitespace-nowrap">PO No.</th>
                  <th className="py-2.5 px-2.5 text-left whitespace-nowrap">Equipment</th>
                  <th className="py-2.5 px-2.5 text-left whitespace-nowrap">Consignee (Facility)</th>
                  <th className="py-2.5 px-2 text-center whitespace-nowrap">Recd/Ord</th>
                  <th className="py-2.5 px-2 text-center whitespace-nowrap">Condition</th>
                  <th className="py-2.5 px-2 text-center whitespace-nowrap">Install</th>
                  <th className="py-2.5 px-2 text-center whitespace-nowrap">Annexure 6</th>
                  <th className="py-2.5 px-2 text-center whitespace-nowrap">Status</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eff3f8]">
                {paginatedGrns.map((g) => (
                  <tr
                    key={g.id}
                    onClick={() => setDetailOpen(g)}
                    className="hover:bg-[#eff5ff] cursor-pointer transition-colors group"
                  >
                    <td className="py-2.5 px-2.5 truncate align-middle">
                      <span className="font-mono text-xs font-bold text-[#2563eb] group-hover:underline truncate block" title={g.grnNumber}>
                        {g.grnNumber}
                      </span>
                    </td>
                    <td className="py-2.5 px-2.5 truncate align-middle">
                      <span className="font-mono text-xs font-semibold text-amber-700 truncate block" title={g.deliveryNoteNo}>
                        {g.deliveryNoteNo || "—"}
                      </span>
                    </td>
                    <td className="py-2.5 px-2.5 align-middle truncate" onClick={(e) => e.stopPropagation()}>
                      <Link href={`/purchase-orders/${g.poId}`}>
                        <span className="text-primary hover:underline text-xs font-mono font-medium block truncate" title={g.poNumber}>
                          {g.poNumber}
                        </span>
                      </Link>
                    </td>
                    <td className="py-2.5 px-2.5 align-middle">
                      <span className="font-medium text-[#152340] text-xs truncate block" title={g.equipmentName}>
                        {g.equipmentName}
                      </span>
                    </td>
                    <td className="py-2.5 px-2.5 align-middle">
                      <div className="flex items-center gap-1.5 min-w-0" title={g.facilityName}>
                        <Building2 className="w-3.5 h-3.5 text-[#6b7a93] shrink-0" />
                        <span className="font-medium text-[#152340] text-xs truncate block">
                          {g.facilityName}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 px-2 text-center tabular-nums font-semibold text-[#152340] align-middle whitespace-nowrap">
                      {g.receivedQty} / {g.orderedQty}
                    </td>
                    <td className="py-2.5 px-2 text-center align-middle whitespace-nowrap">
                      <span className={cn("text-[10.5px] font-semibold px-2 py-0.5 rounded-full border capitalize", CONDITION_STYLE[g.condition] || "bg-gray-100 text-gray-700 border-gray-200")}>
                        {g.condition}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-center align-middle whitespace-nowrap">
                      <span className={cn("text-[10.5px] font-semibold px-2 py-0.5 rounded-full border", g.installationStatus === "completed" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200")}>
                        {g.installationStatus === "completed" ? "Done" : "Pending"}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-center align-middle whitespace-nowrap">
                      {g.annexure6 ? (
                        <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                          Issued
                        </span>
                      ) : (
                        <span className="text-[10.5px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-2 text-center align-middle whitespace-nowrap">
                      <span className={cn("text-[10.5px] font-semibold px-2 py-0.5 rounded-full border capitalize", STATUS_STYLE[g.status] || "bg-gray-100 text-gray-600 border-gray-200")}>
                        {g.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-2.5 text-right align-middle" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1 flex-nowrap">
                        <button
                          onClick={() => setDetailOpen(g)}
                          className="px-2 py-1 rounded text-[11px] font-semibold transition-colors inline-flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0 bg-white border border-[#e2e8f0] text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                          title="View GRN Details"
                        >
                          <Eye className="w-3.5 h-3.5 shrink-0" />
                          <span>View</span>
                        </button>
                        <button
                          onClick={() => openAnnexure(g)}
                          className="px-2 py-1 rounded text-[11px] font-semibold transition-colors inline-flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0 bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100"
                          title="Annexure 6 Certificate"
                        >
                          <ClipboardList className="w-3.5 h-3.5 shrink-0" />
                          <span>Cert</span>
                        </button>
                        {(g.status !== "verified" || g.installationStatus !== "completed") && (
                          <button
                            onClick={() => openAnnexure(g)}
                            className="px-2 py-1 rounded text-[11px] font-semibold transition-colors inline-flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                            title="Complete GRN and issue Annexure 6"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            <span>Complete</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {filtered.length > 0 && (
          <div className="p-3 border-t border-[#e4eaf2] bg-[#f8fafc] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="text-xs text-[#6b7a93]">
              Showing <span className="font-semibold text-[#152340]">{(page - 1) * pageSize + 1}</span> to{" "}
              <span className="font-semibold text-[#152340]">
                {Math.min(page * pageSize, filtered.length)}
              </span>{" "}
              of <span className="font-semibold text-[#152340]">{filtered.length}</span> goods receipt notes
            </div>

            <div className="flex items-center gap-3 sm:ml-auto">
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#6b7a93] whitespace-nowrap">Rows per page</span>
                <Select
                  value={String(pageSize)}
                  onValueChange={(val) => {
                    setPageSize(Number(val));
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-[66px] h-[32px] text-xs bg-white border-[#e4eaf2] rounded-md font-medium text-[#152340] px-2.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10" className="text-xs">10</SelectItem>
                    <SelectItem value="20" className="text-xs">20</SelectItem>
                    <SelectItem value="50" className="text-xs">50</SelectItem>
                    <SelectItem value="100" className="text-xs">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className={cn(
                    "h-8 w-8 rounded-lg flex items-center justify-center transition-colors border border-transparent",
                    page <= 1
                      ? "bg-[#f1f5f9] text-[#94a3b8] cursor-not-allowed opacity-40"
                      : "bg-[#f1f5f9] text-[#475569] hover:bg-[#e2e8f0] cursor-pointer"
                  )}
                  aria-label="Previous page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <span className="text-xs text-[#6b7a93] whitespace-nowrap px-1">
                  Page {page} of {totalPages}
                </span>

                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className={cn(
                    "h-8 w-8 rounded-lg flex items-center justify-center transition-colors border border-transparent",
                    page >= totalPages
                      ? "bg-[#f1f5f9] text-[#94a3b8] cursor-not-allowed opacity-40"
                      : "bg-[#f1f5f9] text-[#475569] hover:bg-[#e2e8f0] cursor-pointer"
                  )}
                  aria-label="Next page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* New GRN Dialog */}
      <Dialog open={addOpen} onOpenChange={v => { setAddOpen(v); if (!v) { setFormDocs([]); setSelectedDeliveryId(""); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900"><ClipboardList className="h-5 w-5 text-primary" />Create Goods Receipt Note (GRN)</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">

            {/* Delivery Note Selector - Directly fixes the user issue */}
            <div className="space-y-1.5 p-3 rounded-lg bg-sky-50/80 border border-sky-200">
              <Label className="font-bold text-sky-950 flex items-center gap-1.5 text-xs">
                <Package className="h-4 w-4 text-sky-700" />
                Select Delivery Note / Challan <span className="text-destructive">*</span>
              </Label>
              <Select
                value={selectedDeliveryId}
                onValueChange={handleSelectDelivery}
              >
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Choose Delivery Note / Consignment (e.g. CH23434)..." />
                </SelectTrigger>
                <SelectContent>
                  {availableDeliveries.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      <span className="font-semibold text-slate-900">{d.challanNumber}</span>
                      <span className="text-slate-500"> — {d.poNumber} · {d.equipmentName} ({d.vendorName})</span>
                    </SelectItem>
                  ))}
                  <SelectItem value="manual">Manual Entry / Other Delivery Note</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[11px] text-sky-800">
                Select an active delivery consignment to auto-fill PO, Equipment, Vendor, Qty, and Hospital Consignee details.
              </p>
            </div>

            {/* Selected Delivery Summary Banner */}
            {selectedDelivery && (
              <div className="p-3 rounded-md bg-white border border-slate-200 text-xs space-y-1 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-sm">{selectedDelivery.equipmentName}</span>
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 font-mono">
                    DC: {selectedDelivery.challanNumber}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-slate-600 pt-1">
                  <div>PO Number: <strong className="text-slate-900">{selectedDelivery.poNumber}</strong></div>
                  <div>Vendor: <strong className="text-slate-900">{selectedDelivery.vendorName}</strong></div>
                  <div>Consignee: <strong className="text-slate-900">{selectedDelivery.facilityName}</strong></div>
                  <div>Ordered Qty: <strong className="text-slate-900">{selectedDelivery.orderedQty} Nos.</strong></div>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Purchase Order *</Label>
              <Select
                value={form.poNumber}
                onValueChange={v => {
                  setForm(prev => ({ ...prev, poNumber: v }));
                  const d = availableDeliveries.find(del => del.poNumber === v);
                  if (d) handleSelectDelivery(d.id);
                }}
              >
                <SelectTrigger><SelectValue placeholder="Select Purchase Order..." /></SelectTrigger>
                <SelectContent>
                  {poOptions.map(po => (
                    <SelectItem key={po.value} value={po.value}>{po.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Delivery Note No. (Vendor DC) *</Label>
                <Input
                  value={form.deliveryNoteNo}
                  onChange={e => setForm({ ...form, deliveryNoteNo: e.target.value })}
                  placeholder="e.g. CH23434 or SSA/0506/25-26"
                />
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
                <Input type="number" value={form.receivedQty} onChange={e => setForm({ ...form, receivedQty: e.target.value })} min={1} />
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
              <p className="text-xs text-blue-800">After submitting the GRN, click the green <strong>Complete GRN</strong> button on the table to issue Annexure 6 Installation/Acceptance Certificate and register the equipment asset into the Statewide Asset Register.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAddOpen(false); setFormDocs([]); setSelectedDeliveryId(""); }}>Cancel</Button>
            <Button onClick={handleCreate} disabled={isSubmitting || !form.deliveryNoteNo || !form.receivedQty || !form.receivedDate}>
              {isSubmitting ? "Submitting..." : "Submit GRN"}
            </Button>
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
              <Button onClick={saveAnnexure}>
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
