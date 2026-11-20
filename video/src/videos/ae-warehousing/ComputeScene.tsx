import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, INK, INK_SOFT, label, note } from "../../editorial/style";
import { ColumnRule, Note, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ds } from "../../theme/brand";
import { COMPUTE_MODEL } from "./data";
import { Drift, Mark, OK, OK_INK, Spot, X0, KindTag } from "./parts";

const COL_X = [120, 700, 1280];
const RULES = [650, 1230];
const INTRO_Y = 300;
const HEAD_Y = 352;
const BADGE_Y = 488;
const ROW_Y = 548;
const ROW_STEP = 60;
const LABEL_W = 380;
const TICK_X = 520;
const TICK_PITCH = 16;
const TICK_W = 11;
const TICK_H = 30;
const RESULT_X = TICK_X + 60 * TICK_PITCH + 26;
const LEVER_Y = 838;
/** The wait before a suspend: billed like the busy minutes, drawn lighter. */
const WAIT = ds("green", 300);
/** The two minutes of the hour the dashboard keeps the cluster busy. */
const BUSY = [14, 44];

/**
 * Question 9. What each warehouse bills its compute by, in three columns:
 * Snowflake's credits per second while running, BigQuery's bytes scanned (or
 * reserved slots), Redshift's provisioned nodes. Then the video's own model:
 * an hour as sixty minute ticks, two of them busy. Billed by time and left
 * running, all sixty count, in red; suspended when idle, the two, in green,
 * and the wait before each suspend, billed too, a lighter tick after each;
 * billed by bytes on demand, the idle minutes cost nothing and only the scan
 * counts. Then the lever each billing model rewards.
 */
export const ComputeScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("compute").from;
  const qAt = n.word("compute", "Question nine");
  const qTextAt = n.word("compute", "What is a virtual warehouse");
  const runsAt = n.word("compute-def", "the compute that runs the queries");
  const apartAt = n.word("compute-def", "sized apart from the storage");
  const snowAt = n.word("compute-def", "Snowflake bills credits");
  const secondAt = n.word("compute-def", "per second");
  const bqAt = n.word("compute-def", "BigQuery bills the bytes scanned");
  const slotsAt = n.word("compute-def", "reserved slots");
  const rsAt = n.word("compute-def", "Redshift bills its provisioned nodes");
  const modelAt = n.word("compute-model", "Here's a model, not a measurement");
  const busyAt = n.word("compute-model", "busy for two minutes an hour");
  const leftAt = n.word("compute-model", "Billed by time and left running");
  const sixtyAt = n.word("compute-model", "sixty minutes");
  const suspendAt = n.word("compute-suspend", "Suspended when idle");
  const twoAt = n.word("compute-suspend", "about two");
  const waitAt = n.word("compute-suspend", "plus the wait before each suspend");
  const bytesAt = n.word("compute-bytes", "Billed by bytes on demand");
  const idleAt = n.word("compute-bytes", "idle time costs nothing");
  const scanAt = n.word("compute-bytes", "only the scan counts");
  const mattersAt = n.word("compute-lever", "the billing model matters");
  const scannedAt = n.word("compute-lever", "less data scanned");
  const timeAt = n.word("compute-lever", "less compute time");
  const end = n.beat("compute-lever").to;

  const m = COMPUTE_MODEL;
  const rowTop = (i: number) => y(ROW_Y) + i * h(ROW_STEP);
  const tickH = h(TICK_H);

  const rows: { label: React.ReactNode; at: number; tick: (min: number) => { color: string; on: number } | null; result?: React.ReactNode; resultAt?: number }[] = [
    {
      label: "Busy",
      at: busyAt,
      tick: (min) => (BUSY.includes(min) ? { color: BAR, on: ease(frame, busyAt + 6 + BUSY.indexOf(min) * 4, 8) } : null),
      result: (
        <span style={{ color: BLUE_INK }}>
          <Num>{m.busyMinutes}</Num> min
        </span>
      ),
      resultAt: busyAt + 12,
    },
    {
      label: "Billed by time, left running",
      at: leftAt,
      tick: (min) => ({ color: ACCENT, on: ease(frame, leftAt + 6 + min * 0.5, 6) }),
      result: (
        <span style={{ color: ACCENT_INK }}>
          <Num>{m.hourMinutes}</Num> min
        </span>
      ),
      resultAt: sixtyAt,
    },
    {
      label: "Suspended when idle",
      at: suspendAt,
      tick: (min) => {
        if (BUSY.includes(min)) return { color: OK, on: ease(frame, suspendAt + 6 + BUSY.indexOf(min) * 4, 8) };
        // The wait before each suspend, billed too: a lighter tick after each busy one.
        const after = BUSY.findIndex((b) => min > b && min <= b + m.suspendWaitMinutes);
        return after >= 0 ? { color: WAIT, on: ease(frame, waitAt + 4 + after * 4, 8) } : null;
      },
      result: (
        <span style={{ color: OK_INK }}>
          about <Num>{m.busyMinutes}</Num> min
          <span style={{ opacity: ease(frame, waitAt, 10) }}>, plus each wait</span>
        </span>
      ),
      resultAt: twoAt,
    },
    {
      label: "Billed by bytes, on demand",
      at: bytesAt,
      tick: () => null,
      result: <span style={{ color: OK_INK }}>only the scan</span>,
      resultAt: scanAt,
    },
  ];

  return (
    <AbsoluteFill>
      <Sfx name="el-pop" at={secondAt} level={-30} />
      <Sfx name="el-tap" at={snowAt} level={-34} />
      <Sfx name="el-tap" at={bqAt} level={-34} />
      <Sfx name="el-tap" at={rsAt} level={-34} />
      <Sfx name="el-tap" at={modelAt} level={-33} />
      <Sfx name="el-tap" at={busyAt + 6} level={-34} />
      <Sfx name="el-sprinkle" at={leftAt + 6} level={-33} />
      <Sfx name="el-tap" at={suspendAt + 6} level={-34} />
      <Sfx name="el-tap" at={waitAt + 4} level={-35} />
      <Sfx name="el-pencil" at={bytesAt + 4} level={-35} />
      <Sfx name="el-pencil" at={scannedAt} level={-35} />
      <Sfx name="el-pencil" at={timeAt} level={-35} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={9} at={qAt - 4} textAt={qTextAt - 2} size={60} width={1340}>
          What is a virtual warehouse / slot / compute cluster, and how does it drive cost?
        </QuestionCard>
        <Spot art="stopwatch" at={secondAt} left={1600} top={y(96)} width={150} />

        <Note at={runsAt} x={X0} y={y(INTRO_Y)}>
          <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>
            The compute that runs the queries<span style={{ color: INK_SOFT, opacity: ease(frame, apartAt, 10) }}>, sized apart from the storage</span>
          </span>
        </Note>

        {/* ── What each bills ── */}
        {RULES.map((x, i) => (
          <ColumnRule key={x} x={x} top={y(HEAD_Y)} height={h(84)} at={i === 0 ? bqAt : rsAt} />
        ))}
        {[
          { name: "Snowflake", line: "Credits per second while running", at: snowAt, lineAt: secondAt },
          { name: "BigQuery", line: "Bytes scanned, or reserved slots", at: bqAt, lineAt: bqAt + 10 },
          { name: "Redshift", line: "Provisioned nodes, or Serverless capacity (RPUs)", at: rsAt, lineAt: rsAt + 10 },
        ].map((c, i) => (
          <React.Fragment key={c.name}>
            <Note at={c.at - 2} x={COL_X[i]} y={y(HEAD_Y)}>
              <span style={{ ...label(28, INK), whiteSpace: "nowrap" }}>{c.name}</span>
            </Note>
            <Note at={c.lineAt} x={COL_X[i]} y={y(HEAD_Y) + h(42)}>
              <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>
                {i === 1 ? (
                  <>
                    Bytes scanned<span style={{ opacity: ease(frame, slotsAt, 10) }}>, or reserved slots</span>
                  </>
                ) : (
                  c.line
                )}
              </span>
            </Note>
          </React.Fragment>
        ))}

        {/* ── A model: one hour, two busy minutes ── */}
        <Note at={modelAt} x={X0} y={y(BADGE_Y)}>
          <span style={{ ...note(23, INK), whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: "0.6em", fontSize: 23 }}>
            <KindTag kind="model" />
            <span style={{ opacity: ease(frame, busyAt - 4, 10) }}>
              A dashboard keeps a cluster busy <Num>{m.busyMinutes}</Num> minutes in an hour
            </span>
          </span>
        </Note>
        {rows.map((r, i) => (
          <React.Fragment key={i}>
            <div style={{ position: "absolute", left: X0, top: rowTop(i) + tickH / 2 - 15, width: LABEL_W, ...note(22, INK), whiteSpace: "nowrap", opacity: ease(frame, r.at, 12) }}>
              {r.label}
            </div>
            <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
              {Array.from({ length: m.hourMinutes }, (_, min) => {
                const p = ease(frame, r.at + 2 + min * 0.25, 8);
                if (p <= 0) return null;
                const t = r.tick(min);
                const fill = t && t.on > 0 ? `color-mix(in srgb, ${t.color} ${Math.round(100 * t.on)}%, ${ds("gray", 200)})` : ds("gray", 200);
                return <rect key={min} x={TICK_X + min * TICK_PITCH} y={rowTop(i) + tickH * (1 - p)} width={TICK_W} height={tickH * p} rx={2} fill={fill} />;
              })}
            </svg>
            {r.result ? (
              <div style={{ position: "absolute", left: RESULT_X, top: rowTop(i) + tickH / 2 - 15, ...note(23, INK), fontWeight: 500, whiteSpace: "nowrap", opacity: ease(frame, r.resultAt ?? r.at, 10) }}>
                {r.result}
              </div>
            ) : null}
          </React.Fragment>
        ))}
        {/* Billed by bytes: the scans, the only thing that counts. */}
        {BUSY.map((min, k) => {
          const p = ease(frame, scanAt - 4 + k * 4, 10);
          if (p <= 0) return null;
          return (
            <div
              key={min}
              style={{
                position: "absolute",
                left: TICK_X + min * TICK_PITCH - 3,
                top: rowTop(3) - 4,
                width: (TICK_W + 6) * p,
                height: tickH + 8,
                borderRadius: 3,
                background: BAR,
              }}
            />
          );
        })}
        <Note at={idleAt} x={TICK_X} y={rowTop(3) + tickH + h(12)}>
          <span style={{ ...note(21, INK_SOFT), whiteSpace: "nowrap" }}>Idle minutes cost nothing</span>
        </Note>

        {/* ── The lever ── */}
        <Note at={mattersAt} x={X0} y={y(LEVER_Y)}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>
            The billing model picks the lever:
            <span style={{ opacity: ease(frame, scannedAt - 2, 10) }}>
              {" "}
              <Mark at={scannedAt + 4}>less data scanned</Mark>
            </span>
            <span style={{ opacity: ease(frame, timeAt - 2, 10) }}>
              {" "}
              or <Mark at={timeAt + 4}>less compute time</Mark>
            </span>
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
