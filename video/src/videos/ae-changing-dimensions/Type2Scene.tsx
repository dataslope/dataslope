import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, HAIRLINE, INK, INK_SOFT, label, note, svgText } from "../../editorial/style";
import { Note, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { SANS } from "../../theme/fonts";
import { money, TYPE2 } from "./data";
import {
  Axis,
  Band,
  colsOf,
  DataTable,
  Drift,
  geoOf,
  lineOf,
  Listing,
  listingHeight,
  listingWidth,
  LOW,
  MARK_BAD,
  MARK_OK,
  Mark,
  OK_INK,
  Pin,
  QMono,
  TableName,
  useAcme,
  X0,
  YEARS,
  Pill,
} from "./parts";

const ROWS = { headH: 42, rowH: 48, bodySize: 22, headSize: 20 } as const;
const SIZE = 20;
const LOAD_SIZE = 21;

/**
 * Question 2, on the recurring figure. Acme's East version opens onto the
 * future; "add a row" closes it the day before the move and grows the West
 * version beside it, and the page's dim_customer takes the same two rows as
 * each column is named. The seam and the far-future date in yellow, and the
 * one BETWEEN they make possible. Then the page's point-in-time join drops
 * each order into its version; the load replays on the figure as its two
 * statements run; the join on customer_id alone sends each order to both
 * versions (24 rows to 44); the key stored at load; and what every query has
 * to say, with the page's growth chart.
 */
export const Type2Scene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();
  const A = useAcme();

  const from = n.beat("t2").from;
  const qAt = n.word("t2", "Question two");
  const textAt = n.word("t2", "What is SCD Type two");
  const addAt = n.word("t2", "Add a row instead");
  const skAt = n.word("t2", "its own surrogate key");
  const fromAt = n.word("t2", "a valid from");
  const toAt = n.word("t2", "a valid to");
  const curAt = n.word("t2", "an is current flag");
  const closesAt = n.word("t2-rows", "Acme's East row closes");
  const opensAt = n.word("t2-rows", "The West row opens the next day");
  const futureAt = n.word("t2-rows", "far in the future");
  const nullAt = n.word("t2-rows", "rather than a null");
  const betweenAt = n.word("t2-rows", "lets one between test cover every version");
  const closedAt = n.word("t2-rows", "closed or current");
  const joinAt = n.word("t2-join", "Join each order to the version");
  const windowAt = n.word("t2-join", "whose window holds its date");
  const eastAt = n.word("t2-join", "the 2022 order lands in the East");
  const westAt = n.word("t2-join", "the 2024 order in the West");
  const twoAt = n.word("t2-load", "Each change is two statements");
  const closeAt = n.word("t2-load", "close the current row");
  const beforeAt = n.word("t2-load", "the day before the move");
  const insertAt = n.word("t2-load", "then insert the new version");
  const trapAt = n.word("t2-trap", "The trap is joining on the customer ID alone");
  const repeatsAt = n.word("t2-trap", "Each order repeats once per version");
  const rowsAt = n.word("t2-trap", "twenty-four rows become forty-four");
  const revAt = n.word("t2-trap", "revenue grows by three quarters");
  const errAt = n.word("t2-trap", "nothing errors");
  const storeAt = n.word("t2-trap", "Store the surrogate key on the fact at load time");
  const noDateAt = n.word("t2-trap", "needs no date at all");
  const sayAt = n.word("t2-current", "every query has to say which version it means");
  const todayAt = n.word("t2-current", "is current for today");
  const pitAt = n.word("t2-current", "the window for a point in time");
  const growsAt = n.word("t2-current", "the table grows with every change");
  const longAt = n.word("t2-current", "for as long as the warehouse runs");
  const end = n.beat("t2-current").to;

  const [east, west] = A.versions;
  const low = y(LOW);

  // ── Phase 1: the page's two rows, as each column is named ──
  const R = TYPE2.rows42;
  const before = TYPE2.before.rows[0];
  const col = (c: string) => R.cols.indexOf(c);
  const gd = geoOf(R, X0, low, h, { ...ROWS, extra: [before] });
  const rowsOut = joinAt - 4;
  const sideX = gd.right + 70;

  // ── Phase 2: the page's point-in-time join ──
  const P = TYPE2.read;
  const pRows = P.rows.slice(0, 2).map((r) => r.map((v, j) => (P.cols[j] === "amount" ? money(v) : v)));
  const listTop = y(LOW - 10);
  const pW = listingWidth(P.lines, SIZE);
  const gp = geoOf({ cols: P.cols, rows: pRows }, X0 + pW + 70, low, h, ROWS);
  const pRegion = P.cols.indexOf("region_at_order_time");
  const joinOut = closeAt - 6;
  const matched = TYPE2.matched.rows[0];

  // ── Phase 3: the load, replayed ──
  const C = TYPE2.close;
  const I = TYPE2.insert;
  const loadW = Math.max(listingWidth(C.lines, LOAD_SIZE), listingWidth(I.lines, LOAD_SIZE));
  const insertTop = low + listingHeight(C.lines.length, LOAD_SIZE) + h(60);
  const loadOut = trapAt + 14;

  // ── Phase 4: the trap ──
  const Nq = TYPE2.natural;
  const truth = TYPE2.truth.rows[0];
  const nat = Nq.rows[0];
  const cmp = {
    cols: ["joined on", "rows", "revenue"],
    rows: [
      ["the window", truth[0], money(truth[1])],
      ["customer_id alone", nat[0], money(nat[1])],
    ],
  };
  const nW = listingWidth(Nq.lines, 22);
  const gc = geoOf(cmp, X0 + nW + 80, low, h, ROWS);
  const growth = Math.round((Number(nat[1]) / Number(truth[1]) - 1) * 100);
  const trapOut = sayAt - 4;

  // ── Phase 5: which version; and the growth chart ──
  const cur = TYPE2.currentCount.rows[0];
  const G = TYPE2.growth;
  const g = (c: string) => Number(G.rows[0][G.cols.indexOf(c)]);
  const customers = g("customers");
  const months = g("months");
  const rate = g("monthly_change");
  const final = g("type2_rows");
  const CH = { x0: 1060, x1: 1580, top: y(LOW + 10), bottom: y(LOW + 250) };
  const yMax = 130_000;
  const cy = (v: number) => CH.bottom - (v / yMax) * (CH.bottom - CH.top);
  const cx = (m: number) => CH.x0 + (m / months) * (CH.x1 - CH.x0);
  const draw = ease(frame, growsAt, 40);

  // The figure's lines: each order sent to both versions by the trap join.
  const cross = ease(frame, repeatsAt + 4, 16) * (1 - ease(frame, storeAt, 12));
  const [o1, o2] = A.orders;
  const pinFoot = A.labelTop + 68;

  return (
    <AbsoluteFill>
      <Sfx name="el-whoosh" at={addAt + 2} level={-36} />
      <Sfx name="el-tap" at={skAt + 2} level={-35} />
      <Sfx name="el-tap" at={curAt + 2} level={-35} />
      <Sfx name="el-pencil" at={closesAt} level={-36} />
      <Sfx name="el-pop" at={eastAt + 2} level={-33} />
      <Sfx name="el-pop" at={westAt + 2} level={-33} />
      <Sfx name="el-pencil" at={closeAt} level={-36} />
      <Sfx name="el-whoosh" at={insertAt + 2} level={-36} />
      <Sfx name="el-scratch" at={repeatsAt + 4} level={-34} />
      <Sfx name="el-tap" at={rowsAt + 4} level={-33} />
      <Sfx name="el-chime" at={storeAt + 6} level={-37} />
      <Sfx name="el-pencil" at={growsAt} level={-36} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={2} at={qAt - 4} textAt={textAt - 4} size={60}>
          What is SCD Type 2, and how is it implemented?
        </QuestionCard>

        {/* ── The recurring figure ── */}
        <Axis tl={A} top={A.axisTop} at={textAt + 6} years={YEARS} />
        <Band
          x0={east.x0}
          x1={A.x1}
          top={A.bandTop}
          h={A.bandH}
          at={textAt + 10}
          label={
            <span>
              <Num>{east.key}</Num> · {east.region}
            </span>
          }
          ends={[
            { at: addAt + 2, x1: east.x1 },
            { at: twoAt + 4, x1: A.x1 },
            { at: beforeAt, x1: east.x1 },
          ]}
          tones={[
            { at: eastAt, tone: "ok" },
            { at: twoAt, tone: "plain" },
            { at: pitAt, tone: "look" },
          ]}
        />
        {/* The West version: grown on "add a row", taken off while the load
            replays, and grown again by the INSERT. */}
        {[
          { at: addAt + 10, out: twoAt },
          { at: insertAt + 4, out: undefined },
        ].map((w, i) => (
          <Band
            key={i}
            x0={west.x0 + 3}
            x1={A.x1}
            top={A.bandTop}
            h={A.bandH}
            at={w.at}
            out={w.out}
            open
            label={
              <span>
                <Num>{west.key}</Num> · {west.region}
              </span>
            }
            tones={i === 0 ? [{ at: westAt, tone: "ok" }] : [{ at: todayAt, tone: "look" }, { at: pitAt, tone: "plain" }]}
          />
        ))}
        <Note at={futureAt} x={A.x1 - 16} y={A.bandTop + A.bandH / 2 - 15} align="right" out={twoAt}>
          <span style={{ ...note(22, INK), whiteSpace: "nowrap" }}>
            <Mark at={futureAt + 2} out={joinAt}>
              to {west.to}
            </Mark>
          </span>
        </Note>
        {/* The seam: East's last day, West's first. */}
        <Note at={closesAt + 2} x={east.x1 - 12} y={A.bandTop - h(42)} align="right" out={joinAt}>
          <span style={{ ...label(22, INK), whiteSpace: "nowrap" }}>
            <Mark at={closesAt + 4}>{east.to}</Mark>
          </span>
        </Note>
        <Note at={opensAt + 2} x={west.x0 + 12} y={A.bandTop - h(42)} out={joinAt}>
          <span style={{ ...label(22, INK), whiteSpace: "nowrap" }}>
            <Mark at={opensAt + 4}>{west.from}</Mark>
          </span>
        </Note>
        {A.orders.map((o, i) => (
          <Pin
            key={o.id}
            x={o.x}
            top={A.labelTop}
            bottom={A.bandTop}
            at={windowAt + i * 4}
            title={<Num>{o.id}</Num>}
            sub={o.date}
            tones={[
              { at: i === 0 ? eastAt : westAt, tone: "ok" },
              { at: twoAt, tone: "plain" },
              { at: storeAt + 4, tone: "ok" },
              { at: sayAt, tone: "plain" },
              ...(i === 0 ? [{ at: pitAt, tone: "look" as const }] : []),
            ]}
          />
        ))}
        {/* The trap: each order matched to both of its customer's versions. */}
        {cross > 0 ? (
          <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: cross }}>
            {[
              { x0: o1.x, x1: west.x0 + (A.x1 - west.x0) * 0.3 },
              { x0: o2.x, x1: east.x1 - (east.x1 - east.x0) * 0.22 },
            ].map((l, i) => (
              <g key={i}>
                <line x1={l.x0} y1={pinFoot} x2={l.x0 + (l.x1 - l.x0) * cross} y2={pinFoot + (A.bandTop - pinFoot) * cross} stroke={ACCENT} strokeWidth={2.4} strokeDasharray="7 6" />
                <circle cx={l.x1} cy={A.bandTop} r={6} fill={ACCENT} opacity={cross >= 1 ? 1 : 0} />
              </g>
            ))}
          </svg>
        ) : null}

        {/* ── Phase 1: dim_customer, column by column ── */}
        <TableName g={gd} at={textAt + 10} out={rowsOut}>
          dim_customer, customer <Num>42</Num>
        </TableName>
        <DataTable
          g={gd}
          cols={colsOf(R, {
            customer_sk: { at: skAt },
            valid_from: { at: fromAt },
            valid_to: { at: toAt },
            is_current: { at: curAt },
          })}
          at={textAt + 10}
          out={rowsOut}
          rows={[
            { cells: before, at: textAt + 14 },
            { cells: R.rows[1], at: addAt + 10, grow: true },
          ]}
          swaps={[
            { row: 0, col: col("valid_to"), at: addAt + 4, value: R.rows[0][col("valid_to")] },
            { row: 0, col: col("is_current"), at: addAt + 8, value: R.rows[0][col("is_current")] },
          ]}
          marks={[
            { row: 1, col: col("customer_sk"), at: skAt + 6, out: fromAt },
            { row: 1, col: col("valid_from"), at: fromAt + 10, out: toAt },
            { row: 1, col: col("valid_to"), at: toAt + 10, out: curAt },
            { row: 1, col: col("is_current"), at: curAt + 10, out: closesAt },
            { row: 0, col: col("valid_to"), at: closesAt + 4 },
            { row: 1, col: col("valid_from"), at: opensAt + 4 },
            { row: 1, col: col("valid_to"), at: futureAt + 2 },
          ]}
        />
        <Note at={nullAt} x={sideX} y={low + h(4)} out={rowsOut}>
          <span style={{ ...note(25, INK), whiteSpace: "nowrap" }}>
            <QMono>{west.to}</QMono>, not null:
          </span>
        </Note>
        <Note at={betweenAt} x={sideX} y={low + h(54)} out={rowsOut}>
          <span style={{ ...note(25, INK), whiteSpace: "nowrap" }}>
            <QMono>order_date BETWEEN valid_from AND valid_to</QMono>
          </span>
        </Note>
        <Note at={closedAt - 4} x={sideX} y={low + h(104)} out={rowsOut}>
          <span style={{ ...note(25, OK_INK), whiteSpace: "nowrap" }}>Covers every version, closed or current</span>
        </Note>

        {/* ── Phase 2: the page's join ── */}
        <Listing
          lines={P.lines}
          x={X0}
          top={listTop}
          width={pW}
          size={SIZE}
          at={joinAt}
          out={joinOut}
          title="The page’s point-in-time join"
          marks={[{ line: lineOf(P.lines, "BETWEEN"), at: windowAt + 2 }]}
        />
        <TableName g={gp} at={eastAt - 6} out={joinOut}>
          Its rows for Acme
        </TableName>
        <DataTable
          g={gp}
          cols={colsOf({ cols: P.cols, rows: pRows })}
          at={eastAt - 6}
          out={joinOut}
          rows={[
            { cells: pRows[0], at: eastAt },
            { cells: pRows[1], at: westAt },
          ]}
          marks={[
            { row: 0, col: pRegion, at: eastAt + 6, color: MARK_OK },
            { row: 1, col: pRegion, at: westAt + 6, color: MARK_OK },
          ]}
        />
        <Note at={westAt + 14} x={gp.x} y={gp.rowTop(2) + h(26)} out={joinOut}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            All <Num>{matched[1]}</Num> orders: <Num>{matched[0]}</Num> rows, one version each
          </span>
        </Note>

        {/* ── Phase 3: the two statements, replayed on the figure ── */}
        <Note at={twoAt} x={X0 + loadW + 60} y={low} out={loadOut}>
          <span style={{ ...note(24, INK_SOFT), whiteSpace: "nowrap" }}>For each row whose tracked columns changed</span>
        </Note>
        <Listing
          lines={C.lines}
          x={X0}
          top={low}
          width={loadW}
          size={LOAD_SIZE}
          at={closeAt - 4}
          out={loadOut}
          title="1. Close the current row"
          marks={[{ line: lineOf(C.lines, "valid_to"), at: beforeAt }]}
        />
        <Note at={closeAt + 14} x={X0 + loadW + 60} y={low + h(54)} out={loadOut}>
          <Pill size={22}>
            <Num>{TYPE2.closed}</Num> row
          </Pill>
        </Note>
        <Listing lines={I.lines} x={X0} top={insertTop} width={loadW} size={LOAD_SIZE} at={insertAt - 2} out={loadOut} title="2. Insert the new version" />
        <Note at={insertAt + 14} x={X0 + loadW + 60} y={insertTop + h(8)} out={loadOut}>
          <Pill size={22}>
            <Num>{TYPE2.inserted}</Num> row
          </Pill>
        </Note>
        <Note at={insertAt + 24} x={X0 + loadW + 60} y={insertTop + h(70)} out={loadOut}>
          <span style={{ ...note(25, OK_INK), whiteSpace: "nowrap" }}>
            = the page&rsquo;s table (<Num>{TYPE2.samePage}</Num> rows differ)
          </span>
        </Note>

        {/* ── Phase 4: the trap ── */}
        <Listing
          lines={Nq.lines}
          x={X0}
          top={low}
          width={nW}
          size={22}
          at={trapAt + 10}
          out={trapOut}
          title="Joined on the customer ID alone"
          marks={[{ line: lineOf(Nq.lines, "JOIN dim_customer"), at: trapAt + 26, out: repeatsAt }]}
          gap={{ after: lineOf(Nq.lines, "JOIN dim_customer"), at: repeatsAt - 4, width: 420 }}
        />
        <Note at={repeatsAt} x={X0 + 30} y={low + listingHeight(Nq.lines.length + 1, 22) + h(14)} out={trapOut}>
          <span style={{ ...note(23, ACCENT_INK), whiteSpace: "nowrap" }}>No date window</span>
        </Note>
        <TableName g={gc} at={rowsAt - 6} out={trapOut}>
          The same <Num>{truth[0]}</Num> orders, joined two ways
        </TableName>
        <DataTable
          g={gc}
          cols={colsOf(cmp)}
          at={rowsAt - 6}
          out={trapOut}
          rows={[
            { cells: cmp.rows[0], at: rowsAt - 2 },
            { cells: cmp.rows[1], at: rowsAt + 6 },
          ]}
          marks={[
            { row: 1, col: 1, at: rowsAt + 12, color: MARK_BAD },
            { row: 1, col: 2, at: revAt + 2, color: MARK_BAD },
          ]}
        />
        <Note at={revAt + 4} x={gc.x} y={gc.rowTop(2) + h(24)} out={trapOut}>
          <span style={{ ...note(25, ACCENT_INK), whiteSpace: "nowrap" }}>
            +<Num>{growth}</Num>% revenue
            <span style={{ opacity: ease(frame, errAt, 10) }}>, and no error</span>
          </span>
        </Note>
        <Note at={storeAt + 2} x={X0} y={y(LOW + 270)} out={trapOut}>
          <span style={{ ...note(26, OK_INK), whiteSpace: "nowrap" }}>
            The fact stores <QMono>customer_sk</QMono> at load time
            <span style={{ opacity: ease(frame, noDateAt, 10) }}>: no date in the join</span>
          </span>
        </Note>

        {/* ── Phase 5: which version; and what it costs ── */}
        <Note at={sayAt} x={X0} y={low}>
          <span style={{ ...label(22, INK_SOFT), whiteSpace: "nowrap" }}>Every query says which version</span>
        </Note>
        <Note at={todayAt - 2} x={X0} y={low + h(50)}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>
            Today: <QMono>WHERE is_current</QMono>
          </span>
        </Note>
        <Note at={todayAt + 10} x={X0} y={low + h(94)}>
          <span style={{ ...note(24, INK_SOFT), whiteSpace: "nowrap" }}>
            <Num>{cur[0]}</Num> rows, one per customer
          </span>
        </Note>
        <Note at={pitAt - 2} x={X0} y={low + h(156)}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>
            A point in time: the window, <QMono>BETWEEN</QMono>
          </span>
        </Note>
        <div style={{ position: "absolute", left: 960, top: CH.top - h(10), width: 1, height: (CH.bottom - CH.top + h(60)) * ease(frame, growsAt - 4, 14), background: HAIRLINE }} />
        {draw > 0 ? (
          <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: ease(frame, growsAt - 4, 10) }}>
            <line x1={CH.x0} x2={CH.x1} y1={CH.bottom} y2={CH.bottom} stroke={HAIRLINE} strokeWidth={1.4} />
            {[0, 12, 24, 36].map((m) => (
              <g key={m}>
                <line x1={cx(m)} x2={cx(m)} y1={CH.bottom} y2={CH.bottom + 8} stroke={INK_SOFT} strokeWidth={1.4} />
                <text x={cx(m)} y={CH.bottom + 32} textAnchor="middle" style={svgText({ fontFamily: SANS, fontSize: 21, fontWeight: 500, color: INK_SOFT })}>
                  {m}
                </text>
              </g>
            ))}
            <text x={CH.x1} y={CH.bottom + 62} textAnchor="end" style={svgText({ fontFamily: SANS, fontSize: 21, fontWeight: 500, color: INK_SOFT })}>
              months
            </text>
            <line x1={cx(0)} y1={cy(customers)} x2={cx(months * draw)} y2={cy(customers)} stroke={INK_SOFT} strokeWidth={3} />
            <line x1={cx(0)} y1={cy(customers)} x2={cx(months * draw)} y2={cy(customers * (1 + rate * months * draw))} stroke={BAR} strokeWidth={3.4} />
            <g opacity={ease(frame, growsAt + 36, 10)}>
              <text x={CH.x1 + 14} y={cy(final) + 7} style={svgText({ fontFamily: SANS, fontSize: 22, fontWeight: 500, color: BLUE_INK })}>
                Type 2: {final.toLocaleString("en-US")}
              </text>
              <text x={CH.x1 + 14} y={cy(customers) + 7} style={svgText({ fontFamily: SANS, fontSize: 22, fontWeight: 500, color: INK_SOFT })}>
                Type 1: {customers.toLocaleString("en-US")}
              </text>
            </g>
          </svg>
        ) : null}
        <Note at={growsAt + 6} x={CH.x0} y={CH.top - h(56)}>
          <span style={{ ...label(22, INK), whiteSpace: "nowrap" }}>Rows in the dimension</span>
        </Note>
        <Note at={longAt} x={CH.x0} y={CH.bottom + h(78)}>
          <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>
            If <Num>{Math.round(rate * 100)}</Num>% of <Num>{customers.toLocaleString("en-US")}</Num> customers change a month
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
