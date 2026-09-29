import { cn } from "@/lib/utils";

type ChipTone = "grn" | "amb" | "red" | "blu" | "vio" | "gry";

const statusConfig: Record<string, { label: string; tone: ChipTone }> = {
  // Indent statuses
  draft: { label: "Draft", tone: "gry" },
  pending_review: { label: "Pending Review", tone: "amb" },
  pending_approval: { label: "Pending Approval", tone: "amb" },
  approved: { label: "Approved", tone: "grn" },
  rejected: { label: "Rejected", tone: "red" },
  linked_to_rc: { label: "Linked to RC", tone: "blu" },
  tender_initiated: { label: "Tender Initiated", tone: "vio" },
  po_issued: { label: "PO Issued", tone: "grn" },

  // RC statuses
  active: { label: "Active", tone: "grn" },
  expired: { label: "Expired", tone: "red" },
  closed: { label: "Closed", tone: "gry" },
  renewed: { label: "Renewed", tone: "blu" },

  // PO statuses
  pending: { label: "Pending", tone: "amb" },
  dispatched: { label: "Dispatched", tone: "blu" },
  delivered: { label: "Delivered", tone: "grn" },
  cancelled: { label: "Cancelled", tone: "red" },

  // Tender statuses
  invited: { label: "Invited", tone: "blu" },
  bids_received: { label: "Bids Received", tone: "vio" },
  l1_identified: { label: "L1 Identified", tone: "vio" },
  rc_created: { label: "RC Created", tone: "grn" },

  // Delivery statuses
  in_transit: { label: "In Transit", tone: "amb" },
  qa_pending: { label: "QA Pending", tone: "amb" },
  qa_passed: { label: "QA Passed", tone: "grn" },
  qa_failed: { label: "QA Failed", tone: "red" },
  accepted: { label: "Accepted", tone: "grn" },

  // Vendor statuses
  suspended: { label: "Suspended", tone: "amb" },
  blacklisted: { label: "Blacklisted", tone: "red" },
};

const DOT_COLOR: Record<ChipTone, string> = {
  grn: "bg-[#159557]",
  amb: "bg-[#e08a0b]",
  red: "bg-[#dc2f3c]",
  blu: "bg-[#2563eb]",
  vio: "bg-[#6d42d9]",
  gry: "bg-[#6b7a93]",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const norm = status?.toLowerCase?.()?.replace(/[\s-]/g, "_") || status;
  const config = statusConfig[norm] ?? { label: status, tone: "gry" };
  const dot = DOT_COLOR[config.tone];

  return (
    <span className={cn("neo-chip", config.tone, className)}>
      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", dot)} />
      {config.label}
    </span>
  );
}
