import { cn } from "@/lib/utils";

type ChipTone = "grn" | "amb" | "red" | "blu" | "gry";

const statusConfig: Record<string, { label: string; tone: ChipTone }> = {
  // Step 1 - 10: Indent & Budget Validation
  draft: { label: "Draft", tone: "gry" },
  pending_review: { label: "Pending TGMSIDC Review", tone: "gry" },
  under_scrutiny: { label: "Under TGMSIDC Scrutiny", tone: "gry" },
  rc_assessment_in_progress: { label: "RC Assessment in Progress", tone: "gry" },
  cost_assessment_completed: { label: "Cost Assessment Completed", tone: "gry" },
  as_validation_in_progress: { label: "AS Validation in Progress", tone: "gry" },
  ready_for_procurement: { label: "Ready for Procurement", tone: "grn" },
  in_procurement: { label: "Ready for Procurement", tone: "grn" },
  tgmsidc_verification_completed: { label: "Ready for Procurement", tone: "grn" },
  reprioritization_required: { label: "Reprioritization / Revised AS Required", tone: "amb" },
  pending_deo_reprioritization: { label: "Pending DEO Reprioritization", tone: "amb" },
  resubmitted_for_review: { label: "Resubmitted for TGMSIDC Review", tone: "gry" },
  under_revalidation: { label: "Under TGMSIDC Revalidation", tone: "gry" },
  returned_to_deo_for_correction: { label: "Returned to DEO – Reprioritization Required", tone: "amb" },
  returned: { label: "Returned to DEO", tone: "amb" },
  pending_approval: { label: "Pending Approval", tone: "gry" },
  under_tgmsidc_revalidation: { label: "Under TGMSIDC Revalidation", tone: "gry" },
  approved: { label: "Approved", tone: "grn" },
  rejected: { label: "Rejected", tone: "red" },

  // Step 11 - 15: RC & Tender
  active_rc_matched_po_eligible: { label: "RC Tagged – Ready for PO", tone: "grn" },
  linked_to_rc: { label: "RC Tagged – Ready for PO", tone: "grn" },
  multiple_rcs_found_selection_required: { label: "Multiple RCs Available", tone: "gry" },
  no_active_rc_tender_required: { label: "Tender Required", tone: "gry" },
  tender_required: { label: "Tender Required", tone: "gry" },
  rc_unavailable_tender_required: { label: "Tender Required", tone: "gry" },
  tender_initiated: { label: "Tender Initiated", tone: "gry" },
  tender_in_progress: { label: "Tender in Progress", tone: "gry" },
  active: { label: "RC Active", tone: "grn" },
  expired: { label: "Expired", tone: "red" },
  closed: { label: "Closed", tone: "gry" },
  renewed: { label: "Renewed", tone: "gry" },

  // Step 16 - 23: Purchase Order
  po_draft: { label: "PO Draft", tone: "gry" },
  po_drafted: { label: "PO Drafted", tone: "gry" },
  po_ready_for_approval: { label: "PO Ready for Approval", tone: "gry" },
  pending_gm_approval: { label: "Pending GM Approval", tone: "gry" },
  pending_so_approval: { label: "Pending SO Approval", tone: "gry" },
  pending_md_approval: { label: "Pending ED Approval", tone: "gry" },
  pending_ed_approval: { label: "Pending ED Approval", tone: "gry" },
  po_approved: { label: "PO Approved", tone: "grn" },
  po_issued: { label: "PO Issued", tone: "grn" },
  po_issued_awaiting_vendor_ack: { label: "PO Issued – Awaiting Vendor Acknowledgement", tone: "gry" },

  // Step 24 - 31: Vendor & Delivery
  vendor_acknowledged: { label: "PO Acknowledged", tone: "gry" },
  delivery_scheduled: { label: "Delivery Scheduled", tone: "gry" },
  dispatched: { label: "Dispatched / In Transit", tone: "gry" },
  delivered: { label: "Delivered – Awaiting Receipt / QA", tone: "gry" },
  receipt_recorded: { label: "Receipt Recorded", tone: "gry" },
  delivery_discrepancy_open: { label: "Delivery Discrepancy Open", tone: "amb" },
  delivery_discrepancy_resolved: { label: "Delivery Discrepancy Resolved", tone: "grn" },
  not_fulfilled: { label: "Not Fulfilled", tone: "gry" },
  partially_fulfilled: { label: "Partially Fulfilled", tone: "amb" },
  completely_fulfilled: { label: "Completely Fulfilled", tone: "grn" },

  // Step 32 - 34: QA Inspection
  qa_inspection_in_progress: { label: "QA Inspection in Progress", tone: "gry" },
  qa_accepted: { label: "QA Accepted", tone: "grn" },
  conditionally_accepted: { label: "Conditionally Accepted – Rectification Due", tone: "amb" },
  qa_rejected: { label: "QA Rejected – Replacement Due", tone: "red" },
  pending_qa_reinspection: { label: "Pending QA Reinspection", tone: "amb" },

  // Step 35 - 39: Installation & Training
  installation_pending: { label: "Installation Pending", tone: "gry" },
  installation_completed: { label: "Installation Completed", tone: "grn" },
  training_completed: { label: "Training Completed", tone: "grn" },
  installation_documents_submitted: { label: "Installation Documents Submitted", tone: "gry" },
  installation_training_verified: { label: "Installation & Training Verified", tone: "grn" },

  // Step 40 - 44: GRN, Invoicing, Payment & PO Closure
  grn_confirmed: { label: "GRN Confirmed", tone: "grn" },
  invoice_submitted: { label: "Invoice Submitted", tone: "gry" },
  invoice_under_review: { label: "Invoice Under Review / Payment Pending", tone: "gry" },
  not_paid: { label: "Not Paid", tone: "gry" },
  partial: { label: "Partially Paid", tone: "amb" },
  partially_paid: { label: "Partially Paid", tone: "amb" },
  paid: { label: "Paid", tone: "grn" },
  completed: { label: "Completed", tone: "grn" },
  po_closed: { label: "PO Closed / Item Closed", tone: "gry" },
  cancelled: { label: "Cancelled", tone: "red" },
};

const DOT_COLOR: Record<ChipTone, string> = {
  grn: "bg-emerald-600",
  amb: "bg-amber-600",
  red: "bg-rose-600",
  blu: "bg-slate-600",
  gry: "bg-slate-400",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  if (!status) return null;
  const norm = status?.toLowerCase?.()?.replace(/[\s-]/g, "_") || status;
  const config = statusConfig[norm] ?? { label: status.replace(/_/g, " "), tone: "gry" };
  const dot = DOT_COLOR[config.tone] || DOT_COLOR.gry;

  return (
    <span
      className={cn("neo-chip text-slate-700 bg-slate-50 border border-slate-200 truncate inline-flex items-center gap-1.5 max-w-full", config.tone, className)}
      title={config.label}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", dot)} />
      <span className="truncate">{config.label}</span>
    </span>
  );
}
