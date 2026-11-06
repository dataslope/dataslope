import React from "react";
import { MONO } from "../../theme/fonts";

/**
 * Code inside a line of prose or a question, in the mono face at 0.92em:
 * within the 12% a line's sizes may differ by (`check:frames`, `[mixed]`),
 * where the 0.88em of da-pandas' `Mono` and the 0.84em of the interview
 * kit's `QMono` are not. Both of those are shared with other videos, so this
 * video takes its own. Never under the house floor of 19px.
 */
const style = (color?: string, weight = 600): React.CSSProperties => ({
  fontFamily: MONO,
  fontSize: "max(19px, 0.92em)",
  fontStyle: "normal",
  fontWeight: weight,
  color,
  fontVariantLigatures: "none",
  wordSpacing: "-0.3em",
});

/** Code in a line of prose, in `color` if given. */
export const Mono: React.FC<{ children: React.ReactNode; color?: string; weight?: number }> = ({ children, color, weight }) => (
  <span style={style(color, weight)}>{children}</span>
);

/** Code inside a question or a list label, in the text's own color. */
export const QMono: React.FC<{ children: React.ReactNode }> = ({ children }) => <span style={style()}>{children}</span>;
