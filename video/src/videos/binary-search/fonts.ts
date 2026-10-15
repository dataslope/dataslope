// The arcade faces: Press Start 2P for headings, counters and labels (an 8x8
// bitmap face, crisp at multiples of 8px), VT323 for body copy and captions
// (a terminal face, narrow enough to hold a sentence on a phone).
import "@fontsource/press-start-2p/400.css";
import "@fontsource/vt323/400.css";
import { waitForFonts } from "../../theme/fonts";

export const PIXEL = '"Press Start 2P", ui-monospace, monospace';
export const TERM = '"VT323", ui-monospace, monospace';

waitForFonts("Press Start 2P and VT323", [
  `400 48px ${PIXEL}`,
  `400 48px ${TERM}`,
]);
