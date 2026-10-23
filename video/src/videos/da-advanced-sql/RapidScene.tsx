import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QMono, RapidFire, type RapidItem } from "../../editorial/interview";
import { type Layout, useLayout } from "../../editorial/layout";
import { BLUE_INK, INK, INK_SOFT, TABULAR, label, note } from "../../editorial/style";
import { NextLine, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { RAPID } from "./data";
import {
  colsOf,
  DataTable,
  Drift,
  ErrorBox,
  geoOf,
  Headline,
  Kicker,
  Listing,
  listingHeight,
  MARK_OK,
  rowsAt,
  Spot,
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
const under = (c: Ctx, lines: number) => c.T + listingHeight(lines, SIZE) + c.h(18);

// ── 13. LAG and LEAD ────────────────────────────────────────────────────────

const Lag: React.FC<{ c: Ctx }> = ({ c }) => {
  const at = c.w("r-lag", "Lag reads a value");
  const changeAt = c.w("r-lag", "Day over day change");
  const t = { cols: RAPID.lag.cols, rows: RAPID.lag.rows.slice(0, 4) };
  const g = geo(c, t, R_X, under(c, RAPID.lag.lines.length));
  const prev = t.cols.indexOf("prev_day");
  const ch = t.cols.indexOf("change");
  return (
    <>
      <Listing lines={RAPID.lag.lines} x={R_X} top={c.T} width={680} size={SIZE} at={at - 4} marks={[{ line: 2, at: changeAt }]} />
      <DataTable
        g={g}
        cols={colsOf(t, { prev_day: { ink: BLUE_INK }, change: { ink: BLUE_INK } })}
        at={at + 2}
        rows={rowsAt(t.rows, at + 6)}
        marks={[
          ...t.rows.map((_, row) => ({ row, col: prev, at: at + 14 + row * 3 })),
          ...t.rows.map((_, row) => ({ row, col: ch, at: changeAt + 6 + row * 3, color: MARK_OK })),
        ]}
      />
      <Note at={at + 20} x={g.right + 24} y={g.rowTop(0)}>
        <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>nothing before day 1</span>
      </Note>
    </>
  );
};

// ── 14. NTILE ───────────────────────────────────────────────────────────────

const Ntile: React.FC<{ c: Ctx }> = ({ c }) => {
  const at = c.w("r-ntile", "N tile splits");
  const fourAt = c.w("r-ntile", "four quartiles of six");
  const fiveAt = c.w("r-ntile", "Split them five ways");
  const extraAt = c.w("r-ntile", "an extra row");
  const top = under(c, RAPID.quartiles.lines.length) + c.h(60);
  const q = RAPID.quartileSizes;
  const f = RAPID.fifthSizes;
  const qg = geo(c, q, R_X, top);
  const fg = geo(c, f, R_X + 380, top);
  const extra = f.rows.flatMap((r, i) => (r[1] === f.rows[0][1] && r[1] !== f.rows[f.rows.length - 1][1] ? [i] : []));
  return (
    <>
      <Listing lines={RAPID.quartiles.lines} x={R_X} top={c.T} width={720} size={SIZE} at={at - 4} marks={[{ line: 1, at: at + 8 }]} />
      <Note at={fourAt - 4} x={R_X} y={top - c.h(36)}>
        <span style={{ ...label(21, INK), whiteSpace: "nowrap" }}>
          <QMono>NTILE(4)</QMono>, 24 customers
        </span>
      </Note>
      <DataTable g={qg} cols={colsOf(q)} at={fourAt - 2} rows={rowsAt(q.rows, fourAt + 2)} />
      <Note at={fiveAt - 4} x={R_X + 380} y={top - c.h(36)}>
        <span style={{ ...label(21, INK), whiteSpace: "nowrap" }}>
          <QMono>NTILE(5)</QMono>
        </span>
      </Note>
      <DataTable
        g={fg}
        cols={colsOf(f)}
        at={fiveAt - 2}
        rows={rowsAt(f.rows, fiveAt + 2)}
        marks={extra.map((row, k) => ({ row, col: 1, at: extraAt + k * 3, color: MARK_OK }))}
      />
    </>
  );
};

// ── 15. A window function in WHERE ──────────────────────────────────────────

const Where: React.FC<{ c: Ctx }> = ({ c }) => {
  const at = c.w("r-where", "Can a window function go in where");
  const noAt = c.w("r-where", "DuckDB refuses");
  const outerAt = c.w("r-where", "Filter in an outer query");
  const e = RAPID.inWhere;
  const errTop = under(c, e.lines.length);
  return (
    <>
      <Listing lines={e.lines} x={R_X} top={c.T} width={700} size={SIZE} at={at - 4} marks={[{ line: 2, at: at + 12 }]} />
      <ErrorBox x={R_X} top={errTop} width={700} at={noAt - 4} kind={e.kind} message={e.message} size={21} />
      <Note at={outerAt - 2} x={R_X} y={errTop + c.h(100)}>
        <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>
          windows run after <QMono>WHERE</QMono>: filter outside, or with <QMono>QUALIFY</QMono>
        </span>
      </Note>
    </>
  );
};

// ── 16. Recursive CTEs ──────────────────────────────────────────────────────

const Recursive: React.FC<{ c: Ctx }> = ({ c }) => {
  const at = c.w("r-recursive", "A recursive CTE");
  const anchorAt = c.w("r-recursive", "anchor rows");
  const backAt = c.w("r-recursive", "joining back on itself");
  const levelsAt = c.w("r-recursive", "walks an org chart");
  const L = RAPID.levels;
  const g = geo(c, L, R_X + 660, c.T);
  return (
    <>
      <Listing
        lines={RAPID.org.lines}
        x={R_X}
        top={c.T}
        width={620}
        size={17}
        at={at - 4}
        marks={[
          { line: 3, at: anchorAt },
          { line: 7, at: backAt },
        ]}
      />
      <DataTable g={g} cols={colsOf(L)} at={levelsAt - 4} rows={rowsAt(L.rows, levelsAt, 3)} />
      <Note at={levelsAt + 6} x={R_X + 660} y={g.rowTop(L.rows.length) + c.h(16)}>
        <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap", ...TABULAR }}>CEO down, {L.rows.length} levels</span>
      </Note>
    </>
  );
};

// ── 17. Bucketing timestamps ────────────────────────────────────────────────

const Bucket: React.FC<{ c: Ctx }> = ({ c }) => {
  const at = c.w("r-bucket", "Date trunc snaps");
  const weeksAt = c.w("r-bucket", "January's twenty-four days");
  const W = RAPID.weeks;
  const g = geo(c, W, R_X + 620, c.T);
  return (
    <>
      <Listing lines={W.lines} x={R_X} top={c.T} width={580} size={SIZE} at={at - 4} marks={[{ line: 0, at: at + 10 }]} />
      <DataTable g={g} cols={colsOf(W)} at={weeksAt - 4} rows={rowsAt(W.rows, weeksAt, 3)} />
    </>
  );
};

// ── 18, 19. Pivot and unpivot ───────────────────────────────────────────────

const Pivot: React.FC<{ c: Ctx }> = ({ c }) => {
  const at = c.w("r-pivot", "To pivot");
  const sideAt = c.w("r-pivot", "one row per region");
  const P = RAPID.pivot;
  const g = geo(c, P, R_X + 760, c.T);
  return (
    <>
      <Listing
        lines={P.lines}
        x={R_X}
        top={c.T}
        width={740}
        size={SIZE}
        at={at - 4}
        marks={[
          { line: 2, at: at + 12 },
          { line: 3, at: at + 18 },
        ]}
      />
      <DataTable g={g} cols={colsOf(P)} at={sideAt - 4} rows={rowsAt(P.rows, sideAt)} />
    </>
  );
};

/** The statement's last four lines: the union over `wide`, the pivot above. */
const UNPIVOT_FROM = 6;

const Unpivot: React.FC<{ c: Ctx }> = ({ c }) => {
  const at = c.w("r-unpivot", "To unpivot");
  const longAt = c.w("r-unpivot", "one select per column");
  const U = RAPID.unpivot;
  const lines = U.lines.slice(UNPIVOT_FROM);
  const g = geo(c, U, R_X, under(c, lines.length), 36);
  return (
    <>
      <Listing lines={lines} x={R_X} top={c.T} width={760} size={SIZE} at={at - 4} marks={[{ line: 1, at: at + 10 }]} />
      <Note at={at + 4} x={R_X + 780} y={c.T + 8}>
        <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>
          <QMono>wide</QMono>: the pivot
        </span>
      </Note>
      <DataTable g={g} cols={colsOf(U)} at={longAt} rows={rowsAt(U.rows, longAt + 4, 1)} />
    </>
  );
};

// ── 20. PERCENT_RANK and CUME_DIST ──────────────────────────────────────────

const Percent: React.FC<{ c: Ctx }> = ({ c }) => {
  const at = c.w("r-percent", "percent rank runs from zero");
  const cumeAt = c.w("r-percent", "Cume dist is the share");
  const neverAt = c.w("r-percent", "never reaches zero");
  const S = RAPID.standing;
  const g = geo(c, S, R_X, under(c, S.lines.length));
  const pr = S.cols.indexOf("pct_rank");
  const cd = S.cols.indexOf("cume_dist");
  const lastRow = S.rows.length - 1;
  return (
    <>
      <Listing lines={S.lines} x={R_X} top={c.T} width={720} size={SIZE} at={at - 6} />
      <DataTable
        g={g}
        cols={colsOf(S, { pct_rank: { ink: BLUE_INK }, cume_dist: { ink: BLUE_INK } })}
        at={at - 2}
        rows={rowsAt(S.rows, at + 2)}
        marks={[
          { row: 0, col: pr, at: at + 10 },
          { row: lastRow, col: pr, at: at + 18 },
          { row: 0, col: cd, at: neverAt, color: MARK_OK },
        ]}
      />
      <Note at={cumeAt} x={g.right + 24} y={g.rowTop(0)}>
        <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>the share at or below</span>
      </Note>
    </>
  );
};

/**
 * The quick round, questions 13 to 20: the same numbered list as the other
 * parts, in this part's own words ("Eight more, at speed"), each answer ran
 * in DuckDB on the page's tables.
 */
export const RapidScene: React.FC = () => {
  const n = useNarration();
  const { y, h } = useLayout();
  const c: Ctx = { w: (b, p) => n.word(b, p), y, h, T: y(TOP) };

  const from = n.beat("rapid-in").from;
  const heavyAt = n.word("rapid-in", "heavy lifting done");
  const eightAt = n.word("rapid-in", "Eight more");
  const nextAt = n.word("next", "Next", { nth: 2 });
  const end = n.beat("next").from;

  const items: RapidItem[] = [
    { n: 13, label: <><QMono>LAG</QMono> and <QMono>LEAD</QMono></>, beat: "r-lag", body: <Lag c={c} /> },
    { n: 14, label: <QMono>NTILE</QMono>, beat: "r-ntile", body: <Ntile c={c} /> },
    { n: 15, label: <>A window in <QMono>WHERE</QMono></>, beat: "r-where", body: <Where c={c} /> },
    { n: 16, label: "Recursive CTEs", beat: "r-recursive", body: <Recursive c={c} /> },
    { n: 17, label: "Bucketing timestamps", beat: "r-bucket", body: <Bucket c={c} /> },
    { n: 18, label: "Pivoting", beat: "r-pivot", body: <Pivot c={c} /> },
    { n: 19, label: "Unpivoting", beat: "r-unpivot", body: <Unpivot c={c} /> },
    { n: 20, label: <><QMono>PERCENT_RANK</QMono>, <QMono>CUME_DIST</QMono></>, beat: "r-percent", body: <Percent c={c} /> },
  ].map(({ beat, ...item }) => ({ ...item, at: n.beat(beat).from }));
  const lastAt = n.beat("r-percent").from;

  return (
    <AbsoluteFill>
      <Sfx name="el-whoosh" at={from} level={-34} />
      {items.map((item) => (
        <Sfx key={item.n} name="el-tap" at={item.at} level={-34} />
      ))}
      <Sfx name="el-chime" at={end} level={-34} />

      <Drift from={from} to={n.beat("next").to + 40} scale={0.015}>
        <Kicker at={from}>Questions 13 to 20</Kicker>
        <Headline lead="Eight more," turn="at speed." at={heavyAt - 4} turnAt={eightAt + 6} size={64} />
        <Spot id="da-sql-stopwatch" video="da-sql" at={from + 6} left={1640} top={y(112)} width={130} height={140} />

        {/* The last answer stays up through the bridge, so its body sits outside the list. */}
        <RapidFire
          items={items.map((it) => (it.n === 20 ? { ...it, body: undefined } : it))}
          x={X0}
          top={y(LIST_TOP)}
          rowH={h(ROW)}
          width={540}
          at={eightAt}
          end={end}
        />
        <Fade from={lastAt - 6}>
          <Percent c={c} />
        </Fade>

        <NextLine at={nextAt} x={R_X} y={y(850)} width={1000}>
          Excel and spreadsheets
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
