import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { Entity, Relation, useEntityLayout } from "../../editorial/erd";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, INK, INK_SOFT, label, note } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { MONO } from "../../theme/fonts";
import { PRICE } from "./data";
import { Arrow, Head, Kicker, lerp, Mark, Pill, pulse, Svg } from "./parts";

/** The writers of what-are-constraints' list, in the order they are named. */
const WRITERS = [
  { name: "Web app", word: "web app" },
  { name: "Mobile app", word: "mobile app" },
  { name: "Nightly import", word: "nightly import" },
  { name: "Queries by hand", word: "someone typing" },
] as const;
/** The one that forgets. */
const FORGETS = 2;
const WRITER_X = 150;
const PILL_X = 400;
const ARROW_X0 = 600;

/** The bad value, as Postgres prints the failing row's price. */
const BAD = PRICE.failing[2] as string;

/**
 * Part 1 opens on Unit 5's bridge: two tables and the key between them, then
 * the values inside them, a price of -3.00, and every writer that has to
 * remember the rule, until one forgets.
 */
export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const open = n.beat("hook").from;
  const guardAt = n.word("hook", "guard");
  const linksAt = n.word("hook", "links");
  const betweenAt = n.word("hook", "between");
  const intoAt = n.word("hook", "INTO");
  const productAt = n.word("bad", "product");
  const minusAt = n.word("bad", "minus");
  const dollarsAt = n.word("bad", "dollars");
  const saleAt = n.word("bad", "sale");
  const mistakeAt = n.word("bad", "mistake");
  const appAt = n.word("app", "app");
  const catchAt = n.word("app", "catch");
  const rarelyAt = n.word("app", "rarely");
  const oneWriterAt = n.word("app", "writer");
  const named = WRITERS.map((w) => n.word("writers", w.word));
  const rememberAt = n.word("writers", "remember");
  const ruleAt = n.word("writers", "rule");
  const oneAt = n.word("forgets", "one");
  const forgetsAt = n.word("forgets", "forgets");

  // The products card slides right to make room for the writers.
  const slide = ease(frame, rarelyAt - 4, 26);
  const products = useEntityLayout({
    x: lerp(470, 1210, slide),
    y: y(440),
    width: 380,
    name: "products",
    columns: [
      { name: "id", type: "integer", key: "PK" },
      { name: "name", type: "text" },
      { name: "price", type: "numeric" },
    ],
  });
  const items = useEntityLayout({
    x: 1010,
    y: y(440) - h(46),
    width: 410,
    name: "order_items",
    columns: [
      { name: "id", type: "integer", key: "PK" },
      { name: "product_id", type: "integer", key: "FK" },
      { name: "quantity", type: "integer" },
    ],
  });
  const link = [products.anchor("right", "id"), items.anchor("left", "product_id")] as const;

  // The writers, spread level with the card once it has arrived.
  const boxMid = (products.top + products.bottom) / 2;
  const rowY = (i: number) => boxMid + (i - 1.5) * h(76);
  const targetY = (i: number) => boxMid + (i - 1.5) * h(40);
  const writerAt = (i: number) => (i === 0 ? catchAt - 2 : named[i] - 2);
  const arrowAt = (i: number) => (i === 0 ? oneWriterAt : named[i] + 4);

  // The import that forgets: its bad value travels down its arrow.
  const travel = ease(frame, forgetsAt + 6, 22);
  const landed = forgetsAt + 26;
  const tokenFrom = [ARROW_X0, rowY(FORGETS)] as const;
  const tokenTo = [products.left - 6, targetY(FORGETS)] as const;

  const dimItems = appAt;
  const chipOut = appAt + 4;

  return (
    <AbsoluteFill>
      {/* ── Sound ── */}
      <Sfx name="el-pop" at={guardAt - 4} level={-30} />
      <Sfx name="el-pencil" at={linksAt + 2} level={-34} />
      <Sfx name="el-tap" at={minusAt - 2} level={-28} />
      <Sfx name="el-whoosh" at={rarelyAt - 4} level={-34} />
      {WRITERS.map((_, i) => (
        <Sfx key={i} name="el-tap" at={writerAt(i)} level={-30} />
      ))}
      <Sfx name="el-scratch" at={forgetsAt} level={-30} />
      <Sfx name="el-pop" at={landed} level={-29} />

      <Kicker at={open - 10}>Why constraints</Kicker>
      <Head lead="Keys guard the links." at={open - 8} turn="What guards the rest?" turnAt={intoAt - 4} />

      <FigLabel n="1" title="Two tables, and the key between them" at={open - 4} x={470} y={y(350)} out={appAt} />

      {/* ── The ERD from Unit 5: two tables and their key ── */}
      <Entity
        layout={products}
        at={guardAt - 6}
        marks={{
          id: { at: betweenAt, tone: "key", out: intoAt + 4 },
          name: { at: intoAt + 2, out: productAt },
          price:
            frame >= landed
              ? { at: landed, tone: "warn" }
              : { at: intoAt + 7, tone: frame >= minusAt - 2 ? "warn" : "note", out: appAt + 6 },
        }}
      />
      <Entity
        layout={items}
        at={linksAt - 8}
        marks={{
          product_id: { at: betweenAt + 4, tone: "key", out: intoAt + 4 },
          quantity: { at: intoAt + 12 },
        }}
        dim={dimItems}
        out={dimItems + 14}
      />
      <Relation
        name="products in order_items"
        points={link}
        from="exactly-one"
        to="zero-or-many"
        at={linksAt}
        dur={16}
        color={BAR}
        dim={dimItems}
        out={dimItems + 14}
      />

      {/* ── A product saved at -3.00 ── */}
      <Ink at={minusAt - 2} dur={12} out={chipOut} style={{ left: 120, top: products.rows[2].mid - 26, whiteSpace: "nowrap" }}>
        <span
          style={{
            display: "inline-block",
            padding: "4px 14px",
            borderRadius: 8,
            border: `2px solid ${frame >= mistakeAt - 2 ? ACCENT : INK_SOFT}`,
            fontFamily: MONO,
            fontSize: 30,
            fontWeight: 600,
            color: ACCENT_INK,
          }}
        >
          price {BAD}
        </span>
      </Ink>
      <Arrow from={[372, products.rows[2].mid]} to={[products.left - 10, products.rows[2].mid]} at={dollarsAt - 2} out={chipOut} />
      <Note at={saleAt - 4} x={122} y={products.rows[2].mid + 40} out={chipOut}>
        <span style={{ ...note(24, INK_SOFT), whiteSpace: "nowrap" }}>
          Not a sale,{" "}
          <span style={{ color: ACCENT_INK, fontWeight: 600 }}>
            <Mark at={mistakeAt} color="color-mix(in srgb, var(--ds-red-500) 22%, transparent)">
              a mistake
            </Mark>
          </span>
        </span>
      </Note>

      {/* ── The writers, each with the rule to remember ── */}
      {WRITERS.map((w, i) => {
        const forgot = i === FORGETS;
        const named2 = pulse(frame, i === 0 ? named[0] : -100, 20);
        return (
          <React.Fragment key={w.name}>
            <Ink at={writerAt(i)} dur={12} style={{ left: WRITER_X, top: rowY(i) - 17, whiteSpace: "nowrap" }}>
              <span
                style={{
                  ...label(26, forgot && frame >= oneAt ? ACCENT_INK : INK),
                  display: "inline-block",
                  transform: `scale(${1 + named2 * 0.08})`,
                  transformOrigin: "0 50%",
                }}
              >
                {forgot ? <Mark at={oneAt}>{w.name}</Mark> : w.name}
              </span>
            </Ink>
            <Pill
              x={PILL_X}
              y={rowY(i)}
              at={i === 0 ? catchAt + 6 : rememberAt + (i - 1) * 5}
              pulses={[ruleAt + i * 3]}
              strikeAt={forgot ? forgetsAt : undefined}
              dim={forgot ? forgetsAt + 10 : undefined}
            >
              {"price >= 0"}
            </Pill>
            <Arrow
              from={[ARROW_X0, rowY(i)]}
              to={[products.left - 8, targetY(i)]}
              at={Math.max(arrowAt(i), rarelyAt + 18)}
              dur={14}
              color={forgot && frame >= forgetsAt ? ACCENT : INK_SOFT}
              width={forgot && frame >= forgetsAt ? 3 : 2.2}
            />
          </React.Fragment>
        );
      })}
      {travel > 0 && travel < 1 ? (
        <Svg>
          <circle
            cx={lerp(tokenFrom[0], tokenTo[0], travel)}
            cy={lerp(tokenFrom[1], tokenTo[1], travel)}
            r={9}
            fill={ACCENT}
          />
        </Svg>
      ) : null}
      <Note at={landed} x={products.left} y={products.bottom + 22} from="up">
        <span style={{ ...note(24, ACCENT_INK), fontWeight: 600, whiteSpace: "nowrap" }}>
          price <span style={{ fontFamily: MONO }}>{BAD}</span> is in
        </span>
      </Note>
    </AbsoluteFill>
  );
};
