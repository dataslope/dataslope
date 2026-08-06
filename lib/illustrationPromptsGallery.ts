/**
 * Data layer for the `/illustration-prompts` review gallery and the in-lesson
 * `<IllustrationPrompt>` card.
 *
 * The prompt definitions live in `data/illustration-prompts.json` (the single
 * source of truth, also consumed by scripts/generate-illustrations.mjs). This
 * module turns each raw definition into a fully-built entry, the exact GPT
 * Image 2 prompt via `buildIllustrationPrompt`, the target PNG file name, and a
 * deep link to the lesson that embeds it, so the gallery, the card, and the
 * generator all agree.
 *
 * Deliberately free of Node/DOM APIs (it just imports the JSON), so it can be
 * imported from the server component that prerenders the gallery page AND from
 * the client component that renders the in-lesson card.
 */
import promptsData from "@/data/illustration-prompts.json";
import {
  buildIllustrationPrompt,
  illustrationFileName,
  type BrandColors,
} from "./illustrationPrompt";

/** Content collections: which public URL base each maps to.
 *
 *  `home` and `auth` are not collections of lessons but single pages, so they
 *  have no course/lesson hierarchy beneath them (see `SINGLE_PAGE` below). They
 *  exist so chrome artwork — the home page's bento icons, the auth globe pins —
 *  is authored, reviewed, and regenerated through the same pipeline as
 *  everything else rather than as one-off art. */
export type Collection =
  | "courses"
  | "interview"
  | "home"
  | "auth"
  | "pricing"
  | "playground";
const URL_BASE: Record<Collection, string> = {
  courses: "/courses",
  interview: "/interview-prep",
  home: "/",
  auth: "/sign-in",
  pricing: "/pricing",
  playground: "/playground",
};

/** Collections that are one page, with nothing addressable beneath them. */
const SINGLE_PAGE: ReadonlySet<Collection> = new Set<Collection>([
  "home",
  "auth",
  "pricing",
  "playground",
]);

/** Asset categories, in the order they are shown on the gallery page. */
export type Category =
  | "course-thumbnail"
  | "course-illustration"
  | "interview-thumbnail"
  | "interview-illustration"
  | "home-icon"
  | "pricing-plan"
  | "playground-hero"
  | "auth-globe-pin";

const CATEGORY_LABEL: Record<Category, string> = {
  "course-thumbnail": "Course thumbnails",
  "course-illustration": "Course illustrations",
  "interview-thumbnail": "Interview prep thumbnails",
  "interview-illustration": "Interview prep illustrations",
  "home-icon": "Home page bento icons",
  "pricing-plan": "Pricing plan icons",
  "playground-hero": "Playground hero band",
  "auth-globe-pin": "Auth globe pins",
};

const CATEGORY_ORDER: Category[] = [
  "course-thumbnail",
  "course-illustration",
  "interview-thumbnail",
  "interview-illustration",
  "home-icon",
  "pricing-plan",
  "playground-hero",
  "auth-globe-pin",
];

/** One raw prompt definition, as authored in the JSON. */
interface RawPrompt {
  id: string;
  collection: Collection;
  course: string;
  courseTitle: string;
  /** Lesson slug the card is embedded in; "index" (or absent) collapses to the
   *  course/role landing page. */
  lesson?: string | null;
  category: Category;
  title: string;
  style?: string;
  subject: string;
  /** Whether the illustration features the Dataslope marmot mascot. */
  mascot?: boolean;
}

interface PromptsFile {
  meta: {
    model: string;
    defaultStyle: string;
    mascot?: string;
    brandColors: BrandColors;
    sizes: Record<string, string>;
  };
  prompts: RawPrompt[];
}

const data = promptsData as PromptsFile;

export interface IllustrationPromptEntry {
  /** Stable id, used as the file stem and the on-page anchor. */
  id: string;
  /** Target asset file name, e.g. "python-basics-thumbnail.png". */
  file: string;
  /** Short human-readable title for the card. */
  title: string;
  /** The subject phrase (what is drawn). */
  subject: string;
  /** Illustration style, e.g. "risograph" or "isometric illustration". */
  style: string;
  /** Whether the illustration features the marmot mascot. */
  mascot: boolean;
  /** Asset category. */
  category: Category;
  /** Human-readable category label. */
  categoryLabel: string;
  /** The exact GPT Image 2 generation prompt (brand colors included). */
  prompt: string;
  /** Recommended output size (from meta.sizes for the category). */
  size: string;
  /** Course/role folder slug. */
  course: string;
  /** Human-readable course/role title. */
  courseTitle: string;
  /** Which collection the lesson lives in. */
  collection: Collection;
  /** Lesson URL the card is embedded in. */
  route: string;
  /** Same URL anchored to this illustration's id. */
  href: string;
}

export interface IllustrationPromptsData {
  entries: IllustrationPromptEntry[];
  /** Number of distinct illustrations (= entries.length). */
  totalIllustrations: number;
  /** Number of distinct courses/roles the illustrations belong to. */
  totalCourses: number;
  /** The four brand colors named in every prompt. */
  brandColors: BrandColors;
}

/** `courses` + `python-basics` + `hello-world` → `/courses/python-basics/hello-world`;
 *  a missing/"index" lesson collapses to the course landing page. The
 *  single-page collections (`home`, `auth`) always resolve to their own base. */
function lessonRoute(p: RawPrompt): string {
  const base = URL_BASE[p.collection];
  if (SINGLE_PAGE.has(p.collection)) return base;
  const courseUrl = `${base}/${p.course}`;
  if (!p.lesson || p.lesson === "index") return courseUrl;
  return `${courseUrl}/${p.lesson}`;
}

function buildEntry(p: RawPrompt): IllustrationPromptEntry {
  const route = lessonRoute(p);
  return {
    id: p.id,
    file: illustrationFileName(p.id),
    title: p.title,
    subject: p.subject,
    style: p.style ?? data.meta.defaultStyle,
    mascot: p.mascot ?? false,
    category: p.category,
    categoryLabel: CATEGORY_LABEL[p.category] ?? p.category,
    prompt: buildIllustrationPrompt(
      { subject: p.subject, style: p.style },
      data.meta.brandColors,
    ),
    size: data.meta.sizes[p.category] ?? "1024x1024",
    course: p.course,
    courseTitle: p.courseTitle,
    collection: p.collection,
    route,
    href: `${route}#${p.id}`,
  };
}

let cache: IllustrationPromptsData | null = null;

/**
 * Every illustration prompt, built and sorted for the gallery: grouped by the
 * fixed category order, then by course title, then by title. Memoised.
 */
export function getIllustrationPrompts(): IllustrationPromptsData {
  if (cache) return cache;

  const entries = data.prompts.map(buildEntry).sort((a, b) => {
    const ca = CATEGORY_ORDER.indexOf(a.category);
    const cb = CATEGORY_ORDER.indexOf(b.category);
    if (ca !== cb) return ca - cb;
    if (a.courseTitle !== b.courseTitle) {
      return a.courseTitle.localeCompare(b.courseTitle);
    }
    return a.title.localeCompare(b.title);
  });

  cache = {
    entries,
    totalIllustrations: entries.length,
    totalCourses: new Set(entries.map((e) => `${e.collection}/${e.course}`)).size,
    brandColors: data.meta.brandColors,
  };
  return cache;
}

/** Look up a single built entry by id (used by the in-lesson card). */
export function getIllustrationPromptById(
  id: string,
): IllustrationPromptEntry | undefined {
  return getIllustrationPrompts().entries.find((e) => e.id === id);
}
