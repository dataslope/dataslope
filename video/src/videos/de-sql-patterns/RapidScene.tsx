import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { OK_INK, QMono, RapidFire, type RapidItem } from "../../editorial/interview";
import { type Layout, useLayout } from "../../editorial/layout";
import { BAR, BLUE_INK, INK, INK_SOFT, PAPER, label, note } from "../../editorial/style";
import { Ink, NextLine, Note, Num } from "../../editorial/ui";
import { MONO } from "../../theme/fonts";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { RAPID } from "./data";
import {
  colsOf,
  DataTable,
  Drift,
  geoOf,
  Headline,
  Kicker,
  lineOf,
  Listing,
  listingHeight,
  Mark,
  MARK,
  MARK_OK,
  rowsAt,
  Spot,
  TableName,
  X0,
} from "./parts";

/** Where the answers go: right of the list. */
const R_X = 740;
const TOP = 320;
const LIST_TOP = 300;
const ROW = 46;
const SIZE = 19;

type Ctx = { w: (beat: string, phrase: string) => number; y: Layout["y"]; h: Layout["h"]; T: number };

/** A result in the round's compact rows. */
const geo = (c: Ctx, t: { cols: readonly string[]; rows: readonly (readonly string[])[] }, x: number, top: number, rowH = 42) =>
  geoOf(t, x, top, c.h, { headH: 42, rowH, bodySize: 22, headSize: 20 });

/** Below a listing of `lines` lines. */
const under = (c: Ctx, lines: number, top = c.T) => top + listingHeight(lines, SIZE) + c.h(18);

/** A query's name over a result, set as code. */
const CodeName: React.FC<{ x: number; top: number; at: number; children: React.ReactNode }> = ({ x, top, at, children }) => (
  <Ink at={at} dur={12} style={{ left: x, top: top - 36, whiteSpace: "nowrap" }}>
    <span style={{ fontFamily: MONO, fontSize: 21, fontWeight: 700, color: INK, fontVariantLigatures: "none" }}>{children}</span>
  </Ink>
);

// ── 12. Finding duplicates (da-sql's users) ─────────────────────────────────

const Dupes: React.FC<{ c: Ctx }> = ({ c }) => {
  const at = c.w("r-dupes", "To find duplicate rows");
  const groupAt = c.w("r-dupes", "group by the columns");
  const overAt = c.w("r-dupes", "the counts over one");
  const copyAt = c.w("r-dupes", "To see every copy");
  const numberAt = c.w("r-dupes", "number them");
  const keepAt = c.w("r-dupes", "the numbers over one");
  const U = RAPID.users;
  const ug = geo(c, U, R_X, c.T, 46);
  const dupEmails = new Set(RAPID.duplicates.rows.map((r) => r[0]));
  const N = RAPID.rowNumbers;
  const ng = geo(c, N, R_X, c.T, 46);
  const rn = N.cols.indexOf("rn");
  const listX = R_X + 470;
  const D = RAPID.duplicates;
  const rg = geo(c, D, listX, under(c, D.lines.length) + c.h(30));
  return (
    <>
      <TableName g={ug} at={at - 4} out={copyAt}>
        users
      </TableName>
      <DataTable
        g={ug}
        cols={colsOf(U)}
        at={at - 4}
        out={copyAt}
        rows={rowsAt(U.rows, at)}
        bands={U.rows.flatMap((r, i) => (dupEmails.has(r[1]) ? [{ row: i, at: overAt + i * 2, color: MARK }] : []))}
      />
      <Listing
        lines={D.lines}
        x={listX}
        top={c.T}
        width={600}
        size={SIZE}
        at={at}
        marks={[
          { line: lineOf(D.lines, "GROUP BY"), at: groupAt },
          { line: lineOf(D.lines, "HAVING"), at: overAt, color: MARK_OK },
        ]}
      />
      <DataTable g={rg} cols={colsOf(D, { cnt: { ink: BLUE_INK } })} at={overAt + 2} rows={rowsAt(D.rows, overAt + 6, 3)} />
      <TableName g={ng} at={copyAt}>
        users, each email&rsquo;s copies numbered
      </TableName>
      <DataTable
        g={ng}
        cols={colsOf(N, { rn: { ink: BLUE_INK, at: numberAt + 2 } })}
        at={copyAt}
        rows={rowsAt(N.rows, copyAt + 2, 1)}
        marks={N.rows.flatMap((r, row) => (Number(r[rn]) > 1 ? [{ row, col: rn, at: keepAt + 2 + row, color: MARK }] : []))}
      />
      <Note at={keepAt + 6} x={R_X} y={ng.rowTop(N.rows.length) + c.h(18)}>
        <span style={{ ...note(22, INK), whiteSpace: "nowrap" }}>
          <QMono>rn &gt; 1</QMono>: every extra copy, whole rows
        </span>
      </Note>
    </>
  );
};

// ── 13. A CTE against a subquery (the page's orders) ────────────────────────

const Cte: React.FC<{ c: Ctx }> = ({ c }) => {
  const at = c.w("r-cte", "A subquery nests a step");
  const namesAt = c.w("r-cte", "A CTE names it up front");
  const twiceAt = c.w("r-cte", "can be used twice");
  const sameAt = c.w("r-cte", "the same three users");
  const S = RAPID.subquery;
  const C = RAPID.cte;
  const cteTop = under(c, S.lines.length) + c.h(56);
  const rg = geo(c, C, R_X + 680, c.T + c.h(36));
  return (
    <>
      <Listing lines={S.lines} x={R_X} top={c.T} width={600} size={SIZE} at={at - 4} marks={[{ line: lineOf(S.lines, "FROM (SELECT"), at: at + 10 }]} />
      <Note at={at + 10} x={R_X} y={under(c, S.lines.length) - c.h(6)}>
        <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>the step, nested inside</span>
      </Note>
      <Listing lines={C.lines} x={R_X} top={cteTop} width={600} size={SIZE} at={namesAt - 4} marks={[{ line: lineOf(C.lines, "WITH user_totals"), at: namesAt + 8, color: MARK_OK }]} />
      <Note at={twiceAt - 2} x={R_X} y={under(c, C.lines.length, cteTop) - c.h(6)}>
        <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>the step, named first: read top to bottom, usable twice</span>
      </Note>
      <Note at={sameAt - 4} x={R_X + 680} y={c.T}>
        <span style={{ ...note(22, INK), whiteSpace: "nowrap" }}>both return</span>
      </Note>
      <DataTable g={rg} cols={colsOf(C)} at={sameAt - 2} rows={rowsAt(C.rows, sameAt + 2, 3)} bands={C.rows.map((_, row) => ({ row, at: sameAt + 10 + row * 2, color: MARK_OK }))} />
      <Note at={sameAt + 8} x={R_X + 680} y={rg.rowTop(C.rows.length) + c.h(16)}>
        <span style={{ ...note(21, INK_SOFT), whiteSpace: "nowrap" }}>
          the page&apos;s orders, totals over <Num>700</Num>
        </span>
      </Note>
    </>
  );
};

// ── 14. UNION and UNION ALL (da-sql's) ──────────────────────────────────────

const Union: React.FC<{ c: Ctx }> = ({ c }) => {
  const at = c.w("r-union", "UNION stacks two results");
  const removesAt = c.w("r-union", "removes duplicates");
  const costAt = c.w("r-union", "a sort or a hash");
  const allAt = c.w("r-union", "UNION ALL keeps every row");
  const preferAt = c.w("r-union", "prefer it");
  const ag = geo(c, RAPID.storeA, R_X, c.T + c.h(10), 46);
  const bg = geo(c, RAPID.storeB, R_X + 260, c.T + c.h(10), 46);
  const resultTop = c.T + c.h(250);
  const ug = geo(c, RAPID.union, R_X, resultTop, 46);
  const ag2 = geo(c, RAPID.unionAll, R_X + 260, resultTop, 46);
  const shared = RAPID.union.rows.flatMap((r, i) => (RAPID.storeA.rows.some((a) => a[0] === r[0]) && RAPID.storeB.rows.some((b) => b[0] === r[0]) ? [i] : []));
  const dup = RAPID.unionAll.rows.flatMap((r, i) => (RAPID.unionAll.rows.filter((s) => s[0] === r[0]).length > 1 ? [i] : []));
  return (
    <>
      <TableName g={ag} at={at - 6}>
        store_a
      </TableName>
      <DataTable g={ag} cols={colsOf(RAPID.storeA)} at={at - 6} rows={rowsAt(RAPID.storeA.rows, at - 2)} />
      <TableName g={bg} at={at - 4}>
        store_b
      </TableName>
      <DataTable g={bg} cols={colsOf(RAPID.storeB)} at={at - 4} rows={rowsAt(RAPID.storeB.rows, at)} />
      <CodeName x={ug.x} top={ug.top} at={removesAt - 4}>
        UNION
      </CodeName>
      <DataTable g={ug} cols={colsOf(RAPID.union)} at={removesAt - 4} rows={rowsAt(RAPID.union.rows, removesAt, 3)} bands={shared.map((row) => ({ row, at: removesAt + 12 }))} />
      <CodeName x={ag2.x} top={ag2.top} at={allAt}>
        UNION ALL
      </CodeName>
      <DataTable g={ag2} cols={colsOf(RAPID.unionAll)} at={allAt} rows={rowsAt(RAPID.unionAll.rows, allAt + 4, 3)} bands={dup.map((row, k) => ({ row, at: allAt + 16 + k * 4 }))} />
      <Note at={costAt - 2} x={ag2.right + 50} y={resultTop + c.h(10)}>
        <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
          <QMono>UNION</QMono>: one Boston, after a sort or a hash
        </span>
      </Note>
      <Note at={allAt + 8} x={ag2.right + 50} y={resultTop + c.h(56)}>
        <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
          <QMono>UNION ALL</QMono>: every row, no dedup step
        </span>
      </Note>
      <Note at={preferAt - 2} x={ag2.right + 50} y={resultTop + c.h(102)}>
        <span style={{ ...note(24, OK_INK), whiteSpace: "nowrap", fontWeight: 650 }}>the default, unless you need the dedup</span>
      </Note>
    </>
  );
};

// ── 15. LAG and LEAD ────────────────────────────────────────────────────────

const Lag: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const at = c.w("r-lag", "Lag reads a value");
  const earlierAt = c.w("r-lag", "from an earlier row");
  const laterAt = c.w("r-lag", "from a later one");
  const changeAt = c.w("r-lag", "the change since yesterday");
  const edgesAt = c.w("r-lag", "At the edges");
  const nullAt = c.w("r-lag", "null, unless you pass a default");
  const zeroAt = c.w("r-lag", "like this zero");
  const L = RAPID.lag;
  const g = geo(c, L, R_X, under(c, L.lines.length));
  const prev = L.cols.indexOf("prev");
  const next = L.cols.indexOf("next");
  const delta = L.cols.indexOf("delta");
  const last = L.rows.length - 1;
  return (
    <>
      <Listing
        lines={L.lines}
        x={R_X}
        top={c.T}
        width={700}
        size={SIZE}
        at={at - 4}
        marks={[
          { line: lineOf(L.lines, "LAG(revenue, 1, 0) OVER (ORDER BY order_date) AS prev"), at: earlierAt },
          { line: lineOf(L.lines, "LEAD(revenue)"), at: laterAt },
          { line: lineOf(L.lines, "revenue - LAG"), at: changeAt },
        ]}
      />
      <DataTable
        g={g}
        cols={colsOf(L, { prev: { ink: BLUE_INK }, next: { ink: BLUE_INK }, delta: { ink: BLUE_INK } })}
        at={at + 2}
        rows={rowsAt(L.rows, at + 6)}
        marks={[
          ...L.rows.map((_, row) => ({ row, col: prev, at: earlierAt + 4 + row * 2, out: laterAt })),
          ...L.rows.map((_, row) => ({ row, col: next, at: laterAt + 4 + row * 2, out: changeAt })),
          ...L.rows.map((_, row) => ({ row, col: delta, at: changeAt + 4 + row * 2, out: edgesAt })),
          { row: last, col: next, at: nullAt },
          { row: 0, col: prev, at: zeroAt, color: MARK_OK },
        ]}
      />
      <Note at={edgesAt} x={g.right + 30} y={g.rowTop(0)}>
        <span style={{ ...note(22, INK), whiteSpace: "nowrap" }}>nothing before the first day:</span>
        <br />
        <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap", opacity: ease(frame, zeroAt - 2, 10) }}>
          <QMono>LAG(revenue, 1, 0)</QMono> gives 0
        </span>
      </Note>
      <Note at={nullAt} x={g.right + 30} y={g.rowTop(last)}>
        <span style={{ ...note(22, INK), whiteSpace: "nowrap" }}>
          nothing after: <QMono>LEAD</QMono> gives null
        </span>
      </Note>
    </>
  );
};

// ── 16. A running total (the page's orders; ds-sql's tie) ───────────────────

const Running: React.FC<{ c: Ctx }> = ({ c }) => {
  const at = c.w("r-running", "A running total is a sum");
  const framedAt = c.w("r-running", "framed from the first row");
  const perUserAt = c.w("r-running", "per user");
  const leaveAt = c.w("r-running", "Leave the frame out");
  const rangeAt = c.w("r-running", "the default is range");
  const shareAt = c.w("r-running", "share one total");
  const R = RAPID.running;
  const rg = geo(c, R, R_X + 610, c.T + c.h(8));
  const rt = R.cols.indexOf("running_total");
  const T = RAPID.tied;
  const tg = geo(c, T, R_X + 610, rg.rowTop(R.rows.length) + c.h(80));
  const day = T.cols.indexOf("day");
  const tied = T.rows.flatMap((r, i) => (T.rows.filter((s) => s[day] === r[day]).length > 1 ? [i] : []));
  const ttotal = T.cols.indexOf("running_total");
  return (
    <>
      <Listing
        lines={R.lines}
        x={R_X}
        top={c.T}
        width={580}
        size={SIZE}
        at={at - 4}
        marks={[
          { line: lineOf(R.lines, "ROWS BETWEEN"), at: framedAt },
          { line: lineOf(R.lines, "AND CURRENT ROW"), at: framedAt + 6 },
          { line: lineOf(R.lines, "PARTITION BY user_id"), at: perUserAt },
        ]}
      />
      <DataTable
        g={rg}
        cols={colsOf(R, { running_total: { ink: BLUE_INK } })}
        at={at}
        rows={rowsAt(R.rows, at + 4)}
        marks={R.rows.map((_, row) => ({ row, col: rt, at: framedAt + 4 + row * 3, color: MARK_OK }))}
      />
      <Note at={at + 8} x={rg.x} y={rg.rowTop(R.rows.length) + c.h(10)}>
        <span style={{ ...note(21, INK_SOFT), whiteSpace: "nowrap" }}>the page&apos;s orders, user 1</span>
      </Note>
      <TableName g={tg} at={leaveAt - 2}>
        no frame written, two rows on one day
      </TableName>
      <DataTable
        g={tg}
        cols={colsOf(T, { running_total: { ink: BLUE_INK } })}
        at={leaveAt - 2}
        rows={rowsAt(T.rows, leaveAt + 2)}
        marks={[
          ...tied.map((row, k) => ({ row, col: day, at: rangeAt + 4 + k * 3 })),
          ...tied.map((row, k) => ({ row, col: ttotal, at: shareAt + k * 4 })),
        ]}
      />
      <Note at={rangeAt} x={R_X} y={under(c, R.lines.length) + c.h(10)}>
        <span style={{ ...note(22, INK), whiteSpace: "nowrap" }}>with no frame written:</span>
        <div style={{ fontFamily: MONO, fontSize: 20, fontWeight: 600, color: BLUE_INK, marginTop: 6, whiteSpace: "pre", fontVariantLigatures: "none" }}>
          RANGE BETWEEN UNBOUNDED PRECEDING{"\n"}  AND CURRENT ROW
        </div>
      </Note>
    </>
  );
};

// ── 17. Pivoting (ds-sql's traffic) ─────────────────────────────────────────

const Pivot: React.FC<{ c: Ctx }> = ({ c }) => {
  const at = c.w("r-pivot", "To pivot");
  const caseAt = c.w("r-pivot", "sum a case expression");
  const groupedAt = c.w("r-pivot", "grouped by the row");
  const clauseAt = c.w("r-pivot", "DuckDB also has a pivot clause");
  const dynamicAt = c.w("r-pivot", "it takes dynamic sequel");
  const P = RAPID.pivot;
  const g = geo(c, P, R_X, under(c, P.lines.length));
  return (
    <>
      <Listing
        lines={P.lines}
        x={R_X}
        top={c.T}
        width={880}
        size={SIZE}
        at={at - 4}
        marks={[
          { line: lineOf(P.lines, "'mobile'"), at: caseAt + 2 },
          { line: lineOf(P.lines, "'desktop'"), at: caseAt + 8 },
          { line: lineOf(P.lines, "GROUP BY"), at: groupedAt },
        ]}
      />
      <DataTable g={g} cols={colsOf(P, { mobile: { ink: BLUE_INK }, desktop: { ink: BLUE_INK } })} at={groupedAt - 2} rows={rowsAt(P.rows, groupedAt + 2)} />
      <Note at={clauseAt} x={g.right + 50} y={g.rowTop(0) - c.h(30)}>
        <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>in DuckDB, also:</span>
        <div style={{ fontFamily: MONO, fontSize: 20, fontWeight: 600, color: BLUE_INK, marginTop: 6, whiteSpace: "pre", fontVariantLigatures: "none" }}>
          {RAPID.pivotClause.replace(" USING", "\nUSING")}
        </div>
      </Note>
      <Note at={dynamicAt - 2} x={g.right + 50} y={g.rowTop(2) + c.h(10)}>
        <span style={{ ...note(22, INK), whiteSpace: "nowrap" }}>values not known ahead: dynamic SQL</span>
      </Note>
    </>
  );
};

// ── 18. The four joins (da-sql's customers and orders) ──────────────────────

const CHIP_W = 52;
const CHIP_GAP = 8;

const Joins: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const innerAt = c.w("r-joins", "An inner join keeps only matches");
  const sixAt = c.w("r-joins", "six rows");
  const leftAt = c.w("r-joins", "Left keeps every customer");
  const diAt = c.w("r-joins", "Di comes back with nulls");
  const rightAt = c.w("r-joins", "Right keeps every order");
  const strayAt = c.w("r-joins", "the stray one too");
  const fullAt = c.w("r-joins", "Full keeps both");
  const eightAt = c.w("r-joins", "eight");
  const J = RAPID.joins;
  // Each result row as a chip: a match, a customer with no order, an order
  // with no customer.
  const chipsOf = (t: { rows: string[][] }) =>
    t.rows.map((r) => (r[0] === "null" ? { kind: "order" as const, text: r[1] } : r[1] === "null" ? { kind: "customer" as const, text: r[0] } : { kind: "match" as const, text: "" }));
  const kinds = [
    { name: "INNER JOIN", t: J.inner, at: innerAt, countAt: sixAt },
    { name: "LEFT JOIN", t: J.left, at: leftAt, countAt: diAt },
    { name: "RIGHT JOIN", t: J.right, at: rightAt, countAt: strayAt },
    { name: "FULL JOIN", t: J.full, at: fullAt, countAt: eightAt },
  ];
  const rowY = (k: number) => c.T + c.h(40) + k * c.h(110);
  const chipsX = R_X + 200;
  return (
    <>
      <Note at={innerAt - 6} x={R_X} y={c.T - c.h(10)}>
        <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>
          4 customers (Di never ordered), 7 orders (order 125 names no customer): a chip per result row
        </span>
      </Note>
      {kinds.map((k, i) => {
        const chips = chipsOf(k.t);
        return (
          <React.Fragment key={k.name}>
            <Ink at={k.at - 2} dur={12} style={{ left: R_X, top: rowY(i) + c.h(8), whiteSpace: "nowrap" }}>
              <span style={{ fontFamily: MONO, fontSize: 23, fontWeight: 700, color: INK, fontVariantLigatures: "none" }}>{k.name}</span>
            </Ink>
            {chips.map((ch, j) => {
              const p = ease(frame, k.at + 2 + j * 2, 8);
              if (p <= 0) return null;
              const match = ch.kind === "match";
              return (
                <div
                  key={j}
                  style={{
                    position: "absolute",
                    left: chipsX + j * (CHIP_W + CHIP_GAP),
                    top: rowY(i),
                    width: CHIP_W,
                    height: c.h(48),
                    boxSizing: "border-box",
                    borderRadius: 6,
                    border: `2px ${match ? "solid" : "dashed"} ${match ? BAR : INK_SOFT}`,
                    background: match ? `color-mix(in srgb, ${BAR} 55%, ${PAPER})` : PAPER,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    ...label(19, INK),
                    opacity: p,
                    transform: `scale(${0.8 + 0.2 * p})`,
                  }}
                >
                  {ch.text}
                </div>
              );
            })}
            <Ink at={k.countAt} dur={10} style={{ left: chipsX + chips.length * (CHIP_W + CHIP_GAP) + 16, top: rowY(i) + c.h(8), whiteSpace: "nowrap" }}>
              <span style={{ ...note(24, INK), fontWeight: 650 }}>
                <Num>{chips.length}</Num> rows
              </span>
            </Ink>
          </React.Fragment>
        );
      })}
      <Note at={diAt + 6} x={chipsX} y={rowY(4) - c.h(10)}>
        <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>
          dashed: a row from one side only, nulls on the other
        </span>
      </Note>
    </>
  );
};

// ── 19. NTILE (da-advanced-sql's customers) ─────────────────────────────────

const Ntile: React.FC<{ c: Ctx }> = ({ c }) => {
  const at = c.w("r-ntile", "N tile deals ordered rows");
  const fourAt = c.w("r-ntile", "four quartiles of six");
  const evenAt = c.w("r-ntile", "When it can't split evenly");
  const extraAt = c.w("r-ntile", "the extra rows");
  const Q = RAPID.quartiles;
  const top = under(c, Q.lines.length) + c.h(60);
  const q = RAPID.quartileSizes;
  const f = RAPID.fifthSizes;
  const qg = geo(c, q, R_X, top);
  const fg = geo(c, f, R_X + 420, top);
  const extra = f.rows.flatMap((r, i) => (r[1] === f.rows[0][1] && r[1] !== f.rows[f.rows.length - 1][1] ? [i] : []));
  return (
    <>
      <Listing lines={Q.lines} x={R_X} top={c.T} width={720} size={SIZE} at={at - 4} marks={[{ line: lineOf(Q.lines, "NTILE(4)"), at: at + 8 }]} />
      <Note at={fourAt - 4} x={R_X} y={top - c.h(36)}>
        <span style={{ ...label(21, INK), whiteSpace: "nowrap" }}>
          <QMono>NTILE(4)</QMono>: customers per bucket
        </span>
      </Note>
      <DataTable g={qg} cols={colsOf(q)} at={fourAt - 2} rows={rowsAt(q.rows, fourAt + 2)} />
      <Note at={evenAt - 4} x={R_X + 420} y={top - c.h(36)}>
        <span style={{ ...label(21, INK), whiteSpace: "nowrap" }}>
          <QMono>NTILE(5)</QMono>: customers per bucket
        </span>
      </Note>
      <DataTable g={fg} cols={colsOf(f)} at={evenAt - 2} rows={rowsAt(f.rows, evenAt + 2)} marks={extra.map((row, k) => ({ row, col: 1, at: extraAt + k * 3, color: MARK }))} />
    </>
  );
};

// ── 20. PERCENT_RANK and CUME_DIST (the page's own values) ──────────────────

const Percent: React.FC<{ c: Ctx }> = ({ c }) => {
  const at = c.w("r-percent", "Percent rank is rank minus one");
  const cumeAt = c.w("r-percent", "Cume dist is the share");
  const valuesAt = c.w("r-percent", "For ten, twenty, twenty, thirty");
  const thirdAt = c.w("r-percent", "a third");
  const quartersAt = c.w("r-percent", "three quarters");
  const S = RAPID.percent;
  const g = geo(c, S, R_X, under(c, S.lines.length), 46);
  const v = S.cols.indexOf("v");
  const pr = S.cols.indexOf("pct_rank");
  const cd = S.cols.indexOf("cume_dist");
  const ties = S.rows.flatMap((r, i) => (S.rows.filter((s) => s[v] === r[v]).length > 1 ? [i] : []));
  return (
    <>
      <Listing lines={S.lines} x={R_X} top={c.T} width={720} size={SIZE} at={at - 6} marks={[
        { line: lineOf(S.lines, "PERCENT_RANK"), at: at + 4, out: cumeAt },
        { line: lineOf(S.lines, "CUME_DIST"), at: cumeAt + 2 },
      ]} />
      <DataTable
        g={g}
        cols={colsOf(S, { pct_rank: { ink: BLUE_INK }, cume_dist: { ink: BLUE_INK } })}
        at={valuesAt - 4}
        rows={rowsAt(S.rows, valuesAt)}
        bands={ties.map((row) => ({ row, at: valuesAt + 10, out: thirdAt }))}
        marks={[
          ...ties.map((row, k) => ({ row, col: pr, at: thirdAt + 2 + k * 3, color: MARK })),
          ...ties.map((row, k) => ({ row, col: cd, at: quartersAt + 2 + k * 3, color: MARK })),
        ]}
      />
      <Note at={at + 6} x={g.right + 40} y={g.rowTop(0)}>
        <span style={{ ...note(22, INK), whiteSpace: "nowrap" }}>
          <QMono>pct_rank</QMono> = (rank − 1) / (rows − 1)
        </span>
      </Note>
      <Note at={cumeAt + 4} x={g.right + 40} y={g.rowTop(1) + c.h(6)}>
        <span style={{ ...note(22, INK), whiteSpace: "nowrap" }}>
          <QMono>cume_dist</QMono> = rows at or tied with it / rows
        </span>
      </Note>
      <Note at={quartersAt + 8} x={g.right + 40} y={g.rowTop(2) + c.h(16)}>
        <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>
          the 20s: rank 2 of 4, and 3 of 4 rows at or below
        </span>
      </Note>
    </>
  );
};

// ── 21. COALESCE ────────────────────────────────────────────────────────────

const Coalesce: React.FC<{ c: Ctx }> = ({ c }) => {
  const at = c.w("r-coalesce", "Coalesce returns its first argument");
  const phoneAt = c.w("r-coalesce", "the phone");
  const emailAt = c.w("r-coalesce", "else the email");
  const noneAt = c.w("r-coalesce", "else no contact");
  const nullifAt = c.w("r-coalesce", "Null if goes the other way");
  const U = RAPID.contacts;
  const ug = geo(c, U, R_X, c.T + c.h(8), 46);
  const C = RAPID.coalesce;
  const listTop = ug.rowTop(U.rows.length) + c.h(40);
  const cg = geo(c, C, R_X + 700, listTop, 46);
  const phone = U.cols.indexOf("phone");
  const email = U.cols.indexOf("email");
  const N = RAPID.nullif;
  return (
    <>
      <TableName g={ug} at={at - 6}>
        users
      </TableName>
      <DataTable
        g={ug}
        cols={colsOf(U)}
        at={at - 6}
        rows={rowsAt(U.rows, at - 2)}
        marks={[
          { row: 0, col: phone, at: phoneAt, color: MARK_OK },
          { row: 1, col: email, at: emailAt, color: MARK_OK },
          { row: 2, col: phone, at: noneAt },
          { row: 2, col: email, at: noneAt + 3 },
        ]}
      />
      <Listing lines={C.lines} x={R_X} top={listTop} width={680} size={SIZE} at={at} />
      <DataTable g={cg} cols={colsOf(C)} at={phoneAt - 2} rows={[
        { cells: C.rows[0], at: phoneAt + 2 },
        { cells: C.rows[1], at: emailAt + 2 },
        { cells: C.rows[2], at: noneAt + 2 },
      ]} />
      <Note at={nullifAt} x={R_X} y={under(c, C.lines.length, listTop) + c.h(20)}>
        <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>
          <QMono>NULLIF(units, 0)</QMono>: a zero becomes null, so <QMono>500 / NULLIF(0, 0)</QMono> is{" "}
          <span style={{ fontStyle: "italic", color: INK_SOFT }}>{N.rows[0][0]}</span>, not an error
        </span>
      </Note>
    </>
  );
};

// ── 22. CROSS JOIN (da-sql's products and regions) ──────────────────────────

const Cross: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const at = c.w("r-cross", "And a cross join pairs every row");
  const pairsAt = c.w("r-cross", "with every row");
  const twelveAt = c.w("r-cross", "make twelve");
  const purposeAt = c.w("r-cross", "Use it on purpose");
  const spineAt = c.w("r-cross", "a date-by-segment spine");
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
      <Note at={twelveAt} x={gx + regions.length * cw + 30} y={gy + ch}>
        <span style={{ ...note(28, INK), whiteSpace: "nowrap" }}>
          <Num>{products.length}</Num> × <Num>{regions.length}</Num> = <Num>{RAPID.cross}</Num> rows
        </span>
      </Note>
      <Note at={purposeAt} x={R_X} y={gy + products.length * ch + c.h(40)}>
        <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>
          On purpose: a planning grid, <Mark at={spineAt}>or a date-by-segment spine</Mark>
        </span>
      </Note>
    </>
  );
};

/**
 * The quick round, questions 12 to 22, numbered on screen only, in this
 * video's own words ("one-liners"). Every answer ran in DuckDB: on the
 * page's tables where the page has one, and on da-sql's, da-advanced-sql's
 * and ds-sql's where this round reuses their figures. The cross join stays up
 * through the bridge into Part 2.
 */
export const RapidScene: React.FC = () => {
  const n = useNarration();
  const { y, h } = useLayout();
  const c: Ctx = { w: (b, p) => n.word(b, p), y, h, T: y(TOP) };

  const from = n.beat("rapid-in").from;
  const downAt = n.word("rapid-in", "Eleven down");
  const linersAt = n.word("rapid-in", "one-liners");
  const nextAt = n.word("next", "Next");
  const end = n.beat("next").from;

  const items: RapidItem[] = [
    { n: 12, label: "Finding duplicate rows", beat: "r-dupes", body: <Dupes c={c} /> },
    { n: 13, label: "A CTE or a subquery", beat: "r-cte", body: <Cte c={c} /> },
    { n: 14, label: <><QMono>UNION</QMono> or <QMono>UNION ALL</QMono></>, beat: "r-union", body: <Union c={c} /> },
    { n: 15, label: <><QMono>LAG</QMono> and <QMono>LEAD</QMono></>, beat: "r-lag", body: <Lag c={c} /> },
    { n: 16, label: "A running total", beat: "r-running", body: <Running c={c} /> },
    { n: 17, label: "Pivoting", beat: "r-pivot", body: <Pivot c={c} /> },
    { n: 18, label: "The four joins", beat: "r-joins", body: <Joins c={c} /> },
    { n: 19, label: <QMono>NTILE</QMono>, beat: "r-ntile", body: <Ntile c={c} /> },
    { n: 20, label: <><QMono>PERCENT_RANK</QMono>, <QMono>CUME_DIST</QMono></>, beat: "r-percent", body: <Percent c={c} /> },
    { n: 21, label: <QMono>COALESCE</QMono>, beat: "r-coalesce", body: <Coalesce c={c} /> },
    { n: 22, label: <QMono>CROSS JOIN</QMono>, beat: "r-cross" },
  ].map(({ beat, ...item }) => ({ ...item, at: n.beat(beat).from }));
  const crossAt = n.beat("r-cross").from;

  return (
    <AbsoluteFill>
      <Sfx name="el-whoosh" at={from} level={-34} />
      {items.map((item) => (
        <Sfx key={item.n} name="el-tap" at={item.at} level={-34} />
      ))}
      <Sfx name="el-chime" at={end} level={-34} />

      <Drift from={from} to={n.beat("next").to + 40} scale={0.015}>
        <Kicker at={from}>Questions 12 to 22</Kicker>
        <Headline lead="The other eleven," turn="one-liners." at={downAt - 4} turnAt={linersAt - 2} size={64} />
        <Spot id="da-sql-stopwatch" video="da-sql" at={from + 6} left={1640} top={y(112)} width={130} height={140} />

        <RapidFire items={items} x={X0} top={y(LIST_TOP)} rowH={h(ROW)} width={560} at={linersAt} end={end} />

        {/* The last answer stays up through the bridge. */}
        <Fade from={crossAt - 6}>
          <Cross c={c} />
        </Fade>

        <Spot id="de-sql-patterns-koala" at={nextAt - 20} left={1500} top={y(560)} width={300} height={301} />
        <NextLine at={nextAt} x={R_X} y={y(850)} width={1000}>
          SQL performance
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

