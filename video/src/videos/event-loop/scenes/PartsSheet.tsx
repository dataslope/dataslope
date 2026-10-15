import React from "react";
import { useCurrentFrame } from "remotion";
import { Illustration } from "../../../components/Illustration";
import { ease } from "../../../components/motion";
import { Scene } from "../../../components/Scene";
import { useNarration } from "../../../narration/NarrationContext";
import { ArrowHead, Balloon, CropMarks, DASH, Layer, Leader, Letter, Seg } from "../draw";
import { Gear, Lane, Tube } from "../parts";
import { BP, VIDEO } from "../theme";

type View = { x: number; y: number; w: number; h: number };
const VIEWS: Record<"stack" | "loop" | "queues", View> = {
  stack: { x: 96, y: 214, w: 420, h: 360 },
  loop: { x: 596, y: 214, w: 440, h: 360 },
  queues: { x: 1116, y: 214, w: 708, h: 360 },
};
const NAME_Y = 606;
const SYM_Y = 772;

/**
 * "Meet the machinery" as a parts list: each part drawn in a detail view,
 * called out with an item balloon, and paired with the schematic symbol the
 * next view uses for it. Laid out in the schematic's own order (stack, loop,
 * queues, left to right), so the flow arrows that close the beat run the
 * same way the work will.
 */
export const PartsSheet: React.FC<{ from: number; to: number }> = ({ from, to }) => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const start = n.beat("machine").from;
  const machineryAt = n.word("machine", "machinery");
  const stackAt = n.word("machine", "call stack");
  const taskAt = n.word("machine", "task queue");
  const microAt = n.word("machine", "microtask queue");
  const loopAt = n.word("machine", "event loop");
  const movesAt = n.word("machine", "moves");

  const head = ease(frame, from + 2, 18);
  // The empty detail views are framed straight away, so the sheet is never
  // just its heading while "to see why" is said.
  const marksAt = Math.min(machineryAt - 6, from + 10);
  const marks = ease(frame, marksAt, 14);
  const plot = (at: number) => ease(frame, at - 4, 22);
  const flow = ease(frame, movesAt, 18);
  const spin = Math.max(0, frame - movesAt) * 2.4;
  const cardSlide = ease(frame, movesAt + 4, 40) * 120;

  /** A part's drawing: a faint construction ghost from the start, inked in
   *  top to bottom by the plotter when the narration names it. */
  const art = (v: View, id: string, at: number, pad = 24) => {
    const p = plot(at);
    const box: React.CSSProperties = {
      position: "absolute",
      left: v.x + pad,
      top: v.y + pad,
      width: v.w - pad * 2,
      height: v.h - pad * 2,
    };
    return (
      <>
        <div style={{ ...box, opacity: 0.16 * marks * (1 - p) }}>
          <Illustration video={VIDEO} id={id} style={{ width: "100%", height: "100%" }} />
        </div>
        <div style={{ ...box, clipPath: `inset(0 0 ${(1 - p) * 100}% 0)`, opacity: p > 0 ? 1 : 0 }}>
          <Illustration video={VIDEO} id={id} style={{ width: "100%", height: "100%" }} />
        </div>
      </>
    );
  };
  /** The plotter's pen line, sweeping down a view as it draws. */
  const scan = (v: View, at: number) => {
    const p = plot(at);
    if (p <= 0 || p >= 1) return null;
    const y = v.y + 24 + (v.h - 48) * p;
    return <Seg a={[v.x + 10, y]} b={[v.x + v.w - 10, y]} color={BP.cyan} width={2} opacity={0.8} />;
  };

  return (
    <Scene from={from} to={to} fade={6}>
      <Letter x={84} y={70} p={head} size={64} color={BP.white}>
        Parts list
      </Letter>
      <Letter x={88} y={146} p={ease(frame, start + 6, 16)} size={24} color={BP.line2}>
        Assembly: the JavaScript runtime. Four parts.
      </Letter>

      {art(VIEWS.stack, "el-trays", stackAt, 34)}
      {art(VIEWS.loop, "el-gears", loopAt, 30)}
      {art(VIEWS.queues, "el-conveyor", taskAt, 22)}

      <Layer>
        {Object.values(VIEWS).map((v, i) => (
          <CropMarks key={i} x={v.x} y={v.y} w={v.w} h={v.h} p={ease(frame, marksAt + i * 3, 12)} />
        ))}
        {scan(VIEWS.stack, stackAt)}
        {scan(VIEWS.loop, loopAt)}
        {scan(VIEWS.queues, taskAt)}

        {/* Item balloons, with leaders up to their part. */}
        <Leader from={[214, 548]} elbow={[150, NAME_Y - 4]} to={[134, NAME_Y]} p={ease(frame, stackAt + 6, 10)} />
        <Leader from={[716, 520]} elbow={[650, NAME_Y - 4]} to={[634, NAME_Y]} p={ease(frame, loopAt + 6, 10)} />
        <Leader from={[1236, 520]} elbow={[1170, NAME_Y - 4]} to={[1154, NAME_Y]} p={ease(frame, taskAt + 6, 10)} />
        <Leader from={[1530, 470]} elbow={[1466, NAME_Y - 4]} to={[1450, NAME_Y]} p={ease(frame, microAt + 6, 10)} />
        <Balloon c={[124, NAME_Y + 22]} n={1} p={ease(frame, stackAt, 10)} />
        <Balloon c={[624, NAME_Y + 22]} n={4} p={ease(frame, loopAt, 10)} />
        <Balloon c={[1144, NAME_Y + 22]} n={2} p={ease(frame, taskAt, 10)} />
        <Balloon c={[1440, NAME_Y + 22]} n={3} p={ease(frame, microAt, 10)} />

        {/* Each part's schematic symbol. */}
        <g>
          <Tube box={{ x: 276, w: 60, top: SYM_Y - 86, bottom: SYM_Y + 86, slot: 40 }} p={ease(frame, stackAt + 8, 16)} graduations={0} />
          <rect x={283} y={SYM_Y + 32} width={46} height={34} fill="none" stroke={BP.line2} strokeWidth={2} opacity={ease(frame, stackAt + 16, 8)} />
          <rect x={283} y={SYM_Y - 6} width={46} height={34} fill="none" stroke={BP.line2} strokeWidth={2} opacity={ease(frame, stackAt + 20, 8)} />
        </g>
        <Gear cx={816} cy={SYM_Y} R={64} teeth={12} angle={spin} p={ease(frame, loopAt + 6, 18)} glow={flow} />
        <Lane x0={1170} x1={1660} y={SYM_Y - 46} p={ease(frame, taskAt + 8, 16)} offset={cardSlide} />
        <Lane x0={1170} x1={1660} y={SYM_Y + 50} p={ease(frame, microAt + 6, 16)} offset={cardSlide} />
        {[
          { y: SYM_Y - 46, at: taskAt + 18 },
          { y: SYM_Y + 50, at: microAt + 14 },
        ].map(({ y, at }) => (
          <rect
            key={y}
            x={1500 - cardSlide}
            y={y - 18 - 36}
            width={110}
            height={34}
            fill={BP.wash}
            stroke={BP.line}
            strokeWidth={2}
            opacity={ease(frame, at, 8)}
          />
        ))}

        {/* "…moves work between them": queues into the loop, loop onto the stack. */}
        <g opacity={flow}>
          <path
            d={`M 1160 ${SYM_Y - 46} C 1010 ${SYM_Y - 46}, 980 ${SYM_Y - 20}, 900 ${SYM_Y - 12}`}
            fill="none"
            stroke={BP.cyan}
            strokeWidth={2.5}
            strokeDasharray={DASH.phantom}
          />
          <path
            d={`M 1160 ${SYM_Y + 50} C 1010 ${SYM_Y + 50}, 980 ${SYM_Y + 20}, 900 ${SYM_Y + 12}`}
            fill="none"
            stroke={BP.cyan}
            strokeWidth={2.5}
            strokeDasharray={DASH.phantom}
          />
          <ArrowHead tip={[892, SYM_Y - 11]} angle={Math.PI - 0.12} color={BP.cyan} />
          <ArrowHead tip={[892, SYM_Y + 11]} angle={Math.PI + 0.12} color={BP.cyan} />
        </g>
        <Seg a={[740, SYM_Y]} b={[352, SYM_Y]} p={ease(frame, movesAt + 8, 16)} color={BP.cyan} width={2.5} dash={DASH.phantom} />
        <ArrowHead tip={[350, SYM_Y]} angle={Math.PI} color={BP.cyan} opacity={ease(frame, movesAt + 20, 6)} />
      </Layer>

      <Letter x={154} y={NAME_Y + 4} p={ease(frame, stackAt + 2, 12)} size={32} color={BP.white}>
        Call stack
      </Letter>
      <Letter x={654} y={NAME_Y + 4} p={ease(frame, loopAt + 2, 12)} size={32} color={BP.white}>
        Event loop
      </Letter>
      <Letter x={1174} y={NAME_Y + 4} p={ease(frame, taskAt + 2, 12)} size={32} color={BP.white}>
        Task queue
      </Letter>
      <Letter x={1470} y={NAME_Y + 4} p={ease(frame, microAt + 2, 12)} size={32} color={BP.white}>
        Microtask queue
      </Letter>
      <Letter x={1824} y={180} p={ease(frame, microAt + 8, 10)} size={22} color={BP.mark} align="right">
        Qty 2
      </Letter>
      <Letter x={1680} y={SYM_Y - 60} p={ease(frame, taskAt + 14, 10)} size={20} color={BP.line2}>
        Tasks
      </Letter>
      <Letter x={1680} y={SYM_Y + 36} p={ease(frame, microAt + 12, 10)} size={20} color={BP.line2}>
        Microtasks
      </Letter>
      <Letter x={96} y={180} p={marks} size={18} color={BP.line2} spacing="0.14em">
        Detail 1
      </Letter>
      <Letter x={596} y={180} p={marks} size={18} color={BP.line2} spacing="0.14em">
        Detail 4
      </Letter>
      <Letter x={1116} y={180} p={marks} size={18} color={BP.line2} spacing="0.14em">
        Detail 2 and 3
      </Letter>
    </Scene>
  );
};
