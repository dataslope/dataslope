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
import { DataTable, Drift, KEY_INK, lineOf, Listing, listingHeight, Mark, MARK_BAD, MARK_OK, Mono, NoRows, TableName, tableGeometry, X0 } from "./parts";

const TOP = 340;
const HEAD_H = 48;
const ROW_H = 54;
const ORDERS_X = 420;
const LIST_X = 800;
const LIST_W = 640;
const RESULT_X = 1490;
const EXCEPT_SIZE = 26;

/**
 * Question 10: da-sql's AntiScene, copied and re-cued, on da-sql's customers
 * and orders plus its guest order with no customer. NOT IN returns nothing,
 * and the comparison it stands for, written out for Di, shows why; NOT
 * EXISTS and the left join that keeps the unmatched rows both find her. Then
 * EXCEPT, run here on the same tables: it compares the two sides as sets,
 * where a null matches a null, so the guest order can't block it, and it
 * returns Di's id, 4, under the tables it came from.
 */
export const AntiScene: React.FC = () => {
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("anti").from;
  const textAt = n.word("anti", "How do you write a query");
  // The tables arrive as the question is read to its end.
  const asked = n.word("anti", "Say, customers with no orders");
  const notInAt = n.word("anti", "Most people write NOT IN");
  const nothingAt = n.word("anti", "returns nothing");
  const guestAt = n.word("anti-why", "guest order");
  const meansAt = n.word("anti-why", "NOT IN means");
  const everyAt = n.word("anti-why", "every one of them");
  const nullAt = n.word("anti-why", "not equal to null");
  const unknownAt = n.word("anti-why", "is unknown");
  const passesAt = n.word("anti-why", "no customer passes");
  const existsAt = n.word("anti-fix", "NOT EXISTS");
  const leftAt = n.word("anti-fix", "a left join");
  const diAt = n.word("anti-fix", "find Di");
  const exceptAt = n.word("anti-except", "EXCEPT works too");
  const setsAt = n.word("anti-except", "as sets");
  const blockAt = n.word("anti-except", "the null can't block it");
  const fourAt = n.word("anti-except", "Di's ID, four");
  const joinBackAt = n.word("anti-except", "Join back for her name");
  const end = n.beat("recursive-in").to;

  const cg = tableGeometry({ x: X0, top: y(TOP), cols: [{ name: "id" }, { name: "name" }], rows: ANTI.customers.rows, headH: h(HEAD_H), rowH: h(ROW_H) });
  const og = tableGeometry({ x: ORDERS_X, top: y(TOP), cols: [{ name: "id" }, { name: "customer_id" }], rows: ANTI.orders.rows, headH: h(HEAD_H), rowH: h(ROW_H) });
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

  // EXCEPT, in the fixes' place once they have found Di.
  const E = ANTI.except;
  const exceptH = listingHeight(E.lines.length, EXCEPT_SIZE);
  const eg = tableGeometry({ x: RESULT_X, top: y(TOP), cols: E.cols.map((name) => ({ name, numeric: true })), rows: E.rows, headH: h(HEAD_H), rowH: h(ROW_H) });
  // Both fixes keep Di on screen into the EXCEPT sentence, then make room.
  const fixesOut = exceptAt + 8;
  if (E.rows.map((r) => r[0]).join() !== di[0]) throw new Error("EXCEPT does not return Di's id alone");

  return (
    <AbsoluteFill>
      <Sfx name="el-scratch" at={nothingAt + 2} level={-32} />
      <Sfx name="el-tap" at={guestAt} level={-34} />
      <Sfx name="el-scratch" at={unknownAt + 2} level={-34} />
      <Sfx name="el-pop" at={diAt} level={-32} />
      <Sfx name="el-pop" at={fourAt} level={-34} />

      <Drift from={from} to={end + 40}>
        <>
          <QuestionCard n={10} at={from - 8} textAt={textAt - 4} size={56}>
            How do you write a query that returns only rows that exist in one table but not another?
          </QuestionCard>

          {/* ── Customers, and the customer each order names ── */}
          <TableName g={cg} at={asked}>
            customers
          </TableName>
          <DataTable
            g={cg}
            cols={[{ name: "id", numeric: true, ink: KEY_INK }, { name: "name" }]}
            at={asked}
            rows={ANTI.customers.rows.map((cells, i) => ({ cells, at: asked + 4 + i * 2 }))}
            bands={[{ row: diRow, at: diAt, color: MARK_OK }]}
          />
          <TableName g={og} at={asked + 6}>
            orders
          </TableName>
          <DataTable
            g={og}
            cols={[{ name: "id", numeric: true }, { name: "customer_id", numeric: true, ink: KEY_INK }]}
            at={asked + 6}
            rows={ANTI.orders.rows.map((cells, i) => ({ cells, at: asked + 10 + i * 2 }))}
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
            <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>Not true, so no customer ever passes.</span>
          </Note>

          {/* ── Two that work ── */}
          <Listing lines={ANTI.notExists.lines} x={LIST_X} top={y(TOP)} width={LIST_W} size={24} at={existsAt - 2} out={fixesOut} />
          <DataTable
            g={existsG}
            cols={[{ name: ANTI.notExists.cols[0] }]}
            at={diAt - 6}
            out={fixesOut}
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
            out={fixesOut}
            marks={[{ line: lineOf(ANTI.leftNull.lines, "IS NULL"), at: leftAt + 10, color: MARK_OK }]}
          />
          <DataTable
            g={leftG}
            cols={[{ name: ANTI.leftNull.cols[0] }]}
            at={diAt - 2}
            out={fixesOut}
            rows={ANTI.leftNull.rows.map((cells) => ({ cells, at: diAt + 2 }))}
            bands={[{ row: 0, at: diAt + 8, color: MARK_OK }]}
          />

          {/* ── EXCEPT: a set difference, which a null can't block ── */}
          <Listing
            lines={E.lines}
            x={LIST_X}
            top={y(TOP)}
            width={LIST_W}
            size={EXCEPT_SIZE}
            at={fixesOut + 8}
            marks={[{ line: lineOf(E.lines, "EXCEPT"), at: setsAt, color: MARK_OK }]}
          />
          <DataTable
            g={eg}
            cols={[{ name: E.cols[0], numeric: true, ink: KEY_INK }]}
            at={fourAt - 6}
            rows={E.rows.map((cells) => ({ cells, at: fourAt - 2 }))}
            bands={[{ row: 0, at: fourAt + 4, color: MARK_OK }]}
          />
          <Note at={blockAt} x={LIST_X} y={y(TOP) + exceptH + h(30)}>
            <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>
              A set difference: <Mono>NULL</Mono> matches <Mono>NULL</Mono>,
            </span>
            <br />
            <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>so the guest order can&apos;t block it.</span>
          </Note>
          <Note at={joinBackAt - 2} x={LIST_X} y={y(TOP) + exceptH + h(124)}>
            <span style={{ ...note(26, INK_SOFT), whiteSpace: "nowrap" }}>
              Only the key comes back: join <Mono>customers</Mono> for the name.
            </span>
          </Note>
        </>
      </Drift>
    </AbsoluteFill>
  );
};
