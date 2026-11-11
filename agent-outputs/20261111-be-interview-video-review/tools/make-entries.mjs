// Writes video/out/entries/<Id>.tsx for the ten Backend videos: each registers
// one composition on its own, so a fixer's checks bundle only its own folder
// (README, "Checking one video while others are mid-edit"). Run from video/.
import { mkdirSync, writeFileSync } from "node:fs";
const VIDEOS = [
  ["BackendEngineer-0-Interview", "be-interview", "BeInterview"],
  ["BackendEngineer-1-SystemDesign", "be-system-design", "BeSystemDesign"],
  ["BackendEngineer-2-Scaling", "be-scaling", "BeScaling"],
  ["BackendEngineer-3-ApiDesign", "be-api-design", "BeApiDesign"],
  ["BackendEngineer-4-Databases", "be-databases", "BeDatabases"],
  ["BackendEngineer-5-Concurrency", "be-concurrency", "BeConcurrency"],
  ["BackendEngineer-6-ObjectDesign", "be-object-design", "BeObjectDesign"],
  ["BackendEngineer-7-CodeReview", "be-code-review", "BeCodeReview"],
  ["BackendEngineer-8-Algorithms", "be-algorithms", "BeAlgorithms"],
  ["BackendEngineer-9-AiRound", "be-ai-round", "BeAiRound"],
];
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
