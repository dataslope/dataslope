import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { Axis, sx, type XScale } from "../../editorial/charts";
import { useLayout } from "../../editorial/layout";
import { BAR, body, fmt, halo, INK, INK_SOFT, label, note, PAPER } from "../../editorial/style";
import { FigLabel, Ink, Leader, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { DESIGN, PEEKING } from "./data";
import { Count, Headline, lerp, partial, Ring, STAT, STAT_INK, Svg } from "./parts";

const X: XScale = { lo: 0, hi: PEEKING.planned, x0: 260, x1: 1640 };
const BASE = 864;
const TOP = 548;
/** The p-value scale tops out here: the run never climbs past 0.56. */
const P_MAX = 0.6;
const BAR_X0 = 1120;
const BAR_W = 560;
const num = (v: number) => Math.round(v).toLocaleString("en-US");
/** The index of the row where the second dip ends: the line has shown both by "twice". */
const LAST_UNDER = PEEKING.rows.reduce((k, r, i) => (r.p < PEEKING.alpha ? i : k), 0);
const FIRST = PEEKING.rows.findIndex((r) => r.n === PEEKING.crossingAt[0]);
const SECOND = PEEKING.rows.findIndex((r) => r.n === PEEKING.crossingAt[1]);

/**
 * The two decisions left before anyone clicks: the sample size, from the
 * smallest lift worth catching, and running to it. A test of two identical
 * arms, its p-value recomputed every hundred visitors, dips under 0.05 twice
 * and ends at 0.19.
 */
export const PeekScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();
  const py = (p: number) => y(BASE) - h(((BASE - TOP) * p) / P_MAX);

  // ── Cues ──
  const sizeFrom = n.beat("size").from;
  const catchAt = n.word("size", "ten percent");
  const powerAt = n.word("size", "eighty percent power");
  const threeAt = n.word("size", "three thousand");
  const perArmAt = n.word("size", "per arm");
  const peekAt = n.word("peek", "no peeking");
  const hereAt = n.word("peek", "Here's a test");
  const identicalAt = n.word("peek", "identical");
  const nothingAt = n.word("peek", "nothing to find");
  const recomputeAt = n.word("wander", "Recompute");
  const ohFiveAt = n.word("wander", "point oh five");
  const twiceAt = n.word("wander", "twice", { edge: "end" });
  const firstDipAt = n.word("stop", "first dip");
  const noiseAt = n.word("stop", "noise");
  const plannedAt = n.word("stop", "planned");
  const nineteenAt = n.word("stop", "point one nine");
  const numberAt = n.word("result-in", "set the number");
  const onceAt = n.word("result-in", "look once");

  // ── The line: drawn to the end of the second dip by "twice", then on to the plan ──
  const rows = PEEKING.rows;
  const pts = rows.map((r) => [sx(X, r.n), py(r.p)] as const);
  const last = rows.length - 1;
  const firstLeg = ease(frame, recomputeAt - 2, Math.max(20, twiceAt - recomputeAt - 4));
  const secondLeg = ease(frame, plannedAt - 10, Math.max(16, nineteenAt - plannedAt + 6));
  const reach = lerp(0, LAST_UNDER + 2, firstLeg) + (last - LAST_UNDER - 2) * secondLeg;
  const shownN = rows[Math.min(last, Math.floor(reach))].n;
  const dimBefore = ease(frame, onceAt - 4, 14);
  const sizeDim = 1 - 0.55 * ease(frame, peekAt - 6, 14);
  // The size panel holds the middle of the page alone, then rises to make room.
  const rise = ease(frame, peekAt - 10, 24);
  const filled = ease(frame, threeAt - 4, 30);
  const band = ease(frame, identicalAt - 4, 14);
  const flash = ease(frame, ohFiveAt - 4, 8) * (1 - ease(frame, ohFiveAt + 10, 14));
  const planned = ease(frame, plannedAt - 6, 14);

  return (
    <AbsoluteFill>
      {/* ── Sound: the users counting up, the line wandering, each dip, the plan ── */}
      <Sfx name="el-sprinkle" at={threeAt - 4} level={-34} />
      <Sfx name="el-pencil" at={recomputeAt - 2} level={-34} />
      <Sfx name="el-tap" at={recomputeAt - 2 + (FIRST / (LAST_UNDER + 2)) * Math.max(20, twiceAt - recomputeAt - 4)} level={-28} />
      <Sfx name="el-tap" at={recomputeAt - 2 + (SECOND / (LAST_UNDER + 2)) * Math.max(20, twiceAt - recomputeAt - 4)} level={-29} />
      <Sfx name="el-pop" at={nineteenAt - 2} level={-30} />

      <Headline lead="How many users?" turn="Decide now." at={sizeFrom - 6} turnAt={perArmAt - 4} out={peekAt - 6} />
      <Headline lead="And no peeking." turn="Look once." at={peekAt - 2} turnAt={onceAt - 6} />

      {/* ── The sample size, from the smallest lift worth catching ── */}
      <div style={{ position: "absolute", inset: 0, opacity: sizeDim, transform: `translateY(${(1 - rise) * h(190)}px)` }}>
        <Ink at={catchAt - 6} dur={14} style={{ left: 160, top: y(292), whiteSpace: "nowrap" }}>
          <span style={label(21, INK_SOFT)}>To catch</span>
        </Ink>
        <Ink at={catchAt - 2} dur={18} style={{ left: 160, top: y(322), whiteSpace: "nowrap" }}>
          <span style={{ ...body(44), color: INK }}>
            {Math.round(DESIGN.p1 * 100)}% rising to {Math.round(DESIGN.p2 * 100)}%
          </span>
        </Ink>
        <Ink at={powerAt - 4} dur={14} style={{ left: 160, top: y(388), whiteSpace: "nowrap" }}>
          <span style={{ ...note(22, INK_SOFT) }}>
            with {Math.round(DESIGN.power * 100)}% power, testing at {DESIGN.alpha}
          </span>
        </Ink>
        <Ink at={threeAt - 6} dur={12} style={{ left: 680, top: y(300), whiteSpace: "nowrap" }}>
          <span style={{ ...note(64, STAT_INK), fontWeight: 700 }}>
            <Count to={DESIGN.perArm} at={threeAt - 4} dur={30} format={num} />
          </span>
        </Ink>
        <Ink at={perArmAt - 4} dur={14} style={{ left: 684, top: y(388), whiteSpace: "nowrap" }}>
          <span style={{ ...note(22, INK) }}>users in each arm</span>
        </Ink>
        {(["A", "B"] as const).map((g, i) => (
          <React.Fragment key={g}>
            <div
              style={{ position: "absolute", left: BAR_X0 - 36, top: y(316 + i * 46) - 2, opacity: filled > 0 ? 1 : 0, ...label(22, INK) }}
            >
              {g}
            </div>
            <Svg>
              <rect
                x={BAR_X0}
                y={y(316 + i * 46)}
                width={BAR_W * filled}
                height={h(26)}
                rx={4}
                fill={i ? BAR : `color-mix(in srgb, ${INK_SOFT} 55%, ${PAPER})`}
              />
            </Svg>
          </React.Fragment>
        ))}
      </div>

      {/* ── A test with nothing to find ── */}
      <FigLabel n="3" title="Two identical arms: the p-value, after every hundred visitors" at={hereAt - 4} x={160} y={y(470)} />
      <Ink at={recomputeAt} dur={10} style={{ left: X.x1, top: y(470), whiteSpace: "nowrap", transform: "translateX(-100%)" }}>
        <span style={{ ...note(22, INK_SOFT) }}>
          visitors so far: <span style={{ color: INK, fontWeight: 650 }}>{num(reach > 0 ? shownN : 0)}</span>
        </span>
      </Ink>
      <Axis
        scale={X}
        base={y(BASE)}
        ticks={[0, 2000, 4000, 6000, 8000]}
        format={(v) => num(v)}
        at={hereAt - 2}
      />
      {/* The p-value scale, and the band where it reads "significant". */}
      <Svg opacity={ease(frame, hereAt, 14)}>
        {[0.25, 0.5].map((p) => (
          <line key={p} x1={X.x0} x2={X.x1} y1={py(p)} y2={py(p)} stroke={INK_SOFT} strokeWidth={1} opacity={0.25} />
        ))}
      </Svg>
      {[0.25, 0.5].map((p) => (
        <div
          key={p}
          style={{ position: "absolute", right: 1920 - X.x0 + 16, top: py(p) - 14, opacity: ease(frame, hereAt + 2, 14), ...note(20, INK_SOFT) }}
        >
          {fmt(p, 2)}
        </div>
      ))}
      <div
        style={{ position: "absolute", right: 1920 - X.x0 + 16, top: py(0.375) - 14, opacity: ease(frame, hereAt + 2, 14), ...label(20, INK_SOFT) }}
      >
        p
      </div>
      {band > 0 ? (
        <Svg opacity={band}>
          <rect x={X.x0} y={py(PEEKING.alpha)} width={X.x1 - X.x0} height={py(0) - py(PEEKING.alpha)} fill={STAT} opacity={0.16 + 0.3 * flash} />
          <line
            x1={X.x0}
            x2={X.x1}
            y1={py(PEEKING.alpha)}
            y2={py(PEEKING.alpha)}
            stroke={STAT}
            strokeWidth={1.8}
            strokeDasharray="6 5"
          />
        </Svg>
      ) : null}
      <Note at={identicalAt} x={X.x1 - 12} y={py(PEEKING.alpha) + 4} align="right">
        <span style={{ ...note(20, STAT_INK), fontWeight: 650, whiteSpace: "nowrap" }}>under {PEEKING.alpha}: &ldquo;significant&rdquo;</span>
      </Note>
      <Note at={nothingAt - 2} x={X.x1 - 10} y={py(P_MAX) + 8} align="right">
        <span style={{ ...note(21, INK_SOFT), fontWeight: 600, ...halo }}>no effect anywhere in this data</span>
      </Note>

      {/* The planned size: the one look that counts. */}
      {planned > 0 ? (
        <Svg>
          <line
            x1={X.x1}
            x2={X.x1}
            y1={y(BASE)}
            y2={lerp(y(BASE), py(P_MAX) - 10, planned)}
            stroke={INK}
            strokeWidth={lerp(2, 4, dimBefore)}
          />
        </Svg>
      ) : null}
      <Note at={plannedAt} x={X.x1 + 16} y={py(P_MAX) - 8}>
        <span style={{ ...note(21, INK), fontWeight: 650, whiteSpace: "nowrap" }}>planned</span>
      </Note>

      {/* ── The wandering p-value ── */}
      {reach > 0 ? (
        <Svg>
          <g opacity={1 - 0.55 * dimBefore}>
            <path d={partial(pts, reach / last)} fill="none" stroke={BAR} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
            {rows.map((r, i) =>
              r.p < PEEKING.alpha && i <= reach ? (
                <circle key={r.n} cx={pts[i][0]} cy={pts[i][1]} r={5.5} fill={STAT} stroke={PAPER} strokeWidth={1.4} />
              ) : null,
            )}
          </g>
          {secondLeg >= 1 ? <circle cx={pts[last][0]} cy={pts[last][1]} r={8} fill={INK} stroke={PAPER} strokeWidth={2} /> : null}
        </Svg>
      ) : null}
      <Ring x={pts[FIRST][0]} y={pts[FIRST][1]} at={firstDipAt - 2} r1={56} />
      <Ring x={pts[SECOND][0]} y={pts[SECOND][1]} at={twiceAt - 6} r1={56} />
      <Leader
        points={[
          [pts[FIRST][0], py(0.47)],
          [pts[FIRST][0], pts[FIRST][1] - 10],
        ]}
        at={firstDipAt}
        dur={10}
        color={STAT}
      />
      <Note at={firstDipAt + 2} x={pts[FIRST][0] + 12} y={py(0.47) - 30}>
        <span style={{ ...note(22, STAT_INK), fontWeight: 650, whiteSpace: "nowrap", ...halo }}>
          stop here at {num(rows[FIRST].n)}
        </span>
      </Note>
      <Note at={noiseAt - 4} x={pts[FIRST][0] + 12} y={py(0.47)}>
        <span style={{ ...note(22, STAT_INK), whiteSpace: "nowrap", ...halo }}>and you ship noise</span>
      </Note>
      <Note at={nineteenAt - 4} x={pts[last][0] - 18} y={pts[last][1] - 48} align="right">
        <span style={{ ...note(24, INK), fontWeight: 700, whiteSpace: "nowrap", ...halo }}>p = {fmt(PEEKING.final)}</span>
      </Note>
      <Ring x={pts[last][0]} y={pts[last][1]} at={numberAt - 2} color={INK} />
    </AbsoluteFill>
  );
};
