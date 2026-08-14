/**
 * Remote-dataset loading: URL/caching helpers in runtime/remoteDatasets.ts
 * and PGlite script prep in runtime/postgres.ts. fetch is stubbed. The
 * persistent-cache tests stub a fake Cache API and use vi.resetModules() to
 * simulate separate JS contexts sharing the origin's cache storage.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  DATASETS_REF,
  DATASLOPE_DATASETS_SOURCE,
  datasetFileName,
  datasetStageFilename,
  fetchDatasetBytes,
  fetchDatasetText,
  jsDelivrGitHubUrl,
  rawGitHubUrl,
  resolveDatasetUrl,
} from "../app/_components/runtime/remoteDatasets";
import { preparePostgresScriptForPglite } from "../app/_components/runtime/postgres";

const MODULE_PATH = "../app/_components/runtime/remoteDatasets";
type RemoteDatasetsModule = typeof import("../app/_components/runtime/remoteDatasets");

/** Import a fresh module instance (fresh in-flight memo), as another
 *  worker, or a hard-reloaded page, would get. */
async function freshModule(): Promise<RemoteDatasetsModule> {
  vi.resetModules();
  return import(MODULE_PATH);
}

// The cache name is part of the module's storage contract, the sweep
// logic must keep exactly this cache and delete older versions.
const DATASET_CACHE_NAME = "dataslope-datasets-v1";

function keyUrl(key: RequestInfo | URL): string {
  if (typeof key === "string") return key;
  if (key instanceof URL) return key.href;
  return key.url;
}

/** Minimal in-memory stand-in for the Cache API, enough for the
 *  module's match/put/keys/delete usage. */
class FakeCache {
  entries = new Map<string, Response>();
  async match(key: RequestInfo | URL): Promise<Response | undefined> {
    const hit = this.entries.get(keyUrl(key));
    return hit ? hit.clone() : undefined;
  }
  async put(key: RequestInfo | URL, response: Response): Promise<void> {
    this.entries.set(keyUrl(key), response);
  }
  async keys(): Promise<Request[]> {
    return [...this.entries.keys()].map((url) => new Request(url));
  }
  async delete(key: RequestInfo | URL): Promise<boolean> {
    return this.entries.delete(keyUrl(key));
  }
}

class FakeCacheStorage {
  stores = new Map<string, FakeCache>();
  async open(name: string): Promise<FakeCache> {
    let cache = this.stores.get(name);
    if (!cache) {
      cache = new FakeCache();
      this.stores.set(name, cache);
    }
    return cache;
  }
  async keys(): Promise<string[]> {
    return [...this.stores.keys()];
  }
  async delete(name: string): Promise<boolean> {
    return this.stores.delete(name);
  }
}

describe("rawGitHubUrl", () => {
  it("builds a raw.githubusercontent.com URL pinned to the datasets ref", () => {
    expect(rawGitHubUrl("sqlite/chinook_sqlite.sql")).toBe(
      `https://raw.githubusercontent.com/dataslope/datasets/${DATASETS_REF}/sqlite/chinook_sqlite.sql`,
    );
  });

  it("strips leading slashes from the path", () => {
    expect(rawGitHubUrl("/postgres/northwind_postgres.sql")).toBe(
      `https://raw.githubusercontent.com/dataslope/datasets/${DATASETS_REF}/postgres/northwind_postgres.sql`,
    );
  });

  it("supports other repositories and refs", () => {
    expect(
      rawGitHubUrl("data/trips.parquet", {
        owner: "someone",
        repo: "their-datasets",
        ref: "v1.2.0",
      }),
    ).toBe(
      "https://raw.githubusercontent.com/someone/their-datasets/v1.2.0/data/trips.parquet",
    );
  });

  it("pins the dataslope/datasets repo to an immutable ref", () => {
    expect(DATASLOPE_DATASETS_SOURCE).toEqual({
      owner: "dataslope",
      repo: "datasets",
      ref: DATASETS_REF,
    });
    // A branch head would let persistently cached entries go stale
    // silently, the caching design relies on the ref being immutable
    // (a commit SHA, or a version tag once the repo starts tagging).
    expect(DATASETS_REF).not.toBe("main");
    expect(DATASETS_REF).toMatch(/^([0-9a-f]{40}|v.+)$/);
  });
});

describe("jsDelivrGitHubUrl", () => {
  it("builds a cdn.jsdelivr.net URL pinned to the datasets ref", () => {
    expect(jsDelivrGitHubUrl("csv/penguins.csv")).toBe(
      `https://cdn.jsdelivr.net/gh/dataslope/datasets@${DATASETS_REF}/csv/penguins.csv`,
    );
  });

  it("supports other repositories and refs", () => {
    expect(
      jsDelivrGitHubUrl("data/trips.parquet", {
        owner: "someone",
        repo: "their-datasets",
        ref: "v1.2.0",
      }),
    ).toBe(
      "https://cdn.jsdelivr.net/gh/someone/their-datasets@v1.2.0/data/trips.parquet",
    );
  });
});

describe("resolveDatasetUrl", () => {
  it("resolves repo-relative paths to the primary (jsDelivr) host", () => {
    expect(resolveDatasetUrl("sqlite/northwind_sqlite.sql")).toBe(
      `https://cdn.jsdelivr.net/gh/dataslope/datasets@${DATASETS_REF}/sqlite/northwind_sqlite.sql`,
    );
  });

  it("passes full URLs through untouched", () => {
    const url = "https://raw.githubusercontent.com/other/repo/main/x.sql";
    expect(resolveDatasetUrl(url)).toBe(url);
  });
});

describe("datasetFileName", () => {
  it("returns the basename of a repo path", () => {
    expect(datasetFileName("duckdb/trips.parquet")).toBe("trips.parquet");
  });

  it("returns the basename of a full URL, ignoring query/hash", () => {
    expect(
      datasetFileName("https://example.com/data/sales.csv?token=abc#frag"),
    ).toBe("sales.csv");
  });

  it("returns bare filenames as-is", () => {
    expect(datasetFileName("chinook.sqlite")).toBe("chinook.sqlite");
  });
});

describe("datasetStageFilename", () => {
  it("defaults to the basename of the dataset path", () => {
    expect(datasetStageFilename({ path: "csv/penguins.csv" })).toBe(
      "penguins.csv",
    );
  });

  it("honours an explicit stageAs filename", () => {
    expect(
      datasetStageFilename({ path: "csv/penguins.csv", stageAs: "data.csv" }),
    ).toBe("data.csv");
  });
});

describe("fetchDatasetText / fetchDatasetBytes", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fetches text from the primary host and memoises by URL", async () => {
    const fetchMock = vi.fn(async () => new Response("SELECT 1;"));
    vi.stubGlobal("fetch", fetchMock);
    const first = await fetchDatasetText("memo/one.sql");
    const second = await fetchDatasetText("memo/one.sql");
    expect(first).toBe("SELECT 1;");
    expect(second).toBe("SELECT 1;");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      `https://cdn.jsdelivr.net/gh/dataslope/datasets@${DATASETS_REF}/memo/one.sql`,
    );
  });

  it("fetches binary files as Uint8Array", async () => {
    const payload = new Uint8Array([0x50, 0x41, 0x52, 0x31]); // "PAR1"
    vi.stubGlobal("fetch", vi.fn(async () => new Response(payload.slice())));
    const bytes = await fetchDatasetBytes("memo/two.parquet");
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(Array.from(bytes)).toEqual([0x50, 0x41, 0x52, 0x31]);
  });

  it("falls back to raw.githubusercontent.com when jsDelivr fails", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce(new Response("SELECT 3;"));
    vi.stubGlobal("fetch", fetchMock);
    await expect(fetchDatasetText("memo/five.sql")).resolves.toBe("SELECT 3;");
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      `https://cdn.jsdelivr.net/gh/dataslope/datasets@${DATASETS_REF}/memo/five.sql`,
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      `https://raw.githubusercontent.com/dataslope/datasets/${DATASETS_REF}/memo/five.sql`,
    );
  });

  it("uses a full URL as the only candidate (no fallback host)", async () => {
    const url = "https://example.com/data/cities.csv";
    const fetchMock = vi.fn(async () => new Response("a,b"));
    vi.stubGlobal("fetch", fetchMock);
    await fetchDatasetText(url);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(url);
  });

  it("reports HTTP failures with the URL and does not memoise them", async () => {
    const fetchMock = vi
      .fn()
      // First attempt: both hosts 404.
      .mockResolvedValueOnce(new Response("nope", { status: 404 }))
      .mockResolvedValueOnce(new Response("nope", { status: 404 }))
      // The retry succeeds straight from the primary host.
      .mockResolvedValueOnce(new Response("SELECT 2;"));
    vi.stubGlobal("fetch", fetchMock);
    await expect(fetchDatasetText("memo/three.sql")).rejects.toThrow(
      /HTTP 404/,
    );
    // The failure must be evicted so the next attempt retries.
    await expect(fetchDatasetText("memo/three.sql")).resolves.toBe(
      "SELECT 2;",
    );
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("wraps network errors in a descriptive message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      }),
    );
    await expect(fetchDatasetText("memo/four.sql")).rejects.toThrow(
      /Could not download the sample dataset .*memo\/four\.sql.*Failed to fetch/,
    );
  });
});

describe("persistent Cache API layer", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("persists downloads so a new JS context skips the network", async () => {
    vi.stubGlobal("caches", new FakeCacheStorage());
    const fetchMock = vi.fn(async () => new Response("SELECT 42;"));
    vi.stubGlobal("fetch", fetchMock);

    const first = await (await freshModule()).fetchDatasetText(
      "cache/answer.sql",
    );
    expect(first).toBe("SELECT 42;");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // A different context (worker, or the next visit): fresh module
    // instance, empty memo, but the same origin cache storage.
    const second = await (await freshModule()).fetchDatasetText(
      "cache/answer.sql",
    );
    expect(second).toBe("SELECT 42;");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("degrades to a plain network fetch when the Cache API fails", async () => {
    vi.stubGlobal("caches", {
      open: vi.fn(async () => {
        throw new Error("storage disabled");
      }),
    });
    const fetchMock = vi.fn(async () => new Response("SELECT 7;"));
    vi.stubGlobal("fetch", fetchMock);
    const mod = await freshModule();
    await expect(mod.fetchDatasetText("cache/no-store.sql")).resolves.toBe(
      "SELECT 7;",
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("still returns the download when persisting it fails", async () => {
    const fakeCaches = new FakeCacheStorage();
    const cache = await fakeCaches.open(DATASET_CACHE_NAME);
    cache.put = async () => {
      throw new Error("QuotaExceededError");
    };
    vi.stubGlobal("caches", fakeCaches);
    const fetchMock = vi.fn(async () => new Response("SELECT 8;"));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      (await freshModule()).fetchDatasetText("cache/quota.sql"),
    ).resolves.toBe("SELECT 8;");
    // Nothing was persisted, so a new context downloads again.
    await expect(
      (await freshModule()).fetchDatasetText("cache/quota.sql"),
    ).resolves.toBe("SELECT 8;");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("sweeps old cache versions and stale-ref entries of the datasets repo", async () => {
    const fakeCaches = new FakeCacheStorage();
    await fakeCaches.open("dataslope-datasets-v0"); // old storage format
    const cache = await fakeCaches.open(DATASET_CACHE_NAME);
    const staleJsDelivr = `https://cdn.jsdelivr.net/gh/dataslope/datasets@${"0".repeat(40)}/csv/old.csv`;
    const staleRawMain =
      "https://raw.githubusercontent.com/dataslope/datasets/main/csv/main.csv";
    const pinned = jsDelivrGitHubUrl("csv/keep.csv");
    const foreign = "https://example.com/other.csv";
    for (const url of [staleJsDelivr, staleRawMain, pinned, foreign]) {
      await cache.put(url, new Response("x"));
    }
    vi.stubGlobal("caches", fakeCaches);
    vi.stubGlobal("fetch", vi.fn(async () => new Response("fresh")));

    // First use of the module opens the cache, which kicks the sweep.
    await (await freshModule()).fetchDatasetText("csv/trigger.csv");

    await vi.waitFor(() => {
      expect(fakeCaches.stores.has("dataslope-datasets-v0")).toBe(false);
      const remaining = [...cache.entries.keys()];
      expect(remaining).not.toContain(staleJsDelivr);
      expect(remaining).not.toContain(staleRawMain);
      expect(remaining).toContain(pinned);
      expect(remaining).toContain(foreign);
    });
  });

  it("drops large buffers from the in-context memo once persisted", async () => {
    const fakeCaches = new FakeCacheStorage();
    const cache = await fakeCaches.open(DATASET_CACHE_NAME);
    const matchSpy = vi.spyOn(cache, "match");
    vi.stubGlobal("caches", fakeCaches);
    const big = new Uint8Array(6 * 1024 * 1024); // > 5 MB memo limit
    big.set([1, 2, 3]);
    const fetchMock = vi.fn(async () => new Response(big.slice()));
    vi.stubGlobal("fetch", fetchMock);

    const mod = await freshModule();
    const first = await mod.fetchDatasetBytes("parquet/big.parquet");
    expect(first.byteLength).toBe(big.byteLength);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // A second read in the SAME context re-reads from the Cache API
    // (memo evicted to free the multi-MB buffer), not the network.
    const second = await mod.fetchDatasetBytes("parquet/big.parquet");
    expect(Array.from(second.slice(0, 3))).toEqual([1, 2, 3]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(matchSpy).toHaveBeenCalledTimes(2);
  });

  it("keeps small buffers memoised in-context (no Cache API re-read)", async () => {
    const fakeCaches = new FakeCacheStorage();
    const cache = await fakeCaches.open(DATASET_CACHE_NAME);
    const matchSpy = vi.spyOn(cache, "match");
    vi.stubGlobal("caches", fakeCaches);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(new Uint8Array([9, 9]))),
    );

    const mod = await freshModule();
    const first = await mod.fetchDatasetBytes("csv/small.csv");
    const second = await mod.fetchDatasetBytes("csv/small.csv");
    expect(second).toBe(first); // same memoised array instance
    expect(matchSpy).toHaveBeenCalledTimes(1);
  });
});

describe("preparePostgresScriptForPglite", () => {
  it("strips psql meta-commands and CREATE/DROP DATABASE lines", () => {
    const script = [
      "DROP DATABASE IF EXISTS chinook_auto_increment;",
      "CREATE DATABASE chinook_auto_increment;",
      "\\c chinook_auto_increment;",
      "CREATE TABLE album (album_id INT);",
      "INSERT INTO album VALUES (1);",
    ].join("\n");
    expect(preparePostgresScriptForPglite(script)).toBe(
      ["CREATE TABLE album (album_id INT);", "INSERT INTO album VALUES (1);"].join(
        "\n",
      ),
    );
  });

  it("keeps statements that merely mention databases", () => {
    const script = [
      "SELECT 'CREATE DATABASE literal';",
      "CREATE TABLE create_database_log (id INT);",
    ].join("\n");
    const prepared = preparePostgresScriptForPglite(script);
    expect(prepared).toContain("SELECT 'CREATE DATABASE literal';");
    expect(prepared).toContain("CREATE TABLE create_database_log (id INT);");
  });

  it("handles indented meta-commands and mixed case", () => {
    const script = ["  \\connect foo", "  create database foo;", "SELECT 1;"].join(
      "\n",
    );
    expect(preparePostgresScriptForPglite(script)).toBe("SELECT 1;");
  });
});
