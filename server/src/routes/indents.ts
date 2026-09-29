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
import { notifyPOStatusChange } from "./purchase-orders.js";

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

  let rateContractNumber = null;
  let rateContractVendor = null;
  let rateContractUnitPrice = null;
  let rateContractValidityEnd = null;
  let rateContractStatus = null;
  if (r.rateContractId) {
    const rc = await RateContract.findById(r.rateContractId).catch(() => null);
    if (rc) {
      rateContractNumber = rc.contractNumber;
      rateContractVendor = rc.vendorName;
      rateContractUnitPrice = rc.unitPrice;
      rateContractValidityEnd = rc.endDate ? (rc.endDate instanceof Date ? rc.endDate.toISOString() : new Date(rc.endDate).toISOString()) : null;
      rateContractStatus = rc.status;
    }
  }

  // Enrich each line item with RC coverage and tendering requirement
  const enrichedLineItems = await Promise.all((r.lineItems ?? []).map(async (li: any) => {
    const liObj = typeof li.toObject === "function" ? li.toObject() : { ...li };
    let itemRC = null;
    if (li.equipmentId) {
      itemRC = await RateContract.findOne({ equipmentId: li.equipmentId, status: "active" }).catch(() => null);
      if (!itemRC) {
        itemRC = await RateContract.findOne({ equipmentId: li.equipmentId }).sort({ endDate: -1 }).catch(() => null);
      }
    }

    const hasActiveRC = !!(itemRC && itemRC.status === "active");
    const isExpiredRC = !!(itemRC && itemRC.status === "expired");

    return {
      ...liObj,
      rcStatus: hasActiveRC ? "active" : isExpiredRC ? "expired" : "not_available",
      hasActiveRC,
      rateContractId: itemRC?._id?.toString() ?? null,
      rateContractNumber: itemRC?.contractNumber ?? null,
      rateContractVendor: itemRC?.vendorName ?? null,
      rateContractUnitPrice: itemRC?.unitPrice ?? null,
      rateContractValidityEnd: itemRC?.endDate ? (itemRC.endDate instanceof Date ? itemRC.endDate.toISOString() : new Date(itemRC.endDate).toISOString()) : null,
      isTenderRequired: !hasActiveRC,
    };
  }));

  const hasItems = enrichedLineItems.length > 0;
  const activeRCCount = enrichedLineItems.filter((i: any) => i.hasActiveRC).length;
  const missingRCCount = enrichedLineItems.filter((i: any) => !i.hasActiveRC).length;
  const hasFullRCCoverage = hasItems ? missingRCCount === 0 : !!r.rateContractId;
  const hasPartialRCCoverage = hasItems && activeRCCount > 0 && missingRCCount > 0;
  const tenderRequired = hasItems ? missingRCCount > 0 : !r.rateContractId;
  const missingRCItems = enrichedLineItems.filter((i: any) => !i.hasActiveRC).map((i: any) => i.equipmentName);

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
    financialYear: r.financialYear ?? "2025-26",
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
    procurementMode: r.procurementMode ?? null,
    rateContractId: r.rateContractId?.toString() ?? null,
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
    attachments: (r.attachments && r.attachments.length > 0) ? r.attachments : [
      {
        name: r.scannedCopyFilename || `Official_Sanction_${r.indentNumber.replace(/[\/\\:]/g, '_')}.pdf`,
        size: "1.4 MB",
        type: "Facility Sanction Order & Requisition Copy",
        date: r.createdAt.toISOString(),
        status: "Verified",
      },
      {
        name: "Technical_Specifications_Compliance.pdf",
        size: "840 KB",
        type: "Technical Requirement Spec Sheet",
        date: r.createdAt.toISOString(),
        status: "Verified",
      },
      {
        name: "Administrative_Sanction_GO.pdf",
        size: "620 KB",
        type: "G.O. Ms. / Directorate Approval Ref",
        date: r.createdAt.toISOString(),
        status: "Verified",
      },
    ],
    scannedCopyFilename: r.scannedCopyFilename ?? null,
    scannedCopyDataUrl: r.scannedCopyDataUrl ?? null,
    accountHeadName: r.accountHeadName ?? null,
    programmeName: r.programmeName ?? null,
    fundingSourceName: r.fundingSourceName ?? null,
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
    const fy = financialYear || "2025-26";
    const indentNumber = `IND-${fy.replace("-", "")}-${padNum(count + 1)}`;

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
    const activeRc = allEqIds.length > 0 ? await RateContract.findOne({
      equipmentId: { $in: allEqIds },
      status: "active",
      endDate: { $gte: new Date() },
    }) : null;

    const determinedProcurementMode = activeRc ? "rate_contract" : (req.body.procurementMode || "tender");
    const determinedRateContractId = activeRc ? activeRc._id : (req.body.rateContractId || undefined);

    if (activeRc) {
      for (const li of normalizedLineItems) {
        if (!li.equipmentId || String(li.equipmentId) === String(activeRc.equipmentId)) {
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

    /* Build approval chain */
    const isHighValue = totalEstVal >= 500000;

    const steps: any[] = [
      { stepNumber: 1, requiredRole: "deo", roleLabel: "DEO (Initiator)", assignedUserName: digitisedBy, assignedUserId: createdByUserId || "sys", status: "approved", actionedAt: new Date(), comments: "Indent submitted." },
      { stepNumber: 2, requiredRole: "tgmsidc_user", roleLabel: "TGMSIDC User", assignedUserName: "K. Srinivas", assignedUserId: "u2", status: "pending", actionedAt: null, comments: "" },
      { stepNumber: 3, requiredRole: "gm_equipment", roleLabel: "GM Equipment", assignedUserName: "P. Narayan", assignedUserId: "u3", status: "pending", actionedAt: null, comments: "" },
      { stepNumber: 4, requiredRole: "so_equipment", roleLabel: "SO Equipment", assignedUserName: "R. Sharma", assignedUserId: "u4", status: "pending", actionedAt: null, comments: "" },
    ];
    if (isHighValue) {
      steps.push({ stepNumber: 5, requiredRole: "executive_director", roleLabel: "Executive Director", assignedUserName: "D. Venkatesh", assignedUserId: "u5", status: "pending", actionedAt: null, comments: "" });
    }

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

    let finalRcId = rateContractId || indent.rateContractId;
    let activeRc: any = null;
    if (finalRcId) {
      activeRc = await RateContract.findOne({ _id: finalRcId, status: "active", endDate: { $gte: new Date() } });
    }
    if (!activeRc && eqIds.length > 0) {
      activeRc = await RateContract.findOne({ equipmentId: { $in: eqIds }, status: "active", endDate: { $gte: new Date() } });
    }

    if (activeRc) {
      finalRcId = activeRc._id;
      indent.rateContractId = activeRc._id;
      indent.procurementMode = "rate_contract";
      indent.status = "po_issued";
      indent.approvedBy = approvedBy || "Authorised Officer";

      // Auto-generate PO for RC Vendor
      let po = await PurchaseOrder.findOne({ indentId: indent._id });
      if (!po) {
        const vn = await Vendor.findById(activeRc.vendorId).catch(() => null);
        const quantity = indent.quantity || indent.lineItems?.[0]?.requestedQty || 1;
        const unitPrice = activeRc.unitPrice || 100000;
        const gstRate = activeRc.gstRate ?? 12;
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
          fileNo: indent.indentRefNumber || `RC/HPC/EQU/${indent.financialYear || "2025-26"}/${indent.indentNumber}`,
        });

        if (indent.lineItems && indent.lineItems.length > 0) {
          for (const li of indent.lineItems) {
            li.poId = po._id;
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

    const { status, comments, approvedBy, procurementMode, rateContractId } = req.body;
    const step = indent.approvalSteps[stepIndex];
    step.status = status;
    step.comments = comments;
    step.actionedAt = new Date();

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

      let finalRcId = rateContractId || indent.rateContractId;
      let activeRc: any = null;
      if (finalRcId) {
        activeRc = await RateContract.findOne({ _id: finalRcId, status: "active", endDate: { $gte: new Date() } });
      }
      if (!activeRc && eqIds.length > 0) {
        activeRc = await RateContract.findOne({ equipmentId: { $in: eqIds }, status: "active", endDate: { $gte: new Date() } });
      }

      if (activeRc) {
        finalRcId = activeRc._id;
        indent.rateContractId = activeRc._id;
        if (!procurementMode && !indent.procurementMode) {
          indent.procurementMode = "rate_contract";
        }
      }

      if (isLastStep && allApproved) {
        /* Final approval — set terminal status */
        if (procurementMode) indent.procurementMode = procurementMode;
        indent.approvedBy = approvedBy || step.assignedUserName;

        if (activeRc) {
          indent.rateContractId = activeRc._id;
          indent.procurementMode = "rate_contract";
          indent.status = "po_issued";

          // Auto-generate and issue Purchase Order to RC Vendor
          let po = await PurchaseOrder.findOne({ indentId: indent._id });
          if (!po) {
            const vn = await Vendor.findById(activeRc.vendorId).catch(() => null);
            const quantity = indent.quantity || indent.lineItems?.[0]?.requestedQty || 1;
            const unitPrice = activeRc.unitPrice || 100000;
            const gstRate = activeRc.gstRate ?? 12;
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

            // Update line items
            if (indent.lineItems && indent.lineItems.length > 0) {
              for (const li of indent.lineItems) {
                li.poId = po._id;
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
        if (eqIds.length > 0) {
          rc = await RateContract.findOne({ equipmentId: { $in: eqIds }, status: "active" });
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

    if (action === "record_payment" || action === "auto_complete_all") {
      po.paymentStatus = "paid";
      po.paymentReference = `UTR-TG-${Math.floor(10000000 + Math.random() * 90000000)}`;
      po.paymentDate = new Date();
      po.paymentAmount = po.totalAmount;
      po.paidBy = "TGMSIDC Accounts Officer";
      po.paymentRemarks = "Payment released against final acceptance certificate and verified invoice.";
      if (!po.paymentHistory) po.paymentHistory = [];
      po.paymentHistory.push({
        paymentStatus: "paid",
        paymentReference: po.paymentReference,
        paymentDate: po.paymentDate,
        paymentAmount: po.paymentAmount,
        paidBy: po.paidBy,
        remarks: po.paymentRemarks,
        recordedAt: new Date(),
      });
      await po.save();

      delivery.paymentStatus = "paid";
      await delivery.save();
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
