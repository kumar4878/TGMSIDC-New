import { Router } from "express";
import { Notification } from "../models/Notification.js";

const router = Router();

router.get("/notifications", async (req, res): Promise<void> => {
  const filter: Record<string, any> = {};
  if (req.query.userId) filter.userId = req.query.userId;
  const list = await Notification.find(filter).sort({ createdAt: -1 }).limit(50);
  res.json(list.map(n => ({
    id: n._id.toString(),
    type: n.type,
    title: n.title,
    message: n.message,
    userId: n.userId,
    entityType: n.entityType,
    entityId: n.entityId,
    priority: n.priority,
    isRead: n.isRead,
    createdAt: n.createdAt?.toISOString() ?? new Date().toISOString(),
  })));
});

router.patch("/notifications/:id/read", async (req, res): Promise<void> => {
  const notif = await Notification.findByIdAndUpdate(
    req.params.id,
    { isRead: true, readAt: new Date() },
    { new: true }
  );
  if (!notif) { res.status(404).json({ error: "Notification not found" }); return; }
  res.json(notif);
});

router.post("/notifications/mark-all-read", async (req, res): Promise<void> => {
  const filter: Record<string, any> = {};
  if (req.body.userId) filter.userId = req.body.userId;
  await Notification.updateMany(filter, { isRead: true, readAt: new Date() });
  res.json({ success: true });
});

export default router;
