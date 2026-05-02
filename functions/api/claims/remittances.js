import {
  cleanString,
  createId,
  getDb,
  handleOptions,
  json,
  optionalJson,
  parseNumber,
  readJson,
  requiredString,
  runEndpoint
} from "../../_lib/http.js";
import { writeAuditEvent } from "../../_lib/audit.js";
import { requireBranchAccess } from "../../_lib/access.js";

const METHODS = "GET, POST, OPTIONS";

export function onRequestOptions(context) {
  return handleOptions(context, METHODS);
}

export async function onRequestGet(context) {
  return runEndpoint(context, METHODS, async () => {
    const db = getDb(context);
    const url = new URL(context.request.url);
    const branchId = cleanString(url.searchParams.get("branchId"), 128);
    if (branchId) {
      await requireBranchAccess(context, db, branchId, ["owner", "admin", "billing", "staff"]);
    } else {
      await requireBranchAccess(context, db, "puncak-alam", ["owner"]);
    }
    const payerProviderId = cleanString(url.searchParams.get("payerProviderId"), 128);
    const status = cleanString(url.searchParams.get("status"), 40);

    const result = await db.prepare(
      `SELECT
        r.*,
        p.name AS payer_name,
        c.external_reference AS claim_external_reference
      FROM payer_remittances r
      JOIN payer_providers p ON p.id = r.payer_provider_id
      LEFT JOIN claim_submissions c ON c.id = r.claim_submission_id
      WHERE (? IS NULL OR r.branch_id = ?)
        AND (? IS NULL OR r.payer_provider_id = ?)
        AND (? IS NULL OR r.status = ?)
      ORDER BY r.received_at DESC
      LIMIT 100`
    ).bind(branchId, branchId, payerProviderId, payerProviderId, status, status).all();

    return json(context, {
      ok: true,
      remittances: result.results || []
    }, { methods: METHODS });
  });
}

export async function onRequestPost(context) {
  return runEndpoint(context, METHODS, async () => {
    const db = getDb(context);
    const body = await readJson(context);
    const branchId = cleanString(body.branchId, 128);
    const actor = await requireBranchAccess(context, db, branchId || "puncak-alam", branchId ? ["owner", "admin", "billing", "staff"] : ["owner"]);
    const remittanceId = cleanString(body.id, 128) || createId("remittance");
    const payerProviderId = requiredString(body.payerProviderId, "payerProviderId", 128);
    const amountCents = Math.round(parseNumber(body.amountCents, "amountCents"));
    const status = cleanString(body.status, 40) || "received";
    const statements = [
      db.prepare(
        `INSERT INTO payer_remittances (
          id, branch_id, payer_provider_id, claim_submission_id,
          reconciliation_batch_id, amount_cents, currency, status,
          external_reference, received_at, metadata_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        remittanceId,
        branchId,
        payerProviderId,
        cleanString(body.claimSubmissionId, 128),
        cleanString(body.reconciliationBatchId, 128),
        amountCents,
        cleanString(body.currency, 3) || "MYR",
        status,
        cleanString(body.externalReference, 180),
        cleanString(body.receivedAt, 40) || new Date().toISOString(),
        optionalJson(body.metadata)
      )
    ];

    if (body.claimSubmissionId && ["matched", "reconciled"].includes(status)) {
      statements.push(
        db.prepare(
          `UPDATE claim_submissions
          SET status = ?,
            approved_amount_cents = MAX(approved_amount_cents, ?),
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?`
        ).bind(status === "reconciled" ? "reconciled" : "paid", amountCents, cleanString(body.claimSubmissionId, 128))
      );
    }

    await db.batch(statements);

    const auditId = await writeAuditEvent(context, db, {
      branchId,
      actorType: actor.role,
      actorId: actor.id,
      action: "payer.remittance.record",
      resourceType: "payer_remittance",
      resourceId: remittanceId,
      phiScope: body.claimSubmissionId ? "referenced" : "none",
      metadata: {
        payerProviderId,
        amountCents,
        status,
        claimSubmissionId: body.claimSubmissionId
      }
    });

    return json(context, {
      ok: true,
      remittance: {
        id: remittanceId,
        branchId,
        payerProviderId,
        claimSubmissionId: cleanString(body.claimSubmissionId, 128),
        amountCents,
        status
      },
      auditEventId: auditId
    }, { status: 201, methods: METHODS });
  });
}
