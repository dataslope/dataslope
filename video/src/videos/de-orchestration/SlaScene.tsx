import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QMono, QuestionCard, Tick } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, INK, INK_SOFT, label, note, svgText } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { Cross, Drift, OK, OK_INK, pulse, X0 } from "./parts";

const T0 = 300;
const PER_HOUR = 175;
const tx = (hours: number) => T0 + hours * PER_HOUR;
const DEADLINE = 6;
/** Two nights' runs, drawn as mechanism: one done before six, one after. */
const NIGHTS = [
  { name: "Tuesday", start: 1, end: 4.5 },
  { name: "Wednesday", start: 1, end: 6.75 },
];
const STRIP = 14;
const LATE_DAY = 8;

/**
 * Question 9. An SLA as the page's example states it: daily_orders fresh by
 * 06:00 UTC. A night that finishes before the deadline and one that misses
 * it, which a deadline callback turns into an alert; then the page's three
 * ways to enforce it, and the SLA tracked night after night as an objective
 * rather than met or missed once.
 */
export const SlaScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("sla").from;
  const qAt = n.word("sla", "Question nine");
  const textAt = n.word("sla", "What is an SLA in a pipeline");
  const slaAt = n.word("sla", "An SLA, a service level agreement");
  const promiseAt = n.word("sla", "is a promise");
  const readyAt = n.word("sla", "ready by a set time");
  const ordersAt = n.word("sla", "daily orders, fresh by six");
  const threeAt = n.word("sla-enforce", "Enforce it three ways");
  const ways = [
    { at: n.word("sla-enforce", "a deadline callback"), lead: "deadline callback:", text: "alert when a task misses its target" },
    { at: n.word("sla-enforce", "freshness checks in the warehouse"), lead: "freshness check", text: "in the warehouse" },
    { at: n.word("sla-enforce", "and priority"), lead: "priority:", text: "critical pipelines get compute first" },
  ];
  const missAt = n.word("sla-enforce", "misses its target");
  const trackAt = n.word("sla-enforce", "track it over time");
  const objAt = n.word("sla-enforce", "as an objective");
  const oneOffAt = n.word("sla-enforce", "not a one-off alert");
  const end = n.beat("sla-enforce").to;

  const axisY = y(520);
  const rowY = (i: number) => y(394) + i * h(66);
  const barH = h(40);
  const drawAt = [readyAt, ways[0].at];
  const lateRed = ease(frame, missAt, 10);
  const ring = pulse(frame, missAt + 6, 26);

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={promiseAt} level={-36} />
      <Sfx name="el-tap" at={readyAt + 22} level={-36} />
      <Sfx name="el-scratch" at={missAt + 2} level={-34} />
      <Sfx name="el-pop" at={missAt + 6} level={-34} />
      {ways.map((w, i) => (
        <Sfx key={i} name="el-tap" at={w.at} level={-37} />
      ))}
      <Sfx name="el-sprinkle" at={trackAt} level={-35} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={9} at={qAt - 4} textAt={textAt - 4} size={56}>
          What is an SLA in a pipeline, and how do you enforce it?
        </QuestionCard>

        <Note at={slaAt} x={X0} y={y(284)}>
          <span style={{ ...note(25, INK), whiteSpace: "nowrap" }}>
            <b>SLA</b>: service level agreement
            <span style={{ opacity: ease(frame, promiseAt, 10) }}>, a promise that data is ready by a set time</span>
          </span>
        </Note>

        {/* The night, and the deadline. */}
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: ease(frame, promiseAt, 12) }}>
          <line x1={tx(0)} x2={tx(8)} y1={axisY} y2={axisY} stroke={INK} strokeWidth={1.6} />
          {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((hr) => (
            <g key={hr}>
              <line x1={tx(hr)} x2={tx(hr)} y1={axisY} y2={axisY + 7} stroke={INK} strokeWidth={1.4} />
              <text x={tx(hr)} y={axisY + 31} textAnchor="middle" style={svgText({ ...label(19, hr === DEADLINE ? INK : INK_SOFT), fontWeight: hr === DEADLINE ? 700 : 500 })}>
                {`0${hr}:00`}
              </text>
            </g>
          ))}
          {NIGHTS.map((nt, i) => {
            const p = ease(frame, drawAt[i] + 2, i ? 40 : 20);
            const endH = nt.start + (nt.end - nt.start) * p;
            const blueEnd = Math.min(endH, DEADLINE);
            return (
              <g key={nt.name}>
                <rect x={tx(nt.start)} y={rowY(i) - barH / 2} width={(blueEnd - nt.start) * PER_HOUR} height={barH} rx={4} fill={BAR} opacity={0.85} />
                {endH > DEADLINE ? (
                  <rect
                    x={tx(DEADLINE)}
                    y={rowY(i) - barH / 2}
                    width={(endH - DEADLINE) * PER_HOUR}
                    height={barH}
                    rx={4}
                    fill={`color-mix(in srgb, ${ACCENT} ${lateRed * 100}%, ${BAR})`}
                    opacity={0.85}
                  />
                ) : null}
              </g>
            );
          })}
          <line
            x1={tx(DEADLINE)}
            x2={tx(DEADLINE)}
            y1={y(338)}
            y2={axisY}
            stroke={INK}
            strokeWidth={2.6 + 2 * ring}
            strokeDasharray="8 6"
          />
        </svg>
        {NIGHTS.map((nt, i) => (
          <div key={nt.name} style={{ position: "absolute", left: X0, top: rowY(i) - 15, ...note(23, INK), fontWeight: 600, opacity: ease(frame, drawAt[i], 10) }}>
            {nt.name}
          </div>
        ))}
        {frame >= readyAt + 22 ? (
          <div style={{ position: "absolute", left: tx(NIGHTS[0].end) + 12, top: rowY(0) - 13 }}>
            <Tick at={readyAt + 22} size={26} />
          </div>
        ) : null}
        <Note at={ordersAt} x={tx(DEADLINE) + 14} y={y(334)}>
          <span style={{ ...note(24, INK), fontWeight: 700, whiteSpace: "nowrap" }}>
            <QMono>daily_orders</QMono> fresh by 06:00 UTC
          </span>
        </Note>
        {frame >= missAt + 2 ? (
          <div style={{ position: "absolute", left: tx(NIGHTS[1].end) + 12, top: rowY(1) - 13 }}>
            <Cross at={missAt + 2} size={26} />
          </div>
        ) : null}
        <Note at={missAt + 6} x={tx(NIGHTS[1].end) + 50} y={rowY(1) - 20}>
          <span
            style={{
              display: "inline-block",
              padding: "3px 12px",
              border: `2.4px solid ${ACCENT}`,
              borderRadius: 8,
              ...note(22, ACCENT_INK),
              fontWeight: 700,
              whiteSpace: "nowrap",
              transform: `scale(${1 + 0.06 * ring})`,
            }}
          >
            missed: alert
          </span>
        </Note>

        {/* Three ways to enforce it. */}
        <Note at={threeAt} x={X0} y={y(608)}>
          <span style={{ ...label(22, INK_SOFT), fontWeight: 700, whiteSpace: "nowrap" }}>enforce it three ways</span>
        </Note>
        {ways.map((w, i) => (
          <Note key={i} at={w.at - 2} x={X0} y={y(650) + i * h(48)}>
            <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>
              <b style={{ color: OK_INK }}>{i + 1}</b> <b>{w.lead}</b> {w.text}
              {i === 1 ? (
                <span style={{ ...label(22, INK_SOFT) }}>
                  {" "}
                  · <QMono>MAX(updated_at)</QMono>
                </span>
              ) : null}
            </span>
          </Note>
        ))}

        {/* Night after night: an objective. */}
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          {Array.from({ length: STRIP }, (_, i) => {
            const p = ease(frame, trackAt + i * 1.5, 8);
            const late = i === LATE_DAY;
            return (
              <rect
                key={i}
                x={X0 + i * 42}
                y={y(824)}
                width={34 * p}
                height={h(30) * p}
                rx={5}
                fill={late ? ACCENT : OK}
                opacity={0.85}
              />
            );
          })}
        </svg>
        <Note at={objAt} x={X0 + STRIP * 42 + 20} y={y(822)}>
          <span style={{ ...note(25, INK), whiteSpace: "nowrap" }}>
            measured night after night: an objective
            <span style={{ color: INK_SOFT, opacity: ease(frame, oneOffAt, 10) }}>, not a one-off alert</span>
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
