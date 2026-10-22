import React from "react";
import { AbsoluteFill } from "remotion";
import { QMono, QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { BLUE_INK, INK, INK_SOFT, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { LOC } from "./data";
import {
  colsOf,
  Console,
  consoleHeight,
  DataTable,
  Drift,
  ErrorBox,
  geoOf,
  Listing,
  listingHeight,
  MARK_OK,
  TableName,
  X0,
} from "./parts";

const TOP = 340;
const NORTH_X = 690;
const LIST_X = 1240;
const LIST_W = 560;
const SIZE = 22;

/** A frame with its positions drawn as a column of their own, beside the
 *  index labels pandas shows: the two things loc and iloc count by. */
const withPositions = (t: { cols: string[]; rows: string[][] }) => ({
  cols: ["position", "label", ...t.cols.slice(1)],
  rows: t.rows.map((r, i) => [String(i), ...r]),
});

/**
 * Question 1, loc against iloc, on the page's five-row frame. Positions and
 * labels agree on a fresh frame, so loc[3] and iloc[3] find the same 50.
 * Keep the North rows and they part: labels 2 and 4 at positions 0 and 1,
 * where iloc[0] finds the first row and loc[0] raises KeyError.
 */
export const LocScene: React.FC = () => {
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("loc").from;
  const qAt = n.word("loc", "Question");
  const textAt = n.word("loc", "What's");
  const asked = n.beat("loc").to;
  const labelAt = n.word("loc-rule", "Lock picks by label");
  const posAt = n.word("loc-rule", "Eye lock picks by position");
  const freshAt = n.word("loc-same", "fresh frame");
  const lockThreeAt = n.word("loc-same", "Lock at label three");
  const eyeThreeAt = n.word("loc-same", "eye lock at row three");
  const fiftyAt = n.word("loc-same", "fifty");
  const northAt = n.word("loc-trap", "North rows");
  const labelsAt = n.word("loc-trap", "two and four");
  const eyeZeroAt = n.word("loc-trap", "Eye lock zero");
  const lockZeroAt = n.word("loc-trap", "Lock zero fails");
  const keyAt = n.word("loc-trap", "key error");
  const end = n.beat("loc-trap").to;

  const df = withPositions(LOC.frame);
  const g = geoOf(df, X0, y(TOP), h);
  const north = withPositions({ cols: LOC.north.cols, rows: LOC.north.rows });
  const ng = geoOf(north, NORTH_X, y(TOP), h);
  const cols = colsOf(df, { position: { ink: BLUE_INK, at: posAt - 2 }, label: { ink: INK_SOFT } });
  const ncols = colsOf(north, { position: { ink: BLUE_INK }, label: { ink: INK_SOFT } });
  const three = LOC.frame.rows.findIndex((r) => r[0] === "3");

  const lineH = listingHeight(1, SIZE);
  const outH = consoleHeight(1);
  const secondY = y(TOP) + lineH + outH + h(60);
  const seriesTop = y(TOP) + lineH + h(14) + lineH + h(44);
  const sg = geoOf(LOC.northIloc, LIST_X, seriesTop, h);
  const errTop = seriesTop + sg.headH + sg.rowH * LOC.northIloc.rows.length + h(40);

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={lockThreeAt} level={-32} />
      <Sfx name="el-pop" at={fiftyAt} level={-32} />
      <Sfx name="el-pencil" at={northAt + 4} level={-34} />
      <Sfx name="el-pop" at={eyeZeroAt + 6} level={-32} />
      <Sfx name="el-scratch" at={keyAt} level={-30} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={1} at={qAt - 4} textAt={textAt - 4}>
          What&apos;s the difference between <QMono>loc</QMono> and <QMono>iloc</QMono>?
        </QuestionCard>

        {/* ── The page's frame: labels, and the positions iloc counts ── */}
        <TableName g={g} at={asked - 6}>
          df
        </TableName>
        <DataTable
          g={g}
          cols={cols}
          at={asked - 6}
          rows={df.rows.map((cells, i) => ({ cells, at: asked - 2 + i * 2 }))}
          marks={[
            ...df.rows.map((_, i) => ({ row: i, col: 1, at: labelAt + 4 + i * 2, out: posAt })),
            ...df.rows.map((_, i) => ({ row: i, col: 0, at: posAt + 8 + i * 2, out: freshAt })),
            { row: three, col: 1, at: lockThreeAt + 2, out: northAt },
            { row: three, col: 0, at: eyeThreeAt + 2, out: northAt },
            { row: three, col: 3, at: fiftyAt, out: northAt },
          ]}
          dim={northAt + 6}
        />

        {/* ── On a fresh frame they agree ── */}
        <Listing lines={LOC.loc.lines} x={LIST_X} top={y(TOP)} width={LIST_W} size={SIZE} at={lockThreeAt - 4} out={northAt - 2} />
        <Console lines={[LOC.loc.value]} x={LIST_X} top={y(TOP) + lineH + h(10)} width={160} at={fiftyAt - 6} out={northAt - 2} />
        <Listing lines={LOC.iloc.lines} x={LIST_X} top={secondY} width={LIST_W} size={SIZE} at={eyeThreeAt - 4} out={northAt - 2} />
        <Console lines={[LOC.iloc.value]} x={LIST_X} top={secondY + lineH + h(10)} width={160} at={fiftyAt - 2} out={northAt - 2} />

        {/* ── The North rows keep their labels ── */}
        <TableName g={ng} at={northAt}>
          north
        </TableName>
        <DataTable
          g={ng}
          cols={ncols}
          at={northAt}
          rows={north.rows.map((cells, i) => ({ cells, at: northAt + 4 + i * 3 }))}
          marks={[
            ...north.rows.map((_, i) => ({ row: i, col: 1, at: labelsAt + i * 4 })),
            { row: 0, col: 0, at: eyeZeroAt + 2, color: MARK_OK },
          ]}
          bands={[{ row: 0, at: eyeZeroAt + 8, color: MARK_OK }]}
        />
        <Listing lines={LOC.north.lines} x={LIST_X} top={y(TOP)} width={LIST_W} size={SIZE} at={northAt - 2} />
        <Listing lines={LOC.northIloc.lines} x={LIST_X} top={y(TOP) + lineH + h(14)} width={LIST_W} size={SIZE} at={eyeZeroAt - 4} />
        <DataTable
          g={sg}
          cols={colsOf(LOC.northIloc)}
          at={eyeZeroAt + 4}
          rows={LOC.northIloc.rows.map((cells, i) => ({ cells, at: eyeZeroAt + 8 + i * 2 }))}
        />
        <Listing lines={LOC.northLoc.lines} x={LIST_X} top={errTop} width={LIST_W} size={SIZE} at={lockZeroAt - 4} />
        <ErrorBox
          x={LIST_X}
          top={errTop + lineH + h(12)}
          width={LIST_W}
          at={keyAt - 2}
          kind={LOC.northLoc.kind}
          message={LOC.northLoc.message}
        />
        <Note at={lockZeroAt + 4} x={NORTH_X} y={ng.rowTop(north.rows.length) + h(22)}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            no row is labelled 0
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
