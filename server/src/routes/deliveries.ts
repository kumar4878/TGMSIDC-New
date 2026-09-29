import { Router } from "express";
import mongoose from "mongoose";
import { Delivery } from "../models/Delivery.js";
import { PurchaseOrder } from "../models/PurchaseOrder.js";
import { Vendor } from "../models/Vendor.js";
import { Institution } from "../models/Institution.js";
import { Equipment } from "../models/Equipment.js";
import { Indent } from "../models/Indent.js";

const router = Router();

async function fmt(r: any) {
  const vn = r.vendorName ? null : (mongoose.Types.ObjectId.isValid(r.vendorId) ? await Vendor.findById(r.vendorId).catch(() => null) : null);
  const fac = r.facilityName ? null : (mongoose.Types.ObjectId.isValid(r.facilityId) ? await Institution.findById(r.facilityId).catch(() => null) : null);
  return {
    id: r._id.toString(),
    deliveryTrackingId: r.deliveryTrackingId ?? r.qrCode ?? r._id.toString().slice(-8),
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
    discrepancies: r.discrepancies ?? [],
    discrepancyNotes: r.discrepancyNotes ?? "",
    qaInspectionItems: r.qaInspectionItems ?? [],
    qaCommitteeName: r.qaCommitteeName ?? "",
    qaInspectionDate: r.qaInspectionDate?.toISOString() ?? null,
    qaDecision: r.qaDecision ?? "pending",
    qaComplianceScore: r.qaComplianceScore ?? 0,
    qaNotes: r.qaNotes ?? "",
    acceptanceCertificateIssued: r.acceptanceCertificateIssued,
    installationRequired: r.installationRequired ?? false,
    installationStatus: r.installationStatus ?? "not_required",
    installationDate: r.installationDate?.toISOString() ?? null,
    trainingCompleted: r.trainingCompleted ?? false,
    warrantyStartDate: r.warrantyStartDate?.toISOString() ?? null,
    warrantyEndDate: r.warrantyEndDate?.toISOString() ?? null,
    warrantyMonths: r.warrantyMonths ?? 12,
    paymentStatus: r.paymentStatus ?? "not_paid",
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
  const { purchaseOrderId, vendorId, facilityId, quantity } = req.body;
  if (!purchaseOrderId || !quantity) {
    res.status(400).json({ error: "purchaseOrderId and quantity are required" }); return;
  }

  let po = null;
  if (mongoose.Types.ObjectId.isValid(purchaseOrderId)) {
    po = await PurchaseOrder.findById(purchaseOrderId).catch(() => null);
  }
  if (!po) {
    po = await PurchaseOrder.findOne({ poNumber: purchaseOrderId }).catch(() => null);
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
  const d = await Delivery.create({
    deliveryTrackingId: `DEL-${String(count + 1).padStart(5, "0")}`,
    purchaseOrderId: po?._id || purchaseOrderId,
    poNumber: po?.poNumber ?? req.body.poNumber ?? "",
    vendorId: vn?._id || vId,
    vendorName: vn?.name || po?.vendorName || req.body.vendorName || "Empanelled Vendor",
    facilityId: fac?._id || fId,
    facilityName: fac?.name || po?.deliveryAddress || req.body.facilityName || "Consignee Hospital",
    equipmentId: po?.equipmentId,
    equipmentName: po?.equipmentName || req.body.equipmentName || "Medical Equipment",
    orderedQty: po?.quantity ?? quantity,
    quantity,
    expectedDeliveryDate: po?.expectedDeliveryDate,
    status: req.body.status || "dispatched",
    dispatchDate: req.body.dispatchDate ? new Date(req.body.dispatchDate) : new Date(),
    ...req.body,
  });

  if (po) {
    po.status = "dispatched";
    await po.save();
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
  res.json(await fmt(r));
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
    if (d.purchaseOrderId) {
      await PurchaseOrder.findByIdAndUpdate(d.purchaseOrderId, { status: "delivered" });
    }
  }

  res.json({ message: "Delivery Completion Certificate (DCC) uploaded successfully", delivery: await fmt(d) });
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
    if (d.purchaseOrderId) {
      await PurchaseOrder.findByIdAndUpdate(d.purchaseOrderId, { status: "delivered" });
    }
  }

  res.json({ message: "Document uploaded and verified successfully", delivery: await fmt(d) });
});

/* Consignee Discrepancy Logging with Photos — Process Book §8 Step 7 & §12 F-17 */
router.post("/deliveries/:id/log-discrepancy", async (req, res): Promise<void> => {
  const { type = "damaged", description, quantity = 1, actionRequired = "replacement", photoUrl } = req.body;
  const d = await Delivery.findById(req.params.id);
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
  await d.save();

  res.json({ message: "Discrepancy logged for vendor rectification", delivery: await fmt(d) });
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
    if (d.purchaseOrderId) {
      await PurchaseOrder.findByIdAndUpdate(d.purchaseOrderId, { status: "delivered" });
    }
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
  }

  await d.save();
  res.json({ message: `QA Inspection completed: ${qaDecision.toUpperCase()}`, delivery: await fmt(d) });
});

router.post("/deliveries/:id/accept", async (req, res): Promise<void> => {
  let r = null;
  if (mongoose.Types.ObjectId.isValid(req.params.id)) {
    r = await Delivery.findByIdAndUpdate(req.params.id, {
      status: "accepted", qaDecision: "accepted",
      acceptanceCertificateIssued: true, acceptanceCertDate: new Date(),
      warrantyStartDate: new Date(),
      warrantyEndDate: new Date(Date.now() + 365 * 86400000),
    }, { new: true });
  }
  if (!r) {
    r = await Delivery.findOneAndUpdate({ deliveryTrackingId: req.params.id }, {
      status: "accepted", qaDecision: "accepted",
      acceptanceCertificateIssued: true, acceptanceCertDate: new Date(),
      warrantyStartDate: new Date(),
      warrantyEndDate: new Date(Date.now() + 365 * 86400000),
    }, { new: true });
  }
  if (!r) { res.status(404).json({ error: "Not found" }); return; }

  // Update associated PO and Indent
  if (r.purchaseOrderId) {
    const po = await PurchaseOrder.findByIdAndUpdate(r.purchaseOrderId, { status: "delivered" }, { new: true });
    if (po?.indentId) {
      await Indent.findByIdAndUpdate(po.indentId, { status: "completed" });
    }
  }

  res.json(await fmt(r));
});

export default router;
