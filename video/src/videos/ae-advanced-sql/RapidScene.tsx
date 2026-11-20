import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { RapidFire, type RapidItem } from "../../editorial/interview";
import { type Layout, useLayout } from "../../editorial/layout";
import { ACCENT_INK, BAR, BLUE_INK, INK, INK_SOFT, TABULAR, label, note } from "../../editorial/style";
import { ColumnRule, Ink, NextLine, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { RAPID } from "./data";
import {
  Chip,
  colsOf,
  DataTable,
  Drift,
  ErrorBox,
  Flow,
  geoOf,
  Headline,
  Kicker,
  Listing,
  listingHeight,
  listingLineMid,
  listingWidth,
  MARK,
  MARK_BLUE,
  MARK_GREEN,
  OK_INK,
  QMono,
  rowsAt,
  Spot,
  SyntaxBreak,
  type SynPart,
  X0,
} from "./parts";

/** Where the answers go: right of the list. */
const R_X = 720;
const TOP = 300;
const LIST_TOP = 300;
const ROW = 52;
const SIZE = 19;

type Ctx = { w: (beat: string, phrase: string, o?: { nth?: number }) => number; y: Layout["y"]; h: Layout["h"]; T: number };

/** A result in the round's compact rows. */
const geo = (c: Ctx, t: { cols: readonly string[]; rows: readonly (readonly string[])[] }, x: number, top: number, rowH = 40) =>
  geoOf(t, x, top, c.h, { headH: 40, rowH, bodySize: 21, headSize: 20 });

/**
 * The question as it is read, in the page's words, inking in across the
 * time it takes to say it (the series' rapid-round convention: the question
 * read aloud, then its answer's key fact).
 */
const Asked: React.FC<{ c: Ctx; beat: string; from: string; until: string; children: React.ReactNode }> = ({ c, beat, from, until, children }) => {
  const at = c.w(beat, from);
  const end = c.w(beat, until);
  return (
    <Ink at={at - 2} dur={Math.max(14, end - at - 6)} style={{ left: R_X, top: c.T, whiteSpace: "nowrap" }}>
      <span style={{ ...note(24, INK_SOFT) }}>{children}</span>
    </Ink>
  );
};

/** The answer's key fact, under the question. */
const Fact: React.FC<{ c: Ctx; at: number; children: React.ReactNode }> = ({ c, at, children }) => (
  <Note at={at} x={R_X} y={c.T + c.h(46)}>
    <span style={{ ...note(27, INK), whiteSpace: "nowrap" }}>{children}</span>
  </Note>
);

/** Where an answer's evidence starts, under its key fact. */
const body = (c: Ctx) => c.T + c.h(108);

// ── 13. Divide by zero ──────────────────────────────────────────────────────

const Zero: React.FC<{ c: Ctx }> = ({ c }) => {
  const wrapAt = c.w("r-zero", "Wrap the denominator in null if");
  const zeroAt = c.w("r-zero", "a zero becomes null");
  const nullAt = c.w("r-zero", "a day with no orders gives null");
  const stopAt = c.w("r-zero", "instead of stopping the query");
  const coalesceAt = c.w("r-zero", "coalesce can turn that into zero");
  const Z = RAPID.zeroNullif;
  const top = body(c);
  const g = geo(c, Z, R_X, top + listingHeight(Z.lines.length, SIZE) + c.h(18));
  const av = Z.cols.indexOf("avg_order_value");
  const empty = Z.rows.findIndex((r) => r[av] === "null");
  const coalesced = RAPID.zeroCoalesce.rows[empty][RAPID.zeroCoalesce.cols.indexOf("avg_order_value")];
  const errX = g.right + 50;
  return (
    <>
      <Asked c={c} beat="r-zero" from="How do you avoid" until="Wrap the denominator">
        How do you avoid a divide-by-zero error?
      </Asked>
      <Fact c={c} at={wrapAt - 2}>
        Wrap the denominator in <QMono>NULLIF(…, 0)</QMono>
      </Fact>
      <Listing lines={Z.lines} x={R_X} top={top} size={SIZE} at={wrapAt - 2} marks={[{ line: "NULLIF(order_count, 0)", text: "NULLIF(order_count, 0)", at: wrapAt + 8 }]} />
      <DataTable
        g={g}
        cols={colsOf(Z, { avg_order_value: { ink: BLUE_INK } })}
        at={wrapAt + 4}
        rows={rowsAt(Z.rows, wrapAt + 8)}
        marks={[
          { row: empty, col: Z.cols.indexOf("order_count"), at: zeroAt + 2 },
          // The listing's own result keeps its null; the COALESCE note below
          // offers the zero as an option, not as the better answer.
          { row: empty, col: av, at: nullAt + 4 },
        ]}
      />
      <Note at={stopAt - 4} x={errX} y={g.top + c.h(24)}>
        <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>
          Without <QMono>NULLIF</QMono>:
        </span>
      </Note>
      <ErrorBox x={errX} top={g.top + c.h(64)} width={400} at={stopAt} kind={RAPID.zeroBare.kind} message={RAPID.zeroBare.message} size={20} />
      <Note at={coalesceAt + 8} x={R_X} y={g.rowTop(Z.rows.length) + c.h(20)}>
        <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>
          <QMono>COALESCE(…, 0)</QMono> turns the null into {coalesced}
        </span>
      </Note>
    </>
  );
};

// ── 14. ROW_NUMBER, RANK, DENSE_RANK ────────────────────────────────────────

const Rank: React.FC<{ c: Ctx }> = ({ c }) => {
  const booksAt = c.w("r-rank", "four books with a tie");
  const rnAt = c.w("r-rank", "row number goes one");
  const rankAt = c.w("r-rank", "rank shares two", { nth: 1 });
  const skipAt = c.w("r-rank", "skips to four");
  const denseAt = c.w("r-rank", "dense rank shares two");
  const threeAt = c.w("r-rank", "then three");
  const pickAt = c.w("r-rank", "Row number picks one per key");
  const boardAt = c.w("r-rank", "the others make leaderboards");
  const B = RAPID.rank;
  const g = geo(c, B, R_X, body(c), 48);
  const col = (name: string) => B.cols.indexOf(name);
  const last = B.rows.length - 1;
  const tied = B.rows.flatMap((r, i) => (r[col("rank")] === B.rows[1][col("rank")] ? [i] : []));
  const notesY = g.rowTop(B.rows.length) + c.h(30);
  return (
    <>
      <Asked c={c} beat="r-rank" from="Explain row number" until="four books with a tie">
        Explain <QMono>ROW_NUMBER</QMono> vs <QMono>RANK</QMono> vs <QMono>DENSE_RANK</QMono>.
      </Asked>
      <Fact c={c} at={booksAt - 4}>
        On a tie, only <QMono>ROW_NUMBER</QMono> stays unique
      </Fact>
      <DataTable
        g={g}
        cols={colsOf(B, {
          row_number: { at: rnAt, ink: BLUE_INK },
          rank: { at: rankAt, ink: BLUE_INK },
          dense_rank: { at: denseAt, ink: BLUE_INK },
        })}
        at={booksAt}
        rows={rowsAt(B.rows, booksAt + 4)}
        bands={tied.map((row) => ({ row, at: booksAt + 12, color: MARK_BLUE }))}
        marks={[
          { row: last, col: col("rank"), at: skipAt, color: MARK },
          { row: last, col: col("dense_rank"), at: threeAt, color: MARK },
        ]}
      />
      <Spot art="books" at={booksAt} left={g.right + 100} top={body(c) + c.h(10)} width={200} />
      <Note at={pickAt} x={R_X} y={notesY}>
        <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>
          <QMono>ROW_NUMBER</QMono>: exactly one per key
        </span>
      </Note>
      <Note at={boardAt} x={R_X} y={notesY + c.h(42)}>
        <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>
          <QMono>RANK</QMono>, <QMono>DENSE_RANK</QMono>: leaderboards
        </span>
      </Note>
    </>
  );
};

// ── 15. Top N per group ─────────────────────────────────────────────────────

const TopN: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const rankInAt = c.w("r-topn", "Rank inside each group");
  const subAt = c.w("r-topn", "in a subquery");
  const keepAt = c.w("r-topn", "keep N or fewer");
  const exactlyAt = c.w("r-topn", "Row number keeps exactly two per category");
  const perCatAt = c.w("r-topn", "two per category");
  const pairAt = c.w("r-topn", "rank keeps the tied pair of books");
  const fiveAt = c.w("r-topn", "five rows instead of four");
  const RN = RAPID.topRowNumber;
  const RK = RAPID.topRank;
  // The ranking inside each group, then the filter outside it: an excerpt of
  // the statement that ran, the window's two lines brought to the margin.
  const win = RN.lines.findIndex((l) => l.includes("OVER (PARTITION BY category"));
  if (win < 0 || !RN.lines[win + 1]?.includes("ORDER BY revenue DESC")) throw new Error("the top-N listing's window has moved");
  const indent = RN.lines[win].length - RN.lines[win].trimStart().length;
  const shown = [RN.lines[win].slice(indent), RN.lines[win + 1].slice(indent), ...RN.lines.filter((l) => l.includes("WHERE rn <= 2"))];
  const top = body(c);
  const tTop = top + listingHeight(shown.length, SIZE) + c.h(66);
  const rg = geo(c, RN, R_X, tTop);
  const kg = geo(c, RK, rg.right + 90, tTop);
  const prod = RK.cols.indexOf("product");
  const extra = RK.rows.findIndex((r) => !RN.rows.some((o) => o[prod] === r[prod]));
  const tie = RN.rows.findIndex((r) => r[prod] === RK.rows[extra - 1]?.[prod]);
  return (
    <>
      <Asked c={c} beat="r-topn" from="How do you find" until="Rank inside each group">
        How do you find the top-N rows per group?
      </Asked>
      <Fact c={c} at={rankInAt - 4}>
        Rank inside each group, then keep <QMono>rn &lt;= N</QMono>
      </Fact>
      <Listing
        lines={shown}
        x={R_X}
        top={top}
        size={SIZE}
        at={rankInAt}
        marks={[
          { line: "OVER (PARTITION BY category", text: "PARTITION BY category", at: rankInAt + 8, out: subAt },
          { line: "rn <= 2", text: "ranked", at: subAt + 2, out: keepAt },
          { line: "rn <= 2", text: "WHERE rn <= 2", at: keepAt },
        ]}
      />
      <Note at={exactlyAt - 4} x={R_X} y={tTop - c.h(40)}>
        <span style={{ ...label(21, INK), whiteSpace: "nowrap", ...TABULAR }}>
          <QMono>ROW_NUMBER</QMono>: {RN.rows.length} rows
        </span>
      </Note>
      <DataTable
        g={rg}
        cols={colsOf(RN, { rn: { ink: BLUE_INK } })}
        at={exactlyAt - 2}
        rows={rowsAt(RN.rows, exactlyAt + 2)}
        marks={[
          ...RN.rows.map((_, row) => ({ row, col: RN.cols.indexOf("rn"), at: perCatAt + row * 3, out: pairAt })),
          ...(tie >= 0 ? [{ row: tie, col: prod, at: pairAt + 4, color: MARK }] : []),
        ]}
      />
      <ColumnRule x={rg.right + 45} top={tTop - c.h(40)} height={c.h(40) + rg.headH + RK.rows.length * rg.rowH} at={pairAt - 4} />
      <Note at={pairAt - 4} x={kg.x} y={tTop - c.h(40)}>
        <span style={{ ...label(21, INK), whiteSpace: "nowrap", ...TABULAR }}>
          <QMono>RANK</QMono>: {RK.rows.length} rows
          <span style={{ opacity: ease(frame, fiveAt + 4, 10) }}>, the tie kept</span>
        </span>
      </Note>
      <DataTable
        g={kg}
        cols={colsOf(RK, { rn: { ink: BLUE_INK } })}
        at={pairAt - 2}
        rows={rowsAt(RK.rows, pairAt + 2)}
        bands={[
          { row: extra - 1, at: pairAt + 10, color: MARK },
          { row: extra, at: pairAt + 10, color: MARK },
        ]}
      />
    </>
  );
};

// ── 16. CTEs ────────────────────────────────────────────────────────────────

const Cte: React.FC<{ c: Ctx }> = ({ c }) => {
  const cteAt = c.w("r-cte", "A common table expression");
  const namedAt = c.w("r-cte", "a named result");
  const upFrontAt = c.w("r-cte", "declared up front");
  const usedAt = c.w("r-cte", "used like a table");
  const preferAt = c.w("r-cte", "Prefer it when steps are reused or nested");
  const readerAt = c.w("r-cte", "it helps the reader");
  const promiseAt = c.w("r-cte", "doesn't promise the step runs once");
  const parts: SynPart[] = [
    { text: "WITH" },
    { text: "recent", label: "the name you choose", at: namedAt, row: 1 },
    { text: "AS (SELECT ... )", label: "the query it stands for", at: upFrontAt },
    { text: "SELECT * FROM recent", label: "referenced like a table", at: usedAt },
  ];
  const C = RAPID.cte;
  const rTop = body(c) + c.h(170);
  const g = geo(c, C, R_X, rTop, 36);
  return (
    <>
      <Asked c={c} beat="r-cte" from="What is a CTE" until="A common table expression">
        What is a CTE, and when do you prefer it over a subquery?
      </Asked>
      {/* The definition starts with its first word, so the page moves on
          as soon as the question has been read. */}
      <Fact c={c} at={cteAt - 2}>
        A named result, declared up front
      </Fact>
      <SyntaxBreak parts={parts} x={R_X} top={body(c)} at={namedAt - 4} size={26} labelSize={21} pitch={40} />
      <DataTable g={g} cols={colsOf(C)} at={usedAt + 4} rows={rowsAt(C.rows, usedAt + 8, 2)} />
      <Note at={usedAt + 10} x={g.right + 30} y={rTop + c.h(4)}>
        <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap", ...TABULAR }}>
          <QMono>recent</QMono>: {C.rows.length} updates since May
        </span>
      </Note>
      <Note at={preferAt} x={g.right + 30} y={rTop + c.h(70)}>
        <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>For steps reused or nested</span>
      </Note>
      <Note at={readerAt} x={g.right + 30} y={rTop + c.h(116)}>
        <span style={{ ...note(23, OK_INK), whiteSpace: "nowrap" }}>Helps the reader</span>
      </Note>
      <Note at={promiseAt} x={g.right + 30} y={rTop + c.h(162)}>
        <span style={{ ...note(23, ACCENT_INK), whiteSpace: "nowrap" }}>No promise it runs once, or faster</span>
      </Note>
    </>
  );
};

// ── 17. Recursive CTEs ──────────────────────────────────────────────────────

const Recursive: React.FC<{ c: Ctx }> = ({ c }) => {
  const selfAt = c.w("r-recursive", "It refers to itself");
  const anchorAt = c.w("r-recursive", "An anchor query seeds it");
  const passAt = c.w("r-recursive", "a recursive one adds rows");
  const noneAt = c.w("r-recursive", "until a pass adds none");
  const fiveAt = c.w("r-depth", "Here it counts to five");
  const depthAt = c.w("r-depth", "the depth isn't known in advance");
  const orgAt = c.w("r-depth", "on an org chart");
  const levelsAt = c.w("r-depth", "down five levels");
  const R = RAPID.recursive;
  const top = body(c);
  const lw = listingWidth(R.lines, SIZE);
  const L = RAPID.orgLevels;
  const people = L.rows.reduce((s, r) => s + Number(r[1]), 0);
  const rTop = top + listingHeight(R.lines.length, SIZE) + c.h(24);
  const ng = geo(c, R, R_X, rTop, 36);
  const lg = geo(c, L, R_X + 260, rTop, 36);
  return (
    <>
      <Asked c={c} beat="r-recursive" from="What is a recursive CTE" until="It refers to itself">
        What is a recursive CTE, and when do you need one?
      </Asked>
      <Fact c={c} at={selfAt - 4}>
        A CTE that refers to itself
      </Fact>
      <Listing
        lines={R.lines}
        x={R_X}
        top={top}
        size={SIZE}
        at={selfAt - 2}
        marks={[
          { line: "RECURSIVE nums", text: "nums", at: selfAt + 6, out: anchorAt },
          { line: "FROM nums", text: "nums", at: selfAt + 10, out: anchorAt },
          { line: "SELECT 1", at: anchorAt + 2, color: MARK_BLUE },
          { line: "SELECT n + 1", at: passAt + 2 },
          { line: "WHERE n < 5", text: "WHERE n < 5", at: noneAt + 2, color: MARK_GREEN },
        ]}
      />
      <Note at={anchorAt + 4} x={R_X + lw + 30} y={listingLineMid(top, 1, SIZE) - 16}>
        <span style={{ ...note(22, BLUE_INK), whiteSpace: "nowrap" }}>anchor: seeds it</span>
      </Note>
      <Note at={passAt + 4} x={R_X + lw + 30} y={listingLineMid(top, 3, SIZE) - 16}>
        <span style={{ ...note(22, INK), whiteSpace: "nowrap" }}>recursive: adds rows from the last pass</span>
      </Note>
      <Note at={noneAt + 4} x={R_X + lw + 30} y={listingLineMid(top, 3, SIZE) + 22}>
        <span style={{ ...note(22, OK_INK), whiteSpace: "nowrap" }}>until a pass adds none</span>
      </Note>
      <DataTable g={ng} cols={colsOf(R)} at={fiveAt - 4} rows={rowsAt(R.rows, fiveAt, 3)} />
      <DataTable g={lg} cols={colsOf(L, { people: { ink: BLUE_INK } })} at={orgAt} rows={rowsAt(L.rows, orgAt + 4, 3)} />
      <Note at={depthAt} x={lg.right + 30} y={rTop + c.h(4)}>
        <span style={{ ...note(23, OK_INK), whiteSpace: "nowrap" }}>When the depth isn&rsquo;t known in advance</span>
      </Note>
      <Note at={levelsAt - 2} x={lg.right + 30} y={rTop + c.h(44)}>
        <span style={{ ...note(23, INK), whiteSpace: "nowrap", ...TABULAR }}>Org chart: {people} people,</span>
      </Note>
      <Note at={levelsAt + 4} x={lg.right + 30} y={rTop + c.h(84)}>
        <span style={{ ...note(23, INK), whiteSpace: "nowrap", ...TABULAR }}>{L.rows.length} levels down</span>
      </Note>
    </>
  );
};

// ── 18. Pivot ───────────────────────────────────────────────────────────────

const Pivot: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const caseAt = c.w("r-pivot", "Sum a case expression");
  const rowAt = c.w("r-pivot", "grouped by the row");
  const clauseAt = c.w("r-pivot", "have a pivot clause");
  const notAt = c.w("r-pivot", "Postgres doesn't");
  const everyAt = c.w("r-pivot", "the case form runs everywhere");
  const spellsAt = c.w("r-pivot", "spells out each output column");
  const P = RAPID.pivotCase;
  const top = body(c);
  const lw = listingWidth(P.lines, SIZE);
  const g = geo(c, P, R_X + lw + 50, top, 44);
  const under = top + listingHeight(P.lines.length, SIZE) + c.h(26);
  return (
    <>
      <Asked c={c} beat="r-pivot" from="How do you pivot" until="Sum a case expression">
        How do you pivot rows into columns?
      </Asked>
      <Fact c={c} at={caseAt - 4}>
        One <QMono>SUM(CASE ...)</QMono> per new column
      </Fact>
      <Listing
        lines={P.lines}
        x={R_X}
        top={top}
        size={SIZE}
        at={caseAt - 2}
        marks={[
          { line: "'Q1' THEN", at: caseAt + 6, out: spellsAt },
          { line: "'Q2' THEN", at: caseAt + 10, out: spellsAt },
          { line: "GROUP BY region", at: rowAt },
          { line: "'Q1' THEN", text: "AS q1", at: spellsAt + 2, color: MARK_GREEN },
          { line: "'Q2' THEN", text: "AS q2", at: spellsAt + 6, color: MARK_GREEN },
        ]}
      />
      <DataTable g={g} cols={colsOf(P)} at={rowAt + 2} rows={rowsAt(P.rows, rowAt + 6)} />
      <div style={{ position: "absolute", left: R_X, top: under, display: "flex", alignItems: "center", gap: 12, fontSize: 22, whiteSpace: "nowrap" }}>
        <span style={{ ...note(22, INK_SOFT), opacity: ease(frame, clauseAt - 2, 10) }}>
          <QMono>PIVOT</QMono> clause:
        </span>
        {RAPID.pivotEngines.map((e, i) => (
          <span key={e} style={{ opacity: ease(frame, clauseAt + i * 4, 10) }}>
            <Chip tone="ink" size={22}>
              {e}
            </Chip>
          </span>
        ))}
      </div>
      <Note at={notAt - 2} x={R_X} y={under + c.h(56)}>
        <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>In Postgres:</span>
      </Note>
      <ErrorBox x={R_X + 150} top={under + c.h(46)} width={500} at={notAt} kind={RAPID.pivotClause.kind} message={RAPID.pivotClause.message} size={20} />
      <Note at={everyAt} x={R_X} y={under + c.h(130)}>
        <span style={{ ...note(24, OK_INK), whiteSpace: "nowrap" }}>
          <QMono>CASE</QMono> runs everywhere, each output column spelled out
        </span>
      </Note>
    </>
  );
};

// ── 19. Unpivot ─────────────────────────────────────────────────────────────

const Unpivot: React.FC<{ c: Ctx }> = ({ c }) => {
  const unionAt = c.w("r-unpivot", "Union all one select per column");
  const lateralAt = c.w("r-unpivot", "one lateral values list");
  const fourAt = c.w("r-unpivot", "four regions with two quarter columns");
  const eightAt = c.w("r-unpivot", "become eight rows");
  const wideAt = c.w("r-unpivot", "Sources often arrive wide");
  const longAt = c.w("r-unpivot", "models want them long");
  const U = RAPID.unpivot;
  const from = U.lines.findIndex((l) => l.startsWith("SELECT region, u.quarter"));
  const lines = U.lines.slice(from);
  const top = body(c);
  const tTop = top + listingHeight(lines.length, SIZE) + c.h(72);
  const P = RAPID.pivotCase;
  const wg = geo(c, P, R_X, tTop, 38);
  const lg = geo(c, U, wg.right + 130, tTop, 32);
  return (
    <>
      <Asked c={c} beat="r-unpivot" from="How do you unpivot" until="Union all one select per column">
        How do you unpivot columns into rows?
      </Asked>
      <Fact c={c} at={unionAt - 2}>
        <QMono>UNION ALL</QMono> a select per column, or one <QMono>VALUES</QMono> list
      </Fact>
      <Listing lines={lines} x={R_X} top={top} size={SIZE} at={unionAt + 8} marks={[{ line: "CROSS JOIN LATERAL", text: "CROSS JOIN LATERAL (VALUES ('Q1', q1), ('Q2', q2))", at: lateralAt + 4 }]} />
      <Note at={fourAt - 4} x={R_X} y={tTop - c.h(36)}>
        <span style={{ ...label(21, INK), whiteSpace: "nowrap" }}>
          <QMono>wide</QMono>: the pivot
        </span>
      </Note>
      <DataTable g={wg} cols={colsOf(P)} at={fourAt - 4} rows={rowsAt(P.rows, fourAt)} />
      <Flow points={[[wg.right + 24, wg.top + wg.headH + wg.rowH * 2], [lg.x - 24, wg.top + wg.headH + wg.rowH * 2]]} at={eightAt - 4} color={BAR} width={2.6} head={13} />
      <DataTable g={lg} cols={colsOf(U, { amt: { ink: BLUE_INK } })} at={eightAt - 2} rows={rowsAt(U.rows, eightAt, 2)} />
      <Note at={wideAt} x={lg.right + 40} y={tTop + c.h(4)}>
        <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>Sources arrive wide</span>
      </Note>
      <Note at={longAt} x={lg.right + 40} y={tTop + c.h(48)}>
        <span style={{ ...note(23, OK_INK), whiteSpace: "nowrap" }}>Models want them long</span>
      </Note>
    </>
  );
};

/**
 * The quick round, questions 13 to 19: the numbered list down the left, each
 * question's answer on the right while it is read, its key fact first, then
 * the evidence that ran. The last answer stays up through the bridge.
 */
export const RapidScene: React.FC = () => {
  const n = useNarration();
  const { y, h } = useLayout();
  const c: Ctx = { w: (b, p, o) => n.word(b, p, o), y, h, T: y(TOP) };

  const from = n.beat("rapid-in").from;
  const sevenAt = n.word("rapid-in", "Seven quick ones");
  const finishAt = n.word("rapid-in", "to finish");
  const dozenAt = n.word("small", "a few dozen rows at most");
  const paysAt = n.word("next", "someone pays for the scan");
  const nextAt = n.word("next", "Next:");
  const end = n.beat("small").from;

  const items: RapidItem[] = [
    { n: 13, label: "Avoiding divide-by-zero", beat: "r-zero", body: <Zero c={c} /> },
    {
      n: 14,
      label: (
        <>
          <QMono>ROW_NUMBER</QMono>, <QMono>RANK</QMono>, <QMono>DENSE_RANK</QMono>
        </>
      ),
      beat: "r-rank",
      body: <Rank c={c} />,
    },
    { n: 15, label: "Top N rows per group", beat: "r-topn", body: <TopN c={c} /> },
    { n: 16, label: "A CTE, or a subquery?", beat: "r-cte", body: <Cte c={c} /> },
    { n: 17, label: "Recursive CTEs", beat: "r-recursive", body: <Recursive c={c} /> },
    { n: 18, label: "Pivoting rows into columns", beat: "r-pivot", body: <Pivot c={c} /> },
    { n: 19, label: "Unpivoting columns into rows", beat: "r-unpivot", body: <Unpivot c={c} /> },
  ].map(({ beat, ...item }) => ({ ...item, at: n.beat(beat).from }));
  const lastAt = n.beat("r-unpivot").from;
  const listBottom = y(LIST_TOP) + items.length * h(ROW);

  return (
    <AbsoluteFill>
      <Sfx name="el-whoosh" at={from} level={-35} />
      {items.map((it) => (
        <Sfx key={it.n} name="el-tap" at={it.at} level={-33} />
      ))}
      <Sfx name="el-pop" at={n.word("r-rank", "four books with a tie")} level={-30} />
      <Sfx name="el-pencil" at={nextAt} level={-34} />

      <Drift from={from} to={n.beat("next").to + 40} scale={0.015}>
        <Kicker at={from}>Questions 13 to 19</Kicker>
        <Headline lead="Seven quick ones" turn="to finish." at={sevenAt - 4} turnAt={finishAt - 2} size={64} />

        {/* The last answer stays up through the bridge, so its body sits outside the list. */}
        <RapidFire
          items={items.map((it) => (it.n === 19 ? { ...it, body: undefined } : it))}
          x={X0}
          top={y(LIST_TOP)}
          rowH={h(ROW)}
          width={540}
          at={finishAt}
          end={end}
        />
        <Fade from={lastAt - 6}>
          <Unpivot c={c} />
        </Fade>

        <Note at={dozenAt} x={X0} y={listBottom + h(40)}>
          <span style={{ ...note(23, INK_SOFT), whiteSpace: "nowrap" }}>These tables: a few dozen rows at most</span>
        </Note>
        <Note at={paysAt} x={X0} y={listBottom + h(76)}>
          <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>A warehouse scans real ones, and bills it</span>
        </Note>
        <NextLine at={nextAt} x={X0} y={listBottom + h(128)} width={540}>
          warehouses and what they cost
        </NextLine>
      </Drift>
    </AbsoluteFill>
  );
};

const Fade: React.FC<{ from: number; children: React.ReactNode }> = ({ from, children }) => {
  const frame = useCurrentFrame();
  const o = ease(frame, from, 8);
  return o > 0 ? <AbsoluteFill style={{ opacity: o }}>{children}</AbsoluteFill> : null;
};
