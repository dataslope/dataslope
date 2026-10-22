import React from "react";
import { AbsoluteFill } from "remotion";
import { QMono, QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { BLUE_INK, INK, INK_SOFT, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { COMBINE } from "./data";
import { colsOf, DataTable, Drift, geoOf, KeyArrow, Mark, MARK, MARK_KEY, Mono, TableName, X0 } from "./parts";

const TOP = 400;
const CUST_X = 640;
const RESULT_X = 1140;
const HEAD_Y = 296;

/**
 * Question 5 on the page's orders and customers. Merge: arrows from each
 * order's customer_id to its customer, and the result picks up a name
 * column. Join: the customers' key becomes their index, and the same four
 * rows come back. Concat: nothing is matched; March's two orders (the
 * video's own) are stacked under the four.
 */
export const MergeScene: React.FC = () => {
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("merge").from;
  const qAt = n.word("merge", "Question");
  const textAt = n.word("merge", "When do you use merge");
  const asked = n.beat("merge").to;
  const mergeAt = n.word("merge-three", "Merge matches rows on key columns");
  const sqlAt = n.word("merge-three", "the way a SQL join does");
  const nameAt = n.word("merge-three", "each order picks up its customer's name");
  const joinAt = n.word("merge-three", "Join does the same");
  const indexAt = n.word("merge-three", "matches on the index");
  const concatAt = n.word("merge-three", "And concat matches nothing at all");
  const stackAt = n.word("merge-three", "It stacks frames");
  const marchAt = n.word("merge-three", "March's orders under the rest");
  const end = n.beat("merge-three").to;
  const outMatch = concatAt - 2;

  const O = COMBINE.orders;
  const og = geoOf(O, X0, y(TOP), h, { rowH: 52 });
  const C = COMBINE.customers;
  const cg = geoOf(C, CUST_X, y(TOP), h, { rowH: 52 });
  // The same customers with their key as the index, the way join wants them.
  const CI = { cols: ["customer_id", "name"], rows: C.rows.map((r) => [r[1], r[2]]) };
  const cig = geoOf(CI, CUST_X, y(TOP), h, { rowH: 52 });
  const M = COMBINE.merged;
  const mg = geoOf(M, RESULT_X, y(TOP), h, { rowH: 52 });
  const ids = C.rows.map((r) => r[1]);
  const target = (i: number) => ids.indexOf(O.rows[i][1]);

  // Concat: March's two orders, then all six stacked.
  const S = COMBINE.stacked;
  const marchRows = S.rows.slice(O.rows.length).map((r, i) => [String(i), r[1], r[2]]);
  const march = { cols: O.cols, rows: marchRows };
  const marchG = geoOf(march, X0, og.rowTop(O.rows.length) + h(70), h, { rowH: 52 });
  const sg = geoOf(S, CUST_X + 120, y(TOP), h, { rowH: 52 });

  const header = (word: string, rest: string, at: number, out?: number) => (
    <Note at={at} x={X0} y={y(HEAD_Y)} out={out}>
      <span style={{ ...note(30, INK), whiteSpace: "nowrap" }}>
        <Mark at={at + 4}>
          <Mono>{word}</Mono>
        </Mark>{" "}
        <span style={{ color: INK_SOFT }}>{rest}</span>
      </span>
    </Note>
  );

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={mergeAt + 6} level={-34} />
      <Sfx name="el-pencil" at={nameAt + 4} level={-34} />
      <Sfx name="el-whoosh" at={indexAt} level={-36} />
      <Sfx name="el-whoosh" at={stackAt} level={-34} />
      <Sfx name="el-pop" at={marchAt + 6} level={-32} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={5} at={qAt - 4} textAt={textAt - 4} size={60}>
          When do you use <QMono>merge</QMono>, <QMono>join</QMono>, or <QMono>concat</QMono>?
        </QuestionCard>

        {header("merge", "matches on key columns, like a SQL join", mergeAt, joinAt - 4)}
        {header("join", "matches on the index", joinAt, concatAt - 4)}
        {header("concat", "matches nothing: it stacks", concatAt)}

        <TableName g={og} at={asked - 6}>
          orders
        </TableName>
        <DataTable
          g={og}
          cols={colsOf(O, { customer_id: { ink: BLUE_INK } })}
          at={asked - 6}
          rows={O.rows.map((cells, i) => ({ cells, at: asked - 2 + i * 2 }))}
          marks={O.rows.map((_, row) => ({ row, col: 1, at: mergeAt + 6 + row * 3, out: outMatch, color: MARK_KEY }))}
        />

        {/* ── merge, then join ── */}
        <TableName g={cg} at={mergeAt} out={joinAt + 6}>
          customers
        </TableName>
        <DataTable
          g={cg}
          cols={colsOf(C, { customer_id: { ink: BLUE_INK } })}
          at={mergeAt}
          out={joinAt + 6}
          rows={C.rows.map((cells, i) => ({ cells, at: mergeAt + 4 + i * 2 }))}
        />
        <TableName g={cig} at={indexAt - 2} out={outMatch}>
          <Mono>customers.set_index(&quot;customer_id&quot;)</Mono>
        </TableName>
        <DataTable
          g={cig}
          cols={colsOf(CI, { customer_id: { ink: BLUE_INK } })}
          at={indexAt}
          out={outMatch}
          rows={CI.rows.map((cells, i) => ({ cells, at: indexAt + 2 + i * 2 }))}
          marks={CI.rows.map((_, row) => ({ row, col: 0, at: indexAt + 10 + row * 2, color: MARK_KEY }))}
        />
        {O.rows.map((_, i) => (
          <KeyArrow
            key={i}
            from={[og.right + 12, og.rowMid(i)]}
            to={[CUST_X - 12, cg.rowMid(target(i))]}
            at={sqlAt + i * 4}
            out={outMatch}
          />
        ))}
        <TableName g={mg} at={nameAt - 4} out={outMatch}>
          result
        </TableName>
        <DataTable
          g={mg}
          cols={colsOf(M, { customer_id: { ink: BLUE_INK }, name: { at: nameAt + 4 } })}
          at={nameAt - 4}
          out={outMatch}
          rows={M.rows.map((cells, i) => ({ cells, at: nameAt + i * 2 }))}
          bands={M.rows.map((_, row) => ({ row, at: indexAt + 14 + row * 2, color: MARK }))}
        />
        <Note at={indexAt + 14} x={RESULT_X} y={mg.rowTop(M.rows.length) + h(22)} out={outMatch}>
          <span style={{ ...label(24, INK), fontWeight: 650, whiteSpace: "nowrap" }}>the same four rows</span>
        </Note>

        {/* ── concat ── */}
        <TableName g={marchG} at={stackAt - 4}>
          march
        </TableName>
        <DataTable
          g={marchG}
          cols={colsOf(march, { customer_id: { ink: BLUE_INK } })}
          at={stackAt - 4}
          rows={march.rows.map((cells, i) => ({ cells, at: stackAt + i * 2 }))}
        />
        <TableName g={sg} at={marchAt - 4}>
          <Mono>pd.concat([orders, march], ignore_index=True)</Mono>
        </TableName>
        <DataTable
          g={sg}
          cols={colsOf(S, { customer_id: { ink: BLUE_INK } })}
          at={marchAt - 4}
          rows={S.rows.map((cells, i) => ({
            cells,
            at: i < O.rows.length ? marchAt + i * 2 : marchAt + 14 + (i - O.rows.length) * 6,
            grow: i >= O.rows.length,
          }))}
          bands={S.rows.slice(O.rows.length).map((_, k) => ({ row: O.rows.length + k, at: marchAt + 18 + k * 6, color: MARK }))}
        />
      </Drift>
    </AbsoluteFill>
  );
};
