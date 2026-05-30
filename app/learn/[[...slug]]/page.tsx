/**
 * Catch-all route for `/learn` — renders an MDX page resolved from the
 * Fumadocs `source` loader.
 *
 * Static params are generated from the source so every MDX file under
 * `content/learn/` becomes a pre-rendered page at build time. Calling
 * `notFound()` for unknown slugs lets Next.js render its standard 404.
 */
import { notFound } from "next/navigation";
import { readFile } from "node:fs/promises";
import path from "node:path";
import Link from "next/link";
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from "fumadocs-ui/page";
import { source } from "@/lib/source";
import { getMDXComponents } from "@/mdx-components";

interface LearnPageProps {
  params: Promise<{ slug?: string[] }>;
}

async function getCourseTitle(courseSlug: string): Promise<string | null> {
  try {
    const metaPath = path.join(process.cwd(), "content", "learn", courseSlug, "meta.json");
    const raw = await readFile(metaPath, "utf-8");
    const meta = JSON.parse(raw) as { title?: string };
    return meta.title ?? null;
  } catch {
    return null;
  }
}

export default async function LearnPage(props: LearnPageProps) {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) notFound();

  const MDX = page.data.body;
  const slug = params.slug ?? [];
  const courseSlug = slug.length > 1 ? slug[0] : null;
  const courseTitle = courseSlug ? await getCourseTitle(courseSlug) : null;

  return (
    <DocsPage toc={page.data.toc} full={page.data.full}>
      {courseTitle && courseSlug && (
        <Link href={`/learn/${courseSlug}`} data-course-label="">
          {courseTitle}
        </Link>
      )}
      <DocsTitle>{page.data.title}</DocsTitle>
      {page.data.description ? (
        <DocsDescription>{page.data.description}</DocsDescription>
      ) : null}
      <DocsBody>
        <MDX components={getMDXComponents()} />
      </DocsBody>
    </DocsPage>
  );
}

export async function generateStaticParams() {
  return source.generateParams();
}

export async function generateMetadata(props: LearnPageProps) {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) return {};
  return {
    title: page.data.title,
    description: page.data.description,
  };
}
