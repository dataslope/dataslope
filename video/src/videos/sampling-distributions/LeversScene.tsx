import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Illustration } from "../../components/Illustration";
import { bob, ease, pop } from "../../components/motion";
import { useNarration } from "../../narration/NarrationContext";
import { Axis, Bars, sx, type XScale } from "../../editorial/charts";
import { useLayout } from "../../editorial/layout";
import {
  ACCENT,
  ACCENT_INK,
  body,
  fmt,
  HAIRLINE,
  halo,
  headline,
  HIGHLIGHT,
  INK,
  INK_SOFT,
  label,
  note,
} from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { BIGGER, ILLUSTRATIONS, MORE, peak, type LeverRow, VIDEO } from "./data";
import { blend, Bracket, money } from "./parts";

const BASE = 600;
const HEIGHT = 220;
const TICKS = [30, 40, 50, 60, 70];
const LEFT: XScale = { lo: 30, hi: 70, x0: 150, x1: 870 };
const RIGHT: XScale = { lo: 30, hi: 70, x0: 1080, x1: 1800 };
const TABLE_TOP = 664;
const ROW_STEP = 48;
/** Where a bell is one standard deviation wide, as a share of its peak. */
const AT_SD = Math.exp(-0.5);

/** Each state's bars, scaled to its own peak: the panels compare widths and
 *  smoothness, not heights. */
const heights = (r: LeverRow) => r.hist.counts.map((c) => (c / peak(r.hist)) * HEIGHT);

type PanelSpec = {
  rows: readonly LeverRow[];
  scale: XScale;
  /** The frame each state arrives on. */
  times: readonly number[];
  /** The column that changes, and how to print it. */
  head: string;
  value: (r: LeverRow) => string;
};

/**
 * The trap: two ways to get "more data". More samples of forty only smooth
 * the histogram; bigger samples narrow it. Every bar is from the lesson's
 * seed-1 block, and the spreads are its printout.
 */
export const LeversScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = useNarration();
  const { y } = useLayout();

  const trapFrom = n.beat("trap").from;
  const waysAt = n.word("trap", "two ways");
  const moreSamplesAt = n.word("trap", "more samples");
  const biggerOnesAt = n.word("trap", "bigger");
  const fiveHundredAt = n.word("more", "five hundred");
  const thirtyTwoAt = n.word("more", "thirty-two thousand");
  const staysAt = n.word("more", "stays");
  const tenAt = n.word("bigger", "ten");
  const sixFortyAt = n.word("bigger", "six hundred and forty");
  const fallsAt = n.word("bigger", "falls");
  const realAt = n.word("real", "real");
  const leverAt = n.word("real", "lever");

  const between = (a: number, b: number) => [a, a + (b - a) / 3, a + (2 * (b - a)) / 3, b];
  const more: PanelSpec = {
    rows: MORE,
    scale: LEFT,
    times: [moreSamplesAt, ...between(fiveHundredAt + 4, thirtyTwoAt).slice(1)],
    head: "Samples drawn",
    value: (r) => r.samples.toLocaleString("en-US"),
  };
  const bigger: PanelSpec = {
    rows: BIGGER,
    scale: RIGHT,
    times: [biggerOnesAt, ...between(tenAt + 4, sixFortyAt).slice(1)],
    head: "Customers per sample",
    value: (r) => String(r.n),
  };

  const dimLeft = ease(frame, realAt - 2, 14);

  return (
    <AbsoluteFill>
      <Ink at={trapFrom - 12} dur={20} style={{ left: 112, top: y(112), ...headline(64), whiteSpace: "nowrap" }}>
        Two ways to get more data.
      </Ink>
      <Ink
        at={waysAt + 6}
        dur={18}
        style={{ left: 112, top: y(188), ...headline(64, true), color: ACCENT_INK, whiteSpace: "nowrap" }}
      >
        Only one narrows the spread.
      </Ink>
      {ILLUSTRATIONS ? <Levers at={waysAt} fps={fps} /> : null}

      <div style={{ opacity: 1 - dimLeft * 0.7 }}>
        <FigLabel n="5" title="More samples, 40 customers each" at={trapFrom} x={LEFT.x0} y={y(300)} />
        <Panel spec={more} hold={staysAt} axisAt={trapFrom + 2} />
      </div>
      <FigLabel n="6" title="Bigger samples, 4,000 of them" at={trapFrom + 8} x={RIGHT.x0} y={y(300)} />
      <Panel spec={bigger} hold={fallsAt} axisAt={trapFrom + 10} />

      {/* In real life there is one sample: the left lever is not there. */}
      <Note at={realAt} x={LEFT.x0 + 470} y={y(372)} width={260}>
        <span style={{ ...body(30, true), color: INK }}>In real life, you get one sample.</span>
      </Note>
      <Note at={leverAt - 2} x={RIGHT.x0} y={y(372)} width={290}>
        <span style={{ ...body(30, true), color: INK }}>Its size is the lever you control.</span>
      </Note>
    </AbsoluteFill>
  );
};

/** One lever: the histogram stepping through its four states, the spread's
 *  bracket following it, and the lesson's printout building underneath. */
const Panel: React.FC<{ spec: PanelSpec; hold: number; axisAt: number }> = ({ spec, hold, axisAt }) => {
  const frame = useCurrentFrame();
  const { y, h } = useLayout();
  const { rows, scale, times } = spec;
  const i = Math.max(0, times.filter((t) => frame >= t).length - 1);
  const t = i === 0 ? 1 : ease(frame, times[i], 8);
  const from = heights(rows[Math.max(0, i - 1)]);
  const to = heights(rows[i]);
  const bars = blend(from, to, t);
  const grow = ease(frame, times[0] - 2, 16);
  const sd = rows[Math.max(0, i - 1)].sd + (rows[i].sd - rows[Math.max(0, i - 1)].sd) * t;
  const center = rows[Math.max(0, i - 1)].mean + (rows[i].mean - rows[Math.max(0, i - 1)].mean) * t;
  const bracketY = y(BASE - HEIGHT * AT_SD);
  const all = ease(frame, hold - 2, 12);
  const colB = scale.x0 + 300;
  const tableW = 560;
  return (
    <>
      <Axis scale={scale} base={y(BASE)} ticks={TICKS} format={money} at={axisAt} />
      <Bars
        counts={bars}
        lo={scale.lo}
        bin={rows[i].hist.bin}
        scale={scale}
        base={y(BASE)}
        unit={h(1)}
        color={ACCENT}
        gap={1.5}
        grow={() => grow}
      />
      <Bracket
        x0={sx(scale, center - sd)}
        x1={sx(scale, center + sd)}
        y={bracketY}
        at={times[0] + 4}
        color={INK}
        width={2.6}
      />
      <Note at={times[0] + 8} x={sx(scale, center + sd) + 14} y={bracketY - 15}>
        <span style={{ ...note(24, ACCENT_INK), fontWeight: 700, ...halo, whiteSpace: "nowrap" }}>± ${fmt(rows[i].sd)}</span>
      </Note>

      {/* The printout, a row per state. */}
      <Ink at={times[0]} dur={12} style={{ left: scale.x0, top: y(TABLE_TOP), width: tableW }}>
        <div style={{ position: "relative", height: 30, whiteSpace: "nowrap" }}>
          <span style={{ ...label(20, INK_SOFT), position: "absolute", left: 0 }}>{spec.head}</span>
          <span style={{ ...label(20, INK_SOFT), position: "absolute", left: colB - scale.x0 }}>Spread of the averages</span>
        </div>
        <div style={{ height: 1.5, background: INK }} />
      </Ink>
      {rows.map((r, j) => {
        const top = TABLE_TOP + 40 + j * ROW_STEP;
        const rowIn = ease(frame, times[j], 10);
        const current = j === i ? 1 : 0;
        const mark = Math.max(current * ease(frame, times[j], 8), all);
        return (
          <React.Fragment key={j}>
            <div
              style={{
                position: "absolute",
                left: scale.x0,
                top: y(top),
                width: tableW,
                height: h(ROW_STEP),
                borderBottom: `1px solid ${HAIRLINE}`,
                opacity: rowIn,
              }}
            />
            <div
              style={{
                position: "absolute",
                left: colB - 8,
                top: y(top) + 6,
                width: 120 * mark,
                height: 36,
                background: HIGHLIGHT,
                opacity: rowIn,
              }}
            />
            <div style={{ position: "absolute", left: scale.x0, top: y(top) + 2, opacity: rowIn, ...headline(36) }}>
              {spec.value(r)}
            </div>
            <div
              style={{
                position: "absolute",
                left: colB,
                top: y(top) + 2,
                opacity: rowIn,
                ...headline(36),
                color: ACCENT_INK,
                fontVariantNumeric: "tabular-nums lining-nums",
              }}
            >
              {fmt(r.sd)}
            </div>
          </React.Fragment>
        );
      })}
    </>
  );
};

/** Two levers on one base, beside the headline. */
const Levers: React.FC<{ at: number; fps: number }> = ({ at, fps }) => {
  const frame = useCurrentFrame();
  const { y } = useLayout();
  const p = pop(frame, at - 6, fps, 16);
  return (
    <Illustration
      video={VIDEO}
      id="sampling-distributions-levers"
      style={{
        position: "absolute",
        left: 1560,
        top: y(96),
        width: 240,
        height: 240,
        opacity: p,
        transform: `translateY(${bob(frame, 4, 120) + (1 - p) * 30}px)`,
      }}
    />
  );
};
