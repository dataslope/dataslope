"use client";

/**
 * Home page Courses section, reusing the /courses catalog's course card in
 * its denser `preview` layout. Shows the four most popular courses, with
 * topic buttons swapping in up to four per topic, and a browse-all link.
 */
import { useMemo, useState } from "react";
import { Select } from "@base-ui/react/select";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Boxes,
  Brain,
  ChevronDown,
  Code2,
  Cpu,
  Database,
  Globe,
  GraduationCap,
  LineChart,
  Network,
  Sigma,
  Star,
  type LucideIcon,
} from "lucide-react";
import Link from "../Link";
import {
  HOME_SELECT_ITEM,
  HOME_SELECT_POPUP,
  HOME_SELECT_TRIGGER,
  HomeSelectBeam,
} from "./homeSelect";
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

/** Leading glyph per topic option; fallback is a book. Sparkles is avoided —
 *  reserved for AI features. */
const DOMAIN_ICONS: Record<string, LucideIcon> = {
  "programming-fundamentals": Code2,
  "computational-thinking": Brain,
  "data-visualization": BarChart3,
  "data-analysis": LineChart,
  "data-science": LineChart,
  statistics: Sigma,
  "object-oriented-programming": Boxes,
  "systems-programming": Cpu,
  "data-structures": Network,
  databases: Database,
  "web-development": Globe,
  "machine-learning": Brain,
};
const DEFAULT_TOPIC_ICON = BookOpen;

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
          b[1] - a[1] ||
          formatTagLabel(a[0]).localeCompare(formatTagLabel(b[0])),
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

  const activeTopicLabel = topic ? formatTagLabel(topic) : "Featured";
  const ActiveTopicIcon = topic
    ? (DOMAIN_ICONS[topic] ?? DEFAULT_TOPIC_ICON)
    : Star;

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
            className={`${HOME_SELECT_TRIGGER} min-w-52 justify-between`}
          >
            <ActiveTopicIcon
              size={16}
              aria-hidden="true"
              className="shrink-0 text-[var(--ds-gray-500)] dark:text-[var(--ds-gray-400)]"
            />
            <Select.Value className="flex-1 truncate text-left">
              {activeTopicLabel}
            </Select.Value>
            <Select.Icon className="text-[var(--ds-gray-500)] dark:text-white/70">
              <ChevronDown size={14} />
            </Select.Icon>
            <HomeSelectBeam />
          </Select.Trigger>
          <Select.Portal>
            <Select.Positioner
              sideOffset={6}
              alignItemWithTrigger={false}
              className="z-50"
            >
              <Select.Popup className={`${HOME_SELECT_POPUP} min-w-52`}>
                {[
                  { value: "", label: "Featured", Icon: Star },
                  ...topics.map((d) => ({
                    value: d,
                    label: formatTagLabel(d),
                    Icon: DOMAIN_ICONS[d] ?? DEFAULT_TOPIC_ICON,
                  })),
                ].map((o) => (
                  <Select.Item
                    key={o.value || "featured"}
                    value={o.value}
                    className={HOME_SELECT_ITEM}
                  >
                    <o.Icon size={16} aria-hidden="true" />
                    <Select.ItemText>{o.label}</Select.ItemText>
                  </Select.Item>
                ))}
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
          className="group inline-flex items-center gap-2 rounded-lg px-4 py-2 text-lg font-medium tracking-tight text-[var(--ds-blue-700)] dark:text-[var(--ds-blue-400)]"
        >
          <GraduationCap size={18} aria-hidden="true" />
          Browse all {courses.length} courses
          <ArrowRight
            size={18}
            className="transition-transform group-hover:translate-x-1"
            aria-hidden="true"
          />
        </Link>
      </div>
    </section>
  );
}
