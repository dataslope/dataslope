"use client";

/**
 * Tools menu for the learn-route SQL surfaces: Export as Excel, ER Diagram,
 * View DDL. All three read the card's live engine. The engine is only
 * touched when an item is chosen — opening the menu boots nothing, so a
 * lesson full of SQL blocks doesn't download a WASM engine per menu.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import { Menu } from "@base-ui/react/menu";
import { FileCode2, FileSpreadsheet, MoreHorizontal, Network } from "lucide-react";
import { DiamondSpinner } from "../mdx/loadingAnimations";
import cardStyles from "../ChallengeCard.module.css";
import type { SqlDialect } from "../sql/sqlCompletion";
import {
  initXlsxWasm,
  toExcelData,
  triggerDownload,
} from "../sql/utils/exportUtils";
import { cmThemeNameFor, useIsDark } from "../challengeShared";
import {
  quoteIdent,
  readSchemaDdl,
  readSqlSchemaSnapshot,
  type SqlExec,
  type SqlSchemaSnapshot,
} from "./schemaSnapshot";
import type { SqlCardDialogKind } from "./SqlCardDialogs";
import styles from "./SqlCardToolsMenu.module.css";

/** Shown while the dialogs chunk downloads on first open: same backdrop and
 *  spinner the dialogs render, so the handoff is seamless. */
function DialogsChunkFallback() {
  return createPortal(
    <div
      className={cardStyles.modalBackdrop}
      role="status"
      aria-label="Loading viewer"
    >
      <DiamondSpinner size={44} label="Loading viewer…" />
    </div>,
    document.body,
  );
}

// Loaded on first dialog open (carries @xyflow/react, elkjs, a second
// CodeMirror). `ssr: false` is load-bearing: only the dynamic(…, {ssr:false})
// form is stripped from the server compile — a bare `import()` puts elkjs
// (~479 KiB gzipped) into the deployed Worker. For the same reason there must
// be no other `import("./SqlCardDialogs")` in server-reachable code.
const SqlCardDialogs = dynamic(() => import("./SqlCardDialogs"), {
  ssr: false,
  loading: DialogsChunkFallback,
});

export interface SqlCardToolsMenuProps {
  dialect: SqlDialect;
  /** Boots (and seeds) the card's engine, then hands back its exec. */
  ensureExec: () => Promise<SqlExec>;
  /** Disabled while the card is mid-run, so a tool can't race a query. */
  disabled?: boolean;
  /** First half of the exported workbook's filename. */
  surface: "sql-code-block" | "sql-challenge";
  /** Stable per-block id (the `persistKey(...)` hash), the second half. */
  exportId: string;
  showToast: (message: string, tone?: "info" | "warn") => void;
}

/** Excel caps a sheet name at 31 chars and rejects `[]:*?/\`. */
function toSheetName(table: string, taken: Set<string>): string {
  const cleaned = table.replace(/[[\]:*?/\\]/g, "_").slice(0, 31) || "sheet";
  let name = cleaned;
  let n = 2;
  while (taken.has(name.toLowerCase())) {
    const suffix = `_${n++}`;
    name = `${cleaned.slice(0, 31 - suffix.length)}${suffix}`;
  }
  taken.add(name.toLowerCase());
  return name;
}

/**
 * Filename for the exported workbook, e.g. `sql-code-block-3f9a2c1d-data.xlsx`.
 * Deliberately not derived from the card's title (a sentence-long title made
 * unwieldy filenames); the persistKey hash is stable and collision-free.
 */
function exportFilename(surface: string, id: string): string {
  const safeId = id.replace(/[^a-z0-9]/gi, "").slice(0, 12) || "0";
  return `${surface}-${safeId}-data.xlsx`;
}

export function SqlCardToolsMenu({
  dialect,
  ensureExec,
  disabled = false,
  surface,
  exportId,
  showToast,
}: SqlCardToolsMenuProps) {
  const isDark = useIsDark();
  const [exporting, setExporting] = useState(false);
  const [dialog, setDialog] = useState<SqlCardDialogKind | null>(null);
  const [snapshot, setSnapshot] = useState<SqlSchemaSnapshot | null>(null);
  const [ddl, setDdl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const copiedTimerRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (copiedTimerRef.current !== null)
        window.clearTimeout(copiedTimerRef.current);
    },
    [],
  );

  const closeDialog = useCallback(() => {
    setDialog(null);
    setError(null);
  }, []);

  // ── Export as Excel ────────────────────────────────────────────────
  const exportXlsx = useCallback(async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const exec = await ensureExec();
      const snap = await readSqlSchemaSnapshot(exec, dialect);
      if (snap.tables.length === 0) {
        showToast("There are no tables to export yet.", "warn");
        return;
      }
      const mod = await initXlsxWasm();
      const workbook = new mod.Workbook();
      const taken = new Set<string>();
      let sheets = 0;
      for (const table of snap.tables) {
        let results;
        try {
          results = await exec(`SELECT * FROM ${quoteIdent(table)}`);
        } catch {
          // An unreadable table shouldn't sink the other sheets.
          continue;
        }
        const set = results.find((r) => r.columns.length > 0);
        if (!set) continue;
        const worksheet = workbook.addWorksheet();
        worksheet.setName(toSheetName(table, taken));
        worksheet.writeRow(0, 0, set.columns);
        for (let ri = 0; ri < set.values.length; ri++) {
          worksheet.writeRow(ri + 1, 0, set.values[ri].map(toExcelData));
        }
        sheets++;
      }
      if (sheets === 0) {
        showToast("There are no tables to export yet.", "warn");
        return;
      }
      const filename = exportFilename(surface, exportId);
      triggerDownload(
        new Blob([workbook.saveToBufferSync() as BlobPart], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
        filename,
      );
      showToast(
        `Exported ${filename} (${sheets} sheet${sheets === 1 ? "" : "s"}).`,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`Export failed: ${msg}`, "warn");
    } finally {
      setExporting(false);
    }
  }, [dialect, ensureExec, surface, exportId, exporting, showToast]);

  // ── ER diagram / View DDL ──────────────────────────────────────────
  const openDialog = useCallback(
    async (kind: SqlCardDialogKind) => {
      setError(null);
      setSnapshot(null);
      if (kind === "ddl") setDdl(null);
      // Dialog goes up immediately — a cold DuckDB boot is seconds long, and
      // a click that does nothing reads as broken.
      setDialog(kind);
      try {
        const exec = await ensureExec();
        const snap = await readSqlSchemaSnapshot(exec, dialect);
        setSnapshot(snap);
        if (kind === "ddl") setDdl(await readSchemaDdl(exec, dialect, snap));
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(`Couldn't read the schema: ${msg}`);
      }
    },
    [dialect, ensureExec],
  );

  const copyDdl = useCallback(() => {
    if (!ddl || !navigator.clipboard?.writeText) return;
    navigator.clipboard
      .writeText(ddl)
      .then(() => {
        setCopied(true);
        if (copiedTimerRef.current !== null)
          window.clearTimeout(copiedTimerRef.current);
        copiedTimerRef.current = window.setTimeout(() => {
          setCopied(false);
          copiedTimerRef.current = null;
        }, 1500);
      })
      .catch(() => showToast("Couldn't copy to the clipboard.", "warn"));
  }, [ddl, showToast]);

  return (
    <>
      <Menu.Root>
        <Menu.Trigger
          className={styles.trigger}
          disabled={disabled}
          aria-label="Database tools"
          title="Database tools"
        >
          <MoreHorizontal size={14} strokeWidth={2.2} aria-hidden />
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner
            sideOffset={6}
            align="start"
            className={styles.positioner}
          >
            <Menu.Popup className={styles.popup}>
              <Menu.Item
                className={styles.item}
                disabled={exporting}
                closeOnClick={false}
                onClick={() => void exportXlsx()}
              >
                {exporting ? (
                  <svg
                    viewBox="0 0 16 16"
                    className={styles.itemSpinner}
                    aria-hidden
                  >
                    <circle
                      cx="8"
                      cy="8"
                      r="6"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeDasharray="20 10"
                    />
                  </svg>
                ) : (
                  <FileSpreadsheet strokeWidth={1.8} aria-hidden />
                )}
                <span className={styles.itemLabel}>
                  {exporting ? "Building workbook…" : "Export as Excel"}
                  <span className={styles.itemNote}>
                    One sheet per table, as an .xlsx file
                  </span>
                </span>
              </Menu.Item>
              <Menu.Item
                className={styles.item}
                onClick={() => void openDialog("er")}
              >
                <Network strokeWidth={1.8} aria-hidden />
                <span className={styles.itemLabel}>
                  ER Diagram
                  <span className={styles.itemNote}>
                    Tables, keys and the links between them
                  </span>
                </span>
              </Menu.Item>
              <Menu.Item
                className={styles.item}
                onClick={() => void openDialog("ddl")}
              >
                <FileCode2 strokeWidth={1.8} aria-hidden />
                <span className={styles.itemLabel}>
                  View DDL
                  <span className={styles.itemNote}>
                    The CREATE statements behind this database
                  </span>
                </span>
              </Menu.Item>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
      {dialog !== null ? (
        <SqlCardDialogs
          kind={dialog}
          onClose={closeDialog}
          snapshot={snapshot}
          ddl={ddl}
          error={error}
          isDark={isDark}
          cmTheme={cmThemeNameFor(isDark)}
          isPostgres={dialect === "postgres"}
          copied={copied}
          onCopyDdl={copyDdl}
        />
      ) : null}
    </>
  );
}

export default SqlCardToolsMenu;
