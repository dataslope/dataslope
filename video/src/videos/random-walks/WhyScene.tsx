import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { sx, type XScale } from "../../editorial/charts";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, HAIRLINE, headline, INK, INK_SOFT, label, note } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { dec, DIFF_A, LAG1_FLIPS, LAG1_WALK, STEPS, WALK_A } from "./data";
import { COLOR, COLOR_INK, Headline, Layer, ValueGrid, useValueY, walkD } from "./parts";

const X: XScale = { lo: 0, hi: 300, x0: 200, x1: 1150 };
const WALK = { lo: -5, hi: 30, top: 300, bottom: 470, ticks: [0, 10, 20, 30] } as const;
/** The flips: a tick up or down from a centre line. */
const FLIPS_MID = 664;
const FLIPS_HALF = 44;
/** How many values the worked example spells out. */
const SHOWN = 6;

const RIGHT = 1260;
const CELL = 62;
const CELLS_X = RIGHT + 170;

/**
 * Why, diff: a walk's points are not separate pieces of evidence, since each
 * is the last one plus a flip. Differencing hands the flips back, and
 * neighbouring flips have nothing to do with each other.
 */
export const WhyScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();
  const yOf = useValueY(WALK);
  const start = n.beat("why").from;
  const everyAt = n.word("why", "every point");
  const eachAt = n.word("why", "each point");
  const plusAt = n.word("why", "plus one flip");
  const subtractAt = n.word("diff", "Subtract");
  const afterAt = n.word("diff", "one after it");
  const flipsAt = n.word("diff", "coin flips");
  const backAt = n.word("diff", "come back");

  const dots = ease(frame, everyAt - 2, 16);
  const shown = ease(frame, subtractAt - 4, 12);
  const flips = ease(frame, flipsAt - 6, 22);
  const mid = y(FLIPS_MID);
  const half = h(FLIPS_HALF);
  const tableTop = y(470);

  return (
    <AbsoluteFill>
      <Headline first="Each point is the last one" second="plus one flip." at={start - 14} secondAt={plusAt - 2} />
      <FigLabel n="4" title="Walk a, and its differences" at={start - 8} x={120} y={y(196)} />

      <ValueGrid scale={X} spec={WALK} at={start - 10} title="Walk a, steps from the start" />
      <Layer>
        <path
          d={walkD(WALK_A, X, yOf)}
          fill="none"
          stroke={COLOR.a}
          strokeWidth={2.6}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {/* Every point the correlation counts. */}
        {dots > 0
          ? WALK_A.map((v, i) => (
              <circle
                key={i}
                cx={sx(X, i)}
                cy={yOf(v)}
                r={2.6}
                fill={COLOR_INK.a}
                opacity={ease(frame, everyAt - 2 + i * 0.06, 6)}
              />
            ))
          : null}
        {/* The stretch the worked example spells out. */}
        {shown > 0 ? (
          <path
            d={walkD(WALK_A, X, yOf, SHOWN - 1)}
            fill="none"
            stroke={ACCENT}
            strokeWidth={5}
            strokeLinejoin="round"
            strokeLinecap="round"
            opacity={shown}
          />
        ) : null}
      </Layer>

      {/* The flips: one tick per step, up or down. */}
      <Ink at={flipsAt - 8} dur={14} style={{ left: 200, top: mid - half - 64 }}>
        <span style={note(20, INK_SOFT)}>Its differences, one per step</span>
      </Ink>
      <Layer opacity={ease(frame, flipsAt - 8, 10)}>
        <line x1={X.x0} x2={X.x1} y1={mid} y2={mid} stroke={INK} strokeWidth={1.6} />
        <g style={{ clipPath: `inset(0 ${(1 - flips) * 100}% 0 0)` }}>
          {DIFF_A.map((d, i) => (
            <line
              key={i}
              x1={sx(X, i + 0.5)}
              x2={sx(X, i + 0.5)}
              y1={mid}
              y2={mid - d * half}
              stroke={i < SHOWN - 1 ? ACCENT : COLOR.a}
              strokeWidth={2}
            />
          ))}
        </g>
      </Layer>
      {[1, -1].map((v) => (
        <div
          key={v}
          style={{
            position: "absolute",
            right: 1920 - X.x0 + 16,
            top: mid - v * half - 14,
            opacity: ease(frame, flipsAt - 2, 10),
            ...note(20, INK_SOFT),
          }}
        >
          {v > 0 ? "+1" : "−1"}
        </div>
      ))}

      {/* Right column: neighbours in the walk, the worked example, neighbours in the flips. */}
      <Note at={eachAt} x={RIGHT} y={y(300) - 8}>
        <div style={{ ...label(21, INK_SOFT), whiteSpace: "nowrap" }}>Each point against the next</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginTop: 10 }}>
          <span style={{ ...headline(72), color: COLOR_INK.a }}>{dec(LAG1_WALK)}</span>
          <span style={note(21, INK_SOFT)}>correlation</span>
        </div>
      </Note>

      <Ink at={subtractAt - 4} dur={14} style={{ left: RIGHT, top: tableTop, width: 540 }}>
        <div style={{ position: "relative", height: 40 }}>
          <span style={{ ...label(21, INK), position: "absolute", left: 0, top: 4 }}>Walk</span>
          {WALK_A.slice(0, SHOWN).map((v, i) => (
            <span
              key={i}
              style={{
                ...note(24, INK),
                position: "absolute",
                left: CELLS_X - RIGHT + i * CELL,
                width: CELL,
                textAlign: "center",
                top: 0,
              }}
            >
              {v}
            </span>
          ))}
        </div>
        <div style={{ height: 1.5, background: HAIRLINE, marginTop: 8 }} />
      </Ink>
      <div style={{ position: "absolute", left: RIGHT, top: tableTop + 60, width: 540, height: 40 }}>
        <span style={{ ...label(21, INK), position: "absolute", left: 0, top: 4, opacity: ease(frame, afterAt - 6, 10) }}>
          Difference
        </span>
        {DIFF_A.slice(0, SHOWN - 1).map((d, i) => (
          <span
            key={i}
            style={{
              ...note(24, ACCENT_INK),
              fontWeight: 650,
              position: "absolute",
              left: CELLS_X - RIGHT + (i + 0.5) * CELL,
              width: CELL,
              textAlign: "center",
              top: 0,
              opacity: ease(frame, afterAt - 2 + i * 4, 8),
            }}
          >
            {d > 0 ? "+1" : "−1"}
          </span>
        ))}
      </div>

      <Note at={backAt} x={RIGHT} y={mid - 56}>
        <div style={{ ...label(21, INK_SOFT), whiteSpace: "nowrap" }}>Each flip against the next</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginTop: 10 }}>
          <span style={{ ...headline(72), color: COLOR_INK.a }}>{dec(LAG1_FLIPS)}</span>
          <span style={note(21, INK_SOFT)}>correlation</span>
        </div>
      </Note>
      <Note at={backAt + 10} x={RIGHT} y={mid + 90} width={540}>
        <span style={note(20, INK_SOFT)}>
          {STEPS} differences, and each one is exactly a flip of the coin.
        </span>
      </Note>
    </AbsoluteFill>
  );
};
