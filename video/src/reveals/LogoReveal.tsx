import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../components/motion";
import { headline, HAIRLINE, INK, INK_SOFT, PAPER } from "../editorial/style";
import { TYPEFACES, typefaceVars } from "../editorial/typefaces";
import { Sfx, SfxContext, type SoundName } from "../sound/Sfx";
import { ds, inkOf } from "../theme/brand";
import { SANS } from "../theme/fonts";
import { AnimatedMark } from "./Mark";
import {
  BELL_LEVEL,
  LINE_LEVEL,
  MARK_AT,
  MARK_EVENTS,
  type MarkMotion,
  openerCues,
  REVEAL_FRAMES,
  stingCues,
  type TextMotion,
} from "./timing";
import { Words } from "./Words";
import "../editorial/fonts";

/**
 * Where everything sits:
 *
 * - `sting`: the mark and the wordmark as one lockup, as the site header sets
 *   it (the wordmark 1.38 times the mark's height). The mark lands alone in
 *   the middle and glides left as the wordmark writes in beside it.
 * - `stack`, `block`, `centered`, `columns`: a course opener in which every
 *   line of text is one size, "Dataslope" included. Weight and color tell the
 *   lines apart, not size: the wordmark in ink, the course in the soft ink,
 *   the unit's title in the brand blue.
 *   - `stack`: the mark above three lines, left-aligned.
 *   - `block`: a tall mark beside three lines, spanning from the first line's
 *     cap height to the last line's baseline.
 *   - `centered`: the mark above three centred lines.
 *   - `columns`: mark and wordmark on the left, the course and unit on the
 *     right, a hairline between.
 * - `headline`: the opener with a hierarchy, for comparison: a small wordmark
 *   over a large serif title, the course under it.
 */
export type RevealLayout = "sting" | "stack" | "block" | "centered" | "columns" | "headline";

export type LogoRevealProps = {
  layout: RevealLayout;
  /** How the mark arrives (Mark.tsx). */
  motion: MarkMotion;
  /** How the words arrive (Words.tsx). */
  text: TextMotion;
  /** `light`: the white page the videos use. `dark`: a deep brand blue. */
  theme: "light" | "dark";
  /** The course and unit an opener names; a sting ignores them. */
  course: string;
  unit: string;
  title: string;
  /** Play the reveal's sounds. */
  sfx: boolean;
};

/** The bell every reveal lands on, whatever came before it: the sonic half
 *  of the logo (levels in timing.ts). */
const BELL: SoundName = "el-reveal-bell";

export { REVEAL_FRAMES };

const THEMES = {
  light: { page: PAPER, mark: ds("blue", 500), ink: INK, soft: INK_SOFT, accent: inkOf.blue, rule: HAIRLINE },
  dark: {
    page: ds("blue", 800),
    mark: "var(--ds-white)",
    ink: "var(--ds-white)",
    soft: ds("blue", 200),
    accent: "var(--ds-white)",
    rule: `color-mix(in srgb, var(--ds-white) 45%, transparent)`,
  },
} as const;

/** "Dataslope" in Inter 600 at -0.025em is 4.61 em wide (measured in a render). */
const WORD_EM = 4.61;

/** Inter at one size: the wordmark's face, which every opener line shares. */
const inter = (size: number, weight: number, color: string): React.CSSProperties => ({
  fontFamily: SANS,
  fontSize: size,
  fontWeight: weight,
  letterSpacing: "-0.025em",
  lineHeight: 1.2,
  color,
});

export const LogoReveal: React.FC<LogoRevealProps> = (props) => {
  const { layout, motion, theme, sfx } = props;
  const t = THEMES[theme];
  const land = stingCues(motion).land;
  return (
    <SfxContext.Provider value={sfx}>
      <AbsoluteFill style={{ background: t.page, ...typefaceVars(TYPEFACES["source-serif"]) }}>
        {MARK_EVENTS[motion].map((e, i) => (
          <Sfx key={i} name={`el-reveal-${e.sound}`} accentAt={MARK_AT + e.at} level={e.level} />
        ))}
        <Sfx name={BELL} accentAt={land} level={BELL_LEVEL} />
        {layout === "sting" ? <Sting {...props} /> : <Opener {...props} />}
      </AbsoluteFill>
    </SfxContext.Provider>
  );
};

const Sting: React.FC<LogoRevealProps> = ({ motion, text, theme }) => {
  const frame = useCurrentFrame();
  const t = THEMES[theme];
  const markH = 120;
  const size = markH * 1.38;
  const gap = markH * 0.55;
  // The wordmark's box is held from the first frame, so the pair is centred
  // as a lockup and nothing jumps when it arrives. The mark lands alone in
  // the middle, then glides left out of the wordmark's way (stingCues).
  const cue = stingCues(motion);
  const shift = ((WORD_EM * size + gap) / 2) * (1 - ease(frame, cue.glide, 16));
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ display: "flex", alignItems: "center", gap, translate: "0 -12px" }}>
        <AnimatedMark motion={motion} at={MARK_AT} height={markH} color={t.mark} style={{ translate: `${shift}px 0` }} />
        <Words motion={text} at={cue.word} text="Dataslope" style={{ ...inter(size, 600, t.ink), lineHeight: 1 }} caret={t.mark} />
      </div>
    </AbsoluteFill>
  );
};

const Opener: React.FC<LogoRevealProps> = ({ layout, motion, text, theme, course, unit, title }) => {
  const frame = useCurrentFrame();
  const t = THEMES[theme];
  const cue = openerCues(motion, text, unit);
  const line = (child: React.ReactNode, style?: React.CSSProperties) => <div style={{ display: "flex", ...style }}>{child}</div>;
  const lineSounds = (
    <>
      <Sfx name="el-reveal-line" accentAt={cue.course + 8} level={LINE_LEVEL} />
      <Sfx name="el-reveal-line" accentAt={cue.unitAt + 8} level={LINE_LEVEL - 2} />
    </>
  );

  if (layout === "headline") {
    // The hierarchy the equal-size openers do without: a small wordmark, a
    // large serif title, and the course as a label under it.
    const markH = 236;
    return (
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        {lineSounds}
        <div style={{ display: "flex", alignItems: "center", gap: 72 }}>
          <AnimatedMark motion={motion} at={MARK_AT} height={markH} color={t.mark} />
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
            {line(<Words motion={text} at={cue.word} text="Dataslope" style={inter(44, 600, t.ink)} caret={t.mark} />)}
            {line(<Words motion={text} at={cue.course} text={title} style={{ ...headline(118), color: t.ink, lineHeight: 1.1 }} caret={t.mark} />, {
              marginTop: 6,
            })}
            {line(
              <Words motion={text} at={cue.unitAt} text={`${course}, ${unit}`} style={inter(34, 550, t.soft)} caret={t.mark} />,
              { marginTop: 14 },
            )}
          </div>
        </div>
      </AbsoluteFill>
    );
  }

  const size = layout === "block" ? 64 : layout === "columns" ? 56 : layout === "stack" ? 76 : 68;
  const words = {
    word: <Words motion={text} at={cue.word} text="Dataslope" style={inter(size, 600, t.ink)} caret={t.mark} />,
    course: <Words motion={text} at={cue.course} text={course} style={inter(size, 500, t.soft)} caret={t.mark} />,
    unit: (
      <div style={{ display: "flex", gap: `${0.32 * size}px` }}>
        <Words motion={text} at={cue.unitAt} text={unit} style={inter(size, 500, t.soft)} caret={t.mark} />
        <Words motion={text} at={cue.titleAt} text={title} style={inter(size, 600, t.accent)} caret={t.mark} />
      </div>
    ),
  };

  if (layout === "stack") {
    return (
      <AbsoluteFill style={{ justifyContent: "center", paddingLeft: 200 }}>
        {lineSounds}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", translate: "0 -10px" }}>
          <AnimatedMark motion={motion} at={MARK_AT} height={128} color={t.mark} style={{ marginBottom: 46, marginLeft: 2 }} />
          {line(words.word)}
          {line(words.course)}
          {line(words.unit)}
        </div>
      </AbsoluteFill>
    );
  }

  if (layout === "block") {
    // Inter's cap height sits 0.242 em under the top of a 1.2 line, and its
    // baseline 0.969 em, so the mark spans first cap to last baseline.
    const top = 0.242 * size;
    const markH = (2 * 1.2 + 0.969 - 0.242) * size;
    return (
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        {lineSounds}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 64 }}>
          <AnimatedMark motion={motion} at={MARK_AT} height={markH} color={t.mark} style={{ marginTop: top }} />
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
            {line(words.word)}
            {line(words.course)}
            {line(words.unit)}
          </div>
        </div>
      </AbsoluteFill>
    );
  }

  if (layout === "centered") {
    return (
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        {lineSounds}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", translate: "0 -14px" }}>
          <AnimatedMark motion={motion} at={MARK_AT} height={140} color={t.mark} style={{ marginBottom: 50 }} />
          {line(words.word)}
          {line(words.course)}
          {line(words.unit)}
        </div>
      </AbsoluteFill>
    );
  }

  // columns
  const rule = ease(frame, cue.word + 4, 18);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      {lineSounds}
      <div style={{ display: "flex", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: size * 0.34 }}>
          <AnimatedMark motion={motion} at={MARK_AT} height={size * 1.1} color={t.mark} />
          {words.word}
        </div>
        <div style={{ width: 2, height: 2.4 * size * rule, background: t.rule, margin: `0 ${size}px`, alignSelf: "center" }} />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
          {line(words.course)}
          {line(words.unit)}
        </div>
      </div>
    </AbsoluteFill>
  );
};
