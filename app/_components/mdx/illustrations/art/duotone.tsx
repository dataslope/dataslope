/**
 * Duotone / editorial illustrations — an accent paired with a soft tint of the
 * same hue, layered for depth. Each export renders the inner content of an
 * <svg>; the wrapper supplies the <svg>, viewBox and a11y.
 *
 * Two fill helpers, both theme-aware from one declaration:
 *   tint() mixes the accent toward `--il-paper` → an OPAQUE surface that reads
 *          as a tint on the light page and a subtle shade on the dark page.
 *   wash() mixes the accent toward transparent → an ambient glaze that lets the
 *          page show through (used only for large background shapes).
 */

const tint = (accent: string, pct: number) => `color-mix(in srgb, ${accent} ${pct}%, var(--il-paper))`;
const wash = (accent: string, pct: number) => `color-mix(in srgb, ${accent} ${pct}%, transparent)`;

/* Welcome — learning to think in code as a climb: a rising slope (a nod to
 * "DataSlope") past milestones to a goal, over an ambient field of code. */
export function WelcomeJourneyArt() {
  const dots = [
    { x: 120, y: 188, accent: "var(--il-blue)" },
    { x: 210, y: 150, accent: "var(--il-teal)" },
    { x: 300, y: 116, accent: "var(--il-purple)" },
    { x: 388, y: 84, accent: "var(--il-orange)" },
  ];
  const slope = "M44 214 C 150 206, 168 168, 240 150 S 360 104, 430 64";
  return (
    <>
      {/* ambient blobs + faint code motifs */}
      <circle cx={120} cy={90} r={66} fill={wash("var(--il-blue)", 14)} />
      <circle cx={332} cy={84} r={82} fill={wash("var(--il-teal)", 12)} />
      <circle cx={410} cy={186} r={58} fill={wash("var(--il-purple)", 12)} />
      <text className="mono" x={120} y={104} fontSize={52} fontWeight={700} textAnchor="middle" fill={wash("var(--il-blue)", 22)}>
        {"{ }"}
      </text>
      <text className="mono" x={336} y={96} fontSize={40} fontWeight={700} textAnchor="middle" fill={wash("var(--il-teal)", 22)}>
        {"=>"}
      </text>

      {/* the slope: a filled hill under a bright ridge line */}
      <path d={`${slope} L430 232 L44 232 Z`} fill={wash("var(--il-blue)", 12)} stroke="none" />
      <path d={slope} fill="none" stroke="var(--il-blue)" strokeWidth={4} strokeLinecap="round" />

      {/* milestones */}
      {dots.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={6.5} fill="var(--il-paper)" stroke={d.accent} strokeWidth={3} />
      ))}

      {/* start: a small code prompt the path grows from */}
      <rect x={18} y={196} width={56} height={34} rx={9} fill="var(--il-paper)" stroke="var(--il-teal)" strokeWidth={2.5} />
      <text className="mono" x={46} y={218} fontSize={15} fontWeight={700} textAnchor="middle" fill="var(--il-teal)">
        {"</>"}
      </text>

      {/* summit: flag + spark */}
      <line x1={430} y1={64} x2={430} y2={34} stroke="var(--il-ink)" strokeWidth={2.5} strokeLinecap="round" />
      <path d="M430 36 L460 44 L430 52 Z" fill="var(--il-orange)" stroke="var(--il-ink)" strokeWidth={1.5} strokeLinejoin="round" />
      <path
        d="M450 18 L453 28 L463 31 L453 34 L450 44 L447 34 L437 31 L447 28 Z"
        fill="var(--il-yellow)"
        stroke="var(--il-orange)"
        strokeWidth={1.25}
        strokeLinejoin="round"
      />
    </>
  );
}

/* Objects — a bag of named values: keys on the left mapped to values on the
 * right, inside one labelled record. */
export function ObjectKeyValueArt() {
  const rows = [
    { y: 108, key: "name", value: '"Ada"', accent: "var(--il-purple)" },
    { y: 156, key: "age", value: "28", accent: "var(--il-orange)" },
    { y: 204, key: "isAdmin", value: "true", accent: "var(--il-green)" },
  ];
  return (
    <>
      {/* card */}
      <rect x={66} y={32} width={268} height={208} rx={18} fill="var(--il-paper)" stroke="var(--il-ink)" strokeWidth={2.5} />
      {/* header band */}
      <path d="M66 50 a18 18 0 0 1 18 -18 h232 a18 18 0 0 1 18 18 v26 h-268 Z" fill={tint("var(--il-blue)", 18)} />
      <line x1={66} y1={76} x2={334} y2={76} stroke="var(--il-ink)" strokeWidth={1.5} />
      <text className="mono" x={200} y={61} fontSize={15} fontWeight={700} textAnchor="middle" fill="var(--il-ink)">
        {"{ user }"}
      </text>

      {rows.map((r, i) => (
        <g key={i}>
          {/* key chip */}
          <rect x={86} y={r.y - 17} width={96} height={34} rx={9} fill={tint("var(--il-teal)", 20)} stroke="var(--il-teal)" strokeWidth={2} />
          <text className="mono" x={134} y={r.y + 5} fontSize={13} textAnchor="middle" fill="var(--il-ink)">
            {r.key}
          </text>
          {/* colon connector */}
          <circle cx={203} cy={r.y - 4} r={1.8} fill="var(--il-muted)" />
          <circle cx={203} cy={r.y + 4} r={1.8} fill="var(--il-muted)" />
          {/* value chip */}
          <rect x={218} y={r.y - 17} width={96} height={34} rx={9} fill={tint(r.accent, 20)} stroke={r.accent} strokeWidth={2} />
          <text className="mono" x={266} y={r.y + 5} fontSize={13} textAnchor="middle" fill="var(--il-ink)">
            {r.value}
          </text>
        </g>
      ))}
    </>
  );
}

/* Closures — a function, returned from the scope it was born in, carries a
 * "backpack" of the variables it closed over. */
export function ClosureBackpackArt() {
  return (
    <>
      {/* the scope it was born in */}
      <rect x={26} y={40} width={308} height={214} rx={22} fill={wash("var(--il-purple)", 7)} stroke="var(--il-muted)" strokeWidth={2} strokeDasharray="4 5" />
      <text x={180} y={62} fontSize={11} textAnchor="middle" fill="var(--il-muted)">
        the scope it was born in
      </text>

      {/* backpack (drawn first → sits behind, on the function's back) */}
      <path d="M150 132 C 150 110, 210 110, 210 132" fill="none" stroke="var(--il-orange)" strokeWidth={5} strokeLinecap="round" />
      <rect x={92} y={132} width={86} height={96} rx={20} fill={tint("var(--il-orange)", 24)} stroke="var(--il-orange)" strokeWidth={3} />
      <rect x={92} y={152} width={86} height={34} rx={10} fill={tint("var(--il-orange)", 40)} stroke="var(--il-orange)" strokeWidth={2} />
      <circle cx={135} cy={170} r={6} fill="var(--il-paper)" stroke="var(--il-orange)" strokeWidth={2} />
      {/* captured-variable tag peeking out of the pack */}
      <rect x={96} y={112} width={78} height={26} rx={7} fill="var(--il-paper)" stroke="var(--il-orange)" strokeWidth={2} />
      <text className="mono" x={135} y={129} fontSize={11} fontWeight={600} textAnchor="middle" fill="var(--il-ink)">
        greeting
      </text>

      {/* the function */}
      <rect x={158} y={120} width={120} height={112} rx={26} fill={tint("var(--il-purple)", 20)} stroke="var(--il-purple)" strokeWidth={3} />
      <text x={218} y={190} fontSize={40} fontWeight={800} textAnchor="middle" fill="var(--il-purple)">
        fn
      </text>
      <text x={218} y={212} fontSize={10.5} textAnchor="middle" fill="var(--il-muted)">
        remembers
      </text>
    </>
  );
}

/* Promises — a placeholder you hold now for a value that settles later, into
 * either fulfilled (a value) or rejected (an error). */
export function PromisePlaceholderArt() {
  return (
    <>
      {/* the promise "ticket" with a perforated stub + pending spinner */}
      <rect x={36} y={84} width={140} height={72} rx={14} fill={tint("var(--il-blue)", 14)} stroke="var(--il-blue)" strokeWidth={2.5} />
      <line x1={74} y1={92} x2={74} y2={148} stroke="var(--il-blue)" strokeWidth={1.75} strokeDasharray="3 4" />
      <path d="M55 108 A 13 13 0 1 1 46 130" fill="none" stroke="var(--il-orange)" strokeWidth={3} strokeLinecap="round" />
      <circle cx={55} cy={108} r={2.5} fill="var(--il-orange)" />
      <text x={128} y={114} fontSize={13} fontWeight={700} textAnchor="middle" fill="var(--il-blue)">
        Promise
      </text>
      <text x={128} y={134} fontSize={11} textAnchor="middle" fill="var(--il-muted)">
        pending…
      </text>

      {/* time → it settles, exactly once */}
      <text x={214} y={110} fontSize={10.5} textAnchor="middle" fill="var(--il-muted)">
        later
      </text>
      <path d="M176 120 L250 120" fill="none" stroke="var(--il-ink-2)" strokeWidth={2.5} />
      <path d="M250 120 C 272 120, 280 80, 300 80" fill="none" stroke="var(--il-ink-2)" strokeWidth={2.5} />
      <path d="M250 120 C 272 120, 280 162, 300 162" fill="none" stroke="var(--il-ink-2)" strokeWidth={2.5} />
      <path d="M312 80 L300 74 L300 86 Z" fill="var(--il-ink-2)" />
      <path d="M312 162 L300 156 L300 168 Z" fill="var(--il-ink-2)" />

      {/* fulfilled */}
      <rect x={312} y={58} width={104} height={44} rx={12} fill={tint("var(--il-green)", 20)} stroke="var(--il-green)" strokeWidth={2.5} />
      <circle cx={332} cy={80} r={9} fill="var(--il-green)" />
      <path d="M327 80 L331 84 L338 76" fill="none" stroke="var(--il-paper)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <text x={350} y={77} fontSize={12} fontWeight={700} fill="var(--il-green)">
        fulfilled
      </text>
      <text className="mono" x={350} y={91} fontSize={10} fill="var(--il-muted)">
        value
      </text>

      {/* rejected */}
      <rect x={312} y={140} width={104} height={44} rx={12} fill={tint("var(--il-red)", 18)} stroke="var(--il-red)" strokeWidth={2.5} />
      <circle cx={332} cy={162} r={9} fill="var(--il-red)" />
      <path d="M328 158 L336 166 M336 158 L328 166" fill="none" stroke="var(--il-paper)" strokeWidth={2} strokeLinecap="round" />
      <text x={350} y={159} fontSize={12} fontWeight={700} fill="var(--il-red)">
        rejected
      </text>
      <text className="mono" x={350} y={173} fontSize={10} fill="var(--il-muted)">
        error
      </text>
    </>
  );
}
