import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../models/User.js";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "tgmsidc-secret-key-2025";

router.post("/auth/login", async (req, res): Promise<void> => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ error: "Username and password are required" });
    return;
  }

  const user = await User.findOne({ username, isActive: true });
  if (!user) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  user.lastLoginAt = new Date();
  await user.save();

  const token = jwt.sign(
    { id: user._id.toString(), username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: "8h" }
  );

  res.json({
    token,
    user: {
      id: user._id.toString(),
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      roleLabel: user.roleLabel,
      designation: user.designation,
      department: user.department,
      facilityId: user.facilityId?.toString() ?? null,
      facilityName: user.facilityName ?? null,
      hodMapping: user.hodMapping ?? null,
      email: user.email,
      phone: user.phone,
      initials: user.initials,
    },
  });
});

router.get("/auth/me", async (req, res): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "No token provided" });
    return;
  }

  try {
    const decoded = jwt.verify(authHeader.split(" ")[1], JWT_SECRET) as any;
    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) {
      res.status(401).json({ error: "User not found or inactive" });
      return;
    }
    res.json({
      id: user._id.toString(),
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      roleLabel: user.roleLabel,
      designation: user.designation,
      department: user.department,
      facilityId: user.facilityId?.toString() ?? null,
      facilityName: user.facilityName ?? null,
      hodMapping: user.hodMapping ?? null,
      email: user.email,
      phone: user.phone,
      initials: user.initials,
    });
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
});

router.get("/auth/users", async (_req, res): Promise<void> => {
  const users = await User.find({ isActive: true }).select("-password").sort({ role: 1, fullName: 1 });
  res.json(
    users.map((u) => ({
      id: u._id.toString(),
      username: u.username,
      fullName: u.fullName,
      role: u.role,
      roleLabel: u.roleLabel,
      designation: u.designation,
      department: u.department,
      facilityName: u.facilityName ?? null,
      initials: u.initials,
    }))
  );
});

export default router;
