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

/**
 * The narration, burned in and paged a few words at a time, with the word
 * being spoken highlighted. Doubles as the review tool while there is no
 * audio: it shows exactly when the timeline thinks each word lands.
 */
export const Captions: React.FC<{ variant: Variant }> = ({ variant }) => {
  const { timeline } = useNarration();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const style = STYLE[variant];
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

  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-end",
        alignItems: "center",
        paddingBottom: style.bottom,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          maxWidth: style.maxWidth,
          padding: `${style.fontSize * 0.3}px ${style.fontSize * 0.6}px`,
          borderRadius: style.fontSize * 0.45,
          background: `color-mix(in srgb, ${ds("gray", 900)} 84%, transparent)`,
          color: "var(--ds-white)",
          fontFamily: SANS,
          fontWeight: variant === "portrait" ? 800 : 600,
          fontSize: style.fontSize,
          lineHeight: 1.25,
          textAlign: "center",
          whiteSpace: "pre-wrap",
        }}
      >
        {page.tokens.map((t) => {
          const active = ms >= t.fromMs && ms < t.toMs;
          return (
            <span
              key={t.fromMs}
              style={{ color: active ? ds("yellow") : colors.page }}
            >
              {t.text}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
