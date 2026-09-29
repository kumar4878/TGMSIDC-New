import { Router } from "express";
import { Tender } from "../models/Tender.js";
import { Indent } from "../models/Indent.js";
import { Equipment } from "../models/Equipment.js";

const router = Router();

async function enrichTender(t: any) {
  let equipmentName = t.equipmentName || "";
  if (!equipmentName && t.indentId) {
    const indent = await Indent.findById(t.indentId);
    if (indent) {
      const equip = await Equipment.findById(indent.equipmentId);
      equipmentName = equip?.name ?? "Unknown";
    }
  }
  return {
    id: t._id.toString(),
    tenderNumber: t.tenderNumber,
    indentId: t.indentId?.toString() ?? null,
    equipmentId: t.equipmentId?.toString() ?? null,
    equipmentName: equipmentName || "Unknown",
    equipmentCategory: t.equipmentCategory ?? "",
    tenderType: t.tenderType ?? "open",
    portal: t.portal ?? "e-procurement",
    financialYear: t.financialYear ?? "2025-26",
    stages: t.stages ?? [],
    currentStageNumber: t.currentStageNumber ?? 0,
    specsStatus: t.specsStatus ?? "pending",
    specsConfirmationType: t.specsConfirmationType ?? "",
    specsApproverNames: t.specsApproverNames ?? "",
    bfcApprovalDate: t.bfcApprovalDate?.toISOString() ?? null,
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
    tenderInvitedDate: t.tenderInvitedDate?.toISOString() ?? null,
    bidSubmissionStartDate: t.bidSubmissionStartDate?.toISOString() ?? null,
    bidSubmissionEndDate: t.bidSubmissionEndDate?.toISOString() ?? null,
    bidsReceivedDate: t.bidsReceivedDate?.toISOString() ?? null,
    status: t.status,
    notes: t.notes ?? "",
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

router.get("/tenders", async (req, res): Promise<void> => {
  const filter: Record<string, any> = {};
  if (req.query.status && req.query.status !== "all") filter.status = req.query.status;
  const rows = await Tender.find(filter).sort({ createdAt: -1 });
  res.json(await Promise.all(rows.map(enrichTender)));
});

router.post("/tenders", async (req, res): Promise<void> => {
  const { indentId, tenderInvitedDate, notes, equipmentName, equipmentCategory, tenderType, portal } = req.body;
  if (!tenderInvitedDate) { res.status(400).json({ error: "tenderInvitedDate is required" }); return; }
  const count = await Tender.countDocuments();
  const tenderNumber = `TND-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;
  const hasBound = indentId && indentId !== "0";
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
  const t = await Tender.findById(req.params.id);
  if (!t) { res.status(404).json({ error: "Not found" }); return; }
  res.json(await enrichTender(t));
});

router.patch("/tenders/:id", async (req, res): Promise<void> => {
  const allowed = ["status", "bidsReceivedDate", "l1VendorName", "l1BidAmount",
    "l2VendorName", "l2BidAmount", "l3VendorName", "l3BidAmount", "notes",
    "currentStageNumber", "specsStatus", "specsApproverNames", "bfcApprovalRef",
    "bfcApprovalDate", "bfcMembersPresent", "tenderType", "portal",
    "isCancelled", "cancellationReason", "cancellationStage"];
  const update: Record<string, any> = {};
  for (const k of allowed) { if (req.body[k] != null) update[k] = req.body[k]; }
  if (update.bidsReceivedDate) update.bidsReceivedDate = new Date(update.bidsReceivedDate);
  if (update.bfcApprovalDate) update.bfcApprovalDate = new Date(update.bfcApprovalDate);
  const t = await Tender.findByIdAndUpdate(req.params.id, update, { new: true });
  if (!t) { res.status(404).json({ error: "Not found" }); return; }
  res.json(await enrichTender(t));
});

router.patch("/tenders/:id/stages/:stageNumber", async (req, res): Promise<void> => {
  const tender = await Tender.findById(req.params.id);
  if (!tender) { res.status(404).json({ error: "Not found" }); return; }
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
});

/* ── Cancel Tender (§3 Step 16) ─────────────────────────────────────── */
router.patch("/tenders/:id/cancel", async (req, res): Promise<void> => {
  const tender = await Tender.findById(req.params.id);
  if (!tender) { res.status(404).json({ error: "Not found" }); return; }
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
});

/* ── Advance Tender to Next Stage ──────────────────────────────────── */
router.patch("/tenders/:id/advance-stage", async (req, res): Promise<void> => {
  const tender = await Tender.findById(req.params.id);
  if (!tender) { res.status(404).json({ error: "Not found" }); return; }
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
});

export default router;
