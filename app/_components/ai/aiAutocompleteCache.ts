/**
 * In-memory cache for AI autocomplete responses.
 *
 * Cache keys incorporate AUTOCOMPLETE_SCHEMA_VERSION so that any change to
 * the JSON Schema definition automatically invalidates all existing entries —
 * no manual pruning required.
 */

import { AUTOCOMPLETE_SCHEMA_VERSION } from "./aiAutocompleteSchema";
import type { AutocompleteResponse } from "./aiAutocompleteSchema";

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  response: AutocompleteResponse;
  expiresAt: number;
}

/** Versioned in-memory store. Keyed by `${schemaVersion}:${promptKey}`. */
const cache = new Map<string, CacheEntry>();

function makeCacheKey(promptKey: string): string {
  return `${AUTOCOMPLETE_SCHEMA_VERSION}:${promptKey}`;
}

/** Return a cached response if one exists and has not expired, else null. */
export function getCachedResponse(
  promptKey: string,
): AutocompleteResponse | null {
  const key = makeCacheKey(promptKey);
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.response;
}

/** Store a response in the cache under the given prompt key. */
export function setCachedResponse(
  promptKey: string,
  response: AutocompleteResponse,
): void {
  const key = makeCacheKey(promptKey);
  cache.set(key, { response, expiresAt: Date.now() + CACHE_TTL_MS });
}

/** Remove expired entries to prevent unbounded memory growth. */
export function pruneCache(): void {
  const now = Date.now();
  for (const [key, entry] of cache) {
    if (now > entry.expiresAt) cache.delete(key);
  }
}
