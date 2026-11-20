import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { RapidFire, type RapidItem, Tick } from "../../editorial/interview";
import { type Layout, useLayout } from "../../editorial/layout";
import { ACCENT_INK, BLUE_INK, HAIRLINE, HIGHLIGHT, INK, INK_SOFT, label, note, svgText } from "../../editorial/style";
import { ColumnRule, Ink, NextLine, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { MONO } from "../../theme/fonts";
import { METRICFLOW_YAML } from "./data";
import { Cross, Drift, Flow, Headline, Kicker, Listing, Mono, Node, noteLine, OK_INK, Spot, Svg, X0 } from "./parts";

const R_X = 820;
const LIST_TOP = 320;
const ROW = 50;
const BODY_Y = 320;

type Ctx = { w: (beat: string, phrase: string) => number; y: Layout["y"]; h: Layout["h"] };

/** A line of the answer, inking in on its cue. */
const Line: React.FC<{ at: number; x?: number; top: number; size?: number; color?: string; bold?: boolean; children: React.ReactNode }> = ({
  at,
  x = R_X,
  top,
  size = 24,
  color = INK,
  bold,
  children,
}) => (
  <Ink at={at} dur={12} style={{ left: x, top }}>
    <span style={{ ...noteLine(size, color), fontWeight: bold ? 600 : 500 }}>{children}</span>
  </Ink>
);

// ── 9. A single source of truth ─────────────────────────────────────────────

const Truth: React.FC<{ c: Ctx; unifyAt: number }> = ({ c, unifyAt }) => {
  const frame = useCurrentFrame();
  const unify = ease(frame, unifyAt, 14);
  const withoutAt = c.w("r-truth", "Without one");
  const reimplAt = c.w("r-truth", "re-implements revenue slightly differently");
  const oneAt = c.w("r-truth", "One definition means");
  const placeAt = c.w("r-truth", "one place to change it");
  const sameAt = c.w("r-truth", "the same answer everywhere");
  const versionedAt = c.w("r-truth", "versioned code instead of tribal knowledge");
  const top = c.y(BODY_Y);
  const tools = [
    { name: "Dashboard", sql: "SUM(amount)" },
    { name: "Notebook", sql: "SUM(amount - tax)" },
    { name: "Dashboard", sql: "SUM(amount - refunds)" },
  ];
  return (
    <>
      <Line at={withoutAt} top={top}>
        Without one, each tool writes its own revenue
      </Line>
      {tools.map((t, i) => (
        <Node
          key={i}
          x={R_X + i * 330}
          y={top + c.h(56)}
          w={290}
          h={c.h(84)}
          at={reimplAt + i * 5}
          title={t.name}
          sub={
            <span style={{ position: "relative", display: "inline-block", fontFamily: MONO, fontSize: 19 }}>
              <span style={{ color: i ? ACCENT_INK : INK, opacity: 1 - unify }}>{t.sql}</span>
              {/* Once said, the one definition replaces all three. */}
              <span style={{ position: "absolute", left: 0, right: 0, top: 0, textAlign: "center", color: OK_INK, opacity: unify }}>{tools[0].sql}</span>
            </span>
          }
          size={22}
          tone="plain"
          toneTo="ok"
          toneAt={unifyAt + 4}
        />
      ))}
      <Line at={oneAt} top={top + c.h(186)} color={OK_INK} bold>
        One definition:
      </Line>
      <Line at={placeAt} top={top + c.h(232)}>
        one place to change it
      </Line>
      <Line at={sameAt} top={top + c.h(274)}>
        the same answer everywhere
      </Line>
      <Line at={versionedAt} top={top + c.h(316)}>
        versioned code, not tribal knowledge
      </Line>
    </>
  );
};

// ── 10. Metric drift ────────────────────────────────────────────────────────

const Drifting: React.FC<{ c: Ctx }> = ({ c }) => {
  const meanAt = c.w("r-drift", "one metric slowly coming to mean different things");
  const copiesAt = c.w("r-drift", "as copies of its logic spread and mutate");
  const defineAt = c.w("r-drift", "Define it once");
  const reviewAt = c.w("r-drift", "under version control and review");
  const pointAt = c.w("r-drift", "point every consumer at that");
  const top = c.y(BODY_Y);
  const chain = [
    { sql: "SUM(amount)", w: 190, bad: false },
    { sql: "SUM(amount)", w: 190, bad: false },
    { sql: "SUM(amount - tax)", w: 250, bad: true },
    { sql: "SUM(net)", w: 160, bad: true },
  ];
  const xs = chain.map((_, i) => R_X + chain.slice(0, i).reduce((s, k) => s + k.w + 56, 0));
  const chipTop = top + c.h(62);
  const chipH = c.h(56);
  return (
    <>
      <Line at={meanAt} top={top}>
        One metric, different meanings in different places
      </Line>
      {chain.map((k, i) => (
        <React.Fragment key={i}>
          <Node x={xs[i]} y={chipTop} w={k.w} h={chipH} at={copiesAt + i * 6} title={k.sql} mono size={20} tone={k.bad ? "bad" : "plain"} />
          {i > 0 ? <Flow points={[[xs[i] - 50, chipTop + chipH / 2], [xs[i] - 8, chipTop + chipH / 2]]} at={copiesAt + i * 6 - 3} dur={8} /> : null}
        </React.Fragment>
      ))}
      <Line at={c.w("r-drift", "spread and mutate")} top={chipTop + chipH + c.h(14)} size={21} color={INK_SOFT}>
        each copy, edited on its own
      </Line>
      <Line at={defineAt} top={top + c.h(220)} color={OK_INK} bold>
        Define it once
      </Line>
      <Line at={reviewAt} top={top + c.h(262)}>
        under version control and review
      </Line>
      <Line at={pointAt} top={top + c.h(304)}>
        and point every consumer at it
      </Line>
    </>
  );
};

// ── 11. The dbt Semantic Layer and MetricFlow ───────────────────────────────

const MetricFlow: React.FC<{ c: Ctx }> = ({ c }) => {
  const yamlAt = c.w("r-metricflow", "Semantic models and metrics");
  const besideAt = c.w("r-metricflow", "beside the dbt project");
  const compilerAt = c.w("r-metricflow", "the layer's query compiler");
  const requestAt = c.w("r-metricflow", "a request for a metric by a dimension");
  const sqlAt = c.w("r-metricflow", "into warehouse SQL");
  const apiAt = c.w("r-metricflow", "through an API");
  const top = c.y(BODY_Y);
  const x = 790;
  const flowTop = top + c.h(300);
  const boxH = c.h(58);
  return (
    <>
      <Listing
        lines={METRICFLOW_YAML}
        x={x}
        top={top}
        width={1034}
        size={19}
        at={yamlAt - 2}
        yaml
        marks={[
          { line: "name: completed_revenue", text: "completed_revenue", at: besideAt },
          { line: "measure: order_amount", text: "order_amount", at: besideAt + 10 },
        ]}
      />
      <Ink at={requestAt} dur={12} style={{ left: x, top: flowTop + boxH / 2 - 15 }}>
        <span style={noteLine(22, INK)}>metric by dimension</span>
      </Ink>
      <Flow points={[[x + 230, flowTop + boxH / 2], [x + 300, flowTop + boxH / 2]]} at={requestAt + 6} dur={8} />
      <Node x={x + 312} y={flowTop} w={210} h={boxH} at={compilerAt} title="MetricFlow" size={23} />
      <Flow points={[[x + 534, flowTop + boxH / 2], [x + 604, flowTop + boxH / 2]]} at={sqlAt} dur={8} />
      <Ink at={sqlAt + 4} dur={12} style={{ left: x + 616, top: flowTop + boxH / 2 - 15 }}>
        <span style={noteLine(22, BLUE_INK)}>warehouse SQL</span>
      </Ink>
      <Line at={apiAt} x={x} top={flowTop + boxH + c.h(30)} size={22} color={INK_SOFT}>
        BI tools ask for it through an API
      </Line>
    </>
  );
};

// ── 12. LookML ──────────────────────────────────────────────────────────────

const LookMl: React.FC<{ c: Ctx }> = ({ c }) => {
  const langAt = c.w("r-lookml", "LookML is the modeling language of Looker");
  const viewsAt = c.w("r-lookml", "dimensions and measures in views");
  const exploresAt = c.w("r-lookml", "joins in explores");
  const writesAt = c.w("r-lookml", "Looker writes the SQL");
  const earlyAt = c.w("r-lookml", "an early, influential semantic layer");
  const top = c.y(BODY_Y);
  const boxTop = top + c.h(60);
  const boxH = c.h(96);
  return (
    <>
      <Line at={langAt} top={top}>
        LookML: Looker&rsquo;s modeling language
      </Line>
      <Node x={R_X} y={boxTop} w={360} h={boxH} at={viewsAt} title={<Mono>view</Mono>} sub="dimensions, measures" size={24} />
      <Node x={R_X + 420} y={boxTop} w={360} h={boxH} at={exploresAt} title={<Mono>explore</Mono>} sub="joins" size={24} />
      <Line at={writesAt} top={boxTop + boxH + c.h(40)}>
        Looker writes the SQL from what a user picks
      </Line>
      <Line at={earlyAt} top={boxTop + boxH + c.h(84)} color={INK_SOFT} size={22}>
        An early, influential semantic layer
      </Line>
    </>
  );
};

// ── 13. Measure and metric ──────────────────────────────────────────────────

const MeasureMetric: React.FC<{ c: Ctx }> = ({ c }) => {
  const measureAt = c.w("r-measure", "A measure is a raw aggregate");
  const sumAt = c.w("r-measure", "like the sum of amount");
  const metricAt = c.w("r-measure", "A metric is the business number");
  const logicAt = c.w("r-measure", "with filters, ratios or time logic");
  const completedAt = c.w("r-measure", "like completed revenue");
  const top = c.y(BODY_Y);
  const col2 = R_X + 480;
  return (
    <>
      <Line at={measureAt} top={top} size={28} bold>
        Measure
      </Line>
      <Line at={measureAt + 6} top={top + c.h(48)} color={INK_SOFT} size={22}>
        a raw aggregate on one table
      </Line>
      <Ink at={sumAt} dur={12} style={{ left: R_X, top: top + c.h(100) }}>
        <span style={{ fontFamily: MONO, fontSize: 26, color: BLUE_INK, fontWeight: 500 }}>SUM(amount)</span>
      </Ink>
      <ColumnRule x={col2 - 40} top={top + 4} height={c.h(150)} at={metricAt} />
      <Line at={metricAt} x={col2} top={top} size={28} bold>
        Metric
      </Line>
      <Line at={metricAt + 6} x={col2} top={top + c.h(48)} color={INK_SOFT} size={22}>
        built from measures
      </Line>
      <Line at={logicAt} x={col2} top={top + c.h(84)} color={INK_SOFT} size={22}>
        with filters, ratios or time logic
      </Line>
      <Line at={completedAt} x={col2} top={top + c.h(130)} size={26} bold>
        completed revenue
      </Line>
    </>
  );
};

// ── 14. What a metric definition contains ───────────────────────────────────

const Contains: React.FC<{ c: Ctx }> = ({ c }) => {
  const parts = [
    { text: "The aggregation", at: c.w("r-contains", "The aggregation") },
    { text: "The entity and grain it lives on", at: c.w("r-contains", "the entity and grain") },
    { text: "The dimensions it can be sliced by", at: c.w("r-contains", "the dimensions it can be sliced by") },
    { text: "Its filters", at: c.w("r-contains", "its filters") },
    { text: "Its time grain", at: c.w("r-contains", "its time grain") },
  ];
  const ratioAt = c.w("r-contains", "A ratio adds a numerator and a denominator");
  const top = c.y(BODY_Y);
  return (
    <>
      {parts.map((p, i) => (
        <Ink key={p.text} at={p.at - 2} dur={12} style={{ left: R_X, top: top + i * c.h(46) }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 24 }}>
            <Tick at={p.at + 4} size={24} />
            <span style={noteLine(24, INK)}>{p.text}</span>
          </div>
        </Ink>
      ))}
      <Line at={ratioAt} top={top + 5 * c.h(46) + c.h(24)} color={BLUE_INK}>
        A ratio adds a numerator and a denominator
      </Line>
    </>
  );
};

// ── 15. Additive, semi-additive, non-additive ───────────────────────────────

const Additive: React.FC<{ c: Ctx }> = ({ c }) => {
  const revenueAt = c.w("r-additive", "Revenue sums across everything");
  const balanceAt = c.w("r-additive", "An account balance sums across accounts");
  const monthsAt = c.w("r-additive", "but not across months");
  const latestAt = c.w("r-additive", "take the latest, or the average");
  const ratiosAt = c.w("r-additive", "Ratios and distinct counts never sum");
  const recomputeAt = c.w("r-additive", "recompute them from the rows");
  const top = c.y(BODY_Y);
  const colA = R_X + 330;
  const colB = R_X + 510;
  const rowTop = (i: number) => top + c.h(56) + i * c.h(92);
  const rows = [
    { name: "Revenue", kind: "additive", a: true, b: true, at: revenueAt, bAt: revenueAt + 8, note: "", noteAt: 0 },
    { name: "An account balance", kind: "semi-additive", a: true, b: false, at: balanceAt, bAt: monthsAt, note: "take the latest, or the average", noteAt: latestAt },
    { name: "Ratios, distinct counts", kind: "non-additive", a: false, b: false, at: ratiosAt, bAt: ratiosAt + 8, note: "recompute from the rows", noteAt: recomputeAt },
  ];
  return (
    <>
      <Line at={revenueAt - 6} x={colA - 30} top={top} size={21} color={INK_SOFT}>
        across dimensions
      </Line>
      <Line at={revenueAt - 6} x={colB + 10} top={top} size={21} color={INK_SOFT}>
        across time
      </Line>
      {rows.map((r, i) => (
        <React.Fragment key={r.name}>
          <Ink at={r.at - 2} dur={12} style={{ left: R_X, top: rowTop(i) }}>
            <div style={noteLine(24, INK)}>{r.name}</div>
            <div style={{ ...noteLine(21, INK_SOFT), marginTop: 6 }}>{r.kind}</div>
          </Ink>
          <div style={{ position: "absolute", left: colA + 40, top: rowTop(i) + 4 }}>{r.a ? <Tick at={r.at + 4} size={28} /> : <Cross at={r.at + 4} size={26} />}</div>
          <div style={{ position: "absolute", left: colB + 50, top: rowTop(i) + 4 }}>{r.b ? <Tick at={r.bAt + 4} size={28} /> : <Cross at={r.bAt + 4} size={26} />}</div>
          {r.note ? (
            <Line at={r.noteAt} x={colB + 104} top={rowTop(i) + 2} size={21} color={INK_SOFT}>
              {r.note}
            </Line>
          ) : null}
        </React.Fragment>
      ))}
    </>
  );
};

// ── 16. Governance ──────────────────────────────────────────────────────────

const Governance: React.FC<{ c: Ctx }> = ({ c }) => {
  const parts = [
    { text: "An owner for each metric", at: c.w("r-governance", "An owner for each metric") },
    { text: "Code review on every change", at: c.w("r-governance", "code review on every change") },
    { text: "Certification of the trusted ones", at: c.w("r-governance", "certification of the trusted ones") },
    { text: "Documented meaning and lineage", at: c.w("r-governance", "documented meaning and lineage") },
    { text: "Access controls", at: c.w("r-governance", "access controls") },
  ];
  const top = c.y(BODY_Y);
  const stampW = 170;
  return (
    <>
      {parts.map((p, i) => (
        <Ink key={p.text} at={p.at - 2} dur={12} style={{ left: R_X, top: top + i * c.h(50) }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 24 }}>
            <Tick at={p.at + 4} size={24} />
            <span style={noteLine(24, INK)}>{p.text}</span>
          </div>
        </Ink>
      ))}
      <Spot art="stamp" at={parts[2].at} left={1460} top={top + c.h(20)} width={stampW} />
      <Sfx name="el-pop" at={parts[2].at} level={-30} />
    </>
  );
};

// ── 17. Cumulative and time-window metrics ──────────────────────────────────

const Cumulative: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const trailingAt = c.w("r-cumulative", "It aggregates over a trailing window");
  const rollingAt = c.w("r-cumulative", "rolling twenty-eight-day active users");
  const mtdAt = c.w("r-cumulative", "month-to-date revenue");
  const subtlyAt = c.w("r-cumulative", "easy to get subtly different by hand");
  const onceAt = c.w("r-cumulative", "define the grain and the window once");
  const top = c.y(BODY_Y);
  const axisY = top + c.h(170);
  const DAYS = 60;
  const px = 960 / DAYS;
  const slide = ease(frame, rollingAt, 150);
  const start = Math.round(slide * (DAYS - 28));
  const winX = R_X + start * px;
  return (
    <>
      <Line at={trailingAt} top={top}>
        A trailing window, not a single period
      </Line>
      <Svg opacity={ease(frame, trailingAt + 4, 12)}>
        <rect x={winX} y={axisY - c.h(46)} width={28 * px} height={c.h(46)} fill={HIGHLIGHT} opacity={ease(frame, rollingAt, 10)} />
        <line x1={R_X} y1={axisY} x2={R_X + 960} y2={axisY} stroke={INK} strokeWidth={1.5} />
        {Array.from({ length: DAYS + 1 }, (_, i) => (
          <line key={i} x1={R_X + i * px} y1={axisY} x2={R_X + i * px} y2={axisY - (i % 7 === 0 ? 14 : 7)} stroke={INK_SOFT} strokeWidth={1.2} />
        ))}
        <text x={winX + 14 * px} y={axisY - c.h(58)} textAnchor="middle" style={svgText(label(21, INK))} opacity={ease(frame, rollingAt + 4, 10)}>
          28 days
        </text>
        <text x={R_X + 960} y={axisY + 30} textAnchor="end" style={svgText(note(20, INK_SOFT))}>
          day
        </text>
      </Svg>
      <Line at={rollingAt} top={axisY + c.h(50)} color={BLUE_INK}>
        rolling 28-day active users
      </Line>
      <Line at={mtdAt} top={axisY + c.h(92)} color={BLUE_INK}>
        month-to-date revenue
      </Line>
      <Line at={subtlyAt} top={axisY + c.h(146)} color={INK_SOFT} size={22}>
        Easy to get subtly different by hand
      </Line>
      <Line at={onceAt} top={axisY + c.h(188)} color={OK_INK} bold>
        Define the grain and the window once
      </Line>
    </>
  );
};

// ── 18. A wide mart, or the semantic layer ──────────────────────────────────

const Wide: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const heavyAt = c.w("r-wide", "For a heavy BI workload");
  const dynamicAt = c.w("r-wide", "a tool that struggles with dynamic joins");
  const fastAt = c.w("r-wide", "reads are fast and predictable");
  const costsAt = c.w("r-wide", "It costs flexibility and storage");
  const governedAt = c.w("r-wide", "its logic must still come from the governed definitions");
  const driftAt = c.w("r-wide", "one more place to drift");
  const top = c.y(BODY_Y);
  const cols = ["order_id", "date", "customer", "region", "status", "amount", "units", "…"];
  const colW = 118;
  const gridTop = top + c.h(4);
  const headH = c.h(40);
  const gridH = c.h(120);
  const gridW = cols.length * colW;
  return (
    <>
      <Svg opacity={ease(frame, heavyAt, 12)}>
        <rect x={R_X} y={gridTop} width={gridW} height={gridH} fill="none" stroke={INK} strokeWidth={2} rx={6} />
        <line x1={R_X} y1={gridTop + headH} x2={R_X + gridW} y2={gridTop + headH} stroke={INK} strokeWidth={1.2} />
        {cols.map((name, i) => (
          <React.Fragment key={name}>
            {i > 0 ? <line x1={R_X + i * colW} y1={gridTop} x2={R_X + i * colW} y2={gridTop + gridH} stroke={HAIRLINE} strokeWidth={1} /> : null}
            <text x={R_X + i * colW + colW / 2} y={gridTop + headH / 2 + 7} textAnchor="middle" style={svgText({ ...note(19, INK_SOFT), fontFamily: MONO })}>
              {name}
            </text>
          </React.Fragment>
        ))}
        {[1, 2].map((r) => (
          <line key={r} x1={R_X} y1={gridTop + headH + r * c.h(27)} x2={R_X + gridW} y2={gridTop + headH + r * c.h(27)} stroke={HAIRLINE} strokeWidth={1} opacity={0.5} />
        ))}
      </Svg>
      <Line at={heavyAt + 4} top={gridTop + gridH + c.h(14)} size={21} color={INK_SOFT}>
        one wide, pre-joined table
      </Line>
      <Line at={heavyAt} top={gridTop + gridH + c.h(66)}>
        For a heavy BI workload
        <span style={{ opacity: ease(frame, dynamicAt, 10) }}>, or a tool weak at dynamic joins</span>
      </Line>
      <Line at={fastAt} top={gridTop + gridH + c.h(110)} color={OK_INK} bold>
        Fast, predictable reads
      </Line>
      <Line at={costsAt} top={gridTop + gridH + c.h(162)} color={INK_SOFT}>
        It costs flexibility and storage
      </Line>
      <Line at={governedAt} top={gridTop + gridH + c.h(206)}>
        Its logic still comes from the governed definitions
      </Line>
      <Line at={driftAt} top={gridTop + gridH + c.h(248)} color={ACCENT_INK}>
        or it is one more place to drift
      </Line>
    </>
  );
};

/**
 * The quick round: ten questions down the left, each read as "Question n."
 * and its question, each answer's key fact on the right while it is read;
 * then the bridge into Part 9, the pelican back on the page.
 */
export const RapidScene: React.FC = () => {
  const n = useNarration();
  const { y, h } = useLayout();
  const c: Ctx = { w: n.word, y, h };

  const from = n.beat("rapid-in").from;
  const tenAt = n.word("rapid-in", "Ten quick ones");
  const finishAt = n.word("rapid-in", "to finish");
  const end = n.beat("next").from - 4;
  const peopleAt = n.word("next", "written for people reading dashboards");
  const modelAt = n.word("next", "Now the reader is a language model");
  const nextAt = n.word("next", "Next:");

  const items: RapidItem[] = [
    { n: 9, label: "Why one source of truth?", at: n.word("r-truth", "Why does a single source of truth"), body: <Truth c={c} unifyAt={n.beat("r-truth").to} /> },
    { n: 10, label: "Metric drift, and preventing it", at: n.word("r-drift", "What is metric drift"), body: <Drifting c={c} /> },
    { n: 11, label: "The dbt Semantic Layer, MetricFlow", at: n.word("r-metricflow", "What is the dbt Semantic Layer"), body: <MetricFlow c={c} /> },
    { n: 12, label: "LookML and Looker", at: n.word("r-lookml", "What is LookML"), body: <LookMl c={c} /> },
    { n: 13, label: "Measure or metric", at: n.word("r-measure", "What is the difference between a measure and a metric"), body: <MeasureMetric c={c} /> },
    { n: 14, label: "What a metric definition holds", at: n.word("r-contains", "What does a metric definition contain"), body: <Contains c={c} /> },
    { n: 15, label: "Additive, semi-, non-additive", at: n.word("r-additive", "What is the difference between additive"), body: <Additive c={c} /> },
    { n: 16, label: "Governance", at: n.word("r-governance", "What is governance"), body: <Governance c={c} /> },
    { n: 17, label: "Cumulative, time-window metrics", at: n.word("r-cumulative", "What is a cumulative"), body: <Cumulative c={c} /> },
    { n: 18, label: "A wide mart, or the layer", at: n.word("r-wide", "When is a wide"), body: <Wide c={c} /> },
  ];
  const heroW = 280;

  return (
    <AbsoluteFill>
      <Sfx name="el-chime" at={tenAt} level={-32} />
      {items.map((it) => (
        <Sfx key={it.n} name="el-tap" at={it.at} level={-32} />
      ))}
      <Sfx name="el-pop" at={modelAt} level={-30} />
      <Sfx name="el-pencil" at={nextAt} level={-34} />

      <Drift from={from} to={n.beat("next").to + 40}>
        <Kicker at={tenAt - 4}>Quick round</Kicker>
        <Headline lead="Ten quick ones" turn="to finish." at={tenAt - 2} turnAt={finishAt} size={64} />
        <RapidFire items={items} x={X0} top={y(LIST_TOP)} rowH={h(ROW)} width={620} at={tenAt + 6} end={end} />

        {/* ── The bridge ── */}
        <Note at={peopleAt} x={R_X} y={y(BODY_Y)}>
          <span style={noteLine(26, INK)}>Written for people reading dashboards</span>
        </Note>
        <Note at={modelAt} x={R_X} y={y(BODY_Y) + h(50)}>
          <span style={noteLine(26, INK)}>
            Now the reader is <b style={{ color: BLUE_INK }}>a language model</b>
          </span>
        </Note>
        <Spot art="pelican" at={modelAt} left={1460} top={y(BODY_Y) + h(130)} width={heroW} />
        <NextLine at={nextAt} x={R_X} y={y(780)} width={560}>
          AI and the semantic layer
        </NextLine>
      </Drift>
    </AbsoluteFill>
  );
};
