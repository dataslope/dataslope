// The blueprint's hand-lettered face. Code stays in the site's JetBrains Mono
// (theme/fonts), which Root already waits for.
import "@fontsource/architects-daughter";
import { waitForFonts } from "../../theme/fonts";

export const HAND = '"Architects Daughter", cursive';

waitForFonts("Architects Daughter", ['400 48px "Architects Daughter"']);
