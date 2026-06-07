import type { ReactNode } from "react";

/** Frame width presets (see illustrations.module.css). */
export type IllustrationSize = "sm" | "md" | "lg" | "full";

export interface IllustrationEntry {
  /**
   * Accessible description. Rendered as the SVG's `<title>` and `aria-label`
   * — it is NOT drawn on the page. This is how an illustration stays
   * text-free visually while remaining meaningful to screen readers and
   * search, so write it as a short, plain-language summary of the graphic.
   */
  label: string;
  /** Default frame width when the author doesn't pass `size`. */
  size?: IllustrationSize;
  /** The SVG user-space, e.g. `"0 0 400 240"`. */
  viewBox: string;
  /** The inner SVG nodes (the wrapper owns the `<svg>` element itself). */
  render: () => ReactNode;
}

export type IllustrationRegistry = Record<string, IllustrationEntry>;
