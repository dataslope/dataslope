/**
 * Raw Markdown endpoint for `/fumadocs-dev` pages.
 *
 * Mirrors `app/llms/courses/[[...slug]]/route.ts` for the development-only
 * component-gallery collection, so the page-action buttons (Copy Markdown /
 * View as Markdown) and the Ask AI lesson-context fetch keep working on the
 * dev pages. Reached via the `/fumadocs-dev.md` and `/fumadocs-dev/:path*.md`
 * rewrites in `next.config.ts`.
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

  const filePath =
    page.absolutePath ??
    path.join(process.cwd(), "content", "fumadocs-dev", page.path);
  const content = await readFile(filePath, "utf8");

  return new Response(content, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      // The raw Markdown only changes on deploy (which purges the edge
      // cache), so let the CDN hold it as long as it likes — every CDN hit
      // is a free read instead of a metered ISR Read.
      "Cache-Control": "public, s-maxage=31536000, stale-while-revalidate",
    },
  });
}

export function generateStaticParams() {
  return devSource.generateParams();
}
