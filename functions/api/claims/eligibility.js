import {
  cleanString,
  createId,
  getDb,
  handleOptions,
  json,
  optionalJson,
  readJson,
  requiredString,
  runEndpoint
} from "../../_lib/http.js";
import { hashValue, writeAuditEvent } from "../../_lib/audit.js";
import { requireBranchAccess } from "../../_lib/access.js";
import { createMockEligibilityDecision, getPayerProvider, normalizeClaimMode } from "../../_lib/claims.js";

const METHODS = "GET, POST, OPTIONS";

export function onRequestOptions(context) {
  return handleOptions(context, METHODS);
}

export async function onRequestGet(context) {
  return runEndpoint(context, METHODS, async () => {
    const db = getDb(context);
    const url = new URL(context.request.url);
    const branchId = requiredString(url.searchParams.get("branchId"), "branchId", 128);
    await requireBranchAccess(context, db, branchId, ["owner", "admin", "front_desk", "billing", "staff"]);
    const patientId = cleanString(url.searchParams.get("patientId"), 128);
    const payerProviderId = cleanString(url.searchParams.get("payerProviderId"), 128);

    const result = await db.prepare(
      `SELECT
        e.*,
        p.name AS payer_name
      FROM payer_eligibility_checks e
      JOIN payer_providers p ON p.id = e.payer_provider_id
      WHERE e.branch_id = ?
        AND (? IS NULL OR e.patient_id = ?)
        AND (? IS NULL OR e.payer_provider_id = ?)
      ORDER BY e.checked_at DESC
      LIMIT 100`
    ).bind(branchId, patientId, patientId, payerProviderId, payerProviderId).all();

    return json(context, {
      ok: true,
      eligibilityChecks: result.results || []
    }, { methods: METHODS });
  });
}

export async function onRequestPost(context) {
  return runEndpoint(context, METHODS, async () => {
    const db = getDb(context);
    const body = await readJson(context);
    const branchId = requiredString(body.branchId, "branchId", 128);
    const actor = await requireBranchAccess(context, db, branchId, ["owner", "admin", "front_desk", "billing", "staff"]);
    const payerProviderId = requiredString(body.payerProviderId, "payerProviderId", 128);
    const payerProvider = await getPayerProvider(db, payerProviderId);
    const requestedClaimMode = normalizeClaimMode(body.requestedClaimMode);

    const membership = body.patientPayerMembershipId
      ? await db.prepare(
        `SELECT
          m.*,
          plan.outpatient_cashless_enabled,
          plan.default_copay_cents
        FROM patient_payer_memberships m
        LEFT JOIN payer_plans plan ON plan.id = m.payer_plan_id
        WHERE m.id = ? AND m.branch_id = ? AND m.status = 'active'
        LIMIT 1`
      ).bind(cleanString(body.patientPayerMembershipId, 128), branchId).first()
      : null;

    const branchContract = await db.prepare(
      `SELECT id
      FROM branch_payer_contracts
      WHERE branch_id = ?
        AND payer_provider_id = ?
        AND status = 'active'
        AND (effective_to IS NULL OR effective_to >= DATE('now'))
      LIMIT 1`
    ).bind(branchId, payerProviderId).first();

    const decision = createMockEligibilityDecision({
      requestedClaimMode,
      invoiceTotalCents: Number(body.invoiceTotalCents) || 0,
      memberCategory: cleanString(membership?.member_category || body.memberCategory, 20) || "employee",
      outpatientCashlessEnabled: membership ? Boolean(membership.outpatient_cashless_enabled) : body.outpatientCashlessEnabled !== false,
      branchPanelEnabled: Boolean(branchContract)
    });
    const eligibilityCheckId = cleanString(body.id, 128) || createId("eligibility");
    const pepper = context.env.AUDIT_HASH_PEPPER || "";

    await db.prepare(
      `INSERT INTO payer_eligibility_checks (
        id, branch_id, patient_id, patient_payer_membership_id,
        payer_provider_id, payer_plan_id, invoice_id, appointment_id,
        visit_id, requested_claim_mode, status, resolved_claim_mode,
        payer_payable_cents, patient_payable_cents, reason_code,
        response_json, checked_by_hash
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      eligibilityCheckId,
      branchId,
      cleanString(body.patientId || membership?.patient_id, 128),
      cleanString(body.patientPayerMembershipId, 128),
      payerProviderId,
      cleanString(body.payerPlanId || membership?.payer_plan_id, 128),
      cleanString(body.invoiceId, 128),
      cleanString(body.appointmentId, 128),
      cleanString(body.visitId, 128),
      requestedClaimMode,
      decision.status,
      decision.claimMode,
      decision.payerPayableCents,
      decision.patientPayableCents,
      decision.reasonCode,
      optionalJson({ ...decision.response, adapterKind: payerProvider?.adapter_kind || "mock" }),
      await hashValue(actor.id, pepper)
    ).run();

    const auditId = await writeAuditEvent(context, db, {
      branchId,
      actorType: actor.role,
      actorId: actor.id,
      action: "payer.eligibility.check",
      resourceType: "payer_eligibility_check",
      resourceId: eligibilityCheckId,
      phiScope: body.patientId || membership?.patient_id ? "referenced" : "none",
      metadata: {
        payerProviderId,
        requestedClaimMode,
        status: decision.status,
        reasonCode: decision.reasonCode
      }
    });

    return json(context, {
      ok: true,
      eligibilityCheck: {
        id: eligibilityCheckId,
        branchId,
        payerProviderId,
        status: decision.status,
        claimMode: decision.claimMode,
        payerPayableCents: decision.payerPayableCents,
        patientPayableCents: decision.patientPayableCents,
        reasonCode: decision.reasonCode
      },
      auditEventId: auditId
    }, { status: 201, methods: METHODS });
  });
}
