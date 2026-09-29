import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { User } from "../models/User.js";
import { Institution } from "../models/Institution.js";
import { Vendor } from "../models/Vendor.js";
import { Equipment } from "../models/Equipment.js";
import { RateContract } from "../models/RateContract.js";
import { Indent } from "../models/Indent.js";
import { Tender } from "../models/Tender.js";
import { PurchaseOrder } from "../models/PurchaseOrder.js";
import { Delivery } from "../models/Delivery.js";
import { District } from "../models/District.js";
import { FundingSource } from "../models/FundingSource.js";
import { Programme } from "../models/Programme.js";
import { AccountHead } from "../models/AccountHead.js";
import { TaxSlab } from "../models/TaxSlab.js";
import { Notification } from "../models/Notification.js";

const hash = (p: string) => bcrypt.hashSync(p, 10);
const d = (s: string) => new Date(s);
const ago = (days: number) => new Date(Date.now() - days * 86400000);
const future = (days: number) => new Date(Date.now() + days * 86400000);

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI environment variable is required.");
  await mongoose.connect(uri);
  console.log("✔ Connected to MongoDB");

  // Drop all collections for a clean seed
  const collections = await mongoose.connection.db!.listCollections().toArray();
  for (const c of collections) {
    await mongoose.connection.db!.dropCollection(c.name);
  }
  console.log("✔ Cleared existing data\n🌱 Seeding database...\n");

  /* ════════════════════════════════════════════════════════════════════════
   * USERS
   * ════════════════════════════════════════════════════════════════════════ */
  const users = await User.insertMany([
    { username: "deo_user", password: hash("password123"), fullName: "DEO User", role: "deo", roleLabel: "Data Entry Operator", designation: "Data Entry Operator", department: "Hospital Procurement Cell", email: "deo@tgmsidc.gov.in", phone: "9876543210", initials: "DEO", isActive: true },
    { username: "deo_gandhi", password: hash("password123"), fullName: "DEO User", role: "deo", roleLabel: "Data Entry Operator", designation: "Data Entry Operator", department: "Hospital Procurement Cell", email: "deo@tgmsidc.gov.in", phone: "9876543210", initials: "DEO", isActive: true },
    { username: "deo_osmania", password: hash("password123"), fullName: "DEO User", role: "deo", roleLabel: "Data Entry Operator", designation: "Data Entry Operator", department: "Hospital Procurement Cell", email: "deo@tgmsidc.gov.in", phone: "9876543211", initials: "DEO", isActive: true },
    { username: "tgmsidc_user1", password: hash("password123"), fullName: "K. Srinivas", role: "tgmsidc_user", roleLabel: "TGMSIDC User", designation: "Sr. Biomedical Engineer, Equipment Wing", department: "TGMSIDC", email: "k.srinivas@tgmsidc.gov.in", phone: "9876543212", initials: "KS", isActive: true },
    { username: "gm_equip", password: hash("password123"), fullName: "P. Narayan", role: "gm_equipment", roleLabel: "GM Equipment", designation: "General Manager (Equipment)", department: "TGMSIDC", email: "gm.equip@tgmsidc.gov.in", phone: "9876543213", initials: "PN", isActive: true },
    { username: "so_equip", password: hash("password123"), fullName: "R. Sharma", role: "so_equipment", roleLabel: "SO Equipment", designation: "Section Officer (Equipment)", department: "TGMSIDC", email: "so.equip@tgmsidc.gov.in", phone: "9876543214", initials: "RS", isActive: true },
    { username: "ed_tgmsidc", password: hash("password123"), fullName: "D. Venkatesh", role: "executive_director", roleLabel: "Executive Director", designation: "Executive Director, TGMSIDC", department: "TGMSIDC", email: "ed@tgmsidc.gov.in", phone: "9876543215", initials: "DV", isActive: true },
    { username: "admin", password: hash("password123"), fullName: "System Administrator", role: "admin", roleLabel: "Administrator", designation: "System Administrator", department: "IT", email: "admin@tgmsidc.gov.in", phone: "9876543216", initials: "SA", isActive: true },
    { username: "vendor_bpl", password: hash("password123"), fullName: "Rajesh Kumar", role: "vendor", roleLabel: "Vendor", designation: "Regional Manager, BPL Medical", department: "BPL Medical Technologies", facilityName: "BPL Medical Technologies Pvt Ltd", email: "rajesh@bplmed.com", phone: "9876543217", initials: "RK", isActive: true },
    { username: "vendor_philips", password: hash("password123"), fullName: "Anand Menon", role: "vendor", roleLabel: "Vendor", designation: "Sr. Manager, Philips Healthcare", department: "Philips India", facilityName: "Philips India Ltd", email: "anand.menon@philips.com", phone: "9876543218", initials: "AM", isActive: true },
    { username: "consignee_gandhi", password: hash("password123"), fullName: "T. Ramaiah", role: "consignee", roleLabel: "Consignee", designation: "Store Keeper, Gandhi Hospital", department: "Gandhi Hospital", facilityName: "Gandhi Hospital, Secunderabad", email: "stores.gandhi@tgmsidc.gov.in", phone: "9876543219", initials: "TR", isActive: true },
  ]);
  console.log(`  → ${users.length} users`);

  /* ════════════════════════════════════════════════════════════════════════
   * DISTRICTS
   * ════════════════════════════════════════════════════════════════════════ */
  const districts = await District.insertMany([
    { code: "HYD", name: "Hyderabad", state: "Telangana", region: "Central" },
    { code: "RNG", name: "Rangareddy", state: "Telangana", region: "Central" },
    { code: "MBN", name: "Medchal–Malkajgiri", state: "Telangana", region: "Central" },
    { code: "WGL", name: "Warangal", state: "Telangana", region: "North" },
    { code: "KRM", name: "Karimnagar", state: "Telangana", region: "North" },
    { code: "NZB", name: "Nizamabad", state: "Telangana", region: "North" },
    { code: "KHM", name: "Khammam", state: "Telangana", region: "South" },
    { code: "NLG", name: "Nalgonda", state: "Telangana", region: "South" },
    { code: "MHB", name: "Mahabubnagar", state: "Telangana", region: "South" },
    { code: "ADB", name: "Adilabad", state: "Telangana", region: "North" },
    { code: "SDD", name: "Siddipet", state: "Telangana", region: "Central" },
    { code: "MED", name: "Medak", state: "Telangana", region: "Central" },
    { code: "NPT", name: "Narayanpet", state: "Telangana", region: "South" },
    { code: "NGK", name: "Nagarkurnool", state: "Telangana", region: "South" },
    { code: "VKB", name: "Vikarabad", state: "Telangana", region: "Central" },
    { code: "HNK", name: "Hanumakonda", state: "Telangana", region: "North" },
    { code: "SRP", name: "Suryapet", state: "Telangana", region: "South" },
    { code: "SRD", name: "Sangareddy", state: "Telangana", region: "Central" },
  ]);
  console.log(`  → ${districts.length} districts`);

  /* ════════════════════════════════════════════════════════════════════════
   * FUNDING SOURCES, PROGRAMMES, ACCOUNT HEADS
   * ════════════════════════════════════════════════════════════════════════ */
  const fs1 = await FundingSource.create({ code: "SB", name: "State Budget", type: "state", description: "Telangana State Budget Allocation" });
  const fs2 = await FundingSource.create({ code: "NHM", name: "National Health Mission", type: "central", description: "NHM Funds from Government of India" });
  const fs3 = await FundingSource.create({ code: "WB", name: "World Bank — TSHSP", type: "externally_aided", description: "World Bank aided Telangana State Health Systems Project" });
  console.log("  → 3 funding sources");

  await Programme.insertMany([
    { code: "PME-2526", name: "Procurement of Medical Equipment 2025-26", fundingSourceId: fs1._id, financialYear: "2025-26", budgetAllocation: 250000000, budgetUtilized: 48500000, validFrom: d("2025-04-01"), validTo: d("2026-03-31") },
    { code: "NHM-MED-2526", name: "NHM Medical Equipment Strengthening", fundingSourceId: fs2._id, financialYear: "2025-26", budgetAllocation: 180000000, budgetUtilized: 32000000, validFrom: d("2025-04-01"), validTo: d("2026-03-31") },
    { code: "TSHSP-EQ", name: "TSHSP Equipment Modernisation", fundingSourceId: fs3._id, financialYear: "2025-26", budgetAllocation: 120000000, budgetUtilized: 15600000, validFrom: d("2025-04-01"), validTo: d("2027-03-31") },
  ]);
  console.log("  → 3 programmes");

  await AccountHead.insertMany([
    { code: "4210-01-110", name: "Capital Outlay on Medical & Public Health — Equipment", description: "Major head for medical equipment procurement", budgetCode: "4210-01-110-27" },
    { code: "2210-06-001", name: "Revenue — Medical Education — Equipment Maintenance", description: "Revenue head for AMC/CAMC payments", budgetCode: "2210-06-001-12" },
    { code: "4210-01-789", name: "Special Component Plan — Equipment", description: "SCP funds for equipment in tribal/SC areas", budgetCode: "4210-01-789-04" },
  ]);
  console.log("  → 3 account heads");

  await TaxSlab.insertMany([
    { hsnCode: "9018", description: "Medical/Surgical Instruments & Apparatus", gstPercent: 12, igstPercent: 12, cgstPercent: 6, sgstPercent: 6, effectiveFrom: d("2023-01-01") },
    { hsnCode: "9022", description: "X-ray / CT / MRI Equipment", gstPercent: 18, igstPercent: 18, cgstPercent: 9, sgstPercent: 9, effectiveFrom: d("2023-01-01") },
    { hsnCode: "8419", description: "Sterilisation Equipment (Autoclaves)", gstPercent: 18, igstPercent: 18, cgstPercent: 9, sgstPercent: 9, effectiveFrom: d("2023-01-01") },
    { hsnCode: "9402", description: "Hospital Furniture (Beds, OT Tables)", gstPercent: 18, igstPercent: 18, cgstPercent: 9, sgstPercent: 9, effectiveFrom: d("2023-01-01") },
    { hsnCode: "9027", description: "Lab Analytical Equipment", gstPercent: 18, igstPercent: 18, cgstPercent: 9, sgstPercent: 9, effectiveFrom: d("2023-01-01") },
  ]);
  console.log("  → 5 tax slabs");

  /* ════════════════════════════════════════════════════════════════════════
   * INSTITUTIONS (INCLUDING DME MASTER DATA)
   * ════════════════════════════════════════════════════════════════════════ */
  const dmeMasterList = [
    {
      institutionCode: "DME-0001",
      dmeInstitutionId: "DME-0001",
      name: "ENT HOSPITAL,KOTI",
      type: "Specialty Hospital",
      facilityType: "Specialty Hospital",
      district: "Hyderabad",
      address: "Koti, Hyderabad, Telangana 500095",
      superintendentName: "Dr. K. Shankar",
      contactPerson: "Dr. K. Shankar",
      contactPhone: "040-24653221",
      contactEmail: "ent.koti@tgmsidc.gov.in",
      hodName: "Director of Medical Education",
    },
    {
      institutionCode: "DME-0002",
      dmeInstitutionId: "DME-0002",
      name: "GGH .Mahabubnagar",
      type: "GGH",
      facilityType: "GGH",
      district: "Mahabubnagar",
      address: "Government General Hospital, Mahabubnagar, Telangana 509001",
      superintendentName: "Dr. Ram Kishan",
      contactPerson: "Dr. Ram Kishan",
      contactPhone: "08542-242333",
      contactEmail: "ggh.mbnr@tgmsidc.gov.in",
      hodName: "Director of Medical Education",
    },
    {
      institutionCode: "DME-0003",
      dmeInstitutionId: "DME-0003",
      name: "GGH Narayanpet",
      type: "GGH",
      facilityType: "GGH",
      district: "Narayanpet",
      address: "Government General Hospital, Narayanpet, Telangana 509210",
      superintendentName: "Dr. B. Mallikarjun",
      contactPerson: "Dr. B. Mallikarjun",
      contactPhone: "08506-282244",
      contactEmail: "ggh.narayanpet@tgmsidc.gov.in",
      hodName: "Director of Medical Education",
    },
    {
      institutionCode: "DME-0004",
      dmeInstitutionId: "DME-0004",
      name: "GGH Nizamabad",
      type: "GGH",
      facilityType: "GGH",
      district: "Nizamabad",
      address: "Government General Hospital, Khaleelwadi, Nizamabad, Telangana 503001",
      superintendentName: "Dr. K. Pratibha",
      contactPerson: "Dr. K. Pratibha",
      contactPhone: "08462-234555",
      contactEmail: "ggh.nizamabad@tgmsidc.gov.in",
      hodName: "Director of Medical Education",
    },
    {
      institutionCode: "DME-0005",
      dmeInstitutionId: "DME-0005",
      name: "GGH Sangareddy",
      type: "GGH",
      facilityType: "GGH",
      district: "Sangareddy",
      address: "Government General Hospital, Sangareddy, Telangana 502001",
      superintendentName: "Dr. S. Narayana",
      contactPerson: "Dr. S. Narayana",
      contactPhone: "08455-276444",
      contactEmail: "ggh.sangareddy@tgmsidc.gov.in",
      hodName: "Director of Medical Education",
    },
    {
      institutionCode: "DME-0006",
      dmeInstitutionId: "DME-0006",
      name: "GGH,Suryapet",
      type: "GGH",
      facilityType: "GGH",
      district: "Suryapet",
      address: "Government General Hospital, Suryapet, Telangana 508213",
      superintendentName: "Dr. Ch. Murali",
      contactPerson: "Dr. Ch. Murali",
      contactPhone: "08684-222333",
      contactEmail: "ggh.suryapet@tgmsidc.gov.in",
      hodName: "Director of Medical Education",
    },
    {
      institutionCode: "DME-0007",
      dmeInstitutionId: "DME-0007",
      name: "GMC , Mahabubnagar",
      type: "GMC",
      facilityType: "GMC",
      district: "Mahabubnagar",
      address: "Government Medical College, Mahabubnagar, Telangana 509001",
      superintendentName: "Dr. P. Shailaja",
      contactPerson: "Dr. P. Shailaja",
      contactPhone: "08542-242444",
      contactEmail: "gmc.mbnr@tgmsidc.gov.in",
      hodName: "Director of Medical Education",
    },
    {
      institutionCode: "DME-0008",
      dmeInstitutionId: "DME-0008",
      name: "GMC, Maheshwaram",
      type: "GMC",
      facilityType: "GMC",
      district: "Rangareddy",
      address: "Government Medical College, Maheshwaram, Rangareddy, Telangana 501359",
      superintendentName: "Dr. K. Venkat Rao",
      contactPerson: "Dr. K. Venkat Rao",
      contactPhone: "08414-232111",
      contactEmail: "gmc.maheshwaram@tgmsidc.gov.in",
      hodName: "Director of Medical Education",
    },
    {
      institutionCode: "DME-0009",
      dmeInstitutionId: "DME-0009",
      name: "GMC Nalgonda",
      type: "GMC",
      facilityType: "GMC",
      district: "Nalgonda",
      address: "Government Medical College, Nalgonda, Telangana 508001",
      superintendentName: "Dr. N. Vani",
      contactPerson: "Dr. N. Vani",
      contactPhone: "08682-244222",
      contactEmail: "gmc.nalgonda@tgmsidc.gov.in",
      hodName: "Director of Medical Education",
    },
    {
      institutionCode: "DME-0010",
      dmeInstitutionId: "DME-0010",
      name: "GMC Narsampet",
      type: "GMC",
      facilityType: "GMC",
      district: "Warangal",
      address: "Government Medical College, Narsampet, Warangal, Telangana 506132",
      superintendentName: "Dr. T. Ravinder",
      contactPerson: "Dr. T. Ravinder",
      contactPhone: "08718-233444",
      contactEmail: "gmc.narsampet@tgmsidc.gov.in",
      hodName: "Director of Medical Education",
    },
    {
      institutionCode: "DME-0011",
      dmeInstitutionId: "DME-0011",
      name: "GMC , Nizamabad",
      type: "GMC",
      facilityType: "GMC",
      district: "Nizamabad",
      address: "Government Medical College, Khaleelwadi, Nizamabad, Telangana 503001",
      superintendentName: "Dr. M. Indira",
      contactPerson: "Dr. M. Indira",
      contactPhone: "08462-234666",
      contactEmail: "gmc.nizamabad@tgmsidc.gov.in",
      hodName: "Director of Medical Education",
    },
    {
      institutionCode: "DME-0012",
      dmeInstitutionId: "DME-0012",
      name: "Government General Hospital , Nagarkurnool",
      type: "GGH",
      facilityType: "GGH",
      district: "Nagarkurnool",
      address: "Government General Hospital, Nagarkurnool, Telangana 509209",
      superintendentName: "Dr. B. Sudhakar",
      contactPerson: "Dr. B. Sudhakar",
      contactPhone: "08540-230111",
      contactEmail: "ggh.nagarkurnool@tgmsidc.gov.in",
      hodName: "Director of Medical Education",
    },
    {
      institutionCode: "DME-0013",
      dmeInstitutionId: "DME-0013",
      name: "Government Medical College",
      type: "GMC",
      facilityType: "GMC",
      district: "Vikarabad",
      address: "Government Medical College, Vikarabad, Telangana 501101",
      superintendentName: "Dr. G. Srinivas",
      contactPerson: "Dr. G. Srinivas",
      contactPhone: "08416-252222",
      contactEmail: "gmc.vikarabad@tgmsidc.gov.in",
      hodName: "Director of Medical Education",
    },
    {
      institutionCode: "DME-0014",
      dmeInstitutionId: "DME-0014",
      name: "Govt Maternity hospital,Hanumakonda",
      type: "Specialty Hospital",
      facilityType: "Specialty Hospital",
      district: "Hanumakonda",
      address: "Govt Maternity Hospital, Hanumakonda, Telangana 506001",
      superintendentName: "Dr. S. Vijayalakshmi",
      contactPerson: "Dr. S. Vijayalakshmi",
      contactPhone: "0870-2577333",
      contactEmail: "gmh.hanumakonda@tgmsidc.gov.in",
      hodName: "Director of Medical Education",
    },
    {
      institutionCode: "DME-0015",
      dmeInstitutionId: "DME-0015",
      name: "Niloufer Hospital ,Hyderabad",
      type: "Hospital",
      facilityType: "Hospital",
      district: "Hyderabad",
      address: "Red Hills, Lakdikapul, Hyderabad, Telangana 500004",
      superintendentName: "Dr. T. Usha Rani",
      contactPerson: "Dr. T. Usha Rani",
      contactPhone: "040-23394248",
      contactEmail: "superintendent.niloufer@tgmsidc.gov.in",
      hodName: "Director of Medical Education",
    },
    {
      institutionCode: "DME-0016",
      dmeInstitutionId: "DME-0016",
      name: "Osmania General Hospital,Hyderabad",
      type: "Hospital",
      facilityType: "Hospital",
      district: "Hyderabad",
      address: "Afzalgunj, Hyderabad, Telangana 500012",
      superintendentName: "Dr. B. Nagender",
      contactPerson: "Dr. B. Nagender",
      contactPhone: "040-24600122",
      contactEmail: "superintendent@oghhyd.gov.in",
      hodName: "Director of Medical Education",
    },
    {
      institutionCode: "DME-0017",
      dmeInstitutionId: "DME-0017",
      name: "Sarojini Devi Eye Hospital",
      type: "Specialty Hospital",
      facilityType: "Specialty Hospital",
      district: "Hyderabad",
      address: "Mehdipatnam, Hyderabad, Telangana 500028",
      superintendentName: "Dr. V. Rajalingam",
      contactPerson: "Dr. V. Rajalingam",
      contactPhone: "040-23538404",
      contactEmail: "superintendent.sdeh@tgmsidc.gov.in",
      hodName: "Director of Medical Education",
    },
  ];

  const institutions = await Institution.insertMany(dmeMasterList);
  console.log(`  → ${institutions.length} institutions (Official DME Hospital Master)`);

  const gandhiInst = institutions.find(i => i.institutionCode === "DME-0001") || institutions[0];
  const osmaniaInst = institutions.find(i => i.institutionCode === "DME-0016") || institutions[1];
  const nimsInst = institutions.find(i => i.institutionCode === "DME-0015") || institutions[2];
  const mgmInst = institutions.find(i => i.institutionCode === "DME-0002") || institutions[3];
  const dhKrmInst = institutions.find(i => i.institutionCode === "DME-0004") || institutions[4];
  const ahNzbInst = institutions.find(i => i.institutionCode === "DME-0005") || institutions[5];

  // Link consignee to institution
  await User.findOneAndUpdate({ username: "consignee_gandhi" }, { facilityId: gandhiInst._id });

  /* ════════════════════════════════════════════════════════════════════════
   * EQUIPMENT MASTER DATA (20 ITEMS EQP-HV-001 to EQP-HV-020)
   * ════════════════════════════════════════════════════════════════════════ */
  const equipment = await Equipment.insertMany([
    {
      equipmentCode: "EQP-HV-001",
      name: "CT Scan Machine - 16 Slice",
      commonName: "CT Scan Machine",
      category: "Diagnostic Imaging",
      department: "Radiology",
      facilityType: "Teaching Hospital",
      specifications: "16-slice sub-second rotation CT system with 3.5 MHU tube, ceramic detectors, iterative reconstruction, and 60 kVA online UPS.",
      hsnCode: "9022",
      gstRate: 18,
      estimatedUnitCost: 18500000,
      standardised: true,
    },
    {
      equipmentCode: "EQP-HV-002",
      name: "Mammography Machine - Digital",
      commonName: "Mammography Machine",
      category: "Diagnostic Imaging",
      department: "Radiology",
      facilityType: "Teaching Hospital",
      specifications: "Full-field digital mammography (FFDM) system with amorphous selenium detector, high-resolution micro-focus tube, motorized compression, and dual 5MP review workstation.",
      hsnCode: "9022",
      gstRate: 18,
      estimatedUnitCost: 6500000,
      standardised: true,
    },
    {
      equipmentCode: "EQP-HV-003",
      name: "C-Arm Machine - Digital",
      commonName: "C-Arm Machine",
      category: "Diagnostic Imaging",
      department: "Orthopaedics / OT",
      facilityType: "All",
      specifications: "Mobile high-frequency digital C-arm system with 9-inch II/FPD, pulsed fluoroscopy, laser localizer, and dual monitor viewing cart.",
      hsnCode: "9022",
      gstRate: 18,
      estimatedUnitCost: 3200000,
      standardised: true,
    },
    {
      equipmentCode: "EQP-HV-004",
      name: "X-Ray Machine - 500 mA with DR/CR",
      commonName: "500 mA X-Ray Machine",
      category: "Diagnostic Imaging",
      department: "Radiology",
      facilityType: "All",
      specifications: "500 mA high-frequency multi-position general radiography system with 17x17 inch flat panel DR detector, 4-way floating top table, and vertical bucky stand.",
      hsnCode: "9022",
      gstRate: 18,
      estimatedUnitCost: 3500000,
      standardised: true,
    },
    {
      equipmentCode: "EQP-HV-005",
      name: "Computerised Radiography System",
      commonName: "CR System",
      category: "Diagnostic Imaging",
      department: "Radiology",
      facilityType: "All",
      specifications: "High-throughput computed radiography (CR) digitizer reader, 60+ plates/hour, multiple cassette formats, acquisition workstation, and dry laser imager.",
      hsnCode: "9022",
      gstRate: 18,
      estimatedUnitCost: 1400000,
      standardised: true,
    },
    {
      equipmentCode: "EQP-HV-006",
      name: "Colour Doppler Ultrasound System",
      commonName: "Colour Doppler",
      category: "Diagnostic Imaging",
      department: "Radiology / OBG",
      facilityType: "All",
      specifications: "Cart-based premium Colour Doppler ultrasound machine with 21.5-inch LED monitor, touch console, and convex, linear, and TVS broadband probes.",
      hsnCode: "9018",
      gstRate: 12,
      estimatedUnitCost: 2800000,
      standardised: true,
    },
    {
      equipmentCode: "EQP-HV-007",
      name: "Portable Ultrasound System with Colour Doppler",
      commonName: "Portable USG Colour Doppler",
      category: "Diagnostic Imaging",
      department: "Radiology / Emergency",
      facilityType: "All",
      specifications: "Rugged laptop-style point-of-care portable colour Doppler ultrasound system with 15-inch anti-glare display, dual active probe ports, and 2.5-hour battery operation.",
      hsnCode: "9018",
      gstRate: 12,
      estimatedUnitCost: 1600000,
      standardised: true,
    },
    {
      equipmentCode: "EQP-HV-008",
      name: "Anaesthesia Workstation with Integrated Ventilator",
      commonName: "Anaesthesia Workstation",
      category: "Operation Theatre",
      department: "Anaesthesia / OT",
      facilityType: "All",
      specifications: "Microprocessor-controlled anaesthesia workstation with integrated ventilator (adult/paediatric), dual vaporizers (Iso/Sevo), anti-hypoxic guard, and integrated respiratory gas monitor.",
      hsnCode: "9018",
      gstRate: 12,
      estimatedUnitCost: 2200000,
      standardised: true,
    },
    {
      equipmentCode: "EQP-HV-009",
      name: "ICU Ventilator - Adult and Paediatric",
      commonName: "ICU Ventilator",
      category: "Critical Care",
      department: "ICU / Emergency",
      facilityType: "All",
      specifications: "Advanced turbine-driven critical care ICU ventilator for adult and paediatric patients, comprehensive invasive/NIV modes, high flow O2 therapy, and 15-inch touch screen.",
      hsnCode: "9018",
      gstRate: 12,
      estimatedUnitCost: 1150000,
      standardised: true,
    },
    {
      equipmentCode: "EQP-HV-010",
      name: "Paediatric / Neonatal Ventilator",
      commonName: "Paediatric Ventilator",
      category: "Critical Care",
      department: "Paediatrics / SNCU",
      facilityType: "Teaching Hospital",
      specifications: "Specialized neonatal & paediatric intensive care ventilator with proximal flow sensor, High Frequency Oscillation (HFO), Volume Guarantee, and tidal volumes down to 2 ml.",
      hsnCode: "9018",
      gstRate: 12,
      estimatedUnitCost: 1350000,
      standardised: true,
    },
    {
      equipmentCode: "EQP-HV-011",
      name: "ABG and Electrolyte Analyser",
      commonName: "ABG Analyser",
      category: "Laboratory",
      department: "ICU / Laboratory",
      facilityType: "All",
      specifications: "Automated cartridge-based arterial blood gas (ABG) and electrolyte analyser with co-oximetry, 65 µL sample volume, 45-second test cycle, and automated QC.",
      hsnCode: "9027",
      gstRate: 18,
      estimatedUnitCost: 650000,
      standardised: true,
    },
    {
      equipmentCode: "EQP-HV-012",
      name: "Fully Automated Biochemistry Analyser",
      commonName: "Biochemistry Analyser",
      category: "Laboratory",
      department: "Biochemistry Laboratory",
      facilityType: "All",
      specifications: "400+ photometric tests/hour random access clinical chemistry analyser with refrigerated reagent carousel, clot detection, ISE module, and bi-directional LIS interface.",
      hsnCode: "9027",
      gstRate: 18,
      estimatedUnitCost: 2500000,
      standardised: true,
    },
    {
      equipmentCode: "EQP-HV-013",
      name: "5-Part Haematology Analyser",
      commonName: "5-Part Cell Counter",
      category: "Laboratory",
      department: "Pathology Laboratory",
      facilityType: "All",
      specifications: "Automated 5-part differential haematology analyser with semiconductor laser flow cytometry, 60 samples/hour throughput, autoloader rack, and 28 reportable parameters.",
      hsnCode: "9027",
      gstRate: 18,
      estimatedUnitCost: 1800000,
      standardised: true,
    },
    {
      equipmentCode: "EQP-HV-014",
      name: "Horizontal High-Pressure Autoclave",
      commonName: "Horizontal Autoclave",
      category: "Sterilization",
      department: "CSSD / OT",
      facilityType: "All",
      specifications: "300 to 400 Litre horizontal high-pressure steam sterilizer with SS 316L inner chamber, built-in steam boiler, vacuum pump, microprocessor PLC control, and cycle printer.",
      hsnCode: "8419",
      gstRate: 18,
      estimatedUnitCost: 850000,
      standardised: true,
    },
    {
      equipmentCode: "EQP-HV-015",
      name: "Digital Dental OPG X-Ray System",
      commonName: "Dental OPG X-Ray",
      category: "Diagnostic Imaging",
      department: "Dental",
      facilityType: "All",
      specifications: "High-frequency digital orthopantomogram (OPG) and cephalometric extraoral X-ray system with direct CMOS sensor, 3-laser positioning, and DICOM 3.0 dental software.",
      hsnCode: "9022",
      gstRate: 18,
      estimatedUnitCost: 1950000,
      standardised: true,
    },
    {
      equipmentCode: "EQP-HV-016",
      name: "EEG Machine - Digital",
      commonName: "EEG Machine",
      category: "Neurodiagnostics",
      department: "Neurology / Radiology",
      facilityType: "All",
      specifications: "32-channel digital electroencephalography (EEG) system with 24-bit delta-sigma conversion, photic flash stimulator, video-EEG capability, and mobile cart workstation.",
      hsnCode: "9018",
      gstRate: 12,
      estimatedUnitCost: 950000,
      standardised: true,
    },
    {
      equipmentCode: "EQP-HV-017",
      name: "Laparoscopy Tower with Instruments",
      commonName: "Laparoscopy System",
      category: "Surgical Systems",
      department: "General Surgery / OBG",
      facilityType: "Teaching Hospital",
      specifications: "Complete 4K Ultra-HD laparoscopy surgical tower with 3-chip CMOS camera, 300W LED light source, 45L heated CO2 insufflator, 32-inch 4K medical monitor, and reusable hand instrument set.",
      hsnCode: "9018",
      gstRate: 12,
      estimatedUnitCost: 3800000,
      standardised: true,
    },
    {
      equipmentCode: "EQP-HV-018",
      name: "Multipara Patient Monitor with EtCO2",
      commonName: "Multipara Monitor with EtCO2",
      category: "Patient Monitoring",
      department: "ICU / OT / Emergency",
      facilityType: "All",
      specifications: "12.1-inch color touchscreen modular patient monitor with ECG, SpO2, NIBP, Dual IBP, Dual Temp, and Sidestream/Microstream EtCO2 capnography module with 4-hr battery.",
      hsnCode: "9018",
      gstRate: 12,
      estimatedUnitCost: 240000,
      standardised: true,
    },
    {
      equipmentCode: "EQP-HV-019",
      name: "Biphasic Defibrillator with AED and Pacing",
      commonName: "Defibrillator",
      category: "Emergency Equipment",
      department: "ICU / Emergency / OT",
      facilityType: "All",
      specifications: "Biphasic manual/AED defibrillator with non-invasive transcutaneous pacing, 3/5-lead ECG, SpO2, pediatric convert paddles, 50mm strip chart recorder, and shock-resistant casing.",
      hsnCode: "9018",
      gstRate: 12,
      estimatedUnitCost: 380000,
      standardised: true,
    },
    {
      equipmentCode: "EQP-HV-020",
      name: "Dialysis Machine",
      commonName: "Haemodialysis Machine",
      category: "Renal Care",
      department: "Dialysis Unit",
      facilityType: "Teaching Hospital",
      specifications: "Microprocessor-controlled single patient haemodialysis machine with volumetric ultrafiltration balancing chamber, blood pump, heparin pump, endotoxin filter, and automated chemical/heat disinfection.",
      hsnCode: "9018",
      gstRate: 12,
      estimatedUnitCost: 850000,
      standardised: true,
    },
  ]);
  console.log(`  → ${equipment.length} equipment items`);

  /* ════════════════════════════════════════════════════════════════════════
   * VENDORS
   * ════════════════════════════════════════════════════════════════════════ */
  const vendors = await Vendor.insertMany([
    { vendorCode: "VND-0001", name: "BPL Medical Technologies Pvt Ltd", contactEmail: "sales@bplmed.com", contactPhone: "080-28395500", contactPerson: "Rajesh Kumar", address: "11th KM, Bannerghatta Road, Bangalore 560076", gstNumber: "29AAACB1234F1ZP", panNumber: "AAACB1234F", bankName: "State Bank of India", bankBranch: "Bannerghatta Road, Bangalore", bankIfsc: "SBIN0001234", bankAccountNo: "30120100045678", vendorTier: "L1", performanceScore: 82, onTimeDeliveryRate: 85, qaPassRate: 90, complianceScore: 70, totalPOs: 12, totalDeliveries: 10, status: "active" },
    { vendorCode: "VND-0002", name: "Philips India Ltd", contactEmail: "govt.orders@philips.com", contactPhone: "020-30515000", contactPerson: "Anand Menon", address: "Philips Innovation Campus, Manyata Tech Park, Bangalore 560045", gstNumber: "29AAACP5678G1ZQ", panNumber: "AAACP5678G", bankName: "HDFC Bank", bankBranch: "MG Road, Bangalore", bankIfsc: "HDFC0001234", bankAccountNo: "50100200034567", vendorTier: "L1", performanceScore: 91, onTimeDeliveryRate: 92, qaPassRate: 95, complianceScore: 85, totalPOs: 8, totalDeliveries: 7, status: "active" },
    { vendorCode: "VND-0003", name: "Mindray Medical India Pvt Ltd", contactEmail: "india@mindray.com", contactPhone: "080-46556000", contactPerson: "Suresh Reddy", address: "7th Floor, Prestige Shantiniketan, Whitefield, Bangalore 560048", gstNumber: "29AADCM9012H1ZR", panNumber: "AADCM9012H", bankName: "ICICI Bank", bankBranch: "Whitefield, Bangalore", bankIfsc: "ICIC0001234", bankAccountNo: "123456789012", vendorTier: "L2", performanceScore: 76, onTimeDeliveryRate: 78, qaPassRate: 82, complianceScore: 68, totalPOs: 6, totalDeliveries: 5, status: "active" },
    { vendorCode: "VND-0004", name: "Trivitron Healthcare Pvt Ltd", contactEmail: "orders@trivitron.com", contactPhone: "044-42094600", contactPerson: "M. Lakshmi", address: "AB-22, Anna Nagar East, Chennai 600102", gstNumber: "33AAACT3456I1ZS", panNumber: "AAACT3456I", bankName: "Axis Bank", bankBranch: "Anna Nagar, Chennai", bankIfsc: "UTIB0001234", bankAccountNo: "920020012345678", vendorTier: "L2", performanceScore: 71, onTimeDeliveryRate: 72, qaPassRate: 78, complianceScore: 62, totalPOs: 4, totalDeliveries: 3, status: "active" },
    { vendorCode: "VND-0005", name: "Schiller Healthcare India Pvt Ltd", contactEmail: "tenders@schiller.in", contactPhone: "011-42625555", contactPerson: "Vikram Singh", address: "C-81, Phase II, Noida 201305", gstNumber: "09AABCS7890J1ZT", panNumber: "AABCS7890J", bankName: "Punjab National Bank", bankBranch: "Noida Sector 18", bankIfsc: "PUNB0001234", bankAccountNo: "1234000100234567", vendorTier: "L3", performanceScore: 65, onTimeDeliveryRate: 68, qaPassRate: 72, complianceScore: 55, totalPOs: 3, totalDeliveries: 2, status: "active" },
  ]);
  console.log(`  → ${vendors.length} vendors`);

  /* ════════════════════════════════════════════════════════════════════════
   * RATE CONTRACTS
   * ════════════════════════════════════════════════════════════════════════ */
  const rcs = await RateContract.insertMany([
    { contractNumber: "RC-2526-0001", financialYear: "2025-26", equipmentId: equipment[17]._id, equipmentName: equipment[17].name, equipmentCategory: equipment[17].category, vendorId: vendors[0]._id, vendorName: "BPL Medical Technologies Pvt Ltd", l1VendorName: "BPL Medical Technologies Pvt Ltd", l2VendorName: "Mindray Medical India Pvt Ltd", l3VendorName: "Schiller Healthcare India Pvt Ltd", unitPrice: 215000, gstRate: 12, unitPriceInclTax: 240800, maxOrderQty: 200, warrantyMonths: 36, supplyPeriodDays: 45, awardDate: ago(180), startDate: ago(150), endDate: future(215), camcApplicable: true, camcPeriodYears: 3, camcRatePerYear: 12000, specsConfirmed: true, specsApproverNames: "Dr. K. Manohar, Dr. P. Shankar", approvalStatus: "approved", approvedBy: "R. Sharma (SO Equipment)", bfcApprovalRef: "BFC/2025/EQ/042", status: "active", totalPOsIssued: 3, totalQtyOrdered: 45, totalValueOrdered: 10836000 },
    { contractNumber: "RC-2526-0002", financialYear: "2025-26", equipmentId: equipment[8]._id, equipmentName: equipment[8].name, equipmentCategory: equipment[8].category, vendorId: vendors[1]._id, vendorName: "Philips India Ltd", l1VendorName: "Philips India Ltd", l2VendorName: "BPL Medical Technologies Pvt Ltd", unitPrice: 1050000, gstRate: 12, unitPriceInclTax: 1176000, maxOrderQty: 50, warrantyMonths: 36, supplyPeriodDays: 60, awardDate: ago(120), startDate: ago(90), endDate: future(275), camcApplicable: true, camcPeriodYears: 5, camcRatePerYear: 48000, specsConfirmed: true, approvalStatus: "approved", approvedBy: "R. Sharma (SO Equipment)", bfcApprovalRef: "BFC/2025/EQ/051", status: "active", totalPOsIssued: 2, totalQtyOrdered: 12, totalValueOrdered: 14112000 },
    { contractNumber: "RC-2526-0003", financialYear: "2025-26", equipmentId: equipment[6]._id, equipmentName: equipment[6].name, equipmentCategory: equipment[6].category, vendorId: vendors[2]._id, vendorName: "Mindray Medical India Pvt Ltd", l1VendorName: "Mindray Medical India Pvt Ltd", unitPrice: 1450000, gstRate: 12, unitPriceInclTax: 1624000, maxOrderQty: 100, warrantyMonths: 36, supplyPeriodDays: 30, startDate: ago(200), endDate: future(165), specsConfirmed: true, approvalStatus: "approved", status: "active", totalPOsIssued: 1, totalQtyOrdered: 20, totalValueOrdered: 32480000 },
    { contractNumber: "RC-2526-0004", financialYear: "2025-26", equipmentId: equipment[18]._id, equipmentName: equipment[18].name, equipmentCategory: equipment[18].category, vendorId: vendors[0]._id, vendorName: "BPL Medical Technologies Pvt Ltd", l1VendorName: "BPL Medical Technologies Pvt Ltd", l2VendorName: "Schiller Healthcare India Pvt Ltd", unitPrice: 340000, gstRate: 12, unitPriceInclTax: 380800, maxOrderQty: 100, warrantyMonths: 36, supplyPeriodDays: 45, startDate: ago(60), endDate: future(30), camcApplicable: false, specsConfirmed: true, approvalStatus: "approved", status: "active", totalPOsIssued: 1, totalQtyOrdered: 10, totalValueOrdered: 3808000 },
    { contractNumber: "RC-2425-0012", financialYear: "2024-25", equipmentId: equipment[13]._id, equipmentName: equipment[13].name, equipmentCategory: equipment[13].category, vendorId: vendors[3]._id, vendorName: "Trivitron Healthcare Pvt Ltd", l1VendorName: "Trivitron Healthcare Pvt Ltd", unitPrice: 780000, gstRate: 18, unitPriceInclTax: 920400, warrantyMonths: 36, startDate: ago(400), endDate: ago(35), specsConfirmed: true, approvalStatus: "approved", status: "expired", totalPOsIssued: 2, totalQtyOrdered: 8 },
  ]);
  console.log(`  → ${rcs.length} rate contracts`);

  /* ════════════════════════════════════════════════════════════════════════
   * INDENTS
   * ════════════════════════════════════════════════════════════════════════ */
  const approvedSteps = (digitisedBy: string, procMode?: string) => [
    { stepNumber: 1, requiredRole: "deo", roleLabel: "DEO (Initiator)", assignedUserName: digitisedBy, assignedUserId: "u1", status: "approved", actionedAt: ago(20), comments: "Indent submitted." },
    { stepNumber: 2, requiredRole: "tgmsidc_user", roleLabel: "TGMSIDC User", assignedUserName: "K. Srinivas", assignedUserId: "u2", status: "approved", actionedAt: ago(18), comments: "Data verified against scanned copy." },
    { stepNumber: 3, requiredRole: "gm_equipment", roleLabel: "GM Equipment", assignedUserName: "P. Narayan", assignedUserId: "u3", status: "approved", actionedAt: ago(15), comments: procMode === "rate_contract" ? "Approved. Active RC available." : "Approved. No active RC — tender route." },
    { stepNumber: 4, requiredRole: "so_equipment", roleLabel: "SO Equipment", assignedUserName: "R. Sharma", assignedUserId: "u4", status: "approved", actionedAt: ago(12), comments: "Final approval granted." },
  ];

  const pendingSteps = (digitisedBy: string) => [
    { stepNumber: 1, requiredRole: "deo", roleLabel: "DEO (Initiator)", assignedUserName: digitisedBy, assignedUserId: "u1", status: "approved", actionedAt: ago(3), comments: "Indent submitted." },
    { stepNumber: 2, requiredRole: "tgmsidc_user", roleLabel: "TGMSIDC User", assignedUserName: "K. Srinivas", assignedUserId: "u2", status: "pending" },
    { stepNumber: 3, requiredRole: "gm_equipment", roleLabel: "GM Equipment", assignedUserName: "P. Narayan", assignedUserId: "u3", status: "pending" },
    { stepNumber: 4, requiredRole: "so_equipment", roleLabel: "SO Equipment", assignedUserName: "R. Sharma", assignedUserId: "u4", status: "pending" },
  ];

  const indents = await Indent.insertMany([
    { indentNumber: "IND-2526-0001", indentType: "go", financialYear: "2025-26", indentDate: ago(25), facilityId: gandhiInst._id, facilityName: gandhiInst.name, hodName: "Director of Medical Education", lineItems: [{ equipmentId: equipment[17]._id, equipmentName: equipment[17].name, category: equipment[17].category, specifications: "ECG, SpO2, NIBP, Temp, IBP, EtCO2 with 12.1-inch color touchscreen", requestedQty: 20, approvedQty: 20, unitOfMeasure: "No.", estimatedUnitCost: 215000, procurementMode: "rate_contract", rateContractId: rcs[0]._id }], institutions: [{ institutionId: gandhiInst._id, institutionName: gandhiInst.name, district: gandhiInst.district, quantities: [{ lineItemIndex: 0, sanctionedQty: 20 }], fundSanctionedAmount: 4816000 }], equipmentId: equipment[17]._id, quantity: 20, technicalRequirements: "Multipara patient monitors with EtCO2 for ICU and Emergency wards", estimatedTotalValue: 4816000, status: "po_issued", procurementMode: "rate_contract", rateContractId: rcs[0]._id, digitisedBy: "B. Rajeshwari", createdByUserId: users[0]._id.toString(), approvedBy: "R. Sharma", accountHeadName: "Capital Outlay — Equipment", programmeName: "Procurement of Medical Equipment 2025-26", fundingSourceName: "State Budget", approvalSteps: approvedSteps("B. Rajeshwari", "rate_contract") },
    { indentNumber: "IND-2526-0002", indentType: "letter", financialYear: "2025-26", indentDate: ago(22), facilityId: osmaniaInst._id, facilityName: osmaniaInst.name, hodName: "Director of Medical Education", lineItems: [{ equipmentId: equipment[8]._id, equipmentName: equipment[8].name, category: equipment[8].category, specifications: "Adult & Paediatric turbine-driven critical care ICU ventilator", requestedQty: 8, approvedQty: 8, unitOfMeasure: "No.", estimatedUnitCost: 1050000, procurementMode: "rate_contract", rateContractId: rcs[1]._id }], institutions: [{ institutionId: osmaniaInst._id, institutionName: osmaniaInst.name, district: osmaniaInst.district, quantities: [{ lineItemIndex: 0, sanctionedQty: 8 }], fundSanctionedAmount: 9408000 }], equipmentId: equipment[8]._id, quantity: 8, technicalRequirements: "ICU Ventilators for newly expanded critical care block", estimatedTotalValue: 9408000, status: "approved", procurementMode: "rate_contract", rateContractId: rcs[1]._id, digitisedBy: "S. Padma", approvedBy: "R. Sharma", accountHeadName: "Capital Outlay — Equipment", programmeName: "NHM Medical Equipment Strengthening", fundingSourceName: "National Health Mission", approvalSteps: approvedSteps("S. Padma", "rate_contract") },
    { indentNumber: "IND-2526-0003", indentType: "proceeding", financialYear: "2025-26", indentDate: ago(18), facilityId: nimsInst._id, facilityName: nimsInst.name, hodName: "Director, NIMS", lineItems: [{ equipmentId: equipment[3]._id, equipmentName: equipment[3].name, category: equipment[3].category, specifications: "500mA DR system with 17x17 flat panel detector", requestedQty: 2, approvedQty: 2, unitOfMeasure: "No.", estimatedUnitCost: 3500000, procurementMode: "tender" }], institutions: [{ institutionId: nimsInst._id, institutionName: nimsInst.name, district: nimsInst.district, quantities: [{ lineItemIndex: 0, sanctionedQty: 2 }], fundSanctionedAmount: 8260000 }], equipmentId: equipment[3]._id, quantity: 2, technicalRequirements: "500mA Digital X-Ray with DICOM for Radiology", estimatedTotalValue: 8260000, status: "tender_initiated", procurementMode: "tender", digitisedBy: "B. Rajeshwari", approvedBy: "R. Sharma", accountHeadName: "Capital Outlay — Equipment", programmeName: "TSHSP Equipment Modernisation", fundingSourceName: "World Bank — TSHSP", approvalSteps: approvedSteps("B. Rajeshwari", "tender") },
    { indentNumber: "IND-2526-0004", indentType: "letter", financialYear: "2025-26", indentDate: ago(5), facilityId: mgmInst._id, facilityName: mgmInst.name, hodName: "Director of Medical Education", lineItems: [{ equipmentId: equipment[12]._id, equipmentName: equipment[12].name, category: equipment[12].category, specifications: "5-part differential, 60 samples/hr autoloader", requestedQty: 3, unitOfMeasure: "No.", estimatedUnitCost: 1800000 }, { equipmentId: equipment[11]._id, equipmentName: equipment[11].name, category: equipment[11].category, specifications: "400 tests/hr, ISE module, bi-directional LIS", requestedQty: 2, unitOfMeasure: "No.", estimatedUnitCost: 2500000 }], institutions: [{ institutionId: mgmInst._id, institutionName: mgmInst.name, district: mgmInst.district, quantities: [{ lineItemIndex: 0, sanctionedQty: 3 }, { lineItemIndex: 1, sanctionedQty: 2 }], fundSanctionedAmount: 12272000 }], quantity: 5, technicalRequirements: "Laboratory diagnostics modernization at MGM Warangal", estimatedTotalValue: 12272000, status: "pending_review", digitisedBy: "B. Rajeshwari", accountHeadName: "Capital Outlay — Equipment", programmeName: "NHM Medical Equipment Strengthening", fundingSourceName: "National Health Mission", approvalSteps: pendingSteps("B. Rajeshwari") },
    { indentNumber: "IND-2526-0005", indentType: "go", financialYear: "2025-26", indentDate: ago(2), facilityId: dhKrmInst._id, facilityName: dhKrmInst.name, hodName: "Dist. Medical & Health Officer", lineItems: [{ equipmentId: equipment[18]._id, equipmentName: equipment[18].name, category: equipment[18].category, specifications: "Biphasic, AED mode, pacing, 12-lead ECG", requestedQty: 5, unitOfMeasure: "No.", estimatedUnitCost: 340000 }, { equipmentId: equipment[6]._id, equipmentName: equipment[6].name, category: equipment[6].category, specifications: "Portable Colour Doppler USG with 2 probes", requestedQty: 2, unitOfMeasure: "No.", estimatedUnitCost: 1450000 }], institutions: [{ institutionId: dhKrmInst._id, institutionName: dhKrmInst.name, district: dhKrmInst.district, quantities: [{ lineItemIndex: 0, sanctionedQty: 5 }, { lineItemIndex: 1, sanctionedQty: 2 }], fundSanctionedAmount: 5152000 }], quantity: 7, technicalRequirements: "Emergency & portable diagnostic equipment for DH Karimnagar", estimatedTotalValue: 5152000, status: "pending_review", digitisedBy: "S. Padma", approvalSteps: pendingSteps("S. Padma") },
    { indentNumber: "IND-2526-0006", indentType: "letter", financialYear: "2025-26", indentDate: ago(30), facilityId: gandhiInst._id, facilityName: gandhiInst.name, hodName: "Director of Medical Education", lineItems: [{ equipmentId: equipment[16]._id, equipmentName: equipment[16].name, category: equipment[16].category, specifications: "4K laparoscopy tower with 300W LED light source and instruments", requestedQty: 2, approvedQty: 2, unitOfMeasure: "No.", estimatedUnitCost: 3800000, procurementMode: "tender" }], institutions: [{ institutionId: gandhiInst._id, institutionName: gandhiInst.name, district: gandhiInst.district, quantities: [{ lineItemIndex: 0, sanctionedQty: 2 }] }], equipmentId: equipment[16]._id, quantity: 2, technicalRequirements: "4K Laparoscopy system for General Surgery & OBG", estimatedTotalValue: 8512000, status: "approved", procurementMode: "tender", digitisedBy: "B. Rajeshwari", approvedBy: "R. Sharma", approvalSteps: approvedSteps("B. Rajeshwari", "tender") },
    { indentNumber: "IND-2526-0007", indentType: "letter", financialYear: "2025-26", indentDate: ago(40), facilityId: ahNzbInst._id, facilityName: ahNzbInst.name, hodName: "Dist. Medical & Health Officer", lineItems: [{ equipmentId: equipment[13]._id, equipmentName: equipment[13].name, category: equipment[13].category, specifications: "300L horizontal autoclave with vacuum drying", requestedQty: 2, approvedQty: 2, unitOfMeasure: "No.", estimatedUnitCost: 780000 }], quantity: 2, technicalRequirements: "Autoclave for CSSD sterilization", estimatedTotalValue: 1840800, status: "rejected", rejectionReason: "Duplicate indent — already covered under IND-2425-0089", digitisedBy: "S. Padma", approvalSteps: [{ stepNumber: 1, requiredRole: "deo", roleLabel: "DEO", assignedUserName: "S. Padma", assignedUserId: "u1", status: "approved", actionedAt: ago(38) }, { stepNumber: 2, requiredRole: "tgmsidc_user", roleLabel: "TGMSIDC User", assignedUserName: "K. Srinivas", assignedUserId: "u2", status: "rejected", actionedAt: ago(36), comments: "Duplicate indent — already covered under IND-2425-0089" }] },
  ]);
  console.log(`  → ${indents.length} indents`);

  /* ════════════════════════════════════════════════════════════════════════
   * TENDERS
   * ════════════════════════════════════════════════════════════════════════ */
  const mkStages = (completedTo: number, data?: Record<number, any>) => {
    const names = ["Tender Opened", "Pre-bid Queries", "Amendments", "Bid Evaluation", "Demo & Technical Evaluation", "Technical Committee Approval", "Financial Bid & BFC Prep", "BFC Meeting", "BFC Decision", "RC Header Entry"];
    return names.map((n, i) => ({
      stageNumber: i + 1, stageName: n,
      status: i < completedTo ? "completed" : i === completedTo ? "in_progress" : "pending",
      startDate: i <= completedTo ? ago(90 - i * 8) : undefined,
      completionDate: i < completedTo ? ago(90 - (i + 1) * 8) : undefined,
      notes: data?.[i + 1] ?? "",
      data: {},
    }));
  };

  const tenders = await Tender.insertMany([
    { tenderNumber: "TND-2025-0001", indentId: indents[2]._id, equipmentName: equipment[3].name, equipmentCategory: equipment[3].category, tenderType: "open", portal: "e-procurement", financialYear: "2025-26", stages: mkStages(6), currentStageNumber: 7, specsStatus: "accepted", specsApproverNames: "Dr. K. Manohar, Dr. R. Prasad", tenderInvitedDate: ago(85), bidSubmissionStartDate: ago(80), bidSubmissionEndDate: ago(50), bidsReceivedDate: ago(50), l1VendorName: "Philips India Ltd", l1BidAmount: 3200000, l2VendorName: "BPL Medical Technologies Pvt Ltd", l2BidAmount: 3450000, l3VendorName: "Trivitron Healthcare Pvt Ltd", l3BidAmount: 3680000, status: "evaluation" },
    { tenderNumber: "TND-2025-0002", indentId: indents[5]._id, equipmentName: equipment[16].name, equipmentCategory: equipment[16].category, tenderType: "open", portal: "e-procurement", financialYear: "2025-26", stages: mkStages(3), currentStageNumber: 4, specsStatus: "changed", tenderInvitedDate: ago(45), bidSubmissionStartDate: ago(40), bidSubmissionEndDate: ago(15), bidsReceivedDate: ago(15), status: "evaluation", notes: "7 bids received, evaluation in progress" },
    { tenderNumber: "TND-2025-0003", equipmentName: equipment[11].name, equipmentCategory: equipment[11].category, tenderType: "open", portal: "gem", financialYear: "2025-26", stages: mkStages(0), currentStageNumber: 1, tenderInvitedDate: ago(10), bidSubmissionStartDate: ago(8), bidSubmissionEndDate: future(20), status: "invited" },
  ]);
  console.log(`  → ${tenders.length} tenders`);

  /* ════════════════════════════════════════════════════════════════════════
   * PURCHASE ORDERS
   * ════════════════════════════════════════════════════════════════════════ */
  const pos = await PurchaseOrder.insertMany([
    { poNumber: "PO-2526-0001", poType: "rc_based", financialYear: "2025-26", poDate: ago(10), indentId: indents[0]._id, indentNumber: "IND-2526-0001", rateContractId: rcs[0]._id, rcNumber: "RC-2526-0001", vendorId: vendors[0]._id, vendorName: "BPL Medical Technologies Pvt Ltd", equipmentId: equipment[17]._id, equipmentName: equipment[17].name, quantity: 20, unitPrice: 215000, gstRate: 12, gstAmount: 516000, unitPriceInclTax: 240800, totalEquipmentCost: 4300000, totalAmount: 4816000, consignees: [{ institutionId: gandhiInst._id, institutionName: gandhiInst.name, district: gandhiInst.district, address: gandhiInst.address, quantity: 20, deliveryStatus: "in_progress" }], psRequired: true, psPercent: 5, psAmount: 240800, deliveryAddress: gandhiInst.name, supplyPeriodDays: 45, expectedDeliveryDate: future(35), approvalStatus: "approved", approvedBy: "R. Sharma (SO Equipment)", approvedDate: ago(8), vendorAcknowledged: true, vendorAckDate: ago(6), vendorExpectedDispatchDate: future(20), generatedBy: "K. Srinivas", status: "approved" },
    { poNumber: "PO-2526-0002", poType: "rc_based", financialYear: "2025-26", poDate: ago(8), indentId: indents[1]._id, indentNumber: "IND-2526-0002", rateContractId: rcs[1]._id, rcNumber: "RC-2526-0002", vendorId: vendors[1]._id, vendorName: "Philips India Ltd", equipmentId: equipment[8]._id, equipmentName: equipment[8].name, quantity: 8, unitPrice: 1050000, gstRate: 12, gstAmount: 1008000, unitPriceInclTax: 1176000, totalEquipmentCost: 8400000, totalAmount: 9408000, consignees: [{ institutionId: osmaniaInst._id, institutionName: osmaniaInst.name, district: osmaniaInst.district, address: osmaniaInst.address, quantity: 8, deliveryStatus: "pending" }], psRequired: true, psPercent: 5, psAmount: 470400, deliveryAddress: osmaniaInst.name, supplyPeriodDays: 60, expectedDeliveryDate: future(52), approvalStatus: "approved", approvedBy: "R. Sharma (SO Equipment)", approvedDate: ago(6), vendorAcknowledged: true, vendorAckDate: ago(4), generatedBy: "K. Srinivas", status: "approved" },
    { poNumber: "PO-2526-0003", poType: "rc_based", financialYear: "2025-26", poDate: ago(3), indentId: indents[0]._id, indentNumber: "IND-2526-0001", rateContractId: rcs[2]._id, rcNumber: "RC-2526-0003", vendorId: vendors[2]._id, vendorName: "Mindray Medical India Pvt Ltd", equipmentId: equipment[6]._id, equipmentName: equipment[6].name, quantity: 10, unitPrice: 1450000, gstRate: 12, gstAmount: 1740000, unitPriceInclTax: 1624000, totalEquipmentCost: 14500000, totalAmount: 16240000, consignees: [{ institutionId: gandhiInst._id, institutionName: gandhiInst.name, quantity: 5 }, { institutionId: mgmInst._id, institutionName: mgmInst.name, quantity: 5 }], deliveryAddress: `${gandhiInst.name} / ${mgmInst.name}`, supplyPeriodDays: 30, expectedDeliveryDate: future(27), approvalStatus: "pending", generatedBy: "K. Srinivas", status: "draft" },
  ]);
  console.log(`  → ${pos.length} purchase orders`);

  /* ════════════════════════════════════════════════════════════════════════
   * DELIVERIES
   * ════════════════════════════════════════════════════════════════════════ */
  const deliveries = await Delivery.insertMany([
    { deliveryTrackingId: "DEL-00001", purchaseOrderId: pos[0]._id, poNumber: "PO-2526-0001", vendorId: vendors[0]._id, vendorName: "BPL Medical Technologies Pvt Ltd", facilityId: gandhiInst._id, facilityName: gandhiInst.name, equipmentId: equipment[17]._id, equipmentName: equipment[17].name, orderedQty: 20, quantity: 20, receivedQty: 12, dispatchDate: ago(5), transporterName: "Blue Dart Express", transporterVehicle: "TS 09 AB 1234", lrGrNumber: "LR-BD-2025-78543", challanNumber: "DC/BPL/2025/0456", invoiceNumber: "INV/BPL/2025-26/0123", expectedDeliveryDate: future(35), deliveredDate: ago(2), receivedBy: "T. Ramaiah", condition: "good", serialNumbers: ["BPL-MPM-10001", "BPL-MPM-10002", "BPL-MPM-10003", "BPL-MPM-10004", "BPL-MPM-10005", "BPL-MPM-10006", "BPL-MPM-10007", "BPL-MPM-10008", "BPL-MPM-10009", "BPL-MPM-10010", "BPL-MPM-10011", "BPL-MPM-10012"], isOnTime: true, delayDays: 0, deliveryCertUploaded: true, deliveryCertDate: ago(1), qaCommitteeName: "Dr. K. Manohar (Chair), Er. K. Srinivas, T. Ramaiah", qaInspectionDate: ago(1), qaInspectionItems: [{ parameterName: "Display clarity (≥12 inch)", result: "pass" }, { parameterName: "ECG waveform accuracy", result: "pass" }, { parameterName: "SpO2 sensor response", result: "pass" }, { parameterName: "NIBP cuff operation", result: "pass" }, { parameterName: "Alarm functionality", result: "pass" }, { parameterName: "Battery backup (≥2 hrs)", result: "pass" }], qaDecision: "accepted", qaComplianceScore: 100, qaNotes: "All 12 units passed QA inspection", acceptanceCertificateIssued: true, acceptanceCertDate: ago(1), installationRequired: true, installationStatus: "pending", warrantyMonths: 36, documentsUploaded: true, status: "accepted" },
    { deliveryTrackingId: "DEL-00002", purchaseOrderId: pos[0]._id, poNumber: "PO-2526-0001", vendorId: vendors[0]._id, vendorName: "BPL Medical Technologies Pvt Ltd", facilityId: gandhiInst._id, facilityName: gandhiInst.name, equipmentId: equipment[17]._id, equipmentName: equipment[17].name, orderedQty: 20, quantity: 8, receivedQty: 0, expectedDeliveryDate: future(15), status: "expected", condition: "pending_inspection", warrantyMonths: 36 },
    { deliveryTrackingId: "DEL-00003", purchaseOrderId: pos[1]._id, poNumber: "PO-2526-0002", vendorId: vendors[1]._id, vendorName: "Philips India Ltd", facilityId: osmaniaInst._id, facilityName: osmaniaInst.name, equipmentId: equipment[8]._id, equipmentName: equipment[8].name, orderedQty: 8, quantity: 8, receivedQty: 0, dispatchDate: ago(1), transporterName: "DTDC Logistics", challanNumber: "DC/PHI/2025/0891", expectedDeliveryDate: future(4), status: "dispatched", installationRequired: true, installationStatus: "pending", warrantyMonths: 36 },
  ]);
  console.log(`  → ${deliveries.length} deliveries`);

  /* ════════════════════════════════════════════════════════════════════════
   * NOTIFICATIONS
   * ════════════════════════════════════════════════════════════════════════ */
  await Notification.insertMany([
    { type: "indent_submitted", title: "New Indent Received", message: "Indent IND-2526-0004 from MGM Hospital, Warangal requires review.", userId: users[2]._id.toString(), entityType: "indent", entityId: indents[3]._id.toString(), priority: "high" },
    { type: "indent_submitted", title: "New Indent Received", message: "Indent IND-2526-0005 from DH Karimnagar requires review.", userId: users[2]._id.toString(), entityType: "indent", entityId: indents[4]._id.toString(), priority: "high" },
    { type: "delivery_dispatched", title: "Equipment Dispatched", message: "Philips India dispatched 8 ICU Ventilators (PO-2526-0002). Expected arrival in 5 days.", userId: users[9]._id.toString(), entityType: "delivery", entityId: deliveries[2]._id.toString(), priority: "normal" },
    { type: "rc_expiring", title: "Rate Contract Expiring Soon", message: "RC-2526-0004 for Defibrillator expires in 30 days. Initiate renewal or new tender.", userId: users[3]._id.toString(), entityType: "rate_contract", entityId: rcs[3]._id.toString(), priority: "high" },
    { type: "po_pending_approval", title: "PO Awaiting Approval", message: "PO-2526-0003 for Syringe Infusion Pump (₹18,81,600) is pending approval.", userId: users[4]._id.toString(), entityType: "purchase_order", entityId: pos[2]._id.toString(), priority: "normal" },
  ]);
  console.log("  → 5 notifications");

  console.log("\n✅ Seed complete!");
  await mongoose.disconnect();
}

main().catch((err) => { console.error("Seed failed:", err); process.exit(1); });
