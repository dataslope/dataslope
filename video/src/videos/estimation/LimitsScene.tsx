import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { Axis, Bars, sx, type XScale } from "../../editorial/charts";
import { useLayout } from "../../editorial/layout";
import { body, fmt, halo, HIGHLIGHT, INK, INK_SOFT, note, PAPER } from "../../editorial/style";
import { FigLabel, Ink, NextLine, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { BIASED, BOOT, histogram, jitter, MAXIMUM } from "./data";
import { DATA, EST, EST_INK, Headline, IntervalBar, Marked, pulse, Rule, Svg } from "./parts";

/** Fig. 11: waits recorded only under ten minutes, and their bootstrap. */
const XL: XScale = { lo: 0, hi: 20, x0: 160, x1: 860 };
const L_STRIP = 360;
const L_AXIS = 410;
const L_HIST = 620;
const L_HIST_H = 120;
const L_BAR = 648;
const BIN = 0.1;
/** Fig. 12: the maximum of each resample of the lesson's sixty waits. */
const XR: XScale = { lo: 10, hi: 20, x0: 1020, x1: 1760 };
const R_STRIP = 360;
const R_BASE = 648;
const R_H = 210;

const JIT = jitter(66, BIASED.n);
const R_UNIT = R_H / Math.max(...MAXIMUM.spikes.map((s) => s.count));

/**
 * Part 3's close, and the video's: the two cautions, each on a figure
 * measured from the lesson's own waits, then precision against accuracy, and
 * the bridge to the logic of a test.
 */
export const LimitsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const limitsFrom = n.beat("limits").from;
  const informationAt = n.word("limits", "information");
  const reusesAt = n.word("limits", "reuses");
  const biasedAt = n.word("biased", "biased sample");
  const carriesAt = n.word("biased", "carries");
  const confidentAt = n.word("biased", "confident");
  const wrongAt = n.word("biased", "wrong center");
  const edgesAt = n.word("edge", "edges");
  const neverAt = n.word("edge", "never beat");
  const largestAt = n.word("edge", "largest value");
  const maximumAt = n.word("edge", "maximum");
  const wobblesAt = n.word("precision", "wobbles");
  const aimedAt = n.word("precision", "aimed");
  const truthAt = n.word("precision", "truth", { edge: "end" });
  const plausibleAt = n.word("next", "plausible");
  const testAt = n.word("next", "A test");
  const oneValueAt = n.word("next", "one value");
  const zeroAt = n.word("next", "zero");

  // The biased resamples pile up, from "carries" to "confident".
  const fill = Math.min(1, Math.max(0, (frame - (carriesAt - 4)) / Math.max(20, confidentAt - carriesAt)));
  const lk = frame < carriesAt - 4 ? 0 : Math.round(BIASED.means.length ** fill);
  const lCounts = histogram(BIASED.means.slice(0, lk), XL.lo, XL.hi, BIN);
  const spikes = ease(frame, largestAt - 4, 18);
  const top = MAXIMUM.spikes[MAXIMUM.spikes.length - 1];

  return (
    <AbsoluteFill>
      {/* ── Sound: the biased waits, their pile, the wall at the maximum, the spikes, the close ── */}
      <Sfx name="el-sprinkle" at={biasedAt - 4} level={-34} />
      <Sfx name="el-sprinkle" at={carriesAt - 4} level={-35} />
      <Sfx name="el-tap" at={wrongAt - 4} level={-28} />
      <Sfx name="el-pencil" at={neverAt - 4} level={-33} />
      <Sfx name="el-pop" at={largestAt - 4} level={-30} />
      <Sfx name="el-chime" at={truthAt + 4} level={-32} />

      <Headline at={limitsFrom - 4} second={reusesAt - 4} size={60} italic="it only reuses the data.">
        No new information:
      </Headline>
      <Svg opacity={pulse(frame, informationAt - 4, 20) * 0.6}>
        <line x1={92} x2={720} y1={y(232)} y2={y(232)} stroke={HIGHLIGHT} strokeWidth={6} />
      </Svg>

      {/* ── Fig. 11: a biased sample ── */}
      <FigLabel n="11" title={`${BIASED.n} waits, kept only under ${BIASED.cutoff} minutes`} at={biasedAt - 8} x={160} y={y(272)} />
      <Svg>
        <rect
          x={sx(XL, BIASED.cutoff)}
          y={y(L_STRIP - 34)}
          width={(XL.x1 - sx(XL, BIASED.cutoff)) * ease(frame, biasedAt, 14)}
          height={y(L_AXIS) - y(L_STRIP - 34)}
          fill={`color-mix(in srgb, ${INK_SOFT} 10%, transparent)`}
        />
        {BIASED.values.map((v, j) => {
          const a = ease(frame, biasedAt - 4 + j * 0.3, 7);
          if (a <= 0) return null;
          return <circle key={j} cx={sx(XL, v)} cy={y(L_STRIP) + h((JIT[j] - 0.5) * 30)} r={5.5 * a} fill={DATA} stroke={PAPER} strokeWidth={1} opacity={0.85} />;
        })}
      </Svg>
      <Axis scale={XL} base={y(L_AXIS)} ticks={[0, 5, 10, 15, 20]} at={biasedAt - 6} />
      <Note at={biasedAt + 8} x={sx(XL, BIASED.cutoff) + 12} y={y(L_STRIP - 30)}>
        <span style={{ ...note(20, INK_SOFT), whiteSpace: "nowrap" }}>never recorded</span>
      </Note>
      <Bars counts={lCounts} lo={XL.lo} bin={BIN} scale={XL} base={y(L_HIST)} unit={h(Math.min(8, L_HIST_H / Math.max(1, ...lCounts)))} color={EST} gap={0.5} />
      <Note at={carriesAt + 4} x={sx(XL, 6.4)} y={y(L_HIST) - h(L_HIST_H * 0.7)}>
        <span style={{ ...note(20, INK_SOFT), ...halo, whiteSpace: "nowrap" }}>{BIASED.means.length.toLocaleString("en-US")} resampled averages</span>
      </Note>
      <IntervalBar x0={sx(XL, BIASED.lo)} x1={sx(XL, BIASED.hi)} y={y(L_BAR)} at={confidentAt - 2} dur={14} color={INK} width={4} tick={10} />
      <Note at={confidentAt + 4} x={sx(XL, BIASED.lo) - 12} y={y(L_BAR) + 18} align="right">
        <span style={{ ...note(21, INK), fontWeight: 650, ...halo, whiteSpace: "nowrap" }}>
          {fmt(BIASED.lo)} to {fmt(BIASED.hi)}
        </span>
      </Note>
      <Rule x={sx(XL, BIASED.trueMean)} y0={y(L_BAR) + 20} y1={y(L_STRIP - 40)} at={wrongAt - 4} dur={16} color={INK} width={2.4} dash="7 6" />
      <Note at={wrongAt} x={sx(XL, BIASED.trueMean) + 12} y={y(L_BAR) - 12}>
        <span style={{ ...note(21, INK), fontWeight: 650, ...halo, whiteSpace: "nowrap" }}>true mean, {fmt(BIASED.trueMean, 0)}: outside it</span>
      </Note>
      <Svg opacity={ease(frame, wrongAt + 4, 10)}>
        <circle cx={sx(XL, BIASED.trueMean)} cy={y(L_BAR)} r={9 + 3 * pulse(frame, wrongAt + 4, 16)} fill="none" stroke={EST} strokeWidth={2.6} />
      </Svg>

      {/* ── Fig. 12: the maximum ── */}
      <FigLabel n="12" title={`The largest of each resample of the ${BOOT.n} waits`} at={edgesAt - 8} x={XR.x0} y={y(272)} />
      <Axis scale={XR} base={y(R_BASE)} ticks={[10, 12, 14, 16, 18, 20]} at={edgesAt - 6} />
      <Svg>
        {MAXIMUM.top.map((v, j) => {
          const a = ease(frame, edgesAt - 4 + j * 1.2, 8);
          if (a <= 0 || v < XR.lo) return null;
          return <circle key={j} cx={sx(XR, v)} cy={y(R_STRIP)} r={6.5 * a} fill={DATA} stroke={PAPER} strokeWidth={1.2} />;
        })}
        {/* Past the sample's largest value: where a fresh draw could land, and a resample never can. */}
        <rect
          x={sx(XR, MAXIMUM.sampleMax)}
          y={y(R_STRIP - 30)}
          width={(XR.x1 - sx(XR, MAXIMUM.sampleMax)) * ease(frame, neverAt, 12)}
          height={y(R_BASE) - y(R_STRIP - 30)}
          fill={`color-mix(in srgb, ${EST} 10%, transparent)`}
        />
        {MAXIMUM.spikes.map((s) => {
          const hh = h(s.count * R_UNIT) * spikes;
          if (hh <= 0) return null;
          const x = sx(XR, s.v);
          return <rect key={s.v} x={x - 5} y={y(R_BASE) - hh} width={10} height={hh} fill={EST} />;
        })}
      </Svg>
      <Note at={edgesAt + 4} x={XR.x0} y={y(R_STRIP) + 18}>
        <span style={{ ...note(20, INK_SOFT), whiteSpace: "nowrap" }}>the sample’s largest values</span>
      </Note>
      <Rule x={sx(XR, MAXIMUM.sampleMax)} y0={y(R_BASE)} y1={y(R_STRIP - 34)} at={neverAt - 2} dur={14} color={INK} width={2.4} dash="7 6" />
      <Note at={neverAt + 2} x={sx(XR, MAXIMUM.sampleMax) - 12} y={y(R_STRIP - 60)} align="right" from="right">
        <span style={{ ...note(21, INK), fontWeight: 650, ...halo, whiteSpace: "nowrap" }}>never past {fmt(MAXIMUM.sampleMax)}</span>
      </Note>
      <Note at={maximumAt - 4} x={sx(XR, top.v) - 14} y={y(R_BASE) - h(R_H) - 4} align="right" from="right">
        <span style={{ ...note(21, EST_INK), fontWeight: 700, ...halo, whiteSpace: "nowrap" }}>
          {Math.round(MAXIMUM.atTop * 100)}% of resamples: exactly {fmt(MAXIMUM.sampleMax)}
        </span>
      </Note>

      {/* ── Precision, not accuracy ── */}
      <Ink at={wobblesAt - 6} dur={16} style={{ left: 160, top: y(744), whiteSpace: "nowrap" }}>
        <span style={{ ...body(34, true), color: INK }}>
          It measures how much an estimate{" "}
          <Marked at={wobblesAt - 2} color={HIGHLIGHT}>
            wobbles
          </Marked>
          ,
        </span>
      </Ink>
      <Ink at={aimedAt - 6} dur={16} style={{ left: 1020, top: y(744), whiteSpace: "nowrap" }}>
        <span style={{ ...body(34, true), color: EST_INK }}>not whether it’s aimed at the truth.</span>
      </Ink>

      {/* ── The bridge ── */}
      <Ink at={plausibleAt - 6} dur={18} style={{ left: 160, top: y(818), whiteSpace: "nowrap" }}>
        <span style={{ ...note(26, INK_SOFT) }}>An interval: which values are plausible.</span>
      </Ink>
      <Ink at={oneValueAt - 4} dur={18} style={{ left: 160, top: y(862), whiteSpace: "nowrap" }}>
        <span style={{ ...note(26, INK_SOFT) }}>
          A test: one value in particular.
          <span style={{ color: EST_INK, fontWeight: 650, opacity: ease(frame, zeroAt - 6, 12) }}> Could it be zero?</span>
        </span>
      </Ink>
      <NextLine at={testAt - 2} x={1020} y={y(818)} width={600}>
        the logic of a test.
      </NextLine>
    </AbsoluteFill>
  );
};
