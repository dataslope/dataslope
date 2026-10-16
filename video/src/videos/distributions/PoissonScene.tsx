import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { Axis, sx, type XScale } from "../../editorial/charts";
import { useLayout } from "../../editorial/layout";
import { body, fmt, INK, INK_SOFT, label, note } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { POISSON } from "./data";
import {
  ASK,
  askNote,
  Bracket,
  Centered,
  code,
  DIST,
  Drift,
  Head,
  KBars,
  lerp,
  pulse,
  Spot,
  Svg,
  Sweep,
  VRule,
} from "./parts";

/** The strip: the simulation's first 24 hours, a ticket per arrival. */
const STRIP_X0 = 178;
const STRIP_STEP = 37.5;
const STRIP_BASE = 440;
const TICKET_W = 26;
const TICKET_H = 9;
const TICKET_PITCH = 12;
/** The Poisson(3) figure. */
const X: XScale = { lo: -0.5, hi: 12.5, x0: 160, x1: 1100 };
const BASE = 860;
const TALL = 220;
const PANEL_X = 1240;

/**
 * Part 1, second scene: a help desk's tickets, hour by hour, then the
 * Poisson that counts them, its spike of eight or more, the simulation that
 * checks it, and the mean and variance it forces to be equal.
 */
export const PoissonScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const poissonFrom = n.beat("poisson").from;
  const deskAt = n.word("poisson", "help desk");
  const ticketsAt = n.word("poisson", "three tickets");
  const ownEnd = n.word("poisson", "own", { edge: "end" });
  const countAt = n.word("poisson", "count");
  const poissonAt = n.word("poisson", "Poisson");
  const eightAt = n.word("spike", "eight or more");
  const spikeAt = n.word("spike", "spike");
  const oneHourAt = n.word("spike", "one hour");
  const eightyAt = n.word("spike", "eighty-four");
  const simulateAt = n.word("simulate", "Simulate");
  const hoursEnd = n.word("simulate", "hours", { edge: "end" });
  const sevenAt = n.word("simulate", "one point one seven");
  const formulaAt = n.word("simulate", "formula's");
  const meanAt = n.word("same", "mean");
  const varianceAt = n.word("same", "variance");
  const threeAt = n.word("same", "three");
  const varyAt = n.word("same", "vary far more");
  const clumpingAt = n.word("same", "clumping");
  const understateAt = n.word("same", "understate");
  const moreAt = n.word("geometric-in", "One more");

  const unit = h(TALL) / Math.max(...POISSON.pmf);
  const base = y(BASE);
  const dim = ease(frame, moreAt - 4, 16) * 0.55;
  const barAt = (k: number) => poissonAt - 8 + k * 1.6;
  const askAt = (k: number) => eightAt - 2 + (k - POISSON.atLeast) * 1.6;
  const tailX0 = sx(X, POISSON.atLeast) - 20;
  const tailX1 = sx(X, 12) + 20;
  const tailY = base - POISSON.pmf[POISSON.atLeast] * unit - h(40);
  // Each hour's tickets land one after another across the beat.
  const hourAt = (i: number) => lerp(ticketsAt - 4, ownEnd - 10, i / 23);
  const sims = ease(frame, simulateAt - 2, hoursEnd - simulateAt + 8);
  const mx = sx(X, POISSON.mean);
  const spikeFlash = pulse(frame, understateAt - 4, 22);

  return (
    <AbsoluteFill>
      {/* ── Sound: the tickets landing, the bars, the spike, the simulation,
           the mean ── */}
      <Sfx name="el-sprinkle" at={ticketsAt - 4} level={-34} />
      <Sfx name="el-pop" at={poissonAt - 8} level={-30} />
      <Sfx name="el-tap" at={eightAt - 2} level={-28} />
      <Sfx name="el-sprinkle" at={simulateAt - 2} level={-33} />
      <Sfx name="el-pencil" at={meanAt - 4} level={-34} />

      <Head parts={[{ text: "A rate, not a number of tries.", at: poissonFrom - 4 }]} out={meanAt - 8} />
      <Head
        parts={[
          { text: "Mean and variance:", at: meanAt - 2 },
          { text: "both three.", at: threeAt - 6, italic: true },
        ]}
        out={moreAt - 6}
      />

      <Spot id="distributions-desk-bell" at={deskAt - 4} out={moreAt} left={1500} top={y(92)} width={290} height={270} />

      <div style={{ position: "absolute", inset: 0, opacity: 1 - dim }}>
        <Drift from={poissonFrom} to={n.beat("geometric-in").to + 30}>
          {/* ── Fig. 3: the tickets, hour by hour ── */}
          <FigLabel n="3" title="A help desk's tickets, hour by hour" at={deskAt - 4} x={160} y={y(290)} />
          <Svg>
            {POISSON.firstHours.map((count, i) =>
              Array.from({ length: count }, (_, j) => {
                const a = ease(frame, hourAt(i) + j * 1.2, 8);
                if (a <= 0) return null;
                const cx = STRIP_X0 + i * STRIP_STEP;
                const top = y(STRIP_BASE) - (j + 1) * h(TICKET_PITCH) - (1 - a) * 22;
                return (
                  <rect
                    key={`${i}-${j}`}
                    x={cx - TICKET_W / 2}
                    y={top}
                    width={TICKET_W}
                    height={h(TICKET_H)}
                    rx={2}
                    fill={DIST}
                    opacity={a}
                  />
                );
              }),
            )}
            <line
              x1={STRIP_X0 - 22}
              x2={STRIP_X0 - 22 + (24 * STRIP_STEP + 6) * ease(frame, deskAt, 18)}
              y1={y(STRIP_BASE) + 0.5}
              y2={y(STRIP_BASE) + 0.5}
              stroke={INK}
              strokeWidth={1.4}
            />
          </Svg>
          {POISSON.firstHours.map((count, i) => (
            <Centered
              key={i}
              x={STRIP_X0 + i * STRIP_STEP}
              y={y(STRIP_BASE) + 8}
              opacity={ease(frame, countAt - 4 + i * 0.6, 8)}
              style={note(19, INK_SOFT)}
            >
              {count}
            </Centered>
          ))}
          <Note at={countAt + 10} x={STRIP_X0 - 22} y={y(STRIP_BASE) + 40}>
            <span style={{ ...note(20, INK_SOFT), whiteSpace: "nowrap" }}>
              tickets in each hour
              <span style={{ opacity: ease(frame, hoursEnd, 12) }}>, the first 24 of {fmt(POISSON.hours, 0)} simulated</span>
            </span>
          </Note>

          {/* ── Fig. 4: how many in one hour ── */}
          <FigLabel n="4" title={`Tickets in one hour, at a rate of ${POISSON.lambda}`} at={poissonAt - 10} x={160} y={y(540)} />
          <Note at={poissonAt} x={1100} y={y(544)} align="right">
            <span style={code(21, INK_SOFT)}>poisson({POISSON.lambda})</span>
          </Note>
          <Axis scale={X} base={base} ticks={POISSON.k} at={poissonAt - 10} />
          <KBars
            ks={POISSON.k}
            values={POISSON.pmf}
            scale={X}
            base={base}
            unit={unit}
            grow={(i) => ease(frame, barAt(i), 10)}
            fill={(i) => {
              const k = POISSON.k[i];
              if (k < POISSON.atLeast) return DIST;
              const r = ease(frame, askAt(k), 10);
              if (r <= 0) return DIST;
              return `color-mix(in srgb, ${ASK} ${r * 100}%, ${DIST})`;
            }}
          />
          {/* The simulation's share of hours at each count, a tick on each bar. */}
          <Svg>
            {POISSON.k.map((k, i) => {
              const a = ease(frame, simulateAt + i * 1.8, 10);
              if (a <= 0 || POISSON.simulated[i] <= 0) return null;
              const x = sx(X, k);
              const yy = base - POISSON.simulated[i] * unit;
              return (
                <line key={k} x1={x - 30} x2={x + 30} y1={yy} y2={yy} stroke={INK} strokeWidth={3} strokeLinecap="round" opacity={a} />
              );
            })}
          </Svg>
          <Bracket x0={tailX0} x1={tailX1} y={tailY} at={eightAt} color={ASK} />
          <Note at={spikeAt - 2} x={tailX0 - 40} y={tailY - h(44)}>
            <span style={{ ...askNote(23), whiteSpace: "nowrap", opacity: 1 - spikeFlash * 0.4 }}>{POISSON.atLeast} or more: a spike</span>
          </Note>
          <VRule x={mx} bottom={base} top={base - h(TALL + 24)} at={meanAt - 4} />
          <Note at={meanAt} x={mx + 34} y={base - h(TALL + 22)}>
            <span style={{ ...note(23, INK), fontWeight: 650, whiteSpace: "nowrap" }}>mean {POISSON.mean}</span>
          </Note>

          {/* ── The numbers ── */}
          <Ink at={oneHourAt - 6} dur={14} style={{ left: PANEL_X, top: y(420), whiteSpace: "nowrap" }}>
            <span style={label(22, INK_SOFT)}>Eight or more tickets</span>
          </Ink>
          <Ink at={eightyAt - 8} dur={16} style={{ left: PANEL_X, top: y(458), whiteSpace: "nowrap" }}>
            <span style={{ ...body(46, true), color: INK }}>
              one hour in {POISSON.oneIn}
            </span>
          </Ink>
          <Ink at={formulaAt - 6} dur={14} style={{ left: PANEL_X, top: y(540), whiteSpace: "nowrap" }}>
            <span style={{ ...note(24, INK), fontWeight: 600 }}>
              <Sweep at={formulaAt - 2}>
                formula <span style={askNote(24)}>{fmt(POISSON.sfAtLeast * 100, 2)}%</span>
              </Sweep>
            </span>
          </Ink>
          <Ink at={simulateAt - 4} dur={14} style={{ left: PANEL_X, top: y(584), whiteSpace: "nowrap" }}>
            <span style={{ ...note(24, INK), fontWeight: 600 }}>
              simulated <span style={askNote(24)}>{sims >= 1 || frame >= sevenAt - 4 ? `${fmt(POISSON.simulatedAtLeast * 100, 2)}%` : "…"}</span>
            </span>
          </Ink>
          <Note at={simulateAt} x={PANEL_X} y={y(624)}>
            <span style={{ ...note(21, INK_SOFT), whiteSpace: "nowrap" }}>
              {fmt(Math.round(POISSON.hours * sims), 0)} hours, a tick for each count
            </span>
          </Note>
          <Ink at={varianceAt - 4} dur={14} style={{ left: PANEL_X, top: y(690), whiteSpace: "nowrap" }}>
            <span style={{ ...note(24, INK), fontWeight: 600 }}>
              mean {POISSON.mean} = variance {POISSON.variance}
            </span>
          </Ink>
          <Note at={varyAt} x={PANEL_X} y={y(734)}>
            <span style={{ ...askNote(23), whiteSpace: "nowrap" }}>real variance far above the mean?</span>
          </Note>
          <Note at={clumpingAt - 2} x={PANEL_X} y={y(770)}>
            <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>events are clumping, and spikes</span>
          </Note>
          <Note at={understateAt - 2} x={PANEL_X} y={y(800)}>
            <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>come more often than this says</span>
          </Note>
          <Svg opacity={spikeFlash}>
            <rect x={tailX0 - 6} y={tailY - h(4)} width={tailX1 - tailX0 + 12} height={base - tailY + h(8)} fill="none" stroke={ASK} strokeWidth={2} rx={6} />
          </Svg>
        </Drift>
      </div>
    </AbsoluteFill>
  );
};
