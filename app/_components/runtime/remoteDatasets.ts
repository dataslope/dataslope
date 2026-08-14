// Remote sample datasets from the dataslope/datasets GitHub repo, cached so
// everything that references a file shares ONE download. Three per-URL
// layers:
//   1. In-flight memo (per JS context; workers each get their own).
//   2. Cache API: persistent, shared across the origin's threads/workers.
//      Best-effort — failures degrade to a plain network fetch.
//   3. Network: cdn.jsdelivr.net first (CORS *, one-year immutable cache
//      for ref-pinned URLs, ~20 MB per-file limit), falling back to
//      raw.githubusercontent.com (CORS-enabled, no size limit below
//      GitHub's 100 MB cap, but only ~5-minute HTTP caching).

/** A GitHub repository (plus ref) that hosts dataset files. */
export interface RemoteDatasetSource {
  owner: string;
  repo: string;
  /** Branch name, tag, or commit SHA. */
  ref: string;
}

// Pinned ref into dataslope/datasets: pinning makes every URL immutable, so
// bumping the ref IS the cache invalidation (same pattern as CDN_ASSETS_TAG).
// After merging changes to that repo, update to the new commit SHA:
//   git ls-remote https://github.com/dataslope/datasets.git refs/heads/main
export const DATASETS_REF = "f7f08485960fe4a774359a43d1eb50a84514daf2";

/** The companion repository holding the playgrounds' sample databases:
 *  https://github.com/dataslope/datasets */
export const DATASLOPE_DATASETS_SOURCE: RemoteDatasetSource = {
  owner: "dataslope",
  repo: "datasets",
  ref: DATASETS_REF,
};

function cleanDatasetPath(path: string): string {
  return path.replace(/^\/+/, "");
}

/** Build the raw.githubusercontent.com URL for a file in a GitHub repo. */
export function rawGitHubUrl(
  path: string,
  source: RemoteDatasetSource = DATASLOPE_DATASETS_SOURCE,
): string {
  return `https://raw.githubusercontent.com/${source.owner}/${source.repo}/${source.ref}/${cleanDatasetPath(path)}`;
}

/** cdn.jsdelivr.net URL for a file in a GitHub repo. Ref-pinned URLs get a
 *  one-year immutable cache-control. */
export function jsDelivrGitHubUrl(
  path: string,
  source: RemoteDatasetSource = DATASLOPE_DATASETS_SOURCE,
): string {
  return `https://cdn.jsdelivr.net/gh/${source.owner}/${source.repo}@${source.ref}/${cleanDatasetPath(path)}`;
}

/** Resolve a dataset reference (repo path or full https URL) to its
 *  canonical URL, which doubles as the cache key in every layer. */
export function resolveDatasetUrl(pathOrUrl: string): string {
  return datasetUrlCandidates(pathOrUrl)[0];
}

/** Candidate download URLs in try-order: jsDelivr first, raw GitHub as
 *  fallback; full URLs as-is. The first candidate is the canonical cache
 *  key regardless of which host served the bytes. */
function datasetUrlCandidates(pathOrUrl: string): string[] {
  if (/^https?:\/\//i.test(pathOrUrl)) return [pathOrUrl];
  return [jsDelivrGitHubUrl(pathOrUrl), rawGitHubUrl(pathOrUrl)];
}

// ─── Layer 1: in-flight memo ────────────────────────────────────────
// Failed downloads are evicted so a transient error isn't cached; the
// Cache API layer is what shares downloads across contexts.
const textCache = new Map<string, Promise<string>>();
const bytesCache = new Map<string, Promise<Uint8Array>>();

function memoised<T>(
  cache: Map<string, Promise<T>>,
  url: string,
  load: () => Promise<T>,
): Promise<T> {
  let promise = cache.get(url);
  if (!promise) {
    promise = load();
    promise.catch(() => cache.delete(url));
    cache.set(url, promise);
  }
  return promise;
}

// Above this size a buffer is dropped from the per-context memo once the
// Cache API holds it — a fast local re-read beats pinning MBs per context.
const LARGE_BYTES_MEMO_LIMIT = 5 * 1024 * 1024;

// ─── Layer 2: Cache API ─────────────────────────────────────────────
// Bump the version suffix when the storage format changes; the sweep
// deletes caches left by older versions.
const DATASET_CACHE_PREFIX = "dataslope-datasets-";
const DATASET_CACHE_NAME = `${DATASET_CACHE_PREFIX}v1`;

let datasetCachePromise: Promise<Cache | null> | null = null;

/** Open the persistent dataset cache once per context; null when the Cache
 *  API is unavailable (callers fall through to the network). Kicks off a
 *  background sweep of stale entries on first open. */
function openDatasetCache(): Promise<Cache | null> {
  if (typeof caches === "undefined") return Promise.resolve(null);
  if (!datasetCachePromise) {
    datasetCachePromise = (async () => {
      try {
        const cache = await caches.open(DATASET_CACHE_NAME);
        void sweepStaleEntries(cache).catch(() => {});
        return cache;
      } catch {
        return null;
      }
    })();
  }
  return datasetCachePromise;
}

/** Best-effort hygiene: drop old-format caches and default-repo entries at
 *  any ref other than the current pin — cleans up after a DATASETS_REF bump
 *  and keeps mutable URLs (`…/main/…`) from serving stale bytes forever. */
async function sweepStaleEntries(cache: Cache): Promise<void> {
  const names = await caches.keys();
  await Promise.all(
    names
      .filter((n) => n.startsWith(DATASET_CACHE_PREFIX) && n !== DATASET_CACHE_NAME)
      .map((n) => caches.delete(n)),
  );

  const { owner, repo, ref } = DATASLOPE_DATASETS_SOURCE;
  const repoPrefixes = [
    `https://cdn.jsdelivr.net/gh/${owner}/${repo}@`,
    `https://raw.githubusercontent.com/${owner}/${repo}/`,
  ];
  const pinnedPrefixes = [
    `https://cdn.jsdelivr.net/gh/${owner}/${repo}@${ref}/`,
    `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/`,
  ];
  for (const request of await cache.keys()) {
    const url = request.url;
    if (
      repoPrefixes.some((p) => url.startsWith(p)) &&
      !pinnedPrefixes.some((p) => url.startsWith(p))
    ) {
      await cache.delete(request);
    }
  }
}

interface CachedFetchResult {
  response: Response;
  /** True when the bytes are retrievable from the Cache API, so a memo may
   *  safely drop its copy. */
  persisted: boolean;
}

/** Serve `canonicalUrl` from the persistent cache, else download it
 *  (trying `candidates` in order) and store the result under the
 *  canonical key. Cache failures never block the download path. */
async function cachedFetch(
  canonicalUrl: string,
  candidates: string[],
): Promise<CachedFetchResult> {
  const cache = await openDatasetCache();
  if (cache) {
    try {
      const hit = await cache.match(canonicalUrl);
      if (hit) return { response: hit, persisted: true };
    } catch {
      // A failing match must never block the network path.
    }
  }
  const response = await fetchFromAnyHost(candidates);
  let persisted = false;
  if (cache) {
    try {
      // Clone before the caller consumes the body.
      await cache.put(canonicalUrl, response.clone());
      persisted = true;
    } catch {
      // Quota exceeded / opaque restrictions, persistence is best-effort.
    }
  }
  return { response, persisted };
}

// ─── Layer 3: network ───────────────────────────────────────────────

async function fetchDataset(url: string): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(url);
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Could not download the sample dataset (${url}): ${reason}. Check your network connection and try again.`,
    );
  }
  if (!res.ok) {
    throw new Error(
      `Could not download the sample dataset (${url}): HTTP ${res.status}.`,
    );
  }
  return res;
}

/** Try each candidate host in order; throw the last failure (which is
 *  the raw.githubusercontent.com attempt for repo-relative paths). */
async function fetchFromAnyHost(candidates: string[]): Promise<Response> {
  let lastError: unknown;
  for (const url of candidates) {
    try {
      return await fetchDataset(url);
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

// ─── Public fetch helpers ───────────────────────────────────────────

/** Fetch a text dataset (e.g. a `.sql` script) by repo path or URL. */
export function fetchDatasetText(pathOrUrl: string): Promise<string> {
  const candidates = datasetUrlCandidates(pathOrUrl);
  const url = candidates[0];
  return memoised(textCache, url, async () =>
    (await cachedFetch(url, candidates)).response.text(),
  );
}

/** Fetch a binary dataset by repo path or URL. Callers handing the buffer
 *  to an engine that takes ownership (worker transfer, virtual-FS
 *  registration) should pass `bytes.slice()` so the cached array survives. */
export function fetchDatasetBytes(pathOrUrl: string): Promise<Uint8Array> {
  const candidates = datasetUrlCandidates(pathOrUrl);
  const url = candidates[0];
  return memoised(bytesCache, url, async () => {
    const { response, persisted } = await cachedFetch(url, candidates);
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (persisted && bytes.byteLength > LARGE_BYTES_MEMO_LIMIT) {
      // Don't pin large buffers in the memo; later calls re-read the Cache
      // API. In-flight callers still share this promise.
      bytesCache.delete(url);
    }
    return bytes;
  });
}

/** Filename component of a dataset path or URL (`duckdb/trips.parquet` →
 *  `trips.parquet`); the default virtual-filesystem name. */
export function datasetFileName(pathOrUrl: string): string {
  const path = pathOrUrl.replace(/[?#].*$/, "");
  const base = path.slice(path.lastIndexOf("/") + 1);
  return base || path;
}

// ─── Declarative staging (the `datasets` prop) ──────────────────────

/** One dataset staged into a runtime's working directory by the `datasets`
 *  prop of `<CodeBlock>` / `<ChallengeCard>`: downloaded via the cached
 *  path and written into the virtual filesystem before each run, so code
 *  reads a local file with no CORS quirks and no raw URLs in lessons. */
export interface DatasetStageSpec {
  /** Path inside the dataslope/datasets repo (e.g. `"csv/penguins.csv"`)
   *  or a full `https://` URL on any CORS-enabled host. */
  path: string;
  /** Staged filename; defaults to the basename of `path`. */
  stageAs?: string;
}

/** The filename a `DatasetStageSpec` is staged under. */
export function datasetStageFilename(spec: DatasetStageSpec): string {
  return spec.stageAs ?? datasetFileName(spec.path);
}
