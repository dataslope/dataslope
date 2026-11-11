import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { BAR, BLUE_INK, HAIRLINE, INK, INK_SOFT, label, note, svgText } from "../../editorial/style";
import { Note, Num } from "../../editorial/ui";
import { ds } from "../../theme/brand";
import { SANS } from "../../theme/fonts";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { AMDAHL_SAID, ceiling, curve } from "./data";
import { Band, Drift, Flow, lerp, Spot, THREAD, tint, X0 } from "./parts";

const LANE_X = 250;
const SLICE = 72;
const STEP = 80;
const LANES = [414, 484, 554];
const LANE_H = 50;
const ROUNDS = 3;

// Amdahl's chart: a log axis of cores, 1 to 1000, against speedup 0 to 25.
const CX0 = 1090;
const DECADE = 170;
const BASE = 770;
const UNIT = 16;
const TOP = 25;

/** Where a frame sits between keyframes: each [at, value] eases in from the one before. */
const keyed = (frame: number, keys: readonly (readonly [number, number])[], dur = 22) =>
  keys.slice(1).reduce((v, [at, to]) => lerp(v, to, ease(frame, at, dur)), keys[0][1]);

/**
 * Question 1. Three tasks take turns on one core (concurrency), then spread
 * over three cores, side by side (parallelism); async on one thread goes
 * back to the one lane, processes on cores back to three. Then the follow-up:
 * the page's Amdahl chart, five percent serial capped at 20x, a hundred cores
 * at 16.8x (data.ts).
 */
export const ConcScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("conc").from;
  const qAt = n.word("conc", "Question one");
  const textAt = n.word("conc", "Concurrency versus parallelism");
  const dealAt = n.word("conc", "Concurrency is dealing with");
  const coreAt = n.word("conc", "One core switches between them");
  const turnsAt = n.word("conc", "in turns");
  const parAt = n.word("par", "Parallelism is doing many");
  const instantAt = n.word("par", "at the same instant");
  const moreAt = n.word("par", "more than one core");
  const asyncAt = n.word("conc-both", "So async code on one thread");
  const notParAt = n.word("conc-both", "but not parallel");
  const procAt = n.word("conc-both", "Processes spread across cores");
  const bothAt = n.word("conc-both", "are both");
  const followAt = n.word("conc-amdahl", "The follow-up");
  const fiveAt = n.word("conc-amdahl", "five percent of the work");
  const twentyAt = n.word("conc-amdahl", "twenty times faster");
  const hundredAt = n.word("conc-amdahl", "a hundred cores");
  const seventeenAt = n.word("conc-amdahl", "about seventeen");
  const lawAt = n.word("conc-amdahl", "That's Amdahl's law");
  const end = n.beat("conc-amdahl").to;

  const laneY = LANES.map((v) => y(v));
  const laneH = h(LANE_H);
  // How spread out the slices are: 0 is one core taking turns, 1 is a core each.
  const spread = keyed(frame, [
    [0, 0],
    [instantAt + 2, 1],
    [asyncAt + 4, 0],
    [procAt + 4, 1],
  ]);
  // The other two cores: in for parallelism, set back while async is named.
  const extra = ease(frame, parAt, 12) * (1 - 0.7 * ease(frame, asyncAt + 2, 12) * (1 - ease(frame, procAt + 2, 12)));
  const lanesDim = 1 - 0.55 * ease(frame, followAt, 16);

  // The chart.
  const cx = (cores: number) => CX0 + Math.log10(cores) * DECADE;
  const cy = (v: number) => y(BASE) - v * h(UNIT);
  const cx1 = cx(1000);
  const s = AMDAHL_SAID;
  const axes = ease(frame, followAt + 4, 18);
  const pathOf = (serial: number) => curve(serial).map(([c, v], i) => `${i ? "L" : "M"}${cx(c).toFixed(1)},${cy(v).toFixed(1)}`).join(" ");
  const draw5 = ease(frame, fiveAt, 30);
  const drawOthers = ease(frame, followAt + 12, 26);
  const ceil = ease(frame, twentyAt - 4, 18);
  const dot = ease(frame, hundredAt, 10);
  const fmt1 = (v: number) => v.toFixed(1);

  return (
    <AbsoluteFill>
      <Sfx name="el-sprinkle" at={coreAt} level={-31} />
      <Sfx name="el-whoosh" at={instantAt + 2} level={-34} />
      <Sfx name="el-whoosh" at={asyncAt + 4} level={-36} />
      <Sfx name="el-whoosh" at={procAt + 4} level={-36} />
      <Sfx name="el-pencil" at={followAt + 4} level={-35} />
      <Sfx name="el-pencil" at={twentyAt - 4} level={-35} />
      <Sfx name="el-tap" at={hundredAt} level={-29} />
      <Sfx name="el-chime" at={lawAt + 6} level={-32} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={1} at={qAt - 4} textAt={textAt - 4} size={58}>
          Concurrency vs parallelism, what is the difference?
        </QuestionCard>

        <div style={{ position: "absolute", inset: 0, opacity: lanesDim }}>
          <Note at={dealAt} x={X0} y={y(290)}>
            <span style={{ ...note(27, INK), whiteSpace: "nowrap" }}>
              <b style={{ color: BLUE_INK }}>Concurrency</b>: <Band at={dealAt + 8}>dealing with</Band> many tasks at once
            </span>
          </Note>
          <Note at={parAt} x={X0} y={y(342)}>
            <span style={{ ...note(27, INK), whiteSpace: "nowrap" }}>
              <b style={{ color: BLUE_INK }}>Parallelism</b>: <Band at={instantAt}>doing</Band> many at the same instant
            </span>
          </Note>

          {/* The cores: one, then three. */}
          {laneY.map((ly, i) => {
            const o = i === 0 ? ease(frame, coreAt - 6, 12) : extra;
            if (o <= 0) return null;
            return (
              <React.Fragment key={i}>
                {/* The core's lane: a hairline under it. */}
                <div style={{ position: "absolute", left: LANE_X, top: ly + laneH + 6, width: ROUNDS * 3 * STEP, height: 1, background: HAIRLINE, opacity: o }} />
                <div style={{ position: "absolute", left: X0, top: ly + laneH / 2 - 14, opacity: o, ...label(21, i === 0 || frame < moreAt ? INK : BLUE_INK), fontWeight: 500, whiteSpace: "nowrap" }}>
                  core {i + 1}
                </div>
              </React.Fragment>
            );
          })}

          {/* Three tasks' turns: interleaved on core 1, or a core each. */}
          {Array.from({ length: ROUNDS * 3 }, (_, k) => {
            const t = k % 3;
            const r = Math.floor(k / 3);
            const at = coreAt + 2 + k * 5;
            const p = ease(frame, at, 8);
            if (p <= 0) return null;
            const x = lerp(LANE_X + k * STEP, LANE_X + r * STEP, spread);
            const yy = lerp(laneY[0], laneY[t], spread);
            const th = THREAD[t];
            return (
              <div
                key={k}
                style={{
                  position: "absolute",
                  left: x,
                  top: yy,
                  width: SLICE * p,
                  height: laneH,
                  boxSizing: "border-box",
                  borderRadius: 5,
                  border: `2.5px solid ${th.fill}`,
                  background: tint(th.fill, 32),
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                }}
              >
                <span style={{ ...label(22, th.ink), fontWeight: 500 }}>{"ABC"[t]}</span>
              </div>
            );
          })}
          <Flow points={[[LANE_X, y(632)], [LANE_X + ROUNDS * 3 * STEP, y(632)]]} at={turnsAt} color={INK_SOFT} width={2} head={13} />
          <Note at={turnsAt + 6} x={LANE_X + ROUNDS * 3 * STEP + 16} y={y(632) - 15}>
            <span style={{ ...label(21, INK_SOFT), fontWeight: 500, whiteSpace: "nowrap" }}>time</span>
          </Note>

          <Note at={asyncAt} x={X0} y={y(680)}>
            <span style={{ ...note(25, INK), whiteSpace: "nowrap" }}>
              Async code on one thread: <b style={{ color: BLUE_INK }}>concurrent</b>
              <span style={{ opacity: ease(frame, notParAt, 10) }}>, not parallel</span>
            </span>
          </Note>
          <Note at={procAt} x={X0} y={y(730)}>
            <span style={{ ...note(25, INK), whiteSpace: "nowrap" }}>
              Processes across cores: <b style={{ color: BLUE_INK, opacity: ease(frame, bothAt, 10) }}>both</b>
            </span>
          </Note>
        </div>

        <Spot id="hummingbird" at={dealAt + 6} out={followAt - 6} left={1250} top={y(300)} width={540} height={h(330)} />

        {/* Amdahl's law: the page's chart. */}
        <Note at={followAt + 2} x={CX0} y={y(292)}>
          <span style={{ ...label(22, INK), fontWeight: 500, whiteSpace: "nowrap" }}>What more cores buy: speedup, by the share that can&apos;t be split</span>
        </Note>
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: axes }}>
          <defs>
            <clipPath id="be5-amdahl">
              <rect x={CX0} y={cy(TOP)} width={cx1 - CX0} height={cy(0) - cy(TOP)} />
            </clipPath>
          </defs>
          {[0, 5, 10, 15, 20, 25].map((v) => (
            <g key={v}>
              <line x1={CX0} x2={cx1} y1={cy(v)} y2={cy(v)} stroke={ds("gray", 200)} strokeWidth={1} />
              <text x={CX0 - 12} y={cy(v) + 7} textAnchor="end" style={svgText({ ...label(20, INK_SOFT), fontWeight: 500 })}>
                {v}x
              </text>
            </g>
          ))}
          <line x1={CX0} x2={cx1} y1={cy(0)} y2={cy(0)} stroke={INK} strokeWidth={1.6} />
          {[1, 10, 100, 1000].map((c) => (
            <text key={c} x={cx(c)} y={cy(0) + 28} textAnchor="middle" style={svgText({ ...label(20, INK_SOFT), fontWeight: 500 })}>
              {c}
            </text>
          ))}
          <text x={cx1 + 34} y={cy(0) + 28} textAnchor="start" style={svgText({ ...label(20, INK_SOFT), fontWeight: 500 })}>
            cores
          </text>
          <text x={CX0} y={cy(TOP) - 16} textAnchor="start" style={svgText({ ...label(20, INK_SOFT), fontWeight: 500 })}>
            speedup
          </text>
          <g clipPath="url(#be5-amdahl)">
            {[0.01, 0.25].map((serial) => (
              <path key={serial} d={pathOf(serial)} fill="none" stroke={ds("gray", 400)} strokeWidth={2.2} pathLength={1} strokeDasharray={`${drawOthers} 1`} />
            ))}
            <path d={pathOf(s.serial)} fill="none" stroke={BAR} strokeWidth={3.6} strokeLinecap="round" pathLength={1} strokeDasharray={`${draw5} 1`} />
          </g>
          <line
            x1={CX0}
            x2={CX0 + (cx1 - CX0) * ceil}
            y1={cy(s.ceiling)}
            y2={cy(s.ceiling)}
            stroke={BAR}
            strokeWidth={2}
            strokeDasharray="7 5"
          />
          {dot > 0 ? <circle cx={cx(s.cores)} cy={cy(s.speedup)} r={8 * dot} fill={BAR} stroke="white" strokeWidth={2.5} /> : null}
        </svg>
        <Note at={followAt + 22} x={cx1 + 14} y={cy(ceiling(0.25)) - 14}>
          <span style={{ ...label(20, INK_SOFT), fontWeight: 500, whiteSpace: "nowrap" }}>
            25% serial: <Num>{ceiling(0.25)}</Num>x
          </span>
        </Note>
        <Note at={followAt + 22} x={cx(33) + 16} y={cy(TOP) - 30}>
          <span style={{ ...label(20, INK_SOFT), fontWeight: 500, whiteSpace: "nowrap" }}>
            1% serial: <Num>{ceiling(0.01)}</Num>x
          </span>
        </Note>
        <Note at={fiveAt + 10} x={cx1 + 14} y={cy(s.ceiling) - 30}>
          <div style={{ ...label(21, BLUE_INK), fontWeight: 500, whiteSpace: "nowrap" }}>5% serial</div>
          <div style={{ ...label(21, BLUE_INK), fontWeight: 500, whiteSpace: "nowrap", marginTop: 4, opacity: ceil }}>
            caps at <Num>{s.ceiling}</Num>x
          </div>
        </Note>
        <Note at={seventeenAt - 4} x={cx(s.cores) + 16} y={cy(s.speedup) + 14}>
          <span style={{ ...label(21, BLUE_INK), fontWeight: 500, whiteSpace: "nowrap" }}>
            <Num>{fmt1(s.speedup)}</Num>x on <Num>{s.cores}</Num> cores
          </span>
        </Note>
        <Note at={lawAt} x={CX0} y={y(818)}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap", fontFamily: SANS }}>
            <b>Amdahl&apos;s law</b>: speedup = 1 / (s + (1 − s) / n)
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
