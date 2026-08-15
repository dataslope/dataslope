/**
 * Lesson datasets, fetched once and cached on disk. `datasets={[{ path,
 * stageAs }]}` on a `<CodeBlock>` stages a file from the dataslope/datasets
 * repo before the block runs; a sweep that skips that step reports good
 * lessons as broken. The ref is pinned to the commit
 * `app/_components/runtime/remoteDatasets.ts` pins, and caching under
 * `.dataset-cache` keeps re-runs offline.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/** Keep in step with `DATASETS_REF` in remoteDatasets.ts. */
export const DATASETS_REF = "f7f08485960fe4a774359a43d1eb50a84514daf2";

const BASE = `https://raw.githubusercontent.com/dataslope/datasets/${DATASETS_REF}/`;
const CACHE = ".dataset-cache";

/** Bytes for one dataset path (or a full URL), from disk when already
 *  fetched. */
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
