import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { Entity, useEntityLayout } from "../../editorial/erd";
import { useLayout } from "../../editorial/layout";
import { body, halo, INK, INK_SOFT, note } from "../../editorial/style";
import { Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { Fig } from "./kit";
import { Drift, Headline, Kicker, Link, Mark, pulse, Spot } from "./parts";

const BOX_Y = 384;
const BOX_W = 360;
const XS = [150, 780, 1410];
const SENT_Y = 690;
const SENT_STEP = 96;

/**
 * Part 1 opens on Unit 2's bridge: entities never live alone. Three boxes
 * arrive on their nouns and the lines between them on their verbs, bare,
 * with no count at either end yet; then a specific verb against a vague one.
 */
export const VerbsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  // ── Cues ──
  const hookFrom = n.beat("hook").from;
  const aloneAt = n.word("hook", "alone");
  const customersAt = n.word("hook", "Customers");
  const placeAt = n.word("hook", "place");
  const ordersAt = n.word("hook", "orders", { nth: 1 });
  const orders2At = n.word("hook", "orders", { nth: 2 });
  const containAt = n.word("hook", "contain");
  const productsAt = n.word("hook", "products");
  const nounsAt = n.word("verbs", "nouns");
  const relAt = n.word("verbs", "relationships");
  const verbsAt = n.word("verbs", "verbs");
  const readsAt = n.word("verbs", "reads");
  const placesAt = n.word("verbs", "Customer places order");
  const moreAt = n.word("verbs", "says more");
  const hasAt = n.word("verbs", "customer has order");
  const verbsTo = n.beat("verbs").to;

  const boxes = [
    useEntityLayout({
      x: XS[0],
      y: y(BOX_Y),
      width: BOX_W,
      name: "customers",
      columns: [{ name: "id" }, { name: "name" }],
    }),
    useEntityLayout({
      x: XS[1],
      y: y(BOX_Y),
      width: BOX_W,
      name: "orders",
      columns: [{ name: "id" }, { name: "placed_on" }],
    }),
    useEntityLayout({
      x: XS[2],
      y: y(BOX_Y),
      width: BOX_W,
      name: "products",
      columns: [{ name: "id" }, { name: "name" }],
    }),
  ];
  const boxAt = [customersAt - 4, ordersAt - 6, productsAt - 4];
  const lines = [
    { a: boxes[0].anchor("right"), b: boxes[1].anchor("left"), at: placeAt - 2, verb: "places" },
    { a: boxes[1].anchor("right"), b: boxes[2].anchor("left"), at: containAt - 2, verb: "contains" },
  ];
  // "orders matter": the orders box swells as it is named again.
  const swell = [pulse(frame, nounsAt, 20), pulse(frame, orders2At, 20) + pulse(frame, nounsAt + 5, 20), pulse(frame, nounsAt + 10, 20)];

  return (
    <AbsoluteFill>
      {/* ── Sound: each box, each line, the sentence ── */}
      {boxAt.map((t, i) => (
        <Sfx key={i} name="el-pop" at={t} level={-30} />
      ))}
      {lines.map((l, i) => (
        <Sfx key={i} name="el-pencil" at={l.at} level={-34} />
      ))}
      <Sfx name="el-tap" at={readsAt - 2} level={-29} />

      <Kicker at={hookFrom - 10}>What a relationship is</Kicker>
      <Headline lead="Entities never live alone." at={hookFrom - 6} out={relAt - 8} />
      <Headline lead="Relationships are" at={relAt - 2} turn="the verbs." turnAt={verbsAt - 4} />
      <Spot id="db-relationships-crates" at={aloneAt - 4} left={1390} top={y(84)} width={430} height={203} />

      <Drift from={containAt} to={verbsTo + 50} scale={0.02} origin={[960, y(520)]}>
        <Fig n="1" at={customersAt - 8} x={XS[0]} y={y(300)}>
          Three entities, and the lines between them
        </Fig>

        {boxes.map((b, i) => (
          <div
            key={b.name}
            style={{
              position: "absolute",
              inset: 0,
              transform: `scale(${1 + 0.035 * swell[i]})`,
              transformOrigin: `${b.x + b.width / 2}px ${b.y + b.head / 2}px`,
            }}
          >
            <Entity layout={b} at={boxAt[i]} rowGap={4} />
          </div>
        ))}

        {/* The verbs: bare lines, related but with no count at either end. */}
        {lines.map((l) => (
          <React.Fragment key={l.verb}>
            <Link name={`verbs ${l.verb}`} points={[l.a, l.b]} at={l.at} />
            <div
              style={{
                position: "absolute",
                left: (l.a[0] + l.b[0]) / 2,
                top: l.a[1] - 40,
                transform: "translateX(-50%)",
                opacity: ease(frame, l.at + 8, 12),
                whiteSpace: "nowrap",
                ...note(23, INK_SOFT),
                fontStyle: "italic",
                ...halo,
              }}
            >
              <Mark at={verbsAt + (l.verb === "places" ? 0 : 6)}>{l.verb}</Mark>
            </div>
          </React.Fragment>
        ))}
        {/* "the nouns": each box's name is one. */}
        {boxes.map((b, i) => (
          <div
            key={b.name}
            style={{
              position: "absolute",
              left: b.x + b.width / 2,
              top: b.bottom + 18,
              transform: "translateX(-50%)",
              opacity: ease(frame, nounsAt + i * 5, 12),
              ...note(21, INK_SOFT),
              fontStyle: "italic",
            }}
          >
            a noun
          </div>
        ))}
        {lines.map((l, i) => (
          <div
            key={l.verb}
            style={{
              position: "absolute",
              left: (l.a[0] + l.b[0]) / 2,
              top: l.a[1] + 22,
              transform: "translateX(-50%)",
              opacity: ease(frame, verbsAt + i * 6, 12),
              ...note(21, INK_SOFT),
              fontStyle: "italic",
            }}
          >
            a verb
          </div>
        ))}

        {/* ── The line as a sentence ── */}
        <Ink at={readsAt - 4} dur={16} style={{ left: XS[0], top: y(SENT_Y), whiteSpace: "nowrap", display: "flex", alignItems: "baseline", gap: 28 }}>
          <span style={{ ...body(46), color: INK }}>
            Customer <Mark at={placesAt + 4}>places</Mark> order.
          </span>
          <Ink at={moreAt - 2} dur={12} style={{ position: "relative" }}>
            <span style={{ ...note(23, INK_SOFT) }}>specific</span>
          </Ink>
        </Ink>
        <Ink
          at={hasAt - 4}
          dur={16}
          style={{ left: XS[0], top: y(SENT_Y + SENT_STEP), whiteSpace: "nowrap", display: "flex", alignItems: "baseline", gap: 28 }}
        >
          <span style={{ ...body(46), color: INK_SOFT, opacity: 0.8 }}>Customer has order.</span>
          <Ink at={hasAt + 10} dur={12} style={{ position: "relative" }}>
            <span style={{ ...note(23, INK_SOFT) }}>less precise</span>
          </Ink>
        </Ink>
      </Drift>
    </AbsoluteFill>
  );
};
