"use client";

/**
 * Builds a code workspace's bundle straight from persisted state (tab
 * manifest + OPFS files), no live playground involved — lets the /playground
 * index back up workspaces without opening each one. SQL workspaces can't be
 * built this way (their database image needs the engine) and stay manual.
 */

import type { BundleCodeFile, WorkspaceBundle } from "@/lib/workspaces/types";
import { isSqlPlayground } from "@/lib/workspaces/types";
import { loadManifest } from "../playgroundTabs";
import { readFile } from "../opfs/fileStorage";

export async function buildCodeBundleFromOpfs(
  playgroundId: string,
  workspaceId: string,
  name: string,
): Promise<WorkspaceBundle | null> {
  if (isSqlPlayground(playgroundId)) return null;
  const manifest = loadManifest(playgroundId, workspaceId);
  if (!manifest) return null;

  const files: BundleCodeFile[] = [];
  for (const f of manifest.files) {
    const content = await readFile(workspaceId, f.id);
    // Unreadable file (OPFS unavailable, entry pruned): skip it rather than
    // uploading an empty stand-in that would clobber a better copy later.
    if (content === null) continue;
    files.push({ filename: f.filename, content });
  }
  if (files.length === 0) return null;

  const active = manifest.files.find((f) => f.id === manifest.activeFileId);
  const openFilenames = manifest.openTabIds
    .map((id) => manifest.files.find((f) => f.id === id)?.filename)
    // A file whose content was unreadable above isn't in the bundle, so it
    // can't be one of its open tabs either.
    .filter((filename): filename is string =>
      !!filename && files.some((f) => f.filename === filename),
    );
  return {
    version: 2,
    kind: "code",
    playground: playgroundId,
    name,
    exportedAt: Date.now(),
    files,
    activeFilename: active?.filename,
    openFilenames,
  };
}
