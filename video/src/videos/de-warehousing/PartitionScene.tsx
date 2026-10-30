import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { during, ease } from "../../components/motion";
import { QMono, QuestionCard, Tick } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, INK, INK_SOFT, PAPER, note } from "../../editorial/style";
import { Note, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { MONO } from "../../theme/fonts";
import { count, PARTITION } from "./data";
import { COLUMN_TINT, Drift, lineOf, Listing, MARK_BAD, OK, OK_INK, PlanBox, READ, X0 } from "./parts";

const FOLDER_Y = 336;
const FOLDER_W = 130;
const FOLDER_GAP = 12;
const FOLDER_H = 78;
const LIST_Y = 528;
const PLAN_X = 940;
const MARCH = PARTITION.months.indexOf("2024-03");

/** One folder of the partitioned table, by its month. */
const Folder: React.FC<{ x: number; y: number; h: number; name: string; at: number; read: number; trap: number; pruned: number }> = ({
  x,
  y,
  h,
  name,
  at,
  read,
  trap,
  pruned,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 10);
  if (p <= 0) return null;
  const fill = trap > 0 ? `color-mix(in srgb, ${ACCENT} ${26 * trap}%, ${PAPER})` : read > 0 ? `color-mix(in srgb, ${READ} ${100 * read}%, ${COLUMN_TINT.sale_id})` : COLUMN_TINT.sale_id;
  return (
    <div style={{ position: "absolute", left: x, top: y + (1 - p) * 12, width: FOLDER_W, height: h, opacity: p * (1 - 0.62 * pruned) }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: 54, height: 14, borderRadius: "5px 5px 0 0", background: fill, boxShadow: `inset 0 0 0 1.5px ${INK}` }} />
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 12,
          width: FOLDER_W,
          height: h - 12,
          borderRadius: "0 6px 6px 6px",
          background: fill,
          boxShadow: `inset 0 0 0 1.5px ${INK}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: MONO,
          fontSize: 21,
          fontWeight: 600,
          color: INK,
        }}
      >
        {name}
      </div>
    </div>
  );
};

/**
 * Question 5 (and the Pipelines page's partition-key question). The made-up
 * year written as one folder per month, twelve Parquet files. Three filters
 * run on it, each with DuckDB's own plan line: March scans 1 of 12; a filter
 * on region reads all 12 (not the key); a function on the key still scans 1
 * of 12 in DuckDB, which the page says most engines can't.
 */
export const PartitionScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("part").from;
  const qAt = n.word("part", "Question five");
  const qTextAt = n.word("part", "What is partitioning");
  const splitsAt = n.word("part", "Partitioning splits a table into folders");
  const dateAt = n.word("part", "usually a date");
  const monthAt = n.word("part-month", "one folder per month");
  const twelveAt = n.word("part-month", "twelve files");
  const marchAt = n.word("part-month", "Ask for March");
  const oneAt = n.word("part-month", "scans one file of the twelve");
  const regionAt = n.word("part-region", "Filter on region instead");
  const allAt = n.word("part-region", "reads all twelve");
  const keyAt = n.word("part-region", "pruning only works on the key");
  const goodAt = n.word("part-region", "So a good key");
  const evenAt = n.word("part-region", "partitions even and not too small");
  const fnAt = n.word("part-fn", "a function wrapped around the key");
  const appliedAt = n.word("part-fn", "DuckDB applied it");
  const stillAt = n.word("part-fn", "still read one file");
  const checkAt = n.word("part-fn", "check your engine's plan");
  const end = n.beat("part-fn").to;

  const fx = (i: number) => X0 + i * (FOLDER_W + FOLDER_GAP);
  // Which folders each query touches, while its listing is up.
  const marchOn = during(frame, oneAt, regionAt + 4, 10);
  const regionOn = during(frame, allAt - 4, fnAt + 4, 10);
  const fnOn = ease(frame, stillAt, 10);
  const [fewest, most] = PARTITION.rowsPerFile;

  const listing = (q: typeof PARTITION.march, at: number, out: number | undefined, markAt: number, color?: string) => (
    <Listing lines={q.lines} x={X0} top={y(LIST_Y)} width={760} size={21} at={at} out={out} marks={[{ line: lineOf(q.lines, "WHERE"), at: markAt, color }]} />
  );

  return (
    <AbsoluteFill>
      <Sfx name="el-sprinkle" at={splitsAt + 10} level={-34} />
      <Sfx name="el-pencil" at={oneAt + 2} level={-35} />
      <Sfx name="el-tap" at={allAt} level={-35} />
      <Sfx name="el-pop" at={goodAt + 4} level={-34} />
      <Sfx name="el-pencil" at={stillAt} level={-35} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={5} at={qAt - 4} textAt={qTextAt - 2} size={60}>
          What is partitioning, and what makes a good partition key?
        </QuestionCard>

        <Note at={splitsAt} x={X0} y={y(268)}>
          <span style={{ ...note(23, INK_SOFT), whiteSpace: "nowrap" }}>
            One folder per value of the key
            <span style={{ opacity: ease(frame, dateAt, 10) }}>, usually a date</span>
            <span style={{ opacity: ease(frame, monthAt, 10) }}>
              : here <QMono>sale_month=…</QMono>, one Parquet file each
            </span>
          </span>
        </Note>

        {PARTITION.months.map((m, i) => (
          <Folder
            key={m}
            x={fx(i)}
            y={y(FOLDER_Y)}
            h={h(FOLDER_H)}
            name={m}
            at={splitsAt + 10 + i * 2}
            read={i === MARCH ? Math.max(marchOn, fnOn) : 0}
            trap={regionOn}
            pruned={i === MARCH ? 0 : Math.max(marchOn, fnOn)}
          />
        ))}
        <Note at={twelveAt + 2} x={X0} y={y(FOLDER_Y) + h(FOLDER_H) + h(14)}>
          <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>
            <Num>{PARTITION.files}</Num> files, <Num>{count(fewest)}</Num> to <Num>{count(most)}</Num> rows each
          </span>
        </Note>

        {/* ── March: one file of twelve ── */}
        {listing(PARTITION.march, marchAt - 2, regionAt - 2, marchAt + 8)}
        <PlanBox
          x={PLAN_X}
          top={y(LIST_Y) - 30}
          width={860}
          at={oneAt - 6}
          out={regionAt - 2}
          lines={[
            { text: `File Filters: ${PARTITION.march.fileFilters}`, at: oneAt - 4 },
            { text: `Scanning Files: ${PARTITION.march.scanning}`, at: oneAt, mark: oneAt + 4, strong: true },
            { text: `Total Files Read: ${PARTITION.march.filesRead}`, at: oneAt + 4 },
          ]}
        />

        {/* ── region: every file ── */}
        {listing(PARTITION.region, regionAt, fnAt - 2, regionAt + 8, MARK_BAD)}
        <PlanBox
          x={PLAN_X}
          top={y(LIST_Y) - 30}
          width={860}
          at={allAt - 6}
          out={fnAt - 2}
          lines={[
            { text: `Filters: ${PARTITION.region.filters}`, at: allAt - 4 },
            { text: `Total Files Read: ${PARTITION.region.filesRead}`, at: allAt, mark: allAt + 4, markColor: MARK_BAD, strong: true },
          ]}
        />
        <Note at={keyAt} x={PLAN_X} y={y(LIST_Y) + h(110)} out={fnAt - 2}>
          <span style={{ ...note(24, INK), fontWeight: 650, whiteSpace: "nowrap" }}>
            <QMono>region</QMono> is not the key: nothing to prune
          </span>
        </Note>

        {/* ── A good key ── */}
        <div style={{ position: "absolute", left: X0, top: y(790), display: "flex", alignItems: "center", gap: 14, ...note(26, INK), whiteSpace: "nowrap", opacity: ease(frame, goodAt, 12) }}>
          <Tick at={goodAt + 6} size={26} color={OK} />
          <span>
            <b style={{ color: OK_INK }}>A good key</b>: the column queries filter on most
            <span style={{ opacity: ease(frame, evenAt, 10) }}>, with partitions even in size and not too small</span>
          </span>
        </div>

        {/* ── A function on the key ── */}
        {listing(PARTITION.fn, fnAt, undefined, fnAt + 8)}
        <PlanBox
          x={PLAN_X}
          top={y(LIST_Y) - 30}
          width={860}
          at={appliedAt - 4}
          lines={[
            { text: `File Filters: ${PARTITION.fn.fileFilters}`, at: appliedAt },
            { text: `Scanning Files: ${PARTITION.fn.scanning}`, at: stillAt - 2, mark: stillAt + 2, strong: true },
            { text: `Total Files Read: ${PARTITION.fn.filesRead}`, at: stillAt + 2 },
          ]}
        />
        <Note at={fnAt + 6} x={X0} y={y(858)}>
          <span style={{ ...note(23, INK_SOFT), whiteSpace: "nowrap" }}>
            A function on the key defeats pruning on many engines
            <span style={{ opacity: ease(frame, appliedAt, 10) }}>; DuckDB applies it to each folder&apos;s name</span>
            <span style={{ color: INK, fontWeight: 650, opacity: ease(frame, checkAt, 10) }}>. Check your engine&apos;s plan.</span>
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
