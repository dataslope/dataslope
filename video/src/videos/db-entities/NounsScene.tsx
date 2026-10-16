import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { ENTITY, Entity, entityLayout } from "../../editorial/erd";
import { useLayout } from "../../editorial/layout";
import { body, INK, INK_SOFT, label, note, PAPER } from "../../editorial/style";
import { Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { MONO } from "../../theme/fonts";
import { Drift, Headline, Kicker, lerp, Mark, Spot, Stack, Svg, Word } from "./parts";

const BOX_Y = 500;
const BOX_W = 340;
const BOXES = [
  { name: "customers", x: 200 },
  { name: "orders", x: 790 },
  { name: "products", x: 1380 },
] as const;
const CHIP_Y = 800;

/**
 * Part 1 opens on Unit 1's bridge: a design starts by naming the things the
 * data is about. One sentence, its nouns circled and turned into candidate
 * boxes, the many-of-these test, and a status that turns out to be a fact
 * about an order rather than a thing of its own.
 */
export const NounsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const hookFrom = n.beat("hook").from;
  const thingsAt = n.word("hook", "things");
  const sentenceAt = n.word("hook", "one sentence");
  const words = (["Customers", "place", "orders", "for", "products"] as const).map((w) => n.word("hook", w));
  const circleNounsAt = n.word("nouns", "Circle");
  const circleAt = [n.word("nouns", "customers"), n.word("nouns", "orders"), n.word("nouns", "products")];
  const candidateAt = n.word("nouns", "candidate");
  const trackingAt = n.word("nouns", "tracking");
  const testAt = n.word("many", "test");
  const canAt = n.word("many", "Can there");
  const lotsAt = [n.word("many", "customers"), n.word("many", "orders"), n.word("many", "products")];
  const statusAt = n.word("status", "status");
  const thoughAt = n.word("status", "though");
  const describesAt = n.word("status", "describes");
  const anOrderAt = n.word("status", "an order");
  const factAt = n.word("status", "fact");
  const notAt = n.word("status", "not a thing");
  const end = n.beat("status").to;

  const layouts = BOXES.map((b) =>
    entityLayout(
      { x: b.x, y: y(BOX_Y), width: BOX_W, name: b.name, columns: b.name === "orders" ? [{ name: "status" }] : [] },
      h,
    ),
  );
  const orders = layouts[1];

  // The status chip: set down below the boxes on "status", then carried up
  // into the orders box on "describes", where it lands as the box's first row.
  const chipIn = ease(frame, statusAt - 2, 12);
  const lift = ease(frame, describesAt, 20);
  const landed = describesAt + 18;
  const chipX = lerp(orders.x, orders.x, lift);
  const chipY = lerp(y(CHIP_Y), orders.rows[0].top, lift);
  const chipOp = chipIn * (1 - ease(frame, landed, 6));

  // Where the bracket under the candidates runs.
  const bx0 = BOXES[0].x;
  const bx1 = BOXES[2].x + BOX_W;
  const by = y(BOX_Y) + h(ENTITY.head) + h(62);
  const bracket = ease(frame, candidateAt - 2, 16);
  const bracketOut = ease(frame, thoughAt, 12);

  return (
    <AbsoluteFill>
      {/* ── Sound: the circles, the crates, the stacks fanning out, the chip carried in ── */}
      <Sfx name="el-pencil" at={circleAt[0]} level={-35} />
      <Sfx name="el-pencil" at={circleAt[2]} level={-35} />
      <Sfx name="el-pop" at={candidateAt} level={-31} />
      <Sfx name="el-sprinkle" at={lotsAt[0]} level={-34} />
      <Sfx name="el-whoosh" at={describesAt} level={-34} />
      <Sfx name="el-tap" at={landed} level={-29} />

      <Drift from={trackingAt} to={end + 50} scale={0.02} origin={[960, 560]}>
        <Kicker at={hookFrom - 10}>Entities</Kicker>
        <Headline
          lead={
            <>
              Start with the <Mark at={thingsAt}>things.</Mark>
            </>
          }
          leadAt={hookFrom - 8}
          turn="Circle the nouns."
          turnAt={circleNounsAt - 4}
        />

        {/* ── The sentence, word by word as it is read ── */}
        <Ink at={sentenceAt - 4} dur={12} style={{ left: 122, top: y(292), whiteSpace: "nowrap" }}>
          <span style={label(22, INK_SOFT)}>One sentence</span>
        </Ink>
        <div style={{ position: "absolute", left: 120, top: y(330), ...body(64, true), color: INK, whiteSpace: "nowrap", wordSpacing: "0.32em" }}>
          <Word at={words[0] - 2} circleAt={circleAt[0]}>
            Customers
          </Word>{" "}
          <Word at={words[1] - 2}>place</Word>{" "}
          <Word at={words[2] - 2} circleAt={circleAt[1]}>
            orders
          </Word>{" "}
          <Word at={words[3] - 2}>for</Word>{" "}
          <Word at={words[4] - 2} circleAt={circleAt[2]}>
            products.
          </Word>
        </div>

        {/* ── The candidates: one box per noun, each on its circle ── */}
        {layouts.map((l, i) => (
          <Stack key={`s${l.name}`} layout={l} at={lotsAt[i] - 2} out={thoughAt} />
        ))}
        {layouts.map((l, i) => (
          <Entity
            key={l.name}
            layout={l}
            at={circleAt[i] + 6}
            rowAt={l.name === "orders" ? { status: landed } : undefined}
            marks={l.name === "orders" ? { status: { at: factAt, tone: "note" } } : undefined}
          />
        ))}

        {/* "Each one's a candidate entity": a bracket under all three. */}
        {bracket > 0 && bracketOut < 1 ? (
          <Svg opacity={1 - bracketOut}>
            <path
              d={`M${bx0},${by - 12} V${by} H${lerp(bx0, bx1, bracket)}${bracket > 0.98 ? ` V${by - 12}` : ""}`}
              fill="none"
              stroke={INK_SOFT}
              strokeWidth={2}
              strokeLinejoin="round"
            />
          </Svg>
        ) : null}
        <Note at={candidateAt + 4} out={thoughAt} x={bx0} y={by + 16}>
          <span style={{ ...note(23, INK_SOFT), whiteSpace: "nowrap" }}>Candidate entities: kinds of things worth tracking</span>
        </Note>

        {/* ── The test ── */}
        <Note at={testAt - 6} out={statusAt - 4} x={122} y={y(708)}>
          <span style={label(22, INK_SOFT)}>A test</span>
        </Note>
        <Ink at={canAt - 4} dur={16} out={statusAt - 4} style={{ left: 232, top: y(696), whiteSpace: "nowrap" }}>
          <span style={{ ...body(40, true), color: INK }}>Can there be many of these?</span>
        </Ink>

        {/* ── A status: set down on its own, then carried into orders ── */}
        {chipOp > 0 ? (
          <div
            style={{
              position: "absolute",
              left: chipX,
              top: chipY,
              width: BOX_W,
              height: orders.row,
              boxSizing: "border-box",
              border: `2px dashed ${INK_SOFT}`,
              borderRadius: 6,
              background: PAPER,
              display: "flex",
              alignItems: "center",
              padding: `0 ${ENTITY.pad}px`,
              opacity: chipOp,
              transform: `translateY(${(1 - chipIn) * 12}px)`,
            }}
          >
            <span style={{ fontFamily: MONO, fontSize: 21, color: INK }}>status</span>
          </div>
        ) : null}
        <Note at={statusAt + 4} out={describesAt} x={orders.x - 24} y={y(CHIP_Y) + 8} align="right" from="right">
          <span style={{ ...note(23, INK_SOFT), whiteSpace: "nowrap" }}>A thing of its own?</span>
        </Note>
        <Note at={notAt - 6} x={orders.x} y={orders.top + orders.head + orders.row + 22} from="up">
          <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>
            A fact <span style={{ color: INK_SOFT }}>about an order, not a thing</span>
          </span>
        </Note>
        {/* "An order": the box the status belongs to, named. */}
        <Svg opacity={ease(frame, anOrderAt - 4, 8) * (1 - ease(frame, landed + 4, 10))}>
          <rect
            x={orders.x - 6}
            y={orders.y - 6}
            width={BOX_W + 12}
            height={orders.head + 12}
            rx={9}
            fill="none"
            stroke={INK}
            strokeWidth={1.5}
            strokeDasharray="5 5"
          />
        </Svg>
        <Spot id="db-entities-crates" at={candidateAt} left={1290} top={y(650)} width={480} height={320} />
      </Drift>
    </AbsoluteFill>
  );
};
