/**
 * The YouTube thumbnails' tracks (Thumbnail.tsx): one per course and
 * interview series, each with its title lines and its watercolor animal.
 *
 * Plain TypeScript with no imports, so scripts/render-thumbnails.mjs can
 * read the track names without asking Remotion for every composition (which
 * would also time every video, and log a 404 for each unvoiced one).
 */
export type Track = {
  kind: "course" | "interview";
  /** The title, one array entry per line. */
  title: string[];
  /** The watercolor animal: its folder under public/images/, and its id. */
  art: { video: string; id: string };
  /** Drawn smaller than the box allows, for an animal whose body fills
   *  more of its picture than the others' (the raccoon). */
  artScale?: number;
  /** The width of the animal's box when hung top-right, wider than the
   *  usual 400px for a wide picture (the beaver and its servers) so the
   *  animal is not drawn smaller than the others. */
  artWidth?: number;
};

export const TRACKS: Record<string, Track> = {
  Statistics: {
    kind: "course",
    title: ["Statistics for", "Data Science", "with Python"],
    art: { video: "thumbnails", id: "thumb-owl" },
  },
  DatabaseDesign: {
    kind: "course",
    title: ["Database Design", "with PostgreSQL"],
    art: { video: "thumbnails", id: "thumb-elephant" },
  },
  LargeLanguageModels: {
    kind: "course",
    title: ["How Large", "Language", "Models Work"],
    art: { video: "thumbnails", id: "thumb-llama" },
  },
  NaturalLanguageProcessing: {
    kind: "course",
    title: ["Natural Language", "Processing", "with Python"],
    art: { video: "thumbnails", id: "thumb-parrot" },
  },
  // The raccoon's body fills more of its picture than the otter's or the
  // meerkat's, so at the same box it reads larger (the owner: "slightly
  // smaller").
  DataAnalyst: { kind: "interview", title: ["Data Analyst"], art: { video: "thumbnails", id: "thumb-raccoon" }, artScale: 0.86 },
  DataScientist: { kind: "interview", title: ["Data Scientist"], art: { video: "ds-interview", id: "ds-interview-otter" } },
  DataEngineer: { kind: "interview", title: ["Data Engineer"], art: { video: "de-interview", id: "de-interview-meerkat" } },
  // The beaver and its servers make a wide picture; 440px keeps 46px clear
  // of "Backend Engineer", which ends at x 730.
  BackendEngineer: { kind: "interview", title: ["Backend Engineer"], art: { video: "thumbnails", id: "thumb-beaver" }, artWidth: 440 },
};
