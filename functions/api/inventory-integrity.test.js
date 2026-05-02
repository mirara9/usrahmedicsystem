import { describe, expect, it } from "vitest";
import { onRequestPost as createDispense } from "./inventory/dispense.js";
import { onRequestPost as createLabelJob } from "./inventory/labels.js";

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
    this.batches = [];
  }

  prepare(sql) {
    return new FakePreparedStatement(this, sql);
  }

  async batch(statements) {
    this.batches.push(statements.map((statement) => ({ sql: statement.sql, args: statement.args })));
    return [];
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

describe("inventory workflow integrity", () => {
  it("rejects creating a dispense without dispense lines", async () => {
    const db = new FakeDb(withBranchAssignment("pharmacist"));

    const response = await createDispense(buildContext("/api/inventory/dispense", {
      db,
      headers: {
        "X-UsrahMedic-Role": "staff",
        "X-UsrahMedic-Actor-Id": "staff_1"
      },
      body: {
        branchId: "puncak-alam",
        patientId: "patient_1",
        lines: []
      }
    }));

    const payload = await response.json();
    expect(response.status).toBe(400);
    expect(payload.error.code).toBe("DISPENSE_LINES_REQUIRED");
  });

  it("rejects a dispense created by a non-pharmacist/non-doctor branch role", async () => {
    const db = new FakeDb(withBranchAssignment("front_desk"));

    const response = await createDispense(buildContext("/api/inventory/dispense", {
      db,
      headers: {
        "X-UsrahMedic-Role": "staff",
        "X-UsrahMedic-Actor-Id": "staff_1"
      },
      body: {
        branchId: "puncak-alam",
        patientId: "patient_1",
        lines: [
          {
            stockItemId: "stock_1",
            stockLotId: "lot_1",
            quantity: 1
          }
        ]
      }
    }));

    const payload = await response.json();
    expect(response.status).toBe(403);
    expect(payload.error.code).toBe("DISPENSE_ROLE_REQUIRED");
  });

  it("rejects marking a label job as printed without dispense and printer context", async () => {
    const db = new FakeDb(withBranchAssignment("pharmacist"));

    const response = await createLabelJob(buildContext("/api/inventory/labels", {
      db,
      headers: {
        "X-UsrahMedic-Role": "staff",
        "X-UsrahMedic-Actor-Id": "staff_1"
      },
      body: {
        branchId: "puncak-alam",
        status: "printed",
        patientId: "patient_1",
        labelPayload: { text: "Take after food" }
      }
    }));

    const payload = await response.json();
    expect(response.status).toBe(400);
    expect(payload.error.code).toBe("LABEL_PRINT_CONTEXT_REQUIRED");
  });
});
