import { describe, expect, it } from "vitest";
import { onRequestGet, onRequestPost } from "./sessions.js";

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
    return this.db.handle(this.sql, this.args, "all") ?? { results: [] };
  }

  async first() {
    this.db.calls.push({ type: "first", sql: this.sql, args: this.args });
    return this.db.handle(this.sql, this.args, "first") ?? null;
  }

  async run() {
    this.db.calls.push({ type: "run", sql: this.sql, args: this.args });
    return this.db.handle(this.sql, this.args, "run") ?? { success: true };
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

function buildContext(path, { method = "GET", body, headers = {}, db } = {}) {
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

describe("/api/auth/sessions lifecycle hardening", () => {
  it("returns the current session for a bearer-authenticated staff user", async () => {
    const db = new FakeDb((sql) => {
      if (sql.includes("FROM staff_sessions ss") && sql.includes("JOIN staff_accounts s")) {
        return {
          session_id: "session_1",
          staff_account_id: "staff_1",
          session_branch_id: "puncak-alam",
          role: "staff",
          status: "active",
          mfa_required: 1,
          mfa_verified_at: "2026-05-02T10:00:00.000Z"
        };
      }

      if (sql.includes("FROM staff_sessions") && sql.includes("WHERE id = ?")) {
        return {
          id: "session_1",
          staff_account_id: "staff_1",
          branch_id: "puncak-alam",
          mfa_verified_at: "2026-05-02T10:00:00.000Z",
          issued_at: "2026-05-02T09:00:00.000Z",
          expires_at: "2099-05-02T18:00:00.000Z",
          revoked_at: null,
          metadata_json: "{}"
        };
      }

      return null;
    });

    const response = await onRequestGet(buildContext("/api/auth/sessions?current=true", {
      db,
      headers: {
        Authorization: "Bearer valid-session-token"
      }
    }));

    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.currentSession.id).toBe("session_1");
    expect(payload.currentSession.staff_account_id).toBe("staff_1");
  });

  it("revokes the current bearer-authenticated session", async () => {
    const db = new FakeDb((sql, args, method) => {
      if (sql.includes("FROM staff_sessions ss") && sql.includes("JOIN staff_accounts s")) {
        return {
          session_id: "session_2",
          staff_account_id: "staff_2",
          session_branch_id: "bukit-jelutong",
          role: "staff",
          status: "active",
          mfa_required: 0,
          mfa_verified_at: null
        };
      }

      if (sql.includes("UPDATE staff_sessions SET revoked_at = CURRENT_TIMESTAMP WHERE id = ?") && method === "run") {
        return { success: true };
      }

      return null;
    });

    const response = await onRequestPost(buildContext("/api/auth/sessions", {
      method: "POST",
      db,
      headers: {
        Authorization: "Bearer self-revoke-token",
        "Content-Type": "application/json"
      },
      body: {
        action: "revokeCurrent"
      }
    }));

    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.revokedSessionId).toBe("session_2");
    expect(db.calls.some((call) => call.type === "run" && call.sql.includes("UPDATE staff_sessions SET revoked_at = CURRENT_TIMESTAMP WHERE id = ?"))).toBe(true);
  });
});
