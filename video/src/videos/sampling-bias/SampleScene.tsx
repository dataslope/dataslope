import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Illustration } from "../../components/Illustration";
import { bob, ease, pop } from "../../components/motion";
import { Axis, Bars, sx, type XScale } from "../../editorial/charts";
import { useLayout } from "../../editorial/layout";
import { body, fmt, halo, headline, HIGHLIGHT, INK, INK_SOFT, label, note } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import {
  FIRST_EASY,
  FIRST_RANDOM,
  ILLUSTRATIONS,
  LIKELIER,
  mulberry32,
  POP_BIN,
  POP_HIST,
  POP_SIZE,
  SAMPLE_N,
  SHARE_ABOVE,
  THRESHOLD,
  TRUE_MEAN,
  VIDEO,
  type Sample,
} from "./data";
import { Bracket, DOT, EASY, EASY_INK, HAPPY, RANDOM, RANDOM_INK, RAW, TruthLine, Underline } from "./parts";
import { useFigNumber } from "../sampling/merged";
import { PartName } from "../sampling/PartName";

/** Fig. 1: every score from 0 to 100, across the page. */
const X1: XScale = { lo: 0, hi: 100, x0: 160, x1: 1760 };
/** Fig. 2: the averages, 66 to 84 enlarged under the part of Fig. 1 it shows. */
const X2: XScale = { lo: 66, hi: 84, x0: 700, x1: 1760 };
const MEAN_BIN = 0.25;
const POP_MAX = Math.max(...POP_HIST);
/** The population at full size (before the first sample), then at the top. */
const BIG = { base: 860, height: 400 };
const SMALL = { base: 410, height: 180 };
const STRIP_Y = 458;
const STRIP_H = 64;
const FIG2_BASE = 860;
const FIG2_TOP = 646;
const BLOCK = 15;
const DROP = 16;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const round2 = (x: number) => Math.round(x * 100) / 100;

/** Seeded vertical jitter, so 500 dots read as a strip rather than a line. */
const JITTER = (() => {
  const r = mulberry32(500);
  return Array.from({ length: SAMPLE_N }, () => r());
})();

/** Where an average's block lands in Fig. 2: its bin's left edge and width. */
const slotOf = (mean: number) => {
  const bin = Math.floor((mean - X2.lo) / MEAN_BIN);
  const x = sx(X2, X2.lo + bin * MEAN_BIN);
  return { x: x + 1, w: sx(X2, X2.lo + (bin + 1) * MEAN_BIN) - x - 2 };
};

/** The numbers as the page shows them, and the gap between the shown ones. */
const SHOWN = {
  truth: fmt(TRUE_MEAN),
  random: fmt(FIRST_RANDOM.mean),
  easy: fmt(FIRST_EASY.mean),
  under: fmt(round2(TRUE_MEAN) - round2(FIRST_RANDOM.mean)),
  over: fmt(round2(FIRST_EASY.mean) - round2(TRUE_MEAN)),
};

/**
 * Hook to "ten points too high": 200,000 satisfaction scores, then one sample
 * of 500 picked at random and one picked the easy way, each collapsing into
 * its average and dropping into an enlarged strip of the score axis.
 */
export const SampleScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = useNarration();
  const fig = useFigNumber();
  const { y, h } = useLayout();

  // ── Cues ──
  const customersAt = n.word("hook", "customers");
  const averageAt = n.word("truth", "average");
  const askAt = n.word("truth", "ask");
  const questionFrom = n.beat("question").from;
  const whichAt = n.word("question", "which");
  const randomFrom = n.beat("random").from;
  const pickAt = n.word("random", "Pick");
  const avgAt = n.word("random", "average");
  const sixtyAt = n.word("random", "sixty-nine");
  const littleAt = n.word("random", "little");
  const closeAt = n.word("random", "close");
  const easyFrom = n.beat("easy").from;
  const takeAt = n.word("easy", "take");
  const aboveAt = n.word("easy", "above");
  const elevenAt = n.word("easy", "eleven");
  const pickedAt = n.word("easy", "picked");
  const highFrom = n.beat("high").from;
  const eightyAt = n.word("high", "eighty");
  const tenAt = n.word("high", "ten points");
  // Things the figure shows while it is talked about: the score's range as
  // it is named, and the happy customers the easy way finds.
  const scoreAt = n.word("hook", "score");
  const outOfAt = n.word("hook", "out of a hundred", { edge: "end" });
  const happyAt = n.word("easy", "Happy customers");

  // ── Layout morph: the population shrinks to the top of the page ──
  const morphAt = randomFrom - 16;
  const m = ease(frame, morphAt, 26);
  const base = lerp(BIG.base, SMALL.base, m);
  const unit = lerp(BIG.height, SMALL.height, m) / POP_MAX;
  const popTop = base - lerp(BIG.height, SMALL.height, m);
  const p1Out = morphAt - 4;
  const fig2At = morphAt + 10;
  const fig2 = ease(frame, fig2At, 18);

  const truthX = sx(X1, TRUE_MEAN);
  const truth2X = sx(X2, TRUE_MEAN);
  const steps = {
    random: { sample: FIRST_RANDOM, s: pickAt - 2, c: avgAt - 2, d: avgAt + 14, out: easyFrom },
    easy: { sample: FIRST_EASY, s: takeAt, c: highFrom, d: highFrom + 16, out: Number.POSITIVE_INFINITY, tint: happyAt },
  };
  const randomSlot = slotOf(FIRST_RANDOM.mean);
  const easySlot = slotOf(FIRST_EASY.mean);
  const landed = (d: number) => ease(frame, d + DROP - 2, 4);
  const scoop = ILLUSTRATIONS ? pop(frame, questionFrom - 4, fps, 16) * (1 - ease(frame, p1Out, 12)) : 0;
  const band = ease(frame, aboveAt - 2, 16);

  return (
    <AbsoluteFill>
      {/* ── Sound: each cued from the frame of the animation it belongs to ── */}
      <Sfx name="riffle" at={4} level={-38} />
      <Sfx name="swish" at={whichAt} level={-34} />
      <Sfx name="slide" at={morphAt} level={-36} />
      <Sfx name="sprinkle-1" at={steps.random.s} level={-31} />
      <Sfx name="gather" at={steps.random.c} level={-33} />
      <Sfx name="tock-mid" at={steps.random.d + DROP - 1} level={-23} />
      <Sfx name="sprinkle-2" at={steps.easy.s} level={-31} />
      <Sfx name="gather" at={steps.easy.c} level={-33} />
      <Sfx name="tock-high" at={steps.easy.d + DROP - 1} level={-23} />
      <Sfx name="swish" at={tenAt - 4} level={-34} />

      {/* ── P1: the question, over the population at full size ── */}
      <Ink at={2} dur={14} out={p1Out} style={{ left: 96, top: y(112) }}>
        <span style={label(20, INK_SOFT)}>
          <PartName />A satisfaction survey
        </span>
      </Ink>
      <Ink at={askAt - 4} dur={20} out={p1Out} style={{ left: 92, top: y(150), ...headline(84), whiteSpace: "nowrap" }}>
        Ask five hundred of them.
      </Ink>
      <Ink
        at={questionFrom - 2}
        dur={20}
        out={p1Out}
        style={{ left: 92, top: y(246), ...headline(84, true), whiteSpace: "nowrap" }}
      >
        Does it matter <Underline at={whichAt}>which?</Underline>
      </Ink>
      {scoop > 0.001 ? (
        <Illustration
          video={VIDEO}
          id="sampling-bias-scoop"
          style={{
            position: "absolute",
            left: 1330,
            top: y(104),
            width: 450,
            height: 300,
            opacity: scoop,
            transform: `translateY(${bob(frame, 5, 110) + (1 - scoop) * 30}px)`,
          }}
        />
      ) : null}

      <FigLabel
        n={fig(1)}
        title={`Satisfaction scores of ${POP_SIZE.toLocaleString("en-US")} customers`}
        at={customersAt - 8}
        x={160}
        y={y(lerp(384, 112, m))}
      />

      {/* The easy way's weighting, behind the bars it favours. */}
      {band > 0 ? (
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, opacity: band }}>
          <rect
            x={sx(X1, THRESHOLD)}
            y={y(popTop - 34)}
            width={sx(X1, 100) - sx(X1, THRESHOLD)}
            height={y(base) - y(popTop - 34)}
            fill={HIGHLIGHT}
            opacity={0.5}
          />
        </svg>
      ) : null}

      {/* "anyone above seventy-five": the line the easy way favours. */}
      <TruthLine x={sx(X1, THRESHOLD)} bottom={y(base)} top={y(popTop - 34)} at={aboveAt - 2} color={EASY} width={2.4} />

      {/* The window Fig. 2 enlarges. */}
      <ZoomFan at={fig2At} base={base} />

      <Bars
        counts={POP_HIST}
        lo={0}
        bin={POP_BIN}
        scale={X1}
        base={y(base)}
        unit={h(unit)}
        color={RAW}
        grow={(i) => ease(frame, 4 + i * 0.7, 16)}
      />
      <Axis scale={X1} base={y(base)} ticks={[0, 25, 50, 75, 100]} at={4} />
      {/* "a satisfaction score out of a hundred": the scale drawn over in the
          accent as it is named, then handed back to the ink. */}
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, opacity: 1 - ease(frame, averageAt - 16, 16) }}>
        <line
          x1={X1.x0}
          x2={X1.x0 + (X1.x1 - X1.x0) * ease(frame, scoreAt - 2, Math.max(8, outOfAt - scoreAt))}
          y1={y(base)}
          y2={y(base)}
          stroke={EASY}
          strokeWidth={3.5}
          strokeLinecap="round"
          opacity={ease(frame, scoreAt - 2, 4)}
        />
      </svg>

      {/* The truth. */}
      <TruthLine x={truthX} bottom={y(base)} top={y(popTop - 22)} at={averageAt - 4} />
      <div
        style={{
          position: "absolute",
          right: 1920 - truthX + 14,
          top: y(popTop - 46),
          whiteSpace: "nowrap",
          opacity: ease(frame, averageAt, 12),
          ...halo,
        }}
      >
        <span style={note(22, INK_SOFT)}>True average </span>
        <span style={{ ...note(24, INK), fontWeight: 700 }}>{SHOWN.truth}</span>
      </div>

      {/* "anyone above seventy-five", then "eleven times as likely". */}
      <Note at={aboveAt - 2} x={sx(X1, THRESHOLD) + 14} y={y(popTop - 76)}>
        <span style={{ ...label(21, INK), ...halo }}>
          Above {THRESHOLD}:{" "}
          <span style={{ opacity: ease(frame, elevenAt - 4, 12) }}>picked {LIKELIER} times as often</span>
        </span>
      </Note>

      {/* ── P2: the two headlines, top left ── */}
      <Ink at={randomFrom - 4} dur={18} style={{ left: 96, top: y(190), ...headline(52), whiteSpace: "nowrap" }}>
        Five hundred, <span style={{ color: RANDOM_INK }}>at random.</span>
      </Ink>
      <Ink at={takeAt - 6} dur={18} style={{ left: 96, top: y(258), ...headline(52, true), whiteSpace: "nowrap" }}>
        Five hundred, <span style={{ color: EASY_INK }}>the easy way.</span>
      </Ink>

      {/* ── The samples ── */}
      <SampleDots {...steps.random} />
      <SampleDots {...steps.easy} />

      {/* ── Fig. 2: the averages ── */}
      <FigLabel n={fig(2)} title="Each sample's average" at={fig2At} x={160} y={y(612)} />
      <Axis
        scale={X2}
        base={y(FIG2_BASE)}
        ticks={[66, 68, 70, 72, 74, 76, 78, 80, 82, 84]}
        at={fig2At}
        opacity={fig2}
      />
      <TruthLine x={truth2X} bottom={y(FIG2_BASE)} top={y(FIG2_TOP)} at={fig2At + 6} />
      <Note at={fig2At + 12} x={truth2X + 12} y={y(FIG2_TOP - 10)}>
        <span style={{ ...note(20, INK_SOFT), ...halo }}>true {SHOWN.truth}</span>
      </Note>

      <FallingBlock step={steps.random} slot={randomSlot} color={RANDOM} />
      <FallingBlock step={steps.easy} slot={easySlot} color={EASY} />

      {/* The random one: just under the truth. */}
      <div
        style={{
          position: "absolute",
          right: 1920 - (randomSlot.x - 16),
          top: y(FIG2_BASE - 70),
          textAlign: "right",
          whiteSpace: "nowrap",
          opacity: ease(frame, sixtyAt - 2, 10) * landed(steps.random.d),
        }}
      >
        <div style={{ ...note(30, RANDOM_INK), fontWeight: 700 }}>{SHOWN.random}</div>
        <div style={note(20, INK_SOFT)}>at random</div>
      </div>
      <Note at={littleAt - 2} x={160} y={y(690)} out={takeAt}>
        <div style={{ ...body(32, true), color: INK }}>
          A little low,{" "}
          <span style={{ opacity: ease(frame, closeAt - 2, 12) }}>but close.</span>
        </div>
        <div style={{ ...note(22, INK_SOFT), marginTop: 6, opacity: ease(frame, closeAt + 6, 12) }}>
          {SHOWN.under} under the true average
        </div>
      </Note>

      {/* The easy one: far over it. */}
      <div
        style={{
          position: "absolute",
          left: easySlot.x + easySlot.w + 16,
          top: y(FIG2_BASE - 70),
          whiteSpace: "nowrap",
          opacity: ease(frame, eightyAt - 2, 10) * landed(steps.easy.d),
        }}
      >
        <div style={{ ...note(30, EASY_INK), fontWeight: 700 }}>{SHOWN.easy}</div>
        <div style={note(20, INK_SOFT)}>the easy way</div>
      </div>
      <Note at={pickedAt} x={160} y={y(690)}>
        <div style={{ ...body(32, true), color: INK }}>
          {Math.round(FIRST_EASY.shareAbove * 100)}% of these 500 score over {THRESHOLD}.
        </div>
        <div style={{ ...note(22, INK_SOFT), marginTop: 6 }}>
          Of all {POP_SIZE.toLocaleString("en-US")} customers, {Math.round(SHARE_ABOVE * 100)}% do.
        </div>
      </Note>
      <Bracket
        x0={truth2X}
        x1={easySlot.x + easySlot.w / 2}
        y={y(FIG2_BASE - 118)}
        at={tenAt - 4}
        color={EASY}
      />
      <Note at={tenAt} x={(truth2X + easySlot.x) / 2} y={y(FIG2_BASE - 166)} from="up">
        <span style={{ display: "inline-block", transform: "translateX(-50%)", whiteSpace: "nowrap", ...halo }}>
          <span style={{ ...note(26, EASY_INK), fontWeight: 700 }}>{SHOWN.over} points</span>
          <span style={note(22, INK_SOFT)}> too high</span>
        </span>
      </Note>
    </AbsoluteFill>
  );
};

/** Dashed hairlines from the stretch of Fig. 1 that Fig. 2 enlarges down to
 *  Fig. 2's ends. They stop above the strip of sample dots and pick up again
 *  below it, so they never run through the customers. */
const ZoomFan: React.FC<{ at: number; base: number }> = ({ at, base }) => {
  const frame = useCurrentFrame();
  const { y } = useLayout();
  const p = ease(frame, at, 18);
  if (p <= 0) return null;
  const a = sx(X1, X2.lo);
  const b = sx(X1, X2.hi);
  const from = STRIP_Y + STRIP_H + 10;
  const to = FIG2_TOP - 4;
  const line = { stroke: INK_SOFT, strokeWidth: 1.2, strokeDasharray: "3 6", opacity: 0.8 };
  const above = y(STRIP_Y) - 10;
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, opacity: p }}>
      {above > y(base) + 4 ? (
        <>
          <line x1={a} x2={a} y1={y(base) + 4} y2={above} {...line} />
          <line x1={b} x2={b} y1={y(base) + 4} y2={above} {...line} />
        </>
      ) : null}
      <line x1={a} y1={y(from)} x2={a + (X2.x0 - a) * p} y2={y(from + (to - from) * p)} {...line} />
      <line x1={b} y1={y(from)} x2={b + (X2.x1 - b) * p} y2={y(from + (to - from) * p)} {...line} />
    </svg>
  );
};

/** `tint`: from when the sample's happy customers (above THRESHOLD) take the
 *  band's yellow, a sweep from the threshold up. */
type Step = { sample: Sample; s: number; c: number; d: number; out: number; tint?: number };

/** One sample of 500 as dots under the population, which then slide together
 *  into their average. */
const SampleDots: React.FC<Step> = ({ sample, s, c, out, tint }) => {
  const frame = useCurrentFrame();
  const { y } = useLayout();
  if (frame < s) return null;
  const collapse = ease(frame, c, 14);
  const gone = Number.isFinite(out) ? ease(frame, out, 10) : 0;
  if (collapse >= 1 || gone >= 1) return null;
  const mx = sx(X1, sample.mean);
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, opacity: 1 - gone }}>
      {sample.values.map((v, j) => {
        const appear = ease(frame, s + j * 0.03, 6);
        if (appear <= 0) return null;
        const x = lerp(sx(X1, v), mx, collapse);
        const cy = lerp(STRIP_Y + JITTER[j] * STRIP_H, STRIP_Y + STRIP_H / 2, collapse);
        const warm = tint !== undefined && v > THRESHOLD ? ease(frame, tint + (v - THRESHOLD) * 0.7, 10) : 0;
        const fill = warm > 0 ? `color-mix(in srgb, ${HAPPY} ${Math.round(warm * 100)}%, ${DOT})` : DOT;
        return <circle key={j} cx={x} cy={y(cy)} r={3.6 * appear} fill={fill} opacity={1 - collapse * 0.6} />;
      })}
    </svg>
  );
};

/** The average, as one block: it forms where the dots met and falls into its
 *  bin in Fig. 2. */
const FallingBlock: React.FC<{ step: Step; slot: { x: number; w: number }; color: string }> = ({
  step,
  slot,
  color,
}) => {
  const frame = useCurrentFrame();
  const { y, h } = useLayout();
  const formed = ease(frame, step.c + 10, 6);
  if (formed <= 0) return null;
  const t = Math.max(0, Math.min(1, (frame - step.d) / DROP));
  const startX = sx(X1, step.sample.mean) - slot.w / 2;
  const startY = STRIP_Y + STRIP_H / 2 - BLOCK / 2;
  const endY = FIG2_BASE - BLOCK;
  // Falls under gravity: slow off the strip, fast into the bin.
  const top = startY + (endY - startY) * t * t;
  const x = lerp(startX, slot.x, t);
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
      <rect x={x} y={y(top)} width={slot.w} height={h(BLOCK) * formed} fill={color} />
    </svg>
  );
};
