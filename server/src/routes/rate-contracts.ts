import { Router } from "express";
import mongoose from "mongoose";
import { RateContract } from "../models/RateContract.js";
import { Equipment } from "../models/Equipment.js";
import { Vendor } from "../models/Vendor.js";

const router = Router();

async function fmt(r: any) {
  const eq = r.equipmentName ? null : await Equipment.findById(r.equipmentId);
  const vn = r.vendorName ? null : await Vendor.findById(r.vendorId);
  const now = new Date();
  const end = new Date(r.endDate);
  const daysToExpiry = Math.ceil((end.getTime() - now.getTime()) / 86400000);
  const startDateStr = r.startDate instanceof Date ? r.startDate.toISOString() : new Date(r.startDate).toISOString();
  const endDateStr = r.endDate instanceof Date ? r.endDate.toISOString() : new Date(r.endDate).toISOString();
  return {
    id: r._id.toString(),
    contractNumber: r.contractNumber,
    financialYear: r.financialYear ?? "2025-26",
    equipmentId: r.equipmentId.toString(),
    equipmentName: r.equipmentName || eq?.name || "Unknown",
    equipmentCategory: r.equipmentCategory ?? "",
    tenderId: r.tenderId?.toString() ?? null,
    tenderRef: r.tenderRef ?? "",
    vendorId: r.vendorId.toString(),
    vendorName: r.vendorName || vn?.name || "Unknown",
    l1VendorName: r.l1VendorName ?? "", l2VendorName: r.l2VendorName ?? "", l3VendorName: r.l3VendorName ?? "",
    unitPrice: r.unitPrice,
    gstRate: r.gstRate,
    unitPriceInclTax: r.unitPriceInclTax || r.unitPrice * (1 + r.gstRate / 100),
    maxOrderQty: r.maxOrderQty ?? 0,
    warrantyMonths: r.warrantyMonths ?? (r.warrantyYears ? r.warrantyYears * 12 : 36),
    supplyPeriodDays: r.supplyPeriodDays ?? 45,
    awardDate: r.awardDate ? (r.awardDate instanceof Date ? r.awardDate.toISOString() : new Date(r.awardDate).toISOString()) : null,
    startDate: startDateStr,
    endDate: endDateStr,
    validityEndDate: endDateStr,
    daysToExpiry,
    expiryStatus: daysToExpiry < 0 ? "expired" : daysToExpiry <= 30 ? "critical" : daysToExpiry <= 90 ? "warning" : "ok",
    camcApplicable: r.camcApplicable ?? false,
    camcPeriodYears: r.camcPeriodYears ?? 0,
    camcRatePerYear: r.camcRatePerYear ?? 0,
    bfcApprovalRef: r.bfcApprovalRef ?? "",
    specsConfirmed: r.specsConfirmed ?? false,
    approvalStatus: r.approvalStatus ?? "approved",
    amendments: r.amendments ?? [],
    totalPOsIssued: r.totalPOsIssued ?? 0,
    totalQtyOrdered: r.totalQtyOrdered ?? 0,
    totalValueOrdered: r.totalValueOrdered ?? 0,
    status: r.status,
    closureReason: r.closureReason ?? "",
    createdAt: r.createdAt ? (r.createdAt instanceof Date ? r.createdAt.toISOString() : new Date(r.createdAt).toISOString()) : new Date().toISOString(),
    updatedAt: r.updatedAt ? (r.updatedAt instanceof Date ? r.updatedAt.toISOString() : new Date(r.updatedAt).toISOString()) : new Date().toISOString(),
  };
}

router.get("/rate-contracts", async (req, res): Promise<void> => {
  const filter: Record<string, any> = {};
  if (req.query.status && req.query.status !== "all") filter.status = req.query.status;
  if (req.query.equipmentId) filter.equipmentId = req.query.equipmentId;
  const rows = await RateContract.find(filter).sort({ createdAt: -1 });
  res.json(await Promise.all(rows.map(fmt)));
});

router.get("/rate-contracts/expiring-soon", async (_req, res): Promise<void> => {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + 90);
  const rows = await RateContract.find({ status: "active", endDate: { $lte: cutoff } }).sort({ endDate: 1 });
  res.json(await Promise.all(rows.map(fmt)));
});

router.get("/rate-contracts/:id", async (req, res): Promise<void> => {
  try {
    let r = null;
    if (mongoose.isValidObjectId(req.params.id)) {
      r = await RateContract.findById(req.params.id);
    }
    if (!r) {
      r = await RateContract.findOne({ contractNumber: req.params.id });
    }
    if (!r) {
      r = await RateContract.findOne({ contractNumber: { $regex: new RegExp(`^${req.params.id}$`, "i") } });
    }
    if (!r) {
      res.status(404).json({ error: "Rate contract not found" });
      return;
    }
    res.json(await fmt(r));
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to fetch rate contract" });
  }
});

router.post("/rate-contracts", async (req, res): Promise<void> => {
  const { equipmentId, vendorId, unitPrice, gstRate, startDate, endDate } = req.body;
  if (!equipmentId || !vendorId || !unitPrice || !startDate || !endDate) {
    res.status(400).json({ error: "equipmentId, vendorId, unitPrice, startDate, endDate required" }); return;
  }
  const count = await RateContract.countDocuments();
  const eq = await Equipment.findById(equipmentId);
  const vn = await Vendor.findById(vendorId);
  const rc = await RateContract.create({
    contractNumber: `RC-2526-${String(count + 1).padStart(4, "0")}`,
    equipmentId, equipmentName: eq?.name ?? "", equipmentCategory: eq?.category ?? "",
    vendorId, vendorName: vn?.name ?? "", l1VendorName: vn?.name ?? "",
    unitPrice, gstRate: gstRate ?? 12,
    unitPriceInclTax: unitPrice * (1 + (gstRate ?? 12) / 100),
    warrantyMonths: req.body.warrantyMonths ?? 12,
    supplyPeriodDays: req.body.supplyPeriodDays ?? 45,
    startDate: new Date(startDate), endDate: new Date(endDate),
    camcApplicable: req.body.camcApplicable ?? false,
    camcPeriodYears: req.body.camcPeriodYears ?? 0,
    camcRatePerYear: req.body.camcRatePerYear ?? 0,
    status: "active", approvalStatus: "approved",
    ...req.body,
  });
  res.status(201).json(await fmt(rc));
});

router.patch("/rate-contracts/:id/submit-for-approval", async (req, res): Promise<void> => {
  const { submittedBy } = req.body;
  const r = await RateContract.findByIdAndUpdate(req.params.id, { approvalStatus: "pending", status: "pending_approval" }, { new: true });
  if (!r) { res.status(404).json({ error: "Not found" }); return; }
  res.json(await fmt(r));
});

router.patch("/rate-contracts/:id/gm-review", async (req, res): Promise<void> => {
  const { action, comments, reviewedBy } = req.body;
  if (!["proposed_approve", "proposed_reject", "returned"].includes(action)) {
    res.status(400).json({ error: "Invalid action" }); return;
  }
  const r = await RateContract.findByIdAndUpdate(req.params.id, { approvalStatus: action }, { new: true });
  if (!r) { res.status(404).json({ error: "Not found" }); return; }
  res.json(await fmt(r));
});

router.patch("/rate-contracts/:id/so-decision", async (req, res): Promise<void> => {
  const { action, comments, approvedBy } = req.body;
  if (!["approved", "rejected"].includes(action)) {
    res.status(400).json({ error: "Invalid action" }); return;
  }
  const updates: any = { approvalStatus: action };
  if (action === "approved") {
    updates.status = "active";
    updates.approvedBy = approvedBy;
    updates.approvedDate = new Date();
  } else {
    updates.status = "rejected";
  }
  const r = await RateContract.findByIdAndUpdate(req.params.id, updates, { new: true });
  if (!r) { res.status(404).json({ error: "Not found" }); return; }
  res.json(await fmt(r));
});

router.post("/rate-contracts/:id/amend", async (req, res): Promise<void> => {
  const { amendmentType, description, previousValue, newValue, requestedBy } = req.body;
  const rc = await RateContract.findById(req.params.id);
  if (!rc) { res.status(404).json({ error: "Not found" }); return; }
  
  const serial = rc.amendments ? rc.amendments.length + 1 : 1;
  const amendmentRef = `${rc.contractNumber}-AMD-${String(serial).padStart(3, '0')}`;
  
  const r = await RateContract.findByIdAndUpdate(req.params.id, {
    $push: { 
      amendments: {
        amendmentRef, amendmentType, description, previousValue, newValue, 
        approvedBy: requestedBy, approvedDate: new Date(), status: "approved" 
      } 
    }
  }, { new: true });
  if (!r) { res.status(404).json({ error: "Not found" }); return; }
  res.json(await fmt(r));
});

router.patch("/rate-contracts/:id/close", async (req, res): Promise<void> => {
  const { closureReason, closedBy } = req.body;
  const r = await RateContract.findByIdAndUpdate(req.params.id, { status: "closed", closureReason }, { new: true });
  if (!r) { res.status(404).json({ error: "Not found" }); return; }
  res.json(await fmt(r));
});

router.patch("/rate-contracts/:id", async (req, res): Promise<void> => {
  const r = await RateContract.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!r) { res.status(404).json({ error: "Not found" }); return; }
  res.json(await fmt(r));
});

export default router;
