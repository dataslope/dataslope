// Remote sample datasets (SQL scripts, CSV/parquet files, SQLite
// databases), fetched from the companion dataslope/datasets GitHub
// repository and cached so that every code block, challenge card, and
// playground that references a file shares ONE download — across
// languages (Python, R, SQLite, Postgres, DuckDB, …), across pages,
// and across visits.
//
// How a dataset is fetched (three layers, all per-URL):
//
//   1. In-flight memo (module-level Map<url, Promise>) — dedupes
//      concurrent and repeated requests within one JS context. Workers
//      get their own module instance and therefore their own memo.
//   2. Cache API (`caches.open`) — persistent, shared by the main
//      thread and every worker on the origin. A file downloaded by the
//      SQLite worker is served from here when the DuckDB worker (or a
//      hard-reloaded page) asks for it later. Best-effort: quota
//      errors, private-browsing restrictions, and missing support all
//      silently degrade to a plain network fetch.
//   3. Network, via two hosts:
//        - cdn.jsdelivr.net (primary): serves GitHub repos with
//          `access-control-allow-origin: *` and — for ref-pinned URLs —
//          a one-year immutable HTTP cache, so even fetches that bypass
//          this module benefit.
//        - raw.githubusercontent.com (fallback): also CORS-enabled and
//          has no per-file size limit below GitHub's 100 MB cap, but
//          only allows ~5-minute HTTP caching. Used when jsDelivr
//          fails (outage, or its ~20 MB per-file limit).
//      Either way the bytes come from a CDN, not Vercel, so sample
//      databases stop counting against Vercel's bandwidth budget.
//
// The helpers below are dialect-agnostic: SQLite and Postgres fetch SQL
// scripts with `fetchDatasetText`, the DuckDB runtime uses
// `fetchDatasetBytes` for binary datasets (e.g. registering a remote
// parquet file), and `<CodeBlock>` / `<ChallengeCard>` stage
// `fetchDatasetBytes` results into a runtime's virtual filesystem via
// their `datasets` prop (see `DatasetStageSpec`).

/** A GitHub repository (plus ref) that hosts dataset files. */
export interface RemoteDatasetSource {
  owner: string;
  repo: string;
  /** Branch name, tag, or commit SHA. */
  ref: string;
}

// Pinned ref into the dataslope/datasets repository. Pinning (rather
// than tracking `main`) makes every dataset URL immutable, which is
// what lets the layers above cache aggressively with no revalidation
// logic at all: bumping the ref changes every URL, and that IS the
// cache invalidation. (Same pattern as CDN_ASSETS_TAG in cdn.ts.)
//
// After merging any change to the dataslope/datasets repo, update this
// to the new commit SHA (or a tag, once the repo starts tagging):
//
//   git ls-remote https://github.com/dataslope/datasets.git refs/heads/main
export const DATASETS_REF = "6e5577bc130df05f5bdd3c7e6606d0c991f2414d";

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

/** Build the cdn.jsdelivr.net URL for a file in a GitHub repo. With a
 *  pinned ref jsDelivr serves these with a one-year immutable
 *  `cache-control`, so plain HTTP caching works even for consumers
 *  that bypass this module's Cache API layer. */
export function jsDelivrGitHubUrl(
  path: string,
  source: RemoteDatasetSource = DATASLOPE_DATASETS_SOURCE,
): string {
  return `https://cdn.jsdelivr.net/gh/${source.owner}/${source.repo}@${source.ref}/${cleanDatasetPath(path)}`;
}

/** Resolve a dataset reference to its canonical absolute URL. Accepts
 *  either a path inside the default datasets repo (e.g.
 *  `sqlite/chinook_sqlite.sql`) or a full `https://` URL, so a sample
 *  can clone a database from any repository (or any other CORS-enabled
 *  host). The canonical URL doubles as the cache key in every layer. */
export function resolveDatasetUrl(pathOrUrl: string): string {
  return datasetUrlCandidates(pathOrUrl)[0];
}

/** Candidate download URLs for a dataset reference, in the order they
 *  should be tried. Repo-relative paths get the jsDelivr URL first
 *  (immutable HTTP caching) with raw.githubusercontent.com as the
 *  fallback host; full URLs are used as-is. The first candidate is the
 *  canonical cache key — a download that succeeded via the fallback
 *  host is still stored under the canonical URL, so later lookups hit
 *  regardless of which host happened to serve the bytes. */
function datasetUrlCandidates(pathOrUrl: string): string[] {
  if (/^https?:\/\//i.test(pathOrUrl)) return [pathOrUrl];
  return [jsDelivrGitHubUrl(pathOrUrl), rawGitHubUrl(pathOrUrl)];
}

// ─── Layer 1: in-flight memo ────────────────────────────────────────
// Failed downloads are evicted so a transient network error doesn't
// poison the sample for the rest of the session. (Workers get their own
// module instance and therefore their own memo — the Cache API layer
// below is what makes a download shared across contexts.)
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

// Above this size a downloaded buffer is dropped from the per-context
// memo once it is safely retrievable from the Cache API: retaining a
// multi-MB parquet file as a live Uint8Array in every JS context is a
// memory cost the (fast, local) Cache API re-read makes unnecessary.
const LARGE_BYTES_MEMO_LIMIT = 5 * 1024 * 1024;

// ─── Layer 2: Cache API ─────────────────────────────────────────────
// Bump the version suffix when the storage format changes (e.g. if
// entries ever gain synthetic metadata headers); the sweep below
// deletes caches left behind by older versions.
const DATASET_CACHE_PREFIX = "dataslope-datasets-";
const DATASET_CACHE_NAME = `${DATASET_CACHE_PREFIX}v1`;

let datasetCachePromise: Promise<Cache | null> | null = null;

/** Open (once per context) the persistent dataset cache, or resolve to
 *  null when the Cache API is unavailable (Node, file://, some private
 *  modes) or fails — callers then fall through to the network. Kicks
 *  off a background sweep of stale entries on first open. */
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

/** Best-effort storage hygiene, run once per context per session:
 *  drops caches created by older storage-format versions, and drops
 *  entries for the default datasets repo at any ref other than the
 *  current pin. The latter both cleans up after a `DATASETS_REF` bump
 *  and keeps hand-written mutable URLs (e.g. `…/datasets/main/…`) from
 *  serving stale bytes forever — they degrade to per-session caching. */
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
  /** True when the bytes are now retrievable from the Cache API (hit,
   *  or stored after a miss) — i.e. a per-context memo may safely drop
   *  its copy and re-read locally later. */
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
      // Quota exceeded / opaque restrictions — persistence is best-effort.
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

/** Fetch a binary dataset (e.g. a `.parquet`, `.csv`, or `.sqlite`
 *  file) by repo path or URL. Callers that hand the buffer to an engine
 *  which takes ownership of it (worker transfer, virtual-FS
 *  registration) should pass a copy (`bytes.slice()`) so the cached
 *  array stays usable for the next load. */
export function fetchDatasetBytes(pathOrUrl: string): Promise<Uint8Array> {
  const candidates = datasetUrlCandidates(pathOrUrl);
  const url = candidates[0];
  return memoised(bytesCache, url, async () => {
    const { response, persisted } = await cachedFetch(url, candidates);
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (persisted && bytes.byteLength > LARGE_BYTES_MEMO_LIMIT) {
      // Don't pin large buffers in this context's memo: the next
      // consumer re-reads from the Cache API instead. In-flight
      // callers still share this promise; only later calls re-load.
      bytesCache.delete(url);
    }
    return bytes;
  });
}

/** Filename component of a dataset path or URL (e.g.
 *  `duckdb/trips.parquet` → `trips.parquet`). Used as the default name
 *  when registering a remote file with an engine's virtual filesystem. */
export function datasetFileName(pathOrUrl: string): string {
  const path = pathOrUrl.replace(/[?#].*$/, "");
  const base = path.slice(path.lastIndexOf("/") + 1);
  return base || path;
}

// ─── Declarative staging (the `datasets` prop) ──────────────────────

/** One dataset staged into a runtime's working directory by the
 *  `datasets` prop of `<CodeBlock>` / `<ChallengeCard>`. The bytes are
 *  downloaded through the cached path above and written into the
 *  runtime's virtual filesystem before each run, so init/starter code
 *  reads a local file (`pd.read_csv("penguins.csv")`,
 *  `read.csv("penguins.csv")`) — identical UX in every language, no
 *  per-language CORS quirks, and lessons never embed raw URLs. */
export interface DatasetStageSpec {
  /** Path inside the dataslope/datasets repo (e.g. `"csv/penguins.csv"`)
   *  or a full `https://` URL on any CORS-enabled host. */
  path: string;
  /** Filename the bytes are staged under in the runtime's working
   *  directory. Defaults to the basename of `path`. */
  stageAs?: string;
}

/** The filename a `DatasetStageSpec` is staged under. */
export function datasetStageFilename(spec: DatasetStageSpec): string {
  return spec.stageAs ?? datasetFileName(spec.path);
}
