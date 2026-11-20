import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { BAR, BLUE_INK, INK, INK_SOFT, PAPER, label, note } from "../../editorial/style";
import { Note, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { GRAPH } from "./data";
import { artBox, BIG, Drift, edgeKey, Graph, type GEdge, type GNode, Headline, Kicker, lerpLayout, Mark, MODELS, SERIES, sliceLayout, SLICE_EDGE, type Slot, Spot, X0 } from "./parts";

/** The plan: ten worked through, ten quick. */
const SQ = 44;
const SMALL = 30;
/** Questions in the round: ten worked through, the rest quick. */
const ROUND = 20;

/**
 * The opening: the page's four models as outlined boxes, in no order, the
 * weaver bird beside them; each is built from others, so they must run in
 * order. On "working out that order" they slide into build order and their
 * edges draw in; on "running it" each step lights as it builds. Then the
 * round: twenty questions, ten big and ten small.
 */
export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const nightAt = n.word("hook", "Every night");
  const modelsAt = n.word("hook", "rebuilds its models");
  const stagingAt = n.word("hook", "the cleaned staging tables");
  const factsAt = n.word("hook", "the facts and dimensions");
  const dimsAt = n.word("hook", "dimensions that dashboards read");
  const othersAt = n.word("hook", "Each one is built from others");
  const orderAt = n.word("hook", "in the right order");
  const workAt = n.word("hook-dbt", "Working out that order");
  const runAt = n.word("hook-dbt", "and running it");
  const jobAt = n.word("hook-dbt", "is dbt's job");
  const twentyAt = n.word("plan", "Twenty questions");
  const tenAt = n.word("plan", "ten worked through");
  const quickAt = n.word("plan", "ten quick ones");
  const end = n.beat("plan").to;

  const top = y(372);
  const ordered = sliceLayout({ left: X0, top, sources: false, pitch: BIG.pitch, w: BIG.w, row: h(92) });
  // In no order: the fact first, the staging models apart, before dbt has
  // read a single ref.
  const loose: Record<string, Slot> = {
    ...ordered,
    fct_orders: { x: X0 + 10, cy: top - 6, w: ordered.fct_orders.w },
    stg_customers: { x: X0 + 520, cy: top - 20, w: ordered.stg_customers.w },
    dim_customer: { x: X0 + 150, cy: top + 150, w: ordered.dim_customer.w },
    stg_orders: { x: X0 + 600, cy: top + 120, w: ordered.stg_orders.w },
  };
  const slide = ease(frame, workAt, 24);
  const at = lerpLayout(loose, ordered, slide);
  // A loose box drifts a little where it stands, until it is put in its place.
  const sway = (i: number) => Math.sin((frame + i * 37) / 26) * 4 * (1 - slide);
  const wave = (m: string) => GRAPH.waves.findIndex((w) => w.includes(m));
  const builtAt = (m: string) => runAt + 4 + wave(m) * 10;

  const appear: Record<string, number> = {
    stg_orders: stagingAt + 4,
    stg_customers: stagingAt + 10,
    fct_orders: factsAt + 4,
    dim_customer: dimsAt,
  };
  const nodes: GNode[] = MODELS.map((m, i) => ({
    id: m,
    slot: { ...at[m], cy: at[m].cy + sway(i) },
    size: BIG.size,
    h: BIG.h,
    at: appear[m],
    tones: [
      { at: othersAt + i * 3, tone: "lit" as const },
      { at: orderAt, tone: "plain" as const },
      { at: builtAt(m), tone: "data" as const },
    ],
  }));
  const modelEdges = GRAPH.edges.filter(([a, b]) => MODELS.includes(a as (typeof MODELS)[number]) && MODELS.includes(b as (typeof MODELS)[number]));
  const edges: GEdge[] = modelEdges.map(([a, b], i) => ({ from: a, to: b, at: workAt + 22 + i * 6, ...SLICE_EDGE[edgeKey(a, b)] }));

  const bird = artBox("weaver-bird", 470);
  const lineY = top + 2 * h(92) + h(70);
  const planTop = y(790);
  const stepY = top - h(70);
  const colX = [ordered.stg_orders, ordered.dim_customer, ordered.fct_orders].map((s) => s.x + s.w / 2);

  return (
    <AbsoluteFill>
      <Sfx name="el-pop" at={modelsAt} level={-30} />
      {MODELS.map((m) => (
        <Sfx key={m} name="el-tap" at={appear[m]} level={-33} />
      ))}
      <Sfx name="el-whoosh" at={workAt} level={-34} />
      <Sfx name="el-pencil" at={workAt + 22} level={-35} />
      {GRAPH.waves.map((_, i) => (
        <Sfx key={i} name="el-tap" at={runAt + 4 + i * 10} level={-31} />
      ))}
      <Sfx name="el-sprinkle" at={tenAt} level={-32} />
      <Sfx name="el-chime" at={twentyAt} level={-33} />

      <Drift from={0} to={end + 20}>
        <Kicker at={nightAt}>{SERIES} · dbt</Kicker>
        <Headline lead="Every night, the models rebuild," turn="in the right order." at={nightAt + 2} turnAt={orderAt} size={64} />

        <Graph nodes={nodes} edges={edges} />

        {/* The build steps, over their columns, as each one runs. */}
        {colX.map((cx, i) => (
          <Note key={i} at={runAt + 4 + i * 10} x={cx - 60} y={stepY} width={120} style={{ textAlign: "center" }}>
            <span style={{ ...label(21, INK_SOFT), whiteSpace: "nowrap" }}>Step {i + 1}</span>
          </Note>
        ))}

        <Note at={workAt + 8} x={X0} y={lineY}>
          <span style={{ ...note(28, INK), whiteSpace: "nowrap" }}>
            Working out that order, and running it: <Mark at={jobAt}>dbt&rsquo;s job</Mark>
          </span>
        </Note>

        <Spot id="weaver-bird" at={modelsAt} left={1290} top={y(300)} {...bird} />

        {/* The round: twenty questions, ten big and ten small. */}
        <div style={{ position: "absolute", left: X0, top: planTop, display: "flex", alignItems: "center", gap: 10, fontSize: 21 }}>
          {Array.from({ length: ROUND }, (_, i) => {
            const big = i < 10;
            const a = big ? tenAt + i * 2 : quickAt + (i - 10) * 2;
            const p = ease(frame, Math.max(a, twentyAt), 8);
            const s = big ? SQ : SMALL;
            return (
              <React.Fragment key={i}>
                {i === 10 ? <span style={{ width: 18 }} /> : null}
                <span
                  style={{
                    width: s,
                    height: s,
                    borderRadius: 5,
                    boxSizing: "border-box",
                    border: `2px solid ${big ? BAR : INK_SOFT}`,
                    background: PAPER,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    ...label(big ? 21 : 19, BLUE_INK),
                    fontWeight: 500,
                    opacity: p,
                    transform: `scale(${0.6 + 0.4 * p})`,
                  }}
                >
                  {big ? i + 1 : ""}
                </span>
              </React.Fragment>
            );
          })}
        </div>
        <Note at={tenAt + 6} x={X0} y={planTop + SQ + h(16)}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            <b style={{ color: BLUE_INK }}>
              <Num>10</Num>
            </b>{" "}
            worked through
          </span>
        </Note>
        <Note at={quickAt + 6} x={X0 + 10 * (SQ + 10) + 18} y={planTop + SQ + h(16)}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            <b style={{ color: INK }}>
              <Num>{ROUND - 10}</Num>
            </b>{" "}
            quick
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
