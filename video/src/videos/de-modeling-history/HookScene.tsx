import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BLUE_INK, HAIRLINE, INK, INK_SOFT, PAPER, label, note, svgText } from "../../editorial/style";
import { Note, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { SANS } from "../../theme/fonts";
import { HERO, HISTORY, MOVE } from "./data";
import { AUSTIN, AUSTIN_INK, AUSTIN_WASH, BOSTON, BOSTON_INK, BOSTON_WASH, Drift, Headline, Kicker, OK_INK, pulse, Spot, X0 } from "./parts";

/** The timeline runs from the start of 2022 to the start of 2025. */
const T0 = Date.UTC(2022, 0, 1);
const T1 = Date.UTC(2025, 0, 1);
const TL_X0 = 140;
const TL_X1 = 1180;
const BAND_Y = 520;
const BAND_H = 64;
const CARD_Y = 330;

const day = (iso: string) => Date.parse(`${iso}T00:00:00Z`);
const tx = (iso: string) => TL_X0 + ((day(iso) - T0) / (T1 - T0)) * (TL_X1 - TL_X0);

/**
 * The opening, on the page's own customer 42: her Boston years drawn as a
 * band on a timeline, order 101 placed inside them, then the move to Austin
 * ten months later, and the question of which city the order belongs to
 * now. The chameleon, a slowly changing animal, stands beside it. Then the
 * round: fifteen questions, nine worked through and six quick.
 */
export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const startAt = n.word("hook", "Order one oh one");
  const mayAt = n.word("hook", "May twenty twenty-three");
  const bostonAt = n.word("hook", "a customer in Boston");
  const monthsAt = n.word("hook", "Ten months later");
  const movedAt = n.word("hook", "she moved to Austin");
  const askAt = n.word("hook", "Ask the warehouse today");
  const whichAt = n.word("hook", "which city that order came from");
  const dependsAt = n.word("hook", "the answer depends");
  const rowAt = n.word("hook", "her customer row");
  const changeAt = n.word("plan", "Dimensions change");
  const historyAt = n.word("plan", "keep their history");
  const fifteenAt = n.word("plan", "fifteen questions");
  const nineAt = n.word("plan", "Nine get worked through");
  const sixAt = n.word("plan", "six quick ones");
  const end = n.beat("plan").to;

  const order = HISTORY.orders.rows[0];
  const [orderId, orderDate, amount] = order;
  const bandTop = y(BAND_Y);
  const bandH = h(BAND_H);
  const bostonX0 = tx(MOVE.bostonFrom);
  const moveX = tx(MOVE.austinFrom);
  const bostonGrow = ease(frame, bostonAt - 4, 22);
  const austinGrow = ease(frame, movedAt + 2, 22);
  const orderX = tx(orderDate);
  const todayX = TL_X1 - 6;
  const pinIn = ease(frame, startAt + 6, 14);
  const ask = pulse(frame, whichAt + 4, 26);
  // The question hangs over the order until the plan moves on.
  const qIn = ease(frame, whichAt, 12);
  const dimFig = ease(frame, changeAt + 10, 18) * 0.35;

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={startAt + 6} level={-34} />
      <Sfx name="el-whoosh" at={bostonAt - 2} level={-37} />
      <Sfx name="el-whoosh" at={movedAt + 2} level={-37} />
      <Sfx name="el-pop" at={whichAt + 2} level={-34} />
      <Sfx name="el-chime" at={fifteenAt} level={-36} />

      <Drift from={0} to={end + 20}>
        <Kicker at={startAt}>Data engineer interview prep · Data modeling II</Kicker>
        <Headline lead="Customers move." turn="Their orders shouldn’t." at={startAt + 4} turnAt={whichAt - 4} size={72} />
        <Spot id={HERO.id} at={startAt + 14} left={1290} top={y(300)} width={540} height={426} />

        <div style={{ position: "absolute", inset: 0, opacity: 1 - dimFig }}>
          {/* Whose line this is. */}
          <Note at={bostonAt - 6} x={TL_X0} y={bandTop - h(40)}>
            <span style={{ ...label(22, INK_SOFT), whiteSpace: "nowrap" }}>
              customer <Num>42</Num>, as the page&rsquo;s table has her
            </span>
          </Note>

          <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
            {/* The two cities she lived in, drawn as she lived in them. */}
            <rect x={bostonX0} y={bandTop} width={(moveX - bostonX0) * bostonGrow} height={bandH} fill={BOSTON_WASH} stroke={BOSTON} strokeWidth={2} rx={6} />
            <rect x={moveX + 4} y={bandTop} width={(TL_X1 - moveX - 4) * austinGrow} height={bandH} fill={AUSTIN_WASH} stroke={AUSTIN} strokeWidth={2} rx={6} />
            <text x={bostonX0 + 22} y={bandTop + bandH / 2 + 9} style={svgText({ ...label(26, BOSTON_INK), fontWeight: 700 })} opacity={ease(frame, bostonAt + 4, 12)}>
              Boston
            </text>
            <text x={moveX + 24} y={bandTop + bandH / 2 + 9} style={svgText({ ...label(26, AUSTIN_INK), fontWeight: 700 })} opacity={ease(frame, movedAt + 10, 12)}>
              Austin
            </text>

            {/* The years. */}
            <g opacity={ease(frame, startAt + 2, 14)}>
              <line x1={TL_X0} x2={TL_X1} y1={bandTop + bandH + h(12)} y2={bandTop + bandH + h(12)} stroke={HAIRLINE} strokeWidth={1.4} />
              {["2022", "2023", "2024", "2025"].map((yr) => (
                <g key={yr}>
                  <line x1={tx(`${yr}-01-01`)} x2={tx(`${yr}-01-01`)} y1={bandTop + bandH + h(12)} y2={bandTop + bandH + h(22)} stroke={INK_SOFT} strokeWidth={1.4} />
                  <text x={tx(`${yr}-01-01`)} y={bandTop + bandH + h(50)} textAnchor="middle" style={svgText({ fontFamily: SANS, fontSize: 21, fontWeight: 600, color: INK_SOFT })}>
                    {yr}
                  </text>
                </g>
              ))}
            </g>

            {/* The order, pinned to its date inside the Boston years. */}
            <g opacity={pinIn}>
              <line x1={orderX} x2={orderX} y1={y(CARD_Y) + h(96)} y2={bandTop} stroke={INK} strokeWidth={2} />
              <circle cx={orderX} cy={bandTop} r={7} fill={INK} />
            </g>

            {/* The move, on its date. */}
            <g opacity={ease(frame, movedAt, 12)}>
              <line x1={moveX} x2={moveX} y1={bandTop - h(26)} y2={bandTop + bandH + h(12)} stroke={INK} strokeWidth={2} strokeDasharray="6 5" />
            </g>

            {/* Today, at the far end. */}
            <g opacity={ease(frame, askAt, 12)}>
              <line x1={todayX} x2={todayX} y1={bandTop - h(26)} y2={bandTop + bandH} stroke={ACCENT} strokeWidth={3} />
            </g>
          </svg>

          {/* The order card. */}
          <Note at={startAt + 2} x={orderX - 150} y={y(CARD_Y)}>
            <div
              style={{
                width: 300,
                padding: "10px 18px",
                border: `2px solid ${INK}`,
                borderRadius: 8,
                background: PAPER,
                boxShadow: ask > 0 ? `0 0 0 ${6 * ask}px color-mix(in srgb, ${ACCENT} ${30 * ask}%, transparent)` : undefined,
              }}
            >
              <div style={{ ...note(27, INK), fontWeight: 700, whiteSpace: "nowrap" }}>
                Order <Num>{orderId}</Num>
              </div>
              <div style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap", opacity: ease(frame, mayAt, 12) }}>
                {orderDate} · $<Num>{amount}</Num>
              </div>
            </div>
          </Note>

          {/* The move's date, under the dashed line. */}
          <Note at={monthsAt} x={moveX - 12} y={bandTop - h(64)} align="right">
            <span style={{ ...label(22, INK), fontWeight: 650, whiteSpace: "nowrap" }}>
              moved {MOVE.austinFrom}
            </span>
          </Note>
          <Note at={askAt + 4} x={todayX - 8} y={bandTop - h(64)} align="right" from="right">
            <span style={{ ...label(22, ACCENT_INK), fontWeight: 700, whiteSpace: "nowrap" }}>today</span>
          </Note>

          {/* The question. */}
          <div
            style={{
              position: "absolute",
              left: orderX + 170,
              top: y(CARD_Y) + h(8),
              opacity: qIn,
              transform: `translateX(${(1 - qIn) * -14}px)`,
              display: "flex",
              alignItems: "baseline",
              gap: 14,
              whiteSpace: "nowrap",
            }}
          >
            <span style={{ ...note(28, ACCENT_INK), fontWeight: 700 }}>which city?</span>
            <span style={{ ...note(28, BOSTON_INK), fontWeight: 700 }}>Boston</span>
            <span style={{ ...note(24, INK_SOFT) }}>or</span>
            <span style={{ ...note(28, AUSTIN_INK), fontWeight: 700 }}>Austin</span>
          </div>
          <Note at={dependsAt} x={orderX + 170} y={y(CARD_Y) + h(58)}>
            <span style={{ ...note(23, INK_SOFT), whiteSpace: "nowrap" }}>
              <span style={{ opacity: ease(frame, rowAt, 10) }}>depends on how her customer row handled the move</span>
            </span>
          </Note>
        </div>

        {/* The round. */}
        <Note at={changeAt - 2} x={X0} y={y(700)}>
          <span style={{ ...note(32, INK), fontWeight: 700, whiteSpace: "nowrap" }}>
            Dimensions change.{" "}
            <span style={{ color: OK_INK, opacity: ease(frame, historyAt, 12) }}>The model has to keep their history.</span>
          </span>
        </Note>
        <Note at={fifteenAt - 2} x={X0} y={y(770)}>
          <span style={{ ...note(28, INK), whiteSpace: "nowrap" }}>
            <b style={{ color: BLUE_INK }}>
              <Num>15</Num> questions
            </b>{" "}
            on history and the special dimensions
          </span>
        </Note>
        <Note at={nineAt - 2} x={X0} y={y(826)}>
          <span style={{ ...note(28, INK), whiteSpace: "nowrap" }}>
            <b style={{ color: BLUE_INK }}>
              <Num>9</Num>
            </b>{" "}
            worked through
            <span style={{ opacity: ease(frame, sixAt - 2, 12) }}>
              , then <b style={{ color: BLUE_INK }}><Num>6</Num></b> quick ones
            </span>
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
