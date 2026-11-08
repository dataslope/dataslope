import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, HAIRLINE, HIGHLIGHT, INK, INK_SOFT, label, note, svgText } from "../../editorial/style";
import { Note, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { RETRY, thousands } from "./data";
import { Drift, line, Mark, X0 } from "./parts";

const PLOT_TOP = 372;
const BASE = 752;
const PLOT_W = 640;
const LEFT_X = 210;
const RIGHT_X = 1120;
/** The x axis runs to 1.1 s, so the wave that waits exactly one second has
 *  a tenth of its own to land in. */
const SPAN = 1.1;

const plain = RETRY.plain[0];
const jitter = RETRY.jitter[0];
const busiest = jitter.histogram.indexOf(jitter.busiest);

/** One histogram of a retry wave: requests per tenth of a second. */
const Wave: React.FC<{
  x: number;
  counts: readonly number[];
  at: number;
  axesAt: number;
  color: string;
  mark?: { bin: number; at: number };
  stagger?: number;
}> = ({ x, counts, at, axesAt, color, mark, stagger = 3 }) => {
  const frame = useCurrentFrame();
  const { y, h } = useLayout();
  const base = y(BASE);
  const full = h(BASE - PLOT_TOP);
  const binW = (PLOT_W / SPAN) * RETRY.bin;
  const axes = ease(frame, axesAt, 14);
  const sx = (t: number) => x + (t / SPAN) * PLOT_W;
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
      <g opacity={axes}>
        {[500, 1000].map((v) => (
          <g key={v}>
            <line x1={x} x2={x + PLOT_W} y1={base - (full * v) / RETRY.n} y2={base - (full * v) / RETRY.n} stroke={HAIRLINE} strokeWidth={1} strokeDasharray="3 6" />
            <text x={x - 14} y={base - (full * v) / RETRY.n + 7} textAnchor="end" style={svgText(note(24, INK_SOFT))}>
              {thousands(v)}
            </text>
          </g>
        ))}
        <text x={x - 14} y={base + 7} textAnchor="end" style={svgText(note(24, INK_SOFT))}>
          0
        </text>
        <line x1={x} x2={x + PLOT_W * axes} y1={base} y2={base} stroke={INK} strokeWidth={2} />
        {[0, 0.5, 1].map((t) => (
          <text key={t} x={sx(t)} y={base + 32} textAnchor="middle" style={svgText(note(24, INK_SOFT))}>
            {t} s
          </text>
        ))}
      </g>
      {counts.map((c, i) => {
        if (c <= 0) return null;
        const p = ease(frame, at + i * stagger, 14);
        const bh = (full * c) / RETRY.n;
        const lit = mark && mark.bin === i ? ease(frame, mark.at, 10) : 0;
        return (
          <g key={i}>
            {lit > 0 ? <rect x={sx(i * RETRY.bin) - 3} y={base - bh * p - 10} width={binW + 6} height={bh * p + 10} rx={6} fill={HIGHLIGHT} opacity={lit} /> : null}
            <rect x={sx(i * RETRY.bin) + 4} y={base - bh * p} width={binW - 8} height={bh * p} rx={3} fill={color} />
          </g>
        );
      })}
    </svg>
  );
};

/**
 * The follow-up to question 4, why jitter, answered with the simulation
 * check.mjs runs (Python's random.Random, seed 1): a thousand requests
 * rejected together, each retrying after one second. Without jitter, the
 * whole wave lands in one tenth of a second; with a random wait of up to that
 * second, it spreads across all ten, the busiest holding 115. Both on one
 * scale, so the spread wave is drawn as small as it is.
 */
export const JitterScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  const from = n.beat("design-jitter").from;
  const followAt = n.word("design-jitter", "Expect the follow-up");
  const whyAt = n.word("design-jitter", "why jitter");
  const simAt = n.word("design-jitter", "Model it with a seeded simulation");
  const thousandAt = n.word("design-jitter", "a thousand requests rejected at once");
  const secondAt = n.word("design-jitter", "each retrying after a second");
  const withoutAt = n.word("design-jitter", "Without jitter");
  const sameAt = n.word("design-jitter", "come back in the same instant");
  const againAt = n.word("design-jitter", "rejected together again");
  const withAt = n.word("design-jitter", "With a random wait");
  const tenthAt = n.word("design-jitter", "no tenth of it gets more than");
  const n115At = n.word("design-jitter", "a hundred and fifteen");
  const end = n.beat("design-jitter").to;

  const base = y(BASE);
  const jitterBar = (LEFT_X: number) => LEFT_X + ((busiest * RETRY.bin) / SPAN) * PLOT_W + ((PLOT_W / SPAN) * RETRY.bin) / 2;
  const plainBin = plain.histogram.indexOf(plain.busiest);

  return (
    <AbsoluteFill>
      <Sfx name="el-whoosh" at={thousandAt} level={-37} />
      <Sfx name="el-tap" at={withoutAt + 8} level={-27} />
      <Sfx name="el-sprinkle" at={withAt + 4} level={-31} />
      <Sfx name="el-tap" at={n115At} level={-30} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={4} at={followAt - 4} textAt={whyAt - 4} kicker="Question 4, the follow-up" size={66}>
          Why jitter?
        </QuestionCard>
        <Note at={simAt} x={X0} y={y(262)}>
          <span style={line(27, INK)}>
            A seeded simulation:{" "}
            <span style={{ opacity: ease(frame, thousandAt - 2, 10) }}>
              <Num>{thousands(RETRY.n)}</Num> requests rejected at once,
            </span>
            <span style={{ opacity: ease(frame, secondAt - 2, 10) }}> each retrying after {RETRY.base} second.</span>
          </span>
        </Note>

        <Note at={withoutAt - 2} x={LEFT_X} y={y(PLOT_TOP - 52)}>
          <span style={{ ...label(24, INK), fontWeight: 500, whiteSpace: "nowrap" }}>Without jitter</span>
        </Note>
        <Note at={withAt - 2} x={RIGHT_X} y={y(PLOT_TOP - 52)}>
          <span style={{ ...label(24, INK), fontWeight: 500, whiteSpace: "nowrap" }}>With a random wait, up to 1 second</span>
        </Note>
        <Wave x={LEFT_X} counts={plain.histogram} at={withoutAt + 2} axesAt={thousandAt} color={ACCENT} />
        <Wave x={RIGHT_X} counts={jitter.histogram} at={withAt + 2} axesAt={thousandAt + 6} color={BAR} mark={{ bin: busiest, at: tenthAt }} stagger={3} />

        {/* The single wave: every request in one tenth. */}
        <Note at={sameAt} x={LEFT_X + ((plainBin * RETRY.bin) / SPAN) * PLOT_W - 24} y={y(PLOT_TOP) + 44} align="right">
          <span style={{ ...note(24, ACCENT_INK), fontWeight: 500, whiteSpace: "nowrap" }}>
            all <Num>{thousands(plain.busiest)}</Num> in the same tenth
          </span>
        </Note>
        <Note at={againAt} x={LEFT_X + ((plainBin * RETRY.bin) / SPAN) * PLOT_W - 24} y={y(PLOT_TOP) + 84} align="right">
          <span style={{ ...note(24, ACCENT_INK), whiteSpace: "nowrap" }}>and rejected together again</span>
        </Note>

        {/* The spread wave: its busiest tenth. */}
        <Note at={n115At - 4} x={jitterBar(RIGHT_X) - 120} y={base - 140} width={240} from="up">
          <div style={{ ...note(28, INK), fontWeight: 500, textAlign: "center", whiteSpace: "nowrap" }}>
            <Mark at={n115At + 2}>
              <Num>{jitter.busiest}</Num>
            </Mark>
          </div>
          <div style={{ ...note(24, INK_SOFT), textAlign: "center", whiteSpace: "nowrap" }}>the busiest tenth</div>
        </Note>

        <Note at={tenthAt + 20} x={X0} y={y(816)}>
          <span style={{ ...label(24, INK_SOFT), whiteSpace: "nowrap" }}>
            Requests per tenth of a second, in a simulation (Python&apos;s random.Random, seed {RETRY.seed}); no provider is called.
          </span>
        </Note>
        <Note at={tenthAt + 30} x={X0} y={y(844)}>
          <span style={{ ...label(24, INK_SOFT), whiteSpace: "nowrap" }}>
            The next two waves, after 2 and 4 s: busiest tenths <Num>{RETRY.jitter[1].busiest}</Num> and <Num>{RETRY.jitter[2].busiest}</Num> with jitter,{" "}
            <Num>{thousands(RETRY.plain[1].busiest)}</Num> without.
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
