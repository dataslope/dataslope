import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, HAIRLINE, INK, INK_SOFT, PAPER, body, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { Drift, Mark, MARK_OK, OK_INK, Strike, X0 } from "./parts";

const KINDS_Y = 350;
const REPORT_Y = 470;
const RULE_Y = 760;
const KIND_W = 540;

/**
 * Question 4. The three kinds of unsupported claim, each a card as it is
 * named; then the page's own example sentence, set like a line in a weekly
 * report, its measured drop marked as traced to a query and its "because"
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
    { at: n.word("hallucinate-what", "a trend that isn't there"), text: "a trend that isn't there" },
    { at: n.word("hallucinate-what", "a number nobody computed"), text: "a number nobody computed" },
    { at: n.word("hallucinate-what", "a cause stated as fact"), text: "a cause stated as fact" },
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
          <span style={{ ...note(24, INK_SOFT), whiteSpace: "nowrap" }}>a claim the data doesn&apos;t support:</span>
        </Note>
        {kinds.map((k, i) => {
          const p = ease(frame, k.at - 2, 12);
          if (p <= 0) return null;
          return (
            <div
              key={k.text}
              style={{
                position: "absolute",
                left: X0 + i * (KIND_W + 30),
                top: y(KINDS_Y),
                width: KIND_W,
                padding: "14px 20px",
                boxSizing: "border-box",
                borderLeft: `4px solid ${ACCENT}`,
                background: `color-mix(in srgb, ${ACCENT} 7%, ${PAPER})`,
                ...note(28, INK),
                opacity: p,
                transform: `translateY(${(1 - p) * 10}px)`,
              }}
            >
              {k.text}
            </div>
          );
        })}
        <Note at={fluentAt - 2} x={X0} y={y(KINDS_Y) + h(80)}>
          <span style={{ ...note(23, INK_SOFT), whiteSpace: "nowrap" }}>a language model writes fluent text either way</span>
        </Note>

        {/* ── The page's example, as a line in a weekly report ── */}
        <div
          style={{
            position: "absolute",
            left: X0,
            top: y(REPORT_Y),
            width: 1680,
            padding: "26px 34px",
            boxSizing: "border-box",
            border: `1.5px solid ${HAIRLINE}`,
            borderRadius: 10,
            background: PAPER,
            boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
            opacity: reportP,
            transform: `translateY(${(1 - reportP) * 12}px)`,
          }}
        >
          <div style={{ ...label(20, INK_SOFT), marginBottom: 10 }}>Weekly summary, drafted by a model</div>
          <div style={{ ...body(44), color: INK, whiteSpace: "nowrap" }}>
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
        <Note at={confirmsAt + 6} x={X0 + 34} y={y(REPORT_Y) + h(190)}>
          <span style={{ ...note(24, OK_INK), fontWeight: 650, whiteSpace: "nowrap" }}>✓ your query confirms the 12%</span>
        </Note>
        <Note at={guessAt + 6} x={X0 + 560} y={y(REPORT_Y) + h(190)}>
          <span style={{ ...note(24, ACCENT_INK), fontWeight: 650, whiteSpace: "nowrap" }}>
            the &ldquo;because&rdquo; is a guess
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
          <span style={{ ...note(32, INK), fontWeight: 650, whiteSpace: "nowrap" }}>
            <Mark at={tracesAt}>Every number and every claim traces to a query or a cell.</Mark>
          </span>
          <div style={{ ...note(24, INK_SOFT), marginTop: 12, whiteSpace: "nowrap" }}>
            <span style={{ opacity: ease(frame, draftAt - 2, 10) }}>the model drafts the words around numbers you computed</span>
            <span style={{ opacity: ease(frame, neverAt - 2, 10) }}>, never the numbers</span>
            <span style={{ opacity: ease(frame, cutAt - 2, 10) }}>; untested causes come out</span>
          </div>
        </div>
      </Drift>
    </AbsoluteFill>
  );
};
