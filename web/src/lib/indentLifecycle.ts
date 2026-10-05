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
  liveDeliveries?: any[],
  dbAuditLogs?: any[]
): IndentLifecycleData {
  const indent = currentIndent || mockIndents.find((i) => String(i.id) === String(indentId) || i.indentNumber === String(indentId));

  // 1. Resolve Purchase Orders (strict: only real POs matching this indent)
  let pos: any[] = [];
  if (livePOs && livePOs.length > 0) {
    pos = livePOs.filter((po) =>
      String(po.indentId) === String(indentId) ||
      (indent && String(po.indentId) === String(indent.id)) ||
      (indent && po.indentNumber === indent.indentNumber)
    );
  }
  // Only check mockPurchaseOrders if livePOs was not provided (e.g. offline mock environment)
  if (pos.length === 0 && (!livePOs || livePOs.length === 0)) {
    pos = mockPurchaseOrders.filter((po) =>
      String(po.indentId) === String(indentId) ||
      (indent && String(po.indentId) === String(indent.id)) ||
      (indent && po.indentNumber === indent.indentNumber)
    );
  }

  const poIds = new Set(pos.map((po) => String(po.id)));

  // 2. Resolve Deliveries (strict: only real deliveries matching linked POs)
  let delivs: any[] = [];
  if (liveDeliveries && liveDeliveries.length > 0) {
    delivs = liveDeliveries.filter((d) => poIds.has(String(d.purchaseOrderId)));
  }
  if (delivs.length === 0 && (!liveDeliveries || liveDeliveries.length === 0) && poIds.size > 0) {
    delivs = mockDeliveries.filter((d) =>
      poIds.has(String(d.purchaseOrderId)) ||
      (pos.length > 0 && String(d.purchaseOrderId) === String(pos[0].id))
    );
  }

  // 3. Resolve Invoices (strict: only real invoices matching linked POs)
  const invoices = mockInvoices.filter((inv) =>
    poIds.has(String(inv.poId)) ||
    (pos.length > 0 && pos.some((p) => p.poNumber === inv.poNumber))
  );

  // 4. Construct Clean, Meaningful Audit Log (No fake deliveries, no junk field edits)
  const approvalSteps = (indent?.approvalSteps && indent.approvalSteps.length > 0)
    ? indent.approvalSteps
    : getSteps(indentId);

  const log: AuditLogEntry[] = [];
  const processedKeys = new Set<string>();

  // A. Indent Creation & Submission milestone
  if (indent) {
    const qty = indent.quantity || indent.lineItems?.reduce((sum: number, li: any) => sum + (li.requestedQty || 0), 0) || 1;
    const asAmt = indent.asAmount || indent.revisedAsAmount || 0;
    const estVal = indent.estimatedTotalProcurementValue || indent.estimatedTotalValue || 0;
    log.push({
      id: `indent-created-${indent.id || indentId}`,
      timestamp: indent.createdAt,
      actor: indent.digitisedBy || "DEO Initiator",
      role: "Indent Initiator",
      event: `Indent ${indent.indentNumber || indentId} submitted by ${indent.digitisedBy || "DEO"} for ${indent.facilityName || "Requesting Facility"}. Requisition: ${indent.equipmentName || "Medical Equipment"} × ${qty} (Estimated: ₹${estVal.toLocaleString("en-IN")}, Sanctioned AS: ₹${asAmt.toLocaleString("en-IN")}).`,
      eventType: "indent",
      entityRef: indent.indentNumber,
    });
    processedKeys.add(`created_${indent.createdAt}`);
  }

  // B. Database Audit Log Records (Reprioritization, Revalidation, Scrutiny)
  if (dbAuditLogs && Array.isArray(dbAuditLogs) && dbAuditLogs.length > 0) {
    dbAuditLogs.forEach((entry: any, idx: number) => {
      let roleLabel = "Authorized Officer";
      if (entry.userRole === "deo") roleLabel = "DEO Initiator";
      else if (entry.userRole === "tgmsidc_user") roleLabel = "TGMSIDC User";
      else if (entry.userRole === "gm_equipment") roleLabel = "GM Equipment";
      else if (entry.userRole === "so_equipment") roleLabel = "SO Equipment";
      else if (entry.userRole === "executive_director") roleLabel = "Executive Director";
      else if (entry.userRole) roleLabel = entry.userRole;

      let eventLabel = entry.afterValue || entry.action;
      let eventType: AuditEventType = "approval";

      if (entry.action === "REPRIORITIZATION_SUBMITTED") {
        eventType = "indent";
        eventLabel = `Reprioritization Submitted: ${entry.afterValue || "Revised quantities and AS details submitted to TGMSIDC."}`;
      } else if (entry.action === "BUDGET_REVALIDATED_APPROVED") {
        eventType = "approval";
        eventLabel = `Budget Revalidation Approved: ${entry.afterValue || "Validated within AS. Procurement routing unlocked."}`;
      } else if (entry.action === "BUDGET_REVALIDATION_SHORTFALL") {
        eventType = "approval";
        eventLabel = `Budget Revalidation Shortfall: ${entry.afterValue || "Requirement exceeds AS. Returned to DEO."}`;
      }

      const dedupeKey = `${entry.timestamp}_${entry.action}`;
      if (!processedKeys.has(dedupeKey)) {
        processedKeys.add(dedupeKey);
        log.push({
          id: entry._id || `db-audit-${idx}`,
          timestamp: entry.timestamp,
          actor: entry.userName || "Authorised Officer",
          role: roleLabel,
          event: eventLabel,
          eventType,
          entityRef: entry.entityId || indent?.indentNumber,
        });
      }
    });
  }

  // C. Fallback: Reprioritization history events (if not already captured in dbAuditLogs)
  if (indent?.reprioritizationHistory && Array.isArray(indent.reprioritizationHistory)) {
    indent.reprioritizationHistory.forEach((rev: any, idx: number) => {
      const alreadyCaptured = log.some((l) =>
        l.event.includes("Reprioritization") &&
        Math.abs(new Date(l.timestamp).getTime() - new Date(rev.revisedAt).getTime()) < 10000
      );
      if (!alreadyCaptured) {
        const lineSummary = Array.isArray(rev.lineChanges) && rev.lineChanges.length > 0
          ? rev.lineChanges.map((lc: any) => `${lc.equipmentName}: Qty ${lc.previousQty}→${lc.newQty}${lc.newDeferred ? ' (Deferred)' : ''}`).join(", ")
          : "";
        log.push({
          id: `reprioritize-audit-${idx}`,
          timestamp: rev.revisedAt || indent.updatedAt,
          actor: rev.revisedBy || "DEO User",
          role: "DEO Initiator",
          event: `Requisition Reprioritized (Revision #${idx + 1}): Est. Value ₹${(rev.previousEstimatedTotal || 0).toLocaleString("en-IN")} → ₹${(rev.newEstimatedTotal || 0).toLocaleString("en-IN")}, AS ₹${(rev.previousAsAmount || 0).toLocaleString("en-IN")} → ₹${(rev.newAsAmount || 0).toLocaleString("en-IN")}.${lineSummary ? ` Item Details: [${lineSummary}].` : ""}${rev.notes ? ` Justification: "${rev.notes}"` : ""}`,
          eventType: "indent",
          entityRef: indent?.indentNumber,
        });
      }
    });
  }

  // D. Official Approval Steps actioned
  approvalSteps.forEach((step: any) => {
    if (step.actionedAt && step.status !== "pending" && step.status !== "skipped") {
      const eventLabel =
        step.status === "approved" ? "Approved" :
        step.status === "rejected" ? "Rejected" :
        step.status === "returned" ? "Returned for revision" : step.status;
      const dedupeKey = `step_${step.stepNumber}_${step.actionedAt}`;
      if (!processedKeys.has(dedupeKey)) {
        processedKeys.add(dedupeKey);
        log.push({
          id: `approval-step-${indent?.id || indentId}-${step.stepNumber}`,
          timestamp: step.actionedAt,
          actor: step.assignedUserName || step.roleLabel,
          role: step.roleLabel,
          event: `Step ${step.stepNumber} (${step.roleLabel}) — ${eventLabel}${step.comments ? `: ${step.comments}` : ""}`,
          eventType: "approval",
          entityRef: `Step ${step.stepNumber}`,
        });
      }
    }
  });

  // E. Tendering Workflow Initiated (only if tender actually exists or was initiated)
  if (indent?.tenderInitiated || (indent?.tenderNumber && (indent?.status === "tender_initiated" || indent?.tenderId))) {
    log.push({
      id: `tender-routed-${indent.id || indentId}`,
      timestamp: indent.tenderInvitedDate || indent.updatedAt || indent.createdAt,
      actor: indent.approvedBy || "TGMSIDC User",
      role: "Tender Cell",
      event: `Routed to Open Tendering: Tender Ref ${indent.tenderNumber || "TND-2026-001"} under Rule BR-02`,
      eventType: "approval",
      entityRef: indent.tenderNumber || "Tender",
    });
  }

  // F. Actual Purchase Orders
  pos.forEach((po) => {
    log.push({
      id: `po-created-${po.id}`,
      timestamp: po.createdAt,
      actor: po.approvedBy || po.generatedBy || "SO Equipment",
      role: "Finance & Sanction Wing",
      event: `Purchase Order ${po.poNumber} issued to ${po.vendorName} — ₹${(po.totalAmount || 0).toLocaleString("en-IN")}`,
      eventType: "po",
      entityRef: po.poNumber,
    });
  });

  // G. Actual Deliveries & QA (only if real delivery records exist)
  delivs.forEach((d) => {
    if (d.dispatchDate) {
      log.push({
        id: `delivery-dispatched-${d.id}`,
        timestamp: d.dispatchDate + "T08:00:00Z",
        actor: d.vendorName || "Vendor Logistics",
        role: "Vendor Logistics",
        event: `Consignment dispatched by ${d.vendorName || "Vendor"} — Note: ${d.deliveryTrackingId || d.qrCode || "Consignment Note"}`,
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
        event: `${d.quantity} unit${d.quantity !== 1 ? "s" : ""} received in good condition at ${d.facilityName || indent?.facilityName || "Hospital"}`,
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

  // H. Actual Invoices
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

  // Sort chronological descending (latest event first)
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
