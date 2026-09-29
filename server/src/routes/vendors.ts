import { Router } from "express";
import { Vendor } from "../models/Vendor.js";

const router = Router();

router.get("/vendors", async (_req, res): Promise<void> => {
  const rows = await Vendor.find().sort({ name: 1 });
  res.json(rows.map(v => ({
    id: v._id.toString(), vendorCode: v.vendorCode, name: v.name,
    contactEmail: v.contactEmail, contactPhone: v.contactPhone,
    contactPerson: v.contactPerson, address: v.address,
    gstNumber: v.gstNumber, panNumber: v.panNumber,
    bankName: v.bankName, bankBranch: v.bankBranch,
    bankIfsc: v.bankIfsc, bankAccountNo: v.bankAccountNo,
    vendorTier: v.vendorTier,
    performanceScore: v.performanceScore, onTimeDeliveryRate: v.onTimeDeliveryRate,
    qaPassRate: v.qaPassRate, complianceScore: v.complianceScore,
    totalPOs: v.totalPOs, totalDeliveries: v.totalDeliveries,
    status: v.status, isActive: v.isActive,
    createdAt: v.createdAt.toISOString(),
  })));
});

router.get("/vendors/:id", async (req, res): Promise<void> => {
  const v = await Vendor.findById(req.params.id);
  if (!v) { res.status(404).json({ error: "Not found" }); return; }
  res.json({
    id: v._id.toString(), vendorCode: v.vendorCode, name: v.name,
    contactEmail: v.contactEmail, contactPhone: v.contactPhone,
    contactPerson: v.contactPerson, address: v.address,
    gstNumber: v.gstNumber, panNumber: v.panNumber,
    bankName: v.bankName, bankBranch: v.bankBranch,
    bankIfsc: v.bankIfsc, bankAccountNo: v.bankAccountNo,
    vendorTier: v.vendorTier,
    performanceScore: v.performanceScore, onTimeDeliveryRate: v.onTimeDeliveryRate,
    qaPassRate: v.qaPassRate, complianceScore: v.complianceScore,
    totalPOs: v.totalPOs, totalDeliveries: v.totalDeliveries,
    status: v.status, isActive: v.isActive,
    createdAt: v.createdAt.toISOString(),
  });
});

router.post("/vendors", async (req, res): Promise<void> => {
  const { name, contactEmail, contactPhone, address, gstNumber } = req.body;
  if (!name || !contactEmail || !contactPhone || !address || !gstNumber) {
    res.status(400).json({ error: "Missing required fields" }); return;
  }
  const count = await Vendor.countDocuments();
  const v = await Vendor.create({
    vendorCode: `VND-${String(count + 1).padStart(4, "0")}`,
    ...req.body, status: "active", isActive: true,
  });
  res.status(201).json({ id: v._id.toString(), ...v.toObject() });
});

router.patch("/vendors/:id", async (req, res): Promise<void> => {
  const v = await Vendor.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!v) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ id: v._id.toString(), ...v.toObject() });
});

export default router;
