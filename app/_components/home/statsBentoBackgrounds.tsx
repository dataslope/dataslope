"use client";

/**
 * Animated backgrounds for the home page's bento grid (StatsBento.tsx).
 * Each sits behind a card's copy (pointer-events-none, masked where the
 * text sits) and illustrates that card's stat: the brand diamond loader,
 * a test-results rail, a typing animation, and a course-title feed.
 */

import {
  useEffect,
  useRef,
  useState,
  type ElementType,
  type RefObject,
} from "react";
import { AnimatePresence, useInView } from "motion/react";
import {
  BarChart3,
  Binary,
  Braces,
  Brain,
  ChartColumn,
  Check,
  Code2,
  Coffee,
  Cpu,
  Database,
  Hash,
  Sigma,
  TrendingUp,
  X,
} from "lucide-react";

import { DiamondAssembleTurnLoader } from "@/app/_components/mdx/loadingAnimations";
import { TypingAnimation } from "@/components/ui/typing-animation";
import { AnimatedListItem } from "@/components/ui/animated-list";

/** Respect the user's reduced-motion preference for the JS-driven animations. */
function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return reduced;
}

// ─── Card 1: large brand loader (right-aligned, black/white) ──────────────

export function DiamondBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-start justify-end overflow-hidden pr-3 pt-3 [mask-image:linear-gradient(to_bottom_left,#000_38%,transparent_85%)]">
      {/* The loader draws with currentColor; recolor the SVG to black in
          light mode and white in dark mode (overriding its brand-blue tint). */}
      <div className="opacity-90 transition-transform duration-300 ease-out group-hover:scale-105">
        <DiamondAssembleTurnLoader
          size={300}
          label=""
          color="var(--ds-green-500)"
        />
      </div>
    </div>
  );
}

// ─── Card 2: animated test-results rail ──────────────────────────────────

type TestState = "pending" | "pass" | "fail";

const RAIL_LABELS = [
  "Parses the input",
  "Handles base case",
  "Covers edge cases",
  "Returns a number",
  "Output matches",
];

// A run that builds up to a mixed result, then re-runs all green, the
// "write code → some fail → fix → all pass" story, on a loop.
const RAIL_STAGES: { states: TestState[]; hold: number }[] = [
  { states: ["pending", "pending", "pending", "pending", "pending"], hold: 650 },
  { states: ["pass", "pending", "pending", "pending", "pending"], hold: 450 },
  { states: ["pass", "fail", "pending", "pending", "pending"], hold: 450 },
  { states: ["pass", "fail", "pass", "pending", "pending"], hold: 450 },
  { states: ["pass", "fail", "pass", "pass", "fail"], hold: 1700 },
  { states: ["pass", "pass", "pass", "pass", "pass"], hold: 2600 },
];

const ALL_PASS: TestState[] = ["pass", "pass", "pass", "pass", "pass"];

const STATE_COLOR: Record<TestState, string> = {
  pass: "var(--ds-green-500)",
  fail: "var(--ds-red-500)",
  pending: "transparent",
};

export function TestRailBackground() {
  const reduced = usePrefersReducedMotion();
  const [step, setStep] = useState(0);
  // Endless loop, only tick while the card is actually on screen.
  const railRef = useRef<HTMLDivElement>(null);
  const inView = useInView(railRef as RefObject<Element>);

  useEffect(() => {
    if (reduced || !inView) return;
    const t = setTimeout(
      () => setStep((s) => (s + 1) % RAIL_STAGES.length),
      RAIL_STAGES[step].hold,
    );
    return () => clearTimeout(t);
  }, [step, reduced, inView]);

  const states = reduced ? ALL_PASS : RAIL_STAGES[step].states;
  const passed = states.filter((s) => s === "pass").length;
  const total = states.length;
  const allPass = passed === total;

  return (
    <div
      ref={railRef}
      className="pointer-events-none absolute inset-0 overflow-hidden [mask-image:linear-gradient(to_top,transparent_22%,#000_78%)]"
    >
      {/* Rail pinned to the right so it doesn't sit over the card's icon; the
          pass-count badge is a header row above the rail so the two never
          overlap.

          From `lg` the card is one column of three and the icon is a 160px
          illustration rather than a small glyph, so `right-4` alone still put
          the rail's nodes across the marmot. The extra shift moves the rail
          clear of it; the label tails run past the card edge and are clipped,
          which is fine for a decorative background already behind a scrim and
          a fade mask. Below `lg` the cards are full width, there is room for
          both, and the rail sits where it always did. */}
      <div className="absolute right-4 top-4 flex w-[15rem] flex-col gap-3 lg:translate-x-24">
        {/* pass-count badge, echoing the challenge card's results header */}
        <div
          className="inline-flex items-center gap-1.5 self-start rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums transition-colors duration-300"
          style={{
            background: allPass ? "var(--ds-green-500)" : "var(--ds-gray-100)",
            color: allPass ? "#fff" : "var(--ds-gray-600)",
          }}
        >
          <Check size={13} strokeWidth={3} />
          {passed}/{total}
        </div>

        <div className="flex flex-col">
          {RAIL_LABELS.map((label, i) => {
          const state = states[i];
          return (
            <div key={label} className="flex items-stretch gap-3.5">
              {/* track: node + connecting segment */}
              <div className="flex w-[34px] flex-shrink-0 flex-col items-center">
                <span
                  className="mt-1 inline-flex h-[34px] w-[34px] flex-shrink-0 items-center justify-center rounded-full text-[15px] font-bold leading-none text-white transition-all duration-300"
                  style={{
                    background: STATE_COLOR[state],
                    border:
                      state === "pending"
                        ? "2.5px solid var(--ds-gray-300)"
                        : "none",
                    color: state === "pending" ? "var(--ds-gray-400)" : "#fff",
                  }}
                >
                  {state === "fail" ? <X size={18} strokeWidth={3.5} /> : i + 1}
                </span>
                {i < RAIL_LABELS.length - 1 && (
                  <span
                    className="my-0.5 w-[3px] flex-1 rounded-full transition-colors duration-300"
                    style={{
                      minHeight: 22,
                      background:
                        state === "pending"
                          ? "var(--ds-gray-200)"
                          : STATE_COLOR[state],
                    }}
                  />
                )}
              </div>
              <span
                className="mb-3 mt-1.5 self-start text-[15px] font-medium transition-colors duration-300"
                style={{
                  color:
                    state === "pending"
                      ? "var(--ds-gray-400)"
                      : "var(--ds-gray-600)",
                }}
              >
                {label}
              </span>
            </div>
          );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Card 3: typing animation (neutral grey) ─────────────────────────────

const INTERVIEW_KEYWORDS = [
  "Data Analyst",
  "Data Scientist",
  "Data Engineer",
  "Analytics Engineer",
  "ML Engineer",
  "SQL joins",
  "A/B testing",
  "System design",
];

export function TypingBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden [mask-image:linear-gradient(to_top,transparent_22%,#000_78%)]">
      <div
        className="absolute left-6 right-4 top-7 text-right text-2xl font-normal"
        style={{
          fontFamily: "var(--font-mono, ui-monospace, monospace)",
          color: "var(--ds-green)",
        }}
      >
        <TypingAnimation
          words={INTERVIEW_KEYWORDS}
          loop
          startOnView={false}
          duration={85}
          pauseDelay={1100}
          cursorStyle="line"
          className="leading-snug"
        />
      </div>
    </div>
  );
}

// ─── Card 4: infinite animated list of course titles ─────────────────────

/** Shorten verbose course titles so each list pill stays on one line. Known
 *  long titles get a hand-picked short form; anything else drops a leading
 *  "Introduction to"/"Mastering", trims a ": subtitle", and ellipsises. */
const SHORT_TITLES: Record<string, string> = {
  "Introduction to Data Visualization with Python and Plotly Express":
    "Data Viz with Plotly",
  "Introduction to SQL and Relational Databases with PostgreSQL":
    "SQL with PostgreSQL",
  "Mastering Data Structures and Algorithms in C++": "DSA in C++",
  "Mastering ggplot2: The Grammar of Graphics in R": "ggplot2 in R",
  "Object-Oriented Programming Blueprint with Java": "OOP with Java",
  "Seaborn Foundations: Visualizing Statistical Data": "Seaborn Foundations",
  "Java Collections and Generics Deep Dive": "Java Collections & Generics",
  "Beginner's Guide to JavaScript": "JavaScript for Beginners",
  "C# LINQ and Functional Patterns": "C# LINQ Patterns",
  "Statistics for Data Science with Python": "Statistics with Python",
  "Data Analysis with Python Pandas": "Data Analysis with pandas",
  "Natural Language Processing with Python": "NLP with Python",
  "Functional Programming with TypeScript": "FP with TypeScript",
  "Introduction to Modern C#": "Modern C#",
  "From Zero to C++ Programming": "From Zero to C++",
  "SQL for Data Analysis with DuckDB": "SQL with DuckDB",
};

function simplifyCourseTitle(title: string): string {
  if (SHORT_TITLES[title]) return SHORT_TITLES[title];
  let s = title
    .replace(/^Introduction to /, "Intro to ")
    .replace(/^Mastering /, "");
  if (s.includes(":")) s = s.split(":")[0].trim();
  return s.length > 26 ? `${s.slice(0, 25).trimEnd()}…` : s;
}

/** Topic-appropriate icon for a course (reused across related courses). */
function iconForCourse(title: string): ElementType {
  const t = title.toLowerCase();
  if (/sql|postgres|duckdb|sqlite|database/.test(t)) return Database;
  if (/machine learning|scikit|nlp|natural language/.test(t)) return Brain;
  if (/statistic/.test(t)) return Sigma;
  if (/visualization|plotly|ggplot|seaborn/.test(t)) return ChartColumn;
  if (/time series/.test(t)) return TrendingUp;
  if (/pandas|data analysis|scientific computing|practical r/.test(t))
    return BarChart3;
  if (/javascript|typescript/.test(t)) return Braces;
  if (/java\b|object-oriented/.test(t)) return Coffee;
  if (/c#|csharp|linq|modern c#/.test(t)) return Hash;
  if (/c\+\+|data structures|algorithms/.test(t)) return Binary;
  if (/systems programming|c programming/.test(t)) return Cpu;
  return Code2;
}

// Likely-popular tracks first, then beginner-friendly, then everything else.
const POPULAR_FIRST = [
  "Introduction to SQL and Relational Databases with PostgreSQL",
  "Data Analysis with Python Pandas",
  "Machine Learning with scikit-learn",
  "SQL for Data Analysis with DuckDB",
  "Statistics for Data Science with Python",
];
const BEGINNER_NEXT = [
  "Python Basics",
  "Beginner's Guide to JavaScript",
  "SQLite for Beginners",
  "C Programming for Beginners",
  "Java Programming for Beginners",
  "Practical R for Beginners",
  "TypeScript from Scratch",
  "From Zero to C++ Programming",
  "Introduction to Modern C#",
];

function reorderCourses(titles: string[]): string[] {
  const present = new Set(titles);
  const used = new Set<string>();
  const ordered: string[] = [];
  for (const t of [...POPULAR_FIRST, ...BEGINNER_NEXT]) {
    if (present.has(t) && !used.has(t)) {
      ordered.push(t);
      used.add(t);
    }
  }
  for (const t of titles) {
    if (!used.has(t)) {
      ordered.push(t);
      used.add(t);
    }
  }
  return ordered;
}

function CoursePill({ title, Icon }: { title: string; Icon: ElementType }) {
  return (
    <figure className="flex w-full items-center gap-3 rounded-xl border border-[var(--ds-gray-200)] bg-white/90 px-3.5 py-2.5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/[0.08]">
      <span
        aria-hidden
        className="grid size-8 flex-shrink-0 place-items-center rounded-lg"
        style={{
          background: "var(--ds-green-50)",
          color: "var(--ds-green-600)",
        }}
      >
        <Icon size={16} />
      </span>
      <figcaption className="truncate text-sm font-medium text-[var(--ds-gray-900)] dark:text-white">
        {title}
      </figcaption>
    </figure>
  );
}

interface CourseItem {
  title: string;
  Icon: ElementType;
}

/** An endless feed built on Magic UI's <AnimatedListItem>: a new pill springs
 *  in at the top each tick, older ones flow down, and the oldest exits once the
 *  visible window is full, cycling through the course list forever. */
function InfiniteCourseList({ courses }: { courses: CourseItem[] }) {
  const reduced = usePrefersReducedMotion();
  const VISIBLE = 5;
  const DELAY = 1600;

  const [queue, setQueue] = useState<(CourseItem & { key: number })[]>(() =>
    courses.length ? [{ ...courses[0], key: 0 }] : [],
  );
  const nextIndex = useRef(1);
  // Endless feed: each tick runs spring/layout animations across every
  // visible pill, so only tick while the card is actually on screen.
  const listRef = useRef<HTMLDivElement>(null);
  const inView = useInView(listRef as RefObject<Element>);

  useEffect(() => {
    if (reduced || !inView || courses.length === 0) return;
    const id = setInterval(() => {
      setQueue((prev) => {
        const course = courses[nextIndex.current % courses.length];
        const item = { ...course, key: nextIndex.current };
        nextIndex.current += 1;
        return [item, ...prev].slice(0, VISIBLE);
      });
    }, DELAY);
    return () => clearInterval(id);
  }, [courses, reduced, inView]);

  // Reduced motion: render a static stack instead of the animated feed.
  const items = reduced
    ? courses.slice(0, VISIBLE).map((c, i) => ({ ...c, key: i }))
    : queue;

  return (
    <div ref={listRef} className="flex w-full flex-col items-center gap-2.5">
      <AnimatePresence>
        {items.map((item) => (
          <AnimatedListItem key={item.key}>
            <CoursePill title={item.title} Icon={item.Icon} />
          </AnimatedListItem>
        ))}
      </AnimatePresence>
    </div>
  );
}

export function CoursesListBackground({ titles }: { titles: string[] }) {
  const courses: CourseItem[] = reorderCourses(titles).map((t) => ({
    title: simplifyCourseTitle(t),
    Icon: iconForCourse(t),
  }));
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden [mask-image:linear-gradient(to_top,transparent_18%,#000_70%)]">
      <div className="absolute right-5 top-5 w-[min(20rem,78%)]">
        <InfiniteCourseList courses={courses} />
      </div>
    </div>
  );
}
