import React from "react";
import { Img, staticFile } from "remotion";
import { colors } from "../theme/brand";
import { SANS } from "../theme/fonts";

/** The Dataslope mark and wordmark. The mark is the site's own SVG
 *  (public/logo-files/SVG), copied into public/brand/. */
export const Logo: React.FC<{
  size?: number;
  tone?: "dark" | "light";
  style?: React.CSSProperties;
}> = ({ size = 44, tone = "dark", style }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: size * 0.3,
      ...style,
    }}
  >
    <Img
      src={staticFile(
        tone === "dark"
          ? "brand/dataslope-logo-blue.svg"
          : "brand/dataslope-logo-white.svg",
      )}
      alt=""
      style={{ height: size, width: "auto" }}
    />
    <span
      style={{
        fontFamily: SANS,
        fontWeight: 800,
        fontSize: size * 0.82,
        letterSpacing: "-0.02em",
        color: tone === "dark" ? colors.ink : colors.page,
      }}
    >
      Dataslope
    </span>
  </div>
);
