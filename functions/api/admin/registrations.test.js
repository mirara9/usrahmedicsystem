import { describe, expect, it } from "vitest";
import { onRequestGet, onRequestPost } from "./registrations.js";

class FakePreparedStatement {
  constructor(db, sql) {
    this.db = db;
    this.sql = sql;
    this.args = [];
  }

  bind(...args) {
    this.args = args;
    return this;
  }

  async all() {
    this.db.calls.push({ type: "all", sql: this.sql, args: this.args });
    if (this.db.allResult) {
      return this.db.allResult;
    }
    return { results: [] };
  }

  async first() {
    this.db.calls.push({ type: "first", sql: this.sql, args: this.args });
    return this.db.firstResult ?? null;
  }

  async run() {
    this.db.calls.push({ type: "run", sql: this.sql, args: this.args });
    return { success: true };
  }
}

class FakeDb {
  constructor() {
    this.calls = [];
    this.batches = [];
    this.allResult = null;
    this.firstResult = null;
  }

  prepare(sql) {
    this.calls.push({ type: "prepare", sql });
    return new FakePreparedStatement(this, sql);
  }

  async batch(statements) {
    this.batches.push(statements.map((statement) => ({ sql: statement.sql, args: statement.args })));
    return [];
  }
}

function buildContext(path, { method = "GET", body, headers = {}, db = new FakeDb() } = {}) {
  return {
    request: new Request(`https://example.com${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    }),
    env: {
      USRAHMEDIC_DB: db,
      AUDIT_HASH_PEPPER: "test-pepper"
    }
  };
}

describe("/api/admin/registrations", () => {
  it("creates a front-desk registration with patient, appointment, queue, and visit records", async () => {
    const db = new FakeDb();
    const context = buildContext("/api/admin/registrations", {
      method: "POST",
      db,
      headers: {
        "Content-Type": "application/json",
        "X-UsrahMedic-Role": "admin",
        "X-UsrahMedic-Actor-Id": "staff-admin-1"
      },
      body: {
        branchId: "puncak-alam",
        patient: {
          fullName: "Nur Aina",
          preferredName: "Aina",
          phoneE164: "+60123456789",
          consentPdpaAt: "2026-05-02T10:00:00.000Z",
          privacyNoticeVersion: "2026-05-01"
        },
        appointment: {
          serviceCode: "gp-consultation",
          serviceLabel: "GP consultation",
          scheduledStart: "2026-05-03T02:00:00.000Z"
        },
        registration: {
          chiefComplaint: "Fever for two days",
          triage: { urgency: "priority" }
        }
      }
    });

    const response = await onRequestPost(context);
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(payload.ok).toBe(true);
    expect(payload.registration.branchId).toBe("puncak-alam");
    expect(payload.registration.patientId).toMatch(/^patient_/);
    expect(payload.registration.appointmentId).toMatch(/^appt_/);
    expect(payload.registration.queueTicketId).toMatch(/^queue_/);
    expect(payload.registration.visitId).toMatch(/^visit_/);
    expect(payload.registration.ticketCode).toMatch(/^PA-/);
    expect(payload.auditEventId).toMatch(/^audit_/);

    expect(db.batches).toHaveLength(1);
    expect(db.batches[0]).toHaveLength(4);
    expect(db.batches[0][0].sql).toContain("INSERT INTO patients");
    expect(db.batches[0][1].sql).toContain("INSERT INTO appointments");
    expect(db.batches[0][2].sql).toContain("INSERT INTO queue_tickets");
    expect(db.batches[0][3].sql).toContain("INSERT INTO patient_visit_records");
    expect(db.calls.some((call) => call.type === "run" && call.sql.includes("INSERT INTO audit_events"))).toBe(true);
  });

  it("lists registrations by branch", async () => {
    const db = new FakeDb();
    db.allResult = {
      results: [
        {
          appointment_id: "appt_1",
          branch_id: "puncak-alam",
          patient_full_name: "Nur Aina",
          ticket_code: "PA-100001",
          queue_status: "waiting",
          visit_status: "open"
        }
      ]
    };

    const context = buildContext("/api/admin/registrations?branchId=puncak-alam", {
      db,
      headers: {
        "X-UsrahMedic-Role": "staff",
        "X-UsrahMedic-Actor-Id": "staff-frontdesk-1"
      }
    });

    const response = await onRequestGet(context);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.registrations).toHaveLength(1);
    expect(payload.registrations[0].ticket_code).toBe("PA-100001");
    expect(db.calls.some((call) => call.type === "all" && call.args[0] === "puncak-alam")).toBe(true);
  });
});
