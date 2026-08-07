/**
 * Raw Markdown endpoint for `/fumadocs-dev` pages.
 *
 * Serves the unprocessed `.mdx` source of the development-only
 * component-gallery pages as `text/markdown`, so the page-action buttons
 * (Copy Markdown / View as Markdown) and the Ask AI lesson-context fetch
 * keep working on the dev pages. Reached via the `/fumadocs-dev.md` and
 * `/fumadocs-dev/:path*.md` rewrites in `next.config.ts`. (The `/courses`
 * lessons' equivalents are NOT a route: they are emitted as static assets
 * into `public/courses/` by `scripts/build-course-md.mjs`, which keeps ~780
 * prerenders out of `next build`; this dev-only collection is 34 pages, not
 * worth its own generator.)
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { devSource } from "@/lib/source";

export const revalidate = false;
export const dynamic = "force-static";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug?: string[] }> },
) {
  const { slug } = await params;
  const page = devSource.getPage(slug);
  if (!page) {
    return new Response("Not found", { status: 404 });
  }

  // The literal "content"/"fumadocs-dev" segments are load-bearing, not
  // decoration: Turbopack statically analyses this call to decide what to
  // put in the server output's file trace, and a path it cannot scope makes
  // it trace the WHOLE project. This used to read
  // `page.absolutePath ?? path.join(…)`, and `page.absolutePath` is an
  // opaque value with no static prefix, so the analysis gave up and swept in
  // 4489 files — all 1832 of public/images and 834 of public/courses among
  // them, none of which this route reads. Scoping the join to a literal
  // subfolder is the documented fix (the build warns and names it), and it
  // is a pure simplification besides: fumadocs-mdx builds `absolutePath` as
  // `path.resolve("content/fumadocs-dev/<page.path>")`, so the branch that
  // was defeating the analysis only ever produced this same path.
  const filePath = path.join(
    process.cwd(),
    "content",
    "fumadocs-dev",
    page.path,
  );
  const content = await readFile(filePath, "utf8");

  return new Response(content, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      // The raw Markdown only changes on deploy (which purges the edge
      // cache), so let the CDN hold it as long as it likes, every CDN hit
      // is a free read instead of a metered ISR Read.
      "Cache-Control": "public, s-maxage=31536000, stale-while-revalidate",
    },
  });
}

export function generateStaticParams() {
  return devSource.generateParams();
}
