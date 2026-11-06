// Measures every number, plan and token the be-api-design video shows, and
// writes them to results.json, which data.ts reads. From the repo root:
//
//   node video/src/videos/be-api-design/check.mjs
//
// No API server, gateway, rate limiter or identity provider runs here, so
// nothing below is presented as one's output. Three engines, each the one its
// numbers come from:
//   - the site's Postgres (PGlite 0.5.8, PostgreSQL 18, through
//     scripts/lib/sql-engines.mjs), for what an API's database does under two
//     of its contracts: pagination (an articles table of 100,000 rows, read
//     by OFFSET and by a cursor, and a page that shifts when an article is
//     added between two requests) and the idempotency key (a payments table
//     with a unique key, sent the same charge three times). Every run returns
//     the same plans and rows: the tables are generate_series with fixed
//     expressions.
//   - Node's own crypto, base64 and zlib, for a JSON Web Token signed with
//     HMAC-SHA256 (the video's own claims and key), decoded without the key
//     and verified after one claim is changed; an opaque session ID of the
//     same strength for comparison; a cursor as an API would encode it; and
//     the gzip size of one page of the video's own JSON.
//   - a seeded simulation (charts/_theme.mjs's rng, as the site's charts use
//     it) of clients answered 429 with Retry-After, retrying at exactly that
//     moment or spread at random after it. Its capacity and counts are the
//     video's stated assumptions, and the narration calls it a model.
/* global console, process, URL */
import { createHash, createHmac } from "node:crypto";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const lib = (p) => new URL(`../../../../${p}`, import.meta.url).href;
const { createEngine } = await import(lib("scripts/lib/sql-engines.mjs"));
const { rng } = await import(lib("charts/_theme.mjs"));

const shown = (v) => (v === null || v === undefined ? null : String(v));

/** Runs `sql` one statement at a time and keeps the last result that has
 *  columns. */
async function runAll(engine, sql) {
  let shownResult = null;
  for (const stmt of sql.split(/;\s*\n/).map((s) => s.trim()).filter(Boolean)) {
    for (const r of await engine.exec(stmt)) if (r.columns?.length) shownResult = r;
  }
  return shownResult;
}

/** A figure on the site's Postgres: its setup, then each step in order, in
 *  one database. */
async function pgFigure(setup, steps) {
  const engine = await createEngine("postgres");
  await runAll(engine, setup);
  const out = {};
  for (const [id, sql] of Object.entries(steps)) {
    try {
      const r = await runAll(engine, sql);
      out[id] = r ? { sql, ok: true, columns: r.columns, rows: r.values.map((row) => row.map(shown)) } : { sql, ok: true, columns: [], rows: [] };
    } catch (e) {
      out[id] = { sql, ok: false, error: `ERROR: ${String(e.message).split("\n")[0]}` };
    }
  }
  const v = await runAll(engine, "SELECT version() AS v");
  await engine.destroy();
  return { setup, steps: out, version: String(v.values[0][0]).split(" (")[0] };
}

const EXPLAIN = "EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, BUFFERS OFF, SUMMARY OFF)";
const PAGE_SIZE = 20;
const ARTICLES = 100000;

/** Newest first, a page at a time. */
const byOffset = (page) => `SELECT id, title FROM articles\nORDER BY id DESC\nLIMIT ${PAGE_SIZE} OFFSET ${(page - 1) * PAGE_SIZE};`;
/** The same page, from the cursor the page before it handed out: its last id. */
const byCursor = (after) => `SELECT id, title FROM articles\nWHERE id < ${after}\nORDER BY id DESC\nLIMIT ${PAGE_SIZE};`;
/** The last id on page `page` of the newest-first listing. */
const lastIdOf = (page) => ARTICLES - page * PAGE_SIZE + 1;

const results = { figures: {}, pageSize: PAGE_SIZE };

// ── Pagination: OFFSET walks and discards; a cursor seeks ───────────────────
const DEEP = [1, 500, 5000];
results.figures.page = await pgFigure(
  `SET default_statistics_target = 10000;
CREATE TABLE articles AS
SELECT g AS id, 'Article ' || g AS title,
  TIMESTAMP '2020-01-01' + g * INTERVAL '25 minutes' AS created_at
FROM generate_series(1, ${ARTICLES}) g;
ALTER TABLE articles ADD PRIMARY KEY (id);
VACUUM ANALYZE articles`,
  {
    count: "SELECT COUNT(*) AS articles FROM articles;",
    ...Object.fromEntries(DEEP.map((p) => [`offset${p}`, `${EXPLAIN}\n${byOffset(p)}`])),
    // Page 500 again, from the cursor page 499 handed out.
    cursor500: `${EXPLAIN}\n${byCursor(lastIdOf(499))}`,
    cursor5000: `${EXPLAIN}\n${byCursor(lastIdOf(4999))}`,
    // The two ways of reading page 500 return the same twenty rows.
    sameRows: `SELECT COUNT(*) AS differ FROM (\n  (${byOffset(500).replace(/;$/, "")})\n  EXCEPT\n  (${byCursor(lastIdOf(499)).replace(/;$/, "")})\n) d;`,
    // Drift: a reader takes page 1, an article is published, the reader asks
    // for page 2.
    page1: byOffset(1),
    publish: `INSERT INTO articles VALUES (${ARTICLES + 1}, 'Article ${ARTICLES + 1}', TIMESTAMP '2024-10-03');`,
    page2Offset: byOffset(2),
    page2Cursor: byCursor(lastIdOf(1)),
  },
);

// ── Idempotency: the same charge sent three times ──────────────────────────
const KEY = "9c1f2a7e-4b6d-4e8a-9f3c-2d7b1e5a60b3";
const CHARGE = "INSERT INTO payments (amount, currency)\nVALUES (5000, 'usd')\nRETURNING id;";
const KEYED = `INSERT INTO payments (idempotency_key, amount, currency)\nVALUES ('${KEY}', 5000, 'usd')\nON CONFLICT (idempotency_key) DO NOTHING\nRETURNING id;`;
results.figures.idem = await pgFigure(
  "CREATE TABLE payments (\n  id serial PRIMARY KEY,\n  idempotency_key text UNIQUE,\n  amount int NOT NULL,\n  currency text NOT NULL)",
  {
    // Without a key: the first attempt timed out after the server charged,
    // and the client retried twice.
    try1: CHARGE,
    try2: CHARGE,
    try3: CHARGE,
    unkeyed: "SELECT COUNT(*) AS charges, SUM(amount) AS cents FROM payments;",
    reset: "TRUNCATE payments RESTART IDENTITY;",
    // With a key: the first insert wins, a retry inserts nothing, and the
    // server answers it with the payment it stored the first time.
    key1: KEYED,
    key2: KEYED,
    key3: KEYED,
    stored: `SELECT id, amount, currency FROM payments\nWHERE idempotency_key = '${KEY}';`,
    keyed: "SELECT COUNT(*) AS charges, SUM(amount) AS cents FROM payments;",
    // Without ON CONFLICT, the unique constraint itself refuses the copy,
    // which is what stops two retries that race each other.
    duplicate: `INSERT INTO payments (idempotency_key, amount, currency)\nVALUES ('${KEY}', 5000, 'usd');`,
  },
);

// ── A JSON Web Token, and a session ID ──────────────────────────────────────
const b64url = (buf) => Buffer.from(buf).toString("base64url");
const json = (o) => JSON.stringify(o);
{
  const SECRET = "the-video's-own-signing-key";
  // Issued at noon UTC on 2026-11-06; the 15-minute lifetime is the video's
  // assumption for a short-lived access token.
  const iat = Date.UTC(2026, 10, 6, 12, 0, 0) / 1000;
  const LIFETIME = 15 * 60;
  const header = { alg: "HS256", typ: "JWT" };
  const claims = { sub: "42", role: "editor", iat, exp: iat + LIFETIME };
  const sign = (h, p) => createHmac("sha256", SECRET).update(`${h}.${p}`).digest("base64url");
  const h = b64url(json(header));
  const p = b64url(json(claims));
  const s = sign(h, p);
  const token = `${h}.${p}.${s}`;
  const verify = (t) => {
    const [th, tp, ts] = t.split(".");
    return sign(th, tp) === ts;
  };
  // Anyone can read the claims: base64url is an encoding, not encryption.
  const decoded = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
  // Change one claim and keep the signature.
  const forged = `${h}.${b64url(json({ ...claims, role: "admin" }))}.${s}`;
  // A session ID: 32 bytes, fixed here (a server draws them at random).
  const sessionId = createHash("sha256").update("be-api-design session").digest("base64url");
  results.jwt = {
    header,
    claims,
    lifetimeMinutes: LIFETIME / 60,
    parts: { header: h, payload: p, signature: s },
    token,
    chars: token.length,
    decoded,
    verifies: verify(token),
    forgedVerifies: verify(forged),
    forgedPayload: forged.split(".")[1],
    sessionId,
    sessionChars: sessionId.length,
  };
}

// ── A cursor as an API hands it out, and one page's JSON, gzipped ───────────
{
  const steps = results.figures.page.steps;
  const page1 = steps.page1.rows.map(([id, title]) => ({ id: Number(id), title }));
  const last = page1.at(-1).id;
  const cursor = b64url(json({ id: last }));
  results.cursor = { last, cursor, decoded: JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) };

  // The page as a response body: the twenty newest articles with the fields
  // a list view would show (the video's own), and the cursor.
  const AUTHORS = ["Ada", "Grace", "Linus", "Barbara", "Edsger", "Margaret", "Dennis"];
  const TAGS = ["databases", "apis", "testing", "performance", "security"];
  const body = json({
    data: page1.map(({ id, title }) => ({
      id,
      title,
      status: "published",
      author: { id: 1 + (id % 7), name: AUTHORS[id % 7] },
      tags: [TAGS[id % 5], TAGS[(id + 2) % 5]],
      comment_count: (id * 7) % 23,
      created_at: new Date(Date.UTC(2020, 0, 1) + id * 25 * 60 * 1000).toISOString(),
    })),
    next_cursor: cursor,
  });
  results.gzip = { bytes: Buffer.byteLength(body), gzipped: gzipSync(body).length };
}

// ── A model: clients answered 429 with Retry-After ──────────────────────────
{
  const CLIENTS = 1000;
  const CAPACITY = 200; // requests the service accepts in each one-second window
  const RETRY_AFTER = 2; // seconds, the same in every 429
  const SPREAD = 5; // seconds of random extra wait, for the spread policy
  const SEED = 429;

  /** Every client was refused at t = 0. Requests are taken in time order:
   *  each is served while its one-second window has capacity left, and
   *  otherwise refused, retrying after Retry-After plus its policy's extra
   *  wait. Ties (the exact policy's thousand at one instant) go in client
   *  order. */
  const simulate = (extra) => {
    // [time, client], kept sorted; a retry is inserted where it belongs.
    const queue = Array.from({ length: CLIENTS }, (_, c) => [RETRY_AFTER + extra(), c]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const used = new Map();
    const arrivals = new Map();
    let sent = 0;
    let refused = 0;
    const served = [];
    while (queue.length) {
      const [t, c] = queue.shift();
      const w = Math.floor(t);
      sent++;
      arrivals.set(w, (arrivals.get(w) ?? 0) + 1);
      if ((used.get(w) ?? 0) < CAPACITY) {
        used.set(w, (used.get(w) ?? 0) + 1);
        served.push(t);
        continue;
      }
      refused++;
      const retry = [t + RETRY_AFTER + extra(), c];
      let i = queue.findIndex((q) => q[0] > retry[0] || (q[0] === retry[0] && q[1] > c));
      if (i < 0) i = queue.length;
      queue.splice(i, 0, retry);
    }
    served.sort((a, b) => a - b);
    const tenth = (x) => Math.round(x * 10) / 10;
    return {
      sent,
      refused,
      /** Seconds after the first refusal: when the median client and the
       *  last client got their answer. */
      medianServed: tenth((served[CLIENTS / 2 - 1] + served[CLIENTS / 2]) / 2),
      lastServed: tenth(served.at(-1)),
      /** The most requests to arrive in any one-second window. */
      peak: Math.max(...arrivals.values()),
      /** Requests arriving in each second, from 0 to the last. */
      perSecond: Array.from({ length: Math.max(...arrivals.keys()) + 1 }, (_, w) => arrivals.get(w) ?? 0),
    };
  };

  const exact = simulate(() => 0);
  const next = rng(SEED);
  const spread = simulate(() => next() * SPREAD);
  results.retry = { clients: CLIENTS, capacity: CAPACITY, retryAfter: RETRY_AFTER, spreadSeconds: SPREAD, seed: SEED, exact, spread };
}

const out = new URL("./results.json", import.meta.url);
writeFileSync(out, `${JSON.stringify(results, null, 2)}\n`);
const failed = Object.entries(results.figures).flatMap(([f, fig]) =>
  Object.entries(fig.steps)
    .filter(([, s]) => !s.ok)
    .map(([id, s]) => `${f}.${id}: ${s.error}`),
);
console.log(`wrote ${fileURLToPath(out)} (${results.figures.page.version})`);
// One step fails on purpose: the unique key refusing a duplicate charge.
const EXPECTED = ["idem.duplicate"];
const unexpected = failed.filter((f) => !EXPECTED.includes(f.split(":")[0]));
console.log(failed.length ? `errors (expected ones marked):\n  ${failed.map((f) => (EXPECTED.includes(f.split(":")[0]) ? `[expected] ${f}` : f)).join("\n  ")}` : "no errors");
if (unexpected.length) process.exitCode = 1;
