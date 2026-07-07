"use client";

import type { LanguageAdapter } from "./types";

/** Reserved tab id used to render the Settings panel as a tab. Lives
 *  alongside the file tabs in the generic TabBar so users can switch
 *  between code and settings without losing their place. */
export const SETTINGS_TAB_ID = "__settings__";

/** A file slot rendered as a tab in the non-SQL playgrounds. The file
 *  contents are NOT stored here — code lives in OPFS under
 *  `workspaces/<wsId>/files/<id>` and is shadowed by an in-memory
 *  dirty buffer in the Zustand store. */
export interface PlaygroundFile {
  /** Stable tab id. Doubles as the OPFS filename — never derive it from
   *  `filename` since renames must not touch OPFS. */
  id: string;
  /** User-visible path inside the workspace's virtual filesystem
   *  (e.g. `"main.py"`, `"src/utils.py"`). May include `/` to nest
   *  files inside folders; the tab strip displays only the leaf name
   *  (basename). */
  filename: string;
  /** Filename at creation, used to detect rename. */
  pristineFilename: string;
}

/** Convenience: the canonical "primary" filename for a workspace —
 *  `${exportBaseFilename}.${defaultFileExtension}`. Used as the
 *  default file in fresh workspaces and (for non-multi-entry
 *  languages) as the file shown in the Run dropdown when the user
 *  is on a non-default tab. */
export function primaryEntryFilename(adapter: LanguageAdapter): string {
  const base = adapter.exportBaseFilename || "main";
  const ext = adapter.defaultFileExtension || "txt";
  return `${base}.${ext}`;
}

export function newFileId(): string {
  return `f_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

/** Default initial file set for a freshly-created workspace. Adapters
 *  with a `defaultWorkspace` (web: the CodePen-style HTML/CSS/JS trio)
 *  get one file per entry; everything else gets the single canonical
 *  `<exportBaseFilename>.<ext>` file. */
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
// Manifest persistence (small, synchronous → localStorage)
// ---------------------------------------------------------------------------
//
// Per (adapter, workspace) we keep a JSON list of `PlaygroundFile`
// records plus the active file id. File CONTENT lives in OPFS via
// `fileStorage.ts`; the manifest is metadata only.

interface ManifestPayload {
  files: PlaygroundFile[];
  activeFileId: string;
}

function manifestKey(adapterId: string, workspaceId: string): string {
  return `playground_files_${adapterId}_${workspaceId}`;
}

export function loadManifest(
  adapterId: string,
  workspaceId: string,
): ManifestPayload | null {
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
    return { files: cleaned, activeFileId };
  } catch {
    return null;
  }
}

export function saveManifest(
  adapterId: string,
  workspaceId: string,
  files: PlaygroundFile[],
  activeFileId: string,
): void {
  if (typeof window === "undefined") return;
  try {
    const payload: ManifestPayload = { files, activeFileId };
    window.localStorage.setItem(
      manifestKey(adapterId, workspaceId),
      JSON.stringify(payload),
    );
  } catch {
    /* quota / private mode — ignore. */
  }
}
