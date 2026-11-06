import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { BLUE_INK, HAIRLINE, HIGHLIGHT, INK, INK_SOFT, label, note } from "../../editorial/style";
import { Ink, Note, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ds } from "../../theme/brand";
import { HOUR } from "./data";
import { Drift, Mark, Spot, X0, line } from "./parts";

/** The hour, as a bar: minutes to pixels. */
const PX = 24;
const xAt = (m: number) => X0 + m * PX;
const BAR_Y = 384;
const BAR_H = 80;
const TICK_Y = 482;
const TOTAL_Y = 512;
const ROWS_Y = [580, 650, 700, 750];
const TEXT_X = 300;

/** What each phase's row says, piece by piece, each with the words it waits
 *  for. The page's table, in the narration's words. */
const ACTIVITIES: Record<string, { text: string; cue: string }[]> = {
  Orient: [
    { text: "Read the task and the existing code,", cue: "read the task and the existing code" },
    { text: " run the tests that exist,", cue: "run the tests that exist" },
    { text: " ask questions.", cue: "and ask questions" },
    { text: " The assistant, at most, summarizes an unfamiliar file.", cue: "The assistant, at most" },
  ],
  Plan: [
    { text: "Choose the approach,", cue: "choose the approach" },
    { text: " name the files you'll touch,", cue: "name the files you'll touch" },
    { text: " list the edge cases,", cue: "list the edge cases" },
    { text: " out loud.", cue: "out loud" },
  ],
  Build: [
    { text: "One focused prompt per subtask,", cue: "one focused prompt per subtask" },
    { text: " each diff reviewed before you accept it,", cue: "each diff reviewed" },
    { text: " the tests run after every step.", cue: "and the tests run after every step" },
  ],
  Verify: [
    { text: "The edge cases,", cue: "the edge cases" },
    { text: " a last read of the whole diff,", cue: "a last read of the whole diff" },
    { text: " what you'd do with more time.", cue: "and what you'd do with more time" },
  ],
};
const BEAT: Record<string, string> = { Orient: "hour-orient", Plan: "hour-plan", Build: "hour-build", Verify: "hour-verify" };
const NAMED: Record<string, string> = { Orient: "Orient, five to ten", Plan: "Plan, about five", Build: "Build, about thirty", Verify: "Verify, about ten" };

/**
 * Question 2: the page's sixty minutes as one bar, sized by its table
 * (Orient 5 to 10, Plan about 5, Build about 30, Verify about 10), the
 * hourglass at its end. Each phase fills as it is named and lights while it
 * is read, its activities inking in on the row under the bar. Then the step
 * past the table: the phases add to 50 to 55 of the 60, and Build is half the
 * hour, both bracketed; and the narration that runs under all of it.
 */
export const HourScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("hour").from;
  const qAt = n.word("hour", "Question two");
  const textAt = n.word("hour", "How should you spend");
  const sixtyAt = n.word("hour", "sixty minutes");
  const fourAt = n.word("hour", "In four phases");
  const totalAt = n.word("hour-past", "That's fifty to fifty-five minutes");
  const halfAt = n.word("hour-past", "building is only half of it");
  const narrateAt = n.word("hour-past", "Narrate throughout");
  const hearAt = n.word("hour-past", "can't grade reasoning");
  const end = n.beat("hour-past").to;

  // Orient runs from 0; its 5 to 10 minutes are drawn at 10, the second
  // five paler. The others follow on.
  let start = 0;
  const phases = HOUR.phases.map((p) => {
    const seg = { ...p, x0: xAt(start), x1: xAt(start + p.hi), flex: p.hi > p.lo ? xAt(start + p.lo) : null };
    start += p.hi;
    const beat = BEAT[p.phase];
    return {
      ...seg,
      named: n.word(beat, NAMED[p.phase]),
      read: n.beat(beat),
      items: ACTIVITIES[p.phase].map((a) => ({ ...a, at: n.word(beat, a.cue) })),
    };
  });
  const barTop = y(BAR_Y);
  const barH = h(BAR_H);
  const frameP = ease(frame, sixtyAt - 2, 16);
  const buildSeg = phases.find((p) => p.phase === "Build");
  if (!buildSeg) throw new Error("the page's hour has no Build phase");
  const half = ease(frame, halfAt, 14);
  const total = ease(frame, totalAt, 16);

  return (
    <AbsoluteFill>
      <Sfx name="el-pop" at={sixtyAt} level={-30} />
      <Sfx name="el-pencil" at={fourAt} level={-35} />
      {phases.map((p) => (
        <Sfx key={p.phase} name="el-tap" at={p.named} level={-31} />
      ))}
      <Sfx name="el-pencil" at={totalAt} level={-34} />
      <Sfx name="el-pencil" at={halfAt} level={-34} />
      <Sfx name="el-chime" at={hearAt + 10} level={-34} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={2} at={qAt - 4} textAt={textAt - 4} size={58} width={1300}>
          How should you spend 60{"\u00a0"}minutes in an AI-assisted round?
        </QuestionCard>

        {/* The sixty minutes: a frame, then each phase's slot, then its fill. */}
        <div
          style={{
            position: "absolute",
            left: xAt(0),
            top: barTop,
            width: (xAt(60) - xAt(0)) * frameP,
            height: barH,
            boxSizing: "border-box",
            border: `2px dashed ${HAIRLINE}`,
            borderRadius: 10,
            opacity: frameP > 0 ? 1 : 0,
          }}
        />
        {phases.map((p) => {
          const slot = ease(frame, fourAt + 2, 12);
          const fill = ease(frame, p.named - 2, 12);
          const lit = ease(frame, p.read.from - 4, 10) * (1 - ease(frame, p.read.to + 4, 12));
          const solid = p.flex ?? p.x1;
          return (
            <React.Fragment key={p.phase}>
              <div
                style={{
                  position: "absolute",
                  left: p.x0 + 3,
                  top: barTop + 6,
                  width: (p.x1 - p.x0 - 6) * slot,
                  height: barH - 12,
                  boxSizing: "border-box",
                  borderRadius: 8,
                  border: `2px solid ${ds("blue", 400)}`,
                  opacity: slot > 0 ? 1 : 0,
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: p.x0 + 3,
                  top: barTop + 6,
                  width: (solid - p.x0 - (p.flex ? 0 : 6)) * fill,
                  height: barH - 12,
                  borderRadius: p.flex ? "8px 0 0 8px" : 8,
                  background: `color-mix(in srgb, ${HIGHLIGHT} ${lit * 100}%, ${ds("blue", 200)})`,
                }}
              />
              {p.flex ? (
                <div
                  style={{
                    position: "absolute",
                    left: p.flex,
                    top: barTop + 6,
                    width: (p.x1 - p.flex - 6) * fill,
                    height: barH - 12,
                    borderRadius: "0 8px 8px 0",
                    background: `color-mix(in srgb, ${HIGHLIGHT} ${lit * 70}%, ${ds("blue", 100)})`,
                  }}
                />
              ) : null}
              <div
                style={{
                  position: "absolute",
                  left: p.x0,
                  top: barTop,
                  width: p.x1 - p.x0,
                  height: barH,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 2,
                  opacity: ease(frame, p.named, 10),
                }}
              >
                <span style={{ ...label(22, BLUE_INK), fontWeight: 750, whiteSpace: "nowrap" }}>{p.phase}</span>
                <span style={{ ...note(20, INK), whiteSpace: "nowrap" }}>{p.time}</span>
              </div>
            </React.Fragment>
          );
        })}

        {/* Minutes under the bar; 50 and 55 arrive with the total. */}
        <Note at={sixtyAt} x={xAt(0)} y={y(TICK_Y)}>
          <span style={{ ...note(20, INK_SOFT), whiteSpace: "nowrap" }}>0</span>
        </Note>
        <Note at={sixtyAt + 6} x={xAt(60)} y={y(TICK_Y)} align="right">
          <span style={{ ...note(20, INK_SOFT), whiteSpace: "nowrap" }}>
            <Num>60</Num> min
          </span>
        </Note>

        {/* Build is half the hour: a bracket over it. */}
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: half }}>
          <path
            d={`M${buildSeg.x0 + 4},${barTop - 8} L${buildSeg.x0 + 4},${barTop - 22} L${buildSeg.x1 - 4},${barTop - 22} L${buildSeg.x1 - 4},${barTop - 8}`}
            fill="none"
            stroke={INK}
            strokeWidth={2}
            pathLength={1}
            strokeDasharray={`${half} 1`}
          />
        </svg>
        <Note at={halfAt + 4} x={(buildSeg.x0 + buildSeg.x1) / 2 - 150} y={barTop - 62} width={300} from="up">
          <span style={{ ...note(24, INK), fontWeight: 650, whiteSpace: "nowrap", display: "block", textAlign: "center" }}>
            <Mark at={halfAt + 8}>
              <Num>{HOUR.build}</Num> of <Num>60</Num>: half
            </Mark>
          </span>
        </Note>

        {/* The phases add to 50 to 55 of the 60. */}
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: total }}>
          <path
            d={`M${xAt(0)},${y(TOTAL_Y) - 10} L${xAt(0)},${y(TOTAL_Y)} L${xAt(HOUR.lo)},${y(TOTAL_Y)} L${xAt(HOUR.lo)},${y(TOTAL_Y) - 10}`}
            fill="none"
            stroke={INK}
            strokeWidth={2}
            pathLength={1}
            strokeDasharray={`${total} 1`}
          />
          <path d={`M${xAt(HOUR.lo)},${y(TOTAL_Y)} L${xAt(HOUR.hi)},${y(TOTAL_Y)} L${xAt(HOUR.hi)},${y(TOTAL_Y) - 10}`} fill="none" stroke={INK} strokeWidth={2} strokeDasharray="5 5" />
        </svg>
        <Note at={totalAt + 8} x={xAt(HOUR.lo) - 340} y={y(TOTAL_Y) + 8} width={340} align="right">
          <span style={{ ...note(23, INK), fontWeight: 650, whiteSpace: "nowrap" }}>
            <Num>{HOUR.lo}</Num> to <Num>{HOUR.hi}</Num> minutes of the <Num>60</Num>
          </span>
        </Note>

        <Spot id="be-ai-round-hourglass" at={sixtyAt} left={1664} top={y(330)} width={118} height={210} />

        {/* Each phase's row, its activities inking in as they are read. */}
        {phases.map((p, i) => {
          const d = ease(frame, totalAt - 4, 14) * 0.5;
          return (
            <React.Fragment key={p.phase}>
              <Ink at={p.named} dur={12} style={{ left: X0, top: y(ROWS_Y[i]), opacity: 1 - d }}>
                <span style={{ ...label(24, BLUE_INK), fontWeight: 750, whiteSpace: "nowrap" }}>{p.phase}</span>
              </Ink>
              <div style={{ position: "absolute", left: TEXT_X, top: y(ROWS_Y[i]) - 1, width: 1380, ...note(24, INK), lineHeight: 1.3, opacity: 1 - d }}>
                {p.items.map((a) => (
                  <span key={a.cue} style={{ opacity: ease(frame, a.at - 2, 10) }}>
                    {a.text}
                  </span>
                ))}
              </div>
            </React.Fragment>
          );
        })}

        <Note at={narrateAt - 2} x={X0} y={y(818)}>
          <span style={line(30, INK)}>
            <b>Narrate throughout:</b>{" "}
            <span style={{ opacity: ease(frame, hearAt - 6, 10) }}>
              the interviewer <Mark at={hearAt + 6}>can&apos;t grade reasoning they can&apos;t hear.</Mark>
            </span>
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
