import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard, Tick } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, INK, INK_SOFT, label, note } from "../../editorial/style";
import { Note, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ds } from "../../theme/brand";
import { MONO } from "../../theme/fonts";
import { kb, mb, SMALL, TABLE } from "./data";
import { Box, COLUMN_TINT, Cog, Drift, OK, OK_INK, SmallMono, X0 } from "./parts";

const GRID_Y = 334;
const COLS = 30;
const CELL = 17;
const PITCH = 22;
const ONE_X = 880;
const ONE_W = 150;
const TEXT_X = 1090;
const MONTH_Y = 560;
const MONTH_W = 44;
const MONTH_GAP = 8;
const KEY_Y = 694;
const RULE_Y = 834;
const FOOTER = ds("blue", 800);

/**
 * Question 8, after de-warehousing's SmallFilesScene. The million sales
 * split by day: 366 files of about 27 kB, drawn one square each with its
 * footer, against the same rows as one file; the footers alone, and the
 * files a scan of the year opens, from DuckDB's runs. Then a cluster key no
 * filter names, its cog still turning. Then the rule, with the year as
 * twelve month files of about 780 kB beside the day files.
 */
export const HurtScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("hurt").from;
  const qAt = n.word("hurt", "Question eight");
  const qTextAt = n.word("hurt", "When can partitioning");
  const tinyAt = n.word("hurt-small", "When the partitions are tiny");
  const dayAt = n.word("hurt-small", "Split the million sales by day");
  const filesAt = n.word("hurt-small", "three hundred sixty-six files");
  const kbAt = n.word("hurt-small", "about twenty-seven kilobytes");
  const footersAt = n.word("hurt-small", "Their footers alone");
  const twoAt = n.word("hurt-small", "two hundred six kilobytes");
  const fiveAt = n.word("hurt-small", "under five for one file");
  const opensAt = n.word("hurt-small", "reading the year opens every file");
  const clusterAt = n.word("hurt-cluster", "clustering on a column no query filters");
  const nothingAt = n.word("hurt-cluster", "buys nothing");
  const maintAt = n.word("hurt-cluster", "still costs maintenance");
  const ruleAt = n.word("hurt-rule", "Partition and cluster on the columns filters actually use");
  const grainAt = n.word("hurt-rule", "match the grain to the volume");
  const fewAt = n.word("hurt-rule", "too few to split by day");
  const end = n.beat("hurt-rule").to;

  const gridY = y(GRID_Y);
  const pitchY = h(PITCH);
  const cellH = h(CELL);
  const oneH = h(ONE_W);
  const textTop = (i: number) => gridY + [0, 52, 130][i] * (h(100) / 100);
  const monthTop = y(MONTH_Y) + h(40);

  return (
    <AbsoluteFill>
      <Sfx name="el-sprinkle" at={filesAt - 4} level={-32} />
      <Sfx name="el-tap" at={dayAt + 2} level={-34} />
      <Sfx name="el-tap" at={footersAt + 4} level={-34} />
      <Sfx name="el-tap" at={twoAt} level={-33} />
      <Sfx name="el-pencil" at={opensAt + 2} level={-35} />
      <Sfx name="el-tap" at={clusterAt} level={-33} />
      <Sfx name="el-scratch" at={nothingAt} level={-36} />
      <Sfx name="el-sprinkle" at={grainAt} level={-34} />
      <Sfx name="el-chime" at={fewAt + 4} level={-33} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={8} at={qAt - 4} textAt={qTextAt - 2} size={60}>
          When can partitioning or clustering hurt more than help?
        </QuestionCard>

        {/* ── A year, one file a day ── */}
        <div style={{ position: "absolute", left: X0, top: gridY - h(42), ...label(22, INK), whiteSpace: "nowrap", opacity: ease(frame, dayAt, 12) }}>
          By day <span style={{ color: INK_SOFT, fontWeight: 500 }}>· one Parquet file a day</span>
        </div>
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          {Array.from({ length: SMALL.day.files }, (_, d) => {
            const p = ease(frame, filesAt - 8 + (d / SMALL.day.files) * 26, 8);
            if (p <= 0) return null;
            const x = X0 + (d % COLS) * PITCH;
            const yy = gridY + Math.floor(d / COLS) * pitchY;
            const footer = ease(frame, footersAt + (d % 30) * 0.4, 8);
            const opened = ease(frame, opensAt + 4 + (d / SMALL.day.files) * 20, 6);
            return (
              <g key={d} opacity={p}>
                <rect x={x} y={yy} width={CELL} height={cellH} rx={2} fill={COLUMN_TINT.sale_date} />
                <rect x={x + CELL - 5} y={yy} width={5} height={cellH} rx={1} fill={FOOTER} opacity={footer} />
                {opened > 0 ? <rect x={x - 2} y={yy - 2} width={CELL + 4} height={cellH + 4} rx={3} fill="none" stroke={ACCENT} strokeWidth={1.6} opacity={opened} /> : null}
              </g>
            );
          })}
          {/* The same rows, one file. */}
          <g opacity={ease(frame, tinyAt + 4, 12)}>
            <rect x={ONE_X} y={gridY} width={ONE_W} height={oneH} rx={4} fill={COLUMN_TINT.sale_date} />
            <rect x={ONE_X + ONE_W - 7} y={gridY} width={7} height={oneH} rx={2} fill={FOOTER} opacity={ease(frame, footersAt + 8, 10)} />
            <rect x={ONE_X - 3} y={gridY - 3} width={ONE_W + 6} height={oneH + 6} rx={5} fill="none" stroke={OK} strokeWidth={2.2} opacity={ease(frame, opensAt + 26, 10)} />
          </g>
        </svg>
        <div style={{ position: "absolute", left: ONE_X, top: gridY - h(42), ...label(22, INK), whiteSpace: "nowrap", opacity: ease(frame, tinyAt + 4, 12) }}>
          One file
        </div>
        <div style={{ position: "absolute", left: ONE_X, top: gridY + oneH + h(10), ...note(21, INK_SOFT), whiteSpace: "nowrap", opacity: ease(frame, tinyAt + 10, 12) }}>
          <Num>{mb(SMALL.one.bytes)}</Num>
        </div>

        {/* ── What a file a day costs ── */}
        <Note at={kbAt} x={TEXT_X} y={textTop(0)}>
          <span style={{ ...note(25, INK), whiteSpace: "nowrap" }}>
            <b>
              <Num>{SMALL.day.files}</Num> files
            </b>{" "}
            of about <Num>{kb(SMALL.day.avg)}</Num>
          </span>
        </Note>
        <Note at={footersAt + 4} x={TEXT_X} y={textTop(1)}>
          <span style={{ ...note(25, INK), whiteSpace: "nowrap" }}>
            <span style={{ display: "inline-block", width: 9, height: 20, background: FOOTER, borderRadius: 2, marginRight: 10, verticalAlign: "-3px" }} />
            Footers: <b style={{ color: ACCENT_INK, opacity: ease(frame, twoAt, 10) }}>{kb(SMALL.day.footers)}</b>
            <span style={{ color: INK_SOFT, opacity: ease(frame, fiveAt, 10) }}>
              , against <Num>{(SMALL.one.footers / 1e3).toFixed(1)}</Num> kB for one file
            </span>
          </span>
        </Note>
        <Note at={opensAt} x={TEXT_X} y={textTop(2)}>
          <span style={{ ...note(25, INK), whiteSpace: "nowrap" }}>
            A scan of the year opens <b style={{ color: ACCENT_INK }}>{SMALL.day.read} files</b>
            <span style={{ color: INK_SOFT, opacity: ease(frame, opensAt + 26, 10) }}>
              , against <Num>{SMALL.one.read}</Num>
            </span>
          </span>
        </Note>
        <Note at={footersAt + 14} x={TEXT_X + 22} y={textTop(1) + h(38)}>
          <span style={{ ...note(20, INK_SOFT), whiteSpace: "nowrap" }}>A footer: the file&rsquo;s schema and statistics, read before any data</span>
        </Note>

        {/* ── By month: the grain this volume wants ── */}
        <div style={{ position: "absolute", left: ONE_X, top: y(MONTH_Y), ...label(22, INK), whiteSpace: "nowrap", opacity: ease(frame, grainAt, 12) }}>
          By month <span style={{ color: OK_INK, fontWeight: 500 }}>· <Num>{SMALL.month.files}</Num> files of about <Num>{kb(SMALL.month.avg)}</Num></span>
        </div>
        {Array.from({ length: SMALL.month.files }, (_, m) => {
          const p = ease(frame, grainAt + 4 + m * 1.5, 10);
          if (p <= 0) return null;
          return (
            <div
              key={m}
              style={{
                position: "absolute",
                left: ONE_X + m * (MONTH_W + MONTH_GAP),
                top: monthTop + (1 - p) * 8,
                width: MONTH_W,
                height: h(44),
                borderRadius: 3,
                background: COLUMN_TINT.sale_date,
                boxShadow: `inset -6px 0 0 ${FOOTER}`,
                opacity: p,
              }}
            />
          );
        })}

        {/* ── A cluster key nothing filters on ── */}
        <Box x={X0} y={y(KEY_Y)} w={340} h={h(64)} at={clusterAt} title={<>Cluster key: <span style={{ fontFamily: MONO }}>sale_id</span></>} size={22} tone="bad" />
        <Cog x={X0 + 340 + 56} y={y(KEY_Y) + h(32)} r={26} at={maintAt - 4} color={ACCENT} />
        <Note at={nothingAt} x={X0 + 340 + 112} y={y(KEY_Y) + h(2)}>
          <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>
            No query filters on <SmallMono>sale_id</SmallMono>: <b style={{ color: ACCENT_INK }}>nothing skipped</b>
          </span>
        </Note>
        <Note at={maintAt} x={X0 + 340 + 112} y={y(KEY_Y) + h(36)}>
          <span style={{ ...note(23, ACCENT_INK), fontWeight: 500, whiteSpace: "nowrap" }}>The sorting still costs maintenance</span>
        </Note>

        {/* ── The rule ── */}
        <div style={{ position: "absolute", left: X0, top: y(RULE_Y), display: "flex", alignItems: "center", gap: 12, ...note(25, INK), whiteSpace: "nowrap", opacity: ease(frame, ruleAt - 2, 12) }}>
          <Tick at={ruleAt + 4} size={25} color={OK} />
          <span>
            <b style={{ color: OK_INK }}>The columns filters use</b>
            <span style={{ opacity: ease(frame, grainAt, 10) }}>, and the grain the volume needs</span>
            <span style={{ color: INK_SOFT, opacity: ease(frame, fewAt, 10) }}>
              : {TABLE.rows === 1e6 ? "a million" : TABLE.rows.toLocaleString("en-US")} rows a year is too few to split by day
            </span>
          </span>
        </div>
      </Drift>
    </AbsoluteFill>
  );
};
