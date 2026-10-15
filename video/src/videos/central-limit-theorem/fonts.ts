// Every face the typeface variants can set the headlines, decks and captions
// in (typefaces.ts). Inter, from the shared theme, carries the labels, figure
// titles and chart numbers in all of them.
import "@fontsource-variable/fraunces/full.css";
import "@fontsource-variable/fraunces/full-italic.css";
import "@fontsource-variable/newsreader/opsz.css";
import "@fontsource-variable/newsreader/opsz-italic.css";
import "@fontsource-variable/playfair/opsz.css";
import "@fontsource-variable/playfair/opsz-italic.css";
import "@fontsource-variable/source-serif-4/opsz.css";
import "@fontsource-variable/source-serif-4/opsz-italic.css";
import interGreekItalic from "@fontsource-variable/inter/files/inter-greek-opsz-italic.woff2";
import interGreek from "@fontsource-variable/inter/files/inter-greek-opsz-normal.woff2";
import interLatinItalic from "@fontsource-variable/inter/files/inter-latin-opsz-italic.woff2";
import interLatin from "@fontsource-variable/inter/files/inter-latin-opsz-normal.woff2";
import { waitForFonts } from "../../theme/fonts";

/** The headline, deck and caption face, set per variant on the root. */
export const SERIF = "var(--clt-serif)";

/**
 * Inter with its optical-size axis, so a headline is drawn from Inter
 * Display. It is registered under its own name: importing the package's
 * opsz.css would redefine "Inter Variable" for every video in the bundle.
 */
export const INTER_OPTICAL = "Inter Optical";
const LATIN =
  "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD";
const GREEK = "U+0370-0377,U+037A-037F,U+0384-038A,U+038C,U+038E-03A1,U+03A3-03FF";
for (const [url, style, unicodeRange] of [
  [interLatin, "normal", LATIN],
  [interGreek, "normal", GREEK],
  [interLatinItalic, "italic", LATIN],
  [interGreekItalic, "italic", GREEK],
] as const) {
  document.fonts.add(
    new FontFace(INTER_OPTICAL, `url(${url}) format("woff2")`, { weight: "100 900", style, unicodeRange }),
  );
}

const faces = ['"Fraunces Variable"', '"Newsreader Variable"', '"Playfair Variable"', '"Source Serif 4 Variable"', `"${INTER_OPTICAL}"`];
waitForFonts(
  "the CLT typefaces",
  faces.flatMap((f) => [`400 48px ${f}`, `600 48px ${f}`, `italic 400 48px ${f}`, `italic 600 48px ${f}`]),
);
// σ is drawn from a Greek subset, which @font-face only fetches on demand.
waitForFonts("Greek for σ", ['400 48px "Source Serif 4 Variable"', `400 48px "${INTER_OPTICAL}"`], "σ");
