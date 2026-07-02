/**
 * Catch-all route for `/fumadocs-dev` — renders an MDX page resolved from
 * the Fumadocs `devSource` loader (the development-only component gallery
 * that used to live at `/learn`).
 *
 * Static params are generated from the source so every MDX file under
 * `content/fumadocs-dev/` becomes a pre-rendered page at build time. Calling
 * `notFound()` for unknown slugs lets Next.js render its standard 404.
 *
 * These pages exist purely for development/QA of the MDX components, so the
 * metadata marks them noindex (robots.txt also disallows the route).
 */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from "fumadocs-ui/page";
import {
  MarkdownCopyButton,
  ViewOptionsPopover,
} from "fumadocs-ui/layouts/docs/page";
import { devSource } from "@/lib/source";
import { getMDXComponents } from "@/mdx-components";
import { MarkdownDescription } from "@/app/_components/MarkdownDescription";

// Pages live at `content/fumadocs-dev/<page.path>` on the default branch, so
// the "Open in GitHub" action links straight to the page source.
const GITHUB_BLOB_BASE =
  "https://github.com/dataslope/dataslope/blob/main/content/fumadocs-dev";

interface FumadocsDevPageProps {
  params: Promise<{ slug?: string[] }>;
}

export default async function FumadocsDevPage(props: FumadocsDevPageProps) {
  const params = await props.params;
  const page = devSource.getPage(params.slug);
  if (!page) notFound();

  // The docs collection uses `dynamic` mode (see `source.config.ts`), so the
  // compiled MDX body and TOC are fetched on demand here rather than being
  // bundled with the route. Frontmatter fields (title, description, full)
  // remain available directly on `page.data`.
  const { body: MDX, toc } = await page.data.load();

  // `markdownUrl` is rewritten to the raw-Markdown route handler (see
  // `next.config.ts` and `app/llms/fumadocs-dev/[[...slug]]/route.ts`). The
  // `MarkdownCopyButton` fetches it for the clipboard; `ViewOptionsPopover`
  // links to it ("View as Markdown") and builds the "Open in ChatGPT/Claude"
  // shortcuts, alongside the GitHub source link.
  const markdownUrl = `${page.url}.md`;
  const githubUrl = `${GITHUB_BLOB_BASE}/${page.path}`;

  return (
    // All pages in this collection are loose top-level demo pages (no `root`
    // course folders), so there's no breadcrumb or Course JSON-LD here —
    // this section is a flat, dev-only gallery.
    <DocsPage toc={toc} full={page.data.full}>
      <DocsTitle>{page.data.title}</DocsTitle>
      {page.data.description ? (
        <DocsDescription>
          <MarkdownDescription>{page.data.description}</MarkdownDescription>
        </DocsDescription>
      ) : null}
      {/* Inline styles (not Tailwind utilities) on purpose: `docs.css` runs
          Tailwind with `source(none)` and only scans Fumadocs's own dist, so
          utility classes authored here would never be generated. The buttons
          themselves are Fumadocs components and keep their compiled styles. */}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: "0.5rem",
          paddingBottom: "1rem",
          borderBottom: "1px solid var(--color-fd-border)",
        }}
      >
        <MarkdownCopyButton markdownUrl={markdownUrl} />
        <ViewOptionsPopover markdownUrl={markdownUrl} githubUrl={githubUrl} />
      </div>
      <DocsBody>
        <MDX components={getMDXComponents()} />
      </DocsBody>
    </DocsPage>
  );
}

export async function generateStaticParams() {
  return devSource.generateParams();
}

export async function generateMetadata(
  props: FumadocsDevPageProps,
): Promise<Metadata> {
  const params = await props.params;
  const page = devSource.getPage(params.slug);
  if (!page) return {};

  const { title, description } = page.data;
  return {
    title,
    description,
    // Dev-only gallery: keep it out of search engines (robots.txt disallows
    // the whole /fumadocs-dev section too).
    robots: { index: false },
  };
}
