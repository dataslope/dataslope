import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Logo } from "../../components/Logo";
import { ease } from "../../components/motion";
import { Ink, Layer, Letter, rrect } from "./draw";
import { HAND } from "./fonts";
import { BP, SHEET } from "./theme";

const { w: W, h: H, outer: O, inner: I } = SHEET;
const TB = SHEET.titleBlock;

/**
 * The drawing sheet every view is drafted on, and the one thing that never
 * cross-fades: blueprint paper with a fine grid, a double border with zone
 * markers and centering marks, and the title block in the corner. The title
 * block's VIEW cell follows the scene.
 */
export const Paper: React.FC<{ view: string; viewAt: number }> = ({ view, viewAt }) => {
  const frame = useCurrentFrame();
  const border = ease(frame, 0, 22);
  const zones = ease(frame, 10, 16);
  const block = ease(frame, 8, 24);
  const viewIn = ease(frame, viewAt, 12);

  const cols = 8;
  const rows = 4;
  const colW = (W - 2 * I) / cols;
  const rowH = (H - 2 * I) / rows;

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse 85% 80% at 48% 42%, ${BP.paper} 0%, ${BP.paper} 45%, ${BP.paperDeep} 100%)`,
      }}
    >
      {/* The grid: a fine 24px ruling and a heavier line every 120px. */}
      <AbsoluteFill
        style={{
          backgroundImage: [
            `repeating-linear-gradient(0deg, ${BP.gridMajor} 0 1px, transparent 1px 120px)`,
            `repeating-linear-gradient(90deg, ${BP.gridMajor} 0 1px, transparent 1px 120px)`,
            `repeating-linear-gradient(0deg, ${BP.grid} 0 1px, transparent 1px 24px)`,
            `repeating-linear-gradient(90deg, ${BP.grid} 0 1px, transparent 1px 24px)`,
          ].join(", "),
          backgroundPosition: `${I}px ${I}px`,
        }}
      />
      <Layer>
        <Ink d={rrect(O, O, W - 2 * O, H - 2 * O)} p={border} color={BP.line2} width={1.5} />
        <Ink d={rrect(I, I, W - 2 * I, H - 2 * I)} p={border} color={BP.line} width={3} />
        {/* Zone ticks and centering marks between the two border lines. */}
        <g opacity={zones}>
          {Array.from({ length: cols - 1 }, (_, i) => I + colW * (i + 1)).map((x) => (
            <g key={x}>
              <line x1={x} y1={O} x2={x} y2={I} stroke={BP.line2} strokeWidth={1.5} />
              <line x1={x} y1={H - I} x2={x} y2={H - O} stroke={BP.line2} strokeWidth={1.5} />
            </g>
          ))}
          {Array.from({ length: rows - 1 }, (_, i) => I + rowH * (i + 1)).map((y) => (
            <g key={y}>
              <line x1={O} y1={y} x2={I} y2={y} stroke={BP.line2} strokeWidth={1.5} />
              <line x1={W - I} y1={y} x2={W - O} y2={y} stroke={BP.line2} strokeWidth={1.5} />
            </g>
          ))}
          {Array.from({ length: cols }, (_, i) => (
            <g key={i} fontFamily={HAND} fontSize={15} fill={BP.line2} textAnchor="middle">
              <text x={I + colW * (i + 0.5)} y={O + 16}>
                {i + 1}
              </text>
              <text x={I + colW * (i + 0.5)} y={H - O - 5}>
                {i + 1}
              </text>
            </g>
          ))}
          {["A", "B", "C", "D"].map((letter, i) => (
            <g key={letter} fontFamily={HAND} fontSize={15} fill={BP.line2} textAnchor="middle">
              <text x={O + 11} y={I + rowH * (i + 0.5) + 5}>
                {letter}
              </text>
              <text x={W - O - 11} y={I + rowH * (i + 0.5) + 5}>
                {letter}
              </text>
            </g>
          ))}
          {/* Centering arrows, the triangles a printer lines a sheet up by. */}
          <path d={`M ${W / 2 - 9} ${O} L ${W / 2 + 9} ${O} L ${W / 2} ${I - 4} Z`} fill={BP.line2} />
          <path d={`M ${W / 2 - 9} ${H - O} L ${W / 2 + 9} ${H - O} L ${W / 2} ${H - I + 4} Z`} fill={BP.line2} />
          <path d={`M ${O} ${H / 2 - 9} L ${O} ${H / 2 + 9} L ${I - 4} ${H / 2} Z`} fill={BP.line2} />
          <path d={`M ${W - O} ${H / 2 - 9} L ${W - O} ${H / 2 + 9} L ${W - I + 4} ${H / 2} Z`} fill={BP.line2} />
        </g>

        {/* Title block. */}
        <rect x={TB.x} y={TB.y} width={TB.w} height={TB.h} fill={BP.paperDeep} opacity={block * 0.9} />
        <Ink d={rrect(TB.x, TB.y, TB.w, TB.h)} p={block} color={BP.line} width={2.5} />
        <Ink d={`M ${TB.x + 196} ${TB.y} V ${TB.y + TB.h}`} p={block} color={BP.line2} width={1.5} />
        {[1, 2].map((r) => (
          <Ink
            key={r}
            d={`M ${TB.x + 196} ${TB.y + (TB.h / 3) * r} H ${TB.x + TB.w}`}
            p={block}
            color={BP.line2}
            width={1.5}
          />
        ))}
        <Ink d={`M ${TB.x + 372} ${TB.y + (TB.h / 3) * 2} V ${TB.y + TB.h}`} p={block} color={BP.line2} width={1.5} />
      </Layer>

      <div
        style={{
          position: "absolute",
          left: TB.x,
          top: TB.y,
          width: 196,
          height: TB.h,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          opacity: ease(frame, 20, 12),
        }}
      >
        <Logo size={28} tone="light" />
        <span style={{ fontFamily: HAND, fontSize: 13, letterSpacing: "0.12em", color: BP.line2 }}>DRAWN BY</span>
      </div>
      <Cell x={TB.x + 206} y={TB.y + 4} tag="TITLE" value="THE EVENT LOOP" p={ease(frame, 18, 14)} />
      <Cell x={TB.x + 206} y={TB.y + 4 + TB.h / 3} tag="VIEW" value={view} p={Math.min(ease(frame, 22, 14), viewIn)} />
      <Cell x={TB.x + 206} y={TB.y + 4 + (TB.h / 3) * 2} tag="" value="SHEET 1 OF 1" p={ease(frame, 26, 14)} />
      <Cell x={TB.x + 384} y={TB.y + 4 + (TB.h / 3) * 2} tag="" value="REV A" p={ease(frame, 30, 14)} />
    </AbsoluteFill>
  );
};

const Cell: React.FC<{ x: number; y: number; tag: string; value: string; p: number }> = ({ x, y, tag, value, p }) => (
  <>
    {tag ? (
      <Letter x={x} y={y + 2} p={p} size={11} color={BP.line2} spacing="0.14em">
        {tag}
      </Letter>
    ) : null}
    <Letter x={tag ? x + 46 : x} y={y + 8} p={p} size={tag ? 19 : 17} color={BP.white}>
      {value}
    </Letter>
  </>
);
