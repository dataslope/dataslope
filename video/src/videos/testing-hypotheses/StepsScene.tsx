import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { Axis, sx, type XScale } from "../../editorial/charts";
import { useLayout } from "../../editorial/layout";
import { fmt, halo, INK, INK_SOFT, note, PAPER } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { jitter, STEPS } from "./data";
import {
  Bracket,
  Count,
  curvePath,
  DOT,
  Greek,
  H0,
  Head,
  Label,
  lerp,
  phi,
  pulse,
  STAT,
  STAT_INK,
  STAT_WASH,
  Strike,
  Svg,
  Tick,
} from "./parts";

/** The forty users. */
const X: XScale = { lo: 4000, hi: 11000, x0: 800, x1: 1760 };
const STRIP = 440;
const AXIS = 520;
/** Zoomed in on the claim: where an average of forty would land if it held. */
/** Centred on the same x as Fig. 3's 8,000, so the claim lines up across the two. */
const Z: XScale = { lo: 7100, hi: 8900, x0: 909, x1: 1789 };
const Z_BASE = 800;
const Z_PEAK = 150;

const JIT = jitter(711, STEPS.n);
const STEP_X = 160;
const STEP_Y0 = 330;
const STEP_DY = 92;

/** "7,453": steps the way the panels print them. */
const steps = (v: number) => fmt(v, 0);

/**
 * The lesson's worked example, the five steps run once: forty users against a
 * claimed 8,000, the gap measured in standard errors, the p-value as the two
 * tails beyond it, and the verdict.
 */
export const StepsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const stepsFrom = n.beat("steps").from;
  const claimsAt = n.word("steps", "claims");
  const eightAt = n.word("steps", "eight thousand");
  const fortyAt = n.word("steps", "Forty");
  const averageAt = n.word("steps", "average");
  const sevenAt = n.word("steps", "seven");
  const fiftyAt = n.word("steps", "fifty-three");
  const nullAt = n.word("set", "null");
  const eightAgainAt = n.word("set", "eight thousand");
  const computedAt = n.word("set", "computed");
  const trueMeanAt = n.word("reject", "true mean");
  const claimAt = n.word("reject", "claim");
  const noticeAt = n.word("sides-in", "notice");
  const alphaAt = n.word("set", "Alpha");
  const fixedAt = n.word("set", "fixed");
  const statAt = n.word("tstat", "test statistic");
  const gapAt = n.word("tstat", "gap");
  const noiseAt = n.word("tstat", "noise");
  const tAt = n.word("tstat", "minus");
  const ifAt = n.word("pval", "If");
  const leastAt = n.word("pval", "at least");
  const threeAt = n.word("pval", "three percent");
  const pAt = n.word("pval", "p-value");
  const underAt = n.word("reject", "under");
  const rejectAt = n.word("reject", "reject");
  const hardAt = n.word("reject", "hard");
  const eitherAt = n.word("sides-in", "either");

  const STEP_LIST: { text: React.ReactNode; at: number; done: number }[] = [
    { text: "The question", at: claimsAt - 4, done: averageAt },
    { text: <>State <H0 /> and <H0 one /></>, at: nullAt - 6, done: alphaAt - 4 },
    { text: <>Fix <Greek>α</Greek> in advance</>, at: alphaAt - 4, done: computedAt },
    { text: "Compute a test statistic", at: statAt - 6, done: tAt + 20 },
    { text: "Get the p-value, decide", at: pAt - 6, done: rejectAt },
  ];
  const active = STEP_LIST.filter((s) => frame >= s.at).length - 1;

  const meanX = sx(X, STEPS.mean);
  const claimX = sx(X, STEPS.claimed);
  const se = STEPS.se;
  const zClaim = sx(Z, STEPS.claimed);
  const zMean = sx(Z, STEPS.mean);
  const zMirror = sx(Z, 2 * STEPS.claimed - STEPS.mean);
  const zy = (v: number) => y(Z_BASE) - h(Z_PEAK) * (v / phi(0));
  const dens = (v: number) => phi((v - STEPS.claimed) / se);
  const curveIn = ease(frame, ifAt - 4, 22);
  const tails = ease(frame, leastAt - 2, 14);
  const both = pulse(frame, eitherAt - 2, 28) + pulse(frame, noticeAt - 2, 24);
  const meanGlow = pulse(frame, fiftyAt, 24);
  const verdictGlow = pulse(frame, claimAt, 24);
  const claimGlow = pulse(frame, eightAgainAt, 24);
  const rulerIn = ease(frame, noiseAt - 6, 16);
  const tCount = ease(frame, tAt - 6, 22);

  return (
    <AbsoluteFill>
      {/* ── Sound: the claim, the forty, the mean, the ruler, the tails, the verdict ── */}
      <Sfx name="el-pencil" at={claimsAt - 2} level={-35} />
      <Sfx name="el-sprinkle" at={fortyAt - 4} level={-33} />
      <Sfx name="el-tap" at={averageAt - 2} level={-28} />
      <Sfx name="el-pencil" at={noiseAt - 6} level={-34} />
      <Sfx name="el-whoosh" at={leastAt - 2} level={-34} />
      <Sfx name="el-tap" at={rejectAt - 2} level={-28} />

      <Head a="Eight thousand steps a day?" at={stepsFrom - 4} out={rejectAt - 8} />
      <Head a="Under five percent:" b="reject the claim." at={rejectAt - 4} bAt={rejectAt + 6} />

      {/* ── The five steps ── */}
      {STEP_LIST.map((s, i) => {
        const p = ease(frame, s.at, 14);
        if (p <= 0) return null;
        const on = i === active;
        return (
          <React.Fragment key={i}>
            <div
              style={{
                position: "absolute",
                left: STEP_X,
                top: y(STEP_Y0 + i * STEP_DY),
                opacity: p * (on ? 1 : 0.62),
                transform: `translateX(${(1 - p) * -14}px)`,
                display: "flex",
                alignItems: "baseline",
                gap: 16,
                whiteSpace: "nowrap",
              }}
            >
              <span style={{ ...note(30, on ? STAT_INK : INK_SOFT), fontWeight: 700 }}>{i + 1}</span>
              <Label size={28} color={on ? INK : INK_SOFT} weight={on ? 650 : 520}>
                {s.text}
              </Label>
            </div>
            <Tick x={STEP_X + 560} y={y(STEP_Y0 + i * STEP_DY) + 18} at={s.done} size={24} />
          </React.Fragment>
        );
      })}
      {/* What each step settled, under its line. */}
      <Ink at={nullAt + 4} dur={14} style={{ left: STEP_X + 44, top: y(STEP_Y0 + STEP_DY) + 40, whiteSpace: "nowrap" }}>
        <Label size={22} color={INK_SOFT} weight={520}>
          <H0 />: the true mean is {steps(STEPS.claimed)}
        </Label>
      </Ink>
      <Ink at={fixedAt - 2} dur={14} style={{ left: STEP_X + 44, top: y(STEP_Y0 + 2 * STEP_DY) + 40, whiteSpace: "nowrap" }}>
        <Label size={22} color={INK_SOFT} weight={520}>
          <Greek>α</Greek> = {STEPS.alpha}, fixed now
        </Label>
      </Ink>

      {/* ── Fig. 3: the forty users ── */}
      <FigLabel n="3" title={`Daily steps of ${STEPS.n} users`} at={stepsFrom} x={X.x0} y={y(300)} />
      <Axis scale={X} base={y(AXIS)} ticks={[4000, 6000, 8000, 10000]} format={(v) => fmt(v, 0)} at={stepsFrom + 2} />
      <Svg>
        {STEPS.values.map((v, j) => {
          const a = ease(frame, fortyAt - 4 + j * 0.45, 6);
          if (a <= 0) return null;
          return <circle key={j} cx={sx(X, v)} cy={y(STRIP) + h((JIT[j] - 0.5) * 50)} r={7 * a} fill={DOT} stroke={PAPER} strokeWidth={1.2} />;
        })}
        {ease(frame, claimsAt - 2, 14) > 0 ? (
          <line
            x1={claimX}
            x2={claimX}
            y1={y(AXIS)}
            y2={lerp(y(AXIS), y(STRIP) - h(70), ease(frame, claimsAt - 2, 16))}
            stroke={INK}
            strokeWidth={2.4 + 2 * claimGlow}
            strokeDasharray="7 6"
          />
        ) : null}
        {ease(frame, averageAt - 2, 12) > 0 ? (
          <line
            x1={meanX}
            x2={meanX}
            y1={y(STRIP) - h(52) * ease(frame, averageAt - 2, 12)}
            y2={y(STRIP) + h(52) * ease(frame, averageAt - 2, 12)}
            stroke={STAT}
            strokeWidth={4.5 + 3 * meanGlow}
            strokeLinecap="round"
          />
        ) : null}
      </Svg>
      <Note at={eightAt} x={claimX + 12} y={y(STRIP) - h(70) - 8}>
        <Label size={22} style={halo}>
          <Strike at={hardAt}>claimed: {steps(STEPS.claimed)}</Strike>
        </Label>
      </Note>
      <Note at={sevenAt - 2} x={meanX - 14} y={y(STRIP) - h(70) - 8} align="right">
        <span style={{ ...note(23, STAT_INK), fontWeight: 700, ...halo }}>
          average <Count at={sevenAt - 2} to={STEPS.mean} from={STEPS.claimed} dur={26} format={steps} />
        </span>
      </Note>

      {/* ── Fig. 4: the gap, in standard errors ── */}
      <FigLabel n="4" title="The gap, measured in units of noise" at={statAt - 4} x={Z.x0} y={y(600)} />
      <Bracket x0={zMean} x1={zClaim} y={y(Z_BASE) + 30} at={gapAt - 2} color={STAT} width={3} />
      <Note at={gapAt + 4} x={(zMean + zClaim) / 2} y={y(Z_BASE) + 44} from="up">
        <span style={{ display: "inline-block", transform: "translateX(-50%)", ...note(22, STAT_INK), fontWeight: 650, whiteSpace: "nowrap" }}>
          gap {fmt(STEPS.gap, 0).replace("-", "−")} steps
        </span>
      </Note>
      {/* The ruler: one standard error per notch, counted off from the claim. */}
      <Svg opacity={rulerIn}>
        <line x1={sx(Z, STEPS.claimed - 3 * se)} x2={zClaim} y1={y(Z_BASE) + 2} y2={y(Z_BASE) + 2} stroke={INK} strokeWidth={1.6} />
        {[0, 1, 2, 3].map((k) => {
          const x = sx(Z, STEPS.claimed - k * se);
          const show = ease(frame, noiseAt - 6 + k * 5, 8);
          return <line key={k} x1={x} x2={x} y1={y(Z_BASE) - 10 * show} y2={y(Z_BASE) + 12 * show} stroke={INK} strokeWidth={2} />;
        })}
      </Svg>
      {[1, 2].map((k) => (
        <div
          key={k}
          style={{
            position: "absolute",
            left: sx(Z, STEPS.claimed - k * se),
            top: y(Z_BASE) - 44,
            transform: "translateX(-50%)",
            opacity: ease(frame, noiseAt + k * 5, 10) * (1 - 0.7 * curveIn),
            ...note(20, INK_SOFT),
          }}
        >
          −{k}
        </div>
      ))}
      <Note at={noiseAt + 6} x={Z.x0} y={y(Z_BASE) + 92}>
        <Label size={21} color={INK_SOFT} weight={520}>
          one notch = one standard error, {steps(se)} steps
        </Label>
      </Note>
      <div
        style={{
          position: "absolute",
          left: Z.x0,
          top: y(650),
          opacity: tCount,
          ...note(40, STAT_INK),
          fontWeight: 700,
          whiteSpace: "nowrap",
        }}
      >
        <span style={{ fontStyle: "italic" }}>t</span> = <Count at={tAt - 6} to={STEPS.t} dur={22} format={(v) => fmt(v, 2).replace("-", "−")} />
      </div>

      {/* If the claim held: the averages a test expects, and the two tails beyond this one. */}
      {curveIn > 0 ? (
        <Svg>
          {tails > 0 ? (
            <>
              <path
                d={curvePath(dens, Z.lo, STEPS.mean, (v) => sx(Z, v), zy, y(Z_BASE))}
                fill={STAT_WASH}
                opacity={tails * (0.75 + 0.25 * Math.min(1, both))}
              />
              <path
                d={curvePath(dens, 2 * STEPS.claimed - STEPS.mean, Z.hi, (v) => sx(Z, v), zy, y(Z_BASE))}
                fill={STAT_WASH}
                opacity={tails * (0.75 + 0.25 * both)}
              />
            </>
          ) : null}
          <path
            d={curvePath(dens, Z.lo, Z.hi, (v) => sx(Z, v), zy)}
            fill="none"
            stroke={INK_SOFT}
            strokeWidth={2.4}
            pathLength={1}
            strokeDasharray={`${curveIn} 1`}
          />
          <line x1={zMirror} x2={zMirror} y1={y(Z_BASE)} y2={zy(dens(2 * STEPS.claimed - STEPS.mean)) - 30} stroke={STAT} strokeWidth={2} strokeDasharray="5 4" opacity={tails} />
          <line x1={zMean} x2={zMean} y1={y(Z_BASE)} y2={zy(dens(STEPS.mean)) - 30} stroke={STAT} strokeWidth={3} opacity={tails} />
        </Svg>
      ) : null}
      <Note at={threeAt - 2} x={zMirror + 16} y={y(Z_BASE) - h(110)}>
        <span style={{ ...note(30, STAT_INK), fontWeight: 700, ...halo, whiteSpace: "nowrap" }}>p = {fmt(STEPS.p, 3)}</span>
      </Note>
      <Note at={eitherAt - 2} x={zMirror + 16} y={y(Z_BASE) - h(110) + 44}>
        <Label size={21} color={STAT_INK} weight={520} style={halo}>
          both tails count
        </Label>
      </Note>
      <Note at={trueMeanAt - 2} x={meanX - 14} y={y(STRIP) + h(52) + 8} align="right">
        <Label size={21} color={INK_SOFT} weight={520} style={halo}>
          the true mean: still unknown
        </Label>
      </Note>
      <Ink at={underAt - 4} dur={14} style={{ left: STEP_X + 44, top: y(STEP_Y0 + 4 * STEP_DY) + 40, whiteSpace: "nowrap" }}>
        <div style={{ transform: `scale(${1 + 0.06 * verdictGlow})`, transformOrigin: "0 50%" }}>
          <Label size={22} color={STAT_INK}>
            {fmt(STEPS.p, 3)} is under {STEPS.alpha}: reject <H0 />
          </Label>
        </div>
      </Ink>
    </AbsoluteFill>
  );
};
