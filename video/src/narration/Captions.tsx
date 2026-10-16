import { createTikTokStyleCaptions } from "@remotion/captions";
import React, { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, ds } from "../theme/brand";
import { SANS } from "../theme/fonts";
import { useNarration } from "./NarrationContext";

type Variant = "landscape" | "portrait";

const STYLE: Record<
  Variant,
  { fontSize: number; bottom: number; maxWidth: number; pageMs: number }
> = {
  // A two-line band under the action, the way a lecture is subtitled.
  landscape: { fontSize: 40, bottom: 44, maxWidth: 1400, pageMs: 2400 },
  // Big, few words at a time, the way short-form video is captioned.
  portrait: { fontSize: 64, bottom: 360, maxWidth: 900, pageMs: 1100 },
};

/** How the captions look. Every field is optional; a video in its own visual
 *  style (chalk, pixel, blueprint…) overrides the ones it needs. */
export type CaptionLook = {
  fontFamily: string;
  fontWeight: number;
  fontSize: number;
  /** Text and the word being spoken. */
  color: string;
  highlight: string;
  /** The box behind the text; "transparent" for none. */
  background: string;
  radius: number;
  /** Distance from the bottom edge, in px. */
  bottom: number;
  maxWidth: number;
  textTransform: React.CSSProperties["textTransform"];
  letterSpacing: string;
  /** Extra styles for the box, e.g. a border or a text shadow. */
  box: React.CSSProperties;
};

/**
 * The narration, burned in and paged a few words at a time, with the word
 * being spoken highlighted. Doubles as the review tool while there is no
 * audio: it shows exactly when the timeline thinks each word lands.
 */
export const Captions: React.FC<{ variant: Variant; look?: Partial<CaptionLook> }> = ({
  variant,
  look = {},
}) => {
  const { timeline } = useNarration();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const style = STYLE[variant];
  const fontSize = look.fontSize ?? style.fontSize;
  const { pages } = useMemo(
    () =>
      createTikTokStyleCaptions({
        captions: timeline.captions,
        combineTokensWithinMilliseconds: style.pageMs,
      }),
    [timeline.captions, style.pageMs],
  );
  const ms = (frame / fps) * 1000;
  // A page lasts until the next one starts; only the last lingers a moment.
  const page = pages.find(
    (p, i) =>
      ms >= p.startMs &&
      ms < p.startMs + p.durationMs + (i === pages.length - 1 ? 600 : 0),
  );
  if (!page) return null;

  const color = look.color ?? colors.page;
  const highlight = look.highlight ?? ds("yellow");
  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-end",
        alignItems: "center",
        paddingBottom: look.bottom ?? style.bottom,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          maxWidth: look.maxWidth ?? style.maxWidth,
          padding: `${fontSize * 0.3}px ${fontSize * 0.6}px`,
          borderRadius: look.radius ?? fontSize * 0.45,
          background:
            look.background ?? `color-mix(in srgb, ${ds("gray", 900)} 84%, transparent)`,
          color,
          fontFamily: look.fontFamily ?? SANS,
          fontWeight: look.fontWeight ?? (variant === "portrait" ? 800 : 600),
          fontSize,
          lineHeight: 1.25,
          textAlign: "center",
          whiteSpace: "pre-wrap",
          textTransform: look.textTransform,
          letterSpacing: look.letterSpacing,
          ...look.box,
        }}
      >
        {page.tokens.map((t) => {
          const active = ms >= t.fromMs && ms < t.toMs;
          return (
            <span key={t.fromMs} style={{ color: active ? highlight : color }}>
              {t.text}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
