import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { Pt } from "../../components/arrow";
import { ease } from "../../components/motion";
import { Tick } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { BLUE_INK, HIGHLIGHT, INK, INK_SOFT, PAPER, note } from "../../editorial/style";
import { NextLine, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ESTIMATE } from "./data";
import { ART, Arrow, Drift, Headline, int, Kicker, Line, Mark, OK, OK_INK, sig, Spot, X0 } from "./parts";

/** The finished design in miniature: two zones of four boxes, every box
 *  green, and above them the client reaching them through Question five's
 *  edge. Only the edge is labelled: the rest is Question four's picture. */
const MiniDesign: React.FC<{ at: number; y: (v: number) => number }> = ({ at, y }) => {
  const frame = useCurrentFrame();
  const cols = [260, 560];
  const rows = [y(380), y(450), y(520), y(590)];
  const w = 150;
  const h = 44;
  const client = { x: 300, y: y(300) };
  const edge = { x: 470, y: y(300) };
  const fill = `color-mix(in srgb, ${OK} 12%, ${PAPER})`;
  const edges: Pt[][] = [
    [
      [client.x + 50 + 6, client.y],
      [edge.x - 50 - 6, edge.y],
    ],
    [
      [edge.x - 30, edge.y + 18 + 4],
      [cols[0] + 20, rows[0] - h / 2 - 8],
    ],
    [
      [cols[0], rows[0] + h / 2 + 6],
      [cols[0], rows[1] - h / 2 - 6],
    ],
    [
      [cols[0] + w / 2 + 4, rows[0] + 14],
      [cols[1] - w / 2 - 6, rows[1] - 12],
    ],
    [
      [cols[0], rows[1] + h / 2 + 6],
      [cols[0], rows[2] - h / 2 - 6],
    ],
    [
      [cols[1], rows[1] + h / 2 + 6],
      [cols[1], rows[2] - h / 2 - 6],
    ],
    [
      [cols[0] + w / 2 + 6, rows[2]],
      [cols[1] - w / 2 - 6, rows[2]],
    ],
    [
      [cols[0] + w / 2 + 6, rows[3]],
      [cols[1] - w / 2 - 6, rows[3]],
    ],
  ];
  return (
    <>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: ease(frame, at + 6, 14) }}>
        {cols.map((cx) => (
          <rect key={cx} x={cx - w / 2 - 24} y={rows[0] - h / 2 - 22} width={w + 48} height={rows[3] - rows[0] + h + 44} rx={18} fill="none" stroke={INK_SOFT} strokeWidth={1.8} strokeDasharray="8 6" />
        ))}
      </svg>
      {cols.flatMap((cx, c) =>
        rows.map((cy, r) => {
          const p = ease(frame, at + c * 3 + r * 2, 12);
          const standby = c === 1 && r === 0;
          return (
            <div
              key={`${c}${r}`}
              style={{
                position: "absolute",
                left: cx - w / 2,
                top: cy - h / 2,
                width: w,
                height: h,
                boxSizing: "border-box",
                border: `2.2px ${standby ? "dashed" : "solid"} ${OK}`,
                borderRadius: 8,
                background: fill,
                opacity: p,
                transform: `scale(${0.9 + 0.1 * p})`,
              }}
            />
          );
        }),
      )}
      <div
        style={{
          position: "absolute",
          left: client.x - 50,
          top: client.y - 18,
          width: 100,
          height: 36,
          boxSizing: "border-box",
          border: `2.2px solid ${INK_SOFT}`,
          borderRadius: 5,
          opacity: ease(frame, at, 12),
        }}
      />
      <div
        style={{
          position: "absolute",
          left: edge.x - 50,
          top: edge.y - 18,
          width: 100,
          height: 36,
          boxSizing: "border-box",
          border: `2.2px solid ${OK}`,
          borderRadius: 5,
          background: fill,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          ...note(20, OK_INK),
          fontWeight: 500,
          opacity: ease(frame, at + 3, 12),
        }}
      >
        edge
      </div>
      {edges.map((pts, i) => (
        <Arrow key={i} points={pts} at={at + 8 + i * 2} dur={10} head={9} width={2} color={INK} />
      ))}
    </>
  );
};

/**
 * The close: the first design, sized for its estimate (35,000 redirects a
 * second, which Part 2 opens on) and with no single point of failure, drawn
 * small and green behind its edge; then the bridge into Part 2, ten times
 * that traffic on a row of its own, so the design's own size stays as it was. The crow looks along its signpost to
 * what comes next.
 */
export const NextScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  const from = n.beat("next").from;
  const firstAt = n.word("next", "That's a first design");
  const sizedAt = n.word("next", "sized for its estimate");
  const noneAt = n.word("next", "no single machine can take it down");
  const tenAt = n.word("next-10x", "ten times the traffic");
  const nextAt = n.word("next-10x", "Next: scaling a design");
  const end = n.beat("next-10x").to;

  const peak = sig(ESTIMATE.peakReadQps);
  const ten = ease(frame, tenAt, 12);
  const textX = 800;
  const crowW = 420;
  const crowH = Math.round((crowW * ART.crow[1]) / ART.crow[0]);

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={sizedAt} level={-35} />
      <Sfx name="el-chime" at={noneAt + 6} level={-36} />
      <Sfx name="el-pencil" at={tenAt} level={-35} />

      <Drift from={from} to={end + 40}>
        <Kicker at={from}>Backend engineer interview questions · Approaching system design</Kicker>
        <Headline lead="A first design" at={firstAt} size={70} />
        <MiniDesign at={firstAt + 4} y={y} />

        <Line x={textX} y={y(352)} at={sizedAt} size={26} color={INK_SOFT} weight={500}>
          sized for its estimate
        </Line>
        <Line x={textX} y={y(352) + 46} at={sizedAt + 4} size={34} color={BLUE_INK} weight={500}>
          <Num>{int(peak)}</Num> redirects a second
        </Line>
        <div style={{ position: "absolute", left: textX, top: y(452), display: "flex", alignItems: "center", gap: 14, fontSize: 26, opacity: ease(frame, noneAt, 12) }}>
          {frame >= noneAt ? <Tick at={noneAt + 4} size={28} /> : <span style={{ width: 28 }} />}
          <span style={{ ...note(26, OK_INK), fontWeight: 500, whiteSpace: "nowrap" }}>no single point of failure</span>
        </div>

        {/* The bridge: the same design, asked for ten times its estimate. */}
        <Line x={textX} y={y(548)} at={tenAt} size={26} color={INK_SOFT} weight={500}>
          now ten times the traffic
        </Line>
        <Line x={textX} y={y(548) + 46} at={tenAt + 4} size={34} color={INK} weight={500}>
          <Mark at={tenAt + 8} color={HIGHLIGHT}>
            <Num>{int(peak * 10)}</Num> redirects a second
          </Mark>
        </Line>

        <Spot id="crow" at={firstAt + 10} left={1372} top={y(330)} width={crowW} height={crowH} />
        <NextLine at={nextAt} x={X0} y={y(790)} width={1100}>
          scaling a design
        </NextLine>
      </Drift>
    </AbsoluteFill>
  );
};
