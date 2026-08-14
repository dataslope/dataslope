"use client";

/**
 * Client-side context registry for "Ask AI". Interactive widgets register on
 * mount; one shared IntersectionObserver tracks their visibility so the panel
 * can attach what the user is looking at. Snapshots are pulled lazily via
 * `getSnapshot()`, so nothing is serialized until a question is asked.
 */

import { useEffect, useRef } from "react";
import type { AskAiWidgetContext } from "@/lib/ai/types";

export type AskAiSourceKind =
  | "challenge"
  | "code-block"
  | "mcq"
  | "sql-playground"
  | "playground";

/** What a source produces at send time. `null` = nothing useful right now. */
export interface AskAiSourceSnapshot {
  /** Packed plain-text description (instructions, code, output, state). */
  content: string;
  /** Optional database-schema summary (SQL sources only). */
  schema?: string;
}

export interface AskAiSourceOptions {
  kind: AskAiSourceKind;
  /** Short human label shown as a chip, e.g. `Challenge: Reverse a list`. */
  label: string;
  /** Root DOM element, used for visibility tracking and document ordering.
   *  Page-level sources (playground shells) may omit it, they count as
   *  always visible. */
  element?: HTMLElement | null;
  getSnapshot: () => AskAiSourceSnapshot | null;
}

/** Registry entry as exposed to the panel UI (chips). */
export interface AskAiSourceInfo {
  id: string;
  kind: AskAiSourceKind;
  label: string;
  /** Latest IntersectionObserver ratio, 0..1. Element-less sources are 1. */
  visibility: number;
}

interface SourceRecord extends AskAiSourceOptions {
  id: string;
  visibility: number;
}

let nextId = 1;
const sources = new Map<string, SourceRecord>();
const listeners = new Set<() => void>();
// Cached list snapshot so useSyncExternalStore gets a stable reference
// between changes (a fresh array every call would loop the store).
let cachedList: AskAiSourceInfo[] | null = null;

let observer: IntersectionObserver | null = null;
const elementToId = new Map<Element, string>();

function notify() {
  cachedList = null;
  for (const fn of listeners) fn();
}

function ensureObserver(): IntersectionObserver | null {
  if (observer || typeof window === "undefined") return observer;
  if (typeof IntersectionObserver === "undefined") return null;
  observer = new IntersectionObserver(
    (entries) => {
      let changed = false;
      for (const entry of entries) {
        const id = elementToId.get(entry.target);
        const rec = id ? sources.get(id) : undefined;
        if (!rec) continue;
        const ratio = entry.isIntersecting ? entry.intersectionRatio || 0.01 : 0;
        if (rec.visibility !== ratio) {
          rec.visibility = ratio;
          changed = true;
        }
      }
      if (changed) notify();
    },
    { threshold: [0, 0.05, 0.25, 0.5, 0.75, 1] },
  );
  return observer;
}

/** Register a widget as an Ask AI context source. Returns an unregister fn. */
export function registerAskAiSource(options: AskAiSourceOptions): () => void {
  const id = `s${nextId++}`;
  const rec: SourceRecord = {
    ...options,
    id,
    // Element-less (page-level) sources are treated as always in view.
    visibility: options.element ? 0 : 1,
  };
  sources.set(id, rec);
  if (options.element) {
    elementToId.set(options.element, id);
    ensureObserver()?.observe(options.element);
  }
  notify();
  return () => {
    if (rec.element) {
      elementToId.delete(rec.element);
      observer?.unobserve(rec.element);
    }
    sources.delete(id);
    notify();
  };
}

/** Subscribe to registry changes (registration + visibility). */
export function subscribeAskAiSources(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Document-order comparator; element-less sources sort last. */
function byDocumentOrder(a: SourceRecord, b: SourceRecord): number {
  if (!a.element || !b.element) return a.element ? -1 : b.element ? 1 : 0;
  const pos = a.element.compareDocumentPosition(b.element);
  if (pos & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
  if (pos & Node.DOCUMENT_POSITION_PRECEDING) return 1;
  return 0;
}

/** Current sources in document order, for the panel's chip row. */
export function getAskAiSources(): AskAiSourceInfo[] {
  if (!cachedList) {
    cachedList = [...sources.values()]
      .sort(byDocumentOrder)
      .map(({ id, kind, label, visibility }) => ({ id, kind, label, visibility }));
  }
  return cachedList;
}

const EMPTY: AskAiSourceInfo[] = [];
/** SSR snapshot for useSyncExternalStore. */
export function getAskAiSourcesServer(): AskAiSourceInfo[] {
  return EMPTY;
}

/** Label of the registered source whose element contains `node`, if any.
 *  Used to attribute a text selection ("highlighted inside Challenge: …"). */
export function findAskAiSourceLabelFor(node: Node | null): string | undefined {
  if (!node) return undefined;
  for (const rec of sources.values()) {
    if (rec.element?.contains(node)) return rec.label;
  }
  return undefined;
}

// Client-side caps. The server re-clips everything against the model's token
// budget; these only keep the request body reasonable.
const MAX_WIDGETS = 6;
const MAX_WIDGET_CHARS = 8000;
const MAX_LABEL_CHARS = 160;

/**
 * Collect the widget payload for a question: pinned sources first, then
 * visible ones by ratio, capped at `MAX_WIDGETS`. Schema comes from the most
 * relevant SQL source (pinned wins over merely-visible).
 */
export function collectAskAiWidgets(pinnedIds: ReadonlySet<string>): {
  widgets: AskAiWidgetContext[];
  schema?: string;
} {
  const ordered = [...sources.values()].sort(byDocumentOrder);
  const pinned = ordered.filter((s) => pinnedIds.has(s.id));
  const ambient = ordered
    .filter((s) => !pinnedIds.has(s.id) && s.visibility > 0)
    .sort((a, b) => b.visibility - a.visibility);

  const widgets: AskAiWidgetContext[] = [];
  let schema: string | undefined;
  let schemaFromPinned = false;

  for (const rec of [...pinned, ...ambient]) {
    if (widgets.length >= MAX_WIDGETS) break;
    let snap: AskAiSourceSnapshot | null = null;
    try {
      snap = rec.getSnapshot();
    } catch {
      // A widget that fails to snapshot must never break the question.
    }
    if (!snap) continue;
    const isPinned = pinnedIds.has(rec.id);
    if (snap.schema && (!schema || (isPinned && !schemaFromPinned))) {
      schema = snap.schema;
      schemaFromPinned = isPinned;
    }
    const content = snap.content.trim();
    if (!content) continue;
    widgets.push({
      kind: rec.kind,
      label: rec.label.slice(0, MAX_LABEL_CHARS),
      content: content.slice(0, MAX_WIDGET_CHARS),
      ...(isPinned ? { referenced: true } : {}),
    });
  }

  return { widgets, schema };
}

/** One on-screen source, snapshotted with its registry id retained. */
export interface AskAiLiveSource {
  id: string;
  kind: AskAiSourceKind;
  label: string;
  /** Latest visibility ratio (0..1), for ranking when the send cap bites. */
  visibility: number;
  /** Packed plain-text state at snapshot time (already length-capped). */
  content: string;
  /** Database-schema summary (SQL sources only). */
  schema?: string;
}

/** Max widget sources actually PACKED into one question. Enumeration below is
 *  deliberately uncapped so the sheet shows every candidate; the send path
 *  applies this cap AFTER the user's toggles, ranked by visibility. */
export const MAX_ASKAI_WIDGETS = MAX_WIDGETS;

/**
 * Snapshot the currently-visible sources, keeping each registry `id`. Drives
 * both the context sheet and the send path, so the rows shown are exactly the
 * candidates that can be sent. Document order; empty/throwing snapshots are
 * skipped so a broken widget never breaks the panel.
 */
export function collectAskAiLiveSources(): AskAiLiveSource[] {
  const ordered = [...sources.values()]
    .filter((s) => s.visibility > 0)
    .sort(byDocumentOrder);
  const out: AskAiLiveSource[] = [];
  for (const rec of ordered) {
    let snap: AskAiSourceSnapshot | null = null;
    try {
      snap = rec.getSnapshot();
    } catch {
      // A widget that fails to snapshot must never break the panel.
    }
    if (!snap) continue;
    const content = snap.content.trim();
    if (!content && !snap.schema) continue;
    out.push({
      id: rec.id,
      kind: rec.kind,
      label: rec.label.slice(0, MAX_LABEL_CHARS),
      visibility: rec.visibility,
      content: content.slice(0, MAX_WIDGET_CHARS),
      ...(snap.schema ? { schema: snap.schema } : {}),
    });
  }
  return out;
}

/**
 * React helper: register a source for the lifetime of the component.
 * `getSnapshot` is read through a ref so its identity may change freely;
 * re-registration happens only when `kind`/`label`/`enabled` change (or the
 * element appears after mount, which the effect picks up via `elementRef`).
 */
export function useAskAiSource(options: {
  kind: AskAiSourceKind;
  label: string;
  elementRef?: React.RefObject<HTMLElement | null>;
  getSnapshot: () => AskAiSourceSnapshot | null;
  enabled?: boolean;
}): void {
  const { kind, label, elementRef, enabled = true } = options;
  const getSnapshotRef = useRef(options.getSnapshot);
  useEffect(() => {
    getSnapshotRef.current = options.getSnapshot;
  });

  useEffect(() => {
    if (!enabled) return;
    return registerAskAiSource({
      kind,
      label,
      element: elementRef?.current ?? null,
      getSnapshot: () => getSnapshotRef.current(),
    });
    // elementRef is a ref, reading .current inside the effect is intentional.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, label, enabled]);
}
