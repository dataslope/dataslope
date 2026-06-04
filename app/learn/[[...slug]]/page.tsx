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

  return (
    <DocsPage toc={toc} full={page.data.full}>
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
