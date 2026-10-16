import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { fmt, halo, headline, HAIRLINE, INK, INK_SOFT, label, note, PAPER } from "../../editorial/style";
import { FigLabel, Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { DINO, type DinoStats } from "./data";
import { DATA, Drift, Kicker, lerp, Mark, Pulse, Spot, STAT_INK, Svg, Tag } from "./parts";

/** The scatter's frame, in data units and page pixels. */
const SX = { lo: 10, hi: 100, x0: 200, x1: 860 };
const SY = { lo: 0, hi: 100, top: 400, bottom: 860 };
const R = 5.6;
/** How long one dataset takes to become the next, in frames. */
const MORPH = 16;

const ROWS: { key: keyof DinoStats; name: string }[] = [
  { key: "meanX", name: "Mean of x" },
  { key: "meanY", name: "Mean of y" },
  { key: "sdX", name: "SD of x" },
  { key: "sdY", name: "SD of y" },
  { key: "corr", name: "Correlation" },
];

/** "−0.06", "54.26": a statistic as the table prints it. */
const stat = (v: number) => (v < 0 ? `−${fmt(-v, 2)}` : fmt(v, 2));

/**
 * Part 4 opens: the Datasaurus Dozen. Thirteen datasets' shared summary
 * statistics first, then the plot: a dinosaur that becomes a star, a circle
 * and a set of lines, the numbers beside it holding still to a hundredth.
 */
export const DinoScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  // ── Cues ──
  const dinoFrom = n.beat("dino").from;
  const thirteenAt = n.word("dino", "thirteen datasets");
  const meansAt = n.word("dino", "means");
  const sdsAt = n.word("dino", "standard deviations");
  const corrAt = n.word("dino", "correlation");
  const hundredthAt = n.word("dino", "hundredth");
  const plotAt = n.word("plot", "plot");
  const dinosaurAt = n.word("plot", "dinosaur");
  const starAt = n.word("plot", "star");
  const circleAt = n.word("plot", "circle");
  const linesAt = n.word("plot", "lines");
  const cairoAt = n.word("credit", "Alberto");
  const yearAt = n.word("credit", "twenty seventeen");
  const builtAt = n.word("credit", "built");
  const matchAt = n.word("credit", "match");
  const lossyFrom = n.beat("lossy").from;
  const lossyAt = n.word("lossy", "lossy");
  const keepsAt = n.word("lossy", "keeps");
  const choicesAt = n.word("bins-in", "choices");

  // Which dataset is on screen when: the four the narration names, then the
  // other nine in turn while the credit is read, then the dinosaur again.
  const named = ["dino", "star", "circle", "h_lines"];
  const rest = DINO.order.filter((k) => !named.includes(k));
  const restStep = Math.max(MORPH + 4, Math.floor((matchAt - builtAt + 30) / rest.length));
  const schedule: { key: string; at: number }[] = [
    { key: "dino", at: plotAt },
    { key: "star", at: starAt - 4 },
    { key: "circle", at: circleAt - 4 },
    { key: "h_lines", at: linesAt - 4 },
    { key: "dino", at: cairoAt - 2 },
    ...rest.map((key, i) => ({ key, at: builtAt + i * restStep })),
    { key: "dino", at: builtAt + rest.length * restStep },
  ];
  let k = 0;
  while (k + 1 < schedule.length && frame >= schedule[k + 1].at) k++;
  const cur = schedule[k];
  const prev = k > 0 ? schedule[k - 1] : cur;
  const reveal = ease(frame, plotAt - 2, 22);

  const px = (x: number) => SX.x0 + ((x - SX.lo) / (SX.hi - SX.lo)) * (SX.x1 - SX.x0);
  const py = (v: number) => y(SY.bottom) - ((v - SY.lo) / (SY.hi - SY.lo)) * (y(SY.bottom) - y(SY.top));
  const from = DINO.points[prev.key];
  const to = DINO.points[cur.key];
  const cx = (SX.x0 + SX.x1) / 2;
  const cy = (y(SY.top) + y(SY.bottom)) / 2;

  // The table shows the dataset being drawn, switching halfway through a morph.
  const showing = frame - cur.at < MORPH / 2 && k > 0 ? prev.key : cur.key;
  const stats = DINO.stats[showing];
  const index = DINO.order.indexOf(showing);
  const tableDim = ease(frame, lossyAt - 4, 14) * 0.55;
  const bump = ease(frame, keepsAt - 2, 8) * (1 - ease(frame, keepsAt + 10, 14));

  return (
    <AbsoluteFill>
      {/* ── Sound: the datasets, the table, the reveal, each named shape ── */}
      <Sfx name="el-sprinkle" at={thirteenAt - 4} level={-34} />
      <Sfx name="el-tap" at={meansAt - 4} level={-30} />
      <Sfx name="el-sprinkle" at={plotAt - 2} level={-32} />
      <Sfx name="el-whoosh" at={starAt - 4} level={-34} />
      <Sfx name="el-whoosh" at={circleAt - 4} level={-34} />
      <Sfx name="el-whoosh" at={linesAt - 4} level={-34} />

      <Kicker at={dinoFrom - 10}>Always plot first</Kicker>

      {/* ── Headlines ── */}
      <div style={{ position: "absolute", left: 92, top: y(150), display: "flex", gap: "0.26em", ...headline(80) }}>
        <Ink at={dinoFrom - 4} dur={20} out={lossyFrom - 6} style={{ position: "relative", whiteSpace: "nowrap" }}>
          Same numbers.
        </Ink>
        <Ink at={plotAt - 2} dur={18} out={lossyFrom - 6} style={{ position: "relative", ...headline(80, true), color: STAT_INK, whiteSpace: "nowrap" }}>
          Different pictures.
        </Ink>
      </div>
      <Ink at={lossyFrom - 2} dur={20} style={{ left: 92, top: y(150), ...headline(80), whiteSpace: "nowrap" }}>
        A summary is a <Mark at={lossyAt}>lossy copy</Mark>.
      </Ink>

      <FigLabel n="11" title="The Datasaurus Dozen: thirteen datasets of 142 points" at={thirteenAt - 6} x={160} y={y(330)} />

      <Drift from={dinoFrom} to={choicesAt + 40} scale={0.02} origin={[530, y(SY.bottom)]}>
        {/* The scatter's frame, waiting until "plot them". */}
        <Svg opacity={ease(frame, thirteenAt - 4, 14)}>
          <line x1={SX.x0 - 16} x2={SX.x1 + 16} y1={y(SY.bottom) + 16} y2={y(SY.bottom) + 16} stroke={HAIRLINE} strokeWidth={1.4} />
          <line x1={SX.x0 - 16} x2={SX.x0 - 16} y1={y(SY.top) - 16} y2={y(SY.bottom) + 16} stroke={HAIRLINE} strokeWidth={1.4} />
        </Svg>
        <Tag x={SX.x1 + 16} y={y(SY.bottom) + 26} opacity={ease(frame, thirteenAt, 12)} color={INK_SOFT} size={20} align="right">
          x
        </Tag>
        <Tag x={SX.x0 - 40} y={y(SY.top) - 26} opacity={ease(frame, thirteenAt, 12)} color={INK_SOFT} size={20} align="left">
          y
        </Tag>
        <Tag x={cx} y={cy - 14} opacity={ease(frame, thirteenAt + 4, 12) * (1 - reveal)} color={INK_SOFT} size={24}>
          not plotted yet
        </Tag>
        {reveal > 0 ? (
          <Svg>
            {to.map(([x1, y1], i) => {
              const [x0, y0] = from[i] ?? [x1, y1];
              const t = k === 0 ? 1 : ease(frame, cur.at + (i % 12) * 0.25, MORPH);
              const fx = lerp(px(x0), px(x1), t);
              const fy = lerp(py(y0), py(y1), t);
              const a = ease(frame, plotAt - 2 + (i / to.length) * 16, 10);
              return <circle key={i} cx={lerp(cx, fx, a)} cy={lerp(cy, fy, a)} r={R * (1 + 0.3 * bump)} fill={DATA} opacity={0.82 * a} stroke={PAPER} strokeWidth={0.8} />;
            })}
          </Svg>
        ) : null}
        <Pulse x={px(DINO.points.dino[0][0])} y={py(DINO.points.dino[0][1])} at={dinosaurAt + 2} color={DATA} r={8} />
      </Drift>

      {/* ── The summary table ── */}
      <div style={{ position: "absolute", inset: 0, opacity: 1 - tableDim }}>
        {ROWS.map((r, i) => {
          const at = i < 2 ? meansAt : i < 4 ? sdsAt : corrAt;
          const p = ease(frame, at - 4 + (i % 2) * 4, 12);
          if (p <= 0) return null;
          const top = y(410) + i * 64;
          return (
            <div key={r.key} style={{ position: "absolute", left: 1000, top, width: 470, opacity: p, transform: `translateX(${(1 - p) * 18}px)`, display: "flex", justifyContent: "space-between", alignItems: "baseline", borderBottom: `1px solid ${HAIRLINE}`, paddingBottom: 10 }}>
              <span style={{ ...label(25, INK), fontWeight: 560 }}>{r.name}</span>
              <span style={{ ...note(30, INK), fontWeight: 700 }}>
                <Mark at={hundredthAt - 2 + i * 2} out={plotAt + 10}>
                  {stat(stats[r.key])}
                </Mark>
              </span>
            </div>
          );
        })}
        {/* Which dataset is being drawn: one chip for each of the thirteen. */}
        <Svg>
          {DINO.order.map((key, i) => {
            const p = ease(frame, thirteenAt - 2 + i * 1.5, 8);
            if (p <= 0) return null;
            const on = reveal > 0.5 && key === showing;
            return (
              <circle
                key={key}
                cx={1012 + i * 37}
                cy={y(760)}
                r={(on ? 11 : 8) * p}
                fill={on ? DATA : "none"}
                stroke={on ? DATA : INK_SOFT}
                strokeWidth={1.8}
              />
            );
          })}
        </Svg>
        <Tag x={1000} y={y(760) + 26} opacity={ease(frame, hundredthAt - 2, 12) * (1 - ease(frame, plotAt, 8))} color={STAT_INK} size={21} align="left">
          all thirteen agree to within 0.01
        </Tag>
        <Tag x={1000} y={y(760) + 26} opacity={ease(frame, plotAt + 6, 12)} color={INK_SOFT} size={21} align="left">
          dataset {index + 1} of {DINO.order.length}: {showing.replace("_", " ")}
        </Tag>
      </div>

      <Spot id="describing-data-dinosaur" at={cairoAt - 4} left={1560} top={y(520)} width={290} height={264} />

      {/* The credit. */}
      <Ink at={cairoAt - 2} dur={16} style={{ left: 1000, top: y(860), whiteSpace: "nowrap" }}>
        <span style={{ ...note(21, INK_SOFT), ...halo }}>The dinosaur: Alberto Cairo.</span>
      </Ink>
      <Ink at={yearAt - 2} dur={16} style={{ left: 1000, top: y(860) + 32, whiteSpace: "nowrap" }}>
        <span style={{ ...note(21, INK_SOFT), ...halo }}>The other twelve: Justin Matejka and George Fitzmaurice, 2017.</span>
      </Ink>
      <Ink at={meansAt - 8} dur={16} style={{ left: 1000, top: y(410) - 50, whiteSpace: "nowrap" }}>
        <span style={{ ...label(22, INK_SOFT) }}>Five numbers, the same for all thirteen</span>
      </Ink>
      <Ink at={choicesAt - 4} dur={16} style={{ left: 200, top: y(920), whiteSpace: "nowrap" }}>
        <span style={{ ...label(22, INK) }}>But drawing one means choosing how.</span>
      </Ink>
    </AbsoluteFill>
  );
};
