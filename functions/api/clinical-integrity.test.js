import { describe, expect, it } from "vitest";
import { onRequestPost as createConsultation } from "./consultations.js";
import { onRequestPost as createDocument } from "./documents.js";

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

  async first() {
    this.db.calls.push({ type: "first", sql: this.sql, args: this.args });
    return this.db.handle(this.sql, this.args, "first") ?? null;
  }

  async run() {
    this.db.calls.push({ type: "run", sql: this.sql, args: this.args });
    return this.db.handle(this.sql, this.args, "run") ?? { success: true };
  }

  async all() {
    this.db.calls.push({ type: "all", sql: this.sql, args: this.args });
    return this.db.handle(this.sql, this.args, "all") ?? { results: [] };
  }
}

class FakeDb {
  constructor(handler) {
    this.handler = handler;
    this.calls = [];
  }

  prepare(sql) {
    return new FakePreparedStatement(this, sql);
  }

  handle(sql, args, method) {
    return this.handler(sql, args, method);
  }
}

function buildContext(path, { body, headers = {}, db } = {}) {
  return {
    request: new Request(`https://example.com${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...headers
      },
      body: JSON.stringify(body)
    }),
    env: {
      USRAHMEDIC_DB: db,
      AUDIT_HASH_PEPPER: "test-pepper"
    }
  };
}

function withBranchAssignment(roleAtBranch, extraHandler = () => null) {
  return (sql, args, method) => {
    if (sql.includes("FROM staff_accounts s") && sql.includes("JOIN staff_branch_assignments a")) {
      return {
        id: "staff_1",
        role: "staff",
        role_at_branch: roleAtBranch
      };
    }

    return extraHandler(sql, args, method);
  };
}

describe("clinical workflow integrity", () => {
  it("rejects signing a consultation from a non-doctor branch role", async () => {
    const db = new FakeDb(withBranchAssignment("front_desk"));

    const response = await createConsultation(buildContext("/api/consultations", {
      db,
      headers: {
        "X-UsrahMedic-Role": "staff",
        "X-UsrahMedic-Actor-Id": "staff_1"
      },
      body: {
        branchId: "puncak-alam",
        visitId: "visit_1",
        patientId: "patient_1",
        status: "signed",
        clinicalSummary: "Patient stable"
      }
    }));

    const payload = await response.json();
    expect(response.status).toBe(403);
    expect(payload.error.code).toBe("SIGNATURE_ROLE_REQUIRED");
  });

  it("rejects an amended consultation when the source consultation is not signed", async () => {
    const db = new FakeDb(withBranchAssignment("doctor", (sql) => {
      if (sql.includes("FROM consultations") && sql.includes("WHERE id = ?")) {
        return {
          id: "consult_original",
          branch_id: "puncak-alam",
          status: "draft"
        };
      }
      return null;
    }));

    const response = await createConsultation(buildContext("/api/consultations", {
      db,
      headers: {
        "X-UsrahMedic-Role": "staff",
        "X-UsrahMedic-Actor-Id": "staff_1"
      },
      body: {
        branchId: "puncak-alam",
        visitId: "visit_1",
        patientId: "patient_1",
        status: "amended",
        amendedFromId: "consult_original",
        clinicalSummary: "Corrected note"
      }
    }));

    const payload = await response.json();
    expect(response.status).toBe(400);
    expect(payload.error.code).toBe("AMENDMENT_SOURCE_INVALID");
  });

  it("rejects issuing a medical certificate when the document is not final", async () => {
    const db = new FakeDb(withBranchAssignment("doctor"));

    const response = await createDocument(buildContext("/api/documents", {
      db,
      headers: {
        "X-UsrahMedic-Role": "staff",
        "X-UsrahMedic-Actor-Id": "staff_1"
      },
      body: {
        branchId: "puncak-alam",
        patientId: "patient_1",
        visitId: "visit_1",
        consultationId: "consult_1",
        title: "MC for rest",
        documentType: "clinical_note",
        status: "draft",
        medicalCertificate: {
          patientId: "patient_1",
          visitId: "visit_1",
          consultationId: "consult_1",
          status: "issued",
          startOn: "2026-05-03",
          endOn: "2026-05-04"
        }
      }
    }));

    const payload = await response.json();
    expect(response.status).toBe(400);
    expect(payload.error.code).toBe("MC_FINAL_DOCUMENT_REQUIRED");
  });
});
