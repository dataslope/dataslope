import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QMono, QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { BLUE_INK, INK, INK_SOFT, label, note } from "../../editorial/style";
import { Note, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { MONO } from "../../theme/fonts";
import { FILES, MB, QUERY, TABLE } from "./data";
import { colsOf, COLUMN_TINT, DataTable, Drift, FileBar, geoOf, lineOf, Listing, PARQUET_SEGMENTS, ReadMark, rowsAt, segmentOf, X0 } from "./parts";

const TOP = 300;
/** One stored value, in a strip. */
const CW = 55;
const CELL = 51;
/** The gap between one record (or one column) and the next in a strip. */
const SEP = 16;
const ROW_STRIP = 628;
const COL_STRIP = 760;
const STRIP_H = 48;
const RIGHT_X = 1000;
const BAR_X = 720;
const BAR_W = 1050;

/**
 * Questions 1 and 2. The made-up table's first four sales, then the same 24
 * values laid out the two ways storage can lay them: by row (each sale's six
 * fields together, OLTP) and by column (every sale ID, then every date, OLAP).
 * One order is one place in the row store; one column is one place in the
 * column store and scattered through the row store. Then the page's query:
 * the three columns it names are three blocks of the column store and all of
 * the row store, which is what DuckDB read from the two files.
 */
export const RowsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("rows").from;
  const qAt = n.word("rows", "Question one");
  const qTextAt = n.word("rows", "What is OLTP");
  const qEnd = n.beat("rows").to;
  const oltpAt = n.word("rows-oltp", "OLTP, online transaction processing");
  const smallAt = n.word("rows-oltp", "many small reads and writes");
  const oneAtATime = n.word("rows-oltp", "one order at a time");
  const rowStoreAt = n.word("rows-oltp", "So it stores each row's fields together");
  const onePlaceAt = n.word("rows-oltp", "one order, one place");
  const olapAt = n.word("rows-olap", "OLAP, online analytical processing");
  const fewAt = n.word("rows-olap", "a few columns across millions of rows");
  const colStoreAt = n.word("rows-olap", "So it stores each column together");
  const idAt = n.word("rows-olap", "every sale ID");
  const dateAt = n.word("rows-olap", "then every date");
  const soOnAt = n.word("rows-olap", "and so on");
  const q2At = n.word("cols", "Question two");
  const q2TextAt = n.word("cols", "Why is columnar storage");
  const namesAt = n.word("cols", "A query reads only the columns it names");
  const threeAt = n.word("cols", "names three of six");
  const catAt = n.word("cols", "category");
  const unitsAt = n.word("cols", "units and amount");
  const amountAt = n.word("cols", "amount");
  const fiveAt = n.word("cols-read", "read only five");
  const nineAt = n.word("cols-read", "nine point four megabytes");
  const mixesAt = n.word("cols-read", "A row format mixes those three fields");
  const wholeAt = n.word("cols-read", "the CSV was read whole");
  const typeAt = n.word("cols-more", "Values of one type, side by side");
  const batchAt = n.word("cols-more", "run in batches");
  const end = n.beat("cols-more").to;

  const sample = TABLE.sample;
  const cols = sample.cols;
  const g = geoOf(sample, X0, y(TOP), h, { rowH: 44, bodySize: 23 });
  const ORDER = 2; // the third sale: one order
  const colIndex = (name: string) => cols.indexOf(name);
  const AMOUNT = colIndex("amount");
  const READ_COLS = ["category", "units", "amount"];

  // Where a value sits in each strip.
  const rowX = (r: number, c: number) => X0 + r * (cols.length * CW + SEP) + c * CW;
  const colX = (r: number, c: number) => X0 + c * (sample.rows.length * CW + SEP) + r * CW;
  const rowY = y(ROW_STRIP);
  const colY = y(COL_STRIP);
  const sh = h(STRIP_H);

  // Each column block of the column store lands on its word.
  const groupAt = (c: number) => (c === 0 ? idAt : c === 1 ? dateAt : soOnAt + (c - 2) * 4);

  const cell = (x: number, top: number, c: number, at: number, key: string) => {
    const p = ease(frame, at, 10);
    if (p <= 0) return null;
    return (
      <div
        key={key}
        style={{
          position: "absolute",
          left: x,
          top: top + (1 - p) * 10,
          width: CELL,
          height: sh,
          borderRadius: 3,
          background: COLUMN_TINT[cols[c]],
          boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${INK} 20%, transparent)`,
          opacity: p,
        }}
      />
    );
  };

  const pqW = (BAR_W * FILES.parquet) / FILES.csv;
  const read = segmentOf(READ_COLS);

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={qEnd - 6} level={-36} />
      <Sfx name="el-sprinkle" at={rowStoreAt + 4} level={-34} />
      <Sfx name="el-pencil" at={onePlaceAt} level={-35} />
      <Sfx name="el-sprinkle" at={idAt} level={-34} />
      <Sfx name="el-pencil" at={catAt} level={-35} />
      <Sfx name="el-whoosh" at={fiveAt - 6} level={-36} />
      <Sfx name="el-pencil" at={mixesAt + 6} level={-35} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={1} at={qAt - 4} textAt={qTextAt - 2} out={q2At - 4} size={60}>
          What is OLTP vs OLAP, and how does storage differ?
        </QuestionCard>
        <QuestionCard n={2} at={q2At} textAt={q2TextAt - 2} size={60}>
          Why is columnar storage faster for analytics?
        </QuestionCard>

        {/* ── Four sales, as a table ── */}
        <DataTable
          g={g}
          cols={colsOf(sample, { sale_id: { ink: BLUE_INK } })}
          at={qEnd - 8}
          out={q2At - 2}
          rows={rowsAt(sample.rows, qEnd - 4)}
          bands={[{ row: ORDER, at: oneAtATime, out: fewAt }]}
          marks={sample.rows.map((_, row) => ({ row, col: AMOUNT, at: fewAt + 4 + row * 2 }))}
        />
        {/* Each column's tint, over its title, so the strips below read back to it. */}
        {cols.map((c, j) => (
          <div
            key={c}
            style={{
              position: "absolute",
              left: g.xs[j] + 8,
              top: g.top - 12,
              width: g.widths[j] - 16,
              height: 7,
              borderRadius: 2,
              background: COLUMN_TINT[c],
              opacity: ease(frame, qEnd - 4 + j * 2, 10) * (1 - ease(frame, q2At - 2, 10)),
            }}
          />
        ))}

        {/* ── What each kind of system does ── */}
        <Note at={oltpAt} x={RIGHT_X} y={y(TOP) + h(6)} out={q2At - 2}>
          <span style={{ ...note(25, INK), whiteSpace: "nowrap" }}>
            <b>OLTP</b>, the application:
            <span style={{ opacity: ease(frame, smallAt, 10) }}> many small reads and writes</span>
          </span>
        </Note>
        <Note at={olapAt} x={RIGHT_X} y={y(TOP) + h(76)} out={q2At - 2}>
          <span style={{ ...note(25, INK), whiteSpace: "nowrap" }}>
            <b>OLAP</b>, the reports:
            <span style={{ opacity: ease(frame, fewAt, 10) }}> a few columns, millions of rows</span>
          </span>
        </Note>

        {/* ── The row store ── */}
        <div style={{ position: "absolute", left: X0, top: rowY - 40, ...label(22, INK), whiteSpace: "nowrap", opacity: ease(frame, rowStoreAt, 12) }}>
          Row store <span style={{ color: INK_SOFT, fontWeight: 500 }}>· OLTP · each sale&apos;s fields together</span>
        </div>
        {sample.rows.map((_, r) => cols.map((__, c) => cell(rowX(r, c), rowY, c, rowStoreAt + 4 + r * 3 + c * 0.6, `r${r}${c}`)))}
        <ReadMark x={rowX(ORDER, 0)} y={rowY} width={cols.length * CW - 4} height={sh} at={onePlaceAt} out={fewAt} />
        <Note at={onePlaceAt + 4} x={rowX(ORDER, 0)} y={rowY + sh + h(10)} out={fewAt}>
          <span style={{ ...note(23, INK), fontWeight: 650, whiteSpace: "nowrap" }}>one order, one place</span>
        </Note>
        {/* A report's column, scattered through the rows. */}
        {sample.rows.map((_, r) => (
          <ReadMark key={r} x={rowX(r, AMOUNT)} y={rowY} width={CELL} height={sh} at={fewAt + 6 + r * 3} out={threeAt} />
        ))}
        <Note at={fewAt + 16} x={X0 + sample.rows.length * (cols.length * CW + SEP) + 4} y={rowY + h(4)} out={threeAt}>
          <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>
            <QMono>amount</QMono>: every sixth value
          </span>
        </Note>
        {/* The page's query on rows: every value is read to find its three. */}
        <ReadMark x={X0} y={rowY} width={sample.rows.length * (cols.length * CW + SEP) - SEP - 4} height={sh} at={mixesAt + 6} />

        {/* ── The column store ── */}
        <div style={{ position: "absolute", left: X0, top: colY - 40, ...label(22, INK), whiteSpace: "nowrap", opacity: ease(frame, colStoreAt, 12) }}>
          Column store <span style={{ color: INK_SOFT, fontWeight: 500 }}>· OLAP · each column together</span>
        </div>
        {cols.map((_, c) => sample.rows.map((__, r) => cell(colX(r, c), colY, c, groupAt(c) + r * 1.5, `c${r}${c}`)))}
        {cols.map((name, c) => (
          <div
            key={name}
            style={{
              position: "absolute",
              left: colX(0, c),
              width: sample.rows.length * CW - 4,
              top: colY + sh + h(8),
              textAlign: "center",
              fontFamily: MONO,
              fontSize: 19,
              color: INK_SOFT,
              whiteSpace: "nowrap",
              opacity: ease(frame, groupAt(c) + 4, 10),
            }}
          >
            {name}
          </div>
        ))}
        <ReadMark x={colX(0, AMOUNT)} y={colY} width={sample.rows.length * CW - 4} height={sh} at={soOnAt + 24} out={threeAt} />
        {/* The page's query: three blocks, one per column it names. */}
        {READ_COLS.map((name) => {
          const c = colIndex(name);
          const at = name === "category" ? catAt : name === "units" ? unitsAt : amountAt;
          return <ReadMark key={name} x={colX(0, c)} y={colY} width={sample.rows.length * CW - 4} height={sh} at={at} />;
        })}
        <Note at={typeAt} x={colX(0, 0)} y={colY + sh + h(46)}>
          <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>
            one type, side by side: it compresses well
            <span style={{ opacity: ease(frame, batchAt, 10) }}> and is processed in batches</span>
          </span>
        </Note>

        {/* ── Question 2: the page's query, and what DuckDB read ── */}
        <Listing
          lines={QUERY.lines}
          x={X0}
          top={y(TOP)}
          width={520}
          size={20}
          at={namesAt - 6}
          marks={[
            { line: lineOf(QUERY.lines, "SELECT category"), at: catAt },
            { line: lineOf(QUERY.lines, "SUM(units)"), at: unitsAt + 2 },
            { line: lineOf(QUERY.lines, "SUM(amount)"), at: amountAt + 2 },
          ]}
        />
        <div style={{ position: "absolute", left: BAR_X, top: y(TOP) - 4, ...label(21, INK), whiteSpace: "nowrap", opacity: ease(frame, fiveAt - 6, 12) }}>
          <span style={{ fontFamily: MONO, fontWeight: 600 }}>sales.parquet</span>
          <span style={{ color: INK_SOFT, fontWeight: 500 }}>
            {" "}
            · DuckDB read <Num>{MB(QUERY.parquet.read)}</Num>
            <span style={{ opacity: ease(frame, nineAt, 10) }}>
              {" "}
              of <Num>{MB(FILES.parquet)}</Num>
            </span>
          </span>
        </div>
        <FileBar x={BAR_X} y={y(TOP) + h(34)} width={pqW} height={h(40)} at={fiveAt - 6} segments={PARQUET_SEGMENTS} />
        <ReadMark x={BAR_X + pqW * read.before} y={y(TOP) + h(34)} width={pqW * read.share} height={h(40)} at={fiveAt + 4} />
        <div style={{ position: "absolute", left: BAR_X, top: y(TOP) + h(100), ...label(21, INK), whiteSpace: "nowrap", opacity: ease(frame, mixesAt, 12) }}>
          <span style={{ fontFamily: MONO, fontWeight: 600 }}>sales.csv</span>
          <span style={{ color: INK_SOFT, fontWeight: 500, opacity: ease(frame, wholeAt - 4, 10) }}>
            {" "}
            · DuckDB read all <Num>{MB(QUERY.csv.read)}</Num>
          </span>
        </div>
        <FileBar x={BAR_X} y={y(TOP) + h(134)} width={BAR_W} height={h(40)} at={mixesAt} pattern={cols.map((c) => COLUMN_TINT[c])} />
        <ReadMark x={BAR_X} y={y(TOP) + h(134)} width={BAR_W} height={h(40)} at={wholeAt - 4} />
      </Drift>
    </AbsoluteFill>
  );
};
