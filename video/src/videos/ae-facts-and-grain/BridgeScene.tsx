import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { Pt } from "../../components/arrow";
import { ease } from "../../components/motion";
import { Entity, Relation, useEntityLayout, type EntityColumn } from "../../editorial/erd";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, INK, INK_SOFT, note } from "../../editorial/style";
import { badgeStyle, Note, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { SANS } from "../../theme/fonts";
import { BRIDGE, type Table } from "./data";
import { Caption, colsOf, DataTable, Drift, geoOf, KEY, KeyArrow, Listing, MARK, MARK_OK, money, Mono, OK_INK, Spot, TableName, Verdict, X0 } from "./parts";

const ERD_Y = 330;
const FACT_W = 330;
const BRIDGE_X = 720;
const BRIDGE_W = 400;
const PROMO_X = 1330;
const PROMO_W = 360;
const LOW_Y = 590;
const ROWS = { headH: 42, rowH: 46, bodySize: 22, headSize: 20 } as const;
const TOTALS_X = 900;

const FACT_ONE: EntityColumn[] = [{ name: "order_sk", key: "PK" }, { name: "order_id" }, { name: "amount" }, { name: "promotion_sk", key: "FK" }];
const FACT: EntityColumn[] = [{ name: "order_sk", key: "PK" }, { name: "order_id" }, { name: "amount" }];
const BRIDGE_COLS: EntityColumn[] = [{ name: "order_sk", key: "FK" }, { name: "promotion_sk", key: "FK" }, { name: "weight_factor" }];
const PROMO: EntityColumn[] = [{ name: "promotion_sk", key: "PK" }, { name: "promotion_name" }];

/**
 * Question 9. An order with two promotions has room for one promotion key on
 * the fact; the page's bridge holds one row per order and promotion, 24
 * pairs for 12 orders, each with a weight (order 201's are 0.6 and 0.4).
 * Joined through it and summed, the 12 orders' 4,900.00 reports 11,505.00;
 * multiplied by the weight first, 4,900.00 exactly, every order's weights
 * adding to one. The unweighted sums still answer "how much revenue did each
 * promotion touch", per promotion, under a note never to total them. The
 * bridge spot pops in as the bridge is named.
 */
export const BridgeScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("bridge").from;
  const qAt = n.word("bridge", "Question nine");
  const textAt = n.word("bridge", "What is a bridge table");
  const severalAt = n.word("bridge", "relates to several members of a dimension");
  const twoAt = n.word("bridge", "an order with two promotions");
  const roomAt = n.word("bridge", "only has room for one promotion key");
  const pairsAt = n.word("bridge-pairs", "So a bridge table holds");
  const perAt = n.word("bridge-pairs", "one row per order and promotion");
  const countAt = n.word("bridge-pairs", "twenty-four pairs for twelve orders");
  const weightAt = n.word("bridge-pairs", "each with a weight");
  const joinAt = n.word("bridge-fan", "Join through it and sum the amount");
  const onceAt = n.word("bridge-fan", "every order counts once per promotion");
  const twelveAt = n.word("bridge-fan", "Twelve orders worth forty-nine hundred dollars");
  const reportAt = n.word("bridge-fan", "report eleven thousand five hundred five");
  const looksAt = n.word("bridge-fan", "nothing looks wrong");
  const multAt = n.word("bridge-weight", "Multiply by the weight first");
  const addAt = n.word("bridge-weight", "Each order's weights add up to one");
  const shareAt = n.word("bridge-weight", "the promotions share exactly forty-nine hundred");
  const stillAt = n.word("bridge-touched", "The unweighted sums still answer");
  const touchedAt = n.word("bridge-touched", "how much revenue each promotion touched");
  const neverAt = n.word("bridge-touched", "Just never total them");
  const end = n.beat("bridge-touched").to;

  // ── The ERD ──
  const bridge = useEntityLayout({ x: BRIDGE_X, y: y(ERD_Y), width: BRIDGE_W, name: "bridge_order_promotion", columns: BRIDGE_COLS });
  const factOne = useEntityLayout({ x: X0, y: y(ERD_Y), width: FACT_W, name: "fact_orders", columns: FACT_ONE });
  const fact = useEntityLayout({ x: X0, y: y(ERD_Y), width: FACT_W, name: "fact_orders", columns: FACT });
  // The promotion key's row level with the bridge's, so that relation runs straight.
  const promo = useEntityLayout({ x: PROMO_X, y: bridge.rows[1].mid - bridge.rows[0].mid + bridge.top, width: PROMO_W, name: "dim_promotion", columns: PROMO });
  const oneKey: Pt[] = (() => {
    const a = factOne.anchor("right", "promotion_sk");
    const b = promo.anchor("left", "promotion_sk");
    const mx = (a[0] + b[0]) / 2;
    return [a, [mx, a[1]], [mx, b[1]], b];
  })();

  // ── Order 201: one order, two bridge rows ──
  const O = BRIDGE.order201;
  const og = geoOf(O, X0, y(LOW_Y), h, ROWS);
  const B = BRIDGE.bridge201;
  const bg = geoOf(B, BRIDGE_X, y(LOW_Y), h, ROWS);
  const w = B.cols.indexOf("weight_factor");
  const weights = B.rows.map((r) => r[w]);
  const weightSum = weights.reduce((t, v) => t + Number(v), 0);
  if (Math.abs(weightSum - 1) > 1e-9) throw new Error("order 201's weights must add to one");
  const [orders, pairs] = BRIDGE.counts.rows[0];
  const orderId = O.rows[0][O.cols.indexOf("order_id")];
  const names = BRIDGE.read.rows.filter((r) => r[0] === orderId).map((r) => r[1]);
  const fan = BRIDGE.fanout.lines;
  const weighted = BRIDGE.weighted.lines;
  const listTop = y(760);
  const lowOut = stillAt - 2;

  // ── Per promotion: touched against allocated ──
  const P = BRIDGE.byPromotion;
  const perPromo: Table = { cols: P.cols, rows: P.rows.map((r) => [r[0], money(r[1]), money(r[2])]) };
  const pg = geoOf(perPromo, X0, y(LOW_Y) + h(14), h, { headH: 38, rowH: 40, bodySize: 22, headSize: 20 });
  const touchedCol = P.cols.indexOf("touched");
  const allocCol = P.cols.indexOf("allocated");
  const touchedSum = P.rows.reduce((t, r) => t + Number(r[touchedCol]), 0);
  if (touchedSum.toFixed(2) !== Number(BRIDGE.fanout.rows[0][0]).toFixed(2)) throw new Error("touched must total the fan-out");

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={twoAt + 4} level={-30} />
      <Sfx name="el-scratch" at={roomAt + 6} level={-35} />
      <Sfx name="el-pop" at={pairsAt} level={-30} />
      <Sfx name="el-pencil" at={perAt + 6} level={-36} />
      <Sfx name="el-tap" at={countAt} level={-31} />
      <Sfx name="el-sprinkle" at={onceAt + 2} level={-34} />
      <Sfx name="el-tap" at={reportAt + 4} level={-28} />
      <Sfx name="el-whoosh" at={multAt} level={-35} />
      <Sfx name="el-pop" at={shareAt + 6} level={-30} />
      <Sfx name="el-whoosh" at={stillAt} level={-35} />
      <Sfx name="el-chime" at={neverAt + 4} level={-35} />

      <Drift from={from} to={end + 30} scale={0.015}>
        <QuestionCard n={9} at={qAt - 4} textAt={textAt - 4} size={60}>
          What is a bridge table, and when do you need one?
        </QuestionCard>
        <Spot art="bridge" at={pairsAt} left={1600} top={y(178)} width={200} />

        {/* ── One key on the fact, several promotions ── */}
        <Entity layout={factOne} at={severalAt} out={pairsAt + 2} marks={{ promotion_sk: { at: roomAt + 4, tone: "warn" } }} />
        <Entity layout={promo} at={severalAt + 6} />
        <Relation name="one key" points={oneKey} from="zero-or-many" to="exactly-one" at={severalAt + 10} out={pairsAt} />
        <Note at={roomAt + 6} x={factOne.left} y={factOne.bottom + h(18)} out={pairsAt}>
          <span style={{ ...note(24, ACCENT_INK), fontWeight: 500, whiteSpace: "nowrap" }}>One promotion key: which one?</span>
        </Note>
        <Note at={twoAt} x={PROMO_X - 60} y={promo.bottom + h(26)} out={pairsAt}>
          <span style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 24, whiteSpace: "nowrap" }}>
            <span style={{ ...note(24, INK) }}>Order {orderId}:</span>
            {names.map((name, i) => (
              <span key={name} style={{ ...badgeStyle("blue", 24), fontFamily: SANS, opacity: ease(frame, twoAt + 4 + i * 6, 10) }}>
                {name}
              </span>
            ))}
          </span>
        </Note>

        {/* ── The bridge: one row per order and promotion ── */}
        <Entity layout={fact} at={pairsAt + 2} />
        <Entity layout={bridge} at={pairsAt} rowAt={{ order_sk: perAt, promotion_sk: perAt + 6, weight_factor: weightAt }} marks={{ weight_factor: { at: weightAt + 4, tone: "note" } }} />
        <Relation name="order" points={[fact.anchor("right", "order_sk"), bridge.anchor("left", "order_sk")]} from="exactly-one" to="one-or-many" at={perAt + 2} />
        <Relation name="promotion" points={[bridge.anchor("right", "promotion_sk"), promo.anchor("left", "promotion_sk")]} from="zero-or-many" to="exactly-one" at={perAt + 8} />

        <TableName g={og} at={perAt} out={lowOut}>
          Order {orderId}
        </TableName>
        <DataTable g={og} cols={colsOf(O)} at={perAt} out={lowOut} rows={O.rows.map((cells) => ({ cells, at: perAt + 4 }))} />
        <TableName g={bg} at={perAt + 6} out={lowOut}>
          Its bridge rows, of <Num>{pairs}</Num> pairs for <Num>{orders}</Num> orders
        </TableName>
        <DataTable
          g={bg}
          cols={colsOf(B)}
          at={perAt + 6}
          out={lowOut}
          rows={B.rows.map((cells, i) => ({ cells, at: perAt + 10 + i * 4 }))}
          marks={B.rows.map((_, row) => ({ row, col: w, at: weightAt + 6 + row * 3, color: MARK }))}
        />
        {B.rows.map((_, i) => (
          <KeyArrow key={i} from={[og.right + 12, og.rowMid(0)]} to={[bg.x - 12, bg.rowMid(i)]} at={perAt + 12 + i * 5} color={KEY} out={lowOut} />
        ))}
        <Note at={addAt} x={bg.right + 36} y={bg.rowTop(0) + h(8)} out={lowOut}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            {weights.map((v, i) => (
              <React.Fragment key={i}>
                {i ? " + " : ""}
                <Num>{v}</Num>
              </React.Fragment>
            ))}{" "}
            = <b style={{ color: OK_INK }}>1</b>
          </span>
        </Note>
        <Note at={addAt + 10} x={bg.right + 36} y={bg.rowTop(1) + h(8)} out={lowOut}>
          <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>For every one of the {orders}</span>
        </Note>

        {/* ── Summed through it: unweighted, then weighted ── */}
        {/* Each listing carries its own caption, matching the label of the
            total it gives: the red "Joined and summed", then the green
            "Weighted first". */}
        <Caption at={joinAt} x={X0} y={listTop - h(38)} out={multAt + 2}>
          Joined and summed
        </Caption>
        <Caption at={multAt + 10} x={X0} y={listTop - h(38)} out={lowOut}>
          Weighted first, then summed
        </Caption>
        <Listing lines={fan} x={X0} top={listTop} size={19} at={joinAt} out={multAt + 2} marks={[{ line: "SUM(f.amount)", text: "SUM(f.amount)", at: onceAt }]} />
        <Listing
          lines={weighted}
          x={X0}
          top={listTop}
          size={19}
          at={multAt + 2}
          out={lowOut}
          marks={[{ line: "weight_factor", text: "f.amount * b.weight_factor", at: multAt + 8, color: MARK_OK }]}
        />
        <Verdict at={twelveAt} x={TOTALS_X} y={listTop + h(4)} label={`${orders} orders, in the fact`} value={money(BRIDGE.total)} size={25} />
        <Verdict at={reportAt} x={TOTALS_X} y={listTop + h(50)} label="Joined and summed" value={money(BRIDGE.fanout.rows[0][0])} tone="bad" size={25} />
        <Note at={looksAt} x={TOTALS_X} y={listTop + h(98)} out={multAt - 4}>
          <span style={{ ...note(22, ACCENT_INK), whiteSpace: "nowrap" }}>No error, no warning</span>
        </Note>
        <Verdict at={shareAt} x={TOTALS_X} y={listTop + h(96)} label="Weighted first" value={money(BRIDGE.weighted.rows[0][0])} tone="ok" size={25} />

        {/* ── Per promotion: what each one touched ── */}
        <TableName g={pg} at={touchedAt - 4}>
          Per promotion
        </TableName>
        <Note at={neverAt} x={pg.xs[touchedCol] + 10} y={pg.top - h(38)}>
          <span style={{ ...note(21, ACCENT_INK), fontWeight: 500, whiteSpace: "nowrap" }}>never add these</span>
        </Note>
        <DataTable
          g={pg}
          cols={colsOf(perPromo)}
          at={touchedAt - 4}
          rows={perPromo.rows.map((cells, i) => ({ cells, at: touchedAt + i * 2 }))}
          marks={[
            // The touched sums are a right answer to their own question, so
            // they stay pointed at; only their total is the trap, which the
            // red note above them says.
            ...perPromo.rows.map((_, row) => ({ row, col: touchedCol, at: touchedAt + 8 + row * 2 })),
            ...perPromo.rows.map((_, row) => ({ row, col: allocCol, at: neverAt + 10, color: MARK_OK })),
          ]}
        />
        <Note at={neverAt + 8} x={pg.right + 40} y={pg.rowTop(0) + h(4)}>
          <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>
            <Mono>allocated</Mono> adds back to {money(BRIDGE.total)}
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
