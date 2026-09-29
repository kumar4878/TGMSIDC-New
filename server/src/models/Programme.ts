import { Schema, model, type Document, type Types } from "mongoose";

export interface IProgramme extends Document {
  code: string;
  name: string;
  fundingSourceId: Types.ObjectId;
  financialYear: string;
  budgetAllocation: number;
  budgetUtilized: number;
  validFrom: Date;
  validTo: Date;
  isActive: boolean;
}

const ProgrammeSchema = new Schema<IProgramme>(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    fundingSourceId: { type: Schema.Types.ObjectId, ref: "FundingSource", required: true },
    financialYear: { type: String, required: true },
    budgetAllocation: { type: Number, required: true, default: 0 },
    budgetUtilized: { type: Number, required: true, default: 0 },
    validFrom: { type: Date, required: true },
    validTo: { type: Date, required: true },
    isActive: { type: Boolean, required: true, default: true },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false } }
);

export const Programme = model<IProgramme>("Programme", ProgrammeSchema);
