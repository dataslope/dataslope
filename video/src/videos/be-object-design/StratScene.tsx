import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, BLUE_INK, INK, INK_SOFT } from "../../editorial/style";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { SHIPPING } from "./data";
import { ACCENT_INK, ArtSpot, Box, Drift, Flow, Line, Mark, OK_INK, Pill, pulse, Strike, X0 } from "./parts";

const SHIP = { x: 400, w: 400, top: 420, h: 190 };
const CARD = { x: 990, w: 370, h: 62 };
const CARD_TOPS = [392, 482, 572];
const COST_X = 1420;

/** "5.0" → "5", 6 → "6": a price as the narration says it. */
const price = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(2));

/**
 * Question 6. A shipment holds a pricing card and asks it for the cost of a
 * parcel weighing 3: the flat rate says 5, by weight at 2 a unit says 6 (the
 * page's run). A third rule, free above a weight of 10, arrives as a new
 * card while the shipment is not edited (5 at 3, 0 at 12). With only one
 * rule, the interface around the cards is struck as indirection.
 */
export const StratScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  const from = n.beat("strat").from;
  const qAt = n.word("strat", "Question six");
  const textAt = n.word("strat", "What is the Strategy pattern?");
  const behindAt = n.word("strat", "interchangeable algorithms behind one interface");
  const pickAt = n.word("strat", "pick one at runtime");
  const ifAt = n.word("strat", "instead of a sprawling if-else");
  const shipAt = n.word("strat-ship", "A shipment holds a pricing strategy");
  const asksAt = n.word("strat-ship", "asks it for the cost");
  const parcelAt = n.word("strat-ship", "For a parcel weighing three");
  const flatAt = n.word("strat-ship", "the flat rate says five");
  const weightAt = n.word("strat-ship", "Pricing by weight");
  const sixAt = n.word("strat-ship", "says six");
  const thirdAt = n.word("strat-third", "A third rule");
  const freeAt = n.word("strat-third", "free above a weight of ten");
  const classAt = n.word("strat-third", "is a new class");
  const notEditedAt = n.word("strat-third", "The shipment isn't edited");
  const ocAt = n.word("strat-third", "that's open-closed");
  const oneAt = n.word("strat-one", "With only one rule");
  const indirectionAt = n.word("strat-one", "the interface is just indirection");
  const plainAt = n.word("strat-one", "A plain function does the job");
  const secondAt = n.word("strat-one", "until a second rule really arrives");
  const end = n.beat("strat-one").to;

  const shipTop = y(SHIP.top);
  const shipMid = shipTop + SHIP.h / 2;
  const cardTop = (i: number) => y(CARD_TOPS[i]);
  const cardMid = (i: number) => cardTop(i) + CARD.h / 2;
  const active = frame >= thirdAt ? 2 : frame >= weightAt ? 1 : 0;
  const fold = oneAt + 4;
  const cards = [
    { title: "Flat rate", at: flatAt - 6 },
    { title: "By weight, 2 a unit", at: weightAt - 2 },
    { title: "Free above a weight of 10", at: thirdAt + 2 },
  ];
  const brTop = cardTop(0) - 22;
  const brBottom = cardTop(2) + CARD.h + 22;

  return (
    <AbsoluteFill>
      <Sfx name="el-scratch" at={ifAt + 8} level={-33} />
      <Sfx name="el-tap" at={shipAt} level={-32} />
      <Sfx name="el-pop" at={parcelAt} level={-30} />
      <Sfx name="el-tap" at={flatAt + 6} level={-30} />
      <Sfx name="el-tap" at={sixAt} level={-30} />
      <Sfx name="el-whoosh" at={thirdAt + 2} level={-35} />
      <Sfx name="el-tap" at={freeAt + 8} level={-30} />
      <Sfx name="el-scratch" at={indirectionAt + 6} level={-32} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={6} at={qAt - 4} textAt={textAt - 4}>
          What is the Strategy pattern?
        </QuestionCard>
        <Line x={X0} y={y(270)} at={behindAt} size={26}>
          Interchangeable algorithms behind one interface
          <span style={{ opacity: ease(frame, pickAt, 10) }}>, picked at runtime</span>
        </Line>
        <Line x={X0} y={y(316)} at={ifAt} size={26} color={INK_SOFT}>
          instead of <Strike at={ifAt + 8}>a sprawling if-else</Strike>
        </Line>

        <ArtSpot id="parcel" at={parcelAt} left={X0} top={shipMid - 80} h={160} />

        {/* The shipment, which asks whichever card it holds. */}
        <Box x={SHIP.x} y={shipTop} w={SHIP.w} h={SHIP.h} at={shipAt} tone="plain" title="Shipment" lit={pulse(frame, notEditedAt, 24)}>
          <span style={{ fontFamily: "inherit", fontSize: 22, color: INK_SOFT, fontWeight: 600, opacity: ease(frame, parcelAt, 10), whiteSpace: "nowrap" }}>
            a parcel weighing <b style={{ color: BLUE_INK }}>{SHIPPING.weight}</b>
          </span>
          <span style={{ fontFamily: "inherit", fontSize: 22, color: INK_SOFT, fontWeight: 600, opacity: ease(frame, asksAt, 10), whiteSpace: "nowrap" }}>
            asks its card for the cost
          </span>
        </Box>
        <Pill x={SHIP.x} y={shipTop + SHIP.h + 24} at={notEditedAt} tone="ok" size={21}>
          ✓ not edited
        </Pill>
        <Line x={SHIP.x + 190} y={shipTop + SHIP.h + 30} at={ocAt} size={23} color={OK_INK} weight={650}>
          open-closed
        </Line>

        {/* The cards, inside one interface. */}
        <div
          style={{
            position: "absolute",
            left: CARD.x - 22,
            top: brTop,
            width: CARD.w + 44,
            height: brBottom - brTop,
            boxSizing: "border-box",
            border: `2.5px dashed ${frame >= indirectionAt ? ACCENT : INK_SOFT}`,
            borderRadius: 16,
            opacity: ease(frame, behindAt + 6, 12) * (1 - ease(frame, plainAt + 10, 14) * 0.7),
          }}
        />
        <Line x={CARD.x - 22} y={brTop - 40} at={behindAt + 6} size={21} weight={700} color={frame >= indirectionAt ? ACCENT_INK : INK_SOFT}>
          <Strike at={indirectionAt + 6}>one interface: a cost for a weight</Strike>
        </Line>
        {cards.map((c, i) => (
          <React.Fragment key={c.title}>
            <Box
              x={CARD.x + (i === 2 ? 40 * (1 - ease(frame, c.at, 14)) : 0)}
              y={cardTop(i)}
              w={CARD.w}
              h={CARD.h}
              at={c.at}
              title={c.title}
              size={22}
              tone={i === 2 ? "ok" : "data"}
              lit={i === active ? 1 : 0}
              out={i > 0 ? fold + (i - 1) * 4 : undefined}
            />
            <Flow
              points={[
                [SHIP.x + SHIP.w + 6, shipMid],
                [SHIP.x + SHIP.w + 70, shipMid],
                [SHIP.x + SHIP.w + 70, cardMid(i)],
                [CARD.x - 8, cardMid(i)],
              ]}
              at={c.at + 4}
              dur={12}
              width={2.2}
              head={12}
              color={i === active ? INK : INK_SOFT}
              opacity={i === active || frame >= fold ? 1 : 0.35}
              out={i > 0 ? fold + (i - 1) * 4 : undefined}
            />
          </React.Fragment>
        ))}
        <Line x={COST_X} y={cardMid(0) - 16} at={flatAt + 6} size={26} weight={600}>
          costs <b style={{ color: BLUE_INK }}>{price(SHIPPING.flat)}</b>
        </Line>
        <Line x={COST_X} y={cardMid(1) - 16} at={sixAt} size={26} weight={600} out={fold + 4}>
          {SHIPPING.weight} × 2 = <b style={{ color: BLUE_INK }}>{price(SHIPPING.byWeight)}</b>
        </Line>
        <Line x={COST_X} y={cardMid(2) - 16} at={freeAt + 8} size={26} weight={600} out={fold + 8}>
          weight {SHIPPING.third.light.weight}: <b style={{ color: BLUE_INK }}>{price(SHIPPING.third.light.cost)}</b>
          <span style={{ opacity: ease(frame, classAt, 10) }}>
            {" "}
            · {SHIPPING.third.heavy.weight}: <b style={{ color: OK_INK }}>{price(SHIPPING.third.heavy.cost)}</b>
          </span>
        </Line>

        {/* One rule: the interface is extra. */}
        <Line x={CARD.x - 22} y={y(740)} at={indirectionAt} size={26} weight={600}>
          One rule: the interface is just <span style={{ color: ACCENT_INK }}>indirection</span>
        </Line>
        <Line x={CARD.x - 22} y={y(740) + 48} at={plainAt} size={26}>
          <Mark at={plainAt + 6}>a plain function</Mark> does the job
          <span style={{ color: INK_SOFT, opacity: ease(frame, secondAt, 10) }}>, until a second rule</span>
        </Line>
      </Drift>
    </AbsoluteFill>
  );
};
