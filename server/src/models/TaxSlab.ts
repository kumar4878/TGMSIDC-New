import { Schema, model, type Document } from "mongoose";

export interface ITaxSlab extends Document {
  hsnCode: string;
  description: string;
  gstPercent: number;
  igstPercent: number;
  cgstPercent: number;
  sgstPercent: number;
  effectiveFrom: Date;
  isActive: boolean;
}

const TaxSlabSchema = new Schema<ITaxSlab>(
  {
    hsnCode: { type: String, required: true },
    description: { type: String, required: true },
    gstPercent: { type: Number, required: true },
    igstPercent: { type: Number, required: true },
    cgstPercent: { type: Number, required: true },
    sgstPercent: { type: Number, required: true },
    effectiveFrom: { type: Date, required: true },
    isActive: { type: Boolean, required: true, default: true },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false } }
);

export const TaxSlab = model<ITaxSlab>("TaxSlab", TaxSlabSchema);
