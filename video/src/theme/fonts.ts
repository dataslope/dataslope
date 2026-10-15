// The site's two faces: Inter for prose, JetBrains Mono for code
// (app/layout.tsx). They come from npm rather than Google Fonts so a render
// never depends on a network fetch.
import "@fontsource-variable/inter";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/600.css";
import "@fontsource/jetbrains-mono/700.css";
import { cancelRender, continueRender, delayRender } from "remotion";

export const SANS = '"Inter Variable", "Inter", system-ui, sans-serif';
export const MONO = '"JetBrains Mono", ui-monospace, monospace';

// @font-face only fetches a face once something asks for it, so a frame can
// otherwise be captured in the fallback font. Hold rendering until every
// weight the videos use is in.
const handle = delayRender("Loading Inter and JetBrains Mono");
Promise.all(
  [
    `400 48px ${SANS}`,
    `600 48px ${SANS}`,
    `800 48px ${SANS}`,
    `400 48px ${MONO}`,
    `600 48px ${MONO}`,
    `700 48px ${MONO}`,
  ].map((font) => document.fonts.load(font, "AaZz09")),
)
  .then(() => continueRender(handle))
  .catch((err) => cancelRender(err));
