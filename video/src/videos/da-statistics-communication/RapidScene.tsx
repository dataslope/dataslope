import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { normalPdf } from "../../editorial/charts";
import { RapidFire, type RapidItem } from "../../editorial/interview";
import { type Layout, useLayout } from "../../editorial/layout";
import { BAR, BLUE_INK, INK, INK_SOFT, TABULAR, fmt, label, note } from "../../editorial/style";
import { NextLine, Note } from "../../editorial/ui";
import { SANS } from "../../theme/fonts";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { RAPID } from "./data";
import { at, Drift, Headline, Kicker, Mark, OK, OK_INK, type Scale, Spot, Svg, VLine, X0 } from "./parts";

/** Where the answers go: right of the list. */
const R_X = 760;
const R_END = 1720;
const LIST_TOP = 300;
const ROW = 50;

type Ctx = { w: (beat: string, phrase: string) => number; y: Layout["y"]; h: Layout["h"] };

const tick = (size = 20): React.CSSProperties => ({
  fontFamily: SANS,
  fontSize: size,
  fontWeight: 500,
  fill: INK_SOFT,
  fontVariantNumeric: "tabular-nums",
});

/** A bare number line with its ticks, drawn on `at`. */
const Line: React.FC<{ s: Scale; y: number; ticks: readonly number[]; at: number; format?: (v: number) => string }> = ({
  s,
  y,
  ticks,
  at: from,
  format = String,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, from, 14);
  return (
    <Svg>
      <line x1={s.a} x2={s.a + (s.b - s.a) * p} y1={y} y2={y} stroke={INK} strokeWidth={1.6} />
      <g opacity={ease(frame, from + 6, 10)}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={at(s, t)} x2={at(s, t)} y1={y} y2={y + 7} stroke={INK} strokeWidth={1.2} />
            <text x={at(s, t)} y={y + 32} textAnchor="middle" style={tick()}>
              {format(t)}
            </text>
          </g>
        ))}
      </g>
    </Svg>
  );
};

// ── 11. Variance and standard deviation ─────────────────────────────────────

const Variance: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const at0 = c.w("r-var", "Variance is");
  const squaredAt = c.w("r-var", "average squared distance");
  const rootAt = c.w("r-var", "its square root");
  const unitsAt = c.w("r-var", "the data's own units");
  const takeAt = c.w("r-var-n", "Take ten");
  const squaresAt = c.w("r-var-n", "Their squared distances");
  const sumAt = c.w("r-var-n", "add to a thousand");
  const overFiveAt = c.w("r-var-n", "a thousand over five");
  const ddofAt = c.w("r-var-n", "n minus one");
  const fiftyAt = c.w("r-var-n", "two fifty");
  const closerAt = c.w("r-var-n", "sits closer");
  const sdAt = c.w("r-var-n", "fifteen point eight one");
  const V = RAPID.variance;
  const { values, deviations } = V;
  const s: Scale = { lo: 0, hi: 60, a: R_X + 40, b: R_END };
  const lineY = c.y(560);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const mx = at(s, mean);
  const count = (v: number) => v.toLocaleString("en-US");
  // The lines under the figure, each a row of its own.
  const row = (k: number) => c.y(626) + k * c.h(44);
  return (
    <>
      <Line s={s} y={lineY} ticks={[0, 10, 20, 30, 40, 50, 60]} at={at0 - 4} />
      <VLine
        x={mx}
        top={c.y(300)}
        bottom={lineY}
        at={at0}
        color={INK}
        dash="6 6"
        width={2}
        labelY={c.y(290)}
        label={<span style={{ ...note(22, INK_SOFT), ...TABULAR }}>mean {fmt(mean, 0)}</span>}
      />
      {/* Each value's distance from the mean, one row each. */}
      <Svg>
        {values.map((v, i) => {
          const rowY = c.y(360) + i * c.h(36);
          const p = ease(frame, squaredAt + i * 3, 12);
          const x = at(s, v);
          return (
            <g key={v} opacity={p}>
              {v !== mean ? <line x1={mx} x2={mx + (x - mx) * p} y1={rowY} y2={rowY} stroke={BAR} strokeWidth={5} strokeLinecap="round" /> : null}
              <line x1={x} x2={x} y1={rowY} y2={lineY} stroke={BAR} strokeWidth={1} strokeDasharray="2 5" opacity={0.6} />
            </g>
          );
        })}
        {values.map((v) => (
          <circle key={v} cx={at(s, v)} cy={lineY} r={11 * ease(frame, at0 + 2, 10)} fill={BAR} />
        ))}
      </Svg>
      {values.map((v, i) => {
        const d = deviations[i];
        return (
          <Note key={v} at={squaredAt + i * 3 + 4} x={at(s, v) + (d < 0 ? -64 : 14)} y={c.y(360) + i * c.h(36) - 14}>
            <span style={{ ...label(19, BLUE_INK), ...TABULAR, whiteSpace: "nowrap" }}>
              {d === 0 ? "" : `${d < 0 ? "−" : "+"}${Math.abs(d)}`}
            </span>
          </Note>
        );
      })}
      <Note at={squaredAt - 2} x={R_X + 40} y={row(0)}>
        <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>
          <b>variance</b>: the average squared distance from the mean
        </span>
      </Note>
      <Note at={rootAt - 2} x={R_X + 40} y={row(1)}>
        <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>
          <b>standard deviation</b>: its square root
          <span style={{ opacity: ease(frame, unitsAt - 2, 10) }}>, in the data&apos;s own units</span>
        </span>
      </Note>
      {/* The page's 10 to 50, worked: the squares, then both divisors. */}
      <Note at={Math.min(takeAt + 8, squaresAt) - 2} x={R_X + 40} y={row(2) + c.h(10)}>
        <span style={{ ...note(26, BLUE_INK), whiteSpace: "nowrap" }}>
          squared: <Num>{V.squares.map(count).join(" + ")}</Num>
          <span style={{ opacity: ease(frame, sumAt - 2, 10) }}>
            {" "}= <b><Num>{count(V.sumSquares)}</Num></b>
          </span>
        </span>
      </Note>
      <Note at={overFiveAt - 2} x={R_X + 40} y={row(3) + c.h(10)}>
        <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>
          <Num>
            {count(V.sumSquares)} ÷ {V.n} = {fmt(V.varPop, 0)}
          </Num>
          , the average: divide by n
        </span>
      </Note>
      <Note at={ddofAt - 2} x={R_X + 40} y={row(4) + c.h(10)}>
        <span style={{ ...note(26, BLUE_INK), whiteSpace: "nowrap" }}>
          <Num>
            {count(V.sumSquares)} ÷ {V.n - 1} ={" "}
            <b style={{ opacity: ease(frame, fiftyAt - 2, 10) }}>{fmt(V.var, 0)}</b>
          </Num>
          , pandas&apos; <Mono>.var()</Mono>: a sample divides by n − 1
        </span>
      </Note>
      <Note at={closerAt - 2} x={R_X + 40} y={row(5) + c.h(10)}>
        <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>
          a sample&apos;s own mean sits closer to its points, so ÷ n comes out small
        </span>
      </Note>
      <Note at={sdAt - 4} x={R_X + 40} y={row(6) + c.h(14)}>
        <span style={{ ...note(28, BLUE_INK), whiteSpace: "nowrap" }}>
          standard deviation: <Num>√{fmt(V.var, 0)} =</Num> <b><Num>{fmt(V.std)}</Num></b>
        </span>
      </Note>
    </>
  );
};

// ── 12. The mode ────────────────────────────────────────────────────────────

const Mode: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const at0 = c.w("r-mode", "The mode is");
  const billingAt = c.w("r-mode", "the most common ticket is billing");
  const twoAt = c.w("r-mode", "Two modes");
  const rows = RAPID.mode.counts.rows;
  const unit = 170;
  const barX = R_X + 200;
  const top = c.y(360);
  return (
    <>
      <Note at={at0 - 4} x={R_X + 40} y={top - c.h(10)}>
        <span style={{ ...label(21, INK_SOFT), whiteSpace: "nowrap" }}>support tickets, by type</span>
      </Note>
      {rows.map(([name, count], i) => {
        const p = ease(frame, at0 + 4 + i * 3, 14);
        const isMode = name === RAPID.mode.mode;
        const rowTop = top + c.h(50) + i * c.h(62);
        return (
          <React.Fragment key={name}>
            <div style={{ position: "absolute", left: R_X + 40, top: rowTop, ...note(26, INK), opacity: p, whiteSpace: "nowrap" }}>
              {isMode ? <Mark at={billingAt}>{name}</Mark> : name}
            </div>
            <div
              style={{
                position: "absolute",
                left: barX,
                top: rowTop + 4,
                width: Number(count) * unit * p,
                height: c.h(32),
                background: isMode ? `color-mix(in srgb, ${OK} ${100 * ease(frame, billingAt, 12)}%, ${BAR})` : BAR,
                borderRadius: 2,
              }}
            />
            <div style={{ position: "absolute", left: barX + Number(count) * unit + 14, top: rowTop, ...label(22, INK), opacity: p, ...TABULAR }}>
              {count}
            </div>
          </React.Fragment>
        );
      })}
      <Note at={billingAt + 4} x={barX + 3 * unit + 60} y={top + c.h(50)}>
        <span style={{ ...note(28, OK_INK), fontWeight: 650, whiteSpace: "nowrap" }}>mode: {RAPID.mode.mode}</span>
      </Note>
      <Note at={twoAt - 2} x={R_X + 40} y={top + c.h(330)}>
        <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>two modes? a reason to split the data</span>
      </Note>
    </>
  );
};

// ── 13. The normal distribution ─────────────────────────────────────────────

const Normal: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const at0 = c.w("r-normal", "A normal distribution");
  const setAt = c.w("r-normal", "its mean and standard deviation");
  const bands = [
    { k: 1, at: c.w("r-normal", "Sixty-eight percent"), shade: 0.5 },
    { k: 2, at: c.w("r-normal", "ninety-five within two"), shade: 0.32 },
    { k: 3, at: c.w("r-normal", "ninety-nine point seven"), shade: 0.18 },
  ];
  const s: Scale = { lo: -3.6, hi: 3.6, a: R_X + 40, b: R_X + 760 };
  const base = c.y(760);
  const peak = c.h(340);
  const yOf = (v: number) => base - (normalPdf(v, 0, 1) / normalPdf(0, 0, 1)) * peak;
  const steps = 120;
  const curveP = ease(frame, at0, 22);
  const path = (lo: number, hi: number) =>
    Array.from({ length: steps + 1 }, (_, i) => {
      const v = lo + ((hi - lo) * i) / steps;
      return `${i ? "L" : "M"}${at(s, v).toFixed(1)},${yOf(v).toFixed(1)}`;
    }).join(" ");
  const area = (k: number) => `${path(-k, k)} L${at(s, k)},${base} L${at(s, -k)},${base} Z`;
  return (
    <>
      <Svg>
        {[...bands].reverse().map((b) => (
          <path key={b.k} d={area(b.k)} fill={BAR} opacity={b.shade * ease(frame, b.at - 2, 12)} />
        ))}
        <path d={path(s.lo, s.hi)} fill="none" stroke={INK} strokeWidth={2.6} pathLength={1} strokeDasharray={`${curveP} 1`} />
        <line x1={s.a} x2={s.b} y1={base} y2={base} stroke={INK} strokeWidth={1.6} opacity={curveP} />
        <g opacity={ease(frame, setAt - 2, 10)}>
          {[-3, -2, -1, 0, 1, 2, 3].map((t) => (
            <g key={t}>
              <line x1={at(s, t)} x2={at(s, t)} y1={base} y2={base + 7} stroke={INK} strokeWidth={1.2} />
              <text x={at(s, t)} y={base + 32} textAnchor="middle" style={tick()}>
                {t === 0 ? "mean" : `${t > 0 ? "+" : "−"}${Math.abs(t)} SD`}
              </text>
            </g>
          ))}
        </g>
      </Svg>
      {bands.map((b, i) => (
        <Note key={b.k} at={b.at - 2} x={R_X + 800} y={c.y(470) + i * c.h(64)}>
          <span style={{ ...note(28, INK), ...TABULAR, whiteSpace: "nowrap" }}>
            within {b.k} SD: <b style={{ color: BLUE_INK }}>{fmt(RAPID.normal.within[i], 1)}%</b>
          </span>
        </Note>
      ))}
      <Note at={bands[2].at + 10} x={R_X + 800} y={c.y(470) + 3 * c.h(64)}>
        <span style={{ ...note(22, INK_SOFT), ...TABULAR, whiteSpace: "nowrap" }}>
          in {RAPID.normal.draws.toLocaleString("en-US")} draws
        </span>
      </Note>
      <Note at={setAt + 4} x={R_X + 800} y={c.y(470) + 3 * c.h(64) + c.h(36)}>
        <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>SD: standard deviation</span>
      </Note>
    </>
  );
};

// ── 14. Population and sample ───────────────────────────────────────────────

const Population: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const at0 = c.w("r-pop", "the population is everyone");
  const sampleAt = c.w("r-pop", "A sample is the part");
  const estimateAt = c.w("r-pop", "only an estimate");
  const threeAt = c.w("r-pop", "Three samples of fifty");
  const popMeanAt = c.w("r-pop", "The population's mean");
  const P = RAPID.population;
  const s: Scale = { lo: 46, hi: 56, a: R_X + 40, b: R_END };
  const lineY = c.y(720);
  return (
    <>
      <Note at={at0 - 2} x={R_X + 40} y={c.y(340)}>
        <span style={{ ...note(28, INK), whiteSpace: "nowrap", ...TABULAR }}>
          <b>population</b>: everyone you care about ({P.count.toLocaleString("en-US")})
        </span>
      </Note>
      <Note at={sampleAt - 2} x={R_X + 40} y={c.y(390)}>
        <span style={{ ...note(28, INK), whiteSpace: "nowrap", ...TABULAR }}>
          <b>sample</b>: the part you measured ({P.size})
          <span style={{ opacity: ease(frame, estimateAt - 2, 10), color: INK_SOFT }}>; its mean is an estimate</span>
        </span>
      </Note>
      <Line s={s} y={lineY} ticks={[46, 48, 50, 52, 54, 56]} at={threeAt - 6} />
      <VLine
        x={at(s, P.mean)}
        top={c.y(500)}
        bottom={lineY}
        at={popMeanAt - 2}
        color={INK}
        dash="7 6"
        width={2.4}
        side="left"
        labelY={c.y(490)}
        label={<span style={{ ...note(24, INK), fontWeight: 650 }}>population {fmt(P.mean, 1)}</span>}
      />
      <Svg>
        {P.samples.map((m, i) => {
          const p = ease(frame, threeAt + 6 + i * 8, 10);
          return <circle key={i} cx={at(s, m)} cy={c.y(560) + i * c.h(50)} r={11 * p} fill={BAR} />;
        })}
      </Svg>
      {P.samples.map((m, i) => (
        <Note key={i} at={threeAt + 8 + i * 8} x={at(s, m) + 22} y={c.y(560) + i * c.h(50) - 15}>
          <span style={{ ...note(22, BLUE_INK), ...TABULAR, whiteSpace: "nowrap" }}>
            sample {i + 1}: {fmt(m, 1)}
          </span>
        </Note>
      ))}
    </>
  );
};

/**
 * The rapid-fire round, questions 11 to 14, as in Parts 1 and 2: the numbered
 * list on the left, ticked as the round goes, and each answer on the right.
 */
export const RapidScene: React.FC = () => {
  const n = useNarration();
  const { y, h } = useLayout();
  const c: Ctx = { w: (b, p) => n.word(b, p), y, h };

  const from = n.beat("rapid-in").from;
  const fourAt = n.word("rapid-in", "four questions");
  const eachAt = n.word("rapid-in", "one answer each");
  const nextAt = n.word("next", "Next");
  const end = n.beat("next").from;

  const items: RapidItem[] = [
    { n: 11, label: "Variance and standard deviation", beat: "r-var", body: <Variance c={c} /> },
    { n: 12, label: "The mode", beat: "r-mode", body: <Mode c={c} /> },
    { n: 13, label: "The normal distribution", beat: "r-normal", body: <Normal c={c} /> },
    { n: 14, label: "Population and sample", beat: "r-pop", body: <Population c={c} /> },
  ].map(({ beat, ...item }) => ({ ...item, at: n.beat(beat).from }));
  const lastAt = n.beat("r-pop").from;

  return (
    <AbsoluteFill>
      <Sfx name="el-whoosh" at={from} level={-34} />
      {items.map((item) => (
        <Sfx key={item.n} name="el-tap" at={item.at} level={-34} />
      ))}
      <Sfx name="el-chime" at={end} level={-34} />

      <Drift from={from} to={n.beat("next").to + 40} scale={0.015}>
        <Kicker at={from}>Questions 11 to 14</Kicker>
        <Headline lead="Four questions," turn="one answer each." at={fourAt - 6} turnAt={eachAt - 4} size={64} />
        <Spot id="da-sql-stopwatch" video="da-sql" at={from + 6} left={1640} top={y(112)} width={130} height={140} />

        {/* The last answer stays up through the bridge, so its body sits outside the list. */}
        <RapidFire
          items={items.map((it) => (it.n === 14 ? { ...it, body: undefined } : it))}
          x={X0}
          top={y(LIST_TOP) + h(40)}
          rowH={h(ROW)}
          width={560}
          at={eachAt}
          end={end}
        />
        <Fade from={lastAt - 6}>
          <Population c={c} />
        </Fade>

        <NextLine at={nextAt} x={R_X + 40} y={y(840)} width={960}>
          advanced SQL
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
