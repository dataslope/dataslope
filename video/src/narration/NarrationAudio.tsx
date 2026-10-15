import React from "react";
import { Html5Audio, Sequence, staticFile } from "remotion";
import { useNarration } from "./NarrationContext";

/** Plays each beat's audio at the moment the timeline gives it. Beats with
 *  no audio yet (estimated timing) are silent. */
export const NarrationAudio: React.FC = () => {
  const { timeline, frame } = useNarration();
  return (
    <>
      {timeline.beats.map((beat) =>
        beat.audio ? (
          <Sequence key={beat.id} from={frame(beat.start)} layout="none">
            <Html5Audio src={staticFile(beat.audio)} />
          </Sequence>
        ) : null,
      )}
    </>
  );
};
