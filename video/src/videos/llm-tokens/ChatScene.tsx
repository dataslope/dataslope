import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { headline, INK, INK_SOFT, label, note, TABULAR } from "../../editorial/style";
import { FigLabel, NextLine, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { MONO } from "../../theme/fonts";
import { BERRY, CHERRY, CONVERSATION, num } from "./data";
import { ChipFace, Dim, Drift, FIG_Y, FOCUS_INK, Headline, pulse, Spot, TOKEN, X0 } from "./parts";

/** Fig. 15: one bar per turn, what that turn sends. */
const BAR_X = 170;
const BAR_W = 58;
const BAR_GAP = 24;
const BASE = 820;
/** Pixels (before the layout stretch) per token. */
const PER_TOKEN = 400 / 7000;
/** The right column: the bill, then the two ids. */
const RX = 1300;
const BERRY_X = 1410;
const CHERRY_X = 1690;

/**
 * A conversation resends its whole history on every turn, the lesson's
 * example: ten turns leave it 7,000 tokens long and bill 43,500 input tokens.
 * Then the bridge to Unit 2: each of those tokens is an id, and nothing in
 * berry's id says it is anything like cherry's.
 */
export const ChatScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const chatFrom = n.beat("chat").from;
  const resendsAt = n.word("chat", "resends");
  const historyAt = n.word("chat", "history");
  const everyTurnAt = n.word("chat", "every turn");
  const tenAt = n.word("turns", "ten turns");
  const sevenAt = n.word("turns", "seven thousand");
  const fortyAt = n.word("turns", "forty-three thousand");
  const sixAt = n.word("turns", "six times");
  const lengthAt = n.word("turns", "length");
  const eachAt = n.word("number", "each");
  const idAt = n.word("number", "id");
  const numberAt = n.word("number", "number");
  const nineteenAt = n.word("next", "nineteen");
  const berryAt = n.word("next", "berry");
  const likeAt = n.word("next", "like");
  const cherryAt = n.word("next", "cherry");

  const turns = CONVERSATION.turns;
  const barAt = (i: number) => tenAt - 6 + i * 5;
  const base = y(BASE);
  const barH = (v: number) => h(v * PER_TOKEN);
  const barX = (i: number) => BAR_X + i * (BAR_W + BAR_GAP);
  const shownBars = turns.filter((_, i) => frame >= barAt(i));
  const billed = shownBars.length ? shownBars[shownBars.length - 1].cumulative : 0;
  const chartRight = barX(turns.length - 1) + BAR_W;
  const systemY = base - barH(CONVERSATION.system);
  const lengthY = base - barH(CONVERSATION.length);
  const fig15 = y(500);

  return (
    <AbsoluteFill>
      {/* ── Sound: each turn's bar, the bill, the two ids ── */}
      {turns.map((_, i) => (
        <Sfx key={i} name="el-tap" at={barAt(i)} level={-29 - (i % 2)} />
      ))}
      <Sfx name="el-pencil" at={sevenAt - 4} level={-35} />
      <Sfx name="el-pop" at={idAt - 2} level={-29} />
      <Sfx name="el-pop" at={cherryAt - 2} level={-29} />

      <Headline lead="Every turn resends" turn="the whole history." at={chatFrom - 6} turnAt={historyAt - 4} />

      <Drift from={chatFrom} to={n.durationInFrames} amount={0.01} origin="40% 55%">
        <Dim at={eachAt - 4} to={0.35}>
          <FigLabel n="15" title="Input tokens sent on each turn, the lesson's example" at={chatFrom} x={X0} y={y(FIG_Y)} />
          {/* The system prompt, sent every time. */}
          <div
            style={{
              position: "absolute",
              left: BAR_X - 10,
              top: systemY,
              width: (chartRight - BAR_X + 20) * ease(frame, resendsAt - 4, 16),
              borderTop: `2px dashed ${INK_SOFT}`,
            }}
          />
          <Note at={resendsAt} x={chartRight + 18} y={systemY - 14}>
            <span style={{ ...note(20, INK_SOFT), whiteSpace: "nowrap", ...TABULAR }}>
              system prompt, {num(CONVERSATION.system)}
            </span>
          </Note>
          {/* The bars: turn by turn, the whole history again. */}
          {turns.map((t, i) => {
            const p = ease(frame, barAt(i), 12);
            const hh = barH(t.sent) * p;
            return (
              <React.Fragment key={t.turn}>
                <div
                  style={{
                    position: "absolute",
                    left: barX(i),
                    top: base - hh,
                    width: BAR_W,
                    height: hh,
                    borderRadius: "4px 4px 0 0",
                    background: TOKEN,
                    opacity: 0.85,
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    left: barX(i),
                    width: BAR_W,
                    top: base + 10,
                    textAlign: "center",
                    ...label(20, INK_SOFT),
                    opacity: ease(frame, everyTurnAt + i * 3, 8),
                    ...TABULAR,
                  }}
                >
                  {t.turn}
                </div>
              </React.Fragment>
            );
          })}
          <div
            style={{
              position: "absolute",
              left: BAR_X - 10,
              top: base,
              width: (chartRight - BAR_X + 20) * ease(frame, chatFrom + 2, 18),
              height: 2,
              background: INK,
            }}
          />
          <div
            style={{ position: "absolute", left: BAR_X, top: base + 44, ...label(20, INK_SOFT), opacity: ease(frame, everyTurnAt, 12), whiteSpace: "nowrap" }}
          >
            turn
          </div>
          {/* How long the conversation is, at the end. */}
          <div
            style={{
              position: "absolute",
              left: BAR_X - 10,
              top: lengthY,
              width: (chartRight - BAR_X + 20) * ease(frame, sevenAt - 2, 16),
              borderTop: `2.5px solid ${INK}`,
            }}
          />
          <Note at={sevenAt} x={chartRight + 18} y={lengthY - 16}>
            <span style={{ ...note(22, INK), fontWeight: 600, whiteSpace: "nowrap", ...TABULAR }}>
              the conversation: {num(CONVERSATION.length)}
            </span>
          </Note>
        </Dim>

        {/* The bill, counting with the bars. */}
        <div style={{ position: "absolute", left: RX, top: y(FIG_Y) + 4, opacity: billed > 0 ? 1 : 0 }}>
          <div style={{ ...label(22, INK_SOFT), whiteSpace: "nowrap" }}>input tokens billed</div>
          <div style={{ ...headline(64), color: frame >= fortyAt - 2 ? FOCUS_INK : INK, marginTop: 6, ...TABULAR }}>{num(billed)}</div>
          <div style={{ ...note(24, INK), marginTop: 8, whiteSpace: "nowrap", opacity: ease(frame, sixAt - 2, 12) }}>
            <span style={{ fontWeight: 650, color: FOCUS_INK, ...TABULAR }}>{CONVERSATION.ratio}×</span> the conversation&apos;s length
          </div>
          <div style={{ ...note(20, INK_SOFT), marginTop: 6, whiteSpace: "nowrap", opacity: ease(frame, lengthAt + 4, 12), ...TABULAR }}>
            {num(CONVERSATION.billed)} ÷ {num(CONVERSATION.length)}
          </div>
        </div>

        {/* Fig. 16: two tokens, two ids. */}
        <FigLabel n="16" title="Two tokens, two ids" at={idAt - 4} x={RX} y={fig15} />
        <Spot id="llm-tokens-strawberry" at={idAt - 2} left={BERRY_X - 110} top={fig15 + 48} width={220} height={147} />
        <div style={{ position: "absolute", left: BERRY_X, top: fig15 + 210, transform: "translateX(-50%)", opacity: ease(frame, idAt, 12) }}>
          <BridgeChip
            text={BERRY.text}
            id={BERRY.id}
            glow={pulse(frame, numberAt - 2, 22) + pulse(frame, nineteenAt - 2, 24) + pulse(frame, berryAt - 2, 20)}
          />
        </div>
        <Spot id="llm-tokens-cherries" at={cherryAt - 4} left={CHERRY_X - 80} top={fig15 + 40} width={160} height={160} />
        <div style={{ position: "absolute", left: CHERRY_X, top: fig15 + 210, transform: "translateX(-50%)", opacity: ease(frame, cherryAt - 2, 12) }}>
          <BridgeChip text={CHERRY.text} id={CHERRY.id} glow={pulse(frame, cherryAt + 4, 24)} />
        </div>
      </Drift>

      <NextLine at={likeAt} x={RX} y={y(808)} width={500}>
        turning ids into meaning
      </NextLine>
    </AbsoluteFill>
  );
};

/** A bridge token: the chip, and its id large beneath it. */
const BridgeChip: React.FC<{ text: string; id: number; glow: number }> = ({ text, id, glow }) => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
    <ChipFace text={text} size={30} focus={Math.min(1, glow)} />
    <span
      style={{
        fontFamily: MONO,
        fontSize: 36,
        fontWeight: 700,
        color: glow > 0.4 ? FOCUS_INK : INK,
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {id}
    </span>
  </div>
);
