// Scratch (gitignored): an entry point that registers DbDesign-2-Entities
// alone, exactly as Root.tsx does, so its stills and previews still bundle
// while other agents' half-built folders break the shared Root.
import React from "react";
import { Composition, registerRoot } from "remotion";
import "../src/theme/brand";
import "../src/theme/fonts";
import { narratedMetadata } from "../src/narration/metadata";
import { EDITORIAL_DEFAULTS, type EditorialProps } from "../src/editorial/Page";
import { DbEntities } from "../src/videos/db-entities/Video";
import { script } from "../src/videos/db-entities/script";

const Root: React.FC = () => (
  <Composition
    id="DbDesign-2-Entities"
    component={DbEntities}
    width={1920}
    height={1080}
    fps={30}
    durationInFrames={30 * 60}
    defaultProps={{ ...EDITORIAL_DEFAULTS, sfx: true }}
    calculateMetadata={narratedMetadata<EditorialProps>(script)}
  />
);
registerRoot(Root);
