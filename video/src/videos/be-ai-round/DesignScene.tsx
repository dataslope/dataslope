import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { OK_INK, QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, BAR, HIGHLIGHT, INK, INK_SOFT, label, note } from "../../editorial/style";
import { Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { DESIGN } from "./data";
import { Drift, Flow, Node, X0 } from "./parts";

/** The page's flowchart, laid out in two rows: the request path along the
 *  top, the provider and the validation that checks it under the cache. */
const ROW_A = 350;
const ROW_B = 620;
const BOX_H = 86;
const BOX = {
  C: { x: X0, w: 160, row: ROW_A },
  API: { x: 445, w: 245, row: ROW_A },
  Q: { x: 770, w: 270, row: ROW_A },
  Cache: { x: 1120, w: 260, row: ROW_A },
  V: { x: 770, w: 270, row: ROW_B },
  LLM: { x: 1120, w: 260, row: ROW_B },
} as const;
const QUEUE = { x: 380, w: 190 };
const LOOP_Y = 750;
const LABEL_X = 1430;
const STRIP_Y = 268;

/** The concerns, in the page's order, each with the word that names it. */
const CONCERNS = [
  { name: "Latency", beat: "design-latency", cue: "Latency" },
  { name: "Failure", beat: "design-fail", cue: "Failure" },
  { name: "Structured output", beat: "design-shape", cue: "Structured output" },
  { name: "Cost and abuse", beat: "design-cost", cue: "Cost and abuse" },
  { name: "Caching", beat: "design-cost", cue: "Caching", nth: 1 },
  { name: "Quality", beat: "design-quality", cue: "Quality" },
] as const;

/** What the model is, as the page says it: each word a risk, in red. */
const RISKS = [
  { text: "slow", cue: "slow" },
  { text: "expensive", cue: "expensive" },
  { text: "rate-limited", cue: "rate-limited" },
  { text: "nondeterministic", cue: "nondeterministic" },
  { text: "sometimes fails", cue: "sometimes fail" },
  { text: "malformed output", cue: "malformed output" },
] as const;

/**
 * Question 4: a feature that calls an LLM API. The model is a dependency with
 * six risks, named in red, the provider drawn alone in the middle of the page;
 * the page's flowchart is built around it box by box as the request path is
 * walked (quota, cache, provider on a miss, validation, streamed back), and then
 * each concern the page lists lights the part of the drawing it changes or
 * adds to it: latency the streamed edge back to the client and a queue with a
 * status endpoint; failure the provider edge's timeout, retries, breaker and
 * fallback; structured output the "invalid" loop; cost the quota, now counted
 * in tokens, and a spend alert; caching the cache and the provider's prefix
 * caching; quality an eval set and a log under the provider. The concerns run
 * along the top as they are named.
 */
export const DesignScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("design").from;
  const qAt = n.word("design", "Question four");
  const textAt = n.word("design", "How would you design");
  const modelAt = n.word("design", "Treat the model");
  const risks = RISKS.map((r) => ({ ...r, at: n.word("design", r.cue) }));
  // The request path, walked: each box of the flowchart on its word.
  const reqAt = n.word("design-path", "The request passes");
  const quotaAt = n.word("design-path", "a quota check");
  const cacheBoxAt = n.word("design-path", "then the cache");
  const missAt = n.word("design-path", "On a miss");
  const providerAt = n.word("design-path", "it goes to the provider");
  const validAt = n.word("design-path", "the reply is validated");
  const backAt = n.word("design-path", "the app streams it back to the client");
  const concerns = CONCERNS.map((c) => ({ ...c, at: n.word(c.beat, c.cue, "nth" in c ? { nth: c.nth } : undefined) }));
  const [latAt, failAt, shapeAt, costAt, cacheAt, qualityAt] = concerns.map((c) => c.at);
  const streamAt = n.word("design-latency", "stream tokens to the client");
  const queueAt = n.word("design-latency", "Put long jobs on a queue");
  const statusAt = n.word("design-latency", "a status endpoint");
  const timeoutAt = n.word("design-fail", "timeouts");
  const retryAt = n.word("design-fail", "retries with exponential backoff");
  const codesAt = n.word("design-fail", "four twenty-nines");
  const breakerAt = n.word("design-fail", "a circuit breaker");
  const stopsAt = n.word("design-breaker", "stops calling a provider");
  const fallbackAt = n.word("design-fail", "a fallback");
  const validateAt = n.word("design-shape", "validate every response");
  const trustAt = n.word("design-shape", "Never trust the shape");
  const tokensAt = n.word("design-cost", "counted in tokens");
  const alertAt = n.word("design-cost", "an alert on spend");
  const exactAt = n.word("design-cost", "exact-match caching");
  const prefixAt = n.word("design-cost", "the provider's prompt caching");
  const evalAt = n.word("design-quality", "an evaluation set");
  const logsAt = n.word("design-quality", "logs of inputs and outputs");
  const redactAt = n.word("design-quality", "personal data redacted");
  const end = n.beat("design-quality").to;

  // Every box and edge of the page's flowchart is the page's: its labels come
  // from results.json, so the drawing can't name a box the page doesn't.
  const title = (id: keyof typeof BOX) => {
    const t = DESIGN.nodes[id];
    if (!t) throw new Error(`the page's flowchart has no node ${id}`);
    return t;
  };
  const edge = (from: string, to: string) => {
    const e = DESIGN.edges.find((d) => d.from === from && d.to === to);
    if (!e) throw new Error(`the page's flowchart has no edge ${from} → ${to}`);
    return e;
  };
  const bh = h(BOX_H);
  const top = (id: keyof typeof BOX) => y(BOX[id].row);
  const mid = (id: keyof typeof BOX) => top(id) + bh / 2;
  const right = (id: keyof typeof BOX) => BOX[id].x + BOX[id].w;
  const bottom = (id: keyof typeof BOX) => top(id) + bh;
  const boxAt = { LLM: modelAt, C: reqAt - 2, API: reqAt + 6, Q: quotaAt - 2, Cache: cacheBoxAt - 2, V: validAt - 2 };
  // The provider is drawn first, alone, beside the risks it carries; it
  // moves to its place in the flowchart as the request path starts.
  const settle = ease(frame, reqAt - 6, 22);
  const llmX = interpolate(settle, [0, 1], [(1920 - BOX.LLM.w) / 2, BOX.LLM.x]);
  const llmY = interpolate(settle, [0, 1], [y(430), y(BOX.LLM.row)]);
  const loopY = y(LOOP_Y);
  const cacheX = BOX.Cache.x + BOX.Cache.w / 2;
  const vToApiX = 650;
  const queueTop = y(ROW_B);
  const streamLabel = edge("API", "C").label;
  const missLabel = edge("Cache", "LLM").label;
  const invalidLabel = edge("V", "LLM").label;
  const risksOut = latAt - 8;
  const lead = (fy: number) => (fy + 13 > top("LLM") - 8 ? right("LLM") + 8 : cacheX + 10);
  // The failure stack on the provider edge, right of it, between the rows.
  const fails = [
    { text: "timeout", at: timeoutAt, v: 450 },
    { text: "retries: backoff and jitter", at: retryAt, v: 488 },
    { text: "circuit breaker", at: breakerAt, v: 548 },
    { text: "fallback", at: fallbackAt, v: 614 },
  ];

  return (
    <AbsoluteFill>
      {risks.map((r) => (
        <Sfx key={r.text} name="el-tap" at={r.at} level={-36} />
      ))}
      <Sfx name="el-pop" at={modelAt} level={-31} />
      {[reqAt, quotaAt, cacheBoxAt, validAt].map((at) => (
        <Sfx key={at} name="el-tap" at={at} level={-35} />
      ))}
      <Sfx name="el-pencil" at={missAt} level={-35} />
      <Sfx name="el-pencil" at={backAt + 8} level={-35} />
      {concerns.map((c) => (
        <Sfx key={c.name} name="el-tap" at={c.at} level={-31} />
      ))}
      <Sfx name="el-pop" at={queueAt + 2} level={-33} />
      {fails.map((f) => (
        <Sfx key={f.text} name="el-tap" at={f.at + 2} level={-36} />
      ))}
      <Sfx name="el-pop" at={evalAt} level={-33} />
      <Sfx name="el-pop" at={logsAt} level={-33} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={4} at={qAt - 4} textAt={textAt - 4} size={58}>
          How would you design a feature that calls an LLM API?
        </QuestionCard>

        {/* The model as a dependency: six risks, then the concerns that
            answer them take their place along the top. */}
        <Ink at={modelAt} dur={14} out={risksOut} style={{ left: X0, top: y(STRIP_Y), display: "flex", alignItems: "baseline", gap: 14, fontSize: 25 }}>
          <span style={{ ...note(25, INK), fontWeight: 500, whiteSpace: "nowrap" }}>The model is</span>
          {risks.map((r, i) => (
            <span key={r.text} style={{ ...note(25, ACCENT_INK), fontWeight: 500, whiteSpace: "nowrap", opacity: ease(frame, r.at - 2, 8) }}>
              {r.text}
              {i < risks.length - 1 ? "," : ""}
            </span>
          ))}
        </Ink>
        <div style={{ position: "absolute", left: X0, top: y(STRIP_Y), display: "flex", alignItems: "baseline", gap: 26, fontSize: 25 }}>
          {concerns.map((c, i) => {
            const next = concerns[i + 1]?.at ?? end + 60;
            const p = ease(frame, c.at - 2, 10);
            const now = ease(frame, c.at - 2, 8) * (1 - ease(frame, next - 4, 8));
            return (
              <span
                key={c.name}
                style={{
                  position: "relative",
                  ...note(25, now > 0.5 ? INK : INK_SOFT),
                  fontWeight: now > 0.5 ? 500 : 500,
                  whiteSpace: "nowrap",
                  opacity: p,
                  // The highlight reaches 0.2em past the word: given back as margin.
                  margin: "0 0.2em",
                }}
              >
                <span
                  style={{ position: "absolute", left: "-0.2em", right: "-0.2em", top: "0.02em", bottom: "-0.04em", background: HIGHLIGHT, borderRadius: "0.14em", opacity: now }}
                />
                <span style={{ position: "relative" }}>{c.name}</span>
              </span>
            );
          })}
        </div>

        {/* The page's flowchart. */}
        {(Object.keys(BOX) as (keyof typeof BOX)[]).map((id) => {
          const lit =
            id === "Q" ? { lit: costAt, litOut: cacheAt - 4 } : id === "Cache" ? { lit: cacheAt, litOut: qualityAt - 4 } : id === "V" ? { lit: shapeAt, litOut: costAt - 4 } : id === "LLM" ? { lit: providerAt, litOut: validAt + 4 } : {};
          const subAt = { Q: tokensAt, Cache: exactAt, V: validateAt, LLM: prefixAt, C: null, API: null }[id];
          const sub =
            subAt === null || frame < subAt - 1 ? undefined : id === "Q" ? (
              <span style={{ opacity: ease(frame, tokensAt, 10) }}>counted in tokens</span>
            ) : id === "Cache" ? (
              <span style={{ opacity: ease(frame, exactAt, 10) }}>exact match</span>
            ) : id === "V" ? (
              <span style={{ opacity: ease(frame, validateAt, 10) }}>against a schema</span>
            ) : id === "LLM" ? (
              <span style={{ opacity: ease(frame, prefixAt, 10) }}>+ prompt caching</span>
            ) : undefined;
          return (
            <Node
              key={id}
              x={id === "LLM" ? llmX : BOX[id].x}
              y={id === "LLM" ? llmY : top(id)}
              w={BOX[id].w}
              h={bh}
              at={boxAt[id]}
              title={title(id)}
              sub={sub}
              tone={id === "C" || id === "API" ? "plain" : "data"}
              size={id === "Q" ? 22 : 24}
              {...lit}
            />
          );
        })}
        {/* Client and app server, both ways: the request, and tokens streamed back. */}
        <Flow points={[[right("C") + 6, mid("C") - 18], [BOX.API.x - 8, mid("API") - 18]]} at={reqAt + 8} color={INK} head={13} />
        <Flow points={[[BOX.API.x - 6, mid("C") + 18], [right("C") + 8, mid("C") + 18]]} at={backAt + 8} color={BAR} head={13} lit={streamAt} litOut={failAt - 4} />
        <Note at={backAt + 14} x={right("C") + 8} y={mid("C") + 28}>
          <span style={{ ...note(20, INK_SOFT), whiteSpace: "nowrap" }}>{streamLabel}</span>
        </Note>
        <Flow points={[[right("API") + 6, mid("API")], [BOX.Q.x - 8, mid("Q")]]} at={quotaAt - 6} head={13} />
        <Flow points={[[right("Q") + 6, mid("Q")], [BOX.Cache.x - 8, mid("Cache")]]} at={cacheBoxAt - 6} head={13} lit={cacheAt} litOut={qualityAt - 4} />
        <Flow points={[[cacheX, bottom("Cache") + 6], [cacheX, top("LLM") - 8]]} at={missAt} head={13} lit={failAt} litOut={shapeAt - 4} />
        <Note at={missAt + 4} x={cacheX - 14} y={y(510)} align="right">
          <span style={{ ...note(20, INK_SOFT), whiteSpace: "nowrap" }}>{missLabel}</span>
        </Note>
        <Flow points={[[BOX.LLM.x - 6, mid("LLM")], [right("V") + 8, mid("V")]]} at={validAt - 6} head={13} />
        <Flow
          points={[
            [990, bottom("V") + 6],
            [990, loopY],
            [1170, loopY],
            [1170, bottom("LLM") + 8],
          ]}
          at={validAt + 10}
          head={13}
          color={ACCENT_INK}
          lit={shapeAt}
          litOut={costAt - 4}
        />
        <Note at={validAt + 14} x={1000} y={loopY + 8}>
          <span style={{ ...note(20, ACCENT_INK), whiteSpace: "nowrap" }}>{invalidLabel}</span>
        </Note>
        <Flow
          points={[
            [BOX.V.x - 6, mid("V")],
            [vToApiX, mid("V")],
            [vToApiX, bottom("API") + 8],
          ]}
          at={backAt - 4}
          head={13}
          color={INK}
        />

        {/* Latency: a queue for long jobs, with a status endpoint the client polls. */}
        <Node x={QUEUE.x} y={queueTop} w={QUEUE.w} h={bh} at={queueAt} title="Queue" sub="long jobs" tone="plain" lit={queueAt} litOut={failAt - 4} />
        <Flow points={[[475, bottom("API") + 6], [475, queueTop - 8]]} at={queueAt + 4} head={13} />
        <Ink at={statusAt} dur={12} style={{ left: QUEUE.x, top: y(732) + 6 }}>
          <span style={{ ...note(22, INK), fontWeight: 500, whiteSpace: "nowrap" }}>status endpoint</span>
        </Ink>
        <Flow
          points={[
            [BOX.C.x + 60, bottom("C") + 6],
            [BOX.C.x + 60, y(732) + 21],
            [QUEUE.x - 10, y(732) + 21],
          ]}
          at={statusAt + 6}
          head={12}
          dash="6 6"
          color={INK_SOFT}
        />
        <Note at={statusAt + 10} x={BOX.C.x + 78} y={y(640)}>
          <span style={{ ...note(20, INK_SOFT), whiteSpace: "nowrap" }}>polls</span>
        </Note>

        {/* Failure: on the provider edge. */}
        {fails.map((f) => {
          const p = ease(frame, f.at - 2, 12);
          if (p <= 0) return null;
          const fy = y(f.v);
          return (
            <React.Fragment key={f.text}>
              {/* A label level with the provider box leads from its edge, not across it. */}
              <div style={{ position: "absolute", left: lead(fy), top: fy + 13, width: (LABEL_X - 14 - lead(fy)) * p, height: 1.6, background: INK_SOFT }} />
              <Ink at={f.at} dur={12} style={{ left: LABEL_X, top: fy }}>
                <span style={{ ...note(22, INK), fontWeight: 500, whiteSpace: "nowrap" }}>{f.text}</span>
              </Ink>
            </React.Fragment>
          );
        })}
        <Note at={codesAt} x={LABEL_X} y={y(514)}>
          <span style={{ ...note(20, INK_SOFT), whiteSpace: "nowrap" }}>on 429s and server errors</span>
        </Note>
        <Note at={stopsAt - 2} x={LABEL_X} y={y(576)}>
          <span style={{ ...note(20, INK_SOFT), whiteSpace: "nowrap" }}>stops calling a failing provider</span>
        </Note>
        <Note at={fallbackAt + 8} x={LABEL_X} y={y(640)}>
          <span style={{ ...note(20, INK_SOFT), whiteSpace: "nowrap" }}>smaller model, cached answer,</span>
        </Note>
        <Note at={fallbackAt + 20} x={LABEL_X} y={y(666)}>
          <span style={{ ...note(20, INK_SOFT), whiteSpace: "nowrap" }}>or a graceful &ldquo;try again&rdquo;</span>
        </Note>

        {/* Structured output: validate, retry or repair. */}
        <Ink at={trustAt} dur={12} style={{ left: BOX.V.x, top: y(800) }}>
          <span style={{ ...note(23, OK_INK), fontWeight: 500, whiteSpace: "nowrap" }}>never trust the shape</span>
        </Ink>

        {/* Cost: a spend alert on the quota. */}
        <Ink at={alertAt} dur={12} style={{ left: BOX.Q.x, top: y(470) }}>
          <span style={{ ...note(22, INK), fontWeight: 500, whiteSpace: "nowrap" }}>+ an alert on spend</span>
        </Ink>

        {/* Quality: an eval set, and logs, under the provider. */}
        <Node x={BOX.LLM.x} y={y(812)} w={BOX.LLM.w} h={h(70)} at={evalAt} title="Evaluation set" sub="runs on every change" size={21} subSize={19} tone="ok" />
        <Node
          x={1420}
          y={y(812)}
          w={330}
          h={h(70)}
          at={logsAt}
          title="Logs: inputs, outputs"
          sub={<span style={{ opacity: ease(frame, redactAt, 10) }}>personal data redacted</span>}
          size={21}
          subSize={19}
          tone="plain"
        />
        <Flow
          points={[
            [right("LLM") - 30, bottom("LLM") + 6],
            [right("LLM") - 30, y(780)],
            [1585, y(780)],
            [1585, y(812) - 8],
          ]}
          at={logsAt + 4}
          head={12}
          dash="6 6"
          color={INK_SOFT}
        />
        <Note at={evalAt + 30} x={X0} y={y(860)}>
          <span style={{ ...label(20, INK_SOFT), whiteSpace: "nowrap" }}>The page&apos;s flowchart, with what each concern adds</span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
