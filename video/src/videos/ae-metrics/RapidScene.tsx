import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { RapidFire, type RapidItem, Tick } from "../../editorial/interview";
import { type Layout, useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BLUE_INK, HAIRLINE, HIGHLIGHT, INK, INK_SOFT, label, note, svgText } from "../../editorial/style";
import { ColumnRule, Ink, NextLine, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { MONO } from "../../theme/fonts";
import { METRICFLOW_YAML } from "./data";
import { Cross, Drift, Flow, Headline, Kicker, Listing, listingHeight, Mono, Node, noteLine, OK_INK, Spot, Svg, X0 } from "./parts";

const R_X = 820;
const LIST_TOP = 320;
const ROW = 48;
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

const Truth: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const withoutAt = c.w("r-truth", "Without one");
  const reimplAt = c.w("r-truth", "re-implements revenue slightly differently");
  const oneAt = c.w("r-truth", "One definition means");
  const placeAt = c.w("r-truth", "one place to change it");
  const sameAt = c.w("r-truth", "the same answer everywhere");
  const versionedAt = c.w("r-truth", "versioned code instead of tribal knowledge");
  // On "the same answer everywhere" the three copies give way to one: the
  // old line fades out before the new one fades in, so they never overprint.
  const unifyAt = sameAt;
  const off = ease(frame, unifyAt, 8);
  const on = ease(frame, unifyAt + 6, 10);
  const top = c.y(BODY_Y);
  // Three readings of revenue, none of them marked right: the trap is that
  // there are three, not which one is correct (Part 9's governed metric is
  // net revenue, so no reading here is crowned).
  const tools = [
    { name: "Dashboard", sql: "SUM(amount)" },
    { name: "Notebook", sql: "SUM(amount - tax)" },
    { name: "Dashboard", sql: "SUM(amount - refunds)" },
  ];
  return (
    <>
      {/* The heading follows the boxes (2026-11-26 review): once every tool
          reads the layer's revenue it no longer says "without one". */}
      <Line at={withoutAt} top={top}>
        <span style={{ display: "inline-grid" }}>
          <span style={{ gridArea: "1 / 1", opacity: 1 - off, whiteSpace: "nowrap" }}>Without one, each tool writes its own revenue</span>
          <span style={{ gridArea: "1 / 1", opacity: on, whiteSpace: "nowrap" }}>With one, every tool asks the layer</span>
        </span>
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
            <span style={{ display: "inline-grid", justifyItems: "center", alignItems: "center" }}>
              <span style={{ gridArea: "1 / 1", fontFamily: MONO, fontSize: 19, color: INK, opacity: 1 - off, whiteSpace: "nowrap" }}>{t.sql}</span>
              <span style={{ gridArea: "1 / 1", fontSize: 21, fontWeight: 500, color: OK_INK, opacity: on, whiteSpace: "nowrap" }}>the layer&rsquo;s revenue</span>
            </span>
          }
          size={22}
          tone="plain"
          toneTo="ok"
          toneAt={unifyAt + 6}
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

/** A contiguous slice of the page's YAML, from the line holding `from` to
 *  the line holding `to`, its common indent taken off. */
const slice = (lines: readonly string[], from: string, to: string) => {
  const i0 = lines.findIndex((l) => l.includes(from));
  const i1 = lines.findIndex((l, i) => i >= i0 && l.includes(to));
  if (i0 < 0 || i1 < 0) throw new Error(`the YAML has no ${from} … ${to}`);
  const part = lines.slice(i0, i1 + 1);
  const indent = Math.min(...part.map((l) => l.length - l.trimStart().length));
  return part.map((l) => l.slice(indent));
};

const MetricFlow: React.FC<{ c: Ctx; askedAt: number }> = ({ c, askedAt }) => {
  const frame = useCurrentFrame();
  const entitiesAt = c.w("r-metricflow-yaml", "Entities");
  const dimensionsAt = c.w("r-metricflow-yaml", "dimensions");
  const metricsAt = c.w("r-metricflow-yaml", "metrics");
  const modelAt = c.w("r-metricflow-yaml", "the dbt model they describe");
  const compilerAt = c.w("r-metricflow-sql", "the layer's query compiler");
  const requestAt = c.w("r-metricflow-sql", "a request for a metric by a dimension");
  const sqlAt = c.w("r-metricflow-sql", "into warehouse SQL");
  const apiAt = c.w("r-metricflow-sql", "through an API");
  const top = c.y(BODY_Y);
  const size = 19;
  const model = METRICFLOW_YAML.find((l) => l.includes("- name:"))!.split("name:")[1].trim();
  const entity = slice(METRICFLOW_YAML, "- name: order_id", "type: primary");
  const dimension = slice(METRICFLOW_YAML, "- name: status", "type: categorical");
  const metric = slice(METRICFLOW_YAML, "metrics:", "filter:");
  const partsTop = top + c.h(50);
  const metricTop = partsTop + listingHeight(entity.length, size) + c.h(46);
  const flowTop = metricTop + listingHeight(metric.length, size) + c.h(30);
  const tag = (at: number, x: number, y: number, text: string) => (
    <Line at={at} x={x} top={y} size={21} color={BLUE_INK}>
      {text}
    </Line>
  );
  return (
    <>
      <Line at={askedAt} top={top}>
        In the YAML of the model they describe
        <span style={{ opacity: ease(frame, modelAt, 12) }}>
          , <Mono>{model}</Mono>
        </span>
      </Line>
      <Listing lines={entity} x={R_X} top={partsTop} width={320} size={size} at={entitiesAt - 2} yaml marks={[{ line: "entity:", text: "entity", at: entitiesAt + 4 }]} />
      {tag(entitiesAt + 6, R_X + 340, partsTop + c.h(10), "an entity")}
      <Listing lines={dimension} x={R_X + 520} top={partsTop} width={320} size={size} at={dimensionsAt - 2} yaml marks={[{ line: "dimension:", text: "dimension", at: dimensionsAt + 4 }]} />
      {tag(dimensionsAt + 6, R_X + 860, partsTop + c.h(10), "a dimension")}
      <Listing
        lines={metric}
        x={R_X}
        top={metricTop}
        width={810}
        size={size}
        at={metricsAt - 2}
        yaml
        marks={[
          { line: "- name: completed_revenue", text: "completed_revenue", at: metricsAt + 4 },
          { line: "agg: sum", text: "sum", at: metricsAt + 10 },
          { line: "expr: amount", text: "amount", at: metricsAt + 14 },
        ]}
      />
      <Ink at={requestAt} dur={12} style={{ left: R_X, top: flowTop }}>
        <span style={noteLine(22, INK)}>metric by dimension</span>
      </Ink>
      <Flow points={[[R_X + 230, flowTop + c.h(14)], [R_X + 296, flowTop + c.h(14)]]} at={requestAt + 6} dur={8} />
      <Ink at={compilerAt} dur={12} style={{ left: R_X + 312, top: flowTop }}>
        <span style={{ ...noteLine(22, INK), fontWeight: 600 }}>MetricFlow</span>
      </Ink>
      <Flow points={[[R_X + 450, flowTop + c.h(14)], [R_X + 516, flowTop + c.h(14)]]} at={sqlAt} dur={8} />
      <Ink at={sqlAt + 4} dur={12} style={{ left: R_X + 532, top: flowTop }}>
        <span style={noteLine(22, BLUE_INK)}>warehouse SQL</span>
      </Ink>
      <Line at={apiAt} top={flowTop + c.h(44)} size={22} color={INK_SOFT}>
        BI tools ask for it through an API
      </Line>
    </>
  );
};

// ── 19. Where else a semantic layer can live ────────────────────────────────

const Where: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const warehouseAt = c.w("r-where", "In the warehouse itself");
  const snowAt = c.w("r-where", "Snowflake's semantic views");
  const dbxAt = c.w("r-where", "Databricks' metric views");
  const askAt = c.w("r-where", "which many ask-your-data assistants query");
  const tradeAt = c.w("r-where", "The trade-off is portability");
  const moveAt = c.w("r-where", "doesn't move to another");
  const ossieAt = c.w("r-where", "Apache Ossie");
  const specAt = c.w("r-where", "a vendor-neutral spec");
  const top = c.y(BODY_Y);
  const boxTop = top + c.h(56);
  const boxH = c.h(84);
  const w = 290;
  const xB = R_X + w + 150;
  const mid = boxTop + boxH / 2;
  return (
    <>
      <Line at={warehouseAt} top={top}>
        In the warehouse itself
      </Line>
      <Node x={R_X} y={boxTop} w={w} h={boxH} at={snowAt} title="Snowflake" sub="semantic views" size={23} />
      <Node x={xB} y={boxTop} w={w} h={boxH} at={dbxAt} title="Databricks" sub="metric views" size={23} />
      <Flow points={[[R_X + w + 14, mid], [xB - 14, mid]]} at={moveAt - 10} dur={10} color={ACCENT} />
      <div style={{ position: "absolute", left: R_X + w + 64, top: mid - 11, opacity: ease(frame, moveAt, 6) }}>
        <Cross at={moveAt} size={22} />
      </div>
      <Line at={askAt} top={boxTop + boxH + c.h(26)} color={INK_SOFT} size={22}>
        Many ask-your-data assistants query these
      </Line>
      <Line at={tradeAt} top={boxTop + boxH + c.h(78)} color={ACCENT_INK}>
        The trade-off: portability
      </Line>
      <Line at={moveAt} top={boxTop + boxH + c.h(118)} color={INK_SOFT} size={22}>
        one engine&rsquo;s definition doesn&rsquo;t move to another
      </Line>
      <Line at={ossieAt} top={boxTop + boxH + c.h(178)} bold>
        Apache Ossie, begun as the Open Semantic Interchange
      </Line>
      <Line at={specAt} top={boxTop + boxH + c.h(220)} color={OK_INK}>
        a vendor-neutral spec for exchanging definitions
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
      <ColumnRule x={col2 - 40} top={top + 4} height={c.h(200)} at={metricAt} />
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
      {/* What it is built from: the measure on the left, plus a filter. */}
      <Ink at={completedAt + 4} dur={12} style={{ left: col2, top: top + c.h(176) }}>
        <span style={{ fontFamily: MONO, fontSize: 21, color: INK_SOFT, fontWeight: 500, whiteSpace: "nowrap" }}>
          <span style={{ color: BLUE_INK }}>SUM(amount)</span> where status = &apos;completed&apos;
        </span>
      </Ink>
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
      <Line at={ratioAt} top={top + 5 * c.h(46) + c.h(24)}>
        A ratio adds a numerator and a denominator
      </Line>
    </>
  );
};

// ── 15. Additive, semi-additive, non-additive ───────────────────────────────

const Additive: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
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
          {/* Each mark is hidden until its cue: a zero-length stroke with a
              round cap still paints a dot. */}
          <div style={{ position: "absolute", left: colA + 40, top: rowTop(i) + 4, opacity: ease(frame, r.at + 4, 3) }}>
            {r.a ? <Tick at={r.at + 4} size={28} /> : <Cross at={r.at + 4} size={26} />}
          </div>
          <div style={{ position: "absolute", left: colB + 50, top: rowTop(i) + 4, opacity: ease(frame, r.bAt + 4, 3) }}>
            {r.b ? <Tick at={r.bAt + 4} size={28} /> : <Cross at={r.bAt + 4} size={26} />}
          </div>
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
  // Two kinds of window, both ending today (2026-11-26 review): a trailing
  // one that slides along the days, and a to-date one that starts on the 1st
  // and grows. Month-to-date is the second kind, not a trailing window.
  const windowAt = c.w("r-cumulative-window", "It aggregates over a window");
  const trailingAt = c.w("r-cumulative-window", "a trailing one");
  const rollingAt = c.w("r-cumulative-window", "rolling twenty-eight-day active users");
  const startAt = c.w("r-cumulative-window", "one from the start of the month");
  const mtdAt = c.w("r-cumulative-window", "month-to-date revenue");
  const subtlyAt = c.w("r-cumulative-once", "easy to get subtly different by hand");
  const onceAt = c.w("r-cumulative-once", "define the grain and the window once");
  const top = c.y(BODY_Y);
  const axisY = top + c.h(170);
  const DAYS = 60;
  /** The 1st of the month, fourteen days before today (the axis's end). */
  const FIRST = 46;
  const px = 960 / DAYS;
  const slide = ease(frame, trailingAt, 150);
  const start = Math.round(slide * (DAYS - 28));
  const winX = R_X + start * px;
  const toDateX = R_X + FIRST * px;
  const toDateH = c.h(40);
  const grow = ease(frame, startAt, 18);
  return (
    <>
      <Line at={windowAt} top={top}>
        A window, not a single period
      </Line>
      <Svg opacity={ease(frame, windowAt + 4, 12)}>
        <rect x={winX} y={axisY - c.h(46)} width={28 * px} height={c.h(46)} fill={HIGHLIGHT} opacity={ease(frame, trailingAt, 10)} />
        <rect x={toDateX} y={axisY + 3} width={(DAYS - FIRST) * px * grow} height={toDateH} fill={HIGHLIGHT} opacity={ease(frame, startAt, 8)} />
        <line x1={R_X} y1={axisY} x2={R_X + 960} y2={axisY} stroke={INK} strokeWidth={1.5} />
        {Array.from({ length: DAYS + 1 }, (_, i) => (
          <line key={i} x1={R_X + i * px} y1={axisY} x2={R_X + i * px} y2={axisY - (i % 7 === 0 ? 14 : 7)} stroke={INK_SOFT} strokeWidth={1.2} />
        ))}
        <text x={winX + 14 * px} y={axisY - c.h(58)} textAnchor="middle" style={svgText(label(21, INK))} opacity={ease(frame, trailingAt + 4, 10)}>
          trailing 28 days
        </text>
        {/* The 1st: a tick down from the axis (clear of the trailing band
            above it), named under the band's left edge. */}
        <line x1={toDateX} y1={axisY} x2={toDateX} y2={axisY + toDateH + 8} stroke={INK} strokeWidth={1.5} opacity={ease(frame, startAt, 8)} />
        <text x={toDateX} y={axisY + toDateH + 34} textAnchor="middle" style={svgText(note(20, INK_SOFT))} opacity={ease(frame, startAt + 4, 10)}>
          the 1st
        </text>
        <text x={toDateX + ((DAYS - FIRST) * px) / 2} y={axisY + 3 + toDateH / 2 + 7} textAnchor="middle" style={svgText(label(21, INK))} opacity={ease(frame, mtdAt, 10)}>
          month to date
        </text>
        <text x={R_X + 960 + 12} y={axisY + 7} textAnchor="start" style={svgText(note(20, INK_SOFT))}>
          today
        </text>
      </Svg>
      <Line at={rollingAt} top={axisY + c.h(100)} color={BLUE_INK}>
        rolling 28-day active users
      </Line>
      <Line at={mtdAt} top={axisY + c.h(142)} color={BLUE_INK}>
        month-to-date revenue
      </Line>
      <Line at={subtlyAt} top={axisY + c.h(196)} color={INK_SOFT} size={22}>
        Easy to get subtly different by hand
      </Line>
      <Line at={onceAt} top={axisY + c.h(238)} color={OK_INK} bold>
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
 * The quick round: eleven questions down the left, each read as "Question n."
 * and its question, each answer's key fact on the right while it is read;
 * then the bridge into Part 9, the pelican back on the page.
 */
export const RapidScene: React.FC = () => {
  const n = useNarration();
  const { y, h } = useLayout();
  const c: Ctx = { w: n.word, y, h };

  const from = n.beat("rapid-in").from;
  const tenAt = n.word("rapid-in", "Eleven quick ones");
  const finishAt = n.word("rapid-in", "to finish");
  const peopleAt = n.word("next", "written for people reading dashboards");
  // The last answer stays up into the bridge's first words, then clears for it.
  const end = peopleAt - 12;
  const modelAt = n.word("next", "Now the reader is a language model");
  const nextAt = n.word("next", "Next:");

  const items: RapidItem[] = [
    { n: 9, label: "Why one source of truth?", at: n.word("r-truth", "Why does a single source of truth"), body: <Truth c={c} /> },
    { n: 10, label: "Metric drift, and preventing it", at: n.word("r-drift", "What is metric drift"), body: <Drifting c={c} /> },
    { n: 11, label: "The dbt Semantic Layer, MetricFlow", at: n.word("r-metricflow", "What is the dbt Semantic Layer"), body: <MetricFlow c={c} askedAt={n.word("r-metricflow", "or MetricFlow")} /> },
    { n: 12, label: "LookML and Looker", at: n.word("r-lookml", "What is LookML"), body: <LookMl c={c} /> },
    { n: 13, label: "Measure or metric", at: n.word("r-measure", "What is the difference between a measure and a metric"), body: <MeasureMetric c={c} /> },
    { n: 14, label: "What a metric definition holds", at: n.word("r-contains", "What does a metric definition contain"), body: <Contains c={c} /> },
    { n: 15, label: "Additive, semi-, non-additive", at: n.word("r-additive", "What is the difference between additive"), body: <Additive c={c} /> },
    { n: 16, label: "Governance", at: n.word("r-governance", "What is governance"), body: <Governance c={c} /> },
    { n: 17, label: "Cumulative, time-window metrics", at: n.word("r-cumulative", "What is a cumulative"), body: <Cumulative c={c} /> },
    { n: 18, label: "A wide mart, or the layer", at: n.word("r-wide", "When is a wide"), body: <Wide c={c} /> },
    { n: 19, label: "Where else a semantic layer lives", at: n.word("r-where", "Where else can a semantic layer live"), body: <Where c={c} /> },
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
        <Headline lead="Eleven quick ones" turn="to finish." at={tenAt - 2} turnAt={finishAt} size={64} />
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
