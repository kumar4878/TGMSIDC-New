import { Schema, model, type Document } from "mongoose";

export interface IVendor extends Document {
  vendorCode: string;
  name: string;
  contactEmail: string;
  contactPhone: string;
  contactPerson: string;
  address: string;
  gstNumber: string;
  panNumber: string;
  bankName: string;
  bankBranch: string;
  bankIfsc: string;
  bankAccountNo: string;
  vendorTier: "L1" | "L2" | "L3" | "";
  performanceScore: number;
  onTimeDeliveryRate: number;
  qaPassRate: number;
  complianceScore: number;
  totalPOs: number;
  totalDeliveries: number;
  status: string;
  isActive: boolean;
  createdAt: Date;
}

const VendorSchema = new Schema<IVendor>(
  {
    vendorCode: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    contactEmail: { type: String, required: true },
    contactPhone: { type: String, required: true },
    contactPerson: { type: String, required: true, default: "—" },
    address: { type: String, required: true },
    gstNumber: { type: String, required: true },
    panNumber: { type: String, required: true, default: "" },
    bankName: { type: String, required: true, default: "" },
    bankBranch: { type: String, required: true, default: "" },
    bankIfsc: { type: String, required: true, default: "" },
    bankAccountNo: { type: String, required: true, default: "" },
    vendorTier: { type: String, default: "" },
    performanceScore: { type: Number, default: 0 },
    onTimeDeliveryRate: { type: Number, default: 0 },
    qaPassRate: { type: Number, default: 0 },
    complianceScore: { type: Number, default: 0 },
    totalPOs: { type: Number, default: 0 },
    totalDeliveries: { type: Number, default: 0 },
    status: { type: String, required: true, default: "active" },
    isActive: { type: Boolean, required: true, default: true },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false } }
);

export const Vendor = model<IVendor>("Vendor", VendorSchema);
