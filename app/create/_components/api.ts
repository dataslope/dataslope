/**
 * Client fetch helpers for the /api/custom endpoints, mirroring
 * app/_components/cloud/cloudApi.ts: every helper resolves with parsed
 * JSON or throws a `CustomApiError` carrying the HTTP status and the
 * server's user-facing message, so builders can render it directly.
 */

import type {
  CustomItemKind,
  CustomItemMeta,
  CustomItemPayload,
  CustomItemView,
  CustomSetMeta,
  CustomSetView,
} from "@/lib/custom-content/types";

export class CustomApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "CustomApiError";
    this.status = status;
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch {
    throw new CustomApiError(
      "Network error, check your connection and try again.",
      0,
    );
  }
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    // non-JSON error body; fall through to the generic message
  }
  if (!res.ok) {
    const message =
      body && typeof body === "object" && "error" in body
        ? String((body as { error: unknown }).error)
        : `Request failed (${res.status}).`;
    throw new CustomApiError(message, res.status);
  }
  return body as T;
}

function jsonInit(method: string, payload: unknown): RequestInit {
  return {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  };
}

// ---------------------------------------------------------------------------
// Items
// ---------------------------------------------------------------------------

export interface CreateItemResult {
  item: CustomItemMeta;
  url: string;
}

export function createItem(input: {
  kind: CustomItemKind;
  title: string;
  payload: CustomItemPayload;
}): Promise<CreateItemResult> {
  return request("/api/custom/items", jsonInit("POST", input));
}

export function updateItem(
  id: string,
  input: { title: string; payload: CustomItemPayload },
): Promise<{ ok: true }> {
  return request(
    `/api/custom/items/${encodeURIComponent(id)}`,
    jsonInit("PUT", input),
  );
}

export async function getItem(id: string): Promise<CustomItemView> {
  const res = await request<{ item: CustomItemView }>(
    `/api/custom/items/${encodeURIComponent(id)}`,
  );
  return res.item;
}

export function deleteItem(id: string): Promise<{ ok: true }> {
  return request(`/api/custom/items/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export async function listItems(): Promise<CustomItemMeta[]> {
  const res = await request<{ items: CustomItemMeta[] }>("/api/custom/items");
  return res.items;
}

// ---------------------------------------------------------------------------
// Sets
// ---------------------------------------------------------------------------

export interface CreateSetResult {
  set: CustomSetMeta;
  url: string;
}

export interface SetInput {
  title: string;
  description: string;
  itemIds: string[];
}

export function createSet(input: SetInput): Promise<CreateSetResult> {
  return request("/api/custom/sets", jsonInit("POST", input));
}

export function updateSet(id: string, input: SetInput): Promise<{ ok: true }> {
  return request(
    `/api/custom/sets/${encodeURIComponent(id)}`,
    jsonInit("PUT", input),
  );
}

export async function getSet(id: string): Promise<CustomSetView> {
  const res = await request<{ set: CustomSetView }>(
    `/api/custom/sets/${encodeURIComponent(id)}`,
  );
  return res.set;
}

export function deleteSet(id: string): Promise<{ ok: true }> {
  return request(`/api/custom/sets/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export async function listSets(): Promise<CustomSetMeta[]> {
  const res = await request<{ sets: CustomSetMeta[] }>("/api/custom/sets");
  return res.sets;
}
