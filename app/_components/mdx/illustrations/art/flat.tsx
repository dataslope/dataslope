/**
 * Flat-geometric illustrations — solid accent fills, rounded shapes, ink
 * outlines. Each export renders the inner content of an <svg>; the wrapper in
 * `Illustration.tsx` supplies the <svg>, viewBox and a11y.
 *
 * `--il-paper` doubles as the "on-accent" text color: it is white in light
 * mode (legible on a mid-tone 500 fill) and dark in dark mode (legible on the
 * brighter 400 fill), so labels stay readable on colored shapes in both modes.
 */

/** A small right-pointing arrowhead with its tip at (x, y). */
function ArrowRight({ x, y, color, s = 6 }: { x: number; y: number; color: string; s?: number }) {
  return <path d={`M${x} ${y} L${x - s * 1.7} ${y - s} L${x - s * 1.7} ${y + s} Z`} fill={color} />;
}

/* Birth of JavaScript — a language designed in ten days: a calendar racing an
 * alarm clock. */
export function TenDaySprintArt() {
  return (
    <>
      {/* speed lines behind the clock */}
      <g stroke="var(--il-orange)" strokeWidth={3} strokeLinecap="round" opacity={0.85}>
        <line x1={348} y1={156} x2={372} y2={156} />
        <line x1={352} y1={170} x2={380} y2={170} />
        <line x1={348} y1={184} x2={372} y2={184} />
      </g>

      {/* calendar bindings */}
      <rect x={86} y={42} width={9} height={20} rx={4} fill="var(--il-paper)" stroke="var(--il-ink)" strokeWidth={2.5} />
      <rect x={186} y={42} width={9} height={20} rx={4} fill="var(--il-paper)" stroke="var(--il-ink)" strokeWidth={2.5} />

      {/* calendar card */}
      <rect x={40} y={50} width={200} height={150} rx={16} fill="var(--il-paper)" stroke="var(--il-ink)" strokeWidth={3} />
      <path d="M40 66 a16 16 0 0 1 16 -16 h168 a16 16 0 0 1 16 16 v28 h-200 Z" fill="var(--il-blue)" />
      <text x={140} y={78} fontSize={12} fontWeight={700} letterSpacing={3} textAnchor="middle" fill="var(--il-paper)">
        APRIL 1995
      </text>
      <text x={125} y={172} fontSize={58} fontWeight={800} textAnchor="middle" fill="var(--il-blue)">
        10
      </text>
      <text x={125} y={192} fontSize={12} fontWeight={700} letterSpacing={4} textAnchor="middle" fill="var(--il-ink-2)">
        DAYS
      </text>

      {/* alarm clock */}
      <rect x={283} y={111} width={14} height={9} rx={3} fill="var(--il-orange)" stroke="var(--il-ink)" strokeWidth={2.5} />
      <ellipse cx={267} cy={132} rx={12} ry={11} fill="var(--il-orange)" stroke="var(--il-ink)" strokeWidth={2.5} />
      <ellipse cx={313} cy={132} rx={12} ry={11} fill="var(--il-orange)" stroke="var(--il-ink)" strokeWidth={2.5} />
      <circle cx={290} cy={170} r={46} fill="var(--il-paper)" stroke="var(--il-ink)" strokeWidth={3} />
      <g stroke="var(--il-orange)" strokeWidth={2.5} strokeLinecap="round">
        <line x1={290} y1={132} x2={290} y2={140} />
        <line x1={290} y1={200} x2={290} y2={208} />
        <line x1={252} y1={170} x2={260} y2={170} />
        <line x1={320} y1={170} x2={328} y2={170} />
      </g>
      <g stroke="var(--il-ink)" strokeWidth={3} strokeLinecap="round">
        <line x1={290} y1={170} x2={290} y2={142} />
        <line x1={290} y1={170} x2={270} y2={154} />
      </g>
      <circle cx={290} cy={170} r={4.5} fill="var(--il-orange)" stroke="var(--il-ink)" strokeWidth={1.5} />
      {/* feet */}
      <line x1={262} y1={212} x2={252} y2={224} stroke="var(--il-ink)" strokeWidth={3} strokeLinecap="round" />
      <line x1={318} y1={212} x2={328} y2={224} stroke="var(--il-ink)" strokeWidth={3} strokeLinecap="round" />
    </>
  );
}

/* Functions — inputs go in, work happens, an output comes out. */
export function FunctionMachineArt() {
  const gx = 225;
  const gy = 72;
  const teeth = Array.from({ length: 8 }, (_, i) => i * 45);
  return (
    <>
      {/* input tokens */}
      <circle cx={46} cy={96} r={17} fill="var(--il-blue)" stroke="var(--il-ink)" strokeWidth={2.5} />
      <text className="mono" x={46} y={101} fontSize={14} fontWeight={600} textAnchor="middle" fill="var(--il-paper)">
        a
      </text>
      <circle cx={46} cy={148} r={17} fill="var(--il-teal)" stroke="var(--il-ink)" strokeWidth={2.5} />
      <text className="mono" x={46} y={153} fontSize={14} fontWeight={600} textAnchor="middle" fill="var(--il-paper)">
        b
      </text>
      <text x={46} y={186} fontSize={11} textAnchor="middle" fill="var(--il-muted)">
        inputs
      </text>

      {/* feed arrows */}
      <path d="M65 98 C 110 102, 110 112, 146 112" fill="none" stroke="var(--il-ink-2)" strokeWidth={2.5} />
      <path d="M65 146 C 110 142, 110 132, 146 132" fill="none" stroke="var(--il-ink-2)" strokeWidth={2.5} />
      <ArrowRight x={150} y={112} color="var(--il-ink-2)" />
      <ArrowRight x={150} y={132} color="var(--il-ink-2)" />

      {/* machine body */}
      <rect x={150} y={74} width={150} height={100} rx={18} fill="var(--il-paper)" stroke="var(--il-ink)" strokeWidth={3} />

      {/* gear on top */}
      {teeth.map((a) => (
        <rect
          key={a}
          x={gx - 4}
          y={gy - 21}
          width={8}
          height={9}
          rx={2}
          fill="var(--il-purple)"
          stroke="var(--il-ink)"
          strokeWidth={1.5}
          transform={`rotate(${a} ${gx} ${gy})`}
        />
      ))}
      <circle cx={gx} cy={gy} r={13} fill="var(--il-purple)" stroke="var(--il-ink)" strokeWidth={2.5} />
      <circle cx={gx} cy={gy} r={4.5} fill="var(--il-paper)" />

      <text x={225} y={134} fontSize={34} fontWeight={800} textAnchor="middle" fill="var(--il-purple)">
        fn
      </text>
      <text x={225} y={156} fontSize={10.5} textAnchor="middle" fill="var(--il-muted)">
        do some work
      </text>

      {/* output */}
      <line x1={300} y1={124} x2={356} y2={124} stroke="var(--il-ink-2)" strokeWidth={2.5} />
      <ArrowRight x={360} y={124} color="var(--il-ink-2)" />
      <circle cx={392} cy={124} r={22} fill="var(--il-green)" stroke="var(--il-ink)" strokeWidth={3} />
      <text className="mono" x={392} y={129} fontSize={14} fontWeight={600} textAnchor="middle" fill="var(--il-paper)">
        out
      </text>
      <text x={392} y={166} fontSize={11} textAnchor="middle" fill="var(--il-muted)">
        output
      </text>
    </>
  );
}

/* Loops — repeat the body, advancing a counter each time around. */
export function LoopCycleArt() {
  return (
    <>
      {/* step ticks on the ring */}
      <g fill="var(--il-teal)">
        <circle cx={65} cy={150} r={4} />
        <circle cx={160} cy={245} r={4} />
        <circle cx={255} cy={150} r={4} />
      </g>

      {/* the loop arrow (clockwise, gap at the top) */}
      <path
        d="M122 64 A 95 95 0 1 1 198 64"
        fill="none"
        stroke="var(--il-blue)"
        strokeWidth={5}
        strokeLinecap="round"
      />
      <path d="M198 64 L182 56 L188 74 Z" fill="var(--il-blue)" />

      {/* the repeated work — a small deck of cards */}
      <rect x={118} y={130} width={92} height={34} rx={9} fill="var(--il-surface-2)" stroke="var(--il-ink)" strokeWidth={2} />
      <rect x={110} y={143} width={92} height={34} rx={9} fill="var(--il-paper)" stroke="var(--il-ink)" strokeWidth={2} />
      <rect x={102} y={156} width={92} height={34} rx={9} fill="var(--il-paper)" stroke="var(--il-ink)" strokeWidth={2.5} />
      <rect x={108} y={161} width={6} height={24} rx={3} fill="var(--il-teal)" />
      <text x={156} y={177} fontSize={13} textAnchor="middle" fill="var(--il-ink)">
        body
      </text>

      {/* counter badge sitting in the gap */}
      <rect x={138} y={42} width={44} height={26} rx={13} fill="var(--il-orange)" stroke="var(--il-ink)" strokeWidth={2.5} />
      <text className="mono" x={160} y={59} fontSize={13} fontWeight={700} textAnchor="middle" fill="var(--il-paper)">
        i++
      </text>
    </>
  );
}

/* Map / filter / reduce — a data pipeline: transform every item, drop some,
 * then combine the rest into a single value. */
export function TransformPipelineArt() {
  const y = 100;
  return (
    <>
      {/* lane line */}
      <line x1={16} y1={y} x2={462} y2={y} stroke="var(--il-hair)" strokeWidth={1.5} strokeDasharray="2 6" />

      {/* input set: four squares */}
      <g fill="var(--il-blue)" stroke="var(--il-ink)" strokeWidth={1.5}>
        <rect x={14} y={y - 6} width={12} height={12} rx={2} />
        <rect x={30} y={y - 6} width={12} height={12} rx={2} />
        <rect x={46} y={y - 6} width={12} height={12} rx={2} />
        <rect x={62} y={y - 6} width={12} height={12} rx={2} />
      </g>
      <text x={44} y={y + 28} fontSize={10} textAnchor="middle" fill="var(--il-muted)">
        input
      </text>

      <ArrowRight x={90} y={y} color="var(--il-ink-2)" />
      <line x1={78} y1={y} x2={86} y2={y} stroke="var(--il-ink-2)" strokeWidth={2} />

      {/* map */}
      <rect x={92} y={y - 24} width={68} height={48} rx={12} fill="var(--il-paper)" stroke="var(--il-blue)" strokeWidth={2.5} />
      <text x={126} y={y - 2} fontSize={14} fontWeight={700} textAnchor="middle" fill="var(--il-blue)">
        map
      </text>
      <text className="mono" x={126} y={y + 13} fontSize={9} textAnchor="middle" fill="var(--il-muted)">
        n→n²
      </text>

      <ArrowRight x={178} y={y} color="var(--il-ink-2)" />
      <line x1={162} y1={y} x2={174} y2={y} stroke="var(--il-ink-2)" strokeWidth={2} />

      {/* mapped set: four circles */}
      <g fill="var(--il-teal)" stroke="var(--il-ink)" strokeWidth={1.5}>
        <circle cx={192} cy={y} r={6} />
        <circle cx={208} cy={y} r={6} />
        <circle cx={224} cy={y} r={6} />
        <circle cx={240} cy={y} r={6} />
      </g>

      <ArrowRight x={250} y={y} color="var(--il-ink-2)" />
      <line x1={248} y1={y} x2={250} y2={y} stroke="var(--il-ink-2)" strokeWidth={2} />

      {/* filter */}
      <rect x={252} y={y - 24} width={68} height={48} rx={12} fill="var(--il-paper)" stroke="var(--il-orange)" strokeWidth={2.5} />
      <text x={286} y={y - 2} fontSize={13} fontWeight={700} textAnchor="middle" fill="var(--il-orange)">
        filter
      </text>
      <text className="mono" x={286} y={y + 13} fontSize={9} textAnchor="middle" fill="var(--il-muted)">
        n&gt;0
      </text>

      <ArrowRight x={338} y={y} color="var(--il-ink-2)" />
      <line x1={322} y1={y} x2={334} y2={y} stroke="var(--il-ink-2)" strokeWidth={2} />

      {/* filtered set: two kept, two dropped (ghosted) */}
      <g fill="var(--il-teal)" stroke="var(--il-ink)" strokeWidth={1.5}>
        <circle cx={350} cy={y} r={6} />
        <circle cx={366} cy={y} r={6} />
      </g>
      <g fill="none" stroke="var(--il-muted)" strokeWidth={1.5} strokeDasharray="2 3">
        <circle cx={350} cy={y + 24} r={6} />
        <circle cx={366} cy={y + 24} r={6} />
      </g>

      <ArrowRight x={380} y={y} color="var(--il-ink-2)" />
      <line x1={378} y1={y} x2={380} y2={y} stroke="var(--il-ink-2)" strokeWidth={2} />

      {/* reduce */}
      <rect x={382} y={y - 24} width={64} height={48} rx={12} fill="var(--il-paper)" stroke="var(--il-purple)" strokeWidth={2.5} />
      <text x={414} y={y - 2} fontSize={12.5} fontWeight={700} textAnchor="middle" fill="var(--il-purple)">
        reduce
      </text>
      <text className="mono" x={414} y={y + 13} fontSize={9} textAnchor="middle" fill="var(--il-muted)">
        a+b
      </text>

      <line x1={448} y1={y} x2={456} y2={y} stroke="var(--il-ink-2)" strokeWidth={2} />
      <ArrowRight x={460} y={y} color="var(--il-ink-2)" />
      {/* the single reduced value */}
      <circle cx={480} cy={y} r={14} fill="var(--il-purple)" stroke="var(--il-ink)" strokeWidth={2.5} />
      <text x={480} y={y + 5} fontSize={15} fontWeight={700} textAnchor="middle" fill="var(--il-paper)">
        Σ
      </text>
    </>
  );
}
