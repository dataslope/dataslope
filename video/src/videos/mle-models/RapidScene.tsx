import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { RapidFire, type RapidItem } from "../../editorial/interview";
import { type Layout, useLayout } from "../../editorial/layout";
import { HAIRLINE, INK, INK_SOFT, PAPER } from "../../editorial/style";
import { I, MathRun } from "../../editorial/math";
import { NextLine, OutlineBadge } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ds } from "../../theme/brand";
import { MONO, SANS } from "../../theme/fonts";
import { KMEANS, ONEHOT } from "./data";
import { ACCENT, ACCENT_INK, artH, at, Drift, Headline, Kicker, Line, Mark, OK_INK, pct, PlanList, scales, Spot, Svg, VRule, X0 } from "./parts";

/** Where the answers go: right of the list. */
const R_X = 820;
const LIST_TOP = 370;
const ROW = 64;

type Ctx = { w: (beat: string, phrase: string, o?: { nth?: number }) => number; y: Layout["y"]; h: Layout["h"] };

// ── 14. Three kinds of learning ──────────────────────────────────────────────
const Types: React.FC<{ c: Ctx }> = ({ c }) => {
  const cols = [
    { x: R_X, head: "Supervised", badge: "labels", note: "Inputs to labels", at: c.w("r-types", "Supervised learning"), noteAt: c.w("r-types", "maps inputs to labels") },
    { x: R_X + 340, head: "Unsupervised", badge: "no labels", note: "Structure, as in clustering", at: c.w("r-types", "Unsupervised"), noteAt: c.w("r-types", "as in clustering") },
    { x: R_X + 680, head: "Reinforcement", badge: "reward", note: "Trial and error", at: c.w("r-types", "Reinforcement learning"), noteAt: c.w("r-types", "trial and error") },
  ];
  return (
    <>
      {cols.map((col, i) => (
        <React.Fragment key={col.head}>
          {i > 0 ? <VRule x={col.x - 30} top={c.y(390)} bottom={c.y(560)} at={col.at} /> : null}
          <Line at={col.at - 2} x={col.x} y={c.y(390)} size={28}>
            {col.head}
          </Line>
          <Line at={col.at + 4} x={col.x} y={c.y(446)} size={24}>
            <OutlineBadge tone="ink" size={24}>
              {col.badge}
            </OutlineBadge>
          </Line>
          <Line at={col.noteAt - 2} x={col.x} y={c.y(516)} size={23} color={INK_SOFT}>
            {col.note}
          </Line>
        </React.Fragment>
      ))}
    </>
  );
};

// ── 15. Losses by task ───────────────────────────────────────────────────────
const Losses: React.FC<{ c: Ctx }> = ({ c }) => {
  const reg = [
    { t: "MSE", at: c.w("r-loss", "For regression, MSE") },
    { t: "MAE: robust to outliers", at: c.w("r-loss", "or MAE for robustness to outliers") },
    { t: "Huber: blends the two", at: c.w("r-loss", "or Huber") },
  ];
  const cls = [
    { t: "Binary cross-entropy", at: c.w("r-loss", "binary cross-entropy") },
    { t: "Categorical cross-entropy", at: c.w("r-loss", "or categorical cross-entropy") },
    { t: "with softmax", at: c.w("r-loss", "with softmax") },
  ];
  const right = R_X + 470;
  return (
    <>
      <Line at={reg[0].at - 4} x={R_X} y={c.y(390)} size={28}>
        Regression
      </Line>
      {reg.map((r, i) => (
        <Line key={r.t} at={r.at - 2} x={R_X} y={c.y(446) + i * c.h(44)} size={24} color={i ? INK_SOFT : INK}>
          {r.t}
        </Line>
      ))}
      <VRule x={right - 40} top={c.y(390)} bottom={c.y(560)} at={cls[0].at - 4} />
      <Line at={cls[0].at - 4} x={right} y={c.y(390)} size={28}>
        Classification
      </Line>
      {cls.map((r, i) => (
        <Line key={r.t} at={r.at - 2} x={right} y={c.y(446) + i * c.h(44)} size={24} color={i === 2 ? INK_SOFT : INK}>
          {r.t}
        </Line>
      ))}
      <Line at={c.w("r-loss", "For ranking")} x={R_X} y={c.y(640)} size={26}>
        Ranking: <span style={{ color: INK_SOFT }}>hinge, contrastive or triplet loss</span>
      </Line>
    </>
  );
};

// ── 16. k-means ──────────────────────────────────────────────────────────────
/** k-means' clusters matched to the true ones, by the best of the six ways
 *  to pair three labels. */
const MATCH = (() => {
  const perms = [
    [0, 1, 2],
    [0, 2, 1],
    [1, 0, 2],
    [1, 2, 0],
    [2, 0, 1],
    [2, 1, 0],
  ];
  let best = perms[0];
  let score = -1;
  for (const p of perms) {
    const s = KMEANS.assigned.filter((a, i) => p[a] === KMEANS.truth[i]).length;
    if (s > score) {
      score = s;
      best = p;
    }
  }
  return best;
})();
const KCOL = [ds("blue", 300), ds("blue", 600), ds("blue", 900)] as const;

const Shape: React.FC<{ kind: number; x: number; y: number; r: number; color: string }> = ({ kind, x, y, r, color }) =>
  kind === 0 ? (
    <circle cx={x} cy={y} r={r} fill={color} />
  ) : kind === 1 ? (
    <rect x={x - r * 0.88} y={y - r * 0.88} width={r * 1.76} height={r * 1.76} fill={color} />
  ) : (
    <path d={`M${x},${y - r * 1.1} L${x + r * 1.05},${y + r * 0.75} L${x - r * 1.05},${y + r * 0.75} Z`} fill={color} />
  );

const Kmeans: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const startAt = c.w("r-kmeans", "k-means assigns each point");
  const roundAt = c.w("r-kmeans", "It assumes round clusters");
  const wrongAt = c.w("r-kmeans", "about one point in five lands wrong");
  const box = { left: R_X, top: c.y(380), width: 470, height: c.h(420) };
  const { x: sx, y: sy } = scales(box, [-6, 3.2], [-3.4, 5.4]);
  const tx = R_X + 540;
  return (
    <>
      <Svg>
        {KMEANS.x.map((v, i) => {
          const p = ease(frame, startAt + (i / KMEANS.x.length) * 16, 8);
          if (p <= 0) return null;
          return <Shape key={i} kind={KMEANS.truth[i]} x={at(sx, v)} y={at(sy, KMEANS.y[i])} r={4.8 * p} color={KCOL[MATCH[KMEANS.assigned[i]]]} />;
        })}
      </Svg>
      <Svg opacity={ease(frame, wrongAt, 12)}>
        {KMEANS.x.map((v, i) =>
          MATCH[KMEANS.assigned[i]] !== KMEANS.truth[i] ? <circle key={i} cx={at(sx, v)} cy={at(sy, KMEANS.y[i])} r={8.4} fill="none" stroke={ACCENT} strokeWidth={1.6} /> : null,
        )}
      </Svg>
      <Line at={startAt - 2} x={tx} y={c.y(390)} size={24}>
        Assign each point to the nearest centroid
      </Line>
      <Line at={c.w("r-kmeans", "moves each centroid to its points' mean")} x={tx} y={c.y(432)} size={24}>
        Move each centroid to its points&apos; mean
      </Line>
      <Line at={c.w("r-kmeans", "and repeats to a local minimum")} x={tx} y={c.y(474)} size={24}>
        Repeat, to a local minimum
      </Line>
      <Line at={c.w("r-kmeans", "so run several starts")} x={tx} y={c.y(530)} size={24} color={INK_SOFT}>
        Several starts; <MathRun><I>k</I></MathRun> by elbow or silhouette
      </Line>
      <Line at={roundAt - 2} x={tx} y={c.y(610)} size={24}>
        Assumes round clusters
      </Line>
      <Line at={wrongAt - 2} x={tx} y={c.y(656)} size={24} color={ACCENT_INK}>
        Stretched: {pct(1 - KMEANS.stretched)} land wrong
      </Line>
      <Line at={wrongAt + 10} x={tx} y={c.y(700)} size={22} color={INK_SOFT}>
        Round clusters: {pct(KMEANS.round)} right
      </Line>
      <Line at={startAt + 10} x={R_X} y={box.top + box.height + c.h(16)} size={21} color={INK_SOFT}>
        Shape: true cluster · shade: k-means
      </Line>
    </>
  );
};

// ── 17. One-hot encoding ─────────────────────────────────────────────────────
const OneHot: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const startAt = c.w("r-onehot", "One-hot encoding gives each category");
  const colorsAt = c.w("r-onehot", "red, green and blue become three columns");
  const ignoreAt = c.w("r-onehot", "Set to ignore unknowns");
  const purpleAt = c.w("r-onehot", "it encodes purple");
  const zerosAt = c.w("r-onehot", "as all zeros");
  const thousandsAt = c.w("r-onehot", "For thousands of values");
  const mono = (size: number, color: string = INK): React.CSSProperties => ({ fontFamily: MONO, fontSize: size, fontWeight: 500, color, fontVariantLigatures: "none", whiteSpace: "nowrap" });
  const colW = 120;
  const rows = [["colour", ...ONEHOT.categories], ...ONEHOT.rows.map((r, i) => [r, ...ONEHOT.encoded[i].map(String)])];
  return (
    <>
      <Line at={startAt - 2} x={R_X} y={c.y(380)} size={26}>
        A column of 0s and 1s per category, no order
      </Line>
      {rows.map((r, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: R_X,
            top: c.y(440) + i * c.h(42),
            display: "flex",
            paddingBottom: i === 0 ? 6 : 0,
            borderBottom: i === 0 ? `1.5px solid ${HAIRLINE}` : undefined,
            opacity: ease(frame, colorsAt - 6 + i * 3, 10),
          }}
        >
          {r.map((cell, j) => (
            <div key={j} style={{ width: j ? colW : 140, ...mono(23, cell === "1" ? ds("blue", 600) : i === 0 || j === 0 ? INK : INK_SOFT) }}>
              {cell}
            </div>
          ))}
        </div>
      ))}
      <Spot id="mle-models-paint" at={colorsAt} left={R_X + 640} top={c.y(470)} width={260} height={artH("paint", 260)} />
      <Line at={ignoreAt - 2} x={R_X} y={c.y(700)} size={24}>
        <span style={mono(23)}>handle_unknown=&quot;ignore&quot;</span>
        <span style={{ opacity: ease(frame, purpleAt, 10) }}>
          {" "}
          · <span style={mono(23)}>purple</span> →{" "}
        </span>
        <span style={{ opacity: ease(frame, zerosAt - 2, 10), color: OK_INK }}>
          <span style={mono(23, OK_INK)}>{ONEHOT.purple.join(" ")}</span>, not an error
        </span>
      </Line>
      <Line at={thousandsAt - 2} x={R_X} y={c.y(756)} size={24} color={INK_SOFT}>
        Thousands of values: hashing or embeddings
      </Line>
    </>
  );
};

// ── 18. Feature engineering ──────────────────────────────────────────────────
const Features: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const words = [
    { t: "Interactions", at: c.w("r-fe", "interactions") },
    { t: "Hour or weekday", at: c.w("r-fe", "the hour or weekday") },
    { t: "Log of skewed values", at: c.w("r-fe", "logs of skewed values") },
    { t: "Bins", at: c.w("r-fe", "bins") },
    { t: "Rolling aggregates", at: c.w("r-fe", "rolling aggregates") },
  ];
  const goodAt = c.w("r-fe", "Good features often matter more");
  return (
    <>
      <Line at={c.w("r-fe", "Feature engineering turns raw data")} x={R_X} y={c.y(390)} size={26}>
        Raw data into useful inputs:
      </Line>
      <div style={{ position: "absolute", left: R_X, top: c.y(450), width: 960, display: "flex", flexWrap: "wrap", gap: "18px 16px", fontSize: 24 }}>
        {words.map((wd) => (
          <span key={wd.t} style={{ opacity: ease(frame, wd.at - 2, 10) }}>
            <OutlineBadge tone="ink" size={24} style={{ background: PAPER, fontFamily: SANS }}>
              {wd.t}
            </OutlineBadge>
          </span>
        ))}
      </div>
      <Line at={goodAt - 2} x={R_X} y={c.y(590)} size={28}>
        <Mark at={goodAt + 4}>Good features often matter more than the algorithm</Mark>
      </Line>
    </>
  );
};

/**
 * Questions 14 to 18 as a rapid-fire list down the left, each answer on the
 * right while it is current. Then the bridge: the five groups again, all
 * done, the toucan back, and the next part.
 */
export const RapidScene: React.FC = () => {
  const n = useNarration();
  const { y, h } = useLayout();
  const c: Ctx = { w: n.word, y, h };

  const from = n.beat("rapid-in").from;
  const fiveAt = n.word("rapid-in", "Five quick ones");
  const nextFrom = n.beat("next").from;
  const numpyAt = n.word("next", "a few lines of NumPy");
  const fastAt = n.word("next", "fast and safely");
  const nextAt = n.word("next", "Next: coding for machine learning");
  const end = n.beat("next").to;

  const items: RapidItem[] = [
    { n: 14, label: "Three kinds of learning", at: n.beat("r-types").from, body: <Types c={c} /> },
    { n: 15, label: "Losses by task", at: n.beat("r-loss").from, body: <Losses c={c} /> },
    { n: 16, label: "k-means", at: n.beat("r-kmeans").from, body: <Kmeans c={c} /> },
    { n: 17, label: "One-hot encoding", at: n.beat("r-onehot").from, body: <OneHot c={c} /> },
    { n: 18, label: "Feature engineering", at: n.beat("r-fe").from, body: <Features c={c} /> },
  ];

  return (
    <AbsoluteFill>
      <Sfx name="el-sprinkle" at={fiveAt} level={-35} />
      {items.map((it) => (
        <Sfx key={it.n} name="el-tap" at={it.at} level={-33} />
      ))}
      <Sfx name="el-tap" at={numpyAt} level={-31} />
      <Sfx name="el-chime" at={nextAt + 30} level={-33} />

      <Drift from={from} to={end + 40}>
        <Kicker at={from}>Questions 14 to 18</Kicker>
        <Headline lead="Five quick ones." at={fiveAt - 4} />

        <RapidFire items={items} x={X0} top={y(LIST_TOP)} rowH={h(ROW)} width={600} at={fiveAt} end={nextFrom} />

        {/* ── The bridge: every group done, and the next part ── */}
        <PlanList x={R_X} top={y(380)} row={h(58)} width={640} at={nextFrom} quickAt={nextFrom + 20} doneAt={numpyAt} size={26} />
        <Line at={fastAt - 4} x={R_X} y={y(760)} size={26} color={INK_SOFT}>
          Each a few lines of NumPy, written fast and safely
        </Line>
        <Spot id="mle-models-toucan" at={nextFrom + 6} left={1560} top={y(400)} width={220} height={artH("toucan", 220)} />
        <NextLine at={nextAt} x={R_X} y={y(830)} width={960}>
          coding for machine learning
        </NextLine>
      </Drift>
    </AbsoluteFill>
  );
};

