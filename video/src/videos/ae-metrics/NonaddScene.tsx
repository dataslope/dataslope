import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, HIGHLIGHT, INK, INK_SOFT, label, note, svgText } from "../../editorial/style";
import { Ink, Note, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ds } from "../../theme/brand";
import { MONO } from "../../theme/fonts";
import { DISTINCT, FAN, RATIO } from "./data";
import {
  DataTable,
  Drift,
  Listing,
  listingHeight,
  MARK_BAD,
  MARK_OK,
  Mono,
  noteLine,
  OK,
  OK_INK,
  Strike,
  Svg,
  TableName,
  tableGeometry,
  X0,
} from "./parts";

const GRID_Y = 360;
const COL = 46;
const LETTERS_X = X0 + 120;
const WEEK_X = 1120;
const WEEK_Y = 420;
const DAY = 96;
const RATIO_Y = 340;
const STORE_X = 1100;

/** A week of daily active users, drawn without numbers: which user (by row)
 *  is active on which day. User 0, the yellow one, is there on two days. */
const WEEK: readonly (readonly number[])[] = [[1, 2, 3], [0, 2, 4], [1, 3], [2, 4, 5], [0, 1, 5], [3, 5], [1, 2]];
const TWICE = 0;

/**
 * Question 7: why distinct counts and ratios can't be summed. The page's
 * items as a grid, an order a row and a product a column: each order's
 * distinct products (stored, the order_summary) sum to 24, though the items
 * table holds 7; product A, lit, is in five orders and so counted five times.
 * Daily active users fail the same way: a week of days, one user on two of
 * them. Then the ratio, on Data Analyst Part 8's two days: the average of the
 * two rates is 26.0%, the sums divided 2.5%. So keep the numerator and the
 * denominator, which add, and strike the stored rate.
 */
export const NonaddScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("nonadd").from;
  const qAt = n.word("nonadd", "Question");
  const textAt = n.word("nonadd", "Why can't you simply sum");
  const becauseAt = n.word("nonadd", "Because they're non-additive");
  const storeDistinctAt = n.word("nonadd-distinct", "Store the number of distinct products");
  const addUpAt = n.word("nonadd-distinct", "add up those twelve counts");
  const twentyFourAt = n.word("nonadd-distinct", "twenty-four");
  const sevenAt = n.word("nonadd-distinct", "The items table holds seven products");
  const productAAt = n.word("nonadd-distinct", "Product A is in five orders");
  const fiveTimesAt = n.word("nonadd-distinct", "counted five times");
  const dauAt = n.word("nonadd-users", "Daily active users summed into a month");
  const twoDaysAt = n.word("nonadd-users", "someone active on two days");
  const twiceAt = n.word("nonadd-users", "counts twice");
  const recountAt = n.word("nonadd-users", "Recount from the rows for the month");
  const sketchAt = n.word("nonadd-users", "merge distinct-count sketches");
  const smallAt = n.word("nonadd-users", "small summaries built to combine");
  const breakAt = n.word("nonadd-ratio", "Ratios break too");
  const fiveOfAt = n.word("nonadd-ratio", "five of ten sessions");
  const twentyOfAt = n.word("nonadd-ratio", "twenty of a thousand");
  const avgAt = n.word("nonadd-ratio", "Average the two rates");
  const twentySixAt = n.word("nonadd-ratio", "twenty-six percent");
  const sumBothAt = n.word("nonadd-ratio", "Sum the conversions and the sessions");
  const twoFiveAt = n.word("nonadd-ratio", "two point five percent");
  const storeAt = n.word("nonadd-store", "store the numerator and the denominator");
  const addAt = n.word("nonadd-store", "which do add up");
  const endDivAt = n.word("nonadd-store", "divide at the end");
  const end = n.beat("nonadd-store").to;
  const phaseOut = breakAt;
  const ratioAt = breakAt + 10;

  // ── The grid: orders by products ──
  const products = DISTINCT.perProduct.map((p) => p.item);
  const orders = DISTINCT.summary.rows.map(([id, count]) => ({ id, count: Number(count) }));
  const has = new Set(FAN.items.rows.map(([o, item]) => `${o}:${item}`));
  const gridTop = y(GRID_Y);
  const rowH = h(33);
  const headH = h(40);
  const rowMid = (i: number) => gridTop + headH + i * rowH + rowH / 2;
  const colMid = (j: number) => LETTERS_X + j * COL + COL / 2;
  const countX = LETTERS_X + products.length * COL + 60;
  const gridBottom = gridTop + headH + orders.length * rowH;
  const aCol = products.indexOf(DISTINCT.perProduct.find((p) => p.orders === Math.max(...DISTINCT.perProduct.map((q) => q.orders)))!.item);
  const aOrders = DISTINCT.perProduct[aCol].orders;
  const lit = ease(frame, productAAt, 12);

  // ── The week ──
  const weekTop = y(WEEK_Y);
  const dotPitch = h(34);
  const dayX = (d: number) => WEEK_X + d * DAY + DAY / 2;
  const userY = (u: number) => weekTop + h(20) + u * dotPitch;
  const twiceDays = WEEK.map((users, d) => (users.includes(TWICE) ? d : -1)).filter((d) => d >= 0);
  const weekBottom = userY(5) + h(30);

  // ── The ratio ──
  const ratioTop = y(RATIO_Y);
  const days = RATIO.days;
  const dg = tableGeometry({ x: X0, top: ratioTop, cols: days.cols.map((name) => ({ name })), rows: days.rows, headH: h(40), rowH: h(46), bodySize: 24 });
  const avgTop = dg.rowTop(days.rows.length) + h(56);
  const avgH = listingHeight(RATIO.averaged.sql.length, 20);
  const poolTop = avgTop + avgH + h(40);
  const resX = X0 + 800;
  const ag = tableGeometry({ x: resX, top: avgTop, cols: RATIO.averaged.result.cols.map((name) => ({ name })), rows: RATIO.averaged.result.rows, headH: h(36), rowH: h(46), bodySize: 26 });
  const pg = tableGeometry({ x: resX, top: poolTop, cols: RATIO.pooled.result.cols.map((name) => ({ name })), rows: RATIO.pooled.result.rows, headH: h(36), rowH: h(46), bodySize: 26 });

  return (
    <AbsoluteFill>
      <Sfx name="el-sprinkle" at={storeDistinctAt} level={-34} />
      <Sfx name="el-scratch" at={twentyFourAt + 2} level={-31} />
      <Sfx name="el-tap" at={sevenAt + 4} level={-33} />
      <Sfx name="el-pencil" at={productAAt} level={-35} />
      <Sfx name="el-sprinkle" at={dauAt + 2} level={-34} />
      <Sfx name="el-tap" at={twiceAt} level={-33} />
      <Sfx name="el-whoosh" at={breakAt} level={-36} />
      <Sfx name="el-scratch" at={twentySixAt + 2} level={-31} />
      <Sfx name="el-tap" at={twoFiveAt + 2} level={-32} />
      <Sfx name="el-scratch" at={storeAt + 12} level={-32} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={7} at={qAt - 4} textAt={textAt - 4} size={62}>
          Why can&rsquo;t you simply sum pre-aggregated distinct counts or ratios?
        </QuestionCard>
        <Note at={becauseAt} x={WEEK_X} y={gridTop - h(6)} out={phaseOut}>
          <span style={{ ...label(26, INK), fontWeight: 600, whiteSpace: "nowrap" }}>Non-additive</span>
        </Note>

        {/* ── Distinct products per order, summed ── */}
        <Svg opacity={1 - ease(frame, phaseOut, 10)}>
          {/* Product A's column, lit. */}
          <rect x={colMid(aCol) - COL / 2 + 3} y={gridTop + 4} width={COL - 6} height={(gridBottom - gridTop - 4) * lit} rx={4} fill={HIGHLIGHT} />
          {ease(frame, storeDistinctAt - 6, 10) > 0 ? (
            <>
              <text x={X0} y={gridTop + headH / 2 + 7} style={svgText(label(20, INK_SOFT))} opacity={ease(frame, storeDistinctAt - 6, 10)}>
                order
              </text>
              {products.map((p, j) => (
                <text
                  key={p}
                  x={colMid(j)}
                  y={gridTop + headH / 2 + 7}
                  textAnchor="middle"
                  style={svgText({ ...label(20, ease(frame, sevenAt + j * 2, 8) > 0.5 ? OK_INK : INK_SOFT), fontFamily: MONO })}
                  opacity={ease(frame, storeDistinctAt - 4 + j, 10)}
                >
                  {p}
                </text>
              ))}
              <text x={countX + 70} y={gridTop + headH / 2 + 7} textAnchor="end" style={svgText({ ...label(20, INK_SOFT), fontFamily: MONO })} opacity={ease(frame, storeDistinctAt + 10, 10)}>
                products
              </text>
              <line x1={X0} y1={gridTop + headH} x2={(countX + 74 - X0) * ease(frame, storeDistinctAt - 6, 14) + X0} y2={gridTop + headH} stroke={INK} strokeWidth={1.5} />
            </>
          ) : null}
          {orders.map((o, i) => {
            const at = storeDistinctAt + i * 2;
            const p = ease(frame, at, 10);
            if (p <= 0) return null;
            return (
              <g key={o.id} opacity={p}>
                <text x={X0 + 50} y={rowMid(i) + 7} textAnchor="end" style={svgText({ ...note(20, INK_SOFT), fontVariantNumeric: "tabular-nums" })}>
                  {o.id}
                </text>
                {products.map((prod, j) =>
                  has.has(`${o.id}:${prod}`) ? <circle key={prod} cx={colMid(j)} cy={rowMid(i)} r={8.5} fill={j === aCol && lit > 0.5 ? ds("yellow", 600) : BAR} /> : null,
                )}
                <text x={countX + 70} y={rowMid(i) + 7} textAnchor="end" style={svgText({ ...note(21, INK), fontVariantNumeric: "tabular-nums" })} opacity={ease(frame, addUpAt - 10 + i, 8)}>
                  {o.count}
                </text>
              </g>
            );
          })}
          {/* The stored counts, summed. */}
          <line x1={countX} y1={gridBottom + 6} x2={countX + 74} y2={gridBottom + 6} stroke={INK} strokeWidth={1.5} opacity={ease(frame, twentyFourAt - 4, 8)} />
          <text x={countX + 70} y={gridBottom + 36} textAnchor="end" style={svgText({ ...label(24, ACCENT_INK), fontWeight: 600, fontVariantNumeric: "tabular-nums" })} opacity={ease(frame, twentyFourAt, 8)}>
            {DISTINCT.summed}
          </text>
          <text x={countX - 14} y={gridBottom + 36} textAnchor="end" style={svgText({ ...note(21, ACCENT_INK), fontFamily: MONO })} opacity={ease(frame, twentyFourAt, 8)}>
            SUM
          </text>
          {/* The products the items table really holds. */}
          <line
            x1={LETTERS_X + 4}
            y1={gridBottom + 12}
            x2={LETTERS_X + 4 + (products.length * COL - 8) * ease(frame, sevenAt, 14)}
            y2={gridBottom + 12}
            stroke={OK}
            strokeWidth={2.5}
          />
        </Svg>
        <Note at={sevenAt + 6} x={LETTERS_X} y={gridBottom + h(14)} out={phaseOut}>
          <span style={noteLine(22, OK_INK)}>
            <b>
              <Num>{DISTINCT.products}</Num> products
            </b>
          </span>
        </Note>
        <Note at={fiveTimesAt - 4} x={colMid(aCol) - COL / 2} y={gridTop - h(40)} out={phaseOut}>
          <span style={noteLine(22, INK)}>
            <Mono>{products[aCol]}</Mono>: in <Num>{aOrders}</Num> orders, counted <Num>{aOrders}</Num> times
          </span>
        </Note>

        {/* ── Daily active users across a week ── */}
        <Svg opacity={1 - ease(frame, phaseOut, 10)}>
          {WEEK.map((users, d) => {
            const at = dauAt + d * 3;
            const p = ease(frame, at, 10);
            if (p <= 0) return null;
            return (
              <g key={d} opacity={p}>
                {users.map((u) => (
                  <circle key={u} cx={dayX(d)} cy={userY(u)} r={10} fill={u === TWICE && ease(frame, twoDaysAt, 10) > 0.5 ? ds("yellow", 600) : BAR} />
                ))}
                <text x={dayX(d)} y={weekBottom + 6} textAnchor="middle" style={svgText(note(20, INK_SOFT))}>
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][d]}
                </text>
              </g>
            );
          })}
          {twiceDays.map((d) => (
            <circle key={`r${d}`} cx={dayX(d)} cy={userY(TWICE)} r={16} fill="none" stroke={ACCENT} strokeWidth={2.5} opacity={ease(frame, twiceAt, 10)} />
          ))}
          <line x1={WEEK_X} y1={weekBottom - h(20)} x2={WEEK_X + 7 * DAY * ease(frame, dauAt, 16)} y2={weekBottom - h(20)} stroke={INK} strokeWidth={1.5} />
        </Svg>
        <Note at={twiceAt} x={dayX(twiceDays[twiceDays.length - 1]) + 28} y={userY(TWICE) - h(16)} out={phaseOut}>
          <span style={noteLine(22, ACCENT_INK)}>
            <b>counted twice</b>
          </span>
        </Note>
        <Note at={recountAt} x={WEEK_X} y={weekBottom + h(46)} out={phaseOut}>
          <span style={noteLine(23, OK_INK)}>
            <b>Recount from the rows</b>
          </span>
        </Note>
        <Note at={sketchAt} x={WEEK_X} y={weekBottom + h(88)} out={phaseOut}>
          <span style={noteLine(23, OK_INK)}>
            <b>or merge distinct-count sketches</b>
          </span>
        </Note>
        <Note at={smallAt} x={WEEK_X} y={weekBottom + h(126)} out={phaseOut}>
          <span style={noteLine(22, INK_SOFT)}>small summaries built to combine</span>
        </Note>

        {/* ── Ratios: averaged, and summed then divided ── */}
        <TableName g={dg} at={ratioAt}>
          daily
        </TableName>
        <DataTable
          g={dg}
          cols={days.cols.map((name, j) => ({ name, numeric: j > 0 }))}
          at={ratioAt}
          rows={days.rows.map((cells, i) => ({ cells, at: i === 0 ? fiveOfAt : twentyOfAt }))}
          marks={[
            { row: 0, col: 3, at: avgAt, color: MARK_BAD, out: sumBothAt },
            { row: 1, col: 3, at: avgAt + 4, color: MARK_BAD, out: sumBothAt },
            { row: 0, col: 1, at: sumBothAt + 4, color: MARK_OK },
            { row: 1, col: 1, at: sumBothAt + 6, color: MARK_OK },
            { row: 0, col: 2, at: sumBothAt + 2, color: MARK_OK },
            { row: 1, col: 2, at: sumBothAt + 4, color: MARK_OK },
          ]}
        />
        <Listing lines={RATIO.averaged.sql} x={X0} top={avgTop} width={740} size={20} at={avgAt - 2} />
        <DataTable
          g={ag}
          cols={RATIO.averaged.result.cols.map((name) => ({ name, numeric: true }))}
          at={twentySixAt - 6}
          rows={RATIO.averaged.result.rows.map((cells) => ({ cells, at: twentySixAt - 2 }))}
          marks={[{ row: 0, col: 0, at: twentySixAt + 2, color: MARK_BAD }]}
        />
        <Listing lines={RATIO.pooled.sql} x={X0} top={poolTop} width={740} size={20} at={sumBothAt - 2} />
        <DataTable
          g={pg}
          cols={RATIO.pooled.result.cols.map((name) => ({ name, numeric: true }))}
          at={twoFiveAt - 6}
          rows={RATIO.pooled.result.rows.map((cells) => ({ cells, at: twoFiveAt - 2 }))}
          marks={[{ row: 0, col: 0, at: twoFiveAt + 2, color: MARK_OK }]}
        />
        <Note at={twoFiveAt + 6} x={resX} y={pg.rowTop(1) + h(14)}>
          <span style={noteLine(22, INK_SOFT)}>
            <Num>{RATIO.conversions}</Num> of <Num>{RATIO.sessions.toLocaleString("en-US")}</Num>
          </span>
        </Note>

        {/* ── Store what adds; divide at the end ── */}
        <Ink at={storeAt - 2} dur={12} style={{ left: STORE_X + 200, top: ratioTop - h(4) }}>
          <span style={{ ...note(23, INK), fontWeight: 600, whiteSpace: "nowrap" }}>Store</span>
        </Ink>
        {(["conversions", "sessions"] as const).map((c, i) => (
          <Ink key={c} at={storeAt + 2 + i * 4} dur={12} style={{ left: STORE_X + 200, top: ratioTop + h(46) + i * h(42) }}>
            <span style={{ fontFamily: MONO, fontSize: 22, color: OK_INK, fontWeight: 500, whiteSpace: "nowrap" }}>{c}</span>
          </Ink>
        ))}
        <Ink at={storeAt + 10} dur={12} style={{ left: STORE_X + 200, top: ratioTop + h(46) + 2 * h(42) }}>
          <span style={{ fontFamily: MONO, fontSize: 22, color: ACCENT_INK, fontWeight: 500, whiteSpace: "nowrap" }}>
            <Strike at={storeAt + 12}>rate</Strike>
          </span>
        </Ink>
        <Note at={addAt} x={STORE_X + 200} y={ratioTop + h(46) + 3 * h(42) + h(10)}>
          <span style={noteLine(22, INK_SOFT)}>the parts add up</span>
        </Note>
        <Note at={endDivAt} x={STORE_X + 200} y={ratioTop + h(46) + 3 * h(42) + h(50)}>
          <span style={noteLine(23, OK_INK)}>
            <b>Divide at the end</b>
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
