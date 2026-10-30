import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { Pt } from "../../components/arrow";
import { ease } from "../../components/motion";
import { Entity, Relation, useEntityLayout } from "../../editorial/erd";
import { QMono, RapidFire, type RapidItem, Tick } from "../../editorial/interview";
import { type Layout, useLayout } from "../../editorial/layout";
import { ACCENT_INK, BLUE_INK, HIGHLIGHT, INK, INK_SOFT, label, note, PAPER } from "../../editorial/style";
import { NextLine, Note, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { AOV_ALL, AOV_WORKING, BY_QUARTER, HERO, HOLIDAYS, linesOf, money } from "./data";
import {
  colsOf,
  DataTable,
  Drift,
  geoOf,
  Headline,
  Kicker,
  lineOf,
  Listing,
  listingHeight,
  MARK_OK,
  Mono,
  OK,
  OK_INK,
  PanelHead,
  Spot,
  X0,
} from "./parts";

const R_X = 840;
const LIST_TOP = 340;
const ROW = 64;

type Ctx = { w: (beat: string, phrase: string) => number; y: Layout["y"]; h: Layout["h"] };

/** An elbow from one side of an entity to the facing side of another, turning at `x`. */
const elbow = (a: Pt, b: Pt, x: number): Pt[] => [a, [x, a[1]], [x, b[1]], b];
const chip = (x: number, y: number, name: string, width = 270) => ({ x, y, width, name, columns: [] });

// ── 11. A conformed dimension ──────────────────────────────────────────────

const Conformed: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const oneAt = c.w("r-conformed", "A conformed dimension is one dimension");
  const shareAt = c.w("r-conformed", "several fact tables share");
  const sameAt = c.w("r-conformed", "the same keys and the same values");
  const salesAt = c.w("r-conformed", "Sales and inventory");
  const dateAt = c.w("r-conformed", "one date dimension");
  const drillAt = c.w("r-conformed", "drill across them");
  const lineAt = c.w("r-conformed", "the days line up");
  const sales = useEntityLayout(chip(R_X, c.y(400), "fact_sales"));
  const inventory = useEntityLayout(chip(R_X, c.y(600), "fact_inventory"));
  const probe = useEntityLayout(chip(0, 0, "dim_date", 240));
  const date = useEntityLayout(chip(R_X + 470, (sales.top + inventory.bottom) / 2 - probe.height / 2, "dim_date", 240));
  const mx = (sales.right + date.left) / 2;
  const at = (dy: number): Pt => [date.left, (date.top + date.bottom) / 2 + dy];
  return (
    <>
      <Entity layout={date} at={oneAt + 2} />
      <Entity layout={sales} at={shareAt - 2} dim={sameAt} />
      <Entity layout={inventory} at={shareAt + 4} dim={sameAt} />
      <Relation name="conformed-sales" points={elbow(at(-14), sales.anchor("right"), mx)} from="exactly-one" to="zero-or-many" at={shareAt + 4} />
      <Relation name="conformed-inventory" points={elbow(at(14), inventory.anchor("right"), mx)} from="exactly-one" to="zero-or-many" at={shareAt + 10} />
      {/* Named again as sales and inventory, each lit as it is said. */}
      <Entity layout={sales} at={salesAt} />
      <Entity layout={inventory} at={salesAt + 8} />
      <Note at={dateAt} x={date.right + 26} y={date.top + 2}>
        <span style={{ ...note(23, INK_SOFT), whiteSpace: "nowrap" }}>
          shared by
          <br />
          both facts
        </span>
      </Note>
      <Note at={sameAt} x={R_X} y={c.y(780)}>
        <span style={{ ...note(25, BLUE_INK), fontWeight: 700, whiteSpace: "nowrap" }}>same keys, same values</span>
      </Note>
      <Note at={drillAt} x={R_X} y={c.y(830)}>
        <span style={{ ...note(25, OK_INK), fontWeight: 700, whiteSpace: "nowrap" }}>
          drill across:
          <span style={{ opacity: ease(frame, lineAt, 10) }}> the days line up</span>
        </span>
      </Note>
    </>
  );
};

// ── 12. Wide against narrow ────────────────────────────────────────────────

const Wide: React.FC<{ c: Ctx }> = ({ c }) => {
  const wideAt = c.w("r-wide", "A wide table puts one entity on each row");
  const everyAt = c.w("r-wide", "every attribute a column");
  const fastAt = c.w("r-wide", "fast, and easy in a dashboard");
  const newAt = c.w("r-wide", "each new attribute is a new column");
  const narrowAt = c.w("r-wide", "A narrow table keeps few columns");
  const joinsAt = c.w("r-wide", "joins to the rest");
  const flexAt = c.w("r-wide", "flexible, at the cost of joins");
  const colAt = c.w("r-wide", "Columnar warehouses handle wide tables well");
  const wideCols = [
    { name: "customer_id" },
    { name: "name", at: everyAt },
    { name: "city", at: everyAt + 3 },
    { name: "segment", at: everyAt + 6 },
    { name: "plan", at: everyAt + 9 },
    { name: "signup_date", at: everyAt + 12 },
    { name: "loyalty_tier", at: newAt + 4 },
  ];
  const wg = geoOf({ cols: wideCols.map((x) => x.name), rows: [] }, R_X, c.y(436), c.h, { headH: 50 });
  // The narrow design side by side: customers, then two attribute tables
  // keyed by customer_id, the second reached by a route under the first.
  const NARROW_Y = c.y(628);
  const customers = useEntityLayout({ x: R_X, y: NARROW_Y, width: 290, name: "customers", columns: [{ name: "customer_id", key: "PK" }, { name: "name" }] });
  const cityT = useEntityLayout({ x: R_X + 400, y: NARROW_Y, width: 260, name: "customer_city", columns: [{ name: "customer_id", key: "FK" }, { name: "city" }] });
  const planT = useEntityLayout({ x: R_X + 720, y: NARROW_Y, width: 260, name: "customer_plan", columns: [{ name: "customer_id", key: "FK" }, { name: "plan" }] });
  const under = customers.bottom + c.h(50);
  const toPlan: Pt[] = [
    customers.anchor("bottom", undefined, 60),
    [customers.left + customers.width / 2 + 60, under],
    [planT.left + planT.width / 2, under],
    planT.anchor("bottom"),
  ];
  return (
    <>
      <PanelHead at={wideAt} x={R_X} y={c.y(346)} width={960} sub="one row per customer, every attribute a column" subAt={everyAt - 4}>
        Wide
      </PanelHead>
      <DataTable g={wg} cols={wideCols} rows={[]} at={wideAt + 4} marks={[]} />
      <Note at={newAt + 8} x={wg.xs[6] - 6} y={wg.top + wg.headH + 10}>
        <span style={{ ...note(22, ACCENT_INK), fontWeight: 650, whiteSpace: "nowrap" }}>↑ a new column</span>
      </Note>
      <Note at={fastAt} x={R_X} y={wg.top + wg.headH + 10}>
        <span style={{ ...note(22, INK), whiteSpace: "nowrap" }}>fast, and easy in a dashboard</span>
      </Note>
      <PanelHead at={narrowAt - 2} x={R_X} y={c.y(534)} width={960} sub="flexible, at the cost of joins" subAt={flexAt}>
        Narrow
      </PanelHead>
      <Entity layout={customers} at={narrowAt} />
      <Entity layout={cityT} at={joinsAt} />
      <Entity layout={planT} at={joinsAt + 6} />
      <Relation name="narrow-city" points={[customers.anchor("right", "customer_id"), cityT.anchor("left", "customer_id")]} from="exactly-one" to="zero-or-many" at={joinsAt + 2} />
      <Relation name="narrow-plan" points={toPlan} from="exactly-one" to="zero-or-many" at={joinsAt + 8} />
      <Note at={colAt} x={R_X} y={c.y(896)}>
        <span style={{ ...note(25, OK_INK), fontWeight: 700, whiteSpace: "nowrap" }}>Columnar warehouses handle wide tables well.</span>
      </Note>
    </>
  );
};

// ── 13. The bus matrix and a data mart ─────────────────────────────────────

const PROCESSES = ["Sales", "Inventory", "Returns"] as const;
const DIMENSIONS = ["Date", "Product", "Store", "Customer"] as const;
/** Which process uses which conformed dimension: the video's own example. */
const USES: Record<(typeof PROCESSES)[number], readonly (typeof DIMENSIONS)[number][]> = {
  Sales: ["Date", "Product", "Store", "Customer"],
  Inventory: ["Date", "Product", "Store"],
  Returns: ["Date", "Product", "Customer"],
};

const Bus: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const planAt = c.w("r-bus", "A bus matrix is a plan");
  const downAt = c.w("r-bus", "business processes down the side");
  const acrossAt = c.w("r-bus", "conformed dimensions across the top");
  const tickAt = c.w("r-bus", "a tick where a process uses one");
  const martAt = c.w("r-bus", "A data mart is what gets built");
  const salesAt = c.w("r-bus", "like sales");
  const sharedAt = c.w("r-bus", "The shared dimensions");
  const combinedAt = c.w("r-bus", "two marts be combined");
  const LABEL_W = 190;
  const CELL_W = 160;
  const CELL_H = c.h(64);
  const top = c.y(420);
  const left = R_X;
  const gridW = LABEL_W + DIMENSIONS.length * CELL_W;
  const rowTop = (i: number) => top + CELL_H + i * CELL_H;
  const colLeft = (j: number) => left + LABEL_W + j * CELL_W;
  const mart = ease(frame, martAt + 4, 14);
  const shared = ["Date", "Product"] as const;
  return (
    <>
      <Note at={planAt} x={R_X} y={c.y(352)}>
        <span style={{ ...label(26, INK), fontWeight: 700, whiteSpace: "nowrap" }}>
          Bus matrix <span style={{ ...note(22, INK_SOFT), fontWeight: 500 }}>· the plan</span>
        </span>
      </Note>
      {/* The grid's rules. */}
      <div style={{ position: "absolute", left, top: top + CELL_H - 1, width: gridW * ease(frame, downAt, 14), height: 1.5, background: INK }} />
      {DIMENSIONS.map((d, j) => (
        <div
          key={d}
          style={{
            position: "absolute",
            left: colLeft(j),
            width: CELL_W,
            top,
            height: CELL_H,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            ...label(22, BLUE_INK),
            fontWeight: 700,
            opacity: ease(frame, acrossAt + j * 3, 10),
          }}
        >
          {d}
        </div>
      ))}
      {/* The shared columns, highlighted across two processes, under the ticks. */}
      {shared.map((d) => {
        const j = DIMENSIONS.indexOf(d);
        const p = ease(frame, sharedAt + 2 + j * 4, 12);
        return (
          <div
            key={d}
            style={{
              position: "absolute",
              left: colLeft(j) + 10,
              top: rowTop(0) + 6,
              width: CELL_W - 20,
              height: (2 * CELL_H - 12) * p,
              background: HIGHLIGHT,
              borderRadius: 6,
              opacity: 0.7 * p,
            }}
          />
        );
      })}
      {PROCESSES.map((p, i) => (
        <React.Fragment key={p}>
          <div
            style={{
              position: "absolute",
              left,
              width: LABEL_W,
              top: rowTop(i),
              height: CELL_H,
              display: "flex",
              alignItems: "center",
              ...label(23, INK),
              fontWeight: 700,
              opacity: ease(frame, downAt + i * 3, 10),
            }}
          >
            {p}
          </div>
          <div style={{ position: "absolute", left, top: rowTop(i + 1) - 1, width: gridW * ease(frame, downAt + i * 3, 12), height: 1, background: `color-mix(in srgb, ${INK} 20%, transparent)` }} />
          {DIMENSIONS.map((d, j) =>
            // A tick not yet due is not drawn: its zero-length dash still paints a round cap.
            USES[p].includes(d) && frame >= tickAt + i * 5 + j * 2 ? (
              <div key={d} style={{ position: "absolute", left: colLeft(j) + CELL_W / 2 - 13, top: rowTop(i) + CELL_H / 2 - 13 }}>
                <Tick at={tickAt + i * 5 + j * 2} size={26} color={INK} />
              </div>
            ) : null,
          )}
        </React.Fragment>
      ))}
      {/* The sales mart: one row, built. */}
      <div
        style={{
          position: "absolute",
          left: left - 12,
          top: rowTop(0) + 2,
          width: (gridW + 24) * mart,
          height: CELL_H - 4,
          boxSizing: "border-box",
          border: `3px solid ${OK}`,
          borderRadius: 8,
          opacity: mart,
        }}
      />
      <Note at={martAt} x={R_X} y={rowTop(PROCESSES.length) + c.h(28)}>
        <span style={{ ...label(26, OK_INK), fontWeight: 700, whiteSpace: "nowrap" }}>
          Data mart <span style={{ ...note(22, INK_SOFT), fontWeight: 500 }}>· what gets built</span>
        </span>
      </Note>
      <Note at={salesAt} x={R_X} y={rowTop(PROCESSES.length) + c.h(78)}>
        <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>the slice of the warehouse for one domain: sales</span>
      </Note>
      <Note at={combinedAt} x={R_X} y={rowTop(PROCESSES.length) + c.h(130)}>
        <span style={{ ...note(24, BLUE_INK), fontWeight: 650, whiteSpace: "nowrap" }}>shared dimensions let two marts be combined</span>
      </Note>
    </>
  );
};

// ── 14. A date dimension ───────────────────────────────────────────────────

const DateDim: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const whyAt = c.w("r-date", "Why a date dimension");
  const rulesAt = c.w("r-date", "Fiscal quarters and holidays are business rules");
  const onceAt = c.w("r-date", "Store them once, in a table");
  const filtersAt = c.w("r-date", "just filters and groups");
  const pageAt = c.w("r-date", "On the page's orders");
  const oneJoinAt = c.w("r-date", "one join and no date math");
  const lines = linesOf(BY_QUARTER);
  const SIZE = 22;
  const top = c.y(372);
  const g = geoOf(BY_QUARTER, R_X, top + listingHeight(lines.length, SIZE) + c.h(52), c.h, { headH: 44, rowH: 46, bodySize: 23 });
  return (
    <>
      <Note at={whyAt} x={R_X} y={c.y(330) - 4}>
        <span style={{ ...note(23, INK_SOFT), whiteSpace: "nowrap" }}>
          the page&apos;s <Mono>dim_date</Mono>: <span style={{ opacity: ease(frame, rulesAt, 10) }}>fiscal quarters and {HOLIDAYS} holidays, stored once</span>
        </span>
      </Note>
      <Listing
        lines={lines}
        x={R_X}
        top={top}
        width={760}
        size={SIZE}
        at={onceAt}
        marks={[
          { line: lineOf(lines, "JOIN dim_date"), at: oneJoinAt, color: MARK_OK },
          { line: lineOf(lines, "is_holiday"), at: filtersAt },
          { line: lineOf(lines, "GROUP BY"), at: filtersAt + 6 },
        ]}
      />
      <DataTable
        g={g}
        cols={colsOf(BY_QUARTER)}
        at={pageAt}
        rows={BY_QUARTER.rows.map((cells, i) => ({ cells, at: pageAt + 4 + i * 3 }))}
        marks={[]}
      />
      <Note at={oneJoinAt + 4} x={g.right + 40} y={g.top + c.h(30)}>
        <span style={{ ...note(25, OK_INK), fontWeight: 700, whiteSpace: "nowrap" }}>
          one join,
          <br />
          no date math
        </span>
      </Note>
    </>
  );
};

// ── 15. A measure and a metric ─────────────────────────────────────────────

const Metric: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const measureAt = c.w("r-metric", "A measure is a raw column");
  const revenueAt = c.w("r-metric", "like revenue");
  const metricAt = c.w("r-metric", "A metric is a business definition");
  const aovAt = c.w("r-metric", "like average order value");
  const overAt = c.w("r-metric", "revenue over orders");
  const onceAt = c.w("r-metric", "Define each metric once");
  const withAt = c.w("r-metric", "a hundred eighty-six dollars with holidays");
  const withoutAt = c.w("r-metric", "a hundred sixty-three without");
  const teamsAt = c.w("r-metric", "two teams could each report one");
  const col = (t: typeof AOV_ALL, k: string) => t.rows[0][t.cols.indexOf(k)];
  const teams = [
    { who: "all orders", t: AOV_ALL, at: withAt },
    { who: "no holidays", t: AOV_WORKING, at: withoutAt },
  ];
  return (
    <>
      <PanelHead at={measureAt} x={R_X} y={c.y(346)} width={900} sub={<>a raw column on a fact table</>} subAt={measureAt + 6}>
        Measure
      </PanelHead>
      <Note at={revenueAt} x={R_X} y={c.y(438)}>
        <span style={{ fontFamily: "inherit", ...note(26, INK), whiteSpace: "nowrap" }}>
          <Mono>fact_orders.amount</Mono> <span style={{ color: INK_SOFT }}>· revenue</span>
        </span>
      </Note>
      <PanelHead at={metricAt} x={R_X} y={c.y(510)} width={900} sub={<>a business definition, built from measures</>} subAt={metricAt + 6}>
        Metric
      </PanelHead>
      <Note at={aovAt} x={R_X} y={c.y(602)}>
        <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>
          average order value
          <span style={{ opacity: ease(frame, overAt, 10) }}>
            {" "}
            = <Mono>revenue / orders</Mono>
          </span>
        </span>
      </Note>
      {teams.map((tm, i) => (
        <Note key={tm.who} at={tm.at} x={R_X + i * 420} y={c.y(680)}>
          <div style={{ ...label(22, INK_SOFT), fontWeight: 650, whiteSpace: "nowrap" }}>
            team {i === 0 ? "A" : "B"}: {tm.who}
          </div>
          <div style={{ ...note(22, INK_SOFT), marginTop: 6, whiteSpace: "nowrap" }}>
            <Num>{money(col(tm.t, "revenue"))}</Num> / <Num>{col(tm.t, "orders")}</Num> ={" "}
            <b style={{ fontSize: 32, color: ACCENT_INK }}>
              <Num>{money(col(tm.t, "aov"))}</Num>
            </b>
          </div>
        </Note>
      ))}
      <Note at={teamsAt} x={R_X} y={c.y(800)}>
        <span style={{ ...note(24, ACCENT_INK), fontWeight: 700, whiteSpace: "nowrap" }}>one name, two numbers</span>
      </Note>
      <Note at={onceAt} x={R_X} y={c.y(850)}>
        <span style={{ ...note(25, OK_INK), fontWeight: 700, whiteSpace: "nowrap", background: PAPER }}>Define each metric once, in one shared place.</span>
      </Note>
    </>
  );
};

/**
 * The quick round: five questions down the left, each answer on the right
 * while it is read, then the bridge into Part 4 with the starfish back.
 */
export const RapidScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();
  const c: Ctx = { w: n.word, y, h };

  const from = n.beat("rapid-in").from;
  const fiveAt = n.word("rapid-in", "Five quick ones");
  const sharedAt = n.word("rapid-in", "one model shared by many teams");
  const nextFrom = n.beat("next").from;
  const end = nextFrom - 4;
  const fixedAt = n.word("next", "treated a dimension as fixed");
  const moveAt = n.word("next", "customers move");
  const renamedAt = n.word("next", "products get renamed");
  const historyAt = n.word("next", "keep history");
  const nextAt = n.word("next", "Next:");

  const items: RapidItem[] = [
    { n: 11, label: "A conformed dimension", at: n.word("r-conformed", "A conformed dimension"), body: <Conformed c={c} /> },
    { n: 12, label: "Wide or narrow tables", at: n.word("r-wide", "A wide table"), body: <Wide c={c} /> },
    { n: 13, label: "Bus matrix or data mart", at: n.word("r-bus", "A bus matrix"), body: <Bus c={c} /> },
    { n: 14, label: "A date dimension", at: n.word("r-date", "Why a date dimension"), body: <DateDim c={c} /> },
    { n: 15, label: "Measure or metric", at: n.word("r-metric", "A measure is a raw column"), body: <Metric c={c} /> },
  ];
  const listBottom = y(LIST_TOP) + items.length * h(ROW);

  return (
    <AbsoluteFill>
      <Sfx name="el-chime" at={fiveAt} level={-36} />
      {items.map((it) => (
        <Sfx key={it.n} name="el-tap" at={it.at} level={-36} />
      ))}
      <Sfx name="el-whoosh" at={fixedAt} level={-35} />
      <Sfx name="el-pop" at={nextAt} level={-34} />

      <Drift from={from} to={n.beat("next").to + 40}>
        <Kicker at={fiveAt}>Quick round</Kicker>
        <Headline lead="Five quick ones." turn="One model, many teams." at={fiveAt} turnAt={sharedAt - 2} size={64} />
        <RapidFire items={items} x={X0} top={y(LIST_TOP)} rowH={h(ROW)} width={620} at={fiveAt + 6} end={end} />

        {/* ── The bridge ── */}
        <Note at={fixedAt} x={X0} y={listBottom + h(36)}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>Every answer treated a dimension as fixed.</span>
        </Note>
        <Note at={moveAt} x={X0} y={listBottom + h(82)}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>
            Customers move <QMono>Boston → Austin</QMono>
            <span style={{ opacity: ease(frame, renamedAt, 10) }}>, products get renamed.</span>
          </span>
        </Note>
        <Note at={historyAt} x={X0} y={listBottom + h(128)}>
          <span style={{ ...note(26, BLUE_INK), fontWeight: 700, whiteSpace: "nowrap" }}>The model has to keep history.</span>
        </Note>
        <NextLine at={nextAt} x={X0} y={listBottom + h(184)} width={900}>
          modeling history
        </NextLine>
        <Spot id={HERO.id} at={fixedAt + 4} left={1180} top={y(330)} width={560} height={Math.round((560 * HERO.h) / HERO.w)} />
      </Drift>
    </AbsoluteFill>
  );
};
