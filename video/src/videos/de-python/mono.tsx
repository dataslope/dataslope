import React from "react";
import { MONO } from "../../theme/fonts";

/**
 * Code inside a line of type, as the DA pandas kit's Mono (which parts.tsx
 * re-exports for the Backend code-review video too, so it stays as it is
 * there), but at 0.92em: within the 12% a line's sizes may differ by
 * (README, "One line, one size, one family"), and never under 19px.
 */
export const Mono: React.FC<{ children: React.ReactNode; color?: string; weight?: number }> = ({ children, color, weight }) => (
  <span style={{ fontFamily: MONO, fontSize: "max(19px, 0.92em)", fontStyle: "normal", fontWeight: weight ?? 600, color, fontVariantLigatures: "none", wordSpacing: "-0.3em" }}>
    {children}
  </span>
);
