/**
 * Shared types for playground cloud saves + sharing.
 *
 * The unit of persistence is a **bundle**: a gzipped JSON document holding a
 * self-contained snapshot of a playground workspace. Code playgrounds carry
 * their files verbatim; SQL playgrounds carry a SQL dump (DDL + data) plus the
 * query tabs, and are rebuilt on open by replaying the dump through the
 * in-browser engine — the database binary itself is never uploaded (it is
 * derived state, and dumps compress far better than engine images).
 *
 * The bundle bytes live in R2; D1 keeps a metadata row whose `manifest` column
 * is a small display-only summary (file names / tab titles) so lists and the
 * share page never have to download or decompress the payload.
 *
 * Everything here is isomorphic (no DOM, no Workers APIs): the browser builds
 * and consumes bundles, the Worker validates metadata, and tests exercise the
 * validators directly.
 */

export const BUNDLE_VERSION = 1;

/** Gzipped-bundle media type used for uploads and R2 `httpMetadata`. */
export const BUNDLE_CONTENT_TYPE = "application/gzip";

export type BundleKind = "code" | "sql";

export type SqlDialect = "sqlite" | "postgres" | "duckdb";

/** SQL playgrounds rebuild from a dump; everything else ships files. */
export const SQL_PLAYGROUND_IDS: readonly SqlDialect[] = [
  "sqlite",
  "postgres",
  "duckdb",
];

/** Code playgrounds (one per `app/playground/<id>` route). Kept as a literal
 *  list — the Worker cannot enumerate the route tree at request time. */
export const CODE_PLAYGROUND_IDS: readonly string[] = [
  "c",
  "cpp",
  "csharp",
  "java",
  "javascript",
  "php",
  "python",
  "r",
  "typescript",
];

export function isKnownPlayground(id: string): boolean {
  return (
    (SQL_PLAYGROUND_IDS as readonly string[]).includes(id) ||
    CODE_PLAYGROUND_IDS.includes(id)
  );
}

export function isSqlPlayground(id: string): id is SqlDialect {
  return (SQL_PLAYGROUND_IDS as readonly string[]).includes(id);
}

export function bundleKindForPlayground(id: string): BundleKind {
  return isSqlPlayground(id) ? "sql" : "code";
}

// ---------------------------------------------------------------------------
// Bundle payload (the gzipped JSON document stored in R2)
// ---------------------------------------------------------------------------

export interface BundleCodeFile {
  /** User-visible path, e.g. "main.py" or "src/utils.py". */
  filename: string;
  content: string;
}

export interface BundleSqlTab {
  title: string;
  code: string;
}

export interface BundleSqlState {
  dialect: SqlDialect;
  /** Full SQL dump (DDL + data) of the active database. Replayed on open. */
  dump: string;
  tabs: BundleSqlTab[];
  activeTabIndex?: number;
  /** Display label of the source database, e.g. "chinook.sqlite". */
  databaseLabel?: string;
}

export interface WorkspaceBundle {
  version: typeof BUNDLE_VERSION;
  kind: BundleKind;
  playground: string;
  name: string;
  /** Unix ms at export time. Informational only. */
  exportedAt: number;
  /** kind === "code" */
  files?: BundleCodeFile[];
  activeFilename?: string;
  /** kind === "sql" */
  sql?: BundleSqlState;
}

/** Structural validation of a decompressed bundle document. Returns `null`
 *  rather than throwing so callers can surface one friendly message. */
export function validateBundle(value: unknown): WorkspaceBundle | null {
  if (!value || typeof value !== "object") return null;
  const b = value as Record<string, unknown>;
  if (b.version !== BUNDLE_VERSION) return null;
  if (typeof b.playground !== "string" || !isKnownPlayground(b.playground)) {
    return null;
  }
  if (typeof b.name !== "string") return null;
  const kind = b.kind;
  if (kind !== "code" && kind !== "sql") return null;
  if (kind !== bundleKindForPlayground(b.playground)) return null;

  if (kind === "code") {
    if (!Array.isArray(b.files) || b.files.length === 0) return null;
    for (const f of b.files as unknown[]) {
      const file = f as Record<string, unknown>;
      if (
        !file ||
        typeof file.filename !== "string" ||
        !file.filename.trim() ||
        typeof file.content !== "string"
      ) {
        return null;
      }
    }
    return value as WorkspaceBundle;
  }

  const sql = b.sql as Record<string, unknown> | undefined;
  if (!sql || typeof sql !== "object") return null;
  if (sql.dialect !== b.playground) return null;
  if (typeof sql.dump !== "string") return null;
  if (!Array.isArray(sql.tabs)) return null;
  for (const t of sql.tabs as unknown[]) {
    const tab = t as Record<string, unknown>;
    if (!tab || typeof tab.title !== "string" || typeof tab.code !== "string") {
      return null;
    }
  }
  return value as WorkspaceBundle;
}

// ---------------------------------------------------------------------------
// Manifest (display-only summary stored in D1 alongside the metadata row)
// ---------------------------------------------------------------------------

export interface BundleManifest {
  kind: BundleKind;
  /** kind === "code": file names + uncompressed sizes (bytes). */
  files?: { name: string; size: number }[];
  /** kind === "sql": query-tab titles. */
  tabs?: string[];
  /** kind === "sql": display label of the bundled database. */
  database?: string;
}

/** Serialized-manifest ceiling. Anything larger is rejected — the manifest is
 *  a UI summary, not a data channel. */
export const MANIFEST_MAX_BYTES = 16 * 1024;

const MANIFEST_NAME_MAX = 200;
const MANIFEST_MAX_ENTRIES = 200;

/** Builds a manifest from a bundle (client-side, at upload time). */
export function manifestForBundle(bundle: WorkspaceBundle): BundleManifest {
  if (bundle.kind === "code") {
    return {
      kind: "code",
      files: (bundle.files ?? []).slice(0, MANIFEST_MAX_ENTRIES).map((f) => ({
        name: f.filename.slice(0, MANIFEST_NAME_MAX),
        size: f.content.length,
      })),
    };
  }
  return {
    kind: "sql",
    tabs: (bundle.sql?.tabs ?? [])
      .slice(0, MANIFEST_MAX_ENTRIES)
      .map((t) => t.title.slice(0, MANIFEST_NAME_MAX)),
    database: bundle.sql?.databaseLabel?.slice(0, MANIFEST_NAME_MAX),
  };
}

/** Parses + sanitizes a manifest JSON string (defensive: the column is
 *  client-supplied). Returns `null` on any shape mismatch. */
export function parseManifest(raw: string): BundleManifest | null {
  if (raw.length > MANIFEST_MAX_BYTES) return null;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!value || typeof value !== "object") return null;
  const m = value as Record<string, unknown>;
  if (m.kind !== "code" && m.kind !== "sql") return null;
  const out: BundleManifest = { kind: m.kind };
  if (Array.isArray(m.files)) {
    out.files = [];
    for (const f of m.files.slice(0, MANIFEST_MAX_ENTRIES)) {
      const file = f as Record<string, unknown>;
      if (!file || typeof file.name !== "string") continue;
      out.files.push({
        name: file.name.slice(0, MANIFEST_NAME_MAX),
        size: typeof file.size === "number" && file.size >= 0 ? file.size : 0,
      });
    }
  }
  if (Array.isArray(m.tabs)) {
    out.tabs = m.tabs
      .slice(0, MANIFEST_MAX_ENTRIES)
      .filter((t): t is string => typeof t === "string")
      .map((t) => t.slice(0, MANIFEST_NAME_MAX));
  }
  if (typeof m.database === "string") {
    out.database = m.database.slice(0, MANIFEST_NAME_MAX);
  }
  return out;
}

// ---------------------------------------------------------------------------
// API response shapes (imported by the client)
// ---------------------------------------------------------------------------

export interface CloudWorkspaceMeta {
  id: string;
  name: string;
  playground: string;
  sizeBytes: number;
  manifest: BundleManifest | null;
  createdAt: string;
  updatedAt: string;
  lastUsedAt: string;
}

export interface CloudUsage {
  plan: "free" | "pro";
  bytesUsed: number;
  bytesLimit: number;
  workspaceCount: number;
  workspaceLimit: number;
  shareCount: number;
  shareLimit: number;
  maxItemBytes: number;
}

export interface CloudWorkspaceList {
  workspaces: CloudWorkspaceMeta[];
  usage: CloudUsage;
}

export interface ShareMeta {
  id: string;
  name: string;
  playground: string;
  sizeBytes: number;
  manifest: BundleManifest | null;
  createdAt: string;
  /** Set for guest shares (fixed TTL); null for member shares. */
  expiresAt: string | null;
}

export interface CreateShareResponse {
  share: ShareMeta;
  /** Absolute share URL, e.g. "https://dataslope.com/s/abc123…". */
  url: string;
}
