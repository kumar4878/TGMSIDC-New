import { Schema, model, type Document } from "mongoose";

export interface IAccountHead extends Document {
  code: string;
  name: string;
  description: string;
  budgetCode: string;
  isActive: boolean;
}

const AccountHeadSchema = new Schema<IAccountHead>(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    description: { type: String, default: "" },
    budgetCode: { type: String, required: true },
    isActive: { type: Boolean, required: true, default: true },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false } }
);

export const AccountHead = model<IAccountHead>("AccountHead", AccountHeadSchema);
