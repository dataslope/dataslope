import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Illustration } from "../../components/Illustration";
import { bob, ease, pop } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, body, headline, HIGHLIGHT, INK, INK_SOFT, label } from "../../editorial/style";
import { Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { ILLUSTRATIONS, PPV, PREVALENCE, SENSITIVITY, SPECIFICITY, VIDEO, pct } from "./data";

/**
 * Hook and odds: a positive result on a 99% accurate test, what the gut
 * reads it as, and the chance it really means.
 */
export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = useNarration();
  const { y } = useLayout();
  const rareAt = n.word("hook", "rare condition");
  const gutAt = n.word("odds", "Your gut");
  const gutNumAt = n.word("odds", "ninety-nine percent");
  const answerAt = n.word("odds", "about nine");
  const tubes = pop(frame, n.word("hook", "test") - 2, fps, 16);
  const marker = ease(frame, rareAt - 2, 16);
  const strike = ease(frame, answerAt - 6, 14);

  return (
    <AbsoluteFill>
      <Ink at={2} dur={14} style={{ left: 96, top: y(112) }}>
        <span style={label(21, ACCENT_INK)}>One positive result</span>
      </Ink>
      <Ink at={4} dur={20} style={{ left: 92, top: y(152), ...headline(88), whiteSpace: "nowrap" }}>
        A {pct(SENSITIVITY)} accurate test
      </Ink>
      <Ink at={10} dur={20} style={{ left: 92, top: y(246), ...headline(88, true), whiteSpace: "nowrap" }}>
        says you have it.
      </Ink>
      <Ink at={rareAt - 8} dur={18} style={{ left: 96, top: y(386), width: 1180, ...body(32) }}>
        {/* The rarity is the whole story, so it is the phrase that gets marked. */}
        <span
          style={{
            color: INK,
            backgroundImage: `linear-gradient(${HIGHLIGHT}, ${HIGHLIGHT})`,
            backgroundRepeat: "no-repeat",
            backgroundPosition: "0 85%",
            backgroundSize: `${marker * 100}% 42%`,
          }}
        >
          One person in {Math.round(1 / PREVALENCE).toLocaleString("en-US")} has the condition.
        </span>{" "}
        The test catches {pct(SENSITIVITY)} of real cases, and wrongly flags {pct(1 - SPECIFICITY)} of everyone
        else.
      </Ink>

      {ILLUSTRATIONS ? (
        <Illustration
          video={VIDEO}
          id="base-rate-test-tubes"
          style={{
            position: "absolute",
            left: 1440,
            top: y(96),
            width: 340,
            height: 340,
            opacity: tubes,
            transform: `translateY(${bob(frame, 5, 110) + (1 - tubes) * 30}px)`,
          }}
        />
      ) : null}

      {/* What the gut says, struck through when the answer arrives. */}
      <Ink at={gutAt - 4} dur={16} style={{ left: 100, top: y(530) }}>
        <div style={label(24, INK_SOFT)}>Your gut says</div>
      </Ink>
      <Ink at={gutNumAt - 4} dur={18} style={{ left: 92, top: y(552), ...headline(200), color: INK, whiteSpace: "nowrap" }}>
        <span style={{ position: "relative", display: "inline-block" }}>
          {pct(SENSITIVITY)}
          {/* Sized to the figure in % and em, so it strikes it in any face. */}
          <span
            style={{
              position: "absolute",
              left: "-4%",
              top: "52%",
              width: `${108 * strike}%`,
              height: "0.045em",
              borderRadius: "0.03em",
              background: ACCENT,
              transform: "rotate(-4deg)",
              transformOrigin: "left center",
            }}
          />
        </span>
      </Ink>

      <Ink at={answerAt - 4} dur={16} style={{ left: 760, top: y(530) }}>
        <div style={label(24, ACCENT_INK)}>The chance you have it</div>
      </Ink>
      <Ink
        at={answerAt}
        dur={18}
        style={{ left: 752, top: y(552), ...headline(200, true), color: ACCENT_INK, whiteSpace: "nowrap" }}
      >
        <span style={{ fontSize: "0.36em", marginRight: "0.3em" }}>about</span>
        {pct(PPV)}
      </Ink>
    </AbsoluteFill>
  );
};
