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
 * Thumbnails are seen small (about 168x94 on a phone), so the words are few,
 * set huge in Inter 800, and nothing that matters sits in the bottom-right
 * corner, where YouTube prints the running time.
 *
 * - `split`: white page, the words on the left, the animal large on the right.
 * - `spotlight`: the same, with the animal on a pale brand-blue disc.
 * - `panel`: the words in white on a brand-blue panel, the animal on the white
 *   beside it, stepping over the panel's edge.
 */
export type ThumbnailDesign = "split" | "spotlight" | "panel";

export type Track = {
  /** The pill above the title: what kind of video this is. */
  kicker: string;
  /** The title, one array entry per line. */
  lines: string[];
  /** A short line under the title, in the brand blue. */
  tail?: string;
  /** The title's size in px, chosen so its longest line fits. */
  size: number;
  /** The watercolor animal: its folder under public/images/, and its id. */
  art: { video: string; id: string };
};

export const TRACKS: Record<string, Track> = {
  Statistics: {
    kicker: "Full course · 9 units",
    lines: ["Statistics for", "Data Science"],
    tail: "with Python",
    size: 86,
    art: { video: "thumbnails", id: "thumb-owl" },
  },
  DatabaseDesign: {
    kicker: "Full course · 9 units",
    lines: ["Database", "Design"],
    tail: "with PostgreSQL",
    size: 120,
    art: { video: "thumbnails", id: "thumb-elephant" },
  },
  LargeLanguageModels: {
    kicker: "Full course · 5 units",
    lines: ["How large", "language", "models work"],
    size: 96,
    art: { video: "thumbnails", id: "thumb-llama" },
  },
  NaturalLanguageProcessing: {
    kicker: "Full course · 5 units",
    lines: ["Natural", "language", "processing"],
    tail: "with Python",
    size: 92,
    art: { video: "thumbnails", id: "thumb-parrot" },
  },
  DataAnalyst: {
    kicker: "Interview prep · 9 parts",
    lines: ["Data", "Analyst"],
    tail: "interview, every question",
    size: 132,
    art: { video: "thumbnails", id: "thumb-raccoon" },
  },
  DataScientist: {
    kicker: "Interview prep · 12 parts",
    lines: ["Data", "Scientist"],
    tail: "interview, every question",
    size: 124,
    art: { video: "ds-interview", id: "ds-interview-otter" },
  },
  DataEngineer: {
    kicker: "Interview prep · 12 parts",
    lines: ["Data", "Engineer"],
    tail: "interview, every question",
    size: 128,
    art: { video: "de-interview", id: "de-interview-meerkat" },
  },
};

export type ThumbnailProps = { design: ThumbnailDesign; track: keyof typeof TRACKS };

const W = 1280;
const H = 720;
/** Where the words start, and how wide they may run. */
const PAD = 64;

/** The mark and wordmark, as the site header sets them. */
const Lockup: React.FC<{ color: string; ink: string }> = ({ color, ink }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
    {/* A motion that has long since landed draws the finished mark. */}
    <AnimatedMark motion="assemble" at={-120} height={40} color={color} />
    <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 40 * 1.38 * 0.8, letterSpacing: "-0.025em", color: ink }}>Dataslope</span>
  </div>
);

export const Thumbnail: React.FC<ThumbnailProps> = ({ design, track }) => {
  const t = TRACKS[track];
  const panel = design === "panel";
  const ink = panel ? "var(--ds-white)" : INK;
  const accent = panel ? ds("yellow", 300) : ds("blue", 500);
  const textWidth = panel ? 660 : 700;
  return (
    <AbsoluteFill style={{ background: "var(--ds-white)" }}>
      {panel ? <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 760, background: ds("blue", 700) }} /> : null}
      {design === "spotlight" ? (
        <div
          style={{
            position: "absolute",
            left: 760,
            top: 70,
            width: 580,
            height: 580,
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
          left: panel ? 680 : 740,
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

      <div
        style={{
          position: "absolute",
          left: PAD,
          top: 52,
          bottom: 56,
          width: textWidth,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <Lockup color={panel ? "var(--ds-white)" : ds("blue", 500)} ink={ink} />
        <div>
          <div
            style={{
              display: "inline-block",
              fontFamily: SANS,
              fontWeight: 700,
              fontSize: 30,
              letterSpacing: "-0.01em",
              padding: "8px 18px 10px",
              borderRadius: 999,
              background: panel ? "var(--ds-white)" : ds("blue", 500),
              color: panel ? ds("blue", 700) : "var(--ds-white)",
              marginBottom: 22,
            }}
          >
            {t.kicker}
          </div>
          <div
            style={{
              fontFamily: SANS,
              fontWeight: 800,
              fontSize: t.size,
              lineHeight: 0.98,
              letterSpacing: "-0.035em",
              color: ink,
            }}
          >
            {t.lines.map((l) => (
              <div key={l} style={{ whiteSpace: "nowrap" }}>
                {l}
              </div>
            ))}
          </div>
          {t.tail ? (
            <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 44, letterSpacing: "-0.02em", color: accent, marginTop: 14 }}>{t.tail}</div>
          ) : null}
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const THUMBNAIL = { width: W, height: H } as const;
