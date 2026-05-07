import re

filepath = '/home/runner/work/dataslope-playground/dataslope-playground/app/_components/sql/SqlPlayground.tsx'

with open(filepath, 'r') as f:
    lines = f.readlines()  # keeps line endings

# ─── Step 1: Fix @dnd-kit/core import (remove DragEndEvent, DragStartEvent) ───
# Find the dnd-kit/core import block and remove the type lines
new_lines = []
i = 0
while i < len(lines):
    line = lines[i]
    # Remove the DragEndEvent and DragStartEvent type imports from dnd-kit/core
    if '  type DragEndEvent,' in line or '  type DragStartEvent,' in line:
        i += 1
        continue
    # Remove arrayMove, useSortable, sortableKeyboardCoordinates, verticalListSortingStrategy from dnd-kit/sortable
    if '  arrayMove,' in line or '  useSortable,' in line or '  sortableKeyboardCoordinates,' in line or '  verticalListSortingStrategy,' in line:
        i += 1
        continue
    # Remove KeyboardSensor from dnd-kit/core
    if '  KeyboardSensor,' in line:
        i += 1
        continue
    new_lines.append(line)
    i += 1

lines = new_lines

# ─── Step 2: Add new store/hook imports after existing store imports ───
# Find the line with useSqlPlaygroundStore import and add after it
insert_after = None
for i, line in enumerate(lines):
    if 'useSqlPlaygroundStore' in line and 'import' in line:
        insert_after = i
        break

if insert_after is not None:
    new_imports = [
        'import { useEngineStore } from "./stores/useEngineStore";\n',
        'import { useTabStore } from "./stores/useTabStore";\n',
        'import { useDialogStore } from "./stores/useDialogStore";\n',
        'import { useQueryRunner } from "./hooks/useQueryRunner";\n',
        'import { useTabManagement } from "./hooks/useTabManagement";\n',
        'import { useSidebarActions } from "./hooks/useSidebarActions";\n',
        'import { useDatabaseActions } from "./hooks/useDatabaseActions";\n',
    ]
    lines = lines[:insert_after + 1] + new_imports + lines[insert_after + 1:]

# ─── Step 3: Find the new line numbers after import changes ───
# Find line with "function SqlPlaygroundInner() {"
func_start = None
for i, line in enumerate(lines):
    if line.strip() == 'function SqlPlaygroundInner() {':
        func_start = i
        break

print(f"SqlPlaygroundInner starts at (0-indexed): {func_start} (line {func_start+1})")

# Find the return statement in SqlPlaygroundInner
# It's the line "  return (" that starts the JSX
# We need to find it after func_start
return_line = None
for i in range(func_start, len(lines)):
    if lines[i].strip() == 'return (':
        return_line = i
        break

print(f"JSX return starts at (0-indexed): {return_line} (line {return_line+1})")

# Find the closing brace of SqlPlaygroundInner (line after JSX)
# The closing } is at column 0 (no indentation) - it's the ONLY such }
# in the JSX section because all other } are indented.
func_end = None
for i in range(return_line, len(lines)):
    stripped = lines[i].rstrip('\n').rstrip('\r')
    if stripped == '}':  # exactly '}' with no indentation
        func_end = i
        break

print(f"SqlPlaygroundInner ends at (0-indexed): {func_end} (line {func_end+1})")

# ─── Step 4: Build the new SqlPlaygroundInner function body ───
# Everything from func_start to return_line-1 will be replaced
# with the new lean body. The JSX (return_line to func_end) stays verbatim.
# Everything after func_end is deleted.

new_body = '''function SqlPlaygroundInner() {
  const router = useRouter();

  // ─── Settings store ──────────────────────────────────────────────────
  const fontSize = useSettingsStore((s) => s.fontSize);
  const setFontSizeState = useSettingsStore((s) => s.setFontSize);
  const outputFontSizeEnabled = useSettingsStore((s) => s.outputFontSizeEnabled);
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
  const setGlobalPageSize = useCallback((n: number) => {
    globalPageSizeRef.current = n;
    setGlobalPageSizeState(n);
    try {
      localStorage.setItem(storageKey("page_size"), String(n));
    } catch {
      // ignore quota errors
    }
  }, [setGlobalPageSizeState]);

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
  const setForeignKeysByEntity = useEngineStore((s) => s.setForeignKeysByEntity);
  const constraintsByEntity = useEngineStore((s) => s.constraintsByEntity);
  const setConstraintsByEntity = useEngineStore((s) => s.setConstraintsByEntity);
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
  const resultSetExportSnapshot = useTabStore((s) => s.resultSetExportSnapshot);
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
  const setModifyStructureRefreshKey = useDialogStore(
    (s) => s.setModifyStructureRefreshKey,
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
  const [loadingMessage, setLoadingMessage] = useState("Loading SQLite engine\u2026");
  const [showLoadingOverlay, setShowLoadingOverlay] = useState(true);
  const [indexesSectionExpanded, setIndexesSectionExpanded] = useState(false);
  const [triggersSectionExpanded, setTriggersSectionExpanded] = useState(false);
  const [hasEditorSelection, setHasEditorSelection] = useState(false);
  const [engineForRender, setEngineForRender] = useState<SqliteEngine | null>(
    null,
  );
  const [quipIndex, setQuipIndex] = useState<number>(0);

  // ─── Derived values ──────────────────────────────────────────────────
  const activeTab = tabs.find((t) => t.id === activeTabId) ?? null;
  const result = activeTabId ? (resultsByTab[activeTabId] ?? null) : null;
  const loadingFading = loaded && showLoadingOverlay;
  const tabIds = useMemo(() => tabs.map((t) => t.id), [tabs]);

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
  const tabsRef = useRef<QueryTab[]>([]);
  const activeDbIdRef = useRef<string>(activeDbId);
  const panesRef = useRef<HTMLDivElement | null>(null);
  const resultsPaneRef = useRef<HTMLDivElement | null>(null);
  const editorPaneRef = useRef<HTMLDivElement | null>(null);
  const resizerRef = useRef<HTMLDivElement | null>(null);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const sidebarResizerRef = useRef<HTMLDivElement | null>(null);
  const quipSeedRef = useRef<number>(-1);

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

  // ─── isMac ───────────────────────────────────────────────────────────
  const isMac = useSyncExternalStore(
    () => () => {},
    () => detectIsMac(),
    () => false,
  );

  // ─── Custom hooks ────────────────────────────────────────────────────
  const queryRunnerRefs = { engineRef, editorRef, tabsRef, activeTabIdRef, activeDbIdRef };
  const {
    runSqlForTab,
    handleLoadPage,
    handleFetchAllRows,
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
    quoteIdent,
  } = useQueryRunner(queryRunnerRefs);

  const {
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

  const {
    addTab,
    openErDiagramTab,
    closeTab,
    confirmCloseTab,
    renameTab,
    duplicateTab,
    closeOtherTabs,
    closeAllTabs,
    handleTabDragStart,
    handleTabDragEnd,
    resetTabsForCurrentDb,
  } = useTabManagement(
    { editorRef, tabsRef, activeTabIdRef, activeDbIdRef },
    refreshTableMetadata,
  );

  const {
    applyDbLoad,
    performDbSwitch,
    performBlankLoad,
    performImportSqlite,
    requestDbSwitch,
    exportDatabase,
    exportDatabaseToXlsx,
    handleCsvFile,
    submitCsvImport,
    handleJsonFile,
    submitJsonImport,
    handleParquetFile,
    submitParquetImport,
  } = useDatabaseActions({ ...queryRunnerRefs, pragmaSettingsRef });

  // ─── Settings setters (persist to localStorage) ──────────────────────
  const setFontSize = useCallback((n: number) => {
    setFontSizeState(n);
    localStorage.setItem(storageKey("fontsize"), String(n));
  }, [setFontSizeState]);
  const setOutputFontSizeEnabled = useCallback((b: boolean) => {
    setOutputFontSizeEnabledState(b);
    localStorage.setItem(storageKey("outputfontsize_enabled"), String(b));
  }, [setOutputFontSizeEnabledState]);
  const setOutputFontSize = useCallback((n: number) => {
    setOutputFontSizeState(n);
    localStorage.setItem(storageKey("outputfontsize"), String(n));
  }, [setOutputFontSizeState]);
  const setEditorTheme = useCallback((t: string) => {
    setEditorThemeState(t);
    setStoredEditorTheme(t);
  }, [setEditorThemeState]);
  const setWordWrap = useCallback((b: boolean) => {
    setWordWrapState(b);
    localStorage.setItem(storageKey("wordwrap"), String(b));
  }, [setWordWrapState]);
  const setClearBeforeRun = useCallback((b: boolean) => {
    setClearBeforeRunState(b);
    localStorage.setItem(storageKey("clearbeforerun"), String(b));
  }, [setClearBeforeRunState]);

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
        localStorage.setItem(
          storageKey("pragma_pagesize"),
          String(p.pageSize),
        );
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
        applyPragmasToEngine(engineRef.current, p);
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

  // ─── Loading overlay fade-out ────────────────────────────────────────
  useEffect(() => {
    if (!loaded) return;
    const id = window.setTimeout(() => setShowLoadingOverlay(false), 400);
    return () => window.clearTimeout(id);
  }, [loaded]);

  // When tabs are closed (or replaced wholesale), drop any result
  // entries whose owning tab no longer exists.
  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
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
    document.body.classList.add("pg-active");

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
        const raw = Number(
          localStorage.getItem(storageKey("pragma_pagesize")),
        );
        return raw >= PRAGMA_PAGE_SIZE_MIN && raw <= PRAGMA_PAGE_SIZE_MAX
          ? raw
          : DP.pageSize;
      })(),
      automaticIndex:
        localStorage.getItem(storageKey("pragma_automaticindex")) !== "false",
      caseSensitiveLike:
        localStorage.getItem(storageKey("pragma_casesensitivelike")) === "true",
    };

    /* eslint-disable react-hooks/set-state-in-effect */
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
    /* eslint-enable react-hooks/set-state-in-effect */

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
      document.body.classList.remove("pg-active");
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
        getStoredEditorTheme(storageKey("editortheme")) ?? "lucario";
      const initialWordWrap =
        localStorage.getItem(storageKey("wordwrap")) !== "false";

      const themeComp = new Compartment();
      const wrapComp = new Compartment();
      const completionComp = new Compartment();
      const sqlLangComp = new Compartment();

      // Persist whichever tab is currently active. Tab id + tab list are
      // read from refs so this listener doesn\'t need to close over state.
      const persistListener = EditorView.updateListener.of((update) => {
        if (!update.docChanged) return;
        const id = activeTabIdRef.current;
        if (!id) return;
        const value = update.state.doc.toString();
        const next = tabsRef.current.map((t) =>
          t.id === id ? { ...t, code: value } : t,
        );
        tabsRef.current = next;
        setTabs(next);
        saveTabs(activeDbIdRef.current, next);
      });

      // Track whether the editor has an active text selection so the
      // Run button can switch between "Run" and "Run Selection" modes.
      const selectionListener = EditorView.updateListener.of((update) => {
        if (!update.selectionSet && !update.docChanged) return;
        const sel = update.state.selection.main;
        setHasEditorSelectionRef.current(!sel.empty);
      });

      const view = new EditorView({
        doc: "",
        parent: editorHostRef.current,
        extensions: [
          history(),
          drawSelection(),
          dropCursor(),
          EditorState.allowMultipleSelections.of(true),
          indentOnInput(),
          bracketMatching(),
          closeBrackets(),
          lineNumbersExt(),
          highlightActiveLineGutter(),
          highlightActiveLine(),
          highlightSelectionMatches(),
          rectangularSelection(),
          crosshairCursor(),
          EditorState.tabSize.of(2),
          indentUnit.of("  "),
          completionComp.of(
            sqlAutocompletion({ entities: [] }),
          ),
          tooltips({ parent: document.body }),
          keymap.of([
            {
              // Run selection if text is selected, otherwise run all.
              key: "Mod-Enter",
              run: (v) => {
                const sel = v.state.selection.main;
                if (!sel.empty) {
                  const selected = v.state.sliceDoc(sel.from, sel.to);
                  runSelectionRef.current(selected);
                } else {
                  runRef.current();
                }
                return true;
              },
            },
            {
              // Always run all queries (ignores any selection).
              key: "Mod-Shift-Enter",
              run: () => {
                runRef.current();
                return true;
              },
            },
            {
              key: "Ctrl-Space",
              run: (v) => {
                startCompletion(v);
                return true;
              },
            },
            ...closeBracketsKeymap,
            ...defaultKeymap,
            ...searchKeymap,
            ...historyKeymap,
            // Remove Enter from the default completion keymap so that Enter
            // always inserts a newline. Tab accepts the active completion
            // instead, falling through to indentWithTab when no completion
            // is shown.
            ...completionKeymap.filter((b) => b.key !== "Enter"),
            { key: "Tab", run: acceptCompletion },
            indentWithTab,
          ]),
          // Initial language config \u2014 the schema-aware variant is swapped
          // in via `sqlLangComp.reconfigure(...)` once the engine reports
          // its tables.
          sqlLangComp.of(sqlLang({ dialect: SQLite, upperCaseKeywords: false })),
          themeComp.of(themeFor(initialTheme)),
          wrapComp.of(initialWordWrap ? EditorView.lineWrapping : []),
          persistListener,
          selectionListener,
        ],
      });

      editorRef.current = view;
      themeCompRef.current = themeComp;
      wrapCompRef.current = wrapComp;
      completionCompRef.current = completionComp;
      sqlLangCompRef.current = sqlLangComp;
    }

    (async () => {
      try {
        setLoadingMessage("Loading SQLite engine\u2026");
        const initialSampleId =
          localStorage.getItem(storageKey("db")) ??
          SQLITE_SAMPLE_DATABASES[0].id;
        const engine = await createSqliteEngine(initialSampleId);
        if (cancelled) return;
        engineRef.current = engine;
        setEngineForRender(engine);

        // Apply any user-saved pragma settings to the freshly-initialised
        // database. pragmaSettingsRef is already populated from the
        // localStorage hydration effect that runs synchronously on mount.
        applyPragmasToEngine(engine, pragmaSettingsRef.current);

        const sample = engine.activeSample();
        setActiveDbId(sample.id);
        setTables(engine.listTables());
        setViews(engine.listViews());
        setIndexes(engine.listIndexes());
        setTriggers(engine.listTriggers());

        // Initialise the editor with the active tab\'s contents.
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
    const schema: Record<string, string[]> = {};
    const completionSchema: SqlCompletionSchema = { entities: [] };
    for (const name of tables) {
      try {
        schema[name] = engine.listColumns(name).map((c) => c.name);
      } catch {
        schema[name] = [];
      }
      completionSchema.entities.push({
        name,
        columns: schema[name],
        kind: "table",
      });
    }
    for (const name of views) {
      try {
        schema[name] = engine.listColumns(name).map((c) => c.name);
      } catch {
        schema[name] = [];
      }
      completionSchema.entities.push({
        name,
        columns: schema[name],
        kind: "view",
      });
    }
    view.dispatch({
      effects: [
        sqlComp.reconfigure(
          sqlLang({ dialect: SQLite, schema, upperCaseKeywords: false }),
        ),
        completionComp.reconfigure(
          sqlAutocompletion(completionSchema),
        ),
      ],
    });
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

  // Swap the editor\'s contents whenever the active tab id changes.
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
    // operation (activate, create, reorder, close, close-all).
    // Skip "er-diagram" / "view-data" tabs whose editor pane is hidden.
    const tab = tabsRef.current.find((t) => t.id === activeTabId);
    if (tab?.kind !== "er-diagram" && tab?.kind !== "view-data") {
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
    /* eslint-disable react-hooks/set-state-in-effect */
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
    /* eslint-enable react-hooks/set-state-in-effect */
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

  // PK / FK lookups for the current result\'s source table.
  useEffect(() => {
    if (!result?.sourceTable) return;
    if (
      columnsByEntity[result.sourceTable] === undefined ||
      foreignKeysByEntity[result.sourceTable] === undefined
    ) {
      refreshEntityMetadata(result.sourceTable);
    }
  }, [result, columnsByEntity, foreignKeysByEntity, refreshEntityMetadata]);

  useEffect(() => {
    if (activeTab?.kind !== "er-diagram") return;
    refreshTableMetadata();
  }, [activeTab?.kind, tables, refreshTableMetadata]);

  // Lazy-load (and re-load) metadata for every currently-expanded
  // sidebar entity that has no cached `columnsByEntity` entry.
  useEffect(() => {
    if (expandedEntities.size === 0) return;
    if (!loaded || !engineRef.current) return;
    for (const name of expandedEntities) {
      if (columnsByEntity[name] === undefined) {
        refreshEntityMetadata(name);
      }
    }
  }, [expandedEntities, columnsByEntity, refreshEntityMetadata, loaded]);

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
      const next = Math.max(
        160,
        Math.min(maxW, startW + (e.clientX - startX)),
      );
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

  const tabDragSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
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
    return { pk, fk: fkByName };
  }, [result, columnsByEntity, foreignKeysByEntity]);

  const resultConstraintInfo = useMemo<ColumnConstraintInfo[] | undefined>(() => {
    const tableName = result?.sourceTable;
    if (!tableName) return undefined;
    return constraintsByEntity[tableName];
  }, [result, constraintsByEntity]);

'''

# ─── Step 5: Build the new file ───
# Keep prefix (lines 0 to func_start-1), then write new body,
# then verbatim JSX (return_line to func_end), then stop.

prefix = lines[:func_start]  # lines before SqlPlaygroundInner (includes the blank line)
jsx_and_closing = lines[return_line:func_end + 1]  # "  return (" through "}"

# Combine
new_file_parts = []
new_file_parts.extend(prefix)
new_file_parts.append(new_body)  # This includes the opening "function SqlPlaygroundInner() {" up to just before "  return ("
new_file_parts.extend(jsx_and_closing)
new_file_parts.append('\n')  # final newline

# Write the file
with open(filepath, 'w') as f:
    f.writelines(new_file_parts)

print("Done! New file written.")

# Count lines
with open(filepath, 'r') as f:
    count = sum(1 for _ in f)
print(f"New file has {count} lines")
