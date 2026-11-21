import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, INK_SOFT } from "../../editorial/style";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { GRAPH, selection, SELECTORS } from "./data";
import { Code, Drift, edgeKey, Graph, type GEdge, type GNode, Line, Listing, listingWidth, nodeOf, sliceLayout, SLICE_EDGE, type ToneCue, X0 } from "./parts";

const SIZE = 21;
const READ_X = 900;

/**
 * Question 8. The page's three selectors (its listing's three commands),
 * each marked as the narration names a model, a folder and a tag; the slice
 * below. A model selected alone lights alone; its two parents are read as
 * they stand (dashed), and in a fresh development schema the dimension is
 * not there yet (red). `+fct_orders` builds all four, step by step;
 * `fct_orders+`, beside it, the fact and the dashboard.
 */
export const SubsetScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("subset").from;
  const qAt = n.word("subset", "Question eight");
  const textAt = n.word("subset", "How do you run only a subset");
  const flagAt = n.word("subset", "With the select flag on dbt run");
  const nameAt = n.word("subset", "a model's name");
  const folderAt = n.word("subset", "a folder like marts");
  const tagAt = n.word("subset", "a tag like nightly");
  const aloneAt = n.word("subset-alone", "A model selected alone");
  const rebuiltAt = n.word("subset-alone", "is rebuilt alone");
  const parentsAt = n.word("subset-alone", "Its parents are read");
  const freshAt = n.word("subset-alone", "in a fresh development schema");
  const notYetAt = n.word("subset-alone", "they may not exist yet");
  const frontAt = n.word("subset-plus", "A plus in front adds everything upstream");
  const fourAt = n.word("subset-plus", "all four models build");
  const orderAt = n.word("subset-plus", "in order");
  const afterAt = n.word("subset-plus", "A plus after adds everything downstream");
  // The upstream selection holds, all four lit, until the downstream one is
  // named: about 2.7 s, not the 1.3 s it had when it cleared on "A plus".
  const downAt = n.word("subset-plus", "adds everything downstream");
  const q4At = n.word("subset-plus", "which is how question four counted a change");
  const end = n.beat("subset-plus").to;

  // The page's three commands, without their comments.
  const cmds = SELECTORS.filter((l) => l.startsWith("dbt "));
  const listTop = y(300);
  const top = y(536);
  const row = h(80);
  const slice = sliceLayout({ left: X0, top, row });

  const up = selection("+fct_orders");
  const down = selection("fct_orders+");
  const wave = (m: string) => GRAPH.waves.findIndex((w) => w.includes(m));
  const upAt = (m: string) => fourAt + 2 + wave(m) * 8;
  const parents = GRAPH.edges.filter(([, b]) => b === "fct_orders").map(([a]) => a);
  const missing = "dim_customer";

  const tones = (id: string): ToneCue[] => {
    const t: ToneCue[] = [];
    if (id === "fct_orders") t.push({ at: rebuiltAt, tone: "lit" }, { at: frontAt, tone: "plain" });
    if (id === missing) t.push({ at: notYetAt, tone: "bad" }, { at: frontAt, tone: "plain" });
    if ((up.models as string[]).includes(id)) t.push({ at: upAt(id), tone: "data" }, { at: downAt, tone: "plain" });
    if (id === "fct_orders" || down.exposures.map(nodeOf).includes(id)) t.push({ at: downAt + 6 + (id === "fct_orders" ? 0 : 8), tone: "lit" });
    return t;
  };
  const nodeIds = ["raw.orders", "raw.customers", "stg_orders", "stg_customers", "dim_customer", "fct_orders", "dashboard"] as const;
  const nodes: GNode[] = nodeIds.map((id, i) => ({
    id,
    slot: slice[id],
    at: flagAt + 4 + i * 2,
    base: id.startsWith("raw.") ? "soft" : "plain",
    tones: tones(id),
    dashed: parents.includes(id) ? ([parentsAt + 2, frontAt] as const) : undefined,
    ...(id === "dashboard" ? { exposure: true, title: "Revenue Dashboard" } : {}),
  }));
  const edges: GEdge[] = GRAPH.edges.map(([a, b], i) => ({
    from: a,
    to: nodeOf(b),
    at: flagAt + 10 + i * 2,
    ...SLICE_EDGE[edgeKey(a, nodeOf(b))],
  }));

  const notesY = top + 2 * row + h(62);
  const parentMid = (id: string) => slice[id as "stg_orders"].x;

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={flagAt} level={-35} />
      <Sfx name="el-tap" at={nameAt + 2} level={-33} />
      <Sfx name="el-tap" at={folderAt + 2} level={-33} />
      <Sfx name="el-tap" at={tagAt + 2} level={-33} />
      <Sfx name="el-tap" at={rebuiltAt} level={-31} />
      <Sfx name="el-tap" at={notYetAt} level={-31} />
      {[0, 1, 2].map((k) => (
        <Sfx key={k} name="el-tap" at={fourAt + 2 + k * 8} level={-33} />
      ))}
      <Sfx name="el-tap" at={downAt + 6} level={-32} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={8} at={qAt - 4} textAt={textAt - 4} size={58}>
          How do you run only a subset of models in dbt?
        </QuestionCard>

        <Listing
          lines={cmds}
          x={X0}
          top={listTop}
          width={listingWidth(cmds, SIZE)}
          size={SIZE}
          at={flagAt}
          marks={[
            { line: "+fct_orders", text: "fct_orders", at: nameAt + 2 },
            { line: "marts", text: "marts", at: folderAt + 2 },
            { line: "tag:nightly", text: "tag:nightly", at: tagAt + 2 },
          ]}
        />

        {/* What runs, as it is said. */}
        <Line at={aloneAt} x={READ_X} y={listTop + h(6)} size={26} out={frontAt - 4}>
          <Code>dbt run --select fct_orders</Code>
        </Line>
        <Line at={rebuiltAt + 4} x={READ_X} y={listTop + h(54)} color={INK_SOFT} out={frontAt - 4}>
          Rebuilt alone
        </Line>
        <Line at={frontAt} x={READ_X} y={listTop + h(6)} size={26} dim={downAt}>
          <Code>--select +fct_orders</Code>
        </Line>
        <Line at={fourAt} x={READ_X} y={listTop + h(54)} color={INK_SOFT} dim={downAt}>
          All {up.models.length} models<span style={{ opacity: ease(frame, orderAt, 10) }}>, in order</span>
        </Line>
        <Line at={afterAt} x={READ_X + 420} y={listTop + h(6)} size={26}>
          <Code>--select fct_orders+</Code>
        </Line>
        <Line at={downAt + 8} x={READ_X + 420} y={listTop + h(54)} color={INK_SOFT}>
          The fact, and the dashboard it reaches
        </Line>
        <Line at={q4At} x={READ_X} y={listTop + h(54) + h(40)} color={INK_SOFT}>
          Question 4&rsquo;s count of what a change rebuilds
        </Line>

        <Graph nodes={nodes} edges={edges} />

        {/* The parents, as they stand. */}
        <Line at={parentsAt + 4} x={parentMid("stg_orders")} y={notesY} out={frontAt - 4} color={INK_SOFT}>
          Parents: read as they stand in your schema
        </Line>
        <Line at={freshAt} x={parentMid("dim_customer")} y={notesY + h(40)} out={frontAt - 4} color={ACCENT_INK} weight={600}>
          <span style={{ opacity: 1 }}>In a fresh dev schema: </span>
          <span style={{ opacity: ease(frame, notYetAt, 10) }}>
            <Code>{missing}</Code> not built yet
          </span>
        </Line>
      </Drift>
    </AbsoluteFill>
  );
};
