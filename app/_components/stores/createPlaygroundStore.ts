"use client";

import { create, type UseBoundStore, type StoreApi } from "zustand";
import type { OutputCell } from "../types";
import type { PlaygroundFile } from "../playgroundTabs";
import { notifyWorkspaceChanged } from "../workspace/workspaceChanges";

type StatusState = "loading" | "ready" | "running" | "error";

export interface PlaygroundState {
  // Workspace
  workspaceId: string | null;
  workspaceName: string;

  // Files (tabs)
  files: PlaygroundFile[];
  /** The currently-active tab. Can be a file id or `SETTINGS_TAB_ID`. */
  activeTabId: string;
  /** The most recently active *file*, used when the user closes the
   *  Settings tab so we can return to a sensible code tab. */
  activeFileId: string;
  /** Per-file in-memory editor contents. Persisted to OPFS via
   *  `fileStorage.writeFile` whenever an entry is updated. */
  dirtyBuffers: Map<string, string>;
  /** Per-file output history. Switching tabs swaps this in/out of the
   *  output pane. */
  outputsByFile: Map<string, OutputCell[]>;
  /** Whether the Settings tab is currently mounted in the tab strip. */
  settingsTabOpen: boolean;

  // Status
  statusState: StatusState;

  // Setters
  setWorkspace: (id: string, name: string) => void;
  setFiles: (files: PlaygroundFile[]) => void;
  setActiveTabId: (id: string) => void;
  setActiveFileId: (id: string) => void;
  updateDirtyBuffer: (fileId: string, code: string) => void;
  clearDirtyBuffer: (fileId: string) => void;
  setOutputsForFile: (
    fileId: string,
    updater: OutputCell[] | ((prev: OutputCell[]) => OutputCell[]),
  ) => void;
  clearOutputsForFile: (fileId: string) => void;
  setSettingsTabOpen: (open: boolean) => void;
  setStatusState: (s: StatusState) => void;
}

export type PlaygroundStore = UseBoundStore<StoreApi<PlaygroundState>>;

export function createPlaygroundStore(): PlaygroundStore {
  return create<PlaygroundState>((set) => ({
    workspaceId: null,
    workspaceName: "",
    files: [],
    activeTabId: "",
    activeFileId: "",
    dirtyBuffers: new Map(),
    outputsByFile: new Map(),
    settingsTabOpen: false,
    statusState: "loading",

    setWorkspace: (workspaceId, workspaceName) =>
      set({ workspaceId, workspaceName }),
    // File-list changes alter what a backup contains, so they pulse the
    // cloud auto-sync; the engine's settle window absorbs bootstrap noise.
    setFiles: (files) => {
      set({ files });
      notifyWorkspaceChanged();
    },
    setActiveTabId: (activeTabId) => set({ activeTabId }),
    setActiveFileId: (activeFileId) => set({ activeFileId }),
    updateDirtyBuffer: (fileId, code) => {
      // Every content mutation funnels through here — the one change-pulse
      // source for cloud auto-sync. Pulse outside the updater (reducer stays
      // pure) and only on a real change.
      let changed = false;
      set((state) => {
        if (state.dirtyBuffers.get(fileId) === code) return state;
        changed = true;
        const next = new Map(state.dirtyBuffers);
        next.set(fileId, code);
        return { dirtyBuffers: next };
      });
      if (changed) notifyWorkspaceChanged();
    },
    clearDirtyBuffer: (fileId) =>
      set((state) => {
        if (!state.dirtyBuffers.has(fileId)) return state;
        const next = new Map(state.dirtyBuffers);
        next.delete(fileId);
        return { dirtyBuffers: next };
      }),
    setOutputsForFile: (fileId, updater) =>
      set((state) => {
        const prev = state.outputsByFile.get(fileId) ?? [];
        const nextOutputs =
          typeof updater === "function" ? updater(prev) : updater;
        const next = new Map(state.outputsByFile);
        next.set(fileId, nextOutputs);
        return { outputsByFile: next };
      }),
    clearOutputsForFile: (fileId) =>
      set((state) => {
        if (!state.outputsByFile.has(fileId)) return state;
        const next = new Map(state.outputsByFile);
        next.delete(fileId);
        return { outputsByFile: next };
      }),
    setSettingsTabOpen: (settingsTabOpen) => set({ settingsTabOpen }),
    setStatusState: (statusState) => set({ statusState }),
  }));
}

// Per-adapter store registry so every component asking for "the python
// playground store" reaches the same instance (effectively keyed by route).
const stores = new Map<string, PlaygroundStore>();

export function getPlaygroundStore(adapterId: string): PlaygroundStore {
  let s = stores.get(adapterId);
  if (!s) {
    s = createPlaygroundStore();
    stores.set(adapterId, s);
  }
  return s;
}
