// Shared CodeMirror editor-theme catalog and helpers used by every
// playground (Python, R, JS, …, SQLite). Extracted from Playground.tsx
// so that the SQL playground can re-tint its custom UI with the same
// CSS custom properties that the rest of the app uses, ensuring the
// "selecting an editor theme changes the overall feel" behavior is
// identical across playgrounds.
//
// Each theme drives both:
//   1. the CodeMirror editor (via `setOption("theme", value)`), and
//   2. the surrounding UI chrome (via the CSS custom properties below
//      written to `<html>` by `applyThemePalette`).

export interface ThemeEntry {
  value: string;
  label: string;
}

export const ALL_THEMES: ThemeEntry[] = [
  { value: "lucario", label: "Lucario" },
  { value: "dracula", label: "Dracula" },
  { value: "monokai", label: "Monokai" },
  { value: "nord", label: "Nord" },
  { value: "material-darker", label: "Material Darker" },
  { value: "tomorrow-night-eighties", label: "Tomorrow Night" },
  { value: "solarized dark", label: "Solarized Dark" },
  { value: "eclipse", label: "Eclipse" },
  { value: "gruvbox-dark", label: "Gruvbox Dark" },
  { value: "oceanic-next", label: "Oceanic Next" },
  { value: "material-palenight", label: "Material Palenight" },
  { value: "solarized light", label: "Solarized Light" },
  { value: "darcula", label: "Darcula" },
  { value: "ayu-mirage", label: "Ayu Mirage" },
  { value: "idea", label: "IntelliJ IDEA" },
  { value: "panda-syntax", label: "Panda" },
  { value: "zenburn", label: "Zenburn" },
  { value: "mdn-like", label: "MDN-like" },
  { value: "base16-light", label: "Base16 Light" },
];

export const LIGHT_THEMES = new Set([
  "eclipse",
  "mdn-like",
  "solarized light",
  "idea",
  "base16-light",
]);

export const PLAYGROUND_EDITOR_THEME_STORAGE_KEY = "pg_editor_theme";

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
}

export const THEME_PREVIEWS: Record<string, ThemePalette> = {
  dracula: {
    bg: "#282a36", bg2: "#21222c", bg3: "#343746", border: "#44475a",
    text: "#f8f8f2", dim: "#6272a4", muted: "#bd93f9",
    kw: "#ff79c6", fn: "#50fa7b", arg: "#ffb86c", str: "#f1fa8c",
  },
  monokai: {
    bg: "#272822", bg2: "#1e1f1c", bg3: "#3e3d32", border: "#49483e",
    text: "#f8f8f2", dim: "#75715e", muted: "#ae81ff",
    kw: "#f92672", fn: "#a6e22e", arg: "#fd971f", str: "#e6db74",
  },
  "material-darker": {
    bg: "#212121", bg2: "#1a1a1a", bg3: "#2d2d2d", border: "#3d3d3d",
    text: "#eeffff", dim: "#546e7a", muted: "#82aaff",
    kw: "#c792ea", fn: "#82aaff", arg: "#ffcb6b", str: "#c3e88d",
  },
  nord: {
    bg: "#2e3440", bg2: "#272c36", bg3: "#3b4252", border: "#434c5e",
    text: "#d8dee9", dim: "#4c566a", muted: "#88c0d0",
    kw: "#81a1c1", fn: "#88c0d0", arg: "#d08770", str: "#a3be8c",
  },
  "tomorrow-night-eighties": {
    bg: "#2d2d2d", bg2: "#252525", bg3: "#393939", border: "#515151",
    text: "#cccccc", dim: "#777777", muted: "#cc99cc",
    kw: "#cc99cc", fn: "#6699cc", arg: "#f99157", str: "#99cc99",
  },
  "solarized dark": {
    bg: "#002b36", bg2: "#00212b", bg3: "#073642", border: "#094b5a",
    text: "#839496", dim: "#586e75", muted: "#657b83",
    kw: "#859900", fn: "#268bd2", arg: "#cb4b16", str: "#2aa198",
  },
  "solarized light": {
    bg: "#fdf6e3", bg2: "#eee8d5", bg3: "#f5efdc", border: "#ddd6c0",
    text: "#657b83", dim: "#93a1a1", muted: "#586e75",
    kw: "#859900", fn: "#268bd2", arg: "#cb4b16", str: "#2aa198",
  },
  eclipse: {
    bg: "#ffffff", bg2: "#f5f5f5", bg3: "#ebebeb", border: "#d8d8d8",
    text: "#1a1a1a", dim: "#aaaaaa", muted: "#555555",
    kw: "#7f0055", fn: "#0000c0", arg: "#6a3e3e", str: "#2a00ff",
  },
  "mdn-like": {
    bg: "#ffffff", bg2: "#f9f9fb", bg3: "#f0f0f4", border: "#dcdce0",
    text: "#333333", dim: "#aaaaaa", muted: "#666666",
    kw: "#a71d5d", fn: "#005cc5", arg: "#e36209", str: "#032f62",
  },
  "material-palenight": {
    bg: "#292d3e", bg2: "#222533", bg3: "#3a3f58", border: "#444a66",
    text: "#a6accd", dim: "#676e95", muted: "#82aaff",
    kw: "#c792ea", fn: "#82aaff", arg: "#ffcb6b", str: "#c3e88d",
  },
  "ayu-mirage": {
    bg: "#1f2430", bg2: "#191e2a", bg3: "#2a3041", border: "#343b4f",
    text: "#cbccc6", dim: "#5c6773", muted: "#73d0ff",
    kw: "#ffa759", fn: "#ffd580", arg: "#ffcc66", str: "#bae67e",
  },
  "gruvbox-dark": {
    bg: "#282828", bg2: "#1d2021", bg3: "#3c3836", border: "#504945",
    text: "#ebdbb2", dim: "#7c6f64", muted: "#83a598",
    kw: "#fb4934", fn: "#b8bb26", arg: "#fabd2f", str: "#b8bb26",
  },
  "oceanic-next": {
    bg: "#1b2b34", bg2: "#16242c", bg3: "#283a44", border: "#34434d",
    text: "#cdd3de", dim: "#65737e", muted: "#6699cc",
    kw: "#c594c5", fn: "#6699cc", arg: "#f99157", str: "#99c794",
  },
  "panda-syntax": {
    bg: "#292a2b", bg2: "#1f2021", bg3: "#34353a", border: "#42434a",
    text: "#e6e6e6", dim: "#676b79", muted: "#ff75b5",
    kw: "#ff75b5", fn: "#19f9d8", arg: "#ffb86c", str: "#19f9d8",
  },
  darcula: {
    bg: "#2b2b2b", bg2: "#232323", bg3: "#3c3f41", border: "#4d4d4d",
    text: "#a9b7c6", dim: "#606366", muted: "#9876aa",
    kw: "#cc7832", fn: "#ffc66d", arg: "#9876aa", str: "#6a8759",
  },
  zenburn: {
    bg: "#3f3f3f", bg2: "#353535", bg3: "#494949", border: "#555555",
    text: "#dcdccc", dim: "#7f9f7f", muted: "#dca3a3",
    kw: "#f0dfaf", fn: "#dfaf8f", arg: "#dcdccc", str: "#cc9393",
  },
  lucario: {
    bg: "#2b3e50", bg2: "#1f2e3d", bg3: "#3a4f63", border: "#4c5f73",
    text: "#f8f8f2", dim: "#5c98cd", muted: "#72c05d",
    kw: "#ff6541", fn: "#a6e22e", arg: "#e7c547", str: "#e7db74",
  },
  idea: {
    bg: "#ffffff", bg2: "#f5f5f5", bg3: "#ebebeb", border: "#d8d8d8",
    text: "#000000", dim: "#999999", muted: "#660e7a",
    kw: "#000080", fn: "#0000ff", arg: "#660e7a", str: "#008000",
  },
  "base16-light": {
    bg: "#f5f5f5", bg2: "#e8e8e8", bg3: "#dcdcdc", border: "#cccccc",
    text: "#202020", dim: "#b0b0b0", muted: "#705050",
    kw: "#90a959", fn: "#6a9fb5", arg: "#aa759f", str: "#a06e3b",
  },
};

/** Push the given theme's palette into CSS custom properties on `<html>`
 *  so every surface that consumes `--bg`/`--bg2`/`--text`/etc. retints
 *  in lockstep with the editor. */
export function applyThemePalette(theme: string): void {
  const p = THEME_PREVIEWS[theme] ?? THEME_PREVIEWS.lucario;
  const root = document.documentElement;
  root.style.setProperty("--bg", p.bg);
  root.style.setProperty("--bg2", p.bg2);
  root.style.setProperty("--bg3", p.bg3);
  root.style.setProperty("--border", p.border);
  root.style.setProperty("--text", p.text);
  // `--text-dim` and `--text-muted` are intentionally NOT written here.
  // They are derived in CSS via `color-mix(--text, --bg)` so secondary UI
  // text always blends with the active theme's background and stays
  // neutral instead of inheriting the editor palette's accent hues
  // (e.g. Lucario's blue/green or IntelliJ's dark purple).
  //
  // `--text-soft` and `--text-accent` are the *opposite* — places where we
  // explicitly want the theme's personality to come through. They reuse
  // the editor palette's `dim` / `muted` slots (e.g. Lucario blue for
  // soft, Lucario green for accent), used for tab labels, table/view
  // tree icons, and ER table headers.
  root.style.setProperty("--text-soft", p.dim);
  root.style.setProperty("--text-accent", p.muted);
  root.style.setProperty("--text-complementary", p.fn);
  root.style.setProperty("--theme-primary", p.kw);
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
    "--text-soft",
    "--text-accent",
    "--text-complementary",
    "--theme-primary",
  ]) {
    root.style.removeProperty(name);
  }
  root.removeAttribute("data-pg-theme");
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
    // localStorage unavailable — fall back to defaults.
  }
  return null;
}

export function setStoredEditorTheme(theme: string): void {
  try {
    localStorage.setItem(PLAYGROUND_EDITOR_THEME_STORAGE_KEY, theme);
  } catch {
    // localStorage unavailable — state still updates for this session.
  }
}

/** Toggle `data-pg-theme` on `<html>` so playground-specific light-mode
 *  CSS overrides apply (e.g. inverting the loading overlay for light
 *  themes). Uses a playground-namespaced attribute so it never conflicts
 *  with the docs site's own `data-theme` / class-based dark mode. */
export function applyMode(theme: string): void {
  const resolved = LIGHT_THEMES.has(theme) ? "light" : "dark";
  document.documentElement.setAttribute("data-pg-theme", resolved);
}
