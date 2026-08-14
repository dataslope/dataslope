/**
 * Shared types for playground cloud saves + sharing. The unit of persistence
 * is a **bundle**: a gzipped container (JSON header + raw database image, see
 * lib/workspaces/bundleCodec.ts). Bundle bytes live in R2; D1 keeps a
 * metadata row whose `manifest` column is a small display-only summary so
 * lists never download the payload. Everything here is isomorphic (no DOM,
 * no Workers APIs).
 */

export const BUNDLE_VERSION = 2;

/** Gzipped-bundle media type used for uploads and R2 `httpMetadata`. */
export const BUNDLE_CONTENT_TYPE = "application/gzip";

export type BundleKind = "code" | "sql";

export type SqlDialect = "sqlite" | "postgres" | "duckdb";

/** SQL playgrounds reopen from a binary database image; everything else
 *  ships files. */
export const SQL_PLAYGROUND_IDS: readonly SqlDialect[] = [
  "sqlite",
  "postgres",
  "duckdb",
];

/** Per-dialect format of the binary image in a SQL bundle. Named rather than
 *  inferred from the dialect so alternates can be added without a container
 *  change. */
export type SqlDbFormat = "sqlite-image" | "pgdata-tar" | "duckdb-image";

export const SQL_DB_FORMATS: Record<SqlDialect, SqlDbFormat> = {
  sqlite: "sqlite-image",
  postgres: "pgdata-tar",
  duckdb: "duckdb-image",
};

/** Code playgrounds (one per `app/playground/<id>` route). Literal list — the
 *  Worker cannot enumerate the route tree; kept in sync with the route
 *  directories by __tests__/workspacesCloud.test.ts. */
export const CODE_PLAYGROUND_IDS: readonly string[] = [
  "c",
  "cpp",
  "csharp",
  "java",
  "javascript",
  "php",
  "python",
  "r",
  "react",
  "typescript",
  "web",
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
  /** "view-data" for a table tab opened from the sidebar. Absent for ordinary
   *  query tabs and for bundles written before this field existed, so old and
   *  new clients round-trip each other's bundles without a version bump. */
  kind?: "view-data";
}

/** The playground-side tab fields this module needs to build `BundleSqlTab`.
 *  Structural on purpose: `lib/` is shared with the Worker and must not reach
 *  into the app's component tree for `QueryTab`. */
export interface BundleableSqlTab {
  id: string;
  title: string;
  code: string;
  kind?: string;
}

/**
 * The tabs a SQL bundle carries, plus where the active one lands. Query and
 * "view-data" tabs are saved work and travel; er-diagram and query-history
 * tabs are live views and are dropped, matching `saveTabs`. Inverse:
 * `bundleTabSeeds` in app/_components/cloud/materialize.ts.
 */
export function sqlTabsForBundle(
  tabs: readonly BundleableSqlTab[],
  activeTabId: string,
): { tabs: BundleSqlTab[]; activeTabIndex: number } {
  const carried = tabs.filter(
    (tab) => tab.kind === undefined || tab.kind === "view-data",
  );
  const activeIndex = carried.findIndex((tab) => tab.id === activeTabId);
  return {
    tabs: carried.map((tab) => ({
      title: tab.title,
      code: tab.code,
      ...(tab.kind === "view-data" ? { kind: "view-data" as const } : {}),
    })),
    // An active tab that isn't carried (the ER diagram, say) leaves the
    // reopened workspace on its first tab rather than nowhere.
    activeTabIndex: Math.max(0, activeIndex),
  };
}

/** One run from the query history pane. Mirrors `QueryHistoryEntry` in
 *  app/_components/sql/types.ts, restated here because `lib/` is shared with
 *  the Worker and cannot import from the component tree. */
export interface BundleQueryHistoryEntry {
  id: string;
  sql: string;
  source: string;
  executedAt: number;
  elapsedMs: number;
  success: boolean;
  error?: string;
}

/** One starred query. Mirrors `SavedQuery`. */
export interface BundleSavedQuery {
  id: string;
  sql: string;
  source: string;
  savedAt: number;
}

/**
 * Owner-only parts of a workspace: query history and starred queries. Never
 * present in a share bundle — the author's run log is not the recipient's to
 * receive. `buildBundle` omits this unless `includePersonal` is passed
 * (cloud-backup path only), and readers ignore it for anything from a share.
 */
export interface BundleSqlPersonal {
  history?: BundleQueryHistoryEntry[];
  saved?: BundleSavedQuery[];
}

/** Cap on personal-log entries carried in a bundle, per list. Matches the
 *  playgrounds' own localStorage caps. */
export const BUNDLE_MAX_LOG_ENTRIES = 200;

export interface BundleSqlState {
  dialect: SqlDialect;
  /** Format of the binary database image in the container's binary section. */
  dbFormat: SqlDbFormat;
  /** Byte length of the binary image. Redundant with the section length in
   *  the container, so decode can use it as an integrity check. */
  dbBytes: number;
  tabs: BundleSqlTab[];
  activeTabIndex?: number;
  /** Display label of the source database, e.g. "chinook.sqlite". */
  databaseLabel?: string;
  /** Owner-only; absent from share bundles. See `BundleSqlPersonal`. */
  personal?: BundleSqlPersonal;
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
  /** kind === "code": files whose editor tabs are open, in tab order (without
   *  this a reopened copy fans every file open). Filenames, not ids — ids are
   *  reallocated on materialize. Absent in older bundles, which keeps the old
   *  open-everything behavior. */
  openFilenames?: string[];
  /** kind === "sql" */
  sql?: BundleSqlState;
  /** kind === "sql": the raw database image. Never part of the JSON header;
   *  the codec appends it as the container's binary section and re-attaches
   *  it here on decode. */
  database?: Uint8Array;
}

/** Caps on a bundle's file/tab list. Legit workspaces are far below both;
 *  a hostile share could otherwise declare unbounded entries and wedge the
 *  recipient's browser storage when the copy is materialized. */
export const BUNDLE_MAX_FILES = 200;
export const BUNDLE_FILENAME_MAX = 512;

/** Structural validation of a decoded bundle header (the JSON document in
 *  the container; `database` is attached separately by the codec). Returns
 *  `null` rather than throwing so callers can surface one friendly message. */
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
    if (b.files.length > BUNDLE_MAX_FILES) return null;
    for (const f of b.files as unknown[]) {
      const file = f as Record<string, unknown>;
      if (
        !file ||
        typeof file.filename !== "string" ||
        !file.filename.trim() ||
        file.filename.length > BUNDLE_FILENAME_MAX ||
        typeof file.content !== "string"
      ) {
        return null;
      }
    }
    if (b.openFilenames !== undefined) {
      if (
        !Array.isArray(b.openFilenames) ||
        b.openFilenames.length > BUNDLE_MAX_FILES ||
        b.openFilenames.some((name) => typeof name !== "string")
      ) {
        return null;
      }
    }
    return value as WorkspaceBundle;
  }

  const sql = b.sql as Record<string, unknown> | undefined;
  if (!sql || typeof sql !== "object") return null;
  if (sql.dialect !== b.playground) return null;
  if (sql.dbFormat !== SQL_DB_FORMATS[sql.dialect as SqlDialect]) return null;
  if (
    typeof sql.dbBytes !== "number" ||
    !Number.isInteger(sql.dbBytes) ||
    sql.dbBytes < 0
  ) {
    return null;
  }
  if (!Array.isArray(sql.tabs) || sql.tabs.length > BUNDLE_MAX_FILES) {
    return null;
  }
  for (const t of sql.tabs as unknown[]) {
    const tab = t as Record<string, unknown>;
    if (!tab || typeof tab.title !== "string" || typeof tab.code !== "string") {
      return null;
    }
  }
  if (sql.personal !== undefined && !validPersonal(sql.personal)) return null;
  return value as WorkspaceBundle;
}

/** Shape + size check for the owner-only log. Client-supplied like the rest of
 *  the bundle, and unlike the tabs it is written straight back into the
 *  reader's own history, so it is checked rather than trusted. */
function validPersonal(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const personal = value as Record<string, unknown>;
  for (const [key, idField] of [
    ["history", "executedAt"],
    ["saved", "savedAt"],
  ] as const) {
    const list = personal[key];
    if (list === undefined) continue;
    if (!Array.isArray(list) || list.length > BUNDLE_MAX_LOG_ENTRIES) {
      return false;
    }
    for (const e of list as unknown[]) {
      const entry = e as Record<string, unknown>;
      if (
        !entry ||
        typeof entry.id !== "string" ||
        typeof entry.sql !== "string" ||
        typeof entry[idField] !== "number"
      ) {
        return false;
      }
    }
  }
  return true;
}

/** Options for a host's `buildBundle`. */
export interface BuildBundleOptions {
  /** Carry the owner's query history and starred queries. Set by the cloud
   *  backup path only: a share bundle must never include them. */
  includePersonal?: boolean;
}

/** Serializes the live playground into a portable bundle. */
export type BuildBundle = (
  opts?: BuildBundleOptions,
) => Promise<WorkspaceBundle | null>;

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

/** Serialized-manifest ceiling. Anything larger is rejected, the manifest is
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
