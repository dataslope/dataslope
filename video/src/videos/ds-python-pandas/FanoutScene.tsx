import React from "react";
import { AbsoluteFill } from "remotion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BLUE_INK, INK, TABULAR, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { FANOUT } from "./data";
import {
  colsOf,
  Console,
  DataTable,
  Drift,
  ErrorBox,
  geoOf,
  KeyArrow,
  Listing,
  listingHeight,
  Mark,
  MARK_BAD,
  MARK_KEY,
  TableName,
  X0,
} from "./parts";

const TOP = 380;
const CUST_X = 620;
const MERGED_X = 1120;
const SIZE = 20;

/** A frame without one of its columns, for a figure that does not need it. */
const without = (t: { cols: string[]; rows: string[][] }, col: string) => {
  const j = t.cols.indexOf(col);
  return { cols: t.cols.filter((_, k) => k !== j), rows: t.rows.map((r) => r.filter((_, k) => k !== j)) };
};

/**
 * Question 6, the opening's merge explained (the video's own frames).
 * Customer 2 has two rows, so each of their two orders draws two arrows (in
 * the trap's red) and comes back twice: four rows become six, 265 becomes
 * 375. Then the guards, on the left where the inputs were: is_unique is
 * False, validate="many_to_one" raises pandas' MergeError, and a length
 * check after the merge.
 */
export const FanoutScene: React.FC = () => {
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("fanout").from;
  const qAt = n.word("fanout", "Question");
  const textAt = n.word("fanout", "How can a merge");
  const asked = n.beat("fanout").to;
  const backAt = n.word("fanout-why", "Back to the opening");
  const twoAt = n.word("fanout-why", "Customer two has two rows");
  const osloAt = n.word("fanout-why", "Oslo and Bergen");
  const twiceAt = n.word("fanout-why", "each of their orders matches twice");
  const sixAt = n.word("fanout-why", "Four rows become six");
  const countedAt = n.word("fanout-why", "each counted twice");
  const uniqueAt = n.word("fanout-guard", "check that the key is unique");
  const validateAt = n.word("fanout-guard", "pass validate equals many to one");
  const raisesAt = n.word("fanout-guard", "pandas raises a merge error");
  const afterAt = n.word("fanout-guard", "compare the row count");
  const gapsAt = n.word("missing-in", "the values that aren't there");
  const end = n.beat("missing-in").to;
  const outInputs = uniqueAt - 4;

  const O = without(FANOUT.orders, "order_id");
  const og = geoOf(O, X0, y(TOP), h, { rowH: 50 });
  const C = FANOUT.customers;
  const cg = geoOf(C, CUST_X, y(TOP), h, { rowH: 50 });
  const full = FANOUT.merged;
  const order = full.cols.indexOf("order_id");
  const extra = full.rows.flatMap((r, i) => (i > 0 && full.rows[i - 1][order] === r[order] ? [i] : []));
  const M = without(full, "order_id");
  const mg = geoOf(M, MERGED_X, y(TOP), h, { rowH: 50 });
  const amount = M.cols.indexOf("amount");

  const key = C.cols.indexOf("customer_id");
  const dupe = C.rows.flatMap((r, i) => (C.rows.filter((s) => s[key] === r[key]).length > 1 ? [i] : []));
  const matches = O.rows.flatMap((r, i) =>
    C.rows.flatMap((c, j) => (c[key] === r[O.cols.indexOf("customer_id")] ? [{ from: i, to: j }] : [])),
  );
  const [nBefore, sumBefore] = FANOUT.before;
  const [nAfter, sumAfter] = FANOUT.after;

  // The guards, on the left once the inputs have gone.
  const U = FANOUT.unique;
  const V = FANOUT.validate;
  const uTop = y(TOP);
  const vTop = uTop + listingHeight(1, SIZE) + h(84);
  const eTop = vTop + listingHeight(V.lines.length, SIZE) + h(16);

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={twoAt + 6} level={-34} />
      <Sfx name="el-whoosh" at={twiceAt + 4} level={-34} />
      <Sfx name="el-scratch" at={countedAt + 4} level={-32} />
      <Sfx name="el-pencil" at={uniqueAt + 4} level={-34} />
      <Sfx name="el-scratch" at={raisesAt + 4} level={-32} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={6} at={qAt - 4} textAt={textAt - 4} size={60}>
          How can a merge silently blow up your row count?
        </QuestionCard>

        {/* ── The inputs, and every match ── */}
        <TableName g={og} at={asked - 6} out={outInputs}>
          orders
        </TableName>
        <DataTable
          g={og}
          cols={colsOf(O, { customer_id: { ink: BLUE_INK } })}
          at={asked - 6}
          out={outInputs}
          rows={O.rows.map((cells, i) => ({ cells, at: asked - 2 + i * 2 }))}
        />
        <Note at={backAt} x={X0} y={og.rowTop(O.rows.length) + h(20)} out={outInputs}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap", ...TABULAR }}>
            {nBefore} rows, revenue {sumBefore}
          </span>
        </Note>
        <TableName g={cg} at={backAt} out={outInputs}>
          customers
        </TableName>
        <DataTable
          g={cg}
          cols={colsOf(C, { customer_id: { ink: BLUE_INK } })}
          at={backAt}
          out={outInputs}
          rows={C.rows.map((cells, i) => ({ cells, at: backAt + 4 + i * 2 }))}
          bands={dupe.map((row, k) => ({ row, at: twoAt + 6 + k * 3, color: MARK_BAD }))}
          marks={dupe.map((row) => ({ row, col: C.cols.indexOf("city"), at: osloAt + (row - dupe[0]) * 8 }))}
        />
        {matches.map((m, k) => {
          const doubled = dupe.includes(m.to);
          return (
            <KeyArrow
              key={k}
              from={[og.right + 12, og.rowMid(m.from)]}
              to={[CUST_X - 12, cg.rowMid(m.to)]}
              at={(doubled ? twiceAt : backAt + 10) + k * 3}
              out={outInputs}
              color={doubled ? ACCENT : undefined}
            />
          );
        })}

        {/* ── The result, six rows ── */}
        <TableName g={mg} at={sixAt - 4}>
          merged
        </TableName>
        <DataTable
          g={mg}
          cols={colsOf(M, { customer_id: { ink: BLUE_INK } })}
          at={sixAt - 4}
          rows={M.rows.map((cells, i) => ({ cells, at: sixAt + i * 3, grow: extra.includes(i) }))}
          bands={extra.map((row) => ({ row, at: countedAt, color: MARK_BAD }))}
          marks={extra.flatMap((row) => [
            { row: row - 1, col: amount, at: countedAt + 4, color: MARK_BAD },
            { row, col: amount, at: countedAt + 4, color: MARK_BAD },
          ])}
        />
        <Note at={sixAt + 12} x={MERGED_X} y={mg.rowTop(M.rows.length) + h(20)}>
          <span style={{ ...note(26, ACCENT_INK), fontWeight: 650, whiteSpace: "nowrap", ...TABULAR }}>
            {nAfter} rows, revenue {sumAfter}
          </span>
        </Note>

        {/* ── The guards ── */}
        <Listing lines={U.lines} x={X0} top={uTop} width={620} size={SIZE} at={uniqueAt} />
        <Console lines={[U.value]} x={X0 + 640} top={uTop + 4} width={130} at={uniqueAt + 10} marks={[{ line: 0, at: uniqueAt + 16, color: MARK_BAD }]} />
        <Listing lines={V.lines} x={X0} top={vTop} width={880} size={SIZE} at={validateAt - 4} marks={[{ line: 1, at: validateAt + 6, color: MARK_KEY }]} />
        <ErrorBox x={X0} top={eTop} width={880} at={raisesAt} kind={V.kind} message={V.message} size={20} />
        <Note at={afterAt} x={X0} y={eTop + h(118)}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap", ...TABULAR }}>
            after a merge: <Mark at={afterAt + 8} out={gapsAt + 4}>{nAfter} rows, where you expected {nBefore}</Mark>
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
