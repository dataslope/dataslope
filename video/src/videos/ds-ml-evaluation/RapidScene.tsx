import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { RapidFire, type RapidItem, Tick } from "../../editorial/interview";
import { type Layout, useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, INK, INK_SOFT, PAPER, TABULAR, fmt, label, note } from "../../editorial/style";
import { NextLine, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { LOSS, METRICS } from "./data";
import { at, Axes, Curve, Drift, Fade, Headline, Kicker, Mark, OK_INK, type Scale, Spot, Svg, WARM, WARM_INK, X0 } from "./parts";

/** Where the answers go: right of the list. */
const R_X = 780;
const R_END = 1740;
const LIST_TOP = 320;
const ROW = 56;

type Ctx = { w: (beat: string, phrase: string) => number; y: Layout["y"]; h: Layout["h"] };

// ── 13. RMSE, MAE and R-squared ─────────────────────────────────────────────

/** The page's five misses as a share of the total, added as they are and squared first. */
const Metrics: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const rmseAt = c.w("r-metrics", "R M S E");
  const dominateAt = c.w("r-metrics", "big misses dominate");
  const maeAt = c.w("r-metrics", "M A E, mean absolute error");
  const r2At = c.w("r-metrics", "R squared is the share");
  const valuesAt = c.w("r-metrics", "they come to");
  const misses = METRICS.true.map((t, i) => Math.abs(t - METRICS.pred[i]));
  const big = Math.max(...misses);
  const rows = [
    { name: "MAE adds the misses", vals: misses, at: maeAt },
    { name: "RMSE squares them first", vals: misses.map((m) => m * m), at: rmseAt },
  ];
  const W = R_END - R_X - 40;
  return (
    <>
      <Note at={rmseAt - 4} x={R_X + 40} y={c.y(330)}>
        <span style={{ ...label(21, INK_SOFT), whiteSpace: "nowrap" }}>the page&apos;s five predictions: each miss&apos;s share of the total</span>
      </Note>
      {rows.map((r, i) => {
        const total = r.vals.reduce((a, b) => a + b, 0);
        const top = c.y(390) + i * c.h(110);
        const p = ease(frame, r.at, 16);
        let acc = 0;
        return (
          <React.Fragment key={r.name}>
            <div style={{ position: "absolute", left: R_X + 40, top, ...note(25, INK), fontWeight: 650, opacity: p, whiteSpace: "nowrap" }}>{r.name}</div>
            {r.vals.map((v, k) => {
              const left = R_X + 40 + (acc / total) * W * p;
              acc += v;
              const isBig = misses[k] === big;
              const lit = isBig ? ease(frame, dominateAt, 12) : 0;
              return (
                <div
                  key={k}
                  style={{
                    position: "absolute",
                    left,
                    top: top + c.h(38),
                    width: Math.max(0, (v / total) * W * p - 4),
                    height: c.h(40),
                    background: lit > 0 ? `color-mix(in srgb, ${WARM} ${100 * lit}%, ${BAR})` : BAR,
                    opacity: 0.85,
                    borderRadius: 2,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    ...label(18, PAPER),
                    fontWeight: 700,
                    ...TABULAR,
                  }}
                >
                  {v / total > 0.08 ? `${Math.round((100 * v) / total)}%` : ""}
                </div>
              );
            })}
          </React.Fragment>
        );
      })}
      <Note at={dominateAt} x={R_X + 40} y={c.y(620)}>
        <span style={{ ...note(25, WARM_INK), fontWeight: 650, whiteSpace: "nowrap" }}>squared, the two big misses dominate</span>
      </Note>
      <Note at={r2At - 2} x={R_X + 40} y={c.y(680)}>
        <span style={{ ...note(25, INK), whiteSpace: "nowrap" }}>
          <b>R²</b>: the share of variance explained; 1 is perfect, 0 is no better than the mean
        </span>
      </Note>
      <Note at={valuesAt} x={R_X + 40} y={c.y(740)}>
        <span style={{ ...note(28, BLUE_INK), whiteSpace: "nowrap", ...TABULAR }}>
          RMSE <b>{fmt(METRICS.rmse)}</b> · MAE <b>{fmt(METRICS.mae)}</b> · R² <b>{fmt(METRICS.r2)}</b>
        </span>
      </Note>
    </>
  );
};

// ── 14. Cross-entropy or MSE ────────────────────────────────────────────────

const Xent: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const at0 = c.w("r-xent", "Cross-entropy or M S E");
  const predictAt = c.w("r-xent", "Predict point oh one");
  const sqAt = c.w("r-xent", "squared error charges");
  const xentAt = c.w("r-xent", "Cross-entropy charges");
  const climbAt = c.w("r-xent", "keeps climbing");
  const box = { left: R_X + 80, right: R_X + 720, top: 380, bottom: 760 };
  const xs: Scale = { lo: 0, hi: 1, a: box.left, b: box.right };
  const ys: Scale = { lo: 0, hi: 5, a: c.y(box.bottom), b: c.y(box.top) };
  const clip = { left: box.left - 10, right: box.right + 10, top: c.y(box.top) - 14, bottom: c.y(box.bottom) + 10 };
  const sq = LOSS.p.map((p, i) => [p, LOSS.sq[i]] as const);
  const xe = LOSS.p.map((p, i) => [p, LOSS.xent[i]] as const);
  const mark = ease(frame, predictAt, 12);
  return (
    <>
      <Axes
        x={xs}
        y={ys}
        xTicks={[0, 0.5, 1]}
        yTicks={[0, 1, 2, 3, 4, 5]}
        xTitle="predicted probability, for a true positive"
        yTitle="the loss"
        at={at0 - 4}
      />
      <Curve points={sq} x={xs} y={ys} at={sqAt - 4} dur={18} color={BAR} width={3.6} clip={clip} />
      <Curve points={[...xe].reverse()} x={xs} y={ys} at={xentAt - 4} dur={22} color={ACCENT} width={3.6} clip={clip} />
      <Svg opacity={mark}>
        <line x1={at(xs, LOSS.at)} x2={at(xs, LOSS.at)} y1={c.y(box.top)} y2={c.y(box.bottom)} stroke={INK_SOFT} strokeWidth={1.4} strokeDasharray="3 5" />
        <circle cx={at(xs, LOSS.at)} cy={at(ys, LOSS.sqAt)} r={8 * ease(frame, sqAt, 10)} fill={BAR} />
        <circle cx={at(xs, LOSS.at)} cy={at(ys, LOSS.xentAt)} r={8 * ease(frame, xentAt, 10)} fill={ACCENT} />
      </Svg>
      <Note at={predictAt} x={box.right + 30} y={c.y(box.top) + c.h(10)}>
        <span style={{ ...note(24, INK_SOFT), whiteSpace: "nowrap", ...TABULAR }}>predict {LOSS.at} for a true positive:</span>
      </Note>
      <Note at={sqAt + 2} x={box.right + 30} y={c.y(box.top) + c.h(56)}>
        <span style={{ ...note(26, BLUE_INK), fontWeight: 650, whiteSpace: "nowrap", ...TABULAR }}>squared error {fmt(LOSS.sqAt)}</span>
      </Note>
      <Note at={xentAt + 2} x={box.right + 30} y={c.y(box.top) + c.h(100)}>
        <span style={{ ...note(26, ACCENT_INK), fontWeight: 650, whiteSpace: "nowrap", ...TABULAR }}>cross-entropy {fmt(LOSS.xentAt)}</span>
      </Note>
      <Note at={climbAt} x={box.right + 30} y={c.y(box.top) + c.h(170)}>
        <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>more confidently wrong:</span>
        <br />
        <span style={{ ...note(24, ACCENT_INK), whiteSpace: "nowrap" }}>it keeps climbing</span>
      </Note>
    </>
  );
};

// ── 15. Choosing between two models ─────────────────────────────────────────

const Select: React.FC<{ c: Ctx }> = ({ c }) => {
  const steps = [
    { text: "compare on validation data", at: c.w("r-select", "compare them on validation data") },
    { text: "with a metric that matches the goal", at: c.w("r-select", "a metric that matches the goal") },
    { text: "weigh speed, interpretability and cost", at: c.w("r-select", "weigh speed") },
  ];
  const simplerAt = c.w("r-select", "take the simpler one");
  return (
    <>
      {steps.map((s, i) => (
        <Note key={s.text} at={s.at - 2} x={R_X + 40} y={c.y(380) + i * c.h(72)}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <Tick at={s.at + 2} size={26} />
            <span style={{ ...note(30, INK), whiteSpace: "nowrap" }}>{s.text}</span>
          </div>
        </Note>
      ))}
      <Note at={simplerAt - 6} x={R_X + 40} y={c.y(380) + 3 * c.h(72) + c.h(20)}>
        <span style={{ ...note(32, OK_INK), fontWeight: 650, whiteSpace: "nowrap" }}>
          close? <Mark at={simplerAt}>take the simpler one</Mark>
        </span>
      </Note>
    </>
  );
};

/**
 * The quick round, questions 13 to 15: the numbered list on the left, ticked
 * as the round goes, each answer on the right. The last stays up through the
 * bridge into Part 4.
 */
export const RapidScene: React.FC = () => {
  const n = useNarration();
  const { y, h } = useLayout();
  const c: Ctx = { w: (b, p) => n.word(b, p), y, h };

  const from = n.beat("rapid-in").from;
  const threeAt = n.word("rapid-in", "three you can answer");
  const breathAt = n.word("rapid-in", "in a breath");
  const nextAt = n.word("next", "Next", { nth: 2 });
  const end = n.beat("next").from;

  const items: RapidItem[] = [
    { n: 13, label: "RMSE, MAE and R²", beat: "r-metrics", body: <Metrics c={c} /> },
    { n: 14, label: "Cross-entropy or MSE", beat: "r-xent", body: <Xent c={c} /> },
    { n: 15, label: "Choosing between two models", beat: "r-select", body: <Select c={c} /> },
  ].map(({ beat, ...item }) => ({ ...item, at: n.beat(beat).from }));
  const lastAt = n.beat("r-select").from;

  return (
    <AbsoluteFill>
      <Sfx name="el-whoosh" at={from} level={-34} />
      {items.map((item) => (
        <Sfx key={item.n} name="el-tap" at={item.at} level={-34} />
      ))}
      <Sfx name="el-chime" at={end} level={-34} />

      <Drift from={from} to={n.beat("next").to + 40} scale={0.015}>
        <Kicker at={from}>Questions 13 to 15</Kicker>
        <Headline lead="Three you can answer" turn="in a breath." at={threeAt - 6} turnAt={breathAt - 4} size={64} />
        <Spot id="da-sql-stopwatch" video="da-sql" at={from + 6} left={1640} top={y(112)} width={130} height={140} />

        <RapidFire
          items={items.map((it) => (it.n === 15 ? { ...it, body: undefined } : it))}
          x={X0}
          top={y(LIST_TOP) + h(40)}
          rowH={h(ROW)}
          width={600}
          at={breathAt}
          end={end}
        />
        <Fade from={lastAt - 6}>
          <Select c={c} />
        </Fade>

        <NextLine at={nextAt} x={R_X + 40} y={y(800)} width={900}>
          models and features
        </NextLine>
      </Drift>
    </AbsoluteFill>
  );
};
