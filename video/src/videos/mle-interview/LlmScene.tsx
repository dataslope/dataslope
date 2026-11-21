import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { headline, INK, INK_SOFT, label, note } from "../../editorial/style";
import { Badge } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { SANS } from "../../theme/fonts";
import { ADDED, STILL_ASKED } from "./data";
import { Drift, Headline, Kicker, LEFT_X, Mark, PartTag, RIGHT_X, Rule, Settle, Topics } from "./parts";

/** Layout units down. The line of what is still asked under the headline,
 *  then the four additions as a numbered list, then the recruiter. */
const STILL_Y = 244;
const LIST_Y = 316;
const ROW_STEP = 116;
const ASK_Y = LIST_Y + 4 * ROW_STEP - 6;
/** px: the numeral's disc, and where each item's words start beside it. */
const NAME_SIZE = 28;
const TEXT_X = LEFT_X + 64;
const TOPICS_DY = 50;

type Topic = { text: string; at: number };

/** In px, from a still-asked row's rule: its name in the serif, the size of
 *  the hook's prompts, and the part that answers it at the right end. */
const STILL_SIZE = 44;
const STILL_DY = 30;

/** One of the things still asked, while the narration lists them: a ruled
 *  row in the slot an addition takes next, its name inking as it is said
 *  and the part that answers it at the right end. The four leave together
 *  on `out`, rising, as they condense into the line under the headline. */
const StillRow: React.FC<{ top: number; name: string; at: number; out: number; parts: readonly number[] }> = ({ top, name, at, out, parts }) => {
  const frame = useCurrentFrame();
  const gone = ease(frame, out, 14);
  if (gone >= 1) return null;
  return (
    <div style={{ position: "absolute", inset: 0, opacity: 1 - gone, transform: `translateY(${-24 * gone}px)` }}>
      <Rule at={at - 6} top={top} />
      <Settle at={at} top={top + STILL_DY} width={RIGHT_X - LEFT_X}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ ...headline(STILL_SIZE), whiteSpace: "nowrap" }}>{name}</span>
          <PartTag parts={parts} at={at + 12} />
        </div>
      </Settle>
    </div>
  );
};

/** One addition: its numeral in a tinted disc, its name lit yellow while it
 *  is read, the parts that answer it at the right end, and its topics under
 *  the name, word by word. */
const Item: React.FC<{ i: number; top: number; name: string; at: number; litOut: number; topics: Topic[]; parts: readonly number[] }> = ({
  i,
  top,
  name,
  at,
  litOut,
  topics,
  parts,
}) => (
  <>
    <Settle at={at} top={top} width={RIGHT_X - LEFT_X}>
      <div style={{ display: "flex", alignItems: "center" }}>
        <Badge tone="gray" size={NAME_SIZE} style={{ width: 44, height: 44, padding: 0, display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: "50%", fontFamily: SANS, fontWeight: 600 }}>
          {i + 1}
        </Badge>
        <span style={{ ...note(NAME_SIZE, INK), fontWeight: 600, whiteSpace: "nowrap", marginLeft: 20 - 0.14 * NAME_SIZE, flex: 1 }}>
          <Mark at={at} out={litOut}>
            {name}
          </Mark>
        </span>
        <PartTag parts={parts} at={at + 14} />
      </div>
    </Settle>
    {topics.length ? (
      <Settle at={topics[0].at} top={top + TOPICS_DY} left={TEXT_X}>
        <Topics items={topics} />
      </Settle>
    ) : null}
  </>
);

/**
 * How LLMs changed the interview, answering the LLM page's "How has the ML
 * Engineer interview changed with LLMs?": the headline says classical ML
 * didn't leave, and what is still asked fills the page as a ruled list while
 * it is said, each with the part that answers it; as the narration turns to
 * what LLMs added, the four condense into one line under the headline, and
 * the page's four additions take their slots as a numbered list, each with its topics as the
 * narration names them and the parts that answer it (retrieval in 6, the
 * rest of application design in 10; the economics in 9; evaluation and when
 * not to use one in 10). Last, under the list, the index's note on AI-on
 * coding rounds and its advice: ask the recruiter about each round.
 */
export const LlmScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("llm").from;
  const leaveAt = n.word("llm", "Classical ML didn't leave");
  const addedAt = n.word("llm", "What LLMs added");
  const stillAt = [n.word("llm", "bias and variance"), n.word("llm", "leakage"), n.word("llm", "metrics"), n.word("llm", "a coding round")];
  // The line under the headline says them again in the flow of a sentence,
  // so lowercase: "Still asked: bias and variance, leakage, ...".
  const still: Topic[] = STILL_ASKED.map((s, i) => ({ text: s.name[0].toLowerCase() + s.name.slice(1), at: addedAt + i * 3 }));
  // The rows give way to the line as the narration turns to what was added.
  const stillOut = addedAt - 6;
  const nameAt = [
    n.word("llm-design", "Application design"),
    n.word("llm-econ", "Inference economics"),
    n.word("llm-eval", "Evaluation with no single right answer"),
    n.word("llm-not", "when not to use an LLM"),
  ];
  const topics: Topic[][] = [
    [
      { text: "retrieval", at: n.word("llm-design", "retrieval") },
      { text: "prompting", at: n.word("llm-design", "prompting") },
      { text: "tool use", at: n.word("llm-design", "tool use") },
      { text: "guardrails and fallbacks", at: n.word("llm-design", "guardrails and fallbacks") },
      { text: "drawn as a system with latency and cost budgets", at: n.word("llm-design", "drawn as a system") },
    ],
    [
      { text: "why generation is slow", at: n.word("llm-econ", "why generation is slow") },
      { text: "where the GPU memory goes", at: n.word("llm-econ", "where the GPU memory goes") },
      { text: "which lever buys what", at: n.word("llm-econ", "which lever buys what") },
    ],
    [
      { text: "building a test set", at: n.word("llm-eval", "building a test set") },
      { text: "trusting or distrusting an automated judge", at: n.word("llm-eval", "trusting or distrusting") },
      { text: "tying offline scores to online outcomes", at: n.word("llm-eval", "tying offline scores") },
    ],
    [],
  ];
  const someAt = n.word("llm-ask", "Some companies also run coding rounds");
  const askAt = n.word("llm-ask", "ask the recruiter");
  const end = n.beat("llm-ask").to;
  // Each name keeps the highlighter until the next is read; the last gives
  // it up as the recruiter line arrives.
  const litOut = [nameAt[1], nameAt[2], nameAt[3], someAt];

  return (
    <AbsoluteFill>
      {stillAt.map((at) => (
        <Sfx key={at} name="el-tap" at={at} level={-32} />
      ))}
      <Sfx name="el-whoosh" at={stillOut} level={-37} />
      {nameAt.map((at) => (
        <Sfx key={at} name="el-tap" at={at} level={-30} />
      ))}
      <Sfx name="el-tap" at={someAt} level={-33} />
      <Sfx name="el-pencil" at={askAt} level={-35} />

      <Drift from={from} to={end + 40} scale={0.015}>
        <Kicker at={from}>What LLMs changed</Kicker>
        <Headline lead="Classical ML didn’t leave." turn="LLMs added four things." at={leaveAt} turnAt={addedAt} size={62} />
        <div style={{ position: "absolute", left: LEFT_X, top: y(STILL_Y), display: "flex", gap: "0.3em", fontSize: 26, whiteSpace: "nowrap" }}>
          <span style={{ ...label(26, INK_SOFT), opacity: ease(frame, addedAt - 4, 10) }}>Still asked:</span>
          <Topics items={still} size={26} />
        </div>

        {STILL_ASKED.map((s, i) => (
          <StillRow key={s.name} top={y(LIST_Y) + i * h(ROW_STEP)} name={s.name} at={stillAt[i]} out={stillOut} parts={s.parts} />
        ))}

        {ADDED.map((a, i) => (
          <Item key={a.name} i={i} top={y(LIST_Y) + i * h(ROW_STEP)} name={a.name} at={nameAt[i]} litOut={litOut[i]} topics={topics[i]} parts={a.parts} />
        ))}

        <Settle at={someAt} top={y(ASK_Y)}>
          <div style={{ ...label(24, INK_SOFT), whiteSpace: "nowrap" }}>AI-on coding rounds at some companies</div>
        </Settle>
        <Settle at={askAt} top={y(ASK_Y) + 44}>
          <div style={{ ...note(30, INK), fontWeight: 600, whiteSpace: "nowrap", marginLeft: "-0.14em" }}>
            <Mark at={askAt + 6}>Ask the recruiter about each round</Mark>
          </div>
        </Settle>
      </Drift>
    </AbsoluteFill>
  );
};
