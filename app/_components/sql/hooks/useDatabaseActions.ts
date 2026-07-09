"use client";

import { useCallback } from "react";
import { startTransition } from "react";
import { Toast } from "@base-ui/react/toast";
import type { EditorView } from "@codemirror/view";
import type { SqliteEngine } from "../../runtime/sqlite";
import type { QueryTab } from "../../sqlitePlaygroundTabs";
import {
  newTabId,
  saveTabs,
  storageKey,
} from "../../sqlitePlaygroundTabs";
import { SQLITE_SAMPLE_DATABASES } from "../../runtime/sqliteSamples";
import { replaceDoc } from "../utils/editorUtils";
import {
  sanitizeImportColName,
  parseCsv,
  tableNameFromFilename,
  readParquetFile,
  isSqliteBinary,
} from "../utils/importUtils";
import {
  applyPragmasToEngine,
} from "../utils/pragmaUtils";
import {
  initXlsxWasm,
  toExcelData,
  triggerDownload,
} from "../utils/exportUtils";
import { useEngineStore } from "../stores/useEngineStore";
import { useTabStore } from "../stores/useTabStore";
import { useDialogStore } from "../stores/useDialogStore";
import type { PragmaSettings } from "../stores/usePragmaStore";
import type { SqliteSampleMetadata } from "../../runtime/sqliteSamples";

export interface DatabaseActionsRefs {
  engineRef: React.MutableRefObject<SqliteEngine | null>;
  editorRef: React.MutableRefObject<EditorView | null>;
  tabsRef: React.MutableRefObject<QueryTab[]>;
  activeTabIdRef: React.MutableRefObject<string>;
  activeDbIdRef: React.MutableRefObject<string>;
  pragmaSettingsRef: React.MutableRefObject<PragmaSettings>;
}

export function useDatabaseActions(refs: DatabaseActionsRefs) {
  const {
    engineRef,
    editorRef,
    tabsRef,
    activeTabIdRef,
    activeDbIdRef,
    pragmaSettingsRef,
  } = refs;

  const toastManager = Toast.useToastManager();
  const showToast = useCallback(
    (msg: string, kind: "info" | "warn" = "info") => {
      startTransition(() => {
        // Failures ("warn") linger longer than transient "info" notices so
        // the user has time to read (and Copy) the message.
        toastManager.add({
          title: msg,
          data: { kind },
          timeout: kind === "warn" ? 8000 : undefined,
        });
      });
    },
    [toastManager],
  );

  const activeDbId = useEngineStore((s) => s.activeDbId);
  const customFilenames = useEngineStore((s) => s.customFilenames);
  const tables = useEngineStore((s) => s.tables);
  const setTables = useEngineStore((s) => s.setTables);
  const setViews = useEngineStore((s) => s.setViews);
  const setIndexes = useEngineStore((s) => s.setIndexes);
  const setTriggers = useEngineStore((s) => s.setTriggers);
  const setColumnsByEntity = useEngineStore((s) => s.setColumnsByEntity);
  const setForeignKeysByEntity = useEngineStore((s) => s.setForeignKeysByEntity);
  const setActiveDbId = useEngineStore((s) => s.setActiveDbId);
  const setCustomDb = useEngineStore((s) => s.setCustomDb);
  const setCustomFilenames = useEngineStore((s) => s.setCustomFilenames);

  const setTabs = useTabStore((s) => s.setTabs);
  const setActiveTabId = useTabStore((s) => s.setActiveTabId);
  const setResultsByTab = useTabStore((s) => s.setResultsByTab);

  const setImportSqliteOpen = useDialogStore((s) => s.setImportSqliteOpen);
  const setImportCsvOpen = useDialogStore((s) => s.setImportCsvOpen);
  const setImportCsvState = useDialogStore((s) => s.setImportCsvState);
  const setImportJsonOpen = useDialogStore((s) => s.setImportJsonOpen);
  const setImportJsonState = useDialogStore((s) => s.setImportJsonState);
  const setImportParquetOpen = useDialogStore((s) => s.setImportParquetOpen);
  const setImportParquetState = useDialogStore((s) => s.setImportParquetState);
  const setPendingDbId = useDialogStore((s) => s.setPendingDbId);

  const quoteIdent = useCallback(
    (name: string) => `"${name.replace(/"/g, '""')}"`,
    [],
  );

  const applyDbLoad = useCallback(
    async (sample: SqliteSampleMetadata) => {
      const engine = engineRef.current;
      if (!engine) return;
      saveTabs(activeDbIdRef.current, tabsRef.current);

      const isCustom = !SQLITE_SAMPLE_DATABASES.some((s) => s.id === sample.id);
      setCustomDb(isCustom ? sample : null);
      setActiveDbId(sample.id);
      activeDbIdRef.current = sample.id;
      try {
        if (!isCustom) {
          localStorage.setItem(storageKey("db"), sample.id);
        }
      } catch {
        // ignore
      }
      await applyPragmasToEngine(engine, pragmaSettingsRef.current);
      const [nextTables, nextViews, nextIndexes, nextTriggers] = await Promise.all([
        engine.listTables(),
        engine.listViews(),
        engine.listIndexes(),
        engine.listTriggers(),
      ]);
      setTables(nextTables);
      setViews(nextViews);
      setIndexes(nextIndexes);
      setTriggers(nextTriggers);
      setColumnsByEntity({});
      setForeignKeysByEntity({});

      const newTabs = sample.defaultTabs.map((seed) => ({
        ...seed,
        id: newTabId(),
        pristineCode: seed.code,
      }));
      tabsRef.current = newTabs;
      activeTabIdRef.current = newTabs[0].id;
      setTabs(newTabs);
      saveTabs(sample.id, newTabs);
      setActiveTabId(newTabs[0].id);
      const view = editorRef.current;
      if (view) replaceDoc(view, newTabs[0].code);
      setResultsByTab({});
    },
    [
      engineRef,
      editorRef,
      tabsRef,
      activeTabIdRef,
      activeDbIdRef,
      pragmaSettingsRef,
      setCustomDb,
      setActiveDbId,
      setTables,
      setViews,
      setIndexes,
      setTriggers,
      setColumnsByEntity,
      setForeignKeysByEntity,
      setTabs,
      setActiveTabId,
      setResultsByTab,
    ],
  );

  const performDbSwitch = useCallback(
    (nextId: string) => {
      const engine = engineRef.current;
      if (!engine) return;
      void (async () => {
        if (nextId === "__blank__") {
          const sample = await engine.loadBlankDatabase();
          setCustomFilenames((prev) => {
            if (!(sample.id in prev)) return prev;
            const next = { ...prev };
            delete next[sample.id];
            return next;
          });
          await applyDbLoad(sample);
          showToast("Created blank database.");
        } else {
          const sample = await engine.loadSampleDatabase(nextId);
          await applyDbLoad(sample);
          showToast(`Loaded ${sample.filename}.`);
        }
      })();
    },
    [applyDbLoad, showToast, engineRef, setCustomFilenames],
  );

  const performImportSqlite = useCallback(
    (bytes: Uint8Array, filename: string) => {
      const engine = engineRef.current;
      if (!engine) return;
      void (async () => {
      try {
        const sample = await engine.loadFromBytes(bytes, filename);
        await applyDbLoad(sample);
        setImportSqliteOpen(false);
        showToast(`Imported ${filename}.`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        showToast(`Import failed: ${msg}`, "warn");
      }
      })();
    },
    [applyDbLoad, showToast, engineRef, setImportSqliteOpen],
  );

  const performImportSqlDump = useCallback(
    (sqlText: string, filename: string) => {
      const engine = engineRef.current;
      if (!engine) return;
      void (async () => {
        try {
          // Load a fresh blank database then execute the dump on top of it.
          const sample = await engine.loadBlankDatabase();
          setCustomFilenames((prev) => {
            if (!(sample.id in prev)) return prev;
            const next = { ...prev };
            delete next[sample.id];
            return next;
          });
          await engine.execAll(sqlText);
          await applyDbLoad(sample);
          setImportSqliteOpen(false);
          showToast(`Imported "${filename}".`);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          showToast(`Import failed: ${msg}`, "warn");
        }
      })();
    },
    [applyDbLoad, showToast, engineRef, setCustomFilenames, setImportSqliteOpen],
  );

  /** Unified entry point for the single "import a database file" dialog.
   *  Sniffs the file's magic header to decide between the binary SQLite
   *  path and the SQL-dump path, so any extension (.sql, .db, .sqlite,
   *  .sqlite3, .db3, …) imports correctly. */
  const performImportDatabaseFile = useCallback(
    (bytes: Uint8Array, filename: string) => {
      if (isSqliteBinary(bytes)) {
        performImportSqlite(bytes, filename);
      } else {
        performImportSqlDump(new TextDecoder().decode(bytes), filename);
      }
    },
    [performImportSqlite, performImportSqlDump],
  );

  /** Serializes the active database to a replayable SQL dump (DDL + data).
   *  Shared by the "SQL dump (.sql)" export download and the cloud/share
   *  bundle builder (see ShareControls). Returns null while the engine
   *  is still booting. */
  const buildSqlDumpText = useCallback(async (): Promise<string | null> => {
    const engine = engineRef.current;
    if (!engine) return null;
    const [tableList, viewList, triggerList] = await Promise.all([
      engine.listTables(),
      engine.listViews(),
      engine.listTriggers(),
    ]);

    const lines: string[] = [
      // foreign_keys OFF lets tables import regardless of FK ordering.
      // No explicit BEGIN/COMMIT: the OPFS-backed worker manages its own
      // transaction, and wrapping the dump in one makes the import fail
      // ("no such table") as the engine's commit resets the open
      // user transaction mid-script.
      "PRAGMA foreign_keys = OFF;",
      "",
    ];

    // DDL + INSERT statements for each table
    for (const name of tableList) {
      const ddl = await engine.getDDL(name);
      lines.push(`${ddl};`, "");

      // Generated columns are computed by the engine and can't be inserted
      // into, so omit them from the INSERT column list / values (otherwise
      // the re-import fails with "cannot INSERT into generated column").
      const colInfo = await engine.listColumns(name);
      const generatedCols = new Set(
        colInfo.filter((c) => c.generated).map((c) => c.name),
      );
      const results = await engine.exec(
        `SELECT * FROM "${name.replace(/"/g, '""')}"`,
      );
      if (results && results.length > 0) {
        const { columns, values } = results[0];
        const keepIdx = columns
          .map((c, i) => (generatedCols.has(c) ? -1 : i))
          .filter((i) => i >= 0);
        const colList = keepIdx
          .map((i) => `"${columns[i].replace(/"/g, '""')}"`)
          .join(", ");
        for (const row of values) {
          const valList = keepIdx
            .map((i) => {
              const v = row[i];
              if (v === null) return "NULL";
              if (typeof v === "number" || typeof v === "bigint")
                return String(v);
              if (v instanceof Uint8Array)
                return `X'${Array.from(v)
                  .map((b) => b.toString(16).padStart(2, "0"))
                  .join("")}'`;
              return `'${String(v).replace(/'/g, "''")}'`;
            })
            .join(", ");
          lines.push(
            `INSERT INTO "${name.replace(/"/g, '""')}" (${colList}) VALUES (${valList});`,
          );
        }
        lines.push("");
      }
    }

    // DDL for views and triggers. Indexes are intentionally NOT re-emitted
    // here: getDDL(table) already includes each table's CREATE INDEX
    // statements, so listing them again would fail the re-import with
    // "index … already exists".
    for (const name of [...viewList, ...triggerList]) {
      const ddl = await engine.getDDL(name);
      lines.push(`${ddl};`, "");
    }

    return lines.join("\n");
  }, [engineRef]);

  /** Display label for the active database, e.g. "chinook.sqlite", the
   *  rename-aware filename shown in the DB selector. */
  const activeDatabaseLabel = useCallback(async (): Promise<string> => {
    const engine = engineRef.current;
    if (!engine) return "database";
    const sample = await engine.activeSample();
    const overriddenFilename = customFilenames[activeDbId];
    return overriddenFilename ?? sample.filename ?? sample.id ?? "database";
  }, [activeDbId, customFilenames, engineRef]);

  /**
   * Replays a cloud/share bundle into a fresh session database: blank DB →
   * execute the dump → swap it in → replace the tabs with the bundle's
   * queries. The same shape as performImportSqlDump, except the tabs come
   * from the bundle instead of the blank database's stored/default tabs.
   */
  const applySqlBundle = useCallback(
    async (dump: string, tabSeeds: { title: string; code: string }[]) => {
      const engine = engineRef.current;
      if (!engine) throw new Error("The SQL engine isn't ready yet.");
      const sample = await engine.loadBlankDatabase();
      setCustomFilenames((prev) => {
        if (!(sample.id in prev)) return prev;
        const next = { ...prev };
        delete next[sample.id];
        return next;
      });
      if (dump.trim()) await engine.execAll(dump);
      await applyDbLoad(sample);
      const newTabs = tabSeeds.map((seed) => ({
        title: seed.title,
        code: seed.code,
        id: newTabId(),
        pristineCode: seed.code,
      }));
      tabsRef.current = newTabs;
      activeTabIdRef.current = newTabs[0].id;
      setTabs(newTabs);
      saveTabs(sample.id, newTabs);
      setActiveTabId(newTabs[0].id);
      const view = editorRef.current;
      if (view) replaceDoc(view, newTabs[0].code);
      setResultsByTab({});
    },
    [
      applyDbLoad,
      engineRef,
      editorRef,
      tabsRef,
      activeTabIdRef,
      setCustomFilenames,
      setTabs,
      setActiveTabId,
      setResultsByTab,
    ],
  );

  const exportDatabaseAsSqlDump = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    void (async () => {
      try {
        const sqlText = await buildSqlDumpText();
        if (sqlText === null) return;
        const sample = await engine.activeSample();
        const overriddenFilename = customFilenames[activeDbId];
        const effectiveFilename = overriddenFilename ?? sample.filename ?? "";
        const baseName = effectiveFilename
          ? effectiveFilename.replace(/\.[^.]+$/, "")
          : sample.id || "database";
        const filename = `${baseName}.sql`;

        const blob = new Blob([sqlText], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        showToast(`Exported ${filename}.`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        showToast(`Export failed: ${msg}`, "warn");
      }
    })();
  }, [activeDbId, buildSqlDumpText, customFilenames, showToast, engineRef]);

  const requestDbSwitch = useCallback(
    (nextId: string) => {
      // For blank database, always show the dialog (it's always a "switch").
      // For sample databases, skip if already active.
      if (nextId !== "__blank__" && nextId === activeDbId) return;
      setPendingDbId(nextId);
    },
    [activeDbId, setPendingDbId],
  );

  const exportDatabase = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    void (async () => {
    try {
      const bytes = await engine.exportDatabase();
      const sample = await engine.activeSample();
      const overriddenFilename = customFilenames[activeDbId];
      const effectiveFilename = overriddenFilename ?? sample.filename ?? "";
      const baseName = effectiveFilename
        ? effectiveFilename.replace(/\.[^.]+$/, "")
        : sample.id || "database";
      const filename = `${baseName}.sqlite`;
      const blob = new Blob([bytes.slice()], {
        type: "application/vnd.sqlite3",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      showToast(`Exported ${filename}.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`Export failed: ${msg}`, "warn");
    }
    })();
  }, [activeDbId, customFilenames, showToast, engineRef]);

  const exportDatabaseToXlsx = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    const tableList = [...tables];
    (async () => {
      try {
        const sample = await engine.activeSample();
        const overriddenFilename = customFilenames[activeDbId];
        const effectiveFilename = overriddenFilename ?? sample.filename ?? "";
        const baseName = effectiveFilename
          ? effectiveFilename.replace(/\.[^.]+$/, "")
          : sample.id || "database";
        const filename = `${baseName}.xlsx`;
        const mod = await initXlsxWasm();
        const workbook = new mod.Workbook();
        let sheetCount = 0;
        for (const tableName of tableList) {
          const sets = await engine.exec(`SELECT * FROM ${quoteIdent(tableName)}`);
          if (!sets || sets.length === 0) continue;
          const { columns, values: rows } = sets[0];
          const sheetName = tableName.length > 31 ? tableName.slice(0, 31) : tableName;
          const worksheet = workbook.addWorksheet();
          worksheet.setName(sheetName);
          worksheet.writeRow(0, 0, columns);
          for (let ri = 0; ri < rows.length; ri++) {
            worksheet.writeRow(ri + 1, 0, rows[ri].map(toExcelData));
          }
          sheetCount++;
        }
        if (sheetCount === 0) {
          showToast("No tables to export.", "warn");
          return;
        }
        const bytes = workbook.saveToBufferSync();
        triggerDownload(
          new Blob([bytes], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          }),
          filename,
        );
        showToast(`Exported ${filename}.`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        showToast(`Export failed: ${msg}`, "warn");
      }
    })();
  }, [activeDbId, customFilenames, tables, quoteIdent, showToast, engineRef]);

  // ─── CSV parse helper ─────────────────────────────────────────────
  const handleCsvFile = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const { headers, rows } = parseCsv(text);
          if (headers.length === 0) {
            showToast("CSV file appears to be empty.", "warn");
            return;
          }
          setImportCsvState({
            tableName: tableNameFromFilename(file.name),
            headers,
            rows,
            rawText: text,
            targetMode: "new",
            targetTable: tables[0] ?? "",
            colCompare: null,
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          showToast(`Could not parse CSV: ${msg}`, "warn");
        }
      };
      reader.readAsText(file);
    },
    [showToast, tables, setImportCsvState],
  );

  const submitCsvImport = useCallback(() => {
    const engine = engineRef.current;
    const state = useDialogStore.getState().importCsvState;
    const currentTables = useEngineStore.getState().tables;
    if (!engine || !state) return;
    void (async () => {
    const { headers, rows, targetMode, targetTable, tableName } = state;
    const resolvedTarget = targetTable || currentTables[0] || "";
    const isExisting = targetMode === "existing" && resolvedTarget;
    const effectiveTable = isExisting ? resolvedTarget : tableName.trim();
    if (!effectiveTable) {
      showToast("Table name cannot be empty.", "warn");
      return;
    }
    try {
      const safeCols = headers.map((h) => {
        const s = sanitizeImportColName(h).replace(/"/g, '""');
        return `"${s}"`;
      });
      const tableIdent = `"${effectiveTable.replace(/"/g, '""')}"`;
      if (!isExisting) {
        await engine.exec(
          `CREATE TABLE ${tableIdent} (${safeCols.map((c) => `${c} TEXT`).join(", ")})`,
        );
      }
      await engine.exec("BEGIN");
      try {
        for (const row of rows) {
          const vals = row
            .map((v) => (v === "" ? "NULL" : `'${v.replace(/'/g, "''")}'`))
            .join(", ");
          if (isExisting) {
            await engine.exec(
              `INSERT INTO ${tableIdent} (${safeCols.join(", ")}) VALUES (${vals})`,
            );
          } else {
            await engine.exec(`INSERT INTO ${tableIdent} VALUES (${vals})`);
          }
        }
        await engine.exec("COMMIT");
      } catch (insertErr) {
        try { await engine.exec("ROLLBACK"); } catch { /* ignore */ }
        throw insertErr;
      }
      setTables(await engine.listTables());
      setImportCsvOpen(false);
      setImportCsvState(null);
      showToast(
        `Imported ${rows.length} row${rows.length === 1 ? "" : "s"} into "${effectiveTable}".`,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`CSV import failed: ${msg}`, "warn");
    }
    })();
  }, [engineRef, showToast, setTables, setImportCsvOpen, setImportCsvState]);

  const handleJsonFile = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const parsed = JSON.parse(text) as unknown;
          if (!Array.isArray(parsed)) {
            showToast(
              "JSON must be an array of objects (e.g. [{...}, {...}]).",
              "warn",
            );
            return;
          }
          if (parsed.length === 0) {
            showToast("JSON array is empty.", "warn");
            return;
          }
          const keySet = new Set<string>();
          for (const obj of parsed) {
            if (obj && typeof obj === "object" && !Array.isArray(obj)) {
              for (const k of Object.keys(obj as Record<string, unknown>)) {
                keySet.add(k);
              }
            }
          }
          const headers = Array.from(keySet);
          if (headers.length === 0) {
            showToast("JSON objects appear to have no keys.", "warn");
            return;
          }
          const rows = parsed.map((obj) => {
            const record = obj as Record<string, unknown>;
            return headers.map((h) => {
              const v = record[h];
              if (v === null || v === undefined) return "";
              if (typeof v === "object") return JSON.stringify(v);
              return String(v);
            });
          });
          setImportJsonState({
            tableName: tableNameFromFilename(file.name),
            headers,
            rows,
            rawText: text,
            targetMode: "new",
            targetTable: tables[0] ?? "",
            colCompare: null,
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          showToast(`Could not parse JSON: ${msg}`, "warn");
        }
      };
      reader.readAsText(file);
    },
    [showToast, tables, setImportJsonState],
  );

  const submitJsonImport = useCallback(() => {
    const engine = engineRef.current;
    const state = useDialogStore.getState().importJsonState;
    const currentTables = useEngineStore.getState().tables;
    if (!engine || !state) return;
    void (async () => {
    const { headers, rows, targetMode, targetTable, tableName } = state;
    const resolvedTarget = targetTable || currentTables[0] || "";
    const isExisting = targetMode === "existing" && resolvedTarget;
    const effectiveTable = isExisting ? resolvedTarget : tableName.trim();
    if (!effectiveTable) {
      showToast("Table name cannot be empty.", "warn");
      return;
    }
    try {
      const safeCols = headers.map((h) => {
        const s = sanitizeImportColName(h).replace(/"/g, '""');
        return `"${s}"`;
      });
      const tableIdent = `"${effectiveTable.replace(/"/g, '""')}"`;
      if (!isExisting) {
        await engine.exec(
          `CREATE TABLE ${tableIdent} (${safeCols.map((c) => `${c} TEXT`).join(", ")})`,
        );
      }
      await engine.exec("BEGIN");
      try {
        for (const row of rows) {
          const vals = row
            .map((v) => (v === "" ? "NULL" : `'${v.replace(/'/g, "''")}'`))
            .join(", ");
          if (isExisting) {
            await engine.exec(
              `INSERT INTO ${tableIdent} (${safeCols.join(", ")}) VALUES (${vals})`,
            );
          } else {
            await engine.exec(`INSERT INTO ${tableIdent} VALUES (${vals})`);
          }
        }
        await engine.exec("COMMIT");
      } catch (insertErr) {
        try { await engine.exec("ROLLBACK"); } catch { /* ignore */ }
        throw insertErr;
      }
      setTables(await engine.listTables());
      setImportJsonOpen(false);
      setImportJsonState(null);
      showToast(
        `Imported ${rows.length} row${rows.length === 1 ? "" : "s"} into "${effectiveTable}".`,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`JSON import failed: ${msg}`, "warn");
    }
    })();
  }, [engineRef, showToast, setTables, setImportJsonOpen, setImportJsonState]);

  const handleParquetFile = useCallback(
    async (file: File) => {
      try {
        showToast("Reading parquet file…");
        const { columns, rows } = await readParquetFile(file);
        if (columns.length === 0) {
          showToast("Parquet file appears to have no columns.", "warn");
          return;
        }
        setImportParquetState({
          tableName: tableNameFromFilename(file.name),
          columns,
          rows,
          targetMode: "new",
          targetTable: tables[0] ?? "",
          colCompare: null,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        showToast(`Parquet import failed: ${msg}`, "warn");
      }
    },
    [showToast, tables, setImportParquetState],
  );

  const submitParquetImport = useCallback(() => {
    const engine = engineRef.current;
    const state = useDialogStore.getState().importParquetState;
    const currentTables = useEngineStore.getState().tables;
    if (!engine || !state) return;
    void (async () => {
    const { columns, rows, targetMode, targetTable, tableName } = state;
    const resolvedTarget = targetTable || currentTables[0] || "";
    const isExisting = targetMode === "existing" && resolvedTarget;
    const effectiveTable = isExisting ? resolvedTarget : tableName.trim();
    if (!effectiveTable) {
      showToast("Table name cannot be empty.", "warn");
      return;
    }
    try {
      const safeCols = columns.map((h) => {
        const s = sanitizeImportColName(h).replace(/"/g, '""');
        return `"${s}"`;
      });
      const tableIdent = `"${effectiveTable.replace(/"/g, '""')}"`;
      if (!isExisting) {
        await engine.exec(
          `CREATE TABLE ${tableIdent} (${safeCols.map((c) => `${c} TEXT`).join(", ")})`,
        );
      }
      await engine.exec("BEGIN");
      try {
        for (const row of rows) {
          const vals = row
            .map((v) =>
              v === null || v === undefined
                ? "NULL"
                : `'${String(v).replace(/'/g, "''")}'`,
            )
            .join(", ");
          if (isExisting) {
            await engine.exec(
              `INSERT INTO ${tableIdent} (${safeCols.join(", ")}) VALUES (${vals})`,
            );
          } else {
            await engine.exec(`INSERT INTO ${tableIdent} VALUES (${vals})`);
          }
        }
        await engine.exec("COMMIT");
      } catch (insertErr) {
        try { await engine.exec("ROLLBACK"); } catch { /* ignore */ }
        throw insertErr;
      }
      setTables(await engine.listTables());
      setImportParquetOpen(false);
      setImportParquetState(null);
      showToast(
        `Imported ${rows.length} row${rows.length === 1 ? "" : "s"} into "${effectiveTable}".`,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`Parquet import failed: ${msg}`, "warn");
    }
    })();
  }, [engineRef, showToast, setTables, setImportParquetOpen, setImportParquetState]);

  return {
    applyDbLoad,
    applySqlBundle,
    activeDatabaseLabel,
    buildSqlDumpText,
    performDbSwitch,
    performImportDatabaseFile,
    requestDbSwitch,
    exportDatabase,
    exportDatabaseToXlsx,
    exportDatabaseAsSqlDump,
    handleCsvFile,
    submitCsvImport,
    handleJsonFile,
    submitJsonImport,
    handleParquetFile,
    submitParquetImport,
    showToast,
  };
}
