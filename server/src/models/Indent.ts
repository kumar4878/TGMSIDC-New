import { Schema, model, type Document, type Types } from "mongoose";

/* ── Sub-schemas ─────────────────────────────────────────────────────── */

const ApprovalStepSchema = new Schema({
  stepNumber: { type: Number, required: true },
  requiredRole: { type: String, required: true },
  roleLabel: { type: String, required: true },
  assignedUserName: { type: String, required: true },
  assignedUserId: { type: String, required: true },
  status: { type: String, required: true, default: "pending" },
  actionedAt: { type: Date },
  comments: { type: String },
});

const EditAuditEntrySchema = new Schema({
  field: { type: String, required: true },
  originalValue: { type: String },
  correctedValue: { type: String },
  correctedBy: { type: String, required: true },
  correctedAt: { type: Date, required: true, default: () => new Date() },
});

const IndentLineItemSchema = new Schema({
  equipmentId: { type: Schema.Types.Mixed, ref: "Equipment" },
  equipmentName: { type: String, required: true },
  category: { type: String, required: true, default: "Medical Equipment" },
  department: { type: String, default: "General" },
  specifications: { type: String, default: "Standard technical specifications" },
  isWriteIn: { type: Boolean, default: false },
  writeInResolution: {
    type: String,
    enum: ["pending", "mapped_to_master", "new_addition_requested", ""],
    default: "",
  },
  mappedEquipmentId: { type: Schema.Types.Mixed, ref: "Equipment" },
  requestedQty: { type: Number, default: 1 },
  approvedQty: { type: Number },
  unitOfMeasure: { type: String, default: "No." },
  estimatedUnitCost: { type: Number, default: 0 },
  procurementMode: { type: String, enum: ["rate_contract", "tender", "local_purchase", ""], default: "" },
  rateContractId: { type: Schema.Types.Mixed, ref: "RateContract" },
  rateContractNumber: { type: String, default: "" },
  rateContractVendor: { type: String, default: "" },
  rateContractUnitPrice: { type: Number, default: 0 },
  candidateRateContracts: [
    {
      rcId: { type: Schema.Types.Mixed, ref: "RateContract" },
      contractNumber: String,
      vendorName: String,
      unitPrice: Number,
      endDate: Date,
    },
  ],
  priority: { type: Number, default: 1 },
  originalRequestedQty: { type: Number },
  deferred: { type: Boolean, default: false },
  estimatedTotalCost: { type: Number, default: 0 },
  costEstimationBasis: { type: String, default: "rc_rate" },
  tenderId: { type: Schema.Types.Mixed, ref: "Tender" },
  tenderNumber: { type: String, default: "" },
  poId: { type: Schema.Types.Mixed, ref: "PurchaseOrder" },
  poNumber: { type: String, default: "" },
  lineStatus: {
    type: String,
    default: "draft",
  },
});

const IndentInstitutionSchema = new Schema({
  institutionId: { type: Schema.Types.Mixed, ref: "Institution", required: true },
  institutionName: { type: String, required: true },
  district: { type: String },
  quantities: [
    {
      lineItemIndex: { type: Number, required: true },
      sanctionedQty: { type: Number, required: true },
    },
  ],
  fundSanctionedAmount: { type: Number, default: 0 },
  fundSanctionDate: { type: Date },
  fundDepositedAmount: { type: Number, default: 0 },
  chequeUtrNo: { type: String },
  fundDepositDate: { type: Date },
});

/* ── Main interface ──────────────────────────────────────────────────── */

export interface IIndent extends Document {
  indentNumber: string;
  indentRefNumber?: string;
  indentType: string;
  financialYear: string;
  indentDate: Date;

  /* HoD / facility that raised the indent */
  facilityId: Types.ObjectId;
  facilityName: string;
  hodName: string;
  superintendentName?: string;
  contactPerson?: string;
  contactPhone?: string;
  contactEmail?: string;
  signatories?: any[];
  attachments?: any[];

  /* Master links */
  fundingSourceId?: Types.ObjectId;
  programmeId?: Types.ObjectId;
  accountHeadId?: Types.ObjectId;
  accountHeadName?: string;
  programmeName?: string;
  fundingSourceName?: string;

  /* Line items & institutions */
  lineItems: any[];
  institutions: any[];

  /* Scanned indent copy */
  scannedCopyFilename?: string;
  scannedCopyDataUrl?: string;

  /* Aggregate fields (for backward compat and simpler queries) */
  equipmentId?: Types.ObjectId;
  equipmentName?: string;
  quantity: number;
  technicalRequirements: string;
  estimatedTotalValue: number;

  /* Workflow */
  status: string;
  verificationStatus?: string;
  verifiedBy?: string;
  verifiedAt?: Date;
  verificationRemarks?: string;
  procurementMode?: string;
  rateContractId?: Types.ObjectId;
  tenderId?: Types.ObjectId;
  purchaseOrderId?: Types.ObjectId;
  poNumber?: string;
  rejectionReason?: string;
  returnComments?: string;

  /* Users */
  digitisedBy: string;
  createdByUserId?: string;
  reviewedBy?: string;
  approvedBy?: string;

  /* Administrative Sanction & Cost Estimation Validation */
  asAmount?: number;
  asDate?: Date;
  asReferenceNo?: string;
  revisedAsAmount?: number;
  revisedAsDate?: Date;
  revisedAsReferenceNo?: string;
  revisedAsRemarks?: string;
  estimatedTotalProcurementValue?: number;
  budgetSurplusOrShortfall?: number;
  budgetSufficiency?: string;
  budgetValidationStatus?: string;
  reprioritizationNotes?: string;
  reprioritizationHistory?: any[];

  /* Approval chain & audit */
  approvalSteps: any[];
  editAuditTrail: any[];

  createdAt: Date;
  updatedAt: Date;
}

/* ── Schema ──────────────────────────────────────────────────────────── */

const IndentSchema = new Schema<IIndent>(
  {
    indentNumber: { type: String, required: true, unique: true },
    indentRefNumber: { type: String },
    indentType: {
      type: String,
      required: true,
      default: "letter",
      enum: ["letter", "go", "proceeding"],
    },
    financialYear: { type: String, required: true, default: "2026-27" },
    indentDate: { type: Date, required: true, default: () => new Date() },

    facilityId: { type: Schema.Types.Mixed, ref: "Institution", required: true },
    facilityName: { type: String, default: "" },
    hodName: { type: String, default: "" },
    superintendentName: { type: String },
    contactPerson: { type: String },
    contactPhone: { type: String },
    contactEmail: { type: String },
    signatories: { type: Array, default: [] },
    attachments: { type: Array, default: [] },

    fundingSourceId: { type: Schema.Types.Mixed, ref: "FundingSource" },
    programmeId: { type: Schema.Types.Mixed, ref: "Programme" },
    accountHeadId: { type: Schema.Types.Mixed, ref: "AccountHead" },
    accountHeadName: { type: String },
    programmeName: { type: String },
    fundingSourceName: { type: String },

    lineItems: [IndentLineItemSchema],
    institutions: [IndentInstitutionSchema],

    scannedCopyFilename: { type: String },
    scannedCopyDataUrl: { type: String },

    /* Backward-compat aggregate */
    equipmentId: { type: Schema.Types.Mixed, ref: "Equipment" },
    equipmentName: { type: String, default: "" },
    quantity: { type: Number, required: true, default: 0 },
    technicalRequirements: { type: String, required: true, default: "—" },
    estimatedTotalValue: { type: Number, default: 0 },

    status: { type: String, required: true, default: "draft" },
    verificationStatus: { type: String, default: "draft" },
    verifiedBy: { type: String },
    verifiedAt: { type: Date },
    verificationRemarks: { type: String },
    procurementMode: { type: String },
    rateContractId: { type: Schema.Types.Mixed, ref: "RateContract" },
    tenderId: { type: Schema.Types.Mixed, ref: "Tender" },
    purchaseOrderId: { type: Schema.Types.Mixed, ref: "PurchaseOrder" },
    poNumber: { type: String, default: "" },
    rejectionReason: { type: String },
    returnComments: { type: String },

    digitisedBy: { type: String, required: true },
    createdByUserId: { type: String },
    reviewedBy: { type: String },
    approvedBy: { type: String },

    /* Budget & Administrative Sanction */
    asAmount: { type: Number, default: 0 },
    asDate: { type: Date },
    asReferenceNo: { type: String, default: "" },
    revisedAsAmount: { type: Number },
    revisedAsDate: { type: Date },
    revisedAsReferenceNo: { type: String },
    revisedAsRemarks: { type: String },
    estimatedTotalProcurementValue: { type: Number, default: 0 },
    budgetSurplusOrShortfall: { type: Number, default: 0 },
    budgetSufficiency: { type: String, default: "pending_validation" },
    budgetValidationStatus: { type: String, default: "pending" },
    reprioritizationNotes: { type: String, default: "" },
    reprioritizationHistory: { type: Array, default: [] },

    approvalSteps: [ApprovalStepSchema],
    editAuditTrail: [EditAuditEntrySchema],
  },
  { timestamps: true }
);

export const Indent = model<IIndent>("Indent", IndentSchema);
