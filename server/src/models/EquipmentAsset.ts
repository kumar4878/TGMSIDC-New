import { Schema, model, type Document, type Types } from "mongoose";

export type AssetOperationalStatus =
  | "active"
  | "inactive"
  | "under_maintenance"
  | "under_repair"
  | "breakdown"
  | "transferred"
  | "decommissioned"
  | "disposed";

export type WarrantyStatus = "active" | "expiring_soon" | "expired";
export type CamcStatus = "active" | "expiring_soon" | "expired" | "not_applicable";

export interface IAssetLifecycleEvent {
  event: string; // e.g., "PO Issued", "Delivered", "GRN Confirmed", "QA Accepted", "Installed", "Commissioned", "Active", "Maintenance", "Transferred"
  timestamp: Date;
  user: string;
  role: string;
  remarks?: string;
  documentRef?: string;
}

export interface IEquipmentAsset extends Omit<Document, "model"> {
  assetTag: string; // AST-2026-00001
  serialNumber: string;
  equipmentId: Types.ObjectId;
  equipmentName: string;
  category: string;
  department: string;
  make: string;
  model: string;

  /* Operational Status */
  status: AssetOperationalStatus;

  /* Location / Administrative Unit */
  institutionId: Types.ObjectId;
  institutionName: string;
  district: string;
  hodDirectorate: string; // DME | DH | TVVP | Ayush | TGMSIDC
  currentLocation: string; // e.g. "Radiology Dept - Room 102"
  previousLocations?: Array<{
    institutionName: string;
    district: string;
    transferredDate: Date;
    reason: string;
    transferDocRef?: string;
  }>;

  /* Procurement Linkage */
  vendorId: Types.ObjectId;
  vendorName: string;
  rateContractId?: Types.ObjectId;
  rcNumber?: string;
  tenderRef?: string;
  purchaseOrderId: Types.ObjectId;
  poNumber: string;
  poDate?: Date;
  orderedQuantity?: number;
  procurementValue?: number; // per unit cost in INR
  financialYear?: string; // e.g. "2026-27"
  indentId?: Types.ObjectId;
  indentNumber?: string;

  /* Delivery & GRN */
  deliveryId?: Types.ObjectId;
  deliveryTrackingId?: string;
  deliveryDate?: Date;
  grnId?: string;
  grnNumber: string;
  grnDate?: Date;

  /* QA Details */
  qaStatus: "accepted" | "conditional" | "rejected";
  qaDate?: Date;
  qaCertificateUrl?: string;
  qaObservations?: string;

  /* Installation & Commissioning */
  installationDate?: Date;
  commissioningDate?: Date;
  trainingCompleted: boolean;
  trainingDate?: Date;

  /* Warranty */
  warrantyStartDate?: Date;
  warrantyEndDate?: Date;
  warrantyMonths?: number;
  warrantyStatus: WarrantyStatus;

  /* AMC / CAMC */
  camcApplicable: boolean;
  camcVendor?: string;
  camcStartDate?: Date;
  camcEndDate?: Date;
  camcStatus: CamcStatus;

  /* Administration & History */
  registeredBy: string;
  registeredDate: Date;
  lastUpdatedDate: Date;
  remarks?: string;
  lifecycleHistory: IAssetLifecycleEvent[];

  createdAt: Date;
  updatedAt: Date;
}

const EquipmentAssetSchema = new Schema<IEquipmentAsset>(
  {
    assetTag: { type: String, required: true, unique: true, index: true },
    serialNumber: { type: String, required: true, index: true },
    equipmentId: { type: Schema.Types.Mixed, ref: "Equipment", required: true },
    equipmentName: { type: String, required: true, index: true },
    category: { type: String, default: "Medical Equipment", index: true },
    department: { type: String, default: "General", index: true },
    make: { type: String, default: "", index: true },
    model: { type: String, default: "" },

    status: {
      type: String,
      required: true,
      default: "active",
      enum: [
        "active",
        "inactive",
        "under_maintenance",
        "under_repair",
        "breakdown",
        "transferred",
        "decommissioned",
        "disposed",
      ],
      index: true,
    },

    institutionId: { type: Schema.Types.Mixed, ref: "Institution", required: true, index: true },
    institutionName: { type: String, required: true, index: true },
    district: { type: String, default: "", index: true },
    hodDirectorate: { type: String, default: "DME", index: true },
    currentLocation: { type: String, default: "" },
    previousLocations: [
      {
        institutionName: { type: String },
        district: { type: String },
        transferredDate: { type: Date },
        reason: { type: String },
        transferDocRef: { type: String },
      },
    ],

    vendorId: { type: Schema.Types.Mixed, ref: "Vendor", required: true, index: true },
    vendorName: { type: String, required: true, index: true },
    rateContractId: { type: Schema.Types.Mixed, ref: "RateContract" },
    rcNumber: { type: String, default: "", index: true },
    tenderRef: { type: String, default: "" },
    purchaseOrderId: { type: Schema.Types.Mixed, ref: "PurchaseOrder", required: true, index: true },
    poNumber: { type: String, required: true, index: true },
    poDate: { type: Date },
    orderedQuantity: { type: Number, default: 1 },
    procurementValue: { type: Number, default: 0 },
    financialYear: { type: String, default: "2026-27", index: true },
    indentId: { type: Schema.Types.Mixed, ref: "Indent" },
    indentNumber: { type: String, default: "" },

    deliveryId: { type: Schema.Types.Mixed, ref: "Delivery" },
    deliveryTrackingId: { type: String, default: "" },
    deliveryDate: { type: Date },
    grnId: { type: String, default: "" },
    grnNumber: { type: String, default: "", index: true },
    grnDate: { type: Date },

    qaStatus: {
      type: String,
      default: "accepted",
      enum: ["accepted", "conditional", "rejected"],
      index: true,
    },
    qaDate: { type: Date },
    qaCertificateUrl: { type: String, default: "" },
    qaObservations: { type: String, default: "" },

    installationDate: { type: Date },
    commissioningDate: { type: Date },
    trainingCompleted: { type: Boolean, default: true },
    trainingDate: { type: Date },

    warrantyStartDate: { type: Date },
    warrantyEndDate: { type: Date },
    warrantyMonths: { type: Number, default: 36 },
    warrantyStatus: {
      type: String,
      default: "active",
      enum: ["active", "expiring_soon", "expired"],
      index: true,
    },

    camcApplicable: { type: Boolean, default: false },
    camcVendor: { type: String, default: "" },
    camcStartDate: { type: Date },
    camcEndDate: { type: Date },
    camcStatus: {
      type: String,
      default: "not_applicable",
      enum: ["active", "expiring_soon", "expired", "not_applicable"],
      index: true,
    },

    registeredBy: { type: String, default: "TGMSIDC Asset Administrator" },
    registeredDate: { type: Date, default: () => new Date() },
    lastUpdatedDate: { type: Date, default: () => new Date() },
    remarks: { type: String, default: "" },

    lifecycleHistory: [
      {
        event: { type: String, required: true },
        timestamp: { type: Date, default: () => new Date() },
        user: { type: String, default: "System" },
        role: { type: String, default: "admin" },
        remarks: { type: String, default: "" },
        documentRef: { type: String, default: "" },
      },
    ],
  },
  { timestamps: true }
);

export const EquipmentAsset = model<IEquipmentAsset>("EquipmentAsset", EquipmentAssetSchema);
