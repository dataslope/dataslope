import React from "react";
import { Illustration } from "../../components/Illustration";
import { BAR, INK, INK_SOFT, PAPER } from "../../editorial/style";
import { ds } from "../../theme/brand";
import { type PartKey, VIDEO } from "./data";

/** The unhighlighted skin of the plane: paper, a little darker. */
export const SKIN = `color-mix(in srgb, ${INK} 9%, ${PAPER})`;
/** The part the narration is on: an opaque yellow, so the wing under a
 *  nacelle does not show through. */
export const PART_HI = `color-mix(in srgb, ${ds("yellow", 300)} 55%, ${PAPER})`;

/**
 * Wald's plane, painted: a twin-engine bomber from directly above with the
 * nose up (survivorship-bias-plane, 1024x886 after trimming). His worked
 * example (memo Part V) divides a plane with two engines into the engines,
 * the fuselage, the fuel system and the rest; the memos draw no plane, so
 * the painting gives that example its shape and claims no particular type.
 *
 * The parts a scene lights are traced over the painting in its own pixels,
 * so a part can be washed in yellow or outlined: the two engine nacelles
 * and the fuselage, the two parts the narration names.
 */
const PAINT_W = 1024;
const PAINT_H = 886;
const nacelle = (cx: number) =>
  `M${cx - 36},135 C${cx - 36},112 ${cx - 22},104 ${cx},104 C${cx + 22},104 ${cx + 36},112 ${cx + 36},135 ` +
  `L${cx + 36},215 C${cx + 33},265 ${cx + 14},315 ${cx},340 C${cx - 14},315 ${cx - 33},265 ${cx - 36},215 Z`;
const TRACED: Partial<Record<PartKey, string[]>> = {
  engines: [328, 696].map(nacelle),
  fuselage: [
    "M510,20 C540,20 556,50 560,100 L560,385 C556,520 540,640 530,720 C524,790 518,840 510,862 " +
      "C502,840 496,790 490,720 C480,640 464,520 460,385 L460,100 C464,50 480,20 510,20 Z",
  ],
};
/** A lit part: a yellow wash, multiplied into the paint so the metal shows
 *  through, under a dark outline. The painting is already washed in pale
 *  yellow, so the wash alone does not read. */
const LIT = ds("yellow", 500);

export const Plane: React.FC<{
  /** Centre of the plane, in page px. */
  x: number;
  y: number;
  /** Wingtip to wingtip, in px. */
  width: number;
  /** Degrees clockwise; 90 points the nose right. */
  rotate?: number;
  opacity?: number;
  /** How lit each part is, 0 to 1. */
  lit?: (part: PartKey) => number;
  /** An outline round a part, or none. */
  outline?: (part: PartKey) => { color: string; width: number } | null;
}> = ({ x, y, width, rotate = 0, opacity = 1, lit = () => 0, outline = () => null }) => {
  const height = (width * PAINT_H) / PAINT_W;
  return (
    <div
      style={{
        position: "absolute",
        left: x - width / 2,
        top: y - height / 2,
        width,
        height,
        opacity,
        transform: rotate ? `rotate(${rotate}deg)` : undefined,
      }}
    >
      <Illustration video={VIDEO} id="survivorship-bias-plane" style={{ position: "absolute", inset: 0, width, height }} />
      <svg viewBox={`0 0 ${PAINT_W} ${PAINT_H}`} width={width} height={height} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        {(Object.keys(TRACED) as PartKey[]).flatMap((part) => {
          const a = lit(part);
          const o = outline(part);
          return (TRACED[part] ?? []).map((d, i) => (
            <React.Fragment key={`${part}${i}`}>
              <path d={d} fill={LIT} fillOpacity={0.9 * a} style={{ mixBlendMode: "multiply" }} />
              <path
                d={d}
                fill="none"
                stroke={o?.color ?? INK}
                strokeWidth={o ? o.width : 2.2 * a}
                strokeOpacity={o ? 1 : a}
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            </React.Fragment>
          ));
        })}
      </svg>
    </div>
  );
};

/** A part's share of the plane: a plain gray bar, fill only (the owner,
 *  2026-11-11: no outlines round filled shapes). */
export const AREA_FILL = ds("gray", 300);

/** A small key swatch, sized to the text it sits in. Only "closed" keeps an
 *  outline, a dashed one: there the outline is the meaning (deleted). */
export const Swatch: React.FC<{ kind: "area" | "holes" | "closed" | "open" }> = ({ kind }) => {
  const closed = kind === "closed";
  return (
    <span
      style={{
        display: "inline-block",
        width: "1.1em",
        height: "0.8em",
        boxSizing: "border-box",
        background: closed ? "transparent" : kind === "area" ? AREA_FILL : BAR,
        border: closed ? `1.6px dashed ${INK_SOFT}` : undefined,
      }}
    />
  );
};
