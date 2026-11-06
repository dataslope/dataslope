import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, INK, INK_SOFT, body, label, note } from "../../editorial/style";
import { Ink, NextLine, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ARRIVED, DIFFS, LINES, REVIEW, WHOLE } from "./data";
import {
  Checklist,
  Code,
  DiffListing,
  diffHeight,
  diffWidth,
  Drift,
  FadeIn,
  FileTab,
  lineOf,
  lineTop,
  Mark,
  MARK_BAD,
  NumberLine,
  OK,
  OK_INK,
  Py,
  Spot,
  Strike,
  TestGrid,
  Verdict,
} from "./parts";

const LIST_X = 660;
const SIZE = 20;
const TEST_SIZE = 19;
const R_X = 1420;
const R_W = 340;
const CHECK_ROW = 62;

/** An interval list as it prints, read back into numbers. */
const parse = (repr: string) => JSON.parse(repr) as [number, number][];

/** "in", "returns", "should be": a label and a value on one line. */
const Pair: React.FC<{ name: string; value: string; ink?: string; size?: number }> = ({ name, value, ink, size = 22 }) => (
  <span style={{ display: "flex", gap: 14, alignItems: "center", whiteSpace: "nowrap", fontSize: size }}>
    <span style={note(size, INK_SOFT)}>{name}</span>
    <Py text={value} size={size} ink={ink} />
  </span>
);

/** A word set as a small tag beside a line it classifies. */
const Kind: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span
    style={{
      ...note(21, INK),
      fontWeight: 600,
      display: "inline-block",
      padding: "1px 12px 3px",
      borderRadius: 999,
      border: `1.5px solid ${INK_SOFT}`,
      whiteSpace: "nowrap",
    }}
  >
    {children}
  </span>
);

/**
 * Question 3: reviewing code an assistant wrote. The page's five checks as a
 * checklist, then the diff as it arrived, read against them: three pass, the
 * boundaries fail twice (touching intervals kept apart, a contained interval
 * shrunk, each on a number line from the run), and the tests fail the last
 * check (the first cannot tell this code from a correct one, the second
 * asserts the bug). The three-line fix, the reviewer's tests on both versions,
 * where the bugs were, the follow-up (closed or half-open), and what the sort
 * costs, into the next part.
 */
export const ReviewScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  const from = n.beat("review").from;
  const qAt = n.word("review", "Question three");
  const textAt = n.word("review", "How do you review code");
  const strangerAt = n.word("review", "Like a pull request from a capable stranger");
  const c1At = n.word("review-list", "Check that it does what was asked");
  const c2At = n.word("review-list", "That every import");
  const c3At = n.word("review-list", "That it handles the boundaries");
  const c4At = n.word("review-list", "That it doesn't add an accidental");
  const c5At = n.word("review-list", "And that its tests would fail");
  const runAt = n.word("review-list", "Then run it");
  const backAt = n.word("review-diff", "Go back to the diff as it arrived");
  const touchesAt = n.word("review-diff", "It touches one function");
  const callsAt = n.word("review-diff", "It calls nothing that doesn't exist");
  const passAt = n.word("review-diff", "It makes one pass over the input");
  const breaksAt = n.word("review-edges", "The boundaries are where it breaks");
  const sortAt = n.word("review-edges", "Besides the missing sort");
  const strictAt = n.word("review-edges", "the comparison is a strict less-than");
  const closedAt = n.word("review-edges", "These are closed intervals");
  const shareAt = n.word("review-edges", "share the point two");
  const mergeAt = n.word("review-edges", "and should merge");
  const apartAt = n.word("review-edges", "The code keeps them apart");
  const setsAt = n.word("review-contain", "And a merge sets the end");
  const tenAt = n.word("review-contain", "One to ten, then two to three");
  const becomesAt = n.word("review-contain", "becomes one to three");
  const shrankAt = n.word("review-contain", "The merge shrank the interval");
  const lastAt = n.word("review-tests", "Last check");
  const firstAt = n.word("review-tests", "The first passes on this code");
  const aliveAt = n.word("review-tests", "on a correct version alike");
  const tellAt = n.word("review-tests", "so it can't tell them apart");
  const secondAt = n.word("review-tests", "The second asserts");
  const bugAt = n.word("review-tests", "That's the bug");
  const failsAt = n.word("review-tests", "on correct code it fails");
  const threeAt = n.word("review-fix", "Three changes fix it");
  const sortInAt = n.word("review-fix", "sort the input");
  const lteAt = n.word("review-fix", "compare with less-than-or-equal");
  const largerAt = n.word("review-fix", "keep the larger end");
  const writeAt = n.word("review-fix", "Then write the tests the review wanted");
  const unsortedAt = n.word("review-fix", "unsorted");
  const touchingAt = n.word("review-fix", "touching");
  const containedAt = n.word("review-fix", "contained");
  const allFailAt = n.word("review-fix", "On the assistant's code, all three fail");
  const allPassAt = n.word("review-fix", "On the fix, all three pass");
  const eachAt = n.word("review-where", "Each bug is a boundary");
  const assumptionAt = n.word("review-where", "or an unstated assumption");
  const obviousAt = n.word("review-where", "The obvious test touched none of them");
  const followAt = n.word("review-past", "Then expect the follow-up");
  const slotsAt = n.word("review-past", "Half-open booking slots");
  const nineAt = n.word("review-past", "nine to ten and ten to eleven");
  const overlapAt = n.word("review-past", "don't overlap");
  const askAt = n.word("review-past", "So ask whether the end is inclusive");
  const writeDownAt = n.word("review-past", "write the answer down as a test");
  const addedAt = n.word("next", "The fix also added a sort");
  const onePassAt = n.word("next", "from one pass");
  const nlognAt = n.word("next", "to n log n");
  const costAt = n.word("next", "Reading code includes judging what it costs");
  const nextAt = n.word("next", "Next");
  const end = n.beat("next").to + 60;

  const top = y(330);
  const fn = DIFFS.arrived["intervals.py"];
  const tests = DIFFS.arrived["test_intervals.py"];
  const fix = WHOLE.fix;
  const fnW = diffWidth(fix, SIZE);
  const testsW = diffWidth(tests, TEST_SIZE);
  const fixBottom = top + diffHeight(fix.length, SIZE);

  // The code on screen: the diff as it arrived, its test file, then the fix.
  const testsIn = lastAt;
  const fixIn = threeAt;
  const rOut = lastAt - 6;

  const compare = lineOf(fn, "start < merged[-1][1]");
  const loop = lineOf(fn, "for start, end in intervals");
  const setEnd = lineOf(fn, "merged[-1][1] = end");
  const append = lineOf(fn, "merged.append");

  // The two boundary cases, read from the runs.
  const touchIn = parse(REVIEW.touching.arg);
  const containIn = parse(REVIEW.contained.arg);
  const containOut = parse(REVIEW.contained.repr ?? "[]");
  const rTop = top + 10;
  const cTop = top + 300;

  // The assistant's tests: on this code, and on a correct one (the fix).
  const assertRow = (name: string) => lineOf(tests, `def ${name}`) + 1;
  const verdictX = [LIST_X + testsW + 50, LIST_X + testsW + 160];
  const gridTop = fixBottom + 36;

  // The where-labels sit beside the three added lines of the fix.
  const added = fix.map((l, i) => (l.startsWith("+") ? i : -1)).filter((i) => i >= 0);
  const kinds = ["assumption", "boundary", "boundary"];

  // The follow-up's two number lines, where the checklist was.
  const pastIn = followAt - 2;
  const listOut = followAt - 8;

  return (
    <AbsoluteFill>
      <Sfx name="el-pop" at={c1At} level={-30} />
      {[c1At, c2At, c3At, c4At, c5At].map((at, i) => (
        <Sfx key={i} name="el-pencil" at={at + 2} level={-38} />
      ))}
      <Sfx name="el-whoosh" at={backAt} level={-36} />
      {[touchesAt, callsAt, passAt].map((at, i) => (
        <Sfx key={i} name="el-tap" at={at + 8} level={-32} />
      ))}
      <Sfx name="el-scratch" at={breaksAt + 4} level={-33} />
      <Sfx name="el-pencil" at={closedAt} level={-36} />
      <Sfx name="el-tap" at={apartAt + 2} level={-30} />
      <Sfx name="el-pencil" at={tenAt} level={-36} />
      <Sfx name="el-scratch" at={becomesAt + 6} level={-33} />
      <Sfx name="el-whoosh" at={testsIn} level={-38} />
      <Sfx name="el-scratch" at={tellAt + 4} level={-34} />
      <Sfx name="el-scratch" at={failsAt + 2} level={-32} />
      <Sfx name="el-whoosh" at={fixIn} level={-38} />
      <Sfx name="el-tap" at={allFailAt + 8} level={-32} />
      <Sfx name="el-tap" at={allPassAt + 8} level={-30} />
      <Sfx name="el-pencil" at={slotsAt} level={-36} />
      <Sfx name="el-scratch" at={nlognAt - 4} level={-36} />

      <Drift from={from} to={end}>
        <QuestionCard n={3} at={qAt - 4} textAt={textAt - 4} size={60} width={1300}>
          How do you review code an assistant wrote?
        </QuestionCard>
        <Ink at={strangerAt} dur={18} style={{ left: 96, top: y(232), ...body(36, true), color: INK, whiteSpace: "nowrap" }}>
          Like a pull request from a capable stranger.
        </Ink>
        <Spot id="be-code-review-clipboard" at={c1At} left={1640} top={86} width={132} height={187} />

        {/* ── The five checks ── */}
        <Checklist
          x={120}
          top={top}
          rowH={CHECK_ROW}
          out={listOut}
          items={[
            { label: "does what was asked, nothing else", at: c1At, okAt: touchesAt + 8 },
            { label: "everything it uses exists", at: c2At, okAt: callsAt + 8 },
            { label: "handles boundaries and error paths", at: c3At, badAt: breaksAt + 4 },
            {
              label: (
                <>
                  no accidental O(<i>n</i>²) loop or N+1 query
                </>
              ),
              at: c4At,
              okAt: passAt + 8,
            },
            { label: "its tests fail without the change", at: c5At, badAt: tellAt + 4 },
            { label: "then run it", at: runAt, okAt: allPassAt + 8 },
          ]}
        />

        {/* ── The diff as it arrived ── */}
        <FileTab x={LIST_X} top={top - 44} at={backAt} dim={testsIn} name="intervals.py">
          +{LINES}
        </FileTab>
        <FileTab x={LIST_X + 250} top={top - 44} at={backAt + 4} dim={backAt + 10} name="test_intervals.py">
          +{tests.length}
        </FileTab>
        <DiffListing
          lines={fn}
          x={LIST_X}
          top={top}
          width={fnW}
          size={SIZE}
          at={backAt}
          out={testsIn}
          marks={[
            { line: append, text: "append", at: callsAt + 4, out: passAt },
            { line: loop, at: passAt + 4, out: breaksAt },
            { line: loop, text: "in intervals", at: sortAt + 4, color: MARK_BAD },
            { line: compare, text: "<", at: strictAt + 6, color: MARK_BAD },
            { line: setEnd, at: setsAt + 4, color: MARK_BAD },
          ]}
        />

        {/* ── Touching intervals ── */}
        <Note at={closedAt} x={R_X} y={rTop} out={rOut}>
          <Pair name="in" value={REVIEW.touching.arg} />
        </Note>
        <NumberLine
          x={R_X + 20}
          y={rTop + 128}
          width={R_W - 40}
          from={0}
          to={4}
          ticks={[0, 1, 2, 3, 4]}
          at={closedAt + 4}
          out={rOut}
          segs={touchIn.map(([s, e], i) => ({ s, e, dy: 26, color: i ? BAR : `color-mix(in srgb, ${BAR} 60%, white)`, at: closedAt + 8 + i * 8 }))}
          points={[{ v: 2, dy: 26, at: shareAt + 4, r: 20 }]}
        />
        <Note at={mergeAt} x={R_X} y={rTop + 178} out={rOut}>
          <Pair name="should be" value={REVIEW.fixed.touching.repr ?? ""} ink={OK_INK} />
        </Note>
        <Note at={apartAt} x={R_X} y={rTop + 218} out={rOut}>
          <Pair name="returns" value={REVIEW.touching.repr ?? ""} ink={ACCENT_INK} />
        </Note>

        {/* ── A contained interval ── */}
        <Note at={tenAt} x={R_X} y={cTop} out={rOut}>
          <Pair name="in" value={REVIEW.contained.arg} />
        </Note>
        <NumberLine
          x={R_X + 20}
          y={cTop + 140}
          width={R_W - 40}
          from={0}
          to={11}
          ticks={[0, 1, 3, 5, 10]}
          at={tenAt + 4}
          out={rOut}
          segs={[
            { s: containIn[0][0], e: containIn[0][1], dy: 52, color: BAR, at: tenAt + 8 },
            { s: containIn[1][0], e: containIn[1][1], dy: 24, color: `color-mix(in srgb, ${BAR} 60%, white)`, at: tenAt + 16 },
            { s: containOut[0][1], e: containIn[0][1], dy: 52, color: ACCENT, at: becomesAt + 6, dashed: true, open: [true, false] },
          ]}
        />
        <Note at={becomesAt} x={R_X} y={cTop + 190} out={rOut}>
          <Pair name="returns" value={REVIEW.contained.repr ?? ""} ink={ACCENT_INK} />
        </Note>
        <Note at={shrankAt} x={R_X} y={cTop + 230} out={rOut}>
          <span style={{ ...note(22, ACCENT_INK), whiteSpace: "nowrap" }}>
            <Mark at={shrankAt + 4} color={MARK_BAD}>
              the merge shrank it
            </Mark>
          </span>
        </Note>

        {/* ── Its tests: this code, and a correct one ── */}
        <FileTab x={LIST_X + 250} top={top - 44} at={testsIn} out={fixIn} name="test_intervals.py">
          +{tests.length}
        </FileTab>
        <DiffListing
          lines={tests}
          x={LIST_X}
          top={top}
          width={testsW}
          size={TEST_SIZE}
          at={testsIn}
          wipe={false}
          out={fixIn}
          marks={[{ line: assertRow(ARRIVED.tests[1].name), at: bugAt + 2, color: MARK_BAD }]}
        />
        {["this code", "correct"].map((t, j) => (
          <Note key={t} at={firstAt - 4} x={verdictX[j] - 60} y={top - 44} out={fixIn}>
            <span style={{ ...label(21, INK_SOFT), display: "inline-block", width: 120, textAlign: "center", whiteSpace: "nowrap" }}>{t}</span>
          </Note>
        ))}
        {ARRIVED.tests.map((t, i) => {
          const rowY = top + lineTop(assertRow(t.name), TEST_SIZE) + 2;
          const onFix = REVIEW.assistantTestsOnFix.tests[i];
          const at0 = i === 0 ? firstAt + 4 : secondAt + 6;
          const at1 = i === 0 ? aliveAt + 4 : failsAt + 2;
          const gray = i === 0 ? tellAt : undefined;
          return (
            <React.Fragment key={t.name}>
              {[t.ok, onFix.ok].map((ok, j) => (
                <div key={j} style={{ position: "absolute", left: verdictX[j] - 14, top: rowY, opacity: (gray !== undefined ? 1 - 0.6 * ease(frame, gray, 12) : 1) * (1 - ease(frame, fixIn, 10)) }}>
                  {frame >= (j ? at1 : at0) ? <Verdict ok={ok} at={j ? at1 : at0} size={28} gray={gray !== undefined && frame >= gray + 12} /> : null}
                </div>
              ))}
            </React.Fragment>
          );
        })}
        <Note at={tellAt} x={LIST_X} y={top + diffHeight(tests.length, TEST_SIZE) + 30} out={fixIn}>
          <span style={{ ...note(24, INK_SOFT), whiteSpace: "nowrap" }}>the first passes on both: it can&apos;t tell them apart</span>
        </Note>
        <Note at={bugAt} x={LIST_X} y={top + diffHeight(tests.length, TEST_SIZE) + 74} out={fixIn}>
          <span style={{ ...note(24, ACCENT_INK), whiteSpace: "nowrap" }}>
            the second is <Mark at={bugAt + 6} color={MARK_BAD}>the bug, written down as a requirement</Mark>
          </span>
        </Note>

        {/* ── The fix, and the tests the review wanted ── */}
        <FileTab x={LIST_X} top={top - 44} at={fixIn} name="intervals.py">
          3 lines changed
        </FileTab>
        <DiffListing
          lines={fix}
          x={LIST_X}
          top={top}
          width={fnW}
          size={SIZE}
          at={fixIn}
          wipe={false}
          signsAt={fixIn}
          marks={[
            { line: added[0], text: "sorted(intervals)", at: sortInAt + 4, out: lteAt },
            { line: added[1], text: "<=", at: lteAt + 6, out: largerAt },
            { line: added[2], text: "max(merged[-1][1], end)", at: largerAt + 4, out: writeAt },
            { line: added[0], text: "sorted(intervals)", at: addedAt + 2 },
          ]}
        />
        {added.map((row, i) => (
          <Note key={row} at={(i === 0 ? assumptionAt : eachAt) + 4 + i * 4} x={LIST_X + fnW + 24} y={top + lineTop(row, SIZE) + 3} out={followAt - 6}>
            <Kind>{kinds[i]}</Kind>
          </Note>
        ))}
        <TestGrid
          x={LIST_X}
          top={gridTop}
          rowH={34}
          width={900}
          headAt={writeAt}
          out={followAt - 6}
          cols={[
            { title: "the assistant's code", x: LIST_X + 560 },
            { title: "the fix", x: LIST_X + 800 },
          ]}
          rows={REVIEW.onAssistant.tests.map((t, i) => {
            const named = [undefined, unsortedAt, touchingAt, containedAt][i];
            return {
              name: <Code line={t.name} size={20} />,
              at: named ?? writeAt + 2,
              cells: [
                { ok: t.ok, at: (i === 0 ? allFailAt : allFailAt + 6 + i * 5) },
                { ok: REVIEW.onFix.tests[i].ok, at: allPassAt + 4 + i * 5 },
              ],
              markAt: i === 0 ? obviousAt + 4 : undefined,
            };
          })}
        />
        <Note at={obviousAt + 10} x={LIST_X + 920} y={gridTop + 34 + 4} out={followAt - 6}>
          <span style={{ ...note(22, INK), whiteSpace: "nowrap" }}>touched none of them</span>
        </Note>

        {/* ── The follow-up: is the end inclusive? ── */}
        <Note at={pastIn} x={120} y={top - 6}>
          <span style={{ ...label(22, INK), whiteSpace: "nowrap" }}>
            closed: <Py text={REVIEW.touching.arg} size={22} />
          </span>
        </Note>
        <NumberLine
          x={150}
          y={top + 110}
          width={400}
          from={0}
          to={4}
          ticks={[0, 1, 2, 3, 4]}
          at={pastIn + 2}
          segs={touchIn.map(([s, e], i) => ({ s, e, dy: 26, color: i ? BAR : `color-mix(in srgb, ${BAR} 60%, white)`, at: pastIn + 6 + i * 6 }))}
          points={[{ v: 2, dy: 26, at: pastIn + 16, r: 20 }]}
        />
        <Note at={pastIn + 10} x={120} y={top + 158}>
          <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>both hold 2: they touch</span>
        </Note>
        <Note at={slotsAt} x={120} y={top + 230}>
          <span style={{ ...label(22, INK), whiteSpace: "nowrap" }}>half-open: booking slots</span>
        </Note>
        <NumberLine
          x={150}
          y={top + 340}
          width={400}
          from={8}
          to={12}
          ticks={[8, 9, 10, 11, 12]}
          at={slotsAt + 2}
          segs={[
            { s: 9, e: 10, dy: 26, color: `color-mix(in srgb, ${OK} 60%, white)`, at: nineAt, open: [false, true] },
            { s: 10, e: 11, dy: 26, color: OK, at: nineAt + 10, open: [false, true] },
          ]}
        />
        <Note at={overlapAt} x={120} y={top + 388}>
          <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>9 to 10 stops short of 10: no overlap</span>
        </Note>
        <Note at={askAt} x={LIST_X} y={gridTop + 6} out={addedAt - 6}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>
            ask: <Mark at={askAt + 8}>is the end inclusive?</Mark>
            <FadeIn at={writeDownAt}> Then write the answer down as a test.</FadeIn>
          </span>
        </Note>

        {/* ── What the sort costs ── */}
        <Note at={onePassAt} x={LIST_X + fnW + 40} y={top + lineTop(added[0], SIZE) - 2}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap", display: "flex", gap: 16, fontSize: 26 }}>
            <Strike at={nlognAt}>one pass</Strike>
            <FadeIn at={nlognAt}>
              <Mark at={nlognAt + 6}>
                <i>n</i> log <i>n</i>
              </Mark>
            </FadeIn>
          </span>
        </Note>
        <Note at={costAt} x={LIST_X + fnW + 40} y={top + lineTop(added[0], SIZE) + 46}>
          <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>what the fix costs</span>
        </Note>
        <NextLine at={nextAt} x={LIST_X} y={gridTop + 40} width={1140}>
          algorithms as reasoning
        </NextLine>
      </Drift>
    </AbsoluteFill>
  );
};
