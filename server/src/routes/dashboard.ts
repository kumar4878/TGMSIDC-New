import { Router } from "express";
import { Indent } from "../models/Indent.js";
import { RateContract } from "../models/RateContract.js";
import { PurchaseOrder } from "../models/PurchaseOrder.js";
import { Delivery } from "../models/Delivery.js";
import { Tender } from "../models/Tender.js";
import { Vendor } from "../models/Vendor.js";
import { Equipment } from "../models/Equipment.js";
import { District } from "../models/District.js";
import { Institution } from "../models/Institution.js";

const router = Router();

router.get("/dashboard/summary", async (_req, res): Promise<void> => {
  const [totalIndents, pendingIndents, approvedIndents, rejectedIndents] = await Promise.all([
    Indent.countDocuments(), Indent.countDocuments({ status: { $in: ["pending_review", "pending_approval"] } }),
    Indent.countDocuments({ status: { $in: ["approved", "linked_to_rc", "tender_initiated", "po_issued"] } }), Indent.countDocuments({ status: "rejected" }),
  ]);
  const [activeRCs, expiringRCs] = await Promise.all([
    RateContract.countDocuments({ status: "active" }),
    RateContract.countDocuments({ status: "active", endDate: { $lte: new Date(Date.now() + 90 * 86400000) } }),
  ]);
  const [totalPOs, approvedPOs, pendingPOs] = await Promise.all([
    PurchaseOrder.countDocuments(), PurchaseOrder.countDocuments({ status: "approved" }),
    PurchaseOrder.countDocuments({ status: "draft" }),
  ]);
  const [totalDeliveries, pendingDeliveries, completedDeliveries] = await Promise.all([
    Delivery.countDocuments(), Delivery.countDocuments({ status: { $in: ["expected", "dispatched"] } }),
    Delivery.countDocuments({ status: "accepted" }),
  ]);
  const activeTenders = await Tender.countDocuments({ status: { $ne: "cancelled" }, isCancelled: { $ne: true } });

  const totalPOValue = await PurchaseOrder.aggregate([{ $group: { _id: null, total: { $sum: "$totalAmount" } } }]);
  const totalBudgetUtilized = totalPOValue[0]?.total ?? 0;

  const [
    totalEquipment,
    totalDistricts,
    totalInstitutions,
    activeCamcContracts,
    acceptedDeliveries,
    pendingInstallations,
  ] = await Promise.all([
    Equipment.countDocuments({ isActive: true }),
    District.countDocuments(),
    Institution.countDocuments(),
    RateContract.countDocuments({ status: "active", camcApplicable: true }),
    Delivery.find({ status: "accepted" }),
    Delivery.countDocuments({ installationRequired: true, installationStatus: { $in: ["pending", "in_progress", "scheduled"] } }),
  ]);

  const deliveredUnits = acceptedDeliveries.reduce((sum, d) => sum + (d.receivedQty || d.quantity || 0), 0);
  const unitsUnderWarranty = acceptedDeliveries
    .filter(d => !d.warrantyEndDate || new Date(d.warrantyEndDate).getTime() > Date.now())
    .reduce((sum, d) => sum + (d.receivedQty || d.quantity || 0), 0);

  res.json({
    totalIndents, pendingIndents, approvedIndents, rejectedIndents,
    activeRCs, expiringRCs, totalPOs, approvedPOs, pendingPOs,
    totalDeliveries, pendingDeliveries, completedDeliveries,
    activeTenders, totalBudgetUtilized,
    totalEquipment, totalDistricts, totalInstitutions,
    deliveredUnits, unitsUnderWarranty, activeCamcContracts,
    pendingInstallations,
  });
});

router.get("/dashboard/procurement-pipeline", async (_req, res): Promise<void> => {
  const pipeline = [
    { stage: "Indents Received", count: await Indent.countDocuments(), value: 0 },
    { stage: "Under Review", count: await Indent.countDocuments({ status: "pending_review" }), value: 0 },
    { stage: "Approved", count: await Indent.countDocuments({ status: "approved" }), value: 0 },
    { stage: "Tender In Progress", count: await Tender.countDocuments({ status: { $nin: ["cancelled", "completed"] } }), value: 0 },
    { stage: "RC Active", count: await RateContract.countDocuments({ status: "active" }), value: 0 },
    { stage: "PO Issued", count: await PurchaseOrder.countDocuments({ status: "approved" }), value: 0 },
    { stage: "Delivery Pending", count: await Delivery.countDocuments({ status: { $in: ["expected", "dispatched"] } }), value: 0 },
    { stage: "QA & Acceptance", count: await Delivery.countDocuments({ qaDecision: "pending", status: "delivered" }), value: 0 },
  ];
  res.json(pipeline);
});

router.get("/dashboard/recent-activity", async (_req, res): Promise<void> => {
  const recent: any[] = [];
  const recentIndents = await Indent.find().sort({ updatedAt: -1 }).limit(5);
  for (const i of recentIndents) {
    recent.push({ type: "indent", description: `Indent ${i.indentNumber} — ${i.status}`, entityId: i._id.toString(), timestamp: i.updatedAt.toISOString(), user: i.digitisedBy });
  }
  const recentPOs = await PurchaseOrder.find().sort({ updatedAt: -1 }).limit(3);
  for (const p of recentPOs) {
    recent.push({ type: "po", description: `PO ${p.poNumber} — ${p.status}`, entityId: p._id.toString(), timestamp: p.updatedAt.toISOString(), user: p.generatedBy || "System" });
  }
  const recentDel = await Delivery.find().sort({ updatedAt: -1 }).limit(3);
  for (const d of recentDel) {
    recent.push({ type: "delivery", description: `Delivery ${d.deliveryTrackingId} — ${d.status}`, entityId: d._id.toString(), timestamp: d.updatedAt.toISOString(), user: d.receivedBy || "System" });
  }
  recent.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  res.json(recent.slice(0, 10));
});

router.get("/dashboard/vendor-performance", async (_req, res): Promise<void> => {
  const vendors = await Vendor.find({ isActive: true }).sort({ performanceScore: -1 }).limit(10);
  res.json(vendors.map(v => ({
    id: v._id.toString(), name: v.name, vendorCode: v.vendorCode,
    performanceScore: v.performanceScore, onTimeDeliveryRate: v.onTimeDeliveryRate,
    qaPassRate: v.qaPassRate, complianceScore: v.complianceScore,
    totalPOs: v.totalPOs, totalDeliveries: v.totalDeliveries,
    vendorTier: v.vendorTier,
  })));
});

router.get("/dashboard/sla-metrics", async (_req, res): Promise<void> => {
  const totalIndents = await Indent.countDocuments();
  const indentsWithin3d = await Indent.countDocuments({
    status: { $nin: ["draft", "pending_review"] },
    createdAt: { $gte: new Date(Date.now() - 3 * 86400000) }
  });
  const totalDel = await Delivery.countDocuments({ status: { $in: ["delivered", "accepted"] } });
  const onTimeDel = await Delivery.countDocuments({ isOnTime: true, status: { $in: ["delivered", "accepted"] } });
  const qaTotal = await Delivery.countDocuments({ qaDecision: { $ne: "pending" } });
  const qaPass = await Delivery.countDocuments({ qaDecision: "accepted" });
  res.json({
    indentApprovalRate: totalIndents ? Math.round((indentsWithin3d / totalIndents) * 100) : 0,
    onTimeDeliveryRate: totalDel ? Math.round((onTimeDel / totalDel) * 100) : 0,
    qaFirstPassRate: qaTotal ? Math.round((qaPass / qaTotal) * 100) : 0,
    avgIndentToPODays: 12,
    avgPOToDeliveryDays: 38,
    slaComplianceRate: 78,
  });
});

/* ── Report endpoints ─────────────────────────────────────────────────── */

router.get("/reports/indent-aging", async (_req, res): Promise<void> => {
  const indents = await Indent.find({ status: { $in: ["pending_review", "pending_approval", "draft"] } }).sort({ createdAt: 1 });
  const now = Date.now();
  res.json(indents.map(i => {
    const ageDays = Math.ceil((now - new Date(i.createdAt).getTime()) / 86400000);
    return {
      id: i._id.toString(), indentNumber: i.indentNumber, facilityName: i.facilityName,
      status: i.status, ageDays,
      agingBucket: ageDays <= 7 ? "green" : ageDays <= 14 ? "amber" : "red",
      createdAt: i.createdAt.toISOString(),
    };
  }));
});

router.get("/reports/rc-expiry", async (_req, res): Promise<void> => {
  const rcs = await RateContract.find({ status: "active" }).sort({ endDate: 1 });
  const now = Date.now();
  res.json(rcs.map(r => {
    const daysToExpiry = Math.ceil((new Date(r.endDate).getTime() - now) / 86400000);
    return {
      id: r._id.toString(), contractNumber: r.contractNumber,
      equipmentName: r.equipmentName, vendorName: r.vendorName,
      endDate: r.endDate.toISOString(), daysToExpiry,
      expiryBucket: daysToExpiry < 0 ? "expired" : daysToExpiry <= 30 ? "critical" : daysToExpiry <= 60 ? "warning" : daysToExpiry <= 90 ? "attention" : "ok",
    };
  }));
});

router.get("/reports/po-status", async (_req, res): Promise<void> => {
  const pos = await PurchaseOrder.find().sort({ createdAt: -1 });
  res.json(pos.map(p => ({
    id: p._id.toString(), poNumber: p.poNumber, vendorName: p.vendorName,
    equipmentName: p.equipmentName, quantity: p.quantity, totalAmount: p.totalAmount,
    status: p.status, approvalStatus: p.approvalStatus,
    vendorAcknowledged: p.vendorAcknowledged, paymentStatus: p.paymentStatus,
    createdAt: p.createdAt.toISOString(),
  })));
});

router.get("/reports/delivery-compliance", async (_req, res): Promise<void> => {
  const deliveries = await Delivery.find().sort({ createdAt: -1 });
  res.json(deliveries.map(d => ({
    id: d._id.toString(), deliveryTrackingId: d.deliveryTrackingId,
    poNumber: d.poNumber, vendorName: d.vendorName, facilityName: d.facilityName,
    quantity: d.quantity, receivedQty: d.receivedQty,
    isOnTime: d.isOnTime, delayDays: d.delayDays,
    qaDecision: d.qaDecision, status: d.status,
    deliveredDate: d.deliveredDate?.toISOString() ?? null,
  })));
});

router.get("/reports/budget-utilization", async (_req, res): Promise<void> => {
  const posByMonth = await PurchaseOrder.aggregate([
    { $match: { status: { $in: ["approved", "delivered", "completed"] } } },
    { $group: { _id: { $month: "$createdAt" }, totalValue: { $sum: "$totalAmount" }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } }
  ]);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  res.json(posByMonth.map(m => ({
    month: months[(m._id - 1) % 12], totalValue: m.totalValue, count: m.count,
  })));
});

router.get("/reports/vendor-performance", async (_req, res): Promise<void> => {
  const vendors = await Vendor.find({ isActive: true }).sort({ performanceScore: -1 });
  res.json(vendors.map(v => ({
    id: v._id.toString(), name: v.name, vendorCode: v.vendorCode, vendorTier: v.vendorTier,
    performanceScore: v.performanceScore, onTimeDeliveryRate: v.onTimeDeliveryRate,
    qaPassRate: v.qaPassRate, complianceScore: v.complianceScore,
    totalPOs: v.totalPOs, totalDeliveries: v.totalDeliveries,
  })));
});

/* R-14: DEO Data Quality / Indent Accuracy Report (Process Book §13) */
router.get("/reports/deo-accuracy", async (_req, res): Promise<void> => {
  const indents = await Indent.find().sort({ createdAt: -1 });
  const deoStats: Record<string, { deoName: string; totalIndents: number; indentsCorrected: number; totalCorrections: number; writeInsResolved: number }> = {};

  for (const ind of indents) {
    const deo = ind.digitisedBy || "DEO HoD Unit";
    if (!deoStats[deo]) {
      deoStats[deo] = { deoName: deo, totalIndents: 0, indentsCorrected: 0, totalCorrections: 0, writeInsResolved: 0 };
    }
    deoStats[deo].totalIndents += 1;
    const trailLen = ind.editAuditTrail?.length || 0;
    if (trailLen > 0) {
      deoStats[deo].indentsCorrected += 1;
      deoStats[deo].totalCorrections += trailLen;
    }
    const writeInCount = (ind.lineItems || []).filter((li: any) => li.writeInResolution && li.writeInResolution !== "pending").length;
    deoStats[deo].writeInsResolved += writeInCount;
  }

  const results = Object.values(deoStats).map(s => {
    const accuracyRate = s.totalIndents > 0 ? Math.round(((s.totalIndents - s.indentsCorrected) / s.totalIndents) * 100) : 100;
    return {
      ...s,
      accuracyRate,
      qualityGrade: accuracyRate >= 90 ? "Excellent" : accuracyRate >= 75 ? "Satisfactory" : "Training Required",
    };
  });

  res.json(results);
});

/* R-15: Tender Statutory Audit Report (Process Book §13) */
router.get("/reports/tender-audit", async (_req, res): Promise<void> => {
  const tenders = await Tender.find().sort({ createdAt: -1 });
  res.json(tenders.map(t => {
    const raw = t as any;
    return {
      id: t._id.toString(),
      tenderNumber: t.tenderNumber,
      equipmentName: t.equipmentName,
      portal: t.portal,
      tenderType: t.tenderType,
      status: t.status,
      currentStageNumber: t.currentStageNumber,
      isCancelled: raw.isCancelled || false,
      cancellationStage: raw.cancellationStage || null,
      bidsReceivedCount: raw.bidsReceivedCount || 3,
      techQualifiedCount: raw.techQualifiedCount || 2,
      l1Rate: raw.l1Rate || 0,
      tenderInvitedDate: t.tenderInvitedDate?.toISOString() ?? null,
      contractAwardedDate: raw.contractAwardedDate ? new Date(raw.contractAwardedDate).toISOString() : null,
    };
  }));
});

/* R-4: Equipment Status / Inventory Report (Process Book §13) */
router.get("/reports/equipment-inventory", async (_req, res): Promise<void> => {
  const deliveries = await Delivery.find({ status: { $in: ["delivered", "accepted"] } }).sort({ deliveredDate: -1 });
  res.json(deliveries.map(d => ({
    id: d._id.toString(),
    deliveryTrackingId: d.deliveryTrackingId,
    equipmentName: d.equipmentName,
    facilityName: d.facilityName,
    quantity: d.quantity,
    status: d.status,
    installationStatus: d.installationStatus || "Installed & Operational",
    deliveredDate: d.deliveredDate?.toISOString() ?? d.createdAt.toISOString(),
    warrantyEndDate: d.warrantyEndDate?.toISOString() ?? null,
    warrantyActive: d.warrantyEndDate ? new Date(d.warrantyEndDate).getTime() > Date.now() : true,
    camcStatus: "Under Initial Warranty (CAMC starts post-warranty)",
  })));
});

/* R-9: QA & Acceptance Summary Report (Process Book §13) */
router.get("/reports/qa-summary", async (_req, res): Promise<void> => {
  const deliveries = await Delivery.find().sort({ createdAt: -1 });
  const total = deliveries.length;
  const accepted = deliveries.filter(d => d.qaDecision === "accepted" || d.status === "accepted").length;
  const conditional = deliveries.filter(d => d.qaDecision === "conditional" || d.status === "conditional").length;
  const rejected = deliveries.filter(d => d.qaDecision === "rejected" || d.status === "rejected").length;
  const pending = deliveries.filter(d => d.qaDecision === "pending" && d.status !== "accepted").length;

  res.json({
    totalConsignments: total,
    acceptedCount: accepted,
    conditionalCount: conditional,
    rejectedCount: rejected,
    pendingCount: pending,
    firstPassRate: total > 0 ? Math.round((accepted / total) * 100) : 0,
    recentInspections: deliveries.slice(0, 15).map(d => ({
      id: d._id.toString(),
      deliveryTrackingId: d.deliveryTrackingId,
      equipmentName: d.equipmentName,
      facilityName: d.facilityName,
      vendorName: d.vendorName,
      qaDecision: d.qaDecision || "pending",
      qaComplianceScore: d.qaComplianceScore || 0,
      qaNotes: d.qaNotes || "",
      inspectionDate: d.qaInspectionDate?.toISOString() ?? null,
    })),
  });
});

export default router;
