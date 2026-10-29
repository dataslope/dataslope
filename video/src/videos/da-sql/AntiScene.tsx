import React from "react";
import { AbsoluteFill } from "remotion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, INK, INK_SOFT, note } from "../../editorial/style";
import { Ink, Note } from "../../editorial/ui";
import { MONO } from "../../theme/fonts";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ANTI } from "./data";
import {
  DataTable,
  Drift,
  KEY_INK,
  Listing,
  listingHeight,
  Mark,
  MARK_BAD,
  MARK_OK,
  Mono,
  NoRows,
  TableName,
  tableGeometry,
  X0,
} from "./parts";

const TOP = 340;
const HEAD_H = 48;
const ROW_H = 54;
const ORDERS_X = 420;
const LIST_X = 800;
const LIST_W = 640;
const RESULT_X = 1490;

/**
 * Question 7, customers who never ordered, on the page's customers and
 * orders plus a guest order with no customer. NOT IN returns nothing, and
 * the comparison it stands for, written out for Di, shows why; NOT EXISTS and
 * the left join that keeps the unmatched rows both find her. That left join
 * filters the right table in WHERE, which the trap warned about, and is safe:
 * IS NULL is the one test that keeps unmatched rows. NOT IN works too once
 * its subquery drops the nulls.
 */
export const AntiScene: React.FC = () => {
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("anti").from;
  const qAt = n.word("anti", "Question");
  const textAt = n.word("anti", "Which customers");
  const notInAt = n.word("anti-notin", "NOT IN");
  const nothingAt = n.word("anti-notin", "returns nothing");
  const guestAt = n.word("anti-why", "guest order");
  const meansAt = n.word("anti-why", "NOT IN means");
  const everyAt = n.word("anti-why", "every one");
  const nullAt = n.word("anti-why", "not equal to null");
  const unknownAt = n.word("anti-why", "unknown");
  const passesAt = n.word("anti-why", "no customer", { nth: 2 });
  const existsAt = n.word("anti-fix", "NOT EXISTS");
  const leftAt = n.word("anti-fix", "left join");
  const diAt = n.word("anti-fix", "find Di");
  const safeAt = n.word("anti-safe", "That WHERE is safe");
  const keepsAt = n.word("anti-safe", "keeps the unmatched rows");
  const keepNotInAt = n.word("anti-safe", "keep NOT IN");
  const filterAt = n.word("anti-safe", "filter the nulls out");
  const end = n.beat("distinct-in").to;

  const cg = tableGeometry({
    x: X0,
    top: y(TOP),
    cols: [{ name: "id" }, { name: "name" }],
    rows: ANTI.customers.rows,
    headH: h(HEAD_H),
    rowH: h(ROW_H),
  });
  const og = tableGeometry({
    x: ORDERS_X,
    top: y(TOP),
    cols: [{ name: "id" }, { name: "customer_id" }],
    rows: ANTI.orders.rows,
    headH: h(HEAD_H),
    rowH: h(ROW_H),
  });
  const guest = ANTI.orders.rows.findIndex((r) => r[1] === "null");
  const di = ANTI.customers.rows.find((r) => r[1] === "Di")!;
  const diRow = ANTI.customers.rows.indexOf(di);

  // NOT IN, written out for Di: one "not equal" per distinct customer_id.
  const ids = [...new Set(ANTI.orders.rows.map((r) => r[1]).filter((v) => v !== "null"))];
  const listed = [...ANTI.orders.rows.map((r) => (r[1] === "null" ? "NULL" : r[1]))];
  const notInH = listingHeight(ANTI.notIn.lines.length, 26);
  const whyY = y(TOP) + notInH + h(46);
  const lineGap = h(52);

  const existsH = listingHeight(ANTI.notExists.lines.length, 24);
  const leftTop = y(TOP) + existsH + h(60);
  const resultG = (top: number, cols: string[], rows: string[][]) =>
    tableGeometry({ x: RESULT_X, top, cols: cols.map((name) => ({ name })), rows, headH: h(HEAD_H), rowH: h(ROW_H) });
  const existsG = resultG(y(TOP), ANTI.notExists.cols, ANTI.notExists.rows);
  const leftG = resultG(leftTop, ANTI.leftNull.cols, ANTI.leftNull.rows);
  const leftH = listingHeight(ANTI.leftNull.lines.length, 24);
  const isNullLine = ANTI.leftNull.lines.findIndex((l) => l.startsWith("WHERE"));
  // NOT IN mended: the filter its subquery needs, as check.mjs ran it.
  const guard = /WHERE \w+ IS NOT NULL/.exec(ANTI.notInGuarded.lines.join(" "))?.[0];
  if (!guard || ANTI.notInGuarded.rows.map((r) => r[0]).join() !== di[1]) throw new Error("NOT IN with its nulls filtered does not find Di alone");

  return (
    <AbsoluteFill>
      <Sfx name="el-scratch" at={nothingAt + 2} level={-30} />
      <Sfx name="el-tap" at={guestAt} level={-32} />
      <Sfx name="el-scratch" at={unknownAt + 2} level={-32} />
      <Sfx name="el-pop" at={diAt} level={-30} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={7} at={qAt - 4} textAt={textAt - 4}>
          Which customers have never ordered?
        </QuestionCard>

        {/* ── Customers, and the customer each order names ── */}
        <TableName g={cg} at={from + 2}>
          customers
        </TableName>
        <DataTable
          g={cg}
          cols={[{ name: "id", numeric: true, ink: KEY_INK }, { name: "name" }]}
          at={from + 2}
          rows={ANTI.customers.rows.map((cells, i) => ({ cells, at: from + 6 + i * 2 }))}
          bands={[{ row: diRow, at: diAt, color: MARK_OK }]}
        />
        <TableName g={og} at={from + 8}>
          orders
        </TableName>
        <DataTable
          g={og}
          cols={[{ name: "id", numeric: true }, { name: "customer_id", numeric: true, ink: KEY_INK }]}
          at={from + 8}
          rows={ANTI.orders.rows.map((cells, i) => ({ cells, at: from + 12 + i * 2 }))}
          bands={[{ row: guest, at: guestAt, color: MARK_BAD }]}
        />

        {/* ── NOT IN, and its empty answer ── */}
        <Listing lines={ANTI.notIn.lines} x={LIST_X} top={y(TOP)} width={LIST_W} size={26} at={notInAt - 6} out={existsAt - 4} />
        <NoRows x={RESULT_X} top={y(TOP)} at={nothingAt} col={ANTI.notIn.cols[0]} out={existsAt - 4} />

        {/* ── What NOT IN asks of Di ── */}
        <Ink at={meansAt} dur={14} out={existsAt - 4} style={{ left: LIST_X, top: whyY, whiteSpace: "nowrap" }}>
          <span style={{ fontFamily: MONO, fontSize: 24, color: INK, fontVariantLigatures: "none" }}>
            {di[0]} NOT IN ({listed.join(", ")})
          </span>
        </Ink>
        <Ink at={everyAt} dur={14} out={existsAt - 4} style={{ left: LIST_X, top: whyY + lineGap, whiteSpace: "nowrap" }}>
          <span style={{ fontFamily: MONO, fontSize: 24, color: INK, fontVariantLigatures: "none" }}>
            {ids.map((id) => `${di[0]} <> ${id} AND `).join("")}
            <Mark at={nullAt} color={MARK_BAD}>
              {di[0]} &lt;&gt; NULL
            </Mark>
          </span>
        </Ink>
        <Ink at={unknownAt - 2} dur={14} out={existsAt - 4} style={{ left: LIST_X, top: whyY + 2 * lineGap, whiteSpace: "nowrap" }}>
          <span style={{ fontFamily: MONO, fontSize: 24, color: INK_SOFT, fontVariantLigatures: "none" }}>
            {ids.map(() => "true AND ").join("")}
            <span style={{ color: ACCENT_INK, fontWeight: 700 }}>unknown</span>
          </span>
        </Ink>
        <Note at={passesAt - 2} x={LIST_X} y={whyY + 3 * lineGap + h(8)} out={existsAt - 4}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>
            Not true, so no customer ever passes.
          </span>
        </Note>

        {/* ── Two that work ── */}
        <Listing lines={ANTI.notExists.lines} x={LIST_X} top={y(TOP)} width={LIST_W} size={24} at={existsAt - 2} />
        <DataTable
          g={existsG}
          cols={[{ name: ANTI.notExists.cols[0] }]}
          at={diAt - 6}
          rows={ANTI.notExists.rows.map((cells) => ({ cells, at: diAt - 2 }))}
          bands={[{ row: 0, at: diAt + 4, color: MARK_OK }]}
        />
        <Listing
          lines={ANTI.leftNull.lines}
          x={LIST_X}
          top={leftTop}
          width={LIST_W}
          size={24}
          at={leftAt - 2}
          marks={[{ line: isNullLine, at: safeAt + 4, color: MARK_OK }]}
        />
        <DataTable
          g={leftG}
          cols={[{ name: ANTI.leftNull.cols[0] }]}
          at={diAt - 2}
          rows={ANTI.leftNull.rows.map((cells) => ({ cells, at: diAt + 2 }))}
          bands={[{ row: 0, at: diAt + 8, color: MARK_OK }]}
        />

        {/* ── Why that WHERE is safe, and NOT IN mended ── */}
        <Note at={safeAt - 2} x={LIST_X} y={leftTop + leftH + h(26)}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>
            <Mono>IS NULL</Mono> is the one test that <Mark at={keepsAt}>keeps the unmatched rows</Mark>.
          </span>
        </Note>
        <Note at={keepNotInAt - 2} x={LIST_X} y={leftTop + leftH + h(74)}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>
            Or keep <Mono>NOT IN</Mono>, with <Mark at={filterAt}><Mono>{guard}</Mono></Mark> inside.
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
