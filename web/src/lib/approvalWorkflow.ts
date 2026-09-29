import { useState, useEffect } from "react";

/** Indents at or above this threshold require ED approval. */
export const APPROVAL_DIRECTOR_THRESHOLD = 500_000; // ₹5,00,000

export type ApprovalStepStatus = "pending" | "approved" | "rejected" | "returned" | "skipped";

export type ApprovalStepRole = "deo" | "tgmsidc_user" | "gm_equipment" | "so_equipment" | "executive_director";

export interface ApprovalStep {
  stepNumber: number;
  requiredRole: ApprovalStepRole | string;
  roleLabel: string;
  assignedUserName: string;
  assignedUserId: string;
  status: ApprovalStepStatus;
  actionedAt: string | null;
  comments: string;
}

export interface ApprovalProgress {
  totalSteps: number;
  completedSteps: number;
  currentStepNumber: number;
  currentStepRole: string | null;
  isComplete: boolean;
  isRejected: boolean;
  isReturned: boolean;
}

export function getProgressFromSteps(steps: ApprovalStep[]): ApprovalProgress {
  const total = steps.length;
  const completed = steps.filter((s) => s.status === "approved" || s.status === "skipped").length;
  const rejected = steps.some((s) => s.status === "rejected");
  const returned = steps.some((s) => s.status === "returned");
  const firstPending = steps.find((s) => s.status === "pending" || s.status === "returned");

  return {
    totalSteps: total,
    completedSteps: completed,
    currentStepNumber: firstPending?.stepNumber ?? total,
    currentStepRole: firstPending?.requiredRole ?? null,
    isComplete: completed === total && total > 0,
    isRejected: rejected,
    isReturned: returned,
  };
}

export function getActiveStepForRole(steps: ApprovalStep[], role: string): ApprovalStep | null {
  const progress = getProgressFromSteps(steps);
  if (progress.isComplete || progress.isRejected) return null;
  const active = steps.find((s) => s.status === "pending" || s.status === "returned");
  if (!active) return null;
  if (active.requiredRole !== role) return null;
  return active;
}

/* ── Backward compatibility aliases ────────────────────────────────────── */

// These are kept so existing code doesn't break. They operate on an empty store
// since approval steps now come from the API.
type IndentApprovalStore = Record<string | number, ApprovalStep[]>;
const store: IndentApprovalStore = {};
type StoreListener = () => void;
const listeners = new Set<StoreListener>();

export function getSteps(indentId: string | number): ApprovalStep[] {
  return store[indentId] ?? [];
}

export function getProgress(indentId: string | number): ApprovalProgress {
  return getProgressFromSteps(getSteps(indentId));
}

export function getPendingIndentIdsForRole(role: string): number[] {
  return Object.keys(store)
    .map(Number)
    .filter((id) => getActiveStepForRole(getSteps(id), role) !== null);
}

export function subscribeToApprovalStore(listener: StoreListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notifyListeners(): void {
  listeners.forEach((fn) => fn());
}

export function updateStep(
  indentId: string | number,
  stepNumber: number,
  update: { status: ApprovalStepStatus; comments: string; actionedAt: string }
): ApprovalStep[] {
  const steps = store[indentId];
  if (!steps) return [];
  const idx = steps.findIndex((s) => s.stepNumber === stepNumber);
  if (idx === -1) return steps;
  steps[idx] = { ...steps[idx], ...update };
  store[indentId] = [...steps];
  notifyListeners();
  return store[indentId];
}

export function initStepsForNewIndent(indentId: string | number, initiatorName: string, isHighValue: boolean): ApprovalStep[] {
  const baseSteps: ApprovalStep[] = [
    { stepNumber: 1, requiredRole: "deo", roleLabel: "DEO (Initiator)", assignedUserName: initiatorName, assignedUserId: "u1", status: "approved", actionedAt: new Date().toISOString(), comments: "Indent submitted." },
    { stepNumber: 2, requiredRole: "tgmsidc_user", roleLabel: "Procurement Officer", assignedUserName: "K. Srinivas", assignedUserId: "u2", status: "pending", actionedAt: null, comments: "" },
    { stepNumber: 3, requiredRole: "gm_equipment", roleLabel: "GM Equipment", assignedUserName: "P. Narayan", assignedUserId: "u3", status: "pending", actionedAt: null, comments: "" },
    { stepNumber: 4, requiredRole: "so_equipment", roleLabel: "SO Equipment", assignedUserName: "R. Sharma", assignedUserId: "u4", status: "pending", actionedAt: null, comments: "" },
  ];
  if (isHighValue) {
    baseSteps.push({ stepNumber: 5, requiredRole: "executive_director", roleLabel: "Executive Director", assignedUserName: "D. Venkatesh", assignedUserId: "u5", status: "pending", actionedAt: null, comments: "" });
  }
  store[indentId] = baseSteps;
  notifyListeners();
  return baseSteps;
}

export function useApprovalPendingCount(role: string): number {
  const [count, setCount] = useState(() => getPendingIndentIdsForRole(role).length);

  useEffect(() => {
    setCount(getPendingIndentIdsForRole(role).length);
    const unsubscribe = subscribeToApprovalStore(() => {
      setCount(getPendingIndentIdsForRole(role).length);
    });
    return unsubscribe;
  }, [role]);

  return count;
}
