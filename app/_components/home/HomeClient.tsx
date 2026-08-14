"use client";

import { BlurFade } from "@/components/ui/blur-fade";
import { FlickeringGrid } from "@/components/ui/flickering-grid";
import { Highlighter } from "@/components/ui/highlighter";
import { AnimatedShinyText } from "@/components/ui/animated-shiny-text";
import { AnimationPauseGate } from "./AnimationPauseGate";
import { HomeNav } from "./HomeNav";
import { HeroMarquee } from "./HeroMarquee";
import { HeroInteractive } from "./HeroInteractive";
import { BeamSection } from "./BeamSection";
import { CoursesSection } from "./CoursesSection";
import type { CatalogCourse } from "@/lib/courseCatalog";
import { StatsBento, type HomeStats } from "./StatsBento";
import { PlaygroundShowcase } from "./PlaygroundShowcase";
import { PricingSection } from "./PricingSection";
import { Faq } from "./Faq";
import { HomeFooter } from "./HomeFooter";

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

export function HomeClient({
  courses,
  stats,
}: {
  courses: CatalogCourse[];
  stats: HomeStats;
}) {
  // Brand blue (--ds-blue-500) underline under the gray subtitle text, in both
  // light and dark mode.
  const underlineColor = "#148CFF";
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
        {/* ── Hero: marquee + interactive "try it" panel. ── */}
        <section className="px-4 pb-12 pt-10 sm:px-6 sm:pt-14">
          {/* The visible "heading" is the marquee; give screen readers a
                real h1. */}
          <h1 className="sr-only">
            Dataslope, learn Python, SQL, R, JavaScript and more in your browser
          </h1>
          <AnimationPauseGate>
            <BlurFade delay={0.05}>
              <HeroMarquee />
            </BlurFade>
            {/* One-line "what is this" statement above the demo. */}
            <BlurFade delay={0.12}>
              <p className="mx-auto mt-14 max-w-xl text-center [text-wrap:pretty]">
                <AnimatedShinyText className="max-w-none text-[18px] tracking-tight text-neutral-700/90 dark:text-neutral-300/90">
                  Learn programming and prepare for coding interviews. Access
                  every course and coding playground for free,{" "}
                  <Highlighter action="underline" color="#20C621" isView>
                    {/* Match the underline color, forced over the shimmer's
                          clipped gradient fill. */}
                    <span
                      style={{
                        color: "#20C621",
                        WebkitTextFillColor: "#20C621",
                      }}
                    >
                      without creating an account
                    </span>
                  </Highlighter>
                  .
                </AnimatedShinyText>
              </p>
            </BlurFade>
            <BlurFade delay={0.18}>
              <div className="mt-12">
                <HeroInteractive />
              </div>
            </BlurFade>
          </AnimationPauseGate>
        </section>

        {/* ── Animated beam ── */}
        <section className="px-4 py-16 sm:px-6">
          <SectionHeading
            title="Everything runs in your browser"
            subtitle={
              <>
                Python, R, JavaScript, TypeScript, PHP, C, C++, Java, C#,
                SQLite, Postgres, and DuckDB,{" "}
                <Highlighter action="underline" color={underlineColor} isView>
                  free
                </Highlighter>
                ,{" "}
                <Highlighter action="underline" color={underlineColor} isView>
                  no install
                </Highlighter>
                ,{" "}
                <Highlighter action="underline" color={underlineColor} isView>
                  optional sign-in
                </Highlighter>
                ,{" "}
                <Highlighter action="underline" color={underlineColor} isView>
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

        {/* ── At-a-glance stats (bento grid) ── */}
        <section className="py-12">
          <AnimationPauseGate>
            <BlurFade inView>
              <StatsBento
                stats={stats}
                courseTitles={courses.map((c) => c.title)}
              />
            </BlurFade>
          </AnimationPauseGate>
        </section>

        {/* ── Embedded playground showcase ── */}
        <section className="py-12">
          <PlaygroundShowcase />
        </section>

        {/* ── Pricing ── */}
        <section className="py-12">
          <BlurFade inView>
            <PricingSection />
          </BlurFade>
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
