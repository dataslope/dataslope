"use client";

/**
 * Builds a code workspace's portable bundle straight from persisted state,
 * the localStorage tab manifest + OPFS file contents, with no live playground
 * involved. This is what lets the /playground index back up a guest's saved
 * workspaces right after sign-in, without opening each one.
 *
 * SQL workspaces can't be built this way (their bundle carries a database dump
 * that only the engine can produce), which is fine: SQL backups are manual by
 * design, from inside the playground.
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
  return {
    version: 1,
    kind: "code",
    playground: playgroundId,
    name,
    exportedAt: Date.now(),
    files,
    activeFilename: active?.filename,
  };
}
