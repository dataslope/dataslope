// Pure-helper tests for playground cloud saves + sharing: the bundle/manifest
// validators (lib/workspaces/types.ts), the binary container codec
// (lib/workspaces/bundleCodec.ts) and the retention/quota policy
// (lib/workspaces/policy.ts). Route handlers stay thin wrappers over these,
// the same convention as adminPromotion.test.ts / polarBilling.test.ts.
import { readdirSync, existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  BundleCodecError,
  bundleContentHash,
  decodeBundle,
  encodeBundle,
} from "../lib/workspaces/bundleCodec";
import {
  BUNDLE_FILENAME_MAX,
  BUNDLE_MAX_DATA_FILES,
  BUNDLE_MAX_FILES,
  CODE_PLAYGROUND_IDS,
  SQL_PLAYGROUND_IDS,
  isKnownPlayground,
  isPersistablePlayground,
  EPHEMERAL_PLAYGROUND_IDS,
  manifestForBundle,
  parseManifest,
  sqlTabsForBundle,
  validateBundle,
  type WorkspaceBundle,
} from "../lib/workspaces/types";
import { base64ToBytes, bytesToBase64 } from "../lib/workspaces/base64";
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

// An uploaded CSV, with a non-ASCII byte so a lossy encode would show.
const CSV_BYTES = new TextEncoder().encode('city,pop\nParis,2.1\n"Qu\u00e9bec, city",3.5\n');

// A stand-in database image; the codec treats it as opaque bytes.
const DB_IMAGE = new Uint8Array([0x53, 0x51, 0x4c, 0x69, 0x74, 0x65, 0, 255]);

function codeBundle(overrides: Partial<WorkspaceBundle> = {}): WorkspaceBundle {
  return {
    version: 2,
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
    version: 2,
    kind: "sql",
    playground: "sqlite",
    name: "Chinook explorations",
    exportedAt: NOW,
    sql: {
      dialect: "sqlite",
      dbFormat: "sqlite-image",
      dbBytes: DB_IMAGE.byteLength,
      tabs: [{ title: "Query 1", code: "SELECT * FROM t;" }],
      activeTabIndex: 0,
      databaseLabel: "chinook.sqlite",
    },
    database: DB_IMAGE,
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
    const all = [
      ...CODE_PLAYGROUND_IDS,
      ...SQL_PLAYGROUND_IDS,
      ...EPHEMERAL_PLAYGROUND_IDS,
    ];
    expect(new Set(all).size).toBe(all.length);
  });

  it("keeps ephemeral playgrounds out of the save/share path", () => {
    for (const id of EPHEMERAL_PLAYGROUND_IDS) {
      expect(isKnownPlayground(id), `route exists for "${id}"`).toBe(true);
      expect(isPersistablePlayground(id), `"${id}" is not persistable`).toBe(false);
      expect(validateBundle(codeBundle({ playground: id }))).toBeNull();
    }
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
    expect(validateBundle({ ...codeBundle(), version: 1 })).toBeNull();
    expect(validateBundle(codeBundle({ playground: "cobol" }))).toBeNull();
  });

  it("rejects a kind that does not match the playground family", () => {
    // A sqlite bundle must be kind "sql", a python bundle kind "code".
    expect(validateBundle(codeBundle({ playground: "sqlite" }))).toBeNull();
    expect(
      validateBundle(sqlBundle({ playground: "python", kind: "code" })),
    ).toBeNull();
  });

  it("rejects code bundles without files and sql bundles without sql state", () => {
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

  it("rejects a db format that disagrees with the dialect", () => {
    const b = sqlBundle();
    b.sql = { ...b.sql!, dbFormat: "pgdata-tar" };
    expect(validateBundle(b)).toBeNull();
  });

  it("rejects malformed db byte lengths", () => {
    for (const dbBytes of [-1, 1.5, "8" as unknown as number]) {
      const b = sqlBundle();
      b.sql = { ...b.sql!, dbBytes };
      expect(validateBundle(b), `dbBytes ${String(dbBytes)}`).toBeNull();
    }
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

describe("bundle codec", () => {
  it("round-trips a sql bundle, database image included", async () => {
    const encoded = await encodeBundle(sqlBundle());
    // The wire format must look like gzip: the upload endpoint checks the
    // magic bytes before accepting the payload.
    const head = new Uint8Array((await encoded.arrayBuffer()).slice(0, 2));
    expect([head[0], head[1]]).toEqual([0x1f, 0x8b]);

    const decoded = await decodeBundle(encoded);
    expect(decoded.name).toBe("Chinook explorations");
    expect(decoded.sql?.tabs).toEqual([
      { title: "Query 1", code: "SELECT * FROM t;" },
    ]);
    expect(decoded.database).toEqual(DB_IMAGE);
  });

  it("round-trips a code bundle with no binary section", async () => {
    const decoded = await decodeBundle(await encodeBundle(codeBundle()));
    expect(decoded.files).toEqual([
      { filename: "main.py", content: "print('hi')" },
    ]);
    expect(decoded.database).toBeUndefined();
  });

  it("rejects non-gzip data, bad magic, and truncated images", async () => {
    await expect(
      decodeBundle(new Blob(["plain text, not gzip"])),
    ).rejects.toBeInstanceOf(BundleCodecError);

    // Valid gzip, but the container inside is not a bundle.
    const gzipped = await new Response(
      new Blob(["{}"]).stream().pipeThrough(new CompressionStream("gzip")),
    ).blob();
    await expect(decodeBundle(gzipped)).rejects.toBeInstanceOf(
      BundleCodecError,
    );

    // Declared image length disagrees with the binary section.
    const lying = sqlBundle();
    lying.sql = { ...lying.sql!, dbBytes: DB_IMAGE.byteLength + 1 };
    await expect(
      decodeBundle(await encodeBundle(lying)),
    ).rejects.toBeInstanceOf(BundleCodecError);
  });

  it("enforces the decompressed-size ceiling", async () => {
    const big = sqlBundle();
    await expect(
      decodeBundle(await encodeBundle(big), 16),
    ).rejects.toThrow("too large");
  });

  it("hashes content, not the save timestamp", async () => {
    const a = await bundleContentHash(sqlBundle());
    const b = await bundleContentHash(sqlBundle({ exportedAt: NOW + 60_000 }));
    expect(a).toBe(b);

    const changedDb = sqlBundle({ database: new Uint8Array([1, 2, 3]) });
    changedDb.sql = { ...changedDb.sql!, dbBytes: 3 };
    expect(await bundleContentHash(changedDb)).not.toBe(a);

    const changedTabs = sqlBundle();
    changedTabs.sql = {
      ...changedTabs.sql!,
      tabs: [{ title: "Query 1", code: "SELECT 2;" }],
    };
    expect(await bundleContentHash(changedTabs)).not.toBe(a);
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

// A SQL bundle is the only thing that crosses to another device, so whichever
// tabs it carries are the tabs a member finds there. Table tabs used to be
// filtered out with the transient kinds, which meant opening a cloud save on a
// second machine silently lost them.
describe("sqlTabsForBundle", () => {
  const tab = (id: string, kind?: string) => ({
    id,
    title: id,
    code: `SELECT * FROM ${id};`,
    kind,
  });

  it("carries query tabs and table tabs, in order", () => {
    const { tabs } = sqlTabsForBundle(
      [tab("a"), tab("orders", "view-data"), tab("b")],
      "a",
    );
    expect(tabs).toEqual([
      { title: "a", code: "SELECT * FROM a;" },
      {
        title: "orders",
        code: "SELECT * FROM orders;",
        kind: "view-data",
      },
      { title: "b", code: "SELECT * FROM b;" },
    ]);
  });

  it("drops the tabs that are views onto live session state", () => {
    const { tabs } = sqlTabsForBundle(
      [tab("a"), tab("er", "er-diagram"), tab("hist", "query-history")],
      "a",
    );
    expect(tabs.map((t) => t.title)).toEqual(["a"]);
  });

  it("points activeTabIndex at the active tab's place in the carried list", () => {
    const tabs = [tab("er", "er-diagram"), tab("a"), tab("orders", "view-data")];
    expect(sqlTabsForBundle(tabs, "orders").activeTabIndex).toBe(1);
    expect(sqlTabsForBundle(tabs, "a").activeTabIndex).toBe(0);
  });

  it("falls back to the first tab when the active one isn't carried", () => {
    const tabs = [tab("a"), tab("er", "er-diagram")];
    expect(sqlTabsForBundle(tabs, "er").activeTabIndex).toBe(0);
    expect(sqlTabsForBundle([], "gone").activeTabIndex).toBe(0);
  });
});

// The tab strip shows a subset of a workspace's files. Without the open list
// in the bundle, a copy opened on another device fanned every file back open.
describe("validateBundle, openFilenames", () => {
  const codeBundleWith = (openFilenames?: unknown): unknown => ({
    version: 2,
    kind: "code",
    playground: "python",
    name: "W",
    exportedAt: 1,
    files: [{ filename: "main.py", content: "" }],
    openFilenames,
  });

  it("accepts a bundle without one (written before the field existed)", () => {
    expect(validateBundle(codeBundleWith())).not.toBeNull();
  });

  it("accepts a list of filenames", () => {
    expect(validateBundle(codeBundleWith(["main.py"]))).not.toBeNull();
  });

  it("rejects a malformed or oversized list", () => {
    expect(validateBundle(codeBundleWith("main.py"))).toBeNull();
    expect(validateBundle(codeBundleWith([1, 2]))).toBeNull();
    expect(
      validateBundle(codeBundleWith(Array.from({ length: 201 }, () => "a.py"))),
    ).toBeNull();
  });
});

describe("validateBundle, dataFiles", () => {
  const withData = (dataFiles?: unknown): unknown => ({
    ...codeBundle(),
    dataFiles,
  });

  it("accepts a bundle without any (nothing uploaded, or an older bundle)", () => {
    expect(validateBundle(withData())).not.toBeNull();
  });

  it("accepts uploaded data files", () => {
    expect(
      validateBundle(withData([{ path: "sales.csv", base64: "YSxiCjEsMgo=" }])),
    ).not.toBeNull();
  });

  it("rejects a malformed or oversized list", () => {
    expect(validateBundle(withData("sales.csv"))).toBeNull();
    expect(validateBundle(withData([{ path: "sales.csv" }]))).toBeNull();
    expect(validateBundle(withData([{ path: "", base64: "" }]))).toBeNull();
    expect(
      validateBundle(
        withData(
          Array.from({ length: BUNDLE_MAX_DATA_FILES + 1 }, () => ({
            path: "a.csv",
            base64: "",
          })),
        ),
      ),
    ).toBeNull();
  });

  it("round-trips through the codec", async () => {
    const bundle = codeBundle({
      dataFiles: [{ path: "sales.csv", base64: bytesToBase64(CSV_BYTES) }],
    });
    const decoded = await decodeBundle(await encodeBundle(bundle));
    expect(decoded.dataFiles).toEqual(bundle.dataFiles);
    expect(base64ToBytes(decoded.dataFiles![0].base64)).toEqual(CSV_BYTES);
  });

  it("lists data files alongside code files in the manifest", () => {
    // The share landing page's file table is built from this, and it was
    // the one place a recipient could have noticed the CSV was missing.
    const manifest = manifestForBundle(
      codeBundle({
        dataFiles: [{ path: "sales.csv", base64: bytesToBase64(CSV_BYTES) }],
      }),
    );
    expect(manifest.files?.map((f) => f.name)).toEqual([
      "main.py",
      "sales.csv",
    ]);
    expect(manifest.files?.[1].size).toBe(CSV_BYTES.length);
  });
});

describe("base64 for bundle data files", () => {
  it("round-trips binary bytes, including a payload past the chunk size", () => {
    const big = new Uint8Array(400_000);
    for (let i = 0; i < big.length; i += 1) big[i] = i % 256;
    expect(base64ToBytes(bytesToBase64(big))).toEqual(big);
  });

  it("round-trips an empty file", () => {
    expect(bytesToBase64(new Uint8Array(0))).toBe("");
    expect(base64ToBytes("")).toEqual(new Uint8Array(0));
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
