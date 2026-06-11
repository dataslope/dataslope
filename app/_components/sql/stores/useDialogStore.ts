"use client";

import { create } from "zustand";
import type {
  ModifyDialogState,
  AddRowDialogState,
  CsvImportState,
  JsonImportState,
  ParquetImportState,
} from "../types";

interface DialogState {
  settingsOpen: boolean;
  ddlDialog: { title: string; sql: string } | null;
  modifyDialog: ModifyDialogState | null;
  modifyInvalidColIds: Set<string>;
  modifyStructureTab: string;
  modifyStructureRefreshKey: number;
  addRowDialog: AddRowDialogState | null;
  addTableDialog: ModifyDialogState | null;
  addTableInvalidColIds: Set<string>;
  truncateConfirm: string | null;
  pendingDropEntity: {
    name: string;
    kind: "table" | "view" | "index" | "trigger";
  } | null;
  importSqliteOpen: boolean;
  importSqliteDragging: boolean;
  importCsvOpen: boolean;
  importCsvState: CsvImportState | null;
  importCsvDragging: boolean;
  importJsonOpen: boolean;
  importJsonState: JsonImportState | null;
  importJsonDragging: boolean;
  importParquetOpen: boolean;
  importParquetState: ParquetImportState | null;
  importParquetDragging: boolean;
  renameDbOpen: boolean;
  renameDbBaseName: string;
  renameDbExt: string;
  pendingDbId: string | null;
  confirmCloseTabId: string | null;
  confirmRestoreOpen: boolean;
  confirmClearStorageOpen: boolean;
  confirmClearAllDataOpen: boolean;
  exportNoTabsHover: boolean;
  // Setters
  setSettingsOpen: (open: boolean) => void;
  setDdlDialog: (dialog: { title: string; sql: string } | null) => void;
  setModifyDialog: (dialog: ModifyDialogState | null) => void;
  setModifyInvalidColIds: (
    updater: ((prev: Set<string>) => Set<string>) | Set<string>,
  ) => void;
  setModifyStructureTab: (tab: string) => void;
  setModifyStructureRefreshKey: (
    updater: ((prev: number) => number) | number,
  ) => void;
  setAddRowDialog: (
    dialog:
      | AddRowDialogState
      | null
      | ((prev: AddRowDialogState | null) => AddRowDialogState | null),
  ) => void;
  setAddTableDialog: (dialog: ModifyDialogState | null) => void;
  setAddTableInvalidColIds: (
    updater: ((prev: Set<string>) => Set<string>) | Set<string>,
  ) => void;
  setTruncateConfirm: (name: string | null) => void;
  setPendingDropEntity: (
    entity: {
      name: string;
      kind: "table" | "view" | "index" | "trigger";
    } | null,
  ) => void;
  setImportSqliteOpen: (open: boolean) => void;
  setImportSqliteDragging: (dragging: boolean) => void;
  setImportCsvOpen: (open: boolean) => void;
  setImportCsvState: (
    state:
      | CsvImportState
      | null
      | ((prev: CsvImportState | null) => CsvImportState | null),
  ) => void;
  setImportCsvDragging: (dragging: boolean) => void;
  setImportJsonOpen: (open: boolean) => void;
  setImportJsonState: (
    state:
      | JsonImportState
      | null
      | ((prev: JsonImportState | null) => JsonImportState | null),
  ) => void;
  setImportJsonDragging: (dragging: boolean) => void;
  setImportParquetOpen: (open: boolean) => void;
  setImportParquetState: (
    state:
      | ParquetImportState
      | null
      | ((prev: ParquetImportState | null) => ParquetImportState | null),
  ) => void;
  setImportParquetDragging: (dragging: boolean) => void;
  setRenameDbOpen: (open: boolean) => void;
  setRenameDbBaseName: (name: string) => void;
  setRenameDbExt: (ext: string) => void;
  setPendingDbId: (id: string | null) => void;
  setConfirmCloseTabId: (id: string | null) => void;
  setConfirmRestoreOpen: (open: boolean) => void;
  setConfirmClearStorageOpen: (open: boolean) => void;
  setConfirmClearAllDataOpen: (open: boolean) => void;
  setExportNoTabsHover: (hover: boolean) => void;
}

export const useDialogStore = create<DialogState>((set) => ({
  settingsOpen: false,
  ddlDialog: null,
  modifyDialog: null,
  modifyInvalidColIds: new Set(),
  modifyStructureTab: "columns",
  modifyStructureRefreshKey: 0,
  addRowDialog: null,
  addTableDialog: null,
  addTableInvalidColIds: new Set(),
  truncateConfirm: null,
  pendingDropEntity: null,
  importSqliteOpen: false,
  importSqliteDragging: false,
  importCsvOpen: false,
  importCsvState: null,
  importCsvDragging: false,
  importJsonOpen: false,
  importJsonState: null,
  importJsonDragging: false,
  importParquetOpen: false,
  importParquetState: null,
  importParquetDragging: false,
  renameDbOpen: false,
  renameDbBaseName: "",
  renameDbExt: ".sqlite",
  pendingDbId: null,
  confirmCloseTabId: null,
  confirmRestoreOpen: false,
  confirmClearStorageOpen: false,
  confirmClearAllDataOpen: false,
  exportNoTabsHover: false,
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
  setDdlDialog: (ddlDialog) => set({ ddlDialog }),
  setModifyDialog: (modifyDialog) => set({ modifyDialog }),
  setModifyInvalidColIds: (updater) =>
    set((state) => ({
      modifyInvalidColIds:
        typeof updater === "function"
          ? updater(state.modifyInvalidColIds)
          : updater,
    })),
  setModifyStructureTab: (modifyStructureTab) => set({ modifyStructureTab }),
  setModifyStructureRefreshKey: (updater) =>
    set((state) => ({
      modifyStructureRefreshKey:
        typeof updater === "function"
          ? updater(state.modifyStructureRefreshKey)
          : updater,
    })),
  setAddRowDialog: (updater) =>
    set((state) => ({
      addRowDialog:
        typeof updater === "function" ? updater(state.addRowDialog) : updater,
    })),
  setAddTableDialog: (addTableDialog) => set({ addTableDialog }),
  setAddTableInvalidColIds: (updater) =>
    set((state) => ({
      addTableInvalidColIds:
        typeof updater === "function"
          ? updater(state.addTableInvalidColIds)
          : updater,
    })),
  setTruncateConfirm: (truncateConfirm) => set({ truncateConfirm }),
  setPendingDropEntity: (pendingDropEntity) => set({ pendingDropEntity }),
  setImportSqliteOpen: (importSqliteOpen) => set({ importSqliteOpen }),
  setImportSqliteDragging: (importSqliteDragging) =>
    set({ importSqliteDragging }),
  setImportCsvOpen: (importCsvOpen) => set({ importCsvOpen }),
  setImportCsvState: (updater) =>
    set((state) => ({
      importCsvState:
        typeof updater === "function" ? updater(state.importCsvState) : updater,
    })),
  setImportCsvDragging: (importCsvDragging) => set({ importCsvDragging }),
  setImportJsonOpen: (importJsonOpen) => set({ importJsonOpen }),
  setImportJsonState: (updater) =>
    set((state) => ({
      importJsonState:
        typeof updater === "function" ? updater(state.importJsonState) : updater,
    })),
  setImportJsonDragging: (importJsonDragging) => set({ importJsonDragging }),
  setImportParquetOpen: (importParquetOpen) => set({ importParquetOpen }),
  setImportParquetState: (updater) =>
    set((state) => ({
      importParquetState:
        typeof updater === "function"
          ? updater(state.importParquetState)
          : updater,
    })),
  setImportParquetDragging: (importParquetDragging) =>
    set({ importParquetDragging }),
  setRenameDbOpen: (renameDbOpen) => set({ renameDbOpen }),
  setRenameDbBaseName: (renameDbBaseName) => set({ renameDbBaseName }),
  setRenameDbExt: (renameDbExt) => set({ renameDbExt }),
  setPendingDbId: (pendingDbId) => set({ pendingDbId }),
  setConfirmCloseTabId: (confirmCloseTabId) => set({ confirmCloseTabId }),
  setConfirmRestoreOpen: (confirmRestoreOpen) => set({ confirmRestoreOpen }),
  setConfirmClearAllDataOpen: (confirmClearAllDataOpen) =>
    set({ confirmClearAllDataOpen }),
  setConfirmClearStorageOpen: (confirmClearStorageOpen) =>
    set({ confirmClearStorageOpen }),
  setExportNoTabsHover: (exportNoTabsHover) => set({ exportNoTabsHover }),
}));
