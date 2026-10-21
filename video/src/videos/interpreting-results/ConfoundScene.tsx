import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { fmt, halo, HAIRLINE, INK, INK_SOFT, label, note, PAPER, TABULAR } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { CONFOUND, type Line } from "./data";
import { Arrow, BAND_COLOR, BAND_INK, DOT, Drift, Headline, lerp, Marker, partial, Ring, Spot, STAT, STAT_INK, Svg } from "./parts";

const X = { lo: 0, hi: 280, x0: 230, x1: 1150 };
const Y = { lo: 100, hi: 150 };
const TOP = 330;
const BOTTOM = 840;
const BAND_NAME = ["age around 30", "around 45", "around 60", "around 75"];
/** The causal sketch: three boxes. */
const AGE = [1560, 420] as const;
const EXERCISE = [1395, 690] as const;
const PRESSURE = [1725, 690] as const;

/**
 * A confounder reverses a slope: exercise against blood pressure, rising
 * across everyone, falling inside every age band, and the sketch of why.
 */
export const ConfoundScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();
  const from = n.beat("confound").from;

  // ── Cues ──
  const exerciseAt = n.word("confound", "exercise");
  const pressureAt = n.word("confound", "blood pressure");
  const peopleAt = n.word("confound", "people");
  const lineAt = n.word("rises", "One line");
  const risesAt = n.word("rises", "rises");
  const nineAt = n.word("rises", "nine points");
  const hourAt = n.word("rises", "extra hour");
  const weekAt = n.word("rises", "week");
  const colorAt = n.word("bands", "color");
  const bandAt = n.word("bands", "every age band");
  const fallsAt = n.word("bands", "falls");
  const olderAt = n.word("age", "Older");
  const higherAt = n.word("age", "higher blood pressure");
  const drivesAt = n.word("age", "drives both");
  const confounderAt = n.word("age", "confounder");
  const randomAt = n.word("coin", "randomized");
  const cureAt = n.word("coin", "cure");
  const coinAt = n.word("coin", "coin");
  const cantAt = n.word("coin", "can't");
  const thirdAt = n.word("rtm-in", "third variable");
  const sometimesAt = n.word("rtm-in", "Sometimes");
  const luckAt = n.word("rtm-in", "luck");
  const end = n.beat("rtm-in").to;

  const top = y(TOP);
  const bottom = y(BOTTOM);
  const px = (v: number) => X.x0 + ((v - X.lo) / (X.hi - X.lo)) * (X.x1 - X.x0);
  const py = (v: number) => bottom - ((v - Y.lo) / (Y.hi - Y.lo)) * (bottom - top);
  const seg = (l: Line, p: number) => {
    const xa = l.x0;
    const xb = lerp(l.x0, l.x1, p);
    return { x1: px(xa), y1: py(l.intercept + l.slope * xa), x2: px(xb), y2: py(l.intercept + l.slope * xb) };
  };
  const pooled = ease(frame, lineAt - 4, 24);
  const pooledDim = ease(frame, fallsAt, 16) * 0.55;
  const centroids = [0, 1, 2, 3].map((k) => {
    const pts = CONFOUND.points.filter((p) => p[2] === k);
    const mx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
    const my = pts.reduce((s, p) => s + p[1], 0) / pts.length;
    return [px(mx), py(my)] as const;
  });
  const stair = ease(frame, olderAt - 4, 22);
  const cut = ease(frame, coinAt + 2, 12);
  const ageY = y(AGE[1]);
  const lowY = y(EXERCISE[1]);
  const diagram = ease(frame, drivesAt - 8, 12);

  const box = (label_: string, x: number, yy: number, at: number, color = INK) => (
    <Ink at={at} dur={12} style={{ left: x, top: yy - 26, whiteSpace: "nowrap" }}>
      <div style={{ transform: "translateX(-50%)", padding: "8px 18px", border: `2px solid ${color}`, borderRadius: 8, background: PAPER, ...label(24, color) }}>
        {label_}
      </div>
    </Ink>
  );

  return (
    <AbsoluteFill>
      {/* ── Sound: the people, the pooled line, the recolor, the sketch, the coin ── */}
      <Sfx name="el-sprinkle" at={peopleAt - 6} level={-33} />
      <Sfx name="el-pencil" at={lineAt - 4} level={-33} />
      <Sfx name="el-sprinkle" at={colorAt - 2} level={-34} />
      <Sfx name="el-pencil" at={fallsAt - 4} level={-34} />
      <Sfx name="el-pop" at={coinAt - 6} level={-30} />
      <Sfx name="el-scratch" at={coinAt + 2} level={-31} />

      <Headline
        top={y(150)}
        out={drivesAt - 8}
        parts={[
          { text: "Rises overall,", at: risesAt - 6 },
          { text: "falls in every band.", at: fallsAt - 6, italic: true },
        ]}
      />
      <Headline
        top={y(150)}
        out={sometimesAt - 2}
        parts={[
          { text: "Age drives both:", at: drivesAt - 4 },
          { text: "a confounder.", at: confounderAt - 6, italic: true },
        ]}
      />

      {/* The scatter steps back as the narration turns to luck. */}
      <div style={{ position: "absolute", inset: 0, opacity: 1 - 0.45 * ease(frame, luckAt - 8, 18) }}>
      <Drift from={cantAt} to={end + 30} amount={0.02} origin={[700, 600]}>
        <FigLabel n="7" title="Weekly exercise and blood pressure" at={from - 4} x={160} y={y(262)} />

        {/* ── Axes ── */}
        <Svg opacity={ease(frame, exerciseAt - 6, 14)}>
          <line x1={X.x0} x2={X.x1} y1={bottom + 0.5} y2={bottom + 0.5} stroke={INK} strokeWidth={1.6} />
          {[110, 120, 130, 140, 150].map((v) => (
            <line key={v} x1={X.x0} x2={X.x1} y1={py(v)} y2={py(v)} stroke={HAIRLINE} strokeWidth={1} opacity={0.35} />
          ))}
          {[0, 60, 120, 180, 240].map((v) => (
            <line key={v} x1={px(v)} x2={px(v)} y1={bottom} y2={bottom + 7} stroke={INK} strokeWidth={1.2} />
          ))}
        </Svg>
        {[0, 60, 120, 180, 240].map((v) => (
          <div
            key={v}
            style={{ position: "absolute", left: px(v), top: bottom + 14, transform: "translateX(-50%)", opacity: ease(frame, exerciseAt, 12), ...note(20, INK_SOFT) }}
          >
            {v}
          </div>
        ))}
        <Note at={exerciseAt + 2} x={X.x1} y={bottom + 46} align="right">
          <span style={{ ...note(21, INK_SOFT), whiteSpace: "nowrap" }}>exercise, minutes a week</span>
        </Note>
        {[110, 120, 130, 140, 150].map((v) => (
          <div
            key={v}
            style={{ position: "absolute", right: 1920 - X.x0 + 12, top: py(v) - 13, opacity: ease(frame, pressureAt, 12), ...note(20, INK_SOFT), ...TABULAR }}
          >
            {v}
          </div>
        ))}
        <Note at={pressureAt + 2} x={X.x0 + 12} y={top - 34}>
          <span style={{ ...note(21, INK_SOFT), whiteSpace: "nowrap" }}>blood pressure, mmHg</span>
        </Note>

        {/* ── The people, then their age bands ── */}
        <Svg>
          {CONFOUND.points.map(([ex, bp, k], i) => {
            const a = ease(frame, peopleAt - 6 + (i % 26) * 0.6 + k * 2, 8);
            if (a <= 0) return null;
            const c = ease(frame, colorAt - 2 + k * 5 + (i % 26) * 0.3, 10);
            return (
              <g key={i}>
                <circle cx={px(ex)} cy={py(bp)} r={7 * a} fill={DOT} opacity={1 - c} />
                {c > 0 ? <circle cx={px(ex)} cy={py(bp)} r={7} fill={BAND_COLOR[k]} opacity={0.85 * c} stroke={PAPER} strokeWidth={1} /> : null}
              </g>
            );
          })}
          {pooled > 0 ? (
            <line
              {...seg(CONFOUND.pooled, pooled)}
              stroke={STAT}
              strokeWidth={4.5 + 4 * Math.sin(Math.PI * ease(frame, weekAt - 4, 16))}
              strokeDasharray="12 7"
              strokeLinecap="round"
              opacity={1 - pooledDim}
            />
          ) : null}
          {/* One weekly hour along, and the 8.9 it climbs: gone once the
              bands are colored, so it can't read as a fifth fitted line. */}
          {(() => {
            const t = ease(frame, hourAt - 4, 14) * (1 - ease(frame, colorAt, 12));
            if (t <= 0) return null;
            const l = CONFOUND.pooled;
            const x0 = 40;
            const x1 = 100;
            const y0 = l.intercept + l.slope * x0;
            const y1 = l.intercept + l.slope * x1;
            return (
              <path
                d={`M${px(x0)},${py(y0)} L${px(x1)},${py(y0)} L${px(x1)},${py(y1)}`}
                fill="none"
                stroke={STAT_INK}
                strokeWidth={3.4}
                pathLength={1}
                strokeDasharray={`${t} 1`}
              />
            );
          })()}
          {CONFOUND.fits.map((f, k) => {
            const p = ease(frame, fallsAt - 6 + k * 4, 16);
            return p > 0 ? <line key={k} {...seg(f, p)} stroke={BAND_INK[k]} strokeWidth={4} strokeLinecap="round" /> : null;
          })}
          {/* The staircase the bands sit on. */}
          {stair > 0 ? (
            <>
              <path d={partial(centroids, stair)} fill="none" stroke={INK} strokeWidth={2.4} strokeDasharray="6 6" />
              {centroids.map(([cx, cy], k) =>
                ease(frame, olderAt - 4 + k * 7, 8) > 0 ? (
                  <circle key={k} cx={cx} cy={cy} r={18 * ease(frame, olderAt - 4 + k * 7, 8)} fill="none" stroke={INK} strokeWidth={3} />
                ) : null,
              )}
            </>
          ) : null}
        </Svg>
        <Note at={nineAt - 2} x={px(CONFOUND.pooled.x1) - 10} y={py(CONFOUND.pooled.intercept + CONFOUND.pooled.slope * CONFOUND.pooled.x1) - 80} align="right" dim={fallsAt}>
          <span style={{ ...note(23, STAT_INK), fontWeight: 700, whiteSpace: "nowrap", ...halo }}>
            everyone: +{fmt(CONFOUND.pooledPerHour, 1)} mmHg <Marker at={hourAt - 2}>per weekly hour</Marker>
          </span>
        </Note>
        <Note at={hourAt + 6} x={px(70)} y={py(CONFOUND.pooled.intercept + CONFOUND.pooled.slope * 40) + 8} from="up" out={colorAt}>
          <span style={{ ...note(20, STAT_INK), fontWeight: 650, whiteSpace: "nowrap", display: "inline-block", transform: "translateX(-50%)", ...halo }}>
            one hour
          </span>
        </Note>
        {CONFOUND.fits.map((f, k) => (
          <Note key={k} at={bandAt + k * 4} x={px(f.x1) + 10} y={py(f.intercept + f.slope * f.x1) - 4}>
            <span style={{ ...note(20, BAND_INK[k]), fontWeight: 650, whiteSpace: "nowrap", ...halo }}>{BAND_NAME[k]}</span>
          </Note>
        ))}
        <Note at={higherAt - 2} x={X.x1 - 10} y={bottom - 56} align="right">
          <span style={{ ...note(21, INK), fontWeight: 600, whiteSpace: "nowrap", ...halo }}>older bands: more exercise, higher pressure</span>
        </Note>
      </Drift>
      </div>

      {/* ── Why: age behind both (set back once the narration drops the third variable) ── */}
      <div style={{ position: "absolute", inset: 0, opacity: 1 - 0.5 * ease(frame, thirdAt - 4, 16) }}>
      <Svg opacity={diagram}>
        <line x1={EXERCISE[0] + 72} x2={PRESSURE[0] - 106} y1={lowY} y2={lowY} stroke={INK_SOFT} strokeWidth={2} strokeDasharray="3 6" />
      </Svg>
      <Arrow from={[AGE[0] - 30, ageY + 34]} to={[EXERCISE[0] + 20, lowY - 34]} at={drivesAt - 4} dur={14} dim={coinAt + 6} />
      <Arrow from={[AGE[0] + 30, ageY + 34]} to={[PRESSURE[0] - 20, lowY - 34]} at={drivesAt + 2} dur={14} />
      {box("Age", AGE[0], ageY, drivesAt - 8)}
      {box("Exercise", EXERCISE[0], lowY, drivesAt - 6)}
      {box("Blood pressure", PRESSURE[0], lowY, drivesAt - 4)}
      <Ring x={AGE[0]} y={ageY} at={cureAt - 2} r0={40} r1={110} />
      <Note at={confounderAt - 2} x={AGE[0]} y={ageY - 76} from="up">
        <span style={{ ...label(22, STAT_INK), whiteSpace: "nowrap", display: "inline-block", transform: "translateX(-50%)" }}>
          <Marker at={confounderAt}>the confounder</Marker>
        </span>
      </Note>
      {/* A coin decides who exercises, and age's arrow into exercise is cut. */}
      {cut > 0 ? (
        <Svg>
          {[-1, 1].map((s) => (
            <line
              key={s}
              x1={(AGE[0] + EXERCISE[0]) / 2 - 2 - 16 * cut}
              y1={(ageY + lowY) / 2 - 16 * s * cut}
              x2={(AGE[0] + EXERCISE[0]) / 2 - 2 + 16 * cut}
              y2={(ageY + lowY) / 2 + 16 * s * cut}
              stroke={STAT}
              strokeWidth={5}
              strokeLinecap="round"
            />
          ))}
        </Svg>
      ) : null}
      <Spot id="interpreting-results-coin" at={coinAt - 6} left={1230} top={y(760)} width={180} height={200} />
      <Arrow from={[1390, y(790)]} to={[EXERCISE[0], lowY + 32]} at={coinAt + 4} dur={12} color={STAT} />
      <Note at={randomAt - 2} x={1440} y={y(800)}>
        <span style={{ ...note(22, INK), fontWeight: 600, whiteSpace: "nowrap" }}>
          randomize who <Marker at={cantAt - 4}>exercises</Marker>
        </span>
      </Note>
      <Note at={cantAt} x={1440} y={y(842)}>
        <span style={{ ...note(21, INK_SOFT), whiteSpace: "nowrap" }}>and age can&apos;t decide it</span>
      </Note>
      </div>
    </AbsoluteFill>
  );
};
