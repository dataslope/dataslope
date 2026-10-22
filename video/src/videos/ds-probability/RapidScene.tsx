import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { RapidFire, type RapidItem } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, INK, INK_SOFT, TABULAR, fmt, label, note } from "../../editorial/style";
import { NextLine, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { BET, COV } from "./data";
import { at, Axes, DATA, Dots, Drift, Headline, Kicker, Mark, OK, OK_INK, type Scale, Spot, Svg, X0 } from "./parts";

const LIST_TOP = 380;
const ROW = 66;
const R_X = 780;
const SCATTER = { left: 860, right: 1260, top: 400, base: 700 };
const SIDE = 1340;
const PARA = { left: 1350, right: 1600, top: 650, base: 800 };
const BET_ROW = { top: 420, row: 110, zero: 1300, unit: 110, bar: 50 };

type Words = (beat: string, phrase: string) => number;

/** 13. Covariance against correlation: the video's own 200 people, then the
 *  same people in meters, and y = x squared with r = 0. */
const Cov: React.FC<{ w: Words }> = ({ w }) => {
  const frame = useCurrentFrame();
  const { y } = useLayout();
  const startAt = w("r-cov", "Covariance tracks");
  const cmAt = w("r-cov", "forty-two in centimeters");
  const mAt = w("r-cov", "point four two in meters");
  const corrAt = w("r-cov", "Correlation divides");
  const rangeAt = w("r-cov", "between minus one and one");
  const zeroAt = w("r-cov", "zero correlation");
  const lineAt = w("r-cov", "rules out a straight line");

  const xs: Scale = { lo: 145, hi: 200, a: SCATTER.left, b: SCATTER.right };
  const ys: Scale = { lo: 35, hi: 110, a: y(SCATTER.base), b: y(SCATTER.top) };
  const dots = COV.points.map(([hcm, kg], i) => ({ x: at(xs, hcm), y: at(ys, kg), at: startAt + 2 + (i % 40) * 0.5 }));
  const scale = { x0: SIDE, x1: SIDE + 400, y: y(560) };
  const rX = scale.x0 + ((COV.rCm + 1) / 2) * (scale.x1 - scale.x0);
  const px: Scale = { lo: -3, hi: 3, a: PARA.left, b: PARA.right };
  const py: Scale = { lo: 0, hi: 9, a: y(PARA.base), b: y(PARA.top) };
  const paraP = ease(frame, zeroAt, 18);

  return (
    <>
      <Axes x={xs} y={ys} xTicks={[150, 175, 200]} yTicks={[50, 100]} xTitle="height, cm" yTitle="weight, kg" at={startAt} size={18} />
      <Dots dots={dots} r={4.5} opacity={0.6} />
      <Note at={startAt + 6} x={SIDE} y={y(390)}>
        <span style={{ ...label(23, INK_SOFT), whiteSpace: "nowrap" }}>covariance</span>
      </Note>
      <Note at={cmAt} x={SIDE} y={y(424)}>
        <span style={{ ...note(30, INK), ...TABULAR, whiteSpace: "nowrap" }}>{fmt(COV.covCm, 1)} in centimeters</span>
      </Note>
      <Note at={mAt} x={SIDE} y={y(466)}>
        <span style={{ ...note(30, INK), ...TABULAR, whiteSpace: "nowrap" }}>{fmt(COV.covM, 2)} in meters</span>
      </Note>
      <Note at={corrAt} x={SIDE} y={y(512)}>
        <span style={{ ...label(23, INK_SOFT), ...TABULAR, whiteSpace: "nowrap" }}>
          correlation <span style={{ color: OK_INK }}>{fmt(COV.rCm)}</span> either way
        </span>
      </Note>
      <Svg opacity={ease(frame, rangeAt, 12)}>
        <line x1={scale.x0} x2={scale.x1} y1={scale.y + 22} y2={scale.y + 22} stroke={INK} strokeWidth={2} />
        {[-1, 0, 1].map((v) => {
          const x = scale.x0 + ((v + 1) / 2) * (scale.x1 - scale.x0);
          return (
            <g key={v}>
              <line x1={x} x2={x} y1={scale.y + 14} y2={scale.y + 30} stroke={INK} strokeWidth={2} />
              <text x={x} y={scale.y + 54} textAnchor="middle" style={{ ...label(18, INK_SOFT), ...TABULAR }}>
                {v === -1 ? "−1" : v}
              </text>
            </g>
          );
        })}
        <circle cx={rX} cy={scale.y + 22} r={9} fill={OK} />
      </Svg>
      <Axes x={px} y={py} xTicks={[]} at={zeroAt - 4} size={16} />
      <Svg opacity={paraP}>
        {COV.parabola.map(([x, v], i) => (
          <circle key={i} cx={at(px, x)} cy={at(py, v)} r={4.5} fill={DATA} opacity={0.75} />
        ))}
      </Svg>
      <Note at={zeroAt + 4} x={PARA.right + 30} y={y(PARA.top) + 10}>
        <span style={{ ...label(26, INK), ...TABULAR, whiteSpace: "nowrap" }}>r = {fmt(COV.parabolaR)}</span>
      </Note>
      <Note at={lineAt} x={PARA.right + 30} y={y(PARA.top) + 52}>
        <span style={{ ...note(21, INK_SOFT), whiteSpace: "nowrap" }}>no straight line,</span>
        <br />
        <span style={{ ...note(21, INK_SOFT), whiteSpace: "nowrap" }}>
          <Mark at={lineAt + 10}>still a relationship</Mark>
        </span>
      </Note>
    </>
  );
};

/** 14. The bet: +$10 one time in five, -$3 otherwise, as two signed bars
 *  that net to -40 cents; the likelier row is the loss. */
const Bet: React.FC<{ w: Words; out?: number }> = ({ w, out: dim }) => {
  const frame = useCurrentFrame();
  const { y } = useLayout();
  const startAt = w("r-bet", "pays ten dollars");
  const loseAt = w("r-bet", "loses three otherwise");
  const twoAt = w("r-bet", "Two dollars");
  const minusAt = w("r-bet", "minus two forty");
  const fortyAt = w("r-bet", "loses forty cents a play");
  const likelyAt = w("r-bet", "its likeliest outcome");
  const d = dim === undefined ? 0 : ease(frame, dim, 14);
  const rows = [
    { text: "win $10, one time in five", part: BET.winPart, at: startAt, partAt: twoAt, color: OK, ink: OK_INK },
    { text: "lose $3, four times in five", part: BET.losePart, at: loseAt, partAt: minusAt, color: ACCENT, ink: ACCENT_INK },
  ];
  const money = (v: number) => `${v < 0 ? "−" : "+"}$${fmt(Math.abs(v))}`;
  return (
    <div style={{ position: "absolute", inset: 0, opacity: 1 - d }}>
      {rows.map((r, i) => {
        const top = y(BET_ROW.top) + i * BET_ROW.row;
        const p = ease(frame, r.partAt, 16);
        const wpx = Math.abs(r.part) * BET_ROW.unit * p;
        return (
          <React.Fragment key={i}>
            <Note at={r.at} x={R_X} y={top}>
              <span style={{ ...note(28, INK), whiteSpace: "nowrap" }}>{i === 1 ? <Mark at={likelyAt}>{r.text}</Mark> : r.text}</span>
            </Note>
            <Svg>
              <rect x={r.part >= 0 ? BET_ROW.zero : BET_ROW.zero - wpx} y={top + 46} width={wpx} height={BET_ROW.bar} rx={4} fill={r.color} opacity={0.85} />
            </Svg>
            <Note
              at={r.partAt + 8}
              x={r.part >= 0 ? BET_ROW.zero + wpx + 14 : BET_ROW.zero - Math.abs(r.part) * BET_ROW.unit - 14}
              align={r.part >= 0 ? "left" : "right"}
              y={top + 54}
            >
              <span style={{ ...label(28, r.ink), ...TABULAR }}>{money(r.part)}</span>
            </Note>
          </React.Fragment>
        );
      })}
      <Svg opacity={ease(frame, startAt, 12)}>
        <line x1={BET_ROW.zero} x2={BET_ROW.zero} y1={y(BET_ROW.top) + 30} y2={y(BET_ROW.top) + 2 * BET_ROW.row + 10} stroke={INK} strokeWidth={2} />
      </Svg>
      <Note at={fortyAt} x={R_X} y={y(BET_ROW.top) + 2 * BET_ROW.row + 24}>
        <span style={{ ...note(34, ACCENT_INK), fontWeight: 700, ...TABULAR, whiteSpace: "nowrap" }}>
          expected value: −$0.40 a play
        </span>
      </Note>
    </div>
  );
};

/**
 * The last two questions, 13 and 14, in this part's own words ("Two
 * definitions left"), then the bridge into machine learning with the rabbit
 * back on the page.
 */
export const RapidScene: React.FC = () => {
  const n = useNarration();
  const { y, h } = useLayout();
  const w: Words = (b, p) => n.word(b, p);

  const from = n.beat("rapid-in").from;
  const puzzleAt = n.word("rapid-in", "That's every puzzle");
  const leftAt = n.word("rapid-in", "Two definitions left");
  const modelAt = n.word("next", "A model's output");
  const holdsAt = n.word("next", "holds up on data");
  const scoreAt = n.word("next", "how you'd score it");
  const nextAt = n.word("next", "Next: machine learning");
  const end = n.beat("next").from;
  const betAt = n.beat("r-bet").from;

  const items: RapidItem[] = [
    { n: 13, label: "Covariance vs. correlation", at: n.beat("r-cov").from, body: <Cov w={w} /> },
    { n: 14, label: "The expected value of a bet", at: betAt },
  ];

  return (
    <AbsoluteFill>
      <Sfx name="el-whoosh" at={from} level={-34} />
      {items.map((item) => (
        <Sfx key={item.n} name="el-tap" at={item.at} level={-34} />
      ))}
      <Sfx name="el-pop" at={n.word("r-bet", "loses forty cents a play") + 4} level={-32} />
      <Sfx name="el-chime" at={nextAt} level={-34} />

      <Drift from={from} to={n.beat("next").to + 40} scale={0.015}>
        <Kicker at={from}>Questions 13 and 14</Kicker>
        <Headline lead="That's every puzzle." turn="Two definitions left." at={puzzleAt - 4} turnAt={leftAt - 2} size={64} />

        {/* The bet stays up into the bridge, so its body sits outside the list. */}
        <RapidFire items={items} x={X0} top={y(LIST_TOP)} rowH={h(ROW)} width={560} at={leftAt} end={end} />
        <Fade from={betAt - 6}>
          <Bet w={w} out={modelAt - 4} />
        </Fade>

        {/* ── Into machine learning ── */}
        <Spot id="ds-probability-rabbit" at={modelAt} left={X0 - 10} top={y(560)} width={420} height={300} />
        <Note at={modelAt + 4} x={R_X} y={y(440)}>
          <span style={{ ...note(30, INK), whiteSpace: "nowrap" }}>A model&rsquo;s output is a probability too.</span>
        </Note>
        <Note at={holdsAt} x={R_X} y={y(520)}>
          <span style={{ ...note(30, INK_SOFT), whiteSpace: "nowrap" }}>
            Does it hold up on data the model hasn&rsquo;t seen?
          </span>
        </Note>
        <Note at={scoreAt} x={R_X} y={y(580)}>
          <span style={{ ...note(30, INK_SOFT), whiteSpace: "nowrap" }}>How would you score it?</span>
        </Note>
        <NextLine at={nextAt} x={R_X} y={y(760)} width={1000}>
          Machine learning, training and evaluating
        </NextLine>
      </Drift>
    </AbsoluteFill>
  );
};

const Fade: React.FC<{ from: number; children: React.ReactNode }> = ({ from, children }) => {
  const frame = useCurrentFrame();
  const o = ease(frame, from, 8);
  return o > 0 ? <AbsoluteFill style={{ opacity: o }}>{children}</AbsoluteFill> : null;
};
