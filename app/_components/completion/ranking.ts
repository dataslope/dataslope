"use client";

// Ordering of the completion popup. CodeMirror sorts by fuzzy-match score
// plus `boost` (a prefix match scores 0, a partial prefix -100, a
// case-folded one -200, a non-initial match -700), so a boost inside ±40
// reorders equally good matches without ever outranking a better one. The
// signals, in the spirit of VS Code's suggest widget: the source's tier
// (something declared in the document beats a keyword beats a document
// word), locality (a name that already appears in the document is the one
// the reader is most likely reaching for), and recency (what they accepted
// last). Runtimes add their own knowledge on top (jedi marks names from the
// reader's namespace, the TypeScript service ranks locals first).

import {
  pickedCompletion,
  type Completion,
  type CompletionContext,
  type CompletionResult,
  type CompletionSource,
} from "@codemirror/autocomplete";
import type { Extension, Text } from "@codemirror/state";
import { EditorView } from "@codemirror/view";

/** Source tiers, added to every option a source returns. */
export const RANK = {
  /** Declared in the document (Lezer symbols, PHP `$variables`). */
  documentSymbol: 6,
  /** The language package's local-scope source. */
  local: 5,
  /** Runtime analyzers carry their own per-item boosts. */
  runtime: 0,
  /** Builtins and curated lists: real names, no evidence they're wanted. */
  builtin: 0,
  keyword: -1,
  snippet: -2,
  /** Any word in the document, the coarsest fallback. */
  docWord: -4,
} as const;

/** A name that already appears in the document. */
const LOCALITY_BOOST = 3;
/** The most recently accepted completions, decaying with age. */
const RECENT_BOOSTS = [4, 4, 4, 3, 3, 2, 2, 2, 1, 1] as const;
const RECENT_LIMIT = 50;
const MAX_BOOST = 40;

// ─── Locality ─────────────────────────────────────────────────────────────

const identifierCache = new WeakMap<Text, Set<string>>();
/** Past this many characters, scanning every keystroke stops being free. */
const IDENTIFIER_SCAN_LIMIT = 200_000;

/** Every identifier-shaped word in the document, cached per document
 *  version (CodeMirror's `Text` is immutable, so a new doc is a new key). */
export function documentIdentifiers(doc: Text): Set<string> {
  const cached = identifierCache.get(doc);
  if (cached) return cached;
  const ids = new Set<string>();
  if (doc.length <= IDENTIFIER_SCAN_LIMIT) {
    const re = /[A-Za-z_$][\w$]*/g;
    const text = doc.toString();
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) ids.add(m[0]);
  }
  identifierCache.set(doc, ids);
  return ids;
}

// ─── Recency ──────────────────────────────────────────────────────────────

/** Labels accepted on this page, most recent last. */
const recent: string[] = [];

export function rememberPicked(label: string): void {
  const at = recent.indexOf(label);
  if (at >= 0) recent.splice(at, 1);
  recent.push(label);
  if (recent.length > RECENT_LIMIT) recent.shift();
}

export function recencyBoost(label: string): number {
  const at = recent.lastIndexOf(label);
  if (at < 0) return 0;
  const age = recent.length - 1 - at;
  return RECENT_BOOSTS[age] ?? 1;
}

/** Records accepted completions; mount once per editor. */
export const rememberPickedCompletions: Extension = EditorView.updateListener.of(
  (update) => {
    for (const tr of update.transactions) {
      const picked = tr.annotation(pickedCompletion);
      if (picked) rememberPicked(picked.label);
    }
  },
);

// ─── Applying the signals ─────────────────────────────────────────────────

export interface RankOptions {
  /** Add the locality bonus for names present in the document (off for
   *  sources whose options all come from the document anyway). */
  locality?: boolean;
}

function clamp(n: number): number {
  return Math.max(-MAX_BOOST, Math.min(MAX_BOOST, n));
}

export function rankResult(
  result: CompletionResult,
  ctx: CompletionContext,
  base: number,
  opts: RankOptions = {},
): CompletionResult {
  const locality = opts.locality !== false;
  const ids = locality ? documentIdentifiers(ctx.state.doc) : null;
  const options: Completion[] = result.options.map((option) => {
    const own = option.boost ?? 0;
    let boost = own + base;
    if (ids && ids.has(option.label)) boost += LOCALITY_BOOST;
    boost += recencyBoost(option.label);
    boost = clamp(boost);
    return boost === own ? option : { ...option, boost };
  });
  return { ...result, options };
}

/** Wrap a source so its results carry the tier, locality and recency
 *  signals. */
export function ranked(
  source: CompletionSource,
  base: number,
  opts: RankOptions = {},
): CompletionSource {
  return (ctx) => {
    const res = source(ctx);
    if (!res) return null;
    if (res instanceof Promise) {
      return res.then((r) => (r ? rankResult(r, ctx, base, opts) : null));
    }
    return rankResult(res, ctx, base, opts);
  };
}

/** Test-only handles. */
export const _internal = { recent, LOCALITY_BOOST, MAX_BOOST };
