"use client";

/**
 * Browser client for /api/workspaces and /api/shares. A workspace travels as
 * a gzipped bundle (lib/workspaces/bundleCodec.ts) uploaded as multipart form
 * data. Every helper throws `CloudApiError` with the HTTP status so dialogs
 * can branch on 401/403/429 without string-matching messages.
 */

import {
  BundleCodecError,
  bundleContentHash,
  decodeBundle,
  encodeBundle,
} from "@/lib/workspaces/bundleCodec";
import {
  manifestForBundle,
  type CloudWorkspaceList,
  type CloudWorkspaceMeta,
  type CreateShareResponse,
  type ShareMeta,
  type CloudUsage,
  type WorkspaceBundle,
} from "@/lib/workspaces/types";

export class CloudApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "CloudApiError";
    this.status = status;
  }
}

/** True when this browser can gzip/gunzip bundles (baseline everywhere the
 *  playgrounds themselves run; guards the buttons in ancient browsers). */
export function isCloudSupported(): boolean {
  return (
    typeof CompressionStream !== "undefined" &&
    typeof DecompressionStream !== "undefined"
  );
}

/** decodeBundle with codec failures rewritten to CloudApiError so callers
 *  keep one error type for the whole download path. */
async function decodeBundleOrThrow(data: Blob): Promise<WorkspaceBundle> {
  try {
    return await decodeBundle(data);
  } catch (err) {
    throw new CloudApiError(
      err instanceof BundleCodecError
        ? err.message
        : "This bundle is corrupted.",
      0,
    );
  }
}

/** fetch() with network-level failures rewritten to friendly CloudApiError
 *  copy; HTTP-level errors stay per call site via throwResponseError. */
async function apiFetch(
  input: string,
  init?: RequestInit,
): Promise<Response> {
  try {
    return await fetch(input, init);
  } catch {
    throw new CloudApiError(
      "Couldn't reach the cloud. Check your connection and try again.",
      0,
    );
  }
}

async function throwResponseError(res: Response): Promise<never> {
  let message = `Request failed (${res.status}).`;
  try {
    const body = (await res.json()) as { error?: string };
    if (body?.error) message = body.error;
  } catch {
    /* non-JSON error body, keep the generic message */
  }
  throw new CloudApiError(message, res.status);
}

function bundleForm(bundleBlob: Blob, bundle: WorkspaceBundle): FormData {
  const form = new FormData();
  form.set(
    "meta",
    JSON.stringify({
      name: bundle.name,
      playground: bundle.playground,
      manifest: manifestForBundle(bundle),
    }),
  );
  form.set("bundle", bundleBlob, "workspace.bundle.gz");
  return form;
}

// ---------------------------------------------------------------------------
// Cloud saves (account required)
// ---------------------------------------------------------------------------

export async function listCloudWorkspaces(): Promise<CloudWorkspaceList> {
  const res = await apiFetch("/api/workspaces");
  if (!res.ok) return throwResponseError(res);
  return (await res.json()) as CloudWorkspaceList;
}

/** Last successful upload per workspace, keyed by content hash, so an
 *  unchanged save skips the re-upload. Session-scoped: a stale entry can only
 *  skip re-sending bytes this tab already sent — same last-writer-wins
 *  outcome as uploading again. */
const lastUploads = new Map<string, { hash: string; meta: CloudWorkspaceMeta }>();

export async function saveCloudWorkspace(
  workspaceId: string,
  bundle: WorkspaceBundle,
): Promise<CloudWorkspaceMeta> {
  const hash = await bundleContentHash(bundle);
  const prev = lastUploads.get(workspaceId);
  if (prev && prev.hash === hash) return prev.meta;
  const blob = await encodeBundle(bundle);
  const res = await apiFetch(`/api/workspaces/${encodeURIComponent(workspaceId)}`, {
    method: "PUT",
    body: bundleForm(blob, bundle),
  });
  if (!res.ok) return throwResponseError(res);
  const body = (await res.json()) as { workspace: CloudWorkspaceMeta };
  lastUploads.set(workspaceId, { hash, meta: body.workspace });
  return body.workspace;
}

export async function fetchCloudWorkspaceBundle(
  workspaceId: string,
): Promise<WorkspaceBundle> {
  const res = await apiFetch(
    `/api/workspaces/${encodeURIComponent(workspaceId)}/bundle`,
  );
  if (!res.ok) return throwResponseError(res);
  return decodeBundleOrThrow(await res.blob());
}

export async function deleteCloudWorkspace(workspaceId: string): Promise<void> {
  const res = await apiFetch(`/api/workspaces/${encodeURIComponent(workspaceId)}`, {
    method: "DELETE",
  });
  if (!res.ok) return throwResponseError(res);
  // The backup is gone; the next save must upload even if unchanged.
  lastUploads.delete(workspaceId);
}

// ---------------------------------------------------------------------------
// Shares (guests welcome)
// ---------------------------------------------------------------------------

export async function createShare(
  bundle: WorkspaceBundle,
): Promise<CreateShareResponse> {
  const blob = await encodeBundle(bundle);
  const res = await apiFetch("/api/shares", {
    method: "POST",
    body: bundleForm(blob, bundle),
  });
  if (!res.ok) return throwResponseError(res);
  return (await res.json()) as CreateShareResponse;
}

export async function listShares(): Promise<{
  shares: ShareMeta[];
  usage: CloudUsage;
}> {
  const res = await apiFetch("/api/shares");
  if (!res.ok) return throwResponseError(res);
  return (await res.json()) as { shares: ShareMeta[]; usage: CloudUsage };
}

export async function fetchShareBundle(
  shareId: string,
): Promise<WorkspaceBundle> {
  const res = await apiFetch(
    `/api/shares/${encodeURIComponent(shareId)}/bundle`,
  );
  if (!res.ok) return throwResponseError(res);
  return decodeBundleOrThrow(await res.blob());
}

export async function revokeShare(shareId: string): Promise<void> {
  const res = await apiFetch(`/api/shares/${encodeURIComponent(shareId)}`, {
    method: "DELETE",
  });
  if (!res.ok) return throwResponseError(res);
}
