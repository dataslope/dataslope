import React from "react";
import { AbsoluteFill } from "remotion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { BAR, BLUE_INK, INK, INK_SOFT } from "../../editorial/style";
import { Ink, Note, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { FIX, money } from "./data";
import {
  DataTable,
  Drift,
  Flow,
  Listing,
  listingHeight,
  listingLineMid,
  MARK_OK,
  Mono,
  Node,
  noteLine,
  OK_INK,
  Strike,
  TableName,
  tableGeometry,
  X0,
} from "./parts";

const LIST_Y = 290;
const SIZE = 20;
const R_X = 1110;

/**
 * Question 3: aggregate each grain before the join. The page's fix as
 * written, each CTE ringed in the data blue and labelled with the one table
 * it reads, and its result: 1,949.25 and 38 units. After a join, a distinct
 * count of orders (12) and a sum of a measure that lives on the item rows
 * (38) are still right; the sum of the order's amount is not. A semantic
 * layer draws the same two summaries itself.
 */
export const AvoidScene: React.FC = () => {
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("avoid").from;
  const qAt = n.word("avoid", "Question");
  const textAt = n.word("avoid", "How do you avoid");
  const grainAt = n.word("avoid", "Aggregate each grain before you join");
  const revAt = n.word("avoid", "Sum revenue from orders alone");
  const unitsAt = n.word("avoid", "units from the items alone");
  const togetherAt = n.word("avoid", "put the two summaries together");
  const backAt = n.word("avoid-run", "Back to nineteen hundred forty-nine dollars");
  const units38At = n.word("avoid-run", "thirty-eight units");
  const mustAt = n.word("avoid-after", "If you must aggregate after the join");
  const distinctAt = n.word("avoid-after", "count distinct order IDs");
  const twelveAt = n.word("avoid-after", "twelve");
  const qtyAt = n.word("avoid-after", "sum only measures that live on the item rows");
  const quantityAt = n.word("avoid-after", "like quantity");
  const layerAt = n.word("avoid-layer", "A semantic layer does this for you");
  const knowsAt = n.word("avoid-layer", "it knows each measure's grain");
  const beforeAt = n.word("avoid-layer", "aggregates before the join fans out");
  const end = n.beat("avoid-layer").to;

  const fix = FIX.page.sql;
  const top = y(LIST_Y);
  const fixH = listingHeight(fix.length, SIZE);
  const after = FIX.afterJoin.sql;
  const afterTop = top + fixH + h(56);

  const rg = tableGeometry({ x: R_X, top, cols: FIX.page.result.cols.map((name) => ({ name })), rows: FIX.page.result.rows, headH: h(40), rowH: h(48), bodySize: 28 });
  const ag = tableGeometry({ x: R_X, top: afterTop + h(40), cols: FIX.afterJoin.result.cols.map((name) => ({ name })), rows: FIX.afterJoin.result.rows, headH: h(40), rowH: h(48), bodySize: 28 });

  // A CTE's label sits inside its ring, at the right end of its first line.
  const cteLabel = (text: string, line: string, at: number, color: string) => (
    <Note at={at + 6} x={X0 + 640} y={listingLineMid(top, fix.findIndex((l) => l.includes(line)), SIZE) - 14}>
      <span style={noteLine(21, color)}>{text}</span>
    </Note>
  );

  // The layer's two summaries, drawn between the two results.
  const layerTop = rg.rowTop(1) + h(44);
  const boxW = 280;
  const boxH = h(56);
  const lineTop = (i: number) => layerTop + boxH + h(18) + i * h(32);

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={revAt + 4} level={-35} />
      <Sfx name="el-pencil" at={unitsAt + 4} level={-35} />
      <Sfx name="el-tap" at={backAt + 2} level={-32} />
      <Sfx name="el-pencil" at={mustAt} level={-35} />
      <Sfx name="el-tap" at={twelveAt} level={-33} />
      <Sfx name="el-tap" at={quantityAt} level={-33} />
      <Sfx name="el-scratch" at={qtyAt + 14} level={-32} />
      <Sfx name="el-pop" at={layerAt} level={-31} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={3} at={qAt - 4} textAt={textAt - 4} size={62}>
          How do you avoid double counting from a fan-out?
        </QuestionCard>

        {/* ── The page's fix: each grain on its own, then together ── */}
        <Listing
          lines={fix}
          x={X0}
          top={top}
          width={830}
          size={SIZE}
          at={grainAt - 2}
          marks={[
            { line: "SUM(amount) AS revenue FROM orders", at: revAt + 2, out: unitsAt },
            { line: "SUM(qty) AS units FROM order_items", at: unitsAt + 2, out: togetherAt },
            { line: "SELECT revenue, units", at: togetherAt + 2, out: backAt + 30 },
          ]}
          outlines={[
            { from: "order_rev AS", to: "FROM orders", at: revAt, color: BAR },
            { from: "item_qty AS", to: "FROM order_items", at: unitsAt, color: BAR },
          ]}
        />
        {cteLabel("orders alone", "order_rev AS", revAt, BLUE_INK)}
        {cteLabel("order_items alone", "item_qty AS", unitsAt, BLUE_INK)}

        <TableName g={rg} at={backAt - 4}>
          result
        </TableName>
        <DataTable
          g={rg}
          cols={FIX.page.result.cols.map((name) => ({ name, numeric: true }))}
          at={backAt - 4}
          rows={FIX.page.result.rows.map((cells) => ({ cells, at: backAt }))}
          marks={[
            { row: 0, col: 0, at: backAt + 6, color: MARK_OK },
            { row: 0, col: 1, at: units38At, color: MARK_OK },
          ]}
        />

        {/* ── After a join: only what survives repetition ── */}
        <Listing
          lines={after}
          x={X0}
          top={afterTop}
          width={830}
          size={SIZE}
          at={mustAt - 2}
          marks={[
            { line: "COUNT(DISTINCT", text: "COUNT(DISTINCT o.order_id)", at: distinctAt + 2 },
            { line: "SUM(i.qty)", text: "SUM(i.qty)", at: qtyAt + 4 },
          ]}
        />
        <TableName g={ag} at={twelveAt - 4}>
          after the join
        </TableName>
        <DataTable
          g={ag}
          cols={FIX.afterJoin.result.cols.map((name) => ({ name, numeric: true }))}
          at={twelveAt - 4}
          rows={FIX.afterJoin.result.rows.map((cells) => ({ cells, at: twelveAt }))}
          marks={[
            { row: 0, col: 0, at: twelveAt + 4, color: MARK_OK },
            { row: 0, col: 1, at: quantityAt + 2, color: MARK_OK },
          ]}
        />
        <Note at={qtyAt + 12} x={R_X} y={ag.rowTop(1) + h(26)}>
          <span style={noteLine(23, INK)}>
            <Strike at={qtyAt + 14}>
              <Mono>SUM(o.amount)</Mono>
            </Strike>{" "}
            <span style={{ color: INK_SOFT }}>repeats per item</span>
          </span>
        </Note>

        {/* ── A semantic layer does it for you ── */}
        <Node x={R_X} y={layerTop} w={boxW} h={boxH} at={layerAt} title="Semantic layer" size={23} />
        <Flow points={[[R_X + 30, layerTop + boxH + 4], [R_X + 30, lineTop(2) + h(14)], [R_X + 52, lineTop(2) + h(14)]]} at={knowsAt} dur={16} color={INK_SOFT} width={1.6} head={9} />
        <Ink at={knowsAt + 4} dur={12} style={{ left: R_X + 60, top: lineTop(0) }}>
          <span style={noteLine(22, BLUE_INK)}>
            <Mono>SUM(amount)</Mono> on orders
          </span>
        </Ink>
        <Ink at={knowsAt + 10} dur={12} style={{ left: R_X + 60, top: lineTop(1) }}>
          <span style={noteLine(22, BLUE_INK)}>
            <Mono>SUM(qty)</Mono> on order_items
          </span>
        </Ink>
        <Ink at={beforeAt + 4} dur={14} style={{ left: R_X + 60, top: lineTop(2) }}>
          <span style={noteLine(22, OK_INK)}>
            <b>then the join:</b> <Num>{money(FIX.revenue)}</Num> and <Num>{FIX.units}</Num> units
          </span>
        </Ink>
      </Drift>
    </AbsoluteFill>
  );
};
