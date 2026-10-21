import React from "react";
import { AbsoluteFill } from "remotion";
import { Captions } from "../narration/Captions";
import type { NarratedProps } from "../narration/metadata";
import { NarrationAudio } from "../narration/NarrationAudio";
import { NarrationProvider } from "../narration/NarrationContext";
import { SfxContext } from "../sound/Sfx";
import { ds } from "../theme/brand";
import { SERIF } from "./fonts";
import { LayoutContext, layoutFor } from "./layout";
import { INK, PAPER } from "./style";
import { type TypefaceId, TYPEFACES, typefaceVars } from "./typefaces";

/** Props of every editorial video. */
export type EditorialProps = NarratedProps & {
  /** The face for headlines, decks and captions (typefaces.ts). */
  typeface: TypefaceId;
  /** Play the scenes' sound effects (src/sound/Sfx.tsx). Off by default. */
  sfx?: boolean;
};

/** The house setting: Source Serif 4, and the figures get the whole page. */
export const EDITORIAL_DEFAULTS = {
  timeline: null,
  captions: false,
  typeface: "source-serif",
} as const satisfies EditorialProps;

/** How far every scene sits above where it was laid out, in px. The pages
 *  were drawn under a running head; without one, the content and the
 *  captions move up a little and the top of the page gets the air. */
const LIFT = 24;

/**
 * The page an editorial video is printed on: plain white, the chosen face set
 * on the root as custom properties (style.ts reads them), and the vertical
 * layout for the captions setting (layout.ts). With `captions` on, the
 * narration runs as a serif lower third; off, the figures take that space.
 *
 * Scenes are laid out at 1920x1080 in the coordinates `useLayout()` maps.
 */
export const EditorialPage: React.FC<EditorialProps & { children: React.ReactNode }> = ({
  timeline,
  captions,
  typeface,
  sfx = false,
  children,
}) => {
  if (!timeline) return <AbsoluteFill style={{ background: PAPER }} />;
  const face = TYPEFACES[typeface];
  return (
    <NarrationProvider timeline={timeline}>
      <SfxContext.Provider value={sfx}>
        <LayoutContext.Provider value={layoutFor(captions)}>
          <AbsoluteFill style={{ background: PAPER, ...typefaceVars(face) }}>
            <AbsoluteFill style={{ transform: `translateY(${-LIFT}px)` }}>{children}</AbsoluteFill>
            <NarrationAudio />
            {captions ? (
              <Captions
                variant="landscape"
                look={{
                  fontFamily: SERIF,
                  fontWeight: face.captionWeight,
                  fontSize: Math.round(36 * face.bodyScale),
                  color: INK,
                  highlight: "var(--ds-blue-ink)",
                  background: `color-mix(in srgb, ${PAPER} 94%, transparent)`,
                  radius: 0,
                  bottom: 52,
                  maxWidth: 1480,
                  box: {
                    padding: "12px 44px 14px",
                    borderTop: `2px solid ${INK}`,
                    borderBottom: `1px solid color-mix(in srgb, ${INK} 45%, transparent)`,
                    fontVariationSettings: face.bodyAxes,
                    boxShadow: `0 -18px 30px -24px color-mix(in srgb, ${ds("yellow", 900)} 30%, transparent)`,
                  },
                }}
              />
            ) : null}
          </AbsoluteFill>
        </LayoutContext.Provider>
      </SfxContext.Provider>
    </NarrationProvider>
  );
};
