/**
 * Isometric illustrations — extruded blocks with shaded faces for depth. Face
 * shading is built from the accent mixed toward `--il-paper`, so the tints
 * stay light over the light page and turn into subtle dark shades over the
 * dark page from a single declaration. Each export renders the inner content
 * of an <svg>; the wrapper supplies the <svg>, viewBox and a11y.
 */

const mix = (accent: string, pct: number) => `color-mix(in srgb, ${accent} ${pct}%, var(--il-paper))`;

/** One flat isometric slab (a thin box) with a centered label on its top face. */
function IsoSlab({
  cx,
  cy,
  a,
  b,
  t,
  accent,
  label,
  labelSize,
}: {
  cx: number;
  cy: number;
  a: number;
  b: number;
  t: number;
  accent: string;
  label: string;
  labelSize: number;
}) {
  const top = `${cx},${cy - b} ${cx + a},${cy} ${cx},${cy + b} ${cx - a},${cy}`;
  // Front-left and front-right faces drop straight down by the thickness `t`.
  const right = `${cx + a},${cy} ${cx + a},${cy + t} ${cx},${cy + b + t} ${cx},${cy + b}`;
  const left = `${cx - a},${cy} ${cx - a},${cy + t} ${cx},${cy + b + t} ${cx},${cy + b}`;
  return (
    <g>
      <polygon points={left} fill={mix(accent, 58)} stroke={accent} strokeWidth={2} strokeLinejoin="round" />
      <polygon points={right} fill={mix(accent, 44)} stroke={accent} strokeWidth={2} strokeLinejoin="round" />
      <polygon points={top} fill={mix(accent, 26)} stroke={accent} strokeWidth={2} strokeLinejoin="round" />
      <text x={cx} y={cy + labelSize * 0.34} fontSize={labelSize} fontWeight={600} textAnchor="middle" fill="var(--il-ink)">
        {label}
      </text>
    </g>
  );
}

/* Variables — a named box that holds a value, whose contents can be reassigned
 * (with `let`). */
export function VariableBoxArt() {
  // Isometric box (closed) with three visible faces.
  const T_back = "140,78";
  const T_right = "212,114";
  const T_front = "140,150";
  const T_left = "68,114";
  const B_front = "140,214";
  const B_right = "212,178";
  const B_left = "68,178";
  return (
    <>
      {/* current value chip */}
      <rect x={110} y={24} width={76} height={34} rx={10} fill="var(--il-paper)" stroke="var(--il-blue)" strokeWidth={2.5} />
      <text className="mono" x={148} y={47} fontSize={18} fontWeight={700} textAnchor="middle" fill="var(--il-blue)">
        28
      </text>
      {/* it drops into the box */}
      <line x1={148} y1={58} x2={144} y2={74} stroke="var(--il-ink-2)" strokeWidth={2} />
      <path d="M144 78 L139 67 L150 69 Z" fill="var(--il-ink-2)" />

      {/* reassignment: 28 → 29 (let) */}
      <path d="M188 38 C 206 26, 218 26, 226 36" fill="none" stroke="var(--il-orange)" strokeWidth={2.5} strokeLinecap="round" />
      <path d="M226 36 L214 34 L221 25 Z" fill="var(--il-orange)" />
      <text x={210} y={16} fontSize={10} fontWeight={600} textAnchor="middle" fill="var(--il-orange)">
        let
      </text>
      <rect x={216} y={24} width={64} height={34} rx={10} fill="none" stroke="var(--il-muted)" strokeWidth={2} strokeDasharray="3 3" />
      <text className="mono" x={248} y={47} fontSize={18} fontWeight={700} textAnchor="middle" fill="var(--il-muted)">
        29
      </text>

      {/* the box (the variable) */}
      <polygon points={`${T_left} ${T_front} ${B_front} ${B_left}`} fill="var(--il-surface-2)" stroke="var(--il-ink)" strokeWidth={2.5} strokeLinejoin="round" />
      <polygon points={`${T_front} ${T_right} ${B_right} ${B_front}`} fill="var(--il-surface-3)" stroke="var(--il-ink)" strokeWidth={2.5} strokeLinejoin="round" />
      <polygon points={`${T_back} ${T_right} ${T_front} ${T_left}`} fill="var(--il-paper)" stroke="var(--il-ink)" strokeWidth={2.5} strokeLinejoin="round" />
      {/* name plate on the right face */}
      <text x={176} y={170} fontSize={17} fontWeight={700} textAnchor="middle" fill="var(--il-ink)">
        age
      </text>
    </>
  );
}

/* Arrays — a contiguous run of indexed slots; indices are zero-based. */
export function IndexedArrayArt() {
  const cells = [0, 1, 2, 3, 4];
  const W = 70;
  const H = 54;
  const d = 22; // iso depth
  const x0 = 40;
  const yTop = 86;
  const values = ["10", "20", "30", "40", "50"];
  const frontRight = x0 + cells.length * W; // 390
  return (
    <>
      {/* whole-bar top face */}
      <polygon
        points={`${x0},${yTop} ${x0 + d},${yTop - d} ${frontRight + d},${yTop - d} ${frontRight},${yTop}`}
        fill="var(--il-surface-2)"
        stroke="var(--il-ink)"
        strokeWidth={2.5}
        strokeLinejoin="round"
      />
      {/* end cap (right face) */}
      <polygon
        points={`${frontRight},${yTop} ${frontRight + d},${yTop - d} ${frontRight + d},${yTop + H - d} ${frontRight},${yTop + H}`}
        fill="var(--il-surface-3)"
        stroke="var(--il-ink)"
        strokeWidth={2.5}
        strokeLinejoin="round"
      />
      {/* front face */}
      <rect x={x0} y={yTop} width={cells.length * W} height={H} fill="var(--il-paper)" stroke="var(--il-ink)" strokeWidth={2.5} />

      {/* cell dividers (front + matching top slant) and values */}
      {cells.map((i) => {
        const fx = x0 + i * W;
        const cxFront = fx + W / 2;
        return (
          <g key={i}>
            {i > 0 && (
              <>
                <line x1={fx} y1={yTop} x2={fx} y2={yTop + H} stroke="var(--il-ink)" strokeWidth={1.5} />
                <line x1={fx} y1={yTop} x2={fx + d} y2={yTop - d} stroke="var(--il-ink)" strokeWidth={1.5} />
              </>
            )}
            <text x={cxFront} y={yTop + 34} fontSize={16} fontWeight={600} textAnchor="middle" fill="var(--il-ink)">
              {values[i]}
            </text>
            {/* index badge floating above the cell */}
            <line x1={cxFront} y1={51} x2={cxFront - d / 2} y2={yTop - d / 2} stroke="var(--il-ink-2)" strokeWidth={1.25} />
            <circle cx={cxFront} cy={40} r={11} fill="var(--il-teal)" stroke="var(--il-ink)" strokeWidth={2} />
            <text className="mono" x={cxFront} y={44} fontSize={12} fontWeight={700} textAnchor="middle" fill="var(--il-paper)">
              {i}
            </text>
          </g>
        );
      })}

      {/* label above the first (index 0) cell */}
      <text x={x0 + W / 2} y={18} fontSize={10.5} textAnchor="middle" fill="var(--il-muted)">
        index starts at 0
      </text>
      <text x={frontRight + d} y={yTop + H + 18} fontSize={11} textAnchor="end" fill="var(--il-muted)">
        length 5
      </text>
    </>
  );
}

/* Scope — names are resolved by walking outward through nested scopes (block →
 * function → global) until a match is found. */
export function ScopeNestingArt() {
  return (
    <>
      {/* slabs: global (largest) at the bottom, block (smallest) on top */}
      <IsoSlab cx={171} cy={236} a={128} b={52} t={13} accent="var(--il-blue)" label="global" labelSize={13} />
      <IsoSlab cx={171} cy={176} a={94} b={40} t={13} accent="var(--il-teal)" label="function" labelSize={12} />
      <IsoSlab cx={171} cy={120} a={62} b={27} t={13} accent="var(--il-purple)" label="block" labelSize={11} />

      {/* the name being looked up (sits above the innermost scope) */}
      <rect x={154} y={48} width={34} height={28} rx={8} fill="var(--il-paper)" stroke="var(--il-purple)" strokeWidth={2.5} />
      <text className="mono" x={171} y={68} fontSize={15} fontWeight={700} textAnchor="middle" fill="var(--il-purple)">
        x
      </text>

      {/* lookup chain: routed right of the labels, down/outward through `block`
          until a match is found in the `function` scope */}
      <path d="M189 62 C 248 84, 248 150, 204 174" fill="none" stroke="var(--il-ink-2)" strokeWidth={2} strokeDasharray="3 4" />
      <path d="M204 174 L210 163 L214 173 Z" fill="var(--il-ink-2)" />
      <text x={262} y={120} fontSize={10.5} textAnchor="middle" fill="var(--il-muted)">
        look outward
      </text>
      {/* found marker on the function scope */}
      <circle cx={201} cy={176} r={4.5} fill="var(--il-green)" stroke="var(--il-ink)" strokeWidth={1.5} />
    </>
  );
}
