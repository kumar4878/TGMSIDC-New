import { Schema, model, type Document } from "mongoose";

export interface IEquipment extends Document {
  equipmentCode: string;
  name: string;
  commonName?: string;
  category: string;
  department: string;
  facilityType: string;
  specifications: string;
  hsnCode: string;
  gstRate: number;
  estimatedUnitCost: number;
  standardised: boolean;
  technicalSpecs?: any;
  isActive: boolean;
  createdAt: Date;
}

const EquipmentSchema = new Schema<IEquipment>(
  {
    equipmentCode: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    commonName: { type: String },
    category: { type: String, required: true },
    department: { type: String, required: true, default: "General" },
    facilityType: { type: String, required: true, default: "All" },
    specifications: { type: String, required: true },
    hsnCode: { type: String, required: true, default: "9018" },
    gstRate: { type: Number, required: true, default: 12 },
    estimatedUnitCost: { type: Number, required: true, default: 0 },
    standardised: { type: Boolean, required: true, default: true },
    technicalSpecs: { type: Schema.Types.Mixed },
    isActive: { type: Boolean, required: true, default: true },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false } }
);

export const Equipment = model<IEquipment>("Equipment", EquipmentSchema);
