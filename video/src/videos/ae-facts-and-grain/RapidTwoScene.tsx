import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import type { Pt } from "../../components/arrow";
import { ease, pop } from "../../components/motion";
import { Entity, Relation, useEntityLayout, type EntityColumn } from "../../editorial/erd";
import { RapidFire, Tick, type RapidItem } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, BAR, INK, INK_SOFT, label, note } from "../../editorial/style";
import { ColumnRule, Note, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { RAPID, SNOW } from "./data";
import { Box, Caption, colsOf, DataTable, Drift, Flow, geoOf, Kicker, KeyArrow, MARK_OK, money, Mono, OK_INK, SERIES, Strike, TableName, Verdict } from "./parts";
import { LIST_W, LIST_X, Q, R_X, ROW, RULE_X, type Ctx } from "./rapid";

const ROWS = { headH: 40, rowH: 40, bodySize: 22, headSize: 20 } as const;
const LIST_TOP = 250;
const BODY_TOP = 270;

// ── 17. Confirmed or conformed ──────────────────────────────────────────────

const Confirmed: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const askConfirmedAt = c.w("r-confirmed", "a confirmed versus");
  const askConformedAt = c.w("r-confirmed", "a conformed dimension");
  const vocabAt = c.w("r-confirmed", "It's a vocabulary check");
  const termAt = c.w("r-confirmed", "conformed is the term");
  const notAt = c.w("r-confirmed", "confirmed isn't one");
  const top = c.top + c.h(60);
  // Both words arrive in ink as the question names them; the answer then
  // ticks one green and strikes the other red.
  const ok = ease(frame, termAt, 12);
  const bad = ease(frame, notAt, 12);
  const mixInk = (to: string, p: number) => (p > 0 ? `color-mix(in srgb, ${to} ${Math.round(p * 100)}%, ${INK})` : INK);
  return (
    <>
      <Caption at={vocabAt} x={R_X} y={top}>
        A vocabulary check
      </Caption>
      <div style={{ position: "absolute", left: R_X, top: top + c.h(64), display: "flex", alignItems: "center", gap: 20, fontSize: 44, opacity: ease(frame, askConformedAt, 12) }}>
        <span style={{ ...note(44, mixInk(OK_INK, ok)), fontWeight: 500 }}>Conformed</span>
        {frame >= termAt + 4 ? <Tick at={termAt + 4} size={36} /> : null}
      </div>
      <div style={{ position: "absolute", left: R_X, top: top + c.h(150), opacity: ease(frame, askConfirmedAt, 12), fontSize: 44 }}>
        <span style={{ ...note(44, mixInk(ACCENT_INK, bad)) }}>
          <Strike at={notAt + 8}>Confirmed</Strike>
        </span>
      </div>
      <Note at={notAt + 10} x={R_X} y={top + c.h(240)}>
        <span style={{ ...note(24, INK_SOFT), whiteSpace: "nowrap" }}>Not a dimensional modeling term</span>
      </Note>
    </>
  );
};

// ── 18. Drilling across ─────────────────────────────────────────────────────

const Drill: React.FC<{ c: Ctx }> = ({ c }) => {
  const askAt = c.w("r-drill", "drilling across");
  const salesAt = c.w("r-drill", "like sales and returns");
  const rollAt = c.w("r-drill", "Roll each fact up");
  const ownAt = c.w("r-drill", "on its own");
  const joinAt = c.w("r-drill", "full outer join the results");
  const keyAt = c.w("r-drill", "on its key");
  const multAt = c.w("r-drill", "the facts would multiply");
  const W = 300;
  const L = R_X;
  const Rx = R_X + W + 120;
  const top = c.top + c.h(40);
  const sales = useEntityLayout({ x: L, y: top, width: W, name: "fact_sales", columns: [] });
  const returns = useEntityLayout({ x: Rx, y: top, width: W, name: "fact_returns", columns: [] });
  const rollY = sales.bottom + c.h(80);
  const BOX_H = 56;
  const joinW = 380;
  const joinX = (L + Rx + W) / 2 - joinW / 2;
  const joinY = rollY + BOX_H + c.h(90);
  const mid = (x: number) => x + W / 2;
  const down = (x: number, a: number, b: number): Pt[] => [
    [x, a],
    [x, b],
  ];
  const into = (x: number): Pt[] => [
    [x, rollY + BOX_H + 8],
    [x, rollY + BOX_H + c.h(40)],
    [joinX + joinW / 2 + (x < joinX + joinW / 2 ? -40 : 40), rollY + BOX_H + c.h(40)],
    [joinX + joinW / 2 + (x < joinX + joinW / 2 ? -40 : 40), joinY - 8],
  ];
  return (
    <>
      <Entity layout={sales} at={salesAt - 2} />
      <Entity layout={returns} at={salesAt + 8} />
      <Flow points={down(mid(L), sales.bottom + 8, rollY - 8)} at={rollAt + 2} />
      <Flow points={down(mid(Rx), returns.bottom + 8, rollY - 8)} at={rollAt + 8} />
      <Box x={L} y={rollY} w={W} h={BOX_H} at={rollAt + 10}>
        Sales per date
      </Box>
      <Box x={Rx} y={rollY} w={W} h={BOX_H} at={ownAt}>
        Returns per date
      </Box>
      <Flow points={into(mid(L))} at={joinAt} dur={18} />
      <Flow points={into(mid(Rx))} at={joinAt + 4} dur={18} />
      <Box x={joinX} y={joinY} w={joinW} h={BOX_H} at={keyAt} tone="ok" mono size={21}>
        FULL OUTER JOIN ON date_sk
      </Box>
      <Note at={askAt} x={L} y={top - c.h(44)}>
        <span style={{ ...label(22, INK_SOFT), fontWeight: 500, whiteSpace: "nowrap" }}>Two facts, one report</span>
      </Note>
      <Note at={multAt} x={L} y={joinY + BOX_H + c.h(40)}>
        <span style={{ ...note(24, ACCENT_INK), whiteSpace: "nowrap" }}>Joined row to row first, the facts would multiply</span>
      </Note>
    </>
  );
};

// ── 19. Grain or level of aggregation ───────────────────────────────────────

const Agg: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const askAt = c.w("r-agg", "a fact's grain");
  const grainAt = c.w("r-agg", "The grain is the finest detail");
  const orderAt = c.w("r-agg", "one row per order");
  const aggAt = c.w("r-agg", "Aggregation is how far a mart rolls it up");
  const intoAt = c.w("r-agg", "twenty-four orders into six categories");
  const martAt = c.w("r-agg", "That mart's own grain");
  const keepsAt = c.w("r-agg", "the fact keeps every order");
  const [orders] = SNOW.counts.rows[0];
  const count = Number(orders);
  const M = RAPID.mart;
  const SQ = 30;
  const GAP = 8;
  const COLS = 4;
  const top = c.top + c.h(80);
  const gridW = COLS * SQ + (COLS - 1) * GAP;
  const gridRows = Math.ceil(count / COLS);
  const mg = geoOf(M, R_X + gridW + 200, top, c.h, ROWS);
  if (M.rows.length !== Number(SNOW.counts.rows[0][2])) throw new Error("the mart has one row per category");
  const lit = ease(frame, keepsAt, 10) * (1 - ease(frame, keepsAt + 24, 14));
  return (
    <>
      <Caption at={askAt} x={R_X} y={top - c.h(42)}>
        <Mono>fact_orders</Mono>
        <span style={{ opacity: ease(frame, grainAt, 10) }}>
          : <Num>{orders}</Num> rows
        </span>
      </Caption>
      {Array.from({ length: count }, (_, i) => {
        const p = Math.min(1, pop(frame, orderAt + Math.floor(i / 2), fps, 16));
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: R_X + (i % COLS) * (SQ + GAP),
              top: top + Math.floor(i / COLS) * (SQ + GAP),
              width: SQ,
              height: SQ,
              borderRadius: 4,
              background: BAR,
              opacity: p * (0.75 + 0.25 * lit),
              transform: `scale(${0.6 + 0.4 * p})`,
            }}
          />
        );
      })}
      <Note at={orderAt + 6} x={R_X} y={top + gridRows * (SQ + GAP) + c.h(20)}>
        <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>
          Grain: <b>one row per order</b>
        </span>
      </Note>
      <KeyArrow from={[R_X + gridW + 24, top + c.h(90)]} to={[mg.x - 20, mg.rowMid(2)]} at={aggAt + 4} />
      <TableName g={mg} at={intoAt - 2}>
        A mart, by category
      </TableName>
      <DataTable g={mg} cols={colsOf(M)} at={intoAt - 2} rows={M.rows.map((cells, i) => ({ cells, at: intoAt + 2 + i * 3 }))} />
      <Note at={martAt} x={mg.x} y={mg.rowTop(M.rows.length) + c.h(20)}>
        <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>
          Its own grain: <b>one row per category</b>
        </span>
      </Note>
      <Note at={keepsAt} x={R_X} y={top + gridRows * (SQ + GAP) + c.h(64)}>
        <span style={{ ...note(23, OK_INK), fontWeight: 500, whiteSpace: "nowrap" }}>The fact keeps every order</span>
      </Note>
    </>
  );
};

// ── 20. Customers and accounts in a bank ────────────────────────────────────

const Bank: React.FC<{ c: Ctx }> = ({ c }) => {
  const askAt = c.w("r-bank", "in a bank data warehouse");
  const bridgeAt = c.w("r-bank", "A bridge between customers and the balance fact");
  const shareAt = c.w("r-bank", "with each owner's share");
  const unAt = c.w("r-bank", "Unweighted, a joint account counts twice");
  const wAt = c.w("r-bank", "Weighted, the customers add back");
  const totalAt = c.w("r-bank", "the bank's total");
  const Bal = RAPID.bankBalances;
  const Br = RAPID.bankBridge;
  const top = c.top + c.h(40);
  const balG = geoOf(Bal, R_X, top, c.h, ROWS);
  const brG = geoOf(Br, balG.right + 60, top, c.h, { headH: 40, rowH: 40, bodySize: 21, headSize: 19 });
  const acc = Br.cols.indexOf("account_sk");
  const counts = Br.rows.reduce<Record<string, number>>((m, r) => ({ ...m, [r[acc]]: (m[r[acc]] ?? 0) + 1 }), {});
  const joint = Object.keys(counts).find((k) => counts[k] > 1)!;
  const jointRows = Br.rows.map((r, i) => (r[acc] === joint ? i : -1)).filter((i) => i >= 0);
  const pct = Br.cols.indexOf("ownership_pct");
  const vTop = brG.rowTop(Br.rows.length) + c.h(50);
  const per = (t: typeof RAPID.bankWeighted) => t.rows.map((r) => `${r[0]} ${money(r[1])}`).join(" + ");
  return (
    <>
      <TableName g={balG} at={askAt}>
        <Mono>fact_account_balance</Mono>
      </TableName>
      <DataTable
        g={balG}
        cols={colsOf(Bal)}
        at={askAt}
        rows={Bal.rows.map((cells, i) => ({ cells, at: askAt + 6 + i * 3 }))}
        marks={Bal.rows.map((r, row) => (r[0] === joint ? { row, col: 0, at: unAt + 2 } : null)).filter((m) => m !== null)}
      />
      <TableName g={brG} at={bridgeAt + 4}>
        <Mono>bridge_customer_account</Mono>
      </TableName>
      <DataTable
        g={brG}
        cols={colsOf(Br)}
        at={bridgeAt + 4}
        rows={Br.rows.map((cells, i) => ({ cells, at: bridgeAt + 8 + i * 3 }))}
        marks={[
          ...jointRows.map((row) => ({ row, col: acc, at: unAt + 4 })),
          ...Br.rows.map((_, row) => ({ row, col: pct, at: shareAt + 2 + row * 2, color: MARK_OK })),
        ]}
      />
      <Verdict at={bridgeAt + 10} x={R_X} y={vTop} label="The bank holds" value={money(RAPID.bank)} size={24} />
      <Verdict
        at={unAt}
        x={R_X}
        y={vTop + c.h(52)}
        label={<>Unweighted, {per(RAPID.bankUnweighted)} =</>}
        value={money(RAPID.bankUnweightedTotal)}
        tone="bad"
        size={24}
      />
      <Verdict at={wAt} x={R_X} y={vTop + c.h(104)} label={<>Weighted, {per(RAPID.bankWeighted)} =</>} value={money(RAPID.bankWeightedTotal)} tone="ok" size={24} />
      <Note at={totalAt} x={R_X} y={vTop + c.h(152)}>
        <span style={{ ...note(23, OK_INK), whiteSpace: "nowrap" }}>The bank&apos;s own total, again</span>
      </Note>
    </>
  );
};

// ── 21. Third normal form, and why dimensions avoid it ──────────────────────

const PRODUCT_3NF: EntityColumn[] = [
  { name: "product_id", key: "PK" },
  { name: "category_id", key: "FK" },
];
const CATEGORY_3NF: EntityColumn[] = [
  { name: "category_id", key: "PK" },
  { name: "category" },
];
const PRODUCT_FOLDED: EntityColumn[] = [{ name: "product_id", key: "PK" }, { name: "category" }];

const Third: React.FC<{ c: Ctx }> = ({ c }) => {
  const askAt = c.w("r-3nf", "normalization in third normal form");
  const keyAt = c.w("r-3nf", "every column depends on the key");
  const onceAt = c.w("r-3nf", "so each fact is stored once");
  const breakAt = c.w("r-3nf", "Dimensions break it on purpose");
  const foldAt = c.w("r-3nf", "folding category into product");
  const joinsAt = c.w("r-3nf", "to save joins");
  const pipeAt = c.w("r-3nf", "because one pipeline writes them");
  const top = c.top + c.h(60);
  const product = useEntityLayout({ x: R_X, y: top, width: 300, name: "product", columns: PRODUCT_3NF });
  const category = useEntityLayout({ x: R_X, y: product.bottom + c.h(80), width: 300, name: "category", columns: CATEGORY_3NF });
  const folded = useEntityLayout({ x: R_X + 460, y: top + c.h(90), width: 320, name: "dim_product", columns: PRODUCT_FOLDED });
  return (
    <>
      <Caption at={askAt} x={R_X} y={top - c.h(42)}>
        Third normal form
      </Caption>
      <Entity layout={product} at={askAt + 4} />
      <Entity layout={category} at={askAt + 10} marks={{ category: { at: onceAt + 2, tone: "note" } }} />
      <Relation name="3nf" points={[product.anchor("bottom"), category.anchor("top")]} from="zero-or-many" to="exactly-one" at={keyAt} />
      <Note at={onceAt} x={R_X} y={category.bottom + c.h(18)}>
        <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>Each name stored once</span>
      </Note>
      <Caption at={breakAt} x={folded.left} y={top - c.h(42)}>
        A dimension, on purpose
      </Caption>
      <Flow points={[[R_X + 320, folded.anchor("left")[1]], [folded.left - 14, folded.anchor("left")[1]]]} at={foldAt} />
      <Entity layout={folded} at={foldAt + 6} marks={{ category: { at: foldAt + 14, tone: "note" } }} />
      <Note at={joinsAt} x={folded.left} y={folded.bottom + c.h(18)}>
        <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>One join fewer</span>
      </Note>
      <Note at={pipeAt} x={folded.left} y={folded.bottom + c.h(62)}>
        <span style={{ ...note(23, OK_INK), fontWeight: 500, whiteSpace: "nowrap" }}>One pipeline writes every copy</span>
      </Note>
    </>
  );
};

// ── 22. Kimball and Inmon ───────────────────────────────────────────────────

const Kimball: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const askKAt = c.w("r-kimball", "How does Kimball's approach");
  const askIAt = c.w("r-kimball", "differ from Inmon's");
  const kAt = c.w("r-kimball", "Kimball is bottom-up");
  const starAt = c.w("r-kimball", "a star per business process");
  const conformedAt = c.w("r-kimball", "joined by conformed dimensions");
  const fastAt = c.w("r-kimball", "so value comes fast");
  const iAt = c.w("r-kimball", "Inmon is top-down");
  const ewAt = c.w("r-kimball", "a normalized enterprise warehouse first");
  const martsAt = c.w("r-kimball", "then marts cut from it");
  const consistentAt = c.w("r-kimball", "It's more consistent");
  const slowAt = c.w("r-kimball", "slower to start");
  const COL = 390;
  const GAP = 60;
  const kx = R_X;
  const ix = R_X + COL + GAP;
  const top = c.top + c.h(40);
  const upperY = top + c.h(60);
  const lowerY = top + c.h(240);
  const BOX_H = 54;
  const small = (x: number, i: number) => x + i * 130;
  return (
    <>
      <Caption at={askKAt + 4} x={kx} y={top} color={INK}>
        Kimball<span style={{ opacity: ease(frame, kAt, 10) }}>: bottom-up</span>
      </Caption>
      {[0, 1, 2].map((i) => (
        <Box key={i} x={small(kx, i)} y={lowerY} w={110} h={BOX_H} at={starAt + i * 4}>
          Star
        </Box>
      ))}
      {[0, 1, 2].map((i) => (
        <Flow key={i} points={[[small(kx, i) + 55, lowerY - 8], [small(kx, i) + 55, upperY + BOX_H + 8]]} at={conformedAt + i * 3} />
      ))}
      <Box x={kx} y={upperY} w={370} h={BOX_H} at={conformedAt}>
        Conformed dimensions
      </Box>
      <Note at={fastAt} x={kx} y={lowerY + BOX_H + c.h(30)}>
        <span style={{ ...note(24, OK_INK), fontWeight: 500, whiteSpace: "nowrap" }}>Value comes fast</span>
      </Note>

      <ColumnRule x={ix - GAP / 2} top={top} height={c.h(380)} at={askIAt} />
      <Caption at={askIAt + 2} x={ix} y={top} color={INK}>
        Inmon<span style={{ opacity: ease(frame, iAt, 10) }}>: top-down</span>
      </Caption>
      <Box x={ix} y={upperY} w={370} h={BOX_H} at={ewAt}>
        Normalized warehouse
      </Box>
      {[0, 1, 2].map((i) => (
        <Flow key={i} points={[[small(ix, i) + 55, upperY + BOX_H + 8], [small(ix, i) + 55, lowerY - 8]]} at={martsAt + i * 3} />
      ))}
      {[0, 1, 2].map((i) => (
        <Box key={i} x={small(ix, i)} y={lowerY} w={110} h={BOX_H} at={martsAt + 6 + i * 3}>
          Mart
        </Box>
      ))}
      <Note at={consistentAt} x={ix} y={lowerY + BOX_H + c.h(30)}>
        <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
          More consistent<span style={{ color: INK_SOFT }}>,</span>
        </span>
      </Note>
      <Note at={slowAt} x={ix} y={lowerY + BOX_H + c.h(70)}>
        <span style={{ ...note(24, INK_SOFT), whiteSpace: "nowrap" }}>slower to start</span>
      </Note>
    </>
  );
};

/**
 * The rapid round, page two: questions 17 to 22. "Conformed" ticked and
 * "confirmed" struck; drilling across as two facts each rolled up to the
 * date and then full-outer-joined on its key; 24 orders as squares against
 * the six-row mart; the bank's joint account counted twice unweighted
 * (2,400.00) and once weighted (900.00 + 500.00); third normal form against
 * a dimension with category folded in; and Kimball's bottom-up stars beside
 * Inmon's top-down warehouse.
 */
export const RapidTwoScene: React.FC = () => {
  const n = useNarration();
  const { y, h } = useLayout();
  const c: Ctx = { w: (b, p, o) => n.word(b, p, o), y, h, top: y(BODY_TOP) };

  const from = n.beat("r-confirmed").from;
  const end = n.beat("r-kimball").to + 30;

  const items: RapidItem[] = [
    { n: 17, label: <Q>What is the difference between a confirmed vs. a conformed dimension?</Q>, beat: "r-confirmed", body: <Confirmed c={c} /> },
    { n: 18, label: <Q>What does &ldquo;drilling across&rdquo; mean in dimensional modeling?</Q>, beat: "r-drill", body: <Drill c={c} /> },
    { n: 19, label: <Q>What is the difference between a fact&apos;s grain and its level of aggregation?</Q>, beat: "r-agg", body: <Agg c={c} /> },
    {
      n: 20,
      label: <Q>How would you model a many-to-many relationship between customers and accounts in a bank data warehouse?</Q>,
      beat: "r-bank",
      body: <Bank c={c} />,
    },
    {
      n: 21,
      label: <Q>What is normalization in 3NF, and why does dimensional modeling deliberately avoid it for dimensions?</Q>,
      beat: "r-3nf",
      body: <Third c={c} />,
    },
    { n: 22, label: <Q>How does Kimball&apos;s approach differ from Inmon&apos;s?</Q>, beat: "r-kimball", body: <Kimball c={c} /> },
  ].map(({ beat, ...item }) => ({ ...item, at: n.beat(beat).from }));

  return (
    <AbsoluteFill>
      <Sfx name="el-whoosh" at={from - 4} level={-35} />
      {items.map((item) => (
        <Sfx key={item.n} name="el-tap" at={item.at} level={-33} />
      ))}

      <Drift from={from} to={end + 40} scale={0.01}>
        <Kicker at={from - 8}>{SERIES} · Questions 17 to 22, quick</Kicker>
        <RapidFire items={items} x={LIST_X} top={y(LIST_TOP)} rowH={h(ROW)} width={LIST_W} at={from - 6} end={end} />
        <ColumnRule x={RULE_X} top={y(LIST_TOP)} height={items.length * h(ROW)} at={from} />
      </Drift>
    </AbsoluteFill>
  );
};
