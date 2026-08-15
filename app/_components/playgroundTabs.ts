"use client";

import type { LanguageAdapter } from "./types";

/** Reserved tab id that renders the Settings panel as a tab. */
export const SETTINGS_TAB_ID = "__settings__";

/** A file slot rendered as a tab. Contents are NOT stored here — code lives
 *  in OPFS under `workspaces/<wsId>/files/<id>`, shadowed by an in-memory
 *  dirty buffer in the Zustand store. */
export interface PlaygroundFile {
  /** Stable tab id; doubles as the OPFS filename. Never derive from
   *  `filename` — renames must not touch OPFS. */
  id: string;
  /** User-visible path; may include `/` (the tab strip shows the basename). */
  filename: string;
  /** Filename at creation, used to detect rename. */
  pristineFilename: string;
}

/** Canonical primary filename, `${exportBaseFilename}.${defaultFileExtension}`. */
export function primaryEntryFilename(adapter: LanguageAdapter): string {
  const base = adapter.exportBaseFilename || "main";
  const ext = adapter.defaultFileExtension || "txt";
  return `${base}.${ext}`;
}

export function newFileId(): string {
  return `f_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

/** Initial file set for a fresh workspace: one file per `defaultWorkspace`
 *  entry when present, else the single canonical primary file. */
export function defaultFiles(adapter: LanguageAdapter): PlaygroundFile[] {
  const workspace = adapter.defaultWorkspace;
  if (workspace && workspace.length > 0) {
    return workspace.map((f) => ({
      id: newFileId(),
      filename: f.filename,
      pristineFilename: f.filename,
    }));
  }
  const filename = primaryEntryFilename(adapter);
  return [
    { id: newFileId(), filename, pristineFilename: filename },
  ];
}

/** Suggest a fresh, non-colliding filename for a new tab. */
export function suggestNextFilename(
  adapter: LanguageAdapter,
  existing: PlaygroundFile[],
): string {
  const ext = adapter.defaultFileExtension || "txt";
  const taken = new Set(existing.map((f) => f.filename.toLowerCase()));
  let i = existing.length + 1;
  // Cap the search so a runaway loop is impossible.
  for (let attempt = 0; attempt < 1000; attempt += 1) {
    const candidate = `untitled_${i}.${ext}`;
    if (!taken.has(candidate.toLowerCase())) return candidate;
    i += 1;
  }
  return `untitled_${Date.now()}.${ext}`;
}

// ---------------------------------------------------------------------------
// Manifest persistence (localStorage). Metadata only — file content lives in
// OPFS via `fileStorage.ts`.
// ---------------------------------------------------------------------------

interface ManifestPayload {
  files: PlaygroundFile[];
  activeFileId: string;
  /** Open editor tabs, in order — a SUBSET of the workspace files (closing a
   *  tab hides the editor without deleting the file). When absent (older
   *  manifests, share-materialize), loadManifest opens all files. */
  openTabIds?: string[];
}

function manifestKey(adapterId: string, workspaceId: string): string {
  return `playground_files_${adapterId}_${workspaceId}`;
}

export function loadManifest(
  adapterId: string,
  workspaceId: string,
): (ManifestPayload & { openTabIds: string[] }) | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(manifestKey(adapterId, workspaceId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ManifestPayload;
    if (!Array.isArray(parsed.files) || parsed.files.length === 0) return null;
    const cleaned: PlaygroundFile[] = parsed.files
      .filter(
        (f): f is PlaygroundFile =>
          typeof f?.id === "string" && typeof f?.filename === "string",
      )
      .map((f) => ({
        id: f.id,
        filename: f.filename,
        pristineFilename:
          typeof f.pristineFilename === "string"
            ? f.pristineFilename
            : f.filename,
      }));
    if (cleaned.length === 0) return null;
    const activeFileId =
      typeof parsed.activeFileId === "string" &&
      cleaned.some((f) => f.id === parsed.activeFileId)
        ? parsed.activeFileId
        : cleaned[0].id;
    // Open-tab list: known ids only, de-duplicated, always including the
    // active file; missing/empty opens every file.
    const known = new Set(cleaned.map((f) => f.id));
    let openTabIds = Array.isArray(parsed.openTabIds)
      ? [
          ...new Set(
            parsed.openTabIds.filter(
              (id): id is string => typeof id === "string" && known.has(id),
            ),
          ),
        ]
      : [];
    if (openTabIds.length === 0) openTabIds = cleaned.map((f) => f.id);
    if (!openTabIds.includes(activeFileId)) openTabIds.push(activeFileId);
    return { files: cleaned, activeFileId, openTabIds };
  } catch {
    return null;
  }
}

export function saveManifest(
  adapterId: string,
  workspaceId: string,
  files: PlaygroundFile[],
  activeFileId: string,
  openTabIds?: string[],
): void {
  if (typeof window === "undefined") return;
  try {
    const payload: ManifestPayload = { files, activeFileId, openTabIds };
    window.localStorage.setItem(
      manifestKey(adapterId, workspaceId),
      JSON.stringify(payload),
    );
  } catch {
    /* quota / private mode, ignore. */
  }
}
