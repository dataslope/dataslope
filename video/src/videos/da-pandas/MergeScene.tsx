import React from "react";
import { AbsoluteFill } from "remotion";
import { QMono, QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { INK, note } from "../../editorial/style";
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
 * stacked with concat (labels 0, 1, 0, 1, then 0 to 3 with ignore_index),
 * merged with their customers, and stock and prices merged on one key (four
 * rows from two) and on both (two).
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
  const mergeAt = n.word("merge-what", "Merge is a SQL join");
  const customerAt = n.word("merge-what", "each order and its customer");
  const joinAt = n.word("merge-what", "join is a merge on the index");
  const q7At = n.word("merge-index", "Question seven");
  const labelsAt = n.word("merge-index", "zero, one, zero, one");
  const twoRowsAt = n.word("merge-index", "Two rows answer");
  const ignoreAt = n.word("merge-index", "ignore index");
  const runAt = n.word("merge-index", "zero to three");
  const q8At = n.word("merge-keys", "Question eight");
  const stockAt = n.word("merge-keys", "Stock and prices");
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
  const zeros = MERGE.stacked.rows.flatMap((r, i) => (r[0] === "0" ? [i] : []));
  const relabelled = MERGE.stacked.rows.flatMap((r, i) => (r[0] !== MERGE.clean.rows[i][0] ? [i] : []));

  const sg = geoOf(MERGE.stock, X0, y(TOP), h);
  const pg = geoOf(MERGE.prices, X0, sg.rowTop(2) + h(70), h);
  const og = geoOf(MERGE.oneKey, MID_X, y(TOP) + lineH + h(20), h, { headSize: HEAD });
  const tg = geoOf(MERGE.twoKeys, MID_X, y(TOP) + lineH + h(20), h, { headSize: HEAD });
  const fanned = MERGE.oneKey.rows.flatMap((r, i) => (r[2] !== r[4] ? [i] : []));
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

        {/* ── Two months of orders ── */}
        <TableName g={jg} at={asked - 6} out={out1}>
          jan
        </TableName>
        <DataTable g={jg} cols={colsOf(MERGE.jan)} at={asked - 6} out={out1} rows={MERGE.jan.rows.map((cells, i) => ({ cells, at: asked - 2 + i * 2 }))} />
        <TableName g={fg} at={asked + 2} out={out1}>
          feb
        </TableName>
        <DataTable g={fg} cols={colsOf(MERGE.feb)} at={asked + 2} out={out1} rows={MERGE.feb.rows.map((cells, i) => ({ cells, at: asked + 6 + i * 2 }))} />

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

        {/* ── Several keys ── */}
        <TableName g={sg} at={stockAt - 4}>
          stock
        </TableName>
        <DataTable g={sg} cols={colsOf(MERGE.stock)} at={stockAt - 4} rows={MERGE.stock.rows.map((cells, i) => ({ cells, at: stockAt + i * 2 }))} />
        <TableName g={pg} at={stockAt + 4}>
          prices
        </TableName>
        <DataTable g={pg} cols={colsOf(MERGE.prices)} at={stockAt + 4} rows={MERGE.prices.rows.map((cells, i) => ({ cells, at: stockAt + 8 + i * 2 }))} />

        <Listing lines={MERGE.oneKey.lines} x={MID_X} top={y(TOP)} width={760} size={SIZE} at={aloneAt - 4} out={bothAt - 2} marks={[{ line: 0, at: fourAt, color: MARK_BAD }]} />
        <DataTable
          g={og}
          cols={colsOf(MERGE.oneKey)}
          at={meetsAt - 4}
          out={bothAt - 2}
          rows={MERGE.oneKey.rows.map((cells, i) => ({ cells, at: meetsAt + i * 3 }))}
          bands={fanned.map((row, k) => ({ row, at: fourAt + 4 + k * 3, color: MARK_BAD }))}
        />
        <Listing lines={MERGE.twoKeys.lines} x={MID_X} top={y(TOP)} width={800} size={SIZE} at={bothAt + 2} marks={[{ line: 0, at: bothAt + 10, color: MARK_OK }]} />
        <DataTable
          g={tg}
          cols={colsOf(MERGE.twoKeys)}
          at={bothAt + 6}
          rows={MERGE.twoKeys.rows.map((cells, i) => ({ cells, at: bothAt + 10 + i * 3 }))}
        />
        <Note at={differAt - 2} x={MID_X} y={tg.rowTop(MERGE.twoKeys.rows.length) + h(30)}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>
            names differ? <Mono>left_on=</Mono> and <Mono>right_on=</Mono>
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
