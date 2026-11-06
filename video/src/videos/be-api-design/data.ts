import results from "./results.json" with { type: "json" };

// Every plan, row, token and size the video shows, read from results.json:
// what the site's Postgres (PGlite, PostgreSQL 18) returned for the
// pagination and idempotency statements in check.mjs, and what Node's crypto
// and zlib computed for the token, the session ID, the cursor and the gzip.
// Pure (no Remotion, no DOM).

export const VIDEO = "be-api-design";

/**
 * Whether public/images/be-api-design/ holds the watercolors from
 * illustrations.json. Phase 2 sets it once they are generated; every frame
 * is laid out with room for them either way.
 */
export const ILLUSTRATIONS = true;

type Value = string | null;
type Step = { sql: string; ok: boolean; columns?: string[]; rows?: Value[][]; error?: string };
type Figure = { setup: string; steps: Record<string, Step>; version: string };
const FIGURES = results.figures as unknown as Record<string, Figure>;

const step = (figure: string, id: string): Step => {
  const s = FIGURES[figure]?.steps[id];
  if (!s) throw new Error(`results.json has no step ${id} in ${figure}`);
  return s;
};

const ran = (figure: string, id: string): Step => {
  const s = step(figure, id);
  if (!s.ok) throw new Error(`${figure}.${id} failed: ${s.error}`);
  return s;
};

const rows = (figure: string, id: string) => (ran(figure, id).rows ?? []).map((r) => r.map((v) => (v === null ? "null" : v)));
const scalar = (figure: string, id: string, col = 0) => Number(rows(figure, id)[0][col]);
const lines = (figure: string, id: string) => step(figure, id).sql.split("\n");

/** A plan as Postgres printed it (COSTS OFF, so nothing to trim). */
const plan = (figure: string, id: string) => rows(figure, id).map((r) => r[0]);

/** The "actual rows" of the plan line that holds `on`. */
const actualRows = (planLines: readonly string[], on: string) => {
  const m = planLines.find((l) => l.includes(on))?.match(/actual rows=([\d.]+)/);
  if (!m) throw new Error(`no actual rows on the plan line holding ${JSON.stringify(on)}`);
  return Number(m[1]);
};

/** "100,000". */
export const thousands = (n: number) => n.toLocaleString("en-US");

export const VERSION = FIGURES.page.version;
export const PAGE_SIZE = results.pageSize;

// ── 5. Idempotency ──────────────────────────────────────────────────────────

const charges = (id: string) => ({ charges: scalar("idem", id, 0), cents: scalar("idem", id, 1) });
export const IDEM = {
  /** The page's example body: 5000 cents, in usd. */
  plain: lines("idem", "try1"),
  keyed: lines("idem", "key1"),
  key: lines("idem", "key1")[1].match(/'([^']+)'/)![1],
  /** The payment ids each attempt got back: three without a key; with one,
   *  the first attempt's only. */
  plainIds: ["try1", "try2", "try3"].map((id) => scalar("idem", id)),
  keyedIds: ["key1", "key2", "key3"].map((id) => rows("idem", id).map((r) => Number(r[0]))),
  unkeyed: charges("unkeyed"),
  stored: rows("idem", "stored")[0],
  keyedTotal: charges("keyed"),
  /** The unique constraint refusing a copy outright. */
  duplicate: step("idem", "duplicate").error!,
};
if (IDEM.unkeyed.charges !== 3 || IDEM.keyedTotal.charges !== 1) throw new Error("the narration says three charges, then one");

// ── 6. Pagination ───────────────────────────────────────────────────────────

const DEPTHS = [1, 500, 5000] as const;
const offsetPlan = (page: number) => plan("page", `offset${page}`);
export const PAGE = {
  articles: scalar("page", "count"),
  /** Rows the index scan handed to LIMIT, at each depth, by OFFSET. */
  offset: DEPTHS.map((page) => ({ page, query: lines("page", `offset${page}`).slice(1), plan: offsetPlan(page), read: actualRows(offsetPlan(page), "Index Scan") })),
  /** The same depths by cursor. Page 1 needs no cursor, so it reads what
   *  OFFSET 0 reads. */
  cursor: [
    { page: 1, read: actualRows(offsetPlan(1), "Index Scan") },
    ...([500, 5000] as const).map((page) => ({ page, query: lines("page", `cursor${page}`).slice(1), plan: plan("page", `cursor${page}`), read: actualRows(plan("page", `cursor${page}`), "Index Scan") })),
  ],
  /** Page 500 by offset and by cursor: rows in one and not the other. */
  differ: scalar("page", "sameRows"),
  /** Drift: page one, an article published, then page two both ways. */
  page1: rows("page", "page1").map((r) => Number(r[0])),
  published: Number(lines("page", "publish")[0].match(/VALUES \((\d+)/)![1]),
  page2Offset: rows("page", "page2Offset").map((r) => Number(r[0])),
  page2Cursor: rows("page", "page2Cursor").map((r) => Number(r[0])),
  /** The cursor an API would hand out after page one, and what it decodes to. */
  cursorToken: results.cursor.cursor,
  cursorDecoded: results.cursor.decoded,
};
if (PAGE.page2Offset[0] !== PAGE.page1.at(-1)) throw new Error("the narration says page two repeats page one's last article");
if (PAGE.page2Cursor[0] !== PAGE.page1.at(-1)! - 1) throw new Error("the cursor's page two must start right after page one");
if (PAGE.differ !== 0) throw new Error("page 500 must be the same rows both ways");

// ── 7, 8. Sessions, JWTs, OAuth ─────────────────────────────────────────────

export const AUTH = {
  token: results.jwt.token,
  parts: results.jwt.parts,
  chars: results.jwt.chars,
  header: results.jwt.header,
  claims: results.jwt.claims,
  decoded: results.jwt.decoded,
  verifies: results.jwt.verifies,
  forgedPayload: results.jwt.forgedPayload,
  forgedVerifies: results.jwt.forgedVerifies,
  /** The hybrid's assumed access-token lifetime, in minutes. */
  lifetimeMinutes: results.jwt.lifetimeMinutes,
  sessionId: results.jwt.sessionId,
  sessionChars: results.jwt.sessionChars,
};
if (!AUTH.verifies || AUTH.forgedVerifies) throw new Error("the token must verify, and the forged one must not");

// ── 9. The rate-limit contract ──────────────────────────────────────────────

/** An example 429 response: the page's header names with the video's own
 *  example values. Shown as an example, never as a measured response. */
export const LIMIT_EXAMPLE = {
  status: "429 Too Many Requests",
  headers: [
    ["X-RateLimit-Limit", "100"],
    ["X-RateLimit-Remaining", "0"],
    ["X-RateLimit-Reset", "1793966430"],
    ["Retry-After", "30"],
  ] as const,
};

// ── 16. Content negotiation ─────────────────────────────────────────────────

export const GZIP = {
  bytes: results.gzip.bytes,
  gzipped: results.gzip.gzipped,
  /** "about a sixth", as the narration says. */
  fraction: results.gzip.gzipped / results.gzip.bytes,
};
if (Math.round(1 / GZIP.fraction) !== 6) throw new Error("the narration says about a sixth");

// ── What the narration says aloud ───────────────────────────────────────────
// Every number spoken in script.ts, against the run it comes from, so a
// rerun of check.mjs that moves one fails here before a scene shows it.
{
  const read = (method: "offset" | "cursor", page: number) => PAGE[method].find((p) => p.page === page)?.read;
  const said: [string, boolean][] = [
    ["fifty dollars; three charges, a hundred and fifty dollars", IDEM.unkeyed.cents === 15_000 && Number(IDEM.stored[1]) === 5000],
    ["three requests, one charge", IDEM.keyedTotal.charges === 1 && IDEM.keyedTotal.cents === 5000],
    ["a hundred thousand articles", PAGE.articles === 100_000],
    ["page one reads twenty, page five hundred ten thousand, page five thousand all hundred thousand", read("offset", 1) === 20 && read("offset", 500) === 10_000 && read("offset", 5000) === 100_000],
    ["twenty rows read at any depth", PAGE.cursor.every((p) => p.read === PAGE_SIZE)],
    ["forty-three random characters", AUTH.sessionChars === 43],
    ["a hundred sixty-four characters", AUTH.chars === 164],
    ["say fifteen minutes", AUTH.lifetimeMinutes === 15],
  ];
  const wrong = said.filter(([, ok]) => !ok).map(([what]) => what);
  if (wrong.length) throw new Error(`the narration no longer matches the run: ${wrong.join("; ")}`);
}
