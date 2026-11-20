import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ds } from "../../theme/brand";
import { BAR, INK, note } from "../../editorial/style";
import { Note, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { RATIO } from "./data";
import { Bar, Caption, colsOf, DataTable, Drift, geoOf, Listing, listingHeight, MARK, MARK_BAD, MARK_OK, money, Mono, OK_INK, TableName, Verdict, X0 } from "./parts";

const TABLE_Y = 360;
const RIGHT_X = 1060;
const OPTS = { headH: 48, rowH: 56, bodySize: 26, headSize: 21 } as const;
const LIST_SIZE = 20;

/**
 * Question 7. Two orders with margins of 50 and 10 percent (the page's
 * columns, the video's own rows): summed, 60.0; averaged, 30.0; from the
 * parts, 14.0, because the second order is 900.00 of the 1,000.00 of
 * revenue, drawn as one bar split by order. The fix: store the additive
 * parts and divide after summing, the query that returned 14.0, while the
 * stored percentage, which has forgotten each order's weight, is marked as
 * the trap.
 */
export const RatioScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("ratio").from;
  const qAt = n.word("ratio", "Question seven");
  const textAt = n.word("ratio", "Why should you avoid storing");
  const rollAt = n.word("ratio", "every roll-up gets them wrong");
  const twoAt = n.word("ratio", "Take two orders");
  const marginsAt = n.word("ratio", "margins of fifty and ten percent");
  const sumAt = n.word("ratio-sum", "Sum them");
  const averageAt = n.word("ratio-sum", "Average them");
  const realAt = n.word("ratio-sum", "The real margin is fourteen");
  const carriesAt = n.word("ratio-sum", "carries nine-tenths of the revenue");
  const storeAt = n.word("ratio-fix", "So store the additive parts");
  const divideAt = n.word("ratio-fix", "divide after summing");
  const weighsAt = n.word("ratio-fix", "A ratio of sums weighs each order");
  const forgotAt = n.word("ratio-fix", "A stored percentage has forgotten that weight");
  const end = n.beat("ratio-fix").to;

  const T = RATIO.rows;
  const g = geoOf(T, X0, y(TABLE_Y), h, OPTS);
  const col = (c: string) => T.cols.indexOf(c);
  const revenue = T.rows.map((r) => Number(r[col("gross_revenue")]));
  const totalRevenue = revenue.reduce((a, b) => a + b, 0);
  const big = revenue.indexOf(Math.max(...revenue));
  const share = Math.round((100 * revenue[big]) / totalRevenue);
  const pct = (v: string) => `${v}%`;
  const L = RATIO.fromParts.lines;
  const listTop = g.rowTop(T.rows.length) + h(90);

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={twoAt} level={-30} />
      <Sfx name="el-pencil" at={marginsAt + 4} level={-36} />
      <Sfx name="el-tap" at={sumAt + 4} level={-29} />
      <Sfx name="el-tap" at={averageAt + 4} level={-29} />
      <Sfx name="el-pop" at={realAt + 4} level={-30} />
      <Sfx name="el-pop" at={carriesAt} level={-31} />
      <Sfx name="el-whoosh" at={storeAt} level={-35} />
      <Sfx name="el-scratch" at={forgotAt + 4} level={-35} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={7} at={qAt - 4} textAt={textAt - 4} size={56}>
          Why should you avoid storing percentages or ratios directly in fact tables?
        </QuestionCard>

        <TableName g={g} at={rollAt}>
          <Mono>fact_orders</Mono>, a percentage stored on each row
        </TableName>
        <DataTable
          g={g}
          cols={colsOf(T)}
          at={rollAt}
          rows={T.rows.map((cells, i) => ({ cells, at: twoAt + i * 5 }))}
          marks={[
            ...T.rows.map((_, row) => ({ row, col: col("margin_pct"), at: marginsAt + 4 + row * 5, out: storeAt, color: MARK })),
            ...T.rows.flatMap((_, row) => [
              { row, col: col("gross_revenue"), at: storeAt + 6 + row * 3, color: MARK_OK },
              { row, col: col("cost_of_goods_sold"), at: storeAt + 10 + row * 3, color: MARK_OK },
            ]),
            ...T.rows.map((_, row) => ({ row, col: col("margin_pct"), at: forgotAt + 4 + row * 3, color: MARK_BAD })),
          ]}
        />

        {/* ── What each roll-up says ── */}
        <Verdict at={sumAt} x={RIGHT_X} y={y(TABLE_Y) + h(4)} label="Summed" value={pct(RATIO.summed)} tone="bad" size={26} />
        <Verdict at={averageAt} x={RIGHT_X} y={y(TABLE_Y) + h(62)} label="Averaged" value={pct(RATIO.averaged)} tone="bad" size={26} />
        <Verdict
          at={realAt}
          x={RIGHT_X}
          y={y(TABLE_Y) + h(120)}
          label="From the parts"
          value={pct(RATIO.fromParts.rows[0][0])}
          tone="ok"
          size={26}
        />
        {/* Why: the second order is most of the revenue. */}
        <Bar
          x={RIGHT_X}
          y={y(TABLE_Y) + h(186)}
          width={600}
          max={totalRevenue}
          at={carriesAt - 4}
          label={
            <>
              Revenue: order {T.rows[big][0]} is <Num>{money(String(revenue[big]))}</Num> of <Num>{money(String(totalRevenue))}</Num>
            </>
          }
          shown={`${share}%`}
          ink={INK}
          segments={revenue.map((v, i) => ({ value: v, color: i === big ? BAR : ds("blue", 200), at: carriesAt - 4 + i * 6 }))}
        />

        {/* ── The fix: keep the parts, divide after summing ── */}
        <Caption at={storeAt + 4} x={X0} y={listTop - h(40)} color={OK_INK}>
          Store the parts, divide after summing
        </Caption>
        <Listing
          lines={L}
          x={X0}
          top={listTop}
          size={LIST_SIZE}
          at={divideAt - 6}
          marks={[{ line: "SUM(gross_revenue)", text: "(SUM(gross_revenue) - SUM(cost_of_goods_sold))", at: divideAt + 4 }]}
        />
        <Note at={weighsAt} x={X0} y={listTop + listingHeight(L.length, LIST_SIZE) + h(30)}>
          <span style={{ ...note(25, OK_INK), fontWeight: 500, whiteSpace: "nowrap" }}>A ratio of sums weighs each order by its revenue.</span>
        </Note>
        <Note at={forgotAt} x={X0} y={listTop + listingHeight(L.length, LIST_SIZE) + h(78)}>
          <span style={{ ...note(25, INK), whiteSpace: "nowrap" }}>
            A stored <Mono>margin_pct</Mono> <span style={{ opacity: ease(frame, forgotAt + 6, 10) }}>has forgotten that weight.</span>
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
