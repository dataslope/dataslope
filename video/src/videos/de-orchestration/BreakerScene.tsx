import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease, map } from "../../components/motion";
import { QuestionCard, Tick } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, INK, INK_SOFT, halo, label, note, svgText } from "../../editorial/style";
import { Note, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { BREAKER } from "./data";
import { Cross, Drift, Edge, OK, OK_INK, Pill, pulse, TaskBox, X0 } from "./parts";

const DOWN = ["daily_revenue", "customer_ltv", "finance dashboard", "sales dashboard", "exec dashboard"];
/** The chart: seconds along, two stacked panels. */
const TX0 = 930;
const TX1 = 1610;

/**
 * Question 8. The circuit breaker as the page defines it for data: the gate
 * fails fast, alerts and halts, so one bad table does not reach the assets
 * and dashboards downstream. Then where the name comes from, redrawn from
 * charts/circuit-breaker-states.mjs (its simulation and seed, check.mjs): a
 * failing dependency's error rate, and the load reaching it. The breaker trips
 * at 50%, sends nothing for 12 seconds at a time until a probe succeeds, and
 * the dependency recovers; retries alone push up to 300 requests a second at
 * it and it never does.
 */
export const BreakerScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("breaker").from;
  const qAt = n.word("breaker", "Question eight");
  const textAt = n.word("breaker", "What is a circuit breaker");
  const jobAt = n.word("breaker", "It's that gate doing its job");
  const fastAt = n.word("breaker", "fail fast");
  const alertAt = n.word("breaker", "alert");
  const haltAt = n.word("breaker", "and halt");
  const oneAt = n.word("breaker", "one bad table stays one bad table");
  const spreadAt = n.word("breaker", "instead of spreading");
  const everyAt = n.word("breaker", "every asset and dashboard downstream");
  const servicesAt = n.word("cb-model", "The name comes from services");
  const pointAt = n.word("cb-model", "the point isn't failing faster");
  const loadAt = n.word("cb-model", "stop sending load");
  const modelAt = n.word("cb-model", "Model a failing dependency");
  const tripsAt = n.word("cb-model", "The breaker trips at fifty percent errors");
  const nothingAt = n.word("cb-model", "sends nothing for twelve seconds");
  const probeAt = n.word("cb-model", "until a probe gets through");
  const retriesAt = n.word("cb-model", "Retries alone push");
  const threeAt = n.word("cb-model", "three hundred requests a second");
  const neverAt = n.word("cb-model", "it never recovers");
  const end = n.beat("cb-model").to;

  // ── Containment, on the left ──────────────────────────────────────────────
  const midY = y(470);
  const nodeH = h(52);
  const downY = (i: number) => y(330) + i * h(70);
  const badX = 200;
  const brkX = 430;
  const downX = 680;
  const ring = pulse(frame, oneAt + 4, 30);

  // ── The chart, on the right ───────────────────────────────────────────────
  const N = BREAKER.seconds;
  const tx = (t: number) => TX0 + (t / N) * (TX1 - TX0);
  const errTop = y(300);
  const errBot = y(452);
  const ey = (r: number) => errBot - r * (errBot - errTop);
  const reqTop = y(540);
  const reqBot = y(790);
  const yMax = Math.ceil((BREAKER.retryPeak * 1.08) / 50) * 50;
  const ry = (v: number) => reqBot - (v / yMax) * (reqBot - reqTop);
  // How far along time the breaker's lines have drawn: to the trip on "trips",
  // through the first open spell on "nothing", to the end on "probe".
  const tripT = BREAKER.tripAt + 1;
  const firstOpen = BREAKER.bands[0];
  const tNow =
    frame < modelAt
      ? 0
      : frame < nothingAt
        ? map(frame, [modelAt, tripsAt + 10], [0, tripT])
        : frame < probeAt
          ? map(frame, [nothingAt, nothingAt + 24], [tripT, firstOpen.t1])
          : map(frame, [probeAt, probeAt + 50], [firstOpen.t1, N - 1]);
  const retryT = map(frame, [retriesAt, retriesAt + 40], [0, N - 1]);
  const retryErrT = map(frame, [retriesAt + 8, retriesAt + 48], [0, N - 1]);
  const path = (vals: readonly number[], upto: number, f: (v: number) => number) => {
    const last = Math.floor(upto);
    if (upto <= 0) return "";
    const pts = vals.slice(0, last + 1).map((v, t) => `${t ? "L" : "M"}${tx(t)},${f(v)}`);
    if (last + 1 < vals.length) {
      const frac = upto - last;
      const v = vals[last] + (vals[last + 1] - vals[last]) * frac;
      pts.push(`L${tx(upto)},${f(v)}`);
    }
    return pts.join(" ");
  };
  const chartIn = ease(frame, servicesAt, 14);
  const lastProbe = BREAKER.bands.filter((b) => b.state === "half-open").at(-1)!;

  return (
    <AbsoluteFill>
      <Sfx name="el-scratch" at={fastAt + 2} level={-34} />
      <Sfx name="el-pop" at={alertAt + 2} level={-35} />
      <Sfx name="el-pencil" at={modelAt} level={-37} />
      <Sfx name="el-tap" at={tripsAt + 10} level={-34} />
      <Sfx name="el-whoosh" at={nothingAt} level={-37} />
      <Sfx name="el-tap" at={probeAt + 6} level={-36} />
      <Sfx name="el-pencil" at={retriesAt} level={-36} />
      <Sfx name="el-scratch" at={neverAt + 6} level={-35} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={8} at={qAt - 4} textAt={textAt - 4} size={56}>
          What is a circuit breaker in a pipeline?
        </QuestionCard>

        {/* The bad table, the breaker, and what stays clean. */}
        <TaskBox cx={badX} cy={midY} w={170} h={h(70)} at={jobAt} shape="asset" tones={[{ at: jobAt, tone: "bad" }]} size={22}>
          bad table
        </TaskBox>
        <Edge
          points={[
            [badX + 87, midY],
            [brkX - 87, midY],
          ]}
          at={jobAt + 4}
          dur={8}
          head={11}
          color={ACCENT}
        />
        <TaskBox
          cx={brkX}
          cy={midY}
          w={170}
          h={nodeH}
          at={jobAt + 6}
          tones={[
            { at: jobAt + 6, tone: "lit" },
            { at: fastAt, tone: "bad" },
          ]}
          size={22}
        >
          quality gate
        </TaskBox>
        {frame >= fastAt + 2 ? (
          <div style={{ position: "absolute", left: brkX - 15, top: midY + nodeH / 2 + 10 }}>
            <Cross at={fastAt + 2} size={30} />
          </div>
        ) : null}
        <Pill x={brkX - 50} y={midY - nodeH / 2 - h(56)} at={alertAt} ink={ACCENT_INK} size={21}>
          alert
        </Pill>
        {DOWN.map((name, i) => (
          <React.Fragment key={name}>
            <Edge
              points={[
                [brkX + 87, midY],
                [downX - 130, midY],
                [downX - 130, downY(i)],
                [downX - 96, downY(i)],
              ]}
              at={jobAt + 10 + i * 2}
              dur={10}
              head={10}
              color={INK_SOFT}
              dash="5 5"
              dim={haltAt}
            />
            <TaskBox
              cx={downX + 20}
              cy={downY(i)}
              w={226}
              h={h(46)}
              at={jobAt + 12 + i * 2}
              tones={[{ at: haltAt + i * 2, tone: "quiet" }]}
              mono={!name.includes(" ")}
              size={21}
            >
              {name}
            </TaskBox>
          </React.Fragment>
        ))}
        {DOWN.map((name, i) =>
          frame >= everyAt + i * 3 ? (
            <div key={name} style={{ position: "absolute", left: downX + 142, top: downY(i) - 12 }}>
              <Tick at={everyAt + i * 3} size={24} />
            </div>
          ) : null,
        )}
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          <circle cx={badX} cy={midY} r={106 + 8 * ring} fill="none" stroke={ACCENT} strokeWidth={2.4} opacity={ease(frame, oneAt, 10) * (0.5 + 0.5 * ring)} strokeDasharray="6 5" />
        </svg>
        <Note at={oneAt + 6} x={badX - 100} y={midY + h(116)}>
          <span style={{ ...note(23, ACCENT_INK), fontWeight: 700, whiteSpace: "nowrap" }}>stays one bad table</span>
        </Note>
        <Note at={spreadAt + 4} x={downX - 92} y={downY(DOWN.length - 1) + h(40)}>
          <span style={{ ...note(23, OK_INK), fontWeight: 700, whiteSpace: "nowrap" }}>downstream untouched</span>
        </Note>
        <Note at={pointAt} x={X0} y={y(760)}>
          <span style={{ ...note(24, INK_SOFT), whiteSpace: "nowrap" }}>not to fail faster:</span>
        </Note>
        <Note at={loadAt} x={X0} y={y(800)}>
          <span style={{ ...note(25, INK), fontWeight: 650, whiteSpace: "nowrap" }}>stop the load on what can&apos;t recover under it</span>
        </Note>

        {/* The name's home: a failing dependency, a model. */}
        <div style={{ position: "absolute", left: TX0, top: errTop - h(44), ...label(21, INK), fontWeight: 700, whiteSpace: "nowrap", opacity: chartIn }}>
          error rate at the dependency
          <span style={{ color: INK_SOFT, fontWeight: 500, opacity: ease(frame, modelAt, 10) }}> · a model</span>
        </div>
        <div style={{ position: "absolute", left: TX0, top: reqTop - h(44), ...label(21, INK), fontWeight: 700, whiteSpace: "nowrap", opacity: chartIn }}>
          requests per second reaching it
        </div>
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: chartIn }}>
          {/* The breaker's states, across both panels. */}
          {BREAKER.bands.map((b, i) => {
            const p = b.state === "open" ? ease(frame, i === 0 ? nothingAt : probeAt, 10) : ease(frame, probeAt + (i === 1 ? 4 : 30), 8);
            return (
              <rect
                key={i}
                x={tx(b.t0)}
                y={errTop - 8}
                width={tx(b.t1) - tx(b.t0)}
                height={reqBot - errTop + 8}
                fill={INK}
                opacity={(b.state === "open" ? 0.09 : 0.18) * p}
              />
            );
          })}
          {/* Axes. */}
          {[0, 0.5, 1].map((r) => (
            <g key={r}>
              <line x1={TX0} x2={TX1} y1={ey(r)} y2={ey(r)} stroke={r === BREAKER.trip ? ACCENT : INK_SOFT} strokeWidth={r === BREAKER.trip ? 1.8 : 1} strokeDasharray={r === BREAKER.trip ? "6 5" : r ? "2 6" : undefined} opacity={r === BREAKER.trip ? ease(frame, tripsAt, 10) : r ? 0.5 : 1} />
              <text x={TX0 - 12} y={ey(r) + 7} textAnchor="end" style={svgText({ ...label(19, INK_SOFT), fontWeight: 500 })}>
                {`${r * 100}%`}
              </text>
            </g>
          ))}
          {[0, 100, 200, 300].filter((v) => v <= yMax).map((v) => (
            <g key={v}>
              <line x1={TX0} x2={TX1} y1={ry(v)} y2={ry(v)} stroke={INK_SOFT} strokeWidth={1} strokeDasharray={v ? "2 6" : undefined} opacity={v ? 0.5 : 1} />
              <text x={TX0 - 12} y={ry(v) + 7} textAnchor="end" style={svgText({ ...label(19, INK_SOFT), fontWeight: 500 })}>
                {v}
              </text>
            </g>
          ))}
          {[0, 30, 60, 90, 120].map((t) => (
            <text key={t} x={tx(t)} y={reqBot + 28} textAnchor="middle" style={svgText({ ...label(19, INK_SOFT), fontWeight: 500 })}>
              {t}
            </text>
          ))}
          <text x={TX1} y={reqBot + 56} textAnchor="end" style={svgText({ ...label(19, INK_SOFT) })}>
            seconds
          </text>
          {/* Retries alone. */}
          <path d={path(BREAKER.retryOffered, retryT, ry)} fill="none" stroke={ACCENT} strokeWidth={2.6} strokeDasharray="7 5" />
          <path d={path(BREAKER.retryErrorRate, retryErrT, ey)} fill="none" stroke={ACCENT} strokeWidth={2.6} strokeDasharray="7 5" />
          {/* With the breaker. */}
          <path d={path(BREAKER.errorRate, tNow, ey)} fill="none" stroke={BAR} strokeWidth={3} />
          <path d={path(BREAKER.allowed, tNow, ry)} fill="none" stroke={OK} strokeWidth={3} />
        </svg>
        <Note at={tripsAt + 8} x={TX1 + 12} y={ey(BREAKER.trip) - 15}>
          <span style={{ ...label(20, ACCENT_INK), whiteSpace: "nowrap" }}>
            trips at <Num>{BREAKER.trip * 100}</Num>%
          </span>
        </Note>
        <Note at={nothingAt + 8} x={(tx(firstOpen.t0) + tx(firstOpen.t1)) / 2 - 4} y={ry(yMax) - h(4)} from="up">
          <span style={{ ...label(20, INK), ...halo, fontWeight: 700, whiteSpace: "nowrap" }}>
            open <Num>{BREAKER.openFor}</Num> s: nothing gets through
          </span>
        </Note>
        <Note at={probeAt + 30} x={tx(lastProbe.t0) + 12} y={ry(170)}>
          <span style={{ ...label(20, INK_SOFT), ...halo, whiteSpace: "nowrap" }}>probe gets through</span>
        </Note>
        <Note at={probeAt + 46} x={TX1 + 12} y={ry(BREAKER.offered) - 14}>
          <span style={{ ...label(20, OK_INK), whiteSpace: "nowrap" }}>with a breaker</span>
        </Note>
        <Note at={threeAt} x={TX1 + 12} y={ry(BREAKER.retryOffered[N - 1]) - 14}>
          <span style={{ ...label(20, ACCENT_INK), whiteSpace: "nowrap" }}>
            retries only, peak <Num>{BREAKER.retryPeak}</Num>
          </span>
        </Note>
        <Note at={neverAt + 20} x={TX1 + 12} y={ey(BREAKER.retryEndErrorRate) - 14}>
          <span style={{ ...label(20, ACCENT_INK), whiteSpace: "nowrap" }}>never recovers</span>
        </Note>
        <Note at={probeAt + 46} x={TX1 + 12} y={ey(BREAKER.endErrorRate) - 26}>
          <span style={{ ...label(20, BLUE_INK), whiteSpace: "nowrap" }}>recovers</span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
