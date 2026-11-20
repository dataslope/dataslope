import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { I, MathRun } from "../../editorial/math";
import { INK, INK_SOFT, note } from "../../editorial/style";
import { ColumnRule, Ink, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { BAYES } from "./data";
import { DATA, DATA_INK, Drift, Heading, HIGHLIGHT, Line, Mark, MUTED, Svg, X0 } from "./parts";

const COLS = 64;
const PITCH = 12;
const R_X0 = 1000;

const P = ({ children }: { children: React.ReactNode }) => (
  <>
    <I>P</I>({children})
  </>
);

/**
 * Question 12. Bayes in words and in symbols; then the page's base-rate grid
 * told as fraud: one dot per flagged transaction out of 100,000, fraud in
 * blue and honest in grey. At 1 in 1,000, 99 of 1,098 flags are fraud (9%);
 * at 1 in 100, 990 of 1,980 (50%). The two grids stand on one baseline, so
 * their sizes compare. Nothing is red: the model is not at fault.
 */
export const BayesScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("q12").from;
  const qAt = n.word("q12", "Question twelve");
  const textAt = n.word("q12", "What is Bayes' theorem?");
  const updatesAt = n.word("q12", "It updates a prior belief");
  const posteriorAt = n.word("q12", "the posterior is the likelihood");
  const overAt = n.word("q12", "over the evidence");
  const trapAt = n.word("q12", "The classic trap is the base rate");
  const sayAt = n.word("q12-fraud", "Say a fraud model");
  const flagsOneAt = n.word("q12-fraud", "flags one percent of honest transactions");
  const thousandAt = n.word("q12-fraud", "one in a thousand is fraud");
  const ofAt = n.word("q12-fraud", "Of a hundred thousand");
  const fraudsAt = n.word("q12-fraud", "ninety-nine frauds");
  const honestAt = n.word("q12-fraud", "nine hundred and ninety-nine honest ones");
  const nineAt = n.word("q12-fraud", "only nine percent of the time");
  const precisionAt = n.word("q12-shift", "precision moves with the base rate");
  const recallAt = n.word("q12-shift", "while recall doesn't");
  const risesAt = n.word("q12-shift", "If fraud rises to one in a hundred");
  const halfAt = n.word("q12-shift", "right half the time");
  const nothingAt = n.word("q12-shift", "Nothing in the model changed");
  const end = n.beat("q12-shift").to;

  const bottom = y(820);
  const rise = ease(frame, sayAt - 14, 22);
  const grids = [
    { f: BAYES.rare, x: X0, fraudAt: fraudsAt, honestAt, at: thousandAt, resultAt: nineAt, head: "Base rate: 1 in 1,000 is fraud" },
    { f: BAYES.common, x: R_X0, fraudAt: risesAt + 10, honestAt: risesAt + 22, at: risesAt, resultAt: halfAt, head: "Base rate: 1 in 100 is fraud" },
  ];

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={posteriorAt} level={-35} />
      <Sfx name="el-tap" at={trapAt + 4} level={-31} />
      <Sfx name="el-sprinkle" at={fraudsAt} level={-33} />
      <Sfx name="el-sprinkle" at={honestAt} level={-32} />
      <Sfx name="el-tap" at={nineAt + 4} level={-29} />
      <Sfx name="el-sprinkle" at={risesAt + 10} level={-32} />
      <Sfx name="el-tap" at={halfAt + 4} level={-29} />
      <Sfx name="el-chime" at={nothingAt + 30} level={-33} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={12} at={qAt - 4} textAt={textAt - 4} size={60}>
          What is Bayes&apos; theorem?
        </QuestionCard>

        {/* ── The theorem: lower and larger while it is alone on the page,
            rising to the top as the fraud example starts ── */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            transform: `translateY(${(1 - rise) * h(150)}px) scale(${1 + 0.18 * (1 - rise)})`,
            transformOrigin: `${X0}px ${y(276)}px`,
          }}
        >
        <Line at={updatesAt} x={X0} y={y(276)} size={28} color={INK_SOFT}>
          It updates a prior belief with evidence
        </Line>
        <Ink at={posteriorAt} dur={16} style={{ left: X0, top: y(322), whiteSpace: "nowrap" }}>
          <span style={{ ...note(34, INK), fontWeight: 600 }}>
            Posterior = likelihood ×{" "}
            <Mark at={trapAt + 4}>prior</Mark>
            <span style={{ opacity: ease(frame, overAt - 2, 10) }}> / evidence</span>
          </span>
        </Ink>
        <Ink at={overAt + 4} dur={16} style={{ left: X0, top: y(378), whiteSpace: "nowrap" }}>
          <span style={{ ...note(34, INK) }}>
            <MathRun>
              <P>
                <I>A</I> | <I>B</I>
              </P>{" "}
              ={" "}
              <P>
                <I>B</I> | <I>A</I>
              </P>{" "}
              <P>
                <I>A</I>
              </P>{" "}
              /{" "}
              <P>
                <I>B</I>
              </P>
            </MathRun>
          </span>
        </Ink>
        </div>

        {/* ── Precision and recall, top right ── */}
        <Line at={precisionAt} x={R_X0} y={y(282)} size={28} weight={600}>
          Precision <Num>9%</Num>{" "}
          <span style={{ opacity: ease(frame, halfAt - 2, 10) }}>
            → <Mark at={halfAt + 6}><Num>50%</Num></Mark>
          </span>
        </Line>
        <Line at={recallAt} x={R_X0} y={y(336)} size={28} weight={500}>
          <Mark at={nothingAt + 4} color={HIGHLIGHT}>
            Recall <Num>99%</Num> → <Num>99%</Num>
          </Mark>
        </Line>

        {/* ── The model, and the flags it raises ── */}
        <Line at={sayAt} x={X0} y={y(452)} size={24}>
          A fraud model: catches <Num>99%</Num> of fraud,{" "}
          <span style={{ opacity: ease(frame, flagsOneAt - 2, 10) }}>flags <Num>1%</Num> of honest ones</span>
        </Line>
        <Line at={ofAt} x={X0} y={y(494)} size={22} color={INK_SOFT}>
          One dot per flagged transaction, out of <Num>{BAYES.population.toLocaleString("en-US")}</Num>
        </Line>
        <ColumnRule x={(X0 + COLS * PITCH + R_X0) / 2} top={y(540)} height={bottom + 100 - y(540)} at={risesAt} />
        {grids.map((g, k) => {
          const rows = Math.ceil(g.f.flagged / COLS);
          const top = bottom - rows * PITCH;
          return (
            <React.Fragment key={k}>
              <Heading at={g.at} x={g.x} y={top - 76}>
                {g.head}
              </Heading>
              <Line at={g.honestAt + 8} x={g.x} y={top - 38} size={22} color={INK_SOFT}>
                Flagged: <Num>{g.f.flagged.toLocaleString("en-US")}</Num>, <span style={{ color: DATA_INK }}>
                  <Num>{g.f.caught.toLocaleString("en-US")}</Num> fraud
                </span>
              </Line>
              <Svg>
                {Array.from({ length: g.f.flagged }, (_, i) => {
                  const fraud = i < g.f.caught;
                  const at = fraud ? g.fraudAt + (i / g.f.caught) * 8 : g.honestAt + ((i - g.f.caught) / (g.f.flagged - g.f.caught)) * 18;
                  const p = ease(frame, at, 8);
                  if (p <= 0) return null;
                  const c = i % COLS;
                  const r = Math.floor(i / COLS);
                  return <circle key={i} cx={g.x + c * PITCH + PITCH / 2} cy={top + r * PITCH + PITCH / 2} r={4.6 * p} fill={fraud ? DATA : MUTED} />;
                })}
              </Svg>
              <Line at={g.resultAt} x={g.x} y={bottom + 18} size={30} weight={600}>
                A flag is fraud:{" "}
                <Mark at={g.resultAt + 4}>
                  <Num>{Math.round(g.f.precision * 100)}%</Num>
                </Mark>
              </Line>
            </React.Fragment>
          );
        })}
      </Drift>
    </AbsoluteFill>
  );
};
