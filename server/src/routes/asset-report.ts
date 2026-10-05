import { Router } from "express";
import mongoose from "mongoose";
import { EquipmentAsset, type AssetOperationalStatus } from "../models/EquipmentAsset.js";

const router = Router();

function buildFilter(query: Record<string, any>): Record<string, any> {
  const filter: Record<string, any> = {};

  if (query.financialYear && query.financialYear !== "all") {
    filter.financialYear = query.financialYear;
  }

  if (query.district && query.district !== "all") {
    filter.district = { $regex: new RegExp(`^${query.district}$`, "i") };
  }

  if (query.facilityId && query.facilityId !== "all") {
    if (mongoose.Types.ObjectId.isValid(query.facilityId)) {
      filter.institutionId = query.facilityId;
    } else {
      filter.institutionName = { $regex: query.facilityId, $options: "i" };
    }
  } else if (query.institution && query.institution !== "all") {
    filter.institutionName = { $regex: query.institution, $options: "i" };
  }

  if (query.hod && query.hod !== "all") {
    filter.hodDirectorate = { $regex: new RegExp(`^${query.hod}$`, "i") };
  }

  if (query.department && query.department !== "all") {
    filter.department = { $regex: query.department, $options: "i" };
  }

  if (query.category && query.category !== "all") {
    filter.category = { $regex: query.category, $options: "i" };
  }

  if (query.equipmentName) {
    filter.equipmentName = { $regex: query.equipmentName, $options: "i" };
  }

  if (query.assetTag) {
    filter.assetTag = { $regex: query.assetTag, $options: "i" };
  }

  if (query.serialNumber) {
    filter.serialNumber = { $regex: query.serialNumber, $options: "i" };
  }

  if (query.vendor && query.vendor !== "all") {
    filter.vendorName = { $regex: query.vendor, $options: "i" };
  }

  if (query.make) {
    filter.make = { $regex: query.make, $options: "i" };
  }

  if (query.model) {
    filter.model = { $regex: query.model, $options: "i" };
  }

  if (query.poNumber) {
    filter.poNumber = { $regex: query.poNumber, $options: "i" };
  }

  if (query.rcNumber) {
    filter.rcNumber = { $regex: query.rcNumber, $options: "i" };
  }

  if (query.grnNumber) {
    filter.grnNumber = { $regex: query.grnNumber, $options: "i" };
  }

  if (query.status && query.status !== "all") {
    filter.status = query.status;
  }

  if (query.warrantyStatus && query.warrantyStatus !== "all") {
    filter.warrantyStatus = query.warrantyStatus;
  }

  if (query.camcStatus && query.camcStatus !== "all") {
    filter.camcStatus = query.camcStatus;
  }

  // Date range filters
  if (query.startDate || query.endDate) {
    filter.registeredDate = {};
    if (query.startDate) filter.registeredDate.$gte = new Date(query.startDate);
    if (query.endDate) filter.registeredDate.$lte = new Date(query.endDate);
  }

  if (query.installStartDate || query.installEndDate) {
    filter.installationDate = {};
    if (query.installStartDate) filter.installationDate.$gte = new Date(query.installStartDate);
    if (query.installEndDate) filter.installationDate.$lte = new Date(query.installEndDate);
  }

  if (query.commissionStartDate || query.commissionEndDate) {
    filter.commissioningDate = {};
    if (query.commissionStartDate) filter.commissioningDate.$gte = new Date(query.commissionStartDate);
    if (query.commissionEndDate) filter.commissioningDate.$lte = new Date(query.commissionEndDate);
  }

  if (query.search) {
    const s = String(query.search).trim();
    filter.$or = [
      { assetTag: { $regex: s, $options: "i" } },
      { serialNumber: { $regex: s, $options: "i" } },
      { equipmentName: { $regex: s, $options: "i" } },
      { make: { $regex: s, $options: "i" } },
      { model: { $regex: s, $options: "i" } },
      { institutionName: { $regex: s, $options: "i" } },
      { poNumber: { $regex: s, $options: "i" } },
      { grnNumber: { $regex: s, $options: "i" } },
      { vendorName: { $regex: s, $options: "i" } },
      { district: { $regex: s, $options: "i" } },
    ];
  }

  return filter;
}

async function computeKPIs(filter: Record<string, any>) {
  const allAssets = await EquipmentAsset.find(filter).select("status warrantyStatus camcStatus warrantyEndDate camcEndDate");

  const now = new Date();
  const thirtyDaysLater = new Date(Date.now() + 30 * 86400000);

  const kpis = {
    totalAssets: allAssets.length,
    activeAssets: 0,
    inactiveAssets: 0,
    underMaintenance: 0,
    underRepair: 0,
    breakdown: 0,
    transferred: 0,
    decommissioned: 0,
    disposed: 0,
    underWarranty: 0,
    warrantyExpiringSoon: 0,
    camcActive: 0,
    camcExpiringSoon: 0,
  };

  for (const a of allAssets) {
    if (a.status === "active") kpis.activeAssets++;
    else if (a.status === "inactive") kpis.inactiveAssets++;
    else if (a.status === "under_maintenance") kpis.underMaintenance++;
    else if (a.status === "under_repair") kpis.underRepair++;
    else if (a.status === "breakdown") kpis.breakdown++;
    else if (a.status === "transferred") kpis.transferred++;
    else if (a.status === "decommissioned") kpis.decommissioned++;
    else if (a.status === "disposed") kpis.disposed++;

    if (a.warrantyStatus === "active") {
      kpis.underWarranty++;
      if (a.warrantyEndDate && new Date(a.warrantyEndDate) <= thirtyDaysLater && new Date(a.warrantyEndDate) >= now) {
        kpis.warrantyExpiringSoon++;
      }
    } else if (a.warrantyStatus === "expiring_soon") {
      kpis.underWarranty++;
      kpis.warrantyExpiringSoon++;
    }

    if (a.camcStatus === "active") {
      kpis.camcActive++;
      if (a.camcEndDate && new Date(a.camcEndDate) <= thirtyDaysLater && new Date(a.camcEndDate) >= now) {
        kpis.camcExpiringSoon++;
      }
    } else if (a.camcStatus === "expiring_soon") {
      kpis.camcActive++;
      kpis.camcExpiringSoon++;
    }
  }

  return kpis;
}

/* ───────────────────────────────────────────────────────────────
 * Main Statewide Item-wise Asset Report Endpoint
 * ─────────────────────────────────────────────────────────────── */
router.get("/reports/asset-report", async (req, res): Promise<void> => {
  try {
    const filter = buildFilter(req.query);
    const page = Math.max(1, parseInt(String(req.query.page || "1"), 10));
    const limit = req.query.limit === "all" ? 5000 : Math.max(1, parseInt(String(req.query.limit || "50"), 10));
    const skip = (page - 1) * limit;

    const [assets, total, kpis] = await Promise.all([
      EquipmentAsset.find(filter)
        .sort({ registeredDate: -1, assetTag: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      EquipmentAsset.countDocuments(filter),
      computeKPIs(filter),
    ]);

    res.json({
      assets,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      kpis,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to generate asset report" });
  }
});

/* ───────────────────────────────────────────────────────────────
 * Dynamic Summary KPIs Endpoint
 * ─────────────────────────────────────────────────────────────── */
router.get("/reports/asset-report/summary-kpis", async (req, res): Promise<void> => {
  try {
    const filter = buildFilter(req.query);
    const kpis = await computeKPIs(filter);
    res.json(kpis);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to compute asset KPIs" });
  }
});

/* ───────────────────────────────────────────────────────────────
 * Hierarchical Drill-down Explorer Endpoint
 * State → District → Hospital → Category → Equipment → Assets
 * ─────────────────────────────────────────────────────────────── */
router.get("/reports/asset-report/drilldown", async (req, res): Promise<void> => {
  try {
    const filter = buildFilter(req.query);
    const assets = await EquipmentAsset.find(filter)
      .select("assetTag serialNumber equipmentName category district institutionName status")
      .lean();

    const districtMap: Record<string, any> = {};

    for (const a of assets) {
      const dist = a.district || "Unassigned District";
      const hosp = a.institutionName || "Unassigned Hospital";
      const cat = a.category || "General Medical Equipment";
      const eq = a.equipmentName || "General Equipment";

      if (!districtMap[dist]) {
        districtMap[dist] = { name: dist, count: 0, hospitals: {} };
      }
      districtMap[dist].count++;

      if (!districtMap[dist].hospitals[hosp]) {
        districtMap[dist].hospitals[hosp] = { name: hosp, count: 0, categories: {} };
      }
      districtMap[dist].hospitals[hosp].count++;

      if (!districtMap[dist].hospitals[hosp].categories[cat]) {
        districtMap[dist].hospitals[hosp].categories[cat] = { name: cat, count: 0, equipments: {} };
      }
      districtMap[dist].hospitals[hosp].categories[cat].count++;

      if (!districtMap[dist].hospitals[hosp].categories[cat].equipments[eq]) {
        districtMap[dist].hospitals[hosp].categories[cat].equipments[eq] = { name: eq, count: 0, assets: [] };
      }
      districtMap[dist].hospitals[hosp].categories[cat].equipments[eq].count++;
      districtMap[dist].hospitals[hosp].categories[cat].equipments[eq].assets.push({
        id: a._id.toString(),
        assetTag: a.assetTag,
        serialNumber: a.serialNumber,
        status: a.status,
      });
    }

    const stateTree = {
      state: "Telangana",
      totalAssets: assets.length,
      districts: Object.values(districtMap).map((d: any) => ({
        name: d.name,
        count: d.count,
        hospitals: Object.values(d.hospitals).map((h: any) => ({
          name: h.name,
          count: h.count,
          categories: Object.values(h.categories).map((c: any) => ({
            name: c.name,
            count: c.count,
            equipments: Object.values(c.equipments).map((e: any) => ({
              name: e.name,
              count: e.count,
              assets: e.assets,
            })),
          })),
        })),
      })),
    };

    res.json(stateTree);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to load drill-down data" });
  }
});

/* ───────────────────────────────────────────────────────────────
 * CSV / Excel Export Endpoint
 * ─────────────────────────────────────────────────────────────── */
router.get("/reports/asset-report/export", async (req, res): Promise<void> => {
  try {
    const filter = buildFilter(req.query);
    const assets = await EquipmentAsset.find(filter).sort({ assetTag: 1 }).lean();

    const headers = [
      "Asset ID",
      "Equipment Name",
      "Equipment Category",
      "Department",
      "Make",
      "Model",
      "Serial Number",
      "Asset Status",
      "District",
      "Hospital / Institution",
      "HoD / Directorate",
      "Vendor Name",
      "RC Number",
      "PO Number",
      "PO Date",
      "Ordered Quantity",
      "GRN Number",
      "GRN Date",
      "Delivery Date",
      "QA Status",
      "QA Date",
      "Installation Date",
      "Commissioning Date",
      "Training Completed",
      "Warranty Start Date",
      "Warranty End Date",
      "Warranty Status",
      "AMC / CAMC Applicable",
      "AMC / CAMC Start Date",
      "AMC / CAMC End Date",
      "Current Location",
      "Last Updated Date",
      "Remarks",
    ];

    const escapeCsv = (val: any) => {
      if (val == null) return "";
      if (val instanceof Date) return val.toISOString().split("T")[0];
      const str = String(val);
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = assets.map((a: any) => [
      escapeCsv(a.assetTag),
      escapeCsv(a.equipmentName),
      escapeCsv(a.category),
      escapeCsv(a.department),
      escapeCsv(a.make),
      escapeCsv(a.model),
      escapeCsv(a.serialNumber),
      escapeCsv(a.status),
      escapeCsv(a.district),
      escapeCsv(a.institutionName),
      escapeCsv(a.hodDirectorate),
      escapeCsv(a.vendorName),
      escapeCsv(a.rcNumber),
      escapeCsv(a.poNumber),
      escapeCsv(a.poDate),
      escapeCsv(a.orderedQuantity),
      escapeCsv(a.grnNumber),
      escapeCsv(a.grnDate),
      escapeCsv(a.deliveryDate),
      escapeCsv(a.qaStatus),
      escapeCsv(a.qaDate),
      escapeCsv(a.installationDate),
      escapeCsv(a.commissioningDate),
      escapeCsv(a.trainingCompleted ? "Yes" : "No"),
      escapeCsv(a.warrantyStartDate),
      escapeCsv(a.warrantyEndDate),
      escapeCsv(a.warrantyStatus),
      escapeCsv(a.camcApplicable ? "Yes" : "No"),
      escapeCsv(a.camcStartDate),
      escapeCsv(a.camcEndDate),
      escapeCsv(a.currentLocation),
      escapeCsv(a.lastUpdatedDate || a.updatedAt),
      escapeCsv(a.remarks),
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="TGMSIDC_Asset_Report_${new Date().toISOString().split("T")[0]}.csv"`);
    res.send(csvContent);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to export asset report" });
  }
});

/* ───────────────────────────────────────────────────────────────
 * Update Operational Status with Audit Trail
 * ─────────────────────────────────────────────────────────────── */
router.patch("/equipment-assets/:id/status", async (req, res): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, remarks, user = "Authorized User", role = "admin" } = req.body;

    const validStatuses: AssetOperationalStatus[] = [
      "active",
      "inactive",
      "under_maintenance",
      "under_repair",
      "breakdown",
      "transferred",
      "decommissioned",
      "disposed",
    ];

    if (!validStatuses.includes(status)) {
      res.status(400).json({ error: `Invalid operational status: "${status}"` });
      return;
    }

    const asset = await EquipmentAsset.findOne({
      $or: [{ _id: mongoose.Types.ObjectId.isValid(id) ? id : null }, { assetTag: id }],
    });

    if (!asset) {
      res.status(404).json({ error: "Asset record not found" });
      return;
    }

    const prevStatus = asset.status;
    asset.status = status;
    asset.lastUpdatedDate = new Date();
    if (remarks) asset.remarks = remarks;

    asset.lifecycleHistory.push({
      event: `Status changed from ${prevStatus} to ${status}`,
      timestamp: new Date(),
      user: String(user),
      role: String(role),
      remarks: remarks ? String(remarks) : `Operational status transition from ${prevStatus} to ${status}`,
    });

    await asset.save();
    res.json({ message: "Asset status updated successfully", asset });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to update asset status" });
  }
});

export default router;
