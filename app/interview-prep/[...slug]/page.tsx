/**
 * Catch-all route for interview-prep role/topic pages, renders an MDX page
 * resolved from the Fumadocs `interviewSource` loader (the
 * `content/interview/` collection) at `/interview-prep/<role>[/<topic>]`.
 *
 * Mirrors `app/courses/[...slug]/page.tsx` (same `dynamic`-mode body load,
 * same prerendering via `generateStaticParams`, same canonical/OG metadata
 * and breadcrumb/Course JSON-LD), scoped to the interview collection. The
 * raw-Markdown action buttons are intentionally omitted, the `.md` mirror is
 * a courses/fumadocs-dev feature (see next.config.ts rewrites).
 *
 * The catch-all is REQUIRED (`[...slug]`, not `[[...slug]]`) because the bare
 * `/interview-prep` URL is the custom catalog page (`app/interview-prep/
 * page.tsx`), not a docs page.
 */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from "fumadocs-ui/page";
import { interviewSource } from "@/lib/source";
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

interface InterviewPageProps {
  params: Promise<{ slug: string[] }>;
}

export default async function InterviewPage(props: InterviewPageProps) {
  const params = await props.params;
  const page = interviewSource.getPage(params.slug);
  if (!page) notFound();

  const { body: MDX, toc } = await page.data.load();

  // --- JSON-LD: breadcrumb everywhere, Course on each role landing page. ---
  // The role folders are NOT Fumadocs roots (so the whole /interview-prep tree
  // is one navigable sidebar), so we derive position from the slug depth:
  //   ["<role>"]               → a role landing page
  //   ["<role>", "<topic>"]    → a topic page
  // The first segment's meta.json carries the human role name. (The bare
  // /interview-prep index is the catalog page, handled elsewhere.)
  const slugs = page.slugs;
  const roleSlug = slugs[0];
  const roleMeta = roleSlug
    ? await getCourseMeta(roleSlug, "interview")
    : null;
  const isRoleIndex = slugs.length === 1;

  const crumbs: BreadcrumbItem[] = [
    { name: "Interview Prep", url: absUrl("/interview-prep") },
  ];
  // Inside a role but past its landing page → add the role crumb.
  if (roleMeta && !isRoleIndex) {
    crumbs.push({
      name: roleMeta.title,
      url: absUrl(`/interview-prep/${roleSlug}`),
    });
  }
  // The page itself (skip on the landing page, which is crumb 1 already).
  if (slugs.length >= 1) {
    crumbs.push({ name: page.data.title, url: absUrl(page.url) });
  }

  const structuredData: object[] = [breadcrumbLd(crumbs)];
  if (isRoleIndex && roleMeta) {
    structuredData.push(
      courseLd({
        name: `${roleMeta.title} Interview Prep`,
        description: roleMeta.description ?? page.data.description,
        url: absUrl(page.url),
      }),
    );
  }

  return (
    <DocsPage toc={toc} full={page.data.full} breadcrumb={{ includeRoot: true }}>
      <JsonLd data={structuredData} />
      <DocsTitle>{page.data.title}</DocsTitle>
      {page.data.description ? (
        <DocsDescription>
          <MarkdownDescription>{page.data.description}</MarkdownDescription>
        </DocsDescription>
      ) : null}
      <DocsBody>
        {/* Output this lesson's runnable blocks produced when the site was
            built, so the page reads end to end before anyone presses Run.
            Only this lesson's slice crosses to the client; the manifest
            itself stays on the server. */}
        <BlockOutputsProvider
          outputs={lessonBlockOutputs(`content/interview/${page.path}`)}
        >
          {/* React blocks render their result the same way web blocks do,
              but their bundle is compiled by a workflow rather than derived
              at render time — see lib/reactBundles.ts. */}
          <ReactBundlesProvider
            bundles={lessonReactBundles(`content/interview/${page.path}`)}
          >
            <MDX components={getMDXComponents()} />
          </ReactBundlesProvider>
        </BlockOutputsProvider>
      </DocsBody>
    </DocsPage>
  );
}

export async function generateStaticParams() {
  return interviewSource.generateParams();
}

export async function generateMetadata(
  props: InterviewPageProps,
): Promise<Metadata> {
  const params = await props.params;
  const page = interviewSource.getPage(params.slug);
  if (!page) return {};

  const { title, description } = page.data;
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
