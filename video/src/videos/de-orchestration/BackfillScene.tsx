import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QMono, QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, HIGHLIGHT, INK, INK_SOFT, PAPER, label, note, svgText } from "../../editorial/style";
import { Note, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { BACKFILL, count, fullRows, REFRESH } from "./data";
import { Drift, lineOf, MARK, MARK_OK, OK_INK, PyListing, X0 } from "./parts";

/** The Pipelines page's backfill listing, word for word. */
const TASK = [
  "@task",
  'def process_partition(ds: str):  # ds = "2024-06-01" injected by Airflow',
  '    run_sql(f"""',
  "        DELETE FROM events_clean WHERE event_date = '{ds}';",
  "        INSERT INTO events_clean",
  "        SELECT * FROM events_raw WHERE event_date = '{ds}';",
  '    """)',
];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const GRID_X = 1104;
const CELL = 18;
const PITCH = 21;
/** The cost chart: days along, rows on a log scale. */
const CH_X0 = 210;
const CH_X1 = 1240;
const LOG_LO = Math.log10(4_000);
const LOG_HI = Math.log10(12_000_000);

/**
 * Question 6. What a backfill is for, and the design that makes it a loop:
 * the Pipelines page's task, parameterized by its date and overwriting its
 * own partition; a year of 2025 as 365 daily partitions, run four at a time
 * (Pyodide, check.mjs: 92 waves); and why the loop keeps each run small,
 * from charts/incremental-vs-full-refresh.mjs: at 8,000 rows a day, a full
 * rebuild on day 730 reprocesses 6,040,000 rows, 755 times one partition.
 */
export const BackfillScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("backfill").from;
  const qAt = n.word("backfill", "Question six");
  const textAt = n.word("backfill", "What is a backfill");
  const histAt = n.word("backfill", "It reprocesses history");
  const reasons = [
    { text: "fill a new table", at: n.word("backfill", "fill a new table") },
    { text: "fix a bug", at: n.word("backfill", "fix a bug") },
    { text: "apply a schema change", at: n.word("backfill", "apply a schema change") },
  ];
  const dayOneAt = n.word("backfill", "Design for it from day one");
  const dateAt = n.word("backfill", "give every run a date");
  const idemAt = n.word("backfill", "make it idempotent");
  const ownAt = n.word("backfill", "each partition runs on its own");
  const yearAt = n.word("bf-year", "a year of history");
  const runsAt = n.word("bf-year", "three hundred sixty-five daily runs");
  const airAt = n.word("bf-year", "In Airflow, catchup");
  const dagAt = n.word("bf-year", "in Dagster, partitioned assets");
  const thrAt = n.word("bf-year", "Throttle them");
  const fourAt = n.word("bf-year", "four at a time");
  const keepAt = n.word("bf-year", "the source and the warehouse keep up");
  const loopAt = n.word("bf-cost", "That loop keeps each run small");
  const modelAt = n.word("bf-cost", "Model a table");
  const eightAt = n.word("bf-cost", "eight thousand rows a day");
  const rebuildAt = n.word("bf-cost", "rebuilding everything");
  const sixAt = n.word("bf-cost", "over six million rows a run");
  const ratioAt = n.word("bf-cost", "seven hundred fifty-five times");
  const end = n.beat("bf-cost").to;

  // ── The year, a cell a day, filled four at a time ─────────────────────────
  const gridTop = y(338);
  const cells: { m: number; d: number; i: number }[] = [];
  BACKFILL.byMonth.forEach((days, m) => {
    for (let d = 0; d < days; d++) cells.push({ m, d, i: cells.length });
  });
  // One wave every 1.5 frames, from the throttle onward.
  const fillFrom = fourAt + 2;
  const waveNow = (frame - fillFrom) / 1.5;
  const waveOf = (i: number) => Math.floor(i / BACKFILL.parallel);

  // ── The cost of one run ───────────────────────────────────────────────────
  const plotTop = y(694);
  const plotBot = y(866);
  const dx = (d: number) => CH_X0 + (d / REFRESH.days) * (CH_X1 - CH_X0);
  const ly = (v: number) => plotBot - ((Math.log10(v) - LOG_LO) / (LOG_HI - LOG_LO)) * (plotBot - plotTop);
  const fullP = ease(frame, rebuildAt, 40);
  const fullPath = Array.from({ length: 61 }, (_, k) => (k / 60) * REFRESH.days)
    .filter((d) => d <= REFRESH.days * fullP + 0.001)
    .map((d, k) => `${k ? "L" : "M"}${dx(d)},${ly(fullRows(d))}`)
    .join(" ");
  const incP = ease(frame, eightAt, 24);

  return (
    <AbsoluteFill>
      {reasons.map((r) => (
        <Sfx key={r.text} name="el-tap" at={r.at} level={-38} />
      ))}
      <Sfx name="el-sprinkle" at={runsAt} level={-35} />
      <Sfx name="el-sprinkle" at={fillFrom} level={-35} />
      <Sfx name="el-pencil" at={eightAt} level={-36} />
      <Sfx name="el-whoosh" at={rebuildAt} level={-37} />
      <Sfx name="el-pop" at={ratioAt} level={-34} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={6} at={qAt - 4} textAt={textAt - 4} size={56}>
          What is a backfill, and how do you design for it?
        </QuestionCard>

        <Note at={histAt} x={X0} y={y(284)}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            reprocess history to{" "}
            {reasons.map((r, i) => (
              <span key={r.text} style={{ opacity: ease(frame, r.at - 2, 8), fontWeight: 650, color: BLUE_INK }}>
                {r.text}
                {i < reasons.length - 1 ? <span style={{ color: INK, fontWeight: 400 }}>{i === 0 ? ", " : ", or "}</span> : null}
              </span>
            ))}
          </span>
        </Note>

        {/* The task, parameterized by its date. */}
        <PyListing
          lines={TASK}
          x={X0}
          top={y(338)}
          width={930}
          size={20}
          at={dayOneAt - 2}
          marks={[
            { line: lineOf(TASK, "def process_partition"), at: dateAt, color: MARK },
            { line: lineOf(TASK, "DELETE FROM"), at: idemAt, color: MARK_OK },
          ]}
        />
        <Note at={ownAt} x={X0} y={y(612)}>
          <span style={{ ...note(23, INK_SOFT), whiteSpace: "nowrap" }}>
            each date overwrites its own partition: run it once or twice, same table
          </span>
        </Note>

        {/* A year of partitions. */}
        <Note at={yearAt} x={GRID_X - 44} y={y(290)}>
          <span style={{ ...note(24, INK), fontWeight: 700, whiteSpace: "nowrap" }}>
            2025: <span style={{ color: BLUE_INK, opacity: ease(frame, runsAt, 10) }}>{BACKFILL.partitions} daily partitions</span>
          </span>
        </Note>
        <Note at={thrAt} x={GRID_X - 44} y={y(662)}>
          <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>
            throttled
            <span style={{ opacity: ease(frame, fourAt, 10) }}>
              : <Num>{BACKFILL.parallel}</Num> at a time, <Num>{BACKFILL.waves}</Num> waves
            </span>
            <span style={{ color: OK_INK, opacity: ease(frame, keepAt, 10) }}>, so the source keeps up</span>
          </span>
        </Note>
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          {cells.map((c) => {
            const p = ease(frame, runsAt + c.m * 1.5, 8);
            if (p <= 0) return null;
            const w = waveOf(c.i);
            const done = waveNow >= w + 1;
            const running = waveNow >= w && !done;
            const fill = done ? BAR : running ? HIGHLIGHT : PAPER;
            return (
              <rect
                key={c.i}
                x={GRID_X + c.d * PITCH}
                y={gridTop + c.m * h(PITCH)}
                width={CELL}
                height={h(CELL)}
                rx={3}
                fill={fill}
                opacity={done ? 0.85 : 1}
                stroke={running ? INK : INK_SOFT}
                strokeWidth={running ? 1.6 : 1}
                strokeOpacity={p * (done ? 0 : 0.6)}
                fillOpacity={p}
              />
            );
          })}
          {MONTHS.map((m, i) => (
            <text key={m} x={GRID_X - 12} y={gridTop + i * h(PITCH) + h(CELL) - 2} textAnchor="end" style={svgText({ ...label(19, INK_SOFT), fontWeight: 600 })} opacity={ease(frame, runsAt + i * 1.5, 8)}>
              {m}
            </text>
          ))}
        </svg>
        <Note at={airAt} x={GRID_X - 44} y={y(586)}>
          <span style={{ ...label(21, INK), whiteSpace: "nowrap" }}>
            Airflow: <QMono>catchup=True</QMono> from a <QMono>start_date</QMono>
          </span>
        </Note>
        <Note at={dagAt} x={GRID_X - 44} y={y(624)}>
          <span style={{ ...label(21, INK), whiteSpace: "nowrap" }}>Dagster: partitioned assets</span>
        </Note>

        {/* Why the loop: the cost of one run, a model. */}
        <Note at={loopAt} x={X0} y={y(656)}>
          <span style={{ ...note(24, INK), fontWeight: 700, whiteSpace: "nowrap" }}>
            rows one run processes
            <span style={{ ...label(21, INK_SOFT), fontWeight: 500, opacity: ease(frame, modelAt, 10) }}>
              {" "}
              · a model, <Num>{count(REFRESH.daily)}</Num> new rows a day
            </span>
          </span>
        </Note>
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: ease(frame, loopAt, 12) }}>
          {[10_000, 100_000, 1_000_000, 10_000_000].map((v) => (
            <g key={v}>
              <line x1={CH_X0} x2={CH_X1} y1={ly(v)} y2={ly(v)} stroke={INK_SOFT} strokeWidth={1} strokeDasharray="2 6" opacity={0.5} />
              <text x={CH_X0 - 12} y={ly(v) + 7} textAnchor="end" style={svgText({ ...label(19, INK_SOFT), fontWeight: 500 })}>
                {v >= 1e6 ? `${v / 1e6}M` : `${v / 1000}k`}
              </text>
            </g>
          ))}
          <line x1={CH_X0} x2={CH_X1} y1={plotBot} y2={plotBot} stroke={INK} strokeWidth={1.6} />
          {[0, 365, 730].map((d) => (
            <text key={d} x={dx(d)} y={plotBot + 28} textAnchor="middle" style={svgText({ ...label(19, INK_SOFT), fontWeight: 500 })}>
              {d === 0 ? "day 0" : `day ${d}`}
            </text>
          ))}
          {/* One day's partition: flat. */}
          <line x1={CH_X0} x2={CH_X0 + (CH_X1 - CH_X0) * incP} y1={ly(REFRESH.daily)} y2={ly(REFRESH.daily)} stroke={BAR} strokeWidth={3.2} />
          {/* Rebuilding everything: grows with the table. */}
          {fullPath ? <path d={fullPath} fill="none" stroke={ACCENT} strokeWidth={3.2} /> : null}
          {/* The gap on day 730. */}
          <g opacity={ease(frame, ratioAt, 12)}>
            <path
              d={`M${CH_X1 + 14},${ly(REFRESH.fullAtEnd)} l10,0 L${CH_X1 + 24},${ly(REFRESH.daily)} l-10,0`}
              fill="none"
              stroke={INK}
              strokeWidth={2}
            />
          </g>
        </svg>
        <Note at={eightAt + 10} x={CH_X1 + 40} y={ly(REFRESH.daily) - 15}>
          <span style={{ ...note(23, BLUE_INK), fontWeight: 700, whiteSpace: "nowrap" }}>
            one day&apos;s partition: <Num>{count(REFRESH.daily)}</Num>
          </span>
        </Note>
        <Note at={sixAt} x={CH_X1 + 40} y={ly(REFRESH.fullAtEnd) - 15}>
          <span style={{ ...note(23, ACCENT_INK), fontWeight: 700, whiteSpace: "nowrap" }}>
            rebuild everything: <Num>{count(REFRESH.fullAtEnd)}</Num>
          </span>
        </Note>
        <Note at={ratioAt + 4} x={CH_X1 + 40} y={(ly(REFRESH.fullAtEnd) + ly(REFRESH.daily)) / 2 - 18}>
          <span style={{ ...note(30, INK), fontWeight: 800, whiteSpace: "nowrap" }}>
            <Num>{REFRESH.ratio}</Num>×
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
