/**
 * Origin allow-list matching for the Dataslope CORS proxy.
 *
 * Kept free of any Cloudflare Workers types so the logic can be unit-tested
 * from the main project's Node/Vitest suite without pulling Workers globals
 * (`ExportedHandler`, etc.) into the app's TypeScript program.
 */

/**
 * An allow-list of Origins, split into exact matches and wildcard patterns.
 * Most entries are exact strings (fast Set lookup); entries containing a `*`
 * (e.g. the app worker's preview hostnames) are compiled to anchored RegExps.
 */
export interface AllowList {
  /** Exact origin strings (no trailing slash). */
  exact: Set<string>;
  /** Compiled wildcard patterns (see {@link wildcardOriginToRegExp}). */
  patterns: RegExp[];
}

/**
 * Compiles a wildcard origin entry into an anchored RegExp.
 *
 * A `*` matches one or more characters *within a single hostname label*,
 * i.e. it never matches a `.` (a label separator) or `/` (a path separator).
 * That keeps a pattern like `https://*-dataslope.subwaymatch.workers.dev`
 * scoped to the intended host: it can match
 * `staging-dataslope.subwaymatch.workers.dev` but never
 * `staging-dataslope.attacker.workers.dev` or
 * `evil.com/-dataslope.subwaymatch.workers.dev`.
 *
 * Splitting on `*` first, then escaping each literal segment, ensures the
 * regex-escaping and the wildcard substitution can't interfere with one
 * another (e.g. an escaped `.` is never mistaken for the wildcard).
 */
export function wildcardOriginToRegExp(pattern: string): RegExp {
  const body = pattern
    .split("*")
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("[^./]+");
  return new RegExp(`^${body}$`);
}

export function parseAllowedOrigins(raw: string): AllowList {
  const exact = new Set<string>();
  const patterns: RegExp[] = [];
  for (const entry of raw
    .split(",")
    .map((o) => o.trim().replace(/\/+$/, ""))
    .filter(Boolean)) {
    if (entry.includes("*")) {
      patterns.push(wildcardOriginToRegExp(entry));
    } else {
      exact.add(entry);
    }
  }
  return { exact, patterns };
}

/** Returns true when `origin` matches an exact entry or a wildcard pattern. */
export function isOriginInAllowList(origin: string, allow: AllowList): boolean {
  return allow.exact.has(origin) || allow.patterns.some((re) => re.test(origin));
}

/**
 * Returns true when the origin is localhost (any port, http or https).
 * Uses URL parsing rather than a regex to avoid potential ReDoS on
 * pathological inputs.
 */
export function isLocalhostOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    return (
      (url.protocol === "http:" || url.protocol === "https:") &&
      url.hostname === "localhost"
    );
  } catch {
    return false;
  }
}
