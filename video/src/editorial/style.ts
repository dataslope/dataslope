import type React from "react";
import { colors, ds, inkOf } from "../theme/brand";
import { SANS } from "../theme/fonts";
import { SERIF } from "./fonts";

/**
 * The palette of a magazine's science pages, built only from brand ramps:
 * a plain white page, the site's near-black ink, one brand blue for data and
 * one red accent for whatever the narration is pointing at. Everything drawn
 * in the page's color (halos, masks, cards that hide what is behind them)
 * reads PAPER, so the page is this one token. Type in a hue reads `inkOf`
 * (theme/brand.ts), which is the brand 500 itself for blue and red.
 */
export const PAPER = colors.page;
export const INK = colors.ink;
export const INK_SOFT = colors.inkSoft;
export const HAIRLINE = `color-mix(in srgb, ${INK} 55%, transparent)`;

export const BAR = ds("blue", 500);
export const ACCENT = ds("red", 500);
export const ACCENT_INK = inkOf.red;
export const BLUE_INK = inkOf.blue;
export const HIGHLIGHT = `color-mix(in srgb, ${ds("yellow", 400)} 80%, transparent)`;

/** Display headlines, in the variant's face (typefaces.ts). Sizes are
 *  written for Fraunces; the face's own scale brings it to the same x-height. */
export const headline = (size: number, italic = false): React.CSSProperties => ({
  fontFamily: SERIF,
  fontSize: `calc(${size}px * var(--ed-head-scale))`,
  fontWeight: italic ? "var(--ed-head-italic-wght)" : "var(--ed-head-wght)",
  fontStyle: italic ? "italic" : "normal",
  fontVariationSettings: "var(--ed-head-axes)",
  lineHeight: 1.02,
  letterSpacing: "var(--ed-head-tracking)",
  // Playfair defaults to old-style figures; numbers in a chart stand level.
  fontVariantNumeric: "lining-nums",
  color: INK,
});

/** Body face: decks, standfirsts, figure notes and chart row titles. */
export const body = (size: number, italic = false): React.CSSProperties => ({
  fontFamily: SERIF,
  fontSize: `calc(${size}px * var(--ed-body-scale))`,
  fontWeight: 400,
  fontStyle: italic ? "italic" : "normal",
  fontVariationSettings: "var(--ed-body-axes)",
  fontVariantNumeric: "lining-nums",
  lineHeight: 1.25,
  color: INK_SOFT,
});

/** Inter semibold in sentence case: kickers, figure numbers and axis
 *  titles. Never tracked capitals, which shout and blur at small sizes. */
export const label = (size = 21, color: string = INK_SOFT): React.CSSProperties => ({
  fontFamily: SANS,
  fontSize: size,
  fontWeight: 650,
  color,
});

/** Inter for annotations and numbers on the charts. Proportional figures:
 *  Inter's tabular feature also sets the hyphen in a digit-wide slot, so
 *  "p-value" read "p - value" in every note while it was on. Give a number
 *  that must not shift as it changes (a counter, a column) TABULAR. */
export const note = (size = 21, color: string = INK): React.CSSProperties => ({
  fontFamily: SANS,
  fontSize: size,
  fontWeight: 500,
  lineHeight: 1.3,
  fontVariantNumeric: "lining-nums",
  color,
});

/**
 * A text style for an SVG <text>. SVG text takes its color from `fill`, not
 * CSS `color`, so label() or note() on its own draws SVG text black whatever
 * color it names: it made Statistics' z and t cutoffs all black. svgText()
 * carries the style's color over to `fill`. Only for SVG text: `fill` is
 * inherited, so on an HTML element it would recolor any icon inside it.
 * `src/editorial/svgText.test.ts` fails on SVG text styled without one.
 */
export const svgText = (style: React.CSSProperties): React.CSSProperties => ({ ...style, fill: style.color });

/** Digits of one width, for a number that counts or a column of numbers.
 *  Only on the digits: it spaces out a hyphen in Inter (see note()). */
export const TABULAR: React.CSSProperties = { fontVariantNumeric: "tabular-nums lining-nums" };

/** A paper-colored halo, for a label that sits close to bars or a curve. */
export const halo: React.CSSProperties = {
  textShadow: [
    `0 0 3px ${PAPER}`,
    `0 0 6px ${PAPER}`,
    `1px 1px 0 ${PAPER}`,
    `-1px -1px 0 ${PAPER}`,
    `1px -1px 0 ${PAPER}`,
    `-1px 1px 0 ${PAPER}`,
  ].join(", "),
};

/** "9.90", "2,000": the way numbers are set on screen. */
export const fmt = (x: number, digits = 2) =>
  x.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
