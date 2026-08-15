/**
 * Raw Markdown endpoint for `/fumadocs-dev` pages: serves the unprocessed
 * `.mdx` source as `text/markdown` for the page-action buttons and Ask AI.
 * Reached via the `.md` rewrites in next.config.ts. (Course lessons' `.md`
 * mirrors are static assets from `scripts/build-course-md.mjs` instead.)
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

  // The literal "content"/"fumadocs-dev" segments are load-bearing: Turbopack
  // statically analyses this call to scope the server output's file trace,
  // and an opaque path (e.g. `page.absolutePath`) makes it trace the whole
  // project. fumadocs-mdx resolves to this same path anyway.
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
      // Only changes on deploy (which purges the edge cache), so let the CDN
      // hold it indefinitely.
      "Cache-Control": "public, s-maxage=31536000, stale-while-revalidate",
    },
  });
}

export function generateStaticParams() {
  return devSource.generateParams();
}
