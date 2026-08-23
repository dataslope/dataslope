/**
 * Check that every package a React bundle imports can actually be fetched,
 * before the preview tries to run it.
 *
 * Bare imports leave the bundler as external esm.sh URLs, so a mistyped
 * package name survives the build and fails later, inside the sandboxed
 * frame, as a module-script fetch error that carries no specifier and no
 * message. A typo in a package name is a routine mistake and it produced a
 * blank preview with an empty console; checking the URLs here puts the
 * failure in the same place as the bundler's own excellent errors.
 */
import { esmShUrlFor, isBareSpecifier } from "./esmResolve";

/** Static and dynamic import specifiers appearing in bundled output. */
const IMPORT_RE =
  /(?:^|[\s;}])(?:import|export)\s[^'"]*?from\s*["']([^"']+)["']|import\s*\(\s*["']([^"']+)["']\s*\)|(?:^|[\s;}])import\s*["']([^"']+)["']/g;

/** The bare packages a bundle depends on, deduped, in first-seen order. */
export function externalSpecifiers(bundleJs: string): string[] {
  const seen = new Set<string>();
  for (const match of bundleJs.matchAll(IMPORT_RE)) {
    const specifier = match[1] ?? match[2] ?? match[3];
    if (!specifier) continue;
    // The bundler already rewrote bare specifiers to esm.sh URLs; take
    // those back apart so the message names the package, not the URL.
    if (specifier.startsWith("http")) {
      seen.add(specifier);
    } else if (isBareSpecifier(specifier)) {
      seen.add(esmShUrlFor(specifier));
    }
  }
  return [...seen];
}

export interface PreflightFailure {
  url: string;
  /** HTTP status, or 0 when the request never got an answer. */
  status: number;
  message: string;
}

/** Package name inside an esm.sh URL, for a message that reads like the
 *  import the user wrote. */
export function packageNameFromUrl(url: string): string {
  const path = url.replace(/^https?:\/\/[^/]+\//, "").split("?")[0];
  const segments = path.split("/");
  const name = path.startsWith("@")
    ? segments.slice(0, 2).join("/")
    : segments[0];
  // Strip the version pin: "react@19.2.8" reads better as "react".
  return name.replace(/@[^@/]+$/, "");
}

/** Answers already known this session; a package that resolved once does
 *  not get re-fetched on every Run. */
const resolved = new Set<string>();

export function resetPreflightCache(): void {
  resolved.clear();
}

/**
 * Fetch-check each external URL. Resolves to the failures; an empty array
 * means every import is reachable.
 *
 * Deliberately forgiving about *how* a check fails: a 404 means the
 * package does not exist, while a network error means the reader is
 * offline or esm.sh is blocked, and the two deserve different sentences.
 */
export async function preflightModules(
  urls: string[],
  fetchImpl: typeof fetch = fetch,
): Promise<PreflightFailure[]> {
  const failures: PreflightFailure[] = [];
  await Promise.all(
    urls.map(async (url) => {
      if (resolved.has(url)) return;
      try {
        // esm.sh answers HEAD, and a HEAD costs nothing next to the module
        // body the frame is about to fetch anyway.
        const response = await fetchImpl(url, { method: "HEAD" });
        if (response.ok) {
          resolved.add(url);
          return;
        }
        failures.push({
          url,
          status: response.status,
          message:
            response.status === 404
              ? `Cannot resolve "${packageNameFromUrl(url)}": esm.sh returned 404 (${url})`
              : `Cannot load "${packageNameFromUrl(url)}": esm.sh returned ${response.status} (${url})`,
        });
      } catch {
        failures.push({
          url,
          status: 0,
          message:
            `Could not reach ${url}. The package may be fine; check your connection, ` +
            "or whether something on this network blocks esm.sh.",
        });
      }
    }),
  );
  return failures;
}
