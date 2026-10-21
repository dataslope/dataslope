import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { fmt, halo, headline, HAIRLINE, INK, INK_SOFT, label, note, PAPER, TABULAR } from "../../editorial/style";
import { FigLabel, Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { DINO, type DinoStats } from "./data";
import { DATA, Drift, Kicker, lerp, Mark, Pulse, Spot, STAT, STAT_INK, Svg, Tag } from "./parts";

/** The scatter's frame, in data units and page pixels. */
const SX = { lo: 10, hi: 100, x0: 200, x1: 860 };
const SY = { lo: 0, hi: 100, top: 400, bottom: 860 };
const R = 5.6;
/** All thirteen side by side: five to a row, each panel in the scatter's proportions. */
const GRID = { x0: 160, w: 143, gap: 16, top: 392, pitch: 142, h: 99, cols: 5 } as const;
const R_SMALL = 2.3;
/** What each dataset is called under its panel. */
const NAMES: Record<string, string> = {
  dino: "dinosaur",
  star: "star",
  circle: "circle",
  h_lines: "h lines",
  bullseye: "bullseye",
  x_shape: "x shape",
  slant_up: "slant up",
  dots: "dots",
  wide_lines: "wide lines",
  away: "away",
  high_lines: "high lines",
  v_lines: "v lines",
  slant_down: "slant down",
};

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
 * statistics first, then the plot: the dinosaur, large, which then steps
 * into a grid beside the other twelve, every one complete and named, while
 * the table beside them holds still.
 */
export const DinoScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const dinoFrom = n.beat("dino").from;
  const thirteenAt = n.word("dino", "thirteen datasets");
  const meansAt = n.word("dino", "means");
  const sdsAt = n.word("dino", "standard deviations");
  const corrAt = n.word("dino", "correlation");
  const hundredthAt = n.word("dino", "hundredth");
  const plotAt = n.word("plot", "plot");
  const dinosaurAt = n.word("plot", "dinosaur");
  const othersAt = n.word("plot", "Others");
  const starAt = n.word("plot", "star");
  const circleAt = n.word("plot", "circle");
  const linesAt = n.word("plot", "lines");
  const cairoAt = n.word("credit", "Alberto");
  const yearAt = n.word("credit", "twenty seventeen");
  const builtAt = n.word("credit", "built");
  const justinAt = n.word("credit", "Justin");
  const threwAt = n.word("lossy", "threw");
  const numbersAt = n.word("credit", "numbers");
  const lossyFrom = n.beat("lossy").from;
  const lossyAt = n.word("lossy", "lossy");
  const keepsAt = n.word("lossy", "keeps");
  const choicesAt = n.word("bins-in", "choices");

  const reveal = ease(frame, plotAt - 2, 22);
  /** The big dinosaur stepping down into the first panel of the grid. */
  const toGrid = ease(frame, othersAt - 4, 22);

  const px = (x: number) => SX.x0 + ((x - SX.lo) / (SX.hi - SX.lo)) * (SX.x1 - SX.x0);
  const py = (v: number) => y(SY.bottom) - ((v - SY.lo) / (SY.hi - SY.lo)) * (y(SY.bottom) - y(SY.top));
  const cx = (SX.x0 + SX.x1) / 2;
  const cy = (y(SY.top) + y(SY.bottom)) / 2;

  const cell = (i: number) => {
    const x0 = GRID.x0 + (i % GRID.cols) * (GRID.w + GRID.gap);
    const y0 = y(GRID.top) + Math.floor(i / GRID.cols) * h(GRID.pitch);
    return { x0, y0, w: GRID.w, h: h(GRID.h) };
  };
  const inCell = (i: number, [x, v]: readonly [number, number]) => {
    const c = cell(i);
    return [c.x0 + ((x - SX.lo) / (SX.hi - SX.lo)) * c.w, c.y0 + c.h - ((v - SY.lo) / (SY.hi - SY.lo)) * c.h] as const;
  };
  /** When each of the other twelve arrives in the grid. */
  const cellIn = (i: number) => (i === 0 ? toGrid : ease(frame, othersAt + i * 1.5, 12));

  // A panel is picked out while the narration names it.
  const pick = (at: number) => ease(frame, at - 2, 6) * (1 - ease(frame, at + 30, 12));
  const named: Record<string, number> = { star: starAt, circle: circleAt, h_lines: linesAt };
  const hi = (key: string, i: number) =>
    Math.max(
      named[key] !== undefined ? pick(named[key]) : 0,
      key === "dino" ? pick(cairoAt) : pick(builtAt + (i - 1) * 2),
    );

  const stats = DINO.stats.dino;
  const tableDim = ease(frame, lossyAt - 4, 14) * 0.4 + ease(frame, threwAt - 2, 14) * 0.25;
  const bump = ease(frame, keepsAt - 2, 8) * (1 - ease(frame, keepsAt + 10, 14));
  const big = 1 - toGrid;

  return (
    <AbsoluteFill>
      {/* ── Sound: the datasets, the table, the reveal, each named shape ── */}
      <Sfx name="el-sprinkle" at={thirteenAt - 4} level={-34} />
      <Sfx name="el-tap" at={meansAt - 4} level={-30} />
      <Sfx name="el-sprinkle" at={plotAt - 2} level={-32} />
      <Sfx name="el-whoosh" at={othersAt - 4} level={-34} />
      <Sfx name="el-sprinkle" at={othersAt + 2} level={-34} />

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
        <Svg opacity={ease(frame, thirteenAt - 4, 14) * big}>
          <line x1={SX.x0 - 16} x2={SX.x1 + 16} y1={y(SY.bottom) + 16} y2={y(SY.bottom) + 16} stroke={HAIRLINE} strokeWidth={1.4} />
          <line x1={SX.x0 - 16} x2={SX.x0 - 16} y1={y(SY.top) - 16} y2={y(SY.bottom) + 16} stroke={HAIRLINE} strokeWidth={1.4} />
        </Svg>
        <Tag x={SX.x1 + 16} y={y(SY.bottom) + 26} opacity={ease(frame, thirteenAt, 12) * big} color={INK_SOFT} size={20} align="right">
          x
        </Tag>
        <Tag x={SX.x0 - 40} y={y(SY.top) - 26} opacity={ease(frame, thirteenAt, 12) * big} color={INK_SOFT} size={20} align="left">
          y
        </Tag>
        <Tag x={cx} y={cy - 14} opacity={ease(frame, thirteenAt + 4, 12) * (1 - reveal)} color={INK_SOFT} size={24}>
          not plotted yet
        </Tag>

        {/* The thirteen panels: a frame, the points, a name. */}
        {DINO.order.map((key, i) => {
          const a = cellIn(i);
          if (a <= 0) return null;
          const c = cell(i);
          const lit = hi(key, i);
          return (
            <React.Fragment key={key}>
              <Svg opacity={a}>
                <line x1={c.x0 - 4} x2={c.x0 + c.w + 4} y1={c.y0 + c.h + 4} y2={c.y0 + c.h + 4} stroke={HAIRLINE} strokeWidth={1.2} />
                <line x1={c.x0 - 4} x2={c.x0 - 4} y1={c.y0 - 4} y2={c.y0 + c.h + 4} stroke={HAIRLINE} strokeWidth={1.2} />
                {lit > 0 ? (
                  <rect x={c.x0 - 10} y={c.y0 - 10} width={c.w + 20} height={c.h + 20} rx={6} fill="none" stroke={STAT} strokeWidth={2.6} opacity={lit} />
                ) : null}
              </Svg>
              <Tag x={c.x0 + c.w / 2} y={c.y0 + c.h + 12} opacity={a} color={lit > 0.5 ? STAT_INK : INK_SOFT} size={20} bold={lit > 0.5}>
                {NAMES[key] ?? key}
              </Tag>
            </React.Fragment>
          );
        })}
        {reveal > 0 ? (
          <Svg>
            {DINO.points.dino.map((p, i) => {
              const [gx, gy] = inCell(0, p);
              const a = ease(frame, plotAt - 2 + (i / DINO.points.dino.length) * 16, 10);
              const fx = lerp(px(p[0]), gx, toGrid);
              const fy = lerp(py(p[1]), gy, toGrid);
              const r = lerp(R, R_SMALL, toGrid) * (1 + 0.3 * bump);
              return <circle key={i} cx={lerp(cx, fx, a)} cy={lerp(cy, fy, a)} r={r} fill={DATA} opacity={0.82 * a} stroke={PAPER} strokeWidth={0.8 * big} />;
            })}
            {DINO.order.slice(1).map((key, k) => {
              const i = k + 1;
              const a = cellIn(i);
              if (a <= 0) return null;
              const c = cell(i);
              return DINO.points[key].map((p, j) => {
                const [gx, gy] = inCell(i, p);
                return (
                  <circle
                    key={`${key}${j}`}
                    cx={lerp(c.x0 + c.w / 2, gx, a)}
                    cy={lerp(c.y0 + c.h / 2, gy, a)}
                    r={R_SMALL * (1 + 0.3 * bump)}
                    fill={DATA}
                    opacity={0.82 * a}
                  />
                );
              });
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
              <span style={{ ...note(30, INK), ...TABULAR, fontWeight: 700 }}>
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
            const on = i === 0 ? reveal > 0.5 : cellIn(i) > 0.5;
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
        <Tag x={1000} y={y(760) + 26} opacity={ease(frame, hundredthAt - 2, 12)} color={STAT_INK} size={21} align="left">
          all thirteen agree to within 0.01
        </Tag>
      </div>

      <Spot id="describing-data-dinosaur" at={cairoAt - 4} left={1560} top={y(520)} width={290} height={264} />

      {/* The credit. */}
      <Ink at={cairoAt - 2} dur={16} style={{ left: 1000, top: y(860), whiteSpace: "nowrap" }}>
        <span style={{ ...note(21, INK_SOFT), ...halo }}>The dinosaur: Alberto Cairo.</span>
      </Ink>
      <Ink at={yearAt - 2} dur={16} style={{ left: 1000, top: y(860) + 32, whiteSpace: "nowrap" }}>
        <span style={{ ...note(21, INK_SOFT), ...halo }}>
          The other twelve, 2017: <span style={{ opacity: ease(frame, justinAt - 4, 12) }}>Justin Matejka and George Fitzmaurice.</span>
        </span>
      </Ink>
      <Ink at={meansAt - 8} dur={16} style={{ left: 1000, top: y(410) - 50, whiteSpace: "nowrap" }}>
        <span style={{ ...label(22, INK_SOFT) }}>
          Five numbers, <Mark at={numbersAt - 2} out={numbersAt + 50}>the same for all thirteen</Mark>
        </span>
      </Ink>
      <Ink at={choicesAt - 4} dur={16} style={{ left: 200, top: y(920), whiteSpace: "nowrap" }}>
        <span style={{ ...label(22, INK) }}>But drawing one means choosing how.</span>
      </Ink>
    </AbsoluteFill>
  );
};
