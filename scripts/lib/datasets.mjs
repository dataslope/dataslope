/**
 * Lesson datasets, fetched once and cached on disk.
 *
 * `datasets={[{ path, stageAs }]}` on a `<CodeBlock>` tells the runtime to put
 * a file from the `dataslope/datasets` repo into the block's filesystem before
 * it runs, and a sweep that skips that step does not check less — it reports
 * `cannot open the connection` against eighteen perfectly good lessons and
 * calls them broken.
 *
 * The ref is pinned to the same commit `app/_components/runtime/remoteDatasets.ts`
 * pins, so the bytes here are the bytes a reader gets. Caching under
 * `.dataset-cache` matches the Python sweep, so a re-run is offline.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/** Keep in step with `DATASETS_REF` in remoteDatasets.ts. */
export const DATASETS_REF = "f7f08485960fe4a774359a43d1eb50a84514daf2";

const BASE = `https://raw.githubusercontent.com/dataslope/datasets/${DATASETS_REF}/`;
const CACHE = ".dataset-cache";

/**
 * Bytes for one dataset path (or a full URL), from disk when already fetched.
 *
 * @param {string} pathOrUrl
 * @returns {Promise<Uint8Array>}
 */
export async function fetchDatasetBytes(pathOrUrl) {
  mkdirSync(CACHE, { recursive: true });
  const local = join(CACHE, pathOrUrl.replace(/[^\w.-]/g, "__"));
  if (existsSync(local)) return new Uint8Array(readFileSync(local));
  const url = /^https?:\/\//i.test(pathOrUrl) ? pathOrUrl : BASE + pathOrUrl.replace(/^\/+/, "");
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  writeFileSync(local, bytes);
  return bytes;
}
