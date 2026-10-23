import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { body, INK, INK_SOFT, label, note, TABULAR } from "../../editorial/style";
import { FigLabel } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ENCODING, GREETINGS } from "./data";
import { BYTE, Drift, FIG_Y, FOCUS, FOCUS_INK, Headline, Kicker, pulse, TOKEN, TOKEN_TINT, X0 } from "./parts";

const CELL = 32;
const CELL_GAP = 9;
/** Extra room between one character's bytes and the next one's. */
const CHAR_GAP = 8;
const BX = 470;
const ROW0 = 420;
const ROW_STEP = 104;
const COUNT_X = 1330;
const KEY_Y = 846;

/** Where byte `b` of a row sits, with its character's bytes kept together. */
const byteX = (b: number, perChar: number) => BX + b * (CELL + CELL_GAP) + Math.floor(b / perChar) * CHAR_GAP;

/**
 * Bytes under tokens: hello in four scripts, each byte a gray square, each
 * o200k_base token an outline around the bytes it covers. English and
 * Japanese come out as one token each; Hindi as four; Tifinagh, which the
 * tokenizer rarely saw in training, as twelve, one for every byte.
 */
export const BytesScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const bytesFrom = n.beat("bytes").from;
  const bytesAt = n.word("bytes", "bytes");
  const englishAt = n.word("bytes", "English");
  const oneByteAt = n.word("bytes", "one byte");
  const japaneseAt = n.word("bytes", "Japanese");
  const hindiAt = n.word("bytes", "Hindi");
  const threeAt = n.word("bytes", "three");
  const startsAt = n.word("hello", "starts");
  const mergesAt = n.word("hello", "merges");
  const fifteenAt = n.word("hello", "fifteen");
  const oneTokenAt = n.word("hello", "one token");
  const eighteenAt = n.word("hello", "eighteen");
  const fourAt = n.word("hello", "four");
  const tifinaghAt = n.word("azul", "Tifinagh");
  const twelveBytesAt = n.word("azul", "twelve bytes");
  const twelveTokensAt = n.word("azul", "twelve tokens");
  const end = n.beat("formats").from;

  // Each row's bytes, and when its tokens wrap them.
  const rowAt = [englishAt, japaneseAt, hindiAt, tifinaghAt];
  const bytesCountAt = [oneByteAt, fifteenAt, eighteenAt, twelveBytesAt];
  const tokensAt = [mergesAt + 4, oneTokenAt, fourAt, twelveTokensAt];
  const rowY = (i: number) => y(ROW0) + i * h(ROW_STEP);
  // Each row's characters-times-bytes line, on the words that give the rule.
  const perCharAt = [oneByteAt, threeAt, threeAt + 6, tifinaghAt + 8];
  const last = GREETINGS.length - 1;

  return (
    <AbsoluteFill>
      {/* ── Sound: bytes as a sprinkle, tokens as taps, the twelve as a run ── */}
      {rowAt.map((t, i) => (
        <Sfx key={i} name="el-sprinkle" at={t} level={-35} />
      ))}
      {tokensAt.slice(0, last).map((t, i) => (
        <Sfx key={i} name="el-tap" at={t} level={-26} />
      ))}
      {GREETINGS[last].tokenBytes.map((_, j) => (
        <Sfx key={j} name="el-tap" at={twelveTokensAt + j * 2} level={-30 - (j % 3)} />
      ))}

      <Kicker at={bytesFrom - 10}>Counts in practice</Kicker>
      <Headline lead="Under every token," turn="bytes." at={bytesFrom - 6} turnAt={bytesAt - 2} />

      <Drift from={bytesFrom} to={end} amount={0.012} origin="40% 55%">
        <FigLabel n="11" title={`Hello in four scripts: bytes, then ${ENCODING} tokens`} at={bytesFrom} x={X0} y={y(FIG_Y)} />

        {GREETINGS.map((g, i) => {
          const inAt = rowAt[i];
          const p = ease(frame, inAt - 4, 12);
          if (p <= 0) return null;
          const perChar = g.bytesPerChar[0];
          const top = rowY(i);
          const tok = ease(frame, tokensAt[i] - 2, 12);
          const rare = i === last;
          // Token outlines, each around the bytes it covers.
          let b0 = 0;
          const groups = g.tokenBytes.map((size) => {
            const g0 = b0;
            b0 += size;
            return { from: g0, to: b0 - 1 };
          });
          return (
            <React.Fragment key={g.language}>
              <div style={{ position: "absolute", left: X0, top: top + 2, opacity: p }}>
                <div style={{ ...label(24, INK), whiteSpace: "nowrap" }}>{g.language}</div>
                <div style={{ ...body(24, true), color: INK_SOFT, whiteSpace: "nowrap", marginTop: 2 }}>{g.romanized}</div>
                {/* What the gaps between the squares mean: one character each. */}
                <div style={{ ...note(20, INK_SOFT), whiteSpace: "nowrap", marginTop: 2, opacity: ease(frame, perCharAt[i], 12), ...TABULAR }}>
                  {g.chars} {i === 0 ? "letters" : "characters"} × {perChar} {perChar === 1 ? "byte" : "bytes"}
                </div>
              </div>
              {groups.map((gr, j) => {
                const at = tokensAt[i] - 2 + (rare ? j * 2 : j * 3);
                const q = ease(frame, at, 10);
                if (q <= 0) return null;
                const x0 = byteX(gr.from, perChar) - 4;
                const x1 = byteX(gr.to, perChar) + CELL + 4;
                const hot = rare ? 1 - 0.4 * ease(frame, at + 30, 20) : pulse(frame, at, 24);
                return (
                  <div
                    key={j}
                    style={{
                      position: "absolute",
                      left: x0,
                      top: top - 4,
                      width: x1 - x0,
                      height: CELL + 8,
                      boxSizing: "border-box",
                      borderRadius: 8,
                      border: `2.5px solid ${hot > 0 ? `color-mix(in srgb, ${FOCUS} ${Math.round(hot * 100)}%, ${TOKEN})` : TOKEN}`,
                      background: TOKEN_TINT,
                      opacity: q,
                      transform: `scale(${0.94 + 0.06 * q})`,
                    }}
                  />
                );
              })}
              {Array.from({ length: g.bytes }, (_, b) => {
                const q = ease(frame, inAt - 2 + b * 1.2, 8);
                return (
                  <div
                    key={b}
                    style={{
                      position: "absolute",
                      left: byteX(b, perChar),
                      top,
                      width: CELL,
                      height: CELL,
                      borderRadius: 4,
                      background: BYTE,
                      opacity: q,
                      transform: `scale(${0.6 + 0.4 * q})`,
                    }}
                  />
                );
              })}
              <div style={{ position: "absolute", left: COUNT_X, top: top - 2, display: "flex", alignItems: "baseline", gap: 18, whiteSpace: "nowrap" }}>
                <span style={{ ...note(24, INK_SOFT), opacity: ease(frame, bytesCountAt[i] - 2, 10), ...TABULAR }}>{g.bytes} bytes</span>
                <span style={{ ...note(26, rare ? FOCUS_INK : INK), fontWeight: 650, opacity: tok, ...TABULAR }}>
                  {g.tokens} {g.tokens === 1 ? "token" : "tokens"}
                </span>
              </div>
            </React.Fragment>
          );
        })}

        {/* The key, and UTF-8's rule. */}
        <div style={{ position: "absolute", left: X0, top: y(KEY_Y), display: "flex", alignItems: "center", gap: 14, opacity: ease(frame, bytesAt, 12) }}>
          <span style={{ width: 22, height: 22, borderRadius: 3, background: BYTE }} />
          <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>one byte</span>
          <span
            style={{
              width: 40,
              height: 26,
              marginLeft: 30,
              borderRadius: 6,
              border: `2.5px solid ${TOKEN}`,
              background: TOKEN_TINT,
              opacity: ease(frame, startsAt, 12),
            }}
          />
          <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap", opacity: ease(frame, startsAt, 12) }}>one token</span>
          <span style={{ ...note(22, INK_SOFT), marginLeft: 40, whiteSpace: "nowrap", opacity: ease(frame, threeAt - 2, 12) }}>
            UTF-8: 1 byte for an English letter, 3 for a Japanese or Hindi character
          </span>
        </div>
        <div
          style={{
            position: "absolute",
            left: COUNT_X,
            top: rowY(last) + h(56),
            ...note(22, INK_SOFT),
            whiteSpace: "nowrap",
            opacity: ease(frame, twelveTokensAt + 16, 12),
          }}
        >
          a script it rarely saw: one token a byte
        </div>
      </Drift>
    </AbsoluteFill>
  );
};
