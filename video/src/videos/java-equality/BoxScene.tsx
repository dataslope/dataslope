import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Illustration } from "../../components/Illustration";
import { bob, ease, pop } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, headline, INK_SOFT, label, note } from "../../editorial/style";
import { Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { FIG3, ILLUSTRATIONS, JAVA_MAJOR, VIDEO } from "./data";
import { colOf, Fig, lineTop, Listing, listingGeometry, listingHeight, Out } from "./kit";

const LEFT = 120;
const SIZE = 36;
const LIST_W = 820;
const LIST_TOP = 392;
const OUT_X = LEFT + LIST_W + 50;

const L = FIG3.lines;
const BOX_127 = L.findIndex((l) => l.includes("127"));
const SAME_127 = L.findIndex((l) => l.includes("a == b"));
const BOX_128 = L.findIndex((l) => l.includes("128"));
const SAME_128 = L.findIndex((l) => l.includes("x == y"));
const EQUALS_128 = L.findIndex((l) => l.includes("x.equals(y)"));

/**
 * Fig. 3: the same comparison on Integers. Two boxings of 127 are one
 * object; two boxings of 128 are two.
 */
export const BoxScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = useNarration();
  const { y } = useLayout();

  const start = n.beat("boxing").from;
  const trapAt = n.word("boxing", "sharper trap");
  const boxAt = n.word("boxing", "Box");
  const n127At = n.word("boxing", "one hundred twenty-seven");
  const intsAt = n.word("boxing", "two Integers");
  const eqAt = n.word("boxing", "equals equals");
  const trueAt = n.word("boxing", "true");
  const box128At = n.word("boxing-128", "Box");
  const n128At = n.word("boxing-128", "one hundred twenty-eight");
  const falseAt = n.word("boxing-128", "false");
  const dotAt = n.word("boxing-128", "Dot equals");
  const stillTrueAt = n.word("boxing-128", "true");

  const top = y(LIST_TOP);
  const g = listingGeometry(SIZE);
  const row = (i: number): React.CSSProperties => ({
    top: lineTop(top, i, SIZE),
    height: g.lineH,
    display: "flex",
    alignItems: "center",
    whiteSpace: "nowrap",
  });
  const shelf = pop(frame, intsAt - 6, fps, 16);
  const outAt: Record<number, number> = {
    [SAME_127]: trueAt,
    [SAME_128]: falseAt,
    [EQUALS_128]: stillTrueAt,
  };
  const lineAt = L.map((_, i) =>
    i === BOX_127
      ? boxAt - 4
      : i === SAME_127
        ? eqAt - 6
        : i === BOX_128
          ? box128At - 4
          : i === SAME_128
            ? n128At + 6
            : dotAt - 6,
  );
  const span127 = L[BOX_127].slice(colOf(L[BOX_127], "127"));
  const span128 = L[BOX_128].slice(colOf(L[BOX_128], "128"));

  return (
    <AbsoluteFill>
      <Ink at={start - 5} dur={14} style={{ left: LEFT + 4, top: y(112) }}>
        <span style={label(21, ACCENT_INK)}>Comparing Integers</span>
      </Ink>
      <Ink
        at={trapAt - 6}
        dur={22}
        style={{
          left: LEFT - 2,
          top: y(150),
          ...headline(88),
          whiteSpace: "nowrap",
          display: "flex",
          gap: "0.24em",
        }}
      >
        <span>True at 127,</span>
        <span style={{ position: "relative", ...headline(88, true) }}>
          false at 128.
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
              strokeDasharray={`${ease(frame, falseAt, 14)} 1`}
              opacity={frame >= falseAt ? 1 : 0}
            />
          </svg>
        </span>
      </Ink>

      <Fig n="3" at={boxAt - 8} x={LEFT} y={y(330)}>
        Two boxings of 127, then two of 128
      </Fig>
      <Ink at={trueAt - 8} dur={12} style={{ left: OUT_X, top: y(330) }}>
        <span style={label(21, INK_SOFT)}>Prints</span>
      </Ink>
      <Listing
        lines={L}
        x={LEFT}
        top={top}
        width={LIST_W}
        size={SIZE}
        at={boxAt - 6}
        lineAt={lineAt}
        marks={[
          {
            line: BOX_127,
            col: colOf(L[BOX_127], "127"),
            chars: span127.length - 1,
            at: n127At,
          },
          {
            line: SAME_127,
            col: colOf(L[SAME_127], "a == b"),
            chars: 6,
            at: eqAt,
          },
          {
            line: BOX_128,
            col: colOf(L[BOX_128], "128"),
            chars: span128.length - 1,
            at: n128At,
          },
          {
            line: SAME_128,
            col: colOf(L[SAME_128], "x == y"),
            chars: 6,
            at: falseAt - 6,
          },
          {
            line: EQUALS_128,
            col: colOf(L[EQUALS_128], "x.equals(y)"),
            chars: 11,
            at: dotAt,
          },
        ]}
      />
      {FIG3.prints.map((v, i) =>
        v === null ? null : (
          <Ink key={i} at={outAt[i] - 2} dur={12} style={{ ...row(i), left: OUT_X }}>
            <Out value={v} size={SIZE} />
          </Ink>
        ),
      )}
      <Ink at={stillTrueAt + 8} dur={14} style={{ left: LEFT, top: top + listingHeight(L.length, SIZE) + 28 }}>
        <span style={note(20, INK_SOFT)}>OpenJDK {JAVA_MAJOR}, default settings.</span>
      </Ink>

      {ILLUSTRATIONS ? (
        <Illustration
          video={VIDEO}
          id="je-cubby-shelf"
          style={{
            position: "absolute",
            left: 1330,
            top: y(400),
            width: 420,
            height: 380,
            opacity: shelf,
            transform: `translateY(${bob(frame, 4, 110) + (1 - shelf) * 26}px)`,
          }}
        />
      ) : null}
    </AbsoluteFill>
  );
};
