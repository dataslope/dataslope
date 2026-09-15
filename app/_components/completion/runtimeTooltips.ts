"use client";

// Hover documentation and parameter hints on top of a runtime's `hover()`
// and `signatureHelp()`: the two tooltips that make a completion popup feel
// like an IDE. Both are best-effort: a runtime without the method, a
// runtime that is still booting, or an analyzer error simply shows nothing.

import { StateEffect, StateField, type Extension } from "@codemirror/state";
import {
  EditorView,
  hoverTooltip,
  keymap,
  showTooltip,
  ViewPlugin,
  type Tooltip,
  type ViewUpdate,
} from "@codemirror/view";
import { Prec } from "@codemirror/state";

import type {
  HoverResult,
  PositionRequest,
  SignatureHelpResult,
} from "../types";
import { getCompletionTrigger } from "./completionPrefs";
import { docBody, signatureLine } from "./docText";
import { buildPositionRequest, type PositionContext } from "./positionRequest";

export interface TooltipRuntime {
  hover?(request: PositionRequest): Promise<HoverResult | null>;
  signatureHelp?(request: PositionRequest): Promise<SignatureHelpResult | null>;
}

export interface RuntimeTooltipConfig extends PositionContext {
  getRuntime: () => TooltipRuntime | null;
}

/** Hover after this long over a word; shorter feels twitchy while reading. */
const HOVER_DELAY_MS = 450;

// ─── Rendering ────────────────────────────────────────────────────────────

/** A signature line above a scrollable documentation body, the shape every
 *  notebook inspector uses. Both halves are shaped first: a runtime can hand
 *  over a whole definition as a "title" (see docText.ts). */
function renderHover(result: HoverResult): HTMLElement {
  const root = document.createElement("div");
  root.className = "cm-runtime-hover";
  const signature = signatureLine(result.title);
  const body = docBody(result.doc);
  if (signature) {
    const title = document.createElement("div");
    title.className = "cm-runtime-hover-title";
    title.textContent = signature;
    root.appendChild(title);
  }
  if (body) {
    const doc = document.createElement("div");
    doc.className = "cm-runtime-hover-doc";
    // The body scrolls on its own, so the signature stays in view.
    doc.tabIndex = 0;
    doc.textContent = body;
    root.appendChild(doc);
  }
  return root;
}

/** Wrap the active parameter of the signature label in a `<strong>`. */
function renderSignature(result: SignatureHelpResult): HTMLElement {
  const root = document.createElement("div");
  root.className = "cm-signature-help";
  const sig =
    result.signatures[result.activeSignature] ?? result.signatures[0];
  if (!sig) return root;

  const line = document.createElement("div");
  line.className = "cm-signature-help-label";
  const active = sig.parameters[result.activeParameter];
  const paren = sig.label.indexOf("(");
  // Locate the active parameter's text after the opening paren, skipping
  // earlier parameters that happen to share a prefix (`x` in `xs`).
  let from = -1;
  if (active) {
    let search = paren + 1;
    for (let i = 0; i <= result.activeParameter; i++) {
      const at = sig.label.indexOf(sig.parameters[i] ?? "", search);
      if (at < 0) {
        from = -1;
        break;
      }
      from = at;
      search = at + (sig.parameters[i]?.length ?? 0);
    }
  }
  if (active && from >= 0) {
    line.append(sig.label.slice(0, from));
    const strong = document.createElement("strong");
    strong.textContent = active;
    line.appendChild(strong);
    line.append(sig.label.slice(from + active.length));
  } else {
    line.textContent = sig.label;
  }
  if (result.signatures.length > 1) {
    const counter = document.createElement("span");
    counter.className = "cm-signature-help-count";
    counter.textContent = ` ${result.activeSignature + 1}/${result.signatures.length}`;
    line.appendChild(counter);
  }
  root.appendChild(line);

  const documentation = docBody(sig.documentation);
  if (documentation) {
    const doc = document.createElement("div");
    doc.className = "cm-signature-help-doc";
    doc.textContent = documentation;
    root.appendChild(doc);
  }
  return root;
}

// A notebook inspector's shape: the signature pinned at the top, a rule
// under it, and the documentation scrolling below in a box that cannot grow
// past a fraction of the window. A docstring runs to thousands of characters
// — pandas' `iloc` alone is 3,300 — so "as tall as it needs" is not a size.
/** The editor's own stack. A docstring is written for a fixed-width reader:
 *  numpydoc underlines its sections, doctest examples line their output up,
 *  and both turn to noise in a proportional font. */
const MONO =
  "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace";

const tooltipTheme = EditorView.baseTheme({
  ".cm-tooltip.cm-tooltip-hover .cm-runtime-hover, .cm-tooltip.cm-signature-help-tooltip":
    {
      maxWidth: "min(46em, 92vw)",
      fontSize: "90%",
      // The halves carry their own padding so a scrollbar sits against the
      // panel's edge rather than floating inside it.
      padding: "0",
    },
  ".cm-runtime-hover-title, .cm-signature-help-label": {
    fontFamily: MONO,
    padding: "6px 10px",
    whiteSpace: "pre-wrap",
    overflowWrap: "anywhere",
    lineHeight: "1.45",
  },
  // Only a hover with both halves needs the divider; a bare signature hint
  // would otherwise end in a rule with nothing under it.
  ".cm-runtime-hover-title:not(:last-child), .cm-signature-help-label:not(:last-child)":
    {
      borderBottom: "1px solid color-mix(in srgb, currentColor 18%, transparent)",
    },
  ".cm-runtime-hover-doc, .cm-signature-help-doc": {
    fontFamily: MONO,
    fontSize: "95%",
    padding: "6px 10px",
    maxHeight: "min(21em, 44vh)",
    overflowY: "auto",
    // A docstring's own scroll must not turn into the page's once it ends.
    overscrollBehavior: "contain",
    whiteSpace: "pre-wrap",
    overflowWrap: "anywhere",
    lineHeight: "1.5",
    opacity: "0.82",
    scrollbarWidth: "thin",
  },
  ".cm-runtime-hover-doc:focus-visible": { outline: "none" },
  // A parameter hint is a glance, not a read: it keeps less of the doc on
  // screen than a hover does.
  ".cm-signature-help-doc": { maxHeight: "min(12em, 30vh)" },
  ".cm-signature-help-count": { opacity: "0.6", fontSize: "85%" },
});

// ─── Hover ────────────────────────────────────────────────────────────────

function hoverExtension(cfg: RuntimeTooltipConfig): Extension {
  return hoverTooltip(
    async (view, pos) => {
      const rt = cfg.getRuntime();
      if (!rt || typeof rt.hover !== "function") return null;
      const word = view.state.wordAt(pos);
      if (!word) return null;
      let result: HoverResult | null;
      try {
        result = await rt.hover(buildPositionRequest(view.state, word.to, cfg));
      } catch {
        return null;
      }
      if (!result) return null;
      if (!signatureLine(result.title) && !docBody(result.doc)) return null;
      return {
        pos: word.from,
        end: word.to,
        above: true,
        create: () => ({ dom: renderHover(result) }),
      };
    },
    { hoverTime: HOVER_DELAY_MS },
  );
}

// ─── Signature help ───────────────────────────────────────────────────────

interface ActiveSignature {
  result: SignatureHelpResult;
  /** Where the tooltip anchors; follows the cursor along the line. */
  pos: number;
}

const setSignature = StateEffect.define<ActiveSignature | null>();

const signatureField = StateField.define<ActiveSignature | null>({
  create: () => null,
  update(value, tr) {
    for (const e of tr.effects) {
      if (e.is(setSignature)) return e.value;
    }
    if (!value) return null;
    const head = tr.newSelection.main.head;
    if (tr.docChanged) {
      // Typing inside the call keeps the hint (the plugin refreshes it on
      // `,`); leaving the line ends it.
      if (tr.newDoc.lineAt(head).number !== tr.newDoc.lineAt(Math.min(value.pos, tr.newDoc.length)).number) {
        return null;
      }
      return { ...value, pos: head };
    }
    if (tr.selection) {
      if (tr.newDoc.lineAt(head).number !== tr.newDoc.lineAt(value.pos).number) {
        return null;
      }
      return { ...value, pos: head };
    }
    return value;
  },
  provide: (field) =>
    showTooltip.from(field, (value): Tooltip | null =>
      value
        ? {
            pos: value.pos,
            above: true,
            create: () => {
              const dom = renderSignature(value.result);
              dom.classList.add("cm-signature-help-tooltip");
              return { dom };
            },
          }
        : null,
    ),
});

/** Typed characters that (re)open the hint, and the one that closes it. */
const OPENERS = new Set(["(", ","]);
const CLOSER = ")";

function signaturePlugin(cfg: RuntimeTooltipConfig) {
  return ViewPlugin.fromClass(
    class {
      private requestId = 0;
      private destroyed = false;

      constructor(private readonly view: EditorView) {}

      update(update: ViewUpdate): void {
        if (update.focusChanged && !update.view.hasFocus) {
          this.clear();
          return;
        }
        if (!update.docChanged) return;
        let typed = "";
        for (const tr of update.transactions) {
          if (!tr.isUserEvent("input.type")) continue;
          tr.changes.iterChanges((_fA, _tA, _fB, _tB, ins) => {
            typed += ins.toString();
          });
        }
        if (!typed) return;
        const last = typed[typed.length - 1];
        if (last === CLOSER) {
          this.clear();
        } else if (OPENERS.has(last)) {
          void this.request();
        }
      }

      destroy(): void {
        this.destroyed = true;
      }

      private clear(): void {
        if (!this.view.state.field(signatureField, false)) return;
        // Not inside update(): defer the dispatch.
        setTimeout(() => {
          if (this.destroyed) return;
          if (this.view.state.field(signatureField, false)) {
            this.view.dispatch({ effects: setSignature.of(null) });
          }
        }, 0);
      }

      private async request(): Promise<void> {
        if (getCompletionTrigger() === "off") return;
        const rt = cfg.getRuntime();
        if (!rt || typeof rt.signatureHelp !== "function") return;
        const id = ++this.requestId;
        const { state } = this.view;
        const pos = state.selection.main.head;
        let result: SignatureHelpResult | null;
        try {
          result = await rt.signatureHelp(buildPositionRequest(state, pos, cfg));
        } catch {
          result = null;
        }
        if (this.destroyed || id !== this.requestId) return;
        if (!result || result.signatures.length === 0) {
          if (this.view.state.field(signatureField, false)) {
            this.view.dispatch({ effects: setSignature.of(null) });
          }
          return;
        }
        this.view.dispatch({
          effects: setSignature.of({
            result,
            pos: this.view.state.selection.main.head,
          }),
        });
      }
    },
  );
}

const signatureKeymap = Prec.high(
  keymap.of([
    {
      key: "Escape",
      run: (view) => {
        if (!view.state.field(signatureField, false)) return false;
        view.dispatch({ effects: setSignature.of(null) });
        // Let the completion popup's own Escape run too.
        return false;
      },
    },
  ]),
);

/** Hover documentation + parameter hints for one editor. */
export function runtimeTooltips(cfg: RuntimeTooltipConfig): Extension {
  return [
    tooltipTheme,
    hoverExtension(cfg),
    signatureField,
    signaturePlugin(cfg),
    signatureKeymap,
  ];
}

/** Test-only handles. */
export const _internal = { renderSignature, signatureField, setSignature };
