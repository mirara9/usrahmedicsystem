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
import { hashValue, writeAuditEvent } from "../../_lib/audit.js";
import { requireBranchAccess } from "../../_lib/access.js";
import { createMockSubmissionDecision, normalizeClaimMode } from "../../_lib/claims.js";

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
    const payerProviderId = cleanString(url.searchParams.get("payerProviderId"), 128);
    const status = cleanString(url.searchParams.get("status"), 40);
    const invoiceId = cleanString(url.searchParams.get("invoiceId"), 128);

    const result = await db.prepare(
      `SELECT
        c.*,
        p.name AS payer_name,
        i.invoice_number
      FROM claim_submissions c
      JOIN payer_providers p ON p.id = c.payer_provider_id
      LEFT JOIN invoices i ON i.id = c.invoice_id
      WHERE c.branch_id = ?
        AND (? IS NULL OR c.payer_provider_id = ?)
        AND (? IS NULL OR c.status = ?)
        AND (? IS NULL OR c.invoice_id = ?)
      ORDER BY c.created_at DESC
      LIMIT 100`
    ).bind(branchId, payerProviderId, payerProviderId, status, status, invoiceId, invoiceId).all();

    return json(context, {
      ok: true,
      claimSubmissions: result.results || []
    }, { methods: METHODS });
  });
}

export async function onRequestPost(context) {
  return runEndpoint(context, METHODS, async () => {
    const db = getDb(context);
    const body = await readJson(context, 65536);
    const branchId = requiredString(body.branchId, "branchId", 128);
    const actor = await requireBranchAccess(context, db, branchId, ["owner", "admin", "front_desk", "billing", "staff"]);
    const claimSubmissionId = cleanString(body.id, 128) || createId("claim");
    const requestedAmountCents = Math.round(parseNumber(body.requestedAmountCents, "requestedAmountCents", { positive: true }));
    const invoiceTotalCents = Math.max(requestedAmountCents, Number(body.invoiceTotalCents) || requestedAmountCents);
    const lines = Array.isArray(body.lines) ? body.lines : [];
    const attachments = Array.isArray(body.attachments) ? body.attachments : [];
    const decision = createMockSubmissionDecision({
      scenario: cleanString(body.scenario, 40),
      requestedAmountCents,
      invoiceTotalCents,
      invoiceId: cleanString(body.invoiceId, 128) || claimSubmissionId
    });
    const claimMode = normalizeClaimMode(body.claimMode);
    const pepper = context.env.AUDIT_HASH_PEPPER || "";
    const now = new Date().toISOString();
    const statements = [
      db.prepare(
        `INSERT INTO claim_submissions (
          id, branch_id, payer_provider_id, patient_id, invoice_id, visit_id,
          eligibility_check_id, preauth_request_id, claim_mode, status,
          external_reference, requested_amount_cents, approved_amount_cents,
          patient_balance_cents, currency, reason_code, response_json,
          submitted_by_hash, submitted_at, resolved_at, metadata_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        claimSubmissionId,
        branchId,
        requiredString(body.payerProviderId, "payerProviderId", 128),
        cleanString(body.patientId, 128),
        cleanString(body.invoiceId, 128),
        cleanString(body.visitId, 128),
        cleanString(body.eligibilityCheckId, 128),
        cleanString(body.preauthRequestId, 128),
        claimMode,
        decision.status,
        decision.externalReference,
        requestedAmountCents,
        decision.approvedAmountCents,
        decision.patientBalanceCents,
        cleanString(body.currency, 3) || "MYR",
        decision.reasonCode,
        optionalJson({ scenario: cleanString(body.scenario, 40) || "approve" }),
        await hashValue(actor.id, pepper),
        now,
        ["approved", "partially_approved", "rejected", "paid", "reconciled"].includes(decision.status) ? now : null,
        optionalJson(body.metadata)
      )
    ];

    for (const line of lines) {
      const lineRequestedAmountCents = Math.max(0, Number(line.requestedAmountCents) || 0);
      statements.push(
        db.prepare(
          `INSERT INTO claim_submission_lines (
            id, claim_submission_id, branch_id, invoice_line_id, local_code,
            payer_code, description, quantity, requested_amount_cents,
            approved_amount_cents, status, metadata_json
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          cleanString(line.id, 128) || createId("claim_line"),
          claimSubmissionId,
          branchId,
          cleanString(line.invoiceLineId, 128),
          cleanString(line.localCode, 80),
          cleanString(line.payerCode, 80),
          requiredString(line.description, "lines.description", 240),
          Number.isFinite(Number(line.quantity)) ? Number(line.quantity) : 1,
          lineRequestedAmountCents,
          decision.status === "rejected" ? 0 : Math.min(lineRequestedAmountCents, decision.approvedAmountCents),
          decision.status === "partially_approved" ? "partially_approved" : decision.status === "rejected" ? "rejected" : "approved",
          optionalJson(line.metadata)
        )
      );
    }

    for (const attachment of attachments) {
      statements.push(
        db.prepare(
          `INSERT INTO claim_attachments (
            id, claim_submission_id, branch_id, attachment_type, storage_uri,
            content_hash, status, metadata_json
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          cleanString(attachment.id, 128) || createId("claim_attachment"),
          claimSubmissionId,
          branchId,
          cleanString(attachment.attachmentType, 40) || "other",
          cleanString(attachment.storageUri, 500),
          cleanString(attachment.contentHash, 180),
          "sent",
          optionalJson(attachment.metadata)
        )
      );
    }

    await db.batch(statements);

    const auditId = await writeAuditEvent(context, db, {
      branchId,
      actorType: actor.role,
      actorId: actor.id,
      action: "payer.claim.submit",
      resourceType: "claim_submission",
      resourceId: claimSubmissionId,
      phiScope: body.patientId ? "referenced" : "none",
      metadata: {
        payerProviderId: body.payerProviderId,
        status: decision.status,
        lineCount: lines.length,
        attachmentCount: attachments.length,
        reasonCode: decision.reasonCode
      }
    });

    return json(context, {
      ok: true,
      claimSubmission: {
        id: claimSubmissionId,
        branchId,
        payerProviderId: body.payerProviderId,
        status: decision.status,
        claimMode,
        requestedAmountCents,
        approvedAmountCents: decision.approvedAmountCents,
        patientBalanceCents: decision.patientBalanceCents,
        externalReference: decision.externalReference,
        reasonCode: decision.reasonCode
      },
      auditEventId: auditId
    }, { status: 201, methods: METHODS });
  });
}
