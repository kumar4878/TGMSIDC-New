import { getProductSpecs, getSpecSummary } from "./productSpecs";

export interface IndentLineItem {
  id: number;
  category: string;
  equipmentId: number;
  equipmentName: string;
  specSummary: string;
  qty: number;
  unit: string;
  estimatedUnitRate: number;
  estimatedTotal: number;
  justification: string;
}

type LineItemsStore = Record<number, IndentLineItem[]>;

const store: LineItemsStore = {
  // Indent 1 — GGH Sangareddy: Surgical Diathermy × 3
  1: [
    {
      id: 1, category: "medical_equipment", equipmentId: 6,
      equipmentName: "Surgical Diathermy / Cautery Machine",
      specSummary: "Model: Sigma+, Monopolar/Bipolar, 350 W, IEC 60601-2-2, India make",
      qty: 3, unit: "No.",
      estimatedUnitRate: 185000, estimatedTotal: 555000,
      justification: "3 OT tables at GGH Sangareddy require dedicated electrosurgical units. Current machines are beyond economical repair.",
    },
  ],
  // Indent 2 — Area Hospital Vemulawada: Mammogram CR × 1
  2: [
    {
      id: 1, category: "medical_equipment", equipmentId: 7,
      equipmentName: "Mammogram Compatible CR System",
      specSummary: "Fuji Film PCR Prima TM, DRY PIX Edge, DICOM 3.0, ≥75 plates/hr",
      qty: 1, unit: "No.",
      estimatedUnitRate: 650000, estimatedTotal: 650000,
      justification: "Digitise existing mammogram film X-Ray to CR system for Radiology dept. DICOM archiving required.",
    },
  ],
  // Indent 3 — Warangal District Hospital: Biochemistry Analyser × 1 + Patient Monitor × 2 (multi-line demo)
  3: [
    {
      id: 1, category: "medical_equipment", equipmentId: 3,
      equipmentName: "Fully Automated Biochemistry Analyser",
      specSummary: "≥400 tests/hr, ISE module, 4°C on-board cooling, LIS interface (HL7/ASTM)",
      qty: 1, unit: "No.",
      estimatedUnitRate: 1200000, estimatedTotal: 1200000,
      justification: "New pathology lab at WDH requires high-throughput analyser for routine biochemistry panels (LFT, KFT, lipids, glucose).",
    },
    {
      id: 2, category: "medical_equipment", equipmentId: 8,
      equipmentName: "Patient Monitor (Multi-Parameter)",
      specSummary: "ECG, SpO₂, NIBP, Temp, EtCO₂; 12.1\" TFT; battery ≥ 4 hrs",
      qty: 2, unit: "No.",
      estimatedUnitRate: 120000, estimatedTotal: 240000,
      justification: "2 monitors required for new post-operative ward adjacent to pathology wing. Existing units non-functional.",
    },
  ],
  // Indent 4 — Osmania General Hospital: DEXA Scanner × 2
  4: [
    {
      id: 1, category: "medical_equipment", equipmentId: 5,
      equipmentName: "DEXA Scanner",
      specSummary: "DXA — BMD T-score/Z-score, scan time ≤6 min, DICOM 3.0, AERB clearance",
      qty: 2, unit: "No.",
      estimatedUnitRate: 950000, estimatedTotal: 1900000,
      justification: "Endocrinology dept at OGH handles 40+ BMD assessments/day. Two units required for patient throughput. Tender route — no RC available.",
    },
  ],
  // Indent 5 — Gandhi Hospital: ICU Ventilator × 5 + Patient Monitor × 10 (multi-line demo)
  5: [
    {
      id: 1, category: "medical_equipment", equipmentId: 2,
      equipmentName: "ICU Ventilator",
      specSummary: "Adult/Paediatric/Neonatal, VCV/PCV/SIMV/PSV, FiO₂ 21-100%, PEEP 0-35 cmH₂O",
      qty: 5, unit: "No.",
      estimatedUnitRate: 320000, estimatedTotal: 1600000,
      justification: "New 10-bed ICU block at Gandhi Hospital requires 5 primary ventilators for critically ill patients. PEEP and NIV modes mandatory.",
    },
    {
      id: 2, category: "medical_equipment", equipmentId: 8,
      equipmentName: "Patient Monitor (Multi-Parameter)",
      specSummary: "ECG, SpO₂, NIBP, Temp, EtCO₂; 12.1\" TFT; HL7/DICOM; battery ≥ 4 hrs",
      qty: 10, unit: "No.",
      estimatedUnitRate: 120000, estimatedTotal: 1200000,
      justification: "One bedside multi-parameter monitor per ICU bed (10 beds). Central station networking required.",
    },
  ],
  // Indent 6 — NIMS: Digital X-Ray × 2 + Ultrasound × 1 (multi-line demo)
  6: [
    {
      id: 1, category: "medical_equipment", equipmentId: 1,
      equipmentName: "Digital X-Ray Machine (DR System)",
      specSummary: "DR System, 400 mA, Pixel ≤150 μm, AEC, DICOM 3.0, AERB clearance",
      qty: 2, unit: "No.",
      estimatedUnitRate: 850000, estimatedTotal: 1700000,
      justification: "New Radiology wing at NIMS requires portable DR systems for bedside and OPD use. AEC and DICOM mandatory.",
    },
    {
      id: 2, category: "medical_equipment", equipmentId: 4,
      equipmentName: "Ultrasound Machine (Colour Doppler)",
      specSummary: "B-Mode + Colour Doppler, 3.5 & 7.5 MHz probes, DICOM 3.0, battery ≥ 1 hr",
      qty: 1, unit: "No.",
      estimatedUnitRate: 650000, estimatedTotal: 650000,
      justification: "OPD diagnostics unit at NIMS needs colour Doppler for vascular and abdominal assessments.",
    },
  ],
  // Indent 7 — CHC Pitlam: Patient Monitor × 4
  7: [
    {
      id: 1, category: "medical_equipment", equipmentId: 8,
      equipmentName: "Patient Monitor (Multi-Parameter)",
      specSummary: "ECG, SpO₂, NIBP, Temp, EtCO₂; 12.1\" colour TFT; battery ≥ 4 hrs",
      qty: 4, unit: "No.",
      estimatedUnitRate: 120000, estimatedTotal: 480000,
      justification: "4 monitors for newly constructed ward at CHC Pitlam, Kamareddy. For post-surgical monitoring.",
    },
  ],
};

export function getLineItems(indentId: number): IndentLineItem[] {
  return store[indentId] ?? [];
}

export function setLineItems(indentId: number, items: IndentLineItem[]): void {
  store[indentId] = items;
}

export function initLineItemsForNewIndent(
  indentId: number,
  rawItems: Array<{
    category: string;
    equipmentId: number;
    equipmentName: string;
    qty: number;
    unit: string;
    estimatedUnitRate: number;
    justification: string;
  }>
): IndentLineItem[] {
  const items: IndentLineItem[] = rawItems.map((item, idx) => ({
    id: idx + 1,
    category: item.category,
    equipmentId: item.equipmentId,
    equipmentName: item.equipmentName,
    specSummary: getSpecSummary(item.equipmentId),
    qty: item.qty,
    unit: item.unit,
    estimatedUnitRate: item.estimatedUnitRate,
    estimatedTotal: item.estimatedUnitRate * item.qty,
    justification: item.justification,
  }));
  store[indentId] = items;
  return items;
}

export function getTotalEstimatedValue(indentId: number): number {
  return getLineItems(indentId).reduce((sum, item) => sum + item.estimatedTotal, 0);
}
