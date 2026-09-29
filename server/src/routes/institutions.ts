import { Router } from "express";
import { Institution } from "../models/Institution.js";

const router = Router();

router.get("/institutions", async (req, res): Promise<void> => {
  const { dme, district } = req.query;
  const filter: any = { isActive: true };
  if (district) filter.district = district;
  if (dme === "true") {
    filter.$or = [
      { dmeInstitutionId: { $exists: true, $ne: null } },
      { institutionCode: { $regex: /^DME-/i } },
      { hodName: { $regex: /medical education/i } }
    ];
  }
  const rows = await Institution.find(filter).sort({ institutionCode: 1, name: 1 });
  res.json(rows.map(i => ({
    id: i._id.toString(),
    institutionCode: i.institutionCode,
    dmeInstitutionId: i.dmeInstitutionId ?? (i.institutionCode.startsWith("DME-") ? i.institutionCode : undefined),
    name: i.name,
    type: i.type,
    facilityType: i.facilityType,
    district: i.district,
    address: i.address,
    superintendentName: i.superintendentName ?? "",
    contactPerson: i.contactPerson,
    contactPhone: i.contactPhone,
    contactEmail: i.contactEmail ?? "",
    hodName: i.hodName ?? "",
    isActive: i.isActive,
    createdAt: i.createdAt.toISOString(),
  })));
});

router.get("/dme-institutions", async (_req, res): Promise<void> => {
  const rows = await Institution.find({
    isActive: true,
    $or: [
      { dmeInstitutionId: { $exists: true, $ne: null } },
      { institutionCode: { $regex: /^DME-/i } },
      { hodName: { $regex: /medical education/i } }
    ]
  }).sort({ institutionCode: 1, name: 1 });

  res.json(rows.map(i => ({
    id: i._id.toString(),
    dmeInstitutionId: i.dmeInstitutionId ?? i.institutionCode,
    institutionCode: i.institutionCode,
    name: i.name,
    type: i.type,
    facilityType: i.facilityType,
    district: i.district,
    address: i.address,
    superintendentName: i.superintendentName ?? "",
    contactPerson: i.contactPerson,
    contactPhone: i.contactPhone,
    contactEmail: i.contactEmail ?? "",
    hodName: i.hodName ?? "Director of Medical Education",
    isActive: i.isActive,
    createdAt: i.createdAt.toISOString(),
  })));
});

router.post("/institutions", async (req, res): Promise<void> => {
  const { name, type, district, address, institutionCode, dmeInstitutionId, facilityType } = req.body;
  if (!name || !district) {
    res.status(400).json({ error: "name and district required" }); return;
  }
  const count = await Institution.countDocuments();
  const code = institutionCode || dmeInstitutionId || `INST-${String(count + 1).padStart(4, "0")}`;
  const i = await Institution.create({
    institutionCode: code,
    dmeInstitutionId: dmeInstitutionId || (code.startsWith("DME-") ? code : undefined),
    type: type || "DME",
    facilityType: facilityType || "Hospital",
    address: address || `${name}, ${district}`,
    ...req.body,
    isActive: true,
  });
  res.status(201).json({ id: i._id.toString(), ...i.toObject() });
});

export default router;
