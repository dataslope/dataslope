/**
 * Turn a position in the esbuild bundle back into a position in the file
 * the reader edited.
 *
 * esbuild already emits an inline source map (`sourcemap: "inline"` in
 * REACT_BUILD_OPTIONS) so DevTools points at `App.tsx`, but the browser's
 * `error` event does not consume source maps: the output panel was left
 * reporting `line 175` of a bundle nobody can see. Decoding the map here
 * gives the panel the same answer DevTools shows.
 *
 * Only the mappings' line/column/source fields are needed, so this is a
 * small VLQ reader rather than a source-map library.
 */

const BASE64 =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

const CHAR_TO_INT = new Map<string, number>();
for (let i = 0; i < BASE64.length; i++) CHAR_TO_INT.set(BASE64[i], i);

/** Decode one VLQ-encoded field, returning the value and where it ended. */
function decodeVlq(segment: string, start: number): [number, number] {
  let result = 0;
  let shift = 0;
  let index = start;
  for (;;) {
    const digit = CHAR_TO_INT.get(segment[index]);
    if (digit === undefined) throw new Error("bad VLQ");
    index += 1;
    result += (digit & 31) << shift;
    if ((digit & 32) === 0) break;
    shift += 5;
  }
  const negative = (result & 1) === 1;
  result >>>= 1;
  return [negative ? -result : result, index];
}

export interface SourcePosition {
  /** Source path as the map names it, with esbuild's prefixes stripped. */
  file: string;
  /** 1-based, as editors count. */
  line: number;
  column: number;
}

export interface BundleSourceMap {
  /** Position of the generated (line, column), both 1-based. */
  lookup(line: number, column: number): SourcePosition | null;
}

interface Mapping {
  generatedColumn: number;
  sourceIndex: number;
  sourceLine: number;
  sourceColumn: number;
}

/** `sourceRoot` and the VFS namespace are plumbing; a reader knows the
 *  file as `App.tsx`. */
function tidySourceName(name: string): string {
  return name
    .replace(/^dataslope:\/\/preview\//, "")
    .replace(/^ds-vfs:/, "")
    .replace(/^\.\//, "")
    .replace(/^\//, "");
}

/** Parse a source map's JSON into something that can answer lookups.
 *  Returns null for anything malformed: a wrong location is worse than no
 *  location. */
export function parseSourceMap(json: string): BundleSourceMap | null {
  let raw: { mappings?: unknown; sources?: unknown; sourceRoot?: unknown };
  try {
    raw = JSON.parse(json) as typeof raw;
  } catch {
    return null;
  }
  if (typeof raw.mappings !== "string" || !Array.isArray(raw.sources)) {
    return null;
  }
  const sources = raw.sources.map((s) => tidySourceName(String(s)));
  const lines: Mapping[][] = [];
  let sourceIndex = 0;
  let sourceLine = 0;
  let sourceColumn = 0;
  try {
    for (const encoded of raw.mappings.split(";")) {
      const mappings: Mapping[] = [];
      let generatedColumn = 0;
      for (const segment of encoded.split(",")) {
        if (segment.length === 0) continue;
        let at = 0;
        let value: number;
        [value, at] = decodeVlq(segment, at);
        generatedColumn += value;
        if (at < segment.length) {
          [value, at] = decodeVlq(segment, at);
          sourceIndex += value;
          [value, at] = decodeVlq(segment, at);
          sourceLine += value;
          [value, at] = decodeVlq(segment, at);
          sourceColumn += value;
          mappings.push({ generatedColumn, sourceIndex, sourceLine, sourceColumn });
        }
      }
      lines.push(mappings);
    }
  } catch {
    return null;
  }

  return {
    lookup(line, column) {
      const mappings = lines[line - 1];
      if (!mappings || mappings.length === 0) return null;
      // The last mapping at or before the column owns it.
      let best: Mapping | null = null;
      for (const mapping of mappings) {
        if (mapping.generatedColumn > column - 1) break;
        best = mapping;
      }
      const chosen = best ?? mappings[0];
      const file = sources[chosen.sourceIndex];
      if (file === undefined) return null;
      return {
        file,
        line: chosen.sourceLine + 1,
        column: chosen.sourceColumn + 1,
      };
    },
  };
}

const INLINE_MAP_RE =
  /\/\/# sourceMappingURL=data:application\/json;(?:charset=[^;]+;)?base64,([A-Za-z0-9+/=]+)/;

/** Read the inline source map esbuild appends to its output. */
export function inlineSourceMapOf(bundleJs: string): BundleSourceMap | null {
  const match = bundleJs.match(INLINE_MAP_RE);
  if (!match) return null;
  let json: string;
  try {
    json = typeof atob === "function"
      ? decodeURIComponent(escape(atob(match[1])))
      : Buffer.from(match[1], "base64").toString("utf8");
  } catch {
    return null;
  }
  return parseSourceMap(json);
}

/**
 * The bundle's own line numbering, given where it starts in the composed
 * document. The frame reports document lines; the map speaks bundle lines.
 */
export function bundleLineOf(
  documentLine: number,
  bundleStartLine: number,
): number {
  return documentLine - bundleStartLine + 1;
}
