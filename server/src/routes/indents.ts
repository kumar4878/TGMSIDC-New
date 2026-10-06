import { Router } from "express";
import mongoose from "mongoose";
import { Indent } from "../models/Indent.js";
import { Institution } from "../models/Institution.js";
import { Equipment } from "../models/Equipment.js";
import { Notification } from "../models/Notification.js";
import { User } from "../models/User.js";
import { RateContract } from "../models/RateContract.js";
import { Tender } from "../models/Tender.js";
import { PurchaseOrder } from "../models/PurchaseOrder.js";
import { Delivery } from "../models/Delivery.js";
import { Vendor } from "../models/Vendor.js";
import { AuditLog } from "../models/AuditLog.js";
import { notifyPOStatusChange, syncPOPaymentToIndent } from "./purchase-orders.js";

const router = Router();

/** Dispatch notifications via in-app, SMS simulator, and Email simulator */
async function notifyIndentStatusChange(indent: any, action: string, actorName?: string) {
  const notifications: any[] = [];
  const actionLabel = action === "step_approved" ? "Approval Step Completed" : action.toUpperCase();
  const title = `Indent ${indent.indentNumber} — ${actionLabel}`;
  const message = `Indent ${indent.indentNumber} for ${indent.facilityName} has been ${action.replace("_", " ")}${actorName ? ` by ${actorName}` : ""}.`;

  /* Find recipients */
  const recipients: Array<{ userId: string; role?: string; name?: string }> = [];

  /* Creator */
  recipients.push({
    userId: indent.createdByUserId || indent.digitisedBy || "initiator",
    role: "deo",
    name: indent.digitisedBy || "DEO Initiator",
  });

  /* Next approver if pending */
  if (["pending_approval", "pending_review"].includes(indent.status)) {
    const nextStep = (indent.approvalSteps ?? []).find((s: any) => s.status === "pending");
    if (nextStep?.assignedUserId) {
      recipients.push({ userId: nextStep.assignedUserId, role: nextStep.requiredRole, name: nextStep.assignedUserName });
    }
  } else if (["approved", "linked_to_rc"].includes(indent.status)) {
    recipients.push({ userId: "so_equipment", role: "so_equipment", name: "SO Equipment" });
  }

  for (const r of recipients) {
    const userDoc = await User.findOne({ $or: [{ username: r.userId }, { role: r.role }] }).catch(() => null);
    const email = userDoc?.email || `${r.userId}@tgmsidc.telangana.gov.in`;
    const phone = userDoc?.phone || "+91-9876543210";
    const recipientName = userDoc?.fullName || r.name || r.userId;

    /* Simulated SMS Gateway */
    console.log(`\n========================================`);
    console.log(`[SMS GATEWAY] Sent to: ${phone} (${recipientName})`);
    console.log(`Message: TGMSIDC Alert: ${message} (Status: ${indent.status})`);
    console.log(`[EMAIL GATEWAY] Sent to: ${email}`);
    console.log(`Subject: [TGMSIDC] ${title}`);
    console.log(`Body: Dear ${recipientName},\n\n${message}\nCurrent Status: ${indent.status}\nTotal Value: ₹${(indent.estimatedTotalValue || 0).toLocaleString("en-IN")}\n\nTGMSIDC Procurement Portal`);
    console.log(`========================================\n`);

    notifications.push({
      type: action === "rejected" ? "indent_rejected" : "indent_status",
      title,
      message,
      userId: r.userId,
      entityType: "indent",
      entityId: indent._id.toString(),
      priority: action === "rejected" ? "high" : "normal",
    });
  }

  if (notifications.length > 0) {
    try {
      await Notification.insertMany(notifications);
    } catch (err: any) {
      console.error("[NOTIFICATION ERROR]", err?.message || err);
    }
  }
}

function padNum(n: number, len = 4) {
  return String(n).padStart(len, "0");
}

async function findIndentDoc(id: string) {
  if (!id) return null;
  if (mongoose.Types.ObjectId.isValid(id)) {
    const found = await Indent.findById(id).catch(() => null);
    if (found) return found;
  }
  return await Indent.findOne({
    $or: [{ indentNumber: id }, { indentRefNumber: id }]
  }).catch(() => null);
}

async function formatIndent(r: any) {
  let facility = null;
  if (r.facilityId) {
    if (mongoose.Types.ObjectId.isValid(r.facilityId)) {
      facility = await Institution.findById(r.facilityId).catch(() => null);
    }
    if (!facility) {
      facility = await Institution.findOne({
        $or: [{ dmeInstitutionId: r.facilityId }, { institutionCode: r.facilityId }]
      }).catch(() => null);
    }
  }

  let equipmentName = r.equipmentName || "Multiple Items";
  if (r.equipmentId) {
    let eq = null;
    if (mongoose.Types.ObjectId.isValid(r.equipmentId)) {
      eq = await Equipment.findById(r.equipmentId).catch(() => null);
    }
    if (!eq) {
      eq = await Equipment.findOne({
        $or: [{ equipmentCode: r.equipmentId }, { name: r.equipmentId }]
      }).catch(() => null);
    }
    if (eq) equipmentName = eq.name;
  } else if (r.lineItems?.length === 1) {
    equipmentName = r.lineItems[0].equipmentName || "Unknown";
  } else if (r.lineItems?.length > 1) {
    equipmentName = `${r.lineItems.length} items`;
  }

  // Fetch linked POs for this indent to ensure payment details and statutory 2-tranches are always accurate
  const linkedIndentPOs = await PurchaseOrder.find({
    $or: [
      { indentId: r._id },
      { indentNumber: r.indentNumber },
      ...(r.purchaseOrderId ? [{ _id: r.purchaseOrderId }] : []),
      ...((r.lineItems ?? []).filter((l: any) => l.poNumber).map((l: any) => ({ poNumber: l.poNumber }))),
      ...((r.lineItems ?? []).filter((l: any) => l.poId).map((l: any) => ({ _id: l.poId }))),
    ],
  }).catch(() => []);

  // Enrich each line item with RC coverage, tendering requirement, and payment status
  const enrichedLineItems = await Promise.all((r.lineItems ?? []).map(async (li: any) => {
    const liObj = typeof li.toObject === "function" ? li.toObject() : { ...li };
    let itemRC = null;

    const eqIdStr = li.equipmentId ? String(li.equipmentId) : null;
    const eqIdObj = eqIdStr && mongoose.Types.ObjectId.isValid(eqIdStr) ? new mongoose.Types.ObjectId(eqIdStr) : null;

    const matchConditions: any[] = [];
    if (eqIdStr) matchConditions.push({ equipmentId: eqIdStr });
    if (eqIdObj) matchConditions.push({ equipmentId: eqIdObj });
    if (li.equipmentCode) matchConditions.push({ equipmentCode: li.equipmentCode });
    if (li.equipmentName) matchConditions.push({ equipmentName: li.equipmentName });

    let activeRCs: any[] = [];
    if (matchConditions.length > 0) {
      activeRCs = await RateContract.find({
        $or: matchConditions,
        status: "active",
        endDate: { $gte: new Date() },
      }).catch(() => []);

      if (activeRCs.length > 0) {
        itemRC = (liObj.rateContractId && activeRCs.find((c: any) => c._id.toString() === liObj.rateContractId.toString())) || activeRCs[0];
      } else {
        itemRC = await RateContract.findOne({
          $or: matchConditions,
        }).sort({ endDate: -1 }).catch(() => null);
      }
    }

    const hasActiveRC = !!(itemRC && itemRC.status === "active" && (!itemRC.endDate || new Date(itemRC.endDate) >= new Date()));
    const isExpiredRC = !!(itemRC && (itemRC.status === "expired" || (itemRC.endDate && new Date(itemRC.endDate) < new Date())));

    let computedLineStatus = liObj.lineStatus;
    if (!computedLineStatus || computedLineStatus === "draft") {
      if (liObj.poId) {
        computedLineStatus = "po_drafted";
      } else if (liObj.tenderId) {
        computedLineStatus = "tender_initiated";
      } else if (activeRCs.length > 1) {
        computedLineStatus = "multiple_rcs_found_selection_required";
      } else if (hasActiveRC) {
        computedLineStatus = "active_rc_matched_po_eligible";
      } else if (isExpiredRC) {
        computedLineStatus = "rc_unavailable_tender_required";
      } else {
        computedLineStatus = "no_active_rc_tender_required";
      }
    }

    // Match linked PO for payment and tranche sync
    const matchingPO = linkedIndentPOs.find((p: any) =>
      (liObj.poNumber && p.poNumber === liObj.poNumber) ||
      (liObj.poId && String(p._id) === String(liObj.poId)) ||
      (linkedIndentPOs.length === 1)
    );

    const poTotal = matchingPO?.totalAmount || liObj.estimatedTotalCost || 0;
    const t1Amt = matchingPO?.tranche1Amount ?? liObj.tranche1Amount ?? Math.round(poTotal * 0.9);
    const t2Amt = matchingPO?.tranche2Amount ?? liObj.tranche2Amount ?? (poTotal - t1Amt);
    const t1Paid = Boolean(
      matchingPO?.tranche1Paid ??
      liObj.tranche1Paid ??
      (matchingPO?.paymentStatus === "paid" || liObj.paymentStatus === "paid" || matchingPO?.paymentStatus === "partial")
    );
    const t2Paid = Boolean(
      matchingPO?.tranche2Paid ??
      liObj.tranche2Paid ??
      (matchingPO?.paymentStatus === "paid" && (matchingPO?.tranche1Paid || matchingPO?.status === "completed" || matchingPO?.tranche2Paid !== false))
    );
    const linePaymentStatus = matchingPO?.paymentStatus ?? liObj.paymentStatus ?? ((t1Paid && t2Paid) ? "paid" : (t1Paid ? "partial" : "not_paid"));
    const linePaidPct = (t1Paid ? 90 : 0) + (t2Paid ? 10 : 0);
    const linePaidAmt = matchingPO?.paymentAmount ?? liObj.paidAmount ?? ((t1Paid ? t1Amt : 0) + (t2Paid ? t2Amt : 0));

    return {
      ...liObj,
      lineStatus: computedLineStatus,
      candidateRateContracts: activeRCs.map((arc: any) => ({
        rcId: arc._id.toString(),
        contractNumber: arc.contractNumber,
        vendorName: arc.vendorName,
        unitPrice: arc.unitPrice,
        endDate: arc.endDate,
      })),
      rcStatus: hasActiveRC ? "active" : isExpiredRC ? "expired" : "not_available",
      hasActiveRC,
      rateContractId: itemRC?._id?.toString() ?? (liObj.rateContractId ? liObj.rateContractId.toString() : null),
      rateContractNumber: itemRC?.contractNumber ?? liObj.rateContractNumber ?? null,
      rateContractVendor: itemRC?.vendorName ?? liObj.rateContractVendor ?? null,
      rateContractUnitPrice: itemRC?.unitPrice ?? liObj.rateContractUnitPrice ?? null,
      rateContractValidityEnd: itemRC?.endDate ? (itemRC.endDate instanceof Date ? itemRC.endDate.toISOString() : new Date(itemRC.endDate).toISOString()) : null,
      poId: (matchingPO?._id?.toString() ?? liObj.poId?.toString()) ?? null,
      poNumber: matchingPO?.poNumber ?? liObj.poNumber ?? null,
      tenderId: liObj.tenderId?.toString() ?? null,
      tenderNumber: liObj.tenderNumber ?? null,
      isTenderRequired: !hasActiveRC,
      paymentStatus: linePaymentStatus,
      paidAmount: linePaidAmt,
      paidPercentage: linePaidPct,
      tranche1Paid: t1Paid,
      tranche1Amount: t1Amt,
      tranche1Reference: matchingPO?.tranche1Reference || liObj.tranche1Reference || (t1Paid ? (matchingPO?.paymentReference || `PAY-90-${matchingPO?.poNumber || liObj.poNumber}`) : "") || "",
      tranche1PaidDate: matchingPO?.tranche1PaidDate ? new Date(matchingPO.tranche1PaidDate).toISOString() : (liObj.tranche1PaidDate ? new Date(liObj.tranche1PaidDate).toISOString() : null),
      tranche1PaidBy: matchingPO?.tranche1PaidBy || liObj.tranche1PaidBy || "",
      tranche2Paid: t2Paid,
      tranche2Amount: t2Amt,
      tranche2Reference: matchingPO?.tranche2Reference || liObj.tranche2Reference || (t2Paid ? (matchingPO?.paymentReference || `PAY-10-${matchingPO?.poNumber || liObj.poNumber}`) : "") || "",
      tranche2PaidDate: matchingPO?.tranche2PaidDate ? new Date(matchingPO.tranche2PaidDate).toISOString() : (liObj.tranche2PaidDate ? new Date(liObj.tranche2PaidDate).toISOString() : null),
      tranche2PaidBy: matchingPO?.tranche2PaidBy || liObj.tranche2PaidBy || "",
    };
  }));

  const hasItems = enrichedLineItems.length > 0;
  const activeRCCount = enrichedLineItems.filter((i: any) => i.hasActiveRC).length;
  const missingRCCount = enrichedLineItems.filter((i: any) => !i.hasActiveRC).length;
  const hasFullRCCoverage = hasItems ? missingRCCount === 0 : !!r.rateContractId;
  const hasPartialRCCoverage = hasItems && activeRCCount > 0 && missingRCCount > 0;
  const tenderRequired = hasItems ? missingRCCount > 0 : !r.rateContractId;
  const missingRCItems = enrichedLineItems.filter((i: any) => !i.hasActiveRC).map((i: any) => i.equipmentName);

  let rateContractNumber = null;
  let rateContractVendor = null;
  let rateContractUnitPrice = null;
  let rateContractValidityEnd = null;
  let rateContractStatus = null;

  let effectiveRateContractId = r.rateContractId;
  if (!effectiveRateContractId && enrichedLineItems.length > 0) {
    const activeRCItem = enrichedLineItems.find((li: any) => li.hasActiveRC && li.rateContractId);
    if (activeRCItem) effectiveRateContractId = activeRCItem.rateContractId;
  }

  if (effectiveRateContractId) {
    const rc = await RateContract.findById(effectiveRateContractId).catch(() => null);
    if (rc) {
      rateContractNumber = rc.contractNumber;
      rateContractVendor = rc.vendorName;
      rateContractUnitPrice = rc.unitPrice;
      rateContractValidityEnd = rc.endDate ? (rc.endDate instanceof Date ? rc.endDate.toISOString() : new Date(rc.endDate).toISOString()) : null;
      rateContractStatus = rc.status;
    }
  }

  // Enrich linked tender details
  let tenderNumber = null;
  let tenderTitle = null;
  let tenderStatus = null;
  let tenderType = null;
  let tenderPortal = null;
  let tenderCurrentStageNumber = null;
  if (r.tenderId) {
    const t = await Tender.findById(r.tenderId).catch(() => null);
    if (t) {
      tenderNumber = t.tenderNumber;
      tenderTitle = t.equipmentName || "Healthcare Equipment Tender";
      tenderStatus = t.status;
      tenderType = t.tenderType;
      tenderPortal = t.portal;
      tenderCurrentStageNumber = t.currentStageNumber;
    }
  }

  return {
    id: r._id.toString(),
    indentNumber: r.indentNumber,
    indentRefNumber: r.indentRefNumber ?? null,
    indentType: r.indentType ?? "letter",
    financialYear: r.financialYear ?? "2026-27",
    indentDate: r.indentDate ? r.indentDate.toISOString() : r.createdAt.toISOString(),
    facilityId: r.facilityId.toString(),
    facilityName: facility?.name ?? r.facilityName ?? "Unknown",
    hodName: r.hodName ?? facility?.hodName ?? "",
    equipmentId: r.equipmentId?.toString() ?? null,
    equipmentName,
    lineItems: enrichedLineItems,
    institutions: r.institutions ?? [],
    quantity: r.quantity,
    technicalRequirements: r.technicalRequirements,
    estimatedTotalValue: r.estimatedTotalValue ?? 0,
    status: r.status,
    verificationStatus: r.verificationStatus ?? (["approved", "po_issued", "completed", "in_procurement", "tgmsidc_verification_completed"].includes(r.status) ? "tgmsidc_verification_completed" : r.status),
    verifiedBy: r.verifiedBy ?? r.reviewedBy ?? null,
    verifiedAt: r.verifiedAt ? (r.verifiedAt instanceof Date ? r.verifiedAt.toISOString() : new Date(r.verifiedAt).toISOString()) : null,
    verificationRemarks: r.verificationRemarks ?? null,
    procurementMode: (hasFullRCCoverage && !r.tenderId) ? "rate_contract" : (r.procurementMode ?? null),
    rateContractId: (effectiveRateContractId ? effectiveRateContractId.toString() : r.rateContractId?.toString()) ?? null,
    rateContractNumber,
    rateContractVendor,
    rateContractUnitPrice,
    rateContractValidityEnd,
    rateContractStatus,
    hasFullRCCoverage,
    hasPartialRCCoverage,
    tenderRequired,
    missingRCItems,
    tenderId: r.tenderId?.toString() ?? null,
    tenderNumber,
    tenderTitle,
    tenderStatus,
    tenderType,
    tenderPortal,
    tenderCurrentStageNumber,
    rejectionReason: r.rejectionReason ?? null,
    returnComments: r.returnComments ?? null,
    digitisedBy: r.digitisedBy,
    createdByUserId: r.createdByUserId ?? null,
    reviewedBy: r.reviewedBy ?? null,
    approvedBy: r.approvedBy ?? null,
    approvalSteps: r.approvalSteps || [],
    editAuditTrail: r.editAuditTrail || [],
    contactPerson: r.contactPerson || facility?.contactPerson || "Dr. K. Srinivas Rao",
    contactPhone: r.contactPhone || facility?.contactPhone || "040-27505566",
    contactEmail: r.contactEmail || facility?.contactEmail || "superintendent@tgmsidc.telangana.gov.in",
    superintendentName: facility?.superintendentName || r.hodName || "Dr. M. Raja Rao",
    signatories: (r.signatories && r.signatories.length > 0) ? r.signatories : [
      {
        name: r.hodName || facility?.superintendentName || "Dr. M. Raja Rao",
        designation: "Medical Superintendent / Head of Institution",
        date: r.indentDate ? r.indentDate.toISOString() : r.createdAt.toISOString(),
        status: "Verified & Signed",
      },
      {
        name: "Er. K. Ramesh",
        designation: "Biomedical Engineer (Facility)",
        date: r.indentDate ? r.indentDate.toISOString() : r.createdAt.toISOString(),
        status: "Verified & Signed",
      },
      {
        name: r.digitisedBy || "DEO Initiator",
        designation: "Data Entry Operator / Consignee",
        date: r.createdAt.toISOString(),
        status: "Digitised & Submitted",
      },
    ],
    attachments: (() => {
      const userAttachments = Array.isArray(r.attachments)
        ? r.attachments.map((a: any) => (typeof a.toObject === "function" ? a.toObject() : { ...a }))
        : [];
      const allAttachments: any[] = [];

      if (r.scannedCopyDataUrl || r.scannedCopyFilename) {
        allAttachments.push({
          name: r.scannedCopyFilename || `Official_Sanction_${r.indentNumber.replace(/[\/\\:]/g, '_')}.pdf`,
          size: r.scannedCopyDataUrl ? `${(r.scannedCopyDataUrl.length * 0.75 / (1024 * 1024)).toFixed(1)} MB` : "Scanned Copy",
          type: "Facility Sanction Order & Requisition Copy",
          dataUrl: r.scannedCopyDataUrl || undefined,
          isScannedCopy: true,
          date: r.createdAt ? (r.createdAt instanceof Date ? r.createdAt.toISOString() : new Date(r.createdAt).toISOString()) : new Date().toISOString(),
          status: "Verified",
        });
      }

      allAttachments.push(...userAttachments);

      return allAttachments.length > 0 ? allAttachments : [
        {
          name: r.scannedCopyFilename || `Official_Sanction_${r.indentNumber.replace(/[\/\\:]/g, '_')}.pdf`,
          size: "1.4 MB",
          type: "Facility Sanction Order & Requisition Copy",
          date: r.createdAt ? (r.createdAt instanceof Date ? r.createdAt.toISOString() : new Date(r.createdAt).toISOString()) : new Date().toISOString(),
          status: "Verified",
        },
      ];
    })(),
    scannedCopyFilename: r.scannedCopyFilename ?? null,
    scannedCopyDataUrl: r.scannedCopyDataUrl ?? null,
    accountHeadName: r.accountHeadName ?? null,
    programmeName: r.programmeName ?? null,
    fundingSourceName: r.fundingSourceName ?? null,

    /* Administrative Sanction & Cost Estimation Validation */
    asAmount: r.asAmount ?? r.institutions?.reduce((sum: number, inst: any) => sum + (inst.fundSanctionedAmount || 0), 0) ?? 0,
    asDate: r.asDate ? (r.asDate instanceof Date ? r.asDate.toISOString() : new Date(r.asDate).toISOString()) : null,
    asReferenceNo: r.asReferenceNo ?? null,
    revisedAsAmount: r.revisedAsAmount ?? null,
    revisedAsDate: r.revisedAsDate ? (r.revisedAsDate instanceof Date ? r.revisedAsDate.toISOString() : new Date(r.revisedAsDate).toISOString()) : null,
    revisedAsReferenceNo: r.revisedAsReferenceNo ?? null,
    revisedAsRemarks: r.revisedAsRemarks ?? null,
    estimatedTotalProcurementValue: r.estimatedTotalProcurementValue ?? r.estimatedTotalValue ?? 0,
    budgetSurplusOrShortfall: r.budgetSurplusOrShortfall ?? ((r.revisedAsAmount || r.asAmount || (r.institutions?.reduce((sum: number, inst: any) => sum + (inst.fundSanctionedAmount || 0), 0) ?? 0)) - (r.estimatedTotalProcurementValue ?? r.estimatedTotalValue ?? 0)),
    budgetSufficiency: r.budgetSufficiency ?? "pending_validation",
    budgetValidationStatus: r.budgetValidationStatus ?? "pending",
    reprioritizationNotes: r.reprioritizationNotes ?? "",
    reprioritizationHistory: r.reprioritizationHistory ?? [],

    /* Payment & Statutory 2-Tranche Breakdown */
    paymentStatus: (() => {
      if (r.paymentStatus && r.paymentStatus !== "not_paid") return r.paymentStatus;
      if (linkedIndentPOs.length > 0 && linkedIndentPOs.every((p: any) => p.paymentStatus === "paid" && (p.tranche2Paid || p.status === "completed"))) return "paid";
      if (linkedIndentPOs.some((p: any) => p.tranche1Paid || p.paymentStatus === "paid" || p.paymentStatus === "partial")) return "partial";
      return "not_paid";
    })(),
    totalPaidAmount: (() => {
      if (r.totalPaidAmount) return r.totalPaidAmount;
      return linkedIndentPOs.reduce((s: number, p: any) => {
        const pTot = p.totalAmount || 0;
        const pT1 = p.tranche1Amount || Math.round(pTot * 0.9);
        const pT2 = p.tranche2Amount || (pTot - pT1);
        const isP1 = Boolean(p.tranche1Paid || p.paymentStatus === "paid" || p.paymentStatus === "partial");
        const isP2 = Boolean(p.tranche2Paid || (p.paymentStatus === "paid" && (p.status === "completed" || p.tranche2Paid)));
        return s + (p.paymentAmount != null ? p.paymentAmount : ((isP1 ? pT1 : 0) + (isP2 ? pT2 : 0)));
      }, 0);
    })(),
    paidPercentage: (() => {
      if (r.paidPercentage != null && r.paidPercentage > 0) return r.paidPercentage;
      const totalIndentPOValue = linkedIndentPOs.reduce((s: number, p: any) => s + (p.totalAmount || 0), 0);
      const totalIndentPaid = linkedIndentPOs.reduce((s: number, p: any) => {
        const pTot = p.totalAmount || 0;
        const pT1 = p.tranche1Amount || Math.round(pTot * 0.9);
        const pT2 = p.tranche2Amount || (pTot - pT1);
        const isP1 = Boolean(p.tranche1Paid || p.paymentStatus === "paid" || p.paymentStatus === "partial");
        const isP2 = Boolean(p.tranche2Paid || (p.paymentStatus === "paid" && (p.status === "completed" || p.tranche2Paid)));
        return s + (p.paymentAmount != null ? p.paymentAmount : ((isP1 ? pT1 : 0) + (isP2 ? pT2 : 0)));
      }, 0);
      if (totalIndentPOValue > 0) return Math.min(100, Math.round((totalIndentPaid / totalIndentPOValue) * 100));
      const primPO = linkedIndentPOs[0];
      const isP1 = Boolean(primPO?.tranche1Paid || primPO?.paymentStatus === "paid" || primPO?.paymentStatus === "partial");
      const isP2 = Boolean(primPO?.tranche2Paid || (primPO?.paymentStatus === "paid" && (primPO?.status === "completed" || primPO?.tranche2Paid)));
      return (isP1 ? 90 : 0) + (isP2 ? 10 : 0);
    })(),
    tranche1Paid: Boolean(r.tranche1Paid ?? linkedIndentPOs[0]?.tranche1Paid ?? (linkedIndentPOs[0]?.paymentStatus === "paid" || linkedIndentPOs[0]?.paymentStatus === "partial")),
    tranche1Amount: r.tranche1Amount ?? linkedIndentPOs[0]?.tranche1Amount ?? (linkedIndentPOs[0]?.totalAmount ? Math.round(linkedIndentPOs[0].totalAmount * 0.9) : 0),
    tranche1Reference: r.tranche1Reference || linkedIndentPOs[0]?.tranche1Reference || (linkedIndentPOs[0]?.tranche1Paid ? (linkedIndentPOs[0]?.paymentReference || `PAY-90-${linkedIndentPOs[0]?.poNumber}`) : "") || "",
    tranche1PaidDate: r.tranche1PaidDate ? new Date(r.tranche1PaidDate).toISOString() : (linkedIndentPOs[0]?.tranche1PaidDate ? new Date(linkedIndentPOs[0].tranche1PaidDate).toISOString() : (linkedIndentPOs[0]?.paymentDate ? new Date(linkedIndentPOs[0].paymentDate).toISOString() : null)),
    tranche1PaidBy: r.tranche1PaidBy || linkedIndentPOs[0]?.tranche1PaidBy || linkedIndentPOs[0]?.paidBy || "",

    tranche2Paid: Boolean(r.tranche2Paid ?? linkedIndentPOs[0]?.tranche2Paid ?? (linkedIndentPOs[0]?.paymentStatus === "paid" && (linkedIndentPOs[0]?.status === "completed" || linkedIndentPOs[0]?.tranche2Paid !== false))),
    tranche2Amount: r.tranche2Amount ?? linkedIndentPOs[0]?.tranche2Amount ?? (linkedIndentPOs[0]?.totalAmount ? (linkedIndentPOs[0].totalAmount - Math.round(linkedIndentPOs[0].totalAmount * 0.9)) : 0),
    tranche2Reference: r.tranche2Reference || linkedIndentPOs[0]?.tranche2Reference || (linkedIndentPOs[0]?.tranche2Paid ? (linkedIndentPOs[0]?.paymentReference || `PAY-10-${linkedIndentPOs[0]?.poNumber}`) : "") || "",
    tranche2PaidDate: r.tranche2PaidDate ? new Date(r.tranche2PaidDate).toISOString() : (linkedIndentPOs[0]?.tranche2PaidDate ? new Date(linkedIndentPOs[0].tranche2PaidDate).toISOString() : null),
    tranche2PaidBy: r.tranche2PaidBy || linkedIndentPOs[0]?.tranche2PaidBy || linkedIndentPOs[0]?.paidBy || "",

    paymentReference: r.paymentReference || linkedIndentPOs[0]?.paymentReference || (linkedIndentPOs[0]?.poNumber ? `PAY-90-${linkedIndentPOs[0].poNumber}` : null),
    paymentDate: r.paymentDate ? new Date(r.paymentDate).toISOString() : (linkedIndentPOs[0]?.paymentDate ? new Date(linkedIndentPOs[0].paymentDate).toISOString() : null),
    paidBy: r.paidBy || linkedIndentPOs[0]?.paidBy || null,
    paymentRemarks: r.paymentRemarks || linkedIndentPOs[0]?.paymentRemarks || "",

    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

router.get("/indents", async (req, res): Promise<void> => {
  const filter: Record<string, any> = {};
  if (req.query.status && req.query.status !== "all") filter.status = req.query.status;
  if (req.query.facilityId) filter.facilityId = req.query.facilityId;
  if (req.query.financialYear) filter.financialYear = req.query.financialYear;

  const rows = await Indent.find(filter).sort({ createdAt: -1 });
  const result = await Promise.all(rows.map(formatIndent));
  res.json(result);
});

router.post("/indents", async (req, res): Promise<void> => {
  try {
    const {
      facilityId, equipmentId, quantity, technicalRequirements, digitisedBy,
      indentType, financialYear, indentRefNumber, lineItems, institutions,
      accountHeadName, programmeName, fundingSourceName, estimatedValue,
      createdByUserId, contactPerson, contactPhone, contactEmail,
      signatories, attachments, scannedCopyFilename, scannedCopyDataUrl,
    } = req.body;

    if (!facilityId || !digitisedBy) {
      res.status(400).json({ error: "facilityId and digitisedBy are required" });
      return;
    }

    const count = await Indent.countDocuments();
    const fy = financialYear || "2026-27";
    const indentNumber = `IND-${fy.replace("-", "").slice(2)}-${padNum(count + 1)}`;

    let facility = null;
    if (facilityId) {
      if (mongoose.Types.ObjectId.isValid(facilityId)) {
        facility = await Institution.findById(facilityId).catch(() => null);
      }
      if (!facility) {
        facility = await Institution.findOne({
          $or: [
            { dmeInstitutionId: facilityId },
            { institutionCode: facilityId },
            { name: new RegExp(`^${String(facilityId).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, "i") }
          ]
        }).catch(() => null);
      }
    }
    const resolvedFacilityId = facility?._id || facilityId;

    const normalizedLineItems = await Promise.all((lineItems ?? []).map(async (li: any) => {
      let liEqId = li.equipmentId;
      let liEqName = li.equipmentName;
      let liCategory = li.category;
      let liSpecs = li.specifications || li.justification;

      if (liEqId) {
        let eqDoc = null;
        if (mongoose.Types.ObjectId.isValid(liEqId)) {
          eqDoc = await Equipment.findById(liEqId).catch(() => null);
        }
        if (!eqDoc) {
          eqDoc = await Equipment.findOne({
            $or: [
              { equipmentCode: liEqId },
              { name: new RegExp(`^${String(liEqId).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, "i") }
            ]
          }).catch(() => null);
        }
        if (eqDoc) {
          liEqId = eqDoc._id;
          if (!liEqName) liEqName = eqDoc.name;
          if (!liCategory) liCategory = eqDoc.category;
          if (!liSpecs) liSpecs = eqDoc.specifications;
        }
      }

      return {
        equipmentId: liEqId,
        equipmentName: liEqName || "Medical Equipment",
        category: liCategory || "Medical Equipment",
        department: li.department || "General",
        specifications: liSpecs || "Standard technical specifications",
        requestedQty: Number(li.requestedQty ?? li.qty ?? 1),
        unitOfMeasure: li.unitOfMeasure ?? li.unit ?? "No.",
        estimatedUnitCost: Number(li.estimatedUnitCost ?? li.estimatedUnitRate ?? 0),
        procurementMode: li.procurementMode || "",
      };
    }));

    const totalQty = quantity || normalizedLineItems.reduce((s: number, li: any) => s + (li.requestedQty || 0), 0) || 1;
    const totalEstVal = estimatedValue || normalizedLineItems.reduce((s: number, li: any) => s + (li.requestedQty * li.estimatedUnitCost), 0) || 0;

    let resolvedEquipmentId = equipmentId || (normalizedLineItems[0]?.equipmentId ?? undefined);
    let resolvedEquipmentName = req.body.equipmentName || "";
    if (resolvedEquipmentId) {
      let eqDoc = null;
      if (mongoose.Types.ObjectId.isValid(resolvedEquipmentId)) {
        eqDoc = await Equipment.findById(resolvedEquipmentId).catch(() => null);
      }
      if (!eqDoc) {
        eqDoc = await Equipment.findOne({
          $or: [
            { equipmentCode: resolvedEquipmentId },
            { name: new RegExp(`^${String(resolvedEquipmentId).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, "i") }
          ]
        }).catch(() => null);
      }
      if (eqDoc) {
        resolvedEquipmentId = eqDoc._id;
        if (!resolvedEquipmentName) resolvedEquipmentName = eqDoc.name;
      }
    }

    const allEqIds = [resolvedEquipmentId, ...normalizedLineItems.map((li: any) => li.equipmentId)].filter(Boolean);
    const eqNames = [resolvedEquipmentName, ...normalizedLineItems.map((li: any) => li.equipmentName)].filter(Boolean);

    const rcOrConditions: any[] = [];
    allEqIds.forEach(id => {
      const idStr = String(id);
      rcOrConditions.push({ equipmentId: idStr });
      if (mongoose.Types.ObjectId.isValid(idStr)) {
        rcOrConditions.push({ equipmentId: new mongoose.Types.ObjectId(idStr) });
      }
    });
    eqNames.forEach(name => {
      rcOrConditions.push({ equipmentName: name });
    });

    const activeRc = rcOrConditions.length > 0 ? await RateContract.findOne({
      $or: rcOrConditions,
      status: "active",
      endDate: { $gte: new Date() },
    }) : null;

    const determinedProcurementMode = activeRc ? "rate_contract" : (req.body.procurementMode || "tender");
    const determinedRateContractId = activeRc ? activeRc._id : (req.body.rateContractId || undefined);

    if (activeRc) {
      for (const li of normalizedLineItems) {
        const matchesThis = !li.equipmentId ||
          String(li.equipmentId) === String(activeRc.equipmentId) ||
          (li.equipmentName && activeRc.equipmentName && li.equipmentName.toLowerCase() === activeRc.equipmentName.toLowerCase());
        if (matchesThis) {
          li.rateContractId = activeRc._id;
          li.procurementMode = "rate_contract";
        }
      }
    }

    const indent = await Indent.create({
      indentNumber,
      indentRefNumber,
      indentType: indentType || "letter",
      financialYear: fy,
      indentDate: new Date(),
      facilityId: resolvedFacilityId,
      facilityName: facility?.name || req.body.facilityName || "Telangana Medical Facility",
      hodName: facility?.hodName || req.body.hodName || "Director of Medical Education",
      superintendentName: facility?.superintendentName || req.body.superintendentName || facility?.contactPerson || "",
      contactPerson: contactPerson || facility?.contactPerson || "Dr. K. Srinivas Rao",
      contactPhone: contactPhone || facility?.contactPhone || "040-27505566",
      contactEmail: contactEmail || facility?.contactEmail || "superintendent@tgmsidc.telangana.gov.in",
      signatories: signatories && signatories.length > 0 ? signatories : undefined,
      attachments: attachments && attachments.length > 0 ? attachments : undefined,
      scannedCopyFilename,
      scannedCopyDataUrl,
      lineItems: normalizedLineItems,
      institutions: institutions ?? [],
      equipmentId: resolvedEquipmentId,
      equipmentName: resolvedEquipmentName || (normalizedLineItems[0]?.equipmentName ?? "Medical Equipment"),
      quantity: totalQty,
      technicalRequirements: technicalRequirements || normalizedLineItems.map((li: any) => li.specifications).join("; ") || "—",
      estimatedTotalValue: totalEstVal,
      estimatedTotalProcurementValue: totalEstVal,
      asAmount: (institutions ?? []).reduce((sum: number, inst: any) => sum + Number(inst.fundSanctionedAmount || 0), 0) || Number(req.body.fundSanctionedAmount || req.body.asAmount || 0),
      asDate: req.body.fundSanctionDate ? new Date(req.body.fundSanctionDate) : new Date(),
      asReferenceNo: indentRefNumber || "",
      budgetSurplusOrShortfall: ((institutions ?? []).reduce((sum: number, inst: any) => sum + Number(inst.fundSanctionedAmount || 0), 0) || Number(req.body.fundSanctionedAmount || req.body.asAmount || 0)) - totalEstVal,
      budgetSufficiency: "pending_validation",
      budgetValidationStatus: "pending",
      rateContractId: determinedRateContractId,
      procurementMode: determinedProcurementMode,
      accountHeadName,
      programmeName,
      fundingSourceName,
      digitisedBy,
      createdByUserId,
      status: "pending_review",
      approvalSteps: [],
    });

    /* Build approval chain — Standard 5-tier TGMSIDC Indent approval workflow */
    const steps: any[] = [
      { stepNumber: 1, requiredRole: "deo", roleLabel: "DEO (Initiator)", assignedUserName: digitisedBy, assignedUserId: createdByUserId || "sys", status: "approved", actionedAt: new Date(), comments: "Indent submitted." },
      { stepNumber: 2, requiredRole: "tgmsidc_user", roleLabel: "TGMSIDC User", assignedUserName: "K. Srinivas", assignedUserId: "u2", status: "pending", actionedAt: null, comments: "" },
      { stepNumber: 3, requiredRole: "gm_equipment", roleLabel: "GM Equipment", assignedUserName: "P. Narayan", assignedUserId: "u3", status: "pending", actionedAt: null, comments: "" },
      { stepNumber: 4, requiredRole: "so_equipment", roleLabel: "SO Equipment", assignedUserName: "R. Sharma", assignedUserId: "u4", status: "pending", actionedAt: null, comments: "" },
      { stepNumber: 5, requiredRole: "executive_director", roleLabel: "Executive Director", assignedUserName: "D. Venkatesh", assignedUserId: "u5", status: "pending", actionedAt: null, comments: "" },
    ];

    indent.approvalSteps = steps;
    await indent.save();

    /* Notify next approver */
    await notifyIndentStatusChange(indent, "created", digitisedBy);

    res.status(201).json(await formatIndent(indent));
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to create indent" });
  }
});

router.get("/indents/:id", async (req, res): Promise<void> => {
  try {
    const indent = await findIndentDoc(req.params.id);
    if (!indent) { res.status(404).json({ error: "Indent not found" }); return; }
    res.json(await formatIndent(indent));
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to fetch indent" });
  }
});

router.patch("/indents/:id", async (req, res): Promise<void> => {
  try {
    const indent = await findIndentDoc(req.params.id);
    if (!indent) { res.status(404).json({ error: "Indent not found" }); return; }
    const allowed = ["quantity", "technicalRequirements", "status", "procurementMode",
      "lineItems", "institutions", "reviewedBy", "returnComments", "accountHeadName",
      "programmeName", "fundingSourceName", "estimatedTotalValue"];
    for (const k of allowed) {
      if (req.body[k] != null) (indent as any)[k] = req.body[k];
    }
    await indent.save();
    res.json(await formatIndent(indent));
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to update indent" });
  }
});

router.post("/indents/:id/approve", async (req, res): Promise<void> => {
  try {
    const { procurementMode, rateContractId, approvedBy } = req.body;
    const indent = await findIndentDoc(req.params.id);
    if (!indent) { res.status(404).json({ error: "Indent not found" }); return; }

    // Check matching active rate contract if not provided
    const eqIds = [
      indent.equipmentId,
      ...(indent.lineItems?.map((li: any) => li.equipmentId) || [])
    ].filter(Boolean);
    const eqNames = [
      indent.equipmentName,
      ...(indent.lineItems?.map((li: any) => li.equipmentName) || [])
    ].filter(Boolean);

    let finalRcId = rateContractId || indent.rateContractId;
    let activeRc: any = null;
    if (finalRcId) {
      activeRc = await RateContract.findOne({ _id: finalRcId, status: "active", endDate: { $gte: new Date() } });
    }
    if (!activeRc) {
      const rcMatchConditions: any[] = [];
      eqIds.forEach(id => {
        const idStr = String(id);
        rcMatchConditions.push({ equipmentId: idStr });
        if (mongoose.Types.ObjectId.isValid(idStr)) {
          rcMatchConditions.push({ equipmentId: new mongoose.Types.ObjectId(idStr) });
        }
      });
      eqNames.forEach(name => {
        rcMatchConditions.push({ equipmentName: name });
      });
      if (rcMatchConditions.length > 0) {
        activeRc = await RateContract.findOne({
          $or: rcMatchConditions,
          status: "active",
          endDate: { $gte: new Date() },
        });
      }
    }

    if (activeRc) {
      finalRcId = activeRc._id;
      indent.rateContractId = activeRc._id;
      indent.procurementMode = "rate_contract";
      indent.status = "po_issued";
      indent.approvedBy = approvedBy || "Authorised Officer";

      // Check if PO(s) were already drafted for this indent
      const existingDraftPOs = await PurchaseOrder.find({
        $or: [{ indentId: indent._id }, { indentNumber: indent.indentNumber }]
      });

      if (existingDraftPOs.length > 0) {
        for (const po of existingDraftPOs) {
          po.status = "issued";
          po.approvalStatus = "approved";
          po.approvedBy = approvedBy || "D. Venkatesh, Executive Director";
          po.approvedDate = new Date();
          po.issuedDate = new Date();
          po.approvalTrail = po.approvalTrail || [];
          po.approvalTrail.push({
            level: "Executive Director",
            actorName: approvedBy || "Executive Director",
            role: "executive_director",
            action: "approved",
            remarks: "Sanctioned on Indent approval. Purchase order officially issued to vendor.",
            actionedAt: new Date(),
          });
          await po.save();
          await notifyPOStatusChange(po, "issued_to_vendor", approvedBy || "Authorised Officer");
        }
        indent.purchaseOrderId = existingDraftPOs[0]._id;
        indent.poNumber = existingDraftPOs[0].poNumber;
        if (indent.lineItems && indent.lineItems.length > 0) {
          for (const li of indent.lineItems) {
            li.lineStatus = "po_issued";
            const matchedPO = existingDraftPOs.find((p: any) =>
              String(p.equipmentId) === String(li.equipmentId) ||
              p.equipmentName === li.equipmentName ||
              String(p._id) === String(li.poId)
            ) || existingDraftPOs[0];
            li.poId = matchedPO._id;
            li.poNumber = matchedPO.poNumber;
            li.procurementMode = "rate_contract";
          }
          indent.markModified("lineItems");
        }
      } else {
        // Auto-generate fallback PO for RC Vendor if not already drafted
        const vn = await Vendor.findById(activeRc.vendorId).catch(() => null);
        const quantity = indent.quantity || indent.lineItems?.[0]?.requestedQty || 1;
        const unitPrice = activeRc.unitPrice || 100000;
        const gstRate = activeRc.gstRate ?? 12;
        const gstAmt = (unitPrice * quantity * gstRate) / 100;
        const total = unitPrice * quantity + gstAmt;
        const count = await PurchaseOrder.countDocuments();
        const poFy = indent.financialYear || "2026-27";
        const poFyCode = poFy.replace("-", "").slice(2);
        const poNumber = `PO-${poFyCode}-${String(count + 1).padStart(4, "0")}`;

        const po = await PurchaseOrder.create({
          poNumber,
          poType: "rc_based",
          financialYear: poFy,
          indentId: indent._id,
          indentNumber: indent.indentNumber,
          rateContractId: activeRc._id,
          rcNumber: activeRc.contractNumber,
          vendorId: activeRc.vendorId,
          vendorName: vn?.name || activeRc.vendorName || "Empanelled Vendor",
          vendorTier: "L1",
          allocationRatio: "100%",
          equipmentId: indent.equipmentId || activeRc.equipmentId || indent.lineItems?.[0]?.equipmentId,
          equipmentName: indent.lineItems?.[0]?.equipmentName || indent.equipmentName || activeRc.equipmentName || "Medical Equipment",
          quantity,
          unitPrice,
          gstRate,
          gstAmount: gstAmt,
          unitPriceInclTax: unitPrice * (1 + gstRate / 100),
          totalEquipmentCost: unitPrice * quantity,
          totalAmount: total,
          deliveryAddress: indent.facilityName || "Telangana Medical Facility",
          supplyPeriodDays: activeRc.supplyPeriodDays ?? 45,
          expectedDeliveryDate: new Date(Date.now() + (activeRc.supplyPeriodDays ?? 45) * 86400000),
          consignees: [
            {
              institutionId: indent.facilityId,
              institutionName: indent.facilityName || "Telangana Medical Facility",
              district: indent.institutions?.[0]?.district || "Hyderabad",
              address: indent.facilityName || "Telangana Medical Facility",
              quantity,
              deliveryStatus: "pending",
            },
          ],
          approvalStatus: "approved",
          approvedBy: approvedBy || "Authorised Officer",
          approvedDate: new Date(),
          status: "issued",
          vendorAcknowledged: false,
          generatedBy: approvedBy || "Authorised Officer",
          fileNo: indent.indentRefNumber || `RC/HPC/EQU/${indent.financialYear || "2026-27"}/${indent.indentNumber}`,
        });

        indent.purchaseOrderId = po._id;
        indent.poNumber = po.poNumber;

        if (indent.lineItems && indent.lineItems.length > 0) {
          for (const li of indent.lineItems) {
            li.poId = po._id;
            li.poNumber = po.poNumber;
            li.lineStatus = "po_issued";
            li.rateContractId = activeRc._id;
            li.procurementMode = "rate_contract";
          }
          indent.markModified("lineItems");
        }
        await notifyPOStatusChange(po, "issued_to_vendor", approvedBy || "Authorised Officer");
      }
    } else {
      // No active Rate Contract available: seamlessly route into Open Tendering
      indent.rateContractId = undefined;
      indent.procurementMode = "tender";
      indent.status = "tender_initiated";
      indent.approvedBy = approvedBy || "Authorised Officer";

      if (!indent.tenderId) {
        const count = await Tender.countDocuments();
        const tenderYear = new Date().getFullYear();
        const tenderNumber = `TND-${tenderYear}-${padNum(count + 1)}`;
        const tender = await Tender.create({
          tenderNumber,
          indentId: indent._id,
          equipmentId: indent.equipmentId || (indent.lineItems?.[0]?.equipmentId ?? undefined),
          equipmentName: indent.lineItems?.length ? indent.lineItems.map((li: any) => li.equipmentName).join(", ") : (indent.equipmentName || "Medical Equipment"),
          equipmentCategory: indent.lineItems?.[0]?.category || "Medical Equipment",
          tenderType: "open",
          portal: "gem",
          financialYear: indent.financialYear || "2025-26",
          status: "invited",
          tenderInvitedDate: new Date(),
          currentStageNumber: 1,
          notes: `Tender initiated on final approval by ${approvedBy || "Authorised Officer"} (Rate Contract not available for requested equipment).`,
        });
        indent.tenderId = tender._id;
      }
    }

    if (indent.approvalSteps?.length) {
      indent.approvalSteps.forEach((s: any) => {
        s.status = "approved";
        s.actionedAt = new Date();
        if (!s.comments) s.comments = `Approved by ${approvedBy || "Authorised Officer"}`;
      });
      indent.markModified("approvalSteps");
    }

    await indent.save();
    await notifyIndentStatusChange(indent, "approved", approvedBy);
    res.json(await formatIndent(indent));
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to approve indent" });
  }
});

router.post("/indents/:id/reject", async (req, res): Promise<void> => {
  try {
    const { rejectionReason, rejectedBy } = req.body;
    if (!rejectionReason) { res.status(400).json({ error: "rejectionReason is required" }); return; }
    const indent = await findIndentDoc(req.params.id);
    if (!indent) { res.status(404).json({ error: "Indent not found" }); return; }

    indent.status = "rejected";
    indent.rejectionReason = rejectionReason;
    if (indent.approvalSteps?.length) {
      const currentStep = indent.approvalSteps.find((s: any) => s.status === "pending");
      if (currentStep) {
        currentStep.status = "rejected";
        currentStep.comments = rejectionReason;
        currentStep.actionedAt = new Date();
        indent.markModified("approvalSteps");
      }
    }
    await indent.save();
    await notifyIndentStatusChange(indent, "rejected", rejectedBy);
    res.json(await formatIndent(indent));
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to reject indent" });
  }
});

router.post("/indents/:id/return", async (req, res): Promise<void> => {
  try {
    const { returnComments, returnedBy } = req.body;
    if (!returnComments) { res.status(400).json({ error: "returnComments required" }); return; }
    const indent = await findIndentDoc(req.params.id);
    if (!indent) { res.status(404).json({ error: "Indent not found" }); return; }

    indent.status = "returned";
    indent.returnComments = returnComments;
    indent.reviewedBy = returnedBy;
    if (indent.approvalSteps?.length) {
      const currentStep = indent.approvalSteps.find((s: any) => s.status === "pending");
      if (currentStep) {
        currentStep.status = "returned";
        currentStep.comments = returnComments;
        currentStep.actionedAt = new Date();
        indent.markModified("approvalSteps");
      }
    }
    await indent.save();
    await notifyIndentStatusChange(indent, "returned", returnedBy);
    res.json(await formatIndent(indent));
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to return indent" });
  }
});

/* ── TGMSIDC Verification, Cost Assessment & Budget Comparison (Steps 2, 3, 4, 5, 6A, 6B) ── */
router.post("/indents/:id/verify", async (req, res): Promise<void> => {
  try {
    const indent = await findIndentDoc(req.params.id);
    if (!indent) { res.status(404).json({ error: "Indent not found" }); return; }

    // Check if any equipment line is write-in and unresolved
    const unresolvedWriteIns = (indent.lineItems || []).filter(
      (li: any) => li.isWriteIn && (!li.writeInResolution || li.writeInResolution === "pending")
    );
    if (unresolvedWriteIns.length > 0) {
      indent.status = "write_in_resolution_pending";
      indent.verificationStatus = "write_in_resolution_pending";
      await indent.save();
      res.status(400).json({
        error: `Cannot complete verification. ${unresolvedWriteIns.length} write-in equipment lines must be mapped to master or flagged as new master request first.`,
        indent: await formatIndent(indent),
      });
      return;
    }

    indent.verifiedBy = req.body.verifiedBy || "TGMSIDC Verification Officer";
    indent.verifiedAt = new Date();
    indent.verificationRemarks = req.body.remarks || "Physical indent, fund sanction, and equipment lines verified against scanned copy.";

    // Automatic RC Assessment and item-wise cost calculation for each equipment line (Steps 3 & 4)
    const now = new Date();
    let totalEstimatedProcurementValue = 0;

    for (let i = 0; i < (indent.lineItems || []).length; i++) {
      const li = indent.lineItems[i];
      const matchConditions: any[] = [];
      if (li.equipmentId) {
        matchConditions.push({ equipmentId: String(li.equipmentId) });
        if (mongoose.Types.ObjectId.isValid(String(li.equipmentId))) {
          matchConditions.push({ equipmentId: new mongoose.Types.ObjectId(String(li.equipmentId)) });
        }
      }
      if (li.equipmentName) matchConditions.push({ equipmentName: li.equipmentName });

      const activeRCs = matchConditions.length > 0
        ? await RateContract.find({ $or: matchConditions, status: "active", endDate: { $gte: now } })
        : [];

      let unitRate = 0;
      if (activeRCs.length === 1) {
        const rc = activeRCs[0];
        li.rateContractId = rc._id;
        li.rateContractNumber = rc.contractNumber;
        li.rateContractVendor = rc.vendorName;
        li.rateContractUnitPrice = rc.unitPrice;
        li.procurementMode = "rate_contract";
        li.lineStatus = "active_rc_matched_po_eligible";
        li.candidateRateContracts = [];
        unitRate = rc.unitPrice || 0;
        li.costEstimationBasis = "rc_rate";
      } else if (activeRCs.length > 1) {
        li.lineStatus = "multiple_rcs_found_selection_required";
        li.candidateRateContracts = activeRCs.map((arc: any) => ({
          rcId: arc._id,
          contractNumber: arc.contractNumber,
          vendorName: arc.vendorName,
          unitPrice: arc.unitPrice,
          endDate: arc.endDate,
        }));
        unitRate = activeRCs[0].unitPrice || 0;
        li.costEstimationBasis = "rc_rate";
      } else {
        const closedOrExpired = matchConditions.length > 0
          ? await RateContract.findOne({ $or: matchConditions })
          : null;
        li.lineStatus = closedOrExpired ? "rc_unavailable_tender_required" : "no_active_rc_tender_required";
        li.procurementMode = "tender";
        li.candidateRateContracts = [];
        unitRate = li.estimatedUnitCost || 100000;
        li.costEstimationBasis = "configured_estimation_rule";
      }

      if (!li.originalRequestedQty) {
        li.originalRequestedQty = li.requestedQty || 1;
      }
      li.estimatedTotalCost = (li.requestedQty || 1) * unitRate;
      if (!li.deferred) {
        totalEstimatedProcurementValue += li.estimatedTotalCost;
      }
    }

    indent.estimatedTotalProcurementValue = totalEstimatedProcurementValue;
    indent.estimatedTotalValue = totalEstimatedProcurementValue;

    // Compare Administrative Sanction (AS) with estimated cost (Step 5, 6A, 6B)
    const effectiveAs = indent.revisedAsAmount || indent.asAmount || (indent.institutions || []).reduce((s: number, inst: any) => s + (inst.fundSanctionedAmount || 0), 0) || 0;
    indent.asAmount = effectiveAs;
    const surplusOrShortfall = effectiveAs - totalEstimatedProcurementValue;
    indent.budgetSurplusOrShortfall = surplusOrShortfall;

    if (effectiveAs > 0 && totalEstimatedProcurementValue > effectiveAs) {
      // Step 6B: Budget Shortfall detected -> Return to DEO for Reprioritization
      indent.budgetSufficiency = "insufficient";
      indent.budgetValidationStatus = "shortfall_detected";
      indent.status = "reprioritization_required";
      indent.verificationStatus = "reprioritization_required";
    } else {
      // Step 6A: AS is sufficient -> Ready for Procurement
      indent.budgetSufficiency = "sufficient";
      indent.budgetValidationStatus = "validated_within_as";
      indent.status = "ready_for_procurement";
      indent.verificationStatus = "completed";
    }

    indent.markModified("lineItems");
    await indent.save();
    await notifyIndentStatusChange(indent, indent.status === "reprioritization_required" ? "reprioritization_required" : "verified", indent.verifiedBy);
    res.json(await formatIndent(indent));
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to verify indent" });
  }
});

/* ── Reprioritize Requirement (Steps 7 & 8: DEO / HoD Facility) ────── */
router.post("/indents/:id/reprioritize", async (req, res): Promise<void> => {
  try {
    const indent = await findIndentDoc(req.params.id);
    if (!indent) { res.status(404).json({ error: "Indent not found" }); return; }

    const { lineItems = [], revisedAsAmount, revisedAsReferenceNo, revisedAsDate, revisedAsRemarks, reprioritizedBy } = req.body;

    if (!indent.reprioritizationHistory) indent.reprioritizationHistory = [];
    if (!indent.editAuditTrail) indent.editAuditTrail = [];
    const prevEstimated = indent.estimatedTotalProcurementValue || indent.estimatedTotalValue || 0;
    const prevAs = indent.revisedAsAmount || indent.asAmount || (indent.institutions || []).reduce((s: number, inst: any) => s + (inst.fundSanctionedAmount || 0), 0) || 0;

    // Apply line item adjustments with precise Rate Contract / estimated rate lookup
    const lineChanges: any[] = [];
    for (const update of lineItems) {
      const idx = Number(update.lineIndex);
      if (indent.lineItems && indent.lineItems[idx]) {
        const li = indent.lineItems[idx];
        const prevQty = li.requestedQty ?? 1;
        const prevDeferred = !!li.deferred;
        const prevPriority = li.priority || 1;

        if (li.originalRequestedQty === undefined || li.originalRequestedQty === null) {
          li.originalRequestedQty = prevQty;
        }

        if (update.requestedQty !== undefined) li.requestedQty = Math.max(0, Number(update.requestedQty));
        if (update.priority !== undefined) li.priority = Number(update.priority);
        if (update.deferred !== undefined) li.deferred = Boolean(update.deferred);

        // Ensure RC rate or estimated unit cost is accurately resolved
        let unitRate = Number(li.rateContractUnitPrice || 0);
        if (!unitRate) {
          const matchConditions: any[] = [];
          if (li.equipmentId) matchConditions.push({ equipmentId: li.equipmentId });
          if (li.equipmentCode) matchConditions.push({ equipmentCode: li.equipmentCode });
          if (li.equipmentName) matchConditions.push({ equipmentName: li.equipmentName });
          if (matchConditions.length > 0) {
            const activeRC = await RateContract.findOne({
              $or: matchConditions,
              status: "active",
              endDate: { $gte: new Date() },
            }).catch(() => null);
            if (activeRC) {
              unitRate = activeRC.unitPrice || 0;
              li.rateContractId = activeRC._id;
              li.rateContractNumber = activeRC.contractNumber;
              li.rateContractVendor = activeRC.vendorName;
              li.rateContractUnitPrice = unitRate;
              li.costEstimationBasis = "rc_rate";
            }
          }
        }
        if (!unitRate) {
          unitRate = Number(li.estimatedUnitCost || 0);
        }

        li.estimatedTotalCost = li.deferred ? 0 : (li.requestedQty || 0) * unitRate;

        lineChanges.push({
          equipmentName: li.equipmentName,
          previousQty: prevQty,
          newQty: li.requestedQty,
          previousDeferred: prevDeferred,
          newDeferred: li.deferred,
          previousPriority: prevPriority,
          newPriority: li.priority,
          unitRate,
          estimatedTotalCost: li.estimatedTotalCost,
        });
      }
    }

    // Recalculate total estimated procurement value accurately across non-deferred items
    let newEstimatedTotal = 0;
    for (const li of (indent.lineItems || [])) {
      if (!li.deferred) {
        newEstimatedTotal += (li.estimatedTotalCost || 0);
      }
    }
    indent.estimatedTotalProcurementValue = newEstimatedTotal;
    indent.estimatedTotalValue = newEstimatedTotal;

    // Apply revised AS details if submitted
    if (revisedAsAmount !== undefined && revisedAsAmount !== null && revisedAsAmount !== "" && Number(revisedAsAmount) > 0) {
      indent.revisedAsAmount = Number(revisedAsAmount);
      indent.asAmount = Number(revisedAsAmount);
      if (revisedAsReferenceNo) indent.revisedAsReferenceNo = revisedAsReferenceNo;
      if (revisedAsDate) indent.revisedAsDate = new Date(revisedAsDate);
      if (revisedAsRemarks) indent.revisedAsRemarks = revisedAsRemarks;
    }

    const currentAs = indent.revisedAsAmount || indent.asAmount || (indent.institutions || []).reduce((s: number, inst: any) => s + (inst.fundSanctionedAmount || 0), 0) || 0;
    const surplusOrShortfall = currentAs - newEstimatedTotal;
    indent.budgetSurplusOrShortfall = surplusOrShortfall;

    if (currentAs > 0 && newEstimatedTotal > currentAs) {
      indent.budgetSufficiency = "insufficient";
      indent.budgetValidationStatus = "shortfall_detected";
    } else {
      indent.budgetSufficiency = "sufficient";
      indent.budgetValidationStatus = "validated_within_as";
    }

    const actorName = reprioritizedBy || indent.digitisedBy || "DEO User";
    indent.reprioritizationNotes = req.body.notes || `Reprioritized by ${actorName}. Revised Procurement Value: ₹${newEstimatedTotal.toLocaleString("en-IN")}, AS: ₹${currentAs.toLocaleString("en-IN")}.`;

    // 1. Record detailed Reprioritization History
    indent.reprioritizationHistory.push({
      revisedAt: new Date(),
      revisedBy: actorName,
      previousEstimatedTotal: prevEstimated,
      newEstimatedTotal,
      previousAsAmount: prevAs,
      newAsAmount: currentAs,
      budgetSurplusOrShortfall: surplusOrShortfall,
      lineChanges,
      notes: indent.reprioritizationNotes,
    });

    // 2. Record in editAuditTrail
    indent.editAuditTrail.push({
      field: "Reprioritization & Revised AS",
      originalValue: `Est: ₹${prevEstimated.toLocaleString("en-IN")}, AS: ₹${prevAs.toLocaleString("en-IN")}`,
      correctedValue: `Est: ₹${newEstimatedTotal.toLocaleString("en-IN")}, AS: ₹${currentAs.toLocaleString("en-IN")}, Balance: ${surplusOrShortfall < 0 ? `-₹${Math.abs(surplusOrShortfall).toLocaleString("en-IN")}` : `+₹${surplusOrShortfall.toLocaleString("en-IN")}`}`,
      correctedBy: actorName,
      correctedAt: new Date(),
    });

    // 3. Record in AuditLog collection
    try {
      const summaryText = `Reprioritization revision submitted. Est. Value ₹${prevEstimated.toLocaleString("en-IN")} → ₹${newEstimatedTotal.toLocaleString("en-IN")}, AS ₹${prevAs.toLocaleString("en-IN")} → ₹${currentAs.toLocaleString("en-IN")}, Balance: ${surplusOrShortfall < 0 ? `-₹${Math.abs(surplusOrShortfall).toLocaleString("en-IN")}` : `+₹${surplusOrShortfall.toLocaleString("en-IN")}`}. ${indent.reprioritizationNotes}`;
      await AuditLog.create({
        entityType: "indent",
        entityId: indent._id.toString(),
        action: "REPRIORITIZATION_SUBMITTED",
        field: "lineItems, asAmount, estimatedTotalProcurementValue, budgetSurplusOrShortfall",
        beforeValue: `Est: ₹${prevEstimated.toLocaleString("en-IN")}, AS: ₹${prevAs.toLocaleString("en-IN")}`,
        afterValue: summaryText,
        userId: req.body.userId || indent.createdByUserId || "deo_user",
        userName: actorName,
        userRole: "deo",
        timestamp: new Date(),
      });
      if (indent.indentNumber) {
        await AuditLog.create({
          entityType: "indent",
          entityId: indent.indentNumber,
          action: "REPRIORITIZATION_SUBMITTED",
          field: "lineItems, asAmount, estimatedTotalProcurementValue, budgetSurplusOrShortfall",
          beforeValue: `Est: ₹${prevEstimated.toLocaleString("en-IN")}, AS: ₹${prevAs.toLocaleString("en-IN")}`,
          afterValue: summaryText,
          userId: req.body.userId || indent.createdByUserId || "deo_user",
          userName: actorName,
          userRole: "deo",
          timestamp: new Date(),
        });
      }
    } catch (auditErr) {
      console.error("[AUDIT LOG ERROR]", auditErr);
    }

    // 4. Update workflow status to route to TGMSIDC user for review (Step 9)
    indent.status = "resubmitted_for_review";
    indent.verificationStatus = "resubmitted_for_review";

    // 5. Update Approval Steps & Timeline: Step 1 (DEO) approved, Step 2 (TGMSIDC User) pending
    if (!indent.approvalSteps || indent.approvalSteps.length === 0) {
      indent.approvalSteps = [
        {
          stepNumber: 1,
          requiredRole: "deo",
          roleLabel: "DEO (Initiator)",
          assignedUserName: actorName,
          assignedUserId: indent.createdByUserId || "deo_user",
          status: "approved",
          actionedAt: new Date(),
          comments: `Reprioritized: Revised Est. Value ₹${newEstimatedTotal.toLocaleString("en-IN")}, AS ₹${currentAs.toLocaleString("en-IN")}. Routed to TGMSIDC for revalidation.`,
        },
        {
          stepNumber: 2,
          requiredRole: "tgmsidc_user",
          roleLabel: "TGMSIDC User (Scrutiny & Revalidation)",
          assignedUserName: "K. Srinivas (TGMSIDC)",
          assignedUserId: "u2",
          status: "pending",
          actionedAt: null,
          comments: "Awaiting TGMSIDC scrutiny and budget revalidation (Step 9).",
        },
        {
          stepNumber: 3,
          requiredRole: "gm_equipment",
          roleLabel: "GM Equipment",
          assignedUserName: "P. Narayan",
          assignedUserId: "u3",
          status: "pending",
          actionedAt: null,
          comments: "",
        },
        {
          stepNumber: 4,
          requiredRole: "so_equipment",
          roleLabel: "SO Equipment",
          assignedUserName: "R. Sharma",
          assignedUserId: "u4",
          status: "pending",
          actionedAt: null,
          comments: "",
        },
        {
          stepNumber: 5,
          requiredRole: "executive_director",
          roleLabel: "Executive Director",
          assignedUserName: "D. Venkatesh",
          assignedUserId: "u5",
          status: "pending",
          actionedAt: null,
          comments: "",
        },
      ];
    } else {
      const step1 = indent.approvalSteps.find((s: any) => s.stepNumber === 1 || s.requiredRole === "deo");
      if (step1) {
        step1.status = "approved";
        step1.actionedAt = new Date();
        step1.comments = `Reprioritization submitted: Revised Est. Value ₹${newEstimatedTotal.toLocaleString("en-IN")}, AS ₹${currentAs.toLocaleString("en-IN")}. Routed to TGMSIDC for revalidation.`;
      }
      const step2 = indent.approvalSteps.find((s: any) => s.stepNumber === 2 || s.requiredRole === "tgmsidc_user");
      if (step2) {
        step2.status = "pending";
        step2.actionedAt = null;
        step2.roleLabel = "TGMSIDC User (Scrutiny & Revalidation)";
        step2.comments = "Awaiting TGMSIDC scrutiny and budget revalidation (Step 9).";
      }
      for (const s of indent.approvalSteps) {
        if (s.stepNumber > 2) {
          s.status = "pending";
          s.actionedAt = null;
        }
      }
    }

    indent.markModified("lineItems");
    indent.markModified("reprioritizationHistory");
    indent.markModified("editAuditTrail");
    indent.markModified("approvalSteps");
    await indent.save();

    await notifyIndentStatusChange(indent, "reprioritized_resubmitted", actorName);
    res.json({ message: "Reprioritized indent submitted to TGMSIDC for revalidation", indent: await formatIndent(indent) });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to reprioritize indent" });
  }
});

/* ── Revalidate Revised Indent (Steps 9 & 10: TGMSIDC User) ────────── */
router.post("/indents/:id/revalidate", async (req, res): Promise<void> => {
  try {
    const indent = await findIndentDoc(req.params.id);
    if (!indent) { res.status(404).json({ error: "Indent not found" }); return; }

    const revalidatedBy = req.body.revalidatedBy || "TGMSIDC Revalidation Officer";

    // Recalculate total estimated value accurately
    let totalEstimated = 0;
    for (const li of (indent.lineItems || [])) {
      if (!li.deferred) {
        const rate = li.rateContractUnitPrice || li.estimatedUnitCost || 0;
        li.estimatedTotalCost = (li.requestedQty || 0) * rate;
        totalEstimated += li.estimatedTotalCost;
      }
    }
    indent.estimatedTotalProcurementValue = totalEstimated;
    indent.estimatedTotalValue = totalEstimated;

    const effectiveAs = indent.revisedAsAmount || indent.asAmount || (indent.institutions || []).reduce((s: number, inst: any) => s + (inst.fundSanctionedAmount || 0), 0) || 0;
    const surplusOrShortfall = effectiveAs - totalEstimated;
    indent.budgetSurplusOrShortfall = surplusOrShortfall;

    if (effectiveAs > 0 && totalEstimated > effectiveAs) {
      indent.budgetSufficiency = "insufficient";
      indent.budgetValidationStatus = "shortfall_detected";
      indent.status = "reprioritization_required";
      indent.verificationStatus = "reprioritization_required";

      if (indent.approvalSteps) {
        const step2 = indent.approvalSteps.find((s: any) => s.stepNumber === 2 || s.requiredRole === "tgmsidc_user");
        if (step2) {
          step2.status = "returned";
          step2.actionedAt = new Date();
          step2.comments = `Revised requirement (₹${totalEstimated.toLocaleString("en-IN")}) still exceeds available AS (₹${effectiveAs.toLocaleString("en-IN")}) by ₹${Math.abs(surplusOrShortfall).toLocaleString("en-IN")}. Returned for further reprioritization.`;
        }
        indent.markModified("approvalSteps");
      }

      if (!indent.editAuditTrail) indent.editAuditTrail = [];
      indent.editAuditTrail.push({
        field: "TGMSIDC Revalidation Shortfall",
        originalValue: "resubmitted_for_review",
        correctedValue: "reprioritization_required",
        correctedBy: revalidatedBy,
        correctedAt: new Date(),
      });
      indent.markModified("editAuditTrail");

      try {
        await AuditLog.create({
          entityType: "indent",
          entityId: indent._id.toString(),
          action: "BUDGET_REVALIDATION_SHORTFALL",
          field: "budgetValidationStatus, status",
          beforeValue: "resubmitted_for_review",
          afterValue: `Requirement exceeds AS by ₹${Math.abs(surplusOrShortfall).toLocaleString("en-IN")}. Returned to DEO.`,
          userId: req.body.userId || "tgmsidc_user",
          userName: revalidatedBy,
          userRole: "tgmsidc_user",
          timestamp: new Date(),
        });
        if (indent.indentNumber) {
          await AuditLog.create({
            entityType: "indent",
            entityId: indent.indentNumber,
            action: "BUDGET_REVALIDATION_SHORTFALL",
            field: "budgetValidationStatus, status",
            beforeValue: "resubmitted_for_review",
            afterValue: `Requirement exceeds AS by ₹${Math.abs(surplusOrShortfall).toLocaleString("en-IN")}. Returned to DEO.`,
            userId: req.body.userId || "tgmsidc_user",
            userName: revalidatedBy,
            userRole: "tgmsidc_user",
            timestamp: new Date(),
          });
        }
      } catch (e) {
        console.error("[AUDIT LOG ERROR]", e);
      }

      indent.markModified("lineItems");
      await indent.save();
      res.status(400).json({
        error: `Revised estimated requirement (₹${totalEstimated.toLocaleString("en-IN")}) still exceeds available AS (₹${effectiveAs.toLocaleString("en-IN")}) by ₹${Math.abs(surplusOrShortfall).toLocaleString("en-IN")}. Further reprioritization or additional AS is required.`,
        indent: await formatIndent(indent),
      });
      return;
    }

    // Step 10: Budget validation complete -> Unlock procurement routing
    indent.budgetSufficiency = "sufficient";
    indent.budgetValidationStatus = "validated_within_as";
    indent.status = "ready_for_procurement";
    indent.verificationStatus = "completed";

    // Unlock line items for PO or Tender
    for (const li of (indent.lineItems || [])) {
      if (li.deferred) {
        li.lineStatus = "deferred";
      } else if (li.rateContractId && li.rateContractUnitPrice) {
        li.lineStatus = "active_rc_matched_po_eligible";
        li.procurementMode = "rate_contract";
      } else {
        li.lineStatus = "no_active_rc_tender_required";
        li.procurementMode = "tender";
      }
    }

    // Step 2: TGMSIDC User approved in approval steps
    if (indent.approvalSteps) {
      const step2 = indent.approvalSteps.find((s: any) => s.stepNumber === 2 || s.requiredRole === "tgmsidc_user");
      if (step2) {
        step2.status = "approved";
        step2.actionedAt = new Date();
        step2.comments = `Budget revalidated within AS (₹${effectiveAs.toLocaleString("en-IN")}). Procurement routing unlocked (Step 10).`;
      }
      const step3 = indent.approvalSteps.find((s: any) => s.stepNumber === 3 || s.requiredRole === "gm_equipment");
      if (step3) {
        step3.status = "pending";
      }
      indent.markModified("approvalSteps");
    }

    if (!indent.editAuditTrail) indent.editAuditTrail = [];
    indent.editAuditTrail.push({
      field: "TGMSIDC Budget Revalidation",
      originalValue: "resubmitted_for_review",
      correctedValue: "ready_for_procurement",
      correctedBy: revalidatedBy,
      correctedAt: new Date(),
    });
    indent.markModified("editAuditTrail");

    try {
      await AuditLog.create({
        entityType: "indent",
        entityId: indent._id.toString(),
        action: "BUDGET_REVALIDATED_APPROVED",
        field: "budgetValidationStatus, status",
        beforeValue: "resubmitted_for_review",
        afterValue: `Validated within AS (₹${effectiveAs.toLocaleString("en-IN")}). Procurement routing unlocked.`,
        userId: req.body.userId || "tgmsidc_user",
        userName: revalidatedBy,
        userRole: "tgmsidc_user",
        timestamp: new Date(),
      });
      if (indent.indentNumber) {
        await AuditLog.create({
          entityType: "indent",
          entityId: indent.indentNumber,
          action: "BUDGET_REVALIDATED_APPROVED",
          field: "budgetValidationStatus, status",
          beforeValue: "resubmitted_for_review",
          afterValue: `Validated within AS (₹${effectiveAs.toLocaleString("en-IN")}). Procurement routing unlocked.`,
          userId: req.body.userId || "tgmsidc_user",
          userName: revalidatedBy,
          userRole: "tgmsidc_user",
          timestamp: new Date(),
        });
      }
    } catch (e) {
      console.error("[AUDIT LOG ERROR]", e);
    }

    indent.markModified("lineItems");
    await indent.save();
    await notifyIndentStatusChange(indent, "budget_validated_ready_for_procurement", revalidatedBy);

    res.json({ message: "Budget validated successfully. Procurement routing unlocked.", indent: await formatIndent(indent) });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to revalidate indent" });
  }
});

/* ── Return to DEO for Correction (§3A Step 9A) ───────────────────────── */
router.post("/indents/:id/return-to-deo", async (req, res): Promise<void> => {
  try {
    // Accept either 'returnComments' or 'remarks' from the client
    const returnComments = req.body.returnComments || req.body.remarks || "";
    const returnedBy = req.body.returnedBy || "TGMSIDC User";

    if (!returnComments) {
      res.status(400).json({ error: "Remarks explaining required corrections are mandatory." });
      return;
    }
    const indent = await findIndentDoc(req.params.id);
    if (!indent) { res.status(404).json({ error: "Indent not found" }); return; }

    const prevStatus = indent.status;
    indent.status = "returned_to_deo_for_correction";
    indent.verificationStatus = "returned_to_deo_for_correction";
    indent.returnComments = returnComments;
    indent.reviewedBy = returnedBy;

    // Update approval steps: mark step 2 (TGMSIDC) as returned, reset DEO step to pending
    if (!indent.approvalSteps) indent.approvalSteps = [];
    const step2 = indent.approvalSteps.find((s: any) => s.stepNumber === 2 || s.requiredRole === "tgmsidc_user");
    if (step2) {
      step2.status = "returned";
      step2.actionedAt = new Date();
      step2.comments = `Returned to DEO for reprioritization. Reason: ${returnComments}`;
    }
    const step1 = indent.approvalSteps.find((s: any) => s.stepNumber === 1 || s.requiredRole === "deo");
    if (step1) {
      step1.status = "pending";
      step1.actionedAt = null;
      step1.comments = `Awaiting DEO reprioritization. TGMSIDC remarks: ${returnComments}`;
    }
    // Keep steps 3+ as pending (no change needed)
    indent.markModified("approvalSteps");

    // Audit trail
    if (!indent.editAuditTrail) indent.editAuditTrail = [];
    indent.editAuditTrail.push({
      field: "Status",
      originalValue: prevStatus,
      correctedValue: "returned_to_deo_for_correction",
      correctedBy: returnedBy,
      correctedAt: new Date(),
    });
    indent.markModified("editAuditTrail");

    try {
      await AuditLog.create({
        entityType: "indent",
        entityId: indent._id.toString(),
        action: "RETURNED_TO_DEO",
        field: "status, verificationStatus, approvalSteps",
        beforeValue: prevStatus,
        afterValue: `returned_to_deo_for_correction — Reason: ${returnComments}`,
        userId: req.body.userId || "tgmsidc_user",
        userName: returnedBy,
        userRole: "tgmsidc_user",
        timestamp: new Date(),
      });
      if (indent.indentNumber) {
        await AuditLog.create({
          entityType: "indent",
          entityId: indent.indentNumber,
          action: "RETURNED_TO_DEO",
          field: "status, verificationStatus, approvalSteps",
          beforeValue: prevStatus,
          afterValue: `returned_to_deo_for_correction — Reason: ${returnComments}`,
          userId: req.body.userId || "tgmsidc_user",
          userName: returnedBy,
          userRole: "tgmsidc_user",
          timestamp: new Date(),
        });
      }
    } catch (auditErr) {
      console.error("[AUDIT LOG ERROR]", auditErr);
    }

    await indent.save();
    await notifyIndentStatusChange(indent, "returned_to_deo", returnedBy);
    res.json(await formatIndent(indent));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/* ── Resubmit Indent for TGMSIDC Verification (§3A Step 9B) ──────────── */
router.post("/indents/:id/resubmit", async (req, res): Promise<void> => {
  try {
    const indent = await findIndentDoc(req.params.id);
    if (!indent) { res.status(404).json({ error: "Indent not found" }); return; }

    indent.status = "pending_tgmsidc_verification";
    indent.verificationStatus = "resubmitted_for_tgmsidc_verification";
    await indent.save();
    await notifyIndentStatusChange(indent, "resubmitted", indent.digitisedBy);
    res.json(await formatIndent(indent));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/* ── Resolve Multiple RCs for Line Item (§3B Step 12C) ─────────────────── */
router.post("/indents/:id/lines/:lineIndex/select-rc", async (req, res): Promise<void> => {
  try {
    const indent = await findIndentDoc(req.params.id);
    if (!indent) { res.status(404).json({ error: "Indent not found" }); return; }
    const idx = parseInt(req.params.lineIndex);
    if (!indent.lineItems || !indent.lineItems[idx]) {
      res.status(404).json({ error: "Line item not found" });
      return;
    }
    const userRole = (req as any).user?.role || req.body.role;
    if (userRole === "deo" || req.body.selectedBy?.toLowerCase().includes("deo")) {
      res.status(403).json({ error: "DEO user cannot select Rate Contracts. Rate Contract tagging is performed by TGMSIDC User (Step 3/11A)." });
      return;
    }
    const { rateContractId } = req.body;
    if (!rateContractId) {
      res.status(400).json({ error: "rateContractId is required" });
      return;
    }
    const rc = await RateContract.findById(rateContractId);
    if (!rc) {
      res.status(404).json({ error: "Selected Rate Contract not found" });
      return;
    }
    const li = indent.lineItems[idx];
    li.rateContractId = rc._id;
    li.rateContractNumber = rc.contractNumber;
    li.rateContractVendor = rc.vendorName;
    li.rateContractUnitPrice = rc.unitPrice;
    li.procurementMode = "rate_contract";
    li.lineStatus = "active_rc_matched_po_eligible";
    indent.markModified("lineItems");
    await indent.save();
    res.json(await formatIndent(indent));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/* ── Raise Purchase Order for Line Item (§3D Step 31-33) ─────────────── */
router.post("/indents/:id/lines/:lineIndex/raise-po", async (req, res): Promise<void> => {
  try {
    const indent = await findIndentDoc(req.params.id);
    if (!indent) { res.status(404).json({ error: "Indent not found" }); return; }
    const idx = parseInt(req.params.lineIndex);
    if (!indent.lineItems || !indent.lineItems[idx]) {
      res.status(404).json({ error: "Line item not found" });
      return;
    }
    const userRole = (req as any).user?.role || req.body.role;
    if (userRole === "deo" || req.body.createdBy?.toLowerCase().includes("deo")) {
      res.status(403).json({ error: "DEO user cannot raise Purchase Orders. PO issuance is performed by TGMSIDC User (Step 16)." });
      return;
    }
    const li = indent.lineItems[idx];
    if (li.deferred) {
      res.status(400).json({ error: "Cannot raise Purchase Order for a deferred equipment line." });
      return;
    }
    if (indent.status === "reprioritization_required" || indent.budgetSufficiency === "insufficient") {
      res.status(400).json({ error: "Cannot raise Purchase Order while indent is pending budget reprioritization. Administrative Sanction must be validated." });
      return;
    }
    let rcId = req.body.rateContractId || li.rateContractId;
    if (!rcId && li.candidateRateContracts && li.candidateRateContracts.length > 0) {
      rcId = li.candidateRateContracts[0].rcId || li.candidateRateContracts[0].rateContractId;
    }
    if (!rcId && indent.rateContractId) {
      rcId = indent.rateContractId;
    }
    if (!rcId) {
      const matchConditions: any[] = [];
      if (li.equipmentId) {
        matchConditions.push({ equipmentId: li.equipmentId });
        if (mongoose.Types.ObjectId.isValid(String(li.equipmentId))) {
          matchConditions.push({ equipmentId: new mongoose.Types.ObjectId(String(li.equipmentId)) });
        }
      }
      if (li.equipmentName) {
        matchConditions.push({ equipmentName: li.equipmentName });
      }
      if (matchConditions.length > 0) {
        const activeRc = await RateContract.findOne({
          $or: matchConditions,
          status: "active"
        }).sort({ endDate: -1 });
        if (activeRc) rcId = activeRc._id;
      }
    }

    if (!rcId) {
      res.status(400).json({ error: "Line item does not have an active rate contract tagged. Please select or tag an active RC first." });
      return;
    }
    const rc = await RateContract.findById(rcId);
    if (!rc) {
      res.status(404).json({ error: "Rate Contract not found" });
      return;
    }

    const vn = await Vendor.findById(rc.vendorId).catch(() => null);
    const quantity = li.requestedQty || 1;
    const unitPrice = rc.unitPrice || 100000;
    const gstRate = rc.gstRate ?? 12;
    const gstAmt = (unitPrice * quantity * gstRate) / 100;
    const total = unitPrice * quantity + gstAmt;

    const count = await PurchaseOrder.countDocuments();
    const poFy = indent.financialYear || "2026-27";
    const poFyCode = poFy.replace("-", "").slice(2);
    const poNumber = `PO-${poFyCode}-${padNum(count + 1)}`;

    const psRequired = req.body.psRequired ?? false;
    const psPercent = req.body.psPercent ?? 5;
    const psAmount = psRequired ? (total * psPercent) / 100 : 0;
    const bgDueDate = psRequired ? (req.body.bgDueDate ? new Date(req.body.bgDueDate) : new Date(Date.now() + 30 * 86400000)) : undefined;

    const indentSnapshot = {
      facilityName: indent.facilityName,
      hodName: indent.hodName,
      indentType: indent.indentType,
      financialYear: indent.financialYear,
      indentDate: indent.indentDate,
      programmeName: indent.programmeName,
      fundingSourceName: indent.fundingSourceName,
      accountHeadName: indent.accountHeadName,
      scannedCopyFilename: indent.scannedCopyFilename,
      scannedCopyDataUrl: indent.scannedCopyDataUrl,
      technicalRequirements: li.specifications || indent.technicalRequirements,
    };

    const po = await PurchaseOrder.create({
      poNumber,
      poType: "rc_based",
      financialYear: poFy,
      indentId: indent._id,
      indentNumber: indent.indentNumber,
      indentLineItemIndex: idx,
      indentDetails: indentSnapshot,
      rateContractId: rc._id,
      rcNumber: rc.contractNumber,
      vendorId: rc.vendorId,
      vendorName: vn?.name || rc.vendorName || "Empanelled Vendor",
      vendorTier: req.body.vendorTier ?? "L1",
      allocationRatio: req.body.allocationRatio ?? "100%",
      equipmentId: li.equipmentId || rc.equipmentId,
      equipmentName: li.equipmentName || rc.equipmentName || "Medical Equipment",
      quantity,
      unitPrice,
      gstRate,
      gstAmount: gstAmt,
      unitPriceInclTax: unitPrice * (1 + gstRate / 100),
      totalEquipmentCost: unitPrice * quantity,
      totalAmount: total,
      deliveryAddress: req.body.deliveryAddress || indent.facilityName || "Telangana Medical Facility",
      supplyPeriodDays: rc.supplyPeriodDays ?? 45,
      expectedDeliveryDate: req.body.expectedDeliveryDate ? new Date(req.body.expectedDeliveryDate) : new Date(Date.now() + (rc.supplyPeriodDays ?? 45) * 86400000),
      consignees: indent.institutions?.length ? indent.institutions.map((inst: any) => ({
        institutionId: inst.institutionId,
        institutionName: inst.institutionName,
        district: inst.district,
        address: `${inst.institutionName}, ${inst.district || "Telangana"}`,
        quantity: inst.quantities?.find((q: any) => q.lineItemIndex === idx)?.sanctionedQty || quantity,
        deliveryStatus: "pending",
      })) : [{
        institutionId: indent.facilityId,
        institutionName: indent.facilityName,
        address: indent.facilityName,
        quantity,
        deliveryStatus: "pending",
      }],
      psRequired,
      psPercent,
      psAmount,
      bgDueDate,
      bgStatus: psRequired ? "pending" : "not_applicable",
      generatedBy: req.body.generatedBy || "TGMSIDC User",
      status: "draft",
      approvalStatus: "draft",
      fulfilmentStatus: "not_fulfilled",
      paymentStatus: "payment_status_not_updated",
      closureStatus: "open",
    });

    li.poId = po._id;
    li.poNumber = po.poNumber;
    li.rateContractId = rc._id;
    li.rateContractNumber = rc.contractNumber;
    li.rateContractVendor = vn?.name || rc.vendorName || "Empanelled Vendor";
    li.rateContractUnitPrice = rc.unitPrice;
    li.lineStatus = "po_drafted";
    indent.markModified("lineItems");
    indent.status = "in_procurement";
    await indent.save();

    await notifyPOStatusChange(po, "created_as_draft", req.body.generatedBy || "TGMSIDC User");

    res.status(201).json({
      message: `Purchase Order ${po.poNumber} created for line item ${idx + 1}`,
      purchaseOrder: po,
      indent: await formatIndent(indent),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/* ── Initiate Tender for Line Item (§3C Step 14) ─────────────────────── */
router.post("/indents/:id/lines/:lineIndex/initiate-tender", async (req, res): Promise<void> => {
  try {
    const indent = await findIndentDoc(req.params.id);
    if (!indent) { res.status(404).json({ error: "Indent not found" }); return; }
    const idx = parseInt(req.params.lineIndex);
    if (!indent.lineItems || !indent.lineItems[idx]) {
      res.status(404).json({ error: "Line item not found" });
      return;
    }
    const li = indent.lineItems[idx];
    const { tenderType = "open", portal = "gem", notes, initiatedBy } = req.body;

    const count = await Tender.countDocuments();
    const tenderYear = new Date().getFullYear();
    const tenderNumber = `TND-${tenderYear}-${padNum(count + 1)}`;

    const tender = await Tender.create({
      tenderNumber,
      indentId: indent._id,
      equipmentId: li.equipmentId,
      equipmentName: li.equipmentName,
      equipmentCategory: li.category || "Medical Equipment",
      tenderType,
      portal,
      financialYear: indent.financialYear || "2026-27",
      status: "tender_initiated",
      currentStageNumber: 1,
      specsStatus: "pending",
      specsConfirmationType: "existing_review",
      notes: notes || `Tender initiated for ${li.equipmentName} (Line ${idx + 1} of Indent ${indent.indentNumber}).`,
    });

    li.tenderId = tender._id;
    li.tenderNumber = tender.tenderNumber;
    li.lineStatus = "tender_initiated";
    indent.markModified("lineItems");
    indent.status = "in_procurement";
    await indent.save();

    res.status(201).json({
      message: `Tender ${tender.tenderNumber} initiated for ${li.equipmentName}`,
      tender,
      indent: await formatIndent(indent),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/indents/:id/approval-steps", async (req, res): Promise<void> => {
  try {
    const indent = await findIndentDoc(req.params.id);
    if (!indent) { res.status(404).json({ error: "Indent not found" }); return; }
    res.json(indent.approvalSteps || []);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to get approval steps" });
  }
});

router.patch("/indents/:id/approval-steps/:stepNumber", async (req, res): Promise<void> => {
  try {
    const indent = await findIndentDoc(req.params.id);
    if (!indent) { res.status(404).json({ error: "Indent not found" }); return; }
    const stepNumber = parseInt(req.params.stepNumber);
    const stepIndex = indent.approvalSteps.findIndex((s: any) => s.stepNumber === stepNumber);
    if (stepIndex === -1) { res.status(404).json({ error: "Step not found" }); return; }

    const { status, comments, approvedBy, procurementMode, rateContractId, lineItemApprovals } = req.body;
    const step = indent.approvalSteps[stepIndex];
    step.status = status;
    step.comments = comments;
    step.actionedAt = new Date();

    if (lineItemApprovals && Array.isArray(lineItemApprovals)) {
      lineItemApprovals.forEach((app: any) => {
        if (indent.lineItems && indent.lineItems[app.lineItemIndex]) {
          indent.lineItems[app.lineItemIndex].approvedQty = app.approvedQty;
          indent.lineItems[app.lineItemIndex].partialReason = app.partialReason;
        }
      });
      indent.markModified("lineItems");
    }

    if (status === "rejected") {
      indent.status = "rejected";
      indent.rejectionReason = comments;
    } else if (status === "returned") {
      indent.status = "returned";
      indent.returnComments = comments;
    } else if (status === "approved") {
      const allApproved = indent.approvalSteps.every((s: any) =>
        s.stepNumber <= stepNumber ? (s.status === "approved" || s.status === "skipped") : true
      );
      const isLastStep = stepNumber === indent.approvalSteps.length;

      // Check for active Rate Contract match
      const eqIds = [
        indent.equipmentId,
        ...(indent.lineItems?.map((li: any) => li.equipmentId) || [])
      ].filter(Boolean);
      const eqNames = [
        indent.equipmentName,
        ...(indent.lineItems?.map((li: any) => li.equipmentName) || [])
      ].filter(Boolean);

      let finalRcId = rateContractId || indent.rateContractId;
      let activeRc: any = null;
      if (finalRcId) {
        activeRc = await RateContract.findOne({ _id: finalRcId, status: "active", endDate: { $gte: new Date() } });
      }
      if (!activeRc) {
        const rcMatchConditions: any[] = [];
        eqIds.forEach(id => {
          const idStr = String(id);
          rcMatchConditions.push({ equipmentId: idStr });
          if (mongoose.Types.ObjectId.isValid(idStr)) {
            rcMatchConditions.push({ equipmentId: new mongoose.Types.ObjectId(idStr) });
          }
        });
        eqNames.forEach(name => {
          rcMatchConditions.push({ equipmentName: name });
        });
        if (rcMatchConditions.length > 0) {
          activeRc = await RateContract.findOne({
            $or: rcMatchConditions,
            status: "active",
            endDate: { $gte: new Date() },
          });
        }
      }

      if (activeRc) {
        finalRcId = activeRc._id;
        indent.rateContractId = activeRc._id;
        if (!procurementMode && !indent.procurementMode) {
          indent.procurementMode = "rate_contract";
        }
      }

      // Update linked drafted POs with scrutiny trails from GM / SO
      const linkedPOs = await PurchaseOrder.find({
        $or: [{ indentId: indent._id }, { indentNumber: indent.indentNumber }]
      });

      if (step.requiredRole === "gm_equipment" || step.requiredRole === "gm") {
        for (const po of linkedPOs) {
          po.gmReviewedBy = approvedBy || step.assignedUserName || "P. Narayan, GM Equipment";
          po.gmReviewNotes = comments || "Rate Contract and Draft PO scrutinized & endorsed.";
          po.approvalTrail = po.approvalTrail || [];
          po.approvalTrail.push({
            level: "GM Equipment",
            actorName: approvedBy || step.assignedUserName || "P. Narayan, GM Equipment",
            role: "gm_equipment",
            action: "approved",
            remarks: comments || "Rate Contract and Draft PO scrutinized & endorsed.",
            actionedAt: new Date(),
          });
          await po.save();
        }
      } else if (step.requiredRole === "so_equipment" || step.requiredRole === "so") {
        for (const po of linkedPOs) {
          po.soApprovedBy = approvedBy || step.assignedUserName || "R. Sharma, SO Equipment";
          po.soApprovalNotes = comments || "Administrative and consignee review completed & endorsed.";
          po.approvalTrail = po.approvalTrail || [];
          po.approvalTrail.push({
            level: "SO Equipment",
            actorName: approvedBy || step.assignedUserName || "R. Sharma, SO Equipment",
            role: "so_equipment",
            action: "approved",
            remarks: comments || "Administrative and consignee review completed & endorsed.",
            actionedAt: new Date(),
          });
          await po.save();
        }
      }

      const isEDStep = step.requiredRole === "executive_director";
      const isTerminalApproval = (isLastStep && allApproved) || isEDStep;

      if (isTerminalApproval) {
        /* Final approval — set terminal status */
        if (procurementMode) indent.procurementMode = procurementMode;
        indent.approvedBy = approvedBy || step.assignedUserName || "D. Venkatesh, Executive Director";

        if (activeRc || linkedPOs.length > 0) {
          indent.rateContractId = activeRc?._id || indent.rateContractId || linkedPOs[0]?.rateContractId;
          indent.procurementMode = "rate_contract";
          indent.status = "po_issued";

          if (linkedPOs.length > 0) {
            // Existing drafted PO(s) transition directly to 'issued'
            for (const po of linkedPOs) {
              po.status = "issued";
              po.approvalStatus = "approved";
              po.approvedBy = approvedBy || step.assignedUserName || "D. Venkatesh, Executive Director";
              po.approvedDate = new Date();
              po.issuedDate = new Date();
              po.generatedBy = po.generatedBy || approvedBy || step.assignedUserName || "Executive Director, TGMSIDC";
              po.approvalTrail = po.approvalTrail || [];
              po.approvalTrail.push({
                level: "Executive Director",
                actorName: approvedBy || step.assignedUserName || "D. Venkatesh, Executive Director",
                role: "executive_director",
                action: "approved",
                remarks: comments || "Final sanction accorded on Indent approval. Purchase order officially issued to vendor.",
                actionedAt: new Date(),
              });
              await po.save();
              await notifyPOStatusChange(po, "issued_to_vendor", approvedBy || step.assignedUserName);
            }

            indent.purchaseOrderId = linkedPOs[0]._id;
            indent.poNumber = linkedPOs[0].poNumber;

            if (indent.lineItems && indent.lineItems.length > 0) {
              for (const li of indent.lineItems) {
                li.lineStatus = "po_issued";
                const matchedPO = linkedPOs.find((p: any) =>
                  String(p.equipmentId) === String(li.equipmentId) ||
                  p.equipmentName === li.equipmentName ||
                  String(p._id) === String(li.poId)
                ) || linkedPOs[0];
                li.poId = matchedPO._id;
                li.poNumber = matchedPO.poNumber;
                li.procurementMode = "rate_contract";
              }
              indent.markModified("lineItems");
            }
          } else {
            // Auto-generate fallback PO if no PO was drafted beforehand
            const vn = await Vendor.findById(activeRc.vendorId).catch(() => null);
            const quantity = indent.quantity || indent.lineItems?.[0]?.requestedQty || 1;
            const unitPrice = activeRc.unitPrice || 100000;
            const gstRate = activeRc.gstRate ?? 12;
            const gstAmt = (unitPrice * quantity * gstRate) / 100;
            const total = unitPrice * quantity + gstAmt;
            const count = await PurchaseOrder.countDocuments();
            const poFy = indent.financialYear || "2026-27";
            const poFyCode = poFy.replace("-", "").slice(2);
            const poNumber = `PO-${poFyCode}-${String(count + 1).padStart(4, "0")}`;

            const po = await PurchaseOrder.create({
              poNumber,
              poType: "rc_based",
              financialYear: poFy,
              indentId: indent._id,
              indentNumber: indent.indentNumber,
              rateContractId: activeRc._id,
              rcNumber: activeRc.contractNumber,
              vendorId: activeRc.vendorId,
              vendorName: vn?.name || activeRc.vendorName || "Empanelled Vendor",
              vendorTier: "L1",
              allocationRatio: "100%",
              equipmentId: indent.equipmentId || activeRc.equipmentId || indent.lineItems?.[0]?.equipmentId,
              equipmentName: indent.lineItems?.[0]?.equipmentName || indent.equipmentName || activeRc.equipmentName || "Medical Equipment",
              quantity,
              unitPrice,
              gstRate,
              gstAmount: gstAmt,
              unitPriceInclTax: unitPrice * (1 + gstRate / 100),
              totalEquipmentCost: unitPrice * quantity,
              totalAmount: total,
              deliveryAddress: indent.facilityName || "Telangana Medical Facility",
              supplyPeriodDays: activeRc.supplyPeriodDays ?? 45,
              expectedDeliveryDate: new Date(Date.now() + (activeRc.supplyPeriodDays ?? 45) * 86400000),
              consignees: [
                {
                  institutionId: indent.facilityId,
                  institutionName: indent.facilityName || "Telangana Medical Facility",
                  district: indent.institutions?.[0]?.district || "Hyderabad",
                  address: indent.facilityName || "Telangana Medical Facility",
                  quantity,
                  deliveryStatus: "pending",
                },
              ],
              approvalStatus: "approved",
              approvedBy: approvedBy || step.assignedUserName || "Executive Director, TGMSIDC",
              approvedDate: new Date(),
              status: "issued",
              vendorAcknowledged: false,
              generatedBy: approvedBy || step.assignedUserName || "Executive Director, TGMSIDC",
              fileNo: indent.indentRefNumber || `RC/HPC/EQU/${indent.financialYear || "2025-26"}/${indent.indentNumber}`,
            });

            indent.purchaseOrderId = po._id;
            indent.poNumber = po.poNumber;

            if (indent.lineItems && indent.lineItems.length > 0) {
              for (const li of indent.lineItems) {
                li.poId = po._id;
                li.poNumber = po.poNumber;
                li.lineStatus = "po_issued";
                li.rateContractId = activeRc._id;
                li.procurementMode = "rate_contract";
              }
              indent.markModified("lineItems");
            }
            await notifyPOStatusChange(po, "issued_to_vendor", approvedBy || step.assignedUserName);
          }
        } else {
          // No active Rate Contract available: seamlessly route into Open Tendering
          indent.rateContractId = undefined;
          indent.procurementMode = "tender";
          indent.status = "tender_initiated";

          if (!indent.tenderId) {
            const count = await Tender.countDocuments();
            const tenderYear = new Date().getFullYear();
            const tenderNumber = `TND-${tenderYear}-${padNum(count + 1)}`;
            const tender = await Tender.create({
              tenderNumber,
              indentId: indent._id,
              equipmentId: indent.equipmentId || (indent.lineItems?.[0]?.equipmentId ?? undefined),
              equipmentName: indent.lineItems?.length ? indent.lineItems.map((li: any) => li.equipmentName).join(", ") : (indent.equipmentName || "Medical Equipment"),
              equipmentCategory: indent.lineItems?.[0]?.category || "Medical Equipment",
              tenderType: "open",
              portal: "gem",
              financialYear: indent.financialYear || "2025-26",
              status: "invited",
              tenderInvitedDate: new Date(),
              currentStageNumber: 1,
              notes: `Tender initiated on final approval by ${approvedBy || step.assignedUserName} (Rate Contract not available for requested equipment).`,
            });
            indent.tenderId = tender._id;
          }
        }
      }
    }

    indent.markModified("approvalSteps");
    await indent.save();

    await notifyIndentStatusChange(indent, "step_approved", approvedBy || step.assignedUserName);
    res.json(await formatIndent(indent));
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to update approval step" });
  }
});

router.post("/indents/:id/initiate-tender", async (req, res): Promise<void> => {
  try {
    const indent = await findIndentDoc(req.params.id);
    if (!indent) {
      res.status(404).json({ error: "Indent not found" });
      return;
    }

    const { tenderType = "open", portal = "gem", notes, initiatedBy } = req.body;

    // If already has a tender, return it
    if (indent.tenderId) {
      const existingTender = await Tender.findById(indent.tenderId);
      if (existingTender) {
        res.json({
          message: `Tender ${existingTender.tenderNumber} is already linked to this indent`,
          tender: existingTender,
          indent: await formatIndent(indent),
        });
        return;
      }
    }

    // Determine equipment name and category for the tender
    const missingOrAllEquipmentNames = indent.lineItems?.length
      ? indent.lineItems.map((li: any) => li.equipmentName).join(", ")
      : indent.equipmentName || "Medical Equipment";

    const count = await Tender.countDocuments();
    const tenderYear = new Date().getFullYear();
    const tenderNumber = `TND-${tenderYear}-${padNum(count + 1)}`;

    const tender = await Tender.create({
      tenderNumber,
      indentId: indent._id,
      equipmentId: indent.equipmentId || (indent.lineItems?.[0]?.equipmentId ?? undefined),
      equipmentName: missingOrAllEquipmentNames,
      equipmentCategory: indent.lineItems?.[0]?.category || "Medical Equipment",
      tenderType: tenderType || "open",
      portal: portal || "gem",
      financialYear: indent.financialYear || "2025-26",
      status: "invited",
      tenderInvitedDate: new Date(),
      currentStageNumber: 1,
      notes: notes || `Tender initiated for Indent ${indent.indentNumber} (${indent.facilityName}) — Rate Contract not available/expired under TGMSIDC statutory rule BR-02.`,
    });

    // Update indent status and procurement mode
    indent.status = "tender_initiated";
    indent.procurementMode = "tender";
    indent.tenderId = tender._id;

    if (indent.approvalSteps?.length) {
      indent.approvalSteps.forEach((s: any) => {
        if (s.status === "pending") {
          s.comments = `Routed to Tendering (${tenderNumber}) by ${initiatedBy || "Procurement Officer"}`;
        }
      });
      indent.markModified("approvalSteps");
    }

    await indent.save();
    await notifyIndentStatusChange(indent, "tender_initiated", initiatedBy || "Procurement Officer");

    res.status(201).json({
      message: `Tender ${tenderNumber} successfully initiated for ${indent.indentNumber}`,
      tender,
      indent: await formatIndent(indent),
    });
  } catch (err: any) {
    console.error("[INITIATE TENDER ERROR]", err);
    res.status(500).json({ error: err.message || "Failed to initiate tendering process" });
  }
});

/* Write-in Equipment Resolution (Process Book §1 Step 12 & §12 F-38) */
router.post("/indents/:id/resolve-write-in", async (req, res): Promise<void> => {
  try {
    const indent = await findIndentDoc(req.params.id);
    if (!indent) { res.status(404).json({ error: "Indent not found" }); return; }

    const { lineItemIndex = 0, action, mappedEquipmentId, newEquipmentName, category, specifications, estimatedUnitCost, resolvedBy, comments } = req.body;
    const lineItem = indent.lineItems?.[lineItemIndex];
    if (!lineItem) { res.status(400).json({ error: "Line item not found" }); return; }

    const originalName = lineItem.equipmentName;

    if (action === "map_to_master") {
      const eq = await Equipment.findById(mappedEquipmentId);
      if (!eq) { res.status(400).json({ error: "Mapped equipment master item not found" }); return; }

      lineItem.equipmentId = eq._id;
      lineItem.equipmentName = eq.name;
      lineItem.category = eq.category || lineItem.category;
      lineItem.specifications = eq.specifications || lineItem.specifications;
      lineItem.isWriteIn = false;
      lineItem.writeInResolution = "mapped_to_master";
      lineItem.mappedEquipmentId = eq._id;
      if (eq.estimatedUnitCost) lineItem.estimatedUnitCost = eq.estimatedUnitCost;

      if (!indent.editAuditTrail) indent.editAuditTrail = [];
      indent.editAuditTrail.push({
        field: `Line Item #${lineItemIndex + 1} Equipment Mapping`,
        originalValue: `Write-in: ${originalName}`,
        correctedValue: `Mapped to Master: ${eq.name} (${eq.equipmentCode || eq._id})`,
        correctedBy: resolvedBy || "TGMSIDC Reviewer",
        correctedAt: new Date(),
      });
    } else if (action === "new_addition_requested") {
      lineItem.writeInResolution = "new_addition_requested";
      if (newEquipmentName) lineItem.equipmentName = newEquipmentName;
      if (specifications) lineItem.specifications = specifications;
      if (category) lineItem.category = category;
      if (estimatedUnitCost) lineItem.estimatedUnitCost = estimatedUnitCost;

      if (!indent.editAuditTrail) indent.editAuditTrail = [];
      indent.editAuditTrail.push({
        field: `Line Item #${lineItemIndex + 1} Equipment Request`,
        originalValue: `Write-in: ${originalName}`,
        correctedValue: `Raised New Equipment Request to GM: ${newEquipmentName || originalName}`,
        correctedBy: resolvedBy || "TGMSIDC Reviewer",
        correctedAt: new Date(),
      });

      // Notify GM Equipment
      await Notification.create({
        type: "indent_status",
        title: `New Equipment Master Addition Request — Indent ${indent.indentNumber}`,
        message: `DEO write-in equipment "${newEquipmentName || originalName}" for ${indent.facilityName} submitted for GM Equipment review & master addition.`,
        userId: "gm_equipment",
        entityType: "indent",
        entityId: indent._id.toString(),
        priority: "normal",
      }).catch(() => {});
    }

    indent.markModified("lineItems");
    indent.markModified("editAuditTrail");
    await indent.save();

    res.json({
      message: "Write-in equipment resolved successfully",
      indent: await formatIndent(indent),
    });
  } catch (err: any) {
    console.error("[RESOLVE WRITE-IN ERROR]", err);
    res.status(500).json({ error: err.message || "Failed to resolve write-in" });
  }
});

/* Side-by-side Edit Audit Trail logger (Process Book §1 Step 11) */
router.post("/indents/:id/edit-audit", async (req, res): Promise<void> => {
  try {
    const indent = await findIndentDoc(req.params.id);
    if (!indent) { res.status(404).json({ error: "Indent not found" }); return; }

    const { changes, updatedFields, editedBy } = req.body;
    if (updatedFields && typeof updatedFields === "object") {
      Object.assign(indent, updatedFields);
    }

    if (Array.isArray(changes)) {
      if (!indent.editAuditTrail) indent.editAuditTrail = [];
      for (const ch of changes) {
        indent.editAuditTrail.push({
          field: ch.field,
          originalValue: String(ch.originalValue ?? ""),
          correctedValue: String(ch.newValue ?? ""),
          correctedBy: editedBy || "TGMSIDC Verification Officer",
          correctedAt: new Date(),
        });
      }
      indent.markModified("editAuditTrail");
    }

    await indent.save();
    res.json({
      message: "Indent updated and edit audit trail recorded",
      indent: await formatIndent(indent),
    });
  } catch (err: any) {
    console.error("[EDIT AUDIT ERROR]", err);
    res.status(500).json({ error: err.message || "Failed to record edit audit" });
  }
});

/* Comprehensive End-to-End Procurement Lifecycle Progression */
router.post("/indents/:id/advance-lifecycle", async (req, res): Promise<void> => {
  try {
    const indent = await findIndentDoc(req.params.id);
    if (!indent) {
      res.status(404).json({ error: "Indent not found" });
      return;
    }

    const { action = "auto_complete_all", actorName = "Authorised Officer" } = req.body;

    // 1. Resolve or Create PO
    let po = await PurchaseOrder.findOne({ indentId: indent._id });
    if (!po) {
      let rc = indent.rateContractId ? await RateContract.findById(indent.rateContractId) : null;
      if (!rc) {
        const eqIds = [indent.equipmentId, ...(indent.lineItems?.map((li: any) => li.equipmentId) || [])].filter(Boolean);
        const eqNames = [indent.equipmentName, ...(indent.lineItems?.map((li: any) => li.equipmentName) || [])].filter(Boolean);
        const rcConditions: any[] = [];
        eqIds.forEach(id => {
          const idStr = String(id);
          rcConditions.push({ equipmentId: idStr });
          if (mongoose.Types.ObjectId.isValid(idStr)) {
            rcConditions.push({ equipmentId: new mongoose.Types.ObjectId(idStr) });
          }
        });
        eqNames.forEach(name => {
          rcConditions.push({ equipmentName: name });
        });
        if (rcConditions.length > 0) {
          rc = await RateContract.findOne({ $or: rcConditions, status: "active" });
        }
      }
      if (!rc) rc = await RateContract.findOne({ status: "active" });

      if (!rc) {
        res.status(400).json({ error: "No active rate contract found to link PO" });
        return;
      }

      const vn = await Vendor.findById(rc.vendorId).catch(() => null);
      const quantity = indent.quantity || indent.lineItems?.[0]?.requestedQty || 1;
      const unitPrice = rc.unitPrice || 100000;
      const gstRate = rc.gstRate ?? 12;
      const gstAmt = (unitPrice * quantity * gstRate) / 100;
      const total = unitPrice * quantity + gstAmt;
      const count = await PurchaseOrder.countDocuments();
      const poNumber = `PO-2526-${String(count + 1).padStart(4, "0")}`;

      po = await PurchaseOrder.create({
        poNumber,
        poType: "rc_based",
        financialYear: indent.financialYear || "2025-26",
        indentId: indent._id,
        indentNumber: indent.indentNumber,
        rateContractId: rc._id,
        rcNumber: rc.contractNumber,
        vendorId: rc.vendorId,
        vendorName: vn?.name || rc.vendorName || "Empanelled Vendor",
        vendorTier: "L1",
        allocationRatio: "100%",
        equipmentId: indent.equipmentId || rc.equipmentId || indent.lineItems?.[0]?.equipmentId,
        equipmentName: indent.lineItems?.[0]?.equipmentName || indent.equipmentName || rc.equipmentName || "Medical Equipment",
        quantity,
        unitPrice,
        gstRate,
        gstAmount: gstAmt,
        unitPriceInclTax: unitPrice * (1 + gstRate / 100),
        totalEquipmentCost: unitPrice * quantity,
        totalAmount: total,
        deliveryAddress: indent.facilityName || "Telangana Medical Facility",
        supplyPeriodDays: rc.supplyPeriodDays ?? 45,
        expectedDeliveryDate: new Date(Date.now() + (rc.supplyPeriodDays ?? 45) * 86400000),
        consignees: [
          {
            institutionId: indent.facilityId,
            institutionName: indent.facilityName || "Telangana Medical Facility",
            district: indent.institutions?.[0]?.district || "Hyderabad",
            address: indent.facilityName || "Telangana Medical Facility",
            quantity,
            deliveryStatus: "pending",
          },
        ],
        approvalStatus: "approved",
        approvedBy: actorName || "Executive Director, TGMSIDC",
        approvedDate: new Date(),
        status: "approved",
        generatedBy: actorName || "Executive Director, TGMSIDC",
        fileNo: indent.indentRefNumber || `RC/HPC/EQU/${indent.financialYear || "2025-26"}/${indent.indentNumber}`,
      });

      indent.status = "po_issued";
      indent.rateContractId = rc._id;
      if (indent.lineItems?.length) {
        for (const li of indent.lineItems) {
          li.poId = po._id;
          li.rateContractId = rc._id;
          li.procurementMode = "rate_contract";
        }
        indent.markModified("lineItems");
      }
      await indent.save();
    }

    // 2. Resolve or Create Delivery
    let delivery = await Delivery.findOne({ purchaseOrderId: po._id });
    if (!delivery) {
      const delCount = await Delivery.countDocuments();
      delivery = await Delivery.create({
        deliveryTrackingId: `DEL-${String(delCount + 1).padStart(5, "0")}`,
        purchaseOrderId: po._id,
        poNumber: po.poNumber,
        vendorId: po.vendorId,
        vendorName: po.vendorName,
        facilityId: indent.facilityId,
        facilityName: indent.facilityName,
        equipmentId: po.equipmentId,
        equipmentName: po.equipmentName,
        orderedQty: po.quantity,
        quantity: po.quantity,
        receivedQty: 0,
        dispatchDate: new Date(),
        transporterName: "TGMSIDC Central Cold Chain & Heavy Transport",
        transporterVehicle: "TS-09-UB-4812",
        lrGrNumber: `LR-TG-${String(delCount + 101).padStart(4, "0")}`,
        challanNumber: `DC-${po.poNumber.slice(-4)}`,
        invoiceNumber: `INV-${po.poNumber.slice(-4)}`,
        expectedDeliveryDate: new Date(Date.now() + 7 * 86400000),
        status: "dispatched",
        condition: "good",
        installationRequired: true,
        installationStatus: "pending",
      });
    }

    // 3. Process Requested Stage
    if (action === "confirm_delivery" || action === "auto_complete_all") {
      delivery.status = "delivered";
      delivery.deliveredDate = new Date();
      delivery.receivedQty = delivery.quantity;
      delivery.receivedBy = (indent as any).superintendentName || indent.hodName || "Medical Superintendent";
      delivery.condition = "good";
      if (po.consignees?.length) {
        po.consignees[0].deliveryStatus = "delivered";
        po.markModified("consignees");
        await po.save();
      }
      await delivery.save();
    }

    if (action === "pass_qa" || action === "auto_complete_all") {
      delivery.status = "delivered";
      delivery.qaDecision = "accepted";
      delivery.qaComplianceScore = 100;
      delivery.qaInspectionDate = new Date();
      delivery.qaCommitteeName = "Institutional Biomedical QA Committee";
      delivery.qaNotes = "Equipment fully inspected and meets all technical specifications and safety parameters. NABL calibration verified.";
      delivery.qaInspectionItems = [
        { parameterName: "Physical Condition & Protective Packaging", result: "pass", remarks: "Packaging intact, no dent/scratch" },
        { parameterName: "Power & Electrical Safety Compliance", result: "pass", remarks: "Earthing and stabilizer verified" },
        { parameterName: "Technical Specifications Verification", result: "pass", remarks: "Model and serial match RC specs" },
        { parameterName: "Operational & Clinical Load Demo", result: "pass", remarks: "Tested under clinical load successfully" },
        { parameterName: "Calibration & Accuracy Certification", result: "pass", remarks: "Traceable NABL calibration verified" },
        { parameterName: "User Manuals, Accessories & Warranty", result: "pass", remarks: "Operating manual & warranty card delivered" },
      ];
      delivery.documentsUploaded = true;
      delivery.deliveryCertUploaded = true;
      delivery.deliveryCertDate = new Date();
      delivery.deliveryCertFilename = "DCC_Signed_Stamped.pdf";
      await delivery.save();
    }

    if (action === "issue_grn" || action === "auto_complete_all") {
      delivery.status = "accepted";
      delivery.acceptanceCertificateIssued = true;
      delivery.acceptanceCertDate = new Date();
      delivery.installationStatus = "complete";
      delivery.installationDate = new Date();
      delivery.trainingCompleted = true;
      delivery.trainingDate = new Date();
      delivery.warrantyStartDate = new Date();
      delivery.warrantyEndDate = new Date(Date.now() + 365 * 86400000);
      await delivery.save();

      po.status = "delivered";
      await po.save();

      indent.status = "completed";
      await indent.save();
    }

    if (action === "record_payment" || action === "auto_complete_all" || action === "release_tranche1" || action === "release_tranche2") {
      const total = po.totalAmount || 0;
      const t1Calculated = po.tranche1Amount || Math.round(total * 0.9);
      const t2Calculated = po.tranche2Amount || (total - t1Calculated);
      const genRef = () => `UTR-TG-${Math.floor(10000000 + Math.random() * 90000000)}`;

      if (action === "release_tranche1") {
        po.tranche1Paid = true;
        po.tranche1PaidDate = new Date();
        po.tranche1Reference = po.tranche1Reference || genRef();
        po.tranche1PaidBy = "TGMSIDC Accounts Officer";
        po.tranche1Amount = t1Calculated;
        po.paymentStatus = po.tranche2Paid ? "paid" : "partial";
        po.paymentAmount = (po.tranche2Paid ? t2Calculated : 0) + t1Calculated;
        po.paymentReference = po.tranche1Reference;
      } else if (action === "release_tranche2") {
        po.tranche2Paid = true;
        po.tranche2PaidDate = new Date();
        po.tranche2Reference = po.tranche2Reference || genRef();
        po.tranche2PaidBy = "TGMSIDC Accounts Officer";
        po.tranche2Amount = t2Calculated;
        po.paymentStatus = po.tranche1Paid ? "paid" : "partial";
        po.paymentAmount = (po.tranche1Paid ? t1Calculated : 0) + t2Calculated;
        po.paymentReference = po.tranche2Reference;
      } else {
        po.paymentStatus = "paid";
        po.paymentReference = po.paymentReference || genRef();
        po.paymentDate = new Date();
        po.paymentAmount = total;
        po.tranche1Paid = true;
        po.tranche1PaidDate = po.tranche1PaidDate || po.paymentDate;
        po.tranche1Reference = po.tranche1Reference || po.paymentReference;
        po.tranche1PaidBy = "TGMSIDC Accounts Officer";
        po.tranche1Amount = t1Calculated;
        po.tranche2Paid = true;
        po.tranche2PaidDate = po.tranche2PaidDate || po.paymentDate;
        po.tranche2Reference = po.tranche2Reference || genRef();
        po.tranche2PaidBy = "TGMSIDC Accounts Officer";
        po.tranche2Amount = t2Calculated;
      }

      po.paidBy = "TGMSIDC Accounts Officer";
      po.paymentRemarks = "Payment released against final acceptance certificate and verified invoice.";
      if (!po.paymentHistory) po.paymentHistory = [];
      po.paymentHistory.push({
        paymentStatus: po.paymentStatus,
        tranche: action === "release_tranche1" ? "tranche1_90" : action === "release_tranche2" ? "tranche2_10" : "full",
        paymentReference: po.paymentReference,
        paymentDate: new Date(),
        paymentAmount: action === "release_tranche1" ? t1Calculated : action === "release_tranche2" ? t2Calculated : total,
        paidBy: po.paidBy,
        remarks: po.paymentRemarks,
        recordedAt: new Date(),
      });
      await po.save();

      if (po.paymentStatus === "paid") {
        delivery.paymentStatus = "paid";
        await delivery.save();
      }

      await syncPOPaymentToIndent(po);
    }

    res.json({
      message: `Lifecycle successfully updated (${action})`,
      indent: await formatIndent(indent),
      po,
      delivery,
    });
  } catch (err: any) {
    console.error("[ADVANCE LIFECYCLE ERROR]", err);
    res.status(500).json({ error: err.message || "Failed to advance lifecycle" });
  }
});

export default router;
