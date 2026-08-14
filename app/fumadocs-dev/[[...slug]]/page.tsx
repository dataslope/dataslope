/**
 * Catch-all route for `/fumadocs-dev`, the development-only MDX component
 * gallery, resolved from the Fumadocs `devSource` loader. Dev/QA only, so the
 * pages are noindex (robots.txt also disallows the route).
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

// "Open in GitHub" links straight to the page source on the default branch.
const GITHUB_BLOB_BASE =
  "https://github.com/dataslope/dataslope/blob/main/content/fumadocs-dev";

interface FumadocsDevPageProps {
  params: Promise<{ slug?: string[] }>;
}

export default async function FumadocsDevPage(props: FumadocsDevPageProps) {
  const params = await props.params;
  const page = devSource.getPage(params.slug);
  if (!page) notFound();

  // The docs collection uses `dynamic` mode (source.config.ts): compiled MDX
  // body + TOC are fetched on demand rather than bundled with the route.
  const { body: MDX, toc } = await page.data.load();

  // Rewritten to the raw-Markdown route handler (next.config.ts,
  // app/llms/fumadocs-dev/[[...slug]]/route.ts); the copy button and
  // view-options popover consume it.
  const markdownUrl = `${page.url}.md`;
  const githubUrl = `${GITHUB_BLOB_BASE}/${page.path}`;

  return (
    // A flat dev-only gallery: no breadcrumb or Course JSON-LD.
    <DocsPage toc={toc} full={page.data.full}>
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
        <MDX components={getMDXComponents()} />
      </DocsBody>
    </DocsPage>
  );
}

export async function generateStaticParams() {
  return devSource.generateParams();
}

// Unmatched paths 404 instead of minting an on-demand render + a permanently
// cached not-found page per distinct bad URL (see app/courses/[...slug]/
// page.tsx). noindex/robots don't stop scanners, so this applies here too.
export const dynamicParams = false;

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
    // Dev-only gallery: keep it out of search engines.
    robots: { index: false },
  };
}
