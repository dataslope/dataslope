import React from "react";
import { AbsoluteFill } from "remotion";
import { Illustration } from "../components/Illustration";
import { HAIRLINE, INK } from "../editorial/style";
import { AnimatedMark } from "../reveals/Mark";
import { ds } from "../theme/brand";
import { SANS } from "../theme/fonts";

/**
 * YouTube thumbnails for the merged videos: one per course and interview
 * track, each with its own watercolor animal (src/thumbnails/illustrations.json,
 * and the otter and meerkat of the interview overviews), so the seven read
 * apart at a glance in a list of results.
 *
 * Set like the openers: every word at one size, SIZE, and no weight above
 * 600, so weight and color tell the lines apart rather than size. The
 * wordmark is the one exception, set as the site header sets it. No pills,
 * no badges: the words sit on the page.
 *
 * Thumbnails are seen small (about 168x94 on a phone, where SIZE is about
 * 10px), so the words are few, and nothing that matters sits in the
 * bottom-right corner, where YouTube prints the running time.
 *
 * - `clean`: white page, the words low on the left, the animal on the right.
 * - `spotlight`: the same, with the animal on a pale brand-blue disc.
 * - `panel`: the words in white on a brand-blue panel, the animal on the white
 *   beside it, stepping over the panel's edge.
 * - `columns`: the columns opener's scheme: a hairline down the left of the
 *   words, the kind of video in black, the title in blue.
 */
export type ThumbnailDesign = "clean" | "spotlight" | "panel" | "columns";

/** How an interview track names itself. */
export type InterviewLabel = "prep" | "preparation";

export type Track = {
  kind: "course" | "interview";
  /** The title, one array entry per line, at weight 600. */
  title: string[];
  /** What follows the title ("with Python"), at weight 400. */
  sub?: string[];
  /** The watercolor animal: its folder under public/images/, and its id. */
  art: { video: string; id: string };
};

export const TRACKS: Record<string, Track> = {
  Statistics: {
    kind: "course",
    title: ["Statistics for", "Data Science"],
    sub: ["with Python"],
    art: { video: "thumbnails", id: "thumb-owl" },
  },
  DatabaseDesign: {
    kind: "course",
    title: ["Database Design"],
    sub: ["with PostgreSQL"],
    art: { video: "thumbnails", id: "thumb-elephant" },
  },
  LargeLanguageModels: {
    kind: "course",
    title: ["How Large", "Language", "Models Work"],
    art: { video: "thumbnails", id: "thumb-llama" },
  },
  NaturalLanguageProcessing: {
    kind: "course",
    title: ["Natural Language", "Processing"],
    sub: ["with Python"],
    art: { video: "thumbnails", id: "thumb-parrot" },
  },
  DataAnalyst: { kind: "interview", title: ["Data Analyst"], art: { video: "thumbnails", id: "thumb-raccoon" } },
  DataScientist: { kind: "interview", title: ["Data Scientist"], art: { video: "ds-interview", id: "ds-interview-otter" } },
  DataEngineer: { kind: "interview", title: ["Data Engineer"], art: { video: "de-interview", id: "de-interview-meerkat" } },
};

/** The kind of video, as a line of its own. "Interview Preparation" is too
 *  wide for one line at SIZE, so it takes two. */
const KIND: Record<"course" | InterviewLabel, string[]> = {
  course: ["Full Course"],
  prep: ["Interview Prep"],
  preparation: ["Interview", "Preparation"],
};

export type ThumbnailProps = { design: ThumbnailDesign; track: keyof typeof TRACKS; label?: InterviewLabel };

const W = 1280;
const H = 720;
/** Where the words start. */
const PAD = 64;
/** The one size every word is set at. The widest line, "Natural Language"
 *  in Inter 600, measures 658px at 80px, inside the 680px the words have. */
export const SIZE = 80;

/** The mark and wordmark, as the site header sets them. */
const Lockup: React.FC<{ color: string; ink: string }> = ({ color, ink }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
    {/* A motion that has long since landed draws the finished mark. */}
    <AnimatedMark motion="assemble" at={-120} height={40} color={color} />
    <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 40 * 1.38 * 0.8, letterSpacing: "-0.025em", color: ink }}>Dataslope</span>
  </div>
);

type Run = { lines: string[]; weight: 400 | 600; color: string; gapBefore?: boolean };

const Words: React.FC<{ runs: Run[] }> = ({ runs }) => (
  <div>
    {runs.map((r, i) => (
      <div key={i} style={{ marginTop: r.gapBefore ? 0.28 * SIZE : 0 }}>
        {r.lines.map((l) => (
          <div
            key={l}
            style={{
              fontFamily: SANS,
              fontSize: SIZE,
              fontWeight: r.weight,
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
              whiteSpace: "nowrap",
              color: r.color,
            }}
          >
            {l}
          </div>
        ))}
      </div>
    ))}
  </div>
);

export const Thumbnail: React.FC<ThumbnailProps> = ({ design, track, label = "prep" }) => {
  const t = TRACKS[track];
  const kind = KIND[t.kind === "course" ? "course" : label];
  const sub = t.sub ?? [];
  const panel = design === "panel";
  const columns = design === "columns";
  const white = "var(--ds-white)";
  const blue = ds("blue", 500);

  // Title, then what follows it, then the kind of video in an accent; or, in
  // the opener's scheme, the kind first in black and the title in blue.
  const runs: Run[] = columns
    ? [
        { lines: kind, weight: 400, color: INK },
        { lines: t.title, weight: 600, color: blue },
        { lines: sub, weight: 400, color: INK },
      ]
    : [
        { lines: t.title, weight: 600, color: panel ? white : INK },
        { lines: sub, weight: 400, color: panel ? white : INK },
        { lines: kind, weight: 600, color: panel ? ds("yellow", 300) : blue, gapBefore: true },
      ];

  return (
    <AbsoluteFill style={{ background: white }}>
      {panel ? <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 780, background: ds("blue", 700) }} /> : null}
      {design === "spotlight" ? (
        <div
          style={{
            position: "absolute",
            left: 736,
            top: 92,
            width: 520,
            height: 520,
            borderRadius: "50%",
            background: ds("blue", 100),
          }}
        />
      ) : null}

      {/* The animal, standing on the bottom of its box and kept clear of the
          bottom-right corner, where YouTube prints the running time. */}
      <div
        style={{
          position: "absolute",
          left: panel ? 700 : 760,
          right: panel ? 30 : 40,
          top: 40,
          bottom: 56,
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

      <div style={{ position: "absolute", left: PAD, top: 52 }}>
        <Lockup color={panel ? white : blue} ink={panel ? white : INK} />
      </div>

      {columns ? (
        // Centred in the page below the lockup, a hairline down its left.
        <div style={{ position: "absolute", left: PAD, top: 120, bottom: 56, display: "flex", alignItems: "center" }}>
          <div style={{ borderLeft: `2px solid ${HAIRLINE}`, paddingLeft: 28 }}>
            <Words runs={runs} />
          </div>
        </div>
      ) : (
        <div style={{ position: "absolute", left: PAD, bottom: 56 }}>
          <Words runs={runs} />
        </div>
      )}
    </AbsoluteFill>
  );
};

export const THUMBNAIL = { width: W, height: H } as const;

/** Every thumbnail the Studio shows: each design for each track, and the
 *  interview tracks a second time saying "Interview Preparation". */
export const THUMBNAILS: { id: string; props: ThumbnailProps }[] = (["clean", "spotlight", "panel", "columns"] as ThumbnailDesign[]).flatMap((design) => {
  const name = design[0].toUpperCase() + design.slice(1);
  return Object.entries(TRACKS).flatMap(([track, t]) =>
    t.kind === "course"
      ? [{ id: `Thumb-${name}-${track}`, props: { design, track } }]
      : (["prep", "preparation"] as InterviewLabel[]).map((label) => ({
          id: `Thumb-${name}-${track}-${label === "prep" ? "Prep" : "Preparation"}`,
          props: { design, track, label },
        })),
  );
});
