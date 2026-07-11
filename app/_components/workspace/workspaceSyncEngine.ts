/**
 * The scheduling + phase state machine behind cloud auto-sync, factored out of
 * the React hook (useWorkspaceAutoSync) so the tricky parts, the settle window,
 * debounce, offline retry, and error branching, are unit-testable without a DOM
 * (see __tests__/workspaceSyncEngine.test.ts).
 *
 * The engine is deliberately ignorant of React, the account, and OPFS: it just
 * decides *when* to call the injected `sync()` and reports the resulting phase.
 * The hook wires it to the change pulse, the online event, and the actual
 * promote-then-backup work.
 */

export type SyncPhase =
  | "idle"
  | "pending"
  | "saving"
  | "saved"
  | "offline"
  | "error";

export interface SyncEngineState {
  phase: SyncPhase;
  lastSyncedAt: number | null;
  error: string | null;
}

export interface SyncEngineDeps {
  /** Promote-if-needed + upload the current workspace. Rejects on failure.
   *  Resolving `false` means "not ready yet, retry after another debounce"
   *  (e.g. the playground is still booting and can't build a bundle). */
  sync: () => Promise<boolean | void>;
  /** Whether the browser currently has connectivity. */
  isOnline: () => boolean;
  /** Classifies a rejection from `sync()` as a transient network failure
   *  (retry when back online) vs. a terminal one (quota, auth, bad bundle). */
  isNetworkError: (err: unknown) => boolean;
  /** Called on every state transition so the host can render it. */
  onState: (state: SyncEngineState) => void;
  /** Idle time after the last change before a backup fires. */
  debounceMs: number;
  /** Grace window after `activate()` during which change pulses are ignored,
   *  so a workspace's own bootstrap writes don't back up an untouched default. */
  settleMs: number;
  /** Injectable clock (defaults to Date.now), overridden in tests. */
  now?: () => number;
}

const IDLE: SyncEngineState = { phase: "idle", lastSyncedAt: null, error: null };

export class WorkspaceSyncEngine {
  private state: SyncEngineState = IDLE;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private pending = false;
  private syncing = false;
  private activeSince = 0;

  constructor(private readonly deps: SyncEngineDeps) {}

  /** (Re)start for a freshly-active workspace: clears pending work and opens
   *  the settle window. */
  activate(): void {
    this.activeSince = this.now();
    this.pending = false;
    this.clearTimer();
    this.state = IDLE;
    this.deps.onState(this.state);
  }

  /** A content-change pulse arrived. Ignored inside the settle window; else it
   *  marks work pending and (re)arms the debounce. */
  notifyChange(): void {
    if (this.now() - this.activeSince < this.deps.settleMs) return;
    this.pending = true;
    if (this.state.phase !== "saving") this.set({ phase: "pending" });
    this.arm();
  }

  /** Explicitly request a sync, bypassing the settle window (still debounced).
   *  Used for the initial backup after sign-in, where the host has already
   *  verified there is unsynced local work, no change pulse required. */
  requestSync(): void {
    this.pending = true;
    if (this.state.phase !== "saving") this.set({ phase: "pending" });
    this.arm();
  }

  /** Reconnected: retry immediately if a change is still waiting. */
  handleOnline(): void {
    if (this.pending) void this.flush();
  }

  /** Tear down timers (component unmount / workspace teardown). */
  dispose(): void {
    this.clearTimer();
  }

  getState(): SyncEngineState {
    return this.state;
  }

  private now(): number {
    return (this.deps.now ?? Date.now)();
  }

  private set(next: Partial<SyncEngineState>): void {
    this.state = { ...this.state, ...next };
    this.deps.onState(this.state);
  }

  private clearTimer(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private arm(): void {
    this.clearTimer();
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.flush();
    }, this.deps.debounceMs);
  }

  private async flush(): Promise<void> {
    if (this.syncing) return;
    if (!this.deps.isOnline()) {
      this.pending = true;
      this.set({ phase: "offline" });
      return;
    }
    this.syncing = true;
    this.pending = false;
    this.set({ phase: "saving", error: null });
    try {
      const result = await this.deps.sync();
      if (result === false) {
        // Not ready (playground still booting): keep the work pending and
        // retry after another debounce interval.
        this.pending = true;
        this.set({ phase: "pending" });
        this.arm();
        return;
      }
      this.set({ phase: "saved", lastSyncedAt: this.now(), error: null });
    } catch (err) {
      if (this.deps.isNetworkError(err)) {
        // Transient: keep it pending and let handleOnline() retry.
        this.pending = true;
        this.set({ phase: "offline" });
      } else {
        this.set({
          phase: "error",
          error: err instanceof Error ? err.message : String(err),
        });
      }
    } finally {
      this.syncing = false;
    }
  }
}
