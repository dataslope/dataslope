import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { INK, INK_SOFT, label, note, TABULAR } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { int, THINKING } from "./data";
import {
  Chip,
  FIG_Y,
  HBar,
  Headline,
  INPUT,
  INPUT_INK,
  Kicker,
  OUTPUT,
  OUTPUT_INK,
  pulse,
  Spot,
  TAGS,
  THINK_FILL,
  VBracket,
  X0,
} from "./parts";

/** Fig. 1's request: estimating-cost's thinking block at its 2,000-token
 *  budget, which Fig. 9 grows. */
const ROWS = [
  { verb: "reads", what: "your prompt", tokens: THINKING.in, fill: INPUT, ink: INPUT_INK },
  { verb: "writes", what: "the answer", tokens: THINKING.visible, fill: OUTPUT, ink: OUTPUT_INK },
  { verb: "thinks", what: "its reasoning", tokens: THINKING.rows[2].thinking, fill: THINK_FILL, ink: OUTPUT_INK },
] as const;
const ROW_Y = [404, 520, 636];
const BAR_X = 430;
const PX_PER_TOKEN = 0.33;
const BAR_H = 54;
const ASK_X = 1590;

/**
 * Part 1 opens on the idea Unit 3 closed on: every token the model reads,
 * writes or thinks is billed. One request drawn as its three kinds of token,
 * each bar growing as its verb is spoken, then the question the part answers.
 */
export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const hookFrom = n.beat("hook").from;
  const tokenAt = n.word("hook", "token");
  const readsAt = n.word("hook", "reads");
  const writesAt = n.word("hook", "writes");
  const thinksAt = n.word("hook", "thinks");
  const billAt = n.word("hook", "bill");
  const promptAt = n.word("kinds", "prompt");
  const answerAt = n.word("kinds", "answer");
  const thinkingAt = n.word("kinds", "thinking");
  const writtenAt = n.word("kinds", "written");
  const neverAt = n.word("kinds", "never");
  const costAt = n.word("ask", "cost");
  const actuallyAt = n.word("ask", "actually");

  const grow = [readsAt, writesAt, thinksAt];
  const named = [promptAt, answerAt, thinkingAt];
  const w = (tokens: number) => tokens * PX_PER_TOKEN;

  return (
    <AbsoluteFill>
      {/* ── Sound: the three bars, the tags, the bracket, the question ── */}
      {grow.map((at, i) => (
        <Sfx key={i} name="el-tap" at={at - 2} level={-25} />
      ))}
      <Sfx name="el-pop" at={billAt - 6} level={-30} />
      <Sfx name="el-pencil" at={writtenAt - 2} level={-35} />
      <Sfx name="el-tap" at={costAt - 4} level={-28} />

      <Kicker at={hookFrom - 10}>The price sheet</Kicker>
      <Headline at={hookFrom - 6} second={billAt - 6} italic="ends up on a bill.">
        Every token
      </Headline>
      <Spot id="tags" at={billAt - 6} left={TAGS.left} top={y(TAGS.top)} width={TAGS.width} height={TAGS.height} />

      <FigLabel n="1" title="One request, three kinds of token" at={tokenAt - 4} x={X0} y={y(FIG_Y)} />

      {ROWS.map((r, i) => {
        const ry = y(ROW_Y[i]);
        const lit = pulse(frame, named[i] - 2, 22);
        return (
          <React.Fragment key={r.verb}>
            <Ink at={grow[i] - 6} dur={12} style={{ left: X0, top: ry - 6, whiteSpace: "nowrap" }}>
              <span style={{ ...label(32, r.ink), fontWeight: 700 }}>{r.verb}</span>
            </Ink>
            <Ink at={named[i] - 4} dur={14} style={{ left: X0, top: ry + 38, whiteSpace: "nowrap" }}>
              <span style={{ ...note(23, INK_SOFT) }}>{r.what}</span>
            </Ink>
            <HBar
              x={BAR_X}
              y={ry + 6}
              w={w(r.tokens)}
              h={h(BAR_H)}
              at={grow[i] - 4}
              dur={16}
              fill={r.fill}
              style={{ transform: `scaleY(${1 + lit * 0.12})` }}
            />
            <Note at={grow[i] + 6} x={BAR_X + w(r.tokens) + 18} y={ry + 6 + h(BAR_H) / 2 - 16}>
              <span style={{ ...note(25, INK), ...TABULAR, whiteSpace: "nowrap" }}>{int(r.tokens)} tokens</span>
            </Note>
            {/* What each one costs: the question the part answers. */}
            <Note at={costAt - 4 + i * 4} x={ASK_X} y={ry + 6 + h(BAR_H) / 2 - 22}>
              <Chip piece="$ ?" color={INK_SOFT} size={24} glow={pulse(frame, actuallyAt + i * 5, 20)} />
            </Note>
          </React.Fragment>
        );
      })}

      {/* Thinking is written too: the two written rows bracketed together. */}
      <VBracket
        x={BAR_X + w(ROWS[2].tokens) + 190}
        y0={y(ROW_Y[1]) + 10}
        y1={y(ROW_Y[2]) + 6 + h(BAR_H) - 4}
        at={writtenAt - 2}
        color={OUTPUT_INK}
        right={false}
      />
      <Note at={writtenAt + 2} x={BAR_X + w(ROWS[2].tokens) + 206} y={(y(ROW_Y[1]) + y(ROW_Y[2])) / 2 + h(BAR_H) / 2 - 12}>
        <span style={{ ...note(24, OUTPUT_INK), fontWeight: 600, whiteSpace: "nowrap" }}>both written</span>
      </Note>
      {/* …though only one of them reaches you. */}
      <div
        style={{
          position: "absolute",
          left: BAR_X - 5,
          top: y(ROW_Y[2]) + 1,
          width: w(ROWS[2].tokens) + 10,
          height: h(BAR_H) + 10,
          borderRadius: 6,
          border: `2px dashed ${INK}`,
          opacity: ease(frame, neverAt - 2, 12) * 0.7,
        }}
      />
      <Note at={neverAt + 2} x={BAR_X} y={y(ROW_Y[2]) + h(BAR_H) + 30}>
        <span style={{ ...note(23, INK_SOFT), whiteSpace: "nowrap" }}>never shown to you</span>
      </Note>
    </AbsoluteFill>
  );
};
