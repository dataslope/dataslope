import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useNarration } from "../../narration/NarrationContext";
import { Axis, Bars, NormalCurve, sx, type XScale } from "./charts";
import { histogram, INCOME_MEANS, MEANS_30, mean, SAMPLE_COUNT, sd, skew } from "./data";
import { SERIF } from "./fonts";
import { ACCENT, ACCENT_INK, body, fmt, halo, headline, INK, INK_SOFT, note, label } from "./style";
import { FigLabel, Ink, Leader, Note } from "./ui";

const X0 = 980;
const X1 = 1780;
const ROW_H = 140;
const BINS = 35;
const TOPS = [150, 394, 638];

/**
 * Each row spans the same stretch of its own standard deviations (2.4 below
 * the mean, 4.7 above), so the shapes compare directly even though their
 * widths differ: a mild skew at 30, then the lesson's heavy-tailed
 * log-normal ("think income") at 30 and at 300.
 */
const row = (values: readonly number[], top: number, ticks: number[], unit: (v: number, last: boolean) => string) => {
  const mu = mean(values);
  const s = sd(values);
  const lo = Math.max(0, mu - 2.4 * s);
  const hi = mu + 4.7 * s;
  const bin = (hi - lo) / BINS;
  const scale: XScale = { lo, hi, x0: X0, x1: X1 };
  const counts = histogram(values, lo, hi, bin);
  const peak = (SAMPLE_COUNT * bin) / (s * Math.sqrt(2 * Math.PI));
  return {
    top,
    base: top + 186,
    mu,
    s,
    bin,
    lo,
    scale,
    counts,
    unit: ROW_H / Math.max(peak, ...counts),
    skew: skew(values),
    off: values.filter((v) => v >= hi).length,
    ticks,
    format: (v: number) => unit(v, v === ticks[ticks.length - 1]),
  };
};

const minutes = (v: number, last: boolean) => (last ? `${v} min` : String(v));
const times = (v: number, last: boolean) => (last ? `${v}× median` : `${v}×`);
const ROWS = [
  { ...row(MEANS_30, TOPS[0], [6, 8, 10, 12, 14, 16, 18], minutes), letter: "a", title: "Wait times, samples of 30" },
  { ...row(INCOME_MEANS[30], TOPS[1], [1, 2, 3, 4, 5, 6, 7], times), letter: "b", title: "Income, samples of 30" },
  { ...row(INCOME_MEANS[300], TOPS[2], [2, 2.5, 3, 3.5], times), letter: "c", title: "Income, samples of 300" },
];

export const ThumbScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const start = n.beat("thumb").from;
  const thirtyAt = n.word("thumb", "thirty");
  const alwaysAt = n.word("thumb", "always");
  const enoughAt = n.word("thumb", "enough");
  const thumbAt = n.word("thumb", "rule of thumb");
  const lawAt = n.word("thumb", "law");
  const heavyAt = n.word("heavy", "heavy tail");
  const lopsidedAt = n.word("heavy", "lopsided");
  const hundredsAt = n.word("heavy", "hundreds");
  const bellAt = n.word("heavy", "bell");
  const strike = ease(frame, thumbAt, 12);

  // When each row arrives, its curve draws, and its finding is tagged.
  const cues = [
    { at: thirtyAt, curve: alwaysAt, tag: enoughAt },
    { at: heavyAt, curve: lopsidedAt - 6, tag: lopsidedAt },
    { at: hundredsAt, curve: bellAt - 8, tag: bellAt },
  ];
  const tags = [
    { head: "Mild skew: fine at 30", tone: INK, sub: (r: (typeof ROWS)[number]) => `skewness ${fmt(r.skew, 1)}` },
    { head: "Still lopsided at 30", tone: INK, sub: (r: (typeof ROWS)[number]) => `skewness ${fmt(r.skew, 1)}; a bell is 0` },
    { head: "Close to the bell at 300", tone: ACCENT_INK, sub: (r: (typeof ROWS)[number]) => `skewness ${fmt(r.skew, 1)}` },
  ];

  return (
    <AbsoluteFill>
      {/* The pull quote, and its correction. */}
      <Ink at={start - 14} dur={14} style={{ left: 196, top: 112 }}>
        <span style={label(20, ACCENT_INK)}>What you will hear</span>
      </Ink>
      <Ink at={start - 12} dur={14} style={{ left: 84, top: 150, ...headline(240), color: ACCENT, opacity: 0.85 }}>
        “
      </Ink>
      <Ink at={start - 10} dur={22} style={{ left: 196, top: 160, ...headline(84, true), lineHeight: 1.06 }}>
        Thirty is
        <br />
        <span style={{ position: "relative" }}>
          <span style={{ opacity: 1 - strike * 0.45 }}>always</span>
          <svg width={280} height={40} style={{ position: "absolute", left: -8, top: 40, overflow: "visible" }}>
            <path
              d="M2,22 C70,14 160,26 262,12"
              fill="none"
              stroke={ACCENT}
              strokeWidth={6}
              strokeLinecap="round"
              pathLength={1}
              strokeDasharray={`${strike} 1`}
              opacity={strike > 0 ? 1 : 0}
            />
          </svg>
        </span>{" "}
        enough.”
      </Ink>
      <Note at={alwaysAt + 2} x={200} y={356}>
        <span style={note(22, INK_SOFT)}>the n ≥ 30 rule</span>
      </Note>
      <Ink at={thumbAt - 2} dur={18} style={{ left: 196, top: 430, ...headline(50) }}>
        A rule of thumb,
      </Ink>
      <Ink at={lawAt - 4} dur={14} style={{ left: 196, top: 488, ...headline(50, true), color: ACCENT_INK }}>
        not a law.
      </Ink>
      <Ink at={lawAt + 8} dur={18} style={{ left: 198, top: 584, width: 620 }}>
        <div style={{ ...body(27), color: INK }}>
          How much averaging the bell needs depends on the population. A mild skew settles near thirty. A
          heavy tail can need hundreds.
        </div>
      </Ink>

      <FigLabel n="4" title="Averages against the normal curve" at={start - 12} x={X0} y={104} size={27} />
      {ROWS.map((r, i) => {
        const c = cues[i];
        const t = tags[i];
        const tagX = sx(r.scale, r.mu + 1.7 * r.s);
        const tailX = sx(r.scale, r.mu + 2.8 * r.s);
        return (
          <React.Fragment key={r.letter}>
            <Ink at={c.at - 6} dur={14} style={{ left: X0, top: r.top, whiteSpace: "nowrap" }}>
              <span style={{ ...label(19, ACCENT_INK), marginRight: 12 }}>{r.letter}</span>
              <span style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 28, color: INK }}>{r.title}</span>
            </Ink>
            {r.off > 0 ? (
              <Note at={c.tag + 8} x={X1} y={r.top + 6} align="right">
                <span style={note(20, INK_SOFT)}>{r.off} averages run past the right edge</span>
              </Note>
            ) : null}
            <Bars
              counts={r.counts}
              lo={r.lo}
              bin={r.bin}
              scale={r.scale}
              base={r.base}
              unit={r.unit}
              grow={(b) => ease(frame, c.at + b * 0.6, 12)}
            />
            <Axis scale={r.scale} base={r.base} ticks={r.ticks} format={r.format} at={c.at - 4} size={20} />
            <NormalCurve
              scale={r.scale}
              base={r.base}
              unit={r.unit}
              mu={r.mu}
              sd={r.s}
              count={SAMPLE_COUNT}
              bin={r.bin}
              at={c.curve}
              color={ACCENT}
              width={2.6}
            />
            {i === 1 ? (
              <Leader
                points={[
                  [tagX + 30, r.base - 104],
                  [tailX + 20, r.base - 14],
                ]}
                at={c.tag - 4}
              />
            ) : null}
            <Note at={c.tag} x={tagX} y={r.base - 150}>
              <div style={{ ...label(19, t.tone), ...halo }}>{t.head}</div>
              <div style={{ ...note(20, INK_SOFT), ...halo }}>{t.sub(r)}</div>
            </Note>
          </React.Fragment>
        );
      })}
    </AbsoluteFill>
  );
};
