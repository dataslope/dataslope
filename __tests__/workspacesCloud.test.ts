// Pure-helper tests for playground cloud saves + sharing: the bundle/manifest
// validators (lib/workspaces/types.ts) and the retention/quota policy
// (lib/workspaces/policy.ts). Route handlers stay thin wrappers over these —
// the same convention as adminPromotion.test.ts / polarBilling.test.ts.
import { readdirSync, existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  BUNDLE_FILENAME_MAX,
  BUNDLE_MAX_FILES,
  CODE_PLAYGROUND_IDS,
  SQL_PLAYGROUND_IDS,
  isKnownPlayground,
  manifestForBundle,
  parseManifest,
  validateBundle,
  type WorkspaceBundle,
} from "../lib/workspaces/types";
import {
  GUEST_SHARE_TTL_DAYS,
  INACTIVITY_EXPIRY_DAYS,
  guestShareExpiryIso,
  isExpired,
  isValidShareId,
  isValidWorkspaceId,
  limitsForTier,
  newShareId,
  normalizeName,
} from "../lib/workspaces/policy";

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 6, 2, 12, 0, 0);

function codeBundle(overrides: Partial<WorkspaceBundle> = {}): WorkspaceBundle {
  return {
    version: 1,
    kind: "code",
    playground: "python",
    name: "My workspace",
    exportedAt: NOW,
    files: [{ filename: "main.py", content: "print('hi')" }],
    activeFilename: "main.py",
    ...overrides,
  };
}

function sqlBundle(overrides: Partial<WorkspaceBundle> = {}): WorkspaceBundle {
  return {
    version: 1,
    kind: "sql",
    playground: "sqlite",
    name: "Chinook explorations",
    exportedAt: NOW,
    sql: {
      dialect: "sqlite",
      dump: "CREATE TABLE t(a); INSERT INTO t VALUES (1);",
      tabs: [{ title: "Query 1", code: "SELECT * FROM t;" }],
      activeTabIndex: 0,
      databaseLabel: "chinook.sqlite",
    },
    ...overrides,
  };
}

describe("known playgrounds", () => {
  // CODE_PLAYGROUND_IDS + SQL_PLAYGROUND_IDS must cover every playground
  // route: the save/share endpoints reject anything else with "Unknown
  // playground", so a route missing from the lists ships with broken
  // sharing (this is exactly how the web playground regressed).
  it("covers every app/playground/<id> route", () => {
    const dir = path.join(process.cwd(), "app", "playground");
    const routeIds = readdirSync(dir, { withFileTypes: true })
      .filter(
        (entry) =>
          entry.isDirectory() &&
          existsSync(path.join(dir, entry.name, "page.tsx")),
      )
      .map((entry) => entry.name)
      .sort();
    expect(routeIds.length).toBeGreaterThan(0);
    for (const id of routeIds) {
      expect(isKnownPlayground(id), `playground "${id}"`).toBe(true);
    }
  });

  it("lists no playground twice or in both families", () => {
    const all = [...CODE_PLAYGROUND_IDS, ...SQL_PLAYGROUND_IDS];
    expect(new Set(all).size).toBe(all.length);
  });
});

describe("validateBundle", () => {
  it("accepts a well-formed code bundle", () => {
    expect(validateBundle(codeBundle())).not.toBeNull();
  });

  it("accepts a well-formed sql bundle", () => {
    expect(validateBundle(sqlBundle())).not.toBeNull();
  });

  it("rejects unknown versions and playgrounds", () => {
    expect(validateBundle({ ...codeBundle(), version: 2 })).toBeNull();
    expect(validateBundle(codeBundle({ playground: "cobol" }))).toBeNull();
  });

  it("rejects a kind that does not match the playground family", () => {
    // A sqlite bundle must be kind "sql", a python bundle kind "code".
    expect(validateBundle(codeBundle({ playground: "sqlite" }))).toBeNull();
    expect(
      validateBundle(sqlBundle({ playground: "python", kind: "code" })),
    ).toBeNull();
  });

  it("rejects code bundles without files and sql bundles without a dump", () => {
    expect(validateBundle(codeBundle({ files: [] }))).toBeNull();
    const bad = sqlBundle();
    delete (bad as unknown as Record<string, unknown>).sql;
    expect(validateBundle(bad)).toBeNull();
  });

  it("rejects a sql dialect that disagrees with the playground", () => {
    const b = sqlBundle();
    b.sql = { ...b.sql!, dialect: "duckdb" };
    expect(validateBundle(b)).toBeNull();
  });

  it("rejects bundles with excessive file counts or filename lengths", () => {
    const manyFiles = Array.from({ length: BUNDLE_MAX_FILES + 1 }, (_, i) => ({
      filename: `f${i}.py`,
      content: "x",
    }));
    expect(validateBundle(codeBundle({ files: manyFiles }))).toBeNull();
    expect(
      validateBundle(
        codeBundle({
          files: [{ filename: "a".repeat(BUNDLE_FILENAME_MAX + 1), content: "x" }],
        }),
      ),
    ).toBeNull();
    // At the cap is still fine.
    expect(
      validateBundle(
        codeBundle({
          files: [{ filename: "a".repeat(BUNDLE_FILENAME_MAX), content: "x" }],
        }),
      ),
    ).not.toBeNull();
  });
});

describe("manifests", () => {
  it("summarizes code bundles as file names + sizes", () => {
    const manifest = manifestForBundle(codeBundle());
    expect(manifest).toEqual({
      kind: "code",
      files: [{ name: "main.py", size: "print('hi')".length }],
    });
  });

  it("summarizes sql bundles as tab titles + database label", () => {
    const manifest = manifestForBundle(sqlBundle());
    expect(manifest.kind).toBe("sql");
    expect(manifest.tabs).toEqual(["Query 1"]);
    expect(manifest.database).toBe("chinook.sqlite");
  });

  it("round-trips through parseManifest and drops junk", () => {
    const roundTripped = parseManifest(
      JSON.stringify(manifestForBundle(codeBundle())),
    );
    expect(roundTripped?.files?.[0]?.name).toBe("main.py");

    expect(parseManifest("not json")).toBeNull();
    expect(parseManifest(JSON.stringify({ kind: "nope" }))).toBeNull();
    // Non-string entries are filtered, sizes clamped to >= 0.
    const sanitized = parseManifest(
      JSON.stringify({
        kind: "code",
        files: [{ name: "a.py", size: -5 }, { size: 1 }, "junk"],
        tabs: ["ok", 42],
      }),
    );
    expect(sanitized?.files).toEqual([{ name: "a.py", size: 0 }]);
    expect(sanitized?.tabs).toEqual(["ok"]);
  });
});

describe("retention policy (isExpired)", () => {
  const iso = (daysAgo: number) => new Date(NOW - daysAgo * DAY_MS).toISOString();

  it("expires free rows after the inactivity window, keeps active ones", () => {
    expect(
      isExpired({
        tier: "free",
        lastActiveAt: iso(INACTIVITY_EXPIRY_DAYS + 1),
        nowMs: NOW,
      }),
    ).toBe(true);
    expect(
      isExpired({
        tier: "free",
        lastActiveAt: iso(INACTIVITY_EXPIRY_DAYS - 1),
        nowMs: NOW,
      }),
    ).toBe(false);
  });

  it("never expires pro rows on inactivity", () => {
    expect(
      isExpired({ tier: "pro", lastActiveAt: iso(365), nowMs: NOW }),
    ).toBe(false);
  });

  it("honors a fixed expiresAt regardless of tier (guest shares)", () => {
    const past = new Date(NOW - 1000).toISOString();
    expect(
      isExpired({ tier: "pro", lastActiveAt: iso(0), expiresAt: past, nowMs: NOW }),
    ).toBe(true);
  });

  it("mints guest expiry GUEST_SHARE_TTL_DAYS out", () => {
    expect(guestShareExpiryIso(NOW)).toBe(
      new Date(NOW + GUEST_SHARE_TTL_DAYS * DAY_MS).toISOString(),
    );
  });
});

describe("ids, names and limits", () => {
  it("accepts the client workspace-id format and rejects others", () => {
    expect(isValidWorkspaceId("ws_abc123_x9k2p")).toBe(true);
    expect(isValidWorkspaceId("ws_" + "a".repeat(64))).toBe(true);
    expect(isValidWorkspaceId("workspace-1")).toBe(false);
    expect(isValidWorkspaceId("ws_a")).toBe(false);
    expect(isValidWorkspaceId("ws_../etc")).toBe(false);
  });

  it("generates share ids in the expected format, distinct across calls", () => {
    const a = newShareId();
    const b = newShareId();
    expect(isValidShareId(a)).toBe(true);
    expect(isValidShareId(b)).toBe(true);
    expect(a).not.toBe(b);
    expect(isValidShareId("short")).toBe(false);
    expect(isValidShareId("UPPERCASE1234567")).toBe(false);
  });

  it("normalizes names and enforces the length cap", () => {
    expect(normalizeName("  hi  ", "fallback")).toBe("hi");
    expect(normalizeName("", "fallback")).toBe("fallback");
    expect(normalizeName(42, "fallback")).toBe("fallback");
    expect(normalizeName("x".repeat(500), "fallback")).toHaveLength(120);
  });

  it("pro raises every limit over free", () => {
    const free = limitsForTier("free");
    const pro = limitsForTier("pro");
    expect(pro.totalBytes).toBeGreaterThan(free.totalBytes);
    expect(pro.maxItemBytes).toBeGreaterThan(free.maxItemBytes);
    expect(pro.maxWorkspaces).toBeGreaterThan(free.maxWorkspaces);
    expect(pro.maxShares).toBeGreaterThan(free.maxShares);
  });
});
