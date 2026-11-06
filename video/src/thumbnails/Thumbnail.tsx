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

/** The neutral grey an interview label is set in: the brand's soft ink
 *  (gray 600) or a step lighter (gray 500). Both clear AA on white. */
export type LabelTone = "gray-600" | "gray-500";

export type ThumbnailProps = { track: keyof typeof TRACKS; label?: InterviewLabel; tone?: LabelTone };

const W = 1280;
const H = 720;
/** Where the words start. */
const PAD = 64;
/** The title's size. The widest line, "Natural Language" in Inter 500,
 *  measures about 650px at 80px, inside the 680px the words have. */
export const SIZE = 80;
/** "Full Course", above a course's title: smaller, so the title leads. */
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

export const Thumbnail: React.FC<ThumbnailProps> = ({ track, label = "prep", tone = "gray-600" }) => {
  const t = TRACKS[track];
  const course = t.kind === "course";
  return (
    <AbsoluteFill style={{ background: "var(--ds-white)" }}>
      {/* The mark alone, no wordmark. A motion that has long since landed
          draws the finished mark. */}
      <div style={{ position: "absolute", left: PAD, top: 52 }}>
        <AnimatedMark motion="assemble" at={-120} height={56} color={ds("blue", 500)} />
      </div>

      {/* The animal, standing on the same line as the last line of words and
          kept clear of the bottom-right corner, where YouTube prints the
          running time. */}
      <div
        style={{
          position: "absolute",
          left: 790,
          right: 90,
          top: 150,
          bottom: 60,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
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
          <div style={{ ...type(KICKER, ds("blue", 500)), marginBottom: 0.2 * KICKER }}>Full Course</div>
        ) : null}
        <Lines lines={t.title} style={type(SIZE, INK)} />
        {course ? null : (
          <div style={{ marginTop: 0.12 * SIZE }}>
            <Lines lines={INTERVIEW[label]} style={type(SIZE, ds("gray", tone === "gray-600" ? 600 : 500))} />
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};

export const THUMBNAIL = { width: W, height: H } as const;

/** Every thumbnail the Studio shows: one per course, and each interview
 *  track saying "Interview Prep" or "Interview Preparation", in either grey. */
export const THUMBNAILS: { id: string; props: ThumbnailProps }[] = Object.entries(TRACKS).flatMap(([track, t]) =>
  t.kind === "course"
    ? [{ id: `Thumb-${track}`, props: { track } }]
    : (["prep", "preparation"] as InterviewLabel[]).flatMap((label) =>
        (["gray-600", "gray-500"] as LabelTone[]).map((tone) => ({
          id: `Thumb-${track}-${label === "prep" ? "Prep" : "Preparation"}-${tone === "gray-600" ? "Gray600" : "Gray500"}`,
          props: { track, label, tone },
        })),
      ),
);
