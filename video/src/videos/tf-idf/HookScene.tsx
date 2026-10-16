import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Illustration } from "../../components/Illustration";
import { bob, ease, pop } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, body, headline, HIGHLIGHT, INK, INK_SOFT, label, note } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { COUNTS, DOCS, ILLUSTRATIONS, THE, VIDEO } from "./data";
import { slip } from "./parts";

const SLIP_X = 120;
const SLIP_Y = (i: number) => 404 + i * 112;

/** How often "the" appears in each document (the same in all three), and
 *  the most any other word appears in one. */
const THE_COUNTS = [...new Set(COUNTS.map((row) => row[THE]))];
const OTHER_MAX = Math.max(...COUNTS.flatMap((row) => row.filter((_, j) => j !== THE)));
const times = (k: number) => (k === 1 ? "once" : k === 2 ? "twice" : `${k} times`);

/**
 * Hook: the lesson's three documents, and the one word every one of them
 * uses most.
 */
export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = useNarration();
  const { y } = useLayout();
  const figAt = n.word("hook", "three tiny");
  const docsAt = n.word("hook", "documents");
  const everyAt = n.word("hook", "In every one");
  const commonAt = n.word("hook", "most common");
  const cat = pop(frame, docsAt + 4, fps, 16);

  return (
    <AbsoluteFill>
      <Ink at={2} dur={20} style={{ left: 92, top: y(110), ...headline(88), whiteSpace: "nowrap" }}>
        The most common word
      </Ink>
      <Ink
        at={10}
        dur={20}
        style={{ left: 92, top: y(204), ...headline(88, true), color: ACCENT_INK, whiteSpace: "nowrap" }}
      >
        says the least.
      </Ink>

      <FigLabel n="1" title="Three tiny documents, from the lesson" at={figAt - 6} x={SLIP_X} y={y(344)} />

      {DOCS.map((words, i) => {
        let theSeen = 0;
        return (
          <Ink
            key={i}
            at={docsAt - 4 + i * 6}
            dur={16}
            style={{ left: SLIP_X, top: y(SLIP_Y(i)), display: "flex", alignItems: "center", gap: 26 }}
          >
            <span style={{ ...label(21, INK_SOFT), width: 82, whiteSpace: "nowrap" }}>Doc {i + 1}</span>
            <span style={{ ...slip, padding: "14px 30px 16px", ...body(46), color: INK, whiteSpace: "nowrap" }}>
              {words.map((w, k) => {
                const isThe = w === "the";
                const at = isThe ? everyAt - 2 + i * 5 + theSeen++ * 3 : 0;
                const p = isThe ? ease(frame, at, 10) : 0;
                return (
                  <React.Fragment key={k}>
                    {k > 0 ? " " : null}
                    <span
                      style={{
                        // A highlighter stroke laid on behind the word.
                        background: `linear-gradient(90deg, ${HIGHLIGHT} ${p * 100}%, transparent ${p * 100}%)`,
                        padding: "0 0.08em",
                        margin: "0 -0.08em",
                      }}
                    >
                      {w}
                    </span>
                  </React.Fragment>
                );
              })}
            </span>
          </Ink>
        );
      })}

      <Note at={commonAt + 6} x={SLIP_X} y={y(SLIP_Y(2) + 126)}>
        <span style={note(22, INK_SOFT)}>
          In every document, <i>the</i> appears {THE_COUNTS.map(times).join(" or ")}. No other word appears more
          than {times(OTHER_MAX)}.
        </span>
      </Note>

      {ILLUSTRATIONS ? (
        <Illustration
          video={VIDEO}
          id="tfidf-cat-mat"
          style={{
            position: "absolute",
            left: 1320,
            top: y(330),
            width: 430,
            height: 430,
            opacity: cat,
            transform: `translateY(${bob(frame, 5, 110) + (1 - cat) * 30}px)`,
          }}
        />
      ) : null}
    </AbsoluteFill>
  );
};
