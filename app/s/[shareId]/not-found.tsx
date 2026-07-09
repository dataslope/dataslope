// Branded not-found for share links, the most common negative moment in the
// sharing flow (expired, revoked, or mistyped /s/ URLs land here via the
// page's notFound()). Explains why the link stopped working and offers a way
// forward instead of Next's bare default 404.
import "@/app/tailwind.css";
import "@/app/home.css";
import Link from "next/link";

import { HomeNav } from "@/app/_components/home/HomeNav";
import { HomeFooter } from "@/app/_components/home/HomeFooter";
import { THEME_BOOTSTRAP } from "@/app/_components/home/themeBootstrap";

export default function ShareNotFound() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      <div
        style={{ fontFamily: "var(--font-sans, Inter, system-ui, sans-serif)" }}
        className="ds-home min-h-screen bg-white text-[var(--ds-gray-800)] dark:bg-[#121212] dark:text-[var(--ds-gray-100)]"
      >
        <HomeNav />
        <main className="overflow-x-clip">
          <section className="px-4 pb-20 pt-12 sm:px-6 sm:pt-16">
            <div className="mx-auto max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ds-green-600)] dark:text-[var(--ds-green-400)]">
                Shared playground
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--ds-gray-900)] sm:text-4xl dark:text-white">
                This shared playground isn&apos;t available
              </h1>
              <p className="mt-4 text-sm leading-relaxed text-[var(--ds-gray-500)] dark:text-[var(--ds-gray-400)]">
                The link may have expired, been revoked by the person who
                shared it, or the address may be mistyped. Guest share links
                last about 30 days; members can revoke theirs at any time.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/playground"
                  className="inline-flex items-center rounded-lg bg-[var(--ds-green-600)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--ds-green-700)]"
                >
                  Start your own playground
                </Link>
                <Link
                  href="/"
                  className="inline-flex items-center rounded-lg border border-[var(--ds-gray-200)] px-4 py-2 text-sm font-semibold text-[var(--ds-gray-700)] transition-colors hover:bg-[var(--ds-gray-50)] dark:border-white/10 dark:text-[var(--ds-gray-200)] dark:hover:bg-white/5"
                >
                  Go to the home page
                </Link>
              </div>
              <p className="mt-8 text-sm leading-relaxed text-[var(--ds-gray-500)] dark:text-[var(--ds-gray-400)]">
                Have your own work to share? Any playground can be shared as a
                link, recipients open their own copy, and no one can edit
                yours.
              </p>
            </div>
          </section>
        </main>
        <HomeFooter />
      </div>
    </>
  );
}
