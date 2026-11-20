import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BLUE_INK, INK, INK_SOFT, label, note } from "../../editorial/style";
import { Note, Num, outlineBadgeStyle } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { SANS } from "../../theme/fonts";
import { Sfx } from "../../sound/Sfx";
import { GRAPH, LISTING } from "./data";
import { Arrow, Code, Drift, edgeKey, Graph, type GEdge, type GNode, BIG, lerpLayout, lineOf, Listing, listingWidth, Mark, MARK_RED, sliceLayout, SLICE_EDGE, X0 } from "./parts";

const SIZE = 20;

/** The page's source declaration (its freshness block's first four lines). */
const SOURCE_DECL = ["sources:", "  - name: raw", "    tables:", "      - name: orders"];

/**
 * Questions 2 and 3, on one graph. Question 2: raw.orders, a source, and the
 * two models that read it in turn, each over the line of code that names
 * its parent (the page's source() line, and its fct_orders FROM line); each
 * call draws its edge, and the build order follows. Hardcoded, the ref line
 * turns red, its edge lifts off and leaves a red gap, and fct_orders slides
 * to the front of the order. Question 3: the gap closes, the fact drops to
 * where both branches meet, and the rest of the page's slice draws itself,
 * edge by edge; then its three build steps, column by column; then the
 * dashed edge back that would make a cycle, and no model can go first.
 */
export const RefScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("ref").from;
  const q2At = n.word("ref", "Question two");
  const text2At = n.word("ref", "What do ref and source do");
  const sourceAt = n.word("ref", "Source points at a raw table");
  const declaredAt = n.word("ref", "declared once by name");
  const refAt = n.word("ref", "Ref points at another model");
  const stgAt = n.word("ref-edges", "the staging model reads raw orders");
  const throughSourceAt = n.word("ref-edges", "through source");
  const factAt = n.word("ref-edges", "the orders fact reads the staging model");
  const throughRefAt = n.word("ref-edges", "through ref");
  const dependsAt = n.word("ref-edges", "one thing depends on another");
  const hardAt = n.word("ref-hard", "Hardcode the table name");
  const seesAt = n.word("ref-hard", "no longer sees that dependency");
  const beforeAt = n.word("ref-hard", "Nothing stops it building the fact");
  const gapAt = n.word("ref-hard", "has a gap where the edge was");
  const q3At = n.word("dag", "Question three");
  const text3At = n.word("dag", "What is the dbt lineage DAG");
  const shortAt = n.word("dag", "DAG is short for");
  const directedAt = n.word("dag", "directed acyclic graph");
  const acyclicWordAt = n.word("dag", "acyclic graph");
  const graphWordAt = n.word("dag", "graph", { nth: 1 });
  const parsesAt = n.word("dag", "dbt parses every ref and source call");
  const edgeAt = n.word("dag", "each call becomes an edge");
  const namesAt = n.word("dag", "from the node it names");
  const twoAt = n.word("dag-order", "two sources");
  const fourAt = n.word("dag-order", "four models and");
  const fiveAt = n.word("dag-order", "five edges");
  const bothAt = n.word("dag-order", "Both staging models");
  const dimAt = n.word("dag-order", "The customer dimension waits");
  const factWaitsAt = n.word("dag-order", "the orders fact for both branches");
  const stepsAt = n.word("dag-order", "four models in three steps");
  const acyclicAt = n.word("dag-acyclic", "Acyclic is what makes an order possible");
  const eachOtherAt = n.word("dag-acyclic", "If two models referenced each other");
  const neitherAt = n.word("dag-acyclic", "neither could go first");
  const end = n.beat("dag-acyclic").to;

  const top = y(394);
  const row = h(92);
  const slice = sliceLayout({ left: X0, top, row, pitch: BIG.pitch, w: BIG.w });
  // Question 2 keeps the fact on the orders row, straight after its parent;
  // Question 3 drops it to where both branches meet.
  const refLayout = { ...slice, fct_orders: { ...slice.fct_orders, cy: top } };
  const drop = ease(frame, q3At + 6, 22);
  const at = lerpLayout(refLayout, slice, drop);

  // ── Question 2's code, under each box ──
  const codeTop = top + h(58);
  const sourceLine = LISTING.sourceLine;
  const fctFrom = LISTING.fctOrders[lineOf(LISTING.fctOrders, "ref('stg_orders')")].replace(/\s+--.*$/, "");
  const fctLines = [LISTING.fctOrders[0], fctFrom];
  const hardLine = fctFrom.replace("{{ ref('stg_orders') }}", "analytics.stg_orders");
  const swapped = frame >= hardAt + 4;
  const codeOut = q3At - 2;

  // ── The build order, Question 2 ──
  const orderY = y(690);
  const ORDER_X = X0 + 170;
  const SLOT = 250;
  const swap = ease(frame, beforeAt + 2, 18);
  const orderIdx = { stg_orders: swap, fct_orders: 1 - swap };

  // ── The nodes ──
  const wave = (m: string) => GRAPH.waves.findIndex((w) => w.includes(m));
  const stepAt = [bothAt + 4, dimAt + 2, factWaitsAt + 2];
  const modelTones = (m: string) => [
    { at: stepAt[wave(m)], tone: "lit" as const },
    { at: (stepAt[wave(m) + 1] ?? stepsAt) + 2, tone: "data" as const },
    { at: acyclicAt, tone: "plain" as const },
    ...(m === "stg_orders" || m === "fct_orders" ? [{ at: neitherAt, tone: "bad" as const }] : []),
  ];
  const nodes: GNode[] = [
    { id: "raw.orders", slot: at["raw.orders"], size: BIG.size, h: BIG.h, at: sourceAt + 4, base: "soft" },
    { id: "raw.customers", slot: at["raw.customers"], size: BIG.size, h: BIG.h, at: parsesAt + 4, base: "soft" },
    { id: "stg_orders", slot: at.stg_orders, size: BIG.size, h: BIG.h, at: stgAt, tones: modelTones("stg_orders") },
    { id: "stg_customers", slot: at.stg_customers, size: BIG.size, h: BIG.h, at: parsesAt + 8, tones: modelTones("stg_customers") },
    { id: "dim_customer", slot: at.dim_customer, size: BIG.size, h: BIG.h, at: parsesAt + 12, tones: modelTones("dim_customer") },
    { id: "fct_orders", slot: at.fct_orders, size: BIG.size, h: BIG.h, at: factAt, tones: [{ at: hardAt + 4, tone: "bad" }, { at: q3At + 4, tone: "plain" }, ...modelTones("fct_orders")] },
  ];
  const edgeCue: Record<string, number> = {
    [edgeKey("raw.orders", "stg_orders")]: throughSourceAt,
    [edgeKey("stg_orders", "fct_orders")]: throughRefAt,
    [edgeKey("raw.customers", "stg_customers")]: edgeAt + 2,
    [edgeKey("stg_customers", "dim_customer")]: edgeAt + 10,
    [edgeKey("dim_customer", "fct_orders")]: edgeAt + 18,
  };
  const edges: GEdge[] = GRAPH.edges
    .filter(([a, b]) => edgeCue[edgeKey(a, b)] !== undefined)
    .map(([a, b]) => {
      const k = edgeKey(a, b);
      // The two edges into the fact part as it drops, each to its own port.
      const port = SLICE_EDGE[k]?.toPort;
      const e: GEdge = { from: a, to: b, at: edgeCue[k], dur: 16, ...(port ? { toPort: { ...port, d: (port.d ?? 0) * drop } } : {}) };
      if (k === edgeKey("stg_orders", "fct_orders")) return { ...e, gone: seesAt + 2, back: q3At + 2 };
      return e;
    });

  // ── Question 3's lines ──
  const linesY = top + 2 * row + h(70);
  const countY = linesY + h(58);
  const stepY = top - h(66);
  const colMid = (m: "stg_orders" | "dim_customer" | "fct_orders") => slice[m].x + slice[m].w / 2;
  const loopY = top - h(50);
  const fx = slice.fct_orders.x + BIG.w / 2 + 30;
  const sx = slice.stg_orders.x + BIG.w / 2 + 30;
  const gapMid = (slice.stg_orders.x + BIG.w + slice.fct_orders.x) / 2;

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={sourceAt + 4} level={-32} />
      <Sfx name="el-tap" at={stgAt} level={-32} />
      <Sfx name="el-pencil" at={throughSourceAt} level={-35} />
      <Sfx name="el-tap" at={factAt} level={-32} />
      <Sfx name="el-pencil" at={throughRefAt} level={-35} />
      <Sfx name="el-scratch" at={hardAt + 4} level={-34} />
      <Sfx name="el-whoosh" at={beforeAt + 2} level={-36} />
      <Sfx name="el-whoosh" at={q3At + 6} level={-36} />
      <Sfx name="el-pencil" at={edgeAt + 2} level={-35} />
      <Sfx name="el-pencil" at={edgeAt + 18} level={-36} />
      {stepAt.map((s, i) => (
        <Sfx key={i} name="el-tap" at={s} level={-31} />
      ))}
      <Sfx name="el-chime" at={stepsAt + 4} level={-33} />
      <Sfx name="el-pencil" at={eachOtherAt + 4} level={-35} />
      <Sfx name="el-tap" at={neitherAt + 2} level={-31} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={2} at={q2At - 4} textAt={text2At - 4} out={q3At - 6} size={58}>
          What do <Code>ref()</Code> and <Code>source()</Code> do?
        </QuestionCard>
        <QuestionCard n={3} at={q3At} textAt={text3At - 2} size={58}>
          What is the dbt lineage DAG, and how is it built?
        </QuestionCard>

        <Graph nodes={nodes} edges={edges} />

        {/* ── Question 2: the code under each box ── */}
        <Listing lines={SOURCE_DECL} x={X0} top={codeTop} width={listingWidth(SOURCE_DECL, SIZE)} size={SIZE} at={declaredAt - 2} out={codeOut} marks={[{ line: "name: orders", text: "orders", at: declaredAt + 8 }]} />
        <Listing
          lines={sourceLine}
          x={slice.stg_orders.x}
          top={codeTop}
          width={listingWidth(sourceLine, SIZE)}
          size={SIZE}
          at={stgAt + 4}
          out={codeOut}
          marks={[{ line: "source(", text: "{{ source('raw', 'orders') }}", at: throughSourceAt + 2 }]}
        />
        <Listing
          lines={swapped ? [fctLines[0], hardLine] : fctLines}
          x={slice.fct_orders.x}
          top={codeTop}
          width={listingWidth(fctLines, SIZE)}
          size={SIZE}
          at={factAt + 4}
          out={codeOut}
          ink={swapped ? { 1: ACCENT_INK } : {}}
          marks={swapped ? [{ line: "analytics.stg_orders", text: "analytics.stg_orders", at: hardAt + 6, color: MARK_RED }] : [{ line: "ref(", text: "{{ ref('stg_orders') }}", at: throughRefAt + 2 }]}
        />
        <Note at={refAt} x={slice.fct_orders.x} y={codeTop + h(132)} out={codeOut}>
          <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>
            <Code>ref</Code>: another model · <Code>source</Code>: a raw table
          </span>
        </Note>

        {/* The build order these calls give. */}
        <Note at={dependsAt} x={X0} y={orderY} out={codeOut}>
          <span style={{ ...label(22, INK), whiteSpace: "nowrap" }}>Build order</span>
        </Note>
        {(["stg_orders", "fct_orders"] as const).map((m) => {
          const bad = m === "fct_orders" ? ease(frame, beforeAt + 6, 10) : 0;
          return (
            <Note key={m} at={dependsAt + 6 + (m === "fct_orders" ? 6 : 0)} x={ORDER_X + orderIdx[m] * SLOT} y={orderY - 4} out={codeOut}>
              <span style={{ ...outlineBadgeStyle(bad > 0.5 ? "red" : "ink", 22), fontFamily: SANS }}>
                <Num>{(orderIdx[m] < 0.5 ? 1 : 2).toString()}</Num> <Code>{m}</Code>
              </span>
            </Note>
          );
        })}
        <Note at={gapAt + 2} x={gapMid - 100} y={top - h(48)} out={q3At - 2} width={200} style={{ textAlign: "center" }}>
          <span style={{ ...note(22, ACCENT_INK), fontWeight: 600, whiteSpace: "nowrap" }}>Gap in the lineage</span>
        </Note>

        {/* ── Question 3 ── */}
        <Note at={namesAt} x={slice.stg_orders.x + BIG.w + 18} y={top - h(40)} out={bothAt - 4}>
          <span style={{ fontFamily: SANS, whiteSpace: "nowrap", fontSize: 20 }}>
            <Code color={INK_SOFT}>{"{{ ref('stg_orders') }}"}</Code>
          </span>
        </Note>
        <Note at={shortAt} x={X0} y={linesY}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>
            <b>DAG:</b> <span style={{ opacity: ease(frame, directedAt, 8) }}>directed</span>{" "}
            <span style={{ opacity: ease(frame, acyclicWordAt, 8) }}>
              <Mark at={acyclicAt + 2}>acyclic</Mark>
            </span>{" "}
            <span style={{ opacity: ease(frame, graphWordAt, 8) }}>graph</span>
          </span>
        </Note>
        <Note at={twoAt} x={X0} y={countY}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>
            <b style={{ color: INK_SOFT }}>
              <Num>{GRAPH.sources.length}</Num>
            </b>{" "}
            sources
            <span style={{ opacity: ease(frame, fourAt, 8) }}>
              {" "}· <b style={{ color: BLUE_INK }}><Num>{GRAPH.models.length}</Num></b> models
            </span>
            <span style={{ opacity: ease(frame, fiveAt, 8) }}>
              {" "}· <b><Num>{GRAPH.edges.length - GRAPH.exposure.dependsOn.length}</Num></b> edges
            </span>
            <span style={{ opacity: ease(frame, stepsAt, 10) }}>
              {" "}→ <Mark at={stepsAt + 4}>
                <Num>{GRAPH.models.length}</Num> models in <Num>{GRAPH.waves.length}</Num> steps
              </Mark>
            </span>
          </span>
        </Note>

        {/* The three steps, over their columns. */}
        {(["stg_orders", "dim_customer", "fct_orders"] as const).map((m, i) => (
          <Note key={m} at={stepAt[i]} x={colMid(m) - 70} y={stepY} width={140} out={acyclicAt} style={{ textAlign: "center" }}>
            <span style={{ ...label(22, INK), whiteSpace: "nowrap" }}>Step {i + 1}</span>
          </Note>
        ))}

        {/* A cycle: neither model could go first. */}
        <Arrow points={[[fx, slice.fct_orders.cy - BIG.h / 2 - 5], [fx, loopY], [sx, loopY], [sx, top - BIG.h / 2 - 5]]} at={eachOtherAt + 4} dur={20} color={ACCENT} dash="8 8" />
        <Note at={neitherAt + 2} x={(fx + sx) / 2 - 130} y={loopY - h(46)} width={260} style={{ textAlign: "center" }}>
          <span style={{ ...note(24, ACCENT_INK), fontWeight: 600, whiteSpace: "nowrap" }}>No first model</span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
