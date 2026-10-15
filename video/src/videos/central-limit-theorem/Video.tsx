import React from "react";
import { AbsoluteFill } from "remotion";
import { Scene } from "../../components/Scene";
import { Captions } from "../../narration/Captions";
import type { NarratedProps } from "../../narration/metadata";
import { NarrationAudio } from "../../narration/NarrationAudio";
import { NarrationProvider, useNarration } from "../../narration/NarrationContext";
import { ds } from "../../theme/brand";
import { BuildScene } from "./BuildScene";
import { ShapesScene } from "./ShapesScene";
import { SpreadScene } from "./SpreadScene";
import { ThumbScene } from "./ThumbScene";
import { SERIF } from "./fonts";
import { LayoutContext, layoutFor } from "./layout";
import { INK, PAPER } from "./style";
import { type TypefaceId, TYPEFACES, typefaceVars } from "./typefaces";
import { Paper } from "./ui";

export type CltProps = NarratedProps & {
  /** The face for headlines, decks and captions (typefaces.ts). */
  typeface: TypefaceId;
};

/** Frames a scene is up before its beat's first word. */
const LEAD = 8;
/** Frames each scene stays up into the next, so cuts cross-fade. */
const OVERLAP = 6;
/** How far every scene sits above where it was laid out, in px. The pages
 *  were drawn under a running head; without one, the content and the
 *  captions move up a little and the top of the page gets the air. */
const LIFT = 24;

/**
 * "The Central Limit Theorem" (16:9), as a print magazine's science pages:
 * warm paper, serif headlines, numbered figures drawn from a seeded
 * simulation (data.ts), and the narration as a serif lower third.
 *
 * Two props make the variants in Root.tsx: `typeface` swaps the headline and
 * caption face, and turning `captions` off hands their space to the figures
 * (layout.ts).
 *
 * Every scene boundary is a narration cue: a scene starts just before its
 * beat and stays up a few frames into the next, so new audio re-times the
 * cuts along with every animation inside them.
 */
const Scenes: React.FC = () => {
  const { beat, durationInFrames } = useNarration();
  const cut = (id: string) => beat(id).from - LEAD;
  const until = (frame: number) => frame + OVERLAP;
  return (
    <>
      <Scene from={0} to={until(cut("any-shape"))} fade={6}>
        <BuildScene />
      </Scene>
      <Scene from={cut("any-shape")} to={until(cut("thumb"))} fade={6}>
        <ShapesScene />
      </Scene>
      <Scene from={cut("thumb")} to={until(cut("spread"))} fade={6}>
        <ThumbScene />
      </Scene>
      <Scene from={cut("spread")} to={durationInFrames + OVERLAP} fade={6}>
        <SpreadScene />
      </Scene>
    </>
  );
};

export const CentralLimitTheorem: React.FC<CltProps> = ({ timeline, captions, typeface }) => {
  if (!timeline) return <AbsoluteFill style={{ background: PAPER }} />;
  const face = TYPEFACES[typeface];
  return (
    <NarrationProvider timeline={timeline}>
      <LayoutContext.Provider value={layoutFor(captions)}>
        <AbsoluteFill style={{ background: PAPER, ...typefaceVars(face) }}>
          <Paper />
          <AbsoluteFill style={{ transform: `translateY(${-LIFT}px)` }}>
            <Scenes />
          </AbsoluteFill>
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
    </NarrationProvider>
  );
};
