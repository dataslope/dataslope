import Link from "../Link";

// Applies the persisted light/dark choice before first paint (same contract as
// the home page) so a returning dark-mode visitor doesn't see a light flash.
const THEME_BOOTSTRAP = `(function(){try{var d=localStorage.getItem('theme')==='dark';var r=document.documentElement;r.classList.toggle('dark',d);r.classList.toggle('light',!d);}catch(e){}})();`;

/** Minimal, readable chrome for the static legal pages (Terms, Privacy).
 *  Inter throughout; prose elements are styled via arbitrary child variants
 *  so each page can just write semantic markup. */
export function LegalShell({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      <div
        style={{ fontFamily: "var(--font-sans, Inter, system-ui, sans-serif)" }}
        className="min-h-screen bg-white text-[var(--ds-gray-800)] dark:bg-[#121212] dark:text-[var(--ds-gray-100)]"
      >
        <header className="border-b border-[var(--ds-gray-200)] dark:border-white/10">
          <div className="mx-auto flex h-14 max-w-3xl items-center px-4 sm:px-6">
            <Link
              href="/"
              aria-label="Dataslope home"
              className="ds-logo-hover flex items-center gap-2"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/dataslope-logo-blue.svg"
                alt=""
                aria-hidden="true"
                className="ds-logo-mark h-4 w-auto"
              />
              <span className="ds-logo-word text-base font-semibold tracking-tight text-[var(--ds-gray-900)] dark:text-white">
                Dataslope
              </span>
            </Link>
          </div>
        </header>

        <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--ds-gray-900)] sm:text-4xl dark:text-white">
            {title}
          </h1>
          <p className="mt-3 text-sm text-[var(--ds-gray-500)] dark:text-[var(--ds-gray-400)]">
            Last updated: {updated}
          </p>

          <div className="mt-10 [&_a]:font-medium [&_a]:text-[var(--ds-blue-700)] [&_a]:underline [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-[var(--ds-gray-900)] [&_li]:mt-1.5 [&_p]:mt-4 [&_p]:leading-relaxed [&_strong]:font-semibold [&_strong]:text-[var(--ds-gray-900)] [&_ul]:mt-4 [&_ul]:list-disc [&_ul]:pl-6 dark:[&_a]:text-[var(--ds-blue-400)] dark:[&_h2]:text-white dark:[&_strong]:text-white">
            {children}
          </div>

          <div className="mt-12 border-t border-[var(--ds-gray-200)] pt-6 dark:border-white/10">
            <Link
              href="/"
              className="text-sm font-medium text-[var(--ds-blue-700)] hover:underline dark:text-[var(--ds-blue-400)]"
            >
              ← Back to home
            </Link>
          </div>
        </main>
      </div>
    </>
  );
}
