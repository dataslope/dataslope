"use client";

/**
 * Turning a downloaded bundle back into a live playground.
 *
 * Code playgrounds materialize into a real local workspace (OPFS files +
 * localStorage manifest) *before* navigation, so the playground boots it like
 * any other workspace, no playground code involvement at all.
 *
 * SQL playgrounds can't be materialized from the outside: their state lives
 * in the engine (rebuilt by replaying the bundle's SQL dump) and in
 * per-database tab storage. For those we stash a tiny **pending-bundle ref**
 * in sessionStorage and navigate; the playground applies it after its engine
 * boots (fetching the bundle again by reference keeps the marker small,
 * sessionStorage can't hold a multi-MB dump).
 */

import type { WorkspaceBundle } from "@/lib/workspaces/types";
import {
  createWorkspace,
  deleteWorkspace,
  getWorkspaceRegistry,
  type WorkspaceEntry,
} from "../opfs/workspace";
import { setActiveWorkspaceId } from "../opfs/activeWorkspace";
import { writeFile, flushFileWrites } from "../opfs/fileStorage";
import {
  newFileId,
  saveManifest,
  type PlaygroundFile,
} from "../playgroundTabs";
import {
  fetchCloudWorkspaceBundle,
  fetchShareBundle,
} from "./cloudApi";

/**
 * Materializes a code bundle as a local workspace and makes it the active
 * workspace for its playground. With `id` set, an existing local workspace
 * under that id is replaced (the cloud-pull path); without it a fresh
 * workspace id is minted (the fork-a-share path).
 */
export async function materializeCodeWorkspace(
  bundle: WorkspaceBundle,
  opts: { id?: string; nameOverride?: string } = {},
): Promise<WorkspaceEntry> {
  if (bundle.kind !== "code" || !bundle.files || bundle.files.length === 0) {
    throw new Error("This bundle has no files to open.");
  }
  if (opts.id && getWorkspaceRegistry().some((e) => e.id === opts.id)) {
    await deleteWorkspace(opts.id);
  }
  const entry = await createWorkspace(
    opts.nameOverride ?? bundle.name,
    bundle.playground,
    { id: opts.id },
  );

  const files: PlaygroundFile[] = bundle.files.map((f) => ({
    id: newFileId(),
    filename: f.filename,
    pristineFilename: f.filename,
  }));
  files.forEach((file, i) => {
    writeFile(entry.id, file.id, bundle.files![i].content);
  });
  await flushFileWrites();

  const active =
    files.find((f) => f.filename === bundle.activeFilename) ?? files[0];
  saveManifest(bundle.playground, entry.id, files, active.id);
  setActiveWorkspaceId(bundle.playground, entry.id);
  return entry;
}

// ---------------------------------------------------------------------------
// Pending bundle (SQL playgrounds)
// ---------------------------------------------------------------------------

export interface PendingBundleRef {
  /** Where to re-fetch the bundle from. */
  source: "share" | "cloud";
  /** Share slug or cloud workspace id. */
  id: string;
}

const PENDING_KEY_PREFIX = "playground_pending_bundle_";

export function setPendingBundleRef(
  playgroundId: string,
  ref: PendingBundleRef,
): void {
  try {
    sessionStorage.setItem(
      `${PENDING_KEY_PREFIX}${playgroundId}`,
      JSON.stringify(ref),
    );
  } catch {
    /* private mode, the open flow surfaces its own error */
  }
}

/** Reads AND clears the pending ref (one attempt per navigation, a failed
 *  apply must not loop on every reload). */
export function takePendingBundleRef(
  playgroundId: string,
): PendingBundleRef | null {
  try {
    const key = `${PENDING_KEY_PREFIX}${playgroundId}`;
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    sessionStorage.removeItem(key);
    const parsed = JSON.parse(raw) as PendingBundleRef;
    if (
      (parsed.source === "share" || parsed.source === "cloud") &&
      typeof parsed.id === "string"
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export async function fetchBundleByRef(
  ref: PendingBundleRef,
): Promise<WorkspaceBundle> {
  return ref.source === "share"
    ? fetchShareBundle(ref.id)
    : fetchCloudWorkspaceBundle(ref.id);
}

/** Bundle tab seeds → the shape the SQL playgrounds' tab storage expects. */
export function bundleTabSeeds(
  bundle: WorkspaceBundle,
): { title: string; code: string }[] {
  const tabs = bundle.sql?.tabs ?? [];
  if (tabs.length > 0) {
    return tabs.map((t) => ({ title: t.title || "Query", code: t.code }));
  }
  return [{ title: "Query 1", code: "" }];
}
