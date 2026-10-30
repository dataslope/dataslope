import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { Entity, Relation, useEntityLayout } from "../../editorial/erd";
import { QMono, RapidFire, type RapidItem } from "../../editorial/interview";
import { type Layout, useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, INK, INK_SOFT, PAPER, label, note } from "../../editorial/style";
import { NextLine, Note, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ds } from "../../theme/brand";
import { MONO } from "../../theme/fonts";
import { HERO, mb, RAPID } from "./data";
import { colsOf, DataTable, Drift, geoOf, Headline, Kicker, MARK, MARK_KEY, OK_INK, Spot, TableName, X0 } from "./parts";

const R_X = 820;
const LIST_TOP = 340;
const ROW = 64;
const ROWS = { headH: 42, rowH: 46, bodySize: 23, headSize: 20 } as const;

type Ctx = { w: (beat: string, phrase: string) => number; y: Layout["y"]; h: Layout["h"] };

// ── 10. Degenerate dimension ────────────────────────────────────────────────

const Degenerate: React.FC<{ c: Ctx }> = ({ c }) => {
  const noTableAt = c.w("r-degen", "a dimension with no table behind it");
  const invoiceAt = c.w("r-degen", "an invoice number kept on the fact");
  const groupAt = c.w("r-degen", "You still group by it");
  const L = RAPID.lines;
  const gl = geoOf(L, R_X, c.y(400), c.h, ROWS);
  const D = RAPID.degenerate;
  const gd = geoOf(D, gl.right + 60, c.y(400), c.h, ROWS);
  return (
    <>
      <TableName g={gl} at={noTableAt - 2}>
        fact_order_lines
      </TableName>
      <DataTable
        g={gl}
        cols={colsOf(L)}
        at={noTableAt - 2}
        rows={L.rows.map((cells, i) => ({ cells, at: noTableAt + 2 + i * 3 }))}
        marks={L.rows.map((_, row) => ({ row, col: 0, at: invoiceAt + 4 + row * 2 }))}
      />
      <Note at={invoiceAt + 8} x={gl.x} y={gl.rowTop(L.rows.length) + c.h(16)}>
        <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>
          <QMono>order_number</QMono> lives on the fact: no table behind it
        </span>
      </Note>
      <TableName g={gd} at={groupAt - 10}>
        grouped by it, no join
      </TableName>
      <DataTable g={gd} cols={colsOf(D)} at={groupAt - 10} rows={D.rows.map((cells, i) => ({ cells, at: groupAt - 6 + i * 3 }))} />
    </>
  );
};

// ── 11. Junk dimension ──────────────────────────────────────────────────────

const Chip: React.FC<{ children: React.ReactNode; at: number }> = ({ children, at }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 10);
  return (
    <div
      style={{
        opacity: p,
        transform: `translateY(${(1 - p) * 8}px)`,
        fontFamily: MONO,
        fontSize: 22,
        fontWeight: 600,
        color: INK,
        border: `1.5px solid ${INK}`,
        borderRadius: 6,
        padding: "4px 12px",
        background: PAPER,
        whiteSpace: "nowrap",
        textAlign: "center",
      }}
    >
      {children}
    </div>
  );
};

const Junk: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const flagsAt = c.w("r-junk", "gathers small flags");
  const payAt = c.w("r-junk", "payment type");
  const giftAt = c.w("r-junk", "gift or not");
  const webAt = c.w("r-junk", "web or store");
  const everyAt = c.w("r-junk", "every combination");
  const twelveAt = c.w("r-junk", "twelve rows");
  const oneAt = c.w("r-junk", "one key instead of three");
  const groups = [
    { name: "payment", values: ["card", "cash", "voucher"], at: payAt },
    { name: "is_gift", values: ["true", "false"], at: giftAt },
    { name: "channel", values: ["web", "store"], at: webAt },
  ];
  const top = c.y(400);
  return (
    <>
      <Note at={flagsAt} x={R_X} y={top - c.h(56)}>
        <span style={{ ...label(22, INK_SOFT), whiteSpace: "nowrap" }}>small flags, each a column on the fact</span>
      </Note>
      <div style={{ position: "absolute", left: R_X, top, display: "flex", alignItems: "flex-start", gap: 26 }}>
        {groups.map((g, i) => (
          <React.Fragment key={g.name}>
            {i ? <div style={{ ...note(34, INK_SOFT), marginTop: 50, opacity: ease(frame, g.at, 10) }}>×</div> : null}
            <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "stretch" }}>
              <div style={{ ...label(21, INK_SOFT), fontWeight: 700, opacity: ease(frame, g.at - 2, 10), whiteSpace: "nowrap" }}>{g.name}</div>
              {g.values.map((v, j) => (
                <Chip key={v} at={g.at + 2 + j * 3}>
                  {v}
                </Chip>
              ))}
            </div>
          </React.Fragment>
        ))}
        <div style={{ ...note(34, INK_SOFT), marginTop: 50, opacity: ease(frame, everyAt, 10) }}>=</div>
        <div style={{ marginTop: 36, opacity: ease(frame, twelveAt - 2, 10), whiteSpace: "nowrap" }}>
          <span style={{ ...note(46, BLUE_INK), fontWeight: 750 }}>
            <Num>{RAPID.junk}</Num>
          </span>
          <span style={{ ...note(26, INK), marginLeft: 10 }}>rows in dim_junk</span>
        </div>
      </div>
      <Note at={oneAt} x={R_X} y={c.y(660)}>
        <span style={{ ...note(25, OK_INK), fontWeight: 700, whiteSpace: "nowrap" }}>
          the fact carries one <QMono>junk_key</QMono> instead of three columns
        </span>
      </Note>
    </>
  );
};

// ── 12. Role-playing dimension ──────────────────────────────────────────────

const Role: React.FC<{ c: Ctx }> = ({ c }) => {
  const oneAt = c.w("r-role", "one table in several roles");
  const dateAt = c.w("r-role", "the date dimension");
  const orderAt = c.w("r-role", "once as the order date");
  const shipAt = c.w("r-role", "once as the ship date");
  const S = RAPID.shipments;
  const gs = geoOf(S, R_X, c.y(380), c.h, ROWS);
  const D = RAPID.dates;
  const gd = geoOf(D, R_X, c.y(560), c.h, ROWS);
  const R = RAPID.role;
  const gr = geoOf(R, gd.right + 70, c.y(560), c.h, ROWS);
  return (
    <>
      <TableName g={gs} at={oneAt}>
        fact_shipments
      </TableName>
      <DataTable
        g={gs}
        cols={colsOf(S)}
        at={oneAt}
        rows={[{ cells: S.rows[0], at: oneAt + 4 }]}
        marks={[
          { row: 0, col: 1, at: orderAt + 4 },
          { row: 0, col: 2, at: shipAt + 4, color: MARK_KEY },
        ]}
      />
      <TableName g={gd} at={dateAt}>
        dim_date, one table
      </TableName>
      <DataTable
        g={gd}
        cols={colsOf(D)}
        at={dateAt}
        rows={D.rows.map((cells, i) => ({ cells, at: dateAt + 4 + i * 3 }))}
        bands={[
          { row: 0, at: orderAt + 8 },
          { row: 1, at: shipAt + 8, color: MARK_KEY },
        ]}
      />
      <TableName g={gr} at={orderAt}>
        joined twice
      </TableName>
      <DataTable
        g={gr}
        cols={colsOf(R)}
        at={orderAt}
        rows={[{ cells: R.rows[0], at: orderAt + 4 }]}
        marks={[
          { row: 0, col: 1, at: orderAt + 12, color: MARK },
          { row: 0, col: 2, at: shipAt + 12, color: MARK_KEY },
        ]}
      />
    </>
  );
};

// ── 13. Mini-dimension ──────────────────────────────────────────────────────

const Mini: React.FC<{ c: Ctx }> = ({ c }) => {
  const movesAt = c.w("r-mini", "moves fast-changing attributes");
  const ageAt = c.w("r-mini", "like age band and income tier");
  const bigAt = c.w("r-mini", "out of a big customer dimension");
  const smallAt = c.w("r-mini", "into a small one");
  const twentyAt = c.w("r-mini", "twenty rows here");
  const keyAt = c.w("r-mini", "with its own key on the fact");
  const stopsAt = c.w("r-mini", "stops growing a new version");
  const dimC = useEntityLayout({
    x: 1360,
    y: c.y(340),
    width: 340,
    name: "dim_customer",
    columns: [{ name: "customer_key", key: "PK" }, { name: "name" }, { name: "city" }],
  });
  const dimD = useEntityLayout({
    x: 1360,
    y: c.y(580),
    width: 340,
    name: "dim_demographics",
    columns: [{ name: "demo_key", key: "PK" }, { name: "age_band" }, { name: "income_tier" }],
  });
  const fact = useEntityLayout({
    x: R_X,
    y: c.y(430),
    width: 330,
    name: "fact_orders",
    columns: [{ name: "customer_key", key: "FK" }, { name: "demo_key", key: "FK" }, { name: "amount" }],
  });
  const cA = dimC.anchor("left", "customer_key");
  const fA = fact.anchor("right", "customer_key");
  const dA = dimD.anchor("left", "demo_key");
  const fB = fact.anchor("right", "demo_key");
  return (
    <>
      <Entity layout={dimC} at={bigAt - 4} />
      <Entity layout={fact} at={movesAt + 6} rowAt={{ customer_key: movesAt + 12, demo_key: keyAt, amount: movesAt + 18 }} marks={{ demo_key: { at: keyAt + 6, tone: "key" } }} />
      <Entity layout={dimD} at={smallAt - 2} marks={{ age_band: { at: smallAt + 8 }, income_tier: { at: smallAt + 12 } }} />
      <Relation name="customer to fact" points={[cA, [1290, cA[1]], [1290, fA[1]], fA]} from="exactly-one" to="zero-or-many" at={bigAt + 6} />
      <Relation name="demographics to fact" points={[dA, [1240, dA[1]], [1240, fB[1]], fB]} from="exactly-one" to="zero-or-many" at={keyAt + 2} />
      <Note at={ageAt} x={R_X} y={c.y(340)}>
        <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>age band, income tier: change often</span>
      </Note>
      <Note at={twentyAt} x={dimD.x} y={dimD.bottom + c.h(14)}>
        <span style={{ ...note(23, BLUE_INK), fontWeight: 700, whiteSpace: "nowrap" }}>
          <Num>5</Num> bands × <Num>4</Num> tiers = <Num>{RAPID.mini}</Num> rows
        </span>
      </Note>
      <Note at={stopsAt} x={R_X} y={fact.bottom + c.h(30)}>
        <span style={{ ...note(24, OK_INK), fontWeight: 700, whiteSpace: "nowrap" }}>
          no new customer version
          <br />
          when a band changes
        </span>
      </Note>
    </>
  );
};

// ── 14. Factless fact table ─────────────────────────────────────────────────

const Factless: React.FC<{ c: Ctx }> = ({ c }) => {
  const noneAt = c.w("r-factless", "no measures at all");
  const eventAt = c.w("r-factless", "one row per event");
  const countAt = c.w("r-factless", "Counting the rows is the measure");
  const A = RAPID.factless;
  const ga = geoOf(A, R_X, c.y(400), c.h, ROWS);
  const C = RAPID.factlessCount;
  const gc = geoOf(C, ga.right + 60, c.y(400), c.h, ROWS);
  return (
    <>
      <TableName g={ga} at={noneAt - 2}>
        attendance
      </TableName>
      <DataTable g={ga} cols={colsOf(A)} at={noneAt - 2} rows={A.rows.map((cells, i) => ({ cells, at: eventAt + i * 4 }))} />
      <Note at={noneAt + 6} x={ga.x} y={ga.rowTop(A.rows.length) + c.h(16)}>
        <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>keys and a date, no measure column</span>
      </Note>
      <TableName g={gc} at={countAt - 2}>
        <QMono>COUNT(*)</QMono> per class
      </TableName>
      <DataTable g={gc} cols={colsOf(C)} at={countAt - 2} rows={C.rows.map((cells, i) => ({ cells, at: countAt + 2 + i * 3 }))} />
    </>
  );
};

// ── 15. Sequence or UUID ────────────────────────────────────────────────────

const Uuid: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const seqAt = c.w("r-uuid", "a surrogate key from a sequence");
  const orderAt = c.w("r-uuid", "handed out in order");
  const compactAt = c.w("r-uuid", "compact and quick to join");
  const uuidAt = c.w("r-uuid", "a UUID, a universally unique identifier");
  const bytesAt = c.w("r-uuid", "sixteen bytes");
  const counterAt = c.w("r-uuid", "without a shared counter");
  const manyAt = c.w("r-uuid", "many sources insert at once");
  const costAt = c.w("r-uuid-cost", "The cost shows in the index");
  const randomAt = c.w("r-uuid-cost", "a hundred thousand random UUIDs");
  const twiceAt = c.w("r-uuid-cost", "almost twice the size");
  const v7At = c.w("r-uuid-cost", "Time-ordered version seven UUIDs");
  const betweenAt = c.w("r-uuid-cost", "land in between");
  const U = RAPID.uuid;
  const keyBox = (top: number, at: number, value: string, name: string, bytes: number, bytesAt: number, kind: string) => (
    <Note at={at} x={R_X} y={top}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 18, whiteSpace: "nowrap" }}>
        <span style={{ ...label(22, INK_SOFT), width: 120 }}>{name}</span>
        <span style={{ fontFamily: MONO, fontSize: 26, fontWeight: 600, color: INK, border: `1.5px solid ${INK}`, borderRadius: 6, padding: "4px 12px" }}>{value}</span>
        <span style={{ ...note(23, BLUE_INK), fontWeight: 700, opacity: ease(frame, bytesAt, 10) }}>
          {kind ? `${kind}, ` : ""}
          <Num>{bytes}</Num> bytes
        </span>
      </div>
    </Note>
  );
  // The index sizes as bars, longest the random UUIDs'.
  const BAR_X = R_X + 230;
  const unit = 540 / U.random;
  const bars = [
    { name: "sequence", v: U.sequence, at: costAt + 6, fill: BAR, ink: BLUE_INK },
    { name: "random UUID", v: U.random, at: randomAt + 4, fill: ACCENT, ink: ACCENT_INK },
    { name: "UUID v7", v: U.v7, at: v7At + 4, fill: ds("blue", 300), ink: BLUE_INK },
  ];
  const barTop = c.y(660);
  const barH = c.h(40);
  const step = c.h(62);
  return (
    <>
      {keyBox(c.y(370), seqAt, U.seqSample, "sequence", U.bigint, compactAt, "a bigint")}
      <Note at={orderAt} x={R_X + 140} y={c.y(370) + c.h(52)}>
        <span style={{ ...label(21, INK_SOFT), whiteSpace: "nowrap" }}>1, 2, 3, … in order</span>
      </Note>
      {keyBox(c.y(470), uuidAt, U.sample, "UUID", U.uuid, bytesAt, "")}
      <Note at={counterAt} x={R_X + 140} y={c.y(470) + c.h(52)}>
        <span style={{ ...label(21, INK_SOFT), whiteSpace: "nowrap" }}>
          made anywhere, no shared counter
          <span style={{ opacity: ease(frame, manyAt, 10) }}>: many sources at once</span>
        </span>
      </Note>
      <Note at={costAt} x={R_X} y={barTop - c.h(48)}>
        <span style={{ ...label(21, INK_SOFT), whiteSpace: "nowrap" }}>
          primary key index, <Num>100,000</Num> rows, Postgres <Num>18</Num>
        </span>
      </Note>
      {bars.map((b, i) => {
        const p = ease(frame, b.at, 16);
        const top = barTop + i * step;
        return (
          <React.Fragment key={b.name}>
            <div style={{ position: "absolute", left: R_X, top, height: barH, display: "flex", alignItems: "center", ...label(22, INK), fontWeight: 650, whiteSpace: "nowrap", opacity: ease(frame, b.at - 4, 10) }}>
              {b.name}
            </div>
            <div style={{ position: "absolute", left: BAR_X, top, width: b.v * unit * p, height: barH, background: b.fill, borderRadius: 3 }} />
            <div
              style={{
                position: "absolute",
                left: BAR_X + b.v * unit * p + 14,
                top,
                height: barH,
                display: "flex",
                alignItems: "center",
                ...note(23, b.ink),
                fontWeight: 700,
                whiteSpace: "nowrap",
                opacity: ease(frame, b.at + 10, 10),
              }}
            >
              <Num>{mb(b.v)}</Num>&nbsp;MB
              {b.v === U.random ? (
                <span style={{ marginLeft: 12, opacity: ease(frame, twiceAt, 10) }}>
                  (<Num>{(U.random / U.sequence).toFixed(2)}</Num>×)
                </span>
              ) : null}
            </div>
          </React.Fragment>
        );
      })}
      <Note at={betweenAt} x={BAR_X + U.v7 * unit + 130} y={barTop + 2 * step}>
        <span style={{ ...note(23, BLUE_INK), fontWeight: 650, whiteSpace: "nowrap" }}>in between</span>
      </Note>
    </>
  );
};

/**
 * The quick round: six special cases down the left, each answer on the right
 * while it is read, every table from a DuckDB run (the index sizes from
 * Postgres); then the bridge into Part 5, with the chameleon back.
 */
export const RapidScene: React.FC = () => {
  const n = useNarration();
  const { y, h } = useLayout();
  const c: Ctx = { w: n.word, y, h };

  const from = n.beat("rapid-in").from;
  const lastAt = n.word("rapid-in", "The last six are special cases");
  const eachAt = n.word("rapid-in", "a sentence or two each");
  const jobAt = n.word("next", "filled by a load job");
  // The last answer holds into the bridge's first words, so the version 7
  // bar stays up after "in between"; the bridge's notes take over on "filled".
  const end = jobAt - 4;
  const closeAt = n.word("next", "close a version");
  const placeAt = n.word("next", "insert a placeholder");
  const splitAt = n.word("next", "split a weight");
  const codeAt = n.word("next", "Loading the model takes code");
  const nextAt = n.word("next", "Next:");

  const items: RapidItem[] = [
    { n: 10, label: "Degenerate dimension", at: n.word("r-degen", "A degenerate dimension"), body: <Degenerate c={c} /> },
    { n: 11, label: "Junk dimension", at: n.word("r-junk", "A junk dimension"), body: <Junk c={c} /> },
    { n: 12, label: "Role-playing dimension", at: n.word("r-role", "A role-playing dimension"), body: <Role c={c} /> },
    { n: 13, label: "Mini-dimension", at: n.word("r-mini", "A mini-dimension"), body: <Mini c={c} /> },
    { n: 14, label: "Factless fact table", at: n.word("r-factless", "A factless fact table"), body: <Factless c={c} /> },
    { n: 15, label: "Sequence or UUID", at: n.word("r-uuid", "a surrogate key from a sequence"), body: <Uuid c={c} /> },
  ];
  const steps = [
    { text: "close a version", at: closeAt },
    { text: "insert a placeholder", at: placeAt },
    { text: "split a weight", at: splitAt },
  ];

  return (
    <AbsoluteFill>
      <Sfx name="el-chime" at={lastAt} level={-36} />
      {items.map((it) => (
        <Sfx key={it.n} name="el-tap" at={it.at} level={-37} />
      ))}
      {steps.map((s) => (
        <Sfx key={s.text} name="el-tap" at={s.at} level={-37} />
      ))}
      <Sfx name="el-pop" at={nextAt} level={-34} />

      <Drift from={from} to={n.beat("next").to + 40}>
        <Kicker at={lastAt}>Quick round</Kicker>
        <Headline lead="Six special cases." turn="A sentence or two each." at={lastAt} turnAt={eachAt - 2} size={64} />
        <RapidFire items={items} x={X0} top={y(LIST_TOP)} rowH={h(ROW)} width={620} at={lastAt + 6} end={end} />

        {/* The bridge. */}
        <Spot id={HERO.id} at={jobAt - 4} left={1360} top={y(330)} width={460} height={Math.round((460 * HERO.h) / HERO.w)} />
        <Note at={jobAt} x={R_X} y={y(380)}>
          <span style={{ ...note(27, INK), whiteSpace: "nowrap" }}>Every table here is filled by a load job:</span>
        </Note>
        {steps.map((s, i) => (
          <Note key={s.text} at={s.at - 2} x={R_X + 24} y={y(440) + i * h(46)}>
            <span style={{ ...note(25, BLUE_INK), fontWeight: 650, whiteSpace: "nowrap" }}>· {s.text}</span>
          </Note>
        ))}
        <Note at={codeAt} x={R_X} y={y(600)}>
          <span style={{ ...note(28, OK_INK), fontWeight: 700, whiteSpace: "nowrap" }}>Loading the model takes code.</span>
        </Note>
        <NextLine at={nextAt} x={R_X} y={y(690)} width={520}>
          Python for data engineering
        </NextLine>
      </Drift>
    </AbsoluteFill>
  );
};
