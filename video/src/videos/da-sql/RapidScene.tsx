import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { during, ease } from "../../components/motion";
import { QMono, RapidFire, type RapidItem } from "../../editorial/interview";
import { type Layout, useLayout } from "../../editorial/layout";
import { BAR, INK, PAPER, TABULAR, fmt, headline, note } from "../../editorial/style";
import { Ink, NextLine, Note } from "../../editorial/ui";
import { MONO } from "../../theme/fonts";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { RAPID } from "./data";
import {
  type Col,
  DataTable,
  Drift,
  Headline,
  KeyArrow,
  Kicker,
  Listing,
  listingHeight,
  MARK_BAD,
  MARK_OK,
  Spot,
  TableName,
  tableGeometry,
  type TableGeometry,
  X0,
} from "./parts";

/** Where the answers go: right of the list. */
const R_X = 720;
const TOP = 310;
const LIST_TOP = 300;
const ROW = 46;
const HEAD_H = 46;
const ROW_H = 50;

type Cue = (beat: string, phrase: string) => number;
type Ctx = { w: Cue; y: Layout["y"]; h: Layout["h"]; T: number };

/** A small table at (x, top), sized from its rows. */
const geo = (c: Ctx, x: number, top: number, cols: readonly string[], rows: readonly (readonly string[])[], bodySize = 26) =>
  tableGeometry({ x, top, cols: cols.map((name) => ({ name })), rows, headH: c.h(HEAD_H), rowH: c.h(ROW_H), bodySize });

/** A query's name over a result table, set as code. */
const CodeName: React.FC<{ g: TableGeometry; at: number; children: React.ReactNode }> = ({ g, at, children }) => (
  <Ink at={at} dur={12} style={{ left: g.x, top: g.top - 38, whiteSpace: "nowrap" }}>
    <span style={{ fontFamily: MONO, fontSize: 21, fontWeight: 700, color: INK, fontVariantLigatures: "none" }}>{children}</span>
  </Ink>
);

const numeric = (cols: readonly string[], numericCols: readonly string[] = []): Col[] =>
  cols.map((name) => ({ name, numeric: numericCols.includes(name) }));

// ── 11. Self join ────────────────────────────────────────────────────────────

const SelfJoin: React.FC<{ c: Ctx }> = ({ c }) => {
  const at = c.w("r-self", "A self join");
  const itselfAt = c.w("r-self", "joined to itself");
  const managerAt = c.w("r-self", "their manager");
  const eg = geo(c, R_X, c.T, RAPID.employees.cols, RAPID.employees.rows);
  const listX = 1150;
  const listH = listingHeight(RAPID.selfJoin.lines.length, 22);
  const rg = geo(c, listX, c.T + listH + c.h(70), RAPID.selfJoin.cols, RAPID.selfJoin.rows);
  return (
    <>
      <TableName g={eg} at={at}>
        employees
      </TableName>
      <DataTable g={eg} cols={numeric(RAPID.employees.cols, ["id", "manager_id"])} at={at} rows={RAPID.employees.rows.map((cells, i) => ({ cells, at: at + 4 + i * 2 }))} />
      <Listing lines={RAPID.selfJoin.lines} x={listX} top={c.T} width={640} size={22} at={itselfAt - 2} marks={[{ line: 2, at: itselfAt + 8 }]} />
      <DataTable g={rg} cols={numeric(RAPID.selfJoin.cols)} at={managerAt - 4} rows={RAPID.selfJoin.rows.map((cells, i) => ({ cells, at: managerAt + i * 3 }))} />
    </>
  );
};

// ── 12. UNION and UNION ALL ──────────────────────────────────────────────────

const Union: React.FC<{ c: Ctx }> = ({ c }) => {
  const at = c.w("r-union", "UNION drops");
  const allAt = c.w("r-union", "UNION ALL");
  const fasterAt = c.w("r-union", "faster");
  const ag = geo(c, R_X, c.T, RAPID.storeA.cols, RAPID.storeA.rows);
  const bg = geo(c, R_X + 260, c.T, RAPID.storeB.cols, RAPID.storeB.rows);
  const resultTop = c.T + c.h(HEAD_H + 2 * ROW_H + 110);
  const ug = geo(c, R_X, resultTop, RAPID.union.cols, RAPID.union.rows);
  const ag2 = geo(c, R_X + 260, resultTop, RAPID.unionAll.cols, RAPID.unionAll.rows);
  const dup = (rows: readonly string[][]) => rows.flatMap((r, i) => (rows.filter((s) => s[0] === r[0]).length > 1 ? [i] : []));
  const shared = RAPID.union.rows.flatMap((r, i) => (RAPID.storeA.rows.some((a) => a[0] === r[0]) && RAPID.storeB.rows.some((b) => b[0] === r[0]) ? [i] : []));
  return (
    <>
      <TableName g={ag} at={at - 6}>
        store_a
      </TableName>
      <DataTable g={ag} cols={numeric(RAPID.storeA.cols)} at={at - 6} rows={RAPID.storeA.rows.map((cells, i) => ({ cells, at: at - 2 + i * 2 }))} />
      <TableName g={bg} at={at - 4}>
        store_b
      </TableName>
      <DataTable g={bg} cols={numeric(RAPID.storeB.cols)} at={at - 4} rows={RAPID.storeB.rows.map((cells, i) => ({ cells, at: at + i * 2 }))} />
      <CodeName g={ug} at={at + 4}>
        UNION
      </CodeName>
      <DataTable g={ug} cols={numeric(RAPID.union.cols)} at={at + 4} rows={RAPID.union.rows.map((cells, i) => ({ cells, at: at + 8 + i * 3 }))} bands={shared.map((row) => ({ row, at: at + 20 }))} />
      <CodeName g={ag2} at={allAt}>
        UNION ALL
      </CodeName>
      <DataTable g={ag2} cols={numeric(RAPID.unionAll.cols)} at={allAt} rows={RAPID.unionAll.rows.map((cells, i) => ({ cells, at: allAt + 4 + i * 3 }))} bands={dup(RAPID.unionAll.rows).map((row, k) => ({ row, at: allAt + 18 + k * 4 }))} />
      <Note at={fasterAt - 4} x={ag2.right + 40} y={ag2.top + c.h(60)}>
        <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>keeps every row, and it&apos;s faster</span>
      </Note>
    </>
  );
};

// ── 13. EXCEPT ───────────────────────────────────────────────────────────────

const Except: React.FC<{ c: Ctx }> = ({ c }) => {
  const at = c.w("r-except", "EXCEPT");
  const expectedAt = c.w("r-except", "Four products expected");
  const receivedAt = c.w("r-except", "three received");
  const missingAt = c.w("r-except", "Product three");
  const listH = listingHeight(RAPID.except.lines.length, 24);
  const top = c.T + listH + c.h(80);
  const eg = geo(c, R_X, top, RAPID.expected.cols, RAPID.expected.rows);
  const rg = geo(c, R_X + 260, top, RAPID.received.cols, RAPID.received.rows);
  const xg = geo(c, R_X + 560, top, RAPID.except.cols, RAPID.except.rows);
  const missing = RAPID.expected.rows.findIndex((r) => r[0] === RAPID.except.rows[0][0]);
  return (
    <>
      <Listing lines={RAPID.except.lines} x={R_X} top={c.T} width={680} size={24} at={at - 4} marks={[{ line: 1, at: at + 6 }]} />
      <TableName g={eg} at={expectedAt - 4}>
        expected_products
      </TableName>
      <DataTable g={eg} cols={numeric(RAPID.expected.cols, ["product_id"])} at={expectedAt - 4} rows={RAPID.expected.rows.map((cells, i) => ({ cells, at: expectedAt + i * 2 }))} bands={[{ row: missing, at: missingAt }]} />
      <TableName g={rg} at={receivedAt - 4}>
        received_products
      </TableName>
      <DataTable g={rg} cols={numeric(RAPID.received.cols, ["product_id"])} at={receivedAt - 4} rows={RAPID.received.rows.map((cells, i) => ({ cells, at: receivedAt + i * 2 }))} />
      <CodeName g={xg} at={missingAt - 4}>
        EXCEPT
      </CodeName>
      <DataTable g={xg} cols={numeric(RAPID.except.cols, ["product_id"])} at={missingAt - 4} rows={RAPID.except.rows.map((cells) => ({ cells, at: missingAt }))} bands={[{ row: 0, at: missingAt + 6, color: MARK_OK }]} />
    </>
  );
};

// ── 14. CASE ─────────────────────────────────────────────────────────────────

const Case: React.FC<{ c: Ctx }> = ({ c }) => {
  const at = c.w("r-case", "CASE");
  const cues = [c.w("r-case", "Six twenty"), c.w("r-case", "one twenty"), c.w("r-case", "fifty is small")];
  const lines = RAPID.caseSizes.lines;
  const listH = listingHeight(lines.length, 22);
  const rg = geo(c, R_X, c.T + listH + c.h(70), RAPID.caseSizes.cols, RAPID.caseSizes.rows);
  // The branch each row takes: the WHEN lines in order, then ELSE.
  const branch = [1, 2, 3];
  return (
    <>
      <Listing
        lines={lines}
        x={R_X}
        top={c.T}
        width={820}
        size={22}
        at={at - 4}
        marks={branch.map((line, i) => ({ line, at: cues[i], out: cues[i + 1] }))}
      />
      <DataTable g={rg} cols={numeric(RAPID.caseSizes.cols, ["amount"])} at={cues[0] - 6} rows={RAPID.caseSizes.rows.map((cells, i) => ({ cells, at: cues[i] }))} />
    </>
  );
};

// ── 15. A null inside a CASE ─────────────────────────────────────────────────

const CaseNull: React.FC<{ c: Ctx }> = ({ c }) => {
  const at = c.w("r-casenull", "Null inside");
  const eqAt = c.w("r-casenull", "when score equals null");
  const benAt = c.w("r-casenull", "Ben falls through");
  const isAt = c.w("r-casenull", "when score IS NULL");
  const listH = listingHeight(RAPID.caseEquals.lines.length, 22);
  const top = c.T + listH + c.h(84);
  const eg = geo(c, R_X, top, RAPID.caseEquals.cols, RAPID.caseEquals.rows);
  const ig = geo(c, R_X + 420, top, RAPID.caseIs.cols, RAPID.caseIs.rows);
  const ben = RAPID.caseEquals.rows.findIndex((r) => r[0] === "Ben");
  return (
    <>
      <Listing lines={RAPID.caseEquals.lines} x={R_X} top={c.T} width={760} size={22} at={at - 4} marks={[{ line: 1, at: eqAt + 4, color: MARK_BAD }]} out={isAt - 2} />
      <Listing lines={RAPID.caseIs.lines} x={R_X} top={c.T} width={760} size={22} at={isAt + 2} marks={[{ line: 1, at: isAt + 10, color: MARK_OK }]} />
      <CodeName g={eg} at={eqAt}>
        WHEN score = NULL
      </CodeName>
      <DataTable
        g={eg}
        cols={numeric(RAPID.caseEquals.cols)}
        at={eqAt}
        rows={RAPID.caseEquals.rows.map((cells, i) => ({ cells, at: eqAt + 4 + i * 2 }))}
        marks={[{ row: ben, col: 1, at: benAt, color: MARK_BAD }]}
      />
      <CodeName g={ig} at={isAt + 4}>
        WHEN score IS NULL
      </CodeName>
      <DataTable
        g={ig}
        cols={numeric(RAPID.caseIs.cols)}
        at={isAt + 4}
        rows={RAPID.caseIs.rows.map((cells, i) => ({ cells, at: isAt + 8 + i * 2 }))}
        marks={[{ row: ben, col: 1, at: isAt + 18, color: MARK_OK }]}
      />
    </>
  );
};

// ── 16. COALESCE and NULLIF ──────────────────────────────────────────────────

const Coalesce: React.FC<{ c: Ctx }> = ({ c }) => {
  const at = c.w("r-coalesce", "Coalesce");
  const firstAt = c.w("r-coalesce", "first value");
  const nullifAt = c.w("r-coalesce", "Null if");
  const divideAt = c.w("r-coalesce", "divide by");
  const lines = RAPID.coalesce.lines;
  const listH = listingHeight(lines.length, 22);
  const rg = geo(c, R_X, c.T + listH + c.h(70), RAPID.coalesce.cols, RAPID.coalesce.rows);
  const coalesceLine = lines.findIndex((l) => l.includes("COALESCE"));
  const nullifLine = lines.findIndex((l) => l.includes("NULLIF"));
  const day1 = 0;
  return (
    <>
      <Listing
        lines={lines}
        x={R_X}
        top={c.T}
        width={760}
        size={22}
        at={at - 4}
        marks={[
          { line: coalesceLine, at: firstAt, out: nullifAt },
          { line: nullifLine, at: nullifAt + 2 },
        ]}
      />
      <DataTable
        g={rg}
        cols={numeric(RAPID.coalesce.cols, RAPID.coalesce.cols)}
        at={firstAt - 4}
        rows={RAPID.coalesce.rows.map((cells, i) => ({ cells, at: firstAt + i * 3 }))}
        marks={[
          { row: day1, col: 1, at: firstAt + 10 },
          { row: day1, col: 2, at: divideAt },
        ]}
      />
    </>
  );
};

// ── 17. Dates ────────────────────────────────────────────────────────────────

const Dates: React.FC<{ c: Ctx }> = ({ c }) => {
  const at = c.w("r-dates", "Dates");
  const cues = [c.w("r-dates", "extract"), c.w("r-dates", "truncate"), c.w("r-dates", "add an interval")];
  const namesAt = c.w("r-dates", "The names change");
  const lines = RAPID.dates.lines;
  const listH = listingHeight(lines.length, 22);
  const rg = geo(c, R_X, c.T + listH + c.h(70), RAPID.dates.cols, RAPID.dates.rows);
  return (
    <>
      <Listing lines={lines} x={R_X} top={c.T} width={880} size={22} at={at - 2} marks={lines.map((_, i) => ({ line: i, at: cues[i], out: cues[i + 1] }))} />
      <DataTable
        g={rg}
        cols={RAPID.dates.cols.map((name, j) => ({ name, at: cues[j] + 2 }))}
        at={cues[0]}
        rows={RAPID.dates.rows.map((cells) => ({ cells, at: cues[0] + 4 }))}
      />
      <Note at={namesAt - 2} x={R_X} y={rg.rowTop(1) + c.h(44)}>
        <span style={{ ...note(28, INK), whiteSpace: "nowrap" }}>The names change between databases. The ideas don&apos;t.</span>
      </Note>
    </>
  );
};

// ── 18. Strings ──────────────────────────────────────────────────────────────

const Strings: React.FC<{ c: Ctx }> = ({ c }) => {
  const at = c.w("r-strings", "Strings");
  const trimAt = c.w("r-strings", "trim");
  const substrAt = c.w("r-strings", "substring");
  const lengthAt = c.w("r-strings", "length");
  const likeAt = c.w("r-strings", "joining two together");
  const lines = RAPID.strings.lines;
  const listH = listingHeight(lines.length, 22);
  const rg = geo(c, R_X, c.T + listH + c.h(70), RAPID.strings.cols, RAPID.strings.rows);
  const colAt = [trimAt, lengthAt, substrAt, likeAt];
  return (
    <>
      <Listing lines={lines} x={R_X} top={c.T} width={940} size={22} at={at - 2} marks={lines.map((_, i) => ({ line: i, at: colAt[i] }))} />
      <DataTable
        g={rg}
        cols={RAPID.strings.cols.map((name, j) => ({ name, at: colAt[j] + 2 }))}
        at={trimAt}
        rows={RAPID.strings.rows.map((cells) => ({ cells, at: trimAt + 4 }))}
      />
    </>
  );
};

// ── 19, 20. Indexes ──────────────────────────────────────────────────────────

/** The users table stored in id order (its clustered index), and an index on
 *  email beside it: the emails in order, each pointing at its row. With
 *  `insertAt`, a new row arrives in both. The new row is the video's own. */
const IndexFigure: React.FC<{ c: Ctx; tableAt: number; storedAt: number; indexAt: number; lookupAt: number; insertAt?: number }> = ({
  c,
  tableAt,
  storedAt,
  indexAt,
  lookupAt,
  insertAt,
}) => {
  const added = ["6", "di@example.com"];
  const users = [...RAPID.users.rows, added];
  const index = [...RAPID.emailIndex.rows, [added[1], added[0]]];
  const ug = tableGeometry({ x: R_X, top: c.T, cols: [{ name: "id" }, { name: "email" }], rows: users, headH: c.h(HEAD_H), rowH: c.h(ROW_H), bodySize: 24 });
  const ig = tableGeometry({ x: R_X + 560, top: c.T, cols: [{ name: "email" }, { name: "id" }], rows: index, headH: c.h(HEAD_H), rowH: c.h(ROW_H), bodySize: 24 });
  const rowOf = (id: string) => users.findIndex((r) => r[0] === id);
  const n = RAPID.users.rows.length;
  return (
    <>
      <TableName g={ug} at={tableAt}>
        users, clustered on id
      </TableName>
      <DataTable
        g={ug}
        cols={[{ name: "id", numeric: true }, { name: "email" }]}
        at={tableAt}
        rows={[
          ...RAPID.users.rows.map((cells, i) => ({ cells, at: tableAt + 4 + i * 2 })),
          ...(insertAt === undefined ? [] : [{ cells: added, at: insertAt, grow: true }]),
        ]}
        bands={insertAt === undefined ? [] : [{ row: n, at: insertAt + 4 }]}
      />
      <Note at={storedAt} x={R_X} y={ug.rowTop(n + (insertAt === undefined ? 0 : 1)) + 16}>
        <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>the rows, stored in id order: one per table</span>
      </Note>
      <TableName g={ig} at={indexAt}>
        an index on email
      </TableName>
      <DataTable
        g={ig}
        cols={[{ name: "email" }, { name: "id", numeric: true }]}
        at={indexAt}
        rows={[
          ...RAPID.emailIndex.rows.map((cells, i) => ({ cells, at: indexAt + 4 + i * 2 })),
          ...(insertAt === undefined ? [] : [{ cells: index[n], at: insertAt + 10, grow: true }]),
        ]}
        bands={insertAt === undefined ? [] : [{ row: n, at: insertAt + 14 }]}
      />
      {RAPID.emailIndex.rows.map((r, i) => (
        <KeyArrow key={i} from={[ig.x - 6, ig.rowMid(i)]} to={[ug.right + 8, ug.rowMid(rowOf(r[1]))]} at={lookupAt + i * 3} width={2} />
      ))}
      <Note at={lookupAt + 6} x={ig.x} y={ig.rowTop(n + (insertAt === undefined ? 0 : 1)) + 16}>
        <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>a separate lookup: many per table</span>
      </Note>
    </>
  );
};

/** Questions 19 and 20 share one figure, held across both rather than
 *  cross-faded into a copy of itself, which dipped the whole picture. */
const Indexes: React.FC<{ c: Ctx }> = ({ c }) => {
  const readsAt = c.w("r-writes", "speeds up reads");
  const writesAt = c.w("r-writes", "slows down writes");
  const insertAt = c.w("r-writes", "each insert");
  return (
    <>
      <IndexFigure
        c={c}
        tableAt={c.w("r-index", "A clustered index") - 2}
        storedAt={c.w("r-index", "stored in")}
        indexAt={c.w("r-index", "non-clustered") - 2}
        lookupAt={c.w("r-index", "separate lookup")}
        insertAt={insertAt + 2}
      />
      <Note at={readsAt - 2} x={R_X} y={c.y(TOP + 480)}>
        <span style={{ ...note(28, INK), whiteSpace: "nowrap" }}>
          Faster reads, <WritesWord at={writesAt} />
        </span>
      </Note>
    </>
  );
};

const WritesWord: React.FC<{ at: number }> = ({ at }) => {
  const frame = useCurrentFrame();
  return <span style={{ opacity: ease(frame, at - 2, 10) }}>slower writes: every insert updates every index.</span>;
};

// ── 21. ROLLUP and GROUP BY ALL ──────────────────────────────────────────────

const Rollup: React.FC<{ c: Ctx }> = ({ c }) => {
  const at = c.w("r-rollup", "Roll up");
  const subAt = c.w("r-rollup", "subtotals");
  const grandAt = c.w("r-rollup", "grand total");
  const seventeenAt = c.w("r-rollup", "seventeen rows");
  const allAt = c.w("r-rollup", "GROUP BY ALL");
  const everyAt = c.w("r-rollup", "every column");
  const { lines, cols, rows } = RAPID.rollup;
  // The first region's rows and its subtotal, a gap, and the grand total.
  const firstRegion = rows.filter((r) => r[0] === rows[0][0]);
  const shownRows = [...firstRegion, ["…", "", ""], rows[rows.length - 1]];
  const listH = listingHeight(lines.length, 22);
  // Six rows, so they are set a little closer than the round's other tables.
  const rg = tableGeometry({
    x: R_X,
    top: c.T + listH + c.h(70),
    cols: cols.map((name) => ({ name })),
    rows: shownRows,
    headH: c.h(HEAD_H),
    rowH: c.h(42),
    bodySize: 24,
  });
  const sub = firstRegion.length - 1;
  const allH = listingHeight(RAPID.groupByAll.lines.length, 22);
  const ag = geo(c, R_X, c.T + allH + c.h(70), RAPID.groupByAll.cols, RAPID.groupByAll.rows);
  const allLine = RAPID.groupByAll.lines.findIndex((l) => l.startsWith("GROUP BY ALL"));
  return (
    <>
      <Listing lines={lines} x={R_X} top={c.T} width={760} size={22} at={at - 4} marks={[{ line: 2, at: at + 8 }]} out={allAt - 4} />
      <DataTable
        g={rg}
        cols={numeric(cols, ["revenue"])}
        at={subAt - 6}
        rows={shownRows.map((cells, i) => ({ cells, at: (i === shownRows.length - 1 ? grandAt : subAt) - 2 + (i < sub ? i * 2 : 0) }))}
        bands={[
          { row: sub, at: subAt + 6 },
          { row: shownRows.length - 1, at: grandAt + 4 },
        ]}
        out={allAt - 4}
      />
      <Note at={seventeenAt - 2} x={rg.right + 40} y={rg.top + c.h(10)} out={allAt - 4}>
        <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>
          <span style={TABULAR}>{rows.length}</span> rows
        </span>
      </Note>
      <Listing lines={RAPID.groupByAll.lines} x={R_X} top={c.T} width={760} size={22} at={allAt} marks={[{ line: allLine, at: everyAt }]} />
      <DataTable g={ag} cols={numeric(RAPID.groupByAll.cols, ["revenue"])} at={allAt + 6} rows={RAPID.groupByAll.rows.map((cells, i) => ({ cells, at: allAt + 10 + i * 2 }))} />
    </>
  );
};

// ── 22. Finding duplicates ───────────────────────────────────────────────────

const Dupes: React.FC<{ c: Ctx }> = ({ c }) => {
  const at = c.w("r-dupes", "find duplicates");
  const groupAt = c.w("r-dupes", "group by the column");
  const overAt = c.w("r-dupes", "counts over one");
  const ug = tableGeometry({ x: R_X, top: c.T, cols: [{ name: "id" }, { name: "email" }], rows: RAPID.users.rows, headH: c.h(HEAD_H), rowH: c.h(ROW_H), bodySize: 24 });
  const listX = R_X + 480;
  const lines = RAPID.duplicates.lines;
  const listH = listingHeight(lines.length, 22);
  const rg = geo(c, listX, c.T + listH + c.h(70), RAPID.duplicates.cols, RAPID.duplicates.rows, 24);
  const dupEmails = new Set(RAPID.duplicates.rows.map((r) => r[0]));
  return (
    <>
      <TableName g={ug} at={at - 4}>
        users
      </TableName>
      <DataTable
        g={ug}
        cols={[{ name: "id", numeric: true }, { name: "email" }]}
        at={at - 4}
        rows={RAPID.users.rows.map((cells, i) => ({ cells, at: at + i * 2 }))}
        bands={RAPID.users.rows.flatMap((r, i) => (dupEmails.has(r[1]) ? [{ row: i, at: overAt + i * 2 }] : []))}
      />
      <Listing
        lines={lines}
        x={listX}
        top={c.T}
        width={600}
        size={22}
        at={at}
        marks={[
          { line: lines.findIndex((l) => l.startsWith("GROUP BY")), at: groupAt },
          { line: lines.findIndex((l) => l.startsWith("HAVING")), at: overAt },
        ]}
      />
      <DataTable g={rg} cols={numeric(RAPID.duplicates.cols, ["cnt"])} at={overAt + 2} rows={RAPID.duplicates.rows.map((cells, i) => ({ cells, at: overAt + 6 + i * 3 }))} />
    </>
  );
};

// ── 23. Deleting them, keeping one ───────────────────────────────────────────

const Dedupe: React.FC<{ c: Ctx }> = ({ c }) => {
  const at = c.w("r-dedupe", "To delete them");
  const numberAt = c.w("r-dedupe", "number each copy");
  const afterAt = c.w("r-dedupe", "everything after the first");
  const { cols, rows } = RAPID.rowNumbers;
  const tg = tableGeometry({ x: R_X, top: c.T, cols: cols.map((name) => ({ name })), rows, headH: c.h(HEAD_H), rowH: c.h(ROW_H), bodySize: 24 });
  const listX = 1170;
  const lines = RAPID.dedupe.lines;
  const listH = listingHeight(lines.length, 20);
  const cg = geo(c, listX, c.T + listH + c.h(70), RAPID.dedupe.cols, RAPID.dedupe.rows, 24);
  return (
    <>
      <TableName g={tg} at={at - 4}>
        users
      </TableName>
      <DataTable
        g={tg}
        cols={cols.map((name) => ({ name, numeric: name !== "email", at: name === "rn" ? numberAt + 4 : undefined }))}
        at={at - 4}
        rows={rows.map((cells, i) => ({ cells, at: at + i * 2, strikeAt: Number(cells[2]) > 1 ? afterAt + 4 + i : undefined }))}
        marks={rows.flatMap((r, i) => (Number(r[2]) > 1 ? [{ row: i, col: 2, at: afterAt, color: MARK_BAD }] : []))}
      />
      <Listing lines={lines} x={listX} top={c.T} width={630} size={20} at={numberAt - 6} marks={[{ line: 1, at: numberAt + 6 }]} />
      <DataTable g={cg} cols={numeric(RAPID.dedupe.cols, RAPID.dedupe.cols)} at={afterAt + 8} rows={RAPID.dedupe.rows.map((cells) => ({ cells, at: afterAt + 12 }))} />
    </>
  );
};

// ── 24. CROSS JOIN ───────────────────────────────────────────────────────────

const Cross: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const at = c.w("r-cross", "cross join");
  const pairsAt = c.w("r-cross", "pairs every row");
  const thousandAt = c.w("r-cross", "Two tables");
  const millionAt = c.w("r-cross", "a million");
  const products = RAPID.products.rows.map((r) => r[0]);
  const regions = RAPID.regions.rows.map((r) => r[0]);
  const gx = R_X + 140;
  const gy = c.T + c.h(50);
  const cw = 130;
  const ch = c.h(56);
  return (
    <>
      {regions.map((r, j) => (
        <Ink key={r} at={at + j * 2} dur={10} style={{ left: gx + j * cw, top: c.T, width: cw, textAlign: "center" }}>
          <span style={{ fontFamily: MONO, fontSize: 22, fontWeight: 600, color: INK }}>{r}</span>
        </Ink>
      ))}
      {products.map((p, i) => (
        <Ink key={p} at={at + 4 + i * 2} dur={10} style={{ left: R_X, top: gy + i * ch + ch / 2 - 16 }}>
          <span style={{ fontFamily: MONO, fontSize: 22, fontWeight: 600, color: INK }}>{p}</span>
        </Ink>
      ))}
      {products.flatMap((_, i) =>
        regions.map((__, j) => {
          const k = i * regions.length + j;
          const p = ease(frame, pairsAt + k * 2, 8);
          return (
            <div
              key={k}
              style={{
                position: "absolute",
                left: gx + j * cw + cw / 2 - 16,
                top: gy + i * ch + ch / 2 - 16,
                width: 32,
                height: 32,
                borderRadius: 6,
                background: `color-mix(in srgb, ${BAR} 70%, ${PAPER})`,
                opacity: p,
                transform: `scale(${0.6 + 0.4 * p})`,
              }}
            />
          );
        }),
      )}
      <Note at={pairsAt + regions.length * products.length * 2} x={gx + regions.length * cw + 30} y={gy + ch}>
        <span style={{ ...note(28, INK), whiteSpace: "nowrap" }}>
          <span style={TABULAR}>{RAPID.cross}</span> rows
        </span>
      </Note>
      <Ink at={thousandAt} dur={18} style={{ left: R_X, top: gy + products.length * ch + c.h(60), whiteSpace: "nowrap", ...headline(56) }}>
        <span style={TABULAR}>{fmt(1000, 0)}</span> × <span style={TABULAR}>{fmt(1000, 0)}</span> ={" "}
        <span style={{ opacity: ease(frame, millionAt - 2, 12) }}>
          <span style={TABULAR}>{fmt(RAPID.crossThousand, 0)}</span> rows
        </span>
      </Ink>
    </>
  );
};

/**
 * The rapid-fire round, questions 11 to 24: the numbered list on the left,
 * ticked as the round goes, and each answer on the right, every table and
 * listing as DuckDB ran it. The cross join stays up through the bridge to the
 * next video.
 */
export const RapidScene: React.FC = () => {
  const n = useNarration();
  const { y, h } = useLayout();
  const c: Ctx = { w: (b, p) => n.word(b, p), y, h, T: y(TOP) };

  const from = n.beat("rapid-in").from;
  const fourteenAt = n.word("rapid-in", "fourteen questions");
  const eachAt = n.word("rapid-in", "one answer each");
  const nextAt = n.word("next", "Next");
  const end = n.beat("next").from;

  const items: RapidItem[] = [
    { n: 11, label: "Self join", beat: "r-self", body: <SelfJoin c={c} /> },
    { n: 12, label: <><QMono>UNION</QMono> or <QMono>UNION ALL</QMono></>, beat: "r-union", body: <Union c={c} /> },
    { n: 13, label: <QMono>EXCEPT</QMono>, beat: "r-except", body: <Except c={c} /> },
    { n: 14, label: <QMono>CASE</QMono>, beat: "r-case", body: <Case c={c} /> },
    { n: 15, label: <>A null in a <QMono>CASE</QMono></>, beat: "r-casenull", body: <CaseNull c={c} /> },
    { n: 16, label: <><QMono>COALESCE</QMono> and <QMono>NULLIF</QMono></>, beat: "r-coalesce", body: <Coalesce c={c} /> },
    { n: 17, label: "Dates", beat: "r-dates", body: <Dates c={c} /> },
    { n: 18, label: "Strings", beat: "r-strings", body: <Strings c={c} /> },
    { n: 19, label: "Clustered or not", beat: "r-index" },
    { n: 20, label: "Indexes and writes", beat: "r-writes" },
    { n: 21, label: <><QMono>ROLLUP</QMono>, <QMono>GROUP BY ALL</QMono></>, beat: "r-rollup", body: <Rollup c={c} /> },
    { n: 22, label: "Finding duplicates", beat: "r-dupes", body: <Dupes c={c} /> },
    { n: 23, label: "Deleting duplicates", beat: "r-dedupe", body: <Dedupe c={c} /> },
    { n: 24, label: <QMono>CROSS JOIN</QMono>, beat: "r-cross" },
  ].map(({ beat, ...item }) => ({ ...item, at: n.beat(beat).from }));
  const crossAt = n.beat("r-cross").from;
  const indexAt = n.beat("r-index").from;
  const rollupAt = n.beat("r-rollup").from;

  return (
    <AbsoluteFill>
      <Sfx name="el-whoosh" at={from} level={-34} />
      {items.map((item) => (
        <Sfx key={item.n} name="el-tap" at={item.at} level={-34} />
      ))}
      <Sfx name="el-chime" at={end} level={-34} />

      <Drift from={from} to={n.beat("next").to + 40} scale={0.015}>
        <Kicker at={from}>Questions 11 to 24</Kicker>
        <Headline lead="Fourteen questions," turn="one answer each." at={fourteenAt - 6} turnAt={eachAt - 4} size={64} />
        <Spot id="da-sql-stopwatch" at={from + 6} left={1640} top={y(112)} width={130} height={140} />

        <RapidFire items={items} x={X0} top={y(LIST_TOP)} rowH={ROW} width={500} at={eachAt} end={end} />

        {/* Questions 19 and 20: one figure, held. */}
        <Hold from={indexAt - 6} to={rollupAt - 2}>
          <Indexes c={c} />
        </Hold>

        {/* The last answer stays up through the bridge. */}
        <Fade from={crossAt - 6}>
          <Cross c={c} />
        </Fade>

        <NextLine at={nextAt} x={R_X} y={y(860)} width={1000}>
          pandas
        </NextLine>
      </Drift>
    </AbsoluteFill>
  );
};

const Hold: React.FC<{ from: number; to: number; children: React.ReactNode }> = ({ from, to, children }) => {
  const frame = useCurrentFrame();
  const o = during(frame, from, to, 8);
  return o > 0 ? <AbsoluteFill style={{ opacity: o }}>{children}</AbsoluteFill> : null;
};

const Fade: React.FC<{ from: number; children: React.ReactNode }> = ({ from, children }) => {
  const frame = useCurrentFrame();
  const o = ease(frame, from, 8);
  return o > 0 ? <AbsoluteFill style={{ opacity: o }}>{children}</AbsoluteFill> : null;
};
