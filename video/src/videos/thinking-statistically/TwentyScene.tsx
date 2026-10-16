import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { Axis, sx, type XScale } from "../../editorial/charts";
import { useLayout } from "../../editorial/layout";
import { fmt, halo, headline, INK, INK_SOFT, label, note } from "../../editorial/style";
import { FigLabel, Ink, Leader, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { jitter, KNOWN, ROWS } from "./data";
import { DOT, lerp, Mu, STAT, STAT_INK, Svg, TruthLine, XBar } from "./parts";

/** The rows: every value of every sample, 50 to 150. */
const X: XScale = { lo: 50, hi: 150, x0: 160, x1: 1240 };
/** Where the twenty averages land: 94 to 104, enlarged. */
const X2: XScale = { lo: 94, hi: 104, x0: 1340, x1: 1760 };
const ROW0 = 372;
const PITCH = 23.5;
const BASE = 852;
const BLOCK = 64;
const TICK = 10;

const JITTERS = ROWS.map((_, i) => jitter(200 + i, KNOWN.n));

/** The order the averages fly into the panel: row 1, the sample of the
 *  figure before, goes last, so it lands on top of its stack. */
const ORDER = [...ROWS.keys()].slice(1).concat(0);
/** Each average's slot in the enlarged panel: its bin and its place in the
 *  stack. */
const SLOTS = (() => {
  const filled = new Map<number, number>();
  const slots = new Array<{ bin: number; k: number; turn: number }>(ROWS.length);
  ORDER.forEach((i, turn) => {
    const bin = Math.floor(ROWS[i].mean);
    const k = filled.get(bin) ?? 0;
    filled.set(bin, k + 1);
    slots[i] = { bin, k, turn };
  });
  return slots;
})();
const LO = Math.min(...ROWS.map((r) => r.mean));
const HI = Math.max(...ROWS.map((r) => r.mean));
const TALLEST = Math.max(...SLOTS.map((s) => s.k)) + 1;
/** The middle of the first row's block, once it has landed. */
const MINE_X = (sx(X2, SLOTS[0].bin) + sx(X2, SLOTS[0].bin + 1)) / 2;

/**
 * Part 2's close: twenty samples of fifty from the same population, twenty
 * different averages, and the averages gathered into a distribution of their
 * own beside them.
 */
export const TwentyScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const twentyFrom = n.beat("twenty").from;
  const moreAt = n.word("twenty", "fifty more");
  const answersAt = n.word("twenty", "answers");
  const parameterAt = n.word("moves", "parameter");
  const statisticAt = n.word("moves", "statistic");
  const variableAt = n.word("variable", "random variable");
  const spreadAt = n.word("variable", "spread");
  const thinkAt = n.word("points", "think");
  const drawAt = n.word("points", "single draw");
  const spreadEndAt = n.word("points", "that spread", { edge: "end" });

  const rowY = (i: number) => y(ROW0) + h(i * PITCH);
  // Row 1 is the sample of the figure before; the others arrive one by one.
  const rowAt = (i: number) => (i === 0 ? twentyFrom - 6 : lerp(moreAt - 4, answersAt - 10, (i - 1) / (ROWS.length - 2)));
  const muBold = ease(frame, parameterAt - 2, 10);
  const zig = ease(frame, statisticAt - 4, 22);
  const panel = ease(frame, variableAt - 16, 14);
  const muX = sx(X, KNOWN.mu);

  // The red line that joins the twenty averages, top to bottom.
  const zigPts = ROWS.map((r, i) => [sx(X, r.mean), rowY(i)] as const);
  const zigLen = zig * (zigPts.length - 1);
  const zigShown = zigPts.slice(0, Math.floor(zigLen) + 1).map(([a, b]) => [a, b] as [number, number]);
  const zf = zigLen - Math.floor(zigLen);
  if (Math.floor(zigLen) < zigPts.length - 1 && zf > 0) {
    const [ax, ay] = zigPts[Math.floor(zigLen)];
    const [bx, by] = zigPts[Math.floor(zigLen) + 1];
    zigShown.push([lerp(ax, bx, zf), lerp(ay, by, zf)]);
  }

  return (
    <AbsoluteFill>
      {/* ── Sound: nineteen rows arriving, the line through their averages,
           the averages flying over, the last one landing on top, Part 2's close ── */}
      <Sfx name="el-sprinkle" at={rowAt(1)} level={-34} />
      <Sfx name="el-sprinkle" at={rowAt(10)} level={-35} />
      <Sfx name="el-pencil" at={statisticAt - 4} level={-32} />
      <Sfx name="el-whoosh" at={variableAt - 6} level={-32} />
      <Sfx name="el-tap" at={variableAt - 6 + SLOTS[0].turn * 1.6 + 12} level={-27} />
      {/* In the pause after "spread", where Part 2 ends. */}
      <Sfx name="el-chime" at={spreadEndAt + 4} level={-32} />

      <div style={{ position: "absolute", left: 92, top: y(150), display: "flex", gap: "0.26em", ...headline(80) }}>
        <Ink at={twentyFrom - 4} dur={20} out={thinkAt - 8} style={{ position: "relative", whiteSpace: "nowrap" }}>
          Twenty samples,
        </Ink>
        <Ink
          at={answersAt - 6}
          dur={18}
          out={thinkAt - 8}
          style={{ position: "relative", ...headline(80, true), color: STAT_INK, whiteSpace: "nowrap" }}
        >
          twenty answers.
        </Ink>
      </div>
      <div style={{ position: "absolute", left: 92, top: y(150), display: "flex", gap: "0.26em", ...headline(80) }}>
        <Ink at={thinkAt - 4} dur={20} style={{ position: "relative", whiteSpace: "nowrap" }}>
          Think in distributions,
        </Ink>
        <Ink at={thinkAt + 14} dur={18} style={{ position: "relative", ...headline(80, true), color: STAT_INK, whiteSpace: "nowrap" }}>
          not points.
        </Ink>
      </div>

      <FigLabel n="5" title={`Twenty samples of ${KNOWN.n} from the same population`} at={twentyFrom - 4} x={160} y={y(270)} />
      <Axis scale={X} base={y(BASE)} ticks={[50, 75, 100, 125, 150]} at={twentyFrom - 4} />
      <TruthLine x={muX} bottom={y(BASE)} top={y(ROW0 - 16)} at={twentyFrom - 2} width={lerp(2, 3.2, muBold)} />
      <Note at={twentyFrom} x={muX + 12} y={y(ROW0 - 50)}>
        <span style={{ ...note(23, INK), fontWeight: 650, whiteSpace: "nowrap", ...halo }}>
          <Mu /> = {KNOWN.mu}
          <span style={{ ...note(21, INK_SOFT), marginLeft: 12, opacity: ease(frame, parameterAt + 4, 10) }}>never moves</span>
        </span>
      </Note>

      {/* ── The rows: raw values, each sample's average in red ── */}
      <Svg>
        {ROWS.map((r, i) => {
          const at = rowAt(i);
          return (
            <g key={i}>
              {r.values.map((v, j) => {
                const a = ease(frame, at + j * 0.08, 6);
                if (a <= 0) return null;
                return (
                  <circle
                    key={j}
                    cx={sx(X, v)}
                    cy={rowY(i) + h((JITTERS[i][j] - 0.5) * 2 * 6)}
                    r={3.4 * a}
                    fill={DOT}
                    opacity={0.75}
                  />
                );
              })}
            </g>
          );
        })}
        {zig > 0 ? (
          <polyline
            points={zigShown.map(([a, b]) => `${a.toFixed(1)},${b.toFixed(1)}`).join(" ")}
            fill="none"
            stroke={STAT}
            strokeWidth={2}
            strokeLinejoin="round"
            opacity={0.85}
          />
        ) : null}
        {ROWS.map((r, i) => {
          const a = ease(frame, rowAt(i) + 6, 8);
          if (a <= 0) return null;
          const x = sx(X, r.mean);
          return (
            <line
              key={i}
              x1={x}
              x2={x}
              y1={rowY(i) - h(TICK) * a}
              y2={rowY(i) + h(TICK) * a}
              stroke={STAT}
              strokeWidth={4}
              strokeLinecap="round"
            />
          );
        })}
      </Svg>
      <Note at={statisticAt} x={muX - 14} y={y(ROW0 - 50)} align="right">
        <span style={{ ...note(23, STAT_INK), fontWeight: 650, whiteSpace: "nowrap", ...halo }}>
          <XBar />: different every time
        </span>
      </Note>

      {/* ── The averages, gathered: a distribution of their own ── */}
      <Ink at={variableAt - 16} dur={14} style={{ left: X2.x0, top: y(270), whiteSpace: "nowrap" }}>
        <span style={{ ...label(24, INK), fontWeight: 560 }}>Where the twenty averages land</span>
      </Ink>
      <Axis scale={X2} base={y(BASE)} ticks={[94, 96, 98, 100, 102, 104]} at={variableAt - 16} opacity={panel} />
      <TruthLine x={sx(X2, KNOWN.mu)} bottom={y(BASE)} top={y(BASE - TALLEST * BLOCK - 20)} at={variableAt - 12} />
      <Svg>
        {ROWS.map((r, i) => {
          const s = SLOTS[i];
          const t = ease(frame, variableAt - 6 + s.turn * 1.6, 16);
          if (t <= 0) return null;
          const fromX = sx(X, r.mean);
          const fromY = rowY(i);
          const toX = sx(X2, s.bin) + 2;
          const w = sx(X2, s.bin + 1) - sx(X2, s.bin) - 4;
          const toY = y(BASE) - h((s.k + 1) * BLOCK);
          const bw = lerp(4, w, t);
          const bh = lerp(h(TICK * 2), h(BLOCK) - 3, t);
          const mine = i === 0 ? ease(frame, drawAt - 4, 10) : 0;
          return (
            <rect
              key={i}
              x={lerp(fromX - 2, toX, t)}
              y={lerp(fromY - h(TICK), toY, t)}
              width={bw}
              height={bh}
              fill={STAT}
              stroke={INK}
              strokeWidth={3 * mine}
            />
          );
        })}
      </Svg>
      <Note at={spreadAt} x={X2.x0} y={y(322)}>
        <span style={{ ...note(22, STAT_INK), fontWeight: 650, whiteSpace: "nowrap" }}>
          from {fmt(LO)} to {fmt(HI)}
        </span>
      </Note>
      <Leader
        points={[
          [MINE_X, y(BASE - (SLOTS[0].k + 1) * BLOCK - 52)],
          [MINE_X, y(BASE - (SLOTS[0].k + 1) * BLOCK) - 6],
        ]}
        at={drawAt - 2}
        dur={10}
      />
      <Note at={drawAt} x={MINE_X} y={y(BASE - (SLOTS[0].k + 1) * BLOCK - 86)} from="up">
        <span style={{ ...note(21, INK), fontWeight: 650, whiteSpace: "nowrap", display: "inline-block", transform: "translateX(-50%)" }}>
          one draw
        </span>
      </Note>
    </AbsoluteFill>
  );
};
