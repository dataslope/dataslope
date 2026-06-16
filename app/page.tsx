import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import Link from "./_components/Link";
import styles from "./root.module.css";

export const metadata = {
  title: "Dataslope",
  description: "Dataslope — browser-based playgrounds and tooling.",
};

interface CourseTags {
  language?: string[];
  libraries?: string[];
  domain?: string[];
  skills?: string[];
  tools?: string[];
  level?: string[];
}

interface CourseMeta {
  title: string;
  root?: boolean;
  tags?: CourseTags;
}

interface Course {
  slug: string;
  title: string;
  tags: CourseTags;
}

// Order the categorized tags are flattened into chips for display — the most
// scannable categories first (difficulty, language), then the specifics.
const TAG_CATEGORY_ORDER: (keyof CourseTags)[] = [
  "level",
  "language",
  "libraries",
  "tools",
  "domain",
  "skills",
];

function flattenTags(tags: CourseTags): { category: string; value: string }[] {
  const chips: { category: string; value: string }[] = [];
  for (const category of TAG_CATEGORY_ORDER) {
    for (const value of tags[category] ?? []) {
      chips.push({ category, value });
    }
  }
  return chips;
}

async function getCourses(): Promise<Course[]> {
  const learnDir = path.join(process.cwd(), "content", "learn");
  const entries = await readdir(learnDir, { withFileTypes: true });

  const courses: Course[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    try {
      const raw = await readFile(
        path.join(learnDir, entry.name, "meta.json"),
        "utf-8",
      );
      const meta = JSON.parse(raw) as CourseMeta;
      if (meta.root && meta.title) {
        courses.push({
          slug: entry.name,
          title: meta.title,
          tags: meta.tags ?? {},
        });
      }
    } catch {
      // No meta.json or unreadable — skip
    }
  }

  return courses.sort((a, b) => a.title.localeCompare(b.title));
}

function GitHubIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.009-.866-.013-1.7-2.782.604-3.369-1.342-3.369-1.342-.454-1.154-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.004.071 1.532 1.031 1.532 1.031.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.087.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.03-2.682-.103-.253-.447-1.27.097-2.646 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0 1 12 6.836a9.59 9.59 0 0 1 2.504.337c1.909-1.294 2.747-1.025 2.747-1.025.546 1.376.202 2.393.1 2.646.64.698 1.028 1.591 1.028 2.682 0 3.841-2.337 4.687-4.565 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
    </svg>
  );
}

export default async function Home() {
  const courses = await getCourses();

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <h1 className={styles.title}>Dataslope</h1>
        <p className={styles.subtitle}>
          A growing collection of browser-based developer tools.
        </p>
        <div className={styles.ctas}>
          {/* Primary CTA — the one link worth prefetching eagerly. */}
          <Link href="/learn" prefetch className={styles.cta}>
            Browse Learn
            <span aria-hidden="true" className={styles.arrow}>
              →
            </span>
          </Link>
          <Link href="/playground" className={styles.ctaSecondary}>
            Open the Playground
          </Link>
          <Link href="/color-test" className={styles.ctaSecondary}>
            Color Theme Test
          </Link>
          <Link href="/svg-gallery" className={styles.ctaSecondary}>
            SVG Gallery
          </Link>
          <Link href="/magicui-demo" className={styles.ctaSecondary}>
            Magic UI Demo
          </Link>
          <a
            href="https://github.com/dataslope/dataslope/"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.ctaSecondary}
            aria-label="View source on GitHub"
          >
            <GitHubIcon />
            GitHub
          </a>
        </div>

        <section className={styles.courses}>
          <h2 className={styles.coursesHeading}>Courses</h2>
          <div className={styles.courseList}>
            {courses.map(({ slug, title, tags }) => {
              const chips = flattenTags(tags);
              return (
                <Link
                  key={slug}
                  href={`/learn/${slug}`}
                  className={styles.courseCard}
                >
                  <span className={styles.courseMain}>
                    <span className={styles.courseTitle}>{title}</span>
                    {chips.length > 0 && (
                      <span className={styles.courseTags}>
                        {chips.map(({ category, value }) => (
                          <span
                            key={`${category}:${value}`}
                            className={styles.courseTag}
                            data-category={category}
                          >
                            {value}
                          </span>
                        ))}
                      </span>
                    )}
                  </span>
                  <span className={styles.courseArrow} aria-hidden="true">
                    →
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
