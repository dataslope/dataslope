"use client";

// AI inline completion ("ghost text") for CodeMirror v6, the editor-side half
// of app/api/ai/complete. After a typing pause a suggestion renders as dimmed
// ghost text: Tab accepts, Escape dismisses, typing through consumes it.
// Pro-only: a GET probe (cached module-wide; denied result has a short TTL so
// mid-page sign-in picks the feature up) avoids firing doomed requests — the
// server still enforces the rule on every POST.

import {
  Prec,
  StateEffect,
  StateField,
  type Extension,
} from "@codemirror/state";
import {
  Decoration,
  EditorView,
  keymap,
  ViewPlugin,
  WidgetType,
  type ViewUpdate,
} from "@codemirror/view";
import { completionStatus } from "@codemirror/autocomplete";
import type { AiCompleteAccess, AiCompleteRequest, AiCompleteResponse } from "@/lib/ai/types";

/** Typing-pause before a suggestion is requested. */
const DEBOUNCE_MS = 600;
/** Back-off after a transient endpoint failure (5xx / network). */
const FAILURE_COOLDOWN_MS = 60_000;
/** Re-probe interval while access is denied (covers signing in mid-page). */
const DENIED_PROBE_TTL_MS = 5 * 60_000;
/** Client-side context caps, generous; the server re-trims to its budgets. */
const PREFIX_CHAR_CAP = 8_000;
const SUFFIX_CHAR_CAP = 4_000;

export interface InlineCompletionConfig {
  /** Language adapter id sent to the prompt, e.g. "python", "typescript". */
  language: string;
  /** Active filename, for multi-file surfaces. Read per request so tab
   *  switches don't need an editor reconfigure. */
  filename?: () => string | undefined;
  /** Read-only code that conceptually runs before this editor's doc (the
   *  challenge/code-block init drawer). Prepended to the prompt prefix so the
   *  model sees the names it defines. */
  contextPrefix?: () => string;
}

// ─── Access gate (module-wide, shared by every editor on the page) ───────

let accessPromise: Promise<boolean> | null = null;
let accessDeniedAt = 0;
/** Set on a 401/403/429 POST: definitively not available this page load. */
let hardDisabled = false;
let cooldownUntil = 0;

function checkAccess(): Promise<boolean> {
  if (hardDisabled) return Promise.resolve(false);
  if (
    accessPromise &&
    (accessDeniedAt === 0 || Date.now() - accessDeniedAt < DENIED_PROBE_TTL_MS)
  ) {
    return accessPromise;
  }
  accessDeniedAt = 0;
  accessPromise = fetch("/api/ai/complete")
    .then((res) =>
      res.ok ? (res.json() as Promise<AiCompleteAccess>) : { enabled: false },
    )
    .then((data) => {
      if (!data.enabled) accessDeniedAt = Date.now();
      return Boolean(data.enabled);
    })
    .catch(() => {
      accessDeniedAt = Date.now();
      return false;
    });
  return accessPromise;
}

// ─── Suggestion state ─────────────────────────────────────────────────────

interface ActiveSuggestion {
  /** Remaining ghost text (shrinks as the user types through it). */
  text: string;
  /** Doc position the ghost text sits at (the cursor when it was fetched). */
  pos: number;
}

const setSuggestion = StateEffect.define<ActiveSuggestion | null>();

class GhostTextWidget extends WidgetType {
  constructor(readonly text: string) {
    super();
  }
  override eq(other: GhostTextWidget): boolean {
    return other.text === this.text;
  }
  override toDOM(): HTMLElement {
    const span = document.createElement("span");
    span.className = "cm-aiGhostText";
    // Purely visual preview, keep it out of the accessibility tree so
    // screen readers don't announce unaccepted code.
    span.setAttribute("aria-hidden", "true");
    span.textContent = this.text;
    return span;
  }
  override get lineBreaks(): number {
    return this.text.split("\n").length - 1;
  }
  override ignoreEvent(): boolean {
    return false;
  }
}

const suggestionField = StateField.define<ActiveSuggestion | null>({
  create: () => null,
  update(value, tr) {
    for (const e of tr.effects) {
      if (e.is(setSuggestion)) return e.value;
    }
    if (!value) return null;
    if (tr.docChanged) {
      // "Type-through": a single plain insertion at the suggestion position
      // that matches the head of the ghost text consumes it; anything else
      // (edits elsewhere, deletions, paste of non-matching text) clears it.
      let next: ActiveSuggestion | null = null;
      let changes = 0;
      let simple = true;
      tr.changes.iterChanges((fromA, toA, _fromB, toB, inserted) => {
        changes += 1;
        if (changes > 1 || fromA !== toA || fromA !== value.pos) {
          simple = false;
          return;
        }
        const typed = inserted.toString();
        if (
          typed.length > 0 &&
          typed.length < value.text.length &&
          value.text.startsWith(typed)
        ) {
          next = { text: value.text.slice(typed.length), pos: toB };
        } else {
          simple = false;
        }
      });
      return simple ? next : null;
    }
    // Moving the cursor away abandons the suggestion.
    if (tr.selection && tr.selection.main.head !== value.pos) return null;
    return value;
  },
  provide: (field) =>
    EditorView.decorations.from(field, (value) =>
      value
        ? Decoration.set([
            Decoration.widget({
              widget: new GhostTextWidget(value.text),
              side: 1,
            }).range(value.pos),
          ])
        : Decoration.none,
    ),
});

const ghostTheme = EditorView.baseTheme({
  ".cm-aiGhostText": {
    opacity: "0.5",
    pointerEvents: "none",
  },
});

// ─── Accept / dismiss keys ────────────────────────────────────────────────
//
// Highest precedence so Tab wins over indentWithTab and Escape wins over
// panel/tooltip handlers, but only while a suggestion is showing; both
// return false otherwise so the regular bindings still fire.

const suggestionKeymap = Prec.highest(
  keymap.of([
    {
      key: "Tab",
      run: (view) => {
        const s = view.state.field(suggestionField, false);
        if (!s || view.state.selection.main.head !== s.pos) return false;
        view.dispatch({
          changes: { from: s.pos, insert: s.text },
          selection: { anchor: s.pos + s.text.length },
          effects: setSuggestion.of(null),
          userEvent: "input.complete",
        });
        return true;
      },
    },
    {
      key: "Escape",
      run: (view) => {
        const s = view.state.field(suggestionField, false);
        if (!s) return false;
        view.dispatch({ effects: setSuggestion.of(null) });
        return true;
      },
    },
  ]),
);

// ─── Fetch plugin ─────────────────────────────────────────────────────────

function fetchPlugin(config: InlineCompletionConfig) {
  return ViewPlugin.fromClass(
    class {
      private timer: number | null = null;
      private controller: AbortController | null = null;
      private destroyed = false;
      // Memo of the last round-trip so an identical context (e.g. dismiss +
      // retype) re-shows the suggestion without a second request.
      private lastKey: string | null = null;
      private lastText = "";

      constructor(private readonly view: EditorView) {}

      update(update: ViewUpdate): void {
        if (update.docChanged) {
          const userTyped = update.transactions.some(
            (tr) =>
              tr.isUserEvent("input") ||
              tr.isUserEvent("delete") ||
              tr.isUserEvent("undo") ||
              tr.isUserEvent("redo"),
          );
          // While the user is typing through an active suggestion there's
          // nothing to fetch; any other user edit (re)schedules one.
          if (userTyped && !update.state.field(suggestionField)) {
            this.schedule();
          } else if (!userTyped) {
            // Programmatic doc replacement (tab switch, reset), stand down.
            this.cancelPending();
          }
        } else if (update.selectionSet) {
          this.cancelPending();
        }
        if (update.focusChanged && !update.view.hasFocus) {
          this.cancelPending();
          if (update.state.field(suggestionField)) {
            // Can't dispatch from inside update(), defer the clear.
            setTimeout(() => {
              if (this.destroyed) return;
              if (this.view.state.field(suggestionField, false)) {
                this.view.dispatch({ effects: setSuggestion.of(null) });
              }
            }, 0);
          }
        }
      }

      destroy(): void {
        this.destroyed = true;
        this.cancelPending();
      }

      private cancelPending(): void {
        if (this.timer !== null) {
          window.clearTimeout(this.timer);
          this.timer = null;
        }
        this.controller?.abort();
        this.controller = null;
      }

      private schedule(): void {
        this.cancelPending();
        if (hardDisabled) return;
        this.timer = window.setTimeout(() => {
          this.timer = null;
          void this.request();
        }, DEBOUNCE_MS);
      }

      private async request(): Promise<void> {
        const { view } = this;
        if (this.destroyed || !view.hasFocus) return;
        // Dispatching decorations mid-IME-composition breaks the composition.
        if (view.composing) return;
        if (Date.now() < cooldownUntil) return;
        const { state } = view;
        if (state.readOnly) return;
        const sel = state.selection.main;
        if (!sel.empty || state.selection.ranges.length > 1) return;
        // Don't compete with the classic autocomplete tooltip.
        if (completionStatus(state) !== null) return;

        // Snapshot the context now; anything can change during the awaits.
        const doc = state.doc;
        const pos = sel.head;
        const extra = config.contextPrefix?.() ?? "";
        const docPrefix = doc.sliceString(Math.max(0, pos - PREFIX_CHAR_CAP), pos);
        const prefix = extra ? `${extra.trimEnd()}\n${docPrefix}` : docPrefix;
        const suffix = doc.sliceString(
          pos,
          Math.min(doc.length, pos + SUFFIX_CHAR_CAP),
        );
        if (!prefix.trim() && !suffix.trim()) return;

        if (!(await checkAccess())) return;
        if (this.destroyed) return;

        const stillCurrent = () =>
          !this.destroyed &&
          this.view.state.doc === doc &&
          this.view.state.selection.main.head === pos &&
          this.view.hasFocus &&
          !this.view.composing;
        if (!stillCurrent()) return;

        const key = `${prefix}\u0000${suffix}`;
        if (key === this.lastKey) {
          if (this.lastText) {
            this.view.dispatch({
              effects: setSuggestion.of({ text: this.lastText, pos }),
            });
          }
          return;
        }

        const controller = new AbortController();
        this.controller = controller;
        let text: string;
        try {
          const body: AiCompleteRequest = {
            language: config.language,
            prefix,
            suffix,
            filename: config.filename?.(),
          };
          const res = await fetch("/api/ai/complete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
            signal: controller.signal,
          });
          if (!res.ok) {
            if (res.status === 401 || res.status === 403 || res.status === 429) {
              // Not (or no longer) entitled today, stop asking this page load.
              hardDisabled = true;
            } else {
              cooldownUntil = Date.now() + FAILURE_COOLDOWN_MS;
            }
            return;
          }
          text = ((await res.json()) as AiCompleteResponse).text ?? "";
        } catch (err) {
          if ((err as Error).name !== "AbortError") {
            cooldownUntil = Date.now() + FAILURE_COOLDOWN_MS;
          }
          return;
        } finally {
          if (this.controller === controller) this.controller = null;
        }

        this.lastKey = key;
        this.lastText = text;
        if (!text || !stillCurrent()) return;
        this.view.dispatch({ effects: setSuggestion.of({ text, pos }) });
      }
    },
  );
}

/**
 * AI inline completion extension for one editor. Append to the editor's
 * extension list unconditionally, it gates itself (pro members only) and is
 * inert for everyone else.
 */
export function aiInlineCompletion(config: InlineCompletionConfig): Extension {
  return [suggestionField, ghostTheme, suggestionKeymap, fetchPlugin(config)];
}

/** Test-only handles into the suggestion state machine (see
 *  __tests__/aiInlineCompletion.test.ts). Not part of the public surface. */
export const _internal = { suggestionField, setSuggestion };
