import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { RapidFire, type RapidItem } from "../../editorial/interview";
import { type Layout, useLayout } from "../../editorial/layout";
import { ACCENT_INK, BLUE_INK, HAIRLINE, HIGHLIGHT, INK, INK_SOFT, PAPER, TABULAR, body, label, note } from "../../editorial/style";
import { Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { BANK } from "./data";
import { Drift, Headline, Kicker, Mark, OK_INK, Spot, TextPanel, X0 } from "./parts";

/** Where the answers go: right of the list. */
const R_X = 760;
const TOP = 330;
const LIST_TOP = 300;
const ROW = 50;

type Ctx = { w: (beat: string, phrase: string) => number; y: Layout["y"]; h: Layout["h"]; T: number };

/** The page's own prompt, line for line. */
const PROMPT = [
  "Dialect: DuckDB.",
  "Tables: orders(order_id, customer_id, order_ts TIMESTAMP, amount, status)",
  "        customers(customer_id, signup_date, is_test BOOLEAN)",
  "Grain: one row per order in orders.",
  "Definitions: revenue = SUM(amount) where status = 'completed',",
  "             excluding customers with is_test = TRUE.",
  "Task: monthly revenue for 2026, one row per month, oldest first.",
  "Also: list any assumptions you made, and give me a second query I can use",
  "to check the total.",
];

// ── 7. Prompting for SQL ────────────────────────────────────────────────────

const Prompt: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const at = c.w("r-prompt", "To prompt for SQL");
  const cue = [
    c.w("r-prompt", "the dialect"),
    c.w("r-prompt", "the tables"),
    c.w("r-prompt", "the tables") + 3,
    c.w("r-prompt", "the grain"),
    c.w("r-prompt", "the definitions"),
    c.w("r-prompt", "the definitions") + 3,
    c.w("r-prompt", "and the task"),
    c.w("r-prompt", "ask for its assumptions"),
    c.w("r-prompt", "ask for its assumptions") + 3,
  ];
  const checkAt = c.w("r-prompt", "a second query to check the total");
  // 21px mono: the longest line, 74 characters, is about 935px of the 980.
  const size = 21;
  const lineH = Math.round(size * 1.7);
  const pad = Math.round(size * 0.8);
  const markP = ease(frame, cue[7] + 4, 12);
  const markW = Math.max(PROMPT[7].length, PROMPT[8].length) * 0.6 * size + 12;
  return (
    <>
      <Note at={at - 4} x={R_X} y={c.T - c.h(40)}>
        <span style={{ ...label(20, INK_SOFT), whiteSpace: "nowrap" }}>a prompt</span>
      </Note>
      <TextPanel lines={PROMPT} x={R_X} top={c.T} width={980} size={size} mono at={at - 2} lineAt={cue}>
        {/* The two lines that matter most. */}
        <div
          style={{
            position: "absolute",
            left: pad - 6,
            top: pad + 7 * lineH + 3,
            height: 2 * lineH - 6,
            width: markW * markP,
            background: HIGHLIGHT,
            opacity: 0.8,
            mixBlendMode: "multiply",
          }}
        />
      </TextPanel>
      <Note at={checkAt} x={R_X} y={c.T + 2 * pad + PROMPT.length * lineH + c.h(16)}>
        <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>its guesses come out, and you get a total to check against</span>
      </Note>
    </>
  );
};

// ── 8. AI in BI tools ───────────────────────────────────────────────────────

const Bi: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const askAt = c.w("r-bi", "ask a question in plain words");
  const metricsAt = c.w("r-bi", "defined metrics");
  const tablesAt = c.w("r-bi", "clean and documented tables");
  const modelAt = c.w("r-bi", "a semantic model");
  const messyAt = c.w("r-bi", "Pointed at messy raw tables");
  const jobAt = c.w("r-bi-job", "the analyst's job moves");
  const T = c.T + c.h(30);
  const layerX = R_X + 380;
  const layers = [
    { at: metricsAt, text: "defined metrics" },
    { at: tablesAt, text: "clean, documented tables" },
    { at: modelAt, text: "a semantic model: how tables join" },
  ];
  const below = T + layers.length * c.h(76);
  const jobP = ease(frame, jobAt, 14);
  const box = (x: number, y: number, at: number, text: React.ReactNode, w = 320, strong = false) => {
    const p = ease(frame, at, 12);
    return (
      <div
        style={{
          position: "absolute",
          left: x,
          top: y,
          width: w,
          padding: "14px 18px",
          boxSizing: "border-box",
          border: `2px solid ${strong ? INK : BLUE_INK}`,
          borderRadius: 10,
          background: PAPER,
          ...note(25, INK),
          opacity: p,
          transform: `translateY(${(1 - p) * 8}px)`,
        }}
      >
        {text}
      </div>
    );
  };
  return (
    <>
      {box(R_X, T, askAt - 2, <>&ldquo;Which region grew fastest?&rdquo;</>, 330)}
      {/* The question wraps to two lines, so its label sits clear below the box. */}
      <Note at={askAt + 2} x={R_X} y={T + c.h(108)}>
        <span style={{ ...label(20, INK_SOFT), whiteSpace: "nowrap" }}>a question in plain words</span>
      </Note>
      {/* Over the stack, so the layers read as what the tool stands on, not as
          what the question turns into. */}
      <Note at={metricsAt - 2} x={layerX} y={T - c.h(40)}>
        <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>what it has to stand on to answer correctly</span>
      </Note>
      {layers.map((l, i) => (
        <div
          key={l.text}
          style={{
            position: "absolute",
            left: layerX,
            top: T + i * c.h(76),
            // Wide enough that "a semantic model: how tables join" stays on one line.
            width: 520,
            padding: "14px 18px",
            boxSizing: "border-box",
            borderRadius: 8,
            background: `color-mix(in srgb, ${HIGHLIGHT} ${jobP * 100}%, color-mix(in srgb, ${BLUE_INK} 12%, ${PAPER}))`,
            ...note(26, INK),
            fontWeight: 600,
            opacity: ease(frame, l.at - 2, 12),
            transform: `translateX(${(1 - ease(frame, l.at - 2, 12)) * 12}px)`,
          }}
        >
          {l.text}
        </div>
      ))}
      <Note at={messyAt - 2} x={layerX} y={below + c.h(4)}>
        <span style={{ ...note(24, ACCENT_INK), fontWeight: 650, whiteSpace: "nowrap" }}>on messy raw tables: confidently wrong, at scale</span>
      </Note>
      <Note at={jobAt - 2} x={layerX} y={below + c.h(52)}>
        <span style={{ ...note(26, OK_INK), fontWeight: 650, whiteSpace: "nowrap" }}>the analyst builds these, and checks the answers</span>
      </Note>
    </>
  );
};

// ── 9. Sorting survey answers with an LLM ───────────────────────────────────

const Llm: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const at = c.w("r-llm", "sort five thousand survey answers");
  const llmAt = c.w("r-llm", "a large language model");
  const steps = [
    { at: c.w("r-llm", "fix the categories first"), text: "Fix the categories first" },
    { at: c.w("r-llm", "hand-label a hundred or two"), text: "Hand-label 100 to 200, and measure its accuracy" },
    { at: c.w("r-llm", "keep the settings the same"), text: "Same settings every batch; a rerun gives the same labels", restAt: c.w("r-llm", "rerun a sample") },
    { at: c.w("r-llm", "quote real answers"), text: "Quote real answers, not its paraphrases" },
  ];
  return (
    <>
      <Note at={at - 2} x={R_X} y={c.T}>
        <span style={{ ...note(28, INK), whiteSpace: "nowrap" }}>5,000 open-ended survey answers</span>
      </Note>
      <Note at={llmAt - 2} x={R_X} y={c.T + c.h(44)}>
        <span style={{ ...label(20, INK_SOFT), whiteSpace: "nowrap" }}>LLM: large language model, as a first-pass labeler you measure</span>
      </Note>
      {steps.map((s, i) => {
        // A step said in two parts shows its second as it is said.
        const [lead, rest] = s.restAt === undefined ? [s.text, ""] : s.text.split(/(?=;)/);
        return (
          <Note key={s.text} at={s.at - 2} x={R_X} y={c.T + c.h(110) + i * c.h(62)}>
            <span style={{ ...note(28, INK), whiteSpace: "nowrap" }}>
              <span style={{ ...label(24, BLUE_INK), ...TABULAR, marginRight: 14 }}>{i + 1}</span>
              {lead}
              {rest ? <span style={{ opacity: ease(frame, (s.restAt ?? 0) - 2, 10) }}>{rest}</span> : null}
            </span>
          </Note>
        );
      })}
    </>
  );
};

/**
 * The quick round, questions 7 to 9, in this part's own words ("Three short
 * ones"), then the series' takeaway and last line: the track's question
 * bank, counted by check.mjs, where a "Next:" would otherwise go.
 */
export const RapidScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();
  const c: Ctx = { w: (b, p) => n.word(b, p), y, h, T: y(TOP) };

  const from = n.beat("rapid-in").from;
  const threeAt = n.word("rapid-in", "Three short ones");
  const finishAt = n.word("rapid-in", "to finish");
  const whoeverAt = n.word("close-two", "Whoever wrote the query");
  const rowAt = n.word("close-two", "what one row means");
  const rightAt = n.word("close-two", "how you know the number is right");
  const trackAt = n.word("close", "the whole data analyst track");
  const bankAt = n.word("close", "the question bank");
  // The list stands ticked when the takeaway begins.
  const end = n.beat("close-two").from;

  const items: RapidItem[] = [
    { n: 7, label: "Prompting for SQL", beat: "r-prompt", body: <Prompt c={c} /> },
    { n: 8, label: "AI in BI tools", beat: "r-bi", body: <Bi c={c} /> },
    { n: 9, label: "Labeling survey answers", beat: "r-llm", body: <Llm c={c} /> },
  ].map(({ beat, ...item }) => ({ ...item, at: n.beat(beat).from }));
  const lastAt = n.beat("r-llm").from;
  const closeY = y(830);
  // The series' takeaway, two lines above the hairline.
  const twoY = closeY - h(112);

  return (
    <AbsoluteFill>
      <Sfx name="el-whoosh" at={from} level={-34} />
      {items.map((item) => (
        <Sfx key={item.n} name="el-tap" at={item.at} level={-34} />
      ))}
      <Sfx name="el-chime" at={end} level={-34} />

      <Drift from={from} to={n.beat("close").to + 40} scale={0.015}>
        <Kicker at={from}>Questions 7 to 9</Kicker>
        <Headline lead="Three short ones," turn="to finish." at={threeAt - 4} turnAt={finishAt - 2} size={64} />
        <Spot id="da-sql-stopwatch" video="da-sql" at={from + 6} left={1640} top={y(112)} width={130} height={140} />

        {/* The last answer stays up through the close, so its body sits outside the list. */}
        <RapidFire
          items={items.map((it) => (it.n === 9 ? { ...it, body: undefined } : it))}
          x={X0}
          top={y(LIST_TOP) + h(40)}
          rowH={h(ROW)}
          width={540}
          at={finishAt}
          end={end}
        />
        <Fade from={lastAt - 6}>
          <Llm c={c} />
        </Fade>

        {/* ── The close: the takeaway of the nine parts, then the question bank ── */}
        <Ink at={whoeverAt - 2} dur={18} style={{ left: R_X, top: twoY, ...body(34), color: INK, whiteSpace: "nowrap" }}>
          Whoever wrote the query, the interview asks the same two things:
        </Ink>
        <Ink at={rowAt - 2} dur={18} style={{ left: R_X, top: twoY + h(48), ...body(34), color: INK, whiteSpace: "nowrap" }}>
          <Mark at={rowAt + 2}>what one row means</Mark>, and <Mark at={rightAt + 2}>how you know the number is right</Mark>.
        </Ink>
        <div style={{ position: "absolute", left: R_X, top: closeY, width: 1000, height: 1, background: HAIRLINE, opacity: ease(frame, trackAt - 4, 12) }} />
        <Ink at={trackAt} dur={18} style={{ left: R_X, top: closeY + 20, ...body(30, true), color: INK_SOFT, whiteSpace: "nowrap" }}>
          That&apos;s the whole Data Analyst track.
        </Ink>
        <Ink at={bankAt - 2} dur={18} style={{ left: R_X, top: closeY + h(64), ...body(34, true), color: INK, whiteSpace: "nowrap" }}>
          Practice: the question bank, {BANK} more, each answer explained.
        </Ink>
      </Drift>
    </AbsoluteFill>
  );
};

const Fade: React.FC<{ from: number; children: React.ReactNode }> = ({ from, children }) => {
  const frame = useCurrentFrame();
  const o = ease(frame, from, 8);
  return o > 0 ? <AbsoluteFill style={{ opacity: o }}>{children}</AbsoluteFill> : null;
};
