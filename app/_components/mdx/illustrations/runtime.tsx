/**
 * Illustrations for the "Runtime and asynchrony" chapter.
 *
 * how-javascript-runs   → the call stack (push/pop) and the event loop;
 * asynchronous-thinking → work handed to a background lane while the main
 *                         thread keeps going, then a callback returns;
 * promises-and-async-await → a promise settling from pending to fulfilled
 *                            or rejected.
 */
import { P } from "./palette";
import { Arrow } from "./helpers";

/* ── how-javascript-runs: frames pushed and popped on the call stack ──────── */
export function CallStack() {
  const w = 150;
  const x = 86;
  const frames = [
    { fill: P.blue, y: 150 },
    { fill: P.green, y: 112 },
    { fill: P.yellow, y: 74 },
  ];
  return (
    <>
      {/* base line */}
      <line x1={x - 12} y1={190} x2={x + w + 12} y2={190} style={{ stroke: P.line, strokeWidth: 3, strokeLinecap: "round" }} />

      {frames.map((f, i) => (
        <rect key={i} x={x} y={f.y} width={w} height={32} rx={8} style={{ fill: f.fill }} />
      ))}

      {/* incoming frame + push arrow */}
      <rect x={x} y={20} width={w} height={32} rx={8} style={{ fill: P.yellow, opacity: 0.3 }} />
      <Arrow x1={x - 26} y1={30} x2={x - 26} y2={70} color={P.green700} width={2.6} />
      {/* pop arrow */}
      <Arrow x1={x + w + 26} y1={70} x2={x + w + 26} y2={30} color={P.red600} width={2.6} />
    </>
  );
}

/* ── how-javascript-runs: the event loop feeds the stack from a queue ─────── */
export function EventLoop() {
  return (
    <>
      {/* call stack (left) */}
      <rect x={26} y={40} width={86} height={120} rx={12} style={{ fill: "none", stroke: P.blue, strokeWidth: 2.5 }} />
      <rect x={40} y={120} width={58} height={24} rx={6} style={{ fill: P.blue }} />
      <rect x={40} y={92} width={58} height={24} rx={6} style={{ fill: P.blue, opacity: 0.5 }} />

      {/* task queue (right) */}
      {[0, 1, 2].map((i) => (
        <rect key={i} x={250 + i * 34} y={44} width={28} height={28} rx={7} style={{ fill: P.yellow, opacity: 1 - i * 0.22 }} />
      ))}
      <path d="M244 36 h104" style={{ fill: "none", stroke: P.line, strokeWidth: 2 }} />
      <path d="M244 80 h104" style={{ fill: "none", stroke: P.line, strokeWidth: 2 }} />

      {/* the loop: take the next task and run it on the stack when it's empty */}
      <path d="M250 58 C 180 58, 170 150, 120 150" style={{ fill: "none", stroke: P.green700, strokeWidth: 2.6 }} />
      <Arrow x1={138} y1={150} x2={116} y2={150} color={P.green700} width={2.6} />
      {/* circular hint */}
      <path d="M150 178 a26 26 0 1 0 14 -22" style={{ fill: "none", stroke: P.green700, strokeWidth: 2.6 }} />
      <Arrow x1={158} y1={150} x2={166} y2={158} color={P.green700} width={2.6} head={8} />
    </>
  );
}

/* ── asynchronous-thinking: main thread keeps going; work returns later ───── */
export function AsyncHandoff() {
  const mainY = 56;
  const bgY = 138;
  return (
    <>
      {/* main thread */}
      <Arrow x1={20} y1={mainY} x2={344} y2={mainY} color={P.ink} width={2.5} />
      {/* main-thread tasks */}
      {[40, 150, 250].map((x, i) => (
        <rect key={i} x={x} y={mainY - 12} width={56} height={24} rx={7} style={{ fill: [P.blue, P.green, P.purple][i] }} />
      ))}

      {/* background lane */}
      <line x1={20} y1={bgY} x2={344} y2={bgY} style={{ stroke: P.line, strokeWidth: 2, strokeDasharray: "2 6", strokeLinecap: "round" }} />
      {/* the long-running work, offloaded */}
      <rect x={108} y={bgY - 12} width={150} height={24} rx={7} style={{ fill: P.yellow }} />

      {/* hand-off down, callback back up */}
      <Arrow x1={96} y1={mainY + 12} x2={120} y2={bgY - 14} color={P.muted} width={2.2} />
      <Arrow x1={250} y1={bgY - 14} x2={278} y2={mainY + 12} color={P.green700} width={2.4} />
    </>
  );
}

/* ── promises-and-async-await: pending settles to fulfilled or rejected ───── */
export function PromiseStates() {
  return (
    <>
      {/* pending */}
      <circle cx={80} cy={100} r={36} style={{ fill: P.yellow }} />
      {/* a clock/spinner glyph */}
      <g style={{ stroke: P.onLight, strokeWidth: 3.4, strokeLinecap: "round", fill: "none" }}>
        <path d="M80 78 a22 22 0 1 1 -16 7" />
        <path d="M80 88 v13 l9 6" />
      </g>

      {/* to fulfilled */}
      <Arrow x1={116} y1={84} x2={244} y2={56} color={P.green700} width={2.6} />
      <circle cx={282} cy={52} r={28} style={{ fill: P.green }} />
      <path d="M270 52 l7 8 l15 -17" style={{ fill: "none", stroke: P.onFill, strokeWidth: 4.5, strokeLinecap: "round", strokeLinejoin: "round" }} />

      {/* to rejected */}
      <Arrow x1={116} y1={116} x2={244} y2={146} color={P.red600} width={2.6} />
      <circle cx={282} cy={150} r={28} style={{ fill: P.red }} />
      <g style={{ stroke: P.onFill, strokeWidth: 4.5, strokeLinecap: "round" }}>
        <line x1={272} y1={140} x2={292} y2={160} />
        <line x1={292} y1={140} x2={272} y2={160} />
      </g>
    </>
  );
}
