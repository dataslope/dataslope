/**
 * Illustrations for the "Functions and modularity" chapter.
 *
 * functions-basics      → a value goes into a machine, a value comes out;
 * parameters-and-returns → several arguments funnel to one return value;
 * scope-and-scope-chain  → nested scopes with an outward name lookup;
 * closures               → a function carries its birth scope like a backpack.
 */
import { P } from "./palette";
import { Arrow, Gear } from "./helpers";

/* ── functions-basics: input → [machine] → output ─────────────────────────── */
export function FunctionMachine() {
  return (
    <>
      {/* input token */}
      <rect x={14} y={78} width={40} height={40} rx={9} style={{ fill: P.green }} />
      <Arrow x1={60} y1={98} x2={120} y2={98} color={P.ink} width={2.5} />

      {/* the machine */}
      <rect x={124} y={48} width={112} height={100} rx={18} style={{ fill: P.blue }} />
      <Gear cx={180} cy={98} r={26} color={P.onFill} holeColor={P.blue} />

      {/* output token */}
      <Arrow x1={240} y1={98} x2={300} y2={98} color={P.ink} width={2.5} />
      <circle cx={326} cy={98} r={22} style={{ fill: P.yellow }} />
    </>
  );
}

/* ── parameters-and-returns: many arguments in, one value out ─────────────── */
export function ParamsFunnel() {
  const ins = [
    { y: 38, fill: P.blue },
    { y: 92, fill: P.green },
    { y: 146, fill: P.yellow },
  ];
  return (
    <>
      {ins.map((it, i) => (
        <g key={i}>
          <rect x={14} y={it.y - 16} width={36} height={32} rx={8} style={{ fill: it.fill }} />
          <Arrow x1={56} y1={it.y} x2={132} y2={92} color={P.muted} width={2.2} />
        </g>
      ))}

      {/* funnel */}
      <path
        d="M134 40 L214 40 L176 100 L176 144 L152 144 L152 100 Z"
        style={{ fill: P.blue, opacity: 0.16 }}
      />
      <path
        d="M134 40 L214 40 L176 100 L176 144 L152 144 L152 100 Z"
        style={{ fill: "none", stroke: P.blue, strokeWidth: 2.5, strokeLinejoin: "round" }}
      />

      {/* single return value out */}
      <Arrow x1={176} y1={146} x2={176} y2={176} color={P.ink} width={2.5} />
      <circle cx={176} cy={176} r={2} style={{ fill: P.ink }} />
      <Arrow x1={214} y1={92} x2={300} y2={92} color={P.ink} width={2.5} />
      <circle cx={326} cy={92} r={22} style={{ fill: P.purple }} />
    </>
  );
}

/* ── scope-and-scope-chain: nested scopes, lookup walks outward ───────────── */
export function NestedScopes() {
  return (
    <>
      {/* global */}
      <rect x={16} y={18} width={328} height={164} rx={20} style={{ fill: P.blue, opacity: 0.06 }} />
      <rect x={16} y={18} width={328} height={164} rx={20} style={{ fill: "none", stroke: P.blue, strokeWidth: 2.5 }} />
      {/* outer */}
      <rect x={62} y={46} width={236} height={108} rx={16} style={{ fill: P.green, opacity: 0.07 }} />
      <rect x={62} y={46} width={236} height={108} rx={16} style={{ fill: "none", stroke: P.green, strokeWidth: 2.5 }} />
      {/* inner */}
      <rect x={120} y={74} width={120} height={52} rx={12} style={{ fill: P.yellow, opacity: 0.12 }} />
      <rect x={120} y={74} width={120} height={52} rx={12} style={{ fill: "none", stroke: P.yellow600, strokeWidth: 2.5 }} />

      {/* a name resolved by walking outward through the chain */}
      <circle cx={150} cy={100} r={6} style={{ fill: P.red }} />
      <Arrow x1={158} y1={100} x2={300} y2={100} color={P.red} width={2.5} dashed />
      <circle cx={310} cy={100} r={6} style={{ fill: "none", stroke: P.red, strokeWidth: 2.5 }} />
    </>
  );
}

/* ── closures: a function keeps its birth scope, carried like a backpack ──── */
export function ClosureBackpack() {
  return (
    <>
      {/* the scope it was born in (now left behind) */}
      <rect
        x={14}
        y={40}
        width={120}
        height={120}
        rx={18}
        style={{ fill: "none", stroke: P.line, strokeWidth: 2.5, strokeDasharray: "6 7" }}
      />
      <circle cx={74} cy={100} r={12} style={{ fill: P.green, opacity: 0.4 }} />

      {/* it moved away, carrying the value with it */}
      <Arrow x1={140} y1={100} x2={196} y2={100} color={P.muted} width={2.2} />

      {/* the function */}
      <rect x={206} y={54} width={96} height={96} rx={20} style={{ fill: P.blue }} />
      {/* a lambda-ish glyph drawn as strokes */}
      <g style={{ stroke: P.onFill, strokeWidth: 5, strokeLinecap: "round", fill: "none" }}>
        <path d="M242 78 q10 0 14 12 l12 36" />
        <line x1={266} y1={82} x2={244} y2={126} />
      </g>

      {/* the backpack pouch holding the captured value */}
      <path
        d="M286 120 h26 a10 10 0 0 1 10 10 v22 a10 10 0 0 1 -10 10 h-26 a10 10 0 0 1 -10 -10 v-22 a10 10 0 0 1 10 -10 z"
        style={{ fill: P.yellow }}
      />
      <path d="M292 120 v-6 a10 10 0 0 1 20 0 v6" style={{ fill: "none", stroke: P.yellow600, strokeWidth: 3 }} />
      <circle cx={302} cy={142} r={9} style={{ fill: P.green }} />
    </>
  );
}
