import { Router } from "express";
import { District } from "../models/District.js";
import { FundingSource } from "../models/FundingSource.js";
import { Programme } from "../models/Programme.js";
import { AccountHead } from "../models/AccountHead.js";
import { TaxSlab } from "../models/TaxSlab.js";
import { Institution } from "../models/Institution.js";
import { AuditLog } from "../models/AuditLog.js";
import { Notification } from "../models/Notification.js";

const router = Router();

/* ── Districts ────────────────────────────────────────────────────────── */
router.get("/districts", async (_req, res) => {
  res.json(await District.find({ isActive: true }).sort({ name: 1 }));
});

/* ── DME Master Data ──────────────────────────────────────────────────── */
router.get("/dme-master", async (_req, res) => {
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
  })));
});

/* ── Funding Sources ──────────────────────────────────────────────────── */
router.get("/funding-sources", async (_req, res) => {
  res.json(await FundingSource.find({ isActive: true }).sort({ name: 1 }));
});

/* ── Programmes ───────────────────────────────────────────────────────── */
router.get("/programmes", async (_req, res) => {
  const rows = await Programme.find({ isActive: true }).sort({ name: 1 });
  const enriched = await Promise.all(
    rows.map(async (p) => {
      const fs = await FundingSource.findById(p.fundingSourceId);
      return {
        ...p.toObject(),
        id: p._id.toString(),
        fundingSourceName: fs?.name ?? "",
      };
    })
  );
  res.json(enriched);
});

/* ── Account Heads ────────────────────────────────────────────────────── */
router.get("/account-heads", async (_req, res) => {
  res.json(await AccountHead.find({ isActive: true }).sort({ name: 1 }));
});

/* ── Tax Slabs ────────────────────────────────────────────────────────── */
router.get("/tax-slabs", async (_req, res) => {
  res.json(await TaxSlab.find({ isActive: true }).sort({ hsnCode: 1 }));
});

/* ── Audit Log ────────────────────────────────────────────────────────── */
router.get("/audit-log", async (req, res) => {
  const filter: Record<string, any> = {};
  if (req.query.entityType) filter.entityType = req.query.entityType;
  if (req.query.entityId) filter.entityId = req.query.entityId;
  const logs = await AuditLog.find(filter).sort({ timestamp: -1 }).limit(200);
  res.json(logs);
});

/* ── Notifications ────────────────────────────────────────────────────── */
router.get("/notifications", async (req, res) => {
  const userId = (req.query.userId as string) || "";
  if (!userId) {
    res.json([]);
    return;
  }
  const notifs = await Notification.find({ userId }).sort({ createdAt: -1 }).limit(50);
  res.json(notifs);
});

router.patch("/notifications/:id/read", async (req, res): Promise<void> => {
  const notif = await Notification.findByIdAndUpdate(
    req.params.id,
    { isRead: true, readAt: new Date() },
    { new: true }
  );
  if (!notif) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(notif);
});

export default router;
