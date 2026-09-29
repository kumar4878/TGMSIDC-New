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
    financialYear: r.financialYear ?? "2025-26",
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
    approvalStatus: r.approvalStatus ?? "pending",
    approvedBy: r.approvedBy ?? "",
    approvedDate: r.approvedDate?.toISOString() ?? null,
    returnComments: r.returnComments ?? "",
    amendments: r.amendments ?? [],
    vendorAcknowledged: r.vendorAcknowledged ?? false,
    vendorAckDate: r.vendorAckDate?.toISOString() ?? null,
    vendorExpectedDispatchDate: r.vendorExpectedDispatchDate?.toISOString() ?? null,
    paymentStatus: r.paymentStatus ?? "not_paid",
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
  if (!indentId || !rateContractId) {
    res.status(400).json({ error: "indentId and rateContractId are required" }); return;
  }
  const rc = await RateContract.findById(rateContractId);
  const indent = await Indent.findById(indentId);
  if (!rc) { res.status(400).json({ error: "Rate contract not found" }); return; }

  vendorId = vendorId || rc.vendorId;
  equipmentId = equipmentId || rc.equipmentId || indent?.equipmentId;
  quantity = quantity || indent?.quantity || 1;
  deliveryAddress = deliveryAddress || indent?.facilityName || "Telangana Medical Facility";

  const vn = await Vendor.findById(vendorId).catch(() => null);
  const eq = await Equipment.findById(equipmentId).catch(() => null);

  const unitPrice = rc.unitPrice;
  const gstRate = rc.gstRate ?? 12;
  const gstAmt = unitPrice * quantity * gstRate / 100;
  const total = unitPrice * quantity + gstAmt;
  const count = await PurchaseOrder.countDocuments();

  const psRequired = req.body.psRequired ?? false;
  const psPercent = req.body.psPercent ?? 5;
  const psAmount = psRequired ? (total * psPercent) / 100 : 0;
  const bgDueDate = psRequired ? (req.body.bgDueDate ? new Date(req.body.bgDueDate) : new Date(Date.now() + 30 * 86400000)) : undefined;

  const po = await PurchaseOrder.create({
    poNumber: `PO-2526-${String(count + 1).padStart(4, "0")}`,
    poType: req.body.poType ?? "rc_based",
    financialYear: req.body.financialYear ?? "2025-26",
    indentId, indentNumber: indent?.indentNumber ?? "",
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
  });

  if (indent) {
    indent.status = "po_issued";
    await indent.save();
  }

  await notifyPOStatusChange(po, "created", req.body.generatedBy);

  res.status(201).json(await fmt(po));
});

router.patch("/purchase-orders/:id", async (req, res): Promise<void> => {
  const r = await PurchaseOrder.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!r) { res.status(404).json({ error: "Not found" }); return; }
  res.json(await fmt(r));
});

/* Scope Boundary: Manual Paid / Not-Paid status tracking by TGMSIDC Accounts */
router.post("/purchase-orders/:id/payment-status", async (req, res): Promise<void> => {
  const { paymentStatus, paymentReference, paymentDate, paymentAmount, paidBy, paymentRemarks } = req.body;
  let po = null;
  if (mongoose.Types.ObjectId.isValid(req.params.id)) {
    po = await PurchaseOrder.findById(req.params.id).catch(() => null);
  }
  if (!po) {
    po = await PurchaseOrder.findOne({ poNumber: req.params.id }).catch(() => null);
  }
  if (!po) { res.status(404).json({ error: "PO not found" }); return; }

  po.paymentStatus = paymentStatus || po.paymentStatus;
  po.paymentReference = paymentReference || po.paymentReference;
  po.paymentDate = paymentDate ? new Date(paymentDate) : new Date();
  po.paymentAmount = paymentAmount != null ? Number(paymentAmount) : po.totalAmount;
  po.paidBy = paidBy || "TGMSIDC Accounts Officer";
  po.paymentRemarks = paymentRemarks || "";

  if (!po.paymentHistory) po.paymentHistory = [];
  po.paymentHistory.push({
    paymentStatus: po.paymentStatus,
    paymentReference: po.paymentReference,
    paymentDate: po.paymentDate,
    paymentAmount: po.paymentAmount,
    paidBy: po.paidBy,
    remarks: po.paymentRemarks,
    recordedAt: new Date(),
  });

  await po.save();
  res.json(await fmt(po));
});

/* Statutory 2-Tranche Payment Release (90% Post-Docs + 10% Retention Post-3-Months) */
router.post("/purchase-orders/:id/release-payment", async (req, res): Promise<void> => {
  const { tranche, paymentReference, paymentDate, paidBy, remarks } = req.body;
  let po = null;
  if (mongoose.Types.ObjectId.isValid(req.params.id)) {
    po = await PurchaseOrder.findById(req.params.id).catch(() => null);
  }
  if (!po) {
    po = await PurchaseOrder.findOne({ poNumber: req.params.id }).catch(() => null);
  }
  if (!po) { res.status(404).json({ error: "PO not found" }); return; }

  const total = po.totalAmount || 0;
  const payDate = paymentDate ? new Date(paymentDate) : new Date();
  const payer = paidBy || "TGMSIDC Accounts Officer";

  if (tranche === "tranche1_90") {
    const t1Amount = Math.round(total * 0.9);
    const ref = paymentReference || `UTR-TG-90-${Math.floor(10000000 + Math.random() * 90000000)}`;
    po.paymentStatus = "partial";
    (po as any).tranche1Amount = t1Amount;
    (po as any).tranche1Paid = true;
    (po as any).tranche1PaidDate = payDate;
    (po as any).tranche1Reference = ref;
    (po as any).tranche1PaidBy = payer;
    po.paymentAmount = t1Amount;
    po.paymentReference = ref;
    po.paymentDate = payDate;
    po.paidBy = payer;
    po.paymentRemarks = remarks || "90% payment released against verified DCC, QA clearance, and installation documentation. Remaining 10% held as 3-month usage retention.";

    if (!po.paymentHistory) po.paymentHistory = [];
    po.paymentHistory.push({
      paymentStatus: "tranche1_90_released",
      paymentReference: ref,
      paymentDate: payDate,
      paymentAmount: t1Amount,
      paidBy: payer,
      remarks: po.paymentRemarks,
      recordedAt: new Date(),
    });

    await po.save();
    await Delivery.updateMany({ purchaseOrderId: po._id }, { paymentStatus: "partial" });

    res.json({ message: "Tranche 1 (90%) payment released successfully", po: await fmt(po) });
    return;
  }

  if (tranche === "tranche2_10") {
    const t1Amount = (po as any).tranche1Amount || Math.round(total * 0.9);
    const t2Amount = total - t1Amount;
    const ref = paymentReference || `UTR-TG-10-${Math.floor(10000000 + Math.random() * 90000000)}`;
    po.paymentStatus = "paid";
    po.status = "completed";
    (po as any).tranche2Amount = t2Amount;
    (po as any).tranche2Paid = true;
    (po as any).tranche2PaidDate = payDate;
    (po as any).tranche2Reference = ref;
    (po as any).tranche2PaidBy = payer;
    po.paymentAmount = total;
    po.paymentReference = ref;
    po.paymentDate = payDate;
    po.paidBy = payer;
    po.paymentRemarks = remarks || "Final 10% retention amount released post 3 months of satisfactory hospital usage & QPC verification.";

    if (!po.paymentHistory) po.paymentHistory = [];
    po.paymentHistory.push({
      paymentStatus: "tranche2_10_released",
      paymentReference: ref,
      paymentDate: payDate,
      paymentAmount: t2Amount,
      paidBy: payer,
      remarks: po.paymentRemarks,
      recordedAt: new Date(),
    });

    await po.save();
    await Delivery.updateMany({ purchaseOrderId: po._id }, { paymentStatus: "paid", status: "completed" });
    if (po.indentId) {
      await Indent.findByIdAndUpdate(po.indentId, { status: "completed" });
    }

    res.json({ message: "Tranche 2 (10%) retention released successfully. PO completed.", po: await fmt(po) });
    return;
  }

  res.status(400).json({ error: "Invalid tranche specified. Use tranche1_90 or tranche2_10." });
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
  if (po.status === "approved" || po.status === "draft") {
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
  const { submittedBy } = req.body;
  const po = await PurchaseOrder.findByIdAndUpdate(req.params.id, { approvalStatus: "pending", status: "pending_approval" }, { new: true });
  if (!po) { res.status(404).json({ error: "Not found" }); return; }
  await notifyPOStatusChange(po, "submitted for approval", submittedBy);
  res.json(await fmt(po));
});

router.patch("/purchase-orders/:id/gm-review", async (req, res): Promise<void> => {
  const { action, comments, reviewedBy } = req.body;
  // action can be: 'recommend_approve', 'recommend_reject', 'return'
  // maps to 'proposed_approve', 'proposed_reject', 'returned'
  let approvalStatus = "pending";
  if (action === "recommend_approve") approvalStatus = "proposed_approve";
  else if (action === "recommend_reject") approvalStatus = "proposed_reject";
  else if (action === "return") approvalStatus = "returned";
  
  const update: any = { approvalStatus, returnComments: comments || "" };
  const po = await PurchaseOrder.findByIdAndUpdate(req.params.id, update, { new: true });
  if (!po) { res.status(404).json({ error: "Not found" }); return; }
  await notifyPOStatusChange(po, `GM reviewed (${approvalStatus})`, reviewedBy);
  res.json(await fmt(po));
});

router.patch("/purchase-orders/:id/so-decision", async (req, res): Promise<void> => {
  const { action, comments, approvedBy } = req.body;
  const update: any = {};
  if (action === "approved") {
    update.approvalStatus = "approved";
    update.status = "approved";
    update.approvedBy = approvedBy;
    update.approvedDate = new Date();
  } else if (action === "returned") {
    update.approvalStatus = "returned";
    update.returnComments = comments || "";
  } else if (action === "rejected") {
    update.approvalStatus = "rejected";
    update.status = "rejected";
    update.returnComments = comments || "";
  }
  const po = await PurchaseOrder.findByIdAndUpdate(req.params.id, update, { new: true });
  if (!po) { res.status(404).json({ error: "Not found" }); return; }
  await notifyPOStatusChange(po, `SO decided (${action})`, approvedBy);
  res.json(await fmt(po));
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
