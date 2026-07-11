"use client";

/**
 * Cloud auto-sync for a signed-in user's active workspace.
 *
 * The model: signed-in playgrounds back up to the cloud automatically, there is
 * no manual "Back up" button. This hook watches the in-tab change pulse
 * (workspaceChanges), and hands it to WorkspaceSyncEngine, which debounces and
 * uploads a fresh backup, promoting an unsaved draft to a real saved workspace
 * on the first change so it has a stable id and shows up in the list.
 *
 * OPFS stays the local source of truth (edits persist there synchronously, as
 * before); this only mirrors to the account, so an offline or failed sync never
 * loses work, and the engine retries when the connection returns.
 *
 * Everything is ref-driven so the single subscribe/online effect never tears
 * down on a prop change (buildBundle, the cloud state, etc. all change often).
 */

import { useEffect, useRef, useState } from "react";
import type { WorkspaceBundle } from "@/lib/workspaces/types";
import { isSqlPlayground } from "@/lib/workspaces/types";
import { CloudApiError } from "../cloud/cloudApi";
import { backUpWorkspace } from "./workspaceCloud";
import { subscribeWorkspaceChanged } from "./workspaceChanges";
import {
  WorkspaceSyncEngine,
  type SyncEngineState,
  type SyncPhase,
} from "./workspaceSyncEngine";

export type { SyncPhase };
export type AutoSyncStatus = SyncEngineState;

export interface AutoSyncOptions {
  /** Only sync when the account can actually receive backups (signed in +
   *  cloud configured + browser can gzip). */
  enabled: boolean;
  /** The workspace being edited; null while the playground boots. */
  activeWorkspaceId: string | null;
  /** True when the active workspace is the auto-created, still-unregistered
   *  draft, so the first change promotes it before backing up. */
  isDraft: boolean;
  playgroundId: string;
  /** Serializes the live playground into a portable bundle (the host's
   *  `buildCloudBundle`). Undefined until the playground is ready. */
  buildBundle?: () => Promise<WorkspaceBundle | null>;
  /** Registers the draft in the saved list (the host's save handler). Called
   *  once, on the first synced change, when `isDraft` is true. */
  promoteDraft?: (name?: string) => void | Promise<void>;
  /** Run after a successful backup (refresh the cloud list + registry so the
   *  badge reflects the new backup). */
  onSynced?: () => void;
}

// Debounce from the last edit to the backup. SQL bundles carry a full database
// dump, so they wait longer to coalesce a burst of edits/runs into one upload.
const CODE_DEBOUNCE_MS = 2000;
const SQL_DEBOUNCE_MS = 4000;
// Ignore change pulses for a beat after a workspace becomes active: bootstrap
// (loading persisted tabs, seeding a sample DB) emits through the same sinks,
// and we don't want to back up an untouched default the instant it loads.
const SETTLE_MS = 4000;

const IDLE: AutoSyncStatus = { phase: "idle", lastSyncedAt: null, error: null };

export function useWorkspaceAutoSync(opts: AutoSyncOptions): AutoSyncStatus {
  const [status, setStatus] = useState<AutoSyncStatus>(IDLE);

  // Latest inputs, read by the engine's callbacks (at call time, never during
  // render) so the engine is created once and never re-bound on a prop change.
  const optsRef = useRef(opts);
  const engineRef = useRef<WorkspaceSyncEngine | null>(null);
  // Keep the ref current from an effect (not during render). The callbacks that
  // read it all fire asynchronously, so a one-render lag is immaterial.
  useEffect(() => {
    optsRef.current = opts;
  });

  // Create the engine + wire the change pulse and reconnect retry once, on
  // mount. Building it inside the effect (not during render) keeps all ref
  // access off the render path.
  useEffect(() => {
    const engine = new WorkspaceSyncEngine({
      debounceMs: isSqlPlayground(optsRef.current.playgroundId)
        ? SQL_DEBOUNCE_MS
        : CODE_DEBOUNCE_MS,
      settleMs: SETTLE_MS,
      isOnline: () =>
        typeof navigator === "undefined" || navigator.onLine !== false,
      isNetworkError: (err) => err instanceof CloudApiError && err.status === 0,
      onState: setStatus,
      sync: async () => {
        const o = optsRef.current;
        if (!o.enabled || !o.activeWorkspaceId || !o.buildBundle) return;
        if (o.isDraft && o.promoteDraft) {
          // Promote first so the backup lands on a registered workspace id.
          await o.promoteDraft();
        }
        await backUpWorkspace(o.activeWorkspaceId, o.buildBundle);
        o.onSynced?.();
      },
    });
    engineRef.current = engine;

    const onChange = () => {
      const o = optsRef.current;
      if (!o.enabled || !o.activeWorkspaceId) return;
      engine.notifyChange();
    };
    const onOnline = () => engine.handleOnline();
    const unsubscribe = subscribeWorkspaceChanged(onChange);
    if (typeof window !== "undefined") {
      window.addEventListener("online", onOnline);
    }
    return () => {
      unsubscribe();
      if (typeof window !== "undefined") {
        window.removeEventListener("online", onOnline);
      }
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  // Re-open the settle window whenever the active workspace changes. Runs after
  // the create effect on mount, so the engine already exists.
  useEffect(() => {
    engineRef.current?.activate();
  }, [opts.activeWorkspaceId]);

  return status;
}
