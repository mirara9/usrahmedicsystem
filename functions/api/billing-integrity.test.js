import { describe, expect, it } from "vitest";
import { onRequestPost as createInvoice } from "./billing/invoices.js";
import { onRequestPost as recordPayment } from "./billing/payments.js";

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

describe("billing workflow integrity", () => {
  it("rejects creating an issued invoice without invoice lines", async () => {
    const db = new FakeDb(withBranchAssignment("billing"));

    const response = await createInvoice(buildContext("/api/billing/invoices", {
      db,
      headers: {
        "X-UsrahMedic-Role": "staff",
        "X-UsrahMedic-Actor-Id": "staff_1"
      },
      body: {
        branchId: "puncak-alam",
        status: "issued",
        lines: []
      }
    }));

    const payload = await response.json();
    expect(response.status).toBe(400);
    expect(payload.error.code).toBe("INVOICE_LINES_REQUIRED");
  });

  it("rejects recording a paid payment against a draft invoice", async () => {
    const db = new FakeDb(withBranchAssignment("billing", (sql) => {
      if (sql.includes("FROM invoices") && sql.includes("WHERE id = ?")) {
        return {
          id: "invoice_1",
          branch_id: "puncak-alam",
          status: "draft",
          balance_cents: 25000
        };
      }
      return null;
    }));

    const response = await recordPayment(buildContext("/api/billing/payments", {
      db,
      headers: {
        "X-UsrahMedic-Role": "staff",
        "X-UsrahMedic-Actor-Id": "staff_1"
      },
      body: {
        branchId: "puncak-alam",
        invoiceId: "invoice_1",
        amountCents: 10000,
        status: "paid",
        paymentMethod: "cash"
      }
    }));

    const payload = await response.json();
    expect(response.status).toBe(400);
    expect(payload.error.code).toBe("INVOICE_NOT_PAYABLE");
  });

  it("rejects recording a payment larger than the remaining invoice balance", async () => {
    const db = new FakeDb(withBranchAssignment("billing", (sql) => {
      if (sql.includes("FROM invoices") && sql.includes("WHERE id = ?")) {
        return {
          id: "invoice_2",
          branch_id: "puncak-alam",
          status: "issued",
          balance_cents: 5000
        };
      }
      return null;
    }));

    const response = await recordPayment(buildContext("/api/billing/payments", {
      db,
      headers: {
        "X-UsrahMedic-Role": "staff",
        "X-UsrahMedic-Actor-Id": "staff_1"
      },
      body: {
        branchId: "puncak-alam",
        invoiceId: "invoice_2",
        amountCents: 10000,
        status: "paid",
        paymentMethod: "cash"
      }
    }));

    const payload = await response.json();
    expect(response.status).toBe(400);
    expect(payload.error.code).toBe("PAYMENT_EXCEEDS_BALANCE");
  });
});
