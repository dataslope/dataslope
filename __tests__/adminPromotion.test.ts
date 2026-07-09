/**
 * Config-admin role promotion (lib/auth/adminBootstrap.ts): the conditional
 * D1 UPDATE that completes the ADMIN_EMAILS / ADMIN_USER_IDS bootstrap on
 * sign-in requests. D1 is mocked with a statement recorder, so assertions
 * cover the decision logic (when a statement runs at all) and the SQL/bind
 * shape, same no-network posture as polarBilling.test.ts.
 */
import { describe, it, expect } from "vitest";
import type { D1Database } from "@cloudflare/workers-types";
import { promoteConfiguredAdmins } from "../lib/auth/adminBootstrap";

interface RecordedStatement {
  sql: string;
  binds: unknown[];
}

function mockDb() {
  const statements: RecordedStatement[] = [];
  const db = {
    prepare(sql: string) {
      return {
        bind(...binds: unknown[]) {
          return {
            async run() {
              statements.push({ sql, binds });
              return { success: true };
            },
          };
        },
      };
    },
  } as unknown as D1Database;
  return { db, statements };
}

describe("promoteConfiguredAdmins", () => {
  it("does nothing when no admins are configured", async () => {
    const { db, statements } = mockDb();
    await promoteConfiguredAdmins(db, { adminUserIds: [], adminEmails: [] });
    expect(statements).toHaveLength(0);
  });

  it("promotes by email, matching case-insensitively", async () => {
    const { db, statements } = mockDb();
    await promoteConfiguredAdmins(db, {
      adminUserIds: [],
      adminEmails: ["Admin@Example.com"],
    });
    expect(statements).toHaveLength(1);
    const [stmt] = statements;
    expect(stmt.sql).toContain("SET role = 'admin'");
    expect(stmt.sql).toContain("lower(email) IN (?)");
    expect(stmt.binds).toEqual(["admin@example.com"]);
  });

  it("promotes by user id", async () => {
    const { db, statements } = mockDb();
    await promoteConfiguredAdmins(db, {
      adminUserIds: ["user-1", "user-2"],
      adminEmails: [],
    });
    expect(statements).toHaveLength(1);
    const [stmt] = statements;
    expect(stmt.sql).toContain("id IN (?, ?)");
    expect(stmt.binds).toEqual(["user-1", "user-2"]);
  });

  it("merges both config sources into one statement", async () => {
    const { db, statements } = mockDb();
    await promoteConfiguredAdmins(db, {
      adminUserIds: ["user-1"],
      adminEmails: ["a@example.com", "b@example.com"],
    });
    expect(statements).toHaveLength(1);
    const [stmt] = statements;
    expect(stmt.sql).toContain("id IN (?)");
    expect(stmt.sql).toContain("lower(email) IN (?, ?)");
    // Ids bind first, then emails, matching the matcher order in the SQL.
    expect(stmt.binds).toEqual(["user-1", "a@example.com", "b@example.com"]);
  });

  it("only targets rows that don't already hold the admin role", async () => {
    const { db, statements } = mockDb();
    await promoteConfiguredAdmins(db, {
      adminUserIds: [],
      adminEmails: ["a@example.com"],
    });
    const [stmt] = statements;
    // The role guard makes re-promotion a zero-row write, and nothing outside
    // the config lists can ever match.
    expect(stmt.sql).toMatch(/WHERE role <> 'admin' AND \(/);
  });
});
