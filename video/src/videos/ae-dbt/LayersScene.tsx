import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { INK, INK_SOFT, label, note } from "../../editorial/style";
import { Badge, Note, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ds } from "../../theme/brand";
import { SANS } from "../../theme/fonts";
import { GRAPH, selection } from "./data";
import { Code, DASH_W, Drift, edgeKey, Graph, type GEdge, type GNode, HRule, Mark, MODEL_W, nodeOf, type Slot, type ToneCue, X0 } from "./parts";

const COL = [X0, 560, 1000];
const COL_W = 400;
const INT_W = 268;
const LIT = ds("yellow", 600);

/**
 * Question 4. The slice regrouped into the three layers, each under its own
 * heading rule: staging (the two staging models), intermediate (empty on the
 * page's slice; the page's ephemeral int_orders_cleaned is drawn there,
 * dashed), marts (the dimension and the fact), and the dashboard they feed.
 * Each column's rule from the page inks in under it as it is said. Then what
 * a change costs: `stg_customers+` lights the three models downstream of it
 * and the dashboard they reach, `fct_orders+` only the fact and the
 * dashboard (an exposure is selected, never built, so the line says the
 * change reaches it, not that it rebuilds it). Last, how
 * often each layer changes, beside its heading.
 */
export const LayersScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("layers").from;
  const qAt = n.word("layers", "Question four");
  const textAt = n.word("layers", "How do staging");
  const stagingAt = n.word("layers", "Staging has one model per source table");
  const renamingAt = n.word("layers", "renaming, typing");
  const noLogicAt = n.word("layers", "with no business logic");
  const intAt = n.word("layers", "Intermediate holds reusable business logic");
  const joinsAt = n.word("layers", "joins and reshaping");
  const martsAt = n.word("layers", "Marts are the finished facts");
  const readAt = n.word("layers", "that dashboards read");
  const smallAt = n.word("layers-dry", "small");
  const testableAt = n.word("layers-dry", "testable");
  const onceAt = n.word("layers-dry", "written once");
  const costAt = n.word("layers-cost", "what a change costs");
  const plusAt = n.word("layers-cost", "Select a model with a plus after it");
  const downAt = n.word("layers-cost", "builds everything downstream");
  const custAt = n.word("layers-cost", "From the customers staging model");
  const threeAt = n.word("layers-cost", "three of the four models");
  const dashAt = n.word("layers-cost", "all the way to the revenue dashboard");
  const factAt = n.word("layers-cost", "From the orders fact");
  const oneAt = n.word("layers-cost", "it's one");
  const weeklyAt = n.word("layers-rule", "which changes every week");
  const downstreamAt = n.word("layers-rule", "in intermediate models and marts");
  const lessAt = n.word("layers-rule", "where a change rebuilds less");
  const rarelyAt = n.word("layers-rule", "which rarely changes");
  const end = n.beat("layers-rule").to;

  const headY = y(270);
  const ruleY = headY + h(44);
  const top = y(392);
  const row = h(70);
  const slot: Record<string, Slot> = {
    stg_orders: { x: COL[0], cy: top, w: MODEL_W },
    stg_customers: { x: COL[0], cy: top + 2 * row, w: MODEL_W },
    int_orders_cleaned: { x: COL[1], cy: top + row, w: INT_W },
    fct_orders: { x: COL[2], cy: top, w: MODEL_W },
    dim_customer: { x: COL[2], cy: top + 2 * row, w: MODEL_W },
    dashboard: { x: 1446, cy: top + row, w: DASH_W },
  };

  // ── What a change costs: each selector's models, lit down the graph ──
  const sel = [
    { s: selection("stg_customers+"), at: custAt + 4, out: factAt - 2 },
    { s: selection("fct_orders+"), at: factAt + 4, out: end + 100 },
  ];
  /** How far down from the selected model a box sits, for the cascade. */
  const depth: Record<string, number> = { stg_customers: 0, dim_customer: 1, fct_orders: 2, dashboard: 3 };
  const litCues = (id: string): ToneCue[] =>
    sel.flatMap(({ s, at, out }) => {
      const picked = [...s.models, ...s.exposures.map(nodeOf)];
      if (!picked.includes(id)) return [];
      const base = depth[s.models[0]] ?? 0;
      const lit = id === "dashboard" ? Math.max(at + (depth.dashboard - base) * 7, s.models.length > 1 ? dashAt : at + 7) : at + ((depth[id] ?? 0) - base) * 7;
      return [
        { at: lit, tone: "lit" as const },
        { at: out, tone: "plain" as const },
      ];
    });
  const litEdge = (a: string, b: string) =>
    sel.flatMap(({ s, at, out }) => {
      const picked = [...s.models, ...s.exposures.map(nodeOf)];
      if (!picked.includes(a) || !picked.includes(b)) return [];
      const base = depth[s.models[0]] ?? 0;
      return [
        { at: at + ((depth[b] ?? 0) - base) * 7 - 3, color: LIT },
        { at: out, color: INK },
      ];
    });

  const nodes: GNode[] = [
    { id: "stg_orders", slot: slot.stg_orders, at: stagingAt + 2, tones: litCues("stg_orders") },
    { id: "stg_customers", slot: slot.stg_customers, at: stagingAt + 6, tones: litCues("stg_customers") },
    { id: "int_orders_cleaned", slot: slot.int_orders_cleaned, at: intAt + 4, dashed: true, base: "soft" },
    { id: "fct_orders", slot: slot.fct_orders, at: martsAt + 2, tones: litCues("fct_orders") },
    { id: "dim_customer", slot: slot.dim_customer, at: martsAt + 6, tones: litCues("dim_customer") },
    { id: "dashboard", slot: slot.dashboard, at: readAt, exposure: true, title: "Revenue Dashboard", tones: litCues("dashboard") },
  ];
  const edgeAt: Record<string, number> = {
    [edgeKey("stg_orders", "fct_orders")]: martsAt + 8,
    [edgeKey("stg_customers", "dim_customer")]: martsAt + 12,
    [edgeKey("dim_customer", "fct_orders")]: martsAt + 16,
    [edgeKey("fct_orders", "weekly_revenue_dashboard")]: readAt + 6,
    [edgeKey("dim_customer", "weekly_revenue_dashboard")]: readAt + 10,
  };
  const route: Record<string, Pick<GEdge, "fromPort" | "toPort">> = {
    [edgeKey("dim_customer", "fct_orders")]: { fromPort: { side: "top" }, toPort: { side: "bottom" } },
    [edgeKey("fct_orders", "weekly_revenue_dashboard")]: { toPort: { side: "left", d: -12 } },
    [edgeKey("dim_customer", "weekly_revenue_dashboard")]: { toPort: { side: "left", d: 12 } },
  };
  const edges: GEdge[] = GRAPH.edges
    .filter(([a, b]) => edgeAt[edgeKey(a, b)] !== undefined)
    .map(([a, b]) => ({ from: a, to: nodeOf(b), at: edgeAt[edgeKey(a, b)], tones: litEdge(a, nodeOf(b)), ...route[edgeKey(a, b)] }));

  // ── The columns' rules, from the page ──
  const rulesY = top + 2 * row + h(50);
  const LINE = h(28);
  const rules: { col: number; lines: { t: string; at: number }[] }[] = [
    { col: 0, lines: [{ t: "One model per source table", at: stagingAt + 4 }, { t: "Renaming, typing, light cleaning", at: renamingAt }, { t: "No business logic", at: noLogicAt }] },
    { col: 1, lines: [{ t: "Reusable business logic", at: intAt + 6 }, { t: "Joins and reshaping", at: joinsAt }] },
    { col: 2, lines: [{ t: "Finished facts and dimensions", at: martsAt + 4 }, { t: "Read by dashboards", at: readAt + 2 }] },
  ];
  const heads = [
    { t: "Staging", at: stagingAt - 4, badge: { t: "Changes rarely", tone: "gray" as const, at: rarelyAt } },
    { t: "Intermediate", at: intAt - 2, badge: { t: "Changes weekly", tone: "yellow" as const, at: downstreamAt } },
    { t: "Marts", at: martsAt - 2, badge: { t: "Changes weekly", tone: "yellow" as const, at: downstreamAt + 6 } },
  ];

  const dryY = rulesY + 3 * LINE + h(30);
  const selY = dryY + h(52);

  return (
    <AbsoluteFill>
      {heads.map((hd, i) => (
        <Sfx key={i} name="el-pencil" at={hd.at} level={-36} />
      ))}
      <Sfx name="el-tap" at={readAt} level={-32} />
      <Sfx name="el-tap" at={plusAt} level={-32} />
      {[0, 1, 2, 3].map((k) => (
        <Sfx key={k} name="el-tap" at={custAt + 4 + k * 7} level={-33 - k} />
      ))}
      <Sfx name="el-tap" at={factAt + 4} level={-32} />
      <Sfx name="el-chime" at={oneAt + 4} level={-34} />
      <Sfx name="el-pop" at={downstreamAt} level={-33} />
      <Sfx name="el-pop" at={rarelyAt} level={-33} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={4} at={qAt - 4} textAt={textAt - 4} size={58}>
          How do staging, intermediate, and mart layers differ?
        </QuestionCard>

        {/* The three layers, each under its heading rule. */}
        {heads.map((hd, i) => (
          <React.Fragment key={hd.t}>
            <Note at={hd.at} x={COL[i]} y={headY}>
              <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 26, whiteSpace: "nowrap" }}>
                <span style={{ ...label(26, INK), fontWeight: 600 }}>{hd.t}</span>
                <Badge tone={hd.badge.tone} size={24} style={{ fontFamily: SANS, opacity: ease(frame, hd.badge.at, 10), transform: `translateY(${(1 - ease(frame, hd.badge.at, 10)) * 6}px)` }}>
                  {hd.badge.t}
                </Badge>
              </div>
            </Note>
            <HRule x={COL[i]} y={ruleY} width={COL_W - 10} at={hd.at + 2} color={INK} weight={1.5} />
          </React.Fragment>
        ))}
        {rules.map((r) =>
          r.lines.map((l, k) => (
            <Note key={`${r.col}-${k}`} at={l.at} x={COL[r.col]} y={rulesY + k * LINE}>
              <span style={{ ...note(22, k === 0 ? INK : INK_SOFT), whiteSpace: "nowrap" }}>{l.t}</span>
            </Note>
          )),
        )}

        <Graph nodes={nodes} edges={edges} />

        {/* Small, testable, written once. */}
        <Note at={smallAt - 4} x={X0} y={dryY}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>
            Each step: <Mark at={smallAt}>small,</Mark> <Mark at={testableAt}>testable,</Mark> <Mark at={onceAt}>written once</Mark>
          </span>
        </Note>

        {/* What a change costs. */}
        <Note at={costAt} x={X0} y={selY}>
          <span style={{ ...label(22, INK), whiteSpace: "nowrap" }}>What a change rebuilds</span>
        </Note>
        {sel.map(({ s }, i) => {
          const down = s.models.length;
          return (
            <Note key={s.selector} at={i === 0 ? plusAt + 4 : factAt} x={X0} y={selY + h(40) + i * h(38)} dim={i === 0 ? factAt : undefined}>
              <span style={{ ...note(24, INK), whiteSpace: "nowrap", display: "inline-flex", gap: "0.5em", fontSize: 24 }}>
                <Code>dbt build --select {s.selector}</Code>
                <span style={{ opacity: ease(frame, i === 0 ? threeAt : oneAt, 10) }}>
                  →{" "}
                  <b>
                    <Num>{down}</Num> of <Num>{GRAPH.models.length}</Num> models
                  </b>
                  <span style={{ color: INK_SOFT }}>, reaching the dashboard</span>
                </span>
              </span>
            </Note>
          );
        })}
        <Note at={downAt} x={X0 + 640} y={selY} out={custAt}>
          <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>A plus after it: everything downstream</span>
        </Note>
        <Note at={weeklyAt} x={X0} y={selY + h(40) + 2 * h(38) + h(10)}>
          <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>Logic that changes weekly sits downstream, <span style={{ opacity: ease(frame, lessAt, 10) }}>where a change rebuilds less</span></span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
