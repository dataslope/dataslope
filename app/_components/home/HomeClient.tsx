"use client";

import { BlurFade } from "@/components/ui/blur-fade";
import { FlickeringGrid } from "@/components/ui/flickering-grid";
import { Highlighter } from "@/components/ui/highlighter";
import { HomeNav } from "./HomeNav";
import { HeroMarquee } from "./HeroMarquee";
import { HeroInteractive } from "./HeroInteractive";
import { BeamSection } from "./BeamSection";
import { CoursesSection, type Course } from "./CoursesSection";
import { PlaygroundShowcase } from "./PlaygroundShowcase";
import { Faq } from "./Faq";
import { HomeFooter } from "./HomeFooter";
import { useTheme } from "./theme";

function SectionHeading({
  title,
  subtitle,
}: {
  title: string;
  subtitle: React.ReactNode;
}) {
  return (
    <div className="mx-auto mb-10 max-w-2xl text-center">
      <h2 className="text-4xl font-semibold tracking-tight text-[var(--ds-gray-900)] sm:text-5xl dark:text-white">
        {title}
      </h2>
      <p className="mt-8 text-base text-[var(--ds-gray-900)] sm:text-lg dark:text-white">
        {subtitle}
      </p>
    </div>
  );
}


export function HomeClient({ courses }: { courses: Course[] }) {
  const { theme } = useTheme();
  // Marker-style highlight: yellow reads well behind the gray subtitle text in
  // light mode but washes out on the dark page, so use brand blue there.
  const highlightColor = theme === "dark" ? "#148CFF" : "#FFDD6C";
  return (
    /* Inter everywhere on the home page; the embedded challenge cards and MCQ
       bring their own type via their CSS modules and override this. */
    <div
      style={{ fontFamily: "var(--font-sans, Inter, system-ui, sans-serif)" }}
      className="ds-home min-h-screen bg-white text-[var(--ds-gray-800)] dark:bg-[#121212] dark:text-[var(--ds-gray-100)]"
    >
      <HomeNav />

        {/* overflow-x-clip catches any horizontal overflow (e.g. decorative
            backgrounds) without breaking the sticky nav, which is a sibling. */}
        <main className="overflow-x-clip">
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
              subtitle={
                <>
                  Python, R, Javascript, Typescript, PHP, C, C++, Java, C#,
                  SQLite, Postgres, and DuckDB —{" "}
                  <Highlighter action="highlight" color={highlightColor} isView>
                    free
                  </Highlighter>
                  ,{" "}
                  <Highlighter action="highlight" color={highlightColor} isView>
                    no install
                  </Highlighter>
                  ,{" "}
                  <Highlighter action="highlight" color={highlightColor} isView>
                    no sign-ins
                  </Highlighter>
                  ,{" "}
                  <Highlighter action="highlight" color={highlightColor} isView>
                    no paywall
                  </Highlighter>
                  , all running in the browser.
                </>
              }
            />
            <div className="relative mx-auto max-w-2xl">
              {/* Magic UI Flickering Grid backdrop. */}
              <FlickeringGrid
                className="absolute inset-0 z-0 [mask-image:radial-gradient(ellipse_at_center,white,transparent_75%)]"
                squareSize={3}
                gridGap={6}
                color="#148CFF"
                maxOpacity={0.18}
                flickerChance={0.22}
              />
              <div className="relative z-10">
                <BeamSection />
              </div>
            </div>
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
