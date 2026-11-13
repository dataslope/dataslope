"use client";

// How the completion popup looks in the SQL playgrounds.
//
// The playgrounds' editors never themed it, so it showed CodeMirror's
// defaults: square corners, a grey fill, a saturated blue selection bar and
// no shadow, beside menus and popovers that are all rounded, bordered and
// lifted. This gives it the same surface as those, a selection tint in
// place of the bar, and icons in the line style the sidebar uses instead of
// the default glyphs (an italic letter, a hollow square).
//
// Colours come from the playground's CSS custom properties, which live on
// the document root, so the popup follows the light and dark themes without
// knowing about either. Only the playgrounds mount this: the lesson cards'
// editors sit on pages that do not define those properties.

import { Prec } from "@codemirror/state";
import { EditorView } from "@codemirror/view";

/** A 24×24 stroked icon as a CSS mask image. */
function icon(paths: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

const ICONS: Record<string, string> = {
  // table
  type: icon(
    '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 9v12"/>',
  ),
  // view
  namespace: icon(
    '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  ),
  // common table expression
  class: icon(
    '<path d="m12 3 9 4.5-9 4.5-9-4.5L12 3Z"/><path d="m3 12 9 4.5 9-4.5M3 16.5 12 21l9-4.5"/>',
  ),
  // column
  property: icon(
    '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 3v18"/>',
  ),
  keyword: icon('<path d="m16 18 6-6-6-6M8 6l-6 6 6 6"/>'),
  function: icon(
    '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 17c1.8 0 2.6-1 2.6-2.8V10c0-2 1-3.2 3.1-3M8.6 11.2h5.8"/>',
  ),
  // `*`
  constant: icon('<path d="M12 6v12M17.2 9 6.8 15M6.8 9l10.4 6"/>'),
  // a ready-made join condition
  text: icon(
    '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
  ),
};

const SURFACE = {
  backgroundColor: "var(--bg)",
  color: "var(--text, inherit)",
  border: "1px solid var(--border)",
  borderRadius: "8px",
  boxShadow: "var(--sql-popup-shadow, 0 8px 24px rgb(0 0 0 / 0.14))",
} as const;

const iconRules = Object.fromEntries(
  Object.entries(ICONS).map(([type, image]) => [
    `.cm-tooltip.cm-tooltip-autocomplete .cm-completionIcon-${type}::after`,
    { WebkitMaskImage: image, maskImage: image },
  ]),
);

/** Highest precedence: the editor theme and the shared popup sizing both
 *  style some of the same rules, and this is the one that decides how the
 *  popup looks here. */
export const sqlCompletionPopupStyle = Prec.highest(
  EditorView.theme({
    ".cm-tooltip.cm-tooltip-autocomplete": { ...SURFACE, overflow: "hidden" },
    ".cm-tooltip.cm-tooltip-autocomplete > ul": { padding: "4px" },
    ".cm-tooltip.cm-tooltip-autocomplete > ul > li": {
      padding: "3px 8px",
      borderRadius: "5px",
      alignItems: "center",
    },
    ".cm-tooltip.cm-tooltip-autocomplete > ul > li[aria-selected]": {
      backgroundColor: "color-mix(in srgb, var(--primary, var(--ds-blue-500)) 16%, transparent)",
      color: "var(--text, inherit)",
    },
    ".cm-tooltip.cm-completionInfo": { ...SURFACE, padding: "8px 10px" },
    ".cm-tooltip.cm-completionInfo.cm-completionInfo-right": { marginLeft: "6px" },
    ".cm-tooltip.cm-completionInfo.cm-completionInfo-left": { marginRight: "6px" },
    ".cm-tooltip.cm-tooltip-autocomplete .cm-completionIcon": {
      width: "14px",
      padding: "0",
      opacity: "0.7",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
    },
    // One rule draws every icon from its mask; the per-type rules below
    // only say which mask.
    ".cm-tooltip.cm-tooltip-autocomplete .cm-completionIcon::after": {
      content: '""',
      display: "block",
      width: "13px",
      height: "13px",
      backgroundColor: "currentColor",
      WebkitMaskRepeat: "no-repeat",
      maskRepeat: "no-repeat",
      WebkitMaskPosition: "center",
      maskPosition: "center",
      WebkitMaskSize: "contain",
      maskSize: "contain",
    },
    ...iconRules,
  }),
);
