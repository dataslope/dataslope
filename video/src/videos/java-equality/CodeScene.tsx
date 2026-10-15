import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Illustration } from "../../components/Illustration";
import { bob, ease, pop } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, body, headline, INK, INK_SOFT, label, note } from "../../editorial/style";
import { Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { FIG1, ILLUSTRATIONS, JAVA_MAJOR, VIDEO } from "./data";
import { colOf, Fig, lineTop, Listing, listingGeometry, listingHeight, Marked, markP, Mono, Out } from "./kit";

const LEFT = 120;
const SIZE = 34;
const LIST_W = 820;
const LIST_TOP = 356;
/** The two columns beside the listing: what each line printed, and the
 *  question its comparison asks. */
const OUT_X = LEFT + LIST_W + 50;
const ASK_X = OUT_X + 160;

const L = FIG1.lines;
/** The println lines, by what they compare. */
const SAME_LINE = L.findIndex((l) => l.includes("a == b"));
const EQUALS_LINE = L.findIndex((l) => l.includes("a.equals(b)"));
/** The blank line between the declarations and the printlns holds the
 *  columns' headings. */
const HEAD_LINE = L.indexOf("");

/**
 * Hook to the two questions: two strings that spell "hi", what == and
 * .equals() print for them, and what each one is asking.
 */
export const CodeScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = useNarration();
  const { y } = useLayout();

  // The page opens just ahead of the first word, so a longer lead-in moves it too.
  const open = Math.max(0, n.beat("hook").from - 13);
  const stringsAt = n.word("hook", "two Java strings");
  const lettersAt = n.word("hook", "same two letters");
  const verdictFrom = n.beat("verdict").from;
  const eqAt = n.word("verdict", "equals equals");
  const falseAt = n.word("verdict", "false");
  const dotAt = n.word("verdict", "dot equals");
  const trueAt = n.word("verdict", "true");
  const questionsAt = n.word("questions", "different questions");
  const sameObjectAt = n.word("questions", "is this");
  const objectAt = n.word("questions", "same object");
  const contentsAskAt = n.word("questions", "do they");
  const contentsAt = n.word("questions", "same contents");

  const top = y(LIST_TOP);
  const g = listingGeometry(SIZE);
  /** Centre a side-column entry on listing line `i`. */
  const row = (i: number): React.CSSProperties => ({
    top: lineTop(top, i, SIZE),
    height: g.lineH,
    display: "flex",
    alignItems: "center",
    whiteSpace: "nowrap",
  });
  const mugs = pop(frame, lettersAt - 8, fps, 16);
  const hi0 = colOf(L[0], '"hi"');
  const hi1 = colOf(L[1], '"hi"');

  return (
    <AbsoluteFill>
      <Ink at={open} dur={14} style={{ left: LEFT + 4, top: y(112) }}>
        <span style={label(21, ACCENT_INK)}>Comparing strings in Java</span>
      </Ink>
      <Ink
        at={open + 2}
        dur={22}
        style={{ left: LEFT - 2, top: y(150), ...headline(88), whiteSpace: "nowrap", display: "flex", gap: "0.24em" }}
      >
        <span>Same letters,</span>
        <span style={{ position: "relative", ...headline(88, true) }}>
          two answers.
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
              strokeDasharray={`${ease(frame, trueAt, 14)} 1`}
              opacity={frame >= trueAt ? 1 : 0}
            />
          </svg>
        </span>
      </Ink>
      {ILLUSTRATIONS ? (
        <Illustration
          video={VIDEO}
          id="je-twin-mugs"
          style={{
            position: "absolute",
            left: 1400,
            top: y(84),
            width: 400,
            height: 250,
            opacity: mugs,
            transform: `translateY(${bob(frame, 4, 110) + (1 - mugs) * 26}px)`,
          }}
        />
      ) : null}

      <Fig n="1" at={stringsAt - 8} x={LEFT} y={y(296)}>
        Two strings that both spell <Mono>&quot;hi&quot;</Mono>
      </Fig>
      <Listing
        lines={L}
        x={LEFT}
        top={top}
        width={LIST_W}
        size={SIZE}
        at={stringsAt - 6}
        lineAt={L.map((_, i) => (i === SAME_LINE ? eqAt - 6 : i === EQUALS_LINE ? dotAt - 6 : stringsAt - 2 + i * 6))}
        marks={[
          { line: 0, col: hi0, chars: 4, at: lettersAt - 2, out: verdictFrom - 4 },
          { line: 1, col: hi1, chars: 4, at: lettersAt + 4, out: verdictFrom - 4 },
          { line: SAME_LINE, col: colOf(L[SAME_LINE], "a == b"), chars: 6, at: eqAt },
          { line: EQUALS_LINE, col: colOf(L[EQUALS_LINE], "a.equals(b)"), chars: 11, at: dotAt },
        ]}
      />

      {/* What each println printed, and the question behind it. */}
      <Ink at={falseAt - 8} dur={12} style={{ ...row(HEAD_LINE), left: OUT_X }}>
        <span style={label(21, INK_SOFT)}>Prints</span>
      </Ink>
      <Ink at={questionsAt - 2} dur={14} style={{ ...row(HEAD_LINE), left: ASK_X }}>
        <span style={label(21, INK_SOFT)}>The question it asks</span>
      </Ink>
      {FIG1.prints.map((v, i) =>
        v === null ? null : (
          <Ink key={i} at={(i === SAME_LINE ? falseAt : trueAt) - 2} dur={12} style={{ ...row(i), left: OUT_X }}>
            <Out value={v} size={SIZE} />
          </Ink>
        ),
      )}
      <Ink at={sameObjectAt - 2} dur={18} style={{ ...row(SAME_LINE), left: ASK_X }}>
        <span style={{ ...body(36, true), color: INK }}>
          is this the <Marked p={markP(frame, objectAt)}>same object</Marked>?
        </span>
      </Ink>
      <Ink at={contentsAskAt - 2} dur={18} style={{ ...row(EQUALS_LINE), left: ASK_X }}>
        <span style={{ ...body(36, true), color: INK }}>
          do they hold the <Marked p={markP(frame, contentsAt)}>same contents</Marked>?
        </span>
      </Ink>

      <Ink at={trueAt + 8} dur={14} style={{ left: LEFT, top: top + listingHeight(L.length, SIZE) + 28 }}>
        <span style={note(20, INK_SOFT)}>Printed by this code, run on OpenJDK {JAVA_MAJOR}.</span>
      </Ink>
    </AbsoluteFill>
  );
};
