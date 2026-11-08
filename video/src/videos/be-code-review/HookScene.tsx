import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, INK, INK_SOFT, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ARRIVED, DIFFS, LINES } from "./data";
import {
  Arrow,
  Console,
  DiffListing,
  diffHeight,
  diffWidth,
  Drift,
  FileTab,
  Headline,
  HERO,
  Kicker,
  lerp,
  lineOf,
  lineTop,
  Mark,
  MARK_BAD,
  MARK_OK,
  Spot,
  Verdict,
  X0,
} from "./parts";

const TOP = 330;
const SIZE = 20;
/** The listing is drawn larger, centred, while the hook reads it. */
const HOOK_X = 600;
const HOOK_SCALE = 1.2;
const GAP = 48;

/**
 * The opening: one listing, the eight lines the video is built on, arriving
 * from a colleague, a stranger and an assistant, with the lynx peering at it,
 * and the three things reading it means under it: what it does, what it
 * assumes, where it's wrong. Then the plan: the same lines become the diff as
 * it arrived, two new files (intervals.py, eight lines; test_intervals.py,
 * two tests), and its tests pass.
 */
export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  const from = n.beat("hook").from;
  const mostAt = n.word("hook", "Most of the code");
  const didntAt = n.word("hook", "you didn't write");
  const colleagueAt = n.word("hook", "A colleague wrote it");
  const strangerAt = n.word("hook", "or a stranger did");
  const assistantAt = n.word("hook", "an assistant");
  const secondsAt = n.word("hook", "in a few seconds");
  const doesAt = n.word("hook", "what it does");
  const assumesAt = n.word("hook", "what it assumes");
  const wrongAt = n.word("hook", "where it's wrong");
  const threeAt = n.word("plan", "Three questions");
  const pieceAt = n.word("plan", "one piece of code");
  const eightAt = n.word("plan", "eight lines an assistant wrote");
  const testsAt = n.word("plan", "with two tests of its own");
  const passAt = n.word("plan", "Both pass");
  const end = n.beat("plan").to;

  const fn = DIFFS.arrived["intervals.py"];
  const tests = DIFFS.arrived["test_intervals.py"];
  const fnW = diffWidth(fn, SIZE);
  const testsW = diffWidth(tests, SIZE);
  const top = y(TOP);
  const testsX = X0 + fnW + GAP;

  // The listing slides from the hook's place to the plan's, settling to size.
  const move = ease(frame, eightAt - 12, 22);
  const scale = lerp(HOOK_SCALE, 1, move);
  const fnX = lerp(HOOK_X, X0, move);
  const fnH = diffHeight(fn.length, SIZE) * HOOK_SCALE;
  const hookOut = threeAt - 8;

  // Three sources, each an arrow into the listing's left edge.
  const chipX = X0;
  const chips: { at: number; y: number; text: string }[] = [
    { at: colleagueAt, y: top + fnH * 0.16, text: "a colleague" },
    { at: strangerAt, y: top + fnH * 0.46, text: "a stranger" },
    { at: assistantAt, y: top + fnH * 0.76, text: "an assistant" },
  ];
  const arrowFromX = chipX + 230;

  const wordsY = top + fnH + 84;
  const consoleTop = top + diffHeight(tests.length, SIZE) + 30;

  return (
    <AbsoluteFill>
      <Sfx name="el-whoosh" at={mostAt - 2} level={-36} />
      <Sfx name="el-pop" at={mostAt + 16} level={-30} />
      {chips.map((c, i) => (
        <Sfx key={i} name="el-pencil" at={c.at + 4} level={-36} />
      ))}
      <Sfx name="el-tap" at={doesAt} level={-34} />
      <Sfx name="el-tap" at={assumesAt} level={-34} />
      <Sfx name="el-scratch" at={wrongAt + 2} level={-34} />
      <Sfx name="el-whoosh" at={eightAt - 12} level={-36} />
      <Sfx name="el-pencil" at={testsAt} level={-36} />
      <Sfx name="el-tap" at={passAt + 2} level={-30} />

      <Drift from={from} to={end + 40}>
        <Kicker at={from}>Backend engineer interview questions</Kicker>
        <Headline lead="Most of the code," turn="you didn't write." at={mostAt - 4} turnAt={didntAt - 2} out={hookOut} />
        <Headline lead="Three questions," turn="one piece of code." at={threeAt + 2} turnAt={pieceAt - 2} />

        {/* ── The listing, then the diff it arrived as ── */}
        <DiffListing
          lines={fn}
          x={fnX}
          top={top}
          width={fnW}
          size={SIZE}
          at={mostAt}
          signsAt={eightAt + 6}
          style={{ transform: `scale(${scale})`, transformOrigin: "0 0" }}
        />
        <FileTab x={X0} top={top - 44} at={eightAt + 6} name="intervals.py">
          +{LINES} lines
        </FileTab>

        {/* ── Where it came from ── */}
        {chips.map((c, i) => (
          <React.Fragment key={i}>
            <Note at={c.at} x={chipX} y={c.y - 18} out={hookOut}>
              <span style={{ ...note(27, INK), fontWeight: 500, whiteSpace: "nowrap" }}>{c.text}</span>
            </Note>
            <Arrow from={[arrowFromX, c.y]} to={[HOOK_X - 22, top + fnH * (0.34 + i * 0.16)]} at={c.at + 4} out={hookOut} />
          </React.Fragment>
        ))}
        <Note at={secondsAt} x={chipX} y={chips[2].y + 26} out={hookOut}>
          <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>in a few seconds</span>
        </Note>

        {/* ── What reading it means ── */}
        <Note at={doesAt - 4} x={HOOK_X} y={wordsY} out={hookOut}>
          <span style={{ display: "flex", gap: 44, fontSize: 30, ...note(30, INK), whiteSpace: "nowrap" }}>
            <Mark at={doesAt}>what it does</Mark>
            <span style={{ opacity: ease(frame, assumesAt - 4, 10) }}>
              <Mark at={assumesAt}>what it assumes</Mark>
            </span>
            <span style={{ opacity: ease(frame, wrongAt - 4, 10), color: ACCENT_INK }}>
              <Mark at={wrongAt} color={MARK_BAD}>
                where it&apos;s wrong
              </Mark>
            </span>
          </span>
        </Note>

        <Spot id={HERO.id} at={mostAt + 16} out={hookOut} left={1400} top={330} width={395} height={Math.round((395 * HERO.h) / HERO.w)} />

        {/* ── Its tests, and they pass ── */}
        <FileTab x={testsX} top={top - 44} at={testsAt} name="test_intervals.py">
          +{tests.length} lines, {ARRIVED.tests.length} tests
        </FileTab>
        <DiffListing lines={tests} x={testsX} top={top} width={testsW} size={SIZE} at={testsAt} />
        {ARRIVED.tests.map((t, i) => {
          const row = lineOf(tests, `def ${t.name}`);
          return (
            <div key={t.name} style={{ position: "absolute", left: testsX + testsW + 18, top: top + lineTop(row, SIZE) + 6 }}>
              {frame >= passAt + 2 + i * 4 ? <Verdict ok={t.ok} at={passAt + 2 + i * 4} size={26} /> : null}
            </div>
          );
        })}
        <Console
          lines={[`${ARRIVED.passed} passed`]}
          x={testsX}
          top={consoleTop}
          width={300}
          size={22}
          at={passAt - 4}
          marks={[{ line: 0, at: passAt + 4, color: MARK_OK }]}
        />
      </Drift>
    </AbsoluteFill>
  );
};
