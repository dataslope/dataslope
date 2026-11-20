import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ease, pop } from "../../components/motion";
import { Entity, Relation, useEntityLayout, type EntityColumn } from "../../editorial/erd";
import { RapidFire, type RapidItem } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { BLUE_INK, INK, INK_SOFT, label, note } from "../../editorial/style";
import { badgeStyle, ColumnRule, Note, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { MONO } from "../../theme/fonts";
import { ADDITIVE, RAPID, type Table } from "./data";
import { Caption, colsOf, DataTable, Drift, geoOf, Headline, Kicker, MARK, MARK_KEY, MARK_OK, Mono, OK_INK, SERIES, TableName, Verdict, type CellSwap } from "./parts";
import { LIST_W, LIST_X, Q, R_X, ROW, RULE_X, type Ctx } from "./rapid";

const ROWS = { headH: 40, rowH: 40, bodySize: 22, headSize: 20 } as const;
const LIST_TOP = 300;

/** Rows of a table whose first column matches `value`. */
const where = (t: Table, col: string, value: string): Table => {
  const j = t.cols.indexOf(col);
  return { cols: t.cols, rows: t.rows.filter((r) => r[j] === value) };
};

// ── 10. The three types of fact tables ─────────────────────────────────────

const Types: React.FC<{ c: Ctx }> = ({ c }) => {
  const txAt = c.w("r-types", "Transaction: one row per event");
  const depositAt = c.w("r-types", "like a deposit");
  const periodicAt = c.w("r-types", "Periodic snapshot: one row per entity per period");
  const monthAt = c.w("r-types", "like a month-end balance");
  const accAt = c.w("r-types", "Accumulating snapshot: one row per process");
  const loanAt = c.w("r-types", "like a loan application");
  const placeAt = c.w("r-types", "updated in place");
  const milestoneAt = c.w("r-types", "as each milestone lands");
  const T = { cols: RAPID.transactions.cols, rows: RAPID.transactions.rows.slice(0, 3) };
  const tg = geoOf(T, R_X, c.top + c.h(40), c.h, ROWS);
  const B = { cols: ADDITIVE.balance.cols, rows: ADDITIVE.balance.rows.slice(0, 2) };
  const bg = geoOf(B, R_X, tg.rowTop(T.rows.length) + c.h(84), c.h, ROWS);
  const L = RAPID.loan;
  const approved = L.cols.indexOf("approved");
  const funded = L.cols.indexOf("funded");
  // The row as it was first written: approval and funding not yet landed.
  const first = L.rows.map((r) => r.map((v, j) => (j === approved || j === funded ? "null" : v)));
  const lg = geoOf({ cols: L.cols, rows: first }, R_X, bg.rowTop(B.rows.length) + c.h(84), c.h, { ...ROWS, extra: L.rows });
  const swaps: CellSwap[] = [
    { row: 0, col: approved, at: placeAt + 4, value: L.rows[0][approved] },
    { row: 0, col: funded, at: milestoneAt + 4, value: L.rows[0][funded] },
  ];
  const [days1, days2] = RAPID.loanStages.rows[0];
  const deposit = T.rows.findIndex((r) => Number(r[2]) > 0);
  return (
    <>
      <TableName g={tg} at={txAt}>
        Transaction: one row per event
      </TableName>
      <DataTable
        g={tg}
        cols={colsOf(T)}
        at={txAt}
        rows={T.rows.map((cells, i) => ({ cells, at: txAt + 4 + i * 3 }))}
        marks={[{ row: deposit, col: 2, at: depositAt + 2 }]}
      />
      <TableName g={bg} at={periodicAt}>
        Periodic snapshot: one row per account per month
      </TableName>
      <DataTable
        g={bg}
        cols={colsOf(B)}
        at={periodicAt}
        rows={B.rows.map((cells, i) => ({ cells, at: periodicAt + 4 + i * 3 }))}
        marks={B.rows.map((_, row) => ({ row, col: 2, at: monthAt + 2 + row * 3 }))}
      />
      <TableName g={lg} at={accAt}>
        Accumulating snapshot: one row per application
      </TableName>
      <DataTable g={lg} cols={colsOf(L)} at={accAt} rows={first.map((cells) => ({ cells, at: loanAt }))} swaps={swaps} />
      <Note at={milestoneAt + 12} x={R_X} y={lg.rowTop(1) + c.h(18)}>
        <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>
          Approved after <Num>{days1}</Num> days, funded <Num>{days2}</Num> days later: the same row
        </span>
      </Note>
    </>
  );
};

// ── 11. Periodic snapshot or transaction fact ───────────────────────────────

const Periodic: React.FC<{ c: Ctx }> = ({ c }) => {
  const stoodAt = c.w("r-periodic", "where things stood");
  const benAt = c.w("r-periodic", "Ben made no transaction in February");
  const balAt = c.w("r-periodic", "his February balance");
  const rowAt = c.w("r-periodic", "is still a row");
  const T = where(RAPID.transactions, "account", "Ben");
  const B = where(ADDITIVE.balance, "account", "Ben");
  const opts = { headH: 40, rowH: 42, bodySize: 21, headSize: 19 } as const;
  const tg = geoOf(T, R_X, c.top + c.h(40), c.h, opts);
  const bg = geoOf(B, tg.right + 50, c.top + c.h(40), c.h, opts);
  const feb = B.rows.findIndex((r) => r[0].startsWith("2024-02"));
  const [txns, balance] = RAPID.benFebruary.rows[0];
  return (
    <>
      <TableName g={tg} at={benAt - 6}>
        Ben&apos;s transactions
      </TableName>
      <DataTable g={tg} cols={colsOf(T)} at={benAt - 6} rows={T.rows.map((cells, i) => ({ cells, at: benAt - 2 + i * 4 }))} />
      <TableName g={bg} at={stoodAt}>
        Ben&apos;s month-ends
      </TableName>
      <DataTable
        g={bg}
        cols={colsOf(B)}
        at={stoodAt}
        rows={B.rows.map((cells, i) => ({ cells, at: stoodAt + 4 + i * 3 }))}
        marks={[{ row: feb, col: 2, at: balAt + 2 }]}
      />
      <Verdict at={benAt + 6} x={R_X} y={bg.rowTop(B.rows.length) + c.h(50)} label="Ben's transactions in February" value={txns} size={25} />
      <Verdict at={rowAt} x={R_X} y={bg.rowTop(B.rows.length) + c.h(102)} label="His February balance, still a row" value={balance} tone="ok" size={25} />
    </>
  );
};

// ── 12. Factless fact table ─────────────────────────────────────────────────

const COVERAGE: EntityColumn[] = [
  { name: "date_sk", key: "FK" },
  { name: "store_sk", key: "FK" },
  { name: "product_sk", key: "FK" },
];

const Factless: React.FC<{ c: Ctx }> = ({ c }) => {
  const keysAt = c.w("r-factless", "Keys and no measures");
  const whichAt = c.w("r-factless", "which products were on promotion");
  const countAt = c.w("r-factless", "Count rows to answer it");
  const askedAt = c.w("r-factless", "count what's asked");
  const threeAt = c.w("r-factless", "promoted three products last week");
  const elevenAt = c.w("r-factless", "in eleven rows");
  const e = useEntityLayout({ x: R_X, y: c.top + c.h(40), width: 380, name: "fact_promotion_coverage", columns: COVERAGE });
  const S = RAPID.factlessByProduct;
  const sg = geoOf(S, e.right + 80, c.top + c.h(40), c.h, ROWS);
  const days = S.rows.map((r) => r[1]);
  const vTop = e.bottom + c.h(70);
  return (
    <>
      <Entity layout={e} at={keysAt - 2} rowGap={3} />
      <Note at={keysAt + 6} x={e.left} y={e.bottom + c.h(16)}>
        <span style={{ ...note(23, INK_SOFT), whiteSpace: "nowrap" }}>Keys only, no measure</span>
      </Note>
      <TableName g={sg} at={whichAt}>
        Store 5, first week of 2024
      </TableName>
      <DataTable g={sg} cols={colsOf(S)} at={whichAt} rows={S.rows.map((cells, i) => ({ cells, at: whichAt + 4 + i * 3 }))} />
      <Note at={elevenAt} x={sg.x} y={sg.rowTop(S.rows.length) + c.h(16)}>
        <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>
          {days.map((d, i) => (
            <React.Fragment key={i}>
              {i ? " + " : ""}
              <Num>{d}</Num>
            </React.Fragment>
          ))}{" "}
          = <Num>{RAPID.factlessPage.rows[0][0]}</Num> rows
        </span>
      </Note>
      <Verdict at={countAt} x={R_X} y={vTop} label={<Mono>COUNT(*)</Mono>} value={RAPID.factlessPage.rows[0][0]} tone="bad" size={25} />
      <Verdict at={askedAt} x={R_X} y={vTop + c.h(54)} label={<Mono>COUNT(DISTINCT product_sk)</Mono>} value={RAPID.factlessDistinct.rows[0][0]} tone="ok" size={25} />
      <Note at={threeAt} x={R_X} y={vTop + c.h(116)}>
        <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
          <span style={{ color: OK_INK, fontWeight: 500 }}>
            <Num>{RAPID.factlessDistinct.rows[0][0]}</Num> products
          </span>{" "}
          promoted, in <Num>{RAPID.factlessPage.rows[0][0]}</Num> rows
        </span>
      </Note>
    </>
  );
};

// ── 13. Degenerate dimension ────────────────────────────────────────────────

const Degenerate: React.FC<{ c: Ctx }> = ({ c }) => {
  const keyAt = c.w("r-degen", "A key with no table behind it");
  const numberAt = c.w("r-degen", "like an order number");
  const nothingAt = c.w("r-degen", "It has nothing to describe");
  const groupAt = c.w("r-degen", "you still group by it");
  const L = RAPID.degenerateLines;
  const lg = geoOf(L, R_X, c.top + c.h(40), c.h, ROWS);
  const D = RAPID.degenerate;
  const dg = geoOf(D, R_X, lg.rowTop(L.rows.length) + c.h(130), c.h, ROWS);
  return (
    <>
      <TableName g={lg} at={keyAt}>
        <Mono>fact_order_lines</Mono>
      </TableName>
      <DataTable
        g={lg}
        cols={colsOf(L)}
        at={keyAt}
        rows={L.rows.map((cells, i) => ({ cells, at: keyAt + 4 + i * 3 }))}
        marks={L.rows.map((_, row) => ({ row, col: 0, at: numberAt + 4 + row * 2 }))}
      />
      <Note at={nothingAt} x={R_X} y={lg.rowTop(L.rows.length) + c.h(20)}>
        <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>
          <Mono>order_number</Mono>: nothing to describe, no <Mono>dim_order</Mono>
        </span>
      </Note>
      <TableName g={dg} at={groupAt - 4}>
        Grouped by it, no join
      </TableName>
      <DataTable g={dg} cols={colsOf(D)} at={groupAt - 4} rows={D.rows.map((cells, i) => ({ cells, at: groupAt + i * 3 }))} />
    </>
  );
};

// ── 14. Junk dimension ──────────────────────────────────────────────────────

const Junk: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const smallAt = c.w("r-junk", "Small flags");
  const flagAt = [c.w("r-junk", "is promo"), c.w("r-junk", "is gift wrap"), c.w("r-junk", "is expedited")];
  const everyAt = c.w("r-junk", "one table of every combination");
  const eightAt = c.w("r-junk", "eight rows");
  const oneAt = c.w("r-junk", "one key on the fact instead of three flags");
  const J = RAPID.junk;
  const flags = J.cols.slice(1);
  const jg = geoOf(J, R_X, c.top + c.h(110), c.h, { headH: 40, rowH: 36, bodySize: 21, headSize: 19 });
  return (
    <>
      <Caption at={smallAt} x={R_X} y={c.top}>
        Three flags on the fact
      </Caption>
      <div style={{ position: "absolute", left: R_X, top: c.top + c.h(36), display: "flex", gap: 14, fontSize: 22 }}>
        {flags.map((f, i) => {
          const p = Math.min(1, pop(frame, flagAt[i], fps, 14));
          return (
            <span key={f} style={{ ...badgeStyle("gray", 22), fontFamily: MONO, fontWeight: 500, opacity: p, transform: `scale(${0.8 + 0.2 * p})` }}>
              {f}
            </span>
          );
        })}
      </div>
      <TableName g={jg} at={everyAt}>
        <Mono>dim_junk</Mono>, every combination
      </TableName>
      <DataTable
        g={jg}
        cols={colsOf(J)}
        at={everyAt}
        rows={J.rows.map((cells, i) => ({ cells, at: everyAt + 2 + i * 2 }))}
        marks={J.rows.map((_, row) => ({ row, col: 0, at: oneAt + 4, color: MARK_KEY }))}
      />
      <Note at={eightAt} x={jg.right + 40} y={jg.rowTop(0)}>
        <span style={{ ...note(25, BLUE_INK), fontWeight: 500, whiteSpace: "nowrap" }}>
          <Num>{RAPID.junk.rows.length}</Num> rows
        </span>
      </Note>
      <Note at={oneAt} x={jg.right + 40} y={jg.rowTop(2)}>
        <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
          The fact keeps one key,
          <br />
          <Mono>flags_sk</Mono>, not three flags
        </span>
      </Note>
    </>
  );
};

// ── 15. Date dimension ──────────────────────────────────────────────────────

const DateDim: React.FC<{ c: Ctx }> = ({ c }) => {
  const dayAt = c.w("r-date", "One row per day");
  const yearAt = c.w("r-date", "three hundred sixty-six for 2024");
  const worked = [c.w("r-date", "with year"), c.w("r-date", "quarter"), c.w("r-date", "month,"), c.w("r-date", "week"), c.w("r-date", "and weekend")];
  const onceAt = c.w("r-date", "worked out once");
  const noFnAt = c.w("r-date", "the ones no function knows");
  const holidayAt = c.w("r-date", "holidays");
  const fiscalAt = c.w("r-date", "the fiscal calendar");
  const R = RAPID.dateRow;
  const T: Table = { cols: ["column", "value"], rows: R.cols.map((col, j) => [col, R.rows[0][j]]) };
  const tg = geoOf(T, R_X, c.top + c.h(40), c.h, { headH: 38, rowH: 34, bodySize: 21, headSize: 19 });
  const at = (col: string) => T.rows.findIndex((r) => r[0] === col);
  const workedCols = ["year", "quarter", "month", "week_of_year", "is_weekend"];
  const [days] = RAPID.dateCount.rows[0];
  const NOTE_X = tg.right + 70;
  return (
    <>
      <TableName g={tg} at={dayAt}>
        <Mono>dim_date</Mono>, its row for {R.rows[0][R.cols.indexOf("full_date")]}
      </TableName>
      <DataTable
        g={tg}
        cols={colsOf(T)}
        at={dayAt}
        rows={T.rows.map((cells, i) => ({ cells, at: dayAt + 4 + i }))}
        marks={[
          ...workedCols.map((col, k) => ({ row: at(col), col: 1, at: worked[k] + 2, out: noFnAt, color: MARK_OK })),
          { row: at("is_holiday"), col: 1, at: holidayAt + 2, color: MARK },
        ]}
      />
      <Note at={yearAt} x={NOTE_X} y={tg.top}>
        <span style={{ ...note(25, BLUE_INK), fontWeight: 500, whiteSpace: "nowrap" }}>
          <Num>{days}</Num> rows for 2024
        </span>
      </Note>
      <Note at={onceAt} x={NOTE_X} y={tg.top + c.h(52)}>
        <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>Worked out once, not in every query</span>
      </Note>
      <Note at={noFnAt} x={NOTE_X} y={tg.rowTop(at("is_holiday")) - c.h(70)}>
        <span style={{ ...label(22, INK_SOFT), fontWeight: 500, whiteSpace: "nowrap" }}>What no date function knows</span>
      </Note>
      <Note at={holidayAt} x={NOTE_X} y={tg.rowTop(at("is_holiday")) - c.h(30)}>
        <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>
          <Mono>is_holiday</Mono>, from the business&apos;s list
        </span>
      </Note>
      <Note at={fiscalAt} x={NOTE_X} y={tg.rowTop(at("is_holiday")) + c.h(14)}>
        <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>
          <Mono>fiscal_year</Mono>, <Mono>fiscal_quarter</Mono>
        </span>
      </Note>
    </>
  );
};

// ── 16. Conformed dimension ─────────────────────────────────────────────────

const Conformed: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const oneAt = c.w("r-conformed", "One dimension shared by several facts");
  const keysAt = c.w("r-conformed", "the same keys");
  const meaningsAt = c.w("r-conformed", "the same meanings");
  const lineAt = c.w("r-conformed", "so their numbers line up");
  const W = 230;
  const GAP = 140;
  const top = c.top + c.h(140);
  const sales = useEntityLayout({ x: R_X, y: top, width: W, name: "fact_sales", columns: [] });
  const date = useEntityLayout({ x: R_X + W + GAP, y: top, width: W, name: "dim_date", columns: [] });
  const returns = useEntityLayout({ x: R_X + 2 * (W + GAP), y: top, width: W, name: "fact_returns", columns: [] });
  return (
    <>
      <Entity layout={date} at={oneAt} />
      <Entity layout={sales} at={oneAt + 8} />
      <Entity layout={returns} at={oneAt + 14} />
      <Relation name="sales" points={[date.anchor("left"), sales.anchor("right")]} from="exactly-one" to="zero-or-many" at={oneAt + 10} />
      <Relation name="returns" points={[date.anchor("right"), returns.anchor("left")]} from="exactly-one" to="zero-or-many" at={oneAt + 16} />
      <Note at={keysAt} x={date.left} y={date.bottom + c.h(30)}>
        <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
          Same <Mono>date_sk</Mono> in both
          <span style={{ opacity: ease(frame, meaningsAt, 10) }}>, same meaning</span>
        </span>
      </Note>
      <Note at={lineAt} x={date.left} y={date.bottom + c.h(76)}>
        <span style={{ ...note(25, OK_INK), fontWeight: 500, whiteSpace: "nowrap" }}>So their numbers line up</span>
      </Note>
    </>
  );
};

/**
 * The rapid round, page one: questions 10 to 16, each read aloud and shown
 * as its row, with the answer's key fact on the right while it is current.
 * The three fact types as three tables (the loan's row updated in place);
 * Ben's February, no transaction and a 500.00 balance; the coverage fact's
 * eleven rows against three products; the order number grouped with no
 * table behind it; the eight-row junk dimension; the date dimension's row
 * for July 4, 2024, is_holiday lit; and dim_date between two facts.
 */
export const RapidOneScene: React.FC = () => {
  const n = useNarration();
  const { y, h } = useLayout();
  const c: Ctx = { w: (b, p, o) => n.word(b, p, o), y, h, top: y(LIST_TOP) };

  const from = n.beat("rapid-in").from;
  const thirteenAt = n.word("rapid-in", "Thirteen quick ones");
  const eachAt = n.word("rapid-in", "a sentence or two each");
  const end = n.beat("r-conformed").to + 30;

  const items: RapidItem[] = [
    { n: 10, label: <Q>What are the three types of fact tables?</Q>, beat: "r-types", body: <Types c={c} /> },
    { n: 11, label: <Q>When would you choose a periodic snapshot over a transaction fact?</Q>, beat: "r-periodic", body: <Periodic c={c} /> },
    { n: 12, label: <Q>What is a factless fact table?</Q>, beat: "r-factless", body: <Factless c={c} /> },
    { n: 13, label: <Q>What is a degenerate dimension?</Q>, beat: "r-degen", body: <Degenerate c={c} /> },
    { n: 14, label: <Q>What is a junk dimension?</Q>, beat: "r-junk", body: <Junk c={c} /> },
    { n: 15, label: <Q>What is the purpose of a date dimension, and what columns does it typically include?</Q>, beat: "r-date", body: <DateDim c={c} /> },
    { n: 16, label: <Q>What is a conformed dimension?</Q>, beat: "r-conformed", body: <Conformed c={c} /> },
  ].map(({ beat, ...item }) => ({ ...item, at: n.beat(beat).from }));

  return (
    <AbsoluteFill>
      <Sfx name="el-whoosh" at={from} level={-35} />
      {items.map((item) => (
        <Sfx key={item.n} name="el-tap" at={item.at} level={-33} />
      ))}

      <Drift from={from} to={end + 40} scale={0.01}>
        <Kicker at={from - 6}>{SERIES} · Questions 10 to 22, quick</Kicker>
        <Headline lead="Thirteen quick ones," turn="a sentence or two each." at={thirteenAt - 4} turnAt={eachAt - 2} size={60} />
        <RapidFire items={items} x={LIST_X} top={y(LIST_TOP)} rowH={h(ROW)} width={LIST_W} at={eachAt + 4} end={end} />
        <ColumnRule x={RULE_X} top={y(LIST_TOP)} height={items.length * h(ROW)} at={items[0].at - 4} />
      </Drift>
    </AbsoluteFill>
  );
};
