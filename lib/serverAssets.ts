/**
 * Read a generated static asset out of `public/` from server code on
 * whichever side is running: Node (build/dev) reads the filesystem; workerd
 * fetches from the ASSETS binding (unenv's `node:fs` stub throws at call
 * time). This lets build products live as static assets instead of imported
 * modules that count against the Worker's 10 MiB gzipped ceiling. Returns
 * null when not found on either side; callers decide how to degrade.
 * Server-only — do not import from client components.
 */

/** The slice of the ASSETS fetcher this module touches. Structural on
 *  purpose: `CloudflareEnv`'s binding is typed with workers-types' own
 *  `Response`, which is not assignable to the DOM `Response` this file
 *  compiles against, so naming either concrete type here loses. */
interface AssetsBinding {
  fetch(input: URL): Promise<{ ok: boolean; text(): Promise<string> }>;
}

export async function readPublicAsset(relPath: string): Promise<string | null> {
  // Node (build machine, `next dev`): the file is on disk.
  try {
    const [{ readFile }, { join }] = await Promise.all([
      import("node:fs/promises"),
      import("node:path"),
    ]);
    return await readFile(join(process.cwd(), "public", relPath), "utf8");
  } catch {
    // workerd reaches here (unenv's readFile throws "not implemented"), as
    // does a genuinely missing file on Node — the ASSETS attempt below
    // settles which it was.
  }

  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const { env } = getCloudflareContext();
    const assets = (env as unknown as { ASSETS?: AssetsBinding }).ASSETS;
    if (assets) {
      // The binding routes by pathname only; the host is a placeholder.
      const res = await assets.fetch(new URL(`/${relPath}`, "https://assets.local"));
      if (res.ok) return await res.text();
    }
  } catch {
    // No Cloudflare context either (e.g. plain Node with the file truly
    // absent) — fall through to null.
  }
  return null;
}
