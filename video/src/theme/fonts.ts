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

/**
 * Holds rendering until each font is loaded. @font-face only fetches a face
 * once something asks for it, so a frame can otherwise be captured in the
 * fallback font. A video with its own faces imports their @fontsource CSS and
 * calls this once at module level with the weights it uses, e.g.
 * `waitForFonts("Pixel font", ['400 48px "Press Start 2P"'])`. `text` picks
 * which subsets load: pass the characters a non-Latin subset covers.
 */
export function waitForFonts(label: string, fonts: string[], text = "AaZz09") {
  const handle = delayRender(`Loading ${label}`);
  Promise.all(fonts.map((font) => document.fonts.load(font, text)))
    .then(() => continueRender(handle))
    .catch((err) => cancelRender(err));
}

waitForFonts("Inter and JetBrains Mono", [
  `400 48px ${SANS}`,
  `600 48px ${SANS}`,
  `800 48px ${SANS}`,
  `400 48px ${MONO}`,
  `600 48px ${MONO}`,
  `700 48px ${MONO}`,
]);
