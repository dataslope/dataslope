"use client";

import { useCallback } from "react";
import type { DropImportPlan } from "../components/SqlFileDropTarget";
import type { ImportStepReporter } from "../utils/importProgress";
import type { DroppedFileSniff } from "../utils/droppedFile";
import { DROPPED_KIND_LABELS } from "../utils/droppedFile";
import { readXlsxWorkbook, type XlsxSheet } from "../utils/xlsxReader";
import { workbookToSqlScript } from "../utils/workbookImport";
import type { SqlDialect } from "../sqlCompletion";

type Runner = (
  report: ImportStepReporter,
) => void | Promise<unknown>;

export interface DropImportCapabilities {
  dialect: SqlDialect;
  /** How this engine is named in prose: "SQLite", "PostgreSQL", "DuckDB". */
  engineLabel: string;
  /** The binary database format this engine can open, if any. */
  databaseKind?: "sqlite" | "duckdb";
  /** Load a binary database image, replacing the open database. Present only
   *  when `databaseKind` is. */
  importDatabaseImage?: (
    bytes: Uint8Array,
    filename: string,
    report: ImportStepReporter,
  ) => void | Promise<unknown>;
  /** Replay a SQL script into a fresh database, replacing the open one. */
  importSqlScript: (
    sql: string,
    filename: string,
    report: ImportStepReporter,
  ) => void | Promise<unknown>;
  /** Same, but into a new workspace, leaving the current one alone. Omit
   *  where the playground has no such path. */
  importSqlScriptInNewWorkspace?: (
    sql: string,
    filename: string,
    report: ImportStepReporter,
  ) => void | Promise<unknown>;
  /** Open the playground's own import dialog, pre-loaded with the file. */
  openCsvImport: (file: File) => void;
  openJsonImport: (file: File) => void;
  openParquetImport: (file: File) => void;
  /** Load one worksheet into the CSV preview, where the reader names the
   *  table and adjusts column types before it is created. */
  openWorksheetImport: (sheet: XlsxSheet, filename: string) => void;
}

/** Read the file's bytes, naming the step so a large file's read is visible
 *  in the dialog's progress panel. */
async function bytesOf(file: File, report: ImportStepReporter): Promise<Uint8Array> {
  report("Reading file");
  return new Uint8Array(await file.arrayBuffer());
}

/**
 * Turns a dropped file into the confirmation a playground shows for it: what
 * the file is, and the things this engine can do with it. Every action routes
 * into an import path the playground already has, so a dropped file and the
 * matching Import menu entry end up in exactly the same place.
 */
export function useDropImportPlan(caps: DropImportCapabilities) {
  const {
    dialect,
    engineLabel,
    databaseKind,
    importDatabaseImage,
    importSqlScript,
    importSqlScriptInNewWorkspace,
    openCsvImport,
    openJsonImport,
    openParquetImport,
    openWorksheetImport,
  } = caps;

  /** The two ways a script can land, offered together where both exist. */
  const scriptActions = useCallback(
    (sql: () => Promise<string> | string, filename: string, verb: string) => {
      const actions = [
        {
          id: "replace",
          label: `${verb} in this workspace`,
          description:
            "Replaces the database you have open and resets its query tabs.",
          danger: true,
          run: (async (report) => {
            const text = await sql();
            return importSqlScript(text, filename, report);
          }) as Runner,
        },
      ];
      if (importSqlScriptInNewWorkspace) {
        actions.push({
          id: "new-workspace",
          label: `${verb} in a new workspace`,
          description:
            "Leaves this workspace and its query tabs exactly as they are.",
          danger: false,
          run: (async (report) => {
            const text = await sql();
            return importSqlScriptInNewWorkspace(text, filename, report);
          }) as Runner,
        });
      }
      return actions;
    },
    [importSqlScript, importSqlScriptInNewWorkspace],
  );

  return useCallback(
    async (file: File, sniff: DroppedFileSniff): Promise<DropImportPlan> => {
      const { kind, certain } = sniff;
      const looksLike = certain
        ? DROPPED_KIND_LABELS[kind]
        : `what looks like a ${DROPPED_KIND_LABELS[kind]}`;

      // ── A binary database image ──
      if (kind === "sqlite" || kind === "duckdb") {
        if (kind !== databaseKind || !importDatabaseImage) {
          return {
            title: `Can't open this ${DROPPED_KIND_LABELS[kind]} here`,
            summary: `This is a ${DROPPED_KIND_LABELS[kind]} file, and the ${engineLabel} playground can't read one.`,
            actions: [],
            unsupported:
              kind === "sqlite"
                ? "Open it in the SQLite playground, or export it as a .sql dump and drop that here."
                : "Open it in the DuckDB playground, or export it as a .sql dump and drop that here.",
          };
        }
        return {
          title: `Open ${file.name}?`,
          summary: `Dropped a ${looksLike}. Opening it replaces the database in this workspace.`,
          actions: [
            {
              id: "open-image",
              label: "Open as this workspace's database",
              description:
                "Replaces the database you have open and resets its query tabs.",
              danger: true,
              run: async (report) =>
                importDatabaseImage(await bytesOf(file, report), file.name, report),
            },
          ],
        };
      }

      // ── A SQL script ──
      if (kind === "sqldump") {
        return {
          title: `Run ${file.name}?`,
          summary: `Dropped a ${looksLike}. It is replayed into a fresh ${engineLabel} database.`,
          actions: scriptActions(() => file.text(), file.name, "Run the dump"),
        };
      }

      // ── Tabular files, which become one table each ──
      if (kind === "csv" || kind === "json" || kind === "parquet") {
        const open =
          kind === "csv"
            ? openCsvImport
            : kind === "json"
              ? openJsonImport
              : openParquetImport;
        return {
          title: `Import ${file.name}?`,
          summary: `Dropped a ${looksLike}. It is added to the open database as a table; nothing already there is touched.`,
          actions: [
            {
              id: "import-table",
              label: "Add it as a new table",
              description:
                "Opens the import preview, where you can name the table and check its column types.",
              run: () => {
                open(file);
              },
            },
          ],
        };
      }

      // ── An Excel workbook ──
      if (kind === "xlsx") {
        const sheets = await readXlsxWorkbook(file);
        const usable = sheets.filter((s) => s.headers.length > 0);
        if (usable.length === 0) {
          return {
            title: `Nothing to import from ${file.name}`,
            summary: "This workbook's sheets are empty.",
            actions: [],
            unsupported:
              "A sheet needs a header row and at least one row of values.",
          };
        }
        return {
          title: `Import ${file.name}?`,
          summary: `Dropped an Excel workbook with ${usable.length} ${
            usable.length === 1 ? "worksheet" : "worksheets"
          }.`,
          choice:
            usable.length > 1
              ? {
                  label: "Worksheet",
                  options: usable.map((s) => ({
                    value: s.name,
                    label: `${s.name} (${s.rows.length} ${
                      s.rows.length === 1 ? "row" : "rows"
                    })`,
                  })),
                }
              : undefined,
          actions: [
            {
              id: "one-sheet",
              label:
                usable.length > 1
                  ? "Add the selected worksheet as a table"
                  : `Add "${usable[0].name}" as a table`,
              description:
                "Opens the import preview, where you can name the table and check its column types. Nothing already in the database is touched.",
              run: (_report, choice) => {
                const sheet =
                  usable.find((s) => s.name === choice) ?? usable[0];
                openWorksheetImport(sheet, file.name);
              },
            },
            {
              id: "all-sheets",
              label: `Build a new database from all ${usable.length} worksheets`,
              description:
                "One table per worksheet. Replaces the database you have open and resets its query tabs.",
              danger: true,
              run: async (report) => {
                report("Converting worksheets");
                const { sql } = workbookToSqlScript(usable, { dialect });
                return importSqlScript(sql, file.name, report);
              },
            },
          ],
        };
      }

      // ── Anything else ──
      return {
        title: `Can't import ${file.name}`,
        summary: "This file isn't a format the playground reads.",
        actions: [],
        unsupported: `Drop a database file, a .sql dump, or a .csv, .json, .parquet or .xlsx file to import it into ${engineLabel}.`,
      };
    },
    [
      dialect,
      engineLabel,
      databaseKind,
      importDatabaseImage,
      importSqlScript,
      openCsvImport,
      openJsonImport,
      openParquetImport,
      openWorksheetImport,
      scriptActions,
    ],
  );
}
