// Shared CodeMirror editor-theme catalog and helpers used by every
// playground (Python, R, JS, …, SQLite). Extracted from Playground.tsx
// so that the SQL playground can re-tint its custom UI with the same
// CSS custom properties that the rest of the app uses, ensuring the
// "selecting an editor theme changes the overall feel" behavior is
// identical across playgrounds.
//
// The catalog is intentionally just two themes, GitHub Light and GitHub
// Dark, which map 1:1 to the site-wide light/dark mode. The playground's
// light/dark choice is therefore the SAME choice the rest of the site uses
// (the `theme` localStorage key + `.dark` class); see playgroundThemeSync.ts.
//
// Each theme drives both:
//   1. the CodeMirror editor (via `themeFor(value)`), and
//   2. the surrounding UI chrome (via the CSS custom properties below
//      written to `<html>` by `applyThemePalette`).

export interface ThemeEntry {
  value: string;
  label: string;
}

export const ALL_THEMES: ThemeEntry[] = [
  { value: "github-light", label: "GitHub Light" },
  { value: "github-dark", label: "GitHub Dark" },
];

export const LIGHT_THEMES = new Set(["github-light"]);

export const PLAYGROUND_EDITOR_THEME_STORAGE_KEY = "playground_editor_theme";

export interface ThemePalette {
  bg: string;
  bg2: string;
  bg3: string;
  border: string;
  text: string;
  dim: string;
  muted: string;
  kw: string;
  fn: string;
  arg: string;
  str: string;
  accent1: string;
  accent2: string;
}

export const THEME_PALETTES: Record<string, ThemePalette> = {
  // GitHub themes drive the editor from the @uiw/codemirror-theme-github
  // package (see `themeFor` in cmExtensions.ts), which bypasses the
  // synthetic `buildTheme`. These palettes therefore only tint the
  // surrounding UI chrome and the theme-card preview swatch; the token
  // colors below mirror the @uiw GitHub themes so the two stay in sync.
  // The dark background is the site's neutral near-black (#121212), not
  // GitHub's blue-tinted #0d1117.
  "github-dark": {
    bg: "#121212",
    bg2: "#0a0a0a",
    bg3: "#1c1c1c",
    border: "#2a2a2a",
    text: "#c9d1d9",
    dim: "#8b949e",
    muted: "#79c0ff",
    kw: "#ff7b72",
    fn: "#d2a8ff",
    arg: "#ffa657",
    str: "#a5d6ff",
    accent1: "#d2a8ff",
    accent2: "#79c0ff",
  },
  "github-light": {
    bg: "#ffffff",
    bg2: "#f6f8fa",
    bg3: "#eaeef2",
    border: "#d0d7de",
    text: "#24292f",
    dim: "#6e7781",
    muted: "#0550ae",
    kw: "#cf222e",
    fn: "#8250df",
    arg: "#953800",
    str: "#0a3069",
    accent1: "#8250df",
    accent2: "#0550ae",
  },
};

/** Push the given theme's palette into CSS custom properties on `<html>`
 *  so every surface that consumes `--bg`/`--bg2`/`--text`/etc. retints
 *  in lockstep with the editor. */
export function applyThemePalette(theme: string): void {
  const p = THEME_PALETTES[theme] ?? THEME_PALETTES["github-light"];
  const root = document.documentElement;
  root.style.setProperty("--bg", p.bg);
  root.style.setProperty("--bg2", p.bg2);
  root.style.setProperty("--bg3", p.bg3);
  root.style.setProperty("--border", p.border);
  root.style.setProperty("--text", p.text);
  root.style.setProperty("--text-dim", p.dim);
  root.style.setProperty("--text-muted", p.muted);
  root.style.setProperty("--text-complementary", p.fn);
  root.style.setProperty("--theme-primary", p.kw);
  root.style.setProperty("--accent1", p.accent1);
  root.style.setProperty("--accent2", p.accent2);
}

export function clearThemePalette(): void {
  const root = document.documentElement;
  for (const name of [
    "--bg",
    "--bg2",
    "--bg3",
    "--border",
    "--text",
    "--text-dim",
    "--text-muted",
    "--text-complementary",
    "--theme-primary",
    "--accent1",
    "--accent2",
    // Font-size vars are set on <html> alongside the palette by every
    // playground's mount effect; clear them here too (this function's only
    // callers are those playgrounds' unmount cleanups) so they don't leak
    // onto non-playground routes after client-side navigation.
    "--cm-font-size",
    "--output-font-size",
  ]) {
    root.style.removeProperty(name);
  }
  root.removeAttribute("data-playground-theme");
}

export function getStoredEditorTheme(legacyKey?: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const shared = localStorage.getItem(PLAYGROUND_EDITOR_THEME_STORAGE_KEY);
    if (shared) return shared;
    const legacy = legacyKey ? localStorage.getItem(legacyKey) : null;
    if (legacy) {
      localStorage.setItem(PLAYGROUND_EDITOR_THEME_STORAGE_KEY, legacy);
      return legacy;
    }
  } catch {
    // localStorage unavailable, fall back to defaults.
  }
  return null;
}

export function setStoredEditorTheme(theme: string): void {
  try {
    localStorage.setItem(PLAYGROUND_EDITOR_THEME_STORAGE_KEY, theme);
  } catch {
    // localStorage unavailable, state still updates for this session.
  }
}

/** Toggle `data-playground-theme` on `<html>` so playground-specific light-mode
 *  CSS overrides apply (e.g. inverting the loading overlay for light
 *  themes). Uses a playground-namespaced attribute so it never conflicts
 *  with the docs site's own `data-theme` / class-based dark mode. */
export function applyMode(theme: string): void {
  const resolved = LIGHT_THEMES.has(theme) ? "light" : "dark";
  document.documentElement.setAttribute("data-playground-theme", resolved);
}
