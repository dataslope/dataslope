import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../components/motion";
import { INTER_OPTICAL } from "../editorial/fonts";
import { HAIRLINE, INK, INK_SOFT, PAPER } from "../editorial/style";
import { TYPEFACES } from "../editorial/typefaces";
import { Sfx, SfxContext } from "../sound/Sfx";
import { ds, inkOf } from "../theme/brand";
import { MONO, SANS } from "../theme/fonts";
import { AnimatedMark } from "./Mark";
import {
  type Landing,
  LANDING_LEVEL,
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
 *   over a large title, the course under it.
 *
 * Every opener is set in Inter unless its `face` says otherwise (OpenerFace).
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
  /** The face an opener sets its course and unit in (OpenerFace). Inter
   *  unless there is a reason to compare; a sting ignores it. */
  face: OpenerFace;
  /** The course and unit an opener names; a sting ignores them. */
  course: string;
  unit: string;
  title: string;
  /** The sound the mark lands on (timing.ts). */
  landing: Landing;
  /** Play the reveal's sounds. */
  sfx: boolean;
  /** The course and unit lines in the soft ink (grey, the default) or the
   *  ink itself (black). The title stays in the accent either way. */
  textInk?: "soft" | "black";
  /** `columns`: the divider between the lockup and the words, a hairline
   *  (the default) or a bar in the brand blue. */
  divider?: "hairline" | "blue";
  /** `columns`: the unit on a line of its own, between the course and the
   *  title, rather than in front of the title. */
  threeLines?: boolean;
  /** The one text size an equal-size opener sets every line at, in px,
   *  overriding the layout's own. */
  size?: number;
};


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

/** Inter at one size: the wordmark's face, as the site header sets it. */
const inter = (size: number, weight: number, color: string): React.CSSProperties => ({
  fontFamily: SANS,
  fontSize: size,
  fontWeight: weight,
  letterSpacing: "-0.025em",
  lineHeight: 1.2,
  color,
});

/**
 * The face an opener sets its course and unit in. **Inter, the site's own
 * face, is the default and the one to prefer**; the others are there to
 * compare against it. The wordmark stays Inter 600 whatever this says,
 * because it is the logo.
 *
 * "One size" means one x-height: a serif set at Inter's font size reads
 * smaller, so each face is scaled until its lowercase stands as tall as
 * Inter's, by the scales typefaces.ts measured for the editorial videos.
 * JetBrains Mono, the site's code face, already matches Inter's (0.55 em
 * against 0.546).
 */
export type OpenerFace = "inter" | "source-serif" | "fraunces" | "jetbrains-mono";

const toInter = (id: keyof typeof TYPEFACES) => TYPEFACES[id].headScale / TYPEFACES.inter.headScale;
const FACES: Record<OpenerFace, { family: string; scale: number; regular: number; strong: number; tracking: string; display: string }> = {
  // `display` is the family for the headline layout's large title: Inter's
  // optical-size axis draws it from Inter Display, cut for that size.
  inter: { family: SANS, scale: 1, regular: 500, strong: 600, tracking: "-0.025em", display: `"${INTER_OPTICAL}", ${SANS}` },
  "source-serif": {
    family: TYPEFACES["source-serif"].family,
    scale: toInter("source-serif"),
    regular: 400,
    strong: 640,
    tracking: "-0.012em",
    display: TYPEFACES["source-serif"].family,
  },
  fraunces: {
    family: TYPEFACES.fraunces.family,
    scale: toInter("fraunces"),
    regular: 400,
    strong: 560,
    tracking: "-0.015em",
    display: TYPEFACES.fraunces.family,
  },
  "jetbrains-mono": { family: MONO, scale: 1, regular: 400, strong: 600, tracking: "-0.02em", display: MONO },
};

/** One line of an opener in `face`, at the x-height of Inter at `size`. Its
 *  line box is set in pixels, so every face keeps Inter's rhythm. */
const setIn = (face: OpenerFace, size: number, weight: "regular" | "strong", color: string): React.CSSProperties => {
  const f = FACES[face];
  return {
    fontFamily: f.family,
    fontSize: size * f.scale,
    fontWeight: f[weight],
    letterSpacing: f.tracking,
    lineHeight: `${size * 1.2}px`,
    // Fraunces defaults to old-style figures, which drop "Unit 3" below the line.
    fontVariantNumeric: "lining-nums",
    color,
  };
};

export const LogoReveal: React.FC<LogoRevealProps> = (props) => {
  const { layout, motion, theme, landing, sfx } = props;
  const t = THEMES[theme];
  const land = stingCues(motion).land;
  return (
    <SfxContext.Provider value={sfx}>
      <AbsoluteFill style={{ background: t.page }}>
        {MARK_EVENTS[motion].map((e, i) => (
          <Sfx key={i} name={`el-reveal-${e.sound}`} accentAt={MARK_AT + e.at} level={e.level} />
        ))}
        <Sfx name={`el-reveal-land-${landing}`} accentAt={land} level={LANDING_LEVEL} />
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

const Opener: React.FC<LogoRevealProps> = ({ layout, motion, text, theme, face, course, unit, title, textInk, divider, threeLines, size: sizeOverride }) => {
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
    // large title (Inter Display, by default), and the course under it.
    const markH = 236;
    const f = FACES[face];
    const big: React.CSSProperties = {
      fontFamily: f.display,
      fontSize: 112 * f.scale,
      fontWeight: face === "inter" ? 640 : f.strong,
      letterSpacing: face === "inter" ? "-0.03em" : f.tracking,
      lineHeight: 1.1,
      fontVariantNumeric: "lining-nums",
      color: t.ink,
    };
    return (
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        {lineSounds}
        <div style={{ display: "flex", alignItems: "center", gap: 72 }}>
          <AnimatedMark motion={motion} at={MARK_AT} height={markH} color={t.mark} />
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
            {line(<Words motion={text} at={cue.word} text="Dataslope" style={inter(44, 600, t.ink)} caret={t.mark} />)}
            {line(<Words motion={text} at={cue.course} text={title} style={big} caret={t.mark} />, {
              marginTop: 6,
            })}
            {line(
              <Words motion={text} at={cue.unitAt} text={`${course}, ${unit}`} style={setIn(face, 34, "regular", t.soft)} caret={t.mark} />,
              { marginTop: 14 },
            )}
          </div>
        </div>
      </AbsoluteFill>
    );
  }

  const size = sizeOverride ?? (layout === "block" ? 64 : layout === "columns" ? 56 : layout === "stack" ? 76 : 68);
  // Grey by default; black when asked, with the title still in the accent.
  const lineInk = textInk === "black" ? t.ink : t.soft;
  const unitWords = unit ? <Words motion={text} at={cue.unitAt} text={unit} style={setIn(face, size, "regular", lineInk)} caret={t.mark} /> : null;
  const titleWords = <Words motion={text} at={cue.titleAt} text={title} style={setIn(face, size, "strong", t.accent)} caret={t.mark} />;
  const words = {
    word: <Words motion={text} at={cue.word} text="Dataslope" style={inter(size, 600, t.ink)} caret={t.mark} />,
    course: <Words motion={text} at={cue.course} text={course} style={setIn(face, size, "regular", lineInk)} caret={t.mark} />,
    // A merged course or track has no unit: its title stands alone.
    unit: (
      <div style={{ display: "flex", alignItems: "baseline", gap: `${0.32 * size}px` }}>
        {unitWords}
        {titleWords}
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
  const lines = threeLines && unit ? 3 : 2;
  const blue = divider === "blue";
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      {lineSounds}
      <div style={{ display: "flex", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: size * 0.34 }}>
          <AnimatedMark motion={motion} at={MARK_AT} height={size * 1.1} color={t.mark} />
          {words.word}
        </div>
        <div
          style={{
            width: blue ? 5 : 2,
            borderRadius: blue ? 3 : 0,
            height: lines * 1.2 * size * rule,
            background: blue ? t.mark : t.rule,
            margin: `0 ${size}px`,
            alignSelf: "center",
          }}
        />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
          {line(words.course)}
          {lines === 3 ? (
            <>
              {line(unitWords)}
              {line(titleWords)}
            </>
          ) : (
            line(words.unit)
          )}
        </div>
      </div>
    </AbsoluteFill>
  );
};
