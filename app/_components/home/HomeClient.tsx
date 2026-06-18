"use client";

import { BlurFade } from "@/components/ui/blur-fade";
import { HomeNav } from "./HomeNav";
import { HeroMarquee } from "./HeroMarquee";
import { HeroInteractive } from "./HeroInteractive";
import { BeamSection } from "./BeamSection";
import { CoursesSection, type Course } from "./CoursesSection";
import { PlaygroundShowcase } from "./PlaygroundShowcase";
import { Faq } from "./Faq";
import { HomeFooter } from "./HomeFooter";

function SectionHeading({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mx-auto mb-8 max-w-2xl text-center">
      <h2 className="text-2xl font-bold tracking-tight text-[var(--ds-gray-900)] sm:text-3xl dark:text-white">
        {title}
      </h2>
      <p className="mt-2 text-[var(--ds-gray-500)] dark:text-[var(--ds-gray-400)]">
        {subtitle}
      </p>
    </div>
  );
}

export function HomeClient({ courses }: { courses: Course[] }) {
  return (
    /* Inter everywhere on the home page; the embedded challenge cards and MCQ
       bring their own type via their CSS modules and override this. */
    <div
      style={{ fontFamily: "var(--font-sans, Inter, system-ui, sans-serif)" }}
      className="ds-home min-h-screen bg-white text-[var(--ds-gray-800)] dark:bg-[#121212] dark:text-[var(--ds-gray-100)]"
    >
      <HomeNav />

        <main>
          {/* ── Hero: marquee + interactive "try it" panel ── */}
          <section className="px-4 pb-12 pt-10 sm:px-6 sm:pt-14">
            <BlurFade delay={0.05}>
              <HeroMarquee />
            </BlurFade>
            <BlurFade delay={0.18}>
              <div className="mt-12">
                <HeroInteractive />
              </div>
            </BlurFade>
          </section>

          {/* ── Animated beam ── */}
          <section className="px-4 py-16 sm:px-6">
            <SectionHeading
              title="11 languages, one browser tab"
              subtitle="Python, R, Javascript, Typescript, PHP, C, C++, Java, C#, SQLite, Postgres, and DuckDB — free, no install, no sign-ins, no paywall, all running in the browser."
            />
            <BeamSection />
          </section>

          {/* ── Courses ── */}
          <section className="py-12">
            <CoursesSection courses={courses} />
          </section>

          {/* ── Embedded playground showcase (heading/link follow the
              selected language) ── */}
          <section className="py-12">
            <PlaygroundShowcase />
          </section>

          {/* ── FAQ ── */}
          <section className="py-12">
            <Faq />
          </section>
        </main>

        <HomeFooter />
      </div>
  );
}
