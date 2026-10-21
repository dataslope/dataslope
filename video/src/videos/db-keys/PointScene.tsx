import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { Entity, ENTITY, Relation, useEntityLayout } from "../../editorial/erd";
import { useLayout } from "../../editorial/layout";
import { ACCENT, BAR, INK, INK_SOFT, PAPER, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { MONO } from "../../theme/fonts";
import { Sfx } from "../../sound/Sfx";
import { Drift, Headline, Kicker, KEY_INK, Mark, Mono, pulse, Spot, Strike, Svg, Tag } from "./parts";

const ERD_Y = 400;

/**
 * Part 3 opens: the lesson's customers and orders. The order stores the
 * customer's key in customer_id, a foreign key; the table it points at is
 * the parent and the one holding it the child; it lives on the many side,
 * and it copies nothing but the id.
 */
export const PointScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const from = n.beat("fk").from;
  const orderAt = n.word("fk", "An order");
  const customerAt = n.word("fk", "a customer");
  const storesAt = n.word("fk", "stores");
  const inIdAt = n.word("fk", "in customer id");
  const foreignAt = n.word("fk", "foreign key");
  const parentAt = n.word("parent", "parent");
  const childAt = n.word("parent", "child");
  const manyAt = n.word("many", "many side");
  const copiesAt = n.word("many", "copies nothing");
  const justAt = n.word("many", "Just the id");
  const end = n.beat("many").to;

  const customers = useEntityLayout({
    x: 200,
    y: y(ERD_Y),
    width: 380,
    name: "customers",
    columns: [
      { name: "customer_id", type: "integer", key: "PK" },
      { name: "name", type: "text" },
      { name: "email", type: "text" },
    ],
  });
  const orders = useEntityLayout({
    x: 1180,
    y: y(ERD_Y),
    width: 420,
    name: "orders",
    columns: [
      { name: "order_id", type: "integer", key: "PK" },
      { name: "customer_id", type: "integer", key: "FK" },
      { name: "total", type: "numeric" },
    ],
  });
  const c = customers.anchor("right", "customer_id");
  const o = orders.anchor("left", "customer_id");
  const midX = (c[0] + o[0]) / 2;
  const points = [c, [midX, c[1]], [midX, o[1]], o] as const;

  // "No copy of her name": the columns an order could have copied, struck.
  const copies = ["customer_name", "customer_email"];
  const copyTop = orders.bottom + h(18);
  const manySwell = pulse(frame, manyAt, 24);

  return (
    <AbsoluteFill>
      {/* ── Sound: the two entities, the key column, the line, the struck copies ── */}
      <Sfx name="el-whoosh" at={orderAt - 6} level={-34} />
      <Sfx name="el-tap" at={inIdAt - 2} level={-28} />
      <Sfx name="el-pencil" at={foreignAt - 4} level={-33} />
      <Sfx name="el-pop" at={parentAt - 2} level={-30} />
      <Sfx name="el-pop" at={childAt - 2} level={-30} />
      <Sfx name="el-scratch" at={copiesAt + 4} level={-30} />

      <Kicker at={from - 10}>Foreign keys</Kicker>
      <Drift from={from} to={end + 50}>
        <Headline lead="Another table's key," turn="stored here." at={from - 6} turnAt={storesAt - 2} />

        <Entity
          layout={orders}
          at={orderAt - 4}
          rowAt={{ order_id: orderAt + 4, customer_id: inIdAt - 4, total: orderAt + 10 }}
          marks={{ customer_id: { at: inIdAt, tone: "key" } }}
        />
        <Entity layout={customers} at={customerAt - 4} marks={{ customer_id: { at: foreignAt + 6, tone: "key" } }} />
        <Relation name="customers to orders" points={points} from="exactly-one" to="zero-or-many" at={foreignAt - 4} color={BAR} dur={22} />

        {/* Parent and child, over each box. */}
        <Note at={parentAt - 2} x={customers.x} y={customers.y - 50} from="up">
          <Tag color={INK} size={21}>
            parent
          </Tag>
          <span style={{ ...note(21, INK_SOFT), marginLeft: 12 }}>the table pointed at</span>
        </Note>
        <Note at={childAt - 2} x={orders.x} y={orders.y - 50} from="up">
          <Tag color={KEY_INK} size={21}>
            child
          </Tag>
          <span style={{ ...note(21, INK_SOFT), marginLeft: 12 }}>holds the pointer</span>
        </Note>

        {/* The many side: the crow's foot swells as it is named. */}
        <Svg opacity={manySwell}>
          <circle cx={o[0] - 22} cy={o[1]} r={34} fill="none" stroke={ACCENT} strokeWidth={2.4} />
        </Svg>
        <Note at={manyAt - 2} x={midX + 16} y={o[1] + 18}>
          <span style={{ ...note(22, INK), whiteSpace: "nowrap" }}>
            <Mark at={manyAt}>many orders</Mark>
          </span>
        </Note>
        <Note at={manyAt + 6} x={midX - 16} y={c[1] - 46} align="right">
          <span style={{ ...note(22, INK), whiteSpace: "nowrap" }}>one customer</span>
        </Note>

        {/* The struck copies stay to the end, with "Just customer_id" under them. */}
        {copies.map((name, i) => {
          const top = copyTop + i * h(ENTITY.row);
          const p = ease(frame, copiesAt - 8 + i * 4, 10);
          if (p <= 0) return null;
          return (
            <div
              key={name}
              style={{
                position: "absolute",
                left: orders.x,
                top,
                width: orders.width,
                height: h(ENTITY.row) - 6,
                boxSizing: "border-box",
                border: `2px dashed ${ACCENT}`,
                borderRadius: 6,
                background: PAPER,
                display: "flex",
                alignItems: "center",
                // Level with the entity's column names: its pad, its PK/FK badge, the gap.
                paddingLeft: ENTITY.pad + 32 + ENTITY.gap,
                opacity: p,
                transform: `translateY(${(1 - p) * -10}px)`,
              }}
            >
              <span style={{ fontFamily: MONO, fontSize: 21, color: INK_SOFT }}>
                <Strike at={copiesAt + 4 + i * 4}>{name}</Strike>
              </span>
            </div>
          );
        })}
        <Note at={justAt + 2} x={orders.x} y={copyTop + copies.length * h(ENTITY.row) + 18}>
          <div style={{ ...label(24, INK), fontWeight: 560, whiteSpace: "nowrap", lineHeight: 1.45 }}>
            <div>
              Just <Mono color={KEY_INK}>customer_id</Mono>.
            </div>
            <div style={{ color: INK_SOFT }}>The customer&apos;s details live in one place.</div>
          </div>
        </Note>
        <Spot id="db-keys-tag" at={customerAt + 4} left={260} top={y(680)} width={250} height={250} />
      </Drift>
    </AbsoluteFill>
  );
};
