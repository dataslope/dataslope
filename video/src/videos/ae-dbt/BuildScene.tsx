import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard, Tick } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, INK, INK_SOFT } from "../../editorial/style";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { GRAPH } from "./data";
import { BOX_H, Code, Cross, Drift, edgeKey, Graph, type GEdge, type GNode, Line, Mark, MARK_GREEN, MODELS, OK_INK, sliceLayout, SLICE_EDGE, type Slot, type ToneCue, VRule, X0 } from "./parts";

const W = 190;
const SIZE = 20;
const PANEL = [X0, 1010];

type Model = (typeof MODELS)[number];

/** A test's result above a box's right end: a tick or a cross, from `at`
 *  until `out`. */
const TestMark: React.FC<{ slot: Slot; at: number; out?: number; ok: boolean }> = ({ slot, at, out, ok }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 8) * (out === undefined ? 1 : 1 - ease(frame, out, 8));
  if (p <= 0) return null;
  return (
    <div style={{ position: "absolute", left: slot.x + slot.w - 30, top: slot.cy - BOX_H / 2 - 32, opacity: p }}>
      {ok ? <Tick at={at} size={26} /> : <Cross at={at} size={26} />}
    </div>
  );
};

/**
 * Question 7. Three commands down the left, said in turn, and two copies of
 * the four models below: run, then test, on the left; build on the right.
 * Run builds every model (blue) and test ticks each afterwards; build ticks
 * each as soon as it is built, step by step. Then the same with a broken
 * staging model: run has already built the fact from it (red) before the
 * test fails; build fails the test first, and the fact is never built
 * (grey, dashed) while the customers branch, which does not depend on it,
 * builds as usual. A failure stops where it starts, which is why build is
 * the command CI runs.
 */
export const BuildScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("build").from;
  const qAt = n.word("build", "Question seven");
  const textAt = n.word("build", "What is the difference");
  const runAt = n.word("build", "Run builds the models");
  const testAt = n.word("build", "Test runs the tests");
  const builtAt = n.word("build", "against models already built");
  const bothAt = n.word("build", "Build does both");
  const seedsAt = n.word("build", "with seeds and snapshots too");
  const graphAt = n.word("build", "in graph order");
  const eachAt = n.word("build", "each model is tested as soon as it's built");
  const pointAt = n.word("build-why", "The order is the point");
  const withAt = n.word("build-why", "With run, then test");
  const brokenAt = n.word("build-why", "a broken staging model");
  const fedAt = n.word("build-why", "has already fed everything downstream");
  const failsAt = n.word("build-why", "before any test fails");
  const buildTestsAt = n.word("build-why", "Build tests a model");
  const beforeAt = n.word("build-why", "before anything downstream of it is built");
  const stopsAt = n.word("build-why", "a failure stops where it starts");
  const ciAt = n.word("build-ci", "the command to run in CI");
  const end = n.beat("build-ci").to;

  // ── The commands ──
  const cmdY = y(296);
  const CMD = h(44);
  const cmds = [
    { c: "dbt run", d: "Builds the models", at: runAt },
    { c: "dbt test", d: "Tests models already built", at: testAt, dAt: builtAt },
    { c: "dbt build", d: "Both, in graph order", at: bothAt, dAt: graphAt },
  ];

  // ── The two panels ──
  const headY = y(476);
  const top = headY + h(110);
  const row = h(62);
  const lay = PANEL.map((left) => sliceLayout({ left, top, pitch: 250, row, sources: false, w: W }));
  const wave = (m: string) => GRAPH.waves.findIndex((wv) => wv.includes(m));

  // First pass: everything passes. Second: stg_orders is broken.
  const reset = pointAt + 2;
  const runTone = (m: Model): ToneCue[] => [
    { at: runAt + 4 + wave(m) * 8, tone: "data" },
    { at: reset, tone: "plain" },
    { at: withAt + 4 + wave(m) * 6, tone: "data" },
    ...(m === "fct_orders" ? [{ at: fedAt + 4, tone: "bad" as const }] : []),
    // Its test fails: the broken model in red, as in the build panel beside it.
    ...(m === "stg_orders" ? [{ at: failsAt + 2, tone: "bad" as const }] : []),
  ];
  const buildStep = (k: number) => eachAt + 2 + k * 14;
  const failStep = (k: number) => buildTestsAt + k * 12;
  const buildTone = (m: Model): ToneCue[] => [
    { at: buildStep(wave(m)), tone: "data" },
    { at: reset, tone: "plain" },
    m === "fct_orders" ? { at: beforeAt + 10, tone: "off" } : { at: failStep(wave(m)), tone: m === "stg_orders" ? "bad" : "data" },
  ];

  const edgesFor = (panel: number, at: number): GEdge[] =>
    GRAPH.edges
      .filter(([a, b]) => (MODELS as readonly string[]).includes(a) && (MODELS as readonly string[]).includes(b))
      .map(([a, b], i) => ({ from: `${panel}:${a}`, to: `${panel}:${b}`, at: at + i * 4, ...SLICE_EDGE[edgeKey(a, b)] }));
  const nodes: GNode[] = [0, 1].flatMap((p) =>
    MODELS.map((m) => ({
      id: `${p}:${m}`,
      title: m,
      slot: lay[p][m],
      size: SIZE,
      at: (p === 0 ? runAt - 8 : bothAt - 6) + wave(m) * 3,
      tones: p === 0 ? runTone(m) : buildTone(m),
    })),
  );
  const edges = [...edgesFor(0, runAt - 4), ...edgesFor(1, bothAt - 2)];

  return (
    <AbsoluteFill>
      {cmds.map((c) => (
        <Sfx key={c.c} name="el-tap" at={c.at} level={-32} />
      ))}
      {[0, 1, 2].map((k) => (
        <Sfx key={`b${k}`} name="el-tap" at={buildStep(k) + 8} level={-34} />
      ))}
      <Sfx name="el-whoosh" at={reset} level={-37} />
      <Sfx name="el-scratch" at={fedAt + 4} level={-34} />
      <Sfx name="el-tap" at={failsAt + 2} level={-31} />
      <Sfx name="el-tap" at={buildTestsAt + 8} level={-31} />
      <Sfx name="el-chime" at={stopsAt + 2} level={-33} />
      <Sfx name="el-pop" at={ciAt} level={-33} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={7} at={qAt - 4} textAt={textAt - 4} size={56}>
          What is the difference between <Code>dbt run</Code>, <Code>dbt test</Code>, and <Code>dbt build</Code>?
        </QuestionCard>

        {/* The three commands. */}
        {cmds.map((c, i) => (
          <React.Fragment key={c.c}>
            <Line at={c.at} x={X0} y={cmdY + i * CMD} size={24}>
              <Code>{c.c}</Code>
            </Line>
            <Line at={c.dAt ?? c.at + 4} x={X0 + 190} y={cmdY + i * CMD} size={24} color={i === 2 ? INK : INK_SOFT}>
              {c.d}
              {i === 2 ? <span style={{ color: INK_SOFT, opacity: ease(frame, seedsAt, 10) }}>, with seeds and snapshots too</span> : null}
            </Line>
          </React.Fragment>
        ))}

        {/* The two panels. */}
        <Line at={runAt - 8} x={PANEL[0]} y={headY} size={24} weight={600}>
          <Code>dbt run</Code>, then <Code>dbt test</Code>
        </Line>
        <Line at={bothAt - 6} x={PANEL[1]} y={headY} size={24} weight={600}>
          <Code>dbt build</Code>
        </Line>
        <VRule x={(PANEL[0] + 2 * 250 + W + PANEL[1]) / 2} top={headY} bottom={top + 2 * row + BOX_H} at={bothAt - 6} />

        <Graph nodes={nodes} edges={edges} />

        {/* Tests: run's after everything is built; build's as each one is. */}
        {MODELS.map((m) => (
          <React.Fragment key={m}>
            <TestMark slot={lay[0][m]} at={builtAt + 4 + MODELS.indexOf(m) * 4} out={reset} ok />
            <TestMark slot={lay[1][m]} at={buildStep(wave(m)) + 8} out={reset} ok />
            {m === "fct_orders" ? null : <TestMark slot={lay[0][m]} at={failsAt + 2 + (m === "stg_orders" ? 0 : 4 + MODELS.indexOf(m) * 3)} ok={m !== "stg_orders"} />}
            {m === "fct_orders" ? null : <TestMark slot={lay[1][m]} at={failStep(wave(m)) + 8} ok={m !== "stg_orders"} />}
          </React.Fragment>
        ))}

        {/* What each order did with the broken model. */}
        <Line at={brokenAt} x={PANEL[0]} y={top + 2 * row + h(56)} color={ACCENT_INK} weight={600}>
          <Code>stg_orders</Code> is broken
        </Line>
        <Line at={fedAt + 6} x={PANEL[0]} y={top + 2 * row + h(56) + h(36)} color={ACCENT_INK}>
          <Code>fct_orders</Code> was already built from it
        </Line>
        <Line at={beforeAt + 12} x={PANEL[1]} y={top + 2 * row + h(56)} color={INK_SOFT}>
          <Code>fct_orders</Code> is never built
        </Line>
        <Line at={stopsAt} x={PANEL[1]} y={top + 2 * row + h(56) + h(36)} color={OK_INK} weight={600}>
          The failure stops where it starts
        </Line>
        <Line at={ciAt - 4} x={PANEL[1]} y={top + 2 * row + h(56) + h(88)} size={24}>
          <Mark at={ciAt + 4} color={MARK_GREEN}>
            <Code>dbt build</Code>: the CI command
          </Mark>
        </Line>
      </Drift>
    </AbsoluteFill>
  );
};
