/**
 * Illustrations for the "Story of JavaScript" chapter.
 *
 * Deliberately varied styles: a duotone abstraction ladder, a two-lane
 * compiled/interpreted flow, a flat client–server exchange, a circular
 * "made-in-10-days" emblem, a radiating ecosystem burst, a hub-and-spoke of
 * runtimes, and a line-art globe.
 */
import { P } from "./palette";
import { Arrow, Gear } from "./helpers";

/* ── story-of-programming: machine code up to high-level languages ────────── */
export function AbstractionLadder() {
  // bottom (raw machine) → top (human-readable), one blue ramp = "levels".
  const bands = [
    { y: 150, fill: P.blue900, kind: "bits" as const, on: P.onFill },
    { y: 102, fill: P.blue600, kind: "asm" as const, on: P.onFill },
    { y: 54, fill: P.blue300, kind: "high" as const, on: P.onLight },
  ];
  const x = 70;
  const w = 196;
  return (
    <>
      {/* "more abstract →" up arrow */}
      <Arrow x1={40} y1={178} x2={40} y2={48} color={P.green700} width={2.6} />

      {bands.map((b, i) => (
        <g key={i}>
          <rect x={x} y={b.y} width={w} height={36} rx={9} style={{ fill: b.fill }} />
          {b.kind === "bits" &&
            [0, 1, 2, 3, 4, 5, 6, 7].map((j) => (
              <circle key={j} cx={x + 24 + j * 21} cy={b.y + 18} r={4} style={{ fill: b.on, opacity: j % 2 ? 0.5 : 1 }} />
            ))}
          {b.kind === "asm" &&
            [0, 1, 2].map((j) => (
              <g key={j}>
                <rect x={x + 22 + j * 60} y={b.y + 13} width={14} height={10} rx={2} style={{ fill: b.on }} />
                <rect x={x + 40 + j * 60} y={b.y + 13} width={26} height={10} rx={2} style={{ fill: b.on, opacity: 0.55 }} />
              </g>
            ))}
          {b.kind === "high" &&
            [0, 1, 2].map((j) => (
              <rect key={j} x={x + 22 + j * 58} y={b.y + 12} width={[40, 48, 34][j]} height={12} rx={6} style={{ fill: b.on }} />
            ))}
        </g>
      ))}
    </>
  );
}

/* a small page/document glyph */
function Doc({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <g>
      <path d={`M${x} ${y} h26 l10 10 v34 a4 4 0 0 1 -4 4 h-32 a4 4 0 0 1 -4 -4 v-40 a4 4 0 0 1 4 -4 z`} style={{ fill: "none", stroke: color, strokeWidth: 2.4, strokeLinejoin: "round" }} />
      <g style={{ stroke: color, strokeWidth: 2.2, strokeLinecap: "round" }}>
        <line x1={x + 7} y1={y + 16} x2={x + 23} y2={y + 16} />
        <line x1={x + 7} y1={y + 24} x2={x + 27} y2={y + 24} />
        <line x1={x + 7} y1={y + 32} x2={x + 20} y2={y + 32} />
      </g>
    </g>
  );
}

/* ── rise-of-scripting-languages: compiled vs interpreted ─────────────────── */
export function CompiledVsInterpreted() {
  const play = (x: number, y: number, fill: string) => (
    <g>
      <circle cx={x} cy={y} r={18} style={{ fill }} />
      <polygon points={`${x - 5},${y - 8} ${x + 9},${y} ${x - 5},${y + 8}`} style={{ fill: P.onFill }} />
    </g>
  );
  return (
    <>
      {/* compiled lane: source → compiler → binary → run */}
      <Doc x={16} y={26} color={P.blue} />
      <Arrow x1={64} y1={48} x2={92} y2={48} color={P.muted} width={2.2} />
      <rect x={96} y={26} width={48} height={44} rx={10} style={{ fill: P.blue }} />
      <Gear cx={120} cy={48} r={13} color={P.onFill} holeColor={P.blue} />
      <Arrow x1={148} y1={48} x2={176} y2={48} color={P.muted} width={2.2} />
      {/* binary block */}
      <rect x={180} y={28} width={44} height={40} rx={8} style={{ fill: P.blue, opacity: 0.16 }} />
      <g style={{ fill: P.blue }}>
        {[0, 1, 2].map((r) => [0, 1, 2].map((c) => <rect key={`${r}-${c}`} x={188 + c * 11} y={36 + r * 9} width={6} height={5} rx={1} style={{ opacity: (r + c) % 2 ? 0.5 : 1 }} />))}
      </g>
      <Arrow x1={228} y1={48} x2={256} y2={48} color={P.muted} width={2.2} />
      {play(282, 48, P.green)}

      {/* interpreted lane: source → interpreter runs it directly */}
      <Doc x={16} y={120} color={P.purple} />
      <Arrow x1={64} y1={142} x2={104} y2={142} color={P.muted} width={2.2} />
      <rect x={108} y={118} width={70} height={48} rx={12} style={{ fill: P.purple }} />
      <polygon points="130,134 148,142 130,150" style={{ fill: P.onFill }} />
      <Gear cx={162} cy={142} r={11} color={P.onFill} holeColor={P.purple} />
      <Arrow x1={182} y1={142} x2={256} y2={142} color={P.muted} width={2.2} />
      {play(282, 142, P.green)}
    </>
  );
}

/* ── internet-and-interactivity: browser requests, server responds ────────── */
export function ClientServer() {
  return (
    <>
      {/* browser window */}
      <rect x={20} y={44} width={120} height={92} rx={12} style={{ fill: P.surface, stroke: P.blue, strokeWidth: 2.5 }} />
      <path d="M20 64 h120" style={{ stroke: P.blue, strokeWidth: 2.5 }} />
      {[34, 48, 62].map((cx, i) => (
        <circle key={i} cx={cx} cy={54} r={3.4} style={{ fill: [P.red, P.yellow, P.green][i] }} />
      ))}
      <rect x={34} y={80} width={92} height={10} rx={5} style={{ fill: P.blue, opacity: 0.5 }} />
      <rect x={34} y={98} width={64} height={10} rx={5} style={{ fill: P.blue, opacity: 0.3 }} />

      {/* request / response */}
      <Arrow x1={150} y1={74} x2={224} y2={74} color={P.blue} width={2.8} />
      <Arrow x1={224} y1={106} x2={150} y2={106} color={P.green700} width={2.8} />

      {/* server stack */}
      {[44, 80, 116].map((y, i) => (
        <g key={i}>
          <rect x={236} y={y} width={104} height={28} rx={7} style={{ fill: P.blue, opacity: 0.85 - i * 0.12 }} />
          <circle cx={252} cy={y + 14} r={4} style={{ fill: P.onFill }} />
        </g>
      ))}
    </>
  );
}

/* ── birth-of-javascript: a 10-day spark (emblem) ─────────────────────────── */
export function TenDaySpark() {
  const cx = 120;
  const cy = 120;
  const ticks = Array.from({ length: 10 }, (_, i) => {
    // ten marks across the top arc, from ~200° to ~340°
    const a = ((200 + i * (140 / 9)) * Math.PI) / 180;
    return {
      x1: cx + 88 * Math.cos(a),
      y1: cy + 88 * Math.sin(a),
      x2: cx + 78 * Math.cos(a),
      y2: cy + 78 * Math.sin(a),
    };
  });
  return (
    <>
      <circle cx={cx} cy={cy} r={92} style={{ fill: "none", stroke: P.blue, strokeWidth: 3 }} />
      <circle cx={cx} cy={cy} r={70} style={{ fill: P.blue, opacity: 0.08 }} />
      {ticks.map((t, i) => (
        <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} style={{ stroke: P.blue, strokeWidth: 3, strokeLinecap: "round" }} />
      ))}
      {/* lightning bolt */}
      <polygon points={`${cx + 12},${cy - 46} ${cx - 22},${cy + 8} ${cx - 2},${cy + 8} ${cx - 14},${cy + 48} ${cx + 24},${cy - 10} ${cx + 2},${cy - 10}`} style={{ fill: P.yellow, stroke: P.yellow600, strokeWidth: 2, strokeLinejoin: "round" }} />
    </>
  );
}

/* ── ecosystem-explosion: one library bursts into a galaxy of packages ────── */
export function EcosystemBurst() {
  const cx = 160;
  const cy = 120;
  const hues = [P.blue, P.green, P.yellow, P.red, P.teal, P.purple, P.orange];
  const spokes = Array.from({ length: 12 }, (_, i) => {
    const a = (i * 30 * Math.PI) / 180;
    const len = 64 + (i % 3) * 22;
    const x = cx + len * Math.cos(a);
    const y = cy + len * Math.sin(a);
    return { x, y, fill: hues[i % hues.length], r: 6 + (i % 3) * 2, a, len };
  });
  return (
    <>
      {spokes.map((s, i) => (
        <line key={i} x1={cx} y1={cy} x2={s.x} y2={s.y} style={{ stroke: P.line, strokeWidth: 1.6 }} />
      ))}
      {/* secondary buds on a few spokes */}
      {spokes.filter((_, i) => i % 4 === 0).map((s, i) => {
        const bx = s.x + 16 * Math.cos(s.a + 0.5);
        const by = s.y + 16 * Math.sin(s.a + 0.5);
        return (
          <g key={i}>
            <line x1={s.x} y1={s.y} x2={bx} y2={by} style={{ stroke: P.line, strokeWidth: 1.4 }} />
            <circle cx={bx} cy={by} r={4} style={{ fill: s.fill, opacity: 0.7 }} />
          </g>
        );
      })}
      {spokes.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={s.r} style={{ fill: s.fill }} />
      ))}
      <circle cx={cx} cy={cy} r={20} style={{ fill: P.blue }} />
      <circle cx={cx} cy={cy} r={8} style={{ fill: P.onFill, opacity: 0.9 }} />
    </>
  );
}

/* device glyphs for the runtime hub */
function Device({ kind, x, y, color }: { kind: "browser" | "server" | "terminal" | "phone" | "chip"; x: number; y: number; color: string }) {
  const s = { fill: "none", stroke: color, strokeWidth: 2.4, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };
  if (kind === "browser")
    return (
      <g style={s}>
        <rect x={x - 22} y={y - 16} width={44} height={34} rx={5} />
        <line x1={x - 22} y1={y - 6} x2={x + 22} y2={y - 6} />
      </g>
    );
  if (kind === "server")
    return (
      <g style={s}>
        <rect x={x - 20} y={y - 16} width={40} height={14} rx={3} />
        <rect x={x - 20} y={y + 2} width={40} height={14} rx={3} />
        <line x1={x - 13} y1={y - 9} x2={x - 8} y2={y - 9} />
        <line x1={x - 13} y1={y + 9} x2={x - 8} y2={y + 9} />
      </g>
    );
  if (kind === "terminal")
    return (
      <g style={s}>
        <rect x={x - 22} y={y - 16} width={44} height={34} rx={5} />
        <path d={`M${x - 12} ${y - 4} l7 6 l-7 6`} />
        <line x1={x + 2} y1={y + 9} x2={x + 13} y2={y + 9} />
      </g>
    );
  if (kind === "phone")
    return (
      <g style={s}>
        <rect x={x - 12} y={y - 18} width={24} height={38} rx={5} />
        <line x1={x - 3} y1={y - 13} x2={x + 3} y2={y - 13} />
      </g>
    );
  // chip
  return (
    <g style={s}>
      <rect x={x - 14} y={y - 14} width={28} height={28} rx={4} />
      {[-7, 0, 7].map((d) => (
        <g key={d}>
          <line x1={x + d} y1={y - 14} x2={x + d} y2={y - 19} />
          <line x1={x + d} y1={y + 14} x2={x + d} y2={y + 19} />
          <line x1={x - 14} y1={y + d} x2={x - 19} y2={y + d} />
          <line x1={x + 14} y1={y + d} x2={x + 19} y2={y + d} />
        </g>
      ))}
    </g>
  );
}

/* ── javascript-beyond-the-browser: one language, many runtimes ──────────── */
export function RuntimeHub() {
  const cx = 170;
  const cy = 122;
  const devices = [
    { kind: "browser" as const, x: 170, y: 36, color: P.blue },
    { kind: "server" as const, x: 292, y: 96, color: P.green },
    { kind: "phone" as const, x: 256, y: 198, color: P.purple },
    { kind: "terminal" as const, x: 84, y: 198, color: P.orange },
    { kind: "chip" as const, x: 48, y: 96, color: P.red },
  ];
  return (
    <>
      {devices.map((d, i) => (
        <line key={i} x1={cx} y1={cy} x2={d.x} y2={d.y} style={{ stroke: P.line, strokeWidth: 2 }} />
      ))}
      {/* the language at the hub */}
      <rect x={cx - 30} y={cy - 26} width={60} height={52} rx={13} style={{ fill: P.blue }} />
      <g style={{ stroke: P.onFill, strokeWidth: 4, strokeLinecap: "round", fill: "none" }}>
        <path d={`M${cx - 12} ${cy - 12} q-7 0 -7 8 t-7 6 q7 0 7 6 t7 8`} />
        <path d={`M${cx + 12} ${cy - 12} q7 0 7 8 t7 6 q-7 0 -7 6 t-7 8`} />
      </g>
      {devices.map((d, i) => (
        <Device key={i} kind={d.kind} x={d.x} y={d.y} color={d.color} />
      ))}
    </>
  );
}

/* ── javascript-today: a general-purpose, everywhere language (globe) ─────── */
export function UbiquityGlobe() {
  const cx = 120;
  const cy = 120;
  const r = 92;
  return (
    <>
      <circle cx={cx} cy={cy} r={r} style={{ fill: P.blue, opacity: 0.06 }} />
      <circle cx={cx} cy={cy} r={r} style={{ fill: "none", stroke: P.blue, strokeWidth: 2.5 }} />
      {/* longitudes */}
      {[0.45, 0.9].map((k, i) => (
        <ellipse key={i} cx={cx} cy={cy} rx={r * k} ry={r} style={{ fill: "none", stroke: P.blue, strokeWidth: 1.8, opacity: 0.7 }} />
      ))}
      <line x1={cx} y1={cy - r} x2={cx} y2={cy + r} style={{ stroke: P.blue, strokeWidth: 1.8, opacity: 0.7 }} />
      {/* latitudes */}
      <line x1={cx - r} y1={cy} x2={cx + r} y2={cy} style={{ stroke: P.blue, strokeWidth: 1.8, opacity: 0.7 }} />
      {[-46, 46].map((dy, i) => {
        const half = Math.sqrt(r * r - dy * dy);
        return <line key={i} x1={cx - half} y1={cy + dy} x2={cx + half} y2={cy + dy} style={{ stroke: P.blue, strokeWidth: 1.6, opacity: 0.55 }} />;
      })}
      {/* nodes lit up across it */}
      {[
        { x: cx - 34, y: cy - 40, fill: P.green },
        { x: cx + 40, y: cy - 14, fill: P.yellow },
        { x: cx - 6, y: cy + 46, fill: P.red },
        { x: cx + 18, y: cy + 18, fill: P.green },
      ].map((n, i) => (
        <circle key={i} cx={n.x} cy={n.y} r={6} style={{ fill: n.fill }} />
      ))}
    </>
  );
}
