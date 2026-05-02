import { describe, expect, it } from "vitest";
import {
  claimStatuses,
  createMockEligibilityDecision,
  createMockPreauthDecision,
  createMockSubmissionDecision,
  payerAdapters,
  payerClaimModes,
  type ClaimSubmissionInput,
  type EligibilityCheckInput,
  type PayerProvider
} from "./insuranceClaims";

describe("insurance claims domain", () => {
  const aiaProvider: PayerProvider = {
    id: "payer-aia",
    name: "AIA Malaysia",
    providerKind: "insurer",
    adapterKind: "mock",
    supportedClaimModes: ["cashless_panel", "guarantee_letter", "reimbursement"],
    status: "active"
  };

  const pmCareProvider: PayerProvider = {
    id: "payer-pmcare",
    name: "PMCare",
    providerKind: "tpa",
    adapterKind: "portal_manual",
    supportedClaimModes: ["cashless_panel", "guarantee_letter"],
    status: "active"
  };

  it("defines production-equivalent payer adapters, claim modes, and statuses", () => {
    expect(payerAdapters).toEqual(["mock", "portal_manual", "api"]);
    expect(payerClaimModes).toEqual(["cashless_panel", "guarantee_letter", "reimbursement", "self_pay_fallback"]);
    expect(claimStatuses).toEqual([
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
    ]);
  });

  it("marks AIA-style outpatient claims as reimbursement when panel cashless coverage is absent", () => {
    const input: EligibilityCheckInput = {
      branchId: "puncak-alam",
      patientMembershipId: "membership-aia-outpatient",
      payerProvider: aiaProvider,
      requestedClaimMode: "cashless_panel",
      serviceCode: "general-consultation",
      invoiceTotalCents: 9500,
      memberCategory: "employee",
      outpatientCashlessEnabled: false,
      branchPanelEnabled: true
    };

    const decision = createMockEligibilityDecision(input);

    expect(decision.status).toBe("eligible");
    expect(decision.claimMode).toBe("reimbursement");
    expect(decision.patientPayableCents).toBe(9500);
    expect(decision.payerPayableCents).toBe(0);
    expect(decision.reasonCode).toBe("OUTPATIENT_REIMBURSEMENT_REQUIRED");
  });

  it("requires a guarantee letter before PMCare-style GL workflows can be submitted", () => {
    const input: EligibilityCheckInput = {
      branchId: "puncak-alam",
      patientMembershipId: "membership-pmcare",
      payerProvider: pmCareProvider,
      requestedClaimMode: "guarantee_letter",
      serviceCode: "specialist-referral",
      invoiceTotalCents: 25000,
      memberCategory: "dependent",
      outpatientCashlessEnabled: true,
      branchPanelEnabled: true
    };

    const eligibility = createMockEligibilityDecision(input);
    const preauth = createMockPreauthDecision({
      eligibility,
      requestedAmountCents: 25000,
      diagnosisCode: "Z00.0",
      attachmentCount: 2
    });

    expect(eligibility.status).toBe("preauth_required");
    expect(preauth.status).toBe("gl_approved");
    expect(preauth.approvedAmountCents).toBe(25000);
    expect(preauth.externalReference).toMatch(/^MOCK-GL-/);
  });

  it("supports query, partial approval, rejection, payment, and reconciliation paths", () => {
    const input: ClaimSubmissionInput = {
      branchId: "puncak-alam",
      payerProvider: pmCareProvider,
      claimMode: "cashless_panel",
      invoiceId: "invoice-1",
      invoiceTotalCents: 30000,
      requestedAmountCents: 30000,
      lineCount: 3,
      attachmentCount: 1
    };

    expect(createMockSubmissionDecision({ ...input, scenario: "query" }).status).toBe("queried");
    expect(createMockSubmissionDecision({ ...input, scenario: "partial" }).status).toBe("partially_approved");
    expect(createMockSubmissionDecision({ ...input, scenario: "reject" }).status).toBe("rejected");
    expect(createMockSubmissionDecision({ ...input, scenario: "approve" }).status).toBe("approved");
    expect(createMockSubmissionDecision({ ...input, scenario: "pay" }).status).toBe("paid");
    expect(createMockSubmissionDecision({ ...input, scenario: "reconcile" }).status).toBe("reconciled");
  });
});
