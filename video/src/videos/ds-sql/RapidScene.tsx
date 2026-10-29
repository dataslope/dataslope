import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QMono, RapidFire, type RapidItem } from "../../editorial/interview";
import { type Layout, useLayout } from "../../editorial/layout";
import { BLUE_INK, INK, INK_SOFT, TABULAR, note } from "../../editorial/style";
import { NextLine, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { RAPID } from "./data";
import { colsOf, DataTable, Drift, ErrorBox, geoOf, Headline, Kicker, lineOf, Listing, listingHeight, MARK_OK, rowsAt, Spot, X0 } from "./parts";

/** Where the answers go: right of the list. */
const R_X = 740;
const TOP = 320;
const LIST_TOP = 300;
const ROW = 46;
const SIZE = 18;

type Ctx = { w: (beat: string, phrase: string) => number; y: Layout["y"]; h: Layout["h"]; T: number };

/** A result in the round's compact rows. */
const geo = (c: Ctx, t: { cols: readonly string[]; rows: readonly (readonly string[])[] }, x: number, top: number, rowH = 42) =>
  geoOf(t, x, top, c.h, { headH: 42, rowH, bodySize: 22, headSize: 20 });

/** Below a listing of `lines` lines. */
const under = (c: Ctx, lines: number) => c.T + listingHeight(lines, SIZE) + c.h(18);

/** The first rows of a result. */
const head = (t: { cols: string[]; rows: string[][] }, k: number) => ({ cols: t.cols, rows: t.rows.slice(0, k) });

// ── 7. WHERE and HAVING ─────────────────────────────────────────────────────

const Having: React.FC<{ c: Ctx }> = ({ c }) => {
  const at = c.w("r-having", "Where filters rows");
  const groupsAt = c.w("r-having", "having filters groups after");
  const countAt = c.w("r-having", "Put count in where");
  const noAt = c.w("r-having", "DuckDB refuses");
  const e = RAPID.inWhere;
  return (
    <>
      <Listing
        lines={RAPID.having.lines}
        x={R_X}
        top={c.T}
        width={720}
        size={SIZE}
        at={at - 4}
        out={countAt}
        marks={[
          { line: 2, at: at + 6 },
          { line: 4, at: groupsAt + 2 },
        ]}
      />
      <Listing lines={e.lines} x={R_X} top={c.T} width={720} size={SIZE} at={countAt + 2} marks={[{ line: 2, at: countAt + 8 }]} />
      <ErrorBox x={R_X} top={under(c, e.lines.length)} width={720} at={noAt - 2} kind={e.kind} message={e.message} size={21} />
    </>
  );
};

// ── 8. Window functions and GROUP BY ────────────────────────────────────────

const Window: React.FC<{ c: Ctx }> = ({ c }) => {
  const at = c.w("r-window", "Group by turns");
  const fourAt = c.w("r-window", "four region totals");
  const keepsAt = c.w("r-window", "A window function keeps all");
  const besideAt = c.w("r-window", "writes the total beside each one");
  const G = RAPID.grouped;
  const W = head(RAPID.windowed, 6);
  const gg = geo(c, G, R_X, c.T + c.h(40));
  const wg = geo(c, W, R_X + 360, c.T + c.h(40));
  const total = W.cols.indexOf("region_total");
  return (
    <>
      <Note at={at} x={R_X} y={c.T}>
        <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>
          <QMono>GROUP BY</QMono>: {RAPID.sales} rows in, {G.rows.length} out
        </span>
      </Note>
      <DataTable g={gg} cols={colsOf(G)} at={fourAt - 4} rows={rowsAt(G.rows, fourAt, 3)} dim={keepsAt} />
      <Note at={keepsAt} x={R_X + 360} y={c.T}>
        <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>
          <QMono>OVER (PARTITION BY region)</QMono>: all {RAPID.sales} kept
        </span>
      </Note>
      <DataTable
        g={wg}
        cols={colsOf(W, { region_total: { ink: BLUE_INK } })}
        at={keepsAt + 2}
        rows={rowsAt(W.rows, keepsAt + 4, 2)}
        marks={W.rows.map((_, row) => ({ row, col: total, at: besideAt + 2 + row * 2, color: MARK_OK }))}
      />
      <Note at={keepsAt + 18} x={R_X + 360} y={wg.rowTop(W.rows.length) + c.h(10)}>
        <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap", ...TABULAR }}>…and {RAPID.sales - W.rows.length} more rows</span>
      </Note>
    </>
  );
};

// ── 9. ROW_NUMBER, RANK, DENSE_RANK ─────────────────────────────────────────

const Rank: React.FC<{ c: Ctx }> = ({ c }) => {
  const at = c.w("r-rank", "On a tie");
  const rnAt = c.w("r-rank", "row number still counts");
  const rankAt = c.w("r-rank", "Rank shares and then skips");
  const denseAt = c.w("r-rank", "Dense rank shares without the gap");
  const R = RAPID.ranks;
  const g = geo(c, R, R_X, under(c, R.lines.length));
  const points = R.cols.indexOf("points");
  const ties = R.rows.flatMap((r, i) => (R.rows.filter((s) => s[points] === r[points]).length > 1 ? [i] : []));
  const col = (name: string) => R.cols.indexOf(name);
  const last = R.rows.length - 1;
  return (
    <>
      <Listing lines={R.lines} x={R_X} top={c.T} width={780} size={SIZE} at={at - 6} />
      <DataTable
        g={g}
        cols={colsOf(R, { row_number: { at: rnAt, ink: BLUE_INK }, rank: { at: rankAt, ink: BLUE_INK }, dense_rank: { at: denseAt, ink: BLUE_INK } })}
        at={at - 2}
        rows={rowsAt(R.rows, at + 2)}
        bands={ties.map((row, k) => ({ row, at: at + 10 + k * 2 }))}
        marks={[
          { row: last, col: col("rank"), at: rankAt + 18 },
          { row: last, col: col("dense_rank"), at: denseAt + 10, color: MARK_OK },
        ]}
      />
    </>
  );
};

// ── 10. Day-over-day change ─────────────────────────────────────────────────

const Dod: React.FC<{ c: Ctx }> = ({ c }) => {
  const at = c.w("r-dod", "For a day-over-day change");
  const lagAt = c.w("r-dod", "lag puts yesterday's amount");
  const subAt = c.w("r-dod", "you subtract");
  const D = head(RAPID.dod, 4);
  const g = geo(c, D, R_X, under(c, RAPID.dod.lines.length));
  const ch = D.cols.indexOf("dod_change");
  return (
    <>
      <Listing lines={RAPID.dod.lines} x={R_X} top={c.T} width={680} size={SIZE} at={at - 4} marks={[{ line: 1, at: lagAt + 2 }]} />
      <DataTable
        g={g}
        cols={colsOf(D, { dod_change: { ink: BLUE_INK } })}
        at={at + 2}
        rows={rowsAt(D.rows, at + 6)}
        marks={D.rows.map((_, row) => ({ row, col: ch, at: subAt + 2 + row * 3, color: MARK_OK }))}
      />
    </>
  );
};

// ── 11. Top N per group ─────────────────────────────────────────────────────

const TopN: React.FC<{ c: Ctx }> = ({ c }) => {
  const at = c.w("r-topn", "For the top N per group");
  const numberAt = c.w("r-topn", "number the rows inside each region");
  const keepAt = c.w("r-topn", "keep row numbers two or lower");
  const T = RAPID.topN;
  const g = geo(c, T, R_X + 590, c.T, 40);
  return (
    <>
      <Listing
        lines={T.lines}
        x={R_X}
        top={c.T}
        width={570}
        size={SIZE}
        at={at - 4}
        marks={[
          { line: 2, at: numberAt + 2 },
          { line: 7, at: keepAt + 2, color: MARK_OK },
        ]}
      />
      <DataTable g={g} cols={colsOf(T, { rn: { ink: BLUE_INK } })} at={numberAt} rows={rowsAt(T.rows, numberAt + 4, 2)} />
    </>
  );
};

// ── 12. A running total ─────────────────────────────────────────────────────

const Running: React.FC<{ c: Ctx }> = ({ c }) => {
  const at = c.w("r-running", "A running total is an ordered sum");
  const nums = [c.w("r-running", "one hundred"), c.w("r-running", "three fifty"), c.w("r-running", "four twenty-five"), c.w("r-running", "six oh five")];
  const R = head(RAPID.running, 4);
  const g = geo(c, R, R_X, under(c, RAPID.running.lines.length));
  const rt = R.cols.indexOf("running_total");
  return (
    <>
      <Listing lines={RAPID.running.lines} x={R_X} top={c.T} width={680} size={SIZE} at={at - 4} marks={[{ line: lineOf(RAPID.running.lines, "SUM(amount)"), at: at + 8 }]} />
      <DataTable
        g={g}
        cols={colsOf(R, { running_total: { ink: BLUE_INK } })}
        at={at}
        rows={rowsAt(R.rows, at + 4)}
        marks={nums.map((t, row) => ({ row, col: rt, at: t, color: MARK_OK }))}
      />
    </>
  );
};

// ── 13. The latest row per key ──────────────────────────────────────────────

const Latest: React.FC<{ c: Ctx }> = ({ c }) => {
  const at = c.w("r-latest", "To keep the latest row per key");
  const newestAt = c.w("r-latest", "newest first");
  const oneAt = c.w("r-latest", "keep row one");
  const twelveAt = c.w("r-latest", "twelve customers, twelve rows");
  const L = head(RAPID.latest, 4);
  const g = geo(c, L, R_X, under(c, RAPID.latest.lines.length));
  return (
    <>
      <Listing
        lines={RAPID.latest.lines}
        x={R_X}
        top={c.T}
        width={720}
        size={SIZE}
        at={at - 4}
        marks={[
          { line: lineOf(RAPID.latest.lines, "ORDER BY order_date DESC"), at: newestAt },
          { line: lineOf(RAPID.latest.lines, "WHERE rn = 1"), at: oneAt, color: MARK_OK },
        ]}
      />
      <DataTable g={g} cols={colsOf(L)} at={oneAt - 2} rows={rowsAt(L.rows, oneAt + 2)} />
      <Note at={twelveAt} x={g.right + 24} y={g.rowTop(0)}>
        <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap", ...TABULAR }}>
          {RAPID.customers} customers,
          <br />
          {RAPID.latest.rows.length} rows
        </span>
      </Note>
    </>
  );
};

// ── 14. Pivoting ────────────────────────────────────────────────────────────

const Pivot: React.FC<{ c: Ctx }> = ({ c }) => {
  const at = c.w("r-pivot", "Pivoting is conditional aggregation");
  const mobileAt = c.w("r-pivot", "when the device is mobile");
  const desktopAt = c.w("r-pivot", "another for desktop");
  const regionAt = c.w("r-pivot", "grouped by region");
  const P = RAPID.pivot;
  const g = geo(c, P, R_X, under(c, P.lines.length));
  return (
    <>
      <Listing
        lines={P.lines}
        x={R_X}
        top={c.T}
        width={840}
        size={SIZE}
        at={at - 4}
        marks={[
          { line: 2, at: mobileAt },
          { line: 3, at: desktopAt },
          { line: 5, at: regionAt },
        ]}
      />
      <DataTable g={g} cols={colsOf(P, { mobile: { ink: BLUE_INK }, desktop: { ink: BLUE_INK } })} at={desktopAt + 4} rows={rowsAt(P.rows, regionAt)} />
      <Note at={desktopAt + 6} x={g.right + 24} y={g.rowTop(0)}>
        <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>
          the video&rsquo;s own
          <br />
          traffic table
        </span>
      </Note>
    </>
  );
};

// ── 15. COUNT three ways ────────────────────────────────────────────────────

const Count: React.FC<{ c: Ctx }> = ({ c }) => {
  const at = c.w("r-count", "And count star counts rows");
  const colAt = c.w("r-count", "count of a column skips its nulls");
  const distinctAt = c.w("r-count", "count distinct counts unique values");
  const eightAt = c.w("r-count", "eight views");
  const reachAt = c.w("r-count", "That's volume against reach");
  const C = RAPID.counts;
  const g = geo(c, C, R_X, under(c, C.lines.length));
  return (
    <>
      <Listing
        lines={C.lines}
        x={R_X}
        top={c.T}
        width={680}
        size={SIZE}
        at={at - 4}
        marks={[
          { line: 1, at: at + 6 },
          { line: 2, at: colAt + 2 },
          { line: 3, at: distinctAt + 2 },
        ]}
      />
      <DataTable g={g} cols={colsOf(C)} at={eightAt - 4} rows={rowsAt(C.rows, eightAt)} marks={[0, 1, 2].map((col) => ({ row: 0, col, at: eightAt + 4 + col * 6, color: MARK_OK }))} />
      <Note at={reachAt} x={R_X} y={g.rowTop(1) + c.h(16)}>
        <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>volume against reach</span>
      </Note>
      <Note at={eightAt} x={g.right + 24} y={g.rowTop(0)}>
        <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>
          the video&rsquo;s own
          <br />8 page views
        </span>
      </Note>
    </>
  );
};

/**
 * The quick round, questions 7 to 15, numbered on screen only, in this
 * video's own words ("back to back"); every answer ran in DuckDB, on the
 * page's tables where the page has one.
 */
export const RapidScene: React.FC = () => {
  const n = useNarration();
  const { y, h } = useLayout();
  const c: Ctx = { w: (b, p) => n.word(b, p), y, h, T: y(TOP) };

  const from = n.beat("rapid-in").from;
  const nineAt = n.word("rapid-in", "The remaining nine");
  const backAt = n.word("rapid-in", "back to back");
  const nextAt = n.word("next", "Next");
  const end = n.beat("next").from;

  const items: RapidItem[] = [
    { n: 7, label: <><QMono>WHERE</QMono> or <QMono>HAVING</QMono></>, beat: "r-having", body: <Having c={c} /> },
    { n: 8, label: <>Window or <QMono>GROUP BY</QMono></>, beat: "r-window", body: <Window c={c} /> },
    { n: 9, label: <><QMono>ROW_NUMBER</QMono>, <QMono>RANK</QMono>, <QMono>DENSE_RANK</QMono></>, beat: "r-rank", body: <Rank c={c} /> },
    { n: 10, label: "Day-over-day change", beat: "r-dod", body: <Dod c={c} /> },
    { n: 11, label: "Top N per group", beat: "r-topn", body: <TopN c={c} /> },
    { n: 12, label: "A running total", beat: "r-running", body: <Running c={c} /> },
    { n: 13, label: "The latest row per key", beat: "r-latest", body: <Latest c={c} /> },
    { n: 14, label: "Pivoting", beat: "r-pivot", body: <Pivot c={c} /> },
    { n: 15, label: <><QMono>COUNT</QMono>, three ways</>, beat: "r-count", body: <Count c={c} /> },
  ].map(({ beat, ...item }) => ({ ...item, at: n.beat(beat).from }));
  const lastAt = n.beat("r-count").from;

  return (
    <AbsoluteFill>
      <Sfx name="el-whoosh" at={from} level={-34} />
      {items.map((item) => (
        <Sfx key={item.n} name="el-tap" at={item.at} level={-34} />
      ))}
      <Sfx name="el-chime" at={end} level={-34} />

      <Drift from={from} to={n.beat("next").to + 40} scale={0.015}>
        <Kicker at={from}>Questions 7 to 15</Kicker>
        <Headline lead="Nine everyday patterns," turn="back to back." at={nineAt - 4} turnAt={backAt} size={64} />
        <Spot id="da-sql-stopwatch" video="da-sql" at={from + 6} left={1640} top={y(112)} width={130} height={140} />

        {/* The last answer stays up through the bridge, so its body sits outside the list. */}
        <RapidFire
          items={items.map((it) => (it.n === 15 ? { ...it, body: undefined } : it))}
          x={X0}
          top={y(LIST_TOP)}
          rowH={h(ROW)}
          width={560}
          at={nineAt}
          end={end}
        />
        <Fade from={lastAt - 6}>
          <Count c={c} />
        </Fade>

        <Spot id="ds-sql-seal" at={nextAt - 20} left={1380} top={y(560)} width={420} height={290} />
        <NextLine at={nextAt} x={R_X} y={y(850)} width={1000}>
          LLM evaluation
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

