import { useQuery, useMutation, useQueryClient, type UseQueryOptions, type UseMutationOptions } from "@tanstack/react-query";
import * as api from "./api";

// ── Entity Types ────────────────────────────────────────────────────────────

export interface Institution {
  id: string;
  institutionCode: string;
  dmeInstitutionId?: string;
  name: string;
  type: string;
  facilityType?: string;
  district: string;
  address: string;
  superintendentName?: string;
  contactPerson?: string;
  contactPhone?: string;
  contactEmail?: string;
  hodName?: string;
  isActive?: boolean;
  createdAt?: string;
}

export interface Equipment {
  id: string;
  equipmentCode: string;
  name: string;
  commonName?: string;
  category: string;
  department?: string;
  facilityType?: string;
  specifications: string;
  hsnCode?: string;
  gstRate: number;
  estimatedUnitCost?: number;
  standardised?: boolean;
  isActive?: boolean;
  createdAt?: string;
  [key: string]: any;
}

export interface Vendor {
  id: string;
  vendorCode: string;
  name: string;
  contactEmail: string;
  contactPhone: string;
  contactPerson?: string;
  address: string;
  gstNumber: string;
  panNumber?: string;
  bankName?: string;
  bankBranch?: string;
  bankIfsc?: string;
  bankAccountNo?: string;
  vendorTier?: string;
  performanceScore: number;
  onTimeDeliveryRate?: number;
  qaPassRate?: number;
  complianceScore?: number;
  totalPOs?: number;
  totalDeliveries?: number;
  status: string;
  isActive?: boolean;
  isL1Bidder?: boolean;
  createdAt?: string;
  [key: string]: any;
}

export interface RateContract {
  id: string;
  contractNumber: string;
  financialYear?: string;
  equipmentId: string;
  equipmentName: string;
  equipmentCategory?: string;
  tenderId?: string | null;
  tenderRef?: string;
  vendorId: string;
  vendorName: string;
  l1VendorName?: string;
  l2VendorName?: string;
  l3VendorName?: string;
  unitPrice: number;
  gstRate: number;
  unitPriceInclTax?: number;
  maxOrderQty?: number;
  warrantyMonths: number;
  warrantyYears?: number;
  cmcCharges?: number;
  cmcStartYear?: number;
  taxPercent?: number;
  validityEndDate?: string;
  supplyPeriodDays: number;
  awardDate?: string | null;
  startDate: string;
  endDate: string;
  daysToExpiry?: number;
  expiryStatus?: string;
  camcApplicable?: boolean;
  camcPeriodYears?: number;
  camcRatePerYear?: number;
  bfcApprovalRef?: string;
  specsConfirmed?: boolean;
  approvalStatus?: string;
  amendments?: any[];
  totalPOsIssued?: number;
  totalQtyOrdered?: number;
  totalValueOrdered?: number;
  status: string;
  closureReason?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

export interface IndentLineItem {
  equipmentId?: string;
  equipmentName: string;
  category?: string;
  department?: string;
  specifications?: string;
  requestedQty: number;
  approvedQty?: number;
  unitOfMeasure?: string;
  estimatedUnitCost?: number;
  procurementMode?: string;
  rateContractId?: string;
  tenderId?: string;
  poId?: string;
  poNumber?: string;
  paymentStatus?: string;
  paidAmount?: number;
  paidPercentage?: number;
  tranche1Paid?: boolean;
  tranche1Amount?: number;
  tranche1Reference?: string;
  tranche1PaidDate?: string;
  tranche1PaidBy?: string;
  tranche2Paid?: boolean;
  tranche2Amount?: number;
  tranche2Reference?: string;
  tranche2PaidDate?: string;
  tranche2PaidBy?: string;
  [key: string]: any;
}

export interface IndentInstitution {
  institutionId: string;
  institutionName: string;
  district?: string;
  quantities?: Array<{ lineItemIndex: number; sanctionedQty: number }>;
  fundSanctionedAmount?: number;
  fundSanctionDate?: string;
  fundDepositedAmount?: number;
  chequeUtrNo?: string;
  fundDepositDate?: string;
}

export interface Indent {
  id: string;
  indentNumber: string;
  indentRefNumber?: string | null;
  indentType?: string;
  financialYear?: string;
  indentDate?: string;
  facilityId: string;
  facilityName: string;
  hodName?: string;
  equipmentId?: string | null;
  equipmentName?: string;
  lineItems?: IndentLineItem[];
  institutions?: IndentInstitution[];
  quantity: number;
  technicalRequirements: string;
  estimatedTotalValue?: number;
  status: string;
  procurementMode?: string | null;
  rateContractId?: string | null;
  rateContractNumber?: string | null;
  rateContractVendor?: string | null;
  rateContractUnitPrice?: number | null;
  rateContractValidityEnd?: string | null;
  rateContractStatus?: string | null;
  tenderId?: string | null;
  tenderNumber?: string | null;
  tenderPortal?: string | null;
  tenderStatus?: string | null;
  tenderCurrentStageNumber?: number | null;
  tenderRequired?: boolean;
  hasFullRCCoverage?: boolean;
  hasPartialRCCoverage?: boolean;
  missingRCItems?: string[];
  rejectionReason?: string | null;
  returnComments?: string | null;
  digitisedBy: string;
  createdByUserId?: string | null;
  reviewedBy?: string | null;
  approvedBy?: string | null;
  approvalSteps?: any[];
  editAuditTrail?: any[];
  scannedCopyFilename?: string | null;
  accountHeadName?: string | null;
  programmeName?: string | null;
  fundingSourceName?: string | null;
  paymentStatus?: string;
  totalPaidAmount?: number;
  paidPercentage?: number;
  tranche1Paid?: boolean;
  tranche1Amount?: number;
  tranche1Reference?: string;
  tranche1PaidDate?: string;
  tranche1PaidBy?: string;
  tranche2Paid?: boolean;
  tranche2Amount?: number;
  tranche2Reference?: string;
  tranche2PaidDate?: string;
  tranche2PaidBy?: string;
  createdAt: string;
  updatedAt: string;
  [key: string]: any;
}

export interface CreateIndentBody {
  facilityId: string;
  equipmentId?: string;
  estimatedValue?: number;
  quantity?: number;
  technicalRequirements?: string;
  digitisedBy: string;
  budgetHead?: string;
  urgency?: string;
  remarks?: string;
  indentType?: string;
  financialYear?: string;
  indentRefNumber?: string;
  accountHeadName?: string;
  programmeName?: string;
  fundingSourceName?: string;
  lineItems?: any[];
  institutions?: any[];
  createdByUserId?: string;
  [key: string]: any;
}

export interface Tender {
  id: string;
  tenderNumber: string;
  indentId?: string | null;
  equipmentId?: string | null;
  equipmentName: string;
  equipmentCategory?: string;
  tenderType?: string;
  portal?: string;
  financialYear?: string;
  stages?: any[];
  currentStageNumber?: number;
  specsStatus?: string;
  specsConfirmationType?: string;
  specsApproverNames?: string;
  bfcApprovalDate?: string | null;
  bfcApprovalRef?: string;
  bfcMembersPresent?: string;
  l1VendorName?: string;
  l1BidAmount?: number;
  l1BidderName?: string;
  l1BidderAmount?: number;
  l2VendorName?: string;
  l2BidAmount?: number;
  l3VendorName?: string;
  l3BidAmount?: number;
  isCancelled?: boolean;
  cancellationStage?: number;
  cancellationReason?: string;
  tenderInvitedDate?: string | null;
  bidSubmissionStartDate?: string | null;
  bidSubmissionEndDate?: string | null;
  bidsReceivedDate?: string | null;
  status: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseOrderItem {
  equipmentId: string;
  equipmentName: string;
  rateContractId: string;
  rcNumber?: string;
  quantity: number;
  unitPrice: number;
  gstRate: number;
  gstAmount?: number;
  unitPriceInclTax?: number;
  totalAmount: number;
  indentLineItemIndex?: number;
  specifications?: string;
  category?: string;
  department?: string;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  poType?: string;
  financialYear?: string;
  poDate?: string;
  version?: number;
  indentId: string;
  indentNumber?: string;
  rateContractId: string;
  rcNumber?: string;
  vendorId: string;
  vendorName: string;
  equipmentId: string;
  equipmentName: string;
  items?: PurchaseOrderItem[];
  quantity: number;
  unitPrice: number;
  gstRate: number;
  gstAmount?: number;
  unitPriceInclTax?: number;
  totalEquipmentCost?: number;
  totalAmount: number;
  consignees?: any[];
  psRequired?: boolean;
  psPercent?: number;
  psAmount?: number;
  deliveryAddress: string;
  supplyPeriodDays?: number;
  expectedDeliveryDate?: string | null;
  actualDeliveryDate?: string | null;
  approvalStatus?: string;
  approvedBy?: string;
  approvedDate?: string | null;
  returnComments?: string;
  amendments?: any[];
  vendorAcknowledged?: boolean;
  vendorAckDate?: string | null;
  paymentStatus?: string;
  fileNo?: string;
  generatedBy?: string;
  remarks?: string;
  cancellationReason?: string | null;
  cancelledBy?: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  [key: string]: any;
}

export interface Delivery {
  id: string;
  deliveryTrackingId: string;
  qrCode?: string;
  purchaseOrderId: string;
  poNumber?: string;
  vendorId: string;
  vendorName: string;
  facilityId: string;
  facilityName: string;
  equipmentId?: string | null;
  equipmentName?: string;
  orderedQty?: number;
  quantity: number;
  receivedQty?: number;
  dispatchDate?: string | null;
  transporterName?: string;
  transporterVehicle?: string;
  lrGrNumber?: string;
  challanNumber?: string;
  invoiceNumber?: string;
  expectedDeliveryDate?: string | null;
  deliveredDate?: string | null;
  receivedBy?: string;
  condition?: string;
  serialNumbers?: string[];
  isOnTime?: boolean;
  delayDays?: number;
  deliveryCertUploaded?: boolean;
  deliveryCertDate?: string | null;
  discrepancies?: any[];
  discrepancyNotes?: string;
  qaInspectionItems?: any[];
  qaCommitteeName?: string;
  qaInspectionDate?: string | null;
  qaDecision?: string;
  qaComplianceScore?: number;
  qaNotes?: string;
  acceptanceCertificateIssued?: boolean;
  acceptanceCertDate?: string | null;
  installationRequired?: boolean;
  installationStatus?: string;
  installationDate?: string | null;
  trainingCompleted?: boolean;
  trainingDate?: string | null;
  warrantyStartDate?: string | null;
  warrantyEndDate?: string | null;
  warrantyMonths?: number;
  paymentStatus?: string;
  documentsUploaded?: boolean;
  status: string;
  createdAt: string;
  updatedAt: string;
  [key: string]: any;
}

// ── Query Key Functions ─────────────────────────────────────────────────────

export const getListInstitutionsQueryKey = () => ["/institutions"] as const;
export const getListEquipmentQueryKey = () => ["/equipment"] as const;
export const getListVendorsQueryKey = () => ["/vendors"] as const;
export const getGetVendorQueryKey = (id: string) => ["/vendors", id] as const;
export const getGetVendorPerformanceQueryKey = () => ["/dashboard/vendor-performance"] as const;

export const getListRateContractsQueryKey = (params?: any) => ["/rate-contracts", params] as const;
export const getGetRateContractQueryKey = (id: string) => ["/rate-contracts", id] as const;
export const getGetExpiringRateContractsQueryKey = () => ["/rate-contracts/expiring-soon"] as const;

export const getListIndentsQueryKey = (params?: any) => ["/indents", params] as const;
export const getGetIndentQueryKey = (id: string) => ["/indents", id] as const;

export const getListTendersQueryKey = (params?: any) => ["/tenders", params] as const;
export const getGetTenderQueryKey = (id: string) => ["/tenders", id] as const;

export const getListPurchaseOrdersQueryKey = (params?: any) => ["/purchase-orders", params] as const;
export const getGetPurchaseOrderQueryKey = (id: string) => ["/purchase-orders", id] as const;

export const getListDeliveriesQueryKey = (params?: any) => ["/deliveries", params] as const;
export const getGetDeliveryQueryKey = (id: string) => ["/deliveries", id] as const;

export const getGetDashboardSummaryQueryKey = () => ["/dashboard/summary"] as const;
export const getGetProcurementPipelineQueryKey = () => ["/dashboard/procurement-pipeline"] as const;
export const getGetRecentActivityQueryKey = () => ["/dashboard/recent-activity"] as const;
export const getGetSlaMetricsQueryKey = () => ["/dashboard/sla-metrics"] as const;

// ── Institution Hooks ───────────────────────────────────────────────────────

export function useListInstitutions(options?: { query?: any }) {
  return useQuery<Institution[]>({
    queryKey: getListInstitutionsQueryKey(),
    queryFn: () => api.getInstitutions(),
    ...options?.query,
  });
}
export const useInstitutions = useListInstitutions;

export function useCreateInstitution(options?: UseMutationOptions<Institution, unknown, any>) {
  const qc = useQueryClient();
  return useMutation<Institution, unknown, any>({
    mutationFn: (vars: any) => {
      const body = vars?.data !== undefined ? vars.data : vars;
      return api.createInstitution(body);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: getListInstitutionsQueryKey() }),
    ...options,
  });
}

// ── Equipment Hooks ─────────────────────────────────────────────────────────

export function useListEquipment(options?: { query?: any }) {
  return useQuery<Equipment[]>({
    queryKey: getListEquipmentQueryKey(),
    queryFn: () => api.getEquipment(),
    ...options?.query,
  });
}
export const useEquipment = useListEquipment;

export function useCreateEquipment(options?: UseMutationOptions<Equipment, unknown, any>) {
  const qc = useQueryClient();
  return useMutation<Equipment, unknown, any>({
    mutationFn: (vars: any) => {
      const body = vars?.data !== undefined ? vars.data : vars;
      return api.createEquipment(body);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: getListEquipmentQueryKey() }),
    ...options,
  });
}

// ── Vendor Hooks ────────────────────────────────────────────────────────────

export function useListVendors(options?: { query?: any }) {
  return useQuery<Vendor[]>({
    queryKey: getListVendorsQueryKey(),
    queryFn: () => api.getVendors(),
    ...options?.query,
  });
}
export const useVendors = useListVendors;

export function useGetVendor(id: string, options?: { query?: any }) {
  return useQuery<Vendor>({
    queryKey: getGetVendorQueryKey(id),
    queryFn: () => api.getVendor(id),
    enabled: !!id,
    ...options?.query,
  });
}
export const useVendor = useGetVendor;

export function useCreateVendor(options?: UseMutationOptions<Vendor, unknown, any>) {
  const qc = useQueryClient();
  return useMutation<Vendor, unknown, any>({
    mutationFn: (vars: any) => {
      const body = vars?.data !== undefined ? vars.data : vars;
      return api.createVendor(body);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: getListVendorsQueryKey() }),
    ...options,
  });
}

export function useUpdateVendor(options?: UseMutationOptions<Vendor, unknown, any>) {
  const qc = useQueryClient();
  return useMutation<Vendor, unknown, any>({
    mutationFn: (vars: any) => {
      const id = vars?.id ?? vars?._id;
      const data = vars?.data !== undefined ? vars.data : vars;
      return api.updateVendor(id, data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: getListVendorsQueryKey() }),
    ...options,
  });
}

export function useGetVendorPerformance(options?: { query?: any }) {
  return useQuery<any[]>({
    queryKey: getGetVendorPerformanceQueryKey(),
    queryFn: () => api.getVendorPerformance(),
    ...options?.query,
  });
}
export const useVendorPerformance = useGetVendorPerformance;

// ── Rate Contract Hooks ─────────────────────────────────────────────────────

export function useListRateContracts(params?: any, options?: { query?: any }) {
  const isOptionsInParams = params && "query" in params && !options;
  const actualOptions = isOptionsInParams ? params : options;
  const actualParams = isOptionsInParams ? undefined : params;
  return useQuery<RateContract[]>({
    queryKey: getListRateContractsQueryKey(actualParams),
    queryFn: () => api.getRateContracts(actualParams),
    ...actualOptions?.query,
  });
}
export const useRateContracts = useListRateContracts;

export function useGetRateContract(id: string, options?: { query?: any }) {
  return useQuery<RateContract>({
    queryKey: getGetRateContractQueryKey(id),
    queryFn: () => api.getRateContract(id),
    enabled: !!id,
    ...options?.query,
  });
}
export const useRateContract = useGetRateContract;

export function useGetExpiringRateContracts(options?: { query?: any }) {
  return useQuery<RateContract[]>({
    queryKey: getGetExpiringRateContractsQueryKey(),
    queryFn: () => api.getExpiringRateContracts(),
    ...options?.query,
  });
}
export const useExpiringRateContracts = useGetExpiringRateContracts;

export function useCreateRateContract(options?: UseMutationOptions<RateContract, unknown, any>) {
  const qc = useQueryClient();
  return useMutation<RateContract, unknown, any>({
    mutationFn: (vars: any) => {
      const body = vars?.data !== undefined ? vars.data : vars;
      return api.createRateContract(body);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: getListRateContractsQueryKey() }),
    ...options,
  });
}

export function useUpdateRateContract(options?: UseMutationOptions<RateContract, unknown, any>) {
  const qc = useQueryClient();
  return useMutation<RateContract, unknown, any>({
    mutationFn: (vars: any) => {
      const id = vars?.id ?? vars?._id;
      const data = vars?.data !== undefined ? vars.data : vars;
      return api.updateRateContract(id, data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: getListRateContractsQueryKey() }),
    ...options,
  });
}

export function useSubmitRateContractForApproval(options?: UseMutationOptions<RateContract, unknown, any>) {
  const qc = useQueryClient();
  return useMutation<RateContract, unknown, any>({
    mutationFn: (vars: any) => {
      const id = vars?.id ?? vars?._id;
      const data = vars?.data !== undefined ? vars.data : vars;
      return api.submitRateContractForApproval(id, data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: getListRateContractsQueryKey() }),
    ...options,
  });
}

export function useGmReviewRateContract(options?: UseMutationOptions<RateContract, unknown, any>) {
  const qc = useQueryClient();
  return useMutation<RateContract, unknown, any>({
    mutationFn: (vars: any) => {
      const id = vars?.id ?? vars?._id;
      const data = vars?.data !== undefined ? vars.data : vars;
      return api.gmReviewRateContract(id, data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: getListRateContractsQueryKey() }),
    ...options,
  });
}

export function useSoDecisionRateContract(options?: UseMutationOptions<RateContract, unknown, any>) {
  const qc = useQueryClient();
  return useMutation<RateContract, unknown, any>({
    mutationFn: (vars: any) => {
      const id = vars?.id ?? vars?._id;
      const data = vars?.data !== undefined ? vars.data : vars;
      return api.soDecisionRateContract(id, data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: getListRateContractsQueryKey() }),
    ...options,
  });
}

export function useAmendRateContract(options?: UseMutationOptions<RateContract, unknown, any>) {
  const qc = useQueryClient();
  return useMutation<RateContract, unknown, any>({
    mutationFn: (vars: any) => {
      const id = vars?.id ?? vars?._id;
      const data = vars?.data !== undefined ? vars.data : vars;
      return api.amendRateContract(id, data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: getListRateContractsQueryKey() }),
    ...options,
  });
}

export function useCloseRateContract(options?: UseMutationOptions<RateContract, unknown, any>) {
  const qc = useQueryClient();
  return useMutation<RateContract, unknown, any>({
    mutationFn: (vars: any) => {
      const id = vars?.id ?? vars?._id;
      const data = vars?.data !== undefined ? vars.data : vars;
      return api.closeRateContract(id, data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: getListRateContractsQueryKey() }),
    ...options,
  });
}

// ── Indent Hooks ────────────────────────────────────────────────────────────

export function useListIndents(params?: any, options?: { query?: any }) {
  return useQuery<Indent[]>({
    queryKey: getListIndentsQueryKey(params),
    queryFn: () => api.getIndents(params),
    ...options?.query,
  });
}
export const useIndents = useListIndents;

export function useGetIndent(id: string, options?: { query?: any }) {
  return useQuery<Indent>({
    queryKey: getGetIndentQueryKey(id),
    queryFn: () => api.getIndent(id),
    enabled: !!id,
    ...options?.query,
  });
}
export const useIndent = useGetIndent;

export function useCreateIndent(options?: UseMutationOptions<Indent, unknown, any>) {
  const qc = useQueryClient();
  return useMutation<Indent, unknown, any>({
    mutationFn: (vars: any) => {
      const body = vars?.data !== undefined ? vars.data : vars;
      return api.createIndent(body);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/indents"] }),
    ...options,
  });
}

export function useUpdateIndent(options?: UseMutationOptions<Indent, unknown, any>) {
  const qc = useQueryClient();
  return useMutation<Indent, unknown, any>({
    mutationFn: (vars: any) => {
      const id = vars?.id ?? vars?._id;
      const data = vars?.data !== undefined ? vars.data : vars;
      return api.updateIndent(id, data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/indents"] }),
    ...options,
  });
}

export function useApproveIndent(options?: UseMutationOptions<Indent, unknown, any>) {
  const qc = useQueryClient();
  return useMutation<Indent, unknown, any>({
    mutationFn: (vars: any) => {
      const id = vars?.id ?? vars?._id;
      const data = vars?.data !== undefined ? vars.data : vars;
      return api.approveIndent(id, data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/indents"] }),
    ...options,
  });
}

export function useRejectIndent(options?: UseMutationOptions<Indent, unknown, any>) {
  const qc = useQueryClient();
  return useMutation<Indent, unknown, any>({
    mutationFn: (vars: any) => {
      const id = vars?.id ?? vars?._id;
      const data = vars?.data !== undefined ? vars.data : vars;
      return api.rejectIndent(id, data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/indents"] }),
    ...options,
  });
}

export function useReturnIndent(options?: UseMutationOptions<Indent, unknown, any>) {
  const qc = useQueryClient();
  return useMutation<Indent, unknown, any>({
    mutationFn: (vars: any) => {
      const id = vars?.id ?? vars?._id;
      const data = vars?.data !== undefined ? vars.data : vars;
      return api.returnIndent(id, data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/indents"] }),
    ...options,
  });
}

// ── Tender Hooks ────────────────────────────────────────────────────────────

export function useListTenders(params?: any, options?: { query?: any }) {
  const isOptionsInParams = params && "query" in params && !options;
  const actualOptions = isOptionsInParams ? params : options;
  const actualParams = isOptionsInParams ? undefined : params;
  return useQuery<Tender[]>({
    queryKey: getListTendersQueryKey(actualParams),
    queryFn: () => api.getTenders(actualParams),
    ...actualOptions?.query,
  });
}
export const useTenders = useListTenders;

export function useGetTender(id: string, options?: { query?: any }) {
  return useQuery<Tender>({
    queryKey: getGetTenderQueryKey(id),
    queryFn: () => api.getTender(id),
    enabled: !!id,
    ...options?.query,
  });
}
export const useTender = useGetTender;

export function useCreateTender(options?: UseMutationOptions<Tender, unknown, any>) {
  const qc = useQueryClient();
  return useMutation<Tender, unknown, any>({
    mutationFn: (vars: any) => {
      const body = vars?.data !== undefined ? vars.data : vars;
      return api.createTender(body);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: getListTendersQueryKey() }),
    ...options,
  });
}

export function useUpdateTender(options?: UseMutationOptions<Tender, unknown, any>) {
  const qc = useQueryClient();
  return useMutation<Tender, unknown, any>({
    mutationFn: (vars: any) => {
      const id = vars?.id ?? vars?._id;
      const data = vars?.data !== undefined ? vars.data : vars;
      return api.updateTender(id, data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: getListTendersQueryKey() }),
    ...options,
  });
}

export function useUpdateTenderStage(options?: UseMutationOptions<Tender, unknown, any>) {
  const qc = useQueryClient();
  return useMutation<Tender, unknown, any>({
    mutationFn: (vars: { id: string; stageNumber: number; data?: any }) =>
      api.updateTenderStage(vars.id, vars.stageNumber, vars.data ?? vars),
    onSuccess: () => qc.invalidateQueries({ queryKey: getListTendersQueryKey() }),
    ...options,
  });
}

// ── Purchase Order Hooks ────────────────────────────────────────────────────

export function useListPurchaseOrders(params?: any, options?: { query?: any }) {
  return useQuery<PurchaseOrder[]>({
    queryKey: getListPurchaseOrdersQueryKey(params),
    queryFn: () => api.getPurchaseOrders(params),
    ...options?.query,
  });
}
export const usePurchaseOrders = useListPurchaseOrders;

export function useGetPurchaseOrder(id: string, options?: { query?: any }) {
  return useQuery<PurchaseOrder>({
    queryKey: getGetPurchaseOrderQueryKey(id),
    queryFn: () => api.getPurchaseOrder(id),
    enabled: !!id,
    ...options?.query,
  });
}
export const usePurchaseOrder = useGetPurchaseOrder;

export function useCreatePurchaseOrder(options?: UseMutationOptions<PurchaseOrder, unknown, any>) {
  const qc = useQueryClient();
  return useMutation<PurchaseOrder, unknown, any>({
    mutationFn: (vars: any) => {
      const body = vars?.data !== undefined ? vars.data : vars;
      return api.createPurchaseOrder(body);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: getListPurchaseOrdersQueryKey() }),
    ...options,
  });
}

export function useUpdatePurchaseOrder(options?: UseMutationOptions<PurchaseOrder, unknown, any>) {
  const qc = useQueryClient();
  return useMutation<PurchaseOrder, unknown, any>({
    mutationFn: (vars: any) => {
      const id = vars?.id ?? vars?._id;
      const data = vars?.data !== undefined ? vars.data : vars;
      return api.updatePurchaseOrder(id, data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: getListPurchaseOrdersQueryKey() }),
    ...options,
  });
}

export function useApprovePurchaseOrder(options?: UseMutationOptions<PurchaseOrder, unknown, any>) {
  const qc = useQueryClient();
  return useMutation<PurchaseOrder, unknown, any>({
    mutationFn: (vars: any) => {
      const id = typeof vars === "string" ? vars : (vars?.id ?? vars?._id);
      const data = vars?.data !== undefined ? vars.data : (typeof vars === "object" ? vars : undefined);
      return api.approvePurchaseOrder(id, data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: getListPurchaseOrdersQueryKey() }),
    ...options,
  });
}

export function useCancelPurchaseOrder(options?: UseMutationOptions<PurchaseOrder, unknown, any>) {
  const qc = useQueryClient();
  return useMutation<PurchaseOrder, unknown, any>({
    mutationFn: (vars: any) => {
      const id = typeof vars === "string" ? vars : (vars?.id ?? vars?._id);
      const data = vars?.data !== undefined ? vars.data : (typeof vars === "object" ? vars : undefined);
      return api.cancelPurchaseOrder(id, data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: getListPurchaseOrdersQueryKey() }),
    ...options,
  });
}

// ── Delivery Hooks ──────────────────────────────────────────────────────────

export function useListDeliveries(params?: any, options?: { query?: any }) {
  return useQuery<Delivery[]>({
    queryKey: getListDeliveriesQueryKey(params),
    queryFn: () => api.getDeliveries(params),
    ...options?.query,
  });
}
export const useDeliveries = useListDeliveries;

export function useGetDelivery(id: string, options?: { query?: any }) {
  return useQuery<Delivery>({
    queryKey: getGetDeliveryQueryKey(id),
    queryFn: () => api.getDelivery(id),
    enabled: !!id,
    ...options?.query,
  });
}
export const useDelivery = useGetDelivery;

export function useCreateDelivery(options?: UseMutationOptions<Delivery, unknown, any>) {
  const qc = useQueryClient();
  return useMutation<Delivery, unknown, any>({
    mutationFn: (vars: any) => {
      const body = vars?.data !== undefined ? vars.data : vars;
      return api.createDelivery(body);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: getListDeliveriesQueryKey() }),
    ...options,
  });
}

export function useUpdateDelivery(options?: UseMutationOptions<Delivery, unknown, any>) {
  const qc = useQueryClient();
  return useMutation<Delivery, unknown, any>({
    mutationFn: (vars: any) => {
      const id = vars?.id ?? vars?._id;
      const data = vars?.data !== undefined ? vars.data : vars;
      return api.updateDelivery(id, data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: getListDeliveriesQueryKey() }),
    ...options,
  });
}

export function useAcceptDelivery(options?: UseMutationOptions<Delivery, unknown, any>) {
  const qc = useQueryClient();
  return useMutation<Delivery, unknown, any>({
    mutationFn: (vars: any) => {
      const id = typeof vars === "string" ? vars : (vars?.id ?? vars?._id);
      return api.acceptDelivery(id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: getListDeliveriesQueryKey() }),
    ...options,
  });
}

// ── Dashboard Hooks ─────────────────────────────────────────────────────────

export function useGetDashboardSummary(options?: { query?: any }) {
  return useQuery<any>({
    queryKey: getGetDashboardSummaryQueryKey(),
    queryFn: () => api.getDashboardSummary(),
    ...options?.query,
  });
}
export const useDashboardSummary = useGetDashboardSummary;

export function useGetProcurementPipeline(options?: { query?: any }) {
  return useQuery<any[]>({
    queryKey: getGetProcurementPipelineQueryKey(),
    queryFn: () => api.getProcurementPipeline(),
    ...options?.query,
  });
}
export const useProcurementPipeline = useGetProcurementPipeline;

export function useGetRecentActivity(options?: { query?: any }) {
  return useQuery<any[]>({
    queryKey: getGetRecentActivityQueryKey(),
    queryFn: () => api.getRecentActivity(),
    ...options?.query,
  });
}
export const useRecentActivity = useGetRecentActivity;

export function useGetSlaMetrics(options?: { query?: any }) {
  return useQuery<any>({
    queryKey: getGetSlaMetricsQueryKey(),
    queryFn: () => api.getSLAMetrics(),
    ...options?.query,
  });
}
export const useSLAMetrics = useGetSlaMetrics;

// ── Master Data & System Hooks ──────────────────────────────────────────────

export function useDistricts() {
  return useQuery<any[]>({ queryKey: ["/districts"], queryFn: api.getDistricts });
}

export function useFundingSources() {
  return useQuery<any[]>({ queryKey: ["/funding-sources"], queryFn: api.getFundingSources });
}

export function useProgrammes() {
  return useQuery<any[]>({ queryKey: ["/programmes"], queryFn: api.getProgrammes });
}

export function useAccountHeads() {
  return useQuery<any[]>({ queryKey: ["/account-heads"], queryFn: api.getAccountHeads });
}

export function useTaxSlabs() {
  return useQuery<any[]>({ queryKey: ["/tax-slabs"], queryFn: api.getTaxSlabs });
}

export function useNotifications(userId: string) {
  return useQuery<any[]>({
    queryKey: ["/notifications", userId],
    queryFn: () => api.getNotifications(userId),
    enabled: !!userId,
    refetchInterval: 30000,
  });
}

export function useAuditLog(params?: any) {
  return useQuery<any[]>({
    queryKey: ["/audit-log", params],
    queryFn: () => api.getAuditLog(params),
  });
}


// ── Reports Hooks ───────────────────────────────────────────────────────────

export function useIndentAgingReport() {
  return useQuery<any[]>({ queryKey: ["/reports/indent-aging"], queryFn: api.getIndentAgingReport });
}

export function useRCExpiryReport() {
  return useQuery<any[]>({ queryKey: ["/reports/rc-expiry"], queryFn: api.getRCExpiryReport });
}

export function usePOStatusReport() {
  return useQuery<any[]>({ queryKey: ["/reports/po-status"], queryFn: api.getPOStatusReport });
}

export function useDeliveryComplianceReport() {
  return useQuery<any[]>({ queryKey: ["/reports/delivery-compliance"], queryFn: api.getDeliveryComplianceReport });
}

export function useBudgetUtilizationReport() {
  return useQuery<any[]>({ queryKey: ["/reports/budget-utilization"], queryFn: api.getBudgetUtilizationReport });
}

export function useVendorPerformanceReport() {
  return useQuery<any[]>({ queryKey: ["/reports/vendor-performance"], queryFn: api.getVendorPerformanceReport });
}

// ── Users & Roles Hooks ─────────────────────────────────────────────────────

export function useUsers(params?: Record<string, any>) {
  return useQuery<any[]>({
    queryKey: ["/auth/users", params],
    queryFn: () => api.getUsers(params),
  });
}

export function useRoles() {
  return useQuery<any[]>({
    queryKey: ["/auth/roles"],
    queryFn: api.getRoles,
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: any) => api.createUser(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/auth/users"] });
      qc.invalidateQueries({ queryKey: ["/auth/roles"] });
    },
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; [key: string]: any }) => api.updateUser(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/auth/users"] });
      qc.invalidateQueries({ queryKey: ["/auth/roles"] });
    },
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteUser(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/auth/users"] });
      qc.invalidateQueries({ queryKey: ["/auth/roles"] });
    },
  });
}

// ── Statewide Item-wise Asset Report Hooks (FR-RPT-ASSET-001) ───────────────

export function useAssetReport(params?: Record<string, any>) {
  return useQuery<{ assets: any[]; total: number; page: number; limit: number; totalPages: number; kpis: any }>({
    queryKey: ["/reports/asset-report", params],
    queryFn: () => api.getAssetReport(params),
  });
}

export function useAssetReportKPIs(params?: Record<string, any>) {
  return useQuery<any>({
    queryKey: ["/reports/asset-report/summary-kpis", params],
    queryFn: () => api.getAssetReportKPIs(params),
  });
}

export function useAssetReportDrilldown(params?: Record<string, any>) {
  return useQuery<{ state: string; totalAssets: number; districts: any[] }>({
    queryKey: ["/reports/asset-report/drilldown", params],
    queryFn: () => api.getAssetReportDrilldown(params),
  });
}

export function useUpdateAssetStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; status: string; remarks?: string; user?: string; role?: string }) =>
      api.updateEquipmentAssetStatus(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/reports/asset-report"] });
      qc.invalidateQueries({ queryKey: ["/equipment-assets"] });
    },
  });
}

