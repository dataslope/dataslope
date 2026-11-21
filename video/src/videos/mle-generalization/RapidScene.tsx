import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { RapidFire, type RapidItem } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { I, MathRun } from "../../editorial/math";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, fmt, headline, INK, INK_SOFT, TABULAR } from "../../editorial/style";
import { NextLine } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { EARLY, ERRORS } from "./data";
import {
  at,
  Axes,
  type Box,
  Curve,
  Drift,
  Fade,
  Key,
  Kicker,
  line,
  LIT_INK,
  LIT_LINE,
  OK,
  OK_INK,
  PlanMap,
  pulse,
  Say,
  type Scale,
  SERIES2,
  SERIES2_INK,
  Spot,
  Strike,
  Svg,
  X0,
} from "./parts";

/** Where the answers go: right of the list. */
const R_X = 800;
const LOSS: Box = { left: 860, right: 1720, top: 440, bottom: 780 };
const Y_LO = 2;
const Y_HI = 11;

/** 11. Early stopping, on a small network's validation loss. */
const Early: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();
  const haltsAt = n.word("r-early", "halts training");
  const setAt = n.word("r-early", "a set number of epochs");
  const patienceAt = n.word("r-early", "the patience");
  const restoresAt = n.word("r-early", "restores the best epoch's weights");
  const shortAt = n.word("r-early-plateau", "too short");
  const plateauAt = n.word("r-early-plateau", "stops on a plateau");
  const sixtyAt = n.word("r-early-plateau", "stops at epoch sixty-eight");
  const bestAt = n.word("r-early-plateau", "its best is epoch");

  const ex: Scale = { lo: 1, hi: EARLY.epochs, a: LOSS.left, b: LOSS.right };
  const ey: Scale = { lo: Y_LO, hi: Y_HI, a: y(LOSS.bottom), b: y(LOSS.top) };
  const clip: Box = { left: LOSS.left - 4, right: LOSS.right + 8, top: y(LOSS.top) - 4, bottom: y(LOSS.bottom) + 4 };
  const val = EARLY.validation.map((v, i) => [i + 1, v] as const);
  const train = EARLY.train.map((v, i) => [i + 1, v] as const);
  const s = EARLY.short;
  const bestX = at(ex, s.best);
  const stopX = at(ex, s.stop ?? s.best);
  const bestY = at(ey, s.bestValidation);
  const gX = at(ex, EARLY.globalBest);
  const gY = at(ey, EARLY.globalBestValidation);
  const brP = ease(frame, patienceAt, 14);
  const red = ease(frame, sixtyAt, 12);
  const brColor = red > 0.5 ? ACCENT : LIT_LINE;

  return (
    <>
      <Say at={haltsAt - 4} x={LOSS.left} y={y(LOSS.top) - h(100)}>
        <span style={line(24, INK_SOFT)}>A small network on Friedman #1: loss by epoch</span>
      </Say>
      <Say at={haltsAt} x={LOSS.left} y={y(LOSS.top) - h(56)}>
        <div style={{ display: "flex", gap: 28, fontSize: 22 }}>
          <Key color={BAR}>training</Key>
          <Key color={INK}>validation</Key>
        </div>
      </Say>
      <Axes x={ex} y={ey} xTicks={[1, 100, 200, 300, 400]} yTicks={[4, 6, 8, 10]} xTitle="epoch" at={haltsAt - 2} />
      <Curve points={train} x={ex} y={ey} at={haltsAt + 4} dur={30} color={BAR} width={3} clip={clip} />
      <Curve points={val} x={ex} y={ey} at={haltsAt + 10} dur={30} color={INK} width={3.4} clip={clip} />
      {/* Patience: the epochs after the best so far that it waits. */}
      <Svg opacity={brP}>
        <path
          d={`M${bestX},${bestY - h(30)} L${bestX},${bestY - h(46)} L${bestX + (stopX - bestX) * brP},${bestY - h(46)} L${bestX + (stopX - bestX) * brP},${bestY - h(30)}`}
          fill="none"
          stroke={brColor}
          strokeWidth={3.4}
        />
        <circle cx={bestX} cy={bestY} r={8 + 4 * pulse(frame, restoresAt, 18)} fill="none" stroke={INK} strokeWidth={2.6} opacity={ease(frame, restoresAt, 10)} />
        <line x1={stopX} x2={stopX} y1={y(LOSS.top)} y2={y(LOSS.bottom)} stroke={ACCENT} strokeWidth={2.4} strokeDasharray="6 6" opacity={red} />
        <circle cx={gX} cy={gY} r={(13 + 5 * pulse(frame, bestAt, 20)) * ease(frame, bestAt, 10)} fill="none" stroke={OK} strokeWidth={3.4} />
      </Svg>
      <Say at={patienceAt + 4} x={stopX + 14} y={bestY - h(70)}>
        <span style={line(23, red > 0.5 ? ACCENT_INK : LIT_INK)}>
          patience <span style={TABULAR}>{s.patience}</span>
        </span>
      </Say>
      <Say at={setAt} x={R_X + 40} y={y(840)} out={shortAt - 6}>
        <span style={line(26, INK)}>Stop after that many epochs with no new best; restore the best</span>
      </Say>
      <Say at={plateauAt - 2} x={R_X + 40} y={y(840)}>
        <span style={line(26, ACCENT_INK)}>
          Patience <span style={TABULAR}>{s.patience}</span>: stops at epoch <span style={TABULAR}>{s.stop}</span>, keeps <span style={TABULAR}>{s.best}</span>
          <span style={{ opacity: ease(frame, bestAt - 2, 10), color: OK_INK }}>
            ; the best is <span style={TABULAR}>{EARLY.globalBest}</span>
          </span>
        </span>
      </Say>
      <Say at={bestAt + 4} x={gX} y={gY - h(64)} width={280} align="center">
        <span style={line(23, OK_INK)}>
          epoch <span style={TABULAR}>{EARLY.globalBest}</span>
        </span>
      </Say>
    </>
  );
};

/** 12. RMSE, MAE and R². */
const Metrics: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();
  const rmseAt = n.word("r-metrics", "RMSE squares errors");
  const dominatesAt = n.word("r-metrics", "dominates it");
  const maeAt = n.word("r-metrics", "MAE counts");
  const lessAt = n.word("r-metrics", "far less");
  const meanAt = n.word("r-metrics", "a model predicts the mean");
  const medianAt = n.word("r-metrics", "the median");
  const r2At = n.word("r-r2", "R squared compares");
  const oneAt = n.word("r-r2", "one is perfect");
  const zeroAt = n.word("r-r2", "zero is the mean's own score");
  const negAt = n.word("r-r2", "it can go negative");
  const shareAt = n.word("r-r2", "no share of variance explained");

  const B: Box = { left: 860, right: 1560, top: 430, bottom: 720 };
  const xs: Scale = { lo: 0, hi: 40, a: B.left, b: B.right };
  const ys: Scale = { lo: 0, hi: 7, a: y(B.bottom), b: y(B.top) };
  const mae = ERRORS.sweep.map(([r, m]) => [r, m] as const);
  const rmse = ERRORS.sweep.map(([r, , q]) => [r, q] as const);
  const [, mae1, rmse1] = ERRORS.end;
  const [, mae0, rmse0] = ERRORS.start;
  const chartOut = r2At - 6;

  return (
    <>
      <Fade from={rmseAt - 6} out={chartOut}>
        <Say at={rmseAt - 4} x={B.left} y={y(B.top) - h(100)}>
          <span style={line(24, INK_SOFT)}>
            <span style={TABULAR}>{ERRORS.n}</span> errors; one of them grows from 0 to 40
          </span>
        </Say>
        <Say at={rmseAt} x={B.left} y={y(B.top) - h(56)}>
          <div style={{ display: "flex", gap: 28, fontSize: 22 }}>
            <Key color={SERIES2}>RMSE</Key>
            <Key color={BAR}>MAE</Key>
          </div>
        </Say>
        <Axes x={xs} y={ys} xTicks={[0, 10, 20, 30, 40]} yTicks={[0, 2, 4, 6]} xTitle="the one big error" at={rmseAt - 2} />
        <Curve points={rmse} x={xs} y={ys} at={rmseAt + 4} dur={dominatesAt + 10 - rmseAt} color={SERIES2} width={3.6} />
        <Curve points={mae} x={xs} y={ys} at={maeAt} dur={lessAt + 8 - maeAt} color={BAR} width={3.6} />
        <Say at={rmseAt + 4} x={B.left + 12} y={at(ys, rmse0) - 36}>
          <span style={{ ...line(23, SERIES2_INK), ...TABULAR }}>{fmt(rmse0, 1)}</span>
        </Say>
        <Say at={maeAt} x={B.left + 12} y={at(ys, mae0) + 12}>
          <span style={{ ...line(23, BLUE_INK), ...TABULAR }}>{fmt(mae0, 1)}</span>
        </Say>
        <Say at={dominatesAt} x={B.right + 16} y={at(ys, rmse1) - 18}>
          <span style={{ ...line(26, SERIES2_INK), ...TABULAR }}>RMSE {fmt(rmse1, 1)}</span>
        </Say>
        <Say at={lessAt} x={B.right + 16} y={at(ys, mae1) - 18}>
          <span style={{ ...line(26, BLUE_INK), ...TABULAR }}>MAE {fmt(mae1, 1)}</span>
        </Say>
        <Say at={meanAt - 2} x={B.left} y={y(830)}>
          <span style={line(26, INK)}>
            Trained on squared error: predicts the <b style={{ fontWeight: 600 }}>mean</b>
            <span style={{ opacity: ease(frame, medianAt - 6, 10) }}>
              ; on absolute error, the <b style={{ fontWeight: 600 }}>median</b>
            </span>
          </span>
        </Say>
      </Fade>
      <Fade from={r2At - 4}>
        <Say at={r2At - 2} x={R_X + 40} y={y(380)}>
          <span style={line(34, INK)}>
            <MathRun>
              <I>R</I>² = 1 − <span>your squared error</span> ÷ <span>the mean’s squared error</span>
            </MathRun>
          </span>
        </Say>
        {[
          { at: oneAt, v: "1", text: "perfect", ink: INK },
          { at: zeroAt, v: "0", text: "the mean’s own score", ink: INK },
          { at: negAt, v: "Below 0", text: "worse than the mean, on new data", ink: INK },
        ].map((r, i) => (
          <Say key={r.v} at={r.at - 2} x={R_X + 40} y={y(500) + i * h(66)}>
            <span style={line(30, r.ink, 400)}>
              <b style={{ fontWeight: 600, ...TABULAR }}>{r.v}</b>: {r.text}
            </span>
          </Say>
        ))}
        <Say at={shareAt - 4} x={R_X + 40} y={y(740)}>
          <span style={line(30, INK_SOFT, 400)}>
            <Strike at={shareAt + 6}>A share of variance explained</Strike>
            <span style={{ opacity: ease(frame, shareAt + 12, 10), color: ACCENT_INK }}> out of sample</span>
          </span>
        </Say>
      </Fade>
    </>
  );
};

/**
 * The quick round, questions 11 and 12: the numbered list on the left,
 * ticked as the round goes, each answer on the right. Then the bridge: the
 * round's three movements all lit, the flamingo back, and the next part.
 */
export const RapidScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("rapid-in").from;
  const twoAt = n.word("rapid-in", "Two more");
  const nextFrom = n.beat("next").from;
  const genAt = n.word("next", "whether a model will generalize");
  const nextAt = n.word("next", "Next");
  const end = n.beat("next").to;

  const items: RapidItem[] = [
    { n: 11, label: "Early stopping", at: n.beat("r-early").from, body: <Early /> },
    {
      n: 12,
      label: (
        <>
          RMSE, MAE and{" "}
          <MathRun>
            <I>R</I>²
          </MathRun>
        </>
      ),
      at: n.beat("r-metrics").from,
      body: <Metrics />,
    },
  ];
  const listOut = nextFrom - 4;
  const o = 1 - ease(frame, listOut, 12);

  return (
    <AbsoluteFill>
      <Sfx name="el-whoosh" at={from} level={-36} />
      {items.map((item) => (
        <Sfx key={item.n} name="el-tap" at={item.at} level={-32} />
      ))}
      <Sfx name="el-pop" at={nextFrom + 2} level={-34} />
      <Sfx name="el-chime" at={end} level={-32} />

      <Drift from={from} to={end + 40} scale={0.014}>
        <Kicker at={from} out={nextFrom - 4}>
          Questions 11 and 12
        </Kicker>
        <Say at={twoAt - 4} x={92} y={y(150)} out={nextFrom - 4}>
          <span style={{ ...headline(66), whiteSpace: "nowrap" }}>Two more, quickly.</span>
        </Say>
        <div style={{ position: "absolute", inset: 0, opacity: o }}>
          <RapidFire items={items} x={X0} top={y(330)} rowH={h(58)} width={560} at={twoAt} end={nextFrom} />
        </div>

        {/* ── The bridge ── */}
        <Kicker at={nextFrom}>Machine learning engineer interview questions</Kicker>
        <Say at={genAt - 4} x={92} y={y(150)}>
          <span style={{ ...headline(58), whiteSpace: "nowrap" }}>You can now tell whether a model will generalize</span>
        </Say>
        <PlanMap
          x={X0}
          top={y(300)}
          width={1080}
          groupAt={[nextFrom, nextFrom + 3, nextFrom + 6, nextFrom + 9]}
          lit={{ 0: genAt, 1: genAt + 4, 2: genAt + 8 }}
          quickLit={genAt + 12}
        />
        <Spot id="mle-generalization-flamingo" at={nextFrom + 4} x={1440} y={y(250)} w={270} />
        <NextLine at={nextAt} x={1290} y={y(800)} width={480}>
          models and how they learn
        </NextLine>
      </Drift>
    </AbsoluteFill>
  );
};
