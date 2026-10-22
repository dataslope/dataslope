import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QMono, QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, BLUE_INK, INK, INK_SOFT, TABULAR, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { RANK } from "./data";
import {
  colsOf,
  DataTable,
  Drift,
  geoOf,
  Listing,
  listingHeight,
  MARK,
  MARK_BAD,
  MARK_OK,
  rowsAt,
  TableName,
  X0,
  Mark,
} from "./parts";

const TOP = 330;
const SIZE = 21;
const RESULT_X = 1000;
const TOPN_LIST_X = 590;
const TOPN_RESULT_X = 1270;
const TOPN_LIST_W = 650;

/**
 * Questions 3, 4 and 5. The page's 24 scores, ranks 7 to 14, where three
 * 88s and four 85s tie: RANK skips to 11, DENSE_RANK goes on to 9. Then the
 * video's own eight products: ROW_NUMBER keeps exactly two per category (Emma
 * of the tied pair), RANK keeps both, and QUALIFY does ROW_NUMBER's filter
 * without the wrapping query.
 */
export const RankScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("rank").from;
  const qAt = n.word("rank", "Question");
  const textAt = n.word("rank", "How do row number");
  // The table arrives on the question's last words, as the series does.
  const asked = n.word("rank", "dense rank") + 4;
  const eightyEightAt = n.word("rank-ties", "eighty-eight");
  const eightyFiveAt = n.word("rank-ties", "four have eighty-five");
  const rnAt = n.word("rank-three", "Row number gives every row");
  const arbitraryAt = n.word("rank-three", "broken arbitrarily");
  const rankAt = n.word("rank-three", "Rank lets ties share");
  const elevenAt = n.word("rank-three", "then eleven");
  const denseAt = n.word("rank-three", "Dense rank shares");
  const nineAt = n.word("rank-three", "eight, then nine");
  const q4At = n.word("topn", "Question four");
  const q4TextAt = n.word("topn", "How do you return");
  const numberAt = n.word("topn", "Number the rows inside each category");
  const exactlyAt = n.word("topn", "exactly two per category");
  const tieAt = n.word("topn", "Emma and Ulysses tie");
  const onlyAt = n.word("topn", "only one of them makes it");
  const useRankAt = n.word("topn-rank", "Use rank instead");
  const fiveAt = n.word("topn-rank", "five rows");
  const q5At = n.word("qualify", "Question five");
  const q5TextAt = n.word("qualify", "What is qualify");
  const filtersAt = n.word("qualify", "filters on a window function");
  const noWrapAt = n.word("qualify", "no wrapping query");
  const supportAt = n.word("qualify", "DuckDB, Snowflake and BigQuery");
  const bridgeAt = n.beat("frame-in").from;
  const clearAt = n.word("frame-in", "the frame") + 2;
  const end = n.beat("frame-in").to;

  // ── Question 3 ──
  const T = RANK.ties;
  const tg = geoOf(T, RESULT_X, y(TOP) + h(40), h, { rowH: 48 });
  const col = (name: string) => T.cols.indexOf(name);
  const scoreRows = (score: string) => T.rows.flatMap((r, i) => (r[col("score")] === score ? [i] : []));
  const eights = scoreRows("88");
  const fives = scoreRows("85");
  const out3 = q4At - 4;

  // ── Questions 4 and 5 ──
  const P = RANK.products;
  const pg = geoOf(P, X0, y(TOP), h, { rowH: 48 });
  const tied = P.rows.flatMap((r, i) => (r[2] === "310" ? [i] : []));
  const left = tied.find((i) => !RANK.rowNumber.rows.some((r) => r[1] === P.rows[i][1]));
  const rn = RANK.rowNumber;
  const rk = RANK.rank;
  const q = RANK.qualify;
  const rng = geoOf(rn, TOPN_RESULT_X, y(TOP), h, { rowH: 48, extra: rk.rows });
  const rkg = geoOf(rk, TOPN_RESULT_X, y(TOP), h, { rowH: 48 });
  const keptTied = rk.rows.flatMap((r, i) => (r[2] === "310" ? [i] : []));
  const out4 = q5At - 4;

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={eightyEightAt} level={-34} />
      <Sfx name="el-scratch" at={elevenAt} level={-32} />
      <Sfx name="el-pop" at={nineAt} level={-32} />
      <Sfx name="el-scratch" at={onlyAt + 4} level={-32} />
      <Sfx name="el-pop" at={fiveAt} level={-32} />
      <Sfx name="el-pop" at={noWrapAt} level={-34} />

      <Drift from={from} to={end + 40}>
        {/* On the bridge to the next scene the takeaway is marked, then the page clears. */}
        <AbsoluteFill style={{ opacity: 1 - ease(frame, clearAt, 36) }}>
        <QuestionCard n={3} at={qAt - 4} textAt={textAt - 4} out={out3} size={60}>
          How do <QMono>ROW_NUMBER</QMono>, <QMono>RANK</QMono>, and <QMono>DENSE_RANK</QMono> differ?
        </QuestionCard>
        <QuestionCard n={4} at={q4At} textAt={q4TextAt - 2} out={out4} size={60}>
          How do you return the top N rows per group?
        </QuestionCard>
        <QuestionCard n={5} at={q5At} textAt={q5TextAt - 2} size={60}>
          What is <QMono>QUALIFY</QMono>?
        </QuestionCard>

        {/* ── Question 3: the page's ranking, where it ties ── */}
        <Listing lines={RANK.lines} x={X0} top={y(TOP)} width={700} size={SIZE} at={asked - 6} out={out3} />
        <Note at={asked} x={RESULT_X} y={y(TOP)} out={out3}>
          <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap", ...TABULAR }}>
            ranks 7 to 14 of the page&apos;s {RANK.rows}
          </span>
        </Note>
        <DataTable
          g={tg}
          cols={colsOf(T, { rn: { ink: BLUE_INK }, rnk: { ink: BLUE_INK }, drnk: { ink: BLUE_INK } })}
          at={asked - 2}
          out={out3}
          rows={rowsAt(T.rows, asked + 2)}
          bands={[
            ...eights.map((row) => ({ row, at: eightyEightAt + 2, out: denseAt, color: MARK })),
            ...fives.map((row) => ({ row, at: eightyFiveAt + 2, out: denseAt, color: MARK })),
          ]}
          marks={[
            ...T.rows.map((_, row) => ({ row, col: col("rn"), at: rnAt + 4 + row * 2, out: rankAt })),
            ...[...eights, fives[0]].map((row, k) => ({
              row,
              col: col("rnk"),
              at: rankAt + 8 + k * 6,
              out: denseAt,
              color: row === fives[0] ? MARK_BAD : undefined,
            })),
            ...[...eights, fives[0]].map((row, k) => ({ row, col: col("drnk"), at: denseAt + 8 + k * 6, color: MARK_OK })),
          ]}
        />
        <Note at={arbitraryAt} x={X0} y={y(TOP) + listingHeight(RANK.lines.length, SIZE) + h(30)} out={out3}>
          <span style={{ ...note(25, INK), whiteSpace: "nowrap" }}>
            <QMono>ROW_NUMBER</QMono>: unique, ties broken arbitrarily
          </span>
        </Note>
        <Note at={elevenAt - 4} x={X0} y={y(TOP) + listingHeight(RANK.lines.length, SIZE) + h(76)} out={out3}>
          <span style={{ ...note(25, INK), whiteSpace: "nowrap" }}>
            <QMono>RANK</QMono>: ties share, then it <span style={{ color: ACCENT_INK, fontWeight: 650 }}>skips</span> (8, 8, 8, 11)
          </span>
        </Note>
        <Note at={nineAt - 4} x={X0} y={y(TOP) + listingHeight(RANK.lines.length, SIZE) + h(122)} out={out3}>
          <span style={{ ...note(25, INK), whiteSpace: "nowrap" }}>
            <QMono>DENSE_RANK</QMono>: ties share, <span style={{ fontWeight: 650 }}>no gap</span> (8, 8, 8, 9)
          </span>
        </Note>

        {/* ── Questions 4 and 5: the top two per category ── */}
        <TableName g={pg} at={q4At + 6}>
          products
        </TableName>
        <DataTable
          g={pg}
          cols={colsOf(P)}
          at={q4At + 6}
          rows={rowsAt(P.rows, q4At + 10)}
          bands={[
            ...tied.map((row) => ({ row, at: tieAt, out: onlyAt, color: MARK })),
            ...(left === undefined ? [] : [{ row: left, at: onlyAt + 2, out: useRankAt, color: MARK_BAD }]),
          ]}
        />
        <Listing
          lines={rn.lines}
          x={TOPN_LIST_X}
          top={y(TOP)}
          width={TOPN_LIST_W}
          size={19}
          at={numberAt - 4}
          out={useRankAt - 2}
          marks={[{ line: 6, at: exactlyAt - 4 }]}
        />
        <DataTable g={rng} cols={colsOf(rn)} at={exactlyAt - 4} out={useRankAt - 2} rows={rowsAt(rn.rows, exactlyAt)} />
        <Listing
          lines={rk.lines}
          x={TOPN_LIST_X}
          top={y(TOP)}
          width={TOPN_LIST_W}
          size={19}
          at={useRankAt - 2}
          out={out4}
          marks={[{ line: 2, at: useRankAt + 8 }]}
        />
        <DataTable
          g={rkg}
          cols={colsOf(rk)}
          at={useRankAt + 2}
          out={out4}
          rows={rowsAt(rk.rows, useRankAt + 6)}
          bands={keptTied.map((row) => ({ row, at: fiveAt - 4, color: MARK_OK }))}
        />
        <Note at={fiveAt} x={TOPN_RESULT_X} y={rkg.rowTop(rk.rows.length) + h(20)} out={out4}>
          <span style={{ ...note(25, INK), whiteSpace: "nowrap", ...TABULAR }}>
            {rk.rows.length} rows: both tied books
          </span>
        </Note>

        {/* QUALIFY: the same filter, no wrapping query. */}
        <Listing
          lines={q.lines}
          x={TOPN_LIST_X}
          top={y(TOP)}
          width={TOPN_LIST_W}
          size={19}
          at={filtersAt - 4}
          marks={[{ line: 4, at: noWrapAt - 4, color: MARK_OK }]}
        />
        <DataTable g={rng} cols={colsOf(q)} at={filtersAt + 4} rows={rowsAt(q.rows, filtersAt + 8)} />
        <Note at={noWrapAt} x={TOPN_LIST_X} y={y(TOP) + listingHeight(q.lines.length, 19) + h(24)}>
          <span style={{ ...note(25, INK), whiteSpace: "nowrap" }}>
            <Mark at={bridgeAt}>
              like <QMono>HAVING</QMono>, for a window function
            </Mark>
          </span>
        </Note>
        <Note at={supportAt - 2} x={TOPN_LIST_X} y={y(TOP) + listingHeight(q.lines.length, 19) + h(68)}>
          <span style={{ ...note(23, INK_SOFT), whiteSpace: "nowrap" }}>DuckDB, Snowflake, BigQuery</span>
        </Note>
        <Note at={tieAt + 4} x={X0} y={pg.rowTop(P.rows.length) + h(20)} out={useRankAt}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap", ...TABULAR }}>Emma and Ulysses: 310 each</span>
        </Note>
        <Note at={onlyAt + 6} x={X0} y={pg.rowTop(P.rows.length) + h(56)} out={useRankAt}>
          <span style={{ ...note(24, ACCENT_INK), whiteSpace: "nowrap" }}>only one makes it</span>
        </Note>
        </AbsoluteFill>
      </Drift>
    </AbsoluteFill>
  );
};
