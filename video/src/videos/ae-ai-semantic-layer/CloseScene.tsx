import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, BLUE_INK, HAIRLINE, INK, INK_SOFT, headline, label, note } from "../../editorial/style";
import { ColumnRule, Ink, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { PARTS } from "../ae-interview/data";
import { PRACTICE, VIDEO } from "./data";
import { artFit, Drift, hasArt, Kicker, line, Mark, SERIES, Spot, X0 } from "./parts";

const COL_W = 168;
const LEFT = (1920 - PARTS.length * COL_W) / 2;
const ART_W = 124;
const ART_H = 104;
const ROW_V = 196;
const PRACTICE_V = 706;
const PRACTICE_W = 500;
const PRACTICE_GAP = 60;

/**
 * The close of the series, which has no "Next" line. The series' ten heroes
 * in a row, from the overview's platypus to this part's dolphin, inking in as
 * "every round in this series" is said; then the two questions under every
 * round, which an assistant cannot decide, only read. Last, the track's
 * practice, counted by check.mjs: concept checks on every topic page,
 * challenges that run on three, and the bank.
 */
export const CloseScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("close").from;
  const everyAt = n.word("close", "Under every round in this series");
  const twoAt = n.word("close", "two questions");
  const rowAt = n.word("close", "what does one row mean");
  const numberAt = n.word("close", "what does this number mean");
  const eitherAt = n.word("close", "An assistant can't decide either");
  const readAt = n.word("close", "It can only read what you wrote down");
  const literallyAt = n.word("close", "it reads it literally");
  const closesAt = n.word("close-practice", "That closes the series");
  const practice = [
    {
      count: `${PRACTICE.conceptCheckPages} of ${PRACTICE.topicPages}`,
      text: "topic pages with concept checks",
      at: n.word("close-practice", "Every topic page has concept checks"),
    },
    { count: `${PRACTICE.challengePages} of ${PRACTICE.topicPages}`, text: "with challenges that run in the browser", at: n.word("close-practice", "three have challenges") },
    { count: `${PRACTICE.bank}`, text: "multiple-choice questions in the bank", at: n.word("close-practice", "a hundred and ten") },
  ];
  const end = n.beat("close-practice").to;
  const ours = PARTS.findIndex((p) => p.video === VIDEO);

  return (
    <AbsoluteFill>
      {PARTS.map((p, i) => (
        <Sfx key={p.n} name="el-tap" at={everyAt + 2 + i * 4} level={-37} />
      ))}
      <Sfx name="el-pencil" at={rowAt} level={-35} />
      <Sfx name="el-pencil" at={numberAt} level={-35} />
      <Sfx name="el-chime" at={literallyAt + 10} level={-33} />
      {practice.map((p) => (
        <Sfx key={p.text} name="el-pop" at={p.at} level={-33} />
      ))}

      <Drift from={from} to={end + 80} scale={0.015}>
        <Kicker at={from}>{SERIES} · The series</Kicker>

        {/* The ten parts, each with its hero. */}
        {PARTS.map((p, i) => {
          const at = everyAt + 2 + i * 4;
          const x = LEFT + i * COL_W;
          const art = artFit(p.hero, ART_W, ART_H);
          return (
            <React.Fragment key={p.n}>
              {hasArt(p.video, p.hero) ? (
                <Spot
                  id={p.hero}
                  video={p.video}
                  at={at}
                  left={x + (COL_W - art.width) / 2}
                  top={y(ROW_V) + (ART_H - art.height)}
                  width={art.width}
                  height={art.height}
                  phase={i * 23}
                  amp={3}
                />
              ) : (
                <div
                  style={{
                    position: "absolute",
                    left: x + (COL_W - ART_W) / 2,
                    top: y(ROW_V),
                    width: ART_W,
                    height: ART_H,
                    boxSizing: "border-box",
                    border: `1.5px dashed ${HAIRLINE}`,
                    borderRadius: 8,
                    opacity: ease(frame, at, 10),
                  }}
                />
              )}
              <Ink at={at + 4} dur={12} style={{ left: x + 6, top: y(ROW_V) + ART_H + h(16), width: COL_W - 12, textAlign: "center" }}>
                <div style={{ ...label(20, i === ours ? ACCENT_INK : INK_SOFT) }}>
                  <Num>{p.n}</Num>
                </div>
                <div style={{ ...note(20, INK), fontWeight: 500, marginTop: 2, lineHeight: 1.2, textWrap: "balance" }}>
                  {i === ours ? <Mark at={literallyAt}>{p.title}</Mark> : p.title}
                </div>
              </Ink>
            </React.Fragment>
          );
        })}

        {/* The two questions under every round. */}
        <Ink at={twoAt} dur={12} style={{ left: X0, top: y(430) }}>
          <span style={{ ...label(23, INK_SOFT), whiteSpace: "nowrap" }}>Two questions under every round</span>
        </Ink>
        <div style={{ position: "absolute", left: 92, top: y(472), display: "flex", gap: "0.4em", ...headline(58) }}>
          <Ink at={rowAt - 2} dur={20} style={{ position: "relative", whiteSpace: "nowrap" }}>
            What does one row mean?
          </Ink>
          <Ink at={numberAt - 2} dur={20} style={{ position: "relative", whiteSpace: "nowrap" }}>
            What does this number mean?
          </Ink>
        </div>
        <Ink at={eitherAt} dur={16} style={{ left: X0, top: y(576) }}>
          <span style={line(30, INK)}>
            An assistant can&apos;t decide either.{" "}
            <span style={{ opacity: ease(frame, readAt - 2, 10) }}>
              It reads what you wrote down, <Mark at={literallyAt + 2}>literally.</Mark>
            </span>
          </span>
        </Ink>

        {/* The track's practice, counted. */}
        <Ink at={closesAt} dur={12} style={{ left: X0, top: y(PRACTICE_V) - 46 }}>
          <span style={{ ...label(23, INK_SOFT), whiteSpace: "nowrap" }}>Practice on the track</span>
        </Ink>
        {practice.slice(1).map((p, i) => (
          <ColumnRule key={p.text} x={X0 + (i + 1) * (PRACTICE_W + PRACTICE_GAP) - PRACTICE_GAP / 2} top={y(PRACTICE_V)} height={96} at={p.at} />
        ))}
        {practice.map((p, i) => {
          const q = ease(frame, p.at - 2, 14);
          if (q <= 0) return null;
          return (
            <div
              key={p.text}
              style={{
                position: "absolute",
                left: X0 + i * (PRACTICE_W + PRACTICE_GAP),
                top: y(PRACTICE_V),
                width: PRACTICE_W,
                opacity: q,
                transform: `translateY(${(1 - q) * 12}px)`,
              }}
            >
              <div style={{ ...note(44, BLUE_INK), fontWeight: 500, lineHeight: 1.1 }}>
                <Num>{p.count}</Num>
              </div>
              <div style={{ ...note(24, INK), marginTop: 10, whiteSpace: "nowrap" }}>{p.text}</div>
            </div>
          );
        })}
      </Drift>
    </AbsoluteFill>
  );
};
