import { mockPurchaseOrders, mockDeliveries, mockIndents, mockInvoices } from "@/mocks/data";
import type { MockInvoice } from "@/mocks/data";
import { getSteps } from "@/lib/approvalWorkflow";
import type { PurchaseOrder, Delivery } from "@/lib/api-hooks";

export type { MockInvoice };

export type AuditEventType = "indent" | "approval" | "po" | "delivery" | "qa" | "invoice" | "grn";

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor: string;
  role: string;
  event: string;
  eventType: AuditEventType;
  entityRef?: string;
}

export interface IndentLifecycleData {
  purchaseOrders: PurchaseOrder[];
  deliveries: Delivery[];
  invoices: MockInvoice[];
  auditLog: AuditLogEntry[];
}

export function getIndentLifecycleData(
  indentId: string | number,
  currentIndent?: any,
  livePOs?: any[],
  liveDeliveries?: any[]
): IndentLifecycleData {
  const indent = currentIndent || mockIndents.find((i) => String(i.id) === String(indentId) || i.indentNumber === String(indentId));

  // 1. Resolve Purchase Orders
  let pos: any[] = [];
  if (livePOs && livePOs.length > 0) {
    pos = livePOs.filter((po) =>
      String(po.indentId) === String(indentId) ||
      (indent && String(po.indentId) === String(indent.id)) ||
      (indent && po.indentNumber === indent.indentNumber)
    );
  }
  if (pos.length === 0) {
    pos = mockPurchaseOrders.filter((po) =>
      String(po.indentId) === String(indentId) ||
      (indent && String(po.indentId) === String(indent.id)) ||
      (indent && po.indentNumber === indent.indentNumber)
    );
  }

  // Fallback synthetic PO if indent is approved or po_issued
  if (pos.length === 0 && indent && (indent.status === "po_issued" || indent.status === "delivered" || indent.status === "completed" || indent.status === "linked_to_rc")) {
    const estVal = indent.estimatedTotalValue || 500000;
    const vendorName = indent.rateContractVendor || "M/s. Sri Srinivasa Agencies";
    const poNum = `PO-${(indent.financialYear || "2025-26").replace("-", "")}-${String(indent.indentNumber || "001").slice(-4)}`;
    pos = [
      {
        id: `po-${indent.id}`,
        poNumber: poNum,
        indentId: indent.id,
        indentNumber: indent.indentNumber,
        rateContractId: indent.rateContractId || "rc-1",
        rcNumber: indent.rateContractNumber || "RC/HPC/EQU/2025-26/0001",
        vendorId: "v-1",
        vendorName,
        equipmentId: indent.equipmentId,
        equipmentName: indent.equipmentName || (indent.lineItems?.[0]?.equipmentName ?? "Medical Equipment"),
        quantity: indent.quantity || 1,
        unitPrice: Math.round(estVal / (indent.quantity || 1)),
        gstRate: 12,
        totalAmount: estVal,
        status: indent.status === "po_issued" ? "approved" : "delivered",
        deliveryAddress: indent.facilityName,
        createdAt: indent.updatedAt || indent.createdAt,
        updatedAt: indent.updatedAt || indent.createdAt,
      },
    ];
  }

  const poIds = new Set(pos.map((po) => String(po.id)));

  // 2. Resolve Deliveries
  let delivs: any[] = [];
  if (liveDeliveries && liveDeliveries.length > 0) {
    delivs = liveDeliveries.filter((d) => poIds.has(String(d.purchaseOrderId)));
  }
  if (delivs.length === 0) {
    delivs = mockDeliveries.filter((d) =>
      poIds.has(String(d.purchaseOrderId)) ||
      (pos.length > 0 && String(d.purchaseOrderId) === String(pos[0].id))
    );
  }

  // Fallback synthetic delivery if indent is delivered/completed
  if (delivs.length === 0 && pos.length > 0 && (indent?.status === "delivered" || indent?.status === "completed" || indent?.status === "po_issued")) {
    delivs = [
      {
        id: `del-${pos[0].id}`,
        deliveryTrackingId: `DEL-${pos[0].poNumber.replace(/[^a-zA-Z0-9]/g, "-")}`,
        qrCode: `DN-${pos[0].poNumber.slice(-4)}`,
        purchaseOrderId: pos[0].id,
        poNumber: pos[0].poNumber,
        vendorId: pos[0].vendorId,
        vendorName: pos[0].vendorName,
        facilityId: indent?.facilityId,
        facilityName: indent?.facilityName,
        equipmentName: pos[0].equipmentName,
        quantity: pos[0].quantity,
        status: "accepted",
        dispatchDate: indent?.updatedAt ? indent.updatedAt.split("T")[0] : "2026-03-08",
        deliveredDate: indent?.updatedAt ? indent.updatedAt.split("T")[0] : "2026-03-14",
        qaComplianceScore: 100,
        qaNotes: "Inspection completed and verified against official specifications. 100% compliant.",
        acceptanceCertificateIssued: true,
        documentsUploaded: true,
        createdAt: pos[0].createdAt,
        updatedAt: pos[0].updatedAt,
      },
    ];
  }

  // 3. Resolve Invoices
  let invoices = mockInvoices.filter((inv) =>
    poIds.has(String(inv.poId)) ||
    (pos.length > 0 && pos.some((p) => p.poNumber === inv.poNumber))
  );

  if (invoices.length === 0 && pos.length > 0) {
    invoices = [
      {
        id: 100 + Number(String(indentId).replace(/\D/g, "").slice(0, 3) || 1),
        invoiceNumber: `INV/${pos[0].vendorName.split(" ")[0]?.toUpperCase() || "VND"}/2025-26/044`,
        poId: pos[0].id,
        poNumber: pos[0].poNumber,
        vendorName: pos[0].vendorName,
        amount: pos[0].totalAmount || 500000,
        status: (indent?.status === "completed" || delivs.some((d) => d.acceptanceCertificateIssued)) ? "paid" : "pending",
        invoiceDate: pos[0].createdAt ? pos[0].createdAt.split("T")[0] : "2026-03-16",
        paidDate: (indent?.status === "completed" || delivs.some((d) => d.acceptanceCertificateIssued)) ? (pos[0].updatedAt ? pos[0].updatedAt.split("T")[0] : "2026-04-02") : null,
      },
    ];
  }

  // 4. Construct Comprehensive Audit Log
  const approvalSteps = (indent?.approvalSteps && indent.approvalSteps.length > 0)
    ? indent.approvalSteps
    : getSteps(indentId);

  const log: AuditLogEntry[] = [];

  if (indent) {
    log.push({
      id: `indent-created-${indent.id || indentId}`,
      timestamp: indent.createdAt,
      actor: indent.digitisedBy || "DEO Initiator",
      role: "Indent Initiator",
      event: `Indent ${indent.indentNumber} initiated & digitized — ${indent.equipmentName || "Requisition"} × ${indent.quantity || 1} for ${indent.facilityName}`,
      eventType: "indent",
      entityRef: indent.indentNumber,
    });
  }

  // Reviewer edit audit trail events
  if (indent?.editAuditTrail && Array.isArray(indent.editAuditTrail)) {
    indent.editAuditTrail.forEach((edit: any, idx: number) => {
      log.push({
        id: `edit-audit-${idx}`,
        timestamp: edit.correctedAt || edit.editedAt || indent.updatedAt,
        actor: edit.correctedBy || edit.editedBy || "Procurement Reviewer",
        role: "Verification Officer",
        event: `Data Verified & Corrected: ${edit.field} from "${edit.originalValue ?? "—"}" to "${edit.correctedValue ?? "—"}"`,
        eventType: "indent",
        entityRef: indent.indentNumber,
      });
    });
  }

  // Approval step events
  approvalSteps.forEach((step: any) => {
    if (step.actionedAt && step.status !== "pending" && step.status !== "skipped") {
      const eventLabel =
        step.status === "approved" ? "Approved" :
        step.status === "rejected" ? "Rejected" :
        step.status === "returned" ? "Returned for revision" : step.status;
      log.push({
        id: `approval-step-${indent?.id || indentId}-${step.stepNumber}`,
        timestamp: step.actionedAt,
        actor: step.assignedUserName,
        role: step.roleLabel,
        event: `Step ${step.stepNumber} (${step.roleLabel}) — ${eventLabel}${step.comments ? `: ${step.comments}` : ""}`,
        eventType: "approval",
        entityRef: `Step ${step.stepNumber}`,
      });
    }
  });

  // Rate contract / Tender events
  if (indent?.rateContractNumber || indent?.procurementMode === "rate_contract") {
    log.push({
      id: `rc-linked-${indent.id || indentId}`,
      timestamp: indent.updatedAt || indent.createdAt,
      actor: indent.approvedBy || "GM Equipment",
      role: "Procurement Wing",
      event: `Linked to Active Rate Contract: ${indent.rateContractNumber || "Standard RC Agreement"} (${indent.rateContractVendor || "Empanelled Vendor"})`,
      eventType: "po",
      entityRef: indent.rateContractNumber || "RC",
    });
  } else if (indent?.tenderNumber || indent?.status === "tender_initiated") {
    log.push({
      id: `tender-routed-${indent.id || indentId}`,
      timestamp: indent.updatedAt || indent.createdAt,
      actor: indent.approvedBy || "GM Equipment",
      role: "Tender Cell",
      event: `Routed to Open Tendering: Tender Ref ${indent.tenderNumber || "TND-2025-001"} under Rule BR-02`,
      eventType: "approval",
      entityRef: indent.tenderNumber || "Tender",
    });
  }

  pos.forEach((po) => {
    log.push({
      id: `po-created-${po.id}`,
      timestamp: po.createdAt,
      actor: po.approvedBy || "SO Equipment",
      role: "Finance & Sanction Wing",
      event: `Purchase Order ${po.poNumber} sanctioned & issued to ${po.vendorName} — ₹${(po.totalAmount || 0).toLocaleString("en-IN")}`,
      eventType: "po",
      entityRef: po.poNumber,
    });
  });

  delivs.forEach((d) => {
    if (d.dispatchDate) {
      log.push({
        id: `delivery-dispatched-${d.id}`,
        timestamp: d.dispatchDate + "T08:00:00Z",
        actor: d.vendorName,
        role: "Vendor Logistics",
        event: `Consignment dispatched by ${d.vendorName} — Note: ${d.deliveryTrackingId || d.qrCode}`,
        eventType: "delivery",
        entityRef: d.deliveryTrackingId || d.qrCode,
      });
    }
    if (d.deliveredDate) {
      log.push({
        id: `delivery-received-${d.id}`,
        timestamp: d.deliveredDate + "T12:00:00Z",
        actor: d.receivedBy || "Store Keeper",
        role: "Consignee Stores",
        event: `${d.quantity} unit${d.quantity !== 1 ? "s" : ""} received in good condition at ${d.facilityName}`,
        eventType: "delivery",
        entityRef: d.deliveryTrackingId || d.qrCode,
      });
    }
    if (d.qaComplianceScore != null) {
      log.push({
        id: `qa-scored-${d.id}`,
        timestamp: d.updatedAt,
        actor: d.qaCommitteeName ? d.qaCommitteeName.split(",")[0] : "Biomedical Engineer",
        role: "QA Committee",
        event: `Technical QA inspection completed — Score: ${d.qaComplianceScore}%, Decision: ${d.status === "accepted" ? "Accepted" : "QA Passed"}`,
        eventType: "qa",
        entityRef: d.deliveryTrackingId || d.qrCode,
      });
    }
    if (d.acceptanceCertificateIssued) {
      log.push({
        id: `grn-issued-${d.id}`,
        timestamp: d.updatedAt,
        actor: indent?.hodName || "Medical Superintendent",
        role: "Head of Institution",
        event: `Acceptance & Installation Certificate (Annexure 6) verified and signed by Consignee & OEM Engineer`,
        eventType: "grn",
        entityRef: d.deliveryTrackingId || d.qrCode,
      });
    }
  });

  invoices.forEach((inv) => {
    log.push({
      id: `invoice-${inv.id}`,
      timestamp: inv.invoiceDate + "T09:00:00Z",
      actor: inv.vendorName,
      role: "Vendor Billing",
      event: `Tax Invoice ${inv.invoiceNumber} submitted — ₹${inv.amount.toLocaleString("en-IN")}`,
      eventType: "invoice",
      entityRef: inv.invoiceNumber,
    });
    if (inv.paidDate) {
      log.push({
        id: `invoice-paid-${inv.id}`,
        timestamp: inv.paidDate + "T14:00:00Z",
        actor: "State Treasury / IFMIS",
        role: "Finance Wing",
        event: `Payment tranche released for Invoice ${inv.invoiceNumber} via Electronic Treasury Transfer`,
        eventType: "invoice",
        entityRef: inv.invoiceNumber,
      });
    }
  });

  log.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return {
    purchaseOrders: pos,
    deliveries: delivs,
    invoices,
    auditLog: log,
  };
}

export function daysBetween(a: string | null, b: string | null): number | null {
  if (!a || !b) return null;
  const diff = new Date(b).getTime() - new Date(a).getTime();
  return Math.round(diff / (1000 * 60 * 60 * 24));
}
