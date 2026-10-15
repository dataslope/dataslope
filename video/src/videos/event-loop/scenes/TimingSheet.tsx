import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { ease } from "../../../components/motion";
import { Scene } from "../../../components/Scene";
import { useNarration } from "../../../narration/NarrationContext";
import { MONO } from "../../../theme/fonts";
import { OUTPUT } from "../data";
import { ArrowHead, Balloon, DASH, Dimension, DraftBox, Ink, Layer, Letter, Seg, cloudPath, pulse, rrect } from "../draw";
import { HAND } from "../fonts";
import { BP, mix } from "../theme";
import { window01 } from "../track";

// Rows and the time axis.
const ROW = { timer: 268, task: 388, micro: 508, stack: 628 } as const;
const X0 = 430;
const AXIS_Y = 718;
const AXIS_END = 1480;
// When things happen along the axis (px). Not to scale: a timing diagram of
// the order, not of the milliseconds.
const T = {
  log1: 490,
  set: 570,
  fire: 620,
  then: 700,
  log2: 790,
  end: 850,
  m0: 870,
  log3: 975,
  m1: 1060,
  k0: 1090,
  log4: 1195,
  k1: 1280,
  done: 1350,
};
const BLOCK_H = 56;
const CON = { x: 1530, y: 214, w: 340, h: 504 };
const NOTE = { x: 420, y: 784, w: 1060, h: 112 };

/**
 * The replay and the takeaway on one timing diagram: a row per part, time
 * running left to right, and a playhead that reaches each log as its line is
 * read out. The takeaway then marks it up: the wait a "zero" delay really
 * gets, and the rule as a note with a revision cloud on the ordering.
 */
export const TimingSheet: React.FC<{ from: number; to: number }> = ({ from, to }) => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const w = n.word;

  const s1 = w("replay", "Script", { nth: 1 });
  const s2 = w("replay", "Script", { nth: 2 });
  const s3 = w("replay", "Promise");
  const s4 = w("replay", "Set");
  const zeroAt = w("takeaway", "zero");
  const rightAt = w("takeaway", "right");
  const timersAt = w("takeaway", "timer's");
  const taskAt = w("takeaway", "task", { nth: 1 });
  const everyAt = w("takeaway", "every");
  const beforeAt = w("takeaway", "before");
  const startsEnd = w("takeaway", "starts", { edge: "end" });

  const play = interpolate(
    frame,
    [s1 - 14, s1, s2, s3, s4, s4 + 30],
    [X0, T.log1, T.log2, T.log3, T.log4, T.done],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const printed = [s1, s2, s3, s4];
  const d = (k: number, dur = 16) => ease(frame, from + k, dur);
  const playOn = d(16, 10) * (1 - ease(frame, s4 + 40, 16) * 0.65);

  const rowLabel = (y: number, label: string, k: number, hot = 0) => (
    <Letter x={84} y={y - 16} p={d(k, 14)} size={26} color={hot > 0.5 ? BP.mark : BP.line}>
      {label}
    </Letter>
  );
  const block = (x0: number, x1: number, label: string, balloon?: number, hot = 0) => (
    <g>
      {hot > 0 ? (
        <rect x={x0 - 6} y={ROW.stack - BLOCK_H / 2 - 6} width={x1 - x0 + 12} height={BLOCK_H + 12} fill="none" stroke={BP.mark} strokeWidth={3} opacity={hot} />
      ) : null}
      <rect x={x0} y={ROW.stack - BLOCK_H / 2} width={x1 - x0} height={BLOCK_H} fill={BP.washStrong} stroke={BP.line} strokeWidth={2.5} />
      {balloon ? (
        <g>
          <circle cx={x0 + 22} cy={ROW.stack} r={14} fill="none" stroke={BP.mark} strokeWidth={2} />
          <text x={x0 + 22} y={ROW.stack + 6} textAnchor="middle" fontFamily={HAND} fontSize={17} fill={BP.mark}>
            {balloon}
          </text>
        </g>
      ) : null}
      <text
        x={(x0 + x1) / 2 + (balloon ? 14 : 0)}
        y={ROW.stack + 7}
        textAnchor="middle"
        fontFamily={HAND}
        fontSize={18}
        letterSpacing="0.06em"
        fill={BP.white}
      >
        {label}
      </text>
    </g>
  );
  const down = (x: number, y0: number, y1: number, color: string = BP.line2) => (
    <g>
      <Seg a={[x, y0]} b={[x, y1 - 2]} color={color} width={2} />
      <ArrowHead tip={[x, y1]} angle={Math.PI / 2} size={13} color={color} />
    </g>
  );
  const up = (x: number, y0: number, y1: number) => (
    <g>
      <Seg a={[x, y0]} b={[x, y1 + 2]} color={BP.faint} width={2} dash="3 6" />
      <ArrowHead tip={[x, y1]} angle={-Math.PI / 2} size={12} color={BP.line2} />
    </g>
  );

  const timerHot = pulse(frame, zeroAt, 36);
  const cbHot = window01(frame, timersAt, everyAt + 6, 8);
  const taskHot = window01(frame, taskAt - 2, everyAt + 6, 8);
  const microHot = window01(frame, everyAt, startsEnd + 10, 8);
  const noteP = interpolate(frame, [everyAt - 4, startsEnd], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <Scene from={from} to={to} fade={6}>
      <Letter x={84} y={70} p={d(0, 18)} size={64} color={BP.white}>
        Timing diagram
      </Letter>
      <Letter x={88} y={146} p={d(6, 16)} size={24} color={BP.line2}>
        The same run on one time axis, read left to right.
      </Letter>

      {rowLabel(ROW.timer, "Host timer", 4, timerHot)}
      {rowLabel(ROW.task, "Task queue", 6, taskHot)}
      {rowLabel(ROW.micro, "Microtask queue", 8, microHot)}
      {rowLabel(ROW.stack, "Call stack", 10)}

      <Layer>
        <defs>
          <clipPath id="el-timing-played">
            <rect x={0} y={0} width={play} height={1080} />
          </clipPath>
        </defs>
        {/* Row guides and the time axis. */}
        {Object.values(ROW).map((y, i) => (
          <Seg key={y} a={[X0 - 10, y]} b={[AXIS_END, y]} p={d(4 + i * 2, 18)} color={BP.faint} width={1.5} dash={DASH.center} />
        ))}
        <Seg a={[X0 - 10, AXIS_Y]} b={[AXIS_END, AXIS_Y]} p={d(8, 18)} color={BP.line} width={2.5} />
        <ArrowHead tip={[AXIS_END + 14, AXIS_Y]} angle={0} size={16} color={BP.line} opacity={d(20, 6)} />
        {Array.from({ length: 21 }, (_, i) => X0 + i * 50).map((x, i) => (
          <line key={x} x1={x} y1={AXIS_Y} x2={x} y2={AXIS_Y + (i % 2 === 0 ? 12 : 6)} stroke={BP.line2} strokeWidth={1.5} opacity={d(12 + i * 0.4, 8)} />
        ))}
        <text x={AXIS_END + 26} y={AXIS_Y + 7} fontFamily={HAND} fontSize={22} fill={BP.line} opacity={d(22, 8)} letterSpacing="0.08em">
          TIME
        </text>

        {/* What has played so far. */}
        <g clipPath="url(#el-timing-played)">
          {block(X0, T.end, "SCRIPT")}
          {block(T.m0, T.m1, "PROMISE CB", 3, pulse(frame, beforeAt, 40))}
          {block(T.k0, T.k1, "TIMER CB", 4, Math.max(cbHot * 0.9, pulse(frame, beforeAt + 10, 40)))}

          {/* setTimeout hands its callback to the timer, which fires into the task queue. */}
          {up(T.set, ROW.stack - BLOCK_H / 2, ROW.timer + 16)}
          <rect x={T.set} y={ROW.timer - 15} width={T.fire - T.set} height={30} fill={timerHot > 0 ? mix(BP.mark, 30 * timerHot + 10) : BP.wash} stroke={timerHot > 0.3 ? BP.mark : BP.line} strokeWidth={2.5} />
          {down(T.fire, ROW.timer + 15, ROW.task - 16, BP.cyan)}
          <rect x={T.fire - 2} y={ROW.task - 16} width={40} height={32} fill={BP.washStrong} stroke={BP.cyan} strokeWidth={2.5} />
          <Seg a={[T.fire + 38, ROW.task]} b={[T.k0, ROW.task]} color={BP.cyan} width={3} dash={DASH.hidden} />
          {down(T.k0, ROW.task, ROW.stack - BLOCK_H / 2 - 2, BP.cyan)}

          {/* .then queues a microtask, which runs as soon as the script is done. */}
          {up(T.then, ROW.stack - BLOCK_H / 2, ROW.micro + 16)}
          <rect x={T.then - 2} y={ROW.micro - 16} width={40} height={32} fill={BP.washStrong} stroke={BP.cyan} strokeWidth={2.5} />
          <Seg a={[T.then + 38, ROW.micro]} b={[T.m0, ROW.micro]} color={BP.cyan} width={3} dash={DASH.hidden} />
          {down(T.m0, ROW.micro, ROW.stack - BLOCK_H / 2 - 2, BP.cyan)}

          {/* Each log, dropped to the axis. */}
          {[T.log1, T.log2, T.log3, T.log4].map((x) => (
            <Seg key={x} a={[x, ROW.stack + BLOCK_H / 2]} b={[x, AXIS_Y]} color={BP.mark} width={2} dash="3 5" />
          ))}
        </g>
        {[T.log1, T.log2, T.log3, T.log4].map((x, i) => (
          <Balloon key={x} c={[x, AXIS_Y + 34]} n={i + 1} r={17} p={ease(frame, printed[i], 10)} color={BP.mark} />
        ))}

        {/* The playhead. */}
        <g opacity={playOn}>
          <line x1={play} y1={200} x2={play} y2={AXIS_Y} stroke={BP.mark} strokeWidth={2.5} />
          <path d={`M ${play - 10} ${190} L ${play + 10} ${190} L ${play} ${206} Z`} fill={BP.mark} />
        </g>

        {/* Takeaway markup. */}
        <Dimension
          a={[T.set, ROW.task - 46]}
          b={[T.k0, ROW.task - 46]}
          orient="h"
          offset={0}
          label="WAITS: STACK, THEN MICROTASKS"
          p={ease(frame, rightAt - 2, 18)}
          color={BP.mark}
          fontSize={20}
        />
        <Ink d={cloudPath(T.m0 - 18, ROW.stack - 46, T.k1 - T.m0 + 36, 92, 24)} p={ease(frame, beforeAt - 4, 22)} color={BP.mark} width={2.5} />
        {(() => {
          const p = ease(frame, beforeAt + 14, 10);
          if (p <= 0) return null;
          const cx = T.k1 + 46;
          const cy = ROW.stack - 52;
          return (
            <g opacity={p}>
              <path d={`M ${cx} ${cy - 20} L ${cx + 22} ${cy + 16} L ${cx - 22} ${cy + 16} Z`} fill={BP.paper} stroke={BP.mark} strokeWidth={2.5} />
              <text x={cx} y={cy + 11} textAnchor="middle" fontFamily={HAND} fontSize={20} fill={BP.mark}>
                A
              </text>
            </g>
          );
        })()}

        {/* Console and the general note. */}
        <DraftBox x={CON.x} y={CON.y} w={CON.w} h={CON.h} p={d(10, 16)} color={BP.line2} fill={mix(BP.paperDeep, 70)} />
        <Seg a={[CON.x, CON.y + 46]} b={[CON.x + CON.w, CON.y + 46]} p={d(16, 12)} color={BP.line2} width={1.5} />
        <DraftBox x={NOTE.x} y={NOTE.y} w={NOTE.w} h={NOTE.h} p={ease(frame, everyAt - 8, 14)} color={BP.mark} fill={mix(BP.paperDeep, 80)} />
        {taskHot > 0 ? (
          <path d={rrect(76, ROW.task - 24, 200, 46, 6)} fill="none" stroke={BP.mark} strokeWidth={2.5} opacity={taskHot} />
        ) : null}
      </Layer>

      <Letter x={T.set + 2} y={ROW.timer - 50} p={ease(frame, from + 20, 10)} size={20} color={timerHot > 0.3 ? BP.mark : BP.line2}>
        0 ms
      </Letter>
      <Letter x={CON.x + 16} y={CON.y + 11} p={d(14, 14)} size={24}>
        Console
      </Letter>
      {OUTPUT.map((text, i) => {
        const p = ease(frame, printed[i], 8);
        return p > 0 ? (
          <div
            key={text}
            style={{
              position: "absolute",
              left: CON.x + 18,
              top: CON.y + 72 + i * 70,
              fontFamily: MONO,
              fontSize: 20,
              fontWeight: 600,
              whiteSpace: "pre",
              color: frame < printed[i] + 20 ? BP.mark : BP.white,
              clipPath: `inset(0 ${(1 - p) * 100}% 0 0)`,
            }}
          >
            <span style={{ color: BP.faint }}>{"> "}</span>
            {text}
          </div>
        ) : null;
      })}
      <Letter x={NOTE.x + 28} y={NOTE.y + 14} p={ease(frame, everyAt - 4, 12)} size={22} color={BP.mark} spacing="0.14em">
        General note
      </Letter>
      <Letter x={NOTE.x + 28} y={NOTE.y + 52} p={noteP} size={30} color={BP.white}>
        Every microtask runs before the next task starts.
      </Letter>
    </Scene>
  );
};
