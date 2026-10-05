import { Router } from "express";
import mongoose from "mongoose";
import { PurchaseOrder } from "../models/PurchaseOrder.js";
import { Indent } from "../models/Indent.js";
import { RateContract } from "../models/RateContract.js";
import { Vendor } from "../models/Vendor.js";
import { Equipment } from "../models/Equipment.js";
import { Notification } from "../models/Notification.js";
import { User } from "../models/User.js";
import { Delivery } from "../models/Delivery.js";

const router = Router();

export async function notifyPOStatusChange(po: any, action: string, actorName?: string) {
  const notifications: any[] = [];
  const title = `Purchase Order ${po.poNumber} — ${action.toUpperCase()}`;
  const message = `Purchase Order ${po.poNumber} for ${po.equipmentName} (Qty: ${po.quantity}) has been ${action}${actorName ? ` by ${actorName}` : ""}. Total Amount: ₹${(po.totalAmount || 0).toLocaleString("en-IN")}.`;

  /* Find vendor details */
  const vendor = await Vendor.findById(po.vendorId).catch(() => null);
  const vendorEmail = vendor?.contactEmail || "vendor@partner.tgmsidc.gov.in";
  const vendorPhone = vendor?.contactPhone || "+91-9849012345";
  const vendorName = vendor?.name || po.vendorName || "Vendor";

  /* Simulated SMS & Email to Vendor */
  console.log(`\n========================================`);
  console.log(`[SMS GATEWAY - PO ${action.toUpperCase()}] To Vendor: ${vendorPhone} (${vendorName})`);
  console.log(`Message: TGMSIDC Alert: PO ${po.poNumber} issued for ${po.equipmentName} (Qty: ${po.quantity}). Status: ${po.status}.`);
  console.log(`[EMAIL GATEWAY - PO ${action.toUpperCase()}] To Vendor: ${vendorEmail}`);
  console.log(`Subject: [TGMSIDC] Official Purchase Order ${po.poNumber} - ${action.toUpperCase()}`);
  console.log(`Body: Dear ${vendorName},\n\n${message}\nDelivery Address: ${po.deliveryAddress}\nSupply Period: ${po.supplyPeriodDays || 45} days.\n\nTGMSIDC Procurement Division`);
  console.log(`========================================\n`);

  if (po.vendorId) {
    notifications.push({
      type: "po_status",
      title,
      message,
      userId: po.vendorId.toString(),
      entityType: "purchase_order",
      entityId: po._id.toString(),
      priority: action === "approved" ? "high" : "normal",
    });
  }

  if (notifications.length > 0) {
    await Notification.insertMany(notifications).catch(() => {});
  }
}

async function fmt(r: any) {
  const vn = r.vendorName ? null : await Vendor.findById(r.vendorId).catch(() => null);
  const eq = r.equipmentName ? null : await Equipment.findById(r.equipmentId).catch(() => null);
  return {
    id: r._id.toString(),
    poNumber: r.poNumber,
    poType: r.poType ?? "rc_based",
    financialYear: r.financialYear ?? "2026-27",
    poDate: r.poDate?.toISOString() ?? r.createdAt.toISOString(),
    version: r.version ?? 1,
    indentId: r.indentId?.toString() ?? "",
    indentNumber: r.indentNumber ?? "",
    rateContractId: r.rateContractId?.toString() ?? "",
    rcNumber: r.rcNumber ?? "",
    vendorId: r.vendorId?.toString() ?? "",
    vendorName: r.vendorName || vn?.name || "Unknown",
    equipmentId: r.equipmentId?.toString() ?? "",
    equipmentName: r.equipmentName || eq?.name || "Unknown",
    quantity: r.quantity,
    unitPrice: r.unitPrice,
    gstRate: r.gstRate,
    gstAmount: r.gstAmount ?? r.unitPrice * r.quantity * r.gstRate / 100,
    unitPriceInclTax: r.unitPriceInclTax ?? r.unitPrice * (1 + r.gstRate / 100),
    totalEquipmentCost: r.totalEquipmentCost ?? r.unitPrice * r.quantity,
    totalAmount: r.totalAmount,
    consignees: r.consignees ?? [],
    psRequired: r.psRequired ?? false,
    psPercent: r.psPercent ?? 0,
    psAmount: r.psAmount ?? 0,
    bgDueDate: r.bgDueDate?.toISOString() ?? null,
    bgReferenceNo: r.bgReferenceNo ?? "",
    bgStatus: r.bgStatus ?? "pending",
    bgExpiryDate: r.bgExpiryDate?.toISOString() ?? null,
    vendorTier: r.vendorTier ?? "L1",
    allocationRatio: r.allocationRatio ?? "100%",
    deliveryAddress: r.deliveryAddress,
    supplyPeriodDays: r.supplyPeriodDays ?? 45,
    expectedDeliveryDate: r.expectedDeliveryDate?.toISOString() ?? null,
    actualDeliveryDate: r.actualDeliveryDate?.toISOString() ?? null,
    approvalStatus: r.approvalStatus ?? "draft",
    approvedBy: r.approvedBy ?? "",
    approvedDate: r.approvedDate?.toISOString() ?? null,
    returnComments: r.returnComments ?? "",
    gmReviewNotes: r.gmReviewNotes ?? "",
    gmReviewedBy: r.gmReviewedBy ?? "",
    gmReviewedDate: r.gmReviewedDate?.toISOString() ?? null,
    soApprovalNotes: r.soApprovalNotes ?? "",
    soApprovedBy: r.soApprovedBy ?? "",
    soApprovedDate: r.soApprovedDate?.toISOString() ?? null,
    mdApprovalNotes: r.mdApprovalNotes ?? "",
    mdApprovedBy: r.mdApprovedBy ?? "",
    mdApprovedDate: r.mdApprovedDate?.toISOString() ?? null,
    approvalTrail: r.approvalTrail ?? [],
    indentLineItemIndex: r.indentLineItemIndex ?? null,
    indentDetails: r.indentDetails ?? null,
    fulfilmentStatus: r.fulfilmentStatus ?? "not_fulfilled",
    cumulativeAcceptedQuantity: r.cumulativeAcceptedQuantity ?? 0,
    cumulativeReturnedQuantity: r.cumulativeReturnedQuantity ?? 0,
    cumulativeRejectedQuantity: r.cumulativeRejectedQuantity ?? 0,
    fulfilledQuantity: r.fulfilledQuantity ?? 0,
    balanceQuantity: r.balanceQuantity ?? Math.max(0, (r.quantity || 0) - (r.fulfilledQuantity || 0)),
    closureStatus: r.closureStatus ?? "open",
    closureEligibleAt: r.closureEligibleAt?.toISOString() ?? null,
    closedAt: r.closedAt?.toISOString() ?? null,
    closedBy: r.closedBy ?? "",
    closureRemarks: r.closureRemarks ?? "",
    amendments: r.amendments ?? [],
    vendorAcknowledged: r.vendorAcknowledged ?? false,
    vendorAckDate: r.vendorAckDate?.toISOString() ?? null,
    vendorExpectedDispatchDate: r.vendorExpectedDispatchDate?.toISOString() ?? null,
    paymentStatus: r.paymentStatus ?? "payment_status_not_updated",
    paymentReference: r.paymentReference ?? "",
    paymentDate: r.paymentDate?.toISOString() ?? null,
    paymentAmount: r.paymentAmount ?? 0,
    paidBy: r.paidBy ?? "",
    paymentRemarks: r.paymentRemarks ?? "",
    tranche1Amount: r.tranche1Amount ?? Math.round((r.totalAmount || 0) * 0.9),
    tranche1Paid: r.tranche1Paid ?? false,
    tranche1PaidDate: r.tranche1PaidDate?.toISOString() ?? null,
    tranche1Reference: r.tranche1Reference ?? "",
    tranche1PaidBy: r.tranche1PaidBy ?? "",
    tranche2Amount: r.tranche2Amount ?? ((r.totalAmount || 0) - (r.tranche1Amount || Math.round((r.totalAmount || 0) * 0.9))),
    tranche2Paid: r.tranche2Paid ?? false,
    tranche2PaidDate: r.tranche2PaidDate?.toISOString() ?? null,
    tranche2Reference: r.tranche2Reference ?? "",
    tranche2PaidBy: r.tranche2PaidBy ?? "",
    paymentHistory: r.paymentHistory ?? [],
    fileNo: r.fileNo ?? "",
    generatedBy: r.generatedBy ?? "",
    remarks: r.remarks ?? "",
    cancellationReason: r.cancellationReason ?? null,
    cancelledBy: r.cancelledBy ?? null,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

router.get("/purchase-orders", async (req, res): Promise<void> => {
  const filter: Record<string, any> = {};
  if (req.query.status && req.query.status !== "all") filter.status = req.query.status;
  if (req.query.vendorId) filter.vendorId = req.query.vendorId;
  const rows = await PurchaseOrder.find(filter).sort({ createdAt: -1 });
  res.json(await Promise.all(rows.map(fmt)));
});

router.get("/purchase-orders/:id", async (req, res): Promise<void> => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      const byNum = await PurchaseOrder.findOne({ poNumber: req.params.id }).catch(() => null);
      if (byNum) { res.json(await fmt(byNum)); return; }
      res.status(404).json({ error: "Not found" });
      return;
    }
    const r = await PurchaseOrder.findById(req.params.id).catch(() => null);
    if (!r) { res.status(404).json({ error: "Not found" }); return; }
    res.json(await fmt(r));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/purchase-orders", async (req, res): Promise<void> => {
  let { indentId, rateContractId, vendorId, equipmentId, quantity, deliveryAddress } = req.body;
  if (!rateContractId) {
    res.status(400).json({ error: "rateContractId is required" }); return;
  }
  const rc = await RateContract.findById(rateContractId);
  const indent = indentId ? await Indent.findById(indentId).catch(() => null) : null;
  if (!rc) { res.status(400).json({ error: "Rate contract not found" }); return; }

  vendorId = vendorId || rc.vendorId;
  equipmentId = equipmentId || rc.equipmentId || indent?.equipmentId;
  quantity = quantity || indent?.quantity || 1;
  deliveryAddress = deliveryAddress || indent?.facilityName || "Telangana Medical Facility, Central Warehouse";

  const vn = await Vendor.findById(vendorId).catch(() => null);
  const eq = await Equipment.findById(equipmentId).catch(() => null);

  const unitPrice = rc.unitPrice;
  const gstRate = rc.gstRate ?? 12;
  const gstAmt = unitPrice * quantity * gstRate / 100;
  const total = unitPrice * quantity + gstAmt;
  const count = await PurchaseOrder.countDocuments();
  const fy = req.body.financialYear || indent?.financialYear || "2026-27";
  const fyCode = fy.replace("-", "").slice(2);

  const psRequired = req.body.psRequired ?? false;
  const psPercent = req.body.psPercent ?? 5;
  const psAmount = psRequired ? (total * psPercent) / 100 : 0;
  const bgDueDate = psRequired ? (req.body.bgDueDate ? new Date(req.body.bgDueDate) : new Date(Date.now() + 30 * 86400000)) : undefined;

  const po = await PurchaseOrder.create({
    poNumber: `PO-${fyCode}-${String(count + 1).padStart(4, "0")}`,
    poType: req.body.poType ?? "rc_based",
    financialYear: fy,
    indentId: indent?._id || undefined,
    indentNumber: indent?.indentNumber ?? (req.body.indentNumber || "DIRECT-RC-PO"),
    indentLineItemIndex: req.body.lineIndex !== undefined ? Number(req.body.lineIndex) : undefined,
    rateContractId, rcNumber: rc.contractNumber,
    vendorId, vendorName: vn?.name ?? rc.vendorName ?? "",
    vendorTier: req.body.vendorTier ?? "L1",
    allocationRatio: req.body.allocationRatio ?? "100%",
    equipmentId, equipmentName: eq?.name ?? rc.equipmentName ?? "",
    quantity, unitPrice, gstRate, gstAmount: gstAmt,
    unitPriceInclTax: unitPrice * (1 + gstRate / 100),
    totalEquipmentCost: unitPrice * quantity,
    totalAmount: total,
    deliveryAddress,
    supplyPeriodDays: rc.supplyPeriodDays ?? 45,
    expectedDeliveryDate: req.body.expectedDeliveryDate ? new Date(req.body.expectedDeliveryDate) : new Date(Date.now() + (rc.supplyPeriodDays ?? 45) * 86400000),
    consignees: req.body.consignees ?? [],
    psRequired,
    psPercent,
    psAmount,
    bgDueDate,
    bgReferenceNo: req.body.bgReferenceNo ?? "",
    bgStatus: psRequired ? "pending" : "not_applicable",
    generatedBy: req.body.generatedBy ?? "Authorised Officer",
    status: "draft",
    approvalStatus: "draft",
  });

  if (indent) {
    indent.status = "in_procurement";
    const lineIdx = req.body.lineIndex !== undefined ? Number(req.body.lineIndex) : -1;
    if (lineIdx >= 0 && indent.lineItems && indent.lineItems[lineIdx]) {
      const li = indent.lineItems[lineIdx];
      li.poId = po._id;
      li.poNumber = po.poNumber;
      li.lineStatus = "po_drafted";
      li.rateContractId = rc._id;
      li.rateContractNumber = rc.contractNumber;
      li.rateContractVendor = vn?.name || rc.vendorName;
      li.rateContractUnitPrice = rc.unitPrice;
      indent.markModified("lineItems");
    } else if (indent.lineItems && indent.lineItems.length > 0) {
      const li = indent.lineItems.find((l: any) => String(l.equipmentId) === String(equipmentId) || (l.equipmentName && eq?.name && l.equipmentName.toLowerCase() === eq.name.toLowerCase()));
      if (li) {
        li.poId = po._id;
        li.poNumber = po.poNumber;
        li.lineStatus = "po_drafted";
        li.rateContractId = rc._id;
        li.rateContractNumber = rc.contractNumber;
        li.rateContractVendor = vn?.name || rc.vendorName;
        li.rateContractUnitPrice = rc.unitPrice;
        indent.markModified("lineItems");
      }
    }
    await indent.save();
  }

  await notifyPOStatusChange(po, "created_as_draft", req.body.generatedBy);

  res.status(201).json(await fmt(po));
});

router.patch("/purchase-orders/:id", async (req, res): Promise<void> => {
  const r = await PurchaseOrder.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!r) { res.status(404).json({ error: "Not found" }); return; }
  res.json(await fmt(r));
});

/* Scope Boundary: Manual Paid / Not-Paid status tracking by TGMSIDC Accounts */
router.post("/purchase-orders/:id/payment-status", async (req, res): Promise<void> => {
  const { paymentStatus, paymentReference, paymentDate, paymentAmount, paidBy, paymentRemarks, tranche, paymentMode, bankDetails, invoiceRef } = req.body;
  let po = null;
  if (mongoose.Types.ObjectId.isValid(req.params.id)) {
    po = await PurchaseOrder.findById(req.params.id).catch(() => null);
  }
  if (!po) {
    po = await PurchaseOrder.findOne({ poNumber: req.params.id }).catch(() => null);
  }
  if (!po) { res.status(404).json({ error: "PO not found" }); return; }

  const payDate = paymentDate ? new Date(paymentDate) : new Date();
  const payer = paidBy || "TGMSIDC Accounts Officer";
  const ref = paymentReference || po.paymentReference || `UTR-TG-${Math.floor(10000000 + Math.random() * 90000000)}`;
  const total = po.totalAmount || 0;
  const t1Calculated = po.tranche1Amount || Math.round(total * 0.9);
  const t2Calculated = po.tranche2Amount || (total - t1Calculated);

  po.paymentStatus = paymentStatus || po.paymentStatus;
  po.paymentReference = ref;
  po.paymentDate = payDate;
  po.paymentAmount = paymentAmount != null ? Number(paymentAmount) : po.totalAmount;
  po.paidBy = payer;
  po.paymentRemarks = paymentRemarks || "";

  if (tranche === "tranche1_90") {
    po.tranche1Paid = po.paymentStatus === "paid" || po.paymentStatus === "partial";
    po.tranche1PaidDate = payDate;
    po.tranche1Reference = ref;
    po.tranche1PaidBy = payer;
    po.tranche1Amount = paymentAmount != null ? Number(paymentAmount) : t1Calculated;
  } else if (tranche === "tranche2_10") {
    po.tranche2Paid = po.paymentStatus === "paid";
    po.tranche2PaidDate = payDate;
    po.tranche2Reference = ref;
    po.tranche2PaidBy = payer;
    po.tranche2Amount = paymentAmount != null ? Number(paymentAmount) : t2Calculated;
  } else if (po.paymentStatus === "paid") {
    po.tranche1Paid = true;
    po.tranche2Paid = true;
    po.tranche1Reference = ref;
    po.tranche2Reference = ref;
  }

  if (!po.paymentHistory) po.paymentHistory = [];
  po.paymentHistory.push({
    paymentStatus: po.paymentStatus,
    tranche: tranche || (po.paymentStatus === "paid" ? "full" : "partial"),
    paymentReference: po.paymentReference,
    paymentDate: po.paymentDate,
    paymentAmount: po.paymentAmount,
    paidBy: po.paidBy,
    paymentMode: paymentMode || "NEFT",
    bankDetails: bankDetails || "",
    invoiceRef: invoiceRef || "",
    remarks: po.paymentRemarks,
    recordedAt: new Date(),
  });

  await po.save();
  if (po.paymentStatus === "paid") {
    await Delivery.updateMany({ purchaseOrderId: po._id }, { paymentStatus: "paid" });
  }
  res.json(await fmt(po));
});

/* Scope Boundary: Normalized payment release endpoint (backward-compatible) */
router.post("/purchase-orders/:id/release-payment", async (req, res): Promise<void> => {
  const { paymentReference, paymentDate, paidBy, remarks, tranche, paymentAmount, paymentMode, bankDetails, invoiceRef, paymentStatus } = req.body;
  let po = null;
  if (mongoose.Types.ObjectId.isValid(req.params.id)) {
    po = await PurchaseOrder.findById(req.params.id).catch(() => null);
  }
  if (!po) {
    po = await PurchaseOrder.findOne({ poNumber: req.params.id }).catch(() => null);
  }
  if (!po) { res.status(404).json({ error: "PO not found" }); return; }

  const payDate = paymentDate ? new Date(paymentDate) : new Date();
  const payer = paidBy || "TGMSIDC Accounts Officer";
  const ref = paymentReference || `UTR-TG-${Math.floor(10000000 + Math.random() * 90000000)}`;
  const total = po.totalAmount || 0;
  const t1Calculated = po.tranche1Amount || Math.round(total * 0.9);
  const t2Calculated = po.tranche2Amount || (total - t1Calculated);

  const desiredStatus = paymentStatus || "paid";

  if (tranche === "tranche1_90") {
    po.tranche1Paid = desiredStatus === "paid" || desiredStatus === "released";
    po.tranche1PaidDate = payDate;
    po.tranche1Reference = ref;
    po.tranche1PaidBy = payer;
    po.tranche1Amount = paymentAmount != null ? Number(paymentAmount) : t1Calculated;
    po.paymentStatus = po.tranche2Paid ? "paid" : "partial";
  } else if (tranche === "tranche2_10") {
    po.tranche2Paid = desiredStatus === "paid" || desiredStatus === "released";
    po.tranche2PaidDate = payDate;
    po.tranche2Reference = ref;
    po.tranche2PaidBy = payer;
    po.tranche2Amount = paymentAmount != null ? Number(paymentAmount) : t2Calculated;
    po.paymentStatus = po.tranche1Paid ? "paid" : "partial";
  } else {
    // Full or single payment
    po.tranche1Paid = true;
    po.tranche1PaidDate = payDate;
    po.tranche1Reference = ref;
    po.tranche1PaidBy = payer;
    po.tranche1Amount = t1Calculated;
    po.tranche2Paid = true;
    po.tranche2PaidDate = payDate;
    po.tranche2Reference = ref;
    po.tranche2PaidBy = payer;
    po.tranche2Amount = t2Calculated;
    po.paymentStatus = "paid";
  }

  po.paymentReference = ref;
  po.paymentDate = payDate;
  po.paidBy = payer;
  po.paymentRemarks = remarks || `Payment recorded manually for ${po.poNumber}.`;
  if (paymentAmount != null) {
    po.paymentAmount = Number(paymentAmount);
  } else if (po.paymentStatus === "paid") {
    po.paymentAmount = total;
  }

  if (!po.paymentHistory) po.paymentHistory = [];
  po.paymentHistory.push({
    paymentStatus: po.paymentStatus,
    tranche: tranche || (po.paymentStatus === "paid" ? "full" : "partial"),
    paymentReference: ref,
    paymentDate: payDate,
    paymentAmount: paymentAmount != null ? Number(paymentAmount) : (tranche === "tranche1_90" ? po.tranche1Amount : tranche === "tranche2_10" ? po.tranche2Amount : total),
    paidBy: payer,
    remarks: po.paymentRemarks,
    paymentMode: paymentMode || "NEFT",
    bankDetails: bankDetails || "",
    invoiceRef: invoiceRef || "",
    recordedAt: new Date(),
  });

  await po.save();
  if (po.paymentStatus === "paid") {
    await Delivery.updateMany({ purchaseOrderId: po._id }, { paymentStatus: "paid" });
  }

  res.json({ message: "Manual payment status recorded successfully", po: await fmt(po) });
});

/* PO Amendment Versioning (v1 -> v2) with audit snapshot */
router.post("/purchase-orders/:id/amend", async (req, res): Promise<void> => {
  const { amendmentType, description, previousValue, newValue, requestedBy } = req.body;
  let po = null;
  if (mongoose.Types.ObjectId.isValid(req.params.id)) {
    po = await PurchaseOrder.findById(req.params.id).catch(() => null);
  }
  if (!po) {
    po = await PurchaseOrder.findOne({ poNumber: req.params.id }).catch(() => null);
  }
  if (!po) { res.status(404).json({ error: "PO not found" }); return; }

  po.version = (po.version || 1) + 1;
  const amendmentRef = `AMD-${po.poNumber}-V${po.version}`;
  if (!po.amendments) po.amendments = [];
  po.amendments.push({
    amendmentRef,
    amendmentType: amendmentType || "quantity_adjustment",
    description: description || "PO Amendment requested and verified per statutory mandate",
    previousValue: previousValue || "",
    newValue: newValue || "",
    status: "approved",
    requestedBy: requestedBy || "TGMSIDC Officer",
    approvedBy: "SO Equipment",
    requestedDate: new Date(),
    approvedDate: new Date(),
  });

  await po.save();
  res.json(await fmt(po));
});

/* Vendor Acknowledgement (7-day statutory SLA) */
router.post("/purchase-orders/:id/acknowledge", async (req, res): Promise<void> => {
  const { expectedDispatchDate, remarks } = req.body;
  let po = null;
  if (mongoose.Types.ObjectId.isValid(req.params.id)) {
    po = await PurchaseOrder.findById(req.params.id).catch(() => null);
  }
  if (!po) {
    po = await PurchaseOrder.findOne({ poNumber: req.params.id }).catch(() => null);
  }
  if (!po) { res.status(404).json({ error: "PO not found" }); return; }

  po.vendorAcknowledged = true;
  po.vendorAckDate = new Date();
  if (expectedDispatchDate) po.vendorExpectedDispatchDate = new Date(expectedDispatchDate);
  if (po.status === "approved" || po.status === "draft" || po.status === "issued") {
    po.status = "acknowledged";
  }
  if (remarks) po.remarks = `${po.remarks ? po.remarks + " | " : ""}Vendor Ack: ${remarks}`;

  await po.save();
  await notifyPOStatusChange(po, "acknowledged_by_vendor", po.vendorName);
  res.json(await fmt(po));
});

router.post("/purchase-orders/:id/approve", async (req, res): Promise<void> => {
  const update: Record<string, any> = {
    status: "approved", approvalStatus: "approved",
    approvedBy: req.body?.approvedBy ?? "SO Equipment",
    approvedDate: new Date(),
  };
  const po = await PurchaseOrder.findByIdAndUpdate(req.params.id, update, { new: true });
  if (!po) { res.status(404).json({ error: "Not found" }); return; }
  await notifyPOStatusChange(po, "approved", req.body?.approvedBy ?? "SO Equipment");
  res.json(await fmt(po));
});

router.patch("/purchase-orders/:id/submit-for-approval", async (req, res): Promise<void> => {
  try {
    const { submittedBy = "TGMSIDC User", remarks = "Validated and submitted for GM approval." } = req.body;
    let po = await PurchaseOrder.findById(req.params.id);
    if (!po) po = await PurchaseOrder.findOne({ poNumber: req.params.id });
    if (!po) { res.status(404).json({ error: "PO not found" }); return; }

    // Validation check
    if (!po.quantity || po.quantity <= 0) {
      po.approvalStatus = "po_validation_failed";
      await po.save();
      res.status(400).json({ error: "PO validation failed: quantity must be greater than zero." });
      return;
    }

    po.approvalStatus = "pending_gm_approval";
    po.status = "pending_approval";
    if (!po.approvalTrail) po.approvalTrail = [];
    po.approvalTrail.push({
      level: "TGMSIDC",
      actorName: submittedBy,
      role: "tgmsidc_user",
      action: "Submitted for GM Equipment Approval",
      remarks,
      actionedAt: new Date(),
    });

    await po.save();
    await notifyPOStatusChange(po, "submitted for GM approval", submittedBy);
    res.json(await fmt(po));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/* ── Level 1: GM Equipment Review & Recommendation (§3D Step 36) ───── */
router.patch("/purchase-orders/:id/gm-review", async (req, res): Promise<void> => {
  try {
    const { action, comments = "", reviewedBy = "GM Equipment" } = req.body;
    let po = await PurchaseOrder.findById(req.params.id);
    if (!po) po = await PurchaseOrder.findOne({ poNumber: req.params.id });
    if (!po) { res.status(404).json({ error: "PO not found" }); return; }

    const effectiveComments = comments || req.body.reviewNotes || req.body.returnRemarks || req.body.rejectionReason || "";
    const effectiveReviewedBy = reviewedBy || req.body.officerName || "GM Equipment";

    if ((action === "return" || action === "reject") && !effectiveComments.trim()) {
      res.status(400).json({ error: "Mandatory remarks required for returning or rejecting a PO." });
      return;
    }

    if (!po.approvalTrail) po.approvalTrail = [];

    if (action === "approve" || action === "approved") {
      po.approvalStatus = "approved";
      po.status = "approved";
      po.approvedBy = effectiveReviewedBy;
      po.approvedDate = new Date();
      po.gmReviewNotes = effectiveComments || "Reviewed both Rate Contract and Purchase Order details. Approved by GM Equipment.";
      po.gmReviewedBy = effectiveReviewedBy;
      po.gmReviewedDate = new Date();
      po.approvalTrail.push({
        level: "GM Equipment",
        actorName: effectiveReviewedBy,
        role: "gm_equipment",
        action: "Approved by GM Equipment (RC & PO Verified)",
        remarks: po.gmReviewNotes,
        actionedAt: new Date(),
      });
      await notifyPOStatusChange(po, "approved by GM Equipment", effectiveReviewedBy);
    } else if (action === "recommend" || action === "recommend_approve") {
      po.approvalStatus = "pending_so_approval";
      po.gmReviewNotes = effectiveComments || "Recommended for SO approval.";
      po.gmReviewedBy = effectiveReviewedBy;
      po.gmReviewedDate = new Date();
      po.approvalTrail.push({
        level: "GM Equipment",
        actorName: effectiveReviewedBy,
        role: "gm_equipment",
        action: "Recommended for SO Approval",
        remarks: po.gmReviewNotes,
        actionedAt: new Date(),
      });
      await notifyPOStatusChange(po, "recommended by GM Equipment", effectiveReviewedBy);
    } else if (action === "return") {
      po.approvalStatus = "returned_by_gm";
      po.returnComments = comments;
      po.approvalTrail.push({
        level: "GM Equipment",
        actorName: reviewedBy,
        role: "gm_equipment",
        action: "Returned to TGMSIDC User",
        remarks: comments,
        actionedAt: new Date(),
      });
      await notifyPOStatusChange(po, "returned by GM Equipment", reviewedBy);
    } else if (action === "reject" || action === "recommend_reject") {
      po.approvalStatus = "rejected_by_gm";
      po.status = "rejected";
      po.returnComments = comments;
      po.approvalTrail.push({
        level: "GM Equipment",
        actorName: reviewedBy,
        role: "gm_equipment",
        action: "Rejected by GM Equipment",
        remarks: comments,
        actionedAt: new Date(),
      });
      await notifyPOStatusChange(po, "rejected by GM Equipment", reviewedBy);
    }

    await po.save();
    res.json(await fmt(po));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/* ── Level 2: SO Equipment Review & Decision (§3D Step 37) ──────────── */
router.patch("/purchase-orders/:id/so-decision", async (req, res): Promise<void> => {
  try {
    const { action, comments = "", approvedBy = "SO Equipment" } = req.body;
    let po = await PurchaseOrder.findById(req.params.id);
    if (!po) po = await PurchaseOrder.findOne({ poNumber: req.params.id });
    if (!po) { res.status(404).json({ error: "PO not found" }); return; }

    if ((action === "returned" || action === "rejected" || action === "return" || action === "reject") && !comments.trim()) {
      res.status(400).json({ error: "Mandatory remarks required for returning or rejecting a PO." });
      return;
    }

    if (!po.approvalTrail) po.approvalTrail = [];

    if (action === "approved" || action === "approve") {
      po.approvalStatus = "pending_md_approval";
      po.soApprovalNotes = comments || "Approved by SO Equipment and forwarded for MD Sanction.";
      po.soApprovedBy = approvedBy;
      po.soApprovedDate = new Date();
      po.approvalTrail.push({
        level: "SO Equipment",
        actorName: approvedBy,
        role: "so_equipment",
        action: "Approved & Forwarded for MD Sanction",
        remarks: po.soApprovalNotes,
        actionedAt: new Date(),
      });
      await notifyPOStatusChange(po, "approved by SO and forwarded to MD", approvedBy);
    } else if (action === "returned" || action === "return") {
      po.approvalStatus = "returned_by_so";
      po.returnComments = comments;
      po.approvalTrail.push({
        level: "SO Equipment",
        actorName: approvedBy,
        role: "so_equipment",
        action: "Returned by SO Equipment",
        remarks: comments,
        actionedAt: new Date(),
      });
      await notifyPOStatusChange(po, "returned by SO Equipment", approvedBy);
    } else if (action === "rejected" || action === "reject") {
      po.approvalStatus = "rejected_by_so";
      po.status = "rejected";
      po.returnComments = comments;
      po.approvalTrail.push({
        level: "SO Equipment",
        actorName: approvedBy,
        role: "so_equipment",
        action: "Rejected by SO Equipment",
        remarks: comments,
        actionedAt: new Date(),
      });
      await notifyPOStatusChange(po, "rejected by SO Equipment", approvedBy);
    }

    await po.save();
    res.json(await fmt(po));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/* ── Level 3: MD Final Review & Sanction (§3D Step 38) ──────────────── */
router.patch("/purchase-orders/:id/md-decision", async (req, res): Promise<void> => {
  try {
    const { action, comments = "", approvedBy = "Managing Director" } = req.body;
    let po = await PurchaseOrder.findById(req.params.id);
    if (!po) po = await PurchaseOrder.findOne({ poNumber: req.params.id });
    if (!po) { res.status(404).json({ error: "PO not found" }); return; }

    if ((action === "returned" || action === "rejected" || action === "return" || action === "reject") && !comments.trim()) {
      res.status(400).json({ error: "Mandatory remarks required for returning or rejecting a PO." });
      return;
    }

    if (!po.approvalTrail) po.approvalTrail = [];

    if (action === "approved" || action === "approve") {
      po.approvalStatus = "po_approved";
      po.status = "approved";
      po.mdApprovalNotes = comments || "Final review completed and approved by MD.";
      po.mdApprovedBy = approvedBy;
      po.mdApprovedDate = new Date();
      po.approvedBy = approvedBy;
      po.approvedDate = new Date();
      po.approvalTrail.push({
        level: "Managing Director",
        actorName: approvedBy,
        role: "md",
        action: "Sanctioned & Approved by MD",
        remarks: po.mdApprovalNotes,
        actionedAt: new Date(),
      });
      await notifyPOStatusChange(po, "approved by MD", approvedBy);
    } else if (action === "returned" || action === "return") {
      po.approvalStatus = "returned_by_md";
      po.returnComments = comments;
      po.approvalTrail.push({
        level: "Managing Director",
        actorName: approvedBy,
        role: "md",
        action: "Returned by MD",
        remarks: comments,
        actionedAt: new Date(),
      });
      await notifyPOStatusChange(po, "returned by MD", approvedBy);
    } else if (action === "rejected" || action === "reject") {
      po.approvalStatus = "rejected_by_md";
      po.status = "rejected";
      po.returnComments = comments;
      po.approvalTrail.push({
        level: "Managing Director",
        actorName: approvedBy,
        role: "md",
        action: "Rejected by MD",
        remarks: comments,
        actionedAt: new Date(),
      });
      await notifyPOStatusChange(po, "rejected by MD", approvedBy);
    }

    await po.save();
    res.json(await fmt(po));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/* ── Issue Approved PO through Vendor Portal (§3D Step 40) ──────────── */
const handleIssuePO = async (req: any, res: any): Promise<void> => {
  try {
    let po = await PurchaseOrder.findById(req.params.id);
    if (!po) po = await PurchaseOrder.findOne({ poNumber: req.params.id });
    if (!po) { res.status(404).json({ error: "PO not found" }); return; }

    po.status = "po_issued_awaiting_vendor_ack";
    await po.save();
    await notifyPOStatusChange(po, "issued_to_vendor_portal", req.body?.issuedBy || "TGMSIDC");
    res.json(await fmt(po));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
router.patch("/purchase-orders/:id/issue", handleIssuePO);
router.post("/purchase-orders/:id/issue", handleIssuePO);

/* ── PO Closure Eligibility Check (§3I Step 72) ──────────────────────── */
router.get("/purchase-orders/:id/closure-eligibility", async (req, res): Promise<void> => {
  try {
    let po = await PurchaseOrder.findById(req.params.id);
    if (!po) po = await PurchaseOrder.findOne({ poNumber: req.params.id });
    if (!po) { res.status(404).json({ error: "PO not found" }); return; }

    const deliveries = await Delivery.find({ purchaseOrderId: po._id });

    const checks = [
      {
        id: "fulfilment",
        label: "Delivery Fulfilment (Cumulative Accepted Quantity = Ordered Quantity)",
        passed: (po.fulfilledQuantity || 0) >= (po.quantity || 1),
        current: `${po.fulfilledQuantity || 0} / ${po.quantity} items fulfilled`,
      },
      {
        id: "discrepancies",
        label: "Delivery Discrepancies Resolution",
        passed: deliveries.every(d => (d.discrepancies || []).every((disc: any) => disc.resolutionStatus === "resolved")),
        current: deliveries.some(d => (d.discrepancies || []).some((disc: any) => disc.resolutionStatus !== "resolved"))
          ? "Open discrepancies pending resolution"
          : "All discrepancies resolved or none reported",
      },
      {
        id: "dcc",
        label: "Delivery Completion Certificate (DCC) Uploaded & Verified",
        passed: deliveries.length > 0 && deliveries.every(d => d.deliveryCertUploaded && d.dccVerified),
        current: deliveries.every(d => d.deliveryCertUploaded && d.dccVerified) ? "DCC Verified" : "Pending DCC verification",
      },
      {
        id: "qa",
        label: "Quality Assurance (QA) Acceptance",
        passed: deliveries.length > 0 && deliveries.every(d => d.qaDecision === "accepted"),
        current: deliveries.every(d => d.qaDecision === "accepted") ? "QA Accepted" : "QA pending or conditional",
      },
      {
        id: "installation",
        label: "Installation, Commissioning & Training Verification",
        passed: deliveries.length > 0 && deliveries.every(d => d.trainingCompleted && d.installationStatus === "complete"),
        current: deliveries.every(d => d.trainingCompleted && d.installationStatus === "complete") ? "Commissioning & Training Verified" : "Installation/training pending",
      },
      {
        id: "equipment_registered",
        label: "Equipment Registered in Asset Master",
        passed: deliveries.length > 0 && deliveries.every(d => d.equipmentRegistered),
        current: deliveries.every(d => d.equipmentRegistered) ? "All Equipment Registered" : "Asset registration pending",
      },
      {
        id: "payment_status",
        label: "Reporting-only Payment Indicator Tagged (Paid / Not Paid)",
        passed: po.paymentStatus === "paid" || po.paymentStatus === "not_paid",
        current: po.paymentStatus === "payment_status_not_updated" ? "Payment status not yet updated" : `Tagged as ${po.paymentStatus.toUpperCase()}`,
      },
    ];

    const isEligible = checks.every(c => c.passed);
    if (isEligible && po.closureStatus !== "po_closed" && po.closureStatus !== "eligible_for_po_closure") {
      po.closureStatus = "eligible_for_po_closure";
      po.closureEligibleAt = new Date();
      await po.save();
    }

    res.json({ isEligible, checks, po: await fmt(po) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/* ── Close Purchase Order (§3I Step 73) ──────────────────────────────── */
router.post("/purchase-orders/:id/close", async (req, res): Promise<void> => {
  try {
    const { closedBy = "TGMSIDC User", remarks = "All procurement, receipt, QA, commissioning, registration, and documentation criteria verified." } = req.body;
    let po = await PurchaseOrder.findById(req.params.id);
    if (!po) po = await PurchaseOrder.findOne({ poNumber: req.params.id });
    if (!po) { res.status(404).json({ error: "PO not found" }); return; }

    po.status = "po_closed";
    po.closureStatus = "po_closed";
    po.closedAt = new Date();
    po.closedBy = closedBy;
    po.closureRemarks = remarks;

    await po.save();
    await notifyPOStatusChange(po, "closed", closedBy);
    res.json({ message: "Purchase Order closed successfully", po: await fmt(po) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/purchase-orders/:id/cancel", async (req, res): Promise<void> => {
  const { cancellationReason, cancelledBy } = req.body;
  if (!cancellationReason) { res.status(400).json({ error: "Reason required" }); return; }
  const r = await PurchaseOrder.findByIdAndUpdate(req.params.id, {
    status: "cancelled", cancellationReason, cancelledBy: cancelledBy ?? "", cancelledDate: new Date(),
  }, { new: true });
  if (!r) { res.status(404).json({ error: "Not found" }); return; }
  await notifyPOStatusChange(r, "cancelled", cancelledBy);
  res.json(await fmt(r));
});

export default router;
