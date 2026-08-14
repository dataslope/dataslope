"use client";

import { useCallback } from "react";
import { startTransition } from "react";
import { Toast } from "@base-ui/react/toast";
import type { SqliteEngine, ColumnSpec, ForeignKeyInfo } from "../../runtime/sqlite";
import {
  exportResultToCsv,
  exportResultToJson,
  exportResultToSql,
  exportResultToParquet,
  exportResultToXlsx,
} from "../utils/exportUtils";
import { useEngineStore } from "../stores/useEngineStore";
import { useDialogStore } from "../stores/useDialogStore";
import { useTabStore } from "../stores/useTabStore";
import { DROP_KIND_LABELS, FK_ACTIONS } from "../constants";
import type { ModifyColumnDraft } from "../types";
import { modifyDialogSignature } from "../types";
import { dbScopedKey } from "../../sqlitePlaygroundTabs";

function newDraftId(): string {
  return `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export interface SidebarActionsRefs {
  engineRef: React.MutableRefObject<SqliteEngine | null>;
  activeTabIdRef: React.MutableRefObject<string>;
  activeDbIdRef: React.MutableRefObject<string>;
}

export function useSidebarActions(
  refs: SidebarActionsRefs,
  openTabAndRun: (title: string, sql: string, source?: string, sourceTable?: string) => void,
) {
  const { engineRef, activeDbIdRef } = refs;

  const toastManager = Toast.useToastManager();
  const showToast = useCallback(
    (msg: string, kind: "info" | "warn" = "info") => {
      startTransition(() => {
        toastManager.add({ title: msg, data: { kind } });
      });
    },
    [toastManager],
  );

  const tables = useEngineStore((s) => s.tables);
  const setTables = useEngineStore((s) => s.setTables);
  const setViews = useEngineStore((s) => s.setViews);
  const setIndexes = useEngineStore((s) => s.setIndexes);
  const setTriggers = useEngineStore((s) => s.setTriggers);
  const setColumnsByEntity = useEngineStore((s) => s.setColumnsByEntity);
  const setForeignKeysByEntity = useEngineStore((s) => s.setForeignKeysByEntity);
  const setConstraintsByEntity = useEngineStore((s) => s.setConstraintsByEntity);
  const setExpandedEntities = useEngineStore((s) => s.setExpandedEntities);

  const setResultsByTab = useTabStore((s) => s.setResultsByTab);

  const setPendingDropEntity = useDialogStore((s) => s.setPendingDropEntity);
  const setDdlDialog = useDialogStore((s) => s.setDdlDialog);
  const setModifyDialog = useDialogStore((s) => s.setModifyDialog);
  const setModifyInvalidColIds = useDialogStore((s) => s.setModifyInvalidColIds);
  const setAddRowDialog = useDialogStore((s) => s.setAddRowDialog);
  const setAddTableDialog = useDialogStore((s) => s.setAddTableDialog);
  const setAddTableInvalidColIds = useDialogStore((s) => s.setAddTableInvalidColIds);
  const setTruncateConfirm = useDialogStore((s) => s.setTruncateConfirm);
  const setModifyStructureRefreshKey = useDialogStore((s) => s.setModifyStructureRefreshKey);

  const quoteIdent = useCallback(
    (name: string) => `"${name.replace(/"/g, '""')}"`,
    [],
  );

  const refreshEntityMetadata = useCallback((name: string) => {
    const engine = engineRef.current;
    if (!engine) return;
    void (async () => {
    try {
      const [cols, fks] = await Promise.all([
        engine.listColumns(name),
        engine.listForeignKeys(name),
      ]);
      setColumnsByEntity((prev) => ({ ...prev, [name]: cols }));
      setForeignKeysByEntity((prev) => ({ ...prev, [name]: fks }));
      try {
        const constraints = await engine.getColumnConstraintInfo(name);
        setConstraintsByEntity((prev) => ({ ...prev, [name]: constraints }));
      } catch {
        setConstraintsByEntity((prev) => {
          const next = { ...prev };
          delete next[name];
          return next;
        });
      }
    } catch {
      setColumnsByEntity((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
      setForeignKeysByEntity((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
      setConstraintsByEntity((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
    })();
  }, [engineRef, setColumnsByEntity, setForeignKeysByEntity, setConstraintsByEntity]);

  const refreshTableMetadata = useCallback(() => {
    for (const tableName of tables) {
      refreshEntityMetadata(tableName);
    }
  }, [tables, refreshEntityMetadata]);

  const describeEntity = useCallback(
    (name: string, kind: "table" | "view") => {
      const label = kind === "view" ? "View structure" : "Structure";
      openTabAndRun(
        `Structure: ${name}`,
        `PRAGMA table_info(${quoteIdent(name)});`,
        `${label}: ${name}`,
      );
    },
    [openTabAndRun, quoteIdent],
  );

  const countEntityRows = useCallback(
    (name: string, kind: "table" | "view") => {
      const label = kind === "view" ? "View row count" : "Row count";
      openTabAndRun(
        `Count: ${name}`,
        `SELECT COUNT(*) AS row_count FROM ${quoteIdent(name)};`,
        `${label}: ${name}`,
      );
    },
    [openTabAndRun, quoteIdent],
  );

  const copyEntityName = useCallback(
    (name: string) => {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        navigator.clipboard
          .writeText(name)
          .then(() => showToast(`Copied "${name}".`))
          .catch(() => showToast("Couldn't copy to clipboard.", "warn"));
      } else {
        showToast("Clipboard not available in this browser.", "warn");
      }
    },
    [showToast],
  );

  const dropEntity = useCallback(
    (name: string, kind: "table" | "view") => {
      setPendingDropEntity({ name, kind });
    },
    [setPendingDropEntity],
  );

  const dropLeafEntity = useCallback(
    (name: string, kind: "index" | "trigger") => {
      setPendingDropEntity({ name, kind });
    },
    [setPendingDropEntity],
  );

  const confirmDrop = useCallback(() => {
    const pending = useDialogStore.getState().pendingDropEntity;
    if (!pending) return;
    const engine = engineRef.current;
    if (!engine) return;
    const { name, kind } = pending;
    void (async () => {
    try {
      await engine.dropEntity(name, kind);
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
      if (kind === "table" || kind === "view") {
        setResultsByTab((prev) => {
          const next = { ...prev };
          for (const tabId of Object.keys(next)) {
            if (next[tabId]?.sourceTable === name) {
              delete next[tabId];
            }
          }
          return next;
        });
        setExpandedEntities((prev) => {
          if (!prev.has(name)) return prev;
          const next = new Set(prev);
          next.delete(name);
          return next;
        });
        setColumnsByEntity((prev) => {
          if (!(name in prev)) return prev;
          const rest = { ...prev };
          delete rest[name];
          return rest;
        });
        setForeignKeysByEntity((prev) => {
          if (!(name in prev)) return prev;
          const rest = { ...prev };
          delete rest[name];
          return rest;
        });
        setConstraintsByEntity((prev) => {
          if (!(name in prev)) return prev;
          const rest = { ...prev };
          delete rest[name];
          return rest;
        });
      }
      const label = DROP_KIND_LABELS[kind].toLowerCase();
      showToast(`Dropped ${label} "${name}".`);
      if (kind === "index" || kind === "trigger") {
        setModifyStructureRefreshKey((v) => v + 1);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`Drop failed: ${msg}`, "warn");
    }
    setPendingDropEntity(null);
    })();
  }, [
    engineRef,
    setTables,
    setViews,
    setIndexes,
    setTriggers,
    setResultsByTab,
    setExpandedEntities,
    setColumnsByEntity,
    setForeignKeysByEntity,
    setConstraintsByEntity,
    setModifyStructureRefreshKey,
    showToast,
    setPendingDropEntity,
  ]);

  const viewLeafDDL = useCallback(
    (name: string, kind: "index" | "trigger") => {
      const engine = engineRef.current;
      if (!engine) return;
      void (async () => {
      try {
        const sql = await engine.getDDL(name);
        if (!sql.trim()) {
          showToast(`No DDL recorded for ${kind} "${name}".`, "warn");
          return;
        }
        setDdlDialog({ title: name, sql });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        showToast(`Couldn't read DDL: ${msg}`, "warn");
      }
      })();
    },
    [engineRef, showToast, setDdlDialog],
  );

  const truncateEntity = useCallback((name: string) => {
    setTruncateConfirm(name);
  }, [setTruncateConfirm]);

  const confirmTruncate = useCallback(() => {
    const engine = engineRef.current;
    const name = useDialogStore.getState().truncateConfirm;
    if (!engine || !name) return;
    void (async () => {
    try {
      await engine.truncateTable(name);
      showToast(`Truncated table "${name}".`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`Truncate failed: ${msg}`, "warn");
    } finally {
      setTruncateConfirm(null);
    }
    })();
  }, [engineRef, showToast, setTruncateConfirm]);

  const openModifyStructure = useCallback(
    (name: string) => {
      const engine = engineRef.current;
      if (!engine) return;
      void (async () => {
      try {
        const [cols, fks, ddl] = await Promise.all([
          engine.listColumns(name),
          engine.listForeignKeys(name),
          engine.getDDL(name),
        ]);
        const fkByCol = new Map<string, ForeignKeyInfo>();
        for (const fk of fks) fkByCol.set(fk.from, fk);
        const autoIncMatch =
          /\bautoincrement\b/i.test(ddl) && cols.some((c) => c.pk === 1);
        const drafts: ModifyColumnDraft[] = cols.map((c) => {
          const fk = fkByCol.get(c.name);
          return {
            id: newDraftId(),
            originalName: c.name,
            name: c.name,
            type: c.type || "TEXT",
            notNull: c.notNull,
            primaryKey: c.pk > 0,
            autoIncrement:
              autoIncMatch && c.pk === 1 && /^integer$/i.test(c.type ?? ""),
            unique: false,
            defaultValue: c.defaultValue ?? "",
            fkTable: fk?.table ?? "",
            fkColumn: fk?.to ?? "",
            fkOnDelete: fk?.onDelete ?? "NO ACTION",
            fkOnUpdate: fk?.onUpdate ?? "NO ACTION",
            generated: c.generated ?? null,
          };
        });
        setModifyDialog({
          originalName: name,
          newName: name,
          columns: drafts,
          originalSignature: modifyDialogSignature({ newName: name, columns: drafts }),
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        showToast(`Couldn't load structure: ${msg}`, "warn");
      }
      })();
    },
    [engineRef, showToast, setModifyDialog],
  );

  const submitModifyStructure = useCallback(() => {
    const engine = engineRef.current;
    const dialog = useDialogStore.getState().modifyDialog;
    if (!engine || !dialog) return;
    const trimmedName = dialog.newName.trim();
    if (!trimmedName) {
      showToast("Table name cannot be empty.", "warn");
      return;
    }
    // Only validate names for non-generated columns; generated column
    // names cannot be changed through the UI.
    const blankCols = dialog.columns.filter((c) => !c.generated && !c.name.trim());
    if (blankCols.length > 0) {
      showToast("Column names cannot be empty.", "warn");
      setModifyInvalidColIds(new Set(blankCols.map((c) => c.id)));
      return;
    }
    const spec = {
      originalName: dialog.originalName,
      newName: trimmedName,
      columns: dialog.columns.map<ColumnSpec>((c) => ({
        name: c.name.trim(),
        type: c.type,
        notNull: c.notNull,
        primaryKey: c.primaryKey,
        autoIncrement: c.autoIncrement,
        unique: c.unique,
        defaultValue: c.defaultValue.trim() || undefined,
        foreignKey:
          c.fkTable && c.fkColumn
            ? {
                table: c.fkTable.trim(),
                column: c.fkColumn.trim(),
                onDelete: c.fkOnDelete || "NO ACTION",
                onUpdate: c.fkOnUpdate || "NO ACTION",
              }
            : undefined,
        originalName: c.originalName ?? undefined,
        generated: c.generated ?? undefined,
      })),
    };
    void (async () => {
    try {
      await engine.rebuildTable(spec);
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
      refreshEntityMetadata(trimmedName);
      if (trimmedName !== dialog.originalName) {
        setExpandedEntities((prev) => {
          if (!prev.has(dialog.originalName)) return prev;
          const next = new Set(prev);
          next.delete(dialog.originalName);
          next.add(trimmedName);
          return next;
        });
      }
      setModifyDialog(null);
      setModifyInvalidColIds(new Set());
      showToast(`Updated table "${trimmedName}".`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`Save failed: ${msg}`, "warn");
    }
    })();
  }, [
    engineRef,
    refreshEntityMetadata,
    showToast,
    setTables,
    setViews,
    setIndexes,
    setTriggers,
    setExpandedEntities,
    setModifyDialog,
    setModifyInvalidColIds,
  ]);

  const openAddRow = useCallback(
    (name: string) => {
      const engine = engineRef.current;
      if (!engine) return;
      void (async () => {
      try {
        const allCols = await engine.listColumns(name);
        // Generated columns are computed by SQLite, never accept input.
        const cols = allCols.filter((c) => c.generated === null);
        const initValues: Record<string, string> = {};
        for (const c of cols) initValues[c.name] = "";
        setAddRowDialog({
          tableName: name,
          columns: cols,
          values: initValues,
          addAnother: false,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        showToast(`Couldn't load columns: ${msg}`, "warn");
      }
      })();
    },
    [engineRef, showToast, setAddRowDialog],
  );

  const submitAddRow = useCallback(() => {
    const engine = engineRef.current;
    const dialog = useDialogStore.getState().addRowDialog;
    if (!engine || !dialog) return;
    const { tableName, columns, values, addAnother } = dialog;
    // For a blank input on a column with a DEFAULT, omit it so SQLite
    // applies the default (otherwise we'd insert NULL).
    const colNames: string[] = [];
    const rowValues: unknown[] = [];
    for (const c of columns) {
      const raw = values[c.name] ?? "";
      if (raw === "" && c.defaultValue !== null) continue;
      colNames.push(c.name);
      rowValues.push(raw === "" ? null : raw);
    }
    void (async () => {
    try {
      await engine.insertRow(tableName, colNames, rowValues);
      showToast(`Row added to "${tableName}".`);
      if (addAnother) {
        const newValues: Record<string, string> = {};
        for (const c of columns) newValues[c.name] = "";
        setAddRowDialog({ ...dialog, values: newValues });
      } else {
        setAddRowDialog(null);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`Insert failed: ${msg}`, "warn");
    }
    })();
  }, [engineRef, showToast, setAddRowDialog]);

  const openAddTable = useCallback(() => {
    setAddTableDialog({
      originalName: "",
      newName: "new_table",
      columns: [
        {
          id: newDraftId(),
          originalName: null,
          name: "id",
          type: "INTEGER",
          notNull: false,
          primaryKey: true,
          autoIncrement: true,
          unique: false,
          defaultValue: "",
          fkTable: "",
          fkColumn: "",
          fkOnDelete: "NO ACTION",
          fkOnUpdate: "NO ACTION",
          generated: null,
        },
      ],
      // New tables are always dirty (there's no previous state to compare).
      originalSignature: "",
    });
  }, [setAddTableDialog]);

  const submitAddTable = useCallback(() => {
    const engine = engineRef.current;
    const dialog = useDialogStore.getState().addTableDialog;
    if (!engine || !dialog) return;
    const trimmedName = dialog.newName.trim();
    if (!trimmedName) {
      showToast("Table name cannot be empty.", "warn");
      return;
    }
    const cols = dialog.columns;
    const blankCols = cols.filter((c) => !c.name.trim());
    if (blankCols.length > 0) {
      showToast("Column names cannot be empty.", "warn");
      setAddTableInvalidColIds(new Set(blankCols.map((c) => c.id)));
      return;
    }
    const quoteIdent = (s: string) => `"${s.replace(/"/g, '""')}"`;
    const normalizeFkAction = (a: string): string =>
      (FK_ACTIONS as readonly string[]).includes(a) ? a : "NO ACTION";
    const colDefs = cols.map((c) => {
      const parts: string[] = [`${quoteIdent(c.name.trim())} ${c.type}`];
      if (c.notNull) parts.push("NOT NULL");
      if (c.primaryKey) {
        parts.push("PRIMARY KEY");
        if (c.autoIncrement) parts.push("AUTOINCREMENT");
      }
      if (c.unique && !c.primaryKey) parts.push("UNIQUE");
      if (c.defaultValue.trim()) parts.push(`DEFAULT ${c.defaultValue.trim()}`);
      return parts.join(" ");
    });
    const fkConstraints = cols
      .filter((c) => c.fkTable && c.fkColumn)
      .map(
        (c) =>
          `FOREIGN KEY (${quoteIdent(c.name.trim())}) REFERENCES ${quoteIdent(c.fkTable)}(${quoteIdent(c.fkColumn)}) ON DELETE ${normalizeFkAction(c.fkOnDelete)} ON UPDATE ${normalizeFkAction(c.fkOnUpdate)}`,
      );
    const allDefs = [...colDefs, ...fkConstraints].join(", ");
    const sql = `CREATE TABLE ${quoteIdent(trimmedName)} (${allDefs})`;
    void (async () => {
    try {
      await engine.exec(sql);
      setTables(await engine.listTables());
      setAddTableDialog(null);
      setAddTableInvalidColIds(new Set());
      showToast(`Created table "${trimmedName}".`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`Create failed: ${msg}`, "warn");
    }
    })();
  }, [engineRef, showToast, setTables, setAddTableDialog, setAddTableInvalidColIds]);

  const viewDDL = useCallback(
    (name: string, kind: "table" | "view") => {
      const engine = engineRef.current;
      if (!engine) return;
      void (async () => {
      try {
        const sql = await engine.getDDL(name);
        if (!sql.trim()) {
          showToast(
            `No DDL recorded for ${kind === "view" ? "view" : "table"} "${name}".`,
            "warn",
          );
          return;
        }
        setDdlDialog({ title: name, sql });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        showToast(`Couldn't read DDL: ${msg}`, "warn");
      }
      })();
    },
    [engineRef, showToast, setDdlDialog],
  );

  const exportEntityToFormat = useCallback(
    (name: string, format: "csv" | "json" | "sql" | "parquet" | "xlsx") => {
      const engine = engineRef.current;
      if (!engine) return;
      void (async () => {
      try {
        const sets = await engine.exec(`SELECT * FROM ${quoteIdent(name)}`);
        if (!sets || sets.length === 0) {
          showToast(`"${name}" is empty, no data to export.`, "warn");
          return;
        }
        const { columns, values: rows } = sets[0];
        const filename = `${name}.${format}`;
        if (format === "csv") {
          exportResultToCsv(columns, rows, filename);
          showToast(`Exported ${filename}.`);
        } else if (format === "json") {
          exportResultToJson(columns, rows, filename);
          showToast(`Exported ${filename}.`);
        } else if (format === "parquet") {
          exportResultToParquet(columns, rows, filename)
            .then(() => showToast(`Exported ${filename}.`))
            .catch((err) => showToast(`Export failed: ${err instanceof Error ? err.message : String(err)}`, "warn"));
        } else if (format === "xlsx") {
          exportResultToXlsx(columns, rows, filename)
            .then(() => showToast(`Exported ${filename}.`))
            .catch((err) => showToast(`Export failed: ${err instanceof Error ? err.message : String(err)}`, "warn"));
        } else {
          exportResultToSql(columns, rows, filename);
          showToast(`Exported ${filename}.`);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        showToast(`Export failed: ${msg}`, "warn");
      }
      })();
    },
    [engineRef, quoteIdent, showToast],
  );

  const getEntityRowCount = useCallback(
    async (name: string): Promise<number> => {
      const engine = engineRef.current;
      if (!engine) return 0;
      try {
        const sets = await engine.exec(`SELECT COUNT(*) FROM ${quoteIdent(name)}`);
        if (!sets || sets.length === 0 || sets[0].values.length === 0) return 0;
        return Number(sets[0].values[0][0]) || 0;
      } catch {
        return 0;
      }
    },
    [engineRef, quoteIdent],
  );

  const toggleEntityExpanded = useCallback((name: string) => {
    setExpandedEntities((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      try {
        localStorage.setItem(
          dbScopedKey(activeDbIdRef.current, "expanded_entities"),
          JSON.stringify(Array.from(next)),
        );
      } catch {
        // ignore quota errors
      }
      return next;
    });
  }, [setExpandedEntities, activeDbIdRef]);

  const expandAllEntities = useCallback((names: string[]) => {
    setExpandedEntities((prev) => {
      const next = new Set(prev);
      for (const n of names) next.add(n);
      return next;
    });
  }, [setExpandedEntities]);

  const collapseAllEntities = useCallback((names: string[]) => {
    setExpandedEntities((prev) => {
      const next = new Set(prev);
      for (const n of names) next.delete(n);
      return next;
    });
  }, [setExpandedEntities]);

  // Run a DDL statement from the schema tree's "+" dialogs, then refresh
  // the sidebar. Resolves true on success.
  const createSchemaObject = useCallback(
    async (sql: string, successMessage: string): Promise<boolean> => {
      const engine = engineRef.current;
      if (!engine) return false;
      try {
        await engine.exec(sql);
        const [nextTables, nextViews, nextIndexes, nextTriggers] =
          await Promise.all([
            engine.listTables(),
            engine.listViews(),
            engine.listIndexes(),
            engine.listTriggers(),
          ]);
        setTables(nextTables);
        setViews(nextViews);
        setIndexes(nextIndexes);
        setTriggers(nextTriggers);
        showToast(successMessage);
        return true;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        showToast(`Create failed: ${msg}`, "warn");
        return false;
      }
    },
    [engineRef, setTables, setViews, setIndexes, setTriggers, showToast],
  );

  // Column names for a table, for the Create Index column picker.
  const listTableColumnNames = useCallback(
    async (table: string): Promise<string[]> => {
      const engine = engineRef.current;
      if (!engine) return [];
      const cols = await engine.listColumns(table);
      return cols.map((c) => c.name);
    },
    [engineRef],
  );

  return {
    createSchemaObject,
    listTableColumnNames,
    refreshEntityMetadata,
    refreshTableMetadata,
    describeEntity,
    countEntityRows,
    copyEntityName,
    dropEntity,
    dropLeafEntity,
    confirmDrop,
    viewLeafDDL,
    truncateEntity,
    confirmTruncate,
    openModifyStructure,
    submitModifyStructure,
    openAddRow,
    submitAddRow,
    openAddTable,
    submitAddTable,
    viewDDL,
    exportEntityToFormat,
    getEntityRowCount,
    toggleEntityExpanded,
    expandAllEntities,
    collapseAllEntities,
    showToast,
  };
}
