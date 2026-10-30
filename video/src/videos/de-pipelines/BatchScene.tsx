import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { BAR, BLUE_INK, HIGHLIGHT, INK, INK_SOFT, label, note, svgText } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { SANS } from "../../theme/fonts";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { Drift, Node, OK, OK_INK, Pill, pulse, X0 } from "./parts";

/** One hour of events, drawn left to right. */
const AX0 = 360;
const AX1 = 1120;
/** When each event arrives, as a fraction of the hour: a drawn stream, not
 *  data (no number is read off it). */
const ARRIVALS = [0.04, 0.1, 0.17, 0.23, 0.31, 0.36, 0.44, 0.5, 0.57, 0.63, 0.7, 0.77, 0.83, 0.9, 0.96];
const BATCH_Y = 400;
const STREAM_Y = 640;
const RIGHT_X = 1300;

/**
 * Question 1. The same hour of events read two ways. Batch: a bracket around
 * the hour, a playhead sweeping it, and one result at the end, minutes to
 * hours after the first event. Streaming: the playhead again, and each event
 * dropping straight into a result as it passes. Then streaming's price, and
 * the rule: choose by the latency the business needs.
 */
export const BatchScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("batch").from;
  const qAt = n.word("batch", "Question one");
  const textAt = n.word("batch", "Batch versus streaming");
  const batchAt = n.word("batch", "Batch processes a bounded chunk");
  const hourAt = n.word("batch", "say each hour of events");
  const goAt = n.word("batch", "in one go");
  const simpleAt = n.word("batch", "simple, cheap and easy to rerun");
  const oldAt = n.word("batch", "minutes to hours old");
  const streamAt = n.word("stream", "Streaming processes each event");
  const arrivesAt = n.word("stream", "as it arrives");
  const secondsAt = n.word("stream", "seconds old");
  const priceAt = n.word("stream", "The price is");
  const costs = [
    { text: "running state", at: n.word("stream", "running state") },
    { text: "ordering", at: n.word("stream", "ordering") },
    { text: "late data", at: n.word("stream", "late data") },
    { text: "delivery guarantees", at: n.word("stream", "delivery guarantees") },
  ];
  const chooseAt = n.word("choose", "choose by the latency");
  const dashAt = n.word("choose", "An hourly dashboard is batch");
  const fraudAt = n.word("choose", "Fraud detection is streaming");
  const dontAt = n.word("choose", "Don't pay for streaming's complexity");
  const realAt = n.word("choose", "a real requirement");
  const end = n.beat("choose").to;

  const by = y(BATCH_Y);
  const sy = y(STREAM_Y);
  const ax = (f: number) => AX0 + (AX1 - AX0) * f;
  // The batch playhead sweeps the hour while "each hour of events" is said;
  // the streaming one while "each event as it arrives" is.
  const batchSweep = ease(frame, hourAt, Math.max(24, goAt - hourAt));
  const streamSweep = ease(frame, streamAt + 4, Math.max(30, secondsAt - streamAt));
  const resultAt = goAt;

  return (
    <AbsoluteFill>
      <Sfx name="el-sprinkle" at={hourAt} level={-31} />
      <Sfx name="el-pop" at={resultAt + 2} level={-30} />
      <Sfx name="el-sprinkle" at={streamAt + 4} level={-31} />
      {costs.map((c) => (
        <Sfx key={c.text} name="el-tap" at={c.at} level={-33} />
      ))}
      <Sfx name="el-tap" at={dashAt} level={-31} />
      <Sfx name="el-tap" at={fraudAt} level={-31} />
      <Sfx name="el-chime" at={realAt + 6} level={-32} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={1} at={qAt - 4} textAt={textAt - 4} size={64}>
          Batch versus streaming, how do you choose?
        </QuestionCard>

        {/* Lane titles. */}
        <Note at={batchAt - 2} x={X0} y={by - h(14)}>
          <span style={{ ...label(30, INK), fontWeight: 750 }}>Batch</span>
        </Note>
        <Note at={streamAt - 2} x={X0} y={sy - h(14)}>
          <span style={{ ...label(30, INK), fontWeight: 750 }}>Streaming</span>
        </Note>

        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          {/* The hour, on both lanes. */}
          {[
            { at: batchAt, ly: by },
            { at: streamAt, ly: sy },
          ].map((l, k) => {
            const p = ease(frame, l.at, 16);
            return (
              <g key={k} opacity={p}>
                <line x1={AX0} x2={AX0 + (AX1 - AX0) * p} y1={l.ly} y2={l.ly} stroke={INK} strokeWidth={1.6} />
                {[0, 1].map((f) => (
                  <g key={f}>
                    <line x1={ax(f)} x2={ax(f)} y1={l.ly - 7} y2={l.ly + 7} stroke={INK} strokeWidth={1.6} />
                    <text x={ax(f)} y={l.ly + 34} textAnchor="middle" style={svgText({ fontFamily: SANS, fontSize: 20, fontWeight: 500, color: INK_SOFT })}>
                      {f === 0 ? "10:00" : "11:00"}
                    </text>
                  </g>
                ))}
              </g>
            );
          })}

          {/* Batch: the events gather as the playhead passes; the hour is one bounded chunk. */}
          {ARRIVALS.map((f, i) => {
            const seen = frame >= hourAt + f * Math.max(24, goAt - hourAt);
            const p = seen ? ease(frame, hourAt + f * Math.max(24, goAt - hourAt), 8) : 0;
            return <circle key={i} cx={ax(f)} cy={by - h(30)} r={9 * p} fill={BAR} opacity={0.85} />;
          })}
          {/* The bracket around the hour: the bounded chunk. */}
          <g opacity={ease(frame, batchAt + 6, 12)}>
            <path
              d={`M${ax(0) - 6},${by - h(54)} L${ax(0) - 6},${by - h(62)} L${ax(1) + 6},${by - h(62)} L${ax(1) + 6},${by - h(54)}`}
              fill="none"
              stroke={INK}
              strokeWidth={2}
              strokeDasharray={`${(ax(1) - ax(0) + 40) * ease(frame, batchAt + 6, 16)} 3000`}
            />
          </g>
          {batchSweep > 0 && batchSweep < 1 ? (
            <line x1={ax(batchSweep)} x2={ax(batchSweep)} y1={by - h(56)} y2={by + 8} stroke={INK_SOFT} strokeWidth={2} strokeDasharray="4 4" />
          ) : null}

          {/* Streaming: each event drops into a result as the playhead passes it. */}
          {ARRIVALS.map((f, i) => {
            const at = streamAt + 4 + f * Math.max(30, secondsAt - streamAt);
            const p = ease(frame, at, 8);
            const drop = ease(frame, at + 4, 10);
            if (p <= 0) return null;
            return (
              <g key={i}>
                <circle cx={ax(f)} cy={sy - h(30)} r={9 * p} fill={BAR} opacity={0.85} />
                <line x1={ax(f)} x2={ax(f)} y1={sy - h(18)} y2={sy - h(18) + (h(66) * drop)} stroke={BAR} strokeWidth={2} opacity={0.6} />
                <rect x={ax(f) - 7} y={sy + h(58)} width={14} height={14 * drop} rx={3} fill={OK} opacity={drop} />
              </g>
            );
          })}
          {streamSweep > 0 && streamSweep < 1 ? (
            <line x1={ax(streamSweep)} x2={ax(streamSweep)} y1={sy - h(56)} y2={sy + 8} stroke={INK_SOFT} strokeWidth={2} strokeDasharray="4 4" />
          ) : null}
        </svg>

        {/* Batch's one result, at the end of the hour. */}
        <Node x={ax(1) - 120} y={by + h(56)} w={240} h={h(62)} at={resultAt} tone="ok" title="one result" size={23} />
        <Note at={hourAt + 4} x={ax(0)} y={by - h(108)}>
          <span style={{ ...label(21, INK_SOFT), fontWeight: 650, whiteSpace: "nowrap" }}>a bounded chunk: one hour of events</span>
        </Note>
        <Note at={simpleAt} x={ax(0)} y={by + h(60)}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>simple, cheap, easy to rerun</span>
        </Note>
        <Note at={oldAt - 2} x={ax(0)} y={by + h(100)}>
          <span style={{ ...note(24, INK), fontWeight: 700, whiteSpace: "nowrap" }}>results minutes to hours old</span>
        </Note>

        {/* Streaming's results, each seconds after its event. */}
        <Note at={arrivesAt + 6} x={AX1 + 30} y={sy + h(50)}>
          <span style={{ ...label(21, OK_INK), fontWeight: 700, whiteSpace: "nowrap" }}>a result per event</span>
        </Note>
        <Note at={secondsAt - 2} x={AX1 + 30} y={sy - h(44)}>
          <span style={{ ...note(24, INK), fontWeight: 700, whiteSpace: "nowrap" }}>results seconds old</span>
        </Note>
        <Note at={priceAt} x={AX0} y={sy + h(104)}>
          <span style={{ ...label(21, INK_SOFT), fontWeight: 700, whiteSpace: "nowrap" }}>The price, all yours to run:</span>
        </Note>
        {costs.map((c, i) => (
          <Pill key={c.text} x={AX0 + [0, 196, 340, 488][i]} y={sy + h(146)} at={c.at} tone="plain" size={21}>
            {c.text}
          </Pill>
        ))}

        {/* The choice, by latency. */}
        <Note at={chooseAt} x={RIGHT_X + 160} y={y(300)}>
          <span style={{ ...label(22, BLUE_INK), fontWeight: 700, whiteSpace: "nowrap" }}>Choose by the latency needed</span>
        </Note>
        <ChoiceCard at={dashAt} x={RIGHT_X + 160} y={by - h(40)} need="An hourly dashboard" pick="batch" lit={pulse(frame, dashAt + 10, 22)} />
        <ChoiceCard at={fraudAt} x={RIGHT_X + 160} y={sy - h(40)} need="Fraud detection" pick="streaming" lit={pulse(frame, fraudAt + 10, 22)} />
        <Note at={dontAt} x={X0} y={y(885)}>
          <span style={{ ...note(28, OK_INK), fontWeight: 700, whiteSpace: "nowrap" }}>
            Streaming only when low latency is <span style={{ background: ease(frame, realAt, 10) > 0 ? HIGHLIGHT : undefined }}>a real requirement</span>
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};

/** A use case and the mode its latency calls for. */
const ChoiceCard: React.FC<{ at: number; x: number; y: number; need: string; pick: string; lit: number }> = ({ at, x, y, need, pick, lit }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 12);
  const k = ease(frame, at + 10, 10);
  if (p <= 0) return null;
  return (
    <div style={{ position: "absolute", left: x, top: y, opacity: p, transform: `translateX(${(1 - p) * 16}px)` }}>
      <div style={{ ...note(26, INK), fontWeight: 650, whiteSpace: "nowrap" }}>{need}</div>
      <div style={{ ...label(24, BLUE_INK), fontWeight: 750, whiteSpace: "nowrap", opacity: k, transform: `scale(${1 + 0.06 * lit})`, transformOrigin: "0 50%" }}>
        → {pick}
      </div>
    </div>
  );
};
