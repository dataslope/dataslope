/**
 * Enumerates the indexable playground routes: the `/playground` hub plus each
 * language page (any `app/playground/<slug>/` that has a `page.tsx`).
 *
 * Read from the filesystem at build time so a newly-added playground is picked
 * up by the sitemap automatically, no second list to keep in sync with the
 * route tree.
 */
import { readdirSync, existsSync } from "node:fs";
import path from "node:path";

export function getPlaygroundPaths(): string[] {
  const langs: string[] = [];
  try {
    // Inside the try with the read it feeds: `process.cwd` is not guaranteed
    // to exist on every runtime this can be bundled into, and computing the
    // path outside would throw past the fallback rather than into it. See
    // lib/blockOutputs.ts, where that cost a 500 on every dynamic render.
    const dir = path.join(process.cwd(), "app", "playground");
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const hasPage =
        existsSync(path.join(dir, entry.name, "page.tsx")) ||
        existsSync(path.join(dir, entry.name, "page.ts"));
      if (hasPage) langs.push(entry.name);
    }
  } catch {
    // Build environment without the app dir, fall back to just the hub.
  }
  langs.sort();
  return ["/playground", ...langs.map((lang) => `/playground/${lang}`)];
}
