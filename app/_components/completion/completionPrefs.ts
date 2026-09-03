"use client";

// The one editor preference every code editor on the site shares: when the
// completion popup opens. Stored once in localStorage (not per language,
// since a learner reads lessons in several languages and would expect one
// answer), read by the shared completion extensions, and edited from the
// playground Settings panel. Same-tab listeners hear changes synchronously;
// other tabs pick them up through the `storage` event.

import { useCallback, useSyncExternalStore } from "react";
import { Compartment, type Extension } from "@codemirror/state";
import { ViewPlugin } from "@codemirror/view";

export type CompletionTriggerMode = "typing" | "triggers" | "manual" | "off";

export const COMPLETION_TRIGGER_STORAGE_KEY = "editor_completion_trigger";

export const DEFAULT_COMPLETION_TRIGGER: CompletionTriggerMode = "typing";

export const COMPLETION_TRIGGER_OPTIONS: ReadonlyArray<{
  value: CompletionTriggerMode;
  label: string;
  description: string;
}> = [
  {
    value: "typing",
    label: "As you type",
    description:
      "Suggestions open after a short pause while typing, after `.` and similar, and on Ctrl+Space.",
  },
  {
    value: "triggers",
    label: "After `.` and on Ctrl+Space",
    description:
      "Suggestions open after member access (`.`, `->`, `::`, `$`) and on Ctrl+Space, never on plain typing.",
  },
  {
    value: "manual",
    label: "Only on Ctrl+Space",
    description: "Suggestions open only when you ask for them.",
  },
  {
    value: "off",
    label: "Off",
    description: "No suggestion popup. Hover documentation stays on.",
  },
];

const MODES = new Set<string>(COMPLETION_TRIGGER_OPTIONS.map((o) => o.value));

function isMode(value: unknown): value is CompletionTriggerMode {
  return typeof value === "string" && MODES.has(value);
}

/** The persisted value, or the default when unset, invalid, or on the
 *  server. Read live so a change in another tab is seen on the next call. */
export function getCompletionTrigger(): CompletionTriggerMode {
  if (typeof window === "undefined") return DEFAULT_COMPLETION_TRIGGER;
  try {
    const raw = window.localStorage.getItem(COMPLETION_TRIGGER_STORAGE_KEY);
    return isMode(raw) ? raw : DEFAULT_COMPLETION_TRIGGER;
  } catch {
    return DEFAULT_COMPLETION_TRIGGER;
  }
}

const listeners = new Set<(mode: CompletionTriggerMode) => void>();
let storageListenerInstalled = false;

function notify(mode: CompletionTriggerMode): void {
  for (const listener of [...listeners]) listener(mode);
}

function installStorageListener(): void {
  if (storageListenerInstalled || typeof window === "undefined") return;
  storageListenerInstalled = true;
  window.addEventListener("storage", (ev) => {
    if (ev.key === COMPLETION_TRIGGER_STORAGE_KEY || ev.key === null) {
      notify(getCompletionTrigger());
    }
  });
}

export function setCompletionTrigger(mode: CompletionTriggerMode): void {
  if (typeof window === "undefined") return;
  try {
    if (mode === DEFAULT_COMPLETION_TRIGGER) {
      window.localStorage.removeItem(COMPLETION_TRIGGER_STORAGE_KEY);
    } else {
      window.localStorage.setItem(COMPLETION_TRIGGER_STORAGE_KEY, mode);
    }
  } catch {
    // Private mode / quota: the change still applies to this page.
  }
  notify(mode);
}

/** Subscribe to changes from this tab and others; returns the unsubscribe. */
export function subscribeCompletionTrigger(
  listener: (mode: CompletionTriggerMode) => void,
): () => void {
  installStorageListener();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const getServerSnapshot = () => DEFAULT_COMPLETION_TRIGGER;

/** React binding for the Settings panel. */
export function useCompletionTrigger(): [
  CompletionTriggerMode,
  (mode: CompletionTriggerMode) => void,
] {
  const mode = useSyncExternalStore(
    subscribeCompletionTrigger,
    getCompletionTrigger,
    getServerSnapshot,
  );
  const set = useCallback((next: CompletionTriggerMode) => {
    setCompletionTrigger(next);
  }, []);
  return [mode, set];
}

/**
 * Mount `build(mode)` in a compartment that follows the preference live:
 * changing the setting reconfigures every open editor on the page, no
 * remount. Each call owns its own compartment, so one editor per call.
 */
export function withCompletionTrigger(
  build: (mode: CompletionTriggerMode) => Extension,
): Extension {
  const compartment = new Compartment();
  const follow = ViewPlugin.define((view) => {
    let current = getCompletionTrigger();
    const unsubscribe = subscribeCompletionTrigger((mode) => {
      if (mode === current) return;
      current = mode;
      view.dispatch({ effects: compartment.reconfigure(build(mode)) });
    });
    return { destroy: unsubscribe };
  });
  return [compartment.of(build(getCompletionTrigger())), follow];
}
