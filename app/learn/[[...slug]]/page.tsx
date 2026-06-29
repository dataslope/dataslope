/**
 * Catch-all route for `/learn` — renders an MDX page resolved from the
 * Fumadocs `source` loader.
 *
 * Static params are generated from the source so every MDX file under
 * `content/learn/` becomes a pre-rendered page at build time. Calling
 * `notFound()` for unknown slugs lets Next.js render its standard 404.
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
import { source } from "@/lib/source";
import { getMDXComponents } from "@/mdx-components";
import { OG_IMAGE } from "@/lib/site";
import { getCourseMeta } from "@/lib/courseMeta";
import { JsonLd } from "@/app/_components/JsonLd";
import { MarkdownDescription } from "@/app/_components/MarkdownDescription";
import {
  absUrl,
  breadcrumbLd,
  courseLd,
  type BreadcrumbItem,
} from "@/lib/structuredData";

// Lessons live at `content/learn/<page.path>` on the default branch, so the
// "Open in GitHub" action links straight to the page source.
const GITHUB_BLOB_BASE =
  "https://github.com/dataslope/dataslope/blob/main/content/learn";

interface LearnPageProps {
  params: Promise<{ slug?: string[] }>;
}

export default async function LearnPage(props: LearnPageProps) {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) notFound();

  // The docs collection uses `dynamic` mode (see `source.config.ts`), so the
  // compiled MDX body and TOC are fetched on demand here rather than being
  // bundled with the route. Frontmatter fields (title, description, full)
  // remain available directly on `page.data`.
  const { body: MDX, toc } = await page.data.load();

  // `markdownUrl` is rewritten to the raw-Markdown route handler (see
  // `next.config.ts` and `app/llms/learn/[[...slug]]/route.ts`). The
  // `MarkdownCopyButton` fetches it for the clipboard; `ViewOptionsPopover`
  // links to it ("View as Markdown") and builds the "Open in ChatGPT/Claude"
  // shortcuts, alongside the GitHub source link.
  const markdownUrl = `${page.url}.md`;
  const githubUrl = `${GITHUB_BLOB_BASE}/${page.path}`;

  // --- JSON-LD: breadcrumb on every lesson, Course on course landing pages ---
  // The first slug segment is the course folder; its meta.json carries the
  // human course name + `root` flag (the index page's own frontmatter title is
  // usually "Welcome", not the course name).
  const slugs = page.slugs;
  const courseSlug = slugs[0];
  const courseMeta = courseSlug ? await getCourseMeta(courseSlug) : null;
  const isCourseRoot = slugs.length === 1 && courseMeta?.root === true;

  const crumbs: BreadcrumbItem[] = [{ name: "Learn", url: absUrl("/learn") }];
  if (courseMeta?.root) {
    crumbs.push({
      name: courseMeta.title,
      url: absUrl(`/learn/${courseSlug}`),
    });
  }
  // The course-root crumb above already represents the page itself; only add a
  // leaf crumb for actual lessons (and loose demo pages).
  if (!isCourseRoot) {
    crumbs.push({ name: page.data.title, url: absUrl(page.url) });
  }

  const structuredData: object[] = [breadcrumbLd(crumbs)];
  if (isCourseRoot && courseMeta) {
    structuredData.push(
      courseLd({
        name: courseMeta.title,
        description: courseMeta.description ?? page.data.description,
        url: absUrl(page.url),
      }),
    );
  }

  return (
    // Each course folder's meta.json sets `root: true`, so Fumadocs scopes the
    // sidebar and breadcrumb tree to that course (the root folder's title is the
    // course name). `includeRoot: true` adds that root as the breadcrumb's
    // leading crumb — linking to the course index — which surfaces the course
    // name on every lesson page. Without it the breadcrumb excludes the root,
    // and since the course is the only node in scope it would render nothing.
    // Loose/demo pages under `content/learn` aren't inside a `root` folder, so
    // they simply get no breadcrumb.
    <DocsPage toc={toc} full={page.data.full} breadcrumb={{ includeRoot: true }}>
      <JsonLd data={structuredData} />
      <DocsTitle>{page.data.title}</DocsTitle>
      {page.data.description ? (
        <DocsDescription>
          <MarkdownDescription>{page.data.description}</MarkdownDescription>
        </DocsDescription>
      ) : null}
      {/* Inline styles (not Tailwind utilities) on purpose: `learn.css` runs
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
  return source.generateParams();
}

export async function generateMetadata(
  props: LearnPageProps,
): Promise<Metadata> {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) return {};

  const { title, description } = page.data;
  // `page.url` is the lesson's canonical path (e.g. /learn/python-basics/loops).
  // Relative here — Next resolves it against `metadataBase` (app/layout.tsx).
  const url = page.url;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      url,
      siteName: "DataSlope",
      title,
      description,
      images: [OG_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [OG_IMAGE],
    },
  };
}
