import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, INK, INK_SOFT, label, note } from "../../editorial/style";
import { Note, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { HISTORY, TYPE2 } from "./data";
import { colsOf, DataTable, Drift, geoOf, MARK_BAD, MARK_OK, OK, OK_INK, rowsAt, TableName, X0 } from "./parts";

/** Each type's band, top to bottom, in layout units. */
const BANDS = [330, 540, 750] as const;
const TABLE_X = 420;
/** The table rows here, before `h()`. */
const ROWS = { headH: 40, rowH: 46, bodySize: 21, headSize: 19 } as const;

/**
 * Question 1, on the page's customer 42 and her two orders. Three bands, one
 * per classic type, each built as its sentence is read: Type 1's UPDATE turns
 * her one row to Austin and both orders follow it (Boston's 350.00 with
 * them); Type 2's page rows close Boston and add Austin, and the
 * point-in-time join gives 101 Boston and 102 Austin; Type 3's row holds
 * Austin with Boston as the previous value, until a second move to Denver
 * pushes Boston out. Then the verdict: Type 2 the standard, Type 1 for typos.
 */
export const HistoryScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("scd").from;
  const qAt = n.word("scd", "Question one");
  const textAt = n.word("scd", "How do you preserve history");
  const scdAt = n.word("scd", "a slowly changing dimension");
  const threeAt = n.word("scd", "Three classic types");
  const t1At = n.word("scd-t1", "Type one overwrites");
  const setAt = n.word("scd-t1", "Set her city to Austin");
  const toAustinAt = n.word("scd-t1", "to Austin");
  const bothAt = n.word("scd-t1", "both orders now say Austin");
  const bostonAt = n.word("scd-t1", "including the one placed in Boston");
  const movedAt = n.word("scd-t1", "three hundred fifty dollars");
  const t2At = n.word("scd-t2", "Type two adds a row instead");
  const endAt = n.word("scd-t2", "gets an end date");
  const newRowAt = n.word("scd-t2", "Austin gets a new row");
  const joinsAt = n.word("scd-t2", "each order joins to the version");
  const o101At = n.word("scd-t2", "one oh one in Boston");
  const o102At = n.word("scd-t2", "one oh two in Austin");
  const t3At = n.word("scd-t3", "Type three keeps a previous value column");
  const prevAt = n.word("scd-t3", "and before it Boston");
  const stepAt = n.word("scd-t3", "one step of history");
  const againAt = n.word("scd-t3", "Move her again, to Denver");
  const goneAt = n.word("scd-t3", "Boston is gone");
  const standardAt = n.word("scd-end", "Type two is the standard");
  const typoAt = n.word("scd-end", "fixing a typo");
  const end = n.beat("scd-end").to;

  const top = (b: number) => y(BANDS[b]);
  const tableTop = (b: number) => top(b) + h(44);

  // ── Type 1: one row, overwritten; both orders follow it ──
  const T1 = HISTORY.t1After;
  const t1Before = HISTORY.t1Before.rows[0];
  const t1City = T1.cols.indexOf("city");
  const g1 = geoOf(T1, TABLE_X, tableTop(0), h, ROWS);
  const O1 = HISTORY.t1Orders;
  const o1City = O1.cols.indexOf("city");
  const go1 = geoOf(O1, g1.right + 70, tableTop(0), h, ROWS);

  // ── Type 2: the page's two versions; the point-in-time join ──
  const T2 = HISTORY.t2Rows;
  const pre = TYPE2.before.rows[0];
  const t2To = T2.cols.indexOf("valid_to");
  const t2Cur = T2.cols.indexOf("is_current");
  const g2 = geoOf(T2, TABLE_X, tableTop(1), h, ROWS);
  const O2 = HISTORY.t2Orders;
  const o2City = O2.cols.indexOf("city");
  const go2 = geoOf(O2, g2.right + 54, tableTop(1), h, ROWS);

  // ── Type 3: one previous value, then a second move ──
  const T3 = HISTORY.t3After;
  const T3b = HISTORY.t3Twice.rows[0];
  const t3City = T3.cols.indexOf("city");
  const t3Prev = T3.cols.indexOf("previous_city");
  const g3 = geoOf(T3, TABLE_X, tableTop(2), h, ROWS);

  const bands = [
    { at: t1At, name: "Type 1", what: "overwrite" },
    { at: t2At, name: "Type 2", what: "add a row" },
    { at: t3At, name: "Type 3", what: "previous value" },
  ];
  const lit = ease(frame, standardAt, 12);

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={toAustinAt + 2} level={-35} />
      <Sfx name="el-scratch" at={bostonAt + 2} level={-35} />
      <Sfx name="el-pencil" at={endAt + 2} level={-36} />
      <Sfx name="el-tap" at={newRowAt + 2} level={-35} />
      <Sfx name="el-pop" at={o101At} level={-35} />
      <Sfx name="el-tap" at={againAt + 8} level={-35} />
      <Sfx name="el-scratch" at={goneAt} level={-35} />
      <Sfx name="el-chime" at={standardAt + 4} level={-37} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={1} at={qAt - 4} textAt={textAt - 4} size={58}>
          How do you preserve history when a dimension attribute changes?
        </QuestionCard>
        <Note at={scdAt} x={X0} y={y(268)}>
          <span style={{ ...note(26, INK_SOFT), whiteSpace: "nowrap" }}>
            A slowly changing dimension, an <b style={{ color: INK }}>SCD</b>
            <span style={{ opacity: ease(frame, threeAt, 10) }}>: three classic types, on the page&rsquo;s customer <Num>42</Num></span>
          </span>
        </Note>

        {/* Each band's name, down the left. */}
        {bands.map((b, i) => (
          <Note key={b.name} at={b.at - 2} x={X0} y={top(i) + h(40)}>
            <div style={{ ...note(32, i === 1 && lit > 0.5 ? OK_INK : INK), fontWeight: 750, whiteSpace: "nowrap" }}>{b.name}</div>
            <div style={{ ...label(22, INK_SOFT), whiteSpace: "nowrap", marginTop: 4 }}>{b.what}</div>
          </Note>
        ))}
        {/* The verdict: Type 2 ringed as the standard, Type 1 kept for typos. */}
        <div
          style={{
            position: "absolute",
            left: X0 - 16,
            top: top(1) + h(30),
            width: 230,
            height: h(110),
            border: `3px solid ${OK}`,
            borderRadius: 10,
            opacity: lit,
          }}
        />
        <Note at={standardAt + 6} x={X0} y={top(1) + h(150)}>
          <span style={{ ...label(21, OK_INK), fontWeight: 700, whiteSpace: "nowrap" }}>the standard</span>
        </Note>
        <Note at={typoAt - 2} x={X0} y={top(0) + h(130)}>
          <span style={{ ...label(21, INK), fontWeight: 650, whiteSpace: "nowrap" }}>right for a typo</span>
        </Note>

        {/* ── Type 1 ── */}
        <TableName g={g1} at={t1At + 4}>
          customer_t1
        </TableName>
        <DataTable
          g={g1}
          cols={colsOf(T1)}
          at={t1At + 2}
          rows={[{ cells: t1Before, at: t1At + 6 }]}
          swaps={[{ row: 0, col: t1City, at: toAustinAt + 2, value: T1.rows[0][t1City] }]}
          marks={[{ row: 0, col: t1City, at: setAt + 2, out: bothAt + 10 }]}
        />
        <TableName g={go1} at={bothAt - 4}>
          her orders, joined to it
        </TableName>
        <DataTable
          g={go1}
          cols={colsOf(O1)}
          at={bothAt - 4}
          rows={rowsAt(O1.rows, bothAt, 4)}
          marks={[
            { row: 0, col: o1City, at: bostonAt + 2, color: MARK_BAD },
            { row: 0, col: O1.cols.indexOf("amount"), at: movedAt, color: MARK_BAD },
          ]}
        />
        <Note at={movedAt + 4} x={go1.right + 30} y={go1.rowTop(0) + h(4)}>
          <span style={{ ...note(23, ACCENT_INK), fontWeight: 650, whiteSpace: "nowrap" }}>
            placed in Boston,
            <br />
            now counted for Austin
          </span>
        </Note>

        {/* ── Type 2 ── */}
        <TableName g={g2} at={t2At + 4}>
          dim_customer, the page&rsquo;s rows
        </TableName>
        <DataTable
          g={g2}
          cols={colsOf(T2)}
          at={t2At + 2}
          rows={[
            { cells: T2.rows[0].map((v, j) => (j === t2To || j === t2Cur ? pre[TYPE2.before.cols.indexOf(T2.cols[j])] : v)), at: t2At + 6 },
            { cells: T2.rows[1], at: newRowAt + 2, grow: true },
          ]}
          swaps={[
            { row: 0, col: t2To, at: endAt + 4, value: T2.rows[0][t2To] },
            { row: 0, col: t2Cur, at: endAt + 10, value: T2.rows[0][t2Cur] },
          ]}
          marks={[
            { row: 0, col: t2To, at: endAt, out: joinsAt },
            { row: 1, col: T2.cols.indexOf("valid_from"), at: newRowAt + 8, out: joinsAt },
          ]}
        />
        <TableName g={go2} at={joinsAt - 2}>
          her orders, by date
        </TableName>
        <DataTable
          g={go2}
          cols={colsOf(O2)}
          at={joinsAt - 2}
          rows={[
            { cells: O2.rows[0], at: o101At - 2 },
            { cells: O2.rows[1], at: o102At - 2 },
          ]}
          marks={[
            { row: 0, col: o2City, at: o101At + 4, color: MARK_OK },
            { row: 1, col: o2City, at: o102At + 4, color: MARK_OK },
          ]}
        />

        {/* ── Type 3 ── */}
        <TableName g={g3} at={t3At + 4}>
          customer_t3
        </TableName>
        <DataTable
          g={g3}
          cols={colsOf(T3)}
          at={t3At + 2}
          rows={[{ cells: T3.rows[0], at: t3At + 8 }]}
          swaps={[
            { row: 0, col: t3City, at: againAt + 8, value: T3b[t3City] },
            { row: 0, col: t3Prev, at: againAt + 14, value: T3b[t3Prev] },
          ]}
          marks={[
            { row: 0, col: t3Prev, at: prevAt, out: againAt },
          ]}
        />
        <Note at={stepAt} x={g3.right + 40} y={g3.rowTop(0) - h(2)}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            one step back
            <span style={{ opacity: ease(frame, goneAt, 10) }}>
              :{" "}
              <span style={{ color: ACCENT_INK, fontWeight: 700 }}>Boston is gone</span>
            </span>
          </span>
        </Note>
        <Note at={againAt + 2} x={g3.right + 40} y={g3.rowTop(0) - h(44)}>
          <span style={{ ...label(21, INK_SOFT), whiteSpace: "nowrap" }}>then a second move, to Denver</span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
