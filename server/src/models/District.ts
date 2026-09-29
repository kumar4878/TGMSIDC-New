import { Schema, model, type Document } from "mongoose";

export interface IDistrict extends Document {
  code: string;
  name: string;
  state: string;
  region: string;
  isActive: boolean;
}

const DistrictSchema = new Schema<IDistrict>(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    state: { type: String, required: true, default: "Telangana" },
    region: { type: String, required: true },
    isActive: { type: Boolean, required: true, default: true },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false } }
);

export const District = model<IDistrict>("District", DistrictSchema);
