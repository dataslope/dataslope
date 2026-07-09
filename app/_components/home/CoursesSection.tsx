"use client";

/**
 * Home page Courses section, reuses the `/courses` catalog's course card
 * verbatim (app/courses/_components/CourseCard.tsx) so the two surfaces stay
 * visually identical. Shows the four most popular courses by default, with
 * topic buttons (the domain tags common enough to carry a filter) that swap
 * in up to four courses per topic, and a browse-all link into the catalog.
 */
import { useMemo, useState } from "react";
import { Select } from "@base-ui-components/react/select";
import { ArrowRight, ChevronDown } from "lucide-react";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import Link from "../Link";
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

  const activeTopicLabel = topic ? formatTagLabel(topic) : "Recommended";

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

      {/* Topic filter: "Recommended" (default) + the biggest domains, as a
          compact dropdown styled like the interactive preview's language
          picker. The default is a hand-curated ranking (lib/courseCatalog.ts),
          not "Most popular", there are no usage analytics yet. */}
      <div className="mb-6 flex justify-center">
        <Select.Root
          value={topic ?? ""}
          onValueChange={(next) => setTopic(next ? next : null)}
        >
          <Select.Trigger
            aria-label="Filter courses by topic"
            render={(triggerProps) => (
              <ShimmerButton
                {...triggerProps}
                background="var(--color-fd-background)"
                shimmerColor="#148CFF"
                shimmerSize="0.15em"
                borderRadius="0.625rem"
                className="min-w-52 justify-between gap-2 border-[color:var(--ds-gray-200)] px-3.5 py-1.5 text-sm font-medium text-[color:var(--ds-gray-900)] focus-visible:outline-none dark:border-white/10 dark:text-white"
              >
                <Select.Value className="flex-1 truncate text-left">
                  {activeTopicLabel}
                </Select.Value>
                <Select.Icon className="text-[var(--ds-gray-500)] dark:text-white/70">
                  <ChevronDown size={14} />
                </Select.Icon>
              </ShimmerButton>
            )}
          />
          <Select.Portal>
            <Select.Positioner
              sideOffset={6}
              alignItemWithTrigger={false}
              className="z-50"
            >
              <Select.Popup className="max-h-[60vh] min-w-52 overflow-y-auto rounded-xl border border-[var(--ds-gray-200)] bg-white p-1.5 shadow-xl shadow-black/5 outline-none transition-[opacity,transform] data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0 dark:border-white/10 dark:bg-[#1a1a1a] dark:shadow-black/40">
                {[{ value: "", label: "Recommended" }, ...topics.map((d) => ({ value: d, label: formatTagLabel(d) }))].map(
                  (o) => (
                    <Select.Item
                      key={o.value || "recommended"}
                      value={o.value}
                      className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-[var(--ds-gray-700)] outline-none transition-colors data-[highlighted]:bg-[var(--ds-gray-100)] data-[highlighted]:text-[var(--ds-gray-900)] data-[selected]:font-medium data-[selected]:text-[var(--ds-blue-700)] dark:text-[var(--ds-gray-200)] dark:data-[highlighted]:bg-white/10 dark:data-[highlighted]:text-white"
                    >
                      <Select.ItemText>{o.label}</Select.ItemText>
                    </Select.Item>
                  ),
                )}
              </Select.Popup>
            </Select.Positioner>
          </Select.Portal>
        </Select.Root>
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
