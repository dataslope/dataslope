import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { during, ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { BAR, HIGHLIGHT, INK, INK_SOFT, PAPER, TABULAR, note } from "../../editorial/style";
import { Ink, Note } from "../../editorial/ui";
import { MONO } from "../../theme/fonts";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { JOINS } from "./data";
import { DataTable, Drift, KEY_INK, KeyArrow, Mark, MARK_BAD, Mono, TableName, tableGeometry, X0 } from "./parts";

const TABLE_Y = 340;
const HEAD_H = 48;
const ROW_H = 54;
const ORDERS_X = 480;
const RESULT_X = 1010;
const KINDS_X = 1490;
const KINDS_Y = 330;
const KINDS_PITCH = 112;

type Kind = "INNER" | "LEFT" | "RIGHT" | "FULL";

/**
 * Question 3, the four joins, on the page's first four customers and their
 * orders plus order 125 for a customer who isn't there. Each match is drawn
 * as a line; the result table grows and shrinks as the narration names each
 * join, and the four Venn marks down the right keep the count.
 */
export const JoinsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("joins").from;
  const qAt = n.word("joins", "Question");
  const textAt = n.word("joins", "Inner");
  // The tables arrive as the question ends rather than on their own words,
  // so the scene does not sit on the question alone while it is read.
  const asked = n.beat("joins").to;
  const customersAt = Math.min(n.word("joins-match", "four customers"), asked + 4);
  const ordersAt = Math.min(n.word("joins-match", "seven orders"), asked + 14);
  const lineAt = n.word("joins-match", "each line");
  const diAt = n.word("joins-match", "Di");
  const strayAt = n.word("joins-match", "one twenty-five");
  const innerAt = n.word("joins-inner", "inner join");
  const sixAt = n.word("joins-inner", "Six rows");
  const leftAt = n.word("joins-left", "left join");
  const diBackAt = n.word("joins-left", "Di comes back");
  const rightAt = n.word("joins-right", "right join");
  const strayKeepAt = n.word("joins-right", "stray one");
  const fullAt = n.word("joins-right", "full join");
  const eightAt = n.word("joins-right", "Eight rows");
  const tellAt = n.word("joins-tell", "classic tell");
  const neverAt = n.word("joins-tell", "never ordered");
  const leftJoinAt = n.word("joins-tell", "left join");
  const end = n.beat("joins-tell").to;

  const cg = tableGeometry({
    x: X0,
    top: y(TABLE_Y),
    cols: [{ name: "id" }, { name: "name" }],
    rows: JOINS.customers.rows,
    headH: h(HEAD_H),
    rowH: h(ROW_H),
  });
  const og = tableGeometry({
    x: ORDERS_X,
    top: y(TABLE_Y),
    cols: [{ name: "id" }, { name: "customer_id" }, { name: "amount" }],
    rows: JOINS.orders.rows,
    headH: h(HEAD_H),
    rowH: h(ROW_H),
  });

  // The result rows: the six matches, Di (left, full), and the stray order
  // (right, full), in the order DuckDB returns the full join.
  const matched = JOINS.inner.rows;
  const di = JOINS.left.rows.find((r) => r[0] === "Di")!;
  const stray = JOINS.right.rows.find((r) => r[0] === "null")!;
  if (JOINS.full.rows.length !== matched.length + 2) throw new Error("full join is not matches + Di + stray");
  const rg = tableGeometry({
    x: RESULT_X,
    top: y(TABLE_Y),
    cols: [{ name: "name" }, { name: "order_id" }, { name: "amount" }],
    rows: JOINS.full.rows,
    headH: h(HEAD_H),
    rowH: h(ROW_H),
  });

  const customerRow = new Map(JOINS.customers.rows.map((r, i) => [r[0], i]));
  const strayIndex = JOINS.orders.rows.findIndex((r) => !customerRow.has(r[1]));
  const diIndex = JOINS.customers.rows.findIndex((r) => r[1] === "Di");

  const kinds: { kind: Kind; at: number; until: number; rows: number }[] = [
    { kind: "INNER", at: innerAt, until: leftAt, rows: JOINS.inner.rows.length },
    { kind: "LEFT", at: leftAt, until: rightAt, rows: JOINS.left.rows.length },
    { kind: "RIGHT", at: rightAt, until: fullAt, rows: JOINS.right.rows.length },
    { kind: "FULL", at: fullAt, until: tellAt, rows: JOINS.full.rows.length },
  ];

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={lineAt + 2} level={-34} />
      <Sfx name="el-scratch" at={strayAt + 4} level={-32} />
      <Sfx name="el-pop" at={sixAt} level={-32} />
      <Sfx name="el-pop" at={diBackAt} level={-32} />
      <Sfx name="el-pop" at={strayKeepAt} level={-32} />
      <Sfx name="el-pop" at={eightAt} level={-32} />

      <Drift from={from} to={end + 40}>
        {/* The question inks in while "Question three" is said. */}
        <QuestionCard n={3} at={qAt - 4} textAt={Math.min(textAt - 4, qAt + 6)}>
          Inner, left, right and full join: what&apos;s the difference?
        </QuestionCard>

        {/* ── Four customers, seven orders, and a line for each match ── */}
        <TableName g={cg} at={customersAt - 4}>
          customers
        </TableName>
        <DataTable
          g={cg}
          cols={[{ name: "id", ink: KEY_INK }, { name: "name" }]}
          at={customersAt - 4}
          rows={JOINS.customers.rows.map((cells, i) => ({ cells, at: customersAt + i * 2 }))}
          bands={[
            { row: diIndex, at: diAt, out: innerAt },
            { row: diIndex, at: neverAt },
          ]}
        />
        <TableName g={og} at={ordersAt - 4}>
          orders
        </TableName>
        <DataTable
          g={og}
          cols={[{ name: "id" }, { name: "customer_id", ink: KEY_INK }, { name: "amount", numeric: true }]}
          at={ordersAt - 4}
          rows={JOINS.orders.rows.map((cells, i) => ({ cells, at: ordersAt + i * 2 }))}
          marks={[{ row: strayIndex, col: 1, at: strayAt + 4, color: MARK_BAD }]}
        />
        {JOINS.orders.rows.map((r, i) => {
          const c = customerRow.get(r[1]);
          if (c === undefined) return null;
          return (
            <KeyArrow
              key={i}
              from={[og.x - 6, og.rowMid(i)]}
              to={[cg.right + 8, cg.rowMid(c)]}
              at={lineAt + i * 3}
              width={2.2}
            />
          );
        })}

        {/* ── The result, as each join is named ── */}
        {/* Each join's name over the result while it is named; the tell's
            LEFT JOIN comes back at the end, with the stray order gone. */}
        {[...kinds, { kind: "LEFT" as Kind, at: leftJoinAt, until: undefined, rows: JOINS.left.rows.length }].map((k, i) => (
          <Ink
            key={i}
            at={k.at - 2}
            dur={10}
            out={k.kind === "FULL" ? leftJoinAt - 4 : k.until === undefined ? undefined : k.until - 4}
            style={{ left: rg.x, top: rg.top - 40, whiteSpace: "nowrap", display: "flex", alignItems: "baseline", gap: 14 }}
          >
            <span style={{ fontFamily: MONO, fontSize: 22, fontWeight: 700, color: INK }}>{k.kind} JOIN</span>
            <span style={{ ...note(22, INK_SOFT), ...TABULAR }}>{k.rows} rows</span>
          </Ink>
        ))}
        <DataTable
          g={rg}
          cols={[{ name: "name" }, { name: "order_id", numeric: true }, { name: "amount", numeric: true }]}
          at={innerAt - 2}
          rows={[
            ...matched.map((cells, i) => ({ cells, at: innerAt + 4 + i * 2 })),
            { cells: di, at: diBackAt, grow: true, collapseAt: rightAt + 2 },
            { cells: stray, at: strayKeepAt, grow: true, collapseAt: leftJoinAt },
            { cells: di, at: fullAt + 6, grow: true },
          ]}
        />

        {/* ── The four joins as Venn marks, each lit while it is named ── */}
        {kinds.map((k, i) => {
          const lit = Math.max(during(frame, k.at - 2, k.until - 2, 8), k.kind === "LEFT" ? ease(frame, leftJoinAt - 2, 10) : 0);
          return (
            <Ink key={k.kind} at={k.at - 4} dur={12} style={{ left: KINDS_X, top: y(KINDS_Y + i * KINDS_PITCH) }}>
              <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 18 }}>
                <div
                  style={{
                    position: "absolute",
                    left: -14,
                    right: -14,
                    top: -8,
                    bottom: -8,
                    background: HIGHLIGHT,
                    borderRadius: 6,
                    opacity: lit * 0.5,
                  }}
                />
                <Venn kind={k.kind} />
                <div style={{ position: "relative" }}>
                  <div style={{ fontFamily: MONO, fontSize: 22, fontWeight: 700, color: INK, whiteSpace: "nowrap" }}>{k.kind}</div>
                  <div style={{ ...note(21, INK_SOFT), ...TABULAR, whiteSpace: "nowrap" }}>{k.rows} rows</div>
                </div>
              </div>
            </Ink>
          );
        })}

        {/* ── The tell ── */}
        <Note at={tellAt - 2} x={X0} y={y(TABLE_Y + HEAD_H + 8 * ROW_H + 56)}>
          <span style={{ ...note(28, INK), whiteSpace: "nowrap" }}>
            Every customer, <Mark at={neverAt}>including the ones who never ordered</Mark>:{" "}
            <span style={{ opacity: ease(frame, leftJoinAt - 2, 10) }}>
              <Mono>LEFT JOIN</Mono>
            </span>
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};

/** Two overlapping circles, the rows each join keeps shaded in the data blue. */
const Venn: React.FC<{ kind: Kind }> = ({ kind }) => {
  const id = `venn-${kind}`;
  const r = 24;
  const a = { cx: 28, cy: 28 };
  const b = { cx: 56, cy: 28 };
  const fill = `color-mix(in srgb, ${BAR} 55%, ${PAPER})`;
  return (
    <svg width={86} height={56} style={{ position: "relative", overflow: "visible" }}>
      <defs>
        <clipPath id={`${id}-b`}>
          <circle {...b} r={r} />
        </clipPath>
      </defs>
      {kind === "LEFT" || kind === "FULL" ? <circle {...a} r={r} fill={fill} /> : null}
      {kind === "RIGHT" || kind === "FULL" ? <circle {...b} r={r} fill={fill} /> : null}
      {kind === "INNER" ? <circle {...a} r={r} fill={fill} clipPath={`url(#${id}-b)`} /> : null}
      <circle {...a} r={r} fill="none" stroke={INK} strokeWidth={1.8} />
      <circle {...b} r={r} fill="none" stroke={INK} strokeWidth={1.8} />
    </svg>
  );
};
