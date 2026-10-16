import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { Axis, Bars, sx, type XScale } from "../../editorial/charts";
import { useLayout } from "../../editorial/layout";
import {
  ACCENT,
  ACCENT_INK,
  BAR,
  BLUE_INK,
  body,
  fmt,
  HAIRLINE,
  halo,
  headline,
  HIGHLIGHT,
  INK,
  INK_SOFT,
  label,
  note,
  PAPER,
} from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ds } from "../../theme/brand";
import { CHECK, histogram, mulberry32 } from "./data";
import { Marked, Span } from "./parts";
import { Marker } from "../sampling/emphasis";

/** One x-axis for both figures, so an average falls straight down from the
 *  population to the place it lands, and the pile's width compares with the
 *  population's directly. */
const X: XScale = { lo: 0, hi: 200, x0: 160, x1: 1360 };
const TICKS = [0, 50, 100, 150, 200];
const POP_BASE = 430;
const POP_H = 160;
const POP_UNIT = POP_H / Math.max(...CHECK.popHist.counts);
const STRIP_Y = 500;
const MEANS_BASE = 868;
const MEANS_H = 230;
const MEAN_BIN = 2;
/** The tallest a single early block is drawn, before the pile outgrows it. */
const BLOCK = 20;
const DROP = 13;
const COL = 1440;

const meansHist = (k: number) => histogram(CHECK.means.slice(0, k), 0, 200, MEAN_BIN);

const JITTER = (() => {
  const r = mulberry32(50);
  return Array.from({ length: CHECK.n }, () => r());
})();

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

type Step = { s: number; c: number; d: number; stagger: number; collapse: number };

/**
 * Act 3, "let's check it" to "without repeating anything": the lesson's
 * population of a million, one sample of fifty collapsing into its average,
 * the average falling into a second figure, ten thousand of them, and the
 * spread they pile up with beside the one-sample shortcut.
 */
export const CheckScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const checkFrom = n.beat("check").from;
  const popAt = n.word("pop", "population");
  const twentyFiveAt = n.word("pop", "twenty-five");
  const drawAt = n.word("pop", "Draw");
  const averageAt = n.word("pop", "average");
  const againAt = n.word("repeat", "again");
  const thousandAt = n.word("repeat", "ten thousand");
  const pileAt = n.word("pile", "pile");
  const spreadAt = n.word("pile", "spread");
  const fiveAt = n.word("pile", "three point five");
  const oneAt = n.word("match", "one sample");
  const sevenAt = n.word("match", "three point seven");
  const closeAt = n.word("match", "Close");
  // The stage is set as the check is announced; and once one sample's
  // shortcut lands close, the ten thousand repeats ease back.
  const checkItAt = n.word("check", "check it");
  const repeatingAt = n.word("match", "repeating");
  const notNeeded = 1 - 0.6 * ease(frame, repeatingAt - 2, 22);

  // ── The first two samples, choreographed; then ten thousand ──
  const steps: Step[] = [
    { s: drawAt, c: averageAt, d: averageAt + 18, stagger: 0.45, collapse: 14 },
    { s: againAt - 4, c: againAt + 9, d: againAt + 20, stagger: 0.15, collapse: 9 },
  ];
  const fastFrom = steps[1].d + DROP + 2;
  const fastTo = Math.max(fastFrom + 30, pileAt);
  const grown = (f: number) => {
    let k = steps.filter((st) => f >= st.d + DROP).length;
    if (f >= fastFrom) {
      const p = Math.min(1, (f - fastFrom) / (fastTo - fastFrom));
      k = Math.min(CHECK.samples, Math.round(2 * (CHECK.samples / 2) ** p));
    }
    return k;
  };
  const k = grown(frame);
  const counts = meansHist(k);
  const before = meansHist(grown(frame - 2));
  const recent = counts.map((c, i) => c - (before[i] ?? 0));
  const unit = Math.min(BLOCK, MEANS_H / Math.max(1, ...counts));
  const active = steps.findIndex((st, i) => frame >= st.s && (i === 1 ? frame < st.d + DROP : frame < steps[i + 1].s));
  const counter = ease(frame, drawAt + 4, 14);

  const center = CHECK.meansCenter;
  const pileSpanY = MEANS_BASE - 0.62 * MEANS_H;

  return (
    <AbsoluteFill>
      {/* ── Sound: the population, a sample, the first average landing, the
          thousands, the two spreads ── */}
      <Sfx name="el-pop" at={popAt - 4} level={-30} />
      <Sfx name="el-sprinkle" at={drawAt} level={-34} />
      <Sfx name="el-tap" at={steps[0].d + DROP} level={-28} />
      <Sfx name="el-sprinkle" at={fastFrom} level={-33} />
      <Sfx name="el-tap" at={fiveAt - 2} level={-29} />
      <Sfx name="el-tap" at={sevenAt - 2} level={-29} />

      <div style={{ position: "absolute", left: 92, top: y(112), display: "flex", gap: "0.26em", ...headline(56), whiteSpace: "nowrap" }}>
        <Ink at={checkFrom - 6} dur={20} style={{ position: "relative" }}>
          Check it the long way:
        </Ink>
        <Ink at={thousandAt - 4} dur={18} style={{ position: "relative", ...headline(56, true), color: ACCENT_INK }}>
          ten thousand samples.
        </Ink>
      </div>

      {/* ── Fig. 3: the population ── */}
      <FigLabel n="3" title={`A population of ${CHECK.popSize.toLocaleString("en-US")} values, centered on ${CHECK.mu}`} at={checkItAt - 4} x={160} y={y(200)} />
      <Bars
        counts={CHECK.popHist.counts}
        lo={CHECK.popHist.lo}
        bin={CHECK.popHist.bin}
        scale={X}
        base={y(POP_BASE)}
        unit={h(POP_UNIT)}
        grow={(i) => ease(frame, popAt - 4 + Math.abs(i - 25) * 0.6, 14)}
      />
      <Axis scale={X} base={y(POP_BASE)} ticks={TICKS} at={checkItAt} />
      <Span
        x0={sx(X, CHECK.mu - CHECK.sigma)}
        x1={sx(X, CHECK.mu + CHECK.sigma)}
        y={y(POP_BASE - 0.69 * POP_H)}
        at={twentyFiveAt - 4}
        dur={16}
        color={INK}
      />
      <Note at={twentyFiveAt} x={sx(X, CHECK.mu + CHECK.sigma) + 16} y={y(POP_BASE - 0.69 * POP_H) - 15}>
        <span style={{ ...note(24, BLUE_INK), fontWeight: 700, ...halo }}>± {CHECK.sigma}</span>
      </Note>

      {/* ── The samples ── */}
      {active >= 0 ? <SampleDots step={steps[active]} index={active} /> : null}
      {frame >= fastFrom && frame < fastTo + 4 ? <FastDots /> : null}
      <Note at={drawAt + 6} x={sx(X, 200) + 20} y={y(STRIP_Y - 14)} out={steps[0].c + 8}>
        <span style={label(20, INK_SOFT)}>{CHECK.n} values, drawn at random</span>
      </Note>

      {/* ── Fig. 4: the averages ── */}
      <FigLabel n="4" title={`The average of each sample of ${CHECK.n}`} at={drawAt - 4} x={160} y={y(568)} />
      <Axis scale={X} base={y(MEANS_BASE)} ticks={TICKS} at={drawAt - 2} />
      <div style={{ position: "absolute", inset: 0, opacity: notNeeded }}>
        <Bars
          counts={counts}
          lo={0}
          bin={MEAN_BIN}
          scale={X}
          base={y(MEANS_BASE)}
          unit={h(unit)}
          color={ACCENT}
          overlay={frame < fastTo + 6 ? { counts: recent, color: ds("red", 700) } : undefined}
        />
      </div>
      {steps.map((st, i) => (
        <FallingBlock key={i} step={st} index={i} />
      ))}
      <Span
        x0={sx(X, center - CHECK.measured)}
        x1={sx(X, center + CHECK.measured)}
        y={y(pileSpanY)}
        at={spreadAt - 2}
        dur={12}
        color={INK}
        width={2.2}
      />
      <Note at={spreadAt + 4} x={sx(X, center + CHECK.measured) + 14} y={y(pileSpanY) - 15}>
        <span style={{ ...note(24, ACCENT_INK), fontWeight: 700, ...halo }}>± {fmt(CHECK.measured)}</span>
      </Note>

      {/* ── Right column: the count, then the two spreads side by side ── */}
      <div style={{ position: "absolute", left: COL, top: y(214), opacity: counter * notNeeded }}>
        <div style={label(20, INK_SOFT)}>Samples drawn</div>
        <div
          style={{
            ...headline(104),
            fontVariantNumeric: "tabular-nums lining-nums",
            marginTop: 6,
            color: k >= CHECK.samples ? INK : ACCENT_INK,
          }}
        >
          {k.toLocaleString("en-US")}
        </div>
        <div style={{ ...body(28, true), marginTop: 8 }}>of {CHECK.n} values each</div>
      </div>

      <Ink at={spreadAt - 4} dur={14} style={{ left: COL, top: y(548), width: 384 }}>
        <div style={{ height: 1, background: INK, marginBottom: 16 }} />
        <div style={label(20, INK_SOFT)}>Spread of the {CHECK.samples.toLocaleString("en-US")} averages</div>
      </Ink>
      <Ink at={fiveAt - 2} dur={14} style={{ left: COL, top: y(612), display: "flex", alignItems: "baseline", gap: 16 }}>
        <span style={{ ...headline(64), color: ACCENT_INK, fontVariantNumeric: "tabular-nums lining-nums" }}>
          <Marked at={fiveAt + 6} color={HIGHLIGHT}>
            {fmt(CHECK.measured)}
          </Marked>
        </span>
        <span style={{ ...body(28, true) }}>measured</span>
      </Ink>
      <Ink at={oneAt - 4} dur={14} style={{ left: COL, top: y(708), width: 384 }}>
        <div style={{ height: 1, background: HAIRLINE, marginBottom: 16 }} />
        <div style={label(20, INK_SOFT)}>From one sample, s ÷ √{CHECK.n}</div>
      </Ink>
      <Ink at={sevenAt - 2} dur={14} style={{ left: COL, top: y(772), display: "flex", alignItems: "baseline", gap: 16 }}>
        <span style={{ ...headline(64), fontVariantNumeric: "tabular-nums lining-nums" }}>
          <Marker at={closeAt - 2}>{fmt(CHECK.estimated)}</Marker>
        </span>
        <span style={{ ...body(28, true) }}>estimated</span>
      </Ink>
      <Note at={closeAt + 2} x={COL} y={y(862)}>
        <span style={note(20, INK_SOFT)}>
          Theory, {CHECK.sigma} ÷ √{CHECK.n}: {fmt(CHECK.theory)}
        </span>
      </Note>
    </AbsoluteFill>
  );
};

/** One sample of fifty as dots under the population, which then slide
 *  together into their average. */
const SampleDots: React.FC<{ step: Step; index: number }> = ({ step, index }) => {
  const frame = useCurrentFrame();
  const { y } = useLayout();
  const values = CHECK.first[index];
  const mx = sx(X, CHECK.firstMeans[index]);
  const c = ease(frame, step.c, step.collapse);
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
      {values.map((v, j) => {
        const appear = ease(frame, step.s + j * step.stagger, 6);
        if (appear <= 0 || c >= 1) return null;
        return (
          <circle
            key={j}
            cx={lerp(sx(X, v), mx, c)}
            cy={y(lerp(STRIP_Y - 22 + JITTER[j] * 44, STRIP_Y, c))}
            r={5.5 * appear}
            fill={BAR}
            stroke={PAPER}
            strokeWidth={1.2}
            opacity={1 - c * 0.6}
          />
        );
      })}
    </svg>
  );
};

/** During the fast build, the newest sample's dots (cycled through the three
 *  the measurement kept), flickering to say that each block is a sample. */
const FastDots: React.FC = () => {
  const frame = useCurrentFrame();
  const { y } = useLayout();
  const values = CHECK.first[frame % CHECK.first.length];
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, opacity: 0.5 }}>
      {values.map((v, j) => (
        <circle key={j} cx={sx(X, v)} cy={y(STRIP_Y - 22 + JITTER[j] * 44)} r={4.5} fill={BAR} />
      ))}
    </svg>
  );
};

/** The average, as one block: it forms where the dots met and falls into its
 *  bin in Fig. 4. Gone once it has landed (the bars take over). */
const FallingBlock: React.FC<{ step: Step; index: number }> = ({ step, index }) => {
  const frame = useCurrentFrame();
  const { y, h } = useLayout();
  const formed = ease(frame, step.c + step.collapse - 4, 6);
  if (formed <= 0 || frame >= step.d + DROP) return null;
  const mean = CHECK.means[index];
  const bin = Math.floor(mean / MEAN_BIN);
  const x = sx(X, bin * MEAN_BIN) + 1;
  const w = sx(X, (bin + 1) * MEAN_BIN) - sx(X, bin * MEAN_BIN) - 2;
  const below = CHECK.means.slice(0, index).filter((m) => Math.floor(m / MEAN_BIN) === bin).length;
  const startY = STRIP_Y - BLOCK / 2;
  const endY = MEANS_BASE - (below + 1) * BLOCK;
  const t = Math.max(0, Math.min(1, (frame - step.d) / DROP));
  const top = startY + (endY - startY) * t * t;
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
      <rect x={x} y={y(top)} width={w} height={h(BLOCK * formed)} fill={ACCENT} />
    </svg>
  );
};

