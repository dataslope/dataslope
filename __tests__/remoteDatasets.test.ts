/**
 * Remote-dataset loading tests.
 *
 * Covers the URL building / caching helpers in runtime/remoteDatasets.ts
 * and the PGlite script preparation in runtime/postgres.ts. The fetch
 * tests stub the global fetch — no network access required.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  DATASLOPE_DATASETS_SOURCE,
  datasetFileName,
  fetchDatasetBytes,
  fetchDatasetText,
  rawGitHubUrl,
  resolveDatasetUrl,
} from "../app/_components/runtime/remoteDatasets";
import { preparePostgresScriptForPglite } from "../app/_components/runtime/postgres";

describe("rawGitHubUrl", () => {
  it("builds a raw.githubusercontent.com URL for the default datasets repo", () => {
    expect(rawGitHubUrl("sqlite/chinook_sqlite.sql")).toBe(
      "https://raw.githubusercontent.com/dataslope/datasets/main/sqlite/chinook_sqlite.sql",
    );
  });

  it("strips leading slashes from the path", () => {
    expect(rawGitHubUrl("/postgres/northwind_postgres.sql")).toBe(
      "https://raw.githubusercontent.com/dataslope/datasets/main/postgres/northwind_postgres.sql",
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

  it("defaults to the dataslope/datasets repo on main", () => {
    expect(DATASLOPE_DATASETS_SOURCE).toEqual({
      owner: "dataslope",
      repo: "datasets",
      ref: "main",
    });
  });
});

describe("resolveDatasetUrl", () => {
  it("treats repo-relative paths as paths in the default repo", () => {
    expect(resolveDatasetUrl("sqlite/northwind_sqlite.sql")).toBe(
      "https://raw.githubusercontent.com/dataslope/datasets/main/sqlite/northwind_sqlite.sql",
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

describe("fetchDatasetText / fetchDatasetBytes", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fetches text and memoises by URL", async () => {
    const fetchMock = vi.fn(async () => new Response("SELECT 1;"));
    vi.stubGlobal("fetch", fetchMock);
    const first = await fetchDatasetText("memo/one.sql");
    const second = await fetchDatasetText("memo/one.sql");
    expect(first).toBe("SELECT 1;");
    expect(second).toBe("SELECT 1;");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://raw.githubusercontent.com/dataslope/datasets/main/memo/one.sql",
    );
  });

  it("fetches binary files as Uint8Array", async () => {
    const payload = new Uint8Array([0x50, 0x41, 0x52, 0x31]); // "PAR1"
    vi.stubGlobal("fetch", vi.fn(async () => new Response(payload.slice())));
    const bytes = await fetchDatasetBytes("memo/two.parquet");
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(Array.from(bytes)).toEqual([0x50, 0x41, 0x52, 0x31]);
  });

  it("reports HTTP failures with the URL and does not memoise them", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("nope", { status: 404 }))
      .mockResolvedValueOnce(new Response("SELECT 2;"));
    vi.stubGlobal("fetch", fetchMock);
    await expect(fetchDatasetText("memo/three.sql")).rejects.toThrow(
      /HTTP 404/,
    );
    // The failure must be evicted so the next attempt retries.
    await expect(fetchDatasetText("memo/three.sql")).resolves.toBe(
      "SELECT 2;",
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
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
