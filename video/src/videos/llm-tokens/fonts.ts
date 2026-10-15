// The short's own display face. Space Grotesk carries the headlines and the
// captions; JetBrains Mono (from theme/fonts) carries every token and id,
// because those are literally what a terminal would print.
import "@fontsource-variable/space-grotesk";
import { waitForFonts } from "../../theme/fonts";

export const DISPLAY = '"Space Grotesk Variable", "Space Grotesk", system-ui, sans-serif';

waitForFonts("Space Grotesk", [
  `500 48px ${DISPLAY}`,
  `700 48px ${DISPLAY}`,
]);
