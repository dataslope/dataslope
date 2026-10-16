import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, body, HAIRLINE, INK, INK_SOFT, label, note, PAPER } from "../../editorial/style";
import { Ink, NextLine } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { MONO } from "../../theme/fonts";
import { Sfx } from "../../sound/Sfx";
import { Drift, ElbowArrow, Headline, Mark, Tag } from "./parts";

const ROOT_X = 120;
const ROOT_W = 300;
const ROOT_H = 92;
const BRANCH_Y = [380, 520, 660];
const ANSWER_X = 660;

/**
 * How to choose, after the lesson's decision path: ask what the child means
 * without its parent. Nothing: CASCADE. It can stand alone: SET NULL. A
 * record to keep: RESTRICT. ON UPDATE asks the same question, which a key
 * that never changes never has to answer. Then the bridge to Unit 5.
 */
export const ChooseScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  // ── Cues ──
  const from = n.beat("choose").from;
  const askAt = n.word("choose", "Ask");
  const withoutAt = n.word("choose", "without its parent");
  const nothingAt = n.word("choose", "Nothing");
  const cascadeAt = n.word("choose", "Cascade");
  const aloneAt = n.word("choose", "stand alone");
  const setNullAt = n.word("choose", "Set null");
  const recordAt = n.word("choose", "record");
  const restrictAt = n.word("choose", "Restrict");
  const changingAt = n.word("update", "Changing");
  const sameAt = n.word("update", "same question");
  const neverAt = n.word("update", "never changes");
  const shapeAt = n.word("next", "every shape");
  const end = n.beat("next").to;

  const rootMid = y(BRANCH_Y[1]);
  const answers = [
    { q: "Nothing?", action: "CASCADE", eg: "comments on a deleted draft, items in a temporary cart", at: nothingAt, actAt: cascadeAt },
    { q: "It can stand alone?", action: "SET NULL", eg: "a support ticket whose assigned employee left", at: aloneAt - 4, actAt: setNullAt },
    { q: "A record you must keep?", action: "RESTRICT", eg: "invoices, payments, orders that keep their customer", at: recordAt - 6, actAt: restrictAt },
  ];
  // As the video ends, the tree steps back slowly behind the closing line.
  const settle = interpolate(frame, [end - 6, end + 74], [0, 0.6], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill>
      {/* ── Sound: each branch, ON UPDATE, and the close ── */}
      <Sfx name="el-pencil" at={nothingAt} level={-34} />
      <Sfx name="el-pencil" at={aloneAt - 4} level={-34} />
      <Sfx name="el-pencil" at={recordAt - 6} level={-34} />
      <Sfx name="el-tap" at={sameAt} level={-29} />
      {/* The conclusion's bell, in the silence after the last word. */}
      <Sfx name="el-chime" at={end + 6} level={-32} />

      <Drift from={from} to={end + 80}>
        <Headline lead="What is the child" turn="without its parent?" at={askAt - 6} turnAt={withoutAt - 4} />

        <div style={{ position: "absolute", inset: 0, opacity: 1 - settle }}>
          {/* ── The root: a parent row goes ── */}
          <Ink at={askAt} dur={14} style={{ left: ROOT_X, top: rootMid - ROOT_H / 2 }}>
            <div
              style={{
                width: ROOT_W,
                height: ROOT_H,
                boxSizing: "border-box",
                border: `2px solid ${INK}`,
                borderRadius: 8,
                background: PAPER,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                paddingLeft: 22,
              }}
            >
              <span style={{ ...label(25, INK) }}>A parent row goes.</span>
              <span style={{ ...note(20, INK_SOFT) }}>What about its children?</span>
            </div>
          </Ink>

          {/* ── Three answers, each its own branch ── */}
          {answers.map((a, i) => {
            const by = y(BRANCH_Y[i]);
            const fork = ROOT_X + ROOT_W + 70;
            const pts = [
              [ROOT_X + ROOT_W + 4, rootMid],
              [fork, rootMid],
              [fork, by],
              [ANSWER_X - 14, by],
            ] as const;
            return (
              <React.Fragment key={a.action}>
                <ElbowArrow points={i === 1 ? [pts[0], [ANSWER_X - 14, by]] : pts} at={a.at - 2} color={INK} width={2.2} dur={14} />
                <Ink at={a.at} dur={14} style={{ left: ANSWER_X, top: by - 28, whiteSpace: "nowrap", display: "flex", alignItems: "baseline", gap: 18 }}>
                  <span style={{ ...body(38, true), color: INK }}>{a.q}</span>
                  <span style={{ opacity: ease(frame, a.actAt - 4, 10), transform: `translateY(${(1 - ease(frame, a.actAt - 4, 10)) * 8}px)`, display: "inline-block" }}>
                    <span
                      style={{
                        fontFamily: MONO,
                        fontSize: 28,
                        fontWeight: 700,
                        color: ACCENT_INK,
                        padding: "2px 14px",
                        border: `2px solid ${ACCENT_INK}`,
                        borderRadius: 8,
                      }}
                    >
                      {a.action}
                    </span>
                  </span>
                </Ink>
                <Ink at={a.actAt + 4} dur={14} style={{ left: ANSWER_X, top: by + 30, whiteSpace: "nowrap" }}>
                  <span style={{ ...note(21, INK_SOFT) }}>{a.eg}</span>
                </Ink>
              </React.Fragment>
            );
          })}

          {/* ── ON UPDATE: the same question ── */}
          <div style={{ position: "absolute", left: ROOT_X, top: y(752) - 12, width: 1700, height: 1, background: HAIRLINE, opacity: ease(frame, changingAt - 4, 12) * 0.6 }} />
          <Ink at={changingAt - 2} dur={16} style={{ left: ROOT_X, top: y(752), whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 16 }}>
            <Tag color={INK} size={22} mono>
              ON UPDATE
            </Tag>
            <span style={{ ...body(32, true), color: INK }}>
              <span style={{ opacity: ease(frame, sameAt - 4, 10) }}>asks the same question.</span>
              <span style={{ opacity: ease(frame, neverAt - 10, 10) }}>
                {" "}
                So pick a key that <Mark at={neverAt}>never changes</Mark>.
              </span>
            </span>
          </Ink>
        </div>

        <NextLine at={shapeAt - 4} x={ROOT_X} y={y(830)} width={760}>
          the shapes relationships take.
        </NextLine>
      </Drift>
    </AbsoluteFill>
  );
};
