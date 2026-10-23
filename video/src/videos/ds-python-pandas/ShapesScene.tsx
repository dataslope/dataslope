import React from "react";
import { AbsoluteFill } from "remotion";
import { QMono, QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, BLUE_INK, INK, INK_SOFT, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { SHAPES } from "./data";
import {
  colsOf,
  DataTable,
  Drift,
  geoOf,
  Listing,
  Mark,
  MARK,
  MARK_OK,
  Mono,
  TableName,
  X0,
} from "./parts";

const TOP = 380;
const SIZE = 20;
const AGG_X = 560;
const TRANSFORM_X = 900;
const APPLY_X = 1220;
const LISTING_Y = 716;

/**
 * Questions 3 and 4 on the page's five rows (the frame DA Part 2 used, so
 * the share agrees). Three answers side by side, each the shape it returns:
 * agg three rows, transform five (level with the rows it came from), apply a
 * row per group. Then question 4 grows two columns on the frame
 * itself: each region's total from transform, and the share, North's 100
 * being 62.5% of 160.
 */
export const ShapesScene: React.FC = () => {
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("shapes").from;
  const qAt = n.word("shapes", "Question");
  const textAt = n.word("shapes", "When do you use");
  const asked = n.beat("shapes").to;
  const aggAt = n.word("shapes-three", "Ag reduces each group");
  const threeAt = n.word("shapes-three", "three regions, three rows");
  const trAt = n.word("shapes-three", "Transform hands each group's answer");
  const fiveAt = n.word("shapes-three", "five rows in, five out");
  const applyAt = n.word("shapes-three", "Apply is the fallback");
  const largestAt = n.word("shapes-three", "the largest order in each region");
  const rowAt = n.word("shapes-three", "a row per group");
  const slowAt = n.word("shapes-three", "and the slowest");
  const q4At = n.word("pct", "Question four");
  const q4TextAt = n.word("pct", "How do you compute");
  const divideAt = n.word("pct", "Divide each amount");
  const noMergeAt = n.word("pct", "No merge needed");
  const northAt = n.word("pct", "North's hundred");
  const pctAt = n.word("pct", "sixty-two and a half percent");
  const end = n.beat("merge-in").to;
  const out3 = q4At - 4;

  // One frame for both questions; question 4 opens two columns on it.
  const P = SHAPES.pct;
  const T = SHAPES.transform;
  const tName = 'transform("sum")';
  const table = {
    cols: [...P.cols.slice(0, 3), tName, P.cols[3]],
    rows: P.rows.map((r, i) => [...r.slice(0, 3), T.rows[i][1], r[3]]),
  };
  const g = geoOf(table, X0, y(TOP), h, { rowH: 52 });
  const cols = colsOf(table, {
    amount: { ink: BLUE_INK },
    [tName]: { at: divideAt + 2, ink: BLUE_INK },
    pct_of_region: { at: divideAt + 16 },
  });

  const A = SHAPES.agg;
  const ag = geoOf(A, AGG_X, y(TOP), h, { rowH: 52 });
  const tg = geoOf(T, TRANSFORM_X, y(TOP), h, { rowH: 52 });
  const AP = SHAPES.apply;
  const pg = geoOf(AP, APPLY_X, y(TOP), h, { rowH: 52 });
  const under = (rows: number) => y(TOP) + h(48) + rows * h(52) + h(20);

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={threeAt} level={-34} />
      <Sfx name="el-pencil" at={fiveAt} level={-34} />
      <Sfx name="el-tap" at={rowAt} level={-34} />
      <Sfx name="el-pencil" at={divideAt + 6} level={-34} />
      <Sfx name="el-pop" at={pctAt} level={-32} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={3} at={qAt - 4} textAt={textAt - 4} out={out3} size={60}>
          When do you use <QMono>agg</QMono>, <QMono>transform</QMono>, or <QMono>apply</QMono> on a groupby?
        </QuestionCard>
        <QuestionCard n={4} at={q4At} textAt={q4TextAt - 2} size={60}>
          How do you compute a percentage of total within each group?
        </QuestionCard>

        {/* ── The page's frame ── */}
        <TableName g={g} at={asked - 6}>
          df
        </TableName>
        <DataTable
          g={g}
          cols={cols}
          at={asked - 6}
          rows={table.rows.map((cells, i) => ({ cells, at: asked - 2 + i * 2 }))}
          marks={[
            { row: 0, col: 2, at: northAt },
            { row: 0, col: 3, at: northAt + 8 },
            { row: 0, col: 4, at: pctAt, color: MARK_OK },
          ]}
        />

        {/* ── Question 3: three shapes ── */}
        <TableName g={ag} at={aggAt - 2} out={out3}>
          <Mono>.agg(&quot;sum&quot;)</Mono>
        </TableName>
        <DataTable
          g={ag}
          cols={colsOf(A, { amount: { ink: BLUE_INK } })}
          at={aggAt}
          out={out3}
          rows={A.rows.map((cells, i) => ({ cells, at: aggAt + 4 + i * 3 }))}
        />
        <Note at={threeAt} x={AGG_X} y={under(A.rows.length)} out={out3}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            <Mark at={threeAt + 4}>3 rows</Mark>, one per group
          </span>
        </Note>

        <TableName g={tg} at={trAt - 2} out={out3}>
          <Mono>.transform(&quot;sum&quot;)</Mono>
        </TableName>
        <DataTable
          g={tg}
          cols={colsOf(T, { amount: { ink: BLUE_INK } })}
          at={trAt}
          out={out3}
          rows={T.rows.map((cells, i) => ({ cells, at: trAt + 6 + i * 3 }))}
          bands={T.rows.map((_, row) => ({ row, at: fiveAt + row * 2, out: applyAt, color: MARK }))}
        />
        <Note at={fiveAt} x={TRANSFORM_X} y={under(T.rows.length)} out={out3}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>5 rows, one per row</span>
        </Note>

        <TableName g={pg} at={applyAt - 2} out={out3}>
          <Mono>.apply(…nlargest(1)…)</Mono>
        </TableName>
        <DataTable
          g={pg}
          cols={colsOf(AP, { amount: { ink: BLUE_INK } })}
          at={largestAt - 4}
          out={out3}
          rows={AP.rows.map((cells, i) => ({ cells, at: largestAt + i * 3 }))}
          bands={AP.rows.map((_, row) => ({ row, at: rowAt + row * 2, color: MARK }))}
        />
        <Note at={rowAt} x={APPLY_X} y={under(AP.rows.length)} out={out3}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>each region&apos;s largest order</span>
        </Note>
        <Note at={slowAt} x={APPLY_X} y={under(AP.rows.length) + h(40)} out={out3}>
          <span style={{ ...note(24, ACCENT_INK), fontWeight: 650, whiteSpace: "nowrap" }}>most flexible, and slowest</span>
        </Note>

        {/* ── Question 4: the share, no merge ── */}
        <Listing lines={P.lines} x={X0} top={y(LISTING_Y)} width={1110} size={SIZE} at={divideAt - 4} marks={[{ line: 1, at: divideAt + 8 }]} />
        <Note at={noMergeAt} x={X0 + 1140} y={y(LISTING_Y) + h(14)}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>no merge needed</span>
        </Note>
        <Note at={pctAt + 4} x={g.right + 30} y={g.rowMid(0) - h(18)}>
          <span style={{ ...note(26, INK_SOFT), whiteSpace: "nowrap" }}>100 / 160 = 62.5%</span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
