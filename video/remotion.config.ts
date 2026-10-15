// Remotion CLI settings (`remotion studio`, `remotion render`, `remotion still`).
// https://www.remotion.dev/docs/config
import { Config } from "@remotion/cli/config";

Config.setEntryPoint("src/index.ts");
Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(92);
Config.setOverwriteOutput(true);

// Compositions are laid out at 1920x1080 (or 1080x1920) CSS pixels and
// rendered with `--scale=2` for 4K, so every size in the source stays in the
// familiar 1080p range and text, SVG and the patterns stay vector-sharp.
// `npm run render` passes the scale; see README.md.

// Remotion downloads its own Chrome Headless Shell on first render. Point this
// at an existing one instead where downloads are blocked (the cloud container
// ships one under /opt/pw-browsers).
if (process.env.REMOTION_BROWSER_EXECUTABLE) {
  Config.setBrowserExecutable(process.env.REMOTION_BROWSER_EXECUTABLE);
}
