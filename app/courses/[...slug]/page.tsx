/**
 * Catch-all route for course lessons: renders MDX resolved from the Fumadocs
 * `courseSource` loader. `[...slug]` (not `[[...slug]]`) is required — the
 * bare `/courses` URL is the catalog index page.
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
import { courseSource } from "@/lib/source";
import { getMDXComponents } from "@/mdx-components";
import { BlockOutputsProvider } from "@/app/_components/mdx/BlockOutputs";
import { ReactBundlesProvider } from "@/app/_components/mdx/ReactBundles";
import { lessonBlockOutputs } from "@/lib/blockOutputs";
import { lessonReactBundles } from "@/lib/reactBundles";
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

// "Open in GitHub" links straight to the lesson source on the default branch.
const GITHUB_BLOB_BASE =
  "https://github.com/dataslope/dataslope/blob/main/content/courses";

interface CoursePageProps {
  params: Promise<{ slug: string[] }>;
}

export default async function CoursePage(props: CoursePageProps) {
  const params = await props.params;
  const page = courseSource.getPage(params.slug);
  if (!page) notFound();

  // The docs collection uses `dynamic` mode (source.config.ts): compiled MDX
  // body + TOC are fetched on demand rather than bundled with the route.
  const { body: MDX, toc } = await page.data.load();

  // The lesson's raw-Markdown mirror, emitted into `public/courses/` at build
  // time by `scripts/build-course-md.mjs`; the copy button and view-options
  // popover consume it.
  const markdownUrl = `${page.url}.md`;
  const githubUrl = `${GITHUB_BLOB_BASE}/${page.path}`;

  // JSON-LD: breadcrumb on every lesson, Course on landing pages. meta.json
  // carries the course name (the index page's own title is usually "Welcome").
  const slugs = page.slugs;
  const courseSlug = slugs[0];
  const courseMeta = courseSlug ? await getCourseMeta(courseSlug) : null;
  const isCourseRoot = slugs.length === 1 && courseMeta?.root === true;

  const crumbs: BreadcrumbItem[] = [
    { name: "Courses", url: absUrl("/courses") },
  ];
  if (courseMeta?.root) {
    crumbs.push({
      name: courseMeta.title,
      url: absUrl(`/courses/${courseSlug}`),
    });
  }
  // The course-root crumb already represents the page; only lessons get a leaf.
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
    // meta.json's `root: true` scopes the sidebar/breadcrumb tree to the
    // course; `includeRoot` adds the course as the leading crumb — without it
    // the breadcrumb would render nothing (the course is the only node in scope).
    <DocsPage toc={toc} full={page.data.full} breadcrumb={{ includeRoot: true }}>
      <JsonLd data={structuredData} />
      <DocsTitle>{page.data.title}</DocsTitle>
      {page.data.description ? (
        <DocsDescription>
          <MarkdownDescription>{page.data.description}</MarkdownDescription>
        </DocsDescription>
      ) : null}
      {/* Inline styles on purpose: `docs.css` runs Tailwind with
          `source(none)`, so utility classes authored here are never generated. */}
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
        {/* Build-time outputs for this lesson's runnable blocks; only this
            lesson's slice crosses to the client. */}
        <BlockOutputsProvider
          outputs={lessonBlockOutputs(`content/courses/${page.path}`)}
        >
          {/* React block bundles are compiled by a workflow, see
              lib/reactBundles.ts. */}
          <ReactBundlesProvider
            bundles={lessonReactBundles(`content/courses/${page.path}`)}
          >
            <MDX components={getMDXComponents()} />
          </ReactBundlesProvider>
        </BlockOutputsProvider>
      </DocsBody>
    </DocsPage>
  );
}

export async function generateStaticParams() {
  return courseSource.generateParams();
}

// Serve only the prerendered params; everything else 404s. The site is fully
// static, so an unknown slug can never become valid between deploys — and with
// the default (`true`), every distinct bad URL got an on-demand render plus a
// ~1.8 MB not-found page cached forever by OpenNext. Flat one-segment lesson
// URLs are redirected earlier in next.config.ts (lib/courseAliasRedirects.ts),
// so this only sees paths that genuinely don't exist.
export const dynamicParams = false;

export async function generateMetadata(
  props: CoursePageProps,
): Promise<Metadata> {
  const params = await props.params;
  const page = courseSource.getPage(params.slug);
  if (!page) return {};

  const { title, description } = page.data;
  // Relative canonical; Next resolves it against `metadataBase` (app/layout.tsx).
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
