// Every pixel value the video shows. Measured, not assumed: measure.mjs lays
// the boxes out in Chromium with Playwright and reads them back with
// getBoundingClientRect() and getComputedStyle(); measurements.json is its
// output, read here. Pure (no Remotion, no DOM).
import M from "./measurements.json";

export const VIDEO = "box-sizing";

/**
 * Whether public/images/box-sizing/ holds the two watercolors from
 * illustrations.json. Set it to true once `npm run illustrations --
 * box-sizing` has written both WebPs. Every frame is laid out with room for
 * them either way.
 */
export const ILLUSTRATIONS = true;

/** "Chromium 141", the browser every number was read from. */
export const BROWSER = M.browser.replace(/^(Chromium \d+).*$/, "$1");

const px = (v: string) => parseFloat(v);

/** The box of Fig. 1 and Fig. 2: `width: 300px; padding: 20px; border: 5px
 *  solid; margin: 20px`, with no box-sizing declared. */
export const BOX = {
  /** What `width` computes to: the number the stylesheet asked for. */
  width: px(M.single.computedWidth),
  padding: M.single.padding,
  border: M.single.border,
  margin: M.single.margin,
  /** The content box, read off a child that fills it. */
  content: M.single.content.width,
  contentHeight: M.single.content.height,
  /** The border box: what getBoundingClientRect() reports. */
  rendered: M.single.rect.width,
  /** The box-sizing a box gets when the stylesheet says nothing. */
  boxSizing: M.single.boxSizing,
};

/** The sum the narration reads out, left to right across the box:
 *  border, padding, content, padding, border. */
export const TERMS = [
  { value: BOX.border, layer: "border" },
  { value: BOX.padding, layer: "padding" },
  { value: BOX.content, layer: "content" },
  { value: BOX.padding, layer: "padding" },
  { value: BOX.border, layer: "border" },
] as const;
/** Equal to BOX.rendered: the sum and the browser agree. */
export const TERMS_SUM = TERMS.reduce((a, t) => a + t.value, 0);

/** The layers of #one, sampled from a screenshot: content and padding paint
 *  the box's background, the margin shows the page behind it. */
export const PAINT = M.paint;

// ── Two columns in a row ──

const wrap = M.rows.flexWrap;
const fixed = M.rows.flexWrapBorderBox;

type Col = (typeof wrap.cols)[number];
/** A measured column, with the layout line it landed on. */
const placed = (c: Col) => ({
  x: c.x,
  line: Math.round(c.y / c.height),
  width: c.width,
  height: c.height,
  content: c.contentWidth,
  /** What `width` computes to. */
  declared: px(c.computedWidth),
  boxSizing: c.boxSizing,
});

export const ROW = {
  width: wrap.width,
  /** `width: 50%`, recovered from what it computed to. */
  pct: Math.round((px(wrap.cols[0].computedWidth) / wrap.width) * 100),
  /** The columns' content height: the column less its padding and border. */
  contentHeight: wrap.cols[0].height - 2 * (BOX.padding + BOX.border),
};

/** Under the default content-box: 350px each, the second on line 2. */
export const CONTENT_BOX = {
  cols: wrap.cols.map(placed),
  height: wrap.height,
  lines: Math.round(wrap.height / wrap.cols[0].height),
};
/** What the two would need side by side, and how far past the row that is. */
export const NEED = CONTENT_BOX.cols.reduce((a, c) => a + c.width, 0);
export const OVER = NEED - ROW.width;

/** Under border-box: 300px each, side by side, filling the row. */
export const BORDER_BOX = {
  cols: fixed.cols.map(placed),
  height: fixed.height,
  lines: Math.round(fixed.height / fixed.cols[0].height),
};
export const FILLED = BORDER_BOX.cols.reduce((a, c) => a + c.width, 0);

/** Floats wrap the same way; a flex row that does not wrap shrinks the two
 *  columns instead (measure.mjs reads both; the video shows the wrapping row). */
export const FLOATS_WRAP = M.rows.float.cols[1].y > 0;

/** `*, *::before, *::after { box-sizing: border-box }`, read back. */
export const UNIVERSAL = M.universalRule;
