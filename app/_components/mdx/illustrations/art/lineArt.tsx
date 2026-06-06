/**
 * Line-art illustrations — thin `--il-ink` strokes, generous whitespace, a
 * single accent per piece. Each export renders the *inner* content of an
 * <svg>; the surrounding <svg> (viewBox, sizing, a11y) is supplied by
 * `Illustration.tsx`.
 */

/* Values & Types — a value can take any of several typed forms, drawn as a
 * small constellation of labelled chips converging on one node. */
export function TypedValuesArt() {
  const W = 150;
  const H = 54;
  const cx = 210;
  const cy = 120;
  const chips = [
    { x: 24, y: 32, side: "right", accent: "var(--il-blue)", value: "42", type: "number" },
    { x: 246, y: 28, side: "left", accent: "var(--il-teal)", value: '"hi"', type: "string" },
    { x: 18, y: 152, side: "right", accent: "var(--il-green)", value: "true", type: "boolean" },
    { x: 240, y: 156, side: "left", accent: "var(--il-purple)", value: "[1, 2, 3]", type: "array" },
  ] as const;

  return (
    <>
      {/* connectors from the central node to each chip */}
      {chips.map((c, i) => {
        const ax = c.side === "right" ? c.x + W : c.x;
        const ay = c.y + H / 2;
        return (
          <line
            key={`l${i}`}
            x1={cx}
            y1={cy}
            x2={ax}
            y2={ay}
            stroke="var(--il-hair)"
            strokeWidth={1.5}
          />
        );
      })}

      {/* central node */}
      <circle cx={cx} cy={cy} r={15} fill="none" stroke="var(--il-hair)" strokeWidth={1.5} />
      <circle cx={cx} cy={cy} r={5} fill="var(--il-ink-2)" />

      {/* chips */}
      {chips.map((c, i) => (
        <g key={`c${i}`}>
          <rect
            x={c.x}
            y={c.y}
            width={W}
            height={H}
            rx={H / 2}
            fill="var(--il-paper)"
            stroke="var(--il-ink)"
            strokeWidth={2}
          />
          <circle cx={c.x + 28} cy={c.y + H / 2} r={7} fill={c.accent} />
          <text
            className="mono"
            x={c.x + 50}
            y={c.y + 26}
            fontSize={17}
            fontWeight={600}
            fill="var(--il-ink)"
          >
            {c.value}
          </text>
          <text x={c.x + 50} y={c.y + 43} fontSize={11} fill="var(--il-muted)">
            {c.type}
          </text>
        </g>
      ))}
    </>
  );
}

/* Conditionals — control flow forks at a decision diamond into a taken
 * (highlighted) branch and a skipped (muted) branch. */
export function BranchingPathArt() {
  return (
    <>
      {/* incoming path */}
      <circle cx={26} cy={116} r={5} fill="var(--il-ink-2)" />
      <line x1={26} y1={116} x2={160} y2={116} stroke="var(--il-ink)" strokeWidth={2.5} />

      {/* decision diamond */}
      <path
        d="M190 86 L220 116 L190 146 L160 116 Z"
        fill="var(--il-paper)"
        stroke="var(--il-ink)"
        strokeWidth={2.5}
        strokeLinejoin="round"
      />
      <text className="mono" x={190} y={120} fontSize={11} textAnchor="middle" fill="var(--il-ink)">
        x &gt; 0
      </text>

      {/* TRUE branch — taken, accented green */}
      <path
        d="M220 116 C 252 116, 262 72, 296 72"
        fill="none"
        stroke="var(--il-green)"
        strokeWidth={2.5}
        strokeLinecap="round"
      />
      <path d="M308 72 L296 66 L296 78 Z" fill="var(--il-green)" />
      <text x={250} y={58} fontSize={11} fontWeight={600} fill="var(--il-green)">
        true
      </text>
      <rect
        x={308}
        y={50}
        width={96}
        height={44}
        rx={12}
        fill="var(--il-paper)"
        stroke="var(--il-green)"
        strokeWidth={2.5}
      />
      <text x={356} y={77} fontSize={13} textAnchor="middle" fill="var(--il-ink)">
        run this
      </text>

      {/* FALSE branch — skipped, muted + dashed */}
      <path
        d="M190 146 C 190 178, 262 174, 296 174"
        fill="none"
        stroke="var(--il-muted)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeDasharray="2 6"
      />
      <path d="M308 174 L296 168 L296 180 Z" fill="var(--il-muted)" />
      <text x={250} y={196} fontSize={11} fontWeight={600} fill="var(--il-muted)">
        false
      </text>
      <rect
        x={308}
        y={152}
        width={96}
        height={44}
        rx={12}
        fill="var(--il-paper)"
        stroke="var(--il-muted)"
        strokeWidth={2}
      />
      <text x={356} y={179} fontSize={13} textAnchor="middle" fill="var(--il-muted)">
        skip / else
      </text>
    </>
  );
}
