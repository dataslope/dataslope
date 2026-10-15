import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Illustration } from "../../components/Illustration";
import { Logo } from "../../components/Logo";
import { bob, ease, pop } from "../../components/motion";
import { Pattern } from "../../components/Pattern";
import { useNarration } from "../../narration/NarrationContext";
import { colors, ds } from "../../theme/brand";
import { SANS } from "../../theme/fonts";
import { VIDEO } from "./data";

/** Hook: the claim, the elephant, and the first of three pattern uses. */
export const TitleScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = useNarration();
  const hero = pop(frame, n.word("hook", "SQL"), fps);
  const marker = ease(frame, n.word("hook", "trips"), 14);
  const band = ease(frame, 0, 18);

  const line = (i: number) => {
    const p = pop(frame, 4 + i * 5, fps, 16);
    return {
      opacity: p,
      transform: `translateY(${(1 - p) * 40}px)`,
      display: "block",
    } as const;
  };

  return (
    <AbsoluteFill style={{ background: colors.page }}>
      <Pattern
        video={VIDEO}
        name="title-band"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: 1920,
          height: 150,
          clipPath: `inset(0 ${(1 - band) * 100}% 0 0)`,
        }}
      />
      <Logo size={46} style={{ position: "absolute", left: 96, top: 206 }} />
      <div
        style={{
          position: "absolute",
          left: 96,
          top: 330,
          width: 980,
          fontFamily: SANS,
          color: colors.ink,
        }}
      >
        <div
          style={{
            ...line(0),
            fontSize: 30,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: colors.accentInk,
            marginBottom: 22,
          }}
        >
          Query execution order
        </div>
        <div style={{ fontSize: 104, fontWeight: 800, lineHeight: 1.04, letterSpacing: "-0.035em" }}>
          <span style={line(1)}>SQL doesn&apos;t run</span>
          <span style={line(2)}>
            in{" "}
            <span style={{ position: "relative", whiteSpace: "nowrap" }}>
              <span
                style={{
                  position: "absolute",
                  left: -8,
                  right: -8,
                  bottom: 6,
                  height: 34,
                  borderRadius: 6,
                  background: ds("yellow"),
                  transform: `scaleX(${marker})`,
                  transformOrigin: "left",
                }}
              />
              <span style={{ position: "relative" }}>the order</span>
            </span>
          </span>
          <span style={line(3)}>you write it.</span>
        </div>
      </div>
      <Illustration
        video={VIDEO}
        id="sql-eo-hero"
        style={{
          position: "absolute",
          left: 1060,
          top: 230,
          width: 780,
          height: 620,
          opacity: hero,
          transform: `translateY(${bob(frame) + (1 - hero) * 60}px) scale(${0.9 + hero * 0.1})`,
        }}
      />
    </AbsoluteFill>
  );
};
