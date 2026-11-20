import React from "react";
import { type Layout } from "../../editorial/layout";

/**
 * What the two pages of the rapid round share: the list's geometry, and a
 * row's label, which is the question as it is read aloud (in the page's
 * spelling), wrapped over two lines where it needs them.
 */

/** The list's left edge, width and row height; the answers' left edge. */
export const LIST_X = 120;
export const LIST_W = 740;
export const ROW = 82;
/** The hairline between the list and the answers. */
export const RULE_X = 902;
export const R_X = 950;
/** The label's own width: the list's, less the tick, the number and gaps. */
const LABEL_W = LIST_W - 84;

/** A question as its row shows it: the words read, wrapped within the row. */
export const Q: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span style={{ display: "block", width: LABEL_W, whiteSpace: "normal", lineHeight: 1.25 }}>{children}</span>
);

/** A cue lookup and the page's scales, handed to each answer. */
export type Ctx = { w: (beat: string, phrase: string, opts?: { nth?: number }) => number; y: Layout["y"]; h: Layout["h"]; top: number };
