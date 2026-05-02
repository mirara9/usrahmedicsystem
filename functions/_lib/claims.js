import { cleanString } from "./http.js";

const CLAIM_MODES = new Set(["cashless_panel", "guarantee_letter", "reimbursement", "self_pay_fallback"]);
const CLAIM_STATUSES = new Set([
  "draft",
  "submitted",
  "queried",
  "approved",
  "partially_approved",
  "rejected",
  "paid",
  "reconciled",
  "voided"
]);

export function normalizeClaimMode(value, fallback = "cashless_panel") {
  const mode = cleanString(value, 40) || fallback;
  return CLAIM_MODES.has(mode) ? mode : fallback;
}

export function normalizeClaimStatus(value, fallback = "submitted") {
  const status = cleanString(value, 40) || fallback;
  return CLAIM_STATUSES.has(status) ? status : fallback;
}

export function parseJsonArray(value) {
  if (Array.isArray(value)) {
    return value;
  }

  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function getPayerProvider(db, payerProviderId) {
  return db.prepare(
    `SELECT *
    FROM payer_providers
    WHERE id = ? AND status = 'active'
    LIMIT 1`
  ).bind(payerProviderId).first();
}

export async function getBranchPayerContract(db, branchId, payerProviderId, claimMode) {
  return db.prepare(
    `SELECT *
    FROM branch_payer_contracts
    WHERE branch_id = ?
      AND payer_provider_id = ?
      AND claim_mode = ?
      AND status = 'active'
      AND (effective_to IS NULL OR effective_to >= DATE('now'))
    LIMIT 1`
  ).bind(branchId, payerProviderId, claimMode).first();
}

export function createMockEligibilityDecision(input) {
  const requestedMode = normalizeClaimMode(input.requestedClaimMode);
  const invoiceTotalCents = Math.max(0, Number(input.invoiceTotalCents) || 0);

  if (!input.branchPanelEnabled) {
    return {
      status: "rejected",
      claimMode: "self_pay_fallback",
      payerPayableCents: 0,
      patientPayableCents: invoiceTotalCents,
      reasonCode: "PANEL_NOT_AVAILABLE",
      response: {
        notes: ["Branch is not enabled for this payer."]
      }
    };
  }

  if (requestedMode === "guarantee_letter") {
    return {
      status: "preauth_required",
      claimMode: "guarantee_letter",
      payerPayableCents: invoiceTotalCents,
      patientPayableCents: 0,
      reasonCode: "GL_REQUIRED",
      response: {
        notes: ["Guarantee letter or pre-authorisation is required before claim submission."]
      }
    };
  }

  if (requestedMode === "cashless_panel" && !input.outpatientCashlessEnabled) {
    return {
      status: "eligible",
      claimMode: "reimbursement",
      payerPayableCents: 0,
      patientPayableCents: invoiceTotalCents,
      reasonCode: "OUTPATIENT_REIMBURSEMENT_REQUIRED",
      response: {
        notes: ["Outpatient service is eligible only through reimbursement."]
      }
    };
  }

  const coPayCents = input.memberCategory === "dependent" ? 500 : Number(input.defaultCopayCents) || 0;
  return {
    status: "eligible",
    claimMode: requestedMode,
    payerPayableCents: Math.max(0, invoiceTotalCents - coPayCents),
    patientPayableCents: coPayCents,
    reasonCode: coPayCents > 0 ? "COPAY_APPLIED" : "ELIGIBLE",
    response: {
      notes: ["Mock adapter response uses the same contract as production adapters."]
    }
  };
}

export function createMockPreauthDecision(input) {
  const requestedAmountCents = Math.max(0, Number(input.requestedAmountCents) || 0);
  const attachmentCount = Number(input.attachmentCount) || 0;

  if (attachmentCount < 1) {
    return {
      status: "gl_rejected",
      approvedAmountCents: 0,
      externalReference: null,
      reasonCode: "MISSING_SUPPORTING_DOCUMENTS",
      response: {
        notes: ["At least one supporting document is required for demo GL approval."]
      }
    };
  }

  return {
    status: "gl_approved",
    approvedAmountCents: requestedAmountCents,
    externalReference: `MOCK-GL-${Date.now()}`,
    reasonCode: input.diagnosisCode ? "GL_APPROVED" : "GL_APPROVED_PENDING_DIAGNOSIS_REVIEW",
    response: {
      notes: ["Mock GL approved."]
    }
  };
}

export function createMockSubmissionDecision(input) {
  const scenario = cleanString(input.scenario, 40) || "approve";
  const requestedAmountCents = Math.max(0, Number(input.requestedAmountCents) || 0);
  const invoiceTotalCents = Math.max(0, Number(input.invoiceTotalCents) || requestedAmountCents);
  const externalReference = `MOCK-CLAIM-${Date.now()}`;

  if (scenario === "query") {
    return {
      status: "queried",
      approvedAmountCents: 0,
      patientBalanceCents: 0,
      reasonCode: "PAYER_REQUESTED_DOCUMENTS",
      externalReference
    };
  }

  if (scenario === "reject") {
    return {
      status: "rejected",
      approvedAmountCents: 0,
      patientBalanceCents: invoiceTotalCents,
      reasonCode: "BENEFIT_NOT_COVERED",
      externalReference
    };
  }

  const approvedAmountCents = scenario === "partial" ? Math.floor(requestedAmountCents / 2) : requestedAmountCents;
  return {
    status: scenario === "partial" ? "partially_approved" : scenario === "pay" ? "paid" : scenario === "reconcile" ? "reconciled" : "approved",
    approvedAmountCents,
    patientBalanceCents: Math.max(0, invoiceTotalCents - approvedAmountCents),
    reasonCode: scenario === "partial" ? "PARTIAL_LIMIT_APPROVED" : "CLAIM_ACCEPTED",
    externalReference
  };
}
