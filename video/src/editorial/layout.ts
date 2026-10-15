import { createContext, useContext } from "react";

/**
 * The page's vertical layout. Every scene is drawn for a page that keeps its
 * bottom ~130px for the captions. Without captions, the same drawing is
 * stretched down into that space: positions through `y`, heights (bars,
 * chart units, table rows) through `h`. Type sizes and x positions never
 * change, so the charts get taller and the gaps wider, and nothing reflows.
 */
export type Layout = {
  y: (v: number) => number;
  h: (v: number) => number;
  pts: <P extends readonly [number, number]>(points: readonly P[]) => [number, number][];
};

/** The top of the content; it stays put. */
const TOP = 104;
/** How much taller the content runs without captions: the lowest marks move
 *  from about 905 to about 1015 (before the page's 24px lift). */
const STRETCH = 1.14;

export const layoutFor = (captions: boolean): Layout => {
  const k = captions ? 1 : STRETCH;
  const y = (v: number) => TOP + (v - TOP) * k;
  return { y, h: (v) => v * k, pts: (points) => points.map(([x, v]) => [x, y(v)]) };
};

export const LayoutContext = createContext<Layout>(layoutFor(true));
export const useLayout = () => useContext(LayoutContext);
