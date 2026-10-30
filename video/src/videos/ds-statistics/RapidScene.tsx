import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { RapidFire, type RapidItem } from "../../editorial/interview";
import { type Layout, useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, INK, INK_SOFT, TABULAR, fmt, label } from "../../editorial/style";
import { NextLine, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { CORR } from "../da-statistics-communication/data";
import { BAYES, RANKS } from "./data";
import { at, Axes, Curve, Drift, Headline, Kicker, Mark, MARK_OK, mulberry32, noteText, OK_INK, type Scale, Spot, Svg, WARM, WARM_INK, X0 } from "./parts";

/** Where the answers go: right of the list. */
const R_X = 800;
const R_END = 1760;
const LIST_TOP = 330;
const ROW = 56;

type Ctx = { w: (beat: string, phrase: string) => number; y: Layout["y"]; h: Layout["h"] };

// ── 17. Frequentist and Bayesian ────────────────────────────────────────────

const Bayes: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const freqAt = c.w("r-bayes", "A frequentist treats");
  const fixedAt = c.w("r-bayes", "as fixed");
  const randomAt = c.w("r-bayes", "the data as random");
  const reportsAt = c.w("r-bayes", "and reports p-values");
  const bayesAt = c.w("r-bayes", "A Bayesian updates");
  const priorAt = c.w("r-bayes", "a prior");
  const posteriorAt = c.w("r-bayes", "into a posterior");
  const pageAt = c.w("r-bayes-ab", "Take an A B test");
  const bAt = c.w("r-bayes-ab", "against a hundred and fifty");
  const flatAt = c.w("r-bayes-ab", "Start from flat priors");
  const distAt = c.w("r-bayes-ab", "a distribution for each rate");
  const pctAt = c.w("r-bayes-ab", "ninety-seven and a half percent");
  const s: Scale = { lo: 0.08, hi: 0.2, a: R_X + 30, b: R_END - 40 };
  const base = c.y(740);
  const peak = Math.max(...BAYES.a, ...BAYES.b);
  // Curves a little short of the definition above them, so their labels keep
  // the house gap under it.
  const curveH = c.h(225);
  const pts = (v: readonly number[]) => BAYES.grid.map((g, i) => [at(s, g), base - (v[i] / peak) * curveH] as const);
  return (
    <>
      <Note at={freqAt} x={R_X} y={c.y(330)}>
        <span style={{ ...noteText(25, INK) }}>
          <b>frequentist</b>: the parameter is <Mark at={fixedAt + 2}>fixed</Mark>, the data <Mark at={randomAt + 4}>random</Mark>
        </span>
      </Note>
      <Note at={reportsAt} x={R_X + 24} y={c.y(372)}>
        <span style={{ ...noteText(22, INK_SOFT) }}>p-values and confidence intervals</span>
      </Note>
      <Note at={bayesAt} x={R_X} y={c.y(424)}>
        <span style={{ ...noteText(25, BLUE_INK) }}>
          <b>Bayesian</b>: <Mark at={priorAt + 2}>a prior</Mark>, updated into <Mark at={posteriorAt + 6}>a posterior</Mark>
        </span>
      </Note>
      <Axes x={s} y={{ lo: 0, hi: 1, a: base, b: base - curveH }} xTicks={[0.1, 0.12, 0.14, 0.16, 0.18]} xFormat={(v) => `${Math.round(v * 100)}%`} xTitle="conversion rate" at={pageAt} size={19} />
      <Curve points={pts(BAYES.a)} at={pageAt + 6} dur={20} color={INK_SOFT} width={3} fill={`color-mix(in srgb, ${INK_SOFT} 10%, transparent)`} base={base} />
      <Curve points={pts(BAYES.b)} at={bAt} dur={20} color={BAR} width={3} fill={`color-mix(in srgb, ${BAR} 14%, transparent)`} base={base} />
      <Note at={pageAt + 8} x={at(s, 0.121) - 10} y={base - c.h(258)} align="right">
        <span style={{ ...noteText(22, INK_SOFT), ...TABULAR }}>A: 120 in 1,000</span>
      </Note>
      <Note at={bAt + 4} x={at(s, 0.151) + 10} y={base - c.h(258)}>
        <span style={{ ...noteText(22, BLUE_INK), ...TABULAR }}>B: 150 in 1,000</span>
      </Note>
      <Note at={flatAt} x={R_X + 30} y={c.y(836)}>
        <span style={{ ...noteText(24, INK), ...TABULAR }}>
          <span style={{ color: INK_SOFT }}>from flat priors: </span>
          <span style={{ opacity: ease(frame, distAt - 2, 10) }}>a distribution for each rate</span>
          <span style={{ opacity: ease(frame, pctAt - 2, 10) }}>
            , and <Mark at={pctAt + 2} color={MARK_OK}>a {fmt(BAYES.pBetter * 100, 1)}% chance</Mark> B&apos;s is higher
          </span>
        </span>
      </Note>
    </>
  );
};

// ── 18. Parametric and non-parametric ───────────────────────────────────────

const Ranks: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const paraAt = c.w("r-param", "A parametric test assumes");
  const nonAt = c.w("r-param", "A non-parametric one works on ranks");
  const queuesAt = c.w("r-param", "Two support queues");
  const monsterAt = c.w("r-param", "three monster tickets");
  const tAt = c.w("r-param", "point seven two");
  const swampAt = c.w("r-param-why", "The monsters blow up the spread");
  const ranksAt = c.w("r-param-why", "On ranks, a monster is just the largest");
  const shiftAt = c.w("r-param-u", "finds the shift");
  const uAt = c.w("r-param-u", "point oh three three");
  // Ordinary tickets on a linear scale; the six monsters past a break.
  const s: Scale = { lo: 10, hi: 60, a: R_X + 30, b: 1460 };
  const far: Scale = { lo: 270, hi: 420, a: 1560, b: R_END - 20 };
  const px = (v: number) => (v > 100 ? at(far, v) : at(s, v));
  const rand = mulberry32(18);
  const rows = [
    { name: "queue A", values: RANKS.a, median: RANKS.medianA, y: c.y(560), color: INK_SOFT, ink: INK },
    { name: "queue B", values: RANKS.b, median: RANKS.medianB, y: c.y(660), color: BAR, ink: BLUE_INK },
  ];
  const med = ease(frame, shiftAt, 12);
  return (
    <>
      <Note at={paraAt} x={R_X} y={c.y(330)}>
        <span style={{ ...noteText(25, INK) }}>
          <b>parametric</b>: assumes a distribution, usually normal
        </span>
      </Note>
      <Note at={nonAt} x={R_X} y={c.y(380)}>
        <span style={{ ...noteText(25, INK) }}>
          <b>non-parametric</b>: works on ranks
        </span>
      </Note>
      <Svg opacity={ease(frame, queuesAt, 12)}>
        {rows.map((r, k) => (
          <g key={k}>
            <line x1={s.a} x2={s.b} y1={r.y} y2={r.y} stroke={INK} strokeWidth={1.2} opacity={0.5} />
            <line x1={far.a} x2={far.b} y1={r.y} y2={r.y} stroke={INK} strokeWidth={1.2} opacity={0.5} />
            <text x={(s.b + far.a) / 2} y={r.y + 7} textAnchor="middle" fill={INK_SOFT} style={{ ...label(22, INK_SOFT) }}>
              //
            </text>
            {r.values.map((v, i) => {
              const monster = v > 100;
              const show = ease(frame, (monster ? monsterAt : queuesAt) + i * 0.3, 8);
              return show > 0 ? (
                <circle key={i} cx={px(v)} cy={r.y + (rand() - 0.5) * c.h(26)} r={(monster ? 8 : 6) * show} fill={monster ? ACCENT : r.color} opacity={0.85} />
              ) : null;
            })}
          </g>
        ))}
        {/* Each queue's median, drawn as Mann-Whitney finds the shift. */}
        {med > 0
          ? rows.map((r) => (
              <line key={r.name} x1={px(r.median)} x2={px(r.median)} y1={r.y - c.h(26) * med} y2={r.y + c.h(26) * med} stroke={r.ink} strokeWidth={3.4} strokeLinecap="round" />
            ))
          : null}
      </Svg>
      {rows.map((r, k) => (
        <Note key={`m${r.name}`} at={shiftAt + 4 + k * 4} x={px(r.median)} y={r.y - c.h(56)} align={k ? "left" : "right"} from="up">
          <span style={{ ...noteText(20, r.ink), ...TABULAR }}>median {fmt(r.median, 1)}</span>
        </Note>
      ))}
      <Note at={queuesAt + 8} x={s.b} y={c.y(690)} align="right">
        <span style={{ ...label(19, INK_SOFT), fontWeight: 650 }}>minutes to resolve a ticket</span>
      </Note>
      {rows.map((r) => (
        <Note key={r.name} at={queuesAt} x={R_X + 30} y={r.y - c.h(52)}>
          <span style={{ ...label(20, INK_SOFT) }}>{r.name}</span>
        </Note>
      ))}
      <Note at={monsterAt + 4} x={R_END} y={c.y(470)} align="right">
        <span style={{ ...noteText(22, ACCENT_INK) }}>three monster tickets each</span>
      </Note>
      <Note at={tAt - 4} x={R_X} y={c.y(740)}>
        <span style={{ ...noteText(26, ACCENT_INK) }}>
          t-test: <span style={{ ...TABULAR }}>p = {fmt(RANKS.t, 2)}</span>
          <span style={{ ...noteText(22, INK_SOFT), marginLeft: 14 }}>sees nothing</span>
        </span>
      </Note>
      <Note at={swampAt} x={R_X + 24} y={c.y(792)}>
        <span style={{ ...noteText(22, INK_SOFT) }}>
          the monsters blow up the spread;
          <span style={{ opacity: ease(frame, ranksAt - 2, 10) }}> on ranks, a monster is just the largest</span>
        </span>
      </Note>
      <Note at={uAt - 4} x={R_X} y={c.y(850)}>
        <span style={{ ...noteText(26, OK_INK) }}>
          Mann-Whitney:{" "}
          <Mark at={uAt + 4} color={MARK_OK}>
            <span style={{ ...TABULAR }}>p = {fmt(RANKS.u, 3)}</span>
          </Mark>
          <span style={{ ...noteText(22, INK_SOFT), marginLeft: 14 }}>finds the shift</span>
        </span>
      </Note>
    </>
  );
};

// ── 19. Correlation and causation ───────────────────────────────────────────

const Corr: React.FC<{ c: Ctx }> = ({ c }) => {
  const corrAt = c.w("r-corr", "Correlation is two variables");
  const causeAt = c.w("r-corr", "Causation is one changing");
  const iceAt = c.w("r-corr", "Ice cream sales and drownings");
  const rAt = c.w("r-corr", "point five seven");
  const hotAt = c.w("r-corr-hold", "Both climb on hot days");
  const confAt = c.w("r-corr-hold", "temperature is a confounder");
  const holdAt = c.w("r-corr-hold", "Hold it fixed");
  const partialAt = c.w("r-corr-hold", "point oh eight");
  const expAt = c.w("r-corr-cause", "A cause takes an experiment");
  const sx: Scale = { lo: 0, hi: 1, a: R_X + 40, b: 1400 };
  const ice = CORR.days.map((d) => d[1]);
  const drown = CORR.days.map((d) => d[2]);
  const iceLo = Math.min(...ice);
  const iceHi = Math.max(...ice);
  const dHi = Math.max(...drown);
  const base = c.y(770);
  const rand = mulberry32(19);
  const dots = CORR.days.map(([t, i, d]) => ({
    x: at(sx, (i - iceLo) / (iceHi - iceLo)),
    y: base - ((d + (rand() - 0.5) * 0.5 + 0.5) / (dHi + 1)) * c.h(300),
    hot: t >= CORR.hot,
  }));
  const frame = useCurrentFrame();
  // Where the hot days sit: the label goes over the top right of their cluster.
  const hotDots = dots.filter((d) => d.hot);
  const hotX = Math.max(...hotDots.map((d) => d.x)) + 6;
  const hotY = Math.min(...hotDots.map((d) => d.y));
  return (
    <>
      <Note at={corrAt} x={R_X} y={c.y(330)}>
        <span style={{ ...noteText(25, INK) }}>
          <b>correlation</b>: two variables moving together
        </span>
      </Note>
      <Note at={causeAt} x={R_X} y={c.y(376)}>
        <span style={{ ...noteText(25, INK) }}>
          <b>causation</b>: one changing the other
        </span>
      </Note>
      <Axes x={sx} y={{ lo: 0, hi: 1, a: base, b: base - c.h(300) }} xTicks={[]} xTitle="ice cream sold" yTitle="drownings" at={iceAt} size={19} />
      <Svg>
        {dots.map((d, i) => {
          const p = ease(frame, iceAt + 4 + i * 0.15, 8);
          if (p <= 0) return null;
          const warm = d.hot ? ease(frame, hotAt + 2, 12) : 0;
          return <circle key={i} cx={d.x} cy={d.y} r={5.5 * p} fill={warm > 0 ? `color-mix(in srgb, ${WARM} ${warm * 100}%, ${BAR})` : BAR} opacity={0.7} />;
        })}
      </Svg>
      <Note at={hotAt + 8} x={hotX} y={hotY - c.h(40)} align="right">
        <span style={{ ...noteText(22, WARM_INK) }}>hot days</span>
      </Note>
      <Note at={rAt} x={1440} y={c.y(560)}>
        <span style={{ ...noteText(28, BLUE_INK), ...TABULAR, opacity: 1 - 0.6 * ease(frame, partialAt, 12) }}>r = {fmt(CORR.r, 2)}</span>
      </Note>
      <Note at={confAt} x={1440} y={c.y(620)}>
        <div style={{ ...noteText(22, INK_SOFT), lineHeight: 1.35 }}>
          <span style={{ color: WARM_INK }}>temperature, the confounder,</span>
          <br />
          <span style={{ opacity: ease(frame, holdAt - 2, 10) }}>held fixed: </span>
          <span style={{ ...noteText(28, OK_INK), fontWeight: 650, opacity: ease(frame, partialAt - 2, 10), ...TABULAR }}>{fmt(CORR.partial, 2)}</span>
        </div>
      </Note>
      <Note at={expAt} x={R_X} y={c.y(860)}>
        <span style={{ ...noteText(24, OK_INK) }}>a cause takes an experiment, or a careful causal design</span>
      </Note>
    </>
  );
};

/**
 * The quick round, questions 17 to 19, each an either-or: frequentist or
 * Bayesian on the page's A/B table, parametric or non-parametric on the
 * course's two support queues, and correlation or causation on the Data
 * Analyst statistics video's ice cream and drownings. Then the bridge into
 * probability, with the hedgehog back.
 */
export const RapidScene: React.FC = () => {
  const n = useNarration();
  const { y, h } = useLayout();
  const c: Ctx = { w: (b, p) => n.word(b, p), y, h };

  const from = n.beat("rapid-in").from;
  const coreAt = n.word("rapid-in", "That covers the core");
  const leftAt = n.word("rapid-in", "three either-or questions");
  const nextAt = n.word("next", "Next: probability");
  const restsAt = n.word("next", "rests on probability");
  const end = n.beat("next").from;

  const items: RapidItem[] = [
    { n: 17, label: "Frequentist or Bayesian?", beat: "r-bayes", body: <Bayes c={c} /> },
    { n: 18, label: "Parametric or non-parametric?", beat: "r-param", body: <Ranks c={c} /> },
    { n: 19, label: "Correlation or causation?", beat: "r-corr", body: <Corr c={c} /> },
  ].map(({ beat, ...item }) => ({ ...item, at: n.beat(beat).from }));

  return (
    <AbsoluteFill>
      <Sfx name="el-whoosh" at={from} level={-34} />
      {items.map((item) => (
        <Sfx key={item.n} name="el-tap" at={item.at} level={-34} />
      ))}
      <Sfx name="el-chime" at={nextAt} level={-34} />

      <Drift from={from} to={n.beat("next").to + 40} scale={0.015}>
        <Kicker at={from}>Questions 17 to 19</Kicker>
        <Headline lead="That covers the core." turn="Three either-or questions." at={coreAt - 4} turnAt={leftAt - 4} size={62} />

        <RapidFire items={items} x={X0} top={y(LIST_TOP) + h(40)} rowH={h(ROW)} width={600} at={leftAt} end={end} />

        <Spot id="ds-statistics-hedgehog" at={restsAt} left={1180} top={y(360)} width={560} height={400} />
        <NextLine at={nextAt} x={R_X} y={y(820)} width={940}>
          probability
        </NextLine>
        <Note at={restsAt} x={R_X} y={y(760)}>
          <span style={{ ...noteText(24, INK_SOFT) }}>every test here rests on probability</span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};

