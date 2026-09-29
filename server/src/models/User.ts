import { Schema, model, type Document } from "mongoose";

export type UserRole =
  | "deo"
  | "tgmsidc_user"
  | "gm_equipment"
  | "so_equipment"
  | "executive_director"
  | "admin"
  | "vendor"
  | "consignee";

export interface IUser extends Document {
  username: string;
  password: string;
  fullName: string;
  role: UserRole;
  roleLabel: string;
  designation: string;
  department: string;
  facilityId?: Schema.Types.ObjectId;
  facilityName?: string;
  hodMapping?: string;
  email: string;
  phone: string;
  initials: string;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    fullName: { type: String, required: true },
    role: {
      type: String,
      required: true,
      enum: [
        "deo",
        "tgmsidc_user",
        "gm_equipment",
        "so_equipment",
        "executive_director",
        "admin",
        "vendor",
        "consignee",
      ],
    },
    roleLabel: { type: String, required: true },
    designation: { type: String, required: true },
    department: { type: String, required: true, default: "TGMSIDC" },
    facilityId: { type: Schema.Types.ObjectId, ref: "Institution" },
    facilityName: { type: String },
    hodMapping: { type: String },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    initials: { type: String, required: true },
    isActive: { type: Boolean, required: true, default: true },
    lastLoginAt: { type: Date },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false } }
);

export const User = model<IUser>("User", UserSchema);
