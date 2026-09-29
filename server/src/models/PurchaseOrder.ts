import { Schema, model, type Document, type Types } from "mongoose";

const ConsigneeSchema = new Schema({
  institutionId: { type: Schema.Types.Mixed, ref: "Institution" },
  institutionName: { type: String, default: "Telangana Medical Facility" },
  district: { type: String, default: "Hyderabad" },
  address: { type: String, default: "Telangana Medical Facility" },
  quantity: { type: Number, required: true, default: 1 },
  deliveryStatus: { type: String, default: "pending" },
});

const POAmendmentSchema = new Schema({
  amendmentRef: { type: String, required: true },
  amendmentType: { type: String, required: true },
  description: { type: String },
  previousValue: { type: String },
  newValue: { type: String },
  status: { type: String, default: "pending" },
  requestedBy: { type: String },
  approvedBy: { type: String },
  requestedDate: { type: Date },
  approvedDate: { type: Date },
});

export interface IPurchaseOrder extends Document {
  poNumber: string;
  poType: string;
  financialYear: string;
  poDate: Date;
  version: number;

  indentId: Types.ObjectId;
  indentNumber: string;
  rateContractId: Types.ObjectId;
  rcNumber: string;
  vendorId: Types.ObjectId;
  vendorName: string;
  equipmentId: Types.ObjectId;
  equipmentName: string;

  /* Quantity & pricing */
  quantity: number;
  unitPrice: number;
  gstRate: number;
  gstAmount: number;
  unitPriceInclTax: number;
  totalEquipmentCost: number;
  totalAmount: number;

  /* Consignees */
  consignees: any[];

  /* Performance Security */
  psRequired: boolean;
  psPercent: number;
  psAmount: number;
  bgDueDate?: Date;
  bgReferenceNo?: string;
  bgStatus?: string;
  bgExpiryDate?: Date;

  /* Multi-vendor allocation */
  vendorTier?: string;
  allocationRatio?: string;

  /* Delivery */
  deliveryAddress: string;
  supplyPeriodDays: number;
  expectedDeliveryDate?: Date;
  actualDeliveryDate?: Date;

  /* Approval */
  approvalStatus: string;
  approvedBy: string;
  approvedDate?: Date;
  returnComments: string;

  /* Amendment & cancellation */
  amendments: any[];
  cancellationReason: string;
  cancelledBy: string;
  cancelledDate?: Date;

  /* Vendor acknowledgement */
  vendorAcknowledged: boolean;
  vendorAckDate?: Date;
  vendorExpectedDispatchDate?: Date;

  /* Payment (Scope Boundary: Manual Paid/Not-Paid status recorded by TGMSIDC Accounts) */
  paymentStatus: string;
  paymentReference?: string;
  paymentDate?: Date;
  paymentAmount?: number;
  paidBy?: string;
  paymentRemarks?: string;
  tranche1Amount?: number;
  tranche1Paid?: boolean;
  tranche1PaidDate?: Date;
  tranche1Reference?: string;
  tranche1PaidBy?: string;
  tranche2Amount?: number;
  tranche2Paid?: boolean;
  tranche2PaidDate?: Date;
  tranche2Reference?: string;
  tranche2PaidBy?: string;
  paymentHistory?: any[];

  /* Misc */
  fileNo: string;
  generatedBy: string;
  remarks: string;

  status: string;
  createdAt: Date;
  updatedAt: Date;
}

const PurchaseOrderSchema = new Schema<IPurchaseOrder>(
  {
    poNumber: { type: String, required: true, unique: true },
    poType: { type: String, default: "rc_based", enum: ["rc_based", "local_purchase"] },
    financialYear: { type: String, default: "2025-26" },
    poDate: { type: Date, default: () => new Date() },
    version: { type: Number, default: 1 },

    indentId: { type: Schema.Types.Mixed, ref: "Indent", required: true },
    indentNumber: { type: String, default: "" },
    rateContractId: { type: Schema.Types.Mixed, ref: "RateContract", required: true },
    rcNumber: { type: String, default: "" },
    vendorId: { type: Schema.Types.Mixed, ref: "Vendor", required: true },
    vendorName: { type: String, default: "" },
    vendorTier: { type: String, default: "L1" },
    allocationRatio: { type: String, default: "100%" },
    equipmentId: { type: Schema.Types.Mixed, ref: "Equipment", required: true },
    equipmentName: { type: String, default: "" },

    quantity: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
    gstRate: { type: Number, required: true },
    gstAmount: { type: Number, default: 0 },
    unitPriceInclTax: { type: Number, default: 0 },
    totalEquipmentCost: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },

    consignees: [ConsigneeSchema],

    psRequired: { type: Boolean, default: false },
    psPercent: { type: Number, default: 0 },
    psAmount: { type: Number, default: 0 },
    bgDueDate: { type: Date },
    bgReferenceNo: { type: String, default: "" },
    bgStatus: { type: String, default: "pending", enum: ["pending", "submitted", "verified", "returned", "not_applicable"] },
    bgExpiryDate: { type: Date },

    deliveryAddress: { type: String, required: true },
    supplyPeriodDays: { type: Number, default: 45 },
    expectedDeliveryDate: { type: Date },
    actualDeliveryDate: { type: Date },

    approvalStatus: { type: String, default: "pending", enum: ["pending", "proposed_approve", "proposed_reject", "approved", "returned", "rejected"] },
    approvedBy: { type: String, default: "" },
    approvedDate: { type: Date },
    returnComments: { type: String, default: "" },

    amendments: [POAmendmentSchema],
    cancellationReason: { type: String },
    cancelledBy: { type: String },
    cancelledDate: { type: Date },

    vendorAcknowledged: { type: Boolean, default: false },
    vendorAckDate: { type: Date },
    vendorExpectedDispatchDate: { type: Date },

    /* Scope Boundary: Manual Payment Status & 90/10 Tranche Release */
    paymentStatus: { type: String, default: "not_paid" },
    paymentReference: { type: String, default: "" },
    paymentDate: { type: Date },
    paymentAmount: { type: Number, default: 0 },
    paidBy: { type: String, default: "" },
    paymentRemarks: { type: String, default: "" },

    tranche1Amount: { type: Number, default: 0 },
    tranche1Paid: { type: Boolean, default: false },
    tranche1PaidDate: { type: Date },
    tranche1Reference: { type: String, default: "" },
    tranche1PaidBy: { type: String, default: "" },

    tranche2Amount: { type: Number, default: 0 },
    tranche2Paid: { type: Boolean, default: false },
    tranche2PaidDate: { type: Date },
    tranche2Reference: { type: String, default: "" },
    tranche2PaidBy: { type: String, default: "" },

    paymentHistory: [
      {
        paymentStatus: { type: String, required: true },
        paymentReference: { type: String, required: true },
        paymentDate: { type: Date, default: () => new Date() },
        paymentAmount: { type: Number, required: true },
        paidBy: { type: String, default: "TGMSIDC Accounts Officer" },
        remarks: { type: String, default: "" },
        recordedAt: { type: Date, default: () => new Date() },
      },
    ],

    fileNo: { type: String, default: "" },
    generatedBy: { type: String, default: "" },
    remarks: { type: String, default: "" },

    status: { type: String, required: true, default: "draft" },
  },
  { timestamps: true }
);

export const PurchaseOrder = model<IPurchaseOrder>("PurchaseOrder", PurchaseOrderSchema);
