import { describe, expect, it } from "vitest";
import {
  getCapabilitiesByStatus,
  getCapabilityById,
  productCapabilities,
  requiredProductionCapabilityIds,
  type ProductCapabilityId
} from "./productCapabilities";

describe("product capability map", () => {
  it("covers every requested production capability exactly once", () => {
    const actualIds = productCapabilities.map((capability) => capability.id);

    expect(new Set(actualIds).size).toBe(actualIds.length);
    expect(actualIds.sort()).toEqual([...requiredProductionCapabilityIds].sort());
  });

  it("keeps provider-dependent capabilities explicit after provider selection", () => {
    const providerDependent = getCapabilitiesByStatus("providerDependent");
    const decisionRequired = getCapabilitiesByStatus("decisionRequired");

    expect(providerDependent.length).toBeGreaterThan(0);
    expect(decisionRequired).toHaveLength(0);

    for (const capability of providerDependent) {
      expect(capability.providerDependencies.length).toBeGreaterThan(0);
    }
  });

  it("keeps all non-complete capabilities tied to concrete production work", () => {
    for (const capability of productCapabilities) {
      expect(capability.productionNeeded.length).toBeGreaterThan(0);
      expect(capability.foundationEvidence.length).toBeGreaterThan(0);
      expect(capability.phase).toMatch(/^phase-[1-5]$/);
    }
  });

  it("identifies external decisions that code alone cannot complete", () => {
    expect(getCapabilityById("auth-mfa-staff-accounts" as ProductCapabilityId).providerDependencies.join(" ")).toMatch(/Microsoft Authenticator/);
    expect(getCapabilityById("malaysian-hosted-database" as ProductCapabilityId).currentStatus).toBe("providerDependent");
    expect(getCapabilityById("billing-invoices-panels-myinvois-payments" as ProductCapabilityId).currentStatus).toBe("providerDependent");
    expect(getCapabilityById("billing-invoices-panels-myinvois-payments" as ProductCapabilityId).providerDependencies.join(" ")).toMatch(/Billplz|MyInvois|MiCare/);
  });
});
