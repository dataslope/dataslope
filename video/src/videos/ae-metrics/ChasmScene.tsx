import React from "react";
import { AbsoluteFill } from "remotion";
import { Entity, Relation, useEntityLayout } from "../../editorial/erd";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, INK, INK_SOFT, label } from "../../editorial/style";
import { ColumnRule, Ink, Note, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { CHASM, FAN, money } from "./data";
import {
  DataTable,
  Drift,
  Flow,
  Listing,
  MARK_BAD,
  MARK_OK,
  Mono,
  noteLine,
  OK_INK,
  Spot,
  TableName,
  tableGeometry,
  X0,
} from "./parts";

const CHIPS_Y = 310;
const TABLES_Y = 450;
const PAY_X = 360;
const JOIN_X = 920;
const REF_X = 1340;
const PANEL_Y = 300;
const FIX_Y = 560;
const INNER_X = 1000;
const LEFT_X = 1440;

/**
 * Question 4, the chasm trap, on the video's own customers (the page names
 * payments and refunds but gives no rows). Payments and refunds, each one to
 * many into one customer. Ada's three payments (180.00) and two refunds
 * (30.00), joined at once: six rows, every payment beside every refund, and
 * 360.00 and 90.00. Then the difference, side by side: a fan trap has one
 * many-side and one measure inflated, a chasm trap two of each. The fix is
 * the same, each branch totalled first; and the step past the page: join the
 * totals to the customer with left joins, or Ben, who paid 40.00 and was
 * never refunded, drops out.
 */
export const ChasmScene: React.FC = () => {
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("chasm").from;
  const qAt = n.word("chasm", "Question");
  const textAt = n.word("chasm", "What is a chasm trap");
  const twoAt = n.word("chasm", "Two independent one-to-many tables");
  const meetAt = n.word("chasm", "meet at one dimension");
  const paymentsAt = n.word("chasm", "payments and refunds");
  const adaAt = n.word("chasm-run", "Ada made three payments");
  const paidAt = n.word("chasm-run", "a hundred eighty dollars");
  const refundsAt = n.word("chasm-run", "got two refunds");
  const thirtyAt = n.word("chasm-run", "thirty");
  const joinAllAt = n.word("chasm-run", "Join all three");
  const pairsAt = n.word("chasm-run", "every payment pairs with every refund");
  const sixAt = n.word("chasm-run", "six rows");
  const paySumAt = n.word("chasm-run", "Payments sum to three hundred sixty");
  const refSumAt = n.word("chasm-run", "refunds to ninety");
  const fanOneAt = n.word("chasm-diff", "A fan trap inflates one measure");
  const chasmTwoAt = n.word("chasm-diff", "A chasm trap multiplies two many-sides together");
  const bothAt = n.word("chasm-diff", "both inflate");
  const branchAt = n.word("chasm-fix", "total each branch on its own");
  const totalsAt = n.word("chasm-fix", "then join the totals");
  const h180At = n.word("chasm-fix", "A hundred eighty");
  const and30At = n.word("chasm-fix", "and thirty");
  const leftAt = n.word("chasm-left", "Join them to the customer with left joins");
  const benAt = n.word("chasm-left", "Ben paid forty dollars");
  const dropsAt = n.word("chasm-left", "an inner join drops him");
  const end = n.beat("chasm-left").to;
  // The six rows and their sums stay up two seconds, then clear.
  const phaseOut = fanOneAt + 2;
  const panelAt = fanOneAt + 8;

  // ── Phase A: the three tables, and Ada's rows joined at once ──
  const chip = (x: number, top: number, name: string, width: number) => ({ x, y: y(top), width, name, columns: [] });
  const headH = h(40);
  const rowH = h(44);
  const tablesTop = y(TABLES_Y);
  const pay = CHASM.payments;
  const ref = CHASM.refunds;
  const joined = CHASM.joined.result;
  const pg = tableGeometry({ x: PAY_X, top: tablesTop, cols: pay.cols.map((name) => ({ name })), rows: pay.rows, headH, rowH, bodySize: 24 });
  const jg = tableGeometry({ x: JOIN_X, top: tablesTop, cols: joined.cols.map((name) => ({ name })), rows: joined.rows, headH, rowH, bodySize: 24 });
  const rg = tableGeometry({ x: REF_X, top: tablesTop, cols: ref.cols.map((name) => ({ name })), rows: ref.rows, headH, rowH, bodySize: 24 });
  const payChip = useEntityLayout(chip(pg.x + pg.width / 2 - 130, CHIPS_Y, "payments", 260));
  const custChip = useEntityLayout(chip(jg.x + jg.width / 2 - 110, CHIPS_Y, "customer", 220));
  const refChip = useEntityLayout(chip(rg.x + rg.width / 2 - 130, CHIPS_Y, "refunds", 260));
  const ada = pay.rows[0][1];
  const benRow = pay.rows.findIndex((r) => r[1] !== ada);
  const adaPayments = pay.rows.filter((r) => r[1] === ada).length;
  const adaRefunds = ref.rows.filter((r) => r[1] === ada).length;

  // ── Phase B: fan trap against chasm trap ──
  const panelTop = y(PANEL_Y);
  const chipsB = PANEL_Y + 50;
  const fOrders = useEntityLayout(chip(X0, chipsB, "orders", 190));
  const fItems = useEntityLayout(chip(X0 + 330, chipsB, "order_items", 240));
  const cPay = useEntityLayout(chip(940, chipsB, "payments", 200));
  const cCust = useEntityLayout(chip(1265, chipsB, "customer", 190));
  const cRef = useEntityLayout(chip(1580, chipsB, "refunds", 190));
  const captionTop = cPay.bottom + h(26);

  // ── Phase C: each branch totalled, then joined ──
  const fixTop = y(FIX_Y);
  const fixSql = CHASM.fix.sql;
  const branches = fixSql.slice(0, fixSql.findIndex((l) => l.startsWith("SELECT")));
  const inner = CHASM.fixInner.result;
  const left = CHASM.fix.result;
  const ben = left.rows.find((r) => !inner.rows.some((i) => i[0] === r[0]))!;
  const fRowH = h(42);
  const ig = tableGeometry({ x: INNER_X, top: fixTop + h(40), cols: inner.cols.map((name) => ({ name })), rows: [...inner.rows, ben], headH, rowH: fRowH, bodySize: 24 });
  const lg = tableGeometry({ x: LEFT_X, top: fixTop + h(40), cols: left.cols.map((name) => ({ name })), rows: left.rows, headH, rowH: fRowH, bodySize: 24 });

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={meetAt + 6} level={-35} />
      <Sfx name="el-pop" at={paymentsAt} level={-30} />
      <Sfx name="el-tap" at={paidAt} level={-33} />
      <Sfx name="el-tap" at={thirtyAt} level={-33} />
      <Sfx name="el-sprinkle" at={pairsAt} level={-34} />
      <Sfx name="el-scratch" at={paySumAt + 4} level={-31} />
      <Sfx name="el-whoosh" at={phaseOut} level={-36} />
      <Sfx name="el-pencil" at={branchAt} level={-35} />
      <Sfx name="el-tap" at={h180At} level={-32} />
      <Sfx name="el-tap" at={benAt + 4} level={-32} />
      <Sfx name="el-scratch" at={dropsAt + 6} level={-31} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={4} at={qAt - 4} textAt={textAt - 4} size={62}>
          What is a chasm trap, and how does it differ from a fan trap?
        </QuestionCard>

        {/* ── Two one-to-many branches into one customer ── */}
        <Spot art="coins" at={paymentsAt} out={phaseOut} left={X0} top={y(CHIPS_Y) - h(12)} width={150} />
        <Entity layout={payChip} at={twoAt} out={phaseOut} />
        <Entity layout={refChip} at={twoAt + 6} out={phaseOut} />
        <Entity layout={custChip} at={meetAt - 2} out={phaseOut} />
        <Relation name="customer-payments" points={[custChip.anchor("left"), payChip.anchor("right")]} from="exactly-one" to="zero-or-many" at={meetAt + 4} out={phaseOut} />
        <Relation name="customer-refunds" points={[custChip.anchor("right"), refChip.anchor("left")]} from="exactly-one" to="zero-or-many" at={meetAt + 8} out={phaseOut} />

        <TableName g={pg} at={adaAt - 4} out={phaseOut}>
          payments
        </TableName>
        <DataTable
          g={pg}
          cols={pay.cols.map((name) => ({ name, numeric: true }))}
          at={adaAt - 4}
          rows={pay.rows.map((cells, i) => ({ cells, at: adaAt + i * 4, dimAt: i === benRow ? adaAt : undefined }))}
          out={phaseOut}
        />
        <Note at={paidAt} x={pg.x} y={pg.rowTop(pay.rows.length) + h(16)} out={phaseOut}>
          <span style={noteLine(22, INK)}>
            Ada paid <Num>{money(Number(CHASM.paid))}</Num>
          </span>
        </Note>
        <TableName g={rg} at={refundsAt - 4} out={phaseOut}>
          refunds
        </TableName>
        <DataTable
          g={rg}
          cols={ref.cols.map((name) => ({ name, numeric: true }))}
          at={refundsAt - 4}
          rows={ref.rows.map((cells, i) => ({ cells, at: refundsAt + i * 4 }))}
          out={phaseOut}
        />
        <Note at={thirtyAt} x={rg.x} y={rg.rowTop(ref.rows.length) + h(16)} out={phaseOut}>
          <span style={noteLine(22, INK)}>
            Ada was refunded <Num>{money(Number(CHASM.refunded))}</Num>
          </span>
        </Note>
        <TableName g={jg} at={joinAllAt - 2} out={phaseOut}>
          all three joined
        </TableName>
        <DataTable
          g={jg}
          cols={joined.cols.map((name, j) => ({ name, numeric: j > 0 }))}
          at={joinAllAt - 2}
          rows={joined.rows.map((cells, i) => ({ cells, at: pairsAt + i * 4 }))}
          marks={[
            ...joined.rows.map((_, i) => ({ row: i, col: 1, at: paySumAt + 4 + i * 2, color: MARK_BAD })),
            ...joined.rows.map((_, i) => ({ row: i, col: 2, at: refSumAt + 2 + i * 2, color: MARK_BAD })),
          ]}
          out={phaseOut}
        />
        <Note at={sixAt} x={jg.x} y={jg.rowTop(joined.rows.length) + h(14)} out={phaseOut}>
          <span style={noteLine(22, INK_SOFT)}>
            <Num>{joined.rows.length}</Num> rows: <Num>{adaPayments}</Num> payments × <Num>{adaRefunds}</Num> refunds
          </span>
        </Note>
        <Note at={paySumAt} x={jg.x} y={jg.rowTop(joined.rows.length) + h(52)} out={phaseOut}>
          <span style={noteLine(24, INK)}>
            paid <b style={{ color: ACCENT_INK }}>{money(Number(CHASM.trap.result.rows[0][1]))}</b>
            , refunded <b style={{ color: ACCENT_INK }}>{money(Number(CHASM.trap.result.rows[0][2]))}</b>
          </span>
        </Note>

        {/* ── One many-side, or two ── */}
        <Ink at={panelAt} dur={12} style={{ left: X0, top: panelTop }}>
          <span style={{ ...label(26, INK), fontWeight: 600, whiteSpace: "nowrap" }}>Fan trap</span>
        </Ink>
        <Entity layout={fOrders} at={panelAt + 4} />
        <Entity layout={fItems} at={panelAt + 8} />
        <Relation name="fan-orders-items" points={[fOrders.anchor("right"), fItems.anchor("left")]} from="exactly-one" to="one-or-many" at={panelAt + 10} />
        <Note at={panelAt + 16} x={X0} y={captionTop}>
          <span style={noteLine(22, INK)}>
            One many-side: <b style={{ color: ACCENT_INK }}>one measure</b> inflates
          </span>
        </Note>
        {/* Each side's evidence, from this video's own runs, so the claim
            keeps its numbers once Ada's tables have cleared. */}
        <Note at={panelAt + 24} x={X0} y={captionTop + h(42)}>
          <span style={noteLine(22, INK_SOFT)}>
            <Num>{money(FAN.revenue)}</Num> became <b style={{ color: ACCENT_INK }}>{money(FAN.inflated)}</b>
          </span>
        </Note>
        <ColumnRule x={860} top={panelTop + 4} height={captionTop + h(74) - panelTop} at={chasmTwoAt - 2} />
        <Ink at={chasmTwoAt - 4} dur={12} style={{ left: 940, top: panelTop }}>
          <span style={{ ...label(26, INK), fontWeight: 600, whiteSpace: "nowrap" }}>Chasm trap</span>
        </Ink>
        <Entity layout={cPay} at={chasmTwoAt} />
        <Entity layout={cCust} at={chasmTwoAt + 4} />
        <Entity layout={cRef} at={chasmTwoAt + 8} />
        <Relation name="chasm-pay" points={[cCust.anchor("left"), cPay.anchor("right")]} from="exactly-one" to="zero-or-many" at={chasmTwoAt + 8} />
        <Relation name="chasm-ref" points={[cCust.anchor("right"), cRef.anchor("left")]} from="exactly-one" to="zero-or-many" at={chasmTwoAt + 10} />
        <Note at={bothAt - 4} x={940} y={captionTop}>
          <span style={noteLine(22, INK)}>
            Two many-sides: <b style={{ color: ACCENT_INK }}>both</b> inflate
          </span>
        </Note>
        <Note at={bothAt + 6} x={940} y={captionTop + h(42)}>
          <span style={noteLine(22, INK_SOFT)}>
            <Num>{money(CHASM.paid)}</Num> became <b style={{ color: ACCENT_INK }}>{money(Number(CHASM.trap.result.rows[0][1]))}</b>,{" "}
            <Num>{money(CHASM.refunded)}</Num> became <b style={{ color: ACCENT_INK }}>{money(Number(CHASM.trap.result.rows[0][2]))}</b>
          </span>
        </Note>

        {/* ── Each branch totalled first, then joined ── */}
        <Listing
          lines={branches}
          x={X0}
          top={fixTop}
          width={600}
          size={19}
          at={branchAt - 2}
          marks={[
            { line: "SUM(amount) AS paid", text: "SUM(amount) AS paid", at: branchAt + 8 },
            { line: "SUM(amount) AS refunded", text: "SUM(amount) AS refunded", at: branchAt + 14 },
          ]}
        />
        <Flow points={[[X0 + 640, fixTop + h(120)], [INNER_X - 30, fixTop + h(120)]]} at={totalsAt} dur={12} />
        <TableName g={ig} at={totalsAt + 6}>
          totals, <Mono>JOIN</Mono>
        </TableName>
        <DataTable
          g={ig}
          cols={inner.cols.map((name, j) => ({ name, numeric: j > 0 }))}
          at={totalsAt + 6}
          rows={[
            ...inner.rows.map((cells) => ({ cells, at: totalsAt + 10 })),
            { cells: [ben[0], "", ""], at: dropsAt + 4, ghost: true, grow: true },
          ]}
          marks={[
            { row: 0, col: 1, at: h180At + 2, color: MARK_OK },
            { row: 0, col: 2, at: and30At + 2, color: MARK_OK },
          ]}
        />
        <Note at={dropsAt + 10} x={INNER_X} y={ig.rowTop(2) + h(14)}>
          <span style={noteLine(22, ACCENT_INK)}>
            <b>{ben[0]} dropped</b>
          </span>
        </Note>
        <TableName g={lg} at={leftAt}>
          totals, <Mono>LEFT JOIN</Mono>
        </TableName>
        <DataTable
          g={lg}
          cols={left.cols.map((name, j) => ({ name, numeric: j > 0 }))}
          at={leftAt}
          rows={left.rows.map((cells, i) => ({ cells, at: cells[0] === ben[0] ? benAt + 2 : leftAt + 4 + i * 3 }))}
          bands={[{ row: left.rows.indexOf(ben), at: benAt + 8, color: MARK_OK }]}
        />
        <Note at={benAt + 12} x={LEFT_X} y={lg.rowTop(left.rows.length) + h(14)}>
          <span style={noteLine(22, OK_INK)}>
            <b>
              {ben[0]} kept, refunded <Num>{ben[2]}</Num>
            </b>
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
