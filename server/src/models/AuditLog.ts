import { Schema, model, type Document } from "mongoose";

export interface IAuditLog extends Document {
  entityType: string;
  entityId: string;
  action: string;
  field?: string;
  beforeValue?: string;
  afterValue?: string;
  userId: string;
  userName: string;
  userRole: string;
  ipAddress?: string;
  timestamp: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    entityType: { type: String, required: true, index: true },
    entityId: { type: String, required: true, index: true },
    action: { type: String, required: true },
    field: { type: String },
    beforeValue: { type: String },
    afterValue: { type: String },
    userId: { type: String, required: true },
    userName: { type: String, required: true },
    userRole: { type: String, required: true },
    ipAddress: { type: String },
    timestamp: { type: Date, required: true, default: () => new Date() },
  },
  { timestamps: false }
);

AuditLogSchema.index({ entityType: 1, entityId: 1, timestamp: -1 });

export const AuditLog = model<IAuditLog>("AuditLog", AuditLogSchema);
