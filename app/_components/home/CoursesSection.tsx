"use client";

/**
 * Home page Courses section, reuses the `/courses` catalog's course card
 * verbatim (app/courses/_components/CourseCard.tsx) so the two surfaces stay
 * visually identical. Shows the four most popular courses by default, with
 * topic buttons (the domain tags common enough to carry a filter) that swap
 * in up to four courses per topic, and a browse-all link into the catalog.
 */
import { useMemo, useState } from "react";
import Link from "../Link";
import { ArrowRight } from "lucide-react";
import { formatTagLabel } from "@/lib/tagLabels";
import type { CatalogCourse } from "@/lib/courseCatalog";
import { CourseCard } from "@/app/courses/_components/CourseCard";

// (Type-only import cycle with lib/courseCatalog is fine, erased at build.)
export interface CourseTags {
  language?: string[];
  libraries?: string[];
  domain?: string[];
  skills?: string[];
  tools?: string[];
  level?: string[];
}

/** How many courses each view shows. */
const DISPLAY_LIMIT = 4;
/** A domain becomes a topic button once it has this many courses… */
const MIN_TOPIC_COURSES = 3;
/** …and we show at most this many topic buttons. */
const MAX_TOPICS = 6;

export function CoursesSection({ courses }: { courses: CatalogCourse[] }) {
  // null = the default "Recommended" view.
  const [topic, setTopic] = useState<string | null>(null);

  // Topic buttons: domains with enough courses to be worth a filter, most
  // populous first (ties: label order), capped so the row stays scannable.
  const topics = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of courses) {
      for (const d of c.tags.domain ?? []) {
        counts.set(d, (counts.get(d) ?? 0) + 1);
      }
    }
    return [...counts.entries()]
      .filter(([, n]) => n >= MIN_TOPIC_COURSES)
      .sort(
        (a, b) =>
          b[1] - a[1] || formatTagLabel(a[0]).localeCompare(formatTagLabel(b[0])),
      )
      .slice(0, MAX_TOPICS)
      .map(([d]) => d);
  }, [courses]);

  // `courses` arrives popularity-sorted from getCourseCatalog, so slicing
  // after the topic filter keeps "most popular first" in every view.
  const shown = useMemo(() => {
    const pool = topic
      ? courses.filter((c) => (c.tags.domain ?? []).includes(topic))
      : courses;
    return pool.slice(0, DISPLAY_LIMIT);
  }, [courses, topic]);

  if (courses.length === 0) return null;

  const pillBase =
    "cursor-pointer rounded-full border px-3.5 py-1.5 text-[13.5px] font-medium transition-colors";
  const pillIdle = `border-[var(--ds-gray-200)] text-[var(--ds-gray-600)] hover:border-[var(--ds-gray-400)] hover:text-[var(--ds-gray-900)] dark:border-white/10 dark:text-[var(--ds-gray-300)] dark:hover:border-white/25 dark:hover:text-white`;
  const pillActive =
    "border-[var(--ds-gray-900)] bg-[var(--ds-gray-900)] text-white dark:border-white dark:bg-white dark:text-[#121212]";

  return (
    <section id="courses" className="mx-auto w-full max-w-5xl px-4 sm:px-6">
      <div className="mb-8 text-center">
        <h2 className="text-4xl font-semibold tracking-tight text-[var(--ds-gray-900)] sm:text-5xl dark:text-white">
          Free Courses
        </h2>
        <p className="mt-8 text-base text-[var(--ds-gray-900)] sm:text-lg dark:text-white">
          Hands-on, browser-based tracks across data and engineering.
        </p>
      </div>

      {/* Topic buttons: "Recommended" (default) + the biggest domains. The
          default is a hand-curated ranking (lib/courseCatalog.ts), so it is
          not labelled "Most popular", there are no usage analytics yet. */}
      <div className="mb-4 flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={() => setTopic(null)}
          aria-pressed={topic === null}
          className={`${pillBase} ${topic === null ? pillActive : pillIdle}`}
        >
          Recommended
        </button>
        {topics.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setTopic(d)}
            aria-pressed={topic === d}
            className={`${pillBase} ${topic === d ? pillActive : pillIdle}`}
          >
            {formatTagLabel(d)}
          </button>
        ))}
      </div>

      {/* Up to four cards, the same card component the /courses catalog
          renders. Cards carry their own vertical padding (py-6), so the grid
          only adds a column gap. */}
      <div className="grid gap-x-10 sm:grid-cols-2">
        {shown.map((course) => (
          <CourseCard key={course.slug} course={course} />
        ))}
      </div>

      <div className="mt-6 text-center">
        <Link
          href="/courses"
          className="group inline-flex items-center gap-1.5 text-[15px] font-medium text-[var(--ds-blue-700)] dark:text-[var(--ds-blue-400)]"
        >
          Browse all {courses.length} courses
          <ArrowRight
            size={16}
            className="transition-transform group-hover:translate-x-1"
            aria-hidden="true"
          />
        </Link>
      </div>
    </section>
  );
}
