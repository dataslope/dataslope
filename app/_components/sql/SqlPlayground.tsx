"use client";

// Browser-based SQLite playground. Boots @sqlite.org/sqlite-wasm, renders the schema in
// a left sidebar (Tables/Views), and gives the user a multi-tab SQL
// editor whose results land in a top results panel.
//
// Differs from `Playground.tsx` (which wraps a single REPL-style
// adapter) in three significant ways:
//   1. The engine is persistent across runs and tabs — only the
//      database-selector causes a teardown/rebuild.
//   2. The editor is multi-tab, with per-database persistence so
//      switching databases doesn't blow away your work in the others.
//   3. The "output" is a tabular result panel, not a stream of
//      heterogeneous cells.
//
// All shared chrome (Settings dialog, runtime-info popover, run-overlay
// animation, themes) is reused from `playgroundShared`/`playgroundTheme`
// so this playground retints in lockstep with every other one when the
// user picks a different editor theme.

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import "../playground.css";
import "../sqlPlayground.css";
import type { Compartment } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import {
  createSqlEditorExtensions,
  makeSqlAutocompletionExtension,
  makeSqlEditorCompartments,
  makeSqlLangExtension,
} from "./shared/editorSetup";
import { Popover } from "@base-ui-components/react/popover";
import { AlertDialog } from "@base-ui-components/react/alert-dialog";
import { Dialog } from "@base-ui-components/react/dialog";
import { Tabs } from "@base-ui-components/react/tabs";
import { Toast } from "@base-ui/react/toast";
import { Menu } from "@base-ui-components/react/menu";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  CircleHelp,
  Database,
  FileCode2,
  FilePlus,
  FileText,
  FileJson,
  History,
  Network,
  Pencil,
  RotateCcw,
  Settings2,
  Table,
  TriangleAlert,
  Upload,
  Wand2,
  X,
} from "lucide-react";
import { FaInfo } from "react-icons/fa";
import type { RuntimeInfo } from "../types";
import { modifyDialogSignature } from "./types";
import {
  applyMode,
  applyThemePalette,
  clearThemePalette,
  getStoredEditorTheme,
  LIGHT_THEMES,
  setStoredEditorTheme,
} from "../playgroundTheme";
import {
  DEFAULT_PLAYGROUND_SETTINGS,
  DataslopeRunOverlay,
  ErDiagramLoadingFallback,
  LOADING_QUIPS,
  RuntimeInfoContent,
  detectIsMac,
} from "../playgroundShared";
import { SqlSettingsPanelContent } from "./components/SqlSettingsPanel";
import { SqlSettingsConfirmDialogs } from "./components/SqlSettingsConfirmDialogs";
import { DdlViewerDialog } from "./components/DdlViewerDialog";
import { SwitchDatabaseDialog } from "./components/SwitchDatabaseDialog";
import { ImportBinaryFileDialog } from "./components/ImportBinaryFileDialog";
import { ImportSqlDumpDialog } from "./components/ImportSqlDumpDialog";
import { RenameDatabaseDialog } from "./components/RenameDatabaseDialog";
import { SqlEditorToolbar } from "./components/SqlEditorToolbar";
import { findSampleDatabase } from "../runtime/sqliteSamples";
import { sqliteAdapter } from "./sqliteAdapter";
import { DROP_KIND_LABELS, IMPORT_COL_STATUS_LABEL } from "./constants";
import { computeImportColComparison } from "./utils/importUtils";
import { splitSqlStatements, statementAtCursor } from "./utils/sqlAnalysis";
import { ensureActiveWorkspace, switchActiveWorkspace } from "../opfs/activeWorkspace";
import { acquireWorkspaceLock, createWorkspace } from "../opfs/workspace";
import { WorkspaceBadge } from "../workspace/WorkspaceBadge";
import {
  type ColumnConstraintInfo,
  type ForeignKeyInfo,
  type SqliteEngine,
} from "../runtime/sqlite";

const SQLITE_SAMPLE_DATABASES = sqliteAdapter.samples;
import dynamic from "next/dynamic";

// ErDiagramPane pulls in @xyflow/react and elkjs/lib/elk.bundled.js
// (~hundreds of KB of layout-algorithm code). It only renders when
// the user opens the ER-diagram tab, so defer the chunk until then.
const ErDiagramPane = dynamic(
  () => import("../ErDiagramPane").then((m) => m.ErDiagramPane),
  { ssr: false, loading: ErDiagramLoadingFallback },
);
import { SqlTabBar } from "./components/SqlTabBar";
import { SETTINGS_TAB_ID } from "../playgroundTabs";
import type { TabDescriptor } from "../tabs/tabTypes";
import { Settings as SettingsIcon } from "lucide-react";
import { SqlPlaygroundShell } from "./components/SqlPlaygroundShell";
import { ToastList } from "./components/ToastList";
import { QueryHistoryPane } from "./components/QueryHistoryPane";
import type { SqlCompletionSchema } from "./sqlCompletion";
import { useSettingsStore } from "./stores/useSettingsStore";
import { usePragmaStore } from "./stores/usePragmaStore";
import { useSqlPlaygroundStore } from "./stores/useSqlPlaygroundStore";
import { useEngineStore } from "./stores/useEngineStore";
import { useTabStore } from "./stores/useTabStore";
import { useDialogStore } from "./stores/useDialogStore";
import { useQueryRunner } from "./hooks/useQueryRunner";
import { useTabManagement } from "./hooks/useTabManagement";
import { pushTabHistory } from "./utils/tabUtils";
import {
  ensurePersistUnloadFlush,
  persistAsync,
} from "./utils/persistedStorage";
import { useSidebarActions } from "./hooks/useSidebarActions";
import { useDatabaseActions } from "./hooks/useDatabaseActions";
import { useQueryHistory } from "./hooks/useQueryHistory";
import { ModifyStructureForm } from "./components/ModifyStructureForm";
import { ResultView } from "./components/ResultView";
import { SchemaItem } from "./components/SchemaItem";
import { SchemaLeafItem } from "./components/SchemaLeafItem";
import { SchemaSection } from "./components/SchemaSection";
import { CreateIndexDialog } from "./components/CreateIndexDialog";
import { CreateViewDialog } from "./components/CreateViewDialog";
import { ExplainPlanDialog } from "./components/ExplainPlanDialog";
import { buildExplainSql, formatExplainResult } from "./utils/explain";
import { activeSqlForEditor } from "./utils/editorUtils";
import {
  DatabaseSelector,
  type DatabaseSelectorAction,
} from "./components/DatabaseSelector";
import { SqlIconSidebar } from "./components/SqlIconSidebar";
import {
  dbScopedKey,
  loadActiveTabId,
  loadTabs,
  saveTabs,
  storageKey,
  type QueryTab,
} from "../sqlitePlaygroundTabs";
import { themeFor } from "../cmExtensions";

const PLAYGROUND_ID = sqliteAdapter.playgroundId;

const SQLITE_DB_ACTIONS: readonly DatabaseSelectorAction[] = [
  {
    id: "__new_db__",
    icon: <FilePlus size={14} />,
    label: "New Database",
    description: "Create a blank database",
  },
  {
    id: "__import_sqlite__",
    icon: <Upload size={14} />,
    label: "Import SQLite File",
    description: "Open a .sqlite or .db file",
  },
  {
    id: "__import_sql_dump__",
    icon: <FileCode2 size={14} />,
    label: "Import SQL Dump",
    description: "Load database from a .sql file",
  },
  {
    id: "__export_sql_dump__",
    icon: <FileCode2 size={14} />,
    label: "Export SQL Dump",
    description: "Download DDL + data as a .sql file",
  },
  {
    id: "__rename_db__",
    icon: <Pencil size={14} />,
    label: "Rename Current Database",
    description: "Change filename and extension",
  },
];

const RUNTIME_INFO: RuntimeInfo = {
  language: "SQLite",
  version: "3.53",
  engine: "@sqlite.org/sqlite-wasm 3.53.0",
  engineUrl: "https://sqlite.org/wasm",
  notes:
    "Official SQLite build compiled to WebAssembly. Each sample database is rebuilt in memory on every page load.",
};


// ────────────────────────────────────────────────────────────────────────
// Modify Structure drawer
// ────────────────────────────────────────────────────────────────────────

/** Hints used by the result-view header to render PK / FK icons next
 *  to columns sourced from a known table. Computed by the parent
 *  whenever the current tab's result was produced by a sidebar
 *  preview, and threaded through `ResultView` → `ResultTableBody`. */
interface ColumnKeyHints {
  pk: Set<string>;
  fk: Map<string, ForeignKeyInfo>;
}

// ─── Pragma settings ─────────────────────────────────────────────────────

/** SQLite pragma defaults that the playground starts with when no saved
 *  preferences are found. `foreignKeys` is ON here because the engine
 *  already enables it via `PRAGMA foreign_keys = ON` in `build()`. */
const DEFAULT_PRAGMA_SETTINGS = {
  foreignKeys: true,
  journalMode: "delete",
  synchronous: "full",
  pageSize: 4096,
  automaticIndex: true,
  caseSensitiveLike: false,
} as const;

type PragmaSettings = {
  foreignKeys: boolean;
  journalMode: string;
  synchronous: string;
  pageSize: number;
  automaticIndex: boolean;
  caseSensitiveLike: boolean;
};

/** Minimum and maximum valid SQLite page sizes. */
const PRAGMA_PAGE_SIZE_MIN = 512;
const PRAGMA_PAGE_SIZE_MAX = 65536;

/** Maps the human-readable `synchronous` setting names to their
 *  PRAGMA integer values. Kept at module level to avoid re-creating
 *  the object on every `applyPragmasToEngine` call. */
const PRAGMA_SYNC_MAP: Record<string, string> = {
  off: "0",
  normal: "1",
  full: "2",
};

/** Apply a set of pragma settings to an already-initialised SQLite engine.
 *  Called once after the engine boots and again whenever the user saves
 *  changes in the Pragmas settings tab. Errors are swallowed so a single
 *  unsupported pragma (e.g. page_size on an existing database) does not
 *  prevent the other pragmas from being applied. */
async function applyPragmasToEngine(
  engine: import("../runtime/sqlite").SqliteEngine,
  p: PragmaSettings,
): Promise<void> {
  const statements: string[] = [
    `PRAGMA foreign_keys = ${p.foreignKeys ? "ON" : "OFF"}`,
    `PRAGMA journal_mode = ${p.journalMode}`,
    `PRAGMA synchronous = ${PRAGMA_SYNC_MAP[p.synchronous] ?? "2"}`,
    `PRAGMA page_size = ${Math.max(PRAGMA_PAGE_SIZE_MIN, Math.min(PRAGMA_PAGE_SIZE_MAX, p.pageSize))}`,
    `PRAGMA automatic_index = ${p.automaticIndex ? "ON" : "OFF"}`,
    `PRAGMA case_sensitive_like = ${p.caseSensitiveLike ? "ON" : "OFF"}`,
  ];
  for (const sql of statements) {
    try {
      await engine.exec(sql);
    } catch {
      // Silently ignore unsupported pragmas (e.g. page_size on a non-empty db).
    }
  }
}

// ────────────────────────────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────────────────────────────

export default function SqlPlayground() {
  return (
    <Toast.Provider timeout={2400}>
      <SqlPlaygroundInner />
      <Toast.Portal>
        <Toast.Viewport className="toast-viewport">
          <ToastList />
        </Toast.Viewport>
      </Toast.Portal>
    </Toast.Provider>
  );
}

// ─── Pragma descriptions shown in each row's info popover ────────────────────

const PRAGMA_DESCRIPTIONS: Record<keyof PragmaSettings, string> = {
  foreignKeys:
    "Enforces referential integrity for foreign key constraints. When ON, SQLite raises an error on inserts or updates that would violate a declared FOREIGN KEY relationship.",
  journalMode:
    "Controls how the rollback journal file is managed after a commit. DELETE (default) removes the journal each time. WAL (Write-Ahead Log) allows concurrent reads while a write is in progress.",
  synchronous:
    "Controls how aggressively SQLite syncs data to disk. FULL (default) is safest; NORMAL reduces sync calls; OFF skips syncing entirely and is fastest but risks corruption on an OS crash.",
  pageSize:
    "Size in bytes of each page in the database file. Must be a power of 2 between 512 and 65536. Can only be changed before the first table is created in a new database.",
  automaticIndex:
    "When ON (default), SQLite may automatically create temporary indexes during query planning to speed up full-table scans. Disabling reduces memory overhead at the cost of potentially slower queries.",
  caseSensitiveLike:
    "When ON, the LIKE operator distinguishes uppercase and lowercase ASCII letters. By default (OFF), LIKE is case-insensitive for ASCII characters.",
};

function PragmaInfoButton({ pragma }: { pragma: keyof PragmaSettings }) {
  return (
    <Popover.Root>
      <Popover.Trigger
        className="pragma-info-btn"
        aria-label="More info"
        openOnHover
        delay={80}
        closeDelay={120}
      >
        <CircleHelp size={13} aria-hidden="true" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner
          className="pragma-info-positioner"
          sideOffset={6}
          align="start"
        >
          <Popover.Popup className="bui-popup pragma-info-popup">
            <p className="pragma-info-text">{PRAGMA_DESCRIPTIONS[pragma]}</p>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

// ─── Pragma settings tab ─────────────────────────────────────────────────────

function PragmaSettingsTab({
  savedPragmas,
  onSave,
}: {
  savedPragmas: PragmaSettings;
  onSave: (p: PragmaSettings) => void;
}) {
  const [draft, setDraft] = useState<PragmaSettings>({ ...savedPragmas });

  const hasChanges =
    draft.foreignKeys !== savedPragmas.foreignKeys ||
    draft.journalMode !== savedPragmas.journalMode ||
    draft.synchronous !== savedPragmas.synchronous ||
    draft.pageSize !== savedPragmas.pageSize ||
    draft.automaticIndex !== savedPragmas.automaticIndex ||
    draft.caseSensitiveLike !== savedPragmas.caseSensitiveLike;

  return (
    <Tabs.Panel value="pragmas" className="settings-panel-pane">
      <div className="settings-body pragma-settings-body">
        {/* Foreign keys */}
        <div className="pragma-row">
          <div className="pragma-label-wrap">
            <span className="pragma-label">Foreign Keys</span>
            <PragmaInfoButton pragma="foreignKeys" />
          </div>
          <label className="setting-checkbox-row pragma-checkbox-row">
            <input
              type="checkbox"
              checked={draft.foreignKeys}
              onChange={(e) =>
                setDraft((d) => ({ ...d, foreignKeys: e.target.checked }))
              }
            />
            <span className="pragma-checkbox-label">
              {draft.foreignKeys ? "Enabled" : "Disabled"}
            </span>
          </label>
        </div>

        {/* Journal mode */}
        <div className="pragma-row">
          <div className="pragma-label-wrap">
            <span className="pragma-label">Journal Mode</span>
            <PragmaInfoButton pragma="journalMode" />
          </div>
          <div className="pragma-select-wrap">
            <select
              className="pragma-select"
              value={draft.journalMode}
              onChange={(e) =>
                setDraft((d) => ({ ...d, journalMode: e.target.value }))
              }
            >
              <option value="delete">Delete</option>
              <option value="truncate">Truncate</option>
              <option value="persist">Persist</option>
              <option value="memory">Memory</option>
              <option value="wal">WAL</option>
              <option value="off">Off</option>
            </select>
          </div>
        </div>

        {/* Synchronous */}
        <div className="pragma-row">
          <div className="pragma-label-wrap">
            <span className="pragma-label">Synchronous</span>
            <PragmaInfoButton pragma="synchronous" />
          </div>
          <div className="pragma-select-wrap">
            <select
              className="pragma-select"
              value={draft.synchronous}
              onChange={(e) =>
                setDraft((d) => ({ ...d, synchronous: e.target.value }))
              }
            >
              <option value="off">Off</option>
              <option value="normal">Normal</option>
              <option value="full">Full</option>
            </select>
          </div>
        </div>

        {/* Page size */}
        <div className="pragma-row">
          <div className="pragma-label-wrap">
            <span className="pragma-label">Page Size (bytes)</span>
            <PragmaInfoButton pragma="pageSize" />
          </div>
          <div className="pragma-select-wrap">
            <select
              className="pragma-select"
              value={draft.pageSize}
              onChange={(e) =>
                setDraft((d) => ({ ...d, pageSize: Number(e.target.value) }))
              }
            >
              <option value={512}>512</option>
              <option value={1024}>1024</option>
              <option value={2048}>2048</option>
              <option value={4096}>4096</option>
              <option value={8192}>8192</option>
              <option value={16384}>16384</option>
              <option value={32768}>32768</option>
              <option value={65536}>65536</option>
            </select>
          </div>
        </div>

        {/* Automatic index */}
        <div className="pragma-row">
          <div className="pragma-label-wrap">
            <span className="pragma-label">Automatic Index</span>
            <PragmaInfoButton pragma="automaticIndex" />
          </div>
          <label className="setting-checkbox-row pragma-checkbox-row">
            <input
              type="checkbox"
              checked={draft.automaticIndex}
              onChange={(e) =>
                setDraft((d) => ({ ...d, automaticIndex: e.target.checked }))
              }
            />
            <span className="pragma-checkbox-label">
              {draft.automaticIndex ? "Enabled" : "Disabled"}
            </span>
          </label>
        </div>

        {/* Case sensitive LIKE */}
        <div className="pragma-row">
          <div className="pragma-label-wrap">
            <span className="pragma-label">Case Sensitive LIKE</span>
            <PragmaInfoButton pragma="caseSensitiveLike" />
          </div>
          <label className="setting-checkbox-row pragma-checkbox-row">
            <input
              type="checkbox"
              checked={draft.caseSensitiveLike}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  caseSensitiveLike: e.target.checked,
                }))
              }
            />
            <span className="pragma-checkbox-label">
              {draft.caseSensitiveLike ? "Enabled" : "Disabled"}
            </span>
          </label>
        </div>

        {/* Bottom actions */}
        <div className="pragma-actions">
          <button
            type="button"
            className="pragma-reset-btn"
            onClick={() => setDraft({ ...DEFAULT_PRAGMA_SETTINGS })}
          >
            <RotateCcw size={14} aria-hidden="true" />
            <span>Reset to defaults</span>
          </button>
          <button
            type="button"
            className="pragma-save-btn"
            disabled={!hasChanges}
            onClick={() => onSave(draft)}
          >
            Save
          </button>
        </div>
      </div>
    </Tabs.Panel>
  );
}

function SqlPlaygroundInner() {
  useEffect(() => {
    ensurePersistUnloadFlush();
  }, []);

  // ─── Settings store ──────────────────────────────────────────────────
  const fontSize = useSettingsStore((s) => s.fontSize);
  const setFontSizeState = useSettingsStore((s) => s.setFontSize);
  const outputFontSizeEnabled = useSettingsStore(
    (s) => s.outputFontSizeEnabled,
  );
  const setOutputFontSizeEnabledState = useSettingsStore(
    (s) => s.setOutputFontSizeEnabled,
  );
  const outputFontSize = useSettingsStore((s) => s.outputFontSize);
  const setOutputFontSizeState = useSettingsStore((s) => s.setOutputFontSize);
  const editorTheme = useSettingsStore((s) => s.editorTheme);
  const setEditorThemeState = useSettingsStore((s) => s.setEditorTheme);
  const wordWrap = useSettingsStore((s) => s.wordWrap);
  const setWordWrapState = useSettingsStore((s) => s.setWordWrap);
  const clearBeforeRun = useSettingsStore((s) => s.clearBeforeRun);
  const setClearBeforeRunState = useSettingsStore((s) => s.setClearBeforeRun);

  // ─── Pragma settings ─────────────────────────────────────────────────
  const pragmaSettings = usePragmaStore((s) => s.pragmaSettings);
  const setPragmaSettingsState = usePragmaStore((s) => s.setPragmaSettings);
  const pragmaSettingsRef = useRef<PragmaSettings>(DEFAULT_PRAGMA_SETTINGS);

  // ─── Global page size ────────────────────────────────────────────────
  const globalPageSize = useSqlPlaygroundStore((s) => s.globalPageSize);
  const setGlobalPageSizeState = useSqlPlaygroundStore(
    (s) => s.setGlobalPageSize,
  );
  const globalPageSizeRef = useRef(globalPageSize);
  useEffect(() => {
    globalPageSizeRef.current = globalPageSize;
  }, [globalPageSize]);
  useEffect(() => {
    pragmaSettingsRef.current = pragmaSettings;
  }, [pragmaSettings]);
  const setGlobalPageSize = useCallback(
    (n: number) => {
      globalPageSizeRef.current = n;
      setGlobalPageSizeState(n);
      try {
        localStorage.setItem(storageKey("page_size"), String(n));
      } catch {
        // ignore quota errors
      }
    },
    [setGlobalPageSizeState],
  );

  // ─── Engine store ────────────────────────────────────────────────────
  const loaded = useEngineStore((s) => s.loaded);
  const setLoaded = useEngineStore((s) => s.setLoaded);
  const statusState = useEngineStore((s) => s.statusState);
  const setStatusState = useEngineStore((s) => s.setStatusState);
  const tables = useEngineStore((s) => s.tables);
  const setTables = useEngineStore((s) => s.setTables);
  const views = useEngineStore((s) => s.views);
  const setViews = useEngineStore((s) => s.setViews);
  const indexes = useEngineStore((s) => s.indexes);
  const setIndexes = useEngineStore((s) => s.setIndexes);
  const triggers = useEngineStore((s) => s.triggers);
  const setTriggers = useEngineStore((s) => s.setTriggers);
  const columnsByEntity = useEngineStore((s) => s.columnsByEntity);
  const setColumnsByEntity = useEngineStore((s) => s.setColumnsByEntity);
  const foreignKeysByEntity = useEngineStore((s) => s.foreignKeysByEntity);
  const setForeignKeysByEntity = useEngineStore(
    (s) => s.setForeignKeysByEntity,
  );
  const constraintsByEntity = useEngineStore((s) => s.constraintsByEntity);
  const expandedEntities = useEngineStore((s) => s.expandedEntities);
  const setExpandedEntities = useEngineStore((s) => s.setExpandedEntities);
  const tablesSectionExpanded = useEngineStore((s) => s.tablesSectionExpanded);
  const setTablesSectionExpanded = useEngineStore(
    (s) => s.setTablesSectionExpanded,
  );
  const viewsSectionExpanded = useEngineStore((s) => s.viewsSectionExpanded);
  const setViewsSectionExpanded = useEngineStore(
    (s) => s.setViewsSectionExpanded,
  );
  const activeDbId = useEngineStore((s) => s.activeDbId);
  const setActiveDbId = useEngineStore((s) => s.setActiveDbId);
  const customDb = useEngineStore((s) => s.customDb);
  const setCustomDb = useEngineStore((s) => s.setCustomDb);
  const customFilenames = useEngineStore((s) => s.customFilenames);
  const setCustomFilenames = useEngineStore((s) => s.setCustomFilenames);

  // ─── Tab store ───────────────────────────────────────────────────────
  const tabs = useTabStore((s) => s.tabs);
  const setTabs = useTabStore((s) => s.setTabs);
  const activeTabId = useTabStore((s) => s.activeTabId);
  const setActiveTabId = useTabStore((s) => s.setActiveTabId);
  const resultsByTab = useTabStore((s) => s.resultsByTab);
  const setResultsByTab = useTabStore((s) => s.setResultsByTab);
  const setResultSetExportSnapshot = useTabStore(
    (s) => s.setResultSetExportSnapshot,
  );

  // ─── Dialog store ────────────────────────────────────────────────────
  const settingsOpen = useDialogStore((s) => s.settingsOpen);
  const setSettingsOpen = useDialogStore((s) => s.setSettingsOpen);
  const confirmRestoreOpen = useDialogStore((s) => s.confirmRestoreOpen);
  const setConfirmRestoreOpen = useDialogStore((s) => s.setConfirmRestoreOpen);
  const confirmClearStorageOpen = useDialogStore(
    (s) => s.confirmClearStorageOpen,
  );
  const setConfirmClearStorageOpen = useDialogStore(
    (s) => s.setConfirmClearStorageOpen,
  );
  const confirmClearAllDataOpen = useDialogStore(
    (s) => s.confirmClearAllDataOpen,
  );
  const setConfirmClearAllDataOpen = useDialogStore(
    (s) => s.setConfirmClearAllDataOpen,
  );
  const confirmCloseTabId = useDialogStore((s) => s.confirmCloseTabId);
  const setConfirmCloseTabId = useDialogStore((s) => s.setConfirmCloseTabId);
  const pendingDbId = useDialogStore((s) => s.pendingDbId);
  const setPendingDbId = useDialogStore((s) => s.setPendingDbId);
  const ddlDialog = useDialogStore((s) => s.ddlDialog);
  const setDdlDialog = useDialogStore((s) => s.setDdlDialog);
  const modifyDialog = useDialogStore((s) => s.modifyDialog);
  const setModifyDialog = useDialogStore((s) => s.setModifyDialog);
  const modifyInvalidColIds = useDialogStore((s) => s.modifyInvalidColIds);
  const setModifyInvalidColIds = useDialogStore(
    (s) => s.setModifyInvalidColIds,
  );
  const modifyStructureTab = useDialogStore((s) => s.modifyStructureTab);
  const setModifyStructureTab = useDialogStore((s) => s.setModifyStructureTab);
  const modifyStructureRefreshKey = useDialogStore(
    (s) => s.modifyStructureRefreshKey,
  );
  const addRowDialog = useDialogStore((s) => s.addRowDialog);
  const setAddRowDialog = useDialogStore((s) => s.setAddRowDialog);
  const addTableDialog = useDialogStore((s) => s.addTableDialog);
  const setAddTableDialog = useDialogStore((s) => s.setAddTableDialog);
  const addTableInvalidColIds = useDialogStore((s) => s.addTableInvalidColIds);
  const setAddTableInvalidColIds = useDialogStore(
    (s) => s.setAddTableInvalidColIds,
  );
  const truncateConfirm = useDialogStore((s) => s.truncateConfirm);
  const setTruncateConfirm = useDialogStore((s) => s.setTruncateConfirm);
  const pendingDropEntity = useDialogStore((s) => s.pendingDropEntity);
  const setPendingDropEntity = useDialogStore((s) => s.setPendingDropEntity);
  const importSqliteOpen = useDialogStore((s) => s.importSqliteOpen);
  const setImportSqliteOpen = useDialogStore((s) => s.setImportSqliteOpen);
  const importSqliteDragging = useDialogStore((s) => s.importSqliteDragging);
  const setImportSqliteDragging = useDialogStore(
    (s) => s.setImportSqliteDragging,
  );
  const importSqlDumpOpen = useDialogStore((s) => s.importSqlDumpOpen);
  const setImportSqlDumpOpen = useDialogStore((s) => s.setImportSqlDumpOpen);
  const importSqlDumpDragging = useDialogStore((s) => s.importSqlDumpDragging);
  const setImportSqlDumpDragging = useDialogStore(
    (s) => s.setImportSqlDumpDragging,
  );
  const importCsvOpen = useDialogStore((s) => s.importCsvOpen);
  const setImportCsvOpen = useDialogStore((s) => s.setImportCsvOpen);
  const importCsvDragging = useDialogStore((s) => s.importCsvDragging);
  const setImportCsvDragging = useDialogStore((s) => s.setImportCsvDragging);
  const importCsvState = useDialogStore((s) => s.importCsvState);
  const setImportCsvState = useDialogStore((s) => s.setImportCsvState);
  const importJsonOpen = useDialogStore((s) => s.importJsonOpen);
  const setImportJsonOpen = useDialogStore((s) => s.setImportJsonOpen);
  const importJsonDragging = useDialogStore((s) => s.importJsonDragging);
  const setImportJsonDragging = useDialogStore((s) => s.setImportJsonDragging);
  const importJsonState = useDialogStore((s) => s.importJsonState);
  const setImportJsonState = useDialogStore((s) => s.setImportJsonState);
  const importParquetOpen = useDialogStore((s) => s.importParquetOpen);
  const setImportParquetOpen = useDialogStore((s) => s.setImportParquetOpen);
  const importParquetDragging = useDialogStore((s) => s.importParquetDragging);
  const setImportParquetDragging = useDialogStore(
    (s) => s.setImportParquetDragging,
  );
  const importParquetState = useDialogStore((s) => s.importParquetState);
  const setImportParquetState = useDialogStore((s) => s.setImportParquetState);
  const renameDbOpen = useDialogStore((s) => s.renameDbOpen);
  const setRenameDbOpen = useDialogStore((s) => s.setRenameDbOpen);
  const renameDbBaseName = useDialogStore((s) => s.renameDbBaseName);
  const setRenameDbBaseName = useDialogStore((s) => s.setRenameDbBaseName);
  const renameDbExt = useDialogStore((s) => s.renameDbExt);
  const setRenameDbExt = useDialogStore((s) => s.setRenameDbExt);
  const exportNoTabsHover = useDialogStore((s) => s.exportNoTabsHover);
  const setExportNoTabsHover = useDialogStore((s) => s.setExportNoTabsHover);

  // ─── Local state (only items not in any store) ───────────────────────
  const [loadingMessage, setLoadingMessage] = useState(
    "Loading SQLite engine…",
  );
  const [showLoadingOverlay, setShowLoadingOverlay] = useState(true);
  const [indexesSectionExpanded, setIndexesSectionExpanded] = useState(false);
  const [triggersSectionExpanded, setTriggersSectionExpanded] = useState(false);
  const [hasEditorSelection, setHasEditorSelection] = useState(false);
  const [isFormatting, setIsFormatting] = useState(false);
  const [formatPopoverOpen, setFormatPopoverOpen] = useState(false);
  const [engineForRender, setEngineForRender] = useState<SqliteEngine | null>(
    null,
  );
  const [quipIndex, setQuipIndex] = useState<number>(0);
  // Active workspace surfaced in the header WorkspaceBadge. Resolved
  // asynchronously by the bootstrap effect below.
  const [activeWorkspace, setActiveWorkspace] = useState<{
    id: string;
    name: string;
  } | null>(null);

  // ─── Derived values ──────────────────────────────────────────────────
  const isSettingsTabActive = activeTabId === SETTINGS_TAB_ID;
  const activeTab = tabs.find((t) => t.id === activeTabId) ?? null;
  const hasMultipleStatements = useMemo(
    () => splitSqlStatements(activeTab?.code ?? "").length > 1,
    [activeTab?.code],
  );
  const result = activeTabId ? (resultsByTab[activeTabId] ?? null) : null;
  const loadingFading = loaded && showLoadingOverlay;

  // ─── Refs ────────────────────────────────────────────────────────────
  const engineRef = useRef<SqliteEngine | null>(null);
  const editorHostRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<EditorView | null>(null);
  const themeCompRef = useRef<Compartment | null>(null);
  const wrapCompRef = useRef<Compartment | null>(null);
  const completionCompRef = useRef<Compartment | null>(null);
  const sqlLangCompRef = useRef<Compartment | null>(null);
  const runRef = useRef<() => void>(() => undefined);
  const runSelectionRef = useRef<(sql: string) => void>(() => undefined);
  const setHasEditorSelectionRef = useRef(setHasEditorSelection);
  const activeTabIdRef = useRef<string>("");
  const tabHistoryRef = useRef<string[]>([]);
  const tabsRef = useRef<QueryTab[]>([]);
  const activeDbIdRef = useRef<string>(activeDbId);
  const panesRef = useRef<HTMLDivElement | null>(null);
  const resultsPaneRef = useRef<HTMLDivElement | null>(null);
  const editorPaneRef = useRef<HTMLDivElement | null>(null);
  const resizerRef = useRef<HTMLDivElement | null>(null);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const sidebarResizerRef = useRef<HTMLDivElement | null>(null);
  const quipSeedRef = useRef<number>(-1);
  const settingsOpenRef = useRef<boolean>(false);

  const openSettingsTab = useCallback(() => {
    if (activeTabIdRef.current === SETTINGS_TAB_ID) {
      // Settings tab is active — close it and return to a query tab.
      setSettingsOpen(false);
      const fallback = tabsRef.current[0]?.id;
      if (fallback) {
        activeTabIdRef.current = fallback;
        setActiveTabId(fallback);
      }
    } else if (settingsOpenRef.current) {
      // Settings tab is in the tab bar but not active — activate it.
      activeTabIdRef.current = SETTINGS_TAB_ID;
      setActiveTabId(SETTINGS_TAB_ID);
    } else {
      // Settings tab is not open — add it and make it active.
      setSettingsOpen(true);
      activeTabIdRef.current = SETTINGS_TAB_ID;
      setActiveTabId(SETTINGS_TAB_ID);
    }
  }, [setSettingsOpen, setActiveTabId]);

  // ─── Ref sync effects ────────────────────────────────────────────────
  useEffect(() => {
    activeTabIdRef.current = activeTabId;
  }, [activeTabId]);
  useEffect(() => {
    tabsRef.current = tabs;
  }, [tabs]);
  useEffect(() => {
    activeDbIdRef.current = activeDbId;
  }, [activeDbId]);
  useEffect(() => {
    settingsOpenRef.current = settingsOpen;
  }, [settingsOpen]);

  // ─── isMac ───────────────────────────────────────────────────────────
  const isMac = useSyncExternalStore(
    () => () => {},
    () => detectIsMac(),
    () => false,
  );

  // ─── Custom hooks ────────────────────────────────────────────────────
  const {
    history: queryHistory,
    addHistoryEntry,
    clearHistory,
  } = useQueryHistory(storageKey("query_history"));
  const queryRunnerRefs = {
    engineRef,
    editorRef,
    tabsRef,
    activeTabIdRef,
    activeDbIdRef,
    addHistoryEntry,
  };
  const {
    handleLoadPage,
    handleLoadMorePage,
    runActiveTab,
    runSelection,
    runCurrentSelection,
    openTabAndRun,
    previewTable,
    handleResultSetExport,
    deleteRowsFromTable,
    updateRowsInTable,
    duplicateRowInTable,
    showToast,
  } = useQueryRunner(queryRunnerRefs);

  // Run just the statement under the editor cursor (the toolbar "Run statement"
  // affordance — mirrors the Ctrl/⌘+Enter keymap). Falls back to running the
  // whole tab when the cursor isn't inside a statement.
  const runStatementAtCursor = useCallback(() => {
    const view = editorRef.current;
    if (!view) return runActiveTab();
    const stmt = statementAtCursor(
      view.state.doc.toString(),
      view.state.selection.main.head,
    );
    if (stmt) runSelection(stmt.text);
    else runActiveTab();
  }, [runActiveTab, runSelection]);

  const {
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
  } = useSidebarActions(
    { engineRef, activeTabIdRef, activeDbIdRef },
    openTabAndRun,
  );

  const [createIndexOpen, setCreateIndexOpen] = useState(false);
  const [createViewOpen, setCreateViewOpen] = useState(false);
  const [createViewBody, setCreateViewBody] = useState("");
  // Capture the editor text in this event handler (reading a ref during
  // render is disallowed) so the Create View body can be seeded from it.
  const openCreateView = useCallback(() => {
    setCreateViewBody(editorRef.current?.state.doc.toString() ?? "");
    setCreateViewOpen(true);
  }, []);

  const [explainPlan, setExplainPlan] = useState<{
    querySql: string;
    plan: string;
  } | null>(null);
  // Run EXPLAIN for the selection / statement at the cursor / whole query and
  // show the plan in a read-only modal (no result-tab / history pollution).
  const handleExplain = useCallback(() => {
    const view = editorRef.current;
    const engine = engineRef.current;
    if (!view || !engine) return;
    const sql = activeSqlForEditor(view).trim();
    if (!sql) {
      showToast("Nothing to explain — the query is empty.", "warn");
      return;
    }
    void (async () => {
      try {
        const sets = await engine.exec(buildExplainSql("sqlite", sql));
        const set = sets.find((s) => s != null) ?? sets[0];
        setExplainPlan({
          querySql: sql,
          plan: set
            ? formatExplainResult(set.columns, set.values)
            : "(no plan returned)",
        });
      } catch (err) {
        showToast(
          `Explain failed: ${err instanceof Error ? err.message : String(err)}`,
          "warn",
        );
      }
    })();
  }, [showToast]);

  const {
    addTab,
    openErDiagramTab,
    openQueryHistoryTab,
    closeTab,
    confirmCloseTab,
    renameTab,
    duplicateTab,
    closeOtherTabs,
    closeAllTabs,
    reorderTabs,
    resetTabsForCurrentDb,
  } = useTabManagement(
    { editorRef, tabsRef, activeTabIdRef, activeDbIdRef, tabHistoryRef },
    refreshTableMetadata,
  );

  const {
    performDbSwitch,
    performImportSqlite,
    performImportSqlDump,
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
  } = useDatabaseActions({ ...queryRunnerRefs, pragmaSettingsRef });

  // ─── Settings setters (persist to localStorage) ──────────────────────
  const setFontSize = useCallback(
    (n: number) => {
      setFontSizeState(n);
      persistAsync(storageKey("fontsize"), String(n));
    },
    [setFontSizeState],
  );
  const setOutputFontSizeEnabled = useCallback(
    (b: boolean) => {
      setOutputFontSizeEnabledState(b);
      persistAsync(storageKey("outputfontsize_enabled"), String(b));
    },
    [setOutputFontSizeEnabledState],
  );
  const setOutputFontSize = useCallback(
    (n: number) => {
      setOutputFontSizeState(n);
      persistAsync(storageKey("outputfontsize"), String(n));
    },
    [setOutputFontSizeState],
  );
  const setEditorTheme = useCallback(
    (t: string) => {
      setEditorThemeState(t);
      setStoredEditorTheme(t);
    },
    [setEditorThemeState],
  );
  const setWordWrap = useCallback(
    (b: boolean) => {
      setWordWrapState(b);
      persistAsync(storageKey("wordwrap"), String(b));
    },
    [setWordWrapState],
  );
  const setClearBeforeRun = useCallback(
    (b: boolean) => {
      setClearBeforeRunState(b);
      persistAsync(storageKey("clearbeforerun"), String(b));
    },
    [setClearBeforeRunState],
  );

  const savePragmaSettings = useCallback(
    (p: PragmaSettings) => {
      setPragmaSettingsState(p);
      pragmaSettingsRef.current = p;
      try {
        localStorage.setItem(
          storageKey("pragma_foreignkeys"),
          String(p.foreignKeys),
        );
        localStorage.setItem(storageKey("pragma_journalmode"), p.journalMode);
        localStorage.setItem(storageKey("pragma_synchronous"), p.synchronous);
        localStorage.setItem(storageKey("pragma_pagesize"), String(p.pageSize));
        localStorage.setItem(
          storageKey("pragma_automaticindex"),
          String(p.automaticIndex),
        );
        localStorage.setItem(
          storageKey("pragma_casesensitivelike"),
          String(p.caseSensitiveLike),
        );
      } catch {
        // ignore quota errors
      }
      if (engineRef.current) {
        void applyPragmasToEngine(engineRef.current, p);
      }
      showToast("Pragma settings saved.");
    },
    [setPragmaSettingsState, showToast],
  );

  const restoreDefaultSettings = useCallback(() => {
    const D = DEFAULT_PLAYGROUND_SETTINGS;
    setFontSize(D.fontSize);
    setOutputFontSize(D.outputFontSize);
    setOutputFontSizeEnabled(D.outputFontSizeEnabled);
    setEditorTheme(D.editorTheme);
    setWordWrap(D.wordWrap);
    setClearBeforeRun(D.clearBeforeRun);
    showToast("Default settings restored.");
  }, [
    setFontSize,
    setOutputFontSize,
    setOutputFontSizeEnabled,
    setEditorTheme,
    setWordWrap,
    setClearBeforeRun,
    showToast,
  ]);

  const clearAllLocalStorage = useCallback(() => {
    try {
      localStorage.clear();
    } catch {
      // ignore
    }
    window.location.reload();
  }, []);

  // Nuclear wipe: clears localStorage, OPFS, IndexedDB, and caches.
  // Backed by the shared `clearAllLocalData` helper so every playground
  // gets the same behaviour. Best-effort: failures inside one surface
  // don't block the others, and we always reload.
  const clearAllLocalData = useCallback(() => {
    void (async () => {
      try {
        const mod = await import("../storage/clearAllData");
        await mod.clearAllLocalData();
      } catch {
        /* fall through to reload regardless */
      }
      window.location.reload();
    })();
  }, []);

  const handleFormatCode = useCallback(async () => {
    const view = editorRef.current;
    if (!view) return;
    const code = view.state.doc.toString();
    if (!code.trim()) return;
    setIsFormatting(true);
    try {
      const { format: sqlFormat } = await import("sql-formatter");
      const formatted = sqlFormat(code, { language: "sqlite" });
      if (formatted === code) {
        showToast("Already formatted — nothing to change.");
        return;
      }
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: formatted },
      });
    } catch {
      // silently ignore formatting errors (e.g. unparseable SQL)
    } finally {
      setIsFormatting(false);
    }
  }, [showToast]);

  // ─── Loading overlay fade-out ────────────────────────────────────────
  useEffect(() => {
    if (!loaded) return;
    const id = window.setTimeout(() => setShowLoadingOverlay(false), 400);
    return () => window.clearTimeout(id);
  }, [loaded]);

  // When tabs are closed (or replaced wholesale), drop any result
  // entries whose owning tab no longer exists.
  useEffect(() => {
    setResultsByTab((prev) => {
      const ids = new Set(tabs.map((t) => t.id));
      let changed = false;
      const next: typeof prev = {};
      for (const k of Object.keys(prev)) {
        if (ids.has(k)) {
          next[k] = prev[k];
        } else {
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [tabs, setResultsByTab]);

  // ─── Hydrate persisted settings + db selection on mount ──────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    document.title = "SQLite Playground";
    document.body.classList.add("playground-active");

    const D = DEFAULT_PLAYGROUND_SETTINGS;
    const savedSize =
      Number(localStorage.getItem(storageKey("fontsize")) ?? D.fontSize) ||
      D.fontSize;
    const savedTheme =
      getStoredEditorTheme(storageKey("editortheme")) ?? D.editorTheme;
    const savedWordWrap =
      localStorage.getItem(storageKey("wordwrap")) !== "false";
    const savedClearBeforeRun =
      localStorage.getItem(storageKey("clearbeforerun")) === "true";
    const savedDb =
      localStorage.getItem(storageKey("db")) ?? SQLITE_SAMPLE_DATABASES[0].id;

    // ─── Hydrate pragma settings ─────────────────────────────────────
    const DP = DEFAULT_PRAGMA_SETTINGS;
    const savedPragmas: PragmaSettings = {
      foreignKeys:
        localStorage.getItem(storageKey("pragma_foreignkeys")) !== "false",
      journalMode:
        localStorage.getItem(storageKey("pragma_journalmode")) ??
        DP.journalMode,
      synchronous:
        localStorage.getItem(storageKey("pragma_synchronous")) ??
        DP.synchronous,
      pageSize: (() => {
        const raw = Number(localStorage.getItem(storageKey("pragma_pagesize")));
        return raw >= PRAGMA_PAGE_SIZE_MIN && raw <= PRAGMA_PAGE_SIZE_MAX
          ? raw
          : DP.pageSize;
      })(),
      automaticIndex:
        localStorage.getItem(storageKey("pragma_automaticindex")) !== "false",
      caseSensitiveLike:
        localStorage.getItem(storageKey("pragma_casesensitivelike")) === "true",
    };

    setFontSizeState(savedSize);
    setOutputFontSizeEnabledState(false);
    setOutputFontSizeState(D.outputFontSize);
    setEditorThemeState(savedTheme);
    setWordWrapState(savedWordWrap);
    setClearBeforeRunState(savedClearBeforeRun);
    setPragmaSettingsState(savedPragmas);
    pragmaSettingsRef.current = savedPragmas;
    const initialSample = findSampleDatabase(savedDb);
    setActiveDbId(initialSample.id);
    const initialTabs = loadTabs(initialSample.id, initialSample.defaultTabs);
    setTabs(initialTabs);
    setActiveTabId(loadActiveTabId(initialSample.id, initialTabs));

    applyMode(savedTheme);
    applyThemePalette(savedTheme);
    document.documentElement.style.setProperty(
      "--cm-font-size",
      `${savedSize}px`,
    );
    document.documentElement.style.setProperty(
      "--output-font-size",
      `${D.outputFontSize}px`,
    );

    return () => {
      document.body.classList.remove("playground-active");
      clearThemePalette();
    };
  }, [
    setClearBeforeRunState,
    setEditorThemeState,
    setFontSizeState,
    setOutputFontSizeEnabledState,
    setOutputFontSizeState,
    setPragmaSettingsState,
    setWordWrapState,
    setActiveDbId,
    setTabs,
    setActiveTabId,
  ]);

  // ─── Boot the engine and CodeMirror ──────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    if (editorHostRef.current && !editorRef.current) {
      const initialTheme =
        getStoredEditorTheme(storageKey("editortheme")) ??
        DEFAULT_PLAYGROUND_SETTINGS.editorTheme;
      const initialWordWrap =
        localStorage.getItem(storageKey("wordwrap")) !== "false";
      const compartments = makeSqlEditorCompartments();

      const view = new EditorView({
        doc: "",
        parent: editorHostRef.current,
        extensions: createSqlEditorExtensions({
          dialect: "sqlite",
          compartments,
          initialTheme,
          initialWordWrap,
          onSelectionChange: (hasSelection) => {
            setHasEditorSelectionRef.current(hasSelection);
          },
          onDocChange: (code) => {
            const id = activeTabIdRef.current;
            if (!id) return;
            const next = tabsRef.current.map((t) =>
              t.id === id ? { ...t, code } : t,
            );
            tabsRef.current = next;
            setTabs(next);
            saveTabs(activeDbIdRef.current, next);
          },
          onRunSelection: (text) => runSelectionRef.current(text),
          onRunAll: () => runRef.current(),
        }),
      });

      editorRef.current = view;
      themeCompRef.current = compartments.theme;
      wrapCompRef.current = compartments.wrap;
      completionCompRef.current = compartments.completion;
      sqlLangCompRef.current = compartments.lang;
    }

    (async () => {
      try {
        setLoadingMessage("Loading SQLite engine…");
        const initialSampleId =
          localStorage.getItem(storageKey("db")) ??
          SQLITE_SAMPLE_DATABASES[0].id;
        // Resolve (or auto-create) the active workspace for this
        // playground tab so the engine can persist its database
        // to OPFS. When OPFS is unavailable, `ensureActiveWorkspace`
        // still returns a registry-only entry and the engine falls
        // back to in-memory mode.
        let workspaceId: string | null = null;
        try {
          const workspace = await ensureActiveWorkspace(PLAYGROUND_ID);
          workspaceId = workspace.id;
          setActiveWorkspace({ id: workspace.id, name: workspace.name });
          // Tab-isolation notice: warn once per (workspace × session)
          // when another tab already holds the OPFS lock for this
          // workspace, so the user knows edits here can conflict.
          const noticeKey = `playground_ws_warned_${workspace.id}`;
          try {
            if (window.sessionStorage.getItem(noticeKey) !== "1") {
              const hasLock = await acquireWorkspaceLock(workspace.id);
              if (!cancelled && !hasLock) {
                window.sessionStorage.setItem(noticeKey, "1");
                showToast(
                  "This workspace is already open in another tab. Edits here may conflict — switch workspaces via the badge in the header.",
                  "warn",
                );
              }
            }
          } catch {
            /* sessionStorage / Locks unavailable — ignore. */
          }
        } catch {
          // Workspace bootstrap is best-effort — proceed in-memory.
        }
        const engine = await sqliteAdapter.createEngine(
          initialSampleId,
          workspaceId,
        );
        if (cancelled) return;
        engineRef.current = engine;
        setEngineForRender(engine);

        // Apply any user-saved pragma settings to the freshly-initialised
        // database. pragmaSettingsRef is already populated from the
        // localStorage hydration effect that runs synchronously on mount.
        await applyPragmasToEngine(engine, pragmaSettingsRef.current);

        const sample = await engine.activeSample();
        setActiveDbId(sample.id);
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

        // Initialise the editor with the active tab's contents.
        const view = editorRef.current;
        if (view) {
          const t = tabsRef.current.find(
            (x) => x.id === activeTabIdRef.current,
          );
          view.dispatch({
            changes: {
              from: 0,
              to: view.state.doc.length,
              insert: t?.code ?? "",
            },
          });
        }

        setLoaded(true);
        setStatusState("ready");
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
        setLoadingMessage(`Failed to load: ${msg}`);
        setStatusState("error");
      }
    })();
    return () => {
      cancelled = true;
      // Terminate the engine worker so its OPFS access handles are
      // released — a zombie worker would otherwise keep the workspace's
      // opfs-sahpool locked across StrictMode remounts and client-side
      // route changes, failing the next boot's OPFS acquisition. A boot
      // still in flight here is handled by createSqliteEngine itself,
      // which terminates the previous worker before spawning a new one.
      engineRef.current?.dispose?.();
      engineRef.current = null;
      editorRef.current?.destroy();
      editorRef.current = null;
      themeCompRef.current = null;
      wrapCompRef.current = null;
      completionCompRef.current = null;
      sqlLangCompRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Push editor-theme changes into CodeMirror after init.
  useEffect(() => {
    if (editorRef.current && themeCompRef.current) {
      editorRef.current.dispatch({
        effects: themeCompRef.current.reconfigure(themeFor(editorTheme)),
      });
    }
    applyThemePalette(editorTheme);
    applyMode(editorTheme);
  }, [editorTheme]);

  useEffect(() => {
    if (editorRef.current && wrapCompRef.current) {
      editorRef.current.dispatch({
        effects: wrapCompRef.current.reconfigure(
          wordWrap ? EditorView.lineWrapping : [],
        ),
      });
    }
  }, [wordWrap]);

  // Keep autocomplete schema in sync with the current database tables/views.
  useEffect(() => {
    const engine = engineRef.current;
    const view = editorRef.current;
    const sqlComp = sqlLangCompRef.current;
    const completionComp = completionCompRef.current;
    if (!engine || !view || !sqlComp || !completionComp) return;
    let cancelled = false;
    void (async () => {
      const schema: Record<string, string[]> = {};
      const completionSchema: SqlCompletionSchema = {
        entities: [],
        schemas: ["main", "temp"],
      };
      for (const name of tables) {
        let cols: Awaited<ReturnType<typeof engine.listColumns>> = [];
        let fks: Awaited<ReturnType<typeof engine.listForeignKeys>> = [];
        try {
          [cols, fks] = await Promise.all([
            engine.listColumns(name),
            engine.listForeignKeys(name).catch(() => []),
          ]);
        } catch {
          // Leave the entity in place with no columns so the table name
          // itself still completes.
        }
        schema[name] = cols.map((c) => c.name);
        completionSchema.entities.push({
          name,
          columns: cols.map((c) => ({ name: c.name, type: c.type })),
          kind: "table",
          foreignKeys: fks.map((fk) => ({
            column: fk.from,
            refEntity: fk.table,
            refColumn: fk.to,
          })),
        });
      }
      for (const name of views) {
        let cols: Awaited<ReturnType<typeof engine.listColumns>> = [];
        try {
          cols = await engine.listColumns(name);
        } catch {
          // Same fallback as tables: keep the view name completable.
        }
        schema[name] = cols.map((c) => c.name);
        completionSchema.entities.push({
          name,
          columns: cols.map((c) => ({ name: c.name, type: c.type })),
          kind: "view",
        });
      }
      if (cancelled) return;
      const langExt = await makeSqlLangExtension("sqlite", schema);
      if (cancelled) return;
      view.dispatch({
        effects: [
          sqlComp.reconfigure(langExt),
          completionComp.reconfigure(
            makeSqlAutocompletionExtension(completionSchema, "sqlite"),
          ),
        ],
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [tables, views]);

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--cm-font-size",
      `${fontSize}px`,
    );
    editorRef.current?.requestMeasure();
  }, [fontSize]);

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--output-font-size",
      `${DEFAULT_PLAYGROUND_SETTINGS.outputFontSize}px`,
    );
  }, []);

  // Swap the editor's contents whenever the active tab id changes.
  useEffect(() => {
    if (!loaded) return;
    const view = editorRef.current;
    if (!view || !activeTab) return;
    if (view.state.doc.toString() !== activeTab.code) {
      view.dispatch({
        changes: {
          from: 0,
          to: view.state.doc.length,
          insert: activeTab.code,
        },
      });
    }
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(
          dbScopedKey(activeDbId, "active_tab"),
          activeTabId,
        );
      } catch {
        // Ignore quota errors.
      }
    }
    // Focus the editor so the user can type immediately after any tab
    // operation. Skip tabs whose editor pane is hidden.
    const tab = tabsRef.current.find((t) => t.id === activeTabId);
    if (
      tab?.kind !== "er-diagram" &&
      tab?.kind !== "view-data" &&
      tab?.kind !== "query-history"
    ) {
      view?.focus();
    }
    // Only rerun when the active tab id changes, not on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTabId, loaded]);

  // Keep runRef / runSelectionRef in sync with the latest callbacks.
  useEffect(() => {
    runRef.current = () => {
      runActiveTab();
    };
    runSelectionRef.current = (sql: string) => {
      runSelection(sql);
    };
  }, [runActiveTab, runSelection]);

  // Hydrate sidebar collapse state for the active database.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const rawSections = localStorage.getItem(
        dbScopedKey(activeDbId, "sections_expanded"),
      );
      if (rawSections) {
        const parsed = JSON.parse(rawSections) as {
          tables?: boolean;
          views?: boolean;
        };
        setTablesSectionExpanded(parsed.tables !== false);
        setViewsSectionExpanded(parsed.views !== false);
      } else {
        setTablesSectionExpanded(true);
        setViewsSectionExpanded(true);
      }
      const rawExpanded = localStorage.getItem(
        dbScopedKey(activeDbId, "expanded_entities"),
      );
      if (rawExpanded) {
        const parsed = JSON.parse(rawExpanded) as string[];
        if (Array.isArray(parsed)) {
          setExpandedEntities(
            new Set(parsed.filter((s) => typeof s === "string")),
          );
        } else {
          setExpandedEntities(new Set());
        }
      } else {
        setExpandedEntities(new Set());
      }
    } catch {
      setExpandedEntities(new Set());
    }
    // Cached metadata is per-database, so wipe it when the DB changes.
    setColumnsByEntity({});
    setForeignKeysByEntity({});
  }, [
    activeDbId,
    setTablesSectionExpanded,
    setViewsSectionExpanded,
    setExpandedEntities,
    setColumnsByEntity,
    setForeignKeysByEntity,
  ]);

  // Persist section collapse state whenever it changes.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(
        dbScopedKey(activeDbId, "sections_expanded"),
        JSON.stringify({
          tables: tablesSectionExpanded,
          views: viewsSectionExpanded,
        }),
      );
    } catch {
      // ignore quota errors
    }
  }, [activeDbId, tablesSectionExpanded, viewsSectionExpanded]);

  // PK / FK lookups for every editable source table in the current result —
  // the query-wide table plus each per-set table of a multi-statement run.
  useEffect(() => {
    if (!result) return;
    const tables = new Set<string>();
    if (result.sourceTable) tables.add(result.sourceTable);
    for (const t of result.sourceTables ?? []) if (t) tables.add(t);
    for (const t of tables) {
      if (
        columnsByEntity[t] === undefined ||
        foreignKeysByEntity[t] === undefined
      ) {
        refreshEntityMetadata(t);
      }
    }
  }, [result, columnsByEntity, foreignKeysByEntity, refreshEntityMetadata]);

  useEffect(() => {
    if (activeTab?.kind !== "er-diagram") return;
    refreshTableMetadata();
    // Intentionally omit activeTab?.kind: we only want this to fire when
    // `tables` changes (e.g. a new table was created), not on every switch
    // back to the ER diagram tab. The initial refresh on tab-open is already
    // handled inside openErDiagramTab().
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tables, refreshTableMetadata]);

  // Lazy-load (and re-load) metadata for every currently-expanded
  // sidebar entity that has no cached `columnsByEntity` entry.
  // Use `engineForRender` (local state, null on every mount) as the
  // trigger so that returning from another playground re-fetches columns
  // even when the Zustand `loaded` flag was already true.
  useEffect(() => {
    if (expandedEntities.size === 0) return;
    if (!engineForRender) return;
    for (const name of expandedEntities) {
      if (columnsByEntity[name] === undefined) {
        refreshEntityMetadata(name);
      }
    }
  }, [
    expandedEntities,
    columnsByEntity,
    refreshEntityMetadata,
    engineForRender,
  ]);

  // ─── Resizer (vertical, between results panel and editor) ────────────
  useEffect(() => {
    const resizer = resizerRef.current;
    const panes = panesRef.current;
    const editorPane = editorPaneRef.current;
    const resultsPane = resultsPaneRef.current;
    if (!resizer || !panes || !editorPane || !resultsPane) return;
    let dragging = false;
    let startY = 0;
    let startEditorH = 0;
    let startResultsH = 0;
    const onDown = (e: MouseEvent) => {
      dragging = true;
      startY = e.clientY;
      startEditorH = editorPane.offsetHeight;
      startResultsH = resultsPane.offsetHeight;
      resizer.classList.add("dragging");
      document.body.style.cursor = "row-resize";
      document.body.style.userSelect = "none";
    };
    const onMove = (e: MouseEvent) => {
      if (!dragging) return;
      const total = startEditorH + startResultsH;
      if (total <= 0) return;
      const dy = e.clientY - startY;
      const editorH = Math.min(
        total - Math.round(total * 0.15),
        Math.max(Math.round(total * 0.15), startEditorH + dy),
      );
      const editorFrac = editorH / total;
      panes.style.gridTemplateRows = `auto minmax(0, ${editorFrac}fr) 6px minmax(0, ${1 - editorFrac}fr)`;
    };
    const onUp = () => {
      if (!dragging) return;
      dragging = false;
      resizer.classList.remove("dragging");
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    resizer.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      resizer.removeEventListener("mousedown", onDown);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  // Clear any inline gridTemplateRows set by the resizer when entering
  // view-data or er-diagram mode.
  useEffect(() => {
    const panes = panesRef.current;
    if (!panes) return;
    if (activeTab?.kind === "view-data" || activeTab?.kind === "er-diagram") {
      panes.style.gridTemplateRows = "";
    }
  }, [activeTab?.kind]);

  // ─── Sidebar resizer (horizontal, between sidebar and panes) ─────────
  useEffect(() => {
    const shell = shellRef.current;
    const resizer = sidebarResizerRef.current;
    if (!shell || !resizer) return;
    // Hydrate from localStorage on mount.
    try {
      const saved = Number(localStorage.getItem(storageKey("sidebar_w")));
      if (Number.isFinite(saved) && saved >= 160 && saved <= 600) {
        shell.style.setProperty("--sql-sidebar-width", `${saved}px`);
      }
    } catch {
      // ignore
    }
    let dragging = false;
    let startX = 0;
    let startW = 0;
    const onDown = (e: MouseEvent) => {
      dragging = true;
      startX = e.clientX;
      const sidebar = shell.firstElementChild as HTMLElement | null;
      startW = sidebar?.offsetWidth ?? 240;
      resizer.classList.add("dragging");
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    };
    const onMove = (e: MouseEvent) => {
      if (!dragging) return;
      const shellWidth = shell.offsetWidth;
      const maxW = Math.max(200, Math.min(600, shellWidth - 320));
      const next = Math.max(160, Math.min(maxW, startW + (e.clientX - startX)));
      shell.style.setProperty("--sql-sidebar-width", `${next}px`);
    };
    const onUp = () => {
      if (!dragging) return;
      dragging = false;
      resizer.classList.remove("dragging");
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      const sidebar = shell.firstElementChild as HTMLElement | null;
      const w = sidebar?.offsetWidth;
      if (w) {
        try {
          localStorage.setItem(storageKey("sidebar_w"), String(w));
        } catch {
          // ignore
        }
      }
    };
    resizer.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      resizer.removeEventListener("mousedown", onDown);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  // ─── Loading-screen quip rotator ─────────────────────────────────────
  useEffect(() => {
    if (quipSeedRef.current < 0) {
      quipSeedRef.current = Math.floor(Math.random() * LOADING_QUIPS.length);
    }
  }, []);
  useEffect(() => {
    if (loaded || statusState === "error") return;
    let tick = 0;
    const id = window.setInterval(() => {
      tick += 1;
      setQuipIndex(
        tick === 1
          ? Math.max(0, quipSeedRef.current)
          : (prev) => (prev + 1) % LOADING_QUIPS.length,
      );
    }, 2200);
    return () => window.clearInterval(id);
  }, [loaded, statusState]);

  // ─── Computed values ─────────────────────────────────────────────────
  const activeSample = useMemo(() => {
    const base =
      customDb?.id === activeDbId ? customDb : findSampleDatabase(activeDbId);
    const overrideName = customFilenames[activeDbId];
    if (overrideName) return { ...base, filename: overrideName };
    return base;
  }, [activeDbId, customDb, customFilenames]);

  // Filename of the pending database (shown in the switch-database dialog).
  const pendingDbFilename = useMemo(() => {
    if (!pendingDbId) return "";
    if (pendingDbId === "__blank__") return "blank.sqlite";
    const sample = findSampleDatabase(pendingDbId);
    return customFilenames[pendingDbId] ?? sample.filename;
  }, [pendingDbId, customFilenames]);

  // Drag-and-drop tab reordering is handled by the generic TabBar
  // internally; SqlPlayground no longer needs its own DnD sensors or
  // dragging-tab state for the tab strip.

  // Resolve PK / FK / constraint hints for any table by name, so each result
  // set of a multi-statement run is editable against its own table.
  const tableMetaFor = useCallback(
    (tableName: string) => {
      const cols = columnsByEntity[tableName];
      const fks = foreignKeysByEntity[tableName];
      const pk = new Set<string>();
      const readOnly = new Set<string>();
      for (const c of cols ?? []) {
        if (c.pk > 0) pk.add(c.name);
        if (c.generated) readOnly.add(c.name);
      }
      const fkByName = new Map<string, ForeignKeyInfo>();
      for (const fk of fks ?? []) fkByName.set(fk.from, fk);
      const keyHints = cols || fks ? { pk, fk: fkByName, readOnly } : undefined;
      return { keyHints, constraintInfo: constraintsByEntity[tableName] };
    },
    [columnsByEntity, foreignKeysByEntity, constraintsByEntity],
  );

  const resultKeyHints = useMemo<ColumnKeyHints | undefined>(() => {
    const tableName = result?.sourceTable;
    if (!tableName) return undefined;
    const cols = columnsByEntity[tableName];
    const fks = foreignKeysByEntity[tableName];
    if (!cols && !fks) return undefined;
    const pk = new Set<string>();
    for (const c of cols ?? []) {
      if (c.pk > 0) pk.add(c.name);
    }
    const fkByName = new Map<string, ForeignKeyInfo>();
    for (const fk of fks ?? []) fkByName.set(fk.from, fk);
    const readOnly = new Set<string>();
    for (const c of cols ?? []) {
      if (c.generated) readOnly.add(c.name);
    }
    return { pk, fk: fkByName, readOnly };
  }, [result, columnsByEntity, foreignKeysByEntity]);

  const resultConstraintInfo = useMemo<
    ColumnConstraintInfo[] | undefined
  >(() => {
    const tableName = result?.sourceTable;
    if (!tableName) return undefined;
    return constraintsByEntity[tableName];
  }, [result, constraintsByEntity]);

  return (
    <SqlPlaygroundShell
      playgroundId={PLAYGROUND_ID}
      playgroundTitle="SQLite Playground"
      loaded={loaded}
      statusState={statusState}
      keepOverlayMounted={showLoadingOverlay}
      loadingOverlayClassName={loadingFading ? "hidden" : ""}
      loadingHeroRepeat={4}
      loadingCaption={
        statusState === "error" ? loadingMessage : LOADING_QUIPS[quipIndex]
      }
      headerActions={
        <>
          {activeWorkspace && (
            <WorkspaceBadge
              playgroundId={PLAYGROUND_ID}
              activeWorkspaceId={activeWorkspace.id}
              activeWorkspaceName={activeWorkspace.name}
            />
          )}
          <div className="header-actions desktop-only">
            <Menu.Root>
              <Menu.Trigger
                className="header-btn"
                title="Import data"
                aria-label="Import"
                disabled={!loaded}
              >
                <ArrowUpFromLine size={14} aria-hidden="true" />
                <span className="btn-label">Import</span>
              </Menu.Trigger>
              <Menu.Portal>
                <Menu.Positioner sideOffset={6} align="start">
                  <Menu.Popup className="bui-popup examples-dropdown export-dropdown">
                    <div className="import-section-label">Database</div>
                    <Menu.Item
                      className="example-item export-item"
                      onClick={() => setImportSqliteOpen(true)}
                    >
                      <div className="export-item-text">
                        <div className="ex-title">
                          from SQLite
                          <span className="ext-badge">.sqlite</span>
                        </div>
                        <div className="ex-desc">
                          Replace database from .sqlite file
                        </div>
                      </div>
                    </Menu.Item>
                    <Menu.Item
                      className="example-item export-item"
                      onClick={() => setImportSqlDumpOpen(true)}
                    >
                      <div className="export-item-text">
                        <div className="ex-title">
                          from SQL dump
                          <span className="ext-badge">.sql</span>
                        </div>
                        <div className="ex-desc">
                          Load database from a SQL dump file
                        </div>
                      </div>
                    </Menu.Item>
                    <div className="import-section-label">Tables</div>
                    <Menu.Item
                      className="example-item export-item"
                      onClick={() => {
                        setImportCsvState(null);
                        setImportCsvOpen(true);
                      }}
                    >
                      <div className="export-item-text">
                        <div className="ex-title">
                          from CSV
                          <span className="ext-badge">.csv</span>
                        </div>
                        <div className="ex-desc">Add table from CSV file</div>
                      </div>
                    </Menu.Item>
                    <Menu.Item
                      className="example-item export-item"
                      onClick={() => {
                        setImportJsonState(null);
                        setImportJsonOpen(true);
                      }}
                    >
                      <div className="export-item-text">
                        <div className="ex-title">
                          from JSON
                          <span className="ext-badge">.json</span>
                        </div>
                        <div className="ex-desc">Add table from JSON array</div>
                      </div>
                    </Menu.Item>
                    <Menu.Item
                      className="example-item export-item"
                      onClick={() => {
                        setImportParquetOpen(true);
                        setImportParquetDragging(false);
                      }}
                    >
                      <div className="export-item-text">
                        <div className="ex-title">
                          from Parquet
                          <span className="ext-badge">.parquet</span>
                        </div>
                        <div className="ex-desc">
                          Add table from Parquet file
                        </div>
                      </div>
                    </Menu.Item>
                  </Menu.Popup>
                </Menu.Positioner>
              </Menu.Portal>
            </Menu.Root>
            {tables.length === 0 && loaded ? (
              <Popover.Root
                open={exportNoTabsHover}
                onOpenChange={setExportNoTabsHover}
              >
                <div
                  style={{ cursor: "not-allowed" }}
                  onMouseEnter={() => setExportNoTabsHover(true)}
                  onMouseLeave={() => setExportNoTabsHover(false)}
                  onFocus={() => setExportNoTabsHover(true)}
                  onBlur={() => setExportNoTabsHover(false)}
                  tabIndex={0}
                  role="button"
                  aria-disabled="true"
                  aria-label="Export (create a table to enable)"
                >
                  <Popover.Trigger
                    className="header-btn"
                    disabled
                    style={{ pointerEvents: "none" }}
                    title="Export database"
                    aria-label="Export"
                  >
                    <ArrowDownToLine size={14} aria-hidden="true" />
                    <span className="btn-label">Export DB</span>
                  </Popover.Trigger>
                </div>
                <Popover.Portal>
                  <Popover.Positioner
                    sideOffset={6}
                    align="start"
                    className="sql-export-disabled-positioner"
                  >
                    <Popover.Popup className="bui-popup sql-export-disabled-popup">
                      Create a table to export the database
                    </Popover.Popup>
                  </Popover.Positioner>
                </Popover.Portal>
              </Popover.Root>
            ) : (
              <Menu.Root>
                <Menu.Trigger
                  className="header-btn"
                  title="Export database"
                  aria-label="Export"
                  disabled={!loaded}
                >
                  <ArrowDownToLine size={14} aria-hidden="true" />
                  <span className="btn-label">Export DB</span>
                </Menu.Trigger>
                <Menu.Portal>
                  <Menu.Positioner sideOffset={6} align="start">
                    <Menu.Popup className="bui-popup examples-dropdown export-dropdown">
                      <div className="sql-result-export-group-label">
                        SQLite Database
                      </div>
                      <Menu.Item
                        className="example-item export-item"
                        onClick={exportDatabase}
                      >
                        <div className="export-item-text">
                          <div className="ex-title">
                            SQLite File
                            <span className="ext-badge">.sqlite</span>
                          </div>
                          <div className="ex-desc">Download as .sqlite</div>
                        </div>
                      </Menu.Item>
                      <Menu.Item
                        className="example-item export-item"
                        onClick={exportDatabaseAsSqlDump}
                      >
                        <div className="export-item-text">
                          <div className="ex-title">
                            SQL Dump
                            <span className="ext-badge">.sql</span>
                          </div>
                          <div className="ex-desc">DDL + INSERT statements</div>
                        </div>
                      </Menu.Item>
                      <Menu.Item
                        className="example-item export-item"
                        onClick={exportDatabaseToXlsx}
                      >
                        <div className="export-item-text">
                          <div className="ex-title">
                            Excel Workbook
                            <span className="ext-badge">.xlsx</span>
                          </div>
                          <div className="ex-desc">One sheet per table</div>
                        </div>
                      </Menu.Item>
                    </Menu.Popup>
                  </Menu.Positioner>
                </Menu.Portal>
              </Menu.Root>
            )}
            <Popover.Root>
              <Popover.Trigger
                openOnHover
                delay={150}
                closeDelay={400}
                render={(triggerProps) => (
                  <button
                    {...triggerProps}
                    type="button"
                    className="header-btn icon-only"
                    aria-label="Query history"
                    onClick={openQueryHistoryTab}
                  >
                    <History size={14} aria-hidden="true" />
                  </button>
                )}
              />
              <Popover.Portal>
                <Popover.Positioner sideOffset={6} align="end">
                  <Popover.Popup className="bui-popup pane-btn-popover">
                    History
                  </Popover.Popup>
                </Popover.Positioner>
              </Popover.Portal>
            </Popover.Root>
            <Popover.Root>
              <Popover.Trigger
                openOnHover
                delay={150}
                closeDelay={400}
                render={(triggerProps) => (
                  <button
                    {...triggerProps}
                    type="button"
                    className="header-btn icon-only"
                    aria-label="ER diagram"
                    onClick={openErDiagramTab}
                  >
                    <Network size={14} aria-hidden="true" />
                  </button>
                )}
              />
              <Popover.Portal>
                <Popover.Positioner sideOffset={6} align="end">
                  <Popover.Popup className="bui-popup pane-btn-popover">
                    ER Diagram
                  </Popover.Popup>
                </Popover.Positioner>
              </Popover.Portal>
            </Popover.Root>
            <Popover.Root>
              <Popover.Trigger
                className="header-btn icon-only"
                title="Runtime info"
                aria-label="Runtime info"
              >
                <FaInfo size={13} aria-hidden="true" />
              </Popover.Trigger>
              <Popover.Portal>
                <Popover.Positioner sideOffset={6} align="end">
                  <Popover.Popup className="bui-popup info-popover">
                    <RuntimeInfoContent info={RUNTIME_INFO} />
                  </Popover.Popup>
                </Popover.Positioner>
              </Popover.Portal>
            </Popover.Root>
          </div>
        </>
      }
    >
      <SwitchDatabaseDialog
          open={pendingDbId !== null}
          onOpenChange={(next) => { if (!next) setPendingDbId(null); }}
          currentWorkspaceName={activeWorkspace?.name ?? "Default SQLite Workspace"}
          newDbFilename={pendingDbFilename}
          onOverwrite={() => {
            if (pendingDbId) performDbSwitch(pendingDbId);
            setPendingDbId(null);
          }}
          onCreateNew={async () => {
            if (!pendingDbId) return;
            try {
              localStorage.setItem(storageKey("db"), pendingDbId);
            } catch { /* ignore */ }
            const label = pendingDbId === "__blank__"
              ? "New SQLite Database"
              : findSampleDatabase(pendingDbId).label;
            const newWs = await createWorkspace(`${label} Workspace`, PLAYGROUND_ID);
            setPendingDbId(null);
            switchActiveWorkspace(PLAYGROUND_ID, newWs.id);
          }}
        />

        <AlertDialog.Root
          open={confirmCloseTabId !== null}
          onOpenChange={(next) => {
            if (!next) setConfirmCloseTabId(null);
          }}
        >
          <AlertDialog.Portal>
            <AlertDialog.Backdrop className="confirm-backdrop" />
            <AlertDialog.Popup className="confirm-popup">
              <AlertDialog.Title className="confirm-title">
                Close this tab?
              </AlertDialog.Title>
              <AlertDialog.Description className="confirm-desc">
                The query in this tab will be discarded. This can&rsquo;t be
                undone.
              </AlertDialog.Description>
              <div className="confirm-actions">
                <AlertDialog.Close className="confirm-btn confirm-btn-secondary">
                  Cancel
                </AlertDialog.Close>
                <AlertDialog.Close
                  className="confirm-btn confirm-btn-danger"
                  onClick={confirmCloseTab}
                >
                  Discard &amp; close
                </AlertDialog.Close>
              </div>
            </AlertDialog.Popup>
          </AlertDialog.Portal>
        </AlertDialog.Root>

        <SqlSettingsConfirmDialogs
          dialectDisplayName="SQLite"
          restoreOpen={confirmRestoreOpen}
          onRestoreOpenChange={setConfirmRestoreOpen}
          onRestoreConfirm={restoreDefaultSettings}
          clearStorageOpen={confirmClearStorageOpen}
          onClearStorageOpenChange={setConfirmClearStorageOpen}
          onClearStorageConfirm={clearAllLocalStorage}
          clearAllDataOpen={confirmClearAllDataOpen}
          onClearAllDataOpenChange={setConfirmClearAllDataOpen}
          onClearAllDataConfirm={clearAllLocalData}
        />

        <AlertDialog.Root
          open={truncateConfirm !== null}
          onOpenChange={(next) => {
            if (!next) setTruncateConfirm(null);
          }}
        >
          <AlertDialog.Portal>
            <AlertDialog.Backdrop className="confirm-backdrop" />
            <AlertDialog.Popup className="confirm-popup">
              <AlertDialog.Title className="confirm-title">
                Truncate table?
              </AlertDialog.Title>
              <AlertDialog.Description className="confirm-desc">
                Truncate table <strong>{truncateConfirm}</strong>? This deletes
                every row but keeps the schema. The change is in-memory only and
                will be undone next page load.
              </AlertDialog.Description>
              <p className="confirm-desc-note">
                Runs as a plain <strong>DELETE</strong> (SQLite has no
                TRUNCATE).
              </p>
              <div className="confirm-actions">
                <AlertDialog.Close className="confirm-btn confirm-btn-secondary">
                  Cancel
                </AlertDialog.Close>
                <AlertDialog.Close
                  className="confirm-btn confirm-btn-danger"
                  onClick={confirmTruncate}
                >
                  Truncate
                </AlertDialog.Close>
              </div>
            </AlertDialog.Popup>
          </AlertDialog.Portal>
        </AlertDialog.Root>

        {/* ── Drop entity confirmation dialog ── */}
        <AlertDialog.Root
          open={pendingDropEntity !== null}
          onOpenChange={(next) => {
            if (!next) setPendingDropEntity(null);
          }}
        >
          <AlertDialog.Portal>
            <AlertDialog.Backdrop className="confirm-backdrop" />
            <AlertDialog.Popup className="confirm-popup">
              <AlertDialog.Title className="confirm-title">
                Drop{" "}
                {pendingDropEntity
                  ? DROP_KIND_LABELS[pendingDropEntity.kind]
                  : ""}
                ?
              </AlertDialog.Title>
              <AlertDialog.Description className="confirm-desc">
                Drop{" "}
                {pendingDropEntity
                  ? DROP_KIND_LABELS[pendingDropEntity.kind].toLowerCase()
                  : ""}{" "}
                <strong>{pendingDropEntity?.name}</strong>? This change is
                in-memory only and will be undone next page load.
              </AlertDialog.Description>
              <div className="confirm-actions">
                <AlertDialog.Close className="confirm-btn confirm-btn-secondary">
                  Cancel
                </AlertDialog.Close>
                <AlertDialog.Close
                  className="confirm-btn confirm-btn-danger"
                  onClick={confirmDrop}
                >
                  Drop
                </AlertDialog.Close>
              </div>
            </AlertDialog.Popup>
          </AlertDialog.Portal>
        </AlertDialog.Root>

        <ImportBinaryFileDialog
          open={importSqliteOpen}
          dragging={importSqliteDragging}
          onClose={() => setImportSqliteOpen(false)}
          onDraggingChange={setImportSqliteDragging}
          onImport={(data, filename) => performImportSqlite(data, filename)}
          title="Import SQLite File"
          description={
            <>
              Open a local <code>.sqlite</code> or <code>.db</code> file as a
              new in-memory database.
            </>
          }
          warningText={
            <>
              This is a playground environment. Your file will{" "}
              <strong>not</strong> be uploaded or persisted — it is only loaded
              into browser memory and will be gone on reload.
            </>
          }
          dropText="Drop a SQLite file here"
          browseHint="or click to browse — .sqlite, .db"
          accept=".sqlite,.db,.sqlite3"
          inputAriaLabel="Choose SQLite file"
        />

        <ImportSqlDumpDialog
          open={importSqlDumpOpen}
          dragging={importSqlDumpDragging}
          onClose={() => setImportSqlDumpOpen(false)}
          onDraggingChange={setImportSqlDumpDragging}
          onImport={(sql, filename) => performImportSqlDump(sql, filename)}
        />

        <RenameDatabaseDialog
          open={renameDbOpen}
          name={renameDbBaseName}
          ext={renameDbExt}
          extensionOptions={[
            { value: ".sqlite", label: ".sqlite (most common)" },
            ".db",
            ".sqlite3",
            ".db3",
          ]}
          onNameChange={setRenameDbBaseName}
          onExtChange={setRenameDbExt}
          onClose={() => setRenameDbOpen(false)}
          description="Choose a new filename for the current database."
          onConfirm={(newFilename) => {
            setCustomFilenames((prev) => ({
              ...prev,
              [activeDbId]: newFilename,
            }));
            if (customDb?.id === activeDbId) {
              setCustomDb((prev) =>
                prev ? { ...prev, filename: newFilename } : prev,
              );
            }
            showToast(`Renamed to "${newFilename}".`);
            setRenameDbOpen(false);
          }}
        />

        {/* ── Import CSV dialog ── */}
        <Dialog.Root
          open={importCsvOpen}
          onOpenChange={(next) => {
            if (!next) {
              setImportCsvOpen(false);
              setImportCsvState(null);
              setImportCsvDragging(false);
            }
          }}
        >
          <Dialog.Portal>
            <Dialog.Backdrop className="confirm-backdrop" />
            <Dialog.Popup className="confirm-popup sql-import-popup">
              <Dialog.Title className="confirm-title">
                Import CSV File
              </Dialog.Title>
              <Dialog.Description className="confirm-desc">
                Parse a CSV file and import its rows into a new or existing
                table.
              </Dialog.Description>
              <div className="sql-import-warning">
                <TriangleAlert
                  size={14}
                  className="sql-import-warning-icon"
                  aria-hidden="true"
                />
                <span>
                  This is a playground — your data is only held in browser
                  memory and will not be persisted on reload.
                </span>
              </div>
              {!importCsvState ? (
                <div
                  className={`sql-dropzone${importCsvDragging ? " dragging" : ""}`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setImportCsvDragging(true);
                  }}
                  onDragLeave={() => setImportCsvDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setImportCsvDragging(false);
                    const file = e.dataTransfer.files[0];
                    if (file) handleCsvFile(file);
                  }}
                >
                  <FileText
                    size={28}
                    className="sql-dropzone-icon"
                    aria-hidden="true"
                  />
                  <span>Drop a CSV file here</span>
                  <span className="sql-dropzone-hint">
                    or click to browse — .csv
                  </span>
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    aria-label="Choose CSV file"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleCsvFile(file);
                      e.target.value = "";
                    }}
                  />
                </div>
              ) : (
                <>
                  <div className="sql-import-target-row">
                    <div className="sql-import-mode-btns">
                      <button
                        type="button"
                        className={`sql-import-mode-btn${importCsvState.targetMode === "new" ? " active" : ""}`}
                        onClick={() =>
                          setImportCsvState((prev) =>
                            prev
                              ? { ...prev, targetMode: "new", colCompare: null }
                              : null,
                          )
                        }
                      >
                        New table
                      </button>
                      <button
                        type="button"
                        className={`sql-import-mode-btn${importCsvState.targetMode === "existing" ? " active" : ""}`}
                        disabled={tables.length === 0}
                        onClick={() => {
                          void (async () => {
                            const targetTable =
                              importCsvState.targetTable || tables[0] || "";
                            const tableCols =
                              (await engineRef.current?.listColumns(targetTable)) ?? [];
                            setImportCsvState((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  targetMode: "existing",
                                  targetTable,
                                  colCompare: computeImportColComparison(
                                    prev.headers,
                                    tableCols,
                                  ),
                                  }
                                : null,
                            );
                          })();
                        }}
                      >
                        Existing table
                      </button>
                    </div>
                    {importCsvState.targetMode === "new" ? (
                      <input
                        id="csv-table-name"
                        className="sql-rename-input"
                        value={importCsvState.tableName}
                        onChange={(e) =>
                          setImportCsvState((prev) =>
                            prev
                              ? { ...prev, tableName: e.target.value }
                              : null,
                          )
                        }
                        placeholder="Table name"
                        autoFocus
                      />
                    ) : (
                      <select
                        className="sql-import-target-select"
                        value={importCsvState.targetTable}
                        onChange={(e) => {
                          const newTable = e.target.value;
                          void (async () => {
                            const tableCols =
                              (await engineRef.current?.listColumns(newTable)) ?? [];
                            setImportCsvState((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  targetTable: newTable,
                                  colCompare: computeImportColComparison(
                                    prev.headers,
                                    tableCols,
                                  ),
                                  }
                                : null,
                            );
                          })();
                        }}
                        autoFocus
                      >
                        {tables.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  {importCsvState.targetMode === "existing" &&
                  importCsvState.colCompare ? (
                    <div className="sql-import-col-compare">
                      <table>
                        <thead>
                          <tr>
                            <th>File column</th>
                            <th>Table column</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {importCsvState.colCompare.map((r, i) => (
                            <tr key={i}>
                              <td>{r.fileCol ?? <em>—</em>}</td>
                              <td>{r.tableCol ?? <em>—</em>}</td>
                              <td className={`cmp-${r.status}`}>
                                {IMPORT_COL_STATUS_LABEL[r.status]}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="sql-import-preview">
                      <table>
                        <thead>
                          <tr>
                            {importCsvState.headers.map((h) => (
                              <th key={h}>{h || "(empty)"}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {importCsvState.rows.slice(0, 5).map((row, i) => (
                            <tr key={i}>
                              {row.map((cell, j) => (
                                <td key={j}>{cell || <em>NULL</em>}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--text-dim)",
                      marginBottom: 8,
                    }}
                  >
                    {importCsvState.rows.length} row
                    {importCsvState.rows.length === 1 ? "" : "s"} ·{" "}
                    {importCsvState.headers.length} column
                    {importCsvState.headers.length === 1 ? "" : "s"}
                    {importCsvState.rows.length > 5 &&
                      importCsvState.targetMode === "new" &&
                      ` · showing first 5`}
                  </div>
                </>
              )}
              <div className="confirm-actions" style={{ marginTop: 16 }}>
                <Dialog.Close className="confirm-btn confirm-btn-secondary">
                  Cancel
                </Dialog.Close>
                {importCsvState && (
                  <button
                    type="button"
                    className="confirm-btn confirm-btn-primary"
                    onClick={submitCsvImport}
                  >
                    Import
                  </button>
                )}
              </div>
            </Dialog.Popup>
          </Dialog.Portal>
        </Dialog.Root>

        {/* ── Import JSON dialog ── */}
        <Dialog.Root
          open={importJsonOpen}
          onOpenChange={(next) => {
            if (!next) {
              setImportJsonOpen(false);
              setImportJsonState(null);
              setImportJsonDragging(false);
            }
          }}
        >
          <Dialog.Portal>
            <Dialog.Backdrop className="confirm-backdrop" />
            <Dialog.Popup className="confirm-popup sql-import-popup">
              <Dialog.Title className="confirm-title">
                Import JSON File
              </Dialog.Title>
              <Dialog.Description className="confirm-desc">
                Parse a JSON array of objects and import its rows into a new or
                existing table.
              </Dialog.Description>
              <div className="sql-import-warning">
                <TriangleAlert
                  size={14}
                  className="sql-import-warning-icon"
                  aria-hidden="true"
                />
                <span>
                  This is a playground — your data is only held in browser
                  memory and will not be persisted on reload.
                </span>
              </div>
              {!importJsonState ? (
                <div
                  className={`sql-dropzone${importJsonDragging ? " dragging" : ""}`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setImportJsonDragging(true);
                  }}
                  onDragLeave={() => setImportJsonDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setImportJsonDragging(false);
                    const file = e.dataTransfer.files[0];
                    if (file) handleJsonFile(file);
                  }}
                >
                  <FileJson
                    size={28}
                    className="sql-dropzone-icon"
                    aria-hidden="true"
                  />
                  <span>Drop a JSON file here</span>
                  <span className="sql-dropzone-hint">
                    or click to browse — .json (array of objects)
                  </span>
                  <input
                    type="file"
                    accept=".json,application/json"
                    aria-label="Choose JSON file"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleJsonFile(file);
                      e.target.value = "";
                    }}
                  />
                </div>
              ) : (
                <>
                  <div className="sql-import-target-row">
                    <div className="sql-import-mode-btns">
                      <button
                        type="button"
                        className={`sql-import-mode-btn${importJsonState.targetMode === "new" ? " active" : ""}`}
                        onClick={() =>
                          setImportJsonState((prev) =>
                            prev
                              ? { ...prev, targetMode: "new", colCompare: null }
                              : null,
                          )
                        }
                      >
                        New table
                      </button>
                      <button
                        type="button"
                        className={`sql-import-mode-btn${importJsonState.targetMode === "existing" ? " active" : ""}`}
                        disabled={tables.length === 0}
                        onClick={() => {
                          void (async () => {
                            const targetTable =
                              importJsonState.targetTable || tables[0] || "";
                            const tableCols =
                              (await engineRef.current?.listColumns(targetTable)) ?? [];
                            setImportJsonState((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  targetMode: "existing",
                                  targetTable,
                                  colCompare: computeImportColComparison(
                                    prev.headers,
                                    tableCols,
                                  ),
                                }
                              : null,
                            );
                          })();
                        }}
                      >
                        Existing table
                      </button>
                    </div>
                    {importJsonState.targetMode === "new" ? (
                      <input
                        id="json-table-name"
                        className="sql-rename-input"
                        value={importJsonState.tableName}
                        onChange={(e) =>
                          setImportJsonState((prev) =>
                            prev
                              ? { ...prev, tableName: e.target.value }
                              : null,
                          )
                        }
                        placeholder="Table name"
                        autoFocus
                      />
                    ) : (
                      <select
                        className="sql-import-target-select"
                        value={importJsonState.targetTable}
                        onChange={(e) => {
                          const newTable = e.target.value;
                          void (async () => {
                            const tableCols =
                              (await engineRef.current?.listColumns(newTable)) ?? [];
                            setImportJsonState((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  targetTable: newTable,
                                  colCompare: computeImportColComparison(
                                    prev.headers,
                                    tableCols,
                                  ),
                                }
                              : null,
                            );
                          })();
                        }}
                        autoFocus
                      >
                        {tables.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  {importJsonState.targetMode === "existing" &&
                  importJsonState.colCompare ? (
                    <div className="sql-import-col-compare">
                      <table>
                        <thead>
                          <tr>
                            <th>File column</th>
                            <th>Table column</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {importJsonState.colCompare.map((r, i) => (
                            <tr key={i}>
                              <td>{r.fileCol ?? <em>—</em>}</td>
                              <td>{r.tableCol ?? <em>—</em>}</td>
                              <td className={`cmp-${r.status}`}>
                                {IMPORT_COL_STATUS_LABEL[r.status]}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="sql-import-preview">
                      <table>
                        <thead>
                          <tr>
                            {importJsonState.headers.map((h) => (
                              <th key={h}>{h || "(empty)"}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {importJsonState.rows.slice(0, 5).map((row, i) => (
                            <tr key={i}>
                              {row.map((cell, j) => (
                                <td key={j}>{cell || <em>NULL</em>}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--text-dim)",
                      marginBottom: 8,
                    }}
                  >
                    {importJsonState.rows.length} row
                    {importJsonState.rows.length === 1 ? "" : "s"} ·{" "}
                    {importJsonState.headers.length} column
                    {importJsonState.headers.length === 1 ? "" : "s"}
                    {importJsonState.rows.length > 5 &&
                      importJsonState.targetMode === "new" &&
                      ` · showing first 5`}
                  </div>
                </>
              )}
              <div className="confirm-actions" style={{ marginTop: 16 }}>
                <Dialog.Close className="confirm-btn confirm-btn-secondary">
                  Cancel
                </Dialog.Close>
                {importJsonState && (
                  <button
                    type="button"
                    className="confirm-btn confirm-btn-primary"
                    onClick={submitJsonImport}
                  >
                    Import
                  </button>
                )}
              </div>
            </Dialog.Popup>
          </Dialog.Portal>
        </Dialog.Root>

        {/* ── Import Parquet dialog ── */}
        <Dialog.Root
          open={importParquetOpen}
          onOpenChange={(next) => {
            if (!next) {
              setImportParquetOpen(false);
              setImportParquetState(null);
              setImportParquetDragging(false);
            }
          }}
        >
          <Dialog.Portal>
            <Dialog.Backdrop className="confirm-backdrop" />
            <Dialog.Popup className="confirm-popup sql-import-popup">
              <Dialog.Title className="confirm-title">
                Import Parquet File
              </Dialog.Title>
              <Dialog.Description className="confirm-desc">
                Read a Parquet file and add its rows into a new or existing
                table.
              </Dialog.Description>
              <div className="sql-import-warning">
                <TriangleAlert
                  size={14}
                  className="sql-import-warning-icon"
                  aria-hidden="true"
                />
                <span>
                  This is a playground — your data is only held in browser
                  memory and will not be persisted on reload.
                </span>
              </div>
              {!importParquetState ? (
                <div
                  className={`sql-dropzone${importParquetDragging ? " dragging" : ""}`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setImportParquetDragging(true);
                  }}
                  onDragLeave={() => setImportParquetDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setImportParquetDragging(false);
                    const file = e.dataTransfer.files[0];
                    if (file) handleParquetFile(file);
                  }}
                >
                  <Database
                    size={28}
                    className="sql-dropzone-icon"
                    aria-hidden="true"
                  />
                  <span>Drop a Parquet file here</span>
                  <span className="sql-dropzone-hint">
                    or click to browse — .parquet
                  </span>
                  <input
                    type="file"
                    accept=".parquet,application/octet-stream"
                    aria-label="Choose Parquet file"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleParquetFile(file);
                      e.target.value = "";
                    }}
                  />
                </div>
              ) : (
                <>
                  <div className="sql-import-target-row">
                    <div className="sql-import-mode-btns">
                      <button
                        type="button"
                        className={`sql-import-mode-btn${importParquetState.targetMode === "new" ? " active" : ""}`}
                        onClick={() =>
                          setImportParquetState((prev) =>
                            prev
                              ? { ...prev, targetMode: "new", colCompare: null }
                              : null,
                          )
                        }
                      >
                        New table
                      </button>
                      <button
                        type="button"
                        className={`sql-import-mode-btn${importParquetState.targetMode === "existing" ? " active" : ""}`}
                        disabled={tables.length === 0}
                        onClick={() => {
                          void (async () => {
                            const targetTable =
                              importParquetState.targetTable || tables[0] || "";
                            const tableCols =
                              (await engineRef.current?.listColumns(targetTable)) ?? [];
                            setImportParquetState((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  targetMode: "existing",
                                  targetTable,
                                  colCompare: computeImportColComparison(
                                    prev.columns,
                                    tableCols,
                                  ),
                                }
                              : null,
                            );
                          })();
                        }}
                      >
                        Existing table
                      </button>
                    </div>
                    {importParquetState.targetMode === "new" ? (
                      <input
                        id="parquet-table-name"
                        className="sql-rename-input"
                        value={importParquetState.tableName}
                        onChange={(e) =>
                          setImportParquetState((prev) =>
                            prev
                              ? { ...prev, tableName: e.target.value }
                              : null,
                          )
                        }
                        placeholder="Table name"
                        autoFocus
                      />
                    ) : (
                      <select
                        className="sql-import-target-select"
                        value={importParquetState.targetTable}
                        onChange={(e) => {
                          const newTable = e.target.value;
                          void (async () => {
                            const tableCols =
                              (await engineRef.current?.listColumns(newTable)) ?? [];
                            setImportParquetState((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  targetTable: newTable,
                                  colCompare: computeImportColComparison(
                                    prev.columns,
                                    tableCols,
                                  ),
                                }
                              : null,
                            );
                          })();
                        }}
                        autoFocus
                      >
                        {tables.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  {importParquetState.targetMode === "existing" &&
                  importParquetState.colCompare ? (
                    <div className="sql-import-col-compare">
                      <table>
                        <thead>
                          <tr>
                            <th>File column</th>
                            <th>Table column</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {importParquetState.colCompare.map((r, i) => (
                            <tr key={i}>
                              <td>{r.fileCol ?? <em>—</em>}</td>
                              <td>{r.tableCol ?? <em>—</em>}</td>
                              <td className={`cmp-${r.status}`}>
                                {IMPORT_COL_STATUS_LABEL[r.status]}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="sql-import-preview">
                      <table>
                        <thead>
                          <tr>
                            {importParquetState.columns.map((h) => (
                              <th key={h}>{h || "(empty)"}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {importParquetState.rows.slice(0, 5).map((row, i) => (
                            <tr key={i}>
                              {row.map((cell, j) => (
                                <td key={j}>
                                  {cell === null ? <em>NULL</em> : String(cell)}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--text-dim)",
                      marginBottom: 8,
                    }}
                  >
                    {importParquetState.rows.length} row
                    {importParquetState.rows.length === 1 ? "" : "s"} ·{" "}
                    {importParquetState.columns.length} column
                    {importParquetState.columns.length === 1 ? "" : "s"}
                    {importParquetState.rows.length > 5 &&
                      importParquetState.targetMode === "new" &&
                      ` · showing first 5`}
                  </div>
                </>
              )}
              <div className="confirm-actions" style={{ marginTop: 16 }}>
                <Dialog.Close className="confirm-btn confirm-btn-secondary">
                  Cancel
                </Dialog.Close>
                {importParquetState && (
                  <button
                    type="button"
                    className="confirm-btn confirm-btn-primary"
                    onClick={submitParquetImport}
                  >
                    Import
                  </button>
                )}
              </div>
            </Dialog.Popup>
          </Dialog.Portal>
        </Dialog.Root>

        <DdlViewerDialog
          open={ddlDialog !== null}
          onOpenChange={(next) => { if (!next) setDdlDialog(null); }}
          title={ddlDialog?.title ?? ""}
          sql={ddlDialog?.sql ?? ""}
          theme={editorTheme}
          description={
            <>
              Read-only view of the original <code>CREATE</code> statement(s)
              recorded in <code>sqlite_master</code>.
            </>
          }
          onCopied={() => showToast("Copied DDL to clipboard.")}
          onCopyFailed={() => showToast("Couldn't copy to clipboard.", "warn")}
        />

        <Dialog.Root
          open={modifyDialog !== null}
          onOpenChange={(next) => {
            if (!next) {
              setModifyDialog(null);
              setModifyInvalidColIds(new Set());
              setModifyStructureTab("columns");
            }
          }}
        >
          <Dialog.Portal>
            <Dialog.Backdrop className="confirm-backdrop sql-modify-backdrop" />
            <Dialog.Popup className="sql-modify-drawer">
              <header className="sql-modify-drawer-header">
                <div className="sql-modify-drawer-heading">
                  <Dialog.Title className="sql-modify-drawer-title">
                    View/Edit Structure
                  </Dialog.Title>
                  <Dialog.Description className="sql-modify-drawer-subtitle">
                    <Table size={12} className="sql-modify-drawer-entity-icon" aria-hidden="true" />
                    {modifyDialog?.originalName ?? ""}
                  </Dialog.Description>
                </div>
                <Dialog.Close
                  className="sql-modify-drawer-close"
                  aria-label="Close"
                >
                  <X size={16} aria-hidden="true" />
                </Dialog.Close>
              </header>
              {modifyDialog && (
                <ModifyStructureForm
                  state={modifyDialog}
                  onChange={(next) => {
                    setModifyDialog({
                      ...next,
                      originalSignature: modifyDialog!.originalSignature,
                    });
                    if (modifyInvalidColIds.size > 0) {
                      setModifyInvalidColIds((prev) => {
                        const updated = new Set(prev);
                        for (const col of next.columns) {
                          if (col.name.trim()) updated.delete(col.id);
                        }
                        return updated;
                      });
                    }
                  }}
                  invalidColumnIds={modifyInvalidColIds}
                  knownTables={tables}
                  engine={engineForRender}
                  onDropLeaf={dropLeafEntity}
                  theme={editorTheme}
                  activeTab={
                    modifyStructureTab as
                      | "columns"
                      | "indexes"
                      | "triggers"
                      | undefined
                  }
                  onTabChange={setModifyStructureTab}
                  refreshKey={modifyStructureRefreshKey}
                />
              )}
              {modifyStructureTab === "columns" && (
                <footer className="sql-modify-drawer-footer">
                  <button
                    type="button"
                    className="confirm-btn confirm-btn-danger sql-modify-drawer-drop"
                    onClick={() => {
                      const name = modifyDialog?.originalName;
                      setModifyDialog(null);
                      setModifyInvalidColIds(new Set());
                      setModifyStructureTab("columns");
                      if (name) dropEntity(name, "table");
                    }}
                  >
                    Drop Table
                  </button>
                  <Dialog.Close className="confirm-btn confirm-btn-secondary">
                    Cancel
                  </Dialog.Close>
                  <button
                    type="button"
                    className="confirm-btn confirm-btn-primary"
                    onClick={submitModifyStructure}
                    disabled={
                      !modifyDialog ||
                      modifyDialogSignature(modifyDialog) ===
                        modifyDialog.originalSignature
                    }
                  >
                    Save
                  </button>
                </footer>
              )}
            </Dialog.Popup>
          </Dialog.Portal>
        </Dialog.Root>

        {/* ── Add Row drawer ── */}
        <Dialog.Root
          open={addRowDialog !== null}
          onOpenChange={(next) => {
            if (!next) setAddRowDialog(null);
          }}
        >
          <Dialog.Portal>
            <Dialog.Backdrop className="confirm-backdrop sql-modify-backdrop" />
            <Dialog.Popup className="sql-modify-drawer">
              <header className="sql-modify-drawer-header">
                <div className="sql-modify-drawer-heading">
                  <Dialog.Title className="sql-modify-drawer-title">
                    Add Row
                  </Dialog.Title>
                  <Dialog.Description className="sql-modify-drawer-subtitle">
                    {addRowDialog?.tableName ?? ""}
                  </Dialog.Description>
                </div>
                <Dialog.Close
                  className="sql-modify-drawer-close"
                  aria-label="Close"
                >
                  <X size={16} aria-hidden="true" />
                </Dialog.Close>
              </header>
              {addRowDialog && (
                <div className="sql-modify-body">
                  <div className="sql-add-row-fields">
                    {addRowDialog.columns.map((c) => {
                      const hasDefault = c.defaultValue !== null;
                      const placeholder = hasDefault
                        ? `auto (${c.defaultValue})`
                        : c.notNull
                          ? "required"
                          : "NULL if empty";
                      return (
                        <label key={c.name} className="sql-add-row-field">
                          <span className="sql-add-row-field-label">
                            <span className="sql-add-row-field-name">
                              {c.name}
                            </span>
                            <span className="sql-add-row-field-type">
                              {c.type || "—"}
                            </span>
                          </span>
                          <input
                            className="sql-rename-input"
                            value={addRowDialog.values[c.name] ?? ""}
                            onChange={(e) =>
                              setAddRowDialog((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      values: {
                                        ...prev.values,
                                        [c.name]: e.target.value,
                                      },
                                    }
                                  : null,
                              )
                            }
                            placeholder={placeholder}
                            aria-label={c.name}
                          />
                        </label>
                      );
                    })}
                  </div>
                  <label className="sql-add-row-another">
                    <input
                      type="checkbox"
                      checked={addRowDialog.addAnother}
                      onChange={(e) =>
                        setAddRowDialog((prev) =>
                          prev
                            ? { ...prev, addAnother: e.target.checked }
                            : null,
                        )
                      }
                    />
                    Keep open to add another row
                  </label>
                </div>
              )}
              <footer className="sql-modify-drawer-footer">
                <Dialog.Close className="confirm-btn confirm-btn-secondary">
                  Cancel
                </Dialog.Close>
                <button
                  type="button"
                  className="confirm-btn confirm-btn-primary"
                  onClick={submitAddRow}
                  disabled={!addRowDialog}
                >
                  Add Row
                </button>
              </footer>
            </Dialog.Popup>
          </Dialog.Portal>
        </Dialog.Root>

        {/* ── Add Table drawer ── */}
        <Dialog.Root
          open={addTableDialog !== null}
          onOpenChange={(next) => {
            if (!next) {
              setAddTableDialog(null);
              setAddTableInvalidColIds(new Set());
            }
          }}
        >
          <Dialog.Portal>
            <Dialog.Backdrop className="confirm-backdrop sql-modify-backdrop" />
            <Dialog.Popup className="sql-modify-drawer">
              <header className="sql-modify-drawer-header">
                <div className="sql-modify-drawer-heading">
                  <Dialog.Title className="sql-modify-drawer-title">
                    Add Table
                  </Dialog.Title>
                  <Dialog.Description className="sql-modify-drawer-subtitle">
                    Create a new table
                  </Dialog.Description>
                </div>
                <Dialog.Close
                  className="sql-modify-drawer-close"
                  aria-label="Close"
                >
                  <X size={16} aria-hidden="true" />
                </Dialog.Close>
              </header>
              {addTableDialog && (
                <ModifyStructureForm
                  state={addTableDialog}
                  onChange={(next) => {
                    setAddTableDialog({
                      ...next,
                      originalSignature: addTableDialog!.originalSignature,
                    });
                    if (addTableInvalidColIds.size > 0) {
                      setAddTableInvalidColIds((prev) => {
                        const updated = new Set(prev);
                        for (const col of next.columns) {
                          if (col.name.trim()) updated.delete(col.id);
                        }
                        return updated;
                      });
                    }
                  }}
                  invalidColumnIds={addTableInvalidColIds}
                  knownTables={tables}
                  engine={engineForRender}
                />
              )}
              <footer className="sql-modify-drawer-footer">
                <Dialog.Close className="confirm-btn confirm-btn-secondary">
                  Cancel
                </Dialog.Close>
                <button
                  type="button"
                  className="confirm-btn confirm-btn-primary"
                  onClick={submitAddTable}
                  disabled={!addTableDialog}
                >
                  Create Table
                </button>
              </footer>
            </Dialog.Popup>
          </Dialog.Portal>
        </Dialog.Root>

        <CreateIndexDialog
          open={createIndexOpen}
          onOpenChange={setCreateIndexOpen}
          tables={tables}
          getColumns={listTableColumnNames}
          onSubmit={createSchemaObject}
        />
        <CreateViewDialog
          open={createViewOpen}
          onOpenChange={setCreateViewOpen}
          dialect="sqlite"
          defaultBody={createViewBody}
          onSubmit={createSchemaObject}
        />
        <ExplainPlanDialog
          open={explainPlan !== null}
          onOpenChange={(next) => {
            if (!next) setExplainPlan(null);
          }}
          querySql={explainPlan?.querySql ?? ""}
          plan={explainPlan?.plan ?? ""}
          onCopied={() => showToast("Plan copied.")}
          onCopyFailed={() => showToast("Couldn't copy to clipboard.", "warn")}
        />

        <div className="sql-shell" ref={shellRef}>
          <aside className="sql-sidebar" aria-label="Database explorer">
            <div className="sql-db-selector-wrap">
              <div className="sql-db-selector-row">
                <DatabaseSelector
                  value={activeDbId}
                  displayFilename={activeSample.filename}
                  samples={SQLITE_SAMPLE_DATABASES}
                  actions={SQLITE_DB_ACTIONS}
                  onChange={(value) => {
                    if (value === "__new_db__") {
                      requestDbSwitch("__blank__");
                      return;
                    }
                    if (value === "__import_sqlite__") {
                      setImportSqliteOpen(true);
                      return;
                    }
                    if (value === "__import_sql_dump__") {
                      setImportSqlDumpOpen(true);
                      return;
                    }
                    if (value === "__export_sql_dump__") {
                      exportDatabaseAsSqlDump();
                      return;
                    }
                    if (value === "__rename_db__") {
                      // Pre-populate with current filename (strip extension).
                      const cur = activeSample.filename;
                      const dotIdx = cur.lastIndexOf(".");
                      if (dotIdx > 0) {
                        setRenameDbBaseName(cur.slice(0, dotIdx));
                        const ext = cur.slice(dotIdx);
                        const knownExts = [
                          ".sqlite",
                          ".db",
                          ".sqlite3",
                          ".db3",
                        ];
                        setRenameDbExt(
                          knownExts.includes(ext) ? ext : ".sqlite",
                        );
                      } else {
                        setRenameDbBaseName(cur);
                        setRenameDbExt(".sqlite");
                      }
                      setRenameDbOpen(true);
                      return;
                    }
                    requestDbSwitch(value);
                  }}
                />
              </div>
            </div>

            <div className="sql-sidebar-body">
              <SqlIconSidebar
                buttons={[
                  {
                    icon: <Table size={15} aria-hidden="true" />,
                    label: "Tables",
                    onClick: () => {},
                    isActive: true,
                  },
                ]}
                bottomButtons={[
                  {
                    icon: (
                      <svg className="stroke-icon" viewBox="0 0 24 24" width={15} height={15} fill="none" stroke="currentColor" strokeWidth="1.8">
                        <circle cx="12" cy="12" r="3" />
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                      </svg>
                    ),
                    label: "Settings",
                    onClick: openSettingsTab,
                  },
                ]}
              />
              <div className="sql-sidebar-content">
            <div className="sql-tree">
              <SchemaSection
                label="Tables"
                count={tables.length}
                expanded={tablesSectionExpanded}
                onToggle={() => setTablesSectionExpanded((v) => !v)}
                emptyMessage="No tables."
                onAdd={openAddTable}
                allExpanded={
                  tables.length > 0 &&
                  tables.every((n) => expandedEntities.has(n))
                }
                onExpandAll={() => {
                  setTablesSectionExpanded(true);
                  expandAllEntities(tables);
                }}
                onCollapseAll={() => {
                  setTablesSectionExpanded(false);
                  collapseAllEntities(tables);
                }}
              >
                {tables.map((name) => (
                  <SchemaItem
                    key={`t-${name}`}
                    name={name}
                    kind="table"
                    expanded={expandedEntities.has(name)}
                    columns={columnsByEntity[name]}
                    foreignKeys={foreignKeysByEntity[name]}
                    onToggleExpanded={toggleEntityExpanded}
                    onPreview={previewTable}
                    onModifyStructure={openModifyStructure}
                    onAddRow={openAddRow}
                    onCount={countEntityRows}
                    onCopy={copyEntityName}
                    onTruncate={truncateEntity}
                    onDrop={dropEntity}
                    onViewDDL={viewDDL}
                    onExport={exportEntityToFormat}
                    onGetRowCount={getEntityRowCount}
                  />
                ))}
              </SchemaSection>
              <SchemaSection
                label="Views"
                count={views.length}
                expanded={viewsSectionExpanded}
                onToggle={() => setViewsSectionExpanded((v) => !v)}
                emptyMessage="No views."
                onAdd={openCreateView}
                allExpanded={
                  views.length > 0 &&
                  views.every((n) => expandedEntities.has(n))
                }
                onExpandAll={() => {
                  setViewsSectionExpanded(true);
                  expandAllEntities(views);
                }}
                onCollapseAll={() => {
                  setViewsSectionExpanded(false);
                  collapseAllEntities(views);
                }}
              >
                {views.map((name) => (
                  <SchemaItem
                    key={`v-${name}`}
                    name={name}
                    kind="view"
                    expanded={expandedEntities.has(name)}
                    columns={columnsByEntity[name]}
                    foreignKeys={foreignKeysByEntity[name]}
                    onToggleExpanded={toggleEntityExpanded}
                    onPreview={previewTable}
                    onStructure={describeEntity}
                    onCount={countEntityRows}
                    onCopy={copyEntityName}
                    onDrop={dropEntity}
                    onViewDDL={viewDDL}
                    onExport={exportEntityToFormat}
                    onGetRowCount={getEntityRowCount}
                  />
                ))}
              </SchemaSection>
              <SchemaSection
                label="Indexes"
                count={indexes.length}
                expanded={indexesSectionExpanded}
                onToggle={() => setIndexesSectionExpanded((v) => !v)}
                emptyMessage="No indexes."
                onAdd={() => setCreateIndexOpen(true)}
              >
                {indexes.map((name) => (
                  <SchemaLeafItem
                    key={`i-${name}`}
                    name={name}
                    kind="index"
                    onCopy={copyEntityName}
                    onViewDDL={viewLeafDDL}
                    onDrop={dropLeafEntity}
                  />
                ))}
              </SchemaSection>
              <SchemaSection
                label="Triggers"
                count={triggers.length}
                expanded={triggersSectionExpanded}
                onToggle={() => setTriggersSectionExpanded((v) => !v)}
                emptyMessage="No triggers."
              >
                {triggers.map((name) => (
                  <SchemaLeafItem
                    key={`tr-${name}`}
                    name={name}
                    kind="trigger"
                    onCopy={copyEntityName}
                    onViewDDL={viewLeafDDL}
                    onDrop={dropLeafEntity}
                  />
                ))}
              </SchemaSection>
            </div>
              </div>
            </div>
          </aside>

          <div
            className="sql-sidebar-resizer"
            ref={sidebarResizerRef}
            role="separator"
            aria-orientation="vertical"
            aria-label="Drag to resize tables panel"
            title="Drag to resize"
          />

          <div
            className={`sql-panes${activeTab?.kind === "view-data" ? " sql-panes--view-data" : ""}${activeTab?.kind === "er-diagram" ? " sql-panes--er-diagram" : ""}${activeTab?.kind === "query-history" ? " sql-panes--query-history" : ""}${isSettingsTabActive ? " sql-panes--settings" : ""}`}
            ref={panesRef}
          >
            <SqlTabBar
              tabs={tabs}
              activeTabId={activeTabId}
              onReorderTabs={reorderTabs}
              extraTabs={
                settingsOpen
                  ? [
                      {
                        id: SETTINGS_TAB_ID,
                        kind: "settings",
                        label: "Settings",
                        icon: <SettingsIcon size={11} aria-hidden="true" />,
                        closeable: true,
                        renameable: false,
                      } as TabDescriptor,
                    ]
                  : undefined
              }
              onExtraTabClose={(tabId) => {
                if (tabId === SETTINGS_TAB_ID) {
                  setSettingsOpen(false);
                  // Return focus to the most-recent non-settings tab.
                  const fallback = tabs[0]?.id;
                  if (fallback && activeTabIdRef.current === SETTINGS_TAB_ID) {
                    activeTabIdRef.current = fallback;
                    setActiveTabId(fallback);
                  }
                }
              }}
              onTabActivate={(tabId) => {
                const prevId = activeTabIdRef.current;
                if (tabId === SETTINGS_TAB_ID) {
                  activeTabIdRef.current = SETTINGS_TAB_ID;
                  setActiveTabId(SETTINGS_TAB_ID);
                  return;
                }
                if (prevId !== tabId) {
                  tabHistoryRef.current = pushTabHistory(
                    tabHistoryRef.current,
                    prevId,
                    tabId,
                  );
                }
                activeTabIdRef.current = tabId;
                setActiveTabId(tabId);
                // Re-click the already-active tab: focus the editor so
                // typing works immediately without a second click.
                const tab = tabs.find((t) => t.id === tabId);
                if (
                  prevId === tabId &&
                  tab?.kind !== "er-diagram" &&
                  tab?.kind !== "view-data" &&
                  tab?.kind !== "query-history"
                ) {
                  editorRef.current?.focus();
                }
              }}
              onTabClose={closeTab}
              onTabRename={renameTab}
              onTabDuplicate={duplicateTab}
              onTabCloseOthers={closeOtherTabs}
              onTabCloseAll={closeAllTabs}
              onAddTab={addTab}
            />

            <div
              className="sql-editor-pane"
              ref={editorPaneRef}
              style={
                activeTab?.kind === "view-data" ||
                activeTab?.kind === "er-diagram" ||
                activeTab?.kind === "query-history" ||
                isSettingsTabActive
                  ? { display: "none" }
                  : undefined
              }
            >
              <div className="editor-wrap" ref={editorHostRef} />
              <div className="sql-editor-corner-actions">
                <Popover.Root
                  open={isFormatting ? false : formatPopoverOpen}
                  onOpenChange={setFormatPopoverOpen}
                >
                  <Popover.Trigger
                    openOnHover
                    delay={150}
                    closeDelay={100}
                    render={(triggerProps) => (
                      <button
                        {...triggerProps}
                        type="button"
                        className="sql-editor-corner-btn"
                        aria-label="Format code"
                        aria-busy={isFormatting}
                        disabled={!loaded || isFormatting}
                        onClick={() => void handleFormatCode()}
                      >
                        {isFormatting ? (
                          <svg
                            viewBox="0 0 13 13"
                            width={13}
                            height={13}
                            className="run-btn-spinner"
                            aria-hidden="true"
                          >
                            <circle
                              cx="6.5"
                              cy="6.5"
                              r="5"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeDasharray="15 9"
                            />
                          </svg>
                        ) : (
                          <Wand2 size={13} aria-hidden="true" />
                        )}
                      </button>
                    )}
                  />
                  <Popover.Portal>
                    <Popover.Positioner
                      sideOffset={6}
                      align="center"
                      side="bottom"
                      className="sql-corner-positioner"
                    >
                      <Popover.Popup className="bui-popup sql-corner-popover">
                        Format code
                      </Popover.Popup>
                    </Popover.Positioner>
                  </Popover.Portal>
                </Popover.Root>
                <div className="sql-editor-corner-sep" aria-hidden="true" />
                <Popover.Root>
                  <Popover.Trigger
                    openOnHover
                    delay={150}
                    closeDelay={100}
                    render={(triggerProps) => (
                      <button
                        {...triggerProps}
                        type="button"
                        className="sql-editor-corner-btn"
                        aria-label="View Query History"
                        onClick={openQueryHistoryTab}
                      >
                        <History size={13} aria-hidden="true" />
                      </button>
                    )}
                  />
                  <Popover.Portal>
                    <Popover.Positioner
                      sideOffset={6}
                      align="center"
                      side="bottom"
                      className="sql-corner-positioner"
                    >
                      <Popover.Popup className="bui-popup sql-corner-popover">
                        Query history
                      </Popover.Popup>
                    </Popover.Positioner>
                  </Popover.Portal>
                </Popover.Root>
              </div>
              <SqlEditorToolbar
                loaded={loaded}
                running={statusState === "running"}
                hasEditorSelection={hasEditorSelection}
                hasMultipleStatements={hasMultipleStatements}
                isMac={isMac}
                onRunSelection={runCurrentSelection}
                onRunStatement={runStatementAtCursor}
                onRunAll={runActiveTab}
                onExplain={handleExplain}
              />
            </div>

            <div
              className="sql-resizer"
              ref={resizerRef}
              role="separator"
              aria-orientation="horizontal"
              aria-label="Drag to resize editor and results"
              title="Drag to resize"
              style={
                activeTab?.kind === "view-data" ||
                activeTab?.kind === "er-diagram" ||
                activeTab?.kind === "query-history"
                  ? { display: "none" }
                  : undefined
              }
            />

            <div
              className="sql-results-pane"
              ref={resultsPaneRef}
              style={
                activeTab?.kind === "er-diagram" ||
                activeTab?.kind === "query-history" ||
                isSettingsTabActive
                  ? { display: "none" }
                  : undefined
              }
            >
              <div className="sql-results-body">
                <ResultView
                  result={result}
                  loading={!loaded}
                  engineLabel="SQLite"
                  keyHints={resultKeyHints}
                  sourceTable={result?.sourceTable}
                  constraintInfo={resultConstraintInfo}
                  tableMetaFor={tableMetaFor}
                  onDeleteRows={deleteRowsFromTable}
                  onUpdateRows={updateRowsInTable}
                  onDuplicateRow={duplicateRowInTable}
                  globalPageSize={globalPageSize}
                  onSetGlobalPageSize={setGlobalPageSize}
                  onLoadPage={handleLoadPage}
                  onLoadMorePage={handleLoadMorePage}
                  onExportSnapshotChange={setResultSetExportSnapshot}
                  onExportResultSet={handleResultSetExport}
                  onOpenQueryTab={(title, sql) => openTabAndRun(title, sql)}
                />
              </div>
              <DataslopeRunOverlay running={statusState === "running"} />
            </div>

            {tabs.some((t) => t.kind === "er-diagram") && (
              <div
                className="sql-er-pane"
                style={
                  activeTab?.kind !== "er-diagram"
                    ? { display: "none" }
                    : undefined
                }
              >
                <ErDiagramPane
                  tables={tables}
                  columnsByEntity={columnsByEntity}
                  foreignKeysByEntity={foreignKeysByEntity}
                  isDark={!LIGHT_THEMES.has(editorTheme)}
                  onPreview={previewTable}
                  onModifyStructure={openModifyStructure}
                  onAddRow={openAddRow}
                  onCount={countEntityRows}
                  onCopy={copyEntityName}
                  onTruncate={truncateEntity}
                  onDrop={dropEntity}
                  onViewDDL={viewDDL}
                  onExport={exportEntityToFormat}
                  onGetRowCount={getEntityRowCount}
                />
              </div>
            )}

            {activeTab?.kind === "query-history" && (
              <div className="sql-er-pane">
                <QueryHistoryPane
                  history={queryHistory}
                  theme={editorTheme}
                  isPostgres={false}
                  onClear={clearHistory}
                  onOpenQueryTab={(title, sql) => openTabAndRun(title, sql)}
                  savedStorageKey={storageKey("saved_queries")}
                />
              </div>
            )}

            {isSettingsTabActive && (
              <div className="sql-settings-tab-pane">
                <SqlSettingsPanelContent
                  fontSize={fontSize}
                  setFontSize={setFontSize}
                  outputFontSizeEnabled={outputFontSizeEnabled}
                  setOutputFontSizeEnabled={setOutputFontSizeEnabled}
                  outputFontSize={outputFontSize}
                  setOutputFontSize={setOutputFontSize}
                  editorTheme={editorTheme}
                  setEditorTheme={setEditorTheme}
                  wordWrap={wordWrap}
                  setWordWrap={setWordWrap}
                  clearBeforeRun={clearBeforeRun}
                  setClearBeforeRun={setClearBeforeRun}
                  language={PLAYGROUND_ID}
                  onRestoreDefaults={() => setConfirmRestoreOpen(true)}
                  onClearLocalStorage={() => setConfirmClearStorageOpen(true)}
                  onClearAllLocalData={() => setConfirmClearAllDataOpen(true)}
                  resetTabsLabel={`Reset query tabs for ${activeSample.label}`}
                  onResetTabs={resetTabsForCurrentDb}
                  extraTabs={[
                    {
                      value: "pragmas",
                      trigger: (
                        <>
                          <Settings2 size={14} aria-hidden="true" />
                          <span className="settings-tab-label">Pragmas</span>
                        </>
                      ),
                      panel: (
                        <PragmaSettingsTab
                          savedPragmas={pragmaSettings}
                          onSave={savePragmaSettings}
                        />
                      ),
                    },
                  ]}
                />
              </div>
            )}
          </div>
        </div>
    </SqlPlaygroundShell>
  );
}
