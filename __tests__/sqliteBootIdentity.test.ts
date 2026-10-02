/**
 * A SQLite workspace whose database is blank or imported persists an id that
 * names no sample (`__blank__`, `__imported_<name>__`). The engine used to
 * resolve that id through `findSampleDatabase` on boot, i.e. to the first
 * sample: every reload relabelled the workspace as `credit_card_transactions`
 * (seeding it, if the file was still empty), and the playground then saved
 * its query tabs under that sample's keys, so the next reload restored an
 * older set of tabs than the one the user left.
 */

import { describe, expect, it, vi } from "vitest";

vi.mock("../app/_components/runtime/sqlite-wasm", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("../app/_components/runtime/sqlite-wasm")>();
  return {
    ...original,
    // The browser build is fetched from a CDN; Node has its own.
    loadSqlite3: async () => {
      const mod = await import("@sqlite.org/sqlite-wasm");
      // Typed without the options the browser loader passes it.
      const init = mod.default as unknown as (opts: {
        print: () => void;
        printErr: () => void;
      }) => ReturnType<typeof original.loadSqlite3>;
      return init({ print: () => {}, printErr: () => {} });
    },
  };
});

const { createSqliteEngineInProcess } = await import(
  "../app/_components/runtime/sqlite-core"
);
const { SQLITE_SAMPLE_DATABASES } = await import(
  "../app/_components/runtime/sqliteSamples"
);

describe("SQLite engine boot with a non-sample database id", () => {
  it("keeps a blank database blank and called by its own name", async () => {
    const engine = await createSqliteEngineInProcess("__blank__");
    const active = engine.activeSample();
    expect(active.id).toBe("__blank__");
    expect(active.filename).toBe("blank.sqlite");
    expect(await engine.listTables()).toEqual([]);
  });

  it("keeps an imported database's id rather than the first sample's", async () => {
    const engine = await createSqliteEngineInProcess("__imported_sales__");
    expect(engine.activeSample().id).toBe("__imported_sales__");
    expect(engine.activeSample().id).not.toBe(SQLITE_SAMPLE_DATABASES[0].id);
    expect(await engine.listTables()).toEqual([]);
  });

  it("re-adopts a non-sample id without seeding over it", async () => {
    const engine = await createSqliteEngineInProcess("__blank__");
    engine.exec("CREATE TABLE users (id INTEGER)");
    const meta = await engine.loadSampleDatabase("__imported_sales__");
    expect(meta.id).toBe("__imported_sales__");
    expect(await engine.listTables()).toEqual(["users"]);
  });
});
