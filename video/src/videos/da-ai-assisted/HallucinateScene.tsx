import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, INK, INK_SOFT, body, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { Drift, FlexRule, Mark, MARK_OK, OK_INK, Strike, X0 } from "./parts";

const KINDS_Y = 350;
/** The three kinds run from X0 to here, a hairline centred in each gap. */
const KINDS_R = 1720;
const REPORT_Y = 470;
const RULE_Y = 760;

/**
 * Question 4. The three kinds of unsupported claim, each a column of red
 * text as it is named; then the page's own example sentence, under the name
 * of the weekly report it comes from, its measured drop marked as traced to a query and its "because"
 * struck as a guess until timing and segments are checked; then the rule
 * that keeps both apart, and never lets the model compute a number.
 */
export const HallucinateScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("hallucinate").from;
  const qAt = n.word("hallucinate", "Question");
  const textAt = n.word("hallucinate", "What is a hallucinated insight");
  const claimAt = n.word("hallucinate-what", "a claim the data doesn't support");
  // The first line arrives as the question ends, so it never sits alone.
  const asked = n.beat("hallucinate").to;
  const kinds = [
    { at: n.word("hallucinate-what", "a trend that isn't there"), text: "A trend that isn't there" },
    { at: n.word("hallucinate-what", "a number nobody computed"), text: "A number nobody computed" },
    { at: n.word("hallucinate-what", "a cause stated as fact"), text: "A cause stated as fact" },
  ];
  const fluentAt = n.word("hallucinate-what", "writes fluent text");
  const exampleAt = n.word("hallucinate-example", "Signups fell");
  const confirmsAt = n.word("hallucinate-example", "Your query confirms");
  const guessAt = n.word("hallucinate-guess", "The because is a guess");
  const checkAt = n.word("hallucinate-guess", "did the drop start");
  const ruleAt = n.word("hallucinate-rule", "make it a rule");
  const tracesAt = n.word("hallucinate-rule", "traces to a query or a cell");
  const draftAt = n.word("hallucinate-draft", "Let the model draft words");
  const neverAt = n.word("hallucinate-draft", "never let it compute");
  const cutAt = n.word("hallucinate-draft", "Cut any cause");
  const end = n.beat("hallucinate-draft").to;

  const reportP = ease(frame, exampleAt - 6, 14);
  // The report's line: its source 12px over it, its two verdicts 26px under.
  const reportTop = y(REPORT_Y) + h(36);
  const verdictY = reportTop + 26 + 12 + 56 + 26;

  return (
    <AbsoluteFill>
      {kinds.map((k) => (
        <Sfx key={k.text} name="el-tap" at={k.at} level={-34} />
      ))}
      <Sfx name="el-pop" at={confirmsAt + 4} level={-32} />
      <Sfx name="el-scratch" at={guessAt + 4} level={-32} />
      <Sfx name="el-pencil" at={tracesAt} level={-34} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={4} at={qAt - 4} textAt={textAt - 4} size={60}>
          What is a hallucinated insight, and how do you keep one out of a report?
        </QuestionCard>

        {/* ── Three kinds of claim with nothing under them ── */}
        <Note at={Math.min(claimAt, asked) - 6} x={X0} y={y(KINDS_Y) - h(48)}>
          <span style={{ ...note(24, INK_SOFT), whiteSpace: "nowrap" }}>A claim the data doesn&apos;t support:</span>
        </Note>
        <div style={{ position: "absolute", left: X0, top: y(KINDS_Y), width: KINDS_R - X0, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          {kinds.map((k, i) => {
            const p = ease(frame, k.at - 2, 12);
            return (
              <React.Fragment key={k.text}>
                {i > 0 ? <FlexRule at={k.at - 2} /> : null}
                <div style={{ ...note(28, ACCENT_INK), fontWeight: 500, lineHeight: "36px", whiteSpace: "nowrap", opacity: p, transform: `translateY(${(1 - p) * 10}px)` }}>
                  {k.text}
                </div>
              </React.Fragment>
            );
          })}
        </div>
        <Note at={fluentAt - 2} x={X0} y={y(KINDS_Y) + h(66)}>
          <span style={{ ...note(23, INK_SOFT), whiteSpace: "nowrap" }}>A language model writes fluent text either way</span>
        </Note>

        {/* ── The page's example, as a line in a weekly report: its source
            over it, and the two verdicts on it under it ── */}
        <div
          style={{
            position: "absolute",
            left: X0,
            top: reportTop,
            opacity: reportP,
            transform: `translateY(${(1 - reportP) * 12}px)`,
          }}
        >
          <div style={{ ...label(20, INK_SOFT), lineHeight: "26px", whiteSpace: "nowrap" }}>Weekly summary, drafted by a model</div>
          <div style={{ ...body(44), color: INK, lineHeight: "56px", marginTop: 12, whiteSpace: "nowrap" }}>
            Signups <Mark at={confirmsAt + 2} color={MARK_OK}>fell 12%</Mark>{" "}
            {/* Set off from the highlight, so the strike starts on "because", not on its edge. */}
            <span style={{ marginLeft: "0.14em" }}>
              <Strike at={guessAt + 4} top="0.63em">
                because of the competitor&apos;s launch
              </Strike>
            </span>
            .
          </div>
        </div>
        <Note at={confirmsAt + 6} x={X0} y={verdictY}>
          <span style={{ ...note(24, OK_INK), fontWeight: 500, whiteSpace: "nowrap" }}>✓ your query confirms the 12%</span>
        </Note>
        <Note at={guessAt + 6} x={X0 + 526} y={verdictY}>
          <span style={{ ...note(24, ACCENT_INK), fontWeight: 500, whiteSpace: "nowrap" }}>
            The &ldquo;because&rdquo; is a guess
            <span style={{ opacity: ease(frame, checkAt - 2, 10) }}>: check the timing and the segments, or cut it</span>
          </span>
        </Note>

        {/* ── The rule ── */}
        <div
          style={{
            position: "absolute",
            left: X0,
            top: y(RULE_Y),
            opacity: ease(frame, ruleAt - 2, 12),
            transform: `translateY(${(1 - ease(frame, ruleAt - 2, 12)) * 10}px)`,
          }}
        >
          <span style={{ ...note(32, INK), fontWeight: 500, whiteSpace: "nowrap" }}>
            <Mark at={tracesAt}>Every number and every claim traces to a query or a cell.</Mark>
          </span>
          <div style={{ ...note(24, INK_SOFT), marginTop: 12, whiteSpace: "nowrap" }}>
            <span style={{ opacity: ease(frame, draftAt - 2, 10) }}>The model drafts the words around numbers you computed</span>
            <span style={{ opacity: ease(frame, neverAt - 2, 10) }}>, never the numbers</span>
            <span style={{ opacity: ease(frame, cutAt - 2, 10) }}>; untested causes come out</span>
          </div>
        </div>
      </Drift>
    </AbsoluteFill>
  );
};
