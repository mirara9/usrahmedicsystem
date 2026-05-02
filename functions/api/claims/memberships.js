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

    const result = await db.prepare(
      `SELECT
        m.*,
        p.name AS payer_name,
        plan.name AS plan_name
      FROM patient_payer_memberships m
      JOIN payer_providers p ON p.id = m.payer_provider_id
      LEFT JOIN payer_plans plan ON plan.id = m.payer_plan_id
      WHERE m.branch_id = ?
        AND (? IS NULL OR m.patient_id = ?)
      ORDER BY m.created_at DESC
      LIMIT 100`
    ).bind(branchId, patientId, patientId).all();

    return json(context, {
      ok: true,
      memberships: result.results || []
    }, { methods: METHODS });
  });
}

export async function onRequestPost(context) {
  return runEndpoint(context, METHODS, async () => {
    const db = getDb(context);
    const body = await readJson(context);
    const branchId = requiredString(body.branchId, "branchId", 128);
    const actor = await requireBranchAccess(context, db, branchId, ["owner", "admin", "front_desk", "billing", "staff"]);
    const membershipId = cleanString(body.id, 128) || createId("membership");
    const payerProviderId = requiredString(body.payerProviderId, "payerProviderId", 128);
    const rawMemberId = requiredString(body.memberId, "memberId", 160);
    const pepper = context.env.AUDIT_HASH_PEPPER || "";

    await db.prepare(
      `INSERT INTO patient_payer_memberships (
        id, branch_id, patient_id, payer_provider_id, payer_plan_id,
        member_id_hash, member_display, member_category, employer_name,
        policy_or_certificate_ref, dependent_ref, starts_on, ends_on,
        status, metadata_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        payer_plan_id = excluded.payer_plan_id,
        member_id_hash = excluded.member_id_hash,
        member_display = excluded.member_display,
        member_category = excluded.member_category,
        employer_name = excluded.employer_name,
        policy_or_certificate_ref = excluded.policy_or_certificate_ref,
        dependent_ref = excluded.dependent_ref,
        starts_on = excluded.starts_on,
        ends_on = excluded.ends_on,
        status = excluded.status,
        metadata_json = excluded.metadata_json`
    ).bind(
      membershipId,
      branchId,
      requiredString(body.patientId, "patientId", 128),
      payerProviderId,
      cleanString(body.payerPlanId, 128),
      await hashValue(rawMemberId, pepper),
      cleanString(body.memberDisplay, 80) || rawMemberId.slice(-4).padStart(rawMemberId.length, "*"),
      cleanString(body.memberCategory, 20) || "employee",
      cleanString(body.employerName, 180),
      cleanString(body.policyOrCertificateRef, 160),
      cleanString(body.dependentRef, 160),
      cleanString(body.startsOn, 20),
      cleanString(body.endsOn, 20),
      cleanString(body.status, 20) || "active",
      optionalJson(body.metadata)
    ).run();

    const auditId = await writeAuditEvent(context, db, {
      branchId,
      actorType: actor.role,
      actorId: actor.id,
      action: "payer.membership.upsert",
      resourceType: "patient_payer_membership",
      resourceId: membershipId,
      phiScope: "referenced",
      metadata: {
        payerProviderId,
        memberCategory: cleanString(body.memberCategory, 20) || "employee"
      }
    });

    return json(context, {
      ok: true,
      membership: {
        id: membershipId,
        branchId,
        payerProviderId,
        status: cleanString(body.status, 20) || "active"
      },
      auditEventId: auditId
    }, { status: 201, methods: METHODS });
  });
}
