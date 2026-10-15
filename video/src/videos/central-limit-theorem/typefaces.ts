import type React from "react";
import { INTER_OPTICAL } from "./fonts";

export type TypefaceId = "fraunces" | "inter" | "newsreader" | "source-serif" | "playfair";

/**
 * The face for headlines, decks and captions. Labels, figure titles and chart
 * numbers stay in Inter in every variant.
 *
 * Every size in the scenes was set in Fraunces, so each face scales to
 * Fraunces's x-height (measured from each font's own `x`): a 46px headline
 * reads at the same size whichever face draws it. Headline and body scale
 * separately because Newsreader's display cut has a much larger x-height than
 * its text cut. Optical size is left on `auto` except for Fraunces, whose
 * headlines ask for its widest-contrast cut outright.
 */
export type Typeface = {
  family: string;
  headScale: number;
  bodyScale: number;
  headWeight: number;
  headItalicWeight: number;
  headTracking: string;
  headAxes: string;
  bodyAxes: string;
  captionWeight: number;
};

/** σ: of these faces only Inter and Source Serif ship a Greek subset. */
const GREEK = '"Source Serif 4 Variable"';

export const TYPEFACES: Record<TypefaceId, Typeface> = {
  fraunces: {
    family: `"Fraunces Variable", ${GREEK}, Georgia, serif`,
    headScale: 1,
    bodyScale: 1,
    headWeight: 560,
    headItalicWeight: 480,
    headTracking: "-0.022em",
    headAxes: `"opsz" 144, "SOFT" 40, "WONK" 0`,
    bodyAxes: `"SOFT" 50`,
    captionWeight: 430,
  },
  inter: {
    family: `"${INTER_OPTICAL}", "Inter Variable", system-ui, sans-serif`,
    headScale: 0.9,
    bodyScale: 0.9,
    headWeight: 680,
    headItalicWeight: 640,
    headTracking: "-0.02em",
    headAxes: "normal",
    bodyAxes: "normal",
    captionWeight: 470,
  },
  newsreader: {
    family: `"Newsreader Variable", ${GREEK}, Georgia, serif`,
    headScale: 0.93,
    bodyScale: 1.06,
    headWeight: 600,
    headItalicWeight: 520,
    headTracking: "-0.015em",
    headAxes: "normal",
    bodyAxes: "normal",
    captionWeight: 440,
  },
  "source-serif": {
    family: `"Source Serif 4 Variable", Georgia, serif`,
    headScale: 1.03,
    bodyScale: 1,
    headWeight: 640,
    headItalicWeight: 560,
    headTracking: "-0.018em",
    headAxes: "normal",
    bodyAxes: "normal",
    captionWeight: 430,
  },
  playfair: {
    family: `"Playfair Variable", ${GREEK}, Georgia, serif`,
    headScale: 1.12,
    bodyScale: 1.12,
    headWeight: 620,
    headItalicWeight: 520,
    headTracking: "-0.012em",
    headAxes: "normal",
    bodyAxes: "normal",
    captionWeight: 450,
  },
};

/** The custom properties style.ts reads, set once on the composition root. */
export const typefaceVars = (t: Typeface) =>
  ({
    "--clt-serif": t.family,
    "--clt-head-scale": t.headScale,
    "--clt-body-scale": t.bodyScale,
    "--clt-head-wght": t.headWeight,
    "--clt-head-italic-wght": t.headItalicWeight,
    "--clt-head-tracking": t.headTracking,
    "--clt-head-axes": t.headAxes,
    "--clt-body-axes": t.bodyAxes,
  }) as React.CSSProperties;
