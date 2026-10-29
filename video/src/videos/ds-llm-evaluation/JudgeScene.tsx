import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, BLUE_INK, INK, INK_SOFT, PAPER, TABULAR, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ds } from "../../theme/brand";
import { JUDGE } from "./data";
import { BAD, Clear, DATA_LIGHT, Drift, Frac, Grid100, Mark, MARK_BAD, math, X0 } from "./parts";

const GRID = { x: X0, top: 370, cell: 36, gap: 6 };
const R_X = 660;
const STAR = ds("yellow", 600);
/** The judge and the reply from its own model family: one hue with no
 *  meaning in the series, so neither reads as the trap or the answer. */
const FAMILY = ds("purple", 500);
/** A five-pointed star, radius 11, centred on the origin. */
const STAR_PATH =
  Array.from({ length: 10 }, (_, k) => {
    const r = k % 2 ? 4.6 : 11;
    const a = -Math.PI / 2 + (k * Math.PI) / 5;
    return `${k ? "L" : "M"}${(r * Math.cos(a)).toFixed(2)},${(r * Math.sin(a)).toFixed(2)}`;
  }).join(" ") + " Z";

/** Where the ten disagreements and the five shared fails sit in the grid:
 *  spread out, the way they would fall in real labels. Of the ten, the judge
 *  passes five the expert fails, and the expert passes the other five. */
const JUDGE_ONLY = new Set([7, 26, 41, 64, 86]);
const EXPERT_ONLY = new Set([18, 33, 52, 71, 96]);
const BOTH_FAIL = new Set([12, 37, 58, 79, 91]);

/** A legend swatch: a filled square, with a white slash for the items only
 *  the expert passes, the same mark as their cells. */
const Swatch: React.FC<{ color: string; slash?: boolean }> = ({ color, slash = false }) => (
  <svg width={16} height={16} style={{ marginRight: 8, verticalAlign: "-2px", overflow: "visible" }}>
    <rect width={16} height={16} rx={3} fill={color} />
    {slash ? <line x1={3} y1={13} x2={13} y2={3} stroke={PAPER} strokeWidth={2.4} strokeLinecap="round" /> : null}
  </svg>
);

/** A small reply card in a bias sketch: `w` wide, starred if the judge picks it. */
const Mini: React.FC<{ x: number; y: number; w: number; h?: number; color?: string; star?: boolean; starAt: number; children?: React.ReactNode }> = ({
  x,
  y,
  w,
  h = 56,
  color = INK_SOFT,
  star = false,
  starAt,
  children,
}) => {
  const frame = useCurrentFrame();
  const s = star ? ease(frame, starAt, 10) : 0;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        borderRadius: 8,
        border: `2px solid ${color}`,
        background: `color-mix(in srgb, ${color} 10%, ${PAPER})`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        ...label(18, INK),
        fontWeight: 700,
      }}
    >
      {children}
      {s > 0 ? (
        <svg width={34} height={34} viewBox="-12 -12 24 24" style={{ position: "absolute", right: -16, top: -18, transform: `scale(${s})`, overflow: "visible" }}>
          <path d={STAR_PATH} fill={STAR} stroke={PAPER} strokeWidth={1.5} strokeLinejoin="round" />
        </svg>
      ) : null}
    </div>
  );
};

/**
 * Question 4. A hundred items graded by judge and expert, as a grid: they
 * agree on ninety, and the ten they part on turn red, five each way (the
 * expert's five slashed), so each rater's 85 + 5 = 90 passes can be counted.
 * Then the arithmetic in
 * the page's own numbers: chance agreement 0.82 (both pass, 0.9 × 0.9, plus
 * both fail, 0.1 × 0.1, said as well as shown), so kappa is 0.08 over 0.18,
 * 0.44; a judge that always says pass agrees ninety percent too, with kappa 0.
 * Then the three known biases, each drawn as what it does rather than how
 * often (the page gives no rates), and the bar a judge is held to: how well
 * the experts agree with each other, which it can't be expected to beat.
 */
export const JudgeScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("judge").from;
  const qAt = n.word("judge", "Question");
  const textAt = n.word("judge", "How do you know whether");
  const instrumentAt = n.word("judge", "Treat it as an instrument");
  const calibrateAt = n.word("judge", "calibrate it against experts");
  const eachAt = n.word("judge", "each mark ninety percent");
  const agreeAt = n.word("judge", "they agree on ninety percent");
  const strongAt = n.word("judge-chance", "That sounds strong");
  const chanceAt = n.word("judge-chance", "agree often by chance");
  const peAt = n.word("judge-pe", "chance alone gives eighty-two percent");
  const passAt = n.word("judge-pe", "both pass");
  const failAt = n.word("judge-pe", "both fail");
  const kappaAt = n.word("judge-kappa", "Cohen's kappa takes chance out");
  const aboveAt = n.word("judge-kappa", "point oh eight above chance");
  const roomAt = n.word("judge-kappa", "out of a possible point one eight");
  const isAt = n.word("judge-kappa", "is point four four");
  const moderateAt = n.word("judge-kappa", "Moderate");
  const alwaysAt = n.word("judge-kappa", "always said pass");
  const zeroAt = n.word("judge-kappa", "Its kappa is zero");
  const biasAt = n.word("judge-bias", "test its known biases");
  const firstAt = n.word("judge-bias", "the first answer shown");
  const longerAt = n.word("judge-bias", "toward longer answers");
  const familyAt = n.word("judge-bias", "its own model family");
  const expertsAt = n.word("judge-bias", "how well the experts agree");
  const beatAt = n.word("judge-bar", "Don't expect a judge");
  const offlineAt = n.word("ab-in", "Offline scores only decide");
  const usersAt = n.word("ab-in", "on real users");
  const end = n.beat("ab-in").to;

  const red = ease(frame, agreeAt + 4, 12);
  const color = (i: number) => {
    if (JUDGE_ONLY.has(i) || EXPERT_ONLY.has(i)) return `color-mix(in srgb, ${BAD} ${100 * red}%, ${DATA_LIGHT})`;
    if (BOTH_FAIL.has(i)) return BLUE_INK;
    return DATA_LIGHT;
  };
  const gridW = 10 * (GRID.cell + GRID.gap) - GRID.gap;

  return (
    <AbsoluteFill>
      <Sfx name="el-sprinkle" at={calibrateAt + 2} level={-36} />
      <Sfx name="el-pop" at={agreeAt + 4} level={-34} />
      <Sfx name="el-pencil" at={kappaAt} level={-36} />
      <Sfx name="el-pop" at={isAt + 4} level={-32} />
      <Sfx name="el-scratch" at={zeroAt + 4} level={-34} />
      {[firstAt, longerAt, familyAt].map((t, i) => (
        <Sfx key={i} name="el-tap" at={t + 6} level={-34} />
      ))}
      <Sfx name="el-chime" at={beatAt + 6} level={-36} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={4} at={qAt - 4} textAt={textAt - 4} size={60}>
          How do you know whether an LLM judge can be trusted?
        </QuestionCard>

        {/* A hundred items, judge against expert. */}
        <Note at={instrumentAt} x={GRID.x} y={y(GRID.top - 50)}>
          <span style={{ ...label(21, INK_SOFT), whiteSpace: "nowrap" }}>100 replies, graded by the judge and by an expert</span>
        </Note>
        <Grid100
          x={GRID.x}
          y={y(GRID.top)}
          cell={GRID.cell}
          gap={GRID.gap}
          at={calibrateAt}
          color={color}
          slash={(i) => (EXPERT_ONLY.has(i) ? red : 0)}
        />
        <Note at={agreeAt + 6} x={GRID.x} y={y(GRID.top) + gridW + h(18)}>
          <div style={{ display: "grid", gridTemplateColumns: "auto auto", columnGap: 26, rowGap: 8, ...label(19, INK), whiteSpace: "nowrap" }}>
            <span>
              <Swatch color={DATA_LIGHT} />
              both pass
            </span>
            <span>
              <Swatch color={BLUE_INK} />
              both fail
            </span>
            <span style={{ color: ACCENT_INK, fontWeight: 700 }}>
              <Swatch color={BAD} />
              only the judge passes
            </span>
            <span style={{ color: ACCENT_INK, fontWeight: 700 }}>
              <Swatch color={BAD} slash />
              only the expert passes
            </span>
          </div>
        </Note>
        <Note at={agreeAt + 14} x={GRID.x} y={y(GRID.top) + gridW + h(96)}>
          <span style={{ ...label(19, INK_SOFT), whiteSpace: "nowrap" }}>
            judge and expert each pass{" "}
            <b style={{ color: INK, ...TABULAR }}>
              {JUDGE.cells.passPass} + {JUDGE.cells.passFail} = {JUDGE.judgePasses}
            </b>{" "}
            of the 100
          </span>
        </Note>

        {/* The arithmetic, in the page's numbers. */}
        <Clear at={biasAt - 4}>
          <Note at={eachAt} x={R_X} y={y(GRID.top)}>
            <span style={{ ...note(28, INK), ...TABULAR, whiteSpace: "nowrap" }}>judge and expert each mark 90% as a pass</span>
          </Note>
          <Note at={agreeAt} x={R_X} y={y(GRID.top + 50)}>
            <span style={{ ...note(28, INK), fontWeight: 650, ...TABULAR, whiteSpace: "nowrap" }}>
              they agree on <Mark at={strongAt}>{Math.round(JUDGE.po * 100)}% of items</Mark>
            </span>
          </Note>
          <Note at={chanceAt} x={R_X} y={y(GRID.top + 120)}>
            <span style={{ ...note(26, INK_SOFT), whiteSpace: "nowrap" }}>
              agreement by chance alone:{" "}
              <span style={{ opacity: ease(frame, peAt - 2, 10) }}>
                <b style={{ color: INK }}>{JUDGE.pe.toFixed(2)}</b> ={" "}
              </span>
              <span style={{ opacity: ease(frame, passAt - 2, 10) }}>
                0.9 × 0.9 <span style={{ fontSize: 22 }}>(both pass)</span>
              </span>
              <span style={{ opacity: ease(frame, failAt - 2, 10) }}>
                {" "}+ 0.1 × 0.1 <span style={{ fontSize: 22 }}>(both fail)</span>
              </span>
            </span>
          </Note>
          <Note at={kappaAt} x={R_X} y={y(GRID.top + 190)}>
            <div style={{ display: "flex", alignItems: "center", gap: 18, ...math(40, INK) }}>
              <span style={{ fontStyle: "italic" }}>Cohen&apos;s κ</span>
              <span>=</span>
              <Frac top={<span>{JUDGE.po.toFixed(2)} − {JUDGE.pe.toFixed(2)}</span>} bottom={<span>1 − {JUDGE.pe.toFixed(2)}</span>} />
              <span style={{ opacity: ease(frame, aboveAt, 10) }}>=</span>
              <span style={{ opacity: ease(frame, aboveAt, 10) }}>
                <Frac
                  top={<Mark at={aboveAt + 4}>{JUDGE.above.toFixed(2)}</Mark>}
                  bottom={<span style={{ opacity: ease(frame, roomAt, 10) }}>{JUDGE.room.toFixed(2)}</span>}
                />
              </span>
              <span style={{ opacity: ease(frame, isAt, 10) }}>=</span>
              <span style={{ opacity: ease(frame, isAt, 10), fontWeight: 700, color: BLUE_INK }}>{JUDGE.kappa.toFixed(2)}</span>
            </div>
          </Note>
          <Note at={moderateAt} x={R_X + 760} y={y(GRID.top + 216)}>
            <span style={{ ...note(28, BLUE_INK), fontWeight: 700, fontStyle: "italic", whiteSpace: "nowrap" }}>moderate</span>
          </Note>
          <Note at={alwaysAt - 6} x={R_X} y={y(GRID.top + 330)}>
            <span style={{ ...note(28, INK), ...TABULAR, whiteSpace: "nowrap" }}>
              a judge that always says pass: agrees {Math.round(JUDGE.alwaysPass.po * 100)}%,{" "}
              <span style={{ opacity: ease(frame, zeroAt, 10), color: ACCENT_INK, fontWeight: 700 }}>
                <Mark at={zeroAt + 6} color={MARK_BAD}>
                  κ = {JUDGE.alwaysPass.kappa}
                </Mark>
              </span>
            </span>
          </Note>
        </Clear>

        {/* The known biases, each drawn as what it does. */}
        <Note at={biasAt} x={R_X} y={y(GRID.top)}>
          <span style={{ ...note(28, INK), fontWeight: 650, whiteSpace: "nowrap" }}>test its known biases: a pull toward</span>
        </Note>
        {[
          { title: "the first answer shown", at: firstAt },
          { title: "the longer answer", at: longerAt },
          { title: "its own model family", at: familyAt },
        ].map((b, i) => (
          <Note key={b.title} at={b.at - 2} x={R_X + i * 380} y={y(GRID.top + 70)}>
            <div style={{ position: "relative", width: 340, height: 170 }}>
              <div style={{ ...note(24, INK), fontWeight: 650, whiteSpace: "nowrap" }}>{b.title}</div>
              {i === 0 ? (
                <>
                  <Mini x={0} y={60} w={140} star starAt={b.at + 6}>
                    first
                  </Mini>
                  <Mini x={170} y={60} w={140} starAt={b.at + 6}>
                    second
                  </Mini>
                </>
              ) : null}
              {i === 1 ? (
                <>
                  <Mini x={0} y={60} w={90} starAt={b.at + 6}>
                    short
                  </Mini>
                  <Mini x={120} y={60} w={200} h={96} star starAt={b.at + 6}>
                    long
                  </Mini>
                </>
              ) : null}
              {i === 2 ? (
                <>
                  <Mini x={0} y={60} w={100} color={FAMILY} starAt={b.at + 6}>
                    judge
                  </Mini>
                  <Mini x={130} y={60} w={80} color={FAMILY} star starAt={b.at + 6}>
                    A
                  </Mini>
                  <Mini x={230} y={60} w={80} starAt={b.at + 6}>
                    B
                  </Mini>
                </>
              ) : null}
            </div>
          </Note>
        ))}
        <Note at={expertsAt} x={R_X} y={y(GRID.top + 320)}>
          <span style={{ ...note(28, INK), whiteSpace: "nowrap" }}>the bar: how well the experts agree with each other</span>
        </Note>
        <Note at={beatAt} x={R_X} y={y(GRID.top + 370)}>
          <span style={{ ...note(30, INK), fontWeight: 650, whiteSpace: "nowrap" }}>
            <Mark at={beatAt + 6}>don&apos;t expect a judge to beat the humans it imitates</Mark>
          </span>
        </Note>
        <Note at={offlineAt} x={R_X} y={y(GRID.top + 450)}>
          <span style={{ ...note(26, INK_SOFT), fontStyle: "italic", whiteSpace: "nowrap" }}>
            offline scores decide what&apos;s worth trying{" "}
            <span style={{ opacity: ease(frame, usersAt - 2, 10), color: BLUE_INK, fontWeight: 650 }}>on real users</span>
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
