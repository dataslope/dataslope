/**
 * Catch-all route for `/learn` — renders an MDX page resolved from the
 * Fumadocs `source` loader.
 *
 * Static params are generated from the source so every MDX file under
 * `content/learn/` becomes a pre-rendered page at build time. Calling
 * `notFound()` for unknown slugs lets Next.js render its standard 404.
 */
import { notFound } from "next/navigation";
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from "fumadocs-ui/page";
import { source } from "@/lib/source";
import { getMDXComponents } from "@/mdx-components";
import { LessonComplete } from "@/app/_components/learn/LessonComplete";

interface LearnPageProps {
  params: Promise<{ slug?: string[] }>;
}

export default async function LearnPage(props: LearnPageProps) {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) notFound();

  const MDX = page.data.body;

  return (
    <DocsPage toc={page.data.toc} full={page.data.full}>
      <DocsTitle>{page.data.title}</DocsTitle>
      {page.data.description ? (
        <DocsDescription>{page.data.description}</DocsDescription>
      ) : null}
      <DocsBody>
        <MDX components={getMDXComponents()} />
        <LessonComplete />
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
