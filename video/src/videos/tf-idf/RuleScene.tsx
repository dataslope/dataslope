import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Illustration } from "../../components/Illustration";
import { bob, pop } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, headline, INK, INK_SOFT, label } from "../../editorial/style";
import { Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { ILLUSTRATIONS, VIDEO } from "./data";
import { Frac, V } from "./parts";

/** Rule: what counts reward, and what TF-IDF rewards instead. */
export const RuleScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = useNarration();
  const { y } = useLayout();
  const start = n.beat("rule").from;
  const tfidfAt = n.word("rule", "TF-IDF");
  const comet = pop(frame, start + 4, fps, 16);

  return (
    <AbsoluteFill>
      <Ink at={start - 12} dur={20} style={{ left: 114, top: y(176), ...headline(76), whiteSpace: "nowrap" }}>
        Raw counts reward common words.
      </Ink>
      <Ink at={tfidfAt - 6} dur={22} style={{ left: 120, top: y(330), width: 1060 }}>
        <div style={{ height: 2, background: INK, width: 140, marginBottom: 30 }} />
        <div style={{ ...headline(58, true), color: ACCENT_INK, lineHeight: 1.12 }}>
          TF-IDF rewards the words that are frequent here and rare elsewhere.
        </div>
      </Ink>
      <Ink at={tfidfAt + 10} dur={20} style={{ left: 120, top: y(590) }}>
        <div style={{ ...label(21, INK_SOFT), marginBottom: 14 }}>The lesson&apos;s formula</div>
        <div style={{ display: "flex", alignItems: "center", ...headline(44), whiteSpace: "nowrap" }}>
          <span>
            <V>tf-idf</V>(<V>w</V>, <V>d</V>)
          </span>
          <span style={{ margin: "0 0.3em" }}>=</span>
          <span>
            <V>tf</V>(<V>w</V>, <V>d</V>)
          </span>
          <span style={{ margin: "0 0.3em" }}>×</span>
          <span style={{ marginRight: "0.12em" }}>ln</span>
          <Frac
            top={<V>N</V>}
            bottom={
              <>
                <V>df</V>(<V>w</V>)
              </>
            }
          />
        </div>
      </Ink>
      {ILLUSTRATIONS ? (
        <Illustration
          video={VIDEO}
          id="tfidf-comet"
          style={{
            position: "absolute",
            left: 1300,
            top: y(220),
            width: 480,
            height: 480,
            opacity: comet,
            transform: `translateY(${bob(frame, 5, 110) + (1 - comet) * 30}px)`,
          }}
        />
      ) : null}
    </AbsoluteFill>
  );
};
