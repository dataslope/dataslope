import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { during, ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, INK, INK_SOFT, label, note, svgText } from "../../editorial/style";
import { Badge, Leader, Note, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { inkOf } from "../../theme/brand";
import { PRUNE } from "./data";
import { Box, Drift, Listing, MARK_BAD, OK, OK_INK, X0 } from "./parts";

const BADGE_Y = 300;
// The chart (the page's partition-pruning-scan), in page pixels on x and
// layout positions on y.
const PX0 = 236;
const PX1 = 860;
const PY_TOP = 372;
const PY_BOTTOM = 690;
const GB_MAX = 960;
// The month folders.
const FX = 1000;
const FOLDER_W = 170;
const FOLDER_H = 60;
const FOLDER_GX = 20;
const FOLDER_Y = 362;
const FOLDER_STEP = 78;
const PLAN_Y = 612;
/** Where the 7-day note starts: right of and under the rising line. */
const SEVEN_X = 470;

/**
 * Question 6. Right, a table split into a folder per month; a filter on the
 * month reads one and skips the rest: pruning. Left, the page's model, drawn
 * from its chart's own constants: gigabytes scanned against the days a query
 * filters to, flat at 876 GB unpartitioned and rising from nothing
 * partitioned by day, the 7-day tile at 16.8 GB. Then the measured run on
 * the million sales in twelve month folders, with DuckDB's own plan lines:
 * March scans 1 of 12; region reads all 12. Then the chart's right end,
 * where the two lines meet: a query over all history saves nothing.
 */
export const PruneScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("prune").from;
  const qAt = n.word("prune", "Question six");
  const qTextAt = n.word("prune", "What is partitioning");
  const splitsAt = n.word("prune-def", "Partitioning splits a table into segments");
  const dateAt = n.word("prune-def", "usually a date");
  const matchAt = n.word("prune-def", "reads only the matching segments");
  const skipsAt = n.word("prune-def", "skips the rest");
  const pruningAt = n.word("prune-def", "That's pruning");
  const modelAt = n.word("prune-model", "The page's model");
  const yearAt = n.word("prune-model", "a year of data");
  const unpartAt = n.word("prune-model", "Unpartitioned");
  const fullAt = n.word("prune-model", "eight hundred seventy-six gigabytes");
  const dayAt = n.word("prune-model", "Partitioned by day");
  const sevenAt = n.word("prune-model", "a seven-day dashboard tile");
  const sixteenAt = n.word("prune-model", "sixteen point eight");
  const fiftyAt = n.word("prune-model", "about fifty times less");
  const billedAt = n.word("prune-model", "billed that way");
  const duckAt = n.word("prune-run", "In DuckDB");
  const monthAt = n.word("prune-run", "a folder per month");
  const marchAt = n.word("prune-run", "a query for March");
  const oneAt = n.word("prune-run", "scans one file of twelve");
  const regionAt = n.word("prune-run", "Filter on region instead");
  const allAt = n.word("prune-run", "reads all twelve");
  const onlyAt = n.word("prune-run", "pruning only works on the partition column");
  const historyAt = n.word("prune-not", "a query over all of history");
  const nothingAt = n.word("prune-not", "saves nothing");
  const everythingAt = n.word("prune-not", "partition everything");
  const end = n.beat("prune-not").to;

  const m = PRUNE.model;
  const MARCH = PRUNE.months.indexOf("2024-03");
  const px = (days: number) => PX0 + (days / m.days) * (PX1 - PX0);
  const py = (gb: number) => y(PY_BOTTOM) - (gb / GB_MAX) * (y(PY_BOTTOM) - y(PY_TOP));
  const flat = ease(frame, unpartAt + 2, 20);
  const rising = ease(frame, dayAt + 2, 24);
  const chartIn = ease(frame, modelAt, 14);
  const ring = ease(frame, historyAt + 4, 12);

  // Which folders are lit: the definition's one month, March as DuckDB read
  // it, and every folder for the region filter (red).
  const defLit = during(frame, matchAt, modelAt, 10);
  const defSkip = during(frame, skipsAt, modelAt, 10);
  const marchLit = during(frame, oneAt - 2, regionAt, 10);
  const regionLit = ease(frame, allAt - 2, 10);
  const folderX = (i: number) => FX + (i % 4) * (FOLDER_W + FOLDER_GX);
  const folderY = (i: number) => y(FOLDER_Y) + Math.floor(i / 4) * h(FOLDER_STEP);

  const marchPlan = [`File Filters: ${PRUNE.march.fileFilters}`, `Scanning Files: ${PRUNE.march.scanning}`];
  const regionPlan = [`Filters: ${PRUNE.region.filters}`, `Total Files Read: ${PRUNE.region.filesRead}`];
  const [readOne, ofAll] = (PRUNE.march.scanning ?? "").split("/");
  if (!readOne || !ofAll) throw new Error("the March query has no Scanning Files line");

  const xTicks = [0, 90, 180, 270, 365];
  const yTicks = [0, 250, 500, 750];

  return (
    <AbsoluteFill>
      <Sfx name="el-sprinkle" at={splitsAt + 4} level={-34} />
      <Sfx name="el-pencil" at={matchAt + 2} level={-35} />
      <Sfx name="el-tap" at={modelAt} level={-33} />
      <Sfx name="el-pencil" at={unpartAt + 2} level={-35} />
      <Sfx name="el-pencil" at={dayAt + 2} level={-35} />
      <Sfx name="el-tap" at={sixteenAt} level={-33} />
      <Sfx name="el-tap" at={duckAt} level={-33} />
      <Sfx name="el-pencil" at={oneAt} level={-35} />
      <Sfx name="el-sprinkle" at={allAt - 2} level={-34} />
      <Sfx name="el-pencil" at={historyAt + 4} level={-35} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={6} at={qAt - 4} textAt={qTextAt - 2} size={60}>
          What is partitioning, and how does partition pruning save money?
        </QuestionCard>

        {/* ── The folders: a segment per month ── */}
        <Note at={splitsAt} x={FX} y={y(BADGE_Y)} out={duckAt - 2}>
          <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>
            A segment per value of a column<span style={{ opacity: ease(frame, dateAt, 10) }}>, usually a date</span>
          </span>
        </Note>
        <Note at={duckAt} x={FX} y={y(BADGE_Y)}>
          <span style={{ ...note(23, INK), whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: "0.6em", fontSize: 23 }}>
            <Badge tone="blue" size={23}>
              measured
            </Badge>
            <span>
              DuckDB, the million sales<span style={{ opacity: ease(frame, monthAt, 10) }}>, a folder per month</span>
            </span>
          </span>
        </Note>
        {PRUNE.months.map((name, i) => {
          const isMarch = i === MARCH;
          const lit = isMarch ? Math.max(defLit, marchLit) : 0;
          const skipped = isMarch ? 0 : Math.max(defSkip, marchLit);
          const tone = regionLit > 0.5 ? "bad" : lit > 0.5 ? "look" : "plain";
          return (
            <div key={name} style={{ opacity: 1 - 0.65 * skipped }}>
              <Box x={folderX(i)} y={folderY(i)} w={FOLDER_W} h={h(FOLDER_H)} at={splitsAt + 4 + i * 2} title={name} mono size={22} tone={tone} />
            </div>
          );
        })}
        <Note at={pruningAt} x={FX} y={folderY(8) + h(FOLDER_H) + h(22)} out={duckAt - 2}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            <b>Pruning:</b> a filter on that column skips the rest
          </span>
        </Note>

        {/* ── Measured: DuckDB's plan for March, then for region ── */}
        <Note at={marchAt} x={FX} y={y(PLAN_Y) - h(4)} out={oneAt - 6}>
          <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>DuckDB&rsquo;s plan</span>
        </Note>
        <Listing lines={marchPlan} x={FX} top={y(PLAN_Y) + h(30)} width={740} size={21} at={oneAt - 6} out={regionAt - 2} marks={[{ line: "Scanning Files", at: oneAt + 4 }]} />
        <Listing lines={regionPlan} x={FX} top={y(PLAN_Y) + h(30)} width={740} size={21} at={regionAt} marks={[{ line: "Total Files Read", at: allAt + 4, color: MARK_BAD }]} />
        <Note at={oneAt + 6} x={FX} y={y(PLAN_Y) - h(4)} out={regionAt - 2}>
          <span style={{ ...note(23, OK_INK), fontWeight: 500, whiteSpace: "nowrap" }}>
            March: <Num>{readOne}</Num> file of <Num>{ofAll}</Num>
          </span>
        </Note>
        <Note at={allAt + 2} x={FX} y={y(PLAN_Y) - h(4)}>
          <span style={{ ...note(23, ACCENT_INK), fontWeight: 500, whiteSpace: "nowrap" }}>
            Region: all <Num>{PRUNE.region.filesRead}</Num>
            <span style={{ color: INK, fontWeight: 500, opacity: ease(frame, onlyAt, 10) }}> · pruning works on the partition column only</span>
          </span>
        </Note>

        {/* ── The page's model ── */}
        <Note at={modelAt} x={X0} y={y(BADGE_Y)}>
          <span style={{ ...note(23, INK), whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: "0.6em", fontSize: 23 }}>
            <Badge tone="purple" size={23}>
              model
            </Badge>
            <span style={{ opacity: ease(frame, yearAt, 10) }}>
              <Num>{m.days}</Num> days × <Num>{m.gbPerDay}</Num> GB a day
            </span>
          </span>
        </Note>
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: chartIn }}>
          {yTicks.map((t) => (
            <g key={t}>
              <line x1={PX0} x2={PX1} y1={py(t)} y2={py(t)} stroke={INK} strokeOpacity={t === 0 ? 0.5 : 0.12} strokeWidth={t === 0 ? 1.5 : 1} />
              <text x={PX0 - 12} y={py(t) + 7} textAnchor="end" style={svgText(label(19, INK_SOFT))}>
                {t === yTicks[yTicks.length - 1] ? `${t} GB` : t}
              </text>
            </g>
          ))}
          {xTicks.map((t) => (
            <text key={t} x={px(t)} y={y(PY_BOTTOM) + 30} textAnchor="middle" style={svgText(label(19, INK_SOFT))}>
              {t}
            </text>
          ))}
          <text x={(PX0 + PX1) / 2} y={y(PY_BOTTOM) + 64} textAnchor="middle" style={svgText(label(20, INK_SOFT))}>
            Days the query filters to
          </text>
          {/* Unpartitioned: every query reads the whole year. */}
          <line x1={PX0} x2={PX0 + (PX1 - PX0) * flat} y1={py(m.fullGb)} y2={py(m.fullGb)} stroke={ACCENT} strokeWidth={3} strokeLinecap="round" />
          {/* Partitioned by day: a query reads its days. */}
          <line x1={PX0} x2={PX0 + (PX1 - PX0) * rising} y1={py(0)} y2={py(m.fullGb * rising)} stroke={BAR} strokeWidth={3} strokeLinecap="round" />
          {/* The 7-day tile. */}
          <g opacity={ease(frame, sevenAt + 2, 10)}>
            <line x1={px(m.typicalDays)} x2={px(m.typicalDays)} y1={py(m.fullGb)} y2={py(0)} stroke={INK} strokeOpacity={0.4} strokeDasharray="4 4" />
            <circle cx={px(m.typicalDays)} cy={py(m.typicalGb)} r={7} fill={OK} />
          </g>
          {/* Where the two lines meet: a query over all history. */}
          <circle cx={px(m.days)} cy={py(m.fullGb)} r={26 + 8 * (1 - ring)} fill="none" stroke={inkOf.yellow} strokeWidth={3} opacity={ring} />
        </svg>
        <Note at={fullAt} x={PX0 + 20} y={py(m.fullGb) - h(42)}>
          <span style={{ ...note(22, ACCENT_INK), fontWeight: 500, whiteSpace: "nowrap" }}>
            Unpartitioned: <Num>{m.fullGb}</Num> GB, every query
          </span>
        </Note>
        <Note at={dayAt + 10} x={px(150) + 30} y={py(m.fullGb * (150 / m.days)) + h(10)}>
          <span style={{ ...note(22, BLUE_INK), fontWeight: 500, whiteSpace: "nowrap" }}>Partitioned by day</span>
        </Note>
        <Leader points={[[SEVEN_X - 10, py(m.typicalGb) - h(52)], [px(m.typicalDays) + 8, py(m.typicalGb) - 3]]} at={sixteenAt} dot={false} />
        <Note at={sixteenAt} x={SEVEN_X} y={py(m.typicalGb) - h(66)}>
          <span style={{ ...note(22, OK_INK), fontWeight: 500, whiteSpace: "nowrap" }}>
            7 days: <Num>{m.typicalGb}</Num> GB
            <span style={{ opacity: ease(frame, fiftyAt, 10) }}>
              , about <Num>{Math.round(m.ratio / 10) * 10}</Num> times less
            </span>
          </span>
        </Note>
        <Note at={billedAt} x={SEVEN_X} y={py(m.typicalGb) - h(36)}>
          <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>and billed that way</span>
        </Note>
        <Note at={nothingAt} x={X0} y={y(800)}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            A query over all history saves nothing
            <span style={{ color: INK_SOFT, opacity: ease(frame, everythingAt, 10) }}>: partitioning everything is not the answer</span>
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
