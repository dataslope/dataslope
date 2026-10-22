import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, HIGHLIGHT, INK, INK_SOFT, TABULAR, fmt, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { REG } from "./data";
import { at, type Box, Curve, Drift, Fade, Mark, OK_INK, PanelTitle, pulse, type Scale, Svg, WARM, WARM_INK } from "./parts";

const RIDGE: Box = { left: 160, right: 840, top: 440, bottom: 780 };
const LASSO: Box = { left: 1080, right: 1760, top: 440, bottom: 780 };
const LO = -30;
const HI = 35;
const S1 = REG.features.indexOf("s1");
const S2 = REG.features.indexOf("s2");

/** Where each lasso coefficient reaches zero for good, as an index on the path. */
const DEATHS = REG.features.map((_, j) => {
  let i = REG.lasso.length;
  while (i > 0 && REG.lasso[i - 1][j] === 0) i--;
  return i;
});

/** A path panel's frame: the zero line, the baseline, and which way the penalty grows. */
const PathFrame: React.FC<{ b: Box; at: number }> = ({ b, at: from }) => {
  const frame = useCurrentFrame();
  const { y } = useLayout();
  const p = ease(frame, from, 16);
  const zero = at({ lo: LO, hi: HI, a: y(b.bottom), b: y(b.top) }, 0);
  return (
    <Svg opacity={p}>
      <line x1={b.left} x2={b.left + (b.right - b.left) * p} y1={zero} y2={zero} stroke={INK} strokeWidth={1.4} strokeDasharray="5 6" />
      <line x1={b.left} x2={b.right} y1={y(b.bottom) + 1} y2={y(b.bottom) + 1} stroke={INK} strokeWidth={1.6} />
      <text x={b.left - 12} y={zero + 7} textAnchor="end" style={{ ...label(19, INK_SOFT), fontVariantNumeric: "tabular-nums" }}>
        0
      </text>
      <text x={b.right} y={y(b.bottom) + 34} textAnchor="end" style={{ ...label(19, INK_SOFT), fontWeight: 650 }}>
        stronger penalty →
      </text>
    </Svg>
  );
};

/**
 * Questions 3 and 4 on scikit-learn's diabetes set, ten measurements
 * standardized: the same ten coefficients along a rising penalty, under ridge
 * on the left (all shrink, none leaves) and lasso on the right (each reaches
 * zero and stays there, a ring where it does). A marker at one strength:
 * lasso keeps seven, ridge ten. Then the two cholesterol measures, s1 and s2,
 * lit up: lasso keeps one, and a small table shows elastic net keeping both.
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
  const ridgeAt = n.word("reg-paths", "ridge shrinks all ten together");
  const lassoAt = n.word("reg-paths", "Lasso drives them to exactly zero");
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
  const enetAt = n.word("enet", "Elastic net keeps both");
  const steadyAt = n.word("enet", "steadier when features are correlated");
  const trustAt = n.word("cv-in", "how far can you trust");
  const end = n.beat("cv-in").to;

  const xs = (b: Box): Scale => ({ lo: REG.logAlpha[0], hi: REG.logAlpha[REG.logAlpha.length - 1], a: b.left, b: b.right });
  const ys = (b: Box): Scale => ({ lo: LO, hi: HI, a: y(b.bottom), b: y(b.top) });
  const clipOf = (b: Box): Box => ({ left: b.left - 6, right: b.right + 6, top: y(b.top) - 6, bottom: y(b.bottom) + 6 });
  const path = (rows: number[][], j: number) => REG.logAlpha.map((a, i) => [a, rows[i][j]] as const);
  const pickX = (b: Box) => at(xs(b), REG.pickLog);
  const lassoDur = 46;
  const span = REG.logAlpha[REG.logAlpha.length - 1] - REG.logAlpha[0];
  const passAt = (i: number) => lassoAt + 2 + (lassoDur * (REG.logAlpha[i] - REG.logAlpha[0])) / span;
  const pickP = ease(frame, strengthAt, 14);
  const pick = (j: number) => {
    const i = REG.logAlpha.findIndex((a) => a >= REG.pickLog);
    return REG.lasso[i][j];
  };
  const swell = pulse(frame, enetAt, 22);

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={ridgeAt + 2} level={-34} />
      <Sfx name="el-pencil" at={lassoAt + 2} level={-34} />
      {DEATHS.map((d, j) => (d < REG.lasso.length ? <Sfx key={j} name="el-tap" at={passAt(d)} level={-40} /> : null))}
      <Sfx name="el-pop" at={sevenAt} level={-32} />
      <Sfx name="el-scratch" at={keepsOneAt + 4} level={-34} />
      <Sfx name="el-pop" at={enetAt + 4} level={-32} />

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
        <Note at={mixAt - 2} x={RIDGE.left} y={y(270)} dim={trustAt}>
          <span style={{ ...note(28, INK), whiteSpace: "nowrap" }}>
            <b>elastic net</b>: a mix of the L1 and L2 penalties
          </span>
        </Note>
        <Note at={tenAt - 2} x={RIDGE.left} y={y(326)} dim={q4At}>
          <span style={{ ...label(22, INK_SOFT), whiteSpace: "nowrap" }}>ten measurements from a diabetes study, one line each</span>
        </Note>

        {/* ── Ridge: everything shrinks, nothing leaves ── */}
        <Fade from={ridgeNameAt - 6} out={keepsOneAt}>
          <PanelTitle x={RIDGE.left} y={y(RIDGE.top) - h(48)} at={ridgeNameAt - 2} color={INK}>
            L2, ridge: penalizes the squares
          </PanelTitle>
          <PathFrame b={RIDGE} at={raiseAt - 4} />
          {REG.features.map((f, j) => (
            <Curve key={f} points={path(REG.ridge, j)} x={xs(RIDGE)} y={ys(RIDGE)} at={ridgeAt + j * 0.6} dur={40} color={BAR} width={2.6} clip={clipOf(RIDGE)} />
          ))}
          <Svg opacity={pickP}>
            <line x1={pickX(RIDGE)} x2={pickX(RIDGE)} y1={y(RIDGE.top)} y2={y(RIDGE.bottom)} stroke={HIGHLIGHT} strokeWidth={10} />
          </Svg>
          <Note at={sevenAt + 4} x={pickX(RIDGE) + 16} y={y(RIDGE.top) - h(4)}>
            <span style={{ ...note(25, INK), fontWeight: 650, whiteSpace: "nowrap", ...TABULAR }}>keeps {REG.ridgeKept} of 10</span>
          </Note>
        </Fade>

        {/* ── Lasso: each reaches zero and stays ── */}
        <PanelTitle x={LASSO.left} y={y(LASSO.top) - h(48)} at={lassoNameAt - 2} color={INK} out={end - 8}>
          L1, lasso: penalizes the absolute values
        </PanelTitle>
        <Fade from={raiseAt - 6} out={end - 8}>
          <PathFrame b={LASSO} at={raiseAt - 2} />
          <Svg opacity={pickP}>
            <line x1={pickX(LASSO)} x2={pickX(LASSO)} y1={y(LASSO.top)} y2={y(LASSO.bottom)} stroke={HIGHLIGHT} strokeWidth={10} />
          </Svg>
          {REG.features.map((f, j) => {
            const lit = j === S1 || j === S2;
            return (
              <React.Fragment key={f}>
                <Curve points={path(REG.lasso, j)} x={xs(LASSO)} y={ys(LASSO)} at={lassoAt + 2} dur={lassoDur} color={BAR} width={2.6} clip={clipOf(LASSO)} dim={lit ? undefined : cholAt} />
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
              const p = ease(frame, passAt(d), 8);
              const lit = j === S1 || j === S2;
              const fade = lit ? 1 : 1 - ease(frame, cholAt, 14) * 0.7;
              return (
                <circle
                  key={j}
                  cx={at(xs(LASSO), REG.logAlpha[d])}
                  cy={at(ys(LASSO), 0)}
                  r={7 * p * (1 + 0.5 * pulse(frame, oneTimeAt + j * 2, 14))}
                  fill="none"
                  stroke={lit && frame >= cholAt ? WARM : ACCENT}
                  strokeWidth={2.6}
                  opacity={p * fade}
                />
              );
            })}
            {/* The pair at the marked strength: s1 still in, s2 at zero. */}
            {[S1, S2].map((j) => (
              <circle
                key={j}
                cx={pickX(LASSO)}
                cy={at(ys(LASSO), pick(j))}
                r={9 * ease(frame, keepsOneAt + (j === S2 ? 8 : 0), 10)}
                fill={j === S1 ? WARM : ACCENT}
              />
            ))}
          </Svg>
          <Note at={sevenAt - 2} x={pickX(LASSO) + 16} y={y(LASSO.top) - h(4)}>
            <span style={{ ...note(25, INK), fontWeight: 650, whiteSpace: "nowrap", ...TABULAR }}>
              keeps <Mark at={sevenAt}>{REG.lassoKept} of 10</Mark>
            </span>
          </Note>
          <Note at={selectAt - 2} x={LASSO.left} y={y(LASSO.bottom) + h(52)} out={cholAt}>
            <span style={{ ...note(27, OK_INK), fontWeight: 650, whiteSpace: "nowrap" }}>feature selection</span>
          </Note>
          <Note at={cholAt + 2} x={LASSO.left} y={y(LASSO.bottom) + h(52)}>
            <span style={{ ...note(24, WARM_INK), fontWeight: 650, whiteSpace: "nowrap", ...TABULAR }}>
              s1 and s2, two cholesterol measures
              <span style={{ opacity: ease(frame, corrAt - 2, 10) }}>: correlation {fmt(REG.s1s2, 1)}</span>
            </span>
          </Note>
        </Fade>

        {/* ── Elastic net keeps both ── */}
        <Fade from={keepsOneAt + 2} out={end - 8}>
          <Table
            at={keepsOneAt + 4}
            enetAt={enetAt}
            swell={swell}
            left={RIDGE.left}
            top={y(RIDGE.top) + h(20)}
            rowH={h(66)}
          />
          <Note at={steadyAt - 2} x={RIDGE.left} y={y(RIDGE.top) + h(250)}>
            <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>steadier when features are correlated</span>
          </Note>
        </Fade>
      </Drift>
    </AbsoluteFill>
  );
};

/** The two cholesterol coefficients at the marked strength, under each penalty. */
const Table: React.FC<{ at: number; enetAt: number; swell: number; left: number; top: number; rowH: number }> = ({
  at: from,
  enetAt,
  swell,
  left,
  top,
  rowH,
}) => {
  const frame = useCurrentFrame();
  const COL = [left, left + 250, left + 480];
  const cell = (v: number) => (v === 0 ? "0" : fmt(v));
  const rows = [
    { name: "lasso", vals: REG.lassoS1S2, at: from },
    { name: "elastic net", vals: REG.enetS1S2, at: enetAt },
  ];
  return (
    <>
      <div style={{ position: "absolute", left: COL[1], top, ...label(21, INK_SOFT), fontWeight: 650, opacity: ease(frame, from, 10) }}>s1</div>
      <div style={{ position: "absolute", left: COL[2], top, ...label(21, INK_SOFT), fontWeight: 650, opacity: ease(frame, from, 10) }}>s2</div>
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
                  ...note(30, v === 0 ? ACCENT_INK : enet ? OK_INK : WARM_INK),
                  fontWeight: 700,
                  ...TABULAR,
                  whiteSpace: "nowrap",
                  transform: enet ? `scale(${1 + 0.06 * swell})` : undefined,
                }}
              >
                {cell(v)}
              </div>
            ))}
            <div style={{ position: "absolute", left: COL[2] + 160, top: 4, ...note(24, enet ? OK_INK : ACCENT_INK), whiteSpace: "nowrap" }}>
              {enet ? "keeps both" : "drops s2"}
            </div>
          </div>
        );
      })}
    </>
  );
};
