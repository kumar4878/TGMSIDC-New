import { Schema, model, type Document, type Types } from "mongoose";

const RCAmendmentSchema = new Schema({
  amendmentRef: { type: String, required: true },
  amendmentType: { type: String, required: true },
  description: { type: String },
  previousValue: { type: String },
  newValue: { type: String },
  approvedBy: { type: String },
  approvedDate: { type: Date },
  status: { type: String, default: "pending" },
});

export interface IRateContract extends Document {
  contractNumber: string;
  financialYear: string;
  equipmentId: Types.ObjectId;
  equipmentName: string;
  equipmentCategory: string;

  /* Tender linkage */
  tenderId?: Types.ObjectId;
  tenderRef: string;

  /* Multi-vendor L1/L2/L3 */
  vendorId: Types.ObjectId;
  vendorName: string;
  l1VendorId?: Types.ObjectId;
  l1VendorName: string;
  l2VendorId?: Types.ObjectId;
  l2VendorName: string;
  l3VendorId?: Types.ObjectId;
  l3VendorName: string;

  /* Pricing */
  unitPrice: number;
  gstRate: number;
  unitPriceInclTax: number;
  maxOrderQty: number;

  /* Contract terms */
  warrantyMonths: number;
  supplyPeriodDays: number;
  awardDate?: Date;
  startDate: Date;
  endDate: Date;

  /* CAMC */
  camcApplicable: boolean;
  camcPeriodYears: number;
  camcRatePerYear: number;
  camcStartDate?: Date;

  /* BFC */
  bfcApprovalRef: string;
  bfcApprovalDate?: Date;

  /* Spec confirmation */
  specsConfirmed: boolean;
  specsApproverNames: string;

  /* Amendments */
  amendments: any[];
  predecessorRCId?: Types.ObjectId;

  /* Approval workflow */
  approvalStatus: string;
  approvedBy: string;
  approvedDate?: Date;

  /* Documents */
  contractDocFilename: string;
  supportingDocs: string[];

  status: string;
  closureReason: string;

  /* PO tracking */
  totalPOsIssued: number;
  totalQtyOrdered: number;
  totalValueOrdered: number;

  createdAt: Date;
  updatedAt: Date;
}

const RateContractSchema = new Schema<IRateContract>(
  {
    contractNumber: { type: String, required: true, unique: true },
    financialYear: { type: String, default: "2025-26" },
    equipmentId: { type: Schema.Types.Mixed, ref: "Equipment", required: true },
    equipmentName: { type: String, default: "" },
    equipmentCategory: { type: String, default: "" },

    tenderId: { type: Schema.Types.Mixed, ref: "Tender" },
    tenderRef: { type: String, default: "" },

    vendorId: { type: Schema.Types.Mixed, ref: "Vendor", required: true },
    vendorName: { type: String, default: "" },
    l1VendorId: { type: Schema.Types.Mixed, ref: "Vendor" },
    l1VendorName: { type: String, default: "" },
    l2VendorId: { type: Schema.Types.Mixed, ref: "Vendor" },
    l2VendorName: { type: String, default: "" },
    l3VendorId: { type: Schema.Types.Mixed, ref: "Vendor" },
    l3VendorName: { type: String, default: "" },

    unitPrice: { type: Number, required: true },
    gstRate: { type: Number, required: true, default: 12 },
    unitPriceInclTax: { type: Number, default: 0 },
    maxOrderQty: { type: Number, default: 0 },

    warrantyMonths: { type: Number, required: true, default: 12 },
    supplyPeriodDays: { type: Number, default: 45 },
    awardDate: { type: Date },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },

    camcApplicable: { type: Boolean, default: false },
    camcPeriodYears: { type: Number, default: 0 },
    camcRatePerYear: { type: Number, default: 0 },
    camcStartDate: { type: Date },

    bfcApprovalRef: { type: String, default: "" },
    bfcApprovalDate: { type: Date },

    specsConfirmed: { type: Boolean, default: false },
    specsApproverNames: { type: String, default: "" },

    amendments: [RCAmendmentSchema],
    predecessorRCId: { type: Schema.Types.ObjectId, ref: "RateContract" },

    approvalStatus: { type: String, default: "pending", enum: ["pending", "proposed_approve", "proposed_reject", "approved", "returned", "rejected"] },
    approvedBy: { type: String, default: "" },
    approvedDate: { type: Date },

    contractDocFilename: { type: String, default: "" },
    supportingDocs: [{ type: String }],

    status: { type: String, required: true, default: "active" },
    closureReason: { type: String, default: "" },

    totalPOsIssued: { type: Number, default: 0 },
    totalQtyOrdered: { type: Number, default: 0 },
    totalValueOrdered: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const RateContract = model<IRateContract>("RateContract", RateContractSchema);
