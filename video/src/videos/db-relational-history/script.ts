import type { NarrationScript } from "../../narration/types";

/**
 * Placeholder for Database Design with PostgreSQL, Unit 9, "Where it came from"
 * (16:9): one video for the whole unit, registered in Root.tsx as
 * `DbDesign-9-RelationalHistory` so it can be built in this folder alone. Replace the whole file.
 */
export const script: NarrationScript = {
  id: "db-relational-history",
  voice: "hope",
  // Room for the series intro (SeriesIntro, INTRO_SECONDS) before the first word.
  leadIn: 4.6,
  beats: [{ id: "placeholder", text: "This video is being written." }],
};
