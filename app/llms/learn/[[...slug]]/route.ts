/**
 * Raw Markdown endpoint for `/learn` pages.
 *
 * Serves the unprocessed `.mdx` source of each lesson as `text/markdown`,
 * giving the page-action buttons (see `app/learn/[[...slug]]/page.tsx`) a
 * URL to point at:
 *   - "Copy Markdown" fetches this and writes it to the clipboard.
 *   - "View as Markdown" in the "Open" dropdown links here directly.
 *
 * Reached via the `/learn/:path*.md` → `/llms/learn/:path*` rewrite in
 * `next.config.ts`, so the public URL is just `${page.url}.md`. The handler
 * is statically generated from the same params as the page route, so no
 * filesystem access happens at request time in production.
 *
 * We return the raw file (frontmatter + MDX body) rather than compiling it:
 * the docs collection runs in `dynamic` mode (see `source.config.ts`) to
 * keep ~800 lessons out of the bundler, and a plain file read keeps this
 * endpoint just as cheap while still handing LLMs the full authored source.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { source } from "@/lib/source";

export const revalidate = false;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug?: string[] }> },
) {
  const { slug } = await params;
  const page = source.getPage(slug);
  if (!page) {
    return new Response("Not found", { status: 404 });
  }

  const filePath =
    page.absolutePath ??
    path.join(process.cwd(), "content", "learn", page.path);
  const content = await readFile(filePath, "utf8");

  return new Response(content, {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
}

export function generateStaticParams() {
  return source.generateParams();
}
