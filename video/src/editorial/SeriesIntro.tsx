import React from "react";
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { ease } from "../components/motion";
import { Sfx } from "../sound/Sfx";
import { ds } from "../theme/brand";
import { SANS } from "../theme/fonts";
import { useLayout } from "./layout";
import { HAIRLINE, headline, INK, INK_SOFT, label } from "./style";
import { Ink } from "./ui";

/**
 * The Dataslope mark, from the site's own public/dataslope-logo-blue.svg
 * (copied as public/brand/dataslope-logo-blue.svg), drawn inline so its two
 * mirrored slopes can move on their own. Same paths, same radial gradients,
 * with the brand blue as a token instead of the file's hex.
 */
const VIEW = { w: 1087.59, h: 682.55 };
const LEFT =
  "M679.63,139.57c.05-1.45.06-2.21.06-3.67C679.69,60.84,618.85,0,543.79,0s-132.49,57.51-135.75,129.67h0s-2.99,129.29-85.67,205.52c-73.47,67.75-167.89,74.85-188,75.59-1.2.01-2.39.04-3.58.09-.2,0-.3,0-.3,0h0C57.94,413.72,0,473.42,0,546.66s60.84,135.89,135.89,135.89c3.22,0,6.41-.12,9.57-.34h0s278.11,3.51,437.31-237.01c100.12-151.26,96.85-304.24,96.85-304.24v-1.4Z";
const RIGHT =
  "M407.96,139.57c-.05-1.45-.06-2.21-.06-3.67C407.91,60.84,468.75,0,543.8,0s132.49,57.51,135.75,129.67h0s2.99,129.29,85.67,205.52c73.47,67.75,167.89,74.85,188,75.59,1.2.01,2.39.04,3.58.09.2,0,.3,0,.3,0h0c72.55,2.85,130.49,62.55,130.49,135.79s-60.84,135.89-135.89,135.89c-3.22,0-6.41-.12-9.57-.34h0s-278.11,3.51-437.31-237.01c-100.12-151.26-96.85-304.24-96.85-304.24v-1.4Z";
const LEFT_STOPS: [number, number][] = [
  [0.19, 0.6],
  [0.32, 0.62],
  [0.51, 0.69],
  [0.72, 0.81],
  [0.96, 0.97],
  [1, 1],
];
const RIGHT_STOPS: [number, number][] = [
  [0.14, 1],
  [0.34, 0.89],
  [0.76, 0.68],
  [0.96, 0.6],
];

/** The wordmark as the site header sets it: Inter 600, tracked tight
 *  (Tailwind's font-semibold tracking-tight), at the header's 1.38 times the
 *  mark's height. */
const WORDMARK: React.CSSProperties = {
  fontFamily: SANS,
  fontWeight: 600,
  fontSize: 96 * 1.38,
  letterSpacing: "-0.025em",
  color: INK,
  lineHeight: 1,
  whiteSpace: "nowrap",
};
/** "Dataslope" in that face is 4.61 em wide (measured in a render). */
const WORD_EM = 4.61;

/** Frames the intro needs before the first narrated word: a script that opens
 *  with it sets `leadIn` to at least INTRO_SECONDS. */
export const INTRO_SECONDS = 4.4;

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
            <radialGradient id="ds-intro-left" cx="339.84" cy="341.28" r="340.56" gradientUnits="userSpaceOnUse">
              {LEFT_STOPS.map(([o, a]) => (
                <stop key={o} offset={o} style={{ stopColor: ds("blue", 500), stopOpacity: a }} />
              ))}
            </radialGradient>
            <radialGradient id="ds-intro-right" cx="798.17" cy="382.86" r="318.51" gradientUnits="userSpaceOnUse">
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
