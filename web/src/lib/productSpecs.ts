import {
  Stethoscope, Activity, Sparkles, type LucideIcon,
} from "lucide-react";

export interface ProductCategory {
  value: string;
  label: string;
  icon: LucideIcon;
  color: string;       // tailwind text-* class
  bgColor: string;     // tailwind bg-* class
  borderColor: string; // tailwind border-* class
}

export const PRODUCT_CATEGORIES: ProductCategory[] = [
  { value: "imaging",           label: "Diagnostic Imaging",     icon: Stethoscope, color: "text-blue-700",    bgColor: "bg-blue-50",    borderColor: "border-blue-200" },
  { value: "critical_care",     label: "Critical Care",          icon: Activity,    color: "text-emerald-700", bgColor: "bg-emerald-50", borderColor: "border-emerald-200" },
  { value: "operation_theatre", label: "Operation Theatre",      icon: Stethoscope, color: "text-purple-700",  bgColor: "bg-purple-50",  borderColor: "border-purple-200" },
  { value: "laboratory",        label: "Laboratory",             icon: Stethoscope, color: "text-amber-700",   bgColor: "bg-amber-50",   borderColor: "border-amber-200" },
  { value: "patient_monitoring",label: "Patient Monitoring",     icon: Activity,    color: "text-cyan-700",    bgColor: "bg-cyan-50",    borderColor: "border-cyan-200" },
  { value: "emergency",         label: "Emergency Equipment",    icon: Activity,    color: "text-rose-700",    bgColor: "bg-rose-50",    borderColor: "border-rose-200" },
  { value: "surgical_systems",  label: "Surgical Systems",       icon: Stethoscope, color: "text-indigo-700",  bgColor: "bg-indigo-50",  borderColor: "border-indigo-200" },
  { value: "sterilization",     label: "Sterilization (CSSD)",   icon: Sparkles,    color: "text-teal-700",    bgColor: "bg-teal-50",    borderColor: "border-teal-200" },
  { value: "neurodiagnostics",  label: "Neurodiagnostics",       icon: Activity,    color: "text-violet-700",  bgColor: "bg-violet-50",  borderColor: "border-violet-200" },
  { value: "renal_care",        label: "Renal Care / Dialysis",  icon: Activity,    color: "text-sky-700",     bgColor: "bg-sky-50",     borderColor: "border-sky-200" },
];

export function getCategoryMeta(value: string): ProductCategory {
  const norm = (value || "").toLowerCase().replace(/[\s\-_/]+/g, "_");
  if (norm.includes("imaging") || norm.includes("radiology")) return PRODUCT_CATEGORIES[0];
  if (norm.includes("critical") || norm.includes("icu")) return PRODUCT_CATEGORIES[1];
  if (norm.includes("theatre") || norm.includes("ot")) return PRODUCT_CATEGORIES[2];
  if (norm.includes("lab") || norm.includes("pathology") || norm.includes("biochem")) return PRODUCT_CATEGORIES[3];
  if (norm.includes("monitor")) return PRODUCT_CATEGORIES[4];
  if (norm.includes("emerg")) return PRODUCT_CATEGORIES[5];
  if (norm.includes("surg") || norm.includes("laparo")) return PRODUCT_CATEGORIES[6];
  if (norm.includes("steril") || norm.includes("cssd") || norm.includes("autoclave")) return PRODUCT_CATEGORIES[7];
  if (norm.includes("neuro") || norm.includes("eeg")) return PRODUCT_CATEGORIES[8];
  if (norm.includes("renal") || norm.includes("dialysis")) return PRODUCT_CATEGORIES[9];
  return PRODUCT_CATEGORIES.find((c) => c.value === value) ?? PRODUCT_CATEGORIES[0];
}

export interface ProductTechSpecs {
  equipmentCode: string;
  standardName: string;
  commonName: string;
  productCategory: string; // value in PRODUCT_CATEGORIES
  typicalDepartment: string;
  estimatedUnitRate: number;
  general: {
    make?: string;
    model?: string;
    countryOfOrigin?: string;
    hsnCode?: string;
    standardReference?: string;
  };
  technical: {
    powerSupply?: string;
    powerConsumption?: string;
    dimensions?: string;
    weight?: string;
    operatingTemp?: string;
    humidity?: string;
    additionalFields?: Record<string, string>;
  };
  performance: Record<string, string>;
  regulatory: {
    ceMark?: boolean;
    bisIsiMark?: string;
    iecStandard?: string;
    aerbClearance?: boolean;
    iso?: string;
    pcpndtCompliance?: boolean;
  };
  accessories: string[];
  warranty: {
    years: number;
    cmcStartYear: number;
    cmcAnnualRate: number;
  };
  documentation: string[];
}

export const SPECS_20: Record<string, ProductTechSpecs> = {
  // 1. EQP-HV-001 — CT Scan Machine - 16 Slice
  "EQP-HV-001": {
    equipmentCode: "EQP-HV-001",
    standardName: "CT Scan Machine - 16 Slice",
    commonName: "CT Scan Machine",
    productCategory: "imaging",
    typicalDepartment: "Radiology",
    estimatedUnitRate: 18500000,
    general: {
      make: "GE Healthcare / Siemens Healthineers / Philips / Canon Medical",
      model: "Revolution ACT / Somatom go.Now / Access CT / similar",
      countryOfOrigin: "USA / Germany / Japan / India",
      hsnCode: "90221400",
      standardReference: "AERB Safety Code (AERB/SC/Med-2), BIS IS 7620, ISO 13485",
    },
    technical: {
      powerSupply: "415 V AC ± 10%, 3 Phase, 50 Hz with dedicated 60 kVA Online UPS",
      powerConsumption: "Generator Capacity ≥ 32 kW (Peak ≥ 40 kW)",
      dimensions: "Gantry Aperture ≥ 70 cm; Flare aperture with tilt ± 30°",
      weight: "Gantry ~ 1800 kg; Patient Table ~ 450 kg",
      operatingTemp: "18°C to 24°C (Air Conditioned Room)",
      humidity: "30%–60% RH (non-condensing)",
      additionalFields: {
        "Cooling System": "High-efficiency closed loop liquid/air heat exchanger",
        "Console Workstation": "Dual Intel Xeon, 64 GB RAM, 2 TB SSD, Dual 24-inch Medical LCDs",
      },
    },
    performance: {
      "Slice Acquisition": "True 16 sub-millimetre slices per 360° rotation (0.5s or faster)",
      "Detector Type": "Solid-state ceramic ultrafast scintillation detector; coverage ≥ 20 mm",
      "X-Ray Tube Anode": "Heat capacity ≥ 3.5 MHU, dissipation rate ≥ 500 kHU/min",
      "kVp Range": "80 kV to 140 kV in 10 kV increments",
      "mA Range": "10 mA to 350 mA with automated mA modulation (organ dose modulation)",
      "Spatial Resolution": "≥ 15 lp/cm at 0% MTF",
      "Reconstruction Matrix": "512 × 512 matrix with reconstruction speed ≥ 20 frames/second",
      "Dose Reduction": "Advanced iterative reconstruction (ASiR / SAFIRE / iDose) & pediatric protocols",
      "Table Load Capacity": "≥ 200 kg with 0.5 mm positioning accuracy and scannable range ≥ 160 cm",
      "Software Applications": "3D MPR, MIP, MinIP, SSD, Volume Rendering, Vessel tracking, Calcium scoring",
    },
    regulatory: {
      aerbClearance: true,
      ceMark: true,
      bisIsiMark: "BIS IS 7620 / ISO 13485:2016",
      iecStandard: "IEC 60601-1, IEC 60601-2-44 (CT Safety)",
      iso: "ISO 13485:2016, ISO 9001",
    },
    accessories: [
      "60 kVA Online UPS with 30-minute full load battery backup",
      "Dual-head automated CT contrast injector with 50 consumable syringes",
      "Lead glass viewing window (100 × 80 cm, 2.0 mm Pb eq)",
      "Radiation protection kit: 4 Lead aprons (0.5 mm Pb eq), 4 thyroid shields, 2 gonad shields",
      "Water & CTDI phantoms for daily quality assurance and dosimetry calibration",
      "Workstation with DICOM 3.0 Store, Print, Worklist, Query/Retrieve, CD/DVD burner",
    ],
    warranty: { years: 3, cmcStartYear: 4, cmcAnnualRate: 450000 },
    documentation: [
      "AERB Type Approval Certificate & Site Layout Approval Dossier",
      "Site Acceptance Test (SAT) and Radiation Survey Report",
      "Factory Calibration and Dosimetry Certificate",
      "Complete Operator and Biomedical Service Manuals with Schematics",
    ],
  },

  // 2. EQP-HV-002 — Mammography Machine - Digital
  "EQP-HV-002": {
    equipmentCode: "EQP-HV-002",
    standardName: "Mammography Machine - Digital",
    commonName: "Mammography Machine",
    productCategory: "imaging",
    typicalDepartment: "Radiology",
    estimatedUnitRate: 6500000,
    general: {
      make: "Hologic / GE Healthcare / Fujifilm / Siemens Healthineers",
      model: "Selenia Dimensions / Pristina / Amulet Innovality / similar",
      countryOfOrigin: "USA / France / Japan / Germany",
      hsnCode: "90221420",
      standardReference: "AERB Safety Code, MQSA compliance, BIS IS 7620",
    },
    technical: {
      powerSupply: "220–240 V AC, 50 Hz, single phase with 10 kVA Online UPS",
      powerConsumption: "High Frequency Inverter Generator ≥ 5 kW (20–49 kV)",
      dimensions: "Isocentric C-arm rotation +180° to -180°; SID ≥ 65 cm",
      weight: "Stand ~ 250 kg; Control Console ~ 85 kg",
      operatingTemp: "20°C to 26°C; Humidity: 20%–70% RH",
      additionalFields: {
        "Target / Filter": "Tungsten (W) / Molybdenum (Mo) target with automated Rhodium/Silver filters",
        "Focal Spot": "Dual focus 0.1 mm (magnification) and 0.3 mm (contact)",
      },
    },
    performance: {
      "Detector Type": "Direct conversion Amorphous Selenium (a-Se) or CsI Flat Panel Detector",
      "Detector Area": "Full Field Digital Mammography (FFDM) ≥ 24 × 30 cm",
      "Pixel Pitch": "≤ 70 μm (ultra-high spatial resolution for microcalcification detection)",
      "Compression System": "Motorized ergonomic compression with manual fine tuning & auto-decompression",
      "Automatic Exposure": "Multi-zone AEC sensing breast thickness and glandular composition",
      "Display Workstation": "Dual 5-Megapixel (5MP) high-luminance DICOM calibrated diagnostic review monitors",
      "Throughput": "≥ 15 patients/hour with fast acquisition cycle ≤ 10 seconds",
    },
    regulatory: {
      aerbClearance: true,
      ceMark: true,
      bisIsiMark: "BIS compliant / ISO 13485:2016",
      iecStandard: "IEC 60601-1, IEC 60601-2-45 (Mammography equipment)",
      iso: "ISO 13485, MQSA certified",
    },
    accessories: [
      "Standard compression paddles: 24×30 cm, 18×24 cm, spot compression, and magnification paddle",
      "Geometric magnification stand (1.5x and 1.8x factor)",
      "Protective face shield and dual ergonomic foot pedals",
      "10 kVA Online UPS with 30-minute backup",
      "Lead glass radiation protective barrier (0.5 mm Pb eq)",
    ],
    warranty: { years: 3, cmcStartYear: 4, cmcAnnualRate: 180000 },
    documentation: [
      "AERB Type Approval Certificate",
      "Mammography Quality Standards Act (MQSA) validation report",
      "DICOM Conformance Statement and Service Manual",
    ],
  },

  // 3. EQP-HV-003 — C-Arm Machine - Digital
  "EQP-HV-003": {
    equipmentCode: "EQP-HV-003",
    standardName: "C-Arm Machine - Digital",
    commonName: "C-Arm Machine",
    productCategory: "imaging",
    typicalDepartment: "Orthopaedics / OT",
    estimatedUnitRate: 3200000,
    general: {
      make: "Siemens Healthineers / Philips / Allengers / GE Healthcare",
      model: "Cios Select / Zenition / Rolloscope / similar",
      countryOfOrigin: "Germany / Netherlands / India / USA",
      hsnCode: "90221410",
      standardReference: "AERB Safety Code, BIS IS 7620, ISO 13485",
    },
    technical: {
      powerSupply: "230 V AC ± 10%, 50 Hz, 15A single phase",
      powerConsumption: "High Frequency Inverter Generator ≥ 3.5 kW (40–110 kV)",
      dimensions: "Orbital rotation ≥ 130° (-40° to +90°), Free space ≥ 78 cm, Depth ≥ 68 cm",
      weight: "C-Arm trolley ~ 260 kg; Monitor cart ~ 95 kg",
      operatingTemp: "10°C to 40°C; Humidity: 20%–80% RH",
    },
    performance: {
      "Image Receptor": "High-resolution Flat Panel Detector (FPD) or 9-inch Triple-field Image Intensifier",
      "Fluoroscopy Modes": "Continuous (0.2–6 mA), Pulsed Fluro (up to 15 fps) for low-dose intraoperative imaging",
      "Digital Radiography": "Digital snap-shot mode up to 120 kV, 20–30 mA",
      "Laser Localizer": "Integrated green-beam laser localizer for radiation-free positioning",
      "Image Processing": "Recursive noise reduction, edge enhancement, zoom, inversion, and last image hold (LIH)",
      "Memory & Archive": "≥ 100,000 frames on-board SSD with DICOM 3.0 (PACS/USB export)",
      "Display Monitors": "Dual 19-inch high-brightness anti-glare medical LCDs on swivel arm",
    },
    regulatory: {
      aerbClearance: true,
      ceMark: true,
      bisIsiMark: "AERB & BIS IS 7620 compliant",
      iecStandard: "IEC 60601-1, IEC 60601-2-54",
      iso: "ISO 13485:2016",
    },
    accessories: [
      "Sterile disposable C-arm drape kits (10 sets)",
      "Dual foot-switch and hand-switch exposure control",
      "Lightweight 0.5 mm Pb lead aprons (3 units), thyroid collars (3 units), lead goggles (2 units)",
      "Built-in online UPS with 15-minute emergency fluoroscopy backup",
    ],
    warranty: { years: 3, cmcStartYear: 4, cmcAnnualRate: 95000 },
    documentation: [
      "AERB Type Approval Certificate",
      "Site Acceptance Test (SAT) and Radiation Survey Report",
      "Full Service Manual with Schematics and Error Codes",
    ],
  },

  // 4. EQP-HV-004 — X-Ray Machine - 500 mA with DR/CR
  "EQP-HV-004": {
    equipmentCode: "EQP-HV-004",
    standardName: "X-Ray Machine - 500 mA with DR/CR",
    commonName: "500 mA X-Ray Machine",
    productCategory: "imaging",
    typicalDepartment: "Radiology",
    estimatedUnitRate: 3500000,
    general: {
      make: "Allengers / GE Healthcare / Siemens Healthineers / BPL Medical",
      model: "Mars 50 / Definium / Multix / similar",
      countryOfOrigin: "India / Germany / USA",
      hsnCode: "90221400",
      standardReference: "AERB Safety Code, BIS IS 7620",
    },
    technical: {
      powerSupply: "415 V AC, 3 Phase, 50 Hz ± 10%",
      powerConsumption: "High Frequency Generator Capacity ≥ 40–50 kW",
      dimensions: "Floor-to-ceiling tube stand, Floating table top 200 × 75 cm",
      weight: "Generator ~ 90 kg; Tube stand ~ 180 kg; Table ~ 140 kg",
      operatingTemp: "10°C to 40°C; Humidity: 10%–85% RH",
    },
    performance: {
      "Tube Current Output": "500 mA at 100 kV; 40–150 kVp in 1 kV steps",
      "X-Ray Tube Type": "Dual focus rotating anode (small 0.6 mm, large 1.2 mm), heat capacity ≥ 150 kHU",
      "Digital Detector": "43 × 43 cm (17 × 17 inch) wireless CsI Flat Panel Detector (FPD)",
      "Resolution & Pitch": "Pixel matrix ≥ 3072 × 3072, pixel pitch ≤ 140 μm, 16-bit A/D conversion",
      "Examination Table": "4-way floating top radiolucent table with electromagnetic brakes; patient load ≥ 200 kg",
      "Vertical Chest Stand": "Counterbalanced vertical bucky stand with oscillating grid (10:1 ratio)",
      "Acquisition Software": "DICOM 3.0 Worklist, PACS store, print, anatomical programming (APR > 200 protocols)",
    },
    regulatory: {
      aerbClearance: true,
      ceMark: true,
      bisIsiMark: "BIS IS 7620",
      iecStandard: "IEC 60601-1, IEC 60601-1-3, IEC 60601-2-54",
      iso: "ISO 13485:2016",
    },
    accessories: [
      "Wireless Flat Panel Detector with 2 rechargeable Li-ion batteries and charging station",
      "Radiation protective apparel: 4 Lead aprons (0.5 mm Pb eq), 4 thyroid shields, 2 gonad shields",
      "Lead glass 100 × 80 cm (2.0 mm Pb eq) for operator console partition",
      "Positioning sponge set and manual collimator with high-luminance LED lamp",
    ],
    warranty: { years: 3, cmcStartYear: 4, cmcAnnualRate: 110000 },
    documentation: [
      "AERB Type Approval Certificate",
      "Pre-installation guide and radiation survey report",
      "Operator and Biomedical Service Manuals",
    ],
  },

  // 5. EQP-HV-005 — Computerised Radiography System
  "EQP-HV-005": {
    equipmentCode: "EQP-HV-005",
    standardName: "Computerised Radiography System",
    commonName: "CR System",
    productCategory: "imaging",
    typicalDepartment: "Radiology",
    estimatedUnitRate: 1400000,
    general: {
      make: "Fujifilm / Carestream Health / Agfa Healthcare / Konica Minolta",
      model: "FCR Prima T2 / Vita Flex CR / CR 30-X / similar",
      countryOfOrigin: "Japan / USA / Germany",
      hsnCode: "90229090",
      standardReference: "BIS / ISO 13485 / DICOM 3.0",
    },
    technical: {
      powerSupply: "100–240 V AC, 50/60 Hz, single phase",
      powerConsumption: "≤ 300 W active scan; ≤ 80 W standby",
      dimensions: "Compact tabletop unit ≤ 60 × 60 × 40 cm",
      weight: "≤ 45 kg",
      operatingTemp: "15°C to 30°C; Humidity: 15%–80% RH",
    },
    performance: {
      "Throughput": "≥ 60 to 73 imaging plates (IP) per hour for 14 × 17 inch size",
      "Spatial Resolution": "High resolution 10 pixels/mm (100 μm sampling pitch)",
      "Grayscale Depth": "16 bits/pixel (65,536 shades of gray)",
      "Cassette Formats": "14×17\", 14×14\", 10×12\", 8×10\", and 24×30 cm cassettes",
      "Plate Erasing": "Automatic high-intensity LED plate erasing after read-out",
      "Workstation PC": "Core i5/i7, 16 GB RAM, 1 TB SSD, 21.5-inch medical grade LCD monitor",
      "DICOM Connectivity": "DICOM 3.0 Print, Store, Modality Worklist (MWL), Query/Retrieve",
    },
    regulatory: {
      aerbClearance: false,
      ceMark: true,
      bisIsiMark: "BIS / ISO 13485",
      iecStandard: "IEC 60950-1 / IEC 61010-1 / IEC 60601-1",
      iso: "ISO 13485:2016",
    },
    accessories: [
      "CR Imaging Cassettes with IP plates: 14×17\" (2 Nos.), 10×12\" (2 Nos.), 8×10\" (2 Nos.)",
      "High-speed Dry Laser / Thermal Medical Imager (DICOM Camera) with dual film trays",
      "2 kVA Online UPS with 30-minute backup",
      "Barcode scanner for patient cassette registration",
    ],
    warranty: { years: 3, cmcStartYear: 4, cmcAnnualRate: 45000 },
    documentation: [
      "User Manual and DICOM Conformance Statement",
      "CE Certificate and Factory Acceptance Test",
    ],
  },

  // 6. EQP-HV-006 — Colour Doppler Ultrasound System
  "EQP-HV-006": {
    equipmentCode: "EQP-HV-006",
    standardName: "Colour Doppler Ultrasound System",
    commonName: "Colour Doppler",
    productCategory: "imaging",
    typicalDepartment: "Radiology / OBG",
    estimatedUnitRate: 2800000,
    general: {
      make: "GE Healthcare / Philips / Mindray / Samsung Medison / Sonosite",
      model: "Logiq P9 / Affiniti 50 / DC-70 / similar",
      countryOfOrigin: "USA / Netherlands / South Korea / Japan",
      hsnCode: "90181200",
      standardReference: "PCPNDT Act Compliance, ISO 13485:2016",
    },
    technical: {
      powerSupply: "220–240 V AC, 50 Hz single phase with built-in battery backup",
      powerConsumption: "≤ 600 VA; Internal Li-ion battery ≥ 60 minutes scanning",
      dimensions: "Ergonomic cart with motorized height adjustment & swivel control panel",
      weight: "≤ 85 kg with locking swivel castors",
      operatingTemp: "10°C to 40°C; Humidity: 30%–80% RH",
    },
    performance: {
      "Transducer Ports": "≥ 4 active probe connectors with electronic switching",
      "Probes Included": "Broadband Convex (2–5 MHz), High-frequency Linear (5–12 MHz), Transvaginal / TVS (4–9 MHz)",
      "Imaging Modes": "B-Mode, M-Mode, Colour Doppler, Power Doppler, Pulsed Wave (PW), Continuous Wave (CW), Elastography",
      "Display Monitor": "≥ 21.5-inch high-resolution IPS/OLED monitor on articulating arm + 10.4-inch command touchscreen",
      "Dynamic Range": "≥ 240 dB; Cine memory ≥ 3,000 frames or 120 seconds",
      "Advanced Features": "Speckle reduction, spatial compound imaging, automated IMT, auto-follicle calculation, tissue harmonics (THI)",
      "Storage & Export": "1 TB internal SSD, DICOM 3.0, USB 3.0 ports, HDMI/DVI outputs",
    },
    regulatory: {
      pcpndtCompliance: true,
      ceMark: true,
      bisIsiMark: "BIS compliant / ISO 13485:2016",
      iecStandard: "IEC 60601-1, IEC 60601-2-37 (Ultrasound Safety)",
      iso: "ISO 13485:2016",
    },
    accessories: [
      "3 Broad-band Transducers (Convex, Linear, TVS)",
      "Sony / Mitsubishi Digital Thermal B&W Video Printer with 10 rolls high density paper",
      "2 kVA Online UPS with 45 minutes backup",
      "Transducer biopsy guide attachment for convex and endocavity probes",
      "Ultrasound transmission gel (5L can with dispenser bottle)",
    ],
    warranty: { years: 3, cmcStartYear: 4, cmcAnnualRate: 90000 },
    documentation: [
      "PCPNDT Registration support documents",
      "CE Certificate, Operator & Service Manuals",
    ],
  },

  // 7. EQP-HV-007 — Portable Ultrasound System with Colour Doppler
  "EQP-HV-007": {
    equipmentCode: "EQP-HV-007",
    standardName: "Portable Ultrasound System with Colour Doppler",
    commonName: "Portable USG Colour Doppler",
    productCategory: "imaging",
    typicalDepartment: "Radiology / Emergency",
    estimatedUnitRate: 1600000,
    general: {
      make: "Sonosite (Fujifilm) / Mindray / GE Healthcare / Philips",
      model: "M-Turbo / Edge II / ME8 / Vscan / similar",
      countryOfOrigin: "USA / Japan / South Korea",
      hsnCode: "90181200",
      standardReference: "PCPNDT Act compliance, MIL-STD-810G ruggedization, ISO 13485",
    },
    technical: {
      powerSupply: "100–240 V AC, 50/60 Hz; Rechargeable Li-Ion battery (boot-up time ≤ 20 sec)",
      powerConsumption: "≤ 150 W; Battery operating time ≥ 2.5 hours active scanning",
      dimensions: "Laptop/notebook style ≤ 38 × 35 × 7 cm",
      weight: "≤ 5.5 kg including battery",
      operatingTemp: "0°C to 45°C; Drop tested / ruggedized military standard MIL-STD-810G",
    },
    performance: {
      "Transducer Ports": "Dual active probe connectors with portable docking cart",
      "Probes": "Broadband Convex probe (2.0–5.5 MHz) & High-frequency Linear probe (6.0–13.0 MHz)",
      "Modes": "B, M, Colour Doppler (CFM), Power Doppler (PDI), PW Doppler, Directional PDI, Tissue Harmonic Imaging",
      "Display": "≥ 15-inch anti-glare high-resolution wide-angle LED display (tiltable up to 60°)",
      "Emergency FAST Protocol": "One-touch presets for Trauma FAST, Cardiac, Vascular, Abdominal, MSK, OB/GYN",
      "Connectivity": "USB 3.0, HDMI output, Wi-Fi / Ethernet DICOM transfer to PACS",
    },
    regulatory: {
      pcpndtCompliance: true,
      ceMark: true,
      bisIsiMark: "BIS compliant / ISO 13485",
      iecStandard: "IEC 60601-1, IEC 60601-2-37",
      iso: "ISO 13485:2016",
    },
    accessories: [
      "2 Probes (Curved Array Convex & High Frequency Linear)",
      "Height-adjustable mobile docking trolley with probe holders and cable management",
      "Heavy-duty rugged carrying case with shoulder strap",
      "2 Li-ion rechargeable battery packs with external charger",
      "Medical thermal B&W printer mounted on trolley",
    ],
    warranty: { years: 3, cmcStartYear: 4, cmcAnnualRate: 55000 },
    documentation: [
      "PCPNDT certification forms",
      "Factory test report, IFU manual, CE certificate",
    ],
  },

  // 8. EQP-HV-008 — Anaesthesia Workstation with Integrated Ventilator
  "EQP-HV-008": {
    equipmentCode: "EQP-HV-008",
    standardName: "Anaesthesia Workstation with Integrated Ventilator",
    commonName: "Anaesthesia Workstation",
    productCategory: "operation_theatre",
    typicalDepartment: "Anaesthesia / OT",
    estimatedUnitRate: 2200000,
    general: {
      make: "Dräger / GE Datex Ohmeda / Mindray / Penlon",
      model: "Fabius Plus / Aisys CS2 / WATO EX-65 / Prima 450",
      countryOfOrigin: "Germany / USA / UK",
      hsnCode: "90189099",
      standardReference: "ISO 80601-2-13 (Anaesthetic workstations), BIS IS 11378",
    },
    technical: {
      powerSupply: "220–240 V AC, 50 Hz; Internal battery backup ≥ 120 minutes",
      powerConsumption: "≤ 250 W",
      dimensions: "OT trolley frame with 3 locking castors, write-on pullout table, 3 storage drawers",
      weight: "~ 125 kg",
      operatingTemp: "10°C to 40°C; Pipeline inputs: O2, N2O, Air at 3.5–5.0 bar",
    },
    performance: {
      "Integrated Ventilator": "Microprocessor-controlled ventilator (pneumatically or electronically driven)",
      "Ventilation Modes": "VCV, PCV, SIMV-V, SIMV-P, PSV with apnea backup, Manual / Spontaneous",
      "Tidal Volume Range": "20 ml to 1500 ml (Neonatal to Adult capability)",
      "Respiratory Rate": "4 to 100 bpm; I:E Ratio: 4:1 to 1:8; PEEP: 0 to 30 cmH2O",
      "Vaporizers": "Dual interlock Selectatec mounting for Isoflurane and Sevoflurane (temp and flow compensated)",
      "Integrated Monitoring": "12.1-inch color TFT display showing airway pressure, flow, volume loops, FiO2, compliance",
      "Scavenging Interface": "Active AGSS (Anaesthetic Gas Scavenging System) interface included",
    },
    regulatory: {
      ceMark: true,
      bisIsiMark: "BIS IS 11378 / ISO 80601-2-13",
      iecStandard: "IEC 60601-1, IEC 60601-2-13",
      iso: "ISO 13485:2016",
    },
    accessories: [
      "Temperature compensated Sevoflurane & Isoflurane vaporizers (Key-fill type)",
      "Autoclavable adult and paediatric patient breathing circuits (5 sets each)",
      "Reusable silicone face masks (Sizes 1, 2, 3, 4, 5)",
      "Carbon dioxide absorber canister (1.5 kg double canister) with quick change mechanism",
      "Gas supply high-pressure hoses with colour coded NIST connectors (O2, N2O, Air) - 5m each",
    ],
    warranty: { years: 3, cmcStartYear: 4, cmcAnnualRate: 75000 },
    documentation: [
      "CE Certificate, Gas Safety Test Certificate",
      "Factory Calibration Report, Service Manual with Schematics",
    ],
  },

  // 9. EQP-HV-009 — ICU Ventilator - Adult and Paediatric
  "EQP-HV-009": {
    equipmentCode: "EQP-HV-009",
    standardName: "ICU Ventilator - Adult and Paediatric",
    commonName: "ICU Ventilator",
    productCategory: "critical_care",
    typicalDepartment: "ICU / Emergency",
    estimatedUnitRate: 1150000,
    general: {
      make: "Hamilton Medical / Maquet (Getinge) / Draeger / Philips / Mindray",
      model: "Hamilton-C3 / Servo-u / Evita V300 / SV300",
      countryOfOrigin: "Switzerland / Sweden / Germany / USA",
      hsnCode: "90189099",
      standardReference: "ISO 80601-2-12 (Critical care ventilators), BIS IS 16428",
    },
    technical: {
      powerSupply: "100–240 V AC, 50/60 Hz; Dual hot-swappable internal batteries (minimum 4 hours runtime)",
      powerConsumption: "≤ 180 W; Built-in high performance turbine blower (operates without central compressed air)",
      dimensions: "Base unit ~ 38 × 30 × 42 cm; Complete cart with articulated support arm",
      weight: "Base unit ≤ 18 kg; Trolley ~ 25 kg",
      operatingTemp: "5°C to 40°C; Humidity: 10%–95% RH",
    },
    performance: {
      "Patient Scope": "Invasive and Non-Invasive (NIV) ventilation for Adult, Paediatric, and Infant (from 3 kg up)",
      "Tidal Volume": "20 ml to 2000 ml",
      "Peak Flow Delivery": "Up to 240 L/min (turbine generated)",
      "Ventilation Modes": "Volume (VCV/AC, SIMV-V), Pressure (PCV/AC, SIMV-P, APRV/BIPAP, PRVC), Spontaneous (PSV, CPAP), High Flow O2 therapy (HFOT up to 60 L/min)",
      "Lung Mechanics": "Real-time curves (Pressure, Flow, Volume), Loops (P-V, F-V, P-F), Auto-PEEP, Static Compliance, Airway Resistance, P0.1, NIF",
      "Display Console": "≥ 15-inch high-resolution medical capacitive touchscreen (swivel & tilt adjustable)",
      "Integrated Nebulizer": "Synchronized pneumatic and vibrating mesh electronic nebulizer control",
    },
    regulatory: {
      ceMark: true,
      bisIsiMark: "BIS IS 16428 / ISO 80601-2-12",
      iecStandard: "IEC 60601-1, IEC 60601-1-2",
      iso: "ISO 13485:2016",
    },
    accessories: [
      "Servo-controlled heated wire respiratory humidifier (Fisher & Paykel MR850 or equivalent)",
      "Autoclavable expiratory valve and flow sensors (3 sets)",
      "Reusable adult and paediatric silicone breathing circuits (5 sets each)",
      "Medical grade mobile trolley with articulated support arm, basket, and dual cylinder holders",
      "Oxygen high-pressure connecting hose (3m, BS/DIN/NIST)",
    ],
    warranty: { years: 3, cmcStartYear: 4, cmcAnnualRate: 48000 },
    documentation: [
      "IEC 60601 safety test report, Calibration certificate",
      "Operator handbook, Biomedical service manual",
    ],
  },

  // 10. EQP-HV-010 — Paediatric / Neonatal Ventilator
  "EQP-HV-010": {
    equipmentCode: "EQP-HV-010",
    standardName: "Paediatric / Neonatal Ventilator",
    commonName: "Paediatric Ventilator",
    productCategory: "critical_care",
    typicalDepartment: "Paediatrics / SNCU",
    estimatedUnitRate: 1350000,
    general: {
      make: "Stephan / Draeger / SLE / Hamilton Medical / GE Healthcare",
      model: "Stephanie / Babylog VN500 / SLE5000 / Hamilton-C1 neo",
      countryOfOrigin: "Germany / UK / Switzerland",
      hsnCode: "90189099",
      standardReference: "ISO 80601-2-12, Neonatal Resuscitation Guidelines",
    },
    technical: {
      powerSupply: "220–240 V AC, 50 Hz; Built-in battery backup ≥ 3 hours",
      powerConsumption: "≤ 160 W",
      dimensions: "Compact neonatal trolley with mounting rail for syringe pumps and humidifiers",
      weight: "~ 22 kg",
      operatingTemp: "10°C to 40°C; Dual gas blender (O2 & Air 2.8 to 6.0 bar)",
    },
    performance: {
      "Target Patient Group": "Extremely Low Birth Weight (ELBW) neonates from 300 grams up to pediatric patients of 30 kg",
      "Tidal Volume": "2 ml to 300 ml (ultra-micro resolution for neonates: 0.1 ml steps)",
      "Ventilation Modes": "TCPL, CPAP, SIPPV, SIMV, PSV, Volume Guarantee (VG), HFO (High Frequency Oscillation up to 20 Hz with active exhalation), nCPAP, HFNC",
      "Flow Trigger": "Sensitive proximal neonatal flow trigger down to 0.05 L/min",
      "Monitoring": "Proximal airway pressure, delivered minute volume, leakage compensation up to 80% in NIV",
      "Display Console": "≥ 12-inch anti-glare touch display showing neonate lung mechanics and continuous FiO2 monitoring",
    },
    regulatory: {
      ceMark: true,
      bisIsiMark: "BIS compliant / ISO 13485:2016",
      iecStandard: "IEC 60601-1, IEC 60601-2-12",
      iso: "ISO 13485:2016",
    },
    accessories: [
      "Neonatal active heated humidifier with heated wire circuit",
      "Proximal neonatal flow sensors (pack of 10 reusable / 50 single-use)",
      "Neonatal nCPAP generator and prongs (Sizes 00, 0, 1, 2, 3, 4)",
      "Test lung for neonates (50 ml)",
      "High-pressure O2 and medical air hoses with quick connect couplers",
    ],
    warranty: { years: 3, cmcStartYear: 4, cmcAnnualRate: 55000 },
    documentation: [
      "Neonatal clinical validation study report",
      "Calibration certificate, Service schematics",
    ],
  },

  // 11. EQP-HV-011 — ABG and Electrolyte Analyser
  "EQP-HV-011": {
    equipmentCode: "EQP-HV-011",
    standardName: "ABG and Electrolyte Analyser",
    commonName: "ABG Analyser",
    productCategory: "laboratory",
    typicalDepartment: "ICU / Laboratory",
    estimatedUnitRate: 650000,
    general: {
      make: "Radiometer / Werfen (Instrumentation Laboratory) / Abbott / Roche / Siemens",
      model: "ABL90 FLEX / GEM Premier 3500 / i-STAT / Cobas b 123",
      countryOfOrigin: "Denmark / USA / Germany / Switzerland",
      hsnCode: "90278090",
      standardReference: "CLIA, NCCLS/CLSI guidelines, ISO 15189, CE-IVD",
    },
    technical: {
      powerSupply: "100–240 V AC, 50/60 Hz; Internal battery backup ≥ 2 hours continuous standby",
      powerConsumption: "≤ 100 W",
      dimensions: "Compact benchtop unit ≤ 35 × 40 × 45 cm",
      weight: "≤ 15 kg",
      operatingTemp: "15°C to 32°C; Humidity: 20%–85% RH",
    },
    performance: {
      "Sample Types": "Whole blood (heparinized arterial, venous, capillary), syringe or capillary tube",
      "Sample Volume": "Ultra-low sample requirement ≤ 65 μL",
      "Analysis Time": "Results within ≤ 35 to 50 seconds",
      "Measured Parameters": "pH, pCO2, pO2, Na+, K+, Cl-, Ca++, Glucose, Lactate, Total Bilirubin, Haematocrit (Hct)",
      "Co-oximetry": "Built-in optical co-oximetry measuring tHb, sO2, O2Hb, COHb, MetHb, HHb",
      "Calculated Parameters": "HCO3-, Standard HCO3-, Base Excess (BE), Anion Gap, p50, AaDO2, PaO2/FiO2 ratio",
      "Quality Control": "Automated continuous liquid calibration and automated electronic Quality Control (AQC) cartridge",
      "Connectivity": "Bi-directional LIS/HIS interface via Ethernet/Wi-Fi with ASTM and HL7 protocols",
    },
    regulatory: {
      ceMark: true,
      bisIsiMark: "ISO 13485:2016, ISO 15189",
      iecStandard: "IEC 61010-1, IEC 61010-2-101 (IVD Safety)",
      iso: "ISO 13485, CE-IVD",
    },
    accessories: [
      "Multi-parameter all-in-one reagent cartridge with onboard sensor cassette (300 tests)",
      "Integrated 2D barcode scanner for patient/operator ID and consumable lot tracking",
      "Built-in thermal paper printer with 10 rolls",
      "Heparinized arterial blood sampling kits (100 units)",
      "External online UPS 1 kVA with 1 hour backup",
    ],
    warranty: { years: 3, cmcStartYear: 4, cmcAnnualRate: 35000 },
    documentation: [
      "CE-IVD declaration of conformity",
      "Quality control validation protocol and Maintenance SOP",
    ],
  },

  // 12. EQP-HV-012 — Fully Automated Biochemistry Analyser
  "EQP-HV-012": {
    equipmentCode: "EQP-HV-012",
    standardName: "Fully Automated Biochemistry Analyser",
    commonName: "Biochemistry Analyser",
    productCategory: "laboratory",
    typicalDepartment: "Biochemistry Laboratory",
    estimatedUnitRate: 2500000,
    general: {
      make: "Beckman Coulter / Roche Diagnostics / Mindray / Erba Mannheim / Siemens",
      model: "AU480 / Cobas c311 / BS-480 / XL-640",
      countryOfOrigin: "Japan / Germany / USA / India",
      hsnCode: "90278090",
      standardReference: "IFCC methods, ISO 15189, CE-IVD",
    },
    technical: {
      powerSupply: "220–240 V AC, 50 Hz with dedicated 3 kVA online UPS",
      powerConsumption: "≤ 1500 VA; Water consumption ≤ 15 Litres/hour (CLRW grade water)",
      dimensions: "Floor standing / heavy benchtop ≤ 120 × 85 × 115 cm",
      weight: "~ 250 kg",
      operatingTemp: "15°C to 30°C; Humidity: 35%–80% RH",
    },
    performance: {
      "Throughput": "Minimum 400 photometric tests/hour (up to 600 tests/hour with integrated ISE module)",
      "Sample Loading": "Continuous sample rack loading ≥ 80 samples simultaneously with STAT priority",
      "Reagent Carousel": "≥ 60 refrigerated on-board reagent positions (2°C to 8°C)",
      "Photometer": "Multi-wavelength diffraction grating photometer (340 nm to 800 nm, 12 wavelengths)",
      "Reaction Volume": "Micro-volume reaction carrousel (minimum 100 μL to 250 μL per test)",
      "Pipetting Probe": "Liquid level detection, vertical and horizontal collision protection, clot detection",
      "Washing Station": "8-stage automatic cuvette washing with heated water and detergent",
      "Software & QC": "Real-time reaction curves, Levey-Jennings QC charts, Westgard multi-rules, bi-directional HL7 LIS",
    },
    regulatory: {
      ceMark: true,
      bisIsiMark: "ISO 13485:2016, ISO 9001",
      iecStandard: "IEC 61010-1, IEC 61010-2-081, IEC 61326-2-6",
      iso: "ISO 13485:2016, CE-IVD",
    },
    accessories: [
      "Complete ISE module for Na+, K+, Cl- determination",
      "Dedicated Reverse Osmosis (RO) water purification plant (25 LPH capacity, Type 1 CLRW grade)",
      "3 kVA Online UPS with 60 minutes battery backup",
      "Computer workstation (Core i7, 16GB RAM, 24-inch monitor, laser report printer)",
      "Starter pack of calibration and multi-level QC controls",
    ],
    warranty: { years: 3, cmcStartYear: 4, cmcAnnualRate: 95000 },
    documentation: [
      "CE-IVD certificate and precision validation dossier",
      "Service manual with hydraulic and electrical schematics",
    ],
  },

  // 13. EQP-HV-013 — 5-Part Haematology Analyser
  "EQP-HV-013": {
    equipmentCode: "EQP-HV-013",
    standardName: "5-Part Haematology Analyser",
    commonName: "5-Part Cell Counter",
    productCategory: "laboratory",
    typicalDepartment: "Pathology Laboratory",
    estimatedUnitRate: 1800000,
    general: {
      make: "Sysmex / Beckman Coulter / Mindray / Horiba Medical / Nihon Kohden",
      model: "XN-350 / DxH 520 / BC-6200 / Yumizen H550",
      countryOfOrigin: "Japan / USA / France",
      hsnCode: "90278090",
      standardReference: "ICSH guidelines, CE-IVD, ISO 15189",
    },
    technical: {
      powerSupply: "100–240 V AC, 50/60 Hz; Power consumption ≤ 300 W",
      dimensions: "Compact benchtop unit with built-in autoloader ≤ 65 × 60 × 55 cm",
      weight: "~ 55 kg",
      operatingTemp: "15°C to 30°C; Humidity: 30%–85% RH",
    },
    performance: {
      "Throughput": "≥ 60 samples per hour in both autoloader and open-vial modes",
      "Measurement Principle": "Semiconductor laser flow cytometry with fluorescent dye for WBC differential; Impedance method for RBC & PLT; Cyanide-free colorimetry for Hemoglobin",
      "Parameters Reported": "≥ 28 reportable parameters including 5-part WBC differential (Neutrophils, Lymphocytes, Monocytes, Eosinophils, Basophils absolute & %), plus immature granulocytes (IG% and IG#)",
      "Sample Volume": "Whole blood ≤ 20 μL (ideal for paediatric/geriatric samples)",
      "Autoloader Capacity": "≥ 50 tube walk-away loading (5 racks × 10 tubes) with internal barcode scanner",
      "Flagging System": "Advanced flags for atypical lymphocytes, blast cells, nucleated RBC, platelet clumps, RBC fragments",
      "Quality Control": "Comprehensive onboard QC management with 20 QC files, L-J and X-bar M charts",
    },
    regulatory: {
      ceMark: true,
      bisIsiMark: "ISO 13485:2016",
      iecStandard: "IEC 61010-1, IEC 61010-2-101",
      iso: "ISO 13485:2016, CE-IVD",
    },
    accessories: [
      "Autoloader rack set (5 sample tube racks)",
      "Desktop PC workstation with preloaded software, 22-inch LED monitor and external laser printer",
      "1.5 kVA Online UPS with 45-min battery backup",
      "Handheld barcode reader for open vial manual sampling",
      "Starter reagent pack (Diluent, Lyse, Staining dye, Detergent, QC tri-pack)",
    ],
    warranty: { years: 3, cmcStartYear: 4, cmcAnnualRate: 65000 },
    documentation: [
      "CE-IVD certificate and ICSH evaluation report",
      "Safety Data Sheets (SDS) and Operator instruction guide",
    ],
  },

  // 14. EQP-HV-014 — Horizontal High-Pressure Autoclave
  "EQP-HV-014": {
    equipmentCode: "EQP-HV-014",
    standardName: "Horizontal High-Pressure Autoclave",
    commonName: "Horizontal Autoclave",
    productCategory: "sterilization",
    typicalDepartment: "CSSD / OT",
    estimatedUnitRate: 850000,
    general: {
      make: "Nat Steel / Medivators / Steris / Machinfabrik / Tuttnauer",
      model: "Steri-Vac 300 / H-Series / similar",
      countryOfOrigin: "India / USA / Israel",
      hsnCode: "84192010",
      standardReference: "BIS IS 3829 (Steam sterilizers), ASME Section VIII Boiler Code, IBR",
    },
    technical: {
      powerSupply: "415 V AC ± 10%, 3 Phase, 50 Hz, 4 Wire; Total electrical load 18 kW",
      powerConsumption: "Built-in SS 316 electric steam generator with immersion heaters & low-water cutoff",
      dimensions: "Chamber: dia ≥ 500 mm, depth ≥ 1200 mm; Chamber volume ≥ 300 to 400 Litres",
      weight: "~ 850 kg",
      operatingTemp: "Working temperature 121°C and 134°C (pressure 1.2 to 2.2 kg/cm² / 15 to 32 psi)",
    },
    performance: {
      "Chamber Material": "Inner chamber and door made of SS 316L (≥ 6 mm thick); Outer jacket made of SS 304 (≥ 5 mm thick)",
      "Vacuum System": "High efficiency water-ring vacuum pump for air removal (prevents air pockets) and rapid post-vacuum drying",
      "Cycle Programs": "Standard wrapped instruments (134°C, 5 min), Bowie-Dick test, Leak test cycle, Gentle cycle for rubber/plastics (121°C, 20 min)",
      "Door Mechanism": "Radial arm door with multi-point locking and pneumatic silicone door gasket",
      "Microprocessor PLC": "PLC controller with 7-inch color touch HMI screen displaying pressure, chamber temp, jacket temp, cycle time",
      "Cycle Logging": "In-built thermal dot-matrix printer recording cycle parameters every minute for audit trail",
    },
    regulatory: {
      bisIsiMark: "BIS IS 3829 (Part 1, 2) / IBR Certified",
      ceMark: true,
      iecStandard: "IEC 61010-1, IEC 61010-2-040",
      iso: "ISO 13485:2016, ASME Section VIII",
    },
    accessories: [
      "Stainless steel (SS 316) loading carriage trolley with 2 removable wire-mesh shelves",
      "External transfer trolley on heavy-duty polyurethane wheels",
      "Automatic water softener unit (capacity 500 LPH) to prevent scaling in boiler",
      "Dual safety pop-up valves and silicone gasket replacement kit",
      "Biological indicator test kit (100 ampoules) & Bowie-Dick test packs (20 Nos.)",
    ],
    warranty: { years: 3, cmcStartYear: 4, cmcAnnualRate: 38000 },
    documentation: [
      "IBR Boiler Test Certificate",
      "Hydraulic Test Certificate at 1.5× working pressure",
      "Calibration certificate for pressure and temperature sensors",
    ],
  },

  // 15. EQP-HV-015 — Digital Dental OPG X-Ray System
  "EQP-HV-015": {
    equipmentCode: "EQP-HV-015",
    standardName: "Digital Dental OPG X-Ray System",
    commonName: "Dental OPG X-Ray",
    productCategory: "imaging",
    typicalDepartment: "Dental",
    estimatedUnitRate: 1950000,
    general: {
      make: "Planmeca / Carestream Dental / Vatech / Dentsply Sirona / Genoray",
      model: "ProMax 2D / CS 8100 / PaX-i / Orthophos E",
      countryOfOrigin: "Finland / USA / South Korea / Germany",
      hsnCode: "90221410",
      standardReference: "AERB Safety Code, BIS IS 7620, ISO 13485",
    },
    technical: {
      powerSupply: "220–240 V AC, 50 Hz, single phase, 16A with 3 kVA online UPS",
      powerConsumption: "High frequency generator 60–90 kV, 2–15 mA (max 2 kW)",
      dimensions: "Motorized telescopic column height 150 to 220 cm; Footprint ≤ 110 × 120 cm",
      weight: "~ 120 kg (free-standing base plate or wall-mounted)",
      operatingTemp: "15°C to 35°C; Focal spot 0.5 mm IEC 60336",
    },
    performance: {
      "Sensor Technology": "Direct CMOS / CdTe sensor with fiber-optic coupling",
      "Acquisition Modes": "Standard Panoramic (Adult & Paediatric), TMJ open/close (lateral and PA), Bitewing, Maxillary Sinus, Segmented panoramic",
      "Scan Duration": "Fast panoramic scan 8 to 14 seconds for minimal patient dose and motion artifact",
      "Patient Positioning": "Face-to-face open positioning with 3 positioning laser lights (Frankfort, Mid-sagittal, Canine focal trough)",
      "Image Resolution": "Pixel size ≤ 48 μm; Spatial resolution ≥ 7.0 lp/mm",
      "Dental Software": "Multi-user DICOM 3.0 dental software with measurement tools, implant simulation, nerve canal tracing",
    },
    regulatory: {
      aerbClearance: true,
      ceMark: true,
      bisIsiMark: "BIS compliant / ISO 13485:2016",
      iecStandard: "IEC 60601-1, IEC 60601-2-63 (Dental X-ray)",
      iso: "ISO 13485:2016",
    },
    accessories: [
      "Free-standing stable base plate assembly",
      "Autoclavable bite-blocks (5 Nos.), chin rest for edentulous patients, TMJ nose support",
      "High-end review PC workstation with 24\" IPS DICOM display and imaging software license",
      "3 kVA Online UPS with 30-min backup",
      "Radiation protective lead apron with thyroid shield (0.5 mm Pb eq)",
    ],
    warranty: { years: 3, cmcStartYear: 4, cmcAnnualRate: 65000 },
    documentation: [
      "AERB Type Approval Certificate",
      "Factory QA compliance and DICOM Conformance statement",
    ],
  },

  // 16. EQP-HV-016 — EEG Machine - Digital
  "EQP-HV-016": {
    equipmentCode: "EQP-HV-016",
    standardName: "EEG Machine - Digital",
    commonName: "EEG Machine",
    productCategory: "neurodiagnostics",
    typicalDepartment: "Neurology / Radiology",
    estimatedUnitRate: 950000,
    general: {
      make: "Natus (Nicolet) / Nihon Kohden / RMS India / Medicaid / EB Neuro",
      model: "NicoletOne / EEG-1200 / Maximus 32 / similar",
      countryOfOrigin: "USA / Japan / India / Italy",
      hsnCode: "90181990",
      standardReference: "IFCN (International Federation of Clinical Neurophysiology), ISO 13485",
    },
    technical: {
      powerSupply: "220–240 V AC, 50 Hz; Built-in battery backup ≥ 4 hours",
      powerConsumption: "≤ 100 W",
      dimensions: "Ergonomic hospital mobile cart with articulated electrode arm",
      weight: "~ 45 kg complete cart",
      operatingTemp: "10°C to 40°C; Shielded USB / fiber-optic headbox connection",
    },
    performance: {
      "Channel Count": "32 Channels (24 standard 10-20 EEG channels + 8 polygraphy channels for ECG, EMG, EOG, Respiration)",
      "A/D Conversion": "24-bit high-resolution delta-sigma conversion, sampling frequency up to 4000 Hz per channel",
      "CMRR & Noise": "CMRR ≥ 110 dB; Input impedance ≥ 100 MΩ; Noise level < 1.5 μV p-p",
      "Signal Filters": "High pass (0.01 to 5 Hz), Low pass (15 to 100 Hz), Notch filter (50 Hz)",
      "Photic Stimulator": "High intensity LED strobe flash stimulator (frequency 1 to 60 Hz with programmable train sequences)",
      "Software Analytics": "Montages re-montaging (Bipolar, Referential, Average), Spectral analysis (FFT power spectrum, CSA, DSA), Automated spike and wave detection, Video-EEG synchronization",
    },
    regulatory: {
      ceMark: true,
      bisIsiMark: "BIS compliant / ISO 13485:2016",
      iecStandard: "IEC 60601-1 (Type BF/CF safety), IEC 60601-2-26 (EEG Safety)",
      iso: "ISO 13485:2016",
    },
    accessories: [
      "Reusable gold-plated / Ag-AgCl cup electrodes (set of 50 electrodes)",
      "Adult and paediatric EEG caps with pre-positioned electrode holders (Small, Medium, Large)",
      "Articulated spring-balanced electrode cable arm on mobile cart",
      "High-intensity flash photic stimulator with flexible stand",
      "Skin prep abrasive paste (Ten20 / NuPrep - 5 tubes) and conductive adhesive paste",
      "Medical PC with dual 24-inch monitors and HP high-speed laser printer",
      "1 kVA Online UPS with 1 hour battery backup",
    ],
    warranty: { years: 3, cmcStartYear: 4, cmcAnnualRate: 35000 },
    documentation: [
      "IFCN compliance certificate, Electrical safety inspection report",
      "Clinical user manual, Calibration certificate",
    ],
  },

  // 17. EQP-HV-017 — Laparoscopy Tower with Instruments
  "EQP-HV-017": {
    equipmentCode: "EQP-HV-017",
    standardName: "Laparoscopy Tower with Instruments",
    commonName: "Laparoscopy System",
    productCategory: "surgical_systems",
    typicalDepartment: "General Surgery / OBG",
    estimatedUnitRate: 3800000,
    general: {
      make: "Karl Storz / Stryker / Olympus / Richard Wolf",
      model: "Image1 S / 1688 AIM 4K / Visera Elite II / similar",
      countryOfOrigin: "Germany / USA / Japan",
      hsnCode: "90189022",
      standardReference: "ISO 13485, CE Class IIb, IEC 60601-2-18",
    },
    technical: {
      powerSupply: "220–240 V AC, 50 Hz with 3 kVA online isolation UPS",
      powerConsumption: "Full tower load ≤ 1200 W",
      dimensions: "Tower cart ~ 75 × 65 × 165 cm; Weight: ~ 110 kg",
      weight: "Complete tower ~ 110 kg",
      operatingTemp: "10°C to 40°C; Humidity: 20%–80% RH",
    },
    performance: {
      "Camera System": "Ultra High Definition 4K / Full HD 3-Chip CMOS camera system with native 3840 × 2160 resolution, auto-focus, and optical zoom",
      "Light Source": "300W Xenon equivalent high-intensity LED light source (lamp life ≥ 30,000 hours, colour temperature 6500K daylight)",
      "Fiber Optic Cable": "High-transmission bundle high-temperature resistant fiber optic light cable (4.8 mm diameter, 300 cm length)",
      "Telescopes (Endoscopes)": "High-definition rod-lens autoclavable telescopes: 10 mm 0° (1 No.), 10 mm 30° (1 No.), 5 mm 30° (1 No.)",
      "Insufflator": "High-flow electronic CO2 insufflator (flow rate 40 to 50 Litres/min) with gas heating and automatic pressure relief",
      "Surgical Monitor": "31-inch or 32-inch 4K medical surgical monitor with optical bonding anti-reflective glass",
      "Digital Recording": "High-capacity digital 4K video and still image capture system (1 TB internal storage with USB export)",
    },
    regulatory: {
      ceMark: true,
      bisIsiMark: "BIS compliant / ISO 13485:2016",
      iecStandard: "IEC 60601-1, IEC 60601-2-18 (Endoscopic equipment)",
      iso: "ISO 13485:2016",
    },
    accessories: [
      "Comprehensive hand instrument set: Veress needle (2 Nos.), Trocar with cannula (10mm - 2 Nos., 5mm - 4 Nos.), Maryland dissector, Atraumatic grasping forceps (2 Nos.), Curved Metzenbaum scissors, Bipolar forceps, Needle holder (straight and curved - 2 Nos.), Suction-irrigation cannula (5mm and 10mm), Clip applicator (medium/large)",
      "High pressure CO2 gas regulator and connection hose with pin-index connector",
      "3 kVA Medical grade isolation UPS with 30-min backup",
    ],
    warranty: { years: 3, cmcStartYear: 4, cmcAnnualRate: 130000 },
    documentation: [
      "CE Certificate, Sterilization compatibility guide (Autoclave & STERRAD)",
      "User & Biomedical Service manuals",
    ],
  },

  // 18. EQP-HV-018 — Multipara Patient Monitor with EtCO2
  "EQP-HV-018": {
    equipmentCode: "EQP-HV-018",
    standardName: "Multipara Patient Monitor with EtCO2",
    commonName: "Multipara Monitor with EtCO2",
    productCategory: "patient_monitoring",
    typicalDepartment: "ICU / OT / Emergency",
    estimatedUnitRate: 240000,
    general: {
      make: "Mindray / Philips / BPL Medical / Nihon Kohden / Contec",
      model: "ePM 12M / IntelliVue MX450 / Ultima Prime / similar",
      countryOfOrigin: "USA / Netherlands / India / Japan",
      hsnCode: "90181990",
      standardReference: "IEC 60601-2-49 (Multi-parameter patient monitoring), ISO 13485",
    },
    technical: {
      powerSupply: "100–240 V AC, 50/60 Hz; Rechargeable Li-Ion battery (≥ 4 hours continuous monitoring)",
      powerConsumption: "≤ 70 W",
      dimensions: "Compact portable design ≤ 32 × 28 × 16 cm with integrated bed-rail carrying handle",
      weight: "≤ 4.5 kg including battery",
      operatingTemp: "5°C to 40°C; Humidity: 15%–90% RH",
    },
    performance: {
      "Display Screen": "12.1-inch high-resolution color TFT LED touchscreen displaying minimum 8 real-time waveforms",
      "Standard Parameters": "5-lead / 12-lead ECG, Respiration, SpO2 (Nellcor or Masimo pulse oximetry), NIBP (oscillometric with infant/pediatric/adult modes), Dual Temperature, Dual Invasive Blood Pressure (IBP)",
      "Capnography (EtCO2)": "Microstream or Sidestream End-Tidal CO2 measurement with real-time capnogram curve, RR, and EtCO2 digital readout (0–150 mmHg)",
      "Arrhythmia & ST": "Multi-lead arrhythmia detection (≥ 24 events), ST segment analysis, QT/QTc interval analysis",
      "Trend Memory": "120 hours graphic and tabular trend review, 1000 NIBP measurements, 60 alarm event recalls",
      "Network Connectivity": "Wi-Fi and Ethernet LAN connectivity for Central Monitoring Station (CMS) integration and HL7 export",
    },
    regulatory: {
      ceMark: true,
      bisIsiMark: "BIS IS 13450 / ISO 13485:2016",
      iecStandard: "IEC 60601-1, IEC 60601-2-49, IEC 60601-1-8 (Alarms)",
      iso: "ISO 13485:2016",
    },
    accessories: [
      "5-lead ECG cable with lead-wires and reusable chest electrodes (2 sets)",
      "Reusable adult, paediatric and infant SpO2 finger sensors (1 each)",
      "NIBP cuffs (Adult, Large Adult, Paediatric, Infant) with 3m air hose",
      "Sidestream EtCO2 module with 20 sample lines and airway adapters",
      "Surface and rectal temperature probes (1 each)",
      "Wall mounting bracket with swivel arm and quick release plate",
    ],
    warranty: { years: 3, cmcStartYear: 4, cmcAnnualRate: 12000 },
    documentation: [
      "CE Certificate, Calibration certificate",
      "Operator manual, Central Monitoring Station (CMS) integration guide",
    ],
  },

  // 19. EQP-HV-019 — Biphasic Defibrillator with AED and Pacing
  "EQP-HV-019": {
    equipmentCode: "EQP-HV-019",
    standardName: "Biphasic Defibrillator with AED and Pacing",
    commonName: "Defibrillator",
    productCategory: "emergency",
    typicalDepartment: "ICU / Emergency / OT",
    estimatedUnitRate: 380000,
    general: {
      make: "Zoll Medical / Philips Healthcare / Mindray / BPL Medical / Nihon Kohden",
      model: "R Series / HeartStart XL+ / BeneHeart D3 / DF 2617",
      countryOfOrigin: "USA / Netherlands / India / Japan",
      hsnCode: "90189099",
      standardReference: "AHA / ERC Resuscitation Guidelines 2020, IEC 60601-2-4",
    },
    technical: {
      powerSupply: "100–240 V AC, 50/60 Hz; Dual battery operation providing ≥ 5 hours monitoring or 200 shocks at max energy",
      powerConsumption: "≤ 120 W during charging",
      dimensions: "Rugged shock-absorbing casing with integrated carrying handle ≤ 30 × 30 × 25 cm",
      weight: "≤ 6.5 kg including battery and external paddles",
      operatingTemp: "0°C to 50°C; Ingress protection IP44 (splash-resistant)",
    },
    performance: {
      "Defibrillation Waveform": "Biphasic truncated exponential (BTE) or Rectilinear Biphasic waveform with impedance compensation (25–250 ohms)",
      "Energy Range": "1 Joule to 200/360 Joules in 18 steps (paediatric low-energy precision from 1J to 10J)",
      "Charge Speed": "Less than 5 seconds to 200 Joules; less than 7 seconds to maximum 360 Joules",
      "Operating Modes": "Manual Defibrillation (Sync cardioversion & Async), Automated External Defibrillator (AED) mode with voice/visual CPR prompts, Non-Invasive Transcutaneous Pacing (Demand & Fixed, 30–180 ppm, 0–200 mA), Multi-parameter Monitoring (ECG, SpO2, NIBP)",
      "Display Screen": "≥ 7-inch high-resolution colour TFT display showing ECG trace, heart rate, energy selected, delivered shocks, CPR feedback",
      "Strip Chart Recorder": "50 mm high-resolution dual-channel thermal strip chart recorder with automatic printout on shock delivery",
    },
    regulatory: {
      ceMark: true,
      bisIsiMark: "BIS IS 13450 / ISO 13485",
      iecStandard: "IEC 60601-1, IEC 60601-2-4 (Cardiac defibrillators)",
      iso: "ISO 13485:2016",
    },
    accessories: [
      "External defibrillator paddles (Adult paddles with slide-off snap-in paediatric conversion)",
      "Hands-free multifunction pacing/defibrillation pads with cable adapter (5 adult pairs, 2 paediatric pairs)",
      "3-lead ECG monitoring patient cable",
      "Reusable adult SpO2 sensor",
      "10 rolls of thermal recording paper",
      "Heavy-duty ambulance / crash-cart mounting bracket",
    ],
    warranty: { years: 3, cmcStartYear: 4, cmcAnnualRate: 18000 },
    documentation: [
      "Shock calibration test certificate, CE Certificate",
      "Operator training wall chart, Technical service manual",
    ],
  },

  // 20. EQP-HV-020 — Dialysis Machine
  "EQP-HV-020": {
    equipmentCode: "EQP-HV-020",
    standardName: "Dialysis Machine",
    commonName: "Haemodialysis Machine",
    productCategory: "renal_care",
    typicalDepartment: "Dialysis Unit",
    estimatedUnitRate: 850000,
    general: {
      make: "Fresenius Medical Care / B. Braun / Nipro / Baxter (Gambro) / Toray",
      model: "4008 S NG / Dialog+ / Surdial X / Artis",
      countryOfOrigin: "Germany / Japan / Sweden",
      hsnCode: "90189031",
      standardReference: "IEC 60601-2-16 (Haemodialysis equipment), ISO 13485, ISO 23500",
    },
    technical: {
      powerSupply: "220–240 V AC, 50 Hz, 16A single phase with internal battery backup for blood pump (≥ 20 mins)",
      powerConsumption: "≤ 2.0 kW during heating",
      dimensions: "Floor console ~ 50 × 60 × 140 cm with 4 smooth multidirectional antistatic wheels",
      weight: "~ 85 kg",
      operatingTemp: "10°C to 30°C; Water input pressure 1.5 to 6.0 bar (RO water)",
    },
    performance: {
      "Blood Pump Rate": "Flow rate 30 to 500 mL/min with precision accuracy ± 5%",
      "Heparin Delivery": "Delivery rate 0.1 to 10.0 mL/hour with bolus function (10, 20, 30 mL syringe sizes)",
      "Air Bubble Sensor": "Ultrasonic transmission sensor with venous safety clamp (response time < 5 milliseconds)",
      "Dialysate Flow Rate": "300 to 800 mL/min in 50 mL/min increments with Eco-mode",
      "Dialysate Temperature": "Adjustable 35.0°C to 39.0°C (accuracy ± 0.2°C)",
      "Conductivity Range": "12.5 to 16.0 mS/cm with dual cross-checking temperature-compensated conductivity cells",
      "Ultrafiltration (UF)": "Volumetric balancing chamber system; UF rate 0.0 to 4.0 L/hour",
      "Blood Leak Detector": "Optical infrared sensor detecting ≤ 0.5 mL blood loss per minute of dialysate",
      "Disinfection Cycles": "Fully automated chemical disinfection, heat disinfection (85°C), and automated citric acid / sodium hypochlorite rinse programs",
      "Display & Control": "≥ 10.4-inch high-visibility color TFT touchscreen displaying treatment profiles (UF and Sodium profiling)",
    },
    regulatory: {
      ceMark: true,
      bisIsiMark: "BIS compliant / ISO 13485:2016",
      iecStandard: "IEC 60601-1, IEC 60601-2-16 (Haemodialysis equipment)",
      iso: "ISO 13485:2016, ISO 23500",
    },
    accessories: [
      "Central delivery system connectors and acid/bicarbonate suction tubes",
      "External endotoxin filter (dialysate ultrafilter for ultrapure fluid)",
      "Disinfection supply connection kit",
      "Universal dialyzer holder and IV pole",
      "Heavy-duty machine dust cover",
    ],
    warranty: { years: 3, cmcStartYear: 4, cmcAnnualRate: 42000 },
    documentation: [
      "CE Certificate, Electrical safety & hydraulic test report",
      "Operator treatment manual, Water purity requirements (ISO 23500)",
    ],
  },
};

// Also index by number 1..20 for backwards-compatibility
const specsStore: Record<string | number, ProductTechSpecs> = { ...SPECS_20 };
Object.values(SPECS_20).forEach((s, idx) => {
  specsStore[idx + 1] = s;
  specsStore[s.equipmentCode] = s;
});

export function getProductSpecs(equipmentIdOrCode: string | number): ProductTechSpecs | null {
  if (!equipmentIdOrCode) return null;
  // 1. Direct lookup by key
  if (specsStore[equipmentIdOrCode]) return specsStore[equipmentIdOrCode];
  const num = Number(equipmentIdOrCode);
  if (!isNaN(num) && specsStore[num]) return specsStore[num];

  // 2. Lookup by equipmentCode or substring
  const str = String(equipmentIdOrCode).trim().toLowerCase();
  for (const s of Object.values(SPECS_20)) {
    if (
      s.equipmentCode.toLowerCase() === str ||
      s.standardName.toLowerCase().includes(str) ||
      s.commonName.toLowerCase().includes(str) ||
      str.includes(s.equipmentCode.toLowerCase())
    ) {
      return s;
    }
  }

  return specsStore[1] ?? null;
}

export function updateProductSpecs(equipmentId: number | string, specs: ProductTechSpecs): void {
  specsStore[equipmentId] = specs;
  if (specs.equipmentCode) {
    specsStore[specs.equipmentCode] = specs;
  }
}

export function getProductCategory(equipmentIdOrCode: string | number): string {
  const s = getProductSpecs(equipmentIdOrCode);
  return s?.productCategory ?? "imaging";
}

/** Quick one-line summary for inbox/table display */
export function getSpecSummary(equipmentIdOrCode: string | number): string {
  const s = getProductSpecs(equipmentIdOrCode);
  if (!s) return "";
  const perf = Object.entries(s.performance).slice(0, 2).map(([k, v]) => `${k}: ${v}`).join("; ");
  return perf;
}
