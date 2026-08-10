// Opt the pricing route into the same Tailwind + Magic UI bundle the home page
// uses, and pull in the home-route hardening so the reused HomeNav / HomeFooter
// (which rely on `.ds-home`-scoped rules in home.css) lay out correctly.
import "@/app/tailwind.css";
import "@/app/home.css";
import type { Metadata } from "next";
import Link from "../_components/Link";
import { HomeNav } from "../_components/home/HomeNav";
import { PricingSection } from "../_components/home/PricingSection";
import { HomeFooter } from "../_components/home/HomeFooter";
import { OG_IMAGE, SITE_URL } from "@/lib/site";

const PAGE_TITLE = "Pricing, Dataslope";
const PAGE_DESCRIPTION =
  "Dataslope pricing in detail. Every course, interview track, and playground is free. Compare the Guest and Free Member plans, with footnotes covering cloud storage, sharing, AI usage, and billing.";

export const metadata: Metadata = {
  // A bare string here lets the root layout's "%s · DataSlope" template render
  // the tab title as "Pricing · DataSlope".
  title: "Pricing",
  description: PAGE_DESCRIPTION,
  alternates: { canonical: "/pricing" },
  openGraph: {
    type: "website",
    url: `${SITE_URL}/pricing`,
    siteName: "DataSlope",
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    images: [OG_IMAGE],
  },
};

// Applies the persisted light/dark choice before first paint (same contract as
// the home page) so a returning dark-mode visitor never sees a light flash.
const THEME_BOOTSTRAP = `(function(){try{var d=localStorage.getItem('theme')==='dark';var r=document.documentElement;r.classList.toggle('dark',d);r.classList.toggle('light',!d);}catch(e){}})();`;

/** One numbered note. `lead` names the exact table row (or topic) it clarifies
 *  so the footnote reads as an annotation of the pricing table above it. */
function Footnote({
  n,
  lead,
  children,
}: {
  n: number;
  lead: string;
  children: React.ReactNode;
}) {
  return (
    <li id={`note-${n}`} className="flex scroll-mt-20 gap-4">
      <span
        className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--ds-gray-100)] text-sm font-semibold text-[var(--ds-gray-700)] dark:bg-white/10 dark:text-[var(--ds-gray-200)]"
        aria-hidden="true"
      >
        {n}
      </span>
      <p className="text-[15px] leading-relaxed text-[var(--ds-gray-700)] dark:text-[var(--ds-gray-300)]">
        <span className="font-semibold text-[var(--ds-gray-900)] dark:text-white">
          {lead}
        </span>{" "}
        {children}
      </p>
    </li>
  );
}

export default function PricingPage() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      <div
        style={{ fontFamily: "var(--font-sans, Inter, system-ui, sans-serif)" }}
        className="ds-home min-h-screen bg-white text-[var(--ds-gray-800)] dark:bg-[#121212] dark:text-[var(--ds-gray-100)]"
      >
        <HomeNav />

        <main className="overflow-x-clip">
          {/* ── Page heading ── */}
          <section className="px-4 pb-4 pt-12 sm:px-6 sm:pt-16">
            <div className="mx-auto max-w-2xl text-center">
              <h1 className="text-4xl font-semibold tracking-tight text-[var(--ds-gray-900)] sm:text-5xl dark:text-white">
                Pricing
              </h1>
              <p className="mt-6 text-base text-[var(--ds-gray-900)] sm:text-lg dark:text-white">
                Every course, interview track, and playground is free to use,
                sign-in optional, and anyone can share a playground with a link.
                Create a free account to save and share your work in the cloud.
                The detailed notes below the table explain exactly what each row
                means.
              </p>
            </div>
          </section>

          {/* ── Pricing table (reused from the home page) ── */}
          <section className="py-10">
            <PricingSection showHeading={false} />
          </section>

          {/* ── Footnotes & extended explanations ── */}
          <section className="px-4 py-12 sm:px-6">
            <div className="mx-auto max-w-3xl">
              <h2 className="text-2xl font-semibold tracking-tight text-[var(--ds-gray-900)] sm:text-3xl dark:text-white">
                Plan details &amp; fine print
              </h2>
              <p className="mt-3 text-[16px] leading-relaxed text-[var(--ds-gray-600)] dark:text-[var(--ds-gray-400)]">
                The footnotes below expand on the rows in the table above so
                there are no surprises about what&apos;s included at each tier.
              </p>

              {/* NOTE: The paid "Pro" tier is currently hidden from the table
                  (see SHOW_PRO_PLAN in PricingSection). These footnotes have
                  been trimmed to describe only the Guest and Free Member plans,
                  everything is free today. When Pro is restored, re-add the
                  Pro-specific notes (unlimited Ask AI fair-use, autocomplete,
                  monthly/annual billing, cancelling a plan) and the 10 GB /
                  "Upgrade to Pro" clauses removed below. */}
              <ol className="mt-8 space-y-6">
                <Footnote n={1} lead="Free to learn, always.">
                  Courses, interview prep, and the playgrounds, including
                  unlimited code executions across all 11 languages, are
                  completely free on every tier, including as a guest with no
                  sign-in. Creating a free account only adds cloud storage and
                  sharing; it never puts learning content behind a paywall.
                </Footnote>

                <Footnote n={2} lead="“Save workspaces locally.”">
                  Local saves live in your browser&apos;s own storage on the
                  device you&apos;re using. They&apos;re private to that
                  browser, never uploaded, and persist until you clear your site
                  data. Because they aren&apos;t synced, they won&apos;t follow
                  you to another device or browser, that&apos;s what cloud saves
                  are for.
                </Footnote>

                <Footnote
                  n={3}
                  lead="“Save workspaces locally and in the cloud.”"
                >
                  Cloud saves sync your workspaces to your account so you can
                  pick them up on any device you sign in to. Free Members get
                  cloud saves with a retention limit (see note 4).
                </Footnote>

                <Footnote
                  n={4}
                  lead="“Cloud saves auto-deleted after a month of inactivity” (Free Member)."
                >
                  A cloud workspace counts as inactive once it hasn&apos;t been
                  opened or edited for about 30 days. After that it may be
                  removed from the cloud to free up space, your local copy, if
                  you have one, is untouched. Opening or editing a workspace
                  resets its clock.
                </Footnote>

                <Footnote n={5} lead="“100 MB of cloud storage.”">
                  Your quota is the combined size of everything you keep in the
                  cloud, saved workspaces, databases, and any files you upload,
                  totaled across all playgrounds, not measured per playground.
                  If you reach the limit you can still open and export existing
                  work; you&apos;ll just need to free up space before saving
                  more.
                </Footnote>

                <Footnote n={6} lead="“Share playgrounds.”">
                  Sharing creates a link to a snapshot of your playground, the
                  files, and for SQL playgrounds the database and queries ,
                  taken at the moment you share. Anyone who opens the link gets
                  their own private copy to run and edit; nobody can change your
                  original through a link, and later edits aren&apos;t shared
                  until you create a new link.{" "}
                  <strong>Everyone can share, including guests</strong> with no
                  account: guest links simply expire 30 days after they&apos;re
                  created and can&apos;t be managed afterwards. Links created
                  while signed in can be copied or revoked anytime from your
                  account page, and they follow the same one-month inactivity
                  cleanup as your other cloud saves (see note 4) and count
                  toward your storage quota (note 5).
                </Footnote>

                <Footnote n={7} lead="“Ask AI” messages.">
                  “Ask AI” is the in-app assistant available inside playgrounds,
                  challenges, code blocks, and lessons. Your limit is counted
                  across all of those surfaces on a rolling 24-hour window,
                  Guests get 3 and Free Members up to 10. A rolling window means
                  each message frees up again 24 hours after you send it, rather
                  than all resetting at a fixed time of day.
                </Footnote>
              </ol>

              <p className="mt-10 border-t border-[var(--ds-gray-200)] pt-6 text-[15px] leading-relaxed text-[var(--ds-gray-600)] dark:border-white/10 dark:text-[var(--ds-gray-400)]">
                Still have questions? Browse the{" "}
                <Link
                  href="/#faq"
                  className="font-medium text-[var(--ds-blue-700)] hover:underline dark:text-[var(--ds-blue-400)]"
                >
                  FAQ
                </Link>{" "}
                or reach out on our{" "}
                <a
                  href="https://github.com/dataslope/dataslope/discussions"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-[var(--ds-blue-700)] hover:underline dark:text-[var(--ds-blue-400)]"
                >
                  GitHub discussions
                </a>
                .
              </p>
            </div>
          </section>
        </main>

        <HomeFooter />
      </div>
    </>
  );
}
