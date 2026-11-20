// Registers Analytics Engineer videos in src/Root.tsx (the folders named on
// the command line, or all ten), in series order, and writes a placeholder
// Video.tsx where a folder has none. Idempotent. Run from video/.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
const { VIDEOS } = await import("/home/user/dataslope/agent-outputs/20261120-ae-interview-build/tools/videos.mjs");
const want = process.argv.slice(2);
const root = "src/Root.tsx";
let src = readFileSync(root, "utf8");
const camel = (folder) => folder.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
const pick = VIDEOS.filter(([, f]) => (want.length ? want.includes(f) : true));
const registered = VIDEOS.filter(([id]) => src.includes(`id="${id}"`)).map(([, f]) => f);
const all = VIDEOS.filter(([, f]) => registered.includes(f) || pick.some(([, g]) => g === f));
// Strip any earlier block, then write the whole block again in series order.
src = src
  .replace(/\/\/ Analytics Engineer interview prep \(2026-11-20\)\.\n/, "")
  .replace(/^import .* from "\.\/videos\/ae-[a-z-]+\/(Video|script)";\n/gm, "");
src = src.replace(/    <Folder name="Interview-Analytics-Engineer">[\s\S]*?    <\/Folder>\n/, "");
const imports = all.map(([, folder, comp]) =>
  `import { ${comp} } from "./videos/${folder}/Video";\nimport { script as ${camel(folder)}Script } from "./videos/${folder}/script";`).join("\n");
const anchor = 'import { BeAiRound } from "./videos/be-ai-round/Video";\nimport { script as beAiRoundScript } from "./videos/be-ai-round/script";\n';
if (!src.includes(anchor)) throw new Error("import anchor not found");
src = src.replace(anchor, anchor + "// Analytics Engineer interview prep (2026-11-20).\n" + imports + "\n");
const comps = all.map(([id, folder, comp]) => `      <Composition
        id="${id}"
        component={${comp}}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={FPS * 60}
        defaultProps={{ ...EDITORIAL_DEFAULTS, sfx: true }}
        calculateMetadata={narratedMetadata<EditorialProps>(${camel(folder)}Script)}
      />`).join("\n");
const folderAnchor = '    <Folder name="Interview-Data-Engineer">';
if (!src.includes(folderAnchor)) throw new Error("folder anchor not found");
src = src.replace(folderAnchor, `    <Folder name="Interview-Analytics-Engineer">\n${comps}\n    </Folder>\n` + folderAnchor);
writeFileSync(root, src);
for (const [, folder, comp] of all) {
  const f = `src/videos/${folder}/Video.tsx`;
  if (existsSync(f)) continue;
  writeFileSync(f, `import React from "react";
import { EditorialPage, type EditorialProps } from "../../editorial/Page";

/** Placeholder until this video's builder replaces it (keep the export name). */
export const ${comp}: React.FC<EditorialProps> = (props) => <EditorialPage {...props}>{null}</EditorialPage>;
`);
  console.log("placeholder", f);
}
console.log("registered", all.map(([id]) => id).join(", "));
