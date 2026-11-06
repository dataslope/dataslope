import type { Pt } from "../../components/arrow";
import type { Rect } from "./parts";

/**
 * The shortener's diagram (system-design.mdx's mermaid, drawn top to bottom):
 * a client, a load balancer, two stateless app servers, and the cache and the
 * key-value store the app tier reads, cache-aside. Question three draws it and
 * Question four takes it apart, so both read their boxes from here. Every
 * position is in screen pixels; `y` is the layout's (useLayout().y).
 */
export const diagramBoxes = (y: (v: number) => number) => ({
  client: { cx: 960, cy: y(312), w: 170, h: 62 },
  lb: { cx: 960, cy: y(424), w: 230, h: 64 },
  app1: { cx: 700, cy: y(546), w: 250, h: 82 },
  app2: { cx: 1220, cy: y(546), w: 250, h: 82 },
  cache: { cx: 960, cy: y(668), w: 170, h: 64 },
  store: { cx: 960, cy: y(792), w: 250, h: 64 },
});

/** The two columns Question four sorts everything into: one per zone. */
export const COL_A = 700;
export const COL_B = 1220;
/** Where the app servers' lines to the store run, outside everything else. */
export const SIDE_A = 520;
export const SIDE_B = 1400;

/** A line from `a`'s outer side, along `x`, into `b`'s outer side: an app
 *  server's line to the store, kept clear of the cache between them. */
export const sideRoute = (a: Rect, b: Rect, x: number, gap = 8): Pt[] => {
  const left = x < a.cx;
  const ax = left ? a.cx - a.w / 2 - gap : a.cx + a.w / 2 + gap;
  const bx = left ? b.cx - b.w / 2 - gap : b.cx + b.w / 2 + gap;
  return [
    [ax, a.cy],
    [x, a.cy],
    [x, b.cy],
    [bx, b.cy],
  ];
};

/** A box moved horizontally to `cx`. */
export const at = (r: Rect, cx: number): Rect => ({ ...r, cx });
