import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, headline, INK, INK_SOFT, label, PAPER, TABULAR } from "../../editorial/style";
import { OutlineBadge } from "../../editorial/ui";
import { ds } from "../../theme/brand";
import { MONO } from "../../theme/fonts";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { LEAK } from "./data";
import { commas, Drift, Kicker, line, mulberry32, PlanMap, Say, Spot, Svg, X0 } from "./parts";

/** The block drawn for 200 rows of 10,000 columns: a corner of it. */
export const GRID = { cols: 30, rows: 14, cw: 20, ch: 25, gap: 3 } as const;
/** Blue tints for random numbers: filled cells, no outline. */
const TINTS = [ds("blue", 100), ds("blue", 200), ds("blue", 300), ds("blue", 400)];

/** Each cell's tint, the same on every frame. */
export const cellTints = (() => {
  const r = mulberry32(7);
  return Array.from({ length: GRID.rows }, () => Array.from({ length: GRID.cols }, () => Math.floor(r() * TINTS.length)));
})();
/** Each row's coin-flip label. */
export const rowLabels = (() => {
  const r = mulberry32(11);
  return Array.from({ length: GRID.rows }, () => (r() < LEAK.positives / LEAK.rows ? 1 : 0));
})();

/**
 * The data block: a corner of 200 rows by 10,000 columns of random numbers,
 * fading out to the right and the bottom (there is more of it than the page
 * holds), with its label column of coin flips beside it. Shared with question
 * six, which lights the columns the leaky pick chose.
 */
export const DataBlock: React.FC<{
  x: number;
  top: number;
  at: number;
  labelAt: number;
  /** Column index → a tint laid over the whole column from a frame on. */
  cols?: readonly { col: number; at: number; color: string; rows?: readonly [number, number]; out?: number }[];
  /** Rows held out by a fold, outlined from a frame on. */
  heldOut?: { from: number; to: number; at: number; out?: number };
  out?: number;
}> = ({ x, top, at: from, labelAt, cols = [], heldOut, out }) => {
  const frame = useCurrentFrame();
  const { h } = useLayout();
  const o = out === undefined ? 0 : ease(frame, out, 12);
  if (o >= 1) return null;
  const ch = h(GRID.ch);
  const pitchY = ch + GRID.gap;
  const pitchX = GRID.cw + GRID.gap;
  const labelX = x + GRID.cols * pitchX + 22;
  return (
    <div style={{ position: "absolute", inset: 0, opacity: 1 - o }}>
      <Svg>
        {cellTints.map((row, i) =>
          row.map((t, j) => {
            const p = ease(frame, from + j * 0.9 + i * 0.4, 10);
            if (p <= 0) return null;
            // Fade toward the far edges: the block goes on past the page.
            const edge = Math.min(1, (GRID.cols - j) / 6) * Math.min(1, (GRID.rows - i) / 3.2);
            return (
              <rect
                key={`${i}-${j}`}
                x={x + j * pitchX}
                y={top + i * pitchY}
                width={GRID.cw}
                height={ch}
                rx={3}
                fill={TINTS[t]}
                opacity={p * (0.25 + 0.75 * edge)}
              />
            );
          }),
        )}
        {cols.map((c, k) => {
          const p = ease(frame, c.at, 14);
          const co = c.out === undefined ? 0 : ease(frame, c.out, 10);
          if (p <= 0 || co >= 1) return null;
          const [r0, r1] = c.rows ?? [0, GRID.rows];
          return (
            <rect
              key={k}
              x={x + c.col * pitchX}
              y={top + r0 * pitchY}
              width={GRID.cw}
              height={((r1 - r0) * pitchY - GRID.gap) * p}
              rx={3}
              fill={c.color}
              opacity={1 - co}
            />
          );
        })}
        {heldOut
          ? (() => {
              const p = ease(frame, heldOut.at, 14);
              const ho = heldOut.out === undefined ? 0 : ease(frame, heldOut.out, 10);
              if (p <= 0 || ho >= 1) return null;
              // The top edge runs in the gap between rows, clear of the label
              // digit of the row above it.
              const y0 = top + heldOut.from * pitchY - GRID.gap / 2;
              const y1 = top + heldOut.to * pitchY - GRID.gap + 7;
              const right = labelX + 44;
              return (
                <rect
                  x={x - 8}
                  y={y0}
                  width={(right - x + 16) * p}
                  height={y1 - y0}
                  rx={8}
                  fill="none"
                  stroke={INK}
                  strokeWidth={2}
                  strokeDasharray="7 6"
                  opacity={1 - ho}
                />
              );
            })()
          : null}
      </Svg>
      {rowLabels.map((v, i) => {
        const p = ease(frame, labelAt + i * 1.5, 8);
        if (p <= 0) return null;
        // A coin spinning: the digit flips a few times before it lands.
        const settle = labelAt + i * 1.5 + 10;
        const shown = frame < settle ? (Math.floor(frame / 2) + i) % 2 : v;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: labelX,
              top: top + i * pitchY,
              width: 40,
              height: ch,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: MONO,
              fontSize: 20,
              fontWeight: 500,
              color: INK,
              opacity: p * Math.min(1, (GRID.rows - i) / 3.2) ** 0.6,
              ...TABULAR,
            }}
          >
            {shown}
          </div>
        );
      })}
    </div>
  );
};

/**
 * The opening: a block of random numbers and a coin-flip label, and the
 * eighty-five percent it cross-validates at, set against a coin flip's fifty
 * and turned red when the narration says nothing in it can predict. Then the
 * question every ML round still starts on, the flamingo beside it, and the
 * round's three movements.
 */
export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("hook").from;
  const rowsAt = n.word("hook", "Two hundred rows");
  const coinAt = n.word("hook", "coin flip");
  const cvAt = n.word("hook", "Cross-validated");
  const eightyAt = n.word("hook", "eighty-five percent");
  const nothingAt = n.word("hook-why", "Nothing in it");
  const sixAt = n.word("hook-why", "Question six");
  const langAt = n.word("hook-round", "Language models");
  const firstAt = n.word("hook-round", "the first thing");
  const twelveAt = n.word("plan", "Twelve questions");
  const tenAt = n.word("plan", "Ten are worked through");
  const failAt = n.word("plan", "why models fail");
  const measureAt = n.word("plan", "how to measure");
  const numberAt = n.word("plan", "which number");
  const quickAt = n.word("plan", "Two are quick");
  const end = n.beat("plan").to;

  // ── The block, on the left ──
  const BX = X0;
  const BTOP = y(336);
  // ── The score, on the right ──
  const SX = 1110;
  const SW = 620;
  const scaleY = y(700);
  const xAt = (v: number) => SX + SW * v;
  const count = Math.round(LEAK.leaky * 100 * ease(frame, eightyAt - 4, 20));
  const red = ease(frame, nothingAt, 14);
  const marker = ease(frame, eightyAt - 4, 20);
  const half = ease(frame, nothingAt + 6, 16);
  const scoreColor = `color-mix(in srgb, ${ACCENT_INK} ${red * 100}%, ${INK})`;
  const goneA = langAt - 6;

  return (
    <AbsoluteFill>
      <Sfx name="el-sprinkle" at={rowsAt} level={-36} />
      <Sfx name="el-tap" at={coinAt + 2} level={-30} />
      <Sfx name="el-tap" at={eightyAt + 2} level={-28} />
      <Sfx name="el-pencil" at={nothingAt + 6} level={-36} />
      <Sfx name="el-pop" at={langAt} level={-30} />
      <Sfx name="el-whoosh" at={twelveAt} level={-36} />

      <Drift from={from} to={end + 40} scale={0.018}>
        <Kicker at={from + 2}>Machine learning engineer interview questions</Kicker>

        {/* ── A: random numbers, a coin-flip label, 85% ── */}
        <Say at={rowsAt - 2} x={BX} y={y(256)} out={goneA}>
          <span style={line(28, BLUE_INK)}>
            <span style={TABULAR}>{LEAK.rows}</span> rows × <span style={TABULAR}>{commas(LEAK.columns)}</span> columns of random numbers
          </span>
        </Say>
        <DataBlock x={BX} top={BTOP} at={rowsAt} labelAt={coinAt - 4} out={goneA} />
        <Say at={coinAt - 6} x={BX + GRID.cols * (GRID.cw + GRID.gap) + 22 + 20} y={BTOP - h(44)} width={120} align="center" out={goneA}>
          <span style={{ ...label(21, INK_SOFT), whiteSpace: "nowrap" }}>label</span>
        </Say>
        <Say at={coinAt + 4} x={BX} y={BTOP + GRID.rows * (h(GRID.ch) + GRID.gap) + h(30)} out={goneA}>
          <span style={line(26, INK_SOFT)}>Each label a coin flip</span>
        </Say>

        <Say at={cvAt - 2} x={SX} y={y(330)} out={goneA}>
          <span style={line(28, INK_SOFT)}>Cross-validated accuracy</span>
        </Say>
        <Say at={eightyAt - 6} x={SX - 6} y={y(384)} out={goneA}>
          <span style={{ ...headline(176), color: scoreColor, ...TABULAR }}>{count}%</span>
        </Say>
        {/* The scale it sits on: 0 to 100%, the coin flip's 50% dashed. */}
        <Svg opacity={ease(frame, cvAt, 14) * (1 - ease(frame, goneA, 12))}>
          <line x1={SX} x2={SX + SW * ease(frame, cvAt, 20)} y1={scaleY} y2={scaleY} stroke={INK} strokeWidth={2} />
          {[0, 0.5, 1].map((v) => (
            <line key={v} x1={xAt(v)} x2={xAt(v)} y1={scaleY} y2={scaleY + 10} stroke={INK} strokeWidth={1.6} opacity={ease(frame, cvAt + 6, 10)} />
          ))}
          <line
            x1={xAt(0.5)}
            x2={xAt(0.5)}
            y1={scaleY}
            y2={scaleY - h(120) * half}
            stroke={INK_SOFT}
            strokeWidth={2.4}
            strokeDasharray="7 6"
          />
          {marker > 0 ? (
            <circle cx={xAt(LEAK.leaky * marker)} cy={scaleY} r={11} fill={`color-mix(in srgb, ${ACCENT} ${red * 100}%, ${BAR})`} stroke={PAPER} strokeWidth={3} />
          ) : null}
        </Svg>
        {[0, 1].map((v) => (
          <Say key={v} at={cvAt + 8} x={xAt(v)} y={scaleY + h(18)} width={80} align="center" out={goneA}>
            <span style={{ ...label(21, INK_SOFT), ...TABULAR }}>{v * 100}%</span>
          </Say>
        ))}
        <Say at={nothingAt + 10} x={xAt(0.5) + 16} y={scaleY - h(122)} out={goneA}>
          <span style={line(24, INK_SOFT)}>50%: a coin flip</span>
        </Say>
        <Say at={sixAt - 2} x={SX} y={scaleY + h(92)} out={goneA}>
          <span style={{ ...line(26, INK), display: "inline-flex", alignItems: "center", gap: "0.4em" }}>
            <OutlineBadge tone="red" size={26}>
              Question 6
            </OutlineBadge>
            finds where it came from
          </span>
        </Say>

        {/* ── B: the question every round starts on, and the round ── */}
        <Spot id="mle-generalization-flamingo" at={langAt} x={1400} y={y(268)} w={300} />
        <Say at={langAt + 2} x={X0} y={y(270)} out={twelveAt - 8}>
          <span style={line(30, INK, 400)}>Language models didn’t retire classical machine learning</span>
        </Say>
        <Say at={firstAt - 4} x={92} y={y(150)}>
          <span style={{ ...headline(66), whiteSpace: "nowrap" }}>Does it work on data it hasn’t seen?</span>
        </Say>
        <Say at={twelveAt - 2} x={X0} y={y(270)}>
          <span style={line(28, INK_SOFT)}>
            12 questions<span style={{ opacity: ease(frame, tenAt - 2, 10) }}>, 10 worked through in three movements</span>
          </span>
        </Say>
        <PlanMap x={X0} top={y(336)} width={1080} groupAt={[failAt, measureAt, numberAt, quickAt]} />
      </Drift>
    </AbsoluteFill>
  );
};
