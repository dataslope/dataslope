/**
 * Server-side plumbing shared by the /api/workspaces and /api/shares route
 * handlers: session-independent upload parsing, same-origin enforcement for
 * cookie-authenticated mutations, and the "live state" read that evaluates
 * read-time retention (lazily purging whatever it finds expired).
 *
 * Import this ONLY from route handlers / server components, it touches D1,
 * R2 and Workers types. Client code imports lib/workspaces/types + policy.
 */

import type { R2Bucket } from "@cloudflare/workers-types";
import type { MemberTier } from "@/lib/ai/types";
import {
  MANIFEST_MAX_BYTES,
  isKnownPlayground,
  parseManifest,
  type BundleManifest,
  type CloudUsage,
  type CloudWorkspaceMeta,
  type ShareMeta,
} from "./types";
import { resolveTier } from "@/lib/ai/tier";
import { isExpired, limitsForTier, normalizeName } from "./policy";
import {
  deleteShares,
  deleteWorkspaces,
  getShareRowWithOwner,
  listShareRows,
  listWorkspaceRows,
  partitionExpired,
  type ShareRow,
  type ShareRowWithOwner,
  type WorkspaceRow,
} from "./store";

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** The workspaces R2 bucket, or null when the deployment hasn't created it
 *  yet (routes answer 503 so the UI can say "not configured"). */
export function workspacesBucket(env: CloudflareEnv): R2Bucket | null {
  return env.WORKSPACES_BUCKET ?? null;
}

/**
 * Same-origin check for cookie-authenticated mutations (POST/PUT/DELETE).
 * Browsers attach the Origin header to every cross-site POST, including
 * plain multipart form submissions, which need no CORS preflight, so a
 * mismatch means a cross-site request riding the user's cookies. A missing
 * Origin (curl, server-to-server) is allowed: those clients don't carry
 * ambient credentials.
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("Origin");
  if (!origin) {
    // No Origin (curl, server-to-server): consult Sec-Fetch-Site when the
    // client sent one, so a browser request whose Origin was stripped by a
    // proxy still can't ride the user's cookies cross-site.
    const fetchSite = request.headers.get("Sec-Fetch-Site");
    return !fetchSite || fetchSite === "same-origin" || fetchSite === "none";
  }
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Upload parsing
// ---------------------------------------------------------------------------

export interface BundleUpload {
  name: string;
  playground: string;
  /** Sanitized manifest, ready to store as the D1 `manifest` column. */
  manifestJson: string;
  manifest: BundleManifest;
  /** The gzipped bundle payload, verified to look like gzip. */
  bytes: ArrayBuffer;
}

export type UploadResult =
  | { ok: true; upload: BundleUpload }
  | { ok: false; status: number; message: string };

const META_MAX_BYTES = 40 * 1024;

/**
 * Parses a bundle upload: multipart/form-data with a `meta` JSON field
 * ({ name, playground, manifest }) and a `bundle` file field (gzipped JSON,
 * see lib/workspaces/types.ts). `maxBytes` is the caller's per-item cap for
 * the requesting tier.
 */
export async function readBundleUpload(
  request: Request,
  maxBytes: number,
): Promise<UploadResult> {
  // Cheap pre-check before buffering (multipart framing adds overhead, hence
  // the slack). Missing Content-Length is rejected: browsers always send one
  // for FormData, and chunked uploads would otherwise buffer unbounded bytes.
  const contentLength = Number(request.headers.get("Content-Length") ?? "0");
  if (!Number.isFinite(contentLength) || contentLength <= 0) {
    return { ok: false, status: 411, message: "Malformed upload." };
  }
  if (contentLength > maxBytes + META_MAX_BYTES + 64 * 1024) {
    return tooLarge(maxBytes);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return { ok: false, status: 400, message: "Malformed upload." };
  }

  const metaRaw = form.get("meta");
  if (typeof metaRaw !== "string" || metaRaw.length > META_MAX_BYTES) {
    return { ok: false, status: 400, message: "Malformed upload." };
  }
  let meta: { name?: unknown; playground?: unknown; manifest?: unknown };
  try {
    meta = JSON.parse(metaRaw) as typeof meta;
  } catch {
    return { ok: false, status: 400, message: "Malformed upload." };
  }

  const playground =
    typeof meta.playground === "string" ? meta.playground : "";
  if (!isKnownPlayground(playground)) {
    return { ok: false, status: 400, message: "Unknown playground." };
  }
  const name = normalizeName(meta.name, "Untitled workspace");

  const manifest = meta.manifest
    ? parseManifest(JSON.stringify(meta.manifest))
    : null;
  if (!manifest) {
    return { ok: false, status: 400, message: "Malformed upload." };
  }
  const manifestJson = JSON.stringify(manifest);
  if (manifestJson.length > MANIFEST_MAX_BYTES) {
    return { ok: false, status: 400, message: "Malformed upload." };
  }

  const file = form.get("bundle");
  if (!(file instanceof Blob)) {
    return { ok: false, status: 400, message: "Malformed upload." };
  }
  if (file.size > maxBytes) return tooLarge(maxBytes);
  const bytes = await file.arrayBuffer();
  if (bytes.byteLength > maxBytes) return tooLarge(maxBytes);
  const head = new Uint8Array(bytes.slice(0, 2));
  // gzip magic, the payload must be the gzipped JSON document, not raw JSON.
  if (bytes.byteLength < 18 || head[0] !== 0x1f || head[1] !== 0x8b) {
    return { ok: false, status: 400, message: "Malformed upload." };
  }

  return {
    ok: true,
    upload: { name, playground, manifestJson, manifest, bytes },
  };
}

function tooLarge(maxBytes: number): UploadResult {
  const mb = Math.floor(maxBytes / (1024 * 1024));
  return {
    ok: false,
    status: 413,
    message: `This workspace is too large to upload (limit ${mb} MB compressed).`,
  };
}

// ---------------------------------------------------------------------------
// Live state (read-time retention + lazy purge)
// ---------------------------------------------------------------------------

export interface LiveUserState {
  workspaces: WorkspaceRow[];
  shares: ShareRow[];
  usage: CloudUsage;
}

/**
 * Loads a member's cloud saves + shares, drops whatever the retention rule
 * says is expired (purging those rows/objects in the background), and totals
 * usage over the surviving rows. Both list endpoints and the quota checks in
 * the mutation endpoints go through this, so an expired row can never be
 * listed, downloaded, or counted against the quota.
 */
export async function loadLiveUserState(
  env: CloudflareEnv,
  bucket: R2Bucket,
  userId: string,
  tier: MemberTier,
  nowMs: number,
  waitUntil?: (p: Promise<unknown>) => void,
  opts?: {
    /** Workspace id the caller is about to overwrite. Excluded from the lazy
     *  purge: the background delete races the caller's R2 put on the SAME
     *  key, so purging it could silently destroy the fresh save. */
    skipPurgeOfWorkspaceId?: string;
  },
): Promise<LiveUserState> {
  const [workspaceRows, shareRows] = await Promise.all([
    listWorkspaceRows(env, userId),
    listShareRows(env, userId),
  ]);

  const ws = partitionExpired(
    workspaceRows,
    tier,
    (r) => r.last_used_at,
    () => null,
    nowMs,
  );
  const sh = partitionExpired(
    shareRows,
    tier,
    (r) => r.last_viewed_at,
    (r) => r.expires_at,
    nowMs,
  );

  const purgeable = opts?.skipPurgeOfWorkspaceId
    ? ws.expired.filter((r) => r.id !== opts.skipPurgeOfWorkspaceId)
    : ws.expired;
  if (purgeable.length > 0 || sh.expired.length > 0) {
    const purge = Promise.all([
      deleteWorkspaces(env, bucket, userId, purgeable),
      deleteShares(env, bucket, sh.expired),
    ]).catch((err) => console.error("workspaces: lazy purge failed", err));
    if (waitUntil) waitUntil(purge);
  }

  const limits = limitsForTier(tier);
  const bytesUsed =
    ws.live.reduce((sum, r) => sum + r.size_bytes, 0) +
    sh.live.reduce((sum, r) => sum + r.size_bytes, 0);

  return {
    workspaces: ws.live,
    shares: sh.live,
    usage: {
      plan: tier,
      bytesUsed,
      bytesLimit: limits.totalBytes,
      workspaceCount: ws.live.length,
      workspaceLimit: limits.maxWorkspaces,
      shareCount: sh.live.length,
      shareLimit: limits.maxShares,
      maxItemBytes: limits.maxItemBytes,
    },
  };
}

/**
 * Resolves a public share by slug, enforcing read-time retention: expired
 * shares 404 (and are purged in the background) no matter how the sweep is
 * behind. Returns the joined row so callers can render owner-independent
 * metadata without a second query.
 */
export async function loadLiveShare(
  env: CloudflareEnv,
  bucket: R2Bucket,
  shareId: string,
  nowMs: number,
  waitUntil?: (p: Promise<unknown>) => void,
): Promise<ShareRowWithOwner | null> {
  const row = await getShareRowWithOwner(env, shareId);
  if (!row) return null;
  const tier: MemberTier = row.user_id
    ? resolveTier(
        { email: row.owner_email, role: row.owner_role, plan: row.owner_plan },
        env,
      )
    : "free";
  if (
    isExpired({
      tier,
      lastActiveAt: row.last_viewed_at,
      expiresAt: row.expires_at,
      nowMs,
    })
  ) {
    const purge = deleteShares(env, bucket, [row]).catch((err) =>
      console.error("shares: purge failed", err),
    );
    if (waitUntil) waitUntil(purge);
    return null;
  }
  return row;
}

// ---------------------------------------------------------------------------
// Row → API shape mapping
// ---------------------------------------------------------------------------

export function workspaceRowToMeta(row: WorkspaceRow): CloudWorkspaceMeta {
  return {
    id: row.id,
    name: row.name,
    playground: row.playground,
    sizeBytes: row.size_bytes,
    manifest: parseManifest(row.manifest),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastUsedAt: row.last_used_at,
  };
}

export function shareRowToMeta(row: ShareRow): ShareMeta {
  return {
    id: row.id,
    name: row.name,
    playground: row.playground,
    sizeBytes: row.size_bytes,
    manifest: parseManifest(row.manifest),
    createdAt: row.created_at,
    expiresAt: row.expires_at ?? null,
  };
}
