import React from "react";
import { AbsoluteFill } from "remotion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { BLUE_INK, INK, INK_SOFT, TABULAR, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { RESHAPE } from "./data";
import {
  colsOf,
  DataTable,
  Drift,
  geoOf,
  KeyArrow,
  Listing,
  Mark,
  MARK,
  MARK_KEY,
  Mono,
  TableName,
  X0,
} from "./parts";

const TOP = 420;
const LONG_X = 700;
const BACK_X = 1340;
const CODE_Y = 790;
const SIZE = 20;

/**
 * Question 9 on the page's two users by two quarters: wide, then long (each
 * quarter's column turned into rows, a quarter column naming it and a sales
 * column holding it), then wide again with pivot. The q1 values are marked
 * blue and the q2 values yellow, so each can be followed through both
 * moves. The listing at the foot is the call being made.
 */
export const ReshapeScene: React.FC = () => {
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("reshape").from;
  const qAt = n.word("reshape", "Question");
  const textAt = n.word("reshape", "How do you reshape");
  const asked = n.beat("reshape").to;
  const meltAt = n.word("reshape-melt", "Melt goes wide to long");
  const columnAt = n.word("reshape-melt", "Each quarter's column turns into rows");
  const quarterAt = n.word("reshape-melt", "a quarter column to name it");
  const salesAt = n.word("reshape-melt", "a sales column to hold the value");
  const fourAt = n.word("reshape-melt", "Two users by two quarters");
  const rowsAt = n.word("reshape-melt", "four rows");
  const pivotAt = n.word("reshape-back", "Pivot goes back");
  const uniqueAt = n.word("reshape-back", "needs every user and quarter pair to be unique");
  const repeatAt = n.word("reshape-back", "When pairs repeat");
  const tableAt = n.word("reshape-back", "pivot table aggregates them instead");
  const end = n.beat("reshape-back").to;

  const W = RESHAPE.wide;
  const wg = geoOf(W, X0, y(TOP), h, { rowH: 54 });
  const L = RESHAPE.long;
  const lg = geoOf(L, LONG_X, y(TOP), h, { rowH: 54 });
  const B = RESHAPE.back;
  const bg = geoOf(B, BACK_X, y(TOP), h, { rowH: 54 });
  const q = (t: { cols: string[] }, name: string) => t.cols.indexOf(name);
  const quarter = q(L, "quarter");
  const sales = q(L, "sales");
  const colorOf = (qq: string) => (qq === "q1" ? MARK_KEY : MARK);

  return (
    <AbsoluteFill>
      <Sfx name="el-whoosh" at={columnAt + 4} level={-34} />
      <Sfx name="el-tap" at={quarterAt + 4} level={-34} />
      <Sfx name="el-tap" at={salesAt + 4} level={-34} />
      <Sfx name="el-pop" at={rowsAt} level={-32} />
      <Sfx name="el-whoosh" at={pivotAt + 6} level={-34} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={9} at={qAt - 4} textAt={textAt - 4} size={60}>
          How do you reshape between wide and long formats?
        </QuestionCard>

        <TableName g={wg} at={asked - 6}>
          wide
        </TableName>
        <DataTable
          g={wg}
          cols={colsOf(W)}
          at={asked - 6}
          rows={W.rows.map((cells, i) => ({ cells, at: asked - 2 + i * 3 }))}
          marks={W.rows.flatMap((_, row) => [
            { row, col: q(W, "q1"), at: columnAt + row * 3, color: MARK_KEY },
            { row, col: q(W, "q2"), at: columnAt + 8 + row * 3, color: MARK },
          ])}
        />

        {/* ── melt ── */}
        <KeyArrow from={[wg.right + 14, wg.rowMid(0)]} to={[LONG_X - 14, lg.rowMid(1)]} at={meltAt + 2} />
        <Note at={meltAt + 4} x={wg.right + 40} y={wg.rowTop(0) - h(56)}>
          <span style={{ ...note(26, INK), fontWeight: 650 }}>
            <Mono>.melt()</Mono>
          </span>
        </Note>
        <TableName g={lg} at={meltAt + 8}>
          long
        </TableName>
        <DataTable
          g={lg}
          cols={colsOf(L, { quarter: { at: quarterAt - 2 }, sales: { at: salesAt - 2, ink: BLUE_INK } })}
          at={meltAt + 8}
          rows={L.rows.map((cells, i) => ({ cells, at: columnAt + 6 + i * 4 }))}
          marks={[
            ...L.rows.map((r, row) => ({ row, col: quarter, at: quarterAt + 4 + row * 2, color: colorOf(r[quarter]) })),
            ...L.rows.map((r, row) => ({ row, col: sales, at: salesAt + 4 + row * 2, color: colorOf(r[quarter]) })),
          ]}
        />
        <Note at={fourAt} x={LONG_X} y={lg.rowTop(L.rows.length) + h(20)}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap", ...TABULAR }}>
            2 users × 2 quarters = <Mark at={rowsAt}>{L.rows.length} rows</Mark>
          </span>
        </Note>

        {/* ── pivot, back ── */}
        <KeyArrow from={[lg.right + 14, lg.rowMid(1)]} to={[BACK_X - 14, bg.rowMid(0)]} at={pivotAt + 2} />
        <Note at={pivotAt + 4} x={lg.right + 40} y={wg.rowTop(0) - h(56)}>
          <span style={{ ...note(26, INK), fontWeight: 650 }}>
            <Mono>.pivot()</Mono>
          </span>
        </Note>
        <TableName g={bg} at={pivotAt + 8}>
          wide again
        </TableName>
        <DataTable
          g={bg}
          cols={colsOf(B)}
          at={pivotAt + 8}
          rows={B.rows.map((cells, i) => ({ cells, at: pivotAt + 14 + i * 4 }))}
          marks={B.rows.flatMap((_, row) => [
            { row, col: q(B, "q1"), at: pivotAt + 22 + row * 3, color: MARK_KEY },
            { row, col: q(B, "q2"), at: pivotAt + 28 + row * 3, color: MARK },
          ])}
        />
        <Note at={uniqueAt} x={BACK_X} y={bg.rowTop(B.rows.length) + h(20)}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            each <Mark at={uniqueAt + 8}>(user, quarter)</Mark> pair
          </span>
          <br />
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>must be unique</span>
        </Note>
        <Note at={repeatAt} x={BACK_X} y={bg.rowTop(B.rows.length) + h(110)}>
          <span style={{ ...note(24, INK_SOFT), whiteSpace: "nowrap" }}>pairs repeat?</span>
          <br />
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            <Mark at={tableAt + 4}>
              <Mono>pivot_table</Mono> aggregates
            </Mark>
          </span>
        </Note>

        {/* ── The call ── */}
        <Listing lines={L.lines} x={X0} top={y(CODE_Y)} width={940} size={SIZE} at={meltAt} out={pivotAt - 2} />
        <Listing lines={B.lines} x={X0} top={y(CODE_Y)} width={940} size={SIZE} at={pivotAt} />
      </Drift>
    </AbsoluteFill>
  );
};
