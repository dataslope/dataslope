import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, BAR, BLUE_INK, INK, INK_SOFT, PAPER, TABULAR, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { STREAM } from "./data";
import { Cell, Drift, Headline, Kicker, Legend, OK_INK, Spot, X0 } from "./parts";

/** The belt of events, in the layout's coordinates. */
const BELT_Y = 300;
const BELT_RIGHT = 1360;
const CHIP_W = 132;
const CHIP_H = 52;
/** Frames between two chips, and pixels a chip moves a frame. */
const EVERY = 44;
const SPEED = 3.6;
const KINDS = ["click", "payment", "reading", "click", "click", "payment", "reading", "click"];

/** The three things a streaming round tests, each with its cue. */
const TESTS = [
  { cue: "how Kafka", text: "how Kafka, a distributed log, spreads it across machines" },
  { cue: "what a delivery guarantee", text: "what a delivery guarantee really promises" },
  { cue: "how to count over time", text: "how to count over time when events arrive late and out of order" },
];

/**
 * The opening, on Part 7's hand-over: a belt of events that keeps coming
 * from the right and never ends, the three things a streaming round tests,
 * then the round itself: fifteen questions, twelve on the video's own stream
 * of twelve clicks from four users (shown as it will be used), three quick.
 */
export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const startAt = n.word("hook", "The data never stops arriving");
  const clicksAt = n.word("hook", "Clicks");
  const lastAt = n.word("hook", "no last row to wait for");
  const testAt = n.word("hook", "Streaming interviews test");
  const tests = TESTS.map((t) => ({ ...t, at: n.word("hook", t.cue) }));
  const lateAt = n.word("hook", "late and out of order");
  const fifteenAt = n.word("plan", "Fifteen questions");
  const twelveAt = n.word("plan", "twelve worked through");
  const ownAt = n.word("plan", "the video's own");
  const clicksFourAt = n.word("plan", "twelve clicks from four users");
  const quickAt = n.word("plan", "three quick ones");
  const end = n.beat("plan").to;

  // The belt: a chip enters at the right every EVERY frames, from the first
  // word on, and slides left until it fades at the margin. It never stops.
  const beltStart = startAt + 6;
  const chips: { k: number; x: number; o: number }[] = [];
  const made = Math.floor((frame - beltStart) / EVERY);
  for (let k = Math.max(0, made - 24); k <= made; k++) {
    const age = frame - (beltStart + k * EVERY);
    if (age < 0) continue;
    const x = BELT_RIGHT - CHIP_W - age * SPEED;
    if (x < X0 - 10) continue;
    const fadeIn = Math.min(1, age / 8);
    const fadeOut = Math.min(1, (x - X0 + 10) / 90);
    chips.push({ k, x, o: fadeIn * fadeOut });
  }
  const kindsIn = ease(frame, clicksAt - 4, 10);

  const planTop = y(640);

  return (
    <AbsoluteFill>
      <Sfx name="el-whoosh" at={beltStart} level={-36} />
      {tests.map((t) => (
        <Sfx key={t.cue} name="el-tap" at={t.at} level={-36} />
      ))}
      <Sfx name="el-chime" at={fifteenAt} level={-34} />
      <Sfx name="el-sprinkle" at={clicksFourAt} level={-33} />

      <Drift from={0} to={end + 20}>
        <Kicker at={startAt}>Data engineer interview prep · Streaming and messaging</Kicker>
        <Headline lead="The data never stops arriving." at={startAt} size={72} />
        <Spot id="de-streaming-salmon" at={startAt + 14} left={1452} top={y(286)} width={360} height={449} />

        {/* The belt of events, coming from the right for as long as the scene runs. */}
        <div style={{ position: "absolute", left: X0, top: y(BELT_Y) + CHIP_H / 2, width: (BELT_RIGHT - X0) * ease(frame, startAt, 20), height: 2, background: INK_SOFT, opacity: 0.35 }} />
        {chips.map((c) => (
          <div
            key={c.k}
            style={{
              position: "absolute",
              left: c.x,
              top: y(BELT_Y),
              width: CHIP_W,
              height: CHIP_H,
              boxSizing: "border-box",
              borderRadius: 26,
              border: `2.5px solid ${BAR}`,
              background: `color-mix(in srgb, ${BAR} 12%, ${PAPER})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              ...label(21, BLUE_INK),
              fontWeight: 700,
              opacity: c.o,
            }}
          >
            <span style={{ opacity: kindsIn }}>{KINDS[c.k % KINDS.length]}</span>
          </div>
        ))}
        <Note at={lastAt} x={BELT_RIGHT - 40} y={y(BELT_Y) + CHIP_H + h(16)} align="right">
          <span style={{ ...note(25, INK_SOFT), fontStyle: "italic", whiteSpace: "nowrap" }}>no last row to wait for</span>
        </Note>

        {/* What the round tests. */}
        <Note at={testAt} x={X0} y={y(420)}>
          <span style={{ ...label(22, INK_SOFT), fontWeight: 650, whiteSpace: "nowrap" }}>A streaming round tests</span>
        </Note>
        {tests.map((t, i) => (
          <Note key={t.cue} at={t.at - 2} x={X0} y={y(466) + i * h(58)}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 16, whiteSpace: "nowrap" }}>
              <span
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  border: `2.5px solid ${INK}`,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  ...label(20, INK),
                  fontWeight: 800,
                  ...TABULAR,
                }}
              >
                {i + 1}
              </span>
              <span style={{ ...note(29, INK), fontWeight: 560 }}>
                {i === 2 ? (
                  <>
                    how to count over time when events arrive{" "}
                    <span style={{ color: ease(frame, lateAt, 10) > 0.5 ? ACCENT_INK : INK, fontWeight: ease(frame, lateAt, 10) > 0.5 ? 700 : 560 }}>
                      late and out of order
                    </span>
                  </>
                ) : (
                  t.text
                )}
              </span>
            </span>
          </Note>
        ))}

        {/* The round. */}
        <Note at={fifteenAt - 2} x={X0} y={planTop}>
          <span style={{ ...note(34, INK), fontWeight: 750, whiteSpace: "nowrap" }}>
            <span style={TABULAR}>15</span> questions
          </span>
        </Note>
        <Note at={twelveAt - 2} x={X0} y={planTop + h(60)}>
          <span style={{ ...note(27, INK), whiteSpace: "nowrap" }}>
            <b style={{ color: BLUE_INK, ...TABULAR }}>12</b> worked through on one small stream
            <span style={{ ...label(22, INK_SOFT), fontWeight: 600, opacity: ease(frame, ownAt, 10) }}> · the video's own</span>
          </span>
        </Note>
        {STREAM.map((c, i) => (
          <Cell
            key={c.i}
            x={X0 + i * 50}
            y={planTop + h(112)}
            w={42}
            h={42}
            user={c.user}
            size={19}
            opacity={ease(frame, clicksFourAt + i * 1.5, 8)}
          >
            {c.t}
          </Cell>
        ))}
        <Legend x={X0 + 12 * 50 + 24} y={planTop + h(112) + 10} at={clicksFourAt + 14} note="· 12 clicks, each at its second" />
        <Note at={quickAt - 2} x={X0} y={planTop + h(178)}>
          <span style={{ ...note(27, INK), whiteSpace: "nowrap" }}>
            then <b style={{ color: OK_INK, ...TABULAR }}>3</b> quick ones
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
