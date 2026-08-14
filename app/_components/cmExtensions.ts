"use client";

// Shared CodeMirror v6 helpers for every editor mount in the app. Consumers
// still hold their own EditorView/Compartments and dispatch their own
// transactions.

import { EditorView, type KeyBinding } from "@codemirror/view";
import { redo } from "@codemirror/commands";
import {
  HighlightStyle,
  StreamLanguage,
  syntaxHighlighting,
} from "@codemirror/language";
import { tags as t } from "@lezer/highlight";
import type { Extension } from "@codemirror/state";
import { githubLight, githubDark } from "@uiw/codemirror-theme-github";

import {
  LIGHT_THEMES,
  THEME_PALETTES,
  type ThemePalette,
} from "./playgroundTheme";

// ─── Redo keybinding ─────────────────────────────────────────────────────
// The default `historyKeymap` lacks Ctrl-Shift-z redo on Windows/Linux;
// `Mod-Shift-z` fills that gap. Append after `historyKeymap`.
export const redoKeymap: readonly KeyBinding[] = [
  { key: "Mod-Shift-z", run: redo, preventDefault: true },
];

// ─── Language loader ─────────────────────────────────────────────────────
// Maps adapters' v5-style `codeMirrorMode` strings to v6 language extensions
// (R and C# via legacy-modes). Resolves `null` — render plain text — for
// unknown modes and for failed chunk loads, never an unhandled rejection.

export async function loadLanguage(mode: string): Promise<Extension | null> {
  try {
    return await loadLanguageModule(mode);
  } catch {
    return null;
  }
}

async function loadLanguageModule(mode: string): Promise<Extension | null> {
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
    case "tsx": {
      const { javascript } = await import("@codemirror/lang-javascript");
      return javascript({ typescript: true, jsx: true });
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
    // SQL is intentionally absent: SqlPlayground builds its own extension so
    // it can pass a live `schema` for autocompletion.
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
// Synthesises editor theme + highlight style from the same `THEME_PALETTES`
// catalog the UI chrome uses, so the two stay in lockstep.

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
        fontSize: "14px",
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
      // Suppress highlightActiveLine()'s current-line background.
      ".cm-activeLine": { backgroundColor: "transparent !important" },
      ".cm-activeLineGutter": {
        backgroundColor: "transparent !important",
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

  // Stamp the theme name as a class so legacy theme-scoped CSS (`.cm-s-…`)
  // still has a selector.
  const themeNameClass = EditorView.editorAttributes.of({
    class: `cm-s-${name.replace(/\s+/g, "-")}`,
  });

  return [
    view,
    syntaxHighlighting(highlight),
    themeNameClass,
  ];
}

const themeCache = new Map<string, Extension>();

/** Suppresses active-line background highlighting. */
export const noActiveLine: Extension = EditorView.theme({
  ".cm-activeLine": { backgroundColor: "transparent !important" },
  ".cm-activeLineGutter": { backgroundColor: "transparent !important" },
});

// Override GitHub Dark's editor/gutter backgrounds to match the Fumadocs page
// background; applied after githubDark so it wins via ordering. The #121212
// fallback covers routes where the Fumadocs token isn't defined.
const githubDarkPageBgOverride = EditorView.theme(
  {
    "&": {
      backgroundColor: "var(--color-fd-background, #121212)",
    },
    ".cm-gutters": {
      backgroundColor: "var(--color-fd-background, #121212)",
    },
  },
  { dark: true },
);
// The @uiw GitHub themes paint an active-line background; suppress it to
// match the buildTheme themes.
const githubDarkCustom: Extension = [
  githubDark,
  githubDarkPageBgOverride,
  noActiveLine,
];
const githubLightCustom: Extension = [githubLight, noActiveLine];

export function themeFor(name: string): Extension {
  // GitHub themes use the @uiw package's own token colors, not buildTheme.
  if (name === "github-dark") return githubDarkCustom;
  if (name === "github-light") return githubLightCustom;
  const cached = themeCache.get(name);
  if (cached) return cached;
  const palette = THEME_PALETTES[name] ?? THEME_PALETTES["github-light"];
  const ext = buildTheme(name, palette, LIGHT_THEMES.has(name));
  themeCache.set(name, ext);
  return ext;
}
