import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT, HIGHLIGHT, INK, INK_SOFT, fmt, label, note } from "../../editorial/style";
import { Note, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { CHERRY, DUAL, INVERTED, MISSING } from "./data";
import { OK, QuestionCard } from "../../editorial/interview";
import { CATS, Drift, LineSet, Mark, MARK_BAD, PanelTitle, Svg, Verdict, YTicks } from "./parts";

const LEFT = { x0: 220, x1: 800 };
const RIGHT = { x0: 1100, x1: 1680 };
const BASE = 760;
const TOP = 440;
/** Question 10: the decade across the top, two small panels under it. */
const DECADE = { x0: 220, x1: 1680, base: 560, top: 380 };
const SMALL = { base: 820, top: 660 };
/** The indexed panel's one axis: both series start at 100. */
const INDEX = { lo: 80, hi: 280 };

/** A legend's line sample, in a series' ink. */
const Swatch: React.FC<{ color: string }> = ({ color }) => (
  <span style={{ display: "inline-block", width: 26, height: 4, borderRadius: 2, background: color, verticalAlign: "middle", marginRight: 8 }} />
);

/**
 * Questions 9 and 10. Two unrelated series (correlation 0.12) on two y axes,
 * twice, and both are crossed out, because both right-hand axes are
 * arbitrary: fitted to the metric, its noise looks as big as revenue's climb;
 * from zero it lies flat while revenue seems to overtake it, a crossover the
 * axes invented. The right panel then becomes the page's fix: both series
 * indexed to 100 at the start, on one axis. Then three more ways a chart
 * misleads, from the page's own charts: a four-month window up 25% in a decade
 * with no net change, a 61% rise drawn on an inverted axis, and four missing
 * days drawn as zeros, then left as a gap.
 */
export const DualScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("dual").from;
  const qAt = n.word("dual", "Question");
  const textAt = n.word("dual", "What is a dual-axis chart");
  const dualAxisAt = n.word("dual", "dual-axis chart");
  const riskAt = n.word("dual", "the risk");
  const asked = n.beat("dual").to;
  const twoAt = n.word("dual-show", "Two series on two y axes");
  const climbsAt = n.word("dual-show", "revenue that climbs");
  const nothingAt = n.word("dual-show", "a metric that does nothing");
  const corrAt = n.word("dual-show", "point one two");
  const fitAt = n.word("dual-axes", "Fit the right axis tightly");
  const noiseAt = n.word("dual-axes", "noise looks as big");
  const zeroAt = n.word("dual-axes", "Start it at zero");
  const flatAt = n.word("dual-axes", "it lies flat");
  const overtakeAt = n.word("dual-axes", "revenue seems to overtake it");
  const arbitraryAt = n.word("dual-fix", "The scales are arbitrary");
  const indexAt = n.word("dual-index", "Index both series");
  const shareAt = n.word("dual-index", "share one axis");
  const panelsAt = n.word("dual-index", "two aligned panels");
  const q10At = n.word("other", "Question ten");
  const q10TextAt = n.word("other", "What other ways");
  const cherryAt = n.word("other", "A cherry-picked window");
  const decadeAt = n.word("other", "no net change");
  const windowAt = n.word("other", "the four months");
  const upAt = n.word("other", "up twenty-five percent");
  const invertedAt = n.word("other-more", "An inverted axis");
  const fallAt = n.word("other-more", "draws as a fall");
  const zerosAt = n.word("other-more", "filled with zeros");
  const collapseAt = n.word("other-more", "never happened");
  const rangeAt = n.word("other-fix", "show the whole range");
  const gapAt = n.word("other-fix", "leave a gap");
  // The bridge: the two misleading drawings dimmed, the honest ones kept. The
  // page holds its finished state into the cut, which cross-fades.
  const bridgeAt = n.beat("dash-in").from;
  const end = n.beat("dash-in").to;

  const base = y(BASE);
  const top = y(TOP);
  const out9 = q10At - 4;
  // The from-zero panel gives way to the indexed one on "Index both series".
  const outZero = indexAt - 2;
  const dualLine = (x0: number, x1: number, axis: readonly [number, number], at: number, out: number) => (
    <>
      <LineSet values={DUAL.a} x0={x0} x1={x1} base={base} top={top} lo={100} hi={300} at={climbsAt - 2} color={CATS[0]} dots={false} out={out} edges />
      <LineSet values={DUAL.b} x0={x0} x1={x1} base={base} top={top} lo={axis[0]} hi={axis[1]} at={at} color={CATS[3]} dots={false} axis={false} out={out} edges />
    </>
  );

  // Where revenue last crosses above the metric in the from-zero panel: the
  // crossover that panel invents. Pure geometry on the drawn lines.
  const N = DUAL.a.length;
  const above = (i: number) => (DUAL.a[i] - 100) / 200 - DUAL.b[i] / DUAL.zero[1];
  let k = N - 2;
  while (k > 0 && !(above(k) < 0 && above(k + 1) >= 0)) k -= 1;
  const t = above(k) / (above(k) - above(k + 1));
  const crossX = RIGHT.x0 + ((k + t) * (RIGHT.x1 - RIGHT.x0)) / (N - 1);
  const crossY = base - ((DUAL.b[k] + t * (DUAL.b[k + 1] - DUAL.b[k])) / DUAL.zero[1]) * (base - top);
  const ring = ease(frame, overtakeAt + 4, 12) * (1 - ease(frame, outZero, 10));

  // Question 10.
  const C = CHERRY;
  const cx = (i: number) => DECADE.x0 + (i * (DECADE.x1 - DECADE.x0)) / (C.values.length - 1);
  const band = ease(frame, windowAt - 2, 14);
  const zeros = MISSING.values.map((v, i) => (MISSING.outage.includes(i) ? 0 : v));
  const gapped = MISSING.values.map((v, i) => (MISSING.outage.includes(i) ? null : v));
  const miniTop = y(SMALL.top);
  const miniBase = y(SMALL.base);

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={twoAt} level={-34} />
      <Sfx name="el-scratch" at={noiseAt + 4} level={-32} />
      <Sfx name="el-scratch" at={overtakeAt + 4} level={-32} />
      <Sfx name="el-pencil" at={indexAt + 4} level={-34} />
      <Sfx name="el-pop" at={shareAt} level={-32} />
      <Sfx name="el-pencil" at={cherryAt} level={-34} />
      <Sfx name="el-scratch" at={fallAt} level={-32} />
      <Sfx name="el-scratch" at={collapseAt - 4} level={-32} />
      <Sfx name="el-pop" at={gapAt} level={-32} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={9} at={qAt - 4} textAt={textAt - 4} out={out9} size={60}>
          What is a <Mark at={dualAxisAt + 2}>dual-axis chart</Mark>, and what&apos;s{" "}
          <Mark at={riskAt} color={MARK_BAD}>
            the risk
          </Mark>
          ?
        </QuestionCard>
        <QuestionCard n={10} at={q10At} textAt={q10TextAt - 2} size={60}>
          What other ways do charts mislead?
        </QuestionCard>

        {/* ── Question 9: one pair of series, two right-hand axes, both arbitrary ── */}
        <PanelTitle x={LEFT.x0} y={top - h(60)} at={asked - 6} out={out9}>
          Right axis fitted to the metric
        </PanelTitle>
        <YTicks ticks={[100, 200, 300]} x={LEFT.x0} base={base} top={top} lo={100} hi={300} at={twoAt - 2} out={out9} color={CATS[0]} />
        <YTicks ticks={[38, 42, 46]} x={LEFT.x1} side="right" base={base} top={top} lo={DUAL.fitted[0]} hi={DUAL.fitted[1]} at={nothingAt - 4} out={out9} color={CATS[3]} />
        {dualLine(LEFT.x0, LEFT.x1, DUAL.fitted as [number, number], nothingAt - 2, out9)}
        <PanelTitle x={RIGHT.x0} y={top - h(60)} at={zeroAt - 4} out={outZero}>
          Right axis from zero
        </PanelTitle>
        <YTicks ticks={[100, 200, 300]} x={RIGHT.x0} base={base} top={top} lo={100} hi={300} at={zeroAt - 2} out={outZero} color={CATS[0]} />
        <YTicks ticks={[0, 25, 50]} x={RIGHT.x1} side="right" base={base} top={top} lo={DUAL.zero[0]} hi={DUAL.zero[1]} at={zeroAt - 2} out={outZero} color={CATS[3]} />
        {dualLine(RIGHT.x0, RIGHT.x1, DUAL.zero as [number, number], zeroAt, outZero)}
        {ring > 0 ? (
          <Svg>
            <circle cx={crossX} cy={crossY} r={22} fill="none" stroke={ACCENT} strokeWidth={2.6} strokeDasharray="5 5" opacity={ring} />
          </Svg>
        ) : null}
        <div style={{ position: "absolute", left: LEFT.x0, top: base + h(28), ...label(20, INK_SOFT), whiteSpace: "nowrap", opacity: ease(frame, nothingAt, 10) * (1 - ease(frame, out9, 10)) }}>
          <Swatch color={CATS[0]} /> revenue
          <span style={{ display: "inline-block", width: 28 }} />
          <Swatch color={CATS[3]} /> the metric
        </div>
        <Note at={corrAt - 2} x={LEFT.x1 - 220} y={top - h(60)} out={out9}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            correlation <Num>{fmt(DUAL.corr)}</Num>
          </span>
        </Note>
        <Verdict ok={false} x={LEFT.x0} y={base + h(64)} at={noiseAt + 4} out={out9}>
          its noise looks as big as revenue&apos;s climb
        </Verdict>
        <Verdict ok={false} x={RIGHT.x0} y={base + h(64)} at={overtakeAt + 4} out={outZero}>
          flat, and a crossover the axes invented
        </Verdict>
        <Note at={arbitraryAt} x={LEFT.x0} y={base + h(110)} out={out9}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>either right axis is a choice, and so is the story</span>
        </Note>

        {/* The page's fix, in the right panel's place: both indexed to 100, one axis. */}
        <PanelTitle x={RIGHT.x0} y={top - h(60)} at={indexAt + 2} out={out9}>
          Indexed: both start at 100
        </PanelTitle>
        <YTicks ticks={[100, 150, 200, 250]} x={RIGHT.x0} base={base} top={top} lo={INDEX.lo} hi={INDEX.hi} at={indexAt + 4} out={out9} />
        <LineSet values={DUAL.indexed.a} x0={RIGHT.x0} x1={RIGHT.x1} base={base} top={top} lo={INDEX.lo} hi={INDEX.hi} at={indexAt + 4} color={CATS[0]} dots={false} out={out9} edges />
        <LineSet values={DUAL.indexed.b} x0={RIGHT.x0} x1={RIGHT.x1} base={base} top={top} lo={INDEX.lo} hi={INDEX.hi} at={indexAt + 10} color={CATS[3]} dots={false} axis={false} out={out9} edges />
        <Verdict ok x={RIGHT.x0} y={base + h(64)} at={shareAt} out={out9}>
          one axis, nothing to tune
        </Verdict>
        <Note at={panelsAt - 2} x={RIGHT.x0} y={base + h(110)} out={out9}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>or two aligned panels, one axis each</span>
        </Note>

        {/* ── Question 10: a window, an inverted axis, zeros for a gap ── */}
        <PanelTitle x={DECADE.x0} y={y(DECADE.top) - h(56)} at={cherryAt - 4}>
          Ten years, and a four-month window
        </PanelTitle>
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: band }}>
          <rect
            x={cx(C.window.start)}
            y={y(DECADE.top) - 10}
            width={cx(C.window.end) - cx(C.window.start)}
            height={y(DECADE.base) - y(DECADE.top) + 10}
            fill={HIGHLIGHT}
          />
        </svg>
        <LineSet values={C.values} x0={DECADE.x0} x1={DECADE.x1} base={y(DECADE.base)} top={y(DECADE.top)} lo={70} hi={120} at={cherryAt - 2} color={CATS[0]} dots={false} width={2.6} edges />
        <Note at={decadeAt - 2} x={DECADE.x1 - 320} y={y(DECADE.top) - h(56)}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            <Mark at={rangeAt}>
              the decade: <Num>{C.decadePct}%</Num> net change
            </Mark>
          </span>
        </Note>
        <Note at={upAt - 2} x={cx(C.window.end) + 16} y={y(DECADE.top) - h(4)}>
          <span style={{ ...note(24, INK), fontWeight: 650, whiteSpace: "nowrap" }}>
            the window: up <Num>{C.windowPct}%</Num>
          </span>
        </Note>

        <PanelTitle x={LEFT.x0} y={miniTop - h(48)} at={invertedAt - 4}>
          An inverted axis
        </PanelTitle>
        <YTicks ticks={[900, 650, 400]} x={LEFT.x0} base={miniBase} top={miniTop} lo={900} hi={400} at={invertedAt - 2} />
        <LineSet
          values={INVERTED.values}
          x0={LEFT.x0}
          x1={LEFT.x1}
          base={miniBase}
          top={miniTop}
          lo={INVERTED.domain[1]}
          hi={INVERTED.domain[0]}
          at={invertedAt}
          dim={bridgeAt + 14}
          color={ACCENT}
          labels={INVERTED.years.map((yr, i) => (i % 2 ? "" : String(yr)))}
        />
        <Verdict ok={false} x={LEFT.x1 + 10} y={miniTop + h(10)} at={fallAt}>
          a {INVERTED.risePct}% rise
        </Verdict>

        <PanelTitle x={RIGHT.x0} y={miniTop - h(48)} at={zerosAt - 4}>
          Four missing days, as zeros
        </PanelTitle>
        <LineSet values={zeros} x0={RIGHT.x0} x1={RIGHT.x1} base={miniBase} top={miniTop} lo={0} hi={80} at={zerosAt - 2} color={ACCENT} dots={false} width={2.4} edges dim={bridgeAt + 4} />
        <LineSet values={gapped} x0={RIGHT.x0} x1={RIGHT.x1} base={miniBase} top={miniTop} lo={0} hi={80} at={gapAt - 2} color={OK} dots={false} axis={false} width={2.8} edges />
        <Verdict ok={false} x={RIGHT.x0} y={miniBase + h(14)} at={collapseAt - 6}>
          a collapse that never happened
        </Verdict>
        <Verdict ok x={RIGHT.x0} y={miniBase + h(54)} at={gapAt + 6}>
          a gap, not a zero
        </Verdict>
      </Drift>
    </AbsoluteFill>
  );
};
