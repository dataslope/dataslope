import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Illustration } from "../../components/Illustration";
import { bob, ease, pop } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, body, headline, INK, INK_SOFT, label, note } from "../../editorial/style";
import { Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ILLUSTRATIONS, VIDEO } from "./data";
import { Plane, SKIN } from "./parts";
import { KickerRule, PartName } from "../sampling/PartName";

/** One mission as a strip of planes; the one at LOST never comes home. */
const STRIP = 10;
const LOST = 6;
const STRIP_X0 = 150;
const STRIP_DX = 150;
const STRIP_Y = 610;

/**
 * Hook to "the most holes": Wald's question, the watercolor bomber, and the
 * only evidence there was, the planes that came home.
 */
export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = useNarration();
  const { y } = useLayout();

  const yearAt = n.word("hook", "1943");
  const waldAt = n.word("hook", "Abraham Wald");
  const wartimeAt = n.word("hook", "wartime");
  const bomberAt = n.word("hook", "bomber");
  const vulnerableAt = n.word("hook", "vulnerable");
  const evidenceAt = n.word("evidence", "evidence");
  const homeAt = n.word("evidence", "made it home");
  const instinctAt = n.word("instinct", "instinct");
  const holesAt = n.word("instinct", "most holes");

  const lost = ease(frame, homeAt, 16);

  return (
    <AbsoluteFill>
      {/* ── Sound (merged video only; the standalone has sfx off) ── */}
      <Sfx name="el-pop" at={wartimeAt - 4} level={-30} />
      <Sfx name="el-pencil" at={vulnerableAt} level={-33} />
      <Sfx name="el-sprinkle" at={evidenceAt} level={-34} />
      <Sfx name="el-whoosh" at={homeAt} level={-34} />
      <Sfx name="el-pencil" at={homeAt + 6} level={-35} />

      <Ink at={yearAt - 6} dur={14} style={{ left: 96, top: y(112) }}>
        <span style={label(21, ACCENT_INK)}>
          <PartName />Statistical Research Group, Columbia, 1943
          {/* The statistician, as he is named. */}
          <span style={{ display: "inline-block", opacity: ease(frame, waldAt - 2, 14), translate: `${(1 - ease(frame, waldAt - 2, 14)) * -10}px 0` }}>
            <KickerRule />
            <span style={{ color: INK }}>Abraham Wald</span>
          </span>
        </span>
      </Ink>
      <Ink at={yearAt} dur={20} style={{ left: 92, top: y(156), ...headline(84), whiteSpace: "nowrap" }}>
        Which parts of a bomber
      </Ink>
      <Ink at={bomberAt} dur={20} style={{ left: 92, top: y(246), ...headline(84), whiteSpace: "nowrap" }}>
        are most{" "}
        <span style={{ position: "relative", ...headline(84, true) }}>
          vulnerable?
          {/* Sized in em and to the word, so it underlines it in any face. */}
          <svg
            viewBox="0 0 380 30"
            preserveAspectRatio="none"
            style={{ position: "absolute", left: -6, top: "0.95em", width: "calc(100% + 12px)", height: "0.3em", overflow: "visible" }}
          >
            <path
              d="M4,18 C80,8 190,6 372,14"
              fill="none"
              stroke={ACCENT}
              strokeWidth={5}
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              pathLength={1}
              strokeDasharray={`${ease(frame, vulnerableAt, 14)} 1`}
              opacity={frame > vulnerableAt ? 1 : 0}
            />
          </svg>
        </span>
      </Ink>

      {ILLUSTRATIONS ? (
        <Illustration
          video={VIDEO}
          id="survivorship-bias-homeward"
          style={{
            position: "absolute",
            left: 1150,
            top: y(118),
            width: 660,
            height: 350,
            opacity: pop(frame, wartimeAt - 4, fps, 16),
            transform: `translate(${(1 - pop(frame, wartimeAt - 4, fps, 16)) * 60}px, ${bob(frame, 6, 120)}px)`,
          }}
        />
      ) : null}

      {/* ── The evidence: one mission, and the planes that came home ── */}
      <Ink at={evidenceAt - 4} dur={16} style={{ left: 96, top: y(456) }}>
        <span style={{ ...body(34, true), color: INK }}>The evidence: the damage on the planes that came home.</span>
      </Ink>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        {Array.from({ length: STRIP }, (_, i) => {
          const at = evidenceAt + i * 2;
          const show = ease(frame, at, 12);
          if (show <= 0) return null;
          const isLost = i === LOST;
          const gone = isLost ? lost : 0;
          return (
            <Plane
              key={i}
              x={STRIP_X0 + i * STRIP_DX - (1 - show) * 30}
              y={y(STRIP_Y) + gone * 14}
              scale={0.34}
              rotate={90}
              opacity={show}
              detail="none"
              style={(part) => ({
                fill: isLost ? `color-mix(in srgb, ${SKIN} ${100 - gone * 100}%, transparent)` : SKIN,
                // Too small to show the tanks: they fill in with the wing.
                stroke: part === "fuel" ? "none" : isLost && gone > 0 ? INK_SOFT : INK,
                width: 1.3,
                dash: isLost && gone > 0.4 ? "4 3" : undefined,
              })}
            />
          );
        })}
        {/* A bracket under the nine that came home. */}
        <path
          d={`M${STRIP_X0 - 40},${y(STRIP_Y + 54)} v10 H${STRIP_X0 + (STRIP - 1) * STRIP_DX + 40} v-10`}
          fill="none"
          stroke={INK}
          strokeWidth={1.6}
          opacity={ease(frame, homeAt + 6, 12)}
        />
      </svg>
      <Note at={homeAt + 8} x={STRIP_X0 - 40} y={y(STRIP_Y + 84)}>
        <span style={label(21, INK)}>Came home: counted, hole by hole</span>
      </Note>
      <Note at={homeAt + 12} x={STRIP_X0 + LOST * STRIP_DX} y={y(STRIP_Y - 92)} from="up">
        <span style={{ ...note(21, INK_SOFT), display: "block", transform: "translateX(-50%)", whiteSpace: "nowrap" }}>
          Went down: never counted
        </span>
      </Note>

      {/* ── The instinct ── */}
      <div
        style={{
          position: "absolute",
          left: 96,
          top: y(790),
          display: "flex",
          alignItems: "baseline",
          gap: "0.3em",
          ...headline(52),
        }}
      >
        <Ink at={instinctAt - 4} dur={16} style={{ position: "relative", whiteSpace: "nowrap" }}>
          The instinct:
        </Ink>
        <Ink
          at={holesAt - 6}
          dur={18}
          style={{ position: "relative", whiteSpace: "nowrap", ...headline(52, true), color: ACCENT_INK }}
        >
          armor the parts with the most holes.
        </Ink>
      </div>
    </AbsoluteFill>
  );
};
