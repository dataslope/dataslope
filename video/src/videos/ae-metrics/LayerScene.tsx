import React from "react";
import { AbsoluteFill } from "remotion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { INK, INK_SOFT, label, note } from "../../editorial/style";
import { ColumnRule, Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { inkOf } from "../../theme/brand";
import { MONO } from "../../theme/fonts";
import { LAYER_SQL } from "./data";
import { Drift, Flow, Listing, listingHeight, Node, noteLine, OK_INK, X0 } from "./parts";

const TOOLS_Y = 300;
const LAYER_Y = 440;
const MODELS_Y = 640;
const BOX_W = 220;
const BOX_GAP = 30;
const R_X = 1000;
const SQL_SIZE = 19;
const WHY_Y = 790;

/**
 * Question 5, the semantic layer: three tiers, the models at the bottom, the
 * layer in the middle and the BI tools on top. The page's completed revenue
 * is defined once in the layer, named as the page names it (one defined
 * metric, not "revenue" itself). Two requests arrive, by month and by
 * region, and the layer writes the SQL for each, its join, aggregation and
 * filter lit as they are named. The SQL is drawn, not measured (the page's
 * tables have no status); check.mjs only runs it on empty tables, so it is
 * at least valid Postgres. Then what a metric means, apart from how a
 * dashboard computes it.
 */
export const LayerScene: React.FC = () => {
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("layer").from;
  const qAt = n.word("layer", "Question");
  const textAt = n.word("layer", "What is a semantic layer");
  const governedAt = n.word("layer", "A governed, central definition");
  const modelsAt = n.word("layer", "between your models");
  const biAt = n.word("layer", "business intelligence");
  const sumAt = n.word("layer-once", "the sum of amount");
  const onceAt = n.word("layer-once", "It's defined once");
  const everyAt = n.word("layer-once", "Every tool asks the layer");
  const monthAt = n.word("layer-once", "by month");
  const regionAt = n.word("layer-once", "by region");
  const writesAt = n.word("layer-once", "the layer writes the SQL");
  const joinsAt = n.word("layer-once", "the joins");
  const aggAt = n.word("layer-once", "the aggregation");
  const filterAt = n.word("layer-once", "the filter");
  const meansAt = n.word("layer-why", "what a metric means");
  const computesAt = n.word("layer-why", "how each dashboard computes it");
  const end = n.beat("layer-why").to;

  const toolsTop = y(TOOLS_Y);
  const layerTop = y(LAYER_Y);
  const layerH = h(120);
  const modelsTop = y(MODELS_Y);
  const boxH = h(56);
  const wide = 3 * BOX_W + 2 * BOX_GAP;
  const boxX = (i: number) => X0 + i * (BOX_W + BOX_GAP);
  const mid = (i: number) => boxX(i) + BOX_W / 2;
  const tools = ["Dashboard", "Notebook", "Spreadsheet"];
  const models = ["orders", "customers", "order_items"];

  const monthTop = toolsTop + h(40);
  const monthH = listingHeight(LAYER_SQL.byMonth.length, SQL_SIZE);
  const regionLabel = monthTop + monthH + h(40);
  const regionTop = regionLabel + h(40);
  const sqlMarks = (lines: readonly string[], offset: number) => [
    ...(lines.some((l) => l.startsWith("JOIN")) ? [{ line: "JOIN", at: joinsAt + 2 + offset }] : []),
    { line: "SUM(o.amount)", text: "SUM(o.amount)", at: aggAt + 2 + offset },
    { line: "WHERE", at: filterAt + 2 + offset },
  ];
  const whyTop = y(WHY_Y);

  return (
    <AbsoluteFill>
      <Sfx name="el-pop" at={governedAt} level={-31} />
      <Sfx name="el-sprinkle" at={modelsAt + 2} level={-34} />
      <Sfx name="el-sprinkle" at={biAt + 2} level={-34} />
      <Sfx name="el-pencil" at={sumAt} level={-35} />
      <Sfx name="el-whoosh" at={monthAt - 2} level={-36} />
      <Sfx name="el-whoosh" at={regionAt - 2} level={-36} />
      <Sfx name="el-pencil" at={writesAt + 2} level={-35} />
      <Sfx name="el-tap" at={meansAt} level={-33} />
      <Sfx name="el-tap" at={computesAt} level={-33} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={5} at={qAt - 4} textAt={textAt - 4} size={62}>
          What is a semantic layer (metrics layer)?
        </QuestionCard>

        {/* ── Three tiers: tools, the layer, the models ── */}
        {tools.map((t, i) => (
          <Node key={t} x={boxX(i)} y={toolsTop} w={BOX_W} h={boxH} at={biAt + i * 3} title={t} size={23} />
        ))}
        <Node x={X0} y={layerTop} w={wide} h={layerH} at={governedAt} title="Semantic layer" size={26}>
          <Ink at={sumAt} dur={16} style={{ position: "relative", left: 0, top: 0 }}>
            <span style={{ fontFamily: MONO, fontSize: SQL_SIZE, color: INK, whiteSpace: "nowrap" }}>
              completed_revenue = SUM(amount) where status = &apos;completed&apos;
            </span>
          </Ink>
        </Node>
        <Ink at={onceAt} dur={12} style={{ left: X0 + wide + 24, top: layerTop + layerH / 2 - 16 }}>
          <span style={noteLine(22, OK_INK)}>
            <b>defined once</b>
          </span>
        </Ink>
        {models.map((m, i) => (
          <Node key={m} x={boxX(i)} y={modelsTop} w={BOX_W} h={boxH} at={modelsAt + i * 3} title={m} mono size={22} />
        ))}
        {/* Tools ask the layer; the layer writes SQL against the models. */}
        {[0, 1, 2].map((i) => (
          <Flow key={`down${i}`} points={[[mid(i), toolsTop + boxH + 6], [mid(i), layerTop - 8]]} at={i === 0 ? monthAt : i === 2 ? regionAt : everyAt} dur={10} color={i === 1 ? INK : inkOf.yellow} width={i === 1 ? 2 : 3} />
        ))}
        {[0, 1].map((i) => (
          <Flow key={`sql${i}`} points={[[mid(i), layerTop + layerH + 6], [mid(i), modelsTop - 8]]} at={writesAt + i * 6} dur={10} />
        ))}

        {/* ── Two requests, and the SQL the layer writes for each ── */}
        <Ink at={monthAt} dur={12} style={{ left: R_X, top: toolsTop - h(4) }}>
          <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>
            <b>completed revenue by month</b>
          </span>
        </Ink>
        <Listing lines={LAYER_SQL.byMonth} x={R_X} top={monthTop} width={640} size={SQL_SIZE} at={writesAt} marks={sqlMarks(LAYER_SQL.byMonth, 0)} />
        <Ink at={regionAt} dur={12} style={{ left: R_X, top: regionLabel }}>
          <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>
            <b>completed revenue by region</b>
          </span>
        </Ink>
        <Listing lines={LAYER_SQL.byRegion} x={R_X} top={regionTop} width={640} size={SQL_SIZE} at={writesAt + 8} marks={sqlMarks(LAYER_SQL.byRegion, 3)} />

        {/* ── What it means, apart from how it is computed ── */}
        <Ink at={meansAt - 2} dur={14} style={{ left: X0, top: whyTop }}>
          <div style={{ ...label(24, INK), fontWeight: 600, whiteSpace: "nowrap" }}>What it means</div>
          <div style={{ ...note(22, INK_SOFT), marginTop: 10, whiteSpace: "nowrap" }}>one definition, in the layer</div>
        </Ink>
        <ColumnRule x={X0 + 380} top={whyTop + 4} height={h(70)} at={computesAt - 2} />
        <Ink at={computesAt - 2} dur={14} style={{ left: X0 + 420, top: whyTop }}>
          <div style={{ ...label(24, INK), fontWeight: 600, whiteSpace: "nowrap" }}>How it&rsquo;s computed</div>
          <div style={{ ...note(22, INK_SOFT), marginTop: 10, whiteSpace: "nowrap" }}>written per request</div>
        </Ink>
      </Drift>
    </AbsoluteFill>
  );
};
