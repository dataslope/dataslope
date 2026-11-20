import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ease, pop } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { BAR, BLUE_INK, INK, INK_SOFT, label, note } from "../../editorial/style";
import { ColumnRule, Ink, Num, OutlineBadge } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { MONO, SANS } from "../../theme/fonts";
import { BY_ORDER, money } from "./data";
import { DataTable, Drift, Flow, Mark, Mono, noteLine, OK_INK, TableName, tableGeometry, X0 } from "./parts";

const COLS_Y = 290;
const COL_W = 500;
const COL_GAP = 60;
const RUN_Y = 500;
const MID_X = 690;
const TABLE_X = 1150;

type Role = { role: string; name: string; at: number };

/**
 * A semantic model drawn as a diagram's box (an ink outline, no fill): the
 * table's name, then each declared column's role and name, one per line,
 * each inking in on its own cue.
 */
const ModelBox: React.FC<{ x: number; y: number; w: number; at: number; name: string; rows: readonly Role[]; lit?: number }> = ({ x, y, w, at, name, rows, lit }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(frame, at, fps, 16);
  if (frame < at || p <= 0.001) return null;
  const glow = lit === undefined ? 0 : ease(frame, lit, 10);
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        boxSizing: "border-box",
        border: `2px solid ${glow > 0.5 ? BAR : INK}`,
        borderRadius: 8,
        padding: "16px 22px 18px",
        opacity: Math.min(1, p),
        transform: `scale(${0.94 + 0.06 * Math.min(1, p)})`,
        transformOrigin: "0 0",
      }}
    >
      <div style={{ fontFamily: MONO, fontSize: 23, fontWeight: 500, color: INK, whiteSpace: "nowrap" }}>{name}</div>
      {rows.map((r) => (
        <div key={r.role + r.name} style={{ display: "flex", alignItems: "baseline", gap: "0.6em", fontSize: 21, marginTop: 12, opacity: ease(frame, r.at, 10), whiteSpace: "nowrap" }}>
          <span style={{ fontFamily: SANS, fontSize: 21, fontWeight: 500, color: BLUE_INK, width: 116 }}>{r.role}</span>
          <span style={{ fontFamily: MONO, fontSize: 21, color: INK }}>{r.name}</span>
        </div>
      ))}
    </div>
  );
};

/**
 * Question 6: entities, dimensions and measures, three columns filled as
 * each is read. Then the page's two tables declared as semantic models:
 * revenue lives on orders, units on order_items, both keyed by the order
 * entity. Asked for both by order, the layer sums each at its own grain and
 * then joins: twelve rows, 1,949.25 and 38, the page's own fix run per order
 * (the shape of SQL the page says a layer writes, not MetricFlow's output).
 */
export const EntitiesScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("entities").from;
  const qAt = n.word("entities", "Question");
  const textAt = n.word("entities", "What are entities");
  const cols = [
    {
      title: "Entities",
      line: "The join keys; they set the grain",
      examples: ["order", "customer"],
      at: n.word("entities", "Entities are the join keys"),
      lineAt: n.word("entities", "they set the grain"),
      exAt: n.word("entities", "an order, a customer"),
    },
    {
      title: "Dimensions",
      line: "What you group and filter by",
      examples: ["status", "region", "date"],
      at: n.word("entities", "Dimensions are what you group"),
      lineAt: n.word("entities", "group and filter by"),
      exAt: n.word("entities", "status, region, date"),
    },
    {
      title: "Measures",
      line: "What you aggregate",
      examples: ["amount", "count"],
      at: n.word("entities", "Measures are what you aggregate"),
      lineAt: n.word("entities", "what you aggregate"),
      exAt: n.word("entities", "an amount, a count"),
    },
  ];
  const triadAt = n.word("entities-dbt", "That triad is LookML's");
  const originalAt = n.word("entities-dbt", "the original MetricFlow spec's");
  const currentAt = n.word("entities-dbt", "In dbt's current spec");
  const foldedAt = n.word("entities-dbt", "the measure is folded into a simple metric");
  const declaredAt = n.word("entities-run", "Declared on the page's two tables");
  const entitiesRunAt = n.beat("entities-run").from;
  const revenueAt = n.word("entities-run", "revenue lives on orders");
  const unitsOnAt = n.word("entities-run", "units on items");
  const askAt = n.word("entities-run", "Ask for both by order");
  const grainAt = n.word("entities-run", "it sums each at its own grain");
  const joinsAt = n.word("entities-run", "before it joins");
  const totalAt = n.word("entities-run", "nineteen hundred forty-nine dollars");
  const units38At = n.word("entities-run", "thirty-eight units");
  const noFanAt = n.word("entities-run", "with no fan trap");
  const end = n.beat("entities-run").to;

  const colsTop = y(COLS_Y);
  const colX = (i: number) => X0 + i * (COL_W + COL_GAP);
  const runTop = y(RUN_Y);
  const result = BY_ORDER.query.result;
  const tg = tableGeometry({
    x: TABLE_X,
    // Below the measures column's dbt note, which sits over its name.
    top: runTop + h(44),
    cols: result.cols.map((name) => ({ name })),
    rows: result.rows,
    headH: h(34),
    rowH: h(25),
    headSize: 20,
    bodySize: 20,
    pad: 16,
  });
  const ordersTop = runTop;
  const itemsTop = runTop + h(200);
  const stepTop = (i: number) => runTop + h(64) + i * h(46);

  return (
    <AbsoluteFill>
      {cols.map((c) => (
        <Sfx key={c.title} name="el-tap" at={c.at} level={-33} />
      ))}
      <Sfx name="el-pop" at={declaredAt} level={-31} />
      <Sfx name="el-pencil" at={grainAt} level={-35} />
      <Sfx name="el-sprinkle" at={joinsAt + 4} level={-34} />
      <Sfx name="el-tap" at={totalAt} level={-32} />
      <Sfx name="el-chime" at={noFanAt + 4} level={-33} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={6} at={qAt - 4} textAt={textAt - 4} size={62}>
          What are entities, dimensions, and measures in a semantic model?
        </QuestionCard>

        {/* ── Three roles a column can play ── */}
        {cols.map((c, i) => (
          <React.Fragment key={c.title}>
            {i > 0 ? <ColumnRule x={colX(i) - COL_GAP / 2} top={colsTop + 4} height={h(118)} at={c.at} /> : null}
            <Ink at={c.at - 2} dur={14} style={{ left: colX(i), top: colsTop }}>
              <div style={{ ...label(28, INK), fontWeight: 600, whiteSpace: "nowrap" }}>
                {i === 2 ? (
                  <Mark at={currentAt} out={entitiesRunAt}>
                    {c.title}
                  </Mark>
                ) : (
                  c.title
                )}
              </div>
            </Ink>
            <Ink at={c.lineAt} dur={14} style={{ left: colX(i), top: colsTop + h(46) }}>
              <div style={{ ...note(23, INK_SOFT), whiteSpace: "nowrap" }}>{c.line}</div>
            </Ink>
            <div style={{ position: "absolute", left: colX(i), top: colsTop + h(92), display: "flex", gap: 12, fontSize: 22 }}>
              {c.examples.map((e, k) => (
                <OutlineBadge key={e} tone="blue" size={22} style={{ fontFamily: MONO, opacity: ease(frame, c.exAt + k * 5, 10) }}>
                  {e}
                </OutlineBadge>
              ))}
            </div>
          </React.Fragment>
        ))}

        {/* ── Whose triad it is, and where dbt puts the measure now ── */}
        <Ink at={triadAt} dur={14} style={{ left: X0, top: colsTop + h(146) }}>
          <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>
            LookML&rsquo;s triad
            <span style={{ opacity: ease(frame, originalAt, 12) }}>, and the original MetricFlow spec&rsquo;s</span>
          </span>
        </Ink>
        <Ink at={foldedAt} dur={14} style={{ left: colX(2), top: colsTop + h(146) }}>
          <span style={{ ...note(22, BLUE_INK), whiteSpace: "nowrap" }}>In dbt today: inside a simple metric</span>
        </Ink>

        {/* ── The page's two tables, declared ── */}
        <ModelBox
          x={X0}
          y={ordersTop}
          w={470}
          at={declaredAt}
          name="orders"
          rows={[
            { role: "entity", name: "order", at: declaredAt + 6 },
            { role: "measure", name: "revenue = SUM(amount)", at: revenueAt },
          ]}
          lit={grainAt}
        />
        <ModelBox
          x={X0}
          y={itemsTop}
          w={470}
          at={declaredAt + 6}
          name="order_items"
          rows={[
            { role: "entity", name: "order", at: declaredAt + 12 },
            { role: "dimension", name: "item", at: declaredAt + 16 },
            { role: "measure", name: "units = SUM(qty)", at: unitsOnAt },
          ]}
          lit={grainAt + 6}
        />

        {/* ── Both by order: each at its own grain, then the join ── */}
        <Ink at={askAt} dur={12} style={{ left: MID_X, top: runTop }}>
          <span style={{ ...note(23, INK), whiteSpace: "nowrap", background: `color-mix(in srgb, var(--ds-yellow-300) ${55 * ease(frame, askAt + 4, 10)}%, transparent)`, padding: "2px 8px", margin: "0 -8px" }}>
            <b>revenue and units by order</b>
          </span>
        </Ink>
        <Ink at={grainAt} dur={12} style={{ left: MID_X, top: stepTop(0) }}>
          <span style={noteLine(22, BLUE_INK)}>
            <Mono>SUM(amount)</Mono> per order, on orders
          </span>
        </Ink>
        <Ink at={grainAt + 8} dur={12} style={{ left: MID_X, top: stepTop(1) }}>
          <span style={noteLine(22, BLUE_INK)}>
            <Mono>SUM(qty)</Mono> per order, on order_items
          </span>
        </Ink>
        <Ink at={joinsAt} dur={12} style={{ left: MID_X, top: stepTop(2) }}>
          <span style={noteLine(22, INK)}>then joined on the order</span>
        </Ink>
        <Flow points={[[MID_X + 300, stepTop(2) + h(16)], [TABLE_X - 24, stepTop(2) + h(16)]]} at={joinsAt + 6} dur={10} />

        <TableName g={tg} at={joinsAt + 4}>
          <span style={{ fontSize: 21 }}>by order</span>
        </TableName>
        <DataTable
          g={tg}
          cols={result.cols.map((name) => ({ name, numeric: true }))}
          at={joinsAt + 4}
          rows={result.rows.map((cells, i) => ({ cells, at: joinsAt + 8 + i * 2 }))}
        />
        <Ink at={totalAt} dur={12} style={{ left: tg.right + 50, top: tg.top + h(60) }}>
          <div style={{ ...noteLine(23, INK_SOFT) }}>
            <Num>{BY_ORDER.orders}</Num> rows
          </div>
        </Ink>
        <Ink at={totalAt + 4} dur={12} style={{ left: tg.right + 50, top: tg.top + h(110) }}>
          <div style={{ ...noteLine(26, OK_INK) }}>
            <b>
              <Num>{money(BY_ORDER.revenue)}</Num>
            </b>
          </div>
        </Ink>
        <Ink at={units38At} dur={12} style={{ left: tg.right + 50, top: tg.top + h(160) }}>
          <div style={{ ...noteLine(26, OK_INK) }}>
            <b>
              <Num>{BY_ORDER.units}</Num> units
            </b>
          </div>
        </Ink>
        <Ink at={noFanAt} dur={12} style={{ left: tg.right + 50, top: tg.top + h(220) }}>
          <div style={{ ...noteLine(23, INK) }}>No fan trap</div>
        </Ink>
      </Drift>
    </AbsoluteFill>
  );
};
