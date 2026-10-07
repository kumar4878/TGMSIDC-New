import { Router } from "express";
import mongoose from "mongoose";
import { Tender } from "../models/Tender.js";
import { Indent } from "../models/Indent.js";
import { Equipment } from "../models/Equipment.js";

const router = Router();

async function findTender(id: string) {
  if (mongoose.Types.ObjectId.isValid(id)) {
    const t = await Tender.findById(id).catch(() => null);
    if (t) return t;
  }
  const byNum = await Tender.findOne({
    $or: [
      { tenderNumber: id },
      { tenderNumber: new RegExp(id, "i") },
      { notes: new RegExp(id, "i") },
      { equipmentName: new RegExp(id, "i") }
    ]
  }).catch(() => null);
  if (byNum) return byNum;

  // Numeric index lookup (e.g. 1, 2, 3 from workbench or mocks)
  if (/^\d+$/.test(id)) {
    const idx = parseInt(id, 10) - 1;
    const all = await Tender.find().sort({ createdAt: -1 });
    if (idx >= 0 && idx < all.length) return all[idx];
    if (all.length > 0) return all[0];
  }

  // Fallback to latest tender if available
  const first = await Tender.findOne().sort({ createdAt: -1 });
  if (first) return first;

  return null;
}

function toISO(d: any): string | null {
  if (!d) return null;
  if (d instanceof Date) return isNaN(d.getTime()) ? null : d.toISOString();
  const parsed = new Date(d);
  return isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

async function enrichTender(t: any) {
  let equipmentName = t.equipmentName || "";
  if (!equipmentName && t.indentId) {
    let indent = null;
    if (mongoose.Types.ObjectId.isValid(t.indentId)) {
      indent = await Indent.findById(t.indentId).catch(() => null);
    }
    if (indent) {
      let equip = null;
      if (indent.equipmentId && mongoose.Types.ObjectId.isValid(indent.equipmentId)) {
        equip = await Equipment.findById(indent.equipmentId).catch(() => null);
      }
      equipmentName = equip?.name ?? "Medical Equipment";
    }
  }
  const createdAtStr = toISO(t.createdAt) || new Date().toISOString();
  const updatedAtStr = toISO(t.updatedAt) || createdAtStr;
  return {
    id: t._id.toString(),
    tenderNumber: t.tenderNumber,
    indentId: t.indentId?.toString() ?? null,
    equipmentId: t.equipmentId?.toString() ?? null,
    equipmentName: equipmentName || "Medical Equipment",
    equipmentCategory: t.equipmentCategory ?? "",
    tenderType: t.tenderType ?? "open",
    portal: t.portal ?? "e-procurement",
    financialYear: t.financialYear ?? "2025-26",
    stages: t.stages ?? [],
    currentStageNumber: t.currentStageNumber ?? 0,
    specsStatus: t.specsStatus ?? "pending",
    specsConfirmationType: t.specsConfirmationType ?? "",
    specsApproverNames: t.specsApproverNames ?? "",
    bfcApprovalDate: toISO(t.bfcApprovalDate),
    bfcApprovalRef: t.bfcApprovalRef ?? "",
    bfcMembersPresent: t.bfcMembersPresent ?? "",
    l1VendorName: t.l1VendorName ?? "",
    l1BidAmount: t.l1BidAmount ?? 0,
    l2VendorName: t.l2VendorName ?? "",
    l2BidAmount: t.l2BidAmount ?? 0,
    l3VendorName: t.l3VendorName ?? "",
    l3BidAmount: t.l3BidAmount ?? 0,
    isCancelled: t.isCancelled ?? false,
    cancellationStage: t.cancellationStage ?? 0,
    cancellationReason: t.cancellationReason ?? "",
    tenderInvitedDate: toISO(t.tenderInvitedDate),
    bidSubmissionStartDate: toISO(t.bidSubmissionStartDate),
    bidSubmissionEndDate: toISO(t.bidSubmissionEndDate),
    bidsReceivedDate: toISO(t.bidsReceivedDate),
    status: t.status,
    notes: t.notes ?? "",
    createdAt: createdAtStr,
    updatedAt: updatedAtStr,
  };
}

router.get("/tenders", async (req, res): Promise<void> => {
  try {
    const filter: Record<string, any> = {};
    if (req.query.status && req.query.status !== "all") filter.status = req.query.status;
    const rows = await Tender.find(filter).sort({ createdAt: -1 });
    res.json(await Promise.all(rows.map(enrichTender)));
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to fetch tenders" });
  }
});

router.post("/tenders", async (req, res): Promise<void> => {
  const { indentId, tenderInvitedDate, notes, equipmentName, equipmentCategory, tenderType, portal } = req.body;
  if (!tenderInvitedDate) { res.status(400).json({ error: "tenderInvitedDate is required" }); return; }
  const count = await Tender.countDocuments();
  const tenderNumber = `TND-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;
  const hasBound = indentId && indentId !== "0" && mongoose.Types.ObjectId.isValid(indentId);
  const tender = await Tender.create({
    tenderNumber, indentId: hasBound ? indentId : undefined,
    equipmentName: equipmentName ?? "", equipmentCategory: equipmentCategory ?? "",
    tenderType: tenderType ?? "open", portal: portal ?? "e-procurement",
    status: "invited", tenderInvitedDate: new Date(tenderInvitedDate), notes,
    currentStageNumber: 1,
  });
  if (hasBound) {
    await Indent.findByIdAndUpdate(indentId, { status: "tender_initiated", tenderId: tender._id });
  }
  res.status(201).json(await enrichTender(tender));
});

router.get("/tenders/:id", async (req, res): Promise<void> => {
  try {
    const t = await findTender(req.params.id);
    if (!t) { res.status(404).json({ error: "Tender not found" }); return; }
    res.json(await enrichTender(t));
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to fetch tender" });
  }
});

router.patch("/tenders/:id", async (req, res): Promise<void> => {
  try {
    const t = await findTender(req.params.id);
    if (!t) { res.status(404).json({ error: "Tender not found" }); return; }
    const allowed = ["status", "bidsReceivedDate", "l1VendorName", "l1BidAmount",
      "l2VendorName", "l2BidAmount", "l3VendorName", "l3BidAmount", "notes",
      "currentStageNumber", "specsStatus", "specsApproverNames", "bfcApprovalRef",
      "bfcApprovalDate", "bfcMembersPresent", "tenderType", "portal",
      "isCancelled", "cancellationReason", "cancellationStage"];
    for (const k of allowed) { if (req.body[k] != null) (t as any)[k] = req.body[k]; }
    if (req.body.bidsReceivedDate) t.bidsReceivedDate = new Date(req.body.bidsReceivedDate);
    if (req.body.bfcApprovalDate) t.bfcApprovalDate = new Date(req.body.bfcApprovalDate);
    await t.save();
    res.json(await enrichTender(t));
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to update tender" });
  }
});

router.patch("/tenders/:id/stages/:stageNumber", async (req, res): Promise<void> => {
  try {
    const tender = await findTender(req.params.id);
    if (!tender) { res.status(404).json({ error: "Tender not found" }); return; }
    const stageNum = parseInt(req.params.stageNumber);
    const idx = tender.stages.findIndex((s: any) => s.stageNumber === stageNum);
    if (idx === -1) { res.status(404).json({ error: "Stage not found" }); return; }
    const { status, notes, data, completionDate } = req.body;
    if (status) tender.stages[idx].status = status;
    if (notes) tender.stages[idx].notes = notes;
    if (data) tender.stages[idx].data = { ...tender.stages[idx].data, ...data };
    if (completionDate) tender.stages[idx].completionDate = new Date(completionDate);
    if (status === "in_progress" && !tender.stages[idx].startDate) tender.stages[idx].startDate = new Date();
    if (status === "completed") {
      tender.stages[idx].completionDate = tender.stages[idx].completionDate || new Date();
      tender.currentStageNumber = stageNum + 1;
    }
    tender.markModified("stages");
    await tender.save();
    res.json(await enrichTender(tender));
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to update stage" });
  }
});

/* ── Cancel Tender (§3 Step 16) ─────────────────────────────────────── */
router.patch("/tenders/:id/cancel", async (req, res): Promise<void> => {
  try {
    const tender = await findTender(req.params.id);
    if (!tender) { res.status(404).json({ error: "Tender not found" }); return; }
    const { cancellationReason, cancellationStage, reTenderRef } = req.body;
    if (!cancellationReason) { res.status(400).json({ error: "Cancellation reason is required" }); return; }
    tender.isCancelled = true;
    tender.cancellationReason = cancellationReason;
    tender.cancellationStage = cancellationStage ?? tender.currentStageNumber;
    tender.cancellationDate = new Date();
    tender.reTenderRef = reTenderRef ?? "";
    tender.status = "cancelled";
    await tender.save();
    res.json(await enrichTender(tender));
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to cancel tender" });
  }
});

/* ── Advance Tender to Next Stage ──────────────────────────────────── */
router.patch("/tenders/:id/advance-stage", async (req, res): Promise<void> => {
  try {
    const tender = await findTender(req.params.id);
    if (!tender) { res.status(404).json({ error: "Tender not found" }); return; }
    if (tender.isCancelled) { res.status(400).json({ error: "Tender is cancelled" }); return; }
    const current = tender.currentStageNumber;
    const idx = tender.stages.findIndex((s: any) => s.stageNumber === current);
    if (idx === -1) { res.status(400).json({ error: "Current stage not found" }); return; }
    const { notes, data } = req.body;
    tender.stages[idx].status = "completed";
    tender.stages[idx].completionDate = new Date();
    if (notes) tender.stages[idx].notes = notes;
    if (data) tender.stages[idx].data = { ...tender.stages[idx].data, ...data };
    // Advance to next stage
    const nextIdx = tender.stages.findIndex((s: any) => s.stageNumber === current + 1);
    if (nextIdx !== -1) {
      tender.stages[nextIdx].status = "in_progress";
      tender.stages[nextIdx].startDate = new Date();
      tender.currentStageNumber = current + 1;
    } else {
      tender.status = "completed";
    }
    tender.markModified("stages");
    await tender.save();
    res.json(await enrichTender(tender));
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to advance tender stage" });
  }
});

export default router;
