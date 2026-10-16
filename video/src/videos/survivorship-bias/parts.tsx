import React from "react";
import { BAR, INK, INK_SOFT, PAPER } from "../../editorial/style";
import { ds } from "../../theme/brand";
import type { PartKey } from "./data";

/** The unhighlighted skin of the plane: paper, a little darker. */
export const SKIN = `color-mix(in srgb, ${INK} 9%, ${PAPER})`;
/** The part the narration is on: an opaque yellow, so the wing under a
 *  nacelle does not show through. */
export const PART_HI = `color-mix(in srgb, ${ds("yellow", 400)} 62%, ${PAPER})`;

/**
 * A twin-engine plane seen from above, nose up, in units centred on the wing
 * root: about 252 wide and 205 long. Each path belongs to one of the four
 * parts Wald's worked example divides a plane into (two engines, fuselage,
 * fuel system, everything else), so a scene can colour them separately. A
 * schematic, not a scale drawing: the areas that matter are Wald's, in the
 * figure beside it.
 */
const mirror = (d: string) => d.replace(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g, (_, x, y) => `${-Number(x)},${y}`);
const both = (d: string) => [d, mirror(d)];

const WING = "M13,-26 L118,-19 Q126,-18 126,-10 Q126,-3 118,-2 L13,12 Z";
const STABILIZER = "M5,80 L46,83 Q52,84 52,89 Q52,94 46,94 L5,96 Z";
const FIN = "M49,78 Q49,73 52,73 Q55,73 55,78 L55,98 Q55,102 52,102 Q49,102 49,98 Z";
const INNER_TANK = "M21,-21 L33,-21 Q36,-21 36,-18 L36,4 Q36,7 33,7 L21,7 Q18,7 18,4 L18,-18 Q18,-21 21,-21 Z";
const OUTER_TANK = "M69,-16 L95,-15 Q98,-15 98,-12 L98,-5 Q98,-2 95,-2 L69,-1 Q66,-1 66,-4 L66,-13 Q66,-16 69,-16 Z";
const NACELLE = "M40,-48 C40,-56 44,-58 50,-58 C56,-58 60,-56 60,-48 L60,4 C60,14 55,24 50,30 C45,24 40,14 40,4 Z";
const FUSELAGE =
  "M0,-104 C9,-104 13,-94 13,-76 L13,22 C13,52 8,84 5,100 L-5,100 C-8,84 -13,52 -13,22 L-13,-76 C-13,-94 -9,-104 0,-104 Z";

/** Drawn in this order, so nacelles and the body sit over the wings. */
export const PLANE: readonly { part: PartKey; d: string }[] = [
  ...[...both(WING), ...both(STABILIZER), ...both(FIN)].map((d) => ({ part: "other" as const, d })),
  ...[...both(INNER_TANK), ...both(OUTER_TANK)].map((d) => ({ part: "fuel" as const, d })),
  ...both(NACELLE).map((d) => ({ part: "engines" as const, d })),
  { part: "fuselage", d: FUSELAGE },
];

/** Glazing and props: drawn lines, not parts. */
const DETAILS = ["M-10,-86 Q0,-93 10,-86", "M-6,-70 Q0,-74 6,-70 L6,-56 Q0,-53 -6,-56 Z"];
const PROPS = [50, -50].flatMap((x) => [`M${x - 22},-60 L${x + 22},-60`, `M${x - 4},-59 Q${x},-67 ${x + 4},-59`]);

export type PartStyle = { fill: string; stroke: string; width: number; dash?: string; opacity?: number };

/** The plane at (x, y), `scale` px per unit, turned `rotate` degrees (90
 *  points the nose right). Strokes keep their px width at any scale. */
export const Plane: React.FC<{
  x: number;
  y: number;
  scale: number;
  rotate?: number;
  style: (part: PartKey) => PartStyle;
  /** Colour of the glazing and props; "none" leaves them out, for a plane
   *  drawn too small to show them. */
  detail?: string;
  opacity?: number;
}> = ({ x, y, scale, rotate = 0, style, detail = INK_SOFT, opacity = 1 }) => (
  <g transform={`translate(${x},${y}) rotate(${rotate}) scale(${scale})`} opacity={opacity}>
    {PLANE.map(({ part, d }, i) => {
      const s = style(part);
      return (
        <path
          key={i}
          d={d}
          fill={s.fill}
          stroke={s.stroke}
          strokeWidth={s.width}
          strokeDasharray={s.dash}
          strokeLinejoin="round"
          opacity={s.opacity}
          vectorEffect="non-scaling-stroke"
        />
      );
    })}
    {(detail === "none" ? [] : [...DETAILS, ...PROPS]).map((d, i) => (
      <path
        key={`d${i}`}
        d={d}
        fill="none"
        stroke={detail}
        strokeWidth={i < DETAILS.length ? 1.2 : 2.2}
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    ))}
  </g>
);

/** A small key swatch, sized to the text it sits in. */
export const Swatch: React.FC<{ kind: "area" | "holes" | "closed" | "open" }> = ({ kind }) => {
  const outline = kind === "area" || kind === "closed";
  return (
    <span
      style={{
        display: "inline-block",
        width: "1.1em",
        height: "0.8em",
        boxSizing: "border-box",
        background: outline ? "transparent" : BAR,
        border: outline ? `1.6px ${kind === "closed" ? "dashed" : "solid"} ${INK_SOFT}` : undefined,
      }}
    />
  );
};
