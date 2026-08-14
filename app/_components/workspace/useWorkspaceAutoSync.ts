"use client";

/**
 * Cloud auto-sync for a signed-in user's active workspace: watches the in-tab
 * change pulse and hands it to WorkspaceSyncEngine, which debounces and
 * uploads, promoting an unsaved draft on the first change. OPFS stays the
 * local source of truth, so a failed sync never loses work. Everything is
 * ref-driven so the single subscribe/online effect never tears down on a
 * prop change.
 */

import { useEffect, useRef, useState } from "react";
import type { BuildBundle } from "@/lib/workspaces/types";
import { CloudApiError, saveCloudWorkspace } from "../cloud/cloudApi";
import { subscribeWorkspaceChanged } from "./workspaceChanges";
import {
  WorkspaceSyncEngine,
  type SyncEngineState,
  type SyncPhase,
} from "./workspaceSyncEngine";

export type { SyncPhase };
export type AutoSyncStatus = SyncEngineState;

export interface AutoSyncOptions {
  /** Only sync when the account can receive backups (signed in + cloud
   *  configured + browser can gzip). */
  enabled: boolean;
  /** The workspace being edited; null while the playground boots. */
  activeWorkspaceId: string | null;
  /** True for the auto-created unregistered draft, promoted on first change. */
  isDraft: boolean;
  playgroundId: string;
  /** Serializes the live playground; undefined until it is ready. */
  buildBundle?: BuildBundle;
  /** Registers the draft in the saved list; called once when `isDraft`. */
  promoteDraft?: (name?: string) => void | Promise<void>;
  /** Run after a successful backup (refresh cloud list + registry). */
  onSynced?: () => void;
  /** Host verified there is local work with no cloud backup; sync without
   *  waiting for a fresh edit. */
  needsInitialBackup?: boolean;
}

// Debounce from the last edit to the backup (code playgrounds only;
// WorkspaceBadge gates SQL out).
const CODE_DEBOUNCE_MS = 2000;
// Ignore change pulses briefly after activation: bootstrap emits through the
// same sinks, and an untouched default shouldn't back up the instant it loads.
const SETTLE_MS = 4000;

const IDLE: AutoSyncStatus = { phase: "idle", lastSyncedAt: null, error: null };

export function useWorkspaceAutoSync(opts: AutoSyncOptions): AutoSyncStatus {
  const [status, setStatus] = useState<AutoSyncStatus>(IDLE);

  // Latest inputs, read by the engine's callbacks at call time so the engine
  // is created once and never re-bound on a prop change.
  const optsRef = useRef(opts);
  const engineRef = useRef<WorkspaceSyncEngine | null>(null);
  // Updated from an effect; callbacks fire async, so a one-render lag is fine.
  useEffect(() => {
    optsRef.current = opts;
  });

  // Create the engine + wire the change pulse and reconnect retry once, on
  // mount.
  useEffect(() => {
    const engine = new WorkspaceSyncEngine({
      debounceMs: CODE_DEBOUNCE_MS,
      settleMs: SETTLE_MS,
      isOnline: () =>
        typeof navigator === "undefined" || navigator.onLine !== false,
      isNetworkError: (err) => err instanceof CloudApiError && err.status === 0,
      onState: setStatus,
      sync: async () => {
        const o = optsRef.current;
        if (!o.enabled || !o.activeWorkspaceId || !o.buildBundle) return;
        const bundle = await o.buildBundle({ includePersonal: true });
        // Null bundle = playground still booting; retry after another debounce.
        if (!bundle) return false;
        if (o.isDraft && o.promoteDraft) {
          // Promote first so the backup lands on a registered workspace id.
          await o.promoteDraft();
        }
        await saveCloudWorkspace(o.activeWorkspaceId, bundle);
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

  // Re-open the settle window whenever the active workspace changes.
  useEffect(() => {
    engineRef.current?.activate();
  }, [opts.activeWorkspaceId]);

  // Initial backup for unsynced local work (e.g. guest work after sign-in).
  // requestSync bypasses the settle window but keeps the debounce; a terminal
  // failure leaves the flag true without re-running (deps unchanged), no loop.
  const needsInitialBackup = opts.enabled && !!opts.needsInitialBackup;
  useEffect(() => {
    if (needsInitialBackup) engineRef.current?.requestSync();
  }, [needsInitialBackup, opts.activeWorkspaceId]);

  return status;
}
