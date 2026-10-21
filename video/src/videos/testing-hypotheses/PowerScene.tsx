import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { Axis, sx, type XScale } from "../../editorial/charts";
import { useLayout } from "../../editorial/layout";
import { body, fmt, HAIRLINE, halo, INK, INK_SOFT, note, PAPER } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { POWER, POWER_BY_N } from "./data";
import { Arrow, Bracket, Count, curvePath, DATA, DATA_INK, Greek, Head, Label, lerp, pct, phi, pulse, RAW, STAT, STAT_INK, Svg } from "./parts";

/** The 2,000 experiments, fifty to a row. */
const GRID_X = 160;
const GRID_Y = 372;
const COLS = 50;
const CELL_W = 15;
const CELL_H = 10.5;
/** Power against n, on a log axis: 10 to 320 per group. */
const L: XScale = { lo: Math.log2(10), hi: Math.log2(320), x0: 1110, x1: 1740 };
const P_BASE = 800;
const P_TALL = 400;
/** One experiment, beside the grid until the seesaw takes its place: the two
 *  groups' populations, half an SD apart (px per SD, centre x, page base). */
const ONE = { sd: 88, cx: 1420, base: 700, tall: 200 };
/** The 80-100% design target: a faint ink tint, so labels inside it read. */
const TARGET_WASH = `color-mix(in srgb, ${INK} 6%, transparent)`;

/**
 * Power counted: 2,000 experiments with a real 0.5 effect at 30 per group,
 * 950 of which reject. Then the alpha-beta seesaw, and the only escape from
 * it, more data (the lesson's seed-1 curve).
 */
export const PowerScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const simFrom = n.beat("sim").from;
  const plantAt = n.word("sim", "Plant");
  const halfAt = n.word("sim", "half");
  const thirtyAt = n.word("sim", "thirty");
  const repeatAt = n.word("sim", "repeat");
  const fortySevenAt = n.word("coinflip", "Forty-seven");
  const flipAt = n.word("coinflip", "coin flip");
  const runsRejectAt = n.word("coinflip", "runs");
  const findingAt = n.word("coinflip", "Finding");
  const reallyAt = n.word("coinflip", "really there");
  const fixedAt = n.word("trade", "sample fixed");
  const designedAt = n.word("target", "designed");
  const timeAt = n.word("more", "time");
  const studiesAt = n.word("target", "Studies");
  const lowerAt = n.word("trade", "Lower");
  const missAt = n.word("trade", "miss");
  const pushingAt = n.word("trade", "pushing");
  const testAt = n.word("sim", "test thirty");
  const upAt = n.word("trade", "up");
  const onlyAt = n.word("more", "Only");
  const fortyAt = n.word("more", "Forty");
  const sixtyAt = n.word("more", "sixty-one");
  const eightyAt = n.word("more", "Eighty");
  const ninetyAt = n.word("more", "ninety");
  const targetAt = n.word("target", "eighty");

  // The experiments arrive row by row; each square is one run.
  const fill = ease(frame, repeatAt - 2, 70);
  const done = Math.round(fill * POWER.runs);
  const caught = POWER.flags.slice(0, done).filter(Boolean).length;
  const reveal = ease(frame, runsRejectAt - 2, 8);
  const flipGlow = pulse(frame, flipAt, 26);

  // The seesaw: alpha falls, beta rises.
  const schematic = 1 - ease(frame, onlyAt - 6, 14);
  const aDown = ease(frame, lowerAt, 18);
  const bUp = ease(frame, missAt - 2, 18);
  const aDown2 = ease(frame, pushingAt + 6, 14);
  const bUp2 = ease(frame, upAt - 4, 14);
  const aH = h(220) * (lerp(0.62, 0.3, aDown) - 0.14 * aDown2);
  const bH = h(220) * (lerp(0.5, 0.82, bUp) + 0.16 * bUp2);
  const SEE_BASE = y(760);

  // Power against n.
  const curveIn = ease(frame, onlyAt + 6, 30);
  const px = (nn: number) => sx(L, Math.log2(nn));
  const py = (p: number) => y(P_BASE) - h(P_TALL) * p;
  const at40 = pulse(frame, sixtyAt - 2, 26);
  const at80 = pulse(frame, ninetyAt - 2, 26);
  const target = ease(frame, designedAt - 4, 20);
  const zone = ease(frame, studiesAt - 2, 14);
  // Fig. 13's own run (30 per group, 47.5%), marked on the curve once it is drawn.
  const runIn = ease(frame, onlyAt + 34, 12);

  // One experiment: the two populations, a real 0.5 SD apart, until the seesaw.
  const oneIn = ease(frame, plantAt - 4, 22);
  const oneOut = ease(frame, lowerAt - 10, 12);
  const ox = (z: number) => ONE.cx + z * ONE.sd;
  const oy = (v: number) => y(ONE.base) - h(ONE.tall) * (v / phi(0));
  const shift = POWER.effect;
  const timeGlow = pulse(frame, timeAt - 2, 24);

  return (
    <AbsoluteFill>
      {/* ── Sound: the runs pouring in, the share, the seesaw, the curve ── */}
      <Sfx name="el-pencil" at={plantAt - 4} level={-36} />
      <Sfx name="el-sprinkle" at={repeatAt - 2} level={-32} />
      <Sfx name="el-sprinkle" at={repeatAt + 34} level={-34} />
      <Sfx name="el-tap" at={fortySevenAt - 4} level={-28} />
      <Sfx name="el-whoosh" at={lowerAt} level={-34} />
      <Sfx name="el-pencil" at={onlyAt + 6} level={-34} />
      <Sfx name="el-pencil" at={targetAt - 4} level={-35} />

      <Head a="Power," b="by counting." at={simFrom - 6} bAt={plantAt - 4} out={onlyAt - 8} />
      {/* The figure holds alpha at 5%, so the headline names the seesaw it escapes rather than claiming "both". */}
      <Head a="Only more data" b="escapes the seesaw." at={onlyAt - 4} bAt={onlyAt + 10} />

      {/* ── Fig. 13: 2,000 experiments with a real effect ── */}
      <FigLabel n="13" title="2,000 experiments, each one square" at={simFrom} x={GRID_X} y={y(300)} />
      <Ink at={halfAt - 4} dur={14} style={{ left: GRID_X, top: y(300) + 40, whiteSpace: "nowrap" }}>
        <Label size={21} color={INK_SOFT} weight={520}>
          a real effect of {POWER.effect} SD
          <span style={{ opacity: ease(frame, thirtyAt - 2, 10) }}>, {POWER.n} per group</span>
        </Label>
      </Ink>
      <Svg opacity={0.35 * ease(frame, repeatAt - 2, 12)}>
        <rect x={GRID_X} y={y(GRID_Y) + 22} width={COLS * CELL_W - 2.5} height={40 * CELL_H - 2.5} fill={RAW} />
      </Svg>
      <Svg>
        {POWER.flags.slice(0, done).map((hit, i) => {
          const c = i % COLS;
          const r = Math.floor(i / COLS);
          return (
            <rect
              key={i}
              x={GRID_X + c * CELL_W}
              y={y(GRID_Y) + 22 + r * CELL_H}
              width={CELL_W - 2.5}
              height={CELL_H - 2.5}
              fill={hit ? DATA : RAW}
              opacity={hit ? 1 : 1 - 0.8 * reveal}
            />
          );
        })}
      </Svg>
      <div style={{ position: "absolute", left: GRID_X, top: y(GRID_Y) + 22 + 40 * CELL_H + 18, opacity: ease(frame, repeatAt - 2, 8), whiteSpace: "nowrap" }}>
        <Label size={24}>
          <span style={{ color: DATA_INK }}>rejected: {fmt(caught, 0)}</span>
          <span style={{ color: INK_SOFT, marginLeft: 22 }}>of {fmt(done, 0)} runs</span>
        </Label>
      </div>
      <Note at={fortySevenAt - 4} x={GRID_X} y={y(GRID_Y) + 22 + 40 * CELL_H + 64}>
        <span
          style={{
            ...note(40, DATA_INK),
            fontWeight: 700,
            display: "inline-block",
            transform: `scale(${1 + 0.1 * pulse(frame, reallyAt - 2, 24)})`,
            transformOrigin: "0 60%",
          }}
        >
          <Count at={fortySevenAt - 4} to={POWER.power} dur={20} format={(v) => pct(v, 1)} />
        </span>
        <span style={{ ...body(34, true), color: INK, marginLeft: 18, display: "inline-block", transform: `scale(${1 + 0.06 * flipGlow})` }}>
          <span style={{ opacity: ease(frame, findingAt - 2, 10) }}>
            caught it<span style={{ opacity: ease(frame, flipAt - 4, 12) }}>: a coin flip</span>
          </span>
        </span>
      </Note>

      {/* ── One experiment: what "a real effect of half an SD" looks like ── */}
      {oneIn > 0 && oneOut < 1 ? (
        <div style={{ position: "absolute", inset: 0, opacity: 1 - oneOut }}>
          <Ink at={plantAt - 6} dur={14} style={{ left: 1160, top: y(ONE.base) - h(ONE.tall) - 130, whiteSpace: "nowrap" }}>
            <Label size={22} color={INK_SOFT}>
              One experiment
            </Label>
          </Ink>
          <Svg opacity={oneIn}>
            <line x1={1130} x2={1760} y1={y(ONE.base)} y2={y(ONE.base)} stroke={INK} strokeWidth={1.6} />
            <path d={curvePath(phi, -3.3, 3.3, ox, oy, y(ONE.base))} fill={RAW} opacity={0.75} />
            <path d={curvePath(phi, -3.3, 3.3, (z) => ox(z + shift), oy, y(ONE.base))} fill={DATA} opacity={0.45} />
            <line x1={ox(0)} x2={ox(0)} y1={y(ONE.base)} y2={oy(phi(0)) - 8} stroke={INK_SOFT} strokeWidth={2.4} />
            <line x1={ox(shift)} x2={ox(shift)} y1={y(ONE.base)} y2={oy(phi(0)) - 8} stroke={DATA} strokeWidth={2.4} />
          </Svg>
          <Note at={plantAt + 6} x={ox(-1.4) - 10} y={oy(phi(1.4)) - 34} align="right">
            <Label size={21} color={INK_SOFT} weight={520}>
              control
            </Label>
          </Note>
          <Note at={plantAt + 10} x={ox(1.4 + shift) + 10} y={oy(phi(1.4)) - 34}>
            <Label size={21} color={DATA_INK} weight={520}>
              treatment
            </Label>
          </Note>
          <Bracket x0={ox(0)} x1={ox(shift)} y={oy(phi(0)) - 22} at={halfAt - 2} color={STAT} up width={2.6} />
          <Note at={halfAt + 2} x={ox(shift / 2)} y={oy(phi(0)) - 74} from="up">
            <span style={{ display: "inline-block", transform: "translateX(-50%)" }}>
              <Label size={22} color={STAT_INK}>
                a real gap of {POWER.effect} SD
              </Label>
            </span>
          </Note>
          <Note at={testAt - 2} x={1160} y={y(ONE.base) + 16}>
            <Label size={22} color={INK}>
              {POWER.n} drawn from each, then one t-test
            </Label>
          </Note>
          <Arrow from={[1140, y(GRID_Y) + 22 + 20 * CELL_H]} to={[GRID_X + COLS * CELL_W + 22, y(GRID_Y) + 22 + 20 * CELL_H]} at={repeatAt - 2} color={INK_SOFT} />
          <Note at={repeatAt + 6} x={1030} y={y(GRID_Y) + 22 + 20 * CELL_H - 44} from="up">
            <span style={{ display: "inline-block", transform: "translateX(-50%)" }}>
              <Label size={22}>× {fmt(POWER.runs, 0)}</Label>
            </span>
          </Note>
        </div>
      ) : null}

      {/* ── The seesaw: alpha down, beta up ── */}
      <div style={{ position: "absolute", inset: 0, opacity: schematic }}>
        <Ink at={fixedAt - 4} dur={14} style={{ left: 1150, top: SEE_BASE - h(260), whiteSpace: "nowrap" }}>
          <Label size={22} color={INK_SOFT}>
            With the sample fixed
          </Label>
        </Ink>
        <Svg opacity={ease(frame, lowerAt - 6, 12)}>
          <line x1={1180} x2={1700} y1={SEE_BASE} y2={SEE_BASE} stroke={INK} strokeWidth={1.6} />
          <rect x={1250} y={SEE_BASE - aH} width={150} height={aH} fill={STAT} opacity={0.75} />
          <rect x={1480} y={SEE_BASE - bH} width={150} height={bH} fill={STAT} opacity={0.45} />
        </Svg>
        <div style={{ position: "absolute", left: 1250, top: SEE_BASE + 14, width: 150, textAlign: "center", opacity: ease(frame, lowerAt - 4, 12) }}>
          <Label size={22}>
            false alarms, <Greek>α</Greek>
          </Label>
        </div>
        <div style={{ position: "absolute", left: 1480, top: SEE_BASE + 14, width: 150, textAlign: "center", opacity: ease(frame, lowerAt - 2, 12) }}>
          <Label size={22}>
            misses, <Greek>β</Greek>
          </Label>
        </div>
        <Arrow from={[1325, SEE_BASE - aH - 70]} to={[1325, SEE_BASE - aH - 16]} at={pushingAt - 4} color={INK} width={2.4} />
        <Arrow from={[1555, SEE_BASE - bH - 16]} to={[1555, SEE_BASE - bH - 70]} at={upAt - 6} color={INK} width={2.4} />
      </div>

      {/* ── Fig. 14: power against the sample size ── */}
      <FigLabel n="14" title={`Power to catch the same ${POWER_BY_N.effect} effect`} at={onlyAt + 2} x={L.x0 - 40} y={y(300)} />
      <Axis
        scale={L}
        base={y(P_BASE)}
        ticks={POWER_BY_N.sizes.map((s) => Math.log2(s))}
        format={(v) => String(Math.round(2 ** v))}
        at={onlyAt + 2}
        opacity={1 - schematic}
      />
      <Ink at={onlyAt + 8} dur={14} style={{ left: L.x0 - 40, top: y(300) + 40, whiteSpace: "nowrap" }}>
        <Label size={21} color={INK_SOFT} weight={520}>
          <Greek>α</Greek> held at 5% throughout
        </Label>
      </Ink>
      <Note at={onlyAt + 6} x={L.x1} y={y(P_BASE) + 40} align="right">
        <Label size={21} color={INK_SOFT} weight={520}>
          per group
        </Label>
      </Note>
      <Svg opacity={1 - schematic}>
        {[0.25, 0.5, 0.75, 1].map((v) => (
          <line key={v} x1={L.x0} x2={L.x1} y1={py(v)} y2={py(v)} stroke={HAIRLINE} strokeWidth={1} opacity={0.3} />
        ))}
        {zone > 0 ? <rect x={L.x0} y={py(1)} width={L.x1 - L.x0} height={py(0.8) - py(1)} fill={TARGET_WASH} opacity={zone} /> : null}
        {target > 0 ? (
          <line x1={L.x0} x2={L.x0 + (L.x1 - L.x0) * target} y1={py(0.8)} y2={py(0.8)} stroke={INK} strokeWidth={2.2} strokeDasharray="8 6" />
        ) : null}
        <polyline
          points={POWER_BY_N.sizes.map((s, i) => `${px(s).toFixed(1)},${py(POWER_BY_N.power[i]).toFixed(1)}`).join(" ")}
          fill="none"
          stroke={DATA}
          strokeWidth={3.2}
          strokeLinejoin="round"
          pathLength={1}
          strokeDasharray={`${curveIn} 1`}
        />
        {POWER_BY_N.sizes.map((s, i) => {
          const a = ease(frame, onlyAt + 6 + i * 5, 8);
          if (a <= 0) return null;
          const glow = s === 40 ? at40 : s === 80 ? at80 : 0;
          return <circle key={s} cx={px(s)} cy={py(POWER_BY_N.power[i])} r={(7 + 5 * glow) * a} fill={DATA} stroke={PAPER} strokeWidth={2} />;
        })}
        {runIn > 0 ? (
          <circle cx={px(POWER.n)} cy={py(POWER.power)} r={8 * runIn} fill={PAPER} stroke={DATA_INK} strokeWidth={2.6} />
        ) : null}
      </Svg>
      {[0.25, 0.5, 0.75, 1].map((v) => (
        <div
          key={v}
          style={{ position: "absolute", right: 1920 - L.x0 + 14, top: py(v) - 13, opacity: (1 - schematic) * ease(frame, onlyAt + 4, 12), ...note(20, INK_SOFT) }}
        >
          {pct(v, 0)}
        </div>
      ))}
      {[
        [40, fortyAt, sixtyAt],
        [80, eightyAt, ninetyAt],
      ].map(([s, at, shareAt]) => {
        const i = POWER_BY_N.sizes.indexOf(s);
        return (
          // Above-left of each dot: the curve arrives from below-left.
          <Note key={s} at={at - 2} x={px(s) - 16} y={py(POWER_BY_N.power[i]) - 40} align="right">
            <span
              style={{
                ...note(24, DATA_INK),
                fontWeight: 700,
                ...halo,
                whiteSpace: "nowrap",
                display: "inline-block",
                transform: s === 40 ? `scale(${1 + 0.12 * timeGlow})` : undefined,
                transformOrigin: "100% 50%",
              }}
            >
              {s} per group<span style={{ opacity: ease(frame, shareAt - 2, 10) }}>: {pct(POWER_BY_N.power[i], 0)}</span>
            </span>
          </Note>
        );
      })}
      <Note at={onlyAt + 38} x={px(POWER.n) + 14} y={py(POWER.power) + 6}>
        <Label size={21} color={DATA_INK} weight={520} style={halo}>
          Fig. 13&apos;s run, {POWER.n} per group
        </Label>
      </Note>
      <Note at={targetAt} x={L.x1} y={py(0.8) + 12} align="right">
        <Label size={21} color={INK} style={halo}>
          the usual target, 80%
        </Label>
      </Note>
      <Note at={pushingAt - 2} x={1150} y={y(840)} out={onlyAt - 6}>
        <span style={{ ...body(30, true), color: STAT_INK }}>Push one down, the other goes up.</span>
      </Note>
    </AbsoluteFill>
  );
};
