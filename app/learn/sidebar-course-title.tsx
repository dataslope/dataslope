"use client";

/**
 * Course title + progress shown at the top of the sidebar for every page
 * nested inside a course. The course is derived from the current pathname
 * (`/learn/<courseSlug>/...`); the slug→title map and slug→ordered-chapters
 * map are built on the server in the layout. Demo/index pages that aren't
 * courses resolve to no title and render nothing.
 *
 * Below the title we show a per-course progress bar (completed / total) and,
 * once at least one lesson is done, a "Continue" link to the next incomplete
 * chapter — a lightweight resume affordance backed by `useLearnProgress`.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useLearnProgress } from "@/app/_components/learn/useLearnProgress";
import styles from "@/app/_components/learn/progress.module.css";

interface Chapter {
  url: string;
  title: string;
}

export function SidebarCourseTitle({
  titles,
  chapters = {},
}: {
  titles: Record<string, string>;
  chapters?: Record<string, Chapter[]>;
}) {
  const pathname = usePathname();
  const completed = useLearnProgress((s) => s.completed);
  // Gate progress UI on mount so the first client render matches the server
  // (0%) render and localStorage-restored state can't trip hydration.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const segments = pathname?.split("/").filter(Boolean) ?? [];
  const slug = segments[0] === "learn" ? segments[1] : undefined;
  const title = slug ? titles[slug] : undefined;
  if (!slug || !title) return null;

  const courseChapters = chapters[slug] ?? [];
  const total = courseChapters.length;
  const doneCount = mounted
    ? courseChapters.filter((c) => completed[c.url]).length
    : 0;
  const next = mounted ? courseChapters.find((c) => !completed[c.url]) : undefined;
  const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;
  const allDone = total > 0 && doneCount === total;

  return (
    <div className={styles.courseBanner}>
      <Link href={`/learn/${slug}`} data-course-label="">
        {title}
      </Link>
      {total > 0 && (
        <div
          className={styles.progress}
          data-testid="course-progress"
          aria-label={`${doneCount} of ${total} lessons complete`}
        >
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${pct}%` }} />
          </div>
          <div className={styles.progressMeta}>
            <span>
              {doneCount} / {total} complete
            </span>
            {allDone ? (
              <span className={styles.progressDone}>Done 🎉</span>
            ) : doneCount > 0 && next ? (
              <Link href={next.url} className={styles.resumeLink}>
                Continue →
              </Link>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
