import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, BLUE_INK, HAIRLINE, HIGHLIGHT, INK, INK_SOFT, PAPER, headline, label, note } from "../../editorial/style";
import { Ink, Note, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { PRACTICE, SERIES } from "./data";
import { Drift, hasArt, Kicker, line, Mark, Spot, X0 } from "./parts";

const COL_W = 168;
const LEFT = (1920 - SERIES.length * COL_W) / 2;
const ART_W = 138;
const ART_H = 124;
const ROW_V = 176;
const CARD_V = 700;
const CARD_W = 530;
const CARD_GAP = 30;

/**
 * The close of the series, which has no "Next" line. The series' ten heroes
 * in a row, from the overview's capybara to this part's lemur, inking in as
 * "every round in this series" is said; then the one test they all come back
 * to, and what an assistant changes about it (nothing: telling a good answer
 * from a plausible one is still the candidate's job). Last, the track's
 * practice, counted by check.mjs: concept checks on every topic page, code
 * that runs on most, and the bank.
 */
export const CloseScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("close").from;
  const everyAt = n.word("close", "Every round in this series");
  const testAt = n.word("close", "the same test");
  const tellingAt = n.word("close", "telling a good answer");
  const plausibleAt = n.word("close", "from a plausible one");
  const whyAt = n.word("close", "and saying why");
  const eitherAt = n.word("close", "An assistant can produce either");
  const apartAt = n.word("close", "Telling them apart");
  const jobAt = n.word("close", "is still your job");
  const practice = [
    { count: `${PRACTICE.checkPages} of ${PRACTICE.topicPages}`, text: "topic pages with concept checks", at: n.word("close-practice", "Every topic page on the track has concept checks") },
    { count: `${PRACTICE.runnablePages} of ${PRACTICE.topicPages}`, text: "with code you can run", at: n.word("close-practice", "most have code you can run") },
    { count: `${PRACTICE.bank}`, text: "multiple-choice questions in the bank", at: n.word("close-practice", "a bank of a hundred and ten") },
  ];
  const end = n.beat("close-practice").to;
  const ours = SERIES.length - 1;

  return (
    <AbsoluteFill>
      {SERIES.map((s, i) => (
        <Sfx key={s.n} name="el-tap" at={everyAt + 2 + i * 4} level={-37} />
      ))}
      <Sfx name="el-pencil" at={tellingAt} level={-35} />
      <Sfx name="el-chime" at={jobAt + 10} level={-33} />
      {practice.map((p) => (
        <Sfx key={p.text} name="el-pop" at={p.at} level={-33} />
      ))}

      <Drift from={from} to={end + 80} scale={0.015}>
        <Kicker at={from}>Backend engineer interview questions · The series</Kicker>

        {/* The ten parts, each with its hero. */}
        {SERIES.map((s, i) => {
          const at = everyAt + 2 + i * 4;
          const x = LEFT + i * COL_W;
          const lit = i === ours ? ease(frame, jobAt, 14) : 0;
          return (
            <React.Fragment key={s.n}>
              {lit > 0 ? (
                <div style={{ position: "absolute", left: x + 6, top: y(ROW_V) - 10, width: COL_W - 12, height: h(ART_H) + h(96), borderRadius: 14, background: HIGHLIGHT, opacity: lit * 0.7 }} />
              ) : null}
              {hasArt(s.video, s.hero) ? (
                <Spot id={s.hero} video={s.video} at={at} left={x + (COL_W - ART_W) / 2} top={y(ROW_V)} width={ART_W} height={h(ART_H)} phase={i * 23} amp={3} />
              ) : (
                <div
                  style={{
                    position: "absolute",
                    left: x + (COL_W - ART_W) / 2,
                    top: y(ROW_V),
                    width: ART_W,
                    height: h(ART_H),
                    boxSizing: "border-box",
                    border: `1.5px dashed ${HAIRLINE}`,
                    borderRadius: 12,
                    opacity: ease(frame, at, 10),
                  }}
                />
              )}
              <Ink at={at + 4} dur={12} style={{ left: x, top: y(ROW_V) + h(ART_H) + h(14), width: COL_W, textAlign: "center" }}>
                <div style={{ ...label(20, i === ours ? ACCENT_INK : INK_SOFT), fontWeight: 700 }}>
                  <Num>{s.n}</Num>
                </div>
                <div style={{ ...note(20, INK), fontWeight: 600, whiteSpace: "nowrap", marginTop: 2 }}>{s.title}</div>
              </Ink>
            </React.Fragment>
          );
        })}

        {/* The same test, every round. */}
        <Note at={testAt} x={X0} y={y(410)}>
          <span style={{ ...label(23, INK_SOFT), whiteSpace: "nowrap" }}>The same test, every round</span>
        </Note>
        <div style={{ position: "absolute", left: 92, top: y(452), display: "flex", gap: "0.26em", ...headline(58) }}>
          <Ink at={tellingAt - 2} dur={20} style={{ position: "relative", whiteSpace: "nowrap" }}>
            Telling a good answer
          </Ink>
          <Ink at={plausibleAt - 2} dur={18} style={{ position: "relative", ...headline(58, true), color: ACCENT_INK, whiteSpace: "nowrap" }}>
            from a plausible one,
          </Ink>
          <Ink at={whyAt - 2} dur={18} style={{ position: "relative", ...headline(58, true), color: ACCENT_INK, whiteSpace: "nowrap" }}>
            and saying why.
          </Ink>
        </div>
        <Note at={eitherAt} x={X0} y={y(560)}>
          <span style={line(30, INK)}>
            An assistant can produce either.{" "}
            <span style={{ opacity: ease(frame, apartAt - 2, 10) }}>
              Telling them apart <Mark at={jobAt + 2}>is still your job.</Mark>
            </span>
          </span>
        </Note>

        {/* The track's practice, counted. */}
        <Note at={practice[0].at - 6} x={X0} y={y(CARD_V) - 44}>
          <span style={{ ...label(23, INK_SOFT), whiteSpace: "nowrap" }}>Practice on the track</span>
        </Note>
        {practice.map((p, i) => {
          const q = ease(frame, p.at - 2, 14);
          if (q <= 0) return null;
          return (
            <div
              key={p.text}
              style={{
                position: "absolute",
                left: X0 + i * (CARD_W + CARD_GAP),
                top: y(CARD_V),
                width: CARD_W,
                boxSizing: "border-box",
                borderTop: `3px solid ${BLUE_INK}`,
                background: PAPER,
                padding: "16px 4px 0",
                opacity: q,
                transform: `translateY(${(1 - q) * 12}px)`,
              }}
            >
              <div style={{ ...note(44, BLUE_INK), fontWeight: 750, lineHeight: 1.1 }}>
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

