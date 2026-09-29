import { Schema, model, type Document } from "mongoose";

export interface IInstitution extends Document {
  institutionCode: string;
  dmeInstitutionId?: string;
  name: string;
  type: string;
  facilityType: string;
  district: string;
  address: string;
  superintendentName?: string;
  contactPerson: string;
  contactPhone: string;
  contactEmail?: string;
  hodName?: string;
  isActive: boolean;
  createdAt: Date;
}

const InstitutionSchema = new Schema<IInstitution>(
  {
    institutionCode: { type: String, required: true, unique: true },
    dmeInstitutionId: { type: String, index: true },
    name: { type: String, required: true },
    type: { type: String, required: true, default: "DME" },
    facilityType: {
      type: String,
      required: true,
      default: "Hospital",
    },
    district: { type: String, required: true },
    address: { type: String, required: true },
    superintendentName: { type: String },
    contactPerson: { type: String, required: true, default: "—" },
    contactPhone: { type: String, required: true, default: "—" },
    contactEmail: { type: String },
    hodName: { type: String, default: "Director of Medical Education" },
    isActive: { type: Boolean, required: true, default: true },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false } }
);

export const Institution = model<IInstitution>("Institution", InstitutionSchema);
