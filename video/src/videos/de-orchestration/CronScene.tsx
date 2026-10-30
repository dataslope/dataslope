import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard, Tick } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, INK, INK_SOFT, label, note, svgText } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { Drift, Edge, lineOf, OK, OK_INK, Pill, PyListing, pulse, TaskBox, X0 } from "./parts";

const CRONTAB = ["0 1 * * *  extract.sh", "0 2 * * *  transform.sh"];
/** The night's clock, 00:00 to 04:00. */
const T0 = 260;
const PER_HOUR = 150;
const tx = (hours: number) => T0 + hours * PER_HOUR;
/** The orchestrator's DAG, top to bottom. */
const DAG_X = 1110;
const NODE_W = 240;

/**
 * Question 1. Cron starts a command at a set time and nothing more: on the
 * night extract runs long, transform starts on schedule over half the data.
 * An orchestrator runs the page's DAG (extract, transform, a quality gate,
 * load, publish, with alert and halt on a failed gate), each task waiting for
 * the ones before it, plus retries, backfills, monitoring, lineage and the
 * history of every run.
 */
export const CronScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("cron").from;
  const qAt = n.word("cron", "Question one");
  const textAt = n.word("cron", "What does an orchestrator");
  const cronAt = n.word("cron", "Cron, the Unix job scheduler");
  const setAt = n.word("cron", "starts a command at a set time");
  const extAt = n.word("cron", "Schedule extract at one");
  const trAt = n.word("cron", "and transform at two");
  const longAt = n.word("cron", "The night extract runs long");
  const anywayAt = n.word("cron", "transform starts anyway");
  const halfAt = n.word("cron", "on half the data");
  const dagAt = n.word("cron-dag", "An orchestrator runs a DAG");
  const expandAt = n.word("cron-dag", "a directed acyclic graph");
  const depsAt = n.word("cron-dag", "tasks joined by their dependencies");
  const succeedAt = n.word("cron-dag", "upstream tasks succeed");
  const extras = [
    { text: "retries", at: n.word("cron-dag", "come retries") + 3 },
    { text: "backfills", at: n.word("cron-dag", "backfills") },
    { text: "monitoring", at: n.word("cron-dag", "monitoring") },
    { text: "lineage", at: n.word("cron-dag", "lineage") },
  ];
  const threeAt = n.word("cron-dag", "Airflow, Dagster and Prefect");
  const historyAt = n.word("cron-dag", "every run's history");
  const neitherAt = n.word("cron-dag", "Cron keeps neither");
  const end = n.beat("cron-dag").to;

  // ── Cron's night ──────────────────────────────────────────────────────────
  const rowY = { extract: y(478), transform: y(552) };
  const barH = h(44);
  const axisY = y(610);
  const extEnd = 1.67 + (2.58 - 1.67) * ease(frame, longAt + 4, 30);
  const over = Math.max(0, extEnd - 2);
  const trP = ease(frame, trAt + 4, 12);
  const trBad = ease(frame, anywayAt, 10);
  const fire = pulse(frame, anywayAt - 2, 26);
  const cronIn = ease(frame, cronAt, 12);

  // ── The DAG ───────────────────────────────────────────────────────────────
  const NODES = [
    { key: "extract", label: "extract", cy: y(300) },
    { key: "transform", label: "transform", cy: y(384) },
    { key: "gate", label: "quality gate", cy: y(468) },
    { key: "load", label: "load", cy: y(552) },
    { key: "publish", label: "publish", cy: y(636) },
  ];
  const nodeH = h(54);
  const run = (i: number) => succeedAt - 4 + i * 7;

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={cronAt + 2} level={-36} />
      <Sfx name="el-whoosh" at={longAt + 4} level={-36} />
      <Sfx name="el-scratch" at={halfAt} level={-34} />
      <Sfx name="el-pencil" at={depsAt} level={-36} />
      {NODES.map((nd, i) => (
        <Sfx key={nd.key} name="el-tap" at={run(i) + 2} level={-38} />
      ))}
      {extras.map((e) => (
        <Sfx key={e.text} name="el-tap" at={e.at} level={-37} />
      ))}

      <Drift from={from} to={end + 30}>
        <QuestionCard n={1} at={qAt - 4} textAt={textAt - 4} size={56}>
          What does an orchestrator give you over cron?
        </QuestionCard>

        {/* Cron: two lines, two times, nothing between them. */}
        <Note at={cronAt} x={X0} y={y(266)}>
          <span style={{ ...label(22, INK_SOFT), fontWeight: 700, whiteSpace: "nowrap" }}>
            cron: <span style={{ opacity: ease(frame, setAt, 10) }}>a command at a set time</span>
          </span>
        </Note>
        <PyListing
          lines={CRONTAB}
          x={X0}
          top={y(306)}
          width={560}
          size={24}
          at={cronAt + 2}
          lineAt={[cronAt + 6, cronAt + 10]}
          marks={[
            { line: lineOf(CRONTAB, "extract"), at: extAt, out: trAt },
            { line: lineOf(CRONTAB, "transform"), at: trAt, out: longAt },
          ]}
        />

        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: cronIn }}>
          {/* The clock. */}
          <line x1={tx(0)} x2={tx(4)} y1={axisY} y2={axisY} stroke={INK} strokeWidth={1.6} />
          {[0, 1, 2, 3, 4].map((hr) => (
            <g key={hr}>
              <line x1={tx(hr)} x2={tx(hr)} y1={axisY} y2={axisY + 7} stroke={INK} strokeWidth={1.4} />
              <text x={tx(hr)} y={axisY + 31} textAnchor="middle" style={svgText({ ...label(20, INK_SOFT), fontWeight: 600 })}>
                {`0${hr}:00`}
              </text>
            </g>
          ))}
          {/* Extract: an hour and forty minutes most nights, then the long one. */}
          <rect
            x={tx(1)}
            y={rowY.extract - barH / 2}
            width={(Math.min(extEnd, 2) - 1) * PER_HOUR * ease(frame, extAt + 2, 14)}
            height={barH}
            rx={4}
            fill={BAR}
            opacity={0.85}
          />
          {over > 0 ? <rect x={tx(2)} y={rowY.extract - barH / 2} width={over * PER_HOUR} height={barH} rx={4} fill={ACCENT} opacity={0.85} /> : null}
          {/* Transform: on the dot at two, whatever extract is doing. */}
          <rect
            x={tx(2)}
            y={rowY.transform - barH / 2}
            width={0.55 * PER_HOUR * trP}
            height={barH}
            rx={4}
            fill={`color-mix(in srgb, ${ACCENT} ${trBad * 100}%, ${BAR})`}
            opacity={0.85}
          />
          {/* Two o'clock: cron fires. */}
          <line
            x1={tx(2)}
            x2={tx(2)}
            y1={rowY.extract - h(56)}
            y2={axisY}
            stroke={INK}
            strokeWidth={2 + 2 * fire}
            strokeDasharray="6 5"
            opacity={ease(frame, trAt + 2, 10)}
          />
        </svg>
        {(["extract", "transform"] as const).map((k) => (
          <div
            key={k}
            style={{ position: "absolute", left: X0, top: rowY[k] - 16, ...note(24, INK), fontWeight: 600, opacity: ease(frame, k === "extract" ? extAt : trAt, 10) }}
          >
            {k}
          </div>
        ))}
        <Note at={trAt + 8} x={tx(2) + 10} y={rowY.extract - h(64)}>
          <span style={{ ...label(20, INK_SOFT), whiteSpace: "nowrap" }}>02:00: cron fires</span>
        </Note>
        <Note at={longAt + 16} x={tx(2.58) + 14} y={rowY.extract - 14}>
          <span style={{ ...note(23, ACCENT_INK), fontWeight: 700, whiteSpace: "nowrap" }}>runs long</span>
        </Note>
        <Note at={halfAt - 2} x={tx(2.55) + 14} y={rowY.transform - 14}>
          <span style={{ ...note(23, ACCENT_INK), fontWeight: 700, whiteSpace: "nowrap" }}>on half the data</span>
        </Note>
        <Note at={neitherAt} x={X0} y={y(680)}>
          <span style={{ ...note(26, ACCENT_INK), fontWeight: 700, whiteSpace: "nowrap" }}>cron: no graph, no run history</span>
        </Note>

        {/* The orchestrator: the page's DAG. */}
        <Note at={dagAt} x={DAG_X - NODE_W / 2} y={y(236)}>
          <span style={{ ...label(22, INK_SOFT), fontWeight: 700, whiteSpace: "nowrap" }}>
            an orchestrator runs a DAG<span style={{ opacity: ease(frame, expandAt, 10) }}>: directed acyclic graph</span>
          </span>
        </Note>
        {NODES.map((nd, i) => (
          <TaskBox
            key={nd.key}
            cx={DAG_X}
            cy={nd.cy}
            w={NODE_W}
            h={nodeH}
            at={dagAt + 2 + i * 3}
            tones={[
              { at: run(i) - 6, tone: "data" },
              { at: run(i), tone: "ok" },
            ]}
            size={24}
          >
            {nd.label}
          </TaskBox>
        ))}
        {NODES.slice(1).map((nd, i) => (
          <Edge
            key={nd.key}
            points={[
              [DAG_X, NODES[i].cy + nodeH / 2 + 2],
              [DAG_X, nd.cy - nodeH / 2 - 3],
            ]}
            at={depsAt + i * 3}
            dur={8}
            head={11}
            color={i === 2 ? OK : INK}
          />
        ))}
        {NODES.map((nd, i) =>
          frame >= run(i) ? (
            <div key={nd.key} style={{ position: "absolute", left: DAG_X + NODE_W / 2 + 12, top: nd.cy - 13 }}>
              <Tick at={run(i)} size={26} />
            </div>
          ) : null,
        )}
        {/* A failed gate goes to alert and halt, not to load. */}
        <Edge
          points={[
            [DAG_X + NODE_W / 2 + 50, NODES[2].cy],
            [1338, NODES[2].cy],
          ]}
          at={depsAt + 10}
          dur={10}
          head={11}
          color={ACCENT}
          dash="7 5"
          dim={run(2)}
        />
        <TaskBox cx={1450} cy={NODES[2].cy} w={210} h={nodeH} at={depsAt + 14} tones={[{ at: depsAt + 14, tone: "bad" }]} dim={run(2)} size={23}>
          alert + halt
        </TaskBox>
        <Note at={depsAt + 12} dim={run(2)} x={DAG_X + NODE_W / 2 + 56} y={NODES[2].cy - h(40)}>
          <span style={{ ...label(20, ACCENT_INK), whiteSpace: "nowrap" }}>fail</span>
        </Note>
        <Note at={depsAt + 8} x={DAG_X + 14} y={(NODES[2].cy + NODES[3].cy) / 2 - 14}>
          <span style={{ ...label(20, OK_INK), whiteSpace: "nowrap" }}>pass</span>
        </Note>

        {/* What comes with it. */}
        {extras.map((e, i) => (
          <Pill key={e.text} x={1400} y={y(560) + i * h(56)} at={e.at} ink={BLUE_INK} size={23}>
            {e.text}
          </Pill>
        ))}
        <Note at={threeAt} x={DAG_X - NODE_W / 2} y={y(712)}>
          <span style={{ ...label(21, INK_SOFT), whiteSpace: "nowrap" }}>Airflow · Dagster · Prefect</span>
        </Note>
        <Note at={historyAt - 2} x={DAG_X - NODE_W / 2} y={y(760)}>
          <span style={{ ...label(21, INK_SOFT), whiteSpace: "nowrap" }}>run history</span>
        </Note>
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          {Array.from({ length: 8 }, (_, i) => {
            const p = ease(frame, historyAt + i * 2, 8);
            const x = DAG_X - NODE_W / 2 + 132 + i * 34;
            return <rect key={i} x={x} y={y(760) + 2} width={26 * p} height={26 * p} rx={4} fill={OK} opacity={0.8} />;
          })}
        </svg>
      </Drift>
    </AbsoluteFill>
  );
};
