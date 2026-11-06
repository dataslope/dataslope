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

/** How an interview track names itself. "Interview Preparation" is too wide
 *  for one line at SIZE, so it takes two. */
export type InterviewLabel = "prep" | "preparation";
const INTERVIEW: Record<InterviewLabel, string[]> = {
  prep: ["Interview Prep"],
  preparation: ["Interview", "Preparation"],
};

/** The color an interview label is set in: the title's black, the brand's
 *  soft ink (gray 600), or a step lighter (gray 500). All clear AA on white. */
export type LabelTone = "black" | "gray-600" | "gray-500";

export type ThumbnailProps = {
  track: keyof typeof TRACKS;
  label?: InterviewLabel;
  tone?: LabelTone;
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

const TONE: Record<LabelTone, string> = { black: INK, "gray-600": ds("gray", 600), "gray-500": ds("gray", 500) };

export const Thumbnail: React.FC<ThumbnailProps> = ({ track, label = "prep", tone = "gray-600", kicker = "small", artAt = "bottom" }) => {
  const t = TRACKS[track];
  const course = t.kind === "course";
  const kick = kicker === "same" ? SIZE : KICKER;
  const top = artAt === "top";
  return (
    <AbsoluteFill style={{ background: "var(--ds-white)" }}>
      {/* The mark alone, no wordmark. A motion that has long since landed
          draws the finished mark. */}
      <div style={{ position: "absolute", left: PAD, top: 52 }}>
        <AnimatedMark motion="assemble" at={-120} height={56} color={ds("blue", 500)} />
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
          <div style={{ ...type(kick, ds("blue", 500)), marginBottom: kicker === "same" ? 0.12 * SIZE : 0.2 * KICKER }}>Full Course</div>
        ) : null}
        <Lines lines={t.title} style={type(SIZE, INK)} />
        {course ? null : (
          <div style={{ marginTop: 0.12 * SIZE }}>
            <Lines lines={INTERVIEW[label]} style={type(SIZE, TONE[tone])} />
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};

export const THUMBNAIL = { width: W, height: H } as const;

const cap = (x: string) => x.replace(/(^|-)(\w)/g, (_, d: string, c: string) => c.toUpperCase());

/** Every thumbnail the Studio shows, with the animal low or high: a course
 *  with "Full Course" smaller than its title or at its size, and an
 *  interview track saying "Interview Prep" or "Interview Preparation" in
 *  black or either grey. */
export const THUMBNAILS: { id: string; props: ThumbnailProps }[] = Object.entries(TRACKS).flatMap(([track, t]) =>
  (["bottom", "top"] as const).flatMap((artAt): { id: string; props: ThumbnailProps }[] =>
    t.kind === "course"
      ? (["small", "same"] as const).map((kicker) => ({
          id: `Thumb-${track}-${cap(kicker)}-${cap(artAt)}`,
          props: { track, kicker, artAt },
        }))
      : (["prep", "preparation"] as InterviewLabel[]).flatMap((label) =>
          (["black", "gray-600", "gray-500"] as LabelTone[]).map((tone) => ({
            id: `Thumb-${track}-${cap(label)}-${cap(tone)}-${cap(artAt)}`,
            props: { track, label, tone, artAt },
          })),
        ),
  ),
);
