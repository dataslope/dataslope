import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { OK, OK_INK, QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, HIGHLIGHT, INK, INK_SOFT, label, note } from "../../editorial/style";
import { Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { INGREDIENTS, PROMPT } from "./data";
import { ColumnRule, Drift, INGREDIENT_INK, ingredientBand, line, Mark, PromptListing, X0 } from "./parts";

const SIZE = 25;
const LABEL_Y = 350;
const LIST_Y = 392;
const BETTER_X = 610;
const LEFT_W = 420;

/** The page's fence, as it prints it: "Weak:" and "Better:" become the
 *  labels over each listing, and the hanging indent under "Better: " goes
 *  with them, so the lines break where the page breaks them. */
const WEAK = [PROMPT.fence[0].replace(/^Weak:\s+/, "")];
const BETTER = PROMPT.fence.slice(1).map((l) => l.slice("Better: ".length));
if (PROMPT.fence[1].slice(0, 8) !== "Better: " || BETTER.some((l, i) => i > 0 && PROMPT.fence[i + 1].slice(0, 8).trim() !== "")) {
  throw new Error("the page's better prompt is no longer printed under an 8-character hanging indent");
}
const span = (role: (typeof INGREDIENTS)[number]["role"], i = 0) => {
  const entry = INGREDIENTS.find((g) => g.role === role);
  if (!entry || !entry.spans[i]) throw new Error(`no ${role} span ${i}`);
  return entry.spans[i];
};
const SIXTY = "a request exactly 60 seconds after the first";
const ALLOWED = "(allowed: the first has left the window)";

/**
 * Question 3: what makes a good prompt. The page's four ingredients as four
 * colors, then its weak and better prompts side by side, as it prints them;
 * each span of the better one is marked in its ingredient's color as the
 * narration names it. Then the sixty-second case: the edge, and the answer the
 * prompt gives with it, which an assistant would otherwise choose for itself.
 */
export const PromptScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  const from = n.beat("prompt").from;
  const qAt = n.word("prompt", "Question three");
  const textAt = n.word("prompt", "What makes a good prompt");
  const ticketAt = n.word("prompt", "a good ticket for a teammate");
  const chips = [
    { role: "context", text: "context", at: n.word("prompt", "context") },
    { role: "interface", text: "an interface", at: n.word("prompt", "an interface") },
    { role: "constraints", text: "constraints", at: n.word("prompt", "constraints") },
    { role: "check", text: "a way to check the result", at: n.word("prompt", "a way to check the result") },
  ] as const;
  const weakAt = n.word("prompt-better", "The weak one");
  const wishAt = n.word("prompt-better", "is a wish");
  const betterAt = n.word("prompt-better", "The better prompt");
  const fileAt = n.word("prompt-better", "names the file");
  const fnAt = n.word("prompt-better", "and the function");
  const ruleAt = n.word("prompt-better", "it sets the rule");
  const memoryAt = n.word("prompt-better", "kept in memory");
  const mustAt = n.word("prompt-check", "what must not change");
  const testsAt = n.word("prompt-check", "asks for tests at the edges");
  const smallAt = n.word("prompt-small", "a smaller diff");
  const oneAt = n.word("prompt-small", "Ask for one change at a time");
  const noticeAt = n.word("prompt-past", "the sixty-second case");
  const allowedAt = n.word("prompt-past", "allowed, because the first request");
  const nameAt = n.word("prompt-past", "Name the answer");
  const otherwiseAt = n.word("prompt-past", "Otherwise the assistant decides");
  const agreesAt = n.word("prompt-past", "writes a test that agrees with itself");
  const end = n.beat("prompt-past").to;

  const listTop = y(LIST_Y);
  const lift = noticeAt - 6;
  const marks = [
    { span: span("context", 0), at: fileAt, color: ingredientBand("context"), out: lift },
    { span: span("interface"), at: fnAt, color: ingredientBand("interface"), out: lift },
    { span: span("context", 1), at: ruleAt, color: ingredientBand("context"), out: lift },
    { span: span("constraints", 0), at: memoryAt, color: ingredientBand("constraints"), out: lift },
    { span: span("constraints", 1), at: mustAt, color: ingredientBand("constraints"), out: lift },
    { span: span("check"), at: testsAt, color: ingredientBand("check"), out: lift },
    { span: SIXTY, at: noticeAt + 2, color: HIGHLIGHT },
    { span: ALLOWED, at: allowedAt, color: `color-mix(in srgb, ${OK} 28%, transparent)` },
  ];

  return (
    <AbsoluteFill>
      {chips.map((c) => (
        <Sfx key={c.role} name="el-tap" at={c.at} level={-33} />
      ))}
      <Sfx name="el-pencil" at={weakAt} level={-35} />
      <Sfx name="el-pencil" at={betterAt} level={-35} />
      {[fileAt, fnAt, ruleAt, memoryAt, mustAt, testsAt].map((at) => (
        <Sfx key={at} name="el-tap" at={at + 2} level={-36} />
      ))}
      <Sfx name="el-tap" at={noticeAt + 2} level={-32} />
      <Sfx name="el-tap" at={allowedAt} level={-31} />
      <Sfx name="el-scratch" at={agreesAt + 4} level={-34} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={3} at={qAt - 4} textAt={textAt - 4} size={58}>
          What makes a good prompt to a coding assistant?
        </QuestionCard>

        {/* The four ingredients, a color each. */}
        <div style={{ position: "absolute", left: X0, top: y(262), display: "flex", alignItems: "center", gap: 14, fontSize: 24 }}>
          <span style={{ ...note(24, INK_SOFT), fontWeight: 600, whiteSpace: "nowrap", opacity: ease(frame, ticketAt - 2, 12) }}>
            What a good ticket for a teammate has:
          </span>
          {chips.map((c) => {
            const p = ease(frame, c.at - 2, 12);
            return (
              <span
                key={c.role}
                style={{
                  padding: "5px 13px",
                  borderRadius: 8,
                  background: ingredientBand(c.role),
                  ...note(24, INGREDIENT_INK[c.role]),
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                  opacity: p,
                  transform: `translateY(${(1 - p) * 10}px)`,
                }}
              >
                {c.text}
              </span>
            );
          })}
        </div>

        {/* Weak and better, side by side. */}
        <Ink at={weakAt - 2} dur={12} style={{ left: X0, top: y(LABEL_Y) }}>
          <span style={{ ...label(23, ACCENT_INK), fontWeight: 750 }}>Weak</span>
        </Ink>
        <PromptListing lines={WEAK} x={X0} top={listTop} width={LEFT_W} size={SIZE} at={weakAt} />
        <Note at={wishAt} x={X0} y={listTop + 104}>
          <span style={line(26, ACCENT_INK)}>
            <b>a wish</b>
          </span>
        </Note>
        <ColumnRule x={(X0 + LEFT_W + BETTER_X) / 2} top={y(LABEL_Y)} height={y(744) + 100 - y(LABEL_Y)} at={betterAt} />
        <Ink at={betterAt - 2} dur={12} style={{ left: BETTER_X, top: y(LABEL_Y) }}>
          <span style={{ ...label(23, OK_INK), fontWeight: 750 }}>Better</span>
        </Ink>
        <PromptListing lines={BETTER} x={BETTER_X} top={listTop} width={1140} size={SIZE} at={betterAt} marks={marks} />

        <Note at={smallAt - 2} x={BETTER_X} y={y(722)}>
          <span style={line(26, INK)}>
            A smaller diff, easier to review.{" "}
            <span style={{ opacity: ease(frame, oneAt - 2, 10) }}>
              <Mark at={oneAt + 6}>Ask for one change at a time.</Mark>
            </span>
          </span>
        </Note>

        {/* The sixty-second case: the edge, and its answer. */}
        <Note at={noticeAt} x={X0} y={y(566)} width={LEFT_W}>
          <div style={{ ...note(25, INK), lineHeight: 1.35 }}>
            <Mark at={noticeAt + 6}>The edge</Mark> comes with <b style={{ color: OK_INK }}>its answer.</b>
          </div>
        </Note>
        <Note at={nameAt - 2} x={X0} y={y(650)} width={LEFT_W}>
          <div style={{ ...note(25, INK), fontWeight: 700, lineHeight: 1.35 }}>
            Name the answer,
            <br />
            not just the edge.
          </div>
        </Note>
        <Note at={otherwiseAt - 2} x={X0} y={y(744)} width={LEFT_W}>
          <div style={{ ...note(25, ACCENT_INK), lineHeight: 1.35 }}>
            Left out, the assistant decides: inside the window, or out?
            <span style={{ opacity: ease(frame, agreesAt - 2, 10) }}> And its test agrees with itself.</span>
          </div>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
