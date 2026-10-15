import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Illustration } from "../../components/Illustration";
import { bob, ease, pop } from "../../components/motion";
import { useNarration } from "../../narration/NarrationContext";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, body, headline, INK, INK_SOFT, label, note } from "../../editorial/style";
import { Ink, Note } from "../../editorial/ui";
import { commas, FORTY, ILLUSTRATIONS, VIDEO } from "./data";
import { Fig, Listing, listingHeight, Mono, NAIVE_INK } from "./kit";

export const NAIVE_LINES = [
  "long long fib(int n) {",
  "  if (n <= 1)",
  "    return n;",
  "  return fib(n - 1) + fib(n - 2);",
  "}",
] as const;
const SIZE = 34;
const LIST_X = 120;
const LIST_W = 860;
const LIST_TOP = 372;
/** The column beside the listing: what fib(40) returned, and what it cost. */
const SIDE_X = 1090;

/**
 * Hook: the lesson's naive fib, straight from the definition, and the one
 * number that says what is wrong with it.
 */
export const CodeScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = useNarration();
  const { y } = useLayout();

  // The page opens just ahead of the first word, so a longer lead-in moves it too.
  const open = Math.max(0, n.beat("hook").from - 13);
  const fibAt = n.word("hook", "Fibonacci");
  const definitionAt = n.word("hook", "definition");
  const correctAt = n.word("calls", "correct");
  const butAt = n.word("calls", "But");
  const fortyAt = n.word("calls", "fib of forty");
  const millionAt = n.word("calls", "three hundred");
  const callsAt = n.word("calls", "calls");
  const rabbits = pop(frame, fibAt - 4, fps, 16);

  const top = y(LIST_TOP);
  const listingBottom = top + listingHeight(NAIVE_LINES.length, SIZE);

  return (
    <AbsoluteFill>
      <Ink at={open} dur={14} style={{ left: 124, top: y(112) }}>
        <span style={label(21, ACCENT_INK)}>Recursion in C++</span>
      </Ink>
      <Ink at={open + 2} dur={22} style={{ left: 118, top: y(152), ...headline(88), whiteSpace: "nowrap", display: "flex", gap: "0.24em" }}>
        <span>Correct, but</span>
        <span style={{ position: "relative", ...headline(88, true) }}>
          forgetful.
          {/* Sized in em and to the words, so it underlines them in any face. */}
          <svg
            viewBox="0 0 400 30"
            style={{ position: "absolute", left: -4, top: "1.0em", width: "calc(100% + 8px)", height: "auto", overflow: "visible" }}
          >
            <path
              d="M4,16 C90,8 220,6 394,13"
              fill="none"
              stroke={ACCENT}
              strokeWidth={5}
              strokeLinecap="round"
              pathLength={1}
              strokeDasharray={`${ease(frame, butAt - 2, 14)} 1`}
              opacity={frame >= butAt - 2 ? 1 : 0}
            />
          </svg>
        </span>
      </Ink>
      {ILLUSTRATIONS ? (
        <Illustration
          video={VIDEO}
          id="recursion-fib-rabbits"
          style={{
            position: "absolute",
            left: 1500,
            top: y(96),
            width: 290,
            height: 290,
            opacity: rabbits,
            transform: `translateY(${bob(frame, 4, 100) + (1 - rabbits) * 26}px)`,
          }}
        />
      ) : null}

      <Fig n="1" at={open + 6} x={LIST_X} y={y(316)}>
        The lesson&apos;s <Mono>fib</Mono>, straight from the definition
      </Fig>
      <Listing
        lines={NAIVE_LINES}
        x={LIST_X}
        top={top}
        width={LIST_W}
        size={SIZE}
        at={open + 4}
        lineAt={[open + 8, open + 12, open + 15, open + 18, open + 21]}
        marks={[{ line: 3, at: definitionAt - 2, from: 9, chars: 23 }]}
      />
      <Note at={definitionAt + 6} x={LIST_X} y={listingBottom + 22} from="up">
        <span style={note(21, INK_SOFT)}>Every call with n above 1 makes two more calls.</span>
      </Note>

      {/* fib(40): the answer, then the bill. */}
      <div style={{ position: "absolute", left: SIDE_X, top: top + 6, display: "flex", flexDirection: "column", gap: 30 }}>
        <Ink at={correctAt - 4} dur={14} style={{ position: "relative" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: "0.45em", ...label(24, INK_SOFT) }}>
            <Mono color={INK}>fib(40)</Mono>
            <span>returns</span>
          </div>
          <div style={{ ...headline(60), marginTop: 10, fontVariantNumeric: "tabular-nums lining-nums" }}>
            {commas(FORTY.value)}
          </div>
        </Ink>
        <Ink at={fortyAt - 2} dur={14} style={{ position: "relative" }}>
          <div style={label(24, INK_SOFT)}>after making</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "0.3em", marginTop: 8, whiteSpace: "nowrap" }}>
            <span
              style={{
                ...headline(104),
                color: NAIVE_INK,
                fontVariantNumeric: "tabular-nums lining-nums",
                opacity: ease(frame, millionAt - 4, 12),
              }}
            >
              {commas(FORTY.naiveCalls)}
            </span>
            <span style={{ ...body(42, true), color: INK, opacity: ease(frame, callsAt - 4, 10) }}>calls</span>
          </div>
        </Ink>
      </div>
      <Note at={callsAt + 8} x={SIDE_X} y={listingBottom + 22} from="up" width={680}>
        <span style={note(21, INK_SOFT)}>Counted by a copy of fib that adds one to a counter on every call.</span>
      </Note>
    </AbsoluteFill>
  );
};
