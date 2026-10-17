/**
 * Bundles the video package for a script that renders (check:frames,
 * check:motion, the audio checks), and deletes the bundle when the script
 * exits. Remotion's bundle() writes about 100 MB to the system temp folder,
 * the public/ folder included, and never removes it; one per run filled the
 * disk on a day of many checks (236 of them, 13 GB).
 */
import { rmSync } from "node:fs";

const made = new Set();
const removeAll = () => {
  for (const dir of made) {
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {
      // Already gone, or in use on a system that won't let go: nothing to do.
    }
  }
  made.clear();
};
process.once("exit", removeAll);
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => {
    removeAll();
    process.exit(130);
  });
}

/** bundle({ entryPoint }), with the bundle removed when this process exits. */
export async function bundleVideo(entryPoint) {
  const { bundle } = await import("@remotion/bundler");
  const serveUrl = await bundle({ entryPoint });
  made.add(serveUrl);
  return serveUrl;
}
