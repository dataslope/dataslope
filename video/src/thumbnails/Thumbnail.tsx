import React from "react";
import { AbsoluteFill } from "remotion";
import { Illustration } from "../components/Illustration";
import { INK } from "../editorial/style";
import { AnimatedMark } from "../reveals/Mark";
import { ds } from "../theme/brand";
import { SANS } from "../theme/fonts";

/**
 * YouTube thumbnails for the merged videos: one per course and interview
 * track, each with its own watercolor animal (src/thumbnails/illustrations.json,
 * and the otter and meerkat of the interview overviews), so the seven read
 * apart at a glance in a list of results.
 *
 * A white page, the Dataslope mark alone in the top-left corner, the words
 * low on the left and the animal on the right. Every word is Inter 500: the
 * title at SIZE, in black; a course's "Full Course" smaller, above the title,
 * in the brand blue; an interview track's "Interview Prep" after the title,
 * in a neutral grey. No pills, no badges.
 *
 * Thumbnails are seen small (about 168x94 on a phone, where SIZE is about
 * 10px), so the words are few, and nothing that matters sits in the
 * bottom-right corner, where YouTube prints the running time.
 */
export type Track = {
  kind: "course" | "interview";
  /** The title, one array entry per line. */
  title: string[];
  /** The watercolor animal: its folder under public/images/, and its id. */
  art: { video: string; id: string };
};

export const TRACKS: Record<string, Track> = {
  Statistics: {
    kind: "course",
    title: ["Statistics for", "Data Science", "with Python"],
    art: { video: "thumbnails", id: "thumb-owl" },
  },
  DatabaseDesign: {
    kind: "course",
    title: ["Database Design", "with PostgreSQL"],
    art: { video: "thumbnails", id: "thumb-elephant" },
  },
  LargeLanguageModels: {
    kind: "course",
    title: ["How Large", "Language", "Models Work"],
    art: { video: "thumbnails", id: "thumb-llama" },
  },
  NaturalLanguageProcessing: {
    kind: "course",
    title: ["Natural Language", "Processing", "with Python"],
    art: { video: "thumbnails", id: "thumb-parrot" },
  },
  DataAnalyst: { kind: "interview", title: ["Data Analyst"], art: { video: "thumbnails", id: "thumb-raccoon" } },
  DataScientist: { kind: "interview", title: ["Data Scientist"], art: { video: "ds-interview", id: "ds-interview-otter" } },
  DataEngineer: { kind: "interview", title: ["Data Engineer"], art: { video: "de-interview", id: "de-interview-meerkat" } },
};

/** How an interview track names itself: "Interview Questions" (the
 *  series' name), or the earlier "Interview Prep" and "Interview
 *  Preparation", which is too wide for one line at SIZE and takes two.
 *  "Interview Questions" fits one line (about 730px) beside the animal
 *  hung top-right, not beside one standing bottom-right. */
export type InterviewLabel = "questions" | "prep" | "preparation";
const INTERVIEW: Record<InterviewLabel, string[]> = {
  questions: ["Interview Questions"],
  prep: ["Interview Prep"],
  preparation: ["Interview", "Preparation"],
};

/** The color an interview label is set in: the title's black, the brand's
 *  soft ink (gray 600), or a step lighter (gray 500). All clear AA on white. */
export type LabelTone = "black" | "gray-600" | "gray-500" | "green";

export type ThumbnailProps = {
  track: keyof typeof TRACKS;
  label?: InterviewLabel;
  tone?: LabelTone;
  /** An interview track's label above its role, as "Full Course" sits
   *  above a course's title, rather than after it. */
  labelFirst?: boolean;
  /** An interview track's role ("Data Analyst"): black like a course
   *  title, or in a hue with the label after it in black. Green marks the
   *  interview series apart from the courses' blue, the mark included. */
  role?: "black" | "blue" | "green";
  /** The green role's shade: the brand's green ink (600, about 3.2:1 on
   *  white), the brand green itself (500, the mark's, about 2.3:1), or
   *  halfway between (550, about 2.7:1). */
  greenShade?: 500 | 550 | 600;
  /** A course's "Full Course": smaller than the title, or the title's size. */
  kicker?: "small" | "same";
  /** Where the animal stands: on the line the words end on, or hung from
   *  the top-right corner, level with the mark. */
  artAt?: "bottom" | "top";
};

const W = 1280;
const H = 720;
/** Where the words start. */
const PAD = 64;
/** The title's size. The widest line, "Natural Language" in Inter 500,
 *  measures about 650px at 80px, inside the 680px the words have. */
export const SIZE = 80;
/** "Full Course", above a course's title, when it is smaller than the title. */
const KICKER = 52;
/** Every word is set at this one weight. */
const WEIGHT = 500;

const type = (size: number, color: string): React.CSSProperties => ({
  fontFamily: SANS,
  fontSize: size,
  fontWeight: WEIGHT,
  lineHeight: 1.1,
  letterSpacing: "-0.02em",
  whiteSpace: "nowrap",
  color,
});

const Lines: React.FC<{ lines: string[]; style: React.CSSProperties }> = ({ lines, style }) => (
  <>
    {lines.map((l) => (
      <div key={l} style={style}>
        {l}
      </div>
    ))}
  </>
);

const TONE: Record<Exclude<LabelTone, "green">, string> = { black: INK, "gray-600": ds("gray", 600), "gray-500": ds("gray", 500) };

const GREEN: Record<500 | 550 | 600, string> = {
  500: ds("green", 500),
  550: `color-mix(in srgb, ${ds("green", 500)}, ${ds("green", 600)})`,
  600: ds("green", 600),
};

export const Thumbnail: React.FC<ThumbnailProps> = ({
  track,
  label = "questions",
  tone = "gray-600",
  kicker = "small",
  artAt = "bottom",
  role = "black",
  greenShade = 550,
  labelFirst = false,
}) => {
  const t = TRACKS[track];
  const course = t.kind === "course";
  const labelInk = tone === "green" ? GREEN[greenShade] : TONE[tone];
  const kick = kicker === "same" ? SIZE : KICKER;
  const top = artAt === "top";
  return (
    <AbsoluteFill style={{ background: "var(--ds-white)" }}>
      {/* The mark alone, no wordmark. A motion that has long since landed
          draws the finished mark. */}
      <div style={{ position: "absolute", left: PAD, top: 52 }}>
        <AnimatedMark motion="assemble" at={-120} height={56} color={!course && (role === "green" || tone === "green") ? ds("green", 500) : ds("blue", 500)} />
      </div>

      {/* The animal, either standing on the same line as the last line of
          words or hung from the top-right corner, level with the mark and as
          far in from the right as the mark is from the left. Either way it
          keeps clear of the bottom-right corner, where YouTube prints the
          running time. */}
      <div
        style={{
          position: "absolute",
          ...(top ? { right: PAD, width: 400, top: 52, height: 510 } : { left: 790, right: 90, top: 150, bottom: 60 }),
          display: "flex",
          alignItems: top ? "flex-start" : "flex-end",
          justifyContent: top ? "flex-end" : "center",
        }}
      >
        <Illustration
          video={t.art.video}
          id={t.art.id}
          style={{ maxWidth: "100%", maxHeight: "100%", width: "auto", height: "auto", objectFit: "contain" }}
        />
      </div>

      <div style={{ position: "absolute", left: PAD, bottom: 56 }}>
        {course ? (
          // On the title's line pitch whatever its size, with nothing added:
          // every line of the block is one step apart.
          <div style={{ ...type(kick, ds("blue", 500)), lineHeight: `${1.1 * SIZE}px` }}>Full Course</div>
        ) : null}
        {!course && labelFirst ? <Lines lines={INTERVIEW[label]} style={type(SIZE, labelInk)} /> : null}
        <Lines lines={t.title} style={type(SIZE, course || role === "black" ? INK : role === "green" ? GREEN[greenShade] : ds("blue", 500))} />
        {!course && !labelFirst ? <Lines lines={INTERVIEW[label]} style={type(SIZE, labelInk)} /> : null}
      </div>
    </AbsoluteFill>
  );
};

export const THUMBNAIL = { width: W, height: H } as const;

const cap = (x: string) => x.replace(/(^|-)(\w)/g, (_, d: string, c: string) => c.toUpperCase());

/** Every thumbnail the Studio shows: a course with "Full Course" smaller
 *  than its title or at its size, the animal low or high; and an interview
 *  track saying "Interview Questions" after its role in green (the series'
 *  color), blue or black, with the animal hung top-right. Other labels and
 *  greys are props (`label`, `tone`, `greenShade`). */
export const THUMBNAILS: { id: string; props: ThumbnailProps }[] = Object.entries(TRACKS).flatMap(([track, t]): { id: string; props: ThumbnailProps }[] =>
  t.kind === "course"
    ? (["bottom", "top"] as const).flatMap((artAt) =>
        (["small", "same"] as const).map((kicker) => ({ id: `Thumb-${track}-${cap(kicker)}-${cap(artAt)}`, props: { track, kicker, artAt } })),
      )
    : [
        ...(["green", "blue", "black"] as const).map((role) => ({
          id: `Thumb-${track}-Questions-${cap(role)}Role-Top`,
          props: { track, label: "questions" as const, tone: "black" as const, role, artAt: "top" as const },
        })),
        // The role in black and the label in green, after the role or above
        // it as "Full Course" sits above a course's title.
        { id: `Thumb-${track}-Questions-GreenLabel-Top`, props: { track, label: "questions", tone: "green", role: "black", artAt: "top" } },
        { id: `Thumb-${track}-Questions-GreenLabelFirst-Top`, props: { track, label: "questions", tone: "green", role: "black", artAt: "top", labelFirst: true } },
      ],
);
