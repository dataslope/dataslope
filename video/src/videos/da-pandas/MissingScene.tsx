import React from "react";
import { AbsoluteFill } from "remotion";
import { QMono, QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, INK, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { MISSING } from "./data";
import {
  colsOf,
  Console,
  DataTable,
  Drift,
  ElbowArrow,
  geoOf,
  Listing,
  listingHeight,
  MARK_BAD,
  TableName,
  X0,
} from "./parts";

const TOP = 340;
const MID_X = 640;
const RIGHT_X = 1240;
const SIZE = 22;

/**
 * Questions 9 and 10. The page's frame with its gaps: isna().sum() finds
 * them, == np.nan finds none, dropna keeps two rows and fillna(0) keeps four.
 * Then a daily price with gaps, forward and backward filled, and the arrow
 * that shows backward fill taking a later day's price.
 */
export const MissingScene: React.FC = () => {
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("missing").from;
  const qAt = n.word("missing", "Question");
  const textAt = n.word("missing", "How do you");
  const asked = n.beat("missing").to;
  const isnaAt = n.word("missing-find", "Is NA");
  const oneRegionAt = n.word("missing-find", "one region");
  const equalsAt = n.word("missing-equals", "Not with equals");
  const zeroAt = n.word("missing-equals", "finds zero");
  const dropAt = n.word("missing-choose", "Drop NA");
  const twoRowsAt = n.word("missing-choose", "keeps two rows");
  const fillAt = n.word("missing-choose", "Fill NA with zero");
  const fourAt = n.word("missing-choose", "all four");
  const meansAt = n.word("missing-choose", "really means zero");
  const q10At = n.word("fill", "Question ten");
  const ffillAt = n.word("fill", "Forward fill carries");
  const bfillAt = n.word("fill", "Backward fill pulls");
  const futureAt = n.word("fill-trap", "borrows from the future");
  const chartAt = n.word("fill-trap", "Fine for a chart");
  const wrongAt = n.word("fill-trap", "Wrong for anything");
  const end = n.beat("copy-in").to;

  const g = geoOf(MISSING.frame, X0, y(TOP), h);
  const lineH = listingHeight(1, SIZE);
  // An unnamed Series prints no header, so its table has none either.
  const ig = geoOf(MISSING.isnaSum, MID_X, y(TOP) + lineH + h(16), h, { headH: MISSING.isnaSum.cols.every((c) => c === "") ? 0 : undefined });
  const eqTop = ig.rowTop(MISSING.isnaSum.rows.length) + h(40);
  const dg = geoOf(MISSING.dropna, MID_X, y(TOP) + lineH + h(16), h);
  const fg = geoOf(MISSING.fillna, RIGHT_X, y(TOP) + lineH + h(16), h);
  const filledRows = MISSING.fillna.rows.flatMap((r, i) => (MISSING.frame.rows[i][2] === "NaN" ? [i] : []));
  const out9 = q10At - 4;

  // Question 10: the price and its two fills.
  const F = MISSING.filled;
  const pg = geoOf(F, X0, y(TOP), h);
  const gaps = F.rows.flatMap((r, i) => (r[1] === "NaN" ? [i] : []));
  const ffilled = gaps.filter((i) => F.rows[i][2] !== "NaN");
  const bfilled = gaps.filter((i) => F.rows[i][3] !== "NaN");
  // The later price backward fill took, and the rows it went back to.
  const source = F.rows.findIndex((r, i) => i > bfilled[0] && r[1] !== "NaN");
  const arrowX = pg.right + 26;

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={oneRegionAt} level={-32} />
      <Sfx name="el-scratch" at={zeroAt} level={-30} />
      <Sfx name="el-pop" at={twoRowsAt} level={-32} />
      <Sfx name="el-pop" at={fourAt} level={-32} />
      <Sfx name="el-pencil" at={ffillAt + 6} level={-34} />
      <Sfx name="el-pencil" at={bfillAt + 6} level={-34} />
      <Sfx name="el-scratch" at={futureAt + 4} level={-32} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={9} at={qAt - 4} textAt={textAt - 4} out={q10At - 4}>
          How do you handle missing data?
        </QuestionCard>
        <QuestionCard n={10} at={q10At} textAt={q10At + 10}>
          What do <QMono>ffill</QMono> and <QMono>bfill</QMono> do?
        </QuestionCard>

        {/* ── The page's frame, with its gaps ── */}
        <TableName g={g} at={asked - 6} out={out9}>
          df
        </TableName>
        <DataTable
          g={g}
          cols={colsOf(MISSING.frame)}
          at={asked - 6}
          out={out9}
          rows={MISSING.frame.rows.map((cells, i) => ({ cells, at: asked - 2 + i * 2 }))}
          bands={MISSING.dropna.rows.map((r) => MISSING.frame.rows.findIndex((s) => s[0] === r[0])).map((row, k) => ({
            row,
            at: twoRowsAt + k * 4,
            out: fillAt,
          }))}
        />

        {/* ── Find them, and not with == ── */}
        <Listing lines={MISSING.isnaSum.lines} x={MID_X} top={y(TOP)} width={520} size={SIZE} at={isnaAt - 4} out={dropAt - 4} />
        <DataTable
          g={ig}
          cols={colsOf(MISSING.isnaSum)}
          at={isnaAt + 4}
          out={dropAt - 4}
          rows={MISSING.isnaSum.rows.map((cells, i) => ({ cells, at: oneRegionAt - 4 + i * 6 }))}
        />
        <Listing lines={MISSING.equalsNan.lines} x={MID_X} top={eqTop} width={640} size={SIZE} at={equalsAt - 2} out={dropAt - 4} marks={[{ line: 0, at: equalsAt + 8, color: MARK_BAD }]} />
        <Console lines={[MISSING.equalsNan.value]} x={MID_X} top={eqTop + lineH + h(12)} width={120} at={zeroAt - 4} out={dropAt - 4} marks={[{ line: 0, at: zeroAt + 2, color: MARK_BAD }]} />

        {/* ── Drop, or fill ── */}
        <Listing lines={MISSING.dropna.lines} x={MID_X} top={y(TOP)} width={560} size={SIZE} at={dropAt - 2} out={out9} />
        <DataTable
          g={dg}
          cols={colsOf(MISSING.dropna)}
          at={twoRowsAt - 6}
          out={out9}
          rows={MISSING.dropna.rows.map((cells, i) => ({ cells, at: twoRowsAt - 2 + i * 3 }))}
        />
        <Listing lines={MISSING.fillna.lines} x={RIGHT_X} top={y(TOP)} width={480} size={SIZE} at={fillAt - 2} out={out9} />
        <DataTable
          g={fg}
          cols={colsOf(MISSING.fillna)}
          at={fourAt - 8}
          out={out9}
          rows={MISSING.fillna.rows.map((cells, i) => ({ cells, at: fourAt - 4 + i * 2 }))}
          marks={filledRows.map((row) => ({ row, col: 1, at: fourAt + 8 }))}
        />
        <Note at={meansAt - 4} x={RIGHT_X} y={fg.rowTop(MISSING.fillna.rows.length) + h(26)} out={out9}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>only if missing means zero</span>
        </Note>

        {/* ── Question 10: forward and backward fill ── */}
        <TableName g={pg} at={q10At + 6}>
          a daily price
        </TableName>
        <DataTable
          g={pg}
          cols={colsOf(F, { ffill: { at: ffillAt - 2 }, bfill: { at: bfillAt - 2 } })}
          at={q10At + 6}
          rows={F.rows.map((cells, i) => ({ cells, at: q10At + 10 + i * 2 }))}
          marks={[
            ...ffilled.map((row, k) => ({ row, col: 2, at: ffillAt + 8 + k * 4, out: futureAt })),
            ...bfilled.map((row, k) => ({ row, col: 3, at: bfillAt + 8 + k * 4, out: futureAt })),
            ...bfilled.map((row) => ({ row, col: 3, at: futureAt + 4, color: MARK_BAD })),
          ]}
        />
        <ElbowArrow
          points={[
            [arrowX, pg.rowMid(source)],
            [arrowX + 40, pg.rowMid(source)],
            [arrowX + 40, pg.rowMid(bfilled[0])],
            [arrowX + 4, pg.rowMid(bfilled[0])],
          ]}
          at={futureAt}
          color={ACCENT}
        />
        <Note at={futureAt + 8} x={arrowX + 64} y={pg.rowMid(bfilled[0]) + h(10)}>
          <span style={{ ...note(28, ACCENT_INK), whiteSpace: "nowrap", fontWeight: 650 }}>from the future</span>
        </Note>
        <Note at={chartAt - 2} x={arrowX + 64} y={pg.rowTop(F.rows.length) - h(60)}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>fine for a chart</span>
        </Note>
        <Note at={wrongAt - 2} x={arrowX + 64} y={pg.rowTop(F.rows.length) - h(14)}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>wrong for anything computed as the day happens</span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
