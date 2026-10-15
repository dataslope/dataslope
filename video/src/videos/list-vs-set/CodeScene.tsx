import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Illustration } from "../../components/Illustration";
import { bob, ease, pop } from "../../components/motion";
import { useNarration } from "../../narration/NarrationContext";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, body, fmt, HAIRLINE, headline, INK_SOFT, label, note } from "../../editorial/style";
import { Ink, Note } from "../../editorial/ui";
import { ILLUSTRATIONS, MILLION, RATIO, VIDEO } from "./data";
import { Code, Fig, LIST_INK, Listing, lineTop, listingGeometry, SET_INK } from "./kit";

const LINES = [
  "big_list = list(range(1_000_000))",
  "big_set = set(big_list)",
  "",
  "999_999 in big_list",
  "999_999 in big_set",
] as const;
const SIZE = 34;
const LIST_X = 120;
const LIST_W = 820;
const LIST_TOP = 336;
/** The two columns the answers and the times land in, beside the listing. */
const ANSWER_X = LIST_X + LIST_W + 56;
const TIME_X = ANSWER_X + 200;
const RIGHT = 1800;

/**
 * Hook to "same answer": the lesson's own snippet, the two lookups it times,
 * what each returned and how long each took, and the ratio.
 */
export const CodeScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = useNarration();
  const { y } = useLayout();

  // The page opens just ahead of the first word, so a longer lead-in moves it too.
  const open = Math.max(0, n.beat("hook").from - 13);
  const twoAt = n.word("hook", "two lines");
  const questionAt = n.word("hook", "same question");
  const numberAt = n.word("hook", "number");
  const bothAt = n.word("answer", "Both");
  const yesAt = n.word("answer", "yes");
  const listAt = n.word("answer", "list takes");
  const fiveAt = n.word("answer", "five");
  const twentyAt = n.word("set-time", "twenty-three");
  const timesAt = n.word("ratio", "two hundred thousand");
  const fasterAt = n.word("ratio", "faster");
  const sameAt = n.word("ratio", "same answer");

  const top = y(LIST_TOP);
  const g = listingGeometry(SIZE);
  /** Centre a row of the side table on listing line `i`. */
  const row = (i: number): React.CSSProperties => ({
    position: "absolute",
    top: lineTop(top, i, SIZE),
    height: g.lineH,
    display: "flex",
    alignItems: "center",
  });
  const listingBottom = lineTop(top, LINES.length, SIZE) + g.padY;
  const watch = pop(frame, fiveAt - 8, fps, 15);
  const ratio = Math.round(RATIO / 1000) * 1000;

  return (
    <AbsoluteFill>
      <Ink at={open} dur={14} style={{ left: 124, top: y(112) }}>
        <span style={label(21, ACCENT_INK)}>Membership tests in Python</span>
      </Ink>
      <Ink at={open + 2} dur={22} style={{ left: 118, top: y(152), ...headline(88), whiteSpace: "nowrap", display: "flex", gap: "0.24em" }}>
        <span>Same question,</span>
        <span style={{ position: "relative", ...headline(88, true) }}>
          two speeds.
          {/* Sized in em and to the words, so it underlines them in any face. */}
          <svg
            viewBox="0 0 400 30"
            style={{
              position: "absolute",
              left: -4,
              top: "1.0em",
              width: "calc(100% + 8px)",
              height: "auto",
              overflow: "visible",
            }}
          >
            <path
              d="M4,16 C90,8 220,6 394,13"
              fill="none"
              stroke={ACCENT}
              strokeWidth={5}
              strokeLinecap="round"
              pathLength={1}
              strokeDasharray={`${ease(frame, fasterAt - 2, 14)} 1`}
              opacity={frame >= fasterAt - 2 ? 1 : 0}
            />
          </svg>
        </span>
      </Ink>
      {ILLUSTRATIONS ? (
        <Illustration
          video={VIDEO}
          id="lvs-stopwatch"
          style={{
            position: "absolute",
            left: 1556,
            top: y(92),
            width: 236,
            height: 236,
            opacity: watch,
            transformOrigin: "50% 60%",
            transform: `translateY(${bob(frame, 4, 100) + (1 - watch) * 26}px) rotate(${(1 - watch) * -18 + Math.sin(frame / 40) * 1.5}deg)`,
          }}
        />
      ) : null}

      <Fig n="1" at={open + 6} x={LIST_X} y={y(276)}>
        The lesson&apos;s lookup, on a million numbers
      </Fig>
      <Listing
        lines={LINES}
        x={LIST_X}
        top={top}
        width={LIST_W}
        size={SIZE}
        at={open + 4}
        lineAt={[open + 8, open + 14, 0, twoAt, twoAt + 6]}
        marks={[
          { line: 3, at: questionAt - 2 },
          { line: 4, at: questionAt + 4 },
        ]}
      />
      {/* "Is this number in here?": the value asked for, underlined on both lines. */}
      {[3, 4].map((i, k) => {
        const u = ease(frame, numberAt - 2 + k * 4, 10);
        if (u <= 0) return null;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: LIST_X + g.gutter + SIZE * 0.77,
              top: lineTop(top, i, SIZE) + g.lineH * 0.8,
              width: `${7 * 0.6 * u}em`,
              fontSize: SIZE,
              height: 4,
              borderRadius: 2,
              background: ACCENT,
            }}
          />
        );
      })}

      {/* The side table: what each line answered, and how long it took. */}
      <Ink at={bothAt - 4} dur={14} style={{ ...row(2), left: ANSWER_X, width: RIGHT - ANSWER_X, gap: 0 }}>
        <span style={{ ...label(21, INK_SOFT), width: TIME_X - ANSWER_X }}>Answer</span>
        <span style={{ ...label(21, INK_SOFT), opacity: ease(frame, listAt - 6, 10) }}>Time per lookup</span>
      </Ink>
      <div
        style={{
          position: "absolute",
          left: ANSWER_X,
          top: lineTop(top, 3, SIZE) - 1,
          width: (RIGHT - ANSWER_X) * ease(frame, bothAt - 2, 16),
          height: 1,
          background: HAIRLINE,
        }}
      />
      {[3, 4].map((i, k) => (
        <Ink key={i} at={(k === 0 ? bothAt : yesAt) - 2} dur={12} style={{ ...row(i), left: ANSWER_X }}>
          <Code line="True" size={SIZE} />
        </Ink>
      ))}
      <Ink at={fiveAt - 4} dur={14} style={{ ...row(3), left: TIME_X }}>
        <span style={{ ...headline(50), color: LIST_INK, fontVariantNumeric: "tabular-nums lining-nums" }}>
          {fmt(MILLION.listMs)} ms
        </span>
      </Ink>
      <Ink at={twentyAt - 4} dur={14} style={{ ...row(4), left: TIME_X }}>
        <span style={{ ...headline(50), color: SET_INK, fontVariantNumeric: "tabular-nums lining-nums" }}>
          {fmt(MILLION.setNs, 1)} ns
        </span>
      </Ink>
      <Note at={twentyAt + 10} x={TIME_X} y={listingBottom + 8} from="up">
        <span style={note(20, INK_SOFT)}>timeit, best of 30 runs, CPython 3.13</span>
      </Note>

      {/* The ratio, on one line: the number, then what it means. */}
      <div style={{ position: "absolute", left: LIST_X, top: y(742), display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: "0.5em", whiteSpace: "nowrap", fontSize: 34 }}>
          <Ink at={timesAt - 4} dur={18} style={{ position: "relative" }}>
            <span style={{ ...headline(116), fontVariantNumeric: "tabular-nums lining-nums" }}>
              {ratio.toLocaleString("en-US")}×
            </span>
          </Ink>
          <Ink at={fasterAt - 2} dur={16} style={{ position: "relative" }}>
            <span style={{ ...body(40, true), color: SET_INK }}>faster,</span>
          </Ink>
          <Ink at={sameAt - 2} dur={16} style={{ position: "relative" }}>
            <span style={{ ...body(40, true) }}>for the same answer.</span>
          </Ink>
        </div>
        <Ink at={timesAt + 8} dur={14} style={{ position: "relative" }}>
          <span style={note(21, INK_SOFT)}>
            {fmt(MILLION.listMs)} ms ÷ {fmt(MILLION.setNs, 1)} ns, rounded to the nearest thousand
          </span>
        </Ink>
      </div>
    </AbsoluteFill>
  );
};
