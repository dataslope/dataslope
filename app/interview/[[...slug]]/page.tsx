/**
 * Catch-all route for `/interview` — renders an MDX page resolved from the
 * Fumadocs `interviewSource` loader (the `content/interview/` collection).
 *
 * Mirrors `app/learn/[[...slug]]/page.tsx` (same `dynamic`-mode body load,
 * same prerendering via `generateStaticParams`, same canonical/OG metadata
 * and breadcrumb/Course JSON-LD), scoped to the interview collection. The
 * raw-Markdown action buttons are intentionally omitted — the `.md` mirror is
 * a /learn-only feature (see next.config.ts rewrites).
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
  params: Promise<{ slug?: string[] }>;
}

export default async function InterviewPage(props: InterviewPageProps) {
  const params = await props.params;
  const page = interviewSource.getPage(params.slug);
  if (!page) notFound();

  const { body: MDX, toc } = await page.data.load();

  // --- JSON-LD: breadcrumb everywhere, Course on each role landing page. ---
  // The role folders are NOT Fumadocs roots (so the whole /interview tree is one
  // navigable sidebar), so we derive position from the slug depth instead:
  //   []                       → the /interview landing page
  //   ["<role>"]               → a role landing page
  //   ["<role>", "<topic>"]    → a topic page
  // The first segment's meta.json carries the human role name.
  const slugs = page.slugs;
  const roleSlug = slugs[0];
  const roleMeta = roleSlug
    ? await getCourseMeta(roleSlug, "interview")
    : null;
  const isRoleIndex = slugs.length === 1;

  const crumbs: BreadcrumbItem[] = [
    { name: "Interview Prep", url: absUrl("/interview") },
  ];
  // Inside a role but past its landing page → add the role crumb.
  if (roleMeta && !isRoleIndex) {
    crumbs.push({ name: roleMeta.title, url: absUrl(`/interview/${roleSlug}`) });
  }
  // The page itself (skip on the /interview landing, which is crumb 1 already).
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
        <MDX components={getMDXComponents()} />
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
