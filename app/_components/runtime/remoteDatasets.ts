// Remote sample datasets, fetched straight from a GitHub repository via
// raw.githubusercontent.com. The default source is the companion
// dataslope/datasets repo, which holds the original (untrimmed) sample
// databases as SQL scripts — and, later, parquet/CSV files for DuckDB.
//
// Why raw.githubusercontent.com:
//   - it serves `access-control-allow-origin: *`, so browsers (main
//     thread *and* web workers) can fetch the files directly without
//     the CORS proxy hop other runtimes need, and
//   - the bytes come from GitHub's CDN, so sample databases stop
//     counting against Vercel's bandwidth budget.
//
// The helpers below are dialect-agnostic: SQLite and Postgres fetch SQL
// scripts with `fetchDatasetText`, and the DuckDB runtime can reuse
// `fetchDatasetBytes` for binary datasets (e.g. registering a remote
// parquet file) or embed `rawGitHubUrl(...)` directly in sample SQL,
// since duckdb-wasm can read CORS-enabled https URLs natively.

/** A GitHub repository (plus ref) that hosts dataset files. */
export interface RemoteDatasetSource {
  owner: string;
  repo: string;
  /** Branch name, tag, or commit SHA. */
  ref: string;
}

/** The companion repository holding the playgrounds' sample databases:
 *  https://github.com/dataslope/datasets */
export const DATASLOPE_DATASETS_SOURCE: RemoteDatasetSource = {
  owner: "dataslope",
  repo: "datasets",
  ref: "main",
};

/** Build the raw.githubusercontent.com URL for a file in a GitHub repo. */
export function rawGitHubUrl(
  path: string,
  source: RemoteDatasetSource = DATASLOPE_DATASETS_SOURCE,
): string {
  const cleanPath = path.replace(/^\/+/, "");
  return `https://raw.githubusercontent.com/${source.owner}/${source.repo}/${source.ref}/${cleanPath}`;
}

/** Resolve a dataset reference to an absolute URL. Accepts either a
 *  path inside the default datasets repo (e.g. `sqlite/chinook_sqlite.sql`)
 *  or a full `https://` URL, so a sample can clone a database from any
 *  repository (or any other CORS-enabled host). */
export function resolveDatasetUrl(pathOrUrl: string): string {
  return /^https?:\/\//i.test(pathOrUrl) ? pathOrUrl : rawGitHubUrl(pathOrUrl);
}

// Session-scoped memoisation. raw.githubusercontent.com only allows
// ~5-minute HTTP caching, so without this a user flipping between two
// sample databases would re-download a few hundred KB per switch.
// Failed downloads are evicted so a transient network error doesn't
// poison the sample for the rest of the session. (Workers get their own
// module instance and therefore their own cache — that's fine, each
// context fetches a given file at most once.)
const textCache = new Map<string, Promise<string>>();
const bytesCache = new Map<string, Promise<Uint8Array>>();

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

/** Fetch a text dataset (e.g. a `.sql` script) by repo path or URL. */
export function fetchDatasetText(pathOrUrl: string): Promise<string> {
  const url = resolveDatasetUrl(pathOrUrl);
  return memoised(textCache, url, async () => (await fetchDataset(url)).text());
}

/** Fetch a binary dataset (e.g. a `.parquet`, `.csv`, or `.sqlite`
 *  file) by repo path or URL. Callers that hand the buffer to an engine
 *  which takes ownership of it (worker transfer, virtual-FS
 *  registration) should pass a copy (`bytes.slice()`) so the cached
 *  array stays usable for the next load. */
export function fetchDatasetBytes(pathOrUrl: string): Promise<Uint8Array> {
  const url = resolveDatasetUrl(pathOrUrl);
  return memoised(
    bytesCache,
    url,
    async () => new Uint8Array(await (await fetchDataset(url)).arrayBuffer()),
  );
}

/** Filename component of a dataset path or URL (e.g.
 *  `duckdb/trips.parquet` → `trips.parquet`). Used as the default name
 *  when registering a remote file with an engine's virtual filesystem. */
export function datasetFileName(pathOrUrl: string): string {
  const path = pathOrUrl.replace(/[?#].*$/, "");
  const base = path.slice(path.lastIndexOf("/") + 1);
  return base || path;
}
