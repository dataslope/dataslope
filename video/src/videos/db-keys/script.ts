import type { NarrationScript } from "../../narration/types";

/**
 * Placeholder for Database Design with PostgreSQL, Unit 4, "Keys and integrity"
 * (16:9): one video for the whole unit, registered in Root.tsx as
 * `DbDesign-4-Keys` so it can be built in this folder alone. Replace the whole file.
 */
export const script: NarrationScript = {
  id: "db-keys",
  voice: "hope",
  // Room for the series intro (SeriesIntro, INTRO_SECONDS) before the first word.
  leadIn: 4.6,
  beats: [{ id: "placeholder", text: "This video is being written." }],
};
