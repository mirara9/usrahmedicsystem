import { describe, expect, it } from "vitest";
import { requireBranchAccess } from "./access.js";

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
    this.db.calls.push({ sql: this.sql, args: this.args });
    return this.db.nextResult(this.sql, this.args);
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

  nextResult(sql, args) {
    return this.handler(sql, args);
  }
}

function buildContext(headers = {}) {
  return {
    request: new Request("https://example.com/api/patients?branchId=puncak-alam", {
      headers
    }),
    env: {
      AUDIT_HASH_PEPPER: "test-pepper"
    }
  };
}

describe("requireBranchAccess session-token auth", () => {
  it("authenticates an active bearer session and returns the assigned branch role", async () => {
    const db = new FakeDb((sql) => {
      if (sql.includes("FROM staff_sessions ss")) {
        return {
          staff_account_id: "staff_1",
          role: "staff",
          status: "active",
          session_branch_id: "puncak-alam",
          role_at_branch: "front_desk"
        };
      }

      if (sql.includes("FROM staff_accounts s")) {
        return {
          id: "staff_1",
          role: "staff",
          role_at_branch: "front_desk"
        };
      }

      return null;
    });

    const actor = await requireBranchAccess(
      buildContext({ Authorization: "Bearer valid-session-token" }),
      db,
      "puncak-alam",
      ["owner", "admin", "front_desk", "staff"]
    );

    expect(actor.id).toBe("staff_1");
    expect(actor.role).toBe("staff");
    expect(actor.branchRole).toBe("front_desk");
  });

  it("rejects a valid session token that is bound to a different branch", async () => {
    const db = new FakeDb((sql) => {
      if (sql.includes("FROM staff_sessions ss")) {
        return {
          staff_account_id: "staff_2",
          role: "staff",
          status: "active",
          session_branch_id: "seremban-2",
          role_at_branch: "front_desk"
        };
      }

      return null;
    });

    await expect(
      requireBranchAccess(
        buildContext({ Authorization: "Bearer branch-mismatch-token" }),
        db,
        "puncak-alam",
        ["owner", "admin", "front_desk", "staff"]
      )
    ).rejects.toMatchObject({
      status: 403,
      code: "BRANCH_SESSION_MISMATCH"
    });
  });

  it("rejects an invalid or expired session token instead of silently falling back", async () => {
    const db = new FakeDb(() => null);

    await expect(
      requireBranchAccess(
        buildContext({ Authorization: "Bearer expired-session-token" }),
        db,
        "puncak-alam",
        ["owner", "admin", "front_desk", "staff"]
      )
    ).rejects.toMatchObject({
      status: 401,
      code: "SESSION_INVALID"
    });
  });
});
