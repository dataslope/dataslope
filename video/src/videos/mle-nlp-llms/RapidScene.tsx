import { FileText, Package, User } from "lucide-react";
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { RapidFire, type RapidItem, Tick } from "../../editorial/interview";
import { type Layout, useLayout } from "../../editorial/layout";
import { I, MathRun } from "../../editorial/math";
import { label, note } from "../../editorial/style";
import { ColumnRule, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ds } from "../../theme/brand";
import { MONO } from "../../theme/fonts";
import { ILLUS } from "./data";
import { ACCENT_INK, BAR, Chip, DATA_FILL, Drift, GOLD, Headline, HIGHLIGHT, INK, INK_SOFT, Kicker, Line, Mark, OK_INK, QUIET, Svg, X0 } from "./parts";

const R_X = 830;
type Ctx = { w: (beat: string, phrase: string) => number; y: Layout["y"]; h: Layout["h"] };

// ── 15. Embeddings beyond the input ─────────────────────────────────────────

/** Items in a space: fixed, illustrative positions in 0..1. */
const ITEMS: readonly [number, number][] = [
  [0.05, 0.2], [0.14, 0.72], [0.22, 0.38], [0.3, 0.9], [0.36, 0.12], [0.44, 0.6], [0.5, 0.3], [0.58, 0.84],
  [0.66, 0.08], [0.7, 0.62], [0.78, 0.4], [0.86, 0.9], [0.92, 0.18], [0.98, 0.66], [0.12, 0.5], [0.82, 0.74],
];
const QUERY: readonly [number, number] = [0.58, 0.5];
const NEAR = [5, 9, 6];

const Beyond: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const encodeAt = c.w("r-beyond", "encode documents");
  const neighAt = c.w("r-beyond", "find neighbors");
  const cosineAt = c.w("r-beyond", "cosine similarity");
  const uses = [
    { t: "search", at: c.w("r-beyond", "for search") },
    { t: "clustering", at: c.w("r-beyond", "clustering") },
    { t: "deduplication", at: c.w("r-beyond", "deduplication") },
    { t: "recommendations", at: c.w("r-beyond", "recommendations") },
  ];
  const labelsAt = c.w("r-beyond", "with no labels");
  const S = { x: 1130, y: c.y(350), w: 620, h: c.h(270) };
  const px = ([u, v]: readonly [number, number]) => [S.x + u * S.w, S.y + v * S.h] as const;
  const [qx, qy] = px(QUERY);
  return (
    <>
      {[
        { I: FileText, t: "documents" },
        { I: Package, t: "products" },
        { I: User, t: "users" },
      ].map(({ I: Icon, t }, i) => (
        <div key={t} style={{ position: "absolute", left: R_X, top: c.y(370) + i * c.h(70), display: "flex", alignItems: "center", gap: 12, opacity: ease(frame, encodeAt + i * 4, 12) }}>
          <Icon size={30} color={INK} strokeWidth={1.8} />
          <span style={{ ...label(22, INK), fontWeight: 500 }}>{t}</span>
        </div>
      ))}
      <Svg>
        {ITEMS.map((p, i) => {
          const o = ease(frame, encodeAt + 6 + i, 8);
          if (o <= 0) return null;
          const [x, yy] = px(p);
          const near = NEAR.includes(i) ? ease(frame, neighAt + 4, 10) : 0;
          return <circle key={i} cx={x} cy={yy} r={9} fill={near > 0 ? `color-mix(in srgb, ${BAR} ${near * 100}%, ${DATA_FILL})` : DATA_FILL} opacity={o} />;
        })}
        {NEAR.map((k, i) => {
          const p = ease(frame, neighAt + 2 + i * 3, 12);
          if (p <= 0) return null;
          const [x, yy] = px(ITEMS[k]);
          return <line key={k} x1={qx} y1={qy} x2={qx + (x - qx) * p} y2={qy + (yy - qy) * p} stroke={GOLD} strokeWidth={2.4} />;
        })}
        {ease(frame, neighAt, 10) > 0 ? <circle cx={qx} cy={qy} r={12} fill={GOLD} opacity={ease(frame, neighAt, 10)} /> : null}
      </Svg>
      <Line at={neighAt + 4} x={qx + 20} y={qy - c.h(44)} size={21} color={INK}>
        query
      </Line>
      <Line at={cosineAt} x={S.x} y={S.y + S.h + c.h(28)} size={22} color={INK_SOFT}>
        Nearest by cosine similarity
      </Line>
      {uses.map((u, i) => (
        <Chip key={u.t} x={R_X + [0, 130, 300, 500][i]} y={c.y(700)} at={u.at} tone="ink" size={22}>
          {u.t}
        </Chip>
      ))}
      <Line at={labelsAt} x={R_X} y={c.y(770)} size={24} weight={600}>
        No labels needed
      </Line>
    </>
  );
};

// ── 16. Hallucination ───────────────────────────────────────────────────────

const Halluc: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const probAt = c.w("r-halluc", "probable text");
  const trueAt = c.w("r-halluc", "not true text");
  const inventsAt = c.w("r-halluc", "invents fluently");
  const nicheAt = c.w("r-halluc", "niche facts");
  const fixes = [
    { t: "Ground it with retrieval and citations", at: c.w("r-halluc", "Ground it with retrieval") },
    { t: "Lower the temperature for facts", at: c.w("r-halluc", "lower the temperature") },
    { t: "Add checks", at: c.w("r-halluc", "add checks") },
    { t: "Keep a human in the loop where stakes are high", at: c.w("r-halluc", "keep a human in the loop") },
  ];
  const nothingAt = c.w("r-halluc", "Nothing removes it entirely");
  return (
    <>
      <Line at={probAt - 4} x={R_X} y={c.y(340)} size={30} weight={600}>
        Trained for probable text
        <span style={{ opacity: ease(frame, trueAt, 10), color: ACCENT_INK }}>, not true text</span>
      </Line>
      <Line at={inventsAt} x={R_X} y={c.y(400)} size={24} color={ACCENT_INK}>
        So it invents fluently<span style={{ opacity: ease(frame, nicheAt, 10) }}>, most of all on niche facts</span>
      </Line>
      {fixes.map((f, i) => {
        const p = ease(frame, f.at, 12);
        if (p <= 0) return null;
        return (
          <div key={f.t} style={{ position: "absolute", left: R_X, top: c.y(490) + i * c.h(54), display: "flex", alignItems: "center", gap: 14, opacity: p }}>
            <Tick at={f.at + 2} size={26} />
            <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>{f.t}</span>
          </div>
        );
      })}
      <Line at={nothingAt} x={R_X} y={c.y(740)} size={28} weight={600}>
        <Mark at={nothingAt + 6}>Nothing removes it entirely</Mark>
      </Line>
    </>
  );
};

// ── 17. Prompting ───────────────────────────────────────────────────────────

const Prompting: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const steersAt = c.w("r-prompt", "steers a frozen model");
  const zeroAt = c.w("r-prompt-kinds", "Zero-shot describes the task");
  const fewAt = c.w("r-prompt-kinds", "few-shot adds worked examples");
  const cotAt = c.w("r-prompt-kinds", "chain-of-thought asks");
  const multiAt = c.w("r-prompt-kinds", "multi-step problems");
  const reasonsAt = c.w("r-prompt-kinds", "a model that already reasons");
  const latencyAt = c.w("r-prompt-kinds", "tokens and latency");
  const cheapAt = c.w("r-prompt-cheap", "the cheapest lever");
  const beforeAt = c.w("r-prompt-cheap", "try it before fine-tuning");
  const CX = [R_X, R_X + 330, R_X + 660];
  const top = c.y(500);
  const bar = (x: number, yy: number, w: number, fill: string, at: number, key: string) => {
    const p = ease(frame, at, 10);
    return p > 0 ? <rect key={key} x={x} y={yy} width={w * p} height={c.h(16)} rx={4} fill={fill} /> : null;
  };
  const step = c.h(30);
  return (
    <>
      <Line at={steersAt} x={R_X} y={c.y(340)} size={28}>
        Steers a frozen model with text alone
      </Line>
      <ColumnRule x={CX[1] - 34} top={c.y(430)} height={c.h(260)} at={fewAt} />
      <ColumnRule x={CX[2] - 34} top={c.y(430)} height={c.h(260)} at={cotAt} />
      {[
        { t: "Zero-shot", at: zeroAt, sub: "the task" },
        { t: "Few-shot", at: fewAt, sub: "plus worked examples" },
        { t: "Chain-of-thought", at: cotAt, sub: "plus step by step" },
      ].map((col, i) => (
        <React.Fragment key={col.t}>
          <Line at={col.at} x={CX[i]} y={c.y(430)} size={24} weight={600}>
            {col.t}
          </Line>
          <Line at={col.at + 10} x={CX[i]} y={top + 4 * step + c.h(10)} size={21} color={INK_SOFT}>
            {col.sub}
          </Line>
        </React.Fragment>
      ))}
      <Svg>
        {bar(CX[0], top, 240, ds("blue", 300), zeroAt + 4, "z")}
        {[0, 1, 2].map((k) => bar(CX[1], top + k * step, 240, QUIET, fewAt + 4 + k * 3, `f${k}`))}
        {bar(CX[1], top + 3 * step, 240, ds("blue", 300), fewAt + 14, "ft")}
        {bar(CX[2], top, 240, ds("blue", 300), cotAt + 4, "c")}
      </Svg>
      <div
        style={{
          position: "absolute",
          left: CX[2],
          top: top + step - 4,
          padding: "1px 8px",
          background: HIGHLIGHT,
          borderRadius: 5,
          fontFamily: MONO,
          fontSize: 20,
          fontWeight: 500,
          color: INK,
          whiteSpace: "nowrap",
          opacity: ease(frame, cotAt + 10, 10),
        }}
      >
        Think step by step.
      </div>
      <Line at={multiAt} x={CX[2]} y={top + 4 * step + c.h(46)} size={21} color={OK_INK}>
        Helps on multi-step problems
      </Line>
      <Line at={reasonsAt} x={CX[2]} y={top + 4 * step + c.h(80)} size={21} color={ACCENT_INK}>
        Reasoning models: little gain,
      </Line>
      <Line at={latencyAt} x={CX[2]} y={top + 4 * step + c.h(110)} size={21} color={ACCENT_INK}>
        just tokens and latency
      </Line>
      <Line at={cheapAt} x={R_X} y={c.y(780)} size={26} weight={600}>
        <Mark at={cheapAt + 6}>The cheapest lever:</Mark>
        <span style={{ opacity: ease(frame, beforeAt, 10) }}>{" "}try it before fine-tuning</span>
      </Line>
    </>
  );
};

// ── 18. Randomness ──────────────────────────────────────────────────────────

const softmax = (scores: readonly number[], t: number) => {
  const m = Math.max(...scores);
  const e = scores.map((s) => Math.exp((s - m) / t));
  const z = e.reduce((a, b) => a + b, 0);
  return e.map((v) => v / z);
};

const Randomness: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const tempAt = c.w("r-random", "temperature divides the scores");
  const zeroAt = c.w("r-random", "near zero is almost greedy");
  const higherAt = c.w("r-random", "higher is more varied");
  const topkAt = c.w("r-random", "Top-k keeps");
  const toppAt = c.w("r-random", "top-p, the smallest set");
  const lowAt = c.w("r-random", "Keep it low for extraction");
  const brainAt = c.w("r-random", "higher for brainstorming");
  const hostAt = c.w("r-random-host", "A hosted reasoning model");
  const steerAt = c.w("r-random-host", "you steer with the prompt");
  const L = ILLUS;
  const T = 1 + (0.25 - 1) * ease(frame, zeroAt + 4, 20) + (2.2 - 0.25) * ease(frame, higherAt + 4, 24) + (1 - 2.2) * ease(frame, topkAt - 8, 16);
  const probs = softmax(L.nextScores, T);
  const base = c.y(650);
  const MAXH = c.h(250);
  const BX = (i: number) => R_X + 30 + i * 76;
  const kCut = ease(frame, topkAt + 4, 10);
  const pCut = ease(frame, toppAt + 4, 10);
  const kept = (i: number) => (pCut > 0 ? (i < L.topPCount ? 1 : 1 - 0.7 * pCut) : i < L.topK ? 1 : 1 - 0.7 * kCut);
  const cutX = (k: number) => BX(k) - 10;
  return (
    <>
      <Line at={tempAt} x={R_X} y={c.y(336)} size={32} weight={400}>
        <MathRun>
          softmax(score / <I>T</I>)
        </MathRun>
      </Line>
      <Line at={tempAt + 6} x={1500} y={c.y(342)} size={28} weight={600}>
        <MathRun>
          <I>T</I>
        </MathRun>{" "}
        = <Num>{T.toFixed(2)}</Num>
      </Line>
      <Svg>
        <line x1={R_X + 20} x2={BX(7) + 66} y1={base} y2={base} stroke={INK_SOFT} strokeWidth={1.2} opacity={ease(frame, tempAt, 10)} />
        {probs.map((p, i) => {
          const o = ease(frame, tempAt + 2 + i * 1.5, 10);
          if (o <= 0) return null;
          const bh = p * MAXH * o;
          return <rect key={i} x={BX(i)} y={base - bh} width={56} height={bh} rx={4} fill={BAR} opacity={kept(i)} />;
        })}
        {kCut > 0 ? <line x1={cutX(L.topK)} x2={cutX(L.topK)} y1={base - MAXH - c.h(10)} y2={base + 6} stroke={GOLD} strokeWidth={2.4} strokeDasharray="6 5" opacity={kCut} /> : null}
        {pCut > 0 ? <line x1={cutX(L.topPCount)} x2={cutX(L.topPCount)} y1={base - MAXH + c.h(40)} y2={base + 6} stroke={GOLD} strokeWidth={2.4} strokeDasharray="6 5" opacity={pCut} /> : null}
      </Svg>
      <Line at={topkAt + 6} x={cutX(L.topK) + 12} y={base - MAXH - c.h(10)} size={22}>
        top-k, <MathRun><I>k</I> = {L.topK}</MathRun>
      </Line>
      <Line at={toppAt + 6} x={cutX(L.topPCount) + 12} y={base - MAXH + c.h(40)} size={22}>
        top-p, <MathRun><I>p</I> = {L.topP}</MathRun>
      </Line>
      <Line at={tempAt + 10} x={R_X + 20} y={base + c.h(14)} size={20} color={INK_SOFT}>
        Next-token candidates, from illustrative scores
      </Line>
      <Line at={lowAt} x={R_X} y={c.y(770)} size={26}>
        Low for extraction<span style={{ opacity: ease(frame, brainAt, 10) }}>, higher for brainstorming</span>
      </Line>
      {/* The page's follow-up: a hosted model may not take these settings. */}
      <Line at={hostAt} x={R_X} y={c.y(822)} size={24} weight={600}>
        Hosted reasoning models may refuse them
      </Line>
      <Line at={steerAt} x={R_X} y={c.y(822) + c.h(38)} size={22} color={INK_SOFT}>
        Steer with the prompt, reasoning effort, structured outputs
      </Line>
    </>
  );
};

// ── 19. Evaluation ──────────────────────────────────────────────────────────

const Evaluation: React.FC<{ c: Ctx }> = ({ c }) => {
  const taskAt = c.w("r-eval", "depends on the task");
  const cols = [
    { task: "Language modeling", metric: "Perplexity", at: c.w("r-eval", "perplexity") },
    { task: "Translation", metric: "BLEU", at: c.w("r-eval", "BLEU for translation") },
    { task: "Summaries", metric: "ROUGE", at: c.w("r-eval", "ROUGE for summaries") },
    { task: "Extracted answers", metric: "Exact match, F1", at: c.w("r-eval", "exact match and F1") },
  ];
  const overlapAt = c.w("r-eval", "Overlap misses meaning");
  const humanAt = c.w("r-eval", "human ratings");
  const judgeAt = c.w("r-eval", "LLM judges");
  const heldAt = c.w("r-eval", "a held-out set");
  const realAt = c.w("r-eval", "looks like real use");
  const CX = [R_X, R_X + 240, R_X + 480, R_X + 720];
  return (
    <>
      <Line at={taskAt} x={R_X} y={c.y(340)} size={28}>
        It depends on the task
      </Line>
      {cols.map((col, i) => (
        <React.Fragment key={col.task}>
          {i > 0 ? <ColumnRule x={CX[i] - 22} top={c.y(420)} height={c.h(90)} at={col.at} /> : null}
          <Line at={col.at} x={CX[i]} y={c.y(420)} size={21} color={INK_SOFT}>
            {col.task}
          </Line>
          <Line at={col.at + 4} x={CX[i]} y={c.y(460)} size={28} weight={600}>
            {col.metric}
          </Line>
        </React.Fragment>
      ))}
      <Line at={overlapAt} x={R_X} y={c.y(560)} size={24} color={ACCENT_INK} weight={600}>
        Overlap misses meaning
      </Line>
      <Line at={overlapAt + 30} x={R_X} y={c.y(640)} size={24}>
        So teams add
      </Line>
      <Chip x={R_X + 180} y={c.y(636)} at={humanAt} tone="green" size={24}>
        Human ratings
      </Chip>
      <Chip x={R_X + 390} y={c.y(636)} at={judgeAt} tone="green" size={24}>
        LLM judges
      </Chip>
      <Line at={heldAt} x={R_X} y={c.y(720)} size={24}>
        On a held-out set <Mark at={realAt + 4}>that looks like real use</Mark>
      </Line>
    </>
  );
};

/**
 * The quick round, questions 15 to 19: a numbered list down the left, each
 * row current while its answer fills the right of the page, then ticked.
 */
export const RapidScene: React.FC = () => {
  const n = useNarration();
  const { y, h } = useLayout();
  const c: Ctx = { w: (b, p) => n.word(b, p), y, h };

  const from = n.beat("rapid-in").from;
  const fiveAt = n.word("rapid-in", "Five more");
  // Past the cut into the bridge, so the last answer stays up until the scene goes.
  const end = n.beat("next").from + 30;

  const items: RapidItem[] = [
    { n: 15, label: "Embeddings beyond the input", beat: "r-beyond", body: <Beyond c={c} /> },
    { n: 16, label: "Hallucination", beat: "r-halluc", body: <Halluc c={c} /> },
    { n: 17, label: "Prompting", beat: "r-prompt", body: <Prompting c={c} /> },
    { n: 18, label: "Output randomness", beat: "r-random", body: <Randomness c={c} /> },
    { n: 19, label: "Evaluating NLP models", beat: "r-eval", body: <Evaluation c={c} /> },
  ].map(({ beat, ...item }) => ({ ...item, at: n.beat(beat).from }));

  return (
    <AbsoluteFill>
      <Sfx name="el-whoosh" at={from} level={-35} />
      {items.map((item) => (
        <Sfx key={item.n} name="el-tap" at={item.at} level={-34} />
      ))}

      <Drift from={from} to={end + 40} scale={0.012}>
        <Kicker at={from}>Questions 15 to 19</Kicker>
        <Headline at={fiveAt - 4} size={60}>
          Five more, quickly
        </Headline>
        <RapidFire items={items} x={X0} top={y(340)} rowH={h(62)} width={600} at={fiveAt + 6} end={end} />
      </Drift>
    </AbsoluteFill>
  );
};
