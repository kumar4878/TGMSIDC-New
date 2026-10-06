import { Schema, model, type Document, type Types } from "mongoose";

const TenderStageSchema = new Schema({
  stageNumber: { type: Number, required: true },
  stageName: { type: String, required: true },
  status: { type: String, required: true, default: "pending", enum: ["pending", "in_progress", "completed", "skipped"] },
  startDate: { type: Date },
  completionDate: { type: Date },
  notes: { type: String },
  documents: [{ type: String }],
  /* Stage-specific data stored as flexible key-value */
  data: { type: Schema.Types.Mixed, default: {} },
});

export interface ITender extends Document {
  tenderNumber: string;
  indentId?: Types.ObjectId;
  equipmentId?: Types.ObjectId;
  equipmentName: string;
  equipmentCategory: string;
  tenderType: string;
  portal: string;
  financialYear: string;

  /* Tender lifecycle stages */
  stages: any[];
  currentStageNumber: number;

  /* Specification confirmation */
  specsStatus: string;
  specsConfirmationType: string;
  specsApproverNames: string;
  specsDocumentFilename: string;

  /* BFC details */
  bfcApprovalDate?: Date;
  bfcApprovalRef: string;
  bfcMembersPresent: string;

  /* L1/L2/L3 vendor details */
  l1VendorId?: Types.ObjectId;
  l1VendorName: string;
  l1BidAmount: number;
  l2VendorName: string;
  l2BidAmount: number;
  l3VendorName: string;
  l3BidAmount: number;

  /* Cancellation */
  isCancelled: boolean;
  cancellationStage: number;
  cancellationReason: string;
  cancellationDate?: Date;
  reTenderRef: string;
  rcRef?: string;

  /* Basic dates */
  tenderInvitedDate?: Date;
  bidSubmissionStartDate?: Date;
  bidSubmissionEndDate?: Date;
  bidsReceivedDate?: Date;

  status: string;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

const DEFAULT_STAGES = [
  { stageNumber: 1, stageName: "Tender Opened", status: "pending" },
  { stageNumber: 2, stageName: "Pre-bid Queries", status: "pending" },
  { stageNumber: 3, stageName: "Amendments", status: "pending" },
  { stageNumber: 4, stageName: "Bid Evaluation", status: "pending" },
  { stageNumber: 5, stageName: "Demo & Technical Evaluation", status: "pending" },
  { stageNumber: 6, stageName: "Technical Committee Approval", status: "pending" },
  { stageNumber: 7, stageName: "Financial Bid & BFC Prep", status: "pending" },
  { stageNumber: 8, stageName: "BFC Meeting", status: "pending" },
  { stageNumber: 9, stageName: "BFC Decision", status: "pending" },
  { stageNumber: 10, stageName: "RC Header Entry", status: "pending" },
];

const TenderSchema = new Schema<ITender>(
  {
    tenderNumber: { type: String, required: true, unique: true },
    indentId: { type: Schema.Types.ObjectId, ref: "Indent" },
    equipmentId: { type: Schema.Types.ObjectId, ref: "Equipment" },
    equipmentName: { type: String, default: "" },
    equipmentCategory: { type: String, default: "" },
    tenderType: { type: String, default: "open", enum: ["open", "limited", "gem"] },
    portal: { type: String, default: "e-procurement", enum: ["e-procurement", "gem"] },
    financialYear: { type: String, default: "2025-26" },

    stages: { type: [TenderStageSchema], default: () => DEFAULT_STAGES } as any,
    currentStageNumber: { type: Number, default: 0 },

    specsStatus: { type: String, default: "pending", enum: ["pending", "accepted", "changed", "new"] },
    specsConfirmationType: { type: String, default: "" },
    specsApproverNames: { type: String, default: "" },
    specsDocumentFilename: { type: String, default: "" },

    bfcApprovalDate: { type: Date },
    bfcApprovalRef: { type: String, default: "" },
    bfcMembersPresent: { type: String, default: "" },

    l1VendorId: { type: Schema.Types.ObjectId, ref: "Vendor" },
    l1VendorName: { type: String, default: "" },
    l1BidAmount: { type: Number, default: 0 },
    l2VendorName: { type: String, default: "" },
    l2BidAmount: { type: Number, default: 0 },
    l3VendorName: { type: String, default: "" },
    l3BidAmount: { type: Number, default: 0 },

    isCancelled: { type: Boolean, default: false },
    cancellationStage: { type: Number, default: 0 },
    cancellationReason: { type: String, default: "" },
    cancellationDate: { type: Date },
    reTenderRef: { type: String, default: "" },
    rcRef: { type: String, default: "" },

    tenderInvitedDate: { type: Date },
    bidSubmissionStartDate: { type: Date },
    bidSubmissionEndDate: { type: Date },
    bidsReceivedDate: { type: Date },

    status: { type: String, required: true, default: "draft" },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

export const Tender = model<ITender>("Tender", TenderSchema);
