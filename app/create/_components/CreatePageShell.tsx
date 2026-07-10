// Server-component chrome shared by every /create page: the `.ds-home`
// bundle (HomeNav/HomeFooter, theme bootstrap) wrapped around a page
// header + the builder client component. Mirrors app/account/page.tsx.
import { HomeNav } from "@/app/_components/home/HomeNav";
import { HomeFooter } from "@/app/_components/home/HomeFooter";
import { THEME_BOOTSTRAP } from "@/app/_components/home/themeBootstrap";

export function CreatePageShell({
  eyebrow,
  title,
  lede,
  children,
}: {
  eyebrow: string;
  title: string;
  lede?: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      <div
        style={{ fontFamily: "var(--font-sans, Inter, system-ui, sans-serif)" }}
        className="ds-home flex min-h-screen flex-col bg-white text-[var(--ds-gray-800)] dark:bg-[#121212] dark:text-[var(--ds-gray-100)]"
      >
        <HomeNav />
        <main className="flex-1 overflow-x-clip">
          <section className="px-4 pb-20 pt-12 sm:px-6 sm:pt-16">
            <div className="mx-auto max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ds-green-600)] dark:text-[var(--ds-green-400)]">
                {eyebrow}
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--ds-gray-900)] sm:text-4xl dark:text-white">
                {title}
              </h1>
              {lede ? (
                <p className="mt-3 text-base leading-relaxed text-[var(--ds-gray-500)] dark:text-[var(--ds-gray-400)]">
                  {lede}
                </p>
              ) : null}
              <div className="mt-8">{children}</div>
            </div>
          </section>
        </main>
        <HomeFooter />
      </div>
    </>
  );
}
