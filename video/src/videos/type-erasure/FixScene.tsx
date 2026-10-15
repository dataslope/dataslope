import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useNarration } from "../../narration/NarrationContext";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, body, INK, INK_SOFT, note } from "../../editorial/style";
import { Ink, Note } from "../../editorial/ui";
import { MONO } from "../../theme/fonts";
import { GUARD_ELSE, GUARD_INSIDE, GUARD_RUN, GUARD_TESTS, GUARD_TS, GUARD_UNKNOWN, UNGUARDED_ERROR } from "./data";
import { Fig, FileTab, Listing, listingGeometry, lineTop, Mono, OK_INK, Terminal, terminalHeight } from "./kit";

const LEFT = 110;
const LIST_W = 830;
const NOTE_X = 1010;
const NOTE_W = 800;
const SIZE = 24;
/** Layout rows, before `y()`. */
const FIG_Y = 112;
const TAB_Y = 160;
const LIST_Y = 204;

/**
 * The fix: parse into `unknown`, which tsc will not let you use unchecked,
 * then test each field in a type predicate. Inside the check the value is a
 * User; the null name takes the else branch. Real file, real error, real
 * output (data.ts).
 */
export const FixScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  const start = n.beat("fix").from;
  const runsAt = n.word("fix", "actually runs");
  const unknownAt = n.word("fix", "unknown");
  const notLetAt = n.word("fix", "will not let you");
  const fieldAt = n.word("narrow", "each field");
  const insideAt = n.word("narrow", "Inside the check");
  const userAt = n.word("narrow", "a User");
  const otherAt = n.word("narrow", "other branch");

  const top = y(LIST_Y);
  const g = listingGeometry(SIZE);
  const rowMid = (i: number) => lineTop(top, i, SIZE) + g.lineH / 2;
  const testsTop = lineTop(top, GUARD_TESTS[0], SIZE);
  const testsBottom = lineTop(top, GUARD_TESTS[GUARD_TESTS.length - 1] + 1, SIZE);
  const bracket = ease(frame, fieldAt - 2, 12);
  const termH = terminalHeight(2, 22);

  return (
    <AbsoluteFill>
      <Fig n="4" at={start - 12} x={LEFT} y={y(FIG_Y)}>
        Parse into <Mono>unknown</Mono>, then check
      </Fig>
      <FileTab at={start - 8} x={LEFT} y={y(TAB_Y)} name="guard.ts" />
      <Listing
        lines={GUARD_TS}
        x={LEFT}
        top={top}
        width={LIST_W}
        size={SIZE}
        at={start - 8}
        lineAt={GUARD_TS.map((_, i) => start - 4 + i * 2)}
        marks={[
          { ...GUARD_UNKNOWN, at: unknownAt - 2 },
          ...GUARD_TESTS.map((line, k) => ({ line, at: fieldAt + k * 4 })),
          { line: GUARD_INSIDE, at: insideAt },
          { line: GUARD_ELSE, at: otherAt - 2 },
        ]}
      />

      <Ink at={runsAt - 4} dur={18} style={{ left: NOTE_X, top: lineTop(top, 0, SIZE) - 6, width: NOTE_W }}>
        <span style={{ ...body(40, true), color: INK }}>A check that actually runs.</span>
      </Ink>

      {/* The tests: a bracket over their three lines, and what they do. */}
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, opacity: bracket }}>
        <path
          d={`M${NOTE_X - 34},${testsTop + 6} h10 V${testsTop + 6 + (testsBottom - testsTop - 12) * bracket} h-10`}
          fill="none"
          stroke={INK_SOFT}
          strokeWidth={1.6}
        />
      </svg>
      <Note at={fieldAt + 4} x={NOTE_X} y={(testsTop + testsBottom) / 2 - 30} width={NOTE_W}>
        <div style={note(22, INK)}>Each test runs at runtime, on the real value.</div>
        <div style={{ ...note(20, INK_SOFT), marginTop: 6 }}>
          When <Mono>isUser</Mono> returns true, TypeScript treats <Mono>x</Mono> as a <Mono>User</Mono>.
        </div>
      </Note>

      <Note at={notLetAt} x={NOTE_X} y={rowMid(GUARD_UNKNOWN.line) - 34} width={NOTE_W}>
        <div style={note(22, INK)}>
          Use <Mono>data</Mono> before the check, and tsc says:
        </div>
        <div style={{ fontFamily: MONO, fontSize: 20, color: ACCENT_INK, fontWeight: 600, marginTop: 8, whiteSpace: "nowrap" }}>
          error {UNGUARDED_ERROR.code}: {UNGUARDED_ERROR.message}
        </div>
      </Note>

      <Note at={insideAt + 4} x={NOTE_X} y={rowMid(GUARD_INSIDE) - 15} width={NOTE_W}>
        <div style={note(22, INK)}>
          Here <Mono>data</Mono> is a{" "}
          <span style={{ color: OK_INK, fontWeight: 650, opacity: 0.4 + 0.6 * ease(frame, userAt, 10) }}>
            <Mono>User</Mono>
          </span>
          , so tsc allows <Mono>data.name</Mono>.
        </div>
      </Note>

      <Terminal
        x={NOTE_X}
        top={rowMid(GUARD_ELSE) - termH / 2 + 12}
        width={NOTE_W}
        at={otherAt - 6}
        rows={[
          { kind: "cmd", text: "node guard.js", at: otherAt - 4 },
          { kind: "out", text: GUARD_RUN, at: otherAt + 6 },
        ]}
      />
    </AbsoluteFill>
  );
};
