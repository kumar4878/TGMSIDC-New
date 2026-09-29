// Type aliases — these replace the generated types from @workspace/api-client-react
type Indent = any;
type RateContract = any;
type PurchaseOrder = any;
type Tender = any;
type Delivery = any;
type Vendor = any;
type Institution = any;
type Equipment = any;
type DashboardSummary = any;
type PipelineStage = any;
type ActivityItem = any;
type SlaMetrics = any;
type VendorPerformance = any;

export interface MockInvoice {
  id: number;
  invoiceNumber: string;
  poId: number;
  poNumber: string;
  vendorName: string;
  amount: number;
  status: "pending" | "paid" | "partial";
  invoiceDate: string;
  paidDate: string | null;
}

export const mockInvoices: MockInvoice[] = [
  {
    id: 1,
    invoiceNumber: "SSA/INV/2025-26/0011",
    poId: 1,
    poNumber: "441A/591/HPC/EQU/2025-26",
    vendorName: "M/s. Sri Srinivasa Agencies",
    amount: 556125,
    status: "paid",
    invoiceDate: "2026-03-16",
    paidDate: "2026-04-02",
  },
  {
    id: 2,
    invoiceNumber: "GAMS/01533/22-23",
    poId: 2,
    poNumber: "216/418/HPC/EQU/Vemulawada/2022-23",
    vendorName: "M/s. Green Apple Medical Systems",
    amount: 682500,
    status: "paid",
    invoiceDate: "2022-11-02",
    paidDate: "2022-12-01",
  },
  {
    id: 3,
    invoiceNumber: "INV/NMI/2026/0112",
    poId: 3,
    poNumber: "IND/HPC/EQU/WDH/PO/2026/003",
    vendorName: "Nidek Medical India Pvt Ltd",
    amount: 1344000,
    status: "pending",
    invoiceDate: "2026-04-28",
    paidDate: null,
  },
];

export const mockInstitutions: Institution[] = [
  { id: 101, institutionCode: "DME-0001", dmeInstitutionId: "DME-0001", name: "ENT HOSPITAL,KOTI", type: "Specialty Hospital", facilityType: "Specialty Hospital", district: "Hyderabad", address: "Koti, Hyderabad, Telangana 500095", superintendentName: "Dr. K. Shankar", contactEmail: "ent.koti@tgmsidc.gov.in", createdAt: "2025-01-01T00:00:00Z" },
  { id: 102, institutionCode: "DME-0002", dmeInstitutionId: "DME-0002", name: "GGH .Mahabubnagar", type: "GGH", facilityType: "GGH", district: "Mahabubnagar", address: "Government General Hospital, Mahabubnagar, Telangana 509001", superintendentName: "Dr. Ram Kishan", contactEmail: "ggh.mbnr@tgmsidc.gov.in", createdAt: "2025-01-01T00:00:00Z" },
  { id: 103, institutionCode: "DME-0003", dmeInstitutionId: "DME-0003", name: "GGH Narayanpet", type: "GGH", facilityType: "GGH", district: "Narayanpet", address: "Government General Hospital, Narayanpet, Telangana 509210", superintendentName: "Dr. B. Mallikarjun", contactEmail: "ggh.narayanpet@tgmsidc.gov.in", createdAt: "2025-01-01T00:00:00Z" },
  { id: 104, institutionCode: "DME-0004", dmeInstitutionId: "DME-0004", name: "GGH Nizamabad", type: "GGH", facilityType: "GGH", district: "Nizamabad", address: "Government General Hospital, Khaleelwadi, Nizamabad, Telangana 503001", superintendentName: "Dr. K. Pratibha", contactEmail: "ggh.nizamabad@tgmsidc.gov.in", createdAt: "2025-01-01T00:00:00Z" },
  { id: 105, institutionCode: "DME-0005", dmeInstitutionId: "DME-0005", name: "GGH Sangareddy", type: "GGH", facilityType: "GGH", district: "Sangareddy", address: "Government General Hospital, Sangareddy, Telangana 502001", superintendentName: "Dr. S. Narayana", contactEmail: "ggh.sangareddy@tgmsidc.gov.in", createdAt: "2025-01-01T00:00:00Z" },
  { id: 106, institutionCode: "DME-0006", dmeInstitutionId: "DME-0006", name: "GGH,Suryapet", type: "GGH", facilityType: "GGH", district: "Suryapet", address: "Government General Hospital, Suryapet, Telangana 508213", superintendentName: "Dr. Ch. Murali", contactEmail: "ggh.suryapet@tgmsidc.gov.in", createdAt: "2025-01-01T00:00:00Z" },
  { id: 107, institutionCode: "DME-0007", dmeInstitutionId: "DME-0007", name: "GMC , Mahabubnagar", type: "GMC", facilityType: "GMC", district: "Mahabubnagar", address: "Government Medical College, Mahabubnagar, Telangana 509001", superintendentName: "Dr. P. Shailaja", contactEmail: "gmc.mbnr@tgmsidc.gov.in", createdAt: "2025-01-01T00:00:00Z" },
  { id: 108, institutionCode: "DME-0008", dmeInstitutionId: "DME-0008", name: "GMC, Maheshwaram", type: "GMC", facilityType: "GMC", district: "Rangareddy", address: "Government Medical College, Maheshwaram, Rangareddy, Telangana 501359", superintendentName: "Dr. K. Venkat Rao", contactEmail: "gmc.maheshwaram@tgmsidc.gov.in", createdAt: "2025-01-01T00:00:00Z" },
  { id: 109, institutionCode: "DME-0009", dmeInstitutionId: "DME-0009", name: "GMC Nalgonda", type: "GMC", facilityType: "GMC", district: "Nalgonda", address: "Government Medical College, Nalgonda, Telangana 508001", superintendentName: "Dr. N. Vani", contactEmail: "gmc.nalgonda@tgmsidc.gov.in", createdAt: "2025-01-01T00:00:00Z" },
  { id: 110, institutionCode: "DME-0010", dmeInstitutionId: "DME-0010", name: "GMC Narsampet", type: "GMC", facilityType: "GMC", district: "Warangal", address: "Government Medical College, Narsampet, Warangal, Telangana 506132", superintendentName: "Dr. T. Ravinder", contactEmail: "gmc.narsampet@tgmsidc.gov.in", createdAt: "2025-01-01T00:00:00Z" },
  { id: 111, institutionCode: "DME-0011", dmeInstitutionId: "DME-0011", name: "GMC , Nizamabad", type: "GMC", facilityType: "GMC", district: "Nizamabad", address: "Government Medical College, Khaleelwadi, Nizamabad, Telangana 503001", superintendentName: "Dr. M. Indira", contactEmail: "gmc.nizamabad@tgmsidc.gov.in", createdAt: "2025-01-01T00:00:00Z" },
  { id: 112, institutionCode: "DME-0012", dmeInstitutionId: "DME-0012", name: "Government General Hospital , Nagarkurnool", type: "GGH", facilityType: "GGH", district: "Nagarkurnool", address: "Government General Hospital, Nagarkurnool, Telangana 509209", superintendentName: "Dr. B. Sudhakar", contactEmail: "ggh.nagarkurnool@tgmsidc.gov.in", createdAt: "2025-01-01T00:00:00Z" },
  { id: 113, institutionCode: "DME-0013", dmeInstitutionId: "DME-0013", name: "Government Medical College", type: "GMC", facilityType: "GMC", district: "Vikarabad", address: "Government Medical College, Vikarabad, Telangana 501101", superintendentName: "Dr. G. Srinivas", contactEmail: "gmc.vikarabad@tgmsidc.gov.in", createdAt: "2025-01-01T00:00:00Z" },
  { id: 114, institutionCode: "DME-0014", dmeInstitutionId: "DME-0014", name: "Govt Maternity hospital,Hanumakonda", type: "Specialty Hospital", facilityType: "Specialty Hospital", district: "Hanumakonda", address: "Govt Maternity Hospital, Hanumakonda, Telangana 506001", superintendentName: "Dr. S. Vijayalakshmi", contactEmail: "gmh.hanumakonda@tgmsidc.gov.in", createdAt: "2025-01-01T00:00:00Z" },
  { id: 115, institutionCode: "DME-0015", dmeInstitutionId: "DME-0015", name: "Niloufer Hospital ,Hyderabad", type: "Hospital", facilityType: "Hospital", district: "Hyderabad", address: "Red Hills, Lakdikapul, Hyderabad, Telangana 500004", superintendentName: "Dr. T. Usha Rani", contactEmail: "superintendent.niloufer@tgmsidc.gov.in", createdAt: "2025-01-01T00:00:00Z" },
  { id: 116, institutionCode: "DME-0016", dmeInstitutionId: "DME-0016", name: "Osmania General Hospital,Hyderabad", type: "Hospital", facilityType: "Hospital", district: "Hyderabad", address: "Afzalgunj, Hyderabad, Telangana 500012", superintendentName: "Dr. B. Nagender", contactEmail: "superintendent@oghhyd.gov.in", createdAt: "2025-01-01T00:00:00Z" },
  { id: 117, institutionCode: "DME-0017", dmeInstitutionId: "DME-0017", name: "Sarojini Devi Eye Hospital", type: "Specialty Hospital", facilityType: "Specialty Hospital", district: "Hyderabad", address: "Mehdipatnam, Hyderabad, Telangana 500028", superintendentName: "Dr. V. Rajalingam", contactEmail: "superintendent.sdeh@tgmsidc.gov.in", createdAt: "2025-01-01T00:00:00Z" },
  { id: 1, institutionCode: "INST-0001", name: "Gandhi Hospital", type: "hospital", district: "Secunderabad", address: "Musheerabad, Hyderabad 500003", superintendentName: "Dr. K. Suresh", contactEmail: "super@gandhi.gov.in", createdAt: "2025-01-01T00:00:00Z" },
  { id: 2, institutionCode: "INST-0002", name: "Warangal District Hospital", type: "district_hospital", district: "Warangal", address: "Hanamkonda, Warangal 506001", superintendentName: "Dr. P. Reddy", contactEmail: "super@wdh.gov.in", createdAt: "2025-01-01T00:00:00Z" },
  { id: 3, institutionCode: "INST-0003", name: "Area Hospital, Vemulawada", type: "hospital", district: "Rajanna Sircilla", address: "Vemulawada - 505 302, Rajanna Sircilla Dist.", superintendentName: "Dr. K. Santhosh Chari", contactEmail: "super@ahvemulawada.gov.in", createdAt: "2025-01-01T00:00:00Z" },
  { id: 4, institutionCode: "INST-0004", name: "CHC Pitlam, Kamareddy", type: "chc", district: "Kamareddy", address: "Pitlam, Kamareddy District", superintendentName: "Dr. M. Lakshmi", contactEmail: "super@chcpitlam.gov.in", createdAt: "2025-01-01T00:00:00Z" },
  { id: 5, institutionCode: "INST-0005", name: "Nizam's Institute of Medical Sciences", type: "hospital", district: "Hyderabad", address: "Punjagutta, Hyderabad 500082", superintendentName: "Dr. A. Ramesh Kumar", contactEmail: "super@nims.gov.in", createdAt: "2025-01-01T00:00:00Z" },
];

export const mockVendors: Vendor[] = [
  { id: 1, vendorCode: "VND-0001", name: "BPL Medical Technologies Ltd", contactEmail: "procurement@bplmedical.in", contactPhone: "9848012345", address: "MIDC, Pune, Maharashtra 411019", gstNumber: "27AABCB1234C1Z5", isL1Bidder: false, performanceScore: 87, status: "active", createdAt: "2025-01-01T00:00:00Z" },
  { id: 2, vendorCode: "VND-0002", name: "Siemens Healthineers India Pvt Ltd", contactEmail: "bid@siemens-healthineers.in", contactPhone: "9848023456", address: "Sector 18, Gurugram, Haryana 122015", gstNumber: "06AAECS5678D1Z2", isL1Bidder: false, performanceScore: 94, status: "active", createdAt: "2025-01-01T00:00:00Z" },
  { id: 3, vendorCode: "VND-0003", name: "Nidek Medical India Pvt Ltd", contactEmail: "sales@nidekmedical.in", contactPhone: "9848034567", address: "Electronic City, Bengaluru, Karnataka 560100", gstNumber: "29AABCN2345E1Z8", isL1Bidder: false, performanceScore: 91, status: "active", createdAt: "2025-01-01T00:00:00Z" },
  { id: 4, vendorCode: "VND-0004", name: "M/s. Sri Srinivasa Agencies", contactEmail: "saisrinivasa123@gmail.com", contactPhone: "9391003370", address: "Flat No. 7-2-1813/5/A/1, 3rd Floor, H.No. 7-2-1813/5/A/1, 20B-348/HD/AP/2002/W, Sanathnagar, Hyderabad - 500018", gstNumber: "36ACWFS9933Q1ZO", isL1Bidder: true, performanceScore: 88, status: "active", createdAt: "2025-01-01T00:00:00Z" },
  { id: 5, vendorCode: "VND-0005", name: "M/s. Green Apple Medical Systems", contactEmail: "greenapplemedicalsystems@gmail.com", contactPhone: "040-23400046", address: "Flat No. E310, SVSS Nivas, H.No. 7-2-1813/5/A/1, Street No.1, Czech Colony, Sanathnagar, Hyderabad - 500 018", gstNumber: "36AADAG1234B1Z3", isL1Bidder: false, performanceScore: 92, status: "active", createdAt: "2025-01-01T00:00:00Z" },
  { id: 6, vendorCode: "VND-0006", name: "M/s. Bhargav Enterprises", contactEmail: "bhargav.enterprises@gmail.com", contactPhone: "9848056789", address: "Himayatnagar, Hyderabad 500029", gstNumber: "36AABFB4567C1Z1", isL1Bidder: false, performanceScore: 83, status: "active", createdAt: "2025-01-01T00:00:00Z" },
  { id: 7, vendorCode: "VND-0007", name: "Xcellance Medicaltechnologies Pvt Ltd", contactEmail: "info@xcellancemedical.in", contactPhone: "9848067890", address: "Bengaluru, Karnataka 560001", gstNumber: "29AABCX8901D1Z4", isL1Bidder: false, performanceScore: 89, status: "active", createdAt: "2025-01-01T00:00:00Z" },
];

export const mockEquipment: Equipment[] = [
  { id: 1, equipmentCode: "EQP-HV-001", name: "CT Scan Machine - 16 Slice", commonName: "CT Scan Machine", category: "Diagnostic Imaging", department: "Radiology", specifications: "16-slice sub-second rotation CT system with 3.5 MHU tube, ceramic detectors, iterative reconstruction, and 60 kVA online UPS.", estimatedUnitCost: 18500000, standardised: true, gstRate: 18, createdAt: "2025-01-01T00:00:00Z" },
  { id: 2, equipmentCode: "EQP-HV-002", name: "Mammography Machine - Digital", commonName: "Mammography Machine", category: "Diagnostic Imaging", department: "Radiology", specifications: "Full-field digital mammography (FFDM) system with amorphous selenium detector, high-resolution micro-focus tube, motorized compression, and dual 5MP review workstation.", estimatedUnitCost: 6500000, standardised: true, gstRate: 18, createdAt: "2025-01-01T00:00:00Z" },
  { id: 3, equipmentCode: "EQP-HV-003", name: "C-Arm Machine - Digital", commonName: "C-Arm Machine", category: "Diagnostic Imaging", department: "Orthopaedics / OT", specifications: "Mobile high-frequency digital C-arm system with 9-inch II/FPD, pulsed fluoroscopy, laser localizer, and dual monitor viewing cart.", estimatedUnitCost: 3200000, standardised: true, gstRate: 18, createdAt: "2025-01-01T00:00:00Z" },
  { id: 4, equipmentCode: "EQP-HV-004", name: "X-Ray Machine - 500 mA with DR/CR", commonName: "500 mA X-Ray Machine", category: "Diagnostic Imaging", department: "Radiology", specifications: "500 mA high-frequency multi-position general radiography system with 17x17 inch flat panel DR detector, 4-way floating top table, and vertical bucky stand.", estimatedUnitCost: 3500000, standardised: true, gstRate: 18, createdAt: "2025-01-01T00:00:00Z" },
  { id: 5, equipmentCode: "EQP-HV-005", name: "Computerised Radiography System", commonName: "CR System", category: "Diagnostic Imaging", department: "Radiology", specifications: "High-throughput computed radiography (CR) digitizer reader, 60+ plates/hour, multiple cassette formats, acquisition workstation, and dry laser imager.", estimatedUnitCost: 1400000, standardised: true, gstRate: 18, createdAt: "2025-01-01T00:00:00Z" },
  { id: 6, equipmentCode: "EQP-HV-006", name: "Colour Doppler Ultrasound System", commonName: "Colour Doppler", category: "Diagnostic Imaging", department: "Radiology / OBG", specifications: "Cart-based premium Colour Doppler ultrasound machine with 21.5-inch LED monitor, touch console, and convex, linear, and TVS broadband probes.", estimatedUnitCost: 2800000, standardised: true, gstRate: 12, createdAt: "2025-01-01T00:00:00Z" },
  { id: 7, equipmentCode: "EQP-HV-007", name: "Portable Ultrasound System with Colour Doppler", commonName: "Portable USG Colour Doppler", category: "Diagnostic Imaging", department: "Radiology / Emergency", specifications: "Rugged laptop-style point-of-care portable colour Doppler ultrasound system with 15-inch anti-glare display, dual active probe ports, and 2.5-hour battery operation.", estimatedUnitCost: 1600000, standardised: true, gstRate: 12, createdAt: "2025-01-01T00:00:00Z" },
  { id: 8, equipmentCode: "EQP-HV-008", name: "Anaesthesia Workstation with Integrated Ventilator", commonName: "Anaesthesia Workstation", category: "Operation Theatre", department: "Anaesthesia / OT", specifications: "Microprocessor-controlled anaesthesia workstation with integrated ventilator (adult/paediatric), dual vaporizers (Iso/Sevo), anti-hypoxic guard, and integrated respiratory gas monitor.", estimatedUnitCost: 2200000, standardised: true, gstRate: 12, createdAt: "2025-01-01T00:00:00Z" },
  { id: 9, equipmentCode: "EQP-HV-009", name: "ICU Ventilator - Adult and Paediatric", commonName: "ICU Ventilator", category: "Critical Care", department: "ICU / Emergency", specifications: "Advanced turbine-driven critical care ICU ventilator for adult and paediatric patients, comprehensive invasive/NIV modes, high flow O2 therapy, and 15-inch touch screen.", estimatedUnitCost: 1150000, standardised: true, gstRate: 12, createdAt: "2025-01-01T00:00:00Z" },
  { id: 10, equipmentCode: "EQP-HV-010", name: "Paediatric / Neonatal Ventilator", commonName: "Paediatric Ventilator", category: "Critical Care", department: "Paediatrics / SNCU", specifications: "Specialized neonatal & paediatric intensive care ventilator with proximal flow sensor, High Frequency Oscillation (HFO), Volume Guarantee, and tidal volumes down to 2 ml.", estimatedUnitCost: 1350000, standardised: true, gstRate: 12, createdAt: "2025-01-01T00:00:00Z" },
  { id: 11, equipmentCode: "EQP-HV-011", name: "ABG and Electrolyte Analyser", commonName: "ABG Analyser", category: "Laboratory", department: "ICU / Laboratory", specifications: "Automated cartridge-based arterial blood gas (ABG) and electrolyte analyser with co-oximetry, 65 µL sample volume, 45-second test cycle, and automated QC.", estimatedUnitCost: 650000, standardised: true, gstRate: 18, createdAt: "2025-01-01T00:00:00Z" },
  { id: 12, equipmentCode: "EQP-HV-012", name: "Fully Automated Biochemistry Analyser", commonName: "Biochemistry Analyser", category: "Laboratory", department: "Biochemistry Laboratory", specifications: "400+ photometric tests/hour random access clinical chemistry analyser with refrigerated reagent carousel, clot detection, ISE module, and bi-directional LIS interface.", estimatedUnitCost: 2500000, standardised: true, gstRate: 18, createdAt: "2025-01-01T00:00:00Z" },
  { id: 13, equipmentCode: "EQP-HV-013", name: "5-Part Haematology Analyser", commonName: "5-Part Cell Counter", category: "Laboratory", department: "Pathology Laboratory", specifications: "Automated 5-part differential haematology analyser with semiconductor laser flow cytometry, 60 samples/hour throughput, autoloader rack, and 28 reportable parameters.", estimatedUnitCost: 1800000, standardised: true, gstRate: 18, createdAt: "2025-01-01T00:00:00Z" },
  { id: 14, equipmentCode: "EQP-HV-014", name: "Horizontal High-Pressure Autoclave", commonName: "Horizontal Autoclave", category: "Sterilization", department: "CSSD / OT", specifications: "300 to 400 Litre horizontal high-pressure steam sterilizer with SS 316L inner chamber, built-in steam boiler, vacuum pump, microprocessor PLC control, and cycle printer.", estimatedUnitCost: 850000, standardised: true, gstRate: 18, createdAt: "2025-01-01T00:00:00Z" },
  { id: 15, equipmentCode: "EQP-HV-015", name: "Digital Dental OPG X-Ray System", commonName: "Dental OPG X-Ray", category: "Diagnostic Imaging", department: "Dental", specifications: "High-frequency digital orthopantomogram (OPG) and cephalometric extraoral X-ray system with direct CMOS sensor, 3-laser positioning, and DICOM 3.0 dental software.", estimatedUnitCost: 1950000, standardised: true, gstRate: 18, createdAt: "2025-01-01T00:00:00Z" },
  { id: 16, equipmentCode: "EQP-HV-016", name: "EEG Machine - Digital", commonName: "EEG Machine", category: "Neurodiagnostics", department: "Neurology / Radiology", specifications: "32-channel digital electroencephalography (EEG) system with 24-bit delta-sigma conversion, photic flash stimulator, video-EEG capability, and mobile cart workstation.", estimatedUnitCost: 950000, standardised: true, gstRate: 12, createdAt: "2025-01-01T00:00:00Z" },
  { id: 17, equipmentCode: "EQP-HV-017", name: "Laparoscopy Tower with Instruments", commonName: "Laparoscopy System", category: "Surgical Systems", department: "General Surgery / OBG", specifications: "Complete 4K Ultra-HD laparoscopy surgical tower with 3-chip CMOS camera, 300W LED light source, 45L heated CO2 insufflator, 32-inch 4K medical monitor, and reusable hand instrument set.", estimatedUnitCost: 3800000, standardised: true, gstRate: 12, createdAt: "2025-01-01T00:00:00Z" },
  { id: 18, equipmentCode: "EQP-HV-018", name: "Multipara Patient Monitor with EtCO2", commonName: "Multipara Monitor with EtCO2", category: "Patient Monitoring", department: "ICU / OT / Emergency", specifications: "12.1-inch color touchscreen modular patient monitor with ECG, SpO2, NIBP, Dual IBP, Dual Temp, and Sidestream/Microstream EtCO2 capnography module with 4-hr battery.", estimatedUnitCost: 240000, standardised: true, gstRate: 12, createdAt: "2025-01-01T00:00:00Z" },
  { id: 19, equipmentCode: "EQP-HV-019", name: "Biphasic Defibrillator with AED and Pacing", commonName: "Defibrillator", category: "Emergency Equipment", department: "ICU / Emergency / OT", specifications: "Biphasic manual/AED defibrillator with non-invasive transcutaneous pacing, 3/5-lead ECG, SpO2, pediatric convert paddles, 50mm strip chart recorder, and shock-resistant casing.", estimatedUnitCost: 380000, standardised: true, gstRate: 12, createdAt: "2025-01-01T00:00:00Z" },
  { id: 20, equipmentCode: "EQP-HV-020", name: "Dialysis Machine", commonName: "Haemodialysis Machine", category: "Renal Care", department: "Dialysis Unit", specifications: "Microprocessor-controlled single patient haemodialysis machine with volumetric ultrafiltration balancing chamber, blood pump, heparin pump, endotoxin filter, and automated chemical/heat disinfection.", estimatedUnitCost: 850000, standardised: true, gstRate: 12, createdAt: "2025-01-01T00:00:00Z" },
];

export const mockRateContracts: RateContract[] = [
  { id: 1, contractNumber: "RC/HPC/EQU/2025-26/0001", equipmentId: 1, equipmentName: "Digital X-Ray Machine (DR System)", vendorId: 1, vendorName: "BPL Medical Technologies Ltd", unitPrice: 850000, gstRate: 5, warrantyYears: 3, cmcCharges: 45000, cmcStartYear: 4, status: "active", startDate: "2025-04-01", endDate: "2026-03-31", createdAt: "2025-04-01T00:00:00Z", updatedAt: "2025-04-01T00:00:00Z" },
  { id: 2, contractNumber: "RC/HPC/EQU/2025-26/0002", equipmentId: 2, equipmentName: "ICU Ventilator", vendorId: 2, vendorName: "Siemens Healthineers India Pvt Ltd", unitPrice: 320000, gstRate: 12, warrantyYears: 2, cmcCharges: 28000, cmcStartYear: 3, status: "active", startDate: "2025-04-01", endDate: "2026-12-31", createdAt: "2025-04-01T00:00:00Z", updatedAt: "2025-04-01T00:00:00Z" },
  { id: 3, contractNumber: "RC/HPC/EQU/2025-26/0003", equipmentId: 3, equipmentName: "Fully Automated Biochemistry Analyser", vendorId: 3, vendorName: "Nidek Medical India Pvt Ltd", unitPrice: 1200000, gstRate: 12, warrantyYears: 3, cmcCharges: 72000, cmcStartYear: 4, status: "active", startDate: "2025-04-01", endDate: "2026-09-30", createdAt: "2025-04-01T00:00:00Z", updatedAt: "2025-04-01T00:00:00Z" },
  { id: 4, contractNumber: "RC/HPC/EQU/2025-26/0004", equipmentId: 6, equipmentName: "Surgical Diathermy / Cautery Machine", vendorId: 4, vendorName: "M/s. Sri Srinivasa Agencies", unitPrice: 185000, gstRate: 5, warrantyYears: 2, cmcCharges: 18000, cmcStartYear: 3, status: "active", startDate: "2025-04-01", endDate: "2027-03-31", createdAt: "2025-04-01T00:00:00Z", updatedAt: "2025-04-01T00:00:00Z" },
  { id: 5, contractNumber: "RC/HPC/EQU/2025-26/0005", equipmentId: 7, equipmentName: "Mammogram Compatible CR System", vendorId: 5, vendorName: "M/s. Green Apple Medical Systems", unitPrice: 650000, gstRate: 5, warrantyYears: 3, cmcCharges: 55000, cmcStartYear: 4, status: "active", startDate: "2025-04-01", endDate: "2027-03-31", createdAt: "2025-04-01T00:00:00Z", updatedAt: "2025-04-01T00:00:00Z" },
];

export const mockIndents: Indent[] = [
  { id: 1, indentNumber: "441A/591/HPC/EQU/2025-26", facilityId: 4, facilityName: "Govt. General Hospital, Sangareddy", equipmentId: 6, equipmentName: "Surgical Diathermy / Cautery Machine", quantity: 3, technicalRequirements: "Sigma+ model, HSN 90189099, 5% GST. Includes standard accessories: cord for mains (C020), footswitch single & double paddle, patient return electrode, monopolar handwriting pencil. Country of Origin: India", status: "po_issued", procurementMode: "rate_contract", rateContractId: 4, tenderId: null, rejectionReason: null, digitisedBy: "Clerk R. Sharma", approvedBy: "GM Equipment Wing", createdAt: "2025-12-01T09:00:00Z", updatedAt: "2026-01-11T11:00:00Z" },
  { id: 2, indentNumber: "216/418/HPC/EQU/Vemulawada/2022-23", facilityId: 5, facilityName: "Area Hospital, Vemulawada", equipmentId: 7, equipmentName: "Mammogram Compatible CR System", quantity: 1, technicalRequirements: "Fuji Film PCR Prima TM with DRY PIX Edge. For X-Ray / Radiology department. DICOM compatible. Installation and training required.", status: "po_issued", procurementMode: "rate_contract", rateContractId: 5, tenderId: null, rejectionReason: null, digitisedBy: "Clerk B. Rao", approvedBy: "GM Equipment Wing", createdAt: "2022-10-01T09:00:00Z", updatedAt: "2022-11-10T11:00:00Z" },
  { id: 3, indentNumber: "IND/HPC/EQU/WDH/2025-26/003", facilityId: 3, facilityName: "Warangal District Hospital", equipmentId: 3, equipmentName: "Fully Automated Biochemistry Analyser", quantity: 1, technicalRequirements: "≥400 tests/hr, ISE module, for new pathology lab", status: "po_issued", procurementMode: "rate_contract", rateContractId: 3, tenderId: null, rejectionReason: null, digitisedBy: "Clerk C. Verma", approvedBy: "GM Equipment Wing", createdAt: "2026-01-20T09:00:00Z", updatedAt: "2026-02-10T14:00:00Z" },
  { id: 4, indentNumber: "IND/HPC/EQU/OGH/2025-26/004", facilityId: 1, facilityName: "Osmania General Hospital", equipmentId: 5, equipmentName: "DEXA Scanner", quantity: 2, technicalRequirements: "Dual Energy X-Ray Absorptiometry for Endocrinology dept. BMD measurement, T-score/Z-score reporting. DICOM 3.0. Rate Contract period 2 years. As per TID No. 1A.67/HPC/EQU/2025-26.", status: "tender_initiated", procurementMode: "tender", rateContractId: null, tenderId: 1, rejectionReason: null, digitisedBy: "Clerk A. Sharma", approvedBy: "GM Equipment Wing", createdAt: "2025-12-15T09:00:00Z", updatedAt: "2026-01-03T09:00:00Z" },
  { id: 5, indentNumber: "IND/HPC/EQU/GH/2025-26/005", facilityId: 2, facilityName: "Gandhi Hospital", equipmentId: 2, equipmentName: "ICU Ventilator", quantity: 5, technicalRequirements: "Adult/Paediatric modes, PEEP support, for new ICU block", status: "pending_approval", procurementMode: null, rateContractId: null, tenderId: null, rejectionReason: null, digitisedBy: "Clerk B. Rao", approvedBy: null, createdAt: "2026-04-05T10:00:00Z", updatedAt: "2026-04-05T10:00:00Z" },
  { id: 6, indentNumber: "IND/HPC/EQU/NIMS/2025-26/006", facilityId: 7, facilityName: "Nizam's Institute of Medical Sciences", equipmentId: 1, equipmentName: "Digital X-Ray Machine (DR System)", quantity: 2, technicalRequirements: "Portable DR system for radiology wing. DICOM 3.0 compatible. AEC mandatory.", status: "pending_approval", procurementMode: null, rateContractId: null, tenderId: null, rejectionReason: null, digitisedBy: "Clerk D. Singh", approvedBy: null, createdAt: "2026-04-10T09:00:00Z", updatedAt: "2026-04-10T09:00:00Z" },
  { id: 7, indentNumber: "IND/HPC/EQU/CHC/KMR/2025-26/007", facilityId: 6, facilityName: "CHC Pitlam, Kamareddy", equipmentId: 8, equipmentName: "Patient Monitor (Multi-Parameter)", quantity: 4, technicalRequirements: "ECG, SpO₂, NIBP, Temp, EtCO₂; for newly constructed ward. 12.1\" colour display. Battery backup min 4 hrs.", status: "pending_approval", procurementMode: null, rateContractId: null, tenderId: null, rejectionReason: null, digitisedBy: "Clerk E. Reddy", approvedBy: null, createdAt: "2026-04-12T09:00:00Z", updatedAt: "2026-04-12T09:00:00Z" },
];

export const mockTenders: Tender[] = [
  {
    id: 1,
    tenderNumber: "1A.67/HPC/EQU/2025-26",
    indentId: 4,
    equipmentName: "DEXA Scanner",
    status: "bids_received",
    tenderInvitedDate: "2026-01-03",
    bidsReceivedDate: "2026-01-20",
    l1BidderName: null,
    l1BidderAmount: null,
    notes: "Tender ID: 662453. Published on 16.04.2025 in The Hindu (English) and Velugu (Telugu). 3 qualified bids received. Technical bids opened 20-01-2026 04:00 PM. Document verification scheduled at HPC HQ, DM&HS Campus, Koti, Hyderabad. EMD as per Annexure-1. Tender Processing Fee: ₹23,600 (incl. 18% GST). Bid Validity: 90 days.",
    createdAt: "2026-01-03T00:00:00Z",
    updatedAt: "2026-01-20T00:00:00Z",
  },
  {
    id: 2,
    tenderNumber: "3A.12/HPC/EQU/2024-25",
    indentId: 3,
    equipmentName: "ICU Ventilator (Adult/Paediatric)",
    status: "awarded",
    tenderInvitedDate: "2024-11-10",
    bidsReceivedDate: "2024-12-05",
    l1BidderName: "Siemens Healthineers India Pvt Ltd",
    l1BidderAmount: 315000,
    notes: "Tender ID: 589124. Published in The Hindu (English Daily) and Velugu (Telugu Daily) on 10-Nov-2024. 4 technically qualified bids received. L1 bidder: Siemens Healthineers India Pvt Ltd @ ₹3,15,000/unit. Rate Contract period: 2 years. Awarded vide G.O. Rt. No. 4521/DM&HS/2025 dt. 15-Jan-2025. EMD: ₹1,25,000 via RTGS. TPF: ₹23,600 (incl. GST).",
    createdAt: "2024-11-10T00:00:00Z",
    updatedAt: "2025-01-15T00:00:00Z",
  },
  {
    id: 3,
    tenderNumber: "5C.23/HPC/EQU/2025-26",
    indentId: 4,
    equipmentName: "Ultrasound Machine (Colour Doppler)",
    status: "technical_evaluation",
    tenderInvitedDate: "2026-02-18",
    bidsReceivedDate: "2026-03-12",
    l1BidderName: null,
    l1BidderAmount: null,
    notes: "Tender ID: 721893. Published in The Hindu and Velugu on 18-Feb-2026. 5 bids received. Technical evaluation underway by Er. K. Srinivas (GM Equipment) and external consultant (AIIMS Hyderabad). Document verification completed 14-Mar-2026. Financial bids sealed — to be opened post technical qualification. EMD: ₹97,500. TPF: ₹23,600. Bid Validity: 90 days from 12-Mar-2026.",
    createdAt: "2026-02-18T00:00:00Z",
    updatedAt: "2026-03-12T00:00:00Z",
  },
];

export const mockPurchaseOrders: PurchaseOrder[] = [
  {
    id: 1,
    poNumber: "441A/591/HPC/EQU/2025-26",
    indentId: 1,
    rateContractId: 4,
    vendorId: 4,
    vendorName: "M/s. Sri Srinivasa Agencies",
    equipmentId: 6,
    equipmentName: "Surgical Diathermy / Cautery Machine (Sigma+)",
    quantity: 3,
    unitPrice: 185000,
    gstRate: 5,
    totalAmount: 582750,
    status: "delivered",
    deliveryAddress: "The Medical Superintendent, GGH, Sangareddy, Sangareddy - 502001, Medak Dist.",
    expectedDeliveryDate: "2026-03-01",
    actualDeliveryDate: "2026-03-14",
    cancellationReason: null,
    createdAt: "2026-01-11T10:00:00Z",
    updatedAt: "2026-03-14T12:00:00Z",
  },
  {
    id: 2,
    poNumber: "216/418/HPC/EQU/Vemulawada/2022-23",
    indentId: 2,
    rateContractId: 5,
    vendorId: 5,
    vendorName: "M/s. Green Apple Medical Systems",
    equipmentId: 7,
    equipmentName: "Mammogram Compatible CR System (Fuji Film)",
    quantity: 1,
    unitPrice: 650000,
    gstRate: 5,
    totalAmount: 682500,
    status: "delivered",
    deliveryAddress: "The Medical Superintendent, Area Hospital, Vemulawada - 505 302, Rajanna Sircilla Dist.",
    expectedDeliveryDate: "2022-11-10",
    actualDeliveryDate: "2022-11-02",
    cancellationReason: null,
    createdAt: "2022-10-15T09:00:00Z",
    updatedAt: "2022-11-21T00:00:00Z",
  },
  {
    id: 3,
    poNumber: "IND/HPC/EQU/WDH/PO/2026/003",
    indentId: 3,
    rateContractId: 3,
    vendorId: 3,
    vendorName: "Nidek Medical India Pvt Ltd",
    equipmentId: 3,
    equipmentName: "Fully Automated Biochemistry Analyser",
    quantity: 1,
    unitPrice: 1200000,
    gstRate: 12,
    totalAmount: 1344000,
    status: "draft",
    deliveryAddress: "Pathology Laboratory, Warangal District Hospital, Hanamkonda, Warangal 506001",
    expectedDeliveryDate: "2026-06-30",
    actualDeliveryDate: null,
    cancellationReason: null,
    createdAt: "2026-02-10T09:00:00Z",
    updatedAt: "2026-02-10T09:00:00Z",
  },
];

export const mockDeliveries: Delivery[] = [
  {
    id: 1,
    qrCode: "SSA/0506/25-26",
    purchaseOrderId: 1,
    poNumber: "441A/591/HPC/EQU/2025-26",
    vendorId: 4,
    vendorName: "M/s. Sri Srinivasa Agencies",
    facilityId: 4,
    facilityName: "Govt. General Hospital, Sangareddy",
    equipmentName: "Surgical Diathermy / Cautery Machine (Sigma+) — 3 Units with 15 accessories",
    quantity: 45,
    status: "qa_passed",
    dispatchDate: "2026-03-08",
    deliveredDate: "2026-03-14",
    qaComplianceScore: 100,
    qaNotes: "All 3 main units received with complete accessories (15 line items, 45 Nos. total). Serial Nos: SP426A04AL, SP426A05L, SP426A05Q. HSN/SAC: 90189099, GST 5%. Delivery Note No. SSA/0506/25-26 dated 14-Mar-26. Received in Good Condition (GGH Sangareddy Stores stamp). Buyer Order Ref: 441A/591/HPC/EQU/2025-26 dt. 11-Mar-26. Tax Amount: NIL.",
    discrepancyNotes: null,
    documentsUploaded: true,
    acceptanceCertificateIssued: false,
    createdAt: "2026-03-08T00:00:00Z",
    updatedAt: "2026-03-14T00:00:00Z",
  },
  {
    id: 2,
    qrCode: "GAMS/01650/22-23",
    purchaseOrderId: 2,
    poNumber: "216/418/HPC/EQU/Vemulawada/2022-23",
    vendorId: 5,
    vendorName: "M/s. Green Apple Medical Systems",
    facilityId: 5,
    facilityName: "Area Hospital, Vemulawada",
    equipmentName: "Mammogram Compatible CR System — Fuji Film PCR Prima TM with DRY PIX Edge",
    quantity: 1,
    status: "accepted",
    dispatchDate: "2022-11-02",
    deliveredDate: "2022-11-02",
    qaComplianceScore: 100,
    qaNotes: "Delivery Challan: GAMS/01650/22-23 dt. 02.11.2022. Invoice: GAMS/01533/22-23 dt. 02.11.2022. Serial No.: 265F0021, 26130938. Warranty: 21/11/2022 – 30/11/2025. Installed and commissioned 21/11/2022. Annexure 6 signed by Head of Dept (K. Santhosh Chari, CAS, Paediatrics) and Service Engineer (D. Anil, 7995313331, Green Apple Medical Systems).",
    discrepancyNotes: null,
    documentsUploaded: true,
    acceptanceCertificateIssued: true,
    createdAt: "2022-11-02T00:00:00Z",
    updatedAt: "2022-11-21T00:00:00Z",
  },
  {
    id: 3,
    qrCode: "QR-2026-WDH-003",
    purchaseOrderId: 3,
    poNumber: "IND/HPC/EQU/WDH/PO/2026/003",
    vendorId: 3,
    vendorName: "Nidek Medical India Pvt Ltd",
    facilityId: 3,
    facilityName: "Warangal District Hospital",
    equipmentName: "Fully Automated Biochemistry Analyser",
    quantity: 1,
    status: "qa_pending",
    dispatchDate: null,
    deliveredDate: null,
    qaComplianceScore: null,
    qaNotes: null,
    discrepancyNotes: null,
    documentsUploaded: false,
    acceptanceCertificateIssued: false,
    createdAt: "2026-04-08T12:00:00Z",
    updatedAt: "2026-04-08T12:00:00Z",
  },
];

export const mockDashboard: DashboardSummary = {
  totalIndents: 7,
  pendingApproval: 3,
  activeRateContracts: 5,
  activePurchaseOrders: 3,
  deliveriesPendingQA: 1,
  expiringContracts: 1,
  totalVendors: 7,
  totalInstitutions: 7,
  avgProcycleDays: 18.4,
  qaRejectionRate: 0,
};

export const mockPipeline: PipelineStage[] = [
  { stage: "Pending Approval", count: 3, percentage: 43 },
  { stage: "Approved", count: 0, percentage: 0 },
  { stage: "Linked to RC", count: 0, percentage: 0 },
  { stage: "Tender Initiated", count: 1, percentage: 14 },
  { stage: "PO Issued", count: 3, percentage: 43 },
  { stage: "Rejected", count: 0, percentage: 0 },
];

export const mockActivity: ActivityItem[] = [
  { id: 1, type: "indent_approved", description: "Indent 441A/591/HPC/EQU/2025-26 approved — Surgical Diathermy linked to RC/HPC/EQU/2025-26/0004 (M/s. Sri Srinivasa Agencies)", entityId: 1, entityType: "indent", timestamp: "2026-01-11T11:00:00Z", actor: "GM Equipment Wing" },
  { id: 2, type: "po_created", description: "PO 441A/591/HPC/EQU/2025-26 issued to M/s. Sri Srinivasa Agencies for 3 Surgical Diathermy Units — GGH Sangareddy", entityId: 1, entityType: "purchase_order", timestamp: "2026-01-11T12:00:00Z", actor: "Finance Wing" },
  { id: 3, type: "qa_passed", description: "Delivery Note SSA/0506/25-26 — 45 Nos. received at GGH Sangareddy. QA 100%. Recd. in Good Condition (14-Mar-26)", entityId: 1, entityType: "delivery", timestamp: "2026-03-14T14:00:00Z", actor: "Biomedical Engineer T. Ramaiah" },
  { id: 4, type: "indent_submitted", description: "New indent IND/HPC/EQU/CHC/KMR/2025-26/007 — 4 Patient Monitors for CHC Pitlam, Kamareddy District", entityId: 7, entityType: "indent", timestamp: "2026-04-12T09:00:00Z", actor: "Clerk E. Reddy" },
  { id: 5, type: "tender_update", description: "Technical bids opened for Tender 1A.67/HPC/EQU/2025-26 (DEXA Scanner) — 3 bids received. Tender ID: 662453", entityId: 1, entityType: "tender", timestamp: "2026-01-20T16:00:00Z", actor: "Tender Cell, GM Equipment Wing" },
  { id: 6, type: "indent_approved", description: "Installation/Acceptance Certificate (Annexure 6) signed — Mammogram CR at AH Vemulawada. Installation date: 21/11/2022", entityId: 2, entityType: "delivery", timestamp: "2022-11-21T11:00:00Z", actor: "Dr. K. Santhosh Chari (Head of Dept)" },
];

export const mockSlaMetrics: SlaMetrics = {
  avgIndentToApprovalDays: 3.2,
  avgApprovalToPoDays: 7.8,
  avgPoToDeliveryDays: 21.4,
  slaBreaches: 4,
  onTrackCount: 23,
};

export const mockVendorPerformance: VendorPerformance[] = [
  { vendorId: 1, vendorName: "BPL Medical Technologies Ltd", totalOrders: 8, onTimeDeliveries: 6, qaPassRate: 87.5, avgLeadTimeDays: 42, performanceScore: 87 },
  { vendorId: 2, vendorName: "Siemens Healthineers India Pvt Ltd", totalOrders: 12, onTimeDeliveries: 11, qaPassRate: 96, avgLeadTimeDays: 35, performanceScore: 94 },
  { vendorId: 3, vendorName: "Nidek Medical India Pvt Ltd", totalOrders: 5, onTimeDeliveries: 5, qaPassRate: 100, avgLeadTimeDays: 30, performanceScore: 91 },
  { vendorId: 4, vendorName: "M/s. Sri Srinivasa Agencies", totalOrders: 6, onTimeDeliveries: 6, qaPassRate: 100, avgLeadTimeDays: 22, performanceScore: 96 },
  { vendorId: 5, vendorName: "M/s. Green Apple Medical Systems", totalOrders: 4, onTimeDeliveries: 4, qaPassRate: 100, avgLeadTimeDays: 18, performanceScore: 98 },
  { vendorId: 6, vendorName: "M/s. Bhargav Enterprises", totalOrders: 3, onTimeDeliveries: 2, qaPassRate: 90, avgLeadTimeDays: 35, performanceScore: 83 },
];

// ─── INVENTORY / SUPPLY CHAIN MOCK DATA ────────────────────────────────────

export interface FacilityStockPosition {
  facilityId: number;
  facilityName: string;
  district: string;
  itemId: number;
  itemName: string;
  itemCode: string;
  category: string;
  unit: string;
  stockOnHand: number;
  usableStock: number;
  blockedStock: number;
  stockInTransit: number;
  pendingIndentQty: number;
  nearExpiryStock: number;
  avgMonthlyConsumption: number;
  stockCoverDays: number;
  suggestedIndentQty: number;
  riskLevel: "normal" | "warning" | "high_risk" | "justification_required";
  unitPrice: number;
}

export const mockStockPositions: FacilityStockPosition[] = [
  { facilityId: 1, facilityName: "Osmania General Hospital", district: "Hyderabad", itemId: 9, itemName: "High-Flow Nasal Cannula (HFNC) Respiratory System", itemCode: "EQP-0009", category: "icu", unit: "Unit", stockOnHand: 14, usableStock: 12, blockedStock: 2, stockInTransit: 4, pendingIndentQty: 6, nearExpiryStock: 0, avgMonthlyConsumption: 2, stockCoverDays: 180, suggestedIndentQty: 0, riskLevel: "normal", unitPrice: 220000 },
  { facilityId: 1, facilityName: "Osmania General Hospital", district: "Hyderabad", itemId: 12, itemName: "High-End Anesthesia Workstation with Multi-Gas Monitor", itemCode: "EQP-0012", category: "operation_theatre", unit: "Unit", stockOnHand: 6, usableStock: 6, blockedStock: 0, stockInTransit: 0, pendingIndentQty: 0, nearExpiryStock: 0, avgMonthlyConsumption: 1, stockCoverDays: 180, suggestedIndentQty: 2, riskLevel: "normal", unitPrice: 850000 },
  { facilityId: 1, facilityName: "Osmania General Hospital", district: "Hyderabad", itemId: 8, itemName: "Patient Monitor (Multi-Parameter)", itemCode: "EQP-0008", category: "icu", unit: "No.", stockOnHand: 8, usableStock: 8, blockedStock: 0, stockInTransit: 0, pendingIndentQty: 0, nearExpiryStock: 0, avgMonthlyConsumption: 0, stockCoverDays: 999, suggestedIndentQty: 0, riskLevel: "normal", unitPrice: 85000 },
  { facilityId: 2, facilityName: "Gandhi Hospital", district: "Secunderabad", itemId: 9, itemName: "High-Flow Nasal Cannula (HFNC) Respiratory System", itemCode: "EQP-0009", category: "icu", unit: "Unit", stockOnHand: 2, usableStock: 2, blockedStock: 0, stockInTransit: 0, pendingIndentQty: 5, nearExpiryStock: 0, avgMonthlyConsumption: 2, stockCoverDays: 30, suggestedIndentQty: 4, riskLevel: "high_risk", unitPrice: 220000 },
  { facilityId: 2, facilityName: "Gandhi Hospital", district: "Secunderabad", itemId: 12, itemName: "High-End Anesthesia Workstation with Multi-Gas Monitor", itemCode: "EQP-0012", category: "operation_theatre", unit: "Unit", stockOnHand: 1, usableStock: 1, blockedStock: 0, stockInTransit: 0, pendingIndentQty: 2, nearExpiryStock: 0, avgMonthlyConsumption: 1, stockCoverDays: 30, suggestedIndentQty: 3, riskLevel: "high_risk", unitPrice: 850000 },
  { facilityId: 2, facilityName: "Gandhi Hospital", district: "Secunderabad", itemId: 2, itemName: "ICU Ventilator", itemCode: "EQP-0002", category: "icu", unit: "No.", stockOnHand: 5, usableStock: 5, blockedStock: 0, stockInTransit: 5, pendingIndentQty: 5, nearExpiryStock: 0, avgMonthlyConsumption: 0, stockCoverDays: 999, suggestedIndentQty: 0, riskLevel: "justification_required", unitPrice: 320000 },
  { facilityId: 3, facilityName: "Warangal District Hospital", district: "Warangal", itemId: 9, itemName: "High-Flow Nasal Cannula (HFNC) Respiratory System", itemCode: "EQP-0009", category: "icu", unit: "Unit", stockOnHand: 8, usableStock: 7, blockedStock: 1, stockInTransit: 2, pendingIndentQty: 0, nearExpiryStock: 0, avgMonthlyConsumption: 1, stockCoverDays: 210, suggestedIndentQty: 0, riskLevel: "warning", unitPrice: 220000 },
  { facilityId: 3, facilityName: "Warangal District Hospital", district: "Warangal", itemId: 12, itemName: "High-End Anesthesia Workstation with Multi-Gas Monitor", itemCode: "EQP-0012", category: "operation_theatre", unit: "Unit", stockOnHand: 3, usableStock: 3, blockedStock: 0, stockInTransit: 0, pendingIndentQty: 0, nearExpiryStock: 0, avgMonthlyConsumption: 1, stockCoverDays: 90, suggestedIndentQty: 0, riskLevel: "normal", unitPrice: 850000 },
  { facilityId: 4, facilityName: "Govt. General Hospital, Sangareddy", district: "Sangareddy", itemId: 9, itemName: "High-Flow Nasal Cannula (HFNC) Respiratory System", itemCode: "EQP-0009", category: "icu", unit: "Unit", stockOnHand: 0, usableStock: 0, blockedStock: 0, stockInTransit: 0, pendingIndentQty: 3, nearExpiryStock: 0, avgMonthlyConsumption: 1, stockCoverDays: 0, suggestedIndentQty: 3, riskLevel: "high_risk", unitPrice: 220000 },
  { facilityId: 4, facilityName: "Govt. General Hospital, Sangareddy", district: "Sangareddy", itemId: 12, itemName: "High-End Anesthesia Workstation with Multi-Gas Monitor", itemCode: "EQP-0012", category: "operation_theatre", unit: "Unit", stockOnHand: 4, usableStock: 4, blockedStock: 0, stockInTransit: 0, pendingIndentQty: 0, nearExpiryStock: 0, avgMonthlyConsumption: 1, stockCoverDays: 120, suggestedIndentQty: 0, riskLevel: "normal", unitPrice: 850000 },
  { facilityId: 5, facilityName: "Area Hospital, Vemulawada", district: "Rajanna Sircilla", itemId: 9, itemName: "High-Flow Nasal Cannula (HFNC) Respiratory System", itemCode: "EQP-0009", category: "icu", unit: "Unit", stockOnHand: 3, usableStock: 3, blockedStock: 0, stockInTransit: 0, pendingIndentQty: 0, nearExpiryStock: 0, avgMonthlyConsumption: 1, stockCoverDays: 90, suggestedIndentQty: 1, riskLevel: "normal", unitPrice: 220000 },
  { facilityId: 6, facilityName: "CHC Pitlam, Kamareddy", district: "Kamareddy", itemId: 9, itemName: "High-Flow Nasal Cannula (HFNC) Respiratory System", itemCode: "EQP-0009", category: "icu", unit: "Unit", stockOnHand: 1, usableStock: 1, blockedStock: 0, stockInTransit: 0, pendingIndentQty: 2, nearExpiryStock: 0, avgMonthlyConsumption: 1, stockCoverDays: 30, suggestedIndentQty: 2, riskLevel: "warning", unitPrice: 220000 },
  { facilityId: 7, facilityName: "Nizam's Institute of Medical Sciences", district: "Hyderabad", itemId: 9, itemName: "High-Flow Nasal Cannula (HFNC) Respiratory System", itemCode: "EQP-0009", category: "icu", unit: "Unit", stockOnHand: 18, usableStock: 18, blockedStock: 0, stockInTransit: 0, pendingIndentQty: 4, nearExpiryStock: 0, avgMonthlyConsumption: 3, stockCoverDays: 180, suggestedIndentQty: 0, riskLevel: "normal", unitPrice: 220000 },
  { facilityId: 7, facilityName: "Nizam's Institute of Medical Sciences", district: "Hyderabad", itemId: 12, itemName: "High-End Anesthesia Workstation with Multi-Gas Monitor", itemCode: "EQP-0012", category: "operation_theatre", unit: "Unit", stockOnHand: 8, usableStock: 8, blockedStock: 0, stockInTransit: 2, pendingIndentQty: 0, nearExpiryStock: 0, avgMonthlyConsumption: 2, stockCoverDays: 120, suggestedIndentQty: 1, riskLevel: "normal", unitPrice: 850000 },
];

export interface QuarantineLotStatusEntry { status: string; date: string; remarks: string; user: string; }
export interface QuarantineLot {
  id: number;
  lotNumber: string;
  itemId: number;
  itemName: string;
  itemCode: string;
  warehouseName: string;
  quantity: number;
  unit: string;
  batchNumber: string;
  expiryDate: string;
  receivedDate: string;
  status: "received" | "under_quarantine" | "sample_pending" | "sample_collected" | "sent_for_testing" | "result_awaited" | "approved" | "rejected" | "released";
  statusHistory: QuarantineLotStatusEntry[];
  slaDays: number;
  agingDays: number;
  slaBreached: boolean;
  sampleCollectionDate?: string;
  testingReference?: string;
  labName?: string;
  labResultDate?: string;
  releaseRejectionRemarks?: string;
  documents: string[];
  vendorId: number;
  vendorName: string;
}

export const mockQuarantineLots: QuarantineLot[] = [
  {
    id: 1, lotNumber: "QAR/2026/001", itemId: 9, itemName: "High-Flow Nasal Cannula (HFNC) Respiratory System", itemCode: "EQP-0009",
    warehouseName: "Central Biomedical Equipment Warehouse, Hyderabad", quantity: 5, unit: "Unit",
    batchNumber: "HFC/2026/B001", expiryDate: "2031-03-31", receivedDate: "2026-05-10",
    status: "result_awaited", slaDays: 21, agingDays: 41, slaBreached: true,
    sampleCollectionDate: "2026-05-14", testingReference: "SAMEER/HYD/2026/4421", labName: "SAMEER Bio-Medical Testing & Calibration Laboratory, Hyderabad",
    documents: ["Delivery Challan — HFC-DC-2026-001.pdf", "Manufacturer Calibration Cert — SNo B001.pdf"],
    vendorId: 6, vendorName: "M/s. Bhargav Enterprises",
    statusHistory: [
      { status: "received", date: "2026-05-10", remarks: "5 units received from M/s Bhargav Enterprises. Challan: HFC-DC-2026-001.", user: "Warehouse Officer R. Prasad" },
      { status: "under_quarantine", date: "2026-05-10", remarks: "Moved to biomedical testing bay B-3.", user: "Warehouse Officer R. Prasad" },
      { status: "sample_pending", date: "2026-05-11", remarks: "Awaiting biomedical engineering verification.", user: "System" },
      { status: "sample_collected", date: "2026-05-14", remarks: "Electromedical safety and flow calibration verified.", user: "Biomedical Engineer S. Devi" },
      { status: "sent_for_testing", date: "2026-05-16", remarks: "Dispatched to SAMEER Hyderabad for calibration. Ref: SAMEER/HYD/2026/4421.", user: "Biomedical Engineer S. Devi" },
      { status: "result_awaited", date: "2026-05-16", remarks: "Awaiting calibration certificate. SLA: 21 days from receipt.", user: "System" },
    ],
  },
  {
    id: 2, lotNumber: "QAR/2026/002", itemId: 12, itemName: "High-End Anesthesia Workstation with Multi-Gas Monitor", itemCode: "EQP-0012",
    warehouseName: "Central Biomedical Equipment Warehouse, Hyderabad", quantity: 2, unit: "Unit",
    batchNumber: "ANS/2026/A120", expiryDate: "2036-06-30", receivedDate: "2026-06-01",
    status: "sample_pending", slaDays: 21, agingDays: 19, slaBreached: false,
    documents: ["Delivery Challan — ANS-DC-2026-120.pdf"],
    vendorId: 4, vendorName: "M/s. Sri Srinivasa Agencies",
    statusHistory: [
      { status: "received", date: "2026-06-01", remarks: "2 units received. Delivery Note: ANS-DC-2026-120.", user: "Warehouse Officer R. Prasad" },
      { status: "under_quarantine", date: "2026-06-01", remarks: "Placed in pre-installation holding bay.", user: "Warehouse Officer R. Prasad" },
      { status: "sample_pending", date: "2026-06-02", remarks: "Pending joint technical inspection.", user: "System" },
    ],
  },
  {
    id: 3, lotNumber: "QAR/2026/003", itemId: 9, itemName: "High-Flow Nasal Cannula (HFNC) Respiratory System", itemCode: "EQP-0009",
    warehouseName: "Regional Equipment Warehouse, Warangal", quantity: 3, unit: "Unit",
    batchNumber: "HFC/2026/B002", expiryDate: "2031-12-31", receivedDate: "2026-06-05",
    status: "approved", slaDays: 21, agingDays: 15, slaBreached: false,
    sampleCollectionDate: "2026-06-07", testingReference: "CAL/WGL/2026/0812", labName: "Regional Bio-Medical Calibration Lab, Warangal",
    labResultDate: "2026-06-15", releaseRejectionRemarks: "All electrical safety and flow rate parameters conform to IEC 60601-1. Calibration certificate verified. Approved for dispatch to facility.",
    documents: ["Calibration Cert — Batch B002.pdf", "Lab Report CAL/WGL/0812.pdf"],
    vendorId: 6, vendorName: "M/s. Bhargav Enterprises",
    statusHistory: [
      { status: "received", date: "2026-06-05", remarks: "3 units received.", user: "Warehouse Officer K. Raju" },
      { status: "under_quarantine", date: "2026-06-05", remarks: "Equipment holding bay B-2.", user: "Warehouse Officer K. Raju" },
      { status: "sample_pending", date: "2026-06-06", remarks: "", user: "System" },
      { status: "sample_collected", date: "2026-06-07", remarks: "Tested by Biomedical Engineer.", user: "Biomedical Engineer M. Rao" },
      { status: "sent_for_testing", date: "2026-06-08", remarks: "Sent to Regional Calibration Lab Warangal.", user: "Biomedical Engineer M. Rao" },
      { status: "result_awaited", date: "2026-06-08", remarks: "", user: "System" },
      { status: "approved", date: "2026-06-15", remarks: "All parameters conform to technical specifications.", user: "Biomedical Supervisor P. Laxmi" },
    ],
  },
  {
    id: 4, lotNumber: "QAR/2026/004", itemId: 8, itemName: "Patient Monitor (Multi-Parameter)", itemCode: "EQP-0008",
    warehouseName: "Central Biomedical Equipment Warehouse, Hyderabad", quantity: 12, unit: "No.",
    batchNumber: "PM/2026/0044", expiryDate: "2031-12-31", receivedDate: "2026-06-10",
    status: "under_quarantine", slaDays: 14, agingDays: 10, slaBreached: false,
    documents: ["Packing List — PM-PL-2026-044.pdf"],
    vendorId: 1, vendorName: "BPL Medical Technologies Ltd",
    statusHistory: [
      { status: "received", date: "2026-06-10", remarks: "12 units received from BPL Medical. Packing List: PM-PL-2026-044.", user: "Warehouse Officer R. Prasad" },
      { status: "under_quarantine", date: "2026-06-10", remarks: "Physical inspection pending. Awaiting biomedical engineer assignment.", user: "Warehouse Officer R. Prasad" },
    ],
  },
  {
    id: 5, lotNumber: "QAR/2026/005", itemId: 12, itemName: "High-End Anesthesia Workstation with Multi-Gas Monitor", itemCode: "EQP-0012",
    warehouseName: "Regional Equipment Warehouse, Karimnagar", quantity: 1, unit: "Unit",
    batchNumber: "ANS/2025/Z089", expiryDate: "2035-09-30", receivedDate: "2026-03-15",
    status: "rejected", slaDays: 21, agingDays: 97, slaBreached: true,
    sampleCollectionDate: "2026-03-18", testingReference: "CAL/KNR/2026/0309", labName: "Bio-Medical Calibration Lab, Karimnagar",
    labResultDate: "2026-04-02", releaseRejectionRemarks: "Failed paramagnetic O2 sensor linearity test. Unit non-conforming to tender specifications. Returned to vendor M/s Bhargav Enterprises for replacement.",
    documents: ["Lab Rejection Report.pdf", "Return Note to Vendor.pdf"],
    vendorId: 6, vendorName: "M/s. Bhargav Enterprises",
    statusHistory: [
      { status: "received", date: "2026-03-15", remarks: "1 unit received.", user: "Warehouse Officer T. Kumar" },
      { status: "under_quarantine", date: "2026-03-15", remarks: "", user: "Warehouse Officer T. Kumar" },
      { status: "sample_pending", date: "2026-03-16", remarks: "", user: "System" },
      { status: "sample_collected", date: "2026-03-18", remarks: "Inspected by Calibration team.", user: "Biomedical Engineer B. Sai" },
      { status: "sent_for_testing", date: "2026-03-20", remarks: "Sent to Calibration Lab Karimnagar.", user: "Biomedical Engineer B. Sai" },
      { status: "result_awaited", date: "2026-03-20", remarks: "", user: "System" },
      { status: "rejected", date: "2026-04-02", remarks: "Failed paramagnetic O2 sensor test. Non-conforming.", user: "Biomedical Supervisor P. Laxmi" },
    ],
  },
  {
    id: 6, lotNumber: "QAR/2026/006", itemId: 9, itemName: "High-Flow Nasal Cannula (HFNC) Respiratory System", itemCode: "EQP-0009",
    warehouseName: "Central Biomedical Equipment Warehouse, Hyderabad", quantity: 6, unit: "Unit",
    batchNumber: "HFC/2026/B003", expiryDate: "2031-06-30", receivedDate: "2026-06-15",
    status: "sample_collected", slaDays: 21, agingDays: 5, slaBreached: false,
    sampleCollectionDate: "2026-06-17",
    documents: ["Delivery Challan — HFC-DC-2026-003.pdf"],
    vendorId: 6, vendorName: "M/s. Bhargav Enterprises",
    statusHistory: [
      { status: "received", date: "2026-06-15", remarks: "6 units received.", user: "Warehouse Officer R. Prasad" },
      { status: "under_quarantine", date: "2026-06-15", remarks: "Holding bay B-4.", user: "Warehouse Officer R. Prasad" },
      { status: "sample_pending", date: "2026-06-16", remarks: "", user: "System" },
      { status: "sample_collected", date: "2026-06-17", remarks: "Biomedical electrical safety verified.", user: "Biomedical Engineer S. Devi" },
    ],
  },
];

export interface StockTransfer {
  id: number;
  transferNumber: string;
  sourceId: number;
  sourceName: string;
  destinationId: number;
  destinationName: string;
  itemId: number;
  itemName: string;
  itemCode: string;
  batchNumber: string;
  expiryDate: string;
  quantity: number;
  unit: string;
  priority: "normal" | "urgent" | "critical";
  status: "draft" | "pending_approval" | "approved" | "dispatched" | "received" | "closed" | "rejected";
  remarks: string;
  initiatedBy: string;
  approvedBy?: string;
  approvedAt?: string;
  dispatchedAt?: string;
  receivedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export const mockStockTransfers: StockTransfer[] = [
  { id: 1, transferNumber: "TRF/2026/001", sourceId: 1, sourceName: "Osmania General Hospital", destinationId: 4, destinationName: "Govt. General Hospital, Sangareddy", itemId: 9, itemName: "High-Flow Nasal Cannula (HFNC) Respiratory System", itemCode: "EQP-0009", batchNumber: "HFC/2025/A040", expiryDate: "2031-06-30", quantity: 2, unit: "Unit", priority: "urgent", status: "dispatched", remarks: "Sangareddy ICU urgent requisition. OGH has reserve units.", initiatedBy: "Biomedical Officer D. Rao", approvedBy: "Deputy Director (Technical)", approvedAt: "2026-06-12T10:00:00Z", dispatchedAt: "2026-06-14T08:00:00Z", createdAt: "2026-06-11T09:00:00Z", updatedAt: "2026-06-14T08:00:00Z" },
  { id: 2, transferNumber: "TRF/2026/002", sourceId: 3, sourceName: "Warangal District Hospital", destinationId: 2, destinationName: "Gandhi Hospital", itemId: 12, itemName: "High-End Anesthesia Workstation with Multi-Gas Monitor", itemCode: "EQP-0012", batchNumber: "ANS/2025/C015", expiryDate: "2035-03-31", quantity: 1, unit: "Unit", priority: "critical", status: "pending_approval", remarks: "Gandhi Hospital OT expansion emergency transfer.", initiatedBy: "Biomedical Officer D. Rao", createdAt: "2026-06-18T11:00:00Z", updatedAt: "2026-06-18T11:00:00Z" },
  { id: 3, transferNumber: "TRF/2026/003", sourceId: 7, sourceName: "Nizam's Institute of Medical Sciences", destinationId: 6, destinationName: "CHC Pitlam, Kamareddy", itemId: 9, itemName: "High-Flow Nasal Cannula (HFNC) Respiratory System", itemCode: "EQP-0009", batchNumber: "HFC/2025/B055", expiryDate: "2031-03-31", quantity: 1, unit: "Unit", priority: "urgent", status: "pending_approval", remarks: "CHC Pitlam newly operational respiratory care wing.", initiatedBy: "Biomedical Officer D. Rao", createdAt: "2026-06-18T12:00:00Z", updatedAt: "2026-06-18T12:00:00Z" },
  { id: 4, transferNumber: "TRF/2026/004", sourceId: 4, sourceName: "Govt. General Hospital, Sangareddy", destinationId: 5, destinationName: "Area Hospital, Vemulawada", itemId: 12, itemName: "High-End Anesthesia Workstation with Multi-Gas Monitor", itemCode: "EQP-0012", batchNumber: "ANS/2025/A099", expiryDate: "2036-01-31", quantity: 1, unit: "Unit", priority: "normal", status: "approved", remarks: "Rebalancing OT equipment across district secondary care.", initiatedBy: "Biomedical Officer D. Rao", approvedBy: "Deputy Director (Technical)", approvedAt: "2026-06-16T14:00:00Z", createdAt: "2026-06-15T10:00:00Z", updatedAt: "2026-06-16T14:00:00Z" },
  { id: 5, transferNumber: "TRF/2026/005", sourceId: 1, sourceName: "Osmania General Hospital", destinationId: 4, destinationName: "Govt. General Hospital, Sangareddy", itemId: 9, itemName: "High-Flow Nasal Cannula (HFNC) Respiratory System", itemCode: "EQP-0009", batchNumber: "HFC/2025/A038", expiryDate: "2030-09-30", quantity: 1, unit: "Unit", priority: "urgent", status: "received", remarks: "Transfer completed and calibrated at consignee site.", initiatedBy: "Biomedical Officer D. Rao", approvedBy: "Deputy Director (Technical)", approvedAt: "2026-05-20T10:00:00Z", dispatchedAt: "2026-05-22T07:00:00Z", receivedAt: "2026-05-23T15:00:00Z", createdAt: "2026-05-19T09:00:00Z", updatedAt: "2026-05-23T15:00:00Z" },
  { id: 6, transferNumber: "TRF/2026/006", sourceId: 3, sourceName: "Warangal District Hospital", destinationId: 6, destinationName: "CHC Pitlam, Kamareddy", itemId: 12, itemName: "High-End Anesthesia Workstation with Multi-Gas Monitor", itemCode: "EQP-0012", batchNumber: "ANS/2025/B071", expiryDate: "2035-09-30", quantity: 1, unit: "Unit", priority: "normal", status: "closed", remarks: "Routine equipment relocation. Commissioning report signed.", initiatedBy: "Biomedical Officer D. Rao", approvedBy: "Deputy Director (Technical)", approvedAt: "2026-04-02T09:00:00Z", dispatchedAt: "2026-04-04T08:00:00Z", receivedAt: "2026-04-06T14:00:00Z", createdAt: "2026-04-01T10:00:00Z", updatedAt: "2026-04-10T10:00:00Z" },
];

export interface StockBatch {
  id: number;
  batchNumber: string;
  itemId: number;
  itemName: string;
  itemCode: string;
  category: string;
  facilityId: number;
  facilityName: string;
  district: string;
  quantity: number;
  unit: string;
  expiryDate: string;
  receivedDate: string;
  status: "available" | "near_expiry" | "expired" | "quarantine" | "blocked";
  unitPrice: number;
  fefoDeviation: boolean;
  recommendedAction?: string;
}

export const mockStockBatches: StockBatch[] = [
  { id: 1, batchNumber: "HFC/2025/A038", itemId: 9, itemName: "High-Flow Nasal Cannula (HFNC) Respiratory System", itemCode: "EQP-0009", category: "icu", facilityId: 1, facilityName: "Osmania General Hospital", district: "Hyderabad", quantity: 4, unit: "Unit", expiryDate: "2030-07-31", receivedDate: "2025-08-01", status: "available", unitPrice: 220000, fefoDeviation: false, recommendedAction: "Biomedical Calibration Due in 6 Mo." },
  { id: 2, batchNumber: "HFC/2025/A040", itemId: 9, itemName: "High-Flow Nasal Cannula (HFNC) Respiratory System", itemCode: "EQP-0009", category: "icu", facilityId: 1, facilityName: "Osmania General Hospital", district: "Hyderabad", quantity: 10, unit: "Unit", expiryDate: "2031-06-30", receivedDate: "2025-09-01", status: "available", unitPrice: 220000, fefoDeviation: false },
  { id: 3, batchNumber: "HFC/2025/B055", itemId: 9, itemName: "High-Flow Nasal Cannula (HFNC) Respiratory System", itemCode: "EQP-0009", category: "icu", facilityId: 7, facilityName: "Nizam's Institute of Medical Sciences", district: "Hyderabad", quantity: 6, unit: "Unit", expiryDate: "2031-03-31", receivedDate: "2025-10-01", status: "available", unitPrice: 220000, fefoDeviation: false, recommendedAction: "Redistribute 1 unit to CHC Pitlam" },
  { id: 4, batchNumber: "HFC/2025/C012", itemId: 9, itemName: "High-Flow Nasal Cannula (HFNC) Respiratory System", itemCode: "EQP-0009", category: "icu", facilityId: 3, facilityName: "Warangal District Hospital", district: "Warangal", quantity: 5, unit: "Unit", expiryDate: "2030-10-31", receivedDate: "2025-11-01", status: "available", unitPrice: 220000, fefoDeviation: false, recommendedAction: "Annual Preventive Maintenance Scheduled" },
  { id: 5, batchNumber: "ANS/2025/A099", itemId: 12, itemName: "High-End Anesthesia Workstation with Multi-Gas Monitor", itemCode: "EQP-0012", category: "operation_theatre", facilityId: 4, facilityName: "Govt. General Hospital, Sangareddy", district: "Sangareddy", quantity: 4, unit: "Unit", expiryDate: "2036-01-31", receivedDate: "2025-12-01", status: "available", unitPrice: 850000, fefoDeviation: false },
  { id: 6, batchNumber: "ANS/2025/C015", itemId: 12, itemName: "High-End Anesthesia Workstation with Multi-Gas Monitor", itemCode: "EQP-0012", category: "operation_theatre", facilityId: 3, facilityName: "Warangal District Hospital", district: "Warangal", quantity: 3, unit: "Unit", expiryDate: "2035-03-31", receivedDate: "2026-01-01", status: "available", unitPrice: 850000, fefoDeviation: false },
  { id: 7, batchNumber: "ANS/2024/Z089", itemId: 12, itemName: "High-End Anesthesia Workstation with Multi-Gas Monitor", itemCode: "EQP-0012", category: "operation_theatre", facilityId: 5, facilityName: "Area Hospital, Vemulawada", district: "Rajanna Sircilla", quantity: 1, unit: "Unit", expiryDate: "2034-08-31", receivedDate: "2024-09-01", status: "available", unitPrice: 850000, fefoDeviation: false, recommendedAction: "Vaporizer Calibration Verified" },
  { id: 8, batchNumber: "HFC/2024/X001", itemId: 9, itemName: "High-Flow Nasal Cannula (HFNC) Respiratory System", itemCode: "EQP-0009", category: "icu", facilityId: 4, facilityName: "Govt. General Hospital, Sangareddy", district: "Sangareddy", quantity: 0, unit: "Unit", expiryDate: "2029-05-31", receivedDate: "2024-06-01", status: "blocked", unitPrice: 220000, fefoDeviation: false, recommendedAction: "Decommissioned / Replaced under Warranty" },
  { id: 9, batchNumber: "PM/2026/0044", itemId: 8, itemName: "Patient Monitor (Multi-Parameter)", itemCode: "EQP-0008", category: "icu", facilityId: 1, facilityName: "Osmania General Hospital", district: "Hyderabad", quantity: 8, unit: "No.", expiryDate: "2031-12-31", receivedDate: "2026-06-10", status: "available", unitPrice: 85000, fefoDeviation: false },
  { id: 10, batchNumber: "HFC/2026/B003", itemId: 9, itemName: "High-Flow Nasal Cannula (HFNC) Respiratory System", itemCode: "EQP-0009", category: "icu", facilityId: 2, facilityName: "Gandhi Hospital", district: "Secunderabad", quantity: 2, unit: "Unit", expiryDate: "2032-06-30", receivedDate: "2026-01-15", status: "available", unitPrice: 220000, fefoDeviation: false },
];

export interface ForecastItem {
  itemId: number;
  itemName: string;
  itemCode: string;
  unit: string;
  forecastMethod: string;
  forecastAccuracy: number;
  monthly: { period: string; actual: number | null; forecast: number; adjusted: number | null; }[];
}

export const nearExpiryTrend = [
  { month: "Jan 2026", batches: 3, critical: 1, warning: 2 },
  { month: "Feb 2026", batches: 4, critical: 1, warning: 3 },
  { month: "Mar 2026", batches: 5, critical: 2, warning: 3 },
  { month: "Apr 2026", batches: 4, critical: 1, warning: 3 },
  { month: "May 2026", batches: 6, critical: 2, warning: 4 },
  { month: "Jun 2026", batches: 7, critical: 3, warning: 4 },
];

export const mockForecasts: ForecastItem[] = [
  {
    itemId: 9, itemName: "High-Flow Nasal Cannula (HFNC) Respiratory System", itemCode: "EQP-0009", unit: "Unit", forecastMethod: "Weighted Moving Average", forecastAccuracy: 94.0,
    monthly: [
      { period: "Jan 2026", actual: 4, forecast: 4, adjusted: null },
      { period: "Feb 2026", actual: 3, forecast: 4, adjusted: null },
      { period: "Mar 2026", actual: 5, forecast: 4, adjusted: null },
      { period: "Apr 2026", actual: 4, forecast: 4, adjusted: null },
      { period: "May 2026", actual: 4, forecast: 4, adjusted: null },
      { period: "Jun 2026", actual: 3, forecast: 4, adjusted: null },
      { period: "Jul 2026", actual: null, forecast: 4, adjusted: 5 },
      { period: "Aug 2026", actual: null, forecast: 5, adjusted: null },
      { period: "Sep 2026", actual: null, forecast: 5, adjusted: null },
    ],
  },
  {
    itemId: 12, itemName: "High-End Anesthesia Workstation with Multi-Gas Monitor", itemCode: "EQP-0012", unit: "Unit", forecastMethod: "Moving Average (3-month)", forecastAccuracy: 94.5,
    monthly: [
      { period: "Jan 2026", actual: 2, forecast: 2, adjusted: null },
      { period: "Feb 2026", actual: 2, forecast: 2, adjusted: null },
      { period: "Mar 2026", actual: 3, forecast: 2, adjusted: null },
      { period: "Apr 2026", actual: 2, forecast: 2, adjusted: null },
      { period: "May 2026", actual: 2, forecast: 2, adjusted: null },
      { period: "Jun 2026", actual: 2, forecast: 2, adjusted: null },
      { period: "Jul 2026", actual: null, forecast: 2, adjusted: 3 },
      { period: "Aug 2026", actual: null, forecast: 3, adjusted: null },
      { period: "Sep 2026", actual: null, forecast: 3, adjusted: null },
    ],
  },
  {
    itemId: 2, itemName: "ICU Ventilator", itemCode: "EQP-0002", unit: "No.", forecastMethod: "Trend-Based Estimate", forecastAccuracy: 65.7,
    monthly: [
      { period: "Jan 2026", actual: 2, forecast: 2, adjusted: null },
      { period: "Feb 2026", actual: 1, forecast: 2, adjusted: null },
      { period: "Mar 2026", actual: 3, forecast: 2, adjusted: null },
      { period: "Apr 2026", actual: 5, forecast: 3, adjusted: null },
      { period: "May 2026", actual: 4, forecast: 4, adjusted: null },
      { period: "Jun 2026", actual: 3, forecast: 4, adjusted: null },
      { period: "Jul 2026", actual: null, forecast: 4, adjusted: null },
      { period: "Aug 2026", actual: null, forecast: 5, adjusted: null },
      { period: "Sep 2026", actual: null, forecast: 5, adjusted: null },
    ],
  },
];

export interface DistributionRecord {
  facilityId: number;
  facilityName: string;
  district: string;
  period: string;
  itemId: number;
  itemName: string;
  procured: number;
  received: number;
  distributed: number;
  consumed: number;
  stockOnHand: number;
  nearExpiry: number;
  expired: number;
  wasted: number;
  unit: string;
}

export const mockDistributionData: DistributionRecord[] = [
  { facilityId: 1, facilityName: "Osmania General Hospital", district: "Hyderabad", period: "FY 2025-26", itemId: 9, itemName: "High-Flow Nasal Cannula (HFNC) Respiratory System", procured: 16, received: 16, distributed: 14, consumed: 14, stockOnHand: 14, nearExpiry: 0, expired: 0, wasted: 0, unit: "Unit" },
  { facilityId: 2, facilityName: "Gandhi Hospital", district: "Secunderabad", period: "FY 2025-26", itemId: 9, itemName: "High-Flow Nasal Cannula (HFNC) Respiratory System", procured: 8, received: 8, distributed: 6, consumed: 6, stockOnHand: 2, nearExpiry: 0, expired: 0, wasted: 0, unit: "Unit" },
  { facilityId: 3, facilityName: "Warangal District Hospital", district: "Warangal", period: "FY 2025-26", itemId: 9, itemName: "High-Flow Nasal Cannula (HFNC) Respiratory System", procured: 10, received: 10, distributed: 8, consumed: 8, stockOnHand: 8, nearExpiry: 0, expired: 0, wasted: 0, unit: "Unit" },
  { facilityId: 4, facilityName: "Govt. General Hospital, Sangareddy", district: "Sangareddy", period: "FY 2025-26", itemId: 9, itemName: "High-Flow Nasal Cannula (HFNC) Respiratory System", procured: 4, received: 4, distributed: 4, consumed: 4, stockOnHand: 0, nearExpiry: 0, expired: 0, wasted: 0, unit: "Unit" },
  { facilityId: 5, facilityName: "Area Hospital, Vemulawada", district: "Rajanna Sircilla", period: "FY 2025-26", itemId: 9, itemName: "High-Flow Nasal Cannula (HFNC) Respiratory System", procured: 4, received: 4, distributed: 3, consumed: 3, stockOnHand: 3, nearExpiry: 0, expired: 0, wasted: 0, unit: "Unit" },
  { facilityId: 6, facilityName: "CHC Pitlam, Kamareddy", district: "Kamareddy", period: "FY 2025-26", itemId: 9, itemName: "High-Flow Nasal Cannula (HFNC) Respiratory System", procured: 2, received: 2, distributed: 1, consumed: 1, stockOnHand: 1, nearExpiry: 0, expired: 0, wasted: 0, unit: "Unit" },
  { facilityId: 7, facilityName: "Nizam's Institute of Medical Sciences", district: "Hyderabad", period: "FY 2025-26", itemId: 9, itemName: "High-Flow Nasal Cannula (HFNC) Respiratory System", procured: 20, received: 20, distributed: 18, consumed: 18, stockOnHand: 18, nearExpiry: 0, expired: 0, wasted: 0, unit: "Unit" },
  { facilityId: 1, facilityName: "Osmania General Hospital", district: "Hyderabad", period: "FY 2025-26", itemId: 12, itemName: "High-End Anesthesia Workstation with Multi-Gas Monitor", procured: 8, received: 8, distributed: 6, consumed: 6, stockOnHand: 6, nearExpiry: 0, expired: 0, wasted: 0, unit: "Unit" },
  { facilityId: 2, facilityName: "Gandhi Hospital", district: "Secunderabad", period: "FY 2025-26", itemId: 12, itemName: "High-End Anesthesia Workstation with Multi-Gas Monitor", procured: 4, received: 4, distributed: 2, consumed: 2, stockOnHand: 1, nearExpiry: 0, expired: 0, wasted: 0, unit: "Unit" },
  { facilityId: 3, facilityName: "Warangal District Hospital", district: "Warangal", period: "FY 2025-26", itemId: 12, itemName: "High-End Anesthesia Workstation with Multi-Gas Monitor", procured: 4, received: 4, distributed: 3, consumed: 3, stockOnHand: 3, nearExpiry: 0, expired: 0, wasted: 0, unit: "Unit" },
];

export interface KPIMetric {
  id: string;
  name: string;
  description: string;
  currentValue: number;
  unit: string;
  thresholdGreen: number;
  thresholdAmber: number;
  thresholdRed: number;
  direction: "lower_is_better" | "higher_is_better";
  status: "green" | "amber" | "red";
  trend: "up" | "down" | "stable";
  historicalValues: { period: string; value: number }[];
}

export const mockKPIs: KPIMetric[] = [
  { id: "stock_out_rate", name: "Stock-Out Rate", description: "% of item-locations with zero stock", currentValue: 8.3, unit: "%", thresholdGreen: 5, thresholdAmber: 10, thresholdRed: 15, direction: "lower_is_better", status: "amber", trend: "up", historicalValues: [{ period: "Mar 26", value: 6.2 }, { period: "Apr 26", value: 7.1 }, { period: "May 26", value: 7.8 }, { period: "Jun 26", value: 8.3 }] },
  { id: "overstock_rate", name: "Overstock Rate", description: "% of item-locations with >90 days cover", currentValue: 21.4, unit: "%", thresholdGreen: 15, thresholdAmber: 25, thresholdRed: 35, direction: "lower_is_better", status: "amber", trend: "down", historicalValues: [{ period: "Mar 26", value: 25.0 }, { period: "Apr 26", value: 23.5 }, { period: "May 26", value: 22.1 }, { period: "Jun 26", value: 21.4 }] },
  { id: "near_expiry_pct", name: "Near-Expiry Stock %", description: "% of total stock quantity nearing expiry (≤90d)", currentValue: 12.7, unit: "%", thresholdGreen: 8, thresholdAmber: 15, thresholdRed: 25, direction: "lower_is_better", status: "amber", trend: "up", historicalValues: [{ period: "Mar 26", value: 10.2 }, { period: "Apr 26", value: 11.0 }, { period: "May 26", value: 12.1 }, { period: "Jun 26", value: 12.7 }] },
  { id: "expiry_wastage_pct", name: "Expiry / Wastage %", description: "% of total received stock expired or wasted", currentValue: 2.1, unit: "%", thresholdGreen: 2, thresholdAmber: 5, thresholdRed: 8, direction: "lower_is_better", status: "amber", trend: "down", historicalValues: [{ period: "Mar 26", value: 2.8 }, { period: "Apr 26", value: 2.5 }, { period: "May 26", value: 2.3 }, { period: "Jun 26", value: 2.1 }] },
  { id: "avg_quarantine_days", name: "Avg Quarantine Time", description: "Average days from receipt to QC release", currentValue: 18.4, unit: "days", thresholdGreen: 14, thresholdAmber: 21, thresholdRed: 30, direction: "lower_is_better", status: "amber", trend: "stable", historicalValues: [{ period: "Mar 26", value: 19.2 }, { period: "Apr 26", value: 18.8 }, { period: "May 26", value: 18.6 }, { period: "Jun 26", value: 18.4 }] },
  { id: "on_time_release_pct", name: "On-Time Release %", description: "% of quarantine lots released within SLA", currentValue: 72.0, unit: "%", thresholdGreen: 85, thresholdAmber: 70, thresholdRed: 60, direction: "higher_is_better", status: "amber", trend: "up", historicalValues: [{ period: "Mar 26", value: 65.0 }, { period: "Apr 26", value: 68.0 }, { period: "May 26", value: 70.0 }, { period: "Jun 26", value: 72.0 }] },
  { id: "redistribution_tat", name: "Redistribution TAT", description: "Avg days from transfer initiation to receipt", currentValue: 4.2, unit: "days", thresholdGreen: 5, thresholdAmber: 7, thresholdRed: 10, direction: "lower_is_better", status: "green", trend: "stable", historicalValues: [{ period: "Mar 26", value: 5.1 }, { period: "Apr 26", value: 4.8 }, { period: "May 26", value: 4.5 }, { period: "Jun 26", value: 4.2 }] },
  { id: "forecast_accuracy", name: "Forecast Accuracy", description: "% accuracy of demand forecast vs actual consumption", currentValue: 87.3, unit: "%", thresholdGreen: 85, thresholdAmber: 75, thresholdRed: 65, direction: "higher_is_better", status: "green", trend: "up", historicalValues: [{ period: "Mar 26", value: 82.0 }, { period: "Apr 26", value: 84.5 }, { period: "May 26", value: 86.0 }, { period: "Jun 26", value: 87.3 }] },
  { id: "issue_consumption_lag", name: "Issue-to-Consumption Lag", description: "Avg days between stock issue and consumption record", currentValue: 6.8, unit: "days", thresholdGreen: 7, thresholdAmber: 14, thresholdRed: 21, direction: "lower_is_better", status: "green", trend: "stable", historicalValues: [{ period: "Mar 26", value: 8.2 }, { period: "Apr 26", value: 7.5 }, { period: "May 26", value: 7.1 }, { period: "Jun 26", value: 6.8 }] },
  { id: "fefo_compliance", name: "FEFO Compliance %", description: "% of issues following FEFO/FIFO discipline", currentValue: 78.5, unit: "%", thresholdGreen: 90, thresholdAmber: 80, thresholdRed: 70, direction: "higher_is_better", status: "red", trend: "up", historicalValues: [{ period: "Mar 26", value: 74.0 }, { period: "Apr 26", value: 75.5 }, { period: "May 26", value: 77.0 }, { period: "Jun 26", value: 78.5 }] },
];

// ─── PROCUREMENT KPIs (Process Book §13 — 12 KPIs) ─────────────────────────

export const mockProcurementKPIs: KPIMetric[] = [
  {
    id: "indent_to_po_cycle",
    name: "Avg Indent-to-PO Cycle Time",
    description: "Average working days from Indent receipt to PO issuance (target ≤15 days)",
    currentValue: 12.4,
    unit: "days",
    thresholdGreen: 15,
    thresholdAmber: 20,
    thresholdRed: 30,
    direction: "lower_is_better",
    status: "green",
    trend: "down",
    historicalValues: [
      { period: "Jan 26", value: 18.2 },
      { period: "Feb 26", value: 16.5 },
      { period: "Mar 26", value: 14.8 },
      { period: "Apr 26", value: 13.6 },
      { period: "May 26", value: 13.0 },
      { period: "Jun 26", value: 12.4 },
    ],
  },
  {
    id: "po_to_delivery_cycle",
    name: "Avg PO-to-Delivery Cycle Time",
    description: "Average days from PO issue to physical delivery at consignee hospital",
    currentValue: 21.4,
    unit: "days",
    thresholdGreen: 30,
    thresholdAmber: 45,
    thresholdRed: 60,
    direction: "lower_is_better",
    status: "green",
    trend: "down",
    historicalValues: [
      { period: "Jan 26", value: 28.0 },
      { period: "Feb 26", value: 26.5 },
      { period: "Mar 26", value: 25.2 },
      { period: "Apr 26", value: 23.8 },
      { period: "May 26", value: 22.6 },
      { period: "Jun 26", value: 21.4 },
    ],
  },
  {
    id: "indent_approval_rate",
    name: "Indent Approval Rate",
    description: "% of submitted indents approved within SLA timeline (target ≥90%)",
    currentValue: 87.5,
    unit: "%",
    thresholdGreen: 90,
    thresholdAmber: 80,
    thresholdRed: 70,
    direction: "higher_is_better",
    status: "amber",
    trend: "up",
    historicalValues: [
      { period: "Jan 26", value: 80.0 },
      { period: "Feb 26", value: 82.5 },
      { period: "Mar 26", value: 84.0 },
      { period: "Apr 26", value: 85.5 },
      { period: "May 26", value: 86.0 },
      { period: "Jun 26", value: 87.5 },
    ],
  },
  {
    id: "on_time_delivery_rate",
    name: "On-time Delivery Rate",
    description: "% of POs delivered on or before the RC supply period deadline (target ≥85%)",
    currentValue: 91.7,
    unit: "%",
    thresholdGreen: 85,
    thresholdAmber: 75,
    thresholdRed: 65,
    direction: "higher_is_better",
    status: "green",
    trend: "up",
    historicalValues: [
      { period: "Jan 26", value: 82.0 },
      { period: "Feb 26", value: 85.0 },
      { period: "Mar 26", value: 87.5 },
      { period: "Apr 26", value: 89.0 },
      { period: "May 26", value: 90.5 },
      { period: "Jun 26", value: 91.7 },
    ],
  },
  {
    id: "qa_first_pass_rate",
    name: "QA First-Pass Acceptance Rate",
    description: "% of consignments accepted without conditional/rejected QA on first inspection (target ≥90%)",
    currentValue: 93.2,
    unit: "%",
    thresholdGreen: 90,
    thresholdAmber: 80,
    thresholdRed: 70,
    direction: "higher_is_better",
    status: "green",
    trend: "stable",
    historicalValues: [
      { period: "Jan 26", value: 88.0 },
      { period: "Feb 26", value: 90.0 },
      { period: "Mar 26", value: 91.5 },
      { period: "Apr 26", value: 92.0 },
      { period: "May 26", value: 92.8 },
      { period: "Jun 26", value: 93.2 },
    ],
  },
  {
    id: "active_rc_coverage",
    name: "Active RC Coverage",
    description: "% of standardised equipment items covered by an active Rate Contract (target ≥80%)",
    currentValue: 38.5,
    unit: "%",
    thresholdGreen: 80,
    thresholdAmber: 60,
    thresholdRed: 40,
    direction: "higher_is_better",
    status: "red",
    trend: "up",
    historicalValues: [
      { period: "Jan 26", value: 30.8 },
      { period: "Feb 26", value: 32.0 },
      { period: "Mar 26", value: 34.0 },
      { period: "Apr 26", value: 35.5 },
      { period: "May 26", value: 37.0 },
      { period: "Jun 26", value: 38.5 },
    ],
  },
  {
    id: "budget_utilisation_rate",
    name: "Budget Utilisation Rate",
    description: "% of sanctioned budget committed/spent per programme (FY 2025-26 target: programme-specific)",
    currentValue: 78.4,
    unit: "%",
    thresholdGreen: 80,
    thresholdAmber: 60,
    thresholdRed: 40,
    direction: "higher_is_better",
    status: "amber",
    trend: "up",
    historicalValues: [
      { period: "Jan 26", value: 52.0 },
      { period: "Feb 26", value: 60.0 },
      { period: "Mar 26", value: 66.0 },
      { period: "Apr 26", value: 70.5 },
      { period: "May 26", value: 74.8 },
      { period: "Jun 26", value: 78.4 },
    ],
  },
  {
    id: "pending_actions_count",
    name: "Pending Actions by Stage",
    description: "Total count of indents/POs pending action across all procurement stages (minimize)",
    currentValue: 8,
    unit: "items",
    thresholdGreen: 5,
    thresholdAmber: 10,
    thresholdRed: 20,
    direction: "lower_is_better",
    status: "amber",
    trend: "down",
    historicalValues: [
      { period: "Jan 26", value: 15 },
      { period: "Feb 26", value: 13 },
      { period: "Mar 26", value: 12 },
      { period: "Apr 26", value: 10 },
      { period: "May 26", value: 9 },
      { period: "Jun 26", value: 8 },
    ],
  },
  {
    id: "sla_compliance_rate",
    name: "SLA Compliance Rate",
    description: "% of procurement actions completed within defined SLA at each stage (target ≥95%)",
    currentValue: 88.5,
    unit: "%",
    thresholdGreen: 95,
    thresholdAmber: 85,
    thresholdRed: 75,
    direction: "higher_is_better",
    status: "amber",
    trend: "up",
    historicalValues: [
      { period: "Jan 26", value: 80.0 },
      { period: "Feb 26", value: 82.0 },
      { period: "Mar 26", value: 84.0 },
      { period: "Apr 26", value: 85.5 },
      { period: "May 26", value: 87.0 },
      { period: "Jun 26", value: 88.5 },
    ],
  },
  {
    id: "vendor_performance_score",
    name: "Vendor Performance Score",
    description: "Weighted score: On-time delivery 40% + QA first-pass 35% + Compliance 25% (target ≥80/100)",
    currentValue: 91.2,
    unit: "/100",
    thresholdGreen: 80,
    thresholdAmber: 65,
    thresholdRed: 50,
    direction: "higher_is_better",
    status: "green",
    trend: "up",
    historicalValues: [
      { period: "Jan 26", value: 84.0 },
      { period: "Feb 26", value: 86.5 },
      { period: "Mar 26", value: 88.0 },
      { period: "Apr 26", value: 89.5 },
      { period: "May 26", value: 90.5 },
      { period: "Jun 26", value: 91.2 },
    ],
  },
  {
    id: "vendor_po_ack_rate",
    name: "Vendor PO Acknowledgement Rate",
    description: "% of POs acknowledged by vendor within statutory 7-day window (target ≥95%)",
    currentValue: 66.7,
    unit: "%",
    thresholdGreen: 95,
    thresholdAmber: 80,
    thresholdRed: 65,
    direction: "higher_is_better",
    status: "red",
    trend: "up",
    historicalValues: [
      { period: "Jan 26", value: 50.0 },
      { period: "Feb 26", value: 55.0 },
      { period: "Mar 26", value: 58.0 },
      { period: "Apr 26", value: 61.0 },
      { period: "May 26", value: 64.0 },
      { period: "Jun 26", value: 66.7 },
    ],
  },
  {
    id: "dcc_upload_compliance",
    name: "Delivery Certificate Upload Compliance",
    description: "% of deliveries where DCC uploaded by vendor within 7 working days (target ≥90%)",
    currentValue: 66.7,
    unit: "%",
    thresholdGreen: 90,
    thresholdAmber: 75,
    thresholdRed: 60,
    direction: "higher_is_better",
    status: "red",
    trend: "up",
    historicalValues: [
      { period: "Jan 26", value: 40.0 },
      { period: "Feb 26", value: 50.0 },
      { period: "Mar 26", value: 55.0 },
      { period: "Apr 26", value: 60.0 },
      { period: "May 26", value: 63.0 },
      { period: "Jun 26", value: 66.7 },
    ],
  },
];

// Pending actions breakdown by stage (for KPI-8 bar chart)
export const mockPendingByStage = [
  { stage: "Indent Submitted (Pending Review)", count: 3, color: "#64748b" },
  { stage: "Approved (Awaiting RC/Tender Link)", count: 0, color: "#3b82f6" },
  { stage: "Tender Initiated (In Progress)", count: 1, color: "#8b5cf6" },
  { stage: "PO Drafted (Pending Approval)", count: 1, color: "#f59e0b" },
  { stage: "PO Issued (Awaiting Ack > 7d)", count: 1, color: "#ef4444" },
  { stage: "Dispatched (DCC Pending)", count: 1, color: "#f97316" },
  { stage: "Delivered (QA Pending)", count: 1, color: "#06b6d4" },
];

// Budget by programme for KPI-7 (§13 R-7 enhancement)
export const mockBudgetByProgramme = [
  { programme: "NHM Equipment", sanctioned: 8500000, committed: 6800000, spent: 5900000 },
  { programme: "NABH Accreditation", sanctioned: 3200000, committed: 2100000, spent: 1800000 },
  { programme: "Medical College Upgradation", sanctioned: 12000000, committed: 9500000, spent: 7200000 },
  { programme: "District Hospital Modernisation", sanctioned: 6000000, committed: 4200000, spent: 3100000 },
  { programme: "PHC Revamp", sanctioned: 2800000, committed: 1900000, spent: 1400000 },
];

// ─── VENDOR PORTAL REPORT MOCK DATA ────────────────────────────────────────

// R-11: Vendor PO Summary (vendor self-service view)
export interface VendorPOSummaryRow {
  id: number;
  poNumber: string;
  poDate: string;
  equipmentName: string;
  quantity: number;
  unitPrice: number;
  totalValue: number;
  consignee: string;
  district: string;
  ackStatus: "acknowledged" | "pending" | "overdue";
  ackDate: string | null;
  ackDeadline: string;
  expectedDelivery: string;
  actualDelivery: string | null;
  dispatchDate: string | null;
  poStatus: "active" | "delivered" | "cancelled" | "pending_dispatch";
  paymentStatus: "paid" | "partial" | "pending";
  fulfillmentPct: number;
  poAgeDays: number;
  certUploaded: boolean;
}

export const mockVendorPOSummary: VendorPOSummaryRow[] = [
  {
    id: 1,
    poNumber: "441A/591/HPC/EQU/2025-26",
    poDate: "2026-01-11",
    equipmentName: "Surgical Diathermy / Cautery Machine (Sigma+)",
    quantity: 3,
    unitPrice: 185000,
    totalValue: 582750,
    consignee: "Govt. General Hospital, Sangareddy",
    district: "Sangareddy",
    ackStatus: "acknowledged",
    ackDate: "2026-01-15",
    ackDeadline: "2026-01-18",
    expectedDelivery: "2026-03-01",
    actualDelivery: "2026-03-14",
    dispatchDate: "2026-03-08",
    poStatus: "delivered",
    paymentStatus: "paid",
    fulfillmentPct: 100,
    poAgeDays: 258,
    certUploaded: true,
  },
  {
    id: 2,
    poNumber: "216/418/HPC/EQU/Vemulawada/2022-23",
    poDate: "2022-10-15",
    equipmentName: "Mammogram Compatible CR System (Fuji Film)",
    quantity: 1,
    unitPrice: 650000,
    totalValue: 682500,
    consignee: "Area Hospital, Vemulawada",
    district: "Rajanna Sircilla",
    ackStatus: "acknowledged",
    ackDate: "2022-10-18",
    ackDeadline: "2022-10-22",
    expectedDelivery: "2022-11-10",
    actualDelivery: "2022-11-02",
    dispatchDate: "2022-11-02",
    poStatus: "delivered",
    paymentStatus: "paid",
    fulfillmentPct: 100,
    poAgeDays: 1443,
    certUploaded: true,
  },
  {
    id: 3,
    poNumber: "IND/HPC/EQU/WDH/PO/2026/003",
    poDate: "2026-02-10",
    equipmentName: "Fully Automated Biochemistry Analyser",
    quantity: 1,
    unitPrice: 1200000,
    totalValue: 1344000,
    consignee: "Warangal District Hospital",
    district: "Warangal",
    ackStatus: "pending",
    ackDate: null,
    ackDeadline: "2026-02-17",
    expectedDelivery: "2026-06-30",
    actualDelivery: null,
    dispatchDate: null,
    poStatus: "pending_dispatch",
    paymentStatus: "pending",
    fulfillmentPct: 0,
    poAgeDays: 229,
    certUploaded: false,
  },
];

// R-12: Vendor Delivery & Certificate Status
export interface VendorCertStatusRow {
  id: number;
  deliveryTrackingId: string;
  poNumber: string;
  equipmentName: string;
  consignee: string;
  district: string;
  dispatchDate: string | null;
  expectedDelivery: string;
  actualDelivery: string | null;
  isOnTime: boolean;
  delayDays: number;
  qaDecision: "accepted" | "conditional" | "rejected" | "pending";
  certUploaded: boolean;
  certDate: string | null;
  certUploadDeadline: string | null;
  certOverdue: boolean;
  certOverdueDays: number;
}

export const mockVendorCertStatus: VendorCertStatusRow[] = [
  {
    id: 1,
    deliveryTrackingId: "SSA/0506/25-26",
    poNumber: "441A/591/HPC/EQU/2025-26",
    equipmentName: "Surgical Diathermy / Cautery Machine (Sigma+) — 3 units",
    consignee: "Govt. General Hospital, Sangareddy",
    district: "Sangareddy",
    dispatchDate: "2026-03-08",
    expectedDelivery: "2026-03-01",
    actualDelivery: "2026-03-14",
    isOnTime: false,
    delayDays: 13,
    qaDecision: "accepted",
    certUploaded: true,
    certDate: "2026-03-20",
    certUploadDeadline: "2026-03-21",
    certOverdue: false,
    certOverdueDays: 0,
  },
  {
    id: 2,
    deliveryTrackingId: "GAMS/01650/22-23",
    poNumber: "216/418/HPC/EQU/Vemulawada/2022-23",
    equipmentName: "Mammogram Compatible CR System — Fuji Film PCR Prima TM",
    consignee: "Area Hospital, Vemulawada",
    district: "Rajanna Sircilla",
    dispatchDate: "2022-11-02",
    expectedDelivery: "2022-11-10",
    actualDelivery: "2022-11-02",
    isOnTime: true,
    delayDays: 0,
    qaDecision: "accepted",
    certUploaded: true,
    certDate: "2022-11-21",
    certUploadDeadline: "2022-11-09",
    certOverdue: false,
    certOverdueDays: 0,
  },
  {
    id: 3,
    deliveryTrackingId: "QR-2026-WDH-003",
    poNumber: "IND/HPC/EQU/WDH/PO/2026/003",
    equipmentName: "Fully Automated Biochemistry Analyser",
    consignee: "Warangal District Hospital",
    district: "Warangal",
    dispatchDate: null,
    expectedDelivery: "2026-06-30",
    actualDelivery: null,
    isOnTime: false,
    delayDays: 89,
    qaDecision: "pending",
    certUploaded: false,
    certDate: null,
    certUploadDeadline: null,
    certOverdue: false,
    certOverdueDays: 0,
  },
];

// R-13: Vendor Performance Self-View (period scorecard)
export interface VendorSelfScorePeriod {
  period: string;
  totalPOs: number;
  totalDeliveries: number;
  onTimeCount: number;
  lateCount: number;
  onTimePct: number;
  avgDelayDays: number;
  qaFirstPassCount: number;
  qaConditionalCount: number;
  qaRejectedCount: number;
  qaFirstPassPct: number;
  discrepancyCount: number;
  avgRectificationDays: number;
  dccUploadedOnTime: number;
  dccOverdueCount: number;
  overallScore: number;
}

export const mockVendorSelfScore: VendorSelfScorePeriod[] = [
  { period: "Jan 26", totalPOs: 2, totalDeliveries: 2, onTimeCount: 2, lateCount: 0, onTimePct: 100, avgDelayDays: 0, qaFirstPassCount: 2, qaConditionalCount: 0, qaRejectedCount: 0, qaFirstPassPct: 100, discrepancyCount: 0, avgRectificationDays: 0, dccUploadedOnTime: 2, dccOverdueCount: 0, overallScore: 98 },
  { period: "Feb 26", totalPOs: 1, totalDeliveries: 1, onTimeCount: 1, lateCount: 0, onTimePct: 100, avgDelayDays: 0, qaFirstPassCount: 1, qaConditionalCount: 0, qaRejectedCount: 0, qaFirstPassPct: 100, discrepancyCount: 0, avgRectificationDays: 0, dccUploadedOnTime: 1, dccOverdueCount: 0, overallScore: 97 },
  { period: "Mar 26", totalPOs: 1, totalDeliveries: 1, onTimeCount: 0, lateCount: 1, onTimePct: 0, avgDelayDays: 13, qaFirstPassCount: 1, qaConditionalCount: 0, qaRejectedCount: 0, qaFirstPassPct: 100, discrepancyCount: 0, avgRectificationDays: 0, dccUploadedOnTime: 1, dccOverdueCount: 0, overallScore: 82 },
  { period: "Apr 26", totalPOs: 1, totalDeliveries: 0, onTimeCount: 0, lateCount: 0, onTimePct: 0, avgDelayDays: 0, qaFirstPassCount: 0, qaConditionalCount: 0, qaRejectedCount: 0, qaFirstPassPct: 0, discrepancyCount: 0, avgRectificationDays: 0, dccUploadedOnTime: 0, dccOverdueCount: 0, overallScore: 0 },
  { period: "May 26", totalPOs: 0, totalDeliveries: 0, onTimeCount: 0, lateCount: 0, onTimePct: 0, avgDelayDays: 0, qaFirstPassCount: 0, qaConditionalCount: 0, qaRejectedCount: 0, qaFirstPassPct: 0, discrepancyCount: 0, avgRectificationDays: 0, dccUploadedOnTime: 0, dccOverdueCount: 0, overallScore: 0 },
  { period: "Jun 26", totalPOs: 0, totalDeliveries: 0, onTimeCount: 0, lateCount: 0, onTimePct: 0, avgDelayDays: 0, qaFirstPassCount: 0, qaConditionalCount: 0, qaRejectedCount: 0, qaFirstPassPct: 0, discrepancyCount: 0, avgRectificationDays: 0, dccUploadedOnTime: 0, dccOverdueCount: 0, overallScore: 0 },
];
