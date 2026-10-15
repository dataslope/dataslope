import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Illustration } from "../../components/Illustration";
import { Logo } from "../../components/Logo";
import { ease, pop } from "../../components/motion";
import { Pattern } from "../../components/Pattern";
import { useNarration } from "../../narration/NarrationContext";
import { SANS } from "../../theme/fonts";
import { VIDEO } from "./data";
import { ACCENT_INK, BLUE_INK, body, headline, INK, smallCaps } from "./style";
import { Ink } from "./ui";

const LESSON_URL = "dataslope.com/courses/statistics-for-data-science-python/central-limit-theorem";
const COURSE = "Statistics for Data Science with Python";

/** End card: the lesson as a "further reading" box, and the marmot with the
 *  paper. */
export const OutroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = useNarration();
  const start = n.beat("outro").from;
  const simAt = n.word("outro", "simulation");
  const dataslopeAt = n.word("outro", "Dataslope");
  const lessonAt = n.word("outro", "lesson");
  const art = pop(frame, start - 10, fps, 18);
  // The marmot turns a page now and then: a small tilt that settles.
  const t = Math.max(0, frame - lessonAt);
  const tilt = Math.sin(t / 5) * 2.4 * Math.exp(-t / 30);

  return (
    <AbsoluteFill>
      <Ink at={start - 14} dur={14} style={{ left: 120, top: 176 }}>
        <span style={smallCaps(17, ACCENT_INK)}>Further reading</span>
      </Ink>
      <Ink at={start - 12} dur={24} style={{ left: 114, top: 214, ...headline(116), lineHeight: 0.98 }}>
        The Central
        <br />
        <span style={{ fontStyle: "italic", fontWeight: 480 }}>Limit Theorem</span>
      </Ink>
      <Ink at={simAt - 4} dur={18} style={{ left: 120, top: 466, width: 1000 }}>
        <div style={{ ...body(34, true), color: INK }}>
          Run the simulation yourself, from a skewed population to the bell.
        </div>
      </Ink>
      <Ink at={dataslopeAt - 6} dur={18} style={{ left: 120, top: 574, width: 1020 }}>
        <Pattern
          video={VIDEO}
          name="ornament-rule"
          style={{
            width: 1020,
            height: 12,
            marginBottom: 22,
            clipPath: `inset(0 ${(1 - ease(frame, dataslopeAt - 6, 24)) * 100}% 0 0)`,
          }}
        />
        <div style={{ ...smallCaps(15, INK), marginBottom: 10 }}>A lesson in {COURSE}</div>
        <div
          style={{
            fontFamily: SANS,
            fontSize: 25,
            fontWeight: 600,
            color: BLUE_INK,
            whiteSpace: "nowrap",
            letterSpacing: "-0.005em",
          }}
        >
          {LESSON_URL}
        </div>
      </Ink>
      <div
        style={{
          position: "absolute",
          left: 120,
          top: 742,
          opacity: ease(frame, lessonAt - 2, 14),
          transform: `translateY(${(1 - ease(frame, lessonAt - 2, 14)) * 12}px)`,
        }}
      >
        <Logo size={44} />
      </div>
      <Illustration
        video={VIDEO}
        id="clt-marmot-reader"
        style={{
          position: "absolute",
          left: 1230,
          top: 150,
          width: 560,
          height: 617,
          opacity: art,
          transformOrigin: "50% 90%",
          transform: `translateY(${(1 - art) * 50}px) rotate(${tilt}deg)`,
        }}
      />
    </AbsoluteFill>
  );
};
