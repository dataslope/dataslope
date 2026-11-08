import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease, map } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, INK, INK_SOFT, halo, label, svgText } from "../../editorial/style";
import { Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { BREAKER } from "./data";
import { artH, Drift, Headline, Kicker, Line, OK, OK_INK, Spot } from "./parts";

const TX0 = 300;
const TX1 = 1260;
const LX = TX1 + 16;

/**
 * Question 4, the other half: not burying a dependency that is already
 * failing. charts/circuit-breaker-states.mjs's simulation, copied with its
 * seed (check.mjs): retries alone push the load to 300 requests a second
 * against a service that was failing at the 100 callers send, and its error
 * rate never comes down. A breaker trips past 50% errors, sends nothing for
 * 12 seconds, then lets a tenth through as a probe: the first fails and it
 * opens again, the second passes and it closes, and the service recovers.
 */
export const BreakerScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("q4-retry").from;
  const halfAt = n.word("q4-retry", "The other half");
  const retriesAt = n.word("q4-retry", "Retries add load at the worst moment");
  const simAt = n.word("q4-retry", "in the page's simulation");
  const threeAt = n.word("q4-retry", "three hundred requests a second");
  const hundredAt = n.word("q4-retry", "failing at a hundred");
  const breakerAt = n.word("q4-states", "A circuit breaker stops that");
  const tripAt = n.word("q4-states", "When errors pass half");
  const opensAt = n.word("q4-states", "it opens", { nth: 1 });
  const nothingAt = n.word("q4-states", "sends nothing for twelve seconds");
  const probeAt = n.word("q4-states", "lets a tenth of the traffic through");
  const firstAt = n.word("q4-states", "the first probe still fails");
  const againAt = n.word("q4-states", "so it opens again");
  const passesAt = n.word("q4-states", "the second passes");
  const closesAt = n.word("q4-states", "and it closes");
  const aloneAt = n.word("q4-close", "Left alone, the service recovers");
  const neverAt = n.word("q4-close", "Under retries, it never does");
  const end = n.beat("q4-close").to;

  const N = BREAKER.seconds;
  const tx = (t: number) => TX0 + (t / N) * (TX1 - TX0);
  const errTop = y(318);
  const errBot = y(448);
  const ey = (r: number) => errBot - r * (errBot - errTop);
  const reqTop = y(532);
  const reqBot = y(760);
  const yMax = Math.ceil((BREAKER.retryPeak * 1.08) / 50) * 50;
  const ry = (v: number) => reqBot - (v / yMax) * (reqBot - reqTop);

  const bands = BREAKER.bands;
  const open1 = bands[0];
  const probe1 = bands[1];
  const open2 = bands[2];
  const probe2 = bands[3];
  const tripT = open1.t0;
  // How far along time the breaker's lines have drawn, beat by beat.
  const tNow =
    frame < breakerAt
      ? 0
      : frame < nothingAt
        ? map(frame, [breakerAt, tripAt + 16], [0, tripT])
        : frame < probeAt
          ? map(frame, [nothingAt, nothingAt + 24], [tripT, open1.t1])
          : frame < againAt
            ? map(frame, [probeAt, probeAt + 16], [open1.t1, probe1.t1])
            : frame < passesAt
              ? map(frame, [againAt, againAt + 20], [probe1.t1, open2.t1])
              : map(frame, [passesAt, aloneAt], [open2.t1, N - 1]);
  const retryT = map(frame, [retriesAt, threeAt + 10], [0, N - 1]);
  const path = (vals: readonly number[], upto: number, f: (v: number) => number) => {
    if (upto <= 0) return "";
    const last = Math.floor(upto);
    const pts = vals.slice(0, last + 1).map((v, t) => `${t ? "L" : "M"}${tx(t)},${f(v)}`);
    if (last + 1 < vals.length) {
      const v = vals[last] + (vals[last + 1] - vals[last]) * (upto - last);
      pts.push(`L${tx(upto)},${f(v)}`);
    }
    return pts.join(" ");
  };
  const chartIn = ease(frame, retriesAt - 10, 14);
  const green = ease(frame, aloneAt, 14);
  const errInk = green > 0 ? `color-mix(in srgb, ${OK} ${Math.round(green * 100)}%, ${BAR})` : BAR;
  const bandAt = [opensAt, probeAt, againAt, passesAt];
  const probeY1 = reqBot + h(76);
  const probeY2 = reqBot + h(114);

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={retriesAt} level={-36} />
      <Sfx name="el-tap" at={threeAt} level={-34} />
      <Sfx name="el-pencil" at={breakerAt + 4} level={-37} />
      <Sfx name="el-tap" at={tripAt + 16} level={-34} />
      <Sfx name="el-whoosh" at={nothingAt} level={-37} />
      <Sfx name="el-tap" at={probeAt + 4} level={-36} />
      <Sfx name="el-scratch" at={firstAt + 6} level={-36} />
      <Sfx name="el-tap" at={passesAt + 4} level={-36} />
      <Sfx name="el-chime" at={aloneAt + 6} level={-36} />
      <Sfx name="el-scratch" at={neverAt + 6} level={-35} />

      <Drift from={from} to={end + 30}>
        <Kicker at={from}>Question 4 · Single points of failure</Kicker>
        <Headline lead="Don't bury a dependency" turn="that's already failing." at={halfAt} turnAt={halfAt + 20} size={60} />
        <Spot id="breaker" at={breakerAt} left={1600} top={118} width={160} height={artH("breaker", 160)} />

        {/* Panel titles. */}
        <div style={{ position: "absolute", left: TX0, top: errTop - h(48), ...label(24, INK), fontWeight: 500, whiteSpace: "nowrap", opacity: chartIn }}>
          error rate at the dependency
        </div>
        <div style={{ position: "absolute", left: TX0, top: reqTop - h(48), ...label(24, INK), fontWeight: 500, whiteSpace: "nowrap", opacity: chartIn }}>
          requests per second reaching it
          <span style={{ color: INK_SOFT, fontWeight: 500, opacity: ease(frame, simAt, 10) }}> · the page&apos;s simulation</span>
        </div>

        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: chartIn }}>
          {/* The breaker's states, across both panels. */}
          {bands.map((b, i) => (
            <rect
              key={i}
              x={tx(b.t0)}
              y={errTop - 8}
              width={tx(b.t1) - tx(b.t0)}
              height={reqBot - errTop + 8}
              fill={INK}
              opacity={(b.state === "open" ? 0.09 : 0.2) * ease(frame, bandAt[i], 10)}
            />
          ))}
          {[0, 0.5, 1].map((r) => (
            <g key={r}>
              <line
                x1={TX0}
                x2={TX1}
                y1={ey(r)}
                y2={ey(r)}
                stroke={r === BREAKER.trip ? ACCENT : INK_SOFT}
                strokeWidth={r === BREAKER.trip ? 1.8 : 1}
                strokeDasharray={r === BREAKER.trip ? "6 5" : r ? "2 6" : undefined}
                opacity={r === BREAKER.trip ? ease(frame, tripAt, 10) : r ? 0.5 : 1}
              />
              <text x={TX0 - 14} y={ey(r) + 7} textAnchor="end" style={svgText({ ...label(24, INK_SOFT), fontWeight: 500 })}>
                {`${r * 100}%`}
              </text>
            </g>
          ))}
          {[0, 100, 200, 300]
            .filter((v) => v <= yMax)
            .map((v) => (
              <g key={v}>
                <line x1={TX0} x2={TX1} y1={ry(v)} y2={ry(v)} stroke={INK_SOFT} strokeWidth={1} strokeDasharray={v ? "2 6" : undefined} opacity={v ? 0.5 : 1} />
                <text x={TX0 - 14} y={ry(v) + 7} textAnchor="end" style={svgText({ ...label(24, INK_SOFT), fontWeight: 500 })}>
                  {v}
                </text>
              </g>
            ))}
          {[0, 30, 60, 90, 120].map((t) => (
            <text key={t} x={tx(t)} y={reqBot + 30} textAnchor="middle" style={svgText({ ...label(24, INK_SOFT), fontWeight: 500 })}>
              {t}
            </text>
          ))}
          <text x={TX1} y={reqBot + 60} textAnchor="end" style={svgText({ ...label(24, INK_SOFT) })}>
            seconds
          </text>
          {/* Retries alone. */}
          <path d={path(BREAKER.retryOffered, retryT, ry)} fill="none" stroke={ACCENT} strokeWidth={2.8} strokeDasharray="8 6" />
          <path d={path(BREAKER.retryErrorRate, retryT, ey)} fill="none" stroke={ACCENT} strokeWidth={2.8} strokeDasharray="8 6" />
          {/* With the breaker. */}
          <path d={path(BREAKER.errorRate, tNow, ey)} fill="none" stroke={errInk} strokeWidth={3.2} />
          <path d={path(BREAKER.allowed, tNow, ry)} fill="none" stroke={BAR} strokeWidth={3.2} />
          {/* The probes, named under the axis. */}
          {[
            { b: probe1, at: probeAt + 2, to: probeY1 },
            { b: probe2, at: passesAt, to: probeY2 },
          ].map(({ b, at, to }) => (
            <line
              key={b.t0}
              x1={tx(b.t0 + 0.5)}
              x2={tx(b.t0 + 0.5)}
              y1={reqBot + 40}
              y2={reqBot + 40 + (to - reqBot - 40) * ease(frame, at, 10)}
              stroke={INK_SOFT}
              strokeWidth={1.4}
              opacity={ease(frame, at, 6)}
            />
          ))}
        </svg>

        <Line x={LX} y={ry(BREAKER.retryOffered[N - 1]) - 15} at={threeAt} size={21} weight={500} color={ACCENT_INK}>
          retries, peak <Num>{BREAKER.retryPeak}</Num>
        </Line>
        <Line x={LX} y={ry(BREAKER.offered) - 36} at={hundredAt} size={21} weight={500} color={INK_SOFT}>
          callers send <Num>{BREAKER.offered}</Num>
        </Line>
        <Line x={LX} y={ey(BREAKER.trip) - 15} at={tripAt + 12} size={21} weight={500} color={ACCENT_INK}>
          trips at <Num>{BREAKER.trip * 100}</Num>%
        </Line>
        <Line x={tx(open1.t0) + 8} y={ry(yMax) - 4} at={nothingAt + 8} size={21} weight={500} style={halo}>
          open: nothing for <Num>{BREAKER.openFor}</Num> s
        </Line>
        <Line x={tx(probe1.t0 + 0.5) - 10} y={probeY1 - 14} at={probeAt + 6} size={21} weight={500} color={INK} align="right">
          a <Num>{Math.round(BREAKER.probeShare * 100)}</Num>% probe
          <span style={{ color: ACCENT_INK, opacity: ease(frame, firstAt + 4, 10) }}> fails: open again</span>
        </Line>
        <Line x={tx(probe2.t0 + 0.5) + 10} y={probeY2 - 14} at={passesAt + 4} size={21} weight={500} color={BLUE_INK}>
          probe passes<span style={{ opacity: ease(frame, closesAt, 10) }}>: closed</span>
        </Line>
        <Line x={LX} y={ry(BREAKER.allowed[N - 1]) + 8} at={closesAt + 8} size={21} weight={500} color={BLUE_INK}>
          with a breaker
        </Line>
        <Line x={LX} y={ey(BREAKER.endErrorRate) - 26} at={aloneAt + 4} size={21} weight={500} color={OK_INK}>
          recovers
        </Line>
        <Line x={LX} y={ey(BREAKER.retryEndErrorRate) - 14} at={neverAt + 4} size={21} weight={500} color={ACCENT_INK}>
          never recovers
        </Line>
      </Drift>
    </AbsoluteFill>
  );
};
