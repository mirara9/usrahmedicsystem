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
import { createMockPreauthDecision } from "../../_lib/claims.js";

const METHODS = "GET, POST, OPTIONS";

export function onRequestOptions(context) {
  return handleOptions(context, METHODS);
}

export async function onRequestGet(context) {
  return runEndpoint(context, METHODS, async () => {
    const db = getDb(context);
    const url = new URL(context.request.url);
    const branchId = requiredString(url.searchParams.get("branchId"), "branchId", 128);
    await requireBranchAccess(context, db, branchId, ["owner", "admin", "doctor", "front_desk", "billing", "staff"]);
    const payerProviderId = cleanString(url.searchParams.get("payerProviderId"), 128);
    const status = cleanString(url.searchParams.get("status"), 40);

    const result = await db.prepare(
      `SELECT
        r.*,
        p.name AS payer_name
      FROM payer_preauth_requests r
      JOIN payer_providers p ON p.id = r.payer_provider_id
      WHERE r.branch_id = ?
        AND (? IS NULL OR r.payer_provider_id = ?)
        AND (? IS NULL OR r.status = ?)
      ORDER BY r.requested_at DESC
      LIMIT 100`
    ).bind(branchId, payerProviderId, payerProviderId, status, status).all();

    return json(context, {
      ok: true,
      preauthRequests: result.results || []
    }, { methods: METHODS });
  });
}

export async function onRequestPost(context) {
  return runEndpoint(context, METHODS, async () => {
    const db = getDb(context);
    const body = await readJson(context);
    const branchId = requiredString(body.branchId, "branchId", 128);
    const actor = await requireBranchAccess(context, db, branchId, ["owner", "admin", "doctor", "front_desk", "billing", "staff"]);
    const requestedAmountCents = Math.max(0, Number(body.requestedAmountCents) || 0);
    const attachmentCount = Array.isArray(body.attachments) ? body.attachments.length : Number(body.attachmentCount) || 0;
    const decision = createMockPreauthDecision({
      requestedAmountCents,
      diagnosisCode: cleanString(body.diagnosisCode, 40),
      attachmentCount
    });
    const preauthRequestId = cleanString(body.id, 128) || createId("preauth");
    const pepper = context.env.AUDIT_HASH_PEPPER || "";

    await db.prepare(
      `INSERT INTO payer_preauth_requests (
        id, branch_id, eligibility_check_id, patient_id, payer_provider_id,
        invoice_id, visit_id, requested_amount_cents, approved_amount_cents,
        status, external_reference, diagnosis_code, reason_code,
        attachment_count, response_json, requested_by_hash, resolved_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      preauthRequestId,
      branchId,
      cleanString(body.eligibilityCheckId, 128),
      cleanString(body.patientId, 128),
      requiredString(body.payerProviderId, "payerProviderId", 128),
      cleanString(body.invoiceId, 128),
      cleanString(body.visitId, 128),
      requestedAmountCents,
      decision.approvedAmountCents,
      decision.status,
      decision.externalReference,
      cleanString(body.diagnosisCode, 40),
      decision.reasonCode,
      attachmentCount,
      optionalJson(decision.response),
      await hashValue(actor.id, pepper),
      new Date().toISOString()
    ).run();

    const auditId = await writeAuditEvent(context, db, {
      branchId,
      actorType: actor.role,
      actorId: actor.id,
      action: "payer.preauth.request",
      resourceType: "payer_preauth_request",
      resourceId: preauthRequestId,
      phiScope: body.patientId ? "referenced" : "none",
      metadata: {
        payerProviderId: body.payerProviderId,
        status: decision.status,
        reasonCode: decision.reasonCode,
        attachmentCount
      }
    });

    return json(context, {
      ok: true,
      preauthRequest: {
        id: preauthRequestId,
        branchId,
        payerProviderId: body.payerProviderId,
        status: decision.status,
        approvedAmountCents: decision.approvedAmountCents,
        externalReference: decision.externalReference,
        reasonCode: decision.reasonCode
      },
      auditEventId: auditId
    }, { status: 201, methods: METHODS });
  });
}
