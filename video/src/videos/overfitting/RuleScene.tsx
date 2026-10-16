import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Illustration } from "../../components/Illustration";
import { bob, pop } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, fmt, headline, INK, INK_SOFT, note } from "../../editorial/style";
import { Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { FIT_INK, ILLUSTRATIONS, MAX_DEGREE, N_TEST, NEW_INK, row, VIDEO } from "./data";

/** The rule, and the one comparison that earns it. */
export const RuleScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = useNarration();
  const { y } = useLayout();
  const start = n.beat("rule").from;
  const seenAt = n.word("rule", "never seen");
  const cards = pop(frame, start + 4, fps, 16);
  const last = row(MAX_DEGREE);

  return (
    <AbsoluteFill>
      <Ink at={start - 2} dur={16} style={{ left: 120, top: y(300), width: 1100 }}>
        <div style={{ height: 2, background: INK, width: 140 }} />
      </Ink>
      <Ink at={start} dur={22} style={{ left: 114, top: y(340), ...headline(92), whiteSpace: "nowrap" }}>
        Judge a model by data
      </Ink>
      <Ink
        at={seenAt - 8}
        dur={20}
        style={{ left: 114, top: y(448), ...headline(92, true), color: ACCENT_INK, whiteSpace: "nowrap" }}
      >
        it has never seen.
      </Ink>
      <Ink at={seenAt + 8} dur={20} style={{ left: 120, top: y(600), width: 1100 }}>
        <div style={{ ...note(24, INK_SOFT), lineHeight: 1.45 }}>
          Degree {last.degree}: an error of{" "}
          <span style={{ color: FIT_INK[11], fontWeight: 700 }}>{fmt(last.train, 3)}</span> on its training points,
          and of <span style={{ color: NEW_INK, fontWeight: 700 }}>{fmt(last.test, 1)}</span> on{" "}
          {N_TEST.toLocaleString("en-US")} new ones.
        </div>
      </Ink>
      {ILLUSTRATIONS ? (
        <Illustration
          video={VIDEO}
          id="overfitting-flashcards"
          style={{
            position: "absolute",
            left: 1340,
            top: y(250),
            width: 440,
            height: y(640) - y(250),
            opacity: cards,
            transform: `translateY(${bob(frame, 5, 110) + (1 - cards) * 30}px)`,
          }}
        />
      ) : null}
    </AbsoluteFill>
  );
};
