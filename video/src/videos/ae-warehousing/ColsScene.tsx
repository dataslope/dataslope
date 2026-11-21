import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard, Tick } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { BLUE_INK, INK, INK_SOFT, label, note } from "../../editorial/style";
import { Note, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { MONO } from "../../theme/fonts";
import { COLUMNAR, kb, mb, REGIONS, SAMPLE, TABLE } from "./data";
import { COLUMN_TINT, Drift, FileBar, OK, OK_INK, READ_OK, ReadMark, X0 } from "./parts";

const ROW_Y = 330;
const COL_Y = 450;
const STRIP_H = 46;
const CW = 52;
const CELL = 48;
const SEP = 16;
const SIDE_X = 1480;
const CMP_Y = 610;
const CMP_STEP = 52;
const BAR_X = 340;
const PX_PER_MB = 130;
const DICT_X = 1270;
const LINES_Y = 806;

/**
 * Question 4. The table's first four sales laid out two ways: by column
 * (each column's values together) and by row. A query that names two columns
 * reads two blocks of the column store, and two values scattered through
 * every record of the row store. Then compression, measured on the million
 * sales: the region column as text against as one encoded column, its four
 * names kept once in a dictionary and a small code a row. Then what each
 * layout is for, in green: one whole row, and a sum down one column.
 */
export const ColsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("cols").from;
  const qAt = n.word("cols", "Question four");
  const qTextAt = n.word("cols", "What is columnar storage");
  const colAt = n.word("cols-def", "each column's values together");
  const rowAt = n.word("cols-def", "instead of each row's");
  const fewAt = n.word("cols-def", "touches a few columns");
  const onlyAt = n.word("cols-def", "reads only those columns");
  const typeAt = n.word("cols-compress", "values of one type");
  const millionAt = n.word("cols-compress", "A million region names");
  const textAt = n.word("cols-compress", "five and a half megabytes");
  const kbAt = n.word("cols-compress", "three hundred eighty kilobytes");
  const encodedAt = n.word("cols-compress", "one encoded column");
  const wholeAt = n.word("cols-rows", "reading whole rows");
  const oneAt = n.word("cols-rows", "one at a time");
  const aggAt = n.word("cols-rows", "Column stores win at aggregating");
  const end = n.beat("cols-rows").to;

  const cols = SAMPLE.cols;
  const rows = SAMPLE.rows;
  const rowY = y(ROW_Y);
  const colY = y(COL_Y);
  const sh = h(STRIP_H);
  const rowX = (r: number, c: number) => X0 + r * (cols.length * CW + SEP) + c * CW;
  const colX = (r: number, c: number) => X0 + c * (rows.length * CW + SEP) + r * CW;
  const colEnd = X0 + cols.length * (rows.length * CW + SEP) - SEP - (CW - CELL);
  const READS = ["region", "units"];
  const ONE = 1;
  const SUMMED = cols.indexOf("amount");
  const marksOut = wholeAt - 2;

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

  const cmpTop = (i: number) => y(CMP_Y) + i * h(CMP_STEP);
  const regionCol = cols.indexOf("region");

  return (
    <AbsoluteFill>
      <Sfx name="el-sprinkle" at={colAt} level={-34} />
      <Sfx name="el-sprinkle" at={rowAt} level={-34} />
      <Sfx name="el-pencil" at={onlyAt} level={-35} />
      <Sfx name="el-tap" at={textAt} level={-33} />
      <Sfx name="el-tap" at={kbAt} level={-33} />
      <Sfx name="el-pencil" at={oneAt} level={-35} />
      <Sfx name="el-pencil" at={aggAt + 4} level={-35} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={4} at={qAt - 4} textAt={qTextAt - 2} size={60}>
          What is columnar storage, and why does it matter for analytics?
        </QuestionCard>

        {/* ── By row ── */}
        <div style={{ position: "absolute", left: X0, top: rowY - h(40), ...label(22, INK), whiteSpace: "nowrap", opacity: ease(frame, rowAt, 12) }}>
          By row <span style={{ color: INK_SOFT, fontWeight: 500 }}>· each sale&rsquo;s values together</span>
        </div>
        {rows.map((_, r) => cols.map((__, c) => cell(rowX(r, c), rowY, c, rowAt + 2 + r * 3 + c * 0.6, `r${r}${c}`)))}
        {/* A query's two columns, scattered through every record. */}
        {rows.map((_, r) =>
          READS.map((name) => <ReadMark key={`${r}${name}`} x={rowX(r, cols.indexOf(name))} y={rowY} width={CELL} height={sh} at={onlyAt + 2 + r * 2} out={marksOut} />),
        )}
        <Note at={onlyAt + 10} x={SIDE_X} y={rowY + h(6)} out={marksOut}>
          <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>Scattered through every row</span>
        </Note>
        {/* One whole row: what a row store is for. */}
        <ReadMark x={rowX(ONE, 0)} y={rowY} width={cols.length * CW - (CW - CELL)} height={sh} at={oneAt} color={READ_OK} />

        {/* ── By column ── */}
        <div style={{ position: "absolute", left: X0, top: colY - h(40), ...label(22, INK), whiteSpace: "nowrap", opacity: ease(frame, colAt, 12) }}>
          By column <span style={{ color: INK_SOFT, fontWeight: 500 }}>· each column&rsquo;s values together</span>
        </div>
        {cols.map((_, c) => rows.map((__, r) => cell(colX(r, c), colY, c, colAt + 2 + c * 3 + r * 0.6, `c${r}${c}`)))}
        {cols.map((name, c) => (
          <div
            key={name}
            style={{
              position: "absolute",
              left: colX(0, c),
              width: rows.length * CW - (CW - CELL),
              top: colY + sh + h(10),
              textAlign: "center",
              fontFamily: MONO,
              fontSize: 19,
              color: READS.includes(name) && frame >= onlyAt && frame < marksOut ? INK : INK_SOFT,
              whiteSpace: "nowrap",
              opacity: ease(frame, colAt + 4 + c * 3, 10),
            }}
          >
            {name}
          </div>
        ))}
        {READS.map((name) => (
          <ReadMark key={name} x={colX(0, cols.indexOf(name))} y={colY} width={rows.length * CW - (CW - CELL)} height={sh} at={onlyAt} out={marksOut} />
        ))}
        <Note at={fewAt + 2} x={SIDE_X} y={colY + h(6)} out={marksOut}>
          <span style={{ ...note(22, INK), whiteSpace: "nowrap" }}>
            <span style={{ color: INK_SOFT }}>A query on two:</span> two blocks
          </span>
        </Note>
        {/* A sum down one column: what a column store is for. */}
        <ReadMark x={colX(0, SUMMED)} y={colY} width={rows.length * CW - (CW - CELL)} height={sh} at={aggAt + 4} color={READ_OK} />
        <div
          style={{
            position: "absolute",
            left: colEnd + 24,
            top: colY + sh / 2 - 15,
            ...note(24, OK_INK),
            fontWeight: 500,
            opacity: ease(frame, aggAt + 10, 10),
            whiteSpace: "nowrap",
          }}
        >
          SUM
        </div>

        {/* ── One column, compressed: the million sales ── */}
        <Note at={typeAt} x={X0} y={cmpTop(0) - h(46)}>
          <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>
            One type, side by side, compresses
            <span style={{ opacity: ease(frame, millionAt, 10) }}>
              : <SmallCode>region</SmallCode>, <Num>{TABLE.rows.toLocaleString("en-US")}</Num> values, <Num>{COLUMNAR.regionValues}</Num> distinct
            </span>
          </span>
        </Note>
        <div style={{ position: "absolute", left: X0, top: cmpTop(0) + h(4), ...note(22, INK_SOFT), whiteSpace: "nowrap", opacity: ease(frame, millionAt + 4, 10) }}>
          As text
        </div>
        <FileBar x={BAR_X} y={cmpTop(0)} width={(COLUMNAR.regionCsv / 1e6) * PX_PER_MB} height={h(32)} at={millionAt + 4} pattern={["var(--ds-blue-300)", "var(--ds-blue-100)"]} />
        <div
          style={{
            position: "absolute",
            left: BAR_X + (COLUMNAR.regionCsv / 1e6) * PX_PER_MB + 16,
            top: cmpTop(0) + h(2),
            ...note(24, INK),
            fontWeight: 500,
            whiteSpace: "nowrap",
            opacity: ease(frame, textAt, 10),
          }}
        >
          <Num>{mb(COLUMNAR.regionCsv, 2)}</Num>
        </div>
        <div style={{ position: "absolute", left: X0, top: cmpTop(1) + h(4), ...note(22, INK_SOFT), whiteSpace: "nowrap", opacity: ease(frame, kbAt - 4, 10) }}>
          As a column
        </div>
        <FileBar x={BAR_X} y={cmpTop(1)} width={(COLUMNAR.regionParquet / 1e6) * PX_PER_MB} height={h(32)} at={kbAt - 4} fill={COLUMN_TINT.region} />
        <div
          style={{
            position: "absolute",
            left: BAR_X + (COLUMNAR.regionParquet / 1e6) * PX_PER_MB + 16,
            top: cmpTop(1) + h(2),
            ...note(24, OK_INK),
            fontWeight: 500,
            whiteSpace: "nowrap",
            opacity: ease(frame, kbAt, 10),
          }}
        >
          <Num>{kb(COLUMNAR.regionParquet)}</Num>
          <span style={{ ...note(22, INK_SOFT), opacity: ease(frame, encodedAt, 10) }}> · each name once, then a code a row</span>
        </div>

        {/* The dictionary: the four names once, and a code per row. */}
        <div style={{ position: "absolute", left: DICT_X, top: cmpTop(0) - h(46), opacity: ease(frame, encodedAt - 2, 12) }}>
          <div style={{ ...label(21, INK_SOFT), marginBottom: 8, whiteSpace: "nowrap" }}>Dictionary</div>
          {REGIONS.map((v, i) => (
            <div key={v} style={{ display: "flex", gap: 12, alignItems: "center", height: h(30), fontFamily: MONO, fontSize: 21, color: INK }}>
              <span style={{ width: 22, textAlign: "right", color: BLUE_INK, fontWeight: 500 }}>{i}</span>
              <span>{v}</span>
            </div>
          ))}
        </div>
        {/* The codes the rows store, in row order: one run under the
            dictionary, not a column beside it, so they cannot be read as
            its mapping. */}
        <div
          style={{
            position: "absolute",
            left: DICT_X,
            top: cmpTop(0) - h(46) + 37 + REGIONS.length * h(30) + h(16),
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontFamily: MONO,
            fontSize: 21,
            color: INK,
            whiteSpace: "nowrap",
            opacity: ease(frame, encodedAt + 6, 12),
          }}
        >
          <span style={{ ...label(21, INK_SOFT), marginRight: 6 }}>Each row, a code:</span>
          {rows.map((r, i) => (
            <span key={i} style={{ display: "inline-block", minWidth: 26, padding: "0 6px", borderRadius: 4, background: COLUMN_TINT.region, textAlign: "center" }}>
              {REGIONS.indexOf(r[regionCol])}
            </span>
          ))}
          <span style={{ color: INK_SOFT }}>…</span>
        </div>

        {/* ── What each is for ── */}
        <div style={{ position: "absolute", left: X0, top: y(LINES_Y), display: "flex", alignItems: "center", gap: 12, ...note(25, INK), whiteSpace: "nowrap", opacity: ease(frame, wholeAt - 2, 12) }}>
          <Tick at={oneAt + 2} size={25} color={OK} />
          <span>
            <b style={{ color: OK_INK }}>Row stores:</b> whole rows, one at a time
          </span>
        </div>
        <div style={{ position: "absolute", left: X0, top: y(LINES_Y) + h(46), display: "flex", alignItems: "center", gap: 12, ...note(25, INK), whiteSpace: "nowrap", opacity: ease(frame, aggAt - 2, 12) }}>
          <Tick at={aggAt + 6} size={25} color={OK} />
          <span>
            <b style={{ color: OK_INK }}>Column stores:</b> aggregating billions of rows
          </span>
        </div>
      </Drift>
    </AbsoluteFill>
  );
};

/** A column name inside a line of type. */
const SmallCode: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span style={{ fontFamily: MONO, fontSize: "0.92em", fontWeight: 500, fontVariantLigatures: "none" }}>{children}</span>
);
