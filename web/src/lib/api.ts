/// <reference types="vite/client" />
// Central API client for TGMSIDC web app.

export const BASE_URL = (import.meta.env.VITE_API_URL ?? "http://localhost:5000") + "/api";

export class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    message: string,
    public data: unknown = null
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function getToken(): string | null {
  return localStorage.getItem("tgmsidc_token");
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  tokenOverride?: string
): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const token = tokenOverride || getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> ?? {}),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(url, { ...options, headers });

  if (!res.ok) {
    let data: unknown = null;
    try { data = await res.json(); } catch { /* ignore */ }
    const message = (data as any)?.error ?? (data as any)?.message ?? res.statusText;
    throw new ApiError(res.status, res.statusText, message, data);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export function get<T>(path: string, params?: Record<string, any>, token?: string): Promise<T> {
  const qs = params
    ? "?" + new URLSearchParams(
        Object.fromEntries(
          Object.entries(params).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)])
        )
      ).toString()
    : "";
  return request<T>(`${path}${qs}`, {}, token);
}

export function post<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, { method: "POST", body: body != null ? JSON.stringify(body) : undefined });
}

export function patch<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, { method: "PATCH", body: body != null ? JSON.stringify(body) : undefined });
}

export function del<T>(path: string): Promise<T> {
  return request<T>(path, { method: "DELETE" });
}

// ─── API Functions ─────────────────────────────────────────────────────────

// Health
export const healthCheck = () => get<{ status: string }>("/health");

// Auth
export const loginUser = (body: { username: string; password: string }) => post<any>("/auth/login", body);
export const getMe = () => get<any>("/auth/me");
export const getUsers = () => get<any[]>("/auth/users");

// Institutions
export const getInstitutions = () => get<any[]>("/institutions");
export const createInstitution = (body: any) => post<any>("/institutions", body);

// Vendors
export const getVendors = () => get<any[]>("/vendors");
export const getVendor = (id: string) => get<any>(`/vendors/${id}`);
export const createVendor = (body: any) => post<any>("/vendors", body);
export const updateVendor = (id: string, body: any) => patch<any>(`/vendors/${id}`, body);

// Equipment
export const getEquipment = () => get<any[]>("/equipment");
export const createEquipment = (body: any) => post<any>("/equipment", body);

// Rate Contracts
export const getRateContracts = (params?: { status?: string; equipmentId?: string }) =>
  get<any[]>("/rate-contracts", params);
export const getExpiringRateContracts = () => get<any[]>("/rate-contracts/expiring-soon");
export const getRateContract = (id: string) => get<any>(`/rate-contracts/${id}`);
export const createRateContract = (body: any) => post<any>("/rate-contracts", body);
export const updateRateContract = (id: string, body: any) => patch<any>(`/rate-contracts/${id}`, body);

export const submitRateContractForApproval = (id: string, body: any) => patch<any>(`/rate-contracts/${id}/submit-for-approval`, body);
export const gmReviewRateContract = (id: string, body: any) => patch<any>(`/rate-contracts/${id}/gm-review`, body);
export const soDecisionRateContract = (id: string, body: any) => patch<any>(`/rate-contracts/${id}/so-decision`, body);
export const amendRateContract = (id: string, body: any) => post<any>(`/rate-contracts/${id}/amend`, body);
export const closeRateContract = (id: string, body: any) => patch<any>(`/rate-contracts/${id}/close`, body);

// Indents
export const getIndents = (params?: { status?: string; facilityId?: string }) =>
  get<any[]>("/indents", params);
export const getIndent = (id: string) => get<any>(`/indents/${id}`);
export const createIndent = (body: any) => post<any>("/indents", body);
export const updateIndent = (id: string, body: any) => patch<any>(`/indents/${id}`, body);
export const approveIndent = (id: string, body: any) => post<any>(`/indents/${id}/approve`, body);
export const rejectIndent = (id: string, body: any) => post<any>(`/indents/${id}/reject`, body);
export const returnIndent = (id: string, body: any) => post<any>(`/indents/${id}/return`, body);
export const initiateIndentTender = (id: string, body?: any) => post<any>(`/indents/${id}/initiate-tender`, body || {});

// Tenders
export const getTenders = (params?: { status?: string }) => get<any[]>("/tenders", params);
export const getTender = (id: string) => get<any>(`/tenders/${id}`);
export const createTender = (body: any) => post<any>("/tenders", body);
export const updateTender = (id: string, body: any) => patch<any>(`/tenders/${id}`, body);
export const updateTenderStage = (id: string, stageNumber: number, body: any) =>
  patch<any>(`/tenders/${id}/stages/${stageNumber}`, body);

// Purchase Orders
export const getPurchaseOrders = (params?: { status?: string; vendorId?: string }) =>
  get<any[]>("/purchase-orders", params);
export const getPurchaseOrder = (id: string) => get<any>(`/purchase-orders/${id}`);
export const createPurchaseOrder = (body: any) => post<any>("/purchase-orders", body);
export const updatePurchaseOrder = (id: string, body: any) => patch<any>(`/purchase-orders/${id}`, body);
export const approvePurchaseOrder = (id: string, body?: any) => post<any>(`/purchase-orders/${id}/approve`, body);
export const cancelPurchaseOrder = (id: string, body: any) => post<any>(`/purchase-orders/${id}/cancel`, body); // keep old signature just in case
export const updatePOPaymentStatus = (id: string, body: any) => post<any>(`/purchase-orders/${id}/payment-status`, body);
export const amendPurchaseOrder = (id: string, body: any) => post<any>(`/purchase-orders/${id}/amend`, body);
export const acknowledgePurchaseOrder = (id: string, body: any) => post<any>(`/purchase-orders/${id}/acknowledge`, body);

export const submitPOForApproval = (id: string, data: any) => patch<any>(`/purchase-orders/${id}/submit-for-approval`, data);
export const gmReviewPO = (id: string, data: any) => patch<any>(`/purchase-orders/${id}/gm-review`, data);
export const soDecisionPO = (id: string, data: any) => patch<any>(`/purchase-orders/${id}/so-decision`, data);
export const cancelPO = (id: string, data: any) => patch<any>(`/purchase-orders/${id}/cancel`, data);


// Indents additional workflows
export const resolveWriteInEquipment = (id: string, body: any) => post<any>(`/indents/${id}/resolve-write-in`, body);
export const recordIndentEditAudit = (id: string, body: any) => post<any>(`/indents/${id}/edit-audit`, body);

export const releasePOPayment = (id: string, body: { tranche: "tranche1_90" | "tranche2_10"; paymentReference?: string; paymentDate?: string; paidBy?: string; remarks?: string }) =>
  post<any>(`/purchase-orders/${id}/release-payment`, body);

// Deliveries
export const getDeliveries = (params?: { status?: string; poId?: string }) =>
  get<any[]>("/deliveries", params);
export const getDelivery = (id: string) => get<any>(`/deliveries/${id}`);
export const createDelivery = (body: any) => post<any>("/deliveries", body);
export const updateDelivery = (id: string, body: any) => patch<any>(`/deliveries/${id}`, body);
export const acceptDelivery = (id: string) => post<any>(`/deliveries/${id}/accept`);
export const uploadDCC = (id: string, body: any) => post<any>(`/deliveries/${id}/upload-dcc`, body);
export const uploadDeliveryDocs = (id: string, body: any) => post<any>(`/deliveries/${id}/upload-docs`, body);
export const logDeliveryDiscrepancy = (id: string, body: any) => post<any>(`/deliveries/${id}/log-discrepancy`, body);
export const recordQAInspection = (id: string, body: any) => post<any>(`/deliveries/${id}/qa-inspection`, body);

// Dashboard
export const getDashboardSummary = () => get<any>("/dashboard/summary");
export const getProcurementPipeline = () => get<any[]>("/dashboard/procurement-pipeline");
export const getRecentActivity = () => get<any[]>("/dashboard/recent-activity");
export const getVendorPerformance = () => get<any[]>("/dashboard/vendor-performance");
export const getSLAMetrics = () => get<any>("/dashboard/sla-metrics");
export const getSlaMetrics = getSLAMetrics;

// Reports (Process Book §13 Suite)
export const getIndentAgingReport = () => get<any[]>("/reports/indent-aging");
export const getRCExpiryReport = () => get<any[]>("/reports/rc-expiry");
export const getPOStatusReport = () => get<any[]>("/reports/po-status");
export const getDeliveryComplianceReport = () => get<any[]>("/reports/delivery-compliance");
export const getBudgetUtilizationReport = () => get<any[]>("/reports/budget-utilization");
export const getVendorPerformanceReport = () => get<any[]>("/reports/vendor-performance");
export const getDEOAccuracyReport = () => get<any[]>("/reports/deo-accuracy");
export const getTenderAuditReport = () => get<any[]>("/reports/tender-audit");
export const getEquipmentInventoryReport = () => get<any[]>("/reports/equipment-inventory");
export const getQASummaryReport = () => get<any>("/reports/qa-summary");

// Vendor Portal Reports (Process Book §13 R-11, R-12, R-13)
// These fall back to mock data when the backend endpoint isn't ready.
import { mockVendorPOSummary, mockVendorCertStatus, mockVendorSelfScore } from "@/mocks/data";
export const getVendorPOSummaryReport = (_vendorId?: number) =>
  get<any[]>("/reports/vendor-po-summary").catch(() => Promise.resolve(mockVendorPOSummary));
export const getVendorCertStatusReport = (_vendorId?: number) =>
  get<any[]>("/reports/vendor-cert-status").catch(() => Promise.resolve(mockVendorCertStatus));
export const getVendorSelfScoreReport = (_vendorId?: number) =>
  get<any[]>("/reports/vendor-self-score").catch(() => Promise.resolve(mockVendorSelfScore));

// Master Data
export const getDistricts = () => get<any[]>("/districts");
export const getFundingSources = () => get<any[]>("/funding-sources");
export const getProgrammes = () => get<any[]>("/programmes");
export const getAccountHeads = () => get<any[]>("/account-heads");
export const getTaxSlabs = () => get<any[]>("/tax-slabs");

// Audit & Notifications
export const getAuditLog = (params?: { entityType?: string; entityId?: string }) =>
  get<any[]>("/audit-log", params);
export const getNotifications = (userId: string) => get<any[]>("/notifications", { userId });
export const markNotificationRead = (id: string) => patch<any>(`/notifications/${id}/read`);
