import React, { useId } from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Illustration } from "../../components/Illustration";
import { bob, ease, pop } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, headline, INK, INK_SOFT, label, note } from "../../editorial/style";
import { H, Ink, Note, W } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { BOX, CONTENT_BOX, ILLUSTRATIONS, NEED, OVER, ROW, VIDEO } from "./data";
import { arrowHead, BoxDrawing, Dim, DimLabel, Fig, Listing, Mono } from "./kit";
import { CODE, column, Column, LINES, LIST_TOP, LIST_W, ROW_X, RowFrame, rowGeometry, span } from "./row";

const NOTES_X = 1310;

/**
 * Columns and overflow: two `width: 50%` columns in a 600px row. Their
 * content alone fills the row; padding and border push the pair to 700px, and
 * the second column wraps onto a line of its own, where Chromium put it.
 */
export const ColumnsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = useNarration();
  const layout = useLayout();
  const { y } = layout;
  const g = rowGeometry(layout);

  const start = n.beat("columns").from;
  const twoAt = n.word("columns", "two columns");
  const rowAt = n.word("overflow", "six hundred pixel row");
  const pctAt = n.word("overflow", "fifty percent");
  const withAt = n.word("overflow", "With padding and border");
  const eachAt = n.word("overflow", "three hundred and fifty");
  const sevenAt = n.word("overflow", "seven hundred");
  const wrapsAt = n.word("overflow", "wraps");
  const lineAt = n.word("overflow", "next line");

  const [first, second] = CONTENT_BOX.cols;
  const [c1, c2] = g.contentBox;
  // The contents first, side by side; then padding and border grow round them.
  const contents = ease(frame, pctAt - 4, 14);
  const grown = ease(frame, withAt - 2, 22);
  const ring = (g.pad + g.border) * grown;
  // Then the second column wraps: down onto the next line, then back to the
  // row's left edge, which is where Chromium placed it (x 0, line 2).
  const wrap = ease(frame, wrapsAt - 4, 30);
  const drop = interpolate(wrap, [0, 0.5], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const slide = interpolate(wrap, [0.5, 1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const width1 = c1.content + 2 * ring;
  const shape1 = column(g, ROW_X, g.top, c1.content);
  shape1.content = { ...shape1.content, x: ROW_X + ring, y: g.top + ring };
  const besideX = ROW_X + width1;
  const x2 = besideX + (c2.x - besideX) * slide;
  const top2 = g.top + second.line * g.colH * drop;
  const shape2 = column(g, x2, top2, c2.content);
  shape2.content = { ...shape2.content, x: x2 + ring, y: top2 + ring };

  const lineH = g.contentH + 2 * ring;
  const frameH = lineH + (CONTENT_BOX.lines - 1) * g.colH * drop;
  const rowIn = ease(frame, rowAt - 4, 14);
  const rowRight = ROW_X + g.width;
  const ghostRight = ROW_X + 2 * c1.w;

  // From where the second column would have gone to where it went: down,
  // then left, ending on its right edge.
  const p0: [number, number] = [ROW_X + c1.w + c1.w / 2, g.top + g.colH + 10];
  const p3: [number, number] = [c2.x + c2.w + 16, g.top + g.colH + g.colH / 2];
  const k1: [number, number] = [p0[0], p3[1]];
  const k2: [number, number] = [p3[0] + 110, p3[1]];
  const trail = ease(frame, wrapsAt + 10, 18);
  const art = pop(frame, twoAt - 4, fps, 16);

  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 116, top: y(104), display: "flex", gap: "0.26em", ...headline(56) }}>
        <Ink at={start - 14} dur={20} style={{ position: "relative", whiteSpace: "nowrap" }}>
          Two {ROW.pct}% columns
        </Ink>
        <Ink
          at={wrapsAt - 2}
          dur={18}
          style={{ position: "relative", ...headline(56, true), color: ACCENT_INK, whiteSpace: "nowrap" }}
        >
          don&apos;t fit in one row.
        </Ink>
      </div>
      <Fig n="3" at={start - 8} x={ROW_X} y={y(196)}>
        Two columns at <Mono>{`width: ${ROW.pct}%`}</Mono> in a {ROW.width}px row that wraps
      </Fig>
      <Listing
        lines={LINES}
        x={ROW_X}
        top={y(LIST_TOP)}
        width={LIST_W}
        size={CODE}
        at={start - 6}
        lineAt={[start - 2, twoAt]}
        marks={[
          { ...span(0, `width: ${ROW.width}px;`), at: rowAt - 2, out: pctAt + 10 },
          { ...span(1, `width: ${ROW.pct}%;`), at: pctAt - 2, out: withAt - 2 },
          { ...span(1, `padding: ${BOX.padding}px; border: ${BOX.border}px solid;`), at: withAt, out: sevenAt },
          { ...span(0, "flex-wrap: wrap;"), at: wrapsAt - 2 },
        ]}
      />

      <RowFrame g={g} height={frameH} opacity={rowIn} />
      <Dim x0={ROW_X} x1={rowRight} y={g.top - 26} at={rowAt}>
        <DimLabel value={String(ROW.width)}>the row</DimLabel>
      </Dim>

      {/* Where the second column would have to go, once it has left. */}
      {wrap > 0 ? (
        <BoxDrawing shape={column(g, besideX, g.top, c2.content)} ghost opacity={Math.min(1, wrap * 3) * 0.9} />
      ) : null}

      {contents > 0 ? (
        <>
          <Column shape={shape1} layers={grown} opacity={contents} value={first.content} />
          <Column shape={shape2} layers={grown} opacity={contents} value={second.content} />
        </>
      ) : null}

      {/* Past the row's right edge: what does not fit. */}
      <Overflow
        x0={rowRight}
        x1={ghostRight}
        top={g.top}
        height={g.colH}
        at={sevenAt - 2}
        out={wrapsAt}
      />
      <Dim x0={rowRight} x1={ghostRight} y={g.top - 26} at={sevenAt + 4} color={ACCENT_INK}>
        <DimLabel value={String(OVER)} color={ACCENT_INK}>
          over
        </DimLabel>
      </Dim>

      {/* Under line 1, before the second column lands there. */}
      <Dim x0={ROW_X} x1={ROW_X + c1.w} y={g.top + g.colH + 26} at={eachAt} out={sevenAt - 4} side="below">
        <DimLabel value={String(first.width)} />
      </Dim>
      <Dim x0={ROW_X + c1.w} x1={ghostRight} y={g.top + g.colH + 26} at={eachAt + 6} out={sevenAt - 4} side="below">
        <DimLabel value={String(second.width)} />
      </Dim>
      <Dim
        x0={ROW_X}
        x1={ghostRight}
        y={g.top + g.colH + 26}
        at={sevenAt - 2}
        out={wrapsAt - 6}
        side="below"
        color={ACCENT_INK}
      >
        <DimLabel value={String(NEED)} color={ACCENT_INK}>
          for the two side by side
        </DimLabel>
      </Dim>

      {trail > 0 ? (
        <svg width={W} height={H} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          <path
            d={`M${p0[0]},${p0[1]} C${k1[0]},${k1[1]} ${k2[0]},${k2[1]} ${p3[0]},${p3[1]}`}
            fill="none"
            stroke={INK_SOFT}
            strokeWidth={2.5}
            strokeLinecap="round"
            pathLength={1}
            strokeDasharray={`${trail} 1`}
          />
          <path
            d={arrowHead(p3, k2)}
            fill="none"
            stroke={INK_SOFT}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={ease(frame, wrapsAt + 24, 6)}
          />
        </svg>
      ) : null}
      <Note at={lineAt + 4} x={(p3[0] + p0[0]) / 2} y={p3[1] + 14} style={{ transform: "translateX(-50%)" }}>
        <span style={{ ...note(21, INK_SOFT), whiteSpace: "nowrap" }}>onto line 2</span>
      </Note>

      {/* The arithmetic, beside the figure. */}
      <Note at={eachAt - 2} x={NOTES_X} y={g.top}>
        <div style={{ ...label(22, INK) }}>Each column</div>
        <div style={{ ...note(22, INK_SOFT), marginTop: 8, whiteSpace: "nowrap" }}>
          {first.content} + {2 * BOX.padding} + {2 * BOX.border} = <b style={{ color: INK }}>{first.width}px</b>
        </div>
      </Note>
      <Note at={sevenAt} x={NOTES_X} y={g.top + 98}>
        <div style={{ ...label(22, INK) }}>Side by side</div>
        <div style={{ ...note(22, INK_SOFT), marginTop: 8, whiteSpace: "nowrap" }}>
          {first.width} + {second.width} = <b style={{ color: ACCENT_INK }}>{NEED}px</b>, in a {ROW.width}px row
        </div>
      </Note>

      {ILLUSTRATIONS ? (
        <Illustration
          video={VIDEO}
          id="box-sizing-shelf"
          style={{
            position: "absolute",
            left: 1330,
            top: y(720),
            width: 460,
            height: 206,
            opacity: art,
            transform: `translateY(${bob(frame + 30, 4, 100) + (1 - art) * 24}px)`,
          }}
        />
      ) : null}
    </AbsoluteFill>
  );
};

/** The part of the second column past the row's edge, tinted, with the
 *  edge itself drawn as a red rule. */
const Overflow: React.FC<{ x0: number; x1: number; top: number; height: number; at: number; out: number }> = ({
  x0,
  x1,
  top,
  height,
  at,
  out,
}) => {
  const frame = useCurrentFrame();
  const hatch = useId().replace(/:/g, "");
  const p = ease(frame, at, 10) * (1 - ease(frame, out, 12));
  if (p <= 0) return null;
  return (
    <svg width={W} height={H} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: p }}>
      <defs>
        <pattern id={hatch} width={12} height={12} patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
          <line x1={0} y1={0} x2={0} y2={12} stroke={ACCENT} strokeWidth={3} />
        </pattern>
      </defs>
      <rect x={x0} y={top} width={x1 - x0} height={height} fill={`url(#${hatch})`} opacity={0.75} />
      <line x1={x0} x2={x0} y1={top - 12} y2={top + height + 12} stroke={ACCENT} strokeWidth={3} strokeDasharray="8 5" />
    </svg>
  );
};
