import React from "react";
import { Composition, Folder } from "remotion";
import "./theme/brand";
import "./theme/fonts";
import { narratedMetadata, type NarratedProps } from "./narration/metadata";
import { SqlExecutionOrder } from "./videos/sql-execution-order/Video";
import { script as sqlScript } from "./videos/sql-execution-order/script";
import { TabsVsSpaces } from "./videos/tabs-vs-spaces/Video";
import { script as tabsScript } from "./videos/tabs-vs-spaces/script";

// Every composition is laid out in 1080p CSS pixels and rendered with
// `--scale=2` for 4K (3840x2160, or 2160x3840 for vertical). Duration comes
// from the narration timeline, so `durationInFrames` here is a placeholder
// that `calculateMetadata` replaces.
const FPS = 30;

export const RemotionRoot: React.FC = () => (
  <>
    <Folder name="Landscape">
      <Composition
        id="SqlExecutionOrder"
        component={SqlExecutionOrder}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={FPS * 60}
        defaultProps={{ timeline: null, captions: true } satisfies NarratedProps}
        calculateMetadata={narratedMetadata<NarratedProps>(sqlScript)}
      />
    </Folder>
    <Folder name="Vertical">
      <Composition
        id="TabsVsSpaces"
        component={TabsVsSpaces}
        width={1080}
        height={1920}
        fps={FPS}
        durationInFrames={FPS * 45}
        defaultProps={{ timeline: null, captions: true } satisfies NarratedProps}
        calculateMetadata={narratedMetadata<NarratedProps>(tabsScript)}
      />
    </Folder>
  </>
);
