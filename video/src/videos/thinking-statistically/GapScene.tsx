import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { Axis, sx, type XScale } from "../../editorial/charts";
import { useLayout } from "../../editorial/layout";
import { body, fmt, headline, INK, INK_SOFT, label, note, PAPER } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { GAPS, jitter } from "./data";
import { Bell, DOT, Kicker, lerp, Mark, pulse, STAT, STAT_INK, Svg, TruthLine } from "./parts";

/** The raw values: every score in every draw lies inside 10 to 90. */
const X: XScale = { lo: 10, hi: 90, x0: 300, x1: 1180 };
const STRIP_A = 500;
const STRIP_B = 660;
const AXIS = 800;
const JIT = 30;
/** The gaps, A minus B, around a zero line. */
const ZERO_X = 1560;
const PER_POINT = 44;
const ROW_Y = [470, 535, 600, 665, 730];
const BAR_H = 26;

const JIT_A = jitter(40, GAPS.n);
const JIT_B = jitter(41, GAPS.n);

/** "+1.72", "−3.62": a gap the way the panel prints it. */
const signed = (v: number) => `${v < 0 ? "−" : "+"}${fmt(Math.abs(v))}`;

/**
 * Part 1 opens: two groups of forty, B ahead, then the reveal that both come
 * from one process, and four more draws whose gaps are never zero.
 */
export const GapScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  // The series intro holds the page until the first word, so the headline waits for it.
  const hookFrom = n.beat("hook").from;
  const { y, h } = useLayout();

  // ── Cues ──
  const groupsAt = n.word("hook", "two groups");
  const scoresAt = n.word("hook", "scores");
  const higherAt = n.word("hook", "higher");
  const halfAt = n.word("hook", "three");
  const betterAt = n.word("better", "better");
  const sameFrom = n.beat("same").from;
  const sameAt = n.word("same", "same");
  const bothAt = n.word("same", "Both groups");
  const processAt = n.word("same", "process");
  const noRealAt = n.word("same", "no real");
  const againAt = n.word("again", "again");
  const aheadAt = n.word("again", "A comes");
  const sevenAt = n.word("again", "one");
  const againMoreAt = n.word("more", "Again");
  const twoAt = n.word("more", "two");
  const threeAt = n.word("more", "three");
  const oneAt = n.word("more", "one");
  const fiveAt = n.word("free", "Five draws");
  const neverAt = n.word("free", "never");
  const zeroAt = n.word("free", "zero");
  const diffsAt = n.word("free", "differences");
  const believeAt = n.word("luck", "believe");
  const askAt = n.word("luck", "ask");
  const couldAt = n.word("luck", "could");
  const onlyAt = n.word("trend-in", "only gaps");

  // When each draw's dots arrive, and when its gap bar grows. The third draw
  // is made on "Again", and its gap read out on "two".
  const draws = [
    { s: groupsAt - 4, bar: halfAt - 2 },
    { s: againAt - 2, bar: sevenAt - 4 },
    { s: againMoreAt - 2, bar: twoAt - 2 },
    { s: threeAt - 12, bar: threeAt - 2 },
    { s: oneAt - 12, bar: oneAt - 2 },
  ];
  const current = Math.max(0, draws.filter((d) => frame >= d.s).length - 1);
  const prev = current > 0 ? current - 1 : -1;
  const swap = current > 0 ? ease(frame, draws[current].s, 8) : 1;
  const moved = current > 0 ? ease(frame, draws[current].s + 6, 12) : 1;

  const trial = GAPS.trials[current];
  const before = prev >= 0 ? GAPS.trials[prev] : trial;
  const meanA = lerp(before.meanA, trial.meanA, moved);
  const meanB = lerp(before.meanB, trial.meanB, moved);
  const meansIn = ease(frame, higherAt - 6, 12);
  const panelIn = ease(frame, scoresAt - 4, 14);
  const zeroBold = ease(frame, zeroAt - 2, 10);
  // A comes out ahead: its average swells as it is named.
  const aSwell = pulse(frame, aheadAt, 20);
  // "ask one question": the groups step back, and the gaps go after them on
  // the turn to trends.
  const groupsOp = (1 - ease(frame, askAt, 20) * 0.62) * (1 - ease(frame, onlyAt, 22));
  const panelOp = 1 - ease(frame, onlyAt + 8, 22);

  const strip = (values: readonly number[], jit: readonly number[], base: number, appear: (j: number) => number, op = 1) =>
    values.map((v, j) => {
      const a = appear(j);
      if (a <= 0) return null;
      return (
        <circle
          key={j}
          cx={sx(X, v)}
          cy={y(base) + h((jit[j] - 0.5) * 2 * JIT)}
          r={6.5 * a}
          fill={DOT}
          stroke={PAPER}
          strokeWidth={1.2}
          opacity={op}
        />
      );
    });

  const appearNew = (offset: number) => (j: number) =>
    ease(frame, draws[current].s + offset + j * (current === 0 ? 0.5 : 0.18), 6);

  return (
    <AbsoluteFill>
      {/* ── Sound: the first eighty scores, the averages, each draw's gap ── */}
      <Sfx name="el-sprinkle" at={draws[0].s} level={-32} />
      <Sfx name="el-tap" at={higherAt - 6} level={-27} />
      {draws.map((d, k) => (
        <Sfx key={k} name="el-pop" at={d.bar} level={-29} />
      ))}
      <Sfx name="el-pencil" at={processAt - 4} level={-33} />
      <Sfx name="el-pencil" at={noRealAt} level={-35} />

      <Kicker at={hookFrom - 10}>Signal and noise</Kicker>

      {/* ── Headlines: one line in two inks, the second following the first ── */}
      <div style={{ position: "absolute", left: 92, top: y(150), display: "flex", gap: "0.26em", ...headline(80) }}>
        <Ink at={hookFrom - 8} dur={20} out={sameFrom - 6} style={{ position: "relative", whiteSpace: "nowrap" }}>
          B scores higher.
        </Ink>
        <Ink
          at={betterAt - 6}
          dur={18}
          out={sameFrom - 6}
          style={{ position: "relative", ...headline(80, true), color: STAT_INK, whiteSpace: "nowrap" }}
        >
          Is B better?
        </Ink>
      </div>
      <div style={{ position: "absolute", left: 92, top: y(150), display: "flex", gap: "0.26em", ...headline(80) }}>
        <Ink at={sameAt - 4} dur={20} style={{ position: "relative", whiteSpace: "nowrap" }}>
          Same process.
        </Ink>
        <Ink at={neverAt - 6} dur={18} style={{ position: "relative", ...headline(80, true), color: STAT_INK, whiteSpace: "nowrap" }}>
          The gap is never zero.
        </Ink>
      </div>
      <Ink at={couldAt - 4} dur={18} style={{ left: 96, top: y(258), whiteSpace: "nowrap" }}>
        <span style={{ ...body(38, true), color: INK }}>Could this just be luck?</span>
      </Ink>

      <AbsoluteFill style={{ opacity: groupsOp }}>
      <FigLabel n="1" title={`Two groups of ${GAPS.n}, and each group's average`} at={groupsAt - 8} x={160} y={y(330)} />

      {/* ── The two groups ── */}
      {(["A", "B"] as const).map((g, i) => (
        <Ink key={g} at={groupsAt - 6 + i * 6} dur={12} style={{ left: 160, top: y(i ? STRIP_B : STRIP_A) - 14 }}>
          <span style={label(22, INK)}>
            <Mark at={bothAt + i * 6} out={noRealAt + 10}>
              Group {g}
            </Mark>
          </span>
        </Ink>
      ))}
      {/* "No real difference": the one shape both groups are drawn from, the same under each. */}
      {[STRIP_A, STRIP_B].map((base, i) => (
        <Bell
          key={base}
          x={(v) => sx(X, v)}
          mu={GAPS.mu}
          sd={GAPS.sigma}
          base={y(base) + h(40)}
          height={h(74)}
          at={noRealAt + i * 8}
        />
      ))}
      <Svg>
        {prev >= 0 && swap < 1 ? (
          <>
            {strip(before.a, JIT_A, STRIP_A, () => 1, 1 - swap)}
            {strip(before.b, JIT_B, STRIP_B, () => 1, 1 - swap)}
          </>
        ) : null}
        {strip(trial.a, JIT_A, STRIP_A, appearNew(0))}
        {strip(trial.b, JIT_B, STRIP_B, appearNew(current === 0 ? 8 : 2))}
      </Svg>
      <Axis scale={X} base={y(AXIS)} ticks={[10, 30, 50, 70, 90]} at={groupsAt - 6} />

      {/* The process both groups come from. */}
      <TruthLine x={sx(X, GAPS.mu)} bottom={y(AXIS)} top={y(STRIP_A - 56)} at={processAt - 4} />
      <Note at={processAt} x={sx(X, GAPS.mu)} y={y(AXIS + 44)} from="up">
        <span style={{ ...note(21, INK_SOFT), whiteSpace: "nowrap", display: "inline-block", transform: "translateX(-50%)" }}>
          Both from one process, which averages {GAPS.mu}
        </span>
      </Note>

      {/* Each group's average, which moves with every draw. */}
      {meansIn > 0
        ? ([
            [meanA, STRIP_A],
            [meanB, STRIP_B],
          ] as const).map(([mean, base]) => (
            <React.Fragment key={base}>
              <Svg opacity={meansIn}>
                <line
                  x1={sx(X, mean)}
                  x2={sx(X, mean)}
                  y1={y(base) - h(46)}
                  y2={y(base) + h(46)}
                  stroke={STAT}
                  strokeWidth={4 + (base === STRIP_A ? aSwell * 3 : 0)}
                  strokeLinecap="round"
                />
              </Svg>
              <div
                style={{
                  position: "absolute",
                  left: sx(X, mean),
                  top: y(base) - h(46) - 34,
                  transform: `translateX(-50%) scale(${1 + (base === STRIP_A ? aSwell * 0.14 : 0)})`,
                  transformOrigin: "50% 100%",
                  opacity: meansIn,
                  whiteSpace: "nowrap",
                  // A knockout, so the process's dashed line passes behind it.
                  background: PAPER,
                  padding: "0 6px",
                  borderRadius: 4,
                  ...note(23, STAT_INK),
                  fontWeight: 700,
                }}
              >
                {fmt(mean)}
              </div>
            </React.Fragment>
          ))
        : null}
      </AbsoluteFill>

      {/* ── The gaps, A minus B ── */}
      <AbsoluteFill style={{ opacity: panelOp }}>
      <Ink at={scoresAt - 4} dur={14} style={{ left: 1290, top: y(330), whiteSpace: "nowrap" }}>
        <span style={{ ...label(24, INK), fontWeight: 560 }}>The gap, A minus B</span>
      </Ink>
      <div
        style={{
          position: "absolute",
          right: 1920 - ZERO_X + 12,
          top: y(392),
          opacity: panelIn,
          ...note(20, INK_SOFT),
          whiteSpace: "nowrap",
        }}
      >
        B ahead
      </div>
      <div style={{ position: "absolute", left: ZERO_X + 12, top: y(392), opacity: panelIn, ...note(20, INK_SOFT), whiteSpace: "nowrap" }}>
        <Mark at={aheadAt + 4} out={againMoreAt}>
          A ahead
        </Mark>
      </div>
      <Svg opacity={panelIn}>
        <line
          x1={ZERO_X}
          x2={ZERO_X}
          y1={y(432)}
          y2={y(768)}
          stroke={INK}
          strokeWidth={lerp(1.6, 2.6, zeroBold)}
          strokeDasharray="7 6"
        />
      </Svg>
      <Note at={zeroAt - 2} x={ZERO_X} y={y(782)} from="up">
        <span style={{ ...label(21, INK), whiteSpace: "nowrap", display: "inline-block", transform: "translateX(-50%)" }}>
          zero
        </span>
      </Note>
      {GAPS.trials.map((t, k) => {
        const g = ease(frame, draws[k].bar, 12);
        if (g <= 0) return null;
        const w = t.gap * PER_POINT * g;
        const rowY = y(ROW_Y[k]);
        const end = ZERO_X + w;
        // "Five draws": counted off, one bar after another.
        const counted = pulse(frame, fiveAt + k * 4, 14);
        return (
          <React.Fragment key={k}>
            <div
              style={{
                position: "absolute",
                left: 1290,
                top: rowY - 14,
                opacity: Math.min(1, g * 2),
                ...note(21, INK_SOFT),
              }}
            >
              {k + 1}
            </div>
            <Svg>
              <rect
                x={Math.min(ZERO_X, end)}
                y={rowY - BAR_H / 2}
                width={Math.abs(w)}
                height={BAR_H}
                fill={`color-mix(in srgb, ${STAT_INK} ${Math.round(counted * 100)}%, ${STAT})`}
              />
            </Svg>
            <div
              style={{
                position: "absolute",
                left: t.gap > 0 ? end + 10 : undefined,
                right: t.gap < 0 ? 1920 - end + 10 : undefined,
                top: rowY - 15,
                opacity: ease(frame, draws[k].bar + 6, 8),
                whiteSpace: "nowrap",
                ...note(23, STAT_INK),
                fontWeight: 700,
              }}
            >
              {/* "Randomness makes differences": each gap lit as the word lands. */}
              <Mark at={diffsAt + k * 5} out={believeAt}>
                {signed(t.gap)}
              </Mark>
            </div>
          </React.Fragment>
        );
      })}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
