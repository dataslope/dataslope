import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, HIGHLIGHT, INK, INK_SOFT, PAPER, note } from "../../editorial/style";
import { Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { COND } from "./data";
import { DieFace, Drift, Frac, Given, Labeled, Mark, MARK_OK, math, OK, OK_INK, pulse, V, X0 } from "./parts";

const DIE = { size: 110, pitch: 140, y: 470 };
/** A probability's own column, so the note after it lines up row to row. */
const ROW: React.CSSProperties = { display: "inline-block", width: 330 };
const RULE_X = 1080;
/** How far in from RULE_X the definition's "=" sits, so the line that puts
 *  the die's numbers into it starts under it. */
const PLUG_DX = 176;

/** "P(" … ")": a probability in the page's notation. */
const P: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span>
    P({children})
  </span>
);

/**
 * Questions 1 and 2. A die, told it came up even: three faces left, a six
 * goes from one in six to one in three, and the definition beside it. Then
 * Bayes' theorem, its parts named as they are read, and where the base rate
 * comes in: the bottom line, written out.
 */
export const CondScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  const from = n.beat("cond").from;
  const qAt = n.word("cond", "Question");
  const textAt = n.word("cond", "What is conditional probability");
  const answerAt = n.word("cond", "It's the probability");
  const rollAt = n.word("cond-die", "Roll a die");
  const evenAt = n.word("cond-die", "came up even");
  const threeAt = n.word("cond-six", "Three faces are left");
  const sixAt = n.word("cond-six", "the chance of a six");
  const notAt = n.word("cond-six", "not one in six");
  const symbolsAt = n.word("cond-rule", "In symbols");
  const shrinkAt = n.word("cond-rule", "shrink the world");
  const measureAt = n.word("cond-rule", "measure again");
  const plugAt = n.word("cond-plug", "one sixth over one half");
  const thirdAt = n.word("cond-plug", "one in three");
  const q2At = n.word("bayes", "Question two");
  const q2TextAt = n.word("bayes", "State Bayes' theorem");
  const turnsAt = n.word("bayes", "It turns");
  const bGivenAAt = n.word("bayes", "the probability of B given A");
  const aGivenBAt = n.word("bayes", "into A given B");
  const likelihoodAt = n.word("bayes", "the likelihood");
  const priorAt = n.word("bayes", "the prior");
  const evidenceAt = n.word("bayes", "evidence");
  const knowAt = n.word("bayes-when", "you know how a test behaves");
  const diseaseAt = n.word("bayes-when", "given a disease");
  const wantAt = n.word("bayes-when", "you want the chance");
  const bottomAt = n.word("bayes-base", "The bottom line");
  const sickAt = n.word("bayes-base", "the positives among the sick");
  const healthyAt = n.word("bayes-base", "the positives among the healthy");
  const weightedAt = n.word("bayes-base", "each weighted");
  const baseAt = n.word("bayes-base", "the base rate");
  const breaksAt = n.word("bayes-base", "intuition breaks");
  const end = n.beat("test-in").to;

  const out1 = q2At - 4;
  const odd = ease(frame, evenAt, 14);
  const evenLit = ease(frame, threeAt, 12);
  const sixLit = ease(frame, sixAt, 12);
  // P(six) stays 1/6: once the conditional arrives it goes quiet, not wrong.
  const quiet = ease(frame, notAt, 14);
  const formulaY = y(330);

  return (
    <AbsoluteFill>
      <Sfx name="pip-3" at={rollAt + 2} level={-30} />
      <Sfx name="el-tap" at={evenAt + 2} level={-34} />
      <Sfx name="el-pop" at={sixAt + 4} level={-32} />
      <Sfx name="el-pencil" at={symbolsAt + 2} level={-34} />
      <Sfx name="el-pencil" at={plugAt + 2} level={-36} />
      <Sfx name="el-pencil" at={turnsAt + 2} level={-34} />
      <Sfx name="el-tap" at={knowAt + 2} level={-34} />
      <Sfx name="el-tap" at={wantAt + 2} level={-34} />
      <Sfx name="el-scratch" at={breaksAt} level={-34} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={1} at={qAt - 4} textAt={textAt - 4} out={out1} size={60}>
          What is conditional probability?
        </QuestionCard>
        <QuestionCard n={2} at={q2At} textAt={q2TextAt - 2} size={60}>
          State Bayes&rsquo; theorem, and say when you&rsquo;d use it.
        </QuestionCard>

        {/* ── Question 1: the probability of A, given B ── */}
        <Ink at={answerAt} dur={18} out={out1} style={{ left: X0, top: y(300) }}>
          <span style={math(64)}>
            <P>
              <V>A</V>
              <Given />
              <V>B</V>
            </P>
          </span>
        </Ink>
        <Note at={answerAt + 10} x={X0 + 250} y={y(318)} out={out1}>
          <span style={{ ...note(28, INK_SOFT), whiteSpace: "nowrap" }}>the probability of A, given that B has happened</span>
        </Note>

        {[1, 2, 3, 4, 5, 6].map((v, i) => {
          const isOdd = v % 2 === 1;
          const isSix = v === 6;
          const fill = isSix
            ? `color-mix(in srgb, ${OK} ${sixLit * 30}%, color-mix(in srgb, ${HIGHLIGHT} ${evenLit * 100}%, ${PAPER}))`
            : isOdd
              ? PAPER
              : `color-mix(in srgb, ${HIGHLIGHT} ${evenLit * 100}%, ${PAPER})`;
          return (
            <DieFace
              key={v}
              value={v}
              x={X0 + i * DIE.pitch}
              y={y(DIE.y)}
              size={DIE.size}
              at={rollAt + i * 3}
              ink={isOdd ? `color-mix(in srgb, ${INK_SOFT} ${odd * 100}%, ${INK})` : isSix && sixLit > 0.5 ? OK_INK : INK}
              fill={fill}
              opacity={(isOdd ? 1 - 0.75 * odd : 1) * (1 - ease(frame, out1, 10))}
              scale={isSix ? 1 + 0.08 * pulse(frame, sixAt, 18) : 1}
            />
          );
        })}
        {/* Both stay true: each line says which faces it counts over. */}
        <Note at={rollAt + 16} x={X0} y={y(DIE.y + DIE.size + 34)} out={out1}>
          <span style={{ ...math(38, `color-mix(in srgb, ${INK_SOFT} ${quiet * 100}%, ${INK})`), ...ROW }}>
            <P>six</P> = {COND.pSix}
          </span>
          <span style={{ ...note(24, INK_SOFT), opacity: quiet, whiteSpace: "nowrap" }}>out of all six faces</span>
        </Note>
        <Note at={sixAt + 2} x={X0} y={y(DIE.y + DIE.size + 96)} out={out1}>
          <span style={{ ...math(38, OK_INK), ...ROW }}>
            <P>
              six
              <Given />
              even
            </P>{" "}
            = {COND.pSixGivenEven}
          </span>
          <span style={{ ...note(24, INK_SOFT), opacity: ease(frame, sixAt + 10, 12), whiteSpace: "nowrap" }}>out of the three even faces</span>
        </Note>

        {/* The definition, beside the die. */}
        <Ink at={symbolsAt} dur={20} out={out1} style={{ left: RULE_X, top: y(470) }}>
          <span style={math(52)}>
            <P>
              <V>A</V>
              <Given />
              <V>B</V>
            </P>{" "}
            ={" "}
            <Frac
              top={
                <Mark at={measureAt}>
                  <P>
                    <V>A</V> and <V>B</V>
                  </P>
                </Mark>
              }
              bottom={
                <Mark at={shrinkAt}>
                  <P>
                    <V>B</V>
                  </P>
                </Mark>
              }
            />
          </span>
        </Ink>
        {/* The die's own numbers in it, under the fraction they fill:
            P(six and even) over P(even). */}
        <Ink at={plugAt} dur={18} out={out1} style={{ left: RULE_X + PLUG_DX, top: y(612) }}>
          <span style={math(46)}>
            = <Frac top={COND.pSixAndEven} bottom={COND.pEven} /> =
            {/* Clear of the "=": the mark's wash reaches 0.14em past its text. */}
            <span style={{ display: "inline-block", marginLeft: "0.32em" }}>
              <Mark at={thirdAt} color={MARK_OK}>
                <span style={{ color: OK_INK }}>{COND.pSixGivenEven}</span>
              </Mark>
            </span>
          </span>
        </Ink>

        {/* ── Question 2: Bayes' theorem ── */}
        <Ink at={turnsAt} dur={20} style={{ left: X0, top: formulaY }}>
          <span style={math(64)}>
            <Mark at={aGivenBAt} color={MARK_OK}>
              <P>
                <V>A</V>
                <Given />
                <V>B</V>
              </P>
            </Mark>{" "}
            ={" "}
            <Frac
              gap={10}
              top={
                <>
                  <Labeled word="likelihood" at={likelihoodAt}>
                    <Mark at={bGivenAAt}>
                      <P>
                        <V>B</V>
                        <Given />
                        <V>A</V>
                      </P>
                    </Mark>
                  </Labeled>{" "}
                  <Labeled word="prior: the base rate" at={priorAt}>
                    <P>
                      <V>A</V>
                    </P>
                  </Labeled>
                </>
              }
              bottom={
                <Labeled word="the evidence" at={evidenceAt} below>
                  <P>
                    <V>B</V>
                  </P>
                </Labeled>
              }
            />
          </span>
        </Ink>

        {/* Which event is which, then what you know (the likelihood, marked as
            it is in the theorem) and what you want (the answer, in green). */}
        <Note at={diseaseAt} x={X0} y={y(590)}>
          <span style={{ ...note(24, INK_SOFT), whiteSpace: "nowrap" }}>
            <span style={math(30, INK)}>
              <V>A</V>
            </span>{" "}
            = disease,
            <span style={{ ...math(30, INK), marginLeft: 26 }}>
              <V>B</V>
            </span>{" "}
            = positive
          </span>
        </Note>
        <Note at={knowAt + 2} x={X0} y={y(650)}>
          <span style={{ ...note(26, INK_SOFT), whiteSpace: "nowrap" }}>you know </span>
          <span style={math(36, INK)}>
            <Mark at={knowAt + 10}>
              <P>
                positive
                <Given />
                disease
              </P>
            </Mark>
          </span>
        </Note>
        <Note at={wantAt + 2} x={X0} y={y(720)}>
          <span style={{ ...note(26, INK_SOFT), whiteSpace: "nowrap" }}>you want </span>
          <span style={math(36, OK_INK)}>
            <P>
              disease
              <Given />
              positive
            </P>
          </span>
        </Note>

        {/* The bottom line, written out and read term by term: the positives
            among the sick, then among the healthy, each weighted by how
            common its group is. Those weights are where the base rate comes in. */}
        <Ink at={bottomAt - 2} dur={20} style={{ left: 900, top: y(668) }}>
          <span style={math(34)}>
            <P>
              <V>B</V>
            </P>{" "}
            ={" "}
            <Mark at={sickAt} out={weightedAt}>
              <P>
                <V>B</V>
                <Given />
                <V>A</V>
              </P>
            </Mark>{" "}
            <Labeled word="the base rate" at={baseAt} below color={INK} size={22}>
              <Mark at={weightedAt}>
                <P>
                  <V>A</V>
                </P>
              </Mark>
            </Labeled>{" "}
            +{" "}
            <Mark at={healthyAt} out={weightedAt}>
              <P>
                <V>B</V>
                <Given />
                not <V>A</V>
              </P>
            </Mark>{" "}
            <Labeled word="1 − the base rate" at={baseAt + 4} below color={INK} size={22}>
              <Mark at={weightedAt + 4}>
                <P>
                  not <V>A</V>
                </P>
              </Mark>
            </Labeled>
          </span>
        </Ink>
        <Note at={breaksAt} x={900} y={y(762)}>
          <span style={{ ...note(24, ACCENT_INK), fontWeight: 600, whiteSpace: "nowrap" }}>where intuition breaks</span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
