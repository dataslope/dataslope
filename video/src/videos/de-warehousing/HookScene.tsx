import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QMono } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { BAR, BLUE_INK, INK, INK_SOFT, PAPER, label, note } from "../../editorial/style";
import { Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { MONO } from "../../theme/fonts";
import { COLUMNS, count, FILES, MB, QUERY, TABLE } from "./data";
import { COLUMN_TINT, Drift, FileBar, Headline, Kicker, PARQUET_SEGMENTS, pulse, ReadMark, segmentOf, Spot, X0 } from "./parts";

const CSV_W = 1050;
const ROW1 = 330;
const ROW2 = 470;
const BAR_H = 56;
const CHIPS_Y = 742;
const CHIP = 50;
const GAP = 10;
/** The questions measured on the video's own million rows: 2 to 8. */
const MEASURED = [2, 3, 4, 5, 6, 7, 8];

/**
 * The opening: one made-up table of a million sales, written twice. The CSV
 * is a bar of interleaved fields, the Parquet file a bar of six column
 * blocks, each as long as its bytes. Asked the page's question (revenue by
 * category), DuckDB reads the whole CSV and only the three column blocks of
 * the Parquet file: the measured bytes. Then the round: nine questions, seven
 * measured on these rows.
 */
export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("hook").from;
  const salesAt = n.word("hook", "a million sales");
  const csvAt = n.word("hook", "As a CSV file");
  const csvSizeAt = n.word("hook", "thirty-nine point two megabytes");
  const pqAt = n.word("hook", "As Parquet");
  const columnarAt = n.word("hook", "a columnar file format");
  const pqSizeAt = n.word("hook", "nine point four");
  const askAt = n.word("hook-read", "Ask both");
  const everyAt = n.word("hook-read", "every byte of the CSV");
  const fiveAt = n.word("hook-read", "five megabytes");
  const layoutAt = n.word("hook-read", "only the layout differs");
  const nineAt = n.word("plan", "nine questions");
  const sevenAt = n.word("plan", "Seven get measured");
  const end = n.beat("plan").to;

  const pqW = (CSV_W * FILES.parquet) / FILES.csv;
  const { before: skipped, share: readShare } = segmentOf(["category", "units", "amount"]);
  const dim = nineAt - 4;

  const sizeLabel = (at: number, text: React.ReactNode, top: number) => (
    <div style={{ position: "absolute", left: X0, top: y(top), display: "flex", gap: 18, alignItems: "baseline", whiteSpace: "nowrap", opacity: ease(frame, at, 12) * (1 - ease(frame, dim, 14) * 0.55) }}>
      {text}
    </div>
  );

  return (
    <AbsoluteFill>
      <Sfx name="el-whoosh" at={csvAt + 2} level={-36} />
      <Sfx name="el-whoosh" at={pqAt + 2} level={-36} />
      <Sfx name="el-pencil" at={everyAt + 4} level={-35} />
      <Sfx name="el-pencil" at={fiveAt} level={-35} />
      <Sfx name="el-pop" at={nineAt} level={-34} />
      <Sfx name="el-tap" at={sevenAt + 4} level={-36} />

      <Drift from={from} to={end + 40}>
        <Kicker at={from}>Data engineer interview prep · Warehousing &amp; storage</Kicker>
        <Headline lead="A million sales, written twice." turn="Only the layout differs." at={salesAt - 4} turnAt={layoutAt} size={60} />
        <div style={{ position: "absolute", left: X0, top: y(238), ...note(22, INK_SOFT), whiteSpace: "nowrap", opacity: ease(frame, salesAt + 10, 12) * (1 - ease(frame, dim, 14) * 0.55) }}>
          <Num>{count(TABLE.rows)}</Num> rows made up for this video, in the page&apos;s six <QMono>sales</QMono> columns
        </div>
        <Spot id="de-warehousing-hamster" at={from + 10} left={1300} top={y(540)} width={520} height={397} />

        {/* ── The CSV: fields interleaved, row after row ── */}
        {sizeLabel(
          csvAt,
          <>
            <span style={{ fontFamily: MONO, fontSize: 26, fontWeight: 600, color: INK }}>sales.csv</span>
            <span style={{ ...note(26, INK), fontWeight: 700, opacity: ease(frame, csvSizeAt, 10) }}>
              <Num>{MB(FILES.csv)}</Num>
            </span>
            <span style={{ ...note(22, INK_SOFT), opacity: ease(frame, csvSizeAt + 6, 10) }}>text, one row after another</span>
          </>,
          ROW1 - 46,
        )}
        <FileBar x={X0} y={y(ROW1)} width={CSV_W} height={h(BAR_H)} at={csvAt + 2} dim={dim} pattern={COLUMNS.map((c) => COLUMN_TINT[c.name])} />

        {/* ── The Parquet file: one block per column ── */}
        {sizeLabel(
          pqAt,
          <>
            <span style={{ fontFamily: MONO, fontSize: 26, fontWeight: 600, color: INK }}>sales.parquet</span>
            <span style={{ ...note(26, INK), fontWeight: 700, opacity: ease(frame, pqSizeAt, 10) }}>
              <Num>{MB(FILES.parquet)}</Num>
            </span>
            <span style={{ ...note(22, INK_SOFT), opacity: ease(frame, columnarAt, 10) }}>columnar: each column stored together</span>
          </>,
          ROW2 - 46,
        )}
        <FileBar x={X0} y={y(ROW2)} width={pqW} height={h(BAR_H)} at={pqAt + 2} dim={dim} segments={PARQUET_SEGMENTS} />

        {/* ── What the page's query read from each ── */}
        <div
          style={{
            position: "absolute",
            left: X0,
            top: y(610),
            ...note(24, INK),
            whiteSpace: "nowrap",
            opacity: ease(frame, askAt, 12) * (1 - ease(frame, dim, 14) * 0.55),
          }}
        >
          the page&apos;s query: revenue and units by <QMono>category</QMono>
        </div>
        <ReadMark x={X0} y={y(ROW1)} width={CSV_W} height={h(BAR_H)} at={everyAt + 4} out={dim} />
        <ReadMark x={X0 + pqW * skipped} y={y(ROW2)} width={pqW * readShare} height={h(BAR_H)} at={fiveAt} out={dim} />
        <div
          style={{
            position: "absolute",
            left: X0 + CSV_W - 330,
            top: y(ROW1) + h(BAR_H) + 12,
            width: 330,
            textAlign: "right",
            ...note(24, INK),
            fontWeight: 650,
            whiteSpace: "nowrap",
            opacity: ease(frame, everyAt + 10, 12) * (1 - ease(frame, dim, 14) * 0.55),
          }}
        >
          read: all <Num>{MB(QUERY.csv.read)}</Num>
        </div>
        <div
          style={{
            position: "absolute",
            left: X0 + pqW + 24,
            top: y(ROW2) + (h(BAR_H) - 34) / 2,
            ...note(24, INK),
            fontWeight: 650,
            whiteSpace: "nowrap",
            opacity: ease(frame, fiveAt + 6, 12) * (1 - ease(frame, dim, 14) * 0.55),
          }}
        >
          read: <Num>{MB(QUERY.parquet.read)}</Num>
          <span style={{ ...note(22, INK_SOFT), fontWeight: 500 }}> of it, the columns category, units and amount</span>
        </div>

        {/* ── The round: nine questions, seven measured on these rows ── */}
        <div style={{ position: "absolute", left: X0, top: y(CHIPS_Y) - 44, ...label(22, INK_SOFT), whiteSpace: "nowrap", opacity: ease(frame, nineAt - 2, 12) }}>
          9 questions
        </div>
        {Array.from({ length: 9 }, (_, i) => {
          const q = i + 1;
          const p = ease(frame, nineAt + i * 1.5, 10);
          if (p <= 0) return null;
          const measured = MEASURED.includes(q);
          const tone = measured ? ease(frame, sevenAt + 4 + (q - 2) * 2, 10) : 0;
          return (
            <div
              key={q}
              style={{
                position: "absolute",
                left: X0 + i * (CHIP + GAP),
                top: y(CHIPS_Y),
                width: CHIP,
                height: CHIP,
                borderRadius: CHIP / 2,
                boxSizing: "border-box",
                background: `color-mix(in srgb, ${BAR} ${tone * 100}%, ${PAPER})`,
                border: `2px solid color-mix(in srgb, ${BAR} ${45 + 55 * tone}%, ${PAPER})`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                ...label(21, tone > 0.5 ? PAPER : INK),
                fontWeight: 700,
                opacity: p,
                transform: `scale(${p * (1 + 0.12 * pulse(frame, sevenAt + 4 + (q - 2) * 2, 14))})`,
              }}
            >
              <Num>{q}</Num>
            </div>
          );
        })}
        <div
          style={{
            position: "absolute",
            left: X0 + (CHIP + GAP),
            top: y(CHIPS_Y) + CHIP + 18,
            ...note(24, BLUE_INK),
            fontWeight: 650,
            whiteSpace: "nowrap",
            opacity: ease(frame, sevenAt + 6, 12),
          }}
        >
          <Num>7</Num> measured on these same rows, in DuckDB
        </div>
      </Drift>
    </AbsoluteFill>
  );
};
