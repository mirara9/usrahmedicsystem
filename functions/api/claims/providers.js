import {
  cleanString,
  createId,
  getDb,
  handleOptions,
  json,
  optionalJson,
  readJson,
  requiredString,
  requireRole,
  runEndpoint
} from "../../_lib/http.js";
import { writeAuditEvent } from "../../_lib/audit.js";

const METHODS = "GET, POST, OPTIONS";

export function onRequestOptions(context) {
  return handleOptions(context, METHODS);
}

export async function onRequestGet(context) {
  return runEndpoint(context, METHODS, async () => {
    requireRole(context, ["owner", "admin", "billing", "staff"]);
    const db = getDb(context);
    const result = await db.prepare(
      `SELECT
        p.*,
        COUNT(plan.id) AS plan_count
      FROM payer_providers p
      LEFT JOIN payer_plans plan ON plan.payer_provider_id = p.id AND plan.status = 'active'
      GROUP BY p.id
      ORDER BY p.name`
    ).all();

    return json(context, {
      ok: true,
      payerProviders: result.results || []
    }, { methods: METHODS });
  });
}

export async function onRequestPost(context) {
  return runEndpoint(context, METHODS, async () => {
    const actor = requireRole(context, ["owner", "admin"]);
    const db = getDb(context);
    const body = await readJson(context);
    const payerProviderId = cleanString(body.id, 128) || createId("payer");
    const plans = Array.isArray(body.plans) ? body.plans : [];
    const statements = [
      db.prepare(
        `INSERT INTO payer_providers (
          id, name, provider_kind, adapter_kind, payer_code,
          supported_claim_modes_json, contact_json, portal_url, status,
          metadata_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          provider_kind = excluded.provider_kind,
          adapter_kind = excluded.adapter_kind,
          payer_code = excluded.payer_code,
          supported_claim_modes_json = excluded.supported_claim_modes_json,
          contact_json = excluded.contact_json,
          portal_url = excluded.portal_url,
          status = excluded.status,
          metadata_json = excluded.metadata_json`
      ).bind(
        payerProviderId,
        requiredString(body.name, "name", 180),
        cleanString(body.providerKind, 40) || "tpa",
        cleanString(body.adapterKind, 40) || "mock",
        cleanString(body.payerCode, 80),
        JSON.stringify(Array.isArray(body.supportedClaimModes) ? body.supportedClaimModes : ["cashless_panel"]),
        optionalJson(body.contact),
        cleanString(body.portalUrl, 500),
        cleanString(body.status, 20) || "active",
        optionalJson(body.metadata)
      )
    ];

    for (const plan of plans) {
      statements.push(
        db.prepare(
          `INSERT INTO payer_plans (
            id, payer_provider_id, plan_code, name, plan_type,
            outpatient_cashless_enabled, guarantee_letter_required,
            default_copay_cents, annual_limit_cents, status, rules_json
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(payer_provider_id, plan_code) DO UPDATE SET
            name = excluded.name,
            plan_type = excluded.plan_type,
            outpatient_cashless_enabled = excluded.outpatient_cashless_enabled,
            guarantee_letter_required = excluded.guarantee_letter_required,
            default_copay_cents = excluded.default_copay_cents,
            annual_limit_cents = excluded.annual_limit_cents,
            status = excluded.status,
            rules_json = excluded.rules_json`
        ).bind(
          cleanString(plan.id, 128) || createId("plan"),
          payerProviderId,
          requiredString(plan.planCode, "plans.planCode", 80),
          requiredString(plan.name, "plans.name", 180),
          cleanString(plan.planType, 60) || "corporate_outpatient",
          plan.outpatientCashlessEnabled === false ? 0 : 1,
          plan.guaranteeLetterRequired ? 1 : 0,
          Math.max(0, Number(plan.defaultCopayCents) || 0),
          plan.annualLimitCents === undefined ? null : Math.max(0, Number(plan.annualLimitCents) || 0),
          cleanString(plan.status, 20) || "active",
          optionalJson(plan.rules)
        )
      );
    }

    await db.batch(statements);

    const auditId = await writeAuditEvent(context, db, {
      actorType: actor.role,
      actorId: actor.id,
      action: "payer.upsert",
      resourceType: "payer_provider",
      resourceId: payerProviderId,
      phiScope: "none",
      metadata: {
        plans: plans.length,
        adapterKind: cleanString(body.adapterKind, 40) || "mock"
      }
    });

    return json(context, {
      ok: true,
      payerProvider: {
        id: payerProviderId,
        name: body.name,
        plans: plans.length
      },
      auditEventId: auditId
    }, { status: 201, methods: METHODS });
  });
}
