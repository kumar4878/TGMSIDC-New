import { http, HttpResponse, type JsonBodyType } from "msw";
import {
  mockDashboard, mockPipeline, mockActivity, mockSlaMetrics, mockVendorPerformance,
  mockIndents, mockRateContracts, mockPurchaseOrders, mockTenders,
  mockDeliveries, mockVendors, mockInstitutions, mockEquipment,
} from "./data";
import { getSteps, updateStep, initStepsForNewIndent, APPROVAL_DIRECTOR_THRESHOLD } from "@/lib/approvalWorkflow";
import { getLineItems, initLineItemsForNewIndent } from "@/lib/indentLineItems";

let indents = [...mockIndents];
let rateContracts = [...mockRateContracts];
let purchaseOrders = [...mockPurchaseOrders];
let tenders = [...mockTenders];
let deliveries = [...mockDeliveries];
let vendors = [...mockVendors];
let institutions = [...mockInstitutions];
let equipment = [...mockEquipment];

const json = (data: JsonBodyType, status = 200) => HttpResponse.json(data, { status });
const now = () => new Date().toISOString();

export const handlers = [
  http.get("/api/healthz", () => json({ status: "ok" })),

  // Dashboard
  http.get("/api/dashboard/summary", () => json(mockDashboard)),
  http.get("/api/dashboard/procurement-pipeline", () => json(mockPipeline)),
  http.get("/api/dashboard/recent-activity", () => json(mockActivity)),
  http.get("/api/dashboard/sla-metrics", () => json(mockSlaMetrics)),
  http.get("/api/dashboard/vendor-performance", () => json(mockVendorPerformance)),

  // Indents — list (no lineItems needed for list view)
  http.get("/api/indents", ({ request }) => {
    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const data = status ? indents.filter((i) => i.status === status) : indents;
    return json(data);
  }),

  // Indents — detail (inject lineItems)
  http.get("/api/indents/:id", ({ params }) => {
    const item = indents.find((i) => i.id === Number(params.id));
    if (!item) return json({ error: "Not found" }, 404);
    const lineItems = getLineItems(item.id);
    return json({ ...item, lineItems: lineItems.length > 0 ? lineItems : undefined });
  }),

  // Indents — create
  http.post("/api/indents", async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    const inst = institutions.find((i) => i.id === Number(body.facilityId));
    const eq = equipment.find((e) => e.id === Number(body.equipmentId));
    const qty = Number(body.quantity);

    const unitPriceFromRC = eq
      ? rateContracts.find((rc) => rc.equipmentId === eq.id && rc.status === "active")?.unitPrice ?? null
      : null;
    const unitPriceFallback: Record<number, number> = {
      1: 850000, 2: 320000, 3: 1200000, 4: 650000,
      5: 950000, 6: 185000, 7: 650000, 8: 120000,
    };
    const unitPrice = unitPriceFromRC ?? (eq ? (unitPriceFallback[eq.id] ?? 200000) : 200000);

    const rawLineItems = Array.isArray(body.lineItems) ? (body.lineItems as Array<Record<string, unknown>>) : null;
    const estValue = rawLineItems
      ? rawLineItems.reduce((sum, li) => sum + (Number(li.estimatedUnitRate) || unitPrice) * (Number(li.qty) || 1), 0)
      : qty * unitPrice;
    const isHighValue = estValue >= APPROVAL_DIRECTOR_THRESHOLD;

    const newItem = {
      id: indents.length + 1,
      indentNumber: `IND-2025-${String(indents.length + 1).padStart(4, "0")}`,
      facilityId: Number(body.facilityId),
      facilityName: inst?.name ?? "Unknown Facility",
      equipmentId: Number(body.equipmentId),
      equipmentName: eq?.name ?? "Unknown Equipment",
      quantity: qty,
      technicalRequirements: String(body.technicalRequirements ?? ""),
      status: "pending_approval",
      procurementMode: null,
      rateContractId: null,
      tenderId: null,
      rejectionReason: null,
      digitisedBy: String(body.digitisedBy ?? "Clerk"),
      approvedBy: null,
      createdAt: now(),
      updatedAt: now(),
    };
    indents = [newItem, ...indents];
    initStepsForNewIndent(newItem.id, String(body.digitisedBy ?? "Clerk"), isHighValue);

    if (rawLineItems && rawLineItems.length > 0) {
      initLineItemsForNewIndent(
        newItem.id,
        rawLineItems.map((li) => ({
          category: String(li.category ?? "medical_equipment"),
          equipmentId: Number(li.equipmentId),
          equipmentName: String(li.equipmentName ?? ""),
          qty: Number(li.qty ?? 1),
          unit: String(li.unit ?? "No."),
          estimatedUnitRate: Number(li.estimatedUnitRate ?? unitPrice),
          justification: String(li.justification ?? ""),
        }))
      );
    }

    const lineItems = getLineItems(newItem.id);
    return json({ ...newItem, lineItems: lineItems.length > 0 ? lineItems : undefined }, 201);
  }),

  http.patch("/api/indents/:id/approve", async ({ params, request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    const idx = indents.findIndex((i) => i.id === Number(params.id));
    if (idx === -1) return json({ error: "Not found" }, 404);
    const rc = body.rateContractId ? rateContracts.find((r) => r.id === Number(body.rateContractId)) : null;
    indents[idx] = {
      ...indents[idx],
      status: body.procurementMode === "rate_contract" ? "linked_to_rc" : "tender_initiated",
      procurementMode: String(body.procurementMode),
      rateContractId: rc ? Number(body.rateContractId) : null,
      approvedBy: String(body.approvedBy ?? "GM"),
      updatedAt: now(),
    };
    return json(indents[idx]);
  }),
  http.patch("/api/indents/:id/reject", async ({ params, request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    const idx = indents.findIndex((i) => i.id === Number(params.id));
    if (idx === -1) return json({ error: "Not found" }, 404);
    indents[idx] = { ...indents[idx], status: "rejected", rejectionReason: String(body.rejectionReason ?? ""), updatedAt: now() };
    return json(indents[idx]);
  }),

  // Approval Steps
  http.get("/api/indents/:id/approval-steps", ({ params }) => {
    const steps = getSteps(Number(params.id));
    return json(steps);
  }),
  http.patch("/api/indents/:id/approval-steps/:step", async ({ params, request }) => {
    const indentId = Number(params.id);
    const stepNumber = Number(params.step);
    const body = (await request.json()) as Record<string, unknown>;
    const stepStatus = String(body.status) as "approved" | "rejected" | "returned";
    const comments = String(body.comments ?? "");
    const approvedBy = String(body.approvedBy ?? "");
    const procurementMode = body.procurementMode ? String(body.procurementMode) : null;

    const currentSteps = getSteps(indentId);
    const firstPending = currentSteps.find((s) => s.status === "pending" || s.status === "returned");
    if (!firstPending || firstPending.stepNumber !== stepNumber) {
      return json({ error: "Step is not the currently active step in the approval chain." }, 422);
    }

    const updated = updateStep(indentId, stepNumber, { status: stepStatus, comments, actionedAt: now() });
    const idx = indents.findIndex((i) => i.id === indentId);

    if (idx !== -1) {
      if (stepStatus === "rejected") {
        indents[idx] = { ...indents[idx], status: "rejected", rejectionReason: comments, updatedAt: now() };
      } else if (stepStatus === "returned") {
        updateStep(indentId, 1, {
          status: "returned",
          comments: `Returned by ${approvedBy}: ${comments}`,
          actionedAt: now(),
        });
        indents[idx] = { ...indents[idx], updatedAt: now() };
      } else if (stepStatus === "approved") {
        const allApproved = updated.every((s) => s.status === "approved" || s.status === "skipped");
        if (allApproved && procurementMode) {
          indents[idx] = {
            ...indents[idx],
            status: procurementMode === "rate_contract" ? "linked_to_rc" : "tender_initiated",
            procurementMode,
            approvedBy,
            updatedAt: now(),
          };
        } else {
          indents[idx] = { ...indents[idx], updatedAt: now() };
        }
      }
    }

    return json(updated);
  }),

  // Rate Contracts
  http.get("/api/rate-contracts/expiring-soon", () => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + 60);
    const soon = rateContracts.filter((r) => {
      if (r.status !== "active") return false;
      return new Date(r.endDate) <= cutoff;
    });
    return json(soon);
  }),
  http.get("/api/rate-contracts", ({ request }) => {
    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const data = status ? rateContracts.filter((r) => r.status === status) : rateContracts;
    return json(data);
  }),
  http.get("/api/rate-contracts/:id", ({ params }) => {
    const item = rateContracts.find((r) => r.id === Number(params.id));
    if (!item) return json({ error: "Not found" }, 404);
    return json(item);
  }),
  http.post("/api/rate-contracts", async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    const eq = equipment.find((e) => e.id === Number(body.equipmentId));
    const vnd = vendors.find((v) => v.id === Number(body.vendorId));
    const newItem = {
      id: rateContracts.length + 1,
      contractNumber: `RC-2025-${String(rateContracts.length + 1).padStart(4, "0")}`,
      equipmentId: Number(body.equipmentId),
      equipmentName: eq?.name ?? "Unknown Equipment",
      vendorId: Number(body.vendorId),
      vendorName: vnd?.name ?? "Unknown Vendor",
      unitPrice: Number(body.unitPrice),
      gstRate: Number(body.gstRate),
      warrantyYears: Number(body.warrantyYears),
      cmcCharges: Number(body.cmcCharges),
      cmcStartYear: Number(body.cmcStartYear),
      status: "active",
      startDate: String(body.startDate),
      endDate: String(body.endDate),
      createdAt: now(),
      updatedAt: now(),
    };
    rateContracts = [newItem, ...rateContracts];
    return json(newItem, 201);
  }),
  http.patch("/api/rate-contracts/:id/renew", async ({ params, request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    const idx = rateContracts.findIndex((r) => r.id === Number(params.id));
    if (idx === -1) return json({ error: "Not found" }, 404);
    rateContracts[idx] = { ...rateContracts[idx], status: "active", endDate: String(body.endDate ?? rateContracts[idx].endDate), updatedAt: now() };
    return json(rateContracts[idx]);
  }),
  http.patch("/api/rate-contracts/:id/close", ({ params }) => {
    const idx = rateContracts.findIndex((r) => r.id === Number(params.id));
    if (idx === -1) return json({ error: "Not found" }, 404);
    rateContracts[idx] = { ...rateContracts[idx], status: "closed", updatedAt: now() };
    return json(rateContracts[idx]);
  }),

  // Purchase Orders
  http.get("/api/purchase-orders", ({ request }) => {
    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const data = status ? purchaseOrders.filter((p) => p.status === status) : purchaseOrders;
    return json(data);
  }),
  http.get("/api/purchase-orders/:id", ({ params }) => {
    const item = purchaseOrders.find((p) => p.id === Number(params.id));
    if (!item) return json({ error: "Not found" }, 404);
    return json(item);
  }),
  http.post("/api/purchase-orders", async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    const indent = indents.find((i) => i.id === Number(body.indentId));
    const rc = rateContracts.find((r) => r.id === Number(body.rateContractId));
    const vnd = rc ? vendors.find((v) => v.id === rc.vendorId) : null;
    const qty = Number(body.quantity);
    const unit = rc?.unitPrice ?? 0;
    const gst = rc?.gstRate ?? 12;
    const newItem = {
      id: purchaseOrders.length + 1,
      poNumber: `PO-2025-${String(purchaseOrders.length + 1).padStart(5, "0")}`,
      indentId: Number(body.indentId),
      rateContractId: Number(body.rateContractId),
      vendorId: rc?.vendorId ?? 0,
      vendorName: vnd?.name ?? "Unknown Vendor",
      equipmentId: indent?.equipmentId ?? 0,
      equipmentName: indent?.equipmentName ?? "Unknown Equipment",
      quantity: qty,
      unitPrice: unit,
      gstRate: gst,
      totalAmount: Math.round(qty * unit * (1 + gst / 100)),
      status: "draft",
      deliveryAddress: String(body.deliveryAddress ?? ""),
      expectedDeliveryDate: body.expectedDeliveryDate ? String(body.expectedDeliveryDate) : null,
      actualDeliveryDate: null,
      cancellationReason: null,
      createdAt: now(),
      updatedAt: now(),
    };
    purchaseOrders = [newItem, ...purchaseOrders];
    return json(newItem, 201);
  }),
  http.patch("/api/purchase-orders/:id/approve", ({ params }) => {
    const idx = purchaseOrders.findIndex((p) => p.id === Number(params.id));
    if (idx === -1) return json({ error: "Not found" }, 404);
    purchaseOrders[idx] = { ...purchaseOrders[idx], status: "approved", updatedAt: now() };
    return json(purchaseOrders[idx]);
  }),
  http.patch("/api/purchase-orders/:id/cancel", async ({ params, request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    const idx = purchaseOrders.findIndex((p) => p.id === Number(params.id));
    if (idx === -1) return json({ error: "Not found" }, 404);
    purchaseOrders[idx] = { ...purchaseOrders[idx], status: "cancelled", cancellationReason: String(body.cancellationReason ?? ""), updatedAt: now() };
    return json(purchaseOrders[idx]);
  }),

  // Tenders
  http.get("/api/tenders", () => json(tenders)),
  http.get("/api/tenders/:id", ({ params }) => {
    const item = tenders.find((t) => t.id === Number(params.id));
    if (!item) return json({ error: "Not found" }, 404);
    return json(item);
  }),
  http.post("/api/tenders", async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    const indent = indents.find((i) => i.id === Number(body.indentId));
    const newItem = {
      id: tenders.length + 1,
      tenderNumber: `TND-2025-${String(tenders.length + 1).padStart(4, "0")}`,
      indentId: Number(body.indentId),
      equipmentName: body.equipmentName ? String(body.equipmentName) : (indent?.equipmentName ?? "Unknown Equipment"),
      status: "invited",
      tenderInvitedDate: String(body.tenderInvitedDate ?? ""),
      bidsReceivedDate: null,
      l1BidderName: null,
      l1BidderAmount: null,
      notes: body.notes ? String(body.notes) : null,
      createdAt: now(),
      updatedAt: now(),
    };
    tenders = [newItem, ...tenders];
    return json(newItem, 201);
  }),
  http.patch("/api/tenders/:id", async ({ params, request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    const idx = tenders.findIndex((t) => t.id === Number(params.id));
    if (idx === -1) return json({ error: "Not found" }, 404);
    tenders[idx] = { ...tenders[idx], ...body, updatedAt: now() } as typeof tenders[0];
    return json(tenders[idx]);
  }),

  // Deliveries
  http.get("/api/deliveries", ({ request }) => {
    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const poId = url.searchParams.get("poId");
    let data = deliveries;
    if (status) data = data.filter((d) => d.status === status);
    if (poId) data = data.filter((d) => d.purchaseOrderId === Number(poId));
    return json(data);
  }),
  http.get("/api/deliveries/:id", ({ params }) => {
    const item = deliveries.find((d) => d.id === Number(params.id));
    if (!item) return json({ error: "Not found" }, 404);
    return json(item);
  }),
  http.post("/api/deliveries", async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    const po = purchaseOrders.find((p) => p.id === Number(body.purchaseOrderId));
    const newItem = {
      id: deliveries.length + 1,
      qrCode: `QR-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      purchaseOrderId: Number(body.purchaseOrderId),
      poNumber: po?.poNumber ?? "",
      vendorId: po?.vendorId ?? 0,
      vendorName: po?.vendorName ?? "",
      facilityId: 1,
      facilityName: "Osmania General Hospital",
      equipmentName: po?.equipmentName ?? "",
      quantity: po?.quantity ?? 0,
      status: "dispatched",
      dispatchDate: body.dispatchDate ? String(body.dispatchDate) : null,
      deliveredDate: null,
      qaComplianceScore: null,
      qaNotes: null,
      discrepancyNotes: null,
      documentsUploaded: false,
      acceptanceCertificateIssued: false,
      createdAt: now(),
      updatedAt: now(),
    };
    deliveries = [newItem, ...deliveries];
    return json(newItem, 201);
  }),
  http.patch("/api/deliveries/:id", async ({ params, request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    const idx = deliveries.findIndex((d) => d.id === Number(params.id));
    if (idx === -1) return json({ error: "Not found" }, 404);
    const updated = { ...deliveries[idx], ...body, updatedAt: now() } as typeof deliveries[0];
    if (body.qaComplianceScore !== undefined) {
      const score = Number(body.qaComplianceScore);
      updated.qaComplianceScore = score;
      updated.status = score >= 100 ? "qa_passed" : "qa_failed";
    }
    deliveries[idx] = updated;
    return json(deliveries[idx]);
  }),
  http.post("/api/deliveries/:id/accept", ({ params }) => {
    const idx = deliveries.findIndex((d) => d.id === Number(params.id));
    if (idx === -1) return json({ error: "Not found" }, 404);
    if (deliveries[idx].qaComplianceScore !== 100 || !deliveries[idx].documentsUploaded) {
      return json({ error: "QA score must be 100% and documents must be uploaded before acceptance." }, 422);
    }
    deliveries[idx] = { ...deliveries[idx], status: "accepted", acceptanceCertificateIssued: true, updatedAt: now() };
    return json(deliveries[idx]);
  }),

  // Vendors
  http.get("/api/vendors", () => json(vendors)),
  http.post("/api/vendors", async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    const newItem = {
      id: vendors.length + 1,
      vendorCode: `VND-${String(vendors.length + 1).padStart(4, "0")}`,
      name: String(body.name ?? ""),
      contactEmail: String(body.contactEmail ?? ""),
      contactPhone: String(body.contactPhone ?? ""),
      address: String(body.address ?? ""),
      gstNumber: String(body.gstNumber ?? ""),
      isL1Bidder: false,
      performanceScore: null,
      status: "active",
      createdAt: now(),
    };
    vendors = [...vendors, newItem];
    return json(newItem, 201);
  }),

  // Institutions
  http.get("/api/institutions", () => json(institutions)),
  http.post("/api/institutions", async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    const newItem = {
      id: institutions.length + 1,
      institutionCode: `INST-${String(institutions.length + 1).padStart(4, "0")}`,
      name: String(body.name ?? ""),
      type: String(body.type ?? "hospital"),
      district: String(body.district ?? ""),
      address: String(body.address ?? ""),
      superintendentName: body.superintendentName ? String(body.superintendentName) : null,
      contactEmail: body.contactEmail ? String(body.contactEmail) : null,
      createdAt: now(),
    };
    institutions = [...institutions, newItem];
    return json(newItem, 201);
  }),

  // Equipment
  http.get("/api/equipment", () => json(equipment)),
  http.post("/api/equipment", async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    const newItem = {
      id: equipment.length + 1,
      equipmentCode: `EQP-${String(equipment.length + 1).padStart(4, "0")}`,
      name: String(body.name ?? ""),
      category: String(body.category ?? "general"),
      specifications: String(body.specifications ?? ""),
      standardised: false,
      gstRate: Number(body.gstRate ?? 12),
      createdAt: now(),
    };
    equipment = [...equipment, newItem];
    return json(newItem, 201);
  }),
];
