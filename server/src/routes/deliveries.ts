import { Router } from "express";
import mongoose from "mongoose";
import { Delivery } from "../models/Delivery.js";
import { PurchaseOrder } from "../models/PurchaseOrder.js";
import { Vendor } from "../models/Vendor.js";
import { Institution } from "../models/Institution.js";
import { Equipment } from "../models/Equipment.js";
import { Indent } from "../models/Indent.js";
import { EquipmentAsset } from "../models/EquipmentAsset.js";

const router = Router();

async function recalculatePOFulfilment(poId: any) {
  if (!poId) return;
  const po = mongoose.Types.ObjectId.isValid(poId)
    ? await PurchaseOrder.findById(poId).catch(() => null)
    : await PurchaseOrder.findOne({ poNumber: poId }).catch(() => null);
  if (!po) return;

  const deliveries = await Delivery.find({ purchaseOrderId: po._id });
  let cumulativeAccepted = 0;
  let cumulativeReturned = 0;
  let cumulativeRejected = 0;
  let allDccVerified = deliveries.length > 0;

  for (const d of deliveries) {
    const acc = typeof d.acceptedQty === "number" ? d.acceptedQty : (d.status === "accepted" ? d.quantity : 0);
    const ret = typeof d.returnedQty === "number" ? d.returnedQty : 0;
    const rej = typeof d.rejectedQty === "number" ? d.rejectedQty : (d.status === "rejected" ? d.quantity : 0);
    cumulativeAccepted += acc;
    cumulativeReturned += ret;
    cumulativeRejected += rej;
    if (!d.dccVerified) allDccVerified = false;
  }

  const fulfilled = Math.max(0, cumulativeAccepted - cumulativeReturned - cumulativeRejected);
  const ordered = po.quantity || 1;
  const balance = Math.max(0, ordered - fulfilled);

  po.cumulativeAcceptedQuantity = cumulativeAccepted;
  po.cumulativeReturnedQuantity = cumulativeReturned;
  po.cumulativeRejectedQuantity = cumulativeRejected;
  po.fulfilledQuantity = fulfilled;
  po.balanceQuantity = balance;

  if (fulfilled === 0) {
    po.fulfilmentStatus = "not_fulfilled";
  } else if (fulfilled < ordered) {
    po.fulfilmentStatus = "partially_fulfilled";
    if (po.status !== "delivered") po.status = "partially_delivered";
  } else if (fulfilled === ordered) {
    po.fulfilmentStatus = allDccVerified ? "completely_fulfilled" : "completely_fulfilled_dcc_pending";
    po.status = "delivered";
  } else if (fulfilled > ordered) {
    po.fulfilmentStatus = "excess_delivery_review";
    po.status = "delivered";
  }

  await po.save();
}

async function fmt(r: any) {
  const vn = r.vendorName ? null : (mongoose.Types.ObjectId.isValid(r.vendorId) ? await Vendor.findById(r.vendorId).catch(() => null) : null);
  const fac = r.facilityName ? null : (mongoose.Types.ObjectId.isValid(r.facilityId) ? await Institution.findById(r.facilityId).catch(() => null) : null);
  return {
    id: r._id.toString(),
    deliveryTrackingId: r.deliveryTrackingId ?? r.qrCode ?? r._id.toString().slice(-8),
    qrCode: r.challanNumber || r.qrCode || r.deliveryTrackingId || "",
    deliveryNoteNo: r.challanNumber || r.deliveryNoteNo || "",
    purchaseOrderId: r.purchaseOrderId?.toString() ?? "",
    poNumber: r.poNumber ?? "",
    vendorId: r.vendorId.toString(),
    vendorName: r.vendorName || vn?.name || "Unknown",
    facilityId: r.facilityId.toString(),
    facilityName: r.facilityName || fac?.name || "Unknown",
    equipmentId: r.equipmentId?.toString() ?? null,
    equipmentName: r.equipmentName ?? "",
    orderedQty: r.orderedQty ?? r.quantity,
    quantity: r.quantity,
    receivedQty: r.receivedQty ?? 0,
    acceptedQty: r.acceptedQty ?? (r.status === "accepted" ? r.quantity : 0),
    damagedQty: r.damagedQty ?? 0,
    shortageQty: r.shortageQty ?? 0,
    rejectedQty: r.rejectedQty ?? 0,
    returnedQty: r.returnedQty ?? 0,
    dispatchDate: r.dispatchDate?.toISOString() ?? null,
    transporterName: r.transporterName ?? "",
    challanNumber: r.challanNumber ?? "",
    invoiceNumber: r.invoiceNumber ?? "",
    expectedDeliveryDate: r.expectedDeliveryDate?.toISOString() ?? null,
    deliveredDate: r.deliveredDate?.toISOString() ?? null,
    receivedBy: r.receivedBy ?? "",
    condition: r.condition ?? "pending_inspection",
    serialNumbers: r.serialNumbers ?? [],
    isOnTime: r.isOnTime ?? true,
    delayDays: r.delayDays ?? 0,
    deliveryCertUploaded: r.deliveryCertUploaded ?? false,
    deliveryCertFilename: r.deliveryCertFilename ?? "",
    deliveryCertDate: r.deliveryCertDate?.toISOString() ?? null,
    dccVerified: r.dccVerified ?? false,
    dccVerifiedBy: r.dccVerifiedBy ?? null,
    dccVerifiedDate: r.dccVerifiedDate?.toISOString() ?? null,
    discrepancies: r.discrepancies ?? [],
    discrepancyNotes: r.discrepancyNotes ?? "",
    qaInspectionItems: r.qaInspectionItems ?? [],
    qaCommitteeName: r.qaCommitteeName ?? "",
    qaInspectionDate: r.qaInspectionDate?.toISOString() ?? null,
    qaDecision: r.qaDecision ?? "pending",
    qaComplianceScore: r.qaComplianceScore ?? 0,
    qaNotes: r.qaNotes ?? "",
    isReinspection: r.isReinspection ?? false,
    reinspectionCount: r.reinspectionCount ?? 0,
    reinspectionDecision: r.reinspectionDecision ?? null,
    acceptanceCertificateIssued: r.acceptanceCertificateIssued,
    acceptanceCertDate: r.acceptanceCertDate?.toISOString() ?? null,
    installationRequired: r.installationRequired ?? false,
    installationStatus: r.installationStatus ?? "not_required",
    installationDate: r.installationDate?.toISOString() ?? null,
    trainingCompleted: r.trainingCompleted ?? false,
    equipmentRegistered: r.equipmentRegistered ?? false,
    registeredAssetTags: r.registeredAssetTags ?? [],
    warrantyStartDate: r.warrantyStartDate?.toISOString() ?? null,
    warrantyEndDate: r.warrantyEndDate?.toISOString() ?? null,
    warrantyMonths: r.warrantyMonths ?? 12,
    paymentStatus: r.paymentStatus ?? "not_paid",
    grnNumber: r.grnNumber || (r.status === "accepted" || r.status === "delivered" ? (r.deliveryTrackingId ? `GRN/HPC/2026/${r.deliveryTrackingId.replace("DEL-", "")}` : "") : ""),
    grnDate: r.grnDate?.toISOString() ?? (r.deliveredDate?.toISOString() ?? null),
    annexure6: r.annexure6 ?? null,
    documentsUploaded: r.documentsUploaded,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

router.get("/deliveries", async (req, res): Promise<void> => {
  const filter: Record<string, any> = {};
  if (req.query.status && req.query.status !== "all") filter.status = req.query.status;
  if (req.query.poId) filter.purchaseOrderId = req.query.poId;
  if (req.query.vendorId) filter.vendorId = req.query.vendorId;
  const rows = await Delivery.find(filter).sort({ createdAt: -1 });
  res.json(await Promise.all(rows.map(fmt)));
});

router.get("/deliveries/:id", async (req, res): Promise<void> => {
  const r = await Delivery.findById(req.params.id);
  if (!r) { res.status(404).json({ error: "Not found" }); return; }
  res.json(await fmt(r));
});

router.post("/deliveries", async (req, res): Promise<void> => {
  const { purchaseOrderId, vendorId, facilityId, quantity, deliveryNoteNo, challanNumber } = req.body;
  if (!purchaseOrderId) {
    res.status(400).json({ error: "purchaseOrderId is required" }); return;
  }

  let po = null;
  if (mongoose.Types.ObjectId.isValid(purchaseOrderId)) {
    po = await PurchaseOrder.findById(purchaseOrderId).catch(() => null);
  }
  if (!po) {
    po = await PurchaseOrder.findOne({ poNumber: purchaseOrderId }).catch(() => null);
  }

  const effectiveQty = Number(quantity || po?.quantity || 1);
  if (isNaN(effectiveQty) || effectiveQty <= 0) {
    res.status(400).json({ error: "A valid positive quantity is required" }); return;
  }

  const vId = vendorId || po?.vendorId;
  let vn = null;
  if (vId) {
    if (mongoose.Types.ObjectId.isValid(vId)) vn = await Vendor.findById(vId).catch(() => null);
    if (!vn) vn = await Vendor.findOne({ $or: [{ vendorCode: vId }, { name: vId }] }).catch(() => null);
  }

  const fId = facilityId || po?.consignees?.[0]?.institutionId || po?.indentId;
  let fac = null;
  if (fId) {
    if (mongoose.Types.ObjectId.isValid(fId)) fac = await Institution.findById(fId).catch(() => null);
    if (!fac) fac = await Institution.findOne({ $or: [{ dmeInstitutionId: fId }, { institutionCode: fId }, { name: fId }] }).catch(() => null);
  }

  const count = await Delivery.countDocuments();
  const trackingId = `DEL-${String(count + 1).padStart(5, "0")}`;
  const effectiveChallan = deliveryNoteNo || challanNumber || trackingId;

  const d = await Delivery.create({
    deliveryTrackingId: trackingId,
    purchaseOrderId: po?._id || purchaseOrderId,
    poNumber: po?.poNumber ?? req.body.poNumber ?? req.body.buyersOrderNo ?? "",
    vendorId: vn?._id || vId || (po?.vendorId || new mongoose.Types.ObjectId()),
    vendorName: vn?.name || po?.vendorName || req.body.vendorName || "Empanelled Vendor",
    facilityId: fac?._id || fId || new mongoose.Types.ObjectId(),
    facilityName: fac?.name || req.body.destination || po?.deliveryAddress || req.body.facilityName || "Consignee Hospital",
    equipmentId: po?.equipmentId,
    equipmentName: po?.equipmentName || req.body.equipmentName || "Medical Equipment",
    orderedQty: po?.quantity ?? effectiveQty,
    quantity: effectiveQty,
    expectedDeliveryDate: req.body.expectedDeliveryDate || po?.expectedDeliveryDate,
    status: req.body.status || "dispatched",
    dispatchDate: req.body.dispatchDate ? new Date(req.body.dispatchDate) : new Date(),
    challanNumber: effectiveChallan,
    invoiceNumber: req.body.invoiceNumber || "",
    lrGrNumber: req.body.lrGrNumber || req.body.dispatchDocNo || "",
    transporterName: req.body.transporterName || req.body.dispatchedThrough || "",
    transporterVehicle: req.body.transporterVehicle || req.body.vehicleNumber || "",
    condition: req.body.receivedInGoodCondition === false ? "damaged" : "good",
    serialNumbers: Array.isArray(req.body.serialNumbers) ? req.body.serialNumbers : (req.body.serialBatchNos ? String(req.body.serialBatchNos).split(/[\n,;]+/).map((s: string) => s.trim()).filter(Boolean) : []),
    documentsUploaded: Array.isArray(req.body.docs) && req.body.docs.length > 0,
    ...req.body,
  });

  if (po) {
    po.status = "dispatched";
    await po.save();
    await recalculatePOFulfilment(po._id);
  }

  res.status(201).json(await fmt(d));
});

router.patch("/deliveries/:id", async (req, res): Promise<void> => {
  let r = null;
  if (mongoose.Types.ObjectId.isValid(req.params.id)) {
    r = await Delivery.findByIdAndUpdate(req.params.id, req.body, { new: true });
  }
  if (!r) {
    r = await Delivery.findOneAndUpdate({ deliveryTrackingId: req.params.id }, req.body, { new: true });
  }
  if (!r) { res.status(404).json({ error: "Not found" }); return; }
  if (r.purchaseOrderId) {
    await recalculatePOFulfilment(r.purchaseOrderId);
  }
  res.json(await fmt(r));
});

/* Record Consignee Physical Receipt — Process Book Step 53-55 */
router.post("/deliveries/:id/record-receipt", async (req, res): Promise<void> => {
  let d = null;
  if (mongoose.Types.ObjectId.isValid(req.params.id)) {
    d = await Delivery.findById(req.params.id).catch(() => null);
  }
  if (!d) {
    d = await Delivery.findOne({ deliveryTrackingId: req.params.id }).catch(() => null);
  }
  if (!d) { res.status(404).json({ error: "Delivery consignment not found" }); return; }

  const receivedQty = typeof req.body.receivedQty === "number" ? req.body.receivedQty : (d.quantity || 1);
  const acceptedQty = typeof req.body.acceptedQty === "number" ? req.body.acceptedQty : receivedQty;
  const damagedQty = typeof req.body.damagedQty === "number" ? req.body.damagedQty : 0;
  const shortageQty = typeof req.body.shortageQty === "number" ? req.body.shortageQty : 0;
  const rejectedQty = typeof req.body.rejectedQty === "number" ? req.body.rejectedQty : 0;
  const returnedQty = typeof req.body.returnedQty === "number" ? req.body.returnedQty : 0;

  d.receivedQty = receivedQty;
  d.acceptedQty = acceptedQty;
  d.damagedQty = damagedQty;
  d.shortageQty = shortageQty;
  d.rejectedQty = rejectedQty;
  d.returnedQty = returnedQty;
  d.deliveredDate = req.body.deliveredDate ? new Date(req.body.deliveredDate) : new Date();
  d.receivedBy = req.body.receivedBy || "Consignee Store Officer";
  d.condition = req.body.condition || (damagedQty > 0 ? "damaged" : shortageQty > 0 ? "shortage" : "good");
  d.status = "delivered";

  if (Array.isArray(req.body.serialNumbers) && req.body.serialNumbers.length > 0) {
    d.serialNumbers = req.body.serialNumbers;
  }
  if (req.body.remarks) {
    d.discrepancyNotes = `${d.discrepancyNotes ? d.discrepancyNotes + " | " : ""}Receipt recorded: ${req.body.remarks}`;
  }

  await d.save();
  await recalculatePOFulfilment(d.purchaseOrderId);

  res.json({ message: "Consignee physical receipt recorded successfully", delivery: await fmt(d) });
});

/* Delivery Completion Certificate (DCC) Upload — Process Book §8 Step 9 & §12 F-23 (7-day SLA) */
router.post("/deliveries/:id/upload-dcc", async (req, res): Promise<void> => {
  const { filename = "DCC_Signed_Stamped.pdf", officerName, officerDesignation, certificateDate, comments } = req.body;
  let d = null;
  if (mongoose.Types.ObjectId.isValid(req.params.id)) {
    d = await Delivery.findById(req.params.id).catch(() => null);
  }
  if (!d) {
    d = await Delivery.findOne({ deliveryTrackingId: req.params.id }).catch(() => null);
  }
  if (!d) { res.status(404).json({ error: "Delivery consignment not found" }); return; }

  d.deliveryCertUploaded = true;
  d.documentsUploaded = true;
  d.deliveryCertFilename = filename;
  d.deliveryCertDate = certificateDate ? new Date(certificateDate) : new Date();
  if (comments) d.discrepancyNotes = `${d.discrepancyNotes ? d.discrepancyNotes + " | " : ""}DCC Upload: ${comments} (Signed by: ${officerName || "Medical Superintendent"}, ${officerDesignation || "HoD"})`;

  await d.save();

  // If QA is also accepted, mark delivery accepted & update PO
  if (d.qaDecision === "accepted") {
    d.status = "accepted";
    d.acceptanceCertificateIssued = true;
    await d.save();
  }

  await recalculatePOFulfilment(d.purchaseOrderId);

  res.json({ message: "Delivery Completion Certificate (DCC) uploaded successfully", delivery: await fmt(d) });
});

/* Delivery Completion Certificate (DCC) Verification — Workflow Steps 56-57 */
router.post("/deliveries/:id/verify-dcc", async (req, res): Promise<void> => {
  const { officerName = "Consignee Verification Officer", remarks = "Verified against physical delivery challan" } = req.body;
  let d = null;
  if (mongoose.Types.ObjectId.isValid(req.params.id)) {
    d = await Delivery.findById(req.params.id).catch(() => null);
  }
  if (!d) {
    d = await Delivery.findOne({ deliveryTrackingId: req.params.id }).catch(() => null);
  }
  if (!d) { res.status(404).json({ error: "Delivery consignment not found" }); return; }

  if (!d.deliveryCertUploaded) {
    res.status(400).json({ error: "Cannot verify DCC: DCC file has not been uploaded yet." });
    return;
  }

  d.dccVerified = true;
  d.dccVerifiedBy = officerName;
  d.dccVerifiedDate = new Date();
  d.discrepancyNotes = `${d.discrepancyNotes ? d.discrepancyNotes + " | " : ""}DCC Verified by ${officerName}: ${remarks}`;
  await d.save();

  await recalculatePOFulfilment(d.purchaseOrderId);

  res.json({ message: "Delivery Completion Certificate (DCC) verified successfully", delivery: await fmt(d) });
});

/* Upload Required Documents for Payment Clearance (Process Book §8 & §10) */
router.post("/deliveries/:id/upload-docs", async (req, res): Promise<void> => {
  const { docType, filename = "document.pdf", officerName, notes } = req.body;
  let d = null;
  if (mongoose.Types.ObjectId.isValid(req.params.id)) {
    d = await Delivery.findById(req.params.id).catch(() => null);
  }
  if (!d) {
    d = await Delivery.findOne({ deliveryTrackingId: req.params.id }).catch(() => null);
  }
  if (!d) { res.status(404).json({ error: "Delivery consignment not found" }); return; }

  d.documentsUploaded = true;
  if (docType === "dcc" || docType === "crc") {
    d.deliveryCertUploaded = true;
    d.deliveryCertFilename = filename;
    d.deliveryCertDate = new Date();
  }
  if (docType === "installation") {
    d.installationStatus = "complete";
    d.installationDate = new Date();
    d.trainingCompleted = true;
    d.acceptanceCertificateIssued = true;
  }
  if (docType === "qa") {
    d.qaDecision = "accepted";
    d.qaComplianceScore = 100;
  }
  d.discrepancyNotes = `${d.discrepancyNotes ? d.discrepancyNotes + " | " : ""}Doc Uploaded: [${(docType || "General").toUpperCase()}] ${filename} by ${officerName || "Consignee/Vendor"}`;
  await d.save();

  if (d.deliveryCertUploaded && d.qaDecision === "accepted") {
    d.status = "accepted";
    d.acceptanceCertificateIssued = true;
    await d.save();
  }

  await recalculatePOFulfilment(d.purchaseOrderId);

  res.json({ message: "Document uploaded and verified successfully", delivery: await fmt(d) });
});

/* Consignee Discrepancy Logging with Photos — Process Book §8 Step 7 & §12 F-17 */
router.post(["/deliveries/:id/log-discrepancy", "/deliveries/:id/discrepancies"], async (req, res): Promise<void> => {
  const { type = "damaged", description, quantity = 1, actionRequired = "replacement", photoUrl } = req.body;
  let d = null;
  if (mongoose.Types.ObjectId.isValid(req.params.id)) {
    d = await Delivery.findById(req.params.id).catch(() => null);
  }
  if (!d) {
    d = await Delivery.findOne({ deliveryTrackingId: req.params.id }).catch(() => null);
  }
  if (!d) { res.status(404).json({ error: "Delivery not found" }); return; }

  if (!d.discrepancies) d.discrepancies = [];
  d.discrepancies.push({
    type,
    description: photoUrl ? `${description} [Evidence Photo: ${photoUrl}]` : description,
    quantity,
    actionRequired,
    resolutionStatus: "open",
  });

  d.condition = type === "damaged" ? "damaged" : "shortage";
  d.discrepancyNotes = `${d.discrepancyNotes ? d.discrepancyNotes + " | " : ""}Discrepancy: ${type.toUpperCase()} (Qty: ${quantity}): ${description}`;
  if (type === "damaged") {
    d.damagedQty = (d.damagedQty || 0) + quantity;
  } else if (type === "shortage") {
    d.shortageQty = (d.shortageQty || 0) + quantity;
  }
  await d.save();

  await recalculatePOFulfilment(d.purchaseOrderId);

  res.json({ message: "Discrepancy logged for vendor rectification", delivery: await fmt(d) });
});

/* ── Resolve Delivery Discrepancy (Step 30: Vendor / Hospital Consignee) ── */
router.post("/deliveries/:id/resolve-discrepancy", async (req, res): Promise<void> => {
  try {
    let d = null;
    if (mongoose.Types.ObjectId.isValid(req.params.id)) {
      d = await Delivery.findById(req.params.id).catch(() => null);
    }
    if (!d) {
      d = await Delivery.findOne({ deliveryTrackingId: req.params.id }).catch(() => null);
    }
    if (!d) { res.status(404).json({ error: "Delivery not found" }); return; }

    const { discrepancyIndex = 0, resolutionNotes, resolvedBy = "Hospital Consignee", rectifiedQuantity } = req.body;
    if (!d.discrepancies || !d.discrepancies[discrepancyIndex]) {
      res.status(404).json({ error: "Discrepancy record not found" }); return;
    }

    const disc = d.discrepancies[discrepancyIndex];
    disc.resolutionStatus = "resolved";
    disc.resolvedDate = new Date();
    disc.resolvedNotes = resolutionNotes || `Rectification verified and accepted by ${resolvedBy}.`;

    const qty = rectifiedQuantity !== undefined ? Number(rectifiedQuantity) : (disc.quantity || 0);
    if (disc.type === "damaged" && d.damagedQty) {
      d.damagedQty = Math.max(0, d.damagedQty - qty);
      d.acceptedQty = (d.acceptedQty || 0) + qty;
    } else if ((disc.type === "short_delivery" || disc.type === "shortage") && d.shortageQty) {
      d.shortageQty = Math.max(0, d.shortageQty - qty);
      d.receivedQty = (d.receivedQty || 0) + qty;
      d.acceptedQty = (d.acceptedQty || 0) + qty;
    }

    const allResolved = d.discrepancies.every((item: any) => item.resolutionStatus === "resolved");
    if (allResolved) {
      d.condition = "good";
    }

    d.markModified("discrepancies");
    await d.save();
    await recalculatePOFulfilment(d.purchaseOrderId);

    res.json({ message: "Delivery discrepancy resolved successfully", delivery: await fmt(d) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/* QA Inspection & Decision — Process Book §9 Step 4-7 (Accepted / Conditional / Rejected) */
router.post("/deliveries/:id/qa-inspection", async (req, res): Promise<void> => {
  const { qaDecision = "accepted", qaComplianceScore = 100, qaNotes = "", inspectionItems = [], committeeName, rectificationDueDate } = req.body;
  let d = null;
  if (mongoose.Types.ObjectId.isValid(req.params.id)) {
    d = await Delivery.findById(req.params.id).catch(() => null);
  }
  if (!d) {
    d = await Delivery.findOne({ deliveryTrackingId: req.params.id }).catch(() => null);
  }
  if (!d) { res.status(404).json({ error: "Delivery not found" }); return; }

  if (!d.deliveryCertUploaded) {
    res.status(400).json({ error: "Delivery Completion Certificate must be uploaded before QA inspection can proceed." });
    return;
  }

  d.qaDecision = qaDecision;
  d.qaComplianceScore = qaComplianceScore;
  d.qaNotes = qaNotes;
  d.qaCommitteeName = committeeName || "Institutional Biomedical QA Committee";
  d.qaInspectionDate = new Date();
  if (Array.isArray(inspectionItems) && inspectionItems.length > 0) {
    d.qaInspectionItems = inspectionItems;
  }

  if (qaDecision === "accepted") {
    d.status = "accepted";
    d.acceptanceCertificateIssued = true;
    d.acceptanceCertDate = new Date();
    d.warrantyStartDate = new Date();
    d.warrantyEndDate = new Date(Date.now() + 365 * 86400000);
    d.acceptedQty = d.receivedQty || d.quantity;
  } else if (qaDecision === "conditional") {
    d.status = "conditional";
    d.acceptanceCertificateIssued = false;
    // 15-day vendor rectification SLA
    const due = rectificationDueDate ? new Date(rectificationDueDate) : new Date(Date.now() + 15 * 86400000);
    d.discrepancyNotes = `${d.discrepancyNotes ? d.discrepancyNotes + " | " : ""}Conditional Acceptance: Vendor granted 15 days rectification SLA (Due: ${due.toISOString().split("T")[0]}). Notes: ${qaNotes}`;
  } else if (qaDecision === "rejected") {
    d.status = "rejected";
    d.acceptanceCertificateIssued = false;
    d.rejectionReason = qaNotes || "Failed specification compliance";
    d.rejectedQty = d.quantity;
    d.acceptedQty = 0;
  }

  await d.save();
  await recalculatePOFulfilment(d.purchaseOrderId);

  res.json({ message: `QA Inspection completed: ${qaDecision.toUpperCase()}`, delivery: await fmt(d) });
});

/* QA Re-inspection — Process Book Steps 64-66 */
router.post("/deliveries/:id/qa-reinspection", async (req, res): Promise<void> => {
  const { qaDecision = "accepted", qaComplianceScore = 100, qaNotes = "", reinspectedBy = "QA Re-inspection Committee" } = req.body;
  let d = null;
  if (mongoose.Types.ObjectId.isValid(req.params.id)) {
    d = await Delivery.findById(req.params.id).catch(() => null);
  }
  if (!d) {
    d = await Delivery.findOne({ deliveryTrackingId: req.params.id }).catch(() => null);
  }
  if (!d) { res.status(404).json({ error: "Delivery not found" }); return; }

  d.isReinspection = true;
  d.reinspectionCount = (d.reinspectionCount || 0) + 1;
  d.reinspectionDecision = qaDecision;
  d.qaDecision = qaDecision;
  d.qaComplianceScore = qaComplianceScore;
  d.qaNotes = `${d.qaNotes ? d.qaNotes + " | " : ""}Re-inspection #${d.reinspectionCount} by ${reinspectedBy}: ${qaNotes}`;
  d.qaInspectionDate = new Date();

  if (qaDecision === "accepted") {
    d.status = "accepted";
    d.acceptanceCertificateIssued = true;
    d.acceptanceCertDate = new Date();
    d.warrantyStartDate = new Date();
    d.warrantyEndDate = new Date(Date.now() + 365 * 86400000);
    d.acceptedQty = d.receivedQty || d.quantity;
    d.rejectedQty = 0;
  } else {
    d.status = "rejected";
    d.acceptanceCertificateIssued = false;
    d.rejectedQty = d.quantity;
    d.acceptedQty = 0;
  }

  await d.save();
  await recalculatePOFulfilment(d.purchaseOrderId);

  res.json({ message: `QA Re-inspection completed: ${qaDecision.toUpperCase()}`, delivery: await fmt(d) });
});

/* Equipment Registration & Warranty Activation — Process Book Steps 68-70 */
router.post("/deliveries/:id/register-equipment", async (req, res): Promise<void> => {
  let d = null;
  if (mongoose.Types.ObjectId.isValid(req.params.id)) {
    d = await Delivery.findById(req.params.id).catch(() => null);
  }
  if (!d) {
    d = await Delivery.findOne({ deliveryTrackingId: req.params.id }).catch(() => null);
  }
  if (!d) { res.status(404).json({ error: "Delivery not found" }); return; }

  if (d.qaDecision !== "accepted" && d.status !== "accepted") {
    res.status(400).json({ error: "Cannot register equipment before QA inspection is accepted." });
    return;
  }

  const po = d.purchaseOrderId ? await PurchaseOrder.findById(d.purchaseOrderId).catch(() => null) : null;
  const countExisting = await EquipmentAsset.countDocuments();
  const qtyToRegister = Math.max(1, d.acceptedQty || d.quantity || 1);
  const createdAssets: any[] = [];
  const tags: string[] = [];

  const serials = (req.body.serialNumbers && Array.isArray(req.body.serialNumbers) && req.body.serialNumbers.length > 0)
    ? req.body.serialNumbers
    : (d.serialNumbers && d.serialNumbers.length > 0)
      ? d.serialNumbers
      : Array.from({ length: qtyToRegister }, (_, i) => `SN-${d.deliveryTrackingId || d._id.toString().slice(-6)}-${i + 1}`);

  for (let i = 0; i < qtyToRegister; i++) {
    const seq = countExisting + i + 1;
    const assetTag = `AST-${new Date().getFullYear()}-${String(seq).padStart(5, "0")}`;
    const sn = serials[i] || `SN-${d.deliveryTrackingId || d._id.toString().slice(-6)}-${i + 1}`;

    const asset = await EquipmentAsset.create({
      assetTag,
      serialNumber: sn,
      equipmentId: d.equipmentId || po?.equipmentId || d._id,
      equipmentName: d.equipmentName || po?.equipmentName || "Medical Equipment",
      category: req.body.category || "Medical Equipment",
      department: req.body.department || "Biomedical / General",
      make: req.body.make || po?.vendorName || d.vendorName || "",
      model: req.body.model || "",
      purchaseOrderId: d.purchaseOrderId || po?._id,
      poNumber: d.poNumber || po?.poNumber || "",
      indentId: po?.indentId,
      indentNumber: (po as any)?.indentNumber || (po?.indentDetails as any)?.indentNumber || "",
      deliveryId: d._id,
      deliveryTrackingId: d.deliveryTrackingId || "",
      grnNumber: req.body.grnNumber || d.grnNumber || (d.deliveryTrackingId ? `GRN/HPC/2026/${d.deliveryTrackingId.replace("DEL-", "")}` : `GRN-${d._id.toString().slice(-6)}`),
      grnDate: req.body.grnDate ? new Date(req.body.grnDate) : (d.grnDate || new Date()),
      institutionId: d.facilityId || po?.consignees?.[0]?.institutionId || d._id,
      institutionName: d.facilityName || po?.deliveryAddress || "Consignee Hospital",
      district: req.body.district || "",
      locationDetails: req.body.locationDetails || "Hospital Installation Wing",
      vendorId: d.vendorId || po?.vendorId,
      vendorName: d.vendorName || po?.vendorName || "",
      receiptDate: d.deliveredDate || new Date(),
      installationDate: req.body.installationDate ? new Date(req.body.installationDate) : new Date(),
      commissionedDate: new Date(),
      trainingCompletedDate: new Date(),
      warrantyStartDate: d.warrantyStartDate || new Date(),
      warrantyEndDate: d.warrantyEndDate || new Date(Date.now() + (d.warrantyMonths || 36) * 30 * 86400000),
      warrantyMonths: d.warrantyMonths || 36,
      status: "active",
      registeredBy: req.body.registeredBy || "Biomedical Engineer",
      registeredDate: new Date(),
      remarks: req.body.remarks || `Asset registered against Delivery ${d.deliveryTrackingId} and PO ${d.poNumber}`,
    });

    createdAssets.push(asset);
    tags.push(assetTag);
  }

  if (req.body.grnNumber) d.grnNumber = req.body.grnNumber;
  if (req.body.grnDate) d.grnDate = new Date(req.body.grnDate);
  if (req.body.annexure6) d.annexure6 = req.body.annexure6;
  d.equipmentRegistered = true;
  d.registeredAssetTags = tags;
  d.installationStatus = "complete";
  d.installationDate = req.body.installationDate ? new Date(req.body.installationDate) : new Date();
  d.trainingCompleted = true;
  await d.save();

  await recalculatePOFulfilment(d.purchaseOrderId);

  res.status(201).json({
    message: `Registered ${createdAssets.length} equipment asset(s) successfully`,
    assets: createdAssets,
    delivery: await fmt(d),
  });
});

/* List Equipment Assets Registered in the Hospital Inventory */
router.get("/equipment-assets", async (req, res): Promise<void> => {
  const filter: Record<string, any> = {};
  if (req.query.facilityId) filter.institutionId = req.query.facilityId;
  if (req.query.purchaseOrderId) filter.purchaseOrderId = req.query.purchaseOrderId;
  if (req.query.deliveryId) filter.deliveryId = req.query.deliveryId;
  if (req.query.status) filter.status = req.query.status;

  const assets = await EquipmentAsset.find(filter).sort({ createdAt: -1 });
  res.json(assets);
});

router.get("/equipment-assets/:id", async (req, res): Promise<void> => {
  let asset = null;
  if (mongoose.Types.ObjectId.isValid(req.params.id)) {
    asset = await EquipmentAsset.findById(req.params.id).catch(() => null);
  }
  if (!asset) {
    asset = await EquipmentAsset.findOne({ assetTag: req.params.id }).catch(() => null);
  }
  if (!asset) {
    res.status(404).json({ error: "Equipment asset not found" });
    return;
  }
  res.json(asset);
});

router.post("/deliveries/:id/accept", async (req, res): Promise<void> => {
  let r = null;
  if (mongoose.Types.ObjectId.isValid(req.params.id)) {
    r = await Delivery.findByIdAndUpdate(req.params.id, {
      status: "accepted", qaDecision: "accepted",
      acceptedQty: req.body.acceptedQty || undefined,
      acceptanceCertificateIssued: true, acceptanceCertDate: new Date(),
      warrantyStartDate: new Date(),
      warrantyEndDate: new Date(Date.now() + 365 * 86400000),
    }, { new: true });
  }
  if (!r) {
    r = await Delivery.findOneAndUpdate({ deliveryTrackingId: req.params.id }, {
      status: "accepted", qaDecision: "accepted",
      acceptedQty: req.body.acceptedQty || undefined,
      acceptanceCertificateIssued: true, acceptanceCertDate: new Date(),
      warrantyStartDate: new Date(),
      warrantyEndDate: new Date(Date.now() + 365 * 86400000),
    }, { new: true });
  }
  if (!r) { res.status(404).json({ error: "Not found" }); return; }

  // Update associated PO and Indent
  if (r.purchaseOrderId) {
    await recalculatePOFulfilment(r.purchaseOrderId);
    const po = await PurchaseOrder.findById(r.purchaseOrderId);
    if (po?.indentId) {
      await Indent.findByIdAndUpdate(po.indentId, { status: "completed" });
    }
  }

  res.json(await fmt(r));
});

export default router;
