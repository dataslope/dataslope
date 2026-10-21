import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Illustration } from "../../components/Illustration";
import { bob, ease, pop } from "../../components/motion";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { Axis, Bars, NormalCurve, sx, type XScale } from "../../editorial/charts";
import {
  histogram,
  mulberry32,
  OVER_50,
  POP_SIZE,
  SAMPLE_COUNT,
  SAMPLES_30,
  SHARE_30,
  SPREADS,
  VIDEO,
  WAIT_MU,
  WAIT_SD,
  WAITS,
} from "./data";
import { useLayout } from "../../editorial/layout";
import {
  ACCENT,
  ACCENT_INK,
  BLUE_INK,
  body,
  fmt,
  headline,
  INK,
  INK_SOFT,
  note,
  PAPER,
  label,
  TABULAR,
} from "../../editorial/style";
import { FigLabel, Ink, Leader, Note } from "../../editorial/ui";
import { ds } from "../../theme/brand";
import { useFigNumber } from "../sampling/merged";
import { PartName } from "../sampling/PartName";

/** One x-axis for both figures, so an average falls straight down from the
 *  population to the place it lands. */
const X: XScale = { lo: 0, hi: 50, x0: 160, x1: 1760 };
const POP_COUNTS = histogram(WAITS, 0, 50, 1);
const POP_MAX = Math.max(...POP_COUNTS);
const MEAN_BIN = 0.5;
const MEANS_BASE = 878;
const MEANS_H = 270;
/** The tallest a single early block is drawn, before the chart has to zoom out. */
const BLOCK = 20;
const STRIP_Y = 470;
const TICKS = [0, 10, 20, 30, 40, 50];
const MEDIAN = [...WAITS].sort((a, b) => a - b)[POP_SIZE / 2];
const N30 = SPREADS[1];
/** Raw values are blue, a sample's in a deeper blue; a statistic (each
 *  average, and the pile of them) takes the accent, as in the parts of
 *  Unit 5 on either side of this one. */
const SAMPLE_FILL = ds("blue", 800);

/** Seeded vertical jitter for the sampled dots, so they read as a strip. */
const JITTER = (() => {
  const r = mulberry32(99);
  return Array.from({ length: 30 }, () => r());
})();

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** Tick labels, with the unit on the last one only. */
const minutes = (v: number) => (v === 50 ? "50 min" : String(v));
const meansHist = (k: number) =>
  histogram(
    SAMPLES_30.slice(0, k).map((s) => s.mean),
    0,
    50,
    MEAN_BIN,
  );

/**
 * Act 1, hook to "Central Limit Theorem": ten thousand wait times, then one
 * sample of thirty collapsing into its average, the average dropping into a
 * second figure, and two thousand of them building the bell.
 */
export const BuildScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = useNarration();
  const { y, h, pts } = useLayout();
  const fig = useFigNumber();

  // ── Cues ──
  const lopsidedAt = n.word("hook", "lopsided");
  const coffeeAt = n.word("hook", "coffee");
  const fewAt = n.word("shape", "few");
  const twentyAt = n.word("shape", "twenty");
  const avgAt = n.word("center", "average");
  const spreadAt = n.word("center", "spread");
  const sampleFrom = n.beat("sample").from;
  const pickAt = n.word("sample", "pick");
  const averageAt = n.word("sample", "average");
  const dropFrom = n.beat("drop").from;
  const blockAt = n.word("drop", "block");
  const pick2 = n.word("repeat", "Pick");
  const more2 = n.word("repeat", "thirty more", { nth: 2 });
  const thousandAt = n.word("repeat", "two thousand");
  const piledAt = n.word("bell", "piled");
  const bellAt = n.word("bell", "bell");
  const centeredAt = n.word("bell", "centered");
  const cltFrom = n.beat("clt").from;
  const theoremAt = n.word("clt", "Central");
  const stayAt = n.word("clt", "lopsided");
  const normalAt = n.word("clt", "normal");

  // ── Layout morph: the population shrinks to the top half ──
  const morphAt = sampleFrom - 14;
  const m = ease(frame, morphAt, 26);
  const popBase = lerp(860, 420, m);
  const popUnit = lerp(400, 190, m) / POP_MAX;
  // The finished first figure (average, spread) holds a second after the
  // sentence that reads it; "center" carries the pause.
  const p1Out = morphAt - 4;

  // ── The first three samples, choreographed; then two thousand ──
  const steps = [
    { s: pickAt, c: averageAt, d: blockAt, stagger: 0.7, collapse: 14 },
    { s: pick2, c: pick2 + 13, d: pick2 + 24, stagger: 0.25, collapse: 9 },
    { s: more2, c: more2 + 13, d: more2 + 24, stagger: 0.25, collapse: 9 },
  ];
  const DROP = 13;
  const fastFrom = more2 + 24 + DROP + 4;
  const fastTo = Math.max(fastFrom + 30, piledAt);
  let k = steps.filter((st) => frame >= st.d + DROP).length;
  if (frame >= fastFrom) {
    const p = Math.min(1, (frame - fastFrom) / (fastTo - fastFrom));
    k = Math.min(SAMPLE_COUNT, Math.round(3 * (SAMPLE_COUNT / 3) ** p));
  }
  const kBefore =
    frame >= fastFrom
      ? Math.round(3 * (SAMPLE_COUNT / 3) ** Math.max(0, Math.min(1, (frame - 2 - fastFrom) / (fastTo - fastFrom))))
      : k;
  const counts = meansHist(k);
  const recent = counts.map((c, i) => c - (meansHist(Math.min(k, kBefore))[i] ?? 0));
  const maxCount = Math.max(1, ...counts);
  const unit = Math.min(BLOCK, MEANS_H / maxCount);
  const finalUnit = MEANS_H / Math.max(...meansHist(SAMPLE_COUNT));

  // The sample on screen, and what its dots are doing.
  const active = steps.findIndex((st, i) => frame >= st.s && (i === 2 ? frame < st.d + DROP : frame < steps[i + 1].s));
  const fastSample = frame >= fastFrom && frame < fastTo + 4 ? Math.max(0, k - 1) : -1;

  // FIG. 2 arrives while FIG. 1 is still shrinking, so the lower half of
  // the page fills as the upper half empties.
  const figTwoAt = morphAt + 8;
  const meansFig = ease(frame, figTwoAt, 18);
  const counter = ease(frame, dropFrom + 6, 14);

  return (
    <AbsoluteFill>
      {/* ── Sound (merged video only; the standalone has sfx off): the underline,
          the queue, a sample's dots, the first averages landing, the thousands,
          the bell ── */}
      <Sfx name="el-pencil" at={lopsidedAt} level={-33} />
      <Sfx name="el-pop" at={coffeeAt - 6} level={-30} />
      <Sfx name="el-sprinkle" at={pickAt} level={-34} />
      <Sfx name="el-tap" at={blockAt + DROP} level={-28} />
      <Sfx name="el-tap" at={steps[1].d + DROP} level={-29} />
      <Sfx name="el-sprinkle" at={fastFrom} level={-33} />
      <Sfx name="el-pop" at={bellAt} level={-30} />

      {/* ── P1: headline, deck and the population at full size ── */}
      <Ink at={2} dur={14} out={p1Out} style={{ left: 96, top: y(112) }}>
        <span style={label(20, ACCENT_INK)}>
          <PartName />Waiting in line
        </span>
      </Ink>
      <Ink at={4} dur={20} out={p1Out} style={{ left: 92, top: y(150), ...headline(92), whiteSpace: "nowrap" }}>
        Waiting for coffee
      </Ink>
      <Ink at={10} dur={20} out={p1Out} style={{ left: 92, top: y(246), ...headline(92), whiteSpace: "nowrap" }}>
        is{" "}
        <span style={{ position: "relative", fontStyle: "italic", fontWeight: "var(--clt-head-italic-wght)" }}>
          lopsided.
          {/* Sized in em and to the word, so it underlines it in any face. */}
          <svg
            viewBox="0 0 380 30"
            style={{
              position: "absolute",
              left: -6,
              top: "0.93em",
              width: "calc(100% + 12px)",
              height: "auto",
              overflow: "visible",
            }}
          >
            <path
              d="M4,18 C80,8 190,6 372,14"
              fill="none"
              stroke={ACCENT}
              strokeWidth={5}
              strokeLinecap="round"
              pathLength={1}
              strokeDasharray={`${ease(frame, lopsidedAt, 14)} 1`}
              opacity={frame > lopsidedAt ? 1 : 0}
            />
          </svg>
        </span>
      </Ink>
      <Illustration
        video={VIDEO}
        id="clt-coffee-queue"
        style={{
          position: "absolute",
          left: 1380,
          top: y(104),
          width: 420,
          height: 291,
          opacity: pop(frame, coffeeAt - 6, fps, 16) * (1 - ease(frame, p1Out, 12)),
          transform: `translateY(${bob(frame, 5, 110) + (1 - pop(frame, coffeeAt - 6, fps, 16)) * 30}px)`,
        }}
      />

      {/* FIG. 1 label: under the headline, then at the top of the page. */}
      <FigLabel
        n={fig(1)}
        title="Ten thousand coffee shop waits, in minutes"
        at={14}
        x={160}
        y={y(lerp(384, 150, m))}
      />

      {/* ── The population ── */}
      <Bars
        counts={POP_COUNTS}
        lo={0}
        bin={1}
        scale={X}
        base={y(popBase)}
        unit={h(popUnit)}
        grow={(i) => ease(frame, 6 + i * 1.1, 16)}
      />
      <Axis scale={X} base={y(popBase)} ticks={TICKS} at={4} format={minutes} />
      <Note at={20} x={1762} y={y(popBase - 46)} align="right" out={p1Out} style={note(20, INK_SOFT)}>
        {OVER_50} waits ran past 50 min
      </Note>

      {/* "Most wait a few minutes." */}
      <Leader points={pts([[560, 526], [390, 526], [292, 580]])} at={fewAt} out={avgAt} />
      <Note at={fewAt} x={568} y={y(500)} out={avgAt}>
        <div style={{ ...body(30, true), color: INK }}>Most wait a few minutes.</div>
        <div style={note(23, INK_SOFT)}>Half of all waits are under {fmt(MEDIAN, 1)} min.</div>
      </Note>

      {/* "About one in twenty waits half an hour or more." */}
      <Leader
        points={pts([
          [sx(X, 30), 812],
          [sx(X, 30), 798],
          [sx(X, 50), 798],
          [sx(X, 50), 812],
        ])}
        at={twentyAt - 4}
        dur={16}
        dot={false}
        color={ACCENT}
        width={2}
        out={p1Out}
      />
      <Note at={twentyAt} x={sx(X, 30)} y={y(704)} out={p1Out}>
        <div style={{ ...body(30, true), color: INK }}>About one in twenty waits 30 min or more.</div>
        <div style={note(23, INK_SOFT)}>
          {fmt(SHARE_30 * 100, 1)}% of the {POP_SIZE.toLocaleString("en-US")} customers
        </div>
      </Note>

      {/* Average and spread. */}
      <Leader
        points={pts([
          [sx(X, WAIT_MU), 860],
          [sx(X, WAIT_MU), 444],
        ])}
        at={avgAt - 4}
        dur={14}
        dot={false}
        color={ACCENT}
        width={2.2}
        dash="7 6"
        out={p1Out}
      />
      <Note at={avgAt} x={sx(X, WAIT_MU) + 14} y={y(428)} out={p1Out}>
        <span style={{ ...body(30, true), color: INK }}>Average </span>
        <span style={{ ...note(28, ACCENT_INK), fontWeight: 700 }}>{fmt(WAIT_MU)} min</span>
      </Note>
      <SpreadArrow from={sx(X, WAIT_MU)} to={sx(X, WAIT_MU + WAIT_SD)} y={y(546)} at={spreadAt - 2} out={p1Out} />
      <Note at={spreadAt + 2} x={sx(X, WAIT_MU) + 14} y={y(560)} out={p1Out}>
        <span style={{ ...note(25, INK) }}>
          Spread <span style={{ fontWeight: 700, color: ACCENT_INK }}>{fmt(WAIT_SD)} min</span>
        </span>
        <span style={{ ...note(21, INK_SOFT), marginLeft: 10 }}>one standard deviation</span>
      </Note>

      {/* ── P2: the sample strip, the averages, the second figure ── */}
      <Ink at={morphAt + 4} dur={20} out={cltFrom} style={{ left: 1180, top: y(130), ...headline(54), lineHeight: 1.08 }}>
        Average thirty waits.
      </Ink>
      <Ink at={pick2 - 4} dur={18} out={cltFrom} style={{ left: 1180, top: y(188), ...headline(54, true), color: ACCENT_INK }}>
        Then do it again.
      </Ink>
      <Ink at={theoremAt - 4} dur={22} style={{ left: 1180, top: y(120), ...headline(60), lineHeight: 1.04 }}>
        The Central
        <br />
        Limit Theorem
      </Ink>

      {active >= 0 ? <SampleDots step={steps[active]} index={active} /> : null}
      {fastSample >= 0 ? <FastDots index={fastSample} /> : null}

      <FigLabel n={fig(2)} title="The average wait in each sample of 30" at={figTwoAt} x={160} y={y(560)} />
      <Axis scale={X} base={y(MEANS_BASE)} ticks={TICKS} at={figTwoAt} opacity={meansFig} format={minutes} />
      <Bars
        counts={counts}
        lo={0}
        bin={MEAN_BIN}
        scale={X}
        base={y(MEANS_BASE)}
        unit={h(unit)}
        color={ACCENT}
        overlay={frame < fastTo + 6 ? { counts: recent, color: ds("red", 800) } : undefined}
      />
      {steps.map((st, i) => (
        <FallingBlock key={i} step={st} index={i} drop={DROP} />
      ))}

      {/* Counter, right column. */}
      <div style={{ position: "absolute", left: 1010, top: y(612), opacity: counter }}>
        <div style={label(20, INK_SOFT)}>Samples drawn</div>
        <div
          style={{
            ...headline(124),
            ...TABULAR,
            marginTop: 6,
            color: k >= SAMPLE_COUNT ? INK : ACCENT_INK,
          }}
        >
          {k.toLocaleString("en-US")}
        </div>
        <div style={{ ...body(28, true), marginTop: 6 }}>of 30 customers each</div>
      </div>
      <Note at={thousandAt} x={1012} y={y(822)} from="up" out={centeredAt}>
        <span style={note(22, INK_SOFT)}>each one a different 30 of the 10,000</span>
      </Note>

      {/* The bell. */}
      <NormalCurve
        scale={X}
        base={y(MEANS_BASE)}
        unit={h(finalUnit)}
        mu={WAIT_MU}
        sd={WAIT_SD / Math.sqrt(30)}
        count={SAMPLE_COUNT}
        bin={MEAN_BIN}
        at={bellAt - 2}
        color={INK}
        width={2.4}
      />
      <BrassBell at={bellAt} />
      {/* The pile's center, up through the population: broken where it would
          cross Fig. 2's title and Fig. 1's tick labels. */}
      {[
        [MEANS_BASE, 598],
        [552, 456],
        [420, 236],
      ].map(([from, to], i) => (
        <Leader
          key={i}
          points={pts([
            [sx(X, N30.center), from],
            [sx(X, N30.center), to],
          ])}
          at={centeredAt - 2 + i * 4}
          dur={14}
          dot={false}
          color={INK}
          width={2}
          dash="7 6"
        />
      ))}
      <Note at={centeredAt + 4} x={sx(X, N30.center) + 14} y={y(512)}>
        <span style={note(23, ACCENT_INK)}>
          <b>Centered on {fmt(N30.center)} min.</b>{" "}
          <span style={{ color: INK_SOFT }}>The population average is {fmt(WAIT_MU)}.</span>
        </span>
      </Note>

      {/* The theorem, in two tags. */}
      <Leader points={pts([[742, 318], [700, 318], [652, 372]])} at={stayAt - 2} />
      <Note at={stayAt} x={752} y={y(304)}>
        <span style={label(20, INK)}>The waits: still lopsided</span>
      </Note>
      <Leader points={pts([[690, 708], [640, 708], [578, 772]])} at={normalAt - 2} color={ACCENT} />
      <Note at={normalAt} x={700} y={y(694)}>
        <span style={label(20, ACCENT_INK)}>Their averages: normal</span>
      </Note>
    </AbsoluteFill>
  );
};

/** A double-headed hairline arrow for "one SD". */
const SpreadArrow: React.FC<{ from: number; to: number; y: number; at: number; out: number }> = ({
  from,
  to,
  y,
  at,
  out,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 14);
  const o = 1 - ease(frame, out, 10);
  if (p <= 0 || o <= 0) return null;
  const x = from + (to - from) * p;
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, opacity: o }}>
      <line x1={from} x2={x} y1={y} y2={y} stroke={INK} strokeWidth={1.8} />
      <path d={`M${from + 10},${y - 6} L${from},${y} L${from + 10},${y + 6}`} fill="none" stroke={INK} strokeWidth={1.8} />
      <path d={`M${x - 10},${y - 6} L${x},${y} L${x - 10},${y + 6}`} fill="none" stroke={INK} strokeWidth={1.8} />
    </svg>
  );
};

type Step = { s: number; c: number; d: number; stagger: number; collapse: number };

/** One sample of thirty as deep-blue dots under the population, which then
 *  slide together into their average and turn the accent as they meet. */
const SampleDots: React.FC<{ step: Step; index: number }> = ({ step, index }) => {
  const frame = useCurrentFrame();
  const { y } = useLayout();
  const sample = SAMPLES_30[index];
  const mx = sx(X, sample.mean);
  const c = ease(frame, step.c, step.collapse);
  const labelIn = index === 0 ? ease(frame, step.c + step.collapse - 2, 10) : 0;
  const labelOut = ease(frame, step.d - 2, 6);
  return (
    <>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        {sample.values.map((v, j) => {
          const appear = ease(frame, step.s + j * step.stagger, 6);
          if (appear <= 0 || c >= 1) return null;
          const x = lerp(sx(X, Math.min(v, 50)), mx, c);
          return (
            <circle
              key={j}
              cx={x}
              cy={y(lerp(STRIP_Y + JITTER[j] * 44, STRIP_Y + 22, c))}
              r={6.5 * appear}
              fill={c > 0.5 ? ACCENT : SAMPLE_FILL}
              stroke={PAPER}
              strokeWidth={1.5}
              opacity={1 - c * 0.7}
            />
          );
        })}
      </svg>
      {index === 0 ? (
        <>
          <Note at={step.s + 4} x={1180} y={y(STRIP_Y + 62)} out={step.c}>
            <span style={label(20, BLUE_INK)}>30 customers, picked at random</span>
          </Note>
          <div
            style={{
              position: "absolute",
              left: mx + 16,
              top: y(STRIP_Y + 4),
              opacity: labelIn * (1 - labelOut),
              whiteSpace: "nowrap",
              ...body(28, true),
              color: ACCENT_INK,
            }}
          >
            their average: {fmt(sample.mean)} min
          </div>
        </>
      ) : null}
    </>
  );
};

/** During the fast build, the newest sample's dots, swapped every frame. */
const FastDots: React.FC<{ index: number }> = ({ index }) => {
  const { y } = useLayout();
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, opacity: 0.7 }}>
      {SAMPLES_30[index].values.map((v, j) => (
        <circle key={j} cx={sx(X, Math.min(v, 50))} cy={y(STRIP_Y + JITTER[j] * 44)} r={5} fill={SAMPLE_FILL} />
      ))}
    </svg>
  );
};

/** The average, as one block: it forms where the dots met and falls into its
 *  bin in FIG. 2. Gone once it has landed (the bars take over). */
const FallingBlock: React.FC<{ step: Step; index: number; drop: number }> = ({ step, index, drop }) => {
  const frame = useCurrentFrame();
  const { y, h } = useLayout();
  const formed = ease(frame, step.c + step.collapse - 4, 6);
  if (formed <= 0 || frame >= step.d + drop) return null;
  const mean = SAMPLES_30[index].mean;
  const bin = Math.floor(mean / MEAN_BIN);
  const x = sx(X, bin * MEAN_BIN) + 1;
  const w = sx(X, (bin + 1) * MEAN_BIN) - sx(X, bin * MEAN_BIN) - 2;
  const below = SAMPLES_30.slice(0, index).filter((s) => Math.floor(s.mean / MEAN_BIN) === bin).length;
  const startY = STRIP_Y + 22 - BLOCK / 2;
  const endY = MEANS_BASE - (below + 1) * BLOCK;
  const t = Math.max(0, Math.min(1, (frame - step.d) / drop));
  // Falls under gravity: slow off the strip, fast into the bin.
  const top = startY + (endY - startY) * t * t;
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
      <rect x={x} y={y(top)} width={w} height={h(BLOCK * formed)} fill={ACCENT} />
    </svg>
  );
};

/** The brass bell rings in on "bell": a swing that dies away. */
const BrassBell: React.FC<{ at: number }> = ({ at }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { y } = useLayout();
  const p = pop(frame, at - 4, fps, 13);
  if (p <= 0.001) return null;
  const t = Math.max(0, frame - at);
  const swing = Math.sin(t / 3.2) * 14 * Math.exp(-t / 22);
  return (
    <Illustration
      video={VIDEO}
      id="clt-brass-bell"
      style={{
        position: "absolute",
        left: 1520,
        top: y(590),
        width: 220,
        height: 262,
        opacity: p,
        transformOrigin: "50% 8%",
        transform: `translateY(${(1 - p) * 40}px) rotate(${swing}deg)`,
      }}
    />
  );
};

