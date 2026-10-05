import { Schema, model, type Document, type Types } from "mongoose";

const DiscrepancySchema = new Schema({
  type: { type: String, required: true, enum: ["short_delivery", "wrong_item", "damaged", "other"] },
  description: { type: String, required: true },
  quantity: { type: Number, default: 0 },
  actionRequired: { type: String, default: "replacement", enum: ["re_delivery", "replacement", "credit_note"] },
  resolutionStatus: { type: String, default: "open", enum: ["open", "in_progress", "resolved", "escalated"] },
  resolvedDate: { type: Date },
  resolvedNotes: { type: String },
});

const QAInspectionSchema = new Schema({
  parameterName: { type: String, required: true },
  result: { type: String, required: true, default: "pending", enum: ["pending", "pass", "fail", "na"] },
  remarks: { type: String },
});

export interface IDelivery extends Document {
  deliveryTrackingId: string;
  purchaseOrderId: Types.ObjectId;
  poNumber: string;
  vendorId: Types.ObjectId;
  vendorName: string;
  facilityId: Types.ObjectId;
  facilityName: string;
  equipmentId?: Types.ObjectId;
  equipmentName: string;

  /* Quantities */
  orderedQty: number;
  quantity: number;
  receivedQty: number;
  acceptedQty: number;
  shortageQty: number;
  damagedQty: number;
  rejectedQty: number;
  returnedQty: number;

  /* Dispatch info */
  dispatchDate?: Date;
  transporterName: string;
  transporterVehicle: string;
  lrGrNumber: string;
  challanNumber: string;
  invoiceNumber: string;

  /* Receipt info */
  expectedDeliveryDate?: Date;
  deliveredDate?: Date;
  receivedBy: string;
  condition: string;
  serialNumbers: string[];
  isOnTime: boolean;
  delayDays: number;

  /* Delivery certificate (DCC) */
  deliveryCertUploaded: boolean;
  deliveryCertDate?: Date;
  deliveryCertFilename: string;
  dccVerified?: boolean;
  dccVerifiedBy?: string;
  dccVerifiedDate?: Date;
  dccVerificationNotes?: string;

  /* Discrepancies */
  discrepancies: any[];
  discrepancyNotes: string;

  /* QA / Inspection & Reinspection */
  qaInspectionItems: any[];
  qaCommitteeName: string;
  qaInspectionDate?: Date;
  qaDecision: string;
  qaComplianceScore: number;
  qaNotes: string;
  isReinspection?: boolean;
  reinspectionCount?: number;
  reinspectionDecision?: string;
  reinspectionDate?: Date;
  reinspectionNotes?: string;

  /* Asset Registration */
  equipmentRegistered?: boolean;
  registeredAssetTags?: string[];

  /* Acceptance */
  acceptanceCertificateIssued: boolean;
  acceptanceCertDate?: Date;
  rejectionReason: string;

  /* Installation */
  installationRequired: boolean;
  installationStatus: string;
  installationDate?: Date;
  trainingCompleted: boolean;
  trainingDate?: Date;

  /* Warranty */
  warrantyStartDate?: Date;
  warrantyEndDate?: Date;
  warrantyMonths: number;

  /* Payment */
  paymentStatus: string;

  /* GRN & Annexure 6 */
  grnNumber?: string;
  grnDate?: Date;
  annexure6?: any;

  documentsUploaded: boolean;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

const DeliverySchema = new Schema<IDelivery>(
  {
    deliveryTrackingId: { type: String, required: true, unique: true },
    purchaseOrderId: { type: Schema.Types.Mixed, ref: "PurchaseOrder", required: true },
    poNumber: { type: String, default: "" },
    vendorId: { type: Schema.Types.Mixed, ref: "Vendor", required: true },
    vendorName: { type: String, default: "" },
    facilityId: { type: Schema.Types.Mixed, ref: "Institution", required: true },
    facilityName: { type: String, default: "" },
    equipmentId: { type: Schema.Types.Mixed, ref: "Equipment" },
    equipmentName: { type: String, default: "" },

    orderedQty: { type: Number, default: 0 },
    quantity: { type: Number, required: true },
    receivedQty: { type: Number, default: 0 },
    acceptedQty: { type: Number, default: 0 },
    shortageQty: { type: Number, default: 0 },
    damagedQty: { type: Number, default: 0 },
    rejectedQty: { type: Number, default: 0 },
    returnedQty: { type: Number, default: 0 },

    dispatchDate: { type: Date },
    transporterName: { type: String, default: "" },
    transporterVehicle: { type: String, default: "" },
    lrGrNumber: { type: String, default: "" },
    challanNumber: { type: String, default: "" },
    invoiceNumber: { type: String, default: "" },

    expectedDeliveryDate: { type: Date },
    deliveredDate: { type: Date },
    receivedBy: { type: String, default: "" },
    condition: { type: String, default: "good" },
    serialNumbers: [{ type: String }],
    isOnTime: { type: Boolean, default: true },
    delayDays: { type: Number, default: 0 },

    deliveryCertUploaded: { type: Boolean, default: false },
    deliveryCertDate: { type: Date },
    deliveryCertFilename: { type: String, default: "" },
    dccVerified: { type: Boolean, default: false },
    dccVerifiedBy: { type: String, default: "" },
    dccVerifiedDate: { type: Date },
    dccVerificationNotes: { type: String, default: "" },

    discrepancies: [DiscrepancySchema],
    discrepancyNotes: { type: String, default: "" },

    qaInspectionItems: [QAInspectionSchema],
    qaCommitteeName: { type: String, default: "" },
    qaInspectionDate: { type: Date },
    qaDecision: { type: String, default: "pending" },
    qaComplianceScore: { type: Number, default: 0 },
    qaNotes: { type: String, default: "" },

    isReinspection: { type: Boolean, default: false },
    reinspectionCount: { type: Number, default: 0 },
    reinspectionDecision: { type: String, default: "" },
    reinspectionDate: { type: Date },
    reinspectionNotes: { type: String, default: "" },

    equipmentRegistered: { type: Boolean, default: false },
    registeredAssetTags: [{ type: String }],

    acceptanceCertificateIssued: { type: Boolean, required: true, default: false },
    acceptanceCertDate: { type: Date },
    rejectionReason: { type: String, default: "" },

    installationRequired: { type: Boolean, default: false },
    installationStatus: { type: String, default: "not_required", enum: ["not_required", "pending", "scheduled", "complete"] },
    installationDate: { type: Date },
    trainingCompleted: { type: Boolean, default: false },
    trainingDate: { type: Date },

    warrantyStartDate: { type: Date },
    warrantyEndDate: { type: Date },
    warrantyMonths: { type: Number, default: 12 },

    paymentStatus: { type: String, default: "not_paid", enum: ["not_paid", "partial", "paid"] },

    grnNumber: { type: String, default: "" },
    grnDate: { type: Date },
    annexure6: { type: Schema.Types.Mixed },

    documentsUploaded: { type: Boolean, required: true, default: false },
    status: { type: String, required: true, default: "expected" },
  },
  { timestamps: true }
);

export const Delivery = model<IDelivery>("Delivery", DeliverySchema);
