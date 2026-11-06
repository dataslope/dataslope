import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, INK, INK_SOFT, body, label, note } from "../../editorial/style";
import { Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ds, inkOf } from "../../theme/brand";
import { DEBUG, LISTINGS, WHOLE } from "./data";
import {
  Code,
  Console,
  DiffListing,
  diffHeight,
  diffWidth,
  Drift,
  FadeIn,
  FileTab,
  lineOf,
  LISTING_PAPER,
  Mark,
  MARK_BAD,
  MARK_OK,
  OK_INK,
  Py,
  Source,
  Steps,
  TestGrid,
  Verdict,
} from "./parts";

const SIZE = 21;
const LIST_X = 610;
const R_X = 1352;
const STEP_ROW = 64;

/** The assistant's function, every line unchanged, as the diffs print it. */
const PLAIN = WHOLE.cause.map((l) => (l.startsWith("+") ? null : ` ${l.slice(1)}`)).filter((l): l is string => l !== null);

/** A value that changes as the code does: each version replaces the last. */
const Swap: React.FC<{ versions: readonly { at: number; text: string; ink: string; ok?: boolean }[]; size?: number }> = ({ versions, size = 22 }) => {
  const frame = useCurrentFrame();
  return (
    <span style={{ position: "relative", display: "inline-block", height: size * 1.3, minWidth: 300 }}>
      {versions.map((v, i) => {
        const next = versions[i + 1]?.at;
        const o = ease(frame, v.at, 8) * (next === undefined ? 1 : 1 - ease(frame, next - 4, 6));
        if (o <= 0) return null;
        return (
          <span key={i} style={{ position: "absolute", left: 0, top: 0, opacity: o, display: "flex", alignItems: "center", gap: 14, whiteSpace: "nowrap", fontSize: size }}>
            <Py text={v.text} size={size} ink={v.ink} />
            {v.ok !== undefined ? <Verdict ok={v.ok} at={v.at + 4} size={24} /> : null}
          </span>
        );
      })}
    </span>
  );
};

/** A deterministic sketch of a long file, line lengths from a fixed seed. */
const SKETCH = Array.from({ length: 118 }, (_, i) => {
  const r = Math.sin(i * 12.9898 + 4.1) * 43758.5453;
  const f = r - Math.floor(r);
  const indent = [0, 1, 1, 2, 2, 3][Math.floor(((Math.sin(i * 3.3) + 1) / 2) * 5.99)];
  const blank = f < 0.1;
  return { indent, len: blank ? 0 : 0.18 + 0.62 * f };
});

/**
 * Question 2: the comprehension and debugging round, worked as the page's
 * five steps on our eight lines. The bug report (three intervals out of
 * order, one interval back that ends before it starts); step 1 reads the
 * loop's comparison; step 2 shrinks the report to two intervals, as a test;
 * step 3 traces the state and finds where it first goes wrong; the
 * hypothesis, tested from outside; step 4 patches the symptom (an empty list,
 * no error) and then the cause (the sort); step 5 says why. Every value on
 * screen is what the code it stands beside returned in Pyodide.
 */
export const DebugScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  const from = n.beat("debug").from;
  const qAt = n.word("debug", "Question two");
  const textAt = n.word("debug", "What happens in a code comprehension");
  const unfamiliarAt = n.word("debug", "You're given unfamiliar code");
  const hundredAt = n.word("debug", "often a few hundred lines");
  const wrongAt = n.word("debug", "told it's wrong");
  const slowAt = n.word("debug", "or slow");
  const googleAt = n.word("debug", "Google's pilot");
  const approvedAt = n.word("debug", "which allows an approved assistant");
  const readAt = n.word("debug", "read, debug and optimize");
  const oursAt = n.word("debug-report", "Ours is eight lines");
  const reportAt = n.word("debug-report", "The report");
  const mergingAt = n.word("debug-report", "merging eight to ten");
  const eightSixAt = n.word("debug-report", "from eight to six");
  const step1 = n.word("debug-read", "Step one");
  const lastAt = n.word("debug-read", "only with the last one it merged");
  const orderAt = n.word("debug-read", "something about the order holds");
  const step2 = n.word("debug-repro", "Step two");
  const asTestAt = n.word("debug-repro", "ideally as a test");
  const enoughAt = n.word("debug-repro", "Two intervals are enough");
  const threeFourAt = n.word("debug-repro", "Three to four, then one to two");
  const threeTwoAt = n.word("debug-repro", "comes back as three to two");
  const step3 = n.word("debug-trace", "Step three");
  const printAt = n.word("debug-trace", "Print the state");
  const firstAt = n.word("debug-trace", "After the first");
  const secondAt = n.word("debug-trace", "After the second");
  const startsAt = n.word("debug-trace", "one to two starts before");
  const hypoAt = n.word("debug-hypo", "So the hypothesis");
  const sortedAt = n.word("debug-hypo", "the loop assumes its input is sorted");
  const beforeAt = n.word("debug-hypo", "Sort the input before the call");
  const passesAt = n.word("debug-hypo", "the reproduction passes");
  const step4 = n.word("debug-symptom", "Step four");
  const patchAt = n.word("debug-symptom", "Patch the symptom");
  const emptyAt = n.word("debug-symptom", "come back as an empty list");
  const noErrorAt = n.word("debug-symptom", "with no error at all");
  const causeAt = n.word("debug-cause", "The cause is the missing sort");
  const insideAt = n.word("debug-cause", "Sort inside the function");
  const rerunAt = n.word("debug-cause", "then rerun the reproduction");
  const allAt = n.word("debug-cause", "All of them pass");
  const step5 = n.word("debug-explain", "Step five");
  const whyAt = n.word("debug-explain", "why the fix is right");
  const elseAt = n.word("debug-explain", "and what else might share the flaw");
  const hereAt = n.word("debug-explain", "Here, the loop relied on sorted input");
  const guaranteesAt = n.word("debug-explain", "and the fix guarantees it");
  const aiAt = n.word("debug-ai", "If the round allows an assistant");
  const doesAt = n.word("debug-ai", "what a function does");
  const couldAt = n.word("debug-ai", "what could make it return");
  const noSubAt = n.word("debug-ai", "It's no substitute for step two");
  const pastAt = n.word("debug-past", "And what else shares the flaw");
  const testsAt = n.word("debug-past", "Start with the tests");
  const bothAt = n.word("debug-past", "passed before the fix and after it");
  const neitherAt = n.word("debug-past", "so neither ever tested the order");
  const keepAt = n.word("debug-past", "Keep the reproduction as a third");
  const end = n.beat("debug-past").to;

  const top = y(330);
  const listW = diffWidth([...WHOLE.trace, ...WHOLE.symptom, ...WHOLE.cause], SIZE);
  const listBottom = top + diffHeight(9, SIZE);
  const B = listBottom + 48;
  const R_LABEL = label(21, INK_SOFT);

  // The code on screen, by version: the assistant's, traced, the symptom
  // patch, and the cause fixed. Each fades in where the last one was.
  const plainOut = printAt;
  const tracedOut = beforeAt - 4;
  const plainBackAt = beforeAt;
  const symptomAt = patchAt + 4;
  const fixAt = insideAt + 2;

  const A = LISTINGS.assistant;
  const compareLine = lineOf(A, "start < merged[-1][1]");
  const loopLine = lineOf(A, "for start, end in intervals");

  // The intro's long file: gone as ours arrives.
  const introOut = oursAt - 6;
  const sketchTop = y(318);
  const pitch = 5.4;

  return (
    <AbsoluteFill>
      <Sfx name="el-sprinkle" at={hundredAt} level={-34} />
      <Sfx name="el-scratch" at={wrongAt + 4} level={-35} />
      <Sfx name="el-whoosh" at={oursAt - 4} level={-36} />
      <Sfx name="el-tap" at={eightSixAt + 4} level={-30} />
      <Sfx name="el-pencil" at={step1} level={-36} />
      <Sfx name="el-pencil" at={lastAt} level={-36} />
      <Sfx name="el-tap" at={threeTwoAt + 4} level={-30} />
      <Sfx name="el-pencil" at={asTestAt} level={-36} />
      <Sfx name="el-tap" at={firstAt + 2} level={-34} />
      <Sfx name="el-scratch" at={secondAt + 4} level={-34} />
      <Sfx name="el-tap" at={passesAt} level={-30} />
      <Sfx name="el-whoosh" at={symptomAt} level={-38} />
      <Sfx name="el-tap" at={emptyAt + 4} level={-32} />
      <Sfx name="el-whoosh" at={fixAt} level={-38} />
      <Sfx name="el-tap" at={allAt} level={-30} />
      <Sfx name="el-tap" at={allAt + 8} level={-32} />
      <Sfx name="el-pencil" at={step5} level={-36} />
      <Sfx name="el-pencil" at={noSubAt} level={-34} />
      <Sfx name="el-tap" at={keepAt + 6} level={-30} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={2} at={qAt - 4} textAt={textAt - 4} size={60}>
          What happens in a code comprehension or debugging round?
        </QuestionCard>

        {/* ── The round: a long file, wrong or slow ── */}
        <Note at={unfamiliarAt - 2} x={120} y={y(330)} out={introOut}>
          <span style={{ ...note(30, INK), whiteSpace: "nowrap" }}>
            Unfamiliar code, <FadeIn at={hundredAt - 2}>often a few hundred lines,</FadeIn>
          </span>
        </Note>
        <Note at={wrongAt - 4} x={120} y={y(390)} out={introOut}>
          <span style={{ ...note(30, INK), whiteSpace: "nowrap" }}>
            and told it&apos;s{" "}
            <Mark at={wrongAt + 2} color={MARK_BAD}>
              <span style={{ color: ACCENT_INK }}>wrong</span>
            </Mark>
            <FadeIn at={slowAt - 2}>
              , or{" "}
              <Mark at={slowAt + 2} color={MARK_BAD}>
                <span style={{ color: ACCENT_INK }}>slow</span>
              </Mark>
            </FadeIn>
          </span>
        </Note>
        <Ink at={googleAt} dur={20} out={introOut} style={{ left: 120, top: y(500), ...body(44, true), color: INK, whiteSpace: "nowrap" }}>
          &ldquo;<Mark at={readAt}>read, debug and optimize</Mark>&rdquo; an existing codebase
        </Ink>
        <Note at={approvedAt} x={120} y={y(575)} out={introOut}>
          <Source>Google&apos;s interview pilot, which allows an approved assistant</Source>
        </Note>
        <div style={{ position: "absolute", left: 1360, top: sketchTop, opacity: 1 - ease(frame, introOut, 10) }}>
          {SKETCH.map((l, i) => {
            const p = ease(frame, hundredAt - 6 + i * 0.35, 8);
            if (p <= 0 || l.len === 0) return null;
            const bad = i >= 61 && i <= 63 ? ease(frame, wrongAt + 4, 8) : i >= 92 && i <= 95 ? ease(frame, slowAt + 4, 8) : 0;
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: l.indent * 22,
                  top: i * pitch,
                  width: (380 - l.indent * 22) * l.len * p,
                  height: 3,
                  borderRadius: 2,
                  background: bad > 0.5 ? ACCENT : i % 7 === 0 ? inkOf.purple : ds("gray", 300),
                  opacity: bad > 0.5 ? 1 : 0.75,
                }}
              />
            );
          })}
        </div>

        {/* ── Our eight lines, and every version of them ── */}
        <FileTab x={LIST_X} top={top - 44} at={oursAt} name="intervals.py" />
        <DiffListing lines={PLAIN} x={LIST_X} top={top} width={listW} size={SIZE} at={oursAt} out={plainOut} marks={[
          { line: compareLine, text: "merged[-1][1]", at: lastAt + 4 },
          { line: loopLine, text: "in intervals", at: orderAt + 4 },
        ]} />
        <DiffListing lines={WHOLE.trace} x={LIST_X} top={top} width={listW} size={SIZE} at={printAt} wipe={false} out={tracedOut} />
        <DiffListing lines={PLAIN} x={LIST_X} top={top} width={listW} size={SIZE} at={plainBackAt} wipe={false} out={symptomAt} />
        <DiffListing lines={WHOLE.symptom} x={LIST_X} top={top} width={listW} size={SIZE} at={symptomAt} wipe={false} out={fixAt} />
        <DiffListing
          lines={WHOLE.cause}
          x={LIST_X}
          top={top}
          width={listW}
          size={SIZE}
          at={fixAt}
          wipe={false}
          marks={[{ line: lineOf(WHOLE.cause, "sorted(intervals)"), text: "sorted(intervals)", at: hereAt + 6, color: MARK_OK }]}
        />

        {/* ── The five steps ── */}
        <Steps
          x={132}
          top={top}
          rowH={STEP_ROW}
          width={438}
          at={step1 - 4}
          end={aiAt}
          items={[
            { label: "Read before you run", at: step1 },
            { label: "Reproduce", at: step2 },
            { label: "Form a hypothesis, test it", at: step3 },
            { label: "Fix the cause, not the symptom", at: step4 },
            { label: "Explain", at: step5 },
          ]}
          ring={{ row: 1, at: noSubAt }}
        />

        {/* ── What it returns: the report and the reproduction ── */}
        <Note at={reportAt} x={R_X} y={top - 6}>
          <span style={{ ...R_LABEL, whiteSpace: "nowrap" }}>the bug report</span>
        </Note>
        <Note at={mergingAt} x={R_X} y={top + 30}>
          <Py text={DEBUG.report.arg} size={22} />
        </Note>
        <Note at={eightSixAt - 6} x={R_X} y={top + 70}>
          <span style={{ display: "flex", gap: 14, alignItems: "center", fontSize: 22, whiteSpace: "nowrap" }}>
            <span style={note(22, INK_SOFT)}>returns</span>
            <Swap
              versions={[
                { at: eightSixAt - 6, text: DEBUG.report.repr ?? "", ink: ACCENT_INK },
                { at: emptyAt, text: DEBUG.symptomReport.repr ?? "", ink: ACCENT_INK },
                { at: allAt, text: DEBUG.causeReport.repr ?? "", ink: OK_INK, ok: true },
              ]}
            />
          </span>
        </Note>
        <Note at={threeFourAt - 6} x={R_X} y={top + 144}>
          <span style={{ ...R_LABEL, whiteSpace: "nowrap" }}>the reproduction</span>
        </Note>
        <Note at={threeFourAt} x={R_X} y={top + 180}>
          <Py text={DEBUG.repro.arg} size={22} />
        </Note>
        <Note at={threeTwoAt - 4} x={R_X} y={top + 220}>
          <span style={{ display: "flex", gap: 14, alignItems: "center", fontSize: 22, whiteSpace: "nowrap" }}>
            <span style={note(22, INK_SOFT)}>returns</span>
            <Swap
              versions={[
                { at: threeTwoAt - 4, text: DEBUG.repro.repr ?? "", ink: ACCENT_INK },
                { at: emptyAt + 4, text: DEBUG.symptomRepro.repr ?? "", ink: ACCENT_INK },
                { at: allAt + 4, text: DEBUG.causeRepro.repr ?? "", ink: OK_INK, ok: true },
              ]}
            />
          </span>
        </Note>

        {/* ── Step 1: what the loop relies on ── */}
        <Note at={lastAt} x={LIST_X} y={B} out={step2 - 6}>
          <span style={{ ...note(25, INK), whiteSpace: "nowrap" }}>each interval is compared only with the last one merged</span>
        </Note>
        <Note at={orderAt} x={LIST_X} y={B + 44} out={step2 - 6}>
          <span style={{ ...note(25, INK), whiteSpace: "nowrap" }}>
            safe only if <Mark at={orderAt + 6}>the order</Mark> holds
          </span>
        </Note>

        {/* ── Step 2: the smallest failing input, as a test ── */}
        <DiffListing lines={LISTINGS.reproTest} diff={false} x={LIST_X} top={B} width={diffWidth(LISTINGS.reproTest, 20, false)} size={20} at={asTestAt} out={step3 - 6} />
        <Note at={enoughAt} x={LIST_X} y={B + diffHeight(2, 20) + 22} out={step3 - 6}>
          <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>
            of every input with ends 0 to 4: one interval, {DEBUG.search.oneInterval} of {DEBUG.search.spans} fail; two intervals, {DEBUG.search.twoIntervals} of{" "}
            {DEBUG.search.inputsOfTwo}
          </span>
        </Note>

        {/* ── Step 3: print the state, find where it first goes wrong ── */}
        <Console
          lines={DEBUG.trace.stdout}
          x={LIST_X}
          top={B}
          width={330}
          size={22}
          at={firstAt - 6}
          lineAt={[firstAt - 4, secondAt - 4]}
          marks={[
            { line: 0, at: firstAt + 6, color: MARK_OK },
            { line: 1, at: secondAt + 6, color: MARK_BAD },
          ]}
          out={hypoAt - 6}
        />
        <Note at={startsAt} x={LIST_X + 370} y={B + 46} out={hypoAt - 6}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            <Py text="[1, 2]" size={24} ink={ACCENT_INK} /> starts before <Py text="[3, 4]" size={24} />, the interval it was compared with
          </span>
        </Note>

        {/* ── The hypothesis, tested from outside ── */}
        <Note at={hypoAt} x={LIST_X} y={B} out={step4 - 6}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>
            hypothesis: the loop assumes its input is <Mark at={sortedAt + 10}>sorted</Mark>
          </span>
        </Note>
        <Note at={beforeAt} x={LIST_X} y={B + 56} out={step4 - 6}>
          <span style={{ display: "flex", gap: 16, alignItems: "center", whiteSpace: "nowrap", fontSize: 22 }}>
            <Code line={`merge_intervals(sorted(${DEBUG.repro.arg}))`} size={22} />
            <span style={note(22, INK_SOFT)}>returns</span>
            <Py text={DEBUG.hypothesis.repr ?? ""} size={22} ink={OK_INK} />
            <Verdict ok at={passesAt} size={24} />
          </span>
        </Note>

        {/* ── Step 4: the symptom patched, then the cause ── */}
        <Note at={emptyAt + 6} x={LIST_X} y={B} out={causeAt - 4}>
          <span style={{ whiteSpace: "nowrap", ...note(26, ACCENT_INK) }}>
            three intervals in, <Py text={DEBUG.symptomReport.repr ?? ""} size={26} ink={ACCENT_INK} /> out,{" "}
            <FadeIn at={noErrorAt}>
              <Mark at={noErrorAt + 4} color={MARK_BAD}>
                and no error at all
              </Mark>
            </FadeIn>
          </span>
        </Note>
        <Note at={rerunAt} x={LIST_X} y={B} out={step5 - 6}>
          <span style={{ display: "flex", gap: 16, alignItems: "center", whiteSpace: "nowrap", fontSize: 22 }}>
            <span style={note(22, INK_SOFT)}>rerun</span>
            {DEBUG.causeTests.tests.map((t, i) => (
              <span key={t.name} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 21 }}>
                <Verdict ok={t.ok} at={allAt + 12 + i * 6} size={24} />
                <Code line={t.name} size={21} />
              </span>
            ))}
          </span>
        </Note>

        {/* ── Step 5: say why ── */}
        {[
          { at: step5 + 4, q: "What was wrong?", a: "the loop relied on sorted input that nothing guaranteed", aAt: hereAt },
          { at: whyAt, q: "Why is the fix right?", a: "the sort guarantees it", aAt: guaranteesAt },
          { at: elseAt, q: "What else might share the flaw?", a: "", aAt: elseAt },
        ].map((r, i) => (
          <Note key={i} at={r.at} x={LIST_X} y={B + i * 44} out={aiAt - 6}>
            <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
              <span style={{ fontWeight: 650 }}>{r.q}</span>
              {r.a ? (
                <FadeIn at={r.aAt}>
                  {" "}
                  <span style={{ color: OK_INK }}>{r.a}</span>
                </FadeIn>
              ) : null}
            </span>
          </Note>
        ))}

        {/* ── With an assistant ── */}
        <Note at={aiAt} x={LIST_X} y={B - 4} out={pastAt - 6}>
          <span style={{ ...label(21, INK_SOFT), whiteSpace: "nowrap" }}>ask an assistant</span>
        </Note>
        {[
          { at: doesAt, text: "What does this function do?" },
          { at: couldAt, text: "What could make it return an interval that ends before it starts?" },
        ].map((b, i) => (
          <Note key={i} at={b.at} x={LIST_X} y={B + 34 + i * 60} out={pastAt - 6}>
            <span
              style={{
                ...note(23, INK),
                display: "inline-block",
                padding: "6px 16px 8px",
                background: LISTING_PAPER,
                borderLeft: `4px solid ${ds("blue", 300)}`,
                borderRadius: 4,
                whiteSpace: "nowrap",
              }}
            >
              {b.text}
            </span>
          </Note>
        ))}

        {/* ── What else shares the flaw: the tests ── */}
        <TestGrid
          x={LIST_X}
          top={B - 10}
          rowH={40}
          width={830}
          headAt={testsAt}
          cols={[
            { title: "before the fix", x: LIST_X + 600 },
            { title: "after", x: LIST_X + 760 },
          ]}
          rows={DEBUG.keptBefore.tests.map((t, i) => {
            const isRepro = t.name === "test_reproduction";
            const at = isRepro ? keepAt : testsAt + 4 + i * 4;
            return {
              name: <Code line={t.name} size={20} />,
              at,
              cells: [
                { ok: t.ok, at: isRepro ? keepAt + 6 : bothAt + i * 4 },
                { ok: DEBUG.keptAfter.tests[i].ok, at: isRepro ? keepAt + 12 : bothAt + 10 + i * 4 },
              ],
              markAt: isRepro ? undefined : neitherAt + i * 3,
            };
          })}
        />
        <Note at={neitherAt + 4} x={LIST_X + 860} y={B + 54}>
          <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>neither tested the order</span>
        </Note>
        <Note at={keepAt + 14} x={LIST_X + 860} y={B + 114}>
          <span style={{ ...note(23, ACCENT_INK), whiteSpace: "nowrap" }}>
            got <Py text={DEBUG.keptBefore.tests[2].got} size={23} ink={ACCENT_INK} />
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
