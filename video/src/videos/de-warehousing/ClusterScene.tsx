import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QMono, QuestionCard, Tick } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, HIGHLIGHT, INK, INK_SOFT, label, note, svgText } from "../../editorial/style";
import { Note, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { CLUSTER, count, MB } from "./data";
import { COLUMN_TINT, Drift, OK, OK_INK, X0 } from "./parts";

const AX0 = 420;
const AX1 = 1500;
const MONTHS_Y = 322;
const SORTED_Y = 362;
const SHUFFLED_Y = 598;
const STEP = 22;
const BAR_H = 16;
const RIGHT = 1530;

const DAY = 86_400_000;
const YEAR0 = Date.UTC(2024, 0, 1);
/** Day of the year, 0 for January 1. */
const dayOf = (iso: string) => Math.round((Date.parse(`${iso}T00:00:00Z`) - YEAR0) / DAY);
const xOf = (day: number) => AX0 + (day / 366) * (AX1 - AX0);
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const monthStart = (m: number) => Math.round((Date.UTC(2024, m, 1) - YEAR0) / DAY);
/** "Feb 14". */
const short = (iso: string) => {
  const d = new Date(`${iso}T00:00:00Z`);
  return `${MONTH_NAMES[d.getUTCMonth()]} ${d.getUTCDate()}`;
};

/**
 * Question 6. The same made-up year in one Parquet file, its nine row groups
 * drawn as the date range each one's min/max statistics cover, against a
 * band for the March query. In date order each group covers about six weeks
 * and two cross March; shuffled, every group covers the year and none can be
 * skipped. The bytes are what DuckDB read for the query from each file.
 */
export const ClusterScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("cl").from;
  const qAt = n.word("cl", "Question six");
  const qTextAt = n.word("cl", "What is clustering");
  const ordersAt = n.word("cl", "It orders the rows inside the files");
  const likeAt = n.word("cl", "like values sit together");
  const minmaxAt = n.word("cl-stats", "a minimum and a maximum");
  const groupAt = n.word("cl-stats", "in each row group");
  const rowsCueAt = n.word("cl-stats", "a hundred twenty-three thousand rows");
  const dateOrderAt = n.word("cl-stats", "In date order");
  const weeksAt = n.word("cl-stats", "about six weeks");
  const marchAt = n.word("cl-stats", "a query for March");
  const twoAt = n.word("cl-stats", "two groups of nine");
  const shuffleAt = n.word("cl-shuffle", "Shuffle the same rows");
  const yearAt = n.word("cl-shuffle", "every group spans the whole year");
  const nothingAt = n.word("cl-shuffle", "Nothing can be skipped");
  const fiveAt = n.word("cl-shuffle", "five times the bytes");
  const noIndexAt = n.word("cl-shuffle", "no index needed");
  const end = n.beat("cl-shuffle").to;

  const [lo, hi] = CLUSTER.range;
  const bandX0 = xOf(dayOf(lo));
  const bandX1 = xOf(dayOf(hi) + 1);
  const overlaps = (g: { lo: string; hi: string }) => g.hi >= lo && g.lo <= hi;
  const ratio = CLUSTER.shuffled.read / CLUSTER.sorted.read;

  const panel = (
    top: number,
    groups: readonly { id: number; lo: string; hi: string }[],
    at: number,
    readAt: number,
    readColor: string,
    labels: boolean,
  ) => (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
      {groups.map((g, i) => {
        const p = ease(frame, at + i * 2, 12);
        if (p <= 0) return null;
        const hit = overlaps(g);
        const r = ease(frame, readAt + i * 1.5, 10);
        const x0 = xOf(dayOf(g.lo));
        const x1 = xOf(dayOf(g.hi) + 1);
        const yy = y(top) + i * h(STEP);
        return (
          <g key={g.id} opacity={hit ? 1 : 1 - 0.6 * r}>
            <rect
              x={x0}
              y={yy}
              width={(x1 - x0) * p}
              height={h(BAR_H)}
              rx={3}
              fill={hit && r > 0 ? `color-mix(in srgb, ${readColor} ${100 * r}%, ${COLUMN_TINT.sale_date})` : COLUMN_TINT.sale_date}
              stroke={INK}
              strokeOpacity={0.25}
            />
            {labels && hit ? (
              <text x={x1 + 10} y={yy + h(BAR_H) - 2} style={svgText(label(19, INK))} opacity={ease(frame, readAt + 6, 10)}>
                {short(g.lo)} to {short(g.hi)}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );

  return (
    <AbsoluteFill>
      <Sfx name="el-sprinkle" at={likeAt + 2} level={-34} />
      <Sfx name="el-pencil" at={marchAt} level={-35} />
      <Sfx name="el-tap" at={twoAt} level={-35} />
      <Sfx name="el-sprinkle" at={shuffleAt + 4} level={-34} />
      <Sfx name="el-tap" at={fiveAt} level={-35} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={6} at={qAt - 4} textAt={qTextAt - 2} size={60}>
          What is clustering (or sorting) within a partition?
        </QuestionCard>
        <Note at={ordersAt} x={X0} y={y(244)}>
          <span style={{ ...note(23, INK_SOFT), whiteSpace: "nowrap" }}>
            Rows ordered inside the files
            <span style={{ opacity: ease(frame, likeAt, 10) }}>, so like values sit together.</span>
          </span>
        </Note>
        <Note at={minmaxAt} x={X0} y={y(278)}>
          <span style={{ ...note(23, INK_SOFT), whiteSpace: "nowrap" }}>
            Every column&apos;s minimum and maximum
            <span style={{ opacity: ease(frame, groupAt, 10) }}>, kept for each row group</span>
            <span style={{ opacity: ease(frame, rowsCueAt, 10) }}>
              {" "}
              of <Num>{count(CLUSTER.rowGroupRows)}</Num> rows
            </span>
            <span style={{ opacity: ease(frame, dateOrderAt, 10) }}>; for the dates, the span drawn</span>
          </span>
        </Note>

        {/* ── The year, and March ── */}
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          <g>
            {MONTH_NAMES.map((m, i) => (
              <g key={m} opacity={ease(frame, ordersAt + 4 + i * 2, 10)}>
                <line x1={xOf(monthStart(i))} x2={xOf(monthStart(i))} y1={y(MONTHS_Y) + 4} y2={y(MONTHS_Y) + 28} stroke={INK} strokeOpacity={0.35} />
                <text x={xOf(monthStart(i)) + 6} y={y(MONTHS_Y) + 22} style={svgText(label(19, INK_SOFT))}>
                  {m}
                </text>
              </g>
            ))}
          </g>
          <rect
            x={bandX0}
            y={y(MONTHS_Y) - 4}
            width={bandX1 - bandX0}
            height={(y(SHUFFLED_Y) + 9 * h(STEP) + 6 - (y(MONTHS_Y) - 4)) * ease(frame, marchAt, 14)}
            fill={HIGHLIGHT}
            opacity={0.55}
          />
        </svg>
        <Note at={marchAt + 4} x={bandX0} y={y(SHUFFLED_Y) + 9 * h(STEP) + h(12)}>
          <span style={{ ...note(21, INK), whiteSpace: "nowrap" }}>
            <QMono>WHERE sale_date BETWEEN</QMono> March 1 <QMono>AND</QMono> March 31
          </span>
        </Note>

        {/* ── In date order ── */}
        <div style={{ position: "absolute", left: X0, top: y(SORTED_Y) - 4, width: AX0 - X0 - 20, opacity: ease(frame, likeAt - 2, 12) }}>
          <div style={{ ...label(23, INK) }}>in date order</div>
          <div style={{ ...note(20, INK_SOFT), marginTop: 4, opacity: ease(frame, weeksAt, 10) }}>
            <Num>{CLUSTER.sorted.groups.length}</Num> row groups, about six weeks each
          </div>
        </div>
        {panel(SORTED_Y, CLUSTER.sorted.groups, likeAt, twoAt, BAR, true)}
        <div style={{ position: "absolute", left: RIGHT, top: y(SORTED_Y) + h(STEP) * 2, opacity: ease(frame, twoAt + 4, 12) }}>
          <div style={{ ...note(24, OK_INK), fontWeight: 700, whiteSpace: "nowrap" }}>
            <Num>{CLUSTER.sorted.overlapping}</Num> of <Num>{CLUSTER.sorted.groups.length}</Num> groups read
          </div>
          <div style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>
            <Num>{MB(CLUSTER.sorted.read, 2)}</Num> read
          </div>
        </div>

        {/* ── Shuffled ── */}
        <div style={{ position: "absolute", left: X0, top: y(SHUFFLED_Y) - 4, width: AX0 - X0 - 20, opacity: ease(frame, shuffleAt, 12) }}>
          <div style={{ ...label(23, INK) }}>shuffled</div>
          <div style={{ ...note(20, INK_SOFT), marginTop: 4, opacity: ease(frame, yearAt, 10) }}>every group spans the year</div>
        </div>
        {panel(SHUFFLED_Y, CLUSTER.shuffled.groups, shuffleAt + 4, nothingAt, ACCENT, false)}
        <div style={{ position: "absolute", left: RIGHT, top: y(SHUFFLED_Y) + h(STEP) * 2, opacity: ease(frame, nothingAt + 4, 12) }}>
          <div style={{ ...note(24, ACCENT_INK), fontWeight: 700, whiteSpace: "nowrap" }}>
            <Num>{CLUSTER.shuffled.overlapping}</Num> of <Num>{CLUSTER.shuffled.groups.length}</Num> groups read
          </div>
          <div style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>
            <Num>{MB(CLUSTER.shuffled.read, 2)}</Num> read
            <span style={{ color: ACCENT_INK, fontWeight: 650, opacity: ease(frame, fiveAt, 10) }}>
              , <Num>{Math.round(ratio)}</Num> times as much
            </span>
          </div>
        </div>

        <div style={{ position: "absolute", left: X0, top: y(862), display: "flex", alignItems: "center", gap: 12, ...note(24, INK), whiteSpace: "nowrap", opacity: ease(frame, noIndexAt - 4, 12) }}>
          <Tick at={noIndexAt + 2} size={24} color={OK} />
          <span>
            <b style={{ color: OK_INK }}>No index:</b> the minimum and maximum do the skipping
          </span>
        </div>
      </Drift>
    </AbsoluteFill>
  );
};
