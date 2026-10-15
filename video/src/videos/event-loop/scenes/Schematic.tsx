import React from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import { Illustration } from "../../../components/Illustration";
import { ease } from "../../../components/motion";
import { Scene } from "../../../components/Scene";
import { useNarration } from "../../../narration/NarrationContext";
import { MONO } from "../../../theme/fonts";
import { CodeListing, codeGeom, type CodeBox } from "../Code";
import { CODE, OUTPUT } from "../data";
import {
  ArrowHead,
  DASH,
  Dimension,
  DraftBox,
  Layer,
  Letter,
  MotionPath,
  Seg,
  lerpPt,
  pulse,
  quadAt,
  type Pt,
} from "../draw";
import { Block, FRAME_H, FRAME_W, Gear, Lane, Tube, type TubeBox } from "../parts";
import { BP, VIDEO, mix } from "../theme";
import { track, window01 } from "../track";

// ── Geometry (1080p CSS px; all clear of the caption strip below y≈910) ──
const CODE_BOX: CodeBox = { x: 60, y: 60, w: 640, font: 22, lh: 35 };
const CG = codeGeom(CODE_BOX);
const CON = { x: 60, y: 562, w: 640, h: 326 };
const TUBE: TubeBox = { x: 790, w: 216, top: 160, bottom: 800, slot: 70 };
const STACK_X = TUBE.x + TUBE.w / 2;
const slotMid = (i: number): Pt => [STACK_X, TUBE.bottom - 10 - FRAME_H / 2 - i * TUBE.slot];
/** Above the tube's rim: where a frame drops in from, and leaves by. */
const ENTRY: Pt = [STACK_X, 96];
const GEAR = { cx: 1140, cy: 690, R: 90 };
const LANE = { x0: 1262, x1: 1856 };
const TASK_Y = 600;
const MICRO_Y = 820;
const onLane = (y: number) => y - 18 - 2 - FRAME_H / 2;
const FRONT_X = LANE.x0 + 14 + FRAME_W / 2;
const BACK_X = LANE.x1 - 14 - FRAME_W / 2;
const TIMER = { x: 1596, y: 132, w: 220, h: 250 };
const DOCK: Pt = [TIMER.x + TIMER.w / 2, 424];
const NOTES = { x: 1090, y: 92, w: 452, h: 252 };

const inOut = (frame: number, at: number, dur: number) =>
  interpolate(frame, [at, at + dur], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });

type Move = { at: number; dur: number; to: Pt; via?: Pt };
type Path = { from: Pt; via: Pt; to: Pt; at: number; dur: number };

/** Where a part is at `frame`, following its moves one after another. */
function follow(frame: number, start: Pt, moves: Move[]): Pt {
  let from = start;
  for (const m of moves) {
    if (frame < m.at) break;
    const t = inOut(frame, m.at, m.dur);
    const pos = m.via ? quadAt(from, m.via, m.to, t) : lerpPt(from, m.to, t);
    if (t < 1) return pos;
    from = m.to;
  }
  return from;
}

/** The curved moves of a part, to draw as paths of motion. */
function flights(start: Pt, moves: Move[]): Path[] {
  const out: Path[] = [];
  let from = start;
  for (const m of moves) {
    if (m.via) out.push({ from, via: m.via, to: m.to, at: m.at, dur: m.dur });
    from = m.to;
  }
  return out;
}

/**
 * The machine, drafted: the listing and its console on the left, the call
 * stack as a graduated tube, the event loop as a gear, the two queues as
 * conveyor lanes, and the host's timer. Every frame and callback card is a
 * block with a planned route, each leg cued to a word, so the whole run can
 * be read off the narration.
 */
export const Schematic: React.FC<{ from: number; to: number }> = ({ from, to }) => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const w = n.word;

  // ── Cues ──
  const runsAt = w("stack", "runs");
  const wholeAt = w("stack", "whole");
  const line1At = w("stack", "Line");
  const log1At = w("stack", "logs");
  const setAt = w("timeout", "Set");
  const notAt = w("timeout", "not");
  const handsAt = w("timeout", "hands");
  const timerAt = w("timeout", "timer", { nth: 1 });
  const firesAt = w("timeout", "fires");
  const waitsAt = w("timeout", "waits");
  const taskQAt = w("timeout", "task queue");
  const dotAt = w("then", "dot");
  const putsAt = w("then", "puts");
  const microQAt = w("then", "microtask queue");
  const thenEnd = n.beat("then").to;
  const line2At = w("sync-end", "Line");
  const log2At = w("sync-end", "logs");
  const finishesAt = w("sync-end", "finishes");
  const emptyAt = w("sync-end", "empty");
  const ruleAt = w("rule", "rule");
  const whenAt = w("rule", "When");
  const runAt = w("rule", "run");
  const takeAt = w("rule", "then");
  const ruleEnd = n.beat("rule").to;
  const liftMicro = w("micro-run", "promise");
  const log3At = w("micro-run", "logs");
  const threeEnd = w("micro-run", "three", { edge: "end" });
  const liftTask = w("task-run", "timer's");
  const log4At = w("task-run", "logs");
  const fourEnd = w("task-run", "four", { edge: "end" });

  const LIFT = 24;
  const DROP = 10;
  const landMicro = liftMicro + LIFT + DROP;
  const landTask = liftTask + LIFT + DROP;

  // ── Stack frames: drop in from above the rim, rise out when they return. ──
  type Frame = { id: string; label: string; slot: number; push: number; pop: number };
  const simple: Frame[] = [
    { id: "script", label: "script", slot: 0, push: runsAt, pop: finishesAt },
    { id: "log1", label: "console.log", slot: 1, push: line1At + 4, pop: log1At + 16 },
    { id: "set", label: "setTimeout", slot: 1, push: setAt, pop: handsAt + 20 },
    { id: "then", label: ".then", slot: 1, push: dotAt, pop: Math.min(putsAt + 30, thenEnd) },
    { id: "log2", label: "console.log", slot: 1, push: line2At + 4, pop: log2At + 16 },
    { id: "log3", label: "console.log", slot: 1, push: Math.max(landMicro + 2, log3At - 8), pop: threeEnd + 2 },
    { id: "log4", label: "console.log", slot: 1, push: Math.max(landTask + 2, log4At - 8), pop: fourEnd + 2 },
  ];
  const cb3Pop = threeEnd + 14;
  const cb4Pop = fourEnd + 14;

  // ── The two callbacks' routes. ──
  const cb4Start = slotMid(1);
  const cb4Moves: Move[] = [
    { at: handsAt + 4, dur: 24, to: DOCK, via: [1180, 150] },
    { at: waitsAt, dur: 12, to: [BACK_X, onLane(TASK_Y)] },
    { at: waitsAt + 12, dur: 30, to: [FRONT_X, onLane(TASK_Y)] },
    { at: liftTask, dur: LIFT, to: ENTRY, via: [960, 470] },
    { at: liftTask + LIFT, dur: DROP, to: slotMid(0) },
    { at: cb4Pop, dur: 10, to: ENTRY },
  ];
  const cb3Start = slotMid(1);
  const cb3Moves: Move[] = [
    { at: putsAt + 4, dur: 26, to: [BACK_X, onLane(MICRO_Y)], via: [1580, 180] },
    { at: putsAt + 30, dur: 28, to: [FRONT_X, onLane(MICRO_Y)] },
    { at: liftMicro, dur: LIFT, to: ENTRY, via: [980, 470] },
    { at: liftMicro + LIFT, dur: DROP, to: slotMid(0) },
    { at: cb3Pop, dur: 10, to: ENTRY },
  ];
  const cb4 = follow(frame, cb4Start, cb4Moves);
  const cb3 = follow(frame, cb3Start, cb3Moves);

  const inStack = (push: number, pop: number) => ease(frame, push + 6, 6) * (1 - ease(frame, pop, 6));
  const depth =
    simple.reduce((s, f) => s + inStack(f.push, f.pop), 0) + inStack(landMicro - 6, cb3Pop) + inStack(landTask - 6, cb4Pop);
  const count = Math.round(depth);

  // ── Belts and gear. ──
  const travel = BACK_X - FRONT_X;
  const taskBelt = travel * inOut(frame, waitsAt + 12, 30) + 120 * inOut(frame, liftTask, LIFT);
  const microBelt = travel * inOut(frame, putsAt + 30, 28) + 120 * inOut(frame, liftMicro, LIFT);
  const gearAngle = 24 * inOut(frame, ruleAt, 18) + 120 * inOut(frame, liftMicro, 30) + 120 * inOut(frame, liftTask, 30);
  const gearGlow = Math.max(
    window01(frame, liftMicro - 2, liftMicro + 32),
    window01(frame, liftTask - 2, liftTask + 32),
    pulse(frame, ruleAt, 30),
  );

  // ── Code pointer and line glow. ──
  const pointerLine = track(frame, [
    { at: line1At, v: 0 },
    { at: setAt, v: 2 },
    { at: dotAt, v: 6 },
    { at: line2At, v: 10 },
    { at: landMicro, v: 7 },
    { at: landTask, v: 3 },
  ]);
  const pointerOn = Math.max(
    window01(frame, line1At, log1At + 18),
    window01(frame, setAt, handsAt + 22),
    window01(frame, dotAt, putsAt + 30),
    window01(frame, line2At, finishesAt),
    window01(frame, landMicro, cb3Pop),
    window01(frame, landTask, cb4Pop),
  );
  const ranges: { a: number; b: number; from: number; to: number; v?: number }[] = [
    { a: 0, b: 10, from: wholeAt, to: line1At, v: 0.35 },
    { a: 0, b: 0, from: line1At, to: log1At + 18 },
    { a: 2, b: 4, from: setAt, to: handsAt + 22 },
    { a: 6, b: 8, from: dotAt, to: putsAt + 30 },
    { a: 10, b: 10, from: line2At, to: log2At + 18 },
    { a: 7, b: 7, from: landMicro, to: cb3Pop },
    { a: 3, b: 3, from: landTask, to: cb4Pop },
  ];
  const glow = CODE.map((_, i) =>
    Math.max(0, ...ranges.filter((r) => i >= r.a && i <= r.b).map((r) => window01(frame, r.from, r.to) * (r.v ?? 1))),
  );

  // ── Console. ──
  const printed = [log1At, log2At, log3At, log4At];
  const conLine = (i: number) => CON.y + 66 + i * 56;
  const lastPrinted = printed.filter((at) => frame >= at).length;
  const cursorOn = Math.floor((frame - from) / 15) % 2 === 0;

  // ── Draw-on, staggered over the first second of the view. ──
  const d = (k: number, dur = 18) => ease(frame, from + k, dur);

  // ── Timer. ──
  const fireT = frame - firesAt;
  const wobble = fireT >= 0 && fireT < 24 ? Math.sin(fireT * 1.3) * 9 * (1 - fireT / 24) : 0;
  const ring = window01(frame, firesAt, firesAt + 22, 4);

  const blockFor = (f: Frame) => {
    const pos = follow(frame, ENTRY, [
      { at: f.push, dur: 10, to: slotMid(f.slot) },
      { at: f.pop, dur: 10, to: ENTRY },
    ]);
    const op = ease(frame, f.push - 2, 6) * (1 - ease(frame, f.pop + 2, 8));
    const active = f.slot === 1 || !simple.some((g) => g.slot === 1 && frame >= g.push && frame < g.pop);
    return (
      <Block
        key={f.id}
        x={pos[0] - FRAME_W / 2}
        y={pos[1] - FRAME_H / 2}
        label={f.label}
        opacity={frame < f.push - 2 ? 0 : op}
        active={active && frame >= f.push + 6 && frame < f.pop}
      />
    );
  };

  const cbBlock = (pos: Pt, k: 3 | 4, born: number, popAt: number, land: number) => {
    const op = ease(frame, born, 6) * (1 - ease(frame, popAt + 2, 8));
    const log = simple.find((f) => f.id === `log${k}`);
    const covered = log ? frame >= log.push && frame < log.pop : false;
    return (
      <Block
        x={pos[0] - FRAME_W / 2}
        y={pos[1] - FRAME_H / 2}
        label="() => {…}"
        balloon={k}
        opacity={frame < born ? 0 : op}
        active={(frame >= land - 4 && frame < popAt && !covered) || frame < born + 8}
      />
    );
  };

  const paths = [
    ...flights(cb4Start, cb4Moves),
    ...flights(cb3Start, cb3Moves),
  ];

  return (
    <Scene from={from} to={to} fade={6}>
      <CodeListing
        box={CODE_BOX}
        title="Listing · main.js"
        p={d(0, 16)}
        reveal={d(2, 20)}
        glow={glow}
        pointer={{ line: pointerLine, opacity: pointerOn }}
      />

      {/* Console. */}
      <Layer>
        <DraftBox x={CON.x} y={CON.y} w={CON.w} h={CON.h} p={d(6, 16)} color={BP.line2} fill={mix(BP.paperDeep, 70)} />
        <Seg a={[CON.x, CON.y + 46]} b={[CON.x + CON.w, CON.y + 46]} p={d(12, 12)} color={BP.line2} width={1.5} />
      </Layer>
      <Letter x={CON.x + 16} y={CON.y + 11} p={d(10, 14)} size={24}>
        Console output
      </Letter>
      {OUTPUT.map((text, i) => {
        const p = ease(frame, printed[i], 8);
        return p > 0 ? (
          <div
            key={text}
            style={{
              position: "absolute",
              left: CON.x + 24,
              top: conLine(i),
              fontFamily: MONO,
              fontSize: 24,
              fontWeight: 600,
              whiteSpace: "pre",
              color: frame < printed[i] + 24 ? BP.mark : BP.white,
              clipPath: `inset(0 ${(1 - p) * 100}% 0 0)`,
            }}
          >
            <span style={{ color: BP.faint }}>{"> "}</span>
            {text}
          </div>
        ) : null;
      })}
      {d(14) > 0.5 && cursorOn ? (
        <div
          style={{
            position: "absolute",
            left: CON.x + 24,
            top: conLine(lastPrinted) + 4,
            width: 14,
            height: 26,
            background: BP.line2,
            opacity: 0.8,
          }}
        />
      ) : null}

      {/* Timer, plotted on, then ringing when it fires. */}
      <div
        style={{
          position: "absolute",
          left: TIMER.x,
          top: TIMER.y,
          width: TIMER.w,
          height: TIMER.h,
          clipPath: `inset(0 0 ${(1 - d(12, 26)) * 100}% 0)`,
          transform: `rotate(${wobble}deg)`,
          transformOrigin: "50% 92%",
        }}
      >
        <Illustration video={VIDEO} id="el-timer" style={{ width: "100%", height: "100%" }} />
      </div>

      <Layer>
        <Tube box={TUBE} p={d(4, 22)} glow={Math.max(window01(frame, emptyAt, liftMicro), window01(frame, whenAt, runAt) * 1.2)} />
        <Gear cx={GEAR.cx} cy={GEAR.cy} R={GEAR.R} angle={gearAngle} p={d(8, 22)} glow={gearGlow} />
        <Lane x0={LANE.x0} x1={LANE.x1} y={TASK_Y} p={d(10, 22)} offset={taskBelt} glow={Math.max(window01(frame, takeAt, ruleEnd + 6), pulse(frame, taskQAt, 24))} />
        <Lane x0={LANE.x0} x1={LANE.x1} y={MICRO_Y} p={d(13, 22)} offset={microBelt} glow={Math.max(window01(frame, runAt, takeAt), pulse(frame, microQAt, 24))} />

        {/* Drive linkages: the loop sits at the front of both queues. */}
        <Seg a={[GEAR.cx + GEAR.R + 6, GEAR.cy - 44]} b={[LANE.x0 - 4, TASK_Y + 4]} p={d(16, 12)} color={BP.faint} width={2} dash={DASH.center} />
        <Seg a={[GEAR.cx + GEAR.R + 6, GEAR.cy + 44]} b={[LANE.x0 - 4, MICRO_Y - 4]} p={d(16, 12)} color={BP.faint} width={2} dash={DASH.center} />

        {/* Direction of travel along each lane. */}
        {[TASK_Y, MICRO_Y].map((y) => (
          <g key={y} opacity={d(18, 12)}>
            <Seg a={[LANE.x1 - 10, y + 43]} b={[LANE.x1 - 130, y + 43]} color={BP.line2} width={2} />
            <ArrowHead tip={[LANE.x1 - 134, y + 43]} angle={Math.PI} size={14} color={BP.line2} />
          </g>
        ))}

        {/* How deep the stack is. */}
        {depth > 0.05 ? (
          <Dimension
            a={[TUBE.x, TUBE.bottom - 10]}
            b={[TUBE.x, TUBE.bottom - 10 - depth * TUBE.slot]}
            orient="v"
            offset={-28}
            label={depth > 0.6 ? String(count) : ""}
            p={Math.min(1, depth * 1.5)}
            fontSize={24}
            upright
          />
        ) : null}

        {/* Ringing strokes as the timer fires. */}
        {ring > 0
          ? [-1, 1].map((side) =>
              [0, 1, 2].map((k) => {
                const cx = TIMER.x + TIMER.w / 2 + side * 92;
                const cy = TIMER.y + 70 + k * 26;
                const len = 22 * ring;
                return (
                  <line
                    key={`${side}${k}`}
                    x1={cx}
                    y1={cy}
                    x2={cx + side * len}
                    y2={cy - (1 - k) * len * 0.5}
                    stroke={BP.mark}
                    strokeWidth={3}
                    strokeLinecap="round"
                    opacity={ring}
                  />
                );
              }),
            )
          : null}

        {/* "Does not run its callback now": the checker's red pen. */}
        {(() => {
          const p = window01(frame, notAt, handsAt + 12, 6);
          if (p <= 0) return null;
          const y = CG.lineTop(3) + 1;
          return (
            <rect
              x={CG.textLeft - 8}
              y={y}
              width={CG.colX(CODE[3].length) - CG.textLeft + 16}
              height={CODE_BOX.lh - 2}
              fill="none"
              stroke={BP.red}
              strokeWidth={2.5}
              strokeDasharray={DASH.hidden}
              opacity={p}
            />
          );
        })()}

        {/* Paths of motion, fading once each leg is done. */}
        {paths.map((pth) => (
          <MotionPath
            key={`${pth.at}`}
            p0={pth.from}
            c={pth.via}
            p2={pth.to}
            p={inOut(frame, pth.at, pth.dur)}
            opacity={1 - ease(frame, pth.at + pth.dur + 4, 20)}
          />
        ))}

        {/* The rule, as general notes on the drawing. */}
        <DraftBox x={NOTES.x} y={NOTES.y} w={NOTES.w} h={NOTES.h} p={ease(frame, ruleAt - 6, 16)} color={BP.line} fill={mix(BP.paperDeep, 80)} />
        <Seg a={[NOTES.x, NOTES.y + 52]} b={[NOTES.x + NOTES.w, NOTES.y + 52]} p={ease(frame, ruleAt + 4, 12)} color={BP.line2} width={1.5} />
      </Layer>

      {/* Part labels. */}
      <Letter x={STACK_X} y={TUBE.bottom + 14} p={d(16, 14)} size={28} align="center">
        Call stack
      </Letter>
      <Letter x={GEAR.cx} y={GEAR.cy + GEAR.R + 18} p={d(18, 14)} size={28} align="center">
        Event loop
      </Letter>
      <Letter x={LANE.x0} y={TASK_Y + 28} p={d(20, 14)} size={26} color={window01(frame, taskQAt, taskQAt + 30) > 0.5 ? BP.mark : BP.line}>
        Task queue
      </Letter>
      <Letter x={LANE.x0} y={MICRO_Y + 28} p={d(22, 14)} size={26} color={window01(frame, microQAt, microQAt + 30) > 0.5 ? BP.mark : BP.line}>
        Microtask queue
      </Letter>
      <Letter x={TIMER.x + TIMER.w / 2} y={TIMER.y - 40} p={d(20, 14)} size={26} align="center">
        Host timer
      </Letter>
      <Letter
        x={TIMER.x - 16}
        y={TIMER.y + 110}
        p={window01(frame, timerAt, dotAt, 10)}
        size={22}
        color={BP.mark}
        align="right"
      >
        Delay: 0 ms
      </Letter>
      <Letter x={CG.colX(9)} y={CG.lineTop(4) + 4} p={window01(frame, notAt + 4, handsAt + 12, 8)} size={24} color={BP.red}>
        Not run now
      </Letter>

      {/* Empty stack. */}
      <Letter x={STACK_X} y={440} p={window01(frame, emptyAt, liftMicro, 10)} size={44} color={BP.mark} align="center">
        Empty
      </Letter>

      {/* Notes. */}
      <Letter x={NOTES.x + 20} y={NOTES.y + 12} p={ease(frame, ruleAt, 14)} size={28} color={BP.white}>
        Event loop rule
      </Letter>
      <Letter x={NOTES.x + 20} y={NOTES.y + 70} p={ease(frame, whenAt, 18)} size={25}>
        1. When the stack is empty,
      </Letter>
      <Letter x={NOTES.x + 20} y={NOTES.y + 116} p={ease(frame, runAt, 16)} size={25} color={frame >= runAt ? BP.cyan : BP.line}>
        2. run every microtask,
      </Letter>
      <Letter x={NOTES.x + 20} y={NOTES.y + 162} p={ease(frame, takeAt, 16)} size={25}>
        3. then take one task.
      </Letter>
      <Letter x={NOTES.x + 20} y={NOTES.y + 208} p={ease(frame, ruleEnd + 4, 14)} size={20} color={BP.line2}>
        4. Repeat from 2.
      </Letter>

      {/* Frames and callbacks: drawn last so they ride over everything. */}
      {simple.map(blockFor)}
      {cbBlock(cb4, 4, handsAt, cb4Pop, landTask)}
      {cbBlock(cb3, 3, putsAt, cb3Pop, landMicro)}
    </Scene>
  );
};
