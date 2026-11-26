import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { BLUE_INK, HAIRLINE, INK, INK_SOFT, headline, label, note } from "../../editorial/style";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { partOf } from "./data";
import { Box, Drift, Flow, Kicker, Mark, PartsLabel, Spot } from "./parts";

/** The left column: what is still the core, a hairline, and what is added
 *  on top, as a numbered list. x in px, y in layout units (through y()). */
const COL_X = 120;
const COL_R = 1000;
const CORE_LABEL_Y = 187;
const CORE_Y = 218;
const RULE_Y = 296;
const ADDED_Y = 322;
const ITEM_Y = 380;
const ITEM_STEP = 101;
/** The numeral's column and the text after it. */
const ITEM_TEXT_X = 168;
/** One item's height in px: its title (28px) and the line under it (24px). */
const ITEM_H = 76;
const ASK_Y = 797;
/** The bracket that gathers the four, right of their longest line. */
const BRACKET_X = 790;
/** The figure on the right: the assistant over the stack of models from the
 *  hook, with metric definitions on top of it. The bubble (1024 by 818) is
 *  the scene's one spot, 200 by 160. */
const FIG_X = 1100;
const FIG_W = 300;
const BUBBLE_W = 200;
const BUBBLE_H = 160;
const BUBBLE_Y = 183;
const METRIC_Y = 420;
const METRIC_H = 56;
const MODEL_H = 52;
const GAP = 12;
/** The labels right of the figure, 80px clear of the bubble. */
const SIDE_X = FIG_X + FIG_W + 44;

type Topic = { n: number; title: string; at: number; sub: string; subAt: number };

/**
 * What AI has changed, answering "How has the Analytics Engineer interview
 * changed with AI?". On the left, the page's answer as a column: "Still the
 * core", with modeling, dbt and SQL as one line in the serif, then a hairline
 * and "Added on top". On the right, why: an ask-your-data assistant (the
 * speech bubble, the scene's one spot) over the stack of models from the
 * hook, an arrow down from it into the metric definitions on top of the
 * models, which are an analytics engineer's work. Then the four added topics
 * as a numbered list under "Added on top", each a short title and the words
 * its beat dwells on, the semantic layer lighting the metric definitions as
 * it is named; the advice to ask the recruiter; and a bracket that gathers
 * the four into Part 9.
 */
export const AiScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("ai").from;
  // The core and the stack ink on the scene's first words, so the cut never
  // leaves an empty page while "that core" points back at the probes.
  const coreAt = n.word("ai", "AI has added");
  const replacedAt = n.word("ai", "not replaced it");
  const core = [
    { text: "Modeling,", at: n.word("ai", "Modeling") },
    { text: "dbt,", at: n.word("ai", "dbt") },
    { text: "SQL", at: n.word("ai", "SQL") },
  ];
  const readerAt = n.word("ai-why", "a reader");
  const askDataAt = n.word("ai-why", "ask-your-data assistants");
  const metricAt = n.word("ai-why", "the metric definitions");
  const underAt = n.word("ai-why", "underneath it");
  const workAt = n.word("ai-why", "an analytics engineer's work");
  const fourAt = n.word("ai-four", "four more topics");
  const semanticAt = n.word("ai-sql", "a semantic layer");
  const roundsAt = n.word("ai-ask", "Some coding rounds");
  const askAt = n.word("ai-ask", "ask the recruiter");
  const moreAt = n.word("ai-more", "Part nine covers");
  const end = n.beat("ai-more").to;

  const topics: Topic[] = [
    {
      n: 1,
      title: "Text-to-SQL or a semantic layer",
      at: n.word("ai-sql", "Why text-to-SQL"),
      sub: "Confident wrong answers from raw tables",
      subAt: n.word("ai-sql", "confident wrong answers"),
    },
    {
      n: 2,
      title: "AI-ready modeling",
      at: n.word("ai-ready", "AI-ready modeling"),
      sub: "Docs, tests, access rules for a language model",
      subAt: n.word("ai-ready", "documentation"),
    },
    {
      n: 3,
      title: "Evaluating an assistant",
      at: n.word("ai-eval", "Evaluating an assistant"),
      sub: "Verified answers, and questions to decline",
      subAt: n.word("ai-eval", "answers you've verified"),
    },
    {
      n: 4,
      title: "Reviewing AI-written models",
      at: n.word("ai-review", "reviewing a dbt model"),
      sub: "Grain, incremental logic, duplicate metrics",
      subAt: n.word("ai-review", "its grain"),
    },
  ];

  const itemTop = (i: number) => y(ITEM_Y) + i * h(ITEM_STEP);
  const metricTop = y(METRIC_Y);
  const modelTop = (i: number) => metricTop + METRIC_H + GAP + (2 - i) * (MODEL_H + GAP);
  const bubbleTop = y(BUBBLE_Y);
  const cx = FIG_X + FIG_W / 2;
  const bracketTop = itemTop(0) + 4;
  const bracketBottom = itemTop(3) + ITEM_H - 4;
  const bracket = ease(frame, moreAt - 2, 16);

  return (
    <AbsoluteFill>
      {[0, 1, 2].map((i) => (
        <Sfx key={`m${i}`} name="el-tap" at={coreAt + 6 + i * 4} level={-36} />
      ))}
      {core.map((c) => (
        <Sfx key={c.text} name="el-tap" at={c.at} level={-33} />
      ))}
      <Sfx name="el-pencil" at={replacedAt} level={-36} />
      <Sfx name="el-pop" at={readerAt} level={-30} />
      <Sfx name="el-tap" at={metricAt} level={-32} />
      <Sfx name="el-pencil" at={underAt} level={-35} />
      {topics.map((t) => (
        <Sfx key={t.n} name="el-tap" at={t.at} level={-31} />
      ))}
      <Sfx name="el-pencil" at={askAt} level={-36} />
      <Sfx name="el-pencil" at={moreAt} level={-35} />

      <Drift from={from} to={end + 40} scale={0.015}>
        <Kicker at={from}>How AI has changed the interview</Kicker>

        {/* Still the core: one line, in the serif. */}
        <div style={{ position: "absolute", left: COL_X, top: y(CORE_LABEL_Y), ...label(24, INK_SOFT), whiteSpace: "nowrap", opacity: ease(frame, coreAt + 4, 12) }}>
          Still the core
        </div>
        <div style={{ position: "absolute", left: COL_X - 3, top: y(CORE_Y), ...headline(56), whiteSpace: "nowrap", display: "flex", gap: "0.24em" }}>
          {core.map((c) => (
            <span
              key={c.text}
              style={{ ...headline(56), opacity: ease(frame, c.at - 2, 12), transform: `translateY(${(1 - ease(frame, c.at - 2, 12)) * 8}px)` }}
            >
              {c.text}
            </span>
          ))}
        </div>

        {/* A hairline, and what is added on top. */}
        <div
          style={{
            position: "absolute",
            left: COL_X,
            top: y(RULE_Y),
            width: (COL_R - COL_X) * ease(frame, replacedAt - 2, 18),
            height: 1,
            background: HAIRLINE,
          }}
        />
        {/* "Added on top" waits for the list it heads ("So expect four more
            topics"), so it never stands over an empty column. */}
        <div style={{ position: "absolute", left: COL_X, top: y(ADDED_Y), ...label(24, INK_SOFT), whiteSpace: "nowrap", opacity: ease(frame, n.beat("ai-four").from - 4, 12) }}>
          <span style={{ marginLeft: "-0.14em" }}>
            <Mark at={fourAt} out={topics[0].at}>
              Added on top
            </Mark>
          </span>
        </div>

        {/* The four topics, one per beat. */}
        {topics.map((t, i) => {
          const q = ease(frame, t.at - 4, 14);
          if (q <= 0) return null;
          return (
            <div key={t.n} style={{ position: "absolute", left: COL_X, top: itemTop(i), opacity: q, transform: `translateY(${(1 - q) * -10}px)` }}>
              <div style={{ display: "flex", alignItems: "baseline", fontSize: 28 }}>
                <span style={{ ...note(28, BLUE_INK), width: ITEM_TEXT_X - COL_X, flex: "none" }}>{t.n}</span>
                <span style={{ ...note(28, INK), whiteSpace: "nowrap" }}>{t.title}</span>
              </div>
              <div style={{ ...note(24, INK_SOFT), marginTop: 8, marginLeft: ITEM_TEXT_X - COL_X, whiteSpace: "nowrap", opacity: ease(frame, t.subAt - 2, 12) }}>
                {t.sub}
              </div>
            </div>
          );
        })}

        {/* The page's pointer: Part 9 takes all four in depth. */}
        {bracket > 0 ? (
          <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
            <path
              d={`M${BRACKET_X - 14},${bracketTop} H${BRACKET_X} V${bracketBottom} H${BRACKET_X - 14}`}
              fill="none"
              stroke={INK_SOFT}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              pathLength={1}
              strokeDasharray={`${bracket} 1`}
            />
          </svg>
        ) : null}
        <div
          style={{
            position: "absolute",
            left: BRACKET_X + 30,
            top: (bracketTop + bracketBottom) / 2 - 18,
            ...label(26, BLUE_INK),
            lineHeight: "36px",
            whiteSpace: "nowrap",
            opacity: ease(frame, moreAt + 8, 12),
          }}
        >
          <PartsLabel parts={[partOf("ae-ai-semantic-layer")]} />
        </div>

        {/* Some rounds allow an assistant: ask about each. */}
        <div style={{ position: "absolute", left: COL_X, top: y(ASK_Y), ...note(26, INK), whiteSpace: "nowrap" }}>
          <span style={{ opacity: ease(frame, roundsAt - 2, 12) }}>Some coding rounds allow an assistant. </span>
          <span style={{ opacity: ease(frame, askAt - 2, 12) }}>
            <Mark at={askAt + 2} out={moreAt - 4}>
              Ask the recruiter, round by round.
            </Mark>
          </span>
        </div>

        {/* The figure: the models from the hook, then the assistant over
            them, reading through the metric definitions on top. */}
        {["Staging", "Intermediate", "Marts"].map((name, i) => (
          <Box key={name} x={FIG_X} y={modelTop(i)} w={FIG_W} h={MODEL_H} at={coreAt + 6 + i * 4}>
            {name}
          </Box>
        ))}
        <Box x={FIG_X} y={metricTop} w={FIG_W} h={METRIC_H} at={metricAt} markAt={semanticAt + 2} markOut={n.beat("ai-ready").from - 4}>
          Metric definitions
        </Box>
        <Spot id="ae-interview-assistant" at={readerAt} left={cx - BUBBLE_W / 2} top={bubbleTop} width={BUBBLE_W} height={BUBBLE_H} phase={30} amp={3} />
        <Flow
          // It leaves about 15px under the drawn bubble, which ends 30px
          // above its image's frame, so it reads as the assistant's.
          points={[
            [cx, bubbleTop + BUBBLE_H - 16],
            [cx, metricTop - 14],
          ]}
          at={underAt}
          dur={14}
        />
        <div
          style={{
            position: "absolute",
            left: SIDE_X,
            top: bubbleTop + BUBBLE_H / 2 - 16,
            ...note(24, INK_SOFT),
            whiteSpace: "nowrap",
            opacity: ease(frame, askDataAt - 2, 12),
          }}
        >
          Ask-your-data assistant
        </div>
        <div
          style={{
            position: "absolute",
            left: SIDE_X,
            top: metricTop + METRIC_H / 2 - 16,
            ...note(24, INK),
            whiteSpace: "nowrap",
            opacity: ease(frame, workAt - 2, 12),
          }}
        >
          <Mark at={workAt + 4} out={fourAt}>
            An analytics engineer&apos;s work
          </Mark>
        </div>
      </Drift>
    </AbsoluteFill>
  );
};
