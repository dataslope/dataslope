import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { Bars, sx, type XScale } from "../../editorial/charts";
import { useLayout } from "../../editorial/layout";
import { body, fmt, halo, headline, HIGHLIGHT, INK, INK_SOFT, label } from "../../editorial/style";
import { FigLabel, Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ORDERS } from "./data";
import { Arrow, Bracket, DATA, Drift, lerp, Mark, Pulse, STAT, STAT_INK, Svg, Tag } from "./parts";

const BASE = 830;
const X0 = 160;
const X1_WIDE = 1720;
const X1_NARROW = 860;

/** A row of the when-to-use table: a small shape, the case, the center. */
const ROWS = [
  { beat: "symmetric", word: "Symmetric", center: "mean", what: "Symmetric, no wild values", answer: "Mean", red: true },
  { beat: "skewed", word: "Skewed", center: "median", what: "Skewed, or outliers", answer: "Median", red: false },
  { beat: "categories", word: "Categories", center: "mode", what: "Categories", answer: "Mode", red: false },
  { beat: "peaks", word: "two peaks", center: "single", what: "Two peaks", answer: "No single center", red: false },
] as const;

/** The little shape at the start of each row, drawn in as the row arrives. */
const Glyph: React.FC<{ kind: number; x: number; y: number; p: number }> = ({ kind, x, y, p }) => {
  const w = 86;
  const hgt = 46;
  const path = (f: (t: number) => number) =>
    Array.from({ length: 41 }, (_, i) => {
      const t = i / 40;
      return `${i ? "L" : "M"}${(x + t * w).toFixed(1)},${(y + hgt - f(t) * hgt).toFixed(1)}`;
    }).join(" ");
  const bell = (t: number) => Math.exp(-((t - 0.5) ** 2) / 0.03);
  const skew = (t: number) => (t <= 0 ? 0 : Math.min(1, 7.4 * t * Math.exp(-6 * t) * 2.2));
  const two = (t: number) => Math.max(Math.exp(-((t - 0.27) ** 2) / 0.012), Math.exp(-((t - 0.73) ** 2) / 0.012));
  return (
    <Svg>
      <line x1={x} x2={x + w} y1={y + hgt + 1} y2={y + hgt + 1} stroke={INK_SOFT} strokeWidth={1.4} opacity={p} />
      {kind === 2 ? (
        [0.55, 1, 0.35].map((v, i) => (
          <rect key={i} x={x + 6 + i * 28} y={y + hgt - v * hgt * p} width={20} height={v * hgt * p} fill={DATA} opacity={0.85} />
        ))
      ) : (
        <path
          d={path(kind === 0 ? bell : kind === 1 ? skew : two)}
          fill="none"
          stroke={DATA}
          strokeWidth={3}
          strokeLinejoin="round"
          pathLength={1}
          strokeDasharray={`${p} 1`}
        />
      )}
    </Svg>
  );
};

/**
 * Part 1, second scene: five hundred right-skewed orders, the median and the
 * mean pulled up the tail, then the histogram makes room for the lesson's
 * rules of which center to use when.
 */
export const SkewScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const ordersFrom = n.beat("orders").from;
  const fiveAt = n.word("orders", "five hundred");
  const modestAt = n.word("orders", "modest");
  const tailAt = n.word("orders", "long tail");
  const medianAt = n.word("median", "median");
  const meanAt = n.word("mean", "mean");
  const dragsAt = n.word("mean", "drags");
  const alarmAt = n.word("alarm", "alarm");
  const leadAt = n.word("alarm", "lead");
  const rightFrom = n.beat("right").from;
  const dependsAt = n.word("right", "depends");
  const rowAt = ROWS.map((r) => n.word(r.beat, r.word));
  const answerAt = ROWS.map((r) => n.word(r.beat, r.center));
  const moveAt = n.word("spread-in", "move");

  // The histogram narrows to make room for the table.
  const shift = ease(frame, rightFrom - 4, 26);
  const X: XScale = { lo: 0, hi: 114, x0: X0, x1: lerp(X1_WIDE, X1_NARROW, shift) };
  const unit = h(lerp(6.2, 5, shift));
  const base = y(BASE);
  const peak = Math.max(...ORDERS.counts);

  const medX = sx(X, ORDERS.median);
  const meanX = sx(X, ORDERS.mean);
  const markTop = base - peak * unit - h(30);
  const medIn = ease(frame, medianAt - 4, 12);
  const meanIn = ease(frame, meanAt - 4, 12);
  const meanSlide = ease(frame, dragsAt - 4, 18);
  const meanShown = lerp(ORDERS.median, ORDERS.mean, meanSlide);
  const tailDim = ease(frame, rightFrom - 4, 14);

  return (
    <AbsoluteFill>
      {/* ── Sound: the bars, the two markers, each row of the table ── */}
      <Sfx name="el-sprinkle" at={fiveAt - 4} level={-33} />
      <Sfx name="el-tap" at={medianAt - 4} level={-29} />
      <Sfx name="el-whoosh" at={rightFrom - 4} level={-34} />
      {[0, 1, 3].map((i) => (
        <Sfx key={i} name="el-pop" at={rowAt[i] - 4} level={-30} />
      ))}

      {/* ── Headlines ── */}
      <div style={{ position: "absolute", left: 92, top: y(150), display: "flex", gap: "0.26em", ...headline(80) }}>
        <Ink at={ordersFrom - 4} dur={20} out={rightFrom - 6} style={{ position: "relative", whiteSpace: "nowrap" }}>
          Most orders are small.
        </Ink>
        <Ink
          at={dragsAt - 4}
          dur={18}
          out={rightFrom - 6}
          style={{ position: "relative", ...headline(80, true), color: STAT_INK, whiteSpace: "nowrap" }}
        >
          The tail drags the mean.
        </Ink>
      </div>
      <Ink at={rightFrom - 2} dur={20} style={{ left: 92, top: y(150), ...headline(80), whiteSpace: "nowrap" }}>
        Which center, when?
      </Ink>

      <FigLabel n="2" title={`${ORDERS.n} customer orders, in dollars`} at={ordersFrom} x={160} y={y(330)} />

      <Drift from={ordersFrom} to={moveAt + 30} scale={0.018} origin={[X0, base]}>
        <Bars
          counts={ORDERS.counts}
          lo={ORDERS.lo}
          bin={ORDERS.bin}
          scale={X}
          base={base}
          unit={unit}
          gap={lerp(3, 2, shift)}
          grow={(i) => ease(frame, fiveAt - 4 + i * 0.7, 12)}
        />
        <Svg opacity={ease(frame, fiveAt - 6, 14)}>
          <line x1={X.x0} x2={X.x1} y1={base + 0.5} y2={base + 0.5} stroke={INK} strokeWidth={1.6} />
        </Svg>
        {[0, 20, 40, 60, 80, 100].map((v) => (
          <Tag key={v} x={sx(X, v)} y={base + 12} opacity={ease(frame, fiveAt, 14) * (v % 40 === 20 ? 1 - shift : 1)} color={INK_SOFT} size={20}>
            ${v}
          </Tag>
        ))}

        {/* The tail. */}
        <Arrow
          from={[sx(X, 46), base - h(150)]}
          to={[sx(X, 110), base - h(150)]}
          at={tailAt - 4}
          dur={20}
          dim={rightFrom - 6}
          color={INK_SOFT}
          width={2.4}
        />
        <Tag x={sx(X, 46)} y={base - h(150) - 40} opacity={ease(frame, tailAt, 12) * (1 - tailDim)} color={INK_SOFT} size={21} align="left">
          a long tail of big orders
        </Tag>
        <Tag x={sx(X, 12)} y={base - h(150) - 70} opacity={ease(frame, modestAt - 2, 12) * (1 - ease(frame, medianAt - 6, 10))} color={INK_SOFT} size={21}>
          most orders
        </Tag>

        {/* The median, in ink, and the mean, in red, pulled out past it. */}
        {medIn > 0 ? (
          <Svg opacity={medIn}>
            <line x1={medX} x2={medX} y1={markTop} y2={base} stroke={INK} strokeWidth={3.2} strokeLinecap="round" />
          </Svg>
        ) : null}
        <Tag x={medX - 12} y={markTop - 34} opacity={medIn} size={23} bold align="right">
          Median ${fmt(ORDERS.median)}
        </Tag>
        {meanIn > 0 ? (
          <Svg opacity={meanIn}>
            <line x1={sx(X, meanShown)} x2={sx(X, meanShown)} y1={markTop} y2={base} stroke={STAT} strokeWidth={3.6} strokeLinecap="round" />
          </Svg>
        ) : null}
        <Tag x={sx(X, meanShown) + 12} y={markTop - 34} opacity={meanIn} color={STAT_INK} size={23} bold align="left">
          Mean ${fmt(ORDERS.mean)}
        </Tag>
        <Bracket x0={medX} x1={meanX} y={markTop - 8} at={alarmAt - 6} color={STAT} up />
        <Tag x={sx(X, meanShown) + 190} y={markTop - 34} opacity={ease(frame, alarmAt - 2, 12)} color={STAT_INK} size={21} align="left">
          a gap of ${fmt(ORDERS.gap)}: skew
        </Tag>
        <Pulse x={medX} y={markTop} at={leadAt - 2} color={INK} r={6} />
        <Pulse x={medX} y={markTop} at={answerAt[1] - 2} color={INK} r={6} />
      </Drift>

      {/* ── Which center, when: the lesson's rules, a row at a time ── */}
      {ROWS.map((r, i) => {
        const p = ease(frame, rowAt[i] - 6, 16);
        if (p <= 0) return null;
        const top = y(400 + i * 112);
        const now = ease(frame, answerAt[i] - 4, 10) * (i < ROWS.length - 1 ? 1 - ease(frame, rowAt[i + 1] - 6, 12) : 1 - ease(frame, moveAt - 6, 14));
        return (
          <React.Fragment key={r.beat}>
            <div
              style={{
                position: "absolute",
                left: 930,
                top: top - 14,
                width: 900,
                height: 76,
                background: HIGHLIGHT,
                opacity: 0.35 * now,
                borderRadius: 6,
              }}
            />
            <Glyph kind={i} x={960} y={top} p={ease(frame, rowAt[i] - 4, 20)} />
            <div
              style={{
                position: "absolute",
                left: 1080,
                top: top + 2,
                opacity: p,
                transform: `translateX(${(1 - p) * 24}px)`,
                whiteSpace: "nowrap",
                ...body(32),
                color: INK,
              }}
            >
              {r.what}
            </div>
            <div
              style={{
                position: "absolute",
                left: 1530,
                top: top + 6,
                opacity: ease(frame, answerAt[i] - 6, 12),
                whiteSpace: "nowrap",
                ...label(28, r.red ? STAT_INK : INK),
                fontWeight: 700,
                ...halo,
              }}
            >
              <Mark at={answerAt[i] - 2}>{r.answer}</Mark>
            </div>
          </React.Fragment>
        );
      })}
      <Ink at={dependsAt - 4} dur={16} style={{ left: 960, top: y(330), whiteSpace: "nowrap" }}>
        <span style={{ ...label(24, INK), fontWeight: 560 }}>If the data is…</span>
      </Ink>
    </AbsoluteFill>
  );
};
