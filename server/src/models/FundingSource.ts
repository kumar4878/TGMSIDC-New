import { Schema, model, type Document } from "mongoose";

export interface IFundingSource extends Document {
  code: string;
  name: string;
  type: "state" | "central" | "externally_aided";
  description: string;
  isActive: boolean;
}

const FundingSourceSchema = new Schema<IFundingSource>(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    type: { type: String, required: true, enum: ["state", "central", "externally_aided"] },
    description: { type: String, default: "" },
    isActive: { type: Boolean, required: true, default: true },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false } }
);

export const FundingSource = model<IFundingSource>("FundingSource", FundingSourceSchema);
