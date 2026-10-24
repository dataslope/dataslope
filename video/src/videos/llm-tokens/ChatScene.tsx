import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { headline, INK, INK_SOFT, label, note, PAPER, TABULAR } from "../../editorial/style";
import { FigLabel, NextLine, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { MONO } from "../../theme/fonts";
import { BERRY, CHERRY, CONVERSATION, num } from "./data";
import { ds } from "../../theme/brand";
import { ChipFace, Drift, FIG_Y, FOCUS, FOCUS_INK, Headline, Out, pulse, Spot, TOKEN, X0 } from "./parts";

/** Fig. 16: one bar per turn, what that turn sends. */
const BAR_X = 170;
const BAR_W = 58;
const BAR_GAP = 24;
const BASE = 820;
/** Pixels (before the layout stretch) per token. */
const PER_TOKEN = 400 / 7000;
/** The right column: the bill. */
const RX = 1300;
/** Fig. 17, once the chart has gone: the two tokens, centred on their art. */
const BERRY_X = X0 + 223;
const CHERRY_X = 820;
/** The three parts of each bar: sent every turn, sent again, sent new. */
const SYSTEM = ds("blue", 700);
const EARLIER = `color-mix(in srgb, ${TOKEN} 55%, ${PAPER})`;
const NEW = FOCUS;

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
  const fortyEnd = n.word("turns", "forty-three thousand five hundred", { edge: "end" });
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
  // The bars build over "ten turns build a conversation", the last landing
  // on "seven thousand"; the bill is not shown until it is said.
  const barStep = Math.max(5, (sevenAt + 4 - tenAt) / (CONVERSATION.turns.length - 1));
  const barAt = (i: number) => tenAt - 6 + i * barStep;
  const base = y(BASE);
  const barH = (v: number) => h(v * PER_TOKEN);
  const barX = (i: number) => BAR_X + i * (BAR_W + BAR_GAP);
  // The bill counts up over "forty-three thousand five hundred".
  const billP = ease(frame, fortyAt - 4, Math.max(12, fortyEnd - fortyAt + 4));
  const billed = Math.round(CONVERSATION.billed * billP);
  const chartRight = barX(turns.length - 1) + BAR_W;
  const systemY = base - barH(CONVERSATION.system);
  const lengthY = base - barH(CONVERSATION.length);
  const figY = y(FIG_Y);

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
        <Out at={eachAt - 4} dur={14}>
          <FigLabel n="16" title="Input tokens sent on each turn, the lesson's example" at={chatFrom} x={X0} y={y(FIG_Y)} />
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
            // Bottom to top: the system prompt, every earlier turn sent again,
            // and the one new message.
            const parts = [
              { v: CONVERSATION.system, c: SYSTEM },
              { v: t.sent - CONVERSATION.system - CONVERSATION.perUser, c: EARLIER },
              { v: CONVERSATION.perUser, c: NEW },
            ];
            let below = 0;
            return (
              <React.Fragment key={t.turn}>
                {parts.map((part, k) => {
                  const bottom = below;
                  below += part.v;
                  const hh = barH(part.v) * p;
                  if (hh <= 0) return null;
                  return (
                    <div
                      key={k}
                      style={{
                        position: "absolute",
                        left: barX(i),
                        top: base - barH(bottom) * p - hh,
                        width: BAR_W,
                        height: hh,
                        borderRadius: k === 2 ? "4px 4px 0 0" : 0,
                        background: part.c,
                      }}
                    />
                  );
                })}
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
          <div
            style={{
              position: "absolute",
              left: BAR_X + 90,
              top: base + 44,
              display: "flex",
              alignItems: "center",
              gap: 10,
              ...note(20, INK_SOFT),
              whiteSpace: "nowrap",
              opacity: ease(frame, tenAt, 12),
            }}
          >
            {[
              { c: SYSTEM, t: "system prompt" },
              { c: EARLIER, t: "earlier turns, sent again" },
              { c: NEW, t: "the new message" },
            ].map((k, i) => (
              <React.Fragment key={k.t}>
                <span style={{ width: 18, height: 18, borderRadius: 3, background: k.c, marginLeft: i ? 18 : 0 }} />
                <span>{k.t}</span>
              </React.Fragment>
            ))}
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
        </Out>

        {/* The bill, counting with the bars. */}
        <div style={{ position: "absolute", left: RX, top: y(FIG_Y) + 4, opacity: billP > 0 ? 1 : 0 }}>
          <div style={{ ...label(22, INK_SOFT), whiteSpace: "nowrap" }}>input tokens billed</div>
          <div style={{ ...headline(64), color: frame >= fortyAt - 2 ? FOCUS_INK : INK, marginTop: 6, ...TABULAR }}>{num(billed)}</div>
          <div style={{ ...note(24, INK), marginTop: 8, whiteSpace: "nowrap", opacity: ease(frame, sixAt - 2, 12) }}>
            <span style={{ fontWeight: 650, color: FOCUS_INK, ...TABULAR }}>{CONVERSATION.ratio}×</span> the conversation&apos;s length
          </div>
          <div style={{ ...note(20, INK_SOFT), marginTop: 6, whiteSpace: "nowrap", opacity: ease(frame, lengthAt + 4, 12), ...TABULAR }}>
            {num(CONVERSATION.billed)} ÷ {num(CONVERSATION.length)}
          </div>
        </div>

        {/* Fig. 17: two tokens, two ids, given the page once the chart has gone. */}
        <FigLabel n="17" title="Two tokens, two ids" at={idAt - 4} x={X0} y={figY} />
        <Spot id="llm-tokens-strawberry" at={idAt - 2} left={BERRY_X - 223} top={figY + 56} width={446} height={250} />
        <div style={{ position: "absolute", left: BERRY_X, top: figY + 330, transform: "translateX(-50%)", opacity: ease(frame, idAt, 12) }}>
          <BridgeChip
            text={BERRY.text}
            id={BERRY.id}
            glow={pulse(frame, numberAt - 2, 22) + pulse(frame, nineteenAt - 2, 24) + pulse(frame, berryAt - 2, 20)}
          />
        </div>
        <Spot id="llm-tokens-cherries" at={cherryAt - 4} left={CHERRY_X - 117} top={figY + 56} width={233} height={250} />
        <div style={{ position: "absolute", left: CHERRY_X, top: figY + 330, transform: "translateX(-50%)", opacity: ease(frame, cherryAt - 2, 12) }}>
          <BridgeChip text={CHERRY.text} id={CHERRY.id} glow={pulse(frame, cherryAt + 4, 24)} />
        </div>
      </Drift>

      <NextLine at={likeAt} x={X0} y={y(770)} width={900}>
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
        fontSize: 48,
        fontWeight: 700,
        color: glow > 0.4 ? FOCUS_INK : INK,
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {id}
    </span>
  </div>
);
