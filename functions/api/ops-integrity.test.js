import { describe, expect, it } from "vitest";
import { onRequestPost as createSnapshot } from "./reports/snapshots.js";
import { onRequestPost as createTicket } from "./support/tickets.js";
import { onRequestPost as upsertTask } from "./onboarding/tasks.js";

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
    return this.db.handle(this.sql, this.args, "first") ?? {
      invoice_count: 0,
      revenue_cents: 0,
      balance_cents: 0,
      visit_count: 0,
      collected_cents: 0
    };
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

describe("reporting and operational workflow integrity", () => {
  it("rejects a report snapshot when periodEnd is earlier than periodStart", async () => {
    const db = new FakeDb(withBranchAssignment("billing"));

    const response = await createSnapshot(buildContext("/api/reports/snapshots", {
      db,
      headers: {
        "X-UsrahMedic-Role": "staff",
        "X-UsrahMedic-Actor-Id": "staff_1"
      },
      body: {
        branchId: "puncak-alam",
        reportType: "clinic_daily",
        periodStart: "2026-05-05T00:00:00.000Z",
        periodEnd: "2026-05-04T00:00:00.000Z"
      }
    }));

    const payload = await response.json();
    expect(response.status).toBe(400);
    expect(payload.error.code).toBe("INVALID_REPORT_PERIOD");
  });

  it("rejects a high-priority support ticket without a meaningful description", async () => {
    const db = new FakeDb(withBranchAssignment("support"));

    const response = await createTicket(buildContext("/api/support/tickets", {
      db,
      headers: {
        "X-UsrahMedic-Role": "staff",
        "X-UsrahMedic-Actor-Id": "staff_1"
      },
      body: {
        branchId: "puncak-alam",
        priority: "high",
        subject: "Billing issue"
      }
    }));

    const payload = await response.json();
    expect(response.status).toBe(400);
    expect(payload.error.code).toBe("SUPPORT_DESCRIPTION_REQUIRED");
  });

  it("rejects completing an onboarding task without evidence", async () => {
    const db = new FakeDb(withBranchAssignment("support"));

    const response = await upsertTask(buildContext("/api/onboarding/tasks", {
      db,
      headers: {
        "X-UsrahMedic-Role": "staff",
        "X-UsrahMedic-Actor-Id": "staff_1"
      },
      body: {
        branchId: "puncak-alam",
        taskKey: "import-opening-stock",
        title: "Import opening stock",
        status: "done"
      }
    }));

    const payload = await response.json();
    expect(response.status).toBe(400);
    expect(payload.error.code).toBe("ONBOARDING_EVIDENCE_REQUIRED");
  });
});
