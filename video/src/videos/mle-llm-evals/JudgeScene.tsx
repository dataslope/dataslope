import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { I, MathRun } from "../../editorial/math";
import { INK, INK_SOFT, PAPER, label, note } from "../../editorial/style";
import { ColumnRule, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { POSITION, SOURCES } from "./data";
import {
  BAD_INK,
  Box,
  Clear,
  DATA,
  DATA_LIGHT,
  Drift,
  Fade,
  GOOD_INK,
  Line,
  Mark,
  MARK_BAD,
  pct,
  POINT,
  Spot,
  Tag,
  X0,
} from "./parts";

/** The bias rows and the fix beside each (layout units). */
const ROW = [404, 464, 524] as const;
const FIX_X = 980;
/** The two bars of the worked case. */
const BAR_X = 980;
const BAR_W = 780;
const BAR_H = 54;
const BAR_TOP = [418, 552] as const;

/** One bar of the case, split by winner, the first-shown answer on the
 *  left; its first segment underlined in yellow on `firstAt`. */
const SplitBar: React.FC<{
  top: number;
  at: number;
  firstAt: number;
  title: string;
  segs: readonly { who: "A" | "B"; share: number }[];
}> = ({ top, at, firstAt, title, segs }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 18);
  const u = ease(frame, firstAt, 12);
  if (p <= 0) return null;
  let left = 0;
  return (
    <>
      <div style={{ position: "absolute", left: BAR_X, top: top - 40, ...label(22, INK), opacity: ease(frame, at - 4, 10) }}>{title}</div>
      {segs.map((s, i) => {
        const x = left;
        left += s.share;
        const fill = s.who === "A" ? DATA : DATA_LIGHT;
        return (
          <div
            key={s.who}
            style={{
              position: "absolute",
              left: BAR_X + x * BAR_W * p,
              top,
              width: s.share * BAR_W * p - (i === 0 ? 3 : 0),
              height: BAR_H,
              background: fill,
              borderRadius: i === 0 ? "5px 0 0 5px" : "0 5px 5px 0",
              display: "flex",
              alignItems: "center",
              paddingLeft: 16,
              boxSizing: "border-box",
              overflow: "hidden",
            }}
          >
            <span style={{ ...note(24, s.who === "A" ? PAPER : INK), fontWeight: 600, whiteSpace: "nowrap", opacity: ease(frame, at + 12 + i * 6, 10) }}>
              {s.who} <Num>{pct(s.share)}</Num>
            </span>
          </div>
        );
      })}
      {u > 0 ? (
        <div style={{ position: "absolute", left: BAR_X, top: top + BAR_H + 7, width: (segs[0].share * BAR_W - 3) * u, height: 6, borderRadius: 3, background: POINT }} />
      ) : null}
    </>
  );
};

/**
 * Question 2. The answer first ("only after you've measured it"), then the
 * three biases Zheng and colleagues tested, each named as said, the third
 * marked inconclusive in grey as the page now says. The
 * page's position case worked in numbers: two bars split by winner, A in the
 * data blue and B in its light step in both, the first-shown share underlined
 * in yellow, so the eye sees the first-shown answer win about two thirds of
 * each bar while the winner changes. What it means (at least 35% of the
 * verdicts flipped, and the arithmetic). Then each bias's fix in green
 * beside it, the calibration against experts and the bar it has to clear
 * (the experts' agreement with each other), and the judge relabelled when
 * it changes.
 */
export const JudgeScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  const from = n.beat("q2").from;
  const qAt = n.word("q2", "Question two");
  const textAt = n.word("q2", "When can you trust");
  const judgeAt = n.word("q2", "as a judge");
  const onlyAt = n.word("q2", "Only after");

  const zhengAt = n.word("q2-bias", "Zheng and colleagues");
  /** The page (after #746): the first two found clearly, the third
   *  inconclusive, so it reads as a guard, not a finding. */
  const unsureAt = n.word("q2-bias", "the third was inconclusive");
  const biases = [
    { name: "Position", rest: "the answer shown first", at: n.word("q2-bias", "position"), restAt: n.word("q2-bias", "the answer shown first") },
    { name: "Verbosity", rest: "the longer answer", at: n.word("q2-bias", "verbosity"), restAt: n.word("q2-bias", "the longer one") },
    {
      name: "Self-enhancement",
      rest: "its own answers",
      at: n.word("q2-bias", "self-enhancement"),
      restAt: n.word("q2-bias", "favoring its own answers"),
    },
  ];

  const numbersAt = n.word("q2-case", "position bias in numbers");
  const aFirstAt = n.word("q2-case", "shown first", { nth: 1 });
  const seventyAt = n.word("q2-case", "seventy percent");
  const rerunAt = n.word("q2-case", "Rerun every pair");
  const bFirstAt = n.word("q2-case", "shown first", { nth: 2 });
  const sixtyFiveAt = n.word("q2-case", "B wins sixty-five percent");

  const sameAt = n.word("q2-read", "The answers didn't change");
  const orderAt = n.word("q2-read", "only their order");
  const thirdsAt = n.word("q2-read", "about two thirds");
  const flipAt = n.word("q2-read", "at least thirty-five percent");

  const fixes = [
    { text: "Score both orders; count a win only when they agree", at: n.word("q2-fix", "score each pair in both orders") },
    { text: "A pass/fail rubric, not a score from 1 to 10", at: n.word("q2-fix", "a specific pass-fail rubric") },
    { text: "A judge from another model family", at: n.word("q2-fix", "a judge from a different model family") },
  ];
  const fixFrom = n.beat("q2-fix").from;

  const calAt = n.word("q2-cal", "calibrate it against people");
  const expertsAt = n.word("q2-cal", "Experts label a sample");
  const chanceAt = n.word("q2-cal", "corrected for chance");
  const kappaAt = n.word("q2-cal", "Cohen's kappa");
  const relyAt = n.word("q2-cal", "before you rely");
  /** The bar a calibrated judge has to clear: the experts' agreement with
   *  each other. */
  const barAt = n.word("q2-bar", "The bar");
  const wellAt = n.word("q2-bar", "about as well as");

  const changeAt = n.word("q2-again", "Change the judge's model");
  const newAt = n.word("q2-again", "a new instrument");
  const againAt = n.word("q2-again", "calibrate it again");
  const end = n.beat("q3-in").to;

  const ry = (i: number) => y(ROW[i]);
  const calY = y(668);
  const barY = calY + 104;
  const judgeBox = { cx: X0 + 160, cy: barY + 108, w: 320, h: 66 };
  const relabel = ease(frame, changeAt + 2, 12);

  return (
    <AbsoluteFill>
      <Sfx name="el-pop" at={judgeAt + 2} level={-30} />
      <Sfx name="el-pencil" at={onlyAt + 4} level={-36} />
      {biases.map((b) => (
        <Sfx key={b.name} name="el-tap" at={b.at} level={-31} />
      ))}
      <Sfx name="el-whoosh" at={aFirstAt - 6} level={-36} />
      <Sfx name="el-tap" at={seventyAt + 10} level={-31} />
      <Sfx name="el-whoosh" at={rerunAt + 2} level={-36} />
      <Sfx name="el-tap" at={sixtyFiveAt + 10} level={-31} />
      <Sfx name="el-pop" at={flipAt + 2} level={-31} />
      {fixes.map((f) => (
        <Sfx key={f.text} name="el-tap" at={f.at} level={-31} />
      ))}
      <Sfx name="el-pencil" at={kappaAt} level={-36} />
      <Sfx name="el-tap" at={barAt + 2} level={-32} />
      <Sfx name="el-pop" at={againAt + 2} level={-31} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={2} at={qAt - 4} textAt={textAt - 4} size={60}>
          When can you trust an LLM as a judge?
        </QuestionCard>
        <Spot id="mle-llm-evals-balance" at={judgeAt} left={1590} top={y(146)} width={180} height={171} />

        <Line x={X0} y={y(290)} at={onlyAt} size={30} weight={600} style={{ marginLeft: "-0.14em" }}>
          <Mark at={onlyAt + 6}>Only after you&apos;ve measured it</Mark>
        </Line>

        {/* The three biases, each named as said. */}
        {biases.map((b, i) => {
          const quiet = i === 2 ? ease(frame, unsureAt + 4, 14) : 0;
          const words = (
            <span style={{ color: quiet > 0 ? `color-mix(in srgb, ${INK_SOFT} ${Math.round(quiet * 100)}%, ${INK})` : undefined }}>
              <b>{b.name}:</b> <Fade at={b.restAt}>favors {b.rest}</Fade>
              {i === 2 ? (
                <span style={{ color: INK_SOFT, fontWeight: 500 }}>
                  <Fade at={unsureAt + 4}> · inconclusive</Fade>
                </span>
              ) : null}
            </span>
          );
          return (
            <Line key={b.name} x={X0} y={ry(i) - 17} at={b.at - 2} size={26} style={i === 0 ? { marginLeft: "-0.14em" } : undefined}>
              {i === 0 ? (
                <Mark at={numbersAt + 4} out={fixFrom}>
                  {words}
                </Mark>
              ) : (
                words
              )}
            </Line>
          );
        })}
        <Line x={X0} y={ry(2) + 44} at={zhengAt + 4} size={20} color={INK_SOFT} weight={500}>
          {SOURCES.judge}
        </Line>

        {/* The page's case: the same pairs in both orders. It clears in the
            pause before the fixes, so it is gone before the first one inks
            in where its bars were. */}
        <Clear at={fixFrom - 20}>
          <SplitBar
            top={y(BAR_TOP[0])}
            at={aFirstAt - 6}
            firstAt={aFirstAt + 6}
            title="A shown first"
            segs={[
              { who: "A", share: POSITION.aWinsAFirst },
              { who: "B", share: POSITION.bWinsAFirst },
            ]}
          />
          <SplitBar
            top={y(BAR_TOP[1])}
            at={rerunAt}
            firstAt={bFirstAt + 6}
            title="B shown first"
            segs={[
              { who: "B", share: POSITION.bWinsBFirst },
              { who: "A", share: POSITION.aWinsBFirst },
            ]}
          />
          <Line x={BAR_X} y={y(668)} at={sameAt} size={26} color={INK_SOFT}>
            Same answers, <Fade at={orderAt}>only the order changed</Fade>
          </Line>
          <Line x={BAR_X} y={y(668) + 52} at={thirdsAt - 4} size={28}>
            First shown wins{" "}
            <MathRun>
              ≈ <Num>2/3</Num>
            </MathRun>
          </Line>
          <Line x={BAR_X} y={y(668) + 108} at={flipAt} size={28} color={BAD_INK} weight={600}>
            <Mark at={flipAt + 8} color={MARK_BAD}>
              At least {pct(POSITION.flippedAtLeast)} of verdicts flipped
            </Mark>
          </Line>
          <Line x={BAR_X} y={y(668) + 160} at={flipAt + 14} size={22} color={INK_SOFT}>
            A&apos;s wins, shown first less shown second: {pct(POSITION.aWinsAFirst)} − {pct(POSITION.aWinsBFirst)} = {pct(POSITION.flippedAtLeast)}
          </Line>
        </Clear>

        {/* Each bias's fix, beside it. */}
        <ColumnRule x={FIX_X - 60} top={ry(0) - 20} height={ry(2) - ry(0) + 40} at={fixes[0].at} />
        {fixes.map((f, i) => (
          <Line key={f.text} x={FIX_X} y={ry(i) - 17} at={f.at} size={26} color={GOOD_INK}>
            {f.text}
          </Line>
        ))}

        {/* Calibrated against people, and again when it changes. */}
        <Line x={X0} y={calY} at={calAt} size={28}>
          Calibrate against experts: <Fade at={chanceAt}>agreement corrected for chance,</Fade>{" "}
          <Fade at={kappaAt}>
            Cohen&apos;s{" "}
            <MathRun>
              <I>κ</I>
            </MathRun>
          </Fade>
        </Line>
        <Line x={X0} y={calY + 54} at={expertsAt + 4} size={22} color={INK_SOFT}>
          Worked through on the Data Scientist track
        </Line>
        <Line x={X0} y={barY} at={barAt} size={26}>
          The bar: <Fade at={barAt + 8}>judge–expert agreement</Fade>{" "}
          <Fade at={wellAt}>
            <MathRun>≈</MathRun> expert–expert agreement
          </Fade>
        </Line>
        <Box
          r={judgeBox}
          at={relyAt - 6}
          title={
            <span style={{ position: "relative", display: "inline-block" }}>
              <span style={{ opacity: 1 - relabel }}>LLM judge, calibrated</span>
              <span style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", whiteSpace: "nowrap", opacity: relabel }}>
                New model or rubric
              </span>
            </span>
          }
          size={24}
          tones={[{ at: newAt, tone: "lit" }]}
        />
        <div style={{ position: "absolute", left: judgeBox.cx + judgeBox.w / 2 + 40, top: judgeBox.cy - 19, fontSize: 26 }}>
          <Tag at={againAt} tone="yellow" tinted size={26}>
            Recalibrate
          </Tag>
        </div>
      </Drift>
    </AbsoluteFill>
  );
};
