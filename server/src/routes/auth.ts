import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import { Vendor } from "../models/Vendor.js";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "tgmsidc-secret-key-2025";

async function resolveVendorForUser(user: any) {
  let v = null;
  if (user.vendorId) {
    v = await Vendor.findById(user.vendorId).catch(() => null);
  }
  if (!v && user.facilityName) {
    v = await Vendor.findOne({ name: new RegExp(user.facilityName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), "i") }).catch(() => null);
  }
  if (!v && user.username) {
    if (user.username.toLowerCase().includes("bpl") || user.username.toLowerCase() === "vendor") {
      v = await Vendor.findOne({ $or: [{ vendorCode: "VND-0001" }, { name: /BPL/i }] }).catch(() => null);
    } else if (user.username.toLowerCase().includes("philips")) {
      v = await Vendor.findOne({ $or: [{ vendorCode: "VND-0002" }, { name: /Philips/i }] }).catch(() => null);
    } else if (user.username.toLowerCase().includes("mindray")) {
      v = await Vendor.findOne({ $or: [{ vendorCode: "VND-0003" }, { name: /Mindray/i }] }).catch(() => null);
    }
  }
  return v;
}

async function formatUserResponse(user: any) {
  let vendorId = user.vendorId?.toString() ?? null;
  let vendorCode = user.vendorCode ?? null;
  let vendorName = user.vendorName ?? null;

  if (user.role === "vendor" && (!vendorId || !vendorCode || !vendorName)) {
    const v = await resolveVendorForUser(user);
    if (v) {
      vendorId = v._id.toString();
      vendorCode = v.vendorCode;
      vendorName = v.name;
      user.vendorId = v._id;
      user.vendorCode = v.vendorCode;
      user.vendorName = v.name;
      await user.save().catch(() => {});
    }
  }

  return {
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
    vendorId,
    vendorCode,
    vendorName,
    email: user.email,
    phone: user.phone,
    initials: user.initials,
  };
}

router.post("/auth/login", async (req, res): Promise<void> => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ error: "Username and password are required" });
    return;
  }

  const cleanUser = String(username).trim();
  let user = await User.findOne({ username: { $regex: new RegExp(`^${cleanUser}$`, "i") }, isActive: true });
  if (!user && (cleanUser.toLowerCase() === "vendor" || cleanUser.toLowerCase() === "bpl")) {
    user = await User.findOne({ username: "vendor_bpl", isActive: true });
  }

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
    user: await formatUserResponse(user),
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
    res.json(await formatUserResponse(user));
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
});

export const SYSTEM_ROLES = [
  {
    role: "admin",
    roleLabel: "System Administrator / TGMSIDC Admin",
    description: "Statewide asset visibility, user and role administration, system configuration, and full procurement oversight.",
    department: "IT & Systems Cell",
    hierarchyLevel: 1,
    permissions: ["all", "users.manage", "reports.view", "assets.manage", "indents.manage", "pos.manage", "tenders.manage", "rc.manage"],
  },
  {
    role: "managing_director",
    roleLabel: "Managing Director (MD)",
    description: "Highest executive oversight, statewide KPI dashboard access, policy-level escalations, and statutory audit monitoring.",
    department: "Executive Directorate",
    hierarchyLevel: 2,
    permissions: ["reports.view", "dashboard.view", "approvals.escalated", "kpi.view", "audit.view"],
  },
  {
    role: "executive_director",
    roleLabel: "Executive Director (ED)",
    description: "High-value indent approvals (> ₹2 Cr), PO sanctioning, tender award approvals, and statewide financial oversight.",
    department: "Executive Directorate",
    hierarchyLevel: 3,
    permissions: ["indent.approve", "po.approve", "tender.award", "reports.view", "budget.view"],
  },
  {
    role: "gm_equipment",
    roleLabel: "General Manager (Equipment)",
    description: "Indent technical review and approval (up to ₹2 Cr), Rate Contract supervision, tender initiation, and vendor performance.",
    department: "Equipment Wing",
    hierarchyLevel: 4,
    permissions: ["indent.approve", "rc.manage", "tender.manage", "vendor.manage", "reports.view"],
  },
  {
    role: "so_equipment",
    roleLabel: "Section Officer (Equipment)",
    description: "Scrutiny of hospital indents, Rate Contract matching, PO drafting, and equipment specifications verification.",
    department: "Equipment Wing",
    hierarchyLevel: 5,
    permissions: ["indent.scrutiny", "rc.link", "po.draft", "reports.view"],
  },
  {
    role: "tgmsidc_user",
    roleLabel: "TGMSIDC User / Biomedical Engineer",
    description: "Biomedical equipment verification, technical tender evaluation, inspection oversight, and statewide asset cataloging.",
    department: "Technical Wing",
    hierarchyLevel: 6,
    permissions: ["equipment.manage", "inspection.view", "reports.view", "assets.view"],
  },
  {
    role: "consignee",
    roleLabel: "Hospital Consignee / Store In-Charge",
    description: "Hospital-level delivery receipt, inspection committee coordination, GRN confirmation, installation certification, and hospital asset inventory.",
    department: "Hospital Procurement Cell",
    hierarchyLevel: 7,
    permissions: ["grn.create", "delivery.receive", "installation.certify", "hospital_assets.view"],
  },
  {
    role: "deo",
    roleLabel: "Data Entry Operator (DEO)",
    description: "Hospital indent digitization, local requisition draft preparation, and preliminary document upload.",
    department: "Hospital Procurement Cell",
    hierarchyLevel: 8,
    permissions: ["indent.create", "indent.draft", "hospital_assets.view"],
  },
  {
    role: "vendor",
    roleLabel: "Empanelled Vendor / Supplier",
    description: "Purchase Order acknowledgement, consignment dispatch, delivery tracking, Annexure-6 submission, and warranty/CAMC logs.",
    department: "Supplier Organization",
    hierarchyLevel: 9,
    permissions: ["po.acknowledge", "dispatch.submit", "delivery.cert_upload"],
  },
];

router.get("/auth/roles", async (_req, res): Promise<void> => {
  const userCounts = await User.aggregate([
    { $match: { isActive: true } },
    { $group: { _id: "$role", count: { $sum: 1 } } },
  ]);
  const countMap = new Map(userCounts.map((c) => [c._id, c.count]));

  const rolesWithCounts = SYSTEM_ROLES.map((r) => ({
    ...r,
    userCount: countMap.get(r.role) || 0,
  }));

  res.json(rolesWithCounts);
});

router.get("/auth/users", async (req, res): Promise<void> => {
  const query: Record<string, any> = {};
  if (req.query.role) query.role = req.query.role;
  if (req.query.department) query.department = req.query.department;
  if (req.query.facilityId) query.facilityId = req.query.facilityId;
  if (req.query.includeInactive !== "true") query.isActive = true;

  if (req.query.search) {
    const s = String(req.query.search).trim();
    query.$or = [
      { username: { $regex: s, $options: "i" } },
      { fullName: { $regex: s, $options: "i" } },
      { designation: { $regex: s, $options: "i" } },
      { facilityName: { $regex: s, $options: "i" } },
      { email: { $regex: s, $options: "i" } },
    ];
  }

  const users = await User.find(query).select("-password").sort({ role: 1, fullName: 1 });
  res.json(
    users.map((u) => ({
      id: u._id.toString(),
      username: u.username,
      fullName: u.fullName,
      role: u.role,
      roleLabel: u.roleLabel,
      designation: u.designation,
      department: u.department,
      facilityId: u.facilityId?.toString() ?? null,
      facilityName: u.facilityName ?? null,
      hodMapping: u.hodMapping ?? null,
      vendorId: u.vendorId?.toString() ?? null,
      vendorCode: u.vendorCode ?? null,
      vendorName: u.vendorName ?? null,
      email: u.email,
      phone: u.phone,
      initials: u.initials,
      isActive: u.isActive,
      lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : null,
      createdAt: u.createdAt ? u.createdAt.toISOString() : null,
    }))
  );
});

router.post("/auth/users", async (req, res): Promise<void> => {
  const { username, password, fullName, role, designation, department, email, phone, facilityId, facilityName, hodMapping, vendorId, vendorName } = req.body;

  if (!username || !password || !fullName || !role || !designation || !email || !phone) {
    res.status(400).json({ error: "Missing required fields (username, password, fullName, role, designation, email, phone)." });
    return;
  }

  const existing = await User.findOne({ username: String(username).trim().toLowerCase() });
  if (existing) {
    res.status(409).json({ error: "Username already exists." });
    return;
  }

  const roleMeta = SYSTEM_ROLES.find((r) => r.role === role);
  const initials = fullName
    .split(" ")
    .map((p: string) => p[0])
    .filter(Boolean)
    .slice(0, 3)
    .join("")
    .toUpperCase() || "USR";

  const newUser = await User.create({
    username: String(username).trim().toLowerCase(),
    password: bcrypt.hashSync(password, 10),
    fullName: String(fullName).trim(),
    role,
    roleLabel: roleMeta?.roleLabel || role,
    designation: String(designation).trim(),
    department: department ? String(department).trim() : (roleMeta?.department || "TGMSIDC"),
    email: String(email).trim().toLowerCase(),
    phone: String(phone).trim(),
    facilityId: facilityId || undefined,
    facilityName: facilityName || undefined,
    hodMapping: hodMapping || undefined,
    vendorId: vendorId || undefined,
    vendorName: vendorName || undefined,
    initials,
    isActive: true,
  });

  res.status(201).json(await formatUserResponse(newUser));
});

router.patch("/auth/users/:id", async (req, res): Promise<void> => {
  const { id } = req.params;
  const user = await User.findById(id);
  if (!user) {
    res.status(404).json({ error: "User not found." });
    return;
  }

  if (req.body.fullName) user.fullName = String(req.body.fullName).trim();
  if (req.body.designation) user.designation = String(req.body.designation).trim();
  if (req.body.department) user.department = String(req.body.department).trim();
  if (req.body.email) user.email = String(req.body.email).trim().toLowerCase();
  if (req.body.phone) user.phone = String(req.body.phone).trim();
  if (req.body.facilityId !== undefined) user.facilityId = req.body.facilityId || undefined;
  if (req.body.facilityName !== undefined) user.facilityName = req.body.facilityName || undefined;
  if (req.body.hodMapping !== undefined) user.hodMapping = req.body.hodMapping || undefined;
  if (req.body.vendorId !== undefined) user.vendorId = req.body.vendorId || undefined;
  if (req.body.vendorName !== undefined) user.vendorName = req.body.vendorName || undefined;
  if (typeof req.body.isActive === "boolean") user.isActive = req.body.isActive;

  if (req.body.role) {
    user.role = req.body.role;
    const roleMeta = SYSTEM_ROLES.find((r) => r.role === req.body.role);
    if (roleMeta) user.roleLabel = roleMeta.roleLabel;
  }

  if (req.body.password) {
    user.password = bcrypt.hashSync(req.body.password, 10);
  }

  await user.save();
  res.json(await formatUserResponse(user));
});

router.delete("/auth/users/:id", async (req, res): Promise<void> => {
  const { id } = req.params;
  const user = await User.findById(id);
  if (!user) {
    res.status(404).json({ error: "User not found." });
    return;
  }
  user.isActive = false;
  await user.save();
  res.json({ message: "User account deactivated successfully", id });
});

export default router;

