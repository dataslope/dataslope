"use client";

// Shared CodeMirror v6 helpers used by every editor mount in the app
// (CodeBlock, Playground, SqlPlayground.DdlViewer). Keeps the per-call-
// site setup small while leaving v6's compositional API exposed —
// consumers still hold their own EditorView, manage their own
// Compartments, and dispatch their own transactions, so adding custom
// extensions / decorations / annotations later is just appending to the
// extension list at the call site.

import { EditorView, layer, RectangleMarker } from "@codemirror/view";
import {
  HighlightStyle,
  StreamLanguage,
  syntaxHighlighting,
} from "@codemirror/language";
import { tags as t } from "@lezer/highlight";
import type { Extension } from "@codemirror/state";

import {
  LIGHT_THEMES,
  THEME_PREVIEWS,
  type ThemePalette,
} from "./playgroundTheme";

// ─── Language loader ─────────────────────────────────────────────────────
//
// Maps the `codeMirrorMode` strings the runtime adapters expose (kept
// identical to v5 to avoid touching 9 adapter files) to v6 language
// extensions. Languages without a dedicated v6 package (R, C#) come from
// `@codemirror/legacy-modes`, which re-runs the v5 stream parser inside
// v6's framework.
//
// Returns `null` for unknown modes — callers should treat that as
// "render plain text", which is how v5 behaved when a mode wasn't loaded.

export async function loadLanguage(mode: string): Promise<Extension | null> {
  switch (mode) {
    case "python": {
      const { python } = await import("@codemirror/lang-python");
      return python();
    }
    case "javascript": {
      const { javascript } = await import("@codemirror/lang-javascript");
      return javascript();
    }
    case "text/typescript": {
      const { javascript } = await import("@codemirror/lang-javascript");
      return javascript({ typescript: true });
    }
    case "php": {
      const { php } = await import("@codemirror/lang-php");
      return php();
    }
    case "text/x-csrc":
    case "text/x-c++src": {
      const { cpp } = await import("@codemirror/lang-cpp");
      return cpp();
    }
    case "text/x-java": {
      const { java } = await import("@codemirror/lang-java");
      return java();
    }
    case "text/x-csharp": {
      const { csharp } = await import("@codemirror/legacy-modes/mode/clike");
      return StreamLanguage.define(csharp);
    }
    case "r": {
      const { r } = await import("@codemirror/legacy-modes/mode/r");
      return StreamLanguage.define(r);
    }
    // SQL is intentionally not handled here — SqlPlayground builds the
    // language extension itself so it can pass a live `schema` for
    // schema-aware autocompletion.
    case "xml": {
      const { xml } = await import("@codemirror/lang-xml");
      return xml();
    }
    case "htmlmixed": {
      const { html } = await import("@codemirror/lang-html");
      return html();
    }
    case "css": {
      const { css } = await import("@codemirror/lang-css");
      return css();
    }
    default:
      return null;
  }
}

// ─── Theme builder ───────────────────────────────────────────────────────
//
// v6 themes are JS objects. Rather than ship 19 hand-written themes (or
// pull in a fat third-party theme bundle), we synthesise the editor
// theme + token highlight style from the same `THEME_PREVIEWS` palette
// already used by the surrounding UI chrome. The editor then stays in
// lockstep with the chrome whenever the user picks a different theme.

function buildTheme(name: string, palette: ThemePalette, isLight: boolean): Extension {
  const selectionBg = isLight
    ? "rgba(0, 100, 200, 0.20)"
    : "rgba(255, 255, 255, 0.18)";
  const matchedBracketBg = isLight
    ? "rgba(0, 0, 0, 0.10)"
    : "rgba(255, 255, 255, 0.18)";

  const view = EditorView.theme(
    {
      "&": {
        color: palette.text,
        backgroundColor: palette.bg,
        height: "100%",
      },
      ".cm-scroller": {
        fontFamily:
          "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
      },
      ".cm-content": { caretColor: palette.text },
      ".cm-cursor, .cm-dropCursor": { borderLeftColor: palette.text },
      "&.cm-focused .cm-cursor": { borderLeftColor: palette.text },
      "&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection":
        { backgroundColor: selectionBg },
      ".cm-gutters": {
        backgroundColor: palette.bg,
        color: palette.dim,
        border: "none",
        borderRight: `1px solid ${palette.border}`,
      },
      // The active-line highlight is rendered as a custom `layer` (see
      // `activeLineLayer` below) instead of as a `background-color` on
      // `.cm-line`. CM6's selection layer is itself a `layer` registered
      // by `drawSelection()`, and `LayerView.setOrder` assigns z-indexes
      // based on each layer's position in the `layerOrder` facet. By
      // appending our active-line layer *after* `drawSelection()` in the
      // extension tree, its z-index ends up more negative than the
      // selection layer's, so the selection paints over it — keeping
      // partial selections visible inside the active line.
      // A `!important` here disables the `&dark .cm-activeLine`
      // background that ships with `highlightActiveLine()` (its
      // specificity equals ours, but `!important` settles it
      // unambiguously).
      ".cm-activeLine": { backgroundColor: "transparent !important" },
      ".cm-activeLineMarker": {
        backgroundColor: isLight ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.05)",
      },
      ".cm-activeLineGutter": {
        backgroundColor: isLight ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.05)",
        color: palette.text,
      },
      ".cm-lineNumbers .cm-gutterElement": { color: palette.dim },
      ".cm-foldGutter .cm-gutterElement": { color: palette.dim },
      ".cm-matchingBracket, .cm-nonmatchingBracket": {
        backgroundColor: matchedBracketBg,
        outline: `1px solid ${palette.border}`,
      },
      ".cm-selectionMatch": { backgroundColor: matchedBracketBg },
      ".cm-tooltip": {
        backgroundColor: palette.bg2,
        color: palette.text,
        border: `1px solid ${palette.border}`,
      },
      ".cm-tooltip-autocomplete > ul > li": { padding: "2px 8px" },
      ".cm-tooltip-autocomplete > ul > li[aria-selected]": {
        backgroundColor: palette.bg3,
        color: palette.text,
      },
      ".cm-panels": {
        backgroundColor: palette.bg2,
        color: palette.text,
        borderTop: `1px solid ${palette.border}`,
      },
      ".cm-searchMatch": { backgroundColor: matchedBracketBg },
      ".cm-foldPlaceholder": {
        backgroundColor: palette.bg3,
        color: palette.dim,
        border: "none",
      },
    },
    { dark: !isLight },
  );

  const highlight = HighlightStyle.define([
    {
      tag: [t.keyword, t.controlKeyword, t.modifier, t.operatorKeyword],
      color: palette.kw,
    },
    { tag: [t.atom, t.bool, t.number, t.literal], color: palette.muted },
    {
      tag: [t.string, t.regexp, t.special(t.string)],
      color: palette.str,
    },
    {
      tag: [
        t.function(t.variableName),
        t.function(t.propertyName),
        t.function(t.definition(t.variableName)),
      ],
      color: palette.fn,
    },
    {
      tag: [t.definition(t.variableName), t.definition(t.propertyName)],
      color: palette.fn,
    },
    { tag: [t.variableName, t.propertyName], color: palette.text },
    { tag: [t.typeName, t.className, t.namespace], color: palette.fn },
    {
      tag: [t.comment, t.lineComment, t.blockComment, t.docComment],
      color: palette.dim,
      fontStyle: "italic",
    },
    { tag: [t.tagName, t.angleBracket], color: palette.kw },
    { tag: [t.attributeName], color: palette.arg },
    { tag: [t.attributeValue], color: palette.str },
    { tag: [t.heading, t.strong], color: palette.kw, fontWeight: "bold" },
    { tag: [t.emphasis], color: palette.kw, fontStyle: "italic" },
    {
      tag: [t.link, t.url],
      color: palette.muted,
      textDecoration: "underline",
    },
    { tag: [t.invalid], color: "#ff5555" },
    { tag: [t.meta, t.processingInstruction], color: palette.arg },
    { tag: [t.punctuation, t.bracket], color: palette.text },
    { tag: [t.operator], color: palette.kw },
  ]);

  // Stamp the theme name as a class on the editor wrapper so any legacy
  // theme-scoped CSS (e.g. `.cm-s-tomorrow-night-eighties …`) still has
  // a selector to attach to.
  const themeNameClass = EditorView.editorAttributes.of({
    class: `cm-s-${name.replace(/\s+/g, "-")}`,
  });

  return [
    view,
    syntaxHighlighting(highlight),
    themeNameClass,
    activeLineLayer,
  ];
}

// Active-line background drawn as a `layer({ above: false })`. This is the
// CM6-author-recommended fix for the "active line covers the selection"
// problem (see https://discuss.codemirror.net/t/line-background-color-and-selection-layering/5413/4 ):
// because LayerView.setOrder assigns each below-layer the z-index
// `(-1 - posInLayerOrder)`, the layer registered later in the extension
// tree gets a *more negative* z-index than the selection layer added by
// `drawSelection()`. The active-line rectangle is therefore painted
// behind the selection, so partial selections stay visible on the
// active line. Each consumer adds `themeFor(...)` after `drawSelection()`
// in its extension list, which keeps the ordering correct.
const activeLineLayer = layer({
  above: false,
  markers(view) {
    const markers: RectangleMarker[] = [];
    const seen = new Set<number>();
    const width = view.scrollDOM.scrollWidth;
    for (const r of view.state.selection.ranges) {
      const line = view.state.doc.lineAt(r.head);
      if (seen.has(line.from)) continue;
      seen.add(line.from);
      const block = view.lineBlockAt(line.from);
      markers.push(
        new RectangleMarker(
          "cm-activeLineMarker",
          0,
          block.top,
          width,
          block.height,
        ),
      );
    }
    return markers;
  },
  update(update) {
    return (
      update.docChanged ||
      update.selectionSet ||
      update.viewportChanged ||
      update.geometryChanged
    );
  },
  class: "cm-activeLineLayer",
});

const themeCache = new Map<string, Extension>();

export function themeFor(name: string): Extension {
  const cached = themeCache.get(name);
  if (cached) return cached;
  const palette = THEME_PREVIEWS[name] ?? THEME_PREVIEWS.lucario;
  const ext = buildTheme(name, palette, LIGHT_THEMES.has(name));
  themeCache.set(name, ext);
  return ext;
}
