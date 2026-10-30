import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { Bars } from "../../editorial/charts";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, BAR, BLUE_INK, INK, INK_SOFT, TABULAR, body } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { COIN } from "./data";
import { at, Axes, Drift, Mark, noteText, OK_INK, type Scale, Strike, VLine, X0 } from "./parts";

const XS: Scale = { lo: 24.5, hi: 75.5, a: X0, b: 1180 };
const BASE = 820;
const HEIGHT = 380;
const SIDE_X = 1290;
const OBSERVED = 62;

/**
 * Question 11 on the Statistics course's coin (seed 0, the run Stats-7
 * TestingHypotheses shows): 62 heads in 100, against the heads of 100,000
 * runs of a fair coin. The runs at least as far from 50 as 62, on both
 * sides (the test is two-sided), stand out in full blue: 2.1% of them, the
 * p-value. Red is kept for the two misreadings, struck through.
 */
export const PvalueScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("pvalue").from;
  const qAt = n.word("pvalue", "Question");
  const textAt = n.word("pvalue", "What exactly is a p-value");
  const defAt = n.word("pvalue", "The probability of data");
  const nullAt = n.word("pvalue", "if the null is true");
  const coinAt = n.word("pvalue", "A coin lands heads");
  const fairAt = n.word("pvalue-fair", "A fair coin");
  const upperAt = n.word("pvalue-fair", "sixty-two or more");
  const sidedAt = n.word("pvalue-fair", "since the test is two-sided");
  const lowerAt = n.word("pvalue-fair", "thirty-eight or fewer");
  const pctAt = n.word("pvalue-fair", "two point one percent");
  const thatAt = n.word("pvalue-fair", "That's the p-value");
  const notNullAt = n.word("pvalue-not", "It isn't the chance the null is true");
  const flukeAt = n.word("pvalue-fluke", "the chance your result is a fluke");
  const assumingAt = n.word("pvalue-fluke", "assuming the null holds");
  const end = n.beat("pvalue-fluke").to;

  const base = y(BASE);
  const unit = h(HEIGHT) / Math.max(...COIN.counts);
  const charts = { lo: XS.lo, hi: XS.hi, x0: XS.a, x1: XS.b };
  const heads = COIN.counts.map((_, i) => COIN.from + i);
  const upper = COIN.counts.map((c, i) => (heads[i] >= OBSERVED ? c : 0));
  const lower = COIN.counts.map((c, i) => (heads[i] <= 100 - OBSERVED ? c : 0));
  const pct = (COIN.p * 100).toFixed(1);

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={coinAt + 6} level={-32} />
      <Sfx name="el-sprinkle" at={fairAt + 2} level={-34} />
      <Sfx name="el-pencil" at={upperAt + 2} level={-34} />
      <Sfx name="el-pencil" at={lowerAt + 2} level={-34} />
      <Sfx name="el-pop" at={pctAt} level={-30} />
      <Sfx name="el-scratch" at={notNullAt + 12} level={-32} />
      <Sfx name="el-scratch" at={flukeAt + 12} level={-32} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={11} at={qAt - 4} textAt={textAt - 4} size={60}>
          What exactly is a p-value?
        </QuestionCard>

        <Note at={defAt} x={X0} y={y(290)}>
          <span style={{ ...noteText(28, INK) }}>
            the probability of data at least as extreme as yours,{" "}
            <span style={{ opacity: ease(frame, nullAt - 2, 10) }}>
              <Mark at={nullAt + 2}>if the null is true</Mark>
            </span>
          </span>
        </Note>

        <Axes
          x={XS}
          y={{ lo: 0, hi: 1, a: base, b: base - h(HEIGHT) }}
          xTicks={[30, 40, 50, 60, 70]}
          xTitle="heads in 100 flips"
          at={coinAt - 2}
          size={19}
        />
        <Bars
          counts={COIN.counts}
          lo={XS.lo}
          bin={1}
          scale={charts}
          base={base}
          unit={unit}
          gap={3}
          color={BAR}
          grow={(i) => ease(frame, fairAt + 4 + Math.abs(heads[i] - 50) * 0.8, 14)}
          opacity={1 - 0.6 * ease(frame, upperAt, 12)}
        />
        {/* The tails are the answer, not a mistake: full data blue over the
            faded rest, with red kept for the struck misreadings. */}
        <Bars counts={upper} lo={XS.lo} bin={1} scale={charts} base={base} unit={unit} gap={3} color={BAR} grow={(i) => ease(frame, upperAt + (heads[i] - OBSERVED) * 1.2, 10)} />
        <Bars counts={lower} lo={XS.lo} bin={1} scale={charts} base={base} unit={unit} gap={3} color={BAR} grow={(i) => ease(frame, lowerAt + (100 - OBSERVED - heads[i]) * 1.2, 10)} />
        <VLine
          x={at(XS, OBSERVED)}
          top={base - h(HEIGHT) + h(40)}
          bottom={base}
          at={coinAt + 4}
          color={INK}
          width={3}
          label={<span style={{ ...noteText(26, INK), ...TABULAR }}>62 heads</span>}
        />
        <Note at={fairAt + 6} x={X0 + 10} y={base - h(HEIGHT) + h(10)}>
          <span style={{ ...noteText(24, INK_SOFT), ...TABULAR }}>a fair coin, over and over</span>
        </Note>
        <Note at={upperAt + 6} x={at(XS, 66)} y={base - h(110)}>
          <span style={{ ...noteText(24, BLUE_INK), ...TABULAR }}>62 or more</span>
        </Note>
        <Note at={sidedAt} x={at(XS, 34)} y={base - h(178)} align="right">
          <div style={{ ...noteText(22, INK_SOFT), whiteSpace: "nowrap" }}>
            two-sided:
            <br />
            both tails count
          </div>
        </Note>
        <Note at={lowerAt + 6} x={at(XS, 34)} y={base - h(110)} align="right">
          <span style={{ ...noteText(24, BLUE_INK), ...TABULAR }}>38 or fewer</span>
        </Note>
        <Note at={pctAt} x={SIDE_X} y={y(430)}>
          <span style={{ ...noteText(34, BLUE_INK), ...TABULAR }}>
            <b>{pct}%</b> of runs
          </span>
        </Note>
        <Note at={thatAt} x={SIDE_X} y={y(486)}>
          <span style={{ ...noteText(30, INK) }}>
            = <Mark at={thatAt + 4}>the p-value</Mark>
          </span>
        </Note>

        <Note at={notNullAt} x={SIDE_X} y={y(580)}>
          <div style={{ ...body(28, true), color: ACCENT_INK, whiteSpace: "nowrap" }}>
            not <Strike at={notNullAt + 12}>“the chance the null is true”</Strike>
          </div>
        </Note>
        <Note at={flukeAt} x={SIDE_X} y={y(636)}>
          <div style={{ ...body(28, true), color: ACCENT_INK, whiteSpace: "nowrap" }}>
            not <Strike at={flukeAt + 12}>“the chance it&apos;s a fluke”</Strike>
          </div>
        </Note>
        <Note at={assumingAt} x={SIDE_X} y={y(720)}>
          <span style={{ ...noteText(26, OK_INK) }}>
            computed <Mark at={assumingAt + 4}>assuming</Mark> the null holds
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
