// The lecture's handwriting: Caveat, a casual hand that reads like chalk.
// Numbers and code stay in JetBrains Mono (theme/fonts.ts), because the whole
// video is about exact digits and a handwritten 1 can pass for a 7.
import "@fontsource-variable/caveat";
import { waitForFonts } from "../../theme/fonts";

export const HAND = '"Caveat Variable", "Caveat", cursive';

waitForFonts("Caveat", [`500 48px ${HAND}`, `600 48px ${HAND}`, `700 48px ${HAND}`]);
