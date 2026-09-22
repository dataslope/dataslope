/**
 * Multi-step JavaScript challenges: pieces of web plumbing.
 *
 * A router, a query-string codec and a rate limiter — the three things every
 * web framework ships and nobody reads the source of. Building them in stages
 * is the point: each one looks trivial until the second step, where encoding,
 * wildcards or a sliding window turn the naive version into something that
 * quietly loses data.
 *
 * All three are pure functions of their arguments, including the rate
 * limiter, which takes timestamps rather than reading a clock — so the tests
 * are deterministic and a learner can reason about them.
 * `__tests__/challengeSolutions` runs every step under `node`.
 */

import { codeSteps } from "./authoring";
import type { Challenge } from "./types";

// ─── URL router ──────────────────────────────────────────────────────

const SEGMENTS = `function segments(path) {
  return path.split("/").filter(Boolean);
}
`;

const MATCH_ROUTE = `${SEGMENTS}
function matchRoute(pattern, path) {
  const wanted = segments(pattern);
  const actual = segments(path);
  if (wanted.length !== actual.length) return false;
  return wanted.every((seg, i) => seg.startsWith(":") || seg === actual[i]);
}
`;

const URL_ROUTER = codeSteps(
  {
    slug: "url-router",
    title: "URL Router",
    difficulty: "Intermediate",
    topic: "Pattern matching",
    language: "javascript",
    description:
      "Build the matcher at the heart of every web framework: split a path, match it against a pattern, then pull out the named parameters.",
    solutionNote: [
      "Comparing segment lists rather than doing string surgery is what makes the trailing slash, the double slash and the empty path stop being special cases — ",
      { code: "filter(Boolean)" },
      " drops the empty strings that splitting produces at the ends, so ",
      { code: '"/users/42"' },
      " and ",
      { code: '"/users/42/"' },
      " become the same two segments.",
    ],
  },
  [
    {
      title: "Split a path",
      short: "Split",
      solutionNote: [
        { code: "filter(Boolean)" },
        " drops the empty strings that splitting produces at the ends, which is what makes a leading slash, a trailing slash and a doubled slash all stop being special cases. Comparing segment lists rather than doing string surgery is the whole trick.",
      ],
      signature: "function segments(path: string): string[]",
      prompt: [
        [
          "Break a path into its non-empty segments: ",
          { code: '"/users/42"' },
          " becomes ",
          { code: '["users", "42"]' },
          ".",
        ],
        [
          "A trailing slash, a leading slash and a doubled slash all produce empty pieces when you split on ",
          { code: '"/"' },
          " — drop them, so the root path ",
          { code: '"/"' },
          " has no segments at all.",
        ],
      ],
      starter: `function segments(path) {
  // Split on slashes, then drop the empty pieces.
  return [];
}
`,
      solution: SEGMENTS,
      tests: [
        {
          id: "basic",
          name: "A two-segment path",
          code: `const got = segments("/users/42");
if (JSON.stringify(got) !== '["users","42"]') throw new Error("got " + JSON.stringify(got));`,
        },
        {
          id: "trailing",
          name: "A trailing slash changes nothing",
          code: `const a = JSON.stringify(segments("/users/42/"));
const b = JSON.stringify(segments("/users/42"));
if (a !== b) throw new Error(a + " vs " + b);`,
        },
        {
          id: "root",
          name: "The root path has no segments",
          code: `if (JSON.stringify(segments("/")) !== "[]") throw new Error("got " + JSON.stringify(segments("/")));
if (JSON.stringify(segments("")) !== "[]") throw new Error("empty path should be []");`,
        },
        {
          id: "doubled",
          name: "A doubled slash produces no empty segment",
          code: `const got = segments("/a//b");
if (JSON.stringify(got) !== '["a","b"]') throw new Error("got " + JSON.stringify(got));`,
        },
        {
          id: "no-leading",
          name: "A path without a leading slash",
          code: `const got = segments("users/42");
if (JSON.stringify(got) !== '["users","42"]') throw new Error("got " + JSON.stringify(got));`,
        },
      ],
    },
    {
      title: "Match a pattern",
      short: "Match",
      solutionNote: [
        "Checking the lengths before the contents is what rejects ",
        { code: '"/users/42/posts"' },
        " against ",
        { code: '"/users/:id"' },
        " — without it, a pattern matches any path that merely starts the same way, which is how a router quietly sends one route's traffic to another.",
      ],
      signature: "function matchRoute(pattern: string, path: string): boolean",
      prompt: [
        [
          "Decide whether a path matches a route pattern. A pattern segment beginning with ",
          { code: ":" },
          " is a wildcard that matches any single segment; anything else must match exactly.",
        ],
        [
          "The segment counts must match too: ",
          { code: '"/users/:id"' },
          " does not match ",
          { code: '"/users/42/posts"' },
          ".",
        ],
      ],
      starter: `${SEGMENTS}
function matchRoute(pattern, path) {
  const wanted = segments(pattern);
  const actual = segments(path);
  // Same length, and every segment either literal-equal or a wildcard.
  return false;
}
`,
      solution: MATCH_ROUTE,
      tests: [
        {
          id: "wildcard",
          name: "A wildcard matches any segment",
          code: `if (matchRoute("/users/:id", "/users/42") !== true) throw new Error("expected a match");
if (matchRoute("/users/:id", "/users/abc") !== true) throw new Error("expected a match");`,
        },
        {
          id: "literal",
          name: "Literal segments must match exactly",
          code: `if (matchRoute("/users/me", "/users/me") !== true) throw new Error("expected a match");
if (matchRoute("/users/me", "/users/42") !== false) throw new Error("expected no match");`,
        },
        {
          id: "length",
          name: "The segment counts must agree",
          code: `if (matchRoute("/users/:id", "/users/42/posts") !== false) throw new Error("too long should not match");
if (matchRoute("/users/:id", "/users") !== false) throw new Error("too short should not match");`,
        },
        {
          id: "root",
          name: "The root pattern",
          code: `if (matchRoute("/", "/") !== true) throw new Error("root should match itself");
if (matchRoute("/", "/users") !== false) throw new Error("root should not match a path");`,
        },
        {
          id: "trailing",
          name: "A trailing slash still matches",
          code: `if (matchRoute("/users/:id", "/users/42/") !== true) throw new Error("expected a match");`,
        },
        {
          id: "segments-survive",
          name: "segments still works",
          code: `if (JSON.stringify(segments("/a/b")) !== '["a","b"]') throw new Error("segments broke");`,
        },
      ],
    },
    {
      title: "Pull out the parameters",
      short: "Params",
      solutionNote: [
        "Returning ",
        { code: "null" },
        ' for no match rather than an empty object is what lets a caller tell "did not match" from "matched, no parameters". Both are falsy-ish in casual use, and conflating them is how a router ends up rendering the wrong page for ',
        { code: '"/about"' },
        ".",
      ],
      signature:
        "function extractParams(pattern: string, path: string): object | null",
      prompt: [
        [
          "When a path matches, return an object mapping each wildcard's name — the part after the ",
          { code: ":" },
          " — to the segment it matched. When it does not match, return ",
          { code: "null" },
          ".",
        ],
        [
          {
            code: 'extractParams("/users/:id/posts/:postId", "/users/42/posts/7")',
          },
          " gives ",
          { code: '{ id: "42", postId: "7" }' },
          ". A pattern with no wildcards matches to an empty object, which is not the same as no match at all.",
        ],
      ],
      starter: `${MATCH_ROUTE}
function extractParams(pattern, path) {
  if (!matchRoute(pattern, path)) return null;
  const wanted = segments(pattern);
  const actual = segments(path);
  const params = {};
  // Each wildcard segment names the value beneath it.
  return params;
}
`,
      solution: `${MATCH_ROUTE}
function extractParams(pattern, path) {
  if (!matchRoute(pattern, path)) return null;
  const wanted = segments(pattern);
  const actual = segments(path);
  const params = {};
  wanted.forEach((seg, i) => {
    if (seg.startsWith(":")) params[seg.slice(1)] = actual[i];
  });
  return params;
}
`,
      tests: [
        {
          id: "one",
          name: "A single parameter",
          code: `const got = extractParams("/users/:id", "/users/42");
if (got === null) throw new Error("expected a match");
if (got.id !== "42") throw new Error("id was " + got.id);`,
        },
        {
          id: "two",
          name: "Two parameters",
          code: `const got = extractParams("/users/:id/posts/:postId", "/users/42/posts/7");
if (got === null) throw new Error("expected a match");
if (got.id !== "42") throw new Error("id was " + got.id);
if (got.postId !== "7") throw new Error("postId was " + got.postId);`,
        },
        {
          id: "no-match",
          name: "No match returns null",
          description:
            "Not an empty object, which means a match with no parameters.",
          code: `if (extractParams("/users/:id", "/posts/42") !== null) throw new Error("expected null");
if (extractParams("/users/:id", "/users") !== null) throw new Error("expected null");`,
        },
        {
          id: "no-params",
          name: "A pattern with no wildcards",
          code: `const got = extractParams("/about", "/about");
if (got === null) throw new Error("expected a match");
if (Object.keys(got).length !== 0) throw new Error("expected no parameters");`,
        },
        {
          id: "literal-between",
          name: "Literal segments between wildcards must still match",
          code: `if (extractParams("/a/:x/c", "/a/1/d") !== null) throw new Error("expected null");`,
        },
        {
          id: "earlier-steps",
          name: "The earlier stages still work",
          code: `if (JSON.stringify(segments("/a/b")) !== '["a","b"]') throw new Error("segments broke");
if (matchRoute("/a/:b", "/a/1") !== true) throw new Error("matchRoute broke");`,
        },
      ],
    },
  ],
);

// ─── Query string ────────────────────────────────────────────────────

const PARSE_RAW = `function parseQuery(query) {
  const body = query.startsWith("?") ? query.slice(1) : query;
  return body
    .split("&")
    .filter(Boolean)
    .map((part) => {
      const at = part.indexOf("=");
      return at === -1 ? [part, ""] : [part.slice(0, at), part.slice(at + 1)];
    });
}
`;

const PARSE_DECODED = `function decodeComponent(text) {
  return decodeURIComponent(text.replace(/\\+/g, "%20"));
}

function parseQuery(query) {
  const body = query.startsWith("?") ? query.slice(1) : query;
  return body
    .split("&")
    .filter(Boolean)
    .map((part) => {
      const at = part.indexOf("=");
      const [rawKey, rawValue] =
        at === -1 ? [part, ""] : [part.slice(0, at), part.slice(at + 1)];
      return [decodeComponent(rawKey), decodeComponent(rawValue)];
    });
}
`;

const QUERY_STRING = codeSteps(
  {
    slug: "query-string",
    title: "Query String Codec",
    difficulty: "Intermediate",
    topic: "Encoding",
    language: "javascript",
    description:
      "Parse a URL query string into pairs, decode it properly, then build one back up so the round trip survives.",
    solutionNote: [
      "Splitting on the ",
      { code: "first" },
      " ",
      { code: "=" },
      " rather than all of them is what keeps an encoded value intact — and the reason it matters is that percent-decoding has to happen ",
      { code: "after" },
      " the split, never before. Decode first and an encoded ",
      { code: "%3D" },
      " turns into a separator that was never there, which is how a parser silently invents fields.",
    ],
  },
  [
    {
      title: "Split into pairs",
      short: "Split",
      solutionNote: [
        "Splitting on the ",
        { code: "first" },
        " ",
        { code: "=" },
        " rather than all of them is what keeps a value containing an equals sign intact. ",
        { code: "indexOf" },
        " plus two slices does that; ",
        { code: 'split("=")' },
        " does not, and the bug only shows up on the inputs nobody tests.",
      ],
      signature: "function parseQuery(query: string): [string, string][]",
      prompt: [
        [
          "Turn a query string into ",
          { code: "[key, value]" },
          " pairs, in order. Strip a leading ",
          { code: "?" },
          " if there is one, split on ",
          { code: "&" },
          ", then split each part on ",
          { code: "=" },
          ".",
        ],
        [
          "Split on the ",
          { code: "first" },
          " ",
          { code: "=" },
          " only, so ",
          { code: '"a=b=c"' },
          " gives a value of ",
          { code: '"b=c"' },
          ". A part with no ",
          { code: "=" },
          " has an empty value, and empty parts are skipped. No decoding yet.",
        ],
      ],
      starter: `function parseQuery(query) {
  const body = query.startsWith("?") ? query.slice(1) : query;
  // Split on &, then each part on its first =.
  return [];
}
`,
      solution: PARSE_RAW,
      tests: [
        {
          id: "basic",
          name: "Two pairs",
          code: `const got = parseQuery("?a=1&b=2");
if (JSON.stringify(got) !== '[["a","1"],["b","2"]]') {
  throw new Error("got " + JSON.stringify(got));
}`,
        },
        {
          id: "no-question-mark",
          name: "A leading question mark is optional",
          code: `const a = JSON.stringify(parseQuery("a=1"));
const b = JSON.stringify(parseQuery("?a=1"));
if (a !== b) throw new Error(a + " vs " + b);`,
        },
        {
          id: "first-equals",
          name: "Only the first equals sign splits",
          code: `const got = parseQuery("a=b=c");
if (JSON.stringify(got) !== '[["a","b=c"]]') throw new Error("got " + JSON.stringify(got));`,
        },
        {
          id: "bare-key",
          name: "A key with no value",
          code: `const got = parseQuery("flag");
if (JSON.stringify(got) !== '[["flag",""]]') throw new Error("got " + JSON.stringify(got));`,
        },
        {
          id: "empty",
          name: "Empty input, and stray separators",
          code: `if (JSON.stringify(parseQuery("")) !== "[]") throw new Error("empty should be []");
if (JSON.stringify(parseQuery("?")) !== "[]") throw new Error("'?' should be []");
if (JSON.stringify(parseQuery("a=1&&b=2")) !== '[["a","1"],["b","2"]]') {
  throw new Error("stray separator: " + JSON.stringify(parseQuery("a=1&&b=2")));
}`,
        },
      ],
    },
    {
      title: "Decode the pieces",
      short: "Decode",
      solutionNote: [
        "Decoding has to happen ",
        { code: "after" },
        " the split, never before. Decode first and an encoded ",
        { code: "%3D" },
        " becomes a separator that was never there — the parser invents a field, and the value it was part of goes missing.",
      ],
      signature: "function parseQuery(query: string): [string, string][]",
      prompt: [
        [
          "Now decode each key and value: ",
          { code: "%20" },
          " and ",
          { code: "+" },
          " both mean a space, and other percent escapes mean what they say.",
        ],
        [
          "Decode ",
          { code: "after" },
          " splitting, never before — an encoded ",
          { code: "%3D" },
          " is a literal equals sign inside a value, and decoding it first would split the pair in the wrong place.",
        ],
      ],
      starter: `${PARSE_RAW}`,
      solution: PARSE_DECODED,
      tests: [
        {
          id: "percent",
          name: "Percent escapes become characters",
          code: `const got = parseQuery("q=a%20b");
if (JSON.stringify(got) !== '[["q","a b"]]') throw new Error("got " + JSON.stringify(got));`,
        },
        {
          id: "plus",
          name: "A plus is a space",
          code: `const got = parseQuery("name=John+Doe");
if (JSON.stringify(got) !== '[["name","John Doe"]]') throw new Error("got " + JSON.stringify(got));`,
        },
        {
          id: "encoded-equals",
          name: "An encoded equals sign stays inside the value",
          description: "Decoding before splitting would break the pair in two.",
          code: `const got = parseQuery("eq=a%3Db");
if (JSON.stringify(got) !== '[["eq","a=b"]]') throw new Error("got " + JSON.stringify(got));`,
        },
        {
          id: "encoded-key",
          name: "Keys are decoded too",
          code: `const got = parseQuery("my%20key=1");
if (JSON.stringify(got) !== '[["my key","1"]]') throw new Error("got " + JSON.stringify(got));`,
        },
        {
          id: "still-splits",
          name: "The splitting from step 1 still works",
          code: `if (JSON.stringify(parseQuery("")) !== "[]") throw new Error("empty broke");
if (JSON.stringify(parseQuery("flag")) !== '[["flag",""]]') throw new Error("bare key broke");`,
        },
      ],
    },
    {
      title: "Build one back",
      short: "Stringify",
      solutionNote: [
        "Encoding both sides is what makes the round trip safe: a value containing an ",
        { code: "&" },
        " must not become a separator when it is read back. The test that matters here is the round trip itself, because an encoder and a decoder can each look correct and still disagree.",
      ],
      signature: "function stringifyQuery(pairs: [string, string][]): string",
      prompt: [
        [
          "Add ",
          { code: "stringifyQuery" },
          ", turning pairs back into a query string: each key and value percent-encoded, joined with ",
          { code: "=" },
          " and ",
          { code: "&" },
          ". No leading ",
          { code: "?" },
          ".",
        ],
        [
          "Encoding both sides is what makes the round trip safe — a value containing an ",
          { code: "&" },
          " must not become a separator when it is read back.",
        ],
      ],
      starter: `${PARSE_DECODED}
function stringifyQuery(pairs) {
  // Encode both sides, join with = and &.
  return "";
}
`,
      solution: `${PARSE_DECODED}
function stringifyQuery(pairs) {
  return pairs
    .map(([key, value]) => encodeURIComponent(key) + "=" + encodeURIComponent(value))
    .join("&");
}
`,
      tests: [
        {
          id: "basic",
          name: "Two pairs",
          code: `const got = stringifyQuery([["a", "1"], ["b", "2"]]);
if (got !== "a=1&b=2") throw new Error("got " + JSON.stringify(got));`,
        },
        {
          id: "spaces",
          name: "Spaces are encoded",
          code: `const got = stringifyQuery([["name", "John Doe"]]);
if (got !== "name=John%20Doe") throw new Error("got " + JSON.stringify(got));`,
        },
        {
          id: "round-trip",
          name: "A value survives the round trip",
          code: `const pairs = [["name", "John Doe"], ["eq", "a=b"], ["amp", "x&y"]];
const got = parseQuery(stringifyQuery(pairs));
if (JSON.stringify(got) !== JSON.stringify(pairs)) {
  throw new Error("round trip gave " + JSON.stringify(got));
}`,
        },
        {
          id: "empty",
          name: "No pairs",
          code: `if (stringifyQuery([]) !== "") throw new Error("got " + JSON.stringify(stringifyQuery([])));`,
        },
        {
          id: "empty-value",
          name: "An empty value keeps its equals sign",
          code: `const got = stringifyQuery([["flag", ""]]);
if (got !== "flag=") throw new Error("got " + JSON.stringify(got));`,
        },
        {
          id: "parse-survives",
          name: "Parsing still works",
          code: `const got = parseQuery("q=a%20b");
if (JSON.stringify(got) !== '[["q","a b"]]') throw new Error("parseQuery broke");`,
        },
      ],
    },
  ],
);

// ─── Rate limiter ────────────────────────────────────────────────────

const WITHIN_WINDOW = `function withinWindow(timestamps, now, windowSeconds) {
  return timestamps.filter((t) => now - windowSeconds < t && t <= now).length;
}
`;

const ALLOW_ALL = `${WITHIN_WINDOW}
function allowAll(timestamps, limit, windowSeconds) {
  const accepted = [];
  const out = [];
  for (const now of timestamps) {
    const ok = withinWindow(accepted, now, windowSeconds) < limit;
    out.push(ok);
    if (ok) accepted.push(now);
  }
  return out;
}
`;

const RATE_LIMITER = codeSteps(
  {
    slug: "rate-limiter",
    title: "Rate Limiter",
    difficulty: "Advanced",
    topic: "Sliding windows",
    language: "javascript",
    description:
      "Build a sliding-window rate limiter: count recent requests, decide which to accept, then keep a separate budget per caller.",
    solutionNote: [
      "The subtle rule is that a rejected request must not count against the window. Recording every arrival makes a caller who keeps hammering a blocked endpoint stay blocked forever, because their own rejections hold the window full — which is the difference between a limiter and a lockout.",
    ],
  },
  [
    {
      title: "Count what is recent",
      short: "Window",
      solutionNote: [
        "A strict ",
        { code: ">" },
        " on the lower bound and an inclusive ",
        { code: "<=" },
        " on ",
        { code: "now" },
        " is what makes the window slide cleanly: a request exactly ",
        { code: "windowSeconds" },
        " old has just fallen out, and one arriving this instant is inside. Getting the two ends inconsistent is what makes a limiter drift.",
      ],
      signature:
        "function withinWindow(timestamps: number[], now: number, windowSeconds: number): number",
      prompt: [
        [
          "Count how many of the given timestamps fall inside the window ending at ",
          { code: "now" },
          ": strictly after ",
          { code: "now - windowSeconds" },
          ", and up to and including ",
          { code: "now" },
          ".",
        ],
        [
          "Timestamps are seconds. A request exactly ",
          { code: "windowSeconds" },
          " old has just fallen out of the window.",
        ],
      ],
      starter: `function withinWindow(timestamps, now, windowSeconds) {
  // Strictly after now - windowSeconds, and no later than now.
  return 0;
}
`,
      solution: WITHIN_WINDOW,
      tests: [
        {
          id: "basic",
          name: "Only recent timestamps count",
          code: `const got = withinWindow([1, 2, 3], 3, 2);
if (got !== 2) throw new Error("got " + got);`,
        },
        {
          id: "boundary",
          name: "A timestamp exactly a window old has fallen out",
          code: `if (withinWindow([0], 10, 10) !== 0) throw new Error("0 at now=10 window=10 should be out");
if (withinWindow([1], 10, 10) !== 1) throw new Error("1 at now=10 window=10 should be in");`,
        },
        {
          id: "inclusive-now",
          name: "A timestamp of exactly now counts",
          code: `if (withinWindow([5], 5, 10) !== 1) throw new Error("now itself should count");`,
        },
        {
          id: "future",
          name: "Timestamps after now do not count",
          code: `if (withinWindow([20], 10, 10) !== 0) throw new Error("a future timestamp counted");`,
        },
        {
          id: "empty",
          name: "No timestamps",
          code: `if (withinWindow([], 10, 10) !== 0) throw new Error("expected 0");`,
        },
      ],
    },
    {
      title: "Decide what to accept",
      short: "Accept",
      solutionNote: [
        "A rejected request must not count against the window. Recording every arrival makes a caller who keeps retrying stay blocked forever, because their own rejections hold the window full — which is a lockout, not a limiter.",
      ],
      signature:
        "function allowAll(timestamps: number[], limit: number, windowSeconds: number): boolean[]",
      prompt: [
        [
          "Given request timestamps in ascending order, return a boolean for each: accepted, or rejected because the window was already full.",
        ],
        [
          "A request is accepted when fewer than ",
          { code: "limit" },
          " ",
          { code: "accepted" },
          " requests fall in its window. Rejected requests do not count — otherwise a caller who keeps retrying can never get back in.",
        ],
      ],
      starter: `${WITHIN_WINDOW}
function allowAll(timestamps, limit, windowSeconds) {
  const accepted = [];
  const out = [];
  for (const now of timestamps) {
    // Only accepted requests fill the window.
  }
  return out;
}
`,
      solution: ALLOW_ALL,
      tests: [
        {
          id: "burst",
          name: "A burst past the limit is cut off",
          code: `const got = allowAll([1, 2, 3, 4], 2, 10);
if (JSON.stringify(got) !== "[true,true,false,false]") {
  throw new Error("got " + JSON.stringify(got));
}`,
        },
        {
          id: "recovers",
          name: "The budget comes back as the window slides",
          code: `const got = allowAll([1, 2, 13, 14], 2, 10);
if (JSON.stringify(got) !== "[true,true,true,true]") {
  throw new Error("got " + JSON.stringify(got));
}`,
        },
        {
          id: "rejections-do-not-count",
          name: "Rejected requests do not hold the window full",
          description: "Otherwise a retrying caller is locked out forever.",
          code: `const got = allowAll([1, 1, 1, 12], 1, 10);
if (JSON.stringify(got) !== "[true,false,false,true]") {
  throw new Error("got " + JSON.stringify(got));
}`,
        },
        {
          id: "limit-zero",
          name: "A limit of zero rejects everything",
          code: `const got = allowAll([1, 2], 0, 10);
if (JSON.stringify(got) !== "[false,false]") throw new Error("got " + JSON.stringify(got));`,
        },
        {
          id: "empty",
          name: "No requests",
          code: `if (JSON.stringify(allowAll([], 5, 10)) !== "[]") throw new Error("expected []");`,
        },
      ],
    },
    {
      title: "A budget per caller",
      short: "Per key",
      solutionNote: [
        "Each key getting its own window is what stops one noisy caller consuming everybody else's budget. Note that the limiter takes timestamps rather than reading a clock: that is what makes it testable, and what lets the same function replay a log to explain a decision after the fact.",
      ],
      signature:
        "function allowPerKey(events: [string, number][], limit: number, windowSeconds: number): boolean[]",
      prompt: [
        [
          "Real limiters are per API key. Events now arrive as ",
          { code: "[key, timestamp]" },
          " pairs, still in ascending time order — return a boolean for each.",
        ],
        [
          "Each key gets its own window and its own budget, so one noisy caller cannot use up everyone else's. Keep the rule from step 2: only accepted requests count.",
        ],
      ],
      starter: `${ALLOW_ALL}
function allowPerKey(events, limit, windowSeconds) {
  const accepted = new Map();
  const out = [];
  for (const [key, now] of events) {
    // Each key has its own window.
  }
  return out;
}
`,
      solution: `${ALLOW_ALL}
function allowPerKey(events, limit, windowSeconds) {
  const accepted = new Map();
  const out = [];
  for (const [key, now] of events) {
    const mine = accepted.get(key) ?? [];
    const ok = withinWindow(mine, now, windowSeconds) < limit;
    out.push(ok);
    if (ok) {
      mine.push(now);
      accepted.set(key, mine);
    }
  }
  return out;
}
`,
      tests: [
        {
          id: "separate",
          name: "Each key has its own budget",
          code: `const got = allowPerKey([["a", 1], ["b", 1], ["a", 2], ["b", 2]], 1, 10);
if (JSON.stringify(got) !== "[true,true,false,false]") {
  throw new Error("got " + JSON.stringify(got));
}`,
        },
        {
          id: "noisy-neighbour",
          name: "One noisy caller does not block another",
          code: `const events = [["loud", 1], ["loud", 1], ["loud", 1], ["quiet", 1]];
const got = allowPerKey(events, 1, 10);
if (JSON.stringify(got) !== "[true,false,false,true]") {
  throw new Error("got " + JSON.stringify(got));
}`,
        },
        {
          id: "recovers",
          name: "A key's budget comes back",
          code: `const got = allowPerKey([["a", 1], ["a", 2], ["a", 13]], 2, 10);
if (JSON.stringify(got) !== "[true,true,true]") throw new Error("got " + JSON.stringify(got));`,
        },
        {
          id: "single-key",
          name: "One key behaves like step 2",
          code: `const events = [1, 2, 3, 4].map((t) => ["only", t]);
const perKey = JSON.stringify(allowPerKey(events, 2, 10));
const plain = JSON.stringify(allowAll([1, 2, 3, 4], 2, 10));
if (perKey !== plain) throw new Error(perKey + " vs " + plain);`,
        },
        {
          id: "empty",
          name: "No events",
          code: `if (JSON.stringify(allowPerKey([], 5, 10)) !== "[]") throw new Error("expected []");`,
        },
        {
          id: "earlier-steps",
          name: "The earlier stages still work",
          code: `if (withinWindow([1, 2, 3], 3, 2) !== 2) throw new Error("withinWindow broke");
if (JSON.stringify(allowAll([1, 2, 3], 2, 10)) !== "[true,true,false]") {
  throw new Error("allowAll broke");
}`,
        },
      ],
    },
  ],
);

export const CODE_MULTI_JS_WEB: Challenge[] = [
  URL_ROUTER,
  QUERY_STRING,
  RATE_LIMITER,
];
