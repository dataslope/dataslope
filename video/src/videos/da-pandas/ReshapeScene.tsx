import React from "react";
import { AbsoluteFill } from "remotion";
import { QMono, QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { INK, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { RESHAPE } from "./data";
import {
  colsOf,
  DataTable,
  Drift,
  ErrorBox,
  geoOf,
  Listing,
  listingHeight,
  MARK_BAD,
  MARK_OK,
  TableName,
  X0,
} from "./parts";

const TOP = 340;
const LIST_X = 820;
const SIZE = 22;

/**
 * Questions 16 and 17. The page's melt call turns two customers' quarterly
 * columns into four rows; then the video's own long table, where North and A
 * appear twice, so pivot refuses with pandas' own error and pivot_table sums
 * the pair to 30 and fills the empty cell with 0.
 */
export const ReshapeScene: React.FC = () => {
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("reshape").from;
  const qAt = n.word("reshape", "Question");
  const textAt = n.word("reshape", "How do you");
  const asked = n.beat("reshape").to;
  const meltAt = n.word("reshape-melt", "Melt");
  const turnsAt = n.word("reshape-melt", "turns into rows");
  const quarterAt = n.word("reshape-melt", "a quarter column");
  const salesAt = n.word("reshape-melt", "a sales column");
  const fourAt = n.word("reshape-melt", "four rows");
  const q17At = n.word("reshape-pivot", "Question seventeen");
  const onlyAt = n.word("reshape-pivot", "Pivot only reshapes");
  const twiceAt = n.word("reshape-pivot", "appear twice");
  const dupAt = n.word("reshape-pivot", "index contains duplicate entries");
  const tableAt = n.word("reshape-table", "Pivot table aggregates");
  const thirtyAt = n.word("reshape-table", "sum to thirty");
  const emptyAt = n.word("reshape-table", "the empty cell");
  const end = n.beat("reshape-table").to;

  const wg = geoOf(RESHAPE.wide, X0, y(TOP), h);
  const mg = geoOf(RESHAPE.melted, X0, wg.rowTop(RESHAPE.wide.rows.length) + h(90), h);
  const quarters = RESHAPE.wide.cols.slice(2);
  const out16 = q17At - 4;

  const lg = geoOf(RESHAPE.long, X0, y(TOP), h);
  const dup = RESHAPE.long.rows.flatMap((r, i) =>
    RESHAPE.long.rows.filter((s) => s[1] === r[1] && s[2] === r[2]).length > 1 ? [i] : [],
  );
  const lineH = listingHeight(1, SIZE);
  const errTop = y(TOP) + lineH + h(12);
  const ptTop = errTop + h(100);
  const pg = geoOf(RESHAPE.pivotTable, LIST_X + 460, ptTop, h);
  const PT = RESHAPE.pivotTable;
  const dupRegion = RESHAPE.long.rows[dup[0]][1];
  const dupCat = RESHAPE.long.rows[dup[0]][2];
  const summed = { row: PT.rows.findIndex((r) => r[0] === dupRegion), col: PT.cols.indexOf(dupCat) };
  const empty = PT.rows.flatMap((r, i) => r.flatMap((v, j) => (j > 0 && v === "0" ? [{ row: i, col: j }] : [])));

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={turnsAt + 2} level={-34} />
      <Sfx name="el-pop" at={fourAt} level={-32} />
      <Sfx name="el-scratch" at={dupAt} level={-30} />
      <Sfx name="el-pop" at={thirtyAt + 4} level={-32} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={16} at={qAt - 4} textAt={textAt - 4} out={q17At - 4}>
          How do you reshape from wide to long?
        </QuestionCard>
        <QuestionCard n={17} at={q17At} textAt={q17At + 10}>
          <QMono>pivot</QMono> or <QMono>pivot_table</QMono>?
        </QuestionCard>

        {/* ── Question 16: melt ── */}
        <TableName g={wg} at={asked - 6} out={out16}>
          wide
        </TableName>
        <DataTable
          g={wg}
          cols={colsOf(RESHAPE.wide)}
          at={asked - 6}
          out={out16}
          rows={RESHAPE.wide.rows.map((cells, i) => ({ cells, at: asked - 2 + i * 3 }))}
          marks={quarters.flatMap((_, q) => RESHAPE.wide.rows.map((__, i) => ({ row: i, col: 2 + q, at: turnsAt + q * 12 + i * 3 })))}
        />
        <Listing lines={RESHAPE.melted.lines} x={LIST_X} top={y(TOP)} width={600} size={SIZE} at={meltAt - 4} out={out16} />
        <TableName g={mg} at={turnsAt + 4} out={out16}>
          long
        </TableName>
        <DataTable
          g={mg}
          cols={colsOf(RESHAPE.melted)}
          at={turnsAt + 4}
          out={out16}
          rows={RESHAPE.melted.rows.map((cells, i) => ({ cells, at: turnsAt + 8 + i * 3 }))}
          marks={[
            ...RESHAPE.melted.rows.map((_, i) => ({ row: i, col: 2, at: quarterAt + i * 2, out: salesAt })),
            ...RESHAPE.melted.rows.map((_, i) => ({ row: i, col: 3, at: salesAt + i * 2, out: fourAt + 30 })),
          ]}
        />
        <Note at={fourAt - 4} x={mg.right + 40} y={mg.rowTop(1)} out={out16}>
          <span style={{ ...note(28, INK), whiteSpace: "nowrap" }}>
            {RESHAPE.wide.rows.length} customers × {quarters.length} quarters = {RESHAPE.melted.rows.length} rows
          </span>
        </Note>

        {/* ── Question 17: pivot refuses, pivot_table aggregates ── */}
        <TableName g={lg} at={q17At + 6}>
          long
        </TableName>
        <DataTable
          g={lg}
          cols={colsOf(RESHAPE.long)}
          at={q17At + 6}
          rows={RESHAPE.long.rows.map((cells, i) => ({ cells, at: q17At + 10 + i * 2 }))}
          bands={[
            ...dup.map((row, k) => ({ row, at: twiceAt + k * 4, out: tableAt, color: MARK_BAD })),
            ...dup.map((row, k) => ({ row, at: thirtyAt + k * 4 })),
          ]}
        />
        <Listing lines={RESHAPE.pivot.lines} x={LIST_X} top={y(TOP)} width={1000} size={SIZE} at={onlyAt - 4} />
        <ErrorBox x={LIST_X} top={errTop} width={1000} at={dupAt - 4} kind={RESHAPE.pivot.kind} message={RESHAPE.pivot.message} />
        <Listing lines={PT.lines} x={LIST_X} top={ptTop} width={420} size={SIZE} at={tableAt - 4} />
        <DataTable
          g={pg}
          cols={colsOf(PT)}
          at={tableAt + 6}
          rows={PT.rows.map((cells, i) => ({ cells, at: tableAt + 10 + i * 3 }))}
          marks={[
            { ...summed, at: thirtyAt + 4, color: MARK_OK },
            ...empty.map((c) => ({ ...c, at: emptyAt })),
          ]}
        />
      </Drift>
    </AbsoluteFill>
  );
};
