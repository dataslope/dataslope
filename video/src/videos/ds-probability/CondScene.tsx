import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BLUE_INK, HIGHLIGHT, INK, INK_SOFT, PAPER, note } from "../../editorial/style";
import { Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { COND } from "./data";
import { DieFace, Drift, Frac, Given, Labeled, Mark, MARK_OK, math, OK, OK_INK, pulse, Strike, V, X0 } from "./parts";

const DIE = { size: 110, pitch: 140, y: 470 };
const RULE_X = 1080;

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
  const threeAt = n.word("cond-die", "Three faces are left");
  const sixAt = n.word("cond-die", "the chance of a six");
  const notAt = n.word("cond-die", "not one in six");
  const symbolsAt = n.word("cond-rule", "In symbols");
  const shrinkAt = n.word("cond-rule", "shrink the world");
  const measureAt = n.word("cond-rule", "measure again");
  const q2At = n.word("bayes", "Question two");
  const q2TextAt = n.word("bayes", "State Bayes' theorem");
  const turnsAt = n.word("bayes", "It turns");
  const bGivenAAt = n.word("bayes", "the probability of B given A");
  const aGivenBAt = n.word("bayes", "into A given B");
  const likelihoodAt = n.word("bayes", "the likelihood");
  const priorAt = n.word("bayes", "the prior");
  const evidenceAt = n.word("bayes", "evidence");
  const knowAt = n.word("bayes-when", "you know how a test behaves");
  const wantAt = n.word("bayes-when", "you want the chance");
  const baseAt = n.word("bayes-when", "The base rate");
  const bottomAt = n.word("bayes-when", "that bottom line");
  const breaksAt = n.word("bayes-when", "intuition breaks");
  const end = n.beat("test-in").to;

  const out1 = q2At - 4;
  const odd = ease(frame, evenAt, 14);
  const evenLit = ease(frame, threeAt, 12);
  const sixLit = ease(frame, sixAt, 12);
  const formulaY = y(330);

  return (
    <AbsoluteFill>
      <Sfx name="pip-3" at={rollAt + 2} level={-30} />
      <Sfx name="el-tap" at={evenAt + 2} level={-34} />
      <Sfx name="el-pop" at={sixAt + 4} level={-32} />
      <Sfx name="el-pencil" at={symbolsAt + 2} level={-34} />
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
        <Note at={rollAt + 16} x={X0} y={y(DIE.y + DIE.size + 34)} out={out1}>
          <span style={math(38)}>
            <P>six</P> = <Strike at={notAt} color={ACCENT}>1/6</Strike>
          </span>
        </Note>
        <Note at={sixAt + 2} x={X0} y={y(DIE.y + DIE.size + 96)} out={out1}>
          <span style={math(38, OK_INK)}>
            <P>
              six
              <Given />
              even
            </P>{" "}
            = {COND.pSixGivenEven}
          </span>
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
                  <Labeled word="prior" at={priorAt}>
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

        {/* What you know, and what you want. */}
        <Note at={knowAt + 2} x={X0} y={y(650)}>
          <span style={{ ...note(26, INK_SOFT), whiteSpace: "nowrap" }}>you know </span>
          <span style={math(36, BLUE_INK)}>
            <P>
              positive
              <Given />
              disease
            </P>
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

        {/* The bottom line, written out: where the base rate comes in. */}
        <Ink at={bottomAt - 4} dur={20} style={{ left: 900, top: y(668) }}>
          <span style={math(34)}>
            <P>
              <V>B</V>
            </P>{" "}
            ={" "}
            <P>
              <V>B</V>
              <Given />
              <V>A</V>
            </P>{" "}
            <Mark at={baseAt + 4}>
              <P>
                <V>A</V>
              </P>
            </Mark>{" "}
            +{" "}
            <P>
              <V>B</V>
              <Given />
              not <V>A</V>
            </P>{" "}
            <Mark at={baseAt + 8}>
              <P>
                not <V>A</V>
              </P>
            </Mark>
          </span>
        </Ink>
        <Note at={baseAt + 10} x={900} y={y(740)}>
          <span style={{ ...note(24, INK), fontWeight: 600, whiteSpace: "nowrap" }}>the base rate</span>
        </Note>
        <Note at={breaksAt} x={1070} y={y(740)}>
          <span style={{ ...note(24, ACCENT_INK), fontWeight: 600, whiteSpace: "nowrap" }}>where intuition breaks</span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
