import {
  cleanString,
  createId,
  getActor,
  getDb,
  handleOptions,
  HttpError,
  json,
  optionalJson,
  readJson,
  requiredString,
  requireRole,
  runEndpoint
} from "../../_lib/http.js";
import { hashValue, writeAuditEvent } from "../../_lib/audit.js";

const METHODS = "GET, POST, OPTIONS";
const ALLOWED_STATUSES = ["waiting", "called", "in_service", "completed", "cancelled"];

export function onRequestOptions(context) {
  return handleOptions(context, METHODS);
}

export async function onRequestGet(context) {
  return runEndpoint(context, METHODS, async () => {
    requireRole(context, ["owner", "admin", "staff"]);
    const db = getDb(context);
    const url = new URL(context.request.url);
    const branchId = requiredString(url.searchParams.get("branchId"), "branchId", 128);
    const status = cleanString(url.searchParams.get("status"), 20);
    const from = cleanString(url.searchParams.get("from"), 40) || "0000-01-01T00:00:00.000Z";
    const to = cleanString(url.searchParams.get("to"), 40) || "9999-12-31T23:59:59.999Z";

    const result = await db.prepare(
      `SELECT
        a.id AS appointment_id,
        a.branch_id,
        a.service_code,
        a.service_label,
        a.source,
        a.status AS appointment_status,
        a.scheduled_start,
        a.scheduled_end,
        p.id AS patient_id,
        p.full_name AS patient_full_name,
        p.phone_e164 AS patient_phone_e164,
        p.status AS patient_status,
        q.id AS queue_ticket_id,
        q.ticket_code,
        q.queue_name,
        q.priority,
        q.status AS queue_status,
        v.id AS visit_id,
        v.status AS visit_status,
        v.chief_complaint,
        v.opened_at
      FROM appointments a
      JOIN patients p ON p.id = a.patient_id
      LEFT JOIN queue_tickets q ON q.appointment_id = a.id
      LEFT JOIN patient_visit_records v ON v.appointment_id = a.id
      WHERE a.branch_id = ?
        AND a.scheduled_start BETWEEN ? AND ?
        AND (? IS NULL OR q.status = ?)
      ORDER BY a.scheduled_start DESC
      LIMIT 100`
    ).bind(branchId, from, to, status, status).all();

    return json(context, {
      ok: true,
      registrations: result.results || []
    }, { methods: METHODS });
  });
}

export async function onRequestPost(context) {
  return runEndpoint(context, METHODS, async () => {
    const actor = requireRole(context, ["owner", "admin", "staff"]);
    const db = getDb(context);
    const body = await readJson(context);
    const branchId = requiredString(body.branchId, "branchId", 128);
    const patient = body.patient || {};
    const registration = body.registration || {};
    const appointment = body.appointment || {};
    const queueTicket = body.queueTicket || {};
    const actorContext = getActor(context);

    const patientId = cleanString(patient.id, 128) || createId("patient");
    const appointmentId = cleanString(appointment.id, 128) || createId("appt");
    const visitId = cleanString(registration.visitId, 128) || createId("visit");
    const queueTicketId = cleanString(queueTicket.id, 128) || createId("queue");

    const fullName = requiredString(patient.fullName, "patient.fullName", 180);
    const consentPdpaAt = requiredString(patient.consentPdpaAt, "patient.consentPdpaAt", 40);
    const privacyNoticeVersion = requiredString(patient.privacyNoticeVersion, "patient.privacyNoticeVersion", 80);
    const serviceCode = cleanString(appointment.serviceCode, 80) || cleanString(registration.serviceCode, 80) || "general-consultation";
    const serviceLabel = cleanString(appointment.serviceLabel, 160) || cleanString(registration.serviceLabel, 160) || "General consultation";
    const scheduledStart = cleanString(appointment.scheduledStart, 40) || new Date().toISOString();
    const scheduledEnd = cleanString(appointment.scheduledEnd, 40);
    const queueName = cleanString(queueTicket.queueName, 80) || "general";
    const queueStatus = cleanString(queueTicket.status, 20) || "waiting";
    const visitStatus = cleanString(registration.visitStatus, 20) || "open";
    const queuePriority = Number.isFinite(Number(queueTicket.priority)) ? Number(queueTicket.priority) : 0;

    if (!ALLOWED_STATUSES.includes(queueStatus)) {
      throw new HttpError(400, "VALIDATION_ERROR", "queueTicket.status is not supported.");
    }

    const ticketCode = requiredString(queueTicket.ticketCode || buildTicketCode(branchId), "queueTicket.ticketCode", 40);
    const pepper = context.env.AUDIT_HASH_PEPPER || "";

    await db.batch([
      db.prepare(
        `INSERT INTO patients (
          id, branch_id, external_ref, full_name, preferred_name, national_id_last4,
          date_of_birth, sex, phone_e164, email, address_json, emergency_contact_json,
          consent_pdpa_at, consent_marketing_at, privacy_notice_version, status,
          registered_source, primary_panel_provider_id, medical_alerts_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          branch_id = excluded.branch_id,
          external_ref = excluded.external_ref,
          full_name = excluded.full_name,
          preferred_name = excluded.preferred_name,
          national_id_last4 = excluded.national_id_last4,
          date_of_birth = excluded.date_of_birth,
          sex = excluded.sex,
          phone_e164 = excluded.phone_e164,
          email = excluded.email,
          address_json = excluded.address_json,
          emergency_contact_json = excluded.emergency_contact_json,
          consent_pdpa_at = excluded.consent_pdpa_at,
          consent_marketing_at = excluded.consent_marketing_at,
          privacy_notice_version = excluded.privacy_notice_version,
          status = excluded.status,
          registered_source = excluded.registered_source,
          primary_panel_provider_id = excluded.primary_panel_provider_id,
          medical_alerts_json = excluded.medical_alerts_json`
      ).bind(
        patientId,
        branchId,
        cleanString(patient.externalRef, 80),
        fullName,
        cleanString(patient.preferredName, 120) || fullName,
        cleanString(patient.nationalIdLast4, 4),
        cleanString(patient.dateOfBirth, 20),
        cleanString(patient.sex, 20) || "unknown",
        cleanString(patient.phoneE164, 40),
        cleanString(patient.email, 160),
        optionalJson(patient.address),
        optionalJson(patient.emergencyContact),
        consentPdpaAt,
        cleanString(patient.consentMarketingAt, 40),
        privacyNoticeVersion,
        cleanString(patient.status, 20) || "active",
        cleanString(patient.registeredSource, 40) || "counter",
        cleanString(patient.primaryPanelProviderId, 128),
        optionalJson(patient.medicalAlerts)
      ),
      db.prepare(
        `INSERT INTO appointments (
          id, branch_id, patient_id, booked_by_type, source, service_code,
          service_label, scheduled_start, scheduled_end, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'checked_in')`
      ).bind(
        appointmentId,
        branchId,
        patientId,
        ["owner", "admin", "staff"].includes(actorContext.role) ? actorContext.role : "staff",
        cleanString(appointment.source, 20) || "counter",
        serviceCode,
        serviceLabel,
        scheduledStart,
        scheduledEnd
      ),
      db.prepare(
        `INSERT INTO queue_tickets (
          id, branch_id, appointment_id, patient_id, ticket_code, queue_name, priority, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        queueTicketId,
        branchId,
        appointmentId,
        patientId,
        ticketCode,
        queueName,
        queuePriority,
        queueStatus
      ),
      db.prepare(
        `INSERT INTO patient_visit_records (
          id, branch_id, patient_id, appointment_id, queue_ticket_id,
          visit_type, chief_complaint, triage_json, status, created_by_hash,
          metadata_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        visitId,
        branchId,
        patientId,
        appointmentId,
        queueTicketId,
        cleanString(registration.visitType, 80) || "consultation",
        cleanString(registration.chiefComplaint, 1000),
        optionalJson(registration.triage),
        visitStatus,
        await hashValue(actor.id, pepper),
        optionalJson({
          channel: cleanString(registration.channel, 40) || "front-desk",
          actorRole: actor.role,
          notes: cleanString(registration.notes, 500)
        })
      )
    ]);

    const auditEventId = await writeAuditEvent(context, db, {
      branchId,
      actorType: actor.role,
      actorId: actor.id,
      action: "admin.registration.create",
      resourceType: "patient_visit_record",
      resourceId: visitId,
      phiScope: "changed",
      metadata: {
        serviceCode,
        queueName,
        queueStatus,
        visitStatus,
        source: cleanString(appointment.source, 20) || "counter",
        bookedByType: ["owner", "admin", "staff"].includes(actorContext.role) ? actorContext.role : "staff"
      }
    });

    return json(context, {
      ok: true,
      registration: {
        branchId,
        patientId,
        appointmentId,
        queueTicketId,
        ticketCode,
        visitId,
        serviceCode,
        serviceLabel,
        queueStatus,
        visitStatus,
        scheduledStart
      },
      auditEventId
    }, { status: 201, methods: METHODS });
  });
}

function buildTicketCode(branchId) {
  const prefix = cleanString(branchId, 32)
    ?.split("-")
    .map((part) => part[0]?.toUpperCase() || "X")
    .join("")
    .slice(0, 3) || "UM";

  const suffix = Date.now().toString().slice(-6);
  return `${prefix}-${suffix}`;
}
