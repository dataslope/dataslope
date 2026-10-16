import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { Axis, sx, type XScale } from "../../editorial/charts";
import { useLayout } from "../../editorial/layout";
import { BAR, fmt, halo, headline, HAIRLINE, HIGHLIGHT, INK, INK_SOFT, label, note, PAPER } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { TREND } from "./data";
import { Arrow, lerp, Spot, STAT, STAT_INK, Svg } from "./parts";

const X: XScale = { lo: 1, hi: 24, x0: 230, x1: 1690 };
/** The value axis: 75 sits on the baseline, 8 px per point. */
const BASE = 860;
const FLOOR = 75;
const PER = 8;
const TOP_VALUE = 130;
const Y_TICKS = [80, 100, 120];
const R = 6;

/**
 * Part 1, second scene: two years of a metric that is pure noise around a
 * flat 100. The last six months seem to fall; then the flat line, the
 * machine behind the data, and the split into signal and noise.
 */
export const TrendScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();
  const py = (v: number) => y(BASE) - h((v - FLOOR) * PER);

  // ── Cues ──
  const trendFrom = n.beat("trend").from;
  const yearsAt = n.word("trend", "two years");
  const lastAt = n.word("fell", "last six months");
  const fellAt = n.word("fell", "fell");
  const twelveAt = n.word("fell", "twelve");
  const nothingAt = n.word("flat", "Nothing");
  const hundredAt = n.word("flat", "hundred");
  const processAt = n.word("process", "process");
  const comesAt = n.word("output", "comes");
  const signalAt = n.word("signal", "signal");
  const noiseAt = n.word("signal", "noise");

  const pts = TREND.metric.map((v, i) => [sx(X, TREND.months[i]), py(v)] as const);
  const drawn = ease(frame, yearsAt - 4, 44);
  const draw = drawn * (pts.length - 1);
  const shown = Math.floor(draw);
  const part = draw - shown;
  const line = pts.slice(0, shown + 1).map(([x, v]) => [x, v] as [number, number]);
  if (shown < pts.length - 1 && part > 0) {
    const [ax, ay] = pts[shown];
    const [bx, by] = pts[shown + 1];
    line.push([lerp(ax, bx, part), lerp(ay, by, part)]);
  }
  const lineD = line.map(([x, v], i) => `${i ? "L" : "M"}${x.toFixed(1)},${v.toFixed(1)}`).join(" ");

  const first = TREND.months.indexOf(TREND.lastSixFrom);
  const last = TREND.months.indexOf(TREND.lastSixTo);
  const band = ease(frame, lastAt - 4, 14);
  const bandX0 = sx(X, TREND.lastSixFrom - 0.5);
  const bandX1 = sx(X, TREND.lastSixTo + 0.5);
  const dimStory = nothingAt;

  // The arrow the story draws: first of the six to the last, stopping short
  // of the last dot.
  const [sx0, sy0] = pts[first];
  const [ex, ey] = pts[last];
  const len = Math.hypot(ex - sx0, ey - sy0);
  const stop = (R + 5) / len;
  const arrowTo = [ex - (ex - sx0) * stop, ey - (ey - sy0) * stop] as const;
  const arrowFrom = [sx0 + (ex - sx0) * stop, sy0 + (ey - sy0) * stop] as const;

  const flat = ease(frame, hundredAt - 6, 24);
  const signalBold = ease(frame, signalAt - 2, 10);
  const sticks = ease(frame, noiseAt - 4, 14);
  const plusAt = n.word("output", "signal");

  return (
    <AbsoluteFill>
      {/* ── Headlines ── */}
      <Ink at={trendFrom - 4} dur={20} out={comesAt - 8} style={{ left: 92, top: y(150), ...headline(80), whiteSpace: "nowrap" }}>
        Noise makes trends, too.
      </Ink>
      <div style={{ position: "absolute", left: 92, top: y(150), display: "flex", gap: "0.26em", ...headline(80) }}>
        <Ink at={comesAt - 4} dur={20} style={{ position: "relative", whiteSpace: "nowrap" }}>
          What comes out is
        </Ink>
        <Ink
          at={plusAt - 6}
          dur={18}
          style={{ position: "relative", ...headline(80, true), color: STAT_INK, whiteSpace: "nowrap" }}
        >
          signal plus noise.
        </Ink>
      </div>

      <Spot id="thinking-statistically-machine" at={processAt - 6} left={1480} top={y(104)} width={320} height={305} />

      <FigLabel n="2" title="A monthly metric over two years" at={trendFrom} x={160} y={y(320)} />

      {/* Gridlines and value ticks. */}
      <Svg opacity={ease(frame, trendFrom + 2, 14)}>
        {Y_TICKS.map((v) => (
          <line key={v} x1={X.x0 - 10} x2={X.x1 + 10} y1={py(v)} y2={py(v)} stroke={HAIRLINE} strokeWidth={1} opacity={0.35} />
        ))}
      </Svg>
      {Y_TICKS.map((v) => (
        <div
          key={v}
          style={{
            position: "absolute",
            right: 1920 - (X.x0 - 22),
            top: py(v) - 13,
            opacity: ease(frame, trendFrom + 4, 14),
            ...note(20, INK_SOFT),
          }}
        >
          {v}
        </div>
      ))}
      <Axis scale={X} base={y(BASE)} ticks={[1, 6, 12, 18, 24]} format={(v) => (v === 1 ? "Month 1" : String(v))} at={trendFrom + 2} />

      {/* The last six months, and the story they seem to tell. */}
      {band > 0 ? (
        <Svg opacity={band * (1 - ease(frame, dimStory, 14) * 0.6)}>
          <rect x={bandX0} y={py(TOP_VALUE)} width={bandX1 - bandX0} height={y(BASE) - py(TOP_VALUE)} fill={HIGHLIGHT} opacity={0.5} />
        </Svg>
      ) : null}

      {/* The process's level: the signal. */}
      {flat > 0 ? (
        <Svg>
          <line
            x1={X.x0 - 10}
            x2={lerp(X.x0 - 10, X.x1 + 10, flat)}
            y1={py(TREND.level)}
            y2={py(TREND.level)}
            stroke={INK}
            strokeWidth={lerp(2.2, 3.4, signalBold)}
            strokeDasharray="10 7"
          />
        </Svg>
      ) : null}

      {/* The noise: how far each month sits from the level. */}
      {sticks > 0 ? (
        <Svg>
          {pts.map(([x, v], i) => (
            <line
              key={i}
              x1={x}
              x2={x}
              y1={py(TREND.level)}
              y2={lerp(py(TREND.level), v, ease(frame, noiseAt - 4 + i * 0.8, 12))}
              stroke={INK_SOFT}
              strokeWidth={2.4}
              opacity={0.75}
            />
          ))}
        </Svg>
      ) : null}

      <Arrow from={arrowFrom} to={arrowTo} at={fellAt - 6} dur={18} dim={dimStory} color={STAT} width={3.2} />

      {/* The data. */}
      <Svg>
        <path d={lineD} fill="none" stroke={BAR} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
        {pts.map(([x, v], i) => {
          // No dot before the line starts drawing, not even the first.
          const a = drawn > 0 ? Math.max(0, Math.min(1, (draw - i + 1) * 1.5)) : 0;
          if (a <= 0) return null;
          return <circle key={i} cx={x} cy={v} r={R * a} fill={BAR} stroke={PAPER} strokeWidth={1.6} />;
        })}
      </Svg>

      <Note at={twelveAt - 4} x={bandX1 - 6} y={py(TOP_VALUE) + 22} align="right" dim={dimStory}>
        <span style={{ ...note(23, STAT_INK), fontWeight: 700, ...halo }}>
          The last six months: down {fmt(Math.abs(TREND.change), 1)}
        </span>
      </Note>

      {/* Labels on the level line, where no month comes near it. */}
      <Note at={signalAt - 2} x={440} y={py(TREND.level) - 70}>
        <span style={{ ...label(22, INK), ...halo }}>Signal</span>
      </Note>
      <Note at={hundredAt} x={440} y={py(TREND.level) - 40}>
        <span style={{ ...note(22, INK), ...halo, whiteSpace: "nowrap" }}>the process: a flat {TREND.level}</span>
      </Note>
      <Note at={noiseAt} x={pts[TREND.months.indexOf(10)][0] + 18} y={pts[TREND.months.indexOf(10)][1] - 12}>
        <span style={{ ...label(22, INK), ...halo, whiteSpace: "nowrap" }}>Noise</span>
      </Note>
    </AbsoluteFill>
  );
};
