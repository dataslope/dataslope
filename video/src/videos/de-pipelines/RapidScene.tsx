import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { RapidFire, type RapidItem } from "../../editorial/interview";
import { type Layout, useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, HIGHLIGHT, INK, INK_SOFT, PAPER, label, note } from "../../editorial/style";
import { NextLine, Note } from "../../editorial/ui";
import { inkOf } from "../../theme/brand";
import { MONO } from "../../theme/fonts";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { Drift, Flow, Headline, HERO, Kicker, lineOf, Listing, Node, OK, OK_INK, Pill, Spot, X0 } from "./parts";

const R_X = 800;
const LIST_TOP = 380;
const ROW = 66;

type Ctx = { w: (beat: string, phrase: string) => number; y: Layout["y"]; h: Layout["h"] };

// ── 9. dbt ──────────────────────────────────────────────────────────────────

/** The page's model, models/marts/fct_orders.sql. */
const MODEL = [
  "SELECT o.order_id, o.amount,",
  "  c.customer_name, d.fiscal_quarter",
  "FROM {{ ref('stg_orders') }} o",
  "JOIN {{ ref('dim_customer') }} c ON c.customer_id = o.customer_id",
  "JOIN {{ ref('dim_date') }} d ON d.date_key = o.order_date_key",
];

const Dbt: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const toolAt = c.w("r-dbt", "dbt is a sequel transformation tool");
  const runsAt = c.w("r-dbt", "it runs select statements in the warehouse");
  const savesAt = c.w("r-dbt", "saves each result as a table or a view");
  const refAt = c.w("r-dbt", "Its ref calls");
  const dependsAt = c.w("r-dbt", "what each model depends on");
  const orderAt = c.w("r-dbt", "builds them in order");
  const testsAt = c.w("r-dbt", "with tests and docs alongside");
  const tAt = c.w("r-dbt", "It's the T in ELT");
  const top = c.y(380);
  const refs = ["stg_orders", "dim_customer", "dim_date"];
  const gTop = c.y(660);
  const fTop = c.y(800);
  const nodeX = (i: number) => R_X + i * 300;
  const fct = { x: R_X + 300, w: 260 };
  return (
    <>
      <Note at={toolAt} x={R_X} y={top - 42}>
        <span style={{ ...label(22, INK), fontWeight: 700, whiteSpace: "nowrap" }}>
          <span style={{ fontFamily: MONO, fontWeight: 600 }}>models/marts/fct_orders.sql</span>
          <span style={{ color: INK_SOFT, opacity: ease(frame, savesAt, 10) }}> → saved as a table or a view</span>
        </span>
      </Note>
      <Listing
        lines={MODEL}
        x={R_X}
        top={top}
        width={900}
        size={21}
        at={runsAt}
        marks={refs.map((r, i) => ({ line: lineOf(MODEL, `ref('${r}')`), at: refAt + 4 + i * 5 }))}
      />
      {refs.map((r, i) => (
        <React.Fragment key={r}>
          <Node x={nodeX(i)} y={gTop} w={250} h={c.h(58)} at={dependsAt + i * 4} title={<span style={{ fontFamily: MONO, fontSize: 21 }}>{r}</span>} />
          <Flow points={[[nodeX(i) + 125, gTop + c.h(58) + 6], [nodeX(i) + 125, fTop - c.h(30)], [fct.x + fct.w / 2 + (i - 1) * 60, fTop - c.h(30)], [fct.x + fct.w / 2 + (i - 1) * 60, fTop - 8]]} at={orderAt + i * 4} color={BAR} width={2.2} head={12} />
        </React.Fragment>
      ))}
      <Node x={fct.x} y={fTop} w={fct.w} h={c.h(62)} at={orderAt + 14} tone="ok" title={<span style={{ fontFamily: MONO, fontSize: 22 }}>fct_orders</span>} />
      <Pill x={fct.x + fct.w + 30} y={fTop + 4} at={testsAt} tone="plain" size={20}>
        tests
      </Pill>
      <Pill x={fct.x + fct.w + 130} y={fTop + 4} at={testsAt + 6} tone="plain" size={20}>
        docs
      </Pill>
      <Note at={tAt} x={fct.x + fct.w + 260} y={fTop + 2}>
        <span style={{ ...note(26, INK), fontWeight: 700, whiteSpace: "nowrap" }}>
          the T in EL<span style={{ color: OK_INK, background: HIGHLIGHT, padding: "0 4px", borderRadius: 4 }}>T</span>
        </span>
      </Note>
    </>
  );
};

// ── 10. Fan-out ─────────────────────────────────────────────────────────────

/** A grid of aggregates built on one dimension; a few are really affected. */
const GRID = { cols: 9, rows: 6, size: 34, gap: 10 };
const AFFECTED = new Set([3, 11, 22, 30, 40, 49]);

const FanOut: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const oneAt = c.w("r-fan", "one upstream change");
  const manyAt = c.w("r-fan", "many downstream recomputations");
  const correctAt = c.w("r-fan", "Correct a dimension table");
  const staleAt = c.w("r-fan", "go stale");
  const onlyAt = c.w("r-fan", "Recompute only the affected partitions");
  const graphAt = c.w("r-fan", "let the dependency graph find the smallest scope");
  const cdcAt = c.w("r-fan", "use CDC so only the change travels");
  const dim = { x: R_X, y: c.y(540), w: 250, h: 84 };
  const gx = 1260;
  const gy = c.y(400);
  const cell = (k: number) => ({ x: gx + (k % GRID.cols) * (GRID.size + GRID.gap), y: gy + Math.floor(k / GRID.cols) * (GRID.size + GRID.gap) });
  const total = GRID.cols * GRID.rows;
  const stale = ease(frame, staleAt, 14);
  const calm = ease(frame, onlyAt, 14);
  const redo = ease(frame, onlyAt + 12, 14);
  const fan = ease(frame, manyAt, 20);
  const pick = ease(frame, graphAt, 14);
  const travel = ease(frame, cdcAt + 4, 30);
  const from = [dim.x + dim.w + 6, dim.y + dim.h / 2] as const;
  return (
    <>
      <Node x={dim.x} y={dim.y} w={dim.w} h={dim.h} at={oneAt} title={<span style={{ fontFamily: MONO, fontSize: 22 }}>dim_customer</span>} sub={<span style={{ opacity: ease(frame, correctAt, 10) }}>one row corrected</span>} />
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        {/* A fan into every row of aggregates built on it... */}
        {Array.from({ length: GRID.rows }, (_, r) => {
          const ty = gy + r * (GRID.size + GRID.gap) + GRID.size / 2;
          const tx = gx - 10;
          return (
            <line
              key={`r${r}`}
              x1={from[0]}
              y1={from[1]}
              x2={from[0] + (tx - from[0]) * fan}
              y2={from[1] + (ty - from[1]) * fan}
              stroke={BAR}
              strokeWidth={1.6}
              opacity={0.6 * (1 - pick * 0.7)}
            />
          );
        })}
        {/* ...then only the edges to what the change really reaches. */}
        {[...AFFECTED].map((k) => {
          const p = cell(k);
          return (
            <line
              key={`e${k}`}
              x1={from[0]}
              y1={from[1]}
              x2={from[0] + (p.x + GRID.size / 2 - from[0]) * pick}
              y2={from[1] + (p.y + GRID.size / 2 - from[1]) * pick}
              stroke={OK}
              strokeWidth={2.4}
              opacity={pick}
            />
          );
        })}
        {Array.from({ length: total }, (_, k) => {
          const p = cell(k);
          const hit = AFFECTED.has(k);
          const appear = ease(frame, manyAt + (k % GRID.cols) * 1.5, 8);
          // Stale: everything goes red; then only the affected ones are redone (green).
          const red = stale * (hit ? 1 - redo : 1 - calm);
          const green = hit ? redo : 0;
          const fill = green > 0 ? `color-mix(in srgb, ${OK} ${green * 100}%, ${ACCENT})` : `color-mix(in srgb, ${ACCENT} ${red * 100}%, ${BAR})`;
          return <rect key={k} x={p.x} y={p.y} width={GRID.size} height={GRID.size} rx={5} fill={fill} opacity={appear * (0.55 + 0.35 * Math.max(red, green))} />;
        })}
        {/* Only the change travels. */}
        {travel > 0 && travel < 1 ? (
          <circle cx={from[0] + (cell(22).x - from[0]) * travel} cy={from[1] + (cell(22).y + GRID.size / 2 - from[1]) * travel} r={10} fill={OK} />
        ) : null}
      </svg>
      <Note at={manyAt + 6} x={gx} y={gy - c.h(46)}>
        <span style={{ ...label(21, INK_SOFT), fontWeight: 700, whiteSpace: "nowrap" }}>thousands of aggregates built on it</span>
      </Note>
      <Note at={staleAt} x={gx} y={gy + GRID.rows * (GRID.size + GRID.gap) + c.h(10)} out={onlyAt}>
        <span style={{ ...note(25, ACCENT_INK), fontWeight: 700, whiteSpace: "nowrap" }}>all of them stale</span>
      </Note>
      <Note at={onlyAt + 6} x={gx} y={gy + GRID.rows * (GRID.size + GRID.gap) + c.h(10)}>
        <span style={{ ...note(25, OK_INK), fontWeight: 700, whiteSpace: "nowrap" }}>recompute only the affected ones</span>
      </Note>
      <Note at={graphAt + 4} x={R_X} y={c.y(720)}>
        <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>the dependency graph finds the smallest scope</span>
      </Note>
      <Note at={cdcAt} x={R_X} y={c.y(770)}>
        <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
          <b style={{ color: OK_INK }}>CDC</b>: only the changed row travels
        </span>
      </Note>
    </>
  );
};

// ── 11. Lineage ─────────────────────────────────────────────────────────────

const PERSONAL = inkOf.orange;

const Lineage: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const tracksAt = c.w("r-lineage", "Data lineage tracks where data came from");
  const transformedAt = c.w("r-lineage", "what transformed it");
  const dashAt = c.w("r-lineage", "from source system to dashboard");
  const whyAt = c.w("r-lineage", "why a metric changed");
  const breaksAt = c.w("r-lineage", "what breaks if you drop a column");
  const personalAt = c.w("r-lineage", "where personal data went");
  const W = 210;
  const H = c.h(62);
  const colX = (i: number) => R_X + i * 262;
  const rowY = (j: number) => c.y(420) + j * c.h(120);
  // Two sources through raw tables into one model and a dashboard.
  const N = {
    ordersDb: { x: colX(0), y: rowY(0), t: "orders DB" },
    crm: { x: colX(0), y: rowY(1), t: "CRM" },
    rawOrders: { x: colX(1), y: rowY(0), t: "raw_orders" },
    rawCust: { x: colX(1), y: rowY(1), t: "raw_customers" },
    fct: { x: colX(2), y: (rowY(0) + rowY(1)) / 2, t: "fct_revenue" },
    dash: { x: colX(3), y: (rowY(0) + rowY(1)) / 2, t: "dashboard" },
  };
  type K = keyof typeof N;
  const EDGES: [K, K][] = [
    ["ordersDb", "rawOrders"],
    ["crm", "rawCust"],
    ["rawOrders", "fct"],
    ["rawCust", "fct"],
    ["fct", "dash"],
  ];
  const at = (k: K) => (k === "ordersDb" || k === "crm" ? tracksAt : k === "dash" ? dashAt : transformedAt);
  // Back from the dashboard (why it changed); forward from raw_customers
  // (what breaks); the CRM's personal data and everything it reaches.
  const back = new Set<K>(["dash", "fct", "rawOrders", "rawCust", "ordersDb", "crm"]);
  const fwd = new Set<K>(["rawCust", "fct", "dash"]);
  const backP = ease(frame, whyAt, 16) * (1 - ease(frame, breaksAt - 4, 10));
  const fwdP = ease(frame, breaksAt + 4, 14) * (1 - ease(frame, personalAt - 4, 10));
  const persP = ease(frame, personalAt + 4, 14);
  const pers = new Set<K>(["crm", "rawCust", "fct", "dash"]);
  return (
    <>
      {EDGES.map(([a, b]) => {
        const s = N[a];
        const t = N[b];
        const lit = back.has(b) && back.has(a) ? backP : 0;
        const col = fwd.has(a) && fwd.has(b) && fwdP > 0 ? ACCENT : lit > 0 ? inkOf.yellow : BAR;
        return (
          <Flow
            key={`${a}-${b}`}
            points={
              s.y === t.y
                ? [
                    [s.x + W + 6, s.y + H / 2],
                    [t.x - 8, t.y + H / 2],
                  ]
                : [
                    [s.x + W + 6, s.y + H / 2],
                    [s.x + W + 26, s.y + H / 2],
                    [s.x + W + 26, t.y + H / 2 + (s.y < t.y ? -12 : 12)],
                    [t.x - 8, t.y + H / 2 + (s.y < t.y ? -12 : 12)],
                  ]
            }
            at={at(b) - 2}
            color={col}
            width={2.4 + 1.2 * Math.max(lit, fwd.has(a) && fwd.has(b) ? fwdP : 0)}
            head={12}
          />
        );
      })}
      {(Object.keys(N) as K[]).map((k) => {
        const node = N[k];
        const red = fwd.has(k) && k !== "rawCust" ? fwdP : 0;
        return (
          <React.Fragment key={k}>
            <Node x={node.x} y={node.y} w={W} h={H} at={at(k)} tone={red > 0.5 ? "bad" : k === "ordersDb" || k === "crm" || k === "dash" ? "plain" : "data"} title={<span style={{ fontFamily: k === "ordersDb" || k === "crm" || k === "dash" ? undefined : MONO, fontSize: 21 }}>{node.t}</span>} lit={back.has(k) ? backP * 0.6 : 0} />
            {pers.has(k) && persP > 0 ? (
              <div style={{ position: "absolute", left: node.x + W - 34, top: node.y - 14, width: 26, height: 26, borderRadius: 13, background: PERSONAL, border: `3px solid ${PAPER}`, opacity: persP }} />
            ) : null}
          </React.Fragment>
        );
      })}
      <Note at={whyAt} x={R_X} y={c.y(700)}>
        <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
          <b style={{ background: HIGHLIGHT, padding: "0 4px" }}>why did this metric change?</b> trace it back
        </span>
      </Note>
      <Note at={breaksAt} x={R_X} y={c.y(750)}>
        <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
          <b style={{ color: ACCENT_INK }}>drop a column:</b> what breaks downstream
        </span>
      </Note>
      <Note at={personalAt} x={R_X} y={c.y(800)}>
        <span style={{ ...note(24, INK), whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 10 }}>
          <span style={{ width: 20, height: 20, borderRadius: 10, background: PERSONAL, display: "inline-block" }} />
          <span>
            <b>where personal data went</b>, for compliance
          </span>
        </span>
      </Note>
    </>
  );
};

/**
 * The quick round: three questions down the left, each answer on the right
 * while it is read, then the bridge into distributed processing, with the
 * hero back on the page.
 */
export const RapidScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();
  const c: Ctx = { w: n.word, y, h };

  const from = n.beat("rapid-in").from;
  const moreAt = n.word("rapid-in", "Three more");
  const eachAt = n.word("rapid-in", "a sentence or two each");
  const end = n.beat("next").from - 4;
  const assumedAt = n.word("next", "Each answer here assumed");
  const oneAt = n.word("next", "one machine could hold the data");
  const outgrowsAt = n.word("next", "When a day of events outgrows it");
  const splitAt = n.word("next", "split across many");
  const nextAt = n.word("next", "Next:");

  const items: RapidItem[] = [
    { n: 9, label: "dbt", at: n.word("r-dbt", "dbt is a sequel transformation tool"), body: <Dbt c={c} /> },
    { n: 10, label: "The fan-out problem", at: n.word("r-fan", "The fan-out problem"), body: <FanOut c={c} /> },
    { n: 11, label: "Data lineage", at: n.word("r-lineage", "Data lineage tracks"), body: <Lineage c={c} /> },
  ];
  const listBottom = y(LIST_TOP) + items.length * h(ROW);

  return (
    <AbsoluteFill>
      <Sfx name="el-chime" at={moreAt} level={-36} />
      {items.map((it) => (
        <Sfx key={it.n} name="el-tap" at={it.at} level={-36} />
      ))}
      <Sfx name="el-pop" at={assumedAt + 4} level={-34} />
      <Sfx name="el-pencil" at={nextAt} level={-36} />

      <Drift from={from} to={n.beat("next").to + 40}>
        <Kicker at={moreAt}>Quick round</Kicker>
        <Headline lead="Three more." turn="A sentence or two each." at={moreAt} turnAt={eachAt - 2} size={64} />
        <RapidFire items={items} x={X0} top={y(LIST_TOP)} rowH={h(ROW)} width={560} at={moreAt + 6} end={end} />

        {/* The bridge. */}
        <Spot id={HERO.id} at={assumedAt + 4} left={1150} top={y(420)} width={660} height={358} />
        <Note at={oneAt} x={X0} y={listBottom + h(50)}>
          <span style={{ ...note(27, INK), whiteSpace: "nowrap" }}>
            Each answer assumed <b style={{ color: BLUE_INK }}>one machine</b> could hold the data.
          </span>
        </Note>
        <Note at={outgrowsAt} x={X0} y={listBottom + h(104)}>
          <span style={{ ...note(27, INK), whiteSpace: "nowrap" }}>
            A day of events outgrows it
            <span style={{ opacity: ease(frame, splitAt, 10) }}>
              : the work splits across <b style={{ color: BLUE_INK }}>many</b>.
            </span>
          </span>
        </Note>
        <NextLine at={nextAt} x={X0} y={y(800)} width={900}>
          distributed processing
        </NextLine>
      </Drift>
    </AbsoluteFill>
  );
};
