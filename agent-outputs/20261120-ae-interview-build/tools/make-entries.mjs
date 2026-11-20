// Writes video/out/entries/<Id>.tsx for the ten Analytics Engineer videos:
// each registers one composition on its own, so a builder's checks bundle
// only its own folder (README, "Checking one video while others are
// mid-edit"). Run from video/.
import { mkdirSync, writeFileSync } from "node:fs";
import { VIDEOS } from "../../agent-outputs/20261120-ae-interview-build/tools/videos.mjs";
mkdirSync("out/entries", { recursive: true });
for (const [id, folder, comp] of VIDEOS) {
  writeFileSync(
    `out/entries/${id}.tsx`,
    `import React from "react";
import { Composition, registerRoot } from "remotion";
import "../../src/theme/brand";
import "../../src/theme/fonts";
import { narratedMetadata } from "../../src/narration/metadata";
import { EDITORIAL_DEFAULTS, type EditorialProps } from "../../src/editorial/Page";
import { ${comp} } from "../../src/videos/${folder}/Video";
import { script } from "../../src/videos/${folder}/script";

const Root: React.FC = () => (
  <Composition
    id="${id}"
    component={${comp}}
    width={1920}
    height={1080}
    fps={30}
    durationInFrames={30 * 60}
    defaultProps={{ ...EDITORIAL_DEFAULTS, sfx: true }}
    calculateMetadata={narratedMetadata<EditorialProps>(script)}
  />
);
registerRoot(Root);
`,
  );
}
console.log(VIDEOS.length, "entries");
