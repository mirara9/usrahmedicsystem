import { describe, expect, it } from "vitest";
import {
  getProviderDecisionById,
  providerDecisions,
  requiredProviderDecisionIds
} from "./providerDecisions";

describe("provider decisions", () => {
  it("covers every selected production provider decision exactly once", () => {
    const actualIds = providerDecisions.map((decision) => decision.id);

    expect(new Set(actualIds).size).toBe(actualIds.length);
    expect(actualIds.sort()).toEqual([...requiredProviderDecisionIds].sort());
  });

  it("locks Microsoft Authenticator for staff MFA", () => {
    const decision = getProviderDecisionById("staff-auth-microsoft-entra");

    expect(decision.provider).toContain("Microsoft Authenticator");
    expect(decision.decision).toMatch(/Microsoft Entra ID OIDC/i);
    expect(decision.implementationNotes.join(" ")).toMatch(/temporary role headers/i);
  });

  it("keeps all selected providers actionable for implementation", () => {
    for (const decision of providerDecisions) {
      expect(decision.rationale.length).toBeGreaterThan(0);
      expect(decision.implementationNotes.length).toBeGreaterThan(0);
      expect(decision.requiredConfiguration.length).toBeGreaterThan(0);
      expect(decision.complianceNotes.length).toBeGreaterThan(0);
      expect(decision.status).toMatch(/^selected/);
    }
  });

  it("uses Malaysia-first production providers for payments, tax, TPA, and data", () => {
    expect(getProviderDecisionById("payments-billplz").provider).toBe("Billplz");
    expect(getProviderDecisionById("tax-lhdn-myinvois-direct").provider).toBe("LHDN MyInvois API");
    expect(getProviderDecisionById("panel-tpa-micare-first").provider).toMatch(/MiCare/);
    expect(getProviderDecisionById("data-aws-malaysia-postgres-s3").decision).toMatch(/ap-southeast-5/);
  });
});
