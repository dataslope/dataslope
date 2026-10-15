import type React from "react";
import { colors, ds } from "../../theme/brand";
import { SANS } from "../../theme/fonts";
import { SERIF } from "./fonts";

/**
 * The palette of a magazine's science pages, built only from brand ramps:
 * warm paper, a warm near-black ink, one brand blue for data and one red
 * accent for whatever the narration is pointing at.
 */
export const PAPER = `color-mix(in srgb, ${ds("yellow", 100)} 58%, ${colors.page})`;
export const INK = `color-mix(in srgb, ${ds("gray", 900)} 86%, ${ds("yellow", 900)})`;
export const INK_SOFT = `color-mix(in srgb, ${ds("gray", 600)} 80%, ${ds("yellow", 800)})`;
export const HAIRLINE = `color-mix(in srgb, ${INK} 55%, transparent)`;

export const BAR = ds("blue", 500);
export const ACCENT = ds("red", 500);
export const ACCENT_INK = "var(--ds-red-ink)";
export const BLUE_INK = "var(--ds-blue-ink)";
export const HIGHLIGHT = `color-mix(in srgb, ${ds("yellow", 400)} 80%, transparent)`;

/** Display headlines: Fraunces at its largest optical size. */
export const headline = (size: number, italic = false): React.CSSProperties => ({
  fontFamily: SERIF,
  fontSize: size,
  fontWeight: italic ? 480 : 560,
  fontStyle: italic ? "italic" : "normal",
  fontVariationSettings: `"opsz" 144, "SOFT" 40, "WONK" 0`,
  lineHeight: 1.02,
  letterSpacing: "-0.022em",
  color: INK,
});

/** Body serif: decks, standfirsts and the lower-third captions. */
export const body = (size: number, italic = false): React.CSSProperties => ({
  fontFamily: SERIF,
  fontSize: size,
  fontWeight: 400,
  fontStyle: italic ? "italic" : "normal",
  fontVariationSettings: `"opsz" ${Math.min(72, size)}, "SOFT" 50`,
  lineHeight: 1.25,
  color: INK_SOFT,
});

/** Inter small caps: kickers, figure labels and axis titles. */
export const smallCaps = (size = 17, color: string = INK_SOFT): React.CSSProperties => ({
  fontFamily: SANS,
  fontSize: size,
  fontWeight: 650,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color,
});

/** Inter for annotations and numbers on the charts. */
export const note = (size = 21, color: string = INK): React.CSSProperties => ({
  fontFamily: SANS,
  fontSize: size,
  fontWeight: 500,
  lineHeight: 1.3,
  fontVariantNumeric: "tabular-nums lining-nums",
  color,
});

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
