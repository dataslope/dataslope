/**
 * Origin allow-list matching for the Dataslope CORS proxy. Kept free of
 * Cloudflare Workers types so it can be unit-tested from the main project's
 * Node/Vitest suite.
 */

/** Allow-list split into exact strings (Set lookup) and compiled `*` patterns. */
export interface AllowList {
  /** Exact origin strings (no trailing slash). */
  exact: Set<string>;
  /** Compiled wildcard patterns (see {@link wildcardOriginToRegExp}). */
  patterns: RegExp[];
}

/**
 * Compiles a wildcard origin entry into an anchored RegExp. `*` matches
 * within a single hostname label only (never `.` or `/`), so
 * `https://*-dataslope.subwaymatch.workers.dev` can never match
 * `staging-dataslope.attacker.workers.dev`. Splitting on `*` before escaping
 * keeps regex-escaping and wildcard substitution from interfering.
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
 * True when the origin is localhost (any port, http or https). URL parsing
 * rather than a regex, to avoid ReDoS on pathological inputs.
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
