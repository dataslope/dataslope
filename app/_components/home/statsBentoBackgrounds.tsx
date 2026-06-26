"use client";

/**
 * Animated backgrounds for the home page's Magic UI bento grid (see
 * StatsBento.tsx). Each one sits behind a card's copy (pointer-events-none,
 * masked so it fades out where the title/description sit) and illustrates the
 * stat that card reports:
 *
 *  1. Runnable code blocks → the brand "diamond assemble + quarter-turn"
 *     loader, blown up large for impact.
 *  2. Code challenges → a recreation of the challenge cards' test-results
 *     rail that cycles from a mixed pass/fail run to an all-green run.
 *  3. Interview prep → Magic UI's typing animation cycling through roles and
 *     topics.
 *  4. Free courses → Magic UI's animated list streaming course titles.
 */

import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";

import { DiamondAssembleTurnLoader } from "@/app/_components/mdx/loadingAnimations";
import { TypingAnimation } from "@/components/ui/typing-animation";
import { AnimatedList } from "@/components/ui/animated-list";

/** Respect the user's reduced-motion preference for the JS-driven rail. */
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

// ─── Card 1: large brand loader ──────────────────────────────────────────

export function DiamondBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-start justify-center overflow-hidden">
      <div className="-mt-6 opacity-90 [mask-image:linear-gradient(to_bottom,#000_55%,transparent_92%)] transition-transform duration-300 ease-out group-hover:scale-105">
        <DiamondAssembleTurnLoader size={260} label="" />
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

// A run that builds up to a mixed result, then re-runs all green — the
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

  useEffect(() => {
    if (reduced) return;
    const t = setTimeout(
      () => setStep((s) => (s + 1) % RAIL_STAGES.length),
      RAIL_STAGES[step].hold,
    );
    return () => clearTimeout(t);
  }, [step, reduced]);

  const states = reduced ? ALL_PASS : RAIL_STAGES[step].states;
  const passed = states.filter((s) => s === "pass").length;
  const total = states.length;
  const allPass = passed === total;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden [mask-image:linear-gradient(to_top,transparent_22%,#000_78%)]">
      {/* pass-count badge, echoing the challenge card's results header */}
      <div
        className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums transition-colors duration-300"
        style={{
          background: allPass ? "var(--ds-green-500)" : "var(--ds-gray-100)",
          color: allPass ? "#fff" : "var(--ds-gray-600)",
        }}
      >
        <Check size={13} strokeWidth={3} />
        {passed}/{total}
      </div>

      <div className="absolute left-5 right-4 top-5 flex flex-col">
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
                  {state === "fail" ? (
                    <X size={18} strokeWidth={3.5} />
                  ) : (
                    i + 1
                  )}
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
  );
}

// ─── Card 3: typing animation ────────────────────────────────────────────

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
      <div className="absolute left-6 right-4 top-7 font-mono text-2xl font-semibold text-[var(--ds-blue-500)] dark:text-[var(--ds-blue-300)]">
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

// ─── Card 4: animated list of course titles ──────────────────────────────

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

function CoursePill({ title }: { title: string }) {
  return (
    <figure className="flex w-full items-center gap-3 rounded-xl border border-[var(--ds-gray-200)] bg-white/90 px-3.5 py-2.5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/[0.08]">
      <span
        aria-hidden
        className="grid size-8 flex-shrink-0 place-items-center rounded-lg text-[0.8rem] font-bold"
        style={{
          background: "var(--ds-blue-50)",
          color: "var(--ds-blue-600)",
        }}
      >
        {"</>"}
      </span>
      <figcaption className="truncate text-sm font-medium text-[var(--ds-gray-900)] dark:text-white">
        {title}
      </figcaption>
    </figure>
  );
}

export function CoursesListBackground({ titles }: { titles: string[] }) {
  // Repeat the (simplified) list so the reveal keeps streaming for a while.
  const items = [...titles, ...titles].map(simplifyCourseTitle);
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden [mask-image:linear-gradient(to_top,transparent_18%,#000_70%)]">
      <AnimatedList
        delay={1500}
        className="absolute right-5 top-5 w-[min(20rem,78%)] gap-2.5"
      >
        {items.map((title, i) => (
          <CoursePill key={`${title}-${i}`} title={title} />
        ))}
      </AnimatedList>
    </div>
  );
}
