import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { Entity, useEntityLayout } from "../../editorial/erd";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, halo, INK, INK_SOFT, label, note } from "../../editorial/style";
import { Ink, Leader } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { CUSTOMERS, ORDERS, POINTS_AT } from "./data";
import { DbTable, Fig, KEY_INK, KeyArrow, MARK, MARK_KEY, Mono, tableGeometry } from "./kit";
import { Drift, Headline, Kicker, Link, pulse, Query } from "./parts";

const BOX_Y = 310;
const CUST_X = 240;
const ORD_X = 1180;
const CAPTION_Y = 584;
const TABLE_Y = 620;
const HEAD_H = 52;
const ROW_H = 62;

/**
 * Part 1's second half and Part 2's first: the line between customers and
 * orders, then the rows under it (Ada's two orders, Grace's one) and the key
 * that stores each link. The bare line leaves "how many?" open, and
 * cardinality answers it from each side in turn, drawing each end as it is
 * read: zero or many orders for a customer, exactly one customer for an
 * order. The key sits on the many side.
 */
export const RowsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const rowsFrom = n.beat("rows").from;
  const zoomAt = n.word("rows", "Zoom in");
  const rowsAt = n.word("rows", "rows", { nth: 1 });
  const linkingAt = n.word("rows", "linking");
  const adaAt = n.word("rows", "Ada's");
  const o101At = n.word("rows", "one oh one");
  const o102At = n.word("rows", "one oh two");
  const graceAt = n.word("rows", "Grace's");
  const o103At = n.word("rows", "one oh three");
  const keyFrom = n.beat("key").from;
  const keyAt = n.word("key", "key");
  const carriesAt = n.word("key", "carries");
  const idAt = n.word("key", "id");
  const ideaFrom = n.beat("idea").from;
  const relAt = n.word("idea", "relationship");
  const ideaAt = n.word("idea", "idea");
  const fkAt = n.word("idea", "foreign key");
  const holdsAt = n.word("idea", "holds");
  const bareAt = n.word("many-in", "bare line");
  const questionAt = n.word("many-in", "question");
  const howAt = n.word("many-in", "How many");
  const bothFrom = n.beat("both").from;
  const cardAt = n.word("both", "cardinality");
  const bothWaysAt = n.word("both", "both ways");
  const oneCustAt = n.word("both", "One customer");
  const zeroAt = n.word("both", "Zero");
  const bothOneAt = n.word("both", "one", { nth: 2 });
  const bothManyAt = n.word("both", "many", { nth: 2 });
  const oneOrderAt = n.word("other", "One order");
  const exactlyAt = n.word("other", "Exactly one");
  const otmAt = n.word("one-to-many", "one-to-many");
  const sideAt = n.word("one-to-many", "many side");
  const twoAt = n.word("one-to-many", "Two orders");
  const storingAt = n.word("one-to-many", "storing");
  const adaIdAt = n.word("one-to-many", "Ada's id");
  const otmTo = n.beat("one-to-many").to;

  // ── The diagram ──
  // The line runs from customers.id to orders.customer_id, the key that
  // holds it, so customers sits one row lower to keep the line level.
  const ord = useEntityLayout({
    x: ORD_X,
    y: y(BOX_Y),
    width: 400,
    name: "orders",
    columns: [{ name: "id", key: "PK" }, { name: "customer_id", key: "FK" }],
  });
  const cust = useEntityLayout({
    x: CUST_X,
    y: y(BOX_Y) + ord.row,
    width: 340,
    name: "customers",
    columns: [{ name: "id", key: "PK" }, { name: "name" }],
  });
  const a = cust.anchor("right", "id");
  const b = ord.anchor("left", "customer_id");
  const lineY = a[1];
  const lineSwell = pulse(frame, ideaAt, 22) + pulse(frame, bareAt, 22);

  // ── The rows ──
  const cg0 = tableGeometry({ x: 0, top: 0, cols: CUSTOMERS.cols, rows: CUSTOMERS.rows, headH: h(HEAD_H), rowH: h(ROW_H) });
  const cg = tableGeometry({
    x: cust.right - cg0.width,
    top: y(TABLE_Y),
    cols: CUSTOMERS.cols,
    rows: CUSTOMERS.rows,
    headH: h(HEAD_H),
    rowH: h(ROW_H),
  });
  const og = tableGeometry({ x: ORD_X, top: y(TABLE_Y), cols: ORDERS.cols, rows: ORDERS.rows, headH: h(HEAD_H), rowH: h(ROW_H) });
  const arrowAt = [o101At, o102At, o103At];
  const ada = POINTS_AT.map((c) => c === 0);
  // The rows step back while the talk is about the line alone, and return
  // when a customer's orders are counted.
  const rowsOp = 1 - 0.68 * ease(frame, bareAt - 4, 14) * (1 - ease(frame, oneCustAt - 4, 14));
  const arrowSwell = (i: number) =>
    pulse(frame, holdsAt + i * 4, 18) +
    (ada[i] ? pulse(frame, bothManyAt + i * 4, 18) : pulse(frame, bothOneAt, 18)) +
    pulse(frame, exactlyAt + i * 5, 18);

  // ── Notes under the line: one question from each side ──
  const noteY = lineY + 26;

  return (
    <AbsoluteFill>
      {/* ── Sound: the rows, each link, each end as it is drawn ── */}
      <Sfx name="el-whoosh" at={zoomAt} level={-34} />
      {arrowAt.map((t, i) => (
        <Sfx key={i} name="el-tap" at={t} level={-30} />
      ))}
      <Sfx name="el-tap" at={keyAt} level={-29} />
      <Sfx name="el-pop" at={questionAt} level={-30} />
      <Sfx name="el-pencil" at={zeroAt - 2} level={-33} />
      <Sfx name="el-pencil" at={exactlyAt - 2} level={-33} />

      <Kicker at={rowsFrom - 40} out={bothFrom - 16}>
        What a relationship is
      </Kicker>
      <Kicker at={bothFrom - 8}>Cardinality</Kicker>

      <Headline lead="Rows link to rows." at={rowsAt - 6} out={relAt - 8} />
      <Headline lead="The line is the idea." at={relAt - 2} turn="The key keeps it." turnAt={fkAt - 2} out={bareAt - 8} />
      <Headline lead="Related, yes." at={bareAt - 2} turn="But how many?" turnAt={howAt - 4} out={cardAt - 8} />
      <Headline lead="Ask it" at={cardAt - 2} turn="both ways." turnAt={bothWaysAt - 4} out={otmAt - 8} />
      <Headline lead="One to many." at={otmAt - 2} turn="The key sits on the many side." turnAt={sideAt - 4} />

      <Drift from={ideaFrom} to={otmTo + 60} scale={0.018} origin={[960, y(560)]}>
        <Fig n="2" at={rowsFrom - 6} x={CUST_X} y={y(268)}>
          Customers and orders, as entities and as rows
        </Fig>

        {/* ── The entities and the line ── */}
        <Entity
          layout={cust}
          at={rowsFrom - 6}
          rowGap={3}
          marks={{ id: { at: idAt, tone: "key" } }}
        />
        {/* The row the line lands on lights as the link is called a key. */}
        <Entity layout={ord} at={rowsFrom - 2} rowGap={3} marks={{ customer_id: { at: keyAt, tone: "key" } }} />
        <Link
          name="customers places orders"
          points={[a, b]}
          at={rowsFrom + 4}
          from={{ kind: "exactly-one", at: exactlyAt - 2 }}
          to={{ kind: "zero-or-many", at: zeroAt - 2 }}
          swell={lineSwell}
        />
        <div
          style={{
            position: "absolute",
            left: (a[0] + b[0]) / 2,
            top: lineY - 40,
            transform: "translateX(-50%)",
            opacity: ease(frame, rowsFrom + 14, 12),
            ...note(23, INK_SOFT),
            fontStyle: "italic",
            ...halo,
          }}
        >
          places
        </div>
        <Query x={b[0] - 34} y={lineY - 36} at={questionAt} out={oneCustAt - 6} />
        <Query x={a[0] + 34} y={lineY - 36} at={questionAt + 5} out={oneOrderAt - 6} />

        {/* One customer: how many orders? Asked at the orders end. */}
        <Ink at={oneCustAt - 4} dur={14} style={{ left: b[0] - 324, top: noteY, width: 300, textAlign: "right", whiteSpace: "nowrap" }}>
          <div style={note(22, INK_SOFT)}>One customer,</div>
          <div style={{ ...note(24, INK), fontWeight: 600 }}>how many orders?</div>
        </Ink>
        <Ink at={zeroAt} dur={14} style={{ left: b[0] - 324, top: noteY + 72, width: 300, textAlign: "right", whiteSpace: "nowrap" }}>
          <span style={{ ...label(26, ACCENT_INK) }}>zero, one or many</span>
        </Ink>
        {/* One order: how many customers? Asked at the customers end. */}
        <Ink at={oneOrderAt - 4} dur={14} style={{ left: a[0] + 24, top: noteY, width: 300, whiteSpace: "nowrap" }}>
          <div style={note(22, INK_SOFT)}>One order,</div>
          <div style={{ ...note(24, INK), fontWeight: 600 }}>how many customers?</div>
        </Ink>
        <Ink at={exactlyAt} dur={14} style={{ left: a[0] + 24, top: noteY + 72, width: 300, whiteSpace: "nowrap" }}>
          <span style={{ ...label(26, ACCENT_INK) }}>exactly one</span>
        </Ink>

        {/* ── Zoom in: the rows under the line ── */}
        <Leader points={[[cust.x + cust.width / 2, cust.bottom + 14], [cg.x + cg.width / 2, y(CAPTION_Y) - 10]]} at={zoomAt} dur={18} dot={false} color={INK_SOFT} width={1.4} />
        <Leader points={[[ord.x + ord.width / 2, ord.bottom + 14], [og.x + og.width / 2, y(CAPTION_Y) - 10]]} at={zoomAt + 4} dur={18} dot={false} color={INK_SOFT} width={1.4} />
        <AbsoluteFill style={{ opacity: rowsOp }}>
          <Ink at={rowsAt - 2} dur={14} style={{ left: cg.x, top: y(CAPTION_Y) }}>
            <span style={label(24, INK)}>
              <Mono>customers</Mono>
            </span>
          </Ink>
          <Ink at={linkingAt - 2} dur={14} style={{ left: og.x, top: y(CAPTION_Y) }}>
            <span style={label(24, INK)}>
              <Mono>orders</Mono>
            </span>
          </Ink>
          <DbTable
            g={cg}
            cols={CUSTOMERS.cols}
            rows={CUSTOMERS.rows.map((cells, i) => ({ cells, at: rowsAt + 2 + i * 4 }))}
            at={rowsAt - 2}
            numeric={[0]}
            colInk={{ 0: KEY_INK }}
            marks={CUSTOMERS.rows.map((_, i) => ({ row: i, col: 0, at: idAt + i * 4, color: MARK_KEY }))}
            bands={[
              { row: 0, at: adaAt, out: keyFrom },
              { row: 1, at: graceAt, out: keyFrom },
              { row: 0, at: adaIdAt },
            ]}
          />
          <DbTable
            g={og}
            cols={ORDERS.cols}
            rows={ORDERS.rows.map((cells, i) => ({ cells, at: linkingAt + 2 + i * 4 }))}
            at={linkingAt - 2}
            numeric={[0, 1]}
            colInk={{ 1: KEY_INK }}
            marks={ORDERS.rows.map((_, i) => ({ row: i, col: 1, at: carriesAt + i * 4, color: MARK_KEY }))}
            bands={[
              ...ORDERS.rows.map((_, i) => ({ row: i, at: arrowAt[i] - 2, out: arrowAt[i] + 26 })),
              ...ORDERS.rows.flatMap((_, i) => (ada[i] ? [{ row: i, at: twoAt + i * 4, color: MARK }] : [])),
            ]}
          />
          {/* Each order names its customer's row: drawn as it is said. */}
          {ORDERS.rows.map((_, i) => (
            <KeyArrow
              key={i}
              from={[og.x - 10, og.rowMid(i)]}
              to={[cg.x + cg.width + 8, cg.rowMid(POINTS_AT[i])]}
              at={arrowAt[i]}
              swell={Math.min(1, arrowSwell(i))}
            />
          ))}
          <Ink at={storingAt} dur={14} style={{ left: og.x + og.width + 28, top: og.rowTop(0) + 6 }}>
            <span style={{ ...note(22, KEY_INK), fontWeight: 600, whiteSpace: "nowrap" }}>
              both store {CUSTOMERS.rows[0][0]}, Ada&apos;s id
            </span>
          </Ink>
        </AbsoluteFill>
      </Drift>
    </AbsoluteFill>
  );
};
