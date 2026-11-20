import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, INK, INK_SOFT, label, note } from "../../editorial/style";
import { Note, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { inkOf } from "../../theme/brand";
import { MONO } from "../../theme/fonts";
import { kb, mb, SELECT_STAR, TABLE } from "./data";
import { COLUMN_TINT, Drift, FileBar, Listing, MARK_BAD, MARK_OK, Mark, OK_INK, READ, READ_BAD, READ_OK, ReadMark, SmallMono, X0, KindTag } from "./parts";

const MODEL_Y = 396;
const STRIP_W = 5;
const PITCH = 8;
const STRIP_H = 110;
const LIT = [23, 96, 161];
const BADGE_Y = 296;
const BARS_Y = 352;
const BAR_STEP = 50;
const BAR_X = 330;
const PX_PER_MB = 130;
const Q_X = 1150;
const Q_W = 650;
const DBT_Y = 742;

/**
 * Question 5. First the page's model: a 200-column table whose columns are
 * all the same width, three of them lit (1.5%), then every one, in red, for
 * SELECT *. Then the million sales, measured: six bars, one per column of the
 * Parquet file at its real size, and what DuckDB read for three queries:
 * SELECT * (the whole file), units by region (two thin columns, under 800
 * kB) and revenue by region (the wide amount column, 4.6 MB), kept as a
 * tally so the two two-column reads sit side by side: bytes, not a count of
 * columns; and a LIMIT, on BigQuery, bills the same scan. Then the habit in
 * a dbt model: name the columns.
 */
export const StarScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("star").from;
  const qAt = n.word("star", "Question five");
  const qTextAt = n.word("star", "Why does select star");
  const followsAt = n.word("star-model", "the scan follows the columns you name");
  const modelAt = n.word("star-model", "The page's model");
  const twoHundredAt = n.word("star-model", "two hundred column table");
  const threeAt = n.word("star-model", "three columns");
  const pctAt = n.word("star-model", "one and a half percent");
  const widthAt = n.word("star-model", "the same width");
  const allAt = n.word("star-model", "Select star is all of it");
  const byteAt = n.word("star-model", "per-byte billing");
  const measuredAt = n.word("star-run", "Measured in DuckDB");
  const starAt = n.word("star-run", "select star read the whole");
  const nineAt = n.word("star-run", "nine point four megabyte file");
  const unitsAt = n.word("star-run", "Units by region");
  const twoColsAt = n.word("star-run", "two columns");
  const underAt = n.word("star-run", "under eight hundred kilobytes");
  const bytesAt = n.word("star-wide", "It's bytes, not column count");
  const amountAt = n.word("star-wide", "Amount, random to the cent");
  const halfAt = n.word("star-wide", "nearly half the file");
  const revenueAt = n.word("star-wide", "revenue by region");
  const fourAt = n.word("star-wide", "four point six megabytes");
  const limitAt = n.word("star-limit", "a limit doesn't help");
  const rowsAt = n.word("star-limit", "not the rows returned");
  const projectAt = n.word("star-dbt", "In a project, name the columns");
  const tableAt = n.word("star-dbt", "a model built as a table from select star");
  const everyAt = n.word("star-dbt", "every column of its source");
  const buildAt = n.word("star-dbt", "on every build");
  const end = n.beat("star-dbt").to;

  const model = SELECT_STAR.model;
  const modelTop = y(MODEL_Y);
  const stripH = h(STRIP_H);
  const runOut = measuredAt - 4;
  const barTop = (i: number) => y(BARS_Y) + i * h(BAR_STEP);
  const barH = h(30);
  const w = (bytes: number) => Math.max(3, (bytes / 1e6) * PX_PER_MB);
  const cols = TABLE.columnBytes;
  const idx = (name: string) => cols.findIndex((c) => c.name === name);

  // The three measured queries, one listing each.
  const lines = (sql: string) => sql.split("\n");
  const q = {
    star: lines(SELECT_STAR.star.sql),
    units: lines(SELECT_STAR.regionUnits.sql),
    amount: lines(SELECT_STAR.regionAmount.sql),
  };
  const qTop = y(BARS_Y) - h(6);
  const readTop = qTop + h(170);
  const dim = projectAt - 2;

  const marks = (names: readonly string[], at: number, out: number | undefined, color: string) =>
    names.map((name) => <ReadMark key={`${name}${at}`} x={BAR_X} y={barTop(idx(name))} width={w(cols[idx(name)].bytes)} height={barH} at={at} out={out} color={color} />);

  const dbtBad = ["{{ config(materialized='table') }}", "SELECT * FROM {{ source('shop', 'sales') }}"];
  // The same model both times; only the select list differs.
  const dbtGood = ["{{ config(materialized='table') }}", "SELECT region, amount FROM {{ source('shop', 'sales') }}"];
  // The tally of what each query read: it grows, so the two two-column
  // queries end up side by side.
  const tally = (i: number) => readTop + i * h(44);

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={modelAt} level={-33} />
      <Sfx name="el-sprinkle" at={twoHundredAt} level={-34} />
      <Sfx name="el-pencil" at={threeAt + 2} level={-35} />
      <Sfx name="el-sprinkle" at={allAt + 2} level={-33} />
      <Sfx name="el-tap" at={measuredAt} level={-33} />
      <Sfx name="el-pencil" at={starAt + 4} level={-35} />
      <Sfx name="el-pencil" at={unitsAt + 4} level={-35} />
      <Sfx name="el-tap" at={underAt} level={-33} />
      <Sfx name="el-pencil" at={halfAt} level={-35} />
      <Sfx name="el-tap" at={fourAt} level={-33} />
      <Sfx name="el-tap" at={limitAt} level={-34} />
      <Sfx name="el-scratch" at={tableAt + 6} level={-35} />
      <Sfx name="el-pencil" at={everyAt + 6} level={-35} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={5} at={qAt - 4} textAt={qTextAt - 2} size={60}>
          Why does <SmallMono>SELECT *</SmallMono> cost more in a columnar warehouse?
        </QuestionCard>

        {/* ── The page's model: 200 columns, 3 named ── */}
        <Note at={followsAt} x={X0} y={y(BADGE_Y)} out={runOut}>
          <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>The scan follows the columns you name.</span>
        </Note>
        <Note at={modelAt} x={X0} y={y(BADGE_Y) + h(46)} out={runOut}>
          <span style={{ ...note(23, INK), whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: "0.6em", fontSize: 23 }}>
            <KindTag kind="model" />
            <span>
              <Num>{model.columns}</Num> columns
              <span style={{ opacity: ease(frame, widthAt, 10) }}>, every one the same width</span>
            </span>
          </span>
        </Note>
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: 1 - ease(frame, runOut, 10) }}>
          {Array.from({ length: model.columns }, (_, i) => {
            const p = ease(frame, twoHundredAt + i * 0.12, 8);
            if (p <= 0) return null;
            const lit = LIT.includes(i) ? ease(frame, threeAt + LIT.indexOf(i) * 3, 8) : 0;
            const all = ease(frame, allAt + 2 + i * 0.06, 8);
            const fill = all > 0 ? `color-mix(in srgb, ${ACCENT} ${Math.round(85 * all)}%, var(--ds-blue-200))` : lit > 0 ? `color-mix(in srgb, ${inkOf.yellow} ${Math.round(100 * lit)}%, var(--ds-blue-200))` : "var(--ds-blue-200)";
            return <rect key={i} x={X0 + i * PITCH} y={modelTop + stripH * (1 - p)} width={STRIP_W} height={stripH * p} rx={1.5} fill={fill} />;
          })}
        </svg>
        <Note at={pctAt} x={X0} y={modelTop + stripH + h(22)} out={runOut}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>
            <Mark at={pctAt + 4}>
              <Num>{model.selected}</Num> of <Num>{model.columns}</Num>: <Num>{(model.share * 100).toFixed(1)}</Num>% of the data
            </Mark>
          </span>
        </Note>
        <Note at={allAt + 4} x={X0} y={modelTop + stripH + h(70)} out={runOut}>
          <span style={{ ...note(26, ACCENT_INK), fontWeight: 500, whiteSpace: "nowrap" }}>
            <SmallMono>SELECT *</SmallMono>: all <Num>{model.columns}</Num>
            <span style={{ opacity: ease(frame, byteAt, 10) }}>, and per-byte billing charges every byte</span>
          </span>
        </Note>

        {/* ── Measured: the million sales, column by column ── */}
        <Note at={measuredAt} x={X0} y={y(BADGE_Y)} dim={dim}>
          <span style={{ ...note(23, INK), whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: "0.6em", fontSize: 23 }}>
            <KindTag kind="measured" />
            <span>
              DuckDB, the million sales in one Parquet file, by column
            </span>
          </span>
        </Note>
        {cols.map((c, i) => (
          <React.Fragment key={c.name}>
            <div
              style={{
                position: "absolute",
                left: X0,
                top: barTop(i) + barH / 2 - 14,
                fontFamily: MONO,
                fontSize: 22,
                fontWeight: 500,
                color: INK,
                opacity: ease(frame, measuredAt + 4 + i * 2, 10) * (1 - 0.55 * ease(frame, dim, 14)),
                whiteSpace: "nowrap",
              }}
            >
              {c.name}
            </div>
            <FileBar x={BAR_X} y={barTop(i)} width={w(c.bytes)} height={barH} at={measuredAt + 4 + i * 2} fill={COLUMN_TINT[c.name]} dim={dim} />
            <div
              style={{
                position: "absolute",
                left: BAR_X + w(c.bytes) + 18,
                top: barTop(i) + barH / 2 - 14,
                ...note(21, INK_SOFT),
                whiteSpace: "nowrap",
                opacity: ease(frame, measuredAt + 10 + i * 2, 10) * (1 - 0.55 * ease(frame, dim, 14)),
              }}
            >
              <Num>{c.bytes < 1e5 ? `${(c.bytes / 1e3).toFixed(0)} kB` : c.bytes < 1e6 ? `${Math.round(c.bytes / 1e3)} kB` : mb(c.bytes)}</Num>
            </div>
          </React.Fragment>
        ))}
        {marks(cols.map((c) => c.name), starAt + 6, unitsAt - 2, READ_BAD)}
        {marks(["region", "units"], twoColsAt, bytesAt, READ_OK)}
        {marks(["amount"], amountAt + 4, revenueAt, READ)}
        {marks(["region", "amount"], revenueAt + 2, dim, READ)}
        <Note at={halfAt} x={BAR_X} y={barTop(idx("amount")) + barH + h(16)} dim={dim}>
          <span style={{ ...note(22, INK), whiteSpace: "nowrap" }}>
            <SmallMono>amount</SmallMono>, random to the cent: <b>
              <Num>{Math.round(SELECT_STAR.amountShare * 100)}</Num>% of the file
            </b>
          </span>
        </Note>

        {/* The query beside the bars, and what DuckDB read for it. */}
        <Listing lines={q.star} x={Q_X} top={qTop} width={Q_W} size={21} at={starAt} out={unitsAt - 2} />
        <Listing lines={q.units} x={Q_X} top={qTop} width={Q_W} size={21} at={unitsAt} out={revenueAt - 2} marks={[{ line: "SELECT", text: "region, SUM(units)", at: twoColsAt, color: MARK_OK }]} />
        <Listing lines={q.amount} x={Q_X} top={qTop} width={Q_W} size={21} at={revenueAt} dim={dim} marks={[{ line: "SELECT", text: "region, SUM(amount)", at: revenueAt + 6 }]} />
        <Note at={nineAt} x={Q_X} y={tally(0)} dim={dim}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            <SmallMono>SELECT *</SmallMono>: <b style={{ color: ACCENT_INK }}>{mb(SELECT_STAR.star.read)}</b>
            <span style={{ color: INK_SOFT }}>, the whole file</span>
          </span>
        </Note>
        <Note at={underAt} x={Q_X} y={tally(1)} dim={dim}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            Units by region: <b style={{ color: OK_INK }}>{kb(SELECT_STAR.regionUnits.read)}</b>
            <span style={{ color: INK_SOFT }}>, two thin columns</span>
          </span>
        </Note>
        <Note at={fourAt} x={Q_X} y={tally(2)} dim={dim}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            Revenue by region: <Mark at={fourAt + 4}>{mb(SELECT_STAR.regionAmount.read)}</Mark>
            <span style={{ color: INK_SOFT }}>, two columns again</span>
          </span>
        </Note>
        <Note at={fourAt + 12} x={Q_X} y={tally(3) + h(6)} dim={dim}>
          <span style={{ ...note(24, INK), fontWeight: 500, whiteSpace: "nowrap" }}>Bytes, not a count of columns</span>
        </Note>
        {/* A LIMIT returns fewer rows, not fewer columns. */}
        <Note at={limitAt} x={Q_X} y={tally(4) + h(6)} dim={dim}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            <SmallMono>LIMIT</SmallMono> on BigQuery
            <span style={{ opacity: ease(frame, rowsAt, 10) }}>
              : <b style={{ color: ACCENT_INK }}>the same scan</b>
            </span>
          </span>
        </Note>

        {/* ── In a dbt project: name the columns ── */}
        <Note at={projectAt} x={X0} y={y(DBT_Y) - h(40)}>
          <span style={{ ...label(22, INK), whiteSpace: "nowrap" }}>In a dbt model, name the columns</span>
        </Note>
        <Listing lines={dbtBad} x={X0} top={y(DBT_Y)} width={760} size={21} at={tableAt - 4} marks={[{ line: "SELECT *", text: "SELECT *", at: everyAt + 4, color: MARK_BAD }]} />
        <Listing lines={dbtGood} x={960} top={y(DBT_Y)} width={840} size={21} at={projectAt + 6} marks={[{ line: "SELECT", text: "region, amount", at: projectAt + 14, color: MARK_OK }]} />
        <Note at={everyAt + 2} x={X0} y={y(DBT_Y) + h(110)}>
          <span style={{ ...note(22, ACCENT_INK), fontWeight: 500, whiteSpace: "nowrap" }}>
            Every column of its source<span style={{ opacity: ease(frame, buildAt, 10) }}>, on every build</span>
          </span>
        </Note>
        <Note at={projectAt + 14} x={960} y={y(DBT_Y) + h(110)}>
          <span style={{ ...note(22, OK_INK), fontWeight: 500, whiteSpace: "nowrap" }}>Only the columns it uses</span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
