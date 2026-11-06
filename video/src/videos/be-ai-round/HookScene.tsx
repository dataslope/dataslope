import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { Tick } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, HAIRLINE, HIGHLIGHT, INK, INK_SOFT, PAPER, label, note } from "../../editorial/style";
import { Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ds, inkOf } from "../../theme/brand";
import { MONO } from "../../theme/fonts";
import { Drift, HERO, Headline, Kicker, Mark, Spot, X0, line } from "./parts";

/** The editor window: a code pane, and the assistant's pane beside it. */
const WIN = { x: X0, w: 1020, top: 306, h: 384 };
const BAR_H = 46;
const SPLIT = 790;
const LABEL_X = 1184;
/** The plan's seven cards, in three groups. */
const CARD_W = 208;
const CARD_GAP = 14;
const GROUP_GAP = 56;
const GROUP_Y = 752;
const CARD_Y = 790;
const CARD_H = 94;

const GROUPS = [
  { title: "The round", cards: ["What's graded", "The 60 minutes", "A good prompt"] },
  { title: "Designing with an LLM", cards: ["An LLM feature", "Its cost", "Prompt injection"] },
  { title: "You", cards: ["Day to day"] },
] as const;

/** Rows of code as bars, in the listing's token inks: deterministic widths. */
const TOKEN = [inkOf.purple, INK, INK_SOFT, inkOf.green, inkOf.orange];
const CODE_ROWS = Array.from({ length: 11 }, (_, i) => {
  const indent = [0, 1, 1, 2, 2, 1, 0, 0, 1, 2, 1][i];
  const widths = [
    [64, 120, 90],
    [90, 60, 150],
    [40, 170],
    [120, 80, 60],
    [70, 140],
    [90, 110, 40],
    [],
    [64, 150, 70],
    [100, 90],
    [60, 130, 80],
    [80, 50],
  ][i];
  return { indent, parts: widths.map((w, k) => ({ w, ink: TOKEN[(i * 2 + k) % TOKEN.length] })) };
});

/**
 * The opening: an editor with an assistant built into it, code pouring into
 * the editor as "the code will get written either way" is said, then the
 * three things that are graded around it, each pinned to the part of the
 * window where the candidate does it: the request typed to the assistant, the
 * Accept on its diff, and the test run. The lemur watches. Then the plan:
 * seven question cards in the page's three groups.
 */
export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const someAt = n.word("hook", "Some coding rounds");
  const assistantAt = n.word("hook", "an assistant built in");
  const writtenAt = n.word("hook", "so the code will get written");
  const eitherAt = n.word("hook", "either way");
  const gradedAt = n.word("hook", "What's graded");
  const aroundAt = n.word("hook", "everything around it");
  const askAt = n.word("hook", "what you ask for");
  const acceptAt = n.word("hook", "what you accept");
  const checkAt = n.word("hook", "what you check");
  const sevenAt = n.word("plan", "Seven questions");
  const groupAt = [
    n.word("plan", "three on the round itself"),
    n.word("plan", "three on designing features"),
    n.word("plan", "one behavioral question"),
  ];
  const llmAt = n.word("plan", "or LLM");
  const end = n.beat("plan").to;

  const top = y(WIN.top);
  const winH = h(WIN.h);
  const winP = ease(frame, someAt + 4, 16);
  const paneP = ease(frame, assistantAt, 14);
  const dim = sevenAt - 2;
  const dimmed = 1 - 0.62 * ease(frame, dim, 14);

  // Where the candidate acts: the request, the diff's Accept, the test run.
  const askY = top + BAR_H + 22;
  const askH = 74;
  const diffY = askY + askH + 24;
  const diffH = 176;
  const acceptY = diffY + diffH - 48;
  const testY = top + winH - 50;
  const lit = (at: number) => ease(frame, at - 2, 10);
  const marks = [
    { text: "what you ask for", at: askAt, mid: askY + askH / 2, to: 1118 },
    { text: "what you accept", at: acceptAt, mid: acceptY + 17, to: 1118 },
    { text: "what you check", at: checkAt, mid: testY + 20, to: 1118 },
  ];

  return (
    <AbsoluteFill>
      <Sfx name="el-pop" at={someAt + 10} level={-30} />
      <Sfx name="el-whoosh" at={assistantAt} level={-36} />
      <Sfx name="el-sprinkle" at={writtenAt + 2} level={-32} />
      {marks.map((m) => (
        <Sfx key={m.text} name="el-tap" at={m.at} level={-31} />
      ))}
      {groupAt.map((at) => (
        <Sfx key={at} name="el-tap" at={at} level={-35} />
      ))}

      <Drift from={0} to={end + 40}>
        <Kicker at={6}>Backend engineer interview questions · The AI-allowed round</Kicker>
        <Headline lead="The code gets written" turn="either way." at={writtenAt - 4} turnAt={eitherAt} size={66} />
        <Ink at={gradedAt - 2} dur={16} style={{ left: X0, top: y(246) }}>
          <span style={line(30, INK)}>
            What&apos;s graded is <Mark at={aroundAt + 2}>everything around it.</Mark>
          </span>
        </Ink>

        {/* The window. */}
        <div style={{ position: "absolute", inset: 0, opacity: dimmed }}>
          <div
            style={{
              position: "absolute",
              left: WIN.x,
              top,
              width: WIN.w,
              height: winH,
              boxSizing: "border-box",
              border: `2px solid ${INK_SOFT}`,
              borderRadius: 14,
              background: PAPER,
              opacity: winP,
              transform: `translateY(${(1 - winP) * 14}px)`,
              overflow: "hidden",
            }}
          >
            <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: BAR_H, background: ds("gray", 50), borderBottom: `1.5px solid ${HAIRLINE}` }} />
            <span style={{ position: "absolute", left: 22, top: 10, fontFamily: MONO, fontSize: 20, color: INK, fontWeight: 600 }}>limiter.py</span>
            <span style={{ position: "absolute", left: SPLIT - WIN.x + 22, top: 10, ...label(20, INK_SOFT), opacity: paneP }}>assistant</span>
            <div style={{ position: "absolute", left: SPLIT - WIN.x, top: 0, bottom: 0, width: 1.5, background: HAIRLINE, opacity: paneP }} />
          </div>

          {/* Code pours in. */}
          {CODE_ROWS.map((row, i) => {
            const p = ease(frame, writtenAt + i * 2, 8);
            if (p <= 0) return null;
            let x = WIN.x + 34 + row.indent * 34;
            return (
              <React.Fragment key={i}>
                {row.parts.map((part, k) => {
                  const left = x;
                  x += part.w + 12;
                  return (
                    <div
                      key={k}
                      style={{
                        position: "absolute",
                        left,
                        top: top + BAR_H + 26 + i * 25,
                        width: part.w * p,
                        height: 11,
                        borderRadius: 6,
                        background: part.ink,
                        opacity: 0.5,
                      }}
                    />
                  );
                })}
              </React.Fragment>
            );
          })}

          {/* The request, typed to the assistant. */}
          <div
            style={{
              position: "absolute",
              left: SPLIT + 50,
              top: askY,
              width: 268,
              height: askH,
              boxSizing: "border-box",
              borderRadius: 12,
              border: `2px solid ${INK_SOFT}`,
              background: `color-mix(in srgb, ${HIGHLIGHT} ${lit(askAt) * 100}%, ${PAPER})`,
              opacity: ease(frame, assistantAt + 8, 12),
              padding: "16px 18px",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <div style={{ width: 200, height: 10, borderRadius: 5, background: INK_SOFT, opacity: 0.45 }} />
            <div style={{ width: 140, height: 10, borderRadius: 5, background: INK_SOFT, opacity: 0.45 }} />
          </div>

          {/* Its reply: a diff, with Accept and Reject. */}
          <div
            style={{
              position: "absolute",
              left: SPLIT + 22,
              top: diffY,
              width: 296,
              height: diffH,
              boxSizing: "border-box",
              borderRadius: 12,
              border: `1.5px solid ${HAIRLINE}`,
              background: ds("gray", 50),
              opacity: ease(frame, writtenAt + 6, 12),
              padding: "14px 16px",
            }}
          >
            {[150, 210, 120, 180].map((w, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, height: 22, opacity: ease(frame, writtenAt + 10 + i * 3, 8) }}>
                <span style={{ fontFamily: MONO, fontSize: 19, color: INK_SOFT, width: 14 }}>+</span>
                <div style={{ width: w, height: 10, borderRadius: 5, background: INK_SOFT, opacity: 0.4 }} />
              </div>
            ))}
          </div>
          {[
            { text: "Accept", x: SPLIT + 38, at: acceptAt },
            { text: "Reject", x: SPLIT + 168, at: null },
          ].map((b) => (
            <div
              key={b.text}
              style={{
                position: "absolute",
                left: b.x,
                top: acceptY,
                width: 112,
                height: 34,
                boxSizing: "border-box",
                borderRadius: 8,
                border: `2px solid ${INK_SOFT}`,
                background: `color-mix(in srgb, ${HIGHLIGHT} ${b.at === null ? 0 : lit(b.at) * 100}%, ${PAPER})`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                ...label(19, INK),
                opacity: ease(frame, writtenAt + 22, 10),
              }}
            >
              {b.text}
            </div>
          ))}

          {/* The test run, across the foot of the window. */}
          <div
            style={{
              position: "absolute",
              left: WIN.x + 20,
              top: testY,
              width: WIN.w - 40,
              height: 40,
              boxSizing: "border-box",
              borderRadius: 8,
              background: `color-mix(in srgb, ${HIGHLIGHT} ${lit(checkAt) * 100}%, ${ds("gray", 50)})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: 12,
              padding: "0 18px",
              opacity: ease(frame, writtenAt + 26, 10),
            }}
          >
            <span style={{ fontFamily: MONO, fontSize: 19, color: INK_SOFT }}>pytest</span>
            {[0, 1, 2].map((k) => (
              <Tick key={k} at={checkAt + 6 + k * 4} size={22} />
            ))}
          </div>

          {/* The three, each pinned to where it happens. */}
          {marks.map((m) => {
            const p = ease(frame, m.at - 2, 12);
            if (p <= 0) return null;
            return (
              <React.Fragment key={m.text}>
                <div style={{ position: "absolute", left: m.to, top: m.mid - 1, width: (LABEL_X - 16 - m.to) * p, height: 2, background: INK }} />
                <Ink at={m.at} dur={12} style={{ left: LABEL_X, top: m.mid - 18 }}>
                  <span style={{ ...note(27, INK), fontWeight: 650, whiteSpace: "nowrap" }}>
                    <Mark at={m.at + 4}>{m.text}</Mark>
                  </span>
                </Ink>
              </React.Fragment>
            );
          })}
        </div>

        <Spot id={HERO.id} at={someAt + 10} left={1490} top={y(292)} width={312} height={341} />

        {/* The plan: seven questions in the page's three groups. */}
        {GROUPS.map((g, gi) => {
          const x0 = X0 + GROUPS.slice(0, gi).reduce((s, q) => s + q.cards.length * (CARD_W + CARD_GAP) - CARD_GAP + GROUP_GAP, 0);
          const first = GROUPS.slice(0, gi).reduce((s, q) => s + q.cards.length, 0);
          const at = gi === 1 ? Math.min(groupAt[1], llmAt) : groupAt[gi];
          return (
            <React.Fragment key={g.title}>
              <Ink at={at - 2} dur={12} style={{ left: x0, top: y(GROUP_Y) }}>
                <span style={{ ...label(22, INK_SOFT), fontWeight: 700, whiteSpace: "nowrap" }}>{g.title}</span>
              </Ink>
              {g.cards.map((title, i) => {
                const p = ease(frame, at + 2 + i * 4, 12);
                if (p <= 0) return null;
                return (
                  <div
                    key={title}
                    style={{
                      position: "absolute",
                      left: x0 + i * (CARD_W + CARD_GAP),
                      top: y(CARD_Y),
                      width: CARD_W,
                      height: h(CARD_H),
                      boxSizing: "border-box",
                      border: `1.5px solid ${HAIRLINE}`,
                      borderRadius: 12,
                      background: PAPER,
                      padding: "14px 16px",
                      opacity: p,
                      transform: `translateY(${(1 - p) * 12}px)`,
                    }}
                  >
                    <div style={{ ...label(22, ACCENT_INK), fontWeight: 700 }}>{first + i + 1}</div>
                    <div style={{ ...note(22, INK), fontWeight: 600, marginTop: 8, whiteSpace: "nowrap" }}>{title}</div>
                  </div>
                );
              })}
            </React.Fragment>
          );
        })}
      </Drift>
    </AbsoluteFill>
  );
};
