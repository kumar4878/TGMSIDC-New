import { Router } from "express";
import { Equipment } from "../models/Equipment.js";

const router = Router();

router.get("/equipment", async (_req, res): Promise<void> => {
  const rows = await Equipment.find({ isActive: true }).sort({ equipmentCode: 1 });
  res.json(rows.map(e => ({
    id: e._id.toString(), equipmentCode: e.equipmentCode, name: e.name,
    commonName: e.commonName || e.name,
    category: e.category, department: e.department, facilityType: e.facilityType,
    specifications: e.specifications, hsnCode: e.hsnCode, gstRate: e.gstRate,
    estimatedUnitCost: e.estimatedUnitCost, standardised: e.standardised,
    technicalSpecs: e.technicalSpecs,
    isActive: e.isActive, createdAt: e.createdAt.toISOString(),
  })));
});

router.post("/equipment", async (req, res): Promise<void> => {
  const { name, category, specifications } = req.body;
  if (!name || !category || !specifications) {
    res.status(400).json({ error: "name, category, specifications required" }); return;
  }
  const count = await Equipment.countDocuments();
  const e = await Equipment.create({
    equipmentCode: `EQ-${String(count + 1).padStart(4, "0")}`,
    ...req.body, isActive: true,
  });
  res.status(201).json({ id: e._id.toString(), ...e.toObject() });
});

export default router;
