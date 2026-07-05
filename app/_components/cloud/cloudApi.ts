"use client";

/**
 * Browser client for the cloud-save + share endpoints (/api/workspaces,
 * /api/shares). A workspace travels as a **bundle**: the JSON document
 * defined in lib/workspaces/types.ts, gzipped with CompressionStream and
 * uploaded as multipart form data next to a small `meta` JSON field.
 *
 * Every helper throws `CloudApiError` (with the HTTP status) on failure so
 * dialogs can branch on 401 (sign-in CTA) / 403 (quota) / 429 (guest limit)
 * without string-matching messages.
 */

import {
  manifestForBundle,
  validateBundle,
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

export async function gzipBundle(bundle: WorkspaceBundle): Promise<Blob> {
  const bytes = new TextEncoder().encode(JSON.stringify(bundle));
  const stream = new Blob([bytes])
    .stream()
    .pipeThrough(new CompressionStream("gzip"));
  return new Response(stream).blob();
}

/** Upper bound on a bundle's decompressed size. Real bundles are JSON that
 *  compresses a few-to-20×, so this is far above anything legitimate; the
 *  server only validates the *compressed* size, and a hostile share could
 *  otherwise expand a few MB of gzip into multiple GB in the recipient's tab. */
const MAX_DECOMPRESSED_BYTES = 200 * 1024 * 1024;

export async function gunzipBundle(
  data: Blob,
  maxBytes: number = MAX_DECOMPRESSED_BYTES,
): Promise<WorkspaceBundle> {
  const reader = data
    .stream()
    .pipeThrough(new DecompressionStream("gzip"))
    .getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        void reader.cancel().catch(() => {});
        throw new CloudApiError("This bundle is too large to open.", 0);
      }
      chunks.push(value);
    }
  } catch (err) {
    if (err instanceof CloudApiError) throw err;
    throw new CloudApiError("This bundle is corrupted.", 0);
  }
  let doc: unknown;
  try {
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    doc = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new CloudApiError("This bundle is corrupted.", 0);
  }
  const bundle = validateBundle(doc);
  if (!bundle) throw new CloudApiError("This bundle is not supported.", 0);
  return bundle;
}

/** fetch() that rewrites network-level failures (the browser's raw
 *  "Failed to fetch" / "Load failed") into friendly CloudApiError copy.
 *  HTTP-level errors are still handled per call site via throwResponseError. */
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
    /* non-JSON error body — keep the generic message */
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

export async function saveCloudWorkspace(
  workspaceId: string,
  bundle: WorkspaceBundle,
): Promise<CloudWorkspaceMeta> {
  const blob = await gzipBundle(bundle);
  const res = await apiFetch(`/api/workspaces/${encodeURIComponent(workspaceId)}`, {
    method: "PUT",
    body: bundleForm(blob, bundle),
  });
  if (!res.ok) return throwResponseError(res);
  const body = (await res.json()) as { workspace: CloudWorkspaceMeta };
  return body.workspace;
}

export async function fetchCloudWorkspaceBundle(
  workspaceId: string,
): Promise<WorkspaceBundle> {
  const res = await apiFetch(
    `/api/workspaces/${encodeURIComponent(workspaceId)}/bundle`,
  );
  if (!res.ok) return throwResponseError(res);
  return gunzipBundle(await res.blob());
}

export async function deleteCloudWorkspace(workspaceId: string): Promise<void> {
  const res = await apiFetch(`/api/workspaces/${encodeURIComponent(workspaceId)}`, {
    method: "DELETE",
  });
  if (!res.ok) return throwResponseError(res);
}

// ---------------------------------------------------------------------------
// Shares (guests welcome)
// ---------------------------------------------------------------------------

export async function createShare(
  bundle: WorkspaceBundle,
): Promise<CreateShareResponse> {
  const blob = await gzipBundle(bundle);
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
  return gunzipBundle(await res.blob());
}

export async function revokeShare(shareId: string): Promise<void> {
  const res = await apiFetch(`/api/shares/${encodeURIComponent(shareId)}`, {
    method: "DELETE",
  });
  if (!res.ok) return throwResponseError(res);
}
