import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, HAIRLINE, INK, INK_SOFT, label, note } from "../../editorial/style";
import { ColumnRule, Note, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { LATE_FACT } from "./data";
import {
  Arrow,
  Axis,
  Band,
  Box,
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
  OK,
  OK_INK,
  Pin,
  TableName,
  useAcme,
  VMark,
  X0,
  YEARS,
} from "./parts";

const SIZE = 20;
const ROWS = { headH: 42, rowH: 48, bodySize: 22, headSize: 20 } as const;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * Question 6, on the recurring figure. Order 5001, dated 2022-05-10,
 * arrives today. Looked up by is_current it gets 1002, West, a region Acme
 * had not moved to (red, drawn into the West band); by the version valid on
 * its date, 1001, East (green, into the East band). Then the load that has
 * to pick it up: a window over recent order dates misses it, the same
 * window over arrival catches it, drawn under the axis it shares. Then the
 * snapshots: May 2022 lit in a monthly row for rebuild, and an accumulating
 * snapshot's one row updated in place.
 */
export const LateFactScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();
  const A = useAcme();

  const from = n.beat("late-fact").from;
  const qAt = n.word("late-fact", "Question six");
  const textAt = n.word("late-fact", "How do you handle late-arriving facts");
  const eventAt = n.word("late-fact", "Load them at their own event time");
  const sayAt = n.word("late-fact", "Say Acme's 2022 order");
  const todayAt = n.word("late-fact", "only reaches the warehouse today");
  const curAt = n.word("late-fact-trap", "Look up the customer's current row");
  const gets1002At = n.word("late-fact-trap", "the order gets ten oh two");
  const notYetAt = n.word("late-fact-trap", "a region Acme hadn't moved to yet");
  const pitAt = n.word("late-fact-trap", "Look up the version valid on the order date");
  const gets1001At = n.word("late-fact-trap", "it gets ten oh one");
  const pickedAt = n.word("late-fact-load", "make sure it's picked up at all");
  const skipsAt = n.word("late-fact-load", "A load that only takes recent order dates skips it");
  const arrivedAt = n.word("late-fact-load", "select new rows by when they arrived");
  const happenedAt = n.word("late-fact-load", "not when they happened");
  const rebuildAt = n.word("late-fact-snap", "rebuild any periodic snapshot");
  const landsAt = n.word("late-fact-snap", "the period the order lands in");
  const accAt = n.word("late-fact-snap", "An accumulating snapshot");
  const placeAt = n.word("late-fact-snap", "updates its row in place");
  const end = n.beat("late-fact-snap").to;

  const [east, west] = A.versions;
  const order = A.orders[0];
  const low = y(LOW);

  // ── Two lookups, side by side ──
  const C = LATE_FACT.current;
  const P = LATE_FACT.pointInTime;
  const listW = Math.max(listingWidth(C.lines, SIZE), listingWidth(P.lines, SIZE));
  const RX = X0 + listW + 90;
  const resTop = low + listingHeight(Math.max(C.lines.length, P.lines.length), SIZE) + h(70);
  const gc = geoOf(C, X0, resTop, h, ROWS);
  const gp = geoOf(P, RX, resTop, h, ROWS);
  const trapOut = pickedAt - 4;

  // ── The load window, over order date and over arrival ──
  const win = { x0: A.tx("2024-09-01"), x1: A.x1 };
  const tracks = [
    { name: "By order date", y: low + h(40), dot: order.x, at: skipsAt, ok: false },
    { name: "By arrival", y: low + h(160), dot: A.x1 - 14, at: arrivedAt, ok: true },
  ];
  const loadOut = rebuildAt - 4;

  // ── The snapshots ──
  const cellW = 92;
  const cellGap = 10;
  const cellH = h(56);
  const mayIdx = Number(order.date.slice(5, 7)) - 1;
  const year = order.date.slice(0, 4);
  const accTop = low + h(190);
  const acc = [
    { text: <>Order <Num>{order.id}</Num></>, w: 210 },
    {
      text: (
        <span>
          Ordered<span style={{ opacity: ease(frame, placeAt + 4, 10) }}> {order.date}</span>
        </span>
      ),
      w: 300,
    },
    { text: "Shipped", w: 180 },
    { text: "Delivered", w: 180 },
  ];

  // The current-row lookup, drawn into the West band.
  const red = ease(frame, gets1002At + 2, 16) * (1 - ease(frame, pickedAt - 4, 10));
  const redTo = west.x0 + (A.x1 - west.x0) * 0.35;
  const foot = A.labelTop + 68;

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={sayAt + 2} level={-34} />
      <Sfx name="el-whoosh" at={todayAt + 2} level={-36} />
      <Sfx name="el-scratch" at={gets1002At + 4} level={-34} />
      <Sfx name="el-pop" at={gets1001At + 2} level={-33} />
      <Sfx name="el-tap" at={skipsAt + 6} level={-34} />
      <Sfx name="el-tap" at={arrivedAt + 6} level={-34} />
      <Sfx name="el-pop" at={landsAt} level={-34} />
      <Sfx name="el-pencil" at={placeAt} level={-36} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={6} at={qAt - 4} textAt={textAt - 4} size={60}>
          How do you handle late-arriving facts?
        </QuestionCard>

        {/* ── The recurring figure ── */}
        <Axis tl={A} top={A.axisTop} at={textAt + 6} years={YEARS} />
        <Band
          x0={east.x0}
          x1={east.x1}
          top={A.bandTop}
          h={A.bandH}
          at={textAt + 10}
          label={
            <span>
              <Num>{east.key}</Num> · {east.region}
            </span>
          }
          tones={[{ at: gets1001At + 4, tone: "ok" }]}
        />
        <Band
          x0={west.x0 + 3}
          x1={A.x1}
          top={A.bandTop}
          h={A.bandH}
          at={textAt + 16}
          open
          label={
            <span>
              <Num>{west.key}</Num> · {west.region}
            </span>
          }
          tones={[
            { at: gets1002At + 4, tone: "bad" },
            { at: pickedAt - 4, tone: "plain" },
          ]}
        />
        <Pin
          x={order.x}
          top={A.labelTop}
          bottom={A.bandTop}
          at={sayAt}
          title={<Num>{order.id}</Num>}
          sub={order.date}
          tones={[{ at: gets1001At + 4, tone: "ok" }]}
        />
        {/* It arrives today: the axis's far end. */}
        <VMark x={A.x1} top={A.labelTop + h(6)} bottom={A.bandTop + A.bandH} at={todayAt} solid width={3} />
        <Note at={todayAt + 4} x={A.x1 - 14} y={A.labelTop} align="right" from="right">
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>Arrives today</span>
        </Note>
        <Arrow points={[[A.x1 - 190, A.labelTop + h(18)], [order.x + 110, A.labelTop + h(18)]]} at={todayAt + 10} dur={20} color={INK_SOFT} dash="7 6" out={curAt} />
        {red > 0 ? (
          <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: red }}>
            <line x1={order.x} y1={foot} x2={order.x + (redTo - order.x) * red} y2={foot + (A.bandTop - foot) * red} stroke={ACCENT} strokeWidth={2.4} strokeDasharray="7 6" />
            <circle cx={redTo} cy={A.bandTop} r={6} fill={ACCENT} opacity={red >= 1 ? 1 : 0} />
          </svg>
        ) : null}

        {/* The answer, before the order it is argued on. */}
        <Note at={eventAt} x={X0} y={low} out={curAt - 4}>
          <span style={{ ...note(28, OK_INK), whiteSpace: "nowrap" }}>Load it at its own event time</span>
        </Note>
        <Note at={todayAt + 6} x={X0} y={low + h(56)} out={curAt - 4}>
          <span style={{ ...note(25, INK), whiteSpace: "nowrap" }}>
            Dated <Num>{order.date}</Num>, loaded today
          </span>
        </Note>

        {/* ── Two lookups ── */}
        <Listing lines={C.lines} x={X0} top={low} width={listW} size={SIZE} at={curAt - 2} out={trapOut} title="By the current row" marks={[{ line: lineOf(C.lines, "is_current"), at: curAt + 14 }]} />
        <TableName g={gc} at={gets1002At - 4} out={trapOut}>
          Order <Num>{order.id}</Num> gets
        </TableName>
        <DataTable
          g={gc}
          cols={colsOf(C)}
          at={gets1002At - 4}
          out={trapOut}
          rows={[{ cells: C.rows[0], at: gets1002At }]}
          marks={[
            { row: 0, col: 0, at: gets1002At + 6, color: MARK_BAD },
            { row: 0, col: 1, at: gets1002At + 10, color: MARK_BAD },
          ]}
        />
        <Note at={notYetAt} x={gc.right + 30} y={gc.rowTop(0) + h(6)} out={trapOut}>
          <span style={{ ...note(23, ACCENT_INK), whiteSpace: "nowrap" }}>Not yet, in 2022</span>
        </Note>
        {ease(frame, trapOut, 10) < 1 ? <ColumnRule x={RX - 45} top={low} height={resTop + h(100) - low} at={pitAt} dim={trapOut} /> : null}
        <Listing lines={P.lines} x={RX} top={low} width={listW} size={SIZE} at={pitAt - 2} out={trapOut} title="By the version valid on its date" marks={[{ line: lineOf(P.lines, "BETWEEN"), at: pitAt + 14 }]} />
        <TableName g={gp} at={gets1001At - 6} out={trapOut}>
          Order <Num>{order.id}</Num> gets
        </TableName>
        <DataTable
          g={gp}
          cols={colsOf(P)}
          at={gets1001At - 6}
          out={trapOut}
          rows={[{ cells: P.rows[0], at: gets1001At - 2 }]}
          marks={[
            { row: 0, col: 0, at: gets1001At + 4, color: MARK_OK },
            { row: 0, col: 1, at: gets1001At + 8, color: MARK_OK },
          ]}
        />

        {/* ── The load window: over order date it misses, over arrival it
            catches ── */}
        {tracks.map((t, i) => {
          const p = ease(frame, pickedAt + i * 6, 16);
          const o = 1 - ease(frame, loadOut, 10);
          if (p <= 0 || o <= 0) return null;
          const hit = ease(frame, t.at + 6, 12);
          const color = t.ok ? OK : ACCENT;
          const trackY = t.y + h(46);
          return (
            <div key={t.name} style={{ position: "absolute", inset: 0, opacity: o }}>
              <div style={{ position: "absolute", left: X0, top: t.y, ...label(22, INK), whiteSpace: "nowrap", opacity: p }}>{t.name}</div>
              <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
                <line x1={A.x0} x2={A.x0 + (A.x1 - A.x0) * p} y1={trackY} y2={trackY} stroke={HAIRLINE} strokeWidth={1.4} />
                <rect x={win.x0} y={trackY - h(28)} width={win.x1 - win.x0} height={h(56)} rx={6} fill="none" stroke={INK} strokeWidth={2} opacity={ease(frame, skipsAt - 4, 10)} />
                <circle cx={t.dot} cy={trackY} r={8} fill={hit > 0 ? color : INK} opacity={p} />
              </svg>
              <div style={{ position: "absolute", left: t.ok ? undefined : t.dot + 20, right: t.ok ? 1920 - win.x0 + 20 : undefined, top: trackY - 16, ...note(23, t.ok ? OK_INK : ACCENT_INK), whiteSpace: "nowrap", opacity: hit }}>
                {t.ok ? "Arrived today: picked up" : "Dated 2022: outside the window, skipped"}
              </div>
            </div>
          );
        })}
        <Note at={skipsAt - 2} x={win.x1} y={low - h(6)} align="right" out={loadOut}>
          <span style={{ ...label(21, INK), whiteSpace: "nowrap" }}>This load&rsquo;s window</span>
        </Note>
        <Note at={happenedAt} x={X0} y={low + h(270)} out={loadOut}>
          <span style={{ ...note(25, OK_INK), whiteSpace: "nowrap" }}>New rows by when they arrived, not when they happened</span>
        </Note>

        {/* ── The snapshots ── */}
        <Note at={rebuildAt} x={X0} y={low - h(6)}>
          <span style={{ ...label(22, INK), whiteSpace: "nowrap" }}>
            Periodic snapshot, one row a month, <Num>{year}</Num>
          </span>
        </Note>
        {MONTHS.map((m, i) => (
          <Box
            key={m}
            x={X0 + i * (cellW + cellGap)}
            y={low + h(40)}
            w={cellW}
            h={cellH}
            at={rebuildAt + 2 + i}
            size={22}
            padding={0}
            tones={i === mayIdx ? [{ at: landsAt, tone: "look" }] : []}
          >
            {m}
          </Box>
        ))}
        <Note at={landsAt + 4} x={X0 + mayIdx * (cellW + cellGap)} y={low + h(40) + cellH + h(16)}>
          <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>Rebuilt: the order lands in May</span>
        </Note>
        <Note at={accAt} x={X0} y={accTop}>
          <span style={{ ...label(22, INK), whiteSpace: "nowrap" }}>Accumulating snapshot, one row an order</span>
        </Note>
        {acc.map((c, i) => {
          const x = X0 + acc.slice(0, i).reduce((s, a) => s + a.w + cellGap, 0);
          return (
            <Box key={i} x={x} y={accTop + h(46)} w={c.w} h={cellH} at={accAt + 4 + i * 2} size={22} padding={0} tones={i === 1 ? [{ at: placeAt + 2, tone: "ok" }] : []}>
              {c.text}
            </Box>
          );
        })}
        <Note at={placeAt + 8} x={X0 + 210 + cellGap} y={accTop + h(46) + cellH + h(16)}>
          <span style={{ ...note(23, OK_INK), whiteSpace: "nowrap" }}>Updated in place</span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
