import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, HIGHLIGHT, INK, INK_SOFT, TABULAR, body } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { CI } from "./data";
import { Axes, Curve, Drift, Mark, noteText, OK_INK, pulse, Strike, Svg, X0 } from "./parts";

const LEFT = X0 + 40;
const RIGHT = 1180;
const BASE = 820;
const TOP = 380;
const LO = 88;
const HI = 112;
const SIDE_X = 1370;
const TRUTH = 100;

/**
 * Question 8 on the Statistics course's own simulation (seed 7, the run
 * Stats-6 Estimation shows): 100 samples of 40 from a population whose mean
 * is 100, an interval from each, drawn left to right. Ninety-four cross the
 * true mean; six, in red, miss it. Then the misreading struck through, and
 * one interval that covers and one that misses picked out.
 */
export const CiScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("ci").from;
  const qAt = n.word("ci", "Question");
  const textAt = n.word("ci", "What does a ninety-five percent");
  const procAt = n.word("ci", "It describes the procedure");
  const takeAt = n.word("ci", "Take a hundred samples");
  const buildAt = n.word("ci", "build an interval from each");
  const catchAt = n.word("ci", "catch the true mean");
  const coverAt = n.word("ci", "ninety-four do");
  const missAt = n.word("ci", "six miss");
  const notAt = n.word("ci-fixed", "So it isn't");
  const fixedAt = n.word("ci-fixed", "The mean is fixed");
  const randomAt = n.word("ci-fixed", "The interval is what's random");
  const eitherAt = n.word("ci-fixed", "either contains the mean");
  const doesntAt = n.word("ci-fixed", "or it doesn't");
  const testAt = n.word("test-in", "The biggest block");
  const clearAt = n.word("test-in", "on testing");
  const end = n.beat("test-in").to;

  const base = y(BASE);
  const vy = (v: number) => base - ((v - LO) / (HI - LO)) * (base - y(TOP));
  const step = (RIGHT - LEFT) / CI.intervals.length;
  const ix = (i: number) => LEFT + step * (i + 0.5);
  const drawFrom = buildAt + 2;
  const drawTo = Math.max(drawFrom + 40, catchAt + 10);
  const shownAt = (i: number) => drawFrom + ((drawTo - drawFrom) * i) / CI.intervals.length;
  const missIdx = CI.intervals.flatMap((v, i) => (v[3] ? [] : [i]));
  // One that misses and one beside it that covers, for "either it does or it doesn't".
  const pickMiss = missIdx[3];
  const pickCover = pickMiss - 3;
  const gone = ease(frame, clearAt, 12);

  return (
    <AbsoluteFill>
      <Sfx name="el-sprinkle" at={drawFrom} level={-34} />
      <Sfx name="el-tap" at={coverAt} level={-32} />
      <Sfx name="el-pop" at={missAt} level={-32} />
      <Sfx name="el-scratch" at={notAt + 10} level={-32} />
      <Sfx name="el-tap" at={eitherAt} level={-34} />
      <Sfx name="el-tap" at={doesntAt} level={-34} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={8} at={qAt - 4} textAt={textAt - 4} size={60}>
          What does a 95% confidence interval (CI) actually mean?
        </QuestionCard>

        <Note at={procAt} x={X0} y={y(300)} out={clearAt}>
          <span style={{ ...noteText(26, INK) }}>
            a property of the <Mark at={procAt + 8}>procedure</Mark>, not of one interval
          </span>
        </Note>
        <Axes
          x={{ lo: 0, hi: 1, a: LEFT - 20, b: RIGHT + 20 }}
          y={{ lo: LO, hi: HI, a: base, b: y(TOP) }}
          xTicks={[]}
          yTicks={[90, 95, 100, 105, 110]}
          at={takeAt}
          out={clearAt}
          size={19}
        />
        <Curve points={[[LEFT - 20, vy(TRUTH)], [RIGHT + 20, vy(TRUTH)]]} at={takeAt + 4} dur={16} out={clearAt} color={INK} width={2.4} dash="8 6" />
        <Note at={takeAt + 8} x={RIGHT + 30} y={vy(TRUTH) - 16} out={clearAt}>
          <span style={{ ...noteText(22, INK) }}>true mean</span>
        </Note>
        <Note at={takeAt + 4} x={LEFT} y={base + h(14)} out={clearAt}>
          <span style={{ ...noteText(22, INK_SOFT), ...TABULAR }}>100 samples, one interval each</span>
        </Note>
        <Svg opacity={1 - gone}>
          {[pickCover, pickMiss].map((i, k) => {
            const p = ease(frame, (k ? doesntAt : eitherAt) - 2, 10);
            if (p <= 0) return null;
            const [lo, , hi] = CI.intervals[i];
            return <rect key={i} x={ix(i) - step * 0.9} y={vy(hi) - 10} width={step * 1.8} height={vy(lo) - vy(hi) + 20} rx={4} fill={HIGHLIGHT} opacity={0.9 * p} />;
          })}
          {CI.intervals.map(([lo, c, hi, covers], i) => {
            const p = ease(frame, shownAt(i), 6);
            if (p <= 0) return null;
            const color = covers ? BAR : ACCENT;
            const swell = covers ? 0 : pulse(frame, missAt + 2 + missIdx.indexOf(i) * 2, 18);
            const half = ((vy(lo) - vy(hi)) / 2) * p;
            const mid = vy(c);
            const dim = covers ? 0.4 * ease(frame, missAt, 12) * (1 - ease(frame, eitherAt - 2, 10)) : 0;
            return (
              <g key={i} opacity={1 - dim}>
                <line x1={ix(i)} x2={ix(i)} y1={mid - half} y2={mid + half} stroke={color} strokeWidth={(covers ? 3.2 : 4.2) + 2 * swell} strokeLinecap="round" />
                <circle cx={ix(i)} cy={mid} r={3.2 * p} fill={covers ? BLUE_INK : ACCENT_INK} />
              </g>
            );
          })}
        </Svg>
        <Note at={coverAt} x={SIDE_X} y={y(400)} out={clearAt}>
          <span style={{ ...noteText(30, BLUE_INK), ...TABULAR }}>
            <b>{CI.covered}</b> catch it
          </span>
        </Note>
        <Note at={missAt} x={SIDE_X} y={y(452)} out={clearAt}>
          <span style={{ ...noteText(30, ACCENT_INK), ...TABULAR }}>
            <b>{CI.missed}</b> miss
          </span>
        </Note>

        <Note at={notAt} x={SIDE_X} y={y(540)} out={clearAt}>
          <div style={{ ...body(28, true), color: ACCENT_INK, whiteSpace: "nowrap", lineHeight: 1.3 }}>
            <Strike at={notAt + 10}>“a 95% chance the mean</Strike>
            <br />
            <Strike at={notAt + 16}>is in this interval”</Strike>
          </div>
        </Note>
        <Note at={fixedAt} x={SIDE_X} y={y(650)} out={clearAt}>
          <span style={{ ...noteText(26, INK) }}>
            the mean is <b>fixed</b>
          </span>
        </Note>
        <Note at={randomAt} x={SIDE_X} y={y(700)} out={clearAt}>
          <span style={{ ...noteText(26, OK_INK) }}>
            the <Mark at={testAt}>interval is random</Mark>
          </span>
        </Note>
        <Note at={eitherAt} x={SIDE_X} y={y(770)} out={clearAt}>
          <span style={{ ...noteText(24, INK_SOFT) }}>each one covers it, or doesn&apos;t</span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
