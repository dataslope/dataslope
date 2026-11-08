import React from "react";
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { LEFT, LEFT_GRADIENT, LEFT_STOPS, RIGHT, RIGHT_GRADIENT, RIGHT_STOPS, VIEW } from "../components/mark";
import { ease } from "../components/motion";
import { Sfx } from "../sound/Sfx";
import { ds } from "../theme/brand";
import { SANS } from "../theme/fonts";
import { useLayout } from "./layout";
import { HAIRLINE, headline, INK, INK_SOFT, label } from "./style";
import { Ink } from "./ui";

/** The wordmark as the site header sets it: Inter 600, tracked tight
 *  (Tailwind's font-semibold tracking-tight), at the header's 1.38 times the
 *  mark's height. */
const WORDMARK: React.CSSProperties = {
  fontFamily: SANS,
  fontWeight: 500,
  fontSize: 96 * 1.38,
  letterSpacing: "-0.025em",
  color: INK,
  lineHeight: 1,
  whiteSpace: "nowrap",
};
/** "Dataslope" in that face is 4.61 em wide (measured in a render). */
const WORD_EM = 4.61;

/** How long the intro runs. It lives in intro.ts with INTRO_LEAD_IN, which
 *  every script that opens on this intro uses as its `leadIn`. */
export { INTRO_SECONDS } from "./intro";

/**
 * A course video's opening: the Dataslope mark assembles from its two slopes
 * and gives the small tilt the site's logo gives on hover, the wordmark writes
 * itself beside it (Inter 600, tracked tight, as in the site header), and the
 * unit's title arrives under a hairline. The logo sound (el-logo) is timed so
 * its chime lands as the two halves meet.
 *
 * Place it in a <Scene> from frame 0 that ends where the first scene's cut
 * begins; the scene's cross-fade carries it out.
 */
export const SeriesIntro: React.FC<{ course: string; unit: string; title: string }> = ({ course, unit, title }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { y } = useLayout();

  const MARK_H = 96;
  const k = MARK_H / VIEW.h;
  const slope = (at: number) => spring({ frame: frame - at, fps, config: { damping: 15, mass: 0.9, stiffness: 120 } });
  const left = slope(8);
  const right = slope(13);
  // The site's hover tilt (rotate 8deg), once, after the halves have met.
  const tilt = interpolate(frame, [34, 41, 54], [0, 8, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });
  const word = ease(frame, 30, 16);
  // The mark lands alone in the middle of the page, then glides left to make
  // room as the wordmark writes itself in. The wordmark's box is held from the
  // first frame, so the pair is centered as a lockup and nothing jumps.
  const gap = MARK_H * 0.55;
  const glide = ease(frame, 18, 16);
  const markShift = ((WORD_EM * MARK_H * 1.38 + gap) / 2) * (1 - glide);
  const rule = ease(frame, 50, 22);

  return (
    <AbsoluteFill>
      <Sfx name="el-logo" at={4} level={-21} />
      <Sfx name="el-pencil" at={50} level={-33} />

      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: y(330),
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap,
        }}
      >
        <svg
          width={VIEW.w * k}
          height={MARK_H}
          viewBox={`0 0 ${VIEW.w} ${VIEW.h}`}
          style={{ overflow: "visible", rotate: `${tilt}deg`, translate: `${markShift}px 0`, transformOrigin: "50% 60%" }}
        >
          <defs>
            <radialGradient id="ds-intro-left" {...LEFT_GRADIENT} gradientUnits="userSpaceOnUse">
              {LEFT_STOPS.map(([o, a]) => (
                <stop key={o} offset={o} style={{ stopColor: ds("blue", 500), stopOpacity: a }} />
              ))}
            </radialGradient>
            <radialGradient id="ds-intro-right" {...RIGHT_GRADIENT} gradientUnits="userSpaceOnUse">
              {RIGHT_STOPS.map(([o, a]) => (
                <stop key={o} offset={o} style={{ stopColor: ds("blue", 500), stopOpacity: a }} />
              ))}
            </radialGradient>
          </defs>
          <path
            d={LEFT}
            fill="url(#ds-intro-left)"
            opacity={Math.min(1, left * 1.4)}
            transform={`translate(${(1 - left) * -320} ${(1 - left) * 90})`}
          />
          <path
            d={RIGHT}
            fill="url(#ds-intro-right)"
            opacity={Math.min(1, right * 1.4)}
            transform={`translate(${(1 - right) * 320} ${(1 - right) * 90})`}
          />
        </svg>
        <div style={{ position: "relative", translate: `${(1 - word) * 18}px 0` }}>
          {/* Holds the wordmark's box before it is drawn. */}
          <span style={{ ...WORDMARK, visibility: "hidden" }}>Dataslope</span>
          <Ink at={30} dur={18} style={{ left: 0, top: 0, whiteSpace: "nowrap" }}>
            <span style={WORDMARK}>Dataslope</span>
          </Ink>
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          left: "50%",
          top: y(560),
          width: 720 * rule,
          height: 1,
          translate: "-50% 0",
          background: HAIRLINE,
        }}
      />
      <div style={{ position: "absolute", left: 0, right: 0, top: y(598), display: "flex", flexDirection: "column", alignItems: "center" }}>
        <Ink at={56} dur={16} style={{ position: "relative", whiteSpace: "nowrap" }}>
          <span style={label(24, INK_SOFT)}>
            {course}, {unit}
          </span>
        </Ink>
        <Ink at={62} dur={20} style={{ position: "relative", whiteSpace: "nowrap", marginTop: 22 }}>
          <span style={{ ...headline(84), color: INK }}>{title}</span>
        </Ink>
      </div>
    </AbsoluteFill>
  );
};
