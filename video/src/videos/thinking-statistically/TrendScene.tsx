import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { Axis, sx, type XScale } from "../../editorial/charts";
import { useLayout } from "../../editorial/layout";
import { BAR, body, fmt, halo, headline, HAIRLINE, HIGHLIGHT, INK, INK_SOFT, label, note, PAPER, TABULAR } from "../../editorial/style";
import { FigLabel, Ink, Leader, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { jitter, TREND } from "./data";
import { Arrow, Bracket, lerp, Mark, pulse, Spot, STAT, STAT_INK, Strike, Svg } from "./parts";

const X: XScale = { lo: 1, hi: 24, x0: 230, x1: 1690 };
/** The value axis: 75 sits on the baseline, 8 px per point. */
const BASE = 860;
const FLOOR = 75;
const PER = 8;
const TOP_VALUE = 130;
const Y_TICKS = [80, 100, 120];
const R = 6;
/** A fixed random delay per month, for "plus random noise". */
const SHUFFLE = jitter(30, 24);

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
  const somethingAt = n.word("fell", "Something");
  const nothingAt = n.word("flat", "Nothing");
  const hundredAt = n.word("flat", "hundred");
  const plusNoiseAt = n.word("flat", "plus random noise");
  const neverAt = n.word("flat", "never");
  const datasetAt = n.word("process", "every dataset");
  const processAt = n.word("process", "process");
  const exampleAt = [n.word("process", "Customers"), n.word("process", "machines"), n.word("process", "demand")];
  const neverSeeAt = n.word("output", "never see");
  const onlySeeAt = n.word("output", "only see");
  const comesAt = n.word("output", "comes");
  const signalAt = n.word("signal", "signal");
  const flatHundredAt = n.word("signal", "flat hundred");
  const noiseAt = n.word("signal", "noise");
  const wobblesAt = n.word("signal", "wobbles");
  const findAt = n.word("job", "find");
  const jobSignalAt = n.word("job", "signal");
  const numbersAt = n.word("slice", "numbers");
  const sliceAt = n.word("slice", "slice");
  const biggerAt = n.word("slice", "something much bigger");

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
  const signalBold = ease(frame, signalAt - 2, 10) + pulse(frame, jobSignalAt - 2, 20) * 1.4;
  const sticks = ease(frame, noiseAt - 4, 14);
  const plusAt = n.word("output", "signal");

  // "The trend was never there": the story's arrow draws itself back in.
  const retract = ease(frame, neverAt - 2, 18);
  // "You only see what comes out of it": the data, thickened until the
  // signal is named. "Find the signal through the noise": the noise steps
  // back, and the data returns on "the numbers you get".
  const seen = ease(frame, onlySeeAt, 12) * (1 - ease(frame, signalAt - 4, 16));
  const quiet = ease(frame, findAt - 2, 16) * (1 - ease(frame, numbersAt - 2, 16));
  const sticksQuiet = ease(frame, findAt - 2, 16) * 0.65;
  // Each month swells in turn: the last six as they are named, then every
  // month on "every dataset" and on "the numbers you get".
  // On "plus random noise" they swell in a random order instead.
  const swell = (i: number) =>
    (i >= first && i <= last ? pulse(frame, lastAt - 2 + (i - first) * 3, 16) * 0.5 : 0) +
    pulse(frame, plusNoiseAt - 2 + SHUFFLE[i] * 22, 12) * 0.5 +
    pulse(frame, datasetAt + i * 1.2, 14) * 0.5 +
    pulse(frame, numbersAt + i * 1.2, 14) * 0.5;
  // "A slice... of something much bigger": the frame pulls back, and the
  // process's level runs on past both ends of the two years.
  const pull = ease(frame, biggerAt, 44);
  const runOn = ease(frame, biggerAt - 4, 34);

  return (
    <AbsoluteFill>
      {/* ── Sound: the months arriving, the story's arrow, the flat line ── */}
      <Sfx name="el-sprinkle" at={yearsAt - 4} level={-34} />
      <Sfx name="el-pencil" at={fellAt - 6} level={-32} />
      <Sfx name="el-pop" at={processAt - 6} level={-29} />
      <Sfx name="el-pencil" at={hundredAt - 6} level={-34} />
      <Sfx name="el-scratch" at={nothingAt} level={-31} />
      <Sfx name="el-whoosh" at={biggerAt} level={-34} />

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

      <Spot id="thinking-statistically-machine" at={processAt - 6} dim={neverSeeAt} left={1480} top={y(104)} width={320} height={305} />

      {/* The examples of a process, beside the machine, until "never see". */}
      {["customers deciding,", "machines running,", "demand rising and falling"].map((t, i) => (
        <Ink key={t} at={exampleAt[i] - 4} dur={14} out={neverSeeAt} style={{ right: 1920 - 1452, top: y(176 + i * 38), whiteSpace: "nowrap" }}>
          <span style={{ ...body(27, true), color: INK_SOFT }}>{t}</span>
        </Ink>
      ))}

      <AbsoluteFill style={{ transform: `scale(${1 - pull * 0.05})`, transformOrigin: `960px ${y(620)}px` }}>
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
            ...TABULAR,
          }}
        >
          {v}
        </div>
      ))}
      <Axis scale={X} base={y(BASE)} ticks={[1, 6, 12, 18, 24]} format={(v) => (v === 1 ? "Month 1" : String(v))} at={trendFrom + 2} />

      {/* The last six months, and the story they seem to tell. */}
      {band > 0 ? (
        <Svg opacity={band * (1 - ease(frame, dimStory, 14) * 0.6) * (1 - ease(frame, neverAt, 16))}>
          <rect x={bandX0} y={py(TOP_VALUE)} width={bandX1 - bandX0} height={y(BASE) - py(TOP_VALUE)} fill={HIGHLIGHT} opacity={0.5} />
          {[bandX0, bandX1].map((x) => (
            <line key={x} x1={x} x2={x} y1={y(BASE)} y2={lerp(y(BASE), py(TOP_VALUE), band)} stroke={HAIRLINE} strokeWidth={1.4} />
          ))}
        </Svg>
      ) : null}

      {/* The process's level: the signal. */}
      {flat > 0 ? (
        <Svg>
          <defs>
            {/* In page units: a horizontal line's own box has no height to scale a gradient by. */}
            {(
              [
                ["l", X.x0 - 74, X.x0 - 340],
                ["r", X.x1 + 10, X.x1 + 340],
              ] as const
            ).map(([side, from, to]) => (
              <linearGradient key={side} id={`ts-run-${side}`} gradientUnits="userSpaceOnUse" x1={from} x2={to} y1={0} y2={0}>
                <stop offset="0" style={{ stopColor: INK, stopOpacity: 1 }} />
                <stop offset="0.6" style={{ stopColor: INK, stopOpacity: 0.6 }} />
                <stop offset="1" style={{ stopColor: INK, stopOpacity: 0.12 }} />
              </linearGradient>
            ))}
          </defs>
          <line
            x1={X.x0 - 10}
            x2={lerp(X.x0 - 10, X.x1 + 10, flat)}
            y1={py(TREND.level)}
            y2={py(TREND.level)}
            stroke={INK}
            strokeWidth={lerp(2.2, 3.4, signalBold)}
            strokeDasharray="10 7"
          />
          {runOn > 0 ? (
            <>
              {/* The left run starts past the "100" tick label, so it never crosses it. */}
              <line
                x1={X.x0 - 74}
                x2={X.x0 - 74 - 266 * runOn}
                y1={py(TREND.level)}
                y2={py(TREND.level)}
                stroke="url(#ts-run-l)"
                strokeWidth={lerp(2.2, 3.4, Math.min(1, signalBold))}
                strokeDasharray="10 7"
              />
              <line
                x1={X.x1 + 10}
                x2={X.x1 + 10 + 330 * runOn}
                y1={py(TREND.level)}
                y2={py(TREND.level)}
                stroke="url(#ts-run-r)"
                strokeWidth={lerp(2.2, 3.4, Math.min(1, signalBold))}
                strokeDasharray="10 7"
              />
            </>
          ) : null}
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
              strokeWidth={2.4 + pulse(frame, wobblesAt + i * 1.2, 14) * 2.2}
              opacity={0.75 * (1 - sticksQuiet)}
            />
          ))}
        </Svg>
      ) : null}

      {retract < 1 ? (
        <Arrow
          from={arrowFrom}
          to={[lerp(arrowTo[0], arrowFrom[0], retract), lerp(arrowTo[1], arrowFrom[1], retract)]}
          at={fellAt - 6}
          dur={18}
          dim={dimStory}
          color={STAT}
          width={3.2}
        />
      ) : null}

      {/* The data. */}
      <Svg opacity={1 - quiet * 0.68}>
        <path d={lineD} fill="none" stroke={BAR} strokeWidth={3 + seen * 1.6} strokeLinejoin="round" strokeLinecap="round" />
        {pts.map(([x, v], i) => {
          // No dot before the line starts drawing, not even the first.
          const a = drawn > 0 ? Math.max(0, Math.min(1, (draw - i + 1) * 1.5)) : 0;
          if (a <= 0) return null;
          return <circle key={i} cx={x} cy={v} r={R * a * (1 + seen * 0.22 + swell(i))} fill={BAR} stroke={PAPER} strokeWidth={1.6} />;
        })}
      </Svg>

      {/* "Something must have happened... right?": the question the story asks, at the top of the fall. */}
      <Note at={somethingAt - 2} x={bandX0 - 12} y={pts[first][1] - 108} align="right" dim={nothingAt + 6} out={neverAt + 4}>
        <span style={{ ...body(30, true), color: STAT_INK, whiteSpace: "nowrap", ...halo }}>
          <Strike at={nothingAt} color={INK}>What happened here?</Strike>
        </span>
      </Note>
      <Leader
        points={[
          [bandX0 - 8, pts[first][1] - 70],
          [pts[first][0] - 8, pts[first][1] - 9],
        ]}
        at={somethingAt + 4}
        dur={12}
        color={STAT_INK}
        dim={nothingAt + 6}
        out={neverAt + 4}
      />

      {/* "Only ever a slice": the two years, bracketed under the axis. */}
      <Bracket x0={X.x0} x1={X.x1} y={y(BASE) + 50} at={sliceAt - 4} up color={INK_SOFT} tick={10} width={2} />
      <Note at={sliceAt + 4} x={(X.x0 + X.x1) / 2} y={y(BASE) + 58} from="up">
        <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap", display: "inline-block", transform: "translateX(-50%)" }}>
          the {TREND.months.length} months you saw
        </span>
      </Note>
      {/* "Of something much bigger": the level runs on, and says so. */}
      <Note at={biggerAt + 10} x={X.x1 + 18} y={py(TREND.level) - 70}>
        <div style={{ ...note(22, INK), whiteSpace: "nowrap", ...halo }}>
          the process
          <br />
          keeps going
        </div>
      </Note>

      <Note at={twelveAt - 4} x={bandX1 - 18} y={py(TOP_VALUE) + 22} align="right" dim={dimStory} out={neverAt + 2}>
        <span style={{ ...note(23, STAT_INK), fontWeight: 700, ...halo }}>
          The last six months: down {fmt(Math.abs(TREND.change), 1)}
        </span>
      </Note>

      {/* Labels on the level line, where no month comes near it. */}
      <Note at={signalAt - 2} x={440} y={py(TREND.level) - 70}>
        <span style={{ ...label(22, INK), ...halo }}>Signal</span>
      </Note>
      <Note at={hundredAt} x={440} y={py(TREND.level) - 40}>
        <span style={{ ...note(22, INK), ...halo, whiteSpace: "nowrap" }}>
          <Mark at={flatHundredAt - 2} out={wobblesAt}>
            the process: a flat {TREND.level}
          </Mark>
        </span>
      </Note>
      <Note at={noiseAt} x={pts[TREND.months.indexOf(10)][0] + 18} y={pts[TREND.months.indexOf(10)][1] - 12}>
        <span style={{ ...label(22, INK), ...halo, whiteSpace: "nowrap" }}>Noise</span>
      </Note>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
