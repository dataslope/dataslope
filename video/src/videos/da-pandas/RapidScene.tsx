import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QMono, RapidFire, type RapidItem } from "../../editorial/interview";
import { type Layout, useLayout } from "../../editorial/layout";
import { BAR, INK, INK_SOFT, TABULAR, fmt, label, note } from "../../editorial/style";
import { NextLine, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { RAPID } from "./data";
import {
  colsOf,
  Console,
  consoleHeight,
  DataTable,
  Drift,
  geoOf,
  Headline,
  Kicker,
  Listing,
  listingHeight,
  MARK_BAD,
  MARK_OK,
  Spot,
  X0,
} from "./parts";

/** Where the answers go: right of the list. */
const R_X = 720;
const TOP = 310;
const LIST_TOP = 300;
const ROW = 46;
const SIZE = 22;

type Ctx = { w: (beat: string, phrase: string) => number; y: Layout["y"]; h: Layout["h"]; T: number };

/** A table at (x, top) in the round's compact rows. */
const geo = (c: Ctx, t: { cols: readonly string[]; rows: readonly (readonly string[])[] }, x: number, top: number, rowH = 50) =>
  geoOf(t, x, top, c.h, { headH: 46, rowH, bodySize: 24 });

/** Rows inking in one after another from `at`. */
const rowsAt = (rows: readonly (readonly string[])[], at: number, step = 2) => rows.map((cells, i) => ({ cells, at: at + i * step }));

// ── 18. Categorical ─────────────────────────────────────────────────────────

const Categorical: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const at = c.w("r-cat", "A categorical");
  const onceAt = c.w("r-cat", "each distinct string once");
  const regionsAt = c.w("r-cat", "Three hundred regions");
  const afterAt = c.w("r-cat", "four hundred eighteen");
  const { convert, before, after } = RAPID.categorical;
  const listH = listingHeight(convert.length, SIZE);
  const barTop = c.T + listH + consoleHeight(1) + c.h(90);
  const full = 720;
  const bars = [
    { text: "as strings", bytes: before, at: regionsAt + 4, color: INK_SOFT },
    { text: "as a category", bytes: after, at: afterAt, color: BAR },
  ];
  return (
    <>
      <Listing lines={convert} x={R_X} top={c.T} width={760} size={SIZE} at={at - 4} />
      <Console lines={["['East', 'North', 'South', 'West']"]} x={R_X} top={c.T + listH + c.h(12)} width={520} at={onceAt - 2} />
      {bars.map((b, i) => {
        const p = ease(frame, b.at, 16);
        const top = barTop + i * c.h(70);
        return (
          <React.Fragment key={b.text}>
            <div style={{ position: "absolute", left: R_X, top, width: 200, ...label(21, INK), opacity: ease(frame, b.at - 4, 8) }}>{b.text}</div>
            <div
              style={{
                position: "absolute",
                left: R_X + 200,
                top: top - 2,
                width: Math.max(4, (full * b.bytes) / before) * p,
                height: c.h(30),
                background: b.color,
                borderRadius: 2,
              }}
            />
            <div
              style={{
                position: "absolute",
                left: R_X + 200 + Math.max(4, (full * b.bytes) / before) + 16,
                top: top - 2,
                ...note(24, INK),
                ...TABULAR,
                whiteSpace: "nowrap",
                opacity: ease(frame, b.at + 8, 8),
              }}
            >
              {fmt(b.bytes, 0)} bytes
            </div>
          </React.Fragment>
        );
      })}
    </>
  );
};

// ── 19. Sorting and ranking ─────────────────────────────────────────────────

const Sorting: React.FC<{ c: Ctx }> = ({ c }) => {
  const at = c.w("r-sort", "Sort values");
  const rankAt = c.w("r-sort", "Rank numbers");
  const denseAt = c.w("r-sort", "dense leaves no gaps");
  const lineH = listingHeight(1, SIZE);
  const tablesTop = c.T + 2 * lineH + c.h(56);
  const sg = geo(c, RAPID.sorted, R_X, tablesTop);
  const rg = geo(c, RAPID.ranked, R_X + 420, tablesTop);
  return (
    <>
      <Listing lines={RAPID.sorted.lines} x={R_X} top={c.T} width={1000} size={SIZE} at={at - 4} />
      <Listing lines={RAPID.ranked.lines} x={R_X} top={c.T + lineH + c.h(12)} width={1000} size={SIZE} at={rankAt - 4} />
      <DataTable g={sg} cols={colsOf(RAPID.sorted)} at={at + 4} rows={rowsAt(RAPID.sorted.rows, at + 8)} />
      <DataTable
        g={rg}
        cols={colsOf(RAPID.ranked, { rank: { at: rankAt + 4 } })}
        at={rankAt}
        rows={rowsAt(RAPID.ranked.rows, rankAt + 2)}
        marks={RAPID.ranked.rows.map((_, i) => ({ row: i, col: 3, at: denseAt + i * 3 }))}
      />
    </>
  );
};

// ── 20. value_counts ────────────────────────────────────────────────────────

const Counts: React.FC<{ c: Ctx }> = ({ c }) => {
  const at = c.w("r-counts", "Value counts");
  const normAt = c.w("r-counts", "Normalize");
  const halfAt = c.w("r-counts", "North is half");
  const lineH = listingHeight(1, SIZE);
  const tablesTop = c.T + 2 * lineH + c.h(56);
  const cg = geo(c, RAPID.counts, R_X, tablesTop);
  const sg = geo(c, RAPID.shares, R_X + 380, tablesTop);
  const north = RAPID.shares.rows.findIndex((r) => r[0] === "North");
  return (
    <>
      <Listing lines={RAPID.counts.lines} x={R_X} top={c.T} width={760} size={SIZE} at={at - 4} />
      <Listing lines={RAPID.shares.lines} x={R_X} top={c.T + lineH + c.h(12)} width={760} size={SIZE} at={normAt - 4} />
      <DataTable g={cg} cols={colsOf(RAPID.counts)} at={at + 4} rows={rowsAt(RAPID.counts.rows, at + 8)} />
      <DataTable
        g={sg}
        cols={colsOf(RAPID.shares)}
        at={normAt + 4}
        rows={rowsAt(RAPID.shares.rows, normAt + 8)}
        marks={[{ row: north, col: 1, at: halfAt }]}
      />
    </>
  );
};

// ── 21. Datetimes ───────────────────────────────────────────────────────────

const Dates: React.FC<{ c: Ctx }> = ({ c }) => {
  const at = c.w("r-dates", "To datetime");
  const dtAt = c.w("r-dates", "the D T accessor");
  const yearAt = c.w("r-dates", "the year");
  const monthAt = c.w("r-dates", "the month");
  const dayAt = c.w("r-dates", "the day's name");
  const lineH = listingHeight(1, SIZE);
  const partsH = listingHeight(RAPID.parts.lines.length, 20);
  const pg = geo(c, RAPID.parts, R_X, c.T + lineH + c.h(10) + partsH + c.h(30), 44);
  const colAt = [at, at, at, yearAt, monthAt, dayAt];
  return (
    <>
      <Listing lines={RAPID.parsed.slice(0, 1)} x={R_X} top={c.T} width={760} size={SIZE} at={at - 4} />
      <Listing lines={RAPID.parts.lines} x={R_X} top={c.T + lineH + c.h(10)} width={760} size={20} at={dtAt - 4} />
      <DataTable
        g={pg}
        cols={colsOf(RAPID.parts, Object.fromEntries(RAPID.parts.cols.map((name, j) => [name, { at: colAt[j] + 2 }])))}
        at={at + 4}
        rows={rowsAt(RAPID.parts.rows, at + 6)}
      />
    </>
  );
};

// ── 22. resample ────────────────────────────────────────────────────────────

const Resample: React.FC<{ c: Ctx }> = ({ c }) => {
  const at = c.w("r-resample", "Resample is");
  const janAt = c.w("r-resample", "January sums");
  const lineH = listingHeight(1, SIZE);
  const mg = geo(c, RAPID.monthly, R_X, c.T + lineH + c.h(30));
  return (
    <>
      <Listing lines={RAPID.monthly.lines} x={R_X} top={c.T} width={760} size={SIZE} at={at - 4} />
      <DataTable g={mg} cols={colsOf(RAPID.monthly)} at={at + 4} rows={rowsAt(RAPID.monthly.rows, at + 8, 4)} marks={[{ row: 0, col: 1, at: janAt + 4 }]} />
      <Note at={at + 10} x={mg.right + 30} y={mg.rowTop(0) + c.h(6)}>
        <span style={{ ...note(24, INK_SOFT), whiteSpace: "nowrap" }}>each label is a month&apos;s end</span>
      </Note>
    </>
  );
};

// ── 23. Method chaining ─────────────────────────────────────────────────────

const Chain: React.FC<{ c: Ctx }> = ({ c }) => {
  const at = c.w("r-chain", "Method chaining");
  const steps = ["query", "assign", "group", "sum", "rename"].map((word) => c.w("r-chain", word));
  const noTempAt = c.w("r-chain", "No temporary variables");
  const lines = RAPID.chain.lines;
  const stepLine = [".query", ".assign", ".groupby", ".sum", ".rename"].map((m) => lines.findIndex((l) => l.trim().startsWith(m)));
  const rg = geo(c, RAPID.chain, R_X + 700, c.T + c.h(40));
  return (
    <>
      <Listing lines={lines} x={R_X} top={c.T} width={640} size={20} at={at - 4} marks={stepLine.map((line, i) => ({ line, at: steps[i] }))} />
      <DataTable g={rg} cols={colsOf(RAPID.chain)} at={noTempAt - 6} rows={rowsAt(RAPID.chain.rows, noTempAt - 2, 3)} />
    </>
  );
};

// ── 24. Duplicates ──────────────────────────────────────────────────────────

const Duplicates: React.FC<{ c: Ctx }> = ({ c }) => {
  const at = c.w("r-dupes", "Duplicated flags");
  const twoAt = c.w("r-dupes", "two here");
  const dropAt = c.w("r-dupes", "Drop duplicates");
  const firstAt = c.w("r-dupes", "keeps the first");
  const D = RAPID.duplicates;
  const fg = geo(c, D.frame, R_X, c.T);
  const listX = R_X + 470;
  const lineH = listingHeight(1, SIZE);
  const cg = geo(c, D.clean, listX, c.T + lineH + c.h(12) + consoleHeight(1) + c.h(20) + lineH + c.h(30));
  const repeats = D.frame.rows.flatMap((r, i) => (D.frame.rows.slice(0, i).some((s) => s[1] === r[1]) ? [i] : []));
  return (
    <>
      <DataTable
        g={fg}
        cols={colsOf(D.frame)}
        at={at - 6}
        rows={rowsAt(D.frame.rows, at - 2)}
        bands={repeats.map((row, k) => ({ row, at: twoAt + k * 4, color: MARK_BAD }))}
      />
      <Listing lines={D.countLines} x={listX} top={c.T} width={620} size={SIZE} at={at} />
      <Console lines={[String(D.count)]} x={listX} top={c.T + lineH + c.h(12)} width={100} at={twoAt - 2} />
      <Listing
        lines={D.clean.lines}
        x={listX}
        top={c.T + lineH + c.h(12) + consoleHeight(1) + c.h(20)}
        width={640}
        size={20}
        at={dropAt - 4}
      />
      <DataTable g={cg} cols={colsOf(D.clean)} at={firstAt - 4} rows={rowsAt(D.clean.rows, firstAt)} />
    </>
  );
};

// ── 25. Renaming ────────────────────────────────────────────────────────────

const Rename: React.FC<{ c: Ctx }> = ({ c }) => {
  const at = c.w("r-rename", "Rename takes");
  const newAt = c.w("r-rename", "new ones");
  const listH = listingHeight(RAPID.rename.lines.length, SIZE);
  return (
    <>
      <Console lines={[RAPID.rename.before]} x={R_X} top={c.T} width={420} at={at - 6} />
      <Listing lines={RAPID.rename.lines} x={R_X} top={c.T + consoleHeight(1) + c.h(24)} width={1000} size={SIZE} at={at} />
      <Console lines={[RAPID.rename.after]} x={R_X} top={c.T + consoleHeight(1) + c.h(36) + listH} width={460} at={newAt - 2} marks={[{ line: 0, at: newAt + 6, color: MARK_OK }]} />
    </>
  );
};

// ── 26. Selecting by dtype ──────────────────────────────────────────────────

const Dtypes: React.FC<{ c: Ctx }> = ({ c }) => {
  const at = c.w("r-dtypes", "Select D types");
  const numberAt = c.w("r-dtypes", "Number gives");
  const lineH = listingHeight(1, SIZE);
  return (
    <>
      <Listing lines={RAPID.dtypes.lines} x={R_X} top={c.T} width={820} size={SIZE} at={at - 4} />
      <Console lines={[RAPID.dtypes.value]} x={R_X} top={c.T + lineH + c.h(12)} width={300} at={numberAt - 2} marks={[{ line: 0, at: numberAt + 6 }]} />
    </>
  );
};

// ── 27. A CASE-like column ──────────────────────────────────────────────────

const Case: React.FC<{ c: Ctx }> = ({ c }) => {
  const at = c.w("r-case", "For a CASE");
  const whereAt = c.w("r-case", "NumPy where");
  const selectAt = c.w("r-case", "NumPy select");
  const winsAt = c.w("r-case", "first true condition wins");
  const lines = RAPID.case.lines;
  const listH = listingHeight(lines.length, SIZE);
  const tg = geo(c, RAPID.case, R_X, c.T + listH + c.h(30), 44);
  const selectLine = lines.findIndex((l) => l.includes("np.select"));
  return (
    <>
      <Listing lines={lines} x={R_X} top={c.T} width={1000} size={SIZE} at={at - 2} marks={[{ line: selectLine, at: selectAt + 6 }]} />
      <Note at={whereAt - 2} x={R_X + 700} y={c.T + listH + c.h(40)}>
        <span style={{ ...note(24, INK_SOFT), whiteSpace: "nowrap" }}>
          one condition: <QMono>np.where</QMono>
        </span>
      </Note>
      <DataTable
        g={tg}
        cols={colsOf(RAPID.case, { size: { at: selectAt + 8 } })}
        at={selectAt + 2}
        rows={rowsAt(RAPID.case.rows, selectAt + 4)}
        marks={RAPID.case.rows.map((_, i) => ({ row: i, col: 2, at: winsAt + i * 3 }))}
      />
    </>
  );
};

// ── 28. CSV and Excel ───────────────────────────────────────────────────────

const Csv: React.FC<{ c: Ctx }> = ({ c }) => {
  const at = c.w("r-csv", "Read CSV");
  const indexAt = c.w("r-csv", "index equals false");
  const unnamedAt = c.w("r-csv", "an unnamed column");
  const excelAt = c.w("r-csv", "Excel works");
  const { withIndex, readBack, withoutIndex } = RAPID.csv;
  const textLines = (t: string) => t.replace(/\n$/, "").split("\n");
  const lineH = listingHeight(1, SIZE);
  const firstOut = textLines(withIndex.text);
  const rg = geo(c, readBack, R_X + 520, c.T + lineH + c.h(12));
  const secondTop = c.T + lineH + c.h(12) + consoleHeight(firstOut.length) + c.h(40);
  const unnamed = readBack.cols.findIndex((col) => col.startsWith("Unnamed"));
  return (
    <>
      <Listing lines={withIndex.lines} x={R_X} top={c.T} width={760} size={SIZE} at={at - 4} />
      <Console lines={firstOut} x={R_X} top={c.T + lineH + c.h(12)} width={300} at={at + 4} marks={[{ line: 0, at: unnamedAt - 4, color: MARK_BAD }]} />
      <DataTable
        g={rg}
        cols={colsOf(readBack, { [readBack.cols[unnamed]]: { at: unnamedAt - 6 } })}
        at={unnamedAt - 10}
        rows={rowsAt(readBack.rows, unnamedAt - 8)}
        marks={readBack.rows.map((_, i) => ({ row: i, col: unnamed, at: unnamedAt + 2, color: MARK_BAD }))}
      />
      <Listing lines={withoutIndex.lines} x={R_X} top={secondTop} width={860} size={SIZE} at={indexAt - 2} marks={[{ line: 0, at: indexAt + 8, color: MARK_OK }]} />
      <Console lines={textLines(withoutIndex.text)} x={R_X} top={secondTop + lineH + c.h(12)} width={300} at={indexAt + 6} />
      <Note at={excelAt - 2} x={R_X + 340} y={secondTop + lineH + c.h(40)}>
        <span style={{ ...note(24, INK_SOFT), whiteSpace: "nowrap" }}>
          Excel: <QMono>read_excel</QMono>, <QMono>to_excel</QMono>
        </span>
      </Note>
    </>
  );
};

// ── 29. query ───────────────────────────────────────────────────────────────

const Query: React.FC<{ c: Ctx }> = ({ c }) => {
  const at = c.w("r-query", "Query filters");
  const atSignAt = c.w("r-query", "an at sign");
  const lines = RAPID.query.lines;
  const listH = listingHeight(lines.length, SIZE);
  const qg = geo(c, RAPID.query, R_X, c.T + listH + c.h(30));
  return (
    <>
      <Listing lines={lines} x={R_X} top={c.T} width={760} size={SIZE} at={at - 4} marks={[{ line: lines.length - 1, at: atSignAt }]} />
      <DataTable g={qg} cols={colsOf(RAPID.query)} at={at + 6} rows={rowsAt(RAPID.query.rows, at + 10)} />
    </>
  );
};

// ── 30. Shape, dtypes and memory ────────────────────────────────────────────

const Shape: React.FC<{ c: Ctx }> = ({ c }) => {
  const shapeAt = c.w("r-shape", "shape gives");
  const typesAt = c.w("r-shape", "D types gives");
  const bytesAt = c.w("r-shape", "memory usage");
  const S = RAPID.shape;
  const lineH = listingHeight(1, SIZE);
  const outH = consoleHeight(1);
  const rowTop = (k: number) => c.T + k * (lineH + c.h(8));
  const dg = geo(c, S.dtypes, R_X + 560, c.T, 44);
  return (
    <>
      <Listing lines={S.shapeLines} x={R_X} top={rowTop(0)} width={300} size={SIZE} at={shapeAt - 4} />
      <Console lines={[S.shape]} x={R_X + 320} top={rowTop(0) + (lineH - outH) / 2} width={160} at={shapeAt + 6} />
      <Listing lines={S.dtypesLines} x={R_X} top={rowTop(1)} width={300} size={SIZE} at={typesAt - 4} />
      <DataTable g={dg} cols={colsOf(S.dtypes)} at={typesAt + 2} rows={rowsAt(S.dtypes.rows, typesAt + 6, 3)} />
      <Listing lines={S.memoryLines} x={R_X} top={rowTop(3)} width={560} size={SIZE} at={bytesAt - 4} />
      <Console lines={[`${S.memory}`]} x={R_X} top={rowTop(3) + lineH + c.h(10)} width={120} at={bytesAt + 8} />
    </>
  );
};

/**
 * The rapid-fire round, questions 18 to 30, as in Part 1: the numbered list on
 * the left, ticked as the round goes, and each answer on the right, every
 * frame and listing as pandas ran it.
 */
export const RapidScene: React.FC = () => {
  const n = useNarration();
  const { y, h } = useLayout();
  const c: Ctx = { w: (b, p) => n.word(b, p), y, h, T: y(TOP) };

  const from = n.beat("rapid-in").from;
  const thirteenAt = n.word("rapid-in", "thirteen questions");
  const eachAt = n.word("rapid-in", "one answer each");
  const nextAt = n.word("next", "Next");
  const end = n.beat("next").from;

  const items: RapidItem[] = [
    { n: 18, label: "Categorical dtype", beat: "r-cat", body: <Categorical c={c} /> },
    { n: 19, label: "Sorting and ranking", beat: "r-sort", body: <Sorting c={c} /> },
    { n: 20, label: <QMono>value_counts</QMono>, beat: "r-counts", body: <Counts c={c} /> },
    { n: 21, label: "Datetimes", beat: "r-dates", body: <Dates c={c} /> },
    { n: 22, label: <QMono>resample</QMono>, beat: "r-resample", body: <Resample c={c} /> },
    { n: 23, label: "Method chaining", beat: "r-chain", body: <Chain c={c} /> },
    { n: 24, label: "Dropping duplicates", beat: "r-dupes", body: <Duplicates c={c} /> },
    { n: 25, label: "Renaming columns", beat: "r-rename", body: <Rename c={c} /> },
    { n: 26, label: "Selecting by dtype", beat: "r-dtypes", body: <Dtypes c={c} /> },
    { n: 27, label: <>A <QMono>CASE</QMono>-like column</>, beat: "r-case", body: <Case c={c} /> },
    { n: 28, label: "CSV and Excel", beat: "r-csv", body: <Csv c={c} /> },
    { n: 29, label: <QMono>query</QMono>, beat: "r-query", body: <Query c={c} /> },
    { n: 30, label: "Shape, dtypes, memory", beat: "r-shape", body: <Shape c={c} /> },
  ].map(({ beat, ...item }) => ({ ...item, at: n.beat(beat).from }));
  const lastAt = n.beat("r-shape").from;

  return (
    <AbsoluteFill>
      <Sfx name="el-whoosh" at={from} level={-34} />
      {items.map((item) => (
        <Sfx key={item.n} name="el-tap" at={item.at} level={-34} />
      ))}
      <Sfx name="el-chime" at={end} level={-34} />

      <Drift from={from} to={n.beat("next").to + 40} scale={0.015}>
        <Kicker at={from}>Questions 18 to 30</Kicker>
        <Headline lead="Thirteen questions," turn="one answer each." at={thirteenAt - 6} turnAt={eachAt - 4} size={64} />
        <Spot id="da-sql-stopwatch" video="da-sql" at={from + 6} left={1640} top={y(112)} width={130} height={140} />

        {/* The last answer stays up through the bridge, so its body sits outside the list. */}
        <RapidFire items={items.map((it) => (it.n === 30 ? { ...it, body: undefined } : it))} x={X0} top={y(LIST_TOP)} rowH={ROW} width={500} at={eachAt} end={end} />
        <Fade from={lastAt - 6}>
          <Shape c={c} />
        </Fade>

        <NextLine at={nextAt} x={R_X} y={y(860)} width={1000}>
          statistics and communication
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
