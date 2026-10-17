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
import { DATA, EST, EST_INK, Headline, IntervalBar, Marked, pulse, Rule, Slot, Svg } from "./parts";

/** Fig. 11: waits recorded only under ten minutes, and their bootstrap. */
const XL: XScale = { lo: 0, hi: 14, x0: 160, x1: 860 };
const L_STRIP = 360;
const L_AXIS = 410;
const L_HIST = 620;
const L_HIST_H = 120;
const L_BAR = 648;
const BIN = 0.1;
/** Fig. 12: the maximum of each resample of the lesson's sixty waits. */
const XR: XScale = { lo: 10, hi: 22, x0: 1020, x1: 1760 };
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
  const sayAt = n.word("edge", "say");
  const haveAt = n.word("limits", "have");
  const failsAt = n.word("edge", "fails");
  const nextFrom = n.beat("next").from;
  const precisionFrom = n.beat("precision").from;
  const whichAt = n.word("next", "which");
  const particularAt = n.word("next", "particular");
  const zeroEndAt = n.word("next", "zero", { edge: "end" });
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
        No new{" "}
        <Marked at={informationAt - 4} color={HIGHLIGHT}>
          information
        </Marked>
        :
      </Headline>

      {/* The two figures step back once the bridge has asked its question. */}
      <div style={{ position: "absolute", inset: 0, opacity: 1 - 0.65 * ease(frame, zeroEndAt + 4, 30) }}>
      {/* ── Fig. 11: a biased sample ── */}
      <FigLabel n="11" title={`${BIASED.n} waits, kept only under ${BIASED.cutoff} minutes`} at={haveAt - 6} x={160} y={y(272)} />
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
      <Axis scale={XL} base={y(L_AXIS)} ticks={[0, 2, 4, 6, 8, 10, 12, 14]} at={haveAt - 4} />
      <Note at={biasedAt + 8} x={sx(XL, BIASED.cutoff) + 12} y={y(L_STRIP - 30)}>
        <span style={{ ...note(20, INK_SOFT), whiteSpace: "nowrap" }}>never recorded</span>
      </Note>
      <Bars counts={lCounts} lo={XL.lo} bin={BIN} scale={XL} base={y(L_HIST)} unit={h(Math.min(8, L_HIST_H / Math.max(1, ...lCounts)))} color={EST} gap={0.5} />
      <Note at={carriesAt + 4} x={sx(XL, BIASED.mean)} y={y(L_HIST) - h(L_HIST_H) - 34} from="up">
        <span style={{ ...note(20, INK_SOFT), ...halo, whiteSpace: "nowrap", display: "inline-block", transform: "translateX(-50%)" }}>
          {BIASED.means.length.toLocaleString("en-US")} resampled averages
        </span>
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
      <FigLabel n="12" title={`The largest of each resample of the ${BOOT.n} waits`} at={failsAt - 4} x={XR.x0} y={y(272)} />
      <Axis scale={XR} base={y(R_BASE)} ticks={[10, 12, 14, 16, 18, 20, 22]} at={edgesAt - 6} />
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
      <Rule
        x={sx(XR, MAXIMUM.sampleMax)}
        y0={y(R_BASE)}
        y1={y(R_STRIP - 34)}
        at={neverAt - 2}
        dur={14}
        color={INK}
        width={2.4 + 2.6 * pulse(frame, sayAt - 2, 18)}
        dash="7 6"
      />
      <Note at={neverAt + 2} x={sx(XR, MAXIMUM.sampleMax) + 14} y={y(R_STRIP + 60)}>
        <span style={{ ...note(21, INK), fontWeight: 650, whiteSpace: "nowrap", lineHeight: 1.35 }}>
          a resample
          <br />
          never gets
          <br />
          past {fmt(MAXIMUM.sampleMax)}
        </span>
      </Note>
      <Note at={maximumAt - 4} x={sx(XR, top.v) - 14} y={y(R_BASE) - h(R_H) - 4} align="right" from="right">
        <span style={{ ...note(21, EST_INK), fontWeight: 700, ...halo, whiteSpace: "nowrap" }}>
          {Math.round(MAXIMUM.atTop * 100)}% of resamples: exactly {fmt(MAXIMUM.sampleMax)}
        </span>
      </Note>

      </div>

      {/* ── Precision, not accuracy ── */}
      <div style={{ position: "absolute", left: 160, top: y(744), display: "flex", gap: "0.3em", whiteSpace: "nowrap", ...body(36, true) }}>
        <Slot at={precisionFrom - 2} style={{ color: INK }}>
          It measures how much an estimate{" "}
          <Marked at={wobblesAt - 2} color={HIGHLIGHT}>
            wobbles
          </Marked>
          ,
        </Slot>
        <Slot at={aimedAt - 6} style={{ color: EST_INK }}>
          not whether it’s aimed at the truth.
          <div style={{ height: 3, marginTop: 2, background: EST, width: `${100 * ease(frame, truthAt - 10, 18)}%`, borderRadius: 2 }} />
        </Slot>
      </div>

      {/* ── The bridge ── */}
      <Ink at={nextFrom - 2} dur={18} style={{ left: 160, top: y(818), whiteSpace: "nowrap" }}>
        <span style={{ ...note(26, INK_SOFT) }}>
          An interval:{" "}
          <span style={{ opacity: ease(frame, whichAt - 2, 12) }}>
            which values are{" "}
            <Marked at={plausibleAt - 2} color={HIGHLIGHT}>
              plausible
            </Marked>
            .
          </span>
        </span>
      </Ink>
      <Ink at={oneValueAt - 4} dur={18} style={{ left: 160, top: y(862), whiteSpace: "nowrap" }}>
        <span style={{ ...note(26, INK_SOFT) }}>
          A test: one value
          <span style={{ opacity: ease(frame, particularAt - 2, 12) }}> in particular.</span>
          <span style={{ position: "relative", color: EST_INK, fontWeight: 650, opacity: ease(frame, zeroAt - 6, 12) }}>
            {" "}
            Could it be zero?
            <span
              style={{
                position: "absolute",
                left: "0.3em",
                right: 0,
                bottom: -6,
                height: 3,
                background: EST,
                borderRadius: 2,
                transformOrigin: "left center",
                transform: `scaleX(${ease(frame, zeroEndAt + 10, 20)})`,
              }}
            />
          </span>
        </span>
      </Ink>
      <NextLine at={testAt - 2} x={1020} y={y(818)} width={600}>
        the logic of a test.
      </NextLine>
    </AbsoluteFill>
  );
};
