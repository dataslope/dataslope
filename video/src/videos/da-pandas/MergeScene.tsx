import React from "react";
import { AbsoluteFill } from "remotion";
import { QMono, QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { INK, INK_SOFT, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { MERGE } from "./data";
import {
  colsOf,
  DataTable,
  Drift,
  geoOf,
  Listing,
  listingHeight,
  MARK_BAD,
  MARK_OK,
  Mono,
  TableName,
  X0,
} from "./parts";

const TOP = 340;
const MID_X = 680;
const RIGHT_X = 1240;
/** The header face for the three tables abreast in question 6. */
const HEAD = 19;
const SIZE = 22;

/**
 * Questions 6, 7 and 8, on the video's own orders: January and February
 * stacked with concat (labels 0, 1, 0, 1, so .loc[0] returns two orders,
 * then 0 to 3 with ignore_index), merged with the customers shown beside
 * them, and stock and prices merged on both keys (two rows, the list shown
 * as it is said) against one key (four rows from two), the two results one
 * above the other.
 */
export const MergeScene: React.FC = () => {
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("merge").from;
  const qAt = n.word("merge", "Question");
  const textAt = n.word("merge", "When do you");
  const asked = n.beat("merge").to;
  const concatAt = n.word("merge-what", "Concat stacks");
  const topAt = n.word("merge-what", "one on top of the other");
  const sideAt = n.word("merge-what", "side by side");
  const mergeAt = n.word("merge-join", "Merge is a SQL join");
  const customerAt = n.word("merge-join", "each order and its customer");
  const joinAt = n.word("merge-join", "join is a merge on the index");
  const q7At = n.word("merge-index", "Question seven");
  const labelsAt = n.word("merge-index", "zero, one, zero, one");
  const twoRowsAt = n.word("merge-dup", "Two rows answer");
  const lockZeroAt = n.word("merge-dup", "lock zero returns");
  const ordersAt = n.word("merge-dup", "two orders");
  const linesUpAt = n.word("merge-dup", "anything that lines up");
  const ignoreAt = n.word("merge-ignore", "ignore index");
  const runAt = n.word("merge-ignore", "zero to three");
  const q8At = n.word("merge-keys", "Question eight");
  const listAt = n.word("merge-keys", "Pass a list");
  const keyedAt = n.word("merge-keys", "product and warehouse");
  const aloneAt = n.word("merge-fan", "product alone");
  const meetsAt = n.word("merge-fan", "every warehouse meets");
  const fourAt = n.word("merge-fan", "four rows from two");
  const bothAt = n.word("merge-fan", "Merge on both");
  const differAt = n.word("merge-fan", "If the names differ");
  const end = n.beat("missing-in").to;

  const jg = geoOf(MERGE.jan, X0, y(TOP), h, { headSize: HEAD });
  const fg = geoOf(MERGE.feb, X0, jg.rowTop(2) + h(70), h, { headSize: HEAD });
  const lineH = listingHeight(1, SIZE);
  const stg = geoOf(MERGE.stacked, MID_X, y(TOP) + lineH + h(20), h, { extra: MERGE.clean.rows, headSize: HEAD });
  const mergeH = listingHeight(MERGE.merged.lines.length, SIZE);
  const mg = geoOf(MERGE.merged, RIGHT_X, y(TOP) + mergeH + h(20), h, { headSize: HEAD });
  // The customers the merge looks up, where its result will land.
  const cg = geoOf(MERGE.customers, RIGHT_X, mg.top, h, { headSize: HEAD });
  // Question 7: label 0 of the stacked frame, asked for with loc.
  const dg = geoOf(MERGE.dupLabel, RIGHT_X, y(TOP) + lineH + h(20), h, { headSize: HEAD });
  const zeros = MERGE.stacked.rows.flatMap((r, i) => (r[0] === "0" ? [i] : []));
  const relabelled = MERGE.stacked.rows.flatMap((r, i) => (r[0] !== MERGE.clean.rows[i][0] ? [i] : []));

  const sg = geoOf(MERGE.stock, X0, y(TOP), h);
  const pg = geoOf(MERGE.prices, X0, sg.rowTop(2) + h(70), h);
  // Question 8, top to bottom: the list of keys and the two rows it gives,
  // then one key and the four rows it gives, set back once both are said.
  const compact = { headSize: HEAD, headH: 44, rowH: 46 };
  const tg = geoOf(MERGE.twoKeys, MID_X, y(TOP) + lineH + h(16), h, compact);
  const oneTop = tg.rowTop(MERGE.twoKeys.rows.length) + h(24);
  const og = geoOf(MERGE.oneKey, MID_X, oneTop + lineH + h(16), h, compact);
  const fanned = MERGE.oneKey.rows.flatMap((r, i) => (r[2] !== r[4] ? [i] : []));
  const keyCols = MERGE.twoKeys.lines[0].match(/on=\[(.*)\]/)![1].split(", ").map((k) => MERGE.stock.cols.indexOf(k.replace(/"/g, "")));
  const out1 = q8At - 4;

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={topAt} level={-34} />
      <Sfx name="el-pencil" at={customerAt} level={-34} />
      <Sfx name="el-scratch" at={twoRowsAt + 4} level={-32} />
      <Sfx name="el-pop" at={runAt} level={-32} />
      <Sfx name="el-scratch" at={fourAt} level={-30} />
      <Sfx name="el-pop" at={bothAt + 8} level={-32} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={6} at={qAt - 4} textAt={textAt - 4} out={q7At - 4}>
          When do you use <QMono>merge</QMono>, <QMono>concat</QMono>, or <QMono>join</QMono>?
        </QuestionCard>
        <QuestionCard n={7} at={q7At} textAt={q7At + 10} out={q8At - 4}>
          Why reset the index when you stack?
        </QuestionCard>
        <QuestionCard n={8} at={q8At} textAt={q8At + 10}>
          How do you merge on several keys?
        </QuestionCard>

        {/* ── Two months of orders, and the customers they name ── */}
        <TableName g={jg} at={asked - 6} out={out1}>
          jan
        </TableName>
        <DataTable g={jg} cols={colsOf(MERGE.jan)} at={asked - 6} out={out1} rows={MERGE.jan.rows.map((cells, i) => ({ cells, at: asked - 2 + i * 2 }))} />
        <TableName g={fg} at={asked + 2} out={out1}>
          feb
        </TableName>
        <DataTable g={fg} cols={colsOf(MERGE.feb)} at={asked + 2} out={out1} rows={MERGE.feb.rows.map((cells, i) => ({ cells, at: asked + 6 + i * 2 }))} />
        <TableName g={cg} at={asked + 10} out={mergeAt - 6}>
          customers
        </TableName>
        <DataTable
          g={cg}
          cols={colsOf(MERGE.customers)}
          at={asked + 10}
          out={customerAt - 6}
          rows={MERGE.customers.rows.map((cells, i) => ({ cells, at: asked + 14 + i * 2 }))}
        />

        {/* ── concat: stacked; then the index reset ── */}
        <Listing lines={MERGE.stacked.lines} x={MID_X} top={y(TOP)} width={500} size={SIZE} at={concatAt - 2} out={ignoreAt - 2} />
        <Listing lines={MERGE.clean.lines} x={MID_X} top={y(TOP)} width={720} size={SIZE} at={ignoreAt + 2} out={out1} marks={[{ line: 0, at: ignoreAt + 10, color: MARK_OK }]} />
        <DataTable
          g={stg}
          cols={colsOf(MERGE.stacked)}
          at={topAt - 4}
          out={out1}
          rows={MERGE.stacked.rows.map((cells, i) => ({ cells, at: topAt + i * 3 }))}
          marks={[
            ...MERGE.stacked.rows.map((_, i) => ({ row: i, col: 0, at: labelsAt + i * 4, out: twoRowsAt })),
            ...relabelled.map((row) => ({ row, col: 0, at: runAt + 4, color: MARK_OK })),
          ]}
          bands={zeros.map((row, k) => ({ row, at: twoRowsAt + 4 + k * 4, out: ignoreAt, color: MARK_BAD }))}
          swaps={relabelled.map((row) => ({ row, col: 0, at: runAt, value: MERGE.clean.rows[row][0] }))}
        />
        <Note at={sideAt - 2} x={MID_X} y={stg.rowTop(MERGE.stacked.rows.length) + h(26)} out={q7At - 4}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>
            <Mono>axis=1</Mono>: side by side
          </span>
        </Note>

        {/* ── Question 7: label 0 names two orders ── */}
        {/* It goes once ignore_index fixes it: the reset listing needs the room. */}
        <Listing lines={MERGE.dupLabel.lines} x={RIGHT_X} top={y(TOP)} width={520} size={SIZE} at={lockZeroAt - 4} out={ignoreAt - 6} />
        <DataTable
          g={dg}
          cols={colsOf(MERGE.dupLabel)}
          at={lockZeroAt + 2}
          out={ignoreAt - 6}
          rows={MERGE.dupLabel.rows.map((cells, i) => ({ cells, at: lockZeroAt + 6 + i * 3 }))}
          bands={MERGE.dupLabel.rows.map((_, row) => ({ row, at: ordersAt + 2 + row * 4, color: MARK_BAD }))}
        />
        <Note at={linesUpAt - 2} x={RIGHT_X} y={dg.rowTop(MERGE.dupLabel.rows.length) + h(26)} out={ignoreAt - 6}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            anything aligned on the index
            <br />
            pairs the wrong rows
          </span>
        </Note>

        {/* ── merge: a SQL join on key columns ── */}
        <Listing lines={MERGE.merged.lines} x={RIGHT_X} top={y(TOP)} width={580} size={SIZE} at={mergeAt - 2} out={q7At - 4} />
        <DataTable
          g={mg}
          cols={colsOf(MERGE.merged)}
          at={customerAt - 4}
          out={q7At - 4}
          rows={MERGE.merged.rows.map((cells, i) => ({ cells, at: customerAt + i * 3 }))}
        />
        <Note at={joinAt - 2} x={RIGHT_X} y={mg.rowTop(MERGE.merged.rows.length) + h(26)} out={q7At - 4}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>
            <Mono>join</Mono> is a merge on the index
          </span>
        </Note>

        {/* ── Several keys: the tables, and the list, as it is said ── */}
        <TableName g={sg} at={q8At + 10}>
          stock
        </TableName>
        <DataTable
          g={sg}
          cols={colsOf(MERGE.stock)}
          at={q8At + 10}
          rows={MERGE.stock.rows.map((cells, i) => ({ cells, at: q8At + 14 + i * 2 }))}
          marks={MERGE.stock.rows.flatMap((_, row) => keyCols.map((col, k) => ({ row, col, at: keyedAt + k * 6 + row * 2, out: aloneAt })))}
        />
        <TableName g={pg} at={q8At + 18}>
          prices
        </TableName>
        <DataTable
          g={pg}
          cols={colsOf(MERGE.prices)}
          at={q8At + 18}
          rows={MERGE.prices.rows.map((cells, i) => ({ cells, at: q8At + 22 + i * 2 }))}
          marks={MERGE.prices.rows.flatMap((_, row) => keyCols.map((col, k) => ({ row, col, at: keyedAt + 4 + k * 6 + row * 2, out: aloneAt })))}
        />

        <Listing
          lines={MERGE.twoKeys.lines}
          x={MID_X}
          top={y(TOP)}
          width={800}
          size={SIZE}
          at={listAt - 4}
          marks={[
            { line: 0, at: listAt + 4, out: bothAt },
            { line: 0, at: bothAt + 6, color: MARK_OK },
          ]}
        />
        <DataTable
          g={tg}
          cols={colsOf(MERGE.twoKeys)}
          at={bothAt + 2}
          rows={MERGE.twoKeys.rows.map((cells, i) => ({ cells, at: bothAt + 6 + i * 3 }))}
        />
        <Note at={differAt - 2} x={tg.right + 40} y={tg.rowTop(0) + h(4)}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>
            names differ? <Mono>left_on=</Mono> and <Mono>right_on=</Mono>
          </span>
        </Note>

        <Listing
          lines={MERGE.oneKey.lines}
          x={MID_X}
          top={oneTop}
          width={760}
          size={SIZE}
          at={aloneAt - 4}
          dim={bothAt}
          marks={[{ line: 0, at: fourAt, color: MARK_BAD }]}
        />
        <DataTable
          g={og}
          cols={colsOf(MERGE.oneKey)}
          at={meetsAt - 4}
          dim={bothAt}
          rows={MERGE.oneKey.rows.map((cells, i) => ({ cells, at: meetsAt + i * 3 }))}
          bands={fanned.map((row, k) => ({ row, at: fourAt + 4 + k * 3, color: MARK_BAD }))}
        />
        <Note at={fourAt + 12} x={og.right + 30} y={og.rowTop(0)} dim={bothAt}>
          <span style={{ ...note(24, INK_SOFT), whiteSpace: "nowrap" }}>
            <Mono>warehouse</Mono> is on both sides,
            <br />
            so the merge keeps <Mono>_x</Mono> and <Mono>_y</Mono>
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
