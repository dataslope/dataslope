import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, HIGHLIGHT, INK, INK_SOFT, PAPER, TABULAR, fmt, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { type PairCounts, REG, signed } from "./data";
import { at, type Box, Curve, Drift, Fade, Mark, OK, OK_INK, PanelTitle, pulse, type Scale, Svg, WARM, WARM_INK } from "./parts";

const RIDGE: Box = { left: 160, right: 840, top: 440, bottom: 780 };
const LASSO: Box = { left: 1080, right: 1760, top: 440, bottom: 780 };
const LO = -30;
/** Headroom over the largest coefficient (31.6), so "keeps 7 of 10" sits
 *  clear of the paths along the top. */
const HI = 100;
/**
 * The coefficient axis is stretched near zero (asinh(v / STRETCH)): linear
 * within about ±0.3, logarithmic beyond. On a plain axis ridge's paths sink
 * within a few pixels of zero across the right third, just as lasso's do,
 * and "never exactly zero" against "exactly zero" is the whole question.
 */
const STRETCH = 0.3;
const sy = (v: number) => Math.asinh(v / STRETCH);
const Y_TICKS = [-10, -1, 0, 1, 10];
const S1 = REG.features.indexOf("s1");
const S2 = REG.features.indexOf("s2");
/** The path row nearest the marked strength. */
const PICK_I = REG.logAlpha.findIndex((a) => a >= REG.pickLog);

/** Where each lasso coefficient reaches zero for good, as an index on the path. */
const DEATHS = REG.features.map((_, j) => {
  let i = REG.lasso.length;
  while (i > 0 && REG.lasso[i - 1][j] === 0) i--;
  return i;
});

/** A path panel's frame: the zero line, the stretched coefficient axis, the
 *  baseline, and which way the penalty grows. */
const PathFrame: React.FC<{ b: Box; at: number }> = ({ b, at: from }) => {
  const frame = useCurrentFrame();
  const { y } = useLayout();
  const p = ease(frame, from, 16);
  const ys: Scale = { lo: sy(LO), hi: sy(HI), a: y(b.bottom), b: y(b.top) };
  const zero = at(ys, 0);
  return (
    <Svg opacity={p}>
      <line x1={b.left} x2={b.left + (b.right - b.left) * p} y1={zero} y2={zero} stroke={INK} strokeWidth={1.4} strokeDasharray="5 6" />
      <line x1={b.left} x2={b.right} y1={y(b.bottom) + 1} y2={y(b.bottom) + 1} stroke={INK} strokeWidth={1.6} />
      {Y_TICKS.map((v) => (
        <React.Fragment key={v}>
          <line x1={b.left - 6} x2={b.left} y1={at(ys, sy(v))} y2={at(ys, sy(v))} stroke={INK_SOFT} strokeWidth={1.4} />
          <text x={b.left - 12} y={at(ys, sy(v)) + 7} textAnchor="end" fill={INK_SOFT} style={{ ...label(19, INK_SOFT), fontVariantNumeric: "tabular-nums" }}>
            {v < 0 ? `\u2212${-v}` : v}
          </text>
        </React.Fragment>
      ))}
      <text x={b.left} y={y(b.top) - 14} textAnchor="start" fill={INK_SOFT} style={{ ...label(19, INK_SOFT), fontWeight: 650 }}>
        coefficient, scale stretched near 0
      </text>
      <text x={b.right} y={y(b.bottom) + 34} textAnchor="end" fill={INK_SOFT} style={{ ...label(19, INK_SOFT), fontWeight: 650 }}>
        stronger penalty →
      </text>
    </Svg>
  );
};

/** A hairline crossing a path panel left to right: the penalty being raised. */
const Sweep: React.FC<{ b: Box; p: number; o: number }> = ({ b, p, o }) => {
  const { y } = useLayout();
  if (p <= 0 || o <= 0) return null;
  const x = b.left + (b.right - b.left) * p;
  return (
    <Svg opacity={o}>
      <line x1={x} x2={x} y1={y(b.top) - 6} y2={y(b.bottom)} stroke={INK} strokeWidth={2} strokeDasharray="2 5" />
    </Svg>
  );
};

/**
 * Questions 3 and 4 on scikit-learn's diabetes set, ten measurements
 * standardized: the same ten coefficients along a rising penalty, under ridge
 * on the left (all shrink, none leaves) and lasso on the right (each reaches
 * zero and stays there, a ring where it does), on an axis stretched near
 * zero so "small" and "exactly zero" look different. A marker at one
 * strength, a dot on every path there: lasso keeps seven, ridge ten. Then the
 * two cholesterol measures, s1 and s2, lit up: lasso keeps one; a small table
 * shows elastic net keeping both and still zeroing age; and fifty resamples
 * show how often each model keeps the pair.
 */
export const RegScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("reg").from;
  const qAt = n.word("reg", "Question");
  const textAt = n.word("reg", "What's the difference");
  const bothAt = n.word("reg", "Both add a penalty");
  const ridgeNameAt = n.word("reg", "L two, called ridge");
  const lassoNameAt = n.word("reg", "L one, called lasso");
  const tenAt = n.word("reg-paths", "ten measurements");
  const raiseAt = n.word("reg-paths", "Raise the penalty");
  const keepAllAt = n.word("reg-paths", "keeping every one");
  const oneTimeAt = n.word("reg-paths", "one at a time");
  const strengthAt = n.word("reg-paths", "At this strength");
  const sevenAt = n.word("reg-paths", "it keeps seven");
  const selectAt = n.word("reg-paths", "feature selection");
  const q4At = n.word("enet", "Question four");
  const q4TextAt = n.word("enet", "What is elastic net");
  const mixAt = n.word("enet", "A mix of the two penalties");
  const cholAt = n.word("enet", "Two cholesterol measures");
  const corrAt = n.word("enet", "a correlation of point nine");
  const keepsOneAt = n.word("enet", "Lasso keeps one");
  const enetAt = n.word("enet-both", "Elastic net keeps both");
  const ageAt = n.word("enet-both", "still drops age");
  const refitAt = n.word("enet-both", "Refit both on fifty resamples");
  const pairAt = n.word("enet-both", "keeps the pair");
  const fiveAt = n.word("enet-both", "lasso in only five");
  const selectsAt = n.word("enet-both", "It selects like lasso");
  const end = n.beat("cv-in").to;

  const xs = (b: Box): Scale => ({ lo: REG.logAlpha[0], hi: REG.logAlpha[REG.logAlpha.length - 1], a: b.left, b: b.right });
  const ys = (b: Box): Scale => ({ lo: sy(LO), hi: sy(HI), a: y(b.bottom), b: y(b.top) });
  const clipOf = (b: Box): Box => ({ left: b.left - 6, right: b.right + 6, top: y(b.top) - 6, bottom: y(b.bottom) + 6 });
  const path = (rows: number[][], j: number) => REG.logAlpha.map((a, i) => [a, sy(rows[i][j])] as const);
  const pickX = (b: Box) => at(xs(b), REG.pickLog);
  const cy = (b: Box, v: number) => at(ys(b), sy(v));
  // The zeros are ringed one at a time, left to right, as the narration says so.
  const order = DEATHS.map((d, j) => ({ d, j })).filter((o) => o.d < REG.lasso.length).sort((a, b) => a.d - b.d);
  const ringAt = (j: number) => oneTimeAt - 8 + order.findIndex((o) => o.j === j) * 4;
  const sweep = ease(frame, raiseAt, 44);
  const sweepO = sweep > 0 && sweep < 1 ? 1 : 1 - ease(frame, raiseAt + 44, 10);
  const pickP = ease(frame, strengthAt, 14);
  const swell = pulse(frame, enetAt, 22);
  const tableTop = y(RIDGE.top) + h(6);

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={ridgeNameAt + 2} level={-34} />
      <Sfx name="el-pencil" at={lassoNameAt + 2} level={-34} />
      <Sfx name="el-whoosh" at={raiseAt} level={-38} />
      {order.map((o) => (
        <Sfx key={o.j} name="el-tap" at={ringAt(o.j)} level={-40} />
      ))}
      <Sfx name="el-pop" at={sevenAt} level={-32} />
      <Sfx name="el-scratch" at={keepsOneAt + 4} level={-34} />
      <Sfx name="el-pop" at={enetAt + 4} level={-32} />
      <Sfx name="el-sprinkle" at={refitAt} level={-36} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={3} at={qAt - 4} textAt={textAt - 4} out={q4At - 4} size={58}>
          What&apos;s the difference between L1 and L2 regularization?
        </QuestionCard>
        <QuestionCard n={4} at={q4At} textAt={q4TextAt - 2} out={end - 6} size={58}>
          What is elastic net?
        </QuestionCard>

        <Note at={bothAt - 2} x={RIDGE.left} y={y(270)} out={q4At - 4}>
          <span style={{ ...note(28, INK), whiteSpace: "nowrap" }}>Both: a penalty on the size of the coefficients</span>
        </Note>
        <Note at={mixAt - 2} x={RIDGE.left} y={y(270)} out={end - 8}>
          <span style={{ ...note(28, INK), whiteSpace: "nowrap" }}>
            <b>elastic net</b>: a mix of the L1 and L2 penalties
          </span>
        </Note>
        <Note at={mixAt + 10} x={RIDGE.left} y={y(326)} out={end - 8}>
          <span style={{ ...label(22, INK_SOFT), whiteSpace: "nowrap", ...TABULAR }}>
            here {Math.round(REG.enetL1Ratio * 100)}% L1 and {Math.round((1 - REG.enetL1Ratio) * 100)}% L2
          </span>
        </Note>
        {/* Up as the first paths draw, so the lines are never unexplained;
            the narration names them a few seconds later. */}
        <Note at={ridgeNameAt - 2} x={RIDGE.left} y={y(326)} out={q4At - 4}>
          <span style={{ ...label(22, INK_SOFT), whiteSpace: "nowrap" }}>
            <Mark at={tenAt}>ten measurements</Mark> from a diabetes study, one line each
          </span>
        </Note>

        {/* ── Ridge: everything shrinks, nothing leaves ── */}
        <Fade from={bothAt - 6} out={keepsOneAt}>
          <PanelTitle x={RIDGE.left} y={y(RIDGE.top) - h(64)} at={ridgeNameAt - 2} color={INK}>
            L2, ridge: penalizes the squares
          </PanelTitle>
          <PathFrame b={RIDGE} at={bothAt} />
          {REG.features.map((f, j) => (
            <Curve key={f} points={path(REG.ridge, j)} x={xs(RIDGE)} y={ys(RIDGE)} at={ridgeNameAt + j * 0.6} dur={40} color={BAR} width={2.6} clip={clipOf(RIDGE)} />
          ))}
          <Sweep b={RIDGE} p={sweep} o={sweepO} />
          <Svg opacity={pickP}>
            <line x1={pickX(RIDGE)} x2={pickX(RIDGE)} y1={y(RIDGE.top)} y2={y(RIDGE.bottom)} stroke={HIGHLIGHT} strokeWidth={4} />
            {/* Every ridge coefficient at the marked strength: none on the line. */}
            {REG.features.map((f, j) => (
              <circle key={f} cx={pickX(RIDGE)} cy={cy(RIDGE, REG.ridge[PICK_I][j])} r={6 * pickP} fill={BAR} stroke={PAPER} strokeWidth={2} />
            ))}
          </Svg>
          <Note at={sevenAt + 4} x={pickX(RIDGE) + 16} y={y(RIDGE.top) - h(4)}>
            <span style={{ ...note(25, INK), fontWeight: 650, whiteSpace: "nowrap" }}>
              keeps <span style={TABULAR}>{REG.ridgeKept}</span> of <span style={TABULAR}>10</span>
            </span>
          </Note>
          <Note at={keepAllAt} x={RIDGE.left} y={y(RIDGE.bottom) + h(52)}>
            <span style={{ ...note(25, INK), fontWeight: 650, whiteSpace: "nowrap" }}>all ten shrink, and none stays at 0</span>
          </Note>
        </Fade>

        {/* ── Lasso: each reaches zero and stays ── */}
        <PanelTitle x={LASSO.left} y={y(LASSO.top) - h(64)} at={lassoNameAt - 2} color={INK} out={end - 8}>
          L1, lasso: penalizes the absolute values
        </PanelTitle>
        <Fade from={bothAt - 6} out={end - 8}>
          <PathFrame b={LASSO} at={bothAt + 4} />
          <Sweep b={LASSO} p={sweep} o={sweepO} />
          <Svg opacity={pickP}>
            <line x1={pickX(LASSO)} x2={pickX(LASSO)} y1={y(LASSO.top)} y2={y(LASSO.bottom)} stroke={HIGHLIGHT} strokeWidth={4} />
          </Svg>
          {REG.features.map((f, j) => {
            const lit = j === S1 || j === S2;
            return (
              <React.Fragment key={f}>
                <Curve points={path(REG.lasso, j)} x={xs(LASSO)} y={ys(LASSO)} at={lassoNameAt + 2} dur={40} color={BAR} width={2.6} clip={clipOf(LASSO)} dim={lit ? undefined : cholAt} />
                {lit ? (
                  <Curve points={path(REG.lasso, j)} x={xs(LASSO)} y={ys(LASSO)} at={cholAt + (j === S2 ? 6 : 0)} dur={22} color={WARM} width={4} clip={clipOf(LASSO)} />
                ) : null}
              </React.Fragment>
            );
          })}
          {/* A ring where each coefficient reaches zero for good. */}
          <Svg>
            {DEATHS.map((d, j) => {
              if (d >= REG.lasso.length) return null;
              const p = ease(frame, ringAt(j), 8);
              const lit = j === S1 || j === S2;
              const fade = lit ? 1 : 1 - ease(frame, cholAt, 14) * 0.7;
              return (
                <circle
                  key={j}
                  cx={at(xs(LASSO), REG.logAlpha[d])}
                  cy={cy(LASSO, 0)}
                  r={7 * p * (1 + 0.6 * pulse(frame, ringAt(j), 14))}
                  fill="none"
                  stroke={lit && frame >= cholAt ? WARM : ACCENT}
                  strokeWidth={2.6}
                  opacity={p * fade}
                />
              );
            })}
            {/* Every lasso coefficient at the marked strength: three on the line. */}
            <g opacity={pickP * (1 - ease(frame, cholAt, 14) * 0.7)}>
              {REG.features.map((f, j) => {
                const v = REG.lasso[PICK_I][j];
                return <circle key={f} cx={pickX(LASSO)} cy={cy(LASSO, v)} r={6 * pickP} fill={v === 0 ? ACCENT : BAR} stroke={PAPER} strokeWidth={2} />;
              })}
            </g>
            {/* The pair at the marked strength: s1 still in, s2 at zero. */}
            {[S1, S2].map((j) => (
              <circle
                key={j}
                cx={pickX(LASSO)}
                cy={cy(LASSO, REG.lasso[PICK_I][j])}
                r={9 * ease(frame, keepsOneAt + (j === S2 ? 8 : 0), 10)}
                fill={j === S1 ? WARM : ACCENT}
              />
            ))}
          </Svg>
          <Note at={sevenAt - 2} x={pickX(LASSO) + 16} y={y(LASSO.top) - h(4)}>
            <span style={{ ...note(25, INK), fontWeight: 650, whiteSpace: "nowrap" }}>
              keeps{" "}
              <Mark at={sevenAt}>
                <span style={TABULAR}>{REG.lassoKept}</span> of <span style={TABULAR}>10</span>
              </Mark>
            </span>
          </Note>
          <Note at={selectAt - 2} x={LASSO.left} y={y(LASSO.bottom) + h(52)} out={cholAt}>
            <span style={{ ...note(27, OK_INK), fontWeight: 650, whiteSpace: "nowrap" }}>feature selection</span>
          </Note>
          <Note at={cholAt + 2} x={LASSO.left} y={y(LASSO.bottom) + h(52)}>
            <span style={{ ...note(24, WARM_INK), fontWeight: 650, whiteSpace: "nowrap" }}>
              s1 and s2, two cholesterol measures
              <span style={{ opacity: ease(frame, corrAt - 2, 10) }}>
                : correlation <span style={TABULAR}>{fmt(REG.s1s2, 1)}</span>
              </span>
            </span>
          </Note>
        </Fade>

        {/* ── Elastic net keeps both, still selects, and keeps them steadily ── */}
        <Fade from={keepsOneAt + 2} out={end - 8}>
          <Table at={keepsOneAt + 4} enetAt={enetAt} ageAt={ageAt} swell={swell} left={RIDGE.left} top={tableTop} rowH={h(60)} />
          <Note at={ageAt + 6} x={RIDGE.left} y={tableTop + h(162)}>
            <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
              <b>age</b> at exactly 0 under both: <span style={{ color: OK_INK, fontWeight: 650 }}>elastic net still selects</span>
            </span>
          </Note>
          <Note at={refitAt - 2} x={RIDGE.left} y={tableTop + h(216)}>
            <span style={{ ...label(21, INK_SOFT), whiteSpace: "nowrap", ...TABULAR }}>
              refitted on {REG.boot.n} resamples of the patients: how often each keeps both s1 and s2
            </span>
          </Note>
          <Resamples name="lasso" counts={REG.boot.lasso} n={REG.boot.n} at={refitAt + 4} litAt={fiveAt} color={WARM} ink={WARM_INK} left={RIDGE.left} top={tableTop + h(254)} />
          <Resamples name="elastic net" counts={REG.boot.enet} n={REG.boot.n} at={refitAt + 8} litAt={pairAt} color={OK} ink={OK_INK} left={RIDGE.left} top={tableTop + h(292)} />
          <Note at={selectsAt - 2} x={RIDGE.left} y={tableTop + h(348)}>
            <span style={{ ...note(26, OK_INK), fontWeight: 650, whiteSpace: "nowrap" }}>selects like lasso, steadier when features are correlated</span>
          </Note>
        </Fade>
      </Drift>
    </AbsoluteFill>
  );
};

/** The two cholesterol coefficients, and age, at the marked strength under each penalty. */
const Table: React.FC<{ at: number; enetAt: number; ageAt: number; swell: number; left: number; top: number; rowH: number }> = ({
  at: from,
  enetAt,
  ageAt,
  swell,
  left,
  top,
  rowH,
}) => {
  const frame = useCurrentFrame();
  const COL = [left, left + 230, left + 400, left + 570, left + 700];
  const cell = (v: number) => (v === 0 ? "0" : signed(v));
  const ageOf = (dropped: string[]) => (dropped.includes("age") ? 0 : NaN);
  const rows = [
    { name: "lasso", vals: [...REG.lassoS1S2, ageOf(REG.lassoDropped)], at: from },
    { name: "elastic net", vals: [...REG.enetS1S2, ageOf(REG.enetDropped)], at: enetAt },
  ];
  const head = (text: string, x: number, at: number) => (
    <div style={{ position: "absolute", left: x, top, ...label(21, INK_SOFT), fontWeight: 650, opacity: ease(frame, at, 10) }}>{text}</div>
  );
  return (
    <>
      {head("s1", COL[1], from)}
      {head("s2", COL[2], from)}
      {head("age", COL[3], ageAt - 2)}
      {rows.map((r, i) => {
        const p = ease(frame, r.at, 12);
        const rowTop = top + rowH * (i + 0.6);
        const enet = r.name === "elastic net";
        return (
          <div key={r.name} style={{ position: "absolute", left: 0, top: rowTop, opacity: p, transform: `translateY(${(1 - p) * 8}px)` }}>
            <div style={{ position: "absolute", left: COL[0], top: 0, ...note(28, INK), fontWeight: 650, whiteSpace: "nowrap" }}>{r.name}</div>
            {r.vals.map((v, k) => (
              <div
                key={k}
                style={{
                  position: "absolute",
                  left: COL[k + 1],
                  top: 0,
                  ...note(30, v === 0 ? (k === 2 ? INK : ACCENT_INK) : enet ? OK_INK : WARM_INK),
                  fontWeight: 700,
                  ...TABULAR,
                  whiteSpace: "nowrap",
                  opacity: k === 2 ? ease(frame, ageAt, 10) : 1,
                  transform: enet && k < 2 ? `scale(${1 + 0.06 * swell})` : undefined,
                }}
              >
                {Number.isNaN(v) ? "kept" : cell(v)}
              </div>
            ))}
            <div style={{ position: "absolute", left: COL[4], top: 4, ...note(24, enet ? OK_INK : ACCENT_INK), whiteSpace: "nowrap" }}>
              {enet ? "keeps the pair" : "drops s2"}
            </div>
          </div>
        );
      })}
    </>
  );
};

/** One model's resamples as a row of cells, the ones that kept both s1 and s2 filled. */
const Resamples: React.FC<{
  name: string;
  counts: PairCounts;
  n: number;
  at: number;
  litAt: number;
  color: string;
  ink: string;
  left: number;
  top: number;
}> = ({ name, counts, n, at: from, litAt, color, ink, left, top }) => {
  const frame = useCurrentFrame();
  const { h } = useLayout();
  const CELL = 9;
  const GAP = 2;
  const cellsLeft = left + 160;
  const lit = ease(frame, litAt, 14);
  return (
    <>
      <div style={{ position: "absolute", left, top, ...note(24, INK), fontWeight: 650, whiteSpace: "nowrap", opacity: ease(frame, from, 10) }}>{name}</div>
      {Array.from({ length: n }, (_, i) => {
        const p = ease(frame, from + i * 0.5, 6);
        const both = i < counts.both;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: cellsLeft + i * (CELL + GAP),
              top: top + h(4),
              width: CELL,
              height: h(24),
              boxSizing: "border-box",
              borderRadius: 2,
              border: `1.5px solid ${both && lit > 0 ? color : `color-mix(in srgb, ${INK_SOFT} 45%, ${PAPER})`}`,
              background: both ? `color-mix(in srgb, ${color} ${100 * lit}%, ${PAPER})` : PAPER,
              opacity: p,
            }}
          />
        );
      })}
      <div
        style={{
          position: "absolute",
          left: cellsLeft + n * (CELL + GAP) + 14,
          top,
          ...note(24, ink),
          fontWeight: 700,
          whiteSpace: "nowrap",
          opacity: lit,
        }}
      >
        <span style={TABULAR}>{counts.both}</span> of <span style={TABULAR}>{n}</span>
      </div>
    </>
  );
};
