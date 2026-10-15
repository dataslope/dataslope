// Fraunces, every axis (opsz, wght, SOFT, WONK), roman and italic: the
// headline and caption face of this video's print-magazine look. Inter, from
// the shared theme, carries the small-caps labels and the chart annotations.
import "@fontsource-variable/fraunces/full.css";
import "@fontsource-variable/fraunces/full-italic.css";
import { waitForFonts } from "../../theme/fonts";

export const SERIF = '"Fraunces Variable", "Fraunces", Georgia, serif';

waitForFonts("Fraunces", [
  `400 48px ${SERIF}`,
  `600 48px ${SERIF}`,
  `italic 400 48px ${SERIF}`,
  `italic 600 48px ${SERIF}`,
]);
