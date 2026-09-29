import { Schema, model, type Document } from "mongoose";

export interface INotification extends Document {
  type: string;
  title: string;
  message: string;
  userId: string;
  entityType?: string;
  entityId?: string;
  priority: "low" | "normal" | "high" | "urgent";
  isRead: boolean;
  readAt?: Date;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    type: { type: String, required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    userId: { type: String, required: true, index: true },
    entityType: { type: String },
    entityId: { type: String },
    priority: { type: String, required: true, default: "normal", enum: ["low", "normal", "high", "urgent"] },
    isRead: { type: Boolean, required: true, default: false },
    readAt: { type: Date },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false } }
);

NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

export const Notification = model<INotification>("Notification", NotificationSchema);
