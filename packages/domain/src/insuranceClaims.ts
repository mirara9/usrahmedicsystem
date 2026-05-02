import type { BranchId } from "./types";

export const payerAdapters = ["mock", "portal_manual", "api"] as const;
export type PayerAdapterKind = (typeof payerAdapters)[number];

export const payerClaimModes = ["cashless_panel", "guarantee_letter", "reimbursement", "self_pay_fallback"] as const;
export type PayerClaimMode = (typeof payerClaimModes)[number];

export const claimStatuses = [
  "draft",
  "eligibility_pending",
  "eligible",
  "preauth_required",
  "gl_requested",
  "gl_approved",
  "gl_rejected",
  "submitted",
  "queried",
  "approved",
  "partially_approved",
  "rejected",
  "paid",
  "reconciled",
  "voided"
] as const;
export type ClaimStatus = (typeof claimStatuses)[number];

export type PayerProviderKind = "insurer" | "takaful" | "tpa" | "corporate" | "other";

export interface PayerProvider {
  id: string;
  name: string;
  providerKind: PayerProviderKind;
  adapterKind: PayerAdapterKind;
  supportedClaimModes: PayerClaimMode[];
  status: "active" | "inactive";
}

export interface EligibilityCheckInput {
  branchId: BranchId;
  patientMembershipId: string;
  payerProvider: PayerProvider;
  requestedClaimMode: PayerClaimMode;
  serviceCode: string;
  invoiceTotalCents: number;
  memberCategory: "employee" | "dependent" | "individual";
  outpatientCashlessEnabled: boolean;
  branchPanelEnabled: boolean;
}

export interface EligibilityDecision {
  status: "eligible" | "preauth_required" | "rejected";
  claimMode: PayerClaimMode;
  payerPayableCents: number;
  patientPayableCents: number;
  reasonCode: string;
  notes: string[];
}

export interface PreauthDecisionInput {
  eligibility: EligibilityDecision;
  requestedAmountCents: number;
  diagnosisCode?: string;
  attachmentCount: number;
}

export interface PreauthDecision {
  status: "gl_approved" | "gl_rejected";
  approvedAmountCents: number;
  externalReference: string | null;
  reasonCode: string;
}

export type MockClaimScenario = "query" | "partial" | "reject" | "approve" | "pay" | "reconcile";

export interface ClaimSubmissionInput {
  branchId: BranchId;
  payerProvider: PayerProvider;
  claimMode: PayerClaimMode;
  invoiceId: string;
  invoiceTotalCents: number;
  requestedAmountCents: number;
  lineCount: number;
  attachmentCount: number;
  scenario?: MockClaimScenario;
}

export interface ClaimSubmissionDecision {
  status: Extract<ClaimStatus, "queried" | "approved" | "partially_approved" | "rejected" | "paid" | "reconciled">;
  approvedAmountCents: number;
  patientBalanceCents: number;
  reasonCode: string;
  externalReference: string;
}

export function createMockEligibilityDecision(input: EligibilityCheckInput): EligibilityDecision {
  if (input.payerProvider.status !== "active" || !input.branchPanelEnabled) {
    return {
      status: "rejected",
      claimMode: "self_pay_fallback",
      payerPayableCents: 0,
      patientPayableCents: input.invoiceTotalCents,
      reasonCode: "PANEL_NOT_AVAILABLE",
      notes: ["Branch is not enabled for this payer or payer is inactive."]
    };
  }

  if (input.requestedClaimMode === "guarantee_letter") {
    return {
      status: "preauth_required",
      claimMode: "guarantee_letter",
      payerPayableCents: input.invoiceTotalCents,
      patientPayableCents: 0,
      reasonCode: "GL_REQUIRED",
      notes: ["Guarantee letter or pre-authorisation is required before claim submission."]
    };
  }

  if (input.requestedClaimMode === "cashless_panel" && !input.outpatientCashlessEnabled) {
    return {
      status: "eligible",
      claimMode: "reimbursement",
      payerPayableCents: 0,
      patientPayableCents: input.invoiceTotalCents,
      reasonCode: "OUTPATIENT_REIMBURSEMENT_REQUIRED",
      notes: ["Member appears eligible, but this outpatient service requires pay-and-claim reimbursement."]
    };
  }

  const coPayCents = input.memberCategory === "dependent" ? 500 : 0;
  return {
    status: "eligible",
    claimMode: input.requestedClaimMode,
    payerPayableCents: Math.max(0, input.invoiceTotalCents - coPayCents),
    patientPayableCents: coPayCents,
    reasonCode: coPayCents > 0 ? "DEPENDENT_COPAY_APPLIED" : "ELIGIBLE",
    notes: ["Mock eligibility uses the same contract as production adapters."]
  };
}

export function createMockPreauthDecision(input: PreauthDecisionInput): PreauthDecision {
  if (input.eligibility.status !== "preauth_required" || input.attachmentCount < 1) {
    return {
      status: "gl_rejected",
      approvedAmountCents: 0,
      externalReference: null,
      reasonCode: input.attachmentCount < 1 ? "MISSING_SUPPORTING_DOCUMENTS" : "PREAUTH_NOT_REQUIRED"
    };
  }

  return {
    status: "gl_approved",
    approvedAmountCents: input.requestedAmountCents,
    externalReference: `MOCK-GL-${input.requestedAmountCents}`,
    reasonCode: input.diagnosisCode ? "GL_APPROVED" : "GL_APPROVED_PENDING_DIAGNOSIS_REVIEW"
  };
}

export function createMockSubmissionDecision(input: ClaimSubmissionInput): ClaimSubmissionDecision {
  const scenario = input.scenario || "approve";
  const reference = `MOCK-CLAIM-${input.invoiceId}-${scenario}`.toUpperCase();

  if (scenario === "query") {
    return {
      status: "queried",
      approvedAmountCents: 0,
      patientBalanceCents: 0,
      reasonCode: "PAYER_REQUESTED_DOCUMENTS",
      externalReference: reference
    };
  }

  if (scenario === "reject") {
    return {
      status: "rejected",
      approvedAmountCents: 0,
      patientBalanceCents: input.invoiceTotalCents,
      reasonCode: "BENEFIT_NOT_COVERED",
      externalReference: reference
    };
  }

  const approvedAmountCents = scenario === "partial"
    ? Math.floor(input.requestedAmountCents / 2)
    : input.requestedAmountCents;

  return {
    status: scenario === "partial" ? "partially_approved" : scenario === "pay" ? "paid" : scenario === "reconcile" ? "reconciled" : "approved",
    approvedAmountCents,
    patientBalanceCents: Math.max(0, input.invoiceTotalCents - approvedAmountCents),
    reasonCode: scenario === "partial" ? "PARTIAL_LIMIT_APPROVED" : "CLAIM_ACCEPTED",
    externalReference: reference
  };
}
